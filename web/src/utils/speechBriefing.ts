/** Pick the most natural browser TTS voice available and speak in paced chunks. */

const VOICE_LOAD_MS = 1200;

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function scoreVoice(v: SpeechSynthesisVoice): number {
  const name = v.name.toLowerCase();
  const lang = v.lang.toLowerCase();
  if (!lang.startsWith("en")) return -1000;

  let score = 0;
  if (name.includes("natural")) score += 120;
  if (name.includes("neural")) score += 120;
  if (name.includes("online")) score += 90;
  if (name.includes("premium")) score += 70;
  if (name.includes("enhanced")) score += 50;
  if (name.includes("samantha")) score += 55;
  if (name.includes("karen")) score += 45;
  if (name.includes("moira")) score += 45;
  if (name.includes("google") && name.includes("english")) score += 40;
  if (name.includes("jenny")) score += 40;
  if (name.includes("aria")) score += 35;
  if (name.includes("zira")) score += 25;
  if (name.includes("david")) score += 15;
  if (!v.localService) score += 15;
  if (name.includes("desktop")) score -= 15;
  return score;
}

export function loadVoices(): Promise<SpeechSynthesisVoice[]> {
  return new Promise((resolve) => {
    if (typeof window === "undefined" || !window.speechSynthesis) {
      resolve([]);
      return;
    }

    const synth = window.speechSynthesis;
    let voices = synth.getVoices();
    if (voices.length > 0) {
      resolve(voices);
      return;
    }

    const timer = setTimeout(() => {
      synth.removeEventListener("voiceschanged", onChange);
      resolve(synth.getVoices());
    }, VOICE_LOAD_MS);

    function onChange() {
      voices = synth.getVoices();
      if (voices.length > 0) {
        clearTimeout(timer);
        synth.removeEventListener("voiceschanged", onChange);
        resolve(voices);
      }
    }

    synth.addEventListener("voiceschanged", onChange);
    synth.getVoices();
  });
}

export async function pickBriefingVoice(): Promise<SpeechSynthesisVoice | null> {
  const voices = await loadVoices();
  if (!voices.length) return null;
  return [...voices].sort((a, b) => scoreVoice(b) - scoreVoice(a))[0] ?? null;
}

export function humanizeForSpeech(text: string): string {
  return text
    .replace(/MotiveFX/gi, "Motive FX")
    .replace(/\bAI\b/g, "A.I.")
    .replace(/(\d+)%/g, "$1 percent")
    .replace(/\$(\d[\d,]*)/g, "$1 dollars")
    .replace(/\*/g, "")
    .replace(/—/g, ". ")
    .replace(/\s+/g, " ")
    .trim();
}

export function chunkBriefingScript(intro: string, body: string): string[] {
  const full = humanizeForSpeech(`${intro} ${body}`);
  const raw = full
    .split(/(?<=[.!?])\s+/)
    .map((s) => s.trim())
    .filter(Boolean);

  const chunks: string[] = [];
  for (const sentence of raw) {
    if (sentence.length <= 140) {
      chunks.push(sentence);
      continue;
    }
    const parts = sentence.split(/,\s+/);
    let buf = "";
    for (const part of parts) {
      const next = buf ? `${buf}, ${part}` : part;
      if (next.length > 120 && buf) {
        chunks.push(buf.endsWith(".") ? buf : `${buf}.`);
        buf = part;
      } else {
        buf = next;
      }
    }
    if (buf) chunks.push(buf.endsWith(".") || buf.endsWith("!") ? buf : `${buf}.`);
  }
  return chunks;
}

export interface BriefingSpeechOptions {
  rate?: number;
  pitch?: number;
  pauseMs?: number;
  onStart?: () => void;
  onEnd?: () => void;
  onError?: () => void;
  shouldCancel?: () => boolean;
}

function speakChunk(
  text: string,
  voice: SpeechSynthesisVoice | null,
  rate: number,
  pitch: number
): Promise<void> {
  return new Promise((resolve, reject) => {
    const synth = window.speechSynthesis;
    const utter = new SpeechSynthesisUtterance(text);
    if (voice) utter.voice = voice;
    utter.rate = rate;
    utter.pitch = pitch;
    utter.volume = 1;
    utter.onend = () => resolve();
    utter.onerror = () => reject(new Error("speech error"));
    synth.speak(utter);
  });
}

export async function playBriefingSpeech(
  chunks: string[],
  voice: SpeechSynthesisVoice | null,
  options: BriefingSpeechOptions = {}
): Promise<void> {
  const rate = options.rate ?? 0.94;
  const pitch = options.pitch ?? 0.96;
  const pauseMs = options.pauseMs ?? 320;
  options.onStart?.();

  try {
    for (let i = 0; i < chunks.length; i++) {
      if (options.shouldCancel?.()) break;
      await speakChunk(chunks[i], voice, rate, pitch);
      if (options.shouldCancel?.()) break;
      if (i < chunks.length - 1) await delay(pauseMs);
    }
  } catch {
    options.onError?.();
    throw new Error("briefing speech failed");
  } finally {
    options.onEnd?.();
  }
}

export function stopBriefingSpeech(): void {
  window.speechSynthesis?.cancel();
}

export function briefingRateForCohort(cohort: string): { rate: number; pitch: number; pauseMs: number } {
  switch (cohort) {
    case "boomer":
      return { rate: 0.88, pitch: 0.94, pauseMs: 420 };
    case "genz":
      return { rate: 0.96, pitch: 1.02, pauseMs: 260 };
    case "genx":
      return { rate: 0.91, pitch: 0.95, pauseMs: 360 };
    default:
      return { rate: 0.93, pitch: 0.97, pauseMs: 320 };
  }
}
