# Guia de Migração para Dados em Tempo Real e Integração Corporativa CCO

Este documento centraliza todas as diretrizes, observações arquiteturais e o checklist técnico para a transição completa do sistema de arquivos estáticos (`dados_historicos/`) para a telemetria corporativa em **tempo real** (via API REST, WebSocket ou SSE - Server-Sent Events) na rede do SAMAE.

## 1. Checklist Técnico de Migração

- [ ] **Fonte de Dados (API / WebSocket / SSE)**: Substituir o carregamento estático dos arquivos JSON mensais (`dados_historicos/2026_XX.json`) por endpoints corporativos em tempo real ou streaming em tempo real fornecidos pelo CCO SAMAE.
- [ ] **Persistência de Reconhecimentos (*ACKs*) e Auditoria**:
  - *Estado Atual*: Sincronização síncrona em `localStorage`, `StorageRepository` (IndexedDB) e `BroadcastChannel` / `storage` events, com suporte a múltiplas janelas em segundo monitor para operadores CCO.
  - *Ação em Tempo Real*: Substituir o armazenamento local pelo endpoint da API REST de ACKs e trilha de auditoria do servidor central do SAMAE, mantendo os mesmos contratos de dados (`chave`, `severidade`, `timestamp`, `usuario`, `acao`).
- [ ] **Média Móvel (Filtro de Ruído)**:
  - *Estado Atual*: Janela configurável em `src/regrasNegocio.js`.
  - *Ação em Tempo Real*: Ajustar conforme calibração dos sensores físicos em campo.
- [ ] **Vazão de Entrada (`vazaoEntrada`)**:
  - *Estado Atual*: Mapeado com fallback preditivo.
  - *Ação em Tempo Real*: Garantir que o payload do backend envie `reservatorio.leituras.vazaoEntrada` para alimentar o balanço hidráulico (*Net Flow*) com precisão milimétrica.
- [ ] **Atualização Periódica (Polling / Push)**:
  - Configurar intervalo de atualização na interface (`app.js`) para refletir novas telemetrias sem recarregamento manual.

## 2. Arquitetura de Sincronização Multi-Monitor
O sistema já está totalmente preparado para operação em múltiplos monitores (ex: TV LED / Monitor Principal com Visão Operacional e Monitor Secundário com o Mural de Alertas CCO em pop-up dedicado via `window.open`). A transição para tempo real aproveitará a infraestrutura de eventos `BroadcastChannel` já estabelecida (`nexo_hidrico_cco_link`).

## 3. Pontos de Código Marcados (`TODO: [TEMPO_REAL]`)
Procure por `TODO: [TEMPO_REAL]` no código-fonte (`src/regrasNegocio.js`, `src/apiClient.js`, etc.) para localizar os pontos de integração com a telemetria corporativa.
