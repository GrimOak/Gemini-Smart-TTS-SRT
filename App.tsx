import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Sparkles, Play, Square, RefreshCw, AlertCircle, FileText, Wand2 } from 'lucide-react';
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
    <div className="min-h-screen font-sans text-gray-300 selection:bg-emerald-500/30 selection:text-emerald-100">
      <div className="max-w-7xl mx-auto p-6 md:p-10">
        
        {/* Header Section */}
        <header className="mb-10 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div className="space-y-1">
            <h1 className="text-4xl font-bold bg-gradient-to-r from-emerald-400 via-teal-400 to-cyan-400 bg-clip-text text-transparent tracking-tight">
              SRT Studio AI
            </h1>
            <p className="text-sm text-gray-500 font-medium tracking-wide uppercase">
              Intelligent Text-to-Speech & Subtitle Timing
            </p>
          </div>
          <div className="flex items-center gap-2 text-xs font-mono text-gray-600 bg-gray-900/50 border border-white/5 px-3 py-1.5 rounded-full">
            <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></div>
            SYSTEM ONLINE
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
            <div className="bg-gray-900/40 backdrop-blur-md border border-white/10 rounded-2xl p-1 flex flex-col shadow-xl">
               <div className="flex items-center justify-between px-5 py-3 border-b border-white/5">
                 <label className="text-xs font-medium uppercase tracking-wider text-gray-400 flex items-center gap-2">
                   <FileText size={14} /> Source Script
                 </label>
                 <button 
                  onClick={handleOptimization}
                  disabled={!inputText.trim() || status === AppStatus.PLAYING || status === AppStatus.OPTIMIZING}
                  className={clsx(
                    "text-xs flex items-center gap-1.5 px-3 py-1 rounded-full transition-all border",
                    status === AppStatus.OPTIMIZING 
                      ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-400 cursor-wait" 
                      : "bg-gray-800 hover:bg-emerald-500/20 border-white/10 hover:border-emerald-500/30 text-gray-300 hover:text-emerald-300 disabled:opacity-50"
                  )}
                 >
                   {status === AppStatus.OPTIMIZING ? (
                      <><RefreshCw size={12} className="animate-spin" /> Processing...</>
                   ) : (
                      <><Wand2 size={12} /> Auto-Split Sentences</>
                   )}
                 </button>
               </div>
               
               <div className="p-1">
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
                   className="w-full h-80 bg-gray-950/30 rounded-xl p-4 text-gray-300 focus:bg-gray-950/50 outline-none resize-none transition-all placeholder:text-gray-700 font-mono text-sm leading-relaxed border border-transparent focus:border-white/5"
                 />
               </div>
            </div>

            {/* Action Buttons */}
            <div className="grid grid-cols-1">
               {status === AppStatus.PLAYING ? (
                 <button
                   onClick={stopPlayback}
                   className="group relative overflow-hidden bg-red-500/10 hover:bg-red-500/20 border border-red-500/50 py-4 rounded-xl transition-all"
                 >
                   <div className="flex items-center justify-center gap-3 text-red-500 font-bold tracking-wide">
                     <Square size={20} fill="currentColor" /> STOP RECORDING
                   </div>
                 </button>
               ) : (
                 <button
                   onClick={chunks.length > 0 ? startRecording : handleOptimization}
                   disabled={!inputText.trim() || status === AppStatus.OPTIMIZING}
                   className={clsx(
                     "relative overflow-hidden py-4 rounded-xl font-bold tracking-wide transition-all flex items-center justify-center gap-3 shadow-lg group",
                     (!inputText.trim() || status === AppStatus.OPTIMIZING) 
                       ? "bg-gray-800 text-gray-600 cursor-not-allowed border border-white/5" 
                       : "bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white shadow-emerald-900/20 hover:shadow-emerald-900/40 hover:-translate-y-0.5"
                   )}
                 >
                   {/* Button glow effect */}
                   <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300 blur-xl"></div>
                   
                   {status === AppStatus.OPTIMIZING ? (
                      <><RefreshCw size={20} className="animate-spin relative z-10" /> <span className="relative z-10">OPTIMIZING...</span></>
                   ) : chunks.length > 0 ? (
                      <><Play size={20} fill="currentColor" className="relative z-10" /> <span className="relative z-10">START RECORDING</span></>
                   ) : (
                      <><Sparkles size={20} className="relative z-10" /> <span className="relative z-10">PREPARE SCRIPT</span></>
                   )}
                 </button>
               )}
               
               {chunks.length === 0 && inputText.trim().length > 0 && (
                 <div className="mt-4 flex items-center justify-center gap-2 text-xs text-amber-500/70">
                   <AlertCircle size={12} />
                   <span>Don't forget to split your sentences before recording!</span>
                 </div>
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
            
            {/* Instruction Footer */}
            <div className="mt-6 grid grid-cols-3 gap-4">
              {[
                { step: "01", title: "Write & Split", desc: "Paste text and use AI to split into perfect subtitle lines." },
                { step: "02", title: "Select Voice", desc: "Choose a Microsoft Edge natural voice for best quality." },
                { step: "03", title: "Record & Export", desc: "The app reads the text and auto-generates timestamped SRTs." },
              ].map((item) => (
                <div key={item.step} className="bg-gray-900/30 border border-white/5 rounded-lg p-4 backdrop-blur-sm">
                  <div className="text-xs font-bold text-emerald-500/50 mb-1">{item.step}</div>
                  <div className="text-sm font-semibold text-gray-300 mb-1">{item.title}</div>
                  <div className="text-[10px] text-gray-500 leading-tight">{item.desc}</div>
                </div>
              ))}
            </div>
          </div>

        </div>
      </div>
    </div>
  );
};

export default App;