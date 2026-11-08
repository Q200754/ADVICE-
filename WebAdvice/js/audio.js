/**
 * ADVICE อ่างทอง - Sound Effects Engine
 * Uses Web Audio API for 100% offline, zero-latency procedural sound effects
 */

class SoundEngine {
  constructor() {
    this.ctx = null;
    this.enabled = true;
    this.hasInteracted = false;
  }

  init() {
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  toggle() {
    this.enabled = !this.enabled;
    return this.enabled;
  }

  // Card Flip Sound (crisp mechanical snap + air whoosh)
  playFlip() {
    if (!this.enabled) return;
    this.init();
    if (!this.ctx) return;

    const t = this.ctx.currentTime;
    
    // Tone snap
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(140, t);
    osc.frequency.exponentialRampToValueAtTime(450, t + 0.05);
    osc.frequency.exponentialRampToValueAtTime(60, t + 0.12);

    gain.gain.setValueAtTime(0.3, t);
    gain.gain.exponentialRampToValueAtTime(0.01, t + 0.12);

    osc.connect(gain);
    gain.connect(this.ctx.destination);

    osc.start(t);
    osc.stop(t + 0.12);

    // Filtered noise pop
    this._playClick(t + 0.02, 0.15);
  }

  // Tile Reveal Chime (crystal bell chime when revealed)
  playChime(pitchMultiplier = 1) {
    if (!this.enabled) return;
    this.init();
    if (!this.ctx) return;

    const t = this.ctx.currentTime;
    const baseFreq = 587.33 * pitchMultiplier; // D5

    [baseFreq, baseFreq * 1.5, baseFreq * 2].forEach((freq, i) => {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, t);

      const vol = 0.15 / (i + 1);
      gain.gain.setValueAtTime(vol, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.45);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start(t);
      osc.stop(t + 0.45);
    });
  }

  // Shuffle Flutter Sound (rapid card deck flutter)
  playShuffle() {
    if (!this.enabled) return;
    this.init();
    if (!this.ctx) return;

    const count = 10;
    for (let i = 0; i < count; i++) {
      setTimeout(() => {
        if (!this.enabled || !this.ctx) return;
        const t = this.ctx.currentTime;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        osc.type = 'sine';
        osc.frequency.setValueAtTime(200 + Math.random() * 300, t);
        osc.frequency.exponentialRampToValueAtTime(100, t + 0.04);

        gain.gain.setValueAtTime(0.12, t);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.04);

        osc.connect(gain);
        gain.connect(this.ctx.destination);

        osc.start(t);
        osc.stop(t + 0.04);
      }, i * 35);
    }
  }

  // Whoosh Sound (for Closing All Tiles)
  playWhoosh() {
    if (!this.enabled) return;
    this.init();
    if (!this.ctx) return;

    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(400, t);
    osc.frequency.exponentialRampToValueAtTime(90, t + 0.25);

    gain.gain.setValueAtTime(0.25, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.25);

    osc.connect(gain);
    gain.connect(this.ctx.destination);

    osc.start(t);
    osc.stop(t + 0.25);
  }

  // Victory / Game Show Fanfare
  playFanfare() {
    if (!this.enabled) return;
    this.init();
    if (!this.ctx) return;

    // Arpeggio: C5, E5, G5, C6 triumphant chord
    const notes = [523.25, 659.25, 783.99, 1046.50];
    const delays = [0, 0.1, 0.2, 0.35];

    notes.forEach((freq, idx) => {
      setTimeout(() => {
        if (!this.enabled || !this.ctx) return;
        const t = this.ctx.currentTime;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        osc.type = 'triangle';
        osc.frequency.setValueAtTime(freq, t);

        const duration = (idx === notes.length - 1) ? 0.9 : 0.25;
        gain.gain.setValueAtTime(0.25, t);
        gain.gain.exponentialRampToValueAtTime(0.001, t + duration);

        osc.connect(gain);
        gain.connect(this.ctx.destination);

        osc.start(t);
        osc.stop(t + duration);
      }, delays[idx] * 1000);
    });
  }

  // Correct Answer (Ding-Dong! High-pitched cheerful bells)
  playCorrect() {
    if (!this.enabled) return;
    this.init();
    if (!this.ctx) return;

    const t = this.ctx.currentTime;
    const notes = [659.25, 880.00]; // E5, A5
    const delays = [0, 0.15];

    notes.forEach((freq, i) => {
      setTimeout(() => {
        if (!this.enabled || !this.ctx) return;
        const ct = this.ctx.currentTime;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, ct);

        gain.gain.setValueAtTime(0.3, ct);
        gain.gain.exponentialRampToValueAtTime(0.001, ct + 0.6);

        osc.connect(gain);
        gain.connect(this.ctx.destination);

        osc.start(ct);
        osc.stop(ct + 0.6);
      }, delays[i] * 1000);
    });
  }

  // Wrong Answer / Buzzer (Two low, buzzy saw waves)
  playWrong() {
    if (!this.enabled) return;
    this.init();
    if (!this.ctx) return;

    const t = this.ctx.currentTime;
    [0, 0.18].forEach(delay => {
      setTimeout(() => {
        if (!this.enabled || !this.ctx) return;
        const ct = this.ctx.currentTime;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(125, ct);
        osc.frequency.linearRampToValueAtTime(110, ct + 0.14);

        gain.gain.setValueAtTime(0.25, ct);
        gain.gain.exponentialRampToValueAtTime(0.001, ct + 0.14);

        osc.connect(gain);
        gain.connect(this.ctx.destination);

        osc.start(ct);
        osc.stop(ct + 0.14);
      }, delay * 1000);
    });
  }

  // Suspense Drumroll / Tension pulse
  playDrumroll() {
    if (!this.enabled) return;
    this.init();
    if (!this.ctx) return;

    const beats = 16;
    for (let i = 0; i < beats; i++) {
      const delay = Math.pow(i / beats, 0.8) * 1.4;
      setTimeout(() => {
        if (!this.enabled || !this.ctx) return;
        const ct = this.ctx.currentTime;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        osc.type = 'triangle';
        osc.frequency.setValueAtTime(80 + (i * 4), ct);
        osc.frequency.exponentialRampToValueAtTime(40, ct + 0.08);

        gain.gain.setValueAtTime(0.2 + (i / beats) * 0.2, ct);
        gain.gain.exponentialRampToValueAtTime(0.001, ct + 0.08);

        osc.connect(gain);
        gain.connect(this.ctx.destination);

        osc.start(ct);
        osc.stop(ct + 0.08);
      }, delay * 1000);
    }
  }

  // Internal short click sound
  _playClick(startTime, volume = 0.1) {
    if (!this.ctx) return;
    const bufferSize = this.ctx.sampleRate * 0.03;
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (bufferSize * 0.3));
    }

    const noise = this.ctx.createBufferSource();
    noise.buffer = buffer;

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.value = 1200;

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(volume, startTime);
    gain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.03);

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(this.ctx.destination);

    noise.start(startTime);
  }
}

window.soundEngine = new SoundEngine();

