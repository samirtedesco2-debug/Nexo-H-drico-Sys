# Diretrizes do Nexo Hídrico

## Contexto e arquitetura
- O Nexo Hídrico é uma aplicação web em JavaScript modular: `src/` contém interface, acesso a dados, persistência e regras de negócio; `dados_historicos/` e `indice_datas.json` são as fontes estáticas atuais.
- Os dados carregados hoje são arquivos locais históricos, não uma integração confirmada com telemetria operacional em tempo real. Sincronização entre janelas do navegador também não significa telemetria em tempo real.
- Consulte `docs_v2/README.md` para a documentação e atualize a documentação relacionada quando uma mudança alterar comportamento ou arquitetura.
- Preserve as convenções existentes e prefira mudanças pequenas que mantenham compatibilidade. Não adicione abstrações, dependências ou infraestrutura sem necessidade demonstrada.

## Segurança e domínio operacional
- Trate autenticação, autorização, RBAC e auditoria no navegador como controles locais, não como segurança confiável de servidor ou proteção adequada para produção.
- Não inclua segredos, credenciais reais ou dados pessoais/sensíveis em código, testes, documentação ou saídas.
- Não altere limites de alarmes, unidades, fórmulas hidráulicas, regras preditivas, reconhecimento de alarmes ou fluxos operacionais sem autorização explícita, justificativa e testes. O sistema apoia decisões de operadores; não presuma controle de equipamentos nem substituição de procedimentos operacionais.
- Represente falhas, dados ausentes, inválidos ou desatualizados explicitamente. Não invente leituras nem apresente um último valor conhecido como atual; preserve os avisos de carregamento e evite fallbacks silenciosos que indiquem sucesso incorretamente.

## Homologação e evolução para tempo real
- Durante desenvolvimento e homologação, use as fontes estáticas existentes e fixtures/dados sintéticos claramente identificados; nunca os descreva como telemetria real.
- Não habilite nem alegue integração em tempo real antes da homologação e da aprovação explícita de escopo, fonte e requisitos.
- Antes de propor ou implementar uma integração, identifique os contratos aprovados para formato e unidades, timestamps e fuso horário, ordenação e duplicidade, qualidade e atualidade da telemetria, indisponibilidade, timeout, reconexão, frequência, segurança e ambiente de testes. Não invente valores ou protocolos ausentes.
- Avalie o impacto nas fronteiras de carregamento, persistência, regras e interface; não presuma que trocar `apiClient.js` isoladamente resolve a migração. Autenticação, autorização e auditoria centralizadas exigem serviços confiáveis e revisão própria.

## Autorização e fluxo de trabalho
- Antes de alterar qualquer arquivo de código ou configuração do repositório, apresente objetivo, estratégia, arquivos afetados, riscos e validações e aguarde autorização explícita para esse escopo. Não considere autorização para uma tarefa como autorização para mudanças futuras ou não relacionadas.
- Antes de editar, inspecione o contexto relevante e o estado local do Git. Preserve alterações preexistentes do usuário; não as descarte, substitua ou inclua no escopo sem autorização.
- Faça a menor mudança completa, explique decisões relevantes e reporte arquivos alterados, verificações executadas e resultados. Nunca afirme que homologação, testes ou integração foram realizados sem evidência.

## Validação
- Use os scripts e padrões existentes. Execute `npm test` e, para mudanças que afetam a experiência no navegador, `npm run test:e2e`; valide também a sintaxe dos arquivos JavaScript alterados quando pertinente.
- Se não puder executar uma validação, informe o motivo e o que permaneceu sem verificação. Atualize testes e documentação relacionados ao comportamento alterado.
