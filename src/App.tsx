import { useState, useCallback, useMemo } from 'react';
import TaskbarCompanion from './components/TaskbarCompanion';
import ImmersiveReader from './components/ImmersiveReader';
import DocumentInput from './components/DocumentInput';
import { Storyboard } from './types/storyboard';

interface ReaderState {
  html: string;
  storyboard: Storyboard | null;
}

function App() {
  /**
   * activeContent holds the data injected from the DocumentInput logic.
   * It starts as null, then gets HTML, then gets the AI Storyboard.
   */
  const [activeContent, setActiveContent] = useState<ReaderState | null>(null);

  /**
   * PROD FEATURE: isParallelMode
   * This derived state triggers the "Cinema Mode" UI shifts across the app
   * once the AI narrative is ready to play.
   */
  const isParallelMode = useMemo(() => !!activeContent?.storyboard, [activeContent]);

  /**
   * handleComplete
   * Supports "progressive loading": 
   * 1. First call provides the Article HTML (Instant view).
   * 2. Second call provides the AI Storyboard (Animation injection).
   */
  const handleComplete = useCallback((html: string, storyboard: Storyboard | null) => {
    setActiveContent(prev => {
      // Logic for updating storyboard without re-rendering the whole iframe
      if (prev && prev.html === html) {
        return { ...prev, storyboard };
      }
      // Logic for new article load
      return { html, storyboard };
    });
  }, []);

  /**
   * handleExit
   * Clears state and returns user to the "Narrative Injection" landing page.
   */
  const handleExit = () => {
    setActiveContent(null);
  };

  return (
    <div 
      className={`h-screen w-full transition-colors duration-1000 overflow-hidden relative selection:bg-emerald-500/30 ${
        isParallelMode ? 'bg-black' : 'bg-[#020617]'
      }`}
    >
      {/* 1. LAYER: MAIN PRODUCTION STAGE */}
      <main className="h-full w-full relative">
        {activeContent ? (
          /* IMMERSIVE READER (Parallel Environment)
            Renders the sandboxed article and the floating motion canvas.
          */
          <ImmersiveReader 
            webpageHtml={activeContent.html} 
            storyboard={activeContent.storyboard} 
            onExit={handleExit}
            // Passing isProcessing status if your DocumentInput manages it
            isProcessing={!activeContent.storyboard}
            processingStatus="Synthesizing Narrative Motion..."
          />
        ) : (
          /* LANDING MODE: Input for URLs or Text
          */
          <div className="h-full flex flex-col items-center justify-center p-6 relative z-10">
            <div className="w-full max-w-2xl animate-in fade-in slide-in-from-bottom-8 duration-700">
              <DocumentInput onComplete={handleComplete} />
            </div>
            
            {/* Branding Footer: Animates out when content is loaded */}
            <div className="mt-12 text-center opacity-30 pointer-events-none group">
              <h1 className="text-5xl font-black tracking-tighter mb-2 text-white italic">
                STITCH<span className="text-emerald-500 group-hover:text-emerald-400 transition-colors">QYLT</span>
              </h1>
              <p className="text-[10px] font-mono uppercase tracking-[0.6em] text-white/60">
                Next-Gen Narrative Injection Engine
              </p>
            </div>
          </div>
        )}
      </main>

      {/* 2. LAYER: GLOBAL NAVIGATION (TASKBAR)
          Stays at z-100 to ensure it's always above the parallel layers.
      */}
      <div className="relative z-[100]">
        <TaskbarCompanion />
      </div>
      
      {/* 3. LAYER: AMBIENT ATMOSPHERE
          Only visible during the input phase to guide focus.
      */}
      {!activeContent && (
        <>
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-emerald-500/5 rounded-full blur-[160px] pointer-events-none animate-pulse" />
          <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(circle_at_50%_120%,rgba(16,185,129,0.05),transparent)] pointer-events-none" />
        </>
      )}
    </div>
  );
}

export default App;
