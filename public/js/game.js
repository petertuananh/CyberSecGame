/**
 * Game Engine Vệ Binh Mật Khẩu (CyberSec Password Guardian)
 * Quản lý vòng lặp game, state machine, input, canvas và luật chơi
 * Tích hợp hệ sinh thái chi tiết (Cây, Chim, Cá, Rong rêu, Mây trời)
 * và Nhân vật Phiêu Lưu đi qua các thế giới (Forest -> Water -> Cloud -> Dragon Lair)
 */

class CyberSecGame {
    constructor() {
        this.canvas = document.getElementById("gameCanvas");
        this.ctx = this.canvas.getContext("2d");

        // Game States:
        // START -> STAGE_INTRO -> QUESTION -> QUESTION_RESULT -> STAGE_CLEAR -> DICE -> CARD -> TRAVELING -> BOSS_INTRO -> BOSS_BATTLE -> VICTORY -> GAME_OVER
        this.state = "START";

        // Tiến trình chơi
        this.stage = 1; // 1: Rừng, 2: Nước, 3: Mây
        this.stageQuestions = [];
        this.currentQIndex = 0;
        this.stageCorrectCount = 0;
        this.roses = 0; // Số bông hồng tích lũy

        // Hành trình phiêu lưu (Traveling between worlds)
        this.travelFrom = 1;
        this.travelTo = 2;
        this.travelProgress = 0;
        this.travelDuration = 3.5; // 3.5 giây bước đi giữa 2 thế giới
        this.heroWalkFrame = 0;

        // Xúc xắc & Thẻ bài
        this.diceValue = 1;
        this.isDiceRolling = false;
        this.diceRollTimer = 0;
        this.currentCard = null;
        this.cardRevealed = false;

        // Trận đấu Boss Rồng
        this.bossHP = 9;
        this.bossMaxHP = 9;
        this.bossPositions = ["A", "B", "C", "D"];
        this.bossCurrentPos = "A";
        this.bossTimer = 0;
        this.bossMaxTime = 2.0; // Giây xuất hiện ở mỗi vị trí
        this.bossHurtTimer = 0;
        this.bossFlapAnim = 0;
        this.bossHitsLanded = 0;

        // Projectile Animations
        this.projectiles = []; // { startX, startY, targetX, targetY, progress, isHit }

        // Animation Timers & Entities (Sinh vật trong 3 thế giới)
        this.lastTime = performance.now();
        this.bgParticles = [];
        this.fallProgress = 0;
        this.chestOpen = false;

        // Hệ sinh vật sống động (Cây cối, Chim chóc, Cá, Rong rêu, Mây)
        this.forestBirds = [];
        this.waterFishes = [];
        this.waterBubbles = [];
        this.skyBirds = [];

        // Feedback / Result Text
        this.resultTitle = "";
        this.resultExplanation = "";
        this.isAnswerCorrect = false;

        // Active Buttons Highlight for UI
        this.activeButtons = { A: false, B: false, C: false, D: false, ENTER: false };

        // Tải Logo Trường THCS Nguyễn Bỉnh Khiêm & SoftLab (Pixel Style)
        this.logoNBK = new Image();
        this.logoNBK.src = "images/logo_nbk_pixel.png";

        this.logoSoftLab = new Image();
        this.logoSoftLab.src = "images/logo_softlab_pixel.png";

        this._initParticles();
        this._initEntities();
        this._bindInputs();
        this._connectWebSocket();

        // Start Loop
        requestAnimationFrame((t) => this.gameLoop(t));
    }

    _initParticles() {
        this.bgParticles = [];
        for (let i = 0; i < 30; i++) {
            this.bgParticles.push({
                x: Math.random() * this.canvas.width,
                y: Math.random() * this.canvas.height,
                speed: 0.5 + Math.random() * 1.5,
                size: 2 + Math.random() * 4,
                char: Math.random() > 0.5 ? "1" : "0"
            });
        }
    }

    // Khởi tạo các sinh vật tự nhiên cho từng thế giới
    _initEntities() {
        const w = this.canvas.width;
        const h = this.canvas.height;

        // 1. Chim chóc rừng (Forest Birds)
        this.forestBirds = [];
        for (let i = 0; i < 5; i++) {
            this.forestBirds.push({
                x: Math.random() * w,
                y: h * 0.15 + Math.random() * (h * 0.25),
                vx: 50 + Math.random() * 50,
                offset: Math.random() * 10
            });
        }

        // 2. Đàn cá bơi lội biển sâu (Water Fishes)
        this.waterFishes = [];
        const colors = ["#ff7675", "#f1c40f", "#00cec9", "#fd79a8", "#fab1a0", "#74b9ff"];
        for (let i = 0; i < 7; i++) {
            this.waterFishes.push({
                x: Math.random() * w,
                y: h * 0.2 + Math.random() * (h * 0.55),
                vx: (Math.random() > 0.5 ? 1 : -1) * (45 + Math.random() * 40),
                color: colors[i % colors.length],
                size: 22 + Math.random() * 12,
                offset: Math.random() * 10
            });
        }

        // 3. Bọt khí biển nổi bồng bềnh (Water Bubbles)
        this.waterBubbles = [];
        for (let i = 0; i < 18; i++) {
            this.waterBubbles.push({
                x: Math.random() * w,
                y: Math.random() * h,
                vy: -(30 + Math.random() * 45),
                r: 2 + Math.random() * 4
            });
        }

        // 4. Chim trời chao lượn trên mây (Sky Birds)
        this.skyBirds = [];
        for (let i = 0; i < 6; i++) {
            this.skyBirds.push({
                x: Math.random() * w,
                y: h * 0.12 + Math.random() * (h * 0.3),
                vx: 80 + Math.random() * 60,
                offset: Math.random() * 10
            });
        }
    }

    _connectWebSocket() {
        const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
        const wsUrl = `${protocol}//${window.location.host}`;
        this.ws = new WebSocket(wsUrl);

        this.ws.onopen = () => {
            console.log("[WebSocket] Kết nối thành công tới Server điều khiển!");
            const statusEl = document.getElementById("arduinoStatus");
            if (statusEl) statusEl.innerText = "Đã kết nối Server";
        };

        this.ws.onmessage = (event) => {
            try {
                const data = JSON.parse(event.data);
                if (data.type === "BUTTON_PRESS") {
                    this.handleInput(data.button);
                } else if (data.type === "PORT_STATUS") {
                    const statusEl = document.getElementById("arduinoStatus");
                    if (statusEl) {
                        statusEl.innerText = data.connected ? `Arduino: ${data.port}` : "Arduino: Chưa kết nối (Dùng bàn phím)";
                        statusEl.className = data.connected ? "connected" : "disconnected";
                    }
                }
            } catch (e) {
                console.error("WS Parse error:", e);
            }
        };

        this.ws.onclose = () => {
            setTimeout(() => this._connectWebSocket(), 2000);
        };
    }

    _bindInputs() {
        window.addEventListener("keydown", (e) => {
            let key = e.key.toUpperCase();
            if (key === "ENTER" || key === " ") {
                this.handleInput("ENTER");
            } else if (["A", "B", "C", "D"].includes(key)) {
                this.handleInput(key);
            }
        });

        document.querySelectorAll(".arcade-btn").forEach((btn) => {
            btn.addEventListener("click", () => {
                const btnKey = btn.getAttribute("data-key");
                if (btnKey) this.handleInput(btnKey);
            });
        });
    }

    handleInput(button) {
        this.activeButtons[button] = true;
        setTimeout(() => { this.activeButtons[button] = false; }, 200);

        window.SoundEngine.play("click");

        switch (this.state) {
            case "START":
                if (button === "ENTER") {
                    this.startStage(1);
                }
                break;

            case "STAGE_INTRO":
                if (button === "ENTER") {
                    this.state = "QUESTION";
                }
                break;

            case "QUESTION":
                if (["A", "B", "C", "D"].includes(button)) {
                    this.checkAnswer(button);
                }
                break;

            case "QUESTION_RESULT":
                if (button === "ENTER") {
                    this.nextQuestion();
                }
                break;

            case "STAGE_CLEAR":
                if (button === "ENTER") {
                    this.state = "DICE";
                    this.isDiceRolling = false;
                }
                break;

            case "STAGE_FAILED":
                if (button === "ENTER") {
                    this.startStage(this.stage);
                }
                break;

            case "DICE":
                if (button === "ENTER" && !this.isDiceRolling) {
                    this.rollDice();
                }
                break;

            case "DICE_RESULT":
                if (button === "ENTER") {
                    if (this.diceValue % 2 === 0) {
                        this.state = "CARD";
                        this.cardRevealed = false;
                        this.currentCard = this._getRandomCard();
                    } else {
                        this.proceedAfterDice();
                    }
                }
                break;

            case "CARD":
                if (button === "ENTER") {
                    if (!this.cardRevealed) {
                        this.cardRevealed = true;
                        window.SoundEngine.play("card");
                        if (this.currentCard.type === "bonus") {
                            this.roses += this.currentCard.roses;
                        } else if (this.currentCard.type === "penalty") {
                            this.roses = Math.max(0, this.roses + this.currentCard.roses);
                        }
                    } else {
                        this.proceedAfterDice();
                    }
                }
                break;

            case "TRAVELING":
                // Bấm phím ENTER để bỏ qua/hoàn thành nhanh hoạt cảnh phiêu lưu
                if (button === "ENTER") {
                    this._finishTravel();
                }
                break;

            case "BOSS_INTRO":
                if (button === "ENTER") {
                    this.startBossFight();
                }
                break;

            case "BOSS_BATTLE":
                if (["A", "B", "C", "D"].includes(button)) {
                    this.shootBoss(button);
                }
                break;

            case "VICTORY":
            case "GAME_OVER":
                if (button === "ENTER") {
                    this.stage = 1;
                    this.roses = 0;
                    this.state = "START";
                }
                break;
        }
    }

    _getRandomCard() {
        const cards = [
            { id: "c1", title: "KHO BÁU MŨ TRẮNG", type: "bonus", roses: 1, description: "Chuyên gia an ninh mạng tặng bạn 1 bông hồng viện trợ!" },
            { id: "c2", title: "TƯỜNG LỬA HOÀNG KIM", type: "bonus", roses: 2, description: "Hệ thống tường lửa vững chắc thưởng bạn 2 bông hồng rực rỡ!" },
            { id: "c3", title: "THẦN HỘ MỆNH 2FA", type: "bonus", roses: 3, description: "Xác thực 2 yếu tố phát quang! Tặng ngay 3 bông hồng tối thượng!" },
            { id: "c4", title: "BÃO MÃ ĐỘC PHISHING", type: "penalty", roses: -1, description: "Mã độc quét qua làm rơi mất 1 bông hồng! Hãy cẩn trọng hơn!" },
            { id: "c5", title: "KHIÊN MÃ HÓA AES-256", type: "bonus", roses: 1, description: "Mã hóa cấp quân sự bảo vệ bạn! Tặng 1 bông hồng chiến đấu!" }
        ];
        return cards[Math.floor(Math.random() * cards.length)];
    }

    startStage(stageNum) {
        this.stage = stageNum;
        this.currentQIndex = 0;
        this.stageCorrectCount = 0;
        this.stageQuestions = window.QuestionGenerator.generateStageQuestions(stageNum);
        this.state = "STAGE_INTRO";
    }

    checkAnswer(selectedOption) {
        const q = this.stageQuestions[this.currentQIndex];
        const optionMap = { A: 0, B: 1, C: 2, D: 3 };
        const selectedIdx = optionMap[selectedOption];

        if (selectedIdx === q.correct) {
            this.isAnswerCorrect = true;
            this.stageCorrectCount++;
            this.roses++;
            this.resultTitle = "CHÍNH XÁC! (+1 BÔNG HỒNG 🌹)";
            window.SoundEngine.play("correct");
        } else {
            this.isAnswerCorrect = false;
            this.resultTitle = "CHƯA CHÍNH XÁC! (0 BÔNG HỒNG)";
            window.SoundEngine.play("wrong");
        }
        this.resultExplanation = q.explanation;
        this.state = "QUESTION_RESULT";
    }

    nextQuestion() {
        this.currentQIndex++;
        if (this.currentQIndex < 3) {
            this.state = "QUESTION";
        } else {
            if (this.stageCorrectCount === 3) {
                this.state = "STAGE_CLEAR";
                window.SoundEngine.play("correct");
            } else {
                this.state = "STAGE_FAILED";
                window.SoundEngine.play("wrong");
            }
        }
    }

    rollDice() {
        this.isDiceRolling = true;
        this.diceRollTimer = 0;
        window.SoundEngine.play("dice");

        const rollInterval = setInterval(() => {
            this.diceValue = Math.floor(Math.random() * 6) + 1;
        }, 80);

        setTimeout(() => {
            clearInterval(rollInterval);
            this.diceValue = Math.floor(Math.random() * 6) + 1;
            this.isDiceRolling = false;
            this.state = "DICE_RESULT";
            window.SoundEngine.play("click");
        }, 1200);
    }

    // Bắt đầu hành trình phiêu lưu bước đi từ thế giới này sang thế giới khác
    proceedAfterDice() {
        if (this.stage < 3) {
            this.startTravel(this.stage, this.stage + 1);
        } else {
            // Sau Vòng 3 (Mây) -> Phiêu lưu tiến vào Hang Boss Rồng!
            this.startTravel(3, 4);
        }
    }

    startTravel(fromStage, toStage) {
        this.travelFrom = fromStage;
        this.travelTo = toStage;
        this.travelProgress = 0;
        this.state = "TRAVELING";
    }

    _finishTravel() {
        if (this.travelTo <= 3) {
            this.startStage(this.travelTo);
        } else {
            this.state = "BOSS_INTRO";
        }
    }

    startBossFight() {
        this.state = "BOSS_BATTLE";
        this.bossHP = 9;
        this.bossHitsLanded = 0;
        this.bossTimer = 0;
        this._pickNewBossPosition();
        window.SoundEngine.play("roar");
    }

    _pickNewBossPosition() {
        const available = this.bossPositions.filter(p => p !== this.bossCurrentPos);
        this.bossCurrentPos = available[Math.floor(Math.random() * available.length)];
        this.bossTimer = 0;
    }

    shootBoss(button) {
        if (this.roses <= 0) {
            this.triggerGameOver();
            return;
        }

        const playerX = this.canvas.width / 2;
        const playerY = this.canvas.height - 60;
        const targetPos = this._getBossScreenCoords(button);
        const isHit = (button === this.bossCurrentPos);

        this.projectiles.push({
            startX: playerX,
            startY: playerY,
            x: playerX,
            y: playerY,
            targetX: targetPos.x,
            targetY: targetPos.y,
            progress: 0,
            isHit: isHit
        });

        this.roses--;
        window.SoundEngine.play("shoot");

        if (isHit) {
            this.bossHurtTimer = 0.4;
            this.bossHP--;
            this.bossHitsLanded++;
            window.SoundEngine.play("hit");

            if (this.bossHP <= 0) {
                setTimeout(() => {
                    this.state = "VICTORY";
                    this.chestOpen = true;
                    window.SoundEngine.play("victory");
                }, 400);
            } else {
                setTimeout(() => {
                    this._pickNewBossPosition();
                }, 200);
            }
        } else {
            window.SoundEngine.play("wrong");
            if (this.roses <= 0 && this.bossHP > 0) {
                setTimeout(() => this.triggerGameOver(), 500);
            }
        }
    }

    triggerGameOver() {
        this.state = "GAME_OVER";
        this.fallProgress = 0;
        window.SoundEngine.play("gameOver");
    }

    _getBossScreenCoords(posCode) {
        const w = this.canvas.width;
        const h = this.canvas.height;
        switch (posCode) {
            case "A": return { x: w * 0.22, y: h * 0.28 };
            case "B": return { x: w * 0.78, y: h * 0.28 };
            case "C": return { x: w * 0.22, y: h * 0.65 };
            case "D": return { x: w * 0.78, y: h * 0.65 };
            default: return { x: w / 2, y: h / 2 };
        }
    }

    gameLoop(timestamp) {
        const dt = (timestamp - this.lastTime) / 1000;
        this.lastTime = timestamp;

        this.update(dt);
        this.render();

        requestAnimationFrame((t) => this.gameLoop(t));
    }

    update(dt) {
        const w = this.canvas.width;
        const h = this.canvas.height;

        this.heroWalkFrame += dt;

        // Cập nhật sinh vật rừng (Chim bay)
        this.forestBirds.forEach(b => {
            b.x += b.vx * dt;
            if (b.x > w + 40) {
                b.x = -40;
                b.y = h * 0.15 + Math.random() * (h * 0.25);
            }
        });

        // Cập nhật sinh vật biển (Cá bơi & Bọt khí)
        this.waterFishes.forEach(f => {
            f.x += f.vx * dt;
            if (f.vx > 0 && f.x > w + 50) {
                f.x = -50;
                f.y = h * 0.2 + Math.random() * (h * 0.55);
            } else if (f.vx < 0 && f.x < -50) {
                f.x = w + 50;
                f.y = h * 0.2 + Math.random() * (h * 0.55);
            }
        });

        this.waterBubbles.forEach(b => {
            b.y += b.vy * dt;
            if (b.y < -10) {
                b.y = h + 10;
                b.x = Math.random() * w;
            }
        });

        // Cập nhật sinh vật mây (Chim lượn)
        this.skyBirds.forEach(b => {
            b.x += b.vx * dt;
            if (b.x > w + 50) {
                b.x = -50;
                b.y = h * 0.12 + Math.random() * (h * 0.3);
            }
        });

        // Cập nhật tiến trình phiêu lưu bước đi (TRAVELING)
        if (this.state === "TRAVELING") {
            this.travelProgress += dt / this.travelDuration;
            if (this.travelProgress >= 1.0) {
                this._finishTravel();
            }
        }

        // Cập nhật Boss
        if (this.state === "BOSS_BATTLE") {
            this.bossFlapAnim += dt * 8;
            if (this.bossHurtTimer > 0) this.bossHurtTimer -= dt;

            this.bossTimer += dt;
            if (this.bossTimer >= this.bossMaxTime) {
                this._pickNewBossPosition();
            }

            if (this.roses <= 0 && this.projectiles.length === 0 && this.bossHP > 0) {
                this.triggerGameOver();
            }
        }

        // Cập nhật đạn bông hồng
        for (let i = this.projectiles.length - 1; i >= 0; i--) {
            const p = this.projectiles[i];
            p.progress += dt * 4;
            p.x = p.startX + (p.targetX - p.startX) * p.progress;
            p.y = p.startY + (p.targetY - p.startY) * p.progress;

            if (p.progress >= 1.0) {
                this.projectiles.splice(i, 1);
            }
        }

        // Cập nhật rơi xuống vực
        if (this.state === "GAME_OVER") {
            if (this.fallProgress < 1.0) {
                this.fallProgress += dt * 0.6;
            }
        }
    }

    render() {
        const ctx = this.ctx;
        const w = this.canvas.width;
        const h = this.canvas.height;
        const time = performance.now() / 1000;

        ctx.clearRect(0, 0, w, h);

        // 1. Vẽ phông nền thế giới tự nhiên sống động
        this._renderWorldBackground(ctx, w, h, time);

        // 2. Vẽ Vệ Binh phiêu lưu ở góc dưới nếu trong màn câu hỏi / intro
        if (["STAGE_INTRO", "QUESTION", "QUESTION_RESULT"].includes(this.state)) {
            this._renderStationedHero(ctx, w, h, time);
        }

        // 3. Vẽ HUD phía trên (Số hoa hồng, Tên vòng chơi)
        this._renderHUD(ctx, w, h);

        // 4. Vẽ nội dung giao diện theo từng trạng thái cụ thể
        switch (this.state) {
            case "START":
                this._renderStartScreen(ctx, w, h);
                break;
            case "STAGE_INTRO":
                this._renderStageIntro(ctx, w, h);
                break;
            case "QUESTION":
                this._renderQuestionScreen(ctx, w, h);
                break;
            case "QUESTION_RESULT":
                this._renderQuestionResultScreen(ctx, w, h);
                break;
            case "STAGE_CLEAR":
                this._renderStageClearScreen(ctx, w, h);
                break;
            case "STAGE_FAILED":
                this._renderStageFailedScreen(ctx, w, h);
                break;
            case "DICE":
            case "DICE_RESULT":
                this._renderDiceScreen(ctx, w, h);
                break;
            case "CARD":
                this._renderCardScreen(ctx, w, h);
                break;
            case "TRAVELING":
                this._renderTravelScreen(ctx, w, h, time);
                break;
            case "BOSS_INTRO":
                this._renderBossIntroScreen(ctx, w, h);
                break;
            case "BOSS_BATTLE":
                this._renderBossBattleScreen(ctx, w, h);
                break;
            case "VICTORY":
                this._renderVictoryScreen(ctx, w, h);
                break;
            case "GAME_OVER":
                this._renderGameOverScreen(ctx, w, h);
                break;
        }

        // 5. Vẽ bông hồng đang bay
        this._renderProjectiles(ctx);
    }

    _renderWorldBackground(ctx, w, h, time) {
        if (this.state === "GAME_OVER") {
            window.PixelSprites.drawValleyScene(ctx, w, h, this.fallProgress);
            return;
        }

        if (this.state === "TRAVELING") {
            // Hoạt cảnh chuyển giao giữa 2 thế giới
            window.PixelSprites.drawTravelCutscene(ctx, w, h, this.travelFrom, this.travelTo, this.travelProgress, time);
            return;
        }

        if (this.state.startsWith("BOSS")) {
            // Hang Rồng Nham Thạch rực lửa
            const magmaGrad = ctx.createLinearGradient(0, 0, 0, h);
            magmaGrad.addColorStop(0, "#2d0c1e");
            magmaGrad.addColorStop(0.6, "#401318");
            magmaGrad.addColorStop(1, "#12050b");
            ctx.fillStyle = magmaGrad;
            ctx.fillRect(0, 0, w, h);

            // Vách đá hang động nhọn
            ctx.fillStyle = "#1e0f18";
            ctx.beginPath();
            ctx.moveTo(0, 0); ctx.lineTo(150, 0); ctx.lineTo(80, 160); ctx.lineTo(0, 240); ctx.closePath(); ctx.fill();
            ctx.beginPath();
            ctx.moveTo(w, 0); ctx.lineTo(w - 150, 0); ctx.lineTo(w - 80, 160); ctx.lineTo(w, 240); ctx.closePath(); ctx.fill();

            // Dung nham sủi bọt dưới đáy
            ctx.fillStyle = "#e74c3c";
            ctx.fillRect(0, h - 35, w, 35);
            ctx.fillStyle = "#f39c12";
            ctx.fillRect(0, h - 40, w, 6);
            return;
        }

        // Vẽ hệ sinh thái theo từng vòng chơi
        if (this.stage === 1) {
            // Vòng 1: Rừng Mật Mã (Cây cối, Chim bay, Hoa cỏ, Nấm, Đom đóm)
            window.PixelSprites.drawForestWorld(ctx, w, h, time, this.forestBirds);
        } else if (this.stage === 2) {
            // Vòng 2: Vùng Biển Dữ Liệu (Cá vẫy đuôi bơi, Rong rêu uốn lượn, San hô, Bọt khí)
            window.PixelSprites.drawWaterWorld(ctx, w, h, time, this.waterFishes, this.waterBubbles);
        } else {
            // Vòng 3: Tầng Mây Thượng Đỉnh (Mây cuộn trôi parallax, Chim lượn, Đảo bay)
            window.PixelSprites.drawCloudWorld(ctx, w, h, time, this.skyBirds);
        }
    }

    // Hiển thị Vệ Binh phiêu lưu đồng hành ở góc dưới màn hình
    _renderStationedHero(ctx, w, h, time) {
        let heroX = 45;
        let heroY = h - 135;
        // Nhân vật thở nhẹ nhàng nhấp nhô và áo choàng bay trong gió
        window.PixelSprites.drawAdventurer(ctx, heroX, heroY, 56, time, 1, false, this.roses);

        // Bong bóng hội thoại nhỏ của Vệ Binh
        ctx.fillStyle = "rgba(20, 15, 30, 0.85)";
        ctx.fillRect(heroX + 55, heroY - 15, 140, 28);
        ctx.strokeStyle = "#00d2d3";
        ctx.lineWidth = 1.5;
        ctx.strokeRect(heroX + 55, heroY - 15, 140, 28);

        ctx.fillStyle = "#00d2d3";
        ctx.font = "bold 11px 'Segoe UI', Tahoma, sans-serif";
        ctx.textAlign = "center";
        ctx.fillText(`🌹 Giữ chắc ${this.roses} hoa!`, heroX + 125, heroY + 3);
    }

    _renderTravelScreen(ctx, w, h, time) {
        // Nút bấm gợi ý bỏ qua
        ctx.fillStyle = "#2ecc71";
        ctx.font = "bold 16px 'Segoe UI', Tahoma, sans-serif";
        ctx.textAlign = "center";
        ctx.fillText("Nhấn [ENTER] để bỏ qua hoạt cảnh", w / 2, h - 30);
    }

    _renderHUD(ctx, w, h) {
        if (this.state === "START" || this.state === "GAME_OVER" || this.state === "TRAVELING") return;

        ctx.fillStyle = "rgba(10, 8, 20, 0.85)";
        ctx.fillRect(0, 0, w, 56);
        ctx.strokeStyle = "#4b466e";
        ctx.lineWidth = 2;
        ctx.strokeRect(0, 0, w, 56);

        // Vẽ 2 logo đối tác thu nhỏ trên HUD
        if (this.logoNBK && this.logoNBK.complete) {
            ctx.fillStyle = "#ffffff";
            ctx.fillRect(16, 13, 30, 30);
            ctx.strokeStyle = "#e74c3c";
            ctx.lineWidth = 2;
            ctx.strokeRect(16, 13, 30, 30);
            ctx.imageSmoothingEnabled = false;
            ctx.drawImage(this.logoNBK, 17, 14, 28, 28);
        }
        if (this.logoSoftLab && this.logoSoftLab.complete) {
            ctx.fillStyle = "#ffffff";
            ctx.fillRect(52, 13, 30, 30);
            ctx.strokeStyle = "#3498db";
            ctx.lineWidth = 2;
            ctx.strokeRect(52, 13, 30, 30);
            ctx.imageSmoothingEnabled = false;
            ctx.drawImage(this.logoSoftLab, 53, 14, 28, 28);
        }

        let stageName = "";
        if (this.state.startsWith("BOSS")) stageName = "⚔️ TRẬN ĐÁNH BOSS CUỐI: RỒNG HẮC ÁM";
        else if (this.stage === 1) stageName = "🌲 VÒNG 1: KHU RỪNG MẬT MÃ (Cây & Chim chóc)";
        else if (this.stage === 2) stageName = "🌊 VÒNG 2: VÙNG BIỂN DỮ LIỆU (Cá & Rong rêu)";
        else stageName = "☁️ VÒNG 3: TẦNG MÂY THƯỢNG ĐỈNH (Mây & Đảo bay)";

        ctx.fillStyle = "#f1c40f";
        ctx.font = "bold 15px 'Segoe UI', Tahoma, sans-serif";
        ctx.textAlign = "left";
        ctx.fillText(stageName, 94, 34);

        if (this.state === "QUESTION" || this.state === "QUESTION_RESULT") {
            ctx.fillStyle = "#ffffff";
            ctx.fillText(`Câu: ${this.currentQIndex + 1}/3  |  Đúng: ${this.stageCorrectCount}/3`, 480, 34);
        }

        window.PixelSprites.drawRose(ctx, w - 240, 14, 28);
        ctx.fillStyle = "#ffffff";
        ctx.font = "bold 18px 'Segoe UI', Tahoma, sans-serif";
        ctx.textAlign = "left";
        ctx.fillText(`Hoa hồng: ${this.roses} 🌹`, w - 200, 36);

        ctx.fillStyle = "#a4b0be";
        ctx.font = "13px 'Segoe UI', Tahoma, sans-serif";
        ctx.textAlign = "right";
        ctx.fillText("Bấm [A, B, C, D] hoặc [ENTER]", w - 20, 36);
    }

    // Vẽ thẻ Logo Pixel có viền và nhãn
    _drawPixelLogoBadge(ctx, img, x, y, size, label, borderColor = "#f1c40f") {
        ctx.save();
        // Nền trắng cho logo nổi bật
        ctx.fillStyle = "#ffffff";
        ctx.fillRect(x, y, size, size);
        ctx.strokeStyle = borderColor;
        ctx.lineWidth = 3;
        ctx.strokeRect(x, y, size, size);

        if (img && img.complete && img.naturalWidth > 0) {
            ctx.imageSmoothingEnabled = false;
            ctx.drawImage(img, x + 3, y + 3, size - 6, size - 6);
        }

        if (label) {
            ctx.fillStyle = "#ffffff";
            ctx.font = "bold 11px 'Segoe UI', Tahoma, sans-serif";
            ctx.textAlign = "center";
            ctx.fillText(label, x + size / 2, y + size + 15);
        }
        ctx.restore();
    }

    _renderStartScreen(ctx, w, h) {
        ctx.fillStyle = "rgba(20, 15, 35, 0.9)";
        ctx.fillRect(w * 0.15, h * 0.08, w * 0.7, h * 0.82);
        ctx.strokeStyle = "#f1c40f";
        ctx.lineWidth = 4;
        ctx.strokeRect(w * 0.15, h * 0.08, w * 0.7, h * 0.82);

        // Vẽ 2 logo đối tác ở 2 góc trên Start Screen
        this._drawPixelLogoBadge(ctx, this.logoNBK, w * 0.18, h * 0.11, 56, "THCS NGUYỄN BỈNH KHIÊM", "#e74c3c");
        this._drawPixelLogoBadge(ctx, this.logoSoftLab, w * 0.75, h * 0.11, 56, "SOFTLAB", "#3498db");

        ctx.fillStyle = "#f1c40f";
        ctx.font = "bold 34px 'Segoe UI', Tahoma, sans-serif";
        ctx.textAlign = "center";
        ctx.fillText("VỆ BINH MẬT KHẨU", w / 2, h * 0.19);

        ctx.fillStyle = "#00d2d3";
        ctx.font = "bold 16px 'Courier New', monospace";
        ctx.fillText("CYBERSEC PASSWORD GUARDIAN", w / 2, h * 0.24);

        ctx.fillStyle = "#f39c12";
        ctx.font = "bold 13px 'Segoe UI', Tahoma, sans-serif";
        ctx.fillText("⭐ ĐỒNG HÀNH: TRƯỜNG THCS NGUYỄN BỈNH KHIÊM × SOFTLAB ⭐", w / 2, h * 0.29);

        // Hiển thị Vệ Binh bước đi dũng cảm ở trung tâm
        window.PixelSprites.drawAdventurer(ctx, w / 2 - 25, h * 0.32, 60, performance.now() / 150, 1, true, 1);

        ctx.fillStyle = "#ecf0f1";
        ctx.font = "15px 'Segoe UI', Tahoma, sans-serif";
        ctx.textAlign = "left";
        const startX = w * 0.22;
        let startY = h * 0.45;
        const lines = [
            "🛡️ 3 Thế giới phiêu lưu: Rừng Mật Mã 🌲, Biển Dữ Liệu 🌊, Tầng Mây ☁️",
            "🌿 Cảnh quan sinh động: Cây cối lay động, chim hót, rong rêu uốn lượn, đàn cá bơi lội",
            "🚶 Nhân vật Vệ Binh đồng hành phiêu lưu qua từng thế giới kỳ thú",
            "🌹 Mỗi câu trả lời đúng được thưởng 1 Bông Hồng (cần đúng 3 câu để pass vòng)",
            "🎲 Sau mỗi vòng: Lắc xúc xắc (Lẻ: đi tiếp | Chẵn: bốc thẻ may rủi tặng hoa)",
            "🐉 Boss Cuối: Cần >= 9 bông hồng để bắn hạ Rồng ở 4 vị trí A, B, C, D!"
        ];
        lines.forEach(l => {
            ctx.fillText(l, startX, startY);
            startY += 28;
        });

        const blink = Math.sin(performance.now() / 250) > 0;
        if (blink) {
            ctx.fillStyle = "#2ecc71";
            ctx.font = "bold 23px 'Segoe UI', Tahoma, sans-serif";
            ctx.textAlign = "center";
            ctx.fillText("👉 NHẤN [ENTER] ĐỂ BẮT ĐẦU CUỘC PHIÊU LƯU 👈", w / 2, h * 0.83);
        }
    }

    _renderStageIntro(ctx, w, h) {
        ctx.fillStyle = "rgba(20, 15, 35, 0.92)";
        ctx.fillRect(w * 0.2, h * 0.2, w * 0.6, h * 0.6);
        ctx.strokeStyle = "#00d2d3";
        ctx.lineWidth = 4;
        ctx.strokeRect(w * 0.2, h * 0.2, w * 0.6, h * 0.6);

        ctx.fillStyle = "#f1c40f";
        ctx.font = "bold 32px 'Segoe UI', Tahoma, sans-serif";
        ctx.textAlign = "center";

        let title = "";
        let desc = "";
        if (this.stage === 1) {
            title = "VÒNG 1: KHU RỪNG MẬT MÃ 🌲";
            desc = "Cây cối rợp bóng và chim chóc ríu rít! Khám phá độ dài & cấu trúc mật khẩu!";
        } else if (this.stage === 2) {
            title = "VÒNG 2: VÙNG BIỂN DỮ LIỆU 🌊";
            desc = "Lặn sâu cùng đàn cá & rong rêu uốn lượn! Cảnh giác Phishing & kích hoạt 2FA!";
        } else {
            title = "VÒNG 3: TẦNG MÂY THƯỢNG ĐỈNH ☁️";
            desc = "Bay cùng những hòn đảo bồng bềnh! Cụm mật khẩu Passphrase & chống Brute-force!";
        }

        ctx.fillText(title, w / 2, h * 0.36);

        ctx.fillStyle = "#ffffff";
        ctx.font = "18px 'Segoe UI', Tahoma, sans-serif";
        ctx.fillText(desc, w / 2, h * 0.46);

        ctx.fillStyle = "#a4b0be";
        ctx.font = "16px 'Segoe UI', Tahoma, sans-serif";
        ctx.fillText("Hãy trả lời đúng cả 3 câu hỏi để bảo vệ thế giới và tích lũy hoa hồng!", w / 2, h * 0.54);

        ctx.fillStyle = "#2ecc71";
        ctx.font = "bold 22px 'Segoe UI', Tahoma, sans-serif";
        ctx.fillText("Nhấn [ENTER] để vào câu hỏi đầu tiên", w / 2, h * 0.68);
    }

    _renderQuestionScreen(ctx, w, h) {
        const q = this.stageQuestions[this.currentQIndex];
        if (!q) return;

        // Khung câu hỏi
        ctx.fillStyle = "rgba(25, 20, 45, 0.95)";
        ctx.fillRect(w * 0.16, h * 0.14, w * 0.74, h * 0.26);
        ctx.strokeStyle = "#3498db";
        ctx.lineWidth = 3;
        ctx.strokeRect(w * 0.16, h * 0.14, w * 0.74, h * 0.26);

        ctx.fillStyle = "#ffffff";
        ctx.font = "bold 20px 'Segoe UI', Tahoma, sans-serif";
        ctx.textAlign = "left";
        window.PixelSprites._wrapText(ctx, q.question, w * 0.19, h * 0.22, w * 0.68, 28);

        // 4 Lựa chọn A, B, C, D
        const optColors = ["#eb445a", "#3498db", "#f1c40f", "#2ecc71"];
        const optKeys = ["A", "B", "C", "D"];

        const boxW = w * 0.35;
        const boxH = h * 0.18;
        const positions = [
            { x: w * 0.16, y: h * 0.45 },
            { x: w * 0.55, y: h * 0.45 },
            { x: w * 0.16, y: h * 0.67 },
            { x: w * 0.55, y: h * 0.67 }
        ];

        q.options.forEach((optText, idx) => {
            const pos = positions[idx];
            ctx.fillStyle = "rgba(18, 14, 32, 0.92)";
            ctx.fillRect(pos.x, pos.y, boxW, boxH);

            ctx.strokeStyle = optColors[idx];
            ctx.lineWidth = 3;
            ctx.strokeRect(pos.x, pos.y, boxW, boxH);

            ctx.fillStyle = optColors[idx];
            ctx.fillRect(pos.x + 12, pos.y + 12, 34, 34);
            ctx.fillStyle = "#ffffff";
            ctx.font = "bold 20px 'Segoe UI', Tahoma, sans-serif";
            ctx.textAlign = "center";
            ctx.fillText(optKeys[idx], pos.x + 29, pos.y + 36);

            ctx.fillStyle = "#ecf0f1";
            ctx.font = "16px 'Segoe UI', Tahoma, sans-serif";
            ctx.textAlign = "left";
            window.PixelSprites._wrapText(ctx, optText.substring(3), pos.x + 58, pos.y + 32, boxW - 70, 22);
        });

        ctx.fillStyle = "#a4b0be";
        ctx.font = "15px 'Segoe UI', Tahoma, sans-serif";
        ctx.textAlign = "center";
        ctx.fillText("Nhấn nút [A], [B], [C] hoặc [D] tương ứng để chọn đáp án", w / 2, h * 0.92);
    }

    _renderQuestionResultScreen(ctx, w, h) {
        ctx.fillStyle = "rgba(18, 14, 32, 0.95)";
        ctx.fillRect(w * 0.18, h * 0.18, w * 0.68, h * 0.64);

        const borderColor = this.isAnswerCorrect ? "#2ecc71" : "#e74c3c";
        ctx.strokeStyle = borderColor;
        ctx.lineWidth = 4;
        ctx.strokeRect(w * 0.18, h * 0.18, w * 0.68, h * 0.64);

        ctx.fillStyle = borderColor;
        ctx.font = "bold 28px 'Segoe UI', Tahoma, sans-serif";
        ctx.textAlign = "center";
        ctx.fillText(this.resultTitle, w / 2, h * 0.28);

        if (this.isAnswerCorrect) {
            window.PixelSprites.drawRose(ctx, w / 2 - 20, h * 0.32, 40);
        }

        ctx.fillStyle = "rgba(40, 35, 65, 0.85)";
        ctx.fillRect(w * 0.22, h * 0.42, w * 0.60, h * 0.24);
        ctx.strokeStyle = "#7873af";
        ctx.lineWidth = 2;
        ctx.strokeRect(w * 0.22, h * 0.42, w * 0.60, h * 0.24);

        ctx.fillStyle = "#f1c40f";
        ctx.font = "bold 16px 'Segoe UI', Tahoma, sans-serif";
        ctx.textAlign = "left";
        ctx.fillText("💡 BÍ KÍP BẢO MẬT:", w * 0.24, h * 0.47);

        ctx.fillStyle = "#ffffff";
        ctx.font = "16px 'Segoe UI', Tahoma, sans-serif";
        window.PixelSprites._wrapText(ctx, this.resultExplanation, w * 0.24, h * 0.52, w * 0.56, 24);

        ctx.fillStyle = "#2ecc71";
        ctx.font = "bold 20px 'Segoe UI', Tahoma, sans-serif";
        ctx.textAlign = "center";
        ctx.fillText("Nhấn [ENTER] để tiếp tục", w / 2, h * 0.76);
    }

    _renderStageClearScreen(ctx, w, h) {
        ctx.fillStyle = "rgba(18, 14, 32, 0.95)";
        ctx.fillRect(w * 0.2, h * 0.2, w * 0.6, h * 0.6);
        ctx.strokeStyle = "#f1c40f";
        ctx.lineWidth = 4;
        ctx.strokeRect(w * 0.2, h * 0.2, w * 0.6, h * 0.6);

        ctx.fillStyle = "#2ecc71";
        ctx.font = "bold 32px 'Segoe UI', Tahoma, sans-serif";
        ctx.textAlign = "center";
        ctx.fillText("🎉 CHÚC MỪNG BẠN ĐÃ PASS VÒNG! 🎉", w / 2, h * 0.34);

        ctx.fillStyle = "#ffffff";
        ctx.font = "18px 'Segoe UI', Tahoma, sans-serif";
        ctx.fillText(`Bạn đã trả lời chính xác cả 3/3 câu hỏi của Vòng ${this.stage}!`, w / 2, h * 0.44);

        ctx.fillStyle = "#f1c40f";
        ctx.font = "bold 20px 'Segoe UI', Tahoma, sans-serif";
        ctx.fillText(`Số hoa hồng hiện có: ${this.roses} 🌹`, w / 2, h * 0.52);

        ctx.fillStyle = "#00d2d3";
        ctx.font = "16px 'Segoe UI', Tahoma, sans-serif";
        ctx.fillText("Bước tiếp theo: Thử vận may với Minigame LẮC XÚC XẮC!", w / 2, h * 0.60);

        ctx.fillStyle = "#f1c40f";
        ctx.font = "bold 22px 'Segoe UI', Tahoma, sans-serif";
        ctx.fillText("👉 Nhấn [ENTER] để Lắc Xúc Xắc 🎲", w / 2, h * 0.72);
    }

    _renderStageFailedScreen(ctx, w, h) {
        ctx.fillStyle = "rgba(18, 14, 32, 0.95)";
        ctx.fillRect(w * 0.2, h * 0.2, w * 0.6, h * 0.6);
        ctx.strokeStyle = "#e74c3c";
        ctx.lineWidth = 4;
        ctx.strokeRect(w * 0.2, h * 0.2, w * 0.6, h * 0.6);

        ctx.fillStyle = "#e74c3c";
        ctx.font = "bold 30px 'Segoe UI', Tahoma, sans-serif";
        ctx.textAlign = "center";
        ctx.fillText("⚠️ CHƯA ĐẠT ĐIỀU KIỆN PASS VÒNG! ⚠️", w / 2, h * 0.34);

        ctx.fillStyle = "#ffffff";
        ctx.font = "18px 'Segoe UI', Tahoma, sans-serif";
        ctx.fillText(`Bạn chỉ đúng ${this.stageCorrectCount}/3 câu. Cần đúng cả 3 câu để vượt qua!`, w / 2, h * 0.44);

        ctx.fillStyle = "#a4b0be";
        ctx.font = "16px 'Segoe UI', Tahoma, sans-serif";
        ctx.fillText("Hãy thử lại vòng này với các câu hỏi và dữ liệu mật khẩu mới nhé!", w / 2, h * 0.54);

        ctx.fillStyle = "#f1c40f";
        ctx.font = "bold 22px 'Segoe UI', Tahoma, sans-serif";
        ctx.fillText("Nhấn [ENTER] để thử lại Vòng này", w / 2, h * 0.70);
    }

    _renderDiceScreen(ctx, w, h) {
        ctx.fillStyle = "rgba(18, 14, 32, 0.95)";
        ctx.fillRect(w * 0.2, h * 0.15, w * 0.6, h * 0.7);
        ctx.strokeStyle = "#9b59b6";
        ctx.lineWidth = 4;
        ctx.strokeRect(w * 0.2, h * 0.15, w * 0.6, h * 0.7);

        ctx.fillStyle = "#9b59b6";
        ctx.font = "bold 30px 'Segoe UI', Tahoma, sans-serif";
        ctx.textAlign = "center";
        ctx.fillText("🎲 MINIGAME: LẮC XÚC XẮC ĐỊNH MỆNH 🎲", w / 2, h * 0.26);

        window.PixelSprites.drawDice(ctx, w / 2 - 50, h * 0.34, 100, this.diceValue, this.isDiceRolling);

        if (this.state === "DICE") {
            ctx.fillStyle = "#ecf0f1";
            ctx.font = "16px 'Segoe UI', Tahoma, sans-serif";
            ctx.fillText("Quy luật xúc xắc:", w / 2, h * 0.56);
            ctx.fillText("• Số LẺ (1, 3, 5): Vệ Binh bước đi phiêu lưu vào vùng đất tiếp theo", w / 2, h * 0.61);
            ctx.fillText("• Số CHẴN (2, 4, 6): Kích hoạt ô BỐC THẺ BÍ ẨN (tặng 1-3 hoa hồng hoặc thử thách)!", w / 2, h * 0.66);

            ctx.fillStyle = "#2ecc71";
            ctx.font = "bold 22px 'Segoe UI', Tahoma, sans-serif";
            ctx.fillText("👉 Nhấn [ENTER] để Gieo Xúc Xắc 👈", w / 2, h * 0.76);
        } else {
            const isEven = (this.diceValue % 2 === 0);
            ctx.fillStyle = isEven ? "#f1c40f" : "#2ecc71";
            ctx.font = "bold 24px 'Segoe UI', Tahoma, sans-serif";

            if (isEven) {
                ctx.fillText(`KẾT QUẢ: SỐ ${this.diceValue} (SỐ CHẴN) -> BỐC THẺ MAY RỦI! 🃏`, w / 2, h * 0.58);
                ctx.fillStyle = "#ffffff";
                ctx.font = "16px 'Segoe UI', Tahoma, sans-serif";
                ctx.fillText("Bạn mở khóa ô Thẻ Bí Ẩn! Cơ hội nhận thêm 1-3 hoa hồng!", w / 2, h * 0.64);
                ctx.fillStyle = "#f1c40f";
                ctx.font = "bold 22px 'Segoe UI', Tahoma, sans-serif";
                ctx.fillText("Nhấn [ENTER] để tiến vào Bốc Thẻ", w / 2, h * 0.76);
            } else {
                ctx.fillText(`KẾT QUẢ: SỐ ${this.diceValue} (SỐ LẺ) -> PHIÊU LƯU TIẾP TỤC! 🚀`, w / 2, h * 0.58);
                ctx.fillStyle = "#ffffff";
                ctx.font = "16px 'Segoe UI', Tahoma, sans-serif";
                ctx.fillText("Đường đi an toàn! Vệ Binh chuẩn bị bước đi sang vùng đất mới!", w / 2, h * 0.64);
                ctx.fillStyle = "#2ecc71";
                ctx.font = "bold 22px 'Segoe UI', Tahoma, sans-serif";
                ctx.fillText("Nhấn [ENTER] để bắt đầu hành trình bước đi", w / 2, h * 0.76);
            }
        }
    }

    _renderCardScreen(ctx, w, h) {
        ctx.fillStyle = "rgba(18, 14, 32, 0.95)";
        ctx.fillRect(w * 0.2, h * 0.12, w * 0.6, h * 0.76);
        ctx.strokeStyle = "#f1c40f";
        ctx.lineWidth = 4;
        ctx.strokeRect(w * 0.2, h * 0.12, w * 0.6, h * 0.76);

        ctx.fillStyle = "#f1c40f";
        ctx.font = "bold 28px 'Segoe UI', Tahoma, sans-serif";
        ctx.textAlign = "center";
        ctx.fillText("🃏 THẺ BÀI MA THUẬT AN NINH MẠNG 🃏", w / 2, h * 0.22);

        window.PixelSprites.drawCard(ctx, w / 2 - 100, h * 0.28, 200, 270, this.currentCard, this.cardRevealed);

        if (!this.cardRevealed) {
            ctx.fillStyle = "#2ecc71";
            ctx.font = "bold 22px 'Segoe UI', Tahoma, sans-serif";
            ctx.fillText("👉 Nhấn [ENTER] để Lật Thẻ Bí Ẩn 👈", w / 2, h * 0.81);
        } else {
            ctx.fillStyle = "#2ecc71";
            ctx.font = "bold 22px 'Segoe UI', Tahoma, sans-serif";
            ctx.fillText("👉 Nhấn [ENTER] để Bước Vào Hành Trình Phiêu Lưu 👈", w / 2, h * 0.81);
        }
    }

    _renderBossIntroScreen(ctx, w, h) {
        ctx.fillStyle = "rgba(25, 10, 15, 0.95)";
        ctx.fillRect(w * 0.15, h * 0.14, w * 0.7, h * 0.72);
        ctx.strokeStyle = "#e74c3c";
        ctx.lineWidth = 4;
        ctx.strokeRect(w * 0.15, h * 0.14, w * 0.7, h * 0.72);

        ctx.fillStyle = "#e74c3c";
        ctx.font = "bold 32px 'Segoe UI', Tahoma, sans-serif";
        ctx.textAlign = "center";
        ctx.fillText("⚠️ CẢNH BÁO: RỒNG HẮC ÁM XUẤT HIỆN! ⚠️", w / 2, h * 0.24);

        window.PixelSprites.drawDragon(ctx, w / 2 - 70, h * 0.28, 140, 120, false, performance.now() / 200);

        ctx.fillStyle = "#ffffff";
        ctx.font = "18px 'Segoe UI', Tahoma, sans-serif";
        ctx.fillText(`Bạn đang có: ${this.roses} Bông Hồng 🌹  |  Máu Boss Rồng: 9 HP 🐉`, w / 2, h * 0.52);

        if (this.roses >= 9) {
            ctx.fillStyle = "#2ecc71";
            ctx.font = "bold 20px 'Segoe UI', Tahoma, sans-serif";
            ctx.fillText("✅ BẠN ĐÃ CÓ ĐỦ >= 9 HOA HỒNG ĐỂ TIÊU DIỆT RỒNG!", w / 2, h * 0.58);
            ctx.fillStyle = "#ecf0f1";
            ctx.font = "16px 'Segoe UI', Tahoma, sans-serif";
            ctx.fillText("Cách chơi: Rồng sẽ xuất hiện ngẫu nhiên ở 4 vị trí A, B, C, D.", w / 2, h * 0.63);
            ctx.fillText("Bấm phím tương ứng (A, B, C hoặc D) thật nhanh để phóng hoa hồng bắn hạ nó!", w / 2, h * 0.67);
        } else {
            ctx.fillStyle = "#e74c3c";
            ctx.font = "bold 20px 'Segoe UI', Tahoma, sans-serif";
            ctx.fillText(`⚠️ NGUY HIỂM! Bạn chỉ có ${this.roses} hoa hồng (cần 9 hoa để tiêu diệt Rồng)!`, w / 2, h * 0.58);
            ctx.fillStyle = "#ecf0f1";
            ctx.font = "16px 'Segoe UI', Tahoma, sans-serif";
            ctx.fillText("Nếu hết hoa hồng mà Rồng chưa chết, bạn sẽ bị ném xuống thung lũng!", w / 2, h * 0.64);
        }

        ctx.fillStyle = "#f1c40f";
        ctx.font = "bold 22px 'Segoe UI', Tahoma, sans-serif";
        ctx.fillText("👉 Nhấn [ENTER] để Bước Vào Trận Chiến Sinh Tử! 👈", w / 2, h * 0.78);
    }

    _renderBossBattleScreen(ctx, w, h) {
        const positions = [
            { key: "A", name: "CỔNG A", coords: this._getBossScreenCoords("A"), color: "#eb445a" },
            { key: "B", name: "CỔNG B", coords: this._getBossScreenCoords("B"), color: "#3498db" },
            { key: "C", name: "CỔNG C", coords: this._getBossScreenCoords("C"), color: "#f1c40f" },
            { key: "D", name: "CỔNG D", coords: this._getBossScreenCoords("D"), color: "#2ecc71" }
        ];

        positions.forEach(p => {
            const bx = p.coords.x;
            const by = p.coords.y;

            ctx.fillStyle = "rgba(20, 15, 30, 0.7)";
            ctx.fillRect(bx - 80, by - 60, 160, 120);

            const isCurrentBoss = (p.key === this.bossCurrentPos);
            ctx.strokeStyle = isCurrentBoss ? "#ff3838" : p.color;
            ctx.lineWidth = isCurrentBoss ? 5 : 2;
            ctx.strokeRect(bx - 80, by - 60, 160, 120);

            ctx.fillStyle = p.color;
            ctx.fillRect(bx - 70, by - 50, 28, 28);
            ctx.fillStyle = "#ffffff";
            ctx.font = "bold 16px 'Segoe UI', Tahoma, sans-serif";
            ctx.textAlign = "center";
            ctx.fillText(p.key, bx - 56, by - 30);

            if (isCurrentBoss) {
                const isHurt = this.bossHurtTimer > 0;
                window.PixelSprites.drawDragon(ctx, bx - 80, by - 60, 160, 130, isHurt, this.bossFlapAnim);

                const timeLeftPercent = Math.max(0, 1 - (this.bossTimer / this.bossMaxTime));
                ctx.fillStyle = "rgba(0, 0, 0, 0.7)";
                ctx.fillRect(bx - 60, by + 45, 120, 10);
                ctx.fillStyle = timeLeftPercent > 0.3 ? "#e74c3c" : "#ff0000";
                ctx.fillRect(bx - 60, by + 45, 120 * timeLeftPercent, 10);
            }
        });

        // Thanh Máu Boss
        const barW = 400;
        const barX = (w - barW) / 2;
        const barY = 70;

        ctx.fillStyle = "rgba(0, 0, 0, 0.8)";
        ctx.fillRect(barX, barY, barW, 26);
        ctx.strokeStyle = "#e74c3c";
        ctx.lineWidth = 2;
        ctx.strokeRect(barX, barY, barW, 26);

        const hpPercent = Math.max(0, this.bossHP / this.bossMaxHP);
        ctx.fillStyle = "#e74c3c";
        ctx.fillRect(barX + 2, barY + 2, (barW - 4) * hpPercent, 22);

        ctx.fillStyle = "#ffffff";
        ctx.font = "bold 14px 'Segoe UI', Tahoma, sans-serif";
        ctx.textAlign = "center";
        ctx.fillText(`MÁU RỒNG HẮC ÁM: ${this.bossHP} / ${this.bossMaxHP} HP`, w / 2, barY + 18);

        // Vẽ Vệ Binh ở vị trí bắn sẵn sàng
        const px = w / 2 - 20;
        const py = h - 90;
        window.PixelSprites.drawAdventurer(ctx, px, py, 50, performance.now() / 200, 1, false, this.roses);

        ctx.fillStyle = "#f1c40f";
        ctx.font = "bold 18px 'Segoe UI', Tahoma, sans-serif";
        ctx.textAlign = "center";
        ctx.fillText(`🎯 Rồng đang ở cổng [${this.bossCurrentPos}]! BẤM PHÍM [${this.bossCurrentPos}] ĐỂ BẮN HOA HỒNG! 🌹`, w / 2, h - 18);
    }

    _renderVictoryScreen(ctx, w, h) {
        ctx.fillStyle = "rgba(10, 8, 20, 0.95)";
        ctx.fillRect(w * 0.15, h * 0.12, w * 0.7, h * 0.76);
        ctx.strokeStyle = "#f1c40f";
        ctx.lineWidth = 5;
        ctx.strokeRect(w * 0.15, h * 0.12, w * 0.7, h * 0.76);

        ctx.fillStyle = "#f1c40f";
        ctx.font = "bold 34px 'Segoe UI', Tahoma, sans-serif";
        ctx.textAlign = "center";
        ctx.fillText("🏆 CHIẾN THẮNG TUYỆT ĐỐI! 🏆", w / 2, h * 0.22);

        ctx.fillStyle = "#2ecc71";
        ctx.font = "bold 20px 'Segoe UI', Tahoma, sans-serif";
        ctx.fillText("BẠN ĐÃ TIÊU DIỆT HOÀN TOÀN RỒNG HẮC ÁM!", w / 2, h * 0.28);

        window.PixelSprites.drawTreasureChest(ctx, w / 2 - 75, h * 0.32, 150, true);

        // Vệ Binh đứng cạnh rương ăn mừng
        window.PixelSprites.drawAdventurer(ctx, w / 2 + 100, h * 0.38, 55, performance.now() / 200, -1, false, 5);

        for (let i = 0; i < 6; i++) {
            const rx = w * 0.25 + Math.random() * (w * 0.5);
            const ry = h * 0.25 + Math.random() * (h * 0.4);
            window.PixelSprites.drawRose(ctx, rx, ry, 30);
        }

        ctx.fillStyle = "#ffffff";
        ctx.font = "18px 'Segoe UI', Tahoma, sans-serif";
        ctx.fillText("Bạn đã đoạt được: 'KHO BÁU MẬT MÃ HOÀNG KIM'", w / 2, h * 0.63);
        ctx.fillStyle = "#00d2d3";
        ctx.fillText("Và đạt danh hiệu cao quý: BẬC THẦY VỆ BINH AN NINH MẠNG!", w / 2, h * 0.67);

        // Logo 2 đơn vị đồng hành chúc mừng
        this._drawPixelLogoBadge(ctx, this.logoNBK, w / 2 - 90, h * 0.70, 40, "THCS NBK", "#e74c3c");
        this._drawPixelLogoBadge(ctx, this.logoSoftLab, w / 2 + 50, h * 0.70, 40, "SOFTLAB", "#3498db");

        ctx.fillStyle = "#f1c40f";
        ctx.font = "bold 20px 'Segoe UI', Tahoma, sans-serif";
        ctx.fillText("👉 Nhấn [ENTER] để Chơi Lại Từ Đầu 👈", w / 2, h * 0.83);
    }

    _renderGameOverScreen(ctx, w, h) {
        ctx.fillStyle = "rgba(10, 5, 15, 0.85)";
        ctx.fillRect(w * 0.15, h * 0.2, w * 0.7, h * 0.6);
        ctx.strokeStyle = "#e74c3c";
        ctx.lineWidth = 4;
        ctx.strokeRect(w * 0.15, h * 0.2, w * 0.7, h * 0.6);

        ctx.fillStyle = "#e74c3c";
        ctx.font = "bold 34px 'Segoe UI', Tahoma, sans-serif";
        ctx.textAlign = "center";
        ctx.fillText("💀 GAME OVER: BỊ NÉM XUỐNG THUNG LŨNG! 💀", w / 2, h * 0.32);

        ctx.fillStyle = "#ffffff";
        ctx.font = "18px 'Segoe UI', Tahoma, sans-serif";
        ctx.fillText("Bạn không đủ hỏa lực hoa hồng hoặc đã để Rồng Hắc Ám phản công!", w / 2, h * 0.42);

        ctx.fillStyle = "#ecf0f1";
        ctx.font = "16px 'Segoe UI', Tahoma, sans-serif";
        ctx.fillText("Rồng đã dùng sức mạnh bão lửa thổi bay bạn rơi thẳng xuống vực thẳm đá nhọn!", w / 2, h * 0.50);

        ctx.fillStyle = "#f1c40f";
        ctx.font = "16px 'Segoe UI', Tahoma, sans-serif";
        ctx.fillText("💡 Mẹo: Hãy cố gắng trả lời đúng tất cả các câu và tận dụng thẻ may mắn để tích >= 9 bông hồng!", w / 2, h * 0.60);

        ctx.fillStyle = "#2ecc71";
        ctx.font = "bold 22px 'Segoe UI', Tahoma, sans-serif";
        ctx.fillText("👉 Nhấn [ENTER] để Thử Thách Lại Từ Đầu 👈", w / 2, h * 0.72);
    }

    _renderProjectiles(ctx) {
        this.projectiles.forEach(p => {
            window.PixelSprites.drawRose(ctx, p.x - 16, p.y - 16, 32);
        });
    }
}

window.addEventListener("DOMContentLoaded", () => {
    window.game = new CyberSecGame();
});
