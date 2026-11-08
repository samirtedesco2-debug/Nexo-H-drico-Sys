const assert = require("assert");
const fs = require("fs");
const path = require("path");
const vm = require("vm");

function executarTestesAvisoCarregamento() {
  const aviso = {
    hidden: true,
    children: [],
    replaceChildren() {
      this.children = [];
    },
    appendChild(child) {
      this.children.push(child);
    }
  };
  const document = {
    getElementById: (id) => id === "data-load-status" ? aviso : null,
    createElement: (tag) => ({ tag, textContent: "", children: [], appendChild(child) { this.children.push(child); } })
  };
  const contexto = { document, window: {} };
  const source = fs.readFileSync(path.join(__dirname, "../src/ui.js"), "utf8");
  vm.runInNewContext(source, contexto);

  contexto.renderizarAvisoCarregamentoDados([
    { recurso: "dados_historicos/2026_11.json", motivo: "Resposta HTTP 404" }
  ]);
  assert.strictEqual(aviso.hidden, false);
  assert.strictEqual(aviso.children[0].textContent.includes("incompletos"), true);
  assert.strictEqual(aviso.children[1].children[0].textContent, "dados_historicos/2026_11.json: Resposta HTTP 404");

  contexto.renderizarAvisoCarregamentoDados([]);
  assert.strictEqual(aviso.hidden, true);
  assert.strictEqual(aviso.children.length, 0);

  console.log("✓ Avisos de carga parcial são exibidos e removidos quando não há falhas.");
}

function executarTesteEstadoInicialNavegacao() {
  const html = fs.readFileSync(path.join(__dirname, "../index.html"), "utf8");

  assert.ok(!html.includes('class="view-tab is-active"'), "Ao abrir, nenhuma aba deve estar ativa.");
  assert.ok(!html.includes('aria-selected="true"'), "Nenhuma aba deve iniciar marcada como selecionada.");
  assert.ok(html.includes('id="tab-operacional"'), "A aba operacional deve continuar existindo.");
  assert.ok(html.includes('id="tab-alarmes"'), "A opção do Mural deve permanecer presente na página inicial.");
  assert.ok(html.includes('class="view-launcher"'), "A tela inicial deve apresentar cartões de visualização.");
  assert.ok(html.includes("Escolha uma visão"), "O título da área de escolha deve estar disponível.");

  console.log("✓ A tela inicial apresenta opções visuais sem selecionar uma aba automaticamente.");
}

module.exports = {
  executarTestesAvisoCarregamento,
  executarTesteEstadoInicialNavegacao,
};
