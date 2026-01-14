import { useState, useEffect, useRef } from 'react';
import { Copy, Zap, Settings, Eye, EyeOff } from 'lucide-react';
import { analyzeNarrative, splitIntoSegments } from '../utils/narrativeAnalyzer';
import NarrativeMotion from './NarrativeMotion';

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
  const sourceRef = useRef<HTMLTextAreaElement>(null);

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

  useEffect(() => {
    if (autoScroll && narrativeRef.current && segments.length > 0) {
      const segmentElements = narrativeRef.current.querySelectorAll('[data-segment]');
      if (segmentElements[currentSegmentIndex]) {
        segmentElements[currentSegmentIndex].scrollIntoView({
          behavior: 'smooth',
          block: 'center'
        });
      }
    }
  }, [currentSegmentIndex, autoScroll]);

  const handleQuickPaste = async () => {
    try {
      const text = await navigator.clipboard.readText();
      setSourceText(text);
    } catch (err) {
      console.error('Failed to read clipboard:', err);
    }
  };

  const handleAnalyze = () => {
    if (sourceText.trim()) {
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
  };

  const emotionColors: Record<string, string> = {
    calm: 'bg-blue-500/20 border-blue-500/40',
    tense: 'bg-red-500/20 border-red-500/40',
    exciting: 'bg-yellow-500/20 border-yellow-500/40',
    sad: 'bg-gray-500/20 border-gray-500/40',
    joyful: 'bg-emerald-500/20 border-emerald-500/40',
    mysterious: 'bg-purple-500/20 border-purple-500/40',
    neutral: 'bg-slate-500/20 border-slate-500/40'
  };

  const emotionBgGradients: Record<string, string> = {
    calm: 'from-blue-950/40 to-cyan-950/40',
    tense: 'from-red-950/40 to-orange-950/40',
    exciting: 'from-yellow-950/40 to-amber-950/40',
    sad: 'from-slate-950/40 to-gray-950/40',
    joyful: 'from-emerald-950/40 to-green-950/40',
    mysterious: 'from-purple-950/40 to-violet-950/40',
    neutral: 'from-slate-950/40 to-slate-900/40'
  };

  return (
    <div className="h-full flex">
      <div className="w-1/2 border-r border-slate-700 flex flex-col bg-slate-900">
        <div className="px-6 py-4 border-b border-slate-700 bg-slate-800/50">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg font-semibold text-white">Source Text</h2>
            <div className="flex gap-2">
              <button
                onClick={handleQuickPaste}
                className="flex items-center gap-2 px-3 py-1.5 text-sm bg-slate-700 hover:bg-slate-600 rounded-lg transition-colors"
                title="Quick paste from clipboard"
              >
                <Copy className="w-4 h-4" />
                Paste
              </button>
              {!isLiveMode && (
                <button
                  onClick={handleAnalyze}
                  className="flex items-center gap-2 px-3 py-1.5 text-sm bg-emerald-600 hover:bg-emerald-700 rounded-lg transition-colors"
                  title="Analyze text"
                >
                  <Zap className="w-4 h-4" />
                  Analyze
                </button>
              )}
            </div>
          </div>
          <p className="text-xs text-slate-400">
            Paste any text here from articles, books, journals, or documents. StitchQylt will analyze and visualize the narrative rhythm in real-time.
          </p>
        </div>

        <div className="flex-1 p-6">
          <textarea
            ref={sourceRef}
            value={sourceText}
            onChange={(e) => setSourceText(e.target.value)}
            placeholder="Paste or type your text here...&#10;&#10;Try copying content from any article, blog post, or document. StitchQylt will transform it into an immersive reading experience with intelligent motion design that follows the emotional rhythm of the narrative."
            className="w-full h-full bg-slate-800 border border-slate-700 rounded-lg p-4 text-slate-100 placeholder-slate-500 resize-none focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
          />
        </div>

        <div className="px-6 py-3 border-t border-slate-700 bg-slate-800/50">
          <div className="flex items-center justify-between text-sm">
            <div className="flex items-center gap-4">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={isLiveMode}
                  onChange={(e) => setIsLiveMode(e.target.checked)}
                  className="w-4 h-4 rounded border-slate-600 bg-slate-700 text-emerald-600 focus:ring-emerald-500"
                />
                <span className="text-slate-300">Live Analysis</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={autoScroll}
                  onChange={(e) => setAutoScroll(e.target.checked)}
                  className="w-4 h-4 rounded border-slate-600 bg-slate-700 text-emerald-600 focus:ring-emerald-500"
                />
                <span className="text-slate-300">Auto-scroll</span>
              </label>
            </div>
            <div className="text-slate-400">
              {sourceText.length} characters • {segments.length} segments
            </div>
          </div>
        </div>
      </div>

      <div className="w-1/2 flex flex-col bg-slate-950">
        <div className="px-6 py-4 border-b border-slate-700 bg-slate-800/50">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-white">Narrative Layer</h2>
            <button
              onClick={() => setShowMotion(!showMotion)}
              className="flex items-center gap-2 px-3 py-1.5 text-sm bg-slate-700 hover:bg-slate-600 rounded-lg transition-colors"
              title={showMotion ? 'Disable motion' : 'Enable motion'}
            >
              {showMotion ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
              Motion {showMotion ? 'On' : 'Off'}
            </button>
          </div>
        </div>

        <div
          ref={narrativeRef}
          className="flex-1 overflow-y-auto p-6 space-y-6"
        >
          {segments.length === 0 ? (
            <div className="h-full flex items-center justify-center text-slate-500">
              <div className="text-center max-w-md">
                <Zap className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p className="text-lg mb-2">Waiting for content...</p>
                <p className="text-sm">
                  Add text on the left to see it come alive with narrative motion
                </p>
              </div>
            </div>
          ) : (
            segments.map((segment, index) => {
              const isActive = index === currentSegmentIndex;

              return (
                <div
                  key={index}
                  data-segment={index}
                  onClick={() => setCurrentSegmentIndex(index)}
                  className={`transition-all duration-300 cursor-pointer ${
                    isActive ? 'opacity-100 scale-100' : 'opacity-60 scale-95'
                  }`}
                >
                  <NarrativeMotion
                    motionType={segment.motion as any}
                    intensity={segment.intensity}
                    isActive={showMotion && isActive}
                  >
                    <div className={`bg-gradient-to-br ${emotionBgGradients[segment.emotion] || emotionBgGradients.neutral} rounded-xl p-6 border-2 ${isActive ? emotionColors[segment.emotion] || emotionColors.neutral : 'border-transparent'}`}>
                      <p className="text-lg leading-relaxed text-slate-100 mb-4">
                        {segment.text}
                      </p>

                      <div className="flex items-center gap-3 text-xs">
                        <span className={`px-2 py-1 rounded-full ${emotionColors[segment.emotion] || emotionColors.neutral}`}>
                          {segment.emotion}
                        </span>
                        <span className="text-slate-400 capitalize">
                          {segment.motion}
                        </span>
                        <span className="text-slate-400">
                          {(segment.intensity * 100).toFixed(0)}% intensity
                        </span>
                        <span className="text-slate-500">
                          Segment {index + 1}
                        </span>
                      </div>
                    </div>
                  </NarrativeMotion>
                </div>
              );
            })
          )}
        </div>

        {segments.length > 0 && (
          <div className="px-6 py-3 border-t border-slate-700 bg-slate-800/50">
            <div className="flex items-center gap-3">
              <span className="text-sm text-slate-400">Segment:</span>
              <input
                type="range"
                min="0"
                max={segments.length - 1}
                value={currentSegmentIndex}
                onChange={(e) => setCurrentSegmentIndex(Number(e.target.value))}
                className="flex-1"
              />
              <span className="text-sm text-slate-300 font-medium min-w-[80px] text-right">
                {currentSegmentIndex + 1} / {segments.length}
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
