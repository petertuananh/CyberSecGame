/**
 * CyberSec Password Guardian - Node.js Server
 * Tích hợp Express + WebSocket + SerialPort (Arduino 5 nút bấm)
 */

const express = require('express');
const http = require('http');
const path = require('path');
const { WebSocketServer } = require('ws');
const { SerialPort } = require('serialport');
const { ReadlineParser } = require('@serialport/parser-readline');

const app = express();
const server = http.createServer(app);
const wss = new WebSocketServer({ server });

const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Trạng thái kết nối Serial
let currentSerialPort = null;
let currentParser = null;
let connectedPortName = null;

// Gửi thông điệp tới tất cả các client đang mở game
function broadcast(msgObj) {
    const data = JSON.stringify(msgObj);
    wss.clients.forEach(client => {
        if (client.readyState === 1) { // OPEN
            client.send(data);
        }
    });
}

// Xử lý nút bấm từ Serial và chuyển tiếp vào Game
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
            button: button
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

        // Ưu tiên tìm thiết bị có thông tin Arduino / CH340 / FTDI / USB Serial
        const arduinoPort = ports.find(p => {
            const str = `${p.manufacturer || ''} ${p.friendlyName || ''} ${p.vendorId || ''}`.toLowerCase();
            return str.includes('arduino') || str.includes('ch340') || str.includes('ftdi') || str.includes('usb');
        }) || ports[0]; // Hoặc lấy cổng đầu tiên nếu có

        if (arduinoPort) {
            console.log(`[SerialPort] Tự động thử kết nối cổng: ${arduinoPort.path}`);
            connectToPort(arduinoPort.path, 115200).catch(err => {
                console.log(`[SerialPort] Thử tốc độ 9600...`);
                connectToPort(arduinoPort.path, 9600).catch(e => {
                    console.log(`[SerialPort] Không thể tự động kết nối (có thể cần chọn thủ công trên web).`);
                });
            });
        } else {
            console.log("[SerialPort] Chưa cắm Arduino. Game vẫn hoạt động bình thường bằng bàn phím PC!");
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

// Quản lý WebSocket kết nối từ trình duyệt
wss.on('connection', (ws) => {
    console.log('[WebSocket] Game client đã kết nối vào server!');
    // Gửi trạng thái cổng hiện tại cho client vừa vào
    ws.send(JSON.stringify({
        type: 'PORT_STATUS',
        connected: !!connectedPortName,
        port: connectedPortName
    }));
});

// Khởi động server
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
    console.log(`🎮 Mở trình duyệt và truy cập link trên để chơi game!`);
    console.log(`🕹️ Hỗ trợ 5 nút Arduino (A, B, C, D, ENTER) & Bàn phím máy tính!`);
    console.log(`================================================================`);

    // Quét và kết nối Arduino
    autoDetectArduino();
});
