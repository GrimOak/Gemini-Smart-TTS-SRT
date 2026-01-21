import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Sparkles, Play, Square, RefreshCw, AlertCircle, FileText } from 'lucide-react';
import clsx from 'clsx';
import { SubtitleChunk, AppStatus, VoiceOption } from './types';
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
  const chunksRef = useRef<SubtitleChunk[]>([]); // Ref to access latest chunks inside event listeners

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
        // +1 for the space that will join them (or newline)
        const start = charCounter;
        const end = start + line.length;
        charCounter = end + 1; // +1 assumes we join with a space or newline 
        
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

    // Join text for the utterance
    // IMPORTANT: We join with a single space to maintain character count predictability relative to standard splitting
    // However, some TTS engines pause longer on newlines. 
    // To ensure charIndex alignment is perfect, we must match how we calculated offsets.
    // We calculated offsets assuming a +1 char separate (like a space).
    const fullText = resetChunks.map(c => c.text).join(' ');

    const u = new SpeechSynthesisUtterance(fullText);
    u.voice = selectedVoice;
    u.rate = rate;
    u.pitch = pitch;

    u.onstart = () => {
      startTimeRef.current = performance.now();
      setStatus(AppStatus.PLAYING);
      
      // Mark first chunk as started
      setChunks(prev => {
        const next = [...prev];
        if (next[0]) next[0].startTime = 0;
        return next;
      });
      setActiveChunkId(0);
    };

    u.onboundary = (event) => {
      // event.charIndex is the index of the character about to be spoken
      // event.elapsedTime is the time in seconds (float) since start
      
      // Note: elapsedTime is in seconds, convert to ms
      const currentTimeMs = event.elapsedTime * 1000;
      const charIndex = event.charIndex;

      // Find which chunk this charIndex belongs to
      const currentChunks = chunksRef.current;
      const matchingChunkIndex = currentChunks.findIndex(
        c => charIndex >= c.startCharIndex && charIndex < c.endCharIndex
      );

      if (matchingChunkIndex !== -1) {
        setActiveChunkId(prevActiveId => {
          if (prevActiveId !== matchingChunkIndex) {
            // Transition detected!
            setChunks(prev => {
              const next = [...prev];
              
              // End the previous chunk
              if (prevActiveId !== null && next[prevActiveId]) {
                 // Use current time as end time for previous
                 next[prevActiveId].endTime = currentTimeMs;
              }
              
              // Start the new chunk
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
    window.speechSynthesis.cancel(); // Safety cancel
    window.speechSynthesis.speak(u);
  };

  const handleDownload = () => {
    const content = generateSrtContent(chunks);
    downloadSrt(content, 'gemini-tts-subs.srt');
  };

  return (
    <div className="min-h-screen bg-[#0b0f19] text-gray-100 p-4 md:p-8 font-sans">
      <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-8">
        
        {/* Left Column: Input & Controls */}
        <div className="space-y-6">
          <header className="space-y-2">
            <h1 className="text-3xl font-bold bg-gradient-to-r from-emerald-400 to-cyan-500 bg-clip-text text-transparent inline-block">
              Gemini Smart TTS & SRT
            </h1>
            <p className="text-gray-400">
              Generate perfectly timed subtitle files using Edge/Browser voices and Gemini AI segmentation.
            </p>
          </header>

          <VoiceControls 
            selectedVoice={selectedVoice}
            onVoiceChange={setSelectedVoice}
            rate={rate}
            onRateChange={setRate}
            pitch={pitch}
            onPitchChange={setPitch}
          />

          <div className="space-y-4">
             <div className="flex justify-between items-end">
               <label className="text-sm font-medium text-gray-300 flex items-center gap-2">
                 <FileText size={16} /> Source Text
               </label>
               {status === AppStatus.OPTIMIZING ? (
                 <span className="text-xs text-emerald-400 animate-pulse flex items-center gap-1">
                   <Sparkles size={12} /> Optimizing with Gemini...
                 </span>
               ) : (
                 <button 
                  onClick={handleOptimization}
                  disabled={!inputText.trim() || status === AppStatus.PLAYING}
                  className="text-xs flex items-center gap-1 text-emerald-400 hover:text-emerald-300 transition-colors disabled:opacity-50"
                 >
                   <Sparkles size={12} /> Auto-Segment with AI
                 </button>
               )}
             </div>
             
             <textarea
               value={inputText}
               onChange={(e) => {
                 setInputText(e.target.value);
                 if (chunks.length > 0) {
                   setChunks([]); // Reset chunks on edit
                   setStatus(AppStatus.IDLE);
                 }
               }}
               placeholder="Paste your text here to begin. For best results, use standard punctuation."
               className="w-full h-64 bg-gray-900 border border-gray-800 rounded-xl p-4 text-gray-300 focus:ring-2 focus:ring-emerald-500/50 outline-none resize-none transition-all placeholder:text-gray-600 font-mono text-sm leading-relaxed"
             />

             <div className="flex gap-4">
               {status === AppStatus.PLAYING ? (
                 <button
                   onClick={stopPlayback}
                   className="flex-1 bg-red-500/10 hover:bg-red-500/20 text-red-500 border border-red-500/50 py-3 rounded-lg font-medium transition-all flex items-center justify-center gap-2"
                 >
                   <Square size={18} fill="currentColor" /> Stop Recording
                 </button>
               ) : (
                 <button
                   onClick={startRecording}
                   disabled={!inputText.trim() || (chunks.length === 0 && !inputText.trim())}
                   className={clsx(
                     "flex-1 py-3 rounded-lg font-medium transition-all flex items-center justify-center gap-2 shadow-lg shadow-emerald-900/20",
                     (!inputText.trim()) 
                       ? "bg-gray-800 text-gray-500 cursor-not-allowed" 
                       : "bg-emerald-600 hover:bg-emerald-500 text-white"
                   )}
                 >
                   {chunks.length > 0 ? (
                      <><Play size={18} fill="currentColor" /> Record SRT Timings</>
                   ) : (
                      <><RefreshCw size={18} /> Prepare Text First</>
                   )}
                 </button>
               )}
             </div>
             
             {chunks.length === 0 && inputText.trim().length > 0 && (
               <div className="flex items-start gap-2 text-xs text-amber-400/80 bg-amber-900/10 p-3 rounded-lg border border-amber-900/20">
                 <AlertCircle size={14} className="mt-0.5 shrink-0" />
                 <p>Tip: Click "Auto-Segment with AI" (or just press the button below which does it automatically) to split your text into subtitle lines before recording.</p>
               </div>
             )}
          </div>
        </div>

        {/* Right Column: Preview */}
        <div className="flex flex-col h-full justify-start mt-8 lg:mt-0">
          <SrtPreview 
            chunks={chunks} 
            activeChunkId={activeChunkId}
            status={status}
            onDownload={handleDownload}
          />
          
          <div className="mt-6 p-4 rounded-xl bg-gradient-to-br from-gray-900 to-gray-800 border border-gray-800">
             <h4 className="text-sm font-semibold text-gray-300 mb-2">How it works</h4>
             <ol className="text-xs text-gray-500 space-y-2 list-decimal list-inside">
               <li>Enter text in the editor.</li>
               <li>(Optional) Use <strong>Gemini AI</strong> to intelligently split text into readable subtitle lines.</li>
               <li>Select a voice (Use Edge browser for "Microsoft Online" voices).</li>
               <li>Press <strong>Record SRT Timings</strong>. The app will read the text and capture the exact start/end time of each line.</li>
               <li>Download the generated <code>.srt</code> file.</li>
             </ol>
          </div>
        </div>
      </div>
    </div>
  );
};

export default App;