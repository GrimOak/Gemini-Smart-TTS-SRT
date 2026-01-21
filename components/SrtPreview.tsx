import React, { useRef, useEffect } from 'react';
import { SubtitleChunk, AppStatus } from '../types';
import { formatTime } from '../utils/srtHelper';
import { Download, Clock, PlayCircle } from 'lucide-react';
import clsx from 'clsx';

interface SrtPreviewProps {
  chunks: SubtitleChunk[];
  activeChunkId: number | null;
  status: AppStatus;
  onDownload: () => void;
}

const SrtPreview: React.FC<SrtPreviewProps> = ({ chunks, activeChunkId, status, onDownload }) => {
  const scrollRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to active chunk
  useEffect(() => {
    if (activeChunkId !== null && scrollRef.current) {
      const activeEl = scrollRef.current.querySelector(`[data-id="${activeChunkId}"]`);
      if (activeEl) {
        activeEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }
  }, [activeChunkId]);

  return (
    <div className="bg-gray-900 border border-gray-800 rounded-xl shadow-xl flex flex-col h-[500px]">
      <div className="p-4 border-b border-gray-800 flex justify-between items-center bg-gray-900/50 rounded-t-xl">
        <h3 className="font-semibold text-gray-200 flex items-center gap-2">
          <Clock className="text-emerald-400" size={18} />
          Live SRT Preview
        </h3>
        <button
          onClick={onDownload}
          disabled={chunks.length === 0}
          className="flex items-center gap-2 px-3 py-1.5 text-xs font-medium text-emerald-400 bg-emerald-400/10 hover:bg-emerald-400/20 border border-emerald-400/20 rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Download size={14} />
          Download .SRT
        </button>
      </div>

      <div 
        ref={scrollRef}
        className="flex-1 overflow-y-auto p-4 space-y-3 font-mono text-sm"
      >
        {chunks.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-gray-500 space-y-2">
            <PlayCircle size={48} className="opacity-20" />
            <p>Ready to generate subtitles...</p>
          </div>
        ) : (
          chunks.map((chunk, index) => {
            const isActive = chunk.id === activeChunkId;
            const isCompleted = chunk.endTime !== undefined;

            return (
              <div
                key={chunk.id}
                data-id={chunk.id}
                className={clsx(
                  "p-3 rounded-lg border transition-all duration-300",
                  isActive 
                    ? "bg-emerald-900/20 border-emerald-500/50 shadow-[0_0_15px_rgba(16,185,129,0.1)] scale-[1.02]" 
                    : "bg-gray-800/40 border-gray-700/50 hover:bg-gray-800/60"
                )}
              >
                <div className="flex justify-between text-xs text-gray-500 mb-1">
                  <span className="font-bold text-gray-600">#{index + 1}</span>
                  <span className={clsx(isActive ? "text-emerald-400" : "")}>
                    {chunk.startTime !== undefined ? formatTime(chunk.startTime) : '--:--:--'} 
                    {' --> '} 
                    {chunk.endTime !== undefined ? formatTime(chunk.endTime) : (isActive ? 'Recording...' : '--:--:--')}
                  </span>
                </div>
                <p className={clsx(
                  "leading-relaxed",
                  isActive ? "text-emerald-100 font-medium" : "text-gray-400"
                )}>
                  {chunk.text}
                </p>
              </div>
            );
          })
        )}
      </div>
      
      <div className="p-2 border-t border-gray-800 text-center">
        <p className="text-xs text-gray-600">
           {status === AppStatus.PLAYING ? 'Recording timestamps...' : `${chunks.length} lines ready`}
        </p>
      </div>
    </div>
  );
};

export default SrtPreview;