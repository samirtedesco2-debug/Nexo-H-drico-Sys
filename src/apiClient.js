/**
 * apiClient.js - Camada de Abstração de Consumo de Dados (API Client)
 * Nexo Hídrico - CCO
 * 
 * Padroniza e isola o acesso a dados. Na transição futura para API REST, WebSockets 
 * ou Rádio, apenas este módulo precisará ser atualizado, preservando ui.js e regrasNegocio.js.
 */

window.ApiClient = {
  avisosCarregamento: new Map(),

  registrarFalhaCarregamento(recurso, erro) {
    const motivo = erro instanceof Error ? erro.message : String(erro);
    this.avisosCarregamento.set(recurso, { recurso, motivo });
    console.warn(`Não foi possível carregar ${recurso}: ${motivo}`);
  },

  listarAvisosCarregamento() {
    return Array.from(this.avisosCarregamento.values());
  },

  async carregarIndice() {
    try {
      const resposta = await fetch("indice_datas.json");
      if (!resposta.ok) {
        throw new Error(`Resposta HTTP ${resposta.status}`);
      }
      const indice = await resposta.json();
      if (!indice || !Array.isArray(indice.datasDisponiveis)) {
        throw new Error("O índice não contém uma lista válida de datas.");
      }
      this.avisosCarregamento.delete("indice_datas.json");
      return indice;
    } catch (erro) {
      this.registrarFalhaCarregamento("indice_datas.json", erro);
      const motivo = erro instanceof Error ? erro.message : String(erro);
      throw new Error(`Não foi possível carregar o índice de datas: ${motivo}`);
    }
  },

  async carregarMes(anoMes) {
    const arquivoMes = `dados_historicos/${anoMes}.json`;
    try {
      const resp = await fetch(arquivoMes);
      if (!resp.ok) {
        throw new Error(`Resposta HTTP ${resp.status}`);
      }
      const dadosMes = await resp.json();
      if (!dadosMes || !dadosMes.dias || typeof dadosMes.dias !== "object" || Array.isArray(dadosMes.dias)) {
        throw new Error("O arquivo não contém um objeto válido de dias.");
      }
      this.avisosCarregamento.delete(arquivoMes);
      return dadosMes;
    } catch (erro) {
      this.registrarFalhaCarregamento(arquivoMes, erro);
      return null;
    }
  },

  async carregarConfiguracoes() {
    const arquivo = "dados_historicos/config_reservatorios.json";
    try {
      const resp = await fetch(arquivo);
      if (!resp.ok) {
        throw new Error(`Resposta HTTP ${resp.status}`);
      }
      const data = await resp.json();
      if (!data || typeof data !== "object" || Array.isArray(data)) {
        throw new Error("O arquivo não contém um objeto de configurações válido.");
      }
      this.avisosCarregamento.delete(arquivo);
      if (data._estado_plantao && !window.ccoReconhecidosCarregado) {
        if (data._estado_plantao.reconhecidos) {
          window.ccoReconhecidos = new Map(data._estado_plantao.reconhecidos);
          try {
            localStorage.setItem("nexo_hidrico_reconhecidos", JSON.stringify(Object.fromEntries(window.ccoReconhecidos.entries())));
          } catch (erro) {
            this.registrarFalhaCarregamento("armazenamento local dos reconhecimentos", erro);
          }
        }
        if (data._estado_plantao.logsIncidentes) {
          window.nexoIncidentsLog = data._estado_plantao.logsIncidentes;
          try {
            localStorage.setItem("nexo_hidrico_incidents_log", JSON.stringify(window.nexoIncidentsLog));
          } catch (erro) {
            this.registrarFalhaCarregamento("armazenamento local do histórico de incidentes", erro);
          }
        }
      }
      return data;
    } catch (erro) {
      this.registrarFalhaCarregamento(arquivo, erro);
      return {};
    }
  },

  async carregarTaxonomia() {
    const arquivo = "dados_historicos/taxonomia_alarmes.json";
    try {
      const resp = await fetch(arquivo);
      if (!resp.ok) {
        throw new Error(`Resposta HTTP ${resp.status}`);
      }
      const data = await resp.json();
      if (!data || typeof data !== "object" || Array.isArray(data)) {
        throw new Error("O arquivo não contém uma taxonomia válida.");
      }
      this.avisosCarregamento.delete(arquivo);
      window.taxonomiaAlarmes = data;
      return data;
    } catch (erro) {
      this.registrarFalhaCarregamento(arquivo, erro);
      return {};
    }
  },

  async inicializarBanco() {
    this.avisosCarregamento.clear();
    const [indiceResult, configuracoesResult, taxonomiaResult] = await Promise.allSettled([
      this.carregarIndice(),
      this.carregarConfiguracoes(),
      this.carregarTaxonomia()
    ]);
    if (indiceResult.status === "rejected") {
      throw indiceResult.reason;
    }
    const indice = indiceResult.value;
    const configuracoesArquivo = configuracoesResult.status === "fulfilled"
      ? configuracoesResult.value
      : {};
    if (configuracoesResult.status === "rejected") {
      this.registrarFalhaCarregamento("dados_historicos/config_reservatorios.json", configuracoesResult.reason);
    }
    if (taxonomiaResult.status === "rejected") {
      this.registrarFalhaCarregamento("dados_historicos/taxonomia_alarmes.json", taxonomiaResult.reason);
    }
    const datasDisponiveis = indice.datasDisponiveis;
    const historico = {};

    if (datasDisponiveis.length === 0) {
      this.registrarFalhaCarregamento("indice_datas.json", new Error("O índice foi carregado, mas não contém datas disponíveis."));
    }

    const mesesParaCarregar = new Set();
    datasDisponiveis.forEach((dataStr) => {
      if (typeof dataStr !== "string") {
        this.registrarFalhaCarregamento("indice_datas.json", new Error("O índice contém uma data que não é texto."));
        return;
      }
      const partes = dataStr.split("/");
      if (partes.length === 3) {
        mesesParaCarregar.add(`${partes[2]}_${partes[1]}`);
      } else {
        this.registrarFalhaCarregamento("indice_datas.json", new Error(`Data em formato inválido: ${dataStr}`));
      }
    });

    const promessasCarregamento = Array.from(mesesParaCarregar).map(
      async (anoMes) => {
        const dadosMes = await this.carregarMes(anoMes);
        if (dadosMes) {
          Object.assign(historico, dadosMes.dias);
        }
      }
    );
    await Promise.all(promessasCarregamento);

    return {
      datasDisponiveis,
      historico,
      configuracoes: configuracoesArquivo
    };
  }
};
