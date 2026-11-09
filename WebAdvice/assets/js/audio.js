/**
 * ADVICE อ่างทอง - Sound Effects Engine
 * Web Audio API
 * 100% Offline Procedural Sound Effects
 */

class SoundEngine {
  constructor() {
    this.ctx = null;
    this.enabled = true;
    this.hasInteracted = false;

    // เก็บ Timer ของเสียงที่กำลังรอเล่น
    this.pendingTimers = new Set();

    // ป้องกันการสร้าง AudioContext ซ้ำ
    this.isInitializing = false;
  }

  // ══════════════════════════════════════════════════
  // INITIALIZE AUDIO
  // ══════════════════════════════════════════════════

  init() {
    try {
      if (!this.ctx) {
        const AudioCtx =
          window.AudioContext || window.webkitAudioContext;

        if (!AudioCtx) {
          console.warn('Browser ไม่รองรับ Web Audio API');
          return;
        }

        this.ctx = new AudioCtx();
      }

      if (this.ctx.state === 'suspended') {
        this.ctx.resume().catch(err => {
          console.warn('Audio resume error:', err);
        });
      }

      this.hasInteracted = true;

    } catch (err) {
      console.error('Audio initialization error:', err);
    }
  }

  // ══════════════════════════════════════════════════
  // AUDIO HELPERS
  // ══════════════════════════════════════════════════

  _ready() {
    if (!this.enabled) return false;

    this.init();

    return !!this.ctx && this.ctx.state !== 'closed';
  }

  _schedule(callback, delay) {
    const timer = setTimeout(() => {
      this.pendingTimers.delete(timer);

      if (!this.enabled || !this.ctx || this.ctx.state === 'closed') {
        return;
      }

      callback();
    }, delay);

    this.pendingTimers.add(timer);

    return timer;
  }

  _createOscillator(type = 'sine', frequency = 440, time = null) {
    if (!this.ctx) return null;

    const t = time ?? this.ctx.currentTime;

    const osc = this.ctx.createOscillator();

    osc.type = type;
    osc.frequency.setValueAtTime(frequency, t);

    return osc;
  }

  _createGain(volume = 0.2, time = null) {
    if (!this.ctx) return null;

    const t = time ?? this.ctx.currentTime;

    const gain = this.ctx.createGain();

    gain.gain.setValueAtTime(volume, t);

    return gain;
  }

  _playTone({
    frequency = 440,
    type = 'sine',
    volume = 0.2,
    duration = 0.2,
    endFrequency = null
  } = {}) {
    if (!this._ready()) return;

    try {
      const t = this.ctx.currentTime;

      const osc = this._createOscillator(type, frequency, t);
      const gain = this._createGain(volume, t);

      if (!osc || !gain) return;

      if (endFrequency !== null) {
        osc.frequency.exponentialRampToValueAtTime(
          Math.max(1, endFrequency),
          t + duration
        );
      }

      gain.gain.exponentialRampToValueAtTime(
        0.001,
        t + duration
      );

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start(t);
      osc.stop(t + duration);

      osc.onended = () => {
        try {
          osc.disconnect();
          gain.disconnect();
        } catch (_) {}
      };

    } catch (err) {
      console.warn('Tone playback error:', err);
    }
  }

  // ══════════════════════════════════════════════════
  // SOUND TOGGLE
  // ══════════════════════════════════════════════════

  toggle() {
    this.enabled = !this.enabled;

    return this.enabled;
  }

  // ══════════════════════════════════════════════════
  // CARD FLIP SOUND
  // ══════════════════════════════════════════════════

  playFlip() {
    if (!this._ready()) return;

    const t = this.ctx.currentTime;

    try {
      // Tone snap
      const osc = this._createOscillator('triangle', 140, t);
      const gain = this._createGain(0.3, t);

      osc.frequency.exponentialRampToValueAtTime(450, t + 0.05);
      osc.frequency.exponentialRampToValueAtTime(60, t + 0.12);

      gain.gain.exponentialRampToValueAtTime(0.01, t + 0.12);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start(t);
      osc.stop(t + 0.12);

      // Filtered noise pop
      this._playClick(t + 0.02, 0.15);

    } catch (err) {
      console.warn('Flip sound error:', err);
    }
  }

  // ══════════════════════════════════════════════════
  // TILE REVEAL CHIME
  // ══════════════════════════════════════════════════

  playChime(pitchMultiplier = 1) {
    if (!this._ready()) return;

    const t = this.ctx.currentTime;
    const baseFreq = 587.33 * pitchMultiplier;

    [baseFreq, baseFreq * 1.5, baseFreq * 2].forEach((freq, i) => {
      try {
        const osc = this._createOscillator('sine', freq, t);
        const gain = this._createGain(0.15 / (i + 1), t);

        gain.gain.exponentialRampToValueAtTime(
          0.001,
          t + 0.45
        );

        osc.connect(gain);
        gain.connect(this.ctx.destination);

        osc.start(t);
        osc.stop(t + 0.45);

        osc.onended = () => {
          try {
            osc.disconnect();
            gain.disconnect();
          } catch (_) {}
        };

      } catch (err) {
        console.warn('Chime error:', err);
      }
    });
  }

  // ══════════════════════════════════════════════════
  // SHUFFLE SOUND
  // ══════════════════════════════════════════════════

  playShuffle() {
    if (!this._ready()) return;

    const count = 10;

    for (let i = 0; i < count; i++) {
      this._schedule(() => {
        const t = this.ctx.currentTime;

        try {
          const osc = this._createOscillator(
            'sine',
            200 + Math.random() * 300,
            t
          );

          const gain = this._createGain(0.12, t);

          osc.frequency.exponentialRampToValueAtTime(
            100,
            t + 0.04
          );

          gain.gain.exponentialRampToValueAtTime(
            0.001,
            t + 0.04
          );

          osc.connect(gain);
          gain.connect(this.ctx.destination);

          osc.start(t);
          osc.stop(t + 0.04);

        } catch (err) {
          console.warn('Shuffle sound error:', err);
        }

      }, i * 35);
    }
  }

  // ══════════════════════════════════════════════════
  // WHOOSH SOUND
  // ══════════════════════════════════════════════════

  playWhoosh() {
    this._playTone({
      frequency: 400,
      type: 'sine',
      volume: 0.25,
      duration: 0.25,
      endFrequency: 90
    });
  }

  // ══════════════════════════════════════════════════
  // VICTORY / GAME SHOW FANFARE
  // ══════════════════════════════════════════════════

  playFanfare() {
    if (!this._ready()) return;

    const notes = [523.25, 659.25, 783.99, 1046.50];
    const delays = [0, 0.1, 0.2, 0.35];

    notes.forEach((freq, idx) => {
      this._schedule(() => {
        const duration = idx === notes.length - 1 ? 0.9 : 0.25;

        this._playTone({
          frequency: freq,
          type: 'triangle',
          volume: 0.25,
          duration
        });

      }, delays[idx] * 1000);
    });
  }

  // ══════════════════════════════════════════════════
  // CORRECT ANSWER
  // ══════════════════════════════════════════════════

  playCorrect() {
    if (!this._ready()) return;

    const notes = [659.25, 880.00];
    const delays = [0, 0.15];

    notes.forEach((freq, i) => {
      this._schedule(() => {
        this._playTone({
          frequency: freq,
          type: 'sine',
          volume: 0.3,
          duration: 0.6
        });

      }, delays[i] * 1000);
    });
  }

  // ══════════════════════════════════════════════════
  // WRONG ANSWER
  // ══════════════════════════════════════════════════

  playWrong() {
    if (!this._ready()) return;

    [0, 0.18].forEach(delay => {
      this._schedule(() => {
        if (!this.ctx) return;

        const t = this.ctx.currentTime;

        try {
          const osc = this._createOscillator(
            'sawtooth',
            125,
            t
          );

          const gain = this._createGain(0.25, t);

          osc.frequency.linearRampToValueAtTime(
            110,
            t + 0.14
          );

          gain.gain.exponentialRampToValueAtTime(
            0.001,
            t + 0.14
          );

          osc.connect(gain);
          gain.connect(this.ctx.destination);

          osc.start(t);
          osc.stop(t + 0.14);

        } catch (err) {
          console.warn('Wrong sound error:', err);
        }

      }, delay * 1000);
    });
  }

  // ══════════════════════════════════════════════════
  // SUSPENSE DRUMROLL
  // ══════════════════════════════════════════════════

  playDrumroll() {
    if (!this._ready()) return;

    const beats = 16;

    for (let i = 0; i < beats; i++) {
      const delay = Math.pow(i / beats, 0.8) * 1.4;

      this._schedule(() => {
        if (!this.ctx) return;

        const t = this.ctx.currentTime;

        try {
          const osc = this._createOscillator(
            'triangle',
            80 + (i * 4),
            t
          );

          const gain = this._createGain(
            0.2 + (i / beats) * 0.2,
            t
          );

          osc.frequency.exponentialRampToValueAtTime(
            40,
            t + 0.08
          );

          gain.gain.exponentialRampToValueAtTime(
            0.001,
            t + 0.08
          );

          osc.connect(gain);
          gain.connect(this.ctx.destination);

          osc.start(t);
          osc.stop(t + 0.08);

        } catch (err) {
          console.warn('Drumroll error:', err);
        }

      }, delay * 1000);
    }
  }

  // ══════════════════════════════════════════════════
  // INTERNAL CLICK SOUND
  // ══════════════════════════════════════════════════

  _playClick(startTime, volume = 0.1) {
    if (!this.ctx || !this.enabled) return;

    try {
      const bufferSize = Math.floor(this.ctx.sampleRate * 0.03);

      const buffer = this.ctx.createBuffer(
        1,
        bufferSize,
        this.ctx.sampleRate
      );

      const data = buffer.getChannelData(0);

      for (let i = 0; i < bufferSize; i++) {
        data[i] =
          (Math.random() * 2 - 1) *
          Math.exp(-i / (bufferSize * 0.3));
      }

      const noise = this.ctx.createBufferSource();
      noise.buffer = buffer;

      const filter = this.ctx.createBiquadFilter();

      filter.type = 'bandpass';
      filter.frequency.value = 1200;

      const gain = this.ctx.createGain();

      gain.gain.setValueAtTime(volume, startTime);

      gain.gain.exponentialRampToValueAtTime(
        0.001,
        startTime + 0.03
      );

      noise.connect(filter);
      filter.connect(gain);
      gain.connect(this.ctx.destination);

      noise.start(startTime);
      noise.stop(startTime + 0.03);

      noise.onended = () => {
        try {
          noise.disconnect();
          filter.disconnect();
          gain.disconnect();
        } catch (_) {}
      };

    } catch (err) {
      console.warn('Click sound error:', err);
    }
  }

  // ══════════════════════════════════════════════════
  // STOP PENDING SOUNDS
  // ══════════════════════════════════════════════════

  stopPendingSounds() {
    this.pendingTimers.forEach(timer => clearTimeout(timer));
    this.pendingTimers.clear();
  }

  // ══════════════════════════════════════════════════
  // CLEANUP
  // ══════════════════════════════════════════════════

  async destroy() {
    this.stopPendingSounds();

    if (this.ctx && this.ctx.state !== 'closed') {
      try {
        await this.ctx.close();
      } catch (err) {
        console.warn('Audio cleanup error:', err);
      }
    }

    this.ctx = null;
    this.hasInteracted = false;
  }
}

// ══════════════════════════════════════════════════
// GLOBAL SOUND ENGINE
// ══════════════════════════════════════════════════

window.soundEngine = new SoundEngine();
