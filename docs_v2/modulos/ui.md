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
  - Avaliação de nível e vazão baseada no momento atual (última leitura telemetrada).
  - Header enxuto de investigação (`atualizarHeaderEnxutoInvestigacao`) para visualização focada e botão de retorno rápido. Na janela dedicada (`?view=investigacao`) ele não é usado: o cabeçalho e o painel vêm de `renderizarPainelInvestigacaoDedicado`.
  - Investigação dedicada (`?view=investigacao&reservatorio=<chave>&data=<dd/mm/aaaa>`): aberta pelo mural com a data selecionada (sem `data`, usa a última do banco). Dados ou reservatório inexistentes mostram o aviso "Investigação indisponível". O painel lista cada alarme ativo com taxonomia (`classificarAlarmesAtivos`, ver [regras-negocio.md](./regras-negocio.md)), mostra o medidor de nível e permite copiar a Ordem de Serviço (OS) em texto. "Reconhecer" só aparece com alarme ativo e "Voltar ao Mural" só quando a janela foi aberta pelo mural.
  - Barra de ferramentas operacional unificada e barra de exportação semântica (`#cco-export-toolbar`) com ações de cópia de plantão, CSV e HTML.
  - Suporte a foco sequencial por teclado nos cards, nos controles e nos botões de abertura da tabela; cards abrem detalhes com `Enter` ou `Espaço`.
