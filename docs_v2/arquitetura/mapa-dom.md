# Mapa Técnico do DOM (Elementos, IDs e Classes)

Este documento fornece um mapa completo de todos os elementos estruturais (`header`, `nav`, `main`, `section`, `div`, `span`, `strong`, `canvas`, `table`, etc.), IDs e classes principais presentes no `index.html` e gerados dinamicamente em `src/ui.js`.

---

## 1. Estrutura Principal (`index.html`)

### Cabeçalho (`header`)
- **`.header-top`**: Container superior do cabeçalho.
  - **`.header-brand`**: Logotipo e identificação do produto Nexo Hídrico.
    - **`.brand-mark`**: Ícone SVG estilizado.
    - **`.header-brand-copy`**: Títulos e subtítulos.
      - **`.header-eyebrow`**: Rótulo "MONITORAMENTO".
      - `h1`: "Reservatórios".
      - **`.header-subtitle`**: "Níveis e vazões".
  - **`.header-right`**: Ações do cabeçalho e selo de boletim.
    - **`.header-actions`**: Grupo de botões de controle.
      - `#btn-modo-configuracao` (class: `.btn-operacional-quadrado`): Botão de configurações.
      - `#btn-modo-cco` (class: `.btn-operacional-quadrado`): Botão do modo CCO.
      - `#theme-toggle` (class: `.theme-toggle`): Alternador de tema claro/escuro.
        - **`.theme-icon-sun` / `.theme-icon-moon`**: Ícones SVG de sol e lua.
    - `#selo-boletim` (class: `.bulletin-status-badge`): Selo de status do boletim operacional.
      - **`.bulletin-dot`**: Indicador visual (ponto).
      - **`.bulletin-info`**: Informações de data/hora.
        - **`.bulletin-title`**: "Boletim Operacional".
        - `#lbl-boletim-data-hora`: Data e hora da última leitura do boletim.
### Navegação de Abas (`nav.view-tabs`)
- A página inicial exibe `.view-launcher` com cartões para as quatro visualizações, sem opção ativa.
- A página sem parâmetro `view` inicia sem aba ativa; o clique abre ou foca a janela nomeada da visualização escolhida, sem cabeçalho nem navegação, e seleciona somente o painel solicitado.
- `#tab-operacional` (class: `.view-tab`): Aba da Visão Operacional.
- `#tab-analitico` (class: `.view-tab`): Aba da Visão Analítica.
- `#tab-engenharia` (class: `.view-tab`): Aba da Visão de Engenharia.
- `#tab-exceccoes` (class: `.view-tab`): Aba do Mural de Alertas CCO.

### Anunciador de Alarme CCO (`#cco-alarm-banner`)
- **`.cco-banner-content`**: Conteúdo do banner de alerta preditivo.
  - **`.cco-banner-icon`**: Ícone de alerta (⚠️).
  - **`.cco-banner-text`**: Texto descritivo.
    - `#cco-banner-msg`: Mensagem de alarme CCO.
  - `#cco-banner-ack` (class: `.cco-banner-ack-btn`): Botão de reconhecimento.

### Visão Operacional (`#painel-operacional` / `main.view-panel`)
- **`.focused-view-actions`**: Ações da janela focada, com modo CCO e fechamento.
- **`.operational-global-controls`**: Grupo/reservatório, data e última data disponível.
- **`.operational-brief`**: Resumo de plantão e filtros operacionais.
  - **`.operational-brief-heading`**: Cabeçalho do resumo.
    - **`.analysis-eyebrow`**: "RESUMO DO MONITORAMENTO".
    - `details` / `summary`: Seção colapsável.
      - `#operational-brief-title`: Título do boletim operacional.
      - `#operational-brief-description` (class: `.operational-brief-description`): Descrição do resumo.
    - `#btn-copiar-resumo` (class: `.btn-copiar-resumo`): Botão para copiar resumo de plantão.
  - **`.operational-filter-controls`**: Controles de escopo e comparação.
    - **`.operational-comparison-control`**: Grupo de controle de escopo.
      - `#seletor-escopo-operacional`: Seleciona indicadores exibidos (ambos, nível, vazão).
      - `#seletor-base-vazao`: Seleciona base de comparação estatística **só para análise** (cartões, boletim, analítico); não muda os alarmes.
      - `#indicador-base-alarme`: Mostra a base usada pelos alarmes (Parâmetros Globais) e avisa se o parâmetro salvo for inválido.
  - `#global-predictive-banner` (class: `.global-predictive-banner`): Banner global de alertas preditivos.
  - `#operational-summary` (class: `.operational-summary`): Resumo executivo em cartões.
  - `#operational-details` (class: `.operational-details`): Detalhes operacionais.
  - `#operational-data-quality` (class: `.operational-data-quality`): Indicador de qualidade de dados.
- `#grid-reservatorios` (class: `.dashboard-grid`): **Grid principal onde os cards dos reservatórios são injetados.**
- `#analise-grafico-reservatorio` (class: `.reservoir-analysis-view`): Visão de gráfico detalhado por reservatório.

### Visão Dedicada de Investigação de Alarme (`#painel-investigacao-alarme` / `main.view-panel`)
- `#cco-lean-investigation-header` (class: `.cco-lean-investigation-header`): Cabeçalho contextual da investigação dedicada, exibindo severidade, nome do reservatório, "Alarme acionado em" (`#cco-investigation-date`, horário em que o CCO registrou o acionamento, de `ccoAlarmTriggerTimes`; não é horário de sensor), "Última atualização dos dados" (`#cco-investigation-updated-at`, horário do boletim) e o botão de reconhecimento (ACK). Não há botão "Voltar ao Mural": basta fechar a janela.
- `#container-investigacao-alarme`: Container do painel da investigação (`.inv-panel`, gerado por `criarPainelAlarmeAtivado`): resumo do alarme por origem (nível, vazão, comunicação) com o botão "Copiar Ordem de Serviço (OS)" em `.inv-taxonomia`, medidor de nível e parâmetros do boletim.

### Visão Analítica (`#painel-analitico`)
- **`.focused-view-actions`**: Ações da janela focada, com modo CCO e fechamento.
- **`.analysis-intro`**: Introdução da visão analítica.
- **`.analysis-filters`**: Filtros de data, grupo e reservatórios comparativos.
  - `#analise-inicio`, `#analise-fim`, `#analise-grupo`: Seletores de período e grupo.
  - `#analise-reservatorios` (class: `.reservoir-checkbox-list`): Lista de checkboxes de reservatórios.
  - `#dica-selecao-reservatorios` (class: `.filter-hint`): Dica de seleção.
- `#analise-mensagem` (class: `.analysis-message`): Mensagem de status analítico.
- `#analise-resumo` (class: `.analysis-summary`): Resumo estatístico analítico.
- **`.analysis-charts`**: Grade de gráficos (`Chart.js`).
  - `#grafico-analise-nivel`: Canvas de nível médio diário.
  - `#grafico-analise-vazao`: Canvas de vazão média diária.
  - `#grafico-analise-vazao-faixa`: Canvas de faixa diária de vazão.
- **`.comparison-card`**: Tabela comparativa do período.
  - `#analise-comparacao`: Linhas da tabela comparativa.

### Visão de Engenharia (`#painel-engenharia`)
- **`.focused-view-actions`**: Ações da janela focada, com modo CCO e fechamento.
- **`.engineering-filters`**: Filtros de engenharia.
  - `#engenharia-inicio`, `#engenharia-fim`, `#engenharia-grupo`: Seletores.
  - `#engenharia-reservatorios`: Checkboxes de reservatórios de engenharia.
- `#engenharia-mensagem` (class: `.engineering-note`): Nota de engenharia.
- `#engenharia-resumo` (class: `.analysis-summary`): Resumo de engenharia.
- **`.engineering-charts`**: Gráficos de engenharia.
  - `#grafico-engenharia-nivel`, `#grafico-engenharia-vazao`: Canvases.
- **`.engineering-table-wrap`**: Tabela horária de rastreabilidade.
  - `#engenharia-registros`: Linhas injetadas na tabela de engenharia.
- `#engenharia-paginacao` / `#engenharia-carregar-mais`: Paginação de registros.

### Visão de Parametrização / Configurações (`#painel-configuracoes`)
- **`.config-intro`**: Cabeçalho de parametrização.
  - `#btn-vincular-config`: Botão para vincular arquivo JSON de configuração.
- `#configuracao-mensagem`: Mensagem de status de salvamento.
- **`.config-master-detail`**: Layout mestre-detalhe.
  - `#config-lista-reservatorios` (class: `.config-reservoir-list`): Lista lateral de reservatórios.
  - `#config-detalhe-container`: Container onde o formulário de parâmetros do reservatório selecionado é injetado.

---

## 2. Elementos Dinâmicos e Painel Preditivo (`src/ui.js`)

### Painel de Autonomia Preditiva (`#esquema-autonomia-container`)
Injetado dinamicamente no topo do grid quando o usuário acessa os detalhes preditivos de um reservatório:
- **Card 1: Status do Reservatório**
  - Exibe capacidade útil (`m³`), nível atual (%), tendência (`↑`, `↓`, `→`), e saldo da última hora (colorido em vermelho `--status-critical-color` se negativo).
- **Card 2: Balanço Hidráulico (Net Flow)**
  - Exibe **Vazão de Entrada** (`L/s`), **Vazão de Saída** (`L/s`), e **Vazão Líquida** (`L/s` e `m³/h`, colorida em vermelho `--status-critical-color` se positiva).
- **Card 3: Projeção & Autonomia**
  - Exibe horizontes de tempo baseados em minutos até normalização (60%), atenção (< X%), e crítico (< Y%).

### Modal de Alertas CCO (`#cco-modal-container`)
- Modal interativo exibindo a lista consolidada de todos os reservatórios em alerta preditivo de autonomia.
