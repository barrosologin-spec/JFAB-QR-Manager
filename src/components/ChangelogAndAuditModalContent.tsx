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
      version: 'v3.5.0',
      tag: 'Atual',
      date: '25 de Junho, 2026',
      title: 'Calendário de Cores Inteligente & Sincronização em Tempo Real',
      highlights: [
        'Calendário de Coleta Aprimorado: Design moderno com codificação de cores automática baseada nas categorias de lotes ativas (Cores de Produção).',
        'Modal de Detalhes do Dia: Possibilidade de clicar em qualquer dia ou item do calendário para abrir uma visualização completa e interativa dos lotes de produção daquela data.',
        'Filtro por Categorias e Busca Interna: Novo filtro reativo no modal para isolar categorias específicas e campo de busca rápida por nome de lote ou código de barra/QR Code.',
        'Sincronização em Tempo Real (Real-time Sync): Introduzido suporte para sincronização ultra-rápida (Tempo Real) com atualização instantânea de dados a cada 3 segundos, ideal para operações com múltiplos dispositivos paralelos.',
        'Temporizadores Reativos Live: O indicador de idade de sincronização ("há Xs") agora atualiza de forma suave e interativa a cada segundo sem necessidade de interação ou reloads manuais.'
      ]
    },
    {
      version: 'v3.4.0',
      date: '25 de Junho, 2026',
      title: 'Layout de DANFE Simplificado & Otimização de Espaço',
      highlights: [
        'Resolução definitiva do erro de sobreposição: Corrigido o cálculo de início da tabela (p1StartY) que causava atropelamento de itens sob os títulos e cabeçalhos de produtos.',
        'Novo DANFE Ultra Simplificado: Otimização completa do cabeçalho removendo blocos de tributos/impostos e grids de transportadoras não necessários em ambiente operacional de triagem.',
        'Resumo Consolidado Compacto: Integração de dados de destinatário, emitente, volumes, peso e valor total em blocos limpos, elegantes e de baixa altura vertical.',
        'Eficiência Térmica & Otimização de Folha: Ao reduzir o espaço ocupado pelo cabeçalho, foi possível expandir a capacidade de exibição da primeira página de ~10 para quase ~30 produtos.',
        'Preservação de Atributos Críticos: Mantidos controles opcionais de exibição de Canhoto, autenticação oficial em rodapé, marcas d\'água de segurança de José Felipe A. Barroso e códigos de barra.'
      ]
    },
    {
      version: 'v3.3.0',
      date: '25 de Junho, 2026',
      title: 'Controle de Acesso Avançado (RBAC) & Gestão de Usuários',
      highlights: [
        'Novo módulo de Controle de Acesso Baseado em Funções (RBAC), introduzindo três perfis hierárquicos com restrições granulares: Administrador, Operador e Visualizador.',
        'Desenvolvimento de uma aba interativa exclusiva de "Controle de Acesso" no menu lateral para gerenciamento de privilégios de usuários, criação de contas e exclusão segura.',
        'Ações administrativas blindadas: Apenas Administradores podem gerenciar coletas (criar, renomear, excluir), gerenciar novos usuários e excluir contêineres.',
        'Operação Segura: Usuários com perfil "Visualizador (Auditor)" agora possuem acesso restrito (somente leitura), impedidos de bipar itens, editar descrições ou esvaziar/finalizar contêineres.',
        'Proteção contra exclusão acidental: Bloqueio nativo para exclusão do usuário Administrador Master e do próprio usuário ativo na sessão.'
      ]
    },
    {
      version: 'v3.2.0',
      date: '25 de Junho, 2026',
      title: 'Super Hub Inteligente NF-e & Painel de Inteligência Fiscal',
      highlights: [
        'Aprimoramento completo do Hub NF-e com novos filtros avançados de busca por chave, fornecedor (emitente), cliente (destinatário), contêiner, faixa de valor (min/max) e período (filtros por data de início e fim).',
        'Criação do Painel Analítico Interativo integrado usando Recharts: Evolução de faturamento diário (AreaChart), representação de fornecedores por curva ABC (BarChart) e análise de participação por contêiner (PieChart).',
        'Novo módulo de Inteligência Tributária: Painel com faturamento filtrado, estimativa de impostos recolhidos (ICMS de 18% e IPI de 5%), média financeira por DANFE e consolidação de volumes físicos.',
        'Novas ferramentas de exportação de dados: Baixar Relatório Fiscal Consolidado em formato Excel/CSV estruturado com BOM UTF-8 e separador compatível, e disparar download de DANFEs em lote (PDF único multipáginas) para as notas filtradas.'
      ]
    },
    {
      version: 'v3.1.0',
      date: '24 de Junho, 2026',
      title: 'Paginação Dinâmica & Saneamento de Metadados de Marcas Externas',
      highlights: [
        'Implementado suporte nativo para múltiplas páginas (paginação automática) no DANFE e no manifesto de carga (placa de identificação do contêiner), permitindo imprimir listas com grandes volumes de produtos em folhas subsequentes e numeradas de forma limpa.',
        'Saneamento total de referências a marcas externas (Google AI Studio, Meta, etc.) de todos os metadados de configuração, scripts e documentações do projeto.',
        'Novo controle liga/desliga de paginação dinâmica adicionado às abas de layout do Designer de Placas e DANFE para conferir maior flexibilidade operacional.'
      ]
    },
    {
      version: 'v3.0.0',
      date: '24 de Junho, 2026',
      title: 'Módulo de Impressão de DANFE (Nota Fiscal PDF) & Lote Consolidado',
      highlights: [
        'Adicionada a funcionalidade para exportar DANFEs oficiais e profissionais altamente formatados com base nos dados reais de NF-e.',
        'Novo Painel de Configuração de Layout no Designer: Aba dedicada a parametrizar as regras visuais do DANFE (Emissor, tema de cores, exibição do canhoto, marca d\'água de segurança, chancela de autenticação, espaçamento de linhas e fontes) com preview gráfico interativo em tempo real.',
        'Suporte completo para exportar DANFEs em lote (consolidando múltiplos documentos em um único PDF multipáginas) quando houver mais de uma nota fiscal no contêiner.',
        'Inclusão de botões de ação rápida para download do DANFE em todas as interfaces: painel de ações principais do contêiner, linhas da tabela e visualização em cards de itens.',
        'Adaptação automática da placa de identificação oficial do contêiner para compactar e apresentar informações completas de múltiplos emitentes e manifestos de produtos do lote de NFs.'
      ]
    },
    {
      version: 'v2.9.1',
      date: '23 de Junho, 2026',
      title: 'Mecanismo de Estatística Dinâmica por Data',
      highlights: [
        'Adicionado indicador em tempo real de contagem de bips e duplicatas ao lado do rótulo "Data de Produção".',
        'Exibição visual e elegante no formato "Total - Duplicados = Bipados Ativos" para controle imediato do rendimento operacional.',
        'Sincronização reativa instantânea das estatísticas conforme novos lotes são integrados, consolidados, arquivados ou modificados.'
      ]
    },
    {
      version: 'v2.9.0',
      date: '22 de Junho, 2026',
      title: 'Sincronização Direta em Servidor & Header Simplificado',
      highlights: [
        'Descontinuação completa da camada local IndexedDB para operação direta, rápida e centralizada no banco de dados do servidor (storage.db (SQLite)).',
        'Remoção do botão "Painel de Ajustes", substituindo-o por um painel sofisticado de identificação do operador ativo e controle rápido de Saída (Logout) integrado diretamente no cabeçalho superior.',
        'Saneamento de logs e interface de usuário focada em consistência e usabilidade aprimorada.'
      ]
    },
    {
      version: 'v2.8.0',
      date: '22 de Junho, 2026',
      title: 'Sistema de Acesso Restrito & Criptografia MD5',
      highlights: [
        'Controle de login seguro com e-mail corporativo autenticado e persistência de dados de sessão.',
        'Algoritmo oficial MD5 implementado de forma offline para hash e proteção irreversível de senhas no cache e upload de nuvem.',
        'Instanciação de novas contas condicionada à validação rigorosa com Senha Mestra Administrativa (protegida com criptografia de hash MD5).',
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
