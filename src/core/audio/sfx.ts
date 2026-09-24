import type { SfxName } from '../types';

/**
 * Tiny procedural sound kit built on Web Audio — zero audio files to download, instant playback,
 * and gentle volumes tuned for little ears. The AudioContext is created lazily on the first
 * user gesture (browser autoplay policy).
 */
let ctx: AudioContext | null = null;
let master: GainNode | null = null;
let enabled = true;

const MASTER_VOLUME = 0.32;

function audio(): { ctx: AudioContext; out: GainNode } | null {
  if (!enabled) return null;
  try {
    if (!ctx) {
      const Ctor: typeof AudioContext | undefined =
        globalThis.AudioContext ?? (globalThis as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!Ctor) return null;
      ctx = new Ctor();
      master = ctx.createGain();
      master.gain.value = MASTER_VOLUME;
      // A soft compressor keeps overlapping sounds from ever getting harsh.
      const comp = ctx.createDynamicsCompressor();
      comp.threshold.value = -18;
      comp.ratio.value = 4;
      master.connect(comp).connect(ctx.destination);
    }
    if (ctx.state === 'suspended') void ctx.resume();
    return master ? { ctx, out: master } : null;
  } catch {
    return null;
  }
}

export function setSfxEnabled(on: boolean): void {
  enabled = on;
}

interface ToneOpts {
  freq: number;
  to?: number;
  type?: OscillatorType;
  start?: number;
  dur: number;
  vol?: number;
  attack?: number;
}

function tone(a: { ctx: AudioContext; out: GainNode }, o: ToneOpts): void {
  const t0 = a.ctx.currentTime + (o.start ?? 0);
  const osc = a.ctx.createOscillator();
  const g = a.ctx.createGain();
  osc.type = o.type ?? 'sine';
  osc.frequency.setValueAtTime(o.freq, t0);
  if (o.to) osc.frequency.exponentialRampToValueAtTime(o.to, t0 + o.dur);
  const vol = o.vol ?? 0.5;
  const attack = o.attack ?? 0.008;
  g.gain.setValueAtTime(0.0001, t0);
  g.gain.exponentialRampToValueAtTime(vol, t0 + attack);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + o.dur);
  osc.connect(g).connect(a.out);
  osc.start(t0);
  osc.stop(t0 + o.dur + 0.05);
}

function noise(a: { ctx: AudioContext; out: GainNode }, dur: number, from: number, to: number, vol = 0.35, start = 0): void {
  const t0 = a.ctx.currentTime + start;
  const len = Math.max(1, Math.floor(a.ctx.sampleRate * dur));
  const buf = a.ctx.createBuffer(1, len, a.ctx.sampleRate);
  const data = buf.getChannelData(0);
  for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;
  const src = a.ctx.createBufferSource();
  src.buffer = buf;
  const filter = a.ctx.createBiquadFilter();
  filter.type = 'bandpass';
  filter.Q.value = 1.2;
  filter.frequency.setValueAtTime(from, t0);
  filter.frequency.exponentialRampToValueAtTime(to, t0 + dur);
  const g = a.ctx.createGain();
  g.gain.setValueAtTime(0.0001, t0);
  g.gain.exponentialRampToValueAtTime(vol, t0 + dur * 0.3);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  src.connect(filter).connect(g).connect(a.out);
  src.start(t0);
}

const NOTES = { C5: 523.25, D5: 587.33, E5: 659.25, G5: 783.99, A5: 880, C6: 1046.5, E6: 1318.5, G4: 392 };

const RECIPES: Record<SfxName, (a: { ctx: AudioContext; out: GainNode }) => void> = {
  tap: (a) => tone(a, { freq: 660, to: 880, dur: 0.07, vol: 0.25, type: 'triangle' }),
  pop: (a) => tone(a, { freq: 400, to: 900, dur: 0.09, vol: 0.35 }),
  correct: (a) => {
    tone(a, { freq: NOTES.C5, dur: 0.14, vol: 0.35, type: 'triangle' });
    tone(a, { freq: NOTES.E5, dur: 0.14, vol: 0.35, type: 'triangle', start: 0.09 });
    tone(a, { freq: NOTES.G5, dur: 0.28, vol: 0.4, type: 'triangle', start: 0.18 });
  },
  // Deliberately soft and "boing"-y — a wrong answer should never feel like a punishment.
  wrong: (a) => tone(a, { freq: 330, to: 220, dur: 0.22, vol: 0.22, type: 'sine' }),
  star: (a) => {
    tone(a, { freq: NOTES.A5, dur: 0.12, vol: 0.28, type: 'sine' });
    tone(a, { freq: NOTES.E6, dur: 0.3, vol: 0.22, type: 'sine', start: 0.07 });
  },
  whoosh: (a) => noise(a, 0.55, 300, 2400, 0.3),
  celebrate: (a) => {
    const seq = [NOTES.C5, NOTES.E5, NOTES.G5, NOTES.C6, NOTES.G5, NOTES.C6];
    seq.forEach((f, i) => tone(a, { freq: f, dur: 0.18, vol: 0.32, type: 'triangle', start: i * 0.1 }));
    tone(a, { freq: NOTES.E6, dur: 0.5, vol: 0.2, start: 0.6 });
  },
  unlock: (a) => {
    tone(a, { freq: NOTES.G4, dur: 0.12, vol: 0.3, type: 'square' });
    tone(a, { freq: NOTES.D5, dur: 0.25, vol: 0.25, type: 'triangle', start: 0.1 });
  },
  launch: (a) => {
    noise(a, 1.6, 80, 900, 0.45);
    tone(a, { freq: 60, to: 140, dur: 1.4, vol: 0.3, type: 'sawtooth', attack: 0.2 });
  },
  beat: (a) => {
    tone(a, { freq: 90, to: 45, dur: 0.16, vol: 0.6 });
    tone(a, { freq: 80, to: 40, dur: 0.14, vol: 0.45, start: 0.2 });
  },
  collect: (a) => {
    tone(a, { freq: NOTES.E5, dur: 0.08, vol: 0.3, type: 'square' });
    tone(a, { freq: NOTES.C6, dur: 0.16, vol: 0.25, type: 'square', start: 0.06 });
  },
  thud: (a) => tone(a, { freq: 120, to: 50, dur: 0.25, vol: 0.5 }),
};

export function playSfx(name: SfxName): void {
  const a = audio();
  if (!a) return;
  try {
    RECIPES[name](a);
  } catch {
    /* audio is best-effort */
  }
}
