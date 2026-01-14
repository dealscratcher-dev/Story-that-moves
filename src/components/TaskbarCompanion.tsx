import { useState } from 'react';
import { BookOpen, Plus, List, Play, Minimize2, Maximize2, Layers } from 'lucide-react';
import DocumentInput from './DocumentInput';
import DocumentList from './DocumentList';
import NarrativeReader from './NarrativeReader';
import SplitViewReader from './SplitViewReader';
import type { Document } from '../lib/supabase';

type View = 'list' | 'input' | 'reader' | 'split';

export default function TaskbarCompanion() {
  const [view, setView] = useState<View>('split');
  const [isExpanded, setIsExpanded] = useState(false);
  const [selectedDocument, setSelectedDocument] = useState<Document | null>(null);

  const handleDocumentSelect = (doc: Document) => {
    setSelectedDocument(doc);
    setView('reader');
    setIsExpanded(true);
  };

  const handleDocumentCreated = () => {
    setView('list');
  };

  return (
    <div
      className={`fixed bottom-0 left-1/2 -translate-x-1/2 bg-slate-900 text-white shadow-2xl transition-all duration-300 rounded-t-2xl border-t-2 border-slate-700 ${
        isExpanded ? 'w-[95vw] h-[85vh]' : 'w-[600px] h-[60px]'
      }`}
    >
      <div className="flex items-center justify-between px-4 h-[60px] border-b border-slate-700">
        <div className="flex items-center gap-3">
          <BookOpen className="w-5 h-5 text-emerald-400" />
          <span className="font-semibold text-lg tracking-tight">StitchQylt</span>
          <span className="text-xs text-slate-400 hidden sm:inline">Story Narration Layer</span>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => { setView('split'); setIsExpanded(true); }}
            className={`p-2 rounded-lg transition-colors ${
              view === 'split' ? 'bg-emerald-600' : 'hover:bg-slate-700'
            }`}
            title="Live Companion Mode"
          >
            <Layers className="w-4 h-4" />
          </button>

          <button
            onClick={() => { setView('input'); setIsExpanded(true); }}
            className={`p-2 rounded-lg transition-colors ${
              view === 'input' ? 'bg-emerald-600' : 'hover:bg-slate-700'
            }`}
            title="Add Document"
          >
            <Plus className="w-4 h-4" />
          </button>

          <button
            onClick={() => { setView('list'); setIsExpanded(true); }}
            className={`p-2 rounded-lg transition-colors ${
              view === 'list' ? 'bg-emerald-600' : 'hover:bg-slate-700'
            }`}
            title="Document Library"
          >
            <List className="w-4 h-4" />
          </button>

          {selectedDocument && (
            <button
              onClick={() => { setView('reader'); setIsExpanded(true); }}
              className={`p-2 rounded-lg transition-colors ${
                view === 'reader' ? 'bg-emerald-600' : 'hover:bg-slate-700'
              }`}
              title="Immersive Reader"
            >
              <Play className="w-4 h-4" />
            </button>
          )}

          <div className="w-px h-6 bg-slate-700 mx-1" />

          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="p-2 hover:bg-slate-700 rounded-lg transition-colors"
            title={isExpanded ? 'Minimize' : 'Expand'}
          >
            {isExpanded ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {isExpanded && (
        <div className="h-[calc(100%-60px)] overflow-hidden">
          {view === 'split' && (
            <SplitViewReader />
          )}

          {view === 'list' && (
            <DocumentList onDocumentSelect={handleDocumentSelect} />
          )}

          {view === 'input' && (
            <DocumentInput onDocumentCreated={handleDocumentCreated} />
          )}

          {view === 'reader' && selectedDocument && (
            <NarrativeReader document={selectedDocument} />
          )}
        </div>
      )}
    </div>
  );
}
