/**
 * ccoSync.js - Módulo de Sincronização, Canal CCO e Janela Singleton
 * Nexo Hídrico - CCO
 */

window.CcoSync = {
  inicializarCanal() {
    if (!window.ccoChannel) {
      window.ccoChannel = new BroadcastChannel('nexo_hidrico_cco_link');
      window.ccoReconhecidos = window.ccoReconhecidos || new Map();
      window.ccoAckMetadata = window.ccoAckMetadata || new Map();
      window.ccoChannel.onmessage = (event) => {
        const { type, chave, severidade, metadados, reconhecidos, ackMetadata, incidentsLog } = event.data || {};
        if (type === 'ACK_ALARM') {
          window.ccoReconhecidos.set(chave, severidade);
          if (metadados) window.ccoAckMetadata.set(chave, metadados);
          window.CcoSync.atualizarAposMudancaAck();
        } else if (type === 'REVOKE_ACK') {
          window.ccoReconhecidos.delete(chave);
          window.ccoAckMetadata.delete(chave);
          window.CcoSync.atualizarAposMudancaAck();
        } else if (type === 'SYNC_RECONHECIDOS') {
          window.ccoReconhecidos = new Map(Object.entries(reconhecidos || {}));
          window.ccoAckMetadata = new Map(Object.entries(ackMetadata || {}));
          if (Array.isArray(incidentsLog)) {
            window.nexoIncidentsLog = incidentsLog;
          }
          window.CcoSync.atualizarAposMudancaAck();
        }
      };
    }
  },

  // Reconhecimento feito em outra janela: redesenha o Mural e, na janela dedicada de
  // investigação, o cabeçalho (botão Reconhecer/Reconhecido) com o estado novo.
  atualizarAposMudancaAck() {
    if (typeof renderizarDashboardExceccoes === 'function') {
      renderizarDashboardExceccoes();
    }
    const atual = window.nexoInvestigacaoAtual;
    if (
      atual &&
      document.body.classList.contains('is-cco-investigation-active') &&
      typeof window.renderizarPainelInvestigacaoDedicado === 'function'
    ) {
      window.renderizarPainelInvestigacaoDedicado(atual.chave, atual.dataSelecionada, atual.banco);
    }
  },

  abrirMuralSingleton() {
    const tabAlarmes = document.getElementById("tab-alarmes");
    if (tabAlarmes) {
      tabAlarmes.click();
    }
  },

  inicializarModoCCO() {
    const botoesCCO = document.querySelectorAll('#btn-modo-cco, #btn-modo-cco-mural');
    if (botoesCCO.length === 0) return;

    const iconeCCO = `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M2 12h20"/><path d="M20 5H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2Z"/><path d="M12 18v4"/><path d="M8 22h8"/></svg>`;
    const iconePadrao = `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="18" height="18" x="3" y="3" rx="2"/><path d="M3 9h18"/><path d="M9 21V9"/></svg>`;

    botoesCCO.forEach(btnCCO => {
      btnCCO.addEventListener("click", (e) => {
        if (e.shiftKey || e.ctrlKey) {
          this.abrirMuralSingleton();
          return;
        }

        document.body.classList.toggle("modo-cco-ativo");
        const isLargeTV = document.body.classList.contains("modo-cco-ativo");
        document.body.dataset.viewScale = isLargeTV ? "large-tv" : "";

        botoesCCO.forEach(b => {
          if (isLargeTV) {
            b.innerHTML = iconePadrao;
            b.title = "Modo Padrão";
            b.style.borderColor = "var(--accent-color)";
          } else {
            b.innerHTML = iconeCCO;
            b.title = "Modo CCO";
            b.style.borderColor = "var(--border-color)";
          }
        });

        if (isLargeTV) {
          if (document.documentElement.requestFullscreen) {
            document.documentElement.requestFullscreen().catch(() => {});
          }
          const tabAlarmes = document.getElementById("tab-alarmes");
          if (tabAlarmes) tabAlarmes.click();
        } else {
          if (document.exitFullscreen && document.fullscreenElement) {
            document.exitFullscreen().catch(() => {});
          }
          const tabOp = document.getElementById("tab-operacional");
          if (tabOp) tabOp.click();
        }
      });
    });

    document.addEventListener("fullscreenchange", () => {
      if (!document.fullscreenElement) {
        document.body.classList.remove("modo-cco-ativo");
        document.body.dataset.viewScale = "";
        botoesCCO.forEach(b => {
          b.innerHTML = iconeCCO;
          b.style.borderColor = "var(--border-color)";
          b.title = "Modo CCO";
        });
      }
    });
  },

  inicializarModoCCOMural(btnId = 'btn-modo-cco-mural') {
    const botoesCCO = Array.from(
      document.querySelectorAll(`#${btnId}, .btn-view-mode-cco`),
    );
    if (botoesCCO.length === 0) return;

    const iconeCCO = `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M2 12h20"/><path d="M20 5H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2Z"/><path d="M12 18v4"/><path d="M8 22h8"/></svg>`;
    const iconePadrao = `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="18" height="18" x="3" y="3" rx="2"/><path d="M3 9h18"/><path d="M9 21V9"/></svg>`;

    botoesCCO.forEach((botao) => botao.addEventListener("click", () => {
      document.body.classList.toggle("modo-cco-ativo");
      const isLargeTV = document.body.classList.contains("modo-cco-ativo");
      document.body.dataset.viewScale = isLargeTV ? "large-tv" : "";

      botoesCCO.forEach((botaoAtivo) => {
        botaoAtivo.innerHTML = isLargeTV ? iconePadrao : iconeCCO;
        botaoAtivo.title = isLargeTV ? "Modo Padrão" : "Modo CCO";
        botaoAtivo.setAttribute("aria-label", isLargeTV ? "Modo Padrão" : "Ativar modo CCO");
        botaoAtivo.style.borderColor = isLargeTV ? "var(--accent-color)" : "var(--border-color)";
      });

      if (isLargeTV) {
        if (document.documentElement.requestFullscreen) {
          document.documentElement.requestFullscreen().catch(() => {});
        }
      } else {
        if (document.exitFullscreen && document.fullscreenElement) {
          document.exitFullscreen().catch(() => {});
        }
      }
    }));

    document.addEventListener("fullscreenchange", () => {
      if (!document.fullscreenElement) {
        document.body.classList.remove("modo-cco-ativo");
        document.body.dataset.viewScale = "";
        botoesCCO.forEach((botao) => {
          botao.innerHTML = iconeCCO;
          botao.style.borderColor = "var(--border-color)";
          botao.title = "Modo CCO";
          botao.setAttribute("aria-label", "Ativar modo CCO");
        });
      }
    });
  }
};
