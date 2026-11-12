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
const { WebSocketServer } = require('ws');
const { SerialPort } = require('serialport');
const { ReadlineParser } = require('@serialport/parser-readline');
const TunnelManager = require('./tunnel_manager');

const app = express();
const server = http.createServer(app);
const wss = new WebSocketServer({ server });

const PORT = process.env.PORT || 3000;
const tunnelManager = new TunnelManager(PORT);

// Quản lý file cấu hình game (Sections, Questions, Roses, Random)
const DATA_DIR = path.join(__dirname, 'data');
const CONFIG_FILE = path.join(DATA_DIR, 'game_config.json');
const DEFAULT_CONFIG_FILE = path.join(DATA_DIR, 'default_config.json');

// Quản lý Phiên bản cấu hình để kiểm tra Xung đột (Conflict Checking) khi nhiều máy cùng sửa
let serverRevision = 1;
let lastSavedMeta = {
    savedAt: Date.now(),
    savedBy: 'Hệ thống Khởi tạo',
    revision: 1
};

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
            savedAt: lastSavedMeta.savedAt
        });

        res.json({
            success: true,
            revision: serverRevision,
            savedBy: editorName,
            savedAt: lastSavedMeta.savedAt,
            message: 'Đã lưu cấu hình vào game thành công!'
        });
    } catch (e) {
        console.error('[Config] Lỗi lưu cấu hình:', e.message);
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
        res.status(500).json({ error: e.message });
    }
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
