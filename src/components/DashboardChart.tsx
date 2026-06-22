/**
 * Desenvolvido por José Felipe A. Barroso (pixdobarroso@gmail.com)
 */

import React, { useMemo, useState } from 'react';
import { 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer, 
  Legend
} from 'recharts';
import { QRStorage } from '../types';
import { getCategoryColorId, COLOR_PRESETS } from '../lib/colors';
import { 
  format, 
  startOfMonth, 
  endOfMonth, 
  eachDayOfInterval, 
  isSameDay, 
  addMonths, 
  subMonths,
  parseISO
} from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { ChevronLeft, ChevronRight, Calendar } from 'lucide-react';

interface DashboardChartProps {
  storage: QRStorage;
}

export const DashboardChart: React.FC<DashboardChartProps> = ({ storage }) => {
  const [viewDate, setViewDate] = useState(new Date());

  const chartData = useMemo(() => {
    const start = startOfMonth(viewDate);
    const end = endOfMonth(viewDate);
    const days = eachDayOfInterval({ start, end });

    return days.map(day => {
      const dayStr = format(day, 'yyyy-MM-dd');
      const data: any = {
        name: format(day, 'dd'),
        fullDate: dayStr,
        total: 0
      };

      Object.entries(storage).forEach(([catName, catObj]) => {
        if (catName.startsWith('_')) return;

        // Check if there's data for this exact day in this category
        Object.entries(catObj).forEach(([dateStr, dateObj]) => {
          if (dateStr === dayStr) {
            Object.values(dateObj).forEach((container: any) => {
              if (container && Array.isArray(container.items)) {
                const count = container.items.length;
                data.total += count;
                data[catName] = (data[catName] || 0) + count;
              }
            });
          }
        });
      });

      return data;
    });
  }, [storage, viewDate]);

  const categories = useMemo(() => {
    const cats = new Set<string>();
    chartData.forEach(d => {
      Object.keys(d).forEach(k => {
        if (k !== 'name' && k !== 'fullDate' && k !== 'total') {
          cats.add(k);
        }
      });
    });
    return Array.from(cats);
  }, [chartData]);

  const getCatColor = (catName: string) => {
    const colorId = getCategoryColorId(catName, storage);
    return COLOR_PRESETS[colorId]?.hex || '#3b82f6';
  };

  const handlePrevMonth = () => setViewDate(prev => subMonths(prev, 1));
  const handleNextMonth = () => setViewDate(prev => addMonths(prev, 1));
  const handleCurrentMonth = () => setViewDate(new Date());

  const totalInMonth = chartData.reduce((acc, d) => acc + d.total, 0);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between bg-slate-50/80 p-2 rounded-2xl border border-slate-100">
        <div className="flex items-center gap-3">
          <button 
            onClick={handlePrevMonth}
            className="p-2 hover:bg-white rounded-xl transition-all hover:shadow-sm text-slate-400 hover:text-slate-600 active:scale-95"
          >
            <ChevronLeft size={18} />
          </button>
          
          <div className="flex flex-col items-center min-w-[120px]">
            <span className="text-xs font-black text-slate-800 uppercase tracking-tight">
              {format(viewDate, 'MMMM yyyy', { locale: ptBR })}
            </span>
            <span className="text-[9px] font-bold text-blue-600 uppercase tracking-widest">
              {totalInMonth} Scans Totais
            </span>
          </div>

          <button 
            onClick={handleNextMonth}
            className="p-2 hover:bg-white rounded-xl transition-all hover:shadow-sm text-slate-400 hover:text-slate-600 active:scale-95"
          >
            <ChevronRight size={18} />
          </button>
        </div>

        <button 
          onClick={handleCurrentMonth}
          className="px-3 py-1.5 bg-white border border-slate-200 rounded-xl text-[10px] font-black text-slate-600 hover:bg-slate-50 transition-all shadow-xs flex items-center gap-1.5"
        >
          <Calendar size={12} />
          HOJE
        </button>
      </div>

      <div className="w-full h-80 pt-2">
        {totalInMonth === 0 ? (
          <div className="h-full flex items-center justify-center bg-slate-50/30 rounded-2xl border-2 border-dashed border-slate-100">
            <div className="text-center">
              <p className="text-slate-300 font-bold text-[10px] uppercase tracking-widest">Nenhum registro em {format(viewDate, 'MMMM', { locale: ptBR })}</p>
            </div>
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="colorTotal" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#1e293b" stopOpacity={0.2}/>
                  <stop offset="95%" stopColor="#1e293b" stopOpacity={0}/>
                </linearGradient>
                {categories.map((cat) => (
                  <linearGradient key={`grad-${cat}`} id={`color-${cat}`} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={getCatColor(cat)} stopOpacity={0.6}/>
                    <stop offset="95%" stopColor={getCatColor(cat)} stopOpacity={0.1}/>
                  </linearGradient>
                ))}
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
              <XAxis 
                dataKey="name" 
                axisLine={false} 
                tickLine={false} 
                tick={{ fill: '#94a3b8', fontSize: 9, fontWeight: 700 }}
                dy={10}
              />
              <YAxis 
                axisLine={false} 
                tickLine={false} 
                tick={{ fill: '#94a3b8', fontSize: 9, fontWeight: 700 }}
                allowDecimals={false}
              />
              <Tooltip 
                cursor={{ stroke: '#cbd5e1', strokeWidth: 1, strokeDasharray: '4 4' }}
                content={({ active, payload, label }) => {
                  if (active && payload && payload.length) {
                    const totalValue = payload.find((p: any) => p.dataKey === 'total')?.value || 0;
                    return (
                      <div className="bg-white/70 backdrop-blur-xl border border-white/60 p-4 rounded-3xl shadow-xl shadow-slate-200/50 min-w-[160px] animate-in zoom-in-95 duration-200">
                        <div className="flex items-center justify-between mb-3 border-b border-slate-200/50 pb-2">
                          <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">Dia {label}</p>
                          <span className="text-[10px] font-black uppercase tracking-widest text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full">{totalValue} TOTAL</span>
                        </div>
                        <div className="space-y-2">
                          {payload.filter((entry: any) => entry.dataKey !== 'total').map((entry: any, index: number) => (
                            <div key={index} className="flex items-center justify-between gap-6">
                              <div className="flex items-center gap-2">
                                <div className="w-2.5 h-2.5 rounded-full shadow-sm" style={{ backgroundColor: entry.color }} />
                                <span className="text-[11px] font-bold text-slate-600">{entry.name}</span>
                              </div>
                              <span className="text-[12px] font-black text-slate-800">{entry.value}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  }
                  return null;
                }}
              />
              <Legend 
                verticalAlign="top" 
                align="right" 
                iconType="circle"
                wrapperStyle={{ paddingBottom: '20px', fontSize: '10px', fontWeight: '800', letterSpacing: '0.025em' }}
              />
              <Area 
                type="monotone" 
                dataKey="total" 
                name="Geral" 
                stroke="#94a3b8" 
                strokeWidth={2}
                strokeDasharray="4 4"
                fillOpacity={0} 
                activeDot={{ r: 0 }}
              />
              {categories.map((cat) => (
                <Area 
                  key={cat}
                  type="monotone" 
                  dataKey={cat} 
                  name={cat} 
                  stroke={getCatColor(cat)} 
                  strokeWidth={3}
                  fillOpacity={1} 
                  fill={`url(#color-${cat})`} 
                  stackId="1"
                  activeDot={{ r: 6, strokeWidth: 0, fill: getCatColor(cat) }}
                />
              ))}
            </AreaChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
};
