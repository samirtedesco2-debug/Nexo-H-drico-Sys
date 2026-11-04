// graficos.js - Funções de renderização de gráficos com Chart.js

function renderizarGraficosEngenharia(datas, series) {
  const metricas = [
    {
      id: "nivel",
      canvas: document.getElementById("grafico-engenharia-nivel"),
      eixo: "Nível (%)",
      minimo: "nivelMin",
      media: "nivelMedia",
      maximo: "nivelMax",
    },
    {
      id: "vazao",
      canvas: document.getElementById("grafico-engenharia-vazao"),
      eixo: "Vazão (L/s)",
      minimo: "vazaoMin",
      media: "vazaoMedia",
      maximo: "vazaoMax",
    },
  ];
  const estilos = [
    { rotulo: "Mínima", dash: [5, 4], pointStyle: "circle" },
    { rotulo: "Média", dash: [], pointStyle: "rectRounded" },
    { rotulo: "Máxima", dash: [2, 3], pointStyle: "triangle" },
  ];

  metricas.forEach((metrica) => {
    const datasets = series.flatMap((serie) =>
      [
        { campo: metrica.minimo, estilo: estilos[0] },
        { campo: metrica.media, estilo: estilos[1] },
        { campo: metrica.maximo, estilo: estilos[2] },
      ].map(({ campo, estilo }) => ({
        label: `${serie.reservatorio.nome} · ${estilo.rotulo}`,
        data: serie.leiturasPorData.map((leituras) => leituras[campo]),
        borderColor: serie.color,
        backgroundColor: serie.color,
        borderWidth: estilo.rotulo === "Média" ? 2.5 : 1.5,
        borderDash: estilo.dash,
        pointStyle: estilo.pointStyle,
        pointRadius: 0,
        pointHoverRadius: 4,
        tension: 0.2,
        spanGaps: false,
      })),
    );
    graficosEngenharia[metrica.id] = new Chart(metrica.canvas, {
      type: "line",
      data: { labels: datas, datasets },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        interaction: { mode: "index", intersect: false },
        plugins: {
          legend: {
            position: "bottom",
            labels: {
              color: obterVariavelCSS("--text-color"),
              usePointStyle: true,
              boxWidth: 8,
              padding: 14,
            },
          },
          tooltip: {
            callbacks: {
              label(context) {
                const valor = context.parsed.y;
                return `${context.dataset.label}: ${valor === null ? "Sem dados" : valor.toFixed(1)}`;
              },
            },
          },
        },
        scales: {
          x: {
            ticks: {
              color: obterVariavelCSS("--muted-color"),
              autoSkip: true,
              maxTicksLimit: 12,
              maxRotation: 0,
            },
            grid: { color: obterVariavelCSS("--border-color") },
          },
          y: {
            beginAtZero: true,
            suggestedMax: metrica.id === "nivel" ? 110 : undefined,
            title: {
              display: true,
              text: metrica.eixo,
              color: obterVariavelCSS("--muted-color"),
            },
            ticks: { color: obterVariavelCSS("--muted-color") },
            grid: { color: obterVariavelCSS("--border-color") },
          },
        },
      },
    });
  });
}

function renderizarGraficoFaixaVazao(canvas, datas, series) {
  const datasets = series.flatMap((serie) => [
    {
      label: `${serie.reservatorio.nome} · Mínima`,
      data: serie.leiturasPorData.map((leituras) => leituras.vazaoMin),
      horariosRegistro: serie.leiturasPorData.map(
        (leituras) => leituras.vazaoMinHorario,
      ),
      borderColor: serie.color,
      borderWidth: 1.5,
      borderDash: [5, 4],
      fill: "+1",
      backgroundColor: `${serie.color}22`,
      pointRadius: 0,
      pointHoverRadius: 4,
      tension: 0.2,
      spanGaps: false,
    },
    {
      label: `${serie.reservatorio.nome} · Máxima`,
      data: serie.leiturasPorData.map((leituras) => leituras.vazaoMax),
      horariosRegistro: serie.leiturasPorData.map(
        (leituras) => leituras.vazaoMaxHorario,
      ),
      borderColor: serie.color,
      backgroundColor: serie.color,
      borderWidth: 2,
      fill: false,
      pointRadius: 0,
      pointHoverRadius: 4,
      tension: 0.2,
      spanGaps: false,
    },
  ]);
  const chart = criarGraficoAnalitico(
    canvas,
    datas,
    datasets,
    "Vazão (L/s)",
    false,
    (context) => {
      const horario = context.dataset.horariosRegistro?.[context.dataIndex];
      return horario ? `Horário registrado: ${horario}` : "";
    },
  );
  graficosAnaliticos.vazaoFaixa = chart;
}

function renderizarGraficoAnalitico(
  canvas,
  datas,
  series,
  metrica,
  rotuloEixo,
  escalaPercentual,
) {
  const datasets = series.map((serie) => ({
    label: serie.reservatorio.nome,
    data: serie.leiturasPorData.map((leituras) => leituras[metrica]),
    borderColor: serie.color,
    backgroundColor: serie.color,
    borderWidth: 2,
    pointRadius: 0,
    pointHoverRadius: 4,
    tension: 0.25,
    spanGaps: false,
  }));
  const chart = criarGraficoAnalitico(
    canvas,
    datas,
    datasets,
    rotuloEixo,
    escalaPercentual,
  );
  graficosAnaliticos[metrica] = chart;
}

function criarGraficoAnalitico(
  canvas,
  datas,
  datasets,
  rotuloEixo,
  escalaPercentual,
  tooltipAfterLabel,
) {
  const chart = new Chart(canvas, {
    type: "line",
    data: {
      labels: datas,
      datasets,
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      interaction: { mode: "index", intersect: false },
      plugins: {
        legend: {
          position: "bottom",
          labels: {
            color: obterVariavelCSS("--text-color"),
            usePointStyle: true,
            boxWidth: 8,
            padding: 16,
          },
        },
        ...(tooltipAfterLabel
          ? { tooltip: { callbacks: { afterLabel: tooltipAfterLabel } } }
          : {}),
      },
      scales: {
        x: {
          ticks: {
            color: obterVariavelCSS("--muted-color"),
            autoSkip: true,
            maxTicksLimit: 12,
            maxRotation: 0,
          },
          grid: { color: obterVariavelCSS("--border-color") },
        },
        y: {
          beginAtZero: !escalaPercentual,
          min: escalaPercentual ? 0 : undefined,
          suggestedMax: escalaPercentual ? 110 : undefined,
          title: {
            display: true,
            text: rotuloEixo,
            color: obterVariavelCSS("--muted-color"),
          },
          ticks: { color: obterVariavelCSS("--muted-color") },
          grid: { color: obterVariavelCSS("--border-color") },
        },
      },
    },
  });
  return chart;
}

function renderizarGrafico(
  nomeReservatorio,
  horarios,
  leituras,
  incluirMedias = false,
  estatisticasHistoricas = null,
  dataSelecionada = null,
) {
  const sufixo = incluirMedias ? "-medias" : "";
  const idCanvas = `chart-${nomeReservatorio.replace(/[^a-zA-Z0-9]/g, "_")}${sufixo}`;
  const ctx = document.getElementById(idCanvas);

  if (!ctx) return;

  const datasets = [
    {
      label: "Nível (%)",
      data: leituras.nivel,
      borderColor: "#33a2e5",
      backgroundColor: "rgba(51, 162, 229, 0.1)",
      borderWidth: 2,
      fill: true,
      yAxisID: "yNivel",
      tension: 0.3,
      pointHitRadius: 8,
    },
    {
      label: "Vazão (L/s)",
      data: leituras.vazao,
      borderColor: "#ff780a",
      backgroundColor: "transparent",
      borderWidth: 2,
      borderDash: [4, 4],
      yAxisID: "yVazao",
      tension: 0.3,
      pointHitRadius: 8,
    },
  ];
  if (incluirMedias) {
    const mediaNivel = calcularMediaValida(
      filtrarLeiturasNivelValidas(leituras.nivel),
    );
    const mediaVazao = calcularMediaValida(
      filtrarLeiturasVazaoValidas(leituras.vazao),
    );
    if (mediaNivel !== null) {
      datasets.push({
        label: `Nível médio (${formatarMetrica(mediaNivel, "%")})`,
        data: horarios.map(() => mediaNivel),
        borderColor: "#8dd7fa",
        backgroundColor: "transparent",
        borderWidth: 2,
        borderDash: [6, 5],
        pointRadius: 0,
        pointHoverRadius: 3,
        pointHitRadius: 8,
        fill: false,
        yAxisID: "yNivel",
        tension: 0,
      });
    }
    if (mediaVazao !== null) {
      datasets.push({
        label: `Vazão média (${formatarMetrica(mediaVazao, " L/s")})`,
        data: horarios.map(() => mediaVazao),
        borderColor: "#ffc28b",
        backgroundColor: "transparent",
        borderWidth: 2,
        borderDash: [6, 5],
        pointRadius: 0,
        pointHoverRadius: 3,
        pointHitRadius: 8,
        fill: false,
        yAxisID: "yVazao",
        tension: 0,
      });
    }
  }
  if (estatisticasHistoricas) {
    const seriesHistoricas = [
      {
        chave: "minimo",
        rotulo: "mín.",
        dash: [2, 4],
        nivelColor: "#7c3aed",
        vazaoColor: "#0f766e",
      },
      {
        chave: "media",
        rotulo: "média",
        dash: [7, 4],
        nivelColor: "#c026d3",
        vazaoColor: "#16a34a",
      },
      {
        chave: "maximo",
        rotulo: "máx.",
        dash: [3, 2],
        nivelColor: "#be185d",
        vazaoColor: "#ca8a04",
      },
    ];
    seriesHistoricas.forEach((serie) => {
      datasets.push(
        {
          label: `Nível hist. ${serie.rotulo}`,
          data: estatisticasHistoricas.nivel[serie.chave],
          borderColor: serie.nivelColor,
          backgroundColor: "transparent",
          borderWidth: 2,
          borderDash: serie.dash,
          pointRadius: 0,
          pointHoverRadius: 3,
          pointHitRadius: 8,
          fill: false,
          yAxisID: "yNivel",
          tension: 0,
        },
        {
          label: `Vazão hist. ${serie.rotulo}`,
          data: estatisticasHistoricas.vazao[serie.chave],
          borderColor: serie.vazaoColor,
          backgroundColor: "transparent",
          borderWidth: 2,
          borderDash: serie.dash,
          pointRadius: 0,
          pointHoverRadius: 3,
          pointHitRadius: 8,
          fill: false,
          yAxisID: "yVazao",
          tension: 0,
        },
      );
    });
  }

  const chart = new Chart(ctx, {
    type: "line",
    data: {
      labels: horarios,
      datasets,
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      interaction: {
        mode: "nearest",
        intersect: true,
      },
      plugins: {
        legend: {
          onClick(event, legendItem, legend) {
            const indiceSerie = legendItem.datasetIndex;
            const chartDaLegenda = legend.chart;
            const visivel = chartDaLegenda.isDatasetVisible(indiceSerie);
            chartDaLegenda.setDatasetVisibility(indiceSerie, !visivel);
            const nomeSerie = chartDaLegenda.data.datasets[indiceSerie]?.label;
            const possuiSeletor = Boolean(
              chartDaLegenda.canvas
                .closest(".reservoir-analysis-card")
                ?.querySelector("[data-analysis-series-list]"),
            );
            if (nomeSerie && possuiSeletor) {
              const chaveSerie = obterChaveSerieAnalise(nomeSerie);
              if (visivel) seriesAnaliseOcultas.add(chaveSerie);
              else seriesAnaliseOcultas.delete(chaveSerie);
            }
            if (possuiSeletor) atualizarSeletorSeries(chartDaLegenda);
            chartDaLegenda.update();
          },
          labels: {
            color: obterVariavelCSS("--text-color"),
            boxWidth: 12,
            font: { size: 11 },
          },
        },
        tooltip: {
          mode: "nearest",
          intersect: true,
          callbacks: {
            title(items) {
              const item = items[0];
              const seriesSelecionada = item?.dataset.label;
              const [dia, mes] = String(dataSelecionada ?? "").split("/");
              if (
                (seriesSelecionada === "Nível (%)" ||
                  seriesSelecionada === "Vazão (L/s)") &&
                dia &&
                mes
              ) {
                return `${item.label} · ${dia}/${mes}`;
              }
              return item?.label ?? "";
            },
          },
          displayColors: false,
          backgroundColor: "rgba(15, 23, 42, 0.88)",
          borderColor: "rgba(148, 163, 184, 0.28)",
          borderWidth: 1,
          cornerRadius: 5,
          padding: 7,
          caretSize: 4,
          titleFont: { size: 10, weight: "600" },
          bodyFont: { size: 10 },
          titleMarginBottom: 3,
          bodySpacing: 2,
        },
      },
      scales: {
        x: {
          ticks: { color: obterVariavelCSS("--muted-color") },
          grid: { color: obterVariavelCSS("--border-color") },
        },
        yNivel: {
          type: "linear",
          position: "left",
          min: 0,
          max: estatisticasHistoricas
            ? Math.max(
                100,
                estatisticasHistoricas.nivel.maximo.reduce(
                  (maior, valor) =>
                    valor === null ? maior : Math.max(maior, valor),
                  100,
                ),
              )
            : 100,
          title: {
            display: true,
            text: "Nível (%)",
            color: obterVariavelCSS("--accent-color"),
          },
          ticks: { color: obterVariavelCSS("--muted-color") },
          grid: { color: obterVariavelCSS("--border-color") },
        },
        yVazao: {
          type: "linear",
          position: "right",
          title: { display: true, text: "Vazão (L/s)", color: "#ff780a" },
          ticks: { color: obterVariavelCSS("--muted-color") },
          grid: { drawOnChartArea: false },
        },
      },
    },
  });

  chart.data.datasets.forEach((dataset, indice) => {
    if (seriesAnaliseOcultas.has(obterChaveSerieAnalise(dataset.label))) {
      chart.setDatasetVisibility(indice, false);
    }
  });
  atualizarSeletorSeries(chart);
  chart.update("none");
  instanciasGraficos[`${nomeReservatorio}${sufixo}`] = chart;
}

function atualizarSeletorSeries(chart) {
  const lista = chart.canvas
    .closest(".reservoir-analysis-card")
    ?.querySelector("[data-analysis-series-list]");
  if (!lista) return;

  lista.replaceChildren();
  chart.data.datasets.forEach((dataset, indice) => {
    const rotulo = document.createElement("label");
    rotulo.className = "reservoir-analysis-series-option";

    const controle = document.createElement("input");
    controle.type = "checkbox";
    controle.dataset.analysisSeries = String(indice);
    controle.checked = chart.isDatasetVisible(indice);

    const amostraCor = document.createElement("span");
    amostraCor.className = "reservoir-analysis-series-color";
    amostraCor.style.borderColor = dataset.borderColor;
    amostraCor.setAttribute("aria-hidden", "true");

    const nome = document.createElement("span");
    nome.textContent = dataset.label;
    rotulo.append(controle, amostraCor, nome);
    lista.append(rotulo);
  });
}

function obterVariavelCSS(nome) {
  return getComputedStyle(document.documentElement)
    .getPropertyValue(nome)
    .trim();
}
