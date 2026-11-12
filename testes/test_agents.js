// testes/test_agents.js - garante que .claude/agents espelha .github/agents
const assert = require('assert');
const { converterAgent, verificar } = require('../scripts/sincronizar_agents');

function executarTestesAgents() {
  console.log('\n--- Testes dos agents (espelho Claude Code) ---');

  const convertido = converterAgent('exemplo.agent.md',
    '---\nname: Exemplo Longo\ndescription: "Faz algo."\ntools: read, search\n---\nCorpo.\n');
  assert.ok(convertido.startsWith('---\nname: exemplo\ndescription: "Faz algo."\ntools: Read, Grep, Glob\n---\n'));
  assert.ok(convertido.endsWith('Corpo.\n'));

  const semTools = converterAgent('x.agent.md', '---\nname: X\ndescription: d\n---\nC\n');
  assert.ok(!/^tools:/m.test(semTools));

  assert.throws(() => converterAgent('x.agent.md', '---\nname: X\ndescription: d\ntools: execute\n---\nC'), /tool desconhecida/);
  assert.throws(() => converterAgent('x.agent.md', 'sem frontmatter'), /frontmatter/);

  assert.deepStrictEqual(verificar(), [], 'Rode "npm run agents:sync": .claude/agents está fora de sincronia');
  console.log('✓ Espelho .claude/agents em sincronia com .github/agents');
}

module.exports = executarTestesAgents;
