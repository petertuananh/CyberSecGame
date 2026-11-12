/**
 * Tunnel & QR Code Manager - Vệ Binh Mật Khẩu
 * - Quản lý kết nối Live Tunnel (Internet / 4G) qua SSH localhost.run hoặc localtunnel
 * - Phát hiện địa chỉ IP nội bộ (Wi-Fi LAN)
 * - Tự động tạo mã QR Code cho cả hai đường truyền
 * - Hỗ trợ nhiều điện thoại kết nối song song qua WebSocket
 */

const os = require('os');
const { spawn } = require('child_process');
const qrcode = require('qrcode');
const EventEmitter = require('events');

class TunnelManager extends EventEmitter {
    constructor(port = 3000) {
        super();
        this.port = port;
        this.localIp = this._detectLocalIp();
        this.localUrl = `http://${this.localIp}:${this.port}/controller`;
        this.localQr = null;

        this.tunnelUrl = null;
        this.tunnelQr = null;
        this.tunnelStatus = 'initializing'; // 'initializing', 'active', 'failed'
        this.sshProcess = null;
        this.localtunnelInstance = null;
        this.connectedControllers = new Map(); // socketId -> { device, joinedAt }
    }

    // Phát hiện IP mạng Wi-Fi/Ethernet nội bộ (ưu tiên Wi-Fi/Ethernet thật, bỏ qua adapter ảo)
    _detectLocalIp() {
        const interfaces = os.networkInterfaces();
        let wifiOrEthIp = null;
        let genericIp = null;

        for (const name of Object.keys(interfaces)) {
            const lowerName = name.toLowerCase();
            const isVirtual = lowerName.includes('vmware') ||
                              lowerName.includes('virtual') ||
                              lowerName.includes('veth') ||
                              lowerName.includes('vethernet') ||
                              lowerName.includes('loopback') ||
                              lowerName.includes('wt0') ||
                              lowerName.includes('tap') ||
                              lowerName.includes('tun');

            for (const iface of interfaces[name]) {
                if (iface.family === 'IPv4' && !iface.internal) {
                    if (isVirtual) continue;

                    const isWifiOrEth = lowerName.includes('wi') || 
                                       lowerName.includes('wlan') || 
                                       lowerName.includes('ethernet') || 
                                       lowerName.includes('lan');

                    if (isWifiOrEth && !wifiOrEthIp) {
                        wifiOrEthIp = iface.address;
                    } else if (!genericIp) {
                        genericIp = iface.address;
                    }
                }
            }
        }
        return wifiOrEthIp || genericIp || '127.0.0.1';
    }

    async init() {
        // 1. Tạo QR Code cho mạng Wi-Fi nội bộ trước (ngay tức thì 0ms)
        try {
            this.localQr = await qrcode.toDataURL(this.localUrl, {
                width: 280,
                margin: 2,
                color: { dark: '#000000', light: '#ffffff' }
            });
            console.log(`[TunnelManager] 📶 Mạng Wi-Fi nội bộ: ${this.localUrl}`);
            this.emit('update', this.getInfo());
        } catch (e) {
            console.error('[TunnelManager] Lỗi tạo QR mạng nội bộ:', e);
        }

        // 2. Bắt đầu tạo Live Tunnel cho kết nối Internet / 4G
        this._startLiveTunnel();
    }

    _startLiveTunnel() {
        console.log(`[TunnelManager] 🌐 Đang khởi tạo Live Tunnel cho cổng ${this.port}...`);
        this.tunnelStatus = 'connecting';

        // Chiến lược 1: Thử dùng SSH localhost.run (nhanh, HTTPS trực tiếp, không trang quảng cáo)
        this._trySshTunnel()
            .then(url => this._onTunnelReady(url, 'localhost.run'))
            .catch(err => {
                console.warn('[TunnelManager] SSH tunnel không khả dụng, chuyển sang localtunnel:', err.message);
                // Chiến lược 2: Thử localtunnel
                this._tryLocaltunnel()
                    .then(url => this._onTunnelReady(url, 'localtunnel'))
                    .catch(e => {
                        console.error('[TunnelManager] Cả hai phương thức tunnel đều thất bại:', e.message);
                        this.tunnelStatus = 'failed';
                        this.emit('update', this.getInfo());
                    });
            });
    }

    _trySshTunnel() {
        return new Promise((resolve, reject) => {
            let resolved = false;
            let timeoutTimer = null;

            try {
                const ssh = spawn('ssh', [
                    '-o', 'StrictHostKeyChecking=no',
                    '-o', 'ServerAliveInterval=30',
                    '-R', `80:localhost:${this.port}`,
                    'nokey@localhost.run'
                ], { stdio: 'pipe' });

                this.sshProcess = ssh;

                ssh.stdout.on('data', (data) => {
                    const str = data.toString();
                    // Tìm URL dạng https://xxxx.lhr.life
                    const match = str.match(/https:\/\/[a-zA-Z0-9.-]+\.lhr\.life/);
                    if (match && !resolved) {
                        resolved = true;
                        if (timeoutTimer) clearTimeout(timeoutTimer);
                        resolve(match[0]);
                    }
                });

                ssh.stderr.on('data', (data) => {
                    const str = data.toString();
                    const match = str.match(/https:\/\/[a-zA-Z0-9.-]+\.lhr\.life/);
                    if (match && !resolved) {
                        resolved = true;
                        if (timeoutTimer) clearTimeout(timeoutTimer);
                        resolve(match[0]);
                    }
                });

                ssh.on('error', (err) => {
                    if (!resolved) {
                        resolved = true;
                        if (timeoutTimer) clearTimeout(timeoutTimer);
                        reject(err);
                    }
                });

                ssh.on('close', () => {
                    if (!resolved) {
                        resolved = true;
                        if (timeoutTimer) clearTimeout(timeoutTimer);
                        reject(new Error('SSH kết thúc trước khi có URL'));
                    }
                });

                timeoutTimer = setTimeout(() => {
                    if (!resolved) {
                        resolved = true;
                        try { ssh.kill(); } catch (e) {}
                        reject(new Error('SSH kết nối quá thời gian chờ (6s)'));
                    }
                }, 6000);

            } catch (err) {
                reject(err);
            }
        });
    }

    async _tryLocaltunnel() {
        const localtunnel = require('localtunnel');
        const tunnel = await localtunnel({ port: this.port });
        this.localtunnelInstance = tunnel;

        tunnel.on('close', () => {
            console.log('[TunnelManager] localtunnel đã đóng.');
        });

        tunnel.on('error', (err) => {
            console.warn('[TunnelManager] localtunnel lỗi:', err.message);
        });

        return tunnel.url;
    }

    async _onTunnelReady(rawUrl, provider) {
        // Đảm bảo URL kết thúc không có slash và trỏ đến /controller
        const base = rawUrl.replace(/\/+$/, '');
        this.tunnelUrl = `${base}/controller`;
        this.tunnelStatus = 'active';

        try {
            this.tunnelQr = await qrcode.toDataURL(this.tunnelUrl, {
                width: 280,
                margin: 2,
                color: { dark: '#000000', light: '#ffffff' }
            });
        } catch (e) {
            console.error('[TunnelManager] Lỗi tạo QR cho Live Tunnel:', e);
        }

        console.log(`================================================================`);
        console.log(`📱 TAY CẦM ĐIỆN THOẠI (SMARTPHONE CONTROLLER) SẴN SÀNG!`);
        console.log(`🌐 Live Tunnel (4G/Internet): ${this.tunnelUrl} (${provider})`);
        console.log(`📶 Mạng Nội Bộ (Cùng Wi-Fi): ${this.localUrl}`);
        console.log(`📷 Quét mã QR trên màn hình game để kết nối ngay!`);
        console.log(`================================================================`);

        this.emit('update', this.getInfo());
    }

    registerController(socketId, deviceInfo = {}) {
        this.connectedControllers.set(socketId, {
            device: deviceInfo.device || 'Smartphone',
            name: deviceInfo.name || `Tay Cầm #${this.connectedControllers.size + 1}`,
            joinedAt: Date.now()
        });
        this.emit('controller_change', this.getControllerCount());
    }

    unregisterController(socketId) {
        if (this.connectedControllers.has(socketId)) {
            this.connectedControllers.delete(socketId);
            this.emit('controller_change', this.getControllerCount());
        }
    }

    getControllerCount() {
        return this.connectedControllers.size;
    }

    getInfo() {
        return {
            status: this.tunnelStatus,
            tunnelUrl: this.tunnelUrl,
            tunnelQr: this.tunnelQr,
            localUrl: this.localUrl,
            localQr: this.localQr,
            localIp: this.localIp,
            controllerCount: this.getControllerCount()
        };
    }

    destroy() {
        if (this.sshProcess) {
            try { this.sshProcess.kill(); } catch (e) {}
            this.sshProcess = null;
        }
        if (this.localtunnelInstance) {
            try { this.localtunnelInstance.close(); } catch (e) {}
            this.localtunnelInstance = null;
        }
    }
}

module.exports = TunnelManager;
