# Parametrização e Regras de Alarme

O módulo de parametrização permite configurar parâmetros operacionais granulares para cada reservatório e definições globais bilaterais do sistema.

## Parâmetros Disponíveis por Reservatório

1. **Capacidade Útil (`capacidadeUtil`)**: Volume útil do reservatório em metros cúbicos ($m^3$). Utilizado para cálculos volumétricos e de autonomia.
2. **Medição de Vazão (`possuiMedicaoVazao`)**: Ativa ou desativa o uso de dados de vazão. Se desativado, o sistema aplica fallback utilizando apenas a variação do nível ao longo do tempo.
3. **Limites de Alerta de Nível**:
   - Nível de Atenção (%)
   - Nível Crítico (%)
   - Os valores 60/50 hoje em `dados_historicos/config_reservatorios.json` são **provisórios** (padrão de criação), até chegarem os limites reais de cada reservatório. Quando forem informados, o status de nível passa a usá-los (e o alarme muda para os reservatórios cujo limite for diferente de 60/50). Valores salvos no navegador (`nexo_hidrico_reservatorios_config`) têm precedência sobre o arquivo.
4. **Limites de Alerta de Vazão e Desvios (%)**:
   - Desvio de Entrada (Atenção / Crítico)
   - Desvio de Saída (Atenção / Crítico)
   - Desvio Média (Atenção / Crítico)
5. **Horizontes de Tempo (Minutos)**:
   - Limiar de tempo para alerta de atenção e crítico.
6. **Modo Manutenção (`emManutencao`)**: Coloca o reservatório em estado de manutenção, suspendendo alertas operacionais.

## Parametrização Bilateral Independente (Formulário I e Formulário II)

- **FORMULÁRIO I (Resumo de Passagem de Plantão)**:
  - E-mails de destino para plantão.
  - Grade dinâmica em formato de Array de Timers para múltiplos disparos diários agendados.
  - Caminho físico de diretório local.
- **FORMULÁRIO II (Log de Erros e SLA Técnico)**:
  - E-mails analíticos da manutenção.
  - Seletores cronológicos de dia da semana e horário.
  - Tempo limite de reação (SLA - padrão 15 min).
  - Tolerância de ruído (%).
  - Caminho de disco rígido alternativo (HDD).

