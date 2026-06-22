/**
 * Desenvolvido por José Felipe A. Barroso (pixdobarroso@gmail.com)
 */

import React, { useState, useMemo } from 'react';
import { 
  FolderOpen, 
  Trash2, 
  Edit3, 
  Plus, 
  Search, 
  Layers, 
  Barcode, 
  ArrowUpDown, 
  Check, 
  X, 
  Paintbrush,
  Sparkles,
  Play,
  RotateCcw,
  AlertCircle,
  FolderDot
} from 'lucide-react';
import { QRStorage } from '../types';
import { getCategoryColorId, COLOR_PRESETS } from '../lib/colors';
import { cn } from '../lib/utils';

interface ColetasManagerProps {
  storage: QRStorage;
  createCategory: (name: string) => Promise<boolean>;
  deleteCategory: (category: string) => Promise<boolean>;
  renameCategory: (oldName: string, newName: string) => Promise<boolean>;
  updateCategoryColor: (category: string, color: string) => Promise<boolean>;
  onSelectCategory?: (category: string) => void;
  reattributeOrphans: (originalCategory: string, targetCategory: string) => Promise<boolean>;
  deleteOrphansPermanently: (originalCategory: string) => Promise<boolean>;
}

interface OrphanGroup {
  originalCategory: string;
  containersCount: number;
  itemsCount: number;
  deletedAt: number;
  data: any[];
}

export const ColetasManager: React.FC<ColetasManagerProps> = ({
  storage,
  createCategory,
  deleteCategory,
  renameCategory,
  updateCategoryColor,
  onSelectCategory,
  reattributeOrphans,
  deleteOrphansPermanently
}) => {
  const [activeTab, setActiveTab] = useState<'coletas' | 'orfaos'>('coletas');
  
  // Coletas State
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<'name' | 'items' | 'containers'>('items');
  const [newCatName, setNewCatName] = useState('');
  const [newCatColor, setNewCatColor] = useState('blue');
  const [editingCatName, setEditingCatName] = useState<string | null>(null);
  const [editingValue, setEditingValue] = useState('');

  // Orphans State
  const [destinationTargets, setDestinationTargets] = useState<Record<string, string>>({});

  // 1. Calculate active collections
  const coletasList = useMemo(() => {
    return Object.entries(storage)
      .filter(([name]) => !name.startsWith('_'))
      .map(([name, days]) => {
        let totalItems = 0;
        let totalContainers = 0;
        const containerLabels: string[] = [];

        Object.entries(days).forEach(([dateKey, containersObj]) => {
          if (dateKey.startsWith('_')) return;
          Object.entries(containersObj).forEach(([contKey, containerVal]: [string, any]) => {
            if (contKey.startsWith('_')) return;
            totalContainers++;
            if (containerVal && Array.isArray(containerVal.items)) {
              totalItems += containerVal.items.length;
              if (contKey) containerLabels.push(`${contKey} (${containerVal.items.length})`);
            }
          });
        });

        const createdMs = (days as any)._created || null;

        return {
          name,
          totalContainers,
          totalItems,
          containerLabels,
          createdMs,
          colorPreset: getCategoryPreset(name)
        };
      });
  }, [storage]);

  // Helper to resolve presets
  function getCategoryPreset(catName: string) {
    const colorId = getCategoryColorId(catName, storage);
    return COLOR_PRESETS[colorId] || COLOR_PRESETS.blue;
  }

  // 2. Global stats
  const stats = useMemo(() => {
    const totalColetas = coletasList.length;
    const totalBips = coletasList.reduce((acc, c) => acc + c.totalItems, 0);
    const avgBips = totalColetas > 0 ? Math.round(totalBips / totalColetas) : 0;
    return { totalColetas, totalBips, avgBips };
  }, [coletasList]);

  // 3. Filtered and sorted coletas
  const filteredAndSorted = useMemo(() => {
    let result = coletasList.filter(c => 
      c.name.toLowerCase().includes(searchQuery.toLowerCase())
    );

    result.sort((a, b) => {
      if (sortBy === 'name') {
        return a.name.localeCompare(b.name);
      } else if (sortBy === 'items') {
        return b.totalItems - a.totalItems;
      } else {
        return b.totalContainers - a.totalContainers;
      }
    });

    return result;
  }, [coletasList, searchQuery, sortBy]);

  // 4. Calculate Orphans grouped by deleted category origin
  const orphans = useMemo<OrphanGroup[]>(() => {
    const rawOrphans: any[] = Array.isArray(storage._orfaos) ? (storage._orfaos as any) : [];
    const groups: Record<string, OrphanGroup> = {};

    rawOrphans.forEach(item => {
      const cat = item.originalCategory || 'Desconhecida';
      if (!groups[cat]) {
        groups[cat] = {
          originalCategory: cat,
          containersCount: 0,
          itemsCount: 0,
          deletedAt: item.deletedAt || Date.now(),
          data: []
        };
      }
      groups[cat].containersCount++;
      groups[cat].itemsCount += item.items?.length || 0;
      groups[cat].data.push(item);
    });

    return Object.values(groups).sort((a, b) => b.deletedAt - a.deletedAt);
  }, [storage._orfaos]);

  // Actions
  const handleAddNew = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = newCatName.trim();
    if (!trimmed) return;
    const success = await createCategory(trimmed);
    if (success) {
      if (newCatColor !== 'blue') {
        await updateCategoryColor(trimmed, newCatColor);
      }
      setNewCatName('');
      setNewCatColor('blue');
    }
  };

  const handleStartRename = (name: string) => {
    setEditingCatName(name);
    setEditingValue(name);
  };

  const handleSaveRename = async (oldName: string) => {
    const trimmed = editingValue.trim();
    if (!trimmed || trimmed === oldName) {
      setEditingCatName(null);
      return;
    }
    const success = await renameCategory(oldName, trimmed);
    if (success) {
      setEditingCatName(null);
    }
  };

  const handleDelete = async (name: string) => {
    if (window.confirm(`Tem certeza que deseja EXCLUIR a coleta "${name}"? Os itens associados serão movidos ao módulo "Órfãos" para recuperação futura.`)) {
      await deleteCategory(name);
    }
  };

  // Reattribute orphan to another active or newly named category
  const handleReattribute = async (origCat: string) => {
    const target = destinationTargets[origCat]?.trim();
    if (!target) {
      alert("Por favor, selecione ou digite o nome de uma coleta de destino.");
      return;
    }

    if (window.confirm(`Deseja realocar todos os itens e lotes órfãos originais de "${origCat}" para a coleta "${target}"?`)) {
      const success = await reattributeOrphans(origCat, target);
      if (success) {
        setDestinationTargets(prev => {
          const next = { ...prev };
          delete next[origCat];
          return next;
        });
      }
    }
  };

  // Permanently delete orphans from storage
  const handlePermanentDeleteOrphans = async (origCat: string) => {
    if (window.confirm(`ATENÇÃO: Você está prestes a EXCLUIR PERMANENTEMENTE os órfãos da coleta "${origCat}". Esta ação é irreversível e apagará os códigos do banco de dados definitivamente. Confirmar exclusão?`)) {
      await deleteOrphansPermanently(origCat);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Panel */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 rounded-3xl shadow-sm">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="p-2 bg-blue-50 dark:bg-blue-950/40 text-blue-650 dark:text-blue-400 rounded-xl">
              <FolderOpen size={20} className="stroke-[2.2]" />
            </span>
            <h1 className="text-xl font-black text-slate-800 dark:text-slate-100 uppercase tracking-tight">Gerenciador de Coletas</h1>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 font-bold uppercase tracking-widest pl-1">
            Controle integrado de lotes com cor temática, volumes de leitura e módulo para contingência de órfãos
          </p>
        </div>
        
        {/* Badges */}
        <div className="flex items-center gap-2.5">
          <div className="bg-slate-50 dark:bg-slate-850 border border-slate-100 dark:border-slate-800 rounded-xl px-4 py-2 text-right">
            <p className="text-[9px] font-extrabold text-slate-400 uppercase tracking-widest">Coletas Ativas</p>
            <p className="text-xl font-black text-slate-800 dark:text-slate-150 leading-none mt-1">{stats.totalColetas}</p>
          </div>
          <div className="bg-slate-50 dark:bg-slate-850 border border-slate-100 dark:border-slate-800 rounded-xl px-4 py-2 text-right">
            <p className="text-[9px] font-extrabold text-slate-400 uppercase tracking-widest">Órfãos Pendentes</p>
            <p className="text-xl font-black text-rose-500 leading-none mt-1">{orphans.length}</p>
          </div>
        </div>
      </div>

      {/* Tabs Selector row */}
      <div className="flex bg-slate-100 dark:bg-slate-950 p-1 rounded-2xl border border-slate-200/60 dark:border-slate-800 max-w-md">
        <button
          type="button"
          onClick={() => setActiveTab('coletas')}
          className={cn(
            "flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all cursor-pointer",
            activeTab === 'coletas'
              ? "bg-white dark:bg-slate-850 text-blue-600 dark:text-blue-450 shadow-3xs"
              : "text-slate-500 dark:text-slate-450 hover:text-slate-700 hover:bg-slate-50 dark:hover:bg-slate-900/40"
          )}
        >
          <FolderOpen size={14} />
          <span>Ativas e Coletas ({stats.totalColetas})</span>
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('orfaos')}
          className={cn(
            "flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all relative cursor-pointer",
            activeTab === 'orfaos'
              ? "bg-white dark:bg-slate-850 text-blue-600 dark:text-blue-450 shadow-3xs"
              : "text-slate-500 dark:text-slate-450 hover:text-slate-700 hover:bg-slate-50 dark:hover:bg-slate-900/40"
          )}
        >
          <FolderDot size={14} className={cn(orphans.length > 0 && "text-rose-500 animate-pulse")} />
          <span>Órfãos (Orfaos)</span>
          {orphans.length > 0 && (
            <span className="absolute -top-1.5 -right-1.5 bg-rose-500 text-white min-w-5 h-5 px-1.5 rounded-full text-[9px] font-black flex items-center justify-center border-2 border-white dark:border-slate-900 shadow-sm">
              {orphans.length}
            </span>
          )}
        </button>
      </div>

      {/* TAB CONTENT: ACTIVE COLETAS */}
      {activeTab === 'coletas' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Form Create */}
          <div className="lg:col-span-5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 rounded-3xl shadow-sm space-y-4">
            <div className="flex items-center gap-2">
              <Plus size={16} className="text-emerald-500 stroke-[2.5]" />
              <h3 className="text-xs font-black text-slate-800 dark:text-slate-200 uppercase tracking-wider">Criar Nova Coleta / Linagem</h3>
            </div>
            
            <form onSubmit={handleAddNew} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest">Nome da Coleta</label>
                <input 
                  type="text" 
                  value={newCatName}
                  onChange={(e) => setNewCatName(e.target.value)}
                  placeholder="Ex: Turno_A, Linha_2, Lote_Julho"
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-3 text-xs font-bold text-slate-800 dark:text-slate-100 outline-none focus:ring-2 focus:ring-blue-500/20 transition-all placeholder:text-slate-400"
                />
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest flex items-center gap-1">
                  <Paintbrush size={11} /> Cor Temática do Lote
                </label>
                <div className="grid grid-cols-6 gap-2 bg-slate-50 dark:bg-slate-950 p-2.5 rounded-xl border border-slate-150 dark:border-slate-800/80">
                  {Object.entries(COLOR_PRESETS).map(([colorId, col]) => {
                    const isCur = newCatColor === colorId;
                    return (
                      <button
                        type="button"
                        key={colorId}
                        onClick={() => setNewCatColor(colorId)}
                        title={col.name}
                        className={cn(
                          "h-8 rounded-lg transition-all relative flex items-center justify-center border border-black/5 hover:scale-105 shadow-2xs cursor-pointer",
                          col.bg,
                          isCur && "ring-2 ring-slate-400 ring-offset-2 scale-102"
                        )}
                      >
                        {isCur && <Check size={14} className="text-white drop-shadow-sm stroke-[3]" />}
                      </button>
                    );
                  })}
                </div>
              </div>

              <button
                type="submit"
                disabled={!newCatName.trim()}
                className={cn(
                  "w-full cursor-pointer py-3 rounded-xl font-black text-xs uppercase tracking-widest text-white transition-all flex items-center justify-center gap-1.5 shadow-xs",
                  newCatName.trim() 
                    ? "bg-emerald-600 hover:bg-emerald-500 active:scale-98" 
                    : "bg-slate-200 dark:bg-slate-800 text-slate-400 pointer-events-none"
                )}
              >
                <Plus size={13} className="stroke-[3]" />
                <span>Instanciar Coleta</span>
              </button>
            </form>

            {stats.totalColetas > 0 && (
              <div className="bg-slate-50/50 dark:bg-slate-950/20 rounded-2xl p-4 border border-slate-100 dark:border-slate-800/60 flex items-center gap-3">
                <Sparkles size={16} className="text-amber-500 shrink-0" />
                <div className="text-[10px] text-slate-450 dark:text-slate-400 font-medium">
                  Sua produção conta com média ponderada de <b className="text-slate-700 dark:text-slate-100">{stats.avgBips} bips</b> por coleta ativa.
                </div>
              </div>
            )}
          </div>

          {/* List active active coletas */}
          <div className="lg:col-span-7 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 rounded-3xl shadow-sm space-y-4">
            <div className="flex flex-col sm:flex-row items-center gap-3 justify-between">
              {/* Search */}
              <div className="relative w-full sm:max-w-xs">
                <input 
                  type="text" 
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Filtrar coletas por nome..."
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl pl-9 pr-4 py-2.5 text-xs font-bold text-slate-800 dark:text-slate-100 outline-none focus:ring-2 focus:ring-blue-500/20 transition-all placeholder:text-slate-400"
                />
                <Search size={14} className="absolute left-3 top-3.5 text-slate-400" />
              </div>

              {/* Sorters */}
              <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
                <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest shrink-0 flex items-center gap-1">
                  <ArrowUpDown size={11} /> Ordenar:
                </span>
                <div className="bg-slate-50 dark:bg-slate-950 border border-slate-150 dark:border-slate-800 p-1 rounded-xl flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => setSortBy('items')}
                    className={cn(
                      "text-[9px] font-black uppercase tracking-wider px-2.5 py-1.5 rounded-lg transition-all cursor-pointer",
                      sortBy === 'items' ? "bg-white dark:bg-slate-850 shadow-3xs text-blue-600 dark:text-blue-450" : "text-slate-500"
                    )}
                  >
                    Bips
                  </button>
                  <button
                    type="button"
                    onClick={() => setSortBy('containers')}
                    className={cn(
                      "text-[9px] font-black uppercase tracking-wider px-2.5 py-1.5 rounded-lg transition-all cursor-pointer",
                      sortBy === 'containers' ? "bg-white dark:bg-slate-850 shadow-3xs text-blue-600 dark:text-blue-450" : "text-slate-500"
                    )}
                  >
                    Contêineres
                  </button>
                  <button
                    type="button"
                    onClick={() => setSortBy('name')}
                    className={cn(
                      "text-[9px] font-black uppercase tracking-wider px-2.5 py-1.5 rounded-lg transition-all cursor-pointer",
                      sortBy === 'name' ? "bg-white dark:bg-slate-850 shadow-3xs text-blue-600 dark:text-blue-450" : "text-slate-500"
                    )}
                  >
                    A-Z
                  </button>
                </div>
              </div>
            </div>

            {/* List */}
            <div className="space-y-3.5 max-h-[460px] overflow-y-auto pr-2 custom-scrollbar">
              {filteredAndSorted.map((coleta) => {
                const isEditing = editingCatName === coleta.name;
                
                return (
                  <div 
                    key={coleta.name}
                    className="flex flex-col bg-slate-50/50 dark:bg-slate-950/20 border border-slate-150 dark:border-slate-805/80 rounded-2xl overflow-hidden shadow-3xs transition-transform hover:translate-x-0.5"
                  >
                    <div className={cn("h-1.5 w-full", coleta.colorPreset.bg)} />

                    <div className="p-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
                      
                      <div className="flex-1 space-y-1.5 min-w-0">
                        <div className="flex items-center gap-2.5">
                          <span className={cn("w-3 h-3 rounded-full shrink-0 border border-black/5", coleta.colorPreset.bg)} />
                          {isEditing ? (
                            <div className="flex items-center gap-1.5 max-w-sm flex-1">
                              <input 
                                type="text"
                                value={editingValue}
                                onChange={(e) => setEditingValue(e.target.value)}
                                onKeyDown={(e) => e.key === 'Enter' && handleSaveRename(coleta.name)}
                                className="bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-755 rounded-lg px-2 py-1 text-xs font-bold text-slate-800 dark:text-slate-100 outline-none focus:ring-2 focus:ring-blue-500/20 w-full"
                                autoFocus
                              />
                              <button 
                                onClick={() => handleSaveRename(coleta.name)}
                                className="p-1 bg-green-600 hover:bg-green-500 text-white rounded-md transition cursor-pointer"
                              >
                                <Check size={11} className="stroke-[3]" />
                              </button>
                              <button 
                                onClick={() => setEditingCatName(null)}
                                className="p-1 bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400 rounded-md transition cursor-pointer"
                              >
                                <X size={11} className="stroke-[3]" />
                              </button>
                            </div>
                          ) : (
                            <span className="font-extrabold text-sm text-slate-800 dark:text-slate-150 truncate max-w-xs">{coleta.name}</span>
                          )}
                        </div>

                        <div className="flex flex-wrap items-center gap-3 text-[10px] text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider">
                          <span className="flex items-center gap-1">
                            <Layers size={11} className="text-slate-450" /> {coleta.totalContainers} {coleta.totalContainers === 1 ? 'Contêiner' : 'Contêineres'}
                          </span>
                          <span className="flex items-center gap-1 px-1.5 py-0.5 bg-blue-500/10 text-blue-620 dark:text-blue-400 rounded-md">
                            <Barcode size={10} /> {coleta.totalItems} {coleta.totalItems === 1 ? 'bip' : 'bips'}
                          </span>
                        </div>

                        {coleta.containerLabels.length > 0 && !isEditing && (
                          <div className="pt-1.5 flex flex-wrap gap-1">
                            {coleta.containerLabels.slice(0, 4).map((lbl, idx) => (
                              <span key={idx} className="text-[9px] font-mono bg-slate-100 dark:bg-slate-850 px-1.5 py-0.5 rounded-md text-slate-500 dark:text-slate-400 border border-slate-150/40 dark:border-slate-800">
                                {lbl}
                              </span>
                            ))}
                            {coleta.containerLabels.length > 4 && (
                              <span className="text-[8px] font-mono bg-slate-200 dark:bg-slate-800 px-1 py-0.5 rounded-md text-slate-500 dark:text-slate-400">
                                +{coleta.containerLabels.length - 4} mais
                              </span>
                            )}
                          </div>
                        )}
                      </div>

                      <div className="flex flex-wrap md:flex-col items-start gap-2.5 shrink-0 border-t border-dashed md:border-t-0 border-slate-200/60 pt-3 md:pt-0">
                        
                        <div className="flex gap-1 items-center bg-white dark:bg-slate-900 border border-slate-150 dark:border-slate-800 px-2 py-1 rounded-xl">
                          {Object.entries(COLOR_PRESETS).slice(0, 6).map(([colorId, col]) => {
                            const isCurrent = getCategoryColorId(coleta.name, storage) === colorId;
                            return (
                              <button
                                key={colorId}
                                onClick={() => updateCategoryColor(coleta.name, colorId)}
                                title={col.name}
                                className={cn(
                                  "w-4 h-4 rounded-full transition-all hover:scale-125 select-none font-sans flex items-center justify-center border border-black/5 cursor-pointer",
                                  col.bg,
                                  isCurrent && "ring-1 ring-slate-400 ring-offset-0.5 scale-108"
                                )}
                              >
                                {isCurrent && <span className="w-1 h-1 bg-white rounded-full"></span>}
                              </button>
                            );
                          })}
                        </div>

                        <div className="flex items-center gap-1.5 w-full md:justify-end">
                          {onSelectCategory && (
                            <button
                              type="button"
                              onClick={() => onSelectCategory(coleta.name)}
                              title="Ir para esta coleta na produção"
                              className="flex items-center gap-1 text-[9px] font-black uppercase tracking-wider bg-slate-205 dark:bg-slate-800 border border-slate-205 dark:border-slate-750 text-slate-700 dark:text-slate-300 px-2 py-1 rounded-lg hover:bg-slate-300 dark:hover:bg-slate-700 cursor-pointer active:scale-95 transition"
                            >
                              <Play size={8.5} className="fill-slate-600 shrink-0 stroke-[2]" />
                              <span>Abrir</span>
                            </button>
                          )}
                          {!isEditing && (
                            <button
                              type="button"
                              onClick={() => handleStartRename(coleta.name)}
                              title="Renomear Coleta"
                              className="bg-white dark:bg-slate-900 border border-slate-150 dark:border-slate-800 text-slate-500 hover:text-slate-700 dark:text-slate-440 p-1.5 rounded-lg hover:bg-slate-100 transition duration-150 cursor-pointer"
                            >
                              <Edit3 size={12} />
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => handleDelete(coleta.name)}
                            title="Excluir Coleta"
                            className="bg-red-50 hover:bg-red-105 border border-red-100 text-red-650 p-1.5 rounded-lg transition duration-150 cursor-pointer"
                          >
                            <Trash2 size={12} />
                          </button>
                        </div>
                      </div>

                    </div>
                  </div>
                );
              })}

              {filteredAndSorted.length === 0 && (
                <div className="py-20 text-center flex flex-col items-center justify-center">
                  <Search size={32} className="text-slate-300 dark:text-slate-700 mb-2 stroke-[1.5]" />
                  <p className="text-[10px] font-black text-slate-450 dark:text-slate-500 uppercase tracking-widest">Nenhuma coleta encontrada</p>
                  <p className="text-[9px] text-slate-400 mt-0.5">Tente utilizar outro termo para pesquisar ou instancie uma nova no formulário ao lado.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* TAB CONTENT: ORPHANS MODULE (ORFAOS) */}
      {activeTab === 'orfaos' && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-sm space-y-6">
          <div className="space-y-1.5">
            <h3 className="text-sm font-black text-slate-800 dark:text-slate-100 uppercase tracking-tight flex items-center gap-2">
              <AlertCircle size={18} className="text-rose-500 shrink-0" />
              <span>Contingência de Códigos Órfãos (Orfaos)</span>
            </h3>
            <p className="text-[10px] text-slate-500 dark:text-slate-400 font-bold uppercase tracking-widest">
              Quando coletas são removidas por engano, os bips não se perdem. Você pode restaurá-los reatribuindo-os a outra coleta ou limpá-los para sempre.
            </p>
          </div>

          <div className="space-y-4">
            {orphans.map((group) => {
              const origBg = COLOR_PRESETS[getCategoryColorId(group.originalCategory, storage)]?.bg || 'bg-slate-500';
              const activeColetasNames = coletasList.map(c => c.name);

              return (
                <div 
                  key={group.originalCategory}
                  className="bg-slate-50/60 dark:bg-slate-950/20 border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-2xl p-5 space-y-4 transition-all hover:border-slate-300 dark:hover:border-slate-700"
                >
                  {/* Header info */}
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                    <div className="space-y-1 min-w-0">
                      <h4 className="text-xs font-black text-slate-800 dark:text-slate-150 uppercase tracking-wider flex items-center gap-2">
                        <span className={cn("w-2.5 h-2.5 rounded-full", origBg)} />
                        <span>Orfaos da coleta: <b className="text-rose-600 dark:text-rose-400 font-black">{group.originalCategory}</b></span>
                      </h4>
                      <p className="text-[10px] text-slate-500 dark:text-slate-400 font-bold uppercase tracking-widest">
                        Exclusão do lote original registrada em {new Date(group.deletedAt).toLocaleString('pt-BR')}
                      </p>
                    </div>

                    <div className="flex items-center gap-3 shrink-0">
                      <span className="text-[10px] font-mono font-black px-2 py-1 bg-amber-500/10 text-amber-600 rounded-lg">
                        {group.containersCount} contêiner(es)
                      </span>
                      <span className="text-[10px] font-mono font-black px-2 py-1 bg-blue-500/10 text-blue-600 rounded-lg">
                        {group.itemsCount} bip(s)
                      </span>
                    </div>
                  </div>

                  {/* Quick preview tags of the container names */}
                  <div className="flex flex-wrap gap-1.5 opacity-80 pt-1 pointer-events-none select-none">
                    {group.data.map(item => (
                      <span key={item.id} className="text-[8px] font-mono bg-slate-200/50 dark:bg-slate-850 border border-slate-200 dark:border-slate-800 px-2 py-0.5 rounded text-slate-600 dark:text-slate-400">
                        {item.containerName} ({item.items?.length} itens)
                      </span>
                    ))}
                  </div>

                  {/* Actions Grid */}
                  <div className="grid grid-cols-1 md:grid-cols-12 gap-3 pt-2.5 border-t border-dashed border-slate-200/60 dark:border-slate-800/60 items-center">
                    
                    {/* Destination input / dropdown select */}
                    <div className="md:col-span-8 flex flex-col sm:flex-row items-center gap-2">
                      <div className="w-full relative">
                        <select
                          value={destinationTargets[group.originalCategory] || ''}
                          onChange={(e) => setDestinationTargets(prev => ({ ...prev, [group.originalCategory]: e.target.value }))}
                          className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2.5 text-xs font-bold text-slate-800 dark:text-slate-100 outline-none focus:ring-2 focus:ring-blue-500/20"
                        >
                          <option value="">-- Selecione Coleta Existente --</option>
                          {activeColetasNames.map(name => (
                            <option key={name} value={name}>{name}</option>
                          ))}
                        </select>
                      </div>

                      <div className="text-slate-400 font-bold text-xs uppercase px-1">ou</div>

                      <div className="w-full">
                        <input 
                          type="text"
                          value={destinationTargets[group.originalCategory] || ''}
                          onChange={(e) => setDestinationTargets(prev => ({ ...prev, [group.originalCategory]: e.target.value }))}
                          placeholder="Nova de Coleta destino..."
                          className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-3.5 py-2 text-xs font-bold text-slate-800 dark:text-slate-100 outline-none focus:ring-2 focus:ring-blue-500/20 placeholder:text-slate-400"
                        />
                      </div>
                    </div>

                    {/* Submit Buttons */}
                    <div className="md:col-span-4 flex items-center justify-end gap-2 w-full">
                      <button
                        type="button"
                        onClick={() => handleReattribute(group.originalCategory)}
                        disabled={!destinationTargets[group.originalCategory]?.trim()}
                        className={cn(
                          "flex-1 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest text-white transition flex items-center justify-center gap-1 shadow-3xs cursor-pointer",
                          destinationTargets[group.originalCategory]?.trim()
                            ? "bg-blue-600 hover:bg-blue-500 active:scale-95"
                            : "bg-slate-200 dark:bg-slate-800 text-slate-400 pointer-events-none"
                        )}
                      >
                        <RotateCcw size={11} className="stroke-[2.5]" />
                        <span>Reatribuir</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => handlePermanentDeleteOrphans(group.originalCategory)}
                        className="p-2.5 bg-red-50 hover:bg-red-100 border border-red-150 text-red-650 rounded-xl text-[10px] font-black uppercase tracking-widest transition duration-150 flex items-center justify-center gap-1 cursor-pointer active:scale-95"
                        title="Deletar Permanentemente"
                      >
                        <Trash2 size={12} />
                        <span className="hidden sm:inline">Apagar Definitivo</span>
                      </button>
                    </div>

                  </div>
                </div>
              );
            })}

            {orphans.length === 0 && (
              <div className="py-24 text-center border-2 border-dashed border-slate-250 dark:border-slate-800 rounded-3xl bg-slate-50/30">
                <FolderDot size={44} className="text-slate-300 dark:text-slate-700 mx-auto stroke-[1.2] mb-3" />
                <h4 className="text-xs font-black text-slate-450 dark:text-slate-500 uppercase tracking-widest">Nenhum Registro Órfão Encontrado</h4>
                <p className="text-[10px] text-slate-400 max-w-sm mx-auto mt-1 font-medium">
                  Atualmente todos os bips lidos pertencem a coletas ativas. Caso remova alguma coleta em sua produção, contêineres e códigos serão preservados aqui.
                </p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
