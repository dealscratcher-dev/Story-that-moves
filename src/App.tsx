import { useState } from 'react';
import TaskbarCompanion from './components/TaskbarCompanion';
import ImmersiveReader from './components/ImmersiveReader';
import type { Document } from './lib/supabase';

function App() {
  // Global state to track which story is currently "Active" in the engine
  const [activeStory, setActiveStory] = useState<{url: string, title: string} | null>(null);

  return (
    <div className="h-screen bg-slate-950 overflow-hidden relative">
      {/* 1. THE STAGE: This is the background layer where the story lives */}
      {activeStory ? (
        <ImmersiveReader 
          url={activeStory.url} 
          title={activeStory.title} 
        />
      ) : (
        <div className="h-full flex items-center justify-center text-slate-700">
          <div className="text-center">
            <h1 className="text-4xl font-black tracking-tighter opacity-20 mb-4">STITCHQYLT</h1>
            <p className="text-sm font-mono uppercase tracking-widest">Select a narrative to begin</p>
          </div>
        </div>
      )}

      {/* 2. THE CONTROL: The Taskbar sits on top of the reader */}
      <TaskbarCompanion />
    </div>
  );
}

export default App;
