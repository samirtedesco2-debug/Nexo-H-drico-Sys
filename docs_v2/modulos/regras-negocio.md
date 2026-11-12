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
6. **`classificarAlarmesAtivos({ statusNivel, statusVazao, direcaoVazao, possuiLeiturasAusentes })`**: Fonte única dos códigos de taxonomia dos alarmes ativos, usada pelo mural/exceções e pela investigação dedicada (`?view=investigacao`). Retorna uma lista (vazia quando não há alarme):
   - **Nível**: `ALM-NIV-01` (Crítico) e `ALM-NIV-02` (Atenção); `ALM-DAT-02` para `Inconsistente`/`Sem Dados`.
   - **Vazão**: o código segue a **direção** do desvio — baixa = `ALM-VAZ-01`, alta = `ALM-VAZ-02` — e a severidade é a do status real (Atenção/Crítico), não a fixa do arquivo `taxonomia_alarmes.json`.
   - **Telemetria**: `ALM-DAT-01` quando há leituras ausentes.
   - Alarmes simultâneos aparecem todos, na ordem nível, dados (`DAT-02`), vazão, telemetria.
7. **`obterDirecaoDesvioVazao(alertaVazao)`**: Direção (`alta`/`baixa`) do indicador de vazão que disparou o alarme (Crítico antes de Atenção). Sem indicador em alarme, usa o primeiro indicador (comportamento anterior).
