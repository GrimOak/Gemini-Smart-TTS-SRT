import React, { useEffect, useState } from 'react';
import { Settings2, Mic, Activity } from 'lucide-react';
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
    <div className="bg-gray-900 border border-gray-800 rounded-xl p-6 shadow-xl mb-6">
      <div className="flex items-center gap-2 mb-4 text-emerald-400">
        <Settings2 size={20} />
        <h2 className="font-semibold text-lg">Voice Settings</h2>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Voice Selector */}
        <div className="space-y-2">
          <label className="text-sm text-gray-400 flex items-center gap-2">
            <Mic size={14} /> Voice
          </label>
          <select
            className="w-full bg-gray-800 border border-gray-700 rounded-lg p-2.5 text-sm text-gray-200 focus:ring-2 focus:ring-emerald-500/50 outline-none transition-all"
            value={selectedVoice?.voiceURI || ''}
            onChange={(e) => {
              const voice = voices.find(v => v.voiceURI === e.target.value);
              onVoiceChange(voice || null);
            }}
          >
            {voices.map((voice) => (
              <option key={voice.voiceURI} value={voice.voiceURI}>
                {voice.name} ({voice.lang})
              </option>
            ))}
          </select>
          <p className="text-xs text-gray-500 mt-1">
            * Use Microsoft Edge browser to access "Microsoft" natural voices.
          </p>
        </div>

        {/* Speed Control */}
        <div className="space-y-2">
          <label className="text-sm text-gray-400 flex items-center gap-2">
            <Activity size={14} /> Speed ({rate}x)
          </label>
          <input
            type="range"
            min="0.5"
            max="2"
            step="0.1"
            value={rate}
            onChange={(e) => onRateChange(parseFloat(e.target.value))}
            className="w-full h-2 bg-gray-800 rounded-lg appearance-none cursor-pointer accent-emerald-500"
          />
          <div className="flex justify-between text-xs text-gray-600">
            <span>Slow</span>
            <span>Fast</span>
          </div>
        </div>

        {/* Pitch Control */}
        <div className="space-y-2">
          <label className="text-sm text-gray-400 flex items-center gap-2">
            <Activity size={14} /> Pitch ({pitch})
          </label>
          <input
            type="range"
            min="0.5"
            max="2"
            step="0.1"
            value={pitch}
            onChange={(e) => onPitchChange(parseFloat(e.target.value))}
            className="w-full h-2 bg-gray-800 rounded-lg appearance-none cursor-pointer accent-emerald-500"
          />
           <div className="flex justify-between text-xs text-gray-600">
            <span>Low</span>
            <span>High</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default VoiceControls;