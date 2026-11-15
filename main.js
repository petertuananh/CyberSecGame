/**
 * Electron Main Process - Vệ Binh Mật Khẩu (CyberSec Password Guardian)
 * - Mở duy nhất 1 cửa sổ Desktop riêng biệt (Single Window Instance)
 * - Khởi động kèm Server Node.js nội hợp (Express + SerialPort + WebSocket)
 * - Ngăn chặn triệt để hiện tượng mở trùng lặp / spam nhiều cửa sổ
 * - Xử lý trường hợp lỗi không mở được cửa sổ riêng -> Hỏi người dùng mở trên trình duyệt
 */

const { app, BrowserWindow, dialog, shell, Menu } = require('electron');
const path = require('path');
const http = require('http');
const fs = require('fs');

// Đảm bảo chỉ chạy duy nhất 1 phiên bản của ứng dụng
const gotTheLock = app.requestSingleInstanceLock();
if (!gotTheLock) {
    console.log("[Electron] Một phiên bản khác của game đang chạy. Tiến trình này sẽ dừng ngay lập tức.");
    app.quit();
    process.exit(0);
}

let mainWindow = null;
let isStartingServer = false;
let isWindowOpening = false;
const PORT = process.env.PORT || 3000;
const APP_URL = `http://localhost:${PORT}`;

app.on('second-instance', () => {
    // Khi người dùng bấm mở thêm lần nữa, chỉ focus lại cửa sổ đã có
    if (mainWindow && !mainWindow.isDestroyed()) {
        if (mainWindow.isMinimized()) mainWindow.restore();
        mainWindow.focus();
    }
});

// Kiểm tra xem Server Node đã chạy chưa (đảm bảo cb chỉ được gọi đúng 1 lần duy nhất)
function checkServerReady(cb) {
    let responded = false;
    const finish = (val) => {
        if (!responded) {
            responded = true;
            cb(val);
        }
    };

    const req = http.get(APP_URL, (res) => {
        finish(res.statusCode >= 200 && res.statusCode < 400);
    });

    req.on('error', () => {
        finish(false);
    });

    req.setTimeout(600, () => {
        try { req.destroy(); } catch (e) {}
        finish(false);
    });
}

function waitForServer(callback, retries = 30) {
    if (retries <= 0) {
        callback();
        return;
    }
    checkServerReady((isReady) => {
        if (isReady) {
            callback();
        } else {
            setTimeout(() => waitForServer(callback, retries - 1), 250);
        }
    });
}

function ensureServerRunning(callback) {
    checkServerReady((isReady) => {
        if (isReady) {
            callback();
            return;
        }

        if (!isStartingServer) {
            isStartingServer = true;
            try {
                // Khởi động server nội bộ trong cùng tiến trình
                require(path.join(__dirname, 'server.js'));
            } catch (err) {
                console.error("[Electron] Lỗi khởi động server nội bộ:", err);
            }
        }
        waitForServer(callback);
    });
}

// Tạo cửa sổ Desktop riêng biệt (Bảo đảm Singleton tuyệt đối)
function createGameWindow() {
    // Nếu cửa sổ đã tồn tại và chưa bị destroy -> chỉ focus, KHÔNG BAO GIỜ tạo mới
    if (mainWindow && !mainWindow.isDestroyed()) {
        if (mainWindow.isMinimized()) mainWindow.restore();
        mainWindow.focus();
        return;
    }

    if (isWindowOpening) {
        return;
    }
    isWindowOpening = true;

    try {
        let iconPath = path.join(__dirname, 'icon.ico');
        if (process.platform === 'darwin') {
            const icnsPath = path.join(__dirname, 'icon.icns');
            const pngPath = path.join(__dirname, 'icon.png');
            if (fs.existsSync(icnsPath)) iconPath = icnsPath;
            else if (fs.existsSync(pngPath)) iconPath = pngPath;

            if (app.dock && fs.existsSync(pngPath)) {
                try { app.dock.setIcon(pngPath); } catch (e) {}
            }
        }

        mainWindow = new BrowserWindow({
            width: 1360,
            height: 840,
            minWidth: 1024,
            minHeight: 680,
            title: "Vệ Binh Mật Khẩu - CyberSec Password Guardian",
            icon: iconPath,
            backgroundColor: '#090714',
            autoHideMenuBar: true,
            titleBarStyle: process.platform === 'darwin' ? 'default' : undefined,
            show: false, // Ẩn cửa sổ cho đến khi sẵn sàng để tránh chớp giật
            webPreferences: {
                nodeIntegration: false,
                contextIsolation: true
            }
        });

        mainWindow.once('ready-to-show', () => {
            if (mainWindow && !mainWindow.isDestroyed()) {
                mainWindow.show();
                mainWindow.focus();
            }
            isWindowOpening = false;
        });

        mainWindow.loadURL(APP_URL).catch((err) => {
            isWindowOpening = false;
            console.error("[Electron] Lỗi khi tải URL vào cửa sổ riêng:", err);
            handleWindowFailure(err);
        });

        mainWindow.on('closed', () => {
            mainWindow = null;
            isWindowOpening = false;
        });

        // Xử lý sự kiện nếu renderer process crash
        mainWindow.webContents.on('render-process-gone', (event, details) => {
            console.warn("[Electron] Renderer process gone:", details);
            isWindowOpening = false;
            handleWindowFailure(new Error("Tiến trình đồ họa bị gián đoạn."));
        });

    } catch (err) {
        isWindowOpening = false;
        console.error("[Electron] Không thể khởi tạo cửa sổ riêng:", err);
        handleWindowFailure(err);
    }
}

// Trường hợp không mở được cửa sổ riêng -> Hỏi người dùng để mở trên trình duyệt
function handleWindowFailure(err) {
    if (mainWindow) {
        try { mainWindow.destroy(); } catch (e) {}
        mainWindow = null;
    }

    let choice = 0;
    try {
        choice = dialog.showMessageBoxSync({
            type: 'question',
            buttons: ['Mở trên Trình Duyệt', 'Thoát'],
            defaultId: 0,
            cancelId: 1,
            title: 'Vệ Binh Mật Khẩu - Thông Báo',
            message: 'Không thể mở cửa sổ ứng dụng riêng biệt.',
            detail: 'Bạn có muốn tiếp tục trải nghiệm trò chơi trên trình duyệt web mặc định của máy tính không?'
        });
    } catch (dialogErr) {
        console.error("[Electron] Lỗi hiển thị hộp thoại thông báo:", dialogErr);
        choice = 0;
    }

    if (choice === 0) {
        shell.openExternal(APP_URL);
    } else {
        app.quit();
    }
}

// Thiết lập Menu chuẩn cho macOS (Cmd+C, Cmd+V, Cmd+Q, Fullscreen...)
function setupApplicationMenu() {
    if (process.platform === 'darwin') {
        const template = [
            {
                label: 'Vệ Binh Mật Khẩu',
                submenu: [
                    { role: 'about', label: 'Về Vệ Binh Mật Khẩu' },
                    { type: 'separator' },
                    { role: 'services', label: 'Dịch vụ' },
                    { type: 'separator' },
                    { role: 'hide', label: 'Ẩn Vệ Binh Mật Khẩu' },
                    { role: 'hideOthers', label: 'Ẩn các ứng dụng khác' },
                    { role: 'unhide', label: 'Hiện tất cả' },
                    { type: 'separator' },
                    { role: 'quit', label: 'Thoát' }
                ]
            },
            {
                label: 'Chỉnh sửa',
                submenu: [
                    { role: 'undo', label: 'Hoàn tác' },
                    { role: 'redo', label: 'Làm lại' },
                    { type: 'separator' },
                    { role: 'cut', label: 'Cắt' },
                    { role: 'copy', label: 'Sao chép' },
                    { role: 'paste', label: 'Dán' },
                    { role: 'selectAll', label: 'Chọn tất cả' }
                ]
            },
            {
                label: 'Hiển thị',
                submenu: [
                    { role: 'reload', label: 'Tải lại trang' },
                    { role: 'forceReload', label: 'Tải lại bắt buộc' },
                    { role: 'toggleDevTools', label: 'Công cụ phát triển (DevTools)' },
                    { type: 'separator' },
                    { role: 'resetZoom', label: 'Kích thước mặc định' },
                    { role: 'zoomIn', label: 'Phóng to' },
                    { role: 'zoomOut', label: 'Thu nhỏ' },
                    { type: 'separator' },
                    { role: 'togglefullscreen', label: 'Bật/Tắt Toàn màn hình' }
                ]
            },
            {
                label: 'Cửa sổ',
                submenu: [
                    { role: 'minimize', label: 'Thu nhỏ' },
                    { role: 'zoom', label: 'Phóng đại' },
                    { type: 'separator' },
                    { role: 'front', label: 'Đưa lên phía trước' }
                ]
            }
        ];
        Menu.setApplicationMenu(Menu.buildFromTemplate(template));
    }
}

// Vòng đời ứng dụng Electron
app.whenReady().then(() => {
    setupApplicationMenu();

    ensureServerRunning(() => {
        createGameWindow();
    });

    app.on('activate', () => {
        if (BrowserWindow.getAllWindows().length === 0) {
            createGameWindow();
        }
    });
});

app.on('window-all-closed', () => {
    app.quit();
});
