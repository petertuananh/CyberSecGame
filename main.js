/**
 * Electron Main Process - Vệ Binh Mật Khẩu (CyberSec Password Guardian)
 * - Mở cửa sổ Desktop riêng biệt (Dedicated Window) không thanh địa chỉ/tab
 * - Khởi động kèm Server Node.js nội hợp (Express + SerialPort + WebSocket)
 * - Xử lý trường hợp lỗi không mở được cửa sổ riêng -> Hỏi người dùng mở trên trình duyệt
 */

const { app, BrowserWindow, dialog, shell } = require('electron');
const path = require('path');
const http = require('http');

let mainWindow = null;
const PORT = process.env.PORT || 3000;
const APP_URL = `http://localhost:${PORT}`;

// Đảm bảo chỉ chạy 1 phiên bản duy nhất
const gotTheLock = app.requestSingleInstanceLock();
if (!gotTheLock) {
    app.quit();
} else {
    app.on('second-instance', () => {
        if (mainWindow) {
            if (mainWindow.isMinimized()) mainWindow.restore();
            mainWindow.focus();
        }
    });
}

// Kiểm tra xem Server Node đã chạy chưa, nếu chưa thì tự import / khởi động server
function ensureServerRunning(callback) {
    checkServerReady((isReady) => {
        if (isReady) {
            callback();
        } else {
            try {
                // Khởi động server nội bộ trong cùng tiến trình
                require(path.join(__dirname, 'server.js'));
                waitForServer(callback);
            } catch (err) {
                console.error("Lỗi khởi động server nội bộ:", err);
                waitForServer(callback);
            }
        }
    });
}

function checkServerReady(cb) {
    const req = http.get(APP_URL, (res) => {
        if (res.statusCode >= 200 && res.statusCode < 400) {
            cb(true);
        } else {
            cb(false);
        }
    });
    req.on('error', () => cb(false));
    req.setTimeout(800, () => {
        req.destroy();
        cb(false);
    });
}

function waitForServer(callback, retries = 25) {
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

// Tạo cửa sổ Desktop riêng biệt
function createGameWindow() {
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
            webPreferences: {
                nodeIntegration: false,
                contextIsolation: true
            }
        });

        mainWindow.loadURL(APP_URL).catch((err) => {
            console.error("Lỗi khi tải URL vào cửa sổ riêng:", err);
            handleWindowFailure(err);
        });

        mainWindow.on('closed', () => {
            mainWindow = null;
        });

        // Xử lý sự kiện nếu renderer process crash
        mainWindow.webContents.on('render-process-gone', (event, details) => {
            console.warn("Cửa sổ bị đóng hoặc crash:", details);
            handleWindowFailure(new Error("Tiến trình đồ họa bị gián đoạn."));
        });

    } catch (err) {
        console.error("Không thể khởi tạo cửa sổ riêng:", err);
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
        console.error("Lỗi hiển thị hộp thoại thông báo:", dialogErr);
        choice = 0; // Mặc định mở trình duyệt nếu không bật được dialog
    }

    if (choice === 0) {
        // Mở URL trên trình duyệt web mặc định của người dùng
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
