# Módulo: ccoSync.js

O arquivo `src/ccoSync.js` é responsável por centralizar a lógica de sincronização em tempo real (CCO Sync), gerenciamento de janelas dedicadas e o modo CCO/Fullscreen.

## Responsabilidades e Funções
- **`inicializarCanal()`**:
  - Configura o `BroadcastChannel('nexo_hidrico_cco_link')`.
  - Sincroniza reconhecimentos (`ACK_ALARM`), revogações (`REVOKE_ACK`) e snapshots (`SYNC_RECONHECIDOS`) entre abas e janelas, incluindo metadados do ACK e histórico do mural.
  - Cada mensagem de ACK passa por **`atualizarAposMudancaAck()`**, que redesenha o Mural e, na janela dedicada de investigação, o cabeçalho (botão Reconhecer/Reconhecido) a partir de `window.nexoInvestigacaoAtual`.
  - As mensagens são locais às janelas/abas do mesmo navegador; não sincronizam computadores diferentes.
  - `SYNC_RECONHECIDOS` substitui os mapas e o histórico recebidos. Em atualizações simultâneas, um snapshot desatualizado pode sobrescrever uma alteração recente; a sincronização ainda não faz merge nem resolução de conflitos.
- **`abrirMuralSingleton()`**:
  - Garante o comportamento de **janela singleton** para o Mural de Alarmes CCO (`ccoMuralWindow`).
  - Aciona a aba `#tab-alarmes`, que abre a janela `?view=alarmes` ou traz o foco para ela se já estiver aberta.
- **`inicializarModoCCO()`**:
  - Gerencia a transição para o Modo CCO / Telas Grandes (TV 55"), ativando a API de Tela Cheia (`requestFullscreen`) e ajustando a escala visual do aplicativo.
  - O botão global do cabeçalho direciona ao Mural ao ativar o modo CCO.
- **`inicializarModoCCOMural()`**:
  - Gerencia os botões locais de modo CCO do Mural, Operacional, Analítica e Engenharia, ativando/desativando tela cheia sem trocar de visualização.
