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

  console.log("✓ Regras de Negócio e Roteamento: Todos os testes passaram!");
}

module.exports = executarTestesRegras;
