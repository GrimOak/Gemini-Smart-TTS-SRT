import React, { useEffect, useState } from 'react';
import { Settings2, Mic, Zap, Music, Play, Volume2 } from 'lucide-react';

interface VoiceControlsProps {
  onVoiceChange: (voice: SpeechSynthesisVoice | null) => void;
  onRateChange: (rate: number) => void;
  onPitchChange: (pitch: number) => void;
  selectedVoice: SpeechSynthesisVoice | null;
  rate: number;
  pitch: number;
}

const VoiceControls: React.FC<VoiceControlsProps> = ({
  onVoiceChange,
  onRateChange,
  onPitchChange,
  selectedVoice,
  rate,
  pitch,
}) => {
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [isPlayingTest, setIsPlayingTest] = useState(false);

  useEffect(() => {
    const loadVoices = () => {
      const availVoices = window.speechSynthesis.getVoices();
      // Sort to put Microsoft/Edge voices first if available, then Google, then others
      const sortedVoices = availVoices.sort((a, b) => {
        const aIsEdge = a.name.includes("Microsoft");
        const bIsEdge = b.name.includes("Microsoft");
        if (aIsEdge && !bIsEdge) return -1;
        if (!aIsEdge && bIsEdge) return 1;
        return a.lang.localeCompare(b.lang);
      });
      setVoices(sortedVoices);
      
      // Set default if none selected
      if (!selectedVoice && sortedVoices.length > 0) {
        // Priority 1: Microsoft Ava Online (Natural) - English (United States)
        let defaultVoice = sortedVoices.find(v => 
          v.name.includes("Microsoft Ava") && 
          v.name.includes("Natural") && 
          v.name.includes("English (United States)")
        );

        // Priority 2: Any English (United States) voice
        if (!defaultVoice) {
          defaultVoice = sortedVoices.find(v => v.name.includes("English (United States)"));
        }

        // Priority 3: Any English voice
        if (!defaultVoice) {
            defaultVoice = sortedVoices.find(v => v.lang.startsWith("en"));
        }

        // Fallback: First available
        onVoiceChange(defaultVoice || sortedVoices[0]);
      }
    };

    loadVoices();
    window.speechSynthesis.onvoiceschanged = loadVoices;
    
    return () => {
      window.speechSynthesis.onvoiceschanged = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleTestVoice = () => {
    if (!selectedVoice) return;
    
    window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance("This is a preview of the selected voice.");
    u.voice = selectedVoice;
    u.rate = rate;
    u.pitch = pitch;
    
    u.onstart = () => setIsPlayingTest(true);
    u.onend = () => setIsPlayingTest(false);
    u.onerror = () => setIsPlayingTest(false);
    
    window.speechSynthesis.speak(u);
  };

  return (
    <div className="bg-gray-900/60 backdrop-blur-xl border border-white/10 rounded-2xl p-5 shadow-2xl relative overflow-hidden group">
      {/* Decorative gradient glow */}
      <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/5 rounded-full blur-3xl -z-10 transition-opacity opacity-30 group-hover:opacity-60 pointer-events-none"></div>

      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-gradient-to-br from-gray-800 to-gray-900 rounded-lg border border-white/5 shadow-inner">
            <Settings2 size={18} className="text-emerald-400" />
          </div>
          <h2 className="font-bold text-lg text-white tracking-tight">Studio Config</h2>
        </div>
      </div>

      <div className="space-y-4 lg:space-y-5">
        {/* Voice Selector */}
        <div className="space-y-2">
          <label className="text-[10px] font-bold uppercase tracking-widest text-gray-500 flex items-center gap-2">
            <Mic size={12} /> Voice Model
          </label>
          <div className="flex gap-2">
            <div className="relative flex-1">
              <select
                className="w-full bg-gray-950 border border-gray-800 hover:border-emerald-500/30 rounded-xl p-3 text-sm text-gray-200 focus:ring-1 focus:ring-emerald-500/50 focus:border-emerald-500/50 outline-none transition-all appearance-none cursor-pointer shadow-sm"
                value={selectedVoice?.voiceURI || ''}
                onChange={(e) => {
                  const voice = voices.find(v => v.voiceURI === e.target.value);
                  onVoiceChange(voice || null);
                }}
              >
                {voices.map((voice) => (
                  <option key={voice.voiceURI} value={voice.voiceURI} className="bg-gray-900">
                    {voice.name}
                  </option>
                ))}
              </select>
              <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-gray-500">
                 <Volume2 size={14} />
              </div>
            </div>
            
            <button 
              onClick={handleTestVoice}
              disabled={isPlayingTest}
              className="px-4 bg-gray-800 hover:bg-emerald-500/20 border border-gray-700 hover:border-emerald-500/40 rounded-xl flex items-center justify-center text-emerald-400 transition-all active:scale-95 disabled:opacity-50"
              title="Test Voice"
            >
              {isPlayingTest ? <div className="w-2 h-2 bg-emerald-400 rounded-full animate-ping"/> : <Play size={16} fill="currentColor" />}
            </button>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-6 pt-1">
          {/* Speed Control */}
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <label className="text-[10px] font-bold uppercase tracking-widest text-gray-500 flex items-center gap-2">
                <Zap size={12} /> Speed
              </label>
              <span className="text-[10px] font-mono font-bold text-emerald-400 bg-emerald-950/30 px-2 py-0.5 rounded border border-emerald-500/20">{rate.toFixed(1)}x</span>
            </div>
            <div className="relative group/slider">
               <input
                type="range"
                min="0.5"
                max="2"
                step="0.1"
                value={rate}
                onChange={(e) => onRateChange(parseFloat(e.target.value))}
                className="w-full relative z-10"
              />
              <div className="absolute inset-y-0 left-0 bg-emerald-500/10 rounded pointer-events-none w-full h-1 top-1.5"></div>
            </div>
          </div>

          {/* Pitch Control */}
          <div className="space-y-2">
             <div className="flex justify-between items-center">
              <label className="text-[10px] font-bold uppercase tracking-widest text-gray-500 flex items-center gap-2">
                <Music size={12} /> Pitch
              </label>
              <span className="text-[10px] font-mono font-bold text-cyan-400 bg-cyan-950/30 px-2 py-0.5 rounded border border-cyan-500/20">{pitch.toFixed(1)}</span>
            </div>
            <div className="relative group/slider">
              <input
                type="range"
                min="0.5"
                max="2"
                step="0.1"
                value={pitch}
                onChange={(e) => onPitchChange(parseFloat(e.target.value))}
                className="w-full relative z-10"
              />
              <div className="absolute inset-y-0 left-0 bg-cyan-500/10 rounded pointer-events-none w-full h-1 top-1.5"></div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default VoiceControls;