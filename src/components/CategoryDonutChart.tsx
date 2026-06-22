/**
 * Desenvolvido por José Felipe A. Barroso (pixdobarroso@gmail.com)
 */

import React, { useMemo } from 'react';
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip } from 'recharts';
import { QRStorage } from '../types';
import { getCategoryColorId, COLOR_PRESETS } from '../lib/colors';
import { PieChart as PieIcon, Layers, Info } from 'lucide-react';
import { cn } from '../lib/utils';

interface CategoryDonutChartProps {
  storage: QRStorage;
}

export const CategoryDonutChart: React.FC<CategoryDonutChartProps> = ({ storage }) => {
  const getCatColor = (catName: string) => {
    const colorId = getCategoryColorId(catName, storage);
    return COLOR_PRESETS[colorId]?.hex || '#3b82f6';
  };

  const donutData = useMemo(() => {
    const counts: Record<string, number> = {};
    let grandTotal = 0;

    Object.entries(storage).forEach(([catName, catObj]) => {
      if (catName.startsWith('_')) return;
      let catTotal = 0;
      Object.entries(catObj).forEach(([_, dateObj]) => {
        Object.values(dateObj).forEach((container: any) => {
          if (container && Array.isArray(container.items)) {
            catTotal += container.items.length;
          }
        });
      });
      if (catTotal > 0) {
        counts[catName] = catTotal;
        grandTotal += catTotal;
      }
    });

    return {
      total: grandTotal,
      data: Object.entries(counts).map(([name, value]) => ({
        name,
        value,
        percentage: grandTotal > 0 ? (value / grandTotal) * 100 : 0,
        color: getCatColor(name)
      })).sort((a, b) => b.value - a.value)
    };
  }, [storage]);

  const { total: grandTotal, data: chartData } = donutData;

  return (
    <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-6 space-y-5 dark:bg-slate-900 dark:border-slate-800">
      <div className="flex items-center justify-between px-2">
        <div className="space-y-0.5">
          <div className="flex items-center gap-2">
            <PieIcon size={18} className="text-amber-500 animate-pulse" />
            <h3 className="text-sm font-black text-slate-800 dark:text-slate-100 uppercase tracking-tight">Carga por Categoria</h3>
          </div>
          <p className="text-[10px] text-slate-500 dark:text-slate-400 font-bold uppercase tracking-widest">Distribuição percentual do trabalho realizado</p>
        </div>
        <div className="flex items-center gap-1 text-[9px] font-black text-slate-450 uppercase tracking-widest bg-slate-50 dark:bg-slate-850 border border-slate-100 dark:border-slate-800 px-2 py-1 rounded-lg">
          <Layers size={11} className="text-slate-400" />
          <span>{chartData.length} Ativas</span>
        </div>
      </div>

      {grandTotal === 0 ? (
        <div className="h-64 flex flex-col items-center justify-center bg-slate-50/50 dark:bg-slate-950/20 rounded-2xl border border-dashed border-slate-200 dark:border-slate-800 p-6 text-center">
          <PieIcon size={40} className="text-slate-300 dark:text-slate-700 mb-2 stroke-[1.5]" />
          <p className="text-slate-400 dark:text-slate-500 font-extrabold text-[10px] uppercase tracking-widest">Nenhuma leitura registrada</p>
          <p className="text-slate-400 dark:text-slate-600 text-[9px] font-medium mt-1">Insira códigos de barra nas coletas ativas para gerar as estatísticas do painel.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-5 gap-6 items-center">
          {/* Donut Chart visual column */}
          <div className="md:col-span-2 relative flex items-center justify-center">
            <div className="w-full h-48 relative">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Tooltip
                    content={({ active, payload }) => {
                      if (active && payload && payload.length) {
                        const data = payload[0].payload;
                        return (
                          <div className="bg-slate-950/90 text-white backdrop-blur-md px-3 py-2 rounded-2xl shadow-xl border border-slate-800 text-xs font-sans min-w-[124px]">
                            <p className="font-extrabold text-[9px] uppercase tracking-widest text-slate-400 mb-1">{data.name}</p>
                            <div className="flex items-center justify-between gap-4">
                              <span className="font-bold">{data.value} itens</span>
                              <span className="font-black text-amber-400">{data.percentage.toFixed(1)}%</span>
                            </div>
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                  <Pie
                    data={chartData}
                    cx="50%"
                    cy="50%"
                    innerRadius={55}
                    outerRadius={75}
                    paddingAngle={3}
                    dataKey="value"
                  >
                    {chartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} stroke={entry.color} strokeWidth={1} style={{ outline: 'none' }} />
                    ))}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>

              {/* Absolute Center Label */}
              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none select-none">
                <span className="text-2xl font-black text-slate-850 dark:text-slate-50 tracking-tight leading-none">
                  {grandTotal}
                </span>
                <span className="text-[8px] font-extrabold text-slate-400 dark:text-slate-500 tracking-widest uppercase mt-1">
                  Total Geral
                </span>
              </div>
            </div>
          </div>

          {/* Table/Pills Legend list column */}
          <div className="md:col-span-3 space-y-2.5 max-h-[220px] overflow-y-auto pr-1">
            {chartData.map((item, index) => (
              <div 
                key={index} 
                className={cn(
                  "flex items-center justify-between p-2.5 rounded-2xl bg-slate-50/50 dark:bg-slate-950/20 border border-slate-100 dark:border-slate-800 shadow-3xs transition-all hover:translate-x-0.5"
                )}
              >
                <div className="flex items-center gap-3 overflow-hidden">
                  <div 
                    className="w-3 h-3 rounded-full shrink-0 shadow-3xs" 
                    style={{ backgroundColor: item.color }} 
                  />
                  <span className="text-xs font-bold text-slate-750 dark:text-slate-300 truncate tracking-tight">
                    {item.name}
                  </span>
                </div>
                
                <div className="flex items-center gap-3.5 pl-2 shrink-0">
                  {/* Small visual percentage line progress bar */}
                  <div className="w-12 h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden hidden sm:block">
                    <div 
                      className="h-full rounded-full" 
                      style={{ 
                        backgroundColor: item.color,
                        width: `${item.percentage}%` 
                      }} 
                    />
                  </div>

                  <span className="text-[10px] font-mono font-black text-slate-800 dark:text-slate-100">
                    {item.value} <span className="text-slate-400 dark:text-slate-500 font-bold ml-0.5">({item.percentage.toFixed(1)}%)</span>
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
