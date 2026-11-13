// testes/test_regras.js
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

function carregarRegrasNegocio() {
  const contexto = { window: {}, localStorage: { getItem: () => null }, console, Map, Date };
  vm.runInNewContext(fs.readFileSync(path.join(__dirname, '../src/regrasNegocio.js'), 'utf8'), contexto);
  return contexto;
}

function executarTestesBaseComparacaoAlarme() {
  const carregarCom = (valorGlobal) => {
    const contexto = {
      window: {},
      localStorage: { getItem: (chave) => (chave === 'nexo_hidrico_global_config' ? valorGlobal : null) },
      console, Map, Date,
    };
    vm.runInNewContext(fs.readFileSync(path.join(__dirname, '../src/regrasNegocio.js'), 'utf8'), contexto);
    return JSON.parse(JSON.stringify(contexto.obterBaseComparacaoAlarme()));
  };

  // Sem parâmetro salvo: padrão (mesmo dia da semana, 4 semanas), sem aviso.
  assert.deepStrictEqual(carregarCom(null), { base: 'same-weekday-4', aviso: null });
  assert.deepStrictEqual(carregarCom(JSON.stringify({ caminhoLocal: 'C:/x' })), { base: 'same-weekday-4', aviso: null });

  // Valor válido salvo pelo ADMIN é usado.
  assert.deepStrictEqual(carregarCom(JSON.stringify({ baseComparacaoAlarme: '7d-calendar' })), { base: '7d-calendar', aviso: null });
  assert.deepStrictEqual(carregarCom(JSON.stringify({ baseComparacaoAlarme: 'global' })), { base: 'global', aviso: null });

  // Valor inválido (ex.: o antigo "dia_anterior") cai no padrão COM aviso, nunca em base vazia.
  const invalido = carregarCom(JSON.stringify({ baseComparacaoAlarme: 'dia_anterior' }));
  assert.strictEqual(invalido.base, 'same-weekday-4');
  assert.ok(invalido.aviso && invalido.aviso.includes('dia_anterior'));

  // JSON ilegível também avisa.
  const ilegivel = carregarCom('{quebrado');
  assert.strictEqual(ilegivel.base, 'same-weekday-4');
  assert.ok(ilegivel.aviso);
}

function executarTestesClassificacaoAlarmes() {
  const regras = carregarRegrasNegocio();
  const { obterDirecaoDesvioVazao } = regras;
  // Objetos criados no contexto da VM têm outros protótipos; normaliza para comparar.
  const classificarAlarmesAtivos = (entrada) => JSON.parse(JSON.stringify(regras.classificarAlarmesAtivos(entrada)));
  const codigos = (entrada) => classificarAlarmesAtivos(entrada).map((a) => a.codigo);

  // Sem alarme: nada ativo (não deve cair em um código padrão).
  assert.deepStrictEqual(
    classificarAlarmesAtivos({ statusNivel: 'Normal', statusVazao: 'Normal', direcaoVazao: 'estável' }),
    []
  );

  // Nível: o código segue o status.
  assert.deepStrictEqual(codigos({ statusNivel: 'Crítico', statusVazao: 'Normal' }), ['ALM-NIV-01']);
  assert.deepStrictEqual(codigos({ statusNivel: 'Atenção', statusVazao: 'Normal' }), ['ALM-NIV-02']);
  assert.deepStrictEqual(codigos({ statusNivel: 'Inconsistente', statusVazao: 'Normal' }), ['ALM-DAT-02']);

  // Vazão: o código segue a DIREÇÃO; a severidade é a do status real, não a do código.
  assert.deepStrictEqual(
    classificarAlarmesAtivos({ statusNivel: 'Normal', statusVazao: 'Atenção', direcaoVazao: 'alta' }),
    [{ codigo: 'ALM-VAZ-02', severidade: 'Atenção', origem: 'vazao' }]
  );
  assert.deepStrictEqual(
    classificarAlarmesAtivos({ statusNivel: 'Normal', statusVazao: 'Crítico', direcaoVazao: 'baixa' }),
    [{ codigo: 'ALM-VAZ-01', severidade: 'Crítico', origem: 'vazao' }]
  );

  // Alarmes simultâneos não se escondem entre si; ausência de telemetria soma ALM-DAT-01.
  assert.deepStrictEqual(
    codigos({ statusNivel: 'Atenção', statusVazao: 'Crítico', direcaoVazao: 'alta', possuiLeiturasAusentes: true }),
    ['ALM-NIV-02', 'ALM-VAZ-02', 'ALM-DAT-01']
  );

  // Direção do desvio: usa o indicador que disparou, Crítico antes de Atenção.
  const indicador = (rotulo, direcao, status) => ({ rotulo, direcao, status, classificaAlerta: true });
  assert.strictEqual(
    obterDirecaoDesvioVazao({ indicadores: [indicador('Média', 'baixa', 'Normal'), indicador('Máxima', 'alta', 'Atenção')] }),
    'alta'
  );
  assert.strictEqual(
    obterDirecaoDesvioVazao({ indicadores: [indicador('Média', 'baixa', 'Atenção'), indicador('Máxima', 'alta', 'Crítico')] }),
    'alta'
  );
  // Sem indicador em alarme: mantém o comportamento anterior (primeiro indicador).
  assert.strictEqual(
    obterDirecaoDesvioVazao({ indicadores: [indicador('Média', 'baixa', 'Normal')] }),
    'baixa'
  );
  assert.strictEqual(obterDirecaoDesvioVazao(undefined), 'estável');
}

function executarTestesStatusNivel() {
  const raiz = path.join(__dirname, '..');
  const fonte = fs.readFileSync(path.join(raiz, 'src/regrasNegocio.js'), 'utf8');

  // Carrega regrasNegocio.js em um contexto isolado, com configuração por reservatório injetável
  // e, opcionalmente, as chaves de tempo real trocadas (são const no código-fonte).
  function carregar({ configuracoes = {}, salvos = {}, auditoria = false, nivelMedio = false } = {}) {
    const contexto = {
      window: { bancoDeDados: { configuracoes } },
      localStorage: {
        getItem: (chave) => (chave === 'nexo_hidrico_reservatorios_config' ? JSON.stringify(salvos) : null),
      },
      console, Map, Date,
    };
    const codigo = fonte
      .replace('const AUDITORIA_SENSOR_ATIVA = false;', `const AUDITORIA_SENSOR_ATIVA = ${auditoria};`)
      .replace('const COMPARACAO_NIVEL_MEDIO_ATIVA = false;', `const COMPARACAO_NIVEL_MEDIO_ATIVA = ${nivelMedio};`);
    vm.runInNewContext(codigo, contexto);
    return contexto;
  }

  // 1) Paridade: com as chaves desligadas e limites padrão (60/50), o resultado é idêntico ao da
  // versão simples que rodava antes em app.js, em todos os dados históricos do repositório.
  const padrao = carregar();
  const simplesAntiga = (valores) => {
    const validas = padrao.filtrarLeiturasNivelValidas(valores);
    let atual = null;
    for (let i = validas.length - 1; i >= 0; i--) {
      const v = validas[i];
      if (v !== null && v !== undefined && v !== '' && Number.isFinite(Number(v))) { atual = Number(v); break; }
    }
    if (atual === null) return 'Sem Dados';
    if (atual < 50) return 'Crítico';
    if (atual < 60) return 'Atenção';
    return 'Normal';
  };
  const pasta = path.join(raiz, 'dados_historicos');
  let comparados = 0;
  fs.readdirSync(pasta).filter((nome) => /^\d{4}_\d{2}\.json$/.test(nome)).forEach((nome) => {
    const mes = JSON.parse(fs.readFileSync(path.join(pasta, nome), 'utf8'));
    Object.values(mes.dias).forEach((dia) => {
      Object.entries(dia.reservatorios || {}).forEach(([chave, reservatorio]) => {
        const valores = reservatorio.leituras && reservatorio.leituras.nivel;
        if (!Array.isArray(valores)) return;
        // referência alta de propósito: com a comparação de nível médio desligada não pode influenciar
        assert.strictEqual(padrao.avaliarStatusNivel(valores, chave, 10), simplesAntiga(valores), `${nome} ${chave}`);
        comparados++;
      });
    });
  });
  assert.ok(comparados > 1000, 'a comparação deve cobrir o histórico');

  // 2) Limites, alerta e manutenção por reservatório passam a valer.
  const comLimites = carregar({ configuracoes: { 'R-X': { nivelAtencao: 40, nivelCritico: 20 } } });
  assert.strictEqual(comLimites.avaliarStatusNivel([55], 'R-X'), 'Normal');
  assert.strictEqual(comLimites.avaliarStatusNivel([35], 'R-X'), 'Atenção');
  assert.strictEqual(comLimites.avaliarStatusNivel([15], 'R-X'), 'Crítico');
  assert.strictEqual(comLimites.avaliarStatusNivel([55], 'R-OUTRO'), 'Atenção'); // padrão 60/50
  // configuração salva no navegador tem precedência sobre a do arquivo
  const salvo = carregar({ configuracoes: { 'R-X': { nivelAtencao: 40 } }, salvos: { 'R-X': { nivelAtencao: 70, nivelCritico: 50 } } });
  assert.strictEqual(salvo.avaliarStatusNivel([65], 'R-X'), 'Atenção');
  const manutencao = carregar({ configuracoes: { 'R-X': { emManutencao: true } } });
  assert.strictEqual(manutencao.avaliarStatusNivel([10], 'R-X'), 'Manutenção');
  const semAlerta = carregar({ configuracoes: { 'R-X': { alertaNivelAtivo: false } } });
  assert.strictEqual(semAlerta.avaliarStatusNivel([10], 'R-X'), 'Normal');
  assert.strictEqual(padrao.avaliarStatusNivel([null, null], 'R-X'), 'Sem Dados');
  assert.strictEqual(padrao.avaliarStatusNivel([70, 8204], 'R-X'), 'Normal'); // ignora valor inválido

  // 3) Auditoria do sensor (desligada hoje): quando ligada, volta a funcionar.
  const travado = [60, 60, 60, 60, 60, 60];
  assert.strictEqual(padrao.avaliarStatusNivel(travado, 'R-X'), 'Normal');
  const comAuditoria = carregar({ auditoria: true });
  assert.strictEqual(comAuditoria.avaliarStatusNivel(travado, 'R-X'), 'Inconsistente');
  assert.strictEqual(comAuditoria.avaliarStatusNivel([39.8, 83.2, 85.9, 88.5, 91.6, 92.4], 'R-X'), 'Inconsistente');
  assert.strictEqual(comAuditoria.avaliarStatusNivel([null, null], 'R-X'), 'Inconsistente');
  assert.strictEqual(comAuditoria.avaliarStatusNivel([70, 71, 8204, 72, 73, 74], 'R-X'), 'Inconsistente');

  // 4) Comparação do nível médio (desligada hoje): quando ligada, compara com a média histórica.
  const serie = [90.7, 89.2, 88, 86.4, 85.9, 84];
  assert.strictEqual(padrao.avaliarStatusNivel(serie, 'R-X', 46.9), 'Normal');
  const comMedia = carregar({ nivelMedio: true });
  assert.strictEqual(comMedia.avaliarStatusNivel(serie, 'R-X', 46.9), 'Crítico'); // variação muito acima de 25%
  assert.strictEqual(comMedia.avaliarStatusNivel(serie, 'R-X', 80), 'Normal');
}

function executarTestesValidacaoConfiguracao() {
  const { validarConfiguracaoReservatorio } = carregarRegrasNegocio();
  const valida = {
    alertaNivelAtivo: true, nivelAtencao: 60, nivelCritico: 50,
    nivelAlertaTempoAtencao: 40, nivelAlertaTempoCritico: 30,
    alertaNivelMedioAtivo: true, nivelMedioAtencao: 15, nivelMedioCritico: 25,
    alertaVazaoEntradaAtivo: true, vazaoEntradaAtencao: 20, vazaoEntradaCritico: 35,
    alertaVazaoSaidaAtivo: true, vazaoSaidaAtencao: 20, vazaoSaidaCritico: 35,
    alertaVazaoMediaAtivo: true, vazaoMediaAtencao: 20, vazaoMediaCritico: 35,
  };
  const problemas = (alteracoes) => Array.from(validarConfiguracaoReservatorio({ ...valida, ...alteracoes }));

  assert.deepStrictEqual(problemas({}), []);
  // nível: crítico deve ser menor que atenção, ambos entre 0 e 100
  assert.strictEqual(problemas({ nivelAtencao: 40, nivelCritico: 50 }).length, 1);
  assert.strictEqual(problemas({ nivelAtencao: 50, nivelCritico: 50 }).length, 1);
  assert.strictEqual(problemas({ nivelAtencao: 120, nivelCritico: 50 }).length, 1);
  assert.strictEqual(problemas({ nivelCritico: -1 }).length, 1);
  assert.strictEqual(problemas({ nivelAtencao: NaN }).length, 1);
  // desvios: crítico deve ser maior que atenção
  assert.strictEqual(problemas({ vazaoMediaAtencao: 40, vazaoMediaCritico: 35 }).length, 1);
  assert.strictEqual(problemas({ nivelMedioAtencao: 25, nivelMedioCritico: 25 }).length, 1);
  assert.strictEqual(problemas({ vazaoEntradaAtencao: -5 }).length, 1);
  // vários erros viram várias mensagens
  assert.strictEqual(problemas({ nivelAtencao: 40, nivelCritico: 50, vazaoSaidaAtencao: 50 }).length, 2);
  // alerta desligado: o par correspondente não é exigido
  assert.deepStrictEqual(problemas({ alertaNivelAtivo: false, nivelAtencao: 10, nivelCritico: 90 }), []);
  assert.deepStrictEqual(problemas({ alertaVazaoMediaAtivo: false, vazaoMediaAtencao: 90, vazaoMediaCritico: 10 }), []);
}

function executarTestesAutonomiaPreditiva() {
  const regras = carregarRegrasNegocio();
  const comConfig = (config) => {
    return (reservatorio) => {
      const ctx = { window: { bancoDeDados: null }, localStorage: { getItem: (k) => (k === 'nexo_hidrico_reservatorios_config' ? JSON.stringify({ R1: config }) : null) }, console, Map, Date };
      require('vm').runInNewContext(require('fs').readFileSync(require('path').join(__dirname, '../src/regrasNegocio.js'), 'utf8'), ctx);
      return JSON.parse(JSON.stringify(ctx.calcularAutonomiaEProjecao(reservatorio, 'R1')));
    };
  };
  const res = (nivel) => ({ leituras: { nivel, vazao: [] } });

  // Capacidade ausente ou inválida: sem número inventado, autonomia N/A.
  for (const capacidadeUtil of ['', undefined, 'abc', 0, -10]) {
    const r = comConfig({ capacidadeUtil })(res([70, 65, 60]));
    assert.strictEqual(r.capacidadeAusente, true, `capacidade ${capacidadeUtil}`);
    assert.strictEqual(r.minutosAteCritico, null);
    assert.strictEqual(r.statusPreditivo, 'Normal');
    assert.ok(/N\/A/.test(r.mensagemPreditiva));
  }
  assert.strictEqual(regras.obterCapacidadeUtil({ capacidadeUtil: '1200' }), 1200);
  assert.strictEqual(regras.obterCapacidadeUtil({ capacidadeUtil: '' }), null);

  // Vazão ligada: série é só de saída; entrada desconhecida => pior caso, rotulado.
  const comVazao = comConfig({ capacidadeUtil: 1000, possuiMedicaoVazao: true })({ leituras: { nivel: [80, 78, 75], vazao: [10, 10, 10] } });
  assert.strictEqual(comVazao.entradaConsiderada, false);
  assert.ok(/pior caso/.test(comVazao.avisoEntrada));
  assert.ok(comVazao.vazaoLiquidaLs === 10, 'líquida = saída quando a entrada é desconhecida');
  const semVazao = comConfig({ capacidadeUtil: 1000, possuiMedicaoVazao: false })(res([80, 78, 75]));
  assert.strictEqual(semVazao.entradaConsiderada, true);
  assert.strictEqual(semVazao.avisoEntrada, null);

  // Limite de normalização vem da configuração, não de 60 fixo.
  const sobe = comConfig({ capacidadeUtil: 1000, nivelAtencao: 70, nivelCritico: 40, nivelAlertaTempoAtencao: 70, nivelAlertaTempoCritico: 40 })(res([40, 45, 50]));
  assert.ok(/\(70%\)/.test(sobe.mensagemPreditiva), sobe.mensagemPreditiva);

  // Sem leituras de nível: sem dados.
  const semDados = comConfig({ capacidadeUtil: 1000 })(res([null, null]));
  assert.strictEqual(semDados.tendencia, 'Sem Dados');
  assert.strictEqual(semDados.minutosAteCritico, null);

  // Nível subindo: tendência e estimativa para normalizar, sem status de risco.
  const subindo = comConfig({ capacidadeUtil: 1000 })(res([40, 45, 50]));
  assert.strictEqual(subindo.tendencia, 'Subindo');
  assert.ok(subindo.minutosAteNormal > 0);
  assert.strictEqual(subindo.statusPreditivo, 'Normal');

  // Nível caindo rápido perto do limite: aponta risco.
  const caindo = comConfig({ capacidadeUtil: 1000 })(res([80, 70, 62]));
  assert.strictEqual(caindo.tendencia, 'Descendo');
  assert.ok(caindo.minutosAteCritico >= 0);
}

function executarTestesBaseMesmoDiaSemana() {
  const regras = carregarRegrasNegocio();
  const H = ['00:15', '01:15', '02:15'];
  const dia = (data, vazao) => ({ data, horarios: H, vazao });
  const ref = (dias, limite = 4) => JSON.parse(JSON.stringify(regras.calcularReferenciaVazaoPorHorario(dias, H, limite)));

  assert.strictEqual(regras.obterLimiteDiasValidosBase('same-weekday-4'), 4);
  assert.strictEqual(regras.obterLimiteDiasValidosBase('7d-calendar'), null);
  assert.strictEqual(regras.obterLimiteDiasValidosBase('global'), null);

  // Dias do mais recente para o mais antigo (t1 = terça passada ... t6 = 6 semanas atrás).
  // 4 terças completas: usa exatamente as 4 mais recentes (mesmo resultado de antes).
  const completas = ref([dia('t1', [10, 10, 10]), dia('t2', [10, 10, 10]), dia('t3', [10, 10, 10]),
    dia('t4', [10, 10, 10]), dia('t5', [99, 99, 99])]);
  assert.deepStrictEqual(completas.datas, ['t1', 't2', 't3', 't4']);
  assert.strictEqual(completas.maximo, 10);
  assert.deepStrictEqual(completas.datasSemVazaoValida, []);

  // Uma terça inteira sem vazão válida: busca a 5ª no lugar dela e informa a que faltou.
  const semUmDia = ref([dia('t1', [10, 10, 10]), dia('t2', [null, 0, null]), dia('t3', [10, 10, 10]),
    dia('t4', [10, 10, 10]), dia('t5', [12, 12, 12]), dia('t6', [99, 99, 99])]);
  assert.deepStrictEqual(semUmDia.datas, ['t1', 't3', 't4', 't5']);
  assert.strictEqual(semUmDia.maximo, 12);
  assert.deepStrictEqual(semUmDia.datasSemVazaoValida, ['t2']);
  Object.values(semUmDia.valoresPorHorario).forEach((valores) => assert.strictEqual(valores.length, 4));

  // Falta só um horário: a busca para trás vale só para esse horário.
  const semUmHorario = ref([dia('t1', [10, null, 10]), dia('t2', [10, 10, 10]), dia('t3', [10, 10, 10]),
    dia('t4', [10, 10, 10]), dia('t5', [20, 20, 20])]);
  assert.deepStrictEqual(semUmHorario.valoresPorHorario['00:15'], [10, 10, 10, 10]);
  assert.deepStrictEqual(semUmHorario.valoresPorHorario['01:15'], [10, 10, 10, 20]);
  assert.deepStrictEqual(semUmHorario.datasSemVazaoValida, []);

  // Menos de 4 válidas na janela: usa o que há (mínimo de 2 por horário segue valendo).
  const tres = ref([dia('t1', [10, 10, 10]), dia('t2', [null, null, null]), dia('t3', [11, 11, 11])]);
  assert.deepStrictEqual(tres.datas, ['t1', 't3']);
  assert.deepStrictEqual(tres.horariosReferencia, H);
  const so1 = ref([dia('t1', [10, 10, 10]), dia('t2', [null, null, null])]);
  assert.strictEqual(so1.media, null);
  assert.deepStrictEqual(so1.horariosReferencia, []);
  const avaliado = JSON.parse(JSON.stringify(regras.avaliarAlertaVazao([50, 50, 50], so1, H, 'R-TESTE')));
  assert.strictEqual(avaliado.status, 'Sem comparação');

  // Sem limite (bases de calendário): todos os dias da janela entram, como antes.
  const semLimite = ref([dia('a', [10, 10, 10]), dia('b', [10, 10, 10]), dia('c', [10, 10, 10]),
    dia('d', [10, 10, 10]), dia('e', [30, 30, 30])], null);
  assert.strictEqual(semLimite.maximo, 30);
  assert.strictEqual(semLimite.datas.length, 5);
}

function executarTestesVazaoPorHorario() {
  const regras = carregarRegrasNegocio();
  const H = ['00:15', '01:15', '02:15'];
  const dia = (data, vazao) => ({ data, horarios: H, vazao });
  const ref = (dias) => JSON.parse(JSON.stringify(regras.calcularReferenciaVazaoPorHorario(dias, H)));
  const avaliar = (atual, referencia) => JSON.parse(JSON.stringify(regras.avaliarAlertaVazao(atual, referencia, H, 'R-TESTE')));
  const indicador = (r, rotulo) => r.indicadores.find((i) => i.rotulo === rotulo);

  // Referência: mesmo horário nos dias da base; média/mín/máx reais do período (não médias de extremos).
  const dias = [dia('a', [10, 12, 14]), dia('b', [20, 12, 14]), dia('c', [10, 12, 14])];
  const r = ref(dias);
  assert.strictEqual(r.minimo, 10);
  assert.strictEqual(r.maximo, 20);
  assert.ok(Math.abs(r.media - (10 + 20 + 10 + 12 * 3 + 14 * 3) / 9) < 1e-9);
  assert.deepStrictEqual(r.horariosReferencia, H);

  // Horário com menos de 2 valores não entra; sem 2 dias com o mesmo horário não há referência.
  const parcial = ref([dia('a', [10, null, 14]), dia('b', [10, 12, 14])]);
  assert.deepStrictEqual(parcial.horariosReferencia, ['00:15', '02:15']);
  const unico = ref([dia('a', [10, 12, 14])]);
  assert.strictEqual(unico.media, null);
  assert.strictEqual(unico.minimo, null);
  assert.deepStrictEqual(unico.horariosReferencia, []);

  // Zero continua inconsistente: fora da referência.
  const comZero = ref([dia('a', [0, 12, 14]), dia('b', [10, 12, 14])]);
  assert.deepStrictEqual(comZero.horariosReferencia, ['01:15', '02:15']);

  // Vazão alta alarma por qualquer das 3 comparações; baixa NÃO alarma.
  const base = ref([dia('a', [10, 10, 10]), dia('b', [10, 10, 10])]);
  const alta = avaliar([13, 10, 10], base); // máxima +30% (>= 20%), média ~ +10%
  assert.strictEqual(indicador(alta, 'Máxima').status, 'Atenção');
  assert.strictEqual(alta.status, 'Atenção');
  const altaCritica = avaliar([14, 14, 14], base); // +40% nas 3
  assert.strictEqual(altaCritica.status, 'Crítico');
  ['Média', 'Mínima', 'Máxima'].forEach((rotulo) => {
    assert.strictEqual(indicador(altaCritica, rotulo).direcao, 'alta');
    assert.strictEqual(indicador(altaCritica, rotulo).status, 'Crítico');
  });
  const baixa = avaliar([5, 5, 5], base); // -50%
  assert.strictEqual(baixa.status, 'Normal');
  assert.strictEqual(indicador(baixa, 'Mínima').direcao, 'baixa');

  // Comparação alinhada: só os horários da referência entram no valor de hoje.
  const refParcial = ref([dia('a', [10, null, 10]), dia('b', [10, null, 10])]);
  const alinhado = avaliar([10, 99, 10], refParcial); // 99 está num horário sem referência
  assert.strictEqual(alinhado.status, 'Normal');
  assert.strictEqual(indicador(alinhado, 'Máxima').valorAtual, 10);

  // Hoje sem leitura num horário: a referência também ignora esse horário.
  const refDesigual = ref([dia('a', [10, 10, 100]), dia('b', [10, 10, 100])]);
  const semUltimo = avaliar([10, 10, null], refDesigual);
  assert.strictEqual(indicador(semUltimo, 'Máxima').valorAnterior, 10);
  assert.strictEqual(indicador(semUltimo, 'Média').valorAnterior, 10);
  assert.strictEqual(semUltimo.status, 'Normal');

  // Sem referência: sem comparação (não inventa).
  assert.strictEqual(avaliar([10, 10, 10], unico).status, 'Sem comparação');
}

function executarTestesRegras() {
  console.log("-> Executando testes de Regras de Negócio e Roteamento de Configuração...");
  
  function avaliarNivel(n) {
    if (n < 30) return "Crítico";
    if (n < 50) return "Atenção";
    return "Normal";
  }
  
  assert.strictEqual(avaliarNivel(20), "Crítico");
  assert.strictEqual(avaliarNivel(40), "Atenção");
  assert.strictEqual(avaliarNivel(70), "Normal");

  // Teste de mapeamento de chaves de reservatórios para IDs semânticos
  const chavesReservatorios = ["R-01", "R-02", "R-03"];
  chavesReservatorios.forEach(chave => {
    const idEsperado = `config-res-${chave}`;
    const datasetEsperado = chave;
    assert.strictEqual(idEsperado, `config-res-${chave}`);
    assert.strictEqual(datasetEsperado, chave);
  });
  
  executarTestesClassificacaoAlarmes();
  executarTestesStatusNivel();
  executarTestesValidacaoConfiguracao();
  executarTestesAutonomiaPreditiva();
  executarTestesVazaoPorHorario();
  executarTestesBaseComparacaoAlarme();
  executarTestesBaseMesmoDiaSemana();

  console.log("✓ Regras de Negócio e Roteamento: Todos os testes passaram!");
}

module.exports = executarTestesRegras;
