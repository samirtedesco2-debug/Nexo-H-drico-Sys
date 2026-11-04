// rbac.js - Controle de Acesso Baseado em Papéis (RBAC)

class RBACManager {
  aplicarPermissoes() {
    const sessionStr = localStorage.getItem("nexo_hidrico_session");
    if (!sessionStr) return;

    let session;
    try {
      session = JSON.parse(sessionStr);
    } catch (e) {
      return;
    }

    const role = session.role || 'Operador';
    const isAgent = role === "Agent" || role === "AGENT" || role === "operador" || role === "Operator";

    // Exibir identificação do usuário logado e configurar botão Sair no header
    const userDisplay = document.getElementById("logged-username-display");
    if (userDisplay) {
      userDisplay.textContent = `${session.username} (${role})`;
    }

    const btnLogout = document.getElementById("btn-global-logout");
    if (btnLogout && !btnLogout.dataset.bound) {
      btnLogout.dataset.bound = "true";
      btnLogout.onclick = () => {
        if (confirm("Deseja realmente encerrar a sessão atual?")) {
          localStorage.removeItem("nexo_hidrico_session");
          window.location.reload();
        }
      };
    }

    // 1. Configurações de Reservatórios (Aba Configurações)
    const painelConfig = document.getElementById("painel-configuracoes");
    if (painelConfig) {
      const inputs = painelConfig.querySelectorAll("input, select, textarea");
      inputs.forEach(input => {
        if (isAgent) {
          input.disabled = true;
          input.readOnly = true;
        } else {
          input.disabled = false;
          input.readOnly = false;
        }
      });

      const btnSalvar = painelConfig.querySelectorAll(".btn-guardar-config, #btn-vincular-config");
      btnSalvar.forEach(btn => {
        btn.style.display = isAgent ? "none" : "";
      });
    }

    // 2. Ocultar painel de logs históricos de incidentes de SLA e Auditoria de Segurança para Agent
    const abaEngenharia = document.getElementById("tab-engenharia");
    if (abaEngenharia && isAgent) {
      abaEngenharia.style.display = "none";
    }

    // 3. Modificar botão de ACK no Mural para Agent (clique único '✓ Ciência Dada')
    window.nexoAgentIsRestricted = isAgent;
  }
}

window.RBACManager = new RBACManager();
