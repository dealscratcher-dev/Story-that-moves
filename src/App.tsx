import { useState } from 'react';
import TaskbarCompanion from './components/TaskbarCompanion';
import ImmersiveReader from './components/ImmersiveReader';
import DocumentInput from './components/DocumentInput';

function App() {
  const [activeStory, setActiveStory] = useState<{url: string, title: string} | null>(null);
  const [showInput, setShowInput] = useState(true);

  return (
    <div className="h-screen bg-slate-950 overflow-hidden relative">
      {/* 1. If a story is active, show the Reader */}
      {activeStory ? (
        <ImmersiveReader 
          url={activeStory.url} 
          title={activeStory.title} 
        />
      ) : (
        /* 2. If no story is active, show the URL/Link Input immediately */
        <div className="h-full flex flex-col items-center justify-center p-6">
          <div className="w-full max-w-2xl animate-fadeSlideIn">
             <DocumentInput onSelect={(story) => setActiveStory(story)} />
          </div>
          
          <div className="mt-12 text-center opacity-20">
            <h1 className="text-4xl font-black tracking-tighter mb-2">STITCHQYLT</h1>
            <p className="text-xs font-mono uppercase tracking-[0.4em]">Ready for Narrative Injection</p>
          </div>
        </div>
      )}

      {/* 3. Global Taskbar */}
      <TaskbarCompanion />
    </div>
  );
}

export default App;
