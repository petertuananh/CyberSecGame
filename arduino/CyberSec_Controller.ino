/*
  ====================================================================================
  DỰ ÁN: VỆ BINH MẬT KHẨU - CYBERSEC PASSWORD GUARDIAN
  MÃ NGUỒN ARDUINO ĐIỀU KHIỂN 5 NÚT BẤM VẬT LÝ (A, B, C, D, ENTER)
  ====================================================================================
  
  SƠ ĐỒ ĐẤU DÂY (WIRING DIAGRAM):
  ------------------------------------------------------------------------------------
  Sử dụng điện trở kéo lên nội bộ (INPUT_PULLUP), KHÔNG CẦN gắn thêm bất kỳ điện trở rời nào!
  Mỗi nút bấm chỉ cần nối 2 chân:
    1. Một chân nút bấm -> Nối vào chân Digital tương ứng (D2, D3, D4, D5, D6)
    2. Chân còn lại của nút bấm -> Nối chung vào chân GND của Arduino.

  CHI TIẾT CHÂN KẾT NỐI:
    - NÚT A     -> Chân Digital 2 (D2)  và  GND
    - NÚT B     -> Chân Digital 3 (D3)  và  GND
    - NÚT C     -> Chân Digital 4 (D4)  và  GND
    - NÚT D     -> Chân Digital 5 (D5)  và  GND
    - NÚT ENTER -> Chân Digital 6 (D6)  và  GND

  TỐC ĐỘ BAUD: 115200 (hoặc 9600 nếu chỉnh trong config)
  ====================================================================================
*/

// Định nghĩa các chân Digital
const int PIN_BTN_A = 2;
const int PIN_BTN_B = 3;
const int PIN_BTN_C = 4;
const int PIN_BTN_D = 5;
const int PIN_BTN_ENTER = 6;

// Cấu trúc quản lý trạng thái và chống dội phím (Debounce)
struct Button {
  int pin;
  const char* name;
  bool lastState;
  unsigned long lastDebounceTime;
};

Button buttons[] = {
  { PIN_BTN_A,     "A",     HIGH, 0 },
  { PIN_BTN_B,     "B",     HIGH, 0 },
  { PIN_BTN_C,     "C",     HIGH, 0 },
  { PIN_BTN_D,     "D",     HIGH, 0 },
  { PIN_BTN_ENTER, "ENTER", HIGH, 0 }
};

const int NUM_BUTTONS = sizeof(buttons) / sizeof(buttons[0]);
const unsigned long DEBOUNCE_DELAY = 50; // 50ms chống rung phím cực nhạy và ổn định

void setup() {
  // Khởi động cổng Serial tốc độ cao 115200
  Serial.begin(115200);

  // Khởi tạo các chân nút bấm với INPUT_PULLUP
  for (int i = 0; i < NUM_BUTTONS; i++) {
    pinMode(buttons[i].pin, INPUT_PULLUP);
    buttons[i].lastState = digitalRead(buttons[i].pin);
  }

  // Nhấp nháy đèn LED tích hợp trên bo để báo sẵn sàng
  pinMode(LED_BUILTIN, OUTPUT);
  for (int i = 0; i < 3; i++) {
    digitalWrite(LED_BUILTIN, HIGH);
    delay(100);
    digitalWrite(LED_BUILTIN, LOW);
    delay(100);
  }

  Serial.println("ARDUINO_CYBERSEC_CONTROLLER_READY");
}

void loop() {
  unsigned long currentTime = millis();

  for (int i = 0; i < NUM_BUTTONS; i++) {
    int reading = digitalRead(buttons[i].pin);

    // Khi nút bấm được nhấn (tín hiệu kéo xuống LOW vì dùng INPUT_PULLUP)
    if (reading != buttons[i].lastState) {
      if ((currentTime - buttons[i].lastDebounceTime) > DEBOUNCE_DELAY) {
        if (reading == LOW) {
          // Bật đèn LED trên Arduino báo nhận nút
          digitalWrite(LED_BUILTIN, HIGH);

          // Gửi tên nút bấm qua cổng Serial kèm xuống dòng \r\n
          Serial.println(buttons[i].name);

          digitalWrite(LED_BUILTIN, LOW);
        }
        buttons[i].lastDebounceTime = currentTime;
      }
      buttons[i].lastState = reading;
    }
  }
}
