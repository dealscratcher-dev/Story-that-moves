import { useState, useEffect, useRef, useCallback } from 'react';
import { Play, Pause, RotateCcw, Link, FileText, Minimize2, Loader2 } from 'lucide-react';
import OverlayMotion from './OverlayMotion'; // Our consolidated engine
import IframeScrollBridge from './IframeScrollBridge';
import SceneOrchestrator from './SceneOrchestrator';
import { splitIntoSegments, analyzeNarrative } from '../utils/narrativeAnalyzer';
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
  const [segments, setSegments] = useState<Segment[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isReading, setIsReading] = useState(false);
  const [showControls, setShowControls] = useState(true);
  const [showOverlayMotion, setShowOverlayMotion] = useState(false);
  const [isFullscreenView, setIsFullscreenView] = useState(false);
  const [storyboard, setStoryboard] = useState<Storyboard | null>(null);
  const [scrollPercent, setScrollPercent] = useState(0);
  const [activeScene, setActiveScene] = useState<StoryboardScene | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingStatus, setProcessingStatus] = useState('');

  const iframeRef = useRef<HTMLIFrameElement>(null);
  const timerRef = useRef<NodeJS.Timeout>();
  const hideControlsTimer = useRef<NodeJS.Timeout>();

  // --- Article Processing ---
  const processStoryboard = async (url: string, text: string) => {
    setIsProcessing(true);
    setProcessingStatus('Analyzing Narrative...');
    try {
      const job = await fastapiClient.processArticle(url, text);
      const completedJob = await fastapiClient.pollJobCompletion(job.job_id, (j) => {
        if (j.progress) setProcessingStatus(`Synthesizing: ${j.progress}%`);
      });
      if (completedJob.article_id) {
        const data = await fastapiClient.getStoryboard(completedJob.article_id);
        setStoryboard(data);
        setShowOverlayMotion(true);
      }
    } catch (e) {
      console.error('Backend connection failed. Using local fallback.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleLoadUrl = async () => {
    if (!urlInput.trim()) return;
    setIsLoadingUrl(true);
    setIsFullscreenView(true);

    try {
      const apiUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/fetch-webpage`;
      const commonHeaders = {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
      };

      // 1. Fetch HTML for display
      const htmlResponse = await fetch(apiUrl, {
        method: 'POST',
        headers: commonHeaders,
        body: JSON.stringify({ url: urlInput, mode: 'html' }),
      });
      const htmlData = await htmlResponse.json();
      if (htmlResponse.ok && htmlData.html) setWebpageHtml(htmlData.html);

      // 2. Fetch Clean Text for Groq analysis
      const textResponse = await fetch(apiUrl, {
        method: 'POST',
        headers: commonHeaders,
        body: JSON.stringify({ url: urlInput }),
      });
      const textData = await textResponse.json();

      if (textData.text) {
        setInputText(textData.text);
        await processStoryboard(urlInput, textData.text);
      }
    } catch (error) {
      console.error('Failed to load webpage');
      setIsFullscreenView(false);
    } finally {
      setIsLoadingUrl(false);
    }
  };

  // --- Interaction Logic ---
  const handleMouseMove = () => {
    setShowControls(true);
    clearTimeout(hideControlsTimer.current);
    hideControlsTimer.current = setTimeout(() => {
      if (isReading || showOverlayMotion) setShowControls(false);
    }, 3000);
  };

  const restart = () => {
    setCurrentIndex(0);
    setScrollPercent(0);
    setIsReading(true);
  };

  return (
    <div className="h-screen w-full relative overflow-hidden bg-slate-950 text-slate-200" onMouseMove={handleMouseMove}>
      {/* 1. Global Background Layers */}
      <div className="absolute inset-0 bg-slate-950" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(30,41,59,0.4),transparent_100%)]" />

      {/* 2. Main Content Area */}
      <div className="relative z-10 h-full flex flex-col">
        {!isFullscreenView && (
          <div className="p-12 max-w-5xl mx-auto w-full">
            <h1 className="text-5xl font-extralight tracking-tighter text-white mb-2">Editorial</h1>
            <p className="text-slate-500 text-lg font-light">The Narrative Immersive Environment.</p>
          </div>
        )}

        <div className={`flex-1 relative transition-all duration-1000 ${isFullscreenView ? 'p-0' : 'p-12 pb-24'}`}>
          <div className={`w-full h-full bg-slate-900/20 backdrop-blur-md border border-slate-800/50 flex flex-col overflow-hidden shadow-2xl ${isFullscreenView ? '' : 'rounded-3xl'}`}>
            
            {/* Input Overlay (only shown if no webpage is loaded) */}
            {!webpageHtml && (
              <div className="absolute inset-0 z-20 flex flex-col items-center justify-center p-6 text-center">
                <div className="max-w-md w-full space-y-6">
                  <div className="flex justify-center gap-4 mb-8">
                    <button onClick={() => setInputMode('url')} className={`p-4 rounded-2xl transition-all ${inputMode === 'url' ? 'bg-white text-black' : 'bg-slate-900 text-slate-500'}`}><Link size={24} /></button>
                    <button onClick={() => setInputMode('text')} className={`p-4 rounded-2xl transition-all ${inputMode === 'text' ? 'bg-white text-black' : 'bg-slate-900 text-slate-500'}`}><FileText size={24} /></button>
                  </div>
                  
                  {inputMode === 'url' ? (
                    <div className="space-y-4">
                      <input
                        type="url"
                        value={urlInput}
                        onChange={(e) => setUrlInput(e.target.value)}
                        placeholder="Paste article URL..."
                        className="w-full bg-transparent border-b border-slate-700 p-4 text-center text-xl focus:border-white outline-none transition-colors"
                        onKeyDown={(e) => e.key === 'Enter' && handleLoadUrl()}
                      />
                      <button onClick={handleLoadUrl} disabled={isLoadingUrl} className="text-xs tracking-[0.3em] uppercase font-bold opacity-60 hover:opacity-100 disabled:opacity-20 transition-opacity">
                        {isLoadingUrl ? 'Initializing...' : 'Begin Experience'}
                      </button>
                    </div>
                  ) : (
                    <textarea 
                      value={inputText} 
                      onChange={(e) => setInputText(e.target.value)} 
                      placeholder="Enter prose..." 
                      className="w-full h-40 bg-transparent p-4 text-center text-lg font-light focus:outline-none resize-none" 
                    />
                  )}
                </div>
              </div>
            )}

            {/* Iframe Viewport */}
            {webpageHtml && (
              <div className="relative w-full h-full bg-white">
                <iframe 
                  ref={iframeRef} 
                  srcDoc={webpageHtml} 
                  className="w-full h-full border-0" 
                  sandbox="allow-same-origin allow-scripts" 
                />
                
                {/* Visual Intelligence Layers */}
                {storyboard && (
                  <>
                    <IframeScrollBridge 
                      iframeRef={iframeRef} 
                      onScrollChange={data => setScrollPercent(data.scrollPercent)} 
                      isActive={showOverlayMotion} 
                    />
                    <SceneOrchestrator 
                      waypoints={storyboard.waypoints} 
                      scrollPercent={scrollPercent} 
                      onActiveSceneChange={setActiveScene} 
                    />
                    <OverlayMotion 
                      isActive={showOverlayMotion}
                      motionType={activeScene?.motionType || 'drift'}
                      intensity={activeScene?.intensity || 0.5}
                      emotion={activeScene?.emotion || 'neutral'}
                    />
                  </>
                )}

                {/* Processing Shield */}
                {isProcessing && (
                  <div className="absolute inset-0 bg-slate-950/90 backdrop-blur-md flex flex-col items-center justify-center z-[60]">
                    <Loader2 className="w-8 h-8 text-white animate-spin mb-4 opacity-50" />
                    <p className="text-[10px] tracking-[0.4em] uppercase text-slate-400 animate-pulse">{processingStatus}</p>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 3. Global HUD Controls */}
      <div className={`fixed bottom-10 left-0 right-0 z-[70] transition-all duration-1000 px-6 ${showControls && webpageHtml ? 'translate-y-0 opacity-100' : 'translate-y-20 opacity-0'}`}>
        <div className="max-w-xl mx-auto bg-black/40 backdrop-blur-3xl border border-white/10 rounded-full p-3 flex items-center gap-6 shadow-2xl">
          <button onClick={restart} className="ml-4 text-slate-400 hover:text-white transition-colors"><RotateCcw size={18} /></button>
          
          <div className="flex-1 flex flex-col gap-1">
            <div className="flex justify-between text-[10px] uppercase tracking-tighter text-slate-500 px-1">
              <span>{activeScene?.emotion || 'Analyzing'}</span>
              <span>{Math.round(scrollPercent)}%</span>
            </div>
            <div className="h-[2px] w-full bg-white/10 rounded-full overflow-hidden">
              <div 
                className="h-full bg-white transition-all duration-500 ease-out" 
                style={{ width: `${scrollPercent}%` }} 
              />
            </div>
          </div>

          <button 
            onClick={() => { setWebpageHtml(''); setIsFullscreenView(false); setStoryboard(null); }} 
            className="mr-6 text-[10px] uppercase tracking-[0.2em] font-black text-white/40 hover:text-white transition-colors"
          >
            Exit
          </button>
        </div>
      </div>

      {/* Fullscreen Toggle for when in reading mode */}
      {isFullscreenView && webpageHtml && (
        <button 
          onClick={() => setIsFullscreenView(false)} 
          className={`fixed top-8 right-8 z-[100] p-3 bg-black/20 hover:bg-black text-white rounded-full backdrop-blur-md border border-white/10 transition-all ${showControls ? 'opacity-100' : 'opacity-0'}`}
        >
          <Minimize2 size={20} />
        </button>
      )}
    </div>
  );
}
