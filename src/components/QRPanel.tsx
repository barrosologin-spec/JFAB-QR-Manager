/**
 * Desenvolvido por José Felipe A. Barroso (pixdobarroso@gmail.com)
 */

import React, {useState, useMemo} from 'react';
import {QRCodeSVG} from 'qrcode.react';
import Barcode from 'react-barcode';
import {
  Filter, 
  Plus, 
  FolderOpen, 
  Trash2, 
  FileText, 
  Printer, 
  PlusCircle, 
  Settings, 
  Search, 
  Calendar,
  Layers, 
  CheckCircle2, 
  AlertCircle,
  HelpCircle,
  QrCode,
  Lock,
  Unlock,
  ChevronRight,
  ChevronLeft,
  LayoutGrid,
  List,
  Copy,
  Check,
  Boxes,
  Workflow,
  DownloadCloud,
  Play,
  Pause,
  RotateCcw,
  Timer,
  Gauge,
  Zap
} from 'lucide-react';
import {QRStorage, QRItem} from '../types';
import {cn, extractLastDigits, formatTimestamp} from '../lib/utils';
import {ColorPreset} from '../lib/colors';

interface QRPanelProps {
  storage: QRStorage;
  selectedCategory: string;
  setSelectedCategory: (c: string) => void;
  selectedDate: string;
  setSelectedDate: (d: string) => void;
  selectedContainer: string;
  setSelectedContainer: (c: string) => void;
  onAddCategory: () => void;
  onManageCategories: () => void;
  onAddContainer: () => void;
  onDeleteContainer: () => void;
  onDownloadPDF: () => void;
  onPrintPlate: () => void;
  onImportPDF: () => void;
  onAddQR: (text: string, nfeData?: any) => void;
  items: QRItem[];
  onEditItem: (index: number, newText: string) => void;
  onDeleteItem: (index: number) => void;
  onFinalize: () => void;
  isFinalized: boolean;
  activePreset: ColorPreset;
  onDownloadDanfePDF?: (targetItems?: QRItem[]) => void;
}

export function QRPanel({
  storage,
  selectedCategory, setSelectedCategory,
  selectedDate, setSelectedDate,
  selectedContainer, setSelectedContainer,
  onAddCategory, onManageCategories, onAddContainer, onDeleteContainer,
  onDownloadPDF, onPrintPlate, onImportPDF,
  onAddQR, items, onEditItem, onDeleteItem,
  onFinalize, isFinalized, activePreset,
  onDownloadDanfePDF
}: QRPanelProps) {
  const [inputValue, setInputValue] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [formattingMsg, setFormattingMsg] = useState('');

  // Calculate live statistics for selected date under selected category
  const dateStats = useMemo(() => {
    let total = 0;
    let dups = 0;
    if (selectedCategory && selectedDate && storage[selectedCategory]?.[selectedDate]) {
      const dateNode = storage[selectedCategory][selectedDate];
      Object.entries(dateNode).forEach(([contName, data]) => {
        if (contName.startsWith('_')) return;
        if (data && Array.isArray(data.items)) {
          data.items.forEach((item: QRItem) => {
            if (!item.archived) {
              total++;
              if (item.duplicate) {
                dups++;
              }
            }
          });
        }
      });
    }
    return { total, dups, active: total - dups };
  }, [storage, selectedCategory, selectedDate]);

  const nfeItems = useMemo(() => items.filter(i => i.nfeData), [items]);
  
  // Custom Paginated Data Table States
  const [viewMode, setViewMode] = useState<'table' | 'cards'>('table');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [copiedText, setCopiedText] = useState<string | null>(null);
  const [isNfeMode, setIsNfeMode] = useState(false);
  const [isConsulting, setIsConsulting] = useState(false);
  const scannerInputRef = React.useRef<HTMLInputElement>(null);

  // Stopwatch States
  const [secondsElapsed, setSecondsElapsed] = useState(0);
  const [isTimerRunning, setIsTimerRunning] = useState(false);
  const prevContainerRef = React.useRef(selectedContainer);

  React.useEffect(() => {
    if (selectedContainer !== prevContainerRef.current) {
      prevContainerRef.current = selectedContainer;
      if (selectedContainer) {
        if (items && items.length > 1) {
          const firstTs = items[0].ts;
          const lastTs = items[items.length - 1].ts;
          const durationSecs = Math.max(0, Math.floor((lastTs - firstTs) / 1000));
          setSecondsElapsed(durationSecs);
        } else {
          setSecondsElapsed(0);
        }
        setIsTimerRunning(!isFinalized);
      } else {
        setSecondsElapsed(0);
        setIsTimerRunning(false);
      }
    } else {
      if (selectedContainer && (!items || items.length === 0)) {
        setSecondsElapsed(0);
      }
    }
  }, [selectedContainer, isFinalized, items]);

  React.useEffect(() => {
    let interval: any = null;
    if (isTimerRunning && !isFinalized && selectedContainer) {
      interval = setInterval(() => {
        setSecondsElapsed(prev => prev + 1);
      }, 1000);
    } else {
      if (interval) clearInterval(interval);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isTimerRunning, isFinalized, selectedContainer]);

  const toggleTimer = () => {
    if (isFinalized) return;
    setIsTimerRunning(prev => !prev);
  };

  const resetTimer = () => {
    if (isFinalized) return;
    setSecondsElapsed(0);
  };

  const formatStopwatchTime = (secs: number) => {
    const h = Math.floor(secs / 3600);
    const m = Math.floor((secs % 3600) / 60);
    const s = secs % 60;
    return [
      h.toString().padStart(2, '0'),
      m.toString().padStart(2, '0'),
      s.toString().padStart(2, '0')
    ].join(':');
  };

  const totalBips = items ? items.length : 0;
  
  const avgReadingTime = useMemo(() => {
    if (totalBips <= 1) return 0;
    return secondsElapsed / totalBips;
  }, [secondsElapsed, totalBips]);

  const scansPerMinute = useMemo(() => {
    if (secondsElapsed <= 0 || totalBips === 0) return 0;
    return (totalBips / (secondsElapsed / 60));
  }, [secondsElapsed, totalBips]);

  // Keep scanner focused on initial mount or container change
  React.useEffect(() => {
    if (!isFinalized && selectedContainer && !isConsulting) {
      setTimeout(() => scannerInputRef.current?.focus(), 100);
    }
  }, [isFinalized, selectedContainer, isConsulting, isNfeMode]);

  // Global click handler to maintain focus on the scanner input unless interacting with another input
  React.useEffect(() => {
    const handleGlobalClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (
        !isFinalized && 
        selectedContainer && 
        !isConsulting &&
        target.tagName !== 'INPUT' && 
        target.tagName !== 'TEXTAREA' && 
        target.tagName !== 'SELECT'
      ) {
         scannerInputRef.current?.focus();
      }
    };
    document.addEventListener('click', handleGlobalClick);
    return () => document.removeEventListener('click', handleGlobalClick);
  }, [isFinalized, selectedContainer, isConsulting]);

  // Reset page count when changing container or searching
  React.useEffect(() => {
    setCurrentPage(1);
  }, [selectedCategory, selectedDate, selectedContainer, searchQuery]);

  const categories = useMemo(() => Object.keys(storage).filter(k => !k.startsWith('_')), [storage]);
  const availableContainers = useMemo(() => 
    (selectedCategory && selectedDate) ? Object.keys(storage[selectedCategory]?.[selectedDate] || {}).filter(k => !k.startsWith('_')) : []
  , [storage, selectedCategory, selectedDate]);

  // Clean up formatting message after 4 seconds
  React.useEffect(() => {
    if (formattingMsg) {
      const timer = setTimeout(() => setFormattingMsg(''), 4000);
      return () => clearTimeout(timer);
    }
  }, [formattingMsg]);

  // Handle enter input scan
  const handleKeyDown = async (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && inputValue.trim() && !isConsulting && !isFinalized) {
      if (!isTimerRunning) {
        setIsTimerRunning(true);
      }
      let finalValue = inputValue.trim();
      let originalValue = finalValue;
      
      // Auto-formatting logic
      let cleanValue = finalValue;
      if (cleanValue.startsWith('`')) {
        cleanValue = cleanValue.slice(1);
      }
      
      if (cleanValue.startsWith('^') && cleanValue.endsWith('{')) {
        const raw = cleanValue.slice(0, -1); // remove {
        const pairs = raw.split(',');
        const obj: Record<string, string> = {};
        let hasMatch = false;

        pairs.forEach(pair => {
          // Split by ^Ç^, e.g. "^id^Ç^47032733929^"
          const parts = pair.split('^Ç^');
          if (parts.length === 2 && parts[0].startsWith('^') && parts[1].endsWith('^')) {
            const key = parts[0].slice(1);
            const val = parts[1].slice(0, -1);
            obj[key] = val;
            hasMatch = true;
          }
        });

        if (hasMatch) {
          const formatted = JSON.stringify(obj);
          setFormattingMsg(`JSON extraído: convertendo dados de coletor industrial de modo bruto para estrutura chave-valor...`);
          finalValue = formatted;
        }
      }

      if (isNfeMode && finalValue.length === 44) {
        setIsConsulting(true);
        setFormattingMsg(`Consultando NF-e: ${finalValue}...`);
        try {
          const resp = await fetch('/api/consultadanfe', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ chave: finalValue }),
          });
          if (!resp.ok) throw new Error("Erro na consulta API");
          const data = await resp.json();
          
          let parsedNfe = { ...data };
          if (data.xml_base64) {
            try {
              const binaryString = window.atob(data.xml_base64);
              const bytes = new Uint8Array(binaryString.length);
              for (let i = 0; i < binaryString.length; i++) {
                  bytes[i] = binaryString.charCodeAt(i);
              }
              const xmlText = new TextDecoder('utf-8').decode(bytes);
              const parser = new DOMParser();
              const xmlDoc = parser.parseFromString(xmlText, "text/xml");
              
              const getTagText = (parent: Element | Document | null, tag: string) => {
                if (!parent) return null;
                const elements = parent.getElementsByTagName(tag);
                return elements.length > 0 ? elements[0].textContent : null;
              };
              
              const emitNode = xmlDoc.getElementsByTagName('emit')[0];
              const destNode = xmlDoc.getElementsByTagName('dest')[0];
              const transpNode = xmlDoc.getElementsByTagName('transp')[0];
              const transportaNode = transpNode ? transpNode.getElementsByTagName('transporta')[0] : null;
              const transpVolNode = transpNode ? transpNode.getElementsByTagName('vol')[0] : null;

              parsedNfe.emitente = { nome: getTagText(emitNode, 'xNome') };
              parsedNfe.destinatario = { nome: getTagText(destNode, 'xNome') };
              parsedNfe.transportadora = { nome: getTagText(transportaNode, 'xNome') };
              parsedNfe.volumes = getTagText(transpVolNode, 'qVol');

              const detNodes = xmlDoc.getElementsByTagName('det');
              const produtos = [];
              for (let i = 0; i < detNodes.length; i++) {
                const prodNode = detNodes[i].getElementsByTagName('prod')[0];
                produtos.push({
                  nome: getTagText(prodNode, 'xProd'),
                  qtd: getTagText(prodNode, 'qCom')
                });
              }
              parsedNfe.produtos = produtos;
            } catch (xmlErr) {
              console.error("Erro ao decodificar/parsear XML da NF-e", xmlErr);
            }
          }

          onAddQR(finalValue, parsedNfe);
          setFormattingMsg(`NF-e lida com sucesso!`);
        } catch (err) {
          console.error(err);
          setFormattingMsg(`Erro ao consultar NF-e. Registrando apenas a chave.`);
          onAddQR(finalValue);
        } finally {
          setIsConsulting(false);
          setInputValue('');
        }
      } else {
        onAddQR(finalValue);
        setInputValue('');
      }
    }
  };

  const visibleItems = useMemo(() => items.filter(i => !i.duplicate && !i.archived), [items]);

  // Filter items based on local search query inside container
  const filteredItems = useMemo(() => {
    if (!searchQuery.trim()) return visibleItems;
    const query = searchQuery.toLowerCase().trim();
    return visibleItems.filter(item => item.t.toLowerCase().includes(query));
  }, [visibleItems, searchQuery]);

  const totalPages = useMemo(() => {
    return Math.ceil(filteredItems.length / itemsPerPage) || 1;
  }, [filteredItems, itemsPerPage]);

  const paginatedItems = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return filteredItems.slice(startIndex, startIndex + itemsPerPage);
  }, [filteredItems, currentPage, itemsPerPage]);

  const paginationRange = useMemo(() => {
    const delta = 1;
    const range: (number | string)[] = [];
    
    for (let i = Math.max(2, currentPage - delta); i <= Math.min(totalPages - 1, currentPage + delta); i++) {
      range.push(i);
    }
    
    if (currentPage - delta > 2) {
      range.unshift("...");
    }
    if (currentPage + delta < totalPages - 1) {
      range.push("...");
    }
    
    range.unshift(1);
    if (totalPages > 1) {
      range.push(totalPages);
    }
    
    return range;
  }, [currentPage, totalPages]);

  const handleCopyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedText(text);
    setTimeout(() => setCopiedText(null), 2000);
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      
      {/* Dynamic Header State Bar */}
      <div className={cn(
        "rounded-2xl border p-4 flex flex-col md:flex-row items-center justify-between gap-4 transition-all duration-500 shadow-sm",
        selectedCategory ? `${activePreset.bgLight} ${activePreset.border}` : "bg-slate-50 border-slate-200"
      )}>
        <div className="flex items-center gap-3 w-full md:w-auto">
          <div className={cn(
            "w-10 h-10 rounded-xl flex items-center justify-center transition-all duration-300 shadow-xs shrink-0",
            selectedCategory ? `${activePreset.bg} text-white` : "bg-slate-300 text-slate-700"
          )}>
            <Workflow size={20} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Estação de Trabalho</span>
              {selectedCategory && (
                <span className={cn("text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full border", activePreset.bg, "text-white")}>
                  {activePreset.name}
                </span>
              )}
            </div>
            <h2 className="text-sm font-extrabold text-slate-800 leading-none mt-1">
              {selectedCategory 
                ? `Linhagem: ${selectedCategory} • Lote ${selectedDate || '(Indefinido)'}` 
                : "Aguardando parametrização inicial do lote de controle..."}
            </h2>
          </div>
        </div>


      </div>

      {/* Main Grid Layout: left side configs, right side scan & items list */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        
        {/* Left Control Column (Lote configs, container picker, quick operations) */}
        <div className="lg:col-span-4 space-y-6">
          
          {/* Section 1: Identificação do lote */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <h3 className="font-extrabold text-xs text-slate-700 uppercase tracking-wider flex items-center gap-2">
                <span className="w-5 h-5 rounded-lg bg-slate-250 text-slate-700 text-[10px] font-black flex items-center justify-center border border-slate-300 shrink-0">1</span>
                Selecione Linhagem & Data
              </h3>
              <button 
                onClick={onManageCategories}
                title="Avançado"
                className="text-slate-400 hover:text-slate-700 transition"
              >
                <Settings size={16} />
              </button>
            </div>
            
            <div className="p-5 space-y-5">
              
              {/* Category selector */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between px-1">
                  <label className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">Coleta / Linhagem</label>
                  <button 
                    onClick={onAddCategory}
                    className="text-[10px] font-black text-blue-600 hover:text-blue-700 uppercase tracking-widest flex items-center gap-0.5"
                  >
                    <Plus size={10} className="stroke-[3]" /> Nova Coleta
                  </button>
                </div>
                <div className="flex gap-1.5">
                  <select 
                    value={selectedCategory}
                    onChange={(e) => {
                      setSelectedCategory(e.target.value);
                      setSelectedContainer('');
                    }}
                    className={cn(
                      "flex-1 bg-slate-50 hover:bg-slate-100 border border-slate-250 rounded-xl px-3 py-2.5 text-xs font-bold text-slate-800 outline-none transition shadow-inner focus:ring-2 focus:ring-offset-1 focus:bg-white",
                      selectedCategory ? activePreset.ring : "focus:ring-blue-500/20"
                    )}
                  >
                    <option value="">Selecione Linhagem...</option>
                    {categories.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                  <button 
                    onClick={onManageCategories}
                    title="Configurações de cores e nomes das coletas"
                    className="p-2.5 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl transition shadow-xs border border-slate-200"
                  >
                    <Settings size={18} />
                  </button>
                </div>
              </div>

              {/* Date selection */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between gap-2 px-1">
                  <label className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">Data de Produção</label>
                  {selectedCategory && selectedDate && (
                    <span className="text-[10px] font-extrabold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/40 px-2 py-0.5 rounded-lg border border-blue-100/60 dark:border-blue-900/40">
                      {dateStats.total} - {dateStats.dups} {dateStats.dups === 1 ? 'duplicado' : 'duplicados'} = {dateStats.active} {dateStats.active === 1 ? 'Bipado' : 'Bipados'}
                    </span>
                  )}
                </div>
                <div className="relative">
                  <input 
                    type="date" 
                    value={selectedDate}
                    onChange={(e) => {
                      setSelectedDate(e.target.value);
                      setSelectedContainer('');
                    }}
                    className={cn(
                      "w-full bg-slate-50 hover:bg-slate-100 border border-slate-250 rounded-xl px-3 py-2.5 text-xs font-bold text-slate-800 outline-none transition shadow-inner focus:ring-2 focus:ring-offset-1 focus:bg-white",
                      selectedCategory ? activePreset.ring : "focus:ring-blue-500/20"
                    )}
                  />
                  <Calendar size={14} className="absolute right-3.5 top-3.5 text-slate-400 pointer-events-none" />
                </div>
              </div>

            </div>
          </div>

          {/* Section 2: Contêineres / Lotes menores */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <h3 className="font-extrabold text-xs text-slate-700 uppercase tracking-wider flex items-center gap-2">
                <span className="w-5 h-5 rounded-lg bg-slate-250 text-slate-700 text-[10px] font-black flex items-center justify-center border border-slate-300 shrink-0">2</span>
                Contêineres Compartimento
              </h3>
              
              <button 
                onClick={onAddContainer}
                disabled={!selectedCategory || !selectedDate}
                className={cn(
                  "px-2.5 py-1 text-[9px] font-black uppercase tracking-widest rounded-lg flex items-center gap-1 transition shadow-xs active:scale-95 text-white",
                  selectedCategory ? `${activePreset.bg} ${activePreset.bgHover}` : "bg-slate-300 cursor-not-allowed"
                )}
              >
                <Plus size={10} className="stroke-[3]" /> Adicionar
              </button>
            </div>

            <div className="p-5">
              {availableContainers.length > 0 ? (
                <div className="space-y-2 max-h-[290px] overflow-y-auto pr-1.5 custom-scrollbar">
                  {availableContainers.map(c => {
                    const containerData = storage[selectedCategory]?.[selectedDate]?.[c];
                    const count = containerData?.items?.length || 0;
                    const isContFinalized = containerData?.finalized || false;
                    const isSelected = selectedContainer === c;

                    return (
                      <button
                        key={c}
                        onClick={() => setSelectedContainer(c)}
                        className={cn(
                          "w-full flex items-center justify-between p-3 rounded-xl border text-left transition duration-200 shadow-xs relative overflow-hidden group",
                          isSelected 
                            ? `border-l-4 ${activePreset.bgLight} ${activePreset.borderActive} font-extrabold` 
                            : isContFinalized
                              ? "bg-slate-50/40 border-slate-200 hover:bg-slate-50"
                              : "bg-white border-slate-200 hover:border-slate-300"
                        )}
                        style={{
                          borderLeftColor: isSelected ? activePreset.hex : undefined
                        }}
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div className={cn(
                            "w-2 h-2 rounded-full",
                            isContFinalized 
                              ? "bg-emerald-500" 
                              : isSelected ? "bg-amber-500 animate-pulse" : "bg-slate-300"
                          )}></div>
                          <div className="truncate">
                            <h4 className={cn("text-xs font-bold leading-tight", isSelected ? "text-slate-900" : "text-slate-700")}>
                              {c}
                            </h4>
                            <p className="text-[9px] text-slate-400 font-bold uppercase mt-0.5 tracking-tight">
                              {count} {count === 1 ? 'item escaneado' : 'itens escaneados'}
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-1.5 shrink-0">
                          <span className={cn(
                            "text-[8px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded-md",
                            isContFinalized 
                              ? "bg-emerald-50 text-emerald-600 border border-emerald-100" 
                              : isSelected ? "bg-amber-50 text-amber-700 border border-amber-100" : "bg-slate-100 text-slate-500"
                          )}>
                            {isContFinalized ? "Fechado" : "Aberto"}
                          </span>
                          <ChevronRight size={12} className="text-slate-400 group-hover:translate-x-0.5 transition" />
                        </div>
                      </button>
                    );
                  })}
                </div>
              ) : (
                <div className="py-8 text-center bg-slate-50 border border-dashed border-slate-200 rounded-2xl p-4">
                  <Boxes size={24} className="mx-auto text-slate-300 mb-2" />
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-relaxed">
                    {!selectedCategory || !selectedDate 
                      ? "Aguardando seleção de Linhagem..." 
                      : "Sem contêineres para esta data."}
                  </p>
                  {selectedCategory && selectedDate && (
                    <button 
                      onClick={onAddContainer}
                      className={cn(
                        "mt-3 text-[9px] font-black uppercase tracking-wider px-3 py-1.5 rounded-lg border shadow-xs inline-flex items-center gap-1.5",
                        activePreset.textLight, activePreset.border, "bg-white hover:bg-slate-50"
                      )}
                    >
                      <Plus size={10} className="stroke-[3]" /> Criar Container 01
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Section 3: Ações do lote */}
          {selectedContainer && (
            <div className="bg-slate-900 text-white rounded-2xl border border-slate-800 shadow-md p-5 space-y-4">
              <div className="flex items-end justify-between">
                <div>
                  <h4 className="text-[10px] font-black text-slate-405 uppercase tracking-widest mb-1">Status de Embarque</h4>
                  <h3 className="text-sm font-black text-slate-100">{selectedContainer}</h3>
                </div>
                <div className="text-right">
                  <span className={cn(
                    "inline-block rounded-full px-2 py-0.5 text-[8px] font-black uppercase tracking-widest text-white shadow-sm border",
                    isFinalized ? "bg-emerald-600 border-emerald-500" : "bg-amber-500 border-amber-400"
                  )}>
                    {isFinalized ? "COMPLETO / FINALIZADO" : "ABERTO / EM LEITURA"}
                  </span>
                </div>
              </div>

              <div className="h-px bg-slate-800"></div>

              <div className="grid grid-cols-2 gap-3.5">
                <button
                  onClick={onPrintPlate}
                  title="Imprimir placa de identificação oficial do contêiner"
                  className={cn(
                    "flex flex-col items-center justify-center p-3 rounded-xl border transition active:scale-95 cursor-pointer text-center",
                    isFinalized 
                      ? "bg-slate-850 hover:bg-slate-800 border-slate-700 text-slate-205" 
                      : "bg-slate-850 border-slate-800 opacity-40 text-slate-400"
                  )}
                  disabled={!isFinalized}
                >
                  <Printer size={18} className="mb-1.5 text-slate-300" />
                  <span className="text-[9px] font-black uppercase tracking-widest text-slate-100">Imprimir Placa</span>
                  <span className="text-[7.5px] text-slate-400 font-bold block mt-0.5">Disponível ao selar</span>
                </button>

                <button
                  onClick={onDownloadPDF}
                  title="Baixar PDF do relatório estruturado de etiquetas lidas"
                  className={cn(
                    "flex flex-col items-center justify-center p-3 rounded-xl border transition active:scale-95 cursor-pointer text-center",
                    isFinalized 
                      ? `${activePreset.bg} hover:brightness-110 border-transparent text-white` 
                      : "bg-slate-850 border-slate-800 opacity-40 text-slate-400"
                  )}
                  disabled={!isFinalized || items.length === 0}
                >
                  <FileText size={18} className="mb-1.5" />
                  <span className="text-[9px] font-black uppercase tracking-widest">Baixar PDF</span>
                  <span className="text-[7.5px] text-slate-100/70 font-semibold block mt-0.5">Lote completo</span>
                </button>
              </div>

              {nfeItems.length > 0 && onDownloadDanfePDF && (
                <button
                  onClick={() => onDownloadDanfePDF()}
                  title={nfeItems.length > 1 ? "Baixar DANFEs consolidadas em Lote" : "Baixar DANFE (Nota Fiscal PDF)"}
                  className={cn(
                    "w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl border transition active:scale-95 cursor-pointer text-center font-bold text-[10px] uppercase tracking-wider shadow-sm",
                    isFinalized
                      ? "bg-emerald-600 hover:bg-emerald-500 border-transparent text-white"
                      : "bg-emerald-500/20 border-emerald-500/30 text-emerald-600 opacity-50 cursor-not-allowed"
                  )}
                  disabled={!isFinalized}
                >
                  <FileText size={15} />
                  <span>
                    {nfeItems.length > 1 ? `Baixar DANFEs em Lote (${nfeItems.length})` : "Baixar DANFE (Nota Fiscal)"}
                  </span>
                </button>
              )}

              {!isFinalized ? (
                <>
                  <button
                    onClick={onImportPDF}
                    className="w-full flex items-center justify-center gap-2 py-2 border border-slate-200 bg-white hover:bg-slate-50 rounded-xl text-[10px] font-bold tracking-wider transition text-slate-600 shadow-sm"
                  >
                    <DownloadCloud size={14} className="text-slate-400" /> Importar Backup JSON
                  </button>
                  <button
                    onClick={onFinalize}
                    className={cn(
                      "w-full flex items-center justify-center gap-2 py-3 border border-transparent rounded-xl text-xs font-black uppercase tracking-widest transition shadow-lg text-white",
                      activePreset.bg, activePreset.bgHover
                    )}
                  >
                    <Lock size={14} className="stroke-[3]" /> Concluir e Selar Container
                  </button>
                </>
              ) : (
                <div className="bg-slate-850 border border-slate-850 rounded-xl p-3 text-center">
                  <p className="text-[9px] text-emerald-450 font-black uppercase tracking-widest flex items-center justify-center gap-1">
                    <CheckCircle2 size={12} className="text-emerald-450" /> CONTÊINER SELADO
                  </p>
                  <p className="text-[8px] text-slate-400 font-medium leading-relaxed mt-1">
                    A coleta está lacrada para sincronização central. Utilize o "Painel de Ajustes" se precisar reabrir os dados.
                  </p>
                </div>
              )}
            </div>
          )}

        </div>

        {/* Right Active Workspace Hub (Immersive scanner laser area & list of scanned QR codes) */}
        <div className="lg:col-span-8 space-y-6">
          
          {/* Main Scanning Laser Zone Card */}
          <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs">
            <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <h3 className="font-extrabold text-xs text-slate-700 uppercase tracking-wider flex items-center gap-2">
                <span className="w-5 h-5 rounded-lg bg-slate-250 text-slate-700 text-[10px] font-black flex items-center justify-center border border-slate-300 shrink-0">3</span>
                Estação de Escaneamento
              </h3>
              
              {selectedContainer && (
                <div className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-red-500 animate-ping inline-block"></span>
                  <span className="text-[9px] font-black uppercase tracking-widest text-slate-550">Leitor Laser Esperando scanner</span>
                </div>
              )}
            </div>

            {selectedContainer ? (
              <div className="p-6 space-y-5">

                {/* Painel de Ritmo e Tempo de Leituras */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {/* Cronômetro */}
                  <div className="bg-slate-900 text-white rounded-xl p-4 flex flex-col justify-between shadow-sm border border-slate-850 relative overflow-hidden group">
                    <div className="flex items-center justify-between">
                      <span className="text-[9px] font-extrabold uppercase tracking-widest text-slate-400 flex items-center gap-1">
                        <Timer size={13} className="text-blue-450" /> Tempo de Escaneamento
                      </span>
                      <span className={cn(
                        "rounded-full px-2 py-0.5 text-[8px] font-black uppercase tracking-wider",
                        isFinalized 
                          ? "bg-slate-800 text-slate-400" 
                          : isTimerRunning 
                            ? "bg-blue-600 text-white animate-pulse" 
                            : "bg-amber-600/60 text-amber-200"
                      )}>
                        {isFinalized ? "Finalizado" : isTimerRunning ? "Ativo" : "Pausado"}
                      </span>
                    </div>

                    <div className="my-3 flex items-baseline gap-1 justify-center">
                      <span className="text-3xl font-mono font-extrabold tracking-tight text-white">
                        {formatStopwatchTime(secondsElapsed)}
                      </span>
                    </div>

                    <div className="flex items-center justify-between border-t border-slate-800/60 pt-2.5 mt-1.5 font-sans">
                      <div className="flex gap-2">
                        {!isFinalized && (
                          <button
                            onClick={toggleTimer}
                            className={cn(
                              "flex items-center gap-1 text-[9px] font-black uppercase tracking-wider px-2 py-1 rounded-md transition cursor-pointer",
                              isTimerRunning 
                                ? "bg-amber-600 hover:bg-amber-500 text-white" 
                                : "bg-emerald-600 hover:bg-emerald-500 text-white"
                            )}
                          >
                            {isTimerRunning ? (
                              <><Pause size={10} className="stroke-[3]" /> Pausar</>
                            ) : (
                              <><Play size={10} className="stroke-[3]" /> Iniciar</>
                            )}
                          </button>
                        )}
                        {!isFinalized && (
                          <button
                            onClick={resetTimer}
                            title="Zerar cronômetro"
                            className="bg-slate-800 hover:bg-slate-700 text-slate-300 p-1 rounded-md transition cursor-pointer"
                          >
                            <RotateCcw size={10} />
                          </button>
                        )}
                      </div>
                      <span className="text-[8px] font-bold text-slate-500 uppercase tracking-widest">
                        {totalBips} {totalBips === 1 ? 'leitura' : 'leituras'}
                      </span>
                    </div>
                  </div>

                  {/* Tempo Médio por BIP */}
                  <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-xs flex flex-col justify-between dark:bg-slate-900 dark:border-slate-800">
                    <div className="flex items-center justify-between">
                      <span className="text-[9px] font-extrabold uppercase tracking-widest text-slate-400 flex items-center gap-1">
                        <Zap size={13} className="text-amber-500 animate-pulse" /> Intervalo Médio
                      </span>
                      <span className="text-[8px] font-bold text-slate-400 uppercase tracking-wider">
                        Ritmo
                      </span>
                    </div>

                    <div className="my-2.5 text-center">
                      {totalBips > 1 ? (
                        <div className="flex items-baseline justify-center gap-0.5">
                          <span className="text-3xl font-extrabold text-slate-800 dark:text-slate-105 tracking-tight">
                            {avgReadingTime >= 60 
                              ? `${Math.floor(avgReadingTime / 60)}m ${(avgReadingTime % 60).toFixed(0)}s` 
                              : `${avgReadingTime.toFixed(1)}s`}
                          </span>
                          <span className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">/ bip</span>
                        </div>
                      ) : (
                        <span className="text-xs font-bold text-slate-400 dark:text-slate-550 block my-2">
                          Aguardando leituras...
                        </span>
                      )}
                    </div>

                    <div className="border-t border-slate-100 dark:border-slate-800 pt-2 mt-1">
                      <span className="text-[9px] font-bold text-slate-500 dark:text-slate-400 block uppercase tracking-wider leading-none">
                        {totalBips <= 1 
                          ? "Registre mais códigos para estimar"
                          : avgReadingTime < 10 
                            ? "⚡ Desempenho Excepcional!"
                            : avgReadingTime < 25 
                              ? "✨ Ritmo muito bom"
                              : avgReadingTime < 50 
                                ? "⏱️ Ritmo Regular"
                                : "💤 Ocioso ou Pausado"}
                      </span>
                    </div>
                  </div>

                  {/* Velocidade de Fluxo */}
                  <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-xs flex flex-col justify-between dark:bg-slate-900 dark:border-slate-800">
                    <div className="flex items-center justify-between">
                      <span className="text-[9px] font-extrabold uppercase tracking-widest text-slate-450 dark:text-slate-400 flex items-center gap-1">
                        <Gauge size={13} className="text-emerald-500" /> Fluxo Médio
                      </span>
                      <span className="text-[8px] font-bold text-slate-400 uppercase tracking-wider">
                        Velocidade
                      </span>
                    </div>

                    <div className="my-2.5 text-center">
                      <div className="flex items-baseline justify-center gap-0.5">
                        <span className="text-3xl font-extrabold text-slate-800 dark:text-slate-105 tracking-tight">
                          {scansPerMinute > 0 ? scansPerMinute.toFixed(1) : "0.0"}
                        </span>
                        <span className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">bip/min</span>
                      </div>
                    </div>

                    <div className="border-t border-slate-100 dark:border-slate-800 pt-2 mt-1 flex items-center justify-between">
                      <span className="text-[8px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest leading-none">
                        PRODUTIVIDADE DO LOTE
                      </span>
                      <div className="flex items-center gap-1">
                        <span className={cn(
                          "w-2 h-2 rounded-full",
                          scansPerMinute > 5 ? "bg-emerald-500" : scansPerMinute > 2 ? "bg-blue-500" : "bg-slate-350 dark:bg-slate-700"
                        )}></span>
                      </div>
                    </div>
                  </div>
                </div>
                
                {/* Visual laser target and laser scanner input bar */}
                <div className={cn(
                  "border-2 rounded-2xl p-6 transition-all duration-300 relative overflow-hidden",
                  isFinalized 
                    ? "bg-slate-50 border-slate-200" 
                    : `${activePreset.bgLight} ${activePreset.borderActive} shadow-inner`
                )}>
                  
                  {/* Decorative corner target indicators to resemble warehouse scanner equipment terminal screen */}
                  {!isFinalized && (
                    <>
                      <div className="absolute top-2 left-2 w-3 h-3 border-t-2 border-l-2 border-slate-400"></div>
                      <div className="absolute top-2 right-2 w-3 h-3 border-t-2 border-r-2 border-slate-400"></div>
                      <div className="absolute bottom-2 left-2 w-3 h-3 border-b-2 border-l-2 border-slate-400"></div>
                      <div className="absolute bottom-2 right-2 w-3 h-3 border-b-2 border-r-2 border-slate-400"></div>
                    </>
                  )}

                  <div className="text-center space-y-4 max-w-lg mx-auto py-3">
                    
                    <div>
                      <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Entrada Direta de Dados</h4>
                      <p className="text-[11px] text-slate-500 font-bold mt-1">
                        {isFinalized 
                          ? "Selo de fechamento aplicado - leituras bloqueadas neste contêiner" 
                          : "Clique no campo abaixo e escaneie o código de barras ou insira manualmente:"}
                      </p>
                    </div>

                    <div className="relative">
                      <input 
                        ref={scannerInputRef}
                        type="text" 
                        value={inputValue}
                        onChange={(e) => setInputValue(e.target.value)}
                        onKeyDown={handleKeyDown}
                        disabled={isFinalized}
                        placeholder={
                          isFinalized 
                            ? "Contêiner finalizado. Leituras travadas." 
                            : "Escaneie etiqueta ou digite aqui e pressione Enter..."
                        }
                        className={cn(
                          "w-full bg-white border border-slate-300 rounded-xl pl-11 pr-4 py-3.5 text-xs font-bold text-slate-800 outline-none transition shadow-sm focus:ring-2 focus:ring-offset-1 select-all",
                          isFinalized ? "opacity-75 bg-slate-100 cursor-not-allowed" : activePreset.ring
                        )}
                      />
                      
                      <div className="absolute left-3.5 top-3.5">
                        <QrCode className={cn(
                          "w-5 h-5",
                          isFinalized ? "text-slate-400" : activePreset.accentText
                        )} />
                      </div>
                    </div>

                    {!isFinalized && (
                      <div className="flex flex-col items-center justify-center gap-3 mt-3">
                        <label className="flex items-center gap-2 cursor-pointer bg-slate-100 hover:bg-slate-200 px-3 py-1.5 rounded-full transition border border-slate-200" onClick={(e) => { e.preventDefault(); setIsNfeMode(!isNfeMode); }}>
                          <div className={cn("w-8 h-4 rounded-full relative transition", isNfeMode ? "bg-amber-500" : "bg-slate-300")}>
                            <div className={cn("absolute top-0.5 w-3 h-3 rounded-full bg-white transition shadow-sm", isNfeMode ? "left-4" : "left-0.5")}></div>
                          </div>
                          <span className="text-[10px] font-black uppercase tracking-widest text-slate-600">Modo NF-e (44 dígitos)</span>
                        </label>
                        <div className="flex items-center justify-center gap-1.5 text-[9px] text-slate-400 font-bold uppercase tracking-wider">
                          <span className="w-1.5 h-1.5 bg-green-500 rounded-full inline-block"></span>
                          O leitor converte dados de coletores brutas de forma automatizada.
                        </div>
                      </div>
                    )}

                  </div>

                </div>

                {/* Scanned conversion messages with status */}
                {formattingMsg && (
                  <div className={cn(
                    "text-white text-[10px] px-4 py-3 rounded-xl shadow-md duration-300 flex items-start gap-2.5 leading-relaxed leading-snug animate-in slide-in-from-top-1",
                    activePreset.bg
                  )}>
                    <HelpCircle size={15} className="shrink-0 mt-0.5" />
                    <div>
                      <span className="font-extrabold block mb-0.5">Autofiltro Industrial Aplicado:</span>
                      {formattingMsg}
                    </div>
                  </div>
                )}

              </div>
            ) : (
              /* Beautiful Empty Onboarding Screen instructing clearly how to start */
              <div className="p-12 text-center max-w-lg mx-auto py-16 space-y-6">
                <div className="w-16 h-16 bg-slate-100 text-slate-400 border border-slate-200 rounded-2xl flex items-center justify-center mx-auto shadow-xs">
                  <Workflow size={32} className="opacity-70 animate-pulse text-blue-500" />
                </div>
                
                <div className="space-y-2">
                  <h3 className="text-base font-extrabold text-slate-800">Fluxo de Trabalho Inteligente</h3>
                  <p className="text-xs text-slate-500 leading-relaxed max-w-md mx-auto">
                    Configure as etapas à esquerda para inicializar a estação de coleta: selecione a <strong className="text-slate-700">Linhagem</strong>, escolha a <strong className="text-slate-700">Data de Produção</strong> e então selecione ou crie um <strong className="text-slate-700">Contêiner</strong>.
                  </p>
                </div>

                <div className="bg-slate-50 rounded-xl p-3 border border-slate-100 max-w-sm mx-auto text-left space-y-2.5">
                  <div className="flex items-center gap-2">
                    <span className="w-4 h-4 rounded bg-slate-200 text-slate-650 text-[9px] font-black flex items-center justify-center shrink-0">1</span>
                    <span className="text-[10px] font-bold text-slate-600">Escolha Linhagem & Data de Produção</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="w-4 h-4 rounded bg-slate-200 text-slate-650 text-[9px] font-black flex items-center justify-center shrink-0">2</span>
                    <span className="text-[10px] font-bold text-slate-600">Monte ou ative um Compartimento</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="w-4 h-4 rounded bg-slate-200 text-slate-650 text-[9px] font-black flex items-center justify-center shrink-0">3</span>
                    <span className="text-[10px] font-bold text-slate-600">Comece a bipar códigos na tela!</span>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Section 4: Items Scanned List & Local Search Query */}
          {selectedContainer && (
            <div className="bg-white rounded-2xl border border-slate-200 p-6 space-y-6 shadow-xs">
              
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h3 className="text-sm font-extrabold text-slate-800 flex items-center gap-1.5">
                    Histórico de Leituras 
                    <span className="text-[10px] bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full font-black border border-slate-200">
                      {filteredItems.length} registros
                    </span>
                  </h3>
                  <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wide mt-1">Registrados neste lote de produção</p>
                </div>

                <div className="flex items-center gap-3 self-end sm:self-auto">
                  {/* View mode toggle */}
                  <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-150">
                    <button
                      onClick={() => setViewMode('table')}
                      className={cn(
                        "p-1.5 rounded-lg transition-all",
                        viewMode === 'table' ? "bg-white text-slate-900 shadow-sm" : "text-slate-400 hover:text-slate-600"
                      )}
                      title="Exibição em Tabela (Paginado)"
                    >
                      <List size={16} />
                    </button>
                    <button
                      onClick={() => setViewMode('cards')}
                      className={cn(
                        "p-1.5 rounded-lg transition-all",
                        viewMode === 'cards' ? "bg-white text-slate-900 shadow-sm" : "text-slate-400 hover:text-slate-600"
                      )}
                      title="Exibição em Grade (Cards)"
                    >
                      <LayoutGrid size={16} />
                    </button>
                  </div>

                  <button 
                    onClick={onDeleteContainer} 
                    disabled={isFinalized}
                    className={cn(
                      "text-[10px] font-black uppercase tracking-widest flex items-center gap-1 transition-colors shrink-0",
                      isFinalized 
                        ? "text-slate-350 cursor-not-allowed opacity-40 select-none" 
                        : "text-red-500 hover:text-red-650"
                    )}
                    title={isFinalized ? "Este contêiner está finalizado e não pode ser limpo." : "Excluir permanentemente todos os registros deste contêiner."}
                  >
                    <Trash2 size={13} className="shrink-0" /> Limpar Container
                  </button>
                </div>
              </div>

              {/* Filtering Controls */}
              <div className="flex flex-col sm:flex-row gap-3 items-center">
                {/* Search query input */}
                <div className="relative flex-1 w-full">
                  <input 
                    type="text" 
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Pesquisar por valor ou parte do lote lido..."
                    className="w-full bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl pl-9 pr-4 py-2.5 text-xs font-bold text-slate-800 outline-none transition focus:ring-2 focus:ring-offset-1 focus:bg-white focus:ring-blue-500/20"
                  />
                  <Search size={14} className="absolute left-3 top-3.5 text-slate-400" />
                </div>

                {/* Density selector for items per page */}
                {viewMode === 'table' && (
                  <div className="flex items-center gap-2 shrink-0 text-xs w-full sm:w-auto justify-end">
                    <span className="text-[10px] font-extrabold uppercase tracking-widest text-slate-400">Exibir:</span>
                    <select
                      value={itemsPerPage}
                      onChange={(e) => {
                        setItemsPerPage(Number(e.target.value));
                        setCurrentPage(1);
                      }}
                      className="bg-slate-50 border border-slate-205 rounded-xl px-2.5 py-2 text-xs font-black text-slate-705 outline-none hover:bg-slate-100 transition"
                    >
                      <option value={5}>5 / pág</option>
                      <option value={10}>10 / pág</option>
                      <option value={25}>25 / pág</option>
                      <option value={50}>50 / pág</option>
                    </select>
                  </div>
                )}
              </div>

              {/* Conditional rendering based on select view */}
              {viewMode === 'table' ? (
                /* Elegant Interactive Paginated Data Table */
                <div className="space-y-4">
                  <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-xs">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="bg-slate-50/70 border-b border-slate-200 text-[10px] font-black uppercase tracking-wider text-slate-500">
                          <th className="py-3 px-4 w-12 text-center text-slate-400">#</th>
                          {(isNfeMode || items.some(i => i.nfeData)) ? (
                            <>
                              <th className="py-3 px-4 min-w-[200px]">Chave NF-e / Emissão</th>
                              <th className="py-3 px-4">Emitente</th>
                              <th className="py-3 px-4">Destinatário</th>
                              <th className="py-3 px-4 text-center">Volumes</th>
                            </>
                          ) : (
                            <>
                              <th className="py-3 px-4 w-28">Tipo</th>
                              <th className="py-3 px-4">Código / Valor Lido</th>
                              <th className="py-3 px-4 w-36">Visualização</th>
                            </>
                          )}
                          <th className="py-3 px-4 w-40">Lido em (Horário)</th>
                          <th className="py-3 px-4 w-24 text-right">Ações</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 text-xs text-slate-705">
                        {paginatedItems.map((item, index) => {
                          const originalIdx = items.indexOf(item);
                          const isQR = !/^\d+$/.test(item.t);
                          const formattedTime = formatTimestamp(item.ts);
                          const seqNum = (currentPage - 1) * itemsPerPage + index + 1;
                          const seqFormatted = String(seqNum).padStart(2, '0');
                          const hasNfe = (isNfeMode || items.some(i => i.nfeData));
                          const nfe = item.nfeData;

                          return (
                            <tr 
                              key={item.ts + '-' + originalIdx} 
                              className="hover:bg-slate-100/50 transition duration-150 group"
                            >
                              {/* Sequence column */}
                              <td className="py-3 px-4 text-center font-mono text-[10px] font-semibold text-slate-400">
                                {seqFormatted}
                              </td>

                              {hasNfe ? (
                                <>
                                  <td className="py-3 px-4 font-mono font-bold text-slate-700 break-all min-w-[200px]">
                                    <div className="flex flex-col gap-1">
                                      <div className="flex items-center gap-1.5 line-clamp-2">
                                        <span title={item.t}>{item.t}</span>
                                        <button
                                          onClick={() => handleCopyToClipboard(item.t)}
                                          className="p-1 hover:bg-slate-100 text-slate-400 hover:text-slate-750 rounded-md transition shrink-0"
                                          title="Copiar Chave"
                                        >
                                          {copiedText === item.t ? <Check size={11} className="text-emerald-600 stroke-[3]" /> : <Copy size={11} />}
                                        </button>
                                      </div>
                                      {nfe ? <span className="text-[9px] text-emerald-600 bg-emerald-50 w-fit px-1.5 py-0.5 rounded border border-emerald-200">✅ DADOS RECUPERADOS</span> : <span className="text-[9px] text-amber-600 bg-amber-50 w-fit px-1.5 py-0.5 rounded border border-amber-200">⚠️ SOMENTE CHAVE</span>}
                                    </div>
                                  </td>
                                  <td className="py-3 px-4 font-bold text-slate-600">
                                    <span className="line-clamp-2" title={nfe?.emitente?.nome}>{nfe?.emitente?.nome || "-"}</span>
                                  </td>
                                  <td className="py-3 px-4 font-bold text-slate-600">
                                    <span className="line-clamp-2" title={nfe?.destinatario?.nome}>{nfe?.destinatario?.nome || "-"}</span>
                                  </td>
                                  <td className="py-3 px-4 text-center font-black text-slate-800 text-sm">
                                    {nfe?.volumes || "1"}
                                  </td>
                                </>
                              ) : (
                                <>
                                  {/* Code Type Tag column */}
                                  <td className="py-3 px-4 font-bold">
                                    <span className={cn(
                                      "inline-flex items-center gap-1.5 px-2 py-1 rounded-lg text-[9px] font-black uppercase tracking-wider border",
                                      isQR 
                                        ? "bg-slate-100 text-slate-705 border-slate-200" 
                                        : "bg-amber-50 text-amber-700 border-amber-200/60"
                                    )}>
                                      {isQR ? <QrCode size={11} /> : <span className="font-mono stroke-[3]">||</span>}
                                      {isQR ? "QR Code" : "Numérico"}
                                    </span>
                                  </td>

                                  {/* Text Value with Copy inline element */}
                                  <td className="py-3 px-4 font-mono font-bold text-slate-800 break-all select-all">
                                    <div className="flex items-center gap-1.5 max-w-lg">
                                      <span className="truncate" title={item.t}>{item.t}</span>
                                      <button
                                        onClick={() => handleCopyToClipboard(item.t)}
                                        className="p-1 hover:bg-slate-100 text-slate-400 hover:text-slate-750 rounded-md transition shrink-0"
                                        title="Copiar para área de transferência"
                                      >
                                        {copiedText === item.t ? (
                                          <Check size={11} className="text-emerald-600 stroke-[3]" />
                                        ) : (
                                          <Copy size={11} />
                                        )}
                                      </button>
                                    </div>
                                  </td>

                                  {/* Tiny Interactive Inline graphic column */}
                                  <td className="py-1.5 px-4">
                                    <div className="flex items-center gap-2">
                                      <div className="bg-white border border-slate-150 p-1 rounded-lg shadow-2xs hover:scale-130 transition duration-150 origin-left">
                                        {isQR ? (
                                          <QRCodeSVG value={item.t} size={28} level="M" />
                                        ) : (
                                          <div className="scale-[0.55] -my-1 origin-center w-20 flex justify-center h-5">
                                            <Barcode value={item.t} width={1.1} height={20} fontSize={0} margin={0} />
                                          </div>
                                        )}
                                      </div>
                                    </div>
                                  </td>
                                </>
                              )}

                              {/* Reading Calendar timestamp */}
                              <td className="py-3 px-4 font-bold text-slate-450 text-[10px] uppercase tracking-wider font-mono">
                                {formattedTime}
                              </td>

                              {/* Actions on row */}
                              <td className="py-2 px-4 text-right">
                                <div className="flex items-center justify-end gap-1.5">
                                  {item.nfeData && onDownloadDanfePDF && (
                                    <button
                                      onClick={() => onDownloadDanfePDF([item])}
                                      title="Baixar DANFE (Nota Fiscal PDF)"
                                      className="p-1.5 bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/20 dark:hover:bg-emerald-950/40 text-emerald-650 dark:text-emerald-400 rounded-lg transition border border-emerald-200/50"
                                    >
                                      <FileText size={11} className="stroke-[2.5]" />
                                    </button>
                                  )}
                                  {!isFinalized ? (
                                    <>
                                      <button 
                                        onClick={() => onEditItem(originalIdx, item.t)}
                                        title="Editar manualmente o registro"
                                        className="p-1.5 bg-slate-100 hover:bg-slate-200 text-slate-750 rounded-lg transition"
                                      >
                                        <Plus size={11} className="rotate-45 stroke-[2.5]" />
                                      </button>
                                      <button 
                                        onClick={() => onDeleteItem(originalIdx)}
                                        title="Eliminar este código permanentemente"
                                        className="p-1.5 bg-red-50 hover:bg-red-500 hover:text-white text-red-650 rounded-lg transition border border-transparent"
                                      >
                                        <Trash2 size={11} />
                                      </button>
                                    </>
                                  ) : (
                                    <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1 opacity-75">
                                      <Lock size={10} /> Selado
                                    </span>
                                  )}
                                </div>
                              </td>

                            </tr>
                          );
                        })}
                        {paginatedItems.length === 0 && (
                          <tr>
                            <td colSpan={6} className="py-16 text-center text-slate-400 bg-slate-50/50">
                              <FolderOpen size={36} className="mx-auto mb-3 opacity-20" />
                              <p className="text-xs font-semibold text-slate-500">
                                {searchQuery.trim() ? "Nenhum resultado corresponde à pesquisa" : "Compartimento vazio. Bipe novos códigos!"}
                              </p>
                              {searchQuery.trim() && (
                                <button 
                                  onClick={() => setSearchQuery('')}
                                  className="mt-2 text-[10px] font-black text-blue-500 hover:underline uppercase tracking-wider"
                                >
                                  Limpar filtros de busca
                                </button>
                              )}
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>

                  {/* Table Pagination Controls bar with descriptive range details */}
                  {filteredItems.length > 0 && (
                    <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-slate-50/50 border border-slate-200 rounded-xl px-4 py-3 text-xs w-full">
                      <div className="text-[11px] font-bold text-slate-500">
                        Mostrando <strong className="text-slate-800">{String((currentPage - 1) * itemsPerPage + 1).padStart(2, '0')}</strong> a{" "}
                        <strong className="text-slate-800">
                          {String(Math.min(currentPage * itemsPerPage, filteredItems.length)).padStart(2, '0')}
                        </strong>{" "}
                        de <strong className="text-slate-800">{filteredItems.length}</strong> registros
                      </div>

                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                          disabled={currentPage === 1}
                          className={cn(
                            "p-2 bg-white border border-slate-200 rounded-xl transition hover:bg-slate-100 disabled:opacity-45 disabled:hover:bg-white flex items-center gap-1 text-[10px] font-black uppercase tracking-wider",
                            currentPage === 1 ? "cursor-not-allowed text-slate-350" : "text-slate-705"
                          )}
                        >
                          <ChevronLeft size={12} className="stroke-[3]" /> Anterior
                        </button>

                        <div className="flex items-center gap-1">
                          {paginationRange.map((p, idx) => {
                            if (p === "...") {
                              return (
                                <span key={`ellipsis-${idx}`} className="px-1 text-slate-400 font-bold text-xs">
                                  ...
                                </span>
                              );
                            }
                            const isCurrent = currentPage === p;
                            return (
                              <button
                                key={`page-${p}`}
                                onClick={() => setCurrentPage(p as number)}
                                className={cn(
                                  "w-8 h-8 rounded-xl text-xs font-black transition flex items-center justify-center",
                                  isCurrent 
                                    ? `${activePreset.bg} text-white shadow-sm` 
                                    : "bg-white hover:bg-slate-100 text-slate-650 border border-slate-200"
                                )}
                              >
                                {p}
                              </button>
                            );
                          })}
                        </div>

                        <button
                          onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                          disabled={currentPage === totalPages}
                          className={cn(
                            "p-2 bg-white border border-slate-200 rounded-xl transition hover:bg-slate-100 disabled:opacity-45 disabled:hover:bg-white flex items-center gap-1 text-[10px] font-black uppercase tracking-wider",
                            currentPage === totalPages ? "cursor-not-allowed text-slate-350" : "text-slate-705"
                          )}
                        >
                          Próximo <ChevronRight size={12} className="stroke-[3]" />
                        </button>
                      </div>
                    </div>
                  )}

                </div>
              ) : (
                /* Elegant Items Grid Cards layout as alternative */
                <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4">
                  {filteredItems.map((item) => {
                    const originalIdx = items.indexOf(item);
                    return (
                      <QRItemCard 
                        key={item.ts + '-' + originalIdx} 
                        item={item} 
                        onEdit={(text) => onEditItem(originalIdx, text)}
                        onDelete={() => onDeleteItem(originalIdx)}
                        disabled={isFinalized}
                        onDownloadDanfe={onDownloadDanfePDF ? () => onDownloadDanfePDF([item]) : undefined}
                      />
                    );
                  })}
                  {filteredItems.length === 0 && (
                    <div className="col-span-full py-16 text-center text-slate-400 bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                      <FolderOpen size={42} className="mx-auto mb-3 opacity-15" />
                      <p className="text-xs font-semibold text-slate-500">
                        {searchQuery.trim() ? "Nenhum resultado corresponde à pesquisa" : "Compartimento vazio. Comece a ler os códigos!"}
                      </p>
                      {searchQuery.trim() && (
                        <button 
                          onClick={() => setSearchQuery('')}
                          className="mt-2 text-[10px] font-bold text-blue-500 hover:underline"
                        >
                          Limpar pesquisa
                        </button>
                      )}
                    </div>
                  )}
                </div>
              )}

            </div>
          )}

        </div>

      </div>

    </div>
  );
}

interface QRItemCardProps {
  item: QRItem;
  onEdit: (t: string) => void;
  onDelete: () => void;
  disabled?: boolean;
  onDownloadDanfe?: () => void;
}

const QRItemCard: React.FC<QRItemCardProps> = ({item, onEdit, onDelete, disabled, onDownloadDanfe}) => {
  const isQR = !/^\d+$/.test(item.t);
  
  return (
    <div className={cn(
      "group relative bg-white border rounded-xl p-3.5 shadow-xs hover:shadow-md transition duration-200 hover:-translate-y-0.5 active:translate-y-0 border-slate-100 flex flex-col items-center justify-between h-[185px] overflow-hidden",
      disabled ? "border-emerald-100 opacity-90 shadow-none hover:shadow-none hover:translate-y-0" : "border-slate-100"
    )}>
      
      {item.nfeData && onDownloadDanfe && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onDownloadDanfe();
          }}
          title="Baixar DANFE (Nota Fiscal PDF)"
          className="absolute top-2 left-1.5 p-1 bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg shadow-xs transition cursor-pointer z-10"
        >
          <FileText size={10} />
        </button>
      )}
      
      {/* Time title element */}
      <div className="w-full text-center text-[8.5px] text-slate-400 font-extrabold uppercase tracking-tight select-none">
        {formatTimestamp(item.ts).split(' ')[1]}
      </div>
      
      {/* Code imagery */}
      <div className="flex-1 flex items-center justify-center p-1.5 w-full overflow-hidden select-none">
        {isQR ? (
          <QRCodeSVG value={item.t} size={64} level="M" />
        ) : (
          <div className="scale-65 origin-center">
            <Barcode value={item.t} width={1.1} height={35} fontSize={10} margin={0} />
          </div>
        )}
      </div>
      
      {/* Serial Value presentation */}
      <div className="w-full text-center text-[10px] font-black text-slate-705 truncate px-1.5 bg-slate-50 py-1.5 rounded-lg border border-slate-100 mt-2 hover:bg-slate-105 select-all" title={item.t}>
        {extractLastDigits(item.t, 14)}
      </div>

      {/* Direct inline actions (Only if not closed/finalized) */}
      {!disabled && (
        <div className="absolute top-2 right-1.5 flex gap-1 sm:opacity-0 group-hover:opacity-100 transition-opacity duration-150">
          <button 
            onClick={(e) => {
              e.stopPropagation();
              onEdit(item.t);
            }}
            title="Editar código manually"
            className="p-1 bg-white border border-slate-200 text-slate-600 rounded-lg shadow-xs hover:bg-slate-100 hover:text-slate-900 duration-150"
          >
            <Plus size={10} className="rotate-45 stroke-[2.5]" />
          </button>
          <button 
            onClick={(e) => {
              e.stopPropagation();
              onDelete();
            }}
            title="Excluir código"
            className="p-1 bg-red-500 text-white rounded-lg shadow-xs hover:bg-red-650 hover:border-red-600 duration-150 border border-transparent"
          >
            <Trash2 size={10} />
          </button>
        </div>
      )}
    </div>
  );
}
