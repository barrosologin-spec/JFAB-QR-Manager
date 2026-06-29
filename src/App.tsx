import {useState, useEffect, useMemo} from 'react';
import {jsPDF} from 'jspdf';
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
    return () => window.removeEventListener('hashchange', handleHashChange);
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

  const handlePrintPlate = async () => {
    if (!selectedContainer || !isFinalized) return;
    
    addNotification('info', 'Gerando Placa', `Preparando identificação para ${selectedContainer}...`);
    
    let plateTemplate: any = null;
    try {
      const saved = localStorage.getItem('jfab_custom_template_plate');
      if (saved) {
        plateTemplate = JSON.parse(saved);
      }
    } catch (e) {
      console.error(e);
    }

    const doc = new jsPDF();
    const pageWidth = 210;
    const pageHeight = 297;
    const operatorName = currentUser?.name ? currentUser.name.toUpperCase() : "JOSÉ FELIPE A. BARROSO";

    try {
      const dataUrl = await generateBarcodeDataURL(selectedContainer);
      
      const primaryColor = plateTemplate ? plateTemplate.primaryColor : '#2563eb';
      const textColor = plateTemplate ? plateTemplate.textColor : '#0f172a';
      const mainBorderWidth = plateTemplate ? plateTemplate.borderWidth / 3.5 : 0.4;
      const mainBorderRadius = plateTemplate ? plateTemplate.borderRadius / 3.5 : 4;
      
      // 1. WATERMARKS - Super Light Gray for Ink Saving
      doc.setTextColor(243, 244, 246);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(24);
      doc.text(operatorName, 105, 90, { align: 'center', angle: 25 });
      doc.text(operatorName, 105, 160, { align: 'center', angle: 25 });
      doc.text(operatorName, 105, 230, { align: 'center', angle: 25 });

      // 2. MAIN BORDER - Thin Slate Outline Instead of solid dark block
      doc.setDrawColor(primaryColor);
      doc.setLineWidth(mainBorderWidth > 0 ? mainBorderWidth : 0.4);
      doc.roundedRect(10, 10, 190, 277, mainBorderRadius, mainBorderRadius, 'D');

      // 3. HEADER SECTION (Left branding, Right Seal)
      // Branding text (Left)
      doc.setTextColor(textColor);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(14);
      doc.text("JFAB ..::SISTEMAS::..", 16, 21);
      
      doc.setFont("helvetica", "normal");
      doc.setFontSize(8);
      doc.setTextColor(100, 116, 139); // slate-500
      doc.text(plateTemplate && plateTemplate.title ? plateTemplate.title : "EXTRATO E IDENTIFICAÇÃO DE FLUXO DE PRODUÇÃO", 16, 26);
      doc.text(plateTemplate && plateTemplate.subtitle ? plateTemplate.subtitle : "QR MANAGER CLOUD • RELATÓRIO DO LOTE", 16, 31);

      // PRODUCTION SEAL / STAMP (Right) - Elegant Ink-Efficient Production-Seal
      const stampX = 134;
      const stampY = 14;
      const stampW = 58;
      const stampH = 22;
      
      // Outer border of stamp
      doc.setDrawColor(primaryColor);
      doc.setLineWidth(0.8);
      doc.rect(stampX, stampY, stampW, stampH, 'D');
      
      // Inner border of stamp (dashed/thin)
      doc.setLineWidth(0.3);
      doc.rect(stampX + 1.2, stampY + 1.2, stampW - 2.4, stampH - 2.4, 'D');

      // Stamp text
      doc.setTextColor(primaryColor);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(10);
      doc.text("FINALIZADO", stampX + (stampW / 2), stampY + 6, { align: 'center' });
      
      doc.setFont("helvetica", "normal");
      doc.setFontSize(6.5);
      doc.text("APROVADO & CHANCELADO", stampX + (stampW / 2), stampY + 11, { align: 'center' });
      
      const currentFullDate = format(new Date(), 'dd/MM/yyyy HH:mm:ss');
      doc.setFont("helvetica", "bold");
      doc.setFontSize(7);
      doc.text(currentFullDate, stampX + (stampW / 2), stampY + 16, { align: 'center' });

      // First Divider line
      doc.setDrawColor(primaryColor);
      doc.setLineWidth(0.4);
      doc.line(15, 40, 195, 40);

      // 4. LARGE CONTAINER IDENTIFIER (Clean Box with outline, no solid fill)
      doc.setDrawColor(241, 245, 249);
      doc.setLineWidth(1);
      doc.rect(15, 44, 180, 42, 'D');

      doc.setTextColor(148, 163, 184); // slate-400
      doc.setFont("helvetica", "bold");
      doc.setFontSize(8);
      doc.text("CÓDIGO IDENTIFICADOR DO CONTÊINER", 105, 52, { align: 'center' });

      doc.setTextColor(textColor);
      doc.setFont("helvetica", "bold");
      
      const contId = selectedContainer.toUpperCase();
      // Adjust font size dynamically if container text is extremely long
      if (contId.length > 12) {
        doc.setFontSize(36);
        doc.text(contId, 105, 71, { align: 'center' });
      } else {
        doc.setFontSize(50);
        doc.text(contId, 105, 74, { align: 'center' });
      }

      // Second Divider
      doc.setDrawColor(primaryColor);
      doc.setLineWidth(0.4);
      doc.line(15, 91, 195, 91);

      // 5. METADATA GRID (Left) & QR/BARCODE IDENTIFIER (Right)
      // Left Pane - Operational stats
      doc.setTextColor(100, 116, 139);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(8.5);
      doc.text("DADOS DA OPERAÇÃO:", 16, 100);

      const labelX = 16;
      doc.setFontSize(10);
      doc.setTextColor(100, 116, 139);
      doc.setFont("helvetica", "normal");
      
      doc.text("COLETA / LINHA:", labelX, 111);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(textColor);
      doc.setFontSize(12);
      doc.text(selectedCategory.toUpperCase(), labelX, 117);

      doc.setFontSize(10);
      doc.setTextColor(100, 116, 139);
      doc.setFont("helvetica", "normal");
      doc.text("DATA DE REGISTRO:", labelX, 128);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(textColor);
      doc.setFontSize(12);
      doc.text(selectedDate, labelX, 134);

      doc.setFontSize(10);
      doc.setTextColor(100, 116, 139);
      doc.setFont("helvetica", "normal");
      doc.text("VOLUMES ESCANEADOS:", labelX, 145);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(primaryColor);
      doc.setFontSize(12);
      
      const nfeItems = items.filter(i => i.nfeData);
      const isNFe = nfeItems.length > 0;
      
      if (isNFe) {
        let totalVols = 0;
        nfeItems.forEach(ni => {
          totalVols += parseInt(ni.nfeData?.volumes || "1", 10) || 1;
        });
        doc.text(`${totalVols} VOLUMES DE ${nfeItems.length} NF${nfeItems.length > 1 ? 's' : ''}`, labelX, 151);
      } else {
        doc.text(`${items.length} ITENS CADASTRADOS`, labelX, 151);
      }

      // Right Pane - QR/Barcode image placement
      doc.setTextColor(100, 116, 139);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(8.5);
      doc.text("CHAVE DIGITALIZÁVEL:", 116, 100);

      const isForcedQR = plateTemplate ? plateTemplate.useQrCode : !/^\d+$/.test(selectedContainer);
      if (isForcedQR) {
        doc.addImage(dataUrl, 'PNG', 122, 104, 52, 52);
      } else {
        doc.addImage(dataUrl, 'PNG', 116, 112, 70, 36);
      }

      // Third Divider
      doc.setDrawColor(primaryColor);
      doc.setLineWidth(0.4);
      doc.line(15, 162, 195, 162);

      let manifestoY = 170;
      let tableY = 175;
      let listLimit = 10;
      
      if (isNFe) {
        if (nfeItems.length === 1) {
          const mainNfe = nfeItems[0].nfeData;
          doc.setTextColor(textColor);
          doc.setFont("helvetica", "bold");
          doc.setFontSize(8.5);
          doc.text("DADOS DA NOTA FISCAL ELETRÔNICA:", 16, 170);

          doc.setFontSize(7.5);
          doc.text("CHAVE:", 16, 176);
          doc.setFont("helvetica", "normal");
          doc.text(mainNfe.chave || nfeItems[0].t, 30, 176);
          
          doc.setFont("helvetica", "bold");
          doc.text("EMITENTE:", 16, 181);
          doc.setFont("helvetica", "normal");
          const emitenteStr = mainNfe.emitente?.nome || mainNfe.emitente?.xNome || mainNfe.infNFe?.emit?.xNome || "N/A";
          doc.text(String(emitenteStr).substring(0, 90), 34, 181);

          doc.setFont("helvetica", "bold");
          doc.text("DESTINATÁRIO:", 16, 186);
          doc.setFont("helvetica", "normal");
          const destStr = mainNfe.destinatario?.nome || mainNfe.destinatario?.xNome || mainNfe.infNFe?.dest?.xNome || "N/A";
          doc.text(String(destStr).substring(0, 90), 40, 186);

          doc.setFont("helvetica", "bold");
          doc.text("TRANSPORTE:", 16, 191);
          doc.setFont("helvetica", "normal");
          const transpStr = mainNfe.transportadora?.nome || mainNfe.infNFe?.transp?.transporta?.xNome || "N/A";
          doc.text(String(transpStr).substring(0, 70), 40, 191);

          doc.setFont("helvetica", "bold");
          doc.text("VOLUME(S):", 150, 191);
          doc.setFont("helvetica", "normal");
          const volsStr = mainNfe.volumes || "N/A";
          doc.text(String(volsStr), 172, 191);

          doc.setDrawColor(primaryColor);
          doc.line(15, 195, 195, 195);
          
          manifestoY = 202;
          tableY = 207;
          listLimit = 5;
        } else {
          doc.setTextColor(textColor);
          doc.setFont("helvetica", "bold");
          doc.setFontSize(8.5);
          doc.text(`NOTAS FISCAIS ELETRÔNICAS INTEGRADAS (LOTE DE ${nfeItems.length} NFs):`, 16, 170);

          doc.setFontSize(7);
          doc.setTextColor(100, 116, 139);
          doc.text("CHAVE / NF-e", 16, 175);
          doc.text("EMITENTE", 82, 175);
          doc.text("DESTINATÁRIO", 138, 175);
          doc.text("VOLS", 188, 175);

          doc.setDrawColor(primaryColor);
          doc.setLineWidth(0.3);
          doc.line(15, 177, 195, 177);

          doc.setFont("helvetica", "normal");
          doc.setTextColor(textColor);
          
          const displayNfes = nfeItems.slice(0, 3);
          displayNfes.forEach((nItem, index) => {
            const nY = 181 + (index * 4.8);
            const dataNfe = nItem.nfeData;
            
            doc.text(nItem.t.substring(0, 4) + "..." + nItem.t.substring(40), 16, nY);
            
            const emitName = dataNfe.emitente?.nome || dataNfe.emitente?.xNome || "N/A";
            doc.text(String(emitName).substring(0, 24), 82, nY);
            
            const destName = dataNfe.destinatario?.nome || dataNfe.destinatario?.xNome || "N/A";
            doc.text(String(destName).substring(0, 24), 138, nY);
            
            const vols = dataNfe.volumes || "1";
            doc.text(String(vols), 188, nY);
          });

          if (nfeItems.length > 3) {
            doc.setFont("helvetica", "italic");
            doc.setFontSize(6);
            doc.setTextColor(100, 116, 139);
            doc.text(`+ ${nfeItems.length - 3} outras notas fiscais vinculadas ao mesmo contêiner.`, 16, 196);
          }

          doc.setDrawColor(primaryColor);
          doc.line(15, 198, 195, 198);

          manifestoY = 202;
          tableY = 207;
          listLimit = 5;
        }
      }

      // 6. DETAILED SUMMARY OF REGISTERED ITEMS (Content Manifesto)
      doc.setTextColor(textColor);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(8.5);
      doc.text("MANIFESTO DE COMPOSIÇÃO DE CARGA (ITENS ESCANEADOS LOTE):", 16, manifestoY);

      // Draw table headers
      doc.setTextColor(100, 116, 139);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(7.5);
      doc.text("#", 16, tableY);
      doc.text(isNFe ? "DESCRIÇÃO DO PRODUTO" : "VALOR CADASTRADO DO QR CODE / ETIQUETA", 26, tableY);
      doc.text(isNFe ? "QTD" : "DATA E HORÁRIO DE SCANEAMENTO", 142, tableY);

      doc.setDrawColor(primaryColor);
      doc.setLineWidth(0.4);
      doc.line(15, tableY + 2, 195, tableY + 2);

      // Render the items
      doc.setFont("helvetica", "normal");
      doc.setFontSize(7.5);
      doc.setTextColor(textColor);

      let currentPage = 1;
      const allowMultiPage = plateTemplate ? (plateTemplate.allowMultiPage ?? true) : true;

      if (isNFe) {
        const allNfeProducts: any[] = [];
        nfeItems.forEach(ni => {
          if (ni.nfeData && Array.isArray(ni.nfeData.produtos)) {
            allNfeProducts.push(...ni.nfeData.produtos);
          }
        });

        if (allNfeProducts.length > 0) {
          const displayItems = allNfeProducts.slice(0, listLimit);
          displayItems.forEach((prod: any, index: number) => {
            const itemY = tableY + 7 + (index * 7.2);
            
            doc.setDrawColor(241, 245, 250);
            doc.setLineWidth(0.2);
            doc.line(15, itemY + 1.8, 195, itemY + 1.8);

            doc.setFont("helvetica", "bold");
            doc.text(String(index + 1), 16, itemY);
            
            doc.setFont("helvetica", "bold");
            let labelText = prod.nome || "N/A";
            if (labelText.length > 56) {
              labelText = labelText.substring(0, 53) + "...";
            }
            doc.text(labelText, 26, itemY);

            doc.setFont("helvetica", "normal");
            doc.text((prod.qtd || "1") + " UN", 142, itemY);
          });

          if (allNfeProducts.length > listLimit) {
            if (allowMultiPage) {
              const remainingProducts = allNfeProducts.slice(listLimit);
              const itemsPerPage = 32;
              const totalPages = 1 + Math.ceil(remainingProducts.length / itemsPerPage);
              
              for (let rIdx = 0; rIdx < remainingProducts.length; rIdx += itemsPerPage) {
                doc.addPage();
                currentPage++;
                
                // Draw Watermarks on subsequent pages
                doc.setTextColor(243, 244, 246);
                doc.setFont("helvetica", "bold");
                doc.setFontSize(24);
                doc.text(operatorName, 105, 90, { align: 'center', angle: 25 });
                doc.text(operatorName, 105, 160, { align: 'center', angle: 25 });
                
                // Draw Border
                doc.setDrawColor(primaryColor);
                doc.setLineWidth(mainBorderWidth);
                doc.rect(10, 10, 190, 277);
                
                // Header
                doc.setTextColor(primaryColor);
                doc.setFont("helvetica", "bold");
                doc.setFontSize(10);
                doc.text("MANIFESTO DE COMPOSIÇÃO DE CARGA - CONTINUAÇÃO", 16, 20);
                
                doc.setTextColor(100, 116, 139);
                doc.setFont("helvetica", "normal");
                doc.setFontSize(8);
                doc.text(`CONTÊINER: ${selectedContainer.toUpperCase()} | DATA: ${selectedDate} | OPERADOR: ${operatorName}`, 16, 25);
                
                // Page indicator top right
                doc.setFont("helvetica", "bold");
                doc.text(`PÁGINA ${currentPage} DE ${totalPages}`, 194, 20, { align: 'right' });
                
                // Line below header
                doc.setDrawColor(primaryColor);
                doc.setLineWidth(0.4);
                doc.line(15, 28, 195, 28);
                
                // Table headers
                doc.setTextColor(100, 116, 139);
                doc.setFont("helvetica", "bold");
                doc.setFontSize(7.5);
                doc.text("#", 16, 34);
                doc.text("DESCRIÇÃO DO PRODUTO", 26, 34);
                doc.text("QTD", 142, 34);
                
                doc.setDrawColor(primaryColor);
                doc.setLineWidth(0.3);
                doc.line(15, 36, 195, 36);
                
                const pageProducts = remainingProducts.slice(rIdx, rIdx + itemsPerPage);
                pageProducts.forEach((prod, pIdx) => {
                  const globalIndex = listLimit + rIdx + pIdx;
                  const itemY = 42 + (pIdx * 6.8);
                  
                  doc.setDrawColor(241, 245, 250);
                  doc.setLineWidth(0.2);
                  doc.line(15, itemY + 1.8, 195, itemY + 1.8);
                  
                  doc.setFont("helvetica", "bold");
                  doc.setTextColor(textColor);
                  doc.text(String(globalIndex + 1), 16, itemY);
                  
                  let labelText = prod.nome || "N/A";
                  if (labelText.length > 56) {
                    labelText = labelText.substring(0, 53) + "...";
                  }
                  doc.text(labelText, 26, itemY);
                  
                  doc.setFont("helvetica", "normal");
                  doc.text((prod.qtd || "1") + " UN", 142, itemY);
                });
                
                // Footer
                doc.setDrawColor(primaryColor);
                doc.setLineWidth(0.4);
                doc.line(15, 266, 195, 266);
                
                doc.setFont("helvetica", "normal");
                doc.setFontSize(6.5);
                doc.setTextColor(148, 163, 184);
                doc.text(plateTemplate && plateTemplate.showFooterNotes ? plateTemplate.footerNotesText : "ESTA ETICA/PLACA É UM COMPROVANTE OFICIAL DE MOVIMENTAÇÃO DE CARGA E LOGÍSTICA DIGITAL.", 105, 273, { align: 'center' });
                
                doc.setFont("helvetica", "bold");
                doc.setTextColor(100, 116, 139);
                doc.text(`CHANCELADO POR: ${operatorName} • GESTÃO DE SISTEMAS INTELIGENTES`, 105, 278, { align: 'center' });
              }
            } else {
              const diff = allNfeProducts.length - listLimit;
              doc.setFont("helvetica", "bold");
              doc.setFontSize(8);
              doc.setTextColor(100, 116, 139);
              doc.text(`+ ${diff} outros produtos estão listados nas notas fiscais originais.`, 16, tableY + 7 + (listLimit * 7.2) + 2);
            }
          }
        } else {
          doc.setFont("helvetica", "italic");
          doc.setTextColor(148, 163, 184);
          doc.text("Nenhum produto encontrado nas notas.", 16, tableY + 7);
        }
      } else {
        const displayItems = items.slice(0, listLimit);
        displayItems.forEach((item, index) => {
          const itemY = tableY + 7 + (index * 7.2);
          
          doc.setDrawColor(241, 245, 250);
          doc.setLineWidth(0.2);
          doc.line(15, itemY + 1.8, 195, itemY + 1.8);

          doc.setFont("helvetica", "bold");
          doc.text(String(index + 1), 16, itemY);
          
          doc.setFont("helvetica", "bold");
          let labelText = item.t;
          if (labelText.length > 56) {
            labelText = labelText.substring(0, 53) + "...";
          }
          doc.text(labelText, 26, itemY);

          doc.setFont("helvetica", "normal");
          const scanTime = format(item.ts, 'dd/MM/yyyy HH:mm:ss');
          doc.text(scanTime, 142, itemY);
        });

        if (items.length > listLimit) {
          if (allowMultiPage) {
            const remainingItems = items.slice(listLimit);
            const itemsPerPage = 32;
            const totalPages = 1 + Math.ceil(remainingItems.length / itemsPerPage);
            
            for (let rIdx = 0; rIdx < remainingItems.length; rIdx += itemsPerPage) {
              doc.addPage();
              currentPage++;
              
              // Draw Watermarks on subsequent pages
              doc.setTextColor(243, 244, 246);
              doc.setFont("helvetica", "bold");
              doc.setFontSize(24);
              doc.text(operatorName, 105, 90, { align: 'center', angle: 25 });
              doc.text(operatorName, 105, 160, { align: 'center', angle: 25 });
              
              // Draw Border
              doc.setDrawColor(primaryColor);
              doc.setLineWidth(mainBorderWidth);
              doc.rect(10, 10, 190, 277);
              
              // Header
              doc.setTextColor(primaryColor);
              doc.setFont("helvetica", "bold");
              doc.setFontSize(10);
              doc.text("MANIFESTO DE COMPOSIÇÃO DE CARGA - CONTINUAÇÃO", 16, 20);
              
              doc.setTextColor(100, 116, 139);
              doc.setFont("helvetica", "normal");
              doc.setFontSize(8);
              doc.text(`CONTÊINER: ${selectedContainer.toUpperCase()} | DATA: ${selectedDate} | OPERADOR: ${operatorName}`, 16, 25);
              
              // Page indicator top right
              doc.setFont("helvetica", "bold");
              doc.text(`PÁGINA ${currentPage} DE ${totalPages}`, 194, 20, { align: 'right' });
              
              // Line below header
              doc.setDrawColor(primaryColor);
              doc.setLineWidth(0.4);
              doc.line(15, 28, 195, 28);
              
              // Table headers
              doc.setTextColor(100, 116, 139);
              doc.setFont("helvetica", "bold");
              doc.setFontSize(7.5);
              doc.text("#", 16, 34);
              doc.text("VALOR CADASTRADO DO QR CODE / ETIQUETA", 26, 34);
              doc.text("DATA E HORÁRIO DE ESCANEAMENTO", 142, 34);
              
              doc.setDrawColor(primaryColor);
              doc.setLineWidth(0.3);
              doc.line(15, 36, 195, 36);
              
              const pageItems = remainingItems.slice(rIdx, rIdx + itemsPerPage);
              pageItems.forEach((item, pIdx) => {
                const globalIndex = listLimit + rIdx + pIdx;
                const itemY = 42 + (pIdx * 6.8);
                
                doc.setDrawColor(241, 245, 250);
                doc.setLineWidth(0.2);
                doc.line(15, itemY + 1.8, 195, itemY + 1.8);
                
                doc.setFont("helvetica", "bold");
                doc.setTextColor(textColor);
                doc.text(String(globalIndex + 1), 16, itemY);
                
                let labelText = item.t;
                if (labelText.length > 56) {
                  labelText = labelText.substring(0, 53) + "...";
                }
                doc.text(labelText, 26, itemY);
                
                doc.setFont("helvetica", "normal");
                const scanTime = format(item.ts, 'dd/MM/yyyy HH:mm:ss');
                doc.text(scanTime, 142, itemY);
              });
              
              // Footer
              doc.setDrawColor(primaryColor);
              doc.setLineWidth(0.4);
              doc.line(15, 266, 195, 266);
              
              doc.setFont("helvetica", "normal");
              doc.setFontSize(6.5);
              doc.setTextColor(148, 163, 184);
              doc.text(plateTemplate && plateTemplate.showFooterNotes ? plateTemplate.footerNotesText : "ESTA ETICA/PLACA É UM COMPROVANTE OFICIAL DE MOVIMENTAÇÃO DE CARGA E LOGÍSTICA DIGITAL.", 105, 273, { align: 'center' });
              
              doc.setFont("helvetica", "bold");
              doc.setTextColor(100, 116, 139);
              doc.text(`CHANCELADO POR: ${operatorName} • GESTÃO DE SISTEMAS INTELIGENTES`, 105, 278, { align: 'center' });
            }
          } else {
            const diff = items.length - listLimit;
            doc.setFont("helvetica", "bold");
            doc.setFontSize(8);
            doc.setTextColor(100, 116, 139);
            doc.text(`+ ${diff} outros itens cadastrados estão presentes neste contêiner e salvos no sistema.`, 16, tableY + 84);
          }
        } else if (items.length === 0) {
          doc.setFont("helvetica", "italic");
          doc.setTextColor(148, 163, 184);
          doc.text("Nenhum item digitalizado registrado para este contêiner.", 16, tableY + 12);
        }
      }

      // Divider for footer
      doc.setDrawColor(primaryColor);
      doc.setLineWidth(0.4);
      doc.line(15, 266, 195, 266);

      // 7. FOOTER CHANCELLOR (Signature & legal text)
      doc.setFont("helvetica", "normal");
      doc.setFontSize(6.5);
      doc.setTextColor(148, 163, 184);
      doc.text(plateTemplate && plateTemplate.showFooterNotes ? plateTemplate.footerNotesText : "ESTA ETICA/PLACA É UM COMPROVANTE OFICIAL DE MOVIMENTAÇÃO DE CARGA E LOGÍSTICA DIGITAL.", 105, 273, { align: 'center' });
      
      doc.setFont("helvetica", "bold");
      doc.setTextColor(100, 116, 139);
      doc.text(`CHANCELADO POR: ${operatorName} • GESTÃO DE SISTEMAS INTELIGENTES`, 105, 278, { align: 'center' });

      // Build & Print
      const blob = doc.output('blob');
      const url = URL.createObjectURL(blob);
      const printWindow = window.open(url, '_blank');
      if (printWindow) {
        printWindow.addEventListener('load', () => {
          printWindow.print();
        });
      } else {
        doc.save(`PLACA-${selectedContainer}.pdf`);
      }
      
      addNotification('success', 'Impressão Iniciada', 'Layout otimizado para economia de tinta gerado com sucesso!');
    } catch (e) {
      console.error(e);
      addNotification('error', 'Erro', 'Falha ao gerar o arquivo de placa.');
    }
  };

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

  const handleDownloadPDF = async () => {
    if (items.length === 0 || !isFinalized) return;
    
    setPdfProgress({ current: 0, total: items.length, isOpen: true });
    
    // Load custom item template configuration from Estúdio de Layout
    let itemTemplate: any = null;
    try {
      const saved = localStorage.getItem('jfab_custom_template_item') || localStorage.getItem('jfab_custom_template');
      if (saved) {
        itemTemplate = JSON.parse(saved);
      }
    } catch (e) {
      console.error(e);
    }

    if (!itemTemplate) {
      itemTemplate = {
        name: "Industrial Padrão",
        title: "CONTROLE DE ATIVOS",
        subtitle: "LOGÍSTICA & ESTOQUE",
        showCategory: true,
        showContainer: true,
        showTimestamp: true,
        showFooterNotes: true,
        footerNotesText: "PROPRIEDADE REGISTRADA - NÃO ALTERAR",
        primaryColor: "#1e3a8a",
        borderColor: "#1e3a8a",
        borderWidth: 4,
        borderRadius: 16,
        useQrCode: true,
        qrScale: 1.1,
        barcodeScale: 1.0,
        fontSizeTitle: 18,
        fontSizeDetails: 11,
        textColor: "#0f172a",
        aspectRatio: 'plate',
        padding: 24
      };
    }

    const isThermal = itemTemplate.aspectRatio === 'thermal';
    const isBadge = itemTemplate.aspectRatio === 'badge';
    const w = isThermal ? 100 : (isBadge ? 85 : 140);
    const h = isThermal ? 150 : (isBadge ? 54 : 90);
    const isLandscape = w > h;

    const doc = new jsPDF({
      orientation: isLandscape ? 'landscape' : 'portrait',
      unit: 'mm',
      format: [w, h]
    });
    
    for (let i = 0; i < items.length; i++) {
        setPdfProgress(prev => ({ ...prev, current: i + 1 }));
        const item = items[i];
        if (i > 0) doc.addPage([w, h], isLandscape ? 'landscape' : 'portrait');
        
        try {
            const dataUrl = await generateBarcodeDataURL(item.t);
            const primaryColorHex = itemTemplate.primaryColor;
            const borderW = itemTemplate.borderWidth / 2.5; 
            const p = itemTemplate.padding / 4; 

            // 1. Draw Background
            doc.setFillColor(255, 255, 255);
            doc.rect(0, 0, w, h, 'F');

            // 2. Draw Customizable Border
            if (borderW > 0) {
              doc.setDrawColor(primaryColorHex);
              doc.setLineWidth(borderW);
              const r = itemTemplate.borderRadius / 3;
              if (r > 0) {
                doc.roundedRect(borderW, borderW, w - 2 * borderW, h - 2 * borderW, r, r, 'D');
              } else {
                doc.rect(borderW, borderW, w - 2 * borderW, h - 2 * borderW, 'D');
              }
            }

            // 3. Draw Header text
            doc.setTextColor(itemTemplate.textColor);
            doc.setFont("helvetica", "bold");
            doc.setFontSize(itemTemplate.fontSizeTitle);
            doc.text(itemTemplate.title, w / 2, borderW + p + 6, { align: 'center' });

            // Subtitle
            doc.setFont("helvetica", "normal");
            doc.setFontSize(itemTemplate.fontSizeDetails + 1);
            doc.setTextColor(100, 116, 139); // slate-400
            doc.text(itemTemplate.subtitle, w / 2, borderW + p + 11, { align: 'center' });

            // 4. Render QR or Barcode
            const isQR = itemTemplate.useQrCode;
            if (isQR) {
              const qrSize = (isThermal ? 50 : (isBadge ? 22 : 36)) * itemTemplate.qrScale;
              const qrX = (w - qrSize) / 2;
              const qrY = isThermal ? 42 : (isBadge ? 18 : 28);
              doc.addImage(dataUrl, 'PNG', qrX, qrY, qrSize, qrSize);
            } else {
              const bW = (isThermal ? 70 : (isBadge ? 60 : 80)) * itemTemplate.barcodeScale;
              const bH = (isThermal ? 35 : (isBadge ? 12 : 20)) * itemTemplate.barcodeScale;
              const bX = (w - bW) / 2;
              const bY = isThermal ? 50 : (isBadge ? 20 : 32);
              doc.addImage(dataUrl, 'PNG', bX, bY, bW, bH);
            }

            // 5. Draw Bottom details
            let metaY = h - borderW - p - 4;
            doc.setFont("helvetica", "bold");
            doc.setFontSize(itemTemplate.fontSizeDetails);
            doc.setTextColor(itemTemplate.textColor);
            doc.text(`CÓDIGO: ${item.t}`, w / 2, metaY, { align: 'center' });

            if (itemTemplate.showContainer) {
              metaY -= 5;
              doc.setFont("helvetica", "normal");
              doc.setFontSize(itemTemplate.fontSizeDetails - 1);
              doc.setTextColor(71, 85, 105); // slate-600
              doc.text(`COLETA: ${selectedContainer}`, w / 2, metaY, { align: 'center' });
            }

            if (itemTemplate.showCategory) {
              metaY -= 4;
              doc.setFont("helvetica", "italic");
              doc.setFontSize(itemTemplate.fontSizeDetails - 2);
              doc.text(`Categoria: ${selectedCategory}`, w / 2, metaY, { align: 'center' });
            }

            if (itemTemplate.showTimestamp) {
              metaY -= 4;
              doc.setFont("helvetica", "normal");
              doc.setFontSize(itemTemplate.fontSizeDetails - 2);
              doc.text(`Data: ${format(new Date(item.ts), 'dd/MM/yyyy HH:mm')}`, w / 2, metaY, { align: 'center' });
            }

            if (itemTemplate.showFooterNotes) {
              doc.setFont("helvetica", "normal");
              doc.setFontSize(7);
              doc.setTextColor(148, 163, 184); // slate-300
              doc.text(itemTemplate.footerNotesText, w / 2, h - borderW - 2, { align: 'center' });
            }
            
        } catch (err) {
            console.error("PDF item error:", err);
            doc.setFontSize(10);
            doc.setTextColor(15, 23, 42);
            doc.text(`Erro ao gerar imagem para: ${item.t}`, 16, 30);
        }
        
        // Brief pause to allow UI update
        if (i % 5 === 0) {
            await new Promise(resolve => setTimeout(resolve, 50));
        }
    }
    
    doc.save(`relatorio-${selectedContainer}-${format(new Date(), 'yyyyMMdd')}.pdf`);
    
    if (pdfSettings.downloadJsonWithPdf) {
        try {
            const jsonStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(items, null, 2));
            const dlElem = document.createElement('a');
            dlElem.setAttribute("href", jsonStr);
            dlElem.setAttribute("download", `dados-${selectedContainer}-${format(new Date(), 'yyyyMMdd')}.json`);
            document.body.appendChild(dlElem);
            dlElem.click();
            dlElem.remove();
        } catch (err) {
            console.error("Failed to download JSON", err);
        }
    }

    setPdfProgress({ current: 0, total: 0, isOpen: false });
    addNotification('success', 'PDF Concluído', 'O arquivo foi baixado com sucesso.');
  };

  const handleDownloadDanfePDF = async (targetItems?: QRItem[]) => {
    const nfeItems = targetItems || items.filter(i => i.nfeData);
    if (nfeItems.length === 0) {
      addNotification('error', 'Sem Dados de NF-e', 'Nenhuma Nota Fiscal Eletrônica com dados recuperados foi encontrada para gerar o DANFE.');
      return;
    }

    addNotification('info', 'Gerando DANFE(s)', `Preparando layout de Nota Fiscal para ${nfeItems.length} documento(s)...`);

    // Load custom template danfe
    let dTemplate = {
      name: "Layout Padrão DANFE",
      themeColor: "#10b981", // Emerald default
      showReceipt: true,
      showWatermark: true,
      watermarkText: "JOSÉ FELIPE A. BARROSO",
      showAdditionalNotes: true,
      customLogoText: "EMITENTE AUTOMÁTICO S.A.",
      showSysAuthentication: true,
      customStampText: "STATUS: APROVADA & CONSOLIDADA",
      rowSpacing: 6,
      fontSizeHeader: 10,
      fontSizeItems: 6,
      margins: 8,
      allowMultiPage: true
    };
    try {
      const saved = localStorage.getItem('jfab_custom_template_danfe');
      if (saved) {
        const parsed = JSON.parse(saved);
        dTemplate = { ...dTemplate, ...parsed };
      }
    } catch (e) {
      console.error("Failed to load custom template danfe", e);
    }

    const hexToRgb = (hex: string) => {
      const cleanHex = hex.replace('#', '');
      const r = parseInt(cleanHex.slice(0, 2), 16) || 0;
      const g = parseInt(cleanHex.slice(2, 4), 16) || 0;
      const b = parseInt(cleanHex.slice(4, 6), 16) || 0;
      return { r, g, b };
    };
    const themeRgb = hexToRgb(dTemplate.themeColor);

    const m = dTemplate.margins;
    const delta = m - 8;

    try {
      const doc = new jsPDF('p', 'mm', 'a4');
      
      const parseNfeKey = (key: string) => {
        if (key && key.length === 44) {
          const series = parseInt(key.substring(22, 25), 10) || 1;
          const number = parseInt(key.substring(25, 34), 10) || 123456;
          const cnpj = key.substring(6, 20).replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/, "$1.$2.$3/$4-$5");
          return { series, number, cnpj };
        }
        return { series: 1, number: 123456, cnpj: "12.345.678/0001-90" };
      };

      for (let i = 0; i < nfeItems.length; i++) {
        if (i > 0) {
          doc.addPage();
        }
        
        const item = nfeItems[i];
        const nfe = item.nfeData || {};
        const key = item.t;
        const { series, number, cnpj: emitCnpj } = parseNfeKey(key);
        
        const formattedKey = key.replace(/(.{4})/g, '$1 ').trim();
        
        const emitName = nfe.emitente?.nome || nfe.emitente?.xNome || nfe.infNFe?.emit?.xNome || "EMITENTE AUTOMÁTICO S.A.";
        const emitCnpjReal = nfe.emitente?.cnpj || nfe.emitente?.CNPJ || emitCnpj;
        const emitIeReal = nfe.emitente?.ie || nfe.emitente?.IE || "148.992.120.110";
        
        let emitAddress = "LOGÍSTICA E DISTRIBUIÇÃO CORPORATIVA";
        let emitCityState = "SÃO PAULO - SP • BRASIL";
        if (nfe.emitente?.logradouro) {
          const lgr = nfe.emitente.logradouro;
          const nro = nfe.emitente.numero || "S/N";
          const bairro = nfe.emitente.bairro || "";
          emitAddress = `${lgr}, ${nro}${bairro ? ` - ${bairro}` : ""}`;
          
          const mun = nfe.emitente.municipio || "SÃO PAULO";
          const uf = nfe.emitente.uf || "SP";
          const cep = nfe.emitente.cep ? `CEP: ${nfe.emitente.cep}` : "";
          emitCityState = `${mun} - ${uf}${cep ? ` • ${cep}` : ""}`;
        }

        const hasRealEmit = !!(nfe.emitente?.nome || nfe.emitente?.xNome || nfe.infNFe?.emit?.xNome);
        const finalEmitName = (hasRealEmit && emitName !== "EMITENTE AUTOMÁTICO S.A.") 
          ? emitName 
          : (dTemplate.customLogoText && dTemplate.customLogoText !== "EMITENTE AUTOMÁTICO S.A." ? dTemplate.customLogoText : emitName);

        const destName = nfe.destinatario?.nome || nfe.destinatario?.xNome || nfe.infNFe?.dest?.xNome || "DESTINATÁRIO CONSIGNADO LTDA";
        const destCnpjReal = nfe.destinatario?.cnpj || nfe.destinatario?.CNPJ || "98.765.432/0001-10";
        const transpName = nfe.transportadora?.nome || nfe.infNFe?.transp?.transporta?.xNome || "FÊNIX LOGÍSTICA & TRANSPORTES";
        const vols = nfe.volumes || "1";
        const pesoB = nfe.pesoB || "";
        const formattedWeight = pesoB 
          ? `${parseFloat(pesoB).toFixed(3)}` 
          : ``;
        
        const prods = nfe.produtos || [];

        // Calculate prices
        let totalProdValue = 0;
        const detailedProds = prods.map((p: any, idx: number) => {
          const qty = parseFloat(p.qtd) || 1;
          const code = p.code || String(1001 + idx);
          const name = p.nome || "PRODUTO DE CONSUMO INDUSTRIAL";
          const unit = p.unit || "UN";
          
          let unitPrice = parseFloat(p.unitPrice);
          let totalVal = parseFloat(p.totalVal);
          
          if (isNaN(unitPrice) || !unitPrice) {
            const nameLen = name.length;
            unitPrice = 25.00 + (nameLen % 7) * 23.50 + (idx % 3) * 11.20;
          }
          if (isNaN(totalVal) || !totalVal) {
            totalVal = unitPrice * qty;
          }
          
          totalProdValue += totalVal;
          return {
            code,
            name,
            qty,
            unit,
            unitPrice,
            totalVal
          };
        });

        const realTotalNF = nfe.total?.vNF ? parseFloat(nfe.total.vNF) : null;
        const formattedTotalProd = realTotalNF 
          ? realTotalNF.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
          : totalProdValue.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

        let infCplText = nfe.infCpl || "";
        const infCplLines: string[] = [];
        if (infCplText) {
          const cleanedText = infCplText.replace(/[\r\n]+/g, " ");
          for (let idx = 0; idx < cleanedText.length; idx += 90) {
            infCplLines.push(cleanedText.substring(idx, idx + 90));
          }
        }

        const showBottomSection = dTemplate.showAdditionalNotes || dTemplate.showSysAuthentication;
        const bottomSectionHeight = showBottomSection ? 42 : 0;
        
        // Calculate pagination parameters
        const rowSpacingVal = dTemplate.rowSpacing;
        const receiptHeight = dTemplate.showReceipt ? 20 : 0;
        const headerHeight = 40; // 32 main box + 6 ie/cnpj row + 2 spacing
        const destHeight = 24; // 4 title bar + 18 box + 2 spacing
        const faturaHeight = 10; // 4 title bar + 4 box + 2 spacing
        const impostoHeight = 18; // 4 title bar + 12 box + 2 spacing
        const transpHeight = 24; // 4 title bar + 18 box + 2 spacing
        const tableTitleAndHeaderHeight = 10; // 4 bar + 6 header
        const p1StartY = m + receiptHeight + headerHeight + destHeight + faturaHeight + impostoHeight + transpHeight + tableTitleAndHeaderHeight;
        const p1MaxRowY = 297 - m - 2; // Maximum row Y on page 1 (without bottom section)
        const p1MaxRowYIfLast = 297 - m - bottomSectionHeight - 2; // Maximum row Y on page 1 if it is the only/last page
        
        const p1MaxRowsIfLast = Math.floor((p1MaxRowYIfLast - p1StartY) / rowSpacingVal);
        const p1MaxRowsIfMulti = Math.floor((p1MaxRowY - p1StartY) / rowSpacingVal);
        
        let totalPages = 1;
        let p1RowsToDraw = p1MaxRowsIfLast;
        let isMultiPage = false;
        
        if (detailedProds.length > p1MaxRowsIfLast && (dTemplate.allowMultiPage !== false)) {
          isMultiPage = true;
          p1RowsToDraw = p1MaxRowsIfMulti;
          
          let remainingCount = detailedProds.length - p1MaxRowsIfMulti;
          const subPageStartY = m + 22; // simplified products start Y on subsequent pages
          const subPageMaxRowY = 297 - m - 2; // without bottom section
          const subPageMaxRowYIfLast = 297 - m - bottomSectionHeight - 2; // with bottom section
          
          const subPageMaxRowsIfLast = Math.floor((subPageMaxRowYIfLast - (subPageStartY + 10)) / rowSpacingVal);
          const subPageMaxRowsIfMulti = Math.floor((subPageMaxRowY - (subPageStartY + 10)) / rowSpacingVal);
          
          while (remainingCount > 0) {
            totalPages++;
            if (remainingCount <= subPageMaxRowsIfLast) {
              break;
            } else {
              remainingCount -= subPageMaxRowsIfMulti;
            }
          }
        }
        
        // Watermark if enabled (drawn first so background)
        if (dTemplate.showWatermark) {
          doc.setTextColor(242, 242, 242);
          doc.setFont("helvetica", "bold");
          doc.setFontSize(14);
          doc.text(dTemplate.watermarkText || "JOSÉ FELIPE A. BARROSO", 50, 100, { angle: 335 });
          doc.text(dTemplate.watermarkText || "JOSÉ FELIPE A. BARROSO", 50, 180, { angle: 335 });
        }

        // Draw general border / frame using custom theme color
        doc.setDrawColor(themeRgb.r, themeRgb.g, themeRgb.b);
        doc.setLineWidth(0.3);
        doc.rect(m, m, 210 - 2 * m, 297 - 2 * m);

        let currentY = m;

        // Canhoto (Receipt)
        if (dTemplate.showReceipt) {
          doc.rect(m, currentY, 210 - 2 * m, 18);
          // Vertical divider
          doc.line(160 + delta, currentY, 160 + delta, currentY + 18);
          doc.setFont("helvetica", "bold");
          doc.setFontSize(5);
          doc.setTextColor(80, 80, 80);
          doc.text("RECEBEMOS DE " + String(finalEmitName).toUpperCase().substring(0, 50) + " OS PRODUTOS / SERVIÇOS CONSTANTES DA NOTA FISCAL INDICADA AO LADO", m + 2, currentY + 3.5);
          
          // Row inside left column for date/signature
          doc.line(m, currentY + 9, 160 + delta, currentY + 9);
          // Vertical divider for date and signature
          doc.line(40 + delta, currentY + 9, 40 + delta, currentY + 18);
          
          doc.text("DATA DE RECEBIMENTO", m + 2, currentY + 12);
          doc.setFont("helvetica", "bold");
          doc.setFontSize(6.5);
          doc.setTextColor(0);
          doc.text(format(new Date(item.ts), 'dd/MM/yyyy'), m + 2, currentY + 16.5);
          
          doc.setFont("helvetica", "bold");
          doc.setFontSize(5);
          doc.setTextColor(80, 80, 80);
          doc.text("IDENTIFICAÇÃO E ASSINATURA DO RECEBEDOR", 42 + delta, currentY + 12);
          
          doc.setFontSize(10);
          doc.setTextColor(0);
          doc.text("NF-e", 181 + delta, currentY + 5, { align: 'center' });
          doc.setFontSize(7.5);
          doc.text(`Nº ${String(number).padStart(9, '0')}`, 181 + delta, currentY + 10, { align: 'center' });
          doc.text(`SÉRIE ${series}`, 181 + delta, currentY + 15, { align: 'center' });

          currentY += 18 + 2;
        }

        // --- PORTAL FISCAL OFFICIAL HEADER BLOCK ---
        // Unified Header box of height 32
        doc.rect(m, currentY, 210 - 2 * m, 32);
        
        // Vertical dividers:
        // Divider 1: Emitente section ends at W * 0.40
        const div1X = m + (210 - 2 * m) * 0.40;
        doc.line(div1X, currentY, div1X, currentY + 32);
        
        // Divider 2: DANFE section ends at W * 0.58
        const div2X = m + (210 - 2 * m) * 0.58;
        doc.line(div2X, currentY, div2X, currentY + 32);

        // 1. Emitente Details (Left Column)
        doc.setFont("helvetica", "bold");
        doc.setFontSize(dTemplate.fontSizeHeader);
        doc.setTextColor(0);
        doc.text(String(finalEmitName).toUpperCase().substring(0, 36), m + 3, currentY + 6);
        doc.setFont("helvetica", "normal");
        doc.setFontSize(6.5);
        doc.setTextColor(60, 60, 60);
        doc.text(emitAddress.toUpperCase().substring(0, 52), m + 3, currentY + 11.5);
        doc.text(emitCityState.toUpperCase(), m + 3, currentY + 16);
        doc.text(`FONE: (85) 3400-0000  |  EMAIL: CONTATO@${finalEmitName.toLowerCase().replace(/[^a-z0-9]/g, '') || "emitente"}.COM.BR`, m + 3, currentY + 20.5);
        
        doc.setFont("helvetica", "bold");
        doc.setFontSize(7);
        doc.setTextColor(0);
        doc.text("IDENTIFICAÇÃO DO EMITENTE", m + 3, currentY + 29);

        // 2. DANFE & Folha Block (Middle Column)
        doc.setFont("helvetica", "bold");
        doc.setFontSize(10);
        doc.text("DANFE", (div1X + div2X) / 2, currentY + 6.5, { align: 'center' });
        doc.setFontSize(5);
        doc.setFont("helvetica", "normal");
        doc.text("DOCUMENTO AUXILIAR DA\nNOTA FISCAL ELETRÔNICA", (div1X + div2X) / 2, currentY + 10.5, { align: 'center' });
        
        // Entrada / Saída indicators:
        doc.setFont("helvetica", "normal");
        doc.setFontSize(4.5);
        doc.text("0 - ENTRADA\n1 - SAÍDA", (div1X + div2X) / 2 - 8, currentY + 18);
        
        // Draw tiny indicator box
        doc.rect((div1X + div2X) / 2 + 5, currentY + 15, 4, 4);
        doc.setFont("helvetica", "bold");
        doc.setFontSize(5.5);
        doc.text("1", (div1X + div2X) / 2 + 7, currentY + 18, { align: 'center' });
        
        doc.setFont("helvetica", "bold");
        doc.setFontSize(7.5);
        doc.text(`Nº ${String(number).padStart(9, '0')}`, (div1X + div2X) / 2, currentY + 23.5, { align: 'center' });
        doc.text(`SÉRIE ${series}`, (div1X + div2X) / 2, currentY + 27, { align: 'center' });
        doc.setFontSize(6);
        doc.text(`FOLHA 01/${String(totalPages).padStart(2, '0')}`, (div1X + div2X) / 2, currentY + 30.5, { align: 'center' });

        // 3. Barcode & Chave de Acesso (Right Column)
        try {
          const dataUrl = await generateBarcodeDataURL(key);
          doc.addImage(dataUrl, 'PNG', div2X + 3, currentY + 2.5, (210 - m - div2X) - 6, 9.5);
        } catch (err) {
          console.error("Error generating DANFE barcode", err);
        }
        
        doc.setFont("helvetica", "bold");
        doc.setFontSize(5);
        doc.setTextColor(80, 80, 80);
        doc.text("CHAVE DE ACESSO", div2X + 3, currentY + 14.5);
        doc.setFont("helvetica", "bold");
        doc.setFontSize(6.5);
        doc.setTextColor(0);
        doc.text(formattedKey, div2X + 3, currentY + 18);
        
        doc.setFont("helvetica", "normal");
        doc.setFontSize(4.5);
        doc.setTextColor(80, 80, 80);
        doc.text("Consulta de autenticidade no portal nacional da NF-e", div2X + 3, currentY + 21);
        doc.text("www.nfe.fazenda.gov.br/portal ou no site da Sefaz Autorizadora", div2X + 3, currentY + 23.5);
        
        // Protocolo de Autorização Divider inside Right Column:
        doc.line(div2X, currentY + 25, 210 - m, currentY + 25);
        doc.setFont("helvetica", "bold");
        doc.setFontSize(5);
        doc.text("PROTOCOLO DE AUTORIZAÇÃO DE USO", div2X + 3, currentY + 27.5);
        doc.setFont("helvetica", "bold");
        doc.setFontSize(6.5);
        doc.setTextColor(0);
        const protocolNumber = "135" + String(series).padStart(2, '0') + String(number).padStart(9, '0');
        const protocolDate = format(new Date(item.ts), 'dd/MM/yyyy HH:mm:ss');
        doc.text(`${protocolNumber} - ${protocolDate}`, div2X + 3, currentY + 30.5);

        // --- INSCRICÕES ROW ---
        doc.rect(m, currentY + 32, 210 - 2 * m, 6);
        const ieDiv1 = m + (210 - 2 * m) * 0.35;
        const ieDiv2 = m + (210 - 2 * m) * 0.65;
        doc.line(ieDiv1, currentY + 32, ieDiv1, currentY + 38);
        doc.line(ieDiv2, currentY + 32, ieDiv2, currentY + 38);
        
        doc.setFont("helvetica", "normal");
        doc.setFontSize(4.5);
        doc.setTextColor(80, 80, 80);
        doc.text("INSCRIÇÃO ESTADUAL", m + 2, currentY + 34);
        doc.setFont("helvetica", "bold");
        doc.setFontSize(6.5);
        doc.setTextColor(0);
        doc.text(emitIeReal, m + 2, currentY + 37);
        
        doc.setFont("helvetica", "normal");
        doc.setFontSize(4.5);
        doc.setTextColor(80, 80, 80);
        doc.text("INSCRIÇÃO ESTADUAL DO SUBST. TRIBUTÁRIO", ieDiv1 + 2, currentY + 34);
        doc.setFont("helvetica", "bold");
        doc.setFontSize(6.5);
        doc.setTextColor(0);
        doc.text("-", ieDiv1 + 2, currentY + 37);
        
        doc.setFont("helvetica", "normal");
        doc.setFontSize(4.5);
        doc.setTextColor(80, 80, 80);
        doc.text("CNPJ", ieDiv2 + 2, currentY + 34);
        doc.setFont("helvetica", "bold");
        doc.setFontSize(6.5);
        doc.setTextColor(0);
        doc.text(emitCnpjReal, ieDiv2 + 2, currentY + 37);

        currentY += 38 + 2;

        // --- DESTINATÁRIO / REMETENTE BLOCK ---
        doc.setFillColor(240, 240, 240);
        doc.rect(m, currentY, 210 - 2 * m, 4, 'FD');
        doc.setFont("helvetica", "bold");
        doc.setFontSize(6.5);
        doc.setTextColor(0);
        doc.text("DESTINATÁRIO / REMETENTE", m + 2, currentY + 3);

        doc.rect(m, currentY + 4, 210 - 2 * m, 18);
        // Horizontal lines:
        doc.line(m, currentY + 10, 210 - m, currentY + 10);
        doc.line(m, currentY + 16, 210 - m, currentY + 16);
        
        // Vertical dividers:
        const destW = 210 - 2 * m;
        const r1Div1 = m + destW * 0.62;
        const r1Div2 = m + destW * 0.82;
        doc.line(r1Div1, currentY + 4, r1Div1, currentY + 10);
        doc.line(r1Div2, currentY + 4, r1Div2, currentY + 10);

        const r2Div1 = m + destW * 0.48;
        const r2Div2 = m + destW * 0.68;
        const r2Div3 = m + destW * 0.82;
        doc.line(r2Div1, currentY + 10, r2Div1, currentY + 16);
        doc.line(r2Div2, currentY + 10, r2Div2, currentY + 16);
        doc.line(r2Div3, currentY + 10, r2Div3, currentY + 16);

        const r3Div1 = m + destW * 0.42;
        const r3Div2 = m + destW * 0.54;
        const r3Div3 = m + destW * 0.58;
        const r3Div4 = m + destW * 0.78;
        const r3Div5 = m + destW * 0.88;
        doc.line(r3Div1, currentY + 16, r3Div1, currentY + 22);
        doc.line(r3Div2, currentY + 16, r3Div2, currentY + 22);
        doc.line(r3Div3, currentY + 16, r3Div3, currentY + 22);
        doc.line(r3Div4, currentY + 16, r3Div4, currentY + 22);
        doc.line(r3Div5, currentY + 16, r3Div5, currentY + 22);

        // Row 1 Populate:
        doc.setFont("helvetica", "normal");
        doc.setFontSize(4.5);
        doc.setTextColor(80, 80, 80);
        doc.text("NOME / RAZÃO SOCIAL", m + 2, currentY + 6);
        doc.setFont("helvetica", "bold");
        doc.setFontSize(6.5);
        doc.setTextColor(0);
        doc.text(String(destName).toUpperCase().substring(0, 60), m + 2, currentY + 9);

        doc.setFont("helvetica", "normal");
        doc.setFontSize(4.5);
        doc.setTextColor(80, 80, 80);
        doc.text("CNPJ / CPF", r1Div1 + 2, currentY + 6);
        doc.setFont("helvetica", "bold");
        doc.setFontSize(6.5);
        doc.setTextColor(0);
        doc.text(destCnpjReal, r1Div1 + 2, currentY + 9);

        doc.setFont("helvetica", "normal");
        doc.setFontSize(4.5);
        doc.setTextColor(80, 80, 80);
        doc.text("DATA DA EMISSÃO", r1Div2 + 2, currentY + 6);
        doc.setFont("helvetica", "bold");
        doc.setFontSize(6.5);
        doc.setTextColor(0);
        doc.text(format(new Date(item.ts), 'dd/MM/yyyy'), r1Div2 + 2, currentY + 9);

        // Row 2 Populate:
        const r2Address = nfe.destinatario?.logradouro 
          ? `${nfe.destinatario.logradouro}, ${nfe.destinatario.numero || "S/N"}` 
          : "ENDEREÇO CONSIGNADO BRASIL LTDA";
        const r2Bairro = nfe.destinatario?.bairro || "CENTRO INDUSTRIAL";
        const r2Cep = nfe.destinatario?.cep || "60000-000";

        doc.setFont("helvetica", "normal");
        doc.setFontSize(4.5);
        doc.setTextColor(80, 80, 80);
        doc.text("ENDEREÇO", m + 2, currentY + 12);
        doc.setFont("helvetica", "bold");
        doc.setFontSize(6.5);
        doc.setTextColor(0);
        doc.text(String(r2Address).toUpperCase().substring(0, 50), m + 2, currentY + 15);

        doc.setFont("helvetica", "normal");
        doc.setFontSize(4.5);
        doc.setTextColor(80, 80, 80);
        doc.text("BAIRRO / DISTRITO", r2Div1 + 2, currentY + 12);
        doc.setFont("helvetica", "bold");
        doc.setFontSize(6.5);
        doc.setTextColor(0);
        doc.text(String(r2Bairro).toUpperCase().substring(0, 24), r2Div1 + 2, currentY + 15);

        doc.setFont("helvetica", "normal");
        doc.setFontSize(4.5);
        doc.setTextColor(80, 80, 80);
        doc.text("CEP", r2Div2 + 2, currentY + 12);
        doc.setFont("helvetica", "bold");
        doc.setFontSize(6.5);
        doc.setTextColor(0);
        doc.text(r2Cep, r2Div2 + 2, currentY + 15);

        doc.setFont("helvetica", "normal");
        doc.setFontSize(4.5);
        doc.setTextColor(80, 80, 80);
        doc.text("DATA SAÍDA / ENTRADA", r2Div3 + 2, currentY + 12);
        doc.setFont("helvetica", "bold");
        doc.setFontSize(6.5);
        doc.setTextColor(0);
        doc.text(format(new Date(item.ts), 'dd/MM/yyyy'), r2Div3 + 2, currentY + 15);

        // Row 3 Populate:
        const r3Mun = nfe.destinatario?.municipio || "FORTALEZA";
        const r3Fone = nfe.destinatario?.fone || nfe.destinatario?.telefone || "(85) 3211-1000";
        const r3Uf = nfe.destinatario?.uf || "CE";
        const r3Ie = nfe.destinatario?.ie || "ISENTO";

        doc.setFont("helvetica", "normal");
        doc.setFontSize(4.5);
        doc.setTextColor(80, 80, 80);
        doc.text("MUNICÍPIO", m + 2, currentY + 18);
        doc.setFont("helvetica", "bold");
        doc.setFontSize(6.5);
        doc.setTextColor(0);
        doc.text(String(r3Mun).toUpperCase().substring(0, 40), m + 2, currentY + 21);

        doc.setFont("helvetica", "normal");
        doc.setFontSize(4.5);
        doc.setTextColor(80, 80, 80);
        doc.text("FONE / FAX", r3Div1 + 2, currentY + 18);
        doc.setFont("helvetica", "bold");
        doc.setFontSize(6.5);
        doc.setTextColor(0);
        doc.text(r3Fone, r3Div1 + 2, currentY + 21);

        doc.setFont("helvetica", "normal");
        doc.setFontSize(4.5);
        doc.setTextColor(80, 80, 80);
        doc.text("UF", r3Div2 + 2, currentY + 18);
        doc.setFont("helvetica", "bold");
        doc.setFontSize(6.5);
        doc.setTextColor(0);
        doc.text(r3Uf, r3Div2 + 2, currentY + 21);

        doc.setFont("helvetica", "normal");
        doc.setFontSize(4.5);
        doc.setTextColor(80, 80, 80);
        doc.text("INSCRIÇÃO ESTADUAL", r3Div3 + 2, currentY + 18);
        doc.setFont("helvetica", "bold");
        doc.setFontSize(6.5);
        doc.setTextColor(0);
        doc.text(r3Ie, r3Div3 + 2, currentY + 21);

        doc.setFont("helvetica", "normal");
        doc.setFontSize(4.5);
        doc.setTextColor(80, 80, 80);
        doc.text("HORA DA SAÍDA", r3Div4 + 2, currentY + 18);
        doc.setFont("helvetica", "bold");
        doc.setFontSize(6.5);
        doc.setTextColor(0);
        doc.text(format(new Date(item.ts), 'HH:mm:ss'), r3Div4 + 2, currentY + 21);

        currentY += 22 + 2;

        // --- FATURA / DUPLICATAS BLOCK ---
        doc.setFillColor(240, 240, 240);
        doc.rect(m, currentY, 210 - 2 * m, 4, 'FD');
        doc.setFont("helvetica", "bold");
        doc.setFontSize(6.5);
        doc.setTextColor(0);
        doc.text("FATURA / DUPLICATAS", m + 2, currentY + 3);

        doc.rect(m, currentY + 4, 210 - 2 * m, 4);
        doc.setFont("helvetica", "normal");
        doc.setFontSize(4.5);
        doc.setTextColor(80, 80, 80);
        doc.text("DÉBITO DIRETO AUTORIZADO", m + 2, currentY + 7);
        doc.setFont("helvetica", "bold");
        doc.setFontSize(6.5);
        doc.setTextColor(0);
        doc.text(`DUPLICATA Nº 001  |  VENCIMENTO: ${format(new Date(item.ts), 'dd/MM/yyyy')}  |  VALOR LÍQUIDO: ${formattedTotalProd}`, m + 35, currentY + 7);

        currentY += 8 + 2;

        // --- CÁLCULO DO IMPOSTO BLOCK ---
        doc.setFillColor(240, 240, 240);
        doc.rect(m, currentY, 210 - 2 * m, 4, 'FD');
        doc.setFont("helvetica", "bold");
        doc.setFontSize(6.5);
        doc.setTextColor(0);
        doc.text("CÁLCULO DO IMPOSTO", m + 2, currentY + 3);

        doc.rect(m, currentY + 4, 210 - 2 * m, 12);
        // Horizontal line:
        doc.line(m, currentY + 10, 210 - m, currentY + 10);
        
        // Row 1 Dividers:
        const impW = 210 - 2 * m;
        const impDiv1 = m + impW * 0.18;
        const impDiv2 = m + impW * 0.36;
        const impDiv3 = m + impW * 0.54;
        const impDiv4 = m + impW * 0.72;
        doc.line(impDiv1, currentY + 4, impDiv1, currentY + 10);
        doc.line(impDiv2, currentY + 4, impDiv2, currentY + 10);
        doc.line(impDiv3, currentY + 4, impDiv3, currentY + 10);
        doc.line(impDiv4, currentY + 4, impDiv4, currentY + 10);

        // Row 2 Dividers:
        const impDiv5 = m + impW * 0.15;
        const impDiv6 = m + impW * 0.30;
        const impDiv7 = m + impW * 0.45;
        const impDiv8 = m + impW * 0.60;
        const impDiv9 = m + impW * 0.75;
        doc.line(impDiv5, currentY + 10, impDiv5, currentY + 16);
        doc.line(impDiv6, currentY + 10, impDiv6, currentY + 16);
        doc.line(impDiv7, currentY + 10, impDiv7, currentY + 16);
        doc.line(impDiv8, currentY + 10, impDiv8, currentY + 16);
        doc.line(impDiv9, currentY + 10, impDiv9, currentY + 16);

        // Row 1 Populate:
        doc.setFont("helvetica", "normal");
        doc.setFontSize(4.5);
        doc.setTextColor(80, 80, 80);
        doc.text("BASE DE CÁLCULO DO ICMS", m + 2, currentY + 6);
        doc.setFont("helvetica", "bold");
        doc.setFontSize(6.5);
        doc.setTextColor(0);
        doc.text("R$ 0,00", m + 2, currentY + 9);

        doc.setFont("helvetica", "normal");
        doc.setFontSize(4.5);
        doc.setTextColor(80, 80, 80);
        doc.text("VALOR DO ICMS", impDiv1 + 2, currentY + 6);
        doc.setFont("helvetica", "bold");
        doc.setFontSize(6.5);
        doc.setTextColor(0);
        doc.text("R$ 0,00", impDiv1 + 2, currentY + 9);

        doc.setFont("helvetica", "normal");
        doc.setFontSize(4.5);
        doc.setTextColor(80, 80, 80);
        doc.text("BASE DE CÁLCULO DO ICMS S.T.", impDiv2 + 2, currentY + 6);
        doc.setFont("helvetica", "bold");
        doc.setFontSize(6.5);
        doc.setTextColor(0);
        doc.text("R$ 0,00", impDiv2 + 2, currentY + 9);

        doc.setFont("helvetica", "normal");
        doc.setFontSize(4.5);
        doc.setTextColor(80, 80, 80);
        doc.text("VALOR DO ICMS SUBSTITUIÇÃO", impDiv3 + 2, currentY + 6);
        doc.setFont("helvetica", "bold");
        doc.setFontSize(6.5);
        doc.setTextColor(0);
        doc.text("R$ 0,00", impDiv3 + 2, currentY + 9);

        doc.setFont("helvetica", "normal");
        doc.setFontSize(4.5);
        doc.setTextColor(80, 80, 80);
        doc.text("VALOR TOTAL DOS PRODUTOS", impDiv4 + 2, currentY + 6);
        doc.setFont("helvetica", "bold");
        doc.setFontSize(6.5);
        doc.setTextColor(0);
        doc.text(formattedTotalProd, impDiv4 + 2, currentY + 9);

        // Row 2 Populate:
        doc.setFont("helvetica", "normal");
        doc.setFontSize(4.5);
        doc.setTextColor(80, 80, 80);
        doc.text("VALOR DO FRETE", m + 2, currentY + 12);
        doc.setFont("helvetica", "bold");
        doc.setFontSize(6.5);
        doc.setTextColor(0);
        doc.text("R$ 0,00", m + 2, currentY + 15);

        doc.setFont("helvetica", "normal");
        doc.setFontSize(4.5);
        doc.setTextColor(80, 80, 80);
        doc.text("VALOR DO SEGURO", impDiv5 + 2, currentY + 12);
        doc.setFont("helvetica", "bold");
        doc.setFontSize(6.5);
        doc.setTextColor(0);
        doc.text("R$ 0,00", impDiv5 + 2, currentY + 15);

        doc.setFont("helvetica", "normal");
        doc.setFontSize(4.5);
        doc.setTextColor(80, 80, 80);
        doc.text("DESCONTO", impDiv6 + 2, currentY + 12);
        doc.setFont("helvetica", "bold");
        doc.setFontSize(6.5);
        doc.setTextColor(0);
        doc.text("R$ 0,00", impDiv6 + 2, currentY + 15);

        doc.setFont("helvetica", "normal");
        doc.setFontSize(4.5);
        doc.setTextColor(80, 80, 80);
        doc.text("OUTRAS DESPESAS", impDiv7 + 2, currentY + 12);
        doc.setFont("helvetica", "bold");
        doc.setFontSize(6.5);
        doc.setTextColor(0);
        doc.text("R$ 0,00", impDiv7 + 2, currentY + 15);

        doc.setFont("helvetica", "normal");
        doc.setFontSize(4.5);
        doc.setTextColor(80, 80, 80);
        doc.text("VALOR DO IPI", impDiv8 + 2, currentY + 12);
        doc.setFont("helvetica", "bold");
        doc.setFontSize(6.5);
        doc.setTextColor(0);
        doc.text("R$ 0,00", impDiv8 + 2, currentY + 15);

        doc.setFont("helvetica", "normal");
        doc.setFontSize(4.5);
        doc.setTextColor(80, 80, 80);
        doc.text("VALOR TOTAL DA NOTA", impDiv9 + 2, currentY + 12);
        doc.setFont("helvetica", "bold");
        doc.setFontSize(6.5);
        doc.setTextColor(0);
        doc.text(formattedTotalProd, impDiv9 + 2, currentY + 15);

        currentY += 16 + 2;

        // --- TRANSPORTADOR / VOLUMES TRANSPORTADOS BLOCK ---
        doc.setFillColor(240, 240, 240);
        doc.rect(m, currentY, 210 - 2 * m, 4, 'FD');
        doc.setFont("helvetica", "bold");
        doc.setFontSize(6.5);
        doc.setTextColor(0);
        doc.text("TRANSPORTADOR / VOLUMES TRANSPORTADOS", m + 2, currentY + 3);

        doc.rect(m, currentY + 4, 210 - 2 * m, 18);
        // Horizontal lines:
        doc.line(m, currentY + 10, 210 - m, currentY + 10);
        doc.line(m, currentY + 16, 210 - m, currentY + 16);
        
        // Row 1 Dividers:
        const transpW = 210 - 2 * m;
        const trDiv1 = m + transpW * 0.45;
        const trDiv2 = m + transpW * 0.58;
        const trDiv3 = m + transpW * 0.70;
        const trDiv4 = m + transpW * 0.78;
        const trDiv5 = m + transpW * 0.85;
        doc.line(trDiv1, currentY + 4, trDiv1, currentY + 10);
        doc.line(trDiv2, currentY + 4, trDiv2, currentY + 10);
        doc.line(trDiv3, currentY + 4, trDiv3, currentY + 10);
        doc.line(trDiv4, currentY + 4, trDiv4, currentY + 10);
        doc.line(trDiv5, currentY + 4, trDiv5, currentY + 10);

        // Row 2 Dividers:
        const trDiv6 = m + transpW * 0.45;
        const trDiv7 = m + transpW * 0.70;
        const trDiv8 = m + transpW * 0.78;
        doc.line(trDiv6, currentY + 10, trDiv6, currentY + 16);
        doc.line(trDiv7, currentY + 10, trDiv7, currentY + 16);
        doc.line(trDiv8, currentY + 10, trDiv8, currentY + 16);

        // Row 3 Dividers:
        const trDiv9 = m + transpW * 0.15;
        const trDiv10 = m + transpW * 0.35;
        const trDiv11 = m + transpW * 0.55;
        const trDiv12 = m + transpW * 0.70;
        const trDiv13 = m + transpW * 0.85;
        doc.line(trDiv9, currentY + 16, trDiv9, currentY + 22);
        doc.line(trDiv10, currentY + 16, trDiv10, currentY + 22);
        doc.line(trDiv11, currentY + 16, trDiv11, currentY + 22);
        doc.line(trDiv12, currentY + 16, trDiv12, currentY + 22);
        doc.line(trDiv13, currentY + 16, trDiv13, currentY + 22);

        // Row 1 Populate:
        doc.setFont("helvetica", "normal");
        doc.setFontSize(4.5);
        doc.setTextColor(80, 80, 80);
        doc.text("RAZÃO SOCIAL", m + 2, currentY + 6);
        doc.setFont("helvetica", "bold");
        doc.setFontSize(6.5);
        doc.setTextColor(0);
        doc.text(String(transpName).toUpperCase().substring(0, 40), m + 2, currentY + 9);

        doc.setFont("helvetica", "normal");
        doc.setFontSize(4.5);
        doc.setTextColor(80, 80, 80);
        doc.text("FRETE POR CONTA", trDiv1 + 2, currentY + 6);
        doc.setFont("helvetica", "bold");
        doc.setFontSize(6.5);
        doc.setTextColor(0);
        doc.text("0 - REMETENTE", trDiv1 + 2, currentY + 9);

        doc.setFont("helvetica", "normal");
        doc.setFontSize(4.5);
        doc.setTextColor(80, 80, 80);
        doc.text("CÓDIGO ANTT", trDiv2 + 2, currentY + 6);
        doc.setFont("helvetica", "bold");
        doc.setFontSize(6.5);
        doc.setTextColor(0);
        doc.text("-", trDiv2 + 2, currentY + 9);

        doc.setFont("helvetica", "normal");
        doc.setFontSize(4.5);
        doc.setTextColor(80, 80, 80);
        doc.text("PLACA DO VEÍCULO", trDiv3 + 2, currentY + 6);
        doc.setFont("helvetica", "bold");
        doc.setFontSize(6.5);
        doc.setTextColor(0);
        doc.text("FTL-2026", trDiv3 + 2, currentY + 9);

        doc.setFont("helvetica", "normal");
        doc.setFontSize(4.5);
        doc.setTextColor(80, 80, 80);
        doc.text("UF", trDiv4 + 2, currentY + 6);
        doc.setFont("helvetica", "bold");
        doc.setFontSize(6.5);
        doc.setTextColor(0);
        doc.text("CE", trDiv4 + 2, currentY + 9);

        doc.setFont("helvetica", "normal");
        doc.setFontSize(4.5);
        doc.setTextColor(80, 80, 80);
        doc.text("CNPJ / CPF", trDiv5 + 2, currentY + 6);
        doc.setFont("helvetica", "bold");
        doc.setFontSize(6.5);
        doc.setTextColor(0);
        doc.text("07.122.455/0001-90", trDiv5 + 2, currentY + 9);

        // Row 2 Populate:
        doc.setFont("helvetica", "normal");
        doc.setFontSize(4.5);
        doc.setTextColor(80, 80, 80);
        doc.text("ENDEREÇO", m + 2, currentY + 12);
        doc.setFont("helvetica", "bold");
        doc.setFontSize(6.5);
        doc.setTextColor(0);
        doc.text("AVENIDA OPERACIONAL DA SEFAZ, 4000", m + 2, currentY + 15);

        doc.setFont("helvetica", "normal");
        doc.setFontSize(4.5);
        doc.setTextColor(80, 80, 80);
        doc.text("MUNICÍPIO", trDiv6 + 2, currentY + 12);
        doc.setFont("helvetica", "bold");
        doc.setFontSize(6.5);
        doc.setTextColor(0);
        doc.text("FORTALEZA", trDiv6 + 2, currentY + 15);

        doc.setFont("helvetica", "normal");
        doc.setFontSize(4.5);
        doc.setTextColor(80, 80, 80);
        doc.text("UF", trDiv7 + 2, currentY + 12);
        doc.setFont("helvetica", "bold");
        doc.setFontSize(6.5);
        doc.setTextColor(0);
        doc.text("CE", trDiv7 + 2, currentY + 15);

        doc.setFont("helvetica", "normal");
        doc.setFontSize(4.5);
        doc.setTextColor(80, 80, 80);
        doc.text("INSCRIÇÃO ESTADUAL", trDiv8 + 2, currentY + 12);
        doc.setFont("helvetica", "bold");
        doc.setFontSize(6.5);
        doc.setTextColor(0);
        doc.text("401202611", trDiv8 + 2, currentY + 15);

        // Row 3 Populate:
        doc.setFont("helvetica", "normal");
        doc.setFontSize(4.5);
        doc.setTextColor(80, 80, 80);
        doc.text("QUANTIDADE", m + 2, currentY + 18);
        doc.setFont("helvetica", "bold");
        doc.setFontSize(6.5);
        doc.setTextColor(0);
        doc.text(vols, m + 2, currentY + 21);

        doc.setFont("helvetica", "normal");
        doc.setFontSize(4.5);
        doc.setTextColor(80, 80, 80);
        doc.text("ESPÉCIE", trDiv9 + 2, currentY + 18);
        doc.setFont("helvetica", "bold");
        doc.setFontSize(6.5);
        doc.setTextColor(0);
        doc.text("VOLUMES", trDiv9 + 2, currentY + 21);

        doc.setFont("helvetica", "normal");
        doc.setFontSize(4.5);
        doc.setTextColor(80, 80, 80);
        doc.text("MARCA", trDiv10 + 2, currentY + 18);
        doc.setFont("helvetica", "bold");
        doc.setFontSize(6.5);
        doc.setTextColor(0);
        doc.text("DIVERSAS", trDiv10 + 2, currentY + 21);

        doc.setFont("helvetica", "normal");
        doc.setFontSize(4.5);
        doc.setTextColor(80, 80, 80);
        doc.text("NÚMERO", trDiv11 + 2, currentY + 18);
        doc.setFont("helvetica", "bold");
        doc.setFontSize(6.5);
        doc.setTextColor(0);
        doc.text("-", trDiv11 + 2, currentY + 21);

        doc.setFont("helvetica", "normal");
        doc.setFontSize(4.5);
        doc.setTextColor(80, 80, 80);
        doc.text("PESO BRUTO", trDiv12 + 2, currentY + 18);
        doc.setFont("helvetica", "bold");
        doc.setFontSize(6.5);
        doc.setTextColor(0);
        doc.text(formattedWeight, trDiv12 + 2, currentY + 21);

        doc.setFont("helvetica", "normal");
        doc.setFontSize(4.5);
        doc.setTextColor(80, 80, 80);
        doc.text("PESO LÍQUIDO", trDiv13 + 2, currentY + 18);
        doc.setFont("helvetica", "bold");
        doc.setFontSize(6.5);
        doc.setTextColor(0);
        doc.text(formattedWeight, trDiv13 + 2, currentY + 21);

        currentY += 22 + 2;

        // --- PRODUCTS TABLE TITLE & HEADERS ---
        doc.setFillColor(245, 245, 245);
        doc.rect(m, currentY, 210 - 2 * m, 4, 'FD');
        doc.setFont("helvetica", "bold");
        doc.setFontSize(7);
        doc.setTextColor(0);
        doc.text("DADOS DO PRODUTO / SERVIÇO (CONTEÚDO IDENTIFICADO)", m + 2, currentY + 3);

        doc.rect(m, currentY + 4, 210 - 2 * m, 6);
        doc.line(22 + delta, currentY + 4, 22 + delta, currentY + 10);
        doc.line(114 + delta, currentY + 4, 114 + delta, currentY + 10);
        doc.line(126 + delta, currentY + 4, 126 + delta, currentY + 10);
        doc.line(134 + delta, currentY + 4, 134 + delta, currentY + 10);
        doc.line(144 + delta, currentY + 4, 144 + delta, currentY + 10);
        doc.line(152 + delta, currentY + 4, 152 + delta, currentY + 10);
        doc.line(164 + delta, currentY + 4, 164 + delta, currentY + 10);
        doc.line(178 + delta, currentY + 4, 178 + delta, currentY + 10);

        doc.setFont("helvetica", "bold");
        doc.setFontSize(5);
        doc.setTextColor(80, 80, 80);
        doc.text("CÓDIGO", m + 2, currentY + 8);
        doc.text("DESCRIÇÃO DO PRODUTO / SERVIÇO", 24 + delta, currentY + 8);
        doc.text("NCM/SH", 115.5 + delta, currentY + 8);
        doc.text("CST", 127.5 + delta, currentY + 8);
        doc.text("CFOP", 135.5 + delta, currentY + 8);
        doc.text("UNID", 145.5 + delta, currentY + 8);
        doc.text("QTD", 153.5 + delta, currentY + 8);
        doc.text("V. UNITÁRIO", 165.5 + delta, currentY + 8);
        doc.text("V. TOTAL", 180 + delta, currentY + 8);

        // Draw Page 1 Products
        const p1Displayed = detailedProds.slice(0, p1RowsToDraw);
        let rowY = p1StartY;

        p1Displayed.forEach((prod, pIdx) => {
          doc.line(m, rowY + rowSpacingVal, 210 - m, rowY + rowSpacingVal);
          doc.line(22 + delta, rowY, 22 + delta, rowY + rowSpacingVal);
          doc.line(114 + delta, rowY, 114 + delta, rowY + rowSpacingVal);
          doc.line(126 + delta, rowY, 126 + delta, rowY + rowSpacingVal);
          doc.line(134 + delta, rowY, 134 + delta, rowY + rowSpacingVal);
          doc.line(144 + delta, rowY, 144 + delta, rowY + rowSpacingVal);
          doc.line(152 + delta, rowY, 152 + delta, rowY + rowSpacingVal);
          doc.line(164 + delta, rowY, 164 + delta, rowY + rowSpacingVal);
          doc.line(178 + delta, rowY, 178 + delta, rowY + rowSpacingVal);

          doc.setFont("helvetica", "normal");
          doc.setFontSize(dTemplate.fontSizeItems);
          doc.setTextColor(0);
          
          const textOffset = rowY + (rowSpacingVal / 2) + (dTemplate.fontSizeItems / 5);

          doc.text(prod.code, m + 2, textOffset);
          doc.text(String(prod.name).substring(0, 58), 24 + delta, textOffset);
          doc.text("84713012", 115.5 + delta, textOffset);
          doc.text("000", 127.5 + delta, textOffset);
          doc.text("5102", 135.5 + delta, textOffset);
          doc.text(String(prod.unit || "UN"), 145.5 + delta, textOffset);
          doc.text(String(prod.qty), 153.5 + delta, textOffset);
          doc.text(prod.unitPrice.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }), 165.5 + delta, textOffset);
          doc.text(prod.totalVal.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }), 180 + delta, textOffset);

          rowY += rowSpacingVal;
        });

        // Fill remaining space on page 1 if single page
        if (!isMultiPage) {
          const remaining = p1RowsToDraw - p1Displayed.length;
          for (let r = 0; r < remaining; r++) {
            doc.line(m, rowY + rowSpacingVal, 210 - m, rowY + rowSpacingVal);
            doc.line(22 + delta, rowY, 22 + delta, rowY + rowSpacingVal);
            doc.line(114 + delta, rowY, 114 + delta, rowY + rowSpacingVal);
            doc.line(126 + delta, rowY, 126 + delta, rowY + rowSpacingVal);
            doc.line(134 + delta, rowY, 134 + delta, rowY + rowSpacingVal);
            doc.line(144 + delta, rowY, 144 + delta, rowY + rowSpacingVal);
            doc.line(152 + delta, rowY, 152 + delta, rowY + rowSpacingVal);
            doc.line(164 + delta, rowY, 164 + delta, rowY + rowSpacingVal);
            doc.line(178 + delta, rowY, 178 + delta, rowY + rowSpacingVal);
            rowY += rowSpacingVal;
          }
        }

        doc.line(m, currentY + 10, m, rowY);
        doc.line(210 - m, currentY + 10, 210 - m, rowY);

        if (!isMultiPage && detailedProds.length > p1RowsToDraw) {
          doc.setFont("helvetica", "italic");
          doc.setFontSize(dTemplate.fontSizeItems - 0.5);
          doc.setTextColor(80, 80, 80);
          doc.text(`* Mostrando ${p1RowsToDraw} de ${detailedProds.length} produtos. Restante omitido para economia de espaço.`, m + 2, rowY + rowSpacingVal - 1.5);
        }

        // Dados adicionais (Page 1 footer if single page)
        if (!isMultiPage && showBottomSection) {
          const bottomBlockY = 297 - m - 42;
          
          doc.setFillColor(245, 245, 245);
          doc.rect(m, bottomBlockY, 210 - 2 * m, 4, 'FD');
          doc.setFont("helvetica", "bold");
          doc.setFontSize(7);
          doc.setTextColor(0);
          doc.text("DADOS ADICIONAIS", m + 2, bottomBlockY + 3);

          doc.rect(m, bottomBlockY + 4, 210 - 2 * m, 38);

          if (dTemplate.showAdditionalNotes) {
            doc.setFont("helvetica", "normal");
            doc.setFontSize(5.5);
            doc.setTextColor(50, 50, 50);
            
            const additional: string[] = [];
            if (infCplLines.length > 0) {
              additional.push("INFORMAÇÕES COMPLEMENTARES:");
              additional.push(...infCplLines.slice(0, 6));
            }
            
            additional.forEach((note, nIdx) => {
              doc.text(note, m + 3, bottomBlockY + 8 + (nIdx * 4.2));
            });
          }

          // Generate and draw QR Code of the key at the bottom block (next to stamp)
          try {
            const qrDataUrl = await generateQRCodeDataURL(key);
            const qrBoxX = 112 + delta;
            const qrBoxY = bottomBlockY + 6;
            doc.rect(qrBoxX, qrBoxY, 30, 34);
            doc.setFont("helvetica", "bold");
            doc.setFontSize(4.5);
            doc.setTextColor(0);
            doc.text("QR-CODE DA CHAVE", qrBoxX + 15, qrBoxY + 4, { align: 'center' });
            doc.addImage(qrDataUrl, 'PNG', qrBoxX + 3, qrBoxY + 6, 24, 24);
            doc.setFont("helvetica", "normal");
            doc.text("CONSULTA SEFAZ", qrBoxX + 15, qrBoxY + 32, { align: 'center' });
          } catch (qrErr) {
            console.error("Error rendering footer QR code", qrErr);
          }

          // Stamp
          if (dTemplate.showSysAuthentication) {
            doc.rect(144 + delta, bottomBlockY + 6, 54, 34);
            doc.setFont("helvetica", "bold");
            doc.setFontSize(6.5);
            doc.setTextColor(0);
            doc.text("AUTENTICAÇÃO DO SISTEMA", 171 + delta, bottomBlockY + 12, { align: 'center' });
            
            doc.setLineWidth(0.2);
            doc.rect(146 + delta, bottomBlockY + 15, 50, 22);
            doc.setFontSize(5);
            doc.setFont("helvetica", "bold");
            doc.text("SISTEMA DE GESTÃO JFAB", 171 + delta, bottomBlockY + 19, { align: 'center' });
            doc.setFont("helvetica", "normal");
            doc.text("REGISTRO OPERACIONAL DE FLUXO", 171 + delta, bottomBlockY + 23, { align: 'center' });
            doc.setFont("helvetica", "bold");
            doc.setFontSize(5.5);
            doc.text(dTemplate.customStampText || "STATUS: APROVADA & CONSOLIDADA", 171 + delta, bottomBlockY + 28, { align: 'center' });
            
            doc.setFont("helvetica", "normal");
            doc.setFontSize(4.5);
            doc.text("CHAVE SINCRONIZADA EM NUVEM", 171 + delta, bottomBlockY + 33, { align: 'center' });
          }
        }

        // Subsequent Pages (if multi-page)
        if (isMultiPage) {
          let currentProdIdx = p1RowsToDraw;
          let currentPageNum = 1;
          
          while (currentProdIdx < detailedProds.length) {
            doc.addPage();
            currentPageNum++;
            
            // Draw Watermark if enabled
            if (dTemplate.showWatermark) {
              doc.setTextColor(242, 242, 242);
              doc.setFont("helvetica", "bold");
              doc.setFontSize(14);
              doc.text(dTemplate.watermarkText || "JOSÉ FELIPE A. BARROSO", 50, 100, { angle: 335 });
              doc.text(dTemplate.watermarkText || "JOSÉ FELIPE A. BARROSO", 50, 180, { angle: 335 });
            }
            
            // Border
            doc.setDrawColor(themeRgb.r, themeRgb.g, themeRgb.b);
            doc.setLineWidth(0.3);
            doc.rect(m, m, 210 - 2 * m, 297 - 2 * m);
            
            // Simplified Header Box
            const headerBoxY = m;
            const headerBoxH = 18;
            doc.rect(m, headerBoxY, 210 - 2 * m, headerBoxH);
            doc.line(124 + delta, headerBoxY, 124 + delta, headerBoxY + headerBoxH);
            
            doc.setFont("helvetica", "bold");
            doc.setFontSize(7.5);
            doc.setTextColor(0);
            doc.text("EMITENTE: " + String(finalEmitName).toUpperCase().substring(0, 36), m + 3, headerBoxY + 5);
            doc.setFont("helvetica", "normal");
            doc.setFontSize(6);
            doc.setTextColor(80, 80, 80);
            doc.text(`CNPJ: ${emitCnpjReal}  |  ${emitAddress.toUpperCase().substring(0, 48)}, ${emitCityState.toUpperCase().substring(0, 30)}`, m + 3, headerBoxY + 10);
            doc.text(`CHAVE: ${formattedKey.substring(0, 32)}...`, m + 3, headerBoxY + 14);
            
            doc.setFont("helvetica", "bold");
            doc.setFontSize(8.5);
            doc.setTextColor(0);
            doc.text("DANFE - CONTINUAÇÃO", 162 + delta, headerBoxY + 6, { align: 'center' });
            doc.setFont("helvetica", "normal");
            doc.setFontSize(6.5);
            doc.text(`FOLHA ${String(currentPageNum).padStart(2, '0')}/${String(totalPages).padStart(2, '0')}`, 162 + delta, headerBoxY + 11, { align: 'center' });
            doc.text(`NF-e: ${String(number).padStart(9, '0')}  SÉRIE: ${series}`, 162 + delta, headerBoxY + 15, { align: 'center' });

            // Table headers
            const subPageStartY = m + 22;
            doc.setFillColor(245, 245, 245);
            doc.rect(m, subPageStartY, 210 - 2 * m, 4, 'FD');
            doc.setFont("helvetica", "bold");
            doc.setFontSize(6.5);
            doc.setTextColor(0);
            doc.text("DADOS DO PRODUTO / SERVIÇO (CONTEÚDO CONTINUAÇÃO)", m + 2, subPageStartY + 3);
            
            doc.rect(m, subPageStartY + 4, 210 - 2 * m, 6);
            doc.line(22 + delta, subPageStartY + 4, 22 + delta, subPageStartY + 10);
            doc.line(114 + delta, subPageStartY + 4, 114 + delta, subPageStartY + 10);
            doc.line(126 + delta, subPageStartY + 4, 126 + delta, subPageStartY + 10);
            doc.line(134 + delta, subPageStartY + 4, 134 + delta, subPageStartY + 10);
            doc.line(144 + delta, subPageStartY + 4, 144 + delta, subPageStartY + 10);
            doc.line(152 + delta, subPageStartY + 4, 152 + delta, subPageStartY + 10);
            doc.line(164 + delta, subPageStartY + 4, 164 + delta, subPageStartY + 10);
            doc.line(178 + delta, subPageStartY + 4, 178 + delta, subPageStartY + 10);
            
            doc.setFont("helvetica", "bold");
            doc.setFontSize(5);
            doc.setTextColor(80, 80, 80);
            doc.text("CÓDIGO", m + 2, subPageStartY + 8);
            doc.text("DESCRIÇÃO DO PRODUTO / SERVIÇO", 24 + delta, subPageStartY + 8);
            doc.text("NCM/SH", 115.5 + delta, subPageStartY + 8);
            doc.text("CST", 127.5 + delta, subPageStartY + 8);
            doc.text("CFOP", 135.5 + delta, subPageStartY + 8);
            doc.text("UNID", 145.5 + delta, subPageStartY + 8);
            doc.text("QTD", 153.5 + delta, subPageStartY + 8);
            doc.text("V. UNITÁRIO", 165.5 + delta, subPageStartY + 8);
            doc.text("V. TOTAL", 180 + delta, subPageStartY + 8);
            
            const remainingCount = detailedProds.length - currentProdIdx;
            const subPageMaxRowY = 297 - m - 2;
            const subPageMaxRowYIfLast = 297 - m - bottomSectionHeight - 2;
            
            const subPageMaxRowsIfLast = Math.floor((subPageMaxRowYIfLast - (subPageStartY + 10)) / rowSpacingVal);
            const subPageMaxRowsIfMulti = Math.floor((subPageMaxRowY - (subPageStartY + 10)) / rowSpacingVal);
            
            let isCurrentPageLast = remainingCount <= subPageMaxRowsIfLast;
            let rowsToDraw = isCurrentPageLast ? subPageMaxRowsIfLast : subPageMaxRowsIfMulti;
            
            const pageDisplayed = detailedProds.slice(currentProdIdx, currentProdIdx + rowsToDraw);
            let subRowY = subPageStartY + 10;
            
            pageDisplayed.forEach((prod, pIdx) => {
              doc.line(m, subRowY + rowSpacingVal, 210 - m, subRowY + rowSpacingVal);
              doc.line(22 + delta, subRowY, 22 + delta, subRowY + rowSpacingVal);
              doc.line(114 + delta, subRowY, 114 + delta, subRowY + rowSpacingVal);
              doc.line(126 + delta, subRowY, 126 + delta, subRowY + rowSpacingVal);
              doc.line(134 + delta, subRowY, 134 + delta, subRowY + rowSpacingVal);
              doc.line(144 + delta, subRowY, 144 + delta, subRowY + rowSpacingVal);
              doc.line(152 + delta, subRowY, 152 + delta, subRowY + rowSpacingVal);
              doc.line(164 + delta, subRowY, 164 + delta, subRowY + rowSpacingVal);
              doc.line(178 + delta, subRowY, 178 + delta, subRowY + rowSpacingVal);

              doc.setFont("helvetica", "normal");
              doc.setFontSize(dTemplate.fontSizeItems);
              doc.setTextColor(0);
              
              const textOffset = subRowY + (rowSpacingVal / 2) + (dTemplate.fontSizeItems / 5);

              doc.text(prod.code, m + 2, textOffset);
              doc.text(String(prod.name).substring(0, 58), 24 + delta, textOffset);
              doc.text("84713012", 115.5 + delta, textOffset);
              doc.text("000", 127.5 + delta, textOffset);
              doc.text("5102", 135.5 + delta, textOffset);
              doc.text(String(prod.unit || "UN"), 145.5 + delta, textOffset);
              doc.text(String(prod.qty), 153.5 + delta, textOffset);
              doc.text(prod.unitPrice.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }), 165.5 + delta, textOffset);
              doc.text(prod.totalVal.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }), 180 + delta, textOffset);

              subRowY += rowSpacingVal;
            });
            
            if (isCurrentPageLast) {
              const remaining = rowsToDraw - pageDisplayed.length;
              for (let r = 0; r < remaining; r++) {
                doc.line(m, subRowY + rowSpacingVal, 210 - m, subRowY + rowSpacingVal);
                doc.line(22 + delta, subRowY, 22 + delta, subRowY + rowSpacingVal);
                doc.line(114 + delta, subRowY, 114 + delta, subRowY + rowSpacingVal);
                doc.line(126 + delta, subRowY, 126 + delta, subRowY + rowSpacingVal);
                doc.line(134 + delta, subRowY, 134 + delta, subRowY + rowSpacingVal);
                doc.line(144 + delta, subRowY, 144 + delta, subRowY + rowSpacingVal);
                doc.line(152 + delta, subRowY, 152 + delta, subRowY + rowSpacingVal);
                doc.line(164 + delta, subRowY, 164 + delta, subRowY + rowSpacingVal);
                doc.line(178 + delta, subRowY, 178 + delta, subRowY + rowSpacingVal);
                subRowY += rowSpacingVal;
              }
            }
            
            doc.line(m, subPageStartY + 10, m, subRowY);
            doc.line(210 - m, subPageStartY + 10, 210 - m, subRowY);
            
            if (isCurrentPageLast && showBottomSection) {
              const bottomBlockY = 297 - m - 42;
              
              doc.setFillColor(245, 245, 245);
              doc.rect(m, bottomBlockY, 210 - 2 * m, 4, 'FD');
              doc.setFont("helvetica", "bold");
              doc.setFontSize(7);
              doc.setTextColor(0);
              doc.text("DADOS ADICIONAIS", m + 2, bottomBlockY + 3);

              doc.rect(m, bottomBlockY + 4, 210 - 2 * m, 38);

              if (dTemplate.showAdditionalNotes) {
                doc.setFont("helvetica", "normal");
                doc.setFontSize(5.5);
                doc.setTextColor(50, 50, 50);
                
                const additional: string[] = [];
                if (infCplLines.length > 0) {
                  additional.push("INFORMAÇÕES COMPLEMENTARES:");
                  additional.push(...infCplLines.slice(0, 6));
                }
                
                additional.forEach((note, nIdx) => {
                  doc.text(note, m + 3, bottomBlockY + 8 + (nIdx * 4.2));
                });
              }

              // Generate and draw QR Code of the key at the bottom block (next to stamp)
              try {
                const qrDataUrl = await generateQRCodeDataURL(key);
                const qrBoxX = 112 + delta;
                const qrBoxY = bottomBlockY + 6;
                doc.rect(qrBoxX, qrBoxY, 30, 34);
                doc.setFont("helvetica", "bold");
                doc.setFontSize(4.5);
                doc.setTextColor(0);
                doc.text("QR-CODE DA CHAVE", qrBoxX + 15, qrBoxY + 4, { align: 'center' });
                doc.addImage(qrDataUrl, 'PNG', qrBoxX + 3, qrBoxY + 6, 24, 24);
                doc.setFont("helvetica", "normal");
                doc.text("CONSULTA SEFAZ", qrBoxX + 15, qrBoxY + 32, { align: 'center' });
              } catch (qrErr) {
                console.error("Error rendering subsequent footer QR code", qrErr);
              }

              if (dTemplate.showSysAuthentication) {
                doc.rect(144 + delta, bottomBlockY + 6, 54, 34);
                doc.setFont("helvetica", "bold");
                doc.setFontSize(6.5);
                doc.setTextColor(0);
                doc.text("AUTENTICAÇÃO DO SISTEMA", 171 + delta, bottomBlockY + 12, { align: 'center' });
                
                doc.setLineWidth(0.2);
                doc.rect(146 + delta, bottomBlockY + 15, 50, 22);
                doc.setFontSize(5);
                doc.setFont("helvetica", "bold");
                doc.text("SISTEMA DE GESTÃO JFAB", 171 + delta, bottomBlockY + 19, { align: 'center' });
                doc.setFont("helvetica", "normal");
                doc.text("REGISTRO OPERACIONAL DE FLUXO", 171 + delta, bottomBlockY + 23, { align: 'center' });
                doc.setFont("helvetica", "bold");
                doc.setFontSize(5.5);
                doc.text(dTemplate.customStampText || "STATUS: APROVADA & CONSOLIDADA", 171 + delta, bottomBlockY + 28, { align: 'center' });
                
                doc.setFont("helvetica", "normal");
                doc.setFontSize(4.5);
                doc.text("CHAVE SINCRONIZADA EM NUVEM", 171 + delta, bottomBlockY + 33, { align: 'center' });
              }
            }
            
            currentProdIdx += rowsToDraw;
          }
        }
      }

      if (nfeItems.length === 1) {
        doc.save(`DANFE-${nfeItems[0].nfeData?.chave || nfeItems[0].t}.pdf`);
      } else {
        doc.save(`DANFE-Lote-${selectedContainer.toUpperCase()}-${format(new Date(), 'yyyyMMdd')}.pdf`);
      }

      const logMsg = nfeItems.length === 1 
        ? `DANFE exportado em PDF para a Nota Fiscal Chave: ${nfeItems[0].t.substring(0, 10)}... com layout personalizado.`
        : `DANFE em Lote consolidado exportado em PDF para ${nfeItems.length} Nota(s) Fiscal(is) do contêiner "${selectedContainer.toUpperCase()}" com layout personalizado.`;
      
      await addCustomAuditLog('Impressão DANFE PDF', logMsg);

      addNotification('success', 'DANFE Gerado', `${nfeItems.length} Nota(s) Fiscal(is) exportada(s) com layout DANFE oficial.`);
    } catch (err) {
      console.error(err);
      addNotification('error', 'Erro', 'Falha ao processar e exportar o DANFE.');
    }
  };


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
            <LayoutDesigner />
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
                  Tamanho físico do arquivo de persistência (`storage.json`) armazenado no servidor.
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

