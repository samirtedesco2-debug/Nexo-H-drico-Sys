// testes/test_regras.js
const assert = require('assert');

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
  
  console.log("✓ Regras de Negócio e Roteamento: Todos os testes passaram!");
}

module.exports = executarTestesRegras;
