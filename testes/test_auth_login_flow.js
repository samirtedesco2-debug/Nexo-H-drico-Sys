const assert = require("assert");
const fs = require("fs");
const path = require("path");
const vm = require("vm");

function criarContextoLogin(autenticar) {
  const elementos = {
    "nexo-auth-overlay": {
      style: {},
      innerHTML: "",
      removido: false,
      remove() {
        this.removido = true;
      }
    },
    "nexo-login-form": { onsubmit: null },
    "login-username": { value: "operador.teste" },
    "login-password": { value: "Senha@2026", type: "password" },
    "login-password-eye-icon": {
      attributes: {},
      get hidden() {
        return "hidden" in this.attributes;
      },
      toggleAttribute(name, force) {
        if (force) {
          this.attributes[name] = "";
        } else {
          delete this.attributes[name];
        }
      }
    },
    "login-password-eye-off-icon": {
      attributes: { hidden: "" },
      get hidden() {
        return "hidden" in this.attributes;
      },
      toggleAttribute(name, force) {
        if (force) {
          this.attributes[name] = "";
        } else {
          delete this.attributes[name];
        }
      }
    },
    "login-password-toggle": {
      attributes: {
        "aria-label": "Mostrar senha",
        "aria-pressed": "false"
      },
      setAttribute(name, value) {
        this.attributes[name] = value;
      }
    },
    "login-error-msg": { style: {}, textContent: "" },
    "link-esqueceu-senha": { onclick: null }
  };
  const valoresLocalStorage = new Map();
  const chamadas = { permissoes: 0, reload: 0 };
  const document = {
    body: { appendChild() {} },
    createElement: () => elementos["nexo-auth-overlay"],
    getElementById: (id) => elementos[id] || null
  };
  const window = {
    AuthRepository: { autenticar },
    RBACManager: { aplicarPermissoes: () => { chamadas.permissoes += 1; } },
    location: { reload: () => { chamadas.reload += 1; } }
  };
  const localStorage = {
    getItem: (chave) => valoresLocalStorage.get(chave) ?? null,
    setItem: (chave, valor) => valoresLocalStorage.set(chave, String(valor)),
    removeItem: (chave) => valoresLocalStorage.delete(chave)
  };
  const contexto = { document, window, localStorage };
  const source = fs.readFileSync(path.join(__dirname, "../src/authUI.js"), "utf8");
  vm.runInNewContext(source, contexto);
  window.AuthUI.exibirTelaLogin();

  return { elementos, chamadas, valoresLocalStorage };
}

async function executarTestesFluxoLogin() {
  const usuario = {
    username: "operador.teste",
    role: "Agent",
    primeiroAcesso: false,
    requerRedefinicao: false
  };
  const sucesso = criarContextoLogin(async () => usuario);

  assert.match(sucesso.elementos["nexo-auth-overlay"].innerHTML, /for="login-username"/);
  assert.match(sucesso.elementos["nexo-auth-overlay"].innerHTML, /for="login-password"/);
  const campoSenha = sucesso.elementos["login-password"];
  const botaoVisibilidadeSenha = sucesso.elementos["login-password-toggle"];
  const iconeMostrarSenha = sucesso.elementos["login-password-eye-icon"];
  const iconeOcultarSenha = sucesso.elementos["login-password-eye-off-icon"];
  assert.strictEqual(campoSenha.type, "password");
  assert.strictEqual(iconeMostrarSenha.hidden, false);
  assert.strictEqual(iconeOcultarSenha.hidden, true);
  assert.strictEqual(botaoVisibilidadeSenha.attributes["aria-pressed"], "false");
  botaoVisibilidadeSenha.onclick();
  assert.strictEqual(campoSenha.type, "text");
  assert.strictEqual(campoSenha.value, "Senha@2026");
  assert.strictEqual(iconeMostrarSenha.hidden, true);
  assert.strictEqual(iconeOcultarSenha.hidden, false);
  assert.strictEqual(botaoVisibilidadeSenha.attributes["aria-label"], "Ocultar senha");
  assert.strictEqual(botaoVisibilidadeSenha.attributes["aria-pressed"], "true");
  botaoVisibilidadeSenha.onclick();
  assert.strictEqual(campoSenha.type, "password");
  assert.strictEqual(iconeMostrarSenha.hidden, false);
  assert.strictEqual(iconeOcultarSenha.hidden, true);
  assert.strictEqual(botaoVisibilidadeSenha.attributes["aria-label"], "Mostrar senha");
  assert.strictEqual(botaoVisibilidadeSenha.attributes["aria-pressed"], "false");
  await sucesso.elementos["nexo-login-form"].onsubmit({ preventDefault() {} });
  assert.strictEqual(
    sucesso.valoresLocalStorage.get("nexo_hidrico_session"),
    JSON.stringify({ username: usuario.username, role: usuario.role })
  );
  assert.strictEqual(sucesso.elementos["nexo-auth-overlay"].removido, true);
  assert.strictEqual(sucesso.chamadas.permissoes, 1);
  assert.strictEqual(sucesso.chamadas.reload, 1);

  const falha = criarContextoLogin(async () => {
    throw new Error("Usuário ou senha inválidos.");
  });
  await falha.elementos["nexo-login-form"].onsubmit({ preventDefault() {} });
  assert.strictEqual(falha.elementos["login-error-msg"].textContent, "Usuário ou senha inválidos.");
  assert.strictEqual(falha.elementos["login-error-msg"].style.display, "block");
  assert.strictEqual(falha.valoresLocalStorage.has("nexo_hidrico_session"), false);
  assert.strictEqual(falha.chamadas.reload, 0);

  console.log("✓ Login persiste sessão após autenticação e mostra erro sem criar sessão quando falha.");
}

module.exports = executarTestesFluxoLogin;
