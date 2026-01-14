import { useEffect, useState } from 'react';
import { FileText, Trash2, Zap, PlayCircle } from 'lucide-react';
import { supabase, type Document } from '../lib/supabase';
// Import your client to check status
import { fastapiClient } from '../services/fastapiClient';

export default function DocumentList({ onDocumentSelect }: { onDocumentSelect: (doc: Document) => void }) {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Load from Supabase, but we'll eventually augment with Mongo status
  const loadDocuments = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('documents')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setDocuments(data || []);
    } catch (error) {
      console.error('List Load Error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadDocuments();
  }, []);

  return (
    <div className="h-full bg-slate-950 p-8">
      <div className="max-w-5xl mx-auto">
        <div className="flex justify-between items-end mb-10">
          <div>
            <h2 className="text-4xl font-light text-white tracking-tight">Your Archive</h2>
            <p className="text-slate-500 mt-2">Select a narrative to begin the motion experience.</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {documents.map((doc) => (
            <div
              key={doc.id}
              onClick={() => onDocumentSelect(doc)}
              className="group relative bg-slate-900/40 border border-slate-800 rounded-3xl p-6 hover:bg-slate-800/60 hover:border-emerald-500/50 transition-all cursor-pointer"
            >
              {/* Early In Hint: A visual "Vibe" indicator */}
              <div className="flex items-start justify-between">
                <div className="space-y-4 flex-1">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.6)]" />
                    <span className="text-[10px] uppercase tracking-widest text-slate-500 font-bold">Analyzed</span>
                  </div>
                  
                  <h3 className="text-xl font-medium text-white group-hover:text-emerald-400 transition-colors line-clamp-1">
                    {doc.title}
                  </h3>
                  
                  <p className="text-slate-400 text-sm leading-relaxed line-clamp-2">
                    {doc.content}
                  </p>
                </div>

                <div className="flex flex-col gap-2">
                   <button className="p-2 opacity-0 group-hover:opacity-100 text-slate-500 hover:text-red-400 transition-all">
                      <Trash2 size={18} />
                   </button>
                   <PlayCircle className="text-slate-700 group-hover:text-emerald-500 transition-colors" size={32} />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
