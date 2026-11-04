# Módulo: storageRepository.js

O arquivo `src/storageRepository.js` persiste reconhecimentos de alarmes e eventos do mural no IndexedDB, mantendo `localStorage` como compatibilidade e contingência no navegador.

## Persistência
- O banco `NexoCCOStorageDB` usa a versão 2. A atualização cria stores ausentes sem apagar as existentes.
- A store `reconhecidos` salva severidade e metadados do ACK (horário e operador). Revogações são registradas como tombstones para impedir que cópias antigas do `localStorage` reativem um ACK removido.
- A store `logs` recebe um registro por ação explícita de reconhecimento ou revogação. A leitura elimina duplicatas idênticas já existentes entre IndexedDB e `localStorage`.
- O `localStorage` mantém os snapshots em chaves `nexo_hidrico_*`, incluindo reconhecimentos, metadados, revogações e histórico de incidentes.
- Na primeira inicialização após a troca de identidade, `legacyMigration.js` copia o conteúdo do banco e das chaves anteriores para os novos identificadores. Os dados legados não são apagados.

Os dados são locais ao navegador/perfil. O arquivo de configuração vinculado pode receber uma cópia do estado quando esse recurso está habilitado; isso não substitui uma persistência em servidor nem sincroniza usuários em computadores diferentes.

## Eventos do mural e auditoria
Uma ação no mural gera registros em dois históricos complementares:
- O histórico operacional (`nexoIncidentsLog` / store `logs`) registra `Reconhecido` ou `Revogado`, severidade e tempo de resposta.
- A trilha de segurança (`NexoAuthDB`, store `auditoria`) registra `MURAL_RECONHECER_ACK` ou `MURAL_REVOGAR_ACK`, com o usuário e os detalhes da ação.

Portanto, ver os dois registros para uma mesma ação é esperado: um serve à operação do mural e o outro à rastreabilidade administrativa.

## Limitações conhecidas e validação
- O reconhecimento e o log são gravados em operações separadas; não há uma transação única entre as duas stores. Uma falha entre as gravações pode deixar estado parcial.
- A sincronização de snapshots completos entre abas substitui o estado recebido; atualizações simultâneas podem ser sobrescritas por um snapshot desatualizado.
- O horário de acionamento usado para calcular tempo de resposta é registrado quando a interface detecta o alarme, não necessariamente no instante real em que a condição começou.
- Os testes automatizados usam um mock de IndexedDB. A migração e operações básicas são cobertas, mas falhas reais de gravação e concorrência em navegador precisam de validação adicional.
