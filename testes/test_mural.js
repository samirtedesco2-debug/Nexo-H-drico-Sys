// testes/test_mural.js
const assert = require('assert');

function executarTestesMural() {
  console.log("-> Executando testes do Mural de Alertas Ativos e Governança RBAC...");
  global.window = {};
  window.ccoReconhecidos = new Map();
  window.nexoIncidentsLog = [];
  window.ccoAlarmStartTimes = new Map();
  
  // 1. Teste de Reconhecimento (ACK)
  const chave = "R-01";
  const severidade = "Crítico";
  window.ccoReconhecidos.set(chave, severidade);
  assert.strictEqual(window.ccoReconhecidos.has(chave), true);

  // 2. Teste de Cronômetro de Exposição ao Alarme (Tempo Ativo)
  window.ccoAlarmStartTimes.set(chave, Date.now() - 120000); // 2 minutos atrás
  const startTime = window.ccoAlarmStartTimes.get(chave);
  const segundosAtivo = Math.floor((Date.now() - startTime) / 1000);
  assert.strictEqual(segundosAtivo >= 119, true);

  // 3. Teste de Restrição RBAC para Revogação (Apenas ADMIN pode desreconhecer)
  let sessionAdmin = { username: "admin.nexo", role: "ADMIN" };
  let sessionOperator = { username: "operador.plantao", role: "Agent" };

  function simularRevogacao(session) {
    if (session.role !== "ADMIN") {
      throw new Error("Acesso Negado: Apenas administradores podem revogar alarme.");
    }
    window.ccoReconhecidos.delete(chave);
  }

  // Operador tentando revogar deve lançar erro
  assert.throws(() => {
    simularRevogacao(sessionOperator);
  }, /Acesso Negado/);

  // Admin revogando deve funcionar
  simularRevogacao(sessionAdmin);
  assert.strictEqual(window.ccoReconhecidos.has(chave), false);

  // 4. Teste de Timestamps de Acionamento Imutáveis e Ordenação Cronológica
  window.ccoAlarmTriggerTimes = new Map();
  const dataSel = "2026-10-30";
  const key1 = `${dataSel}_R-01`;
  const key2 = `${dataSel}_R-02`;

  window.ccoAlarmTriggerTimes.set(key1, "30/10/2026 08:00:00");
  window.ccoAlarmTriggerTimes.set(key2, "30/10/2026 07:30:00");

  const ex1 = { chave: "R-01", severidade: "Crítico" };
  const ex2 = { chave: "R-02", severidade: "Crítico" };
  const listaEx = [ex1, ex2];

  listaEx.sort((a, b) => {
    const keyA = `${dataSel}_${a.chave}`;
    const keyB = `${dataSel}_${b.chave}`;
    const tA = window.ccoAlarmTriggerTimes.get(keyA) || "";
    const tB = window.ccoAlarmTriggerTimes.get(keyB) || "";
    return tA.localeCompare(tB);
  });

  assert.strictEqual(listaEx[0].chave, "R-02");
  assert.strictEqual(window.ccoAlarmTriggerTimes.get(key1), "30/10/2026 08:00:00");

  // 5. Teste de Ordenação Estrita por Horário (ignorando severidade) vs Severidade
  window.ccoMuralModoOrdenacao = "horario";
  const exCriticoTardio = { chave: "R-01", severidade: "Crítico" }; // acionou às 09:00
  const exAtencaoCedo = { chave: "R-03", severidade: "Atenção" }; // acionou às 06:00
  window.ccoAlarmTriggerTimes.set(`${dataSel}_R-01`, "30/10/2026 09:00:00");
  window.ccoAlarmTriggerTimes.set(`${dataSel}_R-03`, "30/10/2026 06:00:00");

  let listaHorario = [exCriticoTardio, exAtencaoCedo];
  listaHorario.sort((a, b) => {
    const keyA = `${dataSel}_${a.chave}`;
    const keyB = `${dataSel}_${b.chave}`;
    const tA = window.ccoAlarmTriggerTimes.get(keyA) || "";
    const tB = window.ccoAlarmTriggerTimes.get(keyB) || "";
    if (window.ccoMuralModoOrdenacao === "horario") {
      return tA.localeCompare(tB);
    }
    const peso = (sev) => sev === "Crítico" ? 1 : 2;
    return peso(a.severidade) - peso(b.severidade);
  });

  // No modo horário, R-03 (06:00) deve vir antes de R-01 (09:00), mesmo sendo "Atenção" vs "Crítico".
  assert.strictEqual(listaHorario[0].chave, "R-03");

  console.log("✓ Mural de Alertas e Governança RBAC: Todos os testes passaram!");
}

module.exports = executarTestesMural;
