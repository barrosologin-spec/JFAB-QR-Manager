/**
 * Desenvolvido por José Felipe A. Barroso (pixdobarroso@gmail.com)
 */

import React, { useState } from 'react';
import { 
  KeyRound, 
  Mail, 
  Lock, 
  User, 
  Eye, 
  EyeOff, 
  ShieldCheck, 
  Sparkles,
  AlertCircle,
  Database,
  ArrowRight,
  UserPlus
} from 'lucide-react';
import { cn } from '../lib/utils';

interface LoginScreenProps {
  login: (email: string, pass: string) => Promise<{ success: boolean; message: string }>;
  registerUser: (name: string, email: string, pass: string, masterPass: string) => Promise<{ success: boolean; message: string }>;
}

export const LoginScreen: React.FC<LoginScreenProps> = ({ login, registerUser }) => {
  const [activeTab, setActiveTab] = useState<'login' | 'register'>('login');
  
  // Login Form States
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [showLoginPass, setShowLoginPass] = useState(false);
  
  // Register Form States
  const [regName, setRegName] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [regConfirmPassword, setRegConfirmPassword] = useState('');
  const [regMasterPassword, setRegMasterPassword] = useState('');
  const [showRegPass, setShowRegPass] = useState(false);
  const [showRegMasterPass, setShowRegMasterPass] = useState(false);
  
  // Status feedback states
  const [message, setMessage] = useState<{ type: 'error' | 'success'; text: string } | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const displayMessage = (type: 'error' | 'success', text: string) => {
    setMessage({ type, text });
    setTimeout(() => {
      setMessage(null);
    }, 6000);
  };

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!loginEmail || !loginPassword) {
      displayMessage('error', 'Por favor, preencha todos os campos.');
      return;
    }
    
    setIsSubmitting(true);
    setMessage(null);
    
    try {
      const res = await login(loginEmail, loginPassword);
      if (!res.success) {
        displayMessage('error', res.message);
      }
    } catch (err) {
      displayMessage('error', 'Ocorreu um erro ao processar o login.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!regName || !regEmail || !regPassword || !regConfirmPassword || !regMasterPassword) {
      displayMessage('error', 'Por favor, preencha todos os campos do formulário.');
      return;
    }
    
    if (regPassword !== regConfirmPassword) {
      displayMessage('error', 'As senhas fornecidas não coincidem.');
      return;
    }
    
    setIsSubmitting(true);
    setMessage(null);
    
    try {
      const res = await registerUser(regName, regEmail, regPassword, regMasterPassword);
      if (res.success) {
        displayMessage('success', 'Usuário criado com sucesso! Faça login abaixo.');
        // reset fields
        setRegName('');
        setRegEmail('');
        setRegPassword('');
        setRegConfirmPassword('');
        setRegMasterPassword('');
        // Switch tab
        setActiveTab('login');
      } else {
        displayMessage('error', res.message);
      }
    } catch (err) {
      displayMessage('error', 'Falha ao finalizar o cadastro.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 flex flex-col justify-center items-center p-4 relative overflow-hidden font-sans select-none selection:bg-blue-500/30">
      
      {/* Decorative Grid and Ambient Lights */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-blue-900/20 via-slate-900 to-slate-950 pointer-events-none z-0" />
      <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] rounded-full bg-blue-500/5 blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] rounded-full bg-indigo-500/5 blur-[120px] pointer-events-none" />

      {/* Main Container */}
      <div className="w-full max-w-[465px] bg-slate-850/80 backdrop-blur-xl border border-slate-800 rounded-3xl shadow-2xl overflow-hidden z-10 transition-all">
        
        {/* Header Indicator */}
        <div className="bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-500 h-1.5 w-full" />
        
        {/* Content body */}
        <div className="p-8 space-y-6">
          
          {/* Brand/Hero section */}
          <div className="text-center space-y-2">
            <div className="inline-flex items-center justify-center p-3 bg-blue-950/50 border border-blue-550/20 text-blue-400 rounded-2xl mb-1 shadow-inner">
              <ShieldCheck size={28} className="stroke-[2.2]" />
            </div>
            <h1 className="text-xl font-black text-white uppercase tracking-tight flex items-center justify-center gap-2">
              <span>Coleta Segura</span>
              <span className="text-[10px] bg-blue-500/10 border border-blue-500/20 text-blue-400 font-extrabold px-1.5 py-0.5 rounded-md uppercase tracking-widest">
                MD5
              </span>
            </h1>
            <p className="text-xs text-slate-400 font-medium max-w-xs mx-auto">
              Controle de bips industrial com validação de auditoria criptográfica e controle de acesso
            </p>
          </div>

          {/* Tab Selector Buttons */}
          <div className="flex bg-slate-900/80 border border-slate-800 p-1 rounded-2xl">
            <button
              onClick={() => {
                setActiveTab('login');
                setMessage(null);
              }}
              className={cn(
                "flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-xs font-black uppercase tracking-wider transition-all cursor-pointer",
                activeTab === 'login'
                  ? "bg-slate-800 text-blue-400 shadow-md border border-slate-700/60"
                  : "text-slate-500 hover:text-slate-350"
              )}
            >
              <KeyRound size={14} />
              <span>Acessar</span>
            </button>
            <button
              onClick={() => {
                setActiveTab('register');
                setMessage(null);
              }}
              className={cn(
                "flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-xs font-black uppercase tracking-wider transition-all cursor-pointer",
                activeTab === 'register'
                  ? "bg-slate-800 text-blue-400 shadow-md border border-slate-700/60"
                  : "text-slate-500 hover:text-slate-350"
              )}
            >
              <UserPlus size={14} />
              <span>Novo Usuário</span>
            </button>
          </div>

          {/* Feedback message layout */}
          {message && (
            <div className={cn(
              "p-4 rounded-xl border flex items-start gap-2.5 text-xs font-bold leading-normal animate-fadeIn",
              message.type === 'error'
                ? "bg-red-950/20 border-red-900/30 text-red-400"
                : "bg-emerald-950/20 border-emerald-900/30 text-emerald-400"
            )}>
              <AlertCircle size={16} className="shrink-0 mt-0.5" />
              <span>{message.text}</span>
            </div>
          )}

          {/* TAB 1: LOGIN FORM */}
          {activeTab === 'login' && (
            <form onSubmit={handleLoginSubmit} className="space-y-4">
              
              {/* Email */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest block pl-1">E-mail Corporativo</label>
                <div className="relative">
                  <span className="absolute left-3.5 top-3.5 text-slate-500">
                    <Mail size={16} />
                  </span>
                  <input
                    type="email"
                    required
                    value={loginEmail}
                    onChange={(e) => setLoginEmail(e.target.value)}
                    placeholder="ex: jose@barroso.com"
                    className="w-full bg-slate-900/80 border border-slate-800 rounded-xl pl-11 pr-4 py-3.5 text-xs font-bold text-slate-100 outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-slate-700 transition"
                  />
                </div>
              </div>

              {/* Password */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest block pl-1">Senha de Acesso</label>
                <div className="relative">
                  <span className="absolute left-3.5 top-3.5 text-slate-500">
                    <Lock size={16} />
                  </span>
                  <input
                    type={showLoginPass ? 'text' : 'password'}
                    required
                    value={loginPassword}
                    onChange={(e) => setLoginPassword(e.target.value)}
                    placeholder="Insira sua senha"
                    className="w-full bg-slate-900/80 border border-slate-800 rounded-xl pl-11 pr-10 py-3.5 text-xs font-bold text-slate-100 outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-slate-700 transition"
                  />
                  <button
                    type="button"
                    onClick={() => setShowLoginPass(!showLoginPass)}
                    className="absolute right-3 top-3.5 text-slate-500 hover:text-slate-300 transition"
                  >
                    {showLoginPass ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              {/* Submit button */}
              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full bg-blue-600 hover:bg-blue-550 disabled:bg-slate-800 disabled:text-slate-500 cursor-pointer text-white font-black text-xs py-4 rounded-xl uppercase tracking-widest shadow-lg flex items-center justify-center gap-1.5 transition active:scale-98"
              >
                <span>Entrar no Sistema</span>
                <ArrowRight size={13} className="stroke-[3.5]" />
              </button>

              {/* Quick credentials Helper card */}
              <div className="bg-slate-900/50 border border-dashed border-slate-800 rounded-2xl p-4 space-y-1.5">
                <div className="flex items-center gap-1.5">
                  <Database size={13} className="text-amber-500" />
                  <span className="text-[10px] font-extrabold text-slate-350 uppercase tracking-wider">Acesso Padrão de Demonstração</span>
                </div>
                <p className="text-[9px] text-slate-400 leading-relaxed font-semibold">
                  E-mail: <b className="text-slate-200">barroso.login@gmail.com</b> <br />
                  Senha: <b className="text-slate-200">123456</b> (protegida por hash MD5 offline)
                </p>
              </div>

            </form>
          )}

          {/* TAB 2: REGISTER FORM */}
          {activeTab === 'register' && (
            <form onSubmit={handleRegisterSubmit} className="space-y-4">
              
              {/* Name */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest block pl-1">Nome Completo</label>
                <div className="relative">
                  <span className="absolute left-3.5 top-3.5 text-slate-500">
                    <User size={16} />
                  </span>
                  <input
                    type="text"
                    required
                    value={regName}
                    onChange={(e) => setRegName(e.target.value)}
                    placeholder="ex: José Barroso"
                    className="w-full bg-slate-900/80 border border-slate-800 rounded-xl pl-11 pr-4 py-3.5 text-xs font-bold text-slate-100 outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-slate-700 transition"
                  />
                </div>
              </div>

              {/* Email */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest block pl-1">E-mail do Usuário</label>
                <div className="relative">
                  <span className="absolute left-3.5 top-3.5 text-slate-500">
                    <Mail size={16} />
                  </span>
                  <input
                    type="email"
                    required
                    value={regEmail}
                    onChange={(e) => setRegEmail(e.target.value)}
                    placeholder="ex: jose@empresa.com"
                    className="w-full bg-slate-900/80 border border-slate-800 rounded-xl pl-11 pr-4 py-3.5 text-xs font-bold text-slate-100 outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-slate-700 transition"
                  />
                </div>
              </div>

              {/* Password */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest block pl-1">Nova Senha</label>
                <div className="relative">
                  <span className="absolute left-3.5 top-3.5 text-slate-500">
                    <Lock size={16} />
                  </span>
                  <input
                    type={showRegPass ? 'text' : 'password'}
                    required
                    value={regPassword}
                    onChange={(e) => setRegPassword(e.target.value)}
                    placeholder="Mínimo 6 caracteres"
                    className="w-full bg-slate-900/80 border border-slate-800 rounded-xl pl-11 pr-10 py-3.5 text-xs font-bold text-slate-100 outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-slate-700 transition"
                  />
                  <button
                    type="button"
                    onClick={() => setShowRegPass(!showRegPass)}
                    className="absolute right-3 top-3.5 text-slate-500 hover:text-slate-300 transition"
                  >
                    {showRegPass ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              {/* Confirm Password */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest block pl-1">Confirmar Senha</label>
                <div className="relative">
                  <span className="absolute left-3.5 top-3.5 text-slate-500">
                    <Lock size={16} />
                  </span>
                  <input
                    type={showRegPass ? 'text' : 'password'}
                    required
                    value={regConfirmPassword}
                    onChange={(e) => setRegConfirmPassword(e.target.value)}
                    placeholder="Repita a nova senha"
                    className="w-full bg-slate-900/80 border border-slate-800 rounded-xl pl-11 pr-4 py-3.5 text-xs font-bold text-slate-100 outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-slate-700 transition"
                  />
                </div>
              </div>

              {/* Security block: Master Password verification */}
              <div className="bg-slate-900 border border-slate-750 rounded-2xl p-4 space-y-3">
                <div className="flex items-center gap-1.5">
                  <Sparkles size={14} className="text-amber-500" />
                  <span className="text-[10px] font-extrabold text-slate-300 uppercase tracking-wider">Alt segurança: Senha Mestra Exigida</span>
                </div>
                
                <div className="space-y-1.5">
                  <input
                    type={showRegMasterPass ? 'text' : 'password'}
                    required
                    value={regMasterPassword}
                    onChange={(e) => setRegMasterPassword(e.target.value)}
                    placeholder="Digite a Senha Mestra Administrativa"
                    className="w-full bg-slate-950/80 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs font-mono font-black text-amber-500 outline-none focus:ring-1 focus:ring-amber-500/30 transition placeholder:text-slate-700"
                  />
                  <div className="flex justify-between items-center px-1">
                    <p className="text-[8px] text-slate-500 font-bold uppercase tracking-wider">Confirme a chave antes de prosseguir</p>
                    <button
                      type="button"
                      onClick={() => setShowRegMasterPass(!showRegMasterPass)}
                      className="text-[9px] text-slate-400 hover:text-slate-300 underline font-bold cursor-pointer"
                    >
                      {showRegMasterPass ? 'Ocultar' : 'Visualizar'}
                    </button>
                  </div>
                </div>
              </div>

              {/* Submit button */}
              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full bg-indigo-600 hover:bg-indigo-550 disabled:bg-slate-800 disabled:text-slate-500 cursor-pointer text-white font-black text-xs py-4 rounded-xl uppercase tracking-widest shadow-lg flex items-center justify-center gap-1 transition active:scale-98"
              >
                <span>Criar Novo Usuário</span>
                <UserPlus size={13} className="stroke-[3]" />
              </button>

            </form>
          )}

        </div>
      </div>
      
      {/* Small copyright note */}
      <p className="text-[9px] font-semibold text-slate-650 tracking-widest uppercase mt-6 z-10 transition">
        DESENVOLVIDO POR JOSE FELIPE A. BARROSO © 2026
      </p>
    </div>
  );
};
