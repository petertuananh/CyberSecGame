# 🎮 VỆ BINH MẬT KHẨU - CYBERSEC PASSWORD GUARDIAN
> **Game Pixel về Độ Mạnh Mật Khẩu (Password Strength) chạy trên máy tính kết nối 5 nút bấm Arduino**  
> *Đồng hành và phát triển: **Trường THCS Nguyễn Bỉnh Khiêm** × **SoftLab***

---

## 🌟 TỔNG QUAN DỰ ÁN
Dự án được xây dựng theo phong cách **Retro Pixel Art 16-bit Arcade** kết hợp hiệu ứng âm thanh 8-bit sống động, phục vụ cho việc học tập, triển lãm hoặc sự kiện an ninh mạng tương tác với phần cứng vật lý qua Arduino.
Tích hợp logo thương hiệu pixel của **Trường THCS Nguyễn Bỉnh Khiêm** và **SoftLab**.

### 🎯 Điểm nổi bật:
- **Ứng dụng Desktop Độc Lập (.exe)**: Mở cửa sổ game chuyên dụng riêng biệt như ứng dụng Electron Desktop, không viền trình duyệt.
- **Cơ chế Dự phòng Thông minh (Fallback)**: Trường hợp không mở được cửa sổ riêng, ứng dụng sẽ hiện hộp thoại hỏi ý kiến người dùng và mở trên trình duyệt web mặc định.
- **Hệ thống Cốt truyện (RPG Story Mode)**: Nhân vật Vệ Binh tự giới thiệu qua 5 hồi truyện, hiệu ứng gõ phím máy chữ cổ điển, âm thanh blip 8-bit.
- **Thời tiết Động (Dynamic Weather)**: Nắng vàng, mưa rào, tuyết rơi, bão tố tự động luân chuyển; nhân vật tự thay đổi trang phục (áo ấm, che dù, nón rơm) và cây cối, mặt nước, tầng mây phản ứng theo thời tiết.
- **Giao diện Tối ưu Fullscreen FHD**: Chế độ phóng to toàn màn hình pixel-perfect cho màn hình laptop Full HD (1920x1080), con trỏ chuột hiệu ứng sao lấp lánh (particle trail).
- **Câu hỏi & Dữ liệu Random 100%**: Mỗi lượt chơi đều sinh câu hỏi ngẫu nhiên và **dữ liệu mật khẩu hoàn toàn ngẫu nhiên** (độ dài, ký tự đặc biệt, tên người dùng, kịch bản Phishing, Passphrase...).
- **Hỗ trợ 3 kênh điều khiển song song**:
  - **1. Bo mạch Arduino**: 5 nút bấm vật lý Arcade **A**, **B**, **C**, **D** và **ENTER**.
  - **2. Tay Cầm Điện Thoại (Live Tunnel & QR Code)**: Tự động tạo Live Tunnel (Internet / 4G) và mạng LAN (Wi-Fi), quét mã QR trên màn hình bằng điện thoại để điều khiển ngay. Nhiều người có thể quét và bấm song song cùng lúc!
  - **3. Bàn phím máy tính PC**: Phím `A`, `B`, `C`, `D`, `ENTER`, `SPACE`, `F` (Fullscreen), `ESC` (Bỏ qua truyện), `W` (Đổi thời tiết).

---

## 🕹️ LUẬT CHƠI CHI TIẾT

```mermaid
flowchart TD
    Start["Bắt đầu Game (Ấn ENTER)"] --> Story["📖 CỐT TRUYỆN MỞ ĐẦU (5 Hồi Tự Giới Thiệu)"]
    Story --> S1["VÒNG 1: KHU RỪNG MẬT MÃ 🌲<br/>(3 câu ngẫu nhiên về Độ dài & Độ phức tạp)"]
    S1 --> S1_Check{"Đúng 3/3 câu?"}
    S1_Check -- "Đạt" --> Dice1["🎲 LẮC XÚC XẮC 1"]
    S1_Check -- "Chưa đạt" --> S1_Retry["Thử thách lại Vòng 1"]
    S1_Retry --> S1

    Dice1 --> D1_Val{"Xúc xắc ra số gì?"}
    D1_Val -- "Số LẺ (1, 3, 5)" --> S2["Đi tiếp bình thường"]
    D1_Val -- "Số CHẴN (2, 4, 6)" --> Card1["🃏 BỐC THẺ BÍ ẨN<br/>(Tặng 1-3 Hoa Hồng hoặc Thử Thách)"]
    Card1 --> S2

    S2["VÒNG 2: VÙNG BIỂN DỮ LIỆU 🌊<br/>(3 câu ngẫu nhiên về Quản lý, 2FA, Phishing)"]
    S2 --> S2_Check{"Đúng 3/3 câu?"}
    S2_Check -- "Đạt" --> Dice2["🎲 LẮC XÚC XẮC 2"]
    S2_Check -- "Chưa đạt" --> S2_Retry["Thử thách lại Vòng 2"]
    S2_Retry --> S2

    Dice2 --> D2_Val{"Xúc xắc ra số gì?"}
    D2_Val -- "Số LẺ (1, 3, 5)" --> S3["Đi tiếp bình thường"]
    D2_Val -- "Số CHẴN (2, 4, 6)" --> Card2["🃏 BỐC THẺ BÍ ẨN<br/>(Tặng 1-3 Hoa Hồng hoặc Thử Thách)"]
    Card2 --> S3

    S3["VÒNG 3: TẦNG MÂY THƯỢNG ĐỈNH ☁️<br/>(3 câu ngẫu nhiên về Passphrase, Brute-Force, Breach)"]
    S3 --> S3_Check{"Đúng 3/3 câu?"}
    S3_Check -- "Đạt" --> BossIntro["🐉 CẢNH BÁO BOSS RỒNG!"]
    S3_Check -- "Chưa đạt" --> S3_Retry["Thử thách lại Vòng 3"]
    S3_Retry --> S3

    BossIntro --> BossBattle["⚔️ ĐẤU BOSS RỒNG (Whack-a-Mole)<br/>- Rồng xuất hiện ngẫu nhiên ở 4 vị trí A, B, C, D<br/>- Bấm đúng nút để bắn hoa hồng vào Rồng<br/>- Cần >= 9 bông hồng để hạ gục"]

    BossBattle --> BossResult{"Kết quả trận đấu?"}
    BossResult -- "Hạ gục 9 HP Rồng" --> Win["🏆 CHIẾN THẮNG (WIN GAME)<br/>Mở Rương Kho Báu Mật Mã Hoàng Kim!"]
    BossResult -- "Hết hoa hồng / Bị phản công" --> Lose["💀 GAME OVER<br/>Bị ném rơi xuống Vực Thung Lũng!"]
```

### 1. 3 Vòng Chơi (Rừng - Nước - Mây)
- **Vòng 1: Khu Rừng Mật Mã (Forest)**: Nguyên tắc cơ bản tạo mật khẩu (Độ dài, ký tự hoa/thường/số/ký tự đặc biệt, phát hiện mật khẩu yếu, rủi ro ngày sinh/tên riêng).
- **Vòng 2: Vùng Biển Dữ Liệu (Water)**: Cạm bẫy lừa đảo Phishing giả mạo ngân hàng/mạng xã hội, bảo vệ bằng Xác thực 2 bước (2FA), dùng Trình quản lý mật khẩu (Password Manager), wifi công cộng.
- **Vòng 3: Tầng Mây Thượng Đỉnh (Cloud)**: Khái niệm Passphrase (Cụm mật khẩu), tấn công vét cạn Brute-force & số lượng tổ hợp, rò rỉ cơ sở dữ liệu (Data Breach) và tấn công nhồi thông tin (Credential Stuffing).

### 2. Điểm thưởng Hoa hồng & Xúc xắc - Thẻ bài
- Mỗi câu đúng: **+1 Bông Hồng** 🌹 (Sai câu nào: **0 Bông Hồng**).
- Trả lời đúng cả 3 câu thì pass màn.
- Sau mỗi màn: **Lắc Xúc Xắc (1-6)**:
  - **Số Lẻ (1, 3, 5)**: Đường đi an toàn, tiếp tục vào vòng sau.
  - **Số Chẵn (2, 4, 6)**: Kích hoạt **Bốc Thẻ Ma Thuật**:
    - *Kho Báu Mũ Trắng*: Tặng **+1** hoa hồng.
    - *Tường Lửa Hoàng Kim*: Tặng **+2** hoa hồng.
    - *Thần Hộ Mệnh 2FA*: Tặng **+3** hoa hồng.
    - *Bão Mã Độc*: Rơi mất **-1** hoa hồng.

### 3. Trận Đánh Boss Rồng (Final Boss Battle)
- Boss Rồng có **9 Máu (HP)**. Người chơi cần tích lũy tối thiểu **$\ge 9$ bông hồng** để có đủ hỏa lực tiêu diệt Boss!
- Rồng xuất hiện ngẫu nhiên ở 1 trong 4 cổng tương ứng với 4 nút:
  - **Vị trí [A]**: Cổng trên bên trái
  - **Vị trí [B]**: Cổng trên bên phải
  - **Vị trí [C]**: Cổng dưới bên trái
  - **Vị trí [D]**: Cổng dưới bên phải
- Mỗi lần Rồng xuất hiện, thanh thời gian phản xạ giảm dần. Người chơi phải bấm nhanh nút tương ứng (A, B, C, D) để phóng hoa hồng bắn trúng Rồng (cơ chế bắn bia / whack-a-mole).
- **Nếu bắn trúng 9 lần**: Rồng tan biến, mở bung **Rương Kho Báu Mật Mã Hoàng Kim** rực rỡ $\rightarrow$ **CHIẾN THẮNG!**
- **Nếu hết hoa hồng mà Rồng chưa chết**: Rồng khạc lửa hất tung người chơi rơi thẳng xuống **Thung Lũng vực thẳm** $\rightarrow$ **GAME OVER!**

---

## 🔌 SƠ ĐỒ ĐẤU DÂY ARDUINO (WIRING DIAGRAM)

Dự án sử dụng cơ chế **`INPUT_PULLUP`** của Arduino, do đó **KHÔNG CẦN BẤT KỲ ĐIỆN TRỞ RỜI NÀO**!
Bạn chỉ cần nối trực tiếp 5 nút bấm cơ (nút bấm arcade hoặc nút nhấn 2 chân) như sau:

| Tên Nút Bấm | Chân Trên Arduino | Chân Còn Lại Của Nút | Chức Năng Trong Game |
| :--- | :---: | :---: | :--- |
| **Nút A** | **Chân D2** | **GND** | Chọn đáp án A / Bắn Boss ở vị trí A |
| **Nút B** | **Chân D3** | **GND** | Chọn đáp án B / Bắn Boss ở vị trí B |
| **Nút C** | **Chân D4** | **GND** | Chọn đáp án C / Bắn Boss ở vị trí C |
| **Nút D** | **Chân D5** | **GND** | Chọn đáp án D / Bắn Boss ở vị trí D |
| **Nút ENTER** | **Chân D6** | **GND** | Bắt đầu, Mở cửa, Lắc xúc xắc, Bốc thẻ bài, Đọc cốt truyện |

> 💡 *Gợi ý: Tất cả chân thứ 2 của 5 nút bấm có thể nối chụm lại với nhau rồi cắm vào 1 chân `GND` bất kỳ trên bo mạch Arduino.*

---

## 🚀 HƯỚNG DẪN CÀI ĐẶT & CHẠY GAME

### Cách 1: Cài đặt vào máy tính bằng File Cài Đặt Setup (Khuyên dùng)
1. Tải hoặc gửi file **`dist/CyberSecGame_Setup.exe`** (dung lượng ~79MB).
2. Nhấp đúp vào file setup để mở trình cài đặt Windows:
   - Tự động tạo biểu tượng ngoài màn hình Desktop (**Vệ Binh Mật Khẩu**).
   - Tự động thêm vào Menu Start của Windows.
   - Có thể gỡ cài đặt sạch sẽ bất kỳ lúc nào trong `Windows Settings > Apps`.
3. Nhấp đúp vào icon ngoài Desktop là vào chơi ngay!

### Cách 2: Chạy file `.exe` trực tiếp (Nhanh nhất khi chạy từ mã nguồn)
1. Nhấp đúp vào file [CyberSecGame.exe](file:///c:/Users/peter/Downloads/CyberSecGame/CyberSecGame.exe) ngay tại thư mục gốc.
2. Ứng dụng sẽ tự động kích hoạt server và mở cửa sổ game riêng biệt (không thanh địa chỉ trình duyệt).
3. Nếu máy không hỗ trợ cửa sổ riêng, ứng dụng sẽ hiện hộp thoại hỏi người dùng và tự động chuyển hướng mở trên trình duyệt mặc định.

### Cách 3: Chạy bản đóng gói Portable ZIP (Để chép USB mang đi)
- Bản đã đóng gói sẵn: `dist/CyberSecGame-win32-x64/CyberSecGame.exe`
- File nén gửi tặng: `dist/CyberSecGame-Windows-x64.zip` (giải nén ra là chạy ngay, không cần cài đặt Node.js hay quyền Administrator).
- Để đóng gói lại toàn bộ bất kỳ lúc nào: Nhấp đúp file [build_exe.bat](file:///c:/Users/peter/Downloads/CyberSecGame/build_exe.bat).

### Cách 4: Chạy bằng dòng lệnh truyền thống
1. Mở Terminal / PowerShell:
   ```bash
   npm start
   ```
2. Mở trình duyệt web truy cập: **`http://localhost:3000`**
