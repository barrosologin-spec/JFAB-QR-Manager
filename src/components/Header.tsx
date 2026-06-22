import {Bell, Settings} from 'lucide-react';
import {ColorPreset} from '../lib/colors';
import {cn} from '../lib/utils';

interface HeaderProps {
  onOpenNotifications: () => void;
  onOpenSettings: () => void;
  notificationCount: number;
  activePreset: ColorPreset;
}

export function Header({onOpenNotifications, onOpenSettings, notificationCount, activePreset}: HeaderProps) {
  return (
    <jfab-header className="h-20 bg-white dark:bg-slate-900 border-b border-gray-200 dark:border-slate-800 px-8 flex items-center justify-between shrink-0 transition-colors duration-300">
      <h1 className="text-lg font-semibold text-slate-800 dark:text-slate-100">Gerenciamento de Ativos</h1>
      
      <div className="flex items-center gap-4">
        <button 
          onClick={onOpenSettings}
          className="p-2 text-gray-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200 transition-colors cursor-pointer"
          title="Configurações"
        >
          <Settings size={20} />
        </button>
        
        <button 
          onClick={onOpenNotifications}
          className="relative p-2 text-gray-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200 transition-colors cursor-pointer"
          title="Notificações"
        >
          <Bell size={20} />
          {notificationCount > 0 && (
            <span className="absolute top-1 right-1 w-2.5 h-2.5 bg-red-500 border-2 border-white dark:border-slate-800 rounded-full"></span>
          )}
        </button>
        
        <div className="h-8 w-px bg-gray-200 dark:bg-slate-800 mx-2"></div>

        <button 
          onClick={onOpenSettings}
          className={cn(
            "text-white px-5 py-2 rounded-xl text-sm font-semibold shadow-sm transition-all active:scale-95 duration-300 cursor-pointer", 
            activePreset.bg, 
            activePreset.bgHover
          )}
        >
          Painel de Ajustes
        </button>
      </div>
    </jfab-header>
  );
}
