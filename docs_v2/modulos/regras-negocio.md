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
