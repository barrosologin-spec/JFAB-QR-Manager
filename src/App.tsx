import {useState, useEffect, useMemo} from 'react';
import {jsPDF} from 'jspdf';
import { generateDanfe, generateContainerReport, printContainerPlate } from './lib/pdf/generators';
import {LayoutDashboard, Archive, AlertCircle, Database, Plus, Volume2, Upload, Download, Search, Copy, FileText, RefreshCw, Calendar, PanelLeftClose, PanelLeftOpen, Heart, Sun, Moon, Layout, FolderOpen, LogOut, Users, ShieldAlert} from 'lucide-react';
import {Header} from './components/Header';
import {QRPanel} from './components/QRPanel';
import {NFeDashboard} from './components/NFeDashboard';
import {CalendarView} from './components/CalendarView';
import {GlobalSearch} from './components/GlobalSearch';
import {DuplicatesPanel} from './components/DuplicatesPanel';
import {NotificationCenter} from './components/NotificationCenter';
import {Modal, ConfirmModal} from './components/Modal';
import {DashboardChart} from './components/DashboardChart';
import {CategoryDonutChart} from './components/CategoryDonutChart';
import {useSyncData} from './hooks/useSyncData';
import {QRItem, JfabContainer, JfabSidebar, JfabNav, JfabMain, JfabFooter} from './types';
import {format, parseISO} from 'date-fns';
import {saveSound, playSound, SoundType} from './lib/audioStorage';
import {generateBarcodeDataURL, generatePixPayload, generateQRCodeDataURL} from './lib/barcodeUtils';
import {cn} from './lib/utils';
import {getCategoryPreset, getCategoryColorId, COLOR_PRESETS} from './lib/colors';
import {LayoutDesigner} from './components/LayoutDesigner';
import {ColetasManager} from './components/ColetasManager';
import {ChangelogAndAuditModalContent} from './components/ChangelogAndAuditModalContent';
import {LoginScreen} from './components/LoginScreen';
import {UsersManagement} from './components/UsersManagement';

export default function App() {
  const {
    storage,
    loading,
    notifications,
    addNotification,
    clearNotifications,
    updateItems,
    createCategory,
    createContainer,
    clearContainer,
    deleteContainer,
    finalizeContainer,
    archiveAllDuplicates,
    restoreArchivedItem,
    countdown,
    syncInterval,
    isSyncing,
    lastSyncTime,
    presets,
    syncNow,
    setCustomSyncInterval,
    addPreset,
    deleteCategory,
    renameCategory,
    updateCategoryColor,
    reattributeOrphans,
    deleteOrphansPermanently,
    
    // Auth helpers
    currentUser,
    login,
    logout,
    registerUser,
    updateUserRole,
    deleteUser,
    createUserByAdmin,
    updateCredentialsWithMasterPassword,
    importFullStorage,
    addCustomAuditLog,
    dbHealth,
    fetchDbHealth
  } = useSyncData();

  const activeUserRole = useMemo(() => {
    if (!currentUser) return 'operador';
    const usersList = (storage._users as unknown as any[]) || [];
    const dbUser = usersList.find((u: any) => u.email.toLowerCase() === currentUser.email.toLowerCase());
    return dbUser?.role || (currentUser.email === 'barroso.login@gmail.com' ? 'admin' : 'operador');
  }, [storage._users, currentUser]);

  const isAdmin = activeUserRole === 'admin';
  const isOperador = activeUserRole === 'operador';
  const isAuditor = activeUserRole === 'visualizador';

  const formatTimeLeft = (seconds: number) => {
    if (seconds < 60) return `${seconds}s`;
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    if (mins < 60) return `${mins}m ${secs}s`;
    const hrs = Math.floor(mins / 60);
    const remMins = mins % 60;
    return `${hrs}h ${remMins}m`;
  };

  const [selectedCategory, setSelectedCategory] = useState('');
  const [selectedDate, setSelectedDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [selectedContainer, setSelectedContainer] = useState('');
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(true);
  const [isDarkMode, setIsDarkMode] = useState(() => localStorage.getItem('qr_dark_mode') === 'true');
  const [currentTab, setCurrentTab] = useState<'production' | 'calendar' | 'archived' | 'errors' | 'search' | 'duplicates' | 'nfe' | 'designer' | 'coletas' | 'users'>('production');

  useEffect(() => {
    const handleHashChange = () => {
      const hash = window.location.hash.replace('#/', '').replace('#', '');
      const validTabs = ['production', 'calendar', 'archived', 'errors', 'search', 'duplicates', 'nfe', 'designer', 'coletas', 'users'];
      if (validTabs.includes(hash)) {
        setCurrentTab(hash as any);
      }
    };

    handleHashChange();
    window.addEventListener('hashchange', handleHashChange);
  
  }, []);

  useEffect(() => {
    if (window.location.hash !== `#/${currentTab}`) {
      window.location.hash = `#/${currentTab}`;
    }
  }, [currentTab]);

  useEffect(() => {
    localStorage.setItem('qr_dark_mode', String(isDarkMode));
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [isDarkMode]);

  // Dynamic ticking state to update relative times in real time
  const [nowTick, setNowTick] = useState(Date.now());
  useEffect(() => {
    const timer = setInterval(() => {
      setNowTick(Date.now());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Modal States
  const [modalType, setModalType] = useState<'none' | 'addCategory' | 'addContainer' | 'deleteItem' | 'deleteContainer' | 'editItem' | 'clearNotifications' | 'settings' | 'manageCategories' | 'deleteCategory'>('none');
  const [tempInputValue, setTempInputValue] = useState('');
  const [activeItemIdx, setActiveItemIdx] = useState<number | null>(null);
  const [isPixOpen, setIsPixOpen] = useState(false);
  const [copiedPix, setCopiedPix] = useState(false);
  const [pixQRCodeUrl, setPixQRCodeUrl] = useState<string>('');
  const [isChangeLogOpen, setIsChangeLogOpen] = useState(false);

  useEffect(() => {
    if (isPixOpen) {
      try {
        const payload = generatePixPayload('pixdobarroso@gmail.com', 'JOSE FELIPE A BARROSO', 'FORTALEZA');
        generateBarcodeDataURL(payload)
          .then(url => setPixQRCodeUrl(url))
          .catch(err => {
            console.error("Erro ao gerar QR Code do Pix por payload, tentando chave simples:", err);
            generateBarcodeDataURL('pixdobarroso@gmail.com')
              .then(url => setPixQRCodeUrl(url))
              .catch(e => console.error(e));
          });
      } catch (err) {
        console.error("Erro ao montar payload do Pix, usando chave simples:", err);
        generateBarcodeDataURL('pixdobarroso@gmail.com')
          .then(url => setPixQRCodeUrl(url))
          .catch(e => console.error(e));
      }
    } else {
      setPixQRCodeUrl('');
    }
  }, [isPixOpen]);

  // Category Manage States
  const [editingCatName, setEditingCatName] = useState<string | null>(null);
  const [renamedValue, setRenamedValue] = useState('');
  const [categoryToDelete, setCategoryToDelete] = useState<string | null>(null);

  const activePreset = useMemo(() => {
    return getCategoryPreset(selectedCategory, storage);
  }, [selectedCategory, storage]);

  // PDF Settings
  const [pdfSettings, setPdfSettings] = useState(() => {
    const saved = localStorage.getItem('qr_pdf_settings');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        return {
          qrSize: parsed.qrSize ?? 80,
          barcodeWidth: parsed.barcodeWidth ?? 140,
          barcodeHeight: parsed.barcodeHeight ?? 35,
          downloadJsonWithPdf: parsed.downloadJsonWithPdf ?? false
        };
      } catch (e) {
        // fallback
      }
    }
    return {
      qrSize: 80,
      barcodeWidth: 140,
      barcodeHeight: 35,
      downloadJsonWithPdf: false
    };
  });

  useEffect(() => {
    localStorage.setItem('qr_pdf_settings', JSON.stringify(pdfSettings));
  }, [pdfSettings]);

  // PDF Progress
  const [pdfProgress, setPdfProgress] = useState({
    current: 0,
    total: 0,
    isOpen: false
  });

  const items = (selectedCategory && selectedDate && selectedContainer) 
    ? storage[selectedCategory]?.[selectedDate]?.[selectedContainer]?.items || [] 
    : [];

  const isFinalized = (selectedCategory && selectedDate && selectedContainer)
    ? storage[selectedCategory]?.[selectedDate]?.[selectedContainer]?.finalized || false
    : false;

  const pdfCtx = {
    items,
    selectedContainer,
    selectedCategory,
    selectedDate,
    isFinalized,
    pdfSettings,
    setPdfProgress,
    addNotification,
    addCustomAuditLog,
    storage,
    currentUser
  };

  const handleDownloadDanfePDF = (targetItems?: QRItem[]) => generateDanfe(pdfCtx, targetItems);
  const handleDownloadPDF = () => generateContainerReport(pdfCtx);
  const handlePrintPlate = () => printContainerPlate(pdfCtx);


  const handleManualSync = () => {
    syncNow();
  };

  const archivedItems = useMemo(() => {
    const list: Array<{
      item: QRItem;
      category: string;
      date: string;
      container: string;
    }> = [];

    Object.entries(storage).forEach(([cat, days]) => {
      if (cat.startsWith('_')) return;
      Object.entries(days as any).forEach(([date, containers]) => {
        if (date.startsWith('_')) return;
        Object.entries(containers as any).forEach(([cont, data]: [string, any]) => {
          if (cont.startsWith('_')) return;
          if (data && data.items) {
            data.items.forEach((item: QRItem) => {
              if (item.archived) {
                list.push({ item, category: cat, date, container: cont });
              }
            });
          }
        });
      });
    });

    return list.sort((a, b) => b.item.ts - a.item.ts);
  }, [storage]);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col justify-center items-center p-4 text-white font-sans select-none relative overflow-hidden">
        {/* Background Atmosphere */}
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-blue-950/20 via-slate-950 to-slate-950 pointer-events-none z-0" />
        <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] rounded-full bg-blue-550/5 blur-[120px] pointer-events-none" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] rounded-full bg-indigo-550/5 blur-[120px] pointer-events-none" />
        
        <div className="flex flex-col items-center gap-5 z-10">
          <div className="inline-flex items-center justify-center p-3.5 bg-blue-950/40 border border-blue-500/10 text-blue-400 rounded-3xl animate-pulse">
            <svg className="animate-spin h-6 w-6 text-blue-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
          </div>
          <div className="text-center space-y-1">
            <p className="text-[11px] font-black uppercase tracking-widest text-slate-300">Sincronizando Banco de Dados</p>
            <p className="text-[9px] font-bold text-slate-500 uppercase tracking-wider">Aguarde a validação offline-first...</p>
          </div>
        </div>
      </div>
    );
  }

  if (!currentUser) {
    return <LoginScreen login={login} registerUser={registerUser} />;
  }

  const handleCopyPix = () => {
    navigator.clipboard.writeText('pixdobarroso@gmail.com');
    setCopiedPix(true);
    setTimeout(() => setCopiedPix(false), 2000);
  };

  const handleOpenAddCategory = () => {
    if (!isAdmin) {
      addNotification('error', 'Acesso Negado', 'Seu perfil de acesso atual não possui permissão para gerenciar ou criar coletas.');
      return;
    }
    setTempInputValue('');
    setModalType('addCategory');
  };

  const handleConfirmAddCategory = async () => {
    if (!isAdmin) {
      addNotification('error', 'Acesso Negado', 'Seu perfil de acesso atual não possui permissão para gerenciar ou criar coletas.');
      return;
    }
    if (tempInputValue.trim()) {
      const success = await createCategory(tempInputValue.trim());
      if (success) setSelectedCategory(tempInputValue.trim());
    }
    setModalType('none');
  };

  const handleDeleteCategoryClick = (catName: string) => {
    if (!isAdmin) {
      addNotification('error', 'Acesso Negado', 'Apenas Administradores podem excluir coletas.');
      return;
    }
    setCategoryToDelete(catName);
    setModalType('deleteCategory');
  };

  const handleConfirmDeleteCategory = async () => {
    if (!isAdmin) {
      addNotification('error', 'Acesso Negado', 'Apenas Administradores podem excluir coletas.');
      return;
    }
    if (categoryToDelete) {
      await deleteCategory(categoryToDelete);
      if (selectedCategory === categoryToDelete) {
        setSelectedCategory('');
        setSelectedContainer('');
      }
      addNotification('success', 'Coleta Excluída', `A coleta "${categoryToDelete}" foi apagada de forma definitiva.`);
    }
    setCategoryToDelete(null);
    setModalType('manageCategories');
  };

  const handleConfirmRenameCategory = async (oldName: string) => {
    if (!isAdmin) {
      addNotification('error', 'Acesso Negado', 'Apenas Administradores podem renomear coletas.');
      return;
    }
    const trimmed = renamedValue.trim();
    if (!trimmed) return;
    if (trimmed === oldName) {
      setEditingCatName(null);
      return;
    }
    const success = await renameCategory(oldName, trimmed);
    if (success) {
      if (selectedCategory === oldName) {
        setSelectedCategory(trimmed);
      }
      addNotification('success', 'Coleta Renomeada', `Coleta alterada de "${oldName}" para "${trimmed}".`);
      setEditingCatName(null);
    } else {
      addNotification('error', 'Erro ao Renomear', 'O nome de coleta solicitado já existe.');
    }
  };

  const getNextContainerName = (storageData: any, category: string, date: string): string => {
    // 1. Collect all existing containers for current category & date
    const currentContainers = Object.keys(storageData[category]?.[date] || {}).filter(k => !k.startsWith('_'));
    
    // 2. If not found, collect from the same category across all dates
    let refContainers = [...currentContainers];
    if (refContainers.length === 0 && storageData[category]) {
      Object.entries(storageData[category]).forEach(([d, dObj]: [string, any]) => {
        if (d.startsWith('_')) return;
        Object.keys(dObj || {}).forEach(k => {
          if (!k.startsWith('_') && !refContainers.includes(k)) {
            refContainers.push(k);
          }
        });
      });
    }

    // 3. If still empty, collect globally
    if (refContainers.length === 0) {
      Object.entries(storageData).forEach(([cat, catObj]: [string, any]) => {
        if (cat.startsWith('_')) return;
        Object.entries(catObj || {}).forEach(([d, dObj]: [string, any]) => {
          if (d.startsWith('_')) return;
          Object.keys(dObj || {}).forEach(k => {
            if (!k.startsWith('_') && !refContainers.includes(k)) {
              refContainers.push(k);
            }
          });
        });
      });
    }

    if (refContainers.length === 0) {
      return "CX1";
    }

    // Find container names that match a pattern with numbers
    const parsed = refContainers.map(name => {
      const match = name.match(/^(.*?)(\d+)$/);
      if (match) {
        const prefix = match[1];
        const numStr = match[2];
        const num = parseInt(numStr, 10);
        const isPadded = numStr.startsWith('0') && numStr.length > 1;
        return { prefix, num, isPadded, paddingLen: numStr.length, original: name };
      }
      return null;
    }).filter(Boolean) as Array<{ prefix: string; num: number; isPadded: boolean; paddingLen: number; original: string }>;

    if (parsed.length > 0) {
      const currentParsed = currentContainers.map(name => {
        const match = name.match(/^(.*?)(\d+)$/);
        if (match) {
          return { prefix: match[1], num: parseInt(match[2], 10), isPadded: match[2].startsWith('0') && match[2].length > 1, paddingLen: match[2].length };
        }
        return null;
      }).filter(Boolean) as Array<{ prefix: string; num: number; isPadded: boolean; paddingLen: number }>;

      if (currentParsed.length > 0) {
        let bestMatch = currentParsed[0];
        for (const p of currentParsed) {
          if (p.num > bestMatch.num) {
            bestMatch = p;
          }
        }
        const nextNum = bestMatch.num + 1;
        let nextNumStr = String(nextNum);
        if (bestMatch.isPadded && nextNumStr.length < bestMatch.paddingLen) {
          nextNumStr = nextNumStr.padStart(bestMatch.paddingLen, '0');
        }
        return `${bestMatch.prefix}${nextNumStr}`;
      } else {
        const prefixCounts: { [key: string]: number } = {};
        parsed.forEach(p => {
          prefixCounts[p.prefix] = (prefixCounts[p.prefix] || 0) + 1;
        });
        let mostCommonPrefix = parsed[0].prefix;
        let maxCount = 0;
        Object.entries(prefixCounts).forEach(([pref, count]) => {
          if (count > maxCount) {
            maxCount = count;
            mostCommonPrefix = pref;
          }
        });

        const prefixItems = parsed.filter(p => p.prefix === mostCommonPrefix);
        let highestNum = 0;
        let isPadded = false;
        let paddingLen = 0;
        prefixItems.forEach(p => {
          if (p.num > highestNum) {
            highestNum = p.num;
            isPadded = p.isPadded;
            paddingLen = p.paddingLen;
          }
        });

        const nextNum = highestNum + 1;
        let nextNumStr = String(nextNum);
        if (isPadded && nextNumStr.length < paddingLen) {
          nextNumStr = nextNumStr.padStart(paddingLen, '0');
        }
        return `${mostCommonPrefix}${nextNumStr}`;
      }
    }

    if (currentContainers.length > 0) {
      return `${currentContainers[currentContainers.length - 1]} 2`;
    }

    return "CX1";
  };

  const handleOpenAddContainer = async () => {
    if (isAuditor) {
      addNotification('error', 'Acesso Negado', 'Seu perfil de visualizador (somente leitura) não permite criar contêineres.');
      return;
    }
    if (!selectedCategory || !selectedDate) {
      addNotification('warning', 'Aviso', 'Selecione uma coleta e data primeiro.');
      return;
    }
    
    setTempInputValue("Buscando...");
    setModalType('addContainer');

    try {
      const res = await fetch('/api/sync');
      if (!res.ok) throw new Error("Failed");
      const remoteData = await res.json();
      const qrStorageV2 = remoteData.qrStorageV2 || {};
      
      const mockStorage = {
        ...storage,
        [selectedCategory]: {
          ...(storage[selectedCategory] || {}),
          [selectedDate]: qrStorageV2[selectedCategory]?.[selectedDate] || {}
        }
      };

      const suggested = getNextContainerName(mockStorage, selectedCategory, selectedDate);
      setTempInputValue(suggested);
    } catch (error) {
      console.error("Failed to query remote containers", error);
      const suggested = getNextContainerName(storage, selectedCategory, selectedDate);
      setTempInputValue(suggested);
    }
  };

  const handleConfirmAddContainer = async () => {
    if (isAuditor) {
      addNotification('error', 'Acesso Negado', 'Seu perfil de visualizador (somente leitura) não permite criar contêineres.');
      return;
    }
    if (tempInputValue.trim()) {
      const success = await createContainer(selectedCategory, selectedDate, tempInputValue.trim());
      if (success) setSelectedContainer(tempInputValue.trim());
    }
    setModalType('none');
  };

  const handleAddQR = (text: string, nfeData?: any) => {
    if (isAuditor) {
      addNotification('error', 'Acesso Negado', 'Seu perfil de visualizador (somente leitura) não permite bipar ou inserir itens.');
      return;
    }
    let isDuplicate = false;
    let originalSource: { category: string; date: string; container: string; ts: number } | null = null;

    Object.entries(storage).forEach(([cat, days]) => {
      if (cat.startsWith('_')) return; // Skip metadata
      
      Object.entries(days as any).forEach(([date, containers]) => {
        if (date.startsWith('_')) return; // Skip metadata
        
        Object.entries(containers as any).forEach(([cont, contObj]: [string, any]) => {
          if (cont.startsWith('_')) return; // Skip metadata
          if (!contObj || !contObj.items) return;
          
          const found = contObj.items.find((i: QRItem) => i.t === text);
          if (found) {
            isDuplicate = true;
            if (!originalSource || found.ts < originalSource.ts) {
              originalSource = { category: cat, date, container: cont, ts: found.ts };
            }
          }
        });
      });
    });

    if (!text.trim()) return;

    const newItem: QRItem = {
      t: text.trim(),
      ts: Date.now(),
      ...(nfeData ? { nfeData } : {})
    };

    if (isDuplicate && originalSource) {
      newItem.duplicate = true;
      newItem.original = {
        date: originalSource.date,
        container: originalSource.container,
        ts: originalSource.ts || Date.now()
      };
    }

    const newItems = [...items, newItem];
    updateItems(selectedCategory, selectedDate, selectedContainer, newItems);

    if (isDuplicate && originalSource) {
      addNotification('warning', 'Duplicado!', `Este código já foi registrado na coleta "${originalSource.category}" em ${originalSource.date} no container ${originalSource.container}.`);
      playSound('duplicate');
    } else {
      playSound('success');
    }
  };

  const handleOpenEditItem = (idx: number, currentText: string) => {
    if (isAuditor) {
      addNotification('error', 'Acesso Negado', 'Seu perfil de visualizador (somente leitura) não permite editar itens.');
      return;
    }
    setActiveItemIdx(idx);
    setTempInputValue(currentText);
    setModalType('editItem');
  };

  const handleConfirmEditItem = () => {
    if (isAuditor) {
      addNotification('error', 'Acesso Negado', 'Seu perfil de visualizador (somente leitura) não permite editar itens.');
      return;
    }
    if (activeItemIdx !== null && tempInputValue.trim()) {
      const newItems = [...items];
      newItems[activeItemIdx] = {...newItems[activeItemIdx], t: tempInputValue.trim(), ts: Date.now()};
      updateItems(selectedCategory, selectedDate, selectedContainer, newItems);
    }
    setModalType('none');
  };

  const handleOpenDeleteItem = (idx: number) => {
    if (isAuditor) {
      addNotification('error', 'Acesso Negado', 'Seu perfil de visualizador (somente leitura) não permite excluir itens.');
      return;
    }
    setActiveItemIdx(idx);
    setModalType('deleteItem');
  };

  const handleConfirmDeleteItem = () => {
    if (isAuditor) {
      addNotification('error', 'Acesso Negado', 'Seu perfil de visualizador (somente leitura) não permite excluir itens.');
      return;
    }
    if (activeItemIdx !== null) {
      const newItems = [...items];
      newItems.splice(activeItemIdx, 1);
      updateItems(selectedCategory, selectedDate, selectedContainer, newItems);
    }
    setModalType('none');
  };

  const handleOpenDeleteContainer = () => {
    if (!isAdmin) {
      addNotification('error', 'Acesso Negado', 'Apenas Administradores podem excluir contêineres do sistema.');
      return;
    }
    setModalType('deleteContainer');
  };

  const handleOpenSettings = () => {
    setModalType('settings');
  };

  const handleAudioUpload = async (type: SoundType, file: File) => {
    if (file) {
      await saveSound(type, file);
      addNotification('success', 'Áudio Atualizado', `Som de ${type} configurado com sucesso.`);
    }
  };

  const handleConfirmClearContainer = async () => {
    if (isAuditor) {
      addNotification('error', 'Acesso Negado', 'Seu perfil de visualizador (somente leitura) não permite esvaziar contêineres.');
      return;
    }
    if (selectedCategory && selectedDate && selectedContainer) {
      const success = await clearContainer(selectedCategory, selectedDate, selectedContainer);
      if (success) setModalType('none');
    }
  };

// handlePrintPlate moved to generatePrintPlateContent.ts

  const handleClearNotifications = () => {
    setModalType('clearNotifications');
  };

  const handleConfirmClearNotifications = () => {
    clearNotifications();
    setModalType('none');
  };

  const handleNavigateToContainer = (cat: string, date: string, cont: string) => {
    setSelectedCategory(cat);
    setSelectedDate(date);
    setSelectedContainer(cont);
    setCurrentTab('production');
  };

// handleDownloadPDF moved to generatePlateContent.ts

// handleDownloadDanfePDF moved to generateDanfe.ts


  const handleImportFile = () => {
    if (!selectedCategory || !selectedDate || !selectedContainer || isFinalized) {
       addNotification('error', 'Importação', 'Selecione um contêiner não finalizado.');
       return;
    }
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = async (e: any) => {
      const file = e.target.files[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = async (event) => {
        try {
          const importedItems = JSON.parse(event.target?.result as string);
          if (Array.isArray(importedItems)) {
            // Append to existing items to be safe, or just append unique
            const currentItems = items || [];
            const merged = [...currentItems, ...importedItems];
            
            updateItems(selectedCategory, selectedDate, selectedContainer, merged);
            addNotification('success', 'Importação', `Foram importados ${importedItems.length} itens do histórico com sucesso.`);
          }
        } catch (err) {
            addNotification('error', 'Importação falhou', 'Arquivo JSON inválido.');
        }
      };
      reader.readAsText(file);
    };
    input.click();
  };

  const handleFinalizeContainer = async () => {
    if (isAuditor) {
      addNotification('error', 'Acesso Negado', 'Seu perfil de visualizador (somente leitura) não permite finalizar contêineres.');
      return;
    }
    if (selectedCategory && selectedDate && selectedContainer) {
      await finalizeContainer(selectedCategory, selectedDate, selectedContainer);
    }
  };

  const getNotificationCountForTab = (tab: string): number => {
    return notifications.filter(n => {
      const title = n.title.toLowerCase();
      const message = n.message.toLowerCase();
      const type = n.type;

      if (tab === 'duplicates') {
        return title.includes('duplicado') || message.includes('duplicado') || title.includes('duplicate');
      }
      if (tab === 'nfe') {
        return title.includes('nf-e') || title.includes('nfe') || message.includes('nf-e') || message.includes('nfe') || title.includes('importa') || message.includes('importa') || title.includes('nota fiscal') || message.includes('nota fiscal');
      }
      if (tab === 'designer') {
        return title.includes('placa') || title.includes('layout') || title.includes('impress') || title.includes('etiqueta') || message.includes('placa') || message.includes('layout') || title.includes('gerando placa') || message.includes('gerando placa');
      }
      if (tab === 'calendar') {
        return title.includes('finaliz') || message.includes('finaliz') || title.includes('produção') || message.includes('produção');
      }
      if (tab === 'errors') {
        return type === 'error' || title.includes('erro') || message.includes('erro') || title.includes('falhou') || message.includes('falha');
      }
      if (tab === 'archived') {
        return title.includes('arquiv') || message.includes('arquiv') || title.includes('restaur') || message.includes('restaur');
      }
      if (tab === 'production') {
        const isSp = 
          title.includes('duplicado') || message.includes('duplicado') || title.includes('duplicate') ||
          type === 'error' || title.includes('erro') || message.includes('erro') || title.includes('falhou') || message.includes('falha') ||
          title.includes('nf-e') || title.includes('nfe') || message.includes('nf-e') || message.includes('nfe') ||
          title.includes('placa') || title.includes('layout') || title.includes('impress') || title.includes('etiqueta') || message.includes('placa') || message.includes('layout') ||
          title.includes('arquiv') || message.includes('arquiv') || title.includes('restaur') || message.includes('restaur');
        return !isSp || title.includes('coleta') || title.includes('contêiner') || title.includes('sincroniz') || message.includes('sincroniz');
      }
      return false;
    }).length;
  };

  return (
    <JfabContainer className="flex h-screen bg-gray-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 font-sans overflow-hidden transition-colors duration-300">
      <JfabSidebar className={cn("bg-white dark:bg-slate-900 border-r border-gray-200 dark:border-slate-800 flex flex-col shrink-0 transition-all duration-300", isSidebarCollapsed ? "w-20" : "w-64")}>
        <div className={cn("p-6 flex items-center gap-3", isSidebarCollapsed && "justify-center px-2")}>
          <div className={cn("w-8 h-8 rounded-lg flex items-center justify-center transition-all duration-300 shrink-0", activePreset.bg)}>
            <div className="w-4 h-4 bg-white rounded-sm"></div>
          </div>
          {!isSidebarCollapsed && <span className="font-bold text-xl tracking-tight text-slate-800 dark:text-slate-100">QR-Manager</span>}
        </div>

        <JfabNav className="flex-1 px-3 space-y-3 mt-2 overflow-y-auto custom-scrollbar">
          {/* GRUPO 1: OPERAÇÃO */}
          <div>
            {!isSidebarCollapsed && (
              <div className="px-2.5 mb-1.5 text-[9px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest">
                Operação
              </div>
            )}
            <div className="space-y-0.5">
              {/* Painel Geral */}
              <button 
                onClick={() => setCurrentTab('production')}
                title={isSidebarCollapsed ? "Painel Geral" : undefined}
                className={cn(
                  "w-full flex items-center justify-between py-1.5 px-2.5 rounded-lg text-xs font-semibold transition-all duration-200 relative group",
                  currentTab === 'production' ? `${activePreset.bgLight} ${activePreset.text} shadow-sm` : "text-gray-500 hover:bg-gray-50 dark:text-slate-400 dark:hover:bg-slate-800/60"
                )}
              >
                <div className={cn("flex items-center gap-2.5", isSidebarCollapsed && "w-full justify-center")}>
                  <div className="relative">
                    <LayoutDashboard size={18} className="shrink-0" />
                    {isSidebarCollapsed && getNotificationCountForTab('production') > 0 && (
                      <span className="absolute -top-1.5 -right-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-blue-500 text-[8px] font-black text-white shrink-0 shadow-sm animate-pulse">
                        {getNotificationCountForTab('production')}
                      </span>
                    )}
                  </div>
                  {!isSidebarCollapsed && <span>Painel Geral</span>}
                </div>
                {!isSidebarCollapsed && getNotificationCountForTab('production') > 0 && (
                  <span className="flex h-4 min-w-[16px] items-center justify-center rounded-full px-1 text-[9px] font-bold text-white bg-blue-500 shadow-sm">
                    {getNotificationCountForTab('production')}
                  </span>
                )}
              </button>

              {/* Produção */}
              <button 
                onClick={() => setCurrentTab('calendar')}
                title={isSidebarCollapsed ? "Produção" : undefined}
                className={cn(
                  "w-full flex items-center justify-between py-1.5 px-2.5 rounded-lg text-xs font-semibold transition-all duration-200 relative group",
                  currentTab === 'calendar' ? `${activePreset.bgLight} ${activePreset.text} shadow-sm` : "text-gray-500 hover:bg-gray-50 dark:text-slate-400 dark:hover:bg-slate-800/60"
                )}
              >
                <div className={cn("flex items-center gap-2.5", isSidebarCollapsed && "w-full justify-center")}>
                  <div className="relative">
                    <Calendar size={18} className="shrink-0" />
                    {isSidebarCollapsed && getNotificationCountForTab('calendar') > 0 && (
                      <span className="absolute -top-1.5 -right-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-purple-500 text-[8px] font-black text-white shrink-0 shadow-sm animate-pulse">
                        {getNotificationCountForTab('calendar')}
                      </span>
                    )}
                  </div>
                  {!isSidebarCollapsed && <span>Produção</span>}
                </div>
                {!isSidebarCollapsed && getNotificationCountForTab('calendar') > 0 && (
                  <span className="flex h-4 min-w-[16px] items-center justify-center rounded-full px-1 text-[9px] font-bold text-white bg-purple-500 shadow-sm">
                    {getNotificationCountForTab('calendar')}
                  </span>
                )}
              </button>

              {/* Coletas & Linagens */}
              <button 
                onClick={() => setCurrentTab('coletas')}
                title={isSidebarCollapsed ? "Coletas & Linagens" : undefined}
                className={cn(
                  "w-full flex items-center justify-between py-1.5 px-2.5 rounded-lg text-xs font-semibold transition-all duration-200 relative group",
                  currentTab === 'coletas' ? `${activePreset.bgLight} ${activePreset.text} shadow-sm` : "text-gray-500 hover:bg-gray-50 dark:text-slate-400 dark:hover:bg-slate-800/60"
                )}
              >
                <div className={cn("flex items-center gap-2.5", isSidebarCollapsed && "w-full justify-center")}>
                  <div className="relative">
                    <FolderOpen size={18} className="shrink-0" />
                  </div>
                  {!isSidebarCollapsed && <span>Coletas & Linagens</span>}
                </div>
              </button>
            </div>
          </div>

          {isSidebarCollapsed && <div className="my-1 border-t border-gray-100 dark:border-slate-800/60" />}

          {/* GRUPO 2: DOCUMENTOS */}
          <div>
            {!isSidebarCollapsed && (
              <div className="px-2.5 mb-1.5 text-[9px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest">
                Documentos & Busca
              </div>
            )}
            <div className="space-y-0.5">
              {/* Hub NF-e */}
              <button 
                onClick={() => setCurrentTab('nfe')}
                title={isSidebarCollapsed ? "Gestão de NF-e" : undefined}
                className={cn(
                  "w-full flex items-center justify-between py-1.5 px-2.5 rounded-lg text-xs font-semibold transition-all duration-200 relative group",
                  currentTab === 'nfe' ? `${activePreset.bgLight} ${activePreset.text} shadow-sm` : "text-gray-500 hover:bg-gray-50 dark:text-slate-400 dark:hover:bg-slate-800/60"
                )}
              >
                <div className={cn("flex items-center gap-2.5", isSidebarCollapsed && "w-full justify-center")}>
                  <div className="relative">
                    <FileText size={18} className="shrink-0" />
                    {isSidebarCollapsed && getNotificationCountForTab('nfe') > 0 && (
                      <span className="absolute -top-1.5 -right-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-emerald-500 text-[8px] font-black text-white shrink-0 shadow-sm animate-pulse">
                        {getNotificationCountForTab('nfe')}
                      </span>
                    )}
                  </div>
                  {!isSidebarCollapsed && <span>Hub NF-e</span>}
                </div>
                {!isSidebarCollapsed && getNotificationCountForTab('nfe') > 0 && (
                  <span className="flex h-4 min-w-[16px] items-center justify-center rounded-full px-1 text-[9px] font-bold text-white bg-emerald-500 shadow-sm">
                    {getNotificationCountForTab('nfe')}
                  </span>
                )}
              </button>

              {/* Estúdio de Layout */}
              <button 
                onClick={() => setCurrentTab('designer')}
                title={isSidebarCollapsed ? "Estúdio de Layout" : undefined}
                className={cn(
                  "w-full flex items-center justify-between py-1.5 px-2.5 rounded-lg text-xs font-semibold transition-all duration-200 relative group",
                  currentTab === 'designer' ? `${activePreset.bgLight} ${activePreset.text} shadow-sm` : "text-gray-500 hover:bg-gray-50 dark:text-slate-400 dark:hover:bg-slate-800/60"
                )}
              >
                <div className={cn("flex items-center gap-2.5", isSidebarCollapsed && "w-full justify-center")}>
                  <div className="relative">
                    <Layout size={18} className="shrink-0" />
                    {isSidebarCollapsed && getNotificationCountForTab('designer') > 0 && (
                      <span className="absolute -top-1.5 -right-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-indigo-500 text-[8px] font-black text-white shrink-0 shadow-sm animate-pulse">
                        {getNotificationCountForTab('designer')}
                      </span>
                    )}
                  </div>
                  {!isSidebarCollapsed && <span>Estúdio de Layout</span>}
                </div>
                {!isSidebarCollapsed && getNotificationCountForTab('designer') > 0 && (
                  <span className="flex h-4 min-w-[16px] items-center justify-center rounded-full px-1 text-[9px] font-bold text-white bg-indigo-500 shadow-sm">
                    {getNotificationCountForTab('designer')}
                  </span>
                )}
              </button>

              {/* Busca Global */}
              <button 
                onClick={() => setCurrentTab('search')}
                title={isSidebarCollapsed ? "Busca Global" : undefined}
                className={cn(
                  "w-full flex items-center justify-between py-1.5 px-2.5 rounded-lg text-xs font-semibold transition-all duration-200 relative group",
                  currentTab === 'search' ? `${activePreset.bgLight} ${activePreset.text} shadow-sm` : "text-gray-500 hover:bg-gray-50 dark:text-slate-400 dark:hover:bg-slate-800/60"
                )}
              >
                <div className={cn("flex items-center gap-2.5", isSidebarCollapsed && "w-full justify-center")}>
                  <Search size={18} className="shrink-0" />
                  {!isSidebarCollapsed && <span>Busca Global</span>}
                </div>
              </button>
            </div>
          </div>

          {isSidebarCollapsed && <div className="my-1 border-t border-gray-100 dark:border-slate-800/60" />}

          {/* GRUPO 3: SEGURANÇA & CONTROLE */}
          <div>
            {!isSidebarCollapsed && (
              <div className="px-2.5 mb-1.5 text-[9px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest">
                Segurança & Auditoria
              </div>
            )}
            <div className="space-y-0.5">
              {/* Duplicados */}
              <button 
                onClick={() => setCurrentTab('duplicates')}
                title={isSidebarCollapsed ? "Duplicados" : undefined}
                className={cn(
                  "w-full flex items-center justify-between py-1.5 px-2.5 rounded-lg text-xs font-semibold transition-all duration-200 relative group",
                  currentTab === 'duplicates' ? `${activePreset.bgLight} ${activePreset.text} shadow-sm` : "text-gray-500 hover:bg-gray-50 dark:text-slate-400 dark:hover:bg-slate-800/60"
                )}
              >
                <div className={cn("flex items-center gap-2.5", isSidebarCollapsed && "w-full justify-center")}>
                  <div className="relative">
                    <Copy size={18} className="shrink-0" />
                    {isSidebarCollapsed && getNotificationCountForTab('duplicates') > 0 && (
                      <span className="absolute -top-1.5 -right-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-amber-500 text-[8px] font-black text-white shrink-0 shadow-sm animate-pulse">
                        {getNotificationCountForTab('duplicates')}
                      </span>
                    )}
                  </div>
                  {!isSidebarCollapsed && <span>Duplicados</span>}
                </div>
                {!isSidebarCollapsed && getNotificationCountForTab('duplicates') > 0 && (
                  <span className="flex h-4 min-w-[16px] items-center justify-center rounded-full px-1 text-[9px] font-bold text-white bg-amber-500 shadow-sm">
                    {getNotificationCountForTab('duplicates')}
                  </span>
                )}
              </button>

              {/* Arquivados */}
              <button 
                onClick={() => setCurrentTab('archived')}
                title={isSidebarCollapsed ? "Arquivados" : undefined}
                className={cn(
                  "w-full flex items-center justify-between py-1.5 px-2.5 rounded-lg text-xs font-semibold transition-all duration-200 relative group",
                  currentTab === 'archived' ? `${activePreset.bgLight} ${activePreset.text} shadow-sm` : "text-gray-500 hover:bg-gray-50 dark:text-slate-400 dark:hover:bg-slate-800/60"
                )}
              >
                <div className={cn("flex items-center gap-2.5", isSidebarCollapsed && "w-full justify-center")}>
                  <div className="relative">
                    <Archive size={18} className="shrink-0" />
                    {isSidebarCollapsed && getNotificationCountForTab('archived') > 0 && (
                      <span className="absolute -top-1.5 -right-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-teal-500 text-[8px] font-black text-white shrink-0 shadow-sm animate-pulse">
                        {getNotificationCountForTab('archived')}
                      </span>
                    )}
                  </div>
                  {!isSidebarCollapsed && <span>Arquivados</span>}
                </div>
                {!isSidebarCollapsed && getNotificationCountForTab('archived') > 0 && (
                  <span className="flex h-4 min-w-[16px] items-center justify-center rounded-full px-1 text-[9px] font-bold text-white bg-teal-500 shadow-sm">
                    {getNotificationCountForTab('archived')}
                  </span>
                )}
              </button>

              {/* Log de Erros */}
              <button 
                onClick={() => setCurrentTab('errors')}
                title={isSidebarCollapsed ? "Log de Erros" : undefined}
                className={cn(
                  "w-full flex items-center justify-between py-1.5 px-2.5 rounded-lg text-xs font-semibold transition-all duration-200 relative group",
                  currentTab === 'errors' ? `${activePreset.bgLight} ${activePreset.text} shadow-sm` : "text-gray-500 hover:bg-gray-50 dark:text-slate-400 dark:hover:bg-slate-800/60"
                )}
              >
                <div className={cn("flex items-center gap-2.5", isSidebarCollapsed && "w-full justify-center")}>
                  <div className="relative">
                    <AlertCircle size={18} className="shrink-0" />
                    {isSidebarCollapsed && getNotificationCountForTab('errors') > 0 && (
                      <span className="absolute -top-1.5 -right-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[8px] font-black text-white shrink-0 shadow-sm animate-pulse">
                        {getNotificationCountForTab('errors')}
                      </span>
                    )}
                  </div>
                  {!isSidebarCollapsed && <span>Log de Erros</span>}
                </div>
                {!isSidebarCollapsed && getNotificationCountForTab('errors') > 0 && (
                  <span className="flex h-4 min-w-[16px] items-center justify-center rounded-full px-1 text-[9px] font-bold text-white bg-red-500 shadow-sm">
                    {getNotificationCountForTab('errors')}
                  </span>
                )}
              </button>

              {/* Controle de Acesso */}
              <button 
                onClick={() => setCurrentTab('users')}
                title={isSidebarCollapsed ? "Controle de Acesso" : undefined}
                className={cn(
                  "w-full flex items-center justify-between py-1.5 px-2.5 rounded-lg text-xs font-semibold transition-all duration-200 relative group",
                  currentTab === 'users' ? `${activePreset.bgLight} ${activePreset.text} shadow-sm` : "text-gray-500 hover:bg-gray-50 dark:text-slate-400 dark:hover:bg-slate-800/60"
                )}
              >
                <div className={cn("flex items-center gap-2.5", isSidebarCollapsed && "w-full justify-center")}>
                  <div className="relative">
                    <Users size={18} className="shrink-0" />
                  </div>
                  {!isSidebarCollapsed && <span>Controle de Acesso</span>}
                </div>
              </button>
            </div>
          </div>
        </JfabNav>

        <div className="p-3 mt-auto border-t border-gray-100 dark:border-slate-800/85 flex flex-col gap-2">
          {/* Sincronização Box */}
          {!isSidebarCollapsed ? (
            <div className="bg-slate-50 dark:bg-slate-800/40 rounded-xl p-3 border border-gray-100 dark:border-slate-800/60 text-xs shadow-sm">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 min-w-0">
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
                  </span>
                  <span className="font-semibold text-[11px] text-slate-700 dark:text-slate-300 truncate">Intranet Sync</span>
                </div>
                <button 
                  onClick={handleManualSync}
                  disabled={isSyncing}
                  title="Sincronizar agora manualmente"
                  className={cn(
                    "p-1 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-md transition text-slate-500 dark:text-slate-400 cursor-pointer disabled:opacity-50",
                    isSyncing && "animate-spin"
                  )}
                >
                  <RefreshCw size={12} />
                </button>
              </div>
              <div className="flex items-center justify-between mt-1.5 text-[10px] text-slate-500 dark:text-slate-400">
                <span>Próximo: <span className="font-mono text-emerald-600 dark:text-emerald-400 font-medium">{syncInterval === 0 ? 'Tempo Real' : formatTimeLeft(countdown)}</span></span>
                {lastSyncTime > 0 && <span>há {Math.round((nowTick - lastSyncTime) / 1000)}s</span>}
              </div>
              <div className="flex items-center justify-between mt-1.5 pt-1.5 border-t border-slate-200 dark:border-slate-850 text-[9px] text-slate-400 dark:text-slate-500">
                <span className="flex items-center gap-1">
                  <Database size={10} className="text-blue-500" />
                  <span>DB: <span className="font-mono text-slate-600 dark:text-slate-300 font-bold">{dbHealth?.sizeFormatted || '...'}</span></span>
                </span>
                <span className="flex items-center gap-1 font-bold text-emerald-600 dark:text-emerald-400">
                  <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full" />
                  <span>{dbHealth?.integrity || 'Íntegro'}</span>
                </span>
              </div>
            </div>
          ) : (
            <div className="bg-slate-50 dark:bg-slate-800/40 rounded-lg p-2 flex flex-col items-center justify-center border border-gray-100 dark:border-slate-800/60 shadow-sm">
              <button 
                onClick={handleManualSync}
                disabled={isSyncing}
                title={syncInterval === 0 ? "Sincronização em Tempo Real (Ativa)" : `Sincronizar agora\nPróximo em: ${formatTimeLeft(countdown)}`}
                className={cn(
                  "p-1.5 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-md text-emerald-500 transition-all cursor-pointer disabled:opacity-50 flex items-center justify-center w-full",
                  isSyncing && "animate-spin"
                )}
              >
                <RefreshCw size={14} />
              </button>
            </div>
          )}

          {/* Unified Horizontal Utility Footer */}
          {!isSidebarCollapsed ? (
            <div className="flex items-center justify-between gap-1 mt-1 pt-1.5 border-t border-gray-50 dark:border-slate-800/45">
              {/* Tema */}
              <button
                type="button"
                onClick={() => setIsDarkMode(!isDarkMode)}
                title={isDarkMode ? "Modo Claro" : "Modo Escuro"}
                className="flex-1 flex justify-center items-center py-2 rounded-lg text-slate-500 hover:bg-slate-50 dark:text-slate-400 dark:hover:bg-slate-800/60 transition cursor-pointer"
              >
                {isDarkMode ? <Sun size={16} className="text-amber-500" /> : <Moon size={16} className="text-slate-400" />}
              </button>

              {/* Apoio PIX */}
              <button
                type="button"
                onClick={() => setIsPixOpen(true)}
                title="Apoiar com PIX ❤️"
                className="flex-1 flex justify-center items-center py-2 rounded-lg text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/20 transition cursor-pointer"
              >
                <Heart size={16} className="text-rose-500 fill-rose-100 dark:fill-rose-950/40" />
              </button>

              {/* Encolher Menu */}
              <button
                onClick={() => setIsSidebarCollapsed(true)}
                title="Recolher Menu"
                className="flex-1 flex justify-center items-center py-2 rounded-lg text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800/50 transition cursor-pointer"
              >
                <PanelLeftClose size={16} />
              </button>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-1.5 mt-1 pt-1.5 border-t border-gray-50 dark:border-slate-800/45">
              {/* Tema */}
              <button
                type="button"
                onClick={() => setIsDarkMode(!isDarkMode)}
                title={isDarkMode ? "Modo Claro" : "Modo Escuro"}
                className="w-8 h-8 flex justify-center items-center rounded-lg text-slate-500 hover:bg-slate-50 dark:text-slate-400 dark:hover:bg-slate-800/60 transition cursor-pointer"
              >
                {isDarkMode ? <Sun size={16} className="text-amber-500" /> : <Moon size={16} className="text-slate-400" />}
              </button>

              {/* Apoio PIX */}
              <button
                type="button"
                onClick={() => setIsPixOpen(true)}
                title="Apoiar com PIX ❤️"
                className="w-8 h-8 flex justify-center items-center rounded-lg text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/20 transition cursor-pointer"
              >
                <Heart size={16} className="text-rose-500 fill-rose-100 dark:fill-rose-950/40" />
              </button>

              {/* Expandir Menu */}
              <button
                onClick={() => setIsSidebarCollapsed(false)}
                title="Expandir Menu"
                className="w-8 h-8 flex justify-center items-center rounded-lg text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800/50 transition cursor-pointer"
              >
                <PanelLeftOpen size={16} />
              </button>
            </div>
          )}
        </div>

        
      </JfabSidebar>

      <JfabMain className="flex-1 flex flex-col overflow-hidden">
        <Header 
          onOpenNotifications={() => setIsNotificationsOpen(true)}
          onOpenSettings={handleOpenSettings}
          notificationCount={notifications.length}
          activePreset={activePreset}
          currentUser={currentUser}
          onLogout={logout}
        />

        <div className="flex-1 overflow-y-auto p-8 space-y-8 custom-scrollbar">
          {currentTab === 'production' && (
            <>
              <QRPanel 
                storage={storage}
                selectedCategory={selectedCategory}
                setSelectedCategory={setSelectedCategory}
                selectedDate={selectedDate}
                setSelectedDate={setSelectedDate}
                selectedContainer={selectedContainer}
                setSelectedContainer={setSelectedContainer}
                onAddCategory={handleOpenAddCategory}
                onManageCategories={() => setModalType('manageCategories')}
                onAddContainer={handleOpenAddContainer}
                onDeleteContainer={handleOpenDeleteContainer}
                onDownloadPDF={handleDownloadPDF}
                onPrintPlate={handlePrintPlate}
                onDownloadDanfePDF={handleDownloadDanfePDF}
                onImportPDF={handleImportFile}
                onAddQR={handleAddQR}
                items={items}
                onEditItem={handleOpenEditItem}
                onDeleteItem={handleOpenDeleteItem}
                onFinalize={handleFinalizeContainer}
                isFinalized={isFinalized}
                activePreset={activePreset}
              />

              {/* Desempenho e Distribuição Grid */}
              <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
                {/* Desempenho Mensal Section */}
                <div className="lg:col-span-3 bg-white rounded-3xl border border-slate-200 shadow-sm p-6 space-y-4 dark:bg-slate-900 dark:border-slate-800">
                  <div className="flex items-center justify-between px-2">
                    <div>
                      <h3 className="text-sm font-black text-slate-800 dark:text-slate-100 uppercase tracking-tight">Desempenho Mensal</h3>
                      <p className="text-[10px] text-slate-500 dark:text-slate-400 font-bold uppercase tracking-widest mt-0.5">Visão consolidada de scans por coleta</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-50 dark:bg-slate-850 rounded-lg border border-slate-100 dark:border-slate-800">
                        <div className="w-2 h-2 rounded-full bg-slate-700 dark:bg-slate-350"></div>
                        <span className="text-[10px] font-bold text-slate-600 dark:text-slate-300">Total Geral</span>
                      </div>
                    </div>
                  </div>
                  <DashboardChart storage={storage} />
                </div>

                {/* Distribuição por Categoria - Donut Chart Component */}
                <div className="lg:col-span-2">
                  <CategoryDonutChart storage={storage} />
                </div>
              </div>
            </>
          )}

          {currentTab === 'calendar' && (
            <CalendarView storage={storage} />
          )}

          {currentTab === 'nfe' && (
            <NFeDashboard 
              storage={storage} 
              onDownloadDanfePDF={handleDownloadDanfePDF}
            />
          )}

          {currentTab === 'search' && (
            <GlobalSearch 
              storage={storage} 
              onNavigate={handleNavigateToContainer} 
            />
          )}

          {currentTab === 'duplicates' && (
            <DuplicatesPanel 
              storage={storage} 
              onNavigate={handleNavigateToContainer} 
              onArchiveAll={archiveAllDuplicates}
            />
          )}

          {currentTab === 'archived' && (
            <div className="space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-slate-100 text-slate-600 rounded-2xl flex items-center justify-center shadow-sm">
                    <Archive size={24} />
                  </div>
                  <div>
                    <h2 className="text-2xl font-bold text-slate-800">Itens Arquivados</h2>
                    <p className="text-sm text-slate-500 font-medium">Histórico de códigos resolvidos ou arquivados no sistema</p>
                  </div>
                </div>
                <div className="px-4 py-2 bg-slate-50 border border-slate-200 text-slate-600 text-xs font-bold rounded-2xl flex items-center gap-2">
                  <span>Total:</span>
                  <span className="font-mono bg-white border border-slate-100 px-2.5 py-0.5 rounded-full text-sm font-bold text-slate-800">{archivedItems.length}</span>
                </div>
              </div>

              {archivedItems.length === 0 ? (
                <div className="bg-white rounded-3xl border border-gray-100 shadow-sm p-16 text-center text-gray-400 flex flex-col items-center">
                  <Archive size={64} className="mb-4 opacity-5" />
                  <p className="text-xl font-bold">Nenhum item arquivado</p>
                  <p className="text-sm mt-2 font-medium opacity-60">Histórico vazio. Quando arquivar duplicatas elas aparecerão aqui.</p>
                </div>
              ) : (
                <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
                  <div className="overflow-x-auto font-sans">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="bg-slate-50/50 border-b border-slate-100">
                          <th className="p-4 text-[10px] font-black uppercase tracking-widest text-slate-400">Código / Item</th>
                          <th className="p-4 text-[10px] font-black uppercase tracking-widest text-slate-400">Coleta / Container</th>
                          <th className="p-4 text-[10px] font-black uppercase tracking-widest text-slate-400">Scanner Original</th>
                          <th className="p-4 text-[10px] font-black uppercase tracking-widest text-slate-400 text-right">Ação</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-50">
                        {archivedItems.map((arch, idx) => (
                          <tr key={idx} className="hover:bg-slate-50/30 transition-colors">
                            <td className="p-4">
                              <span className="font-mono text-sm font-extrabold text-slate-800 break-all select-all">{arch.item.t}</span>
                            </td>
                            <td className="p-4">
                              <div className="flex flex-col gap-1">
                                <span className="text-xs font-bold text-slate-700 bg-slate-100 px-2.5 py-1 rounded-xl inline-block w-fit">{arch.category}</span>
                                <span className="text-[10px] font-semibold text-slate-400">{arch.container}</span>
                              </div>
                            </td>
                            <td className="p-4">
                              <div className="text-xs text-slate-600 font-medium space-y-1">
                                <p>Original em: <span className="font-semibold text-slate-700">{arch.item.original?.date || arch.date}</span></p>
                                <p>Container: <span className="font-semibold text-slate-700">{arch.item.original?.container || arch.container}</span></p>
                                {arch.item.original?.ts && (
                                  <p className="text-[10px] font-mono italic text-slate-400">Leitura: {new Date(arch.item.original.ts).toLocaleString()}</p>
                                )}
                              </div>
                            </td>
                            <td className="p-4 text-right">
                              <button
                                onClick={() => restoreArchivedItem(arch.category, arch.date, arch.container, arch.item.t)}
                                className="px-3.5 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-600 active:scale-95 duration-100 text-[10px] font-bold uppercase tracking-wider rounded-xl transition-all"
                              >
                                Desarquivar
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          )}

          {currentTab === 'errors' && (
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-12 text-center text-gray-400 flex flex-col items-center">
              <AlertCircle size={48} className="mb-4 opacity-20" />
              <p className="text-lg font-medium">Log de Erros Integrado à Central de Notificações</p>
            </div>
          )}

          {currentTab === 'designer' && (
            <LayoutDesigner onDownloadDanfePDF={handleDownloadDanfePDF} />
          )}

          {currentTab === 'coletas' && (
            <ColetasManager 
              storage={storage}
              createCategory={createCategory}
              deleteCategory={deleteCategory}
              renameCategory={renameCategory}
              updateCategoryColor={updateCategoryColor}
              reattributeOrphans={reattributeOrphans}
              deleteOrphansPermanently={deleteOrphansPermanently}
              onSelectCategory={(category) => {
                setSelectedCategory(category);
                setCurrentTab('calendar');
              }}
            />
          )}

          {currentTab === 'users' && (
            <UsersManagement
              storage={storage}
              currentUser={currentUser}
              updateUserRole={updateUserRole}
              deleteUser={deleteUser}
              createUserByAdmin={createUserByAdmin}
              updateCredentialsWithMasterPassword={updateCredentialsWithMasterPassword}
              addNotification={addNotification}
            />
          )}
        </div>

        <JfabFooter className="bg-white border-t border-gray-200 px-8 py-4 text-gray-500 text-xs font-semibold flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex flex-col md:flex-row md:items-center gap-2 text-center md:text-left">
            <span>&copy; 2025 <b>José Felipe A. Barroso.</b> Todos os direitos reservados.</span>
            <span className="hidden md:inline text-gray-300">|</span>
            <button 
              type="button" 
              onClick={() => setIsChangeLogOpen(true)}
              className="text-blue-600 hover:text-blue-700 hover:underline font-bold focus:outline-none transition-colors inline-flex items-center gap-1 cursor-pointer"
            >
              <FileText size={12} />
              <span>Log de Alterações & Auditoria</span>
            </button>
          </div>
          <button 
            type="button"
            onClick={() => setIsPixOpen(true)}
            className="flex items-center gap-1.5 text-rose-500 hover:text-rose-600 font-bold transition active:scale-95 focus:outline-none"
          >
            <Heart size={14} className="fill-rose-500 inline shrink-0" />
            <span>Apoiar o Desenvolvedor por PIX</span>
          </button>
        </JfabFooter>
      </JfabMain>

      {/* Modals Implementation */}
      
      {/* Add Category Modal */}
      <Modal
        isOpen={modalType === 'addCategory'}
        onClose={() => setModalType('none')}
        title="Nova Coleta"
        footer={
          <>
            <button onClick={() => setModalType('none')} className="px-4 py-2 text-sm text-gray-500 hover:bg-gray-100 rounded-xl">Cancelar</button>
            <button onClick={handleConfirmAddCategory} className="px-5 py-2 bg-blue-600 text-white rounded-xl text-sm font-semibold flex items-center gap-2 hover:bg-blue-700">
              <Plus size={16} /> Criar Coleta
            </button>
          </>
        }
      >
        <div className="space-y-4">
          <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest px-1">Nome da Coleta</label>
          <input 
            autoFocus
            type="text"
            value={tempInputValue}
            onChange={(e) => setTempInputValue(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleConfirmAddCategory()}
            className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-blue-500/20 transition-all font-medium"
            placeholder="Ex: Coleta Manhã, Setor A..."
          />
        </div>
      </Modal>

      {/* Add Container Modal */}
      <Modal
        isOpen={modalType === 'addContainer'}
        onClose={() => setModalType('none')}
        title="Novo Contêiner"
        footer={
          <>
            <button onClick={() => setModalType('none')} className="px-4 py-2 text-sm text-gray-500 hover:bg-gray-100 rounded-xl">Cancelar</button>
            <button onClick={handleConfirmAddContainer} className="px-5 py-2 bg-green-600 text-white rounded-xl text-sm font-semibold flex items-center gap-2 hover:bg-green-700">
              <Plus size={16} /> Criar Contêiner
            </button>
          </>
        }
      >
        <div className="space-y-4">
          <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest px-1">Identificação do Contêiner</label>
          <input 
            autoFocus
            type="text"
            value={tempInputValue}
            onChange={(e) => setTempInputValue(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleConfirmAddContainer()}
            className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-blue-500/20 transition-all font-medium"
            placeholder="Ex: Contêiner 01, Rack B-12..."
          />
          <p className="text-[11px] text-emerald-600 font-semibold px-1 flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block"></span>
            Numeração sugerida automaticamente baseada no seu padrão de histórico.
          </p>
        </div>
      </Modal>

      {/* Edit Item Modal */}
      <Modal
        isOpen={modalType === 'editItem'}
        onClose={() => setModalType('none')}
        title="Editar Código"
        footer={
          <>
            <button onClick={() => setModalType('none')} className="px-4 py-2 text-sm text-gray-500 hover:bg-gray-100 rounded-xl">Cancelar</button>
            <button onClick={handleConfirmEditItem} className="px-5 py-2 bg-blue-600 text-white rounded-xl text-sm font-semibold hover:bg-blue-700">
              Salvar Alteração
            </button>
          </>
        }
      >
        <div className="space-y-4">
          <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest px-1">Novo Valor do QR Code</label>
          <input 
            autoFocus
            type="text"
            value={tempInputValue}
            onChange={(e) => setTempInputValue(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleConfirmEditItem()}
            className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-blue-500/20 transition-all font-medium"
          />
        </div>
      </Modal>

      {/* Confirmation Modals */}
      <Modal
        isOpen={modalType === 'manageCategories'}
        onClose={() => setModalType('none')}
        title="Gerenciar Coletas"
        className="max-w-2xl"
      >
        <div className="space-y-6">
          <p className="text-xs text-slate-500 font-semibold uppercase tracking-wider leading-relaxed">
            Gerencie as coletas e lotes cadastrados. Renomeie as coletas existentes ou atribua uma cor temática dinâmica para diferenciar cada lote.
          </p>

          <div className="divide-y divide-slate-100 max-h-[350px] overflow-y-auto pr-2 custom-scrollbar">
            {Object.keys(storage).filter(k => !k.startsWith('_')).map((catName) => {
              const preset = getCategoryPreset(catName, storage);
              const totalContainers = Object.keys(storage[catName] || {}).filter(k => !k.startsWith('_')).length;

              return (
                <div key={catName} className="py-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div className="flex-1 space-y-1">
                    <div className="flex items-center gap-2.5">
                      <span className={cn("w-3.5 h-3.5 rounded-full shrink-0 shadow-sm border border-black/5", preset.bg)}></span>
                      {editingCatName === catName ? (
                        <div className="flex gap-2 items-center flex-1 max-w-sm">
                          <input 
                            type="text"
                            value={renamedValue}
                            onChange={(e) => setRenamedValue(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && handleConfirmRenameCategory(catName)}
                            className="bg-slate-50 border border-slate-300 rounded-xl px-3 py-1.5 text-xs font-bold text-slate-800 outline-none focus:ring-2 focus:ring-blue-500/20 w-full"
                            placeholder={catName}
                            autoFocus
                          />
                          <button 
                            onClick={() => handleConfirmRenameCategory(catName)}
                            className="px-2.5 py-1.5 bg-green-600 hover:bg-green-700 text-white text-[10px] font-black uppercase tracking-wider rounded-lg transition-all"
                          >
                            Salvar
                          </button>
                          <button 
                            onClick={() => setEditingCatName(null)}
                            className="px-2.5 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-700 text-[10px] font-black uppercase tracking-wider rounded-lg transition-all"
                          >
                            X
                          </button>
                        </div>
                      ) : (
                        <span className="font-bold text-slate-800 text-sm select-all">{catName}</span>
                      )}
                    </div>
                    {editingCatName !== catName && (
                      <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">
                        {totalContainers} {totalContainers === 1 ? 'contêiner' : 'contêineres'} • Cor: {preset.name}
                      </p>
                    )}
                  </div>

                  {/* Select Preset Color */}
                  <div className="flex items-center gap-2">
                    <div className="flex gap-1 bg-slate-50 p-1.5 rounded-xl border border-slate-100">
                      {Object.entries(COLOR_PRESETS).map(([colorId, col]) => {
                        const isCurrent = getCategoryColorId(catName, storage) === colorId;
                        return (
                          <button
                            key={colorId}
                            onClick={() => updateCategoryColor(catName, colorId)}
                            title={col.name}
                            className={cn(
                              "w-5 h-5 rounded-full transition-transform hover:scale-125 focus:outline-none relative flex items-center justify-center shadow-xs border border-black/5",
                              col.bg,
                              isCurrent && "scale-110 ring-2 ring-slate-400 ring-offset-1"
                            )}
                          >
                            {isCurrent && <span className="w-1.5 h-1.5 bg-white rounded-full"></span>}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Rename or delete */}
                  {editingCatName !== catName && (
                    <div className="flex gap-1.5 justify-end">
                      <button 
                        onClick={() => {
                          setEditingCatName(catName);
                          setRenamedValue(catName);
                        }}
                        className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-[10px] font-black uppercase tracking-wider rounded-xl transition-all border border-slate-205"
                      >
                        Renomear
                      </button>
                      <button 
                        onClick={() => handleDeleteCategoryClick(catName)}
                        className="px-3 py-1.5 bg-red-50 hover:bg-red-100 text-red-650 text-[10px] font-black uppercase tracking-wider rounded-xl transition-all border border-red-100"
                      >
                        Excluir
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
            {Object.keys(storage).filter(k => !k.startsWith('_')).length === 0 && (
              <p className="text-center py-8 text-xs text-slate-400 font-black uppercase tracking-widest leading-relaxed">
                Nenhuma coleta registrada no sistema
              </p>
            )}
          </div>
        </div>
      </Modal>

      <ConfirmModal 
        isOpen={modalType === 'deleteCategory'}
        onClose={() => setModalType('manageCategories')}
        title="Excluir Coleta"
        message={`Tem certeza de que deseja excluir permanentemente a coleta "${categoryToDelete}"? Todos os contêineres e logs de QR Code dentro dela serão perdidos definitivamente. Esta ação é irreversível.`}
        onConfirm={handleConfirmDeleteCategory}
        variant="danger"
        confirmLabel="Confirmar Exclusão"
      />

      <Modal
        isOpen={isChangeLogOpen}
        onClose={() => setIsChangeLogOpen(false)}
        title="Histórico de Evolução & Auditoria de Atividade"
        className="max-w-3xl"
        footer={
          <button 
            type="button" 
            onClick={() => setIsChangeLogOpen(false)} 
            className="px-5 py-2.5 bg-blue-600 hover:bg-slate-800 text-white rounded-xl text-[10px] font-black uppercase tracking-widest cursor-pointer transition active:scale-95"
          >
            Fechar Painel
          </button>
        }
      >
        <ChangelogAndAuditModalContent storage={storage} />
      </Modal>

      <ConfirmModal 
        isOpen={modalType === 'deleteItem'}
        onClose={() => setModalType('none')}
        title="Excluir Item"
        message="Tem certeza que deseja excluir este QR Code permanentemente? Esta ação não pode ser desfeita."
        onConfirm={handleConfirmDeleteItem}
        variant="danger"
        confirmLabel="Excluir Agora"
      />

      <ConfirmModal 
        isOpen={modalType === 'deleteContainer'}
        onClose={() => setModalType('none')}
        title="Apagar Contêiner"
        message={`Deseja realmente limpar todos os itens registrados no contêiner "${selectedContainer}"? Esta ação removerá permanentemente os registros salvos.`}
        onConfirm={handleConfirmClearContainer}
        variant="danger"
        confirmLabel="Limpar Tudo"
      />

      <ConfirmModal 
        isOpen={modalType === 'clearNotifications'}
        onClose={() => setModalType('none')}
        title="Limpar Notificações"
        message="Deseja realmente apagar todo o histórico de notificações?"
        onConfirm={handleConfirmClearNotifications}
        variant="danger"
        confirmLabel="Limpar Agora"
      />

      {/* Settings Modal */}
      <Modal
        isOpen={modalType === 'settings'}
        onClose={() => setModalType('none')}
        title="Configurações do Sistema"
        className="max-w-xl"
      >
        <div className="space-y-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="space-y-6">
              <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                <Volume2 size={14} className="text-blue-500" /> Alertas Sonoros
              </h4>
              
              <div className="space-y-4">
                {[
                  { id: 'success' as SoundType, label: 'Sucesso', color: 'bg-green-50 text-green-700 border-green-200' },
                  { id: 'duplicate' as SoundType, label: 'Duplicata', color: 'bg-orange-50 text-orange-700 border-orange-200' },
                  { id: 'error' as SoundType, label: 'Erro', color: 'bg-red-50 text-red-700 border-red-200' }
                ].map((sound) => (
                  <div key={sound.id} className={`p-4 rounded-2xl border ${sound.color}`}>
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-xs font-bold">{sound.label}</span>
                      <button 
                        onClick={() => playSound(sound.id)}
                        className="p-1 hover:bg-white/50 rounded flex transition-colors"
                      >
                        <Volume2 size={14} />
                      </button>
                    </div>
                    
                    <label className="flex items-center justify-center gap-2 w-full py-2 bg-white/60 hover:bg-white border border-dashed border-current rounded-xl cursor-pointer transition-all text-[10px] font-bold">
                      <Upload size={12} />
                      Carregar
                      <input 
                        type="file" 
                        accept="audio/*" 
                        className="hidden" 
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) handleAudioUpload(sound.id, file);
                        }}
                      />
                    </label>
                  </div>
                ))}
              </div>
            </div>

            <div className="space-y-6">
              <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                <FileText size={14} className="text-blue-500" /> Dimensões do PDF
              </h4>

              <div className="space-y-5 p-5 bg-slate-50 rounded-2xl border border-slate-100">
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <label className="text-xs font-bold text-slate-600">Tam. QR Code</label>
                    <span className="text-[10px] font-mono text-blue-600 font-bold">{pdfSettings.qrSize}mm</span>
                  </div>
                  <input 
                    type="range" min="20" max="150" step="5"
                    value={pdfSettings.qrSize}
                    onChange={(e) => setPdfSettings(prev => ({ ...prev, qrSize: parseInt(e.target.value) }))}
                    className="w-full h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
                  />
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <label className="text-xs font-bold text-slate-600">Largura Barras</label>
                    <span className="text-[10px] font-mono text-blue-600 font-bold">{pdfSettings.barcodeWidth}mm</span>
                  </div>
                  <input 
                    type="range" min="50" max="180" step="10"
                    value={pdfSettings.barcodeWidth}
                    onChange={(e) => setPdfSettings(prev => ({ ...prev, barcodeWidth: parseInt(e.target.value) }))}
                    className="w-full h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
                  />
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <label className="text-xs font-bold text-slate-600">Altura Barras</label>
                    <span className="text-[10px] font-mono text-blue-600 font-bold">{pdfSettings.barcodeHeight}mm</span>
                  </div>
                  <input 
                    type="range" min="10" max="80" step="5"
                    value={pdfSettings.barcodeHeight}
                    onChange={(e) => setPdfSettings(prev => ({ ...prev, barcodeHeight: parseInt(e.target.value) }))}
                    className="w-full h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
                  />
                </div>

                <div className="pt-4 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between gap-4">
                  <div className="flex flex-col">
                    <span className="text-xs font-bold text-slate-700 dark:text-slate-200">Baixar Backup JSON com o PDF</span>
                    <span className="text-[10px] text-slate-400 dark:text-slate-500">Faz o download automático do arquivo .json junto do relatório PDF</span>
                  </div>
                  <input 
                    type="checkbox" 
                    checked={pdfSettings.downloadJsonWithPdf}
                    onChange={(e) => setPdfSettings(prev => ({ ...prev, downloadJsonWithPdf: e.target.checked }))}
                    className="w-4.5 h-4.5 rounded text-blue-600 border-slate-300 dark:border-slate-700 focus:ring-blue-500 shrink-0 cursor-pointer"
                  />
                </div>
              </div>

              <div className="p-4 bg-blue-50/50 rounded-xl border border-blue-100/50">
                <p className="text-[10px] text-blue-600 leading-relaxed font-medium">
                  <b>Dica:</b> O tamanho padrão é otimizado para folhas A4. Para etiquetas térmicas, use valores menores de largura.
                </p>
              </div>
            </div>
          </div>

          {/* Sincronização Global */}
          <div className="space-y-6 pt-6 border-t border-slate-150">
            <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
              <Database size={14} className="text-blue-500" /> Sincronização com o Servidor
            </h4>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-slate-50 p-5 rounded-2xl border border-slate-100">
              <div className="space-y-3">
                <label className="block text-xs font-bold text-slate-600">Intervalo Ativo</label>
                <select 
                  value={syncInterval}
                  onChange={(e) => setCustomSyncInterval(parseInt(e.target.value))}
                  className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2.5 outline-none focus:ring-2 focus:ring-blue-500/20 text-xs font-semibold text-slate-700 shadow-sm"
                >
                  {presets.map(mins => (
                    <option key={mins} value={mins}>
                      {mins === 0 ? 'Tempo Real (Sinc. Imediata)' : mins === 1 ? 'A cada 1 minuto' : `A cada ${mins} minutos`}
                    </option>
                  ))}
                </select>
                <p className="text-[10px] text-slate-500 font-semibold leading-relaxed">
                  * Este temporizador rege todas as sincronizações de dados globais e atua sobre todos os clientes conectados.
                </p>
              </div>

              <div className="space-y-3">
                <label className="block text-xs font-bold text-slate-600">Inserir Novo Intervalo (Minutos)</label>
                <div className="flex gap-2">
                  <input 
                    type="number" 
                    min="1" 
                    max="1440"
                    placeholder="Ex: 45"
                    id="customIntervalInput"
                    className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2.5 outline-none focus:ring-2 focus:ring-blue-500/20 text-xs font-semibold shadow-sm"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        const val = parseInt((e.target as HTMLInputElement).value);
                        if (val > 0) {
                          addPreset(val);
                          (e.target as HTMLInputElement).value = '';
                        }
                      }
                    }}
                  />
                  <button 
                    type="button"
                    onClick={() => {
                      const input = document.getElementById('customIntervalInput') as HTMLInputElement;
                      const val = parseInt(input.value);
                      if (val > 0) {
                        addPreset(val);
                        input.value = '';
                      }
                    }}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold text-[10px] uppercase tracking-wider rounded-xl transition-all shadow-sm active:scale-95 shrink-0"
                  >
                    Adicionar
                  </button>
                </div>
                
                <div className="pt-1.5">
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider block mb-1">Meus Presets Ativos:</span>
                  <div className="flex flex-wrap gap-1 max-h-16 overflow-y-auto">
                    {presets.map(mins => (
                      <button
                        key={mins}
                        onClick={() => setCustomSyncInterval(mins)}
                        className={cn(
                          "px-2 py-1 border rounded-lg text-[9px] font-black transition-all",
                          syncInterval === mins 
                            ? "bg-blue-600 text-white border-blue-600 shadow-sm" 
                            : "bg-white text-slate-600 border-slate-200 hover:border-slate-300"
                        )}
                      >
                        {mins === 0 ? 'T. Real' : `${mins}m`}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Saúde do Banco de Dados & Integridade */}
          <div className="space-y-6 pt-6 border-t border-slate-150">
            <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
              <Database size={14} className="text-emerald-500" /> Saúde & Integridade do Banco de Dados
            </h4>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-slate-50 dark:bg-slate-800/40 p-4 rounded-2xl border border-slate-100 dark:border-slate-800/60 flex flex-col justify-between space-y-2">
                <span className="text-[10px] text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider">Espaço Ocupado</span>
                <span className="text-xl font-black text-slate-800 dark:text-slate-200 font-mono">
                  {dbHealth?.sizeFormatted || 'Calculando...'}
                </span>
                <span className="text-[9px] text-slate-400 dark:text-slate-500 leading-normal">
                  Tamanho físico do arquivo de persistência (`storage.db (SQLite)`) armazenado no servidor.
                </span>
              </div>
              
              <div className="bg-slate-50 dark:bg-slate-800/40 p-4 rounded-2xl border border-slate-100 dark:border-slate-800/60 flex flex-col justify-between space-y-2">
                <span className="text-[10px] text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider">Integridade dos Dados</span>
                <div className="flex items-center gap-1.5">
                  <span className={cn(
                    "w-2 h-2 rounded-full",
                    dbHealth?.integrity === "Excelente" ? "bg-emerald-500 animate-pulse" : "bg-amber-500"
                  )} />
                  <span className={cn(
                    "text-xs font-black uppercase tracking-wider",
                    dbHealth?.integrity === "Excelente" ? "text-emerald-600 dark:text-emerald-400" : "text-amber-600 dark:text-amber-400"
                  )}>
                    {dbHealth?.integrity || 'Verificando...'}
                  </span>
                </div>
                <span className="text-[9px] text-slate-400 dark:text-slate-500 leading-normal">
                  {dbHealth?.message || 'Validando integridade estrutural e consistência de dados.'}
                </span>
              </div>

              <div className="bg-slate-50 dark:bg-slate-800/40 p-4 rounded-2xl border border-slate-100 dark:border-slate-800/60 flex flex-col justify-between space-y-2">
                <span className="text-[10px] text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider">Registros Totais</span>
                <span className="text-xl font-black text-slate-800 dark:text-slate-200 font-mono font-medium">
                  {dbHealth?.itemCount !== undefined ? `${dbHealth.itemCount} itens` : 'Calculando...'}
                </span>
                <button 
                  type="button"
                  onClick={async () => {
                    await fetchDbHealth();
                    addNotification('success', 'Diagnóstico Realizado', 'Estatísticas e integridade do banco de dados atualizadas.');
                  }}
                  className="text-left text-[9px] text-blue-600 dark:text-blue-400 hover:underline cursor-pointer font-bold"
                >
                  Executar verificação manual
                </button>
              </div>
            </div>
          </div>

          {/* Importar / Exportar Banco de Dados */}
          <div className="space-y-6 pt-6 border-t border-slate-150">
            <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
              <Database size={14} className="text-blue-500" /> Backup / Restauração de Dados
            </h4>
            
            <div className="bg-slate-50 p-5 rounded-2xl border border-slate-100 flex flex-col md:flex-row gap-4 items-center justify-between">
              <div className="space-y-1 text-center md:text-left">
                <p className="text-xs font-bold text-slate-700">Backup Completo do Sistema (JSON)</p>
                <p className="text-[10px] text-slate-400 leading-normal max-w-sm">
                  Exporte todo o seu banco de dados atual para um arquivo de salvaguarda, ou restaure dados importando um arquivo JSON exportado anteriormente.
                </p>
              </div>
              
              <div className="flex flex-wrap gap-3 shrink-0">
                {/* Export Button */}
                <button
                  type="button"
                  onClick={() => {
                    try {
                      const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(storage, null, 2));
                      const downloadAnchor = document.createElement('a');
                      downloadAnchor.setAttribute("href", dataStr);
                      downloadAnchor.setAttribute("download", `coleta_segura_backup_${new Date().toISOString().slice(0,10)}.json`);
                      document.body.appendChild(downloadAnchor);
                      downloadAnchor.click();
                      downloadAnchor.remove();
                      addNotification('success', 'Backup Exportado', 'O banco de dados completo foi baixado com sucesso!');
                    } catch (err) {
                      console.error(err);
                      addNotification('error', 'Exportação Falhou', 'Não foi possível gerar o arquivo de backup.');
                    }
                  }}
                  className="px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs uppercase tracking-wider rounded-xl flex items-center gap-2 transition-all shadow-sm active:scale-95 cursor-pointer"
                >
                  <Download size={14} />
                  <span>Exportar Dados</span>
                </button>

                {/* Import Button */}
                <label className="px-4 py-2.5 bg-slate-800 hover:bg-slate-900 border border-slate-700 text-slate-200 hover:text-white font-bold text-xs uppercase tracking-wider rounded-xl flex items-center gap-2 transition-all shadow-sm active:scale-95 cursor-pointer">
                  <Upload size={14} />
                  <span>Importar Dados</span>
                  <input
                    type="file"
                    accept=".json"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (!file) return;

                      const reader = new FileReader();
                      reader.onload = async (event) => {
                        try {
                          const parsed = JSON.parse(event.target?.result as string);
                          const res = await importFullStorage(parsed);
                          if (res.success) {
                            addNotification('success', 'Backup Importado', res.message);
                          } else {
                            addNotification('error', 'Falha na Importação', res.message);
                          }
                        } catch (err) {
                          addNotification('error', 'Importação Falhou', 'Arquivo JSON de backup inválido.');
                        }
                      };
                      reader.readAsText(file);
                    }}
                  />
                </label>
              </div>
            </div>
          </div>

          <div className="pt-4 border-t border-gray-100">
            <p className="text-[9px] text-gray-400 text-center uppercase tracking-widest font-bold">
              Configurações salvas localmente e sincronizadas em nuvem
            </p>
          </div>
        </div>
      </Modal>

      {/* PDF Progress Modal */}
      <Modal
        isOpen={pdfProgress.isOpen}
        onClose={() => {}}
        title="Gerando Relatório"
        className="max-w-md"
      >
        <div className="py-6 px-4 space-y-6">
          <div className="flex justify-between items-end mb-1">
            <div>
              <p className="text-sm font-black text-slate-800">Processando Etiquetas</p>
              <p className="text-xs text-slate-500 font-medium tracking-tight">Criando páginas e renderizando códigos...</p>
            </div>
            <span className="text-xl font-black text-blue-600 font-mono">
              {Math.round((pdfProgress.current / pdfProgress.total) * 100)}%
            </span>
          </div>

          <div className="w-full bg-slate-100 h-3 rounded-full overflow-hidden border border-slate-200 p-0.5 shadow-inner">
            <div 
              className="h-full bg-blue-600 rounded-full transition-all duration-300 shadow-sm"
              style={{ width: `${(pdfProgress.current / pdfProgress.total) * 100}%` }}
            ></div>
          </div>
          
          <div className="flex items-center justify-center gap-2 text-[10px] text-slate-400 font-bold uppercase tracking-widest">
            <span>Item {pdfProgress.current}</span>
            <span className="opacity-30">/</span>
            <span>{pdfProgress.total} Total</span>
          </div>
        </div>
      </Modal>

      {/* Pix Donation Modal */}
      <Modal
        isOpen={isPixOpen}
        onClose={() => setIsPixOpen(false)}
        title="Apoiar com PIX ❤️"
        footer={
          <button 
            type="button"
            onClick={() => setIsPixOpen(false)} 
            className="w-full sm:w-auto px-5 py-2.5 bg-gray-950 text-white rounded-xl text-sm font-semibold hover:bg-gray-800 transition shadow-sm"
          >
            Fechar
          </button>
        }
      >
        <div className="space-y-4 text-center py-2">
          <div className="mx-auto w-16 h-16 bg-rose-50 rounded-full flex items-center justify-center text-rose-500 animate-pulse">
            <Heart size={32} className="fill-rose-500" />
          </div>
          
          <div className="space-y-1">
            <h3 className="text-base font-bold text-slate-800">Gostou deste projeto?</h3>
            <p className="text-xs text-slate-500 max-w-sm mx-auto leading-relaxed">
              Você pode apoiar o desenvolvimento contínuo enviando qualquer valor por PIX. Sua generosidade ajuda a otimizar e evoluir esta ferramenta!
            </p>
          </div>

          <div className="py-2">
            {pixQRCodeUrl ? (
              <div className="mx-auto w-44 h-44 bg-white border border-slate-200 dark:border-slate-800 p-2.5 rounded-2xl shadow flex items-center justify-center relative select-none">
                <img 
                  src={pixQRCodeUrl} 
                  alt="QR Code PIX para doação" 
                  className="w-full h-full object-contain"
                  referrerPolicy="no-referrer"
                />
              </div>
            ) : (
              <div className="mx-auto w-44 h-44 bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl flex items-center justify-center text-xs text-slate-400">
                Gerando QR Code...
              </div>
            )}
            <p className="text-[9px] text-slate-400 mt-1.5 font-bold uppercase tracking-wider">
              Abra o app do seu Banco e aponte a câmera
            </p>
          </div>

          <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 max-w-xs mx-auto space-y-3 shadow-inner">
            <div className="text-left">
              <span className="text-[9px] uppercase font-bold tracking-widest text-slate-400">Chave PIX (E-mail):</span>
              <div className="text-slate-800 font-mono font-black text-xs bg-white border border-slate-100 p-2.5 rounded-xl flex items-center justify-between select-all mt-1">
                <span>pixdobarroso@gmail.com</span>
                <button 
                  type="button"
                  onClick={handleCopyPix}
                  className="ml-2 p-1.5 bg-slate-100 hover:bg-rose-100 hover:text-rose-600 rounded-lg text-slate-500 transition-all cursor-pointer"
                  title="Copiar chave"
                >
                  <Copy size={13} />
                </button>
              </div>
            </div>
            
            <div className="text-[10px] font-bold text-emerald-600 flex items-center justify-center gap-1.5 h-4">
              {copiedPix ? (
                <>✓ Chave copiada com sucesso!</>
              ) : (
                <span className="opacity-60 text-slate-400 font-normal">Clique no ícone para copiar</span>
              )}
            </div>
          </div>

          <p className="text-[10px] font-semibold text-slate-400">
            Desenvolvido por <b>José Felipe A. Barroso</b>
          </p>
        </div>
      </Modal>

      <NotificationCenter 
        isOpen={isNotificationsOpen}
        onClose={() => setIsNotificationsOpen(false)}
        notifications={notifications}
        onClear={handleClearNotifications}
      />
    </JfabContainer>
  );
}

