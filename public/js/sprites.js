/**
 * Procedural Pixel Art Sprites & Canvas Renderers
 * Tự động vẽ các thành phần đồ họa phong cách Pixel Art 16-bit
 */

const PixelSprites = {
    // 1. Vẽ Bông hồng Pixel (Rose)
    drawRose(ctx, x, y, size = 32) {
        ctx.save();
        ctx.translate(x, y);
        const s = size / 16; // 16x16 pixel grid

        // Thân và lá xanh
        ctx.fillStyle = "#27ae60";
        ctx.fillRect(7 * s, 8 * s, 2 * s, 8 * s); // Cuống chính
        ctx.fillRect(4 * s, 11 * s, 3 * s, 2 * s); // Nhánh lá trái
        ctx.fillRect(3 * s, 10 * s, 2 * s, 2 * s);
        ctx.fillRect(9 * s, 12 * s, 3 * s, 2 * s); // Nhánh lá phải
        ctx.fillRect(11 * s, 11 * s, 2 * s, 2 * s);

        // Đài hoa xanh
        ctx.fillStyle = "#1e824c";
        ctx.fillRect(6 * s, 7 * s, 4 * s, 2 * s);

        // Cánh hoa đỏ sẫm (bóng đổ)
        ctx.fillStyle = "#962d3e";
        ctx.fillRect(4 * s, 3 * s, 8 * s, 5 * s);

        // Cánh hoa đỏ tươi
        ctx.fillStyle = "#e74c3c";
        ctx.fillRect(5 * s, 2 * s, 6 * s, 4 * s);
        ctx.fillRect(3 * s, 3 * s, 2 * s, 3 * s);
        ctx.fillRect(11 * s, 3 * s, 2 * s, 3 * s);

        // Cánh trung tâm và điểm nhấn sáng
        ctx.fillStyle = "#ff6b6b";
        ctx.fillRect(6 * s, 3 * s, 4 * s, 2 * s);
        ctx.fillRect(5 * s, 4 * s, 2 * s, 2 * s);

        // Điểm lấp lánh (Sparkle)
        ctx.fillStyle = "#ffffff";
        ctx.fillRect(7 * s, 2 * s, 1 * s, 1 * s);
        ctx.fillRect(9 * s, 4 * s, 1 * s, 1 * s);

        ctx.restore();
    },

    // 2. Vẽ Rồng Hắc Ám Pixel (Dragon Boss)
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

        // Cánh rồng (Wings)
        ctx.fillStyle = wingColor;
        // Cánh trái
        ctx.beginPath();
        ctx.moveTo(8 * s, (8 * s) + wingOffset);
        ctx.lineTo(-4 * s, (-4 * s) + wingOffset);
        ctx.lineTo(2 * s, (14 * s) + wingOffset);
        ctx.closePath();
        ctx.fill();

        // Cánh phải
        ctx.beginPath();
        ctx.moveTo(24 * s, (8 * s) + wingOffset);
        ctx.lineTo(36 * s, (-4 * s) + wingOffset);
        ctx.lineTo(30 * s, (14 * s) + wingOffset);
        ctx.closePath();
        ctx.fill();

        // Đuôi rồng uốn lượn có gai
        ctx.fillStyle = bodyColor;
        ctx.fillRect(14 * s, 24 * s, 4 * s, 6 * s);
        ctx.fillRect(12 * s, 28 * s, 4 * s, 4 * s);
        ctx.fillRect(8 * s, 30 * s, 5 * s, 3 * s);
        ctx.fillStyle = hornColor;
        ctx.fillRect(7 * s, 29 * s, 2 * s, 2 * s); // Gai đuôi

        // Thân rồng (Body)
        ctx.fillStyle = bodyColor;
        ctx.fillRect(10 * s, 12 * s, 12 * s, 13 * s);
        // Vảy ngực rồng
        ctx.fillStyle = isHurt ? "#fab1a0" : "#d35400";
        ctx.fillRect(12 * s, 14 * s, 8 * s, 9 * s);
        ctx.fillStyle = isHurt ? "#ffffff" : "#f39c12";
        ctx.fillRect(13 * s, 15 * s, 6 * s, 2 * s);
        ctx.fillRect(13 * s, 18 * s, 6 * s, 2 * s);
        ctx.fillRect(14 * s, 21 * s, 4 * s, 1.5 * s);

        // Đầu rồng to lớn (Head)
        ctx.fillStyle = bodyColor2;
        ctx.fillRect(9 * s, 4 * s, 14 * s, 9 * s);

        // Mõm rồng
        ctx.fillRect(8 * s, 8 * s, 16 * s, 5 * s);

        // Sừng rồng (Horns)
        ctx.fillStyle = hornColor;
        ctx.fillRect(7 * s, 1 * s, 3 * s, 4 * s);
        ctx.fillRect(6 * s, -1 * s, 2 * s, 3 * s);
        ctx.fillRect(22 * s, 1 * s, 3 * s, 4 * s);
        ctx.fillRect(24 * s, -1 * s, 2 * s, 3 * s);

        // Mắt rồng đỏ/vàng rực rỡ
        ctx.fillStyle = eyeColor;
        ctx.fillRect(10 * s, 7 * s, 3 * s, 2 * s);
        ctx.fillRect(19 * s, 7 * s, 3 * s, 2 * s);
        // Con ngươi đen
        ctx.fillStyle = "#000000";
        ctx.fillRect(11 * s, 7 * s, 1.5 * s, 2 * s);
        ctx.fillRect(20 * s, 7 * s, 1.5 * s, 2 * s);

        // Nanh vuốt & Lửa thở nhẹ
        ctx.fillStyle = "#ffffff";
        ctx.fillRect(11 * s, 13 * s, 2 * s, 2 * s);
        ctx.fillRect(19 * s, 13 * s, 2 * s, 2 * s);

        // Lỗ mũi phun khói lửa
        if (Math.sin(flapAnim * 2) > 0.3) {
            ctx.fillStyle = "#e74c3c";
            ctx.fillRect(9 * s, 10 * s, 2 * s, 2 * s);
            ctx.fillRect(21 * s, 10 * s, 2 * s, 2 * s);
        }

        ctx.restore();
    },

    // 3. Vẽ Xúc Xắc Pixel (Dice)
    drawDice(ctx, x, y, size = 100, value = 1, isRolling = false) {
        ctx.save();
        ctx.translate(x, y);

        const val = isRolling ? Math.floor(Math.random() * 6) + 1 : value;

        // Bóng đổ (Shadow)
        ctx.fillStyle = "rgba(0, 0, 0, 0.4)";
        ctx.fillRect(8, 8, size, size);

        // Khung nền xúc xắc
        ctx.fillStyle = "#ecf0f1";
        ctx.fillRect(0, 0, size, size);

        // Viền 3D pixel bevel
        ctx.fillStyle = "#ffffff";
        ctx.fillRect(0, 0, size, 6);
        ctx.fillRect(0, 0, 6, size);

        ctx.fillStyle = "#bdc3c7";
        ctx.fillRect(0, size - 6, size, 6);
        ctx.fillRect(size - 6, 0, 6, size);

        // Chấm tròn xúc xắc
        ctx.fillStyle = (val === 1) ? "#e74c3c" : "#2c3e50"; // Số 1 màu đỏ may mắn
        const dotSize = size * 0.16;
        const c = size / 2;
        const l = size * 0.25;
        const r = size * 0.75;

        const drawDot = (dx, dy) => {
            ctx.beginPath();
            ctx.arc(dx, dy, dotSize / 2, 0, Math.PI * 2);
            ctx.fill();
        };

        if (val === 1) {
            drawDot(c, c);
        } else if (val === 2) {
            drawDot(l, l);
            drawDot(r, r);
        } else if (val === 3) {
            drawDot(l, l);
            drawDot(c, c);
            drawDot(r, r);
        } else if (val === 4) {
            drawDot(l, l);
            drawDot(r, l);
            drawDot(l, r);
            drawDot(r, r);
        } else if (val === 5) {
            drawDot(l, l);
            drawDot(r, l);
            drawDot(c, c);
            drawDot(l, r);
            drawDot(r, r);
        } else if (val === 6) {
            drawDot(l, l);
            drawDot(r, l);
            drawDot(l, c);
            drawDot(r, c);
            drawDot(l, r);
            drawDot(r, r);
        }

        ctx.restore();
    },

    // 4. Vẽ Thẻ Thần Bí Pixel (Mystery Card)
    drawCard(ctx, x, y, width = 200, height = 280, cardData = null, isRevealed = false) {
        ctx.save();
        ctx.translate(x, y);

        // Bóng đổ
        ctx.fillStyle = "rgba(0, 0, 0, 0.5)";
        ctx.fillRect(8, 8, width, height);

        // Nền thẻ bài
        if (!isRevealed) {
            // Mặt sau thẻ bài ma thuật (Back side)
            ctx.fillStyle = "#341f97";
            ctx.fillRect(0, 0, width, height);

            // Viền vàng pixel
            ctx.strokeStyle = "#f1c40f";
            ctx.lineWidth = 6;
            ctx.strokeRect(6, 6, width - 12, height - 12);

            // Hoa văn pixel ma trận
            ctx.fillStyle = "#5f27cd";
            ctx.fillRect(20, 20, width - 40, height - 40);

            // Ký tự ? lớn ở giữa
            ctx.fillStyle = "#f1c40f";
            ctx.font = "bold 60px 'Press Start 2P', monospace, sans-serif";
            ctx.textAlign = "center";
            ctx.textBaseline = "middle";
            ctx.fillText("?", width / 2, height / 2);
        } else {
            // Mặt trước thẻ bài đã lật (Front side)
            const isBonus = cardData && cardData.type === "bonus";
            ctx.fillStyle = isBonus ? "#1e3799" : "#b71540";
            ctx.fillRect(0, 0, width, height);

            // Viền sáng
            ctx.strokeStyle = isBonus ? "#f6b93b" : "#ff6b6b";
            ctx.lineWidth = 6;
            ctx.strokeRect(6, 6, width - 12, height - 12);

            // Icon nội dung
            if (isBonus) {
                // Vẽ hoa hồng thưởng
                const roses = cardData ? cardData.roses : 1;
                for (let i = 0; i < roses; i++) {
                    const rx = (width / (roses + 1)) * (i + 1) - 20;
                    PixelSprites.drawRose(ctx, rx, 40, 40);
                }
            } else {
                // Icon sọ đầu / cảnh báo
                ctx.fillStyle = "#ffffff";
                ctx.font = "40px sans-serif";
                ctx.textAlign = "center";
                ctx.fillText("⚡", width / 2, 80);
            }

            // Tiêu đề thẻ
            ctx.fillStyle = "#ffffff";
            ctx.font = "bold 15px 'Segoe UI', Tahoma, sans-serif";
            ctx.textAlign = "center";
            ctx.fillText(cardData ? cardData.title : "THẺ BÍ ẨN", width / 2, 140);

            // Hiệu ứng (+1, +2, +3 Hoa Hồng)
            ctx.fillStyle = isBonus ? "#f1c40f" : "#ff7675";
            ctx.font = "bold 22px 'Segoe UI', Tahoma, sans-serif";
            const effectText = isBonus ? `+${cardData.roses} HOA HỒNG!` : `${cardData.roses} HOA HỒNG!`;
            ctx.fillText(effectText, width / 2, 180);

            // Mô tả chi tiết
            ctx.fillStyle = "#ecf0f1";
            ctx.font = "12px 'Segoe UI', Tahoma, sans-serif";
            this._wrapText(ctx, cardData ? cardData.description : "", width / 2, 215, width - 30, 16);
        }

        ctx.restore();
    },

    // 5. Vẽ Rương Kho Báu Hoàng Kim (Treasure Chest)
    drawTreasureChest(ctx, x, y, size = 120, isOpen = false) {
        ctx.save();
        ctx.translate(x, y);
        const s = size / 32;

        if (isOpen) {
            // Hào quang vàng toát ra từ bên trong rương
            const grad = ctx.createRadialGradient(16 * s, 14 * s, 2 * s, 16 * s, 14 * s, 20 * s);
            grad.addColorStop(0, "rgba(255, 242, 0, 0.9)");
            grad.addColorStop(0.5, "rgba(255, 177, 0, 0.5)");
            grad.addColorStop(1, "rgba(255, 255, 255, 0)");
            ctx.fillStyle = grad;
            ctx.beginPath();
            ctx.arc(16 * s, 14 * s, 24 * s, 0, Math.PI * 2);
            ctx.fill();

            // Nắp rương mở ngửa
            ctx.fillStyle = "#8a5323";
            ctx.fillRect(4 * s, 0 * s, 24 * s, 8 * s);
            ctx.fillStyle = "#f1c40f"; // Nẹp vàng
            ctx.fillRect(8 * s, 0 * s, 3 * s, 8 * s);
            ctx.fillRect(21 * s, 0 * s, 3 * s, 8 * s);

            // Đáy rương chứa vàng bạc châu báu
            ctx.fillStyle = "#5c3317";
            ctx.fillRect(4 * s, 14 * s, 24 * s, 14 * s);

            // Đống tiền vàng & kim cương sáng chói
            ctx.fillStyle = "#f1c40f";
            ctx.fillRect(6 * s, 12 * s, 20 * s, 6 * s);
            ctx.fillStyle = "#ffffff"; // Kim cương lấp lánh
            ctx.fillRect(10 * s, 13 * s, 3 * s, 3 * s);
            ctx.fillRect(18 * s, 11 * s, 4 * s, 4 * s);

            // Nẹp vàng thân rương
            ctx.fillStyle = "#f39c12";
            ctx.fillRect(4 * s, 14 * s, 24 * s, 2 * s);
            ctx.fillRect(8 * s, 14 * s, 3 * s, 14 * s);
            ctx.fillRect(21 * s, 14 * s, 3 * s, 14 * s);

            // Chiếc cúp / Vương miện an ninh mạng nổi lên trên
            ctx.fillStyle = "#f1c40f";
            ctx.fillRect(13 * s, 5 * s, 6 * s, 6 * s);
            ctx.fillStyle = "#e74c3c";
            ctx.fillRect(15 * s, 6 * s, 2 * s, 2 * s);
        } else {
            // Nắp rương đóng
            ctx.fillStyle = "#8a5323";
            ctx.fillRect(4 * s, 6 * s, 24 * s, 10 * s);
            // Nẹp vàng trên nắp
            ctx.fillStyle = "#f1c40f";
            ctx.fillRect(8 * s, 6 * s, 3 * s, 10 * s);
            ctx.fillRect(21 * s, 6 * s, 3 * s, 10 * s);

            // Thân rương
            ctx.fillStyle = "#5c3317";
            ctx.fillRect(4 * s, 16 * s, 24 * s, 12 * s);
            ctx.fillStyle = "#f39c12";
            ctx.fillRect(4 * s, 16 * s, 24 * s, 2 * s);
            ctx.fillRect(8 * s, 16 * s, 3 * s, 12 * s);
            ctx.fillRect(21 * s, 16 * s, 3 * s, 12 * s);

            // Ổ khóa vàng
            ctx.fillStyle = "#f1c40f";
            ctx.fillRect(14 * s, 14 * s, 4 * s, 5 * s);
            ctx.fillStyle = "#2c3e50";
            ctx.fillRect(15.5 * s, 16 * s, 1 * s, 2 * s); // Lỗ khóa
        }

        ctx.restore();
    },

    // 6. Vẽ Thung Lũng Vực Thẳm (Valley of Doom - Defeat Scene)
    drawValleyScene(ctx, width, height, fallProgress = 0) {
        // Bầu trời đêm u ám bão tố
        const skyGrad = ctx.createLinearGradient(0, 0, 0, height);
        skyGrad.addColorStop(0, "#0a0612");
        skyGrad.addColorStop(0.6, "#1a0f2b");
        skyGrad.addColorStop(1, "#0d0914");
        ctx.fillStyle = skyGrad;
        ctx.fillRect(0, 0, width, height);

        // Vách đá nhọn bên trái
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

        // Vách đá nhọn bên phải
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

        // Sương mù ma quái dưới đáy vực
        const fogGrad = ctx.createLinearGradient(0, height * 0.7, 0, height);
        fogGrad.addColorStop(0, "rgba(88, 30, 110, 0)");
        fogGrad.addColorStop(1, "rgba(88, 30, 110, 0.8)");
        ctx.fillStyle = fogGrad;
        ctx.fillRect(0, height * 0.7, width, height * 0.3);

        // Hiệp sĩ rơi tự do lộn nhào giữa vực
        const heroY = (height * 0.15) + (height * 0.75) * Math.min(fallProgress, 1.0);
        const heroX = width * 0.5 + Math.sin(fallProgress * 8) * 30;
        this.drawFallingHero(ctx, heroX, heroY, 40, fallProgress);
    },

    // 7. Nhân vật Vệ Binh Cyber rơi
    drawFallingHero(ctx, x, y, size = 40, progress = 0) {
        ctx.save();
        ctx.translate(x, y);
        ctx.rotate(progress * Math.PI * 3); // Lộn nhào khi rơi

        const s = size / 16;
        // Áo choàng xanh bay phần phật
        ctx.fillStyle = "#2980b9";
        ctx.fillRect(-6 * s, -4 * s, 12 * s, 10 * s);

        // Đầu & Mũ giáp Cyber
        ctx.fillStyle = "#bdc3c7";
        ctx.fillRect(-4 * s, -8 * s, 8 * s, 8 * s);
        // Kính bảo hộ phát sáng
        ctx.fillStyle = "#00d2d3";
        ctx.fillRect(-3 * s, -6 * s, 6 * s, 3 * s);

        // Tay & Chân giãy giụa
        ctx.fillStyle = "#7f8c8d";
        ctx.fillRect(-7 * s, -2 * s, 3 * s, 6 * s);
        ctx.fillRect(4 * s, -2 * s, 3 * s, 6 * s);
        ctx.fillRect(-4 * s, 6 * s, 3 * s, 6 * s);
        ctx.fillRect(1 * s, 6 * s, 3 * s, 6 * s);

        ctx.restore();
    },

    // Helper quấn dòng text
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
