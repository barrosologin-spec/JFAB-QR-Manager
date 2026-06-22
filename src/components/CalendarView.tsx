/**
 * Desenvolvido por José Felipe A. Barroso (pixdobarroso@gmail.com)
 */

import {useState, useMemo} from 'react';
import {ChevronLeft, ChevronRight, Calendar as CalendarIcon} from 'lucide-react';
import {format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isSameDay, getDay, addMonths, subMonths} from 'date-fns';
import {ptBR} from 'date-fns/locale';
import {QRStorage} from '../types';
import {cn} from '../lib/utils';

interface CalendarViewProps {
  storage: QRStorage;
}

export function CalendarView({storage}: CalendarViewProps) {
  const [currentMonth, setCurrentMonth] = useState(new Date());

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

  return (
    <div className="mt-12 pt-8 border-t border-gray-200 animate-in slide-in-from-bottom duration-500">
      <div className="flex flex-col md:flex-row justify-between items-center gap-4 mb-8">
        <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
          <CalendarIcon className="text-indigo-600" />
          Calendário de Produção
        </h2>
        
        <div className="flex items-center gap-2 bg-white p-1 rounded-xl shadow-sm border border-gray-200">
          <button 
            onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
            className="p-2 hover:bg-gray-100 rounded-lg transition"
          >
            <ChevronLeft size={20} />
          </button>
          <span className="font-bold text-lg w-40 text-center text-gray-700 capitalize">
            {format(currentMonth, 'MMMM yyyy', {locale: ptBR})}
          </span>
          <button 
            onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
            className="p-2 hover:bg-gray-100 rounded-lg transition"
          >
            <ChevronRight size={20} />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        <div className="p-6 bg-gradient-to-br from-indigo-500 to-indigo-700 rounded-2xl shadow-lg text-white">
          <p className="text-indigo-100 font-medium text-sm uppercase tracking-wider">Total Geral de QR Codes</p>
          <p className="text-4xl font-bold mt-2">{grandTotal}</p>
          <p className="text-xs text-indigo-200 mt-1">Desde o início</p>
        </div>
        <div className="p-6 bg-gradient-to-br from-blue-500 to-blue-700 rounded-2xl shadow-lg text-white">
          <p className="text-blue-100 font-medium text-sm uppercase tracking-wider">Total neste Mês</p>
          <p className="text-4xl font-bold mt-2">{monthTotal}</p>
          <p className="text-xs text-blue-200 mt-1 capitalize">Em {format(currentMonth, 'MMMM', {locale: ptBR})}</p>
        </div>
      </div>

      <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden shadow-sm">
        <div className="grid grid-cols-7 bg-gray-50 border-b border-gray-200">
          {['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'].map(d => (
            <div key={d} className="py-3 text-center text-xs font-semibold text-gray-500 uppercase tracking-wider">{d}</div>
          ))}
        </div>
        
        <div className="grid grid-cols-7 bg-gray-100 gap-px">
          {paddingDays.map(i => (
            <div key={`p-${i}`} className="bg-gray-50/50 h-32" />
          ))}
          
          {days.map(day => {
            const dateStr = format(day, 'yyyy-MM-dd');
            const data = monthStats[dateStr];
            const isToday = isSameDay(day, new Date());
            
            return (
              <div 
                key={dateStr}
                className={cn(
                  "bg-white h-32 p-2 flex flex-col transition-colors group relative",
                  isToday && "bg-blue-50/50 ring-1 ring-inset ring-blue-200"
                )}
              >
                <span className={cn(
                  "text-sm font-semibold",
                  data ? "text-blue-700" : "text-gray-400",
                  isToday && "bg-blue-600 text-white w-6 h-6 flex items-center justify-center rounded-full text-xs"
                )}>
                  {format(day, 'd')}
                </span>
                
                {data ? (
                  <div className="mt-1 flex-1 overflow-y-auto space-y-1 custom-scrollbar">
                    {Object.entries(data.cats).map(([cat, count]) => (
                      <div key={cat} className="flex justify-between items-center text-[10px] bg-indigo-50 text-indigo-700 px-1.5 py-0.5 rounded border border-indigo-100">
                        <span className="truncate max-w-[50px] font-medium" title={cat}>{cat}</span>
                        <span className="font-bold">{count}</span>
                      </div>
                    ))}
                    <div className="absolute bottom-1 right-2 text-[10px] font-bold text-gray-400 bg-white/80 px-1 rounded">
                      {data.total} total
                    </div>
                  </div>
                ) : (
                  <div className="flex-1 flex items-center justify-center text-gray-200 text-sm">-</div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
