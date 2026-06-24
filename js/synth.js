/* ============================================================
   AMBIENT SYNTH
   Inspired by Eno's asynchronous loop technique (Music for Airports):
   Multiple independent voices, each on a different irrational interval,
   so note combinations never repeat in the same way.
   D pentatonic scale, long convolution reverb, sine-based tones.
   ============================================================ */

// D pentatonic across three octaves
const SCALE = [
  146.83, // D3
  164.81, // E3
  184.99, // F#3
  220.00, // A3
  246.94, // B3
  293.66, // D4
  329.63, // E4
  369.99, // F#4
  440.00, // A4
  493.88, // B4
  587.33, // D5
  659.25, // E5
  739.99, // F#5
];

// Four voices — all kept in the lower two octaves (D3–B4), nothing above D5.
const VOICE_DEFS = [
  { interval: 11.3, pool: [0, 3, 5, 7],  dur: 7.5, peak: 0.16 }, // low-mid
  { interval: 17.8, pool: [0, 2, 3, 5],  dur: 9.0, peak: 0.14 }, // low
  { interval: 13.7, pool: [3, 5, 7, 9],  dur: 6.5, peak: 0.13 }, // mid
  { interval: 22.4, pool: [1, 4, 6, 8],  dur: 8.5, peak: 0.12 }, // mid-high (capped at B4)
];

class AmbientSynth {
  constructor() {
    this.ac          = null;
    this.reverb      = null;
    this.dry         = null;
    this.wet         = null;
    this.master      = null;
    this.initialized   = false;
    this.muted         = false;
    this.timers        = [];
    this.tempoScale    = 1.0;
    this.mouseInfluence = 0;   // 0–1, smoothed mouse speed
    this.masterFilter  = null;
  }

  async start() {
    if (this.initialized) return;
    this.initialized = true;

    this.ac = new (window.AudioContext || window.webkitAudioContext)();
    if (this.ac.state === 'suspended') await this.ac.resume();

    this._buildGraph();
    this._startVoices();
  }

  // Called each frame with smoothed mouse speed (px/frame)
  setMouseVelocity(speed) {
    if (!this.initialized) return;
    // Smooth incoming speed, cap influence at 1
    this.mouseInfluence += (Math.min(1, speed / 30) - this.mouseInfluence) * 0.08;

    // Tempo: 1x at rest → 1.5x max. Never faster than 1.5x.
    this.tempoScale = 1 + this.mouseInfluence * 0.5;

    // Filter opens slightly with movement — warmer at rest, slightly brighter when active
    if (this.masterFilter) {
      const cutoff = 900 + this.mouseInfluence * 600; // 900 → 1500 Hz
      this.masterFilter.frequency.setTargetAtTime(cutoff, this.ac.currentTime, 0.4);
    }
  }

  toggleMute() {
    if (!this.initialized || !this.master) return;
    this.muted = !this.muted;
    const now = this.ac.currentTime;
    this.master.gain.cancelScheduledValues(now);
    this.master.gain.setTargetAtTime(this.muted ? 0 : 0.72, now, 0.3);
    return this.muted;
  }

  _buildGraph() {
    const ac = this.ac;

    // Master output
    this.master = ac.createGain();
    this.master.gain.value = 0.72;
    this.master.connect(ac.destination);

    // Master filter — modulated by mouse velocity
    this.masterFilter = ac.createBiquadFilter();
    this.masterFilter.type = 'lowpass';
    this.masterFilter.frequency.value = 900;
    this.masterFilter.Q.value = 0.5;
    this.masterFilter.connect(this.master);

    // Dry path → master filter
    this.dry = ac.createGain();
    this.dry.gain.value = 0.28;
    this.dry.connect(this.masterFilter);

    // Reverb + wet path → master filter
    this.reverb = this._makeReverb(7, 3.2);
    this.wet = ac.createGain();
    this.wet.gain.value = 0.72;
    this.reverb.connect(this.wet);
    this.wet.connect(this.masterFilter);
  }

  // Synthesise a hall reverb impulse response programmatically
  _makeReverb(duration, decay) {
    const ac  = this.ac;
    const sr  = ac.sampleRate;
    const len = Math.floor(sr * duration);
    const buf = ac.createBuffer(2, len, sr);

    for (let ch = 0; ch < 2; ch++) {
      const d = buf.getChannelData(ch);
      for (let i = 0; i < len; i++) {
        // Exponential decay envelope over noise
        d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, decay);
      }
    }

    const conv = ac.createConvolver();
    conv.buffer = buf;
    return conv;
  }

  _startVoices() {
    for (const def of VOICE_DEFS) {
      // Stagger initial fires so voices don't all sound at once
      const initialDelay = Math.random() * def.interval * 0.85 * 1000;
      const timer = setTimeout(() => this._scheduleVoice(def), initialDelay);
      this.timers.push(timer);
    }
  }

  _scheduleVoice(def) {
    this._playNote(def);

    // Interval with gentle jitter (+/- 15%) and tempo sync
    const base    = def.interval / this.tempoScale;
    const jitter  = (Math.random() - 0.5) * base * 0.3;
    const next    = Math.max(4000, (base + jitter) * 1000);
    const timer   = setTimeout(() => this._scheduleVoice(def), next);
    this.timers.push(timer);
  }

  _playNote(def) {
    const ac   = this.ac;
    const now  = ac.currentTime;
    const freq = SCALE[def.pool[Math.floor(Math.random() * def.pool.length)]];

    const attack  = 0.5;
    const hold    = def.dur * 0.25;
    const release = def.dur - attack - hold;

    // Two sine oscillators detuned by ~4 cents — natural chorus shimmer
    const osc1 = ac.createOscillator();
    const osc2 = ac.createOscillator();
    osc1.type = 'sine';
    osc2.type = 'sine';
    osc1.frequency.value = freq;
    osc2.frequency.value = freq * 1.0023; // 4 cents up

    // Gain envelope: fade in → hold → exponential tail
    const env = ac.createGain();
    env.gain.setValueAtTime(0.0001, now);
    env.gain.linearRampToValueAtTime(def.peak, now + attack);
    env.gain.setValueAtTime(def.peak, now + attack + hold);
    env.gain.exponentialRampToValueAtTime(0.0001, now + def.dur);

    // Warm low-pass filter — removes harsh upper partials
    const filter = ac.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 900;
    filter.Q.value = 0.6;

    osc1.connect(filter);
    osc2.connect(filter);
    filter.connect(env);
    env.connect(this.dry);
    env.connect(this.reverb);

    osc1.start(now);
    osc2.start(now);
    osc1.stop(now + def.dur + 0.2);
    osc2.stop(now + def.dur + 0.2);
  }

  stop() {
    this.timers.forEach(clearTimeout);
    if (this.master) this.master.gain.linearRampToValueAtTime(0, this.ac.currentTime + 2);
  }
}
