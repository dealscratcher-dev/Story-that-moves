import { useState } from 'react';
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
   * handleComplete is triggered by DocumentInput once 
   * the Supabase fetch and FastAPI processing are done.
   */
  const handleComplete = (html: string, storyboard: Storyboard) => {
    setActiveContent({
      html,
      storyboard
    });
  };

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
          /* DISPLAY MODE: Show the Immersive Reader with injected content */
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
      
      {/* Decorative Background Glow (Optional) */}
      {!activeContent && (
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-emerald-500/5 rounded-full blur-[120px] pointer-events-none" />
      )}
    </div>
  );
}

export default App;
