export class SoundManager {
  constructor() {
    this.audioContext = null;
    this.muted = false;
    this.masterGain = null;
    this.sfxGain = null;
    this.musicGain = null;
    this.uiGain = null;
    this.musicBaseGain = 0.16;
    this.masterLevel = 0.9;
    this.musicMode = 'menu';
    this.musicStep = 0;
    this.musicLoopHandle = null;
    this.lastPlayed = new Map();
    this.noiseBuffer = null;
  }
  
  initAudio() {
    try {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return;
      if (!this.audioContext) {
        this.audioContext = new AC();
        this.sfxGain = this.audioContext.createGain();
        this.musicGain = this.audioContext.createGain();
        this.uiGain = this.audioContext.createGain();
        this.masterGain = this.audioContext.createGain();
        const mobileCheck = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
        this.masterLevel = mobileCheck ? 0.95 : 0.88;
        this.masterGain.gain.value = this.muted ? 0 : this.masterLevel;
        this.musicBaseGain = mobileCheck ? 0.2 : 0.16;
        this.musicGain.gain.value = this.musicBaseGain;
        this.sfxGain.gain.value = mobileCheck ? 1.15 : 0.95;
        this.uiGain.gain.value = mobileCheck ? 0.7 : 0.55;
        this.musicGain.connect(this.masterGain);
        this.sfxGain.connect(this.masterGain);
        this.uiGain.connect(this.masterGain);
        this.masterGain.connect(this.audioContext.destination);
        this.noiseBuffer = this.createNoiseBuffer();
      }
      if (this.audioContext.state === 'suspended') {
        this.audioContext.resume().catch(()=>{});
      }
      this.unlockSilentAudio();
      const silentEl = document.getElementById('ios-silent-unlock');
      if (silentEl && silentEl.paused) {
        silentEl.play().catch(()=>{});
      }
      this.startMusicLoop();
    } catch(e) { console.warn('Audio init failed:', e); }
  }

  createNoiseBuffer() {
    if (!this.audioContext) return null;
    const buffer = this.audioContext.createBuffer(1, this.audioContext.sampleRate * 0.5, this.audioContext.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < data.length; i++) {
      data[i] = Math.random() * 2 - 1;
    }
    return buffer;
  }

  unlockSilentAudio() {
    if (!this.audioContext) return;
    try {
      const buf = this.audioContext.createBuffer(1, 1, 22050);
      const src = this.audioContext.createBufferSource();
      src.buffer = buf;
      src.connect(this.audioContext.destination);
      src.start(0);
    } catch(e) {}
  }

  shouldPlay(type, gapMs = 40) {
    const now = performance.now();
    const last = this.lastPlayed.get(type) || 0;
    if (now - last < gapMs) return false;
    this.lastPlayed.set(type, now);
    return true;
  }

  getChannelNode(channel = 'sfx') {
    if (channel === 'music') return this.musicGain;
    if (channel === 'ui') return this.uiGain;
    return this.sfxGain;
  }

  playTone(frequency, duration, options = {}) {
    if (!this.audioContext) return;
    const ctx = this.audioContext;
    const {
      type = 'triangle',
      volume = 0.08,
      sweep = null,
      channel = 'sfx',
      attack = 0.01,
      release = 0.18,
      filterType = 'lowpass',
      filterFrequency = 2200,
      detune = 0,
      delay = 0
    } = options;
    const now = ctx.currentTime + delay;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    const filter = ctx.createBiquadFilter();
    osc.type = type;
    osc.frequency.setValueAtTime(frequency, now);
    if (sweep) {
      osc.frequency.exponentialRampToValueAtTime(Math.max(20, sweep), now + duration);
    }
    osc.detune.value = detune;
    filter.type = filterType;
    filter.frequency.setValueAtTime(filterFrequency, now);
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.linearRampToValueAtTime(volume, now + attack);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + duration + release);
    osc.connect(filter);
    filter.connect(gain);
    gain.connect(this.getChannelNode(channel));
    osc.start(now);
    osc.stop(now + duration + release + 0.02);
  }

  playNoise(duration, options = {}) {
    if (!this.audioContext || !this.noiseBuffer) return;
    const ctx = this.audioContext;
    const {
      volume = 0.05,
      channel = 'sfx',
      filterType = 'bandpass',
      filterFrequency = 1100,
      playbackRate = 1,
      attack = 0.005,
      release = 0.12,
      delay = 0
    } = options;
    const now = ctx.currentTime + delay;
    const src = ctx.createBufferSource();
    const filter = ctx.createBiquadFilter();
    const gain = ctx.createGain();
    src.buffer = this.noiseBuffer;
    src.playbackRate.value = playbackRate;
    filter.type = filterType;
    filter.frequency.setValueAtTime(filterFrequency, now);
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.linearRampToValueAtTime(volume, now + attack);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + duration + release);
    src.connect(filter);
    filter.connect(gain);
    gain.connect(this.getChannelNode(channel));
    src.start(now);
    src.stop(now + duration + release + 0.02);
  }

  duckMusic(multiplier = 0.35, durationMs = 260) {
    if (!this.audioContext || !this.musicGain) return;
    const now = this.audioContext.currentTime;
    this.musicGain.gain.cancelScheduledValues(now);
    this.musicGain.gain.setTargetAtTime(this.musicBaseGain * multiplier, now, 0.02);
    clearTimeout(this.musicDuckTimer);
    this.musicDuckTimer = setTimeout(() => {
      if (!this.musicGain || this.muted) return;
      const restoreAt = this.audioContext.currentTime;
      this.musicGain.gain.cancelScheduledValues(restoreAt);
      this.musicGain.gain.setTargetAtTime(this.musicBaseGain, restoreAt, 0.08);
    }, durationMs);
  }

  startMusicLoop() {
    if (this.musicLoopHandle) return;
    this.musicLoopHandle = setInterval(() => this.tickMusic(), 420);
  }

  setMusicMode(mode) {
    if (this.musicMode === mode) return;
    this.musicMode = mode;
    this.musicStep = 0;
    this.tickMusic();
  }

  tickMusic() {
    if (this.muted || !this.audioContext || this.audioContext.state !== 'running') return;
    const patterns = {
      menu: {
        lead: [523, 659, 784, null, 659, 784, 988, null],
        bass: [131, null, 196, null, 147, null, 220, null],
        leadType: 'triangle',
        bassType: 'triangle',
        percussion: false
      },
      countdown: {
        lead: [392, null, 392, null, 440, null, 523, null],
        bass: [196, null, 196, null, 220, null, 262, null],
        leadType: 'square',
        bassType: 'triangle',
        percussion: false
      },
      battle: {
        lead: [330, null, 392, 440, 392, null, 523, 440],
        bass: [165, null, 165, null, 196, null, 220, null],
        leadType: 'square',
        bassType: 'triangle',
        percussion: true
      },
      victory: {
        lead: [523, 659, 784, 1047, 784, 659, 523, null],
        bass: [196, null, 262, null, 196, null, 131, null],
        leadType: 'triangle',
        bassType: 'triangle',
        percussion: false
      },
      defeat: {
        lead: [392, 330, 294, 262, 220, null, 196, null],
        bass: [131, null, 123, null, 98, null, 87, null],
        leadType: 'triangle',
        bassType: 'triangle',
        percussion: false
      }
    };
    const pattern = patterns[this.musicMode] || patterns.menu;
    const step = this.musicStep % pattern.lead.length;
    const lead = pattern.lead[step];
    const bass = pattern.bass[step];
    if (lead) {
      this.playTone(lead, 0.14, {
        type: pattern.leadType,
        volume: this.musicMode === 'battle' ? 0.045 : 0.038,
        channel: 'music',
        filterFrequency: 1800
      });
    }
    if (bass) {
      this.playTone(bass, 0.3, {
        type: pattern.bassType,
        volume: 0.032,
        channel: 'music',
        filterFrequency: 620
      });
    }
    if (pattern.percussion && step % 2 === 0) {
      this.playNoise(0.03, {
        volume: 0.015,
        channel: 'music',
        filterType: 'highpass',
        filterFrequency: 1800,
        playbackRate: 1.3
      });
    }
    this.musicStep = (step + 1) % pattern.lead.length;
  }
  
  playSound(type, volume = 0.3) {
    if (!this.audioContext) this.initAudio();
    if (this.muted || !this.audioContext) return;
    if (this.audioContext.state !== 'running') {
      this.audioContext.resume().catch(()=>{});
      return;
    }
    try {
      switch(type) {
        case 'uiConfirm':
          if (!this.shouldPlay(type, 45)) return;
          this.playTone(620, 0.05, { type:'triangle', volume: volume * 0.18, channel:'ui', sweep: 930, filterFrequency: 2400 });
          this.playTone(930, 0.04, { type:'triangle', volume: volume * 0.1, channel:'ui', delay: 0.025, filterFrequency: 2600 });
          break;
        case 'attackSwing':
          if (!this.shouldPlay(type, 30)) return;
          this.playNoise(0.045, { volume: volume * 0.065, filterType:'highpass', filterFrequency: 1700 });
          this.playTone(190, 0.06, { type:'triangle', volume: volume * 0.14, sweep: 110, filterFrequency: 900 });
          break;
        case 'rangedShot':
          if (!this.shouldPlay(type, 24)) return;
          this.playTone(430, 0.07, { type:'square', volume: volume * 0.16, sweep: 270, filterFrequency: 1700 });
          this.playTone(620, 0.035, { type:'triangle', volume: volume * 0.06, delay: 0.015, filterFrequency: 2100 });
          break;
        case 'attackHit':
          if (!this.shouldPlay(type, 24)) return;
          this.playNoise(0.05, { volume: volume * 0.08, filterFrequency: 1000 });
          this.playTone(150, 0.08, { type:'triangle', volume: volume * 0.18, sweep: 70, filterFrequency: 950 });
          break;
        case 'rangedHit':
          if (!this.shouldPlay(type, 24)) return;
          this.playNoise(0.04, { volume: volume * 0.06, filterFrequency: 1500, filterType:'highpass' });
          this.playTone(260, 0.06, { type:'square', volume: volume * 0.14, sweep: 130, filterFrequency: 1600 });
          break;
        case 'blocked':
          if (!this.shouldPlay(type, 40)) return;
          this.playTone(860, 0.045, { type:'square', volume: volume * 0.12, sweep: 1240, filterFrequency: 2400 });
          this.playTone(1420, 0.03, { type:'triangle', volume: volume * 0.08, delay: 0.025, filterFrequency: 3000 });
          break;
        case 'superCharge':
        case 'superReady':
          if (!this.shouldPlay(type, 220)) return;
          this.playTone(392, 0.07, { type:'triangle', volume: volume * 0.15, sweep: 523, filterFrequency: 1800 });
          this.playTone(523, 0.07, { type:'triangle', volume: volume * 0.12, delay: 0.045, sweep: 659, filterFrequency: 2200 });
          this.playTone(784, 0.09, { type:'triangle', volume: volume * 0.14, delay: 0.09, filterFrequency: 2600 });
          break;
        case 'superFire':
          if (!this.shouldPlay(type, 120)) return;
          this.duckMusic(0.3, 320);
          this.playNoise(0.18, { volume: volume * 0.11, filterFrequency: 900 });
          this.playTone(110, 0.24, { type:'sawtooth', volume: volume * 0.22, sweep: 42, filterFrequency: 780 });
          this.playTone(220, 0.1, { type:'square', volume: volume * 0.08, delay: 0.02, sweep: 140, filterFrequency: 1700 });
          break;
        case 'shield':
          if (!this.shouldPlay(type, 70)) return;
          this.playTone(540, 0.08, { type:'sine', volume: volume * 0.16, sweep: 960, filterFrequency: 2600 });
          this.playTone(1180, 0.04, { type:'triangle', volume: volume * 0.08, delay: 0.03, filterFrequency: 3200 });
          break;
        case 'dash':
          if (!this.shouldPlay(type, 40)) return;
          this.playNoise(0.03, { volume: volume * 0.045, filterType:'highpass', filterFrequency: 1900 });
          this.playTone(240, 0.09, { type:'sawtooth', volume: volume * 0.16, sweep: 600, filterFrequency: 1600 });
          break;
        case 'death':
          if (!this.shouldPlay(type, 70)) return;
          this.playTone(280, 0.1, { type:'triangle', volume: volume * 0.16, sweep: 160, filterFrequency: 1200 });
          this.playTone(180, 0.12, { type:'triangle', volume: volume * 0.12, delay: 0.05, sweep: 80, filterFrequency: 860 });
          this.playNoise(0.07, { volume: volume * 0.05, delay: 0.02, filterFrequency: 700 });
          break;
        case 'crateSmash':
          if (!this.shouldPlay(type, 40)) return;
          this.playNoise(0.08, { volume: volume * 0.085, filterFrequency: 850 });
          this.playTone(180, 0.11, { type:'square', volume: volume * 0.14, sweep: 68, filterFrequency: 1000 });
          break;
        case 'powerup':
          if (!this.shouldPlay(type, 90)) return;
          this.playTone(523, 0.05, { type:'triangle', volume: volume * 0.12, filterFrequency: 2300 });
          this.playTone(659, 0.05, { type:'triangle', volume: volume * 0.12, delay: 0.03, filterFrequency: 2500 });
          this.playTone(880, 0.08, { type:'triangle', volume: volume * 0.14, delay: 0.06, filterFrequency: 2800 });
          break;
        case 'stormDamage':
          if (!this.shouldPlay(type, 90)) return;
          this.playNoise(0.05, { volume: volume * 0.03, filterFrequency: 600, playbackRate: 0.7 });
          this.playTone(140, 0.08, { type:'sawtooth', volume: volume * 0.08, sweep: 95, filterFrequency: 520 });
          break;
        case 'countdownTick':
          if (!this.shouldPlay(type, 120)) return;
          this.playTone(540, 0.05, { type:'square', volume: volume * 0.13, sweep: 440, channel:'ui', filterFrequency: 2400 });
          break;
        case 'countdownGo':
          if (!this.shouldPlay(type, 200)) return;
          this.playTone(392, 0.06, { type:'triangle', volume: volume * 0.12, channel:'ui', filterFrequency: 2200 });
          this.playTone(523, 0.08, { type:'triangle', volume: volume * 0.14, delay: 0.04, channel:'ui', filterFrequency: 2400 });
          this.playTone(784, 0.1, { type:'triangle', volume: volume * 0.16, delay: 0.08, channel:'ui', filterFrequency: 2800 });
          break;
        case 'killStreak':
          if (!this.shouldPlay(type, 160)) return;
          this.playTone(392, 0.06, { type:'triangle', volume: volume * 0.12, channel:'ui', filterFrequency: 2200 });
          this.playTone(523, 0.06, { type:'triangle', volume: volume * 0.12, delay: 0.04, channel:'ui', filterFrequency: 2400 });
          this.playTone(784, 0.09, { type:'triangle', volume: volume * 0.15, delay: 0.08, channel:'ui', filterFrequency: 2600 });
          break;
        case 'victory':
          if (!this.shouldPlay(type, 250)) return;
          this.duckMusic(0.25, 420);
          this.playTone(523, 0.12, { type:'triangle', volume: volume * 0.13, channel:'ui', filterFrequency: 2100 });
          this.playTone(659, 0.12, { type:'triangle', volume: volume * 0.13, delay: 0.08, channel:'ui', filterFrequency: 2300 });
          this.playTone(1047, 0.18, { type:'triangle', volume: volume * 0.18, delay: 0.16, channel:'ui', filterFrequency: 2600 });
          break;
        case 'defeat':
          if (!this.shouldPlay(type, 250)) return;
          this.duckMusic(0.25, 420);
          this.playTone(392, 0.12, { type:'triangle', volume: volume * 0.12, channel:'ui', sweep: 262, filterFrequency: 1200 });
          this.playTone(262, 0.14, { type:'triangle', volume: volume * 0.14, delay: 0.1, sweep: 165, channel:'ui', filterFrequency: 900 });
          break;
      }
    } catch(e) {}
  }
  
  toggleMute() {
    this.muted = !this.muted;
    if (this.masterGain && this.audioContext) {
      const now = this.audioContext.currentTime;
      this.masterGain.gain.cancelScheduledValues(now);
      this.masterGain.gain.setTargetAtTime(this.muted ? 0 : this.masterLevel, now, 0.02);
    }
    return this.muted;
  }
}

export function createSoundManager() {
  return new SoundManager();
}
