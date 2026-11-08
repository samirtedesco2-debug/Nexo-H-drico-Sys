// app.js - Lógica principal, orquestração e funções auxiliares com carregamento assíncrono modular

let instanciasGraficos = {};
let graficosAnaliticos = {};
let graficosEngenharia = {};
let categoriaBoletimAtiva = null;
let analiseReservatorioAberta = false;
let gridReservatoriosAberto = false;
let graficoAnaliseComMedias = false;
let graficoAnaliseComHistorico = false;
const seriesAnaliseOcultas = new Set();
const TAMANHO_PAGINA_ENGENHARIA = 100;
const MINIMO_DIAS_HISTORICOS_PARA_ESPERAR_DADO = 4;

const coresAnaliticas = [
  "#33a2e5",
  "#ff780a",
  "#73bf69",
  "#b877d9",
  "#e35d6a",
  "#38b2ac",
  "#d7a52b",
  "#5975d9",
];

// Inicialização Assíncrona Carregando Todos os Meses Históricos via ApiClient
async function inicializarBancoAssincrono() {
  try {
    if (window.StorageRepository) {
      try {
        const map = await window.StorageRepository.carregarReconhecidos();
        if (map) {
          window.ccoReconhecidos = map;
        }
        const metadadosAck = await window.StorageRepository.carregarMetadadosReconhecidos();
        if (metadadosAck) {
          window.ccoAckMetadata = metadadosAck;
        }
        const logs = await window.StorageRepository.carregarLogs();
        if (logs) {
          window.nexoIncidentsLog = logs;
        }
        window.ccoReconhecidosCarregado = true;
      } catch (err) {
        console.warn("Erro ao carregar do StorageRepository no inicio:", err);
      }
    }
    window.bancoDeDados = await window.ApiClient.inicializarBanco();
    renderizarAvisoCarregamentoDados(window.ApiClient.listarAvisosCarregamento());
    inicializarTema();
    if (typeof inicializarControleAudioCCO === 'function') inicializarControleAudioCCO();
    inicializarDashboard();
  } catch (erro) {
    console.error("Erro ao inicializar dados:", erro);
    renderizarAvisoCarregamentoDados(window.ApiClient.listarAvisosCarregamento());
    const grid = document.getElementById("grid-reservatorios");
    if (grid) {
      grid.textContent = "Não foi possível iniciar o painel. Consulte o aviso de carregamento para identificar o problema.";
    }
  }
}

async function carregarMesPorData(dataStr) {
  const partes = dataStr.split("/");
  if (partes.length === 3) {
    const anoMes = `${partes[2]}_${partes[1]}`;
    const dadosMes = await window.ApiClient.carregarMes(anoMes);
    if (dadosMes && dadosMes.dias) {
      Object.assign(window.bancoDeDados.historico, dadosMes.dias);
    }
    renderizarAvisoCarregamentoDados(window.ApiClient.listarAvisosCarregamento());
  }
}
document.addEventListener("DOMContentLoaded", async () => {
  try {
    await window.NexoMigration.executar();
  } catch (error) {
    console.error("Não foi possível migrar os dados locais para o Nexo Hídrico.", error);
    const aviso = document.createElement("div");
    aviso.setAttribute("role", "alert");
    aviso.style.cssText = "position:fixed;inset:0 0 auto;padding:16px;background:#7f1d1d;color:#fff;z-index:100000;text-align:center";
    aviso.textContent = "A atualização dos dados locais não foi concluída. Seus dados antigos foram mantidos; feche outras janelas do sistema e recarregue a página.";
    document.body.prepend(aviso);
    return;
  }

  if (window.AuthUI) {
    window.AuthUI.verificarSessaoOuExibirLogin();
  }

  inicializarBancoAssincrono();

  if (window.CcoSync) {
    window.CcoSync.inicializarCanal();
    window.CcoSync.inicializarModoCCO();
    window.CcoSync.inicializarModoCCOMural();
  }

  // Central de Notificações Popover
  const btnNotificacoes = document.getElementById("btn-notificacoes");
  const popoverNotificacoes = document.getElementById("notificacoes-popover");
  const btnFecharNotificacoes = document.getElementById("btn-fechar-notificacoes");
  const btnMarcarTodasLidas = document.getElementById("btn-marcar-todas-lidas");

  if (btnNotificacoes && popoverNotificacoes) {
    btnNotificacoes.addEventListener("click", (e) => {
      e.stopPropagation();
      popoverNotificacoes.hidden = !popoverNotificacoes.hidden;
      atualizarListaNotificacoes();
    });
  }

  if (btnFecharNotificacoes && popoverNotificacoes) {
    btnFecharNotificacoes.addEventListener("click", () => {
      popoverNotificacoes.hidden = true;
    });
  }

  if (btnMarcarTodasLidas) {
    btnMarcarTodasLidas.addEventListener("click", () => {
      if (window.nexoExternalNotifications) {
        window.nexoExternalNotifications.forEach(n => n.lida = true);
        try {
          localStorage.setItem("nexo_hidrico_external_notifications", JSON.stringify(window.nexoExternalNotifications));
        } catch(e) {}
        atualizarListaNotificacoes();
      }
    });
  }

  document.addEventListener("click", (e) => {
    if (popoverNotificacoes && !popoverNotificacoes.hidden && !popoverNotificacoes.contains(e.target) && e.target !== btnNotificacoes) {
      popoverNotificacoes.hidden = true;
    }
  });

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && window.veioDeAlertasCCO) {
      window.veioDeAlertasCCO = false;
      const tabAlarmes = document.getElementById("tab-alarmes");
      if (tabAlarmes) tabAlarmes.click();
    }
  });

  // Tratamento Global de Erros Assíncronos
  window.addEventListener("unhandledrejection", (event) => {
    console.warn("Aviso assíncrono capturado:", event.reason);
  });

  window.addEventListener("beforeunload", () => {
    try {
      if (window.ccoMuralWindow && !window.ccoMuralWindow.closed) {
        window.ccoMuralWindow.close();
      }
      if (window.nexoConfigWindow && !window.nexoConfigWindow.closed) {
        window.nexoConfigWindow.close();
      }
      Object.values(window.nexoViewWindows || {}).forEach((janela) => {
        if (janela && !janela.closed) janela.close();
      });
    } catch(e) {}
  });

  const urlParams = new URLSearchParams(window.location.search);
  if (urlParams.get('view') === 'configuracoes') {
    document.body.classList.add("is-config-window-active");
    setTimeout(() => {
      const painelConfig = document.getElementById("painel-configuracoes");
      const paineis = [
        document.getElementById("painel-operacional"),
        document.getElementById("painel-analitico"),
        document.getElementById("painel-engenharia"),
      ];
      paineis.forEach((p) => { if (p) p.hidden = true; });
      if (painelConfig) painelConfig.hidden = false;
      document.querySelectorAll(".view-tab").forEach((aba) => {
        aba.classList.remove("is-active");
        aba.setAttribute("aria-selected", "false");
      });
      renderizarPainelConfiguracoes();
    }, 400);
  }

  const seletorRelatorios = document.getElementById("seletor-relatorios-cco");
  if (seletorRelatorios) {
    seletorRelatorios.addEventListener("change", (e) => {
      const val = e.target.value;
      if (val === "copiar-plantao") {
        document.getElementById("btn-copiar-plantao-cco")?.click();
      } else if (val === "exportar-csv") {
        document.getElementById("btn-exportar-csv")?.click();
      } else if (val === "exportar-html") {
        document.getElementById("btn-exportar-html")?.click();
      }
      e.target.value = "";
    });
  }
});

function inicializarNotificacoesExternas() {
  if (!window.nexoExternalNotifications) {
    try {
      const salvos = localStorage.getItem("nexo_hidrico_external_notifications");
      let notifs = [];
      if (salvos) {
        notifs = JSON.parse(salvos);
      } else {
        notifs = [
          {
            id: 'notif-2',
            tipo: 'MAINTENANCE',
            titulo: 'Manutenção de Sensores',
            mensagem: 'Calibração programada dos sensores de telemetria no Reservatório R-02.',
            timestamp: new Date(Date.now() - 3600000).toISOString(),
            lida: false
          },
          {
            id: 'notif-3',
            tipo: 'ANNOUNCE',
            titulo: 'Comunicado da Engenharia',
            mensagem: 'Verifique os relatórios de plantão e exportações de turnos ao final de cada período.',
            timestamp: new Date(Date.now() - 7200000).toISOString(),
            lida: false
          }
        ];
      }

      const longExists = notifs.find(n => n.id === 'notif-long');
      if (!longExists) {
        notifs.push({
          id: 'notif-long',
          tipo: 'UPDATE',
          titulo: '📢 Nota Técnica: Relatório Detalhado de Evolução e Inteligência Operacional',
          mensagem: 'Esta é uma mensagem de teste longa desenvolvida especificamente para validar a capacidade de rolagem (scroll) e legibilidade do novo modal detalhado de notificações do Nexo Hídrico.\n\nO sistema de Inteligência Operacional passou por grandes evoluções arquiteturais e visuais:\n\n1. Otimização de Performance: A troca de abas agora é totalmente instantânea, sem o uso de overlays bloqueantes desnecessários.\n2. Identidade Visual Atualizada: Rodapés, títulos, cabeçalhos e relatórios agora utilizam uniformemente o padrão de Inteligência Operacional.\n3. Novo Modal de Notificações: Clicar em qualquer notificação na central abre um painel modal centralizado com desfoque de fundo (backdrop-filter), garantindo que comunicados e atualizações longas sejam lidos com total conforto visual e sem restrições de espaço.\n\nRecomenda-se a todos os operadores que revisem os relatórios de plantão, verifiquem os status dos reservatórios e utilizem os novos recursos de sincronização multi-janela.',
          timestamp: new Date().toISOString(),
          lida: false
        });
      }

      window.nexoExternalNotifications = notifs;
      localStorage.setItem("nexo_hidrico_external_notifications", JSON.stringify(window.nexoExternalNotifications));
    } catch (e) {
      window.nexoExternalNotifications = [];
    }
  }
}

function tocarAlertaSonoroCCO() {
  const somAtivo = localStorage.getItem("nexo_hidrico_sound_enabled") !== "false";
  if (!somAtivo) return;

  try {
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (!AudioContext) return;
    const ctx = new AudioContext();

    const playTone = (freq, time, duration) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(0.2, ctx.currentTime + time);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + time + duration);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(ctx.currentTime + time);
      osc.stop(ctx.currentTime + time + duration);
    };

    playTone(880, 0, 0.15);
    playTone(1320, 0.2, 0.2);
  } catch (e) {}
}
window.tocarAlertaSonoroCCO = tocarAlertaSonoroCCO;

function inicializarControleAudioCCO() {
  const btnAudioToggle = document.getElementById("btn-cco-audio-toggle");
  const lblAudioIcon = document.getElementById("lbl-audio-icon");
  if (btnAudioToggle) {
    let somLigado = localStorage.getItem("nexo_hidrico_sound_enabled") !== "false";
    if (lblAudioIcon) lblAudioIcon.textContent = somLigado ? "🔊" : "🔇";
    btnAudioToggle.title = somLigado ? "Alerta Sonoro Ativo (Clique para silenciar)" : "Alerta Sonoro Silenciado (Clique para ativar)";

    if (!btnAudioToggle.dataset.bound) {
      btnAudioToggle.dataset.bound = "true";
      btnAudioToggle.addEventListener("click", () => {
        somLigado = localStorage.getItem("nexo_hidrico_sound_enabled") !== "false";
        somLigado = !somLigado;
        localStorage.setItem("nexo_hidrico_sound_enabled", String(somLigado));
        if (lblAudioIcon) lblAudioIcon.textContent = somLigado ? "🔊" : "🔇";
        btnAudioToggle.title = somLigado ? "Alerta Sonoro Ativo (Clique para silenciar)" : "Alerta Sonoro Silenciado (Clique para ativar)";
        if (somLigado) tocarAlertaSonoroCCO();
      });
    }
  }
}
window.inicializarControleAudioCCO = inicializarControleAudioCCO;

function atualizarListaNotificacoes() {
  inicializarNotificacoesExternas();
  const lista = document.getElementById("notificacoes-lista");
  const badgeNotif = document.getElementById("badge-alarmes-ativos");
  if (!lista) return;

  const notifs = window.nexoExternalNotifications || [];
  
  const naoLidas = notifs.filter(n => !n.lida).length;
  if (badgeNotif) {
    badgeNotif.textContent = naoLidas;
    badgeNotif.style.display = naoLidas > 0 ? "inline-block" : "none";
  }

  if (notifs.length === 0) {
    lista.innerHTML = `<p class="notificacao-vazia">Nenhuma notificação externa no momento.</p>`;
    return;
  }

  const iconePorTipo = {
    UPDATE: '🔄',
    MAINTENANCE: '🛠️',
    ANNOUNCE: '📢',
    SYSTEM: '📡'
  };

  const corPorTipo = {
    UPDATE: 'var(--accent-color)',
    MAINTENANCE: 'var(--status-attention-color)',
    ANNOUNCE: 'var(--status-critical-color)',
    SYSTEM: 'var(--status-normal-color)'
  };

  lista.innerHTML = notifs.slice(-15).reverse().map(n => `
    <div class="notificacao-item" onclick="abrirModalDetalhesNotificacao('${n.id}')" style="border-left-color: ${corPorTipo[n.tipo] || 'var(--accent-color)'}; opacity: ${n.lida ? '0.7' : '1'}; background: var(--surface-inset); padding: 10px; border-radius: 6px; border-left-width: 4px; display: flex; flex-direction: column; gap: 4px; cursor: pointer; transition: transform 0.15s ease;" title="Clique para ler a mensagem completa">
      <div style="display: flex; justify-content: space-between; align-items: flex-start;">
        <span style="font-weight: 700; color: var(--text-color); font-size: 0.85rem;">${iconePorTipo[n.tipo] || '📌'} ${n.titulo}</span>
        <span style="font-size: 0.7rem; color: var(--muted-color);">${new Date(n.timestamp).toLocaleTimeString("pt-BR", {hour: '2-digit', minute:'2-digit'})}</span>
      </div>
      <p style="margin: 0; color: var(--muted-color); font-size: 0.8rem; line-height: 1.3; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden;">${n.mensagem}</p>
      <div style="display: flex; justify-content: space-between; align-items: center; margin-top: 2px;">
        <span style="font-size: 0.7rem; color: var(--accent-color); font-weight: 600;">🔍 Ler mensagem completa</span>
        <button type="button" onclick="event.stopPropagation(); marcarNotificacaoLida('${n.id}')" style="background: none; border: none; font-size: 0.75rem; color: var(--accent-color); cursor: pointer; padding: 0; font-weight: 600;">
          ${n.lida ? '✓ Lida' : 'Marcar como lida'}
        </button>
      </div>
    </div>
  `).join("");
}

window.abrirModalDetalhesNotificacao = function(id) {
  if (!window.nexoExternalNotifications) return;
  const n = window.nexoExternalNotifications.find(item => item.id === id);
  if (!n) return;

  if (!n.lida) {
    n.lida = true;
    try {
      localStorage.setItem("nexo_hidrico_external_notifications", JSON.stringify(window.nexoExternalNotifications));
    } catch(e) {}
    atualizarListaNotificacoes();
  }

  let modal = document.getElementById("modal-detalhe-notificacao");
  if (!modal) {
    modal = document.createElement("div");
    modal.id = "modal-detalhe-notificacao";
    modal.style.cssText = "position: fixed; inset: 0; background: rgba(3, 7, 18, 0.85); backdrop-filter: blur(8px); z-index: 100000; display: flex; align-items: center; justify-content: center; padding: 20px;";
    document.body.appendChild(modal);

    modal.onclick = (e) => {
      if (e.target === modal) modal.remove();
    };
  }

  const iconePorTipo = {
    UPDATE: '🔄',
    MAINTENANCE: '🛠️',
    ANNOUNCE: '📢',
    SYSTEM: '📡'
  };

  const rotuloTipo = {
    UPDATE: 'Atualização',
    MAINTENANCE: 'Manutenção',
    ANNOUNCE: 'Comunicado',
    SYSTEM: 'Sistema'
  };

  modal.innerHTML = `
    <div style="background: var(--surface-bg); border: 1px solid var(--border-color); border-radius: 16px; padding: 28px; width: 100%; max-width: 520px; box-shadow: 0 25px 50px rgba(0,0,0,0.5); display: flex; flex-direction: column; gap: 16px; color: var(--text-color);">
      <div style="display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 1px solid var(--border-color); padding-bottom: 12px;">
        <div style="display: flex; align-items: center; gap: 10px;">
          <span style="font-size: 1.5rem;">${iconePorTipo[n.tipo] || '📌'}</span>
          <div>
            <h3 style="margin: 0; font-size: 1.15rem; color: var(--heading-color);">${n.titulo}</h3>
            <span style="font-size: 0.75rem; color: var(--muted-color);">${new Date(n.timestamp).toLocaleString("pt-BR")}</span>
          </div>
        </div>
        <button type="button" id="fechar-modal-notif" style="background: transparent; border: none; font-size: 1.4rem; cursor: pointer; color: var(--muted-color);">&times;</button>
      </div>
      <div style="font-size: 0.95rem; line-height: 1.6; color: var(--text-color); max-height: 350px; overflow-y: auto; padding-right: 4px; white-space: pre-wrap;">
        ${n.mensagem}
      </div>
      <div style="display: flex; justify-content: space-between; align-items: center; border-top: 1px solid var(--border-color); margin-top: 8px; padding-top: 12px; flex-wrap: wrap; gap: 10px;">
        <span style="font-size: 0.8rem; font-weight: 600; color: var(--accent-color);">Tipo: ${rotuloTipo[n.tipo] || n.tipo}</span>
        <div style="display: flex; gap: 8px;">
          <button type="button" onclick="baixarComunicadoNotificacao('${n.id}')" style="background: var(--surface-inset); color: var(--text-color); border: 1px solid var(--border-color); padding: 8px 14px; border-radius: 8px; font-weight: 600; cursor: pointer; font-size: 0.85rem; display: flex; align-items: center; gap: 6px;">📥 Baixar TXT</button>
          <button type="button" id="btn-fechar-acao" style="background: var(--accent-color); color: #fff; border: none; padding: 8px 16px; border-radius: 8px; font-weight: 600; cursor: pointer; font-size: 0.85rem;">Fechar</button>
        </div>
      </div>
    </div>
  `;

  modal.style.display = "flex";
  modal.querySelector("#fechar-modal-notif").onclick = () => modal.remove();
  modal.querySelector("#btn-fechar-acao").onclick = () => modal.remove();
};

window.baixarComunicadoNotificacao = function(id) {
  if (!window.nexoExternalNotifications) return;
  const n = window.nexoExternalNotifications.find(item => item.id === id);
  if (!n) return;

  const rotuloTipo = {
    UPDATE: 'Atualização',
    MAINTENANCE: 'Manutenção',
    ANNOUNCE: 'Comunicado',
    SYSTEM: 'Sistema'
  };

  const conteudo = [
    `==================================================`,
    `COMUNICADO OFICIAL - INTELIGÊNCIA OPERACIONAL`,
    `==================================================`,
    `ID: ${n.id}`,
    `Título: ${n.titulo}`,
    `Tipo: ${rotuloTipo[n.tipo] || n.tipo}`,
    `Data/Hora: ${new Date(n.timestamp).toLocaleString("pt-BR")}`,
    `Status: ${n.lida ? 'Lida' : 'Não lida'}`,
    `--------------------------------------------------`,
    `MENSAGEM:`,
    ``,
    n.mensagem,
    ``,
    `==================================================`,
    `Emitido por Nexo Hídrico - Inteligência Operacional`,
    `==================================================`
  ].join("\n");

  const blob = new Blob([conteudo], { type: 'text/plain;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `comunicado_${n.id}_${new Date().toISOString().slice(0,10)}.txt`;
  a.click();
  URL.revokeObjectURL(url);
};

window.marcarNotificacaoLida = function(id) {
  if (!window.nexoExternalNotifications) return;
  const n = window.nexoExternalNotifications.find(item => item.id === id);
  if (n) {
    n.lida = !n.lida;
    try {
      localStorage.setItem("nexo_hidrico_external_notifications", JSON.stringify(window.nexoExternalNotifications));
    } catch(e) {}
    atualizarListaNotificacoes();
  }
};

function inicializarTema() {
  const botaoTema = document.getElementById("theme-toggle");
  if (!botaoTema) return;
  const temaSalvo = localStorage.getItem("tema-dashboard");
  const temaInicial = temaSalvo === "light" ? "light" : "dark";

  aplicarTema(temaInicial, botaoTema);

  botaoTema.addEventListener("click", () => {
    const novoTema =
      document.documentElement.dataset.theme === "dark" ? "light" : "dark";
    aplicarTema(novoTema, botaoTema);
    if (window.bancoDeDados?.datasDisponiveis?.length) {
      const paineis = [
        document.getElementById("painel-operacional"),
        document.getElementById("painel-analitico"),
        document.getElementById("painel-engenharia"),
      ];
      const painelAtivo = paineis.find((painel) => painel && !painel.hidden);
      if (!painelAtivo) return;
      if (painelAtivo.id === "painel-operacional") {
        renderizarDashboard();
      } else if (painelAtivo.id === "painel-analitico") {
        renderizarAnalises();
      } else {
        renderizarEngenharia();
      }
    }
  });
}

function aplicarTema(tema, botaoTema) {
  const temaAlvo = tema === "dark" ? "claro" : "escuro";
  document.documentElement.dataset.theme = tema;
  botaoTema.setAttribute("aria-label", `Ativar tema ${temaAlvo}`);
  botaoTema.title = `Ativar tema ${temaAlvo}`;
  botaoTema.setAttribute("aria-pressed", String(tema === "light"));
  localStorage.setItem("tema-dashboard", tema);
}

function inicializarDashboard() {
  const banco = window.bancoDeDados;

  if (
    !banco ||
    !banco.datasDisponiveis ||
    banco.datasDisponiveis.length === 0
  ) {
    document.getElementById("grid-reservatorios").innerHTML =
      "<p style='color: #8e8e8e;'>Nenhum dado encontrado no banco de dados.</p>";
    return;
  }

  const ultimaDataDoBanco =
    banco.datasDisponiveis[banco.datasDisponiveis.length - 1];
  const lblAtualizacao = document.getElementById("lbl-atualizacao");
  if (lblAtualizacao) {
    lblAtualizacao.textContent = ultimaDataDoBanco;
  }
  const dadosUltimoDia = banco.historico[ultimaDataDoBanco];
  const lblBoletimDataHora = document.getElementById("lbl-boletim-data-hora");
  if (lblBoletimDataHora && dadosUltimoDia) {
    lblBoletimDataHora.textContent = dadosUltimoDia.ultimaAtualizacao || `${ultimaDataDoBanco} 05:15`;
  }

  const seletorData = document.getElementById("seletor-data");
  seletorData.innerHTML = "";
  banco.datasDisponiveis.forEach((data) => {
    const option = document.createElement("option");
    option.value = data;
    option.textContent = data;
    seletorData.appendChild(option);
  });
  seletorData.value = ultimaDataDoBanco;

  const seletorFiltro = document.getElementById("seletor-filtro");
  const seletorBaseComparacao = document.getElementById("seletor-base-vazao");
  const seletorEscopo = document.getElementById("seletor-escopo-operacional");
  const parametrosView = new URLSearchParams(window.location.search);
  const reservatorioInvestigado = parametrosView.get("reservatorio");
  window.veioDeAlertasCCO =
    parametrosView.get("origem") === "mural" && Boolean(reservatorioInvestigado);
  preencherSeletorFiltro(
    ultimaDataDoBanco,
    reservatorioInvestigado
      ? `reservatorio:${reservatorioInvestigado}`
      : "TODOS",
  );
  inicializarNavegacao();
  const viewsPorAba = {
    operacional: "tab-operacional",
    analitico: "tab-analitico",
    engenharia: "tab-engenharia",
    alarmes: "tab-alarmes",
    exceccoes: "tab-alarmes",
  };
  const viewInicial = new URLSearchParams(window.location.search).get("view");
  document.getElementById(viewsPorAba[viewInicial])?.click();
  inicializarAnalises();
  inicializarEngenharia();
  inicializarConfiguracoes();

  const containerGrid = document.getElementById("grid-reservatorios");
  const resumoOperacional = document.getElementById("operational-summary");
  resumoOperacional.addEventListener("click", (e) => {
    const botaoCategoria = e.target.closest("[data-operational-category]");
    if (!botaoCategoria) return;

    const categoria = botaoCategoria.dataset.operationalCategory;
    categoriaBoletimAtiva =
      categoriaBoletimAtiva === categoria ? null : categoria;
    renderizarDashboard();
  });

  document
    .getElementById("operational-details")
    .addEventListener("click", (e) => {
      const botaoReservatorio = e.target.closest("[data-detail-reservoir]");
      if (!botaoReservatorio) return;

      const chave = botaoReservatorio.dataset.detailReservoir;
      categoriaBoletimAtiva = null;
      seletorFiltro.value = `reservatorio:${chave}`;
      seletorFiltro.dispatchEvent(new Event("change", { bubbles: true }));
      document.getElementById("painel-operacional").scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    });

  containerGrid.addEventListener("click", (e) => {
    const botaoAnalise = e.target.closest("[data-open-reservoir-analysis]");
    if (botaoAnalise) {
      e.preventDefault();
      e.stopPropagation();
      analiseReservatorioAberta = true;
      graficoAnaliseComMedias = false;
      graficoAnaliseComHistorico = false;
      seriesAnaliseOcultas.clear();
      renderizarDashboard();
      document
        .getElementById("analise-grafico-reservatorio")
        .scrollIntoView({ behavior: "smooth", block: "start" });
      return;
    }
    const card = e.target.closest(".card");
    if (card) selecionarCard(card);
  });

  const painelAnaliseReservatorio = document.getElementById(
    "analise-grafico-reservatorio",
  );
  painelAnaliseReservatorio.addEventListener("click", (e) => {
    if (e.target.closest("[data-close-reservoir-analysis]")) {
      analiseReservatorioAberta = false;
      renderizarDashboard();
      document.querySelector(".card.is-selected")?.scrollIntoView({
        behavior: "smooth",
        block: "center",
      });
      return;
    }
    const botaoModo = e.target.closest("[data-analysis-chart-mode]");
    if (botaoModo) {
      graficoAnaliseComMedias =
        botaoModo.dataset.analysisChartMode === "averages";
      renderizarDashboard();
      return;
    }
    const opcaoHistorico = e.target.closest("[data-analysis-history]");
    if (opcaoHistorico) {
      graficoAnaliseComHistorico = opcaoHistorico.checked;
      renderizarDashboard();
    }
  });

  painelAnaliseReservatorio.addEventListener("change", (e) => {
    const controleSerie = e.target.closest("[data-analysis-series]");
    if (!controleSerie) return;

    const canvas = painelAnaliseReservatorio.querySelector(
      ".reservoir-analysis-chart canvas",
    );
    const chart = canvas ? Chart.getChart(canvas) : null;
    const indiceSerie = Number(controleSerie.dataset.analysisSeries);
    if (!chart || !Number.isInteger(indiceSerie)) return;

    chart.setDatasetVisibility(indiceSerie, controleSerie.checked);
    const nomeSerie = chart.data.datasets[indiceSerie]?.label;
    if (nomeSerie) {
      const chaveSerie = obterChaveSerieAnalise(nomeSerie);
      if (controleSerie.checked) seriesAnaliseOcultas.delete(chaveSerie);
      else seriesAnaliseOcultas.add(chaveSerie);
    }
    chart.update();
  });

  containerGrid.addEventListener("keydown", (e) => {
    if (
      e.target.classList.contains("card") &&
      (e.key === "Enter" || e.key === " ")
    ) {
      e.preventDefault();
      selecionarCard(e.target);
    }
  });

  renderizarDashboard();

  seletorData.addEventListener("change", async (e) => {
    //await carregarMesPorData(e.target.value);
    preencherSeletorFiltro(e.target.value, seletorFiltro.value);
    renderizarDashboard();
  });

  seletorFiltro.addEventListener("change", () => {
    exibindoEsquemaAutonomia = false;
    if (
      analiseReservatorioAberta &&
      !seletorFiltro.value.startsWith("reservatorio:")
    ) {
      analiseReservatorioAberta = false;
    }
    renderizarDashboard();
  });

  seletorBaseComparacao.addEventListener("change", renderizarDashboard);
  seletorEscopo.addEventListener("change", renderizarDashboard);

  const btnToggleGrid = document.getElementById("btn-toggle-grid-reservatorios");
  const gridReservatorios = document.getElementById("grid-reservatorios");
  if (btnToggleGrid && gridReservatorios) {
    btnToggleGrid.addEventListener("click", () => {
      gridReservatoriosAberto = !gridReservatoriosAberto;
      renderizarDashboard();
      btnToggleGrid.querySelector("span").textContent = gridReservatoriosAberto
        ? "👁️ Ocultar Cards de Reservatórios"
        : "👁️ Mostrar Cards de Reservatórios";
    });
  }

  const btnCopiarResumo = document.getElementById("btn-copiar-resumo");
  const btnCopiarPlantaoCCO = document.getElementById("btn-copiar-plantao-cco");

  const executarCopiaResumo = (botaoAlvo) => {
    const dataSelecionada = document.getElementById("seletor-data").value;
    const banco = window.bancoDeDados;
    const dadosDoDia = banco?.historico?.[dataSelecionada];
    if (!dadosDoDia) {
      alert("Nenhum dado carregado para gerar o resumo.");
      return;
    }

    const baseComparacao = document.getElementById("seletor-base-vazao")?.value || "same-weekday-4";
    const escopoOperacional = document.getElementById("seletor-escopo-operacional")?.value || "ambos";

    const criticos = [];
    const atencao = [];
    const incompletos = [];
    const horarios = dadosDoDia.horarios || [];
    const quantidadeSlots = horarios.length;

    Object.entries(dadosDoDia.reservatorios || {}).forEach(([chave, res]) => {
      const nomeRes = res.nome || chave;
      const tagMatch = nomeRes.match(/\b(?:R\d{1,3}(?:-[A-Z])?|ES\d{2}|EAT\s+R\d{1,3}|ETA\s+[A-Z0-9\s-]+)\b/i);
      const tagLimpa = tagMatch ? tagMatch[0].trim() : nomeRes.replace(/\s*\(.*?\)/g, '').split('-')[0].trim();
      const restoNome = nomeRes.includes('-') ? nomeRes.split('-').slice(1).join('-').trim() : '';
      const rotuloFormatado = restoNome ? `${tagLimpa} - ${restoNome}` : tagLimpa;

      const nivelAtual = obterUltimaLeituraNivel(res.leituras?.nivel);
      const qualidade = avaliarQualidadeLeituras(res.leituras?.nivel, res.leituras?.vazao, quantidadeSlots);
      
      const nivelAtencaoVal = escopoOperacional !== "vazao";
      const vazaoAtivaVal = escopoOperacional !== "nivel";

      const comparacaoNivel = obterComparacaoNivel(
        banco,
        chave,
        dataSelecionada,
        baseComparacao,
        horarios,
        nivelAtual,
      );
      const statusNivel = avaliarStatusNivel(res.leituras?.nivel, chave, comparacaoNivel?.referencia);
      const alertaVazao = avaliarAlertaVazao(
        res.leituras?.vazao,
        obterReferenciaVazao(banco, chave, dataSelecionada, baseComparacao, horarios),
        horarios,
        chave,
      );

      const statusNivelAtivo = nivelAtencaoVal && ["Normal", "Atenção", "Crítico"].includes(statusNivel) ? statusNivel : null;
      const statusVazaoAtivo = vazaoAtivaVal && ["Normal", "Atenção", "Crítico"].includes(alertaVazao?.status) ? alertaVazao.status : null;
      const statusAtivos = [statusNivelAtivo, statusVazaoAtivo].filter(Boolean);

      let statusGeral = "Normal";
      if (statusAtivos.includes("Crítico")) statusGeral = "Crítico";
      else if (statusAtivos.includes("Atenção")) statusGeral = "Atenção";

      const diagTexto = statusNivel === "Crítico" ? `Nível Crítico (${nivelAtual !== null ? nivelAtual + '%' : 'N/A'})` : statusNivel === "Atenção" ? `Nível Atenção (${nivelAtual !== null ? nivelAtual + '%' : 'N/A'})` : `Vazão: ${alertaVazao?.status}`;
      const info = `- ${rotuloFormatado}: Nível ${nivelAtual !== null ? nivelAtual + '%' : 'N/A'} [Diagnóstico: ${diagTexto}]`;

      if (statusGeral === "Crítico") criticos.push(info);
      else if (statusGeral === "Atenção") atencao.push(info);

      if (qualidade.nivelAusente > 0 || qualidade.vazaoAusente > 0 || statusNivel === "Sem Dados" || statusNivel === "Inconsistente") {
        const razaoIncompleto = statusNivel === "Inconsistente" ? "leitura(s) inconsistente(s)" : `${qualidade.nivelAusente + qualidade.vazaoAusente} leitura(s) ausente(s)`;
        incompletos.push(`- ${rotuloFormatado}: ${razaoIncompleto} [Falha de Telemetria / Sem Dados]`);
      }
    });

    let textoResumo = `📋 RESUMO DE PASSAGEM DE PLANTÃO - CCO SAMAE\n`;
    textoResumo += `📅 Boletim: ${dataSelecionada} (${dadosDoDia.ultimaAtualizacao || '05:15'})\n\n`;

    if (criticos.length > 0) {
      textoResumo += `🔴 CRÍTICOS (${criticos.length}):\n` + criticos.join("\n") + `\n\n`;
    } else {
      textoResumo += `🔴 CRÍTICOS: Nenhum\n\n`;
    }

    if (atencao.length > 0) {
      textoResumo += `🟡 ATENÇÃO (${atencao.length}):\n` + atencao.join("\n") + `\n\n`;
    } else {
      textoResumo += `🟡 ATENÇÃO: Nenhum\n\n`;
    }

    if (incompletos.length > 0) {
      textoResumo += `⚠️ INCOMPLETOS / AUSENTES (${incompletos.length}):\n` + incompletos.join("\n") + `\n\n`;
    } else {
      textoResumo += `⚠️ INCOMPLETOS: Nenhum\n\n`;
    }

    textoResumo += `*(Gerado automaticamente pelo Sistema de Monitoramento CCO)*`;

    navigator.clipboard.writeText(textoResumo).then(() => {
      const alvo = botaoAlvo || btnCopiarResumo;
      if (!alvo) return;
      const textoOriginal = alvo.innerHTML;
      alvo.innerHTML = `<span>✓ Resumo Copiado!</span>`;
      setTimeout(() => {
        alvo.innerHTML = textoOriginal;
      }, 3000);
    }).catch(err => {
      console.error("Erro ao copiar resumo:", err);
      alert("Não foi possível copiar o resumo para a área de transferência.");
    });
  };

  if (btnCopiarResumo) {
    btnCopiarResumo.addEventListener("click", () => executarCopiaResumo(btnCopiarResumo));
  }
  if (btnCopiarPlantaoCCO) {
    btnCopiarPlantaoCCO.addEventListener("click", () => executarCopiaResumo(btnCopiarPlantaoCCO));
  }

  const btnExportarCSV = document.getElementById("btn-exportar-csv");
  if (btnExportarCSV) {
    btnExportarCSV.addEventListener("click", () => {
      const banco = window.bancoDeDados;
      const dataSelecionada = document.getElementById("seletor-data").value;
      const exceccoes = typeof obterReservatoriosComAlertaOuExcecao === 'function' ? obterReservatoriosComAlertaOuExcecao(banco, dataSelecionada) : [];
      
      let csvContent = "\uFEFFData;Chave;Reservatório;Severidade;Diagnóstico;Tendência\n";
      exceccoes.forEach(exc => {
        const diag = (exc.mensagens || []).join(" | ").replace(/;/g, ",");
        csvContent += `${dataSelecionada};${exc.chave};"${exc.nome}";${exc.severidade};"${diag}";"${exc.predicao?.tendencia || 'N/A'}"\n`;
      });

      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `relatorio_alarmes_cco_${dataSelecionada}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    });
  }

  const btnExportarHTML = document.getElementById("btn-exportar-html");
  if (btnExportarHTML) {
    btnExportarHTML.addEventListener("click", () => {
      const banco = window.bancoDeDados;
      const dataSelecionada = document.getElementById("seletor-data").value;
      const exceccoes = typeof obterReservatoriosComAlertaOuExcecao === 'function' ? obterReservatoriosComAlertaOuExcecao(banco, dataSelecionada) : [];

      const htmlContent = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="UTF-8">
<title>Relatório de Alertas CCO - ${dataSelecionada}</title>
<style>
  body { font-family: Arial, sans-serif; margin: 20px; color: #333; background: #fff; }
  h1 { color: #0877b9; border-bottom: 2px solid #0877b9; padding-bottom: 8px; }
  table { width: 100%; border-collapse: collapse; margin-top: 20px; }
  th, td { border: 1px solid #ddd; padding: 10px; text-align: left; font-size: 0.9rem; }
  th { background: #f4f6f8; color: #17212b; }
  .badge { padding: 4px 8px; border-radius: 4px; font-weight: bold; font-size: 0.75rem; text-transform: uppercase; }
  .critico { background: rgba(242,73,73,0.2); color: #b42318; border: 1px solid #b42318; }
  .atencao { background: rgba(255,153,0,0.2); color: #8a4b00; border: 1px solid #8a4b00; }
  .incompleto { background: rgba(59,130,246,0.2); color: #1d4ed8; border: 1px solid #1d4ed8; }
</style>
</head>
<body>
  <h1>Inteligência Operacional - Relatório de Alertas Ativos</h1>
  <p><strong>Data de Referência:</strong> ${dataSelecionada}</p>
  <p><strong>Total de Ocorrências:</strong> ${exceccoes.length}</p>
  <table>
    <thead>
      <tr>
        <th>TAG / Reservatório</th>
        <th>Chave</th>
        <th>Severidade</th>
        <th>Diagnósticos e Mensagens</th>
        <th>Tendência</th>
      </tr>
    </thead>
    <tbody>
      ${exceccoes.map(exc => `
        <tr>
          <td><strong>${exc.nome}</strong></td>
          <td>${exc.chave}</td>
          <td><span class="badge ${exc.severidade === 'Crítico' ? 'critico' : exc.severidade === 'Atenção' ? 'atencao' : 'incompleto'}">${exc.severidade}</span></td>
          <td>${(exc.mensagens || []).join("<br>")}</td>
          <td>${exc.predicao?.tendencia || 'N/A'} (${exc.predicao?.iconeTendencia || '→'})</td>
        </tr>
      `).join("")}
    </tbody>
  </table>
  <footer style="margin-top: 30px; font-size: 0.8rem; color: #666; border-top: 1px solid #ddd; padding-top: 10px;">
    Gerado automaticamente pelo Sistema CCO SAMAE - Data/Hora: ${new Date().toLocaleString("pt-BR")}
  </footer>
</body>
</html>`;

      const blob = new Blob([htmlContent], { type: 'text/html;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `relatorio_cco_${dataSelecionada}.html`;
      a.click();
      URL.revokeObjectURL(url);
    });
  }

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && seletorFiltro.value !== "TODOS") {
      e.preventDefault();
      seletorFiltro.value = "TODOS";
      seletorFiltro.dispatchEvent(new Event("change", { bubbles: true }));
      seletorFiltro.focus();
    }
  });
}

function inicializarNavegacao() {
  const abas = Array.from(document.querySelectorAll(".view-tab"));
  const paineis = {
    "tab-operacional": document.getElementById("painel-operacional"),
    "tab-analitico": document.getElementById("painel-analitico"),
    "tab-engenharia": document.getElementById("painel-engenharia"),
    "tab-alarmes": document.getElementById("painel-alarmes"),
  };
  const viewsPorAba = {
    "tab-operacional": "operacional",
    "tab-analitico": "analitico",
    "tab-engenharia": "engenharia",
    "tab-alarmes": "alarmes",
  };
  window.nexoViewWindows = window.nexoViewWindows || {};

  function ativarAba(abaAtiva) {
    document.body.classList.add("is-view-window-active");
    document.body.classList.toggle("is-cco-fullscreen-active", abaAtiva.id === "tab-alarmes");
    if (abaAtiva.id !== "tab-operacional") {
      document.body.classList.remove("is-cco-investigation-active");
    }
    abas.forEach((aba) => {
      const ativa = aba === abaAtiva;
      aba.classList.toggle("is-active", ativa);
      aba.setAttribute("aria-selected", String(ativa));
      aba.tabIndex = ativa ? 0 : -1;
      if (paineis[aba.id]) paineis[aba.id].hidden = !ativa;
    });

    if (abaAtiva.id === "tab-analitico") renderizarAnalises();
    if (abaAtiva.id === "tab-engenharia") renderizarEngenharia();
    if (abaAtiva.id === "tab-alarmes") {
      window.veioDeAlertasCCO = false;
      renderizarDashboardExceccoes();
    }
  }

  abas.forEach((aba) => {
    aba.classList.remove("is-active");
    aba.setAttribute("aria-selected", "false");
    aba.tabIndex = -1;
    if (paineis[aba.id]) paineis[aba.id].hidden = true;
  });

  const btnNotificacoes = document.getElementById("btn-notificacoes");
  if (btnNotificacoes) {
    btnNotificacoes.addEventListener("click", () => {
      // Reservado para Central de Notificações / futuras atualizações CCO
    });
  }



  function atualizarRelogioCCO() {
    const relogio = document.getElementById("cco-clock-display");
    if (relogio) {
      const agora = new Date();
      const dataStr = agora.toLocaleDateString("pt-BR");
      const horaStr = agora.toLocaleTimeString("pt-BR");
      relogio.innerHTML = `
        <div style="font-size: 0.75rem; opacity: 0.85; line-height: 1.2;">${dataStr}</div>
        <div style="font-size: 0.85rem; line-height: 1.2;">${horaStr}</div>
      `;
    }
  }
  setInterval(atualizarRelogioCCO, 1000);
  atualizarRelogioCCO();

  abas.forEach((aba) => {
    aba.addEventListener("click", (e) => {
      const view = viewsPorAba[aba.id];
      const viewAtual = new URLSearchParams(window.location.search).get("view");
      if (viewAtual !== view) {
        e.preventDefault();
        const url = new URL(window.location.href);
        url.searchParams.set("view", view);
        if (aba.id === "tab-alarmes") {
          if (window.ccoMuralWindow && !window.ccoMuralWindow.closed) {
            window.ccoMuralWindow.focus();
          } else {
            window.ccoMuralWindow = window.open(
              url.href,
              "ccoMuralWindow",
              "width=1200,height=800",
            );
          }
        } else {
          const janelaExistente = window.nexoViewWindows[view];
          if (janelaExistente && !janelaExistente.closed) {
            janelaExistente.focus();
          } else {
            window.nexoViewWindows[view] = window.open(
              url.href,
              `nexoViewWindow_${view}`,
              "width=1200,height=800",
            );
          }
        }
        return;
      }
      ativarAba(aba);
    });
    aba.addEventListener("keydown", (e) => {
      const index = abas.indexOf(aba);
      let proximoIndex;
      if (e.key === "ArrowRight") proximoIndex = (index + 1) % abas.length;
      if (e.key === "ArrowLeft")
        proximoIndex = (index - 1 + abas.length) % abas.length;
      if (e.key === "Home") proximoIndex = 0;
      if (e.key === "End") proximoIndex = abas.length - 1;

      if (proximoIndex !== undefined) {
        e.preventDefault();
        abas[proximoIndex].focus();
        ativarAba(abas[proximoIndex]);
      }
    });
  });
}

async function inicializarAnalises() {
  const banco = window.bancoDeDados;
  const datas = banco.datasDisponiveis;
  const seletorInicio = document.getElementById("analise-inicio");
  const seletorFim = document.getElementById("analise-fim");
  const seletorGrupo = document.getElementById("analise-grupo");
  const seletorReservatorios = document.getElementById("analise-reservatorios");

  if (!seletorInicio || !seletorFim) return;

  seletorInicio.innerHTML = "";
  seletorFim.innerHTML = "";
  datas.forEach((data) => {
    seletorInicio.add(new Option(data, data));
    seletorFim.add(new Option(data, data));
  });
  seletorInicio.value = datas[obterIndiceInicioPeriodoRecente(datas)];
  seletorFim.value = datas[datas.length - 1];

  // Garante carregamento dos meses do período selecionado nas análises
  await garantirPeriodoCarregado(seletorInicio.value, seletorFim.value);

  seletorGrupo.innerHTML = "";
  seletorGrupo.add(new Option("Todos os grupos", "TODOS"));

  const ultimaData = datas[datas.length - 1];
  const ultimoDia = banco.historico[ultimaData];
  if (ultimoDia && ultimoDia.reservatorios) {
    const grupos = new Set(
      Object.values(ultimoDia.reservatorios).map(
        (reservatorio) => reservatorio.grupo,
      ),
    );
    grupos.forEach((grupo) => seletorGrupo.add(new Option(grupo, grupo)));
  }

  preencherReservatoriosAnalise("TODOS", []);

  seletorInicio.removeEventListener("change", acaoMudancaAnalise);
  seletorInicio.addEventListener("change", acaoMudancaAnalise);

  seletorFim.removeEventListener("change", acaoMudancaAnalise);
  seletorFim.addEventListener("change", acaoMudancaAnalise);

  seletorGrupo.addEventListener("change", () => {
    const selecoes = obterReservatoriosSelecionados(seletorReservatorios);
    preencherReservatoriosAnalise(seletorGrupo.value, selecoes);
    renderizarAnalises();
  });
  seletorReservatorios.addEventListener("change", () => {
    atualizarContagemReservatorios(
      seletorReservatorios,
      "dica-selecao-reservatorios",
    );
    renderizarAnalises();
  });
}

async function acaoMudancaAnalise() {
  const seletorInicio = document.getElementById("analise-inicio");
  const seletorFim = document.getElementById("analise-fim");
  await garantirPeriodoCarregado(seletorInicio.value, seletorFim.value);
  renderizarAnalises();
}

async function garantirPeriodoCarregado(inicioStr, fimStr) {
  const banco = window.bancoDeDados;
  const datas = banco.datasDisponiveis;
  const iInicio = datas.indexOf(inicioStr);
  const iFim = datas.indexOf(fimStr);
  if (iInicio < 0 || iFim < 0) return;

  const periodo = datas.slice(
    Math.min(iInicio, iFim),
    Math.max(iInicio, iFim) + 1,
  );
  for (const data of periodo) {
    if (!banco.historico[data]) {
      await carregarMesPorData(data);
    }
  }
}

async function inicializarEngenharia() {
  const banco = window.bancoDeDados;
  const datas = banco.datasDisponiveis;
  const ultimaData = datas[datas.length - 1];

  if (!banco.historico[ultimaData]) {
    await carregarMesPorData(ultimaData);
  }

  const reservatorios = banco.historico[ultimaData]?.reservatorios || {};
  const seletorInicio = document.getElementById("engenharia-inicio");
  const seletorFim = document.getElementById("engenharia-fim");
  const seletorGrupo = document.getElementById("engenharia-grupo");

  if (!seletorInicio || !seletorFim) return;

  seletorInicio.innerHTML = "";
  seletorFim.innerHTML = "";
  datas.forEach((data) => {
    seletorInicio.add(new Option(data, data));
    seletorFim.add(new Option(data, data));
  });
  seletorInicio.value = datas[obterIndiceInicioPeriodoRecente(datas)];
  seletorFim.value = ultimaData;

  await garantirPeriodoCarregadoEngenharia(
    seletorInicio.value,
    seletorFim.value,
  );

  seletorGrupo.innerHTML = "";
  seletorGrupo.add(new Option("Todos os grupos", "TODOS"));
  const grupos = new Set(
    Object.values(reservatorios).map((reservatorio) => reservatorio.grupo),
  );
  grupos.forEach((grupo) => seletorGrupo.add(new Option(grupo, grupo)));
  preencherReservatoriosEngenharia("TODOS", []);

  seletorInicio.removeEventListener("change", acaoMudancaEngenharia);
  seletorInicio.addEventListener("change", acaoMudancaEngenharia);
  seletorFim.removeEventListener("change", acaoMudancaEngenharia);
  seletorFim.addEventListener("change", acaoMudancaEngenharia);

  seletorGrupo.addEventListener("change", () => {
    const selecionador = document.getElementById("engenharia-reservatorios");
    const selecionados = obterReservatoriosSelecionados(selecionador);
    preencherReservatoriosEngenharia(seletorGrupo.value, selecionados);
    renderizarEngenharia();
  });
  const seletorReservatorios = document.getElementById(
    "engenharia-reservatorios",
  );
  seletorReservatorios.addEventListener("change", () => {
    atualizarContagemReservatorios(
      seletorReservatorios,
      "dica-selecao-engenharia",
    );
    renderizarEngenharia();
  });
}

async function acaoMudancaEngenharia() {
  const seletorInicio = document.getElementById("engenharia-inicio");
  const seletorFim = document.getElementById("engenharia-fim");
  await garantirPeriodoCarregadoEngenharia(
    seletorInicio.value,
    seletorFim.value,
  );
  renderizarEngenharia();
}

async function garantirPeriodoCarregadoEngenharia(inicioStr, fimStr) {
  const banco = window.bancoDeDados;
  const datas = banco.datasDisponiveis;
  const iInicio = datas.indexOf(inicioStr);
  const iFim = datas.indexOf(fimStr);
  if (iInicio < 0 || iFim < 0) return;

  const periodo = datas.slice(
    Math.min(iInicio, iFim),
    Math.max(iInicio, iFim) + 1,
  );
  for (const data of periodo) {
    if (!banco.historico[data]) {
      await carregarMesPorData(data);
    }
  }
}

async function renderizarDashboard() {
  const banco = window.bancoDeDados;
  const dataSelecionada = document.getElementById("seletor-data").value;
  const filtroSelecionado = document.getElementById("seletor-filtro").value;

  if (!banco.historico[dataSelecionada]) {
    await carregarMesPorData(dataSelecionada);
  }

  const dadosDoDia = banco.historico ? banco.historico[dataSelecionada] : null;

  if (!dadosDoDia) {
    console.error(`Dados não encontrados para a data ${dataSelecionada}`);
    return;
  }

  if (typeof atualizarBadgeAlarmes === "function") {
    atualizarBadgeAlarmes();
  }

  const lblBoletimDataHora = document.getElementById("lbl-boletim-data-hora");
  if (lblBoletimDataHora) {
    lblBoletimDataHora.textContent = dadosDoDia.ultimaAtualizacao || `${dataSelecionada} 05:15`;
  }

  const containerGrid = document.getElementById("grid-reservatorios");
  const painelOperacional = document.getElementById("painel-operacional");
  const resumoOperacional =
    painelOperacional.querySelector(".operational-brief");
  const painelAnaliseReservatorio = document.getElementById(
    "analise-grafico-reservatorio",
  );

  if (
    analiseReservatorioAberta &&
    !filtroSelecionado.startsWith("reservatorio:")
  ) {
    analiseReservatorioAberta = false;
  }

  const eInvestigacaoReservatorio = filtroSelecionado.startsWith("reservatorio:");
  const globalControls = document.querySelector(".operational-global-controls");
  if (globalControls) {
    globalControls.hidden = eInvestigacaoReservatorio;
  }
  containerGrid.hidden =
    (!gridReservatoriosAberto && !eInvestigacaoReservatorio) || categoriaBoletimAtiva !== null || analiseReservatorioAberta;
  resumoOperacional.hidden = analiseReservatorioAberta;
  painelAnaliseReservatorio.hidden = !analiseReservatorioAberta;
  containerGrid.classList.toggle(
    "has-selected-reservoir",
    filtroSelecionado.startsWith("reservatorio:"),
  );

  containerGrid.innerHTML = "";

  Object.keys(instanciasGraficos).forEach((key) => {
    if (instanciasGraficos[key]) {
      instanciasGraficos[key].destroy();
    }
  });
  instanciasGraficos = {};

  const reservatorios = dadosDoDia.reservatorios || {};
  const horarios = dadosDoDia.horarios || [];
  const visaoGeral = filtroSelecionado === "TODOS";

  if (typeof atualizarHeaderEnxutoInvestigacao === "function") {
    atualizarHeaderEnxutoInvestigacao(
      painelOperacional,
      filtroSelecionado,
      reservatorios,
      dataSelecionada,
      dadosDoDia,
    );
  }
  const datas = banco.datasDisponiveis;
  const indiceData = datas.indexOf(dataSelecionada);
  const dataAnterior = indiceData > 0 ? datas[indiceData - 1] : null;

  if (dataAnterior && !banco.historico[dataAnterior]) {
    await carregarMesPorData(dataAnterior);
  }

  const dadosDiaAnterior = dataAnterior ? banco.historico[dataAnterior] : null;
  const reservatoriosDiaAnterior = dadosDiaAnterior?.reservatorios ?? {};
  const baseComparacao = document.getElementById("seletor-base-vazao").value;
  const escopoOperacional = document.getElementById(
    "seletor-escopo-operacional",
  ).value;

  let chavesParaExibir = Object.keys(reservatorios);

  if (filtroSelecionado.startsWith("grupo:")) {
    const grupoSelecionado = filtroSelecionado.slice("grupo:".length);
    chavesParaExibir = chavesParaExibir.filter(
      (chave) => reservatorios[chave].grupo === grupoSelecionado,
    );
  } else if (filtroSelecionado.startsWith("reservatorio:")) {
    const reservatorioSelecionado = filtroSelecionado.slice(
      "reservatorio:".length,
    );
    chavesParaExibir = chavesParaExibir.filter(
      (chave) => chave === reservatorioSelecionado,
    );
  }

  renderizarBoletimOperacional({
    dataSelecionada,
    dataAnterior,
    filtroSelecionado,
    reservatorios,
    reservatoriosDiaAnterior,
    horarios,
    banco,
    baseComparacao,
    escopoOperacional,
  });

  chavesParaExibir.forEach((chave) => {
    const res = reservatorios[chave];
    const selecionado = filtroSelecionado === `reservatorio:${chave}`;
    const exibirGrafico = !visaoGeral;
    const cardHTML = criarCardHTML(
      res,
      chave,
      exibirGrafico,
      selecionado,
      horarios,
      banco,
      dataSelecionada,
      baseComparacao,
    );
    containerGrid.insertAdjacentHTML("beforeend", cardHTML);

    if (selecionado) {
      const painelAlarme = criarPainelInformativoAlarme(
        res,
        chave,
        horarios,
        banco,
        dataSelecionada,
        baseComparacao,
      );
      containerGrid.append(painelAlarme);

      const painelAutonomia = criarPainelAutonomiaPreditiva(
        res,
        chave,
        horarios,
        banco,
        dataSelecionada,
        baseComparacao,
      );
      containerGrid.append(painelAutonomia);
    }

    if (exibirGrafico && !analiseReservatorioAberta) {
      renderizarGrafico(res.nome, horarios, res.leituras);
      if (selecionado) {
        renderizarGrafico(res.nome, horarios, res.leituras, true);
      }
    }
    if (selecionado && analiseReservatorioAberta) {
      renderizarAnaliseGraficoReservatorio(
        painelAnaliseReservatorio,
        res,
        chave,
        dataSelecionada,
        horarios,
      );
    }
  });
}

function renderizarEngenharia() {
  Object.values(graficosEngenharia).forEach((grafico) => grafico.destroy());
  graficosEngenharia = {};

  const datas = window.bancoDeDados.datasDisponiveis;
  const inicio = document.getElementById("engenharia-inicio").value;
  const fim = document.getElementById("engenharia-fim").value;
  const inicioIndex = datas.indexOf(inicio);
  const fimIndex = datas.indexOf(fim);
  const mensagem = document.getElementById("engenharia-mensagem");
  const resumo = document.getElementById("engenharia-resumo");
  const corpoTabela = document.getElementById("engenharia-registros");
  const paginacao = document.getElementById("engenharia-paginacao");
  const registrosVisiveis = document.getElementById(
    "engenharia-registros-visiveis",
  );
  const botaoCarregarMais = document.getElementById("engenharia-carregar-mais");

  mensagem.classList.remove("has-alerts");
  resumo.replaceChildren();
  corpoTabela.replaceChildren();
  paginacao.hidden = true;
  botaoCarregarMais.onclick = null;

  if (inicioIndex < 0 || fimIndex < 0 || inicioIndex > fimIndex) {
    mensagem.classList.add("has-alerts");
    mensagem.textContent =
      "A data inicial deve ser anterior ou igual à data final.";
    return;
  }

  const datasPeriodo = datas.slice(inicioIndex, fimIndex + 1);
  const chavesSelecionadas = obterReservatoriosSelecionados(
    document.getElementById("engenharia-reservatorios"),
  );

  if (!chavesSelecionadas.length) {
    mensagem.textContent =
      "Selecione pelo menos um reservatório para consultar os dados.";
    return;
  }

  const catalogo =
    window.bancoDeDados.historico[datas[datas.length - 1]]?.reservatorios || {};
  const totais = {
    registros: 0,
    nivelValidas: 0,
    nivelEsperadas: 0,
    vazaoValidas: 0,
    vazaoEsperadas: 0,
    nivelAcimaDe100: 0,
    nivelAcimaDe110: 0,
    nivelNegativo: 0,
    vazaoNegativa: 0,
    diasSemRegistro: 0,
  };

  const series = chavesSelecionadas.map((chave, indice) => ({
    chave,
    reservatorio: catalogo[chave],
    color: coresAnaliticas[indice % coresAnaliticas.length],
    leiturasPorData: [],
  }));
  const registrosTabela = [];

  datasPeriodo.forEach((data) => {
    const dadosDoDia = window.bancoDeDados.historico[data];
    const horarios = dadosDoDia?.horarios ?? [];
    chavesSelecionadas.forEach((chave, indiceReservatorio) => {
      const reservatorio = dadosDoDia?.reservatorios?.[chave];
      const leituras = reservatorio?.leituras;
      const niveis = resumirLeiturasEstruturadas(leituras?.nivel, horarios);
      const vazoes = resumirLeiturasEstruturadas(leituras?.vazao, horarios);
      const quantidadeSlots = Math.max(
        horarios.length,
        leituras?.nivel?.length ?? 0,
        leituras?.vazao?.length ?? 0,
      );
      const qualidade = avaliarQualidadeLeituras(
        leituras?.nivel,
        leituras?.vazao,
        quantidadeSlots,
      );

      totais.registros += reservatorio ? 1 : 0;
      totais.diasSemRegistro += reservatorio ? 0 : 1;
      totais.nivelValidas += niveis.quantidade;
      totais.nivelEsperadas += quantidadeSlots;
      totais.vazaoValidas += vazoes.quantidade;
      totais.vazaoEsperadas += quantidadeSlots;
      Object.keys(qualidade).forEach((tipo) => {
        totais[tipo] += qualidade[tipo];
      });
      series[indiceReservatorio].leiturasPorData.push({
        nivelMin: niveis.minimo,
        nivelMedia: niveis.media,
        nivelMax: niveis.maximo,
        vazaoMin: vazoes.minimo,
        vazaoMedia: vazoes.media,
        vazaoMax: vazoes.maximo,
      });

      registrosTabela.push({
        chave,
        data,
        reservatorio: reservatorio ?? catalogo[chave],
        horarios,
        niveis,
        vazoes,
        estatisticasHistoricas: null,
        qualidade,
        temRegistro: Boolean(reservatorio),
        quantidadeSlots,
      });
    });
  });

  const totalSinalizacoes =
    totais.nivelAcimaDe100 +
    totais.nivelAcimaDe110 +
    totais.nivelNegativo +
    totais.vazaoNegativa;

  criarResumoAnalitico(resumo, [
    ["Período consultado", `${inicio} – ${fim}`],
    ["Registros diários", String(totais.registros)],
    [
      "Cobertura de nível",
      `${totais.nivelValidas} / ${totais.nivelEsperadas} leituras`,
    ],
    [
      "Cobertura de vazão",
      `${totais.vazaoValidas} / ${totais.vazaoEsperadas} leituras`,
    ],
    ["Sinalizações para revisão", String(totalSinalizacoes)],
  ]);

  renderizarGraficosEngenharia(datasPeriodo, series);
  let quantidadeExibida = 0;

  const carregarProximaPagina = () => {
    const fimPagina = Math.min(
      quantidadeExibida + TAMANHO_PAGINA_ENGENHARIA,
      registrosTabela.length,
    );
    const fragmento = document.createDocumentFragment();
    for (; quantidadeExibida < fimPagina; quantidadeExibida += 1) {
      fragmento.append(
        criarLinhaEngenharia(registrosTabela[quantidadeExibida]),
      );
    }
    corpoTabela.append(fragmento);
    registrosVisiveis.textContent = `Exibindo ${quantidadeExibida} de ${registrosTabela.length} registros.`;
    botaoCarregarMais.hidden = quantidadeExibida >= registrosTabela.length;
  };

  if (registrosTabela.length > TAMANHO_PAGINA_ENGENHARIA) {
    paginacao.hidden = false;
    botaoCarregarMais.onclick = carregarProximaPagina;
    carregarProximaPagina();
  } else {
    paginacao.hidden = registrosTabela.length === 0;
    carregarProximaPagina();
  }

  mensagem.textContent =
    "Os valores originais são preservados nesta visão. Sinalizações destacam " +
    "leituras para revisão e não representam alarmes ou limites operacionais.";
  if (totais.diasSemRegistro) {
    mensagem.textContent +=
      ` Há ${totais.diasSemRegistro} combinação(ões) de reservatório/data ` +
      "sem registro no histórico.";
  }
}

function renderizarAnalises() {
  const canvasNivel = document.getElementById("grafico-analise-nivel");
  if (!canvasNivel) return;

  Object.values(graficosAnaliticos).forEach((grafico) => grafico.destroy());
  graficosAnaliticos = {};

  const banco = window.bancoDeDados;
  const datas = banco.datasDisponiveis;
  const indiceInicio = datas.indexOf(
    document.getElementById("analise-inicio").value,
  );
  const indiceFim = datas.indexOf(document.getElementById("analise-fim").value);
  const mensagem = document.getElementById("analise-mensagem");
  const resumo = document.getElementById("analise-resumo");
  const corpoTabela = document.getElementById("analise-comparacao");

  if (!resumo || !corpoTabela) return;

  resumo.replaceChildren();
  corpoTabela.replaceChildren();
  mensagem.textContent = "";

  if (indiceInicio < 0 || indiceFim < 0 || indiceInicio > indiceFim) {
    mensagem.classList.add("has-alerts");
    mensagem.textContent =
      "A data inicial deve ser anterior ou igual à data final.";
    return;
  }

  const datasPeriodo = datas.slice(indiceInicio, indiceFim + 1);
  const chavesSelecionadas = obterReservatoriosSelecionados(
    document.getElementById("analise-reservatorios"),
  );
  const ultimaData = datas[datas.length - 1];
  const catalogo = banco.historico[ultimaData]?.reservatorios || {};
  const reservatorios = chavesSelecionadas
    .filter((chave) => catalogo[chave])
    .map((chave) => ({ chave, ...catalogo[chave] }));

  if (!reservatorios.length) {
    mensagem.classList.remove("has-alerts");
    mensagem.textContent =
      "Selecione pelo menos um reservatório para visualizar as análises.";
    return;
  }

  // --- DOWNSAMPLING INTELIGENTE (Agregação se período > 7 dias) ---
  const usarDownsampling = datasPeriodo.length > 7;

  const series = reservatorios.map((reservatorio, index) => {
    const alertas = {
      nivelAcimaDe100: 0,
      nivelAcimaDe110: 0,
      nivelNegativo: 0,
      vazaoNegativa: 0,
    };

    const leiturasPorData = datasPeriodo.map((data) => {
      const regDia = banco.historico[data]?.reservatorios?.[reservatorio.chave];
      const leituras = regDia?.leituras;

      if (usarDownsampling && regDia?.kpis) {
        const kpis = regDia.kpis;
        const nMed =
          kpis.nivelMedio !== "N/A" ? parseFloat(kpis.nivelMedio) : null;
        const nMin = kpis.nivelMin !== "N/A" ? parseFloat(kpis.nivelMin) : null;
        const nMax = kpis.nivelMax !== "N/A" ? parseFloat(kpis.nivelMax) : null;
        const vMed =
          kpis.vazaoMedia !== "N/A" ? parseFloat(kpis.vazaoMedia) : null;
        const vMin = kpis.vazaoMin !== "N/A" ? parseFloat(kpis.vazaoMin) : null;
        const vMax = kpis.vazaoMax !== "N/A" ? parseFloat(kpis.vazaoMax) : null;

        return {
          nivel: nMed,
          nivelMin: nMin,
          nivelMax: nMax,
          vazao: vMed,
          vazaoMin: vMin,
          vazaoMax: vMax,
          vazaoMinHorario: null,
          vazaoMaxHorario: null,
        };
      } else {
        const niveis = resumirLeituras(leituras?.nivel, "nivel");
        const vazoes = resumirLeituras(
          leituras?.vazao,
          "vazao",
          banco.historico[data]?.horarios,
        );
        alertas.nivelAcimaDe100 += niveis.alertas.acimaDe100;
        alertas.nivelAcimaDe110 += niveis.alertas.acimaDe110;
        alertas.nivelNegativo += niveis.alertas.negativo;
        alertas.vazaoNegativa += vazoes.alertas.negativo;
        return {
          nivel: niveis.media,
          nivelMin: niveis.minimo,
          nivelMax: niveis.maximo,
          vazao: vazoes.media,
          vazaoMin: vazoes.minimo,
          vazaoMax: vazoes.maximo,
          vazaoMinHorario: vazoes.horarioMinimo,
          vazaoMaxHorario: vazoes.horarioMaximo,
        };
      }
    });

    const niveis = leiturasPorData
      .map((leituras) => leituras.nivel)
      .filter((valor) => valor !== null);
    const vazoes = leiturasPorData
      .map((leituras) => leituras.vazao)
      .filter((valor) => valor !== null);
    const primeiroNivel = niveis[0];
    const ultimoNivel = niveis[niveis.length - 1];

    return {
      reservatorio,
      color: coresAnaliticas[index % coresAnaliticas.length],
      leiturasPorData,
      mediaNivel: calcularMediaValida(niveis),
      minimoNivel: niveis.length ? Math.min(...niveis) : null,
      maximoNivel: niveis.length ? Math.max(...niveis) : null,
      variacaoNivel:
        primeiroNivel !== undefined && ultimoNivel !== undefined
          ? calcularVariacaoPercentual(ultimoNivel, primeiroNivel)
          : null,
      mediaVazao: calcularMediaValida(vazoes),
      alertas,
      diasComDados: leiturasPorData.filter(
        (leituras) => leituras.nivel !== null || leituras.vazao !== null,
      ).length,
    };
  });

  const diasComDados = new Set();
  series.forEach((serie) => {
    serie.leiturasPorData.forEach((leituras, index) => {
      if (leituras.nivel !== null || leituras.vazao !== null) {
        diasComDados.add(index);
      }
    });
  });

  criarResumoAnalitico(resumo, [
    [
      "Período",
      `${datasPeriodo[0]} – ${datasPeriodo[datasPeriodo.length - 1]}`,
    ],
    ["Reservatórios", String(reservatorios.length)],
    ["Dias com dados", `${diasComDados.size} de ${datasPeriodo.length}`],
  ]);

  const totalAlertas = series.reduce(
    (totais, serie) => {
      Object.entries(serie.alertas).forEach(([tipo, quantidade]) => {
        totais[tipo] += quantidade;
      });
      return totais;
    },
    {
      nivelAcimaDe100: 0,
      nivelAcimaDe110: 0,
      nivelNegativo: 0,
      vazaoNegativa: 0,
    },
  );
  const mensagensAlerta = [];
  if (totalAlertas.nivelAcimaDe100) {
    mensagensAlerta.push(
      `${totalAlertas.nivelAcimaDe100} leitura(s) de nível acima de 100% foram mantidas`,
    );
  }
  if (totalAlertas.nivelAcimaDe110) {
    mensagensAlerta.push(
      `${totalAlertas.nivelAcimaDe110} leitura(s) de nível acima de 110% foram ignoradas`,
    );
  }
  if (totalAlertas.nivelNegativo) {
    mensagensAlerta.push(
      `${totalAlertas.nivelNegativo} leitura(s) de nível negativa(s) foram ignoradas`,
    );
  }
  if (totalAlertas.vazaoNegativa) {
    mensagensAlerta.push(
      `${totalAlertas.vazaoNegativa} leitura(s) de vazão negativa(s) foram mantidas`,
    );
  }

  mensagem.classList.toggle("has-alerts", mensagensAlerta.length > 0);
  mensagem.textContent = mensagensAlerta.length
    ? `Alerta: ${mensagensAlerta.join("; ")}.`
    : "Sem alertas para os reservatórios e período selecionados.";

  renderizarGraficoAnalitico(
    canvasNivel,
    datasPeriodo,
    series,
    "nivel",
    "Nível médio (%)",
    true,
  );
  renderizarGraficoAnalitico(
    document.getElementById("grafico-analise-vazao"),
    datasPeriodo,
    series,
    "vazao",
    "Vazão média (L/s)",
    false,
  );
  renderizarGraficoFaixaVazao(
    document.getElementById("grafico-analise-vazao-faixa"),
    datasPeriodo,
    series,
  );
  preencherTabelaComparativa(corpoTabela, series);
}

function selecionarCard(card) {
  const chaveReservatorio = decodeURIComponent(card.dataset.reservatorio);
  const seletorFiltro = document.getElementById("seletor-filtro");
  seletorFiltro.value = `reservatorio:${chaveReservatorio}`;
  seletorFiltro.dispatchEvent(new Event("change", { bubbles: true }));
}

function obterChaveSerieAnalise(rotulo) {
  return rotulo.replace(/ \([^)]*\)$/, "");
}

function obterIndiceInicioPeriodoRecente(datas, dias = 30) {
  const ultimaDataUTC = converterDataParaUTC(datas[datas.length - 1]);
  const inicioPeriodoUTC = ultimaDataUTC - (dias - 1) * 86400000;
  const indice = datas.findIndex(
    (data) => converterDataParaUTC(data) >= inicioPeriodoUTC,
  );
  return indice < 0 ? 0 : indice;
}

function obterReservatoriosSelecionados(container) {
  return Array.from(
    container.querySelectorAll('input[type="checkbox"]:checked'),
    (checkbox) => checkbox.value,
  );
}

function obterRotuloBaseComparacao(base) {
  const rotulos = {
    "7d-calendar": "últimos 7 dias corridos",
    "30d-calendar": "últimos 30 dias corridos",
    "same-weekday-4": "mesmo dia da semana nas últimas 4 semanas",
    global: "histórico global",
  };
  return rotulos[base] ?? rotulos["7d-calendar"];
}

function obterRotuloEscopo(escopo) {
  if (escopo === "nivel") return "nível";
  if (escopo === "vazao") return "vazão";
  return "nível e vazão";
}

function converterDataParaUTC(data) {
  const [dia, mes, ano] = data.split("/").map(Number);
  return Date.UTC(ano, mes - 1, dia);
}

function obterDatasBaseComparacao(banco, dataSelecionada, base) {
  const datas = banco.datasDisponiveis;
  const indiceData = datas.indexOf(dataSelecionada);
  if (indiceData <= 0) return [];

  const dataAtualUTC = converterDataParaUTC(dataSelecionada);
  const diaSemanaAtual = new Date(dataAtualUTC).getUTCDay();
  return datas.slice(0, indiceData).filter((data) => {
    if (base === "global") return true;

    const diferencaDias =
      (dataAtualUTC - converterDataParaUTC(data)) / 86400000;
    if (base === "7d-calendar") return diferencaDias <= 7;
    if (base === "30d-calendar") return diferencaDias <= 30;
    if (base === "same-weekday-4") {
      return (
        diferencaDias <= 28 &&
        new Date(converterDataParaUTC(data)).getUTCDay() === diaSemanaAtual
      );
    }
    return false;
  });
}

function temLeiturasHistoricasHabituais(
  banco,
  chaveReservatorio,
  tipo,
  dataSelecionada,
) {
  const indiceData = banco.datasDisponiveis.indexOf(dataSelecionada);
  if (indiceData < 0) return false;

  const datasHistoricas = banco.datasDisponiveis.slice(0, indiceData + 1);
  const diasComLeitura = datasHistoricas.filter((data) => {
    const valores =
      banco.historico[data]?.reservatorios?.[chaveReservatorio]?.leituras?.[
        tipo
      ];
    return (
      resumirLeiturasEstruturadas(valores, banco.historico[data]?.horarios)
        .quantidade > 0
    );
  }).length;

  return (
    diasComLeitura >= MINIMO_DIAS_HISTORICOS_PARA_ESPERAR_DADO &&
    diasComLeitura / datasHistoricas.length >= 0.5
  );
}

function obterComparacaoNivel(
  banco,
  chaveReservatorio,
  dataSelecionada,
  base,
  horarios,
  nivelAtual,
) {
  const resumos = obterDatasBaseComparacao(banco, dataSelecionada, base)
    .map((data) => {
      const reservatorio =
        banco.historico[data]?.reservatorios?.[chaveReservatorio];
      if (!reservatorio) return null;
      const resumo = resumirLeiturasEstruturadas(
        filtrarLeiturasNivelValidas(reservatorio.leituras?.nivel),
        banco.historico[data]?.horarios ?? horarios,
      );
      return resumo.media === null ? null : { data, media: resumo.media };
    })
    .filter(Boolean);
  const medias = resumos.map(({ media }) => media);
  const referencia =
    medias.length >= 2
      ? medias.reduce((soma, valor) => soma + valor, 0) / medias.length
      : null;

  return {
    nivelAtual,
    referencia,
    variacao:
      nivelAtual !== null && referencia !== null && referencia !== 0
        ? calcularVariacaoPercentual(nivelAtual, referencia)
        : null,
    quantidade: medias.length,
    datas: resumos.map(({ data }) => data),
  };
}

function obterReferenciaVazao(
  banco,
  chaveReservatorio,
  dataSelecionada,
  base,
  horarios,
) {
  const resumosDiarios = obterDatasBaseComparacao(banco, dataSelecionada, base)
    .map((data) => {
      const reservatorio =
        banco.historico[data]?.reservatorios?.[chaveReservatorio];
      if (!reservatorio) return null;
      const resumo = resumirLeiturasEstruturadas(
        filtrarLeiturasVazaoValidas(reservatorio.leituras?.vazao),
        banco.historico[data]?.horarios ?? horarios,
      );
      return resumo.quantidade ? { data, ...resumo } : null;
    })
    .filter(Boolean);

  const obterMediaComMinimo = (campo) => {
    const valores = resumosDiarios
      .map((resumo) => resumo[campo])
      .filter((valor) => valor !== null);
    return {
      valor:
        valores.length >= 2
          ? valores.reduce((soma, valor) => soma + valor, 0) / valores.length
          : null,
      quantidade: valores.length,
    };
  };
  const media = obterMediaComMinimo("media");
  const minimo = obterMediaComMinimo("minimo");
  const maximo = obterMediaComMinimo("maximo");

  return {
    media: media.valor,
    minimo: minimo.valor,
    maximo: maximo.valor,
    quantidade: resumosDiarios.length,
    datas: resumosDiarios.map(({ data }) => data),
    quantidades: {
      media: media.quantidade,
      minimo: minimo.quantidade,
      maximo: maximo.quantidade,
    },
  };
}

function obterUltimaLeitura(valores) {
  if (!Array.isArray(valores)) return null;
  for (let indice = valores.length - 1; indice >= 0; indice -= 1) {
    const valor = valores[indice];
    if (valor !== null && valor !== undefined && valor !== "") {
      const numero = Number(valor);
      if (Number.isFinite(numero)) return numero;
    }
  }
  return null;
}

function obterUltimaLeituraNivel(valores) {
  return obterUltimaLeitura(filtrarLeiturasNivelValidas(valores));
}

function obterExtremosHistoricosVazao(banco, chaveReservatorio) {
  let minimo = null;
  let maximo = null;
  let dataMinimo = null;
  let dataMaximo = null;

  banco.datasDisponiveis.forEach((data) => {
    const leituras =
      banco.historico[data]?.reservatorios?.[chaveReservatorio]?.leituras
        ?.vazao;
    const valores = filtrarLeiturasVazaoValidas(leituras).filter(
      (valor) => valor !== null,
    );
    if (!valores.length) return;

    const minimoDiario = Math.min(...valores);
    const maximoDiario = Math.max(...valores);
    if (minimo === null || minimoDiario < minimo) {
      minimo = minimoDiario;
      dataMinimo = data;
    }
    if (maximo === null || maximoDiario > maximo) {
      maximo = maximoDiario;
      dataMaximo = data;
    }
  });

  return { minimo, maximo, dataMinimo, dataMaximo };
}

function avaliarStatusNivel(valores) {
  const nivelAtual = obterUltimaLeituraNivel(valores);
  if (nivelAtual === null) return "Sem Dados";
  if (nivelAtual < LIMITE_CRITICO_NIVEL_PERCENTUAL) return "Crítico";
  if (nivelAtual < LIMITE_ATENCAO_NIVEL_PERCENTUAL) return "Atenção";
  return "Normal";
}

function calcularVariacaoPercentual(atual, anterior) {
  return anterior === 0 ? null : ((atual - anterior) / anterior) * 100;
}

function obterEstatisticasHistoricasPorHorario(
  banco,
  chaveReservatorio,
  horarios,
) {
  const amostras = {
    nivel: horarios.map(() => []),
    vazao: horarios.map(() => []),
  };

  banco.datasDisponiveis.forEach((data) => {
    const dadosDoDia = banco.historico[data];
    const leituras = dadosDoDia?.reservatorios?.[chaveReservatorio]?.leituras;
    if (!leituras) return;

    const indicesPorHorario = new Map(
      (dadosDoDia.horarios ?? []).map((horario, indice) => [horario, indice]),
    );
    horarios.forEach((horario, indiceAtual) => {
      const indiceHistorico = indicesPorHorario.get(horario) ?? -1;
      if (indiceHistorico < 0) return;

      const nivel = obterLeituraAnalitica(leituras.nivel?.[indiceHistorico]);
      if (nivel.valor !== null && nivel.valor >= 0 && nivel.valor <= 110) {
        amostras.nivel[indiceAtual].push(nivel.valor);
      }

      const vazao = obterLeituraAnalitica(leituras.vazao?.[indiceHistorico]);
      if (vazao.valor !== null && vazao.valor >= 0) {
        amostras.vazao[indiceAtual].push(vazao.valor);
      }
    });
  });

  const resumir = (leiturasPorHorario) => ({
    minimo: leiturasPorHorario.map((valores) =>
      valores.length
        ? valores.reduce((menor, valor) => Math.min(menor, valor))
        : null,
    ),
    media: leiturasPorHorario.map((valores) => calcularMediaValida(valores)),
    maximo: leiturasPorHorario.map((valores) =>
      valores.length
        ? valores.reduce((maior, valor) => Math.max(maior, valor))
        : null,
    ),
  });

  return {
    nivel: resumir(amostras.nivel),
    vazao: resumir(amostras.vazao),
  };
}

function resumirLeituras(valores, tipo, horarios = []) {
  if (!Array.isArray(valores)) {
    return {
      media: null,
      minimo: null,
      maximo: null,
      horarioMinimo: null,
      horarioMaximo: null,
      alertas: { acimaDe100: 0, acimaDe110: 0, negativo: 0 },
    };
  }
  const numericos = valores
    .map((valor, indice) => ({ valor: Number(valor), indice }))
    .filter(
      ({ valor }, indice) =>
        valores[indice] !== null &&
        valores[indice] !== undefined &&
        valores[indice] !== "" &&
        Number.isFinite(valor),
    );
  const acimaDe100 =
    tipo === "nivel"
      ? numericos.filter(({ valor }) => valor > 100 && valor <= 110).length
      : 0;
  const acimaDe110 =
    tipo === "nivel" ? numericos.filter(({ valor }) => valor > 110).length : 0;
  const negativos = numericos.filter(({ valor }) => valor < 0).length;
  const validos = numericos.filter(
    tipo === "nivel" ? ({ valor }) => valor >= 0 && valor <= 110 : () => true,
  );
  const minimo = validos.length
    ? Math.min(...validos.map(({ valor }) => valor))
    : null;
  const maximo = validos.length
    ? Math.max(...validos.map(({ valor }) => valor))
    : null;
  const leituraMinima = validos.find(({ valor }) => valor === minimo);
  const leituraMaxima = validos.find(({ valor }) => valor === maximo);

  return {
    media: calcularMediaValida(validos.map(({ valor }) => valor)),
    minimo,
    maximo,
    horarioMinimo: leituraMinima
      ? (horarios[leituraMinima.indice] ?? null)
      : null,
    horarioMaximo: leituraMaxima
      ? (horarios[leituraMaxima.indice] ?? null)
      : null,
    alertas: { acimaDe100, acimaDe110, negativo: negativos },
  };
}

function avaliarQualidadeLeituras(niveis, vazoes, quantidadeSlots) {
  const valoresNumericos = (valores) =>
    Array.isArray(valores)
      ? valores
          .filter(
            (valor) => valor !== null && valor !== undefined && valor !== "",
          )
          .map(Number)
          .filter(Number.isFinite)
      : [];
  const niveisNumericos = valoresNumericos(niveis);
  const vazoesNumericas = valoresNumericos(vazoes);
  return {
    nivelAcimaDe100: niveisNumericos.filter(
      (valor) => valor > 100 && valor <= 110,
    ).length,
    nivelAcimaDe110: niveisNumericos.filter((valor) => valor > 110).length,
    nivelNegativo: niveisNumericos.filter((valor) => valor < 0).length,
    vazaoNegativa: vazoesNumericas.filter((valor) => valor < 0).length,
    nivelAusente: Math.max(0, quantidadeSlots - niveisNumericos.length),
    vazaoAusente: Math.max(0, quantidadeSlots - vazoesNumericas.length),
  };
}

function obterLeiturasAusentes(
  leituras,
  quantidadeSlots,
  horarios,
  tipos = ["nivel", "vazao"],
) {
  const ausentes = [];
  tipos.forEach((tipo) => {
    for (let indice = 0; indice < quantidadeSlots; indice += 1) {
      const valor = leituras?.[tipo]?.[indice];
      if (
        valor !== null &&
        valor !== undefined &&
        valor !== "" &&
        Number.isFinite(Number(valor))
      ) {
        continue;
      }
      ausentes.push({
        tipo: tipo === "nivel" ? "Nível" : "Vazão",
        horario: horarios[indice] ?? `Leitura ${indice + 1}`,
      });
    }
  });
  return ausentes;
}

let reservatorioConfigSelecionado = null;

function inicializarConfiguracoes() {
  const btnConfig = document.getElementById("btn-modo-configuracao");
  const painelConfig = document.getElementById("painel-configuracoes");
  const abas = Array.from(document.querySelectorAll(".view-tab"));
  const paineis = [
    document.getElementById("painel-operacional"),
    document.getElementById("painel-analitico"),
    document.getElementById("painel-engenharia"),
  ];

  if (!btnConfig || !painelConfig) return;

  btnConfig.addEventListener("click", (e) => {
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('view') !== 'configuracoes') {
      e.preventDefault();
      if (window.nexoConfigWindow && !window.nexoConfigWindow.closed) {
        window.nexoConfigWindow.focus();
      } else {
        window.nexoConfigWindow = window.open('?view=configuracoes', 'nexoConfigWindow', 'width=1100,height=800');
      }
      return;
    }
    const estaAtivo = !painelConfig.hidden;
    if (estaAtivo) {
      painelConfig.hidden = true;
      const painelOp = document.getElementById("painel-operacional");
      if (painelOp) painelOp.hidden = false;
      abas.forEach((aba) => {
        const ativa = aba.id === "tab-operacional";
        aba.classList.toggle("is-active", ativa);
        aba.setAttribute("aria-selected", String(ativa));
      });
    } else {
      paineis.forEach((p) => { if (p) p.hidden = true; });
      painelConfig.hidden = false;
      abas.forEach((aba) => {
        aba.classList.remove("is-active");
        aba.setAttribute("aria-selected", "false");
      });
      renderizarPainelConfiguracoes();
    }
  });

  abas.forEach((aba) => {
    aba.addEventListener("click", () => {
      painelConfig.hidden = true;
    });
  });

  const btnVincularConfig = document.getElementById("btn-vincular-config");
  if (btnVincularConfig) {
    btnVincularConfig.addEventListener("click", vincularArquivoConfiguracao);
  }
  verificarHandleSalvo();
}

let configFileHandle = null;

async function salvarHandleNoIndexedDB(handle) {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open("NexoHandlesDB", 1);
    request.onupgradeneeded = (e) => {
      const db = e.target.result;
      if (!db.objectStoreNames.contains("handles")) {
        db.createObjectStore("handles");
      }
    };
    request.onsuccess = (e) => {
      const db = e.target.result;
      const transaction = db.transaction("handles", "readwrite");
      const store = transaction.objectStore("handles");
      store.put(handle, "configFile");
      transaction.oncomplete = () => resolve();
      transaction.onerror = (err) => reject(err);
    };
    request.onerror = (err) => reject(err);
  });
}

async function carregarHandleDoIndexedDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open("NexoHandlesDB", 1);
    request.onupgradeneeded = (e) => {
      const db = e.target.result;
      if (!db.objectStoreNames.contains("handles")) {
        db.createObjectStore("handles");
      }
    };
    request.onsuccess = (e) => {
      const db = e.target.result;
      const transaction = db.transaction("handles", "readonly");
      const store = transaction.objectStore("handles");
      const req = store.get("configFile");
      req.onsuccess = () => resolve(req.result);
      req.onerror = (err) => reject(err);
    };
    request.onerror = (err) => reject(err);
  });
}

async function verificarHandleSalvo() {
  try {
    const handle = await carregarHandleDoIndexedDB();
    if (handle) {
      configFileHandle = handle;
      const perm = await handle.queryPermission({ mode: 'readwrite' });
      if (perm === 'granted') {
        atualizarVisualBotaoVinculado();
      } else {
        const btn = document.getElementById("btn-vincular-config");
        if (btn) {
          btn.style.borderColor = "var(--accent-color)";
          btn.innerHTML = "🔄 Reativar Vínculo de Config";
        }
      }
    }
  } catch (e) {
    console.warn("Erro ao verificar handle salvo:", e);
  }
}

function atualizarVisualBotaoVinculado() {
  const btn = document.getElementById("btn-vincular-config");
  if (btn) {
    btn.style.borderColor = "var(--status-normal-color)";
    btn.innerHTML = "✅ Arquivo Vinculado";
  }
}

async function vincularArquivoConfiguracao() {
  try {
    if (configFileHandle) {
      try {
        const perm = await configFileHandle.requestPermission({ mode: 'readwrite' });
        if (perm === 'granted') {
          atualizarVisualBotaoVinculado();
          const msg = document.getElementById("configuracao-mensagem");
          if (msg) {
            msg.textContent = "Vínculo com config_reservatorios.json reativado com sucesso!";
            msg.classList.remove("has-alerts");
            setTimeout(() => { msg.textContent = ""; }, 5000);
          }
          return;
        }
      } catch (e) {
        // Se falhar o pedido de permissão, prossegue para abrir o seletor normal
      }
    }

    if (!window.showOpenFilePicker) {
      alert("Seu navegador não suporta salvamento direto de arquivos. Utilize Google Chrome ou Microsoft Edge.");
      return;
    }
    const [handle] = await window.showOpenFilePicker({
      types: [{
        description: 'JSON Configuration',
        accept: { 'application/json': ['.json'] }
      }],
      multiple: false
    });
    configFileHandle = handle;
    await salvarHandleNoIndexedDB(handle);
    atualizarVisualBotaoVinculado();

    const msg = document.getElementById("configuracao-mensagem");
    if (msg) {
      msg.textContent = "Arquivo config_reservatorios.json vinculado com sucesso! As alterações serão salvas diretamente.";
      msg.classList.remove("has-alerts");
      setTimeout(() => { msg.textContent = ""; }, 5000);
    }
  } catch (err) {
    if (err.name !== 'AbortError') {
      console.error("Erro ao vincular arquivo:", err);
      alert("Erro ao vincular o arquivo.");
    }
  }
}

function renderizarPainelConfiguracoes() {
  const listaContainer = document.getElementById("config-lista-reservatorios");
  if (!listaContainer) return;

  const banco = window.bancoDeDados;
  if (!banco || !banco.datasDisponiveis || banco.datasDisponiveis.length === 0) return;

  const ultimaData = banco.datasDisponiveis[banco.datasDisponiveis.length - 1];
  const dadosDia = banco.historico[ultimaData];
  const reservatorios = dadosDia?.reservatorios || {};

  let sidebarWrapper = listaContainer.parentElement;
  let filtroBar = sidebarWrapper.querySelector(".config-sidebar-filters");
  if (filtroBar) {
    filtroBar.remove();
  }

  listaContainer.innerHTML = "";

  const sessionStr = localStorage.getItem("nexo_hidrico_session");
  let isAdmin = false;
  if (sessionStr) {
    try {
      isAdmin = (JSON.parse(sessionStr).role === "ADMIN");
    } catch(e){}
  }

  const isReservatorioMode = reservatorioConfigSelecionado === "reservatorios_lista" || (reservatorios[reservatorioConfigSelecionado] !== undefined);

  const btnReservatorios = document.createElement("button");
  btnReservatorios.type = "button";
  btnReservatorios.className = `config-reservoir-item ${isReservatorioMode ? "is-active" : ""}`;
  btnReservatorios.style.borderColor = "var(--accent-color)";
  btnReservatorios.innerHTML = `
    <strong>💧 Configuração de Reservatórios</strong>
    <span>Limites, alarmes & telemetria</span>
  `;
  btnReservatorios.addEventListener("click", () => {
    reservatorioConfigSelecionado = "reservatorios_lista";
    renderizarPainelConfiguracoes();
  });
  listaContainer.appendChild(btnReservatorios);

  if (isAdmin) {
    const btnUserAdmin = document.createElement("button");
    btnUserAdmin.type = "button";
    btnUserAdmin.className = `config-reservoir-item ${reservatorioConfigSelecionado === "usuarios" ? "is-active" : ""}`;
    btnUserAdmin.style.borderColor = "var(--accent-color)";
    btnUserAdmin.innerHTML = `
      <strong>👥 Gerenciar Usuários</strong>
      <span>Cadastrar novos operadores (ADMIN)</span>
    `;
    btnUserAdmin.addEventListener("click", () => {
      reservatorioConfigSelecionado = "usuarios";
      renderizarPainelConfiguracoes();
    });
    listaContainer.appendChild(btnUserAdmin);

    const btnGlobalConfig = document.createElement("button");
    btnGlobalConfig.type = "button";
    btnGlobalConfig.className = `config-reservoir-item ${reservatorioConfigSelecionado === "parametros_globais" ? "is-active" : ""}`;
    btnGlobalConfig.style.borderColor = "var(--accent-color)";
    btnGlobalConfig.innerHTML = `
      <strong>🌐 Parâmetros Globais</strong>
      <span>Automação, Relatórios & Timers</span>
    `;
    btnGlobalConfig.addEventListener("click", () => {
      reservatorioConfigSelecionado = "parametros_globais";
      renderizarPainelConfiguracoes();
    });
    listaContainer.appendChild(btnGlobalConfig);

    const btnLogsAdmin = document.createElement("button");
    btnLogsAdmin.type = "button";
    btnLogsAdmin.className = `config-reservoir-item ${reservatorioConfigSelecionado === "logs_auditoria" ? "is-active" : ""}`;
    btnLogsAdmin.style.borderColor = "var(--accent-color)";
    btnLogsAdmin.innerHTML = `
      <strong>📊 Logs de Auditoria & Sistema</strong>
      <span>Trilha de segurança & ocorrências</span>
    `;
    btnLogsAdmin.addEventListener("click", () => {
      reservatorioConfigSelecionado = "logs_auditoria";
      renderizarPainelConfiguracoes();
    });
    listaContainer.appendChild(btnLogsAdmin);
  }

  if (!reservatorioConfigSelecionado) {
    reservatorioConfigSelecionado = "reservatorios_lista";
  }

  if (reservatorioConfigSelecionado === "usuarios") {
    renderizarFormularioCriacaoUsuario();
  } else if (reservatorioConfigSelecionado === "parametros_globais") {
    renderizarFormularioParametrosGlobais();
  } else if (reservatorioConfigSelecionado === "logs_auditoria") {
    renderizarPainelLogsAuditoria();
  } else if (reservatorioConfigSelecionado === "reservatorios_lista") {
    renderizarSeletorReservatoriosConfig(reservatorios);
  } else {
    renderizarFormularioConfiguracao(reservatorioConfigSelecionado, reservatorios[reservatorioConfigSelecionado]);
  }
}

function renderizarSeletorReservatoriosConfig(reservatorios) {
  const container = document.getElementById("config-detalhe-container");
  if (!container) return;

  const gruposMap = new Map();
  Object.keys(reservatorios).forEach((chave) => {
    const res = reservatorios[chave];
    const grupo = res.grupo || "Geral";
    if (!gruposMap.has(grupo)) {
      gruposMap.set(grupo, []);
    }
    gruposMap.get(grupo).push({ chave, res });
  });

  container.innerHTML = `
    <div style="padding: 24px; max-width: 900px; margin: 0 auto; display: flex; flex-direction: column; gap: 24px;">
      <div>
        <h3 style="font-size: 1.25rem; font-weight: 700; color: var(--text-color); margin-bottom: 6px;">💧 Configuração de Reservatórios</h3>
        <p style="color: var(--muted-color); font-size: 0.9rem;">Selecione abaixo o reservatório que deseja configurar os limites operacionais, alarmes e parâmetros de telemetria.</p>
      </div>

      <div style="display: flex; gap: 12px; align-items: center; flex-wrap: wrap;">
        <input type="text" id="picker-busca-tag" placeholder="Filtrar por nome ou TAG..." style="padding: 8px 12px; border-radius: 6px; border: 1px solid var(--border-color); background: var(--surface-bg); color: var(--text-color); font-size: 0.9rem; flex: 1; min-width: 240px;">
        <select id="picker-filtro-grupo" style="padding: 8px 12px; border-radius: 6px; border: 1px solid var(--border-color); background: var(--surface-bg); color: var(--text-color); font-size: 0.9rem;">
          <option value="TODOS">Todos os Grupos</option>
          ${Array.from(gruposMap.keys()).map(g => `<option value="${g}">${g}</option>`).join("")}
        </select>
      </div>

      <div id="picker-grid-container" style="display: flex; flex-direction: column; gap: 24px;">
        <!-- Preenchido dinamicamente -->
      </div>
    </div>
  `;

  const inputBusca = container.querySelector("#picker-busca-tag");
  const selectGrupo = container.querySelector("#picker-filtro-grupo");
  const gridContainer = container.querySelector("#picker-grid-container");

  function filtrarE1RenderizarGrid() {
    const termo = (inputBusca.value || "").toLowerCase();
    const grupoSel = selectGrupo.value;

    gridContainer.innerHTML = "";
    let totalEncontrados = 0;

    gruposMap.forEach((itens, grupo) => {
      if (grupoSel !== "TODOS" && grupo !== grupoSel) return;

      const itensFiltrados = itens.filter(({ chave, res }) => {
        const nome = (res.nome || chave).toLowerCase();
        return nome.includes(termo) || chave.toLowerCase().includes(termo);
      });

      if (itensFiltrados.length === 0) return;
      totalEncontrados += itensFiltrados.length;

      const section = document.createElement("div");
      section.style.cssText = "display: flex; flex-direction: column; gap: 10px;";
      section.innerHTML = `
        <h4 style="font-size: 0.85rem; font-weight: 700; color: var(--accent-color); text-transform: uppercase; letter-spacing: 0.5px; border-bottom: 1px solid var(--border-color); padding-bottom: 6px; margin: 0;">Grupo: ${grupo}</h4>
        <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(260px, 1fr)); gap: 12px;"></div>
      `;

      const cardsGrid = section.querySelector("div > div");
      itensFiltrados.forEach(({ chave, res }) => {
        const card = document.createElement("button");
        card.type = "button";
        card.style.cssText = "text-align: left; padding: 14px; background: var(--surface-bg); border: 1px solid var(--border-color); border-radius: 8px; cursor: pointer; transition: all 0.2s ease; display: flex; flex-direction: column; gap: 4px;";
        card.onmouseover = () => { card.style.borderColor = "var(--accent-color)"; card.style.transform = "translateY(-2px)"; };
        card.onmouseout = () => { card.style.borderColor = "var(--border-color)"; card.style.transform = "none"; };
        
        card.innerHTML = `
          <div style="display: flex; justify-content: space-between; align-items: center;">
            <strong style="color: var(--text-color); font-size: 0.95rem; font-weight: 700;">${res.nome || chave}</strong>
            <span style="font-size: 0.7rem; background: var(--surface-inset); padding: 2px 6px; border-radius: 4px; color: var(--muted-color); font-weight: 600;">${chave}</span>
          </div>
          <span style="font-size: 0.8rem; color: var(--muted-color);">Grupo Hidráulico: ${res.grupo || "Geral"}</span>
        `;
        card.addEventListener("click", () => {
          reservatorioConfigSelecionado = chave;
          renderizarPainelConfiguracoes();
        });
        cardsGrid.appendChild(card);
      });

      gridContainer.appendChild(section);
    });

    if (totalEncontrados === 0) {
      gridContainer.innerHTML = `<p style="color: var(--muted-color); text-align: center; padding: 30px;">Nenhum reservatório encontrado com os filtros informados.</p>`;
    }
  }

  inputBusca.oninput = filtrarE1RenderizarGrid;
  selectGrupo.onchange = filtrarE1RenderizarGrid;
  filtrarE1RenderizarGrid();
}

function renderizarFormularioCriacaoUsuario() {
  const container = document.getElementById("config-detalhe-container");
  if (!container) return;

  const sessionStr = localStorage.getItem("nexo_hidrico_session");
  let currentAdmin = "admin.nexo";
  if (sessionStr) {
    try {
      currentAdmin = JSON.parse(sessionStr).username;
    } catch(e){}
  }

  container.innerHTML = `
    <div class="config-detail-form" style="max-width: 600px; margin: 0 auto; padding: 20px;">
      <div class="config-form-header">
        <h3>👥 Gerenciamento de Operadores e Usuários</h3>
        <span class="config-reservoir-badge">Painel Restrito ADMIN</span>
      </div>

      <p style="color: var(--muted-color); font-size: 0.9rem; margin-bottom: 20px; line-height: 1.5;">
        Cadastre novos operadores ou administradores no sistema CCO SAMAE. <strong>O preenchimento do e-mail corporativo é obrigatório.</strong> A senha inicial provisória será gerada automaticamente como o primeiro nome em minúsculas, exigindo a alteração no primeiro acesso.
      </p>

      <form id="form-cadastrar-usuario" style="display: flex; flex-direction: column; gap: 18px;">
        <div style="display: flex; flex-direction: column; gap: 6px;">
          <label style="font-size: 0.85rem; font-weight: 600; color: var(--text-color);">Nome de Usuário / Login (Ex: carlos.silva)</label>
          <input type="text" id="novo-username" required placeholder="carlos.silva" style="
            background: var(--surface-bg); border: 1px solid var(--border-color); color: var(--text-color);
            padding: 12px; border-radius: 8px; font-size: 0.95rem; outline: none;
          ">
        </div>

        <div style="display: flex; flex-direction: column; gap: 6px;">
          <label style="font-size: 0.85rem; font-weight: 600; color: var(--text-color);">E-mail Corporativo (Obrigatório)</label>
          <input type="email" id="novo-email" required placeholder="usuario@exemplo.com" style="
            background: var(--surface-bg); border: 1px solid var(--border-color); color: var(--text-color);
            padding: 12px; border-radius: 8px; font-size: 0.95rem; outline: none;
          ">
        </div>

        <div style="display: flex; flex-direction: column; gap: 6px;">
          <label style="font-size: 0.85rem; font-weight: 600; color: var(--text-color);">Perfil de Acesso (Role)</label>
          <select id="novo-role" style="
            background: var(--surface-bg); border: 1px solid var(--border-color); color: var(--text-color);
            padding: 12px; border-radius: 8px; font-size: 0.95rem; outline: none;
          ">
            <option value="Agent">Agent (Operador de Plantão - Restrito)</option>
            <option value="ADMIN">ADMIN (Administrador - Acesso Total)</option>
          </select>
        </div>

        <div id="cadastro-user-msg" style="display: none; padding: 10px 14px; border-radius: 6px; font-size: 0.85rem;"></div>

        <button type="submit" style="
          background: var(--accent-color); color: #fff; border: none; padding: 12px;
          border-radius: 8px; font-size: 1rem; font-weight: 700; cursor: pointer;
          transition: background 0.2s; margin-top: 10px;
        ">
          Cadastrar Novo Usuário
        </button>
      </form>
    </div>
  `;

  document.getElementById("form-cadastrar-usuario").onsubmit = async (e) => {
    e.preventDefault();
    const u = document.getElementById("novo-username").value.trim();
    const email = document.getElementById("novo-email").value.trim();
    const role = document.getElementById("novo-role").value;
    const msgEl = document.getElementById("cadastro-user-msg");
    msgEl.style.display = "none";

    try {
      await window.AuthRepository.cadastrarUsuario(currentAdmin, u, role, email);
      msgEl.style.display = "block";
      msgEl.style.background = "var(--status-normal-background)";
      msgEl.style.color = "var(--status-normal-color)";
      msgEl.style.border = "1px solid var(--status-normal-color)";
      msgEl.textContent = `Sucesso! Usuário '${u}' cadastrado com o e-mail corporativo '${email}'.`;
      document.getElementById("form-cadastrar-usuario").reset();
    } catch (err) {
      msgEl.style.display = "block";
      msgEl.style.background = "var(--status-critical-background)";
      msgEl.style.color = "var(--status-critical-color)";
      msgEl.style.border = "1px solid var(--status-critical-color)";
      msgEl.textContent = err.message;
    }
  };
}

function renderizarFormularioParametrosGlobais() {
  const container = document.getElementById("config-detalhe-container");
  if (!container) return;

  const globalConfig = JSON.parse(localStorage.getItem("nexo_hidrico_global_config") || "{}");

  container.innerHTML = `
    <form id="form-parametros-globais" class="config-detail-form" style="max-width: 800px; margin: 0 auto; padding: 20px;">
      <div class="config-form-header">
        <h3>🌐 Parâmetros Globais Bilaterais (Automação & Relatórios)</h3>
        <span class="config-reservoir-badge">Configuração do Sistema CCO</span>
      </div>

      <p style="color: var(--muted-color); font-size: 0.9rem; margin-bottom: 20px; line-height: 1.5;">
        Defina as configurações globais de envio de relatórios de plantão, agendamento de disparos automáticos (Timers) e caminhos de diretórios locais.
      </p>

      <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(320px, 1fr)); gap: 20px; margin-bottom: 24px;">
        
        <!-- FORMULÁRIO I (Passagem de Plantão) -->
        <fieldset class="config-fieldset" style="background: var(--surface-bg);">
          <legend>FORMULÁRIO I (Passagem de Plantão)</legend>
          <div class="config-field" style="margin-bottom: 12px;">
            <label for="cfg-emails-plantao">E-mails de Destino (separados por vírgula)</label>
            <input type="text" id="cfg-emails-plantao" value="${globalConfig.emailsPlantao || 'operacao@exemplo.com'}" placeholder="operacao@exemplo.com" style="width: 100%; padding: 10px; border-radius: 6px; border: 1px solid var(--border-color); background: var(--card-bg); color: var(--text-color);">
          </div>
          <div class="config-field" style="margin-bottom: 12px;">
            <label>Grade de Timers (Disparos Diários Agendados)</label>
            <div style="display: flex; gap: 8px; margin-top: 4px;">
              <input type="time" id="cfg-timer-1" value="${globalConfig.timer1 || '05:00'}" style="flex: 1; padding: 8px; border-radius: 6px; border: 1px solid var(--border-color); background: var(--card-bg); color: var(--text-color);">
              <input type="time" id="cfg-timer-2" value="${globalConfig.timer2 || '13:00'}" style="flex: 1; padding: 8px; border-radius: 6px; border: 1px solid var(--border-color); background: var(--card-bg); color: var(--text-color);">
              <input type="time" id="cfg-timer-3" value="${globalConfig.timer3 || '21:00'}" style="flex: 1; padding: 8px; border-radius: 6px; border: 1px solid var(--border-color); background: var(--card-bg); color: var(--text-color);">
            </div>
          </div>
          <div class="config-field">
            <label for="cfg-caminho-local">Caminho Físico de Diretório Local</label>
            <input type="text" id="cfg-caminho-local" value="${globalConfig.caminhoLocal || 'C:/NexoHidrico/Relatorios/Plantao'}" placeholder="C:/NexoHidrico/Relatorios/Plantao" style="width: 100%; padding: 10px; border-radius: 6px; border: 1px solid var(--border-color); background: var(--card-bg); color: var(--text-color);">
          </div>
        </fieldset>

        <!-- FORMULÁRIO II (Log de Erros e SLA Técnico) -->
        <fieldset class="config-fieldset" style="background: var(--surface-bg);">
          <legend>FORMULÁRIO II (Log de Erros e SLA)</legend>
          <div class="config-field" style="margin-bottom: 12px;">
            <label for="cfg-emails-manutencao">E-mails Analíticos da Manutenção</label>
            <input type="text" id="cfg-emails-manutencao" value="${globalConfig.emailsManutencao || 'manutencao@exemplo.com'}" placeholder="manutencao@exemplo.com" style="width: 100%; padding: 10px; border-radius: 6px; border: 1px solid var(--border-color); background: var(--card-bg); color: var(--text-color);">
          </div>
          <div class="config-field-row" style="margin-bottom: 12px;">
            <div class="config-field" style="flex: 1;">
              <label for="cfg-cron-dia">Dia da Semana (Cron)</label>
              <select id="cfg-cron-dia" style="width: 100%; padding: 10px; border-radius: 6px; border: 1px solid var(--border-color); background: var(--card-bg); color: var(--text-color);">
                <option value="diario" ${globalConfig.cronDia === 'diario' ? 'selected' : ''}>Diário (Todos os dias)</option>
                <option value="util" ${globalConfig.cronDia === 'util' ? 'selected' : ''}>Dias Úteis (Seg-Sex)</option>
              </select>
            </div>
          </div>
        </fieldset>

      </div>

      <div id="global-config-msg" style="display: none; padding: 10px 14px; border-radius: 6px; font-size: 0.85rem; margin-bottom: 16px;"></div>

      <button type="submit" class="btn-guardar-config" style="background: var(--accent-color); color: #fff; border: none; padding: 14px 24px; border-radius: 8px; font-size: 1rem; font-weight: 700; cursor: pointer;">
        Salvar Parâmetros Globais
      </button>
    </form>
  `;

  document.getElementById("form-parametros-globais").onsubmit = (e) => {
    e.preventDefault();
    const emailsPlantao = document.getElementById("cfg-emails-plantao").value;
    const timer1 = document.getElementById("cfg-timer-1").value;
    const timer2 = document.getElementById("cfg-timer-2").value;
    const timer3 = document.getElementById("cfg-timer-3").value;
    const caminhoLocal = document.getElementById("cfg-caminho-local").value;
    const emailsManutencao = document.getElementById("cfg-emails-manutencao").value;
    const cronDia = document.getElementById("cfg-cron-dia").value;

    const novaGlobal = {
      emailsPlantao,
      timer1,
      timer2,
      timer3,
      caminhoLocal,
      emailsManutencao,
      cronDia
    };

    localStorage.setItem("nexo_hidrico_global_config", JSON.stringify(novaGlobal));

    const msgEl = document.getElementById("global-config-msg");
    msgEl.style.display = "block";
    msgEl.style.background = "var(--status-normal-background)";
    msgEl.style.color = "var(--status-normal-color)";
    msgEl.style.border = "1px solid var(--status-normal-color)";
    msgEl.textContent = "Parâmetros globais salvos com sucesso!";
    setTimeout(() => { msgEl.style.display = "none"; }, 4000);
  };
}

function renderizarFormularioConfiguracao(chave, res) {
  const container = document.getElementById("config-detalhe-container");
  if (!container || !res) return;

  const config = obterConfiguracaoReservatorio(chave);

  container.innerHTML = `
    <form id="form-config-reservatorio" class="config-detail-form">
      <div class="config-form-header">
        <h3>Editando: ${res.nome || chave}</h3>
        <span class="config-reservoir-badge">ID: ${chave} · Grupo: ${res.grupo || "Geral"}</span>
      </div>

      <!-- Secção 1: Geral / Capacidade -->
      <fieldset class="config-fieldset">
        <legend>Informações Gerais</legend>
        <div class="config-field-row">
          <div class="config-field">
            <label for="cfg-capacidade">Capacidade Útil (m³)</label>
            <input type="number" step="any" id="cfg-capacidade" value="${config.capacidadeUtil !== undefined ? config.capacidadeUtil : ""}" placeholder="Ex: 5000">
          </div>
          <div class="config-field config-checkbox-field">
            <label>
              <input type="checkbox" id="cfg-manutencao" ${config.emManutencao ? "checked" : ""}>
              Reservatório em Manutenção
            </label>
          </div>
          <div class="config-field config-checkbox-field">
            <label>
              <input type="checkbox" id="cfg-possui-vazao" ${config.possuiMedicaoVazao ? "checked" : ""}>
              Possui Medição de Vazão
            </label>
          </div>
        </div>
      </fieldset>

      <!-- Categoria: Nível -->
      <div class="config-category-block">
        <h4 class="config-category-title">Nível</h4>
        <fieldset class="config-fieldset">
          <legend>Nível (%)</legend>
          <div class="config-section-header">
            <span class="config-section-label">Limites de Alarme Instantâneo</span>
            <label class="config-toggle-switch">
              <span>Ativar Alarme de Nível</span>
              <input type="checkbox" id="cfg-alerta-nivel-ativo" ${config.alertaNivelAtivo ? "checked" : ""}>
            </label>
          </div>
          <div class="config-field-row">
            <div class="config-field">
              <label for="cfg-nivel-atencao">Limite de Atenção (%)</label>
              <input type="number" step="any" id="cfg-nivel-atencao" value="${config.nivelAtencao}" min="0" max="100">
            </div>
            <div class="config-field">
              <label for="cfg-nivel-critico">Limite Crítico (%)</label>
              <input type="number" step="any" id="cfg-nivel-critico" value="${config.nivelCritico}" min="0" max="100">
            </div>
          </div>

          <div class="config-section-header config-sub-header">
            <span class="config-section-label">Desvio de Média (Madrugada)</span>
            <label class="config-toggle-switch">
              <span>Ativar Alarme de Média</span>
              <input type="checkbox" id="cfg-alerta-nivel-medio-ativo" ${config.alertaNivelMedioAtivo ? "checked" : ""}>
            </label>
          </div>
          <div class="config-field-row">
            <div class="config-field">
              <label for="cfg-nivel-medio-atencao">Desvio Atenção (%)</label>
              <input type="number" step="any" id="cfg-nivel-medio-atencao" value="${config.nivelMedioAtencao}" min="0">
            </div>
            <div class="config-field">
              <label for="cfg-nivel-medio-critico">Desvio Crítico (%)</label>
              <input type="number" step="any" id="cfg-nivel-medio-critico" value="${config.nivelMedioCritico}" min="0">
            </div>
          </div>
        </fieldset>
      </div>

      <!-- Categoria: Vazão -->
      <div class="config-category-block">
        <h4 class="config-category-title">Vazão</h4>
        <fieldset class="config-fieldset">
          <legend>Vazão de Entrada (L/s)</legend>
          <div class="config-section-header">
            <span class="config-section-label">Limites de Alarme de Variação</span>
            <label class="config-toggle-switch">
              <span>Ativar Alarme de Vazão de Entrada</span>
              <input type="checkbox" id="cfg-alerta-vazao-entrada-ativo" ${config.alertaVazaoEntradaAtivo ? "checked" : ""}>
            </label>
          </div>
          <div class="config-field-row">
            <div class="config-field">
              <label for="cfg-vazao-entrada-atencao">Desvio Atenção (%)</label>
              <input type="number" step="any" id="cfg-vazao-entrada-atencao" value="${config.vazaoEntradaAtencao}" min="0">
            </div>
            <div class="config-field">
              <label for="cfg-vazao-entrada-critico">Desvio Crítico (%)</label>
              <input type="number" step="any" id="cfg-vazao-entrada-critico" value="${config.vazaoEntradaCritico}" min="0">
            </div>
          </div>
        </fieldset>

        <fieldset class="config-fieldset">
          <legend>Vazão de Saída (L/s)</legend>
          <div class="config-section-header">
            <span class="config-section-label">Limites de Alarme de Variação</span>
            <label class="config-toggle-switch">
              <span>Ativar Alarme de Vazão de Saída</span>
              <input type="checkbox" id="cfg-alerta-vazao-saida-ativo" ${config.alertaVazaoSaidaAtivo ? "checked" : ""}>
            </label>
          </div>
          <div class="config-field-row">
            <div class="config-field">
              <label for="cfg-vazao-saida-atencao">Desvio Atenção (%)</label>
              <input type="number" step="any" id="cfg-vazao-saida-atencao" value="${config.vazaoSaidaAtencao}" min="0">
            </div>
            <div class="config-field">
              <label for="cfg-vazao-saida-critico">Desvio Crítico (%)</label>
              <input type="number" step="any" id="cfg-vazao-saida-critico" value="${config.vazaoSaidaCritico}" min="0">
            </div>
          </div>
        </fieldset>

        <fieldset class="config-fieldset">
          <legend>Vazão Média (L/s)</legend>
          <div class="config-section-header">
            <span class="config-section-label">Limites de Alarme de Variação</span>
            <label class="config-toggle-switch">
              <span>Ativar Alarme de Vazão Média</span>
              <input type="checkbox" id="cfg-alerta-vazao-media-ativo" ${config.alertaVazaoMediaAtivo ? "checked" : ""}>
            </label>
          </div>
          <div class="config-field-row">
            <div class="config-field">
              <label for="cfg-vazao-media-atencao">Desvio Atenção (%)</label>
              <input type="number" step="any" id="cfg-vazao-media-atencao" value="${config.vazaoMediaAtencao}" min="0">
            </div>
            <div class="config-field">
              <label for="cfg-vazao-media-critico">Desvio Crítico (%)</label>
              <input type="number" step="any" id="cfg-vazao-media-critico" value="${config.vazaoMediaCritico}" min="0">
            </div>
          </div>
        </fieldset>
      </div>

      <!-- Categoria: Autonomia Preditiva -->
      <div class="config-category-block">
        <h4 class="config-category-title">Autonomia Preditiva (Baseada em Tempo)</h4>
        <fieldset class="config-fieldset">
          <legend>Parâmetros de Alerta Temporal (Minutos)</legend>
          <div class="config-field-row">
            <div class="config-field">
              <label for="cfg-tempo-atencao">Tempo Atenção (min)</label>
              <input type="number" step="any" id="cfg-tempo-atencao" value="${config.tempoAtencaoMinutos}" min="1">
            </div>
            <div class="config-field">
              <label for="cfg-tempo-critico">Tempo Crítico (min)</label>
              <input type="number" step="any" id="cfg-tempo-critico" value="${config.tempoCriticoMinutos}" min="1">
            </div>
          </div>
          <div class="config-field-row" style="margin-top: 12px;">
            <div class="config-field">
              <label for="cfg-nivel-atencao-tempo">Nível Alerta Atenção (%)</label>
              <input type="number" step="any" id="cfg-nivel-atencao-tempo" value="${config.nivelAlertaTempoAtencao}" min="0" max="100">
            </div>
            <div class="config-field">
              <label for="cfg-nivel-critico-tempo">Nível Alerta Crítico (%)</label>
              <input type="number" step="any" id="cfg-nivel-critico-tempo" value="${config.nivelAlertaTempoCritico}" min="0" max="100">
            </div>
          </div>
        </fieldset>
      </div>

      <div class="config-form-actions">
        <button type="submit" class="btn-guardar-config">Guardar Configuração</button>
      </div>

      <!-- Categoria: Simulação de Alarme CCO (Teste) -->
      <div class="config-category-block" style="margin-top: 24px;">
        <h4 class="config-category-title">Simulação de Alarme CCO (Teste Visual)</h4>
        <p style="font-size: 0.8rem; color: var(--muted-color); margin-bottom: 12px;">
          Clique nos botões abaixo para forçar o aparecimento do banner de alarme preditivo no topo da tela e testar o sistema.
        </p>
        <div class="config-field-row" style="display: flex; gap: 10px; flex-wrap: wrap;">
          <button type="button" id="btn-simular-critico" class="btn-guardar-config" style="background-color: var(--status-critical-color); color: #fff; border: none;">Simular Alarme Crítico</button>
          <button type="button" id="btn-simular-atencao" class="btn-guardar-config" style="background-color: var(--status-attention-color); color: #fff; border: none;">Simular Alarme Atenção</button>
          <button type="button" id="btn-limpar-simulacao" class="btn-guardar-config" style="background-color: var(--muted-color); color: #fff; border: none;">Limpar Simulação</button>
        </div>
      </div>
    </form>
  `;

  const form = document.getElementById("form-config-reservatorio");
  form.addEventListener("submit", (e) => {
    e.preventDefault();
    salvarConfiguracaoReservatorio(chave);
  });

  const btnCritico = document.getElementById("btn-simular-critico");
  const btnAtencao = document.getElementById("btn-simular-atencao");
  const btnLimpar = document.getElementById("btn-limpar-simulacao");

  if (btnCritico) btnCritico.onclick = () => simularAlarmeCCO("Crítico");
  if (btnAtencao) btnAtencao.onclick = () => simularAlarmeCCO("Atenção");
  if (btnLimpar) btnLimpar.onclick = () => limparSimulacaoCCO();
}

let alarmeSimuladoCCO = null;

function simularAlarmeCCO(status) {
  alarmeSimuladoCCO = {
    chave: "simulado-01",
    nome: "Reservatório Setor B (Simulado)",
    statusPredicao: status,
    tempoEstimadoHoras: status === "Crítico" ? 1.5 : 3.2,
    tendenciaUltimaHora: -4.2
  };
  ccoAlertaReconhecido = false;
  atualizarAnunciadorAlarmesCCO();
  const msg = document.getElementById("configuracao-mensagem");
  if (msg) {
    msg.textContent = `Alarme preditivo (${status}) simulado com sucesso! Verifique o banner no topo da tela.`;
    msg.classList.remove("has-alerts");
    setTimeout(() => { msg.textContent = ""; }, 4000);
  }
}

function limparSimulacaoCCO() {
  alarmeSimuladoCCO = null;
  ccoAlertaReconhecido = false;
  atualizarAnunciadorAlarmesCCO();
  const msg = document.getElementById("configuracao-mensagem");
  if (msg) {
    msg.textContent = "Simulação de alarme limpa com sucesso.";
    msg.classList.remove("has-alerts");
    setTimeout(() => { msg.textContent = ""; }, 3000);
  }
}

function atualizarAnunciadorAlarmesCCO() {
  const banner = document.getElementById("cco-alarm-banner");
  const msgSpan = document.getElementById("cco-banner-msg");
  const btnAck = document.getElementById("cco-banner-ack");
  if (!banner || !msgSpan) return;

  const banco = window.bancoDeDados;
  const dataSelecionada = document.getElementById("seletor-data")?.value;
  if (!banco || !dataSelecionada || !banco.historico[dataSelecionada]) {
    banner.hidden = true;
    banner.style.display = "none";
    return;
  }

  const dadosDia = banco.historico[dataSelecionada];
  const reservatorios = dadosDia.reservatorios || {};
  let alertaCriticoEncontrado = null;
  let alertaAtencaoEncontrado = null;

  if (alarmeSimuladoCCO) {
    if (alarmeSimuladoCCO.statusPredicao === "Crítico") {
      alertaCriticoEncontrado = alarmeSimuladoCCO;
    } else {
      alertaAtencaoEncontrado = alarmeSimuladoCCO;
    }
  } else {
    Object.entries(reservatorios).forEach(([chave, res]) => {
      const config = obterConfiguracaoReservatorio(chave);
      const predicao = avaliarAlarmePreditivo(res, config, dadosDia.horarios || []);
      if (predicao.statusPredicao === "Crítico") {
        alertaCriticoEncontrado = { chave, nome: res.nome || chave, ...predicao };
      } else if (predicao.statusPredicao === "Atenção" && !alertaCriticoEncontrado) {
        alertaAtencaoEncontrado = { chave, nome: res.nome || chave, ...predicao };
      }
    });
  }

  const alertaAtivo = alertaCriticoEncontrado || alertaAtencaoEncontrado;

  if (alertaAtivo && !ccoAlertaReconhecido) {
    banner.hidden = false;
    banner.style.display = "block";
    banner.className = `cco-alarm-banner cco-banner-${alertaCriticoEncontrado ? 'critico' : 'atencao'}`;
    msgSpan.textContent = `Reservatório ${alertaAtivo.nome} atingirá nível de ${alertaAtivo.statusPredicao.toLowerCase()} em ~${alertaAtivo.tempoEstimadoHoras.toFixed(1)}h (Tendência: ${alertaAtivo.tendenciaUltimaHora.toFixed(1)}%).`;
  } else {
    banner.hidden = true;
    banner.style.display = "none";
  }

  if (btnAck && !btnAck.dataset.bound) {
    btnAck.dataset.bound = "true";
    btnAck.addEventListener("click", () => {
      ccoAlertaReconhecido = true;
      banner.hidden = true;
      banner.style.display = "none";
      setTimeout(() => { ccoAlertaReconhecido = false; }, 60000);
    });
  }
}

async function salvarConfiguracaoReservatorio(chave) {
  const capacidadeUtil = document.getElementById("cfg-capacidade").value;
  const nivelAtencao = document.getElementById("cfg-nivel-atencao").value;
  const nivelCritico = document.getElementById("cfg-nivel-critico").value;
  const nivelMedioAtencao = document.getElementById("cfg-nivel-medio-atencao").value;
  const nivelMedioCritico = document.getElementById("cfg-nivel-medio-critico").value;
  const vazaoEntradaAtencao = document.getElementById("cfg-vazao-entrada-atencao").value;
  const vazaoEntradaCritico = document.getElementById("cfg-vazao-entrada-critico").value;
  const vazaoSaidaAtencao = document.getElementById("cfg-vazao-saida-atencao").value;
  const vazaoSaidaCritico = document.getElementById("cfg-vazao-saida-critico").value;
  const vazaoMediaAtencao = document.getElementById("cfg-vazao-media-atencao").value;
  const vazaoMediaCritico = document.getElementById("cfg-vazao-media-critico").value;
  const tempoAtencaoMinutos = document.getElementById("cfg-tempo-atencao")?.value;
  const tempoCriticoMinutos = document.getElementById("cfg-tempo-critico")?.value;
  const nivelAlertaTempoAtencao = document.getElementById("cfg-nivel-atencao-tempo")?.value;
  const nivelAlertaTempoCritico = document.getElementById("cfg-nivel-critico-tempo")?.value;

  const alertaNivelAtivo = document.getElementById("cfg-alerta-nivel-ativo").checked;
  const alertaNivelMedioAtivo = document.getElementById("cfg-alerta-nivel-medio-ativo").checked;
  const alertaVazaoEntradaAtivo = document.getElementById("cfg-alerta-vazao-entrada-ativo").checked;
  const alertaVazaoSaidaAtivo = document.getElementById("cfg-alerta-vazao-saida-ativo").checked;
  const alertaVazaoMediaAtivo = document.getElementById("cfg-alerta-vazao-media-ativo").checked;
  const emManutencao = document.getElementById("cfg-manutencao").checked;
  const possuiMedicaoVazao = document.getElementById("cfg-possui-vazao").checked;

  const salvos = JSON.parse(localStorage.getItem("nexo_hidrico_reservatorios_config") || "{}");
  salvos[chave] = {
    capacidadeUtil,
    nivelAtencao: nivelAtencao !== "" ? Number(nivelAtencao) : 60,
    nivelCritico: nivelCritico !== "" ? Number(nivelCritico) : 50,
    nivelMedioAtencao: nivelMedioAtencao !== "" ? Number(nivelMedioAtencao) : 15,
    nivelMedioCritico: nivelMedioCritico !== "" ? Number(nivelMedioCritico) : 25,
    vazaoEntradaAtencao: vazaoEntradaAtencao !== "" ? Number(vazaoEntradaAtencao) : 20,
    vazaoEntradaCritico: vazaoEntradaCritico !== "" ? Number(vazaoEntradaCritico) : 35,
    vazaoSaidaAtencao: vazaoSaidaAtencao !== "" ? Number(vazaoSaidaAtencao) : 20,
    vazaoSaidaCritico: vazaoSaidaCritico !== "" ? Number(vazaoSaidaCritico) : 35,
    vazaoMediaAtencao: vazaoMediaAtencao !== "" ? Number(vazaoMediaAtencao) : 20,
    vazaoMediaCritico: vazaoMediaCritico !== "" ? Number(vazaoMediaCritico) : 35,
    alertaNivelAtivo,
    alertaNivelMedioAtivo,
    alertaVazaoEntradaAtivo,
    alertaVazaoSaidaAtivo,
    alertaVazaoMediaAtivo,
    emManutencao,
    possuiMedicaoVazao,
    tempoAtencaoMinutos: tempoAtencaoMinutos !== "" ? Number(tempoAtencaoMinutos) : 180,
    tempoCriticoMinutos: tempoCriticoMinutos !== "" ? Number(tempoCriticoMinutos) : 180,
    nivelAlertaTempoAtencao: nivelAlertaTempoAtencao !== "" ? Number(nivelAlertaTempoAtencao) : 40,
    nivelAlertaTempoCritico: nivelAlertaTempoCritico !== "" ? Number(nivelAlertaTempoCritico) : 30
  };

  localStorage.setItem("nexo_hidrico_reservatorios_config", JSON.stringify(salvos));

  if (configFileHandle) {
    try {
      const writable = await configFileHandle.createWritable();
      await writable.write(JSON.stringify(salvos, null, 2));
      await writable.close();
    } catch (err) {
      console.error("Erro ao gravar diretamente no arquivo vinculado:", err);
    }
  }

  const msg = document.getElementById("configuracao-mensagem");
  if (msg) {
    msg.textContent = `Configuração do reservatório ${chave} guardada${configFileHandle ? ' e salva no arquivo' : ''} com sucesso!`;
    msg.classList.remove("has-alerts");
    setTimeout(() => {
      msg.textContent = "";
    }, 4000);
  }
}

window.sincronizarEstadoAlarmesNoArquivo = async function() {
  if (!configFileHandle) return;
  try {
    const salvosStr = localStorage.getItem("nexo_hidrico_reservatorios_config");
    if (!salvosStr) return;
    const salvos = JSON.parse(salvosStr);

    const reconhecidosArr = window.ccoReconhecidos ? Array.from(window.ccoReconhecidos.entries()) : [];
    const logsArr = window.nexoIncidentsLog || [];

    salvos._estado_plantao = {
      reconhecidos: reconhecidosArr,
      logsIncidentes: logsArr,
      timestampAtualizacao: new Date().toISOString()
    };

    const writable = await configFileHandle.createWritable();
    await writable.write(JSON.stringify(salvos, null, 2));
    await writable.close();
  } catch (err) {
    console.warn("Aviso ao sincronizar estado de alarmes no arquivo vinculado:", err);
  }
};

async function renderizarPainelLogsAuditoria() {
  const container = document.getElementById("config-detalhe-container");
  if (!container) return;

  container.innerHTML = `<div style="padding: 40px; text-align: center; color: var(--muted-color);">Carregando trilha de auditoria do banco de dados...</div>`;

  let logs = [];
  if (window.AuthRepository && typeof window.AuthRepository.obterLogsAuditoria === 'function') {
    try {
      logs = await window.AuthRepository.obterLogsAuditoria();
    } catch (e) {
      logs = window.nexoSecurityLog || [];
    }
  } else {
    logs = window.nexoSecurityLog || [];
  }

  const incidentes = (window.nexoIncidentsLog || []).map(inc => ({
    timestamp: inc.timestamp,
    usuario: inc.admin || inc.operador || inc.usuario || 'Operador CCO',
    acao: `MURAL_${(inc.acao || '').toUpperCase()}`,
    detalhes: `Alarme em ${inc.nome || ''} (${inc.chave || ''}) - Severidade: ${inc.severidade || ''}`
  }));

  const todosLogs = [...logs, ...incidentes].sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

  container.innerHTML = `
    <div class="config-detail-form" style="max-width: 950px; margin: 0 auto; padding: 20px;">
      <div class="config-form-header">
        <h3>📊 Logs de Auditoria & Erros do Sistema (Trilha de Segurança)</h3>
        <span class="config-reservoir-badge">Painel Restrito ADMIN</span>
      </div>

      <p style="color: var(--muted-color); font-size: 0.9rem; margin-bottom: 16px; line-height: 1.5;">
        Consulte e filtre o histórico completo por intervalo de datas (Data Início até Data Fim), termo ou categoria.
      </p>

      <!-- Barra de Filtros Avançados com Intervalo de Datas -->
      <div style="background: var(--surface-inset); padding: 14px; border-radius: 8px; border: 1px solid var(--border-color); display: flex; flex-wrap: wrap; gap: 12px; margin-bottom: 16px; align-items: flex-end;">
        <div style="flex: 1; min-width: 180px;">
          <label style="display: block; font-size: 0.75rem; font-weight: 600; color: var(--muted-color); margin-bottom: 4px;">Termo / Detalhe</label>
          <input type="text" id="filtro-log-busca" placeholder="Ex: admin, R-01..." style="width: 100%; padding: 6px 10px; background: var(--surface-bg); border: 1px solid var(--border-color); color: var(--text-color); border-radius: 6px; font-size: 0.85rem;" />
        </div>
        <div style="width: 150px;">
          <label style="display: block; font-size: 0.75rem; font-weight: 600; color: var(--muted-color); margin-bottom: 4px;">Categoria</label>
          <select id="filtro-log-categoria" style="width: 100%; padding: 6px 10px; background: var(--surface-bg); border: 1px solid var(--border-color); color: var(--text-color); border-radius: 6px; font-size: 0.85rem;">
            <option value="TODOS">Todas</option>
            <option value="LOGIN">Login / Auth</option>
            <option value="MURAL">Mural / Alertas</option>
            <option value="ERRO">Erros / Segurança</option>
          </select>
        </div>
        <div style="width: 135px;">
          <label style="display: block; font-size: 0.75rem; font-weight: 600; color: var(--muted-color); margin-bottom: 4px;">Data Início</label>
          <input type="date" id="filtro-log-inicio" style="width: 100%; padding: 6px 10px; background: var(--surface-bg); border: 1px solid var(--border-color); color: var(--text-color); border-radius: 6px; font-size: 0.85rem;" />
        </div>
        <div style="width: 135px;">
          <label style="display: block; font-size: 0.75rem; font-weight: 600; color: var(--muted-color); margin-bottom: 4px;">Data Fim</label>
          <input type="date" id="filtro-log-fim" style="width: 100%; padding: 6px 10px; background: var(--surface-bg); border: 1px solid var(--border-color); color: var(--text-color); border-radius: 6px; font-size: 0.85rem;" />
        </div>
        <div>
          <button type="button" id="btn-limpar-filtros-logs" class="btn-guardar-config" style="background: var(--surface-bg); color: var(--text-color); border: 1px solid var(--border-color); padding: 7px 12px; font-size: 0.8rem;">
            Limpar
          </button>
        </div>
      </div>

      <div style="display: flex; gap: 10px; margin-bottom: 16px; flex-wrap: wrap;">
        <button type="button" id="btn-atualizar-logs-view" class="btn-guardar-config" style="background: var(--surface-inset); color: var(--text-color); border: 1px solid var(--border-color);">
          🔄 Atualizar Logs
        </button>
        <button type="button" id="btn-baixar-logs-view" class="btn-guardar-config" style="background: var(--accent-color); color: #fff; border: none;">
          📥 Baixar CSV
        </button>
        <button type="button" id="btn-baixar-pdf-view" class="btn-guardar-config" style="background: #e11d48; color: #fff; border: none;">
          📄 Baixar Relatório PDF / Imprimir
        </button>
      </div>

      <div class="engineering-table-wrap" style="background: var(--surface-bg); border: 1px solid var(--border-color); border-radius: 10px; max-height: 450px; overflow-y: auto;">
        <table class="comparison-table" style="width: 100%; border-collapse: collapse; font-size: 0.85rem;">
          <thead>
            <tr style="background: var(--surface-inset); text-align: left;">
              <th style="padding: 12px;">Timestamp</th>
              <th style="padding: 12px;">Usuário</th>
              <th style="padding: 12px;">Ação</th>
              <th style="padding: 12px;">Detalhes / Ocorrência</th>
            </tr>
          </thead>
          <tbody id="tabela-logs-auditoria-view">
            <!-- Renderizado dinamicamente -->
          </tbody>
        </table>
      </div>
    </div>
  `;

  const tbody = document.getElementById("tabela-logs-auditoria-view");
  const inputBusca = document.getElementById("filtro-log-busca");
  const selectCat = document.getElementById("filtro-log-categoria");
  const inputInicio = document.getElementById("filtro-log-inicio");
  const inputFim = document.getElementById("filtro-log-fim");

  function filtrarE1Renderizar() {
    const termo = (inputBusca.value || "").toLowerCase();
    const cat = selectCat.value;
    const dataInicio = inputInicio.value; // YYYY-MM-DD
    const dataFim = inputFim.value; // YYYY-MM-DD

    const filtrados = todosLogs.filter(l => {
      const dataStr = l.timestamp ? l.timestamp.slice(0, 10) : "";
      if (dataInicio && dataStr < dataInicio) return false;
      if (dataFim && dataStr > dataFim) return false;

      if (cat === "LOGIN" && !l.acao.includes("LOGIN") && !l.acao.includes("SENHA")) return false;
      if (cat === "MURAL" && !l.acao.includes("MURAL")) return false;
      if (cat === "ERRO" && !l.acao.includes("ERRO") && !l.acao.includes("BLOQUEIO")) return false;

      if (termo) {
        const txt = `${l.usuario || ''} ${l.acao || ''} ${l.detalhes || ''}`.toLowerCase();
        if (!txt.includes(termo)) return false;
      }
      return true;
    });

    if (filtrados.length === 0) {
      tbody.innerHTML = `<tr><td colspan="4" style="padding: 24px; text-align: center; color: var(--muted-color);">Nenhum log encontrado com os filtros aplicados.</td></tr>`;
      return;
    }

    tbody.innerHTML = filtrados.map(l => `
      <tr style="border-top: 1px solid var(--border-color);">
        <td style="padding: 12px; white-space: nowrap; color: var(--muted-color);">${new Date(l.timestamp).toLocaleString("pt-BR")}</td>
        <td style="padding: 12px; font-weight: 600; color: var(--text-color);">${l.usuario || l.admin || 'sistema'}</td>
        <td style="padding: 12px;"><span style="background: var(--surface-inset); padding: 3px 8px; border-radius: 4px; font-weight: 700; color: var(--accent-color); font-size: 0.75rem;">${l.acao}</span></td>
        <td style="padding: 12px; color: var(--text-color);">${l.detalhes || ''}</td>
      </tr>
    `).join("");
  }

  inputBusca.oninput = filtrarE1Renderizar;
  selectCat.onchange = filtrarE1Renderizar;
  inputInicio.onchange = filtrarE1Renderizar;
  inputFim.onchange = filtrarE1Renderizar;

  document.getElementById("btn-limpar-filtros-logs").onclick = () => {
    inputBusca.value = "";
    selectCat.value = "TODOS";
    inputInicio.value = "";
    inputFim.value = "";
    filtrarE1Renderizar();
  };

  filtrarE1Renderizar();

  document.getElementById("btn-atualizar-logs-view").onclick = () => {
    renderizarPainelLogsAuditoria();
  };

  document.getElementById("btn-baixar-logs-view").onclick = () => {
    if (typeof window.baixarLogsAuditoriaAdmin === 'function') {
      window.baixarLogsAuditoriaAdmin();
    }
  };

  document.getElementById("btn-baixar-pdf-view").onclick = () => {
    if (typeof window.baixarLogsAuditoriaPDF === 'function') {
      window.baixarLogsAuditoriaPDF();
    }
  };
}

window.baixarLogsFiltradosCSV = function(dados) {
  if (!dados || dados.length === 0) {
    alert("Nenhum dado para exportar. Clique em 'Gerar / Visualizar' primeiro.");
    return;
  }
  let csvContent = "\uFEFFTimestamp;Usuário;Ação;Detalhes\n";
  dados.forEach(l => {
    const dataFmt = new Date(l.timestamp).toLocaleString("pt-BR");
    const user = l.usuario || l.admin || 'sistema';
    const acao = l.acao || '';
    const det = (l.detalhes || '').replace(/;/g, ",");
    csvContent += `"${dataFmt}";"${user}";"${acao}";"${det}"\n`;
  });

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `trilha_auditoria_cco_${new Date().toISOString().slice(0,10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
};

window.baixarLogsFiltradosPDF = function(dados) {
  if (!dados || dados.length === 0) {
    alert("Nenhum dado para exportar. Clique em 'Gerar / Visualizar' primeiro.");
    return;
  }

  const win = window.open('', '_blank');
  if (!win) {
    alert("Permita pop-ups no navegador para gerar o relatório em PDF.");
    return;
  }

  win.document.write(`<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="UTF-8">
<title>Relatório de Trilha de Auditoria - CCO SAMAE</title>
<style>
  body { font-family: Arial, sans-serif; margin: 30px; color: #222; background: #fff; }
  h1 { color: #0877b9; border-bottom: 2px solid #0877b9; padding-bottom: 8px; font-size: 1.4rem; }
  .meta { font-size: 0.85rem; color: #555; margin-bottom: 20px; }
  table { width: 100%; border-collapse: collapse; margin-top: 10px; }
  th, td { border: 1px solid #cbd5e1; padding: 8px 12px; text-align: left; font-size: 0.8rem; }
  th { background: #f1f5f9; color: #0f172a; font-weight: bold; }
  tr:nth-child(even) { background: #f8fafc; }
  footer { margin-top: 40px; font-size: 0.75rem; color: #64748b; border-top: 1px solid #e2e8f0; padding-top: 10px; text-align: right; }
</style>
</head>
<body>
  <h1>Inteligência Operacional - Trilha de Auditoria & Segurança</h1>
  <div class="meta">
    <p><strong>Emitido em:</strong> ${new Date().toLocaleString("pt-BR")}</p>
    <p><strong>Total de Registros no Relatório:</strong> ${dados.length}</p>
  </div>
  <table>
    <thead>
      <tr>
        <th>Timestamp</th>
        <th>Usuário</th>
        <th>Ação / Evento</th>
        <th>Detalhes</th>
      </tr>
    </thead>
    <tbody>
      ${dados.map(l => `
        <tr>
          <td style="white-space: nowrap;">${new Date(l.timestamp).toLocaleString("pt-BR")}</td>
          <td><strong>${l.usuario || l.admin || 'sistema'}</strong></td>
          <td><code>${l.acao}</code></td>
          <td>${l.detalhes || ''}</td>
        </tr>
      `).join("")}
    </tbody>
  </table>
  <footer>
    Sistema CCO SAMAE - Documento Oficial de Auditoria Interna
  </footer>
  <script>
    window.onload = function() {
      window.print();
    };
  </script>
</body>
</html>`);
  win.document.close();
};

window.baixarLogsAuditoriaAdmin = async function() {
  let logs = [];
  if (window.AuthRepository && typeof window.AuthRepository.obterLogsAuditoria === 'function') {
    try {
      logs = await window.AuthRepository.obterLogsAuditoria();
    } catch (e) {
      logs = window.nexoSecurityLog || [];
    }
  } else {
    logs = window.nexoSecurityLog || [];
  }
  const incidentes = (window.nexoIncidentsLog || []).map(inc => ({
    timestamp: inc.timestamp,
    usuario: inc.admin || inc.operador || inc.usuario || 'Operador CCO',
    acao: `MURAL_${(inc.acao || '').toUpperCase()}`,
    detalhes: `Alarme em ${inc.nome || ''} (${inc.chave || ''}) - Severidade: ${inc.severidade || ''}`
  }));
  const todosLogs = [...logs, ...incidentes].sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
  window.baixarLogsFiltradosCSV(todosLogs);
};

window.baixarLogsAuditoriaPDF = async function() {
  let logs = [];
  if (window.AuthRepository && typeof window.AuthRepository.obterLogsAuditoria === 'function') {
    try {
      logs = await window.AuthRepository.obterLogsAuditoria();
    } catch (e) {
      logs = window.nexoSecurityLog || [];
    }
  } else {
    logs = window.nexoSecurityLog || [];
  }
  const incidentes = (window.nexoIncidentsLog || []).map(inc => ({
    timestamp: inc.timestamp,
    usuario: inc.admin || inc.operador || inc.usuario || 'Operador CCO',
    acao: `MURAL_${(inc.acao || '').toUpperCase()}`,
    detalhes: `Alarme em ${inc.nome || ''} (${inc.chave || ''}) - Severidade: ${inc.severidade || ''}`
  }));
  const todosLogs = [...logs, ...incidentes].sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
  window.baixarLogsFiltradosPDF(todosLogs);
};
