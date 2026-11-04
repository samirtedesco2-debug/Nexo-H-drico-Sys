# Módulo: apiClient.js

O arquivo `src/apiClient.js` é responsável por gerenciar a comunicação com fontes externas de dados, requisições HTTP (quando aplicável) e interações com o armazenamento local (`localStorage`) ou arquivos de configuração do projeto.

## Responsabilidades Principais
- Gerenciamento de persistência de configurações de reservatórios.
- Interação com fontes de dados e tratamento de erros de carregamento assíncrono.
- Registro de falhas de índice, arquivos mensais, configurações e taxonomia; o painel exibe os recursos que falharam e informa quando os dados podem estar incompletos.
- Arquivos mensais com erro não impedem a abertura do painel, mas não são tratados como dados carregados. A interface alerta para revisar os dados antes de usá-los na operação.

## Precedência do estado de plantão
- `carregarConfiguracoes()` pode importar `_estado_plantao` de `dados_historicos/config_reservatorios.json` como fallback.
- Se `window.ccoReconhecidosCarregado` já estiver marcado, a configuração não substitui reconhecimentos nem logs que vieram do `StorageRepository`. Esse sinal é definido após a tentativa de carregar o estado local durante a inicialização em `app.js`.
- Assim, o snapshot do arquivo continua útil em uma primeira carga sem estado local, mas não deve sobrescrever o estado que o navegador já carregou.
