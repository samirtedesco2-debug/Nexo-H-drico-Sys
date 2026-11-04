const assert = require("assert");
const fs = require("fs");
const path = require("path");
const vm = require("vm");

function executarTestesRecuperacaoDesativada() {
  const overlay = { style: {}, innerHTML: "" };
  const linkVoltar = { onclick: null };
  const document = {
    body: { appendChild() {} },
    createElement: () => overlay,
    getElementById: (id) => {
      if (id === "nexo-auth-overlay") return overlay;
      if (id === "link-voltar-login") return linkVoltar;
      return null;
    }
  };
  const window = {};
  const contexto = { document, window };
  const source = fs.readFileSync(path.join(__dirname, "../src/authUI.js"), "utf8");

  vm.runInNewContext(source, contexto);
  window.AuthUI.exibirModalRecuperacao();

  assert.match(overlay.innerHTML, /A recuperação automática não está disponível nesta versão/);
  assert.match(overlay.innerHTML, /Não compartilhe sua senha/);
  assert.strictEqual(overlay.innerHTML.includes("nexo-recup-form"), false);
  assert.strictEqual(typeof linkVoltar.onclick, "function");

  const contextoRepositorio = { window: {} };
  const sourceRepositorio = fs.readFileSync(path.join(__dirname, "../src/authRepository.js"), "utf8");
  vm.runInNewContext(sourceRepositorio, contextoRepositorio);
  assert.strictEqual(typeof contextoRepositorio.window.AuthRepository.solicitarRecuperacao, "undefined");

  console.log("✓ Recuperação de senha informa que o fluxo seguro ainda não está disponível.");
}

module.exports = executarTestesRecuperacaoDesativada;
