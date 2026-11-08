# Nexo Hídrico — Documentação do Centro de Controle Operacional

Esta é a documentação técnica e operacional do **Nexo Hídrico**, sistema de monitoramento de reservatórios, alarmes e apoio à operação.

![Logotipo Nexo Hídrico](../manual-imagens/nexo-hidrico-logo.jpg)

## Sobre o nome

**Nexo Hídrico** une duas ideias. **“Nexo”** representa ligação, contexto e integração: os dados dos reservatórios, os alarmes e a atuação das equipes fazem parte de uma mesma visão operacional. **“Hídrico”** identifica o elemento central desse trabalho — a água, seus níveis, vazões e estruturas de armazenamento.

Juntos, os termos sugerem um ponto de conexão entre informação e operação. O nome traduz a proposta do sistema: organizar dados e ocorrências para facilitar o acompanhamento dos reservatórios e apoiar decisões mais claras e coordenadas. É uma identidade que remete a monitoramento e gestão, sem afirmar que a plataforma substitui a avaliação dos operadores ou que todos os dados são transmitidos em tempo real.

Esta documentação foi estruturada em pastas e subpastas organizadas por áreas, mantendo a pasta antiga (`docs/`) preservada para fins históricos.

O histórico cronológico de melhorias, com contexto de antes/depois, motivos e validações, está em [MELHORIAS.md](../MELHORIAS.md).

## Estrutura de Pastas e Módulos

1. **Arquitetura (`arquitetura/`)**:
   - [Visão Geral & Arquitetura](./arquitetura/visao-geral.md)
   - [Mapa Técnico do DOM (IDs e Classes)](./arquitetura/mapa-dom.md)
   - [Interface e Estilos (`index.html` & `styles.css`)](./arquitetura/estilos-interface.md)
   - [Fluxo de Navegação & Sitemap](./arquitetura/fluxo-navegacao.md)

2. **Módulos do Sistema (`modulos/`)**:
   - [Orquestrador Principal (`app.js`)](./modulos/app.md)
   - [Migração de dados locais legados (`legacyMigration.js`)](./modulos/app.md#migração-de-identificadores-locais)
   - [Persistência de Alarmes (`storageRepository.js`)](./modulos/storage-repository.md)
   - [Repositório de Autenticação & IndexedDB (`authRepository.js`)](./modulos/auth-repository.md)
   - [Interface de Autenticação & Login (`authUI.js`)](./modulos/auth-ui.md)
   - [Controle de Acesso Baseado em Papéis - RBAC (`rbac.js`)](./modulos/rbac.md)
   - [Sincronização e Janela CCO (`ccoSync.js`)](./modulos/cco-sync.md)
   - [Interface de Usuário (`ui.js`)](./modulos/ui.md)
   - [Cálculo do Tempo de Resposta (`alarmTiming.js`)](./modulos/alarm-timing.md)
   - [Regras de Negócio & Motor Preditivo (`regrasNegocio.js`)](./modulos/regras-negocio.md)
   - [Gráficos & Visualização (`graficos.js`)](./modulos/graficos.md)
   - [Processamento de Dados & Histórico (`dados.js`)](./modulos/dados.md)
   - [Cliente de API & Configurações (`apiClient.js`)](./modulos/api-client.md)

3. **Funcionalidades Operacionais (`funcionalidades/`)**:
   - [Controle de Acesso (RBAC) & Segurança Industrial](./funcionalidades/controle-acesso-rbac.md)
   - [Motor de Autonomia Preditiva e Balanço Hidráulico](./funcionalidades/motor-preditivo.md)
   - [Parametrização e Regras de Alarme](./funcionalidades/parametrizacao.md)
   - [Guia de Migração para Tempo Real](./funcionalidades/migracao-tempo-real.md)
   - [Possíveis Melhorias Futuras](./funcionalidades/possiveis-melhorias.md)

## Convenções para novas alterações

- Mantenha os nomes e o idioma consistentes com o módulo; no domínio do sistema, os identificadores JavaScript existentes usam principalmente português e `camelCase`.
- Preserve as convenções de classes CSS já presentes; evite renomeações abrangentes sem benefício funcional.
- Prefira regras de estilo em `styles.css` a novos estilos inline e mova estilos existentes apenas quando uma mudança relacionada justificar.
- Faça extrações pequenas quando elas separarem responsabilidades e forem cobertas por testes; não divida módulos apenas para atingir um limite de linhas.
- Execute `npm ci`, `npm test` e `npm run test:e2e` antes de integrar mudanças. No Linux, instale o Playwright e suas dependências de sistema com `npx playwright install --with-deps chromium`; em outros sistemas, use `npx playwright install chromium`. A integração contínua valida sintaxe e executa ambas as suítes.
- Os testes de navegador usam contas e dados locais de demonstração. Não reutilize credenciais reais; o ensaio manual com operadores deve ocorrer em ambiente de teste, sem provocar alarmes reais.

---
*Nexo Hídrico — Inteligência Operacional*
