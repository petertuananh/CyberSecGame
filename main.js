/**
 * Electron Main Process - Vệ Binh Mật Khẩu (CyberSec Password Guardian)
 * - Mở duy nhất 1 cửa sổ Desktop riêng biệt (Single Window Instance)
 * - Khởi động kèm Server Node.js nội hợp (Express + SerialPort + WebSocket)
 * - Ngăn chặn triệt để hiện tượng mở trùng lặp / spam nhiều cửa sổ
 * - Xử lý trường hợp lỗi không mở được cửa sổ riêng -> Hỏi người dùng mở trên trình duyệt
 */

const { app, BrowserWindow, dialog, shell } = require('electron');
const path = require('path');
const http = require('http');

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
        const iconPath = path.join(__dirname, 'icon.ico');
        mainWindow = new BrowserWindow({
            width: 1360,
            height: 840,
            minWidth: 1024,
            minHeight: 680,
            title: "Vệ Binh Mật Khẩu - CyberSec Password Guardian",
            icon: iconPath,
            backgroundColor: '#090714',
            autoHideMenuBar: true,
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

// Vòng đời ứng dụng Electron
app.whenReady().then(() => {
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
    if (process.platform !== 'darwin') {
        app.quit();
    }
});
