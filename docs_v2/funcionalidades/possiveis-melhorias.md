# Nexo Hídrico — Possíveis Melhorias Futuras

Este documento registra as sugestões de evolução arquitetural e funcional levantadas nas análises multidisciplinares (Engenharia, CCO, Análise de Dados e Gestão Executiva) para futuras iterações do sistema.

---

## 1. 🖥️ Experiência Operacional (CCO UX)

### Comentários Operacionais no ACK (*Reconhecer com Justificativa*)
* **Descrição:** Permitir que, ao clicar em "Reconhecer" (ACK) em um alarme no mural, o operador insira uma nota descritiva opcional (ex: *"Válvula manobrada pela equipe de campo"*).
* **Benefício:** Enriquece a trilha de auditoria e melhora a passagem de plantão entre turnos.

### Filtros por Setor de Abastecimento / Zona Hidráulica
* **Descrição:** Adicionar botões e filtros de seleção rápida por zona geográfica ou setor de abastecimento (ex: Zona Norte, Zona Sul, Centro, Adutora Principal) no Mural de Alarmes.
* **Benefício:** Agiliza a tomada de decisão em redes de grande porte com dezenas de reservatórios monitorados simultaneamente.

---

## 2. 📊 Inteligência de Dados & Confiabilidade (Analytics)

### Indicadores de Desempenho do Plantão (MTTR & MTBF)
* **Descrição:** Inclusão de um painel compacto no rodapé ou cabeçalho do mural exibindo o Tempo Médio de Reconhecimento/Resposta (MTTR) aos alarmes críticos durante o turno atual.
* **Benefício:** Fornece métricas objetivas de eficiência operacional para supervisores e diretores.

---

## 3. ⚙️ Governança & Conformidade (Enterprise Compliance)

### Exportação Oficial de Relatório de Ocorrências Corporativo
* **Descrição:** Aprimoramento da exportação de relatórios de alarmes para formatos estruturados (PDF/CSV) contendo timbre oficial do SAMAE, sumário estatístico de ocorrências e identificação do operador responsável pelo plantão.
* **Benefício:** Atendimento rigoroso a exigências regulatórias e auditorias externas.

## 4. 🔐 Autenticação e Autorização para Uso em Produção

### Centralização dos Controles de Acesso em um Serviço Confiável
* **Descrição:** Quando houver infraestrutura de servidor disponível, migrar a validação de identidade, autorização por perfil, recuperação de senha e auditoria para um serviço confiável. O serviço deverá armazenar senhas com hash apropriado, emitir e validar sessões e permitir redefinição somente após comprovação de identidade por canal verificado.
* **Motivo:** Na versão local, os dados e as verificações de acesso ficam no navegador e podem ser alterados por alguém com acesso ao dispositivo. O RBAC atual controla a interface, mas não oferece autorização resistente a adulteração.
* **Até a implementação:** Tratar o login como uma barreira básica da interface, restringir o uso às estações controladas e não depender dele para proteger dados sensíveis ou permissões de produção.

---
*Nexo Hídrico — Centro de Controle Operacional*
