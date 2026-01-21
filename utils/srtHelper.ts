import { SubtitleChunk } from '../types';

/**
 * Formats milliseconds into SRT time format: HH:MM:SS,mmm
 */
export const formatTime = (ms: number): string => {
  const date = new Date(ms);
  const hours = String(Math.floor(ms / 3600000)).padStart(2, '0');
  const minutes = String(date.getUTCMinutes()).padStart(2, '0');
  const seconds = String(date.getUTCSeconds()).padStart(2, '0');
  const milliseconds = String(date.getUTCMilliseconds()).padStart(3, '0');

  return `${hours}:${minutes}:${seconds},${milliseconds}`;
};

/**
 * Generates the full SRT file content from chunks
 */
export const generateSrtContent = (chunks: SubtitleChunk[]): string => {
  return chunks
    .map((chunk, index) => {
      const start = chunk.startTime ? formatTime(chunk.startTime) : '00:00:00,000';
      const end = chunk.endTime ? formatTime(chunk.endTime) : formatTime((chunk.startTime || 0) + 1000);
      
      return `${index + 1}\n${start} --> ${end}\n${chunk.text}\n`;
    })
    .join('\n');
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