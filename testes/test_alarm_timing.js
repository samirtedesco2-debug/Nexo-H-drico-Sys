const assert = require("assert");
const fs = require("fs");
const path = require("path");
const vm = require("vm");

function executarTestesTempoAlarme() {
  console.log("-> Executando testes de cálculo do tempo de resposta...");

  const context = { window: {}, Map, Date };
  const source = fs.readFileSync(path.join(__dirname, "../src/alarmTiming.js"), "utf8");
  vm.runInNewContext(source, context);

  const tempos = vm.runInNewContext("new Map()", context);
  const acionamento = new Date(2026, 9, 30, 8, 0, 0).getTime();
  tempos.set("2026-10-30_R-01", "30/10/2026 08:00:00");
  tempos.set("R-02", acionamento);

  assert.strictEqual(
    context.window.AlarmTiming.calcularTempoRespostaMs(
      "R-01",
      tempos,
      "2026-10-30",
      acionamento + 120000
    ),
    120000
  );
  assert.strictEqual(
    context.window.AlarmTiming.calcularTempoRespostaMs("R-02", tempos, "2026-10-30", acionamento - 1),
    0
  );
  assert.strictEqual(
    context.window.AlarmTiming.calcularTempoRespostaMs("R-inexistente", tempos, "2026-10-30", acionamento),
    null
  );

  console.log("✓ Tempo calculado pelo timestamp do alarme, sem valores falsos quando ausente.");
}

module.exports = executarTestesTempoAlarme;
