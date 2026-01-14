import { useState, useEffect, useRef } from 'react';
import { RotateCcw, Link, FileText, Minimize2, Loader2, Info } from 'lucide-react';
import OverlayMotion from './OverlayMotion'; 
import IframeScrollBridge from './IframeScrollBridge';
import { Storyboard, StoryboardScene } from '../types/storyboard';
import { fastapiClient } from '../services/fastapiClient';

export default function ImmersiveReader() {
  // --- UI State ---
  const [inputMode, setInputMode] = useState<'text' | 'url'>('url');
  const [urlInput, setUrlInput] = useState('');
  const [inputText, setInputText] = useState('');
  const [webpageHtml, setWebpageHtml] = useState('');
  const [isFullscreenView, setIsFullscreenView] = useState(false);
  const [showControls, setShowControls] = useState(true);

  // --- Engine State ---
  const [storyboard, setStoryboard] = useState<Storyboard | null>(null);
  const [activeScene, setActiveScene] = useState<StoryboardScene | null>(null);
  const [scrollPercent, setScrollPercent] = useState(0);
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingStatus, setProcessingStatus] = useState('');

  const iframeRef = useRef<HTMLIFrameElement>(null);
  const hideControlsTimer = useRef<NodeJS.Timeout>();

  // --- Narrative Sync Logic ---
  // Matches the current scroll percentage to the correct waypoint in the storyboard
  useEffect(() => {
    if (!storyboard?.waypoints || storyboard.waypoints.length === 0) return;

    // Find the waypoint that matches the current scroll position
    const currentWaypoint = [...storyboard.waypoints]
      .reverse()
      .find(wp => scrollPercent >= wp.percentage);

    if (currentWaypoint) {
      setActiveScene(currentWaypoint.scene);
    }
  }, [scrollPercent, storyboard]);

  // --- Backend Interaction ---
  const processNarrative = async (url: string, text: string) => {
    setIsProcessing(true);
    setProcessingStatus('Analyzing Narrative Structure...');
    try {
      const job = await fastapiClient.processArticle(url, text);
      const completedJob = await fastapiClient.pollJobCompletion(job.job_id, (j) => {
        if (j.progress) setProcessingStatus(`Synthesizing Visuals: ${j.progress}%`);
      });
      
      if (completedJob.article_id) {
        const data = await fastapiClient.getStoryboard(completedJob.article_id);
        setStoryboard(data);
      }
    } catch (e) {
      console.error('Narrative analysis failed:', e);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleBeginExperience = async () => {
    if (inputMode === 'url' && !urlInput.trim()) return;
    setIsProcessing(true);
    setIsFullscreenView(true);

    try {
      const apiUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/fetch-webpage`;
      const headers = {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
      };

      // Fetch HTML for the Iframe
      const htmlRes = await fetch(apiUrl, {
        method: 'POST',
        headers,
        body: JSON.stringify({ url: urlInput, mode: 'html' }),
      });
      const htmlData = await htmlRes.json();
      if (htmlRes.ok && htmlData.html) setWebpageHtml(htmlData.html);

      // Fetch Text for AI Analysis
      const textRes = await fetch(apiUrl, {
        method: 'POST',
        headers,
        body: JSON.stringify({ url: urlInput }),
      });
      const textData = await textRes.json();

      if (textData.text) {
        await processNarrative(urlInput, textData.text);
      }
    } catch (error) {
      console.error('Initialization failed');
      setIsFullscreenView(false);
    } finally {
      setIsProcessing(false);
    }
  };

  const resetReader = () => {
    setWebpageHtml('');
    setStoryboard(null);
    setActiveScene(null);
    setIsFullscreenView(false);
  };

  return (
    <div 
      className="h-screen w-full relative overflow-hidden bg-slate-950"
      onMouseMove={() => {
        setShowControls(true);
        clearTimeout(hideControlsTimer.current);
        hideControlsTimer.current = setTimeout(() => setShowControls(false), 3000);
      }}
    >
      {/* 1. BACKGROUND ENGINE (OverlayMotion) */}
      <OverlayMotion 
        isActive={!!webpageHtml}
        motionType={activeScene?.type === 'action' ? 'pulse' : 'drift'}
        intensity={activeScene?.intensity || 0.4}
        emotion={activeScene?.emotion || 'neutral'}
        scene={activeScene}
      />

      {/* 2. CONTENT LAYER */}
      <div className={`relative z-10 h-full transition-all duration-1000 ${isFullscreenView ? 'p-0' : 'p-12'}`}>
        <div className={`w-full h-full bg-slate-900/10 backdrop-blur-sm border border-white/5 flex flex-col overflow-hidden ${isFullscreenView ? '' : 'rounded-3xl shadow-2xl'}`}>
          
          {!webpageHtml ? (
            <div className="flex-1 flex flex-col items-center justify-center p-6 bg-slate-950">
              <div className="max-w-md w-full space-y-8 text-center">
                <div className="space-y-2">
                  <h1 className="text-4xl font-bold tracking-tighter text-white">STITCH</h1>
                  <p className="text-slate-500 font-mono text-xs uppercase tracking-widest">Immersive Narration Layer</p>
                </div>

                <div className="flex justify-center gap-2 bg-white/5 p-1 rounded-2xl">
                  <button onClick={() => setInputMode('url')} className={`flex-1 flex justify-center py-3 rounded-xl transition-all ${inputMode === 'url' ? 'bg-white text-black' : 'text-slate-400'}`}><Link size={20} /></button>
                  <button onClick={() => setInputMode('text')} className={`flex-1 flex justify-center py-3 rounded-xl transition-all ${inputMode === 'text' ? 'bg-white text-black' : 'text-slate-400'}`}><FileText size={20} /></button>
                </div>

                {inputMode === 'url' ? (
                  <div className="space-y-6">
                    <input
                      type="url"
                      value={urlInput}
                      onChange={(e) => setUrlInput(e.target.value)}
                      placeholder="Paste article URL..."
                      className="w-full bg-transparent border-b border-slate-800 py-4 text-center text-xl focus:border-white outline-none transition-colors text-white"
                    />
                    <button 
                      onClick={handleBeginExperience}
                      className="w-full py-4 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-bold transition-all"
                    >
                      Initialize Story
                    </button>
                  </div>
                ) : (
                  <textarea 
                    value={inputText}
                    onChange={(e) => setInputText(e.target.value)}
                    placeholder="Enter narrative prose..."
                    className="w-full h-48 bg-white/5 rounded-2xl p-6 text-white placeholder-slate-600 focus:outline-none focus:ring-1 focus:ring-white/20"
                  />
                )}
              </div>
            </div>
          ) : (
            <div className="relative w-full h-full">
              <iframe 
                ref={iframeRef} 
                srcDoc={webpageHtml} 
                className="w-full h-full border-0 bg-white" 
                sandbox="allow-same-origin allow-scripts" 
              />
              
              <IframeScrollBridge 
                iframeRef={iframeRef}
                onScroll={(percent) => setScrollPercent(percent)}
              />

              {isProcessing && (
                <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-md flex flex-col items-center justify-center z-50">
                  <Loader2 className="w-10 h-10 text-emerald-500 animate-spin mb-4" />
                  <p className="text-xs font-mono text-emerald-500 uppercase tracking-[0.3em]">{processingStatus}</p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* 3. HUD CONTROLS */}
      {webpageHtml && (
        <div className={`fixed bottom-8 left-1/2 -translate-x-1/2 z-50 transition-all duration-500 ${showControls ? 'translate-y-0 opacity-100' : 'translate-y-12 opacity-0'}`}>
          <div className="bg-slate-900/80 backdrop-blur-2xl border border-white/10 rounded-full px-6 py-3 flex items-center gap-6 shadow-2xl min-w-[400px]">
            <button onClick={() => { if(iframeRef.current?.contentWindow) iframeRef.current.contentWindow.scrollTo(0,0); }} className="text-slate-400 hover:text-white transition-colors">
              <RotateCcw size={18} />
            </button>
            
            <div className="flex-1 flex flex-col gap-1">
              <div className="flex justify-between text-[10px] font-mono text-slate-500 uppercase tracking-widest">
                <span className="flex items-center gap-1"><Info size={10} /> {activeScene?.name || 'Mapping...'}</span>
                <span>{Math.round(scrollPercent)}%</span>
              </div>
              <div className="h-1 w-full bg-white/5 rounded-full overflow-hidden">
                <div className="h-full bg-emerald-500 transition-all duration-300" style={{ width: `${scrollPercent}%` }} />
              </div>
            </div>

            <button onClick={resetReader} className="text-[10px] font-bold text-white/40 hover:text-white uppercase tracking-widest transition-colors">
              Exit
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
