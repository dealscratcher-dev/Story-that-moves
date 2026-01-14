import { useState } from 'react';
import { FileText, Loader2, Sparkles } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { fastapiClient } from '../services/fastapiClient';

export default function DocumentInput({ onDocumentCreated }: { onDocumentCreated: () => void }) {
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !content.trim()) return;

    setIsProcessing(true);

    try {
      // 1. Save the "Raw" content to Supabase
      const { data: document, error: docError } = await supabase
        .from('documents')
        .insert({
          title: title.trim(),
          content: content.trim(),
          source_type: 'manual',
        })
        .select().single();

      if (docError) throw docError;

      // 2. Trigger the FastAPI "Brain" to analyze it
      // This is much better than local splitIntoSegments()
      const job = await fastapiClient.processArticle(`local://${document.id}`, content.trim());
      
      // 3. Wait for the Storyboard to be ready
      await fastapiClient.pollJobCompletion(job.job_id);

      setTitle('');
      setContent('');
      onDocumentCreated();
    } catch (error) {
      console.error('Narrative pipeline failed:', error);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="h-full bg-slate-950 p-12">
      <form onSubmit={handleSubmit} className="max-w-3xl mx-auto space-y-8">
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-emerald-400">
            <Sparkles size={20} />
            <span className="text-xs font-black uppercase tracking-widest">New Archive</span>
          </div>
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Document Title"
            className="w-full bg-transparent text-4xl font-light text-white outline-none placeholder:opacity-20"
          />
        </div>

        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="Paste your prose here..."
          className="w-full h-64 bg-slate-900/50 border border-slate-800 rounded-3xl p-8 text-lg font-light leading-relaxed text-slate-300 focus:border-emerald-500/50 outline-none transition-all resize-none"
        />

        <button
          type="submit"
          disabled={isProcessing}
          className="group relative w-full py-4 bg-white text-black font-bold rounded-full overflow-hidden transition-transform active:scale-95 disabled:opacity-50"
        >
          {isProcessing ? (
            <div className="flex items-center justify-center gap-2">
              <Loader2 className="animate-spin" size={18} />
              <span>Analyzing Narrative Depth...</span>
            </div>
          ) : (
            <span>Commit to Archive</span>
          )}
        </button>
      </form>
    </div>
  );
}
