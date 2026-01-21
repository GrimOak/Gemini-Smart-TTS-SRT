export interface SubtitleChunk {
  id: number;
  text: string;
  startCharIndex: number;
  endCharIndex: number;
  startTime?: number; // in milliseconds
  endTime?: number;   // in milliseconds
}

export interface VoiceOption {
  name: string;
  lang: string;
  default: boolean;
  localService: boolean;
  voiceURI: string;
}

export enum AppStatus {
  IDLE = 'IDLE',
  OPTIMIZING = 'OPTIMIZING', // Gemini processing
  READY = 'READY',
  PLAYING = 'PLAYING',
  PAUSED = 'PAUSED',
  FINISHED = 'FINISHED',
}