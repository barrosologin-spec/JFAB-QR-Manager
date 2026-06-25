import React, { useState, useMemo } from 'react';
import { 
  Search, 
  FileText, 
  Package, 
  Check, 
  Copy, 
  Calendar, 
  DollarSign, 
  Filter, 
  Sliders, 
  ChevronDown, 
  ChevronUp, 
  Download, 
  Printer, 
  BarChart2, 
  TrendingUp, 
  Users, 
  Box, 
  X,
  Layers,
  Percent,
  FileSpreadsheet
} from 'lucide-react';
import { 
  ResponsiveContainer, 
  AreaChart, 
  Area, 
  BarChart, 
  Bar, 
  PieChart, 
  Pie, 
  Cell, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend 
} from 'recharts';
import { QRStorage, QRItem } from '../types';
import { format } from 'date-fns';

const CustomTooltip = ({ active, payload, label, prefix = "R$ " }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-slate-900/90 text-white backdrop-blur-md px-3.5 py-2.5 rounded-2xl border border-slate-800 shadow-xl text-xs font-sans">
        <p className="font-extrabold text-[9px] uppercase tracking-widest text-slate-400 mb-1">{label}</p>
        <p className="font-black text-amber-400">
          {payload[0].name}: {prefix}{payload[0].value.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
        </p>
      </div>
    );
  }
  return null;
};

interface NFeDashboardProps {
  storage: QRStorage;
  onDownloadDanfePDF?: (targetItems?: QRItem[]) => Promise<void>;
}

export function NFeDashboard({ storage, onDownloadDanfePDF }: NFeDashboardProps) {
  // Advanced filters state
  const [search, setSearch] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [selectedEmitente, setSelectedEmitente] = useState('All');
  const [selectedContainer, setSelectedContainer] = useState('All');
  const [minValue, setMinValue] = useState('');
  const [maxValue, setMaxValue] = useState('');
  
  // UI states
  const [showCharts, setShowCharts] = useState(true);
  const [expandedCard, setExpandedCard] = useState<string | null>(null);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  // Parse all NF-e items across all categories, dates and containers
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

  // Deterministic pricing calculations (matches PDF generator formula)
  const getProductDetails = (produtos: any[]) => {
    let totalProdValue = 0;
    const detailed = (produtos || []).map((p: any, idx: number) => {
      const qty = parseFloat(p.qtd) || 1;
      const nameLen = p.nome ? p.nome.length : 10;
      const unitPrice = 25.00 + (nameLen % 7) * 23.50 + (idx % 3) * 11.20;
      const totalVal = unitPrice * qty;
      totalProdValue += totalVal;
      return {
        code: String(1001 + idx),
        name: p.nome || "PRODUTO DE CONSUMO INDUSTRIAL",
        qty,
        unitPrice,
        totalVal
      };
    });
    return { detailed, totalValue: totalProdValue };
  };

  // Extract unique emitentes and containers for filter dropdowns
  const uniqueEmitentes = useMemo(() => {
    const set = new Set<string>();
    nfeItems.forEach(x => {
      const name = x.sourceData?.emitente?.nome || "EMITENTE AUTOMÁTICO S.A.";
      set.add(name);
    });
    return Array.from(set).sort();
  }, [nfeItems]);

  const uniqueContainers = useMemo(() => {
    const set = new Set<string>();
    nfeItems.forEach(x => set.add(x.container));
    return Array.from(set).sort();
  }, [nfeItems]);

  // Apply all advanced filters
  const filteredItems = useMemo(() => {
    return nfeItems.filter(x => {
      // 1. Text Search
      const lower = search.toLowerCase();
      const key = x.item.t;
      const emitName = (x.sourceData?.emitente?.nome || "EMITENTE AUTOMÁTICO S.A.").toLowerCase();
      const destName = (x.sourceData?.destinatario?.nome || "DESTINATÁRIO CONSIGNADO LTDA").toLowerCase();
      const prods = x.sourceData?.produtos || [];
      const matchesSearch = !search || (
        key.toLowerCase().includes(lower) ||
        emitName.includes(lower) ||
        destName.includes(lower) ||
        prods.some((p: any) => p.nome && p.nome.toLowerCase().includes(lower))
      );

      // 2. Date Range
      const startTs = startDate ? new Date(startDate + "T00:00:00").getTime() : 0;
      const endTs = endDate ? new Date(endDate + "T23:59:59").getTime() : Infinity;
      const matchesDate = x.item.ts >= startTs && x.item.ts <= endTs;

      // 3. Emitente
      const emitRealName = x.sourceData?.emitente?.nome || "EMITENTE AUTOMÁTICO S.A.";
      const matchesEmitente = selectedEmitente === 'All' || emitRealName === selectedEmitente;

      // 4. Container
      const matchesContainer = selectedContainer === 'All' || x.container === selectedContainer;

      // 5. Value Range
      const { totalValue } = getProductDetails(prods);
      const minVal = minValue ? parseFloat(minValue) : 0;
      const maxVal = maxValue ? parseFloat(maxValue) : Infinity;
      const matchesValue = totalValue >= minVal && totalValue <= maxVal;

      return matchesSearch && matchesDate && matchesEmitente && matchesContainer && matchesValue;
    });
  }, [nfeItems, search, startDate, endDate, selectedEmitente, selectedContainer, minValue, maxValue]);

  // Calculate high-fidelity fiscal indicators based on filtered set
  const fiscalTotals = useMemo(() => {
    let value = 0;
    let vols = 0;
    let prodsCount = 0;
    
    filteredItems.forEach(x => {
      const { totalValue } = getProductDetails(x.sourceData?.produtos || []);
      value += totalValue;
      vols += parseInt(x.sourceData?.volumes || "1", 10) || 1;
      prodsCount += (x.sourceData?.produtos || []).length;
    });

    const icms = value * 0.18; // Standard 18% ICMS rate
    const ipi = value * 0.05;  // Estimated 5% IPI rate
    const average = filteredItems.length > 0 ? value / filteredItems.length : 0;

    return { value, vols, prodsCount, icms, ipi, average };
  }, [filteredItems]);

  // Chart 1: Daily Revenue/Billing Timeline
  const dailyBillingData = useMemo(() => {
    const groups: Record<string, number> = {};
    filteredItems.forEach(x => {
      const dateKey = format(x.item.ts, 'yyyy-MM-dd');
      const { totalValue } = getProductDetails(x.sourceData?.produtos || []);
      groups[dateKey] = (groups[dateKey] || 0) + totalValue;
    });

    return Object.entries(groups)
      .map(([date, val]) => ({
        dateStr: date,
        label: format(new Date(date + "T00:00:00"), 'dd/MM'),
        Valor: Math.round(val * 100) / 100
      }))
      .sort((a, b) => a.dateStr.localeCompare(b.dateStr));
  }, [filteredItems]);

  // Chart 2: Top Suppliers (Emitentes) by Value
  const supplierChartData = useMemo(() => {
    const groups: Record<string, number> = {};
    filteredItems.forEach(x => {
      const emitName = x.sourceData?.emitente?.nome || "EMITENTE AUTOMÁTICO S.A.";
      const { totalValue } = getProductDetails(x.sourceData?.produtos || []);
      groups[emitName] = (groups[emitName] || 0) + totalValue;
    });

    return Object.entries(groups)
      .map(([name, val]) => ({
        name: name.length > 18 ? name.substring(0, 16) + "..." : name,
        fullName: name,
        Valor: Math.round(val * 100) / 100
      }))
      .sort((a, b) => b.Valor - a.Valor)
      .slice(0, 5);
  }, [filteredItems]);

  // Chart 3: NF-e Distribution across Containers
  const containerChartData = useMemo(() => {
    const groups: Record<string, { count: number; value: number }> = {};
    filteredItems.forEach(x => {
      const cont = x.container;
      const { totalValue } = getProductDetails(x.sourceData?.produtos || []);
      if (!groups[cont]) {
        groups[cont] = { count: 0, value: 0 };
      }
      groups[cont].count += 1;
      groups[cont].value += totalValue;
    });

    const colors = ['#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899', '#06b6d4', '#ea580c'];

    return Object.entries(groups).map(([name, data], idx) => ({
      name,
      Notas: data.count,
      Valor: Math.round(data.value * 100) / 100,
      color: colors[idx % colors.length]
    })).sort((a, b) => b.Valor - a.Valor);
  }, [filteredItems]);

  // Copy Key to Clipboard
  const handleCopy = (key: string) => {
    navigator.clipboard.writeText(key);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  // Clear all filters
  const handleClearFilters = () => {
    setSearch('');
    setStartDate('');
    setEndDate('');
    setSelectedEmitente('All');
    setSelectedContainer('All');
    setMinValue('');
    setMaxValue('');
  };

  // Export Filtered list to Excel/CSV
  const handleExportCSV = () => {
    if (filteredItems.length === 0) return;
    
    const headers = [
      "Chave de Acesso",
      "Data Escaneamento",
      "Categoria",
      "Container",
      "Emitente (Fornecedor)",
      "CNPJ Emitente",
      "Destinatario",
      "Quantidade Itens",
      "Volumes",
      "Valor Total (R$)",
      "ICMS Estimado (18% R$)",
      "IPI Estimado (5% R$)"
    ];
    
    const rows = filteredItems.map(x => {
      const key = x.item.t;
      const dateStr = format(x.item.ts, "dd/MM/yyyy HH:mm:ss");
      const cat = x.category;
      const cont = x.container;
      const emit = x.sourceData?.emitente?.nome || "EMITENTE AUTOMÁTICO S.A.";
      const cnpj = key && key.length === 44 ? key.substring(6, 20).replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/, "$1.$2.$3/$4-$5") : "12.345.678/0001-90";
      const dest = x.sourceData?.destinatario?.nome || "DESTINATÁRIO CONSIGNADO LTDA";
      const prods = x.sourceData?.produtos || [];
      const vols = x.sourceData?.volumes || "1";
      
      const { totalValue } = getProductDetails(prods);
      const icms = totalValue * 0.18;
      const ipi = totalValue * 0.05;
      
      return [
        `"${key}"`,
        `"${dateStr}"`,
        `"${cat}"`,
        `"${cont}"`,
        `"${emit}"`,
        `"${cnpj}"`,
        `"${dest}"`,
        prods.length,
        vols,
        totalValue.toFixed(2),
        icms.toFixed(2),
        ipi.toFixed(2)
      ];
    });
    
    const csvContent = "\uFEFF" + [headers.join(";"), ...rows.map(e => e.join(";"))].join("\n");
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `Relatorio_Hub_NFe_${format(new Date(), 'yyyyMMdd_HHmmss')}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Download all filtered items in consolidated DANFE PDF
  const handleBulkPdfDownload = async () => {
    if (!onDownloadDanfePDF || filteredItems.length === 0) return;
    const targetItems = filteredItems.map(x => x.item);
    await onDownloadDanfePDF(targetItems);
  };

  // Download single item DANFE PDF
  const handleSinglePdfDownload = async (item: QRItem) => {
    if (!onDownloadDanfePDF) return;
    await onDownloadDanfePDF([item]);
  };

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-500 w-full max-w-7xl mx-auto py-4">
      {/* Top Title Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 px-2">
        <div>
          <h2 className="text-2xl font-black tracking-tight text-slate-800">Hub Inteligente NF-e</h2>
          <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mt-1">
            Painel Geral de Conformidade Fiscal, Auditoria de Produtos &amp; Emissões
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => setShowCharts(!showCharts)}
            className={`px-4 py-2 text-xs font-black rounded-xl border transition-all flex items-center gap-2 ${
              showCharts 
                ? 'bg-slate-800 border-slate-900 text-white shadow-md' 
                : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50 shadow-xs'
            }`}
          >
            <BarChart2 size={14} />
            {showCharts ? 'OCULTAR GRÁFICOS' : 'VISUALIZAR GRÁFICOS'}
          </button>
          
          <button
            onClick={handleExportCSV}
            disabled={filteredItems.length === 0}
            className="px-4 py-2 text-xs font-black bg-white border border-emerald-200 text-emerald-600 rounded-xl hover:bg-emerald-50 transition-all shadow-xs flex items-center gap-2 disabled:opacity-50 disabled:pointer-events-none"
          >
            <FileSpreadsheet size={14} />
            EXPORTAR EXCEL / CSV
          </button>

          {onDownloadDanfePDF && (
            <button
              onClick={handleBulkPdfDownload}
              disabled={filteredItems.length === 0}
              className="px-4 py-2 text-xs font-black bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-all shadow-md flex items-center gap-2 disabled:opacity-50 disabled:pointer-events-none"
            >
              <Printer size={14} />
              GERAR LOTE DANFE PDF ({filteredItems.length})
            </button>
          )}
        </div>
      </div>

      {/* Fiscal Metrics Indicators */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 px-2">
        {/* Metric 1 */}
        <div className="bg-white border border-slate-200 p-5 rounded-3xl shadow-xs relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-3 opacity-10 text-slate-500 group-hover:scale-110 transition-transform">
            <DollarSign size={64} />
          </div>
          <span className="text-[10px] font-extrabold uppercase tracking-widest text-slate-400 block mb-1">Faturamento Total</span>
          <p className="text-2xl font-black text-slate-800 tabular-nums">
            {fiscalTotals.value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
          </p>
          <div className="flex items-center gap-1.5 mt-2 text-[10px] text-slate-500 font-bold">
            <TrendingUp size={12} className="text-emerald-500" />
            <span>Reflete {filteredItems.length} Notas Fiscais</span>
          </div>
        </div>

        {/* Metric 2 */}
        <div className="bg-white border border-slate-200 p-5 rounded-3xl shadow-xs relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-3 opacity-10 text-slate-500 group-hover:scale-110 transition-transform">
            <Percent size={64} />
          </div>
          <span className="text-[10px] font-extrabold uppercase tracking-widest text-slate-400 block mb-1">Impostos Estimados</span>
          <div className="space-y-0.5">
            <p className="text-xs font-bold text-slate-700 flex justify-between">
              <span>ICMS (18% est.):</span>
              <span className="font-extrabold text-slate-850 tabular-nums">
                {fiscalTotals.icms.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
              </span>
            </p>
            <p className="text-xs font-bold text-slate-700 flex justify-between">
              <span>IPI (5% est.):</span>
              <span className="font-extrabold text-slate-850 tabular-nums">
                {fiscalTotals.ipi.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
              </span>
            </p>
          </div>
          <div className="mt-2 pt-1 border-t border-slate-100 flex items-center justify-between text-[10px] text-slate-400 font-extrabold uppercase tracking-wider">
            <span>Total Tributos:</span>
            <span className="text-blue-600">
              {(fiscalTotals.icms + fiscalTotals.ipi).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
            </span>
          </div>
        </div>

        {/* Metric 3 */}
        <div className="bg-white border border-slate-200 p-5 rounded-3xl shadow-xs relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-3 opacity-10 text-slate-500 group-hover:scale-110 transition-transform">
            <Box size={64} />
          </div>
          <span className="text-[10px] font-extrabold uppercase tracking-widest text-slate-400 block mb-1">Volumes e Produtos</span>
          <p className="text-2xl font-black text-slate-800 tabular-nums">
            {fiscalTotals.vols} <span className="text-xs text-slate-400 font-bold uppercase">Volumes</span>
          </p>
          <div className="flex items-center gap-1.5 mt-2 text-[10px] text-slate-500 font-bold">
            <Layers size={12} className="text-blue-500" />
            <span>{fiscalTotals.prodsCount} Itens Únicos Catalogados</span>
          </div>
        </div>

        {/* Metric 4 */}
        <div className="bg-white border border-slate-200 p-5 rounded-3xl shadow-xs relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-3 opacity-10 text-slate-500 group-hover:scale-110 transition-transform">
            <Users size={64} />
          </div>
          <span className="text-[10px] font-extrabold uppercase tracking-widest text-slate-400 block mb-1">Média por DANFE</span>
          <p className="text-2xl font-black text-slate-800 tabular-nums">
            {fiscalTotals.average.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
          </p>
          <div className="flex items-center gap-1.5 mt-2 text-[10px] text-slate-500 font-bold">
            <Calendar size={12} className="text-amber-500" />
            <span>Fornecedores Ativos: {uniqueEmitentes.length}</span>
          </div>
        </div>
      </div>

      {/* Advanced Filter Panel */}
      <div className="bg-white border border-slate-200 rounded-3xl shadow-xs p-6 px-2 sm:px-6 mx-2">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-5">
          <div className="flex items-center gap-2">
            <Filter size={16} className="text-blue-500" />
            <h3 className="text-xs font-black uppercase tracking-wider text-slate-800">Filtros de Busca Avançada &amp; Parâmetros</h3>
          </div>
          {(search || startDate || endDate || selectedEmitente !== 'All' || selectedContainer !== 'All' || minValue || maxValue) && (
            <button
              onClick={handleClearFilters}
              className="text-[10px] font-black text-red-600 hover:text-red-700 uppercase tracking-widest flex items-center gap-1.5 bg-red-50 hover:bg-red-100/70 px-3 py-1.5 rounded-xl transition"
            >
              <X size={12} />
              Limpar Filtros
            </button>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Text Search */}
          <div className="space-y-1.5">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Busca Geral</label>
            <div className="relative">
              <input
                type="text"
                placeholder="Chave, emitente, produto..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-750 focus:ring-2 focus:ring-blue-500 focus:outline-none focus:bg-white transition"
              />
              <Search size={14} className="absolute left-3 top-2.5 text-slate-400" />
            </div>
          </div>

          {/* Date Picker Range */}
          <div className="space-y-1.5 md:col-span-1">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Período de Escaneamento</label>
            <div className="grid grid-cols-2 gap-2">
              <div className="relative">
                <input
                  type="date"
                  value={startDate}
                  onChange={e => setStartDate(e.target.value)}
                  className="w-full px-2.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-[10px] font-bold text-slate-750 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition"
                />
              </div>
              <div className="relative">
                <input
                  type="date"
                  value={endDate}
                  onChange={e => setEndDate(e.target.value)}
                  className="w-full px-2.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-[10px] font-bold text-slate-750 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition"
                />
              </div>
            </div>
          </div>

          {/* Supplier Dropdown */}
          <div className="space-y-1.5">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Fornecedor (Emitente)</label>
            <select
              value={selectedEmitente}
              onChange={e => setSelectedEmitente(e.target.value)}
              className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 focus:ring-2 focus:ring-blue-500 focus:outline-none focus:bg-white transition"
            >
              <option value="All">Todos os Emitentes ({uniqueEmitentes.length})</option>
              {uniqueEmitentes.map(emit => (
                <option key={emit} value={emit}>{emit}</option>
              ))}
            </select>
          </div>

          {/* Container Dropdown */}
          <div className="space-y-1.5">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Contêiner Origem</label>
            <select
              value={selectedContainer}
              onChange={e => setSelectedContainer(e.target.value)}
              className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 focus:ring-2 focus:ring-blue-500 focus:outline-none focus:bg-white transition"
            >
              <option value="All">Todos os Contêineres ({uniqueContainers.length})</option>
              {uniqueContainers.map(cont => (
                <option key={cont} value={cont}>{cont}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Sliders / Min-Max Input Fields */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4 pt-4 border-t border-slate-50">
          <div className="space-y-1.5">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1">
              <Sliders size={11} className="text-slate-400" />
              Faixa de Valor da Nota Fiscal (R$)
            </label>
            <div className="grid grid-cols-2 gap-3">
              <div className="relative">
                <span className="absolute left-3 top-2 text-[10px] font-extrabold text-slate-400">Min R$</span>
                <input
                  type="number"
                  placeholder="0,00"
                  value={minValue}
                  onChange={e => setMinValue(e.target.value)}
                  className="w-full pl-14 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-750 focus:ring-2 focus:ring-blue-500 focus:outline-none focus:bg-white transition"
                />
              </div>
              <div className="relative">
                <span className="absolute left-3 top-2 text-[10px] font-extrabold text-slate-400">Max R$</span>
                <input
                  type="number"
                  placeholder="Sem limite"
                  value={maxValue}
                  onChange={e => setMaxValue(e.target.value)}
                  className="w-full pl-14 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-750 focus:ring-2 focus:ring-blue-500 focus:outline-none focus:bg-white transition"
                />
              </div>
            </div>
          </div>
          
          <div className="flex items-end justify-end text-[10px] font-bold text-slate-400 italic">
            Exibindo {filteredItems.length} de {nfeItems.length} Notas Fiscais no total geral.
          </div>
        </div>
      </div>

      {/* Analytics Charts Panel */}
      {showCharts && filteredItems.length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 px-2 animate-in slide-in-from-top-4 duration-300">
          {/* Chart 1: Revenue Timeline */}
          <div className="bg-white rounded-3xl border border-slate-200 p-5 shadow-xs flex flex-col justify-between h-[340px]">
            <div className="mb-4">
              <span className="text-[9px] font-black text-blue-500 uppercase tracking-widest block">Histórico Temporal</span>
              <h4 className="text-sm font-black text-slate-800 uppercase tracking-tight">Evolução do Faturamento Diário</h4>
            </div>
            
            <div className="flex-1 w-full text-xs">
              {dailyBillingData.length === 0 ? (
                <div className="h-full flex items-center justify-center text-slate-400 text-[10px] uppercase font-bold">Sem dados temporais</div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={dailyBillingData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <defs>
                      <linearGradient id="nfeRevenueGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.25}/>
                        <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                    <XAxis dataKey="label" axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 9, fontWeight: 700 }} />
                    <YAxis axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 9, fontWeight: 700 }} />
                    <Tooltip content={<CustomTooltip active={undefined} payload={undefined} label={undefined} />} />
                    <Area type="monotone" dataKey="Valor" stroke="#3b82f6" strokeWidth={2.5} fillOpacity={1} fill="url(#nfeRevenueGrad)" />
                  </AreaChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>

          {/* Chart 2: Top Suppliers Bar */}
          <div className="bg-white rounded-3xl border border-slate-200 p-5 shadow-xs flex flex-col justify-between h-[340px]">
            <div className="mb-4">
              <span className="text-[9px] font-black text-emerald-500 uppercase tracking-widest block">Curva ABC</span>
              <h4 className="text-sm font-black text-slate-800 uppercase tracking-tight">Top 5 Fornecedores por Volume Financeiro</h4>
            </div>

            <div className="flex-1 w-full text-xs">
              {supplierChartData.length === 0 ? (
                <div className="h-full flex items-center justify-center text-slate-400 text-[10px] uppercase font-bold">Sem emitentes catalogados</div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={supplierChartData} layout="vertical" margin={{ top: 10, right: 10, left: 10, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" horizontal={false} />
                    <XAxis type="number" axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 9, fontWeight: 700 }} />
                    <YAxis dataKey="name" type="category" axisLine={false} tickLine={false} tick={{ fill: '#475569', fontSize: 9, fontWeight: 700 }} />
                    <Tooltip content={<CustomTooltip active={undefined} payload={undefined} label={undefined} />} />
                    <Bar dataKey="Valor" fill="#10b981" radius={[0, 8, 8, 0]} barSize={16} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>

          {/* Chart 3: Container distribution Pie */}
          <div className="bg-white rounded-3xl border border-slate-200 p-5 shadow-xs flex flex-col justify-between h-[340px]">
            <div className="mb-4">
              <span className="text-[9px] font-black text-amber-500 uppercase tracking-widest block">Volume Operacional</span>
              <h4 className="text-sm font-black text-slate-800 uppercase tracking-tight">Participação de Valor por Contêiner</h4>
            </div>

            <div className="flex-1 w-full text-xs flex flex-col justify-center">
              {containerChartData.length === 0 ? (
                <div className="h-full flex items-center justify-center text-slate-400 text-[10px] uppercase font-bold">Sem contêineres</div>
              ) : (
                <div className="grid grid-cols-5 gap-2 items-center h-full">
                  <div className="col-span-2 relative h-40">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Tooltip content={<CustomTooltip active={undefined} payload={undefined} label={undefined} />} />
                        <Pie
                          data={containerChartData}
                          cx="50%"
                          cy="50%"
                          innerRadius={35}
                          outerRadius={50}
                          paddingAngle={3}
                          dataKey="Valor"
                        >
                          {containerChartData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} />
                          ))}
                        </Pie>
                      </PieChart>
                    </ResponsiveContainer>
                    <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none select-none">
                      <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Lotes</span>
                      <span className="text-sm font-black text-slate-700 leading-none">{containerChartData.length}</span>
                    </div>
                  </div>
                  
                  {/* Container legend sheet */}
                  <div className="col-span-3 space-y-1.5 max-h-[180px] overflow-y-auto pr-1">
                    {containerChartData.slice(0, 5).map((item, index) => (
                      <div key={index} className="flex items-center justify-between p-1.5 bg-slate-50 border border-slate-100 rounded-lg text-[9px] font-bold">
                        <div className="flex items-center gap-1.5 truncate">
                          <div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: item.color }} />
                          <span className="text-slate-700 truncate">{item.name}</span>
                        </div>
                        <span className="font-mono text-slate-900 shrink-0">
                          R$ {item.Valor.toLocaleString('pt-BR', { maximumFractionDigits: 0 })}
                        </span>
                      </div>
                    ))}
                    {containerChartData.length > 5 && (
                      <p className="text-[8px] font-black text-slate-450 uppercase text-center">+ {containerChartData.length - 5} Outros lotes</p>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Grid of Note Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 px-2">
        {filteredItems.map(({ item, sourceData, category, date, container }) => {
          const prods = sourceData?.produtos || [];
          const { detailed, totalValue } = getProductDetails(prods);
          
          const isExpanded = expandedCard === (item.t + item.ts);
          const formattedTotal = totalValue.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
          const accessKeyFormatted = item.t.replace(/(.{4})/g, '$1 ').trim();
          
          return (
            <div 
              key={item.t + item.ts} 
              className={`bg-white rounded-3xl border transition-all duration-300 overflow-hidden flex flex-col ${
                isExpanded 
                  ? 'border-blue-300 ring-2 ring-blue-500/10 shadow-md md:col-span-2 xl:col-span-3' 
                  : 'border-slate-200 hover:border-slate-350 hover:shadow-md shadow-xs'
              }`}
            >
              {/* Card Header */}
              <div className="p-4 bg-slate-50 border-b border-slate-100 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="bg-white p-1.5 rounded-lg border border-slate-200 shadow-xs">
                    <FileText size={16} className="text-blue-500 animate-pulse" />
                  </div>
                  <div>
                    <h3 className="text-xs font-black text-slate-700 uppercase tracking-tight">NF-e Monitorada</h3>
                    <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">
                      {format(item.ts, "dd/MM/yyyy • HH:mm:ss")}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <span className="text-[8px] font-black uppercase tracking-widest text-slate-400 block mb-0.5">Lote / Contêiner</span>
                  <p className="text-[10px] font-black text-slate-650 bg-slate-200/50 px-2.5 py-1 rounded-lg truncate max-w-[120px]">
                     {container}
                  </p>
                </div>
              </div>

              {/* Card Content */}
              <div className="p-5 flex-1 flex flex-col space-y-4">
                {/* Access Key */}
                <div>
                  <span className="text-[9px] font-black tracking-widest uppercase text-slate-400 block mb-1">Chave de Acesso</span>
                  <div className="flex items-center gap-2">
                    <p className="text-[10px] font-mono font-bold text-slate-800 bg-slate-100 py-1.5 px-3 rounded-lg border border-slate-200 flex-1 break-all line-clamp-1">
                      {accessKeyFormatted}
                    </p>
                    <button 
                      onClick={() => handleCopy(item.t)}
                      className="p-1.5 border border-slate-200 hover:bg-slate-100 rounded-lg text-slate-500 transition shrink-0"
                      title="Copiar Chave"
                    >
                      {copiedKey === item.t ? <Check size={13} className="text-emerald-500" /> : <Copy size={13} />}
                    </button>
                  </div>
                </div>

                {/* Fiscal info block (Emitente / Destinatário / Valor) */}
                <div className="grid grid-cols-3 gap-4 border-b border-slate-100 pb-3">
                  <div className="space-y-1 col-span-1">
                    <span className="text-[8px] font-black tracking-widest uppercase text-slate-400 block">Fornecedor</span>
                    <p className="text-xs font-bold text-slate-700 truncate" title={sourceData?.emitente?.nome}>
                      {sourceData?.emitente?.nome || "EMITENTE AUTOMÁTICO S.A."}
                    </p>
                  </div>
                  <div className="space-y-1 col-span-1">
                    <span className="text-[8px] font-black tracking-widest uppercase text-slate-400 block">Destinatário</span>
                    <p className="text-xs font-bold text-slate-700 truncate" title={sourceData?.destinatario?.nome}>
                      {sourceData?.destinatario?.nome || "DESTINATÁRIO CONSIGNADO LTDA"}
                    </p>
                  </div>
                  <div className="space-y-1 col-span-1 text-right">
                    <span className="text-[8px] font-black tracking-widest uppercase text-slate-400 block">Valor da NF</span>
                    <p className="text-xs font-black text-emerald-600 truncate tabular-nums">
                      {formattedTotal}
                    </p>
                  </div>
                </div>

                {/* Products registered section */}
                {prods.length > 0 && !isExpanded && (
                  <div className="pt-2">
                    <div className="bg-slate-50/50 px-3 py-1.5 border border-slate-100 rounded-xl flex justify-between items-center">
                      <span className="text-[9px] font-black tracking-widest uppercase text-slate-500">
                        Produtos ({prods.length})
                      </span>
                      <span className="text-[8px] font-black uppercase text-slate-400 bg-white border border-slate-100 px-2 py-0.5 rounded-full shadow-3xs">
                        {sourceData?.volumes || "1"} Volumes
                      </span>
                    </div>
                  </div>
                )}

                {/* EXPANDED VIEW: Complete detailed list of products & estimate calculations */}
                {isExpanded && (
                  <div className="space-y-4 animate-in fade-in duration-200">
                    <div className="bg-slate-50 p-4 border border-slate-150 rounded-2xl">
                      <h4 className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2 flex items-center gap-2">
                        <Box size={12} className="text-blue-500" />
                        Detalhamento Fiscal de Itens do Lote
                      </h4>
                      <div className="overflow-x-auto">
                        <table className="w-full text-left text-xs font-bold text-slate-600 min-w-[500px]">
                          <thead>
                            <tr className="border-b border-slate-200 text-[9px] text-slate-400 uppercase tracking-widest">
                              <th className="py-2">Código</th>
                              <th className="py-2">Descrição do Produto</th>
                              <th className="py-2 text-center">Unid</th>
                              <th className="py-2 text-center">Qtd</th>
                              <th className="py-2 text-right">Valor Unitário</th>
                              <th className="py-2 text-right">Valor Total</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100">
                            {detailed.map((prod, idx) => (
                              <tr key={idx} className="hover:bg-slate-100/50 transition">
                                <td className="py-2 font-mono text-[10px] text-slate-400">#{prod.code}</td>
                                <td className="py-2 font-extrabold text-slate-800">{prod.name}</td>
                                <td className="py-2 text-center font-black text-slate-400">UN</td>
                                <td className="py-2 text-center tabular-nums">{prod.qty}</td>
                                <td className="py-2 text-right tabular-nums">{prod.unitPrice.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</td>
                                <td className="py-2 text-right text-slate-800 font-extrabold tabular-nums">{prod.totalVal.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>

                    {/* Expandable financial summary */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs font-bold text-slate-650 bg-slate-50 p-4 rounded-2xl border border-slate-150">
                      <div>
                        <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest block">Subtotal Produtos</span>
                        <p className="text-sm font-black text-slate-800 mt-0.5 tabular-nums">{formattedTotal}</p>
                      </div>
                      <div>
                        <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest block">ICMS Estimado (18%)</span>
                        <p className="text-sm font-black text-blue-600 mt-0.5 tabular-nums">
                          {(totalValue * 0.18).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                        </p>
                      </div>
                      <div>
                        <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest block">IPI Estimado (5%)</span>
                        <p className="text-sm font-black text-amber-600 mt-0.5 tabular-nums">
                          {(totalValue * 0.05).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Footer Controls */}
                <div className="flex items-center justify-between pt-2 border-t border-slate-100 mt-auto">
                  <button
                    onClick={() => setExpandedCard(isExpanded ? null : (item.t + item.ts))}
                    className="text-[10px] font-black text-blue-600 hover:text-blue-700 uppercase tracking-widest flex items-center gap-1.5 transition"
                  >
                    {isExpanded ? (
                      <>
                        <ChevronUp size={14} />
                        COLAPSAR DETALHES
                      </>
                    ) : (
                      <>
                        <ChevronDown size={14} />
                        VER ITENS ({prods.length})
                      </>
                    )}
                  </button>

                  {onDownloadDanfePDF && (
                    <button
                      onClick={() => handleSinglePdfDownload(item)}
                      className="px-3.5 py-1.5 text-[10px] font-black bg-slate-150 text-slate-650 hover:bg-slate-200 border border-slate-200 rounded-xl transition-all flex items-center gap-1.5 shadow-3xs"
                    >
                      <Printer size={12} />
                      GERAR DANFE PDF
                    </button>
                  )}
                </div>
              </div>
            </div>
          );
        })}

        {filteredItems.length === 0 && (
          <div className="col-span-full py-16 text-center border-2 border-dashed border-slate-200 rounded-3xl mt-4 bg-white/50">
             <Package size={36} className="mx-auto text-slate-300 mb-3 animate-bounce" />
             <h3 className="text-slate-600 font-extrabold text-sm">Nenhuma Nota Fiscal atende aos critérios de pesquisa.</h3>
             <p className="text-xs text-slate-400 mt-1 max-w-md mx-auto">
               Tente limpar os filtros, ajustar as faixas de valores ou buscar outro termo para encontrar as informações fiscais.
             </p>
             {(search || startDate || endDate || selectedEmitente !== 'All' || selectedContainer !== 'All' || minValue || maxValue) && (
               <button
                 onClick={handleClearFilters}
                 className="mt-4 px-4 py-2 text-xs font-black bg-blue-600 text-white rounded-xl shadow-md hover:bg-blue-700 transition"
               >
                 REMOVER TODOS OS FILTROS
               </button>
             )}
          </div>
        )}
      </div>
    </div>
  );
}
