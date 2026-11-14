# Módulo: alarmTiming.js

O arquivo `src/alarmTiming.js` calcula o tempo entre o acionamento registrado de um alarme e o momento atual.

## Contrato

- `calcularTempoRespostaMs(chave, tempos, dataSelecionada, agora)` usa **só** a chave composta `dataSelecionada_chave`. A chave antiga (só o reservatório) não é mais usada, porque podia trazer o horário de outro dia; sem data, ou com registro de outra data, retorna `null`. Registros antigos continuam guardados no navegador, mas ficam sem efeito.
- Aceita timestamps numéricos ou strings no formato `dd/mm/aaaa hh:mm:ss`.
- Retorna a duração em milissegundos, limitada a zero para timestamps futuros.
- Retorna `null` quando o mapa, o timestamp ou o formato não forem válidos; não inventa uma duração para alarmes sem horário registrado.
- `agora` é opcional e permite fornecer um instante de referência, inclusive em testes.

O timestamp representa quando o CCO (o navegador) viu o alerta pela primeira vez para aquela data, não quando a condição operacional começou nem um horário de sensor. Por isso a tela o chama de "Registrado no CCO em" e mostra ao lado a "Última leitura" real do boletim (`obterHorarioUltimaLeitura`, em `regrasNegocio.js`). A função é exposta em `window.AlarmTiming` e carregada antes de `ui.js`.
