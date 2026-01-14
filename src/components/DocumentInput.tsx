import React, { useState } from 'react';
import { Link, FileText, ChevronRight, Loader2 } from 'lucide-react';

interface DocumentInputProps {
  onSelect: (story: { url: string; title: string }) => void;
}

export default function DocumentInput({ onSelect }: DocumentInputProps) {
  const [mode, setMode] = useState<'url' | 'text'>('url');
  const [inputValue, setInputValue] = useState('');
  const [title, setTitle] = useState('');
  const [isValidating, setIsValidating] = useState(false);

  const handleSubmit = () => {
    if (!inputValue.trim()) return;
    
    // For URL mode, we use the URL as the title if none is provided
    const finalTitle = title.trim() || (mode === 'url' ? 'Web Narrative' : 'New Archive');
    onSelect({ url: inputValue, title: finalTitle });
  };

  return (
    <div className="w-full max-w-xl mx-auto space-y-8 animate-fadeSlideIn">
      {/* Mode Toggle */}
      <div className="flex justify-center gap-4">
        <button 
          onClick={() => setMode('url')}
          className={`flex items-center gap-2 px-6 py-2 rounded-full transition-all ${mode === 'url' ? 'bg-white text-black' : 'bg-white/5 text-slate-400 hover:bg-white/10'}`}
        >
          <Link size={16} /> <span className="text-xs font-bold uppercase tracking-widest">Link</span>
        </button>
        <button 
          onClick={() => setMode('text')}
          className={`flex items-center gap-2 px-6 py-2 rounded-full transition-all ${mode === 'text' ? 'bg-white text-black' : 'bg-white/5 text-slate-400 hover:bg-white/10'}`}
        >
          <FileText size={16} /> <span className="text-xs font-bold uppercase tracking-widest">Prose</span>
        </button>
      </div>

      <div className="space-y-6">
        {mode === 'url' ? (
          <div className="space-y-4">
            <div className="relative group">
              <input
                type="url"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                placeholder="Paste narrative URL here..."
                className="w-full bg-white/5 border-b-2 border-white/20 p-6 text-xl text-white placeholder-white/20 focus:outline-none focus:border-white transition-colors text-center font-light"
                onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
              />
              <div className="absolute bottom-0 left-0 h-0.5 bg-white transition-all duration-500 w-0 group-focus-within:w-full" />
            </div>
            <p className="text-[10px] text-center text-slate-500 uppercase tracking-[0.3em]">Supports most article and blog formats</p>
          </div>
        ) : (
          <div className="space-y-4">
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Document Title"
              className="w-full bg-transparent border-none text-2xl font-light text-white placeholder-slate-700 focus:outline-none"
            />
            <textarea
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              placeholder="Paste your prose here..."
              className="w-full h-48 bg-white/5 rounded-2xl p-6 text-white placeholder-slate-700 focus:outline-none focus:ring-1 focus:ring-white/20 resize-none leading-relaxed"
            />
          </div>
        )}

        {/* The Action Button */}
        <button
          onClick={handleSubmit}
          disabled={!inputValue.trim() || isValidating}
          className="group w-full py-5 bg-white text-black rounded-2xl font-black text-xs uppercase tracking-[0.5em] flex items-center justify-center gap-2 hover:bg-emerald-400 transition-all active:scale-[0.98] disabled:opacity-20 disabled:grayscale"
        >
          {isValidating ? (
            <Loader2 className="animate-spin" size={18} />
          ) : (
            <>
              Initialize Experience <ChevronRight size={18} className="group-hover:translate-x-1 transition-transform" />
            </>
          )}
        </button>
      </div>
    </div>
  );
}
