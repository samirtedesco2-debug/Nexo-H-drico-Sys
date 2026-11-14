# Histórico de Melhorias — Nexo Hídrico

Este documento registra o histórico cronológico de melhorias, refatorações e evoluções arquiteturais aplicadas ao sistema, originalmente desenvolvido para o CCO SAMAE.

---

## 📅 Outubro de 2026

### 1. Autenticação Obrigatória no Carregamento Inicial
* **Data:** 27 de Outubro de 2026
* **Descrição:** Integração da verificação de sessão e exibição de login do `AuthUI` no evento `DOMContentLoaded` (`src/app.js`). O sistema agora exige autenticação por usuário e senha imediatamente ao abrir via Live Server, caso não exista sessão ativa no `localStorage`.

### 2. Isolamento de Bancos de Dados IndexedDB (`SamaeAuthDB` & `SamaeHandlesDB`)
* **Data:** 27 de Outubro de 2026
* **Descrição:** Resolução definitiva do erro `VersionError` e `NotFoundError` separando as responsabilidades de persistência em IndexedDB:
  - **`SamaeAuthDB`**: Banco exclusivo para autenticação, tabela de usuários e trilha de auditoria.
  - **`SamaeHandlesDB`**: Banco exclusivo para armazenamento de *handles* de arquivos do File System Access API.

### 3. Fundo Visual Imersivo de Reservatório Industrial (Base64 SVG)
* **Data:** 27 de Outubro de 2026
* **Descrição:** Na versão daquela data, o fundo da tela de login foi substituído por uma arte vetorial SVG em alta resolução codificada em Base64 (`btoa`), retratando uma estrutura monumental de reservatório industrial de concreto brutalista com desfoque atmosférico (`backdrop-filter: blur(14px)`) e vinheta noturna. A implementação atual carrega `manual-imagens/login.jfif`.

### 4. Painel ADMIN de Gerenciamento de Usuários
* **Data:** 27 de Outubro de 2026
* **Descrição:** Criação da interface dedicada de cadastro de novos usuários no painel de configurações (`#btn-gerenciar-usuarios`), acessível **exclusivamente para perfis ADMIN**. 
* **Regra de E-mail Obrigatório:** Remoção da geração automática de e-mail e imposição de obrigatoriedade de preenchimento do e-mail corporativo individual para cada operador cadastrado.

### 5. Seção Dedicada de Parâmetros Globais
* **Data:** 27 de Outubro de 2026
* **Descrição:** Extração dos parâmetros globais (Formulário I de plantão e Timers, Formulário II de manutenção e SLA) de dentro dos formulários individuais de reservatórios, criando uma aba e botão dedicados no menu lateral (`#btn-config-parametros-globais`) com persistência em `samai_global_config`.

### 6. Identificadores Semânticos e Robustez de Seletores
* **Data:** 27 de Outubro de 2026
* **Descrição:** Substituição de seletores numéricos frágeis baseados em ordem (`nth-child`) por IDs e atributos semânticos explícitos (`id="config-res-${chave}"`, `id="btn-gerenciar-usuarios"`, `id="btn-config-parametros-globais"`), garantindo endereçamento direto e imune a reordenações no DOM.

### 7. Sincronização Multi-Monitor CCO, Persistência Síncrona e Auditoria Unificada
* **Data:** 30 de Outubro de 2026
* **Descrição:** 
  - **Múltiplos Monitores CCO**: Restauração da abertura do Mural de Alarmes em janela separada otimizada (`window.open` em `?view=exceccoes`) com gerenciamento automático de ciclo de vida (`beforeunload` para fechar janelas filhas ao sair).
  - **Persistência Síncrona**: Utilização de `localStorage` síncrono e `StorageRepository` (IndexedDB) para garantir gravação instantânea de ACKs e incidentes sem perdas por fechamento rápido de janela.
  - **Sincronização em Tempo Real**: Propagação bidirecional via `BroadcastChannel` e eventos `storage`.
  - **Auditoria Unificada**: Integração completa das ações operacionais de ACK/revogação na trilha central de auditoria (`AuthRepository`), exibindo todos os eventos na tabela de **Logs de Auditoria & Sistema**.

### 8. Simplificação do Botão de Ordenação e Imutabilidade de Timestamps de Alarme
* **Data:** 31 de Outubro de 2026
* **Descrição:** 
  - **Botão de Ordenação (`#btn-mural-sort-toggle`)**: Retirada do texto descritivo, mantendo apenas o ícone `⏱️` para melhor aproveitamento de espaço na barra de ferramentas operacional.
  - **Timestamps de Acionamento Imutáveis e Persistentes**: O carimbo de data/hora de acionamento dos alarmes (`Acionado em`) passou a ser vinculado à chave composta (`dataSelecionada_chave`) e persistido em `localStorage` (`samae_cco_trigger_times`). Isso garante que o horário original de disparo não seja redefinido em reaberturas, atualizações ou trocas de turno.

### 9. Aprimoramentos Operacionais do Mural CCO (ACK com Operador, Ícones Dinâmicos e Reordenação de Tabela)
* **Data:** 31 de Outubro de 2026
* **Descrição:** 
  - **Metadados de ACK Desacoplados (`window.ccoAckMetadata`)**: Armazenamento e exibição do carimbo de data/hora exato do reconhecimento e do nome do operador responsável diretamente no botão de ACK e tooltips dos cards/tabela, mantendo `window.ccoReconhecidos` compatível com a sincronização multi-janela e `StorageRepository`.
  - **Ordenação Estrita por Horário**: No modo de ordenação por horário (`horario`), o mural ignora a severidade e classifica estritamente de forma cronológica pelo momento de disparo.
  - **Ícones Dinâmicos nos Botões de Controle**: Os botões de alternância de visualização (`#btn-mural-view-toggle`: `🗂️` Grid, `📋` Tabela, `📊` Kanban) e ordenação (`#btn-mural-sort-toggle`: `⏱️` Horário, `⚠️` Severidade) alternam seus ícones dinamicamente.
  - **Reordenação da Tabela Comparativa**: A coluna **"Acionado em"** foi reposicionada para o primeiro lugar (à esquerda), antecedendo a coluna **"TAG / Reservatório"**.

### 10. Catálogo Centralizado de Taxonomia de Alarmes e Diagnósticos (`taxonomia_alarmes.json`)
* **Data:** 31 de Outubro de 2026
* **Descrição:** 
  - **Padronização Operacional**: Criação do arquivo `dados_historicos/taxonomia_alarmes.json` contendo códigos padronizados (`ALM-NIV-01`, `ALM-VAZ-01`, `ALM-DAT-01`, etc.), categorias, severidades e templates de mensagens com linguagem operacional clara e orientada à ação imediata para os operadores do CCO.

### 11. Unificação de Regras Mural-Cards e Exibição de Telemetria
* **Data:** 31 de Outubro de 2026
* **Descrição:** 
  - **Paridade Total**: Unificação completa da lógica de cálculo de nível e vazão no mural de exceções (`obterReservatoriosComAlertaOuExcecao`) utilizando exatamente as mesmas funções dos cards principais (`avaliarStatusNivel` com referência histórica e `avaliarAlertaVazao`), eliminando divergências e alarmes fantasmas.
  - **Integração da Taxonomia**: O mural passou a exibir mensagens padronizadas limpas e diretas baseadas nas categorias do catálogo (ex: "Nível Crítico", "Vazão Baixa", "Sem Comunicação").
  - **Indicadores de Telemetria nos Cards**: Inclusão de selos de status `Inconsistente` diretamente no cabeçalho dos cartões de monitoramento sempre que houver falhas de comunicação ou leituras ausentes na madrugada.

## 📅 Novembro de 2026

### 12. Persistência e consistência dos reconhecimentos de alarmes
* **Data:** 2 de Novembro de 2026
* **Antes:** A abertura do IndexedDB podia apagar o banco inteiro se faltasse uma store; metadados do ACK ficavam apenas no `localStorage`; revogações podiam ser restauradas por snapshots antigos; e renderizações repetidas podiam inserir novamente o último incidente no histórico.
* **Agora:** A versão 2 do `SamaeCCOStorageDB` cria stores ausentes sem apagar as existentes, persiste metadados junto ao reconhecimento e registra revogações como tombstones. O histórico operacional é gravado na ação explícita e leituras removem duplicatas entre IndexedDB e `localStorage`.
* **Por quê:** Preservar dados existentes e reduzir divergências entre a interface, IndexedDB e o fallback legado.
* **Validação:** Testes automatizados de migração, persistência, revogação, recuperação de snapshots legados e deduplicação do histórico em `testes/test_storage_repository.js`.

### 13. Precedência do estado local e cobertura de regressão
* **Data:** 2 de Novembro de 2026
* **Antes:** Um `_estado_plantao` vindo de `config_reservatorios.json` podia substituir reconhecimentos e logs mais recentes já carregados do armazenamento local.
* **Agora:** `apiClient.js` usa o estado do arquivo como fallback somente quando o estado local ainda não foi carregado.
* **Por quê:** Evitar que uma cópia antiga da configuração reverta o estado atual do navegador.
* **Validação:** `testes/test_api_client_config.js` cobre a precedência do estado local e o fallback do arquivo quando o estado local não está disponível.

### 14. Metadados, sincronização entre abas e tempo de resposta
* **Data:** 2 de Novembro de 2026
* **Antes:** Metadados do ACK não acompanhavam a sincronização entre abas e o tempo de resposta podia ser calculado a partir de uma propriedade diferente da que armazena os horários de acionamento.
* **Agora:** Mensagens `ACK_ALARM` e `SYNC_RECONHECIDOS` incluem metadados e histórico operacional; o cálculo do tempo usa o timestamp armazenado por data e reservatório, retornando indisponível quando não há horário válido.
* **Por quê:** Melhorar a consistência dos detalhes do ACK entre janelas e evitar durações inventadas quando o timestamp está ausente.
* **Validação:** Testes automatizados cobrem o cálculo do tempo e a propagação de metadados entre janelas simuladas.
* **Limitações conhecidas:** Snapshots completos ainda podem sobrescrever alterações concorrentes entre abas; o timestamp representa quando a interface detectou o alerta, não necessariamente o início real da condição; e IndexedDB e histórico operacional não são gravados em uma única transação. A suíte usa mock de IndexedDB e não substitui testes em navegador real.

### 15. Clareza visual e navegação no Mural CCO
* **Data:** 2 de Novembro de 2026
* **Antes:** Os contadores excluíam alarmes reconhecidos que continuavam visíveis; o ACK reduzia a opacidade do alerta; cards Kanban e linhas da tabela não tinham abertura acessível por teclado; e a mensagem de estado vazio não distinguia busca sem resultado da ausência de alarmes.
* **Agora:** Contadores refletem todos os alarmes ativos, com nota explicativa; alarmes reconhecidos mantêm contraste e exibem selo próprio; cards e Kanban abrem detalhes com Enter/Espaço, e a tabela tem botão explícito para abrir o reservatório. Estados vazios agora permitem limpar a busca ou voltar a todos os alarmes.
* **Por quê:** Manter os indicadores coerentes com a lista e tornar o estado do reconhecimento, a navegação e os resultados da busca mais claros.
* **Validação:** Suíte automatizada, verificações de sintaxe e revisão do diff.

### 16. Avisos de dados, autenticação e testes automatizados de navegador
* **Data:** 3 de Novembro de 2026
* **Agora:** Falhas de carregamento de dados são apresentadas no painel; a recuperação por e-mail foi desativada porque a versão local não verifica identidade; rótulos e preenchimento automático dos campos de login foram revisados; e o mural aberto por `?view=exceccoes` é selecionado após a inicialização da navegação.
* **Validação:** CI verifica a sintaxe JavaScript e executa testes unitários e E2E no Chromium. Os cenários de navegador cobrem login, logout e novo login, isolamento de bloqueio entre contas, aviso de dados incompletos e persistência/sincronização de ACK. O usuário também informou que todos os itens do ensaio manual com operador foram concluídos com sucesso.
* **Limitação:** a autenticação e os dados permanecem locais ao navegador. A aprovação dos testes automatizados e do ensaio operacional não substitui autenticação, autorização e persistência confiáveis para produção.

### 17. Identidade visual Nexo Hídrico
* **Data:** 3 de Novembro de 2026
* **Agora:** O logotipo vetorial é exibido no cabeçalho e na tela de login. O nome do produto também aparece no título da aba e no favicon; a documentação apresenta a nova identidade.
* **Validação:** SVGs verificados, teste E2E confirma o logotipo no login e no cabeçalho, e os demais testes continuam aprovados.

### 18. Migração compatível dos identificadores locais
* **Data:** 3 de Novembro de 2026
* **Agora:** Os identificadores de contas, bancos IndexedDB, chaves `localStorage`, variáveis globais, elementos de autenticação e canal entre janelas usam a identidade Nexo Hídrico. A inicialização migra as contas `admin.samae` e `agent.samae` para `admin.nexo` e `operador.nexo`, preservando credenciais, papéis, bloqueios, tentativas, sessões e dados operacionais; as bases e chaves antigas permanecem intactas como cópia de segurança.
* **Validação:** Teste E2E cobre migração de contas, auditoria, sessões, configurações, notificações, reconhecimentos, logs e handles de arquivo.

### 19. Otimização de Performance, Abertura de Janelas e Anti-Flicker (CCO)
* **Data:** 6 de Novembro de 2026
* **Agora:** 
  - **Sincronização Zero-Fetch (`BroadcastChannel`)**: Janelas secundárias de visão (`?view=...`) solicitam o banco de dados diretamente da janela principal em memória, evitando re-fetches de arquivos JSON e reduzindo drasticamente o tempo de abertura.

### 20. Visão Dedicada de Investigação de Alarme (`?view=investigacao`)
* **Data:** 11 de Novembro de 2026
* **Agora:** Criação de uma aba/visão dedicada (`?view=investigacao&reservatorio=...&origem=mural`) para a investigação de alarmes, separando-a da Visão Operacional padrão. A tela exibe exclusivamente o cabeçalho CCO lean e o painel informativo do alarme (`reservoir-alarm-info`) com taxonomia, dados da leitura violada e tempo de resposta, sem poluição visual com cartões operacionais ou gráficos analíticos.
* **Validação:** Suíte de testes unitários e testes E2E do Playwright (`clique no mural abre o reservatório direto na investigação`) aprovados com 100% de sucesso.
  - **Anti-Flicker e Early View Binding**: Inclusão de script síncrono no cabeçalho de `index.html` e regras CSS antecipadas (`data-active-view`) para pintar a visão correta no primeiro frame, eliminando qualquer transição visível da tela principal.
  - **Manifesto PWA (`manifest.json`)**: Configurado com `background_color` escuro para que o S.O. pinte a janela nativa sem o clarão branco inicial (*white flash*).
  - **Debounce no Loader (`NexoLoader`)**: Adicionado atraso de 1000ms para evitar piscadas do loader em operações rápidas.
* **Validação:** Testes unitários e suíte E2E do Playwright (`100% aprovados`).

### 20. Padronização para Inteligência Operacional, Redesenho do Nexo Loader e Modal de Notificações com Download
* **Data:** 8 de Novembro de 2026
* **Agora:** 
  - **Padronização Terminológica**: Substituição completa do termo "Centro de Controle Operacional" por **"Inteligência Operacional"** em títulos, rodapés, eyebrows e relatórios do sistema.
  - **Redesenho do Nexo Loader**: Remoção do card externo de fundo, apresentando um vídeo ampliado (`320x320px`) com sombra difusa, brilho imersivo e texto flutuante limpo.
  - **Navegação Instantânea de Abas**: Remoção do loader automático de 350ms na troca de abas (`ativarAba`), tornando a transição de visões instantânea e sem piscadas.
  - **Correção da Central de Notificações**: Alteração do popover de notificações para `position: fixed`, evitando que ficasse preso ou cortado dentro do header.
  - **Modal Detalhado de Notificações & Download de TXT**: Adição de modal com fundo desfocado (`backdrop-filter`) para leitura completa de comunicados longos, tipos traduzidos para o português (`Atualização`, `Manutenção`, `Comunicado`, `Sistema`), notificação longa de teste automática (`notif-long`) e botão para baixar o comunicado em formato de texto (`.txt`).
* **Validação:** Todos os testes automatizados da suíte (`npm test`) executados e aprovados com sucesso.

---
*Nexo Hídrico — Inteligência Operacional*

### Investigação de alarme e vazão por horário
* **Descrição:** Tela de investigação: removido "Voltar ao Mural", cabeçalho com "Alarme acionado em", resumo por origem (nível, vazão, comunicação) acima do botão da OS. Regra de vazão: referência por horário (média, menor e maior valor do período), 3 comparações separadas e alarme só para vazão **alta**; zero segue inconsistente, com aviso de "vazão sem leitura válida" quando todas as leituras do dia são zero/inconsistentes.
* **OS:** formato curto, sem TAG nem linha de boletim: nome do reservatório, cada alarme com o mesmo dado da tela logo abaixo e uma recomendação de uma linha (Crítico: acionar equipe de campo; só dados: verificar a telemetria; Atenção: sem recomendação). Recomendações são sugestões, não procedimento oficial.

### Base de comparação dos alarmes parametrizada (ADMIN)
* **Antes:** o seletor "Base de comparação" da tela operacional decidia também quais alarmes disparavam no Mural; a investigação e a OS usavam `"dia_anterior"` como reserva, valor que não existe e deixaria a referência de vazão vazia.
* **Agora:** os alarmes (Mural, investigação, OS, informativo do alarme e resumo de plantão) usam `obterBaseComparacaoAlarme()` (`regrasNegocio.js`), lida de Parâmetros Globais. Padrão: mesmo dia da semana nas últimas 4 semanas, o mesmo valor que já vinha selecionado, então os alarmes não mudam com a configuração padrão. Só ADMIN altera; a troca vai para a auditoria (`BASE_ALARME_ALTERADA`). O seletor da tela operacional passa a ser só de análise, com o indicador "Alarmes usam: …" abaixo dele; a investigação mostra a base no cabeçalho. Valor inválido usa o padrão com aviso visível; janelas abertas recalculam pelo evento `storage`.
* **Validação:** testes unitários de `obterBaseComparacaoAlarme` (padrão, válido, inválido, ilegível) e E2E (ADMIN altera e audita, Agent não acessa, investigação mostra a base e acompanha a troca em outra janela).

### Base "mesmo dia da semana": 4 dias válidos com busca para trás
* **Antes:** a base usava as terças (por exemplo) das últimas 4 semanas corridas; dia sem vazão reduzia a referência, e com menos de 2 dias válidos o alarme de vazão ficava inativo sem aviso no Mural.
* **Agora:** por horário, entram os 4 dias mais recentes do mesmo dia da semana com vazão válida; se faltar dado, busca a semana anterior, até 8 semanas. Achando menos de 4, usa o que houver (mínimo de 2 por horário). Sem falta de dado o resultado é o mesmo de antes. A investigação (e a OS) mostra os dias usados e os que ficaram sem vazão válida; o Mural exibe uma faixa informativa quando a vazão de um reservatório fica sem base (não é alarme). A comparação de nível médio (desligada) e as estatísticas por horário do analítico seguem a mesma regra.
* **Validação:** testes unitários (4 completas, terça sem vazão, horário isolado, menos de 4, sem base, bases de calendário sem limite) e E2E com os dados reais (busca da 5ª semana e faixa do Mural).

### Investigação: vazão sem leitura como N/A e reconhecimento sincronizado
* **Vazão de saída:** sem leitura válida no dia (vazia ou zerada), a investigação mostra "N/A (sem leitura válida)" em vez de "0 L/s".
* **Reconhecimento entre janelas:** ACK ou revogação feitos no Mural (ou em outra janela) agora redesenham a janela de investigação aberta (`CcoSync.atualizarAposMudancaAck`). Antes o botão ficava com o estado antigo, e um clique gravava de novo um ACK já feito ou tentava revogar um já revogado. O fluxo de reconhecimento em si não mudou.
* **Validação:** E2E com duas janelas (ACK e revogação no Mural refletidos na investigação; vazão zerada exibida como N/A); o teste falha sem a correção.

### Investigação: tendência sob o medidor e vazão líquida com origem
* **Tendência** (do nível, duas últimas leituras) saiu do card de parâmetros e fica abaixo do medidor, junto do status.
* **Vazão líquida** no card de parâmetros, sempre com a origem: com medição de vazão a entrada não é medida, então mostra "X L/s = saída (entrada não medida)" sem afirmar enchendo/esvaziando (contradiria a tendência do nível); sem medição de vazão, "X L/s enchendo/esvaziando (pela variação do nível)"; sem capacidade útil ou leituras de nível, N/A com o motivo. `calcularAutonomiaEProjecao` passa a devolver `origemVazaoLiquida` ("saida", "nivel" ou null); a fórmula não mudou.
* **Validação:** testes unitários de `origemVazaoLiquida` e E2E dos três casos na investigação.

### Investigação: limpeza visual e docs_v2 atualizado
* **Tela:** título "Diagnóstico do Alarme" (antes "Informações do Alarme Ativado e Diagnóstico Unificado"), rótulo do cabeçalho "Investigação de Alarme", card "Parâmetros Operacionais" (sem "Atuais": os dados são do boletim, não tempo real) e cards do medidor e dos parâmetros com a mesma altura. A linha "Nível: X% (estado)" saiu do resumo da tela, porque o medidor já mostra valor e status; continua na OS.
* **docs_v2:** fluxo de navegação (view `?view=investigacao`, sem a tecla Esc), mapa do DOM (ids reais das abas, cabeçalho, cards da investigação e faixa do Mural), módulos `app`, `ui`, `ccoSync` e `regrasNegocio` alinhados ao código.

### Texto digitado nunca vira HTML (Mural, auditoria, relatórios, Parâmetros Globais)
* **Antes:** a nota do reconhecimento (texto livre) entrava crua por `innerHTML` nos 3 modos do Mural e no relatório HTML exportado; o usuário digitado num login com falha entrava cru na tabela de auditoria (tela e impressão), executando como código quando um ADMIN a abria; os valores de Parâmetros Globais eram colados em `value="..."`; o toast também usava `innerHTML`. Uma nota inocente com `<`, `&` ou aspas já saía cortada.
* **Agora:** Mural (grade, kanban, tabela) montado com `createElement`/`textContent` e eventos por `addEventListener` (sem `onclick` em atributo); tabela de auditoria e toast idem; relatórios gerados como string (plantão, corporativo, trilha de auditoria impressa) passam os valores por `escaparHtml`; Parâmetros Globais preenche os campos via `.value`. Visual e fluxo de ACK inalterados.
* **CSV (auditoria e alarmes):** cada célula passa por `celulaCsv`: entre aspas, aspas internas dobradas e apóstrofo antes de `=`, `+`, `-`, `@`, tab ou quebra de linha. Antes, um usuário digitado num login com falha como `=HYPERLINK(...)` virava fórmula ao abrir a trilha de auditoria no Excel, e aspas internas quebravam as colunas. Ponto e vírgula dentro do texto não é mais trocado por vírgula (as aspas já o protegem).
* **Validação:** E2E com `<img onerror>`, `<`, `&` e aspas na nota (3 modos do Mural e relatório exportado), no usuário de login (auditoria) e nos Parâmetros Globais, e com `=HYPERLINK(...)` no usuário de login (CSV da auditoria e de alarmes); os 4 testes falham no código anterior.

### Investigação: botão para a Visão Operacional
* **Agora:** o painel "Diagnóstico do Alarme" tem o botão "📊 Ver na Visão Operacional", que abre (ou reaproveita) a janela da Visão Operacional já filtrada no reservatório e na data investigados, com card, gráficos e informativo do alarme. A Visão Operacional passou a respeitar `?data=`; data inexistente fica na última data e avisa.
* **Validação:** E2E clica no botão e confere view, reservatório e data na nova janela, e o aviso com data inexistente.

### Janela própria para a nota do reconhecimento
* **Antes:** a nota do ACK era pedida por `prompt()` nativo do navegador, e Cancelar **reconhecia o alarme mesmo assim**, sem nota. A revogação (ADMIN) e o aviso de acesso negado também usavam `confirm`/`alert` nativos.
* **Agora:** janela modal no estilo do painel (`abrirDialogoCco` em `ui.js`, tema claro/escuro pelos tokens): reservatório e severidade no topo, campo de nota opcional, Cancelar e Reconhecer. Cancelar, Esc ou ✕ **não reconhecem**; Ctrl+Enter confirma. A revogação pede confirmação na mesma janela (foco inicial em Cancelar) e o acesso negado vira aviso. Se o alarme for reconhecido/revogado em outra janela enquanto ela está aberta, nada é gravado e um toast avisa. Nota sem limite de tamanho, como antes; dados gravados, auditoria e sincronização inalterados.
* **Validação:** E2E (Cancelar e Esc sem ACK, nota com HTML gravada como texto, mudança em outra janela, revogação cancelada, acesso negado com perfil Agent); E2E de ACK existentes adaptados à janela.

### Fim dos alert/confirm nativos no painel
* **Antes:** confirmação de logout, erros (falha ao gravar o reconhecimento, ao copiar o resumo, pop-up bloqueado, navegador sem suporte, falha ao vincular arquivo) e avisos de "sem dados" usavam `alert`/`confirm` do navegador.
* **Agora:** a janela do reconhecimento virou a janela do painel (`abrirDialogoCco`, `#dialogo-cco`, `.dialogo-cco*`). Logout pede confirmação nela (Cancelar mantém a sessão; foco inicial em Cancelar); os erros aparecem como aviso com "Entendi", que não some sozinho; os avisos de "Nenhum dado carregado/para exportar" viram toast de atenção. Nenhum fluxo mudou, só a forma de exibir.
* **Validação:** E2E de logout (Cancelar e Sair), falha simulada ao gravar a revogação (aviso visível, estado preservado) e toast de exportação vazia.
