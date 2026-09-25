import { getAudioBus, isSfxEnabled } from '@/core/audio/sfx';

/**
 * Procedural engine audio for the piloting kit (Web Audio, zero files): a throbbing engine rumble and an
 * air-rush layer that follow speed and boost, plus a boost whoosh, ring chimes that climb with the combo,
 * collect tinks, near-miss swooshes and a soft bump thud. Routed through the shared bus (`getAudioBus()`),
 * so the platform's sound setting, master volume and gentle compressor apply.
 */

export interface EngineTone {
  readonly rumbleHz: number;
  readonly cutoffHz: number;
  readonly rumbleGain: number;
  readonly airHz: number;
  readonly airGain: number;
}

/** Engine parameters for a speed (0–1) and boost intensity (0–1). Monotonic in both. */
export function engineTone(speed01: number, boost01: number): EngineTone {
  const s = Math.max(0, Math.min(1, speed01));
  const b = Math.max(0, Math.min(1, boost01));
  return {
    rumbleHz: 38 + s * 30 + b * 16,
    cutoffHz: 240 + s * 650 + b * 950,
    rumbleGain: 0.09 + s * 0.07 + b * 0.05,
    airHz: 500 + s * 1300 + b * 2300,
    airGain: 0.012 + s * 0.045 + b * 0.085,
  };
}

const PENTATONIC = [0, 2, 4, 7, 9];
const C5 = 523.25;

/** Ring chime pitch: climbs a major pentatonic scale with each ring in the combo (capped at two octaves). */
export function chimeFrequency(combo: number): number {
  const idx = Math.max(0, Math.min(10, Math.floor(combo) - 1));
  const semis = Math.floor(idx / 5) * 12 + (PENTATONIC[idx % 5] ?? 0);
  return C5 * Math.pow(2, semis / 12);
}

interface Bus {
  readonly ctx: AudioContext;
  readonly out: GainNode;
}

const noiseCache = new WeakMap<AudioContext, AudioBuffer>();

function noiseBuffer(ctx: AudioContext): AudioBuffer {
  const cached = noiseCache.get(ctx);
  if (cached) return cached;
  const len = Math.floor(ctx.sampleRate * 2);
  const buf = ctx.createBuffer(1, len, ctx.sampleRate);
  const data = buf.getChannelData(0);
  // Softened (pinkish) noise — warmer than white noise for little ears.
  let last = 0;
  for (let i = 0; i < len; i++) {
    last = last * 0.86 + (Math.random() * 2 - 1) * 0.14;
    data[i] = last * 3.2;
  }
  noiseCache.set(ctx, buf);
  return buf;
}

interface EngineNodes {
  readonly bus: Bus;
  readonly master: GainNode;
  readonly engine: GainNode;
  readonly filter: BiquadFilterNode;
  readonly oscs: OscillatorNode[];
  readonly air: AudioBufferSourceNode;
  readonly airFilter: BiquadFilterNode;
  readonly airGain: GainNode;
  readonly lfo: OscillatorNode;
}

export class FlightAudio {
  private nodes: EngineNodes | null = null;
  private lastUpdate = 0;

  get running(): boolean {
    return this.nodes !== null;
  }

  /** Start the engine loop. Returns false when sound is off or unavailable (safe to call repeatedly). */
  start(): boolean {
    if (this.nodes) return true;
    if (!isSfxEnabled()) return false;
    const bus = getAudioBus();
    if (!bus) return false;
    try {
      const { ctx } = bus;
      const t = ctx.currentTime;
      const master = ctx.createGain();
      master.gain.setValueAtTime(0.0001, t);
      master.gain.exponentialRampToValueAtTime(1, t + 0.35);
      master.connect(bus.out);

      const engine = ctx.createGain();
      engine.gain.value = 0.09;
      const filter = ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.value = 260;
      filter.Q.value = 0.9;
      filter.connect(engine).connect(master);
      const oscs: OscillatorNode[] = [];
      const layers: [OscillatorType, number, number][] = [
        ['sawtooth', 1, 0.5],
        ['sawtooth', 1.5, 0.28],
        ['sine', 0.5, 0.9],
      ];
      for (const [type, ratio, level] of layers) {
        const o = ctx.createOscillator();
        o.type = type;
        o.frequency.value = 40 * ratio;
        o.detune.value = ratio === 1.5 ? 7 : 0;
        const g = ctx.createGain();
        g.gain.value = level;
        o.connect(g).connect(filter);
        o.start(t);
        oscs.push(o);
      }
      // A slow throb on the engine level gives it life.
      const lfo = ctx.createOscillator();
      lfo.frequency.value = 6.5;
      const lfoDepth = ctx.createGain();
      lfoDepth.gain.value = 0.018;
      lfo.connect(lfoDepth).connect(engine.gain);
      lfo.start(t);

      const air = ctx.createBufferSource();
      air.buffer = noiseBuffer(ctx);
      air.loop = true;
      const airFilter = ctx.createBiquadFilter();
      airFilter.type = 'bandpass';
      airFilter.frequency.value = 600;
      airFilter.Q.value = 0.7;
      const airGain = ctx.createGain();
      airGain.gain.value = 0.01;
      air.connect(airFilter).connect(airGain).connect(master);
      air.start(t);

      this.nodes = { bus, master, engine, filter, oscs, air, airFilter, airGain, lfo };
      return true;
    } catch {
      this.nodes = null;
      return false;
    }
  }

  /** Follow the throttle. Cheap; internally limited to ~30 updates per second. */
  update(speed01: number, boost01: number): void {
    const n = this.nodes;
    if (!n) return;
    if (!isSfxEnabled()) {
      this.stop();
      return;
    }
    const now = n.bus.ctx.currentTime;
    if (now - this.lastUpdate < 0.033) return;
    this.lastUpdate = now;
    const tone = engineTone(speed01, boost01);
    const tc = 0.08;
    n.oscs[0]?.frequency.setTargetAtTime(tone.rumbleHz, now, tc);
    n.oscs[1]?.frequency.setTargetAtTime(tone.rumbleHz * 1.5, now, tc);
    n.oscs[2]?.frequency.setTargetAtTime(tone.rumbleHz * 0.5, now, tc);
    n.filter.frequency.setTargetAtTime(tone.cutoffHz, now, tc);
    n.engine.gain.setTargetAtTime(tone.rumbleGain, now, tc);
    n.airFilter.frequency.setTargetAtTime(tone.airHz, now, tc);
    n.airGain.gain.setTargetAtTime(tone.airGain, now, tc);
  }

  /** Fade out and release every node. Safe to call when not running. */
  stop(): void {
    const n = this.nodes;
    if (!n) return;
    this.nodes = null;
    try {
      const t = n.bus.ctx.currentTime;
      n.master.gain.cancelScheduledValues(t);
      n.master.gain.setTargetAtTime(0, t, 0.06);
      const end = t + 0.45;
      for (const o of n.oscs) o.stop(end);
      n.lfo.stop(end);
      n.air.stop(end);
      n.air.onended = () => n.master.disconnect();
    } catch {
      /* audio is best-effort */
    }
  }

  private oneShot(play: (bus: Bus, t: number) => void): void {
    if (!isSfxEnabled()) return;
    const bus = this.nodes?.bus ?? getAudioBus();
    if (!bus) return;
    try {
      play(bus, bus.ctx.currentTime);
    } catch {
      /* best-effort */
    }
  }

  /** Rising air whoosh when BOOST kicks in. */
  whoosh(): void {
    this.oneShot((bus, t) => {
      const { ctx } = bus;
      const src = ctx.createBufferSource();
      src.buffer = noiseBuffer(ctx);
      const f = ctx.createBiquadFilter();
      f.type = 'bandpass';
      f.Q.value = 1.1;
      f.frequency.setValueAtTime(280, t);
      f.frequency.exponentialRampToValueAtTime(3200, t + 0.6);
      const g = ctx.createGain();
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(0.38, t + 0.12);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 0.8);
      src.connect(f).connect(g).connect(bus.out);
      src.start(t, Math.random() * 1.2);
      src.stop(t + 0.85);
      tone(bus, t, 90, 180, 'sawtooth', 0.12, 0.5, 0.06);
    });
  }

  /** Bright chime that climbs the scale with each ring in a row. */
  chime(combo: number, perfect: boolean): void {
    this.oneShot((bus, t) => {
      const f = chimeFrequency(combo);
      tone(bus, t, f, f, 'triangle', 0.26, 0.42, 0.004);
      tone(bus, t, f * 2, f * 2, 'sine', 0.1, 0.3, 0.004);
      if (perfect) tone(bus, t + 0.07, f * 1.5, f * 1.5, 'sine', 0.16, 0.36, 0.004);
    });
  }

  /** Tiny sparkle when something is collected. */
  tink(collected: number): void {
    this.oneShot((bus, t) => {
      const f = chimeFrequency((collected % 8) + 4) * 1.0;
      tone(bus, t, f * 2, f * 2.2, 'sine', 0.09, 0.12, 0.003);
    });
  }

  /** Stereo swoosh past a rock (`pan` −1 left … 1 right). */
  swoosh(pan: number): void {
    this.oneShot((bus, t) => {
      const { ctx } = bus;
      const src = ctx.createBufferSource();
      src.buffer = noiseBuffer(ctx);
      const f = ctx.createBiquadFilter();
      f.type = 'bandpass';
      f.Q.value = 2;
      f.frequency.setValueAtTime(1800, t);
      f.frequency.exponentialRampToValueAtTime(420, t + 0.35);
      const g = ctx.createGain();
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(0.3, t + 0.05);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 0.4);
      const p = ctx.createStereoPanner();
      p.pan.value = Math.max(-1, Math.min(1, pan));
      src.connect(f).connect(g).connect(p).connect(bus.out);
      src.start(t, Math.random());
      src.stop(t + 0.45);
    });
  }

  /** Soft, round bump thud — never harsh. */
  thud(strength: number): void {
    this.oneShot((bus, t) => {
      const s = Math.max(0.2, Math.min(1, strength));
      tone(bus, t, 150, 48, 'sine', 0.35 + s * 0.25, 0.32, 0.006);
      tone(bus, t, 320, 120, 'triangle', 0.08 * s, 0.14, 0.004);
    });
  }
}

function tone(bus: Bus, t0: number, from: number, to: number, type: OscillatorType, vol: number, dur: number, attack: number): void {
  const { ctx } = bus;
  const o = ctx.createOscillator();
  o.type = type;
  o.frequency.setValueAtTime(from, t0);
  if (to !== from) o.frequency.exponentialRampToValueAtTime(to, t0 + dur);
  const g = ctx.createGain();
  g.gain.setValueAtTime(0.0001, t0);
  g.gain.exponentialRampToValueAtTime(vol, t0 + attack);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  o.connect(g).connect(bus.out);
  o.start(t0);
  o.stop(t0 + dur + 0.05);
}
