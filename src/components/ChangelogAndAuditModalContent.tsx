/**
 * Desenvolvido por José Felipe A. Barroso (pixdobarroso@gmail.com)
 */

import React, { useState, useMemo } from 'react';
import { Clock, User, FileText, Sparkles, Activity, Layers } from 'lucide-react';
import { QRStorage } from '../types';
import { cn } from '../lib/utils';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface ChangelogAndAuditModalContentProps {
  storage: QRStorage;
}

interface AuditLog {
  id: string;
  timestamp: number;
  action: string;
  description: string;
  user?: string;
}

export const ChangelogAndAuditModalContent: React.FC<ChangelogAndAuditModalContentProps> = ({ storage }) => {
  const [activeSubTab, setActiveSubTab] = useState<'changelog' | 'auditoria'>('changelog');

  // Extract logs array from storage (they are saved under storage._logs metadata)
  const auditLogs = useMemo<AuditLog[]>(() => {
    if (storage && Array.isArray(storage._logs)) {
      return storage._logs;
    }
    return [];
  }, [storage]);

  // System releases & milestones historical array
  const systemChanges = [
    {
      version: 'v2.8.0',
      tag: 'Atual',
      date: '22 de Junho, 2026',
      title: 'Sistema de Acesso Restrito & Criptografia MD5',
      highlights: [
        'Controle de login seguro com e-mail corporativo autenticado e persistência de dados de sessão.',
        'Algoritmo oficial MD5 implementado de forma offline para hash e proteção irreversível de senhas no cache e upload de nuvem.',
        'Instanciação de novas contas condicionada à validação rigorosa com Senha Mestra Administrativa (beke#212!).',
        'Sincronização imediata de novos usuários cadastrados entre dispositivos corporativos e trilha de auditoria vinculando o autor de cada registro.'
      ]
    },
    {
      version: 'v2.7.0',
      date: '22 de Junho, 2026',
      title: 'Módulo de Órfãos (Contingência & Recuperação)',
      highlights: [
        'Salvaguarda automática de bips de coletas removidas de forma a realocar os lotes órfãos em uma seção dedicada sem perda de dados.',
        'Módulo de inteligência para reatribuir lotes de códigos órfãos a uma nova coleta ou lote ativo existente com exclusão automática de duplicados por texto.',
        'Opção de remoção permanente offline/online de órfãos originados de um lote específico (Orfaos da coleta: Nome da coleta).',
        'Registro pormenorizado no log de auditoria automatizado para movimentação, exclusão de órfãos e reatribuição por lote.'
      ]
    },
    {
      version: 'v2.6.0',
      date: '22 de Junho, 2026',
      title: 'Módulo de Gestão Avançada & Auditoria Dinâmica',
      highlights: [
        'Lançamento da aba exclusiva "Coletas & Linagens" no menu lateral para gerenciamento integral dos lotes de bips cadastrados.',
        'Totalizador em tempo real das quantidades de itens/bips consolidadas por coleta e média ponderada geral.',
        'Implementação de painel de triagem auditivo-visual para exclusão permanente, alteração inline de nomes de lotes e troca rápida de presets de cor.',
        'Gravação automática de trilha de auditoria para registros de inclusão, modificação e alteração de tambores no banco cloud-synced IndexedDB.'
      ]
    },
    {
      version: 'v2.5.0',
      date: '21 de Junho, 2026',
      title: 'Indicadores Visuais de Carga de Trabalho',
      highlights: [
        'Integração de gráfico de rosca (Donut Chart) na tela de Painel Geral usando Recharts.',
        'Renderização percentual da proporção de bips por coleta no sistema.',
        'Responsividade horizontal automática de bento-grids para exibições em tablets, celulares e desktops.',
        'Tooltip dinâmico com cálculo de taxa de cubagem de dados por categoria.'
      ]
    },
    {
      version: 'v2.4.0',
      date: '15 de Junho, 2026',
      title: 'Central de Notificações & Áudios Integrados',
      highlights: [
        'Novo painel "Logs de Erros" e histórico resumido dos últimos 50 bips bem-sucedidos.',
        'Efeitos sonoros customizados na biblioteca de áudio para identificação de acerto, aviso ou duplicação de códigos.',
        'Limpeza total ou seletiva de histórico diretamente na central lateral.'
      ]
    },
    {
      version: 'v2.3.0',
      date: '10 de Junho, 2026',
      title: 'Persistência Offline-First (IndexedDB)',
      highlights: [
        'Utilização completa de IndexedDB de forma a evitar perda de leituras devido a quedas súbitas de bateria ou internet.',
        'Algoritmo de resolução inteligente de concorrência em segundo plano baseado em timestamp no push/pull do servidor central.'
      ]
    },
    {
      version: 'v2.2.0',
      date: '02 de Junho, 2026',
      title: 'Estúdio de Impressão de Etiquetas',
      highlights: [
        'Criação de construtor de formato PDF para bobinas de etiquetas térmicas e jatos de tinta padrão.',
        'Ajustes finos para margens de impressão, tamanho de fonte de descrição, espaçamento de linhas e quebra de páginas.'
      ]
    },
    {
      version: 'v2.1.0',
      date: '28 de Maio, 2026',
      title: 'Hub de Validação de NF-e (Danfe)',
      highlights: [
        'Módulo inteligente de validação de algoritmos de chave de acesso em notas fiscais brasileiras.',
        'Identificador automático de duplicados por lote nos registros do Hub.'
      ]
    }
  ];

  return (
    <div className="space-y-6">
      {/* Tab Segment Controls */}
      <div className="flex bg-slate-105 dark:bg-slate-950 p-1 rounded-2xl border border-slate-150 dark:border-slate-800">
        <button
          type="button"
          onClick={() => setActiveSubTab('changelog')}
          className={cn(
            "flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider cursor-pointer transition-all",
            activeSubTab === 'changelog' 
              ? "bg-white dark:bg-slate-850 text-blue-600 dark:text-blue-450 shadow-3xs" 
              : "text-slate-500 dark:text-slate-450 hover:text-slate-700 hover:bg-slate-100/50 dark:hover:bg-slate-900/30"
          )}
        >
          <Sparkles size={14} />
          <span>Melhorias e Atualizações</span>
        </button>
        <button
          type="button"
          onClick={() => setActiveSubTab('auditoria')}
          className={cn(
            "flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider cursor-pointer transition-all",
            activeSubTab === 'auditoria' 
              ? "bg-white dark:bg-slate-850 text-blue-600 dark:text-blue-450 shadow-3xs" 
              : "text-slate-500 dark:text-slate-450 hover:text-slate-700 hover:bg-slate-100/50 dark:hover:bg-slate-900/30"
          )}
        >
          <Activity size={14} />
          <span>Auditoria do Usuário ({auditLogs.length})</span>
        </button>
      </div>

      {/* Tab Content Display */}
      {activeSubTab === 'changelog' ? (
        <div className="space-y-6 max-h-[420px] overflow-y-auto pr-1 custom-scrollbar">
          <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest px-1">
            Evolução do Sistema • Notas de Lançamento & Correções
          </p>

          <div className="relative border-l-2 border-slate-100 dark:border-slate-800 ml-4 pl-6 space-y-7 py-2">
            {systemChanges.map((change, index) => (
              <div key={index} className="relative group">
                {/* Visual Circle Milestone */}
                <div className={cn(
                  "absolute -left-[31px] top-1 w-4 h-4 rounded-full border-2 bg-white dark:bg-slate-950 flex items-center justify-center transition-all",
                  change.tag === 'Atual' ? "border-emerald-500 ring-4 ring-emerald-500/10" : "border-slate-300 dark:border-slate-700"
                )}>
                  {change.tag === 'Atual' && <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-ping" />}
                </div>

                <div className="space-y-2">
                  <div className="flex flex-wrap items-center gap-2.5">
                    <span className="text-[10px] font-black font-mono text-slate-400 bg-slate-100 dark:bg-slate-900 border border-slate-150 dark:border-slate-800 px-2 py-0.5 rounded">
                      {change.version}
                    </span>
                    {change.tag && (
                      <span className="text-[8px] font-black bg-emerald-500/10 text-emerald-600 dark:text-emerald-450 border border-emerald-500/20 px-1.5 py-0.5 rounded uppercase tracking-wide">
                        {change.tag}
                      </span>
                    )}
                    <span className="text-[10px] font-bold text-slate-400">{change.date}</span>
                  </div>

                  <h3 className="font-extrabold text-sm text-slate-800 dark:text-slate-150 tracking-tight leading-tight">
                    {change.title}
                  </h3>

                  <ul className="space-y-1.5 pl-3 list-disc text-xs text-slate-600 dark:text-slate-400 font-medium">
                    {change.highlights.map((item, itemIdx) => (
                      <li key={itemIdx} className="leading-relaxed marker:text-slate-300 dark:marker:text-slate-700">
                        {item}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="space-y-5 max-h-[420px] overflow-y-auto pr-1 custom-scrollbar">
          <div className="flex items-center justify-between px-1">
            <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">
              Logs de Eventos na Sessão Ativa • Filtro de Transações
            </p>
            <span className="text-[9px] font-black text-slate-400 bg-slate-50 dark:bg-slate-950 px-2 py-1 rounded-lg uppercase tracking-wider border border-slate-100 dark:border-slate-800">
              {auditLogs.length} Operações Gravadas
            </span>
          </div>

          <div className="space-y-2.5">
            {auditLogs.map((log) => {
              // Helper for relative timestamps safely
              let formattedTime = 'Recentemente';
              try {
                formattedTime = formatDistanceToNow(new Date(log.timestamp), { addSuffix: true, locale: ptBR });
              } catch (e) {
                // fallback
              }

              return (
                <div 
                  key={log.id}
                  className="bg-slate-50/50 dark:bg-slate-950/20 border border-slate-150 dark:border-slate-805/85 p-3.5 rounded-2xl flex flex-col md:flex-row md:items-center justify-between gap-3 shadow-3xs"
                >
                  <div className="space-y-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-[9.5px] font-black uppercase tracking-wider px-2 py-0.5 bg-blue-100/60 dark:bg-blue-950/40 text-blue-650 dark:text-blue-400 rounded-md">
                        {log.action}
                      </span>
                      <span className="text-[10px] text-slate-400 font-semibold flex items-center gap-1">
                        <Clock size={10} /> {formattedTime}
                      </span>
                    </div>
                    <p className="text-xs text-slate-700 dark:text-slate-300 font-bold tracking-tight">
                      {log.description}
                    </p>
                  </div>

                  {log.user && (
                    <div className="flex items-center gap-1.5 text-[10px] text-slate-400 dark:text-slate-500 font-bold uppercase tracking-wider bg-white dark:bg-slate-900 border border-slate-200/50 dark:border-slate-800 px-2.5 py-1 rounded-xl shrink-0 self-start md:self-center">
                      <User size={10} className="text-slate-400" />
                      <span className="truncate max-w-[120px]">{log.user.split('@')[0]}</span>
                    </div>
                  )}
                </div>
              );
            })}

            {auditLogs.length === 0 && (
              <div className="py-24 text-center border-2 border-dashed border-slate-200 dark:border-slate-800/80 rounded-2xl bg-slate-50/20 dark:bg-slate-950/5 p-8">
                <FileText size={36} className="text-slate-300 dark:text-slate-700 mb-2 stroke-[1.5]" />
                <p className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">Nenhuma alteração registrada</p>
                <p className="text-[9px] text-slate-450 dark:text-slate-600 mt-1">Realize alterações na produção (adicionar itens, criar nova coleta ou renomear lotes) para visualizar bips de auditoria automatizados.</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
