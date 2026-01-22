import React, { useEffect, useState } from 'react';
import { Settings2, Mic, Zap, Music } from 'lucide-react';

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
        // Prefer English US Microsoft voice if available
        const defaultVoice = sortedVoices.find(v => v.name.includes("Microsoft Guy") || v.name.includes("English (United States)")) || sortedVoices[0];
        onVoiceChange(defaultVoice);
      }
    };

    loadVoices();
    window.speechSynthesis.onvoiceschanged = loadVoices;
    
    return () => {
      window.speechSynthesis.onvoiceschanged = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="bg-gray-900/40 backdrop-blur-md border border-white/10 rounded-2xl p-6 shadow-xl relative overflow-hidden group">
      {/* Subtle decorative glow */}
      <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/5 rounded-full blur-3xl -z-10 transition-opacity opacity-50 group-hover:opacity-100"></div>

      <div className="flex items-center gap-3 mb-6">
        <div className="p-2 bg-gray-800 rounded-lg border border-white/5">
          <Settings2 size={18} className="text-emerald-400" />
        </div>
        <h2 className="font-semibold text-lg text-white">Studio Settings</h2>
      </div>

      <div className="space-y-6">
        {/* Voice Selector */}
        <div className="space-y-3">
          <label className="text-xs font-medium uppercase tracking-wider text-gray-500 flex items-center gap-2">
            <Mic size={12} /> Voice Model
          </label>
          <div className="relative">
            <select
              className="w-full bg-gray-950/50 border border-gray-700/50 hover:border-emerald-500/30 rounded-xl p-3 text-sm text-gray-200 focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500/50 outline-none transition-all appearance-none cursor-pointer"
              value={selectedVoice?.voiceURI || ''}
              onChange={(e) => {
                const voice = voices.find(v => v.voiceURI === e.target.value);
                onVoiceChange(voice || null);
              }}
            >
              {voices.map((voice) => (
                <option key={voice.voiceURI} value={voice.voiceURI} className="bg-gray-900">
                  {voice.name} ({voice.lang})
                </option>
              ))}
            </select>
            <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-gray-500">
              <svg width="10" height="6" viewBox="0 0 10 6" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M1 1L5 5L9 1" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
          </div>
          <p className="text-[10px] text-gray-500 pl-1">
             <span className="text-emerald-500/80">Pro Tip:</span> Use Microsoft Edge for high-quality "Natural" voices.
          </p>
        </div>

        <div className="grid grid-cols-2 gap-6">
          {/* Speed Control */}
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <label className="text-xs font-medium uppercase tracking-wider text-gray-500 flex items-center gap-2">
                <Zap size={12} /> Speed
              </label>
              <span className="text-xs font-mono text-emerald-400 bg-emerald-400/10 px-1.5 py-0.5 rounded border border-emerald-400/20">{rate.toFixed(1)}x</span>
            </div>
            <input
              type="range"
              min="0.5"
              max="2"
              step="0.1"
              value={rate}
              onChange={(e) => onRateChange(parseFloat(e.target.value))}
              className="w-full"
            />
          </div>

          {/* Pitch Control */}
          <div className="space-y-3">
             <div className="flex justify-between items-center">
              <label className="text-xs font-medium uppercase tracking-wider text-gray-500 flex items-center gap-2">
                <Music size={12} /> Pitch
              </label>
              <span className="text-xs font-mono text-cyan-400 bg-cyan-400/10 px-1.5 py-0.5 rounded border border-cyan-400/20">{pitch.toFixed(1)}</span>
            </div>
            <input
              type="range"
              min="0.5"
              max="2"
              step="0.1"
              value={pitch}
              onChange={(e) => onPitchChange(parseFloat(e.target.value))}
              className="w-full"
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default VoiceControls;