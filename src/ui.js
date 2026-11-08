// ui.js - Funções de renderização de interface, cards e tabelas

function criarResumoAnalitico(container, itens) {
  itens.forEach(([rotulo, valor]) => {
    const card = document.createElement("div");
    card.className = "analysis-summary-card";
    const titulo = document.createElement("span");
    titulo.className = "analysis-summary-label";
    titulo.textContent = rotulo;
    const conteudo = document.createElement("strong");
    conteudo.className = "analysis-summary-value";
    conteudo.textContent = valor;
    card.append(titulo, conteudo);
    container.append(card);
  });
}

function preencherTabelaComparativa(corpoTabela, series) {
  series.forEach((serie) => {
    const linha = document.createElement("tr");
    const nome = document.createElement("th");
    nome.scope = "row";
    nome.textContent = `${serie.reservatorio.nome} (${serie.reservatorio.grupo})`;
    linha.append(nome);
    [
      formatarMetrica(serie.mediaNivel, "%"),
      `${formatarMetrica(serie.minimoNivel, "%")} / ${formatarMetrica(serie.maximoNivel, "%")}`,
      serie.variacaoNivel === null
        ? "Sem comparação"
        : formatarPercentual(serie.variacaoNivel),
      formatarMetrica(serie.mediaVazao, " L/s"),
      String(serie.diasComDados),
    ].forEach((valor) => {
      const celula = document.createElement("td");
      celula.textContent = valor;
      linha.append(celula);
    });
    corpoTabela.append(linha);
  });
}

function preencherSeletorFiltro(dataSelecionada, valorAnterior) {
  const banco = window.bancoDeDados;
  const dadosDoDia = banco.historico ? banco.historico[dataSelecionada] : null;
  const seletorFiltro = document.getElementById("seletor-filtro");
  if (!seletorFiltro || !dadosDoDia?.reservatorios) return;

  seletorFiltro.innerHTML = "";
  seletorFiltro.add(new Option("Todos os grupos e reservatórios", "TODOS"));

  const gruposUnicos = new Set();
  Object.values(dadosDoDia.reservatorios).forEach((res) => {
    if (res.grupo) gruposUnicos.add(res.grupo);
  });

  gruposUnicos.forEach((grupo) => {
    seletorFiltro.add(new Option(`Grupo: ${grupo}`, `grupo:${grupo}`));
  });

  Object.entries(dadosDoDia.reservatorios).forEach(([chave, res]) => {
    seletorFiltro.add(
      new Option(`  ${res.nome} (${res.grupo})`, `reservatorio:${chave}`),
    );
  });

  seletorFiltro.value = Array.from(seletorFiltro.options).some(
    (option) => option.value === valorAnterior,
  )
    ? valorAnterior
    : "TODOS";
}

function renderizarListaReservatorios(
  container,
  disponiveis,
  selecionados,
  idDica,
) {
  container.replaceChildren();
  disponiveis.forEach(([chave, reservatorio], indice) => {
    const rotulo = document.createElement("label");
    rotulo.className = "reservoir-checkbox-option";
    const checkbox = document.createElement("input");
    checkbox.type = "checkbox";
    checkbox.value = chave;
    checkbox.checked = selecionados.includes(chave);
    checkbox.id = `${container.id}-opcao-${indice}`;
    const nome = document.createElement("span");
    nome.textContent = `${reservatorio.nome} (${reservatorio.grupo})`;
    rotulo.htmlFor = checkbox.id;
    rotulo.append(checkbox, nome);
    container.append(rotulo);
  });
  atualizarContagemReservatorios(container, idDica);
}

function atualizarContagemReservatorios(container, idDica) {
  const selecionados = obterReservatoriosSelecionados(container).length;
  const disponiveis = container.querySelectorAll(
    'input[type="checkbox"]',
  ).length;
  const elementoDica = document.getElementById(idDica);
  if (elementoDica) {
    elementoDica.textContent =
      `${selecionados} de ${disponiveis} reservatório(s) selecionado(s). ` +
      "Marque os itens desejados.";
  }
}

function preencherReservatoriosAnalise(grupoSelecionado, selecoesAnteriores) {
  const banco = window.bancoDeDados;
  const ultimaData = banco.datasDisponiveis[banco.datasDisponiveis.length - 1];
  const reservatorios = banco.historico[ultimaData].reservatorios;
  const seletor = document.getElementById("analise-reservatorios");
  const disponiveis = Object.entries(reservatorios).filter(
    ([, reservatorio]) =>
      grupoSelecionado === "TODOS" || reservatorio.grupo === grupoSelecionado,
  );
  const selecoesValidas = selecoesAnteriores.filter((chave) =>
    disponiveis.some(([disponivel]) => disponivel === chave),
  );
  const chavesSelecionadas = selecoesValidas.length
    ? selecoesValidas
    : disponiveis.slice(0, 3).map(([chave]) => chave);

  renderizarListaReservatorios(
    seletor,
    disponiveis,
    chavesSelecionadas,
    "dica-selecao-reservatorios",
  );
}

function preencherReservatoriosEngenharia(
  grupoSelecionado,
  selecoesAnteriores,
) {
  const banco = window.bancoDeDados;
  const ultimaData = banco.datasDisponiveis[banco.datasDisponiveis.length - 1];
  const reservatorios = banco.historico[ultimaData].reservatorios;
  const seletor = document.getElementById("engenharia-reservatorios");
  const disponiveis = Object.entries(reservatorios).filter(
    ([, reservatorio]) =>
      grupoSelecionado === "TODOS" || reservatorio.grupo === grupoSelecionado,
  );
  const selecoesValidas = selecoesAnteriores.filter((chave) =>
    disponiveis.some(([disponivel]) => disponivel === chave),
  );
  const chavesSelecionadas = selecoesValidas.length
    ? selecoesValidas
    : disponiveis.slice(0, 3).map(([chave]) => chave);

  renderizarListaReservatorios(
    seletor,
    disponiveis,
    chavesSelecionadas,
    "dica-selecao-engenharia",
  );
}

function criarCardHTML(
  res,
  chave,
  exibirGraficos,
  selecionado,
  horarios,
  banco,
  dataSelecionada,
  baseComparacao,
) {
  const niveis = resumirLeiturasEstruturadas(
    filtrarLeiturasNivelValidas(res.leituras?.nivel),
    horarios,
  );
  const nivelAtual = obterUltimaLeituraNivel(res.leituras?.nivel);
  const vazoes = resumirLeiturasEstruturadas(res.leituras?.vazao, horarios);
  const alertaVazao = avaliarAlertaVazao(
    res.leituras?.vazao,
    obterReferenciaVazao(
      banco,
      chave,
      dataSelecionada,
      baseComparacao,
      horarios,
    ),
    horarios,
    chave,
  );
  const vazaoSemComparacao = alertaVazao.status === "Sem comparação";
  const comparacaoNivel = obterComparacaoNivel(
    banco,
    chave,
    dataSelecionada,
    baseComparacao,
    horarios,
    obterUltimaLeituraNivel(res.leituras?.nivel),
  );
  const statusNivel = avaliarStatusNivel(res.leituras?.nivel, chave, comparacaoNivel?.referencia);
  let statusClass = "status-normal";
  if (statusNivel === "Atenção") statusClass = "status-atencao";
  if (statusNivel === "Crítico") statusClass = "status-critico";
  if (statusNivel === "Sem Dados") statusClass = "status-sem-dados";

  const comparacoesVazao = alertaVazao.indicadores
    .filter((indicador) => indicador.classificaAlerta && indicador.rotulo !== "Média")
    .map((indicador) => {
      const direcao =
        indicador.direcao === "baixa"
          ? "↓ Baixa"
          : indicador.direcao === "alta"
            ? "↑ Alta"
            : indicador.direcao === "estável"
              ? "Estável"
              : "Sem comparação";
      const variacao =
        indicador.variacao === null
          ? indicador.valorAnterior === 0
            ? "Ref. zero"
            : "Sem base"
          : formatarPercentual(indicador.variacao);

      return `<div class="card-comparison-metric ${obterClasseStatus(indicador.status)}">
        <span class="card-comparison-label">Vazão ${indicador.rotulo.toLowerCase()}</span>
        <strong>${variacao}</strong>
        <span class="card-comparison-status">${direcao} · ${indicador.status}</span>
      </div>`;
    })
    .join("");

  const variacaoNivel =
    comparacaoNivel.variacao === null
      ? "Sem comparação"
      : formatarPercentual(comparacaoNivel.variacao);
  const direcaoNivel =
    comparacaoNivel.variacao === null
      ? "Sem base"
      : comparacaoNivel.variacao < 0
        ? "↓ Baixou"
        : comparacaoNivel.variacao > 0
          ? "↑ Subiu"
          : "Estável";

  const comparacaoHTML = `<div class="card-comparison">
      <div class="card-comparison-heading">
        <span>Comparação</span>
      </div>
      <div class="card-comparison-grid">
        <div class="card-comparison-metric ${obterClasseStatus(statusNivel)}">
          <span class="card-comparison-label">Nível</span>
          <strong>${variacaoNivel}</strong>
          <span class="card-comparison-status">${direcaoNivel} · ${statusNivel}</span>
        </div>
        ${comparacoesVazao}
      </div>
    </div>`;

  const quantidadeSlots = Math.max(
    horarios.length,
    res.leituras?.nivel?.length ?? 0,
    res.leituras?.vazao?.length ?? 0,
  );
  const leiturasValidas = niveis.quantidade + vazoes.quantidade;
  const leiturasAusentes = quantidadeSlots * 2 - leiturasValidas;
  const qualidadeHTML = `<div class="card-data-quality${
    leiturasAusentes > 0 ? " has-missing-data" : ""
  }">
    ${leiturasValidas}/${quantidadeSlots * 2} leituras válidas${
      leiturasAusentes > 0 ? ` · ${leiturasAusentes} ausentes` : ""
    }
  </div>`;

  const predicao = calcularAutonomiaEProjecao(res, chave);

  const idCanvas = `chart-${res.nome.replace(/[^a-zA-Z0-9]/g, "_")}`;
  const nivelMedio = formatarMetrica(niveis.media, "%");
  const vazaoMedia = formatarMetrica(vazoes.media, " L/s");

  const classeRoscaNivel =
    statusNivel === "Normal"
      ? "status-normal"
      : statusNivel === "Atenção"
        ? "status-atencao"
        : statusNivel === "Crítico"
          ? "status-critico"
          : "status-sem-dados";

  const indicadorNivelHTML = selecionado
    ? `<div
      class="kpi-box kpi-level-gauge"
      role="meter"
      aria-label="Nível atual"
      aria-valuemin="0"
      aria-valuemax="100"
      ${nivelAtual === null ? "" : `aria-valuenow="${Math.min(nivelAtual, 100)}"`}
    >
      <span
        class="level-gauge ${classeRoscaNivel}"
        style="--nivel-atual: ${Math.min(Math.max(nivelAtual ?? 0, 0), 100)}%"
      >
        <span class="level-gauge-content">
          <strong>${nivelAtual === null ? "N/A" : `${nivelAtual.toFixed(1)}%`}</strong>
          <small>Nível atual</small>
        </span>
      </span>
    </div>`
    : `<div class="kpi-box">
      <span class="kpi-label">Nível Atual</span>
      <span class="kpi-value">${
        nivelAtual === null ? "N/A" : `${nivelAtual.toFixed(1)}%`
      }</span>
    </div>`;

  const kpiHTML = selecionado
    ? `<div class="kpi-container kpi-container-selected">
      <div class="kpi-box kpi-level-range">
        <span class="kpi-label">Nível Mín/Máx</span>
        <span class="kpi-value">${formatarMetrica(niveis.minimo, "%")} / ${formatarMetrica(niveis.maximo, "%")}</span>
        <span class="kpi-detail">Mín. ${niveis.horarioMinimo ?? "--"} · Máx. ${niveis.horarioMaximo ?? "--"}</span>
      </div>
      <div class="kpi-box kpi-level-average">
        <span class="kpi-label">Nível médio</span>
        <span class="kpi-value">${nivelMedio}</span>
        <span class="kpi-detail">Média das leituras da madrugada</span>
      </div>
      ${indicadorNivelHTML}
      <div class="kpi-box kpi-flow-range">
        <span class="kpi-label">Vazão Mín/Máx (dia)</span>
        <span class="kpi-value">${formatarMetrica(vazoes.minimo, " L/s")} / ${formatarMetrica(vazoes.maximo, " L/s")}</span>
        <span class="kpi-detail">Mín. ${vazoes.horarioMinimo ?? "--"} · Máx. ${vazoes.horarioMaximo ?? "--"}</span>
      </div>
    </div>`
    : `<div class="kpi-container">
      ${indicadorNivelHTML}
      <div class="kpi-box">
        <span class="kpi-label">Nível Mín/Máx</span>
        <span class="kpi-value">${formatarMetrica(niveis.minimo, "%")} / ${formatarMetrica(niveis.maximo, "%")}</span>
        <span class="kpi-detail">Mín. ${niveis.horarioMinimo ?? "--"} · Máx. ${niveis.horarioMaximo ?? "--"}</span>
      </div>
      <div class="kpi-box">
        <span class="kpi-label">Vazão Mín/Máx (dia)</span>
        <span class="kpi-value">${formatarMetrica(vazoes.minimo, " L/s")} / ${formatarMetrica(vazoes.maximo, " L/s")}</span>
        <span class="kpi-detail">Mín. ${vazoes.horarioMinimo ?? "--"} · Máx. ${vazoes.horarioMaximo ?? "--"}</span>
      </div>
    </div>`;

  const graficoHTML = analiseReservatorioAberta
    ? ""
    : selecionado
      ? `<button class="reservoir-analysis-open" type="button" data-open-reservoir-analysis>
      <span aria-hidden="true">↗</span> Abrir análise detalhada
      </button>
      <div class="reservoir-charts">
      <section class="reservoir-chart-panel">
        <h3>Leituras da madrugada</h3>
        <div class="chart-box"><canvas id="${idCanvas}" role="img" aria-label="Leituras horárias de nível e vazão"></canvas></div>
      </section>
      <section class="reservoir-chart-panel">
        <h3>Leituras + médias da madrugada</h3>
        <div class="chart-box"><canvas id="${idCanvas}-medias" role="img" aria-label="Leituras horárias de nível e vazão com médias da madrugada"></canvas></div>
      </section>
    </div>`
      : exibirGraficos
        ? `<div class="chart-box"><canvas id="${idCanvas}"></canvas></div>`
        : "";

  return `
    <div
      class="card${selecionado ? " is-selected" : ""}"
      data-reservatorio="${encodeURIComponent(chave)}"
      role="button"
      tabindex="0"
      aria-pressed="${selecionado}"
      aria-label="Selecionar KPIs de ${res.nome}, grupo ${res.grupo}"
    >
      <div class="card-header">
        <span class="card-title">${obterIdentificacaoReservatorio(chave)}</span>
        <span class="card-statuses">
          <span class="badge-status ${statusClass}">Nível: ${statusNivel}</span>
          <span class="badge-status ${obterClasseStatus(alertaVazao.status)}${
            vazaoSemComparacao ? " card-flow-unavailable" : ""
          }"${
            vazaoSemComparacao
              ? ' aria-label="Vazão: N/A, sem comparação" title="Vazão: sem comparação disponível"'
              : ""
          }>
            ${vazaoSemComparacao ? "Vazão: N/A" : `Vazão: ${alertaVazao.status}`}
          </span>
          ${leiturasAusentes > 0 ? `<span class="badge-status status-sem-dados" title="Falha de telemetria / ${leiturasAusentes} leitura(s) ausente(s)">Inconsistente</span>` : ""}
        </span>
      </div>

      ${kpiHTML}

      ${comparacaoHTML}
      ${qualidadeHTML}
      ${graficoHTML}
    </div>
  `;
}

function criarPainelInformativoAlarme(
  reservatorio,
  chave,
  horarios,
  banco,
  dataSelecionada,
  baseComparacao,
) {
  const painel = document.createElement("aside");
  painel.className = "reservoir-alarm-info";
  painel.setAttribute("aria-labelledby", "reservoir-alarm-info-title");

  const titulo = document.createElement("h3");
  titulo.id = "reservoir-alarm-info-title";
  titulo.textContent = "Informativo do alarme";
  const cabecalho = document.createElement("div");
  cabecalho.className = "reservoir-alarm-info-heading";
  cabecalho.append(titulo);
  if (!window.veioDeAlertasCCO) {
    const fechar = document.createElement("button");
    fechar.type = "button";
    fechar.className = "reservoir-alarm-info-close";
    fechar.textContent = "Fechar";
    fechar.addEventListener("click", () => {
      const seletorFiltro = document.getElementById("seletor-filtro");
      seletorFiltro.value = "TODOS";
      seletorFiltro.dispatchEvent(new Event("change", { bubbles: true }));
    });
    cabecalho.append(fechar);
  }

  const identificacao = document.createElement("p");
  identificacao.className = "reservoir-alarm-info-id";
  identificacao.textContent = `${obterIdentificacaoReservatorio(chave)} · ${dataSelecionada}`;
  painel.append(cabecalho, identificacao);

  const comparacaoNivel = obterComparacaoNivel(
    banco,
    chave,
    dataSelecionada,
    baseComparacao,
    horarios,
    obterUltimaLeituraNivel(reservatorio.leituras?.nivel),
  );
  const nivel = obterUltimaLeituraNivel(reservatorio.leituras?.nivel);
  const statusNivel = avaliarStatusNivel(reservatorio.leituras?.nivel, chave, comparacaoNivel?.referencia);
  const nivelSecao = document.createElement("section");
  nivelSecao.className = "reservoir-alarm-info-section";
  const nivelTitulo = document.createElement("h4");
  nivelTitulo.textContent = "Nível";
  const nivelStatus = document.createElement("span");
  nivelStatus.className = `badge-status ${obterClasseStatus(statusNivel)}`;
  nivelStatus.textContent = statusNivel;
  const nivelDetalhe = document.createElement("p");
  nivelDetalhe.textContent =
    nivel === null
      ? "Sem leitura de nível válida para avaliar o alarme."
      : `Última leitura: ${nivel.toFixed(1)}%. ${
          statusNivel === "Crítico"
            ? `Crítico: abaixo de ${LIMITE_CRITICO_NIVEL_PERCENTUAL}%.`
            : statusNivel === "Atenção"
              ? `Atenção: abaixo de ${LIMITE_ATENCAO_NIVEL_PERCENTUAL}%.`
              : `Normal: igual ou acima de ${LIMITE_ATENCAO_NIVEL_PERCENTUAL}%.`
        }`;
  nivelSecao.append(nivelTitulo, nivelStatus, nivelDetalhe);
  painel.append(nivelSecao);

  const referencia = obterReferenciaVazao(
    banco,
    chave,
    dataSelecionada,
    baseComparacao,
    horarios,
  );
  const alertaVazao = avaliarAlertaVazao(
    reservatorio.leituras?.vazao,
    referencia,
    horarios,
    chave,
  );
  const vazaoSecao = document.createElement("section");
  vazaoSecao.className = "reservoir-alarm-info-section";
  const vazaoTitulo = document.createElement("h4");
  vazaoTitulo.textContent = "Vazão";
  const vazaoStatus = document.createElement("span");
  vazaoStatus.className = `badge-status ${obterClasseStatus(alertaVazao.status)}`;
  vazaoStatus.textContent = alertaVazao.status;
  const vazaoRegra = document.createElement("p");
  vazaoRegra.textContent =
    `Comparação: ${obterRotuloBaseComparacao(baseComparacao)} ` +
    `(${referencia.quantidade} dia(s) válidos). Na vazão mínima, desvios para ` +
    `cima ou para baixo de ${LIMITE_ATENCAO_VAZAO_PERCENTUAL}% a ` +
    `${LIMITE_CRITICO_VAZAO_PERCENTUAL}% geram atenção; acima de ` +
    `${LIMITE_CRITICO_VAZAO_PERCENTUAL}% são críticos. Na máxima, somente ` +
    `aumentos em relação à referência geram alarme. ` +
    "A vazão média é informativa.";
  const indicadores = document.createElement("div");
  indicadores.className = "reservoir-alarm-indicators";

  alertaVazao.indicadores
    .filter((indicador) => indicador.classificaAlerta)
    .forEach((indicador) => {
      const item = document.createElement("div");
      item.className = "reservoir-alarm-indicator";
      const nome = document.createElement("strong");
      nome.textContent = indicador.rotulo;
      const valor = document.createElement("span");
      valor.textContent =
        `Atual ${formatarValorVazao(indicador.valorAtual)} L/s · ` +
        `Referência ${formatarValorVazao(indicador.valorAnterior)} L/s`;
      const variacao = document.createElement("span");
      variacao.textContent =
        indicador.variacao === null
          ? indicador.valorAnterior === 0
            ? "Referência histórica zero; variação não calculável."
            : `Sem base suficiente (${indicador.quantidadeReferencia} dia(s) válidos).`
          : indicador.rotulo === "Máxima" && indicador.variacao <= 0
            ? `${formatarPercentual(indicador.variacao)} · igual ou abaixo da referência, sem alarme`
            : `${formatarPercentual(indicador.variacao)} · ${
                indicador.direcao === "baixa"
                  ? "vazão baixa"
                  : indicador.direcao === "alta"
                    ? "vazão alta"
                    : "sem variação"
              }`;
      const status = document.createElement("span");
      status.className = `badge-status ${obterClasseStatus(indicador.status)}`;
      status.textContent = indicador.status;
      item.append(nome, valor, variacao, status);
      indicadores.append(item);
    });

  vazaoSecao.append(vazaoTitulo, vazaoStatus, vazaoRegra, indicadores);
  painel.append(vazaoSecao);

  const vazaoHistorica = obterExtremosHistoricosVazao(banco, chave);
  const historicoSecao = document.createElement("section");
  historicoSecao.className =
    "reservoir-alarm-info-section reservoir-alarm-history";
  const historicoTitulo = document.createElement("h4");
  historicoTitulo.textContent = "Extremos históricos da vazão";
  const extremosHistoricos = document.createElement("div");
  extremosHistoricos.className = "historical-flow-extremes";
  extremosHistoricos.setAttribute("aria-label", "Extremos históricos de vazão");
  [
    {
      rotulo: "Mín. hist.",
      valor: vazaoHistorica.minimo,
      data: vazaoHistorica.dataMinimo,
    },
    {
      rotulo: "Máx. hist.",
      valor: vazaoHistorica.maximo,
      data: vazaoHistorica.dataMaximo,
    },
  ].forEach((extremo) => {
    const item = document.createElement("span");
    const rotulo = document.createElement("strong");
    rotulo.textContent = extremo.rotulo;
    const valor = document.createElement("span");
    valor.textContent = `${formatarValorVazao(extremo.valor)} L/s`;
    const data = document.createElement("small");
    data.textContent = extremo.data ?? "—";
    item.append(rotulo, valor, data);
    extremosHistoricos.append(item);
  });
  historicoSecao.append(historicoTitulo, extremosHistoricos);
  painel.append(historicoSecao);

  return painel;
}

function criarPainelAutonomiaPreditiva(
  reservatorio,
  chave,
  horarios,
  banco,
  dataSelecionada,
  baseComparacao,
) {
  const painel = document.createElement("div");
  painel.id = "esquema-autonomia-container";
  painel.style.cssText = "grid-column: 1 / -1; background: var(--surface-bg); border: 1px solid var(--border-color); border-radius: 12px; padding: 24px; display: flex; flex-direction: column; gap: 20px; margin-top: 20px;";

  const predAlvo = calcularAutonomiaEProjecao(reservatorio, chave);
  const nivelAlvo = obterUltimaLeituraNivel(reservatorio.leituras?.nivel);
  const vazaoAlvo = obterUltimaLeitura(reservatorio.leituras?.vazao) ?? 0;
  const configAlvo = obterConfiguracaoReservatorio(chave);
  const capAlvo = configAlvo.capacidadeUtil !== "" && !isNaN(configAlvo.capacidadeUtil) ? Number(configAlvo.capacidadeUtil) : 5000;

  const niveisValidos = (Array.isArray(reservatorio?.leituras?.nivel) ? reservatorio.leituras.nivel : [])
    .map(v => (v !== null && v !== undefined && v !== "" && Number.isFinite(Number(v)) ? Number(v) : null))
    .filter(v => v !== null);
  const diffNivel = niveisValidos.length >= 2 ? (niveisValidos[niveisValidos.length - 1] - niveisValidos[niveisValidos.length - 2]).toFixed(1) : "0.0";
  const sinalDiff = Number(diffNivel) > 0 ? "+" : "";

  const conf = predAlvo.confiabilidade || "Média";
  const corConf = conf === "Alta" ? "var(--status-normal-color)" : conf === "Média" ? "#d7a52b" : "var(--status-critical-color)";

  let predicaoAlertHTML = "";
  if (predAlvo && predAlvo.statusPreditivo !== "Normal") {
    predicaoAlertHTML = `
      <div style="background: rgba(227,93,106,0.1); border: 1px solid var(--status-critical-color, #e35d6a); border-radius: 8px; padding: 12px 16px; font-size: 0.9rem; color: var(--status-critical-color, #e35d6a); display: flex; align-items: center; gap: 8px;">
        <span>⏳</span> <strong>Autonomia:</strong> ${predAlvo.mensagemPreditiva}
      </div>
    `;
  }

  let fallbackAlertHTML = "";
  if (predAlvo && predAlvo.fallbackUsoApenasNivel) {
    fallbackAlertHTML = `
      <div style="background: rgba(215,165,43,0.15); border: 1px solid #d7a52b; border-radius: 8px; padding: 12px 16px; font-size: 0.9rem; color: #d7a52b; display: flex; align-items: center; gap: 8px;">
        <span>⚠️</span> <strong>Aviso:</strong> ${predAlvo.mensagemFallback}
      </div>
    `;
  }

  let configVazaoOffHTML = "";
  if (!configAlvo.possuiMedicaoVazao) {
    configVazaoOffHTML = `
      <div style="background: rgba(89,117,217,0.15); border: 1px solid #5975d9; border-radius: 8px; padding: 12px 16px; font-size: 0.9rem; color: #5975d9; display: flex; align-items: center; gap: 8px;">
        <span>ℹ️</span> <strong>Modo Nível:</strong> A medição de vazão está desativada na parametrização; o cálculo utiliza a variação do nível e capacidade útil.
      </div>
    `;
  }

  painel.innerHTML = `
    <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid var(--border-color); padding-bottom: 16px;">
      <div>
        <h3 style="margin: 0; font-size: 1.25rem; color: var(--text-color); display: flex; align-items: center; gap: 8px;">
          <span>📊</span> Autonomia Preditiva & Alertas Baseados em Tempo
        </h3>
        <div style="margin: 4px 0 0 28px; font-size: 0.95rem; font-weight: 600; color: var(--accent-color);">${reservatorio?.nome || chave}</div>
      </div>
      <div style="display: flex; align-items: center; gap: 12px;">
        <span style="font-size: 0.85rem; padding: 4px 10px; background: rgba(255,255,255,0.05); border: 1px solid var(--border-color); border-radius: 12px; color: ${corConf}; font-weight: 600;" title="Confiabilidade baseada na densidade de leituras válidas">
          Confiabilidade: ${conf}
        </span>
        ${window.veioDeAlertasCCO ? '' : '<button type="button" id="btn-fechar-esquema-autonomia" class="btn-guardar-config" style="padding: 8px 16px; background: var(--surface-bg); color: var(--accent-color); border: 1px solid var(--accent-color); cursor: pointer;">Voltar ao Monitoramento</button>'}
      </div>
    </div>

    ${predicaoAlertHTML}
    ${fallbackAlertHTML}
    ${configVazaoOffHTML}

    <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 20px;">
      <!-- Card 1: Reservatório -->
      <div style="background: var(--card-bg); border: 1px solid var(--border-color); border-radius: 10px; padding: 20px; display: flex; flex-direction: column; gap: 12px;">
        <h4 style="margin: 0; font-size: 1rem; color: var(--text-color);">Status do Reservatório</h4>
        <span style="font-size: 0.85rem; color: var(--muted-color);">Capacidade Útil: ${capAlvo} m³</span>
        <div style="background: var(--surface-bg); border: 1px solid var(--border-color); border-radius: 8px; padding: 16px; text-align: center;">
          <div style="font-size: 1.5rem; font-weight: 700; color: var(--accent-color);">${nivelAlvo !== null ? nivelAlvo.toFixed(1) + '%' : 'N/A'}</div>
          <div style="font-size: 0.8rem; color: var(--muted-color); margin-top: 4px;">Nível Atual (Tendência: ${predAlvo?.tendencia || 'Estável'} ${predAlvo?.iconeTendencia || '→'})</div>
          <div style="font-size: 0.8rem; color: ${Number(diffNivel) >= 0 ? 'var(--status-normal-color)' : 'var(--status-critical-color)'}; margin-top: 6px; font-weight: 600;">Saldo última hora: ${sinalDiff}${diffNivel}%</div>
        </div>
      </div>

      <!-- Card 2: Balanço Hidráulico -->
      <div style="background: var(--card-bg); border: 1px solid var(--border-color); border-radius: 10px; padding: 20px; display: flex; flex-direction: column; gap: 12px;">
        <h4 style="margin: 0; font-size: 1rem; color: var(--text-color);">Balanço Hidráulico (Net Flow)</h4>
        <span style="font-size: 0.85rem; color: var(--muted-color);">Taxa de variação entre entrada e saída</span>
        <div style="background: var(--surface-bg); border: 1px solid var(--border-color); border-radius: 8px; padding: 12px; display: flex; flex-direction: column; gap: 8px; font-size: 0.85rem;">
          <div style="display: flex; justify-content: space-between;"><span style="color: var(--muted-color);">Vazão de Entrada:</span> <strong style="color: var(--status-normal-color);">${predAlvo?.vazaoEntradaLs !== undefined && predAlvo?.vazaoEntradaLs !== null ? predAlvo.vazaoEntradaLs.toFixed(1) + ' L/s' : '0.0 L/s'}</strong></div>
          <div style="display: flex; justify-content: space-between;"><span style="color: var(--muted-color);">Vazão de Saída:</span> <strong style="color: var(--status-critical-color);">${vazaoAlvo} L/s</strong></div>
          <div style="display: flex; justify-content: space-between;"><span style="color: var(--muted-color);">Vazão Líquida:</span> <strong style="color: ${predAlvo?.vazaoLiquidaLs > 0 ? 'var(--status-critical-color)' : 'var(--status-normal-color)'};">${predAlvo?.vazaoLiquidaLs !== undefined ? (predAlvo.vazaoLiquidaLs > 0 ? '+' : '') + predAlvo.vazaoLiquidaLs.toFixed(1) + ' L/s (~' + predAlvo.vazaoLiquidaM3h.toFixed(0) + ' m³/h)' : '0 L/s'}</strong></div>
        </div>
      </div>

      <!-- Card 3: Projeção & Autonomia -->
      <div style="background: var(--card-bg); border: 1px solid var(--border-color); border-radius: 10px; padding: 20px; display: flex; flex-direction: column; gap: 12px;">
        <h4 style="margin: 0; font-size: 1rem; color: var(--text-color);">Projeção & Autonomia</h4>
        <span style="font-size: 0.85rem; color: var(--muted-color);">Horizontes de alerta baseados em tempo</span>
        <div style="display: flex; flex-direction: column; gap: 8px; font-size: 0.85rem;">
          ${predAlvo?.minutosAteNormal !== null && predAlvo?.minutosAteNormal !== undefined ? `
            <div style="background: rgba(115,191,105,0.1); border: 1px solid rgba(115,191,105,0.3); border-radius: 6px; padding: 8px 12px; display: flex; justify-content: space-between; align-items: center;">
              <span style="color: var(--status-normal-color); font-weight: 600;">📈 Normalizar (60%)</span>
              <strong style="color: var(--status-normal-color);">~ ${predAlvo.minutosAteNormal} min</strong>
            </div>
          ` : ''}
          <div style="background: rgba(215,165,43,0.1); border: 1px solid rgba(215,165,43,0.3); border-radius: 6px; padding: 8px 12px; display: flex; justify-content: space-between; align-items: center;">
            <span style="color: #d7a52b; font-weight: 600;">⚠️ Atenção (&lt; ${configAlvo.nivelAlertaTempoAtencao}%)</span>
            <strong style="color: #d7a52b;">${predAlvo?.minutosAteAtencao !== null && predAlvo?.minutosAteAtencao !== undefined ? '~ ' + predAlvo.minutosAteAtencao + ' min' : 'Estável'}</strong>
          </div>
          <div style="background: rgba(227,93,106,0.1); border: 1px solid rgba(227,93,106,0.3); border-radius: 6px; padding: 8px 12px; display: flex; justify-content: space-between; align-items: center;">
            <span style="color: var(--status-critical-color); font-weight: 600;">🔴 Crítico (&lt; ${configAlvo.nivelAlertaTempoCritico}%)</span>
            <strong style="color: var(--status-critical-color);">${predAlvo?.minutosAteCritico !== null && predAlvo?.minutosAteCritico !== undefined ? '~ ' + predAlvo.minutosAteCritico + ' min' : 'Estável'}</strong>
          </div>
        </div>
      </div>
    </div>
  `;

  setTimeout(() => {
    const btnFechar = painel.querySelector("#btn-fechar-esquema-autonomia");
    if (btnFechar) {
      btnFechar.onclick = () => {
        const seletorFiltro = document.getElementById("seletor-filtro");
        if (seletorFiltro) {
          seletorFiltro.value = "TODOS";
          seletorFiltro.dispatchEvent(new Event("change", { bubbles: true }));
        }
      };
    }
  }, 50);

  return painel;
}

function renderizarDetalhesBoletim(
  container,
  categoria,
  dataSelecionada,
  horarios,
  escopoOperacional,
  baseComparacao,
) {
  container.replaceChildren();
  container.hidden = !categoria;
  if (!categoria) return;

  const heading = document.createElement("div");
  heading.className = "operational-details-heading";
  const titulo = document.createElement("h3");
  titulo.textContent = `${categoria.rotulo} (${categoria.registros.length})`;
  const fechar = document.createElement("button");
  fechar.type = "button";
  fechar.className = "operational-details-close";
  fechar.textContent = "Fechar boletim";
  fechar.setAttribute(
    "aria-label",
    "Fechar detalhes do boletim e voltar ao resumo",
  );
  fechar.addEventListener("click", () => {
    categoriaBoletimAtiva = null;
    renderizarDashboard();
  });
  heading.append(titulo, fechar);

  const descricao = document.createElement("p");
  descricao.className = "operational-details-description";
  descricao.textContent =
    categoria.chave === "incompletos"
      ? `Leituras de ${obterRotuloEscopo(escopoOperacional)} ausentes em ${dataSelecionada}. Reservatórios sem registro também aparecem aqui.`
      : `Reservatórios classificados como ${categoria.rotulo.toLowerCase()} em ${dataSelecionada}, considerando ${obterRotuloEscopo(escopoOperacional)}.`;

  const lista = document.createElement("div");
  lista.className = "operational-details-list";
  if (!categoria.registros.length) {
    const vazio = document.createElement("p");
    vazio.className = "operational-details-empty";
    vazio.textContent =
      "Nenhum reservatório nesta categoria para os filtros selecionados.";
    lista.append(vazio);
  }

  categoria.registros.forEach((registro) => {
    const card = document.createElement("article");
    card.className = "operational-detail-item";
    const topo = document.createElement("div");
    topo.className = "operational-detail-heading";
    const nome = document.createElement("h4");
    nome.textContent = obterIdentificacaoReservatorio(registro.chave);

    const btnInfo = document.createElement("button");
    btnInfo.type = "button";
    btnInfo.className = "operational-detail-info-btn";
    btnInfo.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg> <span>Base</span>`;
    btnInfo.title = "Ver dados da base de comparação e referências";

    btnInfo.addEventListener("click", () => {
      const bases = card.querySelectorAll(".operational-detail-base-desc");
      const isHidden = bases[0]?.hidden ?? true;
      bases.forEach(b => { b.hidden = !isHidden; });
      btnInfo.classList.toggle("is-active", isHidden);
      btnInfo.innerHTML = isHidden
        ? `<svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg> <span>Ocultar</span>`
        : `<svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg> <span>Base</span>`;
    });

    const nomeContainer = document.createElement("div");
    nomeContainer.className = "operational-detail-title-wrap";
    nomeContainer.append(nome, btnInfo);
    topo.append(nomeContainer);
    let statusNivel;
    if (escopoOperacional !== "vazao") {
      statusNivel = document.createElement("span");
      statusNivel.className = `badge-status ${obterClasseStatus(registro.statusNivel)}`;
      statusNivel.textContent = `Nível: ${registro.statusNivel ?? "Sem registro"}`;
    }
    let statusVazao;
    if (escopoOperacional !== "nivel") {
      statusVazao = document.createElement("span");
      const vazoesAtuais = resumirLeiturasEstruturadas(
        registro.atual?.leituras?.vazao,
        horarios,
      );
      const vazaoIndisponivel =
        !registro.atual || vazoesAtuais.quantidade === 0;
      const vazaoSemComparacao =
        registro.alertaVazao?.status === "Sem comparação";
      statusVazao.className = `badge-status ${obterClasseStatus(
        vazaoIndisponivel ? "Sem comparação" : registro.alertaVazao?.status,
      )}`;
      if (vazaoIndisponivel || vazaoSemComparacao) {
        statusVazao.classList.add("operational-detail-status-unavailable");
      }
      statusVazao.textContent = vazaoIndisponivel
        ? "Vazão: N/A"
        : `Vazão: ${registro.alertaVazao?.status ?? "Sem comparação"}`;
    }
    if (statusNivel) {
      const statusReservatorio = document.createElement("div");
      statusReservatorio.className = "card-statuses";
      statusReservatorio.append(statusNivel);
      topo.append(statusReservatorio);
    }
    if (statusVazao) topo.append(statusVazao);

    if (registro.atual) {
      const comparacaoNivel = registro.comparacaoNivel;
      const variacaoNivel = formatarVariacaoNivel(comparacaoNivel);
      const niveisAtuais = resumirLeiturasEstruturadas(
        filtrarLeiturasNivelValidas(registro.atual.leituras?.nivel),
        horarios,
      );
      const nivelNumerico = obterUltimaLeituraNivel(
        registro.atual.leituras?.nivel,
      );
      const nivelAtualFormatado =
        nivelNumerico === null ? "N/A" : `${nivelNumerico.toFixed(1)}%`;
      const explicacaoStatus =
        registro.statusNivel === "Crítico"
          ? `Classificação crítica: nível abaixo de ${LIMITE_CRITICO_NIVEL_PERCENTUAL}% (${nivelAtualFormatado}).`
          : registro.statusNivel === "Atenção"
            ? `Classificação de atenção: nível abaixo de ${LIMITE_ATENCAO_NIVEL_PERCENTUAL}% (${nivelAtualFormatado}).`
            : registro.statusNivel === "Sem Dados"
              ? "Não há leituras válidas de nível nesta madrugada; incluído em Incompletos."
              : nivelNumerico === null
                ? "Não há leitura de nível válida para classificar o reservatório."
                : "";

      card.append(topo);

      const secaoNivel = document.createElement("section");
      secaoNivel.className = "operational-detail-section";
      const tituloNivel = document.createElement("h5");
      tituloNivel.textContent = "Nível do reservatório";
      const gradeNivel = document.createElement("div");
      gradeNivel.className = "operational-detail-metric-grid";
      gradeNivel.append(
        criarCelulaDetalhe("Nível atual", nivelAtualFormatado),
        criarCelulaDetalhe(
          "Mínimo / máximo",
          `${formatarMetrica(niveisAtuais.minimo, "%")} / ${formatarMetrica(niveisAtuais.maximo, "%")}`,
        ),
        criarCelulaDetalhe("Variação (%)", variacaoNivel),
      );
      const datasReferenciaNivel =
        comparacaoNivel?.datas.length > 0
          ? ` Datas usadas: ${
              comparacaoNivel.datas.length <= 4
                ? comparacaoNivel.datas.join(", ")
                : `${comparacaoNivel.datas[0]} a ${comparacaoNivel.datas[comparacaoNivel.datas.length - 1]}`
            }.`
          : "";
      const descricaoReferenciaNivel = document.createElement("p");
      descricaoReferenciaNivel.className = "operational-detail-reason operational-detail-base-desc";
      descricaoReferenciaNivel.hidden = true;
      descricaoReferenciaNivel.textContent = `Base: ${obterRotuloBaseComparacao(baseComparacao)} · média de ${comparacaoNivel?.quantidade ?? 0} dia(s) válidos. Referência diária média: ${formatarMetrica(comparacaoNivel?.referencia ?? null, "%")}.${datasReferenciaNivel}`;
      secaoNivel.append(tituloNivel, gradeNivel);
      secaoNivel.append(descricaoReferenciaNivel);
      if (explicacaoStatus) {
        const explicacao = document.createElement("p");
        explicacao.className = "operational-detail-reason";
        explicacao.textContent = explicacaoStatus;
        secaoNivel.append(explicacao);
      }
      if (escopoOperacional !== "vazao") card.append(secaoNivel);

      if (registro.alertaVazao && escopoOperacional !== "nivel") {
        const secaoVazao = document.createElement("section");
        secaoVazao.className = "operational-detail-section";
        const cabecalhoVazao = document.createElement("div");
        cabecalhoVazao.className = "operational-detail-flow-heading";
        const tituloVazao = document.createElement("h5");
        tituloVazao.textContent = "Vazão";
        const statusIndicadores = document.createElement("span");
        statusIndicadores.className = `badge-status ${obterClasseStatus(registro.alertaVazao.status)}`;
        statusIndicadores.textContent = registro.alertaVazao.status;
        cabecalhoVazao.append(tituloVazao, statusIndicadores);

        const referencia = registro.alertaVazao.referencia;
        const datasReferencia =
          referencia?.datas.length > 0
            ? ` Datas usadas: ${
                referencia.datas.length <= 4
                  ? referencia.datas.join(", ")
                  : `${referencia.datas[0]} a ${referencia.datas[referencia.datas.length - 1]}`
              }.`
            : "";
        const descricaoBase = document.createElement("p");
        descricaoBase.className = "operational-detail-reason operational-detail-base-desc";
        descricaoBase.hidden = true;
        descricaoBase.textContent = `Base: ${obterRotuloBaseComparacao(baseComparacao)} · ${referencia?.quantidade ?? 0} dia(s) válidos.${datasReferencia} Para mínima e máxima, queda ou aumento de ${LIMITE_ATENCAO_VAZAO_PERCENTUAL}% gera atenção; acima de ${LIMITE_CRITICO_VAZAO_PERCENTUAL}% é crítico. Média exibida apenas como informação, sem gerar alerta.`;
        const gradeVazao = document.createElement("div");
        gradeVazao.className = "operational-flow-indicators";
        registro.alertaVazao.indicadores.forEach((indicador) => {
          const item = document.createElement("div");
          item.className = "operational-flow-indicator";
          const nomeIndicador = document.createElement("strong");
          nomeIndicador.textContent = indicador.rotulo;
          const valoresIndicador = document.createElement("span");
          valoresIndicador.textContent = `Atual ${formatarValorVazao(indicador.valorAtual)} L/s · Ref. ${formatarValorVazao(indicador.valorAnterior)} L/s`;
          const variacaoIndicador = document.createElement("span");
          variacaoIndicador.textContent =
            indicador.variacao === null && indicador.classificaAlerta
              ? indicador.valorAnterior === 0
                ? `Referência histórica zero (${indicador.quantidadeReferencia} dias); variação percentual não calculável`
                : `Sem base suficiente (${indicador.quantidadeReferencia} dias válidos)`
              : indicador.variacao === null
                ? "Sem comparação disponível"
                : !indicador.classificaAlerta
                  ? `${formatarPercentual(indicador.variacao)} — informativo, não classifica alerta`
                  : `${formatarPercentual(indicador.variacao)} — ${
                      indicador.direcao === "baixa"
                        ? "vazão baixa"
                        : indicador.direcao === "alta"
                          ? "vazão alta"
                          : "sem variação"
                    }`;
          const statusIndicador = document.createElement("span");
          statusIndicador.className = indicador.classificaAlerta
            ? `badge-status ${obterClasseStatus(indicador.status)}`
            : "flow-indicator-note";
          statusIndicador.textContent = indicador.classificaAlerta
            ? indicador.status
            : "Informativo";
          item.append(
            nomeIndicador,
            valoresIndicador,
            variacaoIndicador,
            statusIndicador,
          );
          gradeVazao.append(item);
        });
        secaoVazao.append(cabecalhoVazao, descricaoBase, gradeVazao);
        card.append(secaoVazao);
      }
    } else {
      card.append(topo);
      const semRegistro = document.createElement("p");
      semRegistro.className = "operational-detail-missing";
      semRegistro.textContent = `Sem registro em ${dataSelecionada}. Último registro disponível: ${dataAnterior ?? "não disponível"}.`;
      card.append(semRegistro);
    }

    if (registro.ausentes.length) {
      const ausencias = document.createElement("p");
      ausencias.className = "operational-detail-missing";
      ausencias.textContent = `Ausentes: ${registro.ausentes
        .map(({ tipo, horario }) => `${tipo} às ${horario}`)
        .join(", ")}`;
      card.append(ausencias);
    } else if (!registro.atual) {
      const aviso = document.createElement("p");
      aviso.className = "operational-detail-missing";
      aviso.textContent =
        "Não foi possível verificar leituras: o registro diário está ausente.";
      card.append(aviso);
    }

    if (registro.atual) {
      const abrir = document.createElement("button");
      abrir.type = "button";
      abrir.className = "operational-detail-open";
      abrir.dataset.detailReservoir = registro.chave;
      abrir.textContent = "Abrir reservatório";
      card.append(abrir);
    }
    lista.append(card);
  });

  container.append(heading, descricao, lista);
}

function criarCelulaDetalhe(rotulo, valor) {
  const celula = document.createElement("div");
  celula.className = "operational-detail-metric";
  const label = document.createElement("span");
  label.textContent = rotulo;
  const valorElemento = document.createElement("strong");
  valorElemento.textContent = valor;
  celula.append(label, valorElemento);
  return celula;
}

function criarLinhaEngenharia({
  chave,
  data,
  reservatorio,
  horarios,
  niveis,
  vazoes,
  qualidade,
  temRegistro,
  quantidadeSlots,
}) {
  const linha = document.createElement("tr");
  const idDetalhes =
    `engenharia-detalhes-${chave.replace(/[^a-zA-Z0-9_-]/g, "-")}-` +
    data.replace(/\D/g, "");
  const celulaId = document.createElement("td");
  const botaoId = document.createElement("button");
  botaoId.className = "engineering-id-button";
  botaoId.type = "button";
  botaoId.textContent = chave;
  botaoId.setAttribute("aria-expanded", "false");
  botaoId.setAttribute("aria-controls", idDetalhes);
  celulaId.append(botaoId);
  linha.append(celulaId);
  appendCelulaEngenharia(linha, data);

  appendCelulaExtremoEngenharia(linha, niveis.minimo, niveis.horarioMinimo);
  appendCelulaEngenharia(linha, formatarMetrica(niveis.media, ""));
  appendCelulaExtremoEngenharia(linha, niveis.maximo, niveis.horarioMaximo);
  appendCelulaExtremoEngenharia(linha, vazoes.minimo, vazoes.horarioMinimo);
  appendCelulaEngenharia(linha, formatarMetrica(vazoes.media, ""));
  appendCelulaExtremoEngenharia(linha, vazoes.maximo, vazoes.horarioMaximo);
  appendCelulaEngenharia(linha, criarSinalizacoesEngenharia(qualidade));

  const linhaDetalhes = document.createElement("tr");
  linhaDetalhes.className = "engineering-details-row";
  linhaDetalhes.hidden = true;
  linhaDetalhes.id = idDetalhes;
  const celulaDetalhes = document.createElement("td");
  celulaDetalhes.colSpan = 9;
  const conteudoDetalhes = document.createElement("div");
  conteudoDetalhes.className = "engineering-details-content";
  const identificacao = document.createElement("strong");
  identificacao.textContent = reservatorio
    ? `${reservatorio.nome} (${reservatorio.grupo})`
    : `${chave} — Reservatório sem registro nesta data`;
  const cobertura = document.createElement("span");
  cobertura.textContent =
    `Leituras numéricas — nível: ${niveis.quantidade} de ${quantidadeSlots}; ` +
    `vazão: ${vazoes.quantidade} de ${quantidadeSlots}`;
  conteudoDetalhes.append(identificacao, cobertura);

  celulaDetalhes.append(conteudoDetalhes);
  linhaDetalhes.append(celulaDetalhes);
  let leiturasCarregadas = false;
  botaoId.addEventListener("click", () => {
    const expandido = botaoId.getAttribute("aria-expanded") === "true";
    if (!expandido && !leiturasCarregadas) {
      if (temRegistro) {
        const tabelaLeituras = criarTabelaLeiturasHorarias(
          horarios,
          reservatorio.leituras,
          quantidadeSlots,
        );
        tabelaLeituras.classList.add("engineering-expanded-readings");
        conteudoDetalhes.append(tabelaLeituras);
      } else {
        const aviso = document.createElement("p");
        aviso.className = "engineering-no-data";
        aviso.textContent = "Não há dados deste reservatório nesta data.";
        conteudoDetalhes.append(aviso);
      }
      leiturasCarregadas = true;
    }
    botaoId.setAttribute("aria-expanded", String(!expandido));
    linhaDetalhes.hidden = expandido;
  });

  const linhas = document.createDocumentFragment();
  linhas.append(linha, linhaDetalhes);
  return linhas;
}

function appendCelulaExtremoEngenharia(linha, valor, horario) {
  const celula = document.createElement("td");
  const extremo = document.createElement("div");
  extremo.className = "engineering-extreme";
  const valorElemento = document.createElement("strong");
  valorElemento.textContent = valor === null ? "Sem dados" : valor.toFixed(1);
  const horarioElemento = document.createElement("span");
  horarioElemento.textContent = horario ?? "—";
  extremo.append(valorElemento, horarioElemento);
  celula.append(extremo);
  linha.append(celula);
}

function criarTabelaLeiturasHorarias(horarios, leituras, quantidadeSlots) {
  const tabela = document.createElement("table");
  tabela.className = "hourly-readings-table";
  const cabecalho = document.createElement("thead");
  const linhaCabecalho = document.createElement("tr");
  ["Horário", "Nível (%)", "Vazão (L/s)", "Sinalizações"].forEach((rotulo) => {
    const celula = document.createElement("th");
    celula.scope = "col";
    celula.textContent = rotulo;
    linhaCabecalho.append(celula);
  });
  cabecalho.append(linhaCabecalho);
  tabela.append(cabecalho);

  const corpo = document.createElement("tbody");
  for (let indice = 0; indice < quantidadeSlots; indice += 1) {
    const linha = document.createElement("tr");
    const nivel = leituras.nivel?.[indice];
    const vazao = leituras.vazao?.[indice];
    appendCelulaEngenharia(linha, horarios[indice] ?? `Leitura ${indice + 1}`);
    appendCelulaEngenharia(linha, formatarLeituraOriginal(nivel));
    appendCelulaEngenharia(linha, formatarLeituraOriginal(vazao));
    appendCelulaEngenharia(
      linha,
      criarSinalizacoesEngenharia(
        avaliarQualidadeLeituras([nivel], [vazao], 1),
        true,
      ),
    );
    corpo.append(linha);
  }
  tabela.append(corpo);
  return tabela;
}

function criarSinalizacoesEngenharia(qualidade, compacta = false) {
  const sinalizacoes = [];
  if (qualidade.nivelAcimaDe100) {
    sinalizacoes.push(`Nível >100%: ${qualidade.nivelAcimaDe100}`);
  }
  if (qualidade.nivelAcimaDe110) {
    sinalizacoes.push(`Nível >110%: ${qualidade.nivelAcimaDe110}`);
  }
  if (qualidade.nivelNegativo) {
    sinalizacoes.push(`Nível negativo: ${qualidade.nivelNegativo}`);
  }
  if (qualidade.vazaoNegativa) {
    sinalizacoes.push(`Vazão negativa: ${qualidade.vazaoNegativa}`);
  }
  if (!compacta && qualidade.nivelAusente) {
    sinalizacoes.push(`Nível ausente: ${qualidade.nivelAusente}`);
  }
  if (!compacta && qualidade.vazaoAusente) {
    sinalizacoes.push(`Vazão ausente: ${qualidade.vazaoAusente}`);
  }

  if (!sinalizacoes.length) {
    const semSinalizacao = document.createElement("span");
    semSinalizacao.className = "engineering-ok";
    semSinalizacao.textContent = "—";
    return semSinalizacao;
  }

  const lista = document.createElement("ul");
  lista.className = "engineering-flags";
  sinalizacoes.forEach((sinalizacao) => {
    const item = document.createElement("li");
    item.textContent = sinalizacao;
    lista.append(item);
  });
  return lista;
}

function appendCelulaEngenharia(linha, conteudo) {
  const celula = document.createElement("td");
  if (conteudo instanceof Node) {
    celula.append(conteudo);
  } else {
    celula.textContent = conteudo;
  }
  linha.append(celula);
}

function renderizarAnaliseGraficoReservatorio(
  painel,
  reservatorio,
  chave,
  data,
  horarios,
) {
  painel.replaceChildren();
  const niveis = resumirLeiturasEstruturadas(
    filtrarLeiturasNivelValidas(reservatorio.leituras?.nivel),
    horarios,
  );
  const vazoes = resumirLeiturasEstruturadas(
    filtrarLeiturasVazaoValidas(reservatorio.leituras?.vazao),
    horarios,
  );
  const estatisticasHistoricas = graficoAnaliseComHistorico
    ? obterEstatisticasHistoricasPorHorario(
        window.bancoDeDados,
        chave,
        horarios,
      )
    : null;

  const cabecalho = document.createElement("div");
  cabecalho.className = "reservoir-analysis-heading";
  const tituloBloco = document.createElement("div");
  const eyebrow = document.createElement("p");
  eyebrow.className = "analysis-eyebrow";
  eyebrow.textContent = "ANÁLISE OPERACIONAL";
  const titulo = document.createElement("h2");
  titulo.id = "reservoir-analysis-title";
  titulo.textContent = `Análise do reservatório ${obterIdentificacaoReservatorio(chave)}`;
  const contexto = document.createElement("p");
  contexto.className = "analysis-description";
  contexto.textContent =
    `${data} · ${horarios.length} horário(s) previstos · ` +
    `Nível médio: ${formatarMetrica(niveis.media, "%")} · ` +
    `Vazão média: ${formatarMetrica(vazoes.media, " L/s")}`;
  tituloBloco.append(eyebrow, titulo, contexto);

  const voltar = document.createElement("button");
  voltar.type = "button";
  voltar.className = "reservoir-analysis-back";
  voltar.dataset.closeReservoirAnalysis = "";
  voltar.textContent = "Voltar ao reservatório";
  cabecalho.append(tituloBloco, voltar);

  const graficoCard = document.createElement("section");
  graficoCard.className = "reservoir-analysis-card";
  const graficoCabecalho = document.createElement("div");
  graficoCabecalho.className = "reservoir-analysis-chart-heading";
  const graficoTitulo = document.createElement("h3");
  graficoTitulo.textContent = "Leituras da madrugada";
  const modosGrafico = document.createElement("div");
  modosGrafico.className = "reservoir-analysis-chart-modes";
  modosGrafico.setAttribute("role", "group");
  modosGrafico.setAttribute("aria-label", "Modo de visualização do gráfico");
  [
    { modo: "readings", rotulo: "Leituras" },
    { modo: "averages", rotulo: "Com médias" },
  ].forEach(({ modo, rotulo }) => {
    const botao = document.createElement("button");
    botao.type = "button";
    botao.className = "reservoir-analysis-mode";
    botao.dataset.analysisChartMode = modo;
    botao.textContent = rotulo;
    botao.setAttribute(
      "aria-pressed",
      String(graficoAnaliseComMedias === (modo === "averages")),
    );
    modosGrafico.append(botao);
  });
  const controlesGrafico = document.createElement("div");
  controlesGrafico.className = "reservoir-analysis-chart-controls";
  controlesGrafico.append(modosGrafico);
  const rotuloHistorico = document.createElement("label");
  rotuloHistorico.className = "reservoir-analysis-history-toggle";
  const controleHistorico = document.createElement("input");
  controleHistorico.type = "checkbox";
  controleHistorico.dataset.analysisHistory = "";
  controleHistorico.checked = graficoAnaliseComHistorico;
  const textoHistorico = document.createElement("span");
  textoHistorico.textContent = "Histórico (mín., média, máx.)";
  rotuloHistorico.append(controleHistorico, textoHistorico);
  const seletorSeries = document.createElement("details");
  seletorSeries.className = "reservoir-analysis-series-selector";
  const tituloSeries = document.createElement("summary");
  tituloSeries.textContent = "Séries visíveis";
  const listaSeries = document.createElement("div");
  listaSeries.className = "reservoir-analysis-series-list";
  listaSeries.dataset.analysisSeriesList = "";
  seletorSeries.append(tituloSeries, listaSeries);
  controlesGrafico.append(rotuloHistorico, seletorSeries);
  graficoCabecalho.append(graficoTitulo, controlesGrafico);
  const grafico = document.createElement("div");
  grafico.className = "reservoir-analysis-chart";
  const canvas = document.createElement("canvas");
  const sufixoGrafico = graficoAnaliseComMedias ? "-medias" : "";
  canvas.id = `chart-${reservatorio.nome.replace(/[^a-zA-Z0-9]/g, "_")}${sufixoGrafico}`;
  canvas.setAttribute("role", "img");
  canvas.setAttribute(
    "aria-label",
    `Leituras horárias de nível e vazão de ${obterIdentificacaoReservatorio(chave)}`,
  );
  grafico.append(canvas);
  graficoCard.append(graficoCabecalho, grafico);

  const matrizCard = document.createElement("section");
  matrizCard.className = "reservoir-analysis-card";
  const matrizTitulo = document.createElement("h3");
  matrizTitulo.textContent = "Matriz analítica por horário";
  const observacao = document.createElement("p");
  observacao.className = "reservoir-analysis-note";
  observacao.textContent =
    "As diferenças são comparadas às médias válidas desta madrugada. " +
    "Os alertas de vazão são avaliados pelos extremos diários frente ao histórico.";
  if (estatisticasHistoricas) {
    observacao.textContent +=
      " As estatísticas históricas por horário usam todas as datas disponíveis.";
  }
  const tabelaWrap = document.createElement("div");
  tabelaWrap.className = "reservoir-analysis-table-wrap";
  const tabela = document.createElement("table");
  tabela.className = "reservoir-analysis-table";
  const cabecalhoTabela = document.createElement("thead");
  const linhaCabecalho = document.createElement("tr");
  const colunasTabela = [
    "Horário",
    "Nível",
    "Dif. nível",
    "Status nível",
    ...(estatisticasHistoricas
      ? ["Nível hist. mín.", "Nível hist. média", "Nível hist. máx."]
      : []),
    "Vazão",
    "Dif. vazão",
    "Qualidade vazão",
    ...(estatisticasHistoricas
      ? ["Vazão hist. mín.", "Vazão hist. média", "Vazão hist. máx."]
      : []),
  ];
  colunasTabela.forEach((rotulo) => {
    const celula = document.createElement("th");
    celula.scope = "col";
    celula.textContent = rotulo;
    linhaCabecalho.append(celula);
  });
  cabecalhoTabela.append(linhaCabecalho);
  const corpoTabela = document.createElement("tbody");
  const leiturasNivel = reservatorio.leituras?.nivel ?? [];
  const leiturasVazao = reservatorio.leituras?.vazao ?? [];
  const quantidadeLinhas = Math.max(
    horarios.length,
    leiturasNivel.length,
    leiturasVazao.length,
  );

  for (let indice = 0; indice < quantidadeLinhas; indice += 1) {
    const linha = document.createElement("tr");
    const leituraNivel = obterLeituraAnalitica(leiturasNivel[indice]);
    const leituraVazao = obterLeituraAnalitica(leiturasVazao[indice]);
    const statusNivel =
      leituraNivel.valor === null
        ? leituraNivel.estado
        : leituraNivel.valor < 0 || leituraNivel.valor > 110
          ? "Inválido"
          : leituraNivel.valor < LIMITE_CRITICO_NIVEL_PERCENTUAL
            ? "Crítico"
            : leituraNivel.valor < LIMITE_ATENCAO_NIVEL_PERCENTUAL
              ? "Atenção"
              : "Normal";
    const statusVazao =
      leituraVazao.valor === null
        ? leituraVazao.estado
        : leituraVazao.valor < 0
          ? "Inválida"
          : "Válida";
    if (statusNivel === "Crítico") linha.className = "is-critical";
    else if (statusNivel === "Atenção") linha.className = "is-attention";
    else if (statusNivel === "Inválido" || statusVazao === "Inválida") {
      linha.className = "has-invalid-reading";
    }

    const diferencaNivel =
      leituraNivel.valor === null ||
      leituraNivel.valor < 0 ||
      leituraNivel.valor > 110 ||
      niveis.media === null
        ? "—"
        : formatarDiferencaNivel(leituraNivel.valor - niveis.media);
    const variacaoVazao =
      leituraVazao.valor === null ||
      leituraVazao.valor < 0 ||
      vazoes.media === null
        ? "—"
        : formatarVariacaoAnalitica(
            calcularVariacaoPercentual(leituraVazao.valor, vazoes.media),
          );

    const valoresLinha = [
      horarios[indice] ?? `Leitura ${indice + 1}`,
      formatarLeituraAnalitica(leituraNivel.valor, "%"),
      diferencaNivel,
      statusNivel,
      ...(estatisticasHistoricas
        ? [
            formatarLeituraAnalitica(
              estatisticasHistoricas.nivel.minimo[indice] ?? null,
              "%",
            ),
            formatarLeituraAnalitica(
              estatisticasHistoricas.nivel.media[indice] ?? null,
              "%",
            ),
            formatarLeituraAnalitica(
              estatisticasHistoricas.nivel.maximo[indice] ?? null,
              "%",
            ),
          ]
        : []),
      formatarLeituraAnalitica(leituraVazao.valor, " L/s"),
      variacaoVazao,
      statusVazao,
      ...(estatisticasHistoricas
        ? [
            formatarLeituraAnalitica(
              estatisticasHistoricas.vazao.minimo[indice] ?? null,
              " L/s",
            ),
            formatarLeituraAnalitica(
              estatisticasHistoricas.vazao.media[indice] ?? null,
              " L/s",
            ),
            formatarLeituraAnalitica(
              estatisticasHistoricas.vazao.maximo[indice] ?? null,
              " L/s",
            ),
          ]
        : []),
    ];
    valoresLinha.forEach((valor) => {
      const celula = document.createElement("td");
      celula.textContent = valor;
      linha.append(celula);
    });
    corpoTabela.append(linha);
  }

  tabela.append(cabecalhoTabela, corpoTabela);
  tabelaWrap.append(tabela);
  matrizCard.append(matrizTitulo, observacao, tabelaWrap);
  painel.append(cabecalho, graficoCard, matrizCard);
  renderizarGrafico(
    reservatorio.nome,
    horarios,
    reservatorio.leituras,
    graficoAnaliseComMedias,
    estatisticasHistoricas,
    data,
  );
}

function formatarLeituraOriginal(valor) {
  if (valor === null || valor === undefined || valor === "") return "—";
  const numero = Number(valor);
  return Number.isFinite(numero) ? numero.toFixed(1) : String(valor);
}

function obterLeituraAnalitica(valor) {
  if (valor === null || valor === undefined || valor === "") {
    return { valor: null, estado: "Ausente" };
  }
  const numero = Number(valor);
  return Number.isFinite(numero)
    ? { valor: numero, estado: "Inválido" }
    : { valor: null, estado: "Inválido" };
}

function formatarLeituraAnalitica(valor, unidade) {
  if (valor === null) return "—";
  return `${new Intl.NumberFormat("pt-BR", {
    maximumFractionDigits: 1,
    minimumFractionDigits: 1,
  }).format(valor)}${unidade}`;
}

function formatarDiferencaNivel(diferenca) {
  const sinal = diferenca > 0 ? "+" : "";
  return `${sinal}${new Intl.NumberFormat("pt-BR", {
    maximumFractionDigits: 1,
    minimumFractionDigits: 1,
  }).format(diferenca)}%`;
}

function formatarVariacaoAnalitica(variacao) {
  return variacao === null ? "—" : formatarPercentual(variacao);
}

function obterClasseStatus(status) {
  if (status === "Atenção") return "status-atencao";
  if (status === "Crítico") return "status-critico";
  if (status === "Sem Dados" || status === "Inconsistente") return "status-sem-dados";
  if (status === "Sem comparação") return "status-sem-comparacao";
  if (status === "Manutenção") return "status-normal";
  return "status-normal";
}

function formatarPercentual(valor) {
  const sinal = valor > 0 ? "+" : "";
  return `${sinal}${new Intl.NumberFormat("pt-BR", {
    maximumFractionDigits: 1,
    minimumFractionDigits: 1,
  }).format(valor)}%`;
}

function formatarValorVazao(valor) {
  return valor === null
    ? "N/A"
    : new Intl.NumberFormat("pt-BR", {
        maximumFractionDigits: 1,
        minimumFractionDigits: 1,
      }).format(valor);
}

function formatarMetrica(valor, unidade) {
  return valor === null ? "Sem dados" : `${valor.toFixed(1)}${unidade}`;
}

function formatarVariacaoNivel(comparacao) {
  if (comparacao.quantidade < 2) {
    return `sem base suficiente (${comparacao.quantidade} dia(s) válido(s))`;
  }
  if (comparacao.variacao === null) {
    return "sem comparação disponível";
  }
  return formatarPercentual(comparacao.variacao);
}

function obterIdentificacaoReservatorio(chave) {
  return chave.match(/\b(?:R\d{1,3}(?:-[A-Z])?|ES\d{2})\b/i)?.[0] ?? chave;
}

function renderizarBoletimOperacional({
  dataSelecionada,
  dataAnterior,
  filtroSelecionado,
  reservatorios,
  reservatoriosDiaAnterior,
  horarios,
  banco,
  baseComparacao,
  escopoOperacional,
}) {
  const descricao = document.getElementById("operational-brief-description");
  const resumo = document.getElementById("operational-summary");
  const detalhes = document.getElementById("operational-details");
  const qualidadeDados = document.getElementById("operational-data-quality");
  const textoComparacao = [];
  if (escopoOperacional !== "vazao") {
    textoComparacao.push(
      `Nível comparado com a média diária de ${obterRotuloBaseComparacao(baseComparacao)}; atenção abaixo de ${LIMITE_ATENCAO_NIVEL_PERCENTUAL}%, crítico abaixo de ${LIMITE_CRITICO_NIVEL_PERCENTUAL}%.`,
    );
  }
  if (escopoOperacional !== "nivel") {
    textoComparacao.push(
      `Vazão mínima/máxima comparada com ${obterRotuloBaseComparacao(baseComparacao)}. Quedas ou aumentos de 20% geram atenção; acima de 35% são críticos.`,
    );
  }
  descricao.textContent = `Dados de ${dataSelecionada}. ${textoComparacao.join(" ")}`;

  const chavesAuditoria = new Set([
    ...Object.keys(reservatorios),
    ...Object.keys(reservatoriosDiaAnterior),
  ]);
  const chavesFiltradas = Array.from(chavesAuditoria).filter((chave) => {
    const atual = reservatorios[chave];
    const anterior = reservatoriosDiaAnterior[chave];
    if (filtroSelecionado.startsWith("grupo:")) {
      const grupo = filtroSelecionado.slice("grupo:".length);
      return (atual ?? anterior)?.grupo === grupo;
    }
    if (filtroSelecionado.startsWith("reservatorio:")) {
      return chave === filtroSelecionado.slice("reservatorio:".length);
    }
    return true;
  });

  const contagens = {
    normal: [],
    atencao: [],
    critico: [],
    incompletos: [],
    semRegistro: 0,
    leiturasAusentes: 0,
    leiturasEsperadas: 0,
  };
  const alertasPreditivos = [];
  const quantidadeSlots = horarios.length;

  chavesFiltradas.forEach((chave) => {
    const reservatorio = reservatorios[chave];
    const predicao = reservatorio ? calcularAutonomiaEProjecao(reservatorio, chave) : null;
    if (predicao && predicao.statusPreditivo !== "Normal") {
      alertasPreditivos.push({ chave, nome: reservatorio.nome || chave, ...predicao });
    }

    const leituras = reservatorio?.leituras;
    const niveis = resumirLeiturasEstruturadas(leituras?.nivel, horarios);
    const vazoes = resumirLeiturasEstruturadas(leituras?.vazao, horarios);
    const esperadasPorVariavel = Math.max(
      quantidadeSlots,
      leituras?.nivel?.length ?? 0,
      leituras?.vazao?.length ?? 0,
    );
    const nivelAtivo = escopoOperacional !== "vazao";
    const vazaoAtiva = escopoOperacional !== "nivel";
    const nivelEsperadoHistoricamente = temLeiturasHistoricasHabituais(
      banco,
      chave,
      "nivel",
      dataSelecionada,
    );
    const vazaoEsperadaHistoricamente = temLeiturasHistoricasHabituais(
      banco,
      chave,
      "vazao",
      dataSelecionada,
    );
    const nivelEsperado = nivelAtivo && nivelEsperadoHistoricamente;
    const vazaoEsperada = vazaoAtiva && vazaoEsperadaHistoricamente;
    const ausentesNivel = obterLeiturasAusentes(
      { nivel: leituras?.nivel },
      esperadasPorVariavel,
      horarios,
      ["nivel"],
    );
    const ausentesVazao = obterLeiturasAusentes(
      { vazao: leituras?.vazao },
      esperadasPorVariavel,
      horarios,
      ["vazao"],
    );
    const ausentesSelecionadas = [
      ...(nivelEsperado ? ausentesNivel : []),
      ...(vazaoEsperada ? ausentesVazao : []),
    ];
    const esperadas =
      esperadasPorVariavel * (Number(nivelEsperado) + Number(vazaoEsperada));
    const validas =
      (nivelEsperado ? niveis.quantidade : 0) +
      (vazaoEsperada ? vazoes.quantidade : 0);

    contagens.leiturasEsperadas += esperadas;
    contagens.leiturasAusentes += esperadas - validas;
    const comparacaoNivel = reservatorio
      ? obterComparacaoNivel(
          banco,
          chave,
          dataSelecionada,
          baseComparacao,
          horarios,
          obterUltimaLeituraNivel(reservatorio.leituras?.nivel),
        )
      : null;
    const registro = {
      chave,
      reservatorio: reservatorio ?? reservatoriosDiaAnterior[chave],
      atual: reservatorio,
      anterior: reservatoriosDiaAnterior[chave],
      ausentes: ausentesSelecionadas,
      statusNivel: reservatorio
        ? avaliarStatusNivel(reservatorio.leituras?.nivel, chave, comparacaoNivel?.referencia)
        : null,
      comparacaoNivel,
      alertaVazao: reservatorio
        ? avaliarAlertaVazao(
            reservatorio.leituras?.vazao,
            obterReferenciaVazao(
              banco,
              chave,
              dataSelecionada,
              baseComparacao,
              horarios,
            ),
            horarios,
            chave,
          )
        : null,
    };
    if (!reservatorio) {
      if (!nivelEsperado && !vazaoEsperada) return;
      contagens.semRegistro += 1;
      contagens.incompletos.push(registro);
      return;
    }

    const statusNivelAtivo =
      nivelAtivo &&
      ["Normal", "Atenção", "Crítico"].includes(registro.statusNivel)
        ? registro.statusNivel
        : null;
    const statusVazaoAtivo =
      vazaoEsperada &&
      ["Normal", "Atenção", "Crítico"].includes(registro.alertaVazao?.status)
        ? registro.alertaVazao.status
        : null;
    const vazaoSemComparacao =
      vazaoEsperada && registro.alertaVazao?.status === "Sem comparação";
    const nivelSemDados = nivelAtivo && (registro.statusNivel === "Sem Dados" || registro.statusNivel === "Inconsistente");
    const statusAtivos = [statusNivelAtivo, statusVazaoAtivo].filter(Boolean);
    if (statusAtivos.includes("Crítico")) contagens.critico.push(registro);
    else if (statusAtivos.includes("Atenção")) contagens.atencao.push(registro);
    else if (
      !vazaoSemComparacao &&
      !nivelSemDados &&
      statusAtivos.length > 0 &&
      statusAtivos.every((statusAtivo) => statusAtivo === "Normal")
    ) {
      contagens.normal.push(registro);
    }
    if (ausentesSelecionadas.length > 0 || nivelSemDados) {
      contagens.incompletos.push(registro);
    }
  });

  const categorias = [
    {
      chave: "normal",
      rotulo: "Normais",
      classe: "",
      registros: contagens.normal,
    },
    {
      chave: "critico",
      rotulo: "Críticos",
      classe: "is-critical",
      registros: contagens.critico,
    },
    {
      chave: "atencao",
      rotulo: "Atenção",
      classe: "is-attention",
      registros: contagens.atencao,
    },
    {
      chave: "incompletos",
      rotulo: "Incompletos",
      classe: "is-incomplete",
      registros: contagens.incompletos,
    },
  ];

  const bannerPreditivo = document.getElementById("global-predictive-banner");
  if (bannerPreditivo) {
    bannerPreditivo.style.cursor = "pointer";
    bannerPreditivo.title = "Abrir Autonomia Preditiva";
    bannerPreditivo.onclick = (e) => {
      const btnRes = e.target.closest("button[data-detail-reservoir]");
      if (btnRes) {
        const chaveRes = btnRes.dataset.detailReservoir;
        categoriaBoletimAtiva = null;
        const seletorFiltro = document.getElementById("seletor-filtro");
        if (seletorFiltro) {
          seletorFiltro.value = `reservatorio:${chaveRes}`;
          seletorFiltro.dispatchEvent(new Event("change", { bubbles: true }));
        }
        setTimeout(() => {
          document.querySelector(".card.is-selected")?.scrollIntoView({ behavior: "smooth", block: "center" });
        }, 150);
        return;
      }
      if (alertasPreditivos.length === 1) {
        const alertaUnico = alertasPreditivos[0];
        categoriaBoletimAtiva = alertaUnico.statusPreditivo === "Crítico" ? "critico" : "atencao";
        renderizarDashboard();
        setTimeout(() => {
          document.getElementById("operational-details")?.scrollIntoView({ behavior: "smooth", block: "start" });
        }, 150);
      } else if (alertasPreditivos.length >= 2) {
        abrirModalAlertasPreditivos(alertasPreditivos);
      }
    };

    if (alertasPreditivos.length > 0) {
      bannerPreditivo.hidden = false;
      bannerPreditivo.innerHTML = `
        <div title="Abrir Autonomia Preditiva" style="background: var(--surface-bg); border: 1px solid var(--status-critical-color, #e35d6a); border-radius: 8px; padding: 12px 16px; display: flex; flex-direction: column; gap: 8px;">
          <div style="display: flex; align-items: center; justify-content: space-between; font-weight: 600; color: var(--status-critical-color, #e35d6a);">
            <div style="display: flex; align-items: center; gap: 8px;">
              <span>⏳ Alerta Preditivo de Autonomia (CCO)</span>
              <span style="font-size: 0.8rem; background: rgba(227,93,106,0.15); padding: 2px 8px; border-radius: 12px;">${alertasPreditivos.length} reservatório(s) em risco</span>
            </div>
            <span style="font-size: 1.1rem;" title="Abrir Autonomia Preditiva">📊</span>
          </div>
          <div style="display: flex; flex-wrap: wrap; gap: 8px;">
            ${alertasPreditivos.map(p => `
              <button type="button" data-detail-reservoir="${p.chave}" title="Abrir Autonomia Preditiva" style="background: var(--card-bg); border: 1px solid var(--border-color); padding: 6px 12px; border-radius: 6px; cursor: pointer; display: flex; align-items: center; gap: 6px; text-align: left; font-size: 0.85rem; color: var(--text-color);">
                <strong>${p.nome}</strong>: <span style="color: var(--status-critical-color, #e35d6a);">${p.mensagemPreditiva}</span>
              </button>
            `).join("")}
          </div>
        </div>
      `;
    } else {
      bannerPreditivo.hidden = false;
      bannerPreditivo.innerHTML = `
        <div title="Abrir Autonomia Preditiva" style="background: var(--surface-bg); border: 1px solid var(--border-color); border-radius: 8px; padding: 10px 16px; display: flex; align-items: center; justify-content: space-between; font-size: 0.9rem; color: var(--muted-color);">
          <span title="Abrir Autonomia Preditiva">⏳ <strong>Autonomia Preditiva:</strong> Todos os reservatórios com autonomia segura (> 3h nos limites configurados).</span>
          <span style="font-size: 1.1rem;" title="Abrir Autonomia Preditiva">📊</span>
        </div>
      `;
    }
  }

   resumo.replaceChildren(
    ...categorias.map(({ chave, rotulo, classe, registros }) => {
      const botao = document.createElement("button");
      botao.type = "button";
      botao.className = `operational-summary-card ${classe}`.trim();
      botao.dataset.operationalCategory = chave;
      botao.setAttribute(
        "aria-pressed",
        String(categoriaBoletimAtiva === chave),
      );
      botao.setAttribute(
        "aria-expanded",
        String(categoriaBoletimAtiva === chave),
      );
      botao.setAttribute("aria-controls", "operational-details");

      const label = document.createElement("span");
      label.className = "operational-summary-label";
      label.textContent = rotulo;
      const total = document.createElement("strong");
      total.textContent = String(registros.length);
      
      // === ADICIONE ESTA VERIFICAÇÃO AQUI ===
      if (chave === "critico" && registros.length > 0) {
        botao.classList.add("animar-pulso");
      }
      // ======================================

      botao.append(label, total);
      return botao;
    }),
  );

  renderizarDetalhesBoletim(
    detalhes,
    categorias.find(({ chave }) => chave === categoriaBoletimAtiva) ?? null,
    dataSelecionada,
    horarios,
    escopoOperacional,
    baseComparacao,
  );

  const ausencias = `${contagens.leiturasAusentes} de ${contagens.leiturasEsperadas} leituras selecionadas esperadas ausentes`;
  const registrosAusentes = contagens.semRegistro
    ? ` ${contagens.semRegistro} reservatório(s) sem registro em ${dataSelecionada}.`
    : "";
  qualidadeDados.textContent = `${ausencias}.${registrosAusentes}`;
  qualidadeDados.classList.toggle(
    "has-missing-data",
    contagens.leiturasAusentes > 0 || contagens.semRegistro > 0,
  );
}

function abrirModalAlertasPreditivos(alertas) {
  let modal = document.getElementById("modal-alertas-preditivos");
  if (!modal) {
    modal = document.createElement("div");
    modal.id = "modal-alertas-preditivos";
    modal.style.cssText = "position: fixed; inset: 0; background: rgba(0,0,0,0.6); z-index: 9999; display: flex; align-items: center; justify-content: center; padding: 20px;";
    document.body.appendChild(modal);
  }
  modal.innerHTML = `
    <div style="background: var(--surface-bg, #1e1e1e); border: 1px solid var(--border-color, #333); border-radius: 12px; width: 100%; max-width: 600px; padding: 24px; box-shadow: 0 10px 25px rgba(0,0,0,0.3); display: flex; flex-direction: column; gap: 16px;">
      <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid var(--border-color); padding-bottom: 12px;">
        <h3 style="margin: 0; font-size: 1.2rem; color: var(--text-color); display: flex; align-items: center; gap: 8px;" title="Abrir Autonomia Preditiva">
          <span>⏳</span> Alertas Preditivos de Autonomia (${alertas.length})
        </h3>
        <button type="button" id="fechar-modal-preditivo" style="background: transparent; border: none; font-size: 1.2rem; cursor: pointer; color: var(--text-color);">✕</button>
      </div>
      <div style="display: flex; flex-direction: column; gap: 10px; max-height: 60vh; overflow-y: auto;">
        ${alertas.map(p => `
          <div data-popup-reservoir="${p.chave}" title="Abrir Autonomia Preditiva" style="background: var(--card-bg, #2a2a2a); border: 1px solid var(--border-color); border-radius: 8px; padding: 12px 16px; cursor: pointer; display: flex; flex-direction: column; gap: 4px; transition: background 0.2s;">
            <div style="display: flex; justify-content: space-between; font-weight: 600; color: var(--text-color);">
              <span>${p.nome} (${p.chave})</span>
              <span style="color: var(--status-critical-color, #e35d6a);">${p.statusPreditivo}</span>
            </div>
            <div style="font-size: 0.85rem; color: var(--muted-color);">${p.mensagemPreditiva}</div>
          </div>
        `).join("")}
      </div>
    </div>
  `;
  modal.hidden = false;
  modal.style.display = "flex";

  modal.querySelector("#fechar-modal-preditivo").onclick = () => {
    modal.remove();
  };
  modal.onclick = (e) => {
    if (e.target === modal) modal.remove();
    const item = e.target.closest("[data-popup-reservoir]");
    if (item) {
      const chaveRes = item.dataset.popupReservoir;
      modal.remove();
      const seletorFiltro = document.getElementById("seletor-filtro");
      if (seletorFiltro) {
        seletorFiltro.value = `reservatorio:${chaveRes}`;
        seletorFiltro.dispatchEvent(new Event("change", { bubbles: true }));
      }
      setTimeout(() => {
        const cardSel = document.querySelector(`.card.is-selected`) || document.getElementById("grid-reservatorios");
        if (cardSel) cardSel.scrollIntoView({ behavior: "smooth", block: "center" });
      }, 150);
    }
  };
}

function obterReservatoriosComAlertaOuExcecao(banco, dataSelecionada) {
  const dadosDoDia = banco.historico[dataSelecionada];
  if (!dadosDoDia || !dadosDoDia.reservatorios) return [];

  const horarios = dadosDoDia.horarios || [];
  const quantidadeSlots = horarios.length;
  const baseComparacao = document.getElementById("seletor-base-vazao")?.value || "same-weekday-4";
  const escopoOperacional = document.getElementById("seletor-escopo-operacional")?.value || "ambos";

  const exceccoesMap = new Map();

  Object.entries(dadosDoDia.reservatorios).forEach(([chave, res]) => {
    const nome = res.nome || obterIdentificacaoReservatorio(chave);
    const config = obterConfiguracaoReservatorio(chave);
    if (config.emManutencao) return;

    const predicao = calcularAutonomiaEProjecao(res, chave);
    const leituras = res?.leituras;
    
    const nivelAtual = obterUltimaLeituraNivel(leituras?.nivel);
    const comparacaoNivel = obterComparacaoNivel(
      banco,
      chave,
      dataSelecionada,
      baseComparacao,
      horarios,
      nivelAtual,
    );
    const statusNivel = avaliarStatusNivel(leituras?.nivel, chave, comparacaoNivel?.referencia);

    const referenciaVazao = obterReferenciaVazao(banco, chave, dataSelecionada, baseComparacao, horarios);
    const alertaVazao = avaliarAlertaVazao(leituras?.vazao, referenciaVazao, horarios, chave);
    const statusVazao = alertaVazao.status;
    const vazaoAtual = obterUltimaLeitura(filtrarLeiturasVazaoValidas(leituras?.vazao));
    const variacaoVazao = alertaVazao.indicadores?.[0]?.variacao ?? null;
    const direcaoVazao = alertaVazao.indicadores?.[0]?.direcao ?? "estável";

    const nivelAtivo = escopoOperacional !== "vazao";
    const vazaoAtiva = escopoOperacional !== "nivel";

    const statusNivelAtivo = nivelAtivo && ["Normal", "Atenção", "Crítico"].includes(statusNivel) ? statusNivel : null;
    const statusVazaoAtivo = vazaoAtiva && ["Normal", "Atenção", "Crítico"].includes(statusVazao) ? statusVazao : null;
    
    const nivelEsperado = nivelAtivo && temLeiturasHistoricasHabituais(banco, chave, "nivel", dataSelecionada);
    const vazaoEsperada = vazaoAtiva && temLeiturasHistoricasHabituais(banco, chave, "vazao", dataSelecionada);
    
    const esperadasPorVariavel = Math.max(quantidadeSlots, leituras?.nivel?.length ?? 0, leituras?.vazao?.length ?? 0);
    const ausentesNivel = obterLeiturasAusentes({ nivel: leituras?.nivel }, esperadasPorVariavel, horarios, ["nivel"]);
    const ausentesVazao = obterLeiturasAusentes({ vazao: leituras?.vazao }, esperadasPorVariavel, horarios, ["vazao"]);
    const ausentesSelecionadas = [
      ...(nivelEsperado ? ausentesNivel : []),
      ...(vazaoEsperada ? ausentesVazao : []),
    ];

    const isCritico = statusNivelAtivo === "Crítico" || statusVazaoAtivo === "Crítico" || predicao?.statusPreditivo === "Crítico";
    const isAtencao = statusNivelAtivo === "Atenção" || statusVazaoAtivo === "Atenção" || predicao?.statusPreditivo === "Atenção";
    const isIncompleto = ausentesSelecionadas.length > 0 || statusNivel === "Sem Dados" || statusNivel === "Inconsistente";
    const isPreditivo = predicao && predicao.statusPreditivo !== "Normal";

    if (isCritico || isAtencao || isIncompleto || isPreditivo) {
      let severidade = "Normal";
      let cor = "var(--status-normal-color)";
      let bg = "var(--status-normal-background)";
      if (isCritico) {
        severidade = "Crítico";
        cor = "var(--status-critical-color)";
        bg = "var(--status-critical-background)";
      } else if (isAtencao) {
        severidade = "Atenção";
        cor = "#d7a52b";
        bg = "rgba(215, 165, 43, 0.15)";
      } else if (isPreditivo) {
        severidade = predicao.statusPreditivo;
        cor = predicao.statusPreditivo === "Crítico" ? "var(--status-critical-color)" : "#d7a52b";
        bg = predicao.statusPreditivo === "Crítico" ? "var(--status-critical-background)" : "rgba(215, 165, 43, 0.15)";
      } else if (isIncompleto) {
        severidade = "Inconsistente";
        cor = "#3b82f6";
        bg = "rgba(59, 130, 246, 0.15)";
      }

      const mensagens = [];
      if (statusNivel === "Crítico") {
        const msg = obterMensagemTaxonomia("ALM-NIV-01", { nome, valorAtual: nivelAtual });
        mensagens.push(msg || `Nível crítico em ${nivelAtual}%`);
      } else if (statusNivel === "Atenção") {
        const msg = obterMensagemTaxonomia("ALM-NIV-02", { nome, valorAtual: nivelAtual });
        mensagens.push(msg || `Nível de atenção em ${nivelAtual}%`);
      }
      if (statusNivel === "Inconsistente" || statusNivel === "Sem Dados") {
        const msg = obterMensagemTaxonomia("ALM-DAT-02", { nome, valorAtual: nivelAtual ?? "N/A" });
        mensagens.push(msg || "Leituras de nível inconsistentes ou fora da faixa válida (0-110%)");
      }
      if (statusVazao === "Crítico" || statusVazao === "Atenção") {
        const varAbs = variacaoVazao !== null ? Math.abs(variacaoVazao).toFixed(0) : "";
        const codigoVazao = direcaoVazao === "alta" ? "ALM-VAZ-02" : "ALM-VAZ-01";
        const msg = obterMensagemTaxonomia(codigoVazao, { nome, valorAtual: vazaoAtual, variacao: varAbs });
        mensagens.push(msg || `Vazão atual (${vazaoAtual} L/s) está desviada (${statusVazao})`);
      }
      if (isPreditivo) {
        mensagens.push(predicao.mensagemPreditiva);
      }
      if (isIncompleto && ausentesSelecionadas.length > 0) {
        const msg = obterMensagemTaxonomia("ALM-DAT-01", { nome });
        mensagens.push(msg || `${ausentesSelecionadas.length} leitura(s) ausente(s) por falha de telemetria`);
      }

      exceccoesMap.set(chave, {
        chave,
        res,
        nome,
        severidade,
        cor,
        bg,
        predicao,
        statusNivel,
        statusVazao,
        ausentes: ausentesSelecionadas,
        mensagens,
      });
    }
  });

  return Array.from(exceccoesMap.values());
}

function atualizarBadgeAlarmes() {
  const banco = window.bancoDeDados;
  const seletorData = document.getElementById("seletor-data");
  if (!banco || !banco.historico || !seletorData) return;
  const dataSelecionada = seletorData.value;

  const exceccoes = obterReservatoriosComAlertaOuExcecao(banco, dataSelecionada);
  const totalExceccoes = exceccoes.length;

  const badge = document.getElementById("badge-alarmes-ativos");
  const countTab = document.getElementById("count-tab-exceccoes");
  const tabExceccoes = document.getElementById("tab-exceccoes");
  if (badge) {
    badge.textContent = totalExceccoes;
    badge.style.display = totalExceccoes > 0 ? "inline-block" : "none";
  }
  if (countTab) {
    countTab.textContent = totalExceccoes;
  }
  if (tabExceccoes) {
    tabExceccoes.classList.toggle("animar-pulso-tab", totalExceccoes > 0);
  }
}

function carregarReconhecidosLocalStorage() {
  window.ccoReconhecidos = window.ccoReconhecidos || new Map();
  window.nexoIncidentsLog = window.nexoIncidentsLog || [];
  window.ccoAlarmTriggerTimes = window.ccoAlarmTriggerTimes || new Map();
  window.ccoAckMetadata = window.ccoAckMetadata || new Map();

  try {
    if (!window.ccoReconhecidosCarregado) {
      const salvos = localStorage.getItem("nexo_hidrico_reconhecidos");
      if (salvos) {
        window.ccoReconhecidos = new Map(Object.entries(JSON.parse(salvos)));
      }
      const metaSalvos = localStorage.getItem("nexo_hidrico_ack_metadata");
      if (metaSalvos) {
        window.ccoAckMetadata = new Map(Object.entries(JSON.parse(metaSalvos)));
      }
      const logsSalvos = localStorage.getItem("nexo_hidrico_incidents_log");
      if (logsSalvos) {
        window.nexoIncidentsLog = JSON.parse(logsSalvos);
      }
    }
    const triggerTimesSalvos = localStorage.getItem("nexo_hidrico_trigger_times");
    if (triggerTimesSalvos) {
      const obj = JSON.parse(triggerTimesSalvos);
      window.ccoAlarmTriggerTimes = new Map(Object.entries(obj));
    }
  } catch (error) {
    console.warn("Não foi possível carregar o estado local dos alarmes.", error);
  }
}

function salvarReconhecidosLocalStorage() {
  try {
    if (window.ccoReconhecidos) {
      if (!(window.ccoReconhecidos instanceof Map)) {
        window.ccoReconhecidos = new Map(Object.entries(window.ccoReconhecidos));
      }
      const obj = Object.fromEntries(window.ccoReconhecidos.entries());
      localStorage.setItem("nexo_hidrico_reconhecidos", JSON.stringify(obj));
    }
    if (window.ccoAckMetadata) {
      if (!(window.ccoAckMetadata instanceof Map)) {
        window.ccoAckMetadata = new Map(Object.entries(window.ccoAckMetadata));
      }
      const objMeta = Object.fromEntries(window.ccoAckMetadata.entries());
      localStorage.setItem("nexo_hidrico_ack_metadata", JSON.stringify(objMeta));
    }
    if (window.ccoAlarmTriggerTimes) {
      if (!(window.ccoAlarmTriggerTimes instanceof Map)) {
        window.ccoAlarmTriggerTimes = new Map(Object.entries(window.ccoAlarmTriggerTimes));
      }
      const obj = Object.fromEntries(window.ccoAlarmTriggerTimes.entries());
      localStorage.setItem("nexo_hidrico_trigger_times", JSON.stringify(obj));
    }
    if (window.nexoIncidentsLog) {
      localStorage.setItem("nexo_hidrico_incidents_log", JSON.stringify(window.nexoIncidentsLog));
    }
    if (window.ccoChannel) {
      window.ccoChannel.postMessage({
        type: 'SYNC_RECONHECIDOS',
        reconhecidos: Object.fromEntries(window.ccoReconhecidos.entries()),
        ackMetadata: Object.fromEntries(window.ccoAckMetadata.entries()),
        incidentsLog: window.nexoIncidentsLog
      });
    }
    if (typeof window.sincronizarEstadoAlarmesNoArquivo === 'function') {
      window.sincronizarEstadoAlarmesNoArquivo().catch((error) => {
        console.error("Não foi possível sincronizar o estado dos alarmes no arquivo vinculado.", error);
      });
    }
  } catch (error) {
    console.error("Não foi possível salvar o estado local dos alarmes.", error);
  }
}

function obterMensagemTaxonomia(codigo, dados) {
  const tax = window.taxonomiaAlarmes;
  if (!tax || !tax[codigo] || !tax[codigo].template) return null;
  return tax[codigo].template;
}

function obterDetalhesAck(chave) {
  window.ccoReconhecidos = window.ccoReconhecidos || new Map();
  if (!(window.ccoReconhecidos instanceof Map)) {
    window.ccoReconhecidos = new Map(Object.entries(window.ccoReconhecidos));
  }
  if (!window.ccoReconhecidos.has(chave)) return { reconhecido: false };

  window.ccoAckMetadata = window.ccoAckMetadata || new Map();
  if (!(window.ccoAckMetadata instanceof Map)) {
    window.ccoAckMetadata = new Map(Object.entries(window.ccoAckMetadata));
  }

  const meta = window.ccoAckMetadata.get(chave);
  if (meta && typeof meta === 'object') {
    return {
      reconhecido: true,
      timestamp: meta.timestamp || '',
      operador: meta.operador || 'Operador',
      texto: `✓ (${meta.timestamp || ''} - ${meta.operador || ''})`,
      titulo: `Reconhecido em ${meta.timestamp || '—'} por ${meta.operador || 'Operador'}. Apenas ADMIN pode revogar.`
    };
  }
  return {
    reconhecido: true,
    timestamp: '',
    operador: 'Operador',
    texto: '✓ Reconhecido',
    titulo: 'Reconhecido. Apenas ADMIN pode revogar.'
  };
}

function obterTempoRespostaMs(chave) {
  const dataSelecionada = document.getElementById("seletor-data")?.value;
  return window.AlarmTiming.calcularTempoRespostaMs(
    chave,
    window.ccoAlarmTriggerTimes,
    dataSelecionada
  );
}

function renderizarDashboardExceccoes() {
  const banco = window.bancoDeDados;
  const seletorData = document.getElementById("seletor-data");
  const gridExceccoes = document.getElementById("grid-exceccoes");
  if (!banco || !banco.historico || !seletorData || !gridExceccoes) return;

  window.ccoReconhecidos = window.ccoReconhecidos || new Map();
  window.ccoAlarmStartTimes = window.ccoAlarmStartTimes || new Map();
  carregarReconhecidosLocalStorage();
  const dataSelecionada = seletorData.value;
  const dadosDoDia = banco.historico[dataSelecionada];
  if (!dadosDoDia) return;
  gridExceccoes.innerHTML = "";

  const exceccoes = obterReservatoriosComAlertaOuExcecao(banco, dataSelecionada);
  atualizarBadgeAlarmes();

  // Rastreamento de Timestamp de Acionamento (Persistente e Imutável por Data + Reservatório)
  window.ccoAlarmTriggerTimes = window.ccoAlarmTriggerTimes || new Map();
  let triggerTimesAlterados = false;
  exceccoes.forEach(e => {
    const triggerKey = `${dataSelecionada}_${e.chave}`;
    if (!window.ccoAlarmTriggerTimes.has(triggerKey)) {
      const agora = new Date();
      const dataHoraStr = `${agora.toLocaleDateString('pt-BR')} ${agora.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}`;
      window.ccoAlarmTriggerTimes.set(triggerKey, dataHoraStr);
      triggerTimesAlterados = true;
    }
  });
  if (triggerTimesAlterados) {
    salvarReconhecidosLocalStorage();
  }

  // Auto-reset de reconhecimentos que não correspondem mais a alarmes ativos.
  const chavesAtuais = new Set(exceccoes.map(e => e.chave));
  let reconhecimentosAlterados = false;
  window.ccoReconhecidos.forEach((sevAntiga, chave) => {
    let remover = !chavesAtuais.has(chave);
    if (!remover) {
      const exc = exceccoes.find(e => e.chave === chave);
      const pesoSev = (s) => s === "Crítico" ? 1 : s === "Atenção" ? 2 : 3;
      remover = Boolean(exc && pesoSev(exc.severidade) < pesoSev(sevAntiga));
    }
    if (remover) {
      window.ccoReconhecidos.delete(chave);
      window.ccoAckMetadata.delete(chave);
      reconhecimentosAlterados = true;
      if (window.StorageRepository) {
        window.StorageRepository.removerReconhecido(chave).catch((error) => {
          console.error(`Não foi possível remover o reconhecimento persistido de ${chave}.`, error);
        });
      }
    }
  });
  if (reconhecimentosAlterados) {
    salvarReconhecidosLocalStorage();
  }

  const totalCount = exceccoes.length;
  const criticoCount = exceccoes.filter(e => e.severidade === "Crítico").length;
  const atencaoCount = exceccoes.filter(e => e.severidade === "Atenção").length;
  const inconsistenteCount = exceccoes.filter(e => e.severidade === "Inconsistente").length;

  const elTotais = document.getElementById("count-filtro-totais");
  const elCriticos = document.getElementById("count-filtro-criticos");
  const elAtencao = document.getElementById("count-filtro-atencao");
  const elIncompletos = document.getElementById("count-filtro-incompletos");

  if (elTotais) elTotais.textContent = totalCount;
  if (elCriticos) elCriticos.textContent = criticoCount;
  if (elAtencao) elAtencao.textContent = atencaoCount;
  if (elIncompletos) elIncompletos.textContent = inconsistenteCount;

  if (window.ccoFiltroAtual === undefined) {
    window.ccoFiltroAtual = "TODOS";
  }

  const botoesFiltro = document.querySelectorAll(".cco-filter-btn");
  botoesFiltro.forEach(btn => {
    const filtro = btn.getAttribute("data-filter");
    btn.classList.toggle("is-active", filtro === window.ccoFiltroAtual);
    btn.onclick = () => {
      window.ccoFiltroAtual = filtro;
      renderizarDashboardExceccoes();
    };
  });

  window.ccoMuralModoVisualizacao = window.ccoMuralModoVisualizacao || (window.ccoMuralModoTabela ? "tabela" : "grid");

  const btnViewToggle = document.getElementById("btn-mural-view-toggle");
  if (btnViewToggle && !btnViewToggle.dataset.bound) {
    btnViewToggle.dataset.bound = "true";
    btnViewToggle.addEventListener("click", () => {
      if (window.ccoMuralModoVisualizacao === "grid") {
        window.ccoMuralModoVisualizacao = "tabela";
        window.ccoMuralModoTabela = true;
      } else if (window.ccoMuralModoVisualizacao === "tabela") {
        window.ccoMuralModoVisualizacao = "kanban";
        window.ccoMuralModoTabela = false;
      } else {
        window.ccoMuralModoVisualizacao = "grid";
        window.ccoMuralModoTabela = false;
      }
      renderizarDashboardExceccoes();
    });
  }

  if (btnViewToggle) {
    if (window.ccoMuralModoVisualizacao === "grid") {
      btnViewToggle.textContent = "🗂️";
      btnViewToggle.title = "Modo Atual: Grid de Cards. Clique para alternar para Tabela.";
    } else if (window.ccoMuralModoVisualizacao === "tabela") {
      btnViewToggle.textContent = "📋";
      btnViewToggle.title = "Modo Atual: Tabela Comparativa. Clique para alternar para Kanban.";
    } else {
      btnViewToggle.textContent = "📊";
      btnViewToggle.title = "Modo Atual: Kanban por Prioridade. Clique para alternar para Grid.";
    }
  }

  const btnSortToggle = document.getElementById("btn-mural-sort-toggle");
  window.ccoMuralModoOrdenacao = window.ccoMuralModoOrdenacao || "severidade";

  if (btnSortToggle && !btnSortToggle.dataset.bound) {
    btnSortToggle.dataset.bound = "true";
    btnSortToggle.addEventListener("click", () => {
      window.ccoMuralModoOrdenacao = window.ccoMuralModoOrdenacao === "severidade" ? "horario" : "severidade";
      renderizarDashboardExceccoes();
    });
  }

  if (btnSortToggle) {
    if (window.ccoMuralModoOrdenacao === "horario") {
      btnSortToggle.style.background = "var(--accent-color)";
      btnSortToggle.style.color = "#fff";
      btnSortToggle.title = "Ordenando por: Horário de Disparo (Cronológico). Clique para Severidade.";
      btnSortToggle.textContent = "⏱️";
    } else {
      btnSortToggle.style.background = "var(--surface-inset)";
      btnSortToggle.style.color = "var(--text-color)";
      btnSortToggle.title = "Ordenando por: Severidade. Clique para classificar por Horário de Disparo.";
      btnSortToggle.textContent = "⚠️";
    }
  }

  const searchInput = document.getElementById("cco-search-input");
  if (searchInput && !searchInput.dataset.bound) {
    searchInput.dataset.bound = "true";
    searchInput.addEventListener("input", () => {
      renderizarDashboardExceccoes();
    });
  }
  const searchQuery = (searchInput?.value || "").toLowerCase().trim();

  const exceccoesFiltradas = exceccoes.filter(e => {
    const matchFiltro = window.ccoFiltroAtual === "TODOS" || e.severidade === window.ccoFiltroAtual;
    if (!matchFiltro) return false;

    if (searchQuery) {
      const nomeMatch = (e.nome || "").toLowerCase().includes(searchQuery);
      const chaveMatch = (e.chave || "").toLowerCase().includes(searchQuery);
      const msgMatch = (e.mensagens || []).some(m => m.toLowerCase().includes(searchQuery));
      return nomeMatch || chaveMatch || msgMatch;
    }
    return true;
  });

  if (exceccoesFiltradas.length === 0) {
    gridExceccoes.style.display = "grid";
    const buscaSemResultado = Boolean(searchQuery);
    const nenhumAlarmeAtivo = exceccoes.length === 0;
    const tituloVazio = buscaSemResultado
      ? "Nenhum alarme corresponde à busca"
      : nenhumAlarmeAtivo
        ? "Nenhum alarme ativo no momento"
        : `Nenhum alarme ativo na categoria ${window.ccoFiltroAtual}`;
    const mensagemVazia = buscaSemResultado
      ? "Tente outro termo ou limpe a busca para voltar a ver os alarmes."
      : nenhumAlarmeAtivo
        ? "Quando houver alertas, eles serão exibidos aqui."
        : "Selecione outra categoria ou veja todos os alarmes ativos.";
    const acaoVazia = buscaSemResultado
      ? `<button type="button" class="mural-empty-action" data-action="clear-search">Limpar busca</button>`
      : !nenhumAlarmeAtivo && window.ccoFiltroAtual !== "TODOS"
        ? `<button type="button" class="mural-empty-action" data-action="show-all">Ver todos os alarmes</button>`
        : "";
    gridExceccoes.innerHTML = `
      <div class="mural-empty-state">
        <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="var(--status-normal-color)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>
        <h3>${tituloVazio}</h3>
        <p>${mensagemVazia}</p>
        ${acaoVazia}
      </div>`;
    const acaoBotaoVazio = gridExceccoes.querySelector(".mural-empty-action");
    if (acaoBotaoVazio) {
      acaoBotaoVazio.addEventListener("click", () => {
        if (acaoBotaoVazio.dataset.action === "clear-search" && searchInput) {
          searchInput.value = "";
        } else if (acaoBotaoVazio.dataset.action === "show-all") {
          window.ccoFiltroAtual = "TODOS";
        }
        renderizarDashboardExceccoes();
      });
    }
    return;
  }

  exceccoesFiltradas.sort((a, b) => {
    const keyA = `${dataSelecionada}_${a.chave}`;
    const keyB = `${dataSelecionada}_${b.chave}`;
    const tA = window.ccoAlarmTriggerTimes?.get(keyA) || window.ccoAlarmTriggerTimes?.get(a.chave) || "";
    const tB = window.ccoAlarmTriggerTimes?.get(keyB) || window.ccoAlarmTriggerTimes?.get(b.chave) || "";

    if (window.ccoMuralModoOrdenacao === "horario") {
      return tA.localeCompare(tB);
    } else {
      const peso = (sev) => sev === "Crítico" ? 1 : sev === "Atenção" ? 2 : sev === "Inconsistente" ? 3 : 4;
      const diffPeso = peso(a.severidade) - peso(b.severidade);
      if (diffPeso !== 0) return diffPeso;
      return tA.localeCompare(tB);
    }
  });

  if (window.ccoMuralModoVisualizacao === "kanban") {
    gridExceccoes.style.display = "grid";
    gridExceccoes.style.gridTemplateColumns = "repeat(auto-fit, minmax(280px, 1fr))";
    gridExceccoes.style.gap = "20px";
    gridExceccoes.innerHTML = "";

    const colunasDef = [
      { titulo: "🔴 Críticos", severidade: "Crítico", corBorda: "var(--status-critical-color)", bgHeader: "rgba(227,93,106,0.15)" },
      { titulo: "🟡 Atenção", severidade: "Atenção", corBorda: "#d7a52b", bgHeader: "rgba(215,165,43,0.15)" },
      { titulo: "🔵 Inconsistentes / Flapping", severidade: "Inconsistente", corBorda: "var(--accent-color)", bgHeader: "rgba(89,117,217,0.15)" }
    ];

    colunasDef.forEach(col => {
      const itensColuna = exceccoesFiltradas.filter(e => e.severidade === col.severidade);
      const colDiv = document.createElement("div");
      colDiv.style.cssText = `background: var(--surface-bg); border: 1px solid var(--border-color); border-top: 5px solid ${col.corBorda}; border-radius: 12px; padding: 16px; display: flex; flex-direction: column; gap: 12px; min-height: 400px;`;
      
      const headerDiv = document.createElement("div");
      headerDiv.style.cssText = `display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid var(--border-color); padding-bottom: 10px;`;
      headerDiv.innerHTML = `<h4 style="margin: 0; font-size: 0.95rem; color: var(--text-color);">${col.titulo}</h4><span style="background: ${col.bgHeader}; color: var(--text-color); padding: 2px 8px; border-radius: 10px; font-size: 0.75rem; font-weight: 700;">${itensColuna.length}</span>`;
      colDiv.appendChild(headerDiv);

      const cardsContainer = document.createElement("div");
      cardsContainer.style.cssText = `display: flex; flex-direction: column; gap: 12px; flex: 1;`;

      if (itensColuna.length === 0) {
        cardsContainer.innerHTML = `<div style="text-align: center; color: var(--muted-color); font-size: 0.85rem; padding: 30px 0;">Nenhum alarme nesta coluna</div>`;
      } else {
        itensColuna.forEach(({ chave, nome, severidade, cor, bg, mensagens }) => {
          const card = document.createElement("article");
          const ackDet = obterDetalhesAck(chave);
          const reconhecido = ackDet.reconhecido;

          card.className = `mural-alarm-card${reconhecido ? "" : " animar-pulso"}`;
          card.setAttribute("tabindex", "0");
          card.setAttribute("aria-label", `Alarme ${nome}, severidade ${severidade}${reconhecido ? ", reconhecido" : ", não reconhecido"}. Pressione Enter ou Espaço para abrir os detalhes.`);
          card.style.cssText = `background: var(--card-bg); border: 1px solid var(--border-color); border-left: 5px solid ${cor}; border-radius: 8px; padding: 12px; display: flex; flex-direction: column; gap: 8px; cursor: pointer; transition: transform 0.2s, box-shadow 0.2s;`;
          
          card.addEventListener("click", (e) => {
            if (e.target.closest("button")) return;
            window.abrirReservatorioMural(chave);
          });
          card.addEventListener("keydown", (e) => {
            if (e.target === card && (e.key === "Enter" || e.key === " ")) {
              e.preventDefault();
              window.abrirReservatorioMural(chave);
            }
          });

          const triggerKey = `${dataSelecionada}_${chave}`;
          const triggerTime = window.ccoAlarmTriggerTimes?.get(triggerKey) || window.ccoAlarmTriggerTimes?.get(chave) || "—";
          const btnFooterId = `btn-kanban-ack-${chave}`;
          card.innerHTML = `
            <div style="display: flex; justify-content: space-between; align-items: center;">
              <span style="font-weight: 700; font-size: 0.9rem; color: var(--text-color);">${nome}</span>
              <span style="background: ${bg}; color: ${cor}; padding: 2px 6px; border-radius: 4px; font-size: 0.7rem; font-weight: 700; text-transform: uppercase;">${severidade}</span>
            </div>
            <div style="font-size: 0.75rem; color: var(--muted-color);">Acionado em: <strong>${triggerTime}</strong></div>
            <div style="font-size: 0.8rem; color: var(--muted-color); display: flex; flex-direction: column; gap: 2px;">
              ${mensagens.map(m => `<div>• ${m}</div>`).join("")}
            </div>
            <div style="display: flex; justify-content: flex-end; align-items: center; border-top: 1px solid var(--border-color); padding-top: 8px;">
              <button type="button" id="${btnFooterId}" title="${ackDet.titulo}" style="padding: 4px 10px; background: ${reconhecido ? 'rgba(115,191,105,0.2)' : 'var(--accent-color)'}; color: ${reconhecido ? 'var(--status-normal-color)' : '#fff'}; border: none; border-radius: 4px; font-size: 0.7rem; font-weight: 700; cursor: pointer;">
                ${ackDet.reconhecido ? ackDet.texto : '🚨 Reconhecer'}
              </button>
            </div>
          `;

          cardsContainer.appendChild(card);

          const btnAck = card.querySelector(`#${CSS.escape(btnFooterId)}`);
          if (btnAck) {
            btnAck.addEventListener("click", async (e) => {
              e.stopPropagation();
              await toggleAckMural(chave, severidade, nome);
            });
          }
        });
      }

      colDiv.appendChild(cardsContainer);
      gridExceccoes.appendChild(colDiv);
    });
    return;
  }

  if (window.ccoMuralModoVisualizacao === "tabela") {
    gridExceccoes.style.display = "block";
    gridExceccoes.innerHTML = `
      <div class="engineering-table-wrap" style="background: var(--surface-bg); border: 1px solid var(--border-color); border-radius: 12px; overflow-x: auto;">
        <table class="comparison-table" style="width: 100%; border-collapse: collapse; font-size: 0.85rem;">
          <thead>
            <tr style="background: var(--surface-inset); text-align: left;">
              <th style="padding: 12px;">Acionado em</th>
              <th style="padding: 12px;">TAG / Reservatório</th>
              <th style="padding: 12px;">Severidade</th>
              <th style="padding: 12px;">Diagnósticos / Mensagens</th>
              <th style="padding: 12px; text-align: center;">Ação (ACK)</th>
            </tr>
          </thead>
          <tbody>
            ${exceccoesFiltradas.map(({ chave, nome, severidade, cor, bg, mensagens }) => {
              const ackDet = obterDetalhesAck(chave);
              const reconhecido = ackDet.reconhecido;
              const triggerKey = `${dataSelecionada}_${chave}`;
              const triggerTime = window.ccoAlarmTriggerTimes?.get(triggerKey) || window.ccoAlarmTriggerTimes?.get(chave) || "—";
              return `
                <tr class="mural-table-row" data-reservatorio="${chave}" tabindex="0" aria-label="Alarme ${nome}, severidade ${severidade}${reconhecido ? ", reconhecido" : ", não reconhecido"}. Pressione Enter ou Espaço para abrir os detalhes." style="border-top: 1px solid var(--border-color); cursor: pointer;">
                  <td style="padding: 12px; font-weight: 600; color: var(--text-color);">${triggerTime}</td>
                    <td style="padding: 12px; font-weight: 700; color: var(--text-color);">
                      <button type="button" class="mural-row-open" onclick="abrirReservatorioMural('${chave}')" aria-label="Abrir detalhes de ${nome} (${chave})">${nome}</button>
                    </td>
                    <td style="padding: 12px;"><span style="background: ${bg}; color: ${cor}; padding: 3px 8px; border-radius: 6px; font-size: 0.75rem; font-weight: 700; text-transform: uppercase;">${severidade}</span></td>
                    <td style="padding: 12px; color: var(--text-color);">${mensagens.join(" | ")}</td>
                    <td style="padding: 12px; text-align: center;">
                    <button type="button" onclick="toggleAckMural('${chave}', '${severidade}')" title="${ackDet.titulo}" style="padding: 6px 12px; background: ${reconhecido ? 'rgba(115,191,105,0.2)' : 'var(--accent-color)'}; color: ${reconhecido ? 'var(--status-normal-color)' : '#fff'}; border: none; border-radius: 6px; font-size: 0.75rem; font-weight: 700; cursor: pointer;">
                      ${ackDet.reconhecido ? ackDet.texto : '🚨 Reconhecer'}
                    </button>
                  </td>
                </tr>
              `;
            }).join("")}
          </tbody>
        </table>
      </div>
    `;
    gridExceccoes.querySelectorAll(".mural-table-row").forEach((row) => {
      const chave = row.dataset.reservatorio;
      row.addEventListener("click", (event) => {
        if (event.target.closest("button")) return;
        window.abrirReservatorioMural(chave);
      });
      row.addEventListener("keydown", (event) => {
        if (event.target === row && (event.key === "Enter" || event.key === " ")) {
          event.preventDefault();
          window.abrirReservatorioMural(chave);
        }
      });
    });
    return;
  }

  gridExceccoes.style.display = "grid";
  exceccoesFiltradas.forEach(({ chave, nome, severidade, cor, bg, mensagens, predicao }) => {
    const card = document.createElement("article");
    const ackDet = obterDetalhesAck(chave);
    const reconhecido = ackDet.reconhecido;
    const triggerKey = `${dataSelecionada}_${chave}`;
    const triggerTime = window.ccoAlarmTriggerTimes?.get(triggerKey) || window.ccoAlarmTriggerTimes?.get(chave) || "—";

    card.className = `mural-alarm-card${reconhecido ? "" : " animar-pulso"}`;
    card.setAttribute("tabindex", "0");
    card.setAttribute("aria-label", `Alarme ${nome}, severidade ${severidade}${reconhecido ? ", reconhecido" : ", não reconhecido"}. Pressione Enter ou Espaço para abrir os detalhes.`);
    card.style.cssText = `background: var(--card-bg); border: 1px solid var(--border-color); border-left: 6px solid ${cor}; border-radius: 10px; padding: 16px; display: flex; flex-direction: column; gap: 12px; cursor: pointer; transition: transform 0.2s, box-shadow 0.2s;`;
    card.title = "Clique ou pressione Enter para abrir detalhes operacionais";

    card.addEventListener("focus", () => {
      card.style.boxShadow = "0 0 0 2px var(--accent-color)";
    });
    card.addEventListener("blur", () => {
      card.style.boxShadow = "none";
    });

    card.addEventListener("keydown", (e) => {
      if (e.target === card && (e.key === "Enter" || e.key === " ")) {
        e.preventDefault();
        window.abrirReservatorioMural(chave);
      }
    });

    card.addEventListener("mouseenter", () => {
      card.style.transform = "translateY(-2px)";
      card.style.boxShadow = "0 6px 16px rgba(0,0,0,0.15)";
    });
    card.addEventListener("mouseleave", () => {
      card.style.transform = "translateY(0)";
      card.style.boxShadow = "none";
    });

    card.addEventListener("click", (e) => {
      if (e.target.closest("button")) return;
      window.abrirReservatorioMural(chave);
    });

    const btnFooterId = `btn-footer-ack-${chave}`;
    card.innerHTML = `
      <div style="display: flex; justify-content: space-between; align-items: center;">
        <span style="font-weight: 700; font-size: 1rem; color: var(--text-color);">${nome}</span>
        <span style="background: ${bg}; color: ${cor}; padding: 3px 8px; border-radius: 6px; font-size: 0.75rem; font-weight: 700; text-transform: uppercase;">${severidade}</span>
      </div>
      <div style="font-size: 0.8rem; color: var(--muted-color);">Acionado em: <strong>${triggerTime}</strong></div>
      <div style="font-size: 0.85rem; color: var(--muted-color); display: flex; flex-direction: column; gap: 4px;">
        ${mensagens.map(m => `<div>• ${m}</div>`).join("")}
      </div>
      <div style="display: flex; justify-content: flex-end; align-items: center; border-top: 1px solid var(--border-color); padding-top: 12px;">
        <button type="button" id="${btnFooterId}" title="${ackDet.titulo}" style="padding: 6px 14px; background: ${reconhecido ? 'rgba(115,191,105,0.2)' : 'var(--accent-color)'}; color: ${reconhecido ? 'var(--status-normal-color)' : '#fff'}; border: none; border-radius: 6px; font-size: 0.8rem; font-weight: 700; cursor: pointer; box-shadow: 0 2px 6px rgba(0,0,0,0.2);">
          ${ackDet.reconhecido ? ackDet.texto : '🚨 Reconhecer Alarme'}
        </button>
      </div>
    `;

    gridExceccoes.append(card);

    const btnFooterAck = card.querySelector(`#${CSS.escape(btnFooterId)}`);
    if (btnFooterAck) {
      btnFooterAck.addEventListener("click", async (e) => {
        e.stopPropagation();
        await toggleAckMural(chave, severidade, nome);
      });
    }
  });
}

window.abrirReservatorioMural = function(chave) {
  const url = new URL(window.location.href);
  url.searchParams.set("view", "operacional");
  url.searchParams.set("reservatorio", chave);
  url.searchParams.set("origem", "mural");

  const janelaExistente = window.nexoViewWindows?.operacional;
  if (janelaExistente && !janelaExistente.closed) {
    janelaExistente.location.href = url.href;
    janelaExistente.focus();
  } else {
    const janela = window.open(
      url.href,
      "nexoViewWindow_operacional",
      "width=1200,height=800",
    );
    if (janela) {
      window.nexoViewWindows = window.nexoViewWindows || {};
      window.nexoViewWindows.operacional = janela;
    }
  }
};

window.toggleAckMural = async function(chave, severidade, nome) {
  window.ccoReconhecidos = window.ccoReconhecidos || new Map();
  carregarReconhecidosLocalStorage();
  const reconhecido = window.ccoReconhecidos.has(chave);
  window.nexoIncidentsLog = window.nexoIncidentsLog || [];
  const tempoRespostaMs = obterTempoRespostaMs(chave);

  let isAdmin = false;
  let session = {};
  try {
    const sessionStr = localStorage.getItem("nexo_hidrico_session");
    if (sessionStr) {
      session = JSON.parse(sessionStr);
      isAdmin = (session.role === "ADMIN");
    }
  } catch (error) {
    console.warn("Não foi possível ler a sessão antes de atualizar o reconhecimento.", error);
  }

  let metadadosAnteriores;
  if (reconhecido) {
    if (!isAdmin) {
      alert("Acesso Negado (RBAC): Apenas administradores (Perfil ADMIN) podem revogar (des-reconhecer) um alarme já reconhecido.");
      return;
    }

    const confirmar = confirm(`⚠️ Confirmação Administrativa (ADMIN):\n\nDeseja realmente revogar o reconhecimento do alarme do reservatório "${nome || chave}" (${chave})?\n\nEsta ação reativará os alertas visuais e sonoros no CCO.`);
    if (!confirmar) return;

    window.ccoReconhecidos.delete(chave);
    window.ccoAckMetadata = window.ccoAckMetadata || new Map();
    metadadosAnteriores = window.ccoAckMetadata.get(chave);
    window.ccoAckMetadata.delete(chave);
  } else {
    const agora = new Date();
    const dataHoraAck = `${agora.toLocaleDateString('pt-BR')} ${agora.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}`;
    window.ccoReconhecidos.set(chave, severidade || 'Crítico');
    window.ccoAckMetadata = window.ccoAckMetadata || new Map();
    metadadosAnteriores = window.ccoAckMetadata.get(chave);
    window.ccoAckMetadata.set(chave, {
      timestamp: dataHoraAck,
      operador: session.username || 'Operador'
    });
  }

  const incidente = {
    timestamp: new Date().toISOString(),
    chave,
    nome,
    severidade,
    acao: reconhecido ? 'Revogado' : 'Reconhecido',
    tempoRespostaMs
  };
  window.nexoIncidentsLog.push(incidente);

  try {
    if (window.StorageRepository) {
      if (reconhecido) {
        await window.StorageRepository.removerReconhecido(chave);
      } else {
        await window.StorageRepository.salvarReconhecido(
          chave,
          severidade || 'Crítico',
          window.ccoAckMetadata.get(chave)
        );
      }
      await window.StorageRepository.salvarLog(incidente);
    }
  } catch (error) {
    if (reconhecido) {
      window.ccoReconhecidos.set(chave, severidade || 'Crítico');
      if (metadadosAnteriores) window.ccoAckMetadata.set(chave, metadadosAnteriores);
    } else {
      window.ccoReconhecidos.delete(chave);
      window.ccoAckMetadata.delete(chave);
    }
    window.nexoIncidentsLog.pop();
    console.error("Não foi possível persistir a alteração do reconhecimento.", error);
    alert("Não foi possível salvar a alteração do alarme. Verifique o armazenamento do navegador e tente novamente.");
    salvarReconhecidosLocalStorage();
    return;
  }

  if (window.AuthRepository && typeof window.AuthRepository.registrarAuditoria === 'function') {
    try {
      await window.AuthRepository.registrarAuditoria(
        reconhecido ? 'MURAL_REVOGAR_ACK' : 'MURAL_RECONHECER_ACK',
        session.username || (reconhecido ? 'Admin' : 'Operador'),
        `${reconhecido ? 'Revogado' : 'Reconhecido'} alarme em ${nome || chave} (${chave}) - Severidade: ${severidade}`
      );
    } catch (error) {
      console.error("Não foi possível registrar a auditoria da alteração do alarme.", error);
    }
  }
  if (window.ccoChannel) {
    window.ccoChannel.postMessage(
      reconhecido
        ? { type: 'REVOKE_ACK', chave }
        : { type: 'ACK_ALARM', chave, severidade: severidade || 'Crítico', metadados: window.ccoAckMetadata.get(chave) }
    );
  }
  salvarReconhecidosLocalStorage();
  const idRes = obterIdentificacaoReservatorio(chave) || chave;
  if (reconhecido) {
    mostrarToast(`Reconhecimento do alarme ${idRes} revogado.`, "atencao");
  } else {
    mostrarToast(`Alarme ${idRes} reconhecido com sucesso por ${session.username || 'Operador'}.`, "sucesso");
  }
  renderizarDashboardExceccoes();
};

function atualizarHeaderEnxutoInvestigacao(
  painelOperacional,
  filtroSelecionado,
  reservatorios,
  dataSelecionada,
  dadosDoDia,
) {
  let headerEnxuto = document.getElementById("cco-lean-investigation-header");
  const resumoOperacional = painelOperacional.querySelector(".operational-brief");
  const filtroDeReservatorio = filtroSelecionado.startsWith("reservatorio:");
  document.body.classList.toggle(
    "is-cco-investigation-active",
    filtroDeReservatorio && window.veioDeAlertasCCO === true,
  );

  if (filtroDeReservatorio) {
    const chave = filtroSelecionado.slice("reservatorio:".length);
    const res = reservatorios[chave];
    const nomeRes = res ? (res.nome || chave) : chave;

    if (resumoOperacional) resumoOperacional.hidden = true;

    if (!headerEnxuto) {
      headerEnxuto = document.createElement("div");
      headerEnxuto.id = "cco-lean-investigation-header";
      headerEnxuto.className = "cco-lean-investigation-header";
      headerEnxuto.setAttribute("role", "region");
      painelOperacional.insertBefore(headerEnxuto, resumoOperacional);
    }
    headerEnxuto.hidden = false;
    headerEnxuto.innerHTML = `
      <div>
        <span style="font-size: 0.7rem; color: var(--accent-color); font-weight: 700; text-transform: uppercase; letter-spacing: 0.1em;">Inteligência Operacional · Investigação de Alarme</span>
        <h2 id="cco-investigation-title" style="font-size: 1.25rem; color: var(--heading-color); margin-top: 4px;">${nomeRes}</h2>
        <p class="cco-investigation-metadata"><strong>Data investigada:</strong> <span id="cco-investigation-date"></span></p>
        <p class="cco-investigation-metadata"><strong>Última atualização dos dados:</strong> <span id="cco-investigation-updated-at"></span></p>
      </div>
      <div>
        <button type="button" id="btn-voltar-mural-alarmes" class="btn-guardar-config" style="padding: 8px 14px; font-size: 0.82rem; background: var(--accent-color); color: #fff; border: none; cursor: pointer; border-radius: 7px;">
          ← Voltar para Alertas CCO
        </button>
      </div>
    `;

    headerEnxuto.setAttribute("aria-labelledby", "cco-investigation-title");
    headerEnxuto.querySelector("#cco-investigation-date").textContent =
      dataSelecionada || "Não informada";
    const ultimaAtualizacao =
      typeof dadosDoDia?.ultimaAtualizacao === "string"
        ? dadosDoDia.ultimaAtualizacao.trim()
        : "";
    headerEnxuto.querySelector("#cco-investigation-updated-at").textContent =
      ultimaAtualizacao || "Não informada";

    const btnVoltar = headerEnxuto.querySelector("#btn-voltar-mural-alarmes");
    if (btnVoltar) {
      btnVoltar.onclick = () => {
        window.veioDeAlertasCCO = false;
        const tabExceccoes = document.getElementById("tab-exceccoes");
        if (tabExceccoes) tabExceccoes.click();
      };
    }
  } else {
    document.body.classList.remove("is-cco-investigation-active");
    if (headerEnxuto) headerEnxuto.hidden = true;
    if (resumoOperacional) resumoOperacional.hidden = typeof analiseReservatorioAberta !== 'undefined' ? analiseReservatorioAberta : false;
  }
}

function renderizarAvisoCarregamentoDados(problemas) {
  const aviso = document.getElementById("data-load-status");
  if (!aviso) return;

  aviso.hidden = problemas.length === 0;
  aviso.replaceChildren();
  if (problemas.length === 0) return;

  const titulo = document.createElement("strong");
  titulo.textContent = "Atenção: alguns dados podem estar incompletos ou não ter sido persistidos. Verifique os itens abaixo antes de usá-los na operação.";
  aviso.appendChild(titulo);

  const lista = document.createElement("ul");
  problemas.forEach(({ recurso, motivo }) => {
    const item = document.createElement("li");
    item.textContent = `${recurso}: ${motivo}`;
    lista.appendChild(item);
  });
  aviso.appendChild(lista);
}

window.mostrarToast = function(mensagem, tipo = "sucesso") {
  let container = document.getElementById("nexo-toast-container");
  if (!container) {
    container = document.createElement("div");
    container.id = "nexo-toast-container";
    document.body.appendChild(container);
  }

  const toast = document.createElement("div");
  toast.className = `nexo-toast ${tipo}`;
  toast.innerHTML = `
    <span>${mensagem}</span>
    <button type="button" style="background:none;border:none;color:inherit;cursor:pointer;font-weight:bold;font-size:1rem;" aria-label="Fechar notificação">&times;</button>
  `;

  const fechar = () => {
    toast.style.animation = "toastOut 0.2s ease-in forwards";
    setTimeout(() => toast.remove(), 200);
  };

  toast.querySelector("button").onclick = fechar;
  container.appendChild(toast);

  setTimeout(fechar, 4000);
};

window.NexoLoader = {
  mostrar(mensagem = "Processando inteligência operacional...") {
    let overlay = document.getElementById("nexo-video-loader-overlay");
    if (!overlay) {
      overlay = document.createElement("div");
      overlay.id = "nexo-video-loader-overlay";
      overlay.style.cssText = `
        position: fixed; top: 0; left: 0; width: 100vw; height: 100vh;
        background: rgba(3, 7, 18, 0.85); backdrop-filter: blur(8px);
        display: flex; flex-direction: column; justify-content: center; align-items: center;
        z-index: 999999; font-family: inherit; color: #fff;
      `;
      overlay.innerHTML = `
        <div style="
          display: flex; flex-direction: column; align-items: center; gap: 20px; text-align: center;
        ">
          <video autoplay muted loop playsinline style="
            width: 320px; height: 320px; border-radius: 24px; object-fit: cover;
            border: 2px solid rgba(14, 165, 233, 0.6); box-shadow: 0 0 40px rgba(14,165,233,0.4), 0 20px 40px rgba(0,0,0,0.8);
          ">
            <source src="manual-imagens/gemini_generated_video_d4201eb6.mp4" type="video/mp4">
            Seu navegador não suporta vídeos.
          </video>
          <div id="nexo-loader-msg" style="font-size: 1.1rem; font-weight: 600; color: #f8fafc; letter-spacing: 0.03em; text-shadow: 0 2px 10px rgba(0,0,0,0.8);">${mensagem}</div>
        </div>
      `;
      document.body.appendChild(overlay);
    } else {
      const msgEl = overlay.querySelector("#nexo-loader-msg");
      if (msgEl) msgEl.textContent = mensagem;
      overlay.style.display = "flex";
    }
  },
  esconder() {
    const overlay = document.getElementById("nexo-video-loader-overlay");
    if (overlay) {
      overlay.style.display = "none";
    }
  }
};
