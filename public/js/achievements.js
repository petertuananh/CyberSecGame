/**
 * achievements.js - Hệ thống Thành Tựu, Hiệu ứng Rồng Bay Phượng Múa & Cấp Giấy Chứng Nhận
 * Dành cho game Vệ Binh Mật Khẩu (CyberSec Password Guardian)
 */

(function () {
    // ========================================================
    // 1. ĐỊNH NGHĨA THÀNH TỰU (ACHIEVEMENTS SYSTEM)
    // ========================================================
    const ACHIEVEMENTS_DEF = [
        {
            id: "the_flash",
            title: "The Flash",
            titleVi: "Tốc Độ Sấm Sét",
            description: "Hoàn thành toàn bộ trò chơi trong thời gian dưới 3 phút (< 180s).",
            conditionDesc: "Hoàn thành game < 3 phút",
            icon: "flash",
            image: "images/flash.png",
            color: "#f1c40f",
            bgGradient: ["#f39c12", "#e67e22"],
            tag: "⚡ THẦN TỐC",
            targetDesc: "< 180 giây"
        },
        {
            id: "kratos",
            title: "Kratos",
            titleVi: "Chiến Thần Đồ Long",
            description: "Tiêu diệt Boss Rồng Hắc Ám trong thời gian chớp nhoáng dưới 20 giây (< 20s).",
            conditionDesc: "Đánh boss rồng < 20 giây",
            icon: "kratos",
            image: "images/trophy_kratos.jpg",
            color: "#e74c3c",
            bgGradient: ["#c0392b", "#8e44ad"],
            tag: "⚔️ CHIẾN THẦN",
            targetDesc: "< 20 giây"
        },
        {
            id: "loser",
            title: "Loser",
            titleVi: "Thánh Đoán Sai",
            description: "Trả lời sai toàn bộ cả 3 câu hỏi trong cùng một ải thử thách.",
            conditionDesc: "Sai hết cả 3 câu trong 1 ải",
            icon: "loser",
            image: "images/loser.png",
            color: "#a855f7",
            bgGradient: ["#8e44ad", "#2c3e50"],
            tag: "🤡 HÀI HƯỚC",
            targetDesc: "Sai 3/3 câu"
        }
    ];

    class AchievementManager {
        constructor() {
            this.storageKey = "cybersec_achievements_v2";
            this.data = this._load();
            this.toasts = []; // Hàng đợi thông báo mở khóa
            this.images = {
                the_flash: new Image(),
                kratos: new Image(),
                loser: new Image()
            };
            this.images.the_flash.src = "images/flash.png";
            this.images.kratos.src = "images/trophy_kratos.jpg";
            this.images.loser.src = "images/loser.png";
        }

        _load() {
            let saved = {};
            try {
                const raw = localStorage.getItem(this.storageKey);
                if (raw) saved = JSON.parse(raw);
            } catch (e) {
                console.warn("[Achievements] Lỗi nạp dữ liệu:", e);
            }

            const state = {};
            ACHIEVEMENTS_DEF.forEach(def => {
                const s = saved[def.id] || {};
                state[def.id] = {
                    ...def,
                    unlocked: !!s.unlocked,
                    unlockedAt: s.unlockedAt || null,
                    record: s.record || null, // e.g. "02:14" hoặc "14.2s" hoặc "Ải 1"
                    meta: s.meta || {}
                };
            });
            return state;
        }

        _save() {
            try {
                const toSave = {};
                Object.keys(this.data).forEach(id => {
                    const item = this.data[id];
                    toSave[id] = {
                        unlocked: item.unlocked,
                        unlockedAt: item.unlockedAt,
                        record: item.record,
                        meta: item.meta
                    };
                });
                localStorage.setItem(this.storageKey, JSON.stringify(toSave));
            } catch (e) {
                console.warn("[Achievements] Lỗi lưu:", e);
            }
        }

        getAll() {
            return Object.values(this.data);
        }

        get(id) {
            return this.data[id] || null;
        }

        isUnlocked(id) {
            return !!(this.data[id] && this.data[id].unlocked);
        }

        getUnlockedCount() {
            return Object.values(this.data).filter(a => a.unlocked).length;
        }

        unlock(id, record = null, meta = {}) {
            const item = this.data[id];
            if (!item) return false;

            const wasUnlocked = item.unlocked;
            item.unlocked = true;
            if (!item.unlockedAt) {
                item.unlockedAt = Date.now();
            }
            if (record) {
                item.record = record;
            }
            item.meta = { ...item.meta, ...meta };
            this._save();

            // Nếu vừa mới mở khóa lần đầu, hiển thị Toast Banner và phát âm thanh
            if (!wasUnlocked) {
                this.toasts.push({
                    id: item.id,
                    title: item.title,
                    titleVi: item.titleVi,
                    desc: item.conditionDesc,
                    icon: item.icon,
                    color: item.color,
                    timer: 4.5,
                    maxTimer: 4.5
                });

                if (window.SoundEngine && window.SoundEngine.achievement) {
                    window.SoundEngine.achievement();
                } else if (window.SoundEngine && window.SoundEngine.play) {
                    window.SoundEngine.play("victory");
                }

                if (window.CursorFX && window.CursorFX.burst) {
                    window.CursorFX.burst(640, 70, 30);
                }
                return true;
            }
            return false;
        }

        updateToasts(dt) {
            for (let i = this.toasts.length - 1; i >= 0; i--) {
                const t = this.toasts[i];
                t.timer -= dt;
                if (t.timer <= 0) {
                    this.toasts.splice(i, 1);
                }
            }
        }

        renderToast(ctx, w, h) {
            if (this.toasts.length === 0) return;
            const t = this.toasts[0];
            const p = t.timer / t.maxTimer; // 1 -> 0

            // Hiệu ứng trượt xuống từ trên đỉnh
            let slideY = 20;
            let alpha = 1;
            if (p > 0.85) {
                const enter = (1 - p) / 0.15; // 0 -> 1
                slideY = -60 + enter * 80;
                alpha = enter;
            } else if (p < 0.15) {
                alpha = p / 0.15;
            }

            ctx.save();
            ctx.globalAlpha = Math.max(0, Math.min(1, alpha));

            const toastW = 460;
            const toastH = 74;
            const toastX = (w - toastW) / 2;
            const toastY = slideY;

            // Nền hộp thông báo kim loại vàng/tím huyền ảo
            const grad = ctx.createLinearGradient(toastX, toastY, toastX + toastW, toastY);
            grad.addColorStop(0, "rgba(24, 16, 45, 0.96)");
            grad.addColorStop(0.5, "rgba(42, 28, 77, 0.96)");
            grad.addColorStop(1, "rgba(24, 16, 45, 0.96)");
            ctx.fillStyle = grad;
            ctx.fillRect(toastX, toastY, toastW, toastH);

            // Viền phát sáng hoàng kim
            ctx.strokeStyle = t.color || "#f1c40f";
            ctx.lineWidth = 3;
            ctx.shadowColor = t.color || "#f1c40f";
            ctx.shadowBlur = 15;
            ctx.strokeRect(toastX, toastY, toastW, toastH);
            ctx.shadowBlur = 0;

            // Icon thành tựu
            window.PixelSprites.drawPixelIcon(ctx, t.icon || "star", toastX + 16, toastY + 17, 40);

            // Nội dung thông báo
            ctx.textAlign = "left";
            ctx.fillStyle = "#f1c40f";
            ctx.font = "bold 13px 'Press Start 2P', monospace, sans-serif";
            ctx.fillText("🏆 MỞ KHÓA THÀNH TỰU!", toastX + 70, toastY + 28);

            ctx.fillStyle = "#ffffff";
            ctx.font = "bold 18px 'Segoe UI', Tahoma, sans-serif";
            ctx.fillText(`"${t.title}" - ${t.titleVi}`, toastX + 70, toastY + 49);

            ctx.fillStyle = "#ced6e0";
            ctx.font = "italic 13px 'Segoe UI', Tahoma, sans-serif";
            ctx.fillText(t.desc, toastX + 70, toastY + 66);

            ctx.restore();
        }
    }

    // ========================================================
    // 2. HIỆU ỨNG RỒNG BAY PHƯỢNG MÚA (LONG PHƯỢNG KỲ BẢO FX)
    // ========================================================
    class LongPhuongFX {
        constructor() {
            this.time = 0;
            // Dragon segments (22 đốt thân uốn lượn)
            this.dragonSegments = [];
            for (let i = 0; i < 22; i++) {
                this.dragonSegments.push({ x: 640, y: 300, angle: 0 });
            }
            // Phoenix trail (14 đốt theo sau phượng)
            this.phoenixTrail = [];
            for (let i = 0; i < 14; i++) {
                this.phoenixTrail.push({ x: 640, y: 300, angle: 0 });
            }
            this.particles = [];
            this.godRayAngle = 0;
        }

        update(dt, w, h) {
            this.time += dt;
            const t = this.time;
            this.godRayAngle += dt * 0.1;

            // 1. Quỹ đạo Thần Long (Celestial Azure Dragon)
            // Bay lượn theo đường cong Lissajous hình số 8 vô cực uyển chuyển
            const dX = w / 2 + Math.sin(t * 0.65) * (w * 0.40);
            const dY = h * 0.30 + Math.sin(t * 1.30) * (h * 0.20);

            const prevHead = this.dragonSegments[0];
            const ddx = dX - prevHead.x;
            const ddy = dY - prevHead.y;
            const headAngle = Math.atan2(ddy, ddx);
            this.dragonSegments[0] = { x: dX, y: dY, angle: headAngle };

            // Liên kết khoảng cách giữa các đốt rồng
            const segDist = 20;
            for (let i = 1; i < this.dragonSegments.length; i++) {
                const leader = this.dragonSegments[i - 1];
                const follower = this.dragonSegments[i];
                const diffX = follower.x - leader.x;
                const diffY = follower.y - leader.y;
                const dist = Math.hypot(diffX, diffY) || 1;
                follower.x = leader.x + (diffX / dist) * segDist;
                follower.y = leader.y + (diffY / dist) * segDist;
                follower.angle = Math.atan2(-diffY, -diffX);
            }

            // Hơi thở rồng phun bụi sao & lửa lam
            if (Math.random() < 0.65) {
                this.particles.push({
                    x: dX + Math.cos(headAngle) * 32,
                    y: dY + Math.sin(headAngle) * 32,
                    vx: Math.cos(headAngle + (Math.random() - 0.5) * 0.6) * (40 + Math.random() * 50),
                    vy: Math.sin(headAngle + (Math.random() - 0.5) * 0.6) * (40 + Math.random() * 50),
                    life: 1.0,
                    maxLife: 1.0,
                    size: 2.5 + Math.random() * 4,
                    color: Math.random() > 0.4 ? "#00d2d3" : "#f1c40f"
                });
            }

            // 2. Quỹ đạo Phượng Hoàng Múa (Dancing Vermilion Phoenix)
            // Lượn đối xứng, vút lên và xoay vòng lộng lẫy
            const pX = w / 2 - Math.sin(t * 0.60 + 1.4) * (w * 0.38);
            const pY = h * 0.32 + Math.cos(t * 1.15 + 0.7) * (h * 0.22);

            const prevPhoenix = this.phoenixTrail[0];
            const pddx = pX - prevPhoenix.x;
            const pddy = pY - prevPhoenix.y;
            const pAngle = Math.atan2(pddy, pddx);
            this.phoenixTrail[0] = { x: pX, y: pY, angle: pAngle };

            const pSegDist = 18;
            for (let i = 1; i < this.phoenixTrail.length; i++) {
                const leader = this.phoenixTrail[i - 1];
                const follower = this.phoenixTrail[i];
                const diffX = follower.x - leader.x;
                const diffY = follower.y - leader.y;
                const dist = Math.hypot(diffX, diffY) || 1;
                follower.x = leader.x + (diffX / dist) * pSegDist;
                follower.y = leader.y + (diffY / dist) * pSegDist;
                follower.angle = Math.atan2(-diffY, -diffX);
            }

            // Phượng hoàng tỏa tàn lửa & lông vũ hoàng kim
            if (Math.random() < 0.75) {
                this.particles.push({
                    x: pX + (Math.random() - 0.5) * 24,
                    y: pY + (Math.random() - 0.5) * 24,
                    vx: (Math.random() - 0.5) * 35,
                    vy: Math.random() * 40 + 15,
                    life: 1.2,
                    maxLife: 1.2,
                    size: 2 + Math.random() * 4.5,
                    color: Math.random() > 0.45 ? "#ff4757" : (Math.random() > 0.5 ? "#ffa502" : "#f1c40f")
                });
            }

            // Cập nhật hạt bụi thần thoại
            for (let i = this.particles.length - 1; i >= 0; i--) {
                const p = this.particles[i];
                p.x += p.vx * dt;
                p.y += p.vy * dt;
                p.life -= dt;
                if (p.life <= 0) {
                    this.particles.splice(i, 1);
                }
            }
        }

        render(ctx, w, h) {
            ctx.save();

            // 1. Tia sáng hào quang Thiên Giới (Celestial God Rays)
            ctx.save();
            ctx.globalAlpha = 0.12;
            const rayCount = 10;
            const rayCenterX = w / 2;
            const rayCenterY = -50;
            for (let i = 0; i < rayCount; i++) {
                const angle = this.godRayAngle + (i * Math.PI * 2) / rayCount;
                ctx.fillStyle = "#f1c40f";
                ctx.beginPath();
                ctx.moveTo(rayCenterX, rayCenterY);
                ctx.lineTo(rayCenterX + Math.cos(angle - 0.12) * 1400, rayCenterY + Math.sin(angle - 0.12) * 1400);
                ctx.lineTo(rayCenterX + Math.cos(angle + 0.12) * 1400, rayCenterY + Math.sin(angle + 0.12) * 1400);
                ctx.closePath();
                ctx.fill();
            }
            ctx.restore();

            // 2. Vẽ các hạt bụi thần tiên (Sparkles & Embers)
            this.particles.forEach(p => {
                const alpha = Math.max(0, p.life / p.maxLife);
                ctx.fillStyle = p.color;
                ctx.globalAlpha = alpha;
                ctx.shadowColor = p.color;
                ctx.shadowBlur = 8;
                ctx.fillRect(p.x - p.size / 2, p.y - p.size / 2, p.size, p.size);
            });
            ctx.shadowBlur = 0;
            ctx.globalAlpha = 1.0;

            // 3. VẼ THẦN LONG (CELESTIAL DRAGON)
            this._renderDragon(ctx);

            // 4. VẼ PHƯỢNG HOÀNG (DANCING PHOENIX)
            this._renderPhoenix(ctx);

            ctx.restore();
        }

        _renderDragon(ctx) {
            const segs = this.dragonSegments;
            if (segs.length === 0) return;

            // Vẽ từ đuôi đến đầu để đầu rồng nằm trên cùng
            for (let i = segs.length - 1; i >= 1; i--) {
                const seg = segs[i];
                const radius = 18 - (i / segs.length) * 10; // Đốt to dần từ đuôi về ngực
                const waveOffset = Math.sin(this.time * 6 + i * 0.4) * 4;

                ctx.save();
                ctx.translate(seg.x, seg.y);
                ctx.rotate(seg.angle);

                // Gai lưng vảy rồng hoàng kim
                ctx.fillStyle = "#f1c40f";
                ctx.beginPath();
                ctx.moveTo(0, -radius - 8);
                ctx.lineTo(-6, -radius + 2);
                ctx.lineTo(6, -radius + 2);
                ctx.closePath();
                ctx.fill();

                // Thân rồng chuyển sắc Lam ngọc & Hoàng kim
                const segGrad = ctx.createRadialGradient(0, waveOffset, 2, 0, 0, radius);
                segGrad.addColorStop(0, "#00d2d3");
                segGrad.addColorStop(0.6, "#0984e3");
                segGrad.addColorStop(1, "#1e3799");
                ctx.fillStyle = segGrad;
                ctx.beginPath();
                ctx.ellipse(0, waveOffset, radius * 1.2, radius, 0, 0, Math.PI * 2);
                ctx.fill();

                // Vảy rồng pixel lấp lánh
                ctx.fillStyle = "#f1c40f";
                ctx.fillRect(-2, waveOffset - 2, 4, 3);

                // 4 Móng vuốt rồng tại đốt 5 và đốt 14
                if (i === 5 || i === 14) {
                    this._drawDragonClaw(ctx, -radius - 4, -8, -1);
                    this._drawDragonClaw(ctx, -radius - 4, 8, 1);
                }

                ctx.restore();
            }

            // Đuôi rồng với vây đuôi phát sáng xòe rộng
            const tail = segs[segs.length - 1];
            ctx.save();
            ctx.translate(tail.x, tail.y);
            ctx.rotate(tail.angle);
            ctx.fillStyle = "#00d2d3";
            ctx.beginPath();
            ctx.moveTo(0, 0);
            ctx.lineTo(-24, -14);
            ctx.lineTo(-18, 0);
            ctx.lineTo(-24, 14);
            ctx.closePath();
            ctx.fill();
            ctx.fillStyle = "#f1c40f";
            ctx.fillRect(-15, -4, 10, 8);
            ctx.restore();

            // ĐẦU RỒNG HOÀNG KIM (DRAGON HEAD)
            const head = segs[0];
            ctx.save();
            ctx.translate(head.x, head.y);
            ctx.rotate(head.angle);

            // Bờm rồng xanh biếc uốn lượn
            ctx.fillStyle = "#00d2d3";
            ctx.beginPath();
            ctx.moveTo(-16, -18);
            ctx.lineTo(-32, -26);
            ctx.lineTo(-24, -10);
            ctx.lineTo(-36, 0);
            ctx.lineTo(-24, 10);
            ctx.lineTo(-32, 26);
            ctx.lineTo(-16, 18);
            ctx.closePath();
            ctx.fill();

            // Hộp sọ rồng
            ctx.fillStyle = "#0984e3";
            ctx.fillRect(-16, -12, 32, 24);
            ctx.fillStyle = "#00d2d3";
            ctx.fillRect(4, -8, 20, 16); // Mõm rồng

            // Sừng rồng hoàng gia vàng rực
            ctx.fillStyle = "#f1c40f";
            // Sừng trên
            ctx.beginPath();
            ctx.moveTo(-4, -12);
            ctx.lineTo(-12, -28);
            ctx.lineTo(-6, -28);
            ctx.lineTo(2, -12);
            ctx.closePath();
            ctx.fill();
            // Nhánh sừng nhỏ
            ctx.fillRect(-8, -22, 6, 3);

            // Mắt rồng đỏ rực lửa & sáng chói
            ctx.fillStyle = "#e74c3c";
            ctx.fillRect(0, -9, 8, 6);
            ctx.fillStyle = "#f1c40f";
            ctx.fillRect(3, -8, 4, 4);
            ctx.fillStyle = "#ffffff";
            ctx.fillRect(4, -7, 2, 2);

            // Răng nanh trắng
            ctx.fillStyle = "#ffffff";
            ctx.fillRect(18, 5, 4, 5);
            ctx.fillRect(12, 5, 3, 4);

            // Râu rồng dài uốn lượn như lụa mềm
            const whiskerWave1 = Math.sin(this.time * 8) * 8;
            const whiskerWave2 = Math.cos(this.time * 8) * 8;
            ctx.strokeStyle = "#f1c40f";
            ctx.lineWidth = 2.5;
            ctx.beginPath();
            ctx.moveTo(14, -4);
            ctx.quadraticCurveTo(30, -18 + whiskerWave1, 48, -12 + whiskerWave2);
            ctx.stroke();

            ctx.beginPath();
            ctx.moveTo(14, 4);
            ctx.quadraticCurveTo(30, 18 + whiskerWave2, 48, 12 + whiskerWave1);
            ctx.stroke();

            ctx.restore();
        }

        _drawDragonClaw(ctx, x, y, dir) {
            ctx.save();
            ctx.fillStyle = "#0984e3";
            ctx.fillRect(x, y - 3, 14, 6);
            // 3 Móng vuốt ngà sắc nhọn
            ctx.fillStyle = "#ffffff";
            ctx.beginPath();
            ctx.moveTo(x + 14, y - 4 * dir);
            ctx.lineTo(x + 22, y - 2 * dir);
            ctx.lineTo(x + 14, y);
            ctx.lineTo(x + 22, y + 2 * dir);
            ctx.lineTo(x + 14, y + 4 * dir);
            ctx.closePath();
            ctx.fill();
            ctx.restore();
        }

        _renderPhoenix(ctx) {
            const trail = this.phoenixTrail;
            if (trail.length === 0) return;

            // 1. Vẽ 3 dải lông đuôi Phượng Hoàng uyển chuyển (Triple Phoenix Tail Ribbons)
            const tailBase = trail[trail.length - 1];
            ctx.save();
            ctx.translate(tailBase.x, tailBase.y);
            ctx.rotate(tailBase.angle);

            const colors = ["#ff4757", "#ffa502", "#f1c40f"];
            [-14, 0, 14].forEach((offsetY, idx) => {
                ctx.strokeStyle = colors[idx];
                ctx.lineWidth = 3.5;
                ctx.beginPath();
                ctx.moveTo(-10, offsetY * 0.4);

                let cx = -10;
                let cy = offsetY * 0.4;
                for (let step = 1; step <= 5; step++) {
                    const wave = Math.sin(this.time * 7 + step * 0.8 + idx) * 12;
                    cx -= 20;
                    cy += wave * 0.4;
                    ctx.lineTo(cx, cy);
                }
                ctx.stroke();

                // Hạt ngọc mắt phượng ở chóp đuôi lấp lánh (Peacock eye feather)
                ctx.fillStyle = "#f1c40f";
                ctx.beginPath();
                ctx.arc(cx, cy, 7, 0, Math.PI * 2);
                ctx.fill();
                ctx.fillStyle = "#2ed573";
                ctx.beginPath();
                ctx.arc(cx, cy, 4, 0, Math.PI * 2);
                ctx.fill();
                ctx.fillStyle = "#ffffff";
                ctx.fillRect(cx - 1, cy - 1, 2, 2);
            });
            ctx.restore();

            // 2. Thân & Cánh Phượng Hoàng đang múa
            const ph = trail[0];
            ctx.save();
            ctx.translate(ph.x, ph.y);
            ctx.rotate(ph.angle);

            // Nhịp vỗ cánh phượng hoàng (Flapping wing angle)
            const flap = Math.sin(this.time * 8.5) * 0.7;

            // Cánh trái
            this._drawPhoenixWing(ctx, 0, -10, -1, flap);
            // Cánh phải
            this._drawPhoenixWing(ctx, 0, 10, 1, -flap);

            // Thân phượng hoàng đỏ rực
            const bodyGrad = ctx.createLinearGradient(-15, 0, 20, 0);
            bodyGrad.addColorStop(0, "#c0392b");
            bodyGrad.addColorStop(0.5, "#e74c3c");
            bodyGrad.addColorStop(1, "#f39c12");
            ctx.fillStyle = bodyGrad;
            ctx.beginPath();
            ctx.ellipse(0, 0, 18, 9, 0, 0, Math.PI * 2);
            ctx.fill();

            // Đầu phượng hoàng kiêu hãnh
            ctx.fillStyle = "#f39c12";
            ctx.beginPath();
            ctx.arc(16, -2, 7, 0, Math.PI * 2);
            ctx.fill();

            // Mỏ phượng hoàng sắc bén vàng rực
            ctx.fillStyle = "#f1c40f";
            ctx.beginPath();
            ctx.moveTo(22, -4);
            ctx.lineTo(31, -1);
            ctx.lineTo(22, 2);
            ctx.closePath();
            ctx.fill();

            // Mắt phượng hoàng đen ánh ruby
            ctx.fillStyle = "#1e272e";
            ctx.fillRect(18, -4, 3, 3);
            ctx.fillStyle = "#ffffff";
            ctx.fillRect(19, -4, 1, 1);

            // Vương miện lông phượng hoàng (Crest)
            ctx.fillStyle = "#f1c40f";
            ctx.beginPath();
            ctx.moveTo(14, -8);
            ctx.lineTo(10, -22);
            ctx.lineTo(14, -18);
            ctx.lineTo(19, -24);
            ctx.lineTo(18, -8);
            ctx.closePath();
            ctx.fill();
            ctx.fillStyle = "#e74c3c";
            ctx.fillRect(9, -23, 3, 3);
            ctx.fillRect(18, -25, 3, 3);

            ctx.restore();
        }

        _drawPhoenixWing(ctx, x, y, dir, flapAngle) {
            ctx.save();
            ctx.translate(x, y);
            ctx.rotate(flapAngle * dir);

            // Tầng lông cánh thứ nhất (Đỏ thẫm)
            ctx.fillStyle = "#c0392b";
            ctx.beginPath();
            ctx.moveTo(-10, 0);
            ctx.lineTo(-24, 25 * dir);
            ctx.lineTo(-4, 45 * dir);
            ctx.lineTo(10, 32 * dir);
            ctx.lineTo(6, 0);
            ctx.closePath();
            ctx.fill();

            // Tầng lông cánh thứ hai (Cam lửa)
            ctx.fillStyle = "#e67e22";
            ctx.beginPath();
            ctx.moveTo(-6, 0);
            ctx.lineTo(-16, 22 * dir);
            ctx.lineTo(-2, 38 * dir);
            ctx.lineTo(8, 25 * dir);
            ctx.lineTo(4, 0);
            ctx.closePath();
            ctx.fill();

            // Tầng chóp cánh hoàng kim (Vàng óng)
            ctx.fillStyle = "#f1c40f";
            ctx.beginPath();
            ctx.moveTo(-2, 0);
            ctx.lineTo(-8, 16 * dir);
            ctx.lineTo(0, 28 * dir);
            ctx.lineTo(6, 18 * dir);
            ctx.lineTo(2, 0);
            ctx.closePath();
            ctx.fill();

            ctx.restore();
        }
    }

    // ========================================================
    // 3. HỆ THỐNG CẤP GIẤY CHỨNG NHẬN (CERTIFICATE GENERATOR)
    // ========================================================
    class CertificateGenerator {
        constructor(achievementMgr) {
            this.achievements = achievementMgr;
            this.logoNBK = new Image();
            this.logoNBK.src = "images/logo_nbk.png";
            this.logoSoftLab = new Image();
            this.logoSoftLab.src = "images/logo_softlab.png";
            this.trophyKratos = new Image();
            this.trophyKratos.src = "images/trophy_kratos.jpg";
            this.imgFlash = new Image();
            this.imgFlash.src = "images/flash.png";
            this.imgLoser = new Image();
            this.imgLoser.src = "images/loser.png";

            this.modalEl = null;
            this.canvasPreview = null;
            this.playerNameInput = null;
            this.currentStats = {
                playerName: "Hiệp Sĩ Không Gian Mạng",
                totalRoses: 9,
                totalDuration: 145, // giây
                bossDuration: 18.2,
                completedDate: new Date()
            };

            this._initDom();
        }

        _initDom() {
            window.addEventListener("DOMContentLoaded", () => {
                this.modalEl = document.getElementById("certModal");
                this.canvasPreview = document.getElementById("certCanvasPreview");
                this.playerNameInput = document.getElementById("certPlayerNameInput");

                const btnClose = document.getElementById("btnCloseCertModal");
                const btnCloseBtm = document.getElementById("btnCloseCertBottom");
                const btnDownload = document.getElementById("btnDownloadCertPng");
                const btnUpdate = document.getElementById("btnUpdateCertPreview");

                if (btnClose) btnClose.addEventListener("click", () => this.close());
                if (btnCloseBtm) btnCloseBtm.addEventListener("click", () => this.close());
                if (btnDownload) btnDownload.addEventListener("click", () => this.downloadPng());

                if (this.playerNameInput) {
                    this.playerNameInput.addEventListener("input", (e) => {
                        this.currentStats.playerName = e.target.value.trim() || "Hiệp Sĩ Không Gian Mạng";
                        this.renderPreview();
                    });
                }
                if (btnUpdate) {
                    btnUpdate.addEventListener("click", () => {
                        if (this.playerNameInput) {
                            this.currentStats.playerName = this.playerNameInput.value.trim() || "Hiệp Sĩ Không Gian Mạng";
                        }
                        this.renderPreview();
                    });
                }
            });
        }

        open(gameStats = {}) {
            if (gameStats) {
                this.currentStats = {
                    ...this.currentStats,
                    ...gameStats,
                    completedDate: new Date()
                };
            }
            if (this.playerNameInput && this.currentStats.playerName) {
                this.playerNameInput.value = this.currentStats.playerName;
            }
            if (this.modalEl) {
                this.modalEl.classList.remove("hidden");
                this.modalEl.classList.add("show");
            }
            setTimeout(() => this.renderPreview(), 60);
        }

        close() {
            if (this.modalEl) {
                this.modalEl.classList.remove("show");
                this.modalEl.classList.add("hidden");
            }
        }

        renderPreview() {
            if (!this.canvasPreview) return;
            const ctx = this.canvasPreview.getContext("2d");
            this.drawCertificate(ctx, this.canvasPreview.width, this.canvasPreview.height, this.currentStats);
        }

        drawCertificate(ctx, w, h, stats) {
            ctx.save();

            // 1. Nền giấy chứng nhận Hoàng gia cổ điển sang trọng (Royal Parchment Texture)
            const bgGrad = ctx.createLinearGradient(0, 0, w, h);
            bgGrad.addColorStop(0, "#fdfcf9");
            bgGrad.addColorStop(0.5, "#fbf6ec");
            bgGrad.addColorStop(1, "#f7eedb");
            ctx.fillStyle = bgGrad;
            ctx.fillRect(0, 0, w, h);

            // Hoa văn nền chìm an ninh mạng (Guilloche / Security Key Mesh watermark)
            ctx.save();
            ctx.globalAlpha = 0.035;
            ctx.strokeStyle = "#1e3799";
            ctx.lineWidth = 1;
            for (let i = 0; i < w; i += 28) {
                ctx.beginPath();
                ctx.moveTo(i, 0);
                ctx.lineTo(w - i, h);
                ctx.stroke();
            }
            ctx.restore();

            // 2. Viền đôi Hoàng kim sang trọng (Dual Golden Ornamental Border)
            const margin = 28;
            ctx.strokeStyle = "#b8860b";
            ctx.lineWidth = 6;
            ctx.strokeRect(margin, margin, w - margin * 2, h - margin * 2);

            ctx.strokeStyle = "#f1c40f";
            ctx.lineWidth = 2;
            ctx.strokeRect(margin + 7, margin + 7, w - (margin + 7) * 2, h - (margin + 7) * 2);

            // 4 Góc trang trí hoa văn cổ điển (Classical Corner Ornaments)
            this._drawCornerOrnament(ctx, margin + 12, margin + 12, 1, 1);
            this._drawCornerOrnament(ctx, w - margin - 12, margin + 12, -1, 1);
            this._drawCornerOrnament(ctx, margin + 12, h - margin - 12, 1, -1);
            this._drawCornerOrnament(ctx, w - margin - 12, h - margin - 12, -1, -1);

            // 3. TIÊU ĐỀ QUỐC GIA & ĐƠN VỊ ĐỒNG HÀNH
            const topY = margin + 38;

            // Logo Trường NBK (Góc trái)
            if (this.logoNBK && this.logoNBK.complete) {
                ctx.drawImage(this.logoNBK, margin + 28, topY - 14, 60, 60);
            }
            // Logo SoftLab (Góc phải)
            if (this.logoSoftLab && this.logoSoftLab.complete) {
                ctx.drawImage(this.logoSoftLab, w - margin - 88, topY - 14, 60, 60);
            }

            // Quốc hiệu & Tiêu ngữ trang trọng
            ctx.fillStyle = "#1e272e";
            ctx.textAlign = "center";
            ctx.font = "bold 15px 'Segoe UI', Tahoma, sans-serif";
            ctx.fillText("CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM", w / 2, topY);

            ctx.font = "bold 13px 'Segoe UI', Tahoma, sans-serif";
            ctx.fillStyle = "#2c3e50";
            ctx.fillText("Độc lập - Tự do - Hạnh phúc", w / 2, topY + 20);

            // Dòng gạch chân Quốc hiệu
            ctx.strokeStyle = "#e74c3c";
            ctx.lineWidth = 1.5;
            ctx.beginPath();
            ctx.moveTo(w / 2 - 90, topY + 28);
            ctx.lineTo(w / 2 + 90, topY + 28);
            ctx.stroke();

            // Đơn vị tổ chức
            ctx.font = "bold 13.5px 'Segoe UI', Tahoma, sans-serif";
            ctx.fillStyle = "#0984e3";
            ctx.fillText("TRƯỜNG THCS NGUYỄN BỈNH KHIÊM  •  SOFTLAB", w / 2, topY + 50);

            // 4. TIÊU ĐỀ GIẤY CHỨNG NHẬN (CERTIFICATE TITLE)
            const titleY = topY + 104;
            ctx.font = "900 38px 'Segoe UI', Georgia, serif";
            ctx.fillStyle = "#b8860b";
            ctx.shadowColor = "rgba(184, 134, 11, 0.4)";
            ctx.shadowBlur = 8;
            ctx.fillText("GIẤY CHỨNG NHẬN", w / 2, titleY);
            ctx.shadowBlur = 0;

            ctx.font = "bold 16px 'Segoe UI', Tahoma, sans-serif";
            ctx.fillStyle = "#2d3436";
            ctx.fillText("VINH DANH HIỆP SĨ AN TOÀN KHÔNG GIAN MẠNG", w / 2, titleY + 26);

            ctx.font = "italic 13.5px 'Segoe UI', Tahoma, sans-serif";
            ctx.fillStyle = "#636e72";
            ctx.fillText("CERTIFICATE OF EXCELLENCE - CYBERSECURITY HERO", w / 2, titleY + 44);

            // Dải ruy băng hoàng gia chia dòng
            ctx.strokeStyle = "#d4af37";
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.moveTo(w / 2 - 240, titleY + 54);
            ctx.lineTo(w / 2 + 240, titleY + 54);
            ctx.stroke();

            // 5. THÔNG TIN NGƯỜI NHẬN (RECIPIENT)
            const honorY = titleY + 86;
            ctx.font = "italic 16px 'Segoe UI', Tahoma, sans-serif";
            ctx.fillStyle = "#2f3542";
            ctx.fillText("Chứng nhận trao tặng cho Hiệp Sĩ:", w / 2, honorY);

            // Tên người chơi nổi bật lớn
            const name = stats.playerName || "Hiệp Sĩ Không Gian Mạng";
            ctx.font = "900 34px 'Segoe UI', Tahoma, sans-serif";
            ctx.fillStyle = "#0c2461";
            ctx.fillText(name.toUpperCase(), w / 2, honorY + 40);

            // Lời khen thưởng
            ctx.font = "15.5px 'Segoe UI', Tahoma, sans-serif";
            ctx.fillStyle = "#2f3542";
            ctx.fillText("Đã xuất sắc vượt qua khóa thử thách Vệ Binh Mật Khẩu, dũng cảm chinh phục 3 thế giới", w / 2, honorY + 70);
            ctx.fillText("Rừng Mật Mã, Biển Dữ Liệu, Tầng Mây và phong ấn thành công Rồng Hắc Ám!", w / 2, honorY + 92);

            // 6. KHỐI THÀNH TỰU ĐẠT ĐƯỢC (ACHIEVEMENTS BADGES PANEL)
            const badgeY = honorY + 116;
            const badgeW = 740;
            const badgeH = 96;
            const badgeX = (w - badgeW) / 2;

            ctx.fillStyle = "rgba(255, 255, 255, 0.75)";
            ctx.fillRect(badgeX, badgeY, badgeW, badgeH);
            ctx.strokeStyle = "#d4af37";
            ctx.lineWidth = 1.5;
            ctx.strokeRect(badgeX, badgeY, badgeW, badgeH);

            const allAch = this.achievements.getAll();
            const colW = badgeW / 3;

            allAch.forEach((ach, idx) => {
                const cx = badgeX + idx * colW + colW / 2;
                const cy = badgeY + 48;

                // Khung viền nhỏ từng thành tựu
                ctx.save();
                if (ach.unlocked) {
                    ctx.fillStyle = "rgba(241, 196, 15, 0.12)";
                    ctx.fillRect(badgeX + idx * colW + 6, badgeY + 6, colW - 12, badgeH - 12);
                    ctx.strokeStyle = ach.color || "#f1c40f";
                    ctx.lineWidth = 1;
                    ctx.strokeRect(badgeX + idx * colW + 6, badgeY + 6, colW - 12, badgeH - 12);
                }

                // Vẽ ảnh thành tựu chính thức từ thư mục images
                const achImg = (ach.id === "kratos") ? this.trophyKratos :
                               (ach.id === "the_flash") ? this.imgFlash :
                               (ach.id === "loser") ? this.imgLoser : null;

                if (achImg && achImg.complete && achImg.naturalWidth > 0) {
                    ctx.save();
                    if (!ach.unlocked) ctx.globalAlpha = 0.35;
                    ctx.drawImage(achImg, cx - 100, cy - 36, 52, 52);
                    ctx.restore();
                } else {
                    window.PixelSprites.drawPixelIcon(ctx, ach.icon, cx - 85, cy - 20, 36);
                }

                ctx.textAlign = "left";
                ctx.fillStyle = ach.unlocked ? "#2c3e50" : "#7f8c8d";
                ctx.font = "bold 14px 'Segoe UI', Tahoma, sans-serif";
                ctx.fillText(ach.title, cx - 34, cy - 8);

                ctx.font = "italic 11px 'Segoe UI', Tahoma, sans-serif";
                ctx.fillStyle = "#636e72";
                ctx.fillText(ach.titleVi, cx - 34, cy + 8);

                ctx.font = "bold 11px 'Segoe UI', Tahoma, sans-serif";
                if (ach.unlocked) {
                    ctx.fillStyle = "#27ae60";
                    ctx.fillText(`✓ ĐÃ ĐẠT ${ach.record ? `(${ach.record})` : ""}`, cx - 34, cy + 24);
                } else {
                    ctx.fillStyle = "#95a5a6";
                    ctx.fillText("✕ CHƯA ĐẠT", cx - 34, cy + 24);
                }
                ctx.restore();
            });

            // 7. THÔNG SỐ VÒNG CHƠI (Stats Summary)
            const statsY = badgeY + badgeH + 24;
            const minStr = Math.floor((stats.totalDuration || 0) / 60);
            const secStr = Math.floor((stats.totalDuration || 0) % 60).toString().padStart(2, "0");
            const durationText = `${minStr}:${secStr}`;
            const rosesText = `${stats.totalRoses || 0} Bông hồng`;

            ctx.font = "bold 13.5px 'Segoe UI', Tahoma, sans-serif";
            ctx.fillStyle = "#2c3e50";
            ctx.textAlign = "center";
            ctx.fillText(`Tổng thời gian hoàn thành: ${durationText}   |   Hoa hồng tích lũy: ${rosesText}`, w / 2, statsY);

            // 8. CHỮ KÝ, CON DẤU & NGÀY CẤP (SEALS & SIGNATURES)
            const sigY = h - margin - 95;

            // Ngày cấp
            const now = stats.completedDate || new Date();
            const dateStr = `Hà Nội, ngày ${now.getDate()} tháng ${now.getMonth() + 1} năm ${now.getFullYear()}`;
            ctx.font = "italic 13.5px 'Segoe UI', Tahoma, sans-serif";
            ctx.fillStyle = "#2c3e50";
            ctx.textAlign = "right";
            ctx.fillText(dateStr, w - margin - 70, sigY - 14);

            // Chữ ký bên trái: Chuyên gia SoftLab
            ctx.textAlign = "center";
            ctx.font = "bold 13.5px 'Segoe UI', Tahoma, sans-serif";
            ctx.fillStyle = "#1e272e";
            ctx.fillText("ĐẠI DIỆN CHUYÊN MÔN SOFTLAB", margin + 180, sigY + 12);
            ctx.font = "italic 12px 'Segoe UI', Tahoma, sans-serif";
            ctx.fillStyle = "#57606f";
            ctx.fillText("(Ký & đóng dấu số)", margin + 180, sigY + 30);
            ctx.font = "bold 15px 'Segoe UI', Tahoma, sans-serif";
            ctx.fillStyle = "#0c2461";
            ctx.fillText("Ban An Toàn Thông Tin SoftLab", margin + 180, sigY + 80);

            // Chữ ký bên phải: THCS Nguyễn Bỉnh Khiêm
            ctx.font = "bold 13.5px 'Segoe UI', Tahoma, sans-serif";
            ctx.fillStyle = "#1e272e";
            ctx.fillText("TRƯỜNG THCS NGUYỄN BỈNH KHIÊM", w - margin - 180, sigY + 12);
            ctx.font = "italic 12px 'Segoe UI', Tahoma, sans-serif";
            ctx.fillStyle = "#57606f";
            ctx.fillText("(Ban Giám Hiệu xác nhận)", w - margin - 180, sigY + 30);
            ctx.font = "bold 15px 'Segoe UI', Tahoma, sans-serif";
            ctx.fillStyle = "#0c2461";
            ctx.fillText("Ban Tổ Chức Hội Thi", w - margin - 180, sigY + 80);

            // Con dấu đỏ chứng nhận danh dự (Official Red Seal)
            this._drawOfficialRedSeal(ctx, w / 2, sigY + 45);

            ctx.restore();
        }

        _drawCornerOrnament(ctx, x, y, dirX, dirY) {
            ctx.save();
            ctx.translate(x, y);
            ctx.scale(dirX, dirY);
            ctx.fillStyle = "#b8860b";
            ctx.fillRect(0, 0, 20, 3);
            ctx.fillRect(0, 0, 3, 20);
            ctx.fillRect(5, 5, 12, 2);
            ctx.fillRect(5, 5, 2, 12);
            ctx.fillStyle = "#f1c40f";
            ctx.fillRect(8, 8, 4, 4);
            ctx.restore();
        }

        _drawOfficialRedSeal(ctx, cx, cy) {
            ctx.save();
            ctx.translate(cx, cy);
            ctx.rotate(-0.06); // Dấu mộc hơi nghiêng tự nhiên

            // Vòng tròn đỏ son ngoài
            ctx.strokeStyle = "#e84118";
            ctx.lineWidth = 3.5;
            ctx.beginPath();
            ctx.arc(0, 0, 48, 0, Math.PI * 2);
            ctx.stroke();

            // Vòng tròn đỏ trong
            ctx.lineWidth = 1.5;
            ctx.beginPath();
            ctx.arc(0, 0, 42, 0, Math.PI * 2);
            ctx.stroke();

            // Chữ uốn quanh con dấu
            ctx.fillStyle = "#e84118";
            ctx.font = "900 8.5px 'Segoe UI', Tahoma, sans-serif";
            ctx.textAlign = "center";
            ctx.fillText("★ THCS NGUYỄN BỈNH KHIÊM ★", 0, -22);
            ctx.fillText("SOFTLAB CYBERSEC", 0, -10);

            // Ngôi sao vàng / chữ ĐÃ CHỨNG THỰC
            ctx.font = "bold 11px 'Segoe UI', Tahoma, sans-serif";
            ctx.fillText("CHỨNG THỰC", 0, 8);
            ctx.font = "bold 9px 'Segoe UI', Tahoma, sans-serif";
            ctx.fillText("VỆ BINH MẬT KHẨU", 0, 23);

            ctx.restore();
        }

        downloadPng() {
            // Tạo Canvas 2K siêu nét (2048 x 1280) để ảnh tải về in ấn hoặc xem trên màn hình lớn đạt chuẩn sắc nét
            const exportCanvas = document.createElement("canvas");
            exportCanvas.width = 2048;
            exportCanvas.height = 1280;
            const expCtx = exportCanvas.getContext("2d");

            this.drawCertificate(expCtx, exportCanvas.width, exportCanvas.height, this.currentStats);

            try {
                const dataUrl = exportCanvas.toDataURL("image/png");
                const safeName = (this.currentStats.playerName || "Hiep_Si")
                    .replace(/[^a-zA-Z0-9_\u00C0-\u024F\u1E00-\u1EFF]/g, "_");
                const filename = `Giay_Chung_Nhan_${safeName}_VeBinhMatKhau.png`;

                const link = document.createElement("a");
                link.download = filename;
                link.href = dataUrl;
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);

                if (window.SoundEngine && window.SoundEngine.play) {
                    window.SoundEngine.play("click");
                }
            } catch (err) {
                console.error("[Certificate] Lỗi tải về ảnh:", err);
                alert("Không thể xuất file ảnh giấy chứng nhận. Vui lòng thử lại!");
            }
        }
    }

    // Khởi tạo và đính kèm vào đối tượng Window
    window.AchievementManager = new AchievementManager();
    window.LongPhuongFX = new LongPhuongFX();
    window.CertificateGenerator = new CertificateGenerator(window.AchievementManager);

})();
