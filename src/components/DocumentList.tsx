import { useEffect, useState } from 'react';
import { FileText, Calendar, Trash2 } from 'lucide-react';
import { supabase, type Document } from '../lib/supabase';

interface DocumentListProps {
  onDocumentSelect: (doc: Document) => void;
}

export default function DocumentList({ onDocumentSelect }: DocumentListProps) {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [isLoading, setIsLoading] = useState(true);

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
      console.error('Error loading documents:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadDocuments();

    const subscription = supabase
      .channel('documents_changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'documents' }, () => {
        loadDocuments();
      })
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm('Delete this document? This will also remove all narrative segments.')) return;

    try {
      const { error } = await supabase.from('documents').delete().eq('id', id);
      if (error) throw error;
    } catch (error) {
      console.error('Error deleting document:', error);
      alert('Failed to delete document.');
    }
  };

  if (isLoading) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-slate-400">Loading documents...</div>
      </div>
    );
  }

  if (documents.length === 0) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-center text-slate-400">
          <FileText className="w-12 h-12 mx-auto mb-3 opacity-50" />
          <p className="text-lg mb-1">No documents yet</p>
          <p className="text-sm">Add your first text to see narrative motion</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full overflow-y-auto p-6">
      <div className="max-w-4xl mx-auto">
        <h2 className="text-2xl font-bold mb-6">Your Documents</h2>

        <div className="grid gap-4">
          {documents.map((doc) => (
            <div
              key={doc.id}
              onClick={() => onDocumentSelect(doc)}
              className="bg-slate-800 border border-slate-700 rounded-lg p-5 hover:border-emerald-500 transition-all cursor-pointer group"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-3 mb-2">
                    <FileText className="w-5 h-5 text-emerald-400 flex-shrink-0" />
                    <h3 className="text-lg font-semibold truncate group-hover:text-emerald-400 transition-colors">
                      {doc.title}
                    </h3>
                  </div>

                  <p className="text-slate-400 text-sm line-clamp-2 mb-3">
                    {doc.content}
                  </p>

                  <div className="flex items-center gap-4 text-xs text-slate-500">
                    <span className="flex items-center gap-1">
                      <Calendar className="w-3 h-3" />
                      {new Date(doc.created_at).toLocaleDateString()}
                    </span>
                    <span className="px-2 py-1 bg-slate-700 rounded capitalize">
                      {doc.source_type}
                    </span>
                  </div>
                </div>

                <button
                  onClick={(e) => handleDelete(doc.id, e)}
                  className="p-2 hover:bg-red-900/30 hover:text-red-400 rounded-lg transition-colors flex-shrink-0"
                  title="Delete"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
