/**
 * Hệ thống Hiệu ứng Thời tiết Động (Dynamic Weather System)
 * Tự động tạo và điều khiển:
 *  - NẮNG (Sunny): Vệt nắng vàng rực rỡ, lấp lánh ánh kim, tán lá rạng rỡ, biển sóng sánh ánh dương.
 *  - MƯA RƠI (Rain): Hạt mưa bay nghiêng theo gió, sóng gợn vỡ hạt nước, chớp giật sấm sét, cây lay động mạnh.
 *  - TUYẾT RƠI (Snow): Bông tuyết xoay tròn lơ lửng, tuyết đọng trắng xóa trên tán cây và mặt đất, sương giá.
 * TỰ ĐỘNG THAY ĐỔI THEO THỜI GIAN & Tác động tương hỗ trực tiếp lên Cây cối, Mặt biển, Mây trời và Vệ Binh.
 */

class WeatherSystem {
    constructor() {
        // Trạng thái: 'SUNNY' | 'RAIN' | 'SNOW'
        this.currentType = 'SUNNY';
        this.wind = 1.0;
        this.lightningTimer = 0;
        this.lightningFlash = 0;

        // Tự động chuyển đổi thời tiết ngẫu nhiên sau một khoảng thời gian
        this.autoCycle = true;
        this.cycleTimer = 0;
        this.cycleDuration = 22; // 22 giây tự động đổi thời tiết một lần
        this.onWeatherChange = null; // Callback thông báo cho Game & UI

        // Các hạt thời tiết
        this.rainDrops = [];
        this.snowFlakes = [];
        this.ripples = [];
        this.sunRays = [];

        this._initWeatherParticles();
    }

    _initWeatherParticles() {
        // Hạt mưa
        this.rainDrops = [];
        for (let i = 0; i < 90; i++) {
            this.rainDrops.push({
                x: Math.random() * 1400 - 100,
                y: Math.random() * 800 - 100,
                speed: 16 + Math.random() * 10,
                length: 12 + Math.random() * 10,
                alpha: 0.4 + Math.random() * 0.4
            });
        }

        // Bông tuyết
        this.snowFlakes = [];
        for (let i = 0; i < 80; i++) {
            this.snowFlakes.push({
                x: Math.random() * 1350 - 50,
                y: Math.random() * 750,
                size: 2 + Math.random() * 3.5,
                speedY: 1.2 + Math.random() * 2.0,
                wobbleSpeed: 2 + Math.random() * 3,
                wobbleAmp: 1.5 + Math.random() * 2.5,
                seed: Math.random() * 10,
                alpha: 0.6 + Math.random() * 0.4
            });
        }

        // Vệt nắng vàng
        this.sunRays = [];
        for (let i = 0; i < 5; i++) {
            this.sunRays.push({
                x: i * 280 + 40,
                width: 70 + Math.random() * 60,
                alpha: 0.12 + Math.random() * 0.1
            });
        }
    }

    setWeather(type, notify = true) {
        if (['SUNNY', 'RAIN', 'SNOW'].includes(type)) {
            this.currentType = type;
            this.cycleTimer = 0; // Reset đếm ngược

            if (type === 'RAIN') this.wind = 2.5;
            else if (type === 'SNOW') this.wind = 0.8;
            else this.wind = 1.0;

            if (notify && typeof this.onWeatherChange === 'function') {
                this.onWeatherChange(this.currentType);
            }
        }
    }

    // Chuyển sang thời tiết tiếp theo (Nắng -> Mưa -> Tuyết -> Nắng)
    toggleWeather() {
        if (this.currentType === 'SUNNY') this.setWeather('RAIN');
        else if (this.currentType === 'RAIN') this.setWeather('SNOW');
        else this.setWeather('SUNNY');
        return this.currentType;
    }

    // Chọn ngẫu nhiên một thời tiết khác với thời tiết hiện tại
    randomizeWeather() {
        const types = ['SUNNY', 'RAIN', 'SNOW'].filter(t => t !== this.currentType);
        const next = types[Math.floor(Math.random() * types.length)];
        this.setWeather(next);
        return next;
    }

    update(dt, w, h) {
        // Tự động chuyển đổi thời tiết định kỳ
        if (this.autoCycle) {
            this.cycleTimer += dt;
            if (this.cycleTimer >= this.cycleDuration) {
                this.randomizeWeather();
            }
        }

        // Cập nhật hạt mưa
        if (this.currentType === 'RAIN') {
            const windShift = this.wind * 4;
            this.rainDrops.forEach(r => {
                r.y += r.speed;
                r.x += windShift;

                if (r.y > h - 70) {
                    if (Math.random() > 0.6 && this.ripples.length < 25) {
                        this.ripples.push({
                            x: r.x,
                            y: h - 75 + Math.random() * 20,
                            radius: 1,
                            maxRadius: 6 + Math.random() * 8,
                            alpha: 0.7
                        });
                    }
                    r.y = -20;
                    r.x = Math.random() * (w + 200) - 100;
                }
            });

            this.lightningTimer += dt;
            if (this.lightningTimer > 7 && Math.random() < 0.02) {
                this.lightningFlash = 0.8;
                this.lightningTimer = 0;
            }
            if (this.lightningFlash > 0) {
                this.lightningFlash -= dt * 2.5;
            }
        }

        // Cập nhật bông tuyết
        if (this.currentType === 'SNOW') {
            const time = performance.now() / 1000;
            this.snowFlakes.forEach(s => {
                s.y += s.speedY;
                s.x += Math.sin(time * s.wobbleSpeed + s.seed) * s.wobbleAmp + this.wind * 0.8;

                if (s.y > h - 50) {
                    s.y = -10;
                    s.x = Math.random() * (w + 100) - 50;
                }
            });
        }

        // Cập nhật gợn sóng vỡ hạt nước
        for (let i = this.ripples.length - 1; i >= 0; i--) {
            const rip = this.ripples[i];
            rip.radius += dt * 18;
            rip.alpha -= dt * 1.5;
            if (rip.alpha <= 0 || rip.radius >= rip.maxRadius) {
                this.ripples.splice(i, 1);
            }
        }
    }

    renderOverlay(ctx, w, h, time) {
        if (this.currentType === 'RAIN') {
            this._renderRain(ctx, w, h);
        } else if (this.currentType === 'SNOW') {
            this._renderSnow(ctx, w, h);
        } else if (this.currentType === 'SUNNY') {
            this._renderSun(ctx, w, h, time);
        }
    }

    _renderRain(ctx, w, h) {
        ctx.save();

        if (this.lightningFlash > 0) {
            ctx.fillStyle = `rgba(235, 240, 255, ${this.lightningFlash * 0.4})`;
            ctx.fillRect(0, 0, w, h);
        }

        ctx.strokeStyle = "rgba(180, 220, 255, 0.65)";
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        const windShift = this.wind * 4;
        this.rainDrops.forEach(r => {
            ctx.moveTo(r.x, r.y);
            ctx.lineTo(r.x - windShift * 0.8, r.y + r.length);
        });
        ctx.stroke();

        this.ripples.forEach(rip => {
            ctx.strokeStyle = `rgba(200, 230, 255, ${rip.alpha})`;
            ctx.lineWidth = 1.2;
            ctx.beginPath();
            ctx.ellipse(rip.x, rip.y, rip.radius, rip.radius * 0.4, 0, 0, Math.PI * 2);
            ctx.stroke();
        });

        ctx.restore();
    }

    _renderSnow(ctx, w, h) {
        ctx.save();
        this.snowFlakes.forEach(s => {
            ctx.fillStyle = `rgba(255, 255, 255, ${s.alpha})`;
            ctx.fillRect(s.x, s.y, s.size, s.size);
        });

        const frostGrad = ctx.createLinearGradient(0, h - 80, 0, h);
        frostGrad.addColorStop(0, "rgba(223, 249, 251, 0)");
        frostGrad.addColorStop(1, "rgba(223, 249, 251, 0.25)");
        ctx.fillStyle = frostGrad;
        ctx.fillRect(0, h - 80, w, 80);

        ctx.restore();
    }

    _renderSun(ctx, w, h, time) {
        ctx.save();

        this.sunRays.forEach((ray, idx) => {
            const sway = Math.sin(time * 0.8 + idx) * 30;
            const grad = ctx.createLinearGradient(ray.x + sway, 0, ray.x + sway + 100, h);
            grad.addColorStop(0, `rgba(255, 234, 167, ${ray.alpha * 1.5})`);
            grad.addColorStop(0.5, `rgba(255, 242, 0, ${ray.alpha * 0.8})`);
            grad.addColorStop(1, "rgba(255, 255, 255, 0)");

            ctx.fillStyle = grad;
            ctx.beginPath();
            ctx.moveTo(ray.x + sway, 0);
            ctx.lineTo(ray.x + sway + ray.width, 0);
            ctx.lineTo(ray.x + sway + ray.width + 120, h);
            ctx.lineTo(ray.x + sway + 20, h);
            ctx.closePath();
            ctx.fill();
        });

        for (let i = 0; i < 12; i++) {
            const px = ((i * 120 + time * 20) % w);
            const py = (h * 0.3) + Math.sin(time + i) * 100;
            ctx.fillStyle = "rgba(255, 242, 0, 0.4)";
            ctx.fillRect(px, py, 3, 3);
        }

        ctx.restore();
    }
}

window.WeatherSystem = new WeatherSystem();
