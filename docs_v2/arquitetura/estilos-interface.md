# Interface e Estilos (`index.html` & `styles.css`)

Define a estrutura HTML da aplicação e o design system em CSS.

## Destaques
- **`styles.css`**: Contém variáveis de cores (incluindo `--status-critical-color` e `--status-normal-color`), estilização de cartões, botões, modais e responsividade. No Mural CCO, também define estados vazios (`.mural-empty-state`), selo de reconhecimento (`.mural-ack-badge`), foco de teclado e botão de abertura de reservatório na tabela.
- **`index.html`**: Contém os containers principais, barras de navegação, modais e scripts com controle de versão de cache por query string. `alarmTiming.js` é carregado antes de `ui.js`.
- **Identidade visual**: O logotipo `manual-imagens/nexo-hidrico-logo.jpg` e a assinatura “Inteligência Operacional” aparecem no cabeçalho e na tela de login; `manual-imagens/nexo-hidrico-icon.png` é usado como favicon. O nome da aba é definido no `<title>` do `index.html`.
- **Mural CCO**: Contadores incluem todos os alarmes ativos, reconhecidos ou não. O estado de ACK é indicado por selo, sem reduzir a opacidade ou ocultar a severidade. Estados vazios diferenciam falta de alarmes de busca sem correspondência.
