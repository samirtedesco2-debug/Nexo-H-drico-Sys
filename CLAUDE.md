# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Projeto

Nexo Hídrico: painel web (Vanilla JS, sem build, sem framework) do CCO para monitorar reservatórios, alarmes e vazões. Idioma do domínio e dos identificadores: português, `camelCase`. Documentação técnica em `docs_v2/README.md`; histórico de mudanças em `MELHORIAS.md`. Atualize a documentação relacionada quando mudar comportamento ou arquitetura.

## Comandos

```bash
npm test                          # testes unitários (Node puro, sem framework): node testes/run_tests.js
npm run test:e2e                  # Playwright (Chromium); sobe http-server na porta 4173 sozinho
npx playwright test -g "trecho"   # um teste E2E específico
node --check src/ui.js            # verificação de sintaxe (o CI roda em src/, testes/, e2e/)
iniciar.bat                       # servidor local: npx http-server -p 4173 -d false (abre http://127.0.0.1:4173)
```

- Não há runner por arquivo: cada `testes/test_*.js` exporta uma função chamada por `testes/run_tests.js`. Para rodar só um: `node -e "require('./testes/test_regras')()"` (use `await` nos que são assíncronos, como login, storage e api client). Novos testes precisam ser registrados em `run_tests.js`.
- Não rode a suíte completa/E2E a cada alteração trivial; apenas quando pedido ou em marcos de entrega (regra do `GEMINI.md`).
- O CI (`.github/workflows/testes.yml`) roda sintaxe, `npm test` e `npm run test:e2e` em Node 22.
- Precisa de servidor HTTP: abrir `index.html` por `file://` quebra os `fetch` dos dados.

## Arquitetura

Sem bundler: `index.html` carrega os scripts em ordem fixa, todos globais em `window`. A ordem importa (`legacyMigration → apiClient → dados → regrasNegocio → graficos → storageRepository → alarmTiming → ui → ccoSync → authRepository → rbac → authUI → app`). Cada script tem `?v=N` na URL: **incremente o `N` em `index.html` ao editar o arquivo**, senão o navegador serve cache antigo. Chart.js vem de CDN.

Camadas (o fluxo de dados passa por todas):
- **Dados** — `apiClient.js` é a única porta de entrada: carrega `indice_datas.json`, `dados_historicos/AAAA_MM.json` (um por mês), `config_reservatorios.json` e `taxonomia_alarmes.json` (este vira `window.taxonomiaAlarmes`). Falhas são registradas em `avisosCarregamento` e exibidas na UI, nunca silenciadas. `src/dados.js` (~123 mil linhas, define `window.bancoDeDados`) é um snapshot gigante: não abra inteiro nem edite à mão. Os JSONs em `dados_historicos/` e `indice_datas.json` são gerados por `python/atualizar_dados.py` a partir de planilhas (`.xlsx`, ignoradas pelo git).
- **Regras** — `regrasNegocio.js` concentra status de nível, alerta de vazão, balanço hidráulico e autonomia preditiva; não deve depender de DOM. `alarmTiming.js` calcula tempo de resposta.
- **UI** — `ui.js` (cartões, painéis, tabelas, painel de investigação) e `graficos.js` (Chart.js) só renderizam; `app.js` é o orquestrador (eventos, exportação/PDF, roteamento por `?view=`).
- **Persistência local** — `storageRepository.js` (alarmes/incidentes/ack em `localStorage`, chaves `nexo_hidrico_*`), `authRepository.js` (usuários e auditoria em IndexedDB `NexoAuthDB`; handles de arquivo em `NexoHandlesDB`, gerido pelo `app.js`), `legacyMigration.js` (migra chaves antigas `samai_*` sem apagá-las).
- **Multi-janela** — `ccoSync.js` sincroniza via `BroadcastChannel` a janela singleton do Mural de Alarmes; `app.js` também abre `?view=configuracoes`. A view `?view=investigacao` é a visão dedicada de investigação de alarme (`renderizarPainelInvestigacaoDedicado` em `ui.js`).
- **Acesso** — `authUI.js` + `rbac.js` (perfis `ADMIN` e `Agent`). Tudo roda no navegador: é controle local, não segurança de servidor.

## Regras do domínio (de `.github/copilot-instructions.md`)

- Os dados são arquivos históricos estáticos, **não** telemetria em tempo real. Nunca descreva fixtures/dados sintéticos como telemetria, nem alegue integração em tempo real; trocar `apiClient.js` sozinho não resolve essa migração (ver `docs_v2/funcionalidades/migracao-tempo-real.md`).
- Não altere limites de alarme, unidades, fórmulas hidráulicas, regras preditivas ou o fluxo de reconhecimento (ack) sem autorização explícita, justificativa e testes.
- Dados ausentes, inválidos ou desatualizados devem aparecer como tal (ex.: `N/A`, aviso de carregamento). Não invente leituras nem apresente o último valor como atual; evite fallbacks silenciosos.
- Não inclua segredos nem dados pessoais em código, testes ou docs.

## Fluxo de trabalho

- Antes de editar código ou configuração, apresente objetivo, estratégia, arquivos afetados, riscos e validações e aguarde autorização para aquele escopo (vale também para `GEMINI.md` e `.github/copilot-instructions.md`). Autorização de uma tarefa não cobre mudanças futuras ou não relacionadas.
- Preserve alterações pré-existentes do usuário na árvore git; prefira a menor mudança completa e mantenha as convenções existentes, sem novas abstrações ou dependências sem necessidade.
- Em `ui.js`, monte DOM com `createElement`/`textContent` em vez de `innerHTML` com dados dinâmicos.
- `.github/agents/` define sub-agentes do projeto (engenheiro de software, especialista de dados, especialista de QA e operador CCO).
- Commits seguem Conventional Commits em português (`feat(cco): ...`, `feat(agents): ...`).
