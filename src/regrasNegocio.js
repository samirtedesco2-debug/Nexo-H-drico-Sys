// regrasNegocio.js - Centraliza cálculos e regras operacionais

const LIMITE_ATENCAO_NIVEL_PERCENTUAL = 60;
const LIMITE_CRITICO_NIVEL_PERCENTUAL = 50;
const LIMITE_ATENCAO_VAZAO_PERCENTUAL = 20;
const LIMITE_CRITICO_VAZAO_PERCENTUAL = 35;

// Base de comparação usada pelos ALARMES (Mural, investigação, OS, informativo e resumo de plantão).
// É um parâmetro global (só ADMIN altera em Parâmetros Globais); o seletor "Base de comparação"
// da tela operacional serve apenas para análise e não muda os alarmes.
const BASES_COMPARACAO_VALIDAS = ["7d-calendar", "30d-calendar", "same-weekday-4", "global"];
const BASE_COMPARACAO_ALARME_PADRAO = "same-weekday-4";

/**
 * Lê a base dos alarmes em nexo_hidrico_global_config.baseComparacaoAlarme.
 * Sem valor salvo usa o padrão; valor inválido ou configuração ilegível também usa o padrão,
 * mas devolve `aviso` para a UI exibir (não é um fallback silencioso).
 * @returns {{ base: string, aviso: string|null }}
 */
function obterBaseComparacaoAlarme() {
  let salvo;
  try {
    salvo = JSON.parse(localStorage.getItem("nexo_hidrico_global_config") || "{}")?.baseComparacaoAlarme;
  } catch (erro) {
    return {
      base: BASE_COMPARACAO_ALARME_PADRAO,
      aviso: "Parâmetros globais ilegíveis; alarmes usando a base padrão.",
    };
  }
  if (salvo === undefined || salvo === null || salvo === "") {
    return { base: BASE_COMPARACAO_ALARME_PADRAO, aviso: null };
  }
  if (!BASES_COMPARACAO_VALIDAS.includes(salvo)) {
    return {
      base: BASE_COMPARACAO_ALARME_PADRAO,
      aviso: `Base de comparação dos alarmes inválida ("${salvo}"); alarmes usando a base padrão.`,
    };
  }
  return { base: salvo, aviso: null };
}

function obterConfiguracaoReservatorio(idReservatorio) {
  try {
    const salvos = JSON.parse(
      localStorage.getItem("nexo_hidrico_reservatorios_config") || "{}",
    );
    const arquivoConfig = window.bancoDeDados?.configuracoes || {};
    const config =
      salvos[idReservatorio] !== undefined &&
      salvos[idReservatorio] !== null &&
      Object.keys(salvos[idReservatorio]).length > 0
        ? salvos[idReservatorio]
        : arquivoConfig[idReservatorio];

    return {
      nivelAtencao:
        config?.nivelAtencao !== undefined &&
        config?.nivelAtencao !== "" &&
        !isNaN(config.nivelAtencao)
          ? Number(config.nivelAtencao)
          : LIMITE_ATENCAO_NIVEL_PERCENTUAL,
      nivelCritico:
        config?.nivelCritico !== undefined &&
        config?.nivelCritico !== "" &&
        !isNaN(config.nivelCritico)
          ? Number(config.nivelCritico)
          : LIMITE_CRITICO_NIVEL_PERCENTUAL,
      nivelMedioAtencao:
        config?.nivelMedioAtencao !== undefined &&
        config?.nivelMedioAtencao !== "" &&
        !isNaN(config.nivelMedioAtencao)
          ? Number(config.nivelMedioAtencao)
          : 15,
      nivelMedioCritico:
        config?.nivelMedioCritico !== undefined &&
        config?.nivelMedioCritico !== "" &&
        !isNaN(config.nivelMedioCritico)
          ? Number(config.nivelMedioCritico)
          : 25,
      vazaoEntradaAtencao:
        config?.vazaoEntradaAtencao !== undefined &&
        config?.vazaoEntradaAtencao !== "" &&
        !isNaN(config.vazaoEntradaAtencao)
          ? Number(config.vazaoEntradaAtencao)
          : LIMITE_ATENCAO_VAZAO_PERCENTUAL,
      vazaoEntradaCritico:
        config?.vazaoEntradaCritico !== undefined &&
        config?.vazaoEntradaCritico !== "" &&
        !isNaN(config.vazaoEntradaCritico)
          ? Number(config.vazaoEntradaCritico)
          : LIMITE_CRITICO_VAZAO_PERCENTUAL,
      vazaoSaidaAtencao:
        config?.vazaoSaidaAtencao !== undefined &&
        config?.vazaoSaidaAtencao !== "" &&
        !isNaN(config.vazaoSaidaAtencao)
          ? Number(config.vazaoSaidaAtencao)
          : LIMITE_ATENCAO_VAZAO_PERCENTUAL,
      vazaoSaidaCritico:
        config?.vazaoSaidaCritico !== undefined &&
        config?.vazaoSaidaCritico !== "" &&
        !isNaN(config.vazaoSaidaCritico)
          ? Number(config.vazaoSaidaCritico)
          : LIMITE_CRITICO_VAZAO_PERCENTUAL,
      vazaoMediaAtencao:
        config?.vazaoMediaAtencao !== undefined &&
        config?.vazaoMediaAtencao !== "" &&
        !isNaN(config.vazaoMediaAtencao)
          ? Number(config.vazaoMediaAtencao)
          : LIMITE_ATENCAO_VAZAO_PERCENTUAL,
      vazaoMediaCritico:
        config?.vazaoMediaCritico !== undefined &&
        config?.vazaoMediaCritico !== "" &&
        !isNaN(config.vazaoMediaCritico)
          ? Number(config.vazaoMediaCritico)
          : LIMITE_CRITICO_VAZAO_PERCENTUAL,
      alertaNivelAtivo:
        config?.alertaNivelAtivo !== undefined
          ? Boolean(config.alertaNivelAtivo)
          : true,
      alertaNivelMedioAtivo:
        config?.alertaNivelMedioAtivo !== undefined
          ? Boolean(config.alertaNivelMedioAtivo)
          : true,
      alertaVazaoEntradaAtivo:
        config?.alertaVazaoEntradaAtivo !== undefined
          ? Boolean(config.alertaVazaoEntradaAtivo)
          : true,
      alertaVazaoSaidaAtivo:
        config?.alertaVazaoSaidaAtivo !== undefined
          ? Boolean(config.alertaVazaoSaidaAtivo)
          : true,
      alertaVazaoMediaAtivo:
        config?.alertaVazaoMediaAtivo !== undefined
          ? Boolean(config.alertaVazaoMediaAtivo)
          : true,
      possuiMedicaoVazao:
        config?.possuiMedicaoVazao !== undefined
          ? Boolean(config.possuiMedicaoVazao)
          : false,
      capacidadeUtil: config?.capacidadeUtil ?? "",
      emManutencao: Boolean(config?.emManutencao),
      tempoAtencaoMinutos:
        config?.tempoAtencaoMinutos !== undefined &&
        config?.tempoAtencaoMinutos !== "" &&
        !isNaN(config.tempoAtencaoMinutos)
          ? Number(config.tempoAtencaoMinutos)
          : 180,
      tempoCriticoMinutos:
        config?.tempoCriticoMinutos !== undefined &&
        config?.tempoCriticoMinutos !== "" &&
        !isNaN(config.tempoCriticoMinutos)
          ? Number(config.tempoCriticoMinutos)
          : 180,
      nivelAlertaTempoAtencao:
        config?.nivelAlertaTempoAtencao !== undefined &&
        config?.nivelAlertaTempoAtencao !== "" &&
        !isNaN(config.nivelAlertaTempoAtencao)
          ? Number(config.nivelAlertaTempoAtencao)
          : 40,
      nivelAlertaTempoCritico:
        config?.nivelAlertaTempoCritico !== undefined &&
        config?.nivelAlertaTempoCritico !== "" &&
        !isNaN(config.nivelAlertaTempoCritico)
          ? Number(config.nivelAlertaTempoCritico)
          : 30,
    };
  } catch (e) {
    return {
      nivelAtencao: LIMITE_ATENCAO_NIVEL_PERCENTUAL,
      nivelCritico: LIMITE_CRITICO_NIVEL_PERCENTUAL,
      nivelMedioAtencao: 15,
      nivelMedioCritico: 25,
      vazaoEntradaAtencao: LIMITE_ATENCAO_VAZAO_PERCENTUAL,
      vazaoEntradaCritico: LIMITE_CRITICO_VAZAO_PERCENTUAL,
      vazaoSaidaAtencao: LIMITE_ATENCAO_VAZAO_PERCENTUAL,
      vazaoSaidaCritico: LIMITE_CRITICO_VAZAO_PERCENTUAL,
      vazaoMediaAtencao: LIMITE_ATENCAO_VAZAO_PERCENTUAL,
      vazaoMediaCritico: LIMITE_CRITICO_VAZAO_PERCENTUAL,
      alertaNivelAtivo: true,
      alertaNivelMedioAtivo: true,
      alertaVazaoEntradaAtivo: true,
      alertaVazaoSaidaAtivo: true,
      alertaVazaoMediaAtivo: true,
      capacidadeUtil: "",
      emManutencao: false,
      tempoAtencaoMinutos: 180,
      tempoCriticoMinutos: 180,
      nivelAlertaTempoAtencao: 40,
      nivelAlertaTempoCritico: 30,
    };
  }
}

/**
 * Valida os limites de uma configuração de reservatório antes de guardar.
 * Devolve a lista de problemas em texto; vazia quando está tudo certo.
 * - Nível e "nível de alerta de tempo": 0 a 100% e crítico MENOR que atenção (nível mais baixo é pior).
 * - Desvios (nível médio e vazões): valores não negativos e crítico MAIOR que atenção (desvio maior é pior).
 * - Pares ligados a um alerta só são verificados quando esse alerta está ativo.
 */
function validarConfiguracaoReservatorio(config) {
  const problemas = [];
  const numero = (valor) => typeof valor === "number" && Number.isFinite(valor);

  const verificarNivel = (rotulo, atencao, critico) => {
    if (!numero(atencao) || !numero(critico) || atencao < 0 || atencao > 100 || critico < 0 || critico > 100) {
      problemas.push(`${rotulo}: informe limites numéricos entre 0 e 100%.`);
    } else if (critico >= atencao) {
      problemas.push(`${rotulo}: o limite crítico (${critico}%) deve ser menor que o de atenção (${atencao}%).`);
    }
  };
  const verificarDesvio = (rotulo, atencao, critico) => {
    if (!numero(atencao) || !numero(critico) || atencao < 0 || critico < 0) {
      problemas.push(`${rotulo}: informe desvios numéricos não negativos.`);
    } else if (critico <= atencao) {
      problemas.push(`${rotulo}: o desvio crítico (${critico}%) deve ser maior que o de atenção (${atencao}%).`);
    }
  };

  if (config.alertaNivelAtivo) {
    verificarNivel("Nível", config.nivelAtencao, config.nivelCritico);
  }
  verificarNivel("Nível de alerta por tempo", config.nivelAlertaTempoAtencao, config.nivelAlertaTempoCritico);
  if (config.alertaNivelMedioAtivo) {
    verificarDesvio("Nível médio", config.nivelMedioAtencao, config.nivelMedioCritico);
  }
  if (config.alertaVazaoEntradaAtivo) {
    verificarDesvio("Vazão de entrada", config.vazaoEntradaAtencao, config.vazaoEntradaCritico);
  }
  if (config.alertaVazaoSaidaAtivo) {
    verificarDesvio("Vazão de saída", config.vazaoSaidaAtencao, config.vazaoSaidaCritico);
  }
  if (config.alertaVazaoMediaAtivo) {
    verificarDesvio("Vazão média", config.vazaoMediaAtencao, config.vazaoMediaCritico);
  }
  return problemas;
}

function obterUltimaLeituraValida(valores) {
  if (!Array.isArray(valores)) return null;
  for (let i = valores.length - 1; i >= 0; i--) {
    const v = valores[i];
    if (
      v !== null &&
      v !== undefined &&
      v !== "" &&
      Number.isFinite(Number(v))
    ) {
      return Number(v);
    }
  }
  return null;
}

function auditarLeiturasNivel(valores) {
  if (!Array.isArray(valores) || valores.length === 0) {
    return { status: "Inconsistente", motivo: "Sem leituras" };
  }

  // c) TIMEOUT (QUEDA DE LINK / FALHA DE COMUNICAÇÃO): Varre de trás para frente.
  // Se houver mais de 2 campos seguidos em branco (planilha), decrete "Falha de Comunicação".
  let camposBrancosConsecutivos = 0;
  for (let i = valores.length - 1; i >= 0; i--) {
    const v = valores[i];
    if (v === null || v === undefined || v === "") {
      camposBrancosConsecutivos++;
      if (camposBrancosConsecutivos > 2) {
        return { status: "Inconsistente", motivo: "Falha de Comunicação (Timeout: > 2 campos em branco seguidos)" };
      }
    } else {
      camposBrancosConsecutivos = 0;
    }
  }

  /*
    ESTRUTURA DE PREPARAÇÃO PARA TEMPO REAL - TIMEOUT (QUEDA DE LINK):
    // Avaliação da diferença de Timestamp entre o CCO e o Sensor (Delta t >= 5 minutos)
    // const DELTA_T_TIMEOUT_MS = 5 * 60 * 1000;
    // const timestampCCO = Date.now();
    // const timestampSensor = reservatorio?.ultimaLeituraTimestamp || timestampCCO;
    // if ((timestampCCO - timestampSensor) >= DELTA_T_TIMEOUT_MS) {
    //   return { status: "Inconsistente", motivo: "Timeout de Link / Queda de Comunicação em Tempo Real (Delta t >= 5 min)" };
    // }
  */

  const numericos = [];
  for (let i = 0; i < valores.length; i++) {
    const v = valores[i];
    if (v === null || v === undefined || v === "") {
      numericos.push(null);
    } else {
      const num = Number(v);
      if (Number.isFinite(num)) {
        numericos.push(num);
      } else {
        numericos.push("INCONSISTENTE");
      }
    }
  }

  if (numericos.includes("INCONSISTENTE")) {
    return { status: "Inconsistente", motivo: "Valor não numérico / inconsistente" };
  }

  const validosComIndice = numericos
    .map((val, idx) => ({ val, idx }))
    .filter(item => item.val !== null && item.val >= 0 && item.val <= 110);

  for (let i = 0; i < validosComIndice.length; i++) {
    // a) SENSOR TRAVADO: Se o desvio padrão ou variação entre 3 leituras consecutivas for zero.
    if (i >= 2) {
      const r1 = validosComIndice[i - 2].val;
      const r2 = validosComIndice[i - 1].val;
      const r3 = validosComIndice[i].val;
      if (r1 === r2 && r2 === r3) {
        return { status: "Inconsistente", motivo: "Sensor Travado (3 leituras consecutivas idênticas / desvio zero)" };
      }
    }

    // b) DEGRAU IMPOSSÍVEL: Se a variação de nível entre duas horas consecutivas for maior que 25%.
    if (i >= 1) {
      const atual = validosComIndice[i].val;
      const anterior = validosComIndice[i - 1].val;
      const variacaoAbs = Math.abs(atual - anterior);
      if (variacaoAbs > 25) {
        return { status: "Inconsistente", motivo: "Degrau Impossível (Variação > 25% entre horas consecutivas)" };
      }
    }
  }

  // c) FLAPPING DETECTION (ALARMES INTERMITENTES): Se as leituras válidas alternam o status (Normal <-> Anormal) 2 ou mais vezes.
  if (validosComIndice.length >= 3) {
    let transicoes = 0;
    let estadoAnterior = null;
    for (let i = 0; i < validosComIndice.length; i++) {
      const v = validosComIndice[i].val;
      // TODO: [TEMPO_REAL] - usar o nivelAtencao configurado do reservatório em vez do 60% fixo.
      const estadoAtual = v < 60 ? "ANORMAL" : "NORMAL";
      if (estadoAnterior !== null && estadoAtual !== estadoAnterior) {
        transicoes++;
      }
      estadoAnterior = estadoAtual;
    }
    if (transicoes >= 2) {
      return { status: "Inconsistente", motivo: "Alerta Intermitente (Flapping: oscilação instável de status na telemetria)" };
    }
  }

  return { status: "Normal", motivo: "Auditoria contínua aprovada" };
}

// TODO: [TEMPO_REAL] - As duas regras abaixo ficam DESLIGADAS enquanto os dados forem os arquivos
// históricos (6 leituras de madrugada por dia). Com esse formato elas geram alarmes falsos (nos dados
// de 2026: ~6% de reservatório-dia virariam "Inconsistente" e ~7,6% mudariam para Atenção/Crítico,
// inclusive reservatórios cheios). Ligar e calibrar com telemetria real antes de habilitar.
//
// AUDITORIA_SENSOR_ATIVA: auditoria do sensor (auditarLeiturasNivel) e valores fora de 0-110% ou
// ausência total de leituras resultando em "Inconsistente".
const AUDITORIA_SENSOR_ATIVA = false;
// COMPARACAO_NIVEL_MEDIO_ATIVA: variação do nível médio contra a média histórica
// (nivelMedioAtencao / nivelMedioCritico do reservatório).
const COMPARACAO_NIVEL_MEDIO_ATIVA = false;

function avaliarStatusNivel(valores, idReservatorio, referenciaMedia) {
  const config = obterConfiguracaoReservatorio(idReservatorio);
  if (config.emManutencao) return "Manutenção";

  if (AUDITORIA_SENSOR_ATIVA) {
    if (auditarLeiturasNivel(valores).status === "Inconsistente") {
      return "Inconsistente";
    }
    if (!Array.isArray(valores) || valores.length === 0) {
      return "Inconsistente";
    }
  }

  const leiturasFiltradas = filtrarLeiturasNivelValidas(valores);
  if (
    AUDITORIA_SENSOR_ATIVA &&
    (leiturasFiltradas.includes("INCONSISTENTE") ||
      leiturasFiltradas.every((v) => v === null))
  ) {
    return "Inconsistente";
  }

  // Última leitura válida (0-110%); valores inválidos são ignorados.
  const nivelAtual = obterUltimaLeituraValida(leiturasFiltradas);
  if (nivelAtual === null) return "Sem Dados";

  let statusInstantaneo = "Normal";
  if (config.alertaNivelAtivo) {
    if (nivelAtual < config.nivelCritico) statusInstantaneo = "Crítico";
    else if (nivelAtual < config.nivelAtencao) statusInstantaneo = "Atenção";
  }

  let statusMedio = "Normal";
  if (
    COMPARACAO_NIVEL_MEDIO_ATIVA &&
    config.alertaNivelMedioAtivo &&
    referenciaMedia !== null &&
    referenciaMedia !== undefined &&
    referenciaMedia > 0
  ) {
    const mediaAtual = calcularMediaValida(leiturasFiltradas);
    if (mediaAtual !== null) {
      const variacao =
        ((mediaAtual - referenciaMedia) / Math.abs(referenciaMedia)) * 100;
      const magnitude = Math.abs(variacao);
      if (magnitude > config.nivelMedioCritico + 1e-9) statusMedio = "Crítico";
      else if (magnitude >= config.nivelMedioAtencao - 1e-9)
        statusMedio = "Atenção";
    }
  }

  if (statusInstantaneo === "Crítico" || statusMedio === "Crítico")
    return "Crítico";
  if (statusInstantaneo === "Atenção" || statusMedio === "Atenção")
    return "Atenção";
  return "Normal";
}

function calcularMediaValida(valores) {
  if (!Array.isArray(valores)) return null;
  const validos = valores
    .filter((valor) => valor !== null && valor !== undefined && valor !== "")
    .map(Number)
    .filter(Number.isFinite);
  if (!validos.length) return null;
  return validos.reduce((total, valor) => total + valor, 0) / validos.length;
}

function filtrarLeiturasNivelValidas(valores) {
  if (!Array.isArray(valores)) return [];
  return valores.map((valor) => {
    if (valor === null || valor === undefined || valor === "") return null;
    const numero = Number(valor);
    return Number.isFinite(numero) && numero >= 0 && numero <= 110
      ? numero
      : "INCONSISTENTE";
  });
}

function filtrarLeiturasVazaoValidas(valores) {
  if (!Array.isArray(valores)) return [];
  return valores.map((valor) => {
    if (valor === null || valor === undefined || valor === "") return null;
    const numero = Number(valor);
    return Number.isFinite(numero) && numero > 0
      ? numero
      : "INCONSISTENTE";
  });
}

function resumirLeiturasEstruturadas(valores, horarios) {
  const leituras = Array.isArray(valores)
    ? valores
        .map((valor, indice) => ({
          valor: Number(valor),
          indice,
        }))
        .filter(
          ({ valor }, indice) =>
            valores[indice] !== null &&
            valores[indice] !== undefined &&
            valores[indice] !== "" &&
            Number.isFinite(valor),
        )
    : [];
  const numeros = leituras.map(({ valor }) => valor);
  const minimo = numeros.length ? Math.min(...numeros) : null;
  const maximo = numeros.length ? Math.max(...numeros) : null;
  const leituraMinima = leituras.find(({ valor }) => valor === minimo);
  const leituraMaxima = leituras.find(({ valor }) => valor === maximo);

  return {
    quantidade: numeros.length,
    minimo,
    media: calcularMediaValida(numeros),
    maximo,
    horarioMinimo: leituraMinima
      ? (horarios[leituraMinima.indice] ??
        `Leitura ${leituraMinima.indice + 1}`)
      : null,
    horarioMaximo: leituraMaxima
      ? (horarios[leituraMaxima.indice] ??
        `Leitura ${leituraMaxima.indice + 1}`)
      : null,
  };
}

/**
 * Referência de vazão POR HORÁRIO. Para cada horário (ex.: 00:15) junta os valores válidos desse
 * horário nos dias da base (ex.: as últimas 4 segundas). Um horário só entra com pelo menos 2 valores.
 * Dos horários incluídos saem: média de todos os valores, MENOR valor e MAIOR valor do período
 * (extremos reais, não médias de mínimas/máximas). `horariosReferencia` lista os horários usados,
 * para a comparação do dia olhar os mesmos horários.
 * @param {{data: string, horarios?: string[], vazao: any[]}[]} dias dias da base (já filtrados pela base de comparação)
 */
function calcularReferenciaVazaoPorHorario(dias, horariosPadrao = []) {
  const porHorario = new Map();
  const datasComDados = new Set();
  (dias || []).forEach(({ data, horarios, vazao }) => {
    const rotulos = Array.isArray(horarios) && horarios.length ? horarios : horariosPadrao;
    filtrarLeiturasVazaoValidas(vazao).forEach((valor, indice) => {
      if (typeof valor !== "number") return;
      const rotulo = rotulos[indice] ?? `Leitura ${indice + 1}`;
      if (!porHorario.has(rotulo)) porHorario.set(rotulo, []);
      porHorario.get(rotulo).push({ data, valor });
      datasComDados.add(data);
    });
  });

  const incluidos = [...porHorario.entries()].filter(([, itens]) => itens.length >= 2);
  const valores = [];
  const datasUsadas = new Set();
  incluidos.forEach(([, itens]) =>
    itens.forEach(({ data, valor }) => {
      valores.push(valor);
      datasUsadas.add(data);
    }),
  );
  const tem = valores.length > 0;
  return {
    media: tem ? valores.reduce((total, valor) => total + valor, 0) / valores.length : null,
    minimo: tem ? Math.min(...valores) : null,
    maximo: tem ? Math.max(...valores) : null,
    quantidade: datasComDados.size,
    datas: [...datasComDados],
    quantidades: { media: datasUsadas.size, minimo: datasUsadas.size, maximo: datasUsadas.size },
    horariosReferencia: incluidos.map(([rotulo]) => rotulo),
    valoresPorHorario: Object.fromEntries(incluidos.map(([rotulo, itens]) => [rotulo, itens.map(({ valor }) => valor)])),
  };
}

function avaliarAlertaVazao(
  leiturasAtuais,
  referencia,
  horarios,
  idReservatorio,
) {
  const config = obterConfiguracaoReservatorio(idReservatorio);
  if (config.emManutencao) {
    return { status: "Manutenção", indicadores: [], referencia };
  }
  // Compara o dia só nos horários que entraram na referência (mesmo horário contra mesmo horário).
  const horariosReferencia = Array.isArray(referencia?.horariosReferencia)
    ? new Set(referencia.horariosReferencia)
    : null;
  const leiturasAlinhadas =
    horariosReferencia && Array.isArray(leiturasAtuais)
      ? leiturasAtuais.map((valor, indice) =>
          horariosReferencia.has(horarios?.[indice] ?? `Leitura ${indice + 1}`) ? valor : null,
        )
      : leiturasAtuais;
  const atual = resumirLeiturasEstruturadas(
    filtrarLeiturasVazaoValidas(leiturasAlinhadas),
    horarios,
  );
  // A referência usa só os horários em que o dia tem leitura válida (mesmo horário contra mesmo horário).
  let referenciaComparavel = referencia;
  if (referencia?.valoresPorHorario && Array.isArray(leiturasAtuais)) {
    const valoresReferencia = [];
    filtrarLeiturasVazaoValidas(leiturasAtuais).forEach((valor, indice) => {
      if (typeof valor !== "number") return;
      const rotulo = horarios?.[indice] ?? `Leitura ${indice + 1}`;
      (referencia.valoresPorHorario[rotulo] ?? []).forEach((v) => valoresReferencia.push(v));
    });
    const tem = valoresReferencia.length > 0;
    referenciaComparavel = {
      ...referencia,
      media: tem ? valoresReferencia.reduce((total, v) => total + v, 0) / valoresReferencia.length : null,
      minimo: tem ? Math.min(...valoresReferencia) : null,
      maximo: tem ? Math.max(...valoresReferencia) : null,
    };
  }
  const indicadores = [
    {
      rotulo: "Média",
      valorAtual: atual.media,
      valorAnterior: referenciaComparavel?.media ?? null,
      quantidadeReferencia: referencia?.quantidades.media ?? 0,
      classificaAlerta: true,
      somenteAcimaDaReferencia: true,
    },
    {
      rotulo: "Mínima",
      valorAtual: atual.minimo,
      valorAnterior: referenciaComparavel?.minimo ?? null,
      quantidadeReferencia: referencia?.quantidades.minimo ?? 0,
      classificaAlerta: true,
      somenteAcimaDaReferencia: true,
    },
    {
      rotulo: "Máxima",
      valorAtual: atual.maximo,
      valorAnterior: referenciaComparavel?.maximo ?? null,
      quantidadeReferencia: referencia?.quantidades.maximo ?? 0,
      classificaAlerta: true,
      somenteAcimaDaReferencia: true,
    },
  ].map((indicador) => {
    const variacao =
      indicador.valorAtual !== null &&
      indicador.valorAnterior !== null &&
      indicador.valorAnterior > 0
        ? ((indicador.valorAtual - indicador.valorAnterior) /
            Math.abs(indicador.valorAnterior)) *
          100
        : null;
    const magnitude = variacao === null ? null : Math.abs(variacao);
    const direcao =
      variacao === null
        ? null
        : variacao < 0
          ? "baixa"
          : variacao > 0
            ? "alta"
            : "estável";

    let limAtencao = config.vazaoEntradaAtencao;
    let limCritico = config.vazaoEntradaCritico;
    let ativo = config.alertaVazaoEntradaAtivo;

    if (indicador.rotulo === "Mínima") {
      limAtencao = config.vazaoSaidaAtencao;
      limCritico = config.vazaoSaidaCritico;
      ativo = config.alertaVazaoSaidaAtivo;
    } else if (indicador.rotulo === "Média") {
      limAtencao = config.vazaoMediaAtencao;
      limCritico = config.vazaoMediaCritico;
      ativo = config.alertaVazaoMediaAtivo;
    } else if (indicador.rotulo === "Máxima") {
      ativo = config.alertaVazaoEntradaAtivo;
    }

    const status =
      !ativo || !indicador.classificaAlerta
        ? "Normal"
        : magnitude === null
          ? "Sem comparação"
          : indicador.somenteAcimaDaReferencia && variacao <= 0
            ? "Normal"
            : magnitude > limCritico + 1e-9
              ? "Crítico"
              : magnitude >= limAtencao - 1e-9
                ? "Atenção"
                : "Normal";
    return { ...indicador, variacao, direcao, status };
  });
  const indicadoresClassificaveis = indicadores.filter(
    (indicador) => indicador.classificaAlerta,
  );
  const status =
    ["Crítico", "Atenção", "Normal"].find((nivel) =>
      indicadoresClassificaveis.some((indicador) => indicador.status === nivel),
    ) ?? "Sem comparação";

  return { status, indicadores, referencia };
}

/**
 * Direção do desvio de vazão. Usa o indicador que disparou o alarme (Crítico antes de
 * Atenção); sem indicador em alarme, mantém o comportamento anterior (indicador de média).
 */
function obterDirecaoDesvioVazao(alertaVazao) {
  const indicadores = alertaVazao?.indicadores ?? [];
  for (const nivel of ["Crítico", "Atenção"]) {
    const alvo = indicadores.find(
      (indicador) =>
        indicador.classificaAlerta &&
        indicador.status === nivel &&
        (indicador.direcao === "alta" || indicador.direcao === "baixa"),
    );
    if (alvo) return alvo.direcao;
  }
  return indicadores[0]?.direcao ?? "estável";
}

/**
 * Códigos de taxonomia dos alarmes ativos de um reservatório. Fonte única para o mural e
 * para a investigação. Nível usa o status; vazão usa a DIREÇÃO do desvio (baixa = ALM-VAZ-01,
 * alta = ALM-VAZ-02) e a severidade real do status, não a fixa do arquivo de taxonomia.
 * @returns {{codigo: string, severidade: string, origem: "nivel"|"vazao"|"dados"}[]}
 */
function classificarAlarmesAtivos({
  statusNivel,
  statusVazao,
  direcaoVazao,
  possuiLeiturasAusentes = false,
}) {
  const alarmes = [];
  if (statusNivel === "Crítico") {
    alarmes.push({ codigo: "ALM-NIV-01", severidade: "Crítico", origem: "nivel" });
  } else if (statusNivel === "Atenção") {
    alarmes.push({ codigo: "ALM-NIV-02", severidade: "Atenção", origem: "nivel" });
  }
  if (statusNivel === "Inconsistente" || statusNivel === "Sem Dados") {
    alarmes.push({ codigo: "ALM-DAT-02", severidade: "Inconsistente", origem: "dados" });
  }
  if (statusVazao === "Crítico" || statusVazao === "Atenção") {
    alarmes.push({
      codigo: direcaoVazao === "alta" ? "ALM-VAZ-02" : "ALM-VAZ-01",
      severidade: statusVazao,
      origem: "vazao",
    });
  }
  if (possuiLeiturasAusentes) {
    alarmes.push({ codigo: "ALM-DAT-01", severidade: "Inconsistente", origem: "dados" });
  }
  return alarmes;
}

function calcularMediaMovel(valores, janela = 3) {
  if (!Array.isArray(valores) || valores.length === 0) return [];
  return valores.map((val, idx, arr) => {
    if (
      val === null ||
      val === undefined ||
      val === "" ||
      !Number.isFinite(Number(val))
    )
      return null;
    const inicio = Math.max(0, idx - janela + 1);
    const sub = arr
      .slice(inicio, idx + 1)
      .filter(
        (v) =>
          v !== null &&
          v !== undefined &&
          v !== "" &&
          Number.isFinite(Number(v)),
      )
      .map(Number);
    if (sub.length === 0) return Number(val);
    return sub.reduce((a, b) => a + b, 0) / sub.length;
  });
}

// Capacidade útil (m³) configurada, ou null se ausente/inválida. Sem valor padrão:
// um número inventado geraria autonomias falsas.
function obterCapacidadeUtil(config) {
  const bruto = config?.capacidadeUtil;
  if (bruto === "" || bruto === null || bruto === undefined) return null;
  const valor = Number(bruto);
  return Number.isFinite(valor) && valor > 0 ? valor : null;
}

function calcularAutonomiaEProjecao(reservatorio, idReservatorio) {
  const config = obterConfiguracaoReservatorio(idReservatorio);
  const capacidade = obterCapacidadeUtil(config);
  if (capacidade === null) {
    return {
      statusPreditivo: "Normal",
      mensagemPreditiva: "Capacidade útil não configurada: autonomia indisponível (N/A).",
      tendencia: "Sem Dados",
      iconeTendencia: "→",
      minutosAteCritico: null,
      minutosAteAtencao: null,
      minutosAteNormal: null,
      possuiMedicaoVazao: config.possuiMedicaoVazao,
      fallbackUsoApenasNivel: false,
      capacidadeAusente: true,
      confiabilidade: "Baixa",
    };
  }

  const niveisRaw = reservatorio?.leituras?.nivel;
  const nivelAtual = obterUltimaLeituraValida(niveisRaw);
  if (nivelAtual === null || nivelAtual === undefined) {
    return {
      statusPreditivo: "Normal",
      tendencia: "Sem Dados",
      iconeTendencia: "→",
      minutosAteCritico: null,
      minutosAteAtencao: null,
      minutosAteNormal: null,
      possuiMedicaoVazao: config.possuiMedicaoVazao,
      fallbackUsoApenasNivel: false,
      confiabilidade: "Baixa",
    };
  }

  // TODO: [TEMPO_REAL] - Na transição para dados reais, avaliar ajuste da janela de média móvel (ex: voltar para 3)
  const niveisSmoothed = calcularMediaMovel(niveisRaw, 1);
  const niveisValidos = niveisSmoothed.filter((v) => v !== null);

  const totalSlots = Array.isArray(niveisRaw) ? niveisRaw.length : 0;
  const validosCount = niveisValidos.length;
  const taxaPreenchimento = totalSlots > 0 ? validosCount / totalSlots : 0;
  let confiabilidade = "Alta";
  if (taxaPreenchimento < 0.5 || validosCount < 3) {
    confiabilidade = "Baixa";
  } else if (taxaPreenchimento < 0.8) {
    confiabilidade = "Média";
  }

  let tendencia = "Estável";
  let iconeTendencia = "→";
  if (niveisValidos.length >= 2) {
    const ultimo = niveisValidos[niveisValidos.length - 1];
    const penultimo = niveisValidos[niveisValidos.length - 2];
    if (ultimo > penultimo) {
      tendencia = "Subindo";
      iconeTendencia = "↑";
    } else if (ultimo < penultimo) {
      tendencia = "Descendo";
      iconeTendencia = "↓";
    }
  }

  const vazoes = reservatorio?.leituras?.vazao;
  const vazaoAtual = obterUltimaLeituraValida(vazoes);
  const temDadosVazao =
    vazaoAtual !== null &&
    vazaoAtual !== undefined &&
    Array.isArray(vazoes) &&
    vazoes.some((v) => v !== null && v !== undefined && v !== "");

  let fallbackUsoApenasNivel = false;
  let mensagemFallback = null;
  // A série de vazão das planilhas é somente de saída; a entrada não é medida até a migração.
  // Com vazão ligada, a conta é a de pior caso (sem reposição) e deve ser apresentada assim.
  let entradaConsiderada = true;
  let avisoEntrada = null;

  let vazaoLiquidaM3h = 0;
  let vazaoLiquidaLs = 0;

  if (config.possuiMedicaoVazao && temDadosVazao) {
    const saida = vazaoAtual > 0 ? vazaoAtual : 0;
    // Entrada desconhecida (null): não é zero medido. Estimativa = saída, sem reposição.
    const entrada = null;
    vazaoLiquidaLs = saida - (entrada ?? 0); // Positivo = esvaziando, Negativo = enchendo
    entradaConsiderada = false;
    avisoEntrada =
      "Estimativa sem considerar a entrada de água (pior caso): a vazão disponível é somente de saída.";
    if (confiabilidade === "Alta") confiabilidade = "Média";
    vazaoLiquidaM3h = vazaoLiquidaLs * 3.6;
  } else {
    if (config.possuiMedicaoVazao && !temDadosVazao) {
      fallbackUsoApenasNivel = true;
      mensagemFallback =
        "O cálculo passou a usar temporariamente somente o nível (dados de vazão ausentes).";
    }
    // Calculo baseado na variação percentual do nível ao longo do tempo em relação à capacidade útil
    if (niveisValidos.length >= 2) {
      const deltaNivelPorHora =
        niveisValidos[niveisValidos.length - 1] -
        niveisValidos[niveisValidos.length - 2];
      const taxaVolumeM3h = capacidade * (Math.abs(deltaNivelPorHora) / 100);
      if (deltaNivelPorHora > 0) {
        vazaoLiquidaM3h = -taxaVolumeM3h;
        vazaoLiquidaLs = -taxaVolumeM3h / 3.6;
      } else {
        vazaoLiquidaM3h = taxaVolumeM3h;
        vazaoLiquidaLs = taxaVolumeM3h / 3.6;
      }
    }
  }

  const volumeAtualM3 = capacidade * (nivelAtual / 100);

  let statusPreditivo = "Normal";
  let mensagemPreditiva = "";
  let minutosAteCritico = null;
  let minutosAteAtencao = null;
  let minutosAteNormal = null;

  if (vazaoLiquidaM3h < 0 && nivelAtual < config.nivelAtencao) {
    const volNormal = (capacidade * (config.nivelAtencao - nivelAtual)) / 100;
    const taxaEnchimentoM3h = Math.abs(vazaoLiquidaM3h);
    if (taxaEnchimentoM3h > 0) {
      const horasNormal = volNormal / taxaEnchimentoM3h;
      minutosAteNormal = Math.round(horasNormal * 60);
      mensagemPreditiva = `Nível subindo (${iconeTendencia}). Estimativa para normalizar (${config.nivelAtencao}%): ~${minutosAteNormal} min`;
    }
  } else if (vazaoLiquidaM3h > 0) {
    const volAtencao = capacidade * (config.nivelAlertaTempoAtencao / 100);
    const volCritico = capacidade * (config.nivelAlertaTempoCritico / 100);

    const horasAteAtencao =
      volumeAtualM3 > volAtencao
        ? (volumeAtualM3 - volAtencao) / vazaoLiquidaM3h
        : 0;
    const horasAteCritico =
      volumeAtualM3 > volCritico
        ? (volumeAtualM3 - volCritico) / vazaoLiquidaM3h
        : 0;

    minutosAteAtencao = Math.round(horasAteAtencao * 60);
    minutosAteCritico = Math.round(horasAteCritico * 60);

    const limiteCriticoMin = config.tempoCriticoMinutos;
    const limiteAtencaoMin = config.tempoAtencaoMinutos;

    if (
      minutosAteCritico <= limiteCriticoMin &&
      nivelAtual >= config.nivelCritico
    ) {
      statusPreditivo = "Crítico";
      mensagemPreditiva = `Risco de atingir nível crítico (<${config.nivelAlertaTempoCritico}%) em ~${minutosAteCritico} min (${iconeTendencia})`;
    } else if (
      minutosAteAtencao <= limiteAtencaoMin &&
      nivelAtual >= config.nivelAtencao
    ) {
      statusPreditivo = "Atenção";
      mensagemPreditiva = `Risco de atingir nível atenção (<${config.nivelAlertaTempoAtencao}%) em ~${minutosAteAtencao} min (${iconeTendencia})`;
    }
  }

  return {
    statusPreditivo,
    mensagemPreditiva,
    tendencia,
    iconeTendencia,
    minutosAteCritico,
    minutosAteAtencao,
    minutosAteNormal,
    vazaoLiquidaLs,
    vazaoLiquidaM3h,
    possuiMedicaoVazao: config.possuiMedicaoVazao,
    fallbackUsoApenasNivel,
    mensagemFallback,
    entradaConsiderada,
    avisoEntrada,
    confiabilidade,
  };
}
