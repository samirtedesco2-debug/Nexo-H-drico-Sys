# Visão Geral & Arquitetura

O sistema é uma aplicação web interativa desenvolvida em **Vanilla JavaScript**, estruturada em módulos independentes na pasta `src/`.

## Estrutura de Arquivos e Módulos (`src/`)

- **`apiClient.js`**: Gerencia chamadas e integração com fontes externas de dados.
- **`alarmTiming.js`**: Calcula o tempo de resposta a partir do timestamp de acionamento salvo, sem estimar valores quando não há horário válido.
- **`app.js`**: Ponto de entrada principal que orquestra a aplicação, tratamento global de erros, exportações e eventos de UI.
- **`authRepository.js`**: Camada local de persistência de usuários e auditoria no IndexedDB `NexoAuthDB`. O banco de handles `NexoHandlesDB` é gerenciado separadamente pelo `app.js`.
- **`legacyMigration.js`**: Migra dados locais de versões anteriores para os identificadores Nexo sem remover as bases legadas.
- **`authUI.js`**: Gerencia a interface de login, primeiro acesso e mensagens de recuperação de acesso. O fundo da tela de login usa `manual-imagens/login.jfif`.
- **`ccoSync.js`**: Sincronização em tempo real e gerenciamento de janela singleton (`ccoMuralWindow`) para o Mural de Alarmes CCO via `BroadcastChannel`.
- **`dados.js`**: Carrega e processa dados históricos e índices temporais (`indice_datas.json`).
- **`graficos.js`**: Integração com Chart.js para renderização de gráficos analíticos e de engenharia.
- **`rbac.js`**: Aplica restrições de interface para os perfis `ADMIN` e `Agent`; por ser uma aplicação local sem autorização de servidor, não constitui uma barreira de segurança contra adulteração.
- **`regrasNegocio.js`**: Concentra toda a lógica operacional, cálculos de média móvel, balanço hidráulico e autonomia preditiva.
- **`ui.js`**: Responsável pela renderização de componentes de interface, cartões de reservatórios e painéis preditivos.

## Princípios de Projeto
- **Modularidade**: Regras de negócio estritamente separadas da interface de usuário e camadas de autenticação.
- **Resiliência**: Fallback automático para modo somente nível quando dados de vazão estiverem ausentes e isolamento robusto de bancos IndexedDB.
- **Estética & Usabilidade**: Padrão visual moderno com suporte a temas, telas grandes (TV 55") e indicadores codificados por cores intuitivas.
