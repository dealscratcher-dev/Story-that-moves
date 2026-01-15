import React, { useState } from 'react';
import { Link, FileText, ChevronRight, Loader2 } from 'lucide-react';
import { fastapiClient } from '../services/fastapiClient';

interface DocumentInputProps {
  // onComplete opens the reader immediately with HTML
  onComplete: (html: string, storyboard: any | null) => void;
  // onStoryboardReady "upgrades" the reader once AI processing finishes
  onStoryboardReady: (storyboard: any) => void; 
}

export default function DocumentInput({ onComplete, onStoryboardReady }: DocumentInputProps) {
  const [mode, setMode] = useState<'url' | 'text'>('url');
  const [inputValue, setInputValue] = useState('');
  const [isValidating, setIsValidating] = useState(false);
  const [status, setStatus] = useState('');

  const handleSubmit = async () => {
    if (!inputValue.trim()) return;
    
    setIsValidating(true);
    setStatus('Stitching Content...');

    try {
      let finalHtml = '';
      let textContent = '';

      // --- PHASE 1: IMMEDIATE CONTENT FETCH ---
      if (mode === 'url') {
        // 🚀 PATCHED: Updated to use the new clever-action endpoint
        const apiUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/clever-action`;
        
        const headers = {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
        };

        // Fetch processed content from Supabase Edge Function
        const response = await fetch(apiUrl, {
          method: 'POST',
          headers,
          body: JSON.stringify({ url: inputValue, mode: 'html' }),
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(errorData.error || 'Could not fetch webpage');
        }
        
        const data = await response.json();
        finalHtml = data.html;
        
        // Use the cleaned text if the API provides it, otherwise strip tags from HTML
        textContent = data.text || data.html.replace(/<[^>]*>?/gm, ''); 

      } else {
        textContent = inputValue;
        finalHtml = `<html><body style="font-family: sans-serif; padding: 40px; line-height: 1.6; background: #fff; color: #000;">${inputValue}</body></html>`;
      }

      // --- PHASE 2: INSTANT OPEN ---
      // Transition the user into the reader immediately with the HTML
      onComplete(finalHtml, null);
      
      // Reset local input state
      setIsValidating(false);

      // --- PHASE 3: BACKGROUND AI PROCESSING ---
      try {
        const job = await fastapiClient.processArticle(inputValue, textContent);
        const completedJob = await fastapiClient.pollJobCompletion(job.job_id);
        
        if (completedJob.article_id) {
          const storyboard = await fastapiClient.getStoryboard(completedJob.article_id);
          
          // Upgrade the reader experience with the AI storyboard
          onStoryboardReady(storyboard);
          console.log("Narrative analysis attached successfully.");
        }
      } catch (backendError) {
        console.warn("AI Backend unreachable. Continuing in basic reader mode.");
        // Push empty storyboard to stop the loaders in the UI
        onStoryboardReady({ 
          scenes: [], 
          entities: [], 
          frames: [], 
          emotion: { primary: 'neutral', intensity: 0 } 
        });
      }

    } catch (e: any) {
      console.error('Initialization failed:', e);
      setStatus(e.message === 'Failed to fetch' ? 'CORS/Network Error' : 'Content unreachable');
      setTimeout(() => setIsValidating(false), 3000);
    }
  };

  return (
    <div className="w-full max-w-xl mx-auto space-y-8 animate-fadeSlideIn">
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
          <input
            type="url"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            placeholder="Paste article URL..."
            className="w-full bg-white/5 border-b-2 border-white/20 p-6 text-xl text-white placeholder-white/20 focus:outline-none focus:border-white transition-colors text-center font-light"
            disabled={isValidating}
          />
        ) : (
          <textarea
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            placeholder="Paste your prose here..."
            className="w-full h-48 bg-white/5 rounded-2xl p-6 text-white placeholder-slate-700 focus:outline-none focus:ring-1 focus:ring-white/20 resize-none"
            disabled={isValidating}
          />
        )}

        <button
          onClick={handleSubmit}
          disabled={!inputValue.trim() || isValidating}
          className="group w-full py-5 bg-white text-black rounded-2xl font-black text-xs uppercase tracking-[0.5em] flex items-center justify-center gap-2 hover:bg-emerald-400 transition-all active:scale-[0.98] disabled:opacity-50"
        >
          {isValidating ? (
            <>
              <Loader2 className="animate-spin" size={18} />
              <span className="ml-2">{status}</span>
            </>
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
