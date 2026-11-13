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

        // Cấu hình game nạp từ JSON / Helper
        this.config = null;
        this.currentStageConfig = null;

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

        // Ảnh Thành tựu chính thức từ thư mục images (Flash, Kratos Cup, Loser)
        this.achievementImgs = {
            the_flash: new Image(),
            kratos: new Image(),
            loser: new Image()
        };
        this.achievementImgs.the_flash.src = "images/flash.png";
        this.achievementImgs.kratos.src = "images/trophy_kratos.jpg";
        this.achievementImgs.loser.src = "images/loser.png";

        // Hệ thống theo dõi Thành Tựu & Thời gian (Achievements System)
        this.gameStartTime = null;
        this.bossStartTime = null;
        this.lastTotalDuration = 0;
        this.lastBossDuration = 0;
        this.stageWrongCount = 0;
        this.stageQuestionsAnswered = 0;
        this.totalWrongCount = 0;

        // Hệ thống thời tiết động (Nắng, Mưa, Tuyết) & Tự động đổi ngẫu nhiên
        this.weather = window.WeatherSystem;
        this.weatherToast = null;

        if (this.weather) {
            this.weather.onWeatherChange = (newType) => {
                const names = {
                    SUNNY: "THỜI TIẾT: TRỜI NẮNG ẤM (Đội nón che nắng)",
                    RAIN: "THỜI TIẾT: MƯA RÀO & SẤM CHỚP (Che dù đi mưa)",
                    SNOW: "THỜI TIẾT: TUYẾT RƠI GIÁ LẠNH (Mặc áo ấm, khăn len)"
                };
                const icons = { SUNNY: "sun", RAIN: "rain", SNOW: "snow" };
                this.weatherToast = {
                    text: names[newType] || `THỜI TIẾT: ${newType}`,
                    icon: icons[newType] || "sun",
                    timer: 3.5
                };
                if (window.updateWeatherButtonIcon) {
                    window.updateWeatherButtonIcon(newType);
                }
                if (window.CursorFX && window.CursorFX.burst) {
                    window.CursorFX.burst(this.canvas.width / 2, 70, 20);
                }
            };
        }

        // Trạng thái Cốt truyện Mở đầu (Story Mode: Tự giới thiệu nhân vật, game, thử thách)
        this.storySlideIndex = 0;
        this.storyCharProgress = 0;
        this.storyTextDone = false;
        this.storySlides = this._initStorySlides();

        // Jumpscare Horror FX khi trả lời sai câu hỏi
        this.jumpscareActive = false;
        this.jumpscareTimer = 0;
        this.screenShake = 0;

        this._initParticles();
        this._initEntities();
        this._bindInputs();
        this._connectWebSocket();
        this._initQrModal();
        this.loadConfig();

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
                    this.highlightDockButton(data.button);
                } else if (data.type === "PORT_STATUS") {
                    const statusEl = document.getElementById("arduinoStatus");
                    if (statusEl) {
                        statusEl.innerText = data.connected ? `Arduino: ${data.port}` : "Arduino: Chưa kết nối (Bàn phím/ĐT)";
                        statusEl.className = data.connected ? "connected" : "disconnected";
                    }
                } else if (data.type === "TUNNEL_INFO") {
                    this.updateQrModal(data.info);
                } else if (data.type === "CONTROLLER_COUNT") {
                    this.updateControllerCount(data.count);
                } else if (data.type === "CONFIG_SYNC" || data.type === "CONFIG_UPDATED") {
                    if (data.config) {
                        this.applyConfig(data.config);
                        if (data.type === "CONFIG_UPDATED") {
                            this._showToast("🔔 Cấu hình & câu hỏi đã cập nhật từ Helper!", "lightbulb");
                        }
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

    async loadConfig() {
        try {
            const res = await fetch("/api/config");
            if (res.ok) {
                const data = await res.json();
                this.applyConfig(data);
                console.log("[Game] Đã nạp thành công cấu hình từ server (/api/config)!");
            }
        } catch (e) {
            console.warn("[Game] Không thể tải /api/config, dùng cấu hình mặc định:", e.message);
        }
    }

    applyConfig(cfg) {
        if (!cfg) return;
        this.config = cfg;

        // Cập nhật thẻ bài ma thuật từ cấu hình
        if (Array.isArray(cfg.magicCards) && cfg.magicCards.length > 0) {
            this.cards = cfg.magicCards;
        }

        // Cập nhật cài đặt Boss & Minigame
        if (cfg.settings) {
            if (typeof cfg.settings.bossHP === "number") {
                this.bossMaxHP = cfg.settings.bossHP;
                if (this.state !== "BOSS_BATTLE") this.bossHP = this.bossMaxHP;
            }
            if (typeof cfg.settings.bossSpeedMs === "number") {
                this.bossMaxTime = cfg.settings.bossSpeedMs / 1000;
            }
        }

        // Cập nhật cấu hình vòng chơi hiện tại nếu có
        if (cfg.sections) {
            this.currentStageConfig = cfg.sections.find(s => s.id === this.stage) || null;
        }
    }

    highlightDockButton(button) {
        const btn = document.querySelector(`.arcade-btn[data-key="${button}"]`);
        if (btn) {
            btn.classList.add('active');
            setTimeout(() => btn.classList.remove('active'), 200);
        }
    }

    _initQrModal() {
        this.tunnelInfo = null;
        this.controllerCount = 0;
        this.activeQrTab = 'tunnel';

        const btnOpen = document.getElementById('btnOpenQrModal');
        const btnClose = document.getElementById('btnCloseQrModal');
        const modal = document.getElementById('qrModal');
        const tabTunnel = document.getElementById('tabTunnel');
        const tabLocal = document.getElementById('tabLocal');
        const btnCopy = document.getElementById('btnCopyQrUrl');

        if (btnOpen && modal) {
            btnOpen.addEventListener('click', () => {
                modal.classList.remove('hidden');
                this.renderQrData();
            });
        }

        if (btnClose && modal) {
            btnClose.addEventListener('click', () => {
                modal.classList.add('hidden');
            });
        }

        if (modal) {
            modal.addEventListener('click', (e) => {
                if (e.target === modal) modal.classList.add('hidden');
            });
        }

        if (tabTunnel) {
            tabTunnel.addEventListener('click', () => {
                this.activeQrTab = 'tunnel';
                if (tabLocal) tabLocal.classList.remove('active');
                tabTunnel.classList.add('active');
                this.renderQrData();
            });
        }

        if (tabLocal) {
            tabLocal.addEventListener('click', () => {
                this.activeQrTab = 'local';
                if (tabTunnel) tabTunnel.classList.remove('active');
                tabLocal.classList.add('active');
                this.renderQrData();
            });
        }

        if (btnCopy) {
            btnCopy.addEventListener('click', () => {
                const urlField = document.getElementById('qrUrlInput');
                if (urlField && urlField.value && urlField.value !== 'Đang kết nối...') {
                    navigator.clipboard.writeText(urlField.value).then(() => {
                        const originalText = btnCopy.innerText;
                        btnCopy.innerText = 'ĐÃ CHÉP! ✓';
                        btnCopy.style.background = '#10b981';
                        setTimeout(() => {
                            btnCopy.innerText = originalText;
                            btnCopy.style.background = '';
                        }, 1200);
                    }).catch(() => {
                        urlField.select();
                        document.execCommand('copy');
                    });
                }
            });
        }

        // Tải thông tin tunnel ban đầu qua HTTP API
        fetch('/api/tunnel')
            .then(res => res.json())
            .then(info => {
                this.updateQrModal(info);
            })
            .catch(() => { });
    }

    updateQrModal(info) {
        if (!info) return;
        this.tunnelInfo = info;
        this.renderQrData();
    }

    renderQrData() {
        const qrImg = document.getElementById('qrCodeImg');
        const spinner = document.getElementById('qrSpinner');
        const urlInput = document.getElementById('qrUrlInput');

        if (!this.tunnelInfo) return;

        let activeUrl = '';
        let activeQr = '';

        if (this.activeQrTab === 'tunnel') {
            activeUrl = this.tunnelInfo.tunnelUrl;
            activeQr = this.tunnelInfo.tunnelQr;
        } else {
            activeUrl = this.tunnelInfo.localUrl;
            activeQr = this.tunnelInfo.localQr;
        }

        if (activeQr) {
            if (qrImg) {
                qrImg.src = activeQr;
                qrImg.style.display = 'block';
            }
            if (spinner) spinner.style.display = 'none';
        } else {
            if (qrImg) qrImg.style.display = 'none';
            if (spinner) {
                spinner.style.display = 'block';
                spinner.innerText = this.activeQrTab === 'tunnel'
                    ? '⏳ Đang tạo Live Tunnel (4G)...'
                    : '⏳ Đang lấy địa chỉ Wi-Fi...';
            }
        }

        if (urlInput) {
            urlInput.value = activeUrl || 'Đang kết nối...';
        }
    }

    updateControllerCount(count) {
        this.controllerCount = count || 0;
        const badge = document.getElementById('mobileCountBadge');
        if (badge) {
            badge.innerText = `📱 ${this.controllerCount} ĐT`;
            if (this.controllerCount > 0) {
                badge.style.background = '#047857';
                badge.style.borderColor = '#34d399';
                badge.style.color = '#ffffff';
            } else {
                badge.style.background = '#2e1065';
                badge.style.borderColor = '#a78bfa';
                badge.style.color = '#f5d0fe';
            }
        }

        const countText = document.getElementById('qrConnectedCountText');
        if (countText) {
            countText.innerText = this.controllerCount > 0
                ? `Đang có ${this.controllerCount} điện thoại kết nối`
                : 'Đang có 0 điện thoại kết nối';
        }
    }

    _bindInputs() {
        // Nút mở Kho Thành Tựu trên thanh Top Bar
        const btnAch = document.getElementById("btnOpenAchievements");
        if (btnAch) {
            btnAch.addEventListener("click", () => {
                if (this.state === "ACHIEVEMENTS") {
                    this.state = "START";
                } else {
                    this.state = "ACHIEVEMENTS";
                }
            });
        }

        window.addEventListener("keydown", (e) => {
            if (this.jumpscareActive) {
                this.skipJumpscare();
                return;
            }
            let key = e.key.toUpperCase();
            if (key === "ENTER" || key === " ") {
                this.handleInput("ENTER");
            } else if (key === "ESCAPE") {
                if (this.state === "STORY") {
                    this.startStage(1);
                } else if (this.state === "ACHIEVEMENTS") {
                    this.state = "START";
                } else {
                    this.handleInput("ESC");
                }
            } else if (["A", "B", "C", "D", "G", "R"].includes(key)) {
                this.handleInput(key);
            } else if (key === "W") {
                this.toggleWeather();
            }
        });

        // Nhấp chuột vào Canvas tương tác chuyển cốt truyện, xem thành tựu hoặc nhận chứng nhận
        this.canvas.addEventListener("click", (e) => {
            if (this.jumpscareActive) {
                this.skipJumpscare();
                return;
            }
            const rect = this.canvas.getBoundingClientRect();
            const scaleX = this.canvas.width / rect.width;
            const scaleY = this.canvas.height / rect.height;
            const cx = (e.clientX - rect.left) * scaleX;
            const cy = (e.clientY - rect.top) * scaleY;

            if (this.state === "STORY") {
                // Kiểm tra vùng nút BỎ QUA [Phím B] ở góc trên hộp thoại
                const boxX = 330;
                const boxY = 65;
                const boxW = 900;
                const skipX = boxX + boxW - 145;
                const skipY = boxY + 11;

                if (cx >= skipX && cx <= skipX + 130 && cy >= skipY && cy <= skipY + 28) {
                    this.startStage(1);
                } else {
                    this.advanceStory();
                }
            } else if (this.state === "START") {
                // Kiểm tra click vào nút Kho Thành tựu ở dưới
                if (cx >= this.canvas.width / 2 - 250 && cx <= this.canvas.width / 2 + 250 && cy >= 615 && cy <= 655) {
                    this.state = "ACHIEVEMENTS";
                } else {
                    this.startStory();
                }
            } else if (this.state === "VICTORY") {
                // Nút Tiến vào Kho Thành Tựu
                if (cy >= 575 && cy <= 625) {
                    this.state = "ACHIEVEMENTS";
                } else if (cy > 625 && cy <= 675) {
                    // Nút Nhận Giấy Chứng Nhận
                    if (window.CertificateGenerator) {
                        window.CertificateGenerator.open({
                            totalRoses: this.roses,
                            totalDuration: this.lastTotalDuration || 140,
                            bossDuration: this.lastBossDuration || 16
                        });
                    }
                }
            } else if (this.state === "ACHIEVEMENTS") {
                // Nút 1: Cấp Giấy Chứng Nhận (x: 290 -> 630, y: 635 -> 695)
                if (cx >= 280 && cx <= 640 && cy >= 635 && cy <= 695) {
                    if (window.CertificateGenerator) {
                        window.CertificateGenerator.open({
                            totalRoses: this.roses,
                            totalDuration: this.lastTotalDuration || 140,
                            bossDuration: this.lastBossDuration || 16
                        });
                    }
                } else if (cx >= 660 && cx <= 890 && cy >= 635 && cy <= 695) {
                    // Nút 2: Về Menu Chính
                    this.state = "START";
                } else if (cx >= 910 && cx <= 1180 && cy >= 635 && cy <= 695) {
                    // Nút 3: Chơi lại săn thành tựu
                    this.stage = 1;
                    this.roses = 0;
                    this.gameStartTime = Date.now();
                    this.startStage(1);
                } else {
                    // Click ngẫu nhiên trên màn hình thành tựu tỏa bụi sao
                    if (window.CursorFX && window.CursorFX.burst) {
                        window.CursorFX.burst(cx, cy, 25);
                    }
                }
            }
        });

        document.querySelectorAll(".arcade-btn").forEach((btn) => {
            btn.addEventListener("click", () => {
                const btnKey = btn.getAttribute("data-key");
                if (btnKey) this.handleInput(btnKey);
            });
        });
    }

    // Đổi thời tiết (Nắng -> Mưa -> Tuyết -> Nắng)
    toggleWeather() {
        if (!this.weather) return 'SUNNY';
        const newW = this.weather.toggleWeather();
        if (window.updateWeatherButtonIcon) {
            window.updateWeatherButtonIcon(newW);
        }
        return newW;
    }

    handleInput(button) {
        if (this.jumpscareActive) {
            this.skipJumpscare();
            return;
        }

        this.activeButtons[button] = true;
        setTimeout(() => { this.activeButtons[button] = false; }, 200);

        window.SoundEngine.play("click");

        switch (this.state) {
            case "START":
                if (button === "ENTER") {
                    this.startStory();
                } else if (button === "A") {
                    this.startStage(1);
                } else if (button === "C") {
                    this.state = "ACHIEVEMENTS";
                }
                break;

            case "STORY":
                if (button === "ENTER") {
                    this.advanceStory();
                } else if (button === "B") {
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
                if (button === "ENTER") {
                    // Chuyển sang Kho Thành Tựu
                    this.state = "ACHIEVEMENTS";
                } else if (button === "G") {
                    // Mở giấy chứng nhận
                    if (window.CertificateGenerator) {
                        window.CertificateGenerator.open({
                            totalRoses: this.roses,
                            totalDuration: this.lastTotalDuration || 140,
                            bossDuration: this.lastBossDuration || 16
                        });
                    }
                } else if (button === "A" || button === "R") {
                    this.stage = 1;
                    this.roses = 0;
                    this.gameStartTime = Date.now();
                    this.startStage(1);
                }
                break;

            case "ACHIEVEMENTS":
                if (button === "ENTER" || button === "G") {
                    // Mở Giấy Chứng Nhận
                    if (window.CertificateGenerator) {
                        window.CertificateGenerator.open({
                            totalRoses: this.roses,
                            totalDuration: this.lastTotalDuration || 140,
                            bossDuration: this.lastBossDuration || 16
                        });
                    }
                } else if (button === "B" || button === "ESC") {
                    this.state = "START";
                } else if (button === "A") {
                    this.stage = 1;
                    this.roses = 0;
                    this.gameStartTime = Date.now();
                    this.startStage(1);
                }
                break;

            case "GAME_OVER":
                if (button === "ENTER" || button === "A") {
                    this.stage = 1;
                    this.roses = 0;
                    this.gameStartTime = Date.now();
                    this.startStage(1);
                } else if (button === "B" || button === "ESC") {
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

    _initStorySlides() {
        return [
            {
                chapter: "HỒI 1: VỆ BINH MẬT KHẨU XUẤT HIỆN",
                icon: "shield",
                speaker: "VỆ BINH AN NINH MẠNG",
                paragraphs: [
                    "Xin chào dũng sĩ! Ta là VỆ BINH MẬT KHẨU (CyberSec Guardian) - hiệp sĩ số bảo vệ Vương Quốc Dữ Liệu Hoàng Kim.",
                    "Được tôi luyện từ các thuật toán mã hóa hiện đại nhất, ta mang trên mình giáp hộ mệnh và đóa Hoa Hồng Năng Lượng có thể thanh tẩy mọi lỗ hổng bảo mật.",
                    "Hôm nay, ta rất vinh hạnh được đồng hành cùng bạn trong một sứ mệnh an ninh mạng vô cùng hệ trọng và vinh quang!"
                ]
            },
            {
                chapter: "HỒI 2: HIỂM HỌA TỪ RỒNG HẮC ÁM",
                icon: "dragon",
                speaker: "VỆ BINH AN NINH MẠNG",
                paragraphs: [
                    "Một thảm họa khủng khiếp vừa giáng xuống! Từ vực thẳm sâu nhất của không gian mạng, RỒNG HẮC ÁM (Cyber Dragon) đã thức giấc!",
                    "Nó chỉ huy các đàn mã độc nguy hiểm, liên tục tấn công dò quét và bẻ khóa các tài khoản có mật khẩu yếu nhằm chiếm đoạt KHO BÁU DỮ LIỆU HOÀNG KIM!",
                    "Nếu Kho Báu bị chiếm đoạt, toàn bộ hệ thống thông tin của chúng ta sẽ sụp đổ. Chúng ta phải chặn đứng dã tâm của nó trước khi quá muộn!"
                ]
            },
            {
                chapter: "HỒI 3: THỬ THÁCH QUA 3 THẾ GIỚI",
                icon: "tree",
                speaker: "VỆ BINH AN NINH MẠNG",
                paragraphs: [
                    "Để tiến đến sào huyệt của Rồng, chúng ta phải vượt qua 3 Vùng Đất Thử Thách cam go:",
                    "• KHU RỪNG MẬT MÃ: Cây cối rợp bóng & chim hót! Rèn luyện độ dài mật khẩu (12-16 ký tự), kết hợp hoa - thường - số & ký tự đặc biệt.",
                    "• VÙNG BIỂN DỮ LIỆU: Bơi lội cùng đàn cá & rong rêu! Cảnh giác bẫy câu trộm Phishing và kích hoạt xác thực đa yếu tố (2FA).",
                    "• TẦNG MÂY THƯỢNG ĐỈNH: Bay cùng những hòn đảo bồng bềnh! Thiết lập cụm mật khẩu (Passphrase) ngẫu nhiên để khắc chế tấn công Brute-force."
                ]
            },
            {
                chapter: "HỒI 4: BÍ THUẬT HOA HỒNG & XÚC XẮC",
                icon: "rose",
                speaker: "VỆ BINH AN NINH MẠNG",
                paragraphs: [
                    "Hãy ghi lòng tạc dạ những quy luật sinh tử của cuộc phiêu lưu:",
                    "• MỖI CÂU TRẢ LỜI ĐÚNG = 1 BÔNG HỒNG BẢO MẬT. Bạn cần trả lời đúng cả 3/3 câu mới pass mỗi vòng!",
                    "• SAU MỖI VÒNG: Gieo Xúc Xắc định mệnh. Số LẺ (1, 3, 5) đi tiếp, số CHẴN (2, 4, 6) mở khóa BỐC THẺ BÍ ẨN tặng thêm 1-3 hoa hồng!",
                    "• QUYẾT CHIẾN BOSS: Rồng Boss có 9 HP máu. Bạn BẮT BUỘC phải tích lũy >= 9 đóa hồng để tiêu diệt Rồng! Thiếu hoa hồng sẽ bị ném thẳng xuống vực thẳm!"
                ]
            },
            {
                chapter: "HỒI 5: BẢNG ĐIỀU KHIỂN & XUẤT KÍCH!",
                icon: "gamepad",
                speaker: "VỆ BINH AN NINH MẠNG",
                paragraphs: [
                    "Hệ thống điều khiển 5 nút bấm vật lý Arduino (hoặc Bàn phím máy tính) đã kết nối:",
                    "• 4 NÚT A, B, C, D: Dùng để chọn đáp án câu hỏi & ngắm bắn hoa hồng vào Boss Rồng theo 4 cổng tương ứng.",
                    "• NÚT ENTER (hoặc Space): Mở cửa, xác nhận hành động, gieo xúc xắc và lật thẻ bí ẩn.",
                    "• PHÍM W: Đổi thời tiết (Nắng, Mưa, Tuyết)  |  PHÍM F: Bật / Tắt Toàn Màn Hình.",
                    "Vũ khí đã sẵn sàng! Hiệp sĩ, hãy cùng ta XUẤT TRẬN BẢO VỆ VƯƠNG QUỐC!"
                ]
            }
        ];
    }

    startStory() {
        this.state = "STORY";
        this.storySlideIndex = 0;
        this.storyCharProgress = 0;
        this.storyTextDone = false;
        window.SoundEngine.play("click");
    }

    advanceStory() {
        const slide = this.storySlides[this.storySlideIndex];
        if (!slide) return;
        const allText = slide.paragraphs.join("\n\n");

        // Nếu chữ đang chạy mà ấn ENTER -> Hiện toàn bộ chữ ngay lập tức
        if (!this.storyTextDone && this.storyCharProgress < allText.length) {
            this.storyCharProgress = allText.length;
            this.storyTextDone = true;
            window.SoundEngine.play("click");
            return;
        }

        // Chuyển sang slide tiếp theo
        if (this.storySlideIndex < this.storySlides.length - 1) {
            this.storySlideIndex++;
            this.storyCharProgress = 0;
            this.storyTextDone = false;
            window.SoundEngine.play("click");
        } else {
            // Hết cốt truyện -> Bước vào Vòng 1
            this.startStage(1);
        }
    }

    startStage(stageNum) {
        this.stage = stageNum;
        this.currentQIndex = 0;
        this.stageCorrectCount = 0;
        this.stageWrongCount = 0;
        this.stageQuestionsAnswered = 0;

        if (stageNum === 1) {
            this.gameStartTime = Date.now();
        }

        if (this.config && Array.isArray(this.config.sections)) {
            this.currentStageConfig = this.config.sections.find(s => s.id === stageNum) || null;
        } else {
            this.currentStageConfig = null;
        }

        this.stageQuestions = window.QuestionGenerator.generateStageQuestions(stageNum, this.config);

        // Đổi thời tiết tự nhiên theo vòng chơi
        if (this.weather) {
            let targetWeather = 'SUNNY';
            if (this.currentStageConfig && this.currentStageConfig.themeWeather) {
                targetWeather = this.currentStageConfig.themeWeather;
            } else {
                if (stageNum === 1) targetWeather = 'SUNNY';
                else if (stageNum === 2) targetWeather = 'RAIN';
                else if (stageNum === 3) targetWeather = 'SNOW';
            }
            this.weather.setWeather(targetWeather);

            if (window.updateWeatherButtonIcon) {
                window.updateWeatherButtonIcon(this.weather.currentType);
            }
        }

        this.state = "STAGE_INTRO";
    }

    checkAnswer(selectedOption) {
        const q = this.stageQuestions[this.currentQIndex];
        const optionMap = { A: 0, B: 1, C: 2, D: 3 };
        const selectedIdx = optionMap[selectedOption];

        this.stageQuestionsAnswered = (this.stageQuestionsAnswered || 0) + 1;

        if (selectedIdx === q.correct) {
            this.isAnswerCorrect = true;
            this.stageCorrectCount++;
            const reward = (typeof q.rosesReward === 'number') ? q.rosesReward : 1;
            this.roses += reward;
            this.resultTitle = reward > 1 ? `CHÍNH XÁC! (+${reward} BÔNG HỒNG)` : (reward === 1 ? "CHÍNH XÁC! (+1 BÔNG HỒNG)" : "CHÍNH XÁC!");
            window.SoundEngine.play("correct");
            if (window.CursorFX && window.CursorFX.burst) {
                window.CursorFX.burst(this.canvas.width / 2, this.canvas.height / 2, 24);
            }
            this.resultExplanation = q.explanation;
            this.state = "QUESTION_RESULT";
        } else {
            this.isAnswerCorrect = false;
            this.stageWrongCount = (this.stageWrongCount || 0) + 1;
            this.totalWrongCount = (this.totalWrongCount || 0) + 1;
            this.resultTitle = "CHƯA CHÍNH XÁC! (0 BÔNG HỒNG)";
            this.resultExplanation = q.explanation;
            this.triggerJumpscare();
        }
    }

    // Kích hoạt hiệu ứng Jumpscare kinh dị khi trả lời sai
    triggerJumpscare() {
        this.jumpscareActive = true;
        this.jumpscareTimer = 1.67; // Thời lượng jumpscare kinh hoàng (khoảng 1.35 giây)
        this.screenShake = 35;      // Rung lắc màn hình dữ dội
        window.SoundEngine.play("jumpscare");
        if (window.CursorFX && window.CursorFX.burst) {
            window.CursorFX.burst(this.canvas.width / 2, this.canvas.height / 2, 40);
        }
    }

    // Bỏ qua hoặc hoàn tất jumpscare chuyển sang màn giải thích
    skipJumpscare() {
        this.jumpscareActive = false;
        this.jumpscareTimer = 0;
        this.screenShake = 0;
        this.state = "QUESTION_RESULT";
    }

    nextQuestion() {
        this.currentQIndex++;
        const totalQ = this.stageQuestions.length || 3;
        const passThreshold = (this.currentStageConfig && typeof this.currentStageConfig.passThreshold === 'number')
            ? this.currentStageConfig.passThreshold
            : totalQ;

        if (this.currentQIndex < totalQ) {
            this.state = "QUESTION";
        } else {
            // Kiểm tra thành tựu "Loser": Sai hết cả 3 câu trong 1 ải
            if (this.stageQuestionsAnswered >= 3 && this.stageWrongCount >= 3 && this.stageCorrectCount === 0 && window.AchievementManager) {
                window.AchievementManager.unlock("loser", `Ải ${this.stage}`, { stage: this.stage });
            }

            if (this.stageCorrectCount >= passThreshold) {
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
        const maxStages = (this.config && Array.isArray(this.config.sections) && this.config.sections.length > 0)
            ? this.config.sections.length
            : 3;

        if (this.stage < maxStages) {
            this.startTravel(this.stage, this.stage + 1);
        } else {
            // Sau Vòng cuối -> Phiêu lưu tiến vào Hang Boss Rồng!
            this.startTravel(this.stage, maxStages + 1);
        }
    }

    startTravel(fromStage, toStage) {
        this.travelFrom = fromStage;
        this.travelTo = toStage;
        this.travelProgress = 0;
        this.state = "TRAVELING";
    }

    _finishTravel() {
        const maxStages = (this.config && Array.isArray(this.config.sections) && this.config.sections.length > 0)
            ? this.config.sections.length
            : 3;

        if (this.travelTo <= maxStages) {
            this.startStage(this.travelTo);
        } else {
            this.state = "BOSS_INTRO";
        }
    }

    startBossFight() {
        this.state = "BOSS_BATTLE";
        this.bossHP = this.bossMaxHP || 9;
        this.bossHitsLanded = 0;
        this.bossTimer = 0;
        this.bossStartTime = Date.now();
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
                const now = Date.now();
                // 1. Kiểm tra thành tựu "Kratos": Đánh boss rồng < 20 giây
                const bossDuration = Math.max(0.1, (now - (this.bossStartTime || now)) / 1000);
                this.lastBossDuration = bossDuration;
                if (bossDuration < 20 && window.AchievementManager) {
                    window.AchievementManager.unlock("kratos", `${bossDuration.toFixed(1)}s`, { bossDuration });
                }

                // 2. Kiểm tra thành tựu "The Flash": Hoàn thành trò chơi < 3 phút (< 180s)
                const totalDuration = Math.max(0.1, (now - (this.gameStartTime || now)) / 1000);
                this.lastTotalDuration = totalDuration;
                if (totalDuration < 180 && window.AchievementManager) {
                    const m = Math.floor(totalDuration / 60);
                    const s = Math.floor(totalDuration % 60).toString().padStart(2, "0");
                    window.AchievementManager.unlock("the_flash", `${m}:${s}`, { totalDuration });
                }

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

        // Cập nhật rung lắc màn hình (Screen Shake)
        if (this.screenShake > 0) {
            this.screenShake = Math.max(0, this.screenShake - dt * 28);
        }

        // Cập nhật hiệu ứng Jumpscare đếm ngược
        if (this.jumpscareActive) {
            this.jumpscareTimer -= dt;
            if (this.jumpscareTimer <= 0) {
                this.skipJumpscare();
            }
        }

        // Cập nhật gõ chữ cốt truyện (Typewriter cho Story Mode)
        if (this.state === "STORY" && this.storySlides) {
            const slide = this.storySlides[this.storySlideIndex];
            if (slide) {
                const totalLen = slide.paragraphs.join("\n\n").length;
                if (this.storyCharProgress < totalLen) {
                    const prev = Math.floor(this.storyCharProgress);
                    this.storyCharProgress += dt * 65;
                    const curr = Math.floor(this.storyCharProgress);
                    if (curr > prev && curr % 5 === 0) {
                        window.SoundEngine.play("blip");
                    }
                    if (this.storyCharProgress >= totalLen) {
                        this.storyCharProgress = totalLen;
                        this.storyTextDone = true;
                    }
                }
            }
        }

        // Cập nhật đếm ngược thông báo thời tiết (Weather Toast)
        if (this.weatherToast) {
            this.weatherToast.timer -= dt;
            if (this.weatherToast.timer <= 0) {
                this.weatherToast = null;
            }
        }

        // Cập nhật hạt thời tiết (Mưa, Tuyết, Nắng, Sấm sét)
        if (this.weather) {
            this.weather.update(dt, w, h);
        }

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

        // Cập nhật thông báo Thành Tựu & Hiệu ứng Rồng bay Phượng múa
        if (window.AchievementManager) {
            window.AchievementManager.updateToasts(dt);
        }
        if (this.state === "ACHIEVEMENTS" && window.LongPhuongFX) {
            window.LongPhuongFX.update(dt, w, h);
        }
    }

    render() {
        const ctx = this.ctx;
        const w = this.canvas.width;
        const h = this.canvas.height;
        const time = performance.now() / 1000;

        ctx.clearRect(0, 0, w, h);

        ctx.save();

        // Hiệu ứng rung lắc màn hình dữ dội (Screen Shake)
        if (this.screenShake > 0) {
            const shakeX = (Math.random() - 0.5) * this.screenShake;
            const shakeY = (Math.random() - 0.5) * this.screenShake;
            ctx.translate(shakeX, shakeY);
        }

        // 1. Vẽ phông nền thế giới tự nhiên sống động (trừ khi ở màn Kho Thành Tựu có nền riêng)
        if (this.state !== "ACHIEVEMENTS") {
            this._renderWorldBackground(ctx, w, h, time);
        }

        // 2. Vẽ Vệ Binh phiêu lưu ở góc dưới nếu trong màn câu hỏi / intro
        if (["STAGE_INTRO", "QUESTION", "QUESTION_RESULT"].includes(this.state)) {
            this._renderStationedHero(ctx, w, h, time);
        }

        // 3. Vẽ HUD phía trên (Số hoa hồng, Tên vòng chơi - trừ Kho Thành Tựu)
        if (this.state !== "ACHIEVEMENTS") {
            this._renderHUD(ctx, w, h);
        }

        // 4. Vẽ nội dung giao diện theo từng trạng thái cụ thể
        switch (this.state) {
            case "START":
                this._renderStartScreen(ctx, w, h);
                break;
            case "STORY":
                this._renderStoryScreen(ctx, w, h, time);
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
            case "ACHIEVEMENTS":
                this._renderAchievementsScreen(ctx, w, h);
                break;
        }

        // 5. Vẽ bông hồng đang bay
        if (this.state !== "ACHIEVEMENTS") {
            this._renderProjectiles(ctx);
        }

        // 6. Watermark chìm tinh tế ở góc dưới màn hình
        if (this.state !== "ACHIEVEMENTS") {
            this._renderWatermark(ctx, w, h);
        }

        // 7. Thông báo thời tiết Pixel nổi bật (Weather Toast)
        if (this.state !== "ACHIEVEMENTS") {
            this._renderWeatherToast(ctx, w, h);
        }

        // 8. Nếu đang kích hoạt Jumpscare, vẽ hiệu ứng quỷ dữ ghê rợn đè lên toàn màn hình
        if (this.jumpscareActive) {
            this._renderJumpscare(ctx, w, h, time);
        }

        // 9. Vẽ thông báo mở khóa thành tựu Toast trên đỉnh màn hình
        if (window.AchievementManager) {
            window.AchievementManager.renderToast(ctx, w, h);
        }

        ctx.restore();
    }

    _renderWeatherToast(ctx, w, h) {
        if (!this.weatherToast || this.weatherToast.timer <= 0) return;
        const toast = this.weatherToast;
        const alpha = Math.min(1.0, toast.timer / 0.5);

        ctx.save();
        ctx.globalAlpha = alpha;

        const boxW = 460;
        const boxH = 46;
        const boxX = (w - boxW) / 2;
        const boxY = 64;

        ctx.fillStyle = "rgba(16, 12, 30, 0.94)";
        ctx.fillRect(boxX, boxY, boxW, boxH);
        ctx.strokeStyle = "#f1c40f";
        ctx.lineWidth = 2;
        ctx.strokeRect(boxX, boxY, boxW, boxH);

        window.PixelSprites.drawPixelIcon(ctx, toast.icon, boxX + 14, boxY + 11, 24);

        ctx.fillStyle = "#ffffff";
        ctx.font = "bold 16px 'Segoe UI', Tahoma, sans-serif";
        ctx.textAlign = "left";
        ctx.fillText(toast.text, boxX + 48, boxY + 29);

        ctx.restore();
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

        // Vẽ hệ sinh thái theo từng vòng chơi kết hợp trạng thái thời tiết
        const wType = this.weather ? this.weather.currentType : 'SUNNY';
        if (this.stage === 1 || this.state === "STORY" || this.state === "START") {
            // Vòng 1 / Cốt truyện Story / Start: Rừng Mật Mã (Cây cối, Chim bay, Hoa cỏ, Nấm, Đom đóm + Thời tiết)
            window.PixelSprites.drawForestWorld(ctx, w, h, time, this.forestBirds, wType);
        } else if (this.stage === 2) {
            // Vòng 2: Vùng Biển Dữ Liệu (Cá vẫy đuôi bơi, Rong rêu uốn lượn, San hô, Bọt khí + Thời tiết)
            window.PixelSprites.drawWaterWorld(ctx, w, h, time, this.waterFishes, this.waterBubbles, wType);
        } else {
            // Vòng 3: Tầng Mây Thượng Đỉnh (Mây cuộn trôi parallax, Chim lượn, Đảo bay + Thời tiết)
            window.PixelSprites.drawCloudWorld(ctx, w, h, time, this.skyBirds, wType);
        }

        // Vẽ lớp phủ hạt thời tiết (Mưa rơi, Tuyết rơi, Nắng vàng, Sấm sét)
        if (this.weather) {
            this.weather.renderOverlay(ctx, w, h, time);
        }
    }

    // Hiển thị Vệ Binh phiêu lưu đồng hành ở góc dưới màn hình
    _renderStationedHero(ctx, w, h, time) {
        let heroX = 45;
        let heroY = h - 135;
        const wType = this.weather ? this.weather.currentType : 'SUNNY';
        // Nhân vật thở nhẹ nhàng nhấp nhô và phản ứng với thời tiết (khói thở khi tuyết, áo choàng khi mưa)
        window.PixelSprites.drawAdventurer(ctx, heroX, heroY, 56, time, 1, false, this.roses, wType);

        // Bong bóng hội thoại nhỏ của Vệ Binh
        ctx.fillStyle = "rgba(20, 15, 30, 0.85)";
        ctx.fillRect(heroX + 55, heroY - 18, 160, 32);
        ctx.strokeStyle = "#00d2d3";
        ctx.lineWidth = 1.5;
        ctx.strokeRect(heroX + 55, heroY - 18, 160, 32);

        window.PixelSprites.drawPixelIcon(ctx, 'rose', heroX + 62, heroY - 11, 18);
        ctx.fillStyle = "#00d2d3";
        ctx.font = "bold 13px 'Segoe UI', Tahoma, sans-serif";
        ctx.textAlign = "left";
        ctx.fillText(`Giữ chắc ${this.roses} hoa!`, heroX + 86, heroY + 4);
    }

    _renderTravelScreen(ctx, w, h, time) {
        // Nút bấm gợi ý bỏ qua
        ctx.fillStyle = "#2ecc71";
        ctx.font = "bold 20px 'Segoe UI', Tahoma, sans-serif";
        ctx.textAlign = "center";
        ctx.fillText("Nhấn [ENTER] để bỏ qua hoạt cảnh", w / 2, h - 30);
    }

    _renderHUD(ctx, w, h) {
        if (this.state === "START" || this.state === "STORY" || this.state === "GAME_OVER" || this.state === "TRAVELING") return;

        ctx.fillStyle = "rgba(10, 8, 20, 0.88)";
        ctx.fillRect(0, 0, w, 60);
        ctx.strokeStyle = "#4b466e";
        ctx.lineWidth = 2;
        ctx.strokeRect(0, 0, w, 60);

        let stageName = "";
        let stageIcon = "tree";
        if (this.state.startsWith("BOSS")) {
            stageName = "BOSS CUỐI: RỒNG HẮC ÁM";
            stageIcon = "dragon";
        } else if (this.currentStageConfig) {
            stageName = this.currentStageConfig.name;
            stageIcon = this.currentStageConfig.icon || "shield";
        } else if (this.stage === 1) {
            stageName = "VÒNG 1: KHU RỪNG MẬT MÃ";
            stageIcon = "tree";
        } else if (this.stage === 2) {
            stageName = "VÒNG 2: VÙNG BIỂN DỮ LIỆU";
            stageIcon = "wave";
        } else {
            stageName = "VÒNG 3: TẦNG MÂY THƯỢNG ĐỈNH";
            stageIcon = "cloud";
        }

        window.PixelSprites.drawPixelIcon(ctx, stageIcon, 18, 18, 26);
        ctx.fillStyle = "#f1c40f";
        ctx.font = "bold 19px 'Segoe UI', Tahoma, sans-serif";
        ctx.textAlign = "left";
        ctx.fillText(stageName, 52, 38);

        if (this.state === "QUESTION" || this.state === "QUESTION_RESULT") {
            const totalQ = this.stageQuestions.length || 3;
            const passThresh = (this.currentStageConfig && typeof this.currentStageConfig.passThreshold === 'number')
                ? this.currentStageConfig.passThreshold
                : totalQ;

            ctx.fillStyle = "#ffffff";
            ctx.font = "bold 19px 'Segoe UI', Tahoma, sans-serif";
            ctx.fillText(`Câu: ${this.currentQIndex + 1}/${totalQ}  |  Đúng: ${this.stageCorrectCount}/${passThresh}`, 440, 38);

            // Chỉ báo thời tiết hiện tại bằng Pixel Icon
            const wType = this.weather ? this.weather.currentType : 'SUNNY';
            const iconMap = { SUNNY: 'sun', RAIN: 'rain', SNOW: 'snow' };
            const labelMap = { SUNNY: 'NẮNG', RAIN: 'MƯA', SNOW: 'TUYẾT' };
            window.PixelSprites.drawPixelIcon(ctx, iconMap[wType] || 'sun', 645, 20, 22);
            ctx.fillStyle = "#dfe4ea";
            ctx.font = "bold 15px 'Segoe UI', Tahoma, sans-serif";
            ctx.fillText(`[${labelMap[wType]} - Phím W]`, 675, 38);
        }

        window.PixelSprites.drawPixelIcon(ctx, 'rose', w - 245, 17, 26);
        ctx.fillStyle = "#ffffff";
        ctx.font = "bold 20px 'Segoe UI', Tahoma, sans-serif";
        ctx.textAlign = "left";
        ctx.fillText(`Hoa hồng: ${this.roses}`, w - 212, 39);

        ctx.fillStyle = "#cbd5e1";
        ctx.font = "bold 14px 'Segoe UI', Tahoma, sans-serif";
        ctx.textAlign = "right";
        ctx.fillText("Bấm [A, B, C, D] hoặc [ENTER]", w - 18, 38);
    }

    // Watermark chìm, tinh tế ở góc màn hình
    _renderWatermark(ctx, w, h) {
        ctx.save();
        ctx.globalAlpha = 0.45; // Làm mờ chìm tinh tế

        const wmY = h - 22;
        const iconSize = 20;

        // Vẽ logo NBK mờ
        if (this.logoNBK && this.logoNBK.complete) {
            ctx.drawImage(this.logoNBK, w - 305, wmY - 15, iconSize, iconSize);
        }

        // Vẽ logo SoftLab mờ
        if (this.logoSoftLab && this.logoSoftLab.complete) {
            ctx.drawImage(this.logoSoftLab, w - 275, wmY - 15, iconSize, iconSize);
        }

        // Chữ watermark nhẹ nhàng
        ctx.fillStyle = "#ffffff";
        ctx.font = "bold 13px 'Segoe UI', Tahoma, sans-serif";
        ctx.textAlign = "left";
        ctx.fillText("THCS Nguyễn Bỉnh Khiêm × SoftLab", w - 248, wmY);

        ctx.restore();
    }

    // ========================================================
    // CỐT TRUYỆN MỞ ĐẦU: VỆ BINH TỰ GIỚI THIỆU & THỬ THÁCH (STORY SCENE)
    // ========================================================
    _renderStoryScreen(ctx, w, h, time) {
        const slide = this.storySlides[this.storySlideIndex];
        if (!slide) return;

        const curW = this.weather ? this.weather.currentType : 'SUNNY';

        // 1. CỘT TRÁI: VỆ BINH ĐỨNG TRÊN BỆ ĐÁ HÙNG DŨNG TỰ GIỚI THIỆU
        const daisX = 180;
        const daisY = h * 0.72;

        // Bệ đá cổ phong cách pixel (Dais)
        ctx.fillStyle = "#2c3e50";
        ctx.fillRect(daisX - 90, daisY + 20, 180, 28);
        ctx.fillStyle = "#1e272e";
        ctx.fillRect(daisX - 95, daisY + 44, 190, 8); // Chân đế
        ctx.fillStyle = "#34495e";
        ctx.fillRect(daisX - 80, daisY, 160, 22);

        // Mảng rêu phong xanh trên đá
        ctx.fillStyle = "#27ae60";
        ctx.fillRect(daisX - 75, daisY - 2, 28, 4);
        ctx.fillRect(daisX + 35, daisY - 2, 35, 4);

        // Vạch cổ ngữ Cyber phát quang
        ctx.fillStyle = "#00d2d3";
        ctx.fillRect(daisX - 60, daisY + 10, 120, 3);
        ctx.fillStyle = "#ffffff";
        ctx.fillRect(daisX - 2, daisY + 9, 5, 5);

        // Nhân vật Vệ Binh khổ lớn đứng hiên ngang (kèm trang bị thời tiết nón/dù/áo ấm)
        window.PixelSprites.drawAdventurer(ctx, daisX - 60, daisY - 125, 120, time * 2, 1, false, 1, curW);

        // Bảng tên nhân vật phát quang trên đầu
        const nameX = daisX - 90;
        const nameY = daisY - 170;
        ctx.fillStyle = "rgba(16, 12, 32, 0.95)";
        ctx.fillRect(nameX, nameY, 180, 32);
        ctx.strokeStyle = "#00d2d3";
        ctx.lineWidth = 2;
        ctx.strokeRect(nameX, nameY, 180, 32);

        window.PixelSprites.drawPixelIcon(ctx, "shield", nameX + 8, nameY + 6, 20);
        ctx.fillStyle = "#00d2d3";
        ctx.font = "bold 14px 'Segoe UI', Tahoma, sans-serif";
        ctx.textAlign = "left";
        ctx.fillText("VỆ BINH AN NINH MẠNG", nameX + 34, nameY + 22);

        // Trạng thái phụ kiện thời tiết dưới chân
        const weatherGearText = {
            SUNNY: "Nón thám hiểm & Kính mát",
            RAIN: "Dù che mưa & Áo choàng",
            SNOW: "Mũ len, Khăn đỏ & Áo ấm"
        };
        ctx.fillStyle = "#cbd5e1";
        ctx.font = "bold 13px 'Segoe UI', Tahoma, sans-serif";
        ctx.textAlign = "center";
        ctx.fillText(`Trang bị: ${weatherGearText[curW] || "Áo giáp bảo mật"}`, daisX, daisY + 68);

        // 2. CỘT PHẢI: KHUNG ĐỐI THOẠI & CỐT TRUYỆN RPG (STORY SCROLL)
        const boxX = 330;
        const boxY = 65;
        const boxW = 900;
        const boxH = 595;

        // Nền khung thoại tối mờ sang trọng
        ctx.fillStyle = "rgba(14, 10, 28, 0.97)";
        ctx.fillRect(boxX, boxY, boxW, boxH);

        // Khung viền vàng Pixel Hoàng gia
        ctx.strokeStyle = "#f1c40f";
        ctx.lineWidth = 4;
        ctx.strokeRect(boxX, boxY, boxW, boxH);

        // Viền chỉ Cyan bên trong
        ctx.strokeStyle = "rgba(0, 210, 211, 0.4)";
        ctx.lineWidth = 1;
        ctx.strokeRect(boxX + 5, boxY + 5, boxW - 10, boxH - 10);

        // 4 Khối góc đinh vàng trang trí
        ctx.fillStyle = "#f39c12";
        ctx.fillRect(boxX - 5, boxY - 5, 12, 12);
        ctx.fillRect(boxX + boxW - 7, boxY - 5, 12, 12);
        ctx.fillRect(boxX - 5, boxY + boxH - 7, 12, 12);
        ctx.fillRect(boxX + boxW - 7, boxY + boxH - 7, 12, 12);

        // Header: Tên Hồi truyện (Chapter Ribbon)
        ctx.fillStyle = "rgba(42, 28, 72, 0.95)";
        ctx.fillRect(boxX + 4, boxY + 4, boxW - 8, 48);
        ctx.strokeStyle = "#574b90";
        ctx.lineWidth = 2;
        ctx.strokeRect(boxX + 4, boxY + 4, boxW - 8, 48);

        // Icon hồi truyện
        window.PixelSprites.drawPixelIcon(ctx, slide.icon, boxX + 18, boxY + 11, 28);

        // Tiêu đề hồi truyện
        ctx.fillStyle = "#f1c40f";
        ctx.font = "bold 21px 'Segoe UI', Tahoma, sans-serif";
        ctx.textAlign = "left";
        ctx.fillText(slide.chapter, boxX + 56, boxY + 33);

        // Nút bấm BỎ QUA ở góc trên
        const skipX = boxX + boxW - 150;
        const skipY = boxY + 10;
        ctx.fillStyle = "rgba(231, 76, 60, 0.25)";
        ctx.fillRect(skipX, skipY, 136, 30);
        ctx.strokeStyle = "#e74c3c";
        ctx.lineWidth = 1.5;
        ctx.strokeRect(skipX, skipY, 136, 30);

        ctx.fillStyle = "#ffffff";
        ctx.font = "bold 13px 'Segoe UI', Tahoma, sans-serif";
        ctx.textAlign = "center";
        ctx.fillText("BỎ QUA [Phím B]", skipX + 68, skipY + 20);

        // Speaker Tag: Tên người nói
        const spkX = boxX + 26;
        const spkY = boxY + 62;
        ctx.fillStyle = "rgba(0, 210, 211, 0.15)";
        ctx.fillRect(spkX, spkY, 260, 28);
        ctx.strokeStyle = "#00d2d3";
        ctx.lineWidth = 1.2;
        ctx.strokeRect(spkX, spkY, 260, 28);

        window.PixelSprites.drawPixelIcon(ctx, "star", spkX + 8, spkY + 5, 18);
        ctx.fillStyle = "#00d2d3";
        ctx.font = "bold 14px 'Segoe UI', Tahoma, sans-serif";
        ctx.textAlign = "left";
        ctx.fillText(slide.speaker, spkX + 32, spkY + 20);

        // Nội dung lời thoại với hiệu ứng Typewriter
        const allText = slide.paragraphs.join("\n\n");
        const revealedChars = Math.min(allText.length, Math.floor(this.storyCharProgress));
        const revealedText = allText.substring(0, revealedChars);

        const paras = revealedText.split("\n\n");
        let curY = boxY + 120;
        const maxW = boxW - 55;
        const lineH = 32;

        paras.forEach((para) => {
            if (!para) return;
            const isBullet = para.startsWith("•") || /^\d+\./.test(para);
            ctx.fillStyle = isBullet ? "#f1c40f" : "#ffffff";
            ctx.font = isBullet ? "bold 19px 'Segoe UI', Tahoma, sans-serif" : "bold 18px 'Segoe UI', Tahoma, sans-serif";

            const lines = this._getTextLines(ctx, para, maxW);
            lines.forEach((l) => {
                ctx.fillText(l, boxX + 28, curY);
                curY += lineH;
            });
            curY += 8;
        });

        // Nhấp nháy con trỏ gõ chữ |
        if (!this.storyTextDone && Math.sin(time * 8) > 0) {
            ctx.fillStyle = "#00d2d3";
            ctx.fillRect(boxX + 28, curY - 6, 8, 18);
        }

        // 3. ĐÁY HỘP THOẠI: CHẤM TIẾN TRÌNH & NÚT HÀNH ĐỘNG
        const footY = boxY + boxH - 32;

        // Chấm tiến trình các Hồi (5 trang)
        const dotStartX = boxX + 30;
        for (let i = 0; i < this.storySlides.length; i++) {
            const dx = dotStartX + i * 22;
            const isCurrent = (i === this.storySlideIndex);

            if (isCurrent) {
                ctx.fillStyle = "#f1c40f";
                ctx.fillRect(dx, footY - 10, 14, 14);
                ctx.fillStyle = "#ffffff";
                ctx.fillRect(dx + 3, footY - 7, 8, 8);
            } else if (i < this.storySlideIndex) {
                ctx.fillStyle = "#2ecc71";
                ctx.fillRect(dx + 2, footY - 8, 10, 10);
            } else {
                ctx.fillStyle = "#34495e";
                ctx.fillRect(dx + 2, footY - 8, 10, 10);
                ctx.strokeStyle = "#576574";
                ctx.lineWidth = 1;
                ctx.strokeRect(dx + 2, footY - 8, 10, 10);
            }
        }

        ctx.fillStyle = "#cbd5e1";
        ctx.font = "bold 14px 'Segoe UI', Tahoma, sans-serif";
        ctx.textAlign = "left";
        ctx.fillText(`Hồi ${this.storySlideIndex + 1}/${this.storySlides.length}`, dotStartX + this.storySlides.length * 22 + 10, footY + 1);

        // Nút hành động góc dưới phải
        if (!this.storyTextDone) {
            ctx.fillStyle = "#94a3b8";
            ctx.font = "bold 14px 'Segoe UI', Tahoma, sans-serif";
            ctx.textAlign = "right";
            ctx.fillText("Nhấn [ENTER] để hiện ngay toàn bộ chữ", boxX + boxW - 24, footY + 1);
        } else {
            const isLast = (this.storySlideIndex === this.storySlides.length - 1);
            const promptText = isLast ? "XUẤT KÍCH BẢO VỆ VƯƠNG QUỐC!" : "TIẾP TỤC CỐT TRUYỆN";

            ctx.fillStyle = "#2ecc71";
            ctx.font = "bold 19px 'Segoe UI', Tahoma, sans-serif";
            ctx.textAlign = "right";
            ctx.fillText(`👉 NHẤN [ENTER] ĐỂ ${promptText} 👈`, boxX + boxW - 24, footY + 1);
        }
    }

    _getTextLines(ctx, text, maxWidth) {
        const words = text.split(" ");
        const lines = [];
        let curLine = "";
        for (let i = 0; i < words.length; i++) {
            const testLine = curLine ? (curLine + " " + words[i]) : words[i];
            if (ctx.measureText(testLine).width > maxWidth && i > 0) {
                lines.push(curLine);
                curLine = words[i];
            } else {
                curLine = testLine;
            }
        }
        if (curLine) lines.push(curLine);
        return lines;
    }

    _renderStartScreen(ctx, w, h) {
        ctx.fillStyle = "rgba(20, 15, 35, 0.95)";
        ctx.fillRect(w * 0.10, h * 0.06, w * 0.80, h * 0.88);
        ctx.strokeStyle = "#f1c40f";
        ctx.lineWidth = 4;
        ctx.strokeRect(w * 0.10, h * 0.06, w * 0.80, h * 0.88);

        ctx.fillStyle = "#f1c40f";
        ctx.font = "bold 44px 'Segoe UI', Tahoma, sans-serif";
        ctx.textAlign = "center";
        ctx.fillText("VỆ BINH MẬT KHẨU", w / 2, h * 0.15);

        ctx.fillStyle = "#00d2d3";
        ctx.font = "bold 20px 'Courier New', monospace";
        ctx.fillText("CYBERSEC PASSWORD GUARDIAN", w / 2, h * 0.20);

        // Hiển thị Vệ Binh bước đi dũng cảm ở trung tâm (kèm trang bị thích ứng thời tiết)
        const curW = this.weather ? this.weather.currentType : 'SUNNY';
        window.PixelSprites.drawAdventurer(ctx, w / 2 - 30, h * 0.22, 68, performance.now() / 150, 1, true, 1, curW);

        ctx.fillStyle = "#f1f2f6";
        ctx.font = "bold 18px 'Segoe UI', Tahoma, sans-serif";
        ctx.textAlign = "left";
        const startX = w * 0.15;
        let startY = h * 0.35;

        const infoItems = [
            { icon: "shield", text: "3 Thế giới phiêu lưu: Rừng Mật Mã (Cây/Chim), Biển Dữ Liệu (Cá/Rong), Tầng Mây (Đảo bay)" },
            { icon: "tree", text: "Hệ sinh thái sống động: Cây cối lay động, chim hót, rong rêu uốn lượn, đàn cá bơi lội" },
            { icon: "sword", text: "Vệ Binh thích ứng thời tiết: Đội nón che nắng, che dù đi mưa, mặc áo ấm quàng khăn len" },
            { icon: "rose", text: "Mỗi câu trả lời đúng được thưởng 1 Bông Hồng (cần đúng cả 3 câu để pass vòng)" },
            { icon: "dice", text: "Sau mỗi vòng: Lắc xúc xắc (Lẻ: đi tiếp bình thường | Chẵn: bốc thẻ may rủi tặng hoa)" },
            { icon: "dragon", text: "Boss Cuối: Cần >= 9 bông hồng để bắn hạ Rồng ở 4 vị trí ngẫu nhiên A, B, C, D!" },
            { icon: "phone", text: "Tay Cầm ĐT: Quét mã QR góc phải để bấm nút A, B, C, D, ENTER song song với Arduino!" }
        ];

        infoItems.forEach(item => {
            window.PixelSprites.drawPixelIcon(ctx, item.icon, startX - 32, startY - 18, 25);
            ctx.fillText(item.text, startX, startY);
            startY += 36;
        });

        const blink = Math.sin(performance.now() / 250) > 0;
        if (blink) {
            ctx.fillStyle = "#2ecc71";
            ctx.font = "bold 25px 'Segoe UI', Tahoma, sans-serif";
            ctx.textAlign = "center";
            ctx.fillText("NHẤN [ENTER] ĐỂ BẮT ĐẦU CỐT TRUYỆN & PHIÊU LƯU", w / 2, h * 0.79);
            window.PixelSprites.drawPixelIcon(ctx, "arrow", w / 2 - 400, h * 0.79 - 20, 26);
            ctx.save();
            ctx.translate(w / 2 + 400, h * 0.79 - 8);
            ctx.scale(-1, 1);
            window.PixelSprites.drawPixelIcon(ctx, "arrow", 0, -12, 26);
            ctx.restore();
        }

        // Nút mở Kho Thành Tựu (Rồng bay phượng múa & Cúp Kratos)
        ctx.fillStyle = "#f1c40f";
        ctx.font = "bold 17px 'Segoe UI', Tahoma, sans-serif";
        ctx.textAlign = "center";
        window.PixelSprites.drawPixelIcon(ctx, "trophy", w / 2 - 275, h * 0.85 - 15, 22);
        ctx.fillText("🏆 NHẤN PHÍM [C] HOẶC CLICK VÀO ĐÂY ĐỂ VÀO KHO THÀNH TỰU (RỒNG BAY PHƯỢNG MÚA)", w / 2 + 10, h * 0.85);

        // Chữ đồng hành chìm nhẹ tinh tế ở góc dưới Start Screen
        ctx.save();
        ctx.globalAlpha = 0.7;
        const subY = h * 0.91;
        if (this.logoNBK && this.logoNBK.complete) {
            ctx.drawImage(this.logoNBK, w / 2 - 190, subY - 15, 20, 20);
        }
        if (this.logoSoftLab && this.logoSoftLab.complete) {
            ctx.drawImage(this.logoSoftLab, w / 2 + 175, subY - 15, 20, 20);
        }
        ctx.fillStyle = "#cbd5e1";
        ctx.font = "bold 14px 'Segoe UI', Tahoma, sans-serif";
        ctx.textAlign = "center";
        ctx.fillText("Đồng hành phát triển: THCS Nguyễn Bỉnh Khiêm  •  SoftLab", w / 2, subY);
        ctx.restore();
    }

    _renderStageIntro(ctx, w, h) {
        ctx.fillStyle = "rgba(20, 15, 35, 0.94)";
        ctx.fillRect(w * 0.16, h * 0.16, w * 0.68, h * 0.68);
        ctx.strokeStyle = "#00d2d3";
        ctx.lineWidth = 4;
        ctx.strokeRect(w * 0.16, h * 0.16, w * 0.68, h * 0.68);

        ctx.fillStyle = "#f1c40f";
        ctx.font = "bold 38px 'Segoe UI', Tahoma, sans-serif";
        ctx.textAlign = "center";

        let title = "";
        let stageIcon = "tree";
        let desc = "";
        let subDesc = "Hãy trả lời đúng cả các câu hỏi để bảo vệ thế giới và tích lũy hoa hồng!";
        if (this.currentStageConfig) {
            title = this.currentStageConfig.name;
            stageIcon = this.currentStageConfig.icon || "tree";
            desc = this.currentStageConfig.description || "";
            subDesc = this.currentStageConfig.subDescription || subDesc;
        } else if (this.stage === 1) {
            title = "VÒNG 1: KHU RỪNG MẬT MÃ";
            stageIcon = "tree";
            desc = "Cây cối rợp bóng và chim chóc ríu rít! Khám phá độ dài & cấu trúc mật khẩu!";
        } else if (this.stage === 2) {
            title = "VÒNG 2: VÙNG BIỂN DỮ LIỆU";
            stageIcon = "wave";
            desc = "Lặn sâu cùng đàn cá & rong rêu uốn lượn! Cảnh giác Phishing & kích hoạt 2FA!";
        } else {
            title = "VÒNG 3: TẦNG MÂY THƯỢNG ĐỈNH";
            stageIcon = "cloud";
            desc = "Bay cùng những hòn đảo bồng bềnh! Cụm mật khẩu Passphrase & chống Brute-force!";
        }

        ctx.fillText(title, w / 2, h * 0.34);
        window.PixelSprites.drawPixelIcon(ctx, stageIcon, w / 2 - 280, h * 0.34 - 30, 36);
        window.PixelSprites.drawPixelIcon(ctx, stageIcon, w / 2 + 244, h * 0.34 - 30, 36);

        ctx.fillStyle = "#ffffff";
        ctx.font = "bold 21px 'Segoe UI', Tahoma, sans-serif";
        ctx.fillText(desc, w / 2, h * 0.46);

        ctx.fillStyle = "#cbd5e1";
        ctx.font = "bold 18px 'Segoe UI', Tahoma, sans-serif";
        ctx.fillText(subDesc, w / 2, h * 0.54);

        ctx.fillStyle = "#2ecc71";
        ctx.font = "bold 25px 'Segoe UI', Tahoma, sans-serif";
        ctx.fillText("Nhấn [ENTER] để vào câu hỏi đầu tiên", w / 2, h * 0.70);
    }

    _renderQuestionScreen(ctx, w, h) {
        const q = this.stageQuestions[this.currentQIndex];
        if (!q) return;

        // Khung câu hỏi
        ctx.fillStyle = "rgba(25, 20, 45, 0.96)";
        ctx.fillRect(w * 0.13, h * 0.12, w * 0.74, h * 0.28);
        ctx.strokeStyle = "#3498db";
        ctx.lineWidth = 3;
        ctx.strokeRect(w * 0.13, h * 0.12, w * 0.74, h * 0.28);

        ctx.fillStyle = "#ffffff";
        ctx.font = "bold 23px 'Segoe UI', Tahoma, sans-serif";
        ctx.textAlign = "left";
        window.PixelSprites._wrapText(ctx, q.question, w * 0.16, h * 0.20, w * 0.69, 32);

        // 4 Lựa chọn A, B, C, D
        const optColors = ["#eb445a", "#3498db", "#f1c40f", "#2ecc71"];
        const optKeys = ["A", "B", "C", "D"];

        const boxW = w * 0.36;
        const boxH = h * 0.20;
        const positions = [
            { x: w * 0.13, y: h * 0.44 },
            { x: w * 0.52, y: h * 0.44 },
            { x: w * 0.13, y: h * 0.67 },
            { x: w * 0.52, y: h * 0.67 }
        ];

        q.options.forEach((optText, idx) => {
            const pos = positions[idx];
            ctx.fillStyle = "rgba(18, 14, 32, 0.94)";
            ctx.fillRect(pos.x, pos.y, boxW, boxH);

            ctx.strokeStyle = optColors[idx];
            ctx.lineWidth = 3;
            ctx.strokeRect(pos.x, pos.y, boxW, boxH);

            ctx.fillStyle = optColors[idx];
            ctx.fillRect(pos.x + 12, pos.y + 12, 38, 38);
            ctx.fillStyle = "#ffffff";
            ctx.font = "bold 24px 'Segoe UI', Tahoma, sans-serif";
            ctx.textAlign = "center";
            ctx.fillText(optKeys[idx], pos.x + 31, pos.y + 39);

            ctx.fillStyle = "#ffffff";
            ctx.font = "bold 18.5px 'Segoe UI', Tahoma, sans-serif";
            ctx.textAlign = "left";
            window.PixelSprites._wrapText(ctx, optText.substring(3), pos.x + 60, pos.y + 34, boxW - 74, 25);
        });

        ctx.fillStyle = "#cbd5e1";
        ctx.font = "bold 17px 'Segoe UI', Tahoma, sans-serif";
        ctx.textAlign = "center";
        ctx.fillText("Nhấn nút [A], [B], [C] hoặc [D] tương ứng để chọn đáp án", w / 2, h * 0.92);
    }

    _renderQuestionResultScreen(ctx, w, h) {
        ctx.fillStyle = "rgba(18, 14, 32, 0.96)";
        ctx.fillRect(w * 0.12, h * 0.12, w * 0.76, h * 0.76);

        const borderColor = this.isAnswerCorrect ? "#2ecc71" : "#e74c3c";
        ctx.strokeStyle = borderColor;
        ctx.lineWidth = 4;
        ctx.strokeRect(w * 0.12, h * 0.12, w * 0.76, h * 0.76);

        const resIcon = this.isAnswerCorrect ? "check" : "cross";
        window.PixelSprites.drawPixelIcon(ctx, resIcon, w / 2 - 270, h * 0.23 - 26, 34);
        window.PixelSprites.drawPixelIcon(ctx, resIcon, w / 2 + 236, h * 0.23 - 26, 34);

        ctx.fillStyle = borderColor;
        ctx.font = "bold 34px 'Segoe UI', Tahoma, sans-serif";
        ctx.textAlign = "center";
        ctx.fillText(this.resultTitle, w / 2, h * 0.23);

        if (this.isAnswerCorrect) {
            window.PixelSprites.drawPixelIcon(ctx, 'rose', w / 2 - 24, h * 0.27, 48);
        }

        ctx.fillStyle = "rgba(35, 28, 58, 0.92)";
        ctx.fillRect(w * 0.16, h * 0.36, w * 0.68, h * 0.38);
        ctx.strokeStyle = "#7873af";
        ctx.lineWidth = 2.5;
        ctx.strokeRect(w * 0.16, h * 0.36, w * 0.68, h * 0.38);

        window.PixelSprites.drawPixelIcon(ctx, "lightbulb", w * 0.18, h * 0.42 - 18, 24);
        ctx.fillStyle = "#f1c40f";
        ctx.font = "bold 21px 'Segoe UI', Tahoma, sans-serif";
        ctx.textAlign = "left";
        ctx.fillText("BÍ KÍP BẢO MẬT:", w * 0.18 + 32, h * 0.42);

        ctx.fillStyle = "#ffffff";
        ctx.font = "bold 19.5px 'Segoe UI', Tahoma, sans-serif";
        window.PixelSprites._wrapText(ctx, this.resultExplanation, w * 0.18, h * 0.48, w * 0.64, 29);

        ctx.fillStyle = "#2ecc71";
        ctx.font = "bold 25px 'Segoe UI', Tahoma, sans-serif";
        ctx.textAlign = "center";
        ctx.fillText("👉 NHẤN [ENTER] ĐỂ TIẾP TỤC 👈", w / 2, h * 0.82);
    }

    // Render hiệu ứng Jumpscare kinh dị chớp nháy toàn màn hình
    _renderJumpscare(ctx, w, h, time) {
        ctx.save();

        // 1. Phông nền chớp giật kinh hoàng (Đen - Đỏ thẫm - Tím tăm tối)
        const flashCycle = Math.floor(time * 30) % 4;
        let bgFill = "#000000";
        if (flashCycle === 1) bgFill = "#3a0005";
        else if (flashCycle === 2) bgFill = "#6b000a";
        else if (flashCycle === 3) bgFill = "#15001f";

        ctx.fillStyle = bgFill;
        ctx.fillRect(0, 0, w, h);

        // 2. Lưới quét scanline nhiễu sóng kỹ thuật số
        ctx.fillStyle = "rgba(0, 0, 0, 0.55)";
        for (let y = 0; y < h; y += 4) {
            ctx.fillRect(0, y, w, 2);
        }

        // 3. Glitch sọc ngang đứt gãy màn hình
        const glitchSlices = 6;
        for (let i = 0; i < glitchSlices; i++) {
            const gy = (Math.sin(time * 15 + i * 2) * 0.5 + 0.5) * h;
            const gh = 8 + (i * 4);
            const gxOffset = (Math.sin(time * 40 + i) * 20);
            ctx.fillStyle = i % 2 === 0 ? "rgba(255, 0, 50, 0.25)" : "rgba(0, 240, 255, 0.2)";
            ctx.fillRect(gxOffset, gy, w, gh);
        }

        // 4. Vết cào móng vuốt máu xé toạc màn hình
        window.PixelSprites.drawHorrorClawSlashes(ctx, w, h, time);

        // 5. Quỷ dữ Malware / Cyber Demon lao thẳng vào mặt (Jumpscare Lunge)
        const progress = Math.max(0, 1.0 - (this.jumpscareTimer / 1.67));
        const lungeScale = 1.3 + Math.min(progress * 1.8, 1.3) + Math.sin(time * 45) * 0.08;
        const demonX = w / 2 + (Math.random() - 0.5) * 16;
        const demonY = h * 0.46 + (Math.random() - 0.5) * 16;

        window.PixelSprites.drawJumpscareDemon(ctx, demonX, demonY, lungeScale, time);

        // 6. Dải cảnh báo Hacker màu máu nguy hiểm cực độ
        const bannerY = h * 0.08;
        ctx.fillStyle = "rgba(180, 0, 0, 0.88)";
        ctx.fillRect(0, bannerY - 30, w, 68);
        ctx.fillStyle = "#ffffff";
        ctx.fillRect(0, bannerY + 38, w, 3);
        ctx.fillRect(0, bannerY - 30, w, 3);

        ctx.font = "bold 32px 'Segoe UI', Tahoma, sans-serif";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";

        // Chữ bóng đổ đỏ rực
        ctx.fillStyle = "#000000";
        ctx.fillText("💀 MẬT MÃ BẺ KHÓA! HACKER ĐỘT NHẬP! 💀", w / 2 + 3, bannerY + 6);
        ctx.fillStyle = "#ff0033";
        ctx.fillText("💀 MẬT MÃ BẺ KHÓA! HACKER ĐỘT NHẬP! 💀", w / 2 - 2, bannerY + 2);
        ctx.fillStyle = "#ffffff";
        ctx.fillText("💀 MẬT MÃ BẺ KHÓA! HACKER ĐỘT NHẬP! 💀", w / 2, bannerY + 4);

        // Cảnh báo phụ bên dưới
        const subY = h * 0.86;
        ctx.fillStyle = "rgba(0, 0, 0, 0.88)";
        ctx.fillRect(w * 0.1, subY - 24, w * 0.8, 48);
        ctx.strokeStyle = "#e74c3c";
        ctx.lineWidth = 2.5;
        ctx.strokeRect(w * 0.1, subY - 24, w * 0.8, 48);

        ctx.font = "bold 21px 'Segoe UI', Tahoma, sans-serif";
        ctx.fillStyle = "#ff4757";
        ctx.fillText("⚠️ CẢNH BÁO NGUY HIỂM: HỆ THỐNG BẢO MẬT BỊ XÂM NHẬP TOÀN DIỆN! ⚠️", w / 2, subY);

        // Gợi ý bấm phím bỏ qua / tiếp tục
        ctx.font = "bold 15px 'Segoe UI', Tahoma, sans-serif";
        ctx.fillStyle = (Math.floor(time * 4) % 2 === 0) ? "#f1c40f" : "#ffffff";
        ctx.fillText(">> BẤM ENTER HOẶC PHÍM BẤT KỲ ĐỂ TIẾP TỤC <<", w / 2, h * 0.94);

        ctx.restore();
    }

    _renderStageClearScreen(ctx, w, h) {
        ctx.fillStyle = "rgba(18, 14, 32, 0.96)";
        ctx.fillRect(w * 0.13, h * 0.12, w * 0.74, h * 0.76);
        ctx.strokeStyle = "#f1c40f";
        ctx.lineWidth = 4;
        ctx.strokeRect(w * 0.13, h * 0.12, w * 0.74, h * 0.76);

        window.PixelSprites.drawPixelIcon(ctx, "star", w / 2 - 310, h * 0.25 - 28, 36);
        window.PixelSprites.drawPixelIcon(ctx, "star", w / 2 + 274, h * 0.25 - 28, 36);

        ctx.fillStyle = "#2ecc71";
        ctx.font = "bold 36px 'Segoe UI', Tahoma, sans-serif";
        ctx.textAlign = "center";
        ctx.fillText("CHÚC MỪNG BẠN ĐÃ PASS VÒNG!", w / 2, h * 0.25);

        const totalQ = this.stageQuestions.length || 3;
        ctx.fillStyle = "#ffffff";
        ctx.font = "bold 22px 'Segoe UI', Tahoma, sans-serif";
        ctx.fillText(`Bạn đã trả lời chính xác cả ${this.stageCorrectCount}/${totalQ} câu hỏi của Vòng ${this.stage}!`, w / 2, h * 0.38);

        window.PixelSprites.drawPixelIcon(ctx, "rose", w / 2 - 160, h * 0.48 - 22, 28);
        ctx.fillStyle = "#f1c40f";
        ctx.font = "bold 25px 'Segoe UI', Tahoma, sans-serif";
        ctx.fillText(`Số hoa hồng hiện có: ${this.roses}`, w / 2 + 10, h * 0.48);

        ctx.fillStyle = "#00d2d3";
        ctx.font = "bold 20px 'Segoe UI', Tahoma, sans-serif";
        ctx.fillText("Bước tiếp theo: Thử vận may với Minigame LẮC XÚC XẮC!", w / 2, h * 0.60);

        window.PixelSprites.drawPixelIcon(ctx, "dice", w / 2 - 230, h * 0.75 - 22, 28);
        ctx.fillStyle = "#f1c40f";
        ctx.font = "bold 26px 'Segoe UI', Tahoma, sans-serif";
        ctx.fillText("👉 NHẤN [ENTER] ĐỂ LẮC XÚC XẮC 👈", w / 2 + 10, h * 0.75);
    }

    _renderStageFailedScreen(ctx, w, h) {
        ctx.fillStyle = "rgba(18, 14, 32, 0.96)";
        ctx.fillRect(w * 0.13, h * 0.12, w * 0.74, h * 0.76);
        ctx.strokeStyle = "#e74c3c";
        ctx.lineWidth = 4;
        ctx.strokeRect(w * 0.13, h * 0.12, w * 0.74, h * 0.76);

        window.PixelSprites.drawPixelIcon(ctx, "skull", w / 2 - 310, h * 0.25 - 28, 36);
        window.PixelSprites.drawPixelIcon(ctx, "skull", w / 2 + 274, h * 0.25 - 28, 36);

        ctx.fillStyle = "#e74c3c";
        ctx.font = "bold 36px 'Segoe UI', Tahoma, sans-serif";
        ctx.textAlign = "center";
        ctx.fillText("CHƯA ĐẠT ĐIỀU KIỆN PASS VÒNG!", w / 2, h * 0.25);

        const totalQ = this.stageQuestions.length || 3;
        const passThresh = (this.currentStageConfig && typeof this.currentStageConfig.passThreshold === 'number')
            ? this.currentStageConfig.passThreshold
            : totalQ;

        ctx.fillStyle = "#ffffff";
        ctx.font = "bold 22px 'Segoe UI', Tahoma, sans-serif";
        ctx.fillText(`Bạn chỉ đúng ${this.stageCorrectCount}/${totalQ} câu. Cần đúng ${passThresh} câu để vượt qua!`, w / 2, h * 0.38);

        ctx.fillStyle = "#cbd5e1";
        ctx.font = "bold 19px 'Segoe UI', Tahoma, sans-serif";
        ctx.fillText("Hãy thử lại vòng này với các câu hỏi và dữ liệu mật khẩu mới nhé!", w / 2, h * 0.50);

        ctx.fillStyle = "#f1c40f";
        ctx.font = "bold 26px 'Segoe UI', Tahoma, sans-serif";
        ctx.fillText("👉 NHẤN [ENTER] ĐỂ THỬ LẠI VÒNG NÀY 👈", w / 2, h * 0.72);
    }

    _renderDiceScreen(ctx, w, h) {
        ctx.fillStyle = "rgba(18, 14, 32, 0.96)";
        ctx.fillRect(w * 0.13, h * 0.10, w * 0.74, h * 0.80);
        ctx.strokeStyle = "#9b59b6";
        ctx.lineWidth = 4;
        ctx.strokeRect(w * 0.13, h * 0.10, w * 0.74, h * 0.80);

        window.PixelSprites.drawPixelIcon(ctx, "dice", w / 2 - 320, h * 0.22 - 28, 36);
        window.PixelSprites.drawPixelIcon(ctx, "dice", w / 2 + 284, h * 0.22 - 28, 36);

        ctx.fillStyle = "#9b59b6";
        ctx.font = "bold 34px 'Segoe UI', Tahoma, sans-serif";
        ctx.textAlign = "center";
        ctx.fillText("MINIGAME: LẮC XÚC XẮC ĐỊNH MỆNH", w / 2, h * 0.22);

        window.PixelSprites.drawDice(ctx, w / 2 - 55, h * 0.28, 110, this.diceValue, this.isDiceRolling);

        if (this.state === "DICE") {
            ctx.fillStyle = "#ecf0f1";
            ctx.font = "bold 19px 'Segoe UI', Tahoma, sans-serif";
            ctx.fillText("Quy luật xúc xắc:", w / 2, h * 0.52);
            ctx.fillText("• Số LẺ (1, 3, 5): Vệ Binh bước đi phiêu lưu vào vùng đất tiếp theo", w / 2, h * 0.58);
            ctx.fillText("• Số CHẴN (2, 4, 6): Kích hoạt ô BỐC THẺ BÍ ẨN (tặng 1-3 hoa hồng hoặc thử thách)!", w / 2, h * 0.64);

            ctx.fillStyle = "#2ecc71";
            ctx.font = "bold 26px 'Segoe UI', Tahoma, sans-serif";
            ctx.fillText("👉 NHẤN [ENTER] ĐỂ GIEO XÚC XẮC 👈", w / 2, h * 0.78);
        } else {
            const isEven = (this.diceValue % 2 === 0);
            ctx.fillStyle = isEven ? "#f1c40f" : "#2ecc71";
            ctx.font = "bold 26px 'Segoe UI', Tahoma, sans-serif";

            if (isEven) {
                ctx.fillText(`KẾT QUẢ: SỐ ${this.diceValue} (SỐ CHẴN) -> BỐC THẺ MAY RỦI!`, w / 2, h * 0.54);
                ctx.fillStyle = "#ffffff";
                ctx.font = "bold 19px 'Segoe UI', Tahoma, sans-serif";
                ctx.fillText("Bạn mở khóa ô Thẻ Bí Ẩn! Cơ hội nhận thêm 1-3 hoa hồng!", w / 2, h * 0.62);
                ctx.fillStyle = "#f1c40f";
                ctx.font = "bold 26px 'Segoe UI', Tahoma, sans-serif";
                ctx.fillText("👉 NHẤN [ENTER] ĐỂ TIẾN VÀO BỐC THẺ 👈", w / 2, h * 0.78);
            } else {
                ctx.fillText(`KẾT QUẢ: SỐ ${this.diceValue} (SỐ LẺ) -> PHIÊU LƯU TIẾP TỤC!`, w / 2, h * 0.54);
                ctx.fillStyle = "#ffffff";
                ctx.font = "bold 19px 'Segoe UI', Tahoma, sans-serif";
                ctx.fillText("Đường đi an toàn! Vệ Binh chuẩn bị bước đi sang vùng đất mới!", w / 2, h * 0.62);
                ctx.fillStyle = "#2ecc71";
                ctx.font = "bold 26px 'Segoe UI', Tahoma, sans-serif";
                ctx.fillText("👉 NHẤN [ENTER] ĐỂ BẮT ĐẦU HÀNH TRÌNH BƯỚC ĐI 👈", w / 2, h * 0.78);
            }
        }
    }

    _renderCardScreen(ctx, w, h) {
        ctx.fillStyle = "rgba(18, 14, 32, 0.96)";
        ctx.fillRect(w * 0.13, h * 0.08, w * 0.74, h * 0.84);
        ctx.strokeStyle = "#f1c40f";
        ctx.lineWidth = 4;
        ctx.strokeRect(w * 0.13, h * 0.08, w * 0.74, h * 0.84);

        window.PixelSprites.drawPixelIcon(ctx, "star", w / 2 - 310, h * 0.18 - 26, 32);
        window.PixelSprites.drawPixelIcon(ctx, "star", w / 2 + 276, h * 0.18 - 26, 32);

        ctx.fillStyle = "#f1c40f";
        ctx.font = "bold 34px 'Segoe UI', Tahoma, sans-serif";
        ctx.textAlign = "center";
        ctx.fillText("THẺ BÀI MA THUẬT AN NINH MẠNG", w / 2, h * 0.18);

        window.PixelSprites.drawCard(ctx, w / 2 - 105, h * 0.24, 210, 280, this.currentCard, this.cardRevealed);

        if (!this.cardRevealed) {
            ctx.fillStyle = "#2ecc71";
            ctx.font = "bold 26px 'Segoe UI', Tahoma, sans-serif";
            ctx.fillText("👉 NHẤN [ENTER] ĐỂ LẬT THẺ BÍ ẨN 👈", w / 2, h * 0.83);
        } else {
            ctx.fillStyle = "#2ecc71";
            ctx.font = "bold 26px 'Segoe UI', Tahoma, sans-serif";
            ctx.fillText("👉 NHẤN [ENTER] ĐỂ BƯỚC VÀO HÀNH TRÌNH PHIÊU LƯU 👈", w / 2, h * 0.83);
        }
    }

    _renderBossIntroScreen(ctx, w, h) {
        ctx.fillStyle = "rgba(25, 10, 15, 0.96)";
        ctx.fillRect(w * 0.12, h * 0.10, w * 0.76, h * 0.80);
        ctx.strokeStyle = "#e74c3c";
        ctx.lineWidth = 4;
        ctx.strokeRect(w * 0.12, h * 0.10, w * 0.76, h * 0.80);

        window.PixelSprites.drawPixelIcon(ctx, "dragon", w / 2 - 320, h * 0.20 - 28, 36);
        window.PixelSprites.drawPixelIcon(ctx, "dragon", w / 2 + 284, h * 0.20 - 28, 36);

        ctx.fillStyle = "#e74c3c";
        ctx.font = "bold 36px 'Segoe UI', Tahoma, sans-serif";
        ctx.textAlign = "center";
        ctx.fillText("CẢNH BÁO: RỒNG HẮC ÁM XUẤT HIỆN!", w / 2, h * 0.20);

        window.PixelSprites.drawDragon(ctx, w / 2 - 75, h * 0.24, 150, 130, false, performance.now() / 200);

        const reqRoses = (this.config && this.config.settings && typeof this.config.settings.requiredRosesForBoss === 'number')
            ? this.config.settings.requiredRosesForBoss
            : 9;
        const bossHPDisplay = this.bossMaxHP || 9;

        window.PixelSprites.drawPixelIcon(ctx, "rose", w / 2 - 230, h * 0.48 - 20, 26);
        window.PixelSprites.drawPixelIcon(ctx, "dragon", w / 2 + 180, h * 0.48 - 20, 26);
        ctx.fillStyle = "#ffffff";
        ctx.font = "bold 22px 'Segoe UI', Tahoma, sans-serif";
        ctx.fillText(`Bạn đang có: ${this.roses} Bông Hồng   |   Máu Boss Rồng: ${bossHPDisplay} HP`, w / 2, h * 0.48);

        if (this.roses >= reqRoses) {
            window.PixelSprites.drawPixelIcon(ctx, "check", w / 2 - 310, h * 0.56 - 20, 26);
            ctx.fillStyle = "#2ecc71";
            ctx.font = "bold 22px 'Segoe UI', Tahoma, sans-serif";
            ctx.fillText(`BẠN ĐÃ CÓ ĐỦ >= ${reqRoses} HOA HỒNG ĐỂ TIÊU DIỆT RỒNG!`, w / 2 + 15, h * 0.56);
            ctx.fillStyle = "#ecf0f1";
            ctx.font = "bold 18.5px 'Segoe UI', Tahoma, sans-serif";
            ctx.fillText("Cách chơi: Rồng sẽ xuất hiện ngẫu nhiên ở 4 vị trí A, B, C, D.", w / 2, h * 0.62);
            ctx.fillText("Bấm phím tương ứng (A, B, C hoặc D) thật nhanh để phóng hoa hồng bắn hạ nó!", w / 2, h * 0.67);
        } else {
            window.PixelSprites.drawPixelIcon(ctx, "cross", w / 2 - 330, h * 0.56 - 20, 26);
            ctx.fillStyle = "#e74c3c";
            ctx.font = "bold 22px 'Segoe UI', Tahoma, sans-serif";
            ctx.fillText(`NGUY HIỂM! Bạn chỉ có ${this.roses} hoa hồng (cần ${reqRoses} hoa để tiêu diệt Rồng)!`, w / 2 + 15, h * 0.56);
            ctx.fillStyle = "#ecf0f1";
            ctx.font = "bold 18.5px 'Segoe UI', Tahoma, sans-serif";
            ctx.fillText("Nếu hết hoa hồng mà Rồng chưa chết, bạn sẽ bị ném xuống thung lũng!", w / 2, h * 0.63);
        }

        ctx.fillStyle = "#f1c40f";
        ctx.font = "bold 26px 'Segoe UI', Tahoma, sans-serif";
        ctx.fillText("👉 NHẤN [ENTER] ĐỂ BƯỚC VÀO TRẬN CHIẾN SINH TỬ! 👈", w / 2, h * 0.80);
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

            ctx.fillStyle = "rgba(20, 15, 30, 0.75)";
            ctx.fillRect(bx - 85, by - 65, 170, 130);

            const isCurrentBoss = (p.key === this.bossCurrentPos);
            ctx.strokeStyle = isCurrentBoss ? "#ff3838" : p.color;
            ctx.lineWidth = isCurrentBoss ? 5 : 2.5;
            ctx.strokeRect(bx - 85, by - 65, 170, 130);

            ctx.fillStyle = p.color;
            ctx.fillRect(bx - 75, by - 55, 34, 34);
            ctx.fillStyle = "#ffffff";
            ctx.font = "bold 22px 'Segoe UI', Tahoma, sans-serif";
            ctx.textAlign = "center";
            ctx.fillText(p.key, bx - 58, by - 30);

            if (isCurrentBoss) {
                const isHurt = this.bossHurtTimer > 0;
                window.PixelSprites.drawDragon(ctx, bx - 80, by - 60, 160, 130, isHurt, this.bossFlapAnim);

                const timeLeftPercent = Math.max(0, 1 - (this.bossTimer / this.bossMaxTime));
                ctx.fillStyle = "rgba(0, 0, 0, 0.7)";
                ctx.fillRect(bx - 60, by + 45, 120, 12);
                ctx.fillStyle = timeLeftPercent > 0.3 ? "#e74c3c" : "#ff0000";
                ctx.fillRect(bx - 60, by + 45, 120 * timeLeftPercent, 12);
            }
        });

        // Thanh Máu Boss
        const barW = 440;
        const barX = (w - barW) / 2;
        const barY = 66;

        ctx.fillStyle = "rgba(0, 0, 0, 0.85)";
        ctx.fillRect(barX, barY, barW, 30);
        ctx.strokeStyle = "#e74c3c";
        ctx.lineWidth = 2.5;
        ctx.strokeRect(barX, barY, barW, 30);

        const hpPercent = Math.max(0, this.bossHP / this.bossMaxHP);
        ctx.fillStyle = "#e74c3c";
        ctx.fillRect(barX + 2, barY + 2, (barW - 4) * hpPercent, 26);

        ctx.fillStyle = "#ffffff";
        ctx.font = "bold 16px 'Segoe UI', Tahoma, sans-serif";
        ctx.textAlign = "center";
        ctx.fillText(`MÁU RỒNG HẮC ÁM: ${this.bossHP} / ${this.bossMaxHP} HP`, w / 2, barY + 21);

        // Vẽ Vệ Binh ở vị trí bắn sẵn sàng (thích ứng thời tiết)
        const px = w / 2 - 20;
        const py = h - 95;
        const curW = this.weather ? this.weather.currentType : 'SUNNY';
        window.PixelSprites.drawAdventurer(ctx, px, py, 52, performance.now() / 200, 1, false, this.roses, curW);

        // Hộp thông báo hành động nổi bật ở đáy
        ctx.fillStyle = "rgba(10, 8, 20, 0.9)";
        ctx.fillRect(w * 0.15, h - 42, w * 0.70, 36);
        ctx.strokeStyle = "#f1c40f";
        ctx.lineWidth = 1.5;
        ctx.strokeRect(w * 0.15, h - 42, w * 0.70, 36);

        window.PixelSprites.drawPixelIcon(ctx, "dragon", w / 2 - 330, h - 35, 22);
        window.PixelSprites.drawPixelIcon(ctx, "rose", w / 2 + 310, h - 35, 22);

        ctx.fillStyle = "#f1c40f";
        ctx.font = "bold 20px 'Segoe UI', Tahoma, sans-serif";
        ctx.textAlign = "center";
        ctx.fillText(`Rồng đang ở cổng [${this.bossCurrentPos}]! BẤM PHÍM [${this.bossCurrentPos}] ĐỂ BẮN HOA HỒNG!`, w / 2, h - 18);
    }

    _renderVictoryScreen(ctx, w, h) {
        ctx.fillStyle = "rgba(10, 8, 20, 0.96)";
        ctx.fillRect(w * 0.08, h * 0.06, w * 0.84, h * 0.88);
        ctx.strokeStyle = "#f1c40f";
        ctx.lineWidth = 5;
        ctx.strokeRect(w * 0.08, h * 0.06, w * 0.84, h * 0.88);

        window.PixelSprites.drawPixelIcon(ctx, "trophy", w / 2 - 310, h * 0.16 - 30, 38);
        window.PixelSprites.drawPixelIcon(ctx, "trophy", w / 2 + 272, h * 0.16 - 30, 38);

        ctx.fillStyle = "#f1c40f";
        ctx.font = "bold 40px 'Segoe UI', Tahoma, sans-serif";
        ctx.textAlign = "center";
        ctx.fillText("CHIẾN THẮNG TUYỆT ĐỐI!", w / 2, h * 0.16);

        ctx.fillStyle = "#2ecc71";
        ctx.font = "bold 23px 'Segoe UI', Tahoma, sans-serif";
        ctx.fillText("BẠN ĐÃ TIÊU DIỆT HOÀN TOÀN RỒNG HẮC ÁM!", w / 2, h * 0.22);

        window.PixelSprites.drawTreasureChest(ctx, w / 2 - 80, h * 0.25, 160, true);

        // Vệ Binh đứng cạnh rương ăn mừng (thích ứng thời tiết)
        const curW = this.weather ? this.weather.currentType : 'SUNNY';
        window.PixelSprites.drawAdventurer(ctx, w / 2 + 105, h * 0.32, 58, performance.now() / 200, -1, false, 5, curW);

        for (let i = 0; i < 6; i++) {
            const rx = w * 0.22 + Math.random() * (w * 0.56);
            const ry = h * 0.22 + Math.random() * (h * 0.3);
            window.PixelSprites.drawPixelIcon(ctx, "rose", rx, ry, 28);
        }

        ctx.fillStyle = "#ffffff";
        ctx.font = "bold 21px 'Segoe UI', Tahoma, sans-serif";
        ctx.fillText("Bạn đã đoạt được: 'KHO BÁU MẬT MÃ HOÀNG KIM'", w / 2, h * 0.54);
        ctx.fillStyle = "#00d2d3";
        ctx.font = "bold 20px 'Segoe UI', Tahoma, sans-serif";
        ctx.fillText("Và đạt danh hiệu cao quý: BẬC THẦY VỆ BINH AN NINH MẠNG!", w / 2, h * 0.58);

        // Thông số chiến tích
        const minStr = Math.floor((this.lastTotalDuration || 0) / 60);
        const secStr = Math.floor((this.lastTotalDuration || 0) % 60).toString().padStart(2, "0");
        ctx.fillStyle = "#f1c40f";
        ctx.font = "bold 17px 'Segoe UI', Tahoma, sans-serif";
        ctx.fillText(`⏱️ Tổng thời gian: ${minStr}:${secStr}   |   ⚔️ Đánh Boss: ${(this.lastBossDuration || 0).toFixed(1)}s   |   🌹 Hoa hồng: ${this.roses}`, w / 2, h * 0.63);

        // Nút hành động 1: Tiến vào Kho Thành Tựu & Giấy Chứng Nhận
        const blink = Math.sin(performance.now() / 250) > 0;
        ctx.fillStyle = blink ? "#f1c40f" : "#f39c12";
        ctx.font = "bold 24px 'Segoe UI', Tahoma, sans-serif";
        ctx.fillText("👉 NHẤN [ENTER] ĐỂ TIẾN VÀO KHO THÀNH TỰU (RỒNG BAY PHƯỢNG MÚA) 👈", w / 2, h * 0.72);

        // Nút hành động 2: Nhận Giấy Chứng Nhận & Chơi lại
        ctx.fillStyle = "#2ecc71";
        ctx.font = "bold 19px 'Segoe UI', Tahoma, sans-serif";
        ctx.fillText("📜 NHẤN [G] ĐỂ CẤP & TẢI VỀ GIẤY CHỨNG NHẬN   |   [A / R] CHƠI LẠI TỪ ĐẦU", w / 2, h * 0.78);

        // Logo 2 đơn vị đồng hành chìm tinh tế
        ctx.save();
        ctx.globalAlpha = 0.7;
        const vCreditY = h * 0.86;
        if (this.logoNBK && this.logoNBK.complete) {
            ctx.drawImage(this.logoNBK, w / 2 - 180, vCreditY - 14, 20, 20);
        }
        if (this.logoSoftLab && this.logoSoftLab.complete) {
            ctx.drawImage(this.logoSoftLab, w / 2 + 165, vCreditY - 14, 20, 20);
        }
        ctx.fillStyle = "#cbd5e1";
        ctx.font = "bold 14px 'Segoe UI', Tahoma, sans-serif";
        ctx.textAlign = "center";
        ctx.fillText("Trường THCS Nguyễn Bỉnh Khiêm  •  SoftLab", w / 2, vCreditY);
        ctx.restore();
    }

    _renderAchievementsScreen(ctx, w, h) {
        // 1. Phông nền Thiên Giới / Vũ trụ huyền ảo (Cosmic Midnight Gradient)
        const bgGrad = ctx.createLinearGradient(0, 0, 0, h);
        bgGrad.addColorStop(0, "#080616");
        bgGrad.addColorStop(0.5, "#150d30");
        bgGrad.addColorStop(1, "#080616");
        ctx.fillStyle = bgGrad;
        ctx.fillRect(0, 0, w, h);

        // 2. HIỆU ỨNG RỒNG BAY PHƯỢNG MÚA (LONG PHƯỢNG KỲ BẢO)
        // Thần Long uốn lượn số 8 vô cực + Phượng Hoàng tung cánh rực lửa + Tia sáng God Rays
        if (window.LongPhuongFX) {
            window.LongPhuongFX.render(ctx, w, h);
        }

        // 3. KHUNG TIÊU ĐỀ HOÀNG KIM (GOLDEN SANCTUARY BANNER)
        const bannerW = w * 0.86;
        const bannerH = 70;
        const bannerX = (w - bannerW) / 2;
        const bannerY = 14;

        ctx.fillStyle = "rgba(18, 12, 38, 0.92)";
        ctx.fillRect(bannerX, bannerY, bannerW, bannerH);
        ctx.strokeStyle = "#d4af37";
        ctx.lineWidth = 3;
        ctx.shadowColor = "#f1c40f";
        ctx.shadowBlur = 12;
        ctx.strokeRect(bannerX, bannerY, bannerW, bannerH);
        ctx.shadowBlur = 0;

        window.PixelSprites.drawPixelIcon(ctx, "trophy", bannerX + 20, bannerY + 16, 38);
        window.PixelSprites.drawPixelIcon(ctx, "trophy", bannerX + bannerW - 58, bannerY + 16, 38);

        ctx.fillStyle = "#f1c40f";
        ctx.font = "900 28px 'Segoe UI', Tahoma, sans-serif";
        ctx.textAlign = "center";
        ctx.fillText("✦ ĐIỆN THỜ THÀNH TỰU • LONG PHƯỢNG KỲ BẢO ✦", w / 2, bannerY + 36);

        const unlockedCount = window.AchievementManager ? window.AchievementManager.getUnlockedCount() : 0;
        ctx.fillStyle = "#00d2d3";
        ctx.font = "bold 15px 'Segoe UI', Tahoma, sans-serif";
        ctx.fillText(`VỆ BINH AN TOÀN THÔNG TIN  •  ĐÃ MỞ KHÓA: ${unlockedCount}/3 THÀNH TỰU HUYỀN THOẠI`, w / 2, bannerY + 58);

        // 4. BA BỆ THỜ VINH DANH (3 TROPHY SHRINES / ALTARS)
        const altars = [
            {
                id: "the_flash",
                title: "THE FLASH",
                titleVi: "Tốc Độ Sấm Sét",
                desc: "Hoàn thành trò chơi < 3 phút",
                imgKey: "the_flash",
                x: w * 0.07,
                y: 98,
                w: 340,
                h: 520,
                accentColor: "#f1c40f",
                tagColor: "#f39c12"
            },
            {
                id: "kratos",
                title: "KRATOS",
                titleVi: "Chiến Thần Đồ Long",
                desc: "Đánh boss rồng < 20 giây",
                imgKey: "kratos",
                x: w * 0.36,
                y: 86, // Đỉnh cao trung tâm, nâng cao hơn
                w: 360,
                h: 532,
                accentColor: "#e74c3c",
                tagColor: "#c0392b",
                isCenter: true
            },
            {
                id: "loser",
                title: "LOSER",
                titleVi: "Thánh Đoán Sai",
                desc: "Sai hết cả 3 câu trong 1 ải",
                imgKey: "loser",
                x: w * 0.67,
                y: 98,
                w: 340,
                h: 520,
                accentColor: "#a855f7",
                tagColor: "#8e44ad"
            }
        ];

        altars.forEach((alt) => {
            const ach = window.AchievementManager ? window.AchievementManager.get(alt.id) : null;
            const isUnlocked = ach && ach.unlocked;

            ctx.save();

            // Khung nền Bệ thờ (Shrine Backplate)
            const bgAlpha = isUnlocked ? "0.92" : "0.78";
            ctx.fillStyle = isUnlocked ? `rgba(24, 16, 48, ${bgAlpha})` : `rgba(14, 12, 26, ${bgAlpha})`;
            ctx.fillRect(alt.x, alt.y, alt.w, alt.h);

            // Viền phát sáng hoàng kim hoặc viền tối
            ctx.strokeStyle = isUnlocked ? alt.accentColor : "#475569";
            ctx.lineWidth = isUnlocked ? 3.5 : 2;
            if (isUnlocked) {
                ctx.shadowColor = alt.accentColor;
                ctx.shadowBlur = alt.isCenter ? 24 : 16;
            }
            ctx.strokeRect(alt.x, alt.y, alt.w, alt.h);
            ctx.shadowBlur = 0;

            // Chân bệ thờ đá tầng (Altar Stepped Pedestal)
            const pedY = alt.y + alt.h - 55;
            ctx.fillStyle = isUnlocked ? "#2c2250" : "#1e1b2e";
            ctx.fillRect(alt.x + 15, pedY, alt.w - 30, 42);
            ctx.fillStyle = isUnlocked ? alt.accentColor : "#334155";
            ctx.fillRect(alt.x + 10, pedY + 32, alt.w - 20, 10);

            // KHUNG HÌNH ẢNH THÀNH TỰU (ACHIEVEMENT IMAGE DISPLAY)
            const imgBoxW = alt.isCenter ? 210 : 180;
            const imgBoxH = alt.isCenter ? 200 : 170;
            const imgX = alt.x + (alt.w - imgBoxW) / 2;
            const imgY = alt.y + (alt.isCenter ? 40 : 45);

            // Nền bệ đỡ cúp
            ctx.fillStyle = "rgba(0, 0, 0, 0.45)";
            ctx.fillRect(imgX - 8, imgY - 8, imgBoxW + 16, imgBoxH + 16);
            ctx.strokeStyle = isUnlocked ? alt.accentColor : "#334155";
            ctx.lineWidth = 1.5;
            ctx.strokeRect(imgX - 8, imgY - 8, imgBoxW + 16, imgBoxH + 16);

            const imgObj = this.achievementImgs ? this.achievementImgs[alt.imgKey] : null;

            if (imgObj && imgObj.complete && imgObj.naturalWidth > 0) {
                ctx.save();
                if (!isUnlocked) {
                    ctx.globalAlpha = 0.35; // Làm mờ khi chưa mở khóa
                    ctx.drawImage(imgObj, imgX, imgY, imgBoxW, imgBoxH);
                    ctx.restore();
                    // Icon ổ khóa
                    ctx.fillStyle = "#64748b";
                    ctx.font = "bold 44px 'Segoe UI', Tahoma, sans-serif";
                    ctx.textAlign = "center";
                    ctx.fillText("🔒", alt.x + alt.w / 2, imgY + imgBoxH / 2 + 15);
                } else {
                    // Mở khóa: hào quang rực rỡ
                    ctx.shadowColor = alt.accentColor;
                    ctx.shadowBlur = 18;
                    ctx.drawImage(imgObj, imgX, imgY, imgBoxW, imgBoxH);
                    ctx.restore();
                }
            } else {
                // Fallback Pixel Icon nếu ảnh đang tải
                window.PixelSprites.drawPixelIcon(ctx, alt.imgKey, alt.x + alt.w / 2 - 36, imgY + 40, 72);
            }

            // TIÊU ĐỀ THÀNH TỰU
            const textY = imgY + imgBoxH + 34;
            ctx.textAlign = "center";
            ctx.fillStyle = isUnlocked ? alt.accentColor : "#94a3b8";
            ctx.font = `900 ${alt.isCenter ? "26px" : "23px"} 'Segoe UI', Tahoma, sans-serif`;
            ctx.fillText(alt.title, alt.x + alt.w / 2, textY);

            ctx.fillStyle = "#cbd5e1";
            ctx.font = "italic 15px 'Segoe UI', Tahoma, sans-serif";
            ctx.fillText(alt.titleVi, alt.x + alt.w / 2, textY + 22);

            // ĐIỀU KIỆN MỞ KHÓA
            ctx.fillStyle = "#f1f2f6";
            ctx.font = "bold 13.5px 'Segoe UI', Tahoma, sans-serif";
            ctx.fillText(`🎯 ${alt.desc}`, alt.x + alt.w / 2, textY + 50);

            // TRẠNG THÁI MỞ KHÓA (STATUS PILL BADGE)
            const pillW = alt.w - 50;
            const pillH = 34;
            const pillX = alt.x + 25;
            const pillY = alt.y + alt.h - 100;

            if (isUnlocked) {
                ctx.fillStyle = alt.tagColor;
                ctx.fillRect(pillX, pillY, pillW, pillH);
                ctx.strokeStyle = "#ffffff";
                ctx.lineWidth = 1;
                ctx.strokeRect(pillX, pillY, pillW, pillH);

                ctx.fillStyle = "#ffffff";
                ctx.font = "bold 14px 'Segoe UI', Tahoma, sans-serif";
                const recordStr = ach && ach.record ? ` (${ach.record})` : "";
                ctx.fillText(`✓ ĐÃ MỞ KHÓA${recordStr}`, alt.x + alt.w / 2, pillY + 22);
            } else {
                ctx.fillStyle = "rgba(44, 62, 80, 0.7)";
                ctx.fillRect(pillX, pillY, pillW, pillH);
                ctx.strokeStyle = "#475569";
                ctx.lineWidth = 1;
                ctx.strokeRect(pillX, pillY, pillW, pillH);

                ctx.fillStyle = "#94a3b8";
                ctx.font = "bold 13px 'Segoe UI', Tahoma, sans-serif";
                ctx.fillText("🔒 CHƯA ĐẠT ĐƯỢC", alt.x + alt.w / 2, pillY + 22);
            }

            ctx.restore();
        });

        // 5. THANH NÚT HÀNH ĐỘNG DƯỚI CÙNG (BOTTOM ACTION CONTROLS)
        const btnY = h - 68;
        const pulse = Math.sin(performance.now() / 200) > 0;

        // Nút 1: Cấp Giấy Chứng Nhận & Tải Về
        const b1X = w * 0.16;
        const b1W = 390;
        const b1H = 50;
        const gGrad = ctx.createLinearGradient(b1X, btnY, b1X + b1W, btnY);
        gGrad.addColorStop(0, "#f39c12");
        gGrad.addColorStop(0.5, "#f1c40f");
        gGrad.addColorStop(1, "#e67e22");
        ctx.fillStyle = gGrad;
        ctx.fillRect(b1X, btnY, b1W, b1H);
        ctx.strokeStyle = pulse ? "#ffffff" : "#ffeaa7";
        ctx.lineWidth = 3;
        ctx.shadowColor = "#f1c40f";
        ctx.shadowBlur = pulse ? 18 : 8;
        ctx.strokeRect(b1X, btnY, b1W, b1H);
        ctx.shadowBlur = 0;

        ctx.fillStyle = "#140f26";
        ctx.font = "900 17px 'Segoe UI', Tahoma, sans-serif";
        ctx.textAlign = "center";
        ctx.fillText("📜 [ENTER] CẤP GIẤY CHỨNG NHẬN & TẢI VỀ", b1X + b1W / 2, btnY + 32);

        // Nút 2: Về Menu Chính
        const b2X = w * 0.50;
        const b2W = 220;
        const b2H = 50;
        ctx.fillStyle = "#1e272e";
        ctx.fillRect(b2X, btnY, b2W, b2H);
        ctx.strokeStyle = "#00d2d3";
        ctx.lineWidth = 2;
        ctx.strokeRect(b2X, btnY, b2W, b2H);

        ctx.fillStyle = "#00d2d3";
        ctx.font = "bold 16px 'Segoe UI', Tahoma, sans-serif";
        ctx.fillText("🏠 [B / ESC] VỀ MENU", b2X + b2W / 2, btnY + 32);

        // Nút 3: Chơi lại săn thành tựu
        const b3X = w * 0.70;
        const b3W = 240;
        const b3H = 50;
        ctx.fillStyle = "#142952";
        ctx.fillRect(b3X, btnY, b3W, b3H);
        ctx.strokeStyle = "#2ecc71";
        ctx.lineWidth = 2;
        ctx.strokeRect(b3X, btnY, b3W, b3H);

        ctx.fillStyle = "#2ecc71";
        ctx.font = "bold 16px 'Segoe UI', Tahoma, sans-serif";
        ctx.fillText("🔄 [A] CHƠI LẠI TỪ ĐẦU", b3X + b3W / 2, btnY + 32);
    }

    _renderGameOverScreen(ctx, w, h) {
        ctx.fillStyle = "rgba(10, 5, 15, 0.96)";
        ctx.fillRect(w * 0.12, h * 0.14, w * 0.76, h * 0.74);
        ctx.strokeStyle = "#e74c3c";
        ctx.lineWidth = 4;
        ctx.strokeRect(w * 0.12, h * 0.14, w * 0.76, h * 0.74);

        window.PixelSprites.drawPixelIcon(ctx, "skull", w / 2 - 340, h * 0.26 - 30, 38);
        window.PixelSprites.drawPixelIcon(ctx, "skull", w / 2 + 304, h * 0.26 - 30, 38);

        ctx.fillStyle = "#e74c3c";
        ctx.font = "bold 38px 'Segoe UI', Tahoma, sans-serif";
        ctx.textAlign = "center";
        ctx.fillText("GAME OVER: BỊ NÉM XUỐNG THUNG LŨNG!", w / 2, h * 0.26);

        ctx.fillStyle = "#ffffff";
        ctx.font = "bold 22px 'Segoe UI', Tahoma, sans-serif";
        ctx.fillText("Bạn không đủ hỏa lực hoa hồng hoặc đã để Rồng Hắc Ám phản công!", w / 2, h * 0.38);

        ctx.fillStyle = "#cbd5e1";
        ctx.font = "bold 19px 'Segoe UI', Tahoma, sans-serif";
        ctx.fillText("Rồng đã dùng sức mạnh bão lửa thổi bay bạn rơi thẳng xuống vực thẳm đá nhọn!", w / 2, h * 0.48);

        window.PixelSprites.drawPixelIcon(ctx, "lightbulb", w / 2 - 390, h * 0.60 - 18, 24);
        ctx.fillStyle = "#f1c40f";
        ctx.font = "bold 18.5px 'Segoe UI', Tahoma, sans-serif";
        ctx.fillText("Mẹo: Hãy cố gắng trả lời đúng tất cả các câu và tận dụng thẻ may mắn để tích >= 9 bông hồng!", w / 2 + 10, h * 0.60);

        ctx.fillStyle = "#2ecc71";
        ctx.font = "bold 26px 'Segoe UI', Tahoma, sans-serif";
        ctx.fillText("👉 NHẤN [ENTER] ĐỂ THỬ THÁCH LẠI TỪ ĐẦU 👈", w / 2, h * 0.76);
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
