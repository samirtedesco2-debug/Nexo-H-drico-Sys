# Módulo: ui.js

O arquivo `src/ui.js` é responsável por renderizar a interface de usuário (DOM).

Também exibe os avisos de carregamento parcial dos dados, mantendo a apresentação desses estados fora do orquestrador `app.js`.

## Componentes Principais
- **`criarPainelAutonomiaPreditiva`**: Renderiza o painel modal/expansível de autonomia preditiva contendo:
  - Card 1: Status do Reservatório (Nível atual, tendência, saldo última hora em vermelho se negativo via `--status-critical-color`).
  - Card 2: Balanço Hidráulico / Net Flow (Vazão de entrada, vazão de saída, vazão líquida em vermelho se positiva via `--status-critical-color`).
  - Card 3: Projeção & Autonomia (Horizontes de alerta baseados em tempo).
- Renderização de cartões de reservatórios na visão operacional.
- Tabelas e paginação na visão de engenharia e formulários na visão de parametrização.
- **Aba de Registros Inconsistentes / Incompletos (`incompletos`)**:
  - Tratamento robusto e unificado para status `"Inconsistente"` e `"Sem Dados"`.
  - Classificação visual (`obterClasseStatus`) atribuindo classes adequadas (`status-sem-dados`) para leituras fora da faixa válida (0-110%) ou ausentes.
- **Mural de Alertas CCO (`renderizarDashboardExceccoes` e `obterReservatoriosComAlertaOuExcecao`)**:
  - Visão dedicada (fullscreen sem header principal) com relógio digital em tempo real e cabeçalho compacto (`analysis-intro`) otimizado para salas de controle.
  - **Alternância de visualização:** três modos: Cards (padrão CCO), Tabela (visão densa para monitoramento em massa) e Kanban (colunas por severidade), com botões de ACK em cada modo.
  - Filtros interativos por categoria (Totais, Críticos, Atenção, Incompletos). Os contadores incluem todos os alarmes ativos, reconhecidos ou não.
  - A busca filtra por TAG, nome do reservatório e mensagens de diagnóstico.
  - O reconhecimento mantém a cor e a identificação da severidade; um selo explícito “Reconhecido” diferencia o ACK sem reduzir a legibilidade do alerta.
  - Cards e cartões Kanban podem receber foco por teclado e abrir os detalhes com Enter ou Espaço. Na tabela, a linha e o botão com o nome do reservatório abrem os detalhes; o ACK permanece em um controle separado.
  - Estados vazios distinguem ausência de alarmes de busca sem correspondência e oferecem ações para limpar a busca ou voltar a todos os alarmes, conforme o caso.
  - Reconhecimento registra operador e horário; revogação é restrita a ADMIN. Cada ação gera um evento no histórico operacional do mural e outro na trilha de auditoria de segurança.
  - O tempo de resposta usa o horário de acionamento armazenado para a data e reservatório. Esse horário é capturado quando a interface detecta o alerta; não representa necessariamente o início real da condição.
  - Avaliação de nível e vazão pela última leitura válida do boletim do dia (dados históricos, não telemetria em tempo real).
  - Header enxuto de investigação (`atualizarHeaderEnxutoInvestigacao`) para visualização focada e botão de retorno rápido. Na janela dedicada (`?view=investigacao`) ele não é usado: o cabeçalho e o painel vêm de `renderizarPainelInvestigacaoDedicado`.
  - Investigação dedicada (`?view=investigacao&reservatorio=<chave>&data=<dd/mm/aaaa>`): aberta pelo mural com a data selecionada (sem `data`, usa a última do banco). Dados ou reservatório inexistentes mostram o aviso "Investigação indisponível". Para voltar ao mural, feche a janela.
    - **Cabeçalho:** severidade, nome, "Alarme acionado em" (registro local do acionamento no CCO, `ccoAlarmTriggerTimes`; "Não registrado" se não houver, "Sem alarme ativo" sem alarme), última atualização do boletim, base de comparação dos alarmes (`obterBaseComparacaoAlarme`) e "Reconhecer" (só com alarme ativo). ACK ou revogação feitos em outra janela redesenham a investigação (`CcoSync.atualizarAposMudancaAck`, a partir de `window.nexoInvestigacaoAtual`).
    - **Ver na Visão Operacional:** botão no cabeçalho do painel (`abrirVisaoOperacionalDoReservatorio`) que abre ou reaproveita a janela da Visão Operacional filtrada no reservatório e na data da investigação.
    - **Diagnóstico do Alarme:** acima do botão "Copiar Ordem de Serviço (OS)", só os dados que acionaram cada alarme, por origem (`montarGruposAnaliseAlarme`): **Nível** (projeção em `hh:mm h` de `calcularAutonomiaEProjecao`; o valor e o estado ficam no medidor e só vão para a OS), **Vazão** (uma linha por comparação que disparou — média, mínima ou máxima do dia, com diferença em L/s, % e status — e os dias usados na referência, com os que ficaram sem vazão válida) e **Comunicação** (leituras ausentes ou inconsistentes; vazão sem leitura válida). Se o alarme for de outra origem e a vazão estiver sem base de comparação, aparece "Sem base de comparação: alarme de vazão inativo".
    - **Medidor de Nível:** medidor, status e tendência do nível (duas últimas leituras).
    - **Parâmetros Operacionais:** vazão de saída ("N/A (sem leitura válida)" quando não há leitura válida, nunca 0 L/s), vazão de entrada (N/A: não medida) e vazão líquida com a origem (`descreverVazaoLiquida`): "= saída (entrada não medida)" sem sentido de enchimento, "enchendo/esvaziando (pela variação do nível)" sem medição de vazão, ou N/A com o motivo.
    - **OS** (`gerarPayloadOrdemDeServicoInteligente`): curta — nome do reservatório (sem TAG), cada alarme (`código · categoria (severidade)`) com os mesmos dados da tela logo abaixo (incluindo a linha do nível) e uma linha de recomendação por severidade (Crítico: acionar equipe de campo; só dados: verificar a telemetria; Atenção: sem recomendação). Os textos de recomendação são sugestões, não procedimento oficial do SAMAE.
  - Barra de ferramentas operacional unificada e barra de exportação semântica (`#cco-export-toolbar`) com ações de cópia de plantão, CSV e HTML.
  - Suporte a foco sequencial por teclado nos cards, nos controles e nos botões de abertura da tabela; cards abrem detalhes com `Enter` ou `Espaço`.
