import { useState, useEffect, useRef } from 'react';
import { Copy, Zap, Eye, EyeOff } from 'lucide-react';
import { analyzeNarrative, splitIntoSegments } from '../utils/narrativeAnalyzer';
// FIXED: Removed the import for ./NarrativeMotion

interface SegmentData {
  text: string;
  emotion: string;
  intensity: number;
  motion: string;
}

export default function SplitViewReader() {
  const [sourceText, setSourceText] = useState('');
  const [segments, setSegments] = useState<SegmentData[]>([]);
  const [currentSegmentIndex, setCurrentSegmentIndex] = useState(0);
  const [isLiveMode, setIsLiveMode] = useState(true);
  const [showMotion, setShowMotion] = useState(true);
  const [autoScroll, setAutoScroll] = useState(true);
  const narrativeRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (sourceText.trim() && isLiveMode) {
      const segmentTexts = splitIntoSegments(sourceText, 250);
      const analyzed = segmentTexts.map(text => {
        const analysis = analyzeNarrative(text);
        return {
          text,
          emotion: analysis.emotion,
          intensity: analysis.intensity,
          motion: analysis.motion
        };
      });
      setSegments(analyzed);
    }
  }, [sourceText, isLiveMode]);

  const emotionColors: Record<string, string> = {
    calm: 'bg-blue-500/20 border-blue-500/40',
    tense: 'bg-red-500/20 border-red-500/40',
    exciting: 'bg-yellow-500/20 border-yellow-500/40',
    sad: 'bg-gray-500/20 border-gray-500/40',
    joyful: 'bg-emerald-500/20 border-emerald-500/40',
    mysterious: 'bg-purple-500/20 border-purple-500/40',
    neutral: 'bg-slate-500/20 border-slate-500/40'
  };

  const emotionGradients: Record<string, string> = {
    calm: 'from-blue-900/20',
    tense: 'from-red-900/20',
    exciting: 'from-yellow-900/20',
    sad: 'from-slate-900/20',
    joyful: 'from-emerald-900/20',
    mysterious: 'from-purple-900/20',
    neutral: 'from-slate-900/20'
  };

  return (
    <div className="h-full flex overflow-hidden">
      {/* LEFT: INPUT */}
      <div className="w-1/2 border-r border-slate-800 flex flex-col">
        <div className="p-4 border-b border-slate-800 flex justify-between items-center bg-slate-900/50">
          <span className="text-xs font-mono uppercase tracking-widest text-slate-500">Source Manuscript</span>
          <button 
            onClick={async () => setSourceText(await navigator.clipboard.readText())}
            className="p-2 hover:bg-white/5 rounded-lg transition-colors text-slate-400"
          >
            <Copy size={16} />
          </button>
        </div>
        <textarea
          value={sourceText}
          onChange={(e) => setSourceText(e.target.value)}
          className="flex-1 bg-transparent p-8 text-slate-300 focus:outline-none resize-none leading-relaxed"
          placeholder="Paste text to analyze..."
        />
      </div>

      {/* RIGHT: NARRATIVE LAYER */}
      <div className="w-1/2 flex flex-col bg-slate-950">
        <div className="p-4 border-b border-white/5 flex justify-between items-center">
          <span className="text-xs font-mono uppercase tracking-widest text-emerald-500">Live Analysis</span>
        </div>
        <div ref={narrativeRef} className="flex-1 overflow-y-auto p-8 space-y-4">
          {segments.map((s, i) => (
            <div 
              key={i}
              onClick={() => setCurrentSegmentIndex(i)}
              className={`p-6 rounded-2xl border transition-all cursor-pointer bg-gradient-to-br ${emotionGradients[s.emotion] || 'from-slate-900/20'} ${
                i === currentSegmentIndex ? emotionColors[s.emotion] : 'border-transparent opacity-40'
              }`}
            >
              <p className="text-white mb-4 leading-relaxed">{s.text}</p>
              <div className="flex gap-2">
                <span className="text-[10px] font-mono uppercase border border-white/10 px-2 py-0.5 rounded text-slate-400">{s.emotion}</span>
                <span className="text-[10px] font-mono uppercase border border-white/10 px-2 py-0.5 rounded text-slate-400">{s.motion}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
