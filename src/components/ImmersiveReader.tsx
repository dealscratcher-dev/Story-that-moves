import { useState, useEffect, useRef } from 'react';
import { RotateCcw, Loader2, Info } from 'lucide-react';
import OverlayMotion from './OverlayMotion'; 
import IframeScrollBridge from './IframeScrollBridge';
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
      className="h-screen w-full relative overflow-hidden bg-slate-950"
      onMouseMove={handleMouseMove}
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
      <div className="relative z-10 h-full p-0 transition-all duration-1000">
        <div className="w-full h-full bg-slate-900/10 backdrop-blur-sm flex flex-col overflow-hidden">
          
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
                  onScroll={(percent) => setScrollPercent(percent)}
                  isActive={true}
                />
              </>
            ) : (
              <div className="flex-1 flex items-center justify-center h-full">
                 <Loader2 className="w-10 h-10 text-white/20 animate-spin" />
              </div>
            )}

            {/* Processing Overlay */}
            {isProcessing && (
              <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-md flex flex-col items-center justify-center z-50">
                <Loader2 className="w-10 h-10 text-emerald-500 animate-spin mb-4" />
                <p className="text-xs font-mono text-emerald-500 uppercase tracking-[0.3em]">
                  {processingStatus || 'Analyzing Narrative...'}
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 3. HUD CONTROLS */}
      {webpageHtml && (
        <div className={`fixed bottom-8 left-1/2 -translate-x-1/2 z-50 transition-all duration-500 ${showControls ? 'translate-y-0 opacity-100' : 'translate-y-12 opacity-0'}`}>
          <div className="bg-slate-900/80 backdrop-blur-2xl border border-white/10 rounded-full px-6 py-3 flex items-center gap-6 shadow-2xl min-w-[400px]">
            <button onClick={scrollToTop} className="text-slate-400 hover:text-white transition-colors">
              <RotateCcw size={18} />
            </button>
            
            <div className="flex-1 flex flex-col gap-1">
              <div className="flex justify-between text-[10px] font-mono text-slate-500 uppercase tracking-widest">
                <span className="flex items-center gap-1">
                  <Info size={10} /> {activeScene?.name || 'Synchronizing...'}
                </span>
                <span>{Math.round(scrollPercent)}%</span>
              </div>
              <div className="h-1 w-full bg-white/5 rounded-full overflow-hidden">
                <div className="h-full bg-emerald-500 transition-all duration-300" style={{ width: `${scrollPercent}%` }} />
              </div>
            </div>

            <button onClick={onExit} className="text-[10px] font-bold text-white/40 hover:text-white uppercase tracking-widest transition-colors">
              Exit
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
