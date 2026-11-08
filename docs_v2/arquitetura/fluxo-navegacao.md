# Fluxo de Navegação (User Flow) & Sitemap — Nexo Hídrico

Este documento descreve o mapa de navegação (*Sitemap*) e os fluxos de interação do usuário (*User Flows*) dentro do sistema de **Inteligência Operacional (Nexo Hídrico)**.

---

## 1. Visão Geral do Arquitetura de Navegação (Sitemap)

```
[ Acesso Inicial / URL Root ]
       │
       ├──► [ Tela de Autenticação (Login) ] ──► (Sucesso / Credenciais Válidas)
       │         │
       │         └──► [ Primeiro Acesso / Redefinição de Senha (Se aplicável) ]
       │
       └──► [ Painel Principal / View Launcher ]
                 │
                 ├──► 1. Visão Operacional (tab-operacional | ?view=operacional)
                 │         ├── Monitoramento de Reservatórios & Cards
                 │         ├── Filtros de Status (Crítico, Atenção, Normal)
                 │         └── Investigação Detalhada de Alarme
                 │
                 ├──► 2. Visão Analítica (tab-analitico | ?view=analitico)
                 │         ├── Tendências & Comparações Históricas
                 │         └── Gráficos de Telemetria
                 │
                 ├──► 3. Visão de Engenharia (tab-engenharia | ?view=engenharia)
                 │         ├── Dados Detalhados & Rastreabilidade
                 │         └── Relatórios Técnicos
                 │
                 ├──► 4. Mural de Alarmes CCO (tab-alarmes | ?view=alarmes)
                 │         ├── Alertas Ativos & Reconhecimento (ACK) com Metadados de Operador
                 │         ├── Modos de Exibição (Grid, Tabela, Kanban)
                 │         ├── Exportação Multiformato (Relatório HTML, CSV, Cópia de Plantão)
                 │         └── ──► [ Drill-Down: Clique em Alarme / Reservatório ]
                 │                   │
                 │                   └──► [ Visão Operacional em Modo Investigação ]
                 │                             (Parâmetro: ?view=operacional&origem=mural&reservatorio=R01-A)
                 │                             ├── Exibe dados detalhados do reservatório investigado
                 │                             └── Botão "Voltar ao Mural" ou Tecla [Esc] ──► Retorna ao Mural de Alarmes
                 │
                 └──► 5. Configurações & Parâmetros Globais (ADMIN)
                           ├── Parâmetros de Plantão e SLAs
                           └── Gestão de Usuários (Cadastro e Controle de Papéis RBAC)
```

---

## 2. Portão de Autenticação e Segurança (RBAC)

1. **Carregamento Inicial (`DOMContentLoaded`):**
   - O sistema verifica se existe uma sessão ativa no `localStorage`.
   - Se não houver, exibe o overlay de autenticação (`#nexo-auth-overlay`) com o fundo imersivo de reservatório industrial.
2. **Autenticação de Operadores:**
   - O usuário insere credenciais (ex: `admin.nexo` / `Admin@2026` ou operador).
   - O repositório valida no banco criptografado/isolado em IndexedDB (`SamaeAuthDB`).
3. **Controle de Acesso Baseado em Funções (RBAC):**
   - **ADMIN:** Acesso total, incluindo gerenciamento de usuários (`#btn-gerenciar-usuarios`) e parâmetros globais.
   - **Operador:** Acesso ao monitoramento, ACK de alarmes e relatórios operacionais.

---

## 3. Painel Principal e Seletor de Visões (View Launcher)

- Após o login bem-sucedido, a aplicação exibe o **View Launcher** (cartões de escolha rápida de visão) e a barra de navegação superior com das abas principais.
- **Navegação Instantânea (Zero-Latency):**
  - O clique em qualquer aba ativa a visão correspondente instantaneamente, sem atrasos ou overlays bloqueantes, garantindo fluidez operacional absoluta no CCO.
- **Abertura em Janelas Desacopladas (Multi-Monitor):**
  - Cada visão possui suporte para abertura em janela independente (`window.open` com query param `?view=...`), permitindo que operadores distribuam o monitoramento em múltiplos monitores.
  - A sincronização em tempo real entre janelas é mantida de forma síncrona através de `BroadcastChannel` (`nexo_hidrico_cco_link`) e eventos `storage`.

---

## 4. Fluxo de Investigação de Alarme (Drill-Down do Mural)

1. **Origem no Mural de Alarmes (`tab-alarmes`):**
   - O operador visualiza um alarme ativo (ex: reservatório `R-01`).
2. **Ação de Clique no Card/Linha:**
   - Ao clicar no card ou item do mural, o sistema abre diretamente a **Visão Operacional focada na investigação do reservatório** (`?view=operacional&origem=mural&reservatorio=R01-A`).
3. **Modo Investigação & Retorno:**
   - O painel exibe um cabeçalho enxuto de investigação com os dados específicos do reservatório.
   - O operador pode retornar rapidamente ao Mural de Alarmes clicando no botão **"Voltar ao Mural"** ou pressionando a tecla **[Esc]**, restaurando o contexto operacional anterior sem perda de estado.

---

## 5. Central de Notificações & Modal de Comunicados

- **Ícone do Sino (`#btn-notificacoes`):**
  - Localizado no cabeçalho superior direito, exibe um badge com a contagem de notificações não lidas.
  - Ao clicar, abre um popover flutuante (`position: fixed`) com os avisos do sistema (Atualizações, Manutenções, Comunicados).
- **Modal de Detalhes & Download:**
  - Clicar em qualquer notificação abre um modal centralizado com fundo desfocado (`backdrop-filter: blur`), exibindo o título, data, ícone, tipo traduzido (`Atualização`, `Manutenção`, `Comunicado`, `Sistema`) e a mensagem completa com barra de rolagem.
  - Permite marcar como lida e **baixar o comunicado oficial em formato de texto (`.txt`)** para arquivamento local.

---

## 6. Fechamento e Ciclo de Vida da Sessão

- **Encerramento de Visões Filhas:**
  - O evento `beforeunload` garante que janelas secundárias abertas via multi-monitor sejam encerradas ordenadamente ao fechar o painel principal.
- **Logout:**
  - Encerra a sessão ativa e retorna ao overlay de login, mantendo a integridade dos dados locais persistidos.
