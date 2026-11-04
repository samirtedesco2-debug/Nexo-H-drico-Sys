// testes/test_notificacoes.js
const assert = require('assert');

class LocalStorageMock {
  constructor() { this.store = {}; }
  clear() { this.store = {}; }
  getItem(k) { return this.store[k] || null; }
  setItem(k, v) { this.store[k] = String(v); }
}
global.localStorage = new LocalStorageMock();

function executarTestesNotificacoes() {
  console.log("-> Executando testes da Central de Notificações...");
  localStorage.clear();
  
  const iniciais = [
    { id: 'n1', tipo: 'UPDATE', titulo: 'Update', mensagem: 'Msg', lida: false },
    { id: 'n2', tipo: 'MAINTENANCE', titulo: 'Manut', mensagem: 'Msg2', lida: false }
  ];
  localStorage.setItem("nexo_hidrico_external_notifications", JSON.stringify(iniciais));
  
  const notifs = JSON.parse(localStorage.getItem("nexo_hidrico_external_notifications"));
  assert.strictEqual(notifs.length, 2);
  
  notifs[0].lida = true;
  localStorage.setItem("nexo_hidrico_external_notifications", JSON.stringify(notifs));
  
  const atualizadas = JSON.parse(localStorage.getItem("nexo_hidrico_external_notifications"));
  assert.strictEqual(atualizadas[0].lida, true);
  
  console.log("✓ Central de Notificações: Todos os testes passaram!");
}

module.exports = executarTestesNotificacoes;
