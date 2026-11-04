# Módulo: app.js

O arquivo `src/app.js` atua como o **controlador principal (orquestrador)** da aplicação.

## Responsabilidades
- Inicialização da aplicação ao carregar a página e verificação de query parameters (`?view=operacional`, `?view=analitico`, `?view=engenharia` e `?view=exceccoes`) para abrir a visualização solicitada.
- Ao abrir uma investigação pelo Mural, `reservatorio` e `origem=mural` são aplicados antes da primeira renderização operacional, evitando exibir o boletim geral.
- Carregamento inicial do estado de reconhecimentos, metadados e logs pelo `StorageRepository` antes de inicializar o banco de dados da aplicação. Quando esse estado foi carregado, ele tem precedência sobre `_estado_plantao` vindo da configuração no `apiClient.js`.
- **Integração com Módulo CCO Sync (`src/ccoSync.js`)**:
  - Delegação da inicialização do `BroadcastChannel('nexo_hidrico_cco_link')` e do modo CCO/Fullscreen.
  - Gerenciamento de Janela Singleton (`ccoMuralWindow`) para o Mural de Alarmes CCO.
- **Central de Notificações Externa**:
  - Popover dedicado (`#btn-notificacoes`) transformado em feed de avisos e notificações externas/sistêmicas (separado dos logs internos de ACK).
  - Suporte a categorias operacionais: `UPDATE` (atualizações de sistema), `MAINTENANCE` (manutenção de sensores), `ANNOUNCE` (comunicados da engenharia/criador) e `SYSTEM` (infraestrutura SCADA/WebSocket).
  - Persistência em `localStorage` (chave `nexo_hidrico_external_notifications`) e ações rápidas ("Marcar todas como lidas", contagem de não lidas com badge dinâmico).
- **Migração de identificadores locais**:
  - Executa `src/legacyMigration.js` antes de inicializar autenticação e dados, preservando cópias antigas do IndexedDB e do `localStorage`.
- **Tratamento Global de Erros**:
  - Ouvinte global `unhandledrejection` para interceptação e registro de exceções assíncronas não tratadas.
- **Escala para Telas Grandes (TV 55")**:
  - Injeção da propriedade `data-view-scale="large-tv"` no `body` ao entrar em tela cheia/modo CCO para dimensionamento proporcional de fontes, cards e elementos.
- **Central de Exportação Manual Multiformato**:
  - Resumo de Passagem de Plantão textual com extração de TAGs curtas via Regex e diagnósticos entre colchetes.
  - Exportação para Excel/CSV com delimitador ponto e vírgula (`;`) e injeção do caractere `\uFEFF` (BOM UTF-8) para abertura correta no Microsoft Excel.
  - Geração e download de Relatório HTML independente com estilos embutidos e tabelas de ocorrências.
- **Parametrização Bilateral e Master Sidebar**:
  - Filtros em cascata com busca em tempo real (`oninput`) para TAGs e dropdown de Grupos Hidráulicos.
  - Gerenciamento bilateral independente para Formulário I (Plantão) e Formulário II (Log de Erros e SLA Técnico).
- Gerenciamento da navegação entre visualizações: Operacional, Analítica e Engenharia abrem em janelas nomeadas reutilizáveis, focadas apenas no painel solicitado; o Mural de Alarmes CCO mantém sua janela dedicada.
- Sincronização de seletores de grupo, reservatório e data.
- Inicialização do sistema de alarmes CCO e atualização periódica.
