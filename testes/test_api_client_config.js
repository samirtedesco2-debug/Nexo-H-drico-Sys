const assert = require("assert");
const fs = require("fs");
const path = require("path");
const vm = require("vm");

function criarApiClient(estadoInicial, configuracao, fetchMock) {
  const localStorageData = {};
  const window = {
    ccoReconhecidos: new Map(estadoInicial.reconhecidos),
    nexoIncidentsLog: estadoInicial.logs,
    ccoReconhecidosCarregado: estadoInicial.carregado
  };
  const context = {
    window,
    fetch: fetchMock || (async () => ({ ok: true, json: async () => configuracao })),
    localStorage: {
      getItem: (chave) => localStorageData[chave] ?? null,
      setItem: (chave, valor) => { localStorageData[chave] = String(valor); }
    },
    console,
    Map,
    Object
  };
  const source = fs.readFileSync(path.join(__dirname, "../src/apiClient.js"), "utf8");
  vm.runInNewContext(source, context);
  return { window, localStorageData };
}

async function executarTestesApiClientConfig() {
  console.log("-> Executando testes de precedência do estado dos alarmes...");

  const snapshot = {
    _estado_plantao: {
      reconhecidos: [["R-01", "Atenção"]],
      logsIncidentes: [{ chave: "R-01", acao: "snapshot antigo" }]
    }
  };
  const carregado = criarApiClient({
    carregado: true,
    reconhecidos: [["R-01", "Crítico"]],
    logs: [{ chave: "R-01", acao: "estado local recente" }]
  }, snapshot);

  await carregado.window.ApiClient.carregarConfiguracoes();
  assert.strictEqual(carregado.window.ccoReconhecidos.get("R-01"), "Crítico");
  assert.strictEqual(carregado.window.nexoIncidentsLog[0].acao, "estado local recente");
  assert.strictEqual(carregado.localStorageData.nexo_hidrico_reconhecidos, undefined);
  assert.strictEqual(carregado.localStorageData.nexo_hidrico_incidents_log, undefined);

  const naoCarregado = criarApiClient({
    carregado: false,
    reconhecidos: [],
    logs: []
  }, snapshot);

  await naoCarregado.window.ApiClient.carregarConfiguracoes();
  assert.strictEqual(naoCarregado.window.ccoReconhecidos.get("R-01"), "Atenção");
  assert.strictEqual(naoCarregado.window.nexoIncidentsLog[0].acao, "snapshot antigo");
  assert.notStrictEqual(naoCarregado.localStorageData.nexo_hidrico_reconhecidos, undefined);
  assert.notStrictEqual(naoCarregado.localStorageData.nexo_hidrico_incidents_log, undefined);

  const respostas = {
    "indice_datas.json": { ok: true, json: async () => ({ datasDisponiveis: ["01/10/2026", "01/11/2026"] }) },
    "dados_historicos/config_reservatorios.json": { ok: false, status: 404 },
    "dados_historicos/taxonomia_alarmes.json": { ok: true, json: async () => ({}) },
    "dados_historicos/2026_10.json": { ok: true, json: async () => ({ dias: { "01/10/2026": { dados: [] } } }) },
    "dados_historicos/2026_11.json": { ok: false, status: 404 }
  };
  const comFalhas = criarApiClient(
    { carregado: false, reconhecidos: [], logs: [] },
    {},
    async (recurso) => respostas[recurso]
  );
  const banco = await comFalhas.window.ApiClient.inicializarBanco();
  assert.strictEqual(Object.keys(banco.historico).length, 1);
  assert.strictEqual(
    JSON.stringify(comFalhas.window.ApiClient.listarAvisosCarregamento().map(({ recurso }) => recurso).sort()),
    JSON.stringify(["dados_historicos/2026_11.json", "dados_historicos/config_reservatorios.json"])
  );
  assert.strictEqual(banco.configuracoes && Object.keys(banco.configuracoes).length, 0);

  respostas["dados_historicos/2026_11.json"] = {
    ok: true,
    json: async () => ({ dias: { "01/11/2026": { dados: [] } } })
  };
  await comFalhas.window.ApiClient.carregarMes("2026_11");
  assert.strictEqual(
    JSON.stringify(comFalhas.window.ApiClient.listarAvisosCarregamento().map(({ recurso }) => recurso)),
    JSON.stringify(["dados_historicos/config_reservatorios.json"])
  );

  const indiceIndisponivel = criarApiClient(
    { carregado: false, reconhecidos: [], logs: [] },
    {},
    async (recurso) => {
      if (recurso === "indice_datas.json") return { ok: false, status: 500 };
      return { ok: false, status: 404 };
    }
  );
  await assert.rejects(indiceIndisponivel.window.ApiClient.inicializarBanco(), /índice de datas/);
  assert.strictEqual(
    JSON.stringify(indiceIndisponivel.window.ApiClient.listarAvisosCarregamento().map(({ recurso }) => recurso).sort()),
    JSON.stringify([
      "dados_historicos/config_reservatorios.json",
      "dados_historicos/taxonomia_alarmes.json",
      "indice_datas.json"
    ])
  );

  const respostasCompletas = {
    "indice_datas.json": { ok: true, json: async () => ({ datasDisponiveis: ["01/10/2026"] }) },
    "dados_historicos/config_reservatorios.json": { ok: true, json: async () => ({ reservatorios: [] }) },
    "dados_historicos/taxonomia_alarmes.json": { ok: true, json: async () => ({ alarmes: [] }) },
    "dados_historicos/2026_10.json": { ok: true, json: async () => ({ dias: { "01/10/2026": { reservatorios: [] } } }) }
  };
  const cargaCompleta = criarApiClient(
    { carregado: false, reconhecidos: [], logs: [] },
    {},
    async (recurso) => respostasCompletas[recurso]
  );
  const bancoCompleto = await cargaCompleta.window.ApiClient.inicializarBanco();
  assert.strictEqual(bancoCompleto.datasDisponiveis.length, 1);
  assert.strictEqual(Object.keys(bancoCompleto.historico).length, 1);
  assert.strictEqual(bancoCompleto.configuracoes.reservatorios.length, 0);
  assert.strictEqual(cargaCompleta.window.ApiClient.listarAvisosCarregamento().length, 0);

  console.log("✓ Estado local carregado prevalece; configuração continua como fallback inicial.");
  console.log("✓ Falhas de arquivos são reportadas e removidas quando a carga posterior funciona.");
  console.log("✓ Falha do índice preserva também os avisos dos demais recursos.");
  console.log("✓ Índice, configuração, taxonomia e histórico carregam sem avisos quando estão válidos.");
}

module.exports = executarTestesApiClientConfig;
