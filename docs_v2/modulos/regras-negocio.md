# Módulo: regrasNegocio.js

O arquivo `src/regrasNegocio.js` é o núcleo lógico do Nexo Hídrico.

## Principais Funções
1. **`obterConfiguracaoReservatorio(id)`**: Recupera parâmetros de configuração (capacidade útil, limites de atenção/crítico, desvios de vazão) com suporte a personalizações salvas no `localStorage` ou banco local.
2. **`calcularMediaMovel(valores, janela)`**: Suaviza dados temporais (janela ajustada para 1 na transição para dados reais).
3. **`calcularAutonomiaEProjecao(reservatorio, id)`**:
   - Calcula tendência (Subindo, Descendo, Estável).
   - Calcula balanço hidráulico (**Net Flow**): vazão de saída vs. vazão de entrada (`vazaoEntradaLs`).
   - Projeta minutos até níveis críticos ou de atenção.
4. **`auditarLeiturasNivel(valores)`**: Auditoria contínua das leituras de telemetria:
   - **Sensor Travado**: Detecta desvio padrão/variação zero em 3 leituras consecutivas válidas, marcando como `Inconsistente`.
   - **Degrau Impossível**: Bloqueia e marca como `Inconsistente` se a variação entre horas consecutivas for superior a 25% (com estrutura comentada pronta para 10% em tempo real).
   - **Timeout (Queda de Link / Falha de Comunicação)**: Varredura cronológica de trás para frente; decreta falha se houver mais de 2 campos seguidos em branco (com estrutura comentada para $\Delta t \ge 5\text{ min}$ em tempo real).
5. **`avaliarStatusNivel` / `avaliarAlertaVazao`**: Classifica o estado operacional em Normal, Atenção, Crítico, Sem Dados, Manutenção ou **Inconsistente** (quando reprovado pela auditoria ou com valores inválidos).
   - `avaliarStatusNivel` usa os limites de atenção/crítico, o alerta ligado/desligado e o modo manutenção **de cada reservatório** (`obterConfiguracaoReservatorio`); sem configuração, vale 60%/50%. Existe uma única definição dessa função (a cópia simples que havia em `app.js` foi removida).
   - Duas regras ficam **desligadas** por constantes no topo da função, enquanto os dados forem os arquivos históricos (6 leituras de madrugada por dia): `AUDITORIA_SENSOR_ATIVA` (auditoria do sensor e valores inválidos/ausentes resultando em `Inconsistente`) e `COMPARACAO_NIVEL_MEDIO_ATIVA` (variação do nível médio contra a média histórica). Nos dados de 2026 elas gerariam alarmes falsos: ~6% dos reservatório-dia viraria `Inconsistente` e ~7,6% mudaria para Atenção/Crítico, inclusive reservatórios cheios. Ligar e calibrar com telemetria real (ver `migracao-tempo-real.md`). Com ambas desligadas, o resultado é idêntico ao da versão simples anterior, o que `testes/test_regras.js` verifica sobre todo o histórico.
6. **`classificarAlarmesAtivos({ statusNivel, statusVazao, direcaoVazao, possuiLeiturasAusentes })`**: Fonte única dos códigos de taxonomia dos alarmes ativos, usada pelo mural/exceções e pela investigação dedicada (`?view=investigacao`). Retorna uma lista (vazia quando não há alarme):
   - **Nível**: `ALM-NIV-01` (Crítico) e `ALM-NIV-02` (Atenção); `ALM-DAT-02` para `Inconsistente`/`Sem Dados`.
   - **Vazão**: o código segue a **direção** do desvio — baixa = `ALM-VAZ-01`, alta = `ALM-VAZ-02` — e a severidade é a do status real (Atenção/Crítico), não a fixa do arquivo `taxonomia_alarmes.json`. Hoje só o desvio **para cima** gera alarme (ver "Vazão por horário" abaixo); `ALM-VAZ-01` não é gerado por desvio.
   - **Vazão por horário**: a referência é calculada horário a horário (`calcularReferenciaVazaoPorHorario`, `regrasNegocio.js`): para cada horário (ex.: 00:15) juntam-se os valores válidos desse horário nos dias da base (ex.: últimas 4 segundas); o horário só entra com pelo menos 2 valores. Do conjunto saem a média, o menor e o maior valor do período. O dia é comparado só nos horários da referência e a referência só usa os horários em que o dia tem leitura válida (mesmo horário contra mesmo horário; `avaliarAlertaVazao`), em 3 comparações separadas (média, mínima e máxima do dia contra a referência correspondente), cada uma com os limites percentuais por reservatório (atenção/crítico). Leitura zero continua `INCONSISTENTE`; se todas as leituras de vazão do dia forem zero/inconsistentes, a investigação mostra "Vazão sem leitura válida" via `ALM-DAT-01`. Com poucos dados fixos (6 leituras de madrugada) a referência é limitada; reavaliar com telemetria real.
   - **Telemetria**: `ALM-DAT-01` quando há leituras ausentes.
   - Alarmes simultâneos aparecem todos, na ordem nível, dados (`DAT-02`), vazão, telemetria.
7. **`obterDirecaoDesvioVazao(alertaVazao)`**: Direção (`alta`/`baixa`) do indicador de vazão que disparou o alarme (Crítico antes de Atenção). Sem indicador em alarme, usa o primeiro indicador (comportamento anterior).
