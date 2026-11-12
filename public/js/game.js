/**
 * Game Engine Vệ Binh Mật Khẩu (CyberSec Password Guardian)
 * Quản lý vòng lặp game, state machine, input, canvas và luật chơi
 */

class CyberSecGame {
    constructor() {
        this.canvas = document.getElementById("gameCanvas");
        this.ctx = this.canvas.getContext("2d");

        // Game States:
        // START -> STAGE_INTRO -> QUESTION -> QUESTION_RESULT -> STAGE_CLEAR -> DICE -> CARD -> BOSS_INTRO -> BOSS_BATTLE -> VICTORY -> GAME_OVER
        this.state = "START";

        // Game Progress
        this.stage = 1; // 1: Rừng, 2: Nước, 3: Mây
        this.stageQuestions = [];
        this.currentQIndex = 0;
        this.stageCorrectCount = 0;
        this.roses = 0; // Số bông hồng tích lũy

        // Dice & Card State
        this.diceValue = 1;
        this.isDiceRolling = false;
        this.diceRollTimer = 0;
        this.currentCard = null;
        this.cardRevealed = false;

        // Boss Battle State
        this.bossHP = 9;
        this.bossMaxHP = 9;
        this.bossPositions = ["A", "B", "C", "D"];
        this.bossCurrentPos = "A";
        this.bossTimer = 0;
        this.bossMaxTime = 2.0; // Giây ở mỗi vị trí
        this.bossHurtTimer = 0;
        this.bossFlapAnim = 0;
        this.bossHitsLanded = 0;

        // Projectile Animations
        this.projectiles = []; // { startX, startY, targetX, targetY, progress, isHit }

        // Animation Timers
        this.lastTime = performance.now();
        this.bgParticles = [];
        this.fallProgress = 0;
        this.chestOpen = false;

        // Feedback / Result Text
        this.resultTitle = "";
        this.resultExplanation = "";
        this.isAnswerCorrect = false;

        // Active Buttons Highlight for UI
        this.activeButtons = { A: false, B: false, C: false, D: false, ENTER: false };

        this._initParticles();
        this._bindInputs();
        this._connectWebSocket();

        // Start Loop
        requestAnimationFrame((t) => this.gameLoop(t));
    }

    _initParticles() {
        this.bgParticles = [];
        for (let i = 0; i < 40; i++) {
            this.bgParticles.push({
                x: Math.random() * this.canvas.width,
                y: Math.random() * this.canvas.height,
                speed: 0.5 + Math.random() * 1.5,
                size: 2 + Math.random() * 4,
                char: Math.random() > 0.5 ? "1" : "0"
            });
        }
    }

    // Kết nối WebSocket nhận tín hiệu từ Arduino thông qua server Node.js
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
        // Bắt phím bàn phím máy tính
        window.addEventListener("keydown", (e) => {
            let key = e.key.toUpperCase();
            if (key === "ENTER" || key === " ") {
                this.handleInput("ENTER");
            } else if (["A", "B", "C", "D"].includes(key)) {
                this.handleInput(key);
            }
        });

        // Bắt nút bấm chuột trên giao diện Arcade
        document.querySelectorAll(".arcade-btn").forEach((btn) => {
            btn.addEventListener("click", () => {
                const btnKey = btn.getAttribute("data-key");
                if (btnKey) this.handleInput(btnKey);
            });
        });
    }

    // Xử lý sự kiện 5 nút bấm A, B, C, D, ENTER
    handleInput(button) {
        // Highlight nút trên UI
        this.activeButtons[button] = true;
        setTimeout(() => { this.activeButtons[button] = false; }, 200);

        // Phát âm thanh bấm phím
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
                    // Chuyển sang màn Lắc Xúc Xắc
                    this.state = "DICE";
                    this.isDiceRolling = false;
                }
                break;

            case "STAGE_FAILED":
                if (button === "ENTER") {
                    // Thử thách lại vòng để đạt đủ 3 câu đúng
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
                        // Số chẵn -> Bốc thẻ
                        this.state = "CARD";
                        this.cardRevealed = false;
                        this.currentCard = this._getRandomCard();
                    } else {
                        // Số lẻ -> Đi tiếp bình thường
                        this.proceedAfterDice();
                    }
                }
                break;

            case "CARD":
                if (button === "ENTER") {
                    if (!this.cardRevealed) {
                        // Lật thẻ
                        this.cardRevealed = true;
                        window.SoundEngine.play("card");
                        // Áp dụng hiệu ứng thẻ
                        if (this.currentCard.type === "bonus") {
                            this.roses += this.currentCard.roses;
                        } else if (this.currentCard.type === "penalty") {
                            this.roses = Math.max(0, this.roses + this.currentCard.roses);
                        }
                    } else {
                        // Đã xem xong thẻ, đi tiếp vòng kế hoặc boss
                        this.proceedAfterDice();
                    }
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
                    // Reset game về ban đầu
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
        // Sinh 3 câu hỏi ngẫu nhiên với dữ liệu động hoàn toàn mới
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
            this.roses++; // Mỗi câu đúng được 1 bông hồng
            this.resultTitle = "CHÍNH XÁC! (+1 BÔNG HỒNG 🌹)";
            window.SoundEngine.play("correct");
        } else {
            this.isAnswerCorrect = false;
            // Nếu sai không có bông hồng câu đó
            this.resultTitle = "CHƯA CHÍNH XÁC! (0 BÔNG HỒNG)";
            window.SoundEngine.play("wrong");
        }
        this.resultExplanation = q.explanation;
        this.state = "QUESTION_RESULT";
    }

    nextQuestion() {
        this.currentQIndex++;
        if (this.currentQIndex < 3) {
            // Còn câu hỏi trong vòng
            this.state = "QUESTION";
        } else {
            // Đã trả lời hết 3 câu
            if (this.stageCorrectCount === 3) {
                // Trả lời đúng hết 3 câu thì pass!
                this.state = "STAGE_CLEAR";
                window.SoundEngine.play("correct");
            } else {
                // Chưa trả lời đúng hết 3 câu
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

    proceedAfterDice() {
        if (this.stage < 3) {
            // Sang vòng tiếp theo
            this.startStage(this.stage + 1);
        } else {
            // Sau màn cuối (Vòng 3: Mây) -> Tiến vào Hang Boss Rồng!
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

    // Bắn Boss bằng nút A, B, C, D
    shootBoss(button) {
        if (this.roses <= 0) {
            // Không còn hoa hồng nào để bắn!
            this.triggerGameOver();
            return;
        }

        // Tọa độ người chơi ở trung tâm đáy màn hình
        const playerX = this.canvas.width / 2;
        const playerY = this.canvas.height - 60;

        // Tọa độ 4 vị trí Boss A, B, C, D
        const targetPos = this._getBossScreenCoords(button);

        const isHit = (button === this.bossCurrentPos);

        // Tạo hiệu ứng phóng bông hồng bay từ người chơi tới mục tiêu
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

        // Tiêu hao 1 bông hồng
        this.roses--;
        window.SoundEngine.play("shoot");

        if (isHit) {
            // Bắn trúng Boss!
            this.bossHurtTimer = 0.4;
            this.bossHP--;
            this.bossHitsLanded++;
            window.SoundEngine.play("hit");

            if (this.bossHP <= 0) {
                // ĐÃ TIÊU DIỆT BOSS RỒNG! WIN GAME!
                setTimeout(() => {
                    this.state = "VICTORY";
                    this.chestOpen = true;
                    window.SoundEngine.play("victory");
                }, 400);
            } else {
                // Boss trúng đòn đổi sang vị trí ngẫu nhiên khác
                setTimeout(() => {
                    this._pickNewBossPosition();
                }, 200);
            }
        } else {
            // Bắn trượt/sai vị trí
            window.SoundEngine.play("wrong");
            // Nếu hết hoa hồng mà Boss chưa chết
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
            case "A": return { x: w * 0.22, y: h * 0.28 }; // Trên trái
            case "B": return { x: w * 0.78, y: h * 0.28 }; // Trên phải
            case "C": return { x: w * 0.22, y: h * 0.65 }; // Dưới trái
            case "D": return { x: w * 0.78, y: h * 0.65 }; // Dưới phải
            default: return { x: w / 2, y: h / 2 };
        }
    }

    // Vòng lặp cập nhật và vẽ khung hình (60 FPS)
    gameLoop(timestamp) {
        const dt = (timestamp - this.lastTime) / 1000;
        this.lastTime = timestamp;

        this.update(dt);
        this.render();

        requestAnimationFrame((t) => this.gameLoop(t));
    }

    update(dt) {
        // Cập nhật hạt bụi pixel background
        this.bgParticles.forEach(p => {
            p.y += p.speed;
            if (p.y > this.canvas.height) {
                p.y = -10;
                p.x = Math.random() * this.canvas.width;
            }
        });

        // Cập nhật Boss
        if (this.state === "BOSS_BATTLE") {
            this.bossFlapAnim += dt * 8;
            if (this.bossHurtTimer > 0) this.bossHurtTimer -= dt;

            // Đếm ngược thời gian tại mỗi vị trí
            this.bossTimer += dt;
            if (this.bossTimer >= this.bossMaxTime) {
                // Boss đổi chỗ nếu người chơi không kịp bắn
                this._pickNewBossPosition();
            }

            // Nếu người chơi hết hoa hồng và không còn đạn đang bay
            if (this.roses <= 0 && this.projectiles.length === 0 && this.bossHP > 0) {
                this.triggerGameOver();
            }
        }

        // Cập nhật đường bay của bông hồng phóng đi
        for (let i = this.projectiles.length - 1; i >= 0; i--) {
            const p = this.projectiles[i];
            p.progress += dt * 4; // Tốc độ bay
            p.x = p.startX + (p.targetX - p.startX) * p.progress;
            p.y = p.startY + (p.targetY - p.startY) * p.progress;

            if (p.progress >= 1.0) {
                this.projectiles.splice(i, 1);
            }
        }

        // Cập nhật rơi xuống vực khi Game Over
        if (this.state === "GAME_OVER") {
            if (this.fallProgress < 1.0) {
                this.fallProgress += dt * 0.6;
            }
        }
    }

    // ==========================================
    // RENDER SYSTEM (VẼ TOÀN BỘ GIAO DIỆN GAME)
    // ==========================================
    render() {
        const ctx = this.ctx;
        const w = this.canvas.width;
        const h = this.canvas.height;

        ctx.clearRect(0, 0, w, h);

        // Vẽ phông nền theo trạng thái
        this._renderBackground(ctx, w, h);

        // Vẽ HUD phía trên (Số hoa hồng, Tên vòng chơi)
        this._renderHUD(ctx, w, h);

        // Vẽ nội dung theo từng trạng thái cụ thể
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

        // Vẽ bông hồng đang bay (projectiles)
        this._renderProjectiles(ctx);
    }

    _renderBackground(ctx, w, h) {
        if (this.state === "GAME_OVER") {
            window.PixelSprites.drawValleyScene(ctx, w, h, this.fallProgress);
            return;
        }

        let bgGrad;
        if (this.state === "BOSS_BATTLE" || this.state === "BOSS_INTRO") {
            // Hang Rồng đỏ rực magma
            bgGrad = ctx.createLinearGradient(0, 0, 0, h);
            bgGrad.addColorStop(0, "#2d0c1e");
            bgGrad.addColorStop(1, "#12050b");
        } else if (this.stage === 1) {
            // Rừng Mật Mã xanh ngát
            bgGrad = ctx.createLinearGradient(0, 0, 0, h);
            bgGrad.addColorStop(0, "#082613");
            bgGrad.addColorStop(1, "#041208");
        } else if (this.stage === 2) {
            // Vùng Biển Dữ Liệu xanh thẳm
            bgGrad = ctx.createLinearGradient(0, 0, 0, h);
            bgGrad.addColorStop(0, "#0c2461");
            bgGrad.addColorStop(1, "#07122b");
        } else {
            // Tầng Mây Thượng Đỉnh tím huyền ảo
            bgGrad = ctx.createLinearGradient(0, 0, 0, h);
            bgGrad.addColorStop(0, "#341f97");
            bgGrad.addColorStop(1, "#1e0f4a");
        }

        ctx.fillStyle = bgGrad;
        ctx.fillRect(0, 0, w, h);

        // Vẽ các dòng mã nhị phân số rơi kiểu ma trận mờ
        ctx.fillStyle = "rgba(46, 204, 113, 0.25)";
        ctx.font = "14px 'Courier New', monospace";
        this.bgParticles.forEach(p => {
            ctx.fillText(p.char, p.x, p.y);
        });
    }

    _renderHUD(ctx, w, h) {
        if (this.state === "START" || this.state === "GAME_OVER") return;

        // Khung HUD trên cùng
        ctx.fillStyle = "rgba(10, 8, 20, 0.85)";
        ctx.fillRect(0, 0, w, 56);
        ctx.strokeStyle = "#4b466e";
        ctx.lineWidth = 2;
        ctx.strokeRect(0, 0, w, 56);

        // Tên vòng chơi
        let stageName = "";
        if (this.state.startsWith("BOSS")) stageName = "⚔️ TRẬN ĐÁNH BOSS CUỐI: RỒNG HẮC ÁM";
        else if (this.stage === 1) stageName = "🌲 VÒNG 1: KHU RỪNG MẬT MÃ";
        else if (this.stage === 2) stageName = "🌊 VÒNG 2: VÙNG BIỂN DỮ LIỆU";
        else stageName = "☁️ VÒNG 3: TẦNG MÂY THƯỢNG ĐỈNH";

        ctx.fillStyle = "#f1c40f";
        ctx.font = "bold 16px 'Segoe UI', Tahoma, sans-serif";
        ctx.textAlign = "left";
        ctx.fillText(stageName, 24, 34);

        // Số câu đúng trong vòng
        if (this.state === "QUESTION" || this.state === "QUESTION_RESULT") {
            ctx.fillStyle = "#ffffff";
            ctx.fillText(`Câu: ${this.currentQIndex + 1}/3  |  Đúng: ${this.stageCorrectCount}/3`, 380, 34);
        }

        // Bộ đếm Hoa Hồng (Rose Counter)
        window.PixelSprites.drawRose(ctx, w - 240, 14, 28);
        ctx.fillStyle = "#ffffff";
        ctx.font = "bold 18px 'Segoe UI', Tahoma, sans-serif";
        ctx.textAlign = "left";
        ctx.fillText(`Hoa hồng: ${this.roses} 🌹`, w - 200, 36);

        // Nút điều khiển nhắc nhở
        ctx.fillStyle = "#a4b0be";
        ctx.font = "13px 'Segoe UI', Tahoma, sans-serif";
        ctx.textAlign = "right";
        ctx.fillText("Bấm [A, B, C, D] hoặc [ENTER]", w - 20, 36);
    }

    _renderStartScreen(ctx, w, h) {
        // Hộp tiêu đề Retro Arcade
        ctx.fillStyle = "rgba(20, 15, 35, 0.9)";
        ctx.fillRect(w * 0.15, h * 0.1, w * 0.7, h * 0.78);
        ctx.strokeStyle = "#f1c40f";
        ctx.lineWidth = 4;
        ctx.strokeRect(w * 0.15, h * 0.1, w * 0.7, h * 0.78);

        // Tiêu đề game lớn
        ctx.fillStyle = "#f1c40f";
        ctx.font = "bold 36px 'Segoe UI', Tahoma, sans-serif";
        ctx.textAlign = "center";
        ctx.fillText("VỆ BINH MẬT KHẨU", w / 2, h * 0.22);

        ctx.fillStyle = "#00d2d3";
        ctx.font = "bold 18px 'Courier New', monospace";
        ctx.fillText("CYBERSEC PASSWORD GUARDIAN", w / 2, h * 0.28);

        // Vẽ 2 bông hồng pixel trang trí 2 bên
        window.PixelSprites.drawRose(ctx, w * 0.22, h * 0.18, 50);
        window.PixelSprites.drawRose(ctx, w * 0.72, h * 0.18, 50);

        // Luật chơi tóm tắt
        ctx.fillStyle = "#ecf0f1";
        ctx.font = "16px 'Segoe UI', Tahoma, sans-serif";
        ctx.textAlign = "left";
        const startX = w * 0.22;
        let startY = h * 0.36;
        const lines = [
            "🛡️ 3 Vòng thử thách: Rừng Mật Mã 🌲, Biển Dữ Liệu 🌊, Tầng Mây ☁️",
            "🎯 Mỗi vòng 3 câu hỏi ngẫu nhiên với dữ liệu mật khẩu ngẫu nhiên hoàn toàn",
            "🌹 Mỗi câu trả lời đúng được thưởng 1 Bông Hồng (cần đúng 3 câu để pass vòng)",
            "🎲 Sau mỗi vòng: Lắc xúc xắc (Lẻ: đi tiếp | Chẵn: bốc thẻ may rủi / tặng hoa)",
            "🐉 Boss Cuối: Cần tối thiểu >= 9 bông hồng để bắn hạ Rồng ở 4 vị trí A, B, C, D",
            "🏆 Bắn hạ Rồng: Win Game lấy Kho Báu! Thất bại: Bị ném xuống Thung Lũng!"
        ];
        lines.forEach(l => {
            ctx.fillText(l, startX, startY);
            startY += 32;
        });

        // Nút bấm bắt đầu nhấp nháy
        const blink = Math.sin(performance.now() / 250) > 0;
        if (blink) {
            ctx.fillStyle = "#2ecc71";
            ctx.font = "bold 24px 'Segoe UI', Tahoma, sans-serif";
            ctx.textAlign = "center";
            ctx.fillText("👉 NHẤN [ENTER] ĐỂ BẮT ĐẦU HÀNH TRÌNH 👈", w / 2, h * 0.78);
        }
    }

    _renderStageIntro(ctx, w, h) {
        ctx.fillStyle = "rgba(20, 15, 35, 0.9)";
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
            desc = "Nắm vững quy tắc căn bản: Độ dài, cấu trúc và loại bỏ mật khẩu yếu!";
        } else if (this.stage === 2) {
            title = "VÒNG 2: VÙNG BIỂN DỮ LIỆU 🌊";
            desc = "Cảnh giác cạm bẫy lừa đảo Phishing, kích hoạt 2FA và quản lý an toàn!";
        } else {
            title = "VÒNG 3: TẦNG MÂY THƯỢNG ĐỈNH ☁️";
            desc = "Cụm mật khẩu Passphrase, bẻ khóa Brute-force và đối phó rò rỉ dữ liệu!";
        }

        ctx.fillText(title, w / 2, h * 0.36);

        ctx.fillStyle = "#ffffff";
        ctx.font = "18px 'Segoe UI', Tahoma, sans-serif";
        ctx.fillText(desc, w / 2, h * 0.46);

        ctx.fillStyle = "#a4b0be";
        ctx.font = "16px 'Segoe UI', Tahoma, sans-serif";
        ctx.fillText("Hãy trả lời đúng cả 3 câu hỏi để vượt qua vòng này và tích lũy hoa hồng!", w / 2, h * 0.54);

        ctx.fillStyle = "#2ecc71";
        ctx.font = "bold 22px 'Segoe UI', Tahoma, sans-serif";
        ctx.fillText("Nhấn [ENTER] để vào câu hỏi đầu tiên", w / 2, h * 0.68);
    }

    _renderQuestionScreen(ctx, w, h) {
        const q = this.stageQuestions[this.currentQIndex];
        if (!q) return;

        // Khung câu hỏi
        ctx.fillStyle = "rgba(25, 20, 45, 0.95)";
        ctx.fillRect(w * 0.1, h * 0.14, w * 0.8, h * 0.26);
        ctx.strokeStyle = "#3498db";
        ctx.lineWidth = 3;
        ctx.strokeRect(w * 0.1, h * 0.14, w * 0.8, h * 0.26);

        // Nội dung câu hỏi
        ctx.fillStyle = "#ffffff";
        ctx.font = "bold 20px 'Segoe UI', Tahoma, sans-serif";
        ctx.textAlign = "left";
        window.PixelSprites._wrapText(ctx, q.question, w * 0.13, h * 0.22, w * 0.74, 28);

        // 4 Lựa chọn A, B, C, D
        const optColors = ["#eb445a", "#3498db", "#f1c40f", "#2ecc71"];
        const optKeys = ["A", "B", "C", "D"];

        const boxW = w * 0.38;
        const boxH = h * 0.18;
        const positions = [
            { x: w * 0.1, y: h * 0.45 },
            { x: w * 0.52, y: h * 0.45 },
            { x: w * 0.1, y: h * 0.67 },
            { x: w * 0.52, y: h * 0.67 }
        ];

        q.options.forEach((optText, idx) => {
            const pos = positions[idx];
            ctx.fillStyle = "rgba(18, 14, 32, 0.9)";
            ctx.fillRect(pos.x, pos.y, boxW, boxH);

            ctx.strokeStyle = optColors[idx];
            ctx.lineWidth = 3;
            ctx.strokeRect(pos.x, pos.y, boxW, boxH);

            // Nút bấm biểu tượng
            ctx.fillStyle = optColors[idx];
            ctx.fillRect(pos.x + 12, pos.y + 12, 34, 34);
            ctx.fillStyle = "#ffffff";
            ctx.font = "bold 20px 'Segoe UI', Tahoma, sans-serif";
            ctx.textAlign = "center";
            ctx.fillText(optKeys[idx], pos.x + 29, pos.y + 36);

            // Nội dung đáp án
            ctx.fillStyle = "#ecf0f1";
            ctx.font = "16px 'Segoe UI', Tahoma, sans-serif";
            ctx.textAlign = "left";
            window.PixelSprites._wrapText(ctx, optText.substring(3), pos.x + 58, pos.y + 32, boxW - 70, 22);
        });

        // Hướng dẫn bên dưới
        ctx.fillStyle = "#a4b0be";
        ctx.font = "15px 'Segoe UI', Tahoma, sans-serif";
        ctx.textAlign = "center";
        ctx.fillText("Nhấn nút [A], [B], [C] hoặc [D] tương ứng để chọn đáp án", w / 2, h * 0.92);
    }

    _renderQuestionResultScreen(ctx, w, h) {
        ctx.fillStyle = "rgba(18, 14, 32, 0.95)";
        ctx.fillRect(w * 0.15, h * 0.18, w * 0.7, h * 0.64);

        const borderColor = this.isAnswerCorrect ? "#2ecc71" : "#e74c3c";
        ctx.strokeStyle = borderColor;
        ctx.lineWidth = 4;
        ctx.strokeRect(w * 0.15, h * 0.18, w * 0.7, h * 0.64);

        // Tiêu đề kết quả
        ctx.fillStyle = borderColor;
        ctx.font = "bold 28px 'Segoe UI', Tahoma, sans-serif";
        ctx.textAlign = "center";
        ctx.fillText(this.resultTitle, w / 2, h * 0.28);

        if (this.isAnswerCorrect) {
            window.PixelSprites.drawRose(ctx, w / 2 - 20, h * 0.32, 40);
        }

        // Khung giải thích an ninh mạng
        ctx.fillStyle = "rgba(40, 35, 65, 0.8)";
        ctx.fillRect(w * 0.2, h * 0.42, w * 0.6, h * 0.24);
        ctx.strokeStyle = "#7873af";
        ctx.lineWidth = 2;
        ctx.strokeRect(w * 0.2, h * 0.42, w * 0.6, h * 0.24);

        ctx.fillStyle = "#f1c40f";
        ctx.font = "bold 16px 'Segoe UI', Tahoma, sans-serif";
        ctx.textAlign = "left";
        ctx.fillText("💡 BÍ KÍP BẢO MẬT:", w * 0.22, h * 0.47);

        ctx.fillStyle = "#ffffff";
        ctx.font = "16px 'Segoe UI', Tahoma, sans-serif";
        window.PixelSprites._wrapText(ctx, this.resultExplanation, w * 0.22, h * 0.52, w * 0.56, 24);

        // Nhấn Enter tiếp tục
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

        // Vẽ Xúc xắc pixel lớn ở giữa
        window.PixelSprites.drawDice(ctx, w / 2 - 50, h * 0.34, 100, this.diceValue, this.isDiceRolling);

        if (this.state === "DICE") {
            ctx.fillStyle = "#ecf0f1";
            ctx.font = "16px 'Segoe UI', Tahoma, sans-serif";
            ctx.fillText("Quy luật xúc xắc:", w / 2, h * 0.56);
            ctx.fillText("• Số LẺ (1, 3, 5): Tiến vào vòng tiếp theo bình thường", w / 2, h * 0.61);
            ctx.fillText("• Số CHẴN (2, 4, 6): Kích hoạt ô BỐC THẺ BÍ ẨN (tặng 1-3 hoa hồng hoặc thử thách)!", w / 2, h * 0.66);

            ctx.fillStyle = "#2ecc71";
            ctx.font = "bold 22px 'Segoe UI', Tahoma, sans-serif";
            ctx.fillText("👉 Nhấn [ENTER] để Gieo Xúc Xắc 👈", w / 2, h * 0.76);
        } else {
            // DICE_RESULT
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
                ctx.fillText(`KẾT QUẢ: SỐ ${this.diceValue} (SỐ LẺ) -> ĐI TIẾP BÌNH THƯỜNG! 🚀`, w / 2, h * 0.58);
                ctx.fillStyle = "#ffffff";
                ctx.font = "16px 'Segoe UI', Tahoma, sans-serif";
                ctx.fillText("Đường đi an toàn! Chuẩn bị bước vào chặng đường tiếp theo!", w / 2, h * 0.64);
                ctx.fillStyle = "#2ecc71";
                ctx.font = "bold 22px 'Segoe UI', Tahoma, sans-serif";
                ctx.fillText("Nhấn [ENTER] để tiếp tục hành trình", w / 2, h * 0.76);
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

        // Vẽ thẻ bài
        window.PixelSprites.drawCard(ctx, w / 2 - 100, h * 0.28, 200, 270, this.currentCard, this.cardRevealed);

        if (!this.cardRevealed) {
            ctx.fillStyle = "#2ecc71";
            ctx.font = "bold 22px 'Segoe UI', Tahoma, sans-serif";
            ctx.fillText("👉 Nhấn [ENTER] để Lật Thẻ Bí Ẩn 👈", w / 2, h * 0.81);
        } else {
            ctx.fillStyle = "#2ecc71";
            ctx.font = "bold 22px 'Segoe UI', Tahoma, sans-serif";
            ctx.fillText("👉 Nhấn [ENTER] để Tiếp Tục 👈", w / 2, h * 0.81);
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

        // Vẽ Rồng xem trước
        window.PixelSprites.drawDragon(ctx, w / 2 - 70, h * 0.28, 140, 120, false, performance.now() / 200);

        // Kiểm tra số hoa hồng
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
        // Vẽ 4 bệ đá / cổng vị trí A, B, C, D
        const positions = [
            { key: "A", name: "CỔNG A", coords: this._getBossScreenCoords("A"), color: "#eb445a" },
            { key: "B", name: "CỔNG B", coords: this._getBossScreenCoords("B"), color: "#3498db" },
            { key: "C", name: "CỔNG C", coords: this._getBossScreenCoords("C"), color: "#f1c40f" },
            { key: "D", name: "CỔNG D", coords: this._getBossScreenCoords("D"), color: "#2ecc71" }
        ];

        positions.forEach(p => {
            const bx = p.coords.x;
            const by = p.coords.y;

            // Khung bia mục tiêu
            ctx.fillStyle = "rgba(20, 15, 30, 0.7)";
            ctx.fillRect(bx - 80, by - 60, 160, 120);

            const isCurrentBoss = (p.key === this.bossCurrentPos);
            ctx.strokeStyle = isCurrentBoss ? "#ff3838" : p.color;
            ctx.lineWidth = isCurrentBoss ? 5 : 2;
            ctx.strokeRect(bx - 80, by - 60, 160, 120);

            // Tên nút A, B, C, D
            ctx.fillStyle = p.color;
            ctx.fillRect(bx - 70, by - 50, 28, 28);
            ctx.fillStyle = "#ffffff";
            ctx.font = "bold 16px 'Segoe UI', Tahoma, sans-serif";
            ctx.textAlign = "center";
            ctx.fillText(p.key, bx - 56, by - 30);

            // Nếu Boss đang ở vị trí này -> Vẽ Boss Rồng
            if (isCurrentBoss) {
                const isHurt = this.bossHurtTimer > 0;
                window.PixelSprites.drawDragon(ctx, bx - 80, by - 60, 160, 130, isHurt, this.bossFlapAnim);

                // Thanh đếm ngược thời gian phản xạ (Reaction Timer Bar)
                const timeLeftPercent = Math.max(0, 1 - (this.bossTimer / this.bossMaxTime));
                ctx.fillStyle = "rgba(0, 0, 0, 0.7)";
                ctx.fillRect(bx - 60, by + 45, 120, 10);
                ctx.fillStyle = timeLeftPercent > 0.3 ? "#e74c3c" : "#ff0000";
                ctx.fillRect(bx - 60, by + 45, 120 * timeLeftPercent, 10);
            }
        });

        // Thanh Máu Boss (Boss HP Bar) ở trên
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

        // Vẽ Vệ Binh ở đáy màn hình
        const px = w / 2;
        const py = h - 60;
        window.PixelSprites.drawFallingHero(ctx, px, py, 36, 0);

        // Hướng dẫn bắn
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

        // Vẽ Rương Kho Báu Mở Rực Rỡ
        window.PixelSprites.drawTreasureChest(ctx, w / 2 - 75, h * 0.32, 150, true);

        // Pháo hoa / Lấp lánh
        for (let i = 0; i < 6; i++) {
            const rx = w * 0.25 + Math.random() * (w * 0.5);
            const ry = h * 0.25 + Math.random() * (h * 0.4);
            window.PixelSprites.drawRose(ctx, rx, ry, 30);
        }

        ctx.fillStyle = "#ffffff";
        ctx.font = "18px 'Segoe UI', Tahoma, sans-serif";
        ctx.fillText("Bạn đã đoạt được: 'KHO BÁU MẬT MÃ HOÀNG KIM'", w / 2, h * 0.64);
        ctx.fillStyle = "#00d2d3";
        ctx.fillText("Và đạt danh hiệu cao quý: BẬC THẦY VỆ BINH AN NINH MẠNG!", w / 2, h * 0.69);

        ctx.fillStyle = "#f1c40f";
        ctx.font = "bold 22px 'Segoe UI', Tahoma, sans-serif";
        ctx.fillText("👉 Nhấn [ENTER] để Chơi Lại Từ Đầu 👈", w / 2, h * 0.80);
    }

    _renderGameOverScreen(ctx, w, h) {
        // Cảnh vực thẳm đã được vẽ ở _renderBackground
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

// Khởi chạy game khi tài liệu sẵn sàng
window.addEventListener("DOMContentLoaded", () => {
    window.game = new CyberSecGame();
});
