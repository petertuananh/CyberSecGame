/**
 * Module sinh câu hỏi ngẫu nhiên với dữ liệu động (Procedural Random Question Generator)
 * Chủ đề: Độ mạnh mật khẩu & An ninh mạng
 * 3 Vòng:
 *  - Vòng 1: Rừng Mật Mã (Độ dài, Cấu trúc, Nhận diện mật khẩu yếu/mạnh)
 *  - Vòng 2: Vùng Biển Dữ Liệu (Quản lý mật khẩu, Xác thực 2 bước 2FA, Chống lừa đảo Phishing)
 *  - Vòng 3: Tầng Mây Thượng Đỉnh (Cụm mật khẩu Passphrase, Tấn công Brute-force, Rò rỉ dữ liệu)
 */

(function (window) {
    const NAMES = ["Minh", "Linh", "Tuan", "Huong", "Nam", "Trang", "Hoang", "Mai", "Duc", "Anh"];
    const YEARS = ["2001", "2003", "1998", "1995", "2000", "2005", "2007", "2024", "2026"];
    const SERVICES = ["Gmail", "Facebook", "Tài khoản Ngân hàng", "Steam", "Tài khoản Zalo", "Ví điện tử", "TikTok", "Discord"];
    const FAKE_DOMAINS = [
        "vietcombank-xacminh-khancap.xyz",
        "ho-tro-facebook-bao-mat24h.net",
        "google-security-verify-alert.info",
        "apple-id-urgent-lock.online",
        "vpbank-ebanking-support.cc"
    ];
    const WORDS_VI = ["MatTroi", "DongSông", "RungXanh", "BinhMinh", "NgonGio", "CanhDieu", "BienRong", "HoaHong", "VangOng", "PhaoDai"];
    const SYMBOLS = ["@", "#", "$", "!", "%", "^", "&", "*", "_", "?"];

    function randomChoice(arr) {
        return arr[Math.floor(Math.random() * arr.length)];
    }

    function randomInt(min, max) {
        return Math.floor(Math.random() * (max - min + 1)) + min;
    }

    function shuffle(array) {
        const arr = [...array];
        for (let i = arr.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [arr[i], arr[j]] = [arr[j], arr[i]];
        }
        return arr;
    }

    // --- Các hàm sinh mật khẩu ngẫu nhiên theo cấp độ ---
    function generateVeryWeakPassword() {
        const type = randomInt(1, 4);
        if (type === 1) return "123456";
        if (type === 2) return randomChoice(NAMES).toLowerCase() + randomChoice(["123", "888", "123456"]);
        if (type === 3) return "password" + randomChoice(["", "123", "2024", "!"]);
        return randomChoice(["qwerty", "iloveyou", "admin123", "666666", "000000"]);
    }

    function generateMediumPassword() {
        const name = randomChoice(NAMES);
        const year = randomChoice(YEARS);
        const sym = randomChoice(SYMBOLS);
        return `${name}${sym}${year}`;
    }

    function generateStrongPassword() {
        const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789!@#$%^&*_-";
        let pwd = "";
        const len = randomInt(14, 17);
        for (let i = 0; i < len; i++) {
            pwd += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        return pwd;
    }

    function generatePassphrase() {
        const w1 = randomChoice(WORDS_VI);
        let w2 = randomChoice(WORDS_VI);
        while (w2 === w1) w2 = randomChoice(WORDS_VI);
        let w3 = randomChoice(WORDS_VI);
        while (w3 === w1 || w3 === w2) w3 = randomChoice(WORDS_VI);
        const num = randomInt(10, 99);
        const sym = randomChoice(["!", "#", "$", "*"]);
        return `${w1}-${w2}-${w3}-${num}${sym}`;
    }

    // Helper tạo cấu trúc câu hỏi và xáo trộn đáp án A, B, C, D
    function makeQuestion(prompt, rawOptions, correctIndex, explanation) {
        const items = rawOptions.map((opt, idx) => ({ text: opt, isCorrect: idx === correctIndex }));
        const shuffled = shuffle(items);
        const correctPos = shuffled.findIndex(item => item.isCorrect);

        const prefixes = ["A. ", "B. ", "C. ", "D. "];
        const finalOptions = shuffled.map((item, idx) => prefixes[idx] + item.text);

        return {
            question: prompt,
            options: finalOptions,
            correct: correctPos,
            explanation: explanation
        };
    }

    // ==========================================
    // VÒNG 1: KHU RỪNG MẬT MÃ (Cơ bản: Độ dài, thành phần)
    // ==========================================
    const stage1Generators = [
        // 1.1 Tìm mật khẩu MẠNH NHẤT
        function () {
            const strong = generateStrongPassword();
            const weak1 = generateVeryWeakPassword();
            const weak2 = generateVeryWeakPassword();
            const med = generateMediumPassword();

            return makeQuestion(
                "Trong các mật khẩu ngẫu nhiên sau đây, mật khẩu nào MẠNH NHẤT để bảo vệ dữ liệu chống lại hacker?",
                [strong, weak1, weak2, med],
                0,
                `Mật khẩu "${strong}" vượt trội nhờ độ dài trên 14 ký tự và kết hợp ngẫu nhiên đầy đủ hoa, thường, số, ký tự đặc biệt!`
            );
        },
        // 1.2 Tìm mật khẩu YẾU NHẤT
        function () {
            const weak = generateVeryWeakPassword();
            const strong1 = generateStrongPassword();
            const strong2 = generatePassphrase();
            const med = generateMediumPassword();

            return makeQuestion(
                "Trong các mật khẩu sau, mật khẩu nào YẾU NHẤT và có nguy cơ bị máy tính hacker bẻ khóa trong chưa đầy 1 giây?",
                [weak, strong1, strong2, med],
                0,
                `Mật khẩu "${weak}" quá ngắn hoặc sử dụng từ/dãy số phổ biến, nằm trong danh sách từ điển tấn công đầu tiên của hacker!`
            );
        },
        // 1.3 Nhận diện rủi ro thông tin cá nhân
        function () {
            const name = randomChoice(NAMES);
            const year = randomChoice(YEARS);
            const userPwd = `${name}${year}`;

            return makeQuestion(
                `Bạn tên là ${name} (sinh năm ${year}) và đặt mật khẩu là "${userPwd}". Nhược điểm chí mạng của mật khẩu này là gì?`,
                [
                    "Chứa thông tin cá nhân công khai, kẻ quen biết hoặc hacker dùng Social Engineering đoán ra ngay",
                    "Mật khẩu này quá dài khiến hệ thống máy tính không lưu trữ nổi",
                    "Có quá nhiều ký tự đặc biệt làm khó người đăng nhập",
                    "Đây là mật khẩu an toàn tuyệt đối, không có nhược điểm nào"
                ],
                0,
                "Tuyệt đối không dùng tên, ngày sinh, số điện thoại làm mật khẩu vì kẻ xấu có thể tra cứu dễ dàng từ mạng xã hội!"
            );
        },
        // 1.4 Độ dài tối thiểu chuẩn
        function () {
            const lenGood = randomInt(12, 16);
            return makeQuestion(
                "Theo tiêu chuẩn an toàn an ninh mạng quốc tế (NIST), độ dài tối thiểu được khuyến nghị cho mật khẩu người dùng hiện nay là:",
                [
                    `Tối thiểu từ ${lenGood} đến 16 ký tự trở lên`,
                    "Chỉ cần 4 đến 6 ký tự để nhớ cho nhanh",
                    "Đúng 8 ký tự là an toàn vĩnh viễn không thể bị phá",
                    "Càng ngắn càng tốt để tiết kiệm bộ nhớ máy tính"
                ],
                0,
                "Độ dài là yếu tố quan trọng hàng đầu. Mật khẩu từ 12-16 ký tự làm tăng thời gian bẻ khóa theo cấp số nhân!"
            );
        },
        // 1.5 Đánh giá cấp độ an toàn của một mật khẩu ngẫu nhiên
        function () {
            const isStrong = Math.random() > 0.5;
            const pwd = isStrong ? generateStrongPassword() : generateVeryWeakPassword();

            if (isStrong) {
                return makeQuestion(
                    `Hệ thống vừa kiểm tra mật khẩu "${pwd}". Mật khẩu này thuộc cấp độ bảo mật nào?`,
                    [
                        "Cấp độ: Rất Mạnh (An toàn cao trước tấn công từ điển & Brute-force)",
                        "Cấp độ: Rất Yếu (Dễ bị bẻ khóa tức thì)",
                        "Cấp độ: Không hợp lệ (Không được chấp nhận)",
                        "Cấp độ: Nguy hiểm cực độ"
                    ],
                    0,
                    "Mật khẩu dài, đa dạng ký tự và không theo quy luật thông thường đạt điểm bảo mật tối đa!"
                );
            } else {
                return makeQuestion(
                    `Hệ thống vừa kiểm tra mật khẩu "${pwd}". Mật khẩu này thuộc cấp độ bảo mật nào?`,
                    [
                        "Cấp độ: Rất Yếu (Có thể bị phần mềm bẻ khóa trong 1 giây)",
                        "Cấp độ: Siêu Bảo Mật (Không ai phá được)",
                        "Cấp độ: Hoàn hảo cho tài khoản ngân hàng",
                        "Cấp độ: Đạt chuẩn quân đội"
                    ],
                    0,
                    "Mật khẩu quá ngắn hoặc đơn giản sẽ bị bẻ khóa chỉ bằng một lệnh quét tự động của hacker!"
                );
            }
        }
    ];

    // ==========================================
    // VÒNG 2: VÙNG BIỂN DỮ LIỆU (Quản lý, 2FA, Phishing)
    // ==========================================
    const stage2Generators = [
        // 2.1 Tình huống Phishing giả mạo
        function () {
            const fakeDomain = randomChoice(FAKE_DOMAINS);
            const hours = randomChoice([12, 24, 48]);
            const service = randomChoice(SERVICES);

            return makeQuestion(
                `Bạn nhận được thông báo: "${service} của bạn sẽ bị KHÓA vĩnh viễn sau ${hours} giờ! Bấm vào liên kết http://${fakeDomain} để nhập mật khẩu xác minh". Bạn nên làm gì?`,
                [
                    "Bình tĩnh, tuyệt đối KHÔNG bấm liên kết lạ, tự mở trình duyệt truy cập website chính thức để kiểm tra",
                    "Bấm vào link ngay lập tức và điền mật khẩu cũ cùng mật khẩu mới để tránh bị khóa",
                    "Chuyển tiếp email này cho người thân nhờ họ đăng nhập giúp",
                    "Trả lời thư điện tử và gửi kèm ảnh chụp căn cước công dân"
                ],
                0,
                `Tên miền lạ "${fakeDomain}" là bẫy Phishing (giả mạo)! Kẻ gian lợi dụng tâm lý hoang mang để cướp mật khẩu của bạn.`
            );
        },
        // 2.2 Dùng chung 1 mật khẩu cho nhiều tài khoản
        function () {
            const count = randomInt(5, 12);
            return makeQuestion(
                `Một người dùng có ${count} tài khoản trực tuyến (Email, Mạng xã hội, Game, Ngân hàng) và dùng CHUNG một mật khẩu duy nhất. Hậu quả nguy hiểm nhất là gì?`,
                [
                    "Chỉ cần 1 trang web kém bảo mật bị hack lộ mật khẩu, kẻ gian sẽ chiếm đoạt toàn bộ tài khoản còn lại!",
                    "Không có nguy hiểm nào vì dùng chung 1 mật khẩu rất tiện và dễ nhớ",
                    "Hệ điều hành máy tính sẽ tự động bị hỏng ổ cứng",
                    "Tốc độ mạng internet của nhà bạn sẽ bị giảm đi 10 lần"
                ],
                0,
                "Hiệu ứng sụp đổ dây chuyền! Hacker sau khi có mật khẩu từ 1 web rác sẽ dùng bot thử đăng nhập vào hàng loạt ngân hàng và email của bạn."
            );
        },
        // 2.3 Sức mạnh của Xác thực 2 yếu tố (2FA)
        function () {
            const svc = randomChoice(SERVICES);
            return makeQuestion(
                `Kẻ gian bằng cách nào đó đã nhìn trộm được mật khẩu tài khoản ${svc} của bạn. Lớp phòng thủ nào sau đây sẽ CHẶN ĐỨNG kẻ gian đăng nhập thành công?`,
                [
                    "Xác thực 2 yếu tố (2FA/MFA) yêu cầu mã OTP từ ứng dụng xác thực hoặc khóa bảo mật phần cứng",
                    "Tắt màn hình máy tính ngay lập tức",
                    "Đặt lại độ sáng màn hình điện thoại về mức thấp nhất",
                    "Bấm phím F5 liên tục trên bàn phím"
                ],
                0,
                "Có 2FA, kẻ gian dù biết mật khẩu chính xác vẫn không thể đăng nhập vì thiếu mã xác nhận thứ hai từ thiết bị cá nhân của bạn!"
            );
        },
        // 2.4 Trình quản lý mật khẩu (Password Manager)
        function () {
            return makeQuestion(
                "Để mỗi tài khoản có một mật khẩu dài, phức tạp và không trùng lặp mà không lo bị quên, giải pháp an toàn và tiện lợi nhất là gì?",
                [
                    "Sử dụng phần mềm Trình quản lý mật khẩu (Password Manager) có mã hóa chuẩn quốc tế",
                    "Viết tất cả mật khẩu vào một mẩu giấy dán sau lưng màn hình máy tính",
                    "Lưu toàn bộ mật khẩu vào một file Word không đặt khóa trên màn hình Desktop",
                    "Gửi tin nhắn chứa danh sách mật khẩu cho nhiều người quen giữ hộ"
                ],
                0,
                "Password Manager chỉ yêu cầu bạn nhớ một Master Password duy nhất, còn lại tự động tạo và lưu trữ mã hóa an toàn cho mọi tài khoản."
            );
        },
        // 2.5 Đăng nhập trên Wi-Fi công cộng
        function () {
            const place = randomChoice(["quán cà phê", "sân bay", "bến xe", "trung tâm thương mại"]);
            return makeQuestion(
                `Khi kết nối Wi-Fi công cộng miễn phí tại ${place}, bạn nên làm gì để bảo vệ mật khẩu đăng nhập của mình?`,
                [
                    "Bật mạng riêng ảo (VPN), chỉ đăng nhập các trang có HTTPS và không thực hiện giao dịch tài chính nhạy cảm",
                    "Tắt phần mềm diệt virus để Wi-Fi chạy nhanh hơn",
                    "Chia sẻ mật khẩu tài khoản của mình cho những người cùng dùng Wi-Fi",
                    "Đổi mật khẩu tài khoản thành chuỗi số 111111"
                ],
                0,
                "Wi-Fi công cộng tiềm ẩn nguy cơ bị nghe lén dữ liệu (Man-in-the-Middle). Luôn cần HTTPS và VPN để mã hóa đường truyền!"
            );
        }
    ];

    // ==========================================
    // VÒNG 3: TẦNG MÂY THƯỢNG ĐỈNH (Kỹ thuật nâng cao: Passphrase, Brute-force, Breach)
    // ==========================================
    const stage3Generators = [
        // 3.1 Nhận diện Cụm mật khẩu (Passphrase)
        function () {
            const pp = generatePassphrase();
            const short1 = "Abc@123";
            const short2 = "MatKhau1!";
            const num = "9876543210";

            return makeQuestion(
                "Khái niệm 'Passphrase' (Cụm mật khẩu) kết hợp nhiều từ ngẫu nhiên tạo độ dài vượt trội. Đâu là một Passphrase chuẩn mực sau đây?",
                [pp, short1, short2, num],
                0,
                `"${pp}" là Passphrase xuất sắc: độ dài lớn (dễ liên tưởng hình ảnh với người dùng) nhưng tạo không gian tổ hợp khổng lồ khiến bot hacker bó tay!`
            );
        },
        // 3.2 Tấn công Brute Force toán học
        function () {
            const digits = randomChoice([4, 6]);
            const totalCombos = digits === 4 ? "10.000 (10 nghìn)" : "1.000.000 (1 triệu)";
            const crackTime = "chưa đầy 0,01 giây";

            return makeQuestion(
                `Một mã PIN chỉ gồm ${digits} chữ số (0-9) có tổng cộng bao nhiêu tổ hợp khả dĩ, và máy tính bẻ khóa tự động (Brute Force) mất bao lâu?`,
                [
                    `Tổng cộng ${totalCombos} tổ hợp, máy tính thử hết trong ${crackTime}`,
                    "Tổng cộng 100 tỷ tổ hợp, cần máy tính chạy liên tục 50 năm",
                    "Không thể bẻ khóa được vì chữ số được mã hóa lượng tử",
                    "Chỉ có đúng 10 tổ hợp duy nhất"
                ],
                0,
                `Mã số ${digits} chữ số chỉ có ${totalCombos} khả năng. Siêu máy tính ngày nay thử nghiệm hàng tỷ phép tính mỗi giây, giải mã gần như tức thì!`
            );
        },
        // 3.3 Rò rỉ dữ liệu (Data Breach) & Credential Stuffing
        function () {
            const svc = randomChoice(SERVICES);
            const count = randomChoice([20, 50, 100]);

            return makeQuestion(
                `Dịch vụ ${svc} vừa thông báo bị tấn công làm rò rỉ ${count} triệu tài khoản. Kỹ thuật 'Credential Stuffing' mà hacker sẽ thực hiện tiếp theo là gì?`,
                [
                    "Dùng danh sách mật khẩu vừa lộ để thử đăng nhập tự động hàng loạt vào các dịch vụ khác (Ngân hàng, Email, Mạng xã hội)",
                    "Xóa sạch toàn bộ hệ thống cáp quang biển quốc tế",
                    "Gửi tin nhắn xin lỗi và hoàn tiền cho người bị lộ",
                    "Tự động tăng gấp đôi tiền trong tài khoản của nạn nhân"
                ],
                0,
                "Credential Stuffing khai thác chính thói quen dùng chung mật khẩu của người dùng để tấn công dây chuyền sang các dịch vụ khác!"
            );
        },
        // 3.4 Băm mật khẩu (Hashing) & Salt (Muối bảo mật)
        function () {
            return makeQuestion(
                "Trong các hệ thống máy chủ bảo mật chuẩn, mật khẩu của người dùng được lưu trữ dưới dạng mã băm (Hash) kèm chuỗi ngẫu nhiên 'Salt' để làm gì?",
                [
                    "Để ngay cả khi cơ sở dữ liệu bị đánh cắp, hacker cũng không thể đọc được mật khẩu gốc hay tra bảng Rainbow Table",
                    "Để máy chủ tự động đăng bài lên mạng xã hội thay cho người dùng",
                    "Để nén dung lượng mật khẩu về đúng 1 byte",
                    "Để người dùng không cần nhập mật khẩu khi đăng nhập"
                ],
                0,
                "Kỹ thuật Băm một chiều (Hashing) + Thêm muối (Salt) đảm bảo quản trị viên hệ thống lẫn kẻ tấn công đều không thể khôi phục trực tiếp mật khẩu gốc."
            );
        },
        // 3.5 So sánh thời gian bẻ khóa giữa Passphrase dài và mật khẩu ngắn
        function () {
            return makeQuestion(
                "So sánh giữa mật khẩu ngắn 8 ký tự phức tạp (ví dụ: 'P@s1#x8!') và một Cụm mật khẩu 22 ký tự gồm 4 từ ngẫu nhiên (ví dụ: 'Ngua-Phi-Duong-Xa-2026!'), loại nào chống bẻ khóa Brute-force tốt hơn?",
                [
                    "Cụm mật khẩu 22 ký tự vượt trội hơn hàng triệu lần vì số lượng tổ hợp tăng theo hàm mũ của độ dài",
                    "Mật khẩu 8 ký tự an toàn hơn vì càng ngắn máy tính càng khó đoán",
                    "Hai loại này hoàn toàn giống nhau về độ bảo mật",
                    "Cả hai đều bị giải trong đúng 1 giây như nhau"
                ],
                0,
                "Độ dài là VUA trong an toàn mật khẩu! Mỗi ký tự thêm vào nhân số tổ hợp lên hàng chục lần, biến thời gian giải từ vài ngày thành hàng triệu năm."
            );
        }
    ];

    // ==========================================
    // HÀM CHÍNH SINH 3 CÂU HỎI CHO MỖI VÒNG
    // Đảm bảo không trùng lặp và mỗi câu hỏi đều mang dữ liệu random mới
    // ==========================================
    function generateStageQuestions(stageNumber) {
        let generators = [];
        if (stageNumber === 1) generators = [...stage1Generators];
        else if (stageNumber === 2) generators = [...stage2Generators];
        else if (stageNumber === 3) generators = [...stage3Generators];
        else generators = [...stage1Generators];

        const shuffledGen = shuffle(generators);
        const questions = [];
        for (let i = 0; i < 3; i++) {
            questions.push(shuffledGen[i]());
        }
        return questions;
    }

    // Export ra window
    window.QuestionGenerator = {
        generateStageQuestions: generateStageQuestions,
        generateWeakPassword: generateVeryWeakPassword,
        generateStrongPassword: generateStrongPassword,
        generatePassphrase: generatePassphrase
    };
})(window);
