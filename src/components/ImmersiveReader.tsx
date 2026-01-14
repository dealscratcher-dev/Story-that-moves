import { useState, useEffect, useRef } from 'react';
import { Play, Pause, RotateCcw, Settings, Gauge, Link, FileText, Minimize2, Bug } from 'lucide-react';
import NarrativeMotion from './NarrativeMotion';
import ParticleBackground from './ParticleBackground';
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
    setIsFullscreenView(true);

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
      if (htmlResponse.ok && htmlData.html) setWebpageHtml(htmlData.html);

      const textResponse = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
        },
        body: JSON.stringify({ url: urlInput }),
      });

      const textData = await textResponse.json();
      if (textData.text && textData.text.length > 50) {
        setInputText(textData.text);
        await processStoryboard(urlInput, textData.text);
      } else {
        setLoadError('Could not extract text');
        setIsFullscreenView(false);
      }
    } catch (error) {
      setLoadError('Failed to load webpage');
      setIsFullscreenView(false);
    } finally {
      setIsLoadingUrl(false);
    }
  };

  const processStoryboard = async (url: string, text: string) => {
    setIsProcessing(true);
    setProcessingStatus('Analyzing...');
    try {
      const job = await fastapiClient.processArticle(url, text);
      const completedJob = await fastapiClient.pollJobCompletion(job.job_id, (j) => {
        if (j.progress) setProcessingStatus(`Processing: ${j.progress}%`);
      });
      if (completedJob.article_id) {
        const data = await fastapiClient.getStoryboard(completedJob.article_id);
        setStoryboard(data);
        setShowOverlayMotion(true);
      }
    } catch (e) {
      console.warn('Backend unavailable');
    } finally {
      setIsProcessing(false);
    }
  };

  const handlePaste = (text: string) => {
    const textToProcess = text || inputText;
    if (!textToProcess.trim()) return;
    // Defaulting to dramatic analysis internally without the UI clutter
    const segmentTexts = splitIntoSegments(textToProcess, 400);
    const analyzed = segmentTexts.map(seg => {
      const analysis = analyzeNarrative(seg, 'dramatic');
      return { text: seg, ...analysis };
    });
    setSegments(analyzed);
    setCurrentIndex(0);
    setIsReading(true);
  };

  useEffect(() => {
    if (isReading && segments.length > 0 && currentIndex < segments.length - 1) {
      timerRef.current = setTimeout(() => setCurrentIndex(prev => prev + 1), readingSpeed);
    } else if (currentIndex >= segments.length - 1) {
      setIsReading(false);
    }
    return () => clearTimeout(timerRef.current);
  }, [isReading, currentIndex, segments, readingSpeed]);

  const handleMouseMove = () => {
    setShowControls(true);
    clearTimeout(hideControlsTimer.current);
    hideControlsTimer.current = setTimeout(() => {
      if (isReading && segments.length > 0) setShowControls(false);
    }, 3000);
  };

  const currentSegment = segments[currentIndex] || null;

  return (
    <div className="h-full relative overflow-hidden flex bg-slate-950 text-slate-200" onMouseMove={handleMouseMove}>
      {/* Clean, Neutral Background */}
      <div className="absolute inset-0 bg-slate-950" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(30,41,59,0.5),transparent_100%)]" />

      {currentSegment && (
        <ParticleBackground emotion={currentSegment.emotion} intensity={currentSegment.intensity} />
      )}

      <div className="relative z-10 flex-1 flex flex-col">
        {!isFullscreenView && (
          <div className="p-12 max-w-5xl mx-auto w-full">
            <h1 className="text-5xl font-light tracking-tight text-white mb-2">Narrative</h1>
            <p className="text-slate-500 text-lg">Immersive reading environment.</p>
          </div>
        )}

        <div className={`flex-1 relative flex items-center justify-center ${isFullscreenView ? 'p-0' : 'p-12'}`}>
          {!currentSegment ? (
            <div className={`${isFullscreenView ? 'w-full h-full' : 'max-w-5xl w-full h-[60vh]'} flex flex-col`}>
              <div className={`flex-1 bg-slate-900/20 backdrop-blur-md border border-slate-800 ${isFullscreenView ? '' : 'rounded-2xl'} flex flex-col overflow-hidden shadow-2xl`}>
                {!isFullscreenView && (
                  <div className="p-4 border-b border-slate-800 flex items-center gap-4">
                    <button onClick={() => setInputMode('url')} className={`p-2 rounded-md transition-all ${inputMode === 'url' ? 'bg-slate-700 text-white' : 'text-slate-500'}`}><Link size={20} /></button>
                    <button onClick={() => setInputMode('text')} className={`p-2 rounded-md transition-all ${inputMode === 'text' ? 'bg-slate-700 text-white' : 'text-slate-500'}`}><FileText size={20} /></button>
                    
                    {inputMode === 'url' ? (
                      <div className="flex-1 flex gap-2">
                        <input
                          type="url"
                          value={urlInput}
                          onChange={(e) => setUrlInput(e.target.value)}
                          placeholder="Enter URL..."
                          className="flex-1 bg-transparent border-b border-slate-700 px-2 py-1 focus:border-slate-400 outline-none text-sm"
                          onKeyDown={(e) => e.key === 'Enter' && handleLoadUrl()}
                        />
                        <button onClick={handleLoadUrl} disabled={isLoadingUrl} className="text-xs uppercase tracking-widest font-bold px-4 hover:text-white disabled:opacity-50">
                          {isLoadingUrl ? 'Loading' : 'Analyze'}
                        </button>
                      </div>
                    ) : (
                      <button onClick={() => handlePaste(inputText)} className="text-xs uppercase tracking-widest font-bold px-4 hover:text-white">Read</button>
                    )}
                  </div>
                )}

                <div className="flex-1 relative">
                  {isFullscreenView && (
                    <button onClick={() => setIsFullscreenView(false)} className="absolute top-6 right-6 z-[100] p-2 bg-black/50 hover:bg-black text-white rounded-full transition-all border border-white/10"><Minimize2 size={20} /></button>
                  )}
                  {inputMode === 'text' ? (
                    <textarea value={inputText} onChange={(e) => setInputText(e.target.value)} placeholder="Type or paste content..." className="w-full h-full bg-transparent p-12 text-xl font-light focus:outline-none resize-none" />
                  ) : webpageHtml ? (
                    <div className="w-full h-full bg-white relative">
                      <iframe ref={iframeRef} srcDoc={webpageHtml} className="w-full h-full border-0" sandbox="allow-same-origin allow-scripts" />
                      {storyboard && (
                        <>
                          <IframeScrollBridge iframeRef={iframeRef} onScrollChange={data => setScrollPercent(data.scrollPercent)} isActive={showOverlayMotion} />
                          <SceneOrchestrator waypoints={storyboard.waypoints} scrollPercent={scrollPercent} onActiveSceneChange={setActiveScene} debugMode={debugMode} />
                          <SceneOverlay scene={activeScene} isActive={showOverlayMotion} />
                        </>
                      )}
                      {isProcessing && (
                        <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm flex flex-col items-center justify-center z-50">
                          <div className="w-8 h-8 border-2 border-slate-600 border-t-white rounded-full animate-spin mb-4" />
                          <p className="text-xs tracking-widest uppercase text-slate-400">{processingStatus}</p>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="absolute inset-0 flex items-center justify-center text-slate-600 font-light italic">Ready for input.</div>
                  )}
                </div>
              </div>
            </div>
          ) : (
            <NarrativeMotion motionType={currentSegment.motion} intensity={currentSegment.intensity} isActive={isReading}>
              <div className="max-w-4xl mx-auto px-6">
                <p className="text-4xl md:text-5xl font-light leading-snug text-white text-center">
                  {currentSegment.text}
                </p>
              </div>
            </NarrativeMotion>
          )}
        </div>
      </div>

      {currentSegment && (
        <div className={`fixed bottom-0 left-0 right-0 p-12 transition-all duration-700 ${showControls ? 'translate-y-0 opacity-100' : 'translate-y-12 opacity-0'}`}>
          <div className="max-w-3xl mx-auto bg-slate-900/80 backdrop-blur-xl border border-slate-800 rounded-full p-2 flex items-center gap-4 shadow-2xl">
            <button onClick={restart} className="ml-4 p-2 text-slate-400 hover:text-white"><RotateCcw size={18} /></button>
            <button onClick={() => setIsReading(!isReading)} className="w-12 h-12 flex items-center justify-center bg-white text-black rounded-full hover:scale-105 transition-transform">
              {isReading ? <Pause size={20} fill="currentColor" /> : <Play size={20} className="ml-1" fill="currentColor" />}
            </button>
            <div className="flex-1 h-1 bg-slate-800 rounded-full overflow-hidden">
              <div className="h-full bg-white transition-all duration-300" style={{ width: `${((currentIndex + 1) / segments.length) * 100}%` }} />
            </div>
            <button onClick={() => { setSegments([]); setIsFullscreenView(false); }} className="mr-4 text-xs uppercase tracking-widest font-bold text-slate-400 hover:text-white">Exit</button>
          </div>
        </div>
      )}
    </div>
  );
}
