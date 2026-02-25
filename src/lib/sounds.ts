'use client';

// Synthesized sound effects using Web Audio API - no external files needed
class SoundManager {
  private ctx: AudioContext | null = null;
  private _muted = false;
  private _volume = 0.5;

  get muted() { return this._muted; }
  set muted(v: boolean) { this._muted = v; }

  get volume() { return this._volume; }
  set volume(v: number) { this._volume = Math.max(0, Math.min(1, v)); }

  private getCtx(): AudioContext {
    if (!this.ctx) {
      this.ctx = new AudioContext();
    }
    if (this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
    return this.ctx;
  }

  private playTone(freq: number, duration: number, type: OscillatorType = 'sine', gainVal?: number) {
    if (this._muted) return;
    try {
      const ctx = this.getCtx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = type;
      osc.frequency.value = freq;
      gain.gain.value = (gainVal ?? this._volume) * 0.3;
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + duration);
    } catch {
      // Audio not supported
    }
  }

  private playNoise(duration: number, gainVal?: number) {
    if (this._muted) return;
    try {
      const ctx = this.getCtx();
      const bufferSize = ctx.sampleRate * duration;
      const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        data[i] = Math.random() * 2 - 1;
      }
      const source = ctx.createBufferSource();
      source.buffer = buffer;
      const gain = ctx.createGain();
      gain.gain.value = (gainVal ?? this._volume) * 0.15;
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);
      source.connect(gain);
      gain.connect(ctx.destination);
      source.start();
    } catch {
      // Audio not supported
    }
  }

  cardPlay() {
    this.playTone(800, 0.08, 'sine');
    setTimeout(() => this.playTone(1200, 0.06, 'sine'), 30);
  }

  cardDraw() {
    this.playTone(400, 0.12, 'triangle');
    setTimeout(() => this.playTone(600, 0.08, 'triangle'), 50);
  }

  explosion() {
    this.playNoise(0.6, this._volume * 1.5);
    this.playTone(80, 0.5, 'sawtooth', this._volume * 0.8);
    setTimeout(() => this.playTone(40, 0.4, 'sawtooth', this._volume * 0.5), 100);
    setTimeout(() => this.playNoise(0.3, this._volume * 0.8), 200);
  }

  defuse() {
    this.playTone(523, 0.15, 'sine');
    setTimeout(() => this.playTone(659, 0.15, 'sine'), 100);
    setTimeout(() => this.playTone(784, 0.2, 'sine'), 200);
  }

  win() {
    const notes = [523, 659, 784, 1047];
    notes.forEach((freq, i) => {
      setTimeout(() => this.playTone(freq, 0.3, 'sine'), i * 150);
    });
    setTimeout(() => {
      this.playTone(1047, 0.5, 'sine');
      this.playTone(784, 0.5, 'sine');
    }, 600);
  }

  lose() {
    this.playTone(400, 0.3, 'sawtooth', this._volume * 0.4);
    setTimeout(() => this.playTone(300, 0.3, 'sawtooth', this._volume * 0.4), 200);
    setTimeout(() => this.playTone(200, 0.5, 'sawtooth', this._volume * 0.3), 400);
  }

  shuffle() {
    for (let i = 0; i < 6; i++) {
      setTimeout(() => this.playNoise(0.03, this._volume * 0.5), i * 40);
    }
  }

  nope() {
    this.playTone(600, 0.1, 'square', this._volume * 0.3);
    setTimeout(() => this.playTone(300, 0.2, 'square', this._volume * 0.3), 80);
  }

  steal() {
    this.playTone(300, 0.1, 'triangle');
    setTimeout(() => this.playTone(500, 0.1, 'triangle'), 80);
    setTimeout(() => this.playTone(800, 0.15, 'triangle'), 160);
  }

  click() {
    this.playTone(1000, 0.03, 'sine', this._volume * 0.2);
  }

  turnStart() {
    this.playTone(880, 0.08, 'sine', this._volume * 0.25);
    setTimeout(() => this.playTone(1100, 0.1, 'sine', this._volume * 0.3), 60);
  }

  favor() {
    this.playTone(440, 0.15, 'triangle');
    setTimeout(() => this.playTone(660, 0.15, 'triangle'), 100);
  }

  seeFuture() {
    this.playTone(600, 0.2, 'sine', this._volume * 0.2);
    setTimeout(() => this.playTone(800, 0.2, 'sine', this._volume * 0.25), 150);
    setTimeout(() => this.playTone(1000, 0.3, 'sine', this._volume * 0.3), 300);
  }
}

// Singleton
export const sounds = typeof window !== 'undefined' ? new SoundManager() : null;
