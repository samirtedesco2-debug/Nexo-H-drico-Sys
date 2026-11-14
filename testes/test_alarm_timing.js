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
  tempos.set("2026-10-30_R-02", acionamento);
  // Registro antigo (só o reservatório): não pode ser usado, podia ser de outro dia.
  tempos.set("R-03", acionamento);

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
  assert.strictEqual(
    context.window.AlarmTiming.calcularTempoRespostaMs("R-03", tempos, "2026-10-30", acionamento + 1000),
    null,
    "a chave antiga sem data não deve ser usada"
  );
  assert.strictEqual(
    context.window.AlarmTiming.calcularTempoRespostaMs("R-01", tempos, undefined, acionamento + 1000),
    null,
    "sem data não há registro a usar"
  );
  assert.strictEqual(
    context.window.AlarmTiming.calcularTempoRespostaMs("R-01", tempos, "2026-10-31", acionamento + 1000),
    null,
    "o registro de outra data não vale"
  );

  console.log("✓ Tempo calculado pelo timestamp do alarme, sem valores falsos quando ausente.");
}

module.exports = executarTestesTempoAlarme;
