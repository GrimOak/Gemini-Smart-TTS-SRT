import React, { useEffect, useState } from 'react';
import { Settings2, Volume2, Waves, ChevronDown } from 'lucide-react';
import { VoiceOption } from '../types';

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
      
      // Sort voices: Online/Natural voices first, then alphabetize
      const sortedVoices = availVoices.sort((a, b) => {
        const aIsNatural = a.name.includes("Natural");
        const bIsNatural = b.name.includes("Natural");
        const aIsMicrosoft = a.name.includes("Microsoft");
        const bIsMicrosoft = b.name.includes("Microsoft");

        if (aIsNatural && !bIsNatural) return -1;
        if (!aIsNatural && bIsNatural) return 1;
        if (aIsMicrosoft && !bIsMicrosoft) return -1;
        if (!aIsMicrosoft && bIsMicrosoft) return 1;
        
        return a.lang.localeCompare(b.lang) || a.name.localeCompare(b.name);
      });

      setVoices(sortedVoices);

      // Default Voice Logic
      if (!selectedVoice && sortedVoices.length > 0) {
        // 1. Try to find Ava
        let defaultVoice = sortedVoices.find(v => v.name.includes("Microsoft Ava Online (Natural)"));
        
        // 2. Try to find any other Natural English voice
        if (!defaultVoice) {
          defaultVoice = sortedVoices.find(v => v.name.includes("Natural") && v.lang.startsWith("en"));
        }

        // 3. Try to find any Microsoft English voice
        if (!defaultVoice) {
          defaultVoice = sortedVoices.find(v => v.name.includes("Microsoft") && v.lang.startsWith("en"));
        }

        // 4. Fallback to any English voice
        if (!defaultVoice) {
          defaultVoice = sortedVoices.find(v => v.lang.startsWith("en"));
        }

        // 5. Ultimate fallback
        if (!defaultVoice) {
          defaultVoice = sortedVoices[0];
        }

        onVoiceChange(defaultVoice || null);
      }
    };

    loadVoices();
    // Some browsers need this event to populate the voice list
    window.speechSynthesis.onvoiceschanged = loadVoices;
    
    return () => { 
      window.speechSynthesis.onvoiceschanged = null; 
    };
  }, [selectedVoice, onVoiceChange]);

  return (
    <div className="glass rounded-2xl p-5 space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-xs font-bold uppercase tracking-widest text-emerald-500/80 flex items-center gap-2">
          <Settings2 size={14} /> Voice Engine (EdgeTTS)
        </h3>
      </div>

      <div className="space-y-5">
        {/* Voice Selector */}
        <div className="group">
          <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-2 block group-hover:text-gray-400 transition-colors">
            Selected Speaker
          </label>
          <div className="relative">
            <select
              className="w-full bg-black/40 border border-white/5 rounded-xl py-2.5 pl-3 pr-10 text-sm text-gray-200 focus:ring-1 focus:ring-emerald-500/30 focus:border-emerald-500/30 outline-none transition-all appearance-none cursor-pointer"
              value={selectedVoice?.voiceURI || ''}
              onChange={(e) => {
                const voice = voices.find(v => v.voiceURI === e.target.value);
                onVoiceChange(voice || null);
              }}
            >
              {voices.map((voice) => (
                <option key={voice.voiceURI} value={voice.voiceURI} className="bg-obsidian">
                  {voice.name} ({voice.lang})
                </option>
              ))}
            </select>
            <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none" />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          {/* Rate */}
          <div className="space-y-3">
            <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider flex items-center gap-2">
              <Waves size={12} className="text-cyan-500" /> Speed
            </label>
            <div className="flex items-center gap-3">
              <input
                type="range"
                min="0.5"
                max="2"
                step="0.1"
                value={rate}
                onChange={(e) => onRateChange(parseFloat(e.target.value))}
                className="flex-1 h-1 bg-white/5 rounded-lg appearance-none cursor-pointer accent-emerald-500"
              />
              <span className="text-xs font-mono text-emerald-400 w-8 text-right">{rate}x</span>
            </div>
          </div>

          {/* Pitch */}
          <div className="space-y-3">
            <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider flex items-center gap-2">
              <Volume2 size={12} className="text-purple-500" /> Tone
            </label>
            <div className="flex items-center gap-3">
              <input
                type="range"
                min="0.5"
                max="2"
                step="0.1"
                value={pitch}
                onChange={(e) => onPitchChange(parseFloat(e.target.value))}
                className="flex-1 h-1 bg-white/5 rounded-lg appearance-none cursor-pointer accent-emerald-500"
              />
              <span className="text-xs font-mono text-emerald-400 w-8 text-right">{pitch}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default VoiceControls;