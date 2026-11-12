/**
 * Procedural Pixel Art Sprites & Canvas Renderers
 * Tự động vẽ các thành phần đồ họa phong cách Pixel Art 16-bit
 * Bao gồm hệ sinh thái chi tiết:
 *  - RỪNG: Cây cối nhiều tầng, chim chóc bay và đậu cành, nấm rực rỡ, hoa cỏ, đom đóm
 *  - NƯỚC: Rong rêu uốn lượn theo sóng, đàn cá bơi lội vẫy đuôi, rạn san hô, bọt khí nổi
 *  - MÂY: Các tầng mây cuộn trôi parallax, chim lượn trên trời, đảo bay lơ lửng
 *  - NHÂN VẬT PHIÊU LƯU (ADVENTURER): Hoạt ảnh đi bộ, áo choàng bay, cầm hoa hồng/khiên
 */

const PixelSprites = {
    // ========================================================
    // 1. NHÂN VẬT VỆ BINH PHIÊU LƯU (ADVENTURER / CYBER KNIGHT)
    // ========================================================
    drawAdventurer(ctx, x, y, size = 48, walkFrame = 0, direction = 1, isWalking = true, rosesCount = 1) {
        ctx.save();
        ctx.translate(x, y);
        if (direction === -1) {
            ctx.scale(-1, 1);
        }

        const s = size / 24; // 24x24 pixel grid

        // Nhịp bước đi (Bobbing & Leg swing)
        const bob = isWalking ? Math.abs(Math.sin(walkFrame * 8)) * 2 * s : 0;

        // 1. Áo choàng phía sau (Cape)
        const capeWave = isWalking ? Math.sin(walkFrame * 8 + 1) * 3 * s : Math.sin(walkFrame * 2) * 1.5 * s;
        ctx.fillStyle = "#1e3799";
        ctx.beginPath();
        ctx.moveTo(7 * s, 8 * s - bob);
        ctx.lineTo(2 * s - capeWave, 18 * s);
        ctx.lineTo(6 * s - capeWave, 21 * s);
        ctx.lineTo(10 * s, 14 * s - bob);
        ctx.closePath();
        ctx.fill();

        // 2. Chân trái & Chân phải (Walking legs)
        const legLeftOffset = isWalking ? Math.sin(walkFrame * 8) * 3 * s : 0;
        const legRightOffset = isWalking ? -Math.sin(walkFrame * 8) * 3 * s : 0;

        // Chân sau (tối hơn)
        ctx.fillStyle = "#2c3e50";
        ctx.fillRect(8 * s - legLeftOffset, 16 * s - bob, 3 * s, 6 * s + legLeftOffset * 0.4);
        ctx.fillStyle = "#34495e";
        ctx.fillRect(7 * s - legLeftOffset, 21 * s, 4 * s, 3 * s);

        // Chân trước (sáng hơn)
        ctx.fillStyle = "#34495e";
        ctx.fillRect(13 * s + legRightOffset, 16 * s - bob, 3 * s, 6 * s - legRightOffset * 0.4);
        ctx.fillStyle = "#2c3e50";
        ctx.fillRect(13 * s + legRightOffset, 21 * s, 4 * s, 3 * s);

        // 3. Thân áo giáp (Body Armor)
        ctx.fillStyle = "#4a69bd";
        ctx.fillRect(8 * s, 9 * s - bob, 8 * s, 8 * s);
        ctx.fillStyle = "#6a89cc";
        ctx.fillRect(10 * s, 10 * s - bob, 5 * s, 6 * s);
        ctx.fillStyle = "#f1c40f"; // Huy hiệu bảo mật vàng
        ctx.fillRect(12 * s, 12 * s - bob, 2 * s, 2 * s);

        // Thắt lưng (Belt)
        ctx.fillStyle = "#2c3e50";
        ctx.fillRect(8 * s, 15 * s - bob, 8 * s, 2 * s);
        ctx.fillStyle = "#f39c12";
        ctx.fillRect(11 * s, 15 * s - bob, 2 * s, 2 * s);

        // 4. Đầu & Mũ giáp Cyber (Head & Helmet)
        ctx.fillStyle = "#dfe4ea";
        ctx.fillRect(9 * s, 3 * s - bob, 7 * s, 6 * s);

        // Kính bảo hộ Cyber phát quang xanh neon (Visor)
        ctx.fillStyle = "#00d2d3";
        ctx.fillRect(12 * s, 5 * s - bob, 5 * s, 2.5 * s);
        ctx.fillStyle = "#ffffff";
        ctx.fillRect(14 * s, 5 * s - bob, 1.5 * s, 1 * s);

        // Băng đầu / Mào mũ giáp
        ctx.fillStyle = "#e74c3c";
        ctx.fillRect(8 * s, 2 * s - bob, 8 * s, 2 * s);
        ctx.fillRect(7 * s, 3 * s - bob, 2 * s, 2 * s);

        // 5. Tay & Cầm Bông hồng bảo mật
        const armSwing = isWalking ? -Math.sin(walkFrame * 8) * 2 * s : 0;
        ctx.fillStyle = "#6a89cc";
        ctx.fillRect(11 * s, 11 * s - bob + armSwing, 3 * s, 5 * s);
        ctx.fillStyle = "#dfe4ea";
        ctx.fillRect(12 * s, 15 * s - bob + armSwing, 2.5 * s, 2.5 * s);

        // Bông hồng cầm trên tay người hùng
        if (rosesCount > 0) {
            this.drawRose(ctx, 14 * s, 9 * s - bob + armSwing, 16 * s);
        }

        ctx.restore();
    },

    // ========================================================
    // 2. VẼ BÔNG HỒNG PIXEL (ROSE)
    // ========================================================
    drawRose(ctx, x, y, size = 32) {
        ctx.save();
        ctx.translate(x, y);
        const s = size / 16;

        ctx.fillStyle = "#27ae60";
        ctx.fillRect(7 * s, 8 * s, 2 * s, 8 * s);
        ctx.fillRect(4 * s, 11 * s, 3 * s, 2 * s);
        ctx.fillRect(3 * s, 10 * s, 2 * s, 2 * s);
        ctx.fillRect(9 * s, 12 * s, 3 * s, 2 * s);
        ctx.fillRect(11 * s, 11 * s, 2 * s, 2 * s);

        ctx.fillStyle = "#1e824c";
        ctx.fillRect(6 * s, 7 * s, 4 * s, 2 * s);

        ctx.fillStyle = "#962d3e";
        ctx.fillRect(4 * s, 3 * s, 8 * s, 5 * s);

        ctx.fillStyle = "#e74c3c";
        ctx.fillRect(5 * s, 2 * s, 6 * s, 4 * s);
        ctx.fillRect(3 * s, 3 * s, 2 * s, 3 * s);
        ctx.fillRect(11 * s, 3 * s, 2 * s, 3 * s);

        ctx.fillStyle = "#ff6b6b";
        ctx.fillRect(6 * s, 3 * s, 4 * s, 2 * s);
        ctx.fillRect(5 * s, 4 * s, 2 * s, 2 * s);

        ctx.fillStyle = "#ffffff";
        ctx.fillRect(7 * s, 2 * s, 1 * s, 1 * s);
        ctx.fillRect(9 * s, 4 * s, 1 * s, 1 * s);

        ctx.restore();
    },

    // ========================================================
    // 3. VÒNG 1: KHU RỪNG MẬT MÃ (CÂY, CHIM CHÓC, HOA CỎ, ĐOM ĐÓM)
    // ========================================================
    drawForestWorld(ctx, w, h, time, birds = []) {
        const skyGrad = ctx.createLinearGradient(0, 0, 0, h);
        skyGrad.addColorStop(0, "#082613");
        skyGrad.addColorStop(0.5, "#0b3b1c");
        skyGrad.addColorStop(1, "#031508");
        ctx.fillStyle = skyGrad;
        ctx.fillRect(0, 0, w, h);

        // Lớp cây xa
        for (let i = 0; i < 9; i++) {
            const tx = i * 160 - 40;
            this._drawPixelTree(ctx, tx, h * 0.35, 120, 180, "#062b16", "#041b0d");
        }

        // Lớp cây gần lay động theo gió
        for (let i = 0; i < 7; i++) {
            const tx = i * 220 + 20;
            const sway = Math.sin(time * 1.5 + i) * 3;
            this._drawPixelTree(ctx, tx + sway, h * 0.45, 150, 240, "#196f3d", "#0e4424");
        }

        // Mặt đất rừng & cỏ
        ctx.fillStyle = "#1e3a1f";
        ctx.fillRect(0, h - 80, w, 80);
        ctx.fillStyle = "#27ae60";
        ctx.fillRect(0, h - 84, w, 6);

        // Cỏ và nấm phát sáng
        for (let i = 0; i < w; i += 30) {
            const grassH = 6 + (Math.sin(i * 13) + 1) * 4;
            ctx.fillStyle = (i % 60 === 0) ? "#2ecc71" : "#1abc9c";
            ctx.fillRect(i, h - 84 - grassH, 4, grassH);

            if (i % 150 === 30) {
                this._drawMushroom(ctx, i, h - 84);
            }
        }

        // Chim chóc trong rừng
        birds.forEach(b => {
            this.drawBird(ctx, b.x, b.y, b.vx, time + b.offset, "#f39c12");
        });

        // Đom đóm bay lấp lánh
        for (let i = 0; i < 18; i++) {
            const fx = (Math.sin(time * 0.8 + i * 2) * 0.4 + 0.5) * w;
            const fy = (Math.cos(time * 0.6 + i * 3) * 0.3 + 0.5) * (h - 100);
            const pulse = (Math.sin(time * 4 + i) + 1) * 0.5;

            ctx.fillStyle = `rgba(241, 196, 15, ${pulse * 0.8})`;
            ctx.fillRect(fx, fy, 4, 4);
            ctx.fillStyle = `rgba(255, 255, 255, ${pulse})`;
            ctx.fillRect(fx + 1, fy + 1, 2, 2);
        }
    },

    _drawPixelTree(ctx, x, y, width, height, leafColor1, leafColor2) {
        ctx.fillStyle = "#4a2d14";
        ctx.fillRect(x + width * 0.42, y + height * 0.5, width * 0.16, height * 0.5);

        const layers = [
            { yOff: 0.55, h: height * 0.35, w: width },
            { yOff: 0.30, h: height * 0.32, w: width * 0.8 },
            { yOff: 0.05, h: height * 0.30, w: width * 0.6 }
        ];

        layers.forEach((l, idx) => {
            ctx.fillStyle = (idx % 2 === 0) ? leafColor1 : leafColor2;
            const lx = x + (width - l.w) / 2;
            const ly = y + l.yOff * height;
            ctx.beginPath();
            ctx.moveTo(x + width / 2, ly);
            ctx.lineTo(lx, ly + l.h);
            ctx.lineTo(lx + l.w, ly + l.h);
            ctx.closePath();
            ctx.fill();

            ctx.fillStyle = "rgba(255, 255, 255, 0.1)";
            ctx.fillRect(lx + 6, ly + l.h - 4, l.w - 12, 3);
        });
    },

    _drawMushroom(ctx, x, y) {
        ctx.fillStyle = "#ecf0f1";
        ctx.fillRect(x + 3, y - 8, 4, 8);
        ctx.fillStyle = "#e74c3c";
        ctx.fillRect(x, y - 14, 10, 6);
        ctx.fillRect(x + 2, y - 16, 6, 2);
        ctx.fillStyle = "#ffffff";
        ctx.fillRect(x + 2, y - 13, 2, 2);
        ctx.fillRect(x + 6, y - 13, 2, 2);
    },

    // ========================================================
    // 4. VÒNG 2: VÙNG BIỂN DỮ LIỆU (CÁ, RONG RÊU, SAN HÔ, BỌT KHÍ)
    // ========================================================
    drawWaterWorld(ctx, w, h, time, fishes = [], bubbles = []) {
        const seaGrad = ctx.createLinearGradient(0, 0, 0, h);
        seaGrad.addColorStop(0, "#0984e3");
        seaGrad.addColorStop(0.3, "#0056b3");
        seaGrad.addColorStop(0.7, "#0c2461");
        seaGrad.addColorStop(1, "#041033");
        ctx.fillStyle = seaGrad;
        ctx.fillRect(0, 0, w, h);

        // Vệt nắng khúc xạ
        ctx.fillStyle = "rgba(255, 255, 255, 0.04)";
        for (let i = 0; i < 6; i++) {
            const rx = (i * 240 + Math.sin(time + i) * 40);
            ctx.beginPath();
            ctx.moveTo(rx, 0);
            ctx.lineTo(rx + 60, 0);
            ctx.lineTo(rx + 160, h);
            ctx.lineTo(rx + 70, h);
            ctx.closePath();
            ctx.fill();
        }

        // Đáy biển
        ctx.fillStyle = "#e58e26";
        ctx.fillRect(0, h - 70, w, 70);
        ctx.fillStyle = "#b76b16";
        ctx.fillRect(0, h - 75, w, 5);

        // San hô
        for (let i = 40; i < w; i += 180) {
            this._drawCoral(ctx, i, h - 75, (i % 2 === 0) ? "#e84393" : "#fd79a8");
        }

        // Rong rêu uốn lượn
        for (let i = 15; i < w; i += 45) {
            const kelpH = 80 + (Math.sin(i * 9) + 1) * 40;
            const color = (i % 90 === 0) ? "#00b894" : "#00cec9";
            this._drawSwayingSeaweed(ctx, i, h - 75, kelpH, time, color);
        }

        // Đàn cá bơi lội vẫy đuôi
        fishes.forEach(f => {
            this.drawFish(ctx, f.x, f.y, f.vx, time + f.offset, f.color, f.size);
        });

        // Bọt khí
        bubbles.forEach(b => {
            const bx = b.x + Math.sin(time * 3 + b.y * 0.05) * 6;
            ctx.strokeStyle = "rgba(255, 255, 255, 0.6)";
            ctx.lineWidth = 1.5;
            ctx.beginPath();
            ctx.arc(bx, b.y, b.r, 0, Math.PI * 2);
            ctx.stroke();
            ctx.fillStyle = "rgba(255, 255, 255, 0.8)";
            ctx.fillRect(bx - b.r * 0.4, b.y - b.r * 0.4, b.r * 0.5, b.r * 0.5);
        });
    },

    _drawSwayingSeaweed(ctx, x, y, height, time, color) {
        ctx.fillStyle = color;
        const segments = 8;
        const segH = height / segments;
        let currentX = x;
        let currentY = y;

        for (let i = 0; i < segments; i++) {
            const sway = Math.sin(time * 2 + (segments - i) * 0.5) * (i * 2.2);
            const nextX = x + sway;
            const nextY = currentY - segH;

            ctx.beginPath();
            ctx.moveTo(currentX - 3, currentY);
            ctx.lineTo(currentX + 3, currentY);
            ctx.lineTo(nextX + 2, nextY);
            ctx.lineTo(nextX - 2, nextY);
            ctx.closePath();
            ctx.fill();

            currentX = nextX;
            currentY = nextY;
        }
    },

    _drawCoral(ctx, x, y, color) {
        ctx.fillStyle = color;
        ctx.fillRect(x - 8, y - 25, 6, 25);
        ctx.fillRect(x - 14, y - 20, 6, 12);
        ctx.fillRect(x - 2, y - 35, 7, 35);
        ctx.fillRect(x + 7, y - 28, 6, 28);
        ctx.fillRect(x + 13, y - 18, 5, 10);
    },

    drawFish(ctx, x, y, vx, time, color = "#ff7675", size = 24) {
        ctx.save();
        ctx.translate(x, y);
        if (vx < 0) {
            ctx.scale(-1, 1);
        }

        const s = size / 16;
        const tailFlap = Math.sin(time * 12) * 3 * s;

        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.moveTo(0, 8 * s);
        ctx.lineTo(-6 * s, (3 * s) + tailFlap);
        ctx.lineTo(-6 * s, (13 * s) + tailFlap);
        ctx.closePath();
        ctx.fill();

        ctx.fillStyle = color;
        ctx.fillRect(0, 4 * s, 10 * s, 8 * s);
        ctx.fillRect(10 * s, 6 * s, 3 * s, 4 * s);

        ctx.fillStyle = "#ffffff";
        ctx.fillRect(4 * s, 2 * s, 4 * s, 2 * s);
        ctx.fillRect(4 * s, 12 * s, 4 * s, 2 * s);

        ctx.fillStyle = "#ffffff";
        ctx.fillRect(9 * s, 6 * s, 2.5 * s, 2.5 * s);
        ctx.fillStyle = "#2c3e50";
        ctx.fillRect(10 * s, 7 * s, 1.5 * s, 1.5 * s);

        ctx.fillStyle = "#ffffff";
        ctx.fillRect(3 * s, 4 * s, 2 * s, 8 * s);

        ctx.restore();
    },

    // ========================================================
    // 5. VÒNG 3: TẦNG MÂY THƯỢNG ĐỈNH (MÂY TRÔI, CHIM LƯỢN, ĐẢO BAY)
    // ========================================================
    drawCloudWorld(ctx, w, h, time, birds = []) {
        const skyGrad = ctx.createLinearGradient(0, 0, 0, h);
        skyGrad.addColorStop(0, "#4834d4");
        skyGrad.addColorStop(0.4, "#686de0");
        skyGrad.addColorStop(0.8, "#be2edd");
        skyGrad.addColorStop(1, "#22a6b3");
        ctx.fillStyle = skyGrad;
        ctx.fillRect(0, 0, w, h);

        ctx.fillStyle = "#f9ca24";
        ctx.beginPath();
        ctx.arc(w * 0.82, h * 0.22, 50, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = "rgba(249, 202, 36, 0.25)";
        ctx.beginPath();
        ctx.arc(w * 0.82, h * 0.22, 75, 0, Math.PI * 2);
        ctx.fill();

        // Đảo bay lơ lửng
        this._drawFloatingIsland(ctx, w * 0.15, h * 0.38, 120, time * 0.5);
        this._drawFloatingIsland(ctx, w * 0.70, h * 0.30, 160, time * 0.5 + 2);

        // Mây xa
        for (let i = 0; i < 5; i++) {
            const cx = ((i * 320 + time * 15) % (w + 400)) - 200;
            this._drawFluffyCloud(ctx, cx, h * 0.18 + (i % 2) * 50, 140, "rgba(255, 255, 255, 0.45)");
        }

        // Mây trung
        for (let i = 0; i < 4; i++) {
            const cx = ((i * 380 + time * 30) % (w + 400)) - 200;
            this._drawFluffyCloud(ctx, cx, h * 0.45 + (i % 2) * 40, 180, "rgba(255, 255, 255, 0.75)");
        }

        // Chim chao lượn trên trời mây
        birds.forEach(b => {
            this.drawBird(ctx, b.x, b.y, b.vx, time + b.offset, "#ffffff");
        });

        // Thảm mây đáy
        ctx.fillStyle = "#ffffff";
        ctx.fillRect(0, h - 60, w, 60);
        for (let i = -50; i < w + 50; i += 60) {
            const puffY = h - 60 + Math.sin(time * 2 + i) * 6;
            ctx.beginPath();
            ctx.arc(i, puffY, 40, 0, Math.PI * 2);
            ctx.fill();
        }
        ctx.fillStyle = "#dfe4ea";
        ctx.fillRect(0, h - 30, w, 30);
    },

    _drawFloatingIsland(ctx, x, y, width, bobTime) {
        const bob = Math.sin(bobTime) * 6;
        ctx.save();
        ctx.translate(x, y + bob);

        ctx.fillStyle = "#574b90";
        ctx.beginPath();
        ctx.moveTo(0, 16);
        ctx.lineTo(width, 16);
        ctx.lineTo(width * 0.55, 55);
        ctx.closePath();
        ctx.fill();

        ctx.fillStyle = "#303952";
        ctx.beginPath();
        ctx.moveTo(width * 0.2, 16);
        ctx.lineTo(width * 0.8, 16);
        ctx.lineTo(width * 0.55, 45);
        ctx.closePath();
        ctx.fill();

        ctx.fillStyle = "#2ed573";
        ctx.fillRect(0, 6, width, 12);
        ctx.fillStyle = "#7bed9f";
        ctx.fillRect(4, 2, width - 8, 5);

        ctx.fillStyle = "#00d2d3";
        ctx.fillRect(width * 0.45, -12, 12, 18);
        ctx.fillStyle = "#ffffff";
        ctx.fillRect(width * 0.48, -10, 4, 10);

        ctx.restore();
    },

    _drawFluffyCloud(ctx, x, y, width, fillColor) {
        ctx.save();
        ctx.fillStyle = fillColor;
        const r = width * 0.22;
        ctx.beginPath();
        ctx.arc(x + r, y + r, r, 0, Math.PI * 2);
        ctx.arc(x + width * 0.4, y + r * 0.6, r * 1.3, 0, Math.PI * 2);
        ctx.arc(x + width * 0.7, y + r * 0.8, r * 1.1, 0, Math.PI * 2);
        ctx.arc(x + width - r, y + r, r, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
    },

    // ========================================================
    // 6. VẼ CHIM CHÓC ĐANG BAY (FLYING BIRD)
    // ========================================================
    drawBird(ctx, x, y, vx, time, color = "#ffffff") {
        ctx.save();
        ctx.translate(x, y);
        if (vx < 0) {
            ctx.scale(-1, 1);
        }

        const wingFlap = Math.sin(time * 10);
        ctx.fillStyle = color;

        ctx.fillRect(0, 0, 8, 4);
        ctx.fillStyle = "#f1c40f";
        ctx.fillRect(8, 1, 3, 2);

        ctx.fillStyle = color;
        if (wingFlap > 0) {
            ctx.fillRect(2, -6, 4, 6);
            ctx.fillRect(1, -4, 2, 4);
        } else {
            ctx.fillRect(2, 4, 4, 6);
            ctx.fillRect(1, 4, 2, 4);
        }

        ctx.restore();
    },

    // ========================================================
    // 7. HOẠT CẢNH PHIÊU LƯU GIỮA CÁC THẾ GIỚI (TRAVEL CUTSCENE)
    // ========================================================
    drawTravelCutscene(ctx, w, h, fromStage, toStage, progress, time) {
        let titleOld = "", titleNew = "";
        if (fromStage === 1) titleOld = "Khu Rừng Mật Mã 🌲";
        else if (fromStage === 2) titleOld = "Vùng Biển Dữ Liệu 🌊";
        else titleOld = "Tầng Mây Thượng Đỉnh ☁️";

        if (toStage === 2) titleNew = "Vùng Biển Dữ Liệu 🌊";
        else if (toStage === 3) titleNew = "Tầng Mây Thượng Đỉnh ☁️";
        else titleNew = "Hang Rồng Hắc Ám 🐉";

        const transGrad = ctx.createLinearGradient(0, 0, w, 0);
        if (fromStage === 1 && toStage === 2) {
            transGrad.addColorStop(0, "#082613");
            transGrad.addColorStop(0.5, "#0b3b1c");
            transGrad.addColorStop(1, "#0984e3");
        } else if (fromStage === 2 && toStage === 3) {
            transGrad.addColorStop(0, "#0c2461");
            transGrad.addColorStop(0.5, "#341f97");
            transGrad.addColorStop(1, "#686de0");
        } else {
            transGrad.addColorStop(0, "#341f97");
            transGrad.addColorStop(0.6, "#5f27cd");
            transGrad.addColorStop(1, "#2d0c1e");
        }
        ctx.fillStyle = transGrad;
        ctx.fillRect(0, 0, w, h);

        if (fromStage === 1) {
            this._drawPixelTree(ctx, 40, h * 0.4, 120, 200, "#196f3d", "#0e4424");
            this._drawPixelTree(ctx, 150, h * 0.45, 100, 180, "#196f3d", "#0e4424");
        } else if (fromStage === 2) {
            this._drawSwayingSeaweed(ctx, 60, h - 80, 100, time, "#00b894");
            this._drawSwayingSeaweed(ctx, 120, h - 80, 120, time, "#00cec9");
        }

        if (toStage === 2) {
            this._drawSwayingSeaweed(ctx, w - 120, h - 80, 120, time, "#00b894");
            this.drawFish(ctx, w - 160, h * 0.5, -1, time, "#ff7675", 28);
        } else if (toStage === 3) {
            this._drawFluffyCloud(ctx, w - 240, h * 0.35, 180, "rgba(255, 255, 255, 0.8)");
            this.drawBird(ctx, w - 180, h * 0.28, 1, time, "#ffffff");
        } else if (toStage === 4) {
            ctx.fillStyle = "#e74c3c";
            ctx.fillRect(w - 200, h * 0.4, 200, h * 0.6);
            ctx.fillStyle = "#2c1654";
            ctx.fillRect(w - 180, h * 0.45, 180, h * 0.55);
        }

        ctx.fillStyle = "#2c3e50";
        ctx.fillRect(0, h - 80, w, 80);
        ctx.fillStyle = "#f39c12";
        ctx.fillRect(0, h - 84, w, 6);

        // Vệ Binh bước đi
        const heroX = 80 + (w - 220) * progress;
        const heroY = h - 130;
        this.drawAdventurer(ctx, heroX, heroY, 60, time, 1, true, 1);

        ctx.fillStyle = "rgba(10, 8, 20, 0.85)";
        ctx.fillRect(w * 0.15, 60, w * 0.7, 90);
        ctx.strokeStyle = "#f1c40f";
        ctx.lineWidth = 3;
        ctx.strokeRect(w * 0.15, 60, w * 0.7, 90);

        ctx.fillStyle = "#f1c40f";
        ctx.font = "bold 22px 'Segoe UI', Tahoma, sans-serif";
        ctx.textAlign = "center";
        ctx.fillText(`🚀 HÀNH TRÌNH PHIÊU LƯU: ${titleOld}  ➡️  ${titleNew}`, w / 2, 100);

        ctx.fillStyle = "#ffffff";
        ctx.font = "16px 'Segoe UI', Tahoma, sans-serif";
        ctx.fillText("Vệ Binh Mật Khẩu đang bước đi khám phá vùng đất tiếp theo...", w / 2, 130);
    },

    // ========================================================
    // 8. VẼ RỒNG HẮC ÁM (DRAGON BOSS)
    // ========================================================
    drawDragon(ctx, x, y, width = 160, height = 140, isHurt = false, flapAnim = 0) {
        ctx.save();
        ctx.translate(x, y);
        const s = width / 32;

        const bodyColor = isHurt ? "#ffffff" : "#2c1654";
        const bodyColor2 = isHurt ? "#ff7675" : "#482880";
        const wingColor = isHurt ? "#d63031" : "#8e44ad";
        const eyeColor = isHurt ? "#ff0000" : "#f1c40f";
        const hornColor = "#e67e22";

        const wingOffset = Math.sin(flapAnim) * 4 * s;

        ctx.fillStyle = wingColor;
        ctx.beginPath();
        ctx.moveTo(8 * s, (8 * s) + wingOffset);
        ctx.lineTo(-4 * s, (-4 * s) + wingOffset);
        ctx.lineTo(2 * s, (14 * s) + wingOffset);
        ctx.closePath();
        ctx.fill();

        ctx.beginPath();
        ctx.moveTo(24 * s, (8 * s) + wingOffset);
        ctx.lineTo(36 * s, (-4 * s) + wingOffset);
        ctx.lineTo(30 * s, (14 * s) + wingOffset);
        ctx.closePath();
        ctx.fill();

        ctx.fillStyle = bodyColor;
        ctx.fillRect(14 * s, 24 * s, 4 * s, 6 * s);
        ctx.fillRect(12 * s, 28 * s, 4 * s, 4 * s);
        ctx.fillRect(8 * s, 30 * s, 5 * s, 3 * s);
        ctx.fillStyle = hornColor;
        ctx.fillRect(7 * s, 29 * s, 2 * s, 2 * s);

        ctx.fillStyle = bodyColor;
        ctx.fillRect(10 * s, 12 * s, 12 * s, 13 * s);
        ctx.fillStyle = isHurt ? "#fab1a0" : "#d35400";
        ctx.fillRect(12 * s, 14 * s, 8 * s, 9 * s);
        ctx.fillStyle = isHurt ? "#ffffff" : "#f39c12";
        ctx.fillRect(13 * s, 15 * s, 6 * s, 2 * s);
        ctx.fillRect(13 * s, 18 * s, 6 * s, 2 * s);
        ctx.fillRect(14 * s, 21 * s, 4 * s, 1.5 * s);

        ctx.fillStyle = bodyColor2;
        ctx.fillRect(9 * s, 4 * s, 14 * s, 9 * s);
        ctx.fillRect(8 * s, 8 * s, 16 * s, 5 * s);

        ctx.fillStyle = hornColor;
        ctx.fillRect(7 * s, 1 * s, 3 * s, 4 * s);
        ctx.fillRect(6 * s, -1 * s, 2 * s, 3 * s);
        ctx.fillRect(22 * s, 1 * s, 3 * s, 4 * s);
        ctx.fillRect(24 * s, -1 * s, 2 * s, 3 * s);

        ctx.fillStyle = eyeColor;
        ctx.fillRect(10 * s, 7 * s, 3 * s, 2 * s);
        ctx.fillRect(19 * s, 7 * s, 3 * s, 2 * s);
        ctx.fillStyle = "#000000";
        ctx.fillRect(11 * s, 7 * s, 1.5 * s, 2 * s);
        ctx.fillRect(20 * s, 7 * s, 1.5 * s, 2 * s);

        ctx.fillStyle = "#ffffff";
        ctx.fillRect(11 * s, 13 * s, 2 * s, 2 * s);
        ctx.fillRect(19 * s, 13 * s, 2 * s, 2 * s);

        ctx.restore();
    },

    // ========================================================
    // 9. VẼ XÚC XẮC (DICE)
    // ========================================================
    drawDice(ctx, x, y, size = 100, value = 1, isRolling = false) {
        ctx.save();
        ctx.translate(x, y);

        const val = isRolling ? Math.floor(Math.random() * 6) + 1 : value;

        ctx.fillStyle = "rgba(0, 0, 0, 0.4)";
        ctx.fillRect(8, 8, size, size);

        ctx.fillStyle = "#ecf0f1";
        ctx.fillRect(0, 0, size, size);

        ctx.fillStyle = "#ffffff";
        ctx.fillRect(0, 0, size, 6);
        ctx.fillRect(0, 0, 6, size);

        ctx.fillStyle = "#bdc3c7";
        ctx.fillRect(0, size - 6, size, 6);
        ctx.fillRect(size - 6, 0, 6, size);

        ctx.fillStyle = (val === 1) ? "#e74c3c" : "#2c3e50";
        const dotSize = size * 0.16;
        const c = size / 2;
        const l = size * 0.25;
        const r = size * 0.75;

        const drawDot = (dx, dy) => {
            ctx.beginPath();
            ctx.arc(dx, dy, dotSize / 2, 0, Math.PI * 2);
            ctx.fill();
        };

        if (val === 1) drawDot(c, c);
        else if (val === 2) { drawDot(l, l); drawDot(r, r); }
        else if (val === 3) { drawDot(l, l); drawDot(c, c); drawDot(r, r); }
        else if (val === 4) { drawDot(l, l); drawDot(r, l); drawDot(l, r); drawDot(r, r); }
        else if (val === 5) { drawDot(l, l); drawDot(r, l); drawDot(c, c); drawDot(l, r); drawDot(r, r); }
        else if (val === 6) { drawDot(l, l); drawDot(r, l); drawDot(l, c); drawDot(r, c); drawDot(l, r); drawDot(r, r); }

        ctx.restore();
    },

    // ========================================================
    // 10. VẼ THẺ BÀI MA THUẬT (CARD)
    // ========================================================
    drawCard(ctx, x, y, width = 200, height = 280, cardData = null, isRevealed = false) {
        ctx.save();
        ctx.translate(x, y);

        ctx.fillStyle = "rgba(0, 0, 0, 0.5)";
        ctx.fillRect(8, 8, width, height);

        if (!isRevealed) {
            ctx.fillStyle = "#341f97";
            ctx.fillRect(0, 0, width, height);

            ctx.strokeStyle = "#f1c40f";
            ctx.lineWidth = 6;
            ctx.strokeRect(6, 6, width - 12, height - 12);

            ctx.fillStyle = "#5f27cd";
            ctx.fillRect(20, 20, width - 40, height - 40);

            ctx.fillStyle = "#f1c40f";
            ctx.font = "bold 60px 'Press Start 2P', monospace, sans-serif";
            ctx.textAlign = "center";
            ctx.textBaseline = "middle";
            ctx.fillText("?", width / 2, height / 2);
        } else {
            const isBonus = cardData && cardData.type === "bonus";
            ctx.fillStyle = isBonus ? "#1e3799" : "#b71540";
            ctx.fillRect(0, 0, width, height);

            ctx.strokeStyle = isBonus ? "#f6b93b" : "#ff6b6b";
            ctx.lineWidth = 6;
            ctx.strokeRect(6, 6, width - 12, height - 12);

            if (isBonus) {
                const roses = cardData ? cardData.roses : 1;
                for (let i = 0; i < roses; i++) {
                    const rx = (width / (roses + 1)) * (i + 1) - 20;
                    this.drawRose(ctx, rx, 40, 40);
                }
            } else {
                ctx.fillStyle = "#ffffff";
                ctx.font = "40px sans-serif";
                ctx.textAlign = "center";
                ctx.fillText("⚡", width / 2, 80);
            }

            ctx.fillStyle = "#ffffff";
            ctx.font = "bold 15px 'Segoe UI', Tahoma, sans-serif";
            ctx.textAlign = "center";
            ctx.fillText(cardData ? cardData.title : "THẺ BÍ ẨN", width / 2, 140);

            ctx.fillStyle = isBonus ? "#f1c40f" : "#ff7675";
            ctx.font = "bold 22px 'Segoe UI', Tahoma, sans-serif";
            const effectText = isBonus ? `+${cardData.roses} HOA HỒNG!` : `${cardData.roses} HOA HỒNG!`;
            ctx.fillText(effectText, width / 2, 180);

            ctx.fillStyle = "#ecf0f1";
            ctx.font = "12px 'Segoe UI', Tahoma, sans-serif";
            this._wrapText(ctx, cardData ? cardData.description : "", width / 2, 215, width - 30, 16);
        }

        ctx.restore();
    },

    // ========================================================
    // 11. VẼ RƯƠNG KHO BÁU (TREASURE CHEST)
    // ========================================================
    drawTreasureChest(ctx, x, y, size = 120, isOpen = false) {
        ctx.save();
        ctx.translate(x, y);
        const s = size / 32;

        if (isOpen) {
            const grad = ctx.createRadialGradient(16 * s, 14 * s, 2 * s, 16 * s, 14 * s, 20 * s);
            grad.addColorStop(0, "rgba(255, 242, 0, 0.9)");
            grad.addColorStop(0.5, "rgba(255, 177, 0, 0.5)");
            grad.addColorStop(1, "rgba(255, 255, 255, 0)");
            ctx.fillStyle = grad;
            ctx.beginPath();
            ctx.arc(16 * s, 14 * s, 24 * s, 0, Math.PI * 2);
            ctx.fill();

            ctx.fillStyle = "#8a5323";
            ctx.fillRect(4 * s, 0 * s, 24 * s, 8 * s);
            ctx.fillStyle = "#f1c40f";
            ctx.fillRect(8 * s, 0 * s, 3 * s, 8 * s);
            ctx.fillRect(21 * s, 0 * s, 3 * s, 8 * s);

            ctx.fillStyle = "#5c3317";
            ctx.fillRect(4 * s, 14 * s, 24 * s, 14 * s);

            ctx.fillStyle = "#f1c40f";
            ctx.fillRect(6 * s, 12 * s, 20 * s, 6 * s);
            ctx.fillStyle = "#ffffff";
            ctx.fillRect(10 * s, 13 * s, 3 * s, 3 * s);
            ctx.fillRect(18 * s, 11 * s, 4 * s, 4 * s);

            ctx.fillStyle = "#f39c12";
            ctx.fillRect(4 * s, 14 * s, 24 * s, 2 * s);
            ctx.fillRect(8 * s, 14 * s, 3 * s, 14 * s);
            ctx.fillRect(21 * s, 14 * s, 3 * s, 14 * s);

            ctx.fillStyle = "#f1c40f";
            ctx.fillRect(13 * s, 5 * s, 6 * s, 6 * s);
            ctx.fillStyle = "#e74c3c";
            ctx.fillRect(15 * s, 6 * s, 2 * s, 2 * s);
        } else {
            ctx.fillStyle = "#8a5323";
            ctx.fillRect(4 * s, 6 * s, 24 * s, 10 * s);
            ctx.fillStyle = "#f1c40f";
            ctx.fillRect(8 * s, 6 * s, 3 * s, 10 * s);
            ctx.fillRect(21 * s, 6 * s, 3 * s, 10 * s);

            ctx.fillStyle = "#5c3317";
            ctx.fillRect(4 * s, 16 * s, 24 * s, 12 * s);
            ctx.fillStyle = "#f39c12";
            ctx.fillRect(4 * s, 16 * s, 24 * s, 2 * s);
            ctx.fillRect(8 * s, 16 * s, 3 * s, 12 * s);
            ctx.fillRect(21 * s, 16 * s, 3 * s, 12 * s);

            ctx.fillStyle = "#f1c40f";
            ctx.fillRect(14 * s, 14 * s, 4 * s, 5 * s);
            ctx.fillStyle = "#2c3e50";
            ctx.fillRect(15.5 * s, 16 * s, 1 * s, 2 * s);
        }

        ctx.restore();
    },

    // ========================================================
    // 12. VẼ THUNG LŨNG VỰC THẲM (VALLEY OF DOOM)
    // ========================================================
    drawValleyScene(ctx, width, height, fallProgress = 0) {
        const skyGrad = ctx.createLinearGradient(0, 0, 0, height);
        skyGrad.addColorStop(0, "#0a0612");
        skyGrad.addColorStop(0.6, "#1a0f2b");
        skyGrad.addColorStop(1, "#0d0914");
        ctx.fillStyle = skyGrad;
        ctx.fillRect(0, 0, width, height);

        ctx.fillStyle = "#1e152a";
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.lineTo(width * 0.28, 0);
        ctx.lineTo(width * 0.22, height * 0.4);
        ctx.lineTo(width * 0.35, height * 0.7);
        ctx.lineTo(width * 0.2, height);
        ctx.lineTo(0, height);
        ctx.closePath();
        ctx.fill();

        ctx.fillStyle = "#1e152a";
        ctx.beginPath();
        ctx.moveTo(width, 0);
        ctx.lineTo(width * 0.72, 0);
        ctx.lineTo(width * 0.78, height * 0.35);
        ctx.lineTo(width * 0.65, height * 0.68);
        ctx.lineTo(width * 0.8, height);
        ctx.lineTo(width, height);
        ctx.closePath();
        ctx.fill();

        const fogGrad = ctx.createLinearGradient(0, height * 0.7, 0, height);
        fogGrad.addColorStop(0, "rgba(88, 30, 110, 0)");
        fogGrad.addColorStop(1, "rgba(88, 30, 110, 0.8)");
        ctx.fillStyle = fogGrad;
        ctx.fillRect(0, height * 0.7, width, height * 0.3);

        const heroY = (height * 0.15) + (height * 0.75) * Math.min(fallProgress, 1.0);
        const heroX = width * 0.5 + Math.sin(fallProgress * 8) * 30;
        this.drawFallingHero(ctx, heroX, heroY, 40, fallProgress);
    },

    drawFallingHero(ctx, x, y, size = 40, progress = 0) {
        ctx.save();
        ctx.translate(x, y);
        ctx.rotate(progress * Math.PI * 3);

        const s = size / 16;
        ctx.fillStyle = "#2980b9";
        ctx.fillRect(-6 * s, -4 * s, 12 * s, 10 * s);

        ctx.fillStyle = "#bdc3c7";
        ctx.fillRect(-4 * s, -8 * s, 8 * s, 8 * s);
        ctx.fillStyle = "#00d2d3";
        ctx.fillRect(-3 * s, -6 * s, 6 * s, 3 * s);

        ctx.fillStyle = "#7f8c8d";
        ctx.fillRect(-7 * s, -2 * s, 3 * s, 6 * s);
        ctx.fillRect(4 * s, -2 * s, 3 * s, 6 * s);
        ctx.fillRect(-4 * s, 6 * s, 3 * s, 6 * s);
        ctx.fillRect(1 * s, 6 * s, 3 * s, 6 * s);

        ctx.restore();
    },

    _wrapText(ctx, text, x, y, maxWidth, lineHeight) {
        const words = text.split(" ");
        let line = "";
        for (let n = 0; n < words.length; n++) {
            const testLine = line + words[n] + " ";
            const metrics = ctx.measureText(testLine);
            if (metrics.width > maxWidth && n > 0) {
                ctx.fillText(line, x, y);
                line = words[n] + " ";
                y += lineHeight;
            } else {
                line = testLine;
            }
        }
        ctx.fillText(line, x, y);
    }
};

window.PixelSprites = PixelSprites;
