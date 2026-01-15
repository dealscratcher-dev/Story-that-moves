import { useState, useEffect, useRef } from 'react';
import { RotateCcw, Loader2, Zap } from 'lucide-react';
import OverlayMotion from './OverlayMotion'; 
import IframeScrollBridge from './IframeScrollBridge';
import { CanvasRenderer } from './CanvasRenderer';
import { Storyboard, StoryboardScene } from '../types/storyboard';

interface ImmersiveReaderProps {
  webpageHtml: string;
  storyboard: Storyboard | null;
  isProcessing?: boolean;
  processingStatus?: string;
  onExit: () => void;
}

export default function ImmersiveReader({ 
  webpageHtml, 
  storyboard, 
  isProcessing, 
  processingStatus,
  onExit 
}: ImmersiveReaderProps) {
  // --- Engine State ---
  const [activeScene, setActiveScene] = useState<StoryboardScene | null>(null);
  const [scrollPercent, setScrollPercent] = useState(0);
  const [showControls, setShowControls] = useState(true);

  const iframeRef = useRef<HTMLIFrameElement>(null);
  const hideControlsTimer = useRef<NodeJS.Timeout>();

  // --- Narrative Sync Logic ---
  useEffect(() => {
    if (!storyboard?.waypoints || storyboard.waypoints.length === 0) return;

    const currentWaypoint = [...storyboard.waypoints]
      .reverse()
      .find(wp => scrollPercent >= wp.percentage);

    if (currentWaypoint) {
      setActiveScene(currentWaypoint.scene);
    }
  }, [scrollPercent, storyboard]);

  // --- UI Logic ---
  const handleMouseMove = () => {
    setShowControls(true);
    if (hideControlsTimer.current) clearTimeout(hideControlsTimer.current);
    hideControlsTimer.current = setTimeout(() => setShowControls(false), 3000);
  };

  const scrollToTop = () => {
    if (iframeRef.current?.contentWindow) {
      iframeRef.current.contentWindow.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  return (
    <div 
      className="h-screen w-full relative overflow-hidden bg-white" 
      onMouseMove={handleMouseMove}
    >
      {/* 1. LAYER: MOOD ENGINE (OverlayMotion) */}
      <OverlayMotion 
        isActive={!!webpageHtml}
        motionType={activeScene?.type === 'action' ? 'pulse' : 'drift'}
        intensity={activeScene?.intensity || 0.4}
        emotion={activeScene?.emotion || 'neutral'}
        scene={activeScene}
      />

      {/* 2. LAYER: THE ARTICLE (The Sandboxed Environment) */}
      <div 
        className={`relative z-10 h-full p-0 transition-all duration-1000 ease-in-out ${
          // PATCHED: Removed opacity-30, grayscale, and blur filters
          storyboard ? 'opacity-100 scale-100' : 'opacity-100 scale-100'
        }`}
      >
        {/* PATCHED: Removed bg-slate-900/10 and backdrop-blur-sm */}
        <div className="w-full h-full flex flex-col overflow-hidden">
          <div className="relative w-full h-full">
            {webpageHtml ? (
              <>
                <iframe 
                  ref={iframeRef} 
                  srcDoc={webpageHtml} 
                  className="w-full h-full border-0 bg-white" 
                  sandbox="allow-same-origin allow-scripts" 
                />
                
                <IframeScrollBridge 
                  iframeRef={iframeRef}
                  onScrollChange={(data) => setScrollPercent(data.scrollPercent)}
                  isActive={true}
                />
              </>
            ) : (
              <div className="flex-1 flex items-center justify-center h-full">
                 <Loader2 className="w-10 h-10 text-slate-200 animate-spin" />
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 3. LAYER: PARALLEL MOTION STAGE (CanvasRenderer) */}
      {storyboard && (
        <div className="absolute inset-0 z-20 pointer-events-none flex items-center justify-center">
           <CanvasRenderer 
             frames={storyboard.frames || []}
             currentFrameIndex={activeScene?.frameIndex || 0}
             onFrameComplete={() => {}} 
           />
        </div>
      )}

      {/* 4. LAYER: INTERACTIVE HUD & PROCESSING */}
      <div className="absolute inset-0 z-30 pointer-events-none">
        
        {isProcessing && (
          <div className="absolute inset-0 bg-white/90 backdrop-blur-xl flex flex-col items-center justify-center pointer-events-auto">
            <div className="relative">
                <Loader2 className="w-16 h-16 text-emerald-500 animate-spin mb-6" />
                <Zap className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-6 h-6 text-emerald-400 animate-pulse" />
            </div>
            <p className="text-[10px] font-bold text-emerald-600 uppercase tracking-[0.5em] animate-pulse">
              {processingStatus || 'Aligning Parallel Coordinates...'}
            </p>
          </div>
        )}

        {webpageHtml && (
          <div className={`fixed bottom-8 left-1/2 -translate-x-1/2 transition-all duration-700 pointer-events-auto ${
            showControls ? 'translate-y-0 opacity-100' : 'translate-y-20 opacity-0'
          }`}>
            <div className="bg-white/80 backdrop-blur-3xl border border-slate-200 rounded-[2rem] px-8 py-4 flex items-center gap-8 shadow-[0_20px_50px_rgba(0,0,0,0.1)] min-w-[500px]">
              
              <button 
                onClick={scrollToTop} 
                className="p-2 text-slate-400 hover:text-emerald-500 transition-colors bg-slate-50 rounded-xl"
              >
                <RotateCcw size={18} />
              </button>
              
              <div className="flex-1 flex flex-col gap-2">
                <div className="flex justify-between text-[10px] font-black font-mono text-slate-500 uppercase tracking-widest">
                  <span className="flex items-center gap-2">
                    <div className={`h-1.5 w-1.5 rounded-full ${storyboard ? 'bg-emerald-500 animate-pulse' : 'bg-slate-300'}`} />
                    {activeScene?.name || 'SYNCING...'}
                  </span>
                  <span className="text-slate-400">{Math.round(scrollPercent)}%</span>
                </div>
                
                <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-gradient-to-r from-emerald-600 to-emerald-400 transition-all duration-500 ease-out" 
                    style={{ width: `${scrollPercent}%` }} 
                  />
                </div>
              </div>

              <div className="h-8 w-px bg-slate-200" />

              <button 
                onClick={onExit} 
                className="text-[10px] font-black text-slate-400 hover:text-slate-900 uppercase tracking-widest transition-all hover:tracking-[0.2em]"
              >
                Exit
              </button>
            </div>
          </div>
        )}
      </div>

      {/* PATCHED: Removed the shadow-[inset_0_0_150px_rgba(0,0,0,0.8)] vignette layer */}
      <div className="absolute inset-0 pointer-events-none z-[25]" />
    </div>
  );
}
