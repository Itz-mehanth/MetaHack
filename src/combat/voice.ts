import type { Speaker } from './story.js';

/**
 * Character voices via the browser's speech synthesis, pitched per speaker
 * (deep and slow for Warlord VEX, bright for civilians). Silently does
 * nothing where speech synthesis is unavailable; subtitles still show.
 */

const STYLE: Readonly<Record<Speaker, { pitch: number; rate: number }>> = {
  vex: { pitch: 0.1, rate: 0.82 },
  villain: { pitch: 0.45, rate: 0.95 },
  hero: { pitch: 1.0, rate: 1.05 },
  civilian: { pitch: 1.35, rate: 1.1 },
};

export class Voice {
  private volume = 0.8;
  private english: SpeechSynthesisVoice | null = null;

  constructor() {
    const synth = this.synth;
    if (synth == null) return;
    const pick = () => {
      const voices = synth.getVoices();
      this.english = voices.find((v) => v.lang.startsWith('en') && /male|david|daniel|google uk/i.test(v.name)) ?? voices.find((v) => v.lang.startsWith('en')) ?? null;
    };
    pick();
    synth.addEventListener?.('voiceschanged', pick);
  }

  private get synth(): SpeechSynthesis | null {
    return typeof window !== 'undefined' && 'speechSynthesis' in window ? window.speechSynthesis : null;
  }

  get available(): boolean {
    return this.synth != null;
  }

  setVolume(volume: number): void {
    this.volume = volume;
  }

  /** Speaks `text`; resolves `onEnd` when finished (or immediately if unavailable). */
  speak(text: string, speaker: Speaker, onEnd?: () => void): void {
    const synth = this.synth;
    if (synth == null || this.volume <= 0.01) {
      onEnd?.();
      return;
    }
    synth.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    const style = STYLE[speaker];
    utterance.pitch = style.pitch;
    utterance.rate = style.rate;
    utterance.volume = this.volume;
    if (this.english) utterance.voice = this.english;
    if (onEnd) {
      utterance.onend = () => onEnd();
      utterance.onerror = () => onEnd();
    }
    synth.speak(utterance);
  }

  stop(): void {
    this.synth?.cancel();
  }
}
