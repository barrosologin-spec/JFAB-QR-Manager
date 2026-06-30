# Changelog

Todas as alterações notáveis neste projeto serão documentadas neste arquivo.

## [Unreleased]

### Adicionado
- **Detecção de Duplicidade no Manifesto (Placa):** O manifesto em PDF agora detecta automaticamente leituras duplicadas do mesmo item em um contêiner. O item duplicado é destacado em vermelho no documento impresso com a etiqueta `(DUPLICADO - VERIFICAR!)`.
- **Controle Dinâmico de Quantidade:** A quantidade exibida de volumes/itens cadastrados agora desconta as duplicidades para exibir a quantidade real de itens únicos (`X ÚNICOS`), facilitando a conferência física e prevenindo erros logísticos.
- **Banner de Alerta em PDFs:** Adicionado um banner vermelho de destaque no topo da lista de composição de carga alertando os operadores sobre a duplicidade detectada no lote.

### Corrigido
- **Rolagem de Modais (Scroll):** Correção do comportamento dos modais (especialmente o modal de Configurações) que ficavam cortados e inacessíveis em telas com menor resolução vertical. Agora, a janela do modal se adapta de forma fluida à altura do visor (`viewport`), apresentando uma barra de rolagem interna inteligente na área de conteúdo sem ocultar o cabeçalho e o rodapé.

### Removido
- **Menu Lateral "Log de Erros":** Remoção completa da aba de "Log de Erros" do menu sidebar e da barra lateral, simplificando a interface operacional e integrando toda a telemetria à Central de Notificações nativa.

### Refatorado
- **Persistência de Dados (SQLite Relacional):** Refinamento completo da persistência SQLite (`storage.db`). Deixamos de salvar o estado em um valor JSON monolítico para implementar uma arquitetura relacional estruturada com tabelas dedicadas (`settings`, `containers`, `items`) com restrições de integridade, chaves estrangeiras com cascateamento dinâmico (`ON DELETE CASCADE`) e índices de busca otimizados (`idx_containers_category_date`, `idx_items_container`, `idx_items_barcode`). O sistema realiza hot-migration automática e contagem direta via SQL no painel de saúde do sistema.
- **Arquitetura e PDF:** Extração e refatoração da lógica de geração de PDFs (DANFE e Placas) para arquivos independentes em `src/lib/pdf/generators.ts`, reduzindo significativamente o tamanho do `App.tsx` e melhorando a manutenibilidade do código.
- **Preview do Layout:** O Estúdio de Layout agora suporta simulação de geração de PDF do DANFE com dados baseados na chave fornecida.
- **API de Consulta DANFE:** Atualização no endpoint e formato da requisição para busca das informações da NF-e.
- **Extração de Chave NF-e:** Implementada a extração automática da chave de acesso (44 dígitos) caso o operador realize a leitura de um QR Code complexo, URL ou texto que contenha a chave embutida.
- **Peso Bruto no DANFE:** A informação de peso bruto agora é exibida apenas se constar na NF-e, removendo o cálculo aproximado/padrão que era exibido anteriormente.
- **Informações Complementares:** O rodapé de "INFORMAÇÕES COMPLEMENTARES / OBSERVAÇÕES OPERACIONAIS" agora é exibido dinamicamente apenas quando a nota fiscal possuir essas informações preenchidas, evitando blocos vazios no DANFE.
- **Referência Indefinida no Sync:** Corrigido o erro de `useRef is not defined` no módulo de sincronização em tempo real (`useSyncData.ts`).
- **Remoção de Dados Fictícios:** O gerador de PDF do DANFE agora reflete unicamente os dados reais recebidos da NF-e (Emitente, Destinatário, Transporte, Fatura, Impostos e Produtos). Todos os valores padrão ilustrativos (mock data) foram removidos.
