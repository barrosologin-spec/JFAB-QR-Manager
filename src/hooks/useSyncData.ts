/**
 * Desenvolvido por José Felipe A. Barroso (pixdobarroso@gmail.com)
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { QRStorage, QRItem, Notification } from '../types';
import { playSound } from '../lib/audioStorage';
import { md5 } from '../lib/md5';

export function useSyncData() {
  const [storage, setStorage] = useState<QRStorage>({});
  const [loading, setLoading] = useState(true);
  const [notifications, setNotifications] = useState<Notification[]>([]);

  // Authenticated User State
  const [currentUser, setCurrentUser] = useState<{ name: string; email: string } | null>(() => {
    try {
      const stored = localStorage.getItem('qr_current_user');
      return stored ? JSON.parse(stored) : null;
    } catch {
      return null;
    }
  });

  // Sync state variables
  const [countdown, setCountdown] = useState(0); // seconds left (0 for real-time default)
  const [syncInterval, setSyncInterval] = useState(0); // minutes (0 is Tempo Real by default)
  const [isSyncing, setIsSyncing] = useState(false);
  const [lastSyncTime, setLastSyncTime] = useState<number>(0);
  const [lastLocalUpdatedTime, setLastLocalUpdatedTime] = useState<number>(0);
  const [presets, setPresets] = useState<number[]>([0, 1, 5, 15, 30, 60, 120]);

  // DB Health & Size Tracking state
  const [dbHealth, setDbHealth] = useState<{
    sizeBytes: number;
    sizeFormatted: string;
    integrity: string;
    message: string;
    itemCount: number;
    lastCheckTime: number;
  } | null>(null);

  const fetchDbHealth = useCallback(async () => {
    try {
      const res = await fetch('/api/db-health');
      if (res.ok) {
        const data = await res.json();
        setDbHealth(data);
      }
    } catch (err) {
      console.error('Failed to fetch DB health:', err);
    }
  }, []);

  // Helper to add in-app notifications
  const addNotification = useCallback((type: Notification['type'], title: string, message: string) => {
    const syncNotificationId = 'sync-status';
    const isSyncMessage = title === 'Sincronizado' || title === 'Sem Conexão' || title === 'Sincronização falhou';
    
    const newNotif: Notification = {
      id: isSyncMessage ? syncNotificationId : (Date.now().toString() + Math.random()),
      type,
      title,
      message,
      ts: Date.now()
    };
    
    setNotifications(prev => {
      // If it's a sync message, replace existing ones with the same ID
      if (isSyncMessage) {
        return [newNotif, ...prev.filter(n => n.id !== syncNotificationId)].slice(0, 50);
      }
      return [newNotif, ...prev].slice(0, 50);
    });
  }, []);

  const clearNotifications = useCallback(() => {
    setNotifications([]);
  }, []);

  // 1. On Mount: Load database directly from Server API (storage.db (SQLite))
  useEffect(() => {
    const loadServerData = async () => {
      try {
        const remoteRes = await fetch('/api/sync');
        if (remoteRes.ok) {
          const remoteJson = await remoteRes.json();
          if (remoteJson) {
            let remoteData = remoteJson.qrStorageV2 || {};
            const remoteUpdated = remoteJson.qrStorageLastUpdated || 0;

            // Seed default system user if users table is empty
            if (!remoteData._users || !Array.isArray(remoteData._users) || remoteData._users.length === 0) {
              remoteData._users = [{
                email: 'barroso.login@gmail.com',
                passwordHash: 'e10adc3949ba59abbe56e057f20f883e', // MD5 hash of Default Password "123456"
                name: 'José Felipe A. Barroso',
                role: 'admin'
              }];
              // Write seed immediately to server
              await fetch('/api/sync', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  qrStorageV2: remoteData,
                  qrStorageLastUpdated: Date.now()
                })
              });
            }

            setStorage(remoteData);
            setLastLocalUpdatedTime(remoteUpdated);
            setLastSyncTime(remoteUpdated || Date.now());
          }
        }
        await fetchDbHealth();
      } catch (err) {
        console.error('Failed to load server storage.db (SQLite) on startup:', err);
      } finally {
        setLoading(false);
      }
    };
    loadServerData();
  }, [fetchDbHealth]);

  // 2. Initial Settings Load from Server
  useEffect(() => {
    const loadSettings = async () => {
      try {
        const res = await fetch('/api/settings');
        if (res.ok) {
           const data = await res.json();
           if (typeof data.interval === 'number') {
              setSyncInterval(data.interval);
           }
           if (Array.isArray(data.presets)) {
              const loadedPresets = data.presets.includes(0) ? data.presets : [0, ...data.presets];
              setPresets(loadedPresets.sort((a, b) => a - b));
           }
        }
      } catch (error) {
        // Soft fail
      }
    };
    loadSettings();
  }, []);

  const consecutiveFailsRef = useRef(0);

  // Core Sync Function: Retrieve the latest backend state from storage.db (SQLite)
  const syncNow = useCallback(async (isAutoSync: boolean = false) => {
    setIsSyncing(true);
    try {
      const remoteRes = await fetch('/api/sync');
      if (!remoteRes.ok) throw new Error("Server sync error");
      const remoteJson = await remoteRes.json();
      if (remoteJson && remoteJson.qrStorageV2) {
        setStorage(remoteJson.qrStorageV2);
        const remoteUpdated = remoteJson.qrStorageLastUpdated || Date.now();
        setLastLocalUpdatedTime(remoteUpdated);
        setLastSyncTime(Date.now());
        
        // Show success if manual sync OR if we just recovered from a failure
        if (!isAutoSync || consecutiveFailsRef.current >= 3) {
          addNotification('success', 'Sincronizado', 'Dados sincronizados com o servidor.');
        }
        consecutiveFailsRef.current = 0;
        
        // Update database size and health information
        await fetchDbHealth();
        return true;
      }
      return false;
    } catch (error) {
      console.error("Synchronization failed:", error);
      consecutiveFailsRef.current += 1;
      
      // Only show error notification if manual sync OR if it failed 3 times in a row
      if (!isAutoSync || consecutiveFailsRef.current >= 3) {
        addNotification('error', 'Sem Conexão', 'Sincronização com o servidor falhou.');
      }
      return false;
    } finally {
      setIsSyncing(false);
    }
  }, [addNotification, fetchDbHealth]);

  // Regular Automatic Countdown ticking every second
  useEffect(() => {
    // If syncInterval is 0 (Tempo Real), poll every 3 seconds
    if (syncInterval === 0) {
      const timer = setInterval(() => {
        syncNow(true);
      }, 3000);
      return () => clearInterval(timer);
    }

    const timer = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) {
          // Trigger scheduled auto-sync on timer expiry
          syncNow(true);
          return syncInterval * 60;
        }
        return prev - 1;
      });
    }, 1000);
    
    return () => clearInterval(timer);
  }, [syncInterval, syncNow]);

  // Rescale countdown if interval or last sync changes
  useEffect(() => {
    if (syncInterval === 0) {
      setCountdown(0);
      return;
    }
    if (lastSyncTime > 0) {
      const nextSync = lastSyncTime + syncInterval * 60 * 1000;
      const timeLeft = nextSync - Date.now();
      if (timeLeft > 0) {
        setCountdown(Math.floor(timeLeft / 1000));
      } else {
        setCountdown(0);
      }
    } else {
      setCountdown(syncInterval * 60);
    }
  }, [syncInterval, lastSyncTime]);

  // Custom synchronization interval updater
  const setCustomSyncInterval = async (minutes: number) => {
    try {
      const pushRes = await fetch('/api/settings', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ interval: minutes })
      });
      if (!pushRes.ok) throw new Error("Failed to update Settings");

      setSyncInterval(minutes);
      if (minutes === 0) {
        addNotification('success', 'Intervalo Alterado', 'Sincronização em Tempo Real ativada (atualização instantânea).');
      } else {
        addNotification('success', 'Intervalo Alterado', `Sincronização automática redefinida para ${minutes} minutos.`);
      }
      return true;
    } catch (error) {
      console.error("Sync interval update failed:", error);
      addNotification('error', 'Erro', 'Falha ao atualizar intervalo global.');
      return false;
    }
  };

  // Preset custom option addition
  const addPreset = async (minutes: number) => {
    if (presets.includes(minutes)) return false;
    const newPresets = [...presets, minutes].sort((a, b) => a - b);
    try {
      const pushRes = await fetch('/api/settings', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ presets: newPresets })
      });
      if (!pushRes.ok) throw new Error("Failed to setup new Preset");

      setPresets(newPresets);
      addNotification('success', 'Intervalo Adicionado', `Novo preset de ${minutes} minutos de sincronização registrado.`);
      return true;
    } catch (error) {
      console.error("Failed to append custom preset:", error);
      return false;
    }
  };

  // Local helper to record updates and flag synchronization
  const registerLocalChange = async (newStorage: QRStorage) => {
    const now = Date.now();
    setStorage(newStorage);
    setLastLocalUpdatedTime(now);
    
    try {
      const pushRes = await fetch('/api/sync', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            qrStorageV2: newStorage,
            qrStorageLastUpdated: now
          })
      });
      if (pushRes.ok) {
        setLastSyncTime(now);
        await fetchDbHealth();
      } else {
        throw new Error("HTTP " + pushRes.status);
      }
    } catch (err) {
      console.warn("Server connection offline or error writing updates:", err);
      addNotification('error', 'Erro de Gravação', 'Não foi possível persistir as alterações de imediato no servidor.');
    }
  };

  const appendAuditLog = (updatedStorage: QRStorage, action: string, description: string) => {
    if (!updatedStorage._logs) updatedStorage._logs = [] as any;
    const newLog = {
      id: Date.now().toString() + '-' + Math.random(),
      timestamp: Date.now(),
      action,
      description,
      user: currentUser ? currentUser.email : 'barroso.login@gmail.com'
    };
    updatedStorage._logs = [newLog, ...(updatedStorage._logs as any)].slice(0, 150) as any;
  };

  // Authentication & User Creation Procedures
  const login = async (email: string, passwordInput: string): Promise<{ success: boolean; message: string }> => {
    const normalizedEmail = email.trim().toLowerCase();
    const hash = md5(passwordInput.trim());
    
    const usersList = (storage._users as any[]) || [];
    const matched = usersList.find((u: any) => u.email.toLowerCase() === normalizedEmail);
    
    if (!matched) {
      return { success: false, message: 'Usuário não cadastrado ou e-mail inválido.' };
    }
    
    if (matched.passwordHash !== hash) {
      return { success: false, message: 'Senha incorreta. Verifique e tente novamente.' };
    }
    
    const loggedUser = { name: matched.name, email: matched.email };
    setCurrentUser(loggedUser);
    localStorage.setItem('qr_current_user', JSON.stringify(loggedUser));
    
    const updatedStorage = { ...storage };
    appendAuditLog(updatedStorage, 'Login Efetuado', `Usuário "${loggedUser.name}" (${loggedUser.email}) acessou o sistema.`);
    await registerLocalChange(updatedStorage);
    
    return { success: true, message: 'Sucesso' };
  };

  const logout = async () => {
    if (currentUser) {
      const updatedStorage = { ...storage };
      appendAuditLog(updatedStorage, 'Logout Efetuado', `Usuário "${currentUser.name}" (${currentUser.email}) saiu do sistema.`);
      await registerLocalChange(updatedStorage);
    }
    setCurrentUser(null);
    localStorage.removeItem('qr_current_user');
  };

  const registerUser = async (
    name: string,
    email: string,
    passwordInput: string,
    masterPasswordInput: string
  ): Promise<{ success: boolean; message: string }> => {
    const trimmedMaster = masterPasswordInput.trim();
    if (md5(trimmedMaster) !== "485e59ace2c554f39af99abaa9fd03fa") {
      return { success: false, message: 'Senha Mestra de segurança inválida.' };
    }
    
    const trimmedName = name.trim();
    const normalizedEmail = email.trim().toLowerCase();
    const trimmedPass = passwordInput.trim();
    
    if (!trimmedName || !normalizedEmail || !trimmedPass) {
      return { success: false, message: 'Todos os campos são obrigatórios.' };
    }
    
    const updatedStorage = { ...storage };
    if (!updatedStorage._users) updatedStorage._users = [] as any;
    const usersList = updatedStorage._users as any[];
    
    if (usersList.some((u: any) => u.email.toLowerCase() === normalizedEmail)) {
      return { success: false, message: 'Este e-mail de usuário já está cadastrado.' };
    }
    
    const newUser = {
      name: trimmedName,
      email: normalizedEmail,
      passwordHash: md5(trimmedPass)
    };
    
    updatedStorage._users = [...usersList, newUser] as any;
    appendAuditLog(updatedStorage, 'Usuário Criado', `Novo usuário registrado: "${trimmedName}" (${normalizedEmail}).`);
    await registerLocalChange(updatedStorage);
    
    return { success: true, message: 'Usuário cadastrado com sucesso.' };
  };

  // Exposed storage mutation procedures, now using IndexedDB first with background upload
  const updateItems = async (category: string, date: string, container: string, items: QRItem[]) => {
    const updatedStorage = { ...storage };
    if (!updatedStorage[category]) updatedStorage[category] = {};
    if (!updatedStorage[category][date]) updatedStorage[category][date] = {};
    const oldLength = updatedStorage[category][date][container]?.items?.length || 0;
    if (!updatedStorage[category][date][container]) {
      updatedStorage[category][date][container] = { items: [] };
    }
    updatedStorage[category][date][container].items = items;
    
    // Log scanning activity or item counts modifications
    let diff = items.length - oldLength;
    let action = 'Contêiner Modificado';
    let description = `Itens do contêiner "${container}" da coleta "${category}" atualizados. Total: ${items.length} itens.`;
    if (diff > 0) {
      action = 'Código Escaneado';
      description = `Adicionado ${diff} novo(s) código(s) ao contêiner "${container}" da coleta "${category}". Total: ${items.length} itens.`;
    } else if (diff < 0) {
      action = 'Código Removido';
      description = `Removido ${Math.abs(diff)} código(s) do contêiner "${container}" da coleta "${category}". Restantes: ${items.length} itens.`;
    }
    appendAuditLog(updatedStorage, action, description);

    await registerLocalChange(updatedStorage);
    return true;
  };

  const createCategory = async (name: string) => {
    if (!name) return false;
    if (storage[name]) {
      addNotification('error', 'Erro', 'Esta coleta já existe.');
      playSound('error');
      return false;
    }

    const updatedStorage = { ...storage };
    updatedStorage[name] = { _created: Date.now() as any };
    appendAuditLog(updatedStorage, 'Coleta Criada', `A nova coleta/linagem "${name}" foi adicionada ao sistema.`);
    await registerLocalChange(updatedStorage);
    addNotification('success', 'Sucesso', `Coleta "${name}" criada e armazenada.`);
    return true;
  };

  const deleteCategory = async (category: string) => {
    const updatedStorage = { ...storage };
    if (updatedStorage[category]) {
      // Coletar itens para Orfaos
      const catData = updatedStorage[category];
      const orphansToPush: any[] = [];
      
      Object.entries(catData).forEach(([dateStr, containersObj]) => {
        if (dateStr.startsWith('_')) return;
        Object.entries(containersObj as any).forEach(([containerName, containerVal]: [string, any]) => {
          if (containerName.startsWith('_')) return;
          if (containerVal && Array.isArray(containerVal.items) && containerVal.items.length > 0) {
            orphansToPush.push({
              id: Date.now().toString() + '-' + Math.random(),
              originalCategory: category,
              date: dateStr,
              containerName: containerName,
              items: containerVal.items,
              finalized: containerVal.finalized || false,
              deletedAt: Date.now()
            });
          }
        });
      });

      if (orphansToPush.length > 0) {
        if (!updatedStorage._orfaos) updatedStorage._orfaos = [] as any;
        updatedStorage._orfaos = [...(updatedStorage._orfaos as any), ...orphansToPush] as any;
      }

      delete updatedStorage[category];
      
      let msg = `A coleta "${category}" foi removida.`;
      if (orphansToPush.length > 0) {
        const totalOrphanItems = orphansToPush.reduce((acc, o) => acc + o.items.length, 0);
        msg += ` Os ${totalOrphanItems} item(ns) de ${orphansToPush.length} contêiner(es) foram realocados para o módulo de Órfãos.`;
      }
      
      appendAuditLog(updatedStorage, 'Coleta Removida', msg);
      await registerLocalChange(updatedStorage);
      addNotification('success', 'Sucesso', msg);
      playSound('success');
      return true;
    }
    addNotification('error', 'Erro', 'Falha ao remover coleta.');
    playSound('error');
    return false;
  };

  const reattributeOrphans = async (originalCategory: string, targetCategory: string) => {
    if (!targetCategory) return false;
    const trimmedTarget = targetCategory.trim();
    if (!trimmedTarget) return false;

    const updatedStorage = { ...storage };
    
    // Obter órfãos associados a originalCategory
    const orphansList: any[] = Array.isArray(updatedStorage._orfaos) ? (updatedStorage._orfaos as any) : [];
    const toReattribute = orphansList.filter(o => o.originalCategory === originalCategory);
    const toKeep = orphansList.filter(o => o.originalCategory !== originalCategory);

    if (toReattribute.length === 0) {
      addNotification('info', 'Informação', `Não foram encontrados arquivos órfãos para a coleta "${originalCategory}".`);
      return false;
    }

    // Criar a categoria alvo caso não exista
    if (!updatedStorage[trimmedTarget]) {
      updatedStorage[trimmedTarget] = { _created: Date.now() as any };
    }

    let itemsCount = 0;
    // Mover os itens órfãos de volta
    toReattribute.forEach(orphan => {
      const { date, containerName, items, finalized } = orphan;
      if (!updatedStorage[trimmedTarget][date]) {
        updatedStorage[trimmedTarget][date] = {};
      }
      if (!updatedStorage[trimmedTarget][date][containerName]) {
        updatedStorage[trimmedTarget][date][containerName] = { items: [] };
      }
      
      // Concatenar itens sem duplicar por texto
      const existingItems = updatedStorage[trimmedTarget][date][containerName].items || [];
      const existingTexts = new Set(existingItems.map((i: any) => i.t));
      
      items.forEach((it: any) => {
        if (!existingTexts.has(it.t)) {
          existingItems.push(it);
          itemsCount++;
        }
      });
      
      updatedStorage[trimmedTarget][date][containerName].items = existingItems;
      if (finalized) {
        updatedStorage[trimmedTarget][date][containerName].finalized = true;
      }
    });

    // Atualizar lista de órfãos
    updatedStorage._orfaos = toKeep as any;

    appendAuditLog(updatedStorage, 'Órfãos Reatribuídos', `Realocados ${itemsCount} item(ns) da coleta órfã "${originalCategory}" para a nova/existente coleta "${trimmedTarget}".`);
    await registerLocalChange(updatedStorage);
    addNotification('success', 'Sucesso', `${itemsCount} itens de contêineres órfãos foram reatribuídos para "${trimmedTarget}".`);
    playSound('success');
    return true;
  };

  const deleteOrphansPermanently = async (originalCategory: string) => {
    const updatedStorage = { ...storage };
    const orphansList: any[] = Array.isArray(updatedStorage._orfaos) ? (updatedStorage._orfaos as any) : [];
    const toKeep = orphansList.filter(o => o.originalCategory !== originalCategory);
    const toDelete = orphansList.filter(o => o.originalCategory === originalCategory);

    if (toDelete.length === 0) {
      addNotification('info', 'Não encontrado', `Nenhum contêiner órfão encontrado para a coleta "${originalCategory}".`);
      return false;
    }

    const deletedItemsCount = toDelete.reduce((acc, o) => acc + (o.items?.length || 0), 0);
    updatedStorage._orfaos = toKeep as any;

    appendAuditLog(updatedStorage, 'Órfãos Deletados', `Deletados permanentemente ${deletedItemsCount} item(ns) em ${toDelete.length} contêineres órfãos originais de "${originalCategory}".`);
    await registerLocalChange(updatedStorage);
    addNotification('success', 'Deletado', `Órfãos da coleta "${originalCategory}" apagados definitivamente (${deletedItemsCount} itens).`);
    playSound('success');
    return true;
  };

  const renameCategory = async (oldName: string, newName: string) => {
    if (!newName || !oldName) return false;
    const trimmedNew = newName.trim();
    if (oldName === trimmedNew) return true;
    if (storage[trimmedNew]) {
      addNotification('error', 'Erro', 'Já existe uma coleta com este nome.');
      playSound('error');
      return false;
    }
    const updatedStorage = { ...storage };
    if (updatedStorage[oldName]) {
      updatedStorage[trimmedNew] = updatedStorage[oldName];
      delete updatedStorage[oldName];
      appendAuditLog(updatedStorage, 'Coleta Renomeada', `A coleta "${oldName}" foi renomeada com sucesso para "${trimmedNew}".`);
      await registerLocalChange(updatedStorage);
      addNotification('success', 'Sucesso', `Coleta renomeada para "${trimmedNew}".`);
      playSound('success');
      return true;
    }
    return false;
  };

  const updateCategoryColor = async (category: string, color: string) => {
    if (!category) return false;
    const updatedStorage = { ...storage };
    if (updatedStorage[category]) {
      updatedStorage[category] = {
        ...updatedStorage[category],
        _color: color as any
      };
      appendAuditLog(updatedStorage, 'Cor Atualizada', `A cor temática da coleta "${category}" foi alterada para "${color}".`);
      await registerLocalChange(updatedStorage);
      addNotification('success', 'Cor Atualizada', `A cor da coleta "${category}" foi alterada.`);
      playSound('success');
      return true;
    }
    return false;
  };

  const createContainer = async (category: string, date: string, name: string) => {
    if (storage[category]?.[date]?.[name]) {
      addNotification('error', 'Erro', 'Este contêiner já existe.');
      playSound('error');
      return false;
    }

    const updatedStorage = { ...storage };
    if (!updatedStorage[category]) updatedStorage[category] = {};
    if (!updatedStorage[category][date]) updatedStorage[category][date] = {};
    updatedStorage[category][date][name] = {
      items: [],
      _created: Date.now() as any
    };

    appendAuditLog(updatedStorage, 'Contêiner Criado', `Criado o contêiner "${name}" na data "${date}" sob a coleta "${category}".`);
    await registerLocalChange(updatedStorage);
    addNotification('success', 'Sucesso', `Contêiner "${name}" criado.`);
    return true;
  };

  const deleteContainer = async (category: string, date: string, name: string) => {
    const updatedStorage = { ...storage };
    if (updatedStorage[category]?.[date]?.[name]) {
      delete updatedStorage[category][date][name];
      appendAuditLog(updatedStorage, 'Contêiner Excluído', `O contêiner "${name}" (Data: ${date}) na coleta "${category}" foi apagado permanentemente.`);
      await registerLocalChange(updatedStorage);
      addNotification('success', 'Sucesso', `Contêiner "${name}" removido.`);
      return true;
    }
    addNotification('error', 'Erro', 'Falha ao remover contêiner.');
    playSound('error');
    return false;
  };

  const clearContainer = async (category: string, date: string, name: string) => {
    const updatedStorage = { ...storage };
    if (updatedStorage[category]?.[date]?.[name]) {
      updatedStorage[category][date][name].items = [];
      appendAuditLog(updatedStorage, 'Contêiner Limpo', `Esvaziado o contêiner "${name}" (Data: ${date}, Coleta: ${category}).`);
      await registerLocalChange(updatedStorage);
      addNotification('success', 'Sucesso', `Contêiner "${name}" limpo.`);
      return true;
    }
    addNotification('error', 'Erro', 'Falha ao limpar contêiner.');
    playSound('error');
    return false;
  };

  const finalizeContainer = async (category: string, date: string, name: string) => {
    const updatedStorage = { ...storage };
    if (updatedStorage[category]?.[date]?.[name]) {
      updatedStorage[category][date][name].finalized = true;
      appendAuditLog(updatedStorage, 'Lote Concluído', `O contêiner/lote "${name}" da coleta "${category}" foi finalizado.`);
      await registerLocalChange(updatedStorage);
      addNotification('success', 'Finalizado', `Contêiner "${name}" foi finalizado com sucesso.`);
      return true;
    }
    return false;
  };

  const archiveAllDuplicates = async () => {
    const updatedStorage = JSON.parse(JSON.stringify(storage)) as QRStorage;
    let archiveCount = 0;

    Object.entries(updatedStorage).forEach(([cat, days]) => {
      if (cat.startsWith('_')) return;
      Object.entries(days as any).forEach(([date, containers]) => {
        if (date.startsWith('_')) return;
        Object.entries(containers as any).forEach(([cont, data]: [string, any]) => {
          if (cont.startsWith('_')) return;
          if (data && data.items) {
            data.items.forEach((item: QRItem) => {
              if (item.duplicate && !item.archived) {
                item.archived = true;
                archiveCount++;
              }
            });
          }
        });
      });
    });

    if (archiveCount > 0) {
      appendAuditLog(updatedStorage, 'Duplicados Arquivados', `Arquivamento em massa executado com sucesso para ${archiveCount} códigos de barra duplicados.`);
      await registerLocalChange(updatedStorage);
      addNotification('success', 'Duplicados Arquivados', `${archiveCount} itens duplicados foram arquivados com sucesso.`);
      playSound('success');
      return true;
    } else {
      addNotification('info', 'Sem Duplicados', 'Não há itens duplicados ativos para arquivar.');
      playSound('error');
      return false;
    }
  };

  const restoreArchivedItem = async (category: string, date: string, container: string, qrText: string) => {
    const updatedStorage = { ...storage };
    if (updatedStorage[category]?.[date]?.[container]) {
      const items = updatedStorage[category][date][container].items || [];
      const updatedItems = items.map(item => {
        if (item.t === qrText && item.archived) {
          const cloned = { ...item };
          delete cloned.archived;
          return cloned;
        }
        return item;
      });
      updatedStorage[category][date][container].items = updatedItems;
      appendAuditLog(updatedStorage, 'Código Restaurado', `O item arquivado "${qrText}" foi reativado no contêiner "${container}" da coleta "${category}".`);
      await registerLocalChange(updatedStorage);
      addNotification('success', 'Sucesso', `Item "${qrText}" foi desarquivado.`);
      playSound('success');
      return true;
    }
    return false;
  };

  const importFullStorage = async (importedData: any): Promise<{ success: boolean; message: string }> => {
    try {
      if (!importedData || typeof importedData !== 'object') {
        return { success: false, message: 'Dados inválidos ou formato incorreto.' };
      }

      const updatedStorage = { ...importedData } as any;

      // Seed users if missing
      if (!updatedStorage._users || !Array.isArray(updatedStorage._users) || updatedStorage._users.length === 0) {
        updatedStorage._users = storage._users || [{
          email: 'barroso.login@gmail.com',
          passwordHash: 'e10adc3949ba59abbe56e057f20f883e',
          name: 'José Felipe A. Barroso'
        }];
      }

      appendAuditLog(updatedStorage, 'Importação de Backup', 'O banco de dados completo foi restaurado a partir de um backup JSON.');
      await registerLocalChange(updatedStorage);
      playSound('success');
      return { success: true, message: 'Banco de dados importado e sincronizado com sucesso.' };
    } catch (err: any) {
      console.error('Import process failed:', err);
      return { success: false, message: 'Erro ao processar o arquivo de importação.' };
    }
  };

  const addCustomAuditLog = async (action: string, description: string) => {
    const updatedStorage = { ...storage };
    appendAuditLog(updatedStorage, action, description);
    await registerLocalChange(updatedStorage);
    return true;
  };

  const updateUserRole = async (email: string, role: 'admin' | 'operador' | 'visualizador'): Promise<boolean> => {
    const updatedStorage = { ...storage };
    if (!updatedStorage._users) return false;
    const usersList = [...updatedStorage._users as any[]];
    const userIdx = usersList.findIndex((u: any) => u.email.toLowerCase() === email.trim().toLowerCase());
    if (userIdx === -1) return false;
    
    const oldRole = usersList[userIdx].role || 'operador';
    usersList[userIdx] = {
      ...usersList[userIdx],
      role
    };
    updatedStorage._users = usersList as any;
    
    appendAuditLog(updatedStorage, 'Privilégio Alterado', `Perfil de privilégio do usuário "${usersList[userIdx].name}" (${email}) alterado de "${oldRole}" para "${role}".`);
    await registerLocalChange(updatedStorage);
    addNotification('success', 'Privilégio Atualizado', `Usuário "${usersList[userIdx].name}" agora é "${role}".`);
    return true;
  };

  const deleteUser = async (email: string): Promise<boolean> => {
    const targetEmail = email.trim().toLowerCase();
    if (targetEmail === 'barroso.login@gmail.com') {
      addNotification('error', 'Operação Negada', 'Não é permitido excluir o usuário Administrador Master.');
      return false;
    }
    if (currentUser && currentUser.email.toLowerCase() === targetEmail) {
      addNotification('error', 'Operação Negada', 'Você não pode excluir seu próprio usuário ativo.');
      return false;
    }
    
    const updatedStorage = { ...storage };
    if (!updatedStorage._users) return false;
    const usersList = updatedStorage._users as any[];
    const matched = usersList.find((u: any) => u.email.toLowerCase() === targetEmail);
    if (!matched) return false;
    
    updatedStorage._users = usersList.filter((u: any) => u.email.toLowerCase() !== targetEmail) as any;
    appendAuditLog(updatedStorage, 'Usuário Removido', `O usuário "${matched.name}" (${targetEmail}) foi excluído do sistema.`);
    await registerLocalChange(updatedStorage);
    addNotification('success', 'Usuário Removido', `Usuário "${matched.name}" excluído com sucesso.`);
    return true;
  };

  const createUserByAdmin = async (
    name: string,
    email: string,
    passwordInput: string,
    role: 'admin' | 'operador' | 'visualizador'
  ): Promise<{ success: boolean; message: string }> => {
    const trimmedName = name.trim();
    const normalizedEmail = email.trim().toLowerCase();
    const trimmedPass = passwordInput.trim();
    
    if (!trimmedName || !normalizedEmail || !trimmedPass) {
      return { success: false, message: 'Todos os campos são obrigatórios.' };
    }
    
    const updatedStorage = { ...storage };
    if (!updatedStorage._users) updatedStorage._users = [] as any;
    const usersList = updatedStorage._users as any[];
    
    if (usersList.some((u: any) => u.email.toLowerCase() === normalizedEmail)) {
      return { success: false, message: 'Este e-mail de usuário já está cadastrado.' };
    }
    
    const newUser = {
      name: trimmedName,
      email: normalizedEmail,
      passwordHash: md5(trimmedPass),
      role
    };
    
    updatedStorage._users = [...usersList, newUser] as any;
    appendAuditLog(updatedStorage, 'Usuário Criado', `Usuário administrativo criado: "${trimmedName}" (${normalizedEmail}) com privilégio "${role}".`);
    await registerLocalChange(updatedStorage);
    
    return { success: true, message: 'Usuário criado com sucesso pelo Administrador.' };
  };

  const updateCredentialsWithMasterPassword = async (
    currentEmail: string,
    newName: string,
    newEmail: string,
    newPasswordInput: string,
    newRole: 'admin' | 'operador' | 'visualizador',
    masterPasswordInput: string
  ): Promise<{ success: boolean; message: string }> => {
    const trimmedMaster = masterPasswordInput.trim();
    if (md5(trimmedMaster) !== "485e59ace2c554f39af99abaa9fd03fa") {
      return { success: false, message: 'Senha Mestra de segurança inválida.' };
    }

    const trimmedName = newName.trim();
    const normalizedNewEmail = newEmail.trim().toLowerCase();
    const trimmedPass = newPasswordInput.trim();

    if (!trimmedName || !normalizedNewEmail) {
      return { success: false, message: 'Nome e e-mail são obrigatórios.' };
    }

    const updatedStorage = { ...storage };
    if (!updatedStorage._users) updatedStorage._users = [] as any;
    const usersList = [...updatedStorage._users as any[]];

    const userIdx = usersList.findIndex((u: any) => u.email.toLowerCase() === currentEmail.trim().toLowerCase());
    if (userIdx === -1) {
      return { success: false, message: 'Usuário logado não encontrado no banco de dados.' };
    }

    if (normalizedNewEmail !== currentEmail.toLowerCase() && usersList.some((u: any) => u.email.toLowerCase() === normalizedNewEmail)) {
      return { success: false, message: 'Este novo e-mail já está em uso por outro usuário.' };
    }

    const oldUser = usersList[userIdx];
    const updatedUser = {
      ...oldUser,
      name: trimmedName,
      email: normalizedNewEmail,
      role: newRole,
      ...(trimmedPass ? { passwordHash: md5(trimmedPass) } : {})
    };

    usersList[userIdx] = updatedUser;
    updatedStorage._users = usersList as any;

    appendAuditLog(updatedStorage, 'Credencial Alterada (Mestra)', `Credenciais do usuário "${oldUser.name}" (${currentEmail}) alteradas via senha mestra. Novo Nome: "${trimmedName}", Novo Email: "${normalizedNewEmail}", Novo Perfil: "${newRole}".`);
    await registerLocalChange(updatedStorage);

    if (currentUser && currentUser.email.toLowerCase() === currentEmail.toLowerCase()) {
      const updatedSessionUser = {
        name: trimmedName,
        email: normalizedNewEmail,
        role: newRole
      };
      setCurrentUser(updatedSessionUser);
      localStorage.setItem('qr_current_user', JSON.stringify(updatedSessionUser));
    }

    return { success: true, message: 'Credenciais atualizadas com sucesso usando a Senha Mestra.' };
  };

  return {
    storage,
    loading,
    notifications,
    addNotification,
    clearNotifications,
    updateItems,
    createCategory,
    deleteCategory,
    renameCategory,
    updateCategoryColor,
    createContainer,
    deleteContainer,
    clearContainer,
    finalizeContainer,
    archiveAllDuplicates,
    restoreArchivedItem,
    reattributeOrphans,
    deleteOrphansPermanently,
    importFullStorage,
    addCustomAuditLog,
    
    // Auth helpers
    currentUser,
    login,
    logout,
    registerUser,
    updateUserRole,
    deleteUser,
    createUserByAdmin,
    updateCredentialsWithMasterPassword,
    
    // Exposed Sync engine values
    countdown,
    syncInterval,
    isSyncing,
    lastSyncTime,
    presets,
    syncNow,
    setCustomSyncInterval,
    addPreset,
    dbHealth,
    fetchDbHealth
  };
}
