import { useEffect, useState, useRef } from 'react';
import { Play, Pause, SkipBack, SkipForward, Settings, Volume2 } from 'lucide-react';
import { supabase, type Document, type NarrativeSegment } from '../lib/supabase';
import NarrativeMotion from './NarrativeMotion';

interface NarrativeReaderProps {
  document: Document;
}

export default function NarrativeReader({ document }: NarrativeReaderProps) {
  const [segments, setSegments] = useState<NarrativeSegment[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [autoAdvanceSpeed, setAutoAdvanceSpeed] = useState(5000);
  const [showSettings, setShowSettings] = useState(false);
  const timerRef = useRef<NodeJS.Timeout>();

  useEffect(() => {
    loadSegments();
  }, [document.id]);

  const loadSegments = async () => {
    try {
      const { data, error } = await supabase
        .from('narrative_segments')
        .select('*')
        .eq('document_id', document.id)
        .order('segment_index');

      if (error) throw error;
      setSegments(data || []);
    } catch (error) {
      console.error('Error loading segments:', error);
    }
  };

  useEffect(() => {
    if (isPlaying && segments.length > 0) {
      timerRef.current = setTimeout(() => {
        if (currentIndex < segments.length - 1) {
          setCurrentIndex(prev => prev + 1);
        } else {
          setIsPlaying(false);
        }
      }, autoAdvanceSpeed);
    }

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [isPlaying, currentIndex, segments.length, autoAdvanceSpeed]);

  const handlePrevious = () => {
    setCurrentIndex(prev => Math.max(0, prev - 1));
  };

  const handleNext = () => {
    setCurrentIndex(prev => Math.min(segments.length - 1, prev + 1));
  };

  const togglePlay = () => {
    setIsPlaying(!isPlaying);
  };

  if (segments.length === 0) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-slate-400">Loading narrative segments...</div>
      </div>
    );
  }

  const currentSegment = segments[currentIndex];
  const emotionColors: Record<string, string> = {
    calm: 'from-blue-900/30 to-cyan-900/30',
    tense: 'from-red-900/30 to-orange-900/30',
    exciting: 'from-yellow-900/30 to-amber-900/30',
    sad: 'from-slate-900/30 to-gray-900/30',
    joyful: 'from-emerald-900/30 to-green-900/30',
    mysterious: 'from-purple-900/30 to-violet-900/30',
    neutral: 'from-slate-900/30 to-slate-800/30'
  };

  return (
    <div className="h-full flex flex-col">
      <div className={`flex-1 overflow-y-auto bg-gradient-to-br ${emotionColors[currentSegment.emotion_tone] || emotionColors.neutral} transition-all duration-1000`}>
        <div className="max-w-4xl mx-auto px-8 py-12">
          <div className="mb-8">
            <h1 className="text-3xl font-bold mb-2">{document.title}</h1>
            <div className="flex items-center gap-3 text-sm text-slate-400">
              <span className="capitalize">{document.source_type}</span>
              <span>•</span>
              <span>Segment {currentIndex + 1} of {segments.length}</span>
              <span>•</span>
              <span className="capitalize">{currentSegment.emotion_tone}</span>
            </div>
          </div>

          <NarrativeMotion
            motionType={currentSegment.motion_type as any}
            intensity={currentSegment.intensity}
            isActive={isPlaying}
          >
            <div className="bg-slate-800/70 backdrop-blur-sm rounded-2xl p-8 shadow-2xl">
              <p className="text-xl leading-relaxed text-slate-100">
                {currentSegment.text_content}
              </p>
            </div>
          </NarrativeMotion>

          <div className="mt-8 grid grid-cols-2 sm:grid-cols-4 gap-4 text-center text-sm">
            <div className="bg-slate-800/50 rounded-lg p-3">
              <div className="text-slate-400 mb-1">Motion Type</div>
              <div className="font-semibold capitalize">{currentSegment.motion_type}</div>
            </div>
            <div className="bg-slate-800/50 rounded-lg p-3">
              <div className="text-slate-400 mb-1">Intensity</div>
              <div className="font-semibold">{(currentSegment.intensity * 100).toFixed(0)}%</div>
            </div>
            <div className="bg-slate-800/50 rounded-lg p-3">
              <div className="text-slate-400 mb-1">Emotion</div>
              <div className="font-semibold capitalize">{currentSegment.emotion_tone}</div>
            </div>
            <div className="bg-slate-800/50 rounded-lg p-3">
              <div className="text-slate-400 mb-1">Characters</div>
              <div className="font-semibold">{currentSegment.text_content.length}</div>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-slate-800 border-t border-slate-700 px-6 py-4">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={handlePrevious}
              disabled={currentIndex === 0}
              className="p-2 hover:bg-slate-700 disabled:opacity-30 disabled:cursor-not-allowed rounded-lg transition-colors"
              title="Previous"
            >
              <SkipBack className="w-5 h-5" />
            </button>

            <button
              onClick={togglePlay}
              className="p-3 bg-emerald-600 hover:bg-emerald-700 rounded-lg transition-colors"
              title={isPlaying ? 'Pause' : 'Play'}
            >
              {isPlaying ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5" />}
            </button>

            <button
              onClick={handleNext}
              disabled={currentIndex === segments.length - 1}
              className="p-2 hover:bg-slate-700 disabled:opacity-30 disabled:cursor-not-allowed rounded-lg transition-colors"
              title="Next"
            >
              <SkipForward className="w-5 h-5" />
            </button>
          </div>

          <div className="flex-1 mx-6">
            <div className="bg-slate-700 rounded-full h-2 overflow-hidden">
              <div
                className="bg-emerald-500 h-full transition-all duration-300"
                style={{ width: `${((currentIndex + 1) / segments.length) * 100}%` }}
              />
            </div>
          </div>

          <div className="relative">
            <button
              onClick={() => setShowSettings(!showSettings)}
              className="p-2 hover:bg-slate-700 rounded-lg transition-colors"
              title="Settings"
            >
              <Settings className="w-5 h-5" />
            </button>

            {showSettings && (
              <div className="absolute bottom-full right-0 mb-2 bg-slate-900 border border-slate-700 rounded-lg p-4 w-64 shadow-xl">
                <div className="mb-3 flex items-center gap-2">
                  <Volume2 className="w-4 h-4 text-slate-400" />
                  <span className="text-sm font-medium">Auto-Advance Speed</span>
                </div>
                <input
                  type="range"
                  min="2000"
                  max="10000"
                  step="500"
                  value={autoAdvanceSpeed}
                  onChange={(e) => setAutoAdvanceSpeed(Number(e.target.value))}
                  className="w-full"
                />
                <div className="text-xs text-slate-400 mt-2 text-center">
                  {(autoAdvanceSpeed / 1000).toFixed(1)}s per segment
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
