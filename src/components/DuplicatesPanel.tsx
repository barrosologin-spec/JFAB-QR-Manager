/**
 * Desenvolvido por José Felipe A. Barroso (pixdobarroso@gmail.com)
 */

import { useState, useMemo } from 'react';
import { LayoutGrid, Filter, AlertTriangle, ExternalLink, Calendar, MapPin, Archive, Clock } from 'lucide-react';
import { QRStorage, QRItem } from '../types';
import { cn } from '../lib/utils';

interface DuplicatesPanelProps {
  storage: QRStorage;
  onNavigate: (cat: string, date: string, cont: string) => void;
  onArchiveAll: () => void;
}

export function DuplicatesPanel({ storage, onNavigate, onArchiveAll }: DuplicatesPanelProps) {
  const [filter, setFilter] = useState('');

  const duplicates = useMemo(() => {
    const list: Array<{
      item: QRItem;
      category: string;
      date: string;
      container: string;
    }> = [];

    Object.entries(storage).forEach(([cat, days]) => {
      if (cat.startsWith('_')) return;
      Object.entries(days as any).forEach(([date, containers]) => {
        if (date.startsWith('_')) return;
        Object.entries(containers as any).forEach(([cont, data]: [string, any]) => {
          if (cont.startsWith('_')) return;
          if (data && data.items) {
            data.items.forEach((item: QRItem) => {
              if (item.duplicate && !item.archived) {
                if (!filter || item.t.toLowerCase().includes(filter.toLowerCase())) {
                  list.push({ item, category: cat, date, container: cont });
                }
              }
            });
          }
        });
      });
    });

    return list.sort((a, b) => b.item.ts - a.item.ts);
  }, [storage, filter]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-orange-100 text-orange-600 rounded-2xl flex items-center justify-center shadow-sm">
            <AlertTriangle size={24} />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-slate-800">Duplicados Detectados</h2>
            <p className="text-sm text-slate-500 font-medium">Relatório de itens registrados mais de uma vez no sistema</p>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
          {duplicates.length > 0 && (
            <button
              onClick={onArchiveAll}
              className="px-5 py-2.5 bg-orange-600 hover:bg-orange-700 text-white font-bold rounded-2xl text-xs uppercase tracking-wider shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2 active:scale-95"
            >
              <Archive size={16} />
              Arquivar Todos
            </button>
          )}

          <div className="flex items-center gap-3 bg-white border border-slate-200 rounded-2xl px-4 py-2.5 focus-within:ring-2 focus-within:ring-orange-500/20 transition-all min-w-[280px]">
            <Filter size={18} className="text-slate-400" />
            <input 
              type="text"
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              placeholder="Filtrar por código..."
              className="flex-1 bg-transparent outline-none text-sm font-semibold text-slate-700"
            />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        {duplicates.map((dup, idx) => (
          <div key={idx} className="bg-white rounded-3xl border border-orange-100 shadow-sm overflow-hidden flex flex-col hover:border-orange-200 transition-colors">
            <div className="p-6 bg-orange-50/30">
              <div className="flex items-start justify-between mb-2">
                <span className="px-3 py-1 bg-white border border-orange-200 text-orange-600 text-[10px] font-bold uppercase tracking-widest rounded-full">Deteção Automática</span>
                <button 
                  onClick={() => onNavigate(dup.category, dup.date, dup.container)}
                  className="p-2 text-orange-600 hover:bg-white rounded-xl shadow-sm transition-all"
                >
                  <ExternalLink size={18} />
                </button>
              </div>
              <h3 className="text-xl font-black text-slate-900 mb-1 leading-tight break-all">{dup.item.t}</h3>
              <p className="text-[10px] text-slate-400 font-mono italic">Duplicado em: {new Date(dup.item.ts).toLocaleString()}</p>
            </div>

            <div className="p-6 space-y-4 flex-1">
              <div className="space-y-3">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-1">Registrado Originalmente em:</p>
                <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 space-y-2.5">
                  <div className="flex items-center gap-2 text-xs font-bold text-slate-700">
                    <Calendar size={14} className="text-slate-400" />
                    <span>{dup.item.original?.date}</span>
                  </div>
                  <div className="flex items-center gap-2 text-xs font-bold text-slate-700">
                    <MapPin size={14} className="text-slate-400" />
                    <span className="truncate">{dup.item.original?.container}</span>
                  </div>
                  {dup.item.original?.ts && (
                    <div className="flex items-start gap-2 text-xs font-bold text-orange-600 bg-orange-50/50 p-2 rounded-xl border border-orange-100/50">
                      <Clock size={14} className="text-orange-500 shrink-0 mt-0.5" />
                      <div>
                        <div className="text-[9px] uppercase tracking-wider text-orange-500">Primeira Leitura</div>
                        <div>{new Date(dup.item.original.ts).toLocaleString()}</div>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <div className="pt-4 border-t border-slate-50 flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 font-bold text-[10px]">
                  ID
                </div>
                <div>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Coleta Atual</p>
                  <p className="text-xs font-black text-slate-700">{dup.category} / {dup.container}</p>
                </div>
              </div>
            </div>
          </div>
        ))}

        {duplicates.length === 0 && (
          <div className="col-span-full bg-white rounded-3xl border border-gray-100 shadow-sm p-16 text-center text-gray-400 flex flex-col items-center">
            <LayoutGrid size={64} className="mb-4 opacity-5" />
            <p className="text-xl font-bold">Nenhuma duplicata encontrada</p>
            <p className="text-sm mt-2 font-medium opacity-60">O sistema está limpo! Bom trabalho.</p>
          </div>
        )}
      </div>
    </div>
  );
}
