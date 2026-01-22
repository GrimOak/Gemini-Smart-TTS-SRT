import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Sparkles, Play, Square, RefreshCw, AlertCircle, FileText, Cpu, ChevronRight } from 'lucide-react';
import clsx from 'clsx';
import { SubtitleChunk, AppStatus } from './types';
import { optimizeTextForSubtitles } from './services/geminiService';
import { generateSrtContent, downloadSrt } from './utils/srtHelper';
import VoiceControls from './components/VoiceControls';
import SrtPreview from './components/SrtPreview';

const App: React.FC = () => {
  const [inputText, setInputText] = useState<string>('');
  const [status, setStatus] = useState<AppStatus>(AppStatus.IDLE);
  const [chunks, setChunks] = useState<SubtitleChunk[]>([]);
  const [activeChunkId, setActiveChunkId] = useState<number | null>(null);
  
  const [selectedVoice, setSelectedVoice] = useState<SpeechSynthesisVoice | null>(null);
  const [rate, setRate] = useState(1);
  const [pitch, setPitch] = useState(1);

  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);
  const chunksRef = useRef<SubtitleChunk[]>([]);
  const recordingStartTimeRef = useRef<number>(0);

  useEffect(() => {
    chunksRef.current = chunks;
  }, [chunks]);

  const handleOptimization = async () => {
    if (!inputText.trim()) return;
    setStatus(AppStatus.OPTIMIZING);
    try {
      const optimizedLines = await optimizeTextForSubtitles(inputText);
      let charCounter = 0;
      const newChunks: SubtitleChunk[] = optimizedLines.map((line, index) => {
        const start = charCounter;
        const end = start + line.length;
        charCounter = end + 1; // +1 for the space separator in the final joined string
        return { id: index, text: line, startCharIndex: start, endCharIndex: end };
      });
      setChunks(newChunks);
      setStatus(AppStatus.READY);
    } catch (err) {
      console.error(err);
      setStatus(AppStatus.IDLE);
    }
  };

  const stopPlayback = useCallback(() => {
    window.speechSynthesis.cancel();
    setStatus(AppStatus.FINISHED);
    setActiveChunkId(null);
  }, []);

  const startRecording = () => {
    if (chunks.length === 0 || !selectedVoice) return;
    const resetChunks = chunks.map(c => ({ ...c, startTime: undefined, endTime: undefined }));
    setChunks(resetChunks);
    chunksRef.current = resetChunks;

    const fullText = resetChunks.map(c => c.text).join(' ');
    const u = new SpeechSynthesisUtterance(fullText);
    u.voice = selectedVoice;
    u.rate = rate;
    u.pitch = pitch;

    u.onstart = () => {
      recordingStartTimeRef.current = performance.now();
      setStatus(AppStatus.PLAYING);
      setChunks(prev => {
        const next = [...prev];
        if (next[0]) next[0].startTime = 0;
        return next;
      });
      setActiveChunkId(0);
    };

    u.onboundary = (event) => {
      // Use high-res timer relative to start
      const currentTimeMs = performance.now() - recordingStartTimeRef.current;
      const charIndex = event.charIndex;
      const currentChunks = chunksRef.current;
      
      // Find the current active chunk based on spoken character index
      const matchingChunkIndex = currentChunks.findIndex(
        c => charIndex >= c.startCharIndex && charIndex < (c.endCharIndex + 1)
      );

      if (matchingChunkIndex !== -1) {
        setActiveChunkId(prevActiveId => {
          if (prevActiveId !== matchingChunkIndex) {
            setChunks(prev => {
              const next = [...prev];
              // Close the previous chunk timing
              if (prevActiveId !== null && next[prevActiveId]) {
                 next[prevActiveId].endTime = currentTimeMs;
              }
              // Set the start time for the current chunk
              if (next[matchingChunkIndex]) {
                next[matchingChunkIndex].startTime = currentTimeMs;
              }
              return next;
            });
            return matchingChunkIndex;
          }
          return prevActiveId;
        });
      }
    };

    u.onend = () => {
      const finalTimeMs = performance.now() - recordingStartTimeRef.current;
       setChunks(prev => {
        const next = [...prev];
        const lastIndex = next.length - 1;
        if (lastIndex >= 0 && next[lastIndex]) {
          next[lastIndex].endTime = finalTimeMs;
        }
        return next;
      });
      setStatus(AppStatus.FINISHED);
      setActiveChunkId(null);
    };

    u.onerror = (e) => {
      console.error("TTS Error", e);
      setStatus(AppStatus.IDLE);
    };

    utteranceRef.current = u;
    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(u);
  };

  return (
    <div className="h-screen flex flex-col">
      {/* Top Header */}
      <header className="h-16 px-8 border-b border-white/5 flex items-center justify-between bg-black/20 backdrop-blur-md sticky top-0 z-50">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-emerald-500 flex items-center justify-center shadow-[0_0_15px_rgba(16,185,129,0.4)]">
            <Cpu className="text-obsidian" size={18} />
          </div>
          <div>
            <h1 className="text-sm font-black uppercase tracking-[0.2em] text-white">Gemini TTS Studio</h1>
            <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest">SRT Precision Engine</p>
          </div>
        </div>

        <div className="flex items-center gap-6">
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-bold text-gray-600 uppercase tracking-widest">Engine Status:</span>
            <div className={clsx(
              "px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-widest border transition-colors",
              status === AppStatus.PLAYING ? "bg-red-500/10 border-red-500/20 text-red-500" : "bg-emerald-500/10 border-emerald-500/20 text-emerald-500"
            )}>
              {status}
            </div>
          </div>
        </div>
      </header>

      {/* Main Workspace */}
      <main className="flex-1 overflow-hidden flex p-6 gap-6">
        
        {/* Left Side: Editor & Controls */}
        <div className="w-1/2 flex flex-col gap-6">
          {/* Settings Section */}
          <VoiceControls 
            selectedVoice={selectedVoice}
            onVoiceChange={setSelectedVoice}
            rate={rate}
            onRateChange={setRate}
            pitch={pitch}
            onPitchChange={setPitch}
          />

          {/* Editor Section */}
          <div className="flex-1 flex flex-col glass rounded-2xl overflow-hidden border border-white/5 relative">
            <div className="p-4 border-b border-white/5 flex justify-between items-center bg-white/5">
               <div className="flex items-center gap-2">
                 <FileText size={14} className="text-emerald-500" />
                 <span className="text-xs font-bold uppercase tracking-widest text-gray-400">Source Manuscript</span>
               </div>
               
               <button 
                  onClick={handleOptimization}
                  disabled={!inputText.trim() || status === AppStatus.PLAYING || status === AppStatus.OPTIMIZING}
                  className="flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest text-emerald-400 hover:bg-emerald-400/10 transition-all disabled:opacity-20 group"
               >
                 <Sparkles size={12} className={clsx(status === AppStatus.OPTIMIZING && "animate-spin")} />
                 {status === AppStatus.OPTIMIZING ? "Analyzing..." : "AI Segment"}
               </button>
            </div>

            <textarea
               value={inputText}
               onChange={(e) => {
                 setInputText(e.target.value);
                 if (chunks.length > 0) {
                   setChunks([]);
                   setStatus(AppStatus.IDLE);
                 }
               }}
               placeholder="Paste your text manuscript here..."
               className="flex-1 w-full bg-transparent p-6 text-gray-300 focus:outline-none resize-none font-mono text-sm leading-relaxed placeholder:text-gray-700"
            />

            {/* Floating Action Center */}
            <div className="absolute bottom-6 left-1/2 -translate-x-1/2 w-4/5 flex gap-3">
               {status === AppStatus.PLAYING ? (
                 <button
                   onClick={stopPlayback}
                   className="w-full bg-red-600 hover:bg-red-500 text-white py-3 rounded-xl font-black uppercase tracking-widest text-xs flex items-center justify-center gap-2 shadow-2xl transition-all active:scale-95"
                 >
                   <Square size={14} fill="currentColor" /> Stop Engine
                 </button>
               ) : (
                 <button
                   onClick={startRecording}
                   disabled={!inputText.trim() || status === AppStatus.OPTIMIZING}
                   className={clsx(
                     "w-full py-3 rounded-xl font-black uppercase tracking-widest text-xs flex items-center justify-center gap-2 shadow-2xl transition-all active:scale-95",
                     (chunks.length > 0) 
                       ? "bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-900/40" 
                       : "bg-white/5 border border-white/10 text-gray-500 cursor-not-allowed"
                   )}
                 >
                   {chunks.length > 0 ? (
                      <><Play size={14} fill="currentColor" /> Run Recording</>
                   ) : (
                      <><RefreshCw size={14} /> Ready for Segmentation</>
                   )}
                 </button>
               )}
            </div>
          </div>
        </div>

        {/* Right Side: Timeline */}
        <div className="w-1/2">
          <SrtPreview 
            chunks={chunks} 
            activeChunkId={activeChunkId}
            status={status}
            onDownload={() => {
              const content = generateSrtContent(chunks);
              downloadSrt(content, 'studio-export.srt');
            }}
          />
        </div>
      </main>

      {/* Footer Info */}
      <footer className="h-10 px-8 flex items-center justify-between border-t border-white/5 text-[9px] font-bold text-gray-600 uppercase tracking-[0.2em] bg-obsidian">
        <span>© 2025 GEMINI STUDIO V3</span>
        <div className="flex gap-4">
          <span className="text-emerald-500/50">PRO MODE ACTIVE</span>
          <span className="text-cyan-500/50">STRICT SRT COMPLIANCE</span>
        </div>
      </footer>
    </div>
  );
};

export default App;