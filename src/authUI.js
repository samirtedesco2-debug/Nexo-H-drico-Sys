// authUI.js - Interface de autenticação, login e primeiro acesso

class AuthUI {
  _obterOuCriarOverlay() {
    let overlay = document.getElementById("nexo-auth-overlay");
    if (!overlay) {
      overlay = document.createElement("div");
      overlay.id = "nexo-auth-overlay";
      document.body.appendChild(overlay);
    }

    overlay.style.cssText = `
      position: fixed; top: 0; left: 0; width: 100vw; height: 100vh;
      background: 
        linear-gradient(rgba(3, 7, 18, 0.65), rgba(3, 7, 18, 0.85)),
        url("manual-imagens/login.jfif");
      background-size: cover;
      background-position: center;
      backdrop-filter: blur(4px);
      display: flex; justify-content: center; align-items: center; z-index: 99999;
      font-family: inherit; color: #fff;
      overflow: hidden;
    `;
    if (typeof document !== 'undefined' && document.body && document.body.style) {
      document.body.style.overflow = "hidden";
    }
    return overlay;
  }

  async verificarSessaoOuExibirLogin() {
    await window.AuthRepository.inicializarDB();

    const sessaoStr = localStorage.getItem("nexo_hidrico_session");
    if (sessaoStr) {
      try {
        const sessao = JSON.parse(sessaoStr);
        const user = await window.AuthRepository.obterUsuario(sessao.username);
        if (user && !user.bloqueado) {
          if (user.primeiroAcesso) {
            this.exibirModalPrimeiroAcesso(user);
            return;
          }
          if (user.requerRedefinicao) {
            this.exibirModalNovaSenha(user);
            return;
          }
          window.RBACManager.aplicarPermissoes();
          return;
        }
      } catch (e) {
        localStorage.removeItem("nexo_hidrico_session");
      }
    }

    this.exibirTelaLogin();
  }

  exibirTelaLogin() {
    const overlay = this._obterOuCriarOverlay();

    overlay.innerHTML = `
      <div style="
        background: rgba(17, 24, 39, 0.88); backdrop-filter: blur(20px);
        border: 1px solid rgba(255, 255, 255, 0.1); border-radius: 14px;
        padding: 26px 32px; width: 100%; max-width: 400px; box-shadow: 0 20px 50px rgba(0,0,0,0.8);
        display: flex; flex-direction: column; gap: 14px; text-align: center;
      ">
        <div>
          <img
            class="auth-brand-logo"
            src="manual-imagens/nexo-hidrico-logo.jpg"
            alt="Logo Nexo Hídrico"
          >
          <p class="auth-brand-tagline">Inteligência Operacional</p>
          <h2 style="color: #f8fafc; margin: 0 0 4px 0; font-size: 1.4rem; font-weight: 700;">Acesso ao Sistema</h2>
          <p style="color: #94a3b8; margin: 0; font-size: 0.85rem;">Insira suas credenciais para continuar</p>
        </div>

        <form id="nexo-login-form" style="display: flex; flex-direction: column; gap: 12px; text-align: left;">
          <div style="display: flex; flex-direction: column; gap: 4px;">
            <label for="login-username" style="font-size: 0.8rem; color: #cbd5e1; font-weight: 600;">Usuário</label>
            <input type="text" id="login-username" autocomplete="username" required placeholder="Ex: admin.nexo" style="
              background: rgba(15, 23, 42, 0.9); border: 1px solid rgba(255,255,255,0.12); color: #fff;
              padding: 10px 12px; border-radius: 8px; font-size: 0.9rem; outline: none;
            ">
          </div>

          <div style="display: flex; flex-direction: column; gap: 4px;">
            <label for="login-password" style="font-size: 0.8rem; color: #cbd5e1; font-weight: 600;">Senha</label>
            <div class="login-password-input-wrap">
              <input type="password" id="login-password" autocomplete="current-password" required placeholder="••••••••" style="
                background: rgba(15, 23, 42, 0.9); border: 1px solid rgba(255,255,255,0.12); color: #fff;
                width: 100%; padding: 10px 88px 10px 12px; border-radius: 8px; font-size: 0.9rem; outline: none;
              ">
              <button
                type="button"
                id="login-password-toggle"
                class="login-password-toggle"
                aria-label="Mostrar senha"
                aria-controls="login-password"
                aria-pressed="false"
              >
                <svg id="login-password-eye-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                  <path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7-10-7-10-7Z"></path>
                  <circle cx="12" cy="12" r="3"></circle>
                </svg>
                <svg id="login-password-eye-off-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" hidden>
                  <path d="m3 3 18 18"></path>
                  <path d="M10.6 10.6a2 2 0 0 0 2.8 2.8"></path>
                  <path d="M9.9 5.2A10.8 10.8 0 0 1 12 5c6.4 0 10 7 10 7a15.7 15.7 0 0 1-3.1 3.9"></path>
                  <path d="M6.2 6.2C3.5 8.1 2 12 2 12s3.6 7 10 7c1 0 1.9-.2 2.8-.5"></path>
                </svg>
              </button>
            </div>
          </div>

          <div id="login-error-msg" role="alert" style="color: #f87171; font-size: 0.85rem; display: none; background: rgba(248,113,113,0.1); padding: 8px 12px; border-radius: 6px; border: 1px solid rgba(248,113,113,0.3);"></div>

          <button type="submit" style="
            background: #0ea5e9; color: #fff; border: none; padding: 12px;
            border-radius: 8px; font-size: 1rem; font-weight: 700; cursor: pointer;
            transition: background 0.2s; margin-top: 4px; box-shadow: 0 4px 15px rgba(14,165,233,0.4);
          " onmouseover="this.style.background='#0284c7'" onmouseout="this.style.background='#0ea5e9'">
            Entrar
          </button>
        </form>

        <div style="display: flex; justify-content: space-between; align-items: center; font-size: 0.85rem; margin-top: 4px; border-top: 1px solid rgba(255,255,255,0.08); padding-top: 14px;">
          <a href="#" id="link-esqueceu-senha" style="color: #38bdf8; text-decoration: none; font-weight: 600;">Esqueceu a senha?</a>
          <span style="color: #64748b; font-size: 0.75rem;">Segurança Industrial</span>
        </div>
      </div>
    `;

    const campoSenha = document.getElementById("login-password");
    const botaoVisibilidadeSenha = document.getElementById("login-password-toggle");
    const iconeMostrarSenha = document.getElementById("login-password-eye-icon");
    const iconeOcultarSenha = document.getElementById("login-password-eye-off-icon");
    botaoVisibilidadeSenha.onclick = () => {
      const mostrarSenha = campoSenha.type === "password";
      campoSenha.type = mostrarSenha ? "text" : "password";
      iconeMostrarSenha.toggleAttribute("hidden", mostrarSenha);
      iconeOcultarSenha.toggleAttribute("hidden", !mostrarSenha);
      botaoVisibilidadeSenha.setAttribute("aria-label", mostrarSenha ? "Ocultar senha" : "Mostrar senha");
      botaoVisibilidadeSenha.setAttribute("aria-pressed", String(mostrarSenha));
    };

    document.getElementById("nexo-login-form").onsubmit = async (e) => {
      e.preventDefault();
      const u = document.getElementById("login-username").value.trim();
      const p = document.getElementById("login-password").value;
      const errEl = document.getElementById("login-error-msg");
      errEl.style.display = "none";

      try {
        const user = await window.AuthRepository.autenticar(u, p);
        if (user.primeiroAcesso) {
          this.exibirModalPrimeiroAcesso(user);
          return;
        }
        if (user.requerRedefinicao) {
          this.exibirModalNovaSenha(user);
          return;
        }

        localStorage.setItem("nexo_hidrico_session", JSON.stringify({ username: user.username, role: user.role }));
        if (typeof document !== 'undefined' && document.body && document.body.style) {
          document.body.style.overflow = "";
        }
        overlay.remove();
        window.RBACManager.aplicarPermissoes();
        window.location.reload();
      } catch (err) {
        errEl.textContent = err.message;
        errEl.style.display = "block";
      }
    };

    document.getElementById("link-esqueceu-senha").onclick = (e) => {
      e.preventDefault();
      this.exibirModalRecuperacao();
    };
  }

  exibirModalPrimeiroAcesso(user) {
    const overlay = this._obterOuCriarOverlay();

    overlay.innerHTML = `
      <div style="
        background: rgba(17, 24, 39, 0.82); backdrop-filter: blur(20px);
        border: 1px solid rgba(255, 255, 255, 0.1); border-radius: 14px;
        padding: 40px; width: 100%; max-width: 440px; box-shadow: 0 20px 50px rgba(0,0,0,0.8);
        display: flex; flex-direction: column; gap: 20px; text-align: center;
      ">
        <div>
          <h2 style="color: #f8fafc; margin: 0 0 6px 0; font-size: 1.5rem; font-weight: 700;">Primeiro Acesso</h2>
          <p style="color: #94a3b8; margin: 0; font-size: 0.9rem;">Olá ${user.username}, defina sua senha definitiva.</p>
        </div>

        <form id="nexo-primeiro-form" style="display: flex; flex-direction: column; gap: 16px; text-align: left;">
          <div style="display: flex; flex-direction: column; gap: 6px;">
            <label for="primeiro-nova-senha" style="font-size: 0.85rem; color: #cbd5e1; font-weight: 600;">Nova Senha Definitiva</label>
            <input type="password" id="primeiro-nova-senha" autocomplete="new-password" required placeholder="••••••••" style="
              background: rgba(15, 23, 42, 0.9); border: 1px solid rgba(255,255,255,0.12); color: #fff;
              padding: 12px; border-radius: 8px; font-size: 0.95rem; outline: none;
            ">
            <span style="font-size: 0.75rem; color: #94a3b8; line-height: 1.4; margin-top: 2px;">
              Mínimo de 8 caracteres, incluindo: 1 letra, 1 número e 1 caractere especial (@$!%*#?&).
            </span>
          </div>

          <div id="primeiro-error-msg" style="color: #f87171; font-size: 0.85rem; display: none; background: rgba(248,113,113,0.1); padding: 8px 12px; border-radius: 6px; border: 1px solid rgba(248,113,113,0.3);"></div>

          <button type="submit" style="
            background: #0ea5e9; color: #fff; border: none; padding: 12px;
            border-radius: 8px; font-size: 1rem; font-weight: 700; cursor: pointer;
            transition: background 0.2s; margin-top: 4px; box-shadow: 0 4px 15px rgba(14,165,233,0.4);
          ">
            Salvar e Continuar
          </button>
        </form>
      </div>
    `;

    document.getElementById("nexo-primeiro-form").onsubmit = async (e) => {
      e.preventDefault();
      const novaSenha = document.getElementById("primeiro-nova-senha").value;
      const errEl = document.getElementById("primeiro-error-msg");
      errEl.style.display = "none";

      try {
        await window.AuthRepository.atualizarSenha(user.username, novaSenha);
        localStorage.setItem("nexo_hidrico_session", JSON.stringify({ username: user.username, role: user.role }));
        if (typeof document !== 'undefined' && document.body && document.body.style) {
          document.body.style.overflow = "";
        }
        overlay.remove();
        window.RBACManager.aplicarPermissoes();
        window.location.reload();
      } catch (err) {
        errEl.textContent = err.message;
        errEl.style.display = "block";
      }
    };
  }

  exibirModalRecuperacao() {
    const overlay = this._obterOuCriarOverlay();
    overlay.innerHTML = `
      <div style="
        background: rgba(17, 24, 39, 0.82); backdrop-filter: blur(20px);
        border: 1px solid rgba(255, 255, 255, 0.1); border-radius: 14px;
        padding: 40px; width: 100%; max-width: 440px; box-shadow: 0 20px 50px rgba(0,0,0,0.8);
        display: flex; flex-direction: column; gap: 20px; text-align: center;
      ">
        <div>
          <h2 style="color: #f8fafc; margin: 0 0 6px 0; font-size: 1.5rem; font-weight: 700;">Recuperação de Acesso</h2>
          <p style="color: #cbd5e1; margin: 0; font-size: 0.9rem; line-height: 1.5;">
            A recuperação automática não está disponível nesta versão. Informar um e-mail, sem confirmar a identidade por um canal confiável, não é suficiente para autorizar a redefinição da senha.
          </p>
        </div>

        <p style="color: #94a3b8; margin: 0; font-size: 0.85rem; line-height: 1.5;">
          Procure o responsável técnico do sistema por um canal institucional para receber orientação. Esta versão não oferece uma ferramenta segura de redefinição. Não compartilhe sua senha.
        </p>

        <a href="#" id="link-voltar-login" style="color: #94a3b8; text-decoration: none; font-size: 0.85rem; font-weight: 600;">← Voltar ao login</a>
      </div>
    `;

    document.getElementById("link-voltar-login").onclick = (e) => {
      e.preventDefault();
      this.exibirTelaLogin();
    };
  }

  exibirModalNovaSenha(user) {
    const overlay = this._obterOuCriarOverlay();

    overlay.innerHTML = `
      <div style="
        background: rgba(17, 24, 39, 0.82); backdrop-filter: blur(20px);
        border: 1px solid rgba(255, 255, 255, 0.1); border-radius: 14px;
        padding: 40px; width: 100%; max-width: 440px; box-shadow: 0 20px 50px rgba(0,0,0,0.8);
        display: flex; flex-direction: column; gap: 20px; text-align: center;
      ">
        <div>
          <h2 style="color: #f8fafc; margin: 0 0 6px 0; font-size: 1.5rem; font-weight: 700;">Nova Senha Definitiva</h2>
          <p style="color: #94a3b8; margin: 0; font-size: 0.9rem;">Olá ${user.username}, escolha uma nova senha forte.</p>
        </div>

        <form id="nexo-novasenha-form" style="display: flex; flex-direction: column; gap: 16px; text-align: left;">
          <div style="display: flex; flex-direction: column; gap: 6px;">
            <label for="novasenha-input" style="font-size: 0.85rem; color: #cbd5e1; font-weight: 600;">Nova Senha Definitiva</label>
            <input type="password" id="novasenha-input" autocomplete="new-password" required placeholder="••••••••" style="
              background: rgba(15, 23, 42, 0.9); border: 1px solid rgba(255,255,255,0.12); color: #fff;
              padding: 12px; border-radius: 8px; font-size: 0.95rem; outline: none;
            ">
            <span style="font-size: 0.75rem; color: #94a3b8; line-height: 1.4; margin-top: 2px;">
              Mínimo de 8 caracteres, incluindo: 1 letra, 1 número e 1 caractere especial (@$!%*#?&).
            </span>
          </div>

          <div id="novasenha-error-msg" style="color: #f87171; font-size: 0.85rem; display: none; background: rgba(248,113,113,0.1); padding: 8px 12px; border-radius: 6px; border: 1px solid rgba(248,113,113,0.3);"></div>

          <button type="submit" style="
            background: #0ea5e9; color: #fff; border: none; padding: 12px;
            border-radius: 8px; font-size: 1rem; font-weight: 700; cursor: pointer;
            transition: background 0.2s; margin-top: 4px; box-shadow: 0 4px 15px rgba(14,165,233,0.4);
          ">
            Atualizar e Acessar
          </button>
        </form>
      </div>
    `;

    document.getElementById("nexo-novasenha-form").onsubmit = async (e) => {
      e.preventDefault();
      const novaSessionSenha = document.getElementById("novasenha-input").value;
      const errEl = document.getElementById("novasenha-error-msg");
      errEl.style.display = "none";

      try {
        await window.AuthRepository.atualizarSenha(user.username, novaSessionSenha);
        localStorage.setItem("nexo_hidrico_session", JSON.stringify({ username: user.username, role: user.role }));
        if (typeof document !== 'undefined' && document.body && document.body.style) {
          document.body.style.overflow = "";
        }
        overlay.remove();
        window.RBACManager.aplicarPermissoes();
        window.location.reload();
      } catch (err) {
        errEl.textContent = err.message;
        errEl.style.display = "block";
      }
    };
  }
}

window.AuthUI = new AuthUI();
