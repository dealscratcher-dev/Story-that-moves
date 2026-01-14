import { useState } from 'react';
import { FileText, Loader2 } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { analyzeNarrative, splitIntoSegments } from '../utils/narrativeAnalyzer';

interface DocumentInputProps {
  onDocumentCreated: () => void;
}

export default function DocumentInput({ onDocumentCreated }: DocumentInputProps) {
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [sourceType, setSourceType] = useState('article');
  const [isProcessing, setIsProcessing] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !content.trim()) return;

    setIsProcessing(true);

    try {
      const { data: document, error: docError } = await supabase
        .from('documents')
        .insert({
          title: title.trim(),
          content: content.trim(),
          source_type: sourceType,
          updated_at: new Date().toISOString()
        })
        .select()
        .single();

      if (docError) throw docError;

      const segments = splitIntoSegments(content);
      const narrativeSegments = segments.map((segment, index) => {
        const analysis = analyzeNarrative(segment);
        return {
          document_id: document.id,
          segment_index: index,
          text_content: segment,
          emotion_tone: analysis.emotion,
          intensity: analysis.intensity,
          motion_type: analysis.motion
        };
      });

      const { error: segError } = await supabase
        .from('narrative_segments')
        .insert(narrativeSegments);

      if (segError) throw segError;

      setTitle('');
      setContent('');
      setSourceType('article');
      onDocumentCreated();
    } catch (error) {
      console.error('Error creating document:', error);
      alert('Failed to create document. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="h-full overflow-y-auto p-6">
      <div className="max-w-3xl mx-auto">
        <div className="flex items-center gap-3 mb-6">
          <FileText className="w-6 h-6 text-emerald-400" />
          <h2 className="text-2xl font-bold">Add New Content</h2>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label htmlFor="title" className="block text-sm font-medium text-slate-300 mb-2">
              Title
            </label>
            <input
              id="title"
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Enter document title..."
              className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent text-white placeholder-slate-500"
              required
            />
          </div>

          <div>
            <label htmlFor="sourceType" className="block text-sm font-medium text-slate-300 mb-2">
              Content Type
            </label>
            <select
              id="sourceType"
              value={sourceType}
              onChange={(e) => setSourceType(e.target.value)}
              className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent text-white"
            >
              <option value="article">Article</option>
              <option value="journal">Journal Entry</option>
              <option value="book">Book Chapter</option>
              <option value="essay">Essay</option>
              <option value="story">Story</option>
              <option value="blog">Blog Post</option>
            </select>
          </div>

          <div>
            <label htmlFor="content" className="block text-sm font-medium text-slate-300 mb-2">
              Content
            </label>
            <textarea
              id="content"
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Paste your text content here... StitchQylt will analyze the narrative and add intelligent motion."
              rows={16}
              className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent text-white placeholder-slate-500 resize-none"
              required
            />
          </div>

          <button
            type="submit"
            disabled={isProcessing}
            className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-700 disabled:cursor-not-allowed text-white font-semibold rounded-lg transition-colors flex items-center justify-center gap-2"
          >
            {isProcessing ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                Processing Narrative...
              </>
            ) : (
              'Create & Analyze'
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
