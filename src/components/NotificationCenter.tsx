/**
 * Desenvolvido por José Felipe A. Barroso (pixdobarroso@gmail.com)
 */

import { useState } from 'react';
import {X, Bell, AlertTriangle, CheckCircle, Info} from 'lucide-react';
import {motion, AnimatePresence} from 'motion/react';
import {Notification} from '../types';
import {formatTimestamp, cn} from '../lib/utils';

interface NotificationCenterProps {
  isOpen: boolean;
  onClose: () => void;
  notifications: Notification[];
  onClear: () => void;
}

type TabType = 'all' | 'production' | 'errors' | 'duplicates' | 'nfe' | 'designer' | 'calendar' | 'archived';

export function NotificationCenter({isOpen, onClose, notifications, onClear}: NotificationCenterProps) {
  const [activeFilter, setActiveFilter] = useState<TabType>('all');

  const getNotificationTab = (n: Notification): TabType => {
    const title = n.title.toLowerCase();
    const message = n.message.toLowerCase();
    const type = n.type;

    if (title.includes('duplicado') || message.includes('duplicado') || title.includes('duplicate')) {
      return 'duplicates';
    }
    if (title.includes('nf-e') || title.includes('nfe') || message.includes('nf-e') || message.includes('nfe') || title.includes('importa') || message.includes('importa') || title.includes('nota fiscal') || message.includes('nota fiscal')) {
      return 'nfe';
    }
    if (title.includes('placa') || title.includes('layout') || title.includes('impress') || title.includes('etiqueta') || message.includes('placa') || message.includes('layout') || title.includes('gerando placa') || message.includes('gerando placa')) {
      return 'designer';
    }
    if (title.includes('finaliz') || message.includes('finaliz') || title.includes('produção') || message.includes('produção')) {
      return 'calendar';
    }
    if (type === 'error' || title.includes('erro') || message.includes('erro') || title.includes('falhou') || message.includes('falha')) {
      return 'errors';
    }
    if (title.includes('arquiv') || message.includes('arquiv') || title.includes('restaur') || message.includes('restaur')) {
      return 'archived';
    }
    return 'production';
  };

  // Calculate counts for each classification
  const counts = notifications.reduce((acc, curr) => {
    const tabName = getNotificationTab(curr);
    acc[tabName] = (acc[tabName] || 0) + 1;
    return acc;
  }, {} as Record<TabType, number>);

  const filters: { id: TabType; label: string; color: string }[] = [
    { id: 'all', label: 'Todos', color: 'bg-slate-500' },
    { id: 'production', label: 'Painel', color: 'bg-blue-500' },
    { id: 'errors', label: 'Erros', color: 'bg-red-500' },
    { id: 'duplicates', label: 'Duplicados', color: 'bg-amber-500' },
    { id: 'nfe', label: 'NF-e', color: 'bg-emerald-500' },
    { id: 'designer', label: 'Estúdio', color: 'bg-indigo-500' },
    { id: 'calendar', label: 'Produção', color: 'bg-purple-500' },
    { id: 'archived', label: 'Arquivados', color: 'bg-teal-500' },
  ];

  const filteredNotifications = activeFilter === 'all' 
    ? notifications 
    : notifications.filter(n => getNotificationTab(n) === activeFilter);

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div 
            initial={{opacity: 0}}
            animate={{opacity: 1}}
            exit={{opacity: 0}}
            onClick={onClose}
            className="fixed inset-0 bg-black/30 z-40 backdrop-blur-sm"
          />
          <motion.div 
            initial={{translateX: '100%'}}
            animate={{translateX: 0}}
            exit={{translateX: '100%'}}
            className="fixed inset-y-0 right-0 w-full max-w-md bg-white shadow-2xl z-50 flex flex-col pt-safe dark:bg-slate-900"
          >
            <div className="p-4 border-b border-gray-200 dark:border-slate-800 flex justify-between items-center bg-gray-50 dark:bg-slate-900">
              <div className="flex items-center gap-2">
                <Bell size={20} className="text-gray-700 dark:text-slate-300" />
                <h3 className="text-lg font-bold text-gray-800 dark:text-slate-100">Notificações</h3>
              </div>
              <div className="flex gap-2">
                <button 
                  onClick={onClear}
                  className="text-sm text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-300 px-2 py-1 font-medium"
                >
                  Limpar tudo
                </button>
                <button 
                  onClick={onClose}
                  className="text-gray-500 hover:text-gray-700 dark:text-slate-400 dark:hover:text-slate-200 transition-colors p-1"
                >
                  <X size={24} />
                </button>
              </div>
            </div>

            {/* Horizontal Filter Bar */}
            <div className="flex items-center gap-1.5 p-3 overflow-x-auto bg-white dark:bg-slate-900 border-b border-gray-100 dark:border-slate-800 scrollbar-none shrink-0 select-none">
              {filters.map(f => {
                const count = f.id === 'all' ? notifications.length : (counts[f.id] || 0);
                const isActive = activeFilter === f.id;
                return (
                  <button
                    key={f.id}
                    onClick={() => setActiveFilter(f.id)}
                    className={cn(
                      "px-3 py-1.5 rounded-full text-xs font-semibold flex items-center gap-1.5 whitespace-nowrap transition cursor-pointer relative shrink-0",
                      isActive
                        ? "bg-slate-900 text-white dark:bg-slate-200 dark:text-slate-950 shadow-sm"
                        : "bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:hover:bg-slate-700"
                    )}
                  >
                    <span>{f.label}</span>
                    {count > 0 && (
                      <span className={cn(
                        "rounded-full px-1.5 py-0.5 text-[9px] font-bold text-white leading-none min-w-[14px] text-center shrink-0",
                        isActive ? "bg-red-500 bg-opacity-90" : f.color
                      )}>
                        {count}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
            
            <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-100 dark:bg-slate-950/40">
              {filteredNotifications.length === 0 ? (
                <div className="text-center text-gray-500 mt-10 dark:text-slate-400">
                  <Bell size={48} className="mx-auto mb-4 opacity-20" />
                  <p>Nenhuma notificação {activeFilter !== 'all' ? 'nesta aba' : ''}.</p>
                </div>
              ) : (
                filteredNotifications.map((item) => (
                  <div 
                    key={item.id}
                    className={cn(
                      "p-4 rounded-lg bg-white shadow-sm border-l-4 transition-transform hover:scale-[1.01] dark:bg-slate-900",
                      item.type === 'error' ? "border-red-500 bg-red-50/50 dark:bg-red-950/10" :
                      item.type === 'warning' ? "border-yellow-500 bg-yellow-50/50 dark:bg-yellow-950/10" :
                      item.type === 'success' ? "border-green-500 bg-green-50/50 dark:bg-emerald-950/10" :
                      "border-blue-500 bg-blue-50/50 dark:bg-blue-950/10"
                    )}
                  >
                    <div className="flex justify-between items-start mb-1 text-xs text-gray-500 dark:text-slate-400">
                      <div className="flex items-center gap-1 font-bold">
                        {item.type === 'error' && <AlertTriangle size={14} className="text-red-500" />}
                        {item.type === 'warning' && <AlertTriangle size={14} className="text-yellow-600 dark:text-yellow-500" />}
                        {item.type === 'success' && <CheckCircle size={14} className="text-green-500" />}
                        {item.type === 'info' && <Info size={14} className="text-blue-500" />}
                        <span className={cn(
                          item.type === 'error' ? "text-red-700 dark:text-red-400" :
                          item.type === 'warning' ? "text-yellow-700 dark:text-yellow-400" :
                          item.type === 'success' ? "text-green-700 dark:text-emerald-400" :
                          "text-blue-700 dark:text-blue-400"
                        )}>
                          {item.title.toUpperCase()}
                        </span>
                      </div>
                      <span>{formatTimestamp(item.ts)}</span>
                    </div>
                    <div className="text-sm font-medium text-gray-800 dark:text-slate-200 break-words">
                      {item.message}
                    </div>
                  </div>
                ))
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
