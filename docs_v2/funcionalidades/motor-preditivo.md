# Motor de Autonomia Preditiva e Balanço Hidráulico

O motor preditivo do Nexo Hídrico calcula projeções baseadas em tempo, tendências operacionais e balanço hidráulico para cada reservatório.

## 1. Filtro de Ruído Temporal (Média Móvel)
- Função: `calcularMediaMovel(valores, janela)`
- Utiliza uma média móvel configurada (atualmente janela = 1 na transição para dados reais, preparada para expansão futura) para suavizar leituras de nível e determinar tendências estáveis (subindo, descendo, estável).

## 2. Balanço Hidráulico (Net Flow)
Calcula a taxa de variação líquida do reservatório com base nas vazões de entrada e saída:
- **Vazão de Entrada**: Obtida de telemetria em tempo real (`vazaoEntrada` / `entrada`).
- **Vazão de Saída**: Obtida de telemetria (`vazao`).
- **Vazão Líquida**: `Saída - Entrada` (em L/s e convertida para m³/h).
  - **Positivo (`> 0`)**: Exibe em **Vermelho** (`--status-critical-color`), indicando esvaziamento líquido.
  - **Negativo ou Zero (`<= 0`)**: Exibe em **Verde/Normal** (`--status-normal-color`), indicando enchimento ou estabilidade.

## 3. Saldo da Última Hora
- Compara a última leitura válida com a penúltima leitura de nível.
- **Positivo (`>= 0`)**: Exibido em verde.
- **Negativo (`< 0`)**: Exibido em **Vermelho** (`--status-critical-color`).

## 4. Horizontes de Autonomia e Alertas
Calcula o tempo estimado em minutos até que o nível atinja os limiares de atenção ou crítico com base na vazão líquida e capacidade útil do reservatório.
