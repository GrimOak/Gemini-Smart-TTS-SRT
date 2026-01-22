import React, { useRef, useEffect } from 'react';
import { SubtitleChunk, AppStatus } from '../types';
import { formatTime } from '../utils/srtHelper';
import { Download, Monitor, Activity, Radio } from 'lucide-react';
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
    <div className="flex flex-col h-[600px] bg-black/40 backdrop-blur-md border border-white/10 rounded-2xl shadow-2xl overflow-hidden relative">
      {/* Header */}
      <div className="px-5 py-4 border-b border-white/5 flex justify-between items-center bg-gray-900/50">
        <div className="flex items-center gap-3">
          <Monitor className={clsx("transition-colors duration-500", status === AppStatus.PLAYING ? "text-red-500" : "text-gray-400")} size={18} />
          <h3 className="font-semibold text-gray-200 text-sm tracking-wide">TIMELINE MONITOR</h3>
        </div>
        
        <div className="flex items-center gap-4">
           {status === AppStatus.PLAYING && (
              <div className="flex items-center gap-2 px-2 py-1 bg-red-500/10 border border-red-500/20 rounded text-red-400 text-xs font-mono uppercase tracking-wider animate-pulse">
                <div className="w-2 h-2 rounded-full bg-red-500"></div>
                Recording
              </div>
           )}
           <button
             onClick={onDownload}
             disabled={chunks.length === 0}
             className="flex items-center gap-2 px-3 py-1.5 text-xs font-medium text-emerald-400 hover:text-emerald-300 bg-emerald-500/5 hover:bg-emerald-500/10 border border-emerald-500/20 hover:border-emerald-500/40 rounded transition-all disabled:opacity-30 disabled:cursor-not-allowed"
           >
             <Download size={14} />
             Export .SRT
           </button>
        </div>
      </div>

      {/* Content Area */}
      <div 
        ref={scrollRef}
        className="flex-1 overflow-y-auto p-4 space-y-2 relative"
      >
        {chunks.length === 0 ? (
          <div className="absolute inset-0 flex flex-col items-center justify-center text-gray-600 space-y-4">
            <div className="w-20 h-20 rounded-full bg-gray-800/50 border border-white/5 flex items-center justify-center">
              <Activity size={32} className="opacity-20" />
            </div>
            <p className="text-sm font-medium">Ready to initialize timeline...</p>
          </div>
        ) : (
          <div className="pb-10">
            {chunks.map((chunk, index) => {
              const isActive = chunk.id === activeChunkId;
              
              return (
                <div
                  key={chunk.id}
                  data-id={chunk.id}
                  className={clsx(
                    "relative group flex gap-4 p-3 rounded-lg transition-all duration-300 border-l-[3px]",
                    isActive 
                      ? "bg-emerald-500/10 border-emerald-500 shadow-[inset_0_0_20px_rgba(16,185,129,0.05)]" 
                      : "bg-transparent border-transparent hover:bg-white/5"
                  )}
                >
                  {/* Time Column */}
                  <div className="flex flex-col gap-1 min-w-[100px] text-[10px] font-mono opacity-70 pt-1">
                    <span className={clsx(isActive ? "text-emerald-400 font-bold" : "text-gray-500")}>
                      {chunk.startTime !== undefined ? formatTime(chunk.startTime).split(',')[0] : '--:--:--'}
                    </span>
                    <span className="text-gray-700 mx-auto">↓</span>
                     <span className={clsx(isActive ? "text-emerald-400 font-bold" : "text-gray-500")}>
                      {chunk.endTime !== undefined ? formatTime(chunk.endTime).split(',')[0] : '--:--:--'}
                    </span>
                  </div>

                  {/* Text Column */}
                  <div className="flex-1">
                    <div className="flex justify-between items-start mb-1">
                      <span className="text-[10px] font-bold text-gray-600 uppercase tracking-wider">Line {index + 1}</span>
                      {isActive && <Radio size={12} className="text-emerald-500 animate-pulse" />}
                    </div>
                    <p className={clsx(
                      "text-sm leading-relaxed transition-colors",
                      isActive ? "text-emerald-50 font-medium" : "text-gray-400 group-hover:text-gray-300"
                    )}>
                      {chunk.text}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
      
      {/* Footer Status */}
      <div className="px-4 py-2 bg-gray-950/80 border-t border-white/5 backdrop-blur text-center">
        <p className="text-[10px] text-gray-500 font-mono flex justify-center gap-4">
           <span>Total Lines: <strong className="text-gray-300">{chunks.length}</strong></span>
           <span>•</span>
           <span>Status: <strong className={clsx(
             status === AppStatus.PLAYING ? "text-emerald-400" : 
             status === AppStatus.OPTIMIZING ? "text-cyan-400" : "text-gray-300"
           )}>{status}</strong></span>
        </p>
      </div>
    </div>
  );
};

export default SrtPreview;