import type { Speaker } from './story.js';

/**
 * Character voices via the browser's speech synthesis, pitched per speaker
 * (deep and slow for Warlord VEX, bright for civilians). Every call is
 * guarded: some browsers (including headset browsers) expose the API but
 * throw or never finish, so any failure disables voices for the session and
 * the game carries on with subtitles. Callers never see an exception.
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
  private broken = false;
  enabled = true;

  constructor() {
    try {
      const synth = this.synth;
      if (synth == null) return;
      const pick = () => {
        try {
          const voices = synth.getVoices();
          this.english =
            voices.find((v) => v.lang.startsWith('en') && /male|david|daniel|google uk/i.test(v.name)) ??
            voices.find((v) => v.lang.startsWith('en')) ??
            null;
        } catch {
          this.english = null;
        }
      };
      pick();
      synth.addEventListener?.('voiceschanged', pick);
    } catch {
      this.broken = true;
    }
  }

  private get synth(): SpeechSynthesis | null {
    try {
      return typeof window !== 'undefined' && 'speechSynthesis' in window && typeof SpeechSynthesisUtterance !== 'undefined'
        ? window.speechSynthesis
        : null;
    } catch {
      return null;
    }
  }

  get available(): boolean {
    return !this.broken && this.synth != null;
  }

  setVolume(volume: number): void {
    this.volume = volume;
  }

  /** Speaks `text`; `onEnd` runs when finished, or immediately if voices are off. */
  speak(text: string, speaker: Speaker, onEnd?: () => void): void {
    const synth = this.synth;
    if (!this.enabled || this.broken || synth == null || this.volume <= 0.01) {
      onEnd?.();
      return;
    }
    try {
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
    } catch (error) {
      console.warn('[Voice] speech synthesis failed; continuing with subtitles only', error);
      this.broken = true;
      onEnd?.();
    }
  }

  stop(): void {
    if (this.broken) return;
    try {
      this.synth?.cancel();
    } catch {
      this.broken = true;
    }
  }
}
