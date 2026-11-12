/**
 * Cursor & Particle Effects System (CursorFX)
 * - Tùy biến Con trỏ Pixel 16-bit sắc nét
 * - Vệt hạt lấp lánh (Sparkle Trail) khi di chuyển chuột
 * - Vụ nổ hạt Pixel rực rỡ (Click Burst) khi nhấp chuột
 * - Hỗ trợ hiệu ứng nổ hạt cho các sự kiện trong Game (Bắn Boss, Nhận Hoa,...)
 */

(function () {
    class CursorEffectsManager {
        constructor() {
            this.particles = [];
            this.canvas = null;
            this.ctx = null;
            this.width = window.innerWidth;
            this.height = window.innerHeight;
            this.isLoopRunning = false;

            this.lastMouseX = -100;
            this.lastMouseY = -100;
            this.moveDistance = 0;

            this.colors = [
                "#f1c40f", // Vàng ánh kim
                "#00d2d3", // Xanh ngọc Cyan
                "#ff7675", // Hồng thắm
                "#a29bfe", // Tím mộng mơ
                "#54a0ff", // Lam biếc
                "#2ecc71", // Lục bảo
                "#ffffff"  // Trắng tinh khôi
            ];

            this._initCanvas();
            this._applyCustomCursor();
            this._bindEvents();
        }

        _initCanvas() {
            this.canvas = document.createElement("canvas");
            this.canvas.id = "cursorFxCanvas";
            this.canvas.style.position = "fixed";
            this.canvas.style.top = "0";
            this.canvas.style.left = "0";
            this.canvas.style.width = "100vw";
            this.canvas.style.height = "100vh";
            this.canvas.style.pointerEvents = "none";
            this.canvas.style.zIndex = "999999";
            document.body.appendChild(this.canvas);

            this.ctx = this.canvas.getContext("2d");
            this._resize();
            window.addEventListener("resize", () => this._resize());
        }

        _resize() {
            this.width = window.innerWidth;
            this.height = window.innerHeight;
            this.canvas.width = this.width;
            this.canvas.height = this.height;
        }

        // Tạo con trỏ chuột Pixel Art 16-bit thanh kiếm bạc viền đen chuôi vàng
        _applyCustomCursor() {
            const cursorCanvas = document.createElement("canvas");
            cursorCanvas.width = 32;
            cursorCanvas.height = 32;
            const c = cursorCanvas.getContext("2d");

            // Mũi kiếm bạc pixel 16-bit
            // Viền ngoài đen đậm
            c.fillStyle = "#000000";
            c.fillRect(0, 0, 3, 3);
            c.fillRect(1, 2, 4, 3);
            c.fillRect(3, 4, 4, 3);
            c.fillRect(5, 6, 4, 3);
            c.fillRect(7, 8, 4, 3);
            c.fillRect(9, 10, 4, 3);
            c.fillRect(11, 12, 4, 3);
            c.fillRect(13, 14, 4, 3);

            // Cán & Chắn kiếm
            c.fillRect(7, 15, 6, 3);
            c.fillRect(13, 9, 3, 6);
            c.fillRect(14, 16, 4, 4);
            c.fillRect(17, 19, 4, 4);

            // Thân lưỡi kiếm bạc sáng & trắng highlight
            c.fillStyle = "#ffffff";
            c.fillRect(1, 1, 2, 2);
            c.fillRect(3, 3, 2, 2);
            c.fillRect(5, 5, 2, 2);
            c.fillRect(7, 7, 2, 2);
            c.fillRect(9, 9, 2, 2);
            c.fillRect(11, 11, 2, 2);

            c.fillStyle = "#dfe4ea";
            c.fillRect(2, 3, 2, 2);
            c.fillRect(4, 5, 2, 2);
            c.fillRect(6, 7, 2, 2);
            c.fillRect(8, 9, 2, 2);
            c.fillRect(10, 11, 2, 2);
            c.fillRect(12, 13, 2, 2);

            // Chắn kiếm vàng
            c.fillStyle = "#f1c40f";
            c.fillRect(8, 14, 4, 2);
            c.fillRect(14, 8, 2, 4);

            // Chuôi kiếm gỗ nâu & ngọc chuôi
            c.fillStyle = "#795548";
            c.fillRect(15, 17, 2, 2);
            c.fillStyle = "#00d2d3";
            c.fillRect(18, 20, 2, 2);

            const cursorData = cursorCanvas.toDataURL("image/png");

            // Áp dụng con trỏ vào CSS
            const style = document.createElement("style");
            style.innerHTML = `
                body, html, * {
                    cursor: url('${cursorData}') 1 1, auto !important;
                }
                button, .arcade-btn, select, a, input {
                    cursor: url('${cursorData}') 1 1, pointer !important;
                }
            `;
            document.head.appendChild(style);
        }

        _bindEvents() {
            // Vệt lấp lánh khi di chuột
            window.addEventListener("mousemove", (e) => {
                const dx = e.clientX - this.lastMouseX;
                const dy = e.clientY - this.lastMouseY;
                const dist = Math.hypot(dx, dy);

                this.moveDistance += dist;
                this.lastMouseX = e.clientX;
                this.lastMouseY = e.clientY;

                if (this.moveDistance > 12) {
                    this.moveDistance = 0;
                    this._spawnTrail(e.clientX, e.clientY);
                }
            });

            // Vụ nổ hạt khi nhấp chuột
            window.addEventListener("mousedown", (e) => {
                this.burst(e.clientX, e.clientY, 18);
            });
        }

        _spawnTrail(x, y) {
            const count = 2;
            for (let i = 0; i < count; i++) {
                this.particles.push({
                    x: x + (Math.random() - 0.5) * 6,
                    y: y + (Math.random() - 0.5) * 6,
                    vx: (Math.random() - 0.5) * 1.2,
                    vy: (Math.random() - 0.5) * 1.2 - 0.3,
                    size: 3 + Math.random() * 3,
                    color: this.colors[Math.floor(Math.random() * this.colors.length)],
                    alpha: 1.0,
                    life: 0,
                    maxLife: 0.35 + Math.random() * 0.25,
                    shape: Math.random() > 0.4 ? "star" : "square"
                });
            }
            this._startLoop();
        }

        // Tạo vụ nổ hạt pixel (dùng được ở bất kỳ vị trí màn hình)
        burst(x, y, count = 16, customColors = null) {
            const palette = customColors || this.colors;
            for (let i = 0; i < count; i++) {
                const angle = (Math.PI * 2 * i) / count + (Math.random() - 0.5) * 0.5;
                const speed = 1.8 + Math.random() * 4.2;
                this.particles.push({
                    x: x,
                    y: y,
                    vx: Math.cos(angle) * speed,
                    vy: Math.sin(angle) * speed - 1.2,
                    gravity: 0.12,
                    size: 3.5 + Math.random() * 3.5,
                    color: palette[Math.floor(Math.random() * palette.length)],
                    alpha: 1.0,
                    life: 0,
                    maxLife: 0.45 + Math.random() * 0.35,
                    shape: Math.random() > 0.3 ? "star" : "square"
                });
            }
            this._startLoop();
        }

        _startLoop() {
            if (!this.isLoopRunning) {
                this.isLoopRunning = true;
                requestAnimationFrame(() => this._loop());
            }
        }

        _loop() {
            if (this.particles.length === 0) {
                this.ctx.clearRect(0, 0, this.width, this.height);
                this.isLoopRunning = false;
                return;
            }

            this.ctx.clearRect(0, 0, this.width, this.height);

            const dt = 0.016;
            for (let i = this.particles.length - 1; i >= 0; i--) {
                const p = this.particles[i];
                p.life += dt;
                if (p.life >= p.maxLife) {
                    this.particles.splice(i, 1);
                    continue;
                }

                p.x += p.vx;
                p.y += p.vy;
                if (p.gravity) {
                    p.vy += p.gravity;
                }

                const progress = p.life / p.maxLife;
                p.alpha = 1.0 - progress;
                const curSize = p.size * (1.0 - progress * 0.4);

                this.ctx.save();
                this.ctx.globalAlpha = Math.max(0, p.alpha);
                this.ctx.fillStyle = p.color;

                if (p.shape === "star") {
                    // Vẽ ngôi sao pixel 4 cánh
                    const half = curSize * 0.5;
                    this.ctx.fillRect(p.x - half, p.y - curSize, curSize, curSize * 2);
                    this.ctx.fillRect(p.x - curSize, p.y - half, curSize * 2, curSize);
                    this.ctx.fillStyle = "#ffffff";
                    this.ctx.fillRect(p.x - half * 0.5, p.y - half * 0.5, curSize * 0.5, curSize * 0.5);
                } else {
                    // Vẽ hạt vuông pixel
                    this.ctx.fillRect(p.x - curSize / 2, p.y - curSize / 2, curSize, curSize);
                }
                this.ctx.restore();
            }

            requestAnimationFrame(() => this._loop());
        }
    }

    window.CursorFX = new CursorEffectsManager();
})();
