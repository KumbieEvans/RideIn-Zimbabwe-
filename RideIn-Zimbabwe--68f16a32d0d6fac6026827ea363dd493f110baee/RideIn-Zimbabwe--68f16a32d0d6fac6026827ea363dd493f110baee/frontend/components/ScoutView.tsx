import React, { useState, useEffect, useRef } from 'react';
import { geminiService } from '../services/gemini';

export const ScoutView: React.FC<{ onClose: () => void }> = ({ onClose }) => {
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [response, setResponse] = useState<{text: string; grounding: any[]} | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;
    setLoading(true);
    try {
        const result = await geminiService.scout(query);
        setResponse(result);
    } catch (err) {
        setResponse({ text: "Unable to find information at this time.", grounding: [] });
    } finally {
        setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] bg-white flex flex-col animate-slide-up font-sans">
        <div className="bg-white border-b border-zinc-100 p-6 pt-12 flex justify-between items-center safe-top">
            <h1 className="text-xl font-black tracking-tight">Scout Assistant</h1>
            <button onClick={onClose} className="w-8 h-8 rounded-full bg-zinc-50 flex items-center justify-center text-zinc-400 hover:text-black transition-colors">
                <i className="fa-solid fa-xmark"></i>
            </button>
        </div>

        <div ref={scrollRef} className="flex-1 overflow-y-auto p-6 space-y-6 bg-zinc-50/50 no-scrollbar">
            {!response && !loading && (
                <div className="h-full flex flex-col items-center justify-center text-center px-12 opacity-50">
                    <div className="w-16 h-16 rounded-full bg-blue-50 text-brand-blue flex items-center justify-center mb-6">
                        <i className="fa-solid fa-compass text-2xl"></i>
                    </div>
                    <p className="text-sm font-bold text-zinc-400">Search for restaurants, landmarks, or travel tips in Zimbabwe.</p>
                </div>
            )}

            {response && (
                <div className="space-y-6 animate-fade-in pb-20">
                    <div className="bg-white border border-zinc-100 p-6 rounded-2xl shadow-sm">
                        <div className="text-[10px] font-bold text-brand-blue uppercase tracking-widest mb-4">Scout Report</div>
                        <div className="text-zinc-700 text-sm leading-relaxed whitespace-pre-line">{response.text}</div>
                    </div>
                    {response.grounding && response.grounding.length > 0 && (
                        <div className="space-y-2">
                            <p className="text-[9px] font-bold text-zinc-400 uppercase tracking-widest ml-2">Sources</p>
                            {response.grounding.map((chunk: any, i: number) => {
                                const title = chunk.maps?.title || chunk.web?.title || "View Source";
                                const uri = chunk.maps?.uri || chunk.web?.uri;
                                if (!uri) return null;
                                return (
                                    <a key={i} href={uri} target="_blank" rel="noopener noreferrer" className="flex items-center gap-4 bg-white border border-zinc-100 p-4 rounded-xl hover:bg-zinc-50 transition-colors">
                                        <i className="fa-solid fa-location-arrow text-brand-blue"></i>
                                        <span className="text-xs font-bold text-zinc-700 truncate">{title}</span>
                                    </a>
                                );
                            })}
                        </div>
                    )}
                </div>
            )}
        </div>

        <div className="p-6 bg-white border-t border-zinc-100 safe-bottom">
            <form onSubmit={handleSearch} className="relative">
                <input 
                    type="text" value={query} onChange={(e) => setQuery(e.target.value)}
                    placeholder="Ask about Zimbabwean travel..." 
                    className="w-full pl-6 pr-14 py-4 rounded-xl bg-zinc-50 border border-zinc-100 text-sm font-bold focus:outline-none focus:bg-white focus:border-black transition-all"
                />
                <button type="submit" disabled={!query || loading} className="absolute right-3 top-1/2 -translate-y-1/2 w-10 h-10 bg-black text-white rounded-lg flex items-center justify-center">
                    {loading ? <i className="fa-solid fa-circle-notch fa-spin"></i> : <i className="fa-solid fa-magnifying-glass text-xs"></i>}
                </button>
            </form>
        </div>
    </div>
  );
};