import React, { useRef, useEffect } from 'react';
import { SubtitleChunk, AppStatus } from '../types';
import { formatTime } from '../utils/srtHelper';
import { Download, Monitor, Activity, Radio, PauseCircle } from 'lucide-react';
import clsx from 'clsx';

interface SrtPreviewProps {
  chunks: SubtitleChunk[];
  activeChunkId: number | null;
  status: AppStatus;
  onDownload: () => void;
}

const AudioVisualizer = ({ isActive }: { isActive: boolean }) => (
  <div className="flex items-end gap-0.5 h-4">
    {[...Array(5)].map((_, i) => (
      <div 
        key={i} 
        className="bar" 
        style={{ 
          animationDuration: `${400 + Math.random() * 300}ms`,
          animationPlayState: isActive ? 'running' : 'paused',
          opacity: isActive ? 1 : 0.2
        }} 
      />
    ))}
  </div>
);

const SrtPreview: React.FC<SrtPreviewProps> = ({ chunks, activeChunkId, status, onDownload }) => {
  const scrollRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to active chunk with margin
  useEffect(() => {
    if (activeChunkId !== null && scrollRef.current) {
      const activeEl = scrollRef.current.querySelector(`[data-id="${activeChunkId}"]`);
      if (activeEl) {
        activeEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }
  }, [activeChunkId]);

  const isRecording = status === AppStatus.PLAYING;

  return (
    <div className="flex flex-col h-[650px] bg-gray-900/60 backdrop-blur-xl border border-white/10 rounded-2xl shadow-2xl overflow-hidden relative group">
      {/* Top Status Bar */}
      <div className="px-5 py-4 border-b border-white/5 flex justify-between items-center bg-gray-950/50 relative z-20">
        <div className="flex items-center gap-3">
          <div className={clsx("p-1.5 rounded-lg border", isRecording ? "bg-red-500/10 border-red-500/20" : "bg-gray-800/50 border-white/5")}>
             <Monitor className={clsx("transition-colors duration-500", isRecording ? "text-red-500" : "text-gray-400")} size={16} />
          </div>
          <div className="flex flex-col">
            <h3 className="font-bold text-gray-200 text-xs tracking-widest uppercase">Live Timeline</h3>
            <span className="text-[10px] text-gray-500 font-mono">
              {isRecording ? 'SYNCING AUDIO...' : 'READY TO RECORD'}
            </span>
          </div>
        </div>
        
        <div className="flex items-center gap-4">
           {isRecording && (
              <div className="hidden md:flex items-center gap-3 px-3 py-1.5 bg-gray-900 border border-gray-800 rounded-lg">
                <AudioVisualizer isActive={true} />
                <span className="text-[10px] font-mono text-emerald-400 tracking-wider">ON AIR</span>
              </div>
           )}
           <button
             onClick={onDownload}
             disabled={chunks.length === 0}
             className="flex items-center gap-2 px-3 py-1.5 text-xs font-bold uppercase tracking-wider text-emerald-400 hover:text-emerald-300 bg-emerald-500/5 hover:bg-emerald-500/10 border border-emerald-500/20 hover:border-emerald-500/40 rounded transition-all disabled:opacity-30 disabled:cursor-not-allowed"
           >
             <Download size={14} />
             Export
           </button>
        </div>
      </div>

      {/* Progress Bar (Visible only when chunks exist) */}
      {chunks.length > 0 && (
        <div className="h-1 w-full bg-gray-800">
           <div 
             className="h-full bg-gradient-to-r from-emerald-500 to-cyan-500 transition-all duration-300"
             style={{ width: `${activeChunkId !== null ? ((activeChunkId + 1) / chunks.length) * 100 : 0}%` }}
           />
        </div>
      )}

      {/* Content Area */}
      <div 
        ref={scrollRef}
        className="flex-1 overflow-y-auto p-2 md:p-4 space-y-1 relative bg-gradient-to-b from-transparent to-black/20"
      >
        {chunks.length === 0 ? (
          <div className="absolute inset-0 flex flex-col items-center justify-center text-gray-600 space-y-4">
             <div className="relative">
                <div className="absolute inset-0 bg-emerald-500/20 blur-xl rounded-full animate-pulse"></div>
                <div className="w-20 h-20 rounded-2xl bg-gray-900/80 border border-white/5 flex items-center justify-center backdrop-blur relative z-10">
                  <Activity size={32} className="text-gray-500" />
                </div>
             </div>
            <p className="text-sm font-medium tracking-wide uppercase text-gray-500">Timeline Empty</p>
          </div>
        ) : (
          <div className="pb-20 pt-2">
            {chunks.map((chunk, index) => {
              const isActive = chunk.id === activeChunkId;
              
              return (
                <div
                  key={chunk.id}
                  data-id={chunk.id}
                  className={clsx(
                    "relative flex gap-4 p-4 rounded-xl transition-all duration-500 border",
                    isActive 
                      ? "bg-gray-800/60 border-emerald-500/50 shadow-lg shadow-emerald-900/10 scale-[1.01] z-10" 
                      : isRecording 
                        ? "bg-transparent border-transparent opacity-40 blur-[1px] scale-95" 
                        : "bg-transparent border-transparent hover:bg-white/5 hover:border-white/5"
                  )}
                >
                  {/* Time Column */}
                  <div className="flex flex-col gap-1 min-w-[80px] md:min-w-[100px] text-[10px] font-mono pt-1 text-right border-r border-white/5 pr-4">
                    <span className={clsx("transition-colors", isActive ? "text-emerald-400 font-bold" : "text-gray-600")}>
                      {chunk.startTime !== undefined ? formatTime(chunk.startTime).split(',')[0] : '--:--'}
                    </span>
                    <span className={clsx("transition-colors", isActive ? "text-cyan-400 font-bold" : "text-gray-600")}>
                      {chunk.endTime !== undefined ? formatTime(chunk.endTime).split(',')[0] : '--:--'}
                    </span>
                  </div>

                  {/* Text Column */}
                  <div className="flex-1 relative">
                     {/* Line Indicator */}
                    <div className="flex justify-between items-start mb-1">
                      <span className={clsx(
                        "text-[9px] font-bold uppercase tracking-widest",
                        isActive ? "text-emerald-500" : "text-gray-700"
                      )}>
                        Segment {String(index + 1).padStart(2, '0')}
                      </span>
                      {isActive && isRecording && <div className="w-1.5 h-1.5 bg-red-500 rounded-full animate-ping" />}
                    </div>
                    
                    <p className={clsx(
                      "text-sm md:text-base leading-relaxed transition-all duration-300 font-medium",
                      isActive ? "text-white drop-shadow-md" : "text-gray-400"
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
      <div className="px-4 py-3 bg-gray-950 border-t border-white/5 text-center flex justify-between items-center text-[10px] font-mono text-gray-500 uppercase tracking-wider">
         <div className="flex items-center gap-2">
           <div className={clsx("w-1.5 h-1.5 rounded-full", status === AppStatus.PLAYING ? "bg-emerald-500 animate-pulse" : "bg-gray-700")} />
           {status} MODE
         </div>
         <div>
            {chunks.length} Segments • {(chunks.length * 2.5 / 60).toFixed(1)}m est.
         </div>
      </div>
    </div>
  );
};

export default SrtPreview;