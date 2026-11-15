/**
 * Tunnel & QR Code Manager - Vệ Binh Mật Khẩu (CyberSec Password Guardian)
 * - Quản lý kết nối Live Tunnel (Internet / 4G) đa tầng:
 *   + Tier 1: Cloudflare Quick Tunnel (cloudflared) - Siêu tốc, CDN toàn cầu, vô hạn băng thông
 *   + Tier 2: Pinggy (a.pinggy.io:443) - Chuẩn SSH port 443, hỗ trợ nhiều máy/tiến trình cùng 1 IP không giới hạn
 *   + Tier 3: Serveo (serveo.net)
 *   + Tier 4: localhost.run (nokey@localhost.run)
 *   + Tier 5: localtunnel
 * - Tự động phát hiện địa chỉ IP mạng nội bộ Wi-Fi / Ethernet
 * - Tự động tạo mã QR Code động cho cả Controller và Helper Live Edit
 * - Hỗ trợ tự động kết nối lại (Auto Reconnect) khi mạng rớt
 */

const os = require('os');
const path = require('path');
const fs = require('fs');
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

        this.localHelperUrl = `http://${this.localIp}:${this.port}/helper`;
        this.localHelperQr = null;

        this.tunnelUrl = null;
        this.tunnelQr = null;
        this.tunnelHelperUrl = null;
        this.tunnelHelperQr = null;
        this.tunnelStatus = 'initializing'; // 'initializing', 'connecting', 'active', 'reconnecting', 'failed'
        this.provider = 'Khởi tạo';

        this.activeProcess = null;
        this.localtunnelInstance = null;
        this.connectedControllers = new Map(); // socketId -> { device, joinedAt }
        this.reconnectTimer = null;
        this.isDestroyed = false;
        this._isDownloadingCf = false;
    }

    // Phát hiện IP mạng Wi-Fi/Ethernet nội bộ (ưu tiên Wi-Fi/Ethernet thật, hỗ trợ cả Windows và macOS en0/en1)
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
                              lowerName.includes('tun') ||
                              lowerName.includes('bridge') ||
                              lowerName.includes('p2p') ||
                              lowerName.includes('awdl');

            for (const iface of interfaces[name]) {
                if (iface.family === 'IPv4' && !iface.internal) {
                    if (isVirtual) continue;

                    // Nhận diện Wi-Fi/Ethernet trên cả Windows (Wi-Fi, Ethernet, LAN) và macOS/Linux (en0, en1, eth0, wlan0)
                    const isWifiOrEth = lowerName.includes('wi') || 
                                       lowerName.includes('wlan') || 
                                       lowerName.includes('ethernet') || 
                                       lowerName.includes('lan') ||
                                       lowerName.startsWith('en') ||
                                       lowerName.startsWith('eth');

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
        // 1. Tạo QR Code cho mạng Wi-Fi nội bộ trước (ngay tức thì 0ms) cho cả Controller và Helper
        try {
            this.localQr = await qrcode.toDataURL(this.localUrl, {
                width: 280,
                margin: 2,
                color: { dark: '#000000', light: '#ffffff' }
            });
            this.localHelperQr = await qrcode.toDataURL(this.localHelperUrl, {
                width: 280,
                margin: 2,
                color: { dark: '#000000', light: '#ffffff' }
            });
            console.log(`[TunnelManager] 📶 Mạng Wi-Fi nội bộ Controller: ${this.localUrl}`);
            console.log(`[TunnelManager] 📝 Mạng Wi-Fi nội bộ Helper Live: ${this.localHelperUrl}`);
            this.emit('update', this.getInfo());
        } catch (e) {
            console.error('[TunnelManager] Lỗi tạo QR mạng nội bộ:', e);
        }

        // 2. Bắt đầu tạo Live Tunnel cho kết nối Internet / 4G
        this._startLiveTunnel();
    }

    _getCloudflaredPath() {
        const isWin = process.platform === 'win32';
        const binName = isWin ? 'cloudflared.exe' : 'cloudflared';
        const homeDir = os.homedir();

        let appDataBin = '';
        if (isWin) {
            const localAppData = process.env.LOCALAPPDATA || (process.env.USERPROFILE ? path.join(process.env.USERPROFILE, 'AppData', 'Local') : '');
            appDataBin = path.join(localAppData, 'CyberSecGame', 'bin', binName);
        } else {
            appDataBin = path.join(homeDir, 'Library', 'Application Support', 'CyberSecGame', 'bin', binName);
        }

        const candidates = [
            appDataBin,
            path.join(__dirname, 'bin', binName),
            '/opt/homebrew/bin/cloudflared', // macOS Apple Silicon (Homebrew)
            '/usr/local/bin/cloudflared',     // macOS Intel / Linux (Homebrew/apt)
            binName,
            'cloudflared'
        ];

        for (const candidate of candidates) {
            try {
                if (candidate && fs.existsSync(candidate)) return candidate;
            } catch (e) {}
        }
        return null;
    }

    _triggerCloudflaredDownload() {
        if (this._isDownloadingCf) return;
        this._isDownloadingCf = true;

        const isWin = process.platform === 'win32';
        const isMac = process.platform === 'darwin';
        const isArm = process.arch === 'arm64';
        const binName = isWin ? 'cloudflared.exe' : 'cloudflared';
        const homeDir = os.homedir();

        let binDir = '';
        if (isWin) {
            const localAppData = process.env.LOCALAPPDATA || (process.env.USERPROFILE ? path.join(process.env.USERPROFILE, 'AppData', 'Local') : os.tmpdir());
            binDir = path.join(localAppData, 'CyberSecGame', 'bin');
        } else if (isMac) {
            binDir = path.join(homeDir, 'Library', 'Application Support', 'CyberSecGame', 'bin');
        } else {
            binDir = path.join(homeDir, '.cybersec', 'bin');
        }

        const targetPath = path.join(binDir, binName);
        if (fs.existsSync(targetPath)) {
            this._isDownloadingCf = false;
            return;
        }

        (async () => {
            try {
                if (!fs.existsSync(binDir)) {
                    fs.mkdirSync(binDir, { recursive: true });
                }
                console.log(`[TunnelManager] ⬇️ Đang tải Cloudflare Quick Tunnel (${process.platform}-${process.arch}) ngầm để tối ưu kết nối...`);
                
                let downloadUrl = 'https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-windows-amd64.exe';
                if (isMac) {
                    downloadUrl = isArm
                        ? 'https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-darwin-arm64'
                        : 'https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-darwin-amd64';
                } else if (!isWin) {
                    downloadUrl = isArm
                        ? 'https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-arm64'
                        : 'https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-amd64';
                }

                const res = await fetch(downloadUrl);
                if (res.ok) {
                    const buf = await res.arrayBuffer();
                    const tmpFile = targetPath + '.tmp';
                    fs.writeFileSync(tmpFile, Buffer.from(buf));
                    if (!isWin) {
                        try { fs.chmodSync(tmpFile, 0o755); } catch (e) {}
                    }
                    fs.renameSync(tmpFile, targetPath);
                    if (!isWin) {
                        try { fs.chmodSync(targetPath, 0o755); } catch (e) {}
                    }
                    console.log('[TunnelManager] ⚡ Đã tải xong Cloudflare Quick Tunnel! Sẵn sàng cho lần khởi chạy tiếp theo.');
                }
            } catch (err) {
                console.warn('[TunnelManager] Tải cloudflared ngầm tạm hoãn:', err.message);
            } finally {
                this._isDownloadingCf = false;
            }
        })();
    }

    async _startLiveTunnel() {
        if (this.isDestroyed) return;
        console.log(`[TunnelManager] 🌐 Đang khởi tạo Live Tunnel cho cổng ${this.port}...`);
        this.tunnelStatus = 'connecting';
        this.emit('update', this.getInfo());

        // 1. Kiểm tra Cloudflare Quick Tunnel trước nếu đã có sẵn binary
        const cfPath = this._getCloudflaredPath();
        if (cfPath) {
            try {
                console.log('[TunnelManager] ⚡ Thử kết nối qua Cloudflare Quick Tunnel...');
                const url = await this._tryCloudflareTunnel(cfPath);
                await this._onTunnelReady(url, 'Cloudflare Quick Tunnel');
                return;
            } catch (e) {
                console.warn('[TunnelManager] Cloudflare Quick Tunnel không thành công, chuyển sang Pinggy:', e.message);
            }
        } else {
            // Tải ngầm cloudflared để lần chạy sau tự động nâng cấp lên Cloudflare
            this._triggerCloudflaredDownload();
        }

        // 2. Thử Pinggy (Miễn phí, OpenSSH qua port 443, đa tiến trình cùng IP không bị chặn)
        try {
            console.log('[TunnelManager] 🚀 Thử kết nối qua Pinggy (Multi-Client IP Safe)...');
            const url = await this._tryPinggyTunnel();
            await this._onTunnelReady(url, 'Pinggy High-Speed Tunnel');
            return;
        } catch (e) {
            console.warn('[TunnelManager] Pinggy không khả dụng, thử Serveo:', e.message);
        }

        // 3. Thử Serveo
        try {
            console.log('[TunnelManager] 🔄 Thử kết nối qua Serveo...');
            const url = await this._tryServeoTunnel();
            await this._onTunnelReady(url, 'Serveo Tunnel');
            return;
        } catch (e) {
            console.warn('[TunnelManager] Serveo không khả dụng, thử localhost.run:', e.message);
        }

        // 4. Thử localhost.run
        try {
            console.log('[TunnelManager] 🔄 Thử kết nối qua localhost.run...');
            const url = await this._trySshTunnel();
            await this._onTunnelReady(url, 'localhost.run');
            return;
        } catch (e) {
            console.warn('[TunnelManager] localhost.run không khả dụng, thử localtunnel:', e.message);
        }

        // 5. Thử localtunnel
        try {
            console.log('[TunnelManager] 🔄 Thử kết nối qua localtunnel...');
            const url = await this._tryLocaltunnel();
            await this._onTunnelReady(url, 'localtunnel');
            return;
        } catch (e) {
            console.error('[TunnelManager] ❌ Toàn bộ các phương thức tunnel đều thất bại:', e.message);
            this.tunnelStatus = 'failed';
            this.provider = 'Thất bại';
            this.emit('update', this.getInfo());

            // Tự động thử lại sau 10 giây nếu mất mạng
            if (!this.isDestroyed) {
                setTimeout(() => this._startLiveTunnel(), 10000);
            }
        }
    }

    _tryCloudflareTunnel(cfPath) {
        return new Promise((resolve, reject) => {
            let resolved = false;
            let timer = null;

            try {
                const child = spawn(cfPath, [
                    'tunnel',
                    '--url', `http://127.0.0.1:${this.port}`
                ], { stdio: 'pipe' });

                this.activeProcess = child;

                const checkOutput = (data) => {
                    const text = data.toString();
                    const match = text.match(/https:\/\/[a-zA-Z0-9-]+\.trycloudflare\.com/);
                    if (match && !resolved) {
                        resolved = true;
                        if (timer) clearTimeout(timer);
                        resolve(match[0]);
                    }
                };

                child.stdout.on('data', checkOutput);
                child.stderr.on('data', checkOutput);

                child.on('error', (err) => {
                    if (!resolved) {
                        resolved = true;
                        if (timer) clearTimeout(timer);
                        reject(err);
                    }
                });

                child.on('close', (code) => {
                    if (!resolved) {
                        resolved = true;
                        if (timer) clearTimeout(timer);
                        reject(new Error(`Cloudflare tunnel kết thúc với mã ${code}`));
                    } else if (!this.isDestroyed) {
                        this._handleProcessClose('Cloudflare');
                    }
                });

                timer = setTimeout(() => {
                    if (!resolved) {
                        resolved = true;
                        try { child.kill(); } catch (e) {}
                        reject(new Error('Cloudflare tunnel quá thời gian chờ (8s)'));
                    }
                }, 8000);
            } catch (err) {
                reject(err);
            }
        });
    }

    _tryPinggyTunnel() {
        return new Promise((resolve, reject) => {
            let resolved = false;
            let timer = null;

            try {
                // Pinggy chạy qua cổng 443 (HTTPS) nên 100% vượt qua firewall trường học/văn phòng
                // Và hỗ trợ nhiều máy/tiến trình cùng lúc trên 1 IP public mà không bị xung đột
                const ssh = spawn('ssh', [
                    '-p', '443',
                    '-o', 'StrictHostKeyChecking=no',
                    '-o', 'ServerAliveInterval=20',
                    '-o', 'ConnectTimeout=8',
                    `-R0:localhost:${this.port}`,
                    'a.pinggy.io'
                ], { stdio: 'pipe' });

                this.activeProcess = ssh;

                const checkOutput = (data) => {
                    const text = data.toString();
                    const match = text.match(/https:\/\/[a-zA-Z0-9.-]+(?:free\.pinggy\.net|run\.pinggy-free\.link)/);
                    if (match && !resolved) {
                        resolved = true;
                        if (timer) clearTimeout(timer);
                        resolve(match[0]);
                    }
                };

                ssh.stdout.on('data', checkOutput);
                ssh.stderr.on('data', checkOutput);

                ssh.on('error', (err) => {
                    if (!resolved) {
                        resolved = true;
                        if (timer) clearTimeout(timer);
                        reject(err);
                    }
                });

                ssh.on('close', (code) => {
                    if (!resolved) {
                        resolved = true;
                        if (timer) clearTimeout(timer);
                        reject(new Error(`Pinggy SSH kết thúc với mã ${code}`));
                    } else if (!this.isDestroyed) {
                        this._handleProcessClose('Pinggy');
                    }
                });

                timer = setTimeout(() => {
                    if (!resolved) {
                        resolved = true;
                        try { ssh.kill(); } catch (e) {}
                        reject(new Error('Pinggy SSH quá thời gian chờ (8s)'));
                    }
                }, 8000);
            } catch (err) {
                reject(err);
            }
        });
    }

    _tryServeoTunnel() {
        return new Promise((resolve, reject) => {
            let resolved = false;
            let timer = null;

            try {
                const ssh = spawn('ssh', [
                    '-o', 'StrictHostKeyChecking=no',
                    '-o', 'ServerAliveInterval=20',
                    '-o', 'ConnectTimeout=8',
                    '-R', `80:localhost:${this.port}`,
                    'serveo.net'
                ], { stdio: 'pipe' });

                this.activeProcess = ssh;

                const checkOutput = (data) => {
                    const text = data.toString();
                    const match = text.match(/https:\/\/[a-zA-Z0-9.-]+\.serveousercontent\.com/);
                    if (match && !resolved) {
                        resolved = true;
                        if (timer) clearTimeout(timer);
                        resolve(match[0]);
                    }
                };

                ssh.stdout.on('data', checkOutput);
                ssh.stderr.on('data', checkOutput);

                ssh.on('error', (err) => {
                    if (!resolved) {
                        resolved = true;
                        if (timer) clearTimeout(timer);
                        reject(err);
                    }
                });

                ssh.on('close', (code) => {
                    if (!resolved) {
                        resolved = true;
                        if (timer) clearTimeout(timer);
                        reject(new Error(`Serveo SSH kết thúc với mã ${code}`));
                    } else if (!this.isDestroyed) {
                        this._handleProcessClose('Serveo');
                    }
                });

                timer = setTimeout(() => {
                    if (!resolved) {
                        resolved = true;
                        try { ssh.kill(); } catch (e) {}
                        reject(new Error('Serveo kết nối quá thời gian chờ (8s)'));
                    }
                }, 8000);
            } catch (err) {
                reject(err);
            }
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
                    '-o', 'ConnectTimeout=8',
                    '-R', `80:localhost:${this.port}`,
                    'nokey@localhost.run'
                ], { stdio: 'pipe' });

                this.activeProcess = ssh;

                const checkOutput = (data) => {
                    const str = data.toString();
                    const match = str.match(/https:\/\/[a-zA-Z0-9.-]+\.lhr\.life/);
                    if (match && !resolved) {
                        resolved = true;
                        if (timeoutTimer) clearTimeout(timeoutTimer);
                        resolve(match[0]);
                    }
                };

                ssh.stdout.on('data', checkOutput);
                ssh.stderr.on('data', checkOutput);

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
                    } else if (!this.isDestroyed) {
                        this._handleProcessClose('localhost.run');
                    }
                });

                timeoutTimer = setTimeout(() => {
                    if (!resolved) {
                        resolved = true;
                        try { ssh.kill(); } catch (e) {}
                        reject(new Error('SSH localhost.run quá thời gian chờ (8s)'));
                    }
                }, 8000);

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
            if (!this.isDestroyed) {
                this._handleProcessClose('localtunnel');
            }
        });

        tunnel.on('error', (err) => {
            console.warn('[TunnelManager] localtunnel lỗi:', err.message);
        });

        return tunnel.url;
    }

    _handleProcessClose(providerName) {
        if (this.isDestroyed) return;
        console.warn(`[TunnelManager] ⚠️ Tunnel ${providerName} đã ngắt kết nối. Đang tự động kết nối lại sau 2.5s...`);
        this.tunnelStatus = 'reconnecting';
        this.emit('update', this.getInfo());

        if (this.reconnectTimer) clearTimeout(this.reconnectTimer);
        this.reconnectTimer = setTimeout(() => {
            if (!this.isDestroyed) {
                this._startLiveTunnel();
            }
        }, 2500);
    }

    async _onTunnelReady(rawUrl, provider) {
        const base = rawUrl.replace(/\/+$/, '');
        this.tunnelUrl = `${base}/controller`;
        this.tunnelHelperUrl = `${base}/helper`;
        this.tunnelStatus = 'active';
        this.provider = provider;

        try {
            this.tunnelQr = await qrcode.toDataURL(this.tunnelUrl, {
                width: 280,
                margin: 2,
                color: { dark: '#000000', light: '#ffffff' }
            });
            this.tunnelHelperQr = await qrcode.toDataURL(this.tunnelHelperUrl, {
                width: 280,
                margin: 2,
                color: { dark: '#000000', light: '#ffffff' }
            });
        } catch (e) {
            console.error('[TunnelManager] Lỗi tạo QR cho Live Tunnel:', e);
        }

        console.log(`================================================================`);
        console.log(`📱 TAY CẦM ĐIỆN THOẠI (SMARTPHONE CONTROLLER) SẴN SÀNG!`);
        console.log(`🌐 Live Tunnel Controller: ${this.tunnelUrl} (${provider})`);
        console.log(`🌐 Live Tunnel Helper:     ${this.tunnelHelperUrl} (${provider})`);
        console.log(`📶 Mạng Nội Bộ Controller: ${this.localUrl}`);
        console.log(`📶 Mạng Nội Bộ Helper:     ${this.localHelperUrl}`);
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
            provider: this.provider,
            tunnelUrl: this.tunnelUrl,
            tunnelQr: this.tunnelQr,
            localUrl: this.localUrl,
            localQr: this.localQr,
            tunnelHelperUrl: this.tunnelHelperUrl,
            tunnelHelperQr: this.tunnelHelperQr,
            localHelperUrl: this.localHelperUrl,
            localHelperQr: this.localHelperQr,
            localIp: this.localIp,
            controllerCount: this.getControllerCount()
        };
    }

    destroy() {
        this.isDestroyed = true;
        if (this.reconnectTimer) {
            clearTimeout(this.reconnectTimer);
            this.reconnectTimer = null;
        }
        if (this.activeProcess) {
            try { this.activeProcess.kill(); } catch (e) {}
            this.activeProcess = null;
        }
        if (this.localtunnelInstance) {
            try { this.localtunnelInstance.close(); } catch (e) {}
            this.localtunnelInstance = null;
        }
    }
}

module.exports = TunnelManager;
