import { useSyncExternalStore } from 'react';

/**
 * Narration via the browser's built-in speech synthesis (on-device on most platforms — no audio is
 * streamed from us, nothing the child does is recorded). Pre-readers rely on this, so it must be robust:
 * voices load asynchronously, Chrome cuts long utterances, and some browsers have no voices at all.
 */
const synth: SpeechSynthesis | null = typeof window !== 'undefined' && 'speechSynthesis' in window ? window.speechSynthesis : null;

let speaking = false;
const listeners = new Set<() => void>();
function setSpeaking(v: boolean) {
  if (speaking === v) return;
  speaking = v;
  listeners.forEach((l) => l());
}

let chosen: SpeechSynthesisVoice | null = null;
const PREFERRED = [
  /Google UK English Female/i,
  /Samantha/i,
  /Microsoft (Aria|Jenny|Libby|Sonia|Neerja)/i,
  /Karen|Moira|Tessa|Veena|Rishi/i,
  /Google US English/i,
];

function pickVoice(): SpeechSynthesisVoice | null {
  if (!synth) return null;
  if (chosen) return chosen;
  const voices = synth.getVoices().filter((v) => v.lang.toLowerCase().startsWith('en'));
  if (!voices.length) return null;
  const userLang = (typeof navigator !== 'undefined' ? navigator.language : 'en-US').toLowerCase();
  for (const re of PREFERRED) {
    const v = voices.find((x) => re.test(x.name));
    if (v) return (chosen = v);
  }
  chosen = voices.find((v) => v.lang.toLowerCase() === userLang) ?? voices.find((v) => v.localService) ?? voices[0] ?? null;
  return chosen;
}
synth?.addEventListener?.('voiceschanged', () => {
  chosen = null;
  pickVoice();
});

/** Remove emoji & symbols so the voice doesn't read "rocket emoji". */
export function speakable(text: string): string {
  return text
    .replace(/\p{Extended_Pictographic}|[\u{1F1E6}-\u{1F1FF}]|\u{FE0F}|\u{200D}/gu, '')
    .replace(/[*_~`#>|]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

let token = 0;

export function speak(text: string, opts: { rate?: number; onEnd?: () => void } = {}): void {
  if (!synth) {
    opts.onEnd?.();
    return;
  }
  const clean = speakable(text);
  stopSpeaking();
  if (!clean) {
    opts.onEnd?.();
    return;
  }
  const my = ++token;
  // Chrome silently stops utterances longer than ~15s, so speak sentence by sentence.
  const parts = clean.match(/[^.!?]+[.!?]*/g)?.map((s) => s.trim()).filter(Boolean) ?? [clean];
  const voice = pickVoice();
  parts.forEach((part, i) => {
    const u = new SpeechSynthesisUtterance(part);
    if (voice) u.voice = voice;
    u.lang = voice?.lang ?? 'en-US';
    u.rate = Math.min(1.5, Math.max(0.5, opts.rate ?? 1));
    u.pitch = 1.08;
    u.volume = 1;
    if (i === 0) u.onstart = () => my === token && setSpeaking(true);
    if (i === parts.length - 1) {
      const done = () => {
        if (my !== token) return;
        setSpeaking(false);
        opts.onEnd?.();
      };
      u.onend = done;
      u.onerror = done;
    }
    synth.speak(u);
  });
}

export function stopSpeaking(): void {
  token++;
  if (synth && (synth.speaking || synth.pending)) synth.cancel();
  setSpeaking(false);
}

export function speechSupported(): boolean {
  return synth !== null;
}

export function useIsSpeaking(): boolean {
  return useSyncExternalStore(
    (cb) => {
      listeners.add(cb);
      return () => listeners.delete(cb);
    },
    () => speaking,
    () => false,
  );
}
