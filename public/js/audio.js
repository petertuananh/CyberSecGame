/**
 * Bộ tạo âm thanh Pixel Retro 8-bit thời gian thực bằng Web Audio API
 * Không phụ thuộc file âm thanh bên ngoài, không độ trễ, âm thanh arcade chuẩn mực
 */

class SoundEngine {
    constructor() {
        this.ctx = null;
        this.enabled = true;
    }

    _initContext() {
        if (!this.ctx) {
            const AudioContext = window.AudioContext || window.webkitAudioContext;
            this.ctx = new AudioContext();
        }
        if (this.ctx.state === 'suspended') {
            this.ctx.resume();
        }
    }

    play(name) {
        if (!this.enabled) return;
        try {
            this._initContext();
            if (this[name]) {
                this[name]();
            }
        } catch (e) {
            console.warn("Sound error:", e);
        }
    }

    // 1. Phím bấm / Select
    click() {
        const ctx = this.ctx;
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = "sine";
        osc.frequency.setValueAtTime(700, ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(350, ctx.currentTime + 0.05);

        gain.gain.setValueAtTime(0.2, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.05);

        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start();
        osc.stop(ctx.currentTime + 0.05);
    }

    // 2. Trả lời đúng (Arpeggio chuông 8-bit vui tươi)
    correct() {
        const ctx = this.ctx;
        const notes = [523.25, 659.25, 783.99, 1046.50]; // C5, E5, G5, C6
        notes.forEach((freq, idx) => {
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            const start = ctx.currentTime + idx * 0.07;
            const dur = 0.12;

            osc.type = "square";
            osc.frequency.setValueAtTime(freq, start);

            gain.gain.setValueAtTime(0.15, start);
            gain.gain.exponentialRampToValueAtTime(0.001, start + dur);

            osc.connect(gain);
            gain.connect(ctx.destination);
            osc.start(start);
            osc.stop(start + dur);
        });
    }

    // 3. Trả lời sai (Buzzer trầm)
    wrong() {
        const ctx = this.ctx;
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = "sawtooth";
        osc.frequency.setValueAtTime(140, ctx.currentTime);
        osc.frequency.linearRampToValueAtTime(100, ctx.currentTime + 0.3);

        gain.gain.setValueAtTime(0.25, ctx.currentTime);
        gain.gain.linearRampToValueAtTime(0.01, ctx.currentTime + 0.3);

        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start();
        osc.stop(ctx.currentTime + 0.3);
    }

    // 4. Lắc xúc xắc (Tiếng lách cách gieo hạt xúc xắc)
    dice() {
        const ctx = this.ctx;
        for (let i = 0; i < 6; i++) {
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            const start = ctx.currentTime + i * 0.06;
            osc.type = "triangle";
            osc.frequency.setValueAtTime(300 + Math.random() * 400, start);

            gain.gain.setValueAtTime(0.2, start);
            gain.gain.exponentialRampToValueAtTime(0.01, start + 0.04);

            osc.connect(gain);
            gain.connect(ctx.destination);
            osc.start(start);
            osc.stop(start + 0.04);
        }
    }

    // 5. Bốc thẻ may mắn (Tiếng lật thẻ ma thuật)
    card() {
        const ctx = this.ctx;
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = "sine";
        osc.frequency.setValueAtTime(350, ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(1100, ctx.currentTime + 0.25);

        gain.gain.setValueAtTime(0.25, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.25);

        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start();
        osc.stop(ctx.currentTime + 0.25);
    }

    // 6. Phóng hoa hồng (Pew whoosh)
    shoot() {
        const ctx = this.ctx;
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = "square";
        osc.frequency.setValueAtTime(950, ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(200, ctx.currentTime + 0.18);

        gain.gain.setValueAtTime(0.2, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.18);

        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start();
        osc.stop(ctx.currentTime + 0.18);
    }

    // 7. Boss trúng đòn (Nổ va chạm mạnh)
    hit() {
        const ctx = this.ctx;
        // White noise burst + low sine
        const bufferSize = ctx.sampleRate * 0.25;
        const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
        const data = buffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) {
            data[i] = Math.random() * 2 - 1;
        }

        const noise = ctx.createBufferSource();
        noise.buffer = buffer;

        const filter = ctx.createBiquadFilter();
        filter.type = "lowpass";
        filter.frequency.setValueAtTime(600, ctx.currentTime);
        filter.frequency.exponentialRampToValueAtTime(50, ctx.currentTime + 0.25);

        const gain = ctx.createGain();
        gain.gain.setValueAtTime(0.4, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.25);

        noise.connect(filter);
        filter.connect(gain);
        gain.connect(ctx.destination);
        noise.start();
        noise.stop(ctx.currentTime + 0.25);
    }

    // 8. Tiếng rồng gầm (Roar)
    roar() {
        const ctx = this.ctx;
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = "sawtooth";
        osc.frequency.setValueAtTime(90, ctx.currentTime);
        osc.frequency.linearRampToValueAtTime(140, ctx.currentTime + 0.2);
        osc.frequency.exponentialRampToValueAtTime(60, ctx.currentTime + 0.6);

        gain.gain.setValueAtTime(0.35, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.6);

        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start();
        osc.stop(ctx.currentTime + 0.6);
    }

    // 9. Chiến thắng (Victory Fanfare hào hùng)
    victory() {
        const ctx = this.ctx;
        const fanfare = [
            { f: 523.25, d: 0.15, pause: 0.15 },
            { f: 659.25, d: 0.15, pause: 0.15 },
            { f: 783.99, d: 0.15, pause: 0.15 },
            { f: 1046.50, d: 0.35, pause: 0.35 },
            { f: 880.00, d: 0.2, pause: 0.2 },
            { f: 1046.50, d: 0.6, pause: 0.6 }
        ];

        let offset = 0;
        fanfare.forEach(note => {
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            const start = ctx.currentTime + offset;

            osc.type = "triangle";
            osc.frequency.setValueAtTime(note.f, start);

            gain.gain.setValueAtTime(0.25, start);
            gain.gain.exponentialRampToValueAtTime(0.01, start + note.d);

            osc.connect(gain);
            gain.connect(ctx.destination);
            osc.start(start);
            osc.stop(start + note.d);

            offset += note.pause;
        });
    }

    // 10. Thất bại - Rơi xuống thung lũng (Rơi từ trên cao xuống và va chạm)
    gameOver() {
        const ctx = this.ctx;
        // Slide down whistle
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = "sine";
        osc.frequency.setValueAtTime(700, ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(80, ctx.currentTime + 0.8);

        gain.gain.setValueAtTime(0.3, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.05, ctx.currentTime + 0.8);

        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start();
        osc.stop(ctx.currentTime + 0.8);

        // Thud at 0.8s
        setTimeout(() => {
            if (!this.ctx) return;
            const thud = this.ctx.createOscillator();
            const thudGain = this.ctx.createGain();
            thud.type = "triangle";
            thud.frequency.setValueAtTime(80, this.ctx.currentTime);
            thud.frequency.exponentialRampToValueAtTime(30, this.ctx.currentTime + 0.4);

            thudGain.gain.setValueAtTime(0.4, this.ctx.currentTime);
            thudGain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 0.4);

            thud.connect(thudGain);
            thudGain.connect(this.ctx.destination);
            thud.start();
            thud.stop(this.ctx.currentTime + 0.4);
        }, 800);
    }
}

window.SoundEngine = new SoundEngine();
