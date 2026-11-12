/**
 * CYBERSEC GAME HELPER & QUESTION CONFIGURATOR LOGIC
 * - Quản lý Sections (Vòng chơi)
 * - Quản lý Câu hỏi, Đáp án & Số hoa hồng từng câu
 * - Quản lý Randomization & Cấu hình Boss/Thẻ bài
 * - Đồng bộ với Server qua REST API + WebSocket
 * - Xuất (Export) & Nạp (Import) file JSON
 */

(function () {
    // State dữ liệu cấu hình hiện tại
    let currentConfig = {
        version: "1.0.0",
        gameTitle: "VỆ BINH MẬT KHẨU",
        gameSubtitle: "CYBERSEC PASSWORD GUARDIAN",
        settings: {
            shuffleQuestions: true,
            shuffleOptions: true,
            allowSkipStory: true,
            bossHP: 9,
            requiredRosesForBoss: 9,
            bossSpeedMs: 1400,
            diceRules: {
                evenAction: "CARD",
                oddAction: "TRAVEL",
                description: "Số LẺ: Đi tiếp | Số CHẴN: Bốc thẻ"
            }
        },
        sections: [],
        magicCards: []
    };

    let selectedStageId = 1;
    let editingQuestion = null; // null = tạo mới, object = đang sửa
    let editingSection = null;
    let editingCard = null;

    // Trạng thái Phiên bản cấu hình & Chống xung đột (Conflict Checking)
    let baseRevision = 1;
    let pendingConflictData = null;

    // Trạng thái Định danh Người dùng Cộng tác (Collaborator Profile)
    let currentProfile = {
        clientId: 'usr_' + Math.random().toString(36).substring(2, 9),
        name: 'Biên tập viên #' + Math.floor(100 + Math.random() * 900),
        color: ['#3498db', '#2ecc71', '#e74c3c', '#f1c40f', '#9b59b6', '#00d2d3', '#ff6b81', '#ff9f43'][Math.floor(Math.random() * 8)],
        device: /Mobi|Android/i.test(navigator.userAgent) ? 'Điện thoại' : (/iPad|Tablet/i.test(navigator.userAgent) ? 'Tablet' : 'Máy tính')
    };

    let collaborators = [];
    let tunnelInfo = null;
    let shareActiveTab = 'wifi'; // 'wifi' hoặc 'tunnel'
    let activeWs = null;
    let currentLocation = { type: 'viewing', label: 'Xem trang tổng quan' };

    // Bảng theo dõi các ô đang được gõ trực tiếp (Live Field Typing Map)
    // Key: `${targetType}_${targetId}_${fieldId}` -> msg
    const peerFieldEdits = new Map();

    // Ánh xạ tên gọi tiếng Việt thân thiện cho từng ô input
    const FIELD_LABELS = {
        'qInputText': 'Đề bài câu hỏi',
        'qInputOpt0': 'Đáp án A',
        'qInputOpt1': 'Đáp án B',
        'qInputOpt2': 'Đáp án C',
        'qInputOpt3': 'Đáp án D',
        'optCorrect': 'Đáp án đúng (A/B/C/D)',
        'qInputRoses': 'Số hoa hồng thưởng',
        'qInputExplanation': 'Bí kíp bảo mật',
        'qSelectStage': 'Vòng chơi chứa câu hỏi',
        'secInputName': 'Tên vòng chơi',
        'secInputBossName': 'Tên quái vật/Boss',
        'secSelectIcon': 'Biểu tượng vòng',
        'secSelectWeather': 'Thời tiết vòng',
        'secInputQPerRound': 'Số câu mỗi lượt',
        'secInputPassThreshold': 'Số câu đúng cần để pass',
        'secInputDesc': 'Mô tả bối cảnh vòng',
        'secInputSubDesc': 'Lời dẫn hướng dẫn',
        'cardInputTitle': 'Tên thẻ bài',
        'cardSelectType': 'Loại thẻ bài',
        'cardInputRoses': 'Hoa hồng thẻ bài',
        'cardInputDesc': 'Mô tả thẻ bài',
        'chkShuffleQuestions': 'Xáo trộn câu hỏi',
        'chkShuffleOptions': 'Xáo trộn đáp án',
        'chkAllowSkipStory': 'Cho phép bỏ qua cốt truyện',
        'inputBossHP': 'Máu Boss (HP)',
        'inputRequiredRoses': 'Hoa hồng đánh Boss',
        'inputBossSpeed': 'Tốc độ Boss'
    };

    let fieldEditThrottleTimer = null;
    let lastFieldEditSentTime = 0;

    function escapeHtml(str) {
        if (!str) return '';
        return String(str)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#039;');
    }

    function playSyncChime() {
        try {
            const AudioCtx = window.AudioContext || window.webkitAudioContext;
            if (!AudioCtx) return;
            const ctx = new AudioCtx();
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.connect(gain);
            gain.connect(ctx.destination);
            osc.type = "sine";
            osc.frequency.setValueAtTime(587.33, ctx.currentTime); // D5
            osc.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.12); // A5
            gain.gain.setValueAtTime(0.06, ctx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.25);
            osc.start(ctx.currentTime);
            osc.stop(ctx.currentTime + 0.25);
        } catch (e) {}
    }

    // DOM Elements & Multiplayer Live Cursors
    const tabContentContainer = document.getElementById("tabContentContainer");
    const peerCursorsLayer = document.getElementById("peerCursorsLayer");
    const peerCursorsMap = new Map(); // clientId -> { el, idleTimer, tab }
    let cursorThrottleTimer = null;
    let lastCursorSentTime = 0;

    const syncStatusEl = document.getElementById("syncStatus");
    const btnSaveConfig = document.getElementById("btnSaveConfig");
    const btnShareLive = document.getElementById("btnShareLive");
    const btnExportJson = document.getElementById("btnExportJson");
    const fileInputJson = document.getElementById("fileInputJson");
    const btnResetConfig = document.getElementById("btnResetConfig");

    const badgeSectionsCount = document.getElementById("badgeSectionsCount");
    const badgeQuestionsCount = document.getElementById("badgeQuestionsCount");
    const sectionsListEl = document.getElementById("sectionsList");
    const selectStageFilter = document.getElementById("selectStageFilter");
    const questionsListEl = document.getElementById("questionsList");
    const qCountText = document.getElementById("qCountText");

    const chkShuffleQuestions = document.getElementById("chkShuffleQuestions");
    const chkShuffleOptions = document.getElementById("chkShuffleOptions");
    const chkAllowSkipStory = document.getElementById("chkAllowSkipStory");
    const inputBossHP = document.getElementById("inputBossHP");
    const inputRequiredRoses = document.getElementById("inputRequiredRoses");
    const inputBossSpeed = document.getElementById("inputBossSpeed");
    const cardsListEl = document.getElementById("cardsList");

    const rawJsonEditor = document.getElementById("rawJsonEditor");
    const btnFormatJson = document.getElementById("btnFormatJson");
    const btnApplyRawJson = document.getElementById("btnApplyRawJson");

    // Modals
    const modalSection = document.getElementById("modalSection");
    const modalQuestion = document.getElementById("modalQuestion");
    const modalCard = document.getElementById("modalCard");
    const modalShareLive = document.getElementById("modalShareLive");
    const modalConflict = document.getElementById("modalConflict");
    const modalProfile = document.getElementById("modalProfile");

    // Collaborators & Dropdown Elements
    const collabWrapper = document.querySelector(".collab-wrapper");
    const collaboratorsBadge = document.getElementById("collaboratorsBadge");
    const collaboratorsDropdown = document.getElementById("collaboratorsDropdown");
    const btnOpenProfileModal = document.getElementById("btnOpenProfileModal");
    const inputProfileName = document.getElementById("inputProfileName");
    const btnSaveProfile = document.getElementById("btnSaveProfile");

    // Share Modal Elements
    const tabBtnShareWifi = document.getElementById("tabBtnShareWifi");
    const tabBtnShareTunnel = document.getElementById("tabBtnShareTunnel");
    const btnCopyShareUrl = document.getElementById("btnCopyShareUrl");

    // Conflict Modal Elements
    const btnConflictForceOverwrite = document.getElementById("btnConflictForceOverwrite");
    const btnConflictLoadServer = document.getElementById("btnConflictLoadServer");
    const btnConflictBackupJson = document.getElementById("btnConflictBackupJson");

    // Toast
    const toastEl = document.getElementById("toastNotification");
    let toastTimer = null;

    function showToast(message, isError = false, duration = 3200) {
        toastEl.textContent = message;
        toastEl.className = "toast show" + (isError ? " error" : "");
        clearTimeout(toastTimer);
        toastTimer = setTimeout(() => {
            toastEl.className = "toast";
        }, duration);
    }

    // ==========================================
    // 0. QUẢN LÝ THÔNG TIN CỘNG TÁC (PROFILE)
    // ==========================================
    function loadProfile() {
        try {
            const saved = localStorage.getItem('cybersec_helper_profile');
            if (saved) {
                const parsed = JSON.parse(saved);
                if (parsed.name) currentProfile.name = parsed.name;
                if (parsed.color) currentProfile.color = parsed.color;
                if (parsed.clientId) currentProfile.clientId = parsed.clientId;
            } else {
                localStorage.setItem('cybersec_helper_profile', JSON.stringify(currentProfile));
            }
        } catch (e) {}
    }

    function saveProfile(name, color) {
        currentProfile.name = name.trim() || currentProfile.name;
        currentProfile.color = color || currentProfile.color;
        try {
            localStorage.setItem('cybersec_helper_profile', JSON.stringify(currentProfile));
        } catch (e) {}

        sendWs({
            type: 'HELPER_PROFILE',
            name: currentProfile.name,
            color: currentProfile.color
        });
        renderCollaboratorsUI();
        showToast("✅ Đã cập nhật thông tin hiển thị của bạn!");
    }

    function sendWs(data) {
        if (activeWs && activeWs.readyState === WebSocket.OPEN) {
            activeWs.send(JSON.stringify(data));
        }
    }

    function updateLocation(loc) {
        currentLocation = loc;
        sendWs({
            type: 'HELPER_LOCATION',
            location: loc,
            name: currentProfile.name
        });
        renderCollaboratorsUI();
    }

    // ==========================================
    // 1. TẢI CẤU HÌNH TỪ SERVER
    // ==========================================
    async function loadConfigFromServer() {
        try {
            const res = await fetch("/api/config");
            if (!res.ok) throw new Error("Không thể kết nối đến máy chủ");
            const data = await res.json();
            currentConfig = data;
            if (typeof data._revision !== 'undefined') {
                baseRevision = data._revision;
            }
            renderAll();
            showToast(`✅ Đã nạp cấu hình từ Server thành công! (Bản #${baseRevision})`);
        } catch (e) {
            console.warn("Lỗi tải config từ server:", e.message);
            showToast("⚠️ Không tải được từ server, đang dùng cấu hình cục bộ!", true);
            renderAll();
        }
    }

    // ==========================================
    // 2. LƯU CẤU HÌNH LÊN SERVER (CÓ CHECK CONFLICT & TỰ ĐỘNG PHÁT CHO TẤT CẢ MỌI NGƯỜI)
    // ==========================================
    async function saveConfigToServer(force = false, summary = 'Cấu hình game', targetId = null) {
        // Thu thập cài đặt chung
        syncFormToState();

        try {
            const res = await fetch("/api/config", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    config: currentConfig,
                    baseRevision: baseRevision,
                    editorName: currentProfile.name,
                    force: force,
                    savedSummary: summary,
                    savedTargetId: targetId
                }, null, 2)
            });

            const result = await res.json();

            // PHÁT HIỆN XUNG ĐỘT (409 CONFLICT)
            if (res.status === 409 && result.conflict) {
                openConflictModal(result);
                return false;
            }

            if (!res.ok) throw new Error(result.error || "Lỗi lưu cấu hình");

            baseRevision = result.revision || (baseRevision + 1);
            if (modalConflict.classList.contains("active")) {
                modalConflict.classList.remove("active");
            }
            showToast(`💾 Đã lưu ${summary} & áp dụng ngay cho tất cả mọi người! (Bản #${baseRevision})`);
            return true;
        } catch (e) {
            console.error("Lỗi lưu cấu hình:", e);
            showToast("❌ Lỗi khi lưu cấu hình: " + e.message, true);
            return false;
        }
    }

    // Mở hộp thoại giải quyết xung đột khi phát hiện máy khác lưu trước
    function openConflictModal(conflictData) {
        pendingConflictData = conflictData;
        const descText = document.getElementById("conflictDescText");
        const myStats = document.getElementById("conflictMyStats");
        const serverStats = document.getElementById("conflictServerStats");

        const timeStr = conflictData.lastSavedAt ? new Date(conflictData.lastSavedAt).toLocaleTimeString('vi-VN') : 'vài phút trước';
        descText.innerHTML = `Đồng nghiệp <strong>${conflictData.lastSavedBy || 'Một máy khác'}</strong> vừa lưu phiên bản mới <strong>#${conflictData.serverRevision}</strong> lúc <strong>${timeStr}</strong> trong khi bạn đang soạn thảo! Nếu bạn lưu ngay bây giờ, nội dung của đồng nghiệp sẽ bị ghi đè.`;

        const myTotalSec = currentConfig.sections ? currentConfig.sections.length : 0;
        const myTotalQ = (currentConfig.sections || []).reduce((acc, s) => acc + (s.questions ? s.questions.length : 0), 0);

        const srvTotalSec = (conflictData.serverConfig && conflictData.serverConfig.sections) ? conflictData.serverConfig.sections.length : 0;
        const srvTotalQ = (conflictData.serverConfig && conflictData.serverConfig.sections)
            ? conflictData.serverConfig.sections.reduce((acc, s) => acc + (s.questions ? s.questions.length : 0), 0)
            : 0;

        myStats.innerHTML = `
            <div>• Số vòng chơi: <strong>${myTotalSec}</strong></div>
            <div>• Số câu hỏi: <strong>${myTotalQ} câu</strong></div>
            <div>• Phiên bản gốc của bạn: <strong>#${conflictData.clientRevision || baseRevision}</strong></div>
            <div style="color:#00d2d3; margin-top:4px;">(Bản nháp đang mở trên máy bạn)</div>
        `;

        serverStats.innerHTML = `
            <div>• Số vòng chơi: <strong>${srvTotalSec}</strong></div>
            <div>• Số câu hỏi: <strong>${srvTotalQ} câu</strong></div>
            <div>• Phiên bản mới trên máy chủ: <strong>#${conflictData.serverRevision}</strong></div>
            <div style="color:#2ecc71; margin-top:4px;">Người lưu: <strong>${conflictData.lastSavedBy}</strong></div>
        `;

        modalConflict.classList.add("active");
    }

    // ==========================================
    // 3. KHÔI PHỤC MẶC ĐỊNH
    // ==========================================
    async function resetConfigDefault() {
        if (!confirm("Bạn có chắc chắn muốn khôi phục toàn bộ cấu hình và câu hỏi về mặc định ban đầu?")) return;

        try {
            const res = await fetch("/api/config/reset", { method: "POST" });
            const result = await res.json();
            if (!res.ok) throw new Error(result.error || "Lỗi khôi phục mặc định");

            currentConfig = result.config;
            renderAll();
            showToast("🔄 Đã khôi phục bộ câu hỏi và cấu hình mặc định!");
        } catch (e) {
            showToast("❌ Lỗi: " + e.message, true);
        }
    }

    // ==========================================
    // 4. XUẤT (EXPORT) & NẠP (IMPORT) FILE JSON
    // ==========================================
    function exportJsonFile() {
        syncFormToState();
        const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(currentConfig, null, 2));
        const downloadAnchor = document.createElement("a");
        downloadAnchor.setAttribute("href", dataStr);
        downloadAnchor.setAttribute("download", `game_config_${Date.now()}.json`);
        document.body.appendChild(downloadAnchor);
        downloadAnchor.click();
        downloadAnchor.remove();
        showToast("📥 Đã tải file cấu hình JSON về máy!");
    }

    function handleFileImport(e) {
        const file = e.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = function (event) {
            try {
                const imported = JSON.parse(event.target.result);
                if (!imported.sections || !Array.isArray(imported.sections)) {
                    throw new Error("File JSON không đúng cấu trúc (thiếu danh sách sections)!");
                }
                currentConfig = imported;
                renderAll();
                showToast("📤 Đã nạp thành công file JSON! Nhấn 'LƯU VÀO GAME' để áp dụng.");
            } catch (err) {
                alert("Lỗi đọc file JSON: " + err.message);
            }
        };
        reader.readAsText(file);
        e.target.value = ""; // Reset file input
    }

    // ==========================================
    // 5. RENDER GIAO DIỆN CHÍNH
    // ==========================================
    function renderAll() {
        renderSectionsTab();
        renderQuestionsFilter();
        renderQuestionsList();
        renderRandomSettings();
        renderCardsTable();
        renderRawJsonView();
        updateBadges();
        highlightPeerEditingCards();
    }

    function updateBadges() {
        const totalSec = currentConfig.sections ? currentConfig.sections.length : 0;
        let totalQ = 0;
        if (currentConfig.sections) {
            currentConfig.sections.forEach(s => {
                totalQ += (s.questions ? s.questions.length : 0);
            });
        }
        badgeSectionsCount.textContent = totalSec;
        badgeQuestionsCount.textContent = totalQ;
    }

    // Render Tab 1: Sections
    function renderSectionsTab() {
        sectionsListEl.innerHTML = "";

        if (!currentConfig.sections || currentConfig.sections.length === 0) {
            sectionsListEl.innerHTML = `<p class="empty-state">Chưa có vòng chơi nào. Bấm "Thêm Vòng Mới" để tạo.</p>`;
            return;
        }

        const iconMap = {
            tree: "🌲", wave: "🌊", cloud: "☁️", shield: "🛡️", sword: "⚔️", star: "⭐", dice: "🎲", dragon: "🐉", lightbulb: "💡"
        };

        currentConfig.sections.forEach(sec => {
            const card = document.createElement("div");
            card.className = "section-card";
            card.setAttribute("data-secid", sec.id);
            const qCount = sec.questions ? sec.questions.length : 0;
            const iconEmoji = iconMap[sec.icon] || "🛡️";

            card.innerHTML = `
                <div class="collab-lock-slot"></div>
                <div>
                    <div class="section-card-header">
                        <div class="section-badge-group">
                            <span class="section-icon-badge">${iconEmoji}</span>
                            <span class="section-name">${sec.name}</span>
                        </div>
                        <span class="section-weather-pill weather-${sec.themeWeather || 'SUNNY'}">
                            ${sec.themeWeather === 'SUNNY' ? '☀️ Nắng' : (sec.themeWeather === 'RAIN' ? '🌧️ Mưa' : '❄️ Tuyết')}
                        </span>
                    </div>

                    <p class="section-desc">${sec.description || 'Chưa có mô tả'}</p>

                    <div class="section-meta-row">
                        <div class="section-meta-item">Số câu/lượt: <strong>${sec.questionsPerRound || 3}</strong></div>
                        <div class="section-meta-item">Cần đúng để pass: <strong>${sec.passThreshold || 3}</strong></div>
                        <div class="section-meta-item">Ngân hàng: <strong>${qCount} câu</strong></div>
                    </div>
                </div>

                <div class="section-card-footer">
                    <button class="btn-icon" onclick="window.HelperApp.openEditSection(${sec.id})">✏️ Sửa Vòng</button>
                    <button class="btn-icon" onclick="window.HelperApp.switchToQuestions(${sec.id})">❓ Xem Câu Hỏi</button>
                    <button class="btn-icon btn-danger" onclick="window.HelperApp.deleteSection(${sec.id})">🗑️ Xóa</button>
                </div>
            `;
            sectionsListEl.appendChild(card);
        });
    }

    // Render Tab 2: Filter dropdown
    function renderQuestionsFilter() {
        selectStageFilter.innerHTML = "";
        if (!currentConfig.sections) return;

        currentConfig.sections.forEach(sec => {
            const opt = document.createElement("option");
            opt.value = sec.id;
            opt.textContent = `${sec.name} (${sec.questions ? sec.questions.length : 0} câu)`;
            if (sec.id === selectedStageId) opt.selected = true;
            selectStageFilter.appendChild(opt);
        });
    }

    // Render Tab 2: Questions List
    function renderQuestionsList() {
        questionsListEl.innerHTML = "";
        const sec = (currentConfig.sections || []).find(s => s.id === selectedStageId);

        if (!sec || !sec.questions || sec.questions.length === 0) {
            questionsListEl.innerHTML = `
                <div style="text-align: center; padding: 40px; color: #94a3b8;">
                    <p style="font-size: 16px;">Vòng này hiện chưa có câu hỏi nào trong ngân hàng.</p>
                    <button class="btn-create" style="margin-top: 15px;" onclick="window.HelperApp.openCreateQuestion()">
                        ➕ Thêm Câu Hỏi Đầu Tiên
                    </button>
                </div>
            `;
            qCountText.textContent = "0 câu hỏi";
            return;
        }

        qCountText.textContent = `${sec.questions.length} câu hỏi`;

        sec.questions.forEach((q, idx) => {
            const card = document.createElement("div");
            card.className = "question-card";
            card.id = `qcard_${q.id}`;
            card.setAttribute("data-qid", q.id);

            const optKeys = ["A", "B", "C", "D"];
            const optsHtml = (q.options || []).map((opt, oIdx) => {
                const isCorrect = (oIdx === q.correctIndex);
                const optClean = (opt || "").replace(/^[A-D]\.\s*/, "");
                return `
                    <div class="opt-preview-item ${isCorrect ? 'correct' : ''}" data-opt-idx="${oIdx}">
                        <span class="opt-key opt-key-${optKeys[oIdx]}">${optKeys[oIdx]}</span>
                        <span style="flex:1;">${escapeHtml(optClean)}</span>
                        ${isCorrect ? '<span style="font-size:11px; color:#2ecc71;">[ĐÚNG]</span>' : ''}
                    </div>
                `;
            }).join("");

            const roses = (typeof q.rosesReward === "number") ? q.rosesReward : 1;

            card.innerHTML = `
                <div class="collab-lock-slot"></div>
                <div class="card-live-banner-slot" id="qcard_banner_${q.id}"></div>
                <div class="question-header">
                    <div style="display:flex; align-items:flex-start; flex:1;">
                        <span class="question-id-badge">#${idx + 1} (${q.id || 'q'})</span>
                        <div class="question-title" id="qcard_title_${q.id}">${escapeHtml(q.question)}</div>
                    </div>
                    <div class="rose-reward-badge" title="Số hoa hồng thưởng khi trả lời đúng">
                        <span>🌹</span>
                        <span>+${roses} Hoa Hồng</span>
                    </div>
                </div>

                <div class="options-preview-grid">
                    ${optsHtml}
                </div>

                <div class="question-explanation">
                    <strong>Bí Kíp Bảo Mật:</strong> ${escapeHtml(q.explanation || 'Chưa có giải thích')}
                </div>

                <div class="card-actions">
                    <button class="btn-icon" onclick="window.HelperApp.openEditQuestion('${q.id}')">✏️ Sửa</button>
                    <button class="btn-icon" onclick="window.HelperApp.duplicateQuestion('${q.id}')">📋 Nhân Bản</button>
                    <button class="btn-icon btn-danger" onclick="window.HelperApp.deleteQuestion('${q.id}')">🗑️ Xóa</button>
                </div>
            `;
            questionsListEl.appendChild(card);
        });
        highlightPeerEditingCards();
    }

    // Render Tab 3: Settings & Cards
    function renderRandomSettings() {
        const s = currentConfig.settings || {};
        chkShuffleQuestions.checked = !!s.shuffleQuestions;
        chkShuffleOptions.checked = !!s.shuffleOptions;
        chkAllowSkipStory.checked = (s.allowSkipStory !== false);

        inputBossHP.value = s.bossHP || 9;
        inputRequiredRoses.value = s.requiredRosesForBoss || 9;
        inputBossSpeed.value = s.bossSpeedMs || 1400;
    }

    function renderCardsTable() {
        cardsListEl.innerHTML = "";
        const cards = currentConfig.magicCards || [];

        if (cards.length === 0) {
            cardsListEl.innerHTML = `<p style="padding:15px; color:#94a3b8;">Chưa có thẻ bài ma thuật nào.</p>`;
            return;
        }

        let html = `
            <table class="cards-table">
                <thead>
                    <tr>
                        <th>Mã Thẻ</th>
                        <th>Tên Thẻ Bài</th>
                        <th>Loại Thẻ</th>
                        <th>Hiệu Ứng Hoa</th>
                        <th>Mô Tả Chi Tiết</th>
                        <th style="text-align:right;">Thao Tác</th>
                    </tr>
                </thead>
                <tbody>
        `;

        cards.forEach(card => {
            const isBonus = card.type === "bonus";
            const rosesText = card.roses > 0 ? `+${card.roses} 🌹` : `${card.roses} 🥀`;
            const colorClass = isBonus ? "#2ecc71" : "#e74c3c";

            html += `
                <tr>
                    <td><code>${card.id}</code></td>
                    <td><strong>${card.title}</strong></td>
                    <td><span style="color:${colorClass}; font-weight:bold;">${isBonus ? 'Thưởng (Bonus)' : 'Phạt (Penalty)'}</span></td>
                    <td><strong style="color:${colorClass}; font-size:14px;">${rosesText}</strong></td>
                    <td style="color:#cbd5e1;">${card.description}</td>
                    <td style="text-align:right;">
                        <button class="btn-icon" onclick="window.HelperApp.openEditCard('${card.id}')">✏️ Sửa</button>
                        <button class="btn-icon btn-danger" onclick="window.HelperApp.deleteCard('${card.id}')">🗑️</button>
                    </td>
                </tr>
            `;
        });

        html += `</tbody></table>`;
        cardsListEl.innerHTML = html;
    }

    // Render Tab 4: Raw JSON
    function renderRawJsonView() {
        syncFormToState();
        rawJsonEditor.value = JSON.stringify(currentConfig, null, 2);
    }

    // Đồng bộ Form Settings vào object state
    function syncFormToState() {
        if (!currentConfig.settings) currentConfig.settings = {};
        currentConfig.settings.shuffleQuestions = chkShuffleQuestions.checked;
        currentConfig.settings.shuffleOptions = chkShuffleOptions.checked;
        currentConfig.settings.allowSkipStory = chkAllowSkipStory.checked;
        currentConfig.settings.bossHP = parseInt(inputBossHP.value) || 9;
        currentConfig.settings.requiredRosesForBoss = parseInt(inputRequiredRoses.value) || 9;
        currentConfig.settings.bossSpeedMs = parseInt(inputBossSpeed.value) || 1400;
    }

    // ==========================================
    // 6. THAO TÁC VỚI SECTION (VÒNG CHƠI)
    // ==========================================
    function openCreateSection() {
        editingSection = null;
        document.getElementById("modalSectionTitle").textContent = "THÊM VÒNG CHƠI MỚI";
        const nextId = (currentConfig.sections || []).length > 0 ?
            Math.max(...currentConfig.sections.map(s => s.id)) + 1 : 1;

        document.getElementById("secInputId").value = nextId;
        document.getElementById("secInputName").value = `VÒNG ${nextId}: THẾ GIỚI MỚI`;
        document.getElementById("secSelectIcon").value = "shield";
        document.getElementById("secSelectWeather").value = "SUNNY";
        document.getElementById("secInputQPerRound").value = 3;
        document.getElementById("secInputPassThreshold").value = 3;
        document.getElementById("secInputDesc").value = "Mô tả bối cảnh thế giới an ninh mạng...";
        document.getElementById("secInputSubDesc").value = "Hãy trả lời đúng để bảo vệ thế giới và tích lũy hoa hồng!";

        updateLocation({
            type: 'section',
            sectionId: 'new',
            label: 'Tạo vòng chơi mới'
        });

        modalSection.classList.add("active");
    }

    function openEditSection(id) {
        const sec = (currentConfig.sections || []).find(s => s.id === id);
        if (!sec) return;
        editingSection = sec;

        updateLocation({
            type: 'section',
            sectionId: sec.id,
            label: `Sửa Vòng: ${sec.name}`
        });

        document.getElementById("modalSectionTitle").textContent = `CHỈNH SỬA ${sec.name}`;
        document.getElementById("secInputId").value = sec.id;
        document.getElementById("secInputName").value = sec.name;
        document.getElementById("secSelectIcon").value = sec.icon || "tree";
        document.getElementById("secSelectWeather").value = sec.themeWeather || "SUNNY";
        document.getElementById("secInputQPerRound").value = sec.questionsPerRound || 3;
        document.getElementById("secInputPassThreshold").value = sec.passThreshold || 3;
        document.getElementById("secInputDesc").value = sec.description || "";
        document.getElementById("secInputSubDesc").value = sec.subDescription || "";

        modalSection.classList.add("active");
    }

    function saveSectionFromModal() {
        const name = document.getElementById("secInputName").value.trim();
        if (!name) {
            alert("Vui lòng nhập tên vòng chơi!");
            return;
        }

        const id = parseInt(document.getElementById("secInputId").value);
        const icon = document.getElementById("secSelectIcon").value;
        const themeWeather = document.getElementById("secSelectWeather").value;
        const qPerRound = parseInt(document.getElementById("secInputQPerRound").value) || 3;
        const passThreshold = parseInt(document.getElementById("secInputPassThreshold").value) || 3;
        const desc = document.getElementById("secInputDesc").value.trim();
        const subDesc = document.getElementById("secInputSubDesc").value.trim();

        if (editingSection) {
            // Cập nhật
            editingSection.name = name;
            editingSection.icon = icon;
            editingSection.themeWeather = themeWeather;
            editingSection.questionsPerRound = qPerRound;
            editingSection.passThreshold = passThreshold;
            editingSection.description = desc;
            editingSection.subDescription = subDesc;
        } else {
            // Thêm mới
            if (!currentConfig.sections) currentConfig.sections = [];
            currentConfig.sections.push({
                id: id,
                name: name,
                icon: icon,
                themeWeather: themeWeather,
                description: desc,
                subDescription: subDesc,
                questionsPerRound: qPerRound,
                passThreshold: passThreshold,
                questions: []
            });
        }

        modalSection.classList.remove("active");
        updateLocation({
            type: 'tab',
            tab: 'tab-sections',
            label: 'Xem danh sách Vòng chơi'
        });
        renderAll();
        // Tự động lưu lên server và phát cập nhật cho tất cả mọi người
        saveConfigToServer(false, `vòng chơi "${name}"`, editingSection ? editingSection.id : null);
    }

    function deleteSection(id) {
        const sec = (currentConfig.sections || []).find(s => s.id === id);
        if (!sec) return;
        const qCount = sec.questions ? sec.questions.length : 0;
        if (!confirm(`Bạn có chắc muốn xóa '${sec.name}' cùng ${qCount} câu hỏi của vòng này?`)) return;

        currentConfig.sections = currentConfig.sections.filter(s => s.id !== id);
        if (selectedStageId === id && currentConfig.sections.length > 0) {
            selectedStageId = currentConfig.sections[0].id;
        }

        renderAll();
        // Tự động lưu lên server và phát cập nhật cho tất cả mọi người
        saveConfigToServer(false, `xóa vòng chơi #${id}`);
    }

    function switchToQuestions(stageId) {
        selectedStageId = stageId;
        // Chuyển tab sang tab-questions
        document.querySelectorAll(".nav-tab").forEach(t => t.classList.remove("active"));
        document.querySelectorAll(".tab-pane").forEach(p => p.classList.remove("active"));

        document.querySelector('[data-tab="tab-questions"]').classList.add("active");
        document.getElementById("tab-questions").classList.add("active");

        renderQuestionsFilter();
        renderQuestionsList();
    }

    // ==========================================
    // 7. THAO TÁC VỚI CÂU HỎI & HOA HỒNG TỪNG CÂU
    // ==========================================
    function openCreateQuestion() {
        editingQuestion = null;
        document.getElementById("modalQuestionTitle").textContent = "THÊM CÂU HỎI MỚI";

        const warnBanner = document.getElementById("modalQuestionConflictWarning");
        if (warnBanner) warnBanner.style.display = "none";

        updateLocation({
            type: 'question',
            sectionId: selectedStageId,
            questionId: 'new',
            label: `Tạo câu hỏi mới cho Vòng ${selectedStageId}`
        });

        // Điền dropdown vòng
        const stageSelect = document.getElementById("qSelectStage");
        stageSelect.innerHTML = "";
        (currentConfig.sections || []).forEach(s => {
            const opt = document.createElement("option");
            opt.value = s.id;
            opt.textContent = s.name;
            if (s.id === selectedStageId) opt.selected = true;
            stageSelect.appendChild(opt);
        });

        document.getElementById("qInputText").value = "";
        document.getElementById("qInputOpt0").value = "";
        document.getElementById("qInputOpt1").value = "";
        document.getElementById("qInputOpt2").value = "";
        document.getElementById("qInputOpt3").value = "";
        document.querySelector('input[name="optCorrect"][value="0"]').checked = true;
        document.getElementById("qInputRoses").value = 1; // Mặc định 1 hoa hồng
        document.getElementById("qInputExplanation").value = "";

        modalQuestion.classList.add("active");
    }

    function populateQuestionModal(found, foundStageId) {
        if (!found) return;

        if (foundStageId) {
            const stageSelect = document.getElementById("qSelectStage");
            stageSelect.innerHTML = "";
            (currentConfig.sections || []).forEach(s => {
                const opt = document.createElement("option");
                opt.value = s.id;
                opt.textContent = s.name;
                if (s.id === foundStageId) opt.selected = true;
                stageSelect.appendChild(opt);
            });
        }

        const activeEl = document.activeElement;

        if (activeEl !== document.getElementById("qInputText")) {
            document.getElementById("qInputText").value = found.question || "";
        }

        const opts = found.options || ["", "", "", ""];
        if (activeEl !== document.getElementById("qInputOpt0")) {
            document.getElementById("qInputOpt0").value = (opts[0] || "").replace(/^[A-D]\.\s*/, "");
        }
        if (activeEl !== document.getElementById("qInputOpt1")) {
            document.getElementById("qInputOpt1").value = (opts[1] || "").replace(/^[A-D]\.\s*/, "");
        }
        if (activeEl !== document.getElementById("qInputOpt2")) {
            document.getElementById("qInputOpt2").value = (opts[2] || "").replace(/^[A-D]\.\s*/, "");
        }
        if (activeEl !== document.getElementById("qInputOpt3")) {
            document.getElementById("qInputOpt3").value = (opts[3] || "").replace(/^[A-D]\.\s*/, "");
        }

        const correct = found.correctIndex || 0;
        const radio = document.querySelector(`input[name="optCorrect"][value="${correct}"]`);
        if (radio) radio.checked = true;

        if (activeEl !== document.getElementById("qInputRoses")) {
            document.getElementById("qInputRoses").value = (typeof found.rosesReward === "number") ? found.rosesReward : 1;
        }

        if (activeEl !== document.getElementById("qInputExplanation")) {
            document.getElementById("qInputExplanation").value = found.explanation || "";
        }
    }

    function openEditQuestion(qId) {
        let found = null;
        let foundStageId = null;

        (currentConfig.sections || []).forEach(s => {
            (s.questions || []).forEach(q => {
                if (q.id === qId) {
                    found = q;
                    foundStageId = s.id;
                }
            });
        });

        if (!found) return;
        editingQuestion = found;
        document.getElementById("modalQuestionTitle").textContent = `CHỈNH SỬA CÂU HỎI (${found.id})`;

        // Kiểm tra xem có máy nào khác cũng đang mở câu này không
        const peer = collaborators.find(c => c.clientId !== currentProfile.clientId && c.location && c.location.type === 'question' && String(c.location.questionId) === String(qId));
        const warnBanner = document.getElementById("modalQuestionConflictWarning");
        if (warnBanner) {
            if (peer) {
                warnBanner.style.display = "flex";
                warnBanner.innerHTML = `⚠️ Chú ý: Đồng nghiệp <strong>${peer.name}</strong> (${peer.device}) cũng đang mở câu hỏi này! Hãy cẩn thận tránh xung đột ghi đè.`;
            } else {
                warnBanner.style.display = "none";
            }
        }

        updateLocation({
            type: 'question',
            sectionId: foundStageId,
            questionId: qId,
            label: `Sửa câu: ${(found.question || '').substring(0, 32)}...`
        });

        populateQuestionModal(found, foundStageId);
        modalQuestion.classList.add("active");
    }

    function saveQuestionFromModal() {
        const qText = document.getElementById("qInputText").value.trim();
        if (!qText) {
            alert("Vui lòng nhập đề bài câu hỏi!");
            return;
        }

        const opt0 = document.getElementById("qInputOpt0").value.trim();
        const opt1 = document.getElementById("qInputOpt1").value.trim();
        const opt2 = document.getElementById("qInputOpt2").value.trim();
        const opt3 = document.getElementById("qInputOpt3").value.trim();

        if (!opt0 || !opt1 || !opt2 || !opt3) {
            alert("Vui lòng nhập đầy đủ cả 4 lựa chọn đáp án A, B, C, D!");
            return;
        }

        const checkedRadio = document.querySelector('input[name="optCorrect"]:checked');
        const correctIndex = checkedRadio ? parseInt(checkedRadio.value) : 0;
        const rosesReward = parseInt(document.getElementById("qInputRoses").value) || 1;
        const explanation = document.getElementById("qInputExplanation").value.trim();
        const targetStageId = parseInt(document.getElementById("qSelectStage").value);

        const options = [opt0, opt1, opt2, opt3];

        if (editingQuestion) {
            // Cập nhật câu hỏi hiện tại
            editingQuestion.question = qText;
            editingQuestion.options = options;
            editingQuestion.correctIndex = correctIndex;
            editingQuestion.rosesReward = rosesReward;
            editingQuestion.explanation = explanation;

            // Nếu người dùng đổi Vòng chứa câu hỏi:
            const oldSec = (currentConfig.sections || []).find(s => (s.questions || []).some(q => q.id === editingQuestion.id));
            if (oldSec && oldSec.id !== targetStageId) {
                oldSec.questions = oldSec.questions.filter(q => q.id !== editingQuestion.id);
                const newSec = (currentConfig.sections || []).find(s => s.id === targetStageId);
                if (newSec) {
                    if (!newSec.questions) newSec.questions = [];
                    newSec.questions.push(editingQuestion);
                }
            }
        } else {
            // Tạo câu hỏi mới
            const targetSec = (currentConfig.sections || []).find(s => s.id === targetStageId);
            if (!targetSec) {
                alert("Vòng chơi không tồn tại!");
                return;
            }
            if (!targetSec.questions) targetSec.questions = [];

            const newId = `q${targetStageId}_${Date.now().toString().slice(-4)}`;
            targetSec.questions.push({
                id: newId,
                question: qText,
                options: options,
                correctIndex: correctIndex,
                rosesReward: rosesReward,
                explanation: explanation
            });
        }

        modalQuestion.classList.remove("active");
        updateLocation({
            type: 'tab',
            tab: 'tab-questions',
            label: `Xem danh sách câu hỏi Vòng ${selectedStageId}`
        });
        renderAll();

        // Tự động lưu lên server và phát ngay lập tức cho tất cả mọi người
        const shortQ = qText.substring(0, 30) + (qText.length > 30 ? '...' : '');
        saveConfigToServer(false, `câu hỏi "${shortQ}"`, editingQuestion ? editingQuestion.id : null);
    }

    function duplicateQuestion(qId) {
        const sec = (currentConfig.sections || []).find(s => (s.questions || []).some(q => q.id === qId));
        if (!sec) return;
        const orig = sec.questions.find(q => q.id === qId);
        if (!orig) return;

        const copy = JSON.parse(JSON.stringify(orig));
        copy.id = `q${sec.id}_${Date.now().toString().slice(-4)}`;
        copy.question = `${copy.question} (Bản sao)`;

        sec.questions.push(copy);
        renderAll();

        // Tự động lưu lên server và phát ngay lập tức cho tất cả mọi người
        saveConfigToServer(false, `nhân bản câu hỏi #${copy.id}`, copy.id);
    }

    function deleteQuestion(qId) {
        const sec = (currentConfig.sections || []).find(s => (s.questions || []).some(q => q.id === qId));
        if (!sec) return;
        if (!confirm(`Bạn có chắc muốn xóa câu hỏi ${qId}?`)) return;

        sec.questions = sec.questions.filter(q => q.id !== qId);
        renderAll();

        // Tự động lưu lên server và phát ngay lập tức cho tất cả mọi người
        saveConfigToServer(false, `xóa câu hỏi #${qId}`, qId);
    }

    // ==========================================
    // 8. THAO TÁC THẺ BÀI MA THUẬT
    // ==========================================
    function openCreateCard() {
        editingCard = null;
        updateLocation({
            type: 'card',
            cardId: 'new',
            label: 'Tạo thẻ bài ma thuật mới'
        });
        document.getElementById("modalCardTitle").textContent = "THÊM THẺ BÀI MA THUẬT";
        document.getElementById("cardInputTitle").value = "KHO BÁU BẢO MẬT MỚI";
        document.getElementById("cardSelectType").value = "bonus";
        document.getElementById("cardInputRoses").value = 1;
        document.getElementById("cardInputDesc").value = "Thông điệp và phần thưởng của thẻ bài...";
        modalCard.classList.add("active");
    }

    function openEditCard(cId) {
        const card = (currentConfig.magicCards || []).find(c => c.id === cId);
        if (!card) return;
        editingCard = card;
        updateLocation({
            type: 'card',
            cardId: cId,
            label: `Sửa Thẻ: ${card.title}`
        });
        document.getElementById("modalCardTitle").textContent = `CHỈNH SỬA THẺ ${card.title}`;
        document.getElementById("cardInputTitle").value = card.title || "";
        document.getElementById("cardSelectType").value = card.type || "bonus";
        document.getElementById("cardInputRoses").value = card.roses || 1;
        document.getElementById("cardInputDesc").value = card.description || "";
        modalCard.classList.add("active");
    }

    function saveCardFromModal() {
        const title = document.getElementById("cardInputTitle").value.trim();
        if (!title) {
            alert("Vui lòng nhập tên thẻ bài!");
            return;
        }
        const type = document.getElementById("cardSelectType").value;
        const roses = parseInt(document.getElementById("cardInputRoses").value) || 1;
        const desc = document.getElementById("cardInputDesc").value.trim();

        if (editingCard) {
            editingCard.title = title;
            editingCard.type = type;
            editingCard.roses = roses;
            editingCard.description = desc;
        } else {
            if (!currentConfig.magicCards) currentConfig.magicCards = [];
            currentConfig.magicCards.push({
                id: `c_${Date.now().toString().slice(-4)}`,
                title: title,
                type: type,
                roses: roses,
                description: desc
            });
        }

        modalCard.classList.remove("active");
        updateLocation({
            type: 'tab',
            tab: 'tab-random',
            label: 'Cài đặt Boss & Thẻ bài'
        });
        renderCardsTable();

        // Tự động lưu lên server và phát ngay lập tức cho tất cả mọi người
        saveConfigToServer(false, `thẻ bài "${title}"`, editingCard ? editingCard.id : null);
    }

    function deleteCard(cId) {
        if (!confirm(`Bạn có chắc muốn xóa thẻ bài ${cId}?`)) return;
        currentConfig.magicCards = (currentConfig.magicCards || []).filter(c => c.id !== cId);
        renderCardsTable();

        // Tự động lưu lên server và phát ngay lập tức cho tất cả mọi người
        saveConfigToServer(false, `xóa thẻ bài #${cId}`, cId);
    }

    // ==========================================
    // 9. RAW JSON VIEW & APPLY
    // ==========================================
    function formatJsonEditor() {
        try {
            const parsed = JSON.parse(rawJsonEditor.value);
            rawJsonEditor.value = JSON.stringify(parsed, null, 2);
            showToast("🧹 Đã căn chỉnh mã JSON thành công!");
        } catch (e) {
            alert("Lỗi cú pháp JSON: " + e.message);
        }
    }

    function applyRawJson() {
        try {
            const parsed = JSON.parse(rawJsonEditor.value);
            if (!parsed.sections || !Array.isArray(parsed.sections)) {
                throw new Error("Cấu hình JSON phải có thuộc tính 'sections' dạng mảng!");
            }
            currentConfig = parsed;
            renderAll();
            // Tự động lưu lên server và phát ngay lập tức cho tất cả mọi người
            saveConfigToServer(false, "áp dụng cấu hình JSON trực tiếp");
        } catch (e) {
            alert("Lỗi cú pháp JSON: " + e.message);
        }
    }

    // ==========================================
    // 10. WEBSOCKET REALTIME SYNC & CỘNG TÁC
    // ==========================================
    function initWebSocket() {
        const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
        const wsUrl = `${protocol}//${window.location.host}`;

        function connect() {
            try {
                activeWs = new WebSocket(wsUrl);

                activeWs.onopen = () => {
                    syncStatusEl.className = "status-pill status-online";
                    syncStatusEl.innerHTML = `<span class="status-dot"></span><span>Đã kết nối Server</span>`;

                    // Đăng ký thông tin cộng tác viên với Server
                    sendWs({
                        type: 'HELPER_JOIN',
                        clientId: currentProfile.clientId,
                        name: currentProfile.name,
                        color: currentProfile.color,
                        device: currentProfile.device,
                        location: currentLocation
                    });
                };

                activeWs.onmessage = (event) => {
                    try {
                        const msg = JSON.parse(event.data);

                        if (msg.type === "CONFIG_SYNC") {
                            if (msg.config) {
                                currentConfig = msg.config;
                                if (typeof msg.revision !== 'undefined') baseRevision = msg.revision;
                                renderAll();
                            }
                        } else if (msg.type === "CONFIG_UPDATED") {
                            if (msg.config) {
                                const updaterName = msg.savedBy || "Đồng nghiệp";
                                const isSelf = (updaterName === currentProfile.name);
                                const summary = msg.savedSummary || "Cấu hình game";

                                // Cập nhật cấu hình hiện tại và revision cho TẤT CẢ mọi người
                                currentConfig = msg.config;
                                if (typeof msg.revision !== 'undefined') baseRevision = msg.revision;

                                // Nếu người dùng đang mở modal câu hỏi:
                                if (modalQuestion.classList.contains("active") && editingQuestion) {
                                    let updatedQ = null;
                                    let updatedStageId = null;
                                    (currentConfig.sections || []).forEach(s => {
                                        (s.questions || []).forEach(q => {
                                            if (q.id === editingQuestion.id) {
                                                updatedQ = q;
                                                updatedStageId = s.id;
                                            }
                                        });
                                    });

                                    if (updatedQ) {
                                        if (!isSelf) {
                                            editingQuestion = updatedQ;
                                            populateQuestionModal(updatedQ, updatedStageId);
                                            showToast(`✨ Dữ liệu câu hỏi vừa được "${updaterName}" lưu bản mới (#${baseRevision})!`);
                                        }
                                    } else if (!isSelf) {
                                        showToast(`⚠️ Câu hỏi này vừa bị xóa hoặc di chuyển bởi "${updaterName}"!`, true);
                                    }
                                }

                                // Render lại toàn bộ giao diện cho người dùng
                                renderAll();

                                // Xóa các lock / thẻ live edit tạm thời của mục vừa lưu
                                if (msg.savedTargetId) {
                                    clearPeerFieldEditsForTarget(msg.savedTargetId);
                                }

                                if (!isSelf) {
                                    showToast(`🚀 "${updaterName}" vừa lưu ${summary}! (Đã đồng bộ lên máy của bạn)`, false, 4000);
                                    playSyncChime();
                                }
                            }
                        } else if (msg.type === "HELPER_FIELD_EDIT") {
                            if (msg.clientId !== currentProfile.clientId) {
                                handleIncomingFieldEdit(msg);
                            }
                        } else if (msg.type === "HELPER_FIELD_BLUR") {
                            if (msg.clientId !== currentProfile.clientId) {
                                handleIncomingFieldBlur(msg);
                            }
                        } else if (msg.type === "HELPER_CURSOR_MOVE") {
                            if (msg.clientId !== currentProfile.clientId) {
                                handleIncomingCursorMove(msg);
                            }
                        } else if (msg.type === "HELPER_CURSOR_LEAVE") {
                            if (msg.clientId !== currentProfile.clientId) {
                                handleIncomingCursorLeave(msg);
                            }
                        } else if (msg.type === "HELPER_COLLABORATORS") {
                            collaborators = msg.collaborators || [];
                            renderCollaboratorsUI();
                        } else if (msg.type === "TUNNEL_INFO") {
                            tunnelInfo = msg.info;
                            updateShareModalUI();
                        }
                    } catch (e) {}
                };

                activeWs.onclose = () => {
                    syncStatusEl.className = "status-pill";
                    syncStatusEl.style.borderColor = "#f1c40f";
                    syncStatusEl.style.color = "#f1c40f";
                    syncStatusEl.style.background = "rgba(241, 196, 15, 0.15)";
                    syncStatusEl.innerHTML = `<span class="status-dot" style="background:#f1c40f;"></span><span>Chế độ Cục bộ (Offline)</span>`;
                    setTimeout(connect, 3000);
                };

                activeWs.onerror = () => {
                    activeWs.close();
                };
            } catch (e) {}
        }

        connect();
    }

    // ==========================================
    // 10b. RENDER GIAO DIỆN CỘNG TÁC VIÊN (PRESENCE) & LIVE EDITING
    // ==========================================
    function renderCollaboratorsUI() {
        const avatarsGroup = document.getElementById("collaboratorAvatars");
        const countText = document.getElementById("collaboratorCountText");

        if (!avatarsGroup || !countText) return;

        // 1. Render nhóm avatar trên thanh Top Bar
        avatarsGroup.innerHTML = "";
        const maxAvatars = 4;
        const total = collaborators.length;

        // Đảm bảo đưa bản thân lên đầu danh sách hiển thị
        const sorted = [...collaborators].sort((a, b) => (a.clientId === currentProfile.clientId ? -1 : 1));

        sorted.slice(0, maxAvatars).forEach(c => {
            const isYou = (c.clientId === currentProfile.clientId);
            const span = document.createElement("span");
            span.className = "collab-avatar" + (isYou ? " you" : "");
            span.style.background = c.color || "#3498db";
            const initials = (c.name || "U").trim().split(/\s+/).map(w => w[0]).join("").substring(0, 2).toUpperCase();
            span.textContent = initials;
            span.title = isYou ? `Bạn: ${c.name} (${c.device})` : `${c.name} (${c.device})`;
            avatarsGroup.appendChild(span);
        });

        countText.textContent = total > 1 ? `${total} máy` : `1 máy (bạn)`;

        // 2. Render dropdown danh sách chi tiết các máy
        renderCollaboratorsDropdownOnly();

        // 3. Highlight các card mà máy khác đang sửa
        highlightPeerEditingCards();
    }

    function renderCollaboratorsDropdownOnly() {
        const listEl = document.getElementById("collaboratorsList");
        if (!listEl) return;
        listEl.innerHTML = "";

        const sorted = [...collaborators].sort((a, b) => (a.clientId === currentProfile.clientId ? -1 : 1));

        sorted.forEach(c => {
            const isYou = (c.clientId === currentProfile.clientId);
            const initials = (c.name || "U").trim().split(/\s+/).map(w => w[0]).join("").substring(0, 2).toUpperCase();
            const item = document.createElement("div");
            item.className = "collab-item";
            item.innerHTML = `
                <div class="collab-item-avatar" style="background:${c.color || '#3498db'};">${initials}</div>
                <div class="collab-item-details">
                    <div class="collab-item-name">
                        <span>${escapeHtml(c.name)}</span>
                        ${isYou ? '<span class="collab-you-tag">BẠN</span>' : ''}
                        <span style="font-size:10.5px; color:#94a3b8; font-weight:normal;">(${escapeHtml(c.device || 'PC')})</span>
                    </div>
                    <div class="collab-item-loc">📍 ${escapeHtml(c.location ? c.location.label : 'Trang tổng quan')}</div>
                </div>
            `;
            listEl.appendChild(item);
        });
    }

    // Hiển thị nhãn và viền sáng trên các Card đang được máy khác chỉnh sửa (Kèm ô nào, chữ nào)
    function highlightPeerEditingCards() {
        // Cập nhật Question Cards
        document.querySelectorAll(".question-card").forEach(card => {
            const qId = card.getAttribute("data-qid");
            const lockSlot = card.querySelector(".collab-lock-slot");
            const bannerSlot = card.querySelector(".card-live-banner-slot");
            if (!qId) return;

            // Kiểm tra xem có ai đang gõ trực tiếp vào trường nào của câu hỏi này không
            const activeEdits = Array.from(peerFieldEdits.values()).filter(e => e.targetType === 'question' && String(e.targetId) === String(qId));

            if (activeEdits.length > 0) {
                const latest = activeEdits[activeEdits.length - 1];
                card.classList.add("live-card-highlight");
                card.style.setProperty('--peer-collab-color', latest.sender.color || "#3498db");
                card.style.setProperty('--peer-collab-glow', (latest.sender.color || "#3498db") + '55');

                if (bannerSlot) {
                    bannerSlot.innerHTML = `
                        <div class="card-live-typing-banner" style="--peer-collab-color: ${latest.sender.color || '#3498db'};">
                            <div class="banner-header">
                                <span class="peer-badge-pill">${escapeHtml(latest.sender.name)}</span>
                                <span>đang sửa ô <strong>[${escapeHtml(latest.fieldLabel || latest.fieldId)}]</strong></span>
                            </div>
                            <div class="banner-content">
                                "${escapeHtml(String(latest.value || ''))}"<span class="live-caret"></span>
                            </div>
                        </div>
                    `;
                }
                if (lockSlot) lockSlot.innerHTML = "";
            } else {
                // Kiểm tra xem có người đang mở modal câu này (dù chưa gõ)
                const peer = collaborators.find(c => c.clientId !== currentProfile.clientId && c.location && c.location.type === 'question' && String(c.location.questionId) === String(qId));
                if (peer) {
                    card.classList.add("editing-by-peer");
                    card.style.borderColor = peer.color || "#e74c3c";
                    if (lockSlot) {
                        lockSlot.innerHTML = `<span class="collaborator-lock-pill" style="background:${peer.color || '#e74c3c'};">✏️ ${escapeHtml(peer.name)} đang mở câu này...</span>`;
                    }
                } else {
                    card.classList.remove("editing-by-peer");
                    card.classList.remove("live-card-highlight");
                    card.style.borderColor = "";
                    card.style.removeProperty('--peer-collab-color');
                    card.style.removeProperty('--peer-collab-glow');
                    if (lockSlot) lockSlot.innerHTML = "";
                    if (bannerSlot) bannerSlot.innerHTML = "";
                }
            }
        });

        // Cập nhật Section Cards
        document.querySelectorAll(".section-card").forEach(card => {
            const secId = card.getAttribute("data-secid");
            const lockSlot = card.querySelector(".collab-lock-slot");
            if (!lockSlot || !secId) return;

            const peer = collaborators.find(c => c.clientId !== currentProfile.clientId && c.location && c.location.type === 'section' && String(c.location.sectionId) === String(secId));
            if (peer) {
                card.classList.add("editing-by-peer");
                card.style.borderColor = peer.color || "#e74c3c";
                lockSlot.innerHTML = `<span class="collaborator-lock-pill" style="background:${peer.color || '#e74c3c'};">✏️ ${escapeHtml(peer.name)} đang sửa vòng này...</span>`;
            } else {
                card.classList.remove("editing-by-peer");
                card.style.borderColor = "";
                lockSlot.innerHTML = "";
            }
        });
    }

    // ==========================================
    // 10c. LIVE FIELD TRACKING & SYNC (Ô NÀO, CHỮ NÀO)
    // ==========================================
    function handleFieldInput(el) {
        const fieldId = el.id || el.name;
        const fieldLabel = FIELD_LABELS[fieldId] || el.placeholder || fieldId;
        let targetType = 'general';
        let targetId = 'general';

        if (modalQuestion.classList.contains("active")) {
            targetType = 'question';
            targetId = editingQuestion ? editingQuestion.id : 'new';
        } else if (modalSection.classList.contains("active")) {
            targetType = 'section';
            targetId = editingSection ? editingSection.id : 'new';
        } else if (modalCard.classList.contains("active")) {
            targetType = 'card';
            targetId = editingCard ? editingCard.id : 'new';
        }

        const val = (el.type === 'checkbox') ? (el.checked ? 'Bật' : 'Tắt') : el.value;

        const now = Date.now();
        if (now - lastFieldEditSentTime > 65) {
            lastFieldEditSentTime = now;
            sendFieldEdit(targetType, targetId, fieldId, fieldLabel, val, el.selectionStart);
        } else {
            clearTimeout(fieldEditThrottleTimer);
            fieldEditThrottleTimer = setTimeout(() => {
                lastFieldEditSentTime = Date.now();
                sendFieldEdit(targetType, targetId, fieldId, fieldLabel, val, el.selectionStart);
            }, 65);
        }
    }

    function sendFieldEdit(targetType, targetId, fieldId, fieldLabel, value, selectionStart) {
        sendWs({
            type: 'HELPER_FIELD_EDIT',
            targetType: targetType,
            targetId: targetId,
            fieldId: fieldId,
            fieldLabel: fieldLabel,
            value: value,
            selectionStart: selectionStart,
            sender: {
                clientId: currentProfile.clientId,
                name: currentProfile.name,
                color: currentProfile.color,
                device: currentProfile.device
            }
        });

        // Cập nhật vị trí của chính mình để người khác xem dropdown biết mình đang sửa ô nào
        const preview = String(value || '').substring(0, 30);
        updateLocation({
            type: targetType,
            targetId: targetId,
            fieldId: fieldId,
            fieldLabel: fieldLabel,
            label: `Đang sửa [${fieldLabel}]: "${preview}"`
        });
    }

    function handleFieldBlur(el) {
        const fieldId = el.id || el.name;
        let targetType = 'general';
        let targetId = 'general';

        if (modalQuestion.classList.contains("active")) {
            targetType = 'question';
            targetId = editingQuestion ? editingQuestion.id : 'new';
        } else if (modalSection.classList.contains("active")) {
            targetType = 'section';
            targetId = editingSection ? editingSection.id : 'new';
        } else if (modalCard.classList.contains("active")) {
            targetType = 'card';
            targetId = editingCard ? editingCard.id : 'new';
        }

        sendWs({
            type: 'HELPER_FIELD_BLUR',
            targetType: targetType,
            targetId: targetId,
            fieldId: fieldId,
            clientId: currentProfile.clientId
        });
    }

    function setupLiveFieldListeners() {
        const selector = `
            #modalQuestion input, #modalQuestion textarea, #modalQuestion select,
            #modalSection input, #modalSection textarea, #modalSection select,
            #modalCard input, #modalCard textarea, #modalCard select,
            #tab-random input
        `;
        const elements = document.querySelectorAll(selector);

        elements.forEach(el => {
            el.addEventListener("input", () => handleFieldInput(el));
            el.addEventListener("focus", () => handleFieldInput(el));
            el.addEventListener("change", () => handleFieldInput(el));
            el.addEventListener("blur", () => handleFieldBlur(el));
        });
    }

    function handleIncomingFieldEdit(msg) {
        const key = `${msg.targetType}_${msg.targetId}_${msg.fieldId}`;
        peerFieldEdits.set(key, msg);

        // 1. CẬP NHẬT TRONG MODAL ĐANG MỞ (Nếu người dùng đang mở đúng modal và câu/vòng đó)
        let isModalMatch = false;
        if (msg.targetType === 'question' && modalQuestion.classList.contains("active")) {
            const currentQId = editingQuestion ? editingQuestion.id : 'new';
            if (String(currentQId) === String(msg.targetId)) isModalMatch = true;
        } else if (msg.targetType === 'section' && modalSection.classList.contains("active")) {
            const currentSecId = editingSection ? editingSection.id : 'new';
            if (String(currentSecId) === String(msg.targetId)) isModalMatch = true;
        } else if (msg.targetType === 'card' && modalCard.classList.contains("active")) {
            const currentCardId = editingCard ? editingCard.id : 'new';
            if (String(currentCardId) === String(msg.targetId)) isModalMatch = true;
        }

        if (isModalMatch) {
            if (msg.fieldId === 'optCorrect') {
                const radio = document.querySelector(`input[name="optCorrect"][value="${msg.value}"]`);
                if (radio) {
                    radio.checked = true;
                    if (radio.parentElement) radio.parentElement.classList.add('peer-value-sync-active');
                }
            } else {
                const inputEl = document.getElementById(msg.fieldId);
                if (inputEl) {
                    inputEl.style.setProperty('--peer-collab-color', msg.sender.color || '#3498db');
                    inputEl.style.setProperty('--peer-collab-glow', (msg.sender.color || '#3498db') + '66');
                    inputEl.classList.add('peer-editing-field');

                    // Thẻ định danh nổi (Floating live badge)
                    let tag = document.getElementById(`peer_tag_${msg.fieldId}`);
                    if (!tag) {
                        tag = document.createElement('div');
                        tag.id = `peer_tag_${msg.fieldId}`;
                        tag.className = 'live-field-cursor-tag';
                        if (inputEl.parentNode) {
                            inputEl.parentNode.insertBefore(tag, inputEl);
                        }
                    }
                    tag.style.setProperty('--peer-collab-color', msg.sender.color || '#3498db');

                    const isSelfFocused = (document.activeElement === inputEl);
                    if (isSelfFocused) {
                        tag.innerHTML = `
                            <span class="tag-author">⚠️ <strong>${escapeHtml(msg.sender.name)}</strong> cũng đang gõ vào ô này:</span>
                            <span class="tag-preview">"${escapeHtml(String(msg.value || '').substring(0, 35))}"</span>
                        `;
                    } else {
                        tag.innerHTML = `
                            <span class="tag-author">✍️ <strong>${escapeHtml(msg.sender.name)}</strong> đang nhập:</span>
                            <span class="tag-preview">"${escapeHtml(String(msg.value || '').substring(0, 45))}"</span>
                        `;

                        // STREAMING CHỮ TRỰC TIẾP VÀO Ô ĐANG NHÌN
                        inputEl.value = (msg.value !== undefined) ? msg.value : '';
                        inputEl.classList.add('peer-value-sync-active');
                        setTimeout(() => inputEl.classList.remove('peer-value-sync-active'), 800);
                    }
                }
            }
        }

        // 2. CẬP NHẬT TRÊN THẺ CÂU HỎI Ở DANH SÁCH (Questions List)
        if (msg.targetType === 'question') {
            const card = document.getElementById(`qcard_${msg.targetId}`) || document.querySelector(`[data-qid="${msg.targetId}"]`);
            if (card) {
                card.style.setProperty('--peer-collab-color', msg.sender.color || '#3498db');
                card.style.setProperty('--peer-collab-glow', (msg.sender.color || '#3498db') + '55');
                card.classList.add('live-card-highlight');

                // Banner live typing
                const bannerSlot = card.querySelector('.card-live-banner-slot') || card.querySelector('.collab-lock-slot');
                if (bannerSlot) {
                    bannerSlot.innerHTML = `
                        <div class="card-live-typing-banner" style="--peer-collab-color: ${msg.sender.color || '#3498db'};">
                            <div class="banner-header">
                                <span class="peer-badge-pill">${escapeHtml(msg.sender.name)}</span>
                                <span>đang sửa ô <strong>[${escapeHtml(msg.fieldLabel || msg.fieldId)}]</strong></span>
                            </div>
                            <div class="banner-content">
                                "${escapeHtml(String(msg.value || ''))}"<span class="live-caret"></span>
                            </div>
                        </div>
                    `;
                }

                // Stream chữ trực tiếp vào nội dung trên Card
                if (msg.fieldId === 'qInputText') {
                    const titleEl = card.querySelector('.question-title');
                    if (titleEl) {
                        titleEl.textContent = msg.value || '(Đang nhập câu hỏi...)';
                        titleEl.classList.add('peer-value-sync-active');
                    }
                } else if (msg.fieldId === 'qInputOpt0') {
                    const optA = card.querySelector('[data-opt-idx="0"] span:nth-child(2)');
                    if (optA) {
                        optA.textContent = (msg.value || '').replace(/^[A-D]\.\s*/, '');
                        optA.parentElement.classList.add('opt-live-stream-glow');
                        optA.parentElement.style.setProperty('--peer-collab-color', msg.sender.color || '#3498db');
                    }
                } else if (msg.fieldId === 'qInputOpt1') {
                    const optB = card.querySelector('[data-opt-idx="1"] span:nth-child(2)');
                    if (optB) {
                        optB.textContent = (msg.value || '').replace(/^[A-D]\.\s*/, '');
                        optB.parentElement.classList.add('opt-live-stream-glow');
                        optB.parentElement.style.setProperty('--peer-collab-color', msg.sender.color || '#3498db');
                    }
                } else if (msg.fieldId === 'qInputOpt2') {
                    const optC = card.querySelector('[data-opt-idx="2"] span:nth-child(2)');
                    if (optC) {
                        optC.textContent = (msg.value || '').replace(/^[A-D]\.\s*/, '');
                        optC.parentElement.classList.add('opt-live-stream-glow');
                        optC.parentElement.style.setProperty('--peer-collab-color', msg.sender.color || '#3498db');
                    }
                } else if (msg.fieldId === 'qInputOpt3') {
                    const optD = card.querySelector('[data-opt-idx="3"] span:nth-child(2)');
                    if (optD) {
                        optD.textContent = (msg.value || '').replace(/^[A-D]\.\s*/, '');
                        optD.parentElement.classList.add('opt-live-stream-glow');
                        optD.parentElement.style.setProperty('--peer-collab-color', msg.sender.color || '#3498db');
                    }
                } else if (msg.fieldId === 'qInputRoses') {
                    const roseEl = card.querySelector('.rose-reward-badge span:last-child');
                    if (roseEl) roseEl.textContent = `+${msg.value || 1} Hoa Hồng`;
                } else if (msg.fieldId === 'qInputExplanation') {
                    const expEl = card.querySelector('.question-explanation');
                    if (expEl) expEl.innerHTML = `<strong>Bí Kíp Bảo Mật:</strong> ${escapeHtml(msg.value || 'Chưa có giải thích')}`;
                }
            }
        }

        // 3. CẬP NHẬT COLLABORATORS LIST DROPDOWN
        const collab = collaborators.find(c => c.clientId === msg.clientId);
        if (collab) {
            collab.location = {
                type: msg.targetType,
                targetId: msg.targetId,
                fieldId: msg.fieldId,
                fieldLabel: msg.fieldLabel,
                label: `Đang sửa [${msg.fieldLabel || msg.fieldId}]: "${(msg.value || '').substring(0, 20)}"`
            };
            renderCollaboratorsDropdownOnly();
        }
    }

    function handleIncomingFieldBlur(msg) {
        const key = `${msg.targetType}_${msg.targetId}_${msg.fieldId}`;
        peerFieldEdits.delete(key);

        const inputEl = document.getElementById(msg.fieldId);
        if (inputEl) {
            inputEl.classList.remove('peer-editing-field');
            inputEl.style.removeProperty('--peer-collab-color');
            inputEl.style.removeProperty('--peer-collab-glow');
        }
        const tag = document.getElementById(`peer_tag_${msg.fieldId}`);
        if (tag) tag.remove();

        // Kiểm tra xem thẻ câu hỏi còn trường nào đang được edit không
        if (msg.targetType === 'question') {
            const anyLeft = Array.from(peerFieldEdits.values()).some(e => e.targetType === 'question' && String(e.targetId) === String(msg.targetId));
            if (!anyLeft) {
                const card = document.getElementById(`qcard_${msg.targetId}`) || document.querySelector(`[data-qid="${msg.targetId}"]`);
                if (card) {
                    card.classList.remove('live-card-highlight');
                    const bannerSlot = card.querySelector('.card-live-banner-slot') || card.querySelector('.collab-lock-slot');
                    if (bannerSlot) bannerSlot.innerHTML = '';
                    card.querySelectorAll('.opt-live-stream-glow').forEach(el => el.classList.remove('opt-live-stream-glow'));
                }
            }
        }
    }

    function clearPeerFieldEditsForTarget(targetId) {
        for (const [k, v] of peerFieldEdits.entries()) {
            if (String(v.targetId) === String(targetId)) {
                peerFieldEdits.delete(k);
                handleIncomingFieldBlur(v);
            }
        }
    }

    function clearOwnFieldEdits(targetType) {
        sendWs({
            type: 'HELPER_FIELD_BLUR',
            targetType: targetType,
            targetId: 'all',
            fieldId: 'all',
            clientId: currentProfile.clientId
        });
    }

    function onModalClosed(modalId) {
        if (modalId === 'modalQuestion') {
            editingQuestion = null;
            updateLocation({
                type: 'tab',
                tab: 'tab-questions',
                label: `Xem danh sách câu hỏi Vòng ${selectedStageId}`
            });
            clearOwnFieldEdits('question');
        } else if (modalId === 'modalSection') {
            editingSection = null;
            updateLocation({
                type: 'tab',
                tab: 'tab-sections',
                label: 'Xem danh sách Vòng chơi'
            });
            clearOwnFieldEdits('section');
        } else if (modalId === 'modalCard') {
            editingCard = null;
            updateLocation({
                type: 'tab',
                tab: 'tab-random',
                label: 'Cài đặt Boss & Thẻ bài'
            });
            clearOwnFieldEdits('card');
        }
    }

    // ==========================================
    // 10d. MULTIPLAYER LIVE CURSORS (CHUỘT CỘNG TÁC CÙNG TAB)
    // ==========================================
    function getActiveTab() {
        const activeBtn = document.querySelector(".nav-tab.active");
        return activeBtn ? activeBtn.getAttribute("data-tab") : "tab-sections";
    }

    function sendCursorMove(tab, x, y, percentX) {
        sendWs({
            type: 'HELPER_CURSOR_MOVE',
            tab: tab,
            x: Math.round(x),
            y: Math.round(y),
            percentX: Number(percentX.toFixed(4)),
            clientId: currentProfile.clientId,
            sender: {
                name: currentProfile.name,
                color: currentProfile.color
            }
        });
    }

    function handleContainerMouseMove(e) {
        const container = tabContentContainer || document.getElementById("tabContentContainer");
        if (!container) return;
        const rect = container.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top + container.scrollTop;
        const percentX = x / (rect.width || 1);
        const currentTab = getActiveTab();

        const now = Date.now();
        if (now - lastCursorSentTime > 35) {
            lastCursorSentTime = now;
            sendCursorMove(currentTab, x, y, percentX);
        } else {
            clearTimeout(cursorThrottleTimer);
            cursorThrottleTimer = setTimeout(() => {
                lastCursorSentTime = Date.now();
                sendCursorMove(currentTab, x, y, percentX);
            }, 35);
        }
    }

    function handleContainerMouseLeave() {
        sendWs({
            type: 'HELPER_CURSOR_LEAVE',
            clientId: currentProfile.clientId
        });
    }

    function filterPeerCursorsByTab(activeTab) {
        peerCursorsMap.forEach((cursorObj) => {
            if (cursorObj.tab !== activeTab) {
                cursorObj.el.classList.add("hidden");
            } else {
                cursorObj.el.classList.remove("hidden");
            }
        });
    }

    function handleIncomingCursorMove(msg) {
        const currentTab = getActiveTab();
        let cursorObj = peerCursorsMap.get(msg.clientId);

        if (!cursorObj) {
            const layer = peerCursorsLayer || document.getElementById("peerCursorsLayer");
            if (!layer) return;

            const el = document.createElement("div");
            el.className = "peer-cursor";
            el.id = `peer_cursor_${msg.clientId}`;
            el.innerHTML = `
                <svg class="peer-cursor-pointer" width="22" height="22" viewBox="0 0 24 24" fill="none">
                    <path d="M5.65 12.37H5.46L5.32 12.5L0.5 16.88L0.5 1.2L11.78 12.37H5.65Z" fill="${msg.sender.color || '#3498db'}" stroke="#ffffff" stroke-width="1.3"/>
                </svg>
                <div class="peer-cursor-label" style="background:${msg.sender.color || '#3498db'};">
                    <span>${escapeHtml(msg.sender.name || 'Biên tập viên')}</span>
                </div>
            `;
            layer.appendChild(el);
            cursorObj = { el, idleTimer: null, tab: msg.tab };
            peerCursorsMap.set(msg.clientId, cursorObj);
        }

        cursorObj.tab = msg.tab;

        // CHỈ HIỂN THỊ NẾU ĐANG CÙNG TAB
        if (msg.tab !== currentTab) {
            cursorObj.el.classList.add("hidden");
            return;
        }

        cursorObj.el.classList.remove("hidden");
        const container = tabContentContainer || document.getElementById("tabContentContainer");
        const targetX = (typeof msg.percentX === 'number' && container)
            ? (msg.percentX * container.clientWidth)
            : msg.x;
        const targetY = msg.y;

        cursorObj.el.style.transform = `translate3d(${targetX}px, ${targetY}px, 0)`;

        // Tự động mờ đi sau 3.5 giây không di chuyển
        clearTimeout(cursorObj.idleTimer);
        cursorObj.idleTimer = setTimeout(() => {
            cursorObj.el.classList.add("hidden");
        }, 3500);
    }

    function handleIncomingCursorLeave(msg) {
        const cursorObj = peerCursorsMap.get(msg.clientId);
        if (cursorObj) {
            cursorObj.el.classList.add("hidden");
        }
    }

    // ==========================================
    // 10c. MODAL CHIA SẺ LIVE EDIT (QR & LINK)
    // ==========================================
    async function openShareModal() {
        if (!tunnelInfo) {
            try {
                const res = await fetch("/api/tunnel");
                if (res.ok) tunnelInfo = await res.json();
            } catch (e) {}
        }
        updateShareModalUI();
        modalShareLive.classList.add("active");
    }

    function updateShareModalUI() {
        const qrImg = document.getElementById("shareQrImg");
        const qrLoading = document.getElementById("shareQrLoading");
        const urlInput = document.getElementById("shareUrlInput");
        const noticeEl = document.getElementById("shareTunnelStatusNotice");

        if (!qrImg || !urlInput) return;

        if (!tunnelInfo) {
            qrImg.style.display = "none";
            qrLoading.style.display = "block";
            urlInput.value = window.location.href;
            return;
        }

        let targetUrl = "";
        let targetQr = "";

        if (shareActiveTab === "wifi") {
            targetUrl = tunnelInfo.localHelperUrl || `http://${tunnelInfo.localIp || window.location.hostname}:3000/helper`;
            targetQr = tunnelInfo.localHelperQr;
            noticeEl.innerHTML = "📶 Mạng nội bộ Wi-Fi (Cho các máy cùng mạng Wi-Fi trường / nhà)";
            noticeEl.style.color = "#00d2d3";
        } else {
            targetUrl = tunnelInfo.tunnelHelperUrl || (tunnelInfo.tunnelUrl ? tunnelInfo.tunnelUrl.replace(/\/controller$/, '/helper') : "");
            targetQr = tunnelInfo.tunnelHelperQr;
            if (tunnelInfo.status === "active" && targetUrl) {
                noticeEl.innerHTML = "🟢 Live Tunnel Internet (4G) sẵn sàng truy cập từ xa mọi nơi";
                noticeEl.style.color = "#2ecc71";
            } else {
                noticeEl.innerHTML = "⏳ Đang kết nối Live Tunnel Internet...";
                noticeEl.style.color = "#f1c40f";
            }
        }

        urlInput.value = targetUrl || window.location.href;

        if (targetQr) {
            qrImg.src = targetQr;
            qrImg.style.display = "block";
            qrLoading.style.display = "none";
        } else {
            qrImg.style.display = "none";
            qrLoading.style.display = "block";
        }
    }

    // ==========================================
    // 11. KHỞI TẠO SỰ KIỆN GIAO DIỆN
    // ==========================================
    function initEvents() {
        // Chuyển Tab chính
        document.querySelectorAll(".nav-tab").forEach(tab => {
            tab.addEventListener("click", () => {
                const target = tab.getAttribute("data-tab");
                document.querySelectorAll(".nav-tab").forEach(t => t.classList.remove("active"));
                document.querySelectorAll(".tab-pane").forEach(p => p.classList.remove("active"));

                tab.classList.add("active");
                document.getElementById(target).classList.add("active");

                // Lọc chuột các cộng tác viên theo tab mới
                filterPeerCursorsByTab(target);
                sendWs({
                    type: 'HELPER_CURSOR_LEAVE',
                    clientId: currentProfile.clientId
                });

                let tabLabel = 'Xem Vòng chơi';
                if (target === 'tab-questions') tabLabel = `Xem Câu hỏi Vòng ${selectedStageId}`;
                else if (target === 'tab-random') tabLabel = 'Cài đặt Boss & Ngẫu nhiên';
                else if (target === 'tab-json') tabLabel = 'Xem mã JSON';

                updateLocation({
                    type: 'tab',
                    tab: target,
                    label: tabLabel
                });

                if (target === "tab-json") {
                    renderRawJsonView();
                }
            });
        });

        // Dropdown lọc câu hỏi theo vòng
        selectStageFilter.addEventListener("change", (e) => {
            selectedStageId = parseInt(e.target.value);
            updateLocation({
                type: 'tab',
                tab: 'tab-questions',
                label: `Xem Câu hỏi Vòng ${selectedStageId}`
            });
            renderQuestionsList();
        });

        // Top actions
        btnSaveConfig.addEventListener("click", () => saveConfigToServer(false));
        btnShareLive.addEventListener("click", openShareModal);
        btnExportJson.addEventListener("click", exportJsonFile);
        fileInputJson.addEventListener("change", handleFileImport);
        btnResetConfig.addEventListener("click", resetConfigDefault);

        // Section actions
        document.getElementById("btnAddSection").addEventListener("click", openCreateSection);
        document.getElementById("btnSaveSectionModal").addEventListener("click", saveSectionFromModal);

        // Question actions
        document.getElementById("btnAddQuestion").addEventListener("click", openCreateQuestion);
        document.getElementById("btnSaveQuestionModal").addEventListener("click", saveQuestionFromModal);

        // Card actions
        document.getElementById("btnAddCard").addEventListener("click", openCreateCard);
        document.getElementById("btnSaveCardModal").addEventListener("click", saveCardFromModal);

        // Raw JSON actions
        btnFormatJson.addEventListener("click", formatJsonEditor);
        btnApplyRawJson.addEventListener("click", applyRawJson);

        // Sự kiện Modal Chia Sẻ Live Edit
        tabBtnShareWifi.addEventListener("click", () => {
            shareActiveTab = "wifi";
            tabBtnShareWifi.classList.add("active");
            tabBtnShareTunnel.classList.remove("active");
            updateShareModalUI();
        });

        tabBtnShareTunnel.addEventListener("click", () => {
            shareActiveTab = "tunnel";
            tabBtnShareTunnel.classList.add("active");
            tabBtnShareWifi.classList.remove("active");
            updateShareModalUI();
        });

        btnCopyShareUrl.addEventListener("click", () => {
            const url = document.getElementById("shareUrlInput").value;
            if (navigator.clipboard && url) {
                navigator.clipboard.writeText(url).then(() => {
                    showToast("📋 Đã sao chép link Live Edit vào bộ nhớ tạm!");
                }).catch(() => {
                    document.getElementById("shareUrlInput").select();
                    document.execCommand("copy");
                    showToast("📋 Đã sao chép link!");
                });
            }
        });

        // Sự kiện Modal Xung Đột (Conflict Resolution)
        btnConflictForceOverwrite.addEventListener("click", () => {
            if (confirm("⚠️ Bạn có chắc chắn muốn ghi đè nội dung của mình lên máy chủ? Bản của đồng nghiệp sẽ bị thay thế!")) {
                modalConflict.classList.remove("active");
                saveConfigToServer(true); // Force overwrite
            }
        });

        btnConflictLoadServer.addEventListener("click", () => {
            if (pendingConflictData && pendingConflictData.serverConfig) {
                currentConfig = pendingConflictData.serverConfig;
                baseRevision = pendingConflictData.serverRevision;
                renderAll();
                modalConflict.classList.remove("active");
                showToast("📥 Đã nạp bản mới nhất từ máy chủ!");
            }
        });

        btnConflictBackupJson.addEventListener("click", () => {
            exportJsonFile();
            showToast("💾 Đã tải bản nháp của bạn về máy dạng file .json!");
        });

        // Sự kiện Collaborator Badge & Profile Modal
        collaboratorsBadge.addEventListener("click", (e) => {
            e.stopPropagation();
            collabWrapper.classList.toggle("open");
        });

        document.addEventListener("click", (e) => {
            if (collabWrapper && !collabWrapper.contains(e.target)) {
                collabWrapper.classList.remove("open");
            }
        });

        btnOpenProfileModal.addEventListener("click", () => {
            collabWrapper.classList.remove("open");
            inputProfileName.value = currentProfile.name;

            // Highlight màu hiện tại
            document.querySelectorAll("#profileColorPicker .color-swatch").forEach(swatch => {
                if (swatch.getAttribute("data-color") === currentProfile.color) {
                    swatch.classList.add("active");
                } else {
                    swatch.classList.remove("active");
                }
            });

            modalProfile.classList.add("active");
        });

        let selectedColor = currentProfile.color;
        document.querySelectorAll("#profileColorPicker .color-swatch").forEach(swatch => {
            swatch.addEventListener("click", () => {
                document.querySelectorAll("#profileColorPicker .color-swatch").forEach(s => s.classList.remove("active"));
                swatch.classList.add("active");
                selectedColor = swatch.getAttribute("data-color");
            });
        });

        btnSaveProfile.addEventListener("click", () => {
            const newName = inputProfileName.value.trim();
            if (!newName) {
                alert("Vui lòng nhập tên hoặc biệt danh của bạn!");
                return;
            }
            saveProfile(newName, selectedColor);
            modalProfile.classList.remove("active");
        });

        // Khởi tạo các listener theo dõi gõ phím trực tiếp vào từng ô (Live Field Edit)
        setupLiveFieldListeners();

        // Khởi tạo listener theo dõi di chuyển chuột giữa các máy đang cùng Tab (Multiplayer Live Cursors)
        const container = tabContentContainer || document.getElementById("tabContentContainer");
        if (container) {
            container.addEventListener("mousemove", handleContainerMouseMove);
            container.addEventListener("mouseleave", handleContainerMouseLeave);
        }
        window.addEventListener("blur", handleContainerMouseLeave);

        // Đóng các Modal
        document.querySelectorAll("[data-close]").forEach(btn => {
            btn.addEventListener("click", () => {
                const modalId = btn.getAttribute("data-close");
                document.getElementById(modalId).classList.remove("active");
                onModalClosed(modalId);
            });
        });

        // Đóng modal khi bấm ra ngoài nền mờ
        document.querySelectorAll(".modal-overlay").forEach(overlay => {
            overlay.addEventListener("click", (e) => {
                if (e.target === overlay) {
                    overlay.classList.remove("active");
                    onModalClosed(overlay.id);
                }
            });
        });
    }

    // Public API cho các hàm onclick
    window.HelperApp = {
        openEditSection,
        deleteSection,
        switchToQuestions,
        openCreateQuestion,
        openEditQuestion,
        duplicateQuestion,
        deleteQuestion,
        openEditCard,
        deleteCard
    };

    // Khởi chạy khi DOM sẵn sàng
    window.addEventListener("DOMContentLoaded", () => {
        loadProfile();
        initEvents();
        initWebSocket();
        loadConfigFromServer();
        renderCollaboratorsUI();
    });
})();
