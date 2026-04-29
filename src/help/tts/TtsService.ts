/**
 * TtsService — Web Speech API 封装
 * 朗读章节正文，支持逐段播报、暂停/继续/停止、语速调节
 */

export interface TtsOptions {
  rate?: number;      // 0.5 – 2.0, default 1
  pitch?: number;     // 0 – 2, default 1
  volume?: number;    // 0 – 1, default 1
  lang?: string;      // e.g. 'zh-CN'
  onSentenceStart?: (index: number) => void;
  onEnd?: () => void;
  onError?: (msg: string) => void;
}

export function isTtsSupported(): boolean {
  return typeof window !== 'undefined' && 'speechSynthesis' in window;
}

export function getVoices(): SpeechSynthesisVoice[] {
  return window.speechSynthesis?.getVoices() ?? [];
}

/** Split text into speakable sentences */
function splitSentences(text: string): string[] {
  return text
    .split(/([。！？\n]+)/)
    .reduce<string[]>((acc, part, i, arr) => {
      if (i % 2 === 0) {
        const sentence = part.trim() + (arr[i + 1] ?? '');
        if (sentence.trim()) acc.push(sentence);
      }
      return acc;
    }, [])
    .filter(s => s.trim().length > 0);
}

export class TtsService {
  private sentences: string[] = [];
  private currentIndex = 0;
  private options: TtsOptions = {};
  private _playing = false;
  private _paused = false;
  private voiceUri?: string;

  get playing() { return this._playing; }
  get paused() { return this._paused; }
  get progress() {
    return this.sentences.length > 0 ? this.currentIndex / this.sentences.length : 0;
  }

  setVoice(uri: string) { this.voiceUri = uri; }

  speak(text: string, opts: TtsOptions = {}) {
    this.stop();
    this.sentences = splitSentences(text);
    this.currentIndex = 0;
    this.options = opts;
    this._playing = true;
    this._paused = false;
    this.speakNext();
  }

  private speakNext() {
    if (!this._playing || this.currentIndex >= this.sentences.length) {
      this._playing = false;
      this.options.onEnd?.();
      return;
    }
    const sentence = this.sentences[this.currentIndex];
    this.options.onSentenceStart?.(this.currentIndex);

    const utterance = new SpeechSynthesisUtterance(sentence);
    utterance.rate   = this.options.rate   ?? 1;
    utterance.pitch  = this.options.pitch  ?? 1;
    utterance.volume = this.options.volume ?? 1;
    utterance.lang   = this.options.lang   ?? 'zh-CN';

    if (this.voiceUri) {
      const voice = window.speechSynthesis.getVoices().find(v => v.voiceURI === this.voiceUri);
      if (voice) utterance.voice = voice;
    }

    utterance.onend = () => {
      if (!this._playing) return;
      this.currentIndex++;
      this.speakNext();
    };
    utterance.onerror = (e) => {
      if (e.error !== 'interrupted') this.options.onError?.(e.error);
    };

    window.speechSynthesis.speak(utterance);
  }

  pause() {
    if (this._playing && !this._paused) {
      window.speechSynthesis.pause();
      this._paused = true;
    }
  }

  resume() {
    if (this._playing && this._paused) {
      window.speechSynthesis.resume();
      this._paused = false;
    }
  }

  stop() {
    window.speechSynthesis.cancel();
    this._playing = false;
    this._paused = false;
  }

  setRate(rate: number) {
    this.options.rate = rate;
    if (this._playing) {
      // restart from current sentence with new rate
      const idx = this.currentIndex;
      window.speechSynthesis.cancel();
      this.currentIndex = idx;
      if (!this._paused) this.speakNext();
    }
  }
}

export const tts = new TtsService();
