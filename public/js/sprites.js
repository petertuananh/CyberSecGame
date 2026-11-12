/**
 * Procedural Pixel Art Sprites & Canvas Renderers
 * Tự động vẽ các thành phần đồ họa phong cách Pixel Art 16-bit
 * TÍCH HỢP HIỆU ỨNG THỜI TIẾT TƯƠNG HỖ (NẮNG, MƯA, TUYẾT):
 *  - CÂY CỐI: Tuyết đọng trắng trên tán cây, mưa làm cây lay động mạnh & ướt sũng, nắng làm lá óng ả
 *  - MẶT NƯỚC: Mưa tạo gợn sóng tóe bọt, tuyết tạo tảng băng trôi lững lờ, nắng chiếu vệt sáng rực rỡ
 *  - MÂY TRỜI: Bão xám mây đen sấm chớp khi mưa, mây tuyết băng giá, trời xanh nắng vàng
 *  - NHÂN VẬT: Hơi thở tỏa khói trắng khi tuyết lạnh, áo choàng tung bay trong mưa bão
 */

const PixelSprites = {
    // ========================================================
    // 1. NHÂN VẬT VỆ BINH PHIÊU LƯU (ADVENTURER / CYBER KNIGHT)
    // ========================================================
    drawAdventurer(ctx, x, y, size = 48, walkFrame = 0, direction = 1, isWalking = true, rosesCount = 1, weather = null) {
        if (!weather && window.WeatherSystem) {
            weather = window.WeatherSystem.currentType;
        }
        if (!weather) weather = 'SUNNY';

        ctx.save();
        ctx.translate(x, y);
        if (direction === -1) {
            ctx.scale(-1, 1);
        }

        const s = size / 24; // 24x24 pixel grid
        const bob = isWalking ? Math.abs(Math.sin(walkFrame * 8)) * 2 * s : 0;

        // 1. Áo choàng phía sau (Cape - bay mạnh hơn khi có mưa bão)
        const windMulti = (weather === 'RAIN') ? 2.2 : 1.0;
        const capeWave = isWalking 
            ? Math.sin(walkFrame * 8 * windMulti + 1) * 3.5 * s 
            : Math.sin(walkFrame * 2.5 * windMulti) * 2 * s;

        ctx.fillStyle = (weather === 'RAIN') ? "#142952" : "#1e3799";
        ctx.beginPath();
        ctx.moveTo(7 * s, 8 * s - bob);
        ctx.lineTo(2 * s - capeWave, 18 * s);
        ctx.lineTo(6 * s - capeWave, 21 * s);
        ctx.lineTo(10 * s, 14 * s - bob);
        ctx.closePath();
        ctx.fill();

        // 2. Chân trái & Chân phải
        const legLeftOffset = isWalking ? Math.sin(walkFrame * 8) * 3 * s : 0;
        const legRightOffset = isWalking ? -Math.sin(walkFrame * 8) * 3 * s : 0;

        ctx.fillStyle = "#2c3e50";
        ctx.fillRect(8 * s - legLeftOffset, 16 * s - bob, 3 * s, 6 * s + legLeftOffset * 0.4);
        ctx.fillStyle = "#34495e";
        ctx.fillRect(7 * s - legLeftOffset, 21 * s, 4 * s, 3 * s);

        ctx.fillStyle = "#34495e";
        ctx.fillRect(13 * s + legRightOffset, 16 * s - bob, 3 * s, 6 * s - legRightOffset * 0.4);
        ctx.fillStyle = "#2c3e50";
        ctx.fillRect(13 * s + legRightOffset, 21 * s, 4 * s, 3 * s);

        // 3. Thân áo giáp
        ctx.fillStyle = "#4a69bd";
        ctx.fillRect(8 * s, 9 * s - bob, 8 * s, 8 * s);
        ctx.fillStyle = "#6a89cc";
        ctx.fillRect(10 * s, 10 * s - bob, 5 * s, 6 * s);
        ctx.fillStyle = "#f1c40f";
        ctx.fillRect(12 * s, 12 * s - bob, 2 * s, 2 * s);

        ctx.fillStyle = "#2c3e50";
        ctx.fillRect(8 * s, 15 * s - bob, 8 * s, 2 * s);
        ctx.fillStyle = "#f39c12";
        ctx.fillRect(11 * s, 15 * s - bob, 2 * s, 2 * s);

        // 4. Đầu & Mũ giáp Cyber
        ctx.fillStyle = "#dfe4ea";
        ctx.fillRect(9 * s, 3 * s - bob, 7 * s, 6 * s);

        ctx.fillStyle = "#00d2d3";
        ctx.fillRect(12 * s, 5 * s - bob, 5 * s, 2.5 * s);
        ctx.fillStyle = "#ffffff";
        ctx.fillRect(14 * s, 5 * s - bob, 1.5 * s, 1 * s);

        ctx.fillStyle = "#e74c3c";
        ctx.fillRect(8 * s, 2 * s - bob, 8 * s, 2 * s);
        ctx.fillRect(7 * s, 3 * s - bob, 2 * s, 2 * s);

        // ========================================================
        // PHỤ KIỆN THỜI TIẾT TƯƠNG TÁC LÊN NHÂN VẬT:
        // ========================================================
        if (weather === 'SUNNY') {
            // ☀️ Khi NẮNG: Đội nón phiêu lưu rộng vành + Đeo kính râm ngầu
            ctx.fillStyle = "#d35400";
            ctx.fillRect(4 * s, 1 * s - bob, 18 * s, 2.5 * s); // Vành nón rộng
            ctx.fillStyle = "#f39c12";
            ctx.fillRect(7 * s, -2.5 * s - bob, 11 * s, 3.5 * s); // Chóp nón
            ctx.fillStyle = "#c0392b";
            ctx.fillRect(7 * s, 0 * s - bob, 11 * s, 1.2 * s); // Dải băng đỏ

            // Kính mát râm pixel sành điệu
            ctx.fillStyle = "#1e272e";
            ctx.fillRect(12 * s, 5 * s - bob, 5 * s, 2.5 * s);
            ctx.fillStyle = "#00d2d3";
            ctx.fillRect(12.5 * s, 5.5 * s - bob, 1.5 * s, 1 * s);
            ctx.fillRect(15 * s, 5.5 * s - bob, 1.5 * s, 1 * s);
        } else if (weather === 'RAIN') {
            // 🌧️ Khi MƯA: Che chiếc dù pixel đỏ sọc vàng rực rỡ
            // Cán dù kim loại
            ctx.fillStyle = "#bdc3c7";
            ctx.fillRect(6 * s, -9 * s - bob, 1.5 * s, 18 * s);
            // Tay cầm móc cong
            ctx.fillStyle = "#7f8c8d";
            ctx.fillRect(4.5 * s, 8 * s - bob, 3 * s, 1.5 * s);
            ctx.fillRect(4.5 * s, 6.5 * s - bob, 1.5 * s, 2 * s);

            // Tán dù pixel bậc thang (Stepped pixel dome)
            ctx.fillStyle = "#e74c3c";
            ctx.fillRect(-1 * s, -14 * s - bob, 16 * s, 5 * s);
            ctx.fillRect(1 * s, -17 * s - bob, 12 * s, 3.5 * s);
            ctx.fillRect(4 * s, -20 * s - bob, 6 * s, 3.5 * s);

            // Sọc vàng nổi bật trên tán dù
            ctx.fillStyle = "#f1c40f";
            ctx.fillRect(5 * s, -20 * s - bob, 3 * s, 11 * s);
            ctx.fillRect(-1 * s, -10 * s - bob, 16 * s, 1.5 * s);

            // Chóp kim loại đỉnh dù
            ctx.fillStyle = "#ffffff";
            ctx.fillRect(6.2 * s, -22 * s - bob, 1.2 * s, 2.5 * s);

            // Giọt nước nảy trên mép dù
            const splashTick = (walkFrame * 6) % 1;
            ctx.fillStyle = "rgba(180, 225, 255, 0.85)";
            ctx.fillRect(-2 * s - splashTick * 2 * s, -12 * s - bob - splashTick * 2 * s, 1.5 * s, 1.5 * s);
            ctx.fillRect(15 * s + splashTick * 2 * s, -12 * s - bob - splashTick * 2 * s, 1.5 * s, 1.5 * s);
        } else if (weather === 'SNOW') {
            // ❄️ Khi TUYẾT: Mũ len có quả bông, Khăn len đỏ quàng cổ dày, Áo ấm
            // Quả bông len trắng trên đỉnh đầu
            ctx.fillStyle = "#ffffff";
            ctx.fillRect(10 * s, -1.5 * s - bob, 4 * s, 3 * s);
            // Mũ len ấm áp màu đỏ
            ctx.fillStyle = "#c0392b";
            ctx.fillRect(8 * s, 1 * s - bob, 9 * s, 2.5 * s);

            // Cổ áo lót lông trắng
            ctx.fillStyle = "#ecf0f1";
            ctx.fillRect(7 * s, 7 * s - bob, 10 * s, 2 * s);

            // Khăn len quàng cổ dày
            ctx.fillStyle = "#c0392b";
            ctx.fillRect(7 * s, 8 * s - bob, 10 * s, 3 * s);
            // Vạt khăn rủ xuống bay trong gió lạnh
            const scarfWave = Math.sin(walkFrame * 4) * 2 * s;
            ctx.fillRect(10 * s, 11 * s - bob, 3 * s, 6 * s);
            ctx.fillStyle = "#e74c3c";
            ctx.fillRect(10 * s + scarfWave, 17 * s - bob, 3 * s, 1.8 * s); // Tua rua đỏ sáng

            // Hơi thở tỏa khói trắng
            const smokePuff = (Math.sin(walkFrame * 3) + 1) * 0.5;
            if (smokePuff > 0.3) {
                ctx.fillStyle = `rgba(255, 255, 255, ${smokePuff * 0.6})`;
                ctx.fillRect(18 * s + smokePuff * 5, 4 * s - bob - smokePuff * 3, 3 * s, 2.5 * s);
                ctx.fillRect(20 * s + smokePuff * 7, 2 * s - bob - smokePuff * 5, 2.5 * s, 2.5 * s);
            }
        }

        // 5. Tay & Găng tay ấm khi tuyết
        const armSwing = isWalking ? -Math.sin(walkFrame * 8) * 2 * s : 0;
        ctx.fillStyle = "#6a89cc";
        ctx.fillRect(11 * s, 11 * s - bob + armSwing, 3 * s, 5 * s);
        // Bàn tay / Bao tay len khi tuyết
        ctx.fillStyle = (weather === 'SNOW') ? "#e74c3c" : "#dfe4ea";
        ctx.fillRect(12 * s, 15 * s - bob + armSwing, 2.5 * s, 2.5 * s);

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
    // 3. VÒNG 1: KHU RỪNG MẬT MÃ (CÂY, CHIM, HOA CỎ, ĐOM ĐÓM + THỜI TIẾT)
    // ========================================================
    drawForestWorld(ctx, w, h, time, birds = [], weather = 'SUNNY') {
        // 1. Bầu trời thay đổi theo thời tiết
        const skyGrad = ctx.createLinearGradient(0, 0, 0, h);
        if (weather === 'RAIN') {
            // Trời mưa bão xám u tối
            skyGrad.addColorStop(0, "#0b1712");
            skyGrad.addColorStop(0.5, "#14241c");
            skyGrad.addColorStop(1, "#08120d");
        } else if (weather === 'SNOW') {
            // Trời mùa đông tuyết lạnh xám băng giá
            skyGrad.addColorStop(0, "#192a32");
            skyGrad.addColorStop(0.5, "#253b47");
            skyGrad.addColorStop(1, "#101e26");
        } else {
            // Trời nắng xanh ngọc huyền ảo
            skyGrad.addColorStop(0, "#082613");
            skyGrad.addColorStop(0.5, "#0b3b1c");
            skyGrad.addColorStop(1, "#031508");
        }
        ctx.fillStyle = skyGrad;
        ctx.fillRect(0, 0, w, h);

        // 2. Lớp cây xa
        const treeFarColor1 = (weather === 'SNOW') ? "#162f2d" : (weather === 'RAIN' ? "#051f10" : "#062b16");
        const treeFarColor2 = (weather === 'SNOW') ? "#0f2220" : (weather === 'RAIN' ? "#03140a" : "#041b0d");
        for (let i = 0; i < 9; i++) {
            const tx = i * 160 - 40;
            this._drawPixelTree(ctx, tx, h * 0.35, 120, 180, treeFarColor1, treeFarColor2, weather);
        }

        // 3. Lớp cây gần lay động theo gió (gió bão lay mạnh hơn)
        const windPower = (weather === 'RAIN') ? 6 : (weather === 'SNOW' ? 2 : 3);
        const windFreq = (weather === 'RAIN') ? 3.0 : 1.5;

        for (let i = 0; i < 7; i++) {
            const tx = i * 220 + 20;
            const sway = Math.sin(time * windFreq + i) * windPower;
            const c1 = (weather === 'SNOW') ? "#1e5245" : (weather === 'RAIN' ? "#114726" : "#196f3d");
            const c2 = (weather === 'SNOW') ? "#143a31" : (weather === 'RAIN' ? "#0a2e19" : "#0e4424");
            this._drawPixelTree(ctx, tx + sway, h * 0.45, 150, 240, c1, c2, weather);
        }

        // 4. Mặt đất rừng & cỏ (Tuyết phủ trắng nếu là mùa đông tuyết)
        if (weather === 'SNOW') {
            // Mặt đất phủ tuyết trắng xóa
            ctx.fillStyle = "#dcdde1";
            ctx.fillRect(0, h - 80, w, 80);
            ctx.fillStyle = "#f5f6fa"; // Lớp tuyết xốp bên trên
            ctx.fillRect(0, h - 86, w, 8);

            // Bụi cỏ phủ tuyết
            for (let i = 0; i < w; i += 30) {
                const grassH = 5 + (Math.sin(i * 13) + 1) * 3;
                ctx.fillStyle = "#ffffff";
                ctx.fillRect(i, h - 86 - grassH, 4, grassH);

                if (i % 150 === 30) {
                    this._drawMushroom(ctx, i, h - 86, true);
                }
            }
        } else {
            // Mặt đất xanh tươi / ẩm ướt khi mưa
            ctx.fillStyle = (weather === 'RAIN') ? "#152617" : "#1e3a1f";
            ctx.fillRect(0, h - 80, w, 80);
            ctx.fillStyle = (weather === 'RAIN') ? "#1e8449" : "#27ae60";
            ctx.fillRect(0, h - 84, w, 6);

            for (let i = 0; i < w; i += 30) {
                const grassH = 6 + (Math.sin(i * 13) + 1) * 4;
                ctx.fillStyle = (i % 60 === 0) ? "#2ecc71" : "#1abc9c";
                ctx.fillRect(i, h - 84 - grassH, 4, grassH);

                if (i % 150 === 30) {
                    this._drawMushroom(ctx, i, h - 84, false);
                }
            }
        }

        // 5. Chim chóc trong rừng (bay trốn mưa hoặc lượn thảnh thơi)
        if (weather !== 'RAIN' || Math.sin(time) > 0) {
            birds.forEach(b => {
                this.drawBird(ctx, b.x, b.y, b.vx, time + b.offset, "#f39c12");
            });
        }

        // 6. Đom đóm bay lấp lánh (sáng rực khi trời tối/mưa)
        if (weather !== 'SNOW') {
            const count = (weather === 'RAIN') ? 8 : 18;
            for (let i = 0; i < count; i++) {
                const fx = (Math.sin(time * 0.8 + i * 2) * 0.4 + 0.5) * w;
                const fy = (Math.cos(time * 0.6 + i * 3) * 0.3 + 0.5) * (h - 100);
                const pulse = (Math.sin(time * 4 + i) + 1) * 0.5;

                ctx.fillStyle = `rgba(241, 196, 15, ${pulse * 0.8})`;
                ctx.fillRect(fx, fy, 4, 4);
                ctx.fillStyle = `rgba(255, 255, 255, ${pulse})`;
                ctx.fillRect(fx + 1, fy + 1, 2, 2);
            }
        }
    },

    // Vẽ 1 Cây thông Pixel (Tích hợp tuyết đọng trên tán lá nếu có tuyết)
    _drawPixelTree(ctx, x, y, width, height, leafColor1, leafColor2, weather = 'SUNNY') {
        // Thân cây gỗ
        ctx.fillStyle = "#4a2d14";
        ctx.fillRect(x + width * 0.42, y + height * 0.5, width * 0.16, height * 0.5);

        // Tán lá 3 tầng
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

            // Nếu thời tiết TUYẾT: Đọng lớp tuyết trắng xóa trên đỉnh mỗi tầng lá!
            if (weather === 'SNOW') {
                ctx.fillStyle = "#ffffff";
                // Lớp tuyết trên viền tầng lá
                ctx.fillRect(lx + 4, ly + l.h - 5, l.w - 8, 5);
                ctx.fillRect(lx + 8, ly + l.h - 7, l.w - 16, 3);
                // Chóp tuyết trên đỉnh
                if (idx === 2) {
                    ctx.fillRect(x + width / 2 - 4, ly - 3, 8, 6);
                }
            } else {
                ctx.fillStyle = "rgba(255, 255, 255, 0.1)";
                ctx.fillRect(lx + 6, ly + l.h - 4, l.w - 12, 3);
            }
        });
    },

    // Vẽ Nấm rừng (Có thể phủ tuyết)
    _drawMushroom(ctx, x, y, hasSnow = false) {
        ctx.fillStyle = "#ecf0f1";
        ctx.fillRect(x + 3, y - 8, 4, 8);
        ctx.fillStyle = "#e74c3c";
        ctx.fillRect(x, y - 14, 10, 6);
        ctx.fillRect(x + 2, y - 16, 6, 2);

        ctx.fillStyle = "#ffffff";
        ctx.fillRect(x + 2, y - 13, 2, 2);
        ctx.fillRect(x + 6, y - 13, 2, 2);

        // Mũ nấm phủ tuyết trắng
        if (hasSnow) {
            ctx.fillStyle = "#ffffff";
            ctx.fillRect(x + 1, y - 18, 8, 3);
        }
    },

    // ========================================================
    // 4. VÒNG 2: VÙNG BIỂN DỮ LIỆU (CÁ, RONG RÊU, SAN HÔ + THỜI TIẾT)
    // ========================================================
    drawWaterWorld(ctx, w, h, time, fishes = [], bubbles = [], weather = 'SUNNY') {
        const seaGrad = ctx.createLinearGradient(0, 0, 0, h);
        if (weather === 'RAIN') {
            // Biển bão tối sầm
            seaGrad.addColorStop(0, "#08375e");
            seaGrad.addColorStop(0.4, "#062242");
            seaGrad.addColorStop(1, "#020c1a");
        } else if (weather === 'SNOW') {
            // Biển băng bắc cực lạnh buốt xanh ngọc băng
            seaGrad.addColorStop(0, "#1289a7");
            seaGrad.addColorStop(0.4, "#0c3b5e");
            seaGrad.addColorStop(1, "#031526");
        } else {
            // Biển nắng ấm rực rỡ
            seaGrad.addColorStop(0, "#0984e3");
            seaGrad.addColorStop(0.3, "#0056b3");
            seaGrad.addColorStop(0.7, "#0c2461");
            seaGrad.addColorStop(1, "#041033");
        }
        ctx.fillStyle = seaGrad;
        ctx.fillRect(0, 0, w, h);

        // Vệt nắng khúc xạ (Mạnh khi nắng, yếu khi mưa/tuyết)
        if (weather === 'SUNNY') {
            ctx.fillStyle = "rgba(255, 255, 255, 0.06)";
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
        }

        // TẢNG BĂNG TRÔI PIXEL (Nếu thời tiết là TUYẾT)
        if (weather === 'SNOW') {
            for (let i = 0; i < 4; i++) {
                const iceX = ((i * 360 + time * 18) % (w + 200)) - 100;
                const iceY = 30 + Math.sin(time * 2 + i) * 5;
                this._drawIceFloe(ctx, iceX, iceY, 70 + (i % 2) * 30);
            }
        }

        // Đáy biển
        ctx.fillStyle = (weather === 'SNOW') ? "#8395a7" : "#e58e26";
        ctx.fillRect(0, h - 70, w, 70);
        ctx.fillStyle = (weather === 'SNOW') ? "#576574" : "#b76b16";
        ctx.fillRect(0, h - 75, w, 5);

        // San hô
        for (let i = 40; i < w; i += 180) {
            const coralColor = (weather === 'SNOW') ? "#74b9ff" : ((i % 2 === 0) ? "#e84393" : "#fd79a8");
            this._drawCoral(ctx, i, h - 75, coralColor);
        }

        // Rong rêu uốn lượn (Sóng bão mưa uốn mạnh hơn)
        const seaweedSpeed = (weather === 'RAIN') ? 3.5 : 2.0;
        for (let i = 15; i < w; i += 45) {
            const kelpH = 80 + (Math.sin(i * 9) + 1) * 40;
            const color = (weather === 'SNOW') ? "#48dbfb" : ((i % 90 === 0) ? "#00b894" : "#00cec9");
            this._drawSwayingSeaweed(ctx, i, h - 75, kelpH, time * (seaweedSpeed / 2.0), color);
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

    // Vẽ Tảng băng trôi Pixel (Ice Floe)
    _drawIceFloe(ctx, x, y, width) {
        ctx.save();
        ctx.fillStyle = "#ffffff";
        ctx.fillRect(x, y, width, 14);
        ctx.fillRect(x + 4, y - 6, width - 12, 8);

        // Chân băng chìm dưới nước xanh lơ
        ctx.fillStyle = "#74b9ff";
        ctx.fillRect(x + 6, y + 14, width - 16, 12);
        ctx.fillRect(x + 14, y + 26, width - 32, 8);
        ctx.restore();
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
    // 5. VÒNG 3: TẦNG MÂY THƯỢNG ĐỈNH (+ THỜI TIẾT)
    // ========================================================
    drawCloudWorld(ctx, w, h, time, birds = [], weather = 'SUNNY') {
        const skyGrad = ctx.createLinearGradient(0, 0, 0, h);
        if (weather === 'RAIN') {
            // Trời mưa bão sấm sét trên mây
            skyGrad.addColorStop(0, "#19172e");
            skyGrad.addColorStop(0.4, "#272347");
            skyGrad.addColorStop(0.8, "#34284d");
            skyGrad.addColorStop(1, "#171526");
        } else if (weather === 'SNOW') {
            // Mùa đông băng giá trên mây
            skyGrad.addColorStop(0, "#303952");
            skyGrad.addColorStop(0.4, "#596275");
            skyGrad.addColorStop(0.8, "#778ca3");
            skyGrad.addColorStop(1, "#4b6584");
        } else {
            // Nắng đẹp rực rỡ
            skyGrad.addColorStop(0, "#4834d4");
            skyGrad.addColorStop(0.4, "#686de0");
            skyGrad.addColorStop(0.8, "#be2edd");
            skyGrad.addColorStop(1, "#22a6b3");
        }
        ctx.fillStyle = skyGrad;
        ctx.fillRect(0, 0, w, h);

        // Mặt trời công nghệ (chỉ khi NẮNG)
        if (weather === 'SUNNY') {
            ctx.fillStyle = "#f9ca24";
            ctx.beginPath();
            ctx.arc(w * 0.82, h * 0.22, 50, 0, Math.PI * 2);
            ctx.fill();
            ctx.fillStyle = "rgba(249, 202, 36, 0.25)";
            ctx.beginPath();
            ctx.arc(w * 0.82, h * 0.22, 75, 0, Math.PI * 2);
            ctx.fill();
        }

        // Đảo bay lơ lửng (phủ tuyết nếu là tuyết)
        this._drawFloatingIsland(ctx, w * 0.15, h * 0.38, 120, time * 0.5, weather);
        this._drawFloatingIsland(ctx, w * 0.70, h * 0.30, 160, time * 0.5 + 2, weather);

        // Mây cuộn trôi Parallax (đổi màu theo mưa/tuyết)
        const cloudColorFar = (weather === 'RAIN') ? "rgba(90, 85, 115, 0.45)" : (weather === 'SNOW' ? "rgba(223, 230, 233, 0.5)" : "rgba(255, 255, 255, 0.45)");
        const cloudColorMid = (weather === 'RAIN') ? "rgba(70, 65, 95, 0.75)" : (weather === 'SNOW' ? "rgba(245, 246, 250, 0.8)" : "rgba(255, 255, 255, 0.75)");

        for (let i = 0; i < 5; i++) {
            const cx = ((i * 320 + time * 15) % (w + 400)) - 200;
            this._drawFluffyCloud(ctx, cx, h * 0.18 + (i % 2) * 50, 140, cloudColorFar);
        }

        for (let i = 0; i < 4; i++) {
            const cx = ((i * 380 + time * 30) % (w + 400)) - 200;
            this._drawFluffyCloud(ctx, cx, h * 0.45 + (i % 2) * 40, 180, cloudColorMid);
        }

        // Chim chao lượn trên trời mây
        if (weather !== 'RAIN') {
            birds.forEach(b => {
                this.drawBird(ctx, b.x, b.y, b.vx, time + b.offset, "#ffffff");
            });
        }

        // Thảm mây đáy
        const bottomCloud = (weather === 'RAIN') ? "#484360" : (weather === 'SNOW' ? "#dcdde1" : "#ffffff");
        ctx.fillStyle = bottomCloud;
        ctx.fillRect(0, h - 60, w, 60);
        for (let i = -50; i < w + 50; i += 60) {
            const puffY = h - 60 + Math.sin(time * 2 + i) * 6;
            ctx.beginPath();
            ctx.arc(i, puffY, 40, 0, Math.PI * 2);
            ctx.fill();
        }
        ctx.fillStyle = (weather === 'RAIN') ? "#342e47" : (weather === 'SNOW' ? "#b2bec3" : "#dfe4ea");
        ctx.fillRect(0, h - 30, w, 30);
    },

    _drawFloatingIsland(ctx, x, y, width, bobTime, weather = 'SUNNY') {
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

        if (weather === 'SNOW') {
            // Đảo bay phủ tuyết trắng
            ctx.fillStyle = "#dfe4ea";
            ctx.fillRect(0, 6, width, 12);
            ctx.fillStyle = "#ffffff";
            ctx.fillRect(4, 2, width - 8, 6);
        } else {
            ctx.fillStyle = "#2ed573";
            ctx.fillRect(0, 6, width, 12);
            ctx.fillStyle = "#7bed9f";
            ctx.fillRect(4, 2, width - 8, 5);
        }

        // Tinh thể phát sáng
        ctx.fillStyle = (weather === 'SNOW') ? "#70a1ff" : "#00d2d3";
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
            ctx.font = "bold 18px 'Segoe UI', Tahoma, sans-serif";
            ctx.textAlign = "center";
            ctx.fillText(cardData ? cardData.title : "THẺ BÍ ẨN", width / 2, 138);

            ctx.fillStyle = isBonus ? "#f1c40f" : "#ff7675";
            ctx.font = "bold 26px 'Segoe UI', Tahoma, sans-serif";
            const effectText = isBonus ? `+${cardData.roses} HOA HỒNG!` : `${cardData.roses} HOA HỒNG!`;
            ctx.fillText(effectText, width / 2, 178);

            ctx.fillStyle = "#f1f2f6";
            ctx.font = "bold 15px 'Segoe UI', Tahoma, sans-serif";
            this._wrapText(ctx, cardData ? cardData.description : "", width / 2, 214, width - 30, 21);
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
    },

    // ========================================================
    // 13. VẼ HỆ THỐNG ICON PIXEL 16-BIT THUẦN (THAY THẾ EMOJI)
    // ========================================================
    drawPixelIcon(ctx, iconName, x, y, size = 16) {
        if (!ctx) return;
        ctx.save();
        const s = size / 16;
        const key = (iconName || '').toLowerCase().trim();

        switch (key) {
            case 'phone':
            case 'mobile': {
                ctx.fillStyle = "#334155";
                ctx.fillRect(x + 4 * s, y + 1 * s, 8 * s, 14 * s);
                ctx.fillStyle = "#38bdf8";
                ctx.fillRect(x + 5 * s, y + 3 * s, 6 * s, 9 * s);
                ctx.fillStyle = "#e2e8f0";
                ctx.fillRect(x + 7 * s, y + 2 * s, 2 * s, 0.8 * s);
                ctx.fillRect(x + 7 * s, y + 13 * s, 2 * s, 1 * s);
                ctx.fillStyle = "#a855f7";
                ctx.fillRect(x + 13 * s, y + 4 * s, 1.5 * s, 1.5 * s);
                ctx.fillRect(x + 14 * s, y + 6 * s, 1.5 * s, 4 * s);
                break;
            }

            case 'tree':
            case 'forest': {
                // Thân cây gỗ
                ctx.fillStyle = "#795548";
                ctx.fillRect(x + 7 * s, y + 11 * s, 2 * s, 5 * s);
                // Tán lá 3 tầng
                ctx.fillStyle = "#27ae60";
                ctx.fillRect(x + 2 * s, y + 8 * s, 12 * s, 3.5 * s);
                ctx.fillStyle = "#2ecc71";
                ctx.fillRect(x + 4 * s, y + 5 * s, 8 * s, 3.5 * s);
                ctx.fillStyle = "#1abc9c";
                ctx.fillRect(x + 6 * s, y + 2 * s, 4 * s, 3.5 * s);
                ctx.fillRect(x + 7 * s, y + 1 * s, 2 * s, 1.5 * s);
                // Đốm sáng lá
                ctx.fillStyle = "#a8e6cf";
                ctx.fillRect(x + 5 * s, y + 6 * s, 2 * s, 1 * s);
                ctx.fillRect(x + 7 * s, y + 3 * s, 1 * s, 1 * s);
                break;
            }

            case 'wave':
            case 'water':
            case 'ocean': {
                // Nền biển sâu
                ctx.fillStyle = "#1e3799";
                ctx.fillRect(x + 1 * s, y + 9 * s, 14 * s, 6 * s);
                // Thân sóng
                ctx.fillStyle = "#0984e3";
                ctx.fillRect(x + 2 * s, y + 6 * s, 11 * s, 4 * s);
                // Đỉnh ngọn sóng uốn
                ctx.fillStyle = "#00d2d3";
                ctx.fillRect(x + 3 * s, y + 4 * s, 7 * s, 3 * s);
                ctx.fillRect(x + 8 * s, y + 2 * s, 4 * s, 3 * s);
                // Bọt sóng trắng xóa
                ctx.fillStyle = "#ffffff";
                ctx.fillRect(x + 10 * s, y + 1 * s, 3 * s, 2 * s);
                ctx.fillRect(x + 8 * s, y + 3 * s, 2 * s, 1 * s);
                ctx.fillRect(x + 3 * s, y + 6 * s, 2 * s, 1 * s);
                break;
            }

            case 'cloud':
            case 'sky': {
                // Đáy mây xanh lơ đổ bóng
                ctx.fillStyle = "#74b9ff";
                ctx.fillRect(x + 2 * s, y + 10 * s, 12 * s, 3 * s);
                // Thân mây xám nhạt
                ctx.fillStyle = "#dfe6e9";
                ctx.fillRect(x + 1 * s, y + 7 * s, 14 * s, 4 * s);
                // Khối bông mây trắng tinh
                ctx.fillStyle = "#ffffff";
                ctx.fillRect(x + 3 * s, y + 5 * s, 5 * s, 3 * s);
                ctx.fillRect(x + 7 * s, y + 3 * s, 5 * s, 5 * s);
                ctx.fillRect(x + 2 * s, y + 7 * s, 12 * s, 3 * s);
                break;
            }

            case 'sun':
            case 'sunny': {
                // Tâm mặt trời vàng cam
                ctx.fillStyle = "#f39c12";
                ctx.fillRect(x + 5 * s, y + 5 * s, 6 * s, 6 * s);
                ctx.fillStyle = "#f1c40f";
                ctx.fillRect(x + 6 * s, y + 6 * s, 4 * s, 4 * s);
                // 4 Tia thẳng
                ctx.fillRect(x + 7 * s, y + 1 * s, 2 * s, 3 * s);
                ctx.fillRect(x + 7 * s, y + 12 * s, 2 * s, 3 * s);
                ctx.fillRect(x + 1 * s, y + 7 * s, 3 * s, 2 * s);
                ctx.fillRect(x + 12 * s, y + 7 * s, 3 * s, 2 * s);
                // 4 Tia chéo
                ctx.fillRect(x + 3 * s, y + 3 * s, 2 * s, 2 * s);
                ctx.fillRect(x + 11 * s, y + 3 * s, 2 * s, 2 * s);
                ctx.fillRect(x + 3 * s, y + 11 * s, 2 * s, 2 * s);
                ctx.fillRect(x + 11 * s, y + 11 * s, 2 * s, 2 * s);
                break;
            }

            case 'rain':
            case 'rainy': {
                // Mây mưa xám giông
                ctx.fillStyle = "#636e72";
                ctx.fillRect(x + 3 * s, y + 2 * s, 10 * s, 5 * s);
                ctx.fillStyle = "#b2bec3";
                ctx.fillRect(x + 4 * s, y + 1 * s, 8 * s, 3 * s);
                // Hạt mưa nghiêng màu xanh ngọc
                ctx.fillStyle = "#00d2d3";
                ctx.fillRect(x + 3 * s, y + 9 * s, 1.5 * s, 3 * s);
                ctx.fillRect(x + 7 * s, y + 8 * s, 1.5 * s, 3 * s);
                ctx.fillRect(x + 11 * s, y + 9 * s, 1.5 * s, 3 * s);
                ctx.fillRect(x + 5 * s, y + 12 * s, 1.5 * s, 3 * s);
                ctx.fillRect(x + 9 * s, y + 12 * s, 1.5 * s, 3 * s);
                break;
            }

            case 'snow':
            case 'snowy': {
                // Bông hoa tuyết pha lê 6 cánh
                ctx.fillStyle = "#ffffff";
                ctx.fillRect(x + 7 * s, y + 1 * s, 2 * s, 14 * s);
                ctx.fillRect(x + 1 * s, y + 7 * s, 14 * s, 2 * s);
                // Nhánh chéo
                ctx.fillRect(x + 4 * s, y + 4 * s, 2 * s, 2 * s);
                ctx.fillRect(x + 10 * s, y + 4 * s, 2 * s, 2 * s);
                ctx.fillRect(x + 4 * s, y + 10 * s, 2 * s, 2 * s);
                ctx.fillRect(x + 10 * s, y + 10 * s, 2 * s, 2 * s);
                // Mũi nhọn xanh băng
                ctx.fillStyle = "#74b9ff";
                ctx.fillRect(x + 5 * s, y + 2 * s, 1 * s, 1 * s);
                ctx.fillRect(x + 10 * s, y + 2 * s, 1 * s, 1 * s);
                ctx.fillRect(x + 5 * s, y + 13 * s, 1 * s, 1 * s);
                ctx.fillRect(x + 10 * s, y + 13 * s, 1 * s, 1 * s);
                break;
            }

            case 'rose':
            case 'flower': {
                // Cuống hoa xanh lá
                ctx.fillStyle = "#27ae60";
                ctx.fillRect(x + 7 * s, y + 8 * s, 2 * s, 7 * s);
                // Lá xanh non
                ctx.fillStyle = "#2ecc71";
                ctx.fillRect(x + 4 * s, y + 10 * s, 3 * s, 2 * s);
                ctx.fillRect(x + 9 * s, y + 12 * s, 3 * s, 2 * s);
                // Cánh hoa hồng đỏ thắm
                ctx.fillStyle = "#c0392b";
                ctx.fillRect(x + 4 * s, y + 2 * s, 8 * s, 6 * s);
                ctx.fillStyle = "#e74c3c";
                ctx.fillRect(x + 5 * s, y + 1 * s, 6 * s, 6 * s);
                ctx.fillStyle = "#ff7675";
                ctx.fillRect(x + 6 * s, y + 3 * s, 3 * s, 2 * s);
                break;
            }

            case 'dice': {
                // Khối xúc xắc 3D trắng viền đậm
                ctx.fillStyle = "#2c3e50";
                ctx.fillRect(x + 1 * s, y + 1 * s, 14 * s, 14 * s);
                ctx.fillStyle = "#ffffff";
                ctx.fillRect(x + 2 * s, y + 2 * s, 12 * s, 12 * s);
                // Bóng cạnh
                ctx.fillStyle = "#dcdde1";
                ctx.fillRect(x + 11 * s, y + 3 * s, 2 * s, 10 * s);
                ctx.fillRect(x + 3 * s, y + 11 * s, 10 * s, 2 * s);
                // Chấm đỏ chính giữa tượng trưng may mắn
                ctx.fillStyle = "#e74c3c";
                ctx.fillRect(x + 6 * s, y + 6 * s, 4 * s, 4 * s);
                // 4 Chấm đen góc
                ctx.fillStyle = "#2c3e50";
                ctx.fillRect(x + 3 * s, y + 3 * s, 2 * s, 2 * s);
                ctx.fillRect(x + 11 * s, y + 3 * s, 2 * s, 2 * s);
                ctx.fillRect(x + 3 * s, y + 11 * s, 2 * s, 2 * s);
                ctx.fillRect(x + 11 * s, y + 11 * s, 2 * s, 2 * s);
                break;
            }

            case 'dragon': {
                // Đầu rồng hắc ám
                ctx.fillStyle = "#1e1329";
                ctx.fillRect(x + 2 * s, y + 3 * s, 12 * s, 10 * s);
                // Sừng rồng vàng nhọn
                ctx.fillStyle = "#f1c40f";
                ctx.fillRect(x + 1 * s, y + 1 * s, 3 * s, 4 * s);
                ctx.fillRect(x + 6 * s, y + 1 * s, 3 * s, 3 * s);
                // Vảy tím sẫm
                ctx.fillStyle = "#4834d4";
                ctx.fillRect(x + 3 * s, y + 5 * s, 11 * s, 7 * s);
                // Mắt đỏ rực lửa
                ctx.fillStyle = "#e74c3c";
                ctx.fillRect(x + 6 * s, y + 6 * s, 2 * s, 2 * s);
                ctx.fillStyle = "#f39c12";
                ctx.fillRect(x + 7 * s, y + 6 * s, 1 * s, 1 * s);
                // Răng nanh nhọn & ngọn lửa
                ctx.fillStyle = "#ffffff";
                ctx.fillRect(x + 12 * s, y + 9 * s, 1 * s, 2 * s);
                ctx.fillStyle = "#e67e22";
                ctx.fillRect(x + 13 * s, y + 10 * s, 2.5 * s, 2 * s);
                break;
            }

            case 'trophy':
            case 'cup': {
                // Chén vàng
                ctx.fillStyle = "#f1c40f";
                ctx.fillRect(x + 4 * s, y + 2 * s, 8 * s, 6 * s);
                ctx.fillRect(x + 3 * s, y + 1 * s, 10 * s, 2 * s);
                // Quai cúp 2 bên
                ctx.fillRect(x + 2 * s, y + 3 * s, 2 * s, 4 * s);
                ctx.fillRect(x + 12 * s, y + 3 * s, 2 * s, 4 * s);
                // Ánh kim trắng
                ctx.fillStyle = "#ffffff";
                ctx.fillRect(x + 5 * s, y + 3 * s, 2 * s, 4 * s);
                // Trụ cúp
                ctx.fillStyle = "#e67e22";
                ctx.fillRect(x + 7 * s, y + 8 * s, 2 * s, 3 * s);
                // Đế cúp
                ctx.fillStyle = "#2c3e50";
                ctx.fillRect(x + 4 * s, y + 11 * s, 8 * s, 3 * s);
                ctx.fillStyle = "#f1c40f";
                ctx.fillRect(x + 6 * s, y + 12 * s, 4 * s, 1.5 * s);
                break;
            }

            case 'skull': {
                // Xương sọ trắng ngà
                ctx.fillStyle = "#ecf0f1";
                ctx.fillRect(x + 3 * s, y + 2 * s, 10 * s, 8 * s);
                ctx.fillRect(x + 5 * s, y + 10 * s, 6 * s, 4 * s);
                // Hốc mắt đen rỗng
                ctx.fillStyle = "#1e272e";
                ctx.fillRect(x + 4 * s, y + 5 * s, 3 * s, 3 * s);
                ctx.fillRect(x + 9 * s, y + 5 * s, 3 * s, 3 * s);
                // Mũi
                ctx.fillRect(x + 7 * s, y + 8 * s, 2 * s, 2 * s);
                // Kẽ răng
                ctx.fillRect(x + 6 * s, y + 12 * s, 1 * s, 2 * s);
                ctx.fillRect(x + 8 * s, y + 12 * s, 1 * s, 2 * s);
                break;
            }

            case 'sword': {
                // Lưỡi kiếm bạc chéo
                ctx.fillStyle = "#dfe4ea";
                ctx.fillRect(x + 9 * s, y + 3 * s, 2 * s, 2 * s);
                ctx.fillRect(x + 7 * s, y + 5 * s, 2 * s, 2 * s);
                ctx.fillRect(x + 5 * s, y + 7 * s, 2 * s, 2 * s);
                // Mũi kiếm bén
                ctx.fillStyle = "#ffffff";
                ctx.fillRect(x + 11 * s, y + 1 * s, 2 * s, 2 * s);
                // Chuôi kiếm vàng
                ctx.fillStyle = "#f1c40f";
                ctx.fillRect(x + 3 * s, y + 8 * s, 5 * s, 2 * s);
                ctx.fillRect(x + 6 * s, y + 6 * s, 2 * s, 5 * s);
                // Cán kiếm gỗ
                ctx.fillStyle = "#795548";
                ctx.fillRect(x + 2 * s, y + 10 * s, 2 * s, 2 * s);
                // Ngọc chuôi kiếm lam
                ctx.fillStyle = "#00d2d3";
                ctx.fillRect(x + 1 * s, y + 12 * s, 2 * s, 2 * s);
                break;
            }

            case 'shield': {
                // Viền khiên vàng
                ctx.fillStyle = "#f1c40f";
                ctx.fillRect(x + 2 * s, y + 1 * s, 12 * s, 10 * s);
                ctx.fillRect(x + 4 * s, y + 11 * s, 8 * s, 3 * s);
                ctx.fillRect(x + 6 * s, y + 14 * s, 4 * s, 2 * s);
                // Nền lam an ninh
                ctx.fillStyle = "#2980b9";
                ctx.fillRect(x + 4 * s, y + 3 * s, 8 * s, 8 * s);
                ctx.fillRect(x + 5 * s, y + 11 * s, 6 * s, 2 * s);
                // Biểu tượng thập tự an ninh sáng
                ctx.fillStyle = "#00d2d3";
                ctx.fillRect(x + 7 * s, y + 4 * s, 2 * s, 7 * s);
                ctx.fillRect(x + 5 * s, y + 6 * s, 6 * s, 2 * s);
                ctx.fillStyle = "#ffffff";
                ctx.fillRect(x + 7 * s, y + 6 * s, 2 * s, 2 * s);
                break;
            }

            case 'chest':
            case 'treasure': {
                // Thùng rương gỗ
                ctx.fillStyle = "#d35400";
                ctx.fillRect(x + 2 * s, y + 4 * s, 12 * s, 10 * s);
                // Nẹp kim loại vàng & Ổ khóa
                ctx.fillStyle = "#f1c40f";
                ctx.fillRect(x + 1 * s, y + 3 * s, 14 * s, 2 * s);
                ctx.fillRect(x + 4 * s, y + 4 * s, 2 * s, 10 * s);
                ctx.fillRect(x + 10 * s, y + 4 * s, 2 * s, 10 * s);
                // Ổ khóa sáng
                ctx.fillRect(x + 7 * s, y + 7 * s, 2 * s, 3 * s);
                ctx.fillStyle = "#ffffff";
                ctx.fillRect(x + 7.5 * s, y + 7.5 * s, 1 * s, 1 * s);
                break;
            }

            case 'arrow': {
                // Mũi tên pixel chỉ hướng xanh lá
                ctx.fillStyle = "#2ecc71";
                ctx.fillRect(x + 2 * s, y + 6 * s, 7 * s, 4 * s);
                ctx.fillRect(x + 8 * s, y + 4 * s, 2 * s, 8 * s);
                ctx.fillRect(x + 10 * s, y + 5 * s, 2 * s, 6 * s);
                ctx.fillRect(x + 12 * s, y + 7 * s, 2 * s, 2 * s);
                break;
            }

            case 'star':
            case 'sparkle': {
                // Ngôi sao lấp lánh vàng
                ctx.fillStyle = "#f1c40f";
                ctx.fillRect(x + 7 * s, y + 1 * s, 2 * s, 14 * s);
                ctx.fillRect(x + 1 * s, y + 7 * s, 14 * s, 2 * s);
                ctx.fillRect(x + 4 * s, y + 4 * s, 8 * s, 8 * s);
                ctx.fillStyle = "#ffffff";
                ctx.fillRect(x + 6 * s, y + 6 * s, 4 * s, 4 * s);
                break;
            }

            case 'gamepad': {
                // Tay cầm arcade tím retro
                ctx.fillStyle = "#8e44ad";
                ctx.fillRect(x + 1 * s, y + 4 * s, 14 * s, 8 * s);
                // D-pad
                ctx.fillStyle = "#2c3e50";
                ctx.fillRect(x + 3 * s, y + 6 * s, 4 * s, 4 * s);
                ctx.fillStyle = "#ffffff";
                ctx.fillRect(x + 4 * s, y + 5 * s, 2 * s, 6 * s);
                ctx.fillRect(x + 2 * s, y + 7 * s, 6 * s, 2 * s);
                // Nút bấm đỏ / vàng
                ctx.fillStyle = "#e74c3c";
                ctx.fillRect(x + 11 * s, y + 6 * s, 2 * s, 2 * s);
                ctx.fillStyle = "#f1c40f";
                ctx.fillRect(x + 9 * s, y + 8 * s, 2 * s, 2 * s);
                break;
            }

            case 'check': {
                // Dấu tick xanh thành công
                ctx.fillStyle = "#2ecc71";
                ctx.fillRect(x + 2 * s, y + 8 * s, 2 * s, 3 * s);
                ctx.fillRect(x + 4 * s, y + 9 * s, 2 * s, 3 * s);
                ctx.fillRect(x + 6 * s, y + 11 * s, 2 * s, 3 * s);
                ctx.fillRect(x + 8 * s, y + 8 * s, 2 * s, 3 * s);
                ctx.fillRect(x + 10 * s, y + 5 * s, 2 * s, 3 * s);
                ctx.fillRect(x + 12 * s, y + 2 * s, 2 * s, 3 * s);
                break;
            }

            case 'cross': {
                // Dấu X đỏ cảnh báo
                ctx.fillStyle = "#e74c3c";
                ctx.fillRect(x + 2 * s, y + 2 * s, 3 * s, 3 * s);
                ctx.fillRect(x + 11 * s, y + 2 * s, 3 * s, 3 * s);
                ctx.fillRect(x + 5 * s, y + 5 * s, 6 * s, 6 * s);
                ctx.fillRect(x + 2 * s, y + 11 * s, 3 * s, 3 * s);
                ctx.fillRect(x + 11 * s, y + 11 * s, 3 * s, 3 * s);
                break;
            }

            case 'lightbulb':
            case 'tip': {
                // Bóng đèn ý tưởng vàng
                ctx.fillStyle = "#f1c40f";
                ctx.fillRect(x + 4 * s, y + 2 * s, 8 * s, 8 * s);
                ctx.fillRect(x + 3 * s, y + 4 * s, 10 * s, 4 * s);
                ctx.fillStyle = "#ffffff";
                ctx.fillRect(x + 5 * s, y + 3 * s, 3 * s, 3 * s);
                // Đui đèn kim loại
                ctx.fillStyle = "#bdc3c7";
                ctx.fillRect(x + 5 * s, y + 10 * s, 6 * s, 2 * s);
                ctx.fillRect(x + 6 * s, y + 12 * s, 4 * s, 2 * s);
                ctx.fillStyle = "#e67e22";
                ctx.fillRect(x + 7 * s, y + 14 * s, 2 * s, 1 * s);
                break;
            }

            default: {
                // Mặc định: Ngôi sao pixel vàng
                ctx.fillStyle = "#f1c40f";
                ctx.fillRect(x + 6 * s, y + 2 * s, 4 * s, 12 * s);
                ctx.fillRect(x + 2 * s, y + 6 * s, 12 * s, 4 * s);
                ctx.fillStyle = "#ffffff";
                ctx.fillRect(x + 7 * s, y + 7 * s, 2 * s, 2 * s);
                break;
            }
        }
        ctx.restore();
    },

    // Tạo Data URL ảnh PNG trong suốt từ Pixel Icon để nhúng vào HTML/CSS
    getPixelIconDataUrl(iconName, size = 16) {
        try {
            const canvas = document.createElement("canvas");
            canvas.width = size;
            canvas.height = size;
            const cCtx = canvas.getContext("2d");
            this.drawPixelIcon(cCtx, iconName, 0, 0, size);
            return canvas.toDataURL("image/png");
        } catch (e) {
            return "";
        }
    }
};

window.PixelSprites = PixelSprites;
