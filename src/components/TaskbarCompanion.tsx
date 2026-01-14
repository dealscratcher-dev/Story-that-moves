import { useState } from 'react';
import { BookOpen, Plus, List, Play, Minimize2, Maximize2, Sparkles } from 'lucide-react';
import DocumentInput from './DocumentInput';
import DocumentList from './DocumentList';
import ImmersiveReader from './ImmersiveReader'; // NEW
import SplitViewReader from './SplitViewReader';
import type { Document } from '../lib/supabase';

type View = 'list' | 'input' | 'reader' | 'studio';

export default function TaskbarCompanion() {
  const [view, setView] = useState<View>('list');
  const [isExpanded, setIsExpanded] = useState(false);
  const [selectedDocument, setSelectedDocument] = useState<Document | null>(null);

  const handleDocumentSelect = (doc: Document) => {
    setSelectedDocument(doc);
    setView('reader');
    setIsExpanded(true);
  };

  return (
    <div
      className={`fixed bottom-0 left-1/2 -translate-x-1/2 bg-slate-900/90 backdrop-blur-xl text-white shadow-2xl transition-all duration-500 rounded-t-3xl border-t border-white/10 ${
        isExpanded ? 'w-[98vw] h-[92vh] mb-2' : 'w-[500px] h-[64px] mb-4 rounded-full border'
      } z-[100]`}
    >
      <div className="flex items-center justify-between px-6 h-[64px]">
        <div className="flex items-center gap-3">
          <div className="bg-emerald-500 p-1.5 rounded-lg">
            <Sparkles className="w-4 h-4 text-black" />
          </div>
          <span className="font-bold tracking-tighter text-xl">STITCH</span>
        </div>

        <div className="flex items-center gap-1 bg-white/5 p-1 rounded-full">
          <TabButton active={view === 'input'} onClick={() => { setView('input'); setIsExpanded(true); }} icon={<Plus size={18}/>} />
          <TabButton active={view === 'list'} onClick={() => { setView('list'); setIsExpanded(true); }} icon={<List size={18}/>} />
          {selectedDocument && (
            <TabButton active={view === 'reader'} onClick={() => { setView('reader'); setIsExpanded(true); }} icon={<Play size={18}/>} />
          )}
          <div className="w-px h-4 bg-white/10 mx-2" />
          <TabButton active={false} onClick={() => setIsExpanded(!isExpanded)} icon={isExpanded ? <Minimize2 size={18}/> : <Maximize2 size={18}/>} />
        </div>
      </div>

      {isExpanded && (
        <div className="h-[calc(100%-64px)] overflow-hidden rounded-b-3xl">
          {view === 'list' && <DocumentList onDocumentSelect={handleDocumentSelect} />}
          {view === 'input' && <DocumentInput onDocumentCreated={() => setView('list')} />}
          {view === 'reader' && selectedDocument && (
            <ImmersiveReader 
              url={`local://${selectedDocument.id}`} // Or actual URL if stored
              title={selectedDocument.title} 
            />
          )}
          {view === 'studio' && <SplitViewReader />}
        </div>
      )}
    </div>
  );
}

function TabButton({ active, onClick, icon }: { active: boolean, onClick: () => void, icon: any }) {
  return (
    <button
      onClick={onClick}
      className={`p-2.5 rounded-full transition-all ${active ? 'bg-white text-black' : 'text-slate-400 hover:text-white hover:bg-white/5'}`}
    >
      {icon}
    </button>
  );
}
