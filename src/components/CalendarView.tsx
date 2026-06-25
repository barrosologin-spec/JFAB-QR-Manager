/**
 * Desenvolvido por José Felipe A. Barroso (pixdobarroso@gmail.com)
 */

import {useState, useMemo, useEffect} from 'react';
import {
  ChevronLeft,
  ChevronRight,
  Calendar as CalendarIcon,
  Search,
  Copy,
  Check,
  FolderOpen,
  Clock,
  X,
  FileText,
  ChevronDown,
  ChevronUp,
  Filter,
  Sparkles,
  Layers,
  Database
} from 'lucide-react';
import {format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isSameDay, getDay, addMonths, subMonths} from 'date-fns';
import {ptBR} from 'date-fns/locale';
import {QRStorage, QRItem} from '../types';
import {cn} from '../lib/utils';
import {Modal} from './Modal';

interface ColorPreset {
  bg: string;
  text: string;
  border: string;
  dot: string;
  badge: string;
  hover: string;
}

const COLOR_PRESETS: ColorPreset[] = [
  { 
    bg: 'bg-emerald-50 dark:bg-emerald-950/20', 
    text: 'text-emerald-700 dark:text-emerald-300', 
    border: 'border-emerald-100 dark:border-emerald-900/30', 
    dot: 'bg-emerald-500', 
    badge: 'bg-emerald-100 dark:bg-emerald-900/50 text-emerald-800 dark:text-emerald-200',
    hover: 'hover:bg-emerald-100/70 dark:hover:bg-emerald-950/40'
  },
  { 
    bg: 'bg-amber-50 dark:bg-amber-950/20', 
    text: 'text-amber-700 dark:text-amber-300', 
    border: 'border-amber-100 dark:border-amber-900/30', 
    dot: 'bg-amber-500', 
    badge: 'bg-amber-100 dark:bg-amber-900/50 text-amber-800 dark:text-amber-200',
    hover: 'hover:bg-amber-100/70 dark:hover:bg-amber-950/40'
  },
  { 
    bg: 'bg-blue-50 dark:bg-blue-950/20', 
    text: 'text-blue-700 dark:text-blue-300', 
    border: 'border-blue-100 dark:border-blue-900/30', 
    dot: 'bg-blue-500', 
    badge: 'bg-blue-100 dark:bg-blue-900/50 text-blue-800 dark:text-blue-200',
    hover: 'hover:bg-blue-100/70 dark:hover:bg-blue-950/40'
  },
  { 
    bg: 'bg-purple-50 dark:bg-purple-950/20', 
    text: 'text-purple-700 dark:text-purple-300', 
    border: 'border-purple-100 dark:border-purple-900/30', 
    dot: 'bg-purple-500', 
    badge: 'bg-purple-100 dark:bg-purple-900/50 text-purple-800 dark:text-purple-200',
    hover: 'hover:bg-purple-100/70 dark:hover:bg-purple-950/40'
  },
  { 
    bg: 'bg-rose-50 dark:bg-rose-950/20', 
    text: 'text-rose-700 dark:text-rose-300', 
    border: 'border-rose-100 dark:border-rose-900/30', 
    dot: 'bg-rose-500', 
    badge: 'bg-rose-100 dark:bg-rose-900/50 text-rose-800 dark:text-rose-200',
    hover: 'hover:bg-rose-100/70 dark:hover:bg-rose-950/40'
  },
  { 
    bg: 'bg-cyan-50 dark:bg-cyan-950/20', 
    text: 'text-cyan-700 dark:text-cyan-300', 
    border: 'border-cyan-100 dark:border-cyan-900/30', 
    dot: 'bg-cyan-500', 
    badge: 'bg-cyan-100 dark:bg-cyan-900/50 text-cyan-800 dark:text-cyan-200',
    hover: 'hover:bg-cyan-100/70 dark:hover:bg-cyan-950/40'
  },
  { 
    bg: 'bg-orange-50 dark:bg-orange-950/20', 
    text: 'text-orange-700 dark:text-orange-300', 
    border: 'border-orange-100 dark:border-orange-900/30', 
    dot: 'bg-orange-500', 
    badge: 'bg-orange-100 dark:bg-orange-900/50 text-orange-800 dark:text-orange-200',
    hover: 'hover:bg-orange-100/70 dark:hover:bg-orange-950/40'
  },
  { 
    bg: 'bg-indigo-50 dark:bg-indigo-950/20', 
    text: 'text-indigo-700 dark:text-indigo-300', 
    border: 'border-indigo-100 dark:border-indigo-900/30', 
    dot: 'bg-indigo-500', 
    badge: 'bg-indigo-100 dark:bg-indigo-900/50 text-indigo-800 dark:text-indigo-200',
    hover: 'hover:bg-indigo-100/70 dark:hover:bg-indigo-950/40'
  },
  { 
    bg: 'bg-fuchsia-50 dark:bg-fuchsia-950/20', 
    text: 'text-fuchsia-700 dark:text-fuchsia-300', 
    border: 'border-fuchsia-100 dark:border-fuchsia-900/30', 
    dot: 'bg-fuchsia-500', 
    badge: 'bg-fuchsia-100 dark:bg-fuchsia-900/50 text-fuchsia-800 dark:text-fuchsia-200',
    hover: 'hover:bg-fuchsia-100/70 dark:hover:bg-fuchsia-950/40'
  },
  { 
    bg: 'bg-sky-50 dark:bg-sky-950/20', 
    text: 'text-sky-700 dark:text-sky-300', 
    border: 'border-sky-100 dark:border-sky-900/30', 
    dot: 'bg-sky-500', 
    badge: 'bg-sky-100 dark:bg-sky-900/50 text-sky-800 dark:text-sky-200',
    hover: 'hover:bg-sky-100/70 dark:hover:bg-sky-950/40'
  },
];

export function getCategoryColor(categoryName: string): ColorPreset {
  let hash = 0;
  for (let i = 0; i < categoryName.length; i++) {
    hash = categoryName.charCodeAt(i) + ((hash << 5) - hash);
  }
  const index = Math.abs(hash) % COLOR_PRESETS.length;
  return COLOR_PRESETS[index];
}

interface CalendarViewProps {
  storage: QRStorage;
}

export function CalendarView({storage}: CalendarViewProps) {
  const [currentMonth, setCurrentMonth] = useState(new Date());

  // Modal & Selection state for Day Details
  const [selectedDay, setSelectedDay] = useState<Date | null>(null);
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [expandedContainers, setExpandedContainers] = useState<{[key: string]: boolean}>({});

  const days = useMemo(() => {
    const start = startOfMonth(currentMonth);
    const end = endOfMonth(currentMonth);
    return eachDayOfInterval({start, end});
  }, [currentMonth]);

  const monthStats = useMemo(() => {
    const stats: {[key: string]: {total: number, cats: {[cat: string]: number}}} = {};
    
    Object.entries(storage).forEach(([cat, catObj]) => {
      if (cat.startsWith('_')) return;
      
      Object.entries(catObj as any).forEach(([dateStr, dateObj]) => {
        if (dateStr.startsWith('_')) return;
        
        let dayTotal = 0;
        Object.values(dateObj as any).forEach((cont: any) => {
          if (cont && typeof cont === 'object' && cont.items) {
            dayTotal += cont.items.length || 0;
          }
        });

        if (!stats[dateStr]) stats[dateStr] = {total: 0, cats: {}};
        stats[dateStr].total += dayTotal;
        stats[dateStr].cats[cat] = (stats[dateStr].cats[cat] || 0) + dayTotal;
      });
    });
    return stats;
  }, [storage]);

  const monthTotal = useMemo(() => {
    let total = 0;
    Object.keys(monthStats).forEach(dateStr => {
      const d = new Date(dateStr + 'T00:00:00');
      if (isSameMonth(d, currentMonth)) {
        total += monthStats[dateStr].total;
      }
    });
    return total;
  }, [monthStats, currentMonth]);

  const grandTotal = useMemo(() => {
    let total = 0;
    Object.values(monthStats).forEach((s: {total: number}) => total += s.total);
    return total;
  }, [monthStats]);

  const startDay = getDay(startOfMonth(currentMonth));
  const paddingDays = Array.from({length: startDay}, (_, i) => i);

  // Triggered when a calendar day cell is clicked
  const handleDayClick = (day: Date, categoryFilter: string | null = null) => {
    setSelectedDay(day);
    setSelectedCategoryFilter(categoryFilter);
    setSearchQuery('');
    setIsModalOpen(true);
  };

  // Resolve detailed data for selected day
  const dayData = useMemo(() => {
    if (!selectedDay) return null;
    const dateStr = format(selectedDay, 'yyyy-MM-dd');
    
    const results: {
      category: string;
      color: ColorPreset;
      containers: {
        name: string;
        finalized: boolean;
        items: QRItem[];
      }[];
    }[] = [];

    Object.entries(storage).forEach(([cat, catObj]) => {
      if (cat.startsWith('_')) return;
      const dateObj = (catObj as any)[dateStr];
      if (dateObj) {
        const color = getCategoryColor(cat);
        const containers: typeof results[0]['containers'] = [];
        
        Object.entries(dateObj as any).forEach(([contName, contVal]: [string, any]) => {
          if (contName.startsWith('_')) return;
          if (contVal && typeof contVal === 'object') {
            containers.push({
              name: contName,
              finalized: !!contVal.finalized,
              items: contVal.items || [],
            });
          }
        });

        if (containers.length > 0) {
          results.push({
            category: cat,
            color,
            containers,
          });
        }
      }
    });

    return results;
  }, [selectedDay, storage]);

  const selectedDayStr = selectedDay ? format(selectedDay, 'yyyy-MM-dd') : '';

  // Auto-expand accordions if total containers is low
  useEffect(() => {
    if (dayData && isModalOpen) {
      const totalContainers = dayData.reduce((acc, cat) => acc + cat.containers.length, 0);
      if (totalContainers <= 3) {
        const initialExpanded: {[key: string]: boolean} = {};
        dayData.forEach(cat => {
          cat.containers.forEach(cont => {
            initialExpanded[`${cat.category}-${cont.name}`] = true;
          });
        });
        setExpandedContainers(initialExpanded);
      } else {
        setExpandedContainers({});
      }
    }
  }, [selectedDayStr, isModalOpen]);

  // Aggregate day statistics
  const dayStats = useMemo(() => {
    if (!dayData) return { total: 0, containers: 0, finalized: 0, pending: 0 };
    let total = 0;
    let containers = 0;
    let finalized = 0;
    let pending = 0;
    
    dayData.forEach(cat => {
      cat.containers.forEach(cont => {
        total += cont.items.length;
        containers++;
        if (cont.finalized) finalized++;
        else pending++;
      });
    });
    
    return { total, containers, finalized, pending };
  }, [dayData]);

  // Find active categories in selected day for custom filter row
  const { activeCategories, activeCategoriesCounts } = useMemo(() => {
    if (!dayData) return { activeCategories: [], activeCategoriesCounts: {} };
    const categories: string[] = [];
    const counts: {[cat: string]: number} = {};
    
    dayData.forEach(cat => {
      categories.push(cat.category);
      let catTotal = 0;
      cat.containers.forEach(cont => {
        catTotal += cont.items.length;
      });
      counts[cat.category] = catTotal;
    });
    
    return { activeCategories: categories, activeCategoriesCounts: counts };
  }, [dayData]);

  // Multi-level filtering based on categories pill filter and general search query
  const filteredData = useMemo(() => {
    if (!dayData) return [];
    
    return dayData
      .map(catGroup => {
        if (selectedCategoryFilter && catGroup.category !== selectedCategoryFilter) {
          return null;
        }

        const filteredContainers = catGroup.containers
          .map(container => {
            const matchesContainerName = container.name.toLowerCase().includes(searchQuery.toLowerCase());
            const filteredItems = container.items.filter(item => {
              const matchesText = item.t.toLowerCase().includes(searchQuery.toLowerCase());
              return matchesText || matchesContainerName;
            });

            if (matchesContainerName || filteredItems.length > 0) {
              return {
                ...container,
                items: filteredItems,
              };
            }
            return null;
          })
          .filter(Boolean) as typeof catGroup.containers;

        if (filteredContainers.length > 0) {
          return {
            ...catGroup,
            containers: filteredContainers,
          };
        }
        return null;
      })
      .filter(Boolean) as typeof dayData;
  }, [dayData, selectedCategoryFilter, searchQuery]);

  const toggleContainer = (containerKey: string) => {
    setExpandedContainers(prev => ({
      ...prev,
      [containerKey]: !prev[containerKey]
    }));
  };

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(text);
    setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <div className="mt-12 pt-8 border-t border-gray-200 dark:border-slate-800 animate-in slide-in-from-bottom duration-500">
      <div className="flex flex-col md:flex-row justify-between items-center gap-4 mb-8">
        <h2 className="text-2xl font-bold text-gray-800 dark:text-slate-100 flex items-center gap-2">
          <CalendarIcon className="text-indigo-600 dark:text-indigo-400" />
          Calendário de Produção
        </h2>
        
        <div className="flex items-center gap-2 bg-white dark:bg-slate-900 p-1 rounded-xl shadow-sm border border-gray-200 dark:border-slate-800">
          <button 
            onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
            className="p-2 hover:bg-gray-100 dark:hover:bg-slate-800 rounded-lg transition text-slate-500 dark:text-slate-400 cursor-pointer"
          >
            <ChevronLeft size={20} />
          </button>
          <span className="font-bold text-lg w-42 text-center text-gray-700 dark:text-slate-300 capitalize">
            {format(currentMonth, 'MMMM yyyy', {locale: ptBR})}
          </span>
          <button 
            onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
            className="p-2 hover:bg-gray-100 dark:hover:bg-slate-800 rounded-lg transition text-slate-500 dark:text-slate-400 cursor-pointer"
          >
            <ChevronRight size={20} />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        <div className="p-6 bg-gradient-to-br from-indigo-500 to-indigo-700 dark:from-indigo-600 dark:to-indigo-850 rounded-2xl shadow-lg text-white">
          <p className="text-indigo-100 dark:text-indigo-200 font-semibold text-xs uppercase tracking-wider">Total Geral de QR Codes</p>
          <p className="text-4xl font-black mt-2 tracking-tight">{grandTotal}</p>
          <p className="text-[10px] text-indigo-200/80 mt-1.5 flex items-center gap-1.5 font-medium">
            <Layers size={12} />
            Acumulado em toda a base histórica
          </p>
        </div>
        <div className="p-6 bg-gradient-to-br from-blue-500 to-blue-700 dark:from-blue-600 dark:to-blue-850 rounded-2xl shadow-lg text-white">
          <p className="text-blue-100 dark:text-blue-200 font-semibold text-xs uppercase tracking-wider">Total neste Mês</p>
          <p className="text-4xl font-black mt-2 tracking-tight">{monthTotal}</p>
          <p className="text-[10px] text-blue-200/80 mt-1.5 flex items-center gap-1.5 font-medium capitalize">
            <Sparkles size={12} strokeWidth={2.5} />
            Produção de {format(currentMonth, 'MMMM', {locale: ptBR})}
          </p>
        </div>
      </div>

      {/* Main Grid Calendar Panel */}
      <div className="bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-sm">
        <div className="grid grid-cols-7 bg-gray-50 dark:bg-slate-900/50 border-b border-gray-200 dark:border-slate-800">
          {['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'].map(d => (
            <div key={d} className="py-3 text-center text-xs font-bold text-gray-500 dark:text-slate-400 uppercase tracking-wider">{d}</div>
          ))}
        </div>
        
        <div className="grid grid-cols-7 bg-gray-100 dark:bg-slate-800 gap-px">
          {paddingDays.map(i => (
            <div key={`p-${i}`} className="bg-gray-55/50 dark:bg-slate-900/40 h-32" />
          ))}
          
          {days.map(day => {
            const dateStr = format(day, 'yyyy-MM-dd');
            const data = monthStats[dateStr];
            const isToday = isSameDay(day, new Date());
            
            return (
              <div 
                key={dateStr}
                onClick={() => handleDayClick(day, null)}
                className={cn(
                  "bg-white dark:bg-slate-900 h-32 p-2 flex flex-col transition-colors group relative cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/40",
                  isToday && "bg-blue-50/50 dark:bg-blue-950/25 ring-1 ring-inset ring-blue-200 dark:ring-blue-800"
                )}
              >
                <div className="flex justify-between items-center mb-1">
                  <span className={cn(
                    "text-xs font-bold",
                    data ? "text-slate-800 dark:text-slate-100" : "text-gray-400 dark:text-slate-600",
                    isToday && "bg-blue-600 text-white dark:bg-blue-500 w-6 h-6 flex items-center justify-center rounded-full text-xs font-bold shadow-sm"
                  )}>
                    {format(day, 'd')}
                  </span>
                  {data && data.total > 0 && (
                    <span className="text-[9px] font-bold text-slate-400 dark:text-slate-500 group-hover:text-slate-600 dark:group-hover:text-slate-300 transition-colors">
                      {data.total} u.
                    </span>
                  )}
                </div>
                
                {data ? (
                  <div className="mt-1 flex-1 overflow-y-auto space-y-1 custom-scrollbar pb-3">
                    {Object.entries(data.cats).map(([cat, count]) => {
                      const color = getCategoryColor(cat);
                      return (
                        <div 
                          key={cat} 
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDayClick(day, cat);
                          }}
                          className={cn(
                            "flex justify-between items-center text-[10px] px-1.5 py-0.5 rounded border transition-colors cursor-pointer",
                            color.bg,
                            color.text,
                            color.border,
                            color.hover
                          )}
                          title={`Ver detalhes de ${cat} neste dia`}
                        >
                          <span className="truncate max-w-[55px] font-medium">{cat}</span>
                          <span className="font-bold">{count}</span>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="flex-1 flex items-center justify-center text-gray-200 dark:text-slate-800 text-xs">-</div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Polish Indicator footer for Calendar Colors */}
      <div className="mt-4 flex flex-wrap gap-4 items-center justify-center text-xs text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-slate-900/40 p-3 rounded-xl border border-gray-100 dark:border-slate-800">
        <span className="font-semibold flex items-center gap-1.5 shrink-0 text-slate-700 dark:text-slate-300">
          <Filter size={14} className="text-indigo-500" />
          Legenda de Cores:
        </span>
        <div className="flex flex-wrap gap-3">
          {Object.keys(storage)
            .filter(cat => !cat.startsWith('_'))
            .map(cat => {
              const color = getCategoryColor(cat);
              return (
                <div key={cat} className="flex items-center gap-1.5">
                  <span className={cn("w-2 h-2 rounded-full", color.dot)}></span>
                  <span className="font-medium text-slate-600 dark:text-slate-300">{cat}</span>
                </div>
              );
            })}
        </div>
      </div>

      {/* Production Details Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={selectedDay ? `Detalhes de Produção: ${format(selectedDay, "dd 'de' MMMM 'de' yyyy", {locale: ptBR})}` : 'Detalhes de Produção'}
        className="max-w-2xl dark:bg-slate-900"
      >
        {selectedDay && dayData && dayData.length > 0 ? (
          <div className="space-y-4">
            {/* Quick Stats Grid */}
            <div className="grid grid-cols-4 gap-2.5 bg-slate-50 dark:bg-slate-900/60 p-3 rounded-xl border border-gray-100 dark:border-slate-800">
              <div className="text-center">
                <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider block">QR Codes</span>
                <span className="text-base font-extrabold text-slate-800 dark:text-slate-100">{dayStats.total}</span>
              </div>
              <div className="text-center border-l border-gray-200/50 dark:border-slate-800">
                <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider block">Total Lotes</span>
                <span className="text-base font-extrabold text-slate-800 dark:text-slate-100">{dayStats.containers}</span>
              </div>
              <div className="text-center border-l border-gray-200/50 dark:border-slate-800">
                <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider block text-emerald-500 dark:text-emerald-400">Finalizados</span>
                <span className="text-base font-extrabold text-emerald-600 dark:text-emerald-400">{dayStats.finalized}</span>
              </div>
              <div className="text-center border-l border-gray-200/50 dark:border-slate-800">
                <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider block text-amber-500 dark:text-amber-400">Pendentes</span>
                <span className="text-base font-extrabold text-amber-600 dark:text-amber-400">{dayStats.pending}</span>
              </div>
            </div>

            {/* Custom Interactive Color-Coded Categories filter */}
            {activeCategories.length > 1 && (
              <div className="flex flex-wrap gap-1.5 py-2.5 border-b border-gray-100 dark:border-slate-800">
                <button
                  onClick={() => setSelectedCategoryFilter(null)}
                  className={cn(
                    "px-2.5 py-1 rounded-full text-xs font-semibold transition-all cursor-pointer border",
                    selectedCategoryFilter === null
                      ? "bg-slate-800 text-white border-slate-850 dark:bg-slate-100 dark:text-slate-950 dark:border-white shadow-sm"
                      : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-gray-200 dark:border-slate-700/60 hover:bg-slate-200/70 dark:hover:bg-slate-700"
                  )}
                >
                  Todas ({dayStats.total})
                </button>
                {activeCategories.map(cat => {
                  const color = getCategoryColor(cat);
                  const isSelected = selectedCategoryFilter === cat;
                  const count = activeCategoriesCounts[cat] || 0;
                  return (
                    <button
                      key={cat}
                      onClick={() => setSelectedCategoryFilter(cat)}
                      className={cn(
                        "px-2.5 py-1 rounded-full text-xs font-semibold transition-all flex items-center gap-1.5 cursor-pointer border",
                        isSelected 
                          ? `${color.badge} ${color.border} shadow-sm ring-1 ring-inset ring-current`
                          : `bg-slate-50 dark:bg-slate-900 border-gray-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 ${color.hover}`
                      )}
                    >
                      <span className={cn("w-1.5 h-1.5 rounded-full", color.dot)}></span>
                      <span>{cat}</span>
                      <span className="opacity-75 text-[10px]">({count})</span>
                    </button>
                  );
                })}
              </div>
            )}

            {/* Search items/containers searchbox */}
            <div className="relative">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400 pointer-events-none" />
              <input
                type="text"
                placeholder="Buscar lote ou código QR..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 pr-8 py-2 w-full text-xs rounded-xl border border-gray-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500"
              />
              {searchQuery && (
                <button 
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600"
                >
                  <X size={14} />
                </button>
              )}
            </div>

            {/* Collapsible/Accordion detailed list */}
            {filteredData.length > 0 ? (
              <div className="space-y-3.5 max-h-[350px] overflow-y-auto pr-1 custom-scrollbar">
                {filteredData.map(catGroup => (
                  <div key={catGroup.category} className="space-y-2">
                    {/* Visual Section Header per category */}
                    <div className="flex items-center gap-2 pt-2.5 pb-0.5">
                      <span className={cn("w-2 h-2 rounded-full", catGroup.color.dot)}></span>
                      <h4 className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest">{catGroup.category}</h4>
                    </div>

                    <div className="space-y-2 pl-2.5 border-l-2 border-slate-100 dark:border-slate-800/80">
                      {catGroup.containers.map(container => {
                        const containerKey = `${catGroup.category}-${container.name}`;
                        const isExpanded = !!expandedContainers[containerKey];
                        return (
                          <div 
                            key={container.name} 
                            className="border border-gray-100 dark:border-slate-800 rounded-xl overflow-hidden bg-gray-50/50 dark:bg-slate-900/30"
                          >
                            {/* Accordion Trigger header row */}
                            <div 
                              onClick={() => toggleContainer(containerKey)}
                              className="flex items-center justify-between p-3 cursor-pointer hover:bg-gray-100/50 dark:hover:bg-slate-800/20 transition-all select-none"
                            >
                              <div className="flex items-center gap-2 min-w-0">
                                <FolderOpen size={16} className="text-slate-400 shrink-0" />
                                <span className="font-bold text-xs text-slate-800 dark:text-slate-200 truncate">{container.name}</span>
                                <span className="text-[10px] text-slate-500 bg-white dark:bg-slate-800 px-1.5 py-0.5 rounded-full border border-gray-100 dark:border-slate-800 font-semibold shrink-0">
                                  {container.items.length} {container.items.length === 1 ? 'item' : 'itens'}
                                </span>
                              </div>

                              <div className="flex items-center gap-2">
                                {container.finalized ? (
                                  <span className="flex items-center gap-1 text-[9px] font-bold text-emerald-600 bg-emerald-50 dark:bg-emerald-950/20 px-2 py-0.5 rounded-full border border-emerald-100 dark:border-emerald-900/30">
                                    <Check size={10} strokeWidth={3} />
                                    Finalizado
                                  </span>
                                ) : (
                                  <span className="flex items-center gap-1 text-[9px] font-bold text-amber-600 bg-amber-50 dark:bg-amber-950/20 px-2 py-0.5 rounded-full border border-amber-100 dark:border-amber-900/30">
                                    <Clock size={10} />
                                    Pendente
                                  </span>
                                )}
                                {isExpanded ? <ChevronUp size={16} className="text-slate-400" /> : <ChevronDown size={16} className="text-slate-400" />}
                              </div>
                            </div>

                            {/* Accordion Content listing individual items */}
                            {isExpanded && (
                              <div className="border-t border-gray-100 dark:border-slate-800 bg-white dark:bg-slate-950 p-2.5 space-y-1.5 animate-in slide-in-from-top-1 duration-150">
                                {container.items.length === 0 ? (
                                  <div className="text-center py-4 text-xs text-gray-400 dark:text-slate-500 font-medium">Nenhum item neste lote</div>
                                ) : (
                                  container.items.map((item, idx) => (
                                    <div 
                                      key={idx} 
                                      className="flex items-center justify-between gap-3 p-2.5 bg-slate-50 dark:bg-slate-900/40 hover:bg-slate-100/50 dark:hover:bg-slate-900/80 rounded-lg border border-gray-100/70 dark:border-slate-800 transition-all group"
                                    >
                                      <div className="flex flex-col min-w-0 flex-1">
                                        <span className="font-mono text-xs text-slate-800 dark:text-slate-200 break-all select-all font-semibold leading-tight">
                                          {item.t}
                                        </span>
                                        <span className="text-[9px] text-slate-400 dark:text-slate-500 flex items-center gap-1.5 mt-1 font-medium">
                                          <Clock size={10} />
                                          Registrado às {format(new Date(item.ts), 'HH:mm:ss')}
                                          {item.duplicate && (
                                            <span className="text-amber-500 font-bold ml-1 bg-amber-50 dark:bg-amber-950/20 px-1 rounded border border-amber-100 dark:border-amber-900/20">DUPLICADO</span>
                                          )}
                                          {item.archived && (
                                            <span className="text-slate-400 font-bold ml-1 bg-slate-50 dark:bg-slate-900 px-1 rounded border border-slate-200 dark:border-slate-800">ARQUIVADO</span>
                                          )}
                                        </span>
                                      </div>
                                      <button
                                        onClick={() => handleCopy(item.t)}
                                        className={cn(
                                          "p-1.5 hover:bg-white dark:hover:bg-slate-800 rounded-md border border-gray-150 dark:border-slate-800 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition-all cursor-pointer shadow-sm active:scale-95 shrink-0",
                                          copiedId === item.t && "bg-green-50 text-green-600 border-green-100 hover:bg-green-50 dark:bg-green-950/20 dark:text-green-400 dark:border-green-900"
                                        )}
                                        title="Copiar QR Code"
                                      >
                                        {copiedId === item.t ? <Check size={13} strokeWidth={3} /> : <Copy size={13} />}
                                      </button>
                                    </div>
                                  ))
                                )}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-10 bg-slate-50 dark:bg-slate-950/40 border border-dashed border-gray-200 dark:border-slate-850 rounded-2xl">
                <Database size={32} className="text-slate-300 dark:text-slate-700 mx-auto mb-2" />
                <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">Nenhum lote ou item coincide com a busca.</p>
              </div>
            )}
          </div>
        ) : (
          <div className="text-center py-10 bg-slate-50 dark:bg-slate-950/40 border border-dashed border-gray-200 dark:border-slate-850 rounded-2xl">
            <CalendarIcon size={32} className="text-slate-300 dark:text-slate-700 mx-auto mb-2" />
            <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">Não há registros de produção neste dia.</p>
          </div>
        )}

        <div className="flex justify-end pt-4 mt-2 border-t border-gray-100 dark:border-slate-800/80">
          <button
            onClick={() => setIsModalOpen(false)}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 dark:bg-slate-100 dark:hover:bg-slate-200 dark:text-slate-950 text-white font-bold text-xs rounded-xl transition cursor-pointer"
          >
            Fechar Detalhes
          </button>
        </div>
      </Modal>
    </div>
  );
}
