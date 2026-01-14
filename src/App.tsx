import { useState, useCallback } from 'react';
import TaskbarCompanion from './components/TaskbarCompanion';
import ImmersiveReader from './components/ImmersiveReader';
import DocumentInput from './components/DocumentInput';
import { Storyboard } from './types/storyboard';

interface ReaderState {
  html: string;
  storyboard: Storyboard | null;
}

function App() {
  // We store the final processed content here
  const [activeContent, setActiveContent] = useState<ReaderState | null>(null);

  /**
   * handleComplete now supports a "progressive" load.
   * DocumentInput calls this once with HTML, then again with the Storyboard.
   */
  const handleComplete = useCallback((html: string, storyboard: Storyboard | null) => {
    setActiveContent(prev => {
      // If we already have content and this is just a storyboard update:
      if (prev && prev.html === html) {
        return { ...prev, storyboard };
      }
      // If this is a fresh load:
      return { html, storyboard };
    });
  }, []);

  /**
   * Resets the application state to the home screen
   */
  const handleExit = () => {
    setActiveContent(null);
  };

  return (
    <div className="h-screen bg-slate-950 overflow-hidden relative selection:bg-emerald-500/30">
      {/* 1. LAYER: MAIN VIEW */}
      <main className="h-full w-full">
        {activeContent ? (
          /* DISPLAY MODE: Show the Immersive Reader. 
             It will now show the article immediately even if storyboard is null.
          */
          <ImmersiveReader 
            webpageHtml={activeContent.html} 
            storyboard={activeContent.storyboard} 
            onExit={handleExit}
          />
        ) : (
          /* INPUT MODE: Show the URL/Text landing page */
          <div className="h-full flex flex-col items-center justify-center p-6 relative z-10">
            <div className="w-full max-w-2xl animate-fadeSlideIn">
              <DocumentInput onComplete={handleComplete} />
            </div>
            
            {/* Branding Footer */}
            <div className="mt-12 text-center opacity-20 pointer-events-none">
              <h1 className="text-4xl font-black tracking-tighter mb-2 text-white">STITCHQYLT</h1>
              <p className="text-xs font-mono uppercase tracking-[0.4em] text-white">
                Ready for Narrative Injection
              </p>
            </div>
          </div>
        )}
      </main>

      {/* 2. LAYER: GLOBAL NAVIGATION */}
      <TaskbarCompanion />
      
      {/* Decorative Background Glow */}
      {!activeContent && (
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-emerald-500/10 rounded-full blur-[120px] pointer-events-none animate-pulse" />
      )}
    </div>
  );
}

export default App;
