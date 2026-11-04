# Módulo: authUI.js

O arquivo `src/authUI.js` gerencia a interface de autenticação e controle de acesso do **Nexo Hídrico**.

## Responsabilidades
- **Renderização da Tela de Login em Tela Cheia**:
  - Overlay com imagem de fundo carregada de `manual-imagens/login.jfif`.
  - Exibe o logotipo `manual-imagens/nexo-hidrico-logo.jpg` e a assinatura “Inteligência Operacional”.
  - Formulário de credenciais com campos rotulados, alternância acessível para mostrar/ocultar a senha e feedback visual quando a autenticação falha.
- **Primeiro Acesso e Recuperação**:
  - Exibição automática da troca de senha obrigatória quando a flag `primeiroAcesso` está ativa.
  - A interface informa que a recuperação automática não está disponível e orienta procurar o responsável técnico por um canal institucional; informar um e-mail não comprova a identidade.
  - Validação estrita de complexidade de senha na UI.
- **Integração com o Fluxo de Inicialização**:
  - A verificação da sessão é iniciada no evento `DOMContentLoaded` de `src/app.js`. A sessão local é guardada em `localStorage`; isso controla a interface, mas não fornece autenticação validada por servidor.
  - Após autenticação bem-sucedida, a página é recarregada. A ação de sair, configurada por `rbac.js`, remove a sessão local, mas não altera nem desbloqueia a conta.
