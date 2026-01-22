import React, { useRef, useEffect } from 'react';
import { SubtitleChunk, AppStatus } from '../types';
import { formatTime } from '../utils/srtHelper';
import { Download, LayoutPanelTop, Play, CheckCircle2 } from 'lucide-react';
import clsx from 'clsx';

interface SrtPreviewProps {
  chunks: SubtitleChunk[];
  activeChunkId: number | null;
  status: AppStatus;
  onDownload: () => void;
}

const SrtPreview: React.FC<SrtPreviewProps> = ({ chunks, activeChunkId, status, onDownload }) => {
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (activeChunkId !== null && scrollRef.current) {
      const activeEl = scrollRef.current.querySelector(`[data-id="${activeChunkId}"]`);
      if (activeEl) {
        activeEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }
  }, [activeChunkId]);

  return (
    <div className="glass rounded-2xl flex flex-col h-full overflow-hidden border border-white/5">
      <div className="p-5 border-b border-white/5 flex justify-between items-center bg-white/5">
        <h3 className="text-xs font-bold uppercase tracking-widest text-cyan-400 flex items-center gap-2">
          <LayoutPanelTop size={14} /> Subtitle Timeline
        </h3>
        <button
          onClick={onDownload}
          disabled={chunks.length === 0}
          className="flex items-center gap-2 px-4 py-1.5 text-xs font-bold text-emerald-400 bg-emerald-400/10 hover:bg-emerald-400/20 border border-emerald-400/20 rounded-full transition-all disabled:opacity-30 disabled:cursor-not-allowed group"
        >
          <Download size={14} className="group-hover:-translate-y-0.5 transition-transform" />
          Export SRT
        </button>
      </div>

      <div 
        ref={scrollRef}
        className="flex-1 overflow-y-auto p-4 space-y-2 relative"
      >
        {chunks.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-gray-600 space-y-4 px-8 text-center">
            <div className="w-12 h-12 rounded-full border border-white/5 flex items-center justify-center">
              <Play size={20} className="text-gray-700 ml-1" />
            </div>
            <p className="text-xs font-medium uppercase tracking-tight">Timeline is empty. Input text to begin.</p>
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
                  "group flex gap-4 p-4 rounded-xl border transition-all duration-500",
                  isActive 
                    ? "bg-emerald-500/10 border-emerald-500/40 shadow-[0_0_30px_rgba(16,185,129,0.05)] scale-[1.01]" 
                    : isCompleted 
                      ? "bg-white/5 border-white/5" 
                      : "bg-transparent border-transparent opacity-50"
                )}
              >
                {/* Index & Status Icon */}
                <div className="flex flex-col items-center gap-2 mt-1">
                  <span className={clsx(
                    "text-[10px] font-black w-6 h-6 flex items-center justify-center rounded-md border",
                    isActive ? "bg-emerald-500 border-emerald-400 text-obsidian" : "bg-white/5 border-white/5 text-gray-600"
                  )}>
                    {index + 1}
                  </span>
                  {isCompleted && !isActive && (
                    <CheckCircle2 size={12} className="text-emerald-500/50" />
                  )}
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-4 mb-2">
                     <div className="flex items-center gap-2 font-mono text-[10px] tracking-wider">
                       <span className={isActive ? "text-emerald-400 font-bold" : "text-gray-500"}>
                         {chunk.startTime !== undefined ? formatTime(chunk.startTime) : '00:00:00,000'}
                       </span>
                       <span className="text-gray-700">→</span>
                       <span className={isActive ? "text-cyan-400 font-bold" : "text-gray-500"}>
                         {chunk.endTime !== undefined ? formatTime(chunk.endTime) : (isActive ? 'REC...' : '00:00:00,000')}
                       </span>
                     </div>
                  </div>
                  <p className={clsx(
                    "text-sm leading-relaxed transition-colors duration-500",
                    isActive ? "text-white font-medium" : isCompleted ? "text-gray-400" : "text-gray-600"
                  )}>
                    {chunk.text}
                  </p>
                </div>
              </div>
            );
          })
        )}
      </div>
      
      <div className="px-6 py-3 bg-black/40 border-t border-white/5 flex items-center justify-between">
        <span className="text-[10px] font-bold uppercase tracking-widest text-gray-500">
          Status: {status}
        </span>
        {status === AppStatus.PLAYING && (
          <div className="flex items-center gap-2">
            <div className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
            <span className="text-[10px] font-bold uppercase tracking-widest text-red-500">Recording</span>
          </div>
        )}
      </div>
    </div>
  );
};

export default SrtPreview;