import React, { useState, useMemo } from 'react';
import { Search, FileText, Package, Check, Copy } from 'lucide-react';
import { QRStorage, QRItem } from '../types';
import { format } from 'date-fns';

interface NFeDashboardProps {
  storage: QRStorage;
}

export function NFeDashboard({ storage }: NFeDashboardProps) {
  const [search, setSearch] = useState('');
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const nfeItems = useMemo(() => {
    const arr: { category: string; date: string; container: string; item: QRItem; sourceData: any }[] = [];
    Object.entries(storage).forEach(([cat, dates]) => {
      if (cat.startsWith('_')) return;
      Object.entries(dates as any).forEach(([date, containers]) => {
        if (date.startsWith('_')) return;
        Object.entries(containers as any).forEach(([cont, contData]: [string, any]) => {
          if (cont.startsWith('_')) return;
          if (contData && contData.items) {
            contData.items.forEach((item: QRItem) => {
              if (item.nfeData) {
                arr.push({ category: cat, date, container: cont, item, sourceData: item.nfeData });
              }
            });
          }
        });
      });
    });
    return arr.sort((a, b) => b.item.ts - a.item.ts);
  }, [storage]);

  const filteredItems = useMemo(() => {
    if (!search) return nfeItems;
    const lower = search.toLowerCase();
    return nfeItems.filter(x => 
      x.item.t.toLowerCase().includes(lower) || 
      x.sourceData?.emitente?.nome?.toLowerCase().includes(lower) ||
      x.sourceData?.destinatario?.nome?.toLowerCase().includes(lower)
    );
  }, [nfeItems, search]);

  const handleCopy = (key: string) => {
    navigator.clipboard.writeText(key);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-500 w-full max-w-7xl mx-auto py-4">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 px-2">
        <div>
          <h2 className="text-2xl font-black tracking-tight text-slate-800">Hub NF-e</h2>
          <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mt-1">Gerenciamento Central de Notas Fiscais</p>
        </div>
        <div className="relative w-full sm:w-96">
          <input
            type="text"
            placeholder="Pesquisar por chave, emitente ou destinatário..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-300 rounded-xl text-sm font-bold shadow-sm focus:ring-2 focus:ring-blue-500 focus:outline-none transition"
          />
          <Search size={16} className="absolute left-3.5 top-3 text-slate-400" />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6 px-2">
        <div className="bg-white border text-center border-slate-200 p-5 rounded-3xl shadow-sm">
          <FileText size={24} className="mx-auto text-blue-500 mb-2" />
          <p className="text-3xl font-black text-slate-800">{nfeItems.length}</p>
          <span className="text-[10px] font-extrabold uppercase tracking-widest text-slate-400 mt-1 block">Notas Processadas</span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4 px-2">
        {filteredItems.map(({ item, sourceData, category, date, container }) => {
          const prods = sourceData?.produtos || [];
          return (
            <div key={item.t + item.ts} className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
              <div className="p-4 bg-slate-50 border-b border-slate-100 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="bg-white p-1.5 rounded-lg border border-slate-200 shadow-xs">
                    <FileText size={16} className="text-blue-500" />
                  </div>
                  <div>
                    <h3 className="text-xs font-black text-slate-700">NF-e Capturada</h3>
                    <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">{format(item.ts, "dd/MM/yyyy • HH:mm:ss")}</p>
                  </div>
                </div>
                <div className="text-right max-w-[40%]">
                  <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Origem</span>
                  <p className="text-xs font-black text-slate-600 bg-slate-200/50 px-2.5 py-1 rounded-md truncate" title={`${category} / ${container}`}>
                     {container}
                  </p>
                </div>
              </div>
              
              <div className="p-5 flex-1 flex flex-col space-y-4">
                <div>
                  <span className="text-[9px] font-black tracking-widest uppercase text-slate-400 block mb-1">Chave de Acesso</span>
                  <div className="flex items-center gap-2">
                    <p className="text-[10px] sm:text-xs font-mono font-bold text-slate-800 bg-slate-100 py-1.5 px-3 rounded-lg border border-slate-200 flex-1 break-all line-clamp-2">
                      {item.t.replace(/(.{4})/g, '$1 ').trim()}
                    </p>
                    <button 
                      onClick={() => handleCopy(item.t)}
                      className="p-2 border border-slate-200 hover:bg-slate-100 rounded-lg text-slate-500 transition shrink-0"
                      title="Copiar Chave"
                    >
                      {copiedKey === item.t ? <Check size={14} className="text-emerald-500" /> : <Copy size={14} />}
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <span className="text-[9px] font-black tracking-widest uppercase text-slate-400 block">Emitente</span>
                    <p className="text-xs font-bold text-slate-700 min-h-[2.5rem] line-clamp-2" title={sourceData?.emitente?.nome}>{sourceData?.emitente?.nome || "N/A"}</p>
                  </div>
                  <div className="space-y-1">
                    <span className="text-[9px] font-black tracking-widest uppercase text-slate-400 block">Destinatário</span>
                    <p className="text-xs font-bold text-slate-700 min-h-[2.5rem] line-clamp-2" title={sourceData?.destinatario?.nome}>{sourceData?.destinatario?.nome || "N/A"}</p>
                  </div>
                </div>

                {prods.length > 0 && (
                  <div className="mt-auto pt-4 border-t border-slate-100">
                    <div className="bg-slate-50 px-3 py-2 border border-slate-100 rounded-t-xl flex justify-between items-center">
                      <span className="text-[9px] font-black tracking-widest uppercase text-slate-500">Produtos Registrados ({prods.length})</span>
                      <span className="text-[9px] font-black tracking-widest uppercase text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                        {sourceData?.volumes || "1"} Volumes
                      </span>
                    </div>
                    <ul className="divide-y divide-slate-50 max-h-36 overflow-y-auto w-full custom-scrollbar border-x border-b border-slate-100 rounded-b-xl">
                      {prods.map((prod: any, idx: number) => (
                        <li key={idx} className="px-3 py-2 text-[10px] font-bold text-slate-600 flex justify-between">
                          <span className="truncate pr-4" title={prod.nome}>{prod.nome || "Produto Desconhecido"}</span>
                          <span className="whitespace-nowrap tabular-nums text-slate-800">{prod.qtd || "1"}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </div>
          );
        })}
        {filteredItems.length === 0 && (
          <div className="col-span-full py-16 text-center border-2 border-dashed border-slate-200 rounded-3xl mt-4">
             <Package size={32} className="mx-auto text-slate-300 mb-3" />
             <h3 className="text-slate-500 font-bold">Nenhuma nota fiscal encontrada.</h3>
             <p className="text-xs text-slate-400 mt-1">Escaneie um código de NF-e na tela de produção para visualizá-lo aqui.</p>
          </div>
        )}
      </div>
    </div>
  );
}
