import { SubtitleChunk } from '../types';

/**
 * Formats milliseconds into SRT time format: HH:MM:SS,mmm
 * Pure mathematical implementation to avoid Date object overhead or TZ issues.
 */
export const formatTime = (ms: number): string => {
  const totalSeconds = Math.floor(ms / 1000);
  const milliseconds = Math.floor(ms % 1000);
  const seconds = totalSeconds % 60;
  const totalMinutes = Math.floor(totalSeconds / 60);
  const minutes = totalMinutes % 60;
  const hours = Math.floor(totalMinutes / 60);

  const h = String(hours).padStart(2, '0');
  const m = String(minutes).padStart(2, '0');
  const s = String(seconds).padStart(2, '0');
  const msStr = String(milliseconds).padStart(3, '0');

  return `${h}:${m}:${s},${msStr}`;
};

/**
 * Generates the full SRT file content from chunks.
 * Ensures a blank line between segments and one at the end of the file.
 */
export const generateSrtContent = (chunks: SubtitleChunk[]): string => {
  return chunks
    .map((chunk, index) => {
      // Use strict null checks for timestamps
      const startMs = chunk.startTime !== undefined ? chunk.startTime : 0;
      // If no end time, default to 1s after start
      const endMs = chunk.endTime !== undefined ? chunk.endTime : startMs + 1000;
      
      const start = formatTime(startMs);
      const end = formatTime(endMs);
      
      // Standard SRT format:
      // index
      // start --> end
      // text
      return `${index + 1}\n${start} --> ${end}\n${chunk.text.trim()}`;
    })
    .join('\n\n') + '\n';
};

/**
 * Creates a downloadable blob for the SRT file
 */
export const downloadSrt = (content: string, filename: string = 'subtitles.srt') => {
  const blob = new Blob([content], { type: 'text/srt' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
};