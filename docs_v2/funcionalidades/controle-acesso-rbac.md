# Manual Completo: Sistema de Controle de Acesso Baseado em Papéis (RBAC) e Segurança Industrial CCO

Este manual descreve a arquitetura, o funcionamento técnico, os fluxos de autenticação, as políticas de segurança e os controles de privilégios implementados no sistema **Nexo Hídrico**.

> **Limitação importante:** a autenticação e o RBAC atuais são locais ao navegador. São controles básicos da interface, não uma barreira confiável contra adulteração por alguém com acesso ao dispositivo. Não os use como única proteção para dados sensíveis ou permissões de produção.

---

## 1. Visão Geral da Arquitetura Atual

O módulo de autenticação e controle de acesso foi construído de forma **desacoplada e modular** no diretório `src/`:
* **`src/authRepository.js`**: Camada de repositório local via **IndexedDB** (`NexoAuthDB`), gerenciamento de usuários, validação de senhas por Regex, bloqueio após tentativas falhas e registro de auditoria.
* **`src/authUI.js`**: Camada de interface de autenticação (login, primeiro acesso e orientação sobre recuperação).
* **`src/rbac.js`**: Aplica restrições de interface com base no perfil local; não substitui autorização validada por servidor.

---

## 2. Infraestrutura de Usuários Durável (IndexedDB)

O banco de dados local **`NexoAuthDB`** gerencia as stores `usuarios` e `auditoria`. Quando a store de usuários está vazia, o sistema cria duas contas de demonstração:
1. **Administrador (`admin.nexo`)**
   * **Papel (Role):** `ADMIN`
2. **Operador de Plantão (`operador.nexo`)**
   * **Papel (Role):** `Agent`

As senhas iniciais estão definidas no código-fonte e não são segredos. Troque-as antes de compartilhar o ambiente; essas contas locais não devem ser usadas como credenciais de produção. As contas e seus bloqueios ficam no armazenamento do navegador, associados à origem e ao perfil do navegador.

### Cadastro de Novos Usuários pelo ADMIN
O painel de configurações apresenta o formulário de cadastro para a sessão local com perfil `ADMIN`. O repositório também confere o papel informado ao cadastrar, mas essa verificação ocorre apenas no navegador e não é uma barreira de segurança contra adulteração.
* A senha padrão gerada no cadastro é automaticamente o primeiro nome do usuário em letras minúsculas (ex.: `carlos.silva` recebe inicialmente `carlos`).
* O registro nasce com a flag **`primeiroAcesso: true`**, obrigando a alteração imediata no primeiro login.
* O cadastro é feito pelo formulário de gerenciamento de usuários no painel de configurações; não é necessário usar o Console do navegador.

---

## 3. Políticas de Segurança Industrial

### A. Política de Bloqueio por Força Bruta
* O sistema monitora as tentativas consecutivas de senha incorreta.
* A partir da **3ª tentativa falha**, a conta é automaticamente bloqueada (`bloqueado: true`).
* O bloqueio é individual por conta: falhas ao autenticar um usuário não devem bloquear outro. Um login bem-sucedido zera o contador; sair da sessão não desbloqueia a conta.
* A recuperação automática por e-mail está desativada: o cliente local não comprova acesso ao e-mail nem oferece uma ferramenta segura de recuperação. Procure o responsável técnico por um canal institucional; não apague os dados do site, pois isso pode remover usuários e registros locais.
* O método local `atualizarSenha()` também remove o bloqueio, mas não verifica a identidade por um canal confiável. Não o considere um procedimento seguro de recuperação para produção.

### B. Validação Rigorosa de Complexidade de Senha (Regex)
Toda senha definida no primeiro acesso ou por atualização local deve atender à seguinte política de complexidade:
* **Mínimo de 8 caracteres.**
* Pelo menos **1 letra** (maiúscula ou minúscula).
* Pelo menos **1 número**.
* Pelo menos **1 caractere especial** (`@$!%*#?&`).
* *Regex de Validação:* `/^(?=.*[A-Za-z])(?=.*\d)(?=.*[@$!%*#?&])[A-Za-z\d@$!%*#?&]{8,}$/`

### C. Trilha de Auditoria de Segurança (`nexoSecurityLog`)
As ações de segurança são adicionadas à variável `window.nexoSecurityLog` e gravadas na store `auditoria` do IndexedDB quando o armazenamento está disponível. Como os registros são locais, não constituem uma trilha inviolável:
* Eventos registrados: `LOGIN_SUCESSO`, `LOGIN_FALHOU`, `LOGIN_BLOQUEADO`, `CONTA_BLOQUEADA_FORCA_BRUTA`, `ATUALIZAR_SENHA`, `CADASTRAR_USUARIO`.
* Cada registro armazena `timestamp`, `usuario`, `acao` e `detalhes`.

---

## 4. Fluxos de Autenticação e Painel ADMIN

1. **Tela de Login:**
   * Overlay de login com a imagem de fundo `manual-imagens/login.jfif`.
   * Exigência obrigatória de login no carregamento inicial (`DOMContentLoaded`).
2. **Primeiro Acesso & Recuperação:**
   * O primeiro acesso exige uma senha definitiva validada por complexidade. A recuperação automática não está disponível nesta versão; informar um e-mail, sem validação externa, não autoriza a redefinição. O responsável técnico pode orientar o usuário sobre os próximos passos.
3. **Gerenciamento de Usuários (Painel ADMIN):**
   * O formulário de cadastro é apresentado no painel de configurações quando a sessão local tem perfil `ADMIN`; as restrições de perfil são aplicadas no navegador.
   * Permite cadastrar novos operadores (`Agent`) ou administradores (`ADMIN`) informando obrigatoriamente o e-mail corporativo individual (sem geração automática de e-mail).
4. **Isolamento de Bancos IndexedDB:**
   * **`NexoAuthDB` (Versão 2):** Gerencia as stores `usuarios` e `auditoria`.
   * **`NexoHandlesDB` (Versão 1):** Gerencia os *handles* de arquivos do File System Access API separadamente, reduzindo conflitos de versão entre responsabilidades.

A primeira inicialização após a troca de identidade migra os bancos e chaves locais anteriores, incluindo as contas de demonstração para `admin.nexo` e `operador.nexo`. Senhas, papéis, bloqueios, tentativas, sessões e demais dados são copiados; as bases antigas são mantidas como cópia de segurança.

---

## 5. Parâmetros Globais Dedicados

* Acessíveis através do botão dedicado **`#btn-config-parametros-globais`** no painel de configurações, separados dos formulários individuais de reservatórios.
* Contém o **Formulário I** (Passagem de plantão, e-mails de destino e grade de Timers de disparos automáticos) e o **Formulário II** (E-mails da manutenção, logs de erro, SLA e Cron).
* **Alarmes de Vazão — base de comparação dos alarmes** (`#cfg-base-comparacao-alarme`, gravada em `nexo_hidrico_global_config.baseComparacaoAlarme`). Padrão: mesmo dia da semana (`same-weekday-4`): por horário, os 4 dias mais recentes com vazão válida, buscando até 8 semanas para trás. Vale para o Mural, a investigação, a OS, o informativo do alarme e o resumo de plantão; o seletor "Base de comparação (análise)" da tela operacional não muda os alarmes. Só ADMIN salva (o formulário recusa outro perfil) e cada troca gera `BASE_ALARME_ALTERADA` na auditoria. Valor inválido usa o padrão e exibe aviso; as janelas abertas recalculam pelo evento `storage`.

---

## 6. Travas de Privilégios na Interface (RBAC)

* **Perfil `Agent` (Operador de Plantão):**
  * **Configurações:** Campos de parametrização, gerenciamento de usuários e parâmetros globais ocultos ou bloqueados.
  * **Engenharia:** Aba de relatórios históricos de SLA e auditoria oculta.
  * **Mural de Alertas:** O botão de reconhecimento (*ACK*) opera em modo de clique único com restrição de confirmação (`✓ Ciência Dada`).
* **Perfil `ADMIN` (Administrador):**
  * Acesso irrestrito a todas as configurações, cadastro de novos usuários com e-mail corporativo obrigatório, relatórios de engenharia, painéis de auditoria e ferramentas operacionais.

Esses perfis afetam a interface e os dados locais do navegador. Até a centralização da autenticação e autorização em um serviço confiável, não use o RBAC local para proteger dados sensíveis ou permissões de produção.
