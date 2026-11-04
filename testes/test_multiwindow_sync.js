// testes/test_multiwindow_sync.js
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

function executarTestesMultiwindowSync() {
  console.log("-> Executando testes de Sincronização Multi-Janela e Auditoria CCO...");
  
  // Mock localStorage global para Node.js
  const storageMock = {};
  global.localStorage = {
    getItem: (key) => storageMock[key] || null,
    setItem: (key, val) => { storageMock[key] = String(val); },
    removeItem: (key) => { delete storageMock[key]; },
    clear: () => { Object.keys(storageMock).forEach(k => delete storageMock[k]); }
  };

  // Simular Janela A (Principal)
  const windowA = {
    ccoReconhecidos: new Map(),
    nexoIncidentsLog: []
  };

  // Simular Janela B (Mural Pop-up)
  const windowB = {
    ccoReconhecidos: new Map(),
    nexoIncidentsLog: []
  };

  // Ação de ACK na Janela B
  const chaveAlarme = "R-01";
  const severidadeAlarme = "Crítico";
  
  // Janela B reconhece o alarme
  windowB.ccoReconhecidos.set(chaveAlarme, severidadeAlarme);
  const payload = JSON.stringify(Object.fromEntries(windowB.ccoReconhecidos.entries()));
  localStorage.setItem("nexo_hidrico_reconhecidos", payload);
  
  windowB.nexoIncidentsLog.push({
    timestamp: new Date().toISOString(),
    chave: chaveAlarme,
    severidade: severidadeAlarme,
    acao: "Reconhecido"
  });
  localStorage.setItem("nexo_hidrico_incidents_log", JSON.stringify(windowB.nexoIncidentsLog));

  // Simular Sincronização na Janela A (como se o evento storage ou BroadcastChannel ocorresse)
  const reconhecidosSalvos = localStorage.getItem("nexo_hidrico_reconhecidos");
  assert.strictEqual(reconhecidosSalvos !== null, true);
  const objReconhecidos = JSON.parse(reconhecidosSalvos);
  windowA.ccoReconhecidos = new Map(Object.entries(objReconhecidos));

  const logsSalvos = localStorage.getItem("nexo_hidrico_incidents_log");
  windowA.nexoIncidentsLog = JSON.parse(logsSalvos);

  // Asserções
  assert.strictEqual(windowA.ccoReconhecidos.has(chaveAlarme), true);
  assert.strictEqual(windowA.ccoReconhecidos.get(chaveAlarme), severidadeAlarme);
  assert.strictEqual(windowA.nexoIncidentsLog.length, 1);
  assert.strictEqual(windowA.nexoIncidentsLog[0].acao, "Reconhecido");

  // Janela A revoga o alarme
  windowA.ccoReconhecidos.delete(chaveAlarme);
  localStorage.setItem("nexo_hidrico_reconhecidos", JSON.stringify(Object.fromEntries(windowA.ccoReconhecidos.entries())));

  // Janela B sincroniza a revogação
  const reconRevogado = localStorage.getItem("nexo_hidrico_reconhecidos");
  windowB.ccoReconhecidos = new Map(Object.entries(JSON.parse(reconRevogado)));
  assert.strictEqual(windowB.ccoReconhecidos.has(chaveAlarme), false);

  const canais = new Map();
  class BroadcastChannelMock {
    constructor(nome) {
      this.nome = nome;
      this.onmessage = null;
      const inscritos = canais.get(nome) || [];
      inscritos.push(this);
      canais.set(nome, inscritos);
    }

    postMessage(data) {
      (canais.get(this.nome) || []).forEach((canal) => {
        if (canal !== this && canal.onmessage) canal.onmessage({ data });
      });
    }
  }

  function criarJanela() {
    const janela = { ccoReconhecidos: new Map(), nexoIncidentsLog: [] };
    const contexto = {
      window: janela,
      BroadcastChannel: BroadcastChannelMock,
      renderizarDashboardExceccoes() {},
      Map,
      Object
    };
    const source = fs.readFileSync(path.join(__dirname, '../src/ccoSync.js'), 'utf8');
    vm.runInNewContext(source, contexto);
    janela.CcoSync.inicializarCanal();
    return janela;
  }

  const janelaA = criarJanela();
  const janelaB = criarJanela();
  janelaA.ccoChannel.postMessage({
    type: 'SYNC_RECONHECIDOS',
    reconhecidos: { 'R-02': 'Atenção' },
    ackMetadata: { 'R-02': { timestamp: '30/10/2026 09:00:00', operador: 'operador' } },
    incidentsLog: [{ chave: 'R-02', acao: 'Reconhecido' }]
  });
  assert.strictEqual(janelaB.ccoReconhecidos.get('R-02'), 'Atenção');
  assert.strictEqual(janelaB.ccoAckMetadata.get('R-02').operador, 'operador');
  assert.strictEqual(janelaB.nexoIncidentsLog.length, 1);

  janelaA.ccoChannel.postMessage({ type: 'REVOKE_ACK', chave: 'R-02' });
  assert.strictEqual(janelaB.ccoReconhecidos.has('R-02'), false);
  assert.strictEqual(janelaB.ccoAckMetadata.has('R-02'), false);

  console.log("✓ Sincronização Multi-Janela e Auditoria: Todos os testes passaram!");
}

module.exports = executarTestesMultiwindowSync;
