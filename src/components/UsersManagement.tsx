import React, { useState, useMemo } from 'react';
import { 
  Users, 
  User, 
  Shield, 
  ShieldAlert, 
  ShieldCheck, 
  Trash2, 
  Plus, 
  Search, 
  Lock, 
  Mail, 
  UserPlus, 
  Info, 
  X, 
  Check,
  AlertCircle,
  Settings,
  KeyRound,
  Fingerprint
} from 'lucide-react';
import { QRStorage } from '../types';

interface UsersManagementProps {
  storage: QRStorage;
  currentUser: { name: string; email: string; role?: string } | null;
  updateUserRole: (email: string, role: 'admin' | 'operador' | 'visualizador') => Promise<boolean>;
  deleteUser: (email: string) => Promise<boolean>;
  createUserByAdmin: (name: string, email: string, passwordInput: string, role: 'admin' | 'operador' | 'visualizador') => Promise<{ success: boolean; message: string }>;
  updateCredentialsWithMasterPassword: (currentEmail: string, newName: string, newEmail: string, newPasswordInput: string, newRole: 'admin' | 'operador' | 'visualizador', masterPasswordInput: string) => Promise<{ success: boolean; message: string }>;
  addNotification: (type: 'success' | 'error' | 'info' | 'warning', title: string, message: string) => void;
}

export function UsersManagement({ 
  storage, 
  currentUser, 
  updateUserRole, 
  deleteUser, 
  createUserByAdmin,
  updateCredentialsWithMasterPassword,
  addNotification 
}: UsersManagementProps) {
  
  // Local states
  const [searchTerm, setSearchTerm] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedUserForRoleChange, setSelectedUserForRoleChange] = useState<string | null>(null);

  // Form states
  const [newUserName, setNewUserName] = useState('');
  const [newUserEmail, setNewUserEmail] = useState('');
  const [newUserPassword, setNewUserPassword] = useState('');
  const [newUserRole, setNewUserRole] = useState<'admin' | 'operador' | 'visualizador'>('operador');
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Edit Credentials states (for non-admin elevation via Master Password)
  const [editName, setEditName] = useState(currentUser?.name || '');
  const [editEmail, setEditEmail] = useState(currentUser?.email || '');
  const [editPassword, setEditPassword] = useState('');
  const [editRole, setEditRole] = useState<'admin' | 'operador' | 'visualizador'>(
    (currentUser?.role as 'admin' | 'operador' | 'visualizador') || 'operador'
  );
  const [masterPassword, setMasterPassword] = useState('');
  const [isUpdatingCreds, setIsUpdatingCreds] = useState(false);
  const [updateCredsError, setUpdateCredsError] = useState<string | null>(null);

  React.useEffect(() => {
    if (currentUser) {
      setEditName(currentUser.name);
      setEditEmail(currentUser.email);
      setEditRole((currentUser.role as 'admin' | 'operador' | 'visualizador') || 'operador');
    }
  }, [currentUser]);

  const handleUpdateCredsWithMaster = async (e: React.FormEvent) => {
    e.preventDefault();
    setUpdateCredsError(null);

    if (!currentUser) return;

    if (!editName.trim() || !editEmail.trim() || !masterPassword.trim()) {
      setUpdateCredsError('Nome, E-mail e Senha Mestra são obrigatórios.');
      return;
    }

    setIsUpdatingCreds(true);
    try {
      const result = await updateCredentialsWithMasterPassword(
        currentUser.email,
        editName,
        editEmail,
        editPassword,
        editRole,
        masterPassword
      );

      if (result.success) {
        addNotification('success', 'Credenciais Atualizadas', result.message);
        setEditPassword('');
        setMasterPassword('');
      } else {
        setUpdateCredsError(result.message);
      }
    } catch (err) {
      setUpdateCredsError('Ocorreu um erro ao atualizar credenciais.');
    } finally {
      setIsUpdatingCreds(false);
    }
  };

  // Fetch users list from storage
  const usersList = useMemo(() => {
    return (storage._users as unknown as any[]) || [];
  }, [storage]);

  // Find active user's role in database or fallback
  const activeUserInDb = useMemo(() => {
    if (!currentUser) return null;
    return usersList.find(u => u.email.toLowerCase() === currentUser.email.toLowerCase()) || {
      name: currentUser.name,
      email: currentUser.email,
      role: currentUser.role || (currentUser.email === 'barroso.login@gmail.com' ? 'admin' : 'operador')
    };
  }, [usersList, currentUser]);

  const activeUserRole = activeUserInDb?.role || 'operador';
  const isAdmin = activeUserRole === 'admin';

  // Filter users
  const filteredUsers = useMemo(() => {
    if (!searchTerm) return usersList;
    const term = searchTerm.toLowerCase();
    return usersList.filter(user => 
      user.name.toLowerCase().includes(term) || 
      user.email.toLowerCase().includes(term) ||
      (user.role || 'operador').toLowerCase().includes(term)
    );
  }, [usersList, searchTerm]);

  // Handle form submission for creating a new user
  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!newUserName.trim() || !newUserEmail.trim() || !newUserPassword.trim()) {
      setFormError('Todos os campos são obrigatórios.');
      return;
    }

    setIsSubmitting(true);
    try {
      const result = await createUserByAdmin(
        newUserName.trim(),
        newUserEmail.trim().toLowerCase(),
        newUserPassword.trim(),
        newUserRole
      );

      if (result.success) {
        addNotification('success', 'Usuário Criado', `Usuário ${newUserName} foi cadastrado como ${newUserRole}.`);
        // Reset form
        setNewUserName('');
        setNewUserEmail('');
        setNewUserPassword('');
        setNewUserRole('operador');
        setShowAddModal(false);
      } else {
        setFormError(result.message);
      }
    } catch (err) {
      setFormError('Ocorreu um erro ao criar o usuário.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle privilege updates
  const handleRoleChange = async (email: string, role: 'admin' | 'operador' | 'visualizador') => {
    if (!isAdmin) {
      addNotification('error', 'Acesso Negado', 'Apenas Administradores podem gerenciar privilégios.');
      return;
    }
    
    if (email.toLowerCase() === 'barroso.login@gmail.com') {
      addNotification('error', 'Acesso Negado', 'Não é permitido alterar os privilégios do Administrador Master.');
      return;
    }

    try {
      const success = await updateUserRole(email, role);
      if (success) {
        setSelectedUserForRoleChange(null);
      } else {
        addNotification('error', 'Falha', 'Não foi possível alterar a função do usuário.');
      }
    } catch (err) {
      addNotification('error', 'Erro', 'Erro ao processar alteração de privilégio.');
    }
  };

  // Handle user deletion
  const handleDeleteUser = async (email: string) => {
    if (!isAdmin) {
      addNotification('error', 'Acesso Negado', 'Apenas Administradores podem excluir usuários.');
      return;
    }

    if (window.confirm(`Tem certeza que deseja remover permanentemente o usuário ${email}? Esta ação registrará um log de auditoria.`)) {
      try {
        const success = await deleteUser(email);
        if (!success) {
          addNotification('error', 'Erro', 'Não foi possível excluir o usuário.');
        }
      } catch (err) {
        addNotification('error', 'Erro', 'Erro ao excluir usuário.');
      }
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-500 w-full max-w-7xl mx-auto py-4 px-2">
      
      {/* Header Info */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-black tracking-tight text-slate-800 dark:text-slate-100 flex items-center gap-2">
            <Users className="text-blue-500 shrink-0" size={26} />
            Gestão de Usuários &amp; Privilégios
          </h2>
          <p className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest mt-1">
            Controle de Perfis de Acesso (RBAC) e Auditoria de Segurança Interna
          </p>
        </div>

        {isAdmin && (
          <button
            onClick={() => {
              setFormError(null);
              setShowAddModal(true);
            }}
            className="px-4 py-2 text-xs font-black bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-all shadow-md flex items-center gap-2"
          >
            <UserPlus size={14} />
            CADASTRAR NOVO USUÁRIO
          </button>
        )}
      </div>

      {/* Profile Overview Banner */}
      <div className="bg-slate-900 text-white rounded-3xl p-6 border border-slate-800 shadow-xl relative overflow-hidden flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-blue-900/10 via-slate-900 to-slate-950 pointer-events-none z-0" />
        
        <div className="z-10 flex items-center gap-4">
          <div className="p-3 bg-blue-950/60 border border-blue-500/30 text-blue-400 rounded-2xl shadow-inner">
            <Fingerprint size={32} className="animate-pulse" />
          </div>
          <div>
            <span className="text-[9px] font-black uppercase tracking-widest text-slate-400 block">Sessão Autenticada</span>
            <h3 className="text-base font-black tracking-tight text-white">{currentUser?.name}</h3>
            <p className="text-xs text-slate-400 font-mono font-medium">{currentUser?.email}</p>
          </div>
        </div>

        <div className="z-10 flex flex-wrap gap-3">
          <div className="bg-slate-800/80 border border-slate-700/60 p-3 rounded-2xl flex items-center gap-3">
            <div className="p-1.5 bg-blue-500/10 border border-blue-500/20 text-blue-400 rounded-lg">
              <Shield size={16} />
            </div>
            <div>
              <span className="text-[8px] font-black text-slate-500 uppercase block leading-none">Perfil de Acesso</span>
              <span className="text-xs font-black text-blue-400 uppercase tracking-wider block mt-1">
                {activeUserRole === 'admin' && 'Administrador'}
                {activeUserRole === 'operador' && 'Operador'}
                {activeUserRole === 'visualizador' && 'Visualizador'}
              </span>
            </div>
          </div>

          <div className="bg-slate-800/80 border border-slate-700/60 p-3 rounded-2xl flex items-center gap-3">
            <div className="p-1.5 bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 rounded-lg">
              <KeyRound size={16} />
            </div>
            <div>
              <span className="text-[8px] font-black text-slate-500 uppercase block leading-none">Status de Permissão</span>
              <span className="text-xs font-black text-indigo-400 uppercase tracking-wider block mt-1">
                {isAdmin ? 'Acesso Master' : 'Permissões Limitadas'}
              </span>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Users List & Actions */}
        <div className="lg:col-span-2 space-y-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-xs">
            
            {/* Search Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 dark:border-slate-800 pb-4 mb-4">
              <div className="relative flex-1">
                <input
                  type="text"
                  placeholder="Buscar usuários por nome, email ou perfil..."
                  value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 bg-slate-50 dark:bg-slate-850 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-medium text-slate-800 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
                />
                <Search size={14} className="absolute left-3 top-2.5 text-slate-400" />
              </div>

              <div className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-wider shrink-0">
                Mostrando {filteredUsers.length} de {usersList.length} usuários
              </div>
            </div>

            {/* List */}
            <div className="divide-y divide-slate-100 dark:divide-slate-800">
              {filteredUsers.map((user) => {
                const isMasterUser = user.email.toLowerCase() === 'barroso.login@gmail.com';
                const isSelf = currentUser && user.email.toLowerCase() === currentUser.email.toLowerCase();
                const uRole = user.role || 'operador';

                return (
                  <div key={user.email} className="py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 first:pt-0 last:pb-0">
                    <div className="flex items-start gap-3">
                      <div className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center justify-center shrink-0">
                        <User size={18} className="text-slate-500 dark:text-slate-400" />
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h4 className="text-xs font-black text-slate-800 dark:text-slate-100 truncate max-w-[150px] sm:max-w-xs">{user.name}</h4>
                          {isSelf && (
                            <span className="text-[8px] font-black bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-800 px-1.5 py-0.5 rounded uppercase tracking-wider">
                              Você
                            </span>
                          )}
                          {isMasterUser && (
                            <span className="text-[8px] font-black bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-800 px-1.5 py-0.5 rounded uppercase tracking-wider">
                              Criador/Master
                            </span>
                          )}
                        </div>
                        <p className="text-[10px] font-mono text-slate-400 dark:text-slate-500 mt-0.5 truncate">{user.email}</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 self-end sm:self-center shrink-0">
                      
                      {/* Role Badge & Role Changer dropdown */}
                      {selectedUserForRoleChange === user.email && !isMasterUser && isAdmin ? (
                        <div className="flex items-center gap-1">
                          <select
                            defaultValue={uRole}
                            onChange={(e) => handleRoleChange(user.email, e.target.value as any)}
                            className="bg-slate-50 dark:bg-slate-850 border border-slate-200 dark:border-slate-700 rounded-lg text-[10px] font-bold text-slate-800 dark:text-slate-200 px-2.5 py-1.5 outline-none focus:ring-1 focus:ring-blue-500"
                          >
                            <option value="admin">Administrador</option>
                            <option value="operador">Operador</option>
                            <option value="visualizador">Visualizador</option>
                          </select>
                          <button
                            onClick={() => setSelectedUserForRoleChange(null)}
                            className="p-1 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-400 rounded-lg"
                            title="Cancelar"
                          >
                            <X size={12} />
                          </button>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2">
                          {uRole === 'admin' && (
                            <span className="text-[9px] font-black bg-rose-50 dark:bg-rose-950/20 text-rose-600 dark:text-rose-400 border border-rose-200 dark:border-rose-900/40 px-2 py-1 rounded-lg flex items-center gap-1">
                              <ShieldAlert size={10} />
                              ADMINISTRADOR
                            </span>
                          )}
                          {uRole === 'operador' && (
                            <span className="text-[9px] font-black bg-blue-50 dark:bg-blue-950/20 text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-900/40 px-2 py-1 rounded-lg flex items-center gap-1">
                              <ShieldCheck size={10} />
                              OPERADOR
                            </span>
                          )}
                          {uRole === 'visualizador' && (
                            <span className="text-[9px] font-black bg-slate-150 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700 px-2 py-1 rounded-lg flex items-center gap-1">
                              <Shield size={10} />
                              VISUALIZADOR
                            </span>
                          )}

                          {isAdmin && !isMasterUser && (
                            <button
                              onClick={() => setSelectedUserForRoleChange(user.email)}
                              className="p-1 text-[9px] font-black text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition"
                              title="Alterar Função"
                            >
                              ALTERAR
                            </button>
                          )}
                        </div>
                      )}

                      {/* Delete Action */}
                      {isAdmin && !isMasterUser && !isSelf && (
                        <button
                          onClick={() => handleDeleteUser(user.email)}
                          className="p-1.5 border border-slate-200 dark:border-slate-700 hover:bg-red-50 dark:hover:bg-red-950/20 text-slate-400 hover:text-red-500 rounded-lg transition"
                          title="Remover Usuário"
                        >
                          <Trash2 size={13} />
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}

              {filteredUsers.length === 0 && (
                <div className="py-12 text-center text-slate-400 font-bold text-xs uppercase tracking-wider">
                  Nenhum usuário localizado.
                </div>
              )}
            </div>

          </div>
        </div>

        {/* Privileges Matrix & Security Rules */}
        <div className="space-y-4">
          {!isAdmin && (
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-xs space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-300">
              <div className="flex items-center gap-2 pb-2 border-b border-slate-100 dark:border-slate-800">
                <KeyRound size={18} className="text-amber-500" />
                <div>
                  <h3 className="text-xs font-black uppercase tracking-wider text-slate-850 dark:text-slate-200">
                    Alterar Minhas Credenciais (Senha Mestra)
                  </h3>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">
                    Modifique seu perfil ou eleve seu acesso
                  </p>
                </div>
              </div>

              <form onSubmit={handleUpdateCredsWithMaster} className="space-y-3.5 text-xs">
                {updateCredsError && (
                  <div className="p-3 bg-red-50 dark:bg-red-950/20 text-red-600 dark:text-red-400 rounded-xl font-bold flex items-center gap-1.5 leading-tight">
                    <AlertCircle size={14} className="shrink-0" />
                    <span>{updateCredsError}</span>
                  </div>
                )}

                {/* Novo Nome */}
                <div>
                  <label className="block text-[10px] font-black uppercase text-slate-400 mb-1">
                    Nome Completo
                  </label>
                  <input
                    type="text"
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    placeholder="Seu Nome"
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-850 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                {/* Novo Email */}
                <div>
                  <label className="block text-[10px] font-black uppercase text-slate-400 mb-1">
                    E-mail de Acesso
                  </label>
                  <input
                    type="email"
                    value={editEmail}
                    onChange={(e) => setEditEmail(e.target.value)}
                    placeholder="seu@email.com"
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-850 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                {/* Nova Senha */}
                <div>
                  <label className="block text-[10px] font-black uppercase text-slate-400 mb-1">
                    Nova Senha (deixe em branco para não alterar)
                  </label>
                  <input
                    type="password"
                    value={editPassword}
                    onChange={(e) => setEditPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-850 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                {/* Novo Cargo / Perfil */}
                <div>
                  <label className="block text-[10px] font-black uppercase text-slate-400 mb-1">
                    Perfil de Acesso Solicitado
                  </label>
                  <select
                    value={editRole}
                    onChange={(e) => setEditRole(e.target.value as any)}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-850 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-850 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500 font-bold"
                  >
                    <option value="admin">Administrador (Total)</option>
                    <option value="operador">Operador (Leitura &amp; Escrita)</option>
                    <option value="visualizador">Visualizador (Somente Leitura)</option>
                  </select>
                </div>

                {/* Senha Mestra */}
                <div className="p-3 bg-amber-500/5 border border-amber-500/20 rounded-2xl space-y-2">
                  <label className="block text-[10px] font-black uppercase text-amber-600 dark:text-amber-400">
                    Senha Mestra do Sistema (Chave de Segurança)
                  </label>
                  <input
                    type="password"
                    value={masterPassword}
                    onChange={(e) => setMasterPassword(e.target.value)}
                    placeholder="Insira a Senha Mestra"
                    className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-amber-500/30 rounded-xl text-slate-850 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-amber-500"
                  />
                </div>

                <button
                  type="submit"
                  disabled={isUpdatingCreds}
                  className="w-full py-2.5 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white rounded-xl font-black text-xs uppercase tracking-widest cursor-pointer disabled:opacity-50 transition active:scale-95"
                >
                  {isUpdatingCreds ? 'ATUALIZANDO...' : 'APLICAR ALTERAÇÕES'}
                </button>
              </form>
            </div>
          )}

          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-xs">
            <h3 className="text-xs font-black uppercase tracking-wider text-slate-850 dark:text-slate-200 mb-4 flex items-center gap-1.5">
              <Settings size={14} className="text-slate-500" />
              Matriz de Privilégios &amp; Controle
            </h3>

            <div className="space-y-4 text-xs">
              
              {/* Card Admin */}
              <div className="p-3 bg-rose-50/45 dark:bg-rose-950/5 border border-rose-100 dark:border-rose-950/30 rounded-2xl">
                <div className="flex items-center gap-1.5 text-rose-600 dark:text-rose-400 font-black mb-1">
                  <ShieldAlert size={12} />
                  <span className="uppercase tracking-widest text-[10px]">Administrador (Admin)</span>
                </div>
                <p className="text-[10px] text-slate-500 dark:text-slate-400 leading-normal font-semibold">
                  Acesso completo e irrestrito. Pode criar/deletar coletas, gerenciar usuários, alterar perfis e modificar configurações de sincronização do sistema.
                </p>
                <div className="flex flex-wrap gap-1 mt-2.5">
                  <span className="text-[8px] bg-rose-100/50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 px-1.5 py-0.5 rounded font-black uppercase">Faturamento NF-e</span>
                  <span className="text-[8px] bg-rose-100/50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 px-1.5 py-0.5 rounded font-black uppercase">Gerir Usuários</span>
                  <span className="text-[8px] bg-rose-100/50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 px-1.5 py-0.5 rounded font-black uppercase">Remover Coletas</span>
                </div>
              </div>

              {/* Card Operator */}
              <div className="p-3 bg-blue-50/45 dark:bg-blue-950/5 border border-blue-100 dark:border-blue-950/30 rounded-2xl">
                <div className="flex items-center gap-1.5 text-blue-600 dark:text-blue-400 font-black mb-1">
                  <ShieldCheck size={12} />
                  <span className="uppercase tracking-widest text-[10px]">Operador (Operator)</span>
                </div>
                <p className="text-[10px] text-slate-500 dark:text-slate-400 leading-normal font-semibold">
                  Perfil de chão de fábrica. Pode registrar e gerenciar contêineres, realizar bips/escanear códigos de barras e visualizar painéis. Bloqueado de excluir coletas de forma definitiva ou cadastrar novos operadores.
                </p>
                <div className="flex flex-wrap gap-1 mt-2.5">
                  <span className="text-[8px] bg-blue-100/50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 px-1.5 py-0.5 rounded font-black uppercase">Bipar Códigos</span>
                  <span className="text-[8px] bg-blue-100/50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 px-1.5 py-0.5 rounded font-black uppercase">Gerar PDFs</span>
                  <span className="text-[8px] bg-blue-100/50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 px-1.5 py-0.5 rounded font-black uppercase">Criar Contêiner</span>
                </div>
              </div>

              {/* Card Auditor */}
              <div className="p-3 bg-slate-100 dark:bg-slate-850/40 border border-slate-200 dark:border-slate-850/60 rounded-2xl">
                <div className="flex items-center gap-1.5 text-slate-600 dark:text-slate-400 font-black mb-1">
                  <Shield size={12} />
                  <span className="uppercase tracking-widest text-[10px]">Visualizador (Auditor/Guest)</span>
                </div>
                <p className="text-[10px] text-slate-500 dark:text-slate-400 leading-normal font-semibold">
                  Acesso somente leitura. Indicado para auditoria fiscal ou supervisão externa. Pode analisar o Hub NF-e, baixar relatórios e acompanhar gráficos, mas não possui permissão para bipar ou salvar registros locais.
                </p>
                <div className="flex flex-wrap gap-1 mt-2.5">
                  <span className="text-[8px] bg-slate-200 dark:bg-slate-800 text-slate-650 dark:text-slate-400 px-1.5 py-0.5 rounded font-black uppercase">Gráficos Analíticos</span>
                  <span className="text-[8px] bg-slate-200 dark:bg-slate-800 text-slate-650 dark:text-slate-400 px-1.5 py-0.5 rounded font-black uppercase">Exportar Planilha</span>
                  <span className="text-[8px] bg-slate-200 dark:bg-slate-800 text-slate-650 dark:text-slate-400 px-1.5 py-0.5 rounded font-black uppercase">Ver Auditorias</span>
                </div>
              </div>

            </div>
          </div>
        </div>

      </div>

      {/* Add User Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in duration-250">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl w-full max-w-[430px] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300">
            
            {/* Header */}
            <div className="bg-gradient-to-r from-blue-600 to-indigo-600 h-1.5 w-full" />
            <div className="p-6 pb-4 flex items-center justify-between border-b border-slate-100 dark:border-slate-800">
              <h3 className="text-sm font-black uppercase tracking-wider text-slate-800 dark:text-slate-100 flex items-center gap-2">
                <UserPlus size={16} className="text-blue-500" />
                Cadastrar Novo Usuário
              </h3>
              <button
                onClick={() => setShowAddModal(false)}
                className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-850 rounded-xl transition"
              >
                <X size={16} />
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleCreateUser} className="p-6 space-y-4">
              
              {formError && (
                <div className="p-3.5 bg-red-50 dark:bg-red-950/20 border border-red-100 dark:border-red-900/30 rounded-xl flex items-start gap-2 text-[11px] font-bold text-red-600 dark:text-red-400 leading-normal animate-fadeIn">
                  <AlertCircle size={14} className="shrink-0 mt-0.5" />
                  <span>{formError}</span>
                </div>
              )}

              {/* Name */}
              <div className="space-y-1">
                <label className="text-[10px] font-extrabold text-slate-400 dark:text-slate-500 uppercase tracking-widest pl-0.5">Nome Completo</label>
                <input
                  type="text"
                  required
                  placeholder="ex: João Silva"
                  value={newUserName}
                  onChange={e => setNewUserName(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-850 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-800 dark:text-slate-150 focus:ring-2 focus:ring-blue-500 focus:outline-none focus:bg-white dark:focus:bg-slate-900 transition"
                />
              </div>

              {/* Email */}
              <div className="space-y-1">
                <label className="text-[10px] font-extrabold text-slate-400 dark:text-slate-500 uppercase tracking-widest pl-0.5">E-mail de Login</label>
                <input
                  type="email"
                  required
                  placeholder="ex: joao@empresa.com"
                  value={newUserEmail}
                  onChange={e => setNewUserEmail(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-850 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-800 dark:text-slate-150 focus:ring-2 focus:ring-blue-500 focus:outline-none focus:bg-white dark:focus:bg-slate-900 transition"
                />
              </div>

              {/* Password */}
              <div className="space-y-1">
                <label className="text-[10px] font-extrabold text-slate-400 dark:text-slate-500 uppercase tracking-widest pl-0.5">Senha Provisória</label>
                <input
                  type="password"
                  required
                  placeholder="Defina uma senha provisória"
                  value={newUserPassword}
                  onChange={e => setNewUserPassword(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-850 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-800 dark:text-slate-150 focus:ring-2 focus:ring-blue-500 focus:outline-none focus:bg-white dark:focus:bg-slate-900 transition"
                />
              </div>

              {/* Role Selector */}
              <div className="space-y-1">
                <label className="text-[10px] font-extrabold text-slate-400 dark:text-slate-500 uppercase tracking-widest pl-0.5">Nível de Privilégio</label>
                <select
                  value={newUserRole}
                  onChange={e => setNewUserRole(e.target.value as any)}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-850 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-750 dark:text-slate-200 focus:ring-2 focus:ring-blue-500 focus:outline-none focus:bg-white dark:focus:bg-slate-900 transition"
                >
                  <option value="operador">Operador (Acesso Padrão)</option>
                  <option value="admin">Administrador (Controle Total)</option>
                  <option value="visualizador">Visualizador (Somente Leitura)</option>
                </select>
              </div>

              {/* Footer Buttons */}
              <div className="flex gap-2.5 pt-3 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="flex-1 py-2.5 text-xs font-black border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-350 hover:bg-slate-50 dark:hover:bg-slate-850 rounded-xl transition"
                >
                  CANCELAR
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex-1 py-2.5 text-xs font-black bg-blue-600 text-white hover:bg-blue-700 rounded-xl transition shadow-md disabled:bg-slate-200 dark:disabled:bg-slate-800 disabled:text-slate-400"
                >
                  {isSubmitting ? 'CADASTRANDO...' : 'CADASTRAR'}
                </button>
              </div>

            </form>

          </div>
        </div>
      )}

    </div>
  );
}
