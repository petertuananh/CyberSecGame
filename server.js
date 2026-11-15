/**
 * CyberSec Password Guardian - Node.js Server
 * - Tích hợp Express + WebSocket
 * - Kết nối phần cứng SerialPort (Arduino 5 nút bấm: A, B, C, D, ENTER)
 * - Tích hợp Live Tunnel & QR Code cho tay cầm điện thoại (Smartphone Controller)
 * - Hỗ trợ nhiều điện thoại kết nối song song với Arduino và Bàn phím PC
 */

const express = require('express');
const http = require('http');
const path = require('path');
const fs = require('fs');
const { exec, spawn } = require('child_process');
const { Readable } = require('stream');
const { WebSocketServer } = require('ws');
const { SerialPort } = require('serialport');
const { ReadlineParser } = require('@serialport/parser-readline');
const TunnelManager = require('./tunnel_manager');

// Lấy phiên bản phần mềm hiện tại từ package.json
let CURRENT_VERSION = '2.5.1';
try {
    const pkg = JSON.parse(fs.readFileSync(path.join(__dirname, 'package.json'), 'utf8'));
    if (pkg && pkg.version) CURRENT_VERSION = pkg.version;
} catch (e) {}

// Hàm so sánh phiên bản dạng SemVer (VD: 2.6.0 > 2.5.0)
function compareVersions(v1, v2) {
    const clean = (v) => (v || '').replace(/^v/i, '').trim().split('.').map(n => parseInt(n, 10) || 0);
    const p1 = clean(v1);
    const p2 = clean(v2);
    for (let i = 0; i < Math.max(p1.length, p2.length); i++) {
        const n1 = p1[i] || 0;
        const n2 = p2[i] || 0;
        if (n1 > n2) return 1;
        if (n1 < n2) return -1;
    }
    return 0;
}

// Kiểm tra lỗi phân quyền ghi file trên hệ điều hành (EACCES / EPERM / EROFS)
function isPermissionError(err) {
    if (!err) return false;
    return err.code === 'EACCES' ||
           err.code === 'EPERM' ||
           err.code === 'EROFS' ||
           /permission denied|operation not permitted|access is denied/i.test(err.message || '');
}

const app = express();
const server = http.createServer(app);
const wss = new WebSocketServer({ server });

const PORT = process.env.PORT || 3000;
const tunnelManager = new TunnelManager(PORT);

// Quản lý file cấu hình game (Sections, Questions, Roses, Random)
const DATA_DIR = path.join(__dirname, 'data');
const CONFIG_FILE = path.join(DATA_DIR, 'game_config.json');
const DEFAULT_CONFIG_FILE = path.join(DATA_DIR, 'default_config.json');
const LEADERBOARD_FILE = path.join(DATA_DIR, 'leaderboard.json');

// Quản lý Tên Người Chơi hiện tại đang tham gia (đồng bộ PC & Điện thoại)
let currentPlayerName = "Hiệp Sĩ Không Gian Mạng";

// Quản lý Phiên bản cấu hình để kiểm tra Xung đột (Conflict Checking) khi nhiều máy cùng sửa
let serverRevision = 1;
let lastSavedMeta = {
    savedAt: Date.now(),
    savedBy: 'Hệ thống Khởi tạo',
    revision: 1
};

// Quản lý Bảng Xếp Hạng & Lịch Sử Chơi (Live Leaderboard trong JSON)
function loadLeaderboard() {
    try {
        if (fs.existsSync(LEADERBOARD_FILE)) {
            const raw = fs.readFileSync(LEADERBOARD_FILE, 'utf8');
            return JSON.parse(raw);
        }
    } catch (e) {
        console.warn('[Leaderboard] Lỗi đọc leaderboard.json:', e.message);
    }
    const sample = [
        {
            id: 'sample_1',
            playerName: 'Vệ Binh Nguyễn Bỉnh Khiêm',
            totalDuration: 135,
            durationFormatted: '02:15',
            bossDuration: 14.5,
            roses: 12,
            achievements: ['the_flash', 'kratos'],
            timestamp: Date.now() - 3600000,
            dateStr: new Date(Date.now() - 3600000).toLocaleDateString('vi-VN')
        },
        {
            id: 'sample_2',
            playerName: 'Hiệp Sĩ SoftLab',
            totalDuration: 168,
            durationFormatted: '02:48',
            bossDuration: 18.2,
            roses: 9,
            achievements: ['the_flash', 'kratos'],
            timestamp: Date.now() - 7200000,
            dateStr: new Date(Date.now() - 7200000).toLocaleDateString('vi-VN')
        }
    ];
    saveLeaderboard(sample);
    return sample;
}

function saveLeaderboard(entries) {
    try {
        if (!fs.existsSync(DATA_DIR)) {
            fs.mkdirSync(DATA_DIR, { recursive: true });
        }
        fs.writeFileSync(LEADERBOARD_FILE, JSON.stringify(entries, null, 2), 'utf8');
    } catch (e) {
        console.error('[Leaderboard] Lỗi lưu file:', e.message);
    }
}

function addLeaderboardEntry(entry) {
    const list = loadLeaderboard();
    const newEntry = {
        id: 'run_' + Date.now() + '_' + Math.floor(Math.random() * 1000),
        playerName: (entry.playerName || currentPlayerName || 'Hiệp Sĩ Không Gian Mạng').trim().slice(0, 40),
        totalDuration: typeof entry.totalDuration === 'number' ? Math.round(entry.totalDuration * 10) / 10 : 0,
        durationFormatted: entry.durationFormatted || (Math.floor((entry.totalDuration || 0) / 60) + ':' + Math.floor((entry.totalDuration || 0) % 60).toString().padStart(2, '0')),
        bossDuration: typeof entry.bossDuration === 'number' ? Math.round(entry.bossDuration * 10) / 10 : 0,
        roses: typeof entry.roses === 'number' ? entry.roses : 0,
        achievements: Array.isArray(entry.achievements) ? entry.achievements : [],
        timestamp: Date.now(),
        dateStr: new Date().toLocaleDateString('vi-VN') + ' ' + new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })
    };

    list.push(newEntry);

    // Sắp xếp Bảng Xếp Hạng:
    // 1. Nhiều thành tựu hơn xếp trên
    // 2. Thời gian hoàn thành ít hơn xếp trên
    // 3. Số hoa hồng nhiều hơn xếp trên
    list.sort((a, b) => {
        const achA = (a.achievements || []).length;
        const achB = (b.achievements || []).length;
        if (achB !== achA) return achB - achA;
        if (a.totalDuration !== b.totalDuration) return a.totalDuration - b.totalDuration;
        return (b.roses || 0) - (a.roses || 0);
    });

    saveLeaderboard(list);
    broadcast({
        type: 'LEADERBOARD_UPDATED',
        entries: list,
        leaderboard: list,
        newEntry: newEntry
    });
    return list;
}

// Quản lý các Biên tập viên / Máy đang mở Helper để cộng tác trực tiếp (Live Collaboration Presence)
const helperCollaborators = new Map(); // socketId -> { socketId, clientId, name, color, device, location, joinedAt, lastActive }

function broadcastHelperCollaborators() {
    const list = Array.from(helperCollaborators.values());
    broadcast({
        type: 'HELPER_COLLABORATORS',
        collaborators: list
    });
}

function loadGameConfig() {
    try {
        if (fs.existsSync(CONFIG_FILE)) {
            const raw = fs.readFileSync(CONFIG_FILE, 'utf8');
            return JSON.parse(raw);
        }
    } catch (e) {
        console.warn('[Config] Lỗi đọc game_config.json, thử đọc default_config.json:', e.message);
    }
    try {
        if (fs.existsSync(DEFAULT_CONFIG_FILE)) {
            const raw = fs.readFileSync(DEFAULT_CONFIG_FILE, 'utf8');
            const def = JSON.parse(raw);
            saveGameConfig(def);
            return def;
        }
    } catch (e) {
        console.error('[Config] Lỗi đọc default_config.json:', e.message);
    }
    return null;
}

function saveGameConfig(cfg) {
    if (!fs.existsSync(DATA_DIR)) {
        fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    fs.writeFileSync(CONFIG_FILE, JSON.stringify(cfg, null, 2), 'utf8');
}

app.use(express.json({ limit: '10mb' }));
app.use(express.static(path.join(__dirname, 'public')));

// Favicon chính thức của game: Logo THCS Nguyễn Bỉnh Khiêm
app.get('/favicon.ico', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'images', 'logo_nbk.png'));
});

// Định tuyến đường dẫn ngắn cho điện thoại
app.get('/controller', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'controller.html'));
});

app.get('/mobile', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'controller.html'));
});

// Định tuyến đường dẫn trang Helper & Editor quản lý câu hỏi
app.get('/helper', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'helper.html'));
});

app.get('/editor', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'helper.html'));
});

// Định tuyến trang Giới thiệu, Tác giả & Bản quyền
app.get('/about', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'about.html'));
});

app.get('/info', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'about.html'));
});

// API lấy cấu hình game hiện tại
app.get('/api/config', (req, res) => {
    const cfg = loadGameConfig();
    if (!cfg) {
        return res.status(500).json({ error: 'Không thể tải cấu hình game' });
    }
    cfg._revision = serverRevision;
    cfg._lastSavedAt = lastSavedMeta.savedAt;
    cfg._lastSavedBy = lastSavedMeta.savedBy;
    res.json(cfg);
});

// API lưu cấu hình game mới từ Helper (Hỗ trợ Kiểm tra Xung đột - Conflict Checking)
app.post('/api/config', (req, res) => {
    try {
        const body = req.body;
        // Hỗ trợ cả 2 định dạng: { config, baseRevision, editorName, force } hoặc gửi trực tiếp {...}
        const targetConfig = (body && body.config && body.config.sections) ? body.config : body;
        const baseRev = (body && typeof body.baseRevision !== 'undefined') ? body.baseRevision : (targetConfig ? targetConfig._revision : null);
        const editorName = (body && body.editorName) ? body.editorName : 'Cộng tác viên';
        const isForce = body && body.force === true;

        if (!targetConfig || !Array.isArray(targetConfig.sections)) {
            return res.status(400).json({ error: 'Dữ liệu cấu hình không hợp lệ (phải có danh sách sections)' });
        }

        // KIỂM TRA XUNG ĐỘT (CONFLICT CHECKING):
        // Nếu client gửi baseRevision cũ hơn serverRevision hiện tại và không ép buộc (force), báo lỗi 409 Conflict
        if (!isForce && baseRev && baseRev !== serverRevision) {
            console.warn(`[Config] ⚠️ Phát hiện xung đột! Client baseRev=${baseRev}, serverRevision=${serverRevision}, người sửa trước: ${lastSavedMeta.savedBy}`);
            return res.status(409).json({
                conflict: true,
                serverRevision: serverRevision,
                clientRevision: baseRev,
                lastSavedBy: lastSavedMeta.savedBy,
                lastSavedAt: lastSavedMeta.savedAt,
                serverConfig: loadGameConfig(),
                message: `Phát hiện xung đột! Cấu hình đã được lưu bởi "${lastSavedMeta.savedBy}" cách đây ít phút (Bản #${serverRevision}). Hãy kiểm tra so sánh trước khi ghi đè!`
            });
        }

        serverRevision++;
        lastSavedMeta = {
            savedAt: Date.now(),
            savedBy: editorName,
            revision: serverRevision
        };
        targetConfig._revision = serverRevision;
        targetConfig._lastSavedAt = lastSavedMeta.savedAt;
        targetConfig._lastSavedBy = lastSavedMeta.savedBy;

        saveGameConfig(targetConfig);
        const totalQ = targetConfig.sections.reduce((acc, s) => acc + (s.questions ? s.questions.length : 0), 0);
        console.log(`[Config] 💾 Đã lưu cấu hình mới #${serverRevision} bởi "${editorName}" (${targetConfig.sections.length} sections, ${totalQ} câu hỏi)!`);

        // Phát sự kiện cập nhật cấu hình cho tất cả game client và helper client đang mở
        broadcast({
            type: 'CONFIG_UPDATED',
            config: targetConfig,
            revision: serverRevision,
            savedBy: editorName,
            savedAt: lastSavedMeta.savedAt,
            savedSummary: (body && body.savedSummary) || 'Cấu hình game',
            savedTargetId: (body && body.savedTargetId) || null
        });

        res.json({
            success: true,
            revision: serverRevision,
            savedBy: editorName,
            savedAt: lastSavedMeta.savedAt,
            savedSummary: (body && body.savedSummary) || 'Cấu hình game',
            message: 'Đã lưu cấu hình vào game thành công!'
        });
    } catch (e) {
        console.error('[Config] Lỗi lưu cấu hình:', e.message);
        if (isPermissionError(e)) {
            console.error(`[Config] ⛔ Lỗi phân quyền ghi vào ổ C (${e.code}): Không thể ghi file cấu hình tại ${CONFIG_FILE}`);
            return res.status(403).json({
                error: 'PERMISSION_DENIED',
                isPermissionError: true,
                code: e.code,
                path: CONFIG_FILE,
                dataDir: DATA_DIR,
                message: 'Không có quyền ghi vào thư mục dữ liệu trên ổ C (Permission Denied)! Ứng dụng cần quyền Quản trị viên (Administrator) để ghi file cấu hình.'
            });
        }
        res.status(500).json({ error: e.message });
    }
});

// API khôi phục cấu hình mặc định
app.post('/api/config/reset', (req, res) => {
    try {
        if (fs.existsSync(DEFAULT_CONFIG_FILE)) {
            const raw = fs.readFileSync(DEFAULT_CONFIG_FILE, 'utf8');
            const def = JSON.parse(raw);
            serverRevision++;
            lastSavedMeta = {
                savedAt: Date.now(),
                savedBy: 'Khôi phục Mặc định',
                revision: serverRevision
            };
            def._revision = serverRevision;
            def._lastSavedAt = lastSavedMeta.savedAt;
            def._lastSavedBy = lastSavedMeta.savedBy;

            saveGameConfig(def);
            console.log(`[Config] 🔄 Đã khôi phục cấu hình game về mặc định (Bản #${serverRevision})!`);
            broadcast({
                type: 'CONFIG_UPDATED',
                config: def,
                revision: serverRevision,
                savedBy: lastSavedMeta.savedBy,
                savedAt: lastSavedMeta.savedAt
            });
            return res.json({ success: true, config: def, revision: serverRevision, message: 'Đã khôi phục cấu hình mặc định!' });
        }
        res.status(404).json({ error: 'Không tìm thấy file default_config.json' });
    } catch (e) {
        console.error('[Config] Lỗi reset cấu hình:', e.message);
        if (isPermissionError(e)) {
            return res.status(403).json({
                error: 'PERMISSION_DENIED',
                isPermissionError: true,
                code: e.code,
                path: CONFIG_FILE,
                dataDir: DATA_DIR,
                message: 'Không có quyền ghi vào thư mục dữ liệu trên ổ C (Permission Denied)! Ứng dụng cần quyền Quản trị viên (Administrator) để khôi phục cấu hình.'
            });
        }
        res.status(500).json({ error: e.message });
    }
});

// API Kiểm tra quyền ghi vào thư mục dữ liệu
app.get('/api/admin/check-permissions', (req, res) => {
    try {
        if (!fs.existsSync(DATA_DIR)) {
            fs.mkdirSync(DATA_DIR, { recursive: true });
        }
        const testFile = path.join(DATA_DIR, `_perm_test_${Date.now()}.tmp`);
        fs.writeFileSync(testFile, 'ok', 'utf8');
        fs.unlinkSync(testFile);
        res.json({
            success: true,
            canWrite: true,
            dataDir: DATA_DIR,
            configFile: CONFIG_FILE,
            message: 'Đã có đầy đủ quyền ghi vào thư mục dữ liệu.'
        });
    } catch (err) {
        res.json({
            success: true,
            canWrite: false,
            dataDir: DATA_DIR,
            configFile: CONFIG_FILE,
            error: err.code || err.message,
            message: 'Không có quyền ghi vào thư mục dữ liệu. Cần cấp quyền Administrator.'
        });
    }
});

// API Cấp quyền ghi thư mục qua UAC của Windows
app.post('/api/admin/grant-permissions', (req, res) => {
    if (process.platform !== 'win32') {
        return res.json({ success: true, message: 'Hệ thống không phải Windows, không cần cấp quyền qua UAC.' });
    }

    try {
        console.log('[Admin] 🛡️ Đang gửi lệnh cấp quyền ghi thư mục qua hộp thoại Windows UAC...');
        const os = require('os');
        const batPath = path.join(os.tmpdir(), 'cybersec_grant_permissions.bat');
        const batContent = `@echo off\r
chcp 65001 >nul\r
title VE BINH MAT KHAU - CAP QUYEN GHI DU LIEU\r
echo ========================================================\r
echo  [VE BINH MAT KHAU] CAP QUYEN GHI DU LIEU HE THONG\r
echo ========================================================\r
echo.\r
echo [*] Dang cap toan quyen ghi (Full Control) cho Users...\r
echo [*] Thu muc: "%~1"\r
icacls "%~1" /grant Users:(OI)(CI)F /T /C /Q\r
if exist "%~2" (\r
    echo [*] File: "%~2"\r
    icacls "%~2" /grant Users:F /T /C /Q\r
)\r
echo.\r
echo [THANH CONG] Da mo khoa quyen ghi du lieu hoan tat!\r
timeout /t 2 >nul\r
`;
        fs.writeFileSync(batPath, batContent, 'utf8');

        // Lệnh PowerShell chạy với -Verb RunAs kích hoạt hộp thoại UAC chuẩn của Windows
        const elevateCmd = `powershell -NoProfile -ExecutionPolicy Bypass -Command "Start-Process -FilePath '${batPath}' -ArgumentList '\\"${DATA_DIR}\\"', '\\"${CONFIG_FILE}\\"' -Verb RunAs"`;

        exec(elevateCmd, (error) => {
            if (error) {
                console.warn('[Admin] Hộp thoại UAC bị từ chối hoặc gặp lỗi:', error.message);
                return res.status(400).json({
                    success: false,
                    error: 'Hộp thoại xác nhận Administrator bị từ chối hoặc đã đóng: ' + error.message
                });
            }
            console.log('[Admin] ✅ Đã kích hoạt lệnh phân quyền Admin thành công!');
            res.json({
                success: true,
                message: 'Đã gửi yêu cầu cấp quyền qua UAC! Vui lòng bấm "Yes" (Đồng ý) trên màn hình để mở khóa quyền ghi.'
            });
        });
    } catch (err) {
        console.error('[Admin] Lỗi thực thi lệnh cấp quyền:', err);
        res.status(500).json({ error: err.message });
    }
});

// API Khởi chạy lại Game với quyền Administrator
app.post('/api/admin/relaunch-as-admin', (req, res) => {
    if (process.platform !== 'win32') {
        return res.json({ success: true, message: 'Chức năng chỉ áp dụng trên Windows.' });
    }

    try {
        const isExe = process.execPath.toLowerCase().endsWith('cybersecgame.exe');
        console.log(`[Admin] 🔄 Đang khởi chạy lại ứng dụng với quyền Administrator: ${process.execPath} (isExe: ${isExe})`);

        let elevateCmd = '';
        if (isExe) {
            elevateCmd = `powershell -NoProfile -ExecutionPolicy Bypass -Command "Start-Sleep -Milliseconds 1000; Start-Process -FilePath '${process.execPath}' -Verb RunAs"`;
        } else {
            const scriptPath = process.argv[1] || path.join(__dirname, 'server.js');
            elevateCmd = `powershell -NoProfile -ExecutionPolicy Bypass -Command "Start-Sleep -Milliseconds 1000; Start-Process -FilePath '${process.execPath}' -ArgumentList '\\"${scriptPath}\\"' -Verb RunAs"`;
        }

        exec(elevateCmd, (error) => {
            if (error) {
                console.warn('[Admin] Lỗi khởi chạy lại Admin:', error.message);
                return res.status(400).json({
                    success: false,
                    error: 'Không thể khởi chạy với quyền Admin: ' + error.message
                });
            }
        });

        res.json({
            success: true,
            message: 'Đang khởi chạy phiên bản Administrator mới...'
        });

        setTimeout(() => {
            process.exit(0);
        }, 1500);
    } catch (err) {
        console.error('[Admin] Lỗi thực thi relaunch-as-admin:', err);
        res.status(500).json({ error: err.message });
    }
});

// API Kiểm tra cập nhật trực tiếp qua GitHub (Live Check Update)
app.get('/api/check-update', async (req, res) => {
    try {
        const repo = 'petertuananh/CyberSecGame';
        let latestVersion = CURRENT_VERSION;
        let releaseName = `Phiên bản v${CURRENT_VERSION}`;
        let releaseNotes = '';
        let publishedAt = '';
        let downloadUrl = `https://github.com/${repo}/releases`;
        let source = 'local';
        let directSetupUrl = '';
        let directZipUrl = '';

        // 1. Kiểm tra GitHub Releases API chính thức
        try {
            const releaseRes = await fetch(`https://api.github.com/repos/${repo}/releases/latest`, {
                headers: { 'User-Agent': 'CyberSecGame-LiveUpdate' },
                signal: AbortSignal.timeout(4000)
            });
            if (releaseRes.ok) {
                const releaseData = await releaseRes.json();
                if (releaseData && releaseData.tag_name) {
                    const tagVer = releaseData.tag_name.replace(/^v/i, '');
                    latestVersion = tagVer;
                    releaseName = releaseData.name || `Phiên bản v${tagVer}`;
                    releaseNotes = releaseData.body || 'Bản cập nhật mới với nhiều tính năng và cải tiến.';
                    publishedAt = releaseData.published_at || '';
                    downloadUrl = releaseData.html_url || `https://github.com/${repo}/releases/latest`;
                    source = 'github_release';

                    if (Array.isArray(releaseData.assets)) {
                        const setupAsset = releaseData.assets.find(a => a.name && a.name.endsWith('.exe'));
                        if (setupAsset && setupAsset.browser_download_url) {
                            directSetupUrl = setupAsset.browser_download_url;
                        }
                        const zipAsset = releaseData.assets.find(a => a.name && a.name.endsWith('.zip'));
                        if (zipAsset && zipAsset.browser_download_url) {
                            directZipUrl = zipAsset.browser_download_url;
                        }
                    }
                }
            }
        } catch (relErr) {
            // Không có release hoặc offline/timeout
        }

        // 2. Kiểm tra package.json trên nhánh main nếu GitHub Releases chưa có bản mới hơn
        if (compareVersions(latestVersion, CURRENT_VERSION) <= 0) {
            try {
                const rawRes = await fetch(`https://raw.githubusercontent.com/${repo}/main/package.json`, {
                    signal: AbortSignal.timeout(3500)
                });
                if (rawRes.ok) {
                    const rawPkg = await rawRes.json();
                    if (rawPkg && rawPkg.version) {
                        const rawVer = rawPkg.version.replace(/^v/i, '');
                        if (compareVersions(rawVer, CURRENT_VERSION) > 0) {
                            latestVersion = rawVer;
                            releaseName = `Phiên bản mới v${latestVersion} (GitHub Main)`;
                            releaseNotes = rawPkg.description || 'Đã có mã nguồn và cập nhật mới nhất trên nhánh chính GitHub!';
                            downloadUrl = `https://github.com/${repo}`;
                            source = 'github_main';
                        }
                    }
                }
            } catch (rawErr) {}
        }

        const hasUpdate = compareVersions(latestVersion, CURRENT_VERSION) > 0;

        res.json({
            success: true,
            hasUpdate,
            currentVersion: CURRENT_VERSION,
            latestVersion,
            releaseName,
            releaseNotes: releaseNotes || (hasUpdate ? 'Đã có bản phát hành mới trên GitHub.' : 'Bạn đang sử dụng phiên bản mới nhất!'),
            publishedAt,
            downloadUrl,
            directSetupUrl: directSetupUrl || `https://github.com/${repo}/releases`,
            directZipUrl: directZipUrl || `https://github.com/${repo}/archive/refs/heads/main.zip`,
            repoUrl: `https://github.com/${repo}`,
            source
        });
    } catch (err) {
        res.status(500).json({
            success: false,
            error: 'Lỗi kiểm tra cập nhật: ' + err.message,
            currentVersion: CURRENT_VERSION
        });
    }
});

// API lấy thông tin phiên bản
app.get('/api/version', (req, res) => {
    res.json({
        version: CURRENT_VERSION,
        name: 'CyberSec Password Guardian',
        author: 'Peter Tuan Anh',
        company: 'CÔNG TY TNHH GIẢI PHÁP SỐ SOFTLAB',
        mst: '3604049476',
        repo: 'https://github.com/petertuananh/CyberSecGame'
    });
});

// =========================================================================
// HỆ THỐNG AUTO-UPDATER 1-CLICK (CẬP NHẬT TRỰC TIẾP TRONG GAME)
// =========================================================================

const updateManager = {
    state: 'idle', // 'idle' | 'downloading' | 'ready' | 'installing' | 'completed' | 'error'
    progress: 0,
    downloadedBytes: 0,
    totalBytes: 0,
    speedStr: '0 KB/s',
    fileName: '',
    filePath: '',
    downloadUrl: '',
    fileType: '', // 'exe' | 'zip'
    targetVersion: '',
    error: null,
    startTime: null,
    abortController: null
};

// Dọn dẹp thư mục tạm temp_update khi khởi động server
try {
    const startupTempDir = path.join(__dirname, 'temp_update');
    if (fs.existsSync(startupTempDir)) {
        fs.rmSync(startupTempDir, { recursive: true, force: true });
    }
} catch (e) {}

function formatUpdateBytes(bytes) {
    if (!bytes || bytes <= 0) return '0 B';
    const units = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return (bytes / Math.pow(1024, i)).toFixed(1) + ' ' + units[i];
}

function getUpdateStatusPayload() {
    return {
        state: updateManager.state,
        progress: updateManager.progress,
        downloadedBytes: updateManager.downloadedBytes,
        totalBytes: updateManager.totalBytes,
        downloadedFormatted: formatUpdateBytes(updateManager.downloadedBytes),
        totalFormatted: updateManager.totalBytes > 0 ? formatUpdateBytes(updateManager.totalBytes) : 'Đang tính...',
        speed: updateManager.speedStr,
        fileName: updateManager.fileName,
        filePath: updateManager.filePath,
        fileType: updateManager.fileType,
        targetVersion: updateManager.targetVersion,
        error: updateManager.error
    };
}

// API: Lấy trạng thái tiến trình tải và cập nhật
app.get('/api/update/status', (req, res) => {
    res.json({
        success: true,
        ...getUpdateStatusPayload()
    });
});

// API: Bắt đầu tải bản cập nhật trực tiếp (1-Click Auto Update)
app.post('/api/update/start', async (req, res) => {
    try {
        if (updateManager.state === 'downloading') {
            return res.json({
                success: true,
                message: 'Đang trong quá trình tải về...',
                ...getUpdateStatusPayload()
            });
        }

        const repo = 'petertuananh/CyberSecGame';
        let reqUrl = req.body && req.body.url ? req.body.url.trim() : '';
        let targetVersion = req.body && req.body.version ? req.body.version.trim() : CURRENT_VERSION;
        let preferredType = req.body && req.body.type ? req.body.type.toLowerCase() : 'auto';

        let downloadUrl = '';
        let fileType = 'exe';
        let fileName = 'CyberSecGame_Setup.exe';

        // 1. Nếu client chỉ định URL trực tiếp dạng file (.exe hoặc .zip)
        if (reqUrl && (reqUrl.endsWith('.exe') || reqUrl.endsWith('.zip'))) {
            downloadUrl = reqUrl;
            fileType = reqUrl.endsWith('.exe') ? 'exe' : 'zip';
            fileName = fileType === 'exe' ? 'CyberSecGame_Setup.exe' : 'CyberSecGame_Update.zip';
        } else {
            // 2. Tự động truy vấn nguồn tải tốt nhất từ GitHub
            try {
                const releaseRes = await fetch(`https://api.github.com/repos/${repo}/releases/latest`, {
                    headers: { 'User-Agent': 'CyberSecGame-AutoUpdater' },
                    signal: AbortSignal.timeout(4000)
                });
                if (releaseRes.ok) {
                    const releaseData = await releaseRes.json();
                    if (releaseData && releaseData.assets && releaseData.assets.length > 0) {
                        const setupAsset = releaseData.assets.find(a => a.name && a.name.endsWith('.exe'));
                        if (setupAsset && setupAsset.browser_download_url) {
                            downloadUrl = setupAsset.browser_download_url;
                            fileType = 'exe';
                            fileName = setupAsset.name || 'CyberSecGame_Setup.exe';
                        } else {
                            const zipAsset = releaseData.assets.find(a => a.name && a.name.endsWith('.zip'));
                            if (zipAsset && zipAsset.browser_download_url) {
                                downloadUrl = zipAsset.browser_download_url;
                                fileType = 'zip';
                                fileName = zipAsset.name || 'CyberSecGame_Update.zip';
                            }
                        }
                    }
                }
            } catch (relErr) {
                console.warn('[AutoUpdate] Không thể lấy thông tin release asset:', relErr.message);
            }

            // Nếu chưa có asset release chính thức, dùng gói mã nguồn nhánh main (ZIP) hoặc link release mặc định
            if (!downloadUrl) {
                if (preferredType === 'exe') {
                    downloadUrl = `https://github.com/${repo}/releases/latest/download/CyberSecGame_Setup.exe`;
                    fileType = 'exe';
                    fileName = 'CyberSecGame_Setup.exe';
                } else {
                    downloadUrl = `https://github.com/${repo}/archive/refs/heads/main.zip`;
                    fileType = 'zip';
                    fileName = 'CyberSecGame_Update.zip';
                }
            }
        }

        // Tạo thư mục tạm temp_update
        const updateDir = path.join(__dirname, 'temp_update');
        if (!fs.existsSync(updateDir)) {
            fs.mkdirSync(updateDir, { recursive: true });
        }
        const destPath = path.join(updateDir, fileName);

        // Xóa file cũ nếu có để tải lại từ đầu sạch sẽ
        if (fs.existsSync(destPath)) {
            try { fs.rmSync(destPath, { force: true }); } catch (e) {}
        }

        // Khởi tạo trạng thái
        updateManager.state = 'downloading';
        updateManager.progress = 0;
        updateManager.downloadedBytes = 0;
        updateManager.totalBytes = 0;
        updateManager.speedStr = 'Đang kết nối...';
        updateManager.fileName = fileName;
        updateManager.filePath = destPath;
        updateManager.fileType = fileType;
        updateManager.downloadUrl = downloadUrl;
        updateManager.targetVersion = targetVersion;
        updateManager.error = null;
        updateManager.startTime = Date.now();
        updateManager.abortController = new AbortController();

        console.log(`[AutoUpdate] 🚀 Bắt đầu tải bản cập nhật: ${downloadUrl} -> ${destPath}`);
        broadcast({ type: 'UPDATE_PROGRESS', ...getUpdateStatusPayload() });

        // Tải bất đồng bộ không chặn request
        (async () => {
            try {
                const response = await fetch(downloadUrl, {
                    headers: { 'User-Agent': 'CyberSecGame-AutoUpdater' },
                    signal: updateManager.abortController.signal
                });

                if (!response.ok) {
                    throw new Error(`Máy chủ trả về mã HTTP ${response.status}: ${response.statusText}`);
                }

                const contentLength = parseInt(response.headers.get('content-length') || '0', 10);
                updateManager.totalBytes = contentLength;

                const fileStream = fs.createWriteStream(destPath);
                const nodeStream = Readable.fromWeb(response.body);

                let lastBroadcast = Date.now();

                nodeStream.on('data', (chunk) => {
                    updateManager.downloadedBytes += chunk.length;
                    const now = Date.now();
                    if (now - lastBroadcast >= 250) {
                        lastBroadcast = now;
                        const elapsed = (now - updateManager.startTime) / 1000;
                        const speed = elapsed > 0 ? (updateManager.downloadedBytes / elapsed) : 0;
                        updateManager.speedStr = formatUpdateBytes(speed) + '/s';

                        if (updateManager.totalBytes > 0) {
                            updateManager.progress = Math.min(99, Math.round((updateManager.downloadedBytes / updateManager.totalBytes) * 100));
                        } else {
                            updateManager.progress = Math.min(95, Math.floor(updateManager.downloadedBytes / (1024 * 500)));
                        }
                        broadcast({ type: 'UPDATE_PROGRESS', ...getUpdateStatusPayload() });
                    }
                });

                nodeStream.pipe(fileStream);

                fileStream.on('finish', () => {
                    console.log(`[AutoUpdate] ✅ Đã tải hoàn tất bản cập nhật: ${destPath} (${formatUpdateBytes(updateManager.downloadedBytes)})`);
                    updateManager.progress = 100;
                    updateManager.state = 'ready';
                    updateManager.speedStr = 'Hoàn tất';
                    broadcast({ type: 'UPDATE_PROGRESS', ...getUpdateStatusPayload() });
                });

                fileStream.on('error', (err) => {
                    console.error('[AutoUpdate] ❌ Lỗi ghi file:', err);
                    updateManager.state = 'error';
                    updateManager.error = 'Lỗi lưu tệp: ' + err.message;
                    broadcast({ type: 'UPDATE_PROGRESS', ...getUpdateStatusPayload() });
                });
            } catch (dlErr) {
                if (dlErr.name === 'AbortError') {
                    console.log('[AutoUpdate] Người dùng đã bấm hủy tải.');
                    updateManager.state = 'idle';
                    updateManager.error = null;
                } else {
                    console.error('[AutoUpdate] ❌ Lỗi tải về:', dlErr);
                    updateManager.state = 'error';
                    updateManager.error = dlErr.message || 'Lỗi kết nối máy chủ tải về';
                }
                broadcast({ type: 'UPDATE_PROGRESS', ...getUpdateStatusPayload() });
            }
        })();

        res.json({
            success: true,
            message: 'Đã kích hoạt tải gói cập nhật!',
            ...getUpdateStatusPayload()
        });
    } catch (err) {
        console.error('[AutoUpdate] Lỗi khởi động tải:', err);
        updateManager.state = 'error';
        updateManager.error = err.message;
        res.status(500).json({ success: false, error: err.message });
    }
});

// API: Hủy tải bản cập nhật
app.post('/api/update/cancel', (req, res) => {
    try {
        if (updateManager.abortController) {
            updateManager.abortController.abort();
            updateManager.abortController = null;
        }
        updateManager.state = 'idle';
        updateManager.progress = 0;
        updateManager.speedStr = '0 KB/s';
        updateManager.error = null;
        if (updateManager.filePath && fs.existsSync(updateManager.filePath)) {
            try { fs.rmSync(updateManager.filePath, { force: true }); } catch (e) {}
        }
        broadcast({ type: 'UPDATE_PROGRESS', ...getUpdateStatusPayload() });
        res.json({ success: true, message: 'Đã hủy tải bản cập nhật' });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

// API: Áp dụng bản cập nhật & Khởi động lại (1-Click Apply)
app.post('/api/update/apply', (req, res) => {
    try {
        if (!updateManager.filePath || !fs.existsSync(updateManager.filePath)) {
            return res.status(400).json({
                success: false,
                error: 'Tệp cập nhật không tồn tại hoặc chưa tải xong. Vui lòng thử tải lại.'
            });
        }

        console.log(`[AutoUpdate] 🚀 Bắt đầu áp dụng bản cập nhật: ${updateManager.filePath} (Dạng: ${updateManager.fileType})`);
        updateManager.state = 'installing';
        broadcast({ type: 'UPDATE_PROGRESS', ...getUpdateStatusPayload() });

        if (updateManager.fileType === 'exe') {
            // Chạy tệp cài đặt Inno Setup đã tải về
            // /CLOSEAPPLICATIONS để tự động đóng phiên bản hiện tại
            const installerArgs = ['/CLOSEAPPLICATIONS'];
            const child = spawn(updateManager.filePath, installerArgs, {
                detached: true,
                stdio: 'ignore'
            });
            child.unref();

            res.json({
                success: true,
                message: 'Đã khởi chạy trình cài đặt bản mới! Game sẽ tự động đóng sau 2 giây để hoàn tất nâng cấp...'
            });

            setTimeout(() => {
                process.exit(0);
            }, 2000);
        } else {
            // Cập nhật từ file ZIP (mã nguồn/assets mới nhất từ GitHub)
            const extractDir = path.join(__dirname, 'temp_update', 'extracted');
            if (fs.existsSync(extractDir)) {
                try { fs.rmSync(extractDir, { recursive: true, force: true }); } catch (e) {}
            }
            fs.mkdirSync(extractDir, { recursive: true });

            const extractCmd = `powershell -NoProfile -Command "Expand-Archive -Path '${updateManager.filePath}' -DestinationPath '${extractDir}' -Force"`;
            exec(extractCmd, (err) => {
                if (err) {
                    console.error('[AutoUpdate] ❌ Lỗi giải nén ZIP:', err);
                    updateManager.state = 'error';
                    updateManager.error = 'Không thể giải nén file ZIP: ' + err.message;
                    broadcast({ type: 'UPDATE_PROGRESS', ...getUpdateStatusPayload() });
                    return res.status(500).json({ success: false, error: updateManager.error });
                }

                try {
                    // Tìm thư mục con nếu giải nén ra CyberSecGame-main
                    let rootSource = extractDir;
                    const subEntries = fs.readdirSync(extractDir);
                    if (subEntries.length === 1 && fs.statSync(path.join(extractDir, subEntries[0])).isDirectory()) {
                        rootSource = path.join(extractDir, subEntries[0]);
                    }

                    // Sao chép tệp mới, giữ nguyên tuyệt đối thư mục data/ (dữ liệu người chơi) và không đè các file exe đang chạy
                    fs.cpSync(rootSource, __dirname, {
                        recursive: true,
                        force: true,
                        filter: (src) => {
                            const rel = path.relative(rootSource, src).replace(/\\/g, '/');
                            if (rel.startsWith('data/') || rel === 'data' || rel.startsWith('temp_update') || rel.toLowerCase().endsWith('.exe')) {
                                return false;
                            }
                            return true;
                        }
                    });

                    console.log('[AutoUpdate] ✅ Đã sao chép tệp mới thành công!');
                    updateManager.state = 'completed';
                    broadcast({ type: 'UPDATE_PROGRESS', ...getUpdateStatusPayload() });

                    res.json({
                        success: true,
                        message: 'Đã nâng cấp xong dữ liệu game! Đang tự động khởi chạy lại...'
                    });

                    // Khởi động lại ứng dụng an toàn với độ trễ để tránh xung đột cổng
                    setTimeout(() => {
                        const exePath = process.execPath;
                        if (exePath.toLowerCase().endsWith('cybersecgame.exe')) {
                            const restartCmd = `powershell -NoProfile -Command "Start-Sleep -Milliseconds 1200; Start-Process -FilePath '${exePath}'"`;
                            exec(restartCmd);
                        } else {
                            const script = process.argv[1] || 'server.js';
                            const restartCmd = `powershell -NoProfile -Command "Start-Sleep -Milliseconds 1200; Start-Process -FilePath '${process.argv[0]}' -ArgumentList '${script}'"`;
                            exec(restartCmd);
                        }
                        process.exit(0);
                    }, 1200);
                } catch (copyErr) {
                    console.error('[AutoUpdate] ❌ Lỗi sao chép tệp mới:', copyErr);
                    updateManager.state = 'error';
                    updateManager.error = 'Lỗi cập nhật tệp: ' + copyErr.message;
                    broadcast({ type: 'UPDATE_PROGRESS', ...getUpdateStatusPayload() });
                    res.status(500).json({ success: false, error: updateManager.error });
                }
            });
        }
    } catch (err) {
        console.error('[AutoUpdate] Lỗi thực thi bản cập nhật:', err);
        updateManager.state = 'error';
        updateManager.error = err.message;
        res.status(500).json({ success: false, error: err.message });
    }
});

// API: Mở thư mục chứa tệp cập nhật vừa tải về
app.post('/api/update/open-folder', (req, res) => {
    try {
        const filePath = updateManager.filePath || path.join(__dirname, 'temp_update');
        if (process.platform === 'win32') {
            if (fs.existsSync(filePath)) {
                exec(`explorer.exe /select,"${filePath}"`);
            } else {
                const dir = path.dirname(filePath);
                exec(`explorer.exe "${dir}"`);
            }
        }
        res.json({ success: true, message: 'Đã mở thư mục chứa tệp' });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

// API: Tải trực tiếp file cập nhật về máy qua trình duyệt (fallback)
app.get('/api/update/download-file', (req, res) => {
    if (updateManager.filePath && fs.existsSync(updateManager.filePath)) {
        res.download(updateManager.filePath, updateManager.fileName);
    } else {
        res.status(404).send('Chưa có file cập nhật nào được tải.');
    }
});

// API: Lấy Bảng Xếp Hạng & Tên người chơi hiện tại
app.get('/api/leaderboard', (req, res) => {
    const list = loadLeaderboard();
    res.json({
        entries: list,
        leaderboard: list,
        currentPlayerName: currentPlayerName,
        playerName: currentPlayerName
    });
});

// API: Gửi kết quả lượt chơi mới vào Bảng Xếp Hạng (lưu json)
app.post('/api/leaderboard', (req, res) => {
    try {
        const body = req.body.entry || req.body;
        const list = addLeaderboardEntry(body);
        res.json({ success: true, entries: list, leaderboard: list });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

// API: Reset / Xóa Bảng Xếp Hạng (Dành cho Giáo viên / BTC cuộc thi mới)
app.delete('/api/leaderboard', (req, res) => {
    try {
        saveLeaderboard([]);
        broadcast({
            type: 'LEADERBOARD_UPDATED',
            entries: [],
            leaderboard: []
        });
        res.json({ success: true, message: 'Đã reset bảng xếp hạng thành công!' });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

// API: Đổi tên người chơi
app.post('/api/player-name', (req, res) => {
    const rawName = req.body.name || req.body.playerName;
    if (rawName) {
        currentPlayerName = rawName.trim().slice(0, 40) || 'Hiệp Sĩ Không Gian Mạng';
        console.log(`[Player] 👤 Cập nhật tên người chơi (API): "${currentPlayerName}"`);
        broadcast({
            type: 'PLAYER_NAME_UPDATED',
            name: currentPlayerName,
            playerName: currentPlayerName,
            source: req.body.source || 'REST API'
        });
        return res.json({ success: true, name: currentPlayerName, playerName: currentPlayerName });
    }
    res.status(400).json({ error: 'Thiếu trường name hoặc playerName' });
});

// Xử lý favicon.ico (tránh lỗi 404 Not Found từ trình duyệt)
app.get('/favicon.ico', (req, res) => {
    const icoPath = path.join(__dirname, 'icon.ico');
    if (fs.existsSync(icoPath)) return res.sendFile(icoPath);
    const pngPath = path.join(__dirname, 'public', 'images', 'logo_nbk_pixel.png');
    if (fs.existsSync(pngPath)) return res.sendFile(pngPath);
    res.status(204).end();
});

// Trạng thái kết nối Serial
let currentSerialPort = null;
let currentParser = null;
let connectedPortName = null;

// Gửi thông điệp tới tất cả các client đang mở (Game và Controllers)
function broadcast(msgObj) {
    const data = JSON.stringify(msgObj);
    wss.clients.forEach(client => {
        if (client.readyState === 1) { // OPEN
            client.send(data);
        }
    });
}

// Xử lý nút bấm từ Serial (Arduino) và chuyển tiếp vào Game
function handleSerialButton(rawLine) {
    const clean = rawLine.trim().toUpperCase();
    if (!clean) return;

    let button = null;
    if (['A', 'B', 'C', 'D'].includes(clean)) {
        button = clean;
    } else if (clean === 'ENTER' || clean === 'E' || clean === 'OK') {
        button = 'ENTER';
    }

    if (button) {
        console.log(`[Arduino] Nhận tín hiệu nút bấm: ${button}`);
        broadcast({
            type: 'BUTTON_PRESS',
            button: button,
            source: 'ARDUINO'
        });
    }
}

// Hàm kết nối tới một cổng COM
function connectToPort(portPath, baudRate = 115200) {
    return new Promise((resolve, reject) => {
        if (currentSerialPort && currentSerialPort.isOpen) {
            currentSerialPort.close();
        }

        console.log(`[SerialPort] Đang kết nối tới ${portPath} (Baud: ${baudRate})...`);
        const port = new SerialPort({ path: portPath, baudRate: baudRate }, (err) => {
            if (err) {
                console.error(`[SerialPort] Lỗi mở cổng ${portPath}:`, err.message);
                connectedPortName = null;
                broadcast({ type: 'PORT_STATUS', connected: false, port: null });
                return reject(err);
            }

            console.log(`[SerialPort] Đã kết nối thành công tới ${portPath}!`);
            connectedPortName = portPath;
            currentSerialPort = port;

            const parser = port.pipe(new ReadlineParser({ delimiter: '\r\n' }));
            currentParser = parser;

            parser.on('data', (line) => {
                handleSerialButton(line);
            });

            port.on('close', () => {
                console.log(`[SerialPort] Cổng ${portPath} đã đóng.`);
                connectedPortName = null;
                broadcast({ type: 'PORT_STATUS', connected: false, port: null });
            });

            port.on('error', (err) => {
                console.error(`[SerialPort] Lỗi cổng:`, err.message);
            });

            broadcast({ type: 'PORT_STATUS', connected: true, port: portPath });
            resolve(true);
        });
    });
}

// Tự động tìm kiếm Arduino khi khởi động
async function autoDetectArduino() {
    try {
        const ports = await SerialPort.list();
        console.log(`[SerialPort] Phát hiện ${ports.length} cổng:`, ports.map(p => p.path));

        const arduinoPort = ports.find(p => {
            const str = `${p.manufacturer || ''} ${p.friendlyName || ''} ${p.vendorId || ''}`.toLowerCase();
            return str.includes('arduino') || str.includes('ch340') || str.includes('ftdi') || str.includes('usb');
        }) || ports[0];

        if (arduinoPort) {
            console.log(`[SerialPort] Tự động thử kết nối cổng: ${arduinoPort.path}`);
            connectToPort(arduinoPort.path, 115200).catch(err => {
                console.log(`[SerialPort] Thử tốc độ 9600...`);
                connectToPort(arduinoPort.path, 9600).catch(e => {
                    console.log(`[SerialPort] Không thể tự động kết nối (có thể cần chọn thủ công trên web).`);
                });
            });
        } else {
            console.log("[SerialPort] Chưa cắm Arduino. Game vẫn hoạt động bình thường bằng bàn phím PC và Điện thoại!");
        }
    } catch (e) {
        console.error("[SerialPort] Lỗi quét cổng:", e);
    }
}

// API: Lấy danh sách cổng COM
app.get('/api/ports', async (req, res) => {
    try {
        const ports = await SerialPort.list();
        res.json({
            ports: ports.map(p => ({
                path: p.path,
                manufacturer: p.manufacturer || p.friendlyName || 'USB Serial'
            })),
            connectedPort: connectedPortName
        });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

// API: Kết nối cổng COM theo yêu cầu từ giao diện web
app.post('/api/connect', async (req, res) => {
    const { port, baudRate } = req.body;
    if (!port) {
        return res.status(400).json({ error: 'Cần cung cấp tên cổng COM' });
    }
    try {
        await connectToPort(port, baudRate || 115200);
        res.json({ success: true, port });
    } catch (e) {
        res.status(500).json({ success: false, error: e.message });
    }
});

// API: Lấy thông tin Live Tunnel và QR Code
app.get('/api/tunnel', (req, res) => {
    res.json(tunnelManager.getInfo());
});

// Lắng nghe sự kiện cập nhật từ TunnelManager và phát tới các client
tunnelManager.on('update', (info) => {
    broadcast({
        type: 'TUNNEL_INFO',
        info: info
    });
});

tunnelManager.on('controller_change', (count) => {
    broadcast({
        type: 'CONTROLLER_COUNT',
        count: count
    });
});

let socketCounter = 0;

// Quản lý WebSocket kết nối từ trình duyệt PC & Tay cầm Điện Thoại
wss.on('connection', (ws) => {
    const socketId = ++socketCounter;
    ws.socketId = socketId;
    ws.isController = false;

    // Gửi trạng thái ban đầu cho client vừa vào
    ws.send(JSON.stringify({
        type: 'PORT_STATUS',
        connected: !!connectedPortName,
        port: connectedPortName
    }));

    ws.send(JSON.stringify({
        type: 'TUNNEL_INFO',
        info: tunnelManager.getInfo()
    }));

    ws.send(JSON.stringify({
        type: 'CONTROLLER_COUNT',
        count: tunnelManager.getControllerCount()
    }));

    // Gửi cấu hình game hiện tại
    const currentCfg = loadGameConfig();
    if (currentCfg) {
        currentCfg._revision = serverRevision;
        currentCfg._lastSavedAt = lastSavedMeta.savedAt;
        currentCfg._lastSavedBy = lastSavedMeta.savedBy;
        ws.send(JSON.stringify({
            type: 'CONFIG_SYNC',
            config: currentCfg,
            revision: serverRevision,
            savedBy: lastSavedMeta.savedBy,
            savedAt: lastSavedMeta.savedAt
        }));
    }

    // Gửi danh sách các máy / cộng tác viên đang mở Helper
    ws.send(JSON.stringify({
        type: 'HELPER_COLLABORATORS',
        collaborators: Array.from(helperCollaborators.values())
    }));

    // Gửi tên người chơi hiện tại (đồng bộ thời gian thực PC và ĐT)
    ws.send(JSON.stringify({
        type: 'PLAYER_NAME_SYNC',
        name: currentPlayerName,
        playerName: currentPlayerName
    }));

    // Gửi danh sách Bảng Xếp Hạng Live
    const initialLb = loadLeaderboard();
    ws.send(JSON.stringify({
        type: 'LEADERBOARD_SYNC',
        entries: initialLb,
        leaderboard: initialLb
    }));

    ws.on('message', (raw) => {
        try {
            const data = JSON.parse(raw);

            // Đăng ký điện thoại làm Controller
            if (data.type === 'REGISTER' && data.role === 'CONTROLLER') {
                ws.isController = true;
                ws.controllerId = data.id || `MB-${socketId}`;
                tunnelManager.registerController(socketId, {
                    name: ws.controllerId,
                    device: data.device
                });
                console.log(`[WebSocket] 📱 Điện thoại đã kết nối: ${ws.controllerId} (Tổng tay cầm: ${tunnelManager.getControllerCount()})`);
            }

            // Đăng ký máy tham gia cộng tác Live Edit trên Helper
            else if (data.type === 'HELPER_JOIN') {
                ws.isHelper = true;
                ws.helperClientId = data.clientId || `usr_${socketId}`;
                const info = {
                    socketId: socketId,
                    clientId: ws.helperClientId,
                    name: data.name || `Biên tập viên #${socketId}`,
                    color: data.color || '#3498db',
                    device: data.device || 'Desktop',
                    location: data.location || { type: 'viewing', label: 'Trang tổng quan' },
                    joinedAt: Date.now(),
                    lastActive: Date.now()
                };
                helperCollaborators.set(socketId, info);
                console.log(`[Helper Collab] 👤 Biên tập viên tham gia: ${info.name} (${info.device})`);
                broadcastHelperCollaborators();
            }

            // Cập nhật vị trí đang chỉnh sửa của máy trên Helper (đang sửa câu nào / vòng nào)
            else if (data.type === 'HELPER_LOCATION') {
                if (helperCollaborators.has(socketId)) {
                    const collab = helperCollaborators.get(socketId);
                    collab.location = data.location || { type: 'viewing', label: 'Trang tổng quan' };
                    collab.lastActive = Date.now();
                    if (data.name) collab.name = data.name;
                    broadcastHelperCollaborators();
                }
            }

            // Cập nhật thông tin cá nhân (Tên, Màu hiển thị)
            else if (data.type === 'HELPER_PROFILE') {
                if (helperCollaborators.has(socketId)) {
                    const collab = helperCollaborators.get(socketId);
                    if (data.name) collab.name = data.name;
                    if (data.color) collab.color = data.color;
                    collab.lastActive = Date.now();
                    broadcastHelperCollaborators();
                }
            }

            // Sự kiện đang gõ trực tiếp vào 1 ô (Live Edit Field Typing & Sync: ô nào, chữ nào)
            else if (data.type === 'HELPER_FIELD_EDIT') {
                let senderInfo = null;
                if (helperCollaborators.has(socketId)) {
                    const collab = helperCollaborators.get(socketId);
                    collab.lastActive = Date.now();
                    collab.editingField = {
                        targetType: data.targetType,
                        targetId: data.targetId,
                        fieldId: data.fieldId,
                        fieldLabel: data.fieldLabel,
                        value: data.value,
                        updatedAt: Date.now()
                    };
                    collab.location = {
                        type: data.targetType || 'editing',
                        targetId: data.targetId,
                        fieldId: data.fieldId,
                        fieldLabel: data.fieldLabel,
                        label: `Đang sửa [${data.fieldLabel || data.fieldId}]`
                    };
                    senderInfo = {
                        socketId: socketId,
                        clientId: collab.clientId,
                        name: collab.name,
                        color: collab.color,
                        device: collab.device
                    };
                }

                // Phát trực tiếp cho TẤT CẢ các client khác để hiển thị ô nào, chữ nào trong thời gian thực
                broadcast({
                    type: 'HELPER_FIELD_EDIT',
                    socketId: socketId,
                    clientId: (senderInfo && senderInfo.clientId) || data.clientId,
                    sender: senderInfo || data.sender || { name: 'Đồng nghiệp', color: '#3498db' },
                    targetType: data.targetType,
                    targetId: data.targetId,
                    fieldId: data.fieldId,
                    fieldLabel: data.fieldLabel,
                    value: data.value,
                    selectionStart: data.selectionStart
                });
            }

            // Rời khỏi ô đang nhập (Blur)
            else if (data.type === 'HELPER_FIELD_BLUR') {
                if (helperCollaborators.has(socketId)) {
                    const collab = helperCollaborators.get(socketId);
                    collab.lastActive = Date.now();
                    delete collab.editingField;
                }
                broadcast({
                    type: 'HELPER_FIELD_BLUR',
                    socketId: socketId,
                    clientId: ws.helperClientId || data.clientId,
                    targetType: data.targetType,
                    targetId: data.targetId,
                    fieldId: data.fieldId
                });
            }

            // Sự kiện di chuyển chuột của cộng tác viên (Multiplayer Live Cursors)
            else if (data.type === 'HELPER_CURSOR_MOVE') {
                broadcast({
                    type: 'HELPER_CURSOR_MOVE',
                    socketId: socketId,
                    clientId: ws.helperClientId || data.clientId,
                    tab: data.tab,
                    percentX: data.percentX,
                    x: data.x,
                    y: data.y,
                    sender: data.sender || (helperCollaborators.get(socketId) ? {
                        name: helperCollaborators.get(socketId).name,
                        color: helperCollaborators.get(socketId).color
                    } : null)
                });
            }

            // Chuột rời khỏi tab / cửa sổ
            else if (data.type === 'HELPER_CURSOR_LEAVE') {
                broadcast({
                    type: 'HELPER_CURSOR_LEAVE',
                    socketId: socketId,
                    clientId: ws.helperClientId || data.clientId
                });
            }

            // Đổi tên người chơi (từ Bàn phím PC hoặc Điện thoại đang kết nối)
            else if (data.type === 'SET_PLAYER_NAME') {
                const cleanName = (data.name || data.playerName || '').trim().slice(0, 40) || 'Hiệp Sĩ Không Gian Mạng';
                currentPlayerName = cleanName;
                console.log(`[Player] 👤 Cập nhật tên người chơi: "${currentPlayerName}" (Nguồn: ${data.source || 'Client'})`);
                broadcast({
                    type: 'PLAYER_NAME_UPDATED',
                    name: currentPlayerName,
                    playerName: currentPlayerName,
                    source: data.source || 'Client'
                });
            }

            // Gửi điểm lượt chơi vào Bảng Xếp Hạng Live (Lưu JSON)
            else if (data.type === 'SUBMIT_SCORE') {
                const scoreData = data.entry || data;
                const pName = scoreData.playerName || scoreData.name || currentPlayerName;
                console.log(`[Leaderboard] 🏆 Ghi nhận điểm lượt chơi mới từ "${pName}": ${scoreData.totalDuration}s, Boss: ${scoreData.bossDuration}s, Hoa hồng: ${scoreData.roses}`);
                addLeaderboardEntry(scoreData);
            }

            // Reset Bảng Xếp Hạng
            else if (data.type === 'RESET_LEADERBOARD') {
                console.log(`[Leaderboard] 🗑️ Yêu cầu reset bảng xếp hạng từ client.`);
                saveLeaderboard([]);
                broadcast({
                    type: 'LEADERBOARD_UPDATED',
                    entries: [],
                    leaderboard: []
                });
            }

            // Nhận tín hiệu nút bấm từ Điện thoại song song với Arduino
            else if (data.type === 'BUTTON_PRESS') {
                const button = (data.button || '').toUpperCase();
                if (['A', 'B', 'C', 'D', 'ENTER'].includes(button)) {
                    console.log(`[Mobile Controller] 🕹️ Nút: ${button} từ ${data.sender || ws.controllerId || 'Mobile'}`);
                    broadcast({
                        type: 'BUTTON_PRESS',
                        button: button,
                        source: 'MOBILE',
                        sender: data.sender || ws.controllerId
                    });
                }
            }
        } catch (e) {
            console.error('[WebSocket] Lỗi xử lý message:', e.message);
        }
    });

    ws.on('close', () => {
        if (ws.isController) {
            tunnelManager.unregisterController(socketId);
            console.log(`[WebSocket] 📱 Điện thoại đã ngắt kết nối: ${ws.controllerId} (Còn lại: ${tunnelManager.getControllerCount()})`);
        }
        if (ws.isHelper) {
            broadcast({
                type: 'HELPER_CURSOR_LEAVE',
                socketId: socketId,
                clientId: ws.helperClientId
            });
            const collab = helperCollaborators.get(socketId);
            helperCollaborators.delete(socketId);
            console.log(`[Helper Collab] 👤 Biên tập viên rời khỏi: ${collab ? collab.name : socketId} (Còn lại: ${helperCollaborators.size})`);
            broadcastHelperCollaborators();
        }
    });
});

// Khởi động server
wss.on('error', (err) => {
    if (err.code === 'EADDRINUSE') {
        console.warn(`[WebSocket] Cổng ${PORT} đã được sử dụng.`);
    } else {
        console.error(`[WebSocket] Lỗi:`, err);
    }
});

server.on('error', (err) => {
    if (err.code === 'EADDRINUSE') {
        console.warn(`[Server] Cổng ${PORT} hiện đang được sử dụng bởi tiến trình khác. Giữ nguyên server đang chạy.`);
    } else {
        console.error(`[Server] Lỗi server:`, err);
    }
});

server.listen(PORT, () => {
    console.log(`================================================================`);
    console.log(`🚀 CYBERSEC PASSWORD GUARDIAN (Pixel Style Game)`);
    console.log(`🌐 Server đang chạy tại: http://localhost:${PORT}`);
    console.log(`🕹️ Hỗ trợ đồng thời 3 kênh điều khiển song song:`);
    console.log(`   1. Bo mạch Arduino (5 nút bấm A, B, C, D, ENTER)`);
    console.log(`   2. Tay cầm Điện Thoại qua Live Tunnel / Wi-Fi QR Code`);
    console.log(`   3. Bàn phím máy tính PC (Phím A, B, C, D, ENTER)`);
    console.log(`================================================================`);

    // Quét và kết nối Arduino
    autoDetectArduino();

    // Khởi tạo Live Tunnel và tạo QR Code
    tunnelManager.init();
});
