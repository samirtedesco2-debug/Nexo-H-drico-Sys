// scripts/sincronizar_agents.js
// Gera os agents do Claude Code (.claude/agents/*.md) a partir da fonte
// única .github/agents/*.agent.md. Uso: node scripts/sincronizar_agents.js [--check]
const fs = require('fs');
const path = require('path');

const RAIZ = path.join(__dirname, '..');
const ORIGEM = path.join(RAIZ, '.github', 'agents');
const DESTINO = path.join(RAIZ, '.claude', 'agents');

// Nomes de tools do Copilot -> Claude Code.
const MAPA_TOOLS = { read: 'Read', search: 'Grep, Glob' };

function normalizar(texto) {
  return texto.replace(/\r\n/g, '\n');
}

function converterAgent(nomeArquivo, conteudo) {
  const nome = nomeArquivo.replace(/\.agent\.md$/, '');
  const partes = normalizar(conteudo).match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/);
  if (!partes) throw new Error(`${nomeArquivo}: frontmatter ausente ou inválido`);
  const [, frontmatter, corpo] = partes;
  const descricao = (frontmatter.match(/^description:\s*(.*)$/m) || [])[1];
  if (!descricao) throw new Error(`${nomeArquivo}: description ausente`);
  const toolsOrigem = (frontmatter.match(/^tools:\s*(.*)$/m) || [])[1];

  let saida = `---\nname: ${nome}\ndescription: ${descricao.trim()}\n`;
  if (toolsOrigem) {
    const tools = toolsOrigem.split(',').map((t) => t.trim()).filter(Boolean).map((t) => {
      if (!MAPA_TOOLS[t]) throw new Error(`${nomeArquivo}: tool desconhecida "${t}"`);
      return MAPA_TOOLS[t];
    });
    saida += `tools: ${tools.join(', ')}\n`;
  }
  saida += `---\n\n<!-- GERADO por scripts/sincronizar_agents.js a partir de .github/agents/${nomeArquivo}. Não edite aqui. -->\n${corpo}`;
  return saida;
}

function gerarTodos() {
  return fs.readdirSync(ORIGEM)
    .filter((f) => f.endsWith('.agent.md'))
    .sort()
    .map((f) => ({
      arquivo: f.replace(/\.agent\.md$/, '.md'),
      conteudo: converterAgent(f, fs.readFileSync(path.join(ORIGEM, f), 'utf8')),
    }));
}

// Retorna a lista de arquivos desatualizados, ausentes ou órfãos em .claude/agents.
function verificar() {
  const esperados = gerarTodos();
  const problemas = [];
  for (const { arquivo, conteudo } of esperados) {
    const destino = path.join(DESTINO, arquivo);
    if (!fs.existsSync(destino)) problemas.push(`${arquivo}: ausente`);
    else if (normalizar(fs.readFileSync(destino, 'utf8')) !== conteudo) problemas.push(`${arquivo}: desatualizado`);
  }
  if (fs.existsSync(DESTINO)) {
    const nomes = new Set(esperados.map((e) => e.arquivo));
    for (const f of fs.readdirSync(DESTINO)) {
      if (f.endsWith('.md') && !nomes.has(f)) problemas.push(`${f}: sem origem em .github/agents`);
    }
  }
  return problemas;
}

function sincronizar() {
  fs.mkdirSync(DESTINO, { recursive: true });
  const gerados = gerarTodos();
  for (const { arquivo, conteudo } of gerados) fs.writeFileSync(path.join(DESTINO, arquivo), conteudo, 'utf8');
  return gerados.map((g) => g.arquivo);
}

module.exports = { converterAgent, verificar, sincronizar };

if (require.main === module) {
  if (process.argv.includes('--check')) {
    const problemas = verificar();
    if (problemas.length) {
      console.error('Agents fora de sincronia (rode npm run agents:sync):\n- ' + problemas.join('\n- '));
      process.exit(1);
    }
    console.log('Agents em sincronia.');
  } else {
    console.log('Gerados: ' + sincronizar().join(', '));
  }
}
