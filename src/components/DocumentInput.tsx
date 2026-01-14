import React, { useState } from 'react';
import { Link, FileText, ChevronRight, Loader2 } from 'lucide-react';
import { fastapiClient } from '../services/fastapiClient';

interface DocumentInputProps {
  // onComplete now passes the final HTML and Storyboard to the App
  onComplete: (html: string, storyboard: any) => void;
}

export default function DocumentInput({ onComplete }: DocumentInputProps) {
  const [mode, setMode] = useState<'url' | 'text'>('url');
  const [inputValue, setInputValue] = useState('');
  const [isValidating, setIsValidating] = useState(false);
  const [status, setStatus] = useState('');

  const handleSubmit = async () => {
    if (!inputValue.trim()) return;
    
    setIsValidating(true);
    setStatus('Fetching Web Content...');

    try {
      let finalHtml = '';
      let textContent = '';

      if (mode === 'url') {
        // 1. Fetch HTML and Text via Supabase Edge Function
        const apiUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/fetch-webpage`;
        const headers = {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
        };

        const htmlRes = await fetch(apiUrl, {
          method: 'POST',
          headers,
          body: JSON.stringify({ url: inputValue, mode: 'html' }),
        });
        const htmlData = await htmlRes.json();
        finalHtml = htmlData.html;

        const textRes = await fetch(apiUrl, {
          method: 'POST',
          headers,
          body: JSON.stringify({ url: inputValue }),
        });
        const textData = await textRes.json();
        textContent = textData.text;
      } else {
        // Text mode: Wrap input in basic HTML structure
        textContent = inputValue;
        finalHtml = `<html><body style="font-family: sans-serif; padding: 40px; line-height: 1.6;">${inputValue}</body></html>`;
      }

      // 2. Process Narrative via FastAPI
      setStatus('Analyzing Narrative...');
      const job = await fastapiClient.processArticle(inputValue, textContent);
      const completedJob = await fastapiClient.pollJobCompletion(job.job_id, (j) => {
        if (j.progress) setStatus(`Synthesizing Visuals: ${j.progress}%`);
      });
      
      if (completedJob.article_id) {
        const storyboard = await fastapiClient.getStoryboard(completedJob.article_id);
        // 3. Send everything to the parent to open the Reader
        onComplete(finalHtml, storyboard);
      }
    } catch (e) {
      console.error('Initialization failed:', e);
      setStatus('Error: Could not reach services');
      setTimeout(() => setIsValidating(false), 2000);
    }
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
            <input
              type="url"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              placeholder="Paste article URL..."
              className="w-full bg-white/5 border-b-2 border-white/20 p-6 text-xl text-white placeholder-white/20 focus:outline-none focus:border-white transition-colors text-center font-light"
              disabled={isValidating}
            />
          </div>
        ) : (
          <textarea
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            placeholder="Paste your prose here..."
            className="w-full h-48 bg-white/5 rounded-2xl p-6 text-white placeholder-slate-700 focus:outline-none focus:ring-1 focus:ring-white/20 resize-none leading-relaxed"
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
