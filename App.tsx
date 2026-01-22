import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Sparkles, Play, Square, RefreshCw, AlertCircle, FileText, Wand2, Layers } from 'lucide-react';
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
  
  // Voice Settings
  const [selectedVoice, setSelectedVoice] = useState<SpeechSynthesisVoice | null>(null);
  const [rate, setRate] = useState(1);
  const [pitch, setPitch] = useState(1);

  // Refs for TTS logic
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);
  const startTimeRef = useRef<number>(0);
  const chunksRef = useRef<SubtitleChunk[]>([]);

  // Sync state to ref
  useEffect(() => {
    chunksRef.current = chunks;
  }, [chunks]);

  const handleOptimization = async () => {
    if (!inputText.trim()) return;
    
    setStatus(AppStatus.OPTIMIZING);
    try {
      const optimizedLines = await optimizeTextForSubtitles(inputText);
      
      // Convert lines to chunks with character offsets
      let charCounter = 0;
      const newChunks: SubtitleChunk[] = optimizedLines.map((line, index) => {
        const start = charCounter;
        const end = start + line.length;
        charCounter = end + 1; // +1 assumes we join with a space
        
        return {
          id: index,
          text: line,
          startCharIndex: start,
          endCharIndex: end,
        };
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

    // Reset timings
    const resetChunks = chunks.map(c => ({ ...c, startTime: undefined, endTime: undefined }));
    setChunks(resetChunks);
    chunksRef.current = resetChunks;

    const fullText = resetChunks.map(c => c.text).join(' ');

    const u = new SpeechSynthesisUtterance(fullText);
    u.voice = selectedVoice;
    u.rate = rate;
    u.pitch = pitch;

    u.onstart = () => {
      startTimeRef.current = performance.now();
      setStatus(AppStatus.PLAYING);
      
      setChunks(prev => {
        const next = [...prev];
        if (next[0]) next[0].startTime = 0;
        return next;
      });
      setActiveChunkId(0);
    };

    u.onboundary = (event) => {
      const currentTimeMs = event.elapsedTime * 1000;
      const charIndex = event.charIndex;

      const currentChunks = chunksRef.current;
      const matchingChunkIndex = currentChunks.findIndex(
        c => charIndex >= c.startCharIndex && charIndex < c.endCharIndex
      );

      if (matchingChunkIndex !== -1) {
        setActiveChunkId(prevActiveId => {
          if (prevActiveId !== matchingChunkIndex) {
            setChunks(prev => {
              const next = [...prev];
              if (prevActiveId !== null && next[prevActiveId]) {
                 next[prevActiveId].endTime = currentTimeMs;
              }
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

    u.onend = (event) => {
      const finalTimeMs = event.elapsedTime * 1000;
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

  const handleDownload = () => {
    const generate = generateSrtContent(chunks);
    downloadSrt(generate, 'gemini-tts-subs.srt');
  };

  return (
    <div className="min-h-screen font-sans text-gray-300 selection:bg-emerald-500/30 selection:text-emerald-100 relative overflow-hidden">
      
      {/* Animated Background Elements */}
      <div className="fixed inset-0 z-0 pointer-events-none">
         <div className="absolute top-0 left-0 w-full h-full bg-grid-pattern opacity-[0.15]"></div>
         <div className="absolute top-10 left-10 w-96 h-96 bg-purple-500/20 rounded-full blur-[100px] animate-blob"></div>
         <div className="absolute bottom-10 right-10 w-96 h-96 bg-emerald-500/10 rounded-full blur-[100px] animate-blob animation-delay-2000"></div>
      </div>

      <div className="max-w-7xl mx-auto p-4 md:p-10 relative z-10">
        
        {/* Header Section */}
        <header className="mb-8 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-white/5 pb-6">
          <div className="space-y-1">
            <h1 className="text-3xl md:text-4xl font-bold text-white tracking-tight flex items-center gap-2">
              <Layers className="text-emerald-500" />
              SRT Studio
            </h1>
            <p className="text-xs text-gray-500 font-mono uppercase tracking-widest pl-1">
              AI-Powered Subtitle Synchronization
            </p>
          </div>
          <div className="flex items-center gap-3">
             <div className="flex items-center gap-2 text-[10px] font-bold font-mono text-emerald-400 bg-emerald-950/40 border border-emerald-500/20 px-3 py-1.5 rounded-full shadow-[0_0_15px_rgba(16,185,129,0.1)]">
               <div className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-pulse"></div>
               SYSTEM ACTIVE
             </div>
          </div>
        </header>

        {/* Main Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          
          {/* Left Column: Input & Controls (5 columns) */}
          <div className="lg:col-span-5 space-y-6">
            
            <VoiceControls 
              selectedVoice={selectedVoice}
              onVoiceChange={setSelectedVoice}
              rate={rate}
              onRateChange={setRate}
              pitch={pitch}
              onPitchChange={setPitch}
            />

            {/* Input Card */}
            <div className="bg-gray-900/60 backdrop-blur-xl border border-white/10 rounded-2xl p-1 flex flex-col shadow-2xl">
               <div className="flex items-center justify-between px-5 py-3 border-b border-white/5 bg-gray-950/30 rounded-t-xl">
                 <label className="text-[10px] font-bold uppercase tracking-widest text-gray-400 flex items-center gap-2">
                   <FileText size={12} /> Source Script
                 </label>
                 <button 
                  onClick={handleOptimization}
                  disabled={!inputText.trim() || status === AppStatus.PLAYING || status === AppStatus.OPTIMIZING}
                  className={clsx(
                    "text-[10px] font-bold uppercase tracking-wider flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all border shadow-sm",
                    status === AppStatus.OPTIMIZING 
                      ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-400 cursor-wait" 
                      : "bg-gray-800 hover:bg-emerald-500/10 border-gray-700 hover:border-emerald-500/30 text-gray-400 hover:text-emerald-300 disabled:opacity-50"
                  )}
                 >
                   {status === AppStatus.OPTIMIZING ? (
                      <><RefreshCw size={12} className="animate-spin" /> Processing...</>
                   ) : (
                      <><Wand2 size={12} /> Auto-Split</>
                   )}
                 </button>
               </div>
               
               <div className="p-2">
                 <textarea
                   value={inputText}
                   onChange={(e) => {
                     setInputText(e.target.value);
                     if (chunks.length > 0) {
                       setChunks([]); 
                       setStatus(AppStatus.IDLE);
                     }
                   }}
                   placeholder="Enter your script here. For best results with 'Auto-Split', use proper punctuation."
                   className="w-full h-80 bg-gray-950/40 rounded-xl p-4 text-gray-300 focus:bg-gray-950/80 outline-none resize-none transition-all placeholder:text-gray-700 font-mono text-sm leading-relaxed border border-transparent focus:border-white/10"
                 />
               </div>
            </div>

            {/* Action Buttons */}
            <div className="grid grid-cols-1">
               {status === AppStatus.PLAYING ? (
                 <button
                   onClick={stopPlayback}
                   className="group relative overflow-hidden bg-red-500/10 hover:bg-red-500/20 border border-red-500/50 py-4 rounded-xl transition-all shadow-[0_0_20px_rgba(239,68,68,0.2)]"
                 >
                   <div className="flex items-center justify-center gap-3 text-red-500 font-bold tracking-widest text-sm">
                     <Square size={18} fill="currentColor" /> STOP RECORDING
                   </div>
                 </button>
               ) : (
                 <button
                   onClick={chunks.length > 0 ? startRecording : handleOptimization}
                   disabled={!inputText.trim() || status === AppStatus.OPTIMIZING}
                   className={clsx(
                     "relative overflow-hidden py-4 rounded-xl font-bold tracking-widest text-sm transition-all flex items-center justify-center gap-3 shadow-lg group",
                     (!inputText.trim() || status === AppStatus.OPTIMIZING) 
                       ? "bg-gray-800 text-gray-600 cursor-not-allowed border border-white/5" 
                       : "bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white shadow-emerald-900/30 hover:shadow-emerald-900/50 hover:-translate-y-0.5 border border-emerald-400/20"
                   )}
                 >
                   {/* Button glow effect */}
                   <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-500 blur-xl"></div>
                   
                   {status === AppStatus.OPTIMIZING ? (
                      <><RefreshCw size={18} className="animate-spin relative z-10" /> <span className="relative z-10">OPTIMIZING...</span></>
                   ) : chunks.length > 0 ? (
                      <><Play size={18} fill="currentColor" className="relative z-10" /> <span className="relative z-10">START RECORDING</span></>
                   ) : (
                      <><Sparkles size={18} className="relative z-10" /> <span className="relative z-10">PREPARE SCRIPT</span></>
                   )}
                 </button>
               )}
            </div>
          </div>

          {/* Right Column: Preview (7 columns) */}
          <div className="lg:col-span-7 flex flex-col h-full">
            <SrtPreview 
              chunks={chunks} 
              activeChunkId={activeChunkId}
              status={status}
              onDownload={handleDownload}
            />
          </div>

        </div>
      </div>
    </div>
  );
};

export default App;