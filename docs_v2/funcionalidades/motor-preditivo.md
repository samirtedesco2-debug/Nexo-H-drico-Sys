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

## Capacidade útil ausente

Sem capacidade útil válida (vazia, não numérica ou menor ou igual a zero) em `obterCapacidadeUtil`, o motor não assume valor padrão: retorna `capacidadeAusente: true`, sem minutos de autonomia, e a interface mostra "N/A". Antes, o código usava 5000 m³ de forma silenciosa. Atenção: a vazão de entrada ainda é considerada 0 no cálculo com vazão medida (`regrasNegocio.js`), o que depende de definição de domínio.

## Vazão de entrada desconhecida

A série de vazão das planilhas é somente de **saída**; a entrada só existirá com a migração para telemetria. Com `possuiMedicaoVazao` ligado, `calcularAutonomiaEProjecao` usa a saída como vazão líquida (pior caso, sem reposição), retorna `entradaConsiderada: false` e `avisoEntrada`, e limita a confiabilidade a "Média". A entrada é `null`, não zero medido. Com a vazão desligada, o cálculo usa a variação do nível, que já embute a entrada real. O limite de normalização do cenário "nível subindo" é o `nivelAtencao` do reservatório.
