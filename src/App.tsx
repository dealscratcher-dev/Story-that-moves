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
   * Initial entry point. Used to open the reader immediately with HTML.
   */
  const handleComplete = useCallback((html: string, storyboard: Storyboard | null) => {
    setActiveContent({ html, storyboard });
  }, []);

  /**
   * handleStoryboardUpdate
   * The "Upgrade" function. This is called by DocumentInput once the 
   * background AI processing on Railway is finished.
   */
  const handleStoryboardUpdate = useCallback((storyboard: Storyboard) => {
    setActiveContent(prev => {
      if (!prev) return null;
      // We keep the existing HTML but inject the new storyboard
      return { ...prev, storyboard };
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
          /* IMMERSIVE READER 
             If storyboard is null, it shows the loader.
             Once handleStoryboardUpdate is called, the loader vanishes.
          */
          <ImmersiveReader 
            webpageHtml={activeContent.html} 
            storyboard={activeContent.storyboard} 
            onExit={handleExit}
            isProcessing={!activeContent.storyboard}
            processingStatus="Synthesizing Narrative Motion..."
          />
        ) : (
          /* LANDING MODE */
          <div className="h-full flex flex-col items-center justify-center p-6 relative z-10">
            <div className="w-full max-w-2xl animate-in fade-in slide-in-from-bottom-8 duration-700">
              <DocumentInput 
                onComplete={handleComplete} 
                onStoryboardReady={handleStoryboardUpdate} 
              />
            </div>
            
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

      {/* 2. LAYER: GLOBAL NAVIGATION */}
      <div className="relative z-[100]">
        <TaskbarCompanion />
      </div>
      
      {/* 3. LAYER: AMBIENT ATMOSPHERE */}
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
