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
- **Dados** — `apiClient.js` é a única porta de entrada: carrega `indice_datas.json`, `dados_historicos/AAAA_MM.json` (um por mês), `config_reservatorios.json` e `taxonomia_alarmes.json` (este vira `window.taxonomiaAlarmes`). Falhas são registradas em `avisosCarregamento` e exibidas na UI, nunca silenciadas. `app.js` (`inicializarBancoAssincrono`) faz `window.bancoDeDados = await ApiClient.inicializarBanco()`. `src/dados.js` (~123 mil linhas, 3 MB) é um snapshot legado que define o mesmo `window.bancoDeDados`, mas é sobrescrito logo na inicialização; hoje só sobra como fallback silencioso se `inicializarBanco` lançar erro. Não o abra inteiro nem edite à mão. Os JSONs em `dados_historicos/` e `indice_datas.json` são gerados por `python/atualizar_dados.py` a partir de planilhas (`.xlsx`, ignoradas pelo git).
- **Formato dos dados** — `banco.historico["dd/mm/aaaa"] = { ultimaAtualizacao: "dd/mm/aaaa hh:mm", horarios: [...], reservatorios: { <chave>: { nome, grupo, kpis, leituras: { nivel: [...], vazao: [...] } } } }`. São 6 leituras por dia (00:15 a 05:15, boletim da madrugada). O horário `ultimaAtualizacao` é do dia, não do sensor; o reservatório não tem `tag` nem timestamp próprio (a TAG vem de `obterConfiguracaoReservatorio(chave).tag`).
- **Regras** — `regrasNegocio.js` concentra status de nível, alerta de vazão, balanço hidráulico e autonomia preditiva; não deve depender de DOM. `alarmTiming.js` calcula tempo de resposta.
- **UI** — `ui.js` (cartões, painéis, tabelas, painel de investigação) e `graficos.js` (Chart.js) só renderizam; `app.js` é o orquestrador (eventos, exportação/PDF, roteamento por `?view=`).
- **Persistência local** — `storageRepository.js` (reconhecimentos/ACK e logs de incidentes em IndexedDB `NexoCCOStorageDB`, com espelho em `localStorage`, chaves `nexo_hidrico_*`), `authRepository.js` (usuários e auditoria em IndexedDB `NexoAuthDB`; handles de arquivo em `NexoHandlesDB`, gerido pelo `app.js`), `legacyMigration.js` (migra bancos e chaves antigos `Samae*`/`samai_*` sem apagá-los). A configuração por reservatório fica em `localStorage` (`nexo_hidrico_reservatorios_config`) e tem precedência sobre `config_reservatorios.json`.
- **Multi-janela** — `ccoSync.js` sincroniza via `BroadcastChannel` a janela singleton do Mural de Alarmes; `app.js` também abre `?view=configuracoes`. A view `?view=investigacao` é a visão dedicada de investigação de alarme (`renderizarPainelInvestigacaoDedicado` em `ui.js`).
- **Acesso** — `authUI.js` + `rbac.js` (perfis `ADMIN` e `Agent`). Tudo roda no navegador: é controle local, não segurança de servidor. Os usuários iniciais estão fixos em `authRepository.js`, as senhas ficam em texto puro no IndexedDB e a sessão é só `{username, role}` em `localStorage`, editável pelo usuário.

## Armadilhas conhecidas

- **`avaliarStatusNivel` existe duas vezes** como função global: a completa em `regrasNegocio.js` (limites por reservatório, manutenção, auditoria de leituras, `Inconsistente`) e uma simples em `app.js`. Como `app.js` carrega por último, **a versão simples é a que roda**: ignora limites por reservatório, manutenção e a auditoria de sensor, e nunca devolve `Inconsistente` (logo `ALM-DAT-02` não aparece). Corrigir muda os alarmes exibidos; só com autorização e testes.
- Na janela `?view=investigacao`, o cabeçalho (`#cco-lean-investigation-header`) é de `renderizarPainelInvestigacaoDedicado`; `atualizarHeaderEnxutoInvestigacao` usa o mesmo id e por isso retorna sem fazer nada nessa view.
- O código de alarme de vazão (`ALM-VAZ-01`/`02`) segue a **direção** do desvio, não a severidade; a classificação única está em `classificarAlarmesAtivos` (`regrasNegocio.js`).
- `docs_v2` tem trechos defasados (ex.: `fluxo-navegacao.md` cita `?view=operacional` e a tecla Esc para a investigação; a view real é `?view=investigacao`, e o Esc só vale no modo dentro da página).

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
