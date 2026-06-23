import {Bell, Settings, LogOut} from 'lucide-react';
import {ColorPreset} from '../lib/colors';
import {cn} from '../lib/utils';

interface HeaderProps {
  onOpenNotifications: () => void;
  onOpenSettings: () => void;
  notificationCount: number;
  activePreset: ColorPreset;
  currentUser: { name: string; email: string } | null;
  onLogout: () => void;
}

export function Header({
  onOpenNotifications,
  onOpenSettings,
  notificationCount,
  activePreset,
  currentUser,
  onLogout
}: HeaderProps) {
  return (
    <jfab-header className="h-20 bg-white dark:bg-slate-900 border-b border-gray-200 dark:border-slate-800 px-8 flex items-center justify-between shrink-0 transition-colors duration-300">
      <div className="flex items-center gap-3">
        <div className="w-9 h-9 rounded-xl bg-blue-600 flex items-center justify-center font-black text-white text-sm shadow-sm shadow-blue-500/20">
          JF
        </div>
        <h1 className="text-lg font-bold text-slate-800 dark:text-slate-100 uppercase tracking-wider">
          JFAB QR Manager
        </h1>
      </div>
      
      <div className="flex items-center gap-4">
        <button 
          onClick={onOpenSettings}
          className="p-2 text-gray-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200 transition-colors cursor-pointer"
          title="Configurações de Impressão"
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

        {currentUser && (
          <div className="flex items-center gap-3 bg-slate-50 dark:bg-slate-800/40 pl-3 pr-2 py-1.5 rounded-2xl border border-slate-100 dark:border-slate-800 select-none">
            <div className="flex flex-col items-end min-w-0">
              <span className="text-xs font-bold text-slate-700 dark:text-slate-200 leading-none mb-0.5 truncate max-w-[150px]">
                {currentUser.name}
              </span>
              <span className="text-[9px] font-bold text-slate-400 dark:text-slate-500 leading-none truncate max-w-[150px]">
                {currentUser.email}
              </span>
            </div>
            
            <button
              onClick={onLogout}
              className="p-2 hover:bg-red-50 dark:hover:bg-red-950/30 text-red-500 hover:text-red-400 rounded-xl transition duration-150 cursor-pointer flex items-center justify-center shrink-0 active:scale-95"
              title="Sair do Sistema"
            >
              <LogOut size={16} />
            </button>
          </div>
        )}
      </div>
    </jfab-header>
  );
}

