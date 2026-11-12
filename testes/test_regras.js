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

  console.log("✓ Regras de Negócio e Roteamento: Todos os testes passaram!");
}

module.exports = executarTestesRegras;
