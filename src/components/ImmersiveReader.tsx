import { useState, useEffect, useRef } from 'react';
import { Play, Pause, RotateCcw, Settings, Gauge, Sparkles, Link, FileText, Minimize2, Bug } from 'lucide-react';
import NarrativeMotion from './NarrativeMotion';
import ParticleBackground from './ParticleBackground';
import OverlayMotion from './OverlayMotion';
import IframeScrollBridge from './IframeScrollBridge';
import SceneOrchestrator from './SceneOrchestrator';
import SceneOverlay from './SceneOverlay';
import { analyzeNarrative, splitIntoSegments, NarrativeStyle } from '../utils/narrativeAnalyzer';
import { Storyboard, StoryboardScene } from '../types/storyboard';
import { fastapiClient } from '../services/fastapiClient';

interface Segment {
  text: string;
  emotion: string;
  intensity: number;
  motion: any;
}

const STYLE_OPTIONS: Array<{ id: NarrativeStyle; label: string; description: string; icon: string }> = [
  { id: 'quirky', label: 'Quirky', description: 'Playful & whimsical', icon: '🎨' },
  { id: 'minimalistic', label: 'Minimalistic', description: 'Subtle & gentle', icon: '✨' },
  { id: 'dramatic', label: 'Dramatic', description: 'Bold & intense', icon: '🎭' },
  { id: 'poetic', label: 'Poetic', description: 'Flowing & lyrical', icon: '🌙' },
  { id: 'playful', label: 'Playful', description: 'Fun & energetic', icon: '🎈' },
  { id: 'cinematic', label: 'Cinematic', description: 'Epic & immersive', icon: '🎬' }
];

export default function ImmersiveReader() {
  const [inputMode, setInputMode] = useState<'text' | 'url'>('url');
  const [inputText, setInputText] = useState('');
  const [urlInput, setUrlInput] = useState('');
  const [webpageHtml, setWebpageHtml] = useState('');
  const [isLoadingUrl, setIsLoadingUrl] = useState(false);
  const [loadError, setLoadError] = useState('');
  const [segments, setSegments] = useState<Segment[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isReading, setIsReading] = useState(false);
  const [readingSpeed, setReadingSpeed] = useState(4000);
  const [narrativeStyle, setNarrativeStyle] = useState<NarrativeStyle>('dramatic');
  const [showControls, setShowControls] = useState(true);
  const [showSettings, setShowSettings] = useState(false);
  const [showOverlayMotion, setShowOverlayMotion] = useState(false);
  const [isFullscreenView, setIsFullscreenView] = useState(false);
  const [storyboard, setStoryboard] = useState<Storyboard | null>(null);
  const [scrollPercent, setScrollPercent] = useState(0);
  const [activeScene, setActiveScene] = useState<StoryboardScene | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingStatus, setProcessingStatus] = useState('');
  const [debugMode, setDebugMode] = useState(false);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const timerRef = useRef<NodeJS.Timeout>();
  const hideControlsTimer = useRef<NodeJS.Timeout>();

  const handleLoadUrl = async () => {
    if (!urlInput.trim()) return;

    setIsLoadingUrl(true);
    setLoadError('');

    try {
      const apiUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/fetch-webpage`;

      const htmlResponse = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
        },
        body: JSON.stringify({ url: urlInput, mode: 'html' }),
      });

      const htmlData = await htmlResponse.json();

      if (htmlResponse.ok && htmlData.html) {
        setWebpageHtml(htmlData.html);
      }

      const textResponse = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
        },
        body: JSON.stringify({ url: urlInput }),
      });

      const textData = await textResponse.json();

      if (!textResponse.ok) {
        throw new Error(textData.error || 'Failed to fetch webpage');
      }

      if (textData.text && textData.text.length > 50) {
        setInputText(textData.text);
        setLoadError('');
        await processStoryboard(urlInput, textData.text);
      } else {
        setLoadError('Could not extract readable text from this page');
      }
    } catch (error) {
      console.error('Error fetching webpage:', error);
      setLoadError(error instanceof Error ? error.message : 'Failed to load webpage');
    } finally {
      setIsLoadingUrl(false);
    }
  };

  const processStoryboard = async (url: string, text: string) => {
    setIsProcessing(true);
    setProcessingStatus('Analyzing article...');

    try {
      const job = await fastapiClient.processArticle(url, text);
      setProcessingStatus('Generating storyboard...');

      const completedJob = await fastapiClient.pollJobCompletion(
        job.job_id,
        (progressJob) => {
          if (progressJob.progress) {
            setProcessingStatus(`Processing: ${progressJob.progress}%`);
          }
        }
      );

      if (completedJob.article_id) {
        const storyboardData = await fastapiClient.getStoryboard(completedJob.article_id);
        setStoryboard(storyboardData);
        setProcessingStatus('Ready!');
        setShowOverlayMotion(true);
      }
    } catch (error) {
      console.warn('Storyboard processing unavailable (FastAPI backend not running):', error);
      setProcessingStatus('');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleScrollChange = (data: { scrollPercent: number }) => {
    setScrollPercent(data.scrollPercent);
  };

  const handleActiveSceneChange = (scene: StoryboardScene | null) => {
    setActiveScene(scene);
  };

  const handlePaste = (text: string, style: NarrativeStyle = narrativeStyle) => {
    const textToProcess = text || inputText;
    if (!textToProcess.trim()) return;

    const segmentTexts = splitIntoSegments(textToProcess, 400);
    const analyzedSegments = segmentTexts.map(segText => {
      const analysis = analyzeNarrative(segText, style);
      return {
        text: segText,
        emotion: analysis.emotion,
        intensity: analysis.intensity,
        motion: analysis.motion
      };
    });

    setSegments(analyzedSegments);
    setCurrentIndex(0);
    setIsReading(true);
  };

  useEffect(() => {
    if (isReading && segments.length > 0) {
      if (currentIndex < segments.length - 1) {
        timerRef.current = setTimeout(() => {
          setCurrentIndex(prev => prev + 1);
        }, readingSpeed);
      } else {
        setIsReading(false);
      }
    }

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [isReading, currentIndex, segments.length, readingSpeed]);

  useEffect(() => {
    if (segments.length > 0) {
      setShowControls(true);
      if (hideControlsTimer.current) clearTimeout(hideControlsTimer.current);

      hideControlsTimer.current = setTimeout(() => {
        if (isReading) setShowControls(false);
      }, 3000);
    }

    return () => {
      if (hideControlsTimer.current) clearTimeout(hideControlsTimer.current);
    };
  }, [currentIndex, isReading, segments.length]);

  const togglePlayPause = () => {
    setIsReading(!isReading);
  };

  const restart = () => {
    setCurrentIndex(0);
    setIsReading(true);
  };

  const handleMouseMove = () => {
    setShowControls(true);
    if (hideControlsTimer.current) clearTimeout(hideControlsTimer.current);

    hideControlsTimer.current = setTimeout(() => {
      if (isReading && segments.length > 0) setShowControls(false);
    }, 3000);
  };

  const currentSegment = segments.length > 0 ? segments[currentIndex] : null;
  const emotionColors: Record<string, string> = {
    calm: 'from-blue-950/90 via-slate-950 to-cyan-950/90',
    tense: 'from-red-950/90 via-slate-950 to-orange-950/90',
    exciting: 'from-yellow-950/90 via-slate-950 to-amber-950/90',
    sad: 'from-slate-950 via-slate-950 to-gray-950',
    joyful: 'from-emerald-950/90 via-slate-950 to-green-950/90',
    mysterious: 'from-purple-950/90 via-slate-950 to-violet-950/90',
    neutral: 'from-slate-950 via-slate-950 to-slate-900'
  };

  return (
    <div
      className="h-full relative overflow-hidden flex"
      onMouseMove={handleMouseMove}
    >
      <div className={`absolute inset-0 bg-gradient-to-br ${currentSegment ? emotionColors[currentSegment.emotion] || emotionColors.neutral : 'from-violet-600 via-fuchsia-600 to-pink-600 opacity-20'} transition-all duration-2000`} />
      {!currentSegment && <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_50%,rgba(120,119,198,0.3),transparent_50%),radial-gradient(circle_at_70%_80%,rgba(236,72,153,0.3),transparent_50%)]" />}

      {currentSegment && (
        <ParticleBackground emotion={currentSegment.emotion} intensity={currentSegment.intensity} />
      )}

      {!isFullscreenView && (
        <div className="relative z-10 w-64 flex-shrink-0 border-r border-slate-700/50 bg-slate-900/30 backdrop-blur-sm p-6 flex flex-col">
        <div className="mb-8">
          <div className="inline-flex items-center gap-2 mb-2">
            <Sparkles className="w-4 h-4 text-violet-300" />
            <span className="text-xs text-violet-200 font-medium uppercase tracking-wider">Narrative Style</span>
          </div>
        </div>

        <div className="flex-1 space-y-3 overflow-y-auto">
          {STYLE_OPTIONS.map((style) => (
            <button
              key={style.id}
              onClick={() => setNarrativeStyle(style.id)}
              className={`w-full p-4 rounded-xl border-2 transition-all text-left ${
                narrativeStyle === style.id
                  ? 'border-violet-500 bg-violet-500/20 shadow-lg shadow-violet-500/30'
                  : 'border-slate-700/50 bg-slate-800/30 hover:border-slate-600 hover:bg-slate-800/50'
              }`}
            >
              <div className="text-3xl mb-2">{style.icon}</div>
              <div className="text-sm font-semibold text-slate-200">{style.label}</div>
              <div className="text-xs text-slate-400 mt-1">{style.description}</div>
            </button>
          ))}
        </div>

        <div className="mt-6 pt-6 border-t border-slate-700/50">
          <div className="text-xs text-slate-500 text-center">
            Motion adapts in real-time
          </div>
        </div>
      </div>
      )}

      <div className="relative z-10 flex-1 flex flex-col">
        {!isFullscreenView && (
        <div className="p-8 border-b border-slate-700/30 bg-slate-900/20 backdrop-blur-sm">
          <div className="max-w-5xl mx-auto">
            <h1 className="text-4xl md:text-5xl font-bold mb-3 bg-gradient-to-r from-violet-200 via-fuchsia-200 to-pink-200 bg-clip-text text-transparent leading-tight">
              Stories That Move
            </h1>
            <p className="text-base text-slate-300">
              Transform any website or text into an immersive visual experience
            </p>
          </div>
        </div>
        )}

        <div className={`flex-1 relative flex items-center justify-center ${isFullscreenView ? 'p-0' : 'p-8'}`}>
          {!currentSegment ? (
            <div className={`${isFullscreenView ? 'w-full h-full' : 'max-w-5xl w-full h-full'} flex flex-col`}>
              <div className={`flex-1 bg-slate-900/40 backdrop-blur-xl ${isFullscreenView ? '' : 'border border-slate-700/50 rounded-3xl shadow-2xl'} flex flex-col overflow-hidden`}>
                {!isFullscreenView && (
                <div className="p-6 border-b border-slate-700/30 flex items-center gap-4">
                  <div className="flex gap-2 bg-slate-800/50 p-1 rounded-lg">
                    <button
                      onClick={() => setInputMode('url')}
                      className={`px-4 py-2 rounded-md text-sm font-medium transition-all flex items-center gap-2 ${
                        inputMode === 'url'
                          ? 'bg-violet-500 text-white shadow-lg'
                          : 'text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      <Link className="w-4 h-4" />
                      URL
                    </button>
                    <button
                      onClick={() => setInputMode('text')}
                      className={`px-4 py-2 rounded-md text-sm font-medium transition-all flex items-center gap-2 ${
                        inputMode === 'text'
                          ? 'bg-violet-500 text-white shadow-lg'
                          : 'text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      <FileText className="w-4 h-4" />
                      Text
                    </button>
                  </div>

                  {inputMode === 'url' ? (
                    <div className="flex-1 flex gap-2">
                      <input
                        type="url"
                        value={urlInput}
                        onChange={(e) => setUrlInput(e.target.value)}
                        placeholder="https://example.com/article"
                        className="flex-1 bg-slate-950/50 border border-slate-700 rounded-lg px-4 py-2 text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent text-sm"
                        onKeyDown={(e) => e.key === 'Enter' && handleLoadUrl()}
                      />
                      <button
                        onClick={() => {
                          handleLoadUrl();
                          if (!isLoadingUrl) setIsFullscreenView(true);
                        }}
                        disabled={!urlInput.trim() || isLoadingUrl}
                        className="px-6 py-2 bg-slate-700 hover:bg-slate-600 disabled:bg-slate-800 disabled:cursor-not-allowed text-white font-medium rounded-lg transition-all text-sm"
                      >
                        {isLoadingUrl ? 'Loading...' : 'Load'}
                      </button>
                      {storyboard && (
                        <button
                          onClick={() => setDebugMode(!debugMode)}
                          className={`px-4 py-2 font-medium rounded-lg transition-all text-sm flex items-center gap-2 ${
                            debugMode
                              ? 'bg-yellow-500 text-black'
                              : 'bg-slate-700 hover:bg-slate-600 text-white'
                          }`}
                          title="Toggle debug mode"
                        >
                          <Bug className="w-4 h-4" />
                        </button>
                      )}
                      <button
                        onClick={() => {
                          handlePaste(inputText);
                          if (webpageHtml) setShowOverlayMotion(true);
                        }}
                        disabled={!inputText.trim()}
                        className="px-6 py-2 bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:from-violet-500 hover:to-fuchsia-500 disabled:from-slate-700 disabled:to-slate-700 disabled:cursor-not-allowed text-white font-medium rounded-lg transition-all text-sm shadow-lg hover:shadow-xl hover:shadow-fuchsia-500/30 disabled:shadow-none"
                      >
                        Read
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => handlePaste(inputText)}
                      disabled={!inputText.trim()}
                      className="px-8 py-2 bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:from-violet-500 hover:to-fuchsia-500 disabled:from-slate-700 disabled:to-slate-700 disabled:cursor-not-allowed text-white font-medium rounded-lg transition-all text-sm shadow-lg hover:shadow-xl hover:shadow-fuchsia-500/30 disabled:shadow-none"
                    >
                      Read
                    </button>
                  )}
                </div>
                )}

                <div className="flex-1 relative overflow-hidden">
                  {isFullscreenView && webpageHtml && (
                    <button
                      onClick={() => setIsFullscreenView(false)}
                      className="absolute top-4 right-4 z-50 p-3 bg-slate-900/80 hover:bg-slate-800/90 backdrop-blur-sm border border-slate-700/50 rounded-lg transition-all shadow-lg hover:shadow-xl text-white group"
                      title="Exit Fullscreen"
                    >
                      <Minimize2 className="w-5 h-5" />
                    </button>
                  )}
                  {inputMode === 'text' ? (
                    <textarea
                      value={inputText}
                      onChange={(e) => setInputText(e.target.value)}
                      placeholder="Paste your article, story, essay, or journal entry here..."
                      className="w-full h-full bg-slate-950/30 border-0 px-8 py-6 text-slate-100 placeholder-slate-500 focus:outline-none resize-none text-lg leading-relaxed"
                    />
                  ) : inputMode === 'url' && webpageHtml ? (
                    <div className="w-full h-full bg-white relative">
                      <iframe
                        ref={iframeRef}
                        srcDoc={webpageHtml}
                        className="w-full h-full border-0 block"
                        sandbox="allow-same-origin allow-scripts allow-popups allow-forms"
                        title="Website Preview"
                      />
                      {showOverlayMotion && storyboard && (
                        <>
                          <IframeScrollBridge
                            iframeRef={iframeRef}
                            onScrollChange={handleScrollChange}
                            isActive={showOverlayMotion}
                          />
                          <SceneOrchestrator
                            waypoints={storyboard.waypoints}
                            scrollPercent={scrollPercent}
                            onActiveSceneChange={handleActiveSceneChange}
                            debugMode={debugMode}
                          />
                          <SceneOverlay
                            scene={activeScene}
                            isActive={showOverlayMotion}
                          />
                        </>
                      )}
                      {isProcessing && (
                        <div className="absolute inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
                          <div className="bg-slate-900/90 backdrop-blur-xl rounded-2xl p-8 border border-slate-700/50 shadow-2xl max-w-md">
                            <div className="flex items-center gap-4">
                              <div className="w-12 h-12 border-4 border-violet-500/30 border-t-violet-500 rounded-full animate-spin" />
                              <div>
                                <div className="text-white font-medium mb-1">Processing Article</div>
                                <div className="text-slate-400 text-sm">{processingStatus}</div>
                              </div>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="text-center text-slate-400">
                        {loadError ? (
                          <>
                            <div className="text-red-400 mb-4">
                              <div className="text-4xl mb-2">⚠️</div>
                              <p className="text-lg font-medium">{loadError}</p>
                            </div>
                            <button
                              onClick={() => {
                                setLoadError('');
                                setUrlInput('');
                              }}
                              className="mt-4 px-6 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition-all"
                            >
                              Try Again
                            </button>
                          </>
                        ) : (
                          <>
                            <Link className="w-16 h-16 mx-auto mb-4 opacity-50" />
                            <p className="text-lg">Enter a URL above to fetch webpage content</p>
                            <p className="text-sm mt-2">Works with articles, blogs, and news sites</p>
                          </>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ) : (
            <NarrativeMotion
              motionType={currentSegment.motion}
              intensity={currentSegment.intensity}
              isActive={isReading}
            >
              <div className="max-w-5xl mx-auto">
                <div className="bg-slate-900/40 backdrop-blur-2xl rounded-3xl p-12 md:p-16 shadow-2xl border border-slate-700/30 transition-all duration-700">
                  <p className="text-2xl md:text-4xl leading-relaxed text-slate-50 font-light">
                    {currentSegment.text}
                  </p>
                </div>

                <div className="mt-8 flex flex-wrap items-center justify-center gap-4 text-sm">
                  <span className="capitalize px-4 py-2 bg-slate-800/80 backdrop-blur-sm rounded-full border border-slate-700/50 text-slate-300 font-medium">
                    {currentSegment.emotion}
                  </span>
                  <span className="px-4 py-2 bg-slate-800/80 backdrop-blur-sm rounded-full border border-slate-700/50 text-slate-300">
                    {currentIndex + 1} / {segments.length}
                  </span>
                  <span className="capitalize px-4 py-2 bg-violet-500/20 backdrop-blur-sm rounded-full border border-violet-500/30 text-violet-300 font-medium">
                    {narrativeStyle} style
                  </span>
                </div>
              </div>
            </NarrativeMotion>
          )}
        </div>
      </div>

      {currentSegment && (
        <div className={`fixed bottom-0 left-64 right-0 bg-gradient-to-t from-slate-950 via-slate-950/98 to-transparent p-6 transition-all duration-500 ${showControls ? 'translate-y-0 opacity-100' : 'translate-y-full opacity-0'}`}>
          <div className="max-w-5xl mx-auto">
            <div className="bg-slate-900/90 backdrop-blur-xl rounded-3xl p-6 border border-slate-700/50 shadow-2xl">
              <div className="flex items-center gap-6">
                <div className="flex items-center gap-3">
                  <button
                    onClick={restart}
                    className="p-3 hover:bg-slate-800 rounded-xl transition-colors text-slate-300 hover:text-white"
                    title="Restart"
                  >
                    <RotateCcw className="w-5 h-5" />
                  </button>

                  <button
                    onClick={togglePlayPause}
                    className="p-5 bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:from-violet-500 hover:to-fuchsia-500 rounded-2xl transition-all shadow-lg hover:shadow-xl hover:shadow-fuchsia-500/30"
                    title={isReading ? 'Pause' : 'Play'}
                  >
                    {isReading ? <Pause className="w-6 h-6" /> : <Play className="w-6 h-6" />}
                  </button>

                  <button
                    onClick={() => setShowSettings(!showSettings)}
                    className={`p-3 hover:bg-slate-800 rounded-xl transition-colors text-slate-300 hover:text-white ${showSettings ? 'bg-slate-800' : ''}`}
                    title="Settings"
                  >
                    <Settings className="w-5 h-5" />
                  </button>
                </div>

                <div className="flex-1">
                  <div className="bg-slate-800 rounded-full h-4 overflow-hidden shadow-inner">
                    <div
                      className="bg-gradient-to-r from-violet-500 via-fuchsia-500 to-pink-500 h-full transition-all duration-300 shadow-lg"
                      style={{ width: `${((currentIndex + 1) / segments.length) * 100}%` }}
                    />
                  </div>
                </div>

                <button
                  onClick={() => {
                    setSegments([]);
                    setInputText('');
                    setUrlInput('');
                    setWebpageHtml('');
                    setLoadError('');
                    setCurrentIndex(0);
                    setIsReading(false);
                    setShowOverlayMotion(false);
                    setIsFullscreenView(false);
                  }}
                  className="px-6 py-3 text-sm font-medium text-slate-300 hover:text-white hover:bg-slate-800 rounded-xl transition-all"
                >
                  New Text
                </button>
              </div>

              {showSettings && (
                <div className="mt-6 pt-6 border-t border-slate-700/50">
                  <div className="flex items-center gap-4">
                    <Gauge className="w-5 h-5 text-slate-400" />
                    <span className="text-sm font-medium text-slate-300 w-32">Reading Speed</span>
                    <input
                      type="range"
                      min="2000"
                      max="8000"
                      step="500"
                      value={readingSpeed}
                      onChange={(e) => setReadingSpeed(Number(e.target.value))}
                      className="flex-1 accent-violet-500"
                    />
                    <span className="text-sm text-slate-300 font-medium w-20 text-right">
                      {(readingSpeed / 1000).toFixed(1)}s
                    </span>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
