/**
 * Desenvolvido por José Felipe A. Barroso (pixdobarroso@gmail.com)
 */

import { useState, useMemo } from 'react';
import { Search, MapPin, Calendar, Box, ExternalLink } from 'lucide-react';
import { QRStorage, QRItem } from '../types';
import { format } from 'date-fns';

interface GlobalSearchProps {
  storage: QRStorage;
  onNavigate: (cat: string, date: string, cont: string) => void;
}

export function GlobalSearch({ storage, onNavigate }: GlobalSearchProps) {
  const [query, setQuery] = useState('');

  const results = useMemo(() => {
    if (query.length < 3) return [];
    
    const matches: Array<{
      item: QRItem;
      category: string;
      date: string;
      container: string;
    }> = [];

    const lowerQuery = query.toLowerCase();

    Object.entries(storage).forEach(([cat, days]) => {
      if (cat.startsWith('_')) return;
      Object.entries(days as any).forEach(([date, containers]) => {
        if (date.startsWith('_')) return;
        Object.entries(containers as any).forEach(([cont, data]: [string, any]) => {
          if (cont.startsWith('_')) return;
          if (data && data.items) {
            data.items.forEach((item: QRItem) => {
              if (item.t.toLowerCase().includes(lowerQuery)) {
                matches.push({ item, category: cat, date, container: cont });
              }
            });
          }
        });
      });
    });

    return matches.sort((a, b) => b.item.ts - a.item.ts);
  }, [storage, query]);

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-3xl border border-blue-100 shadow-sm overflow-hidden p-6">
        <div className="flex items-center gap-4 bg-slate-50 border border-slate-200 rounded-2xl px-5 py-4 focus-within:ring-2 focus-within:ring-blue-500/20 transition-all">
          <Search size={22} className="text-slate-400" />
          <input 
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar por código, etiqueta ou ID..."
            className="flex-1 bg-transparent outline-none font-medium text-slate-700 placeholder:text-slate-400"
          />
        </div>
        {query && query.length < 3 && (
          <p className="mt-3 text-xs text-slate-400 px-1 italic">Digite pelo menos 3 caracteres para pesquisar...</p>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {results.map((res, idx) => (
          <div key={idx} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 hover:shadow-md transition-shadow group">
            <div className="flex items-start justify-between mb-4">
              <div className="flex-1 min-w-0">
                <p className="text-lg font-bold text-slate-900 truncate mb-1">{res.item.t}</p>
                <p className="text-[10px] text-slate-400 font-mono">{new Date(res.item.ts).toLocaleString()}</p>
              </div>
              <button 
                onClick={() => onNavigate(res.category, res.date, res.container)}
                className="p-2 text-blue-600 hover:bg-blue-50 rounded-xl transition-colors"
                title="Ver no painel"
              >
                <ExternalLink size={20} />
              </button>
            </div>

            <div className="space-y-2 pt-4 border-t border-slate-50">
              <div className="flex items-center gap-2 text-xs font-semibold text-slate-600">
                <MapPin size={14} className="text-slate-400" />
                <span className="truncate">{res.category}</span>
              </div>
              <div className="flex items-center gap-2 text-xs font-semibold text-slate-600">
                <Calendar size={14} className="text-slate-400" />
                <span>{res.date}</span>
              </div>
              <div className="flex items-center gap-2 text-xs font-semibold text-slate-600">
                <Box size={14} className="text-slate-400" />
                <span className="px-2 py-0.5 bg-slate-100 rounded-md truncate">{res.container}</span>
              </div>
            </div>
          </div>
        ))}
      </div>

      {query.length >= 3 && results.length === 0 && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-12 text-center text-gray-400 flex flex-col items-center">
          <Search size={48} className="mb-4 opacity-10" />
          <p className="text-lg font-medium italic">Nenhum resultado encontrado para "{query}"</p>
        </div>
      )}
    </div>
  );
}
