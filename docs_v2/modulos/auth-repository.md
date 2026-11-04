# Módulo: authRepository.js

O arquivo `src/authRepository.js` implementa a persistência local de autenticação, usuários e auditoria de segurança do **Nexo Hídrico**.

> Os dados de autenticação permanecem no navegador. Este mecanismo é um controle básico da interface e não substitui autenticação ou autorização validadas por servidor.

## Responsabilidades
- **Persistência local de autenticação**:
  - **`NexoAuthDB` (Versão 2)**: Contém as stores `usuarios` e `auditoria`. O banco `NexoHandlesDB`, usado para *handles* do File System Access API, é gerenciado separadamente em `app.js`.
  - `legacyMigration.js` copia registros das bases anteriores e renomeia as contas `admin.samae` e `agent.samae` para seus novos identificadores, preservando senhas, papéis, bloqueios, tentativas e auditoria.
  - A separação dos bancos evita compartilhar stores e versões entre essas responsabilidades, mas não elimina qualquer falha possível do IndexedDB.
- **Autoinicialização de contas de demonstração**:
  - Na primeira inicialização de uma store `usuarios` vazia, são criadas as contas `admin.nexo` (`ADMIN`) e `operador.nexo` (`Agent`).
  - As senhas iniciais de demonstração estão definidas no código-fonte. Não as trate como segredos nem use essas contas em produção; altere as credenciais antes de disponibilizar o sistema em qualquer ambiente compartilhado.
- **Políticas de Segurança e Validação**:
  - Validação rigorosa de complexidade de senha via Regex (`/^(?=.*[A-Za-z])(?=.*\d)(?=.*[@$!%*#?&])[A-Za-z\d@$!%*#?&]{8,}$/`).
  - O contador de tentativas e o bloqueio após três senhas incorretas são associados à conta tentada. Um login bem-sucedido zera o contador; sair remove apenas a sessão e não desbloqueia contas.
  - Os eventos de auditoria são mantidos em `window.nexoSecurityLog` e gravados em `NexoAuthDB` quando o armazenamento está disponível; a gravação local não é uma trilha inviolável.
  - A interface não oferece recuperação segura. `atualizarSenha()` altera a senha e limpa o bloqueio local, mas não verifica identidade por um serviço confiável; não é um mecanismo adequado para recuperar contas em produção.
- **Gerenciamento de Sessão e Redefinição**:
  - Verificação de sessão ativa no `localStorage`.
  - Controle da flag `primeiroAcesso`.
  - Cadastro de usuários exige e-mail corporativo e verifica o papel ADMIN no repositório local. Como não há servidor, essa verificação não oferece autorização resistente a adulteração.
