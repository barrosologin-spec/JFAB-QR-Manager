# 🏷️ JFAB QR Manager

O **JFAB QR Manager** é uma solução web full-stack de nível profissional desenvolvida para gerenciamento inteligente, rastreamento de produção e emissão de etiquetas/QR Codes com detreção automatizada de duplicatas, auditoria de dados e fluxos de trabalho avançados de etiquetas de produção e de descarte.

Projetada com uma interface de alta fidelidade visual (Dark Slate e acentos em azul cobalto), a plataforma integra ferramentas poderosas de design de layouts de etiquetas, visualizador de calendário de coletas, busca global unificada, monitor de erros técnicos com dados fiscais (NF-e) e auditoria nativa para garantir consistência operacional absoluta.

---

## ✨ Principais Funcionalidades

### 📋 Fluxo de Produção & Painéis Dinâmicos
* **Painel de Produção Integrado:** Controle em tempo real do progresso operacional e distribuição de lotes com ordenação cronológica avançada.
* **Estatísticas de Bipagem por Data:** Indicador automático em tempo real posicionado junto ao rótulo "Data de Produção" (no formato `Total - Duplicados = Bipados Ativos`), permitindo auditoria visual em tempo real no processo de triagem.
* **Calendário Interativo:** Planejamento claro de coletas baseado em datas operacionais críticas.
* **Busca Global e Duplicatas:** Rastreador inteligente de itens duplicados para mitigar inconsistências, aliado a um mecanismo de busca instantâneo capaz de varrer todo o inventário.

### 🎨 Designer de Etiquetas Técnico & Flexível
* **Aba de Configuração do Layout DANFE:** Nova aba integrada no Estúdio de Layout para ajustar todos os elementos visuais do DANFE (Nome do emitente, tema de cores, visibilidade do canhoto de recibo, chancelas de autenticação, marcas d'água de segurança e tamanhos de fonte de itens/tabela) com visualização representativa em tempo real.
* **Módulo de Impressão de DANFE (Nota Fiscal PDF):** Geração dinâmica de Documentos Auxiliares da Nota Fiscal Eletrônica (DANFE) altamente formatados e fiéis ao padrão oficial, exibindo dados reais de emitentes, destinatários, produtos e códigos de barras.
* **Paginação Dinâmica e Inteligente (Novo):** Suporte nativo para múltiplas páginas no DANFE e no manifesto de carga (Placa do Contêiner). Quando o limite físico de itens em uma única folha é excedido, o sistema distribui e gera dinamicamente folhas de continuação estruturadas e numeradas (`FOLHA X/Y`), mantendo a consistência do design, das chancelas e das marcas d'água. Essa paginação é totalmente configurável (liga/desliga) através do Designer de Layout.
* **Download Consolidado em Lote:** Detecção automática de múltiplos registros NF-e no mesmo contêiner, permitindo exportar todos os DANFEs agrupados em um único arquivo PDF multipáginas.
* **Placa de Identificação Inteligente Multi-NF:** Adaptação da placa oficial do contêiner para resumir chaves de acesso, emitentes e manifesto geral de produtos do lote caso haja mais de uma NF-e associada.
* **Layouts Customizados:** Configuração precisa das dimensões de QR Codes, larguras e alturas de códigos de barras (otimizados para folhas A4 padrão ou bobinas térmicas específicas).
* **Compatibilidade Dinâmica:** Suporte nativo para impressão direta, geração de PDFs em lote no navegador usando `jspdf` com feedback sonoro audível em tempo real.

### 🛡️ Auditoria, Segurança e Consolidação
* **Sincronização robusta via SQLite/JSON (`storage.json`):** Estrutura de persistência estável baseada em arquivos no servidor, com controle de carimbos de data/hora (*timestamps*) e validação estrita contra perda de dados.
* **Centro de Notificações e Registros de Auditoria:** Histórico detalhado de alterações críticas com descrições das operações do sistema.
* **Mecanismo de Usuários e Autenticação:** Tela de login customizada com salvaguarda padrão para acesso inicial de operadores autorizados.

### 💾 Backup, Importação & Exportação Completos
* **Exportação Direta de Dados:** Com um único clique dentro das configurações, exporte todo o banco de dados em um único arquivo de backup JSON estruturado.
* **Importação Total de Salvaguardas:** Recurso nativo integrado na interface para carregar logs e bancos de dados JSON herdados, sincronizando o servidor de forma totalmente segura.

---

## 🛠️ Tecnologias Utilizadas

### Frontend
* **React 19** com **TypeScript** e **Vite** para inicialização de arquivos ultrarrápida.
* **Tailwind CSS v4** para construção de componentes e layout totalmente responsivo com visual premium.
* **Motion (by Framer)** para transições suaves, efeitos de entrada em cascata e micro-interações de feedback.
* **Lucide React** para iconografia técnica moderna.
* **Recharts / D3** para análises visuais e gráficos dinâmicos de distribuição de dados e status.

### Backend
* **Node.js** com **Express** atuando como servidor de sincronização de controle e gestão do banco de dados centralizado em JSON local (`storage.json`).
* **esbuild** e **tsx** para bundling de produção de alto desempenho e execução rápida de TypeScript nativo.

---

## 🚀 Como Executar o Projeto

### Pré-requisitos
Certifique-se de ter instalado em sua máquina:
* **Node.js** (v18 ou superior recomendado)
* Gerenciador de pacotes **npm**

### Passo 1: Instale as Dependências
Abra o terminal no diretório raiz do projeto e execute:
```bash
npm install
```

### Passo 2: Executar em Modo de Desenvolvimento
Inicie o servidor de desenvolvimento utilizando o ambiente pré-configurado com Express e Vite:
```bash
npm run dev
```
A aplicação iniciará automaticamente em seu navegador local ou exibirá a URL no terminal (padrão: `http://localhost:3000`).

### Passo 3: Compilar e Criar Build de Produção
Para compilar a aplicação de forma que o servidor backend de TypeScript seja agrupado de forma limpa em CommonJS para ser entregue na núvem ou Docker:
```bash
npm run build
```
Esse comando irá automatizar as tarefas:
1. Criará a build estática do frontend React dentro da pasta `/dist`.
2. Compilará o backend no arquivo otimizado `dist/server.cjs` com o `esbuild`.

### Passo 4: Iniciar o Servidor de Produção
Após a geração da build do Passo 3, você pode rodar a aplicação em escala de produção usando:
```bash
npm start
```

---

## 👤 Credenciais Padrão do Sistema
Caso seja a sua primeira execução e o banco de dados esteja zerado, o sistema inicializará com as seguintes credenciais padrão para acesso do operador:

* **E-mail:** `barroso.login@gmail.com`
* **Senha Inicial:** `123456`

*(Você pode alterar estas informações ou incluir novos operadores diretamente pela tela de gerenciamento de usuários de forma intuitiva.)*

---

## 📦 Como enviar o projeto para o seu repositório remoto

Siga o passo a passo abaixo para enviar os arquivos para o seu próprio repositório:

1. **Abra o terminal** na pasta raiz do seu projeto.
2. **Inicialize o Git** (se ainda não estiver inicializado):
   ```bash
   git init
   ```
3. **Adicione os arquivos** ao estágio de preparação:
   ```bash
   git add .
   ```
4. **Crie o primeiro commit**:
   ```bash
   git commit -m "feat: implementa JFAB QR Manager"
   ```
5. **Crie o seu repositório remoto** no seu serviço de hospedagem preferido.
6. **Vincule o repositório remoto** e defina a branch principal como `main`:
   ```bash
   git remote add origin <URL_DO_REPOSITORIO>
   git branch -M main
   ```
7. **Envie os commits** para o repositório:
   ```bash
   git push -u origin main
   ```

---

## 📄 Licença
Este projeto possui licença privada integrada. Sinta-se à vontade para hospedar de forma independente ou utilizar em sistemas internos de controle de coletas.

*Desenvolvido com foco em consistência técnica operacional, excelente experiência de uso e integridade absoluta na persistência de dados.*
