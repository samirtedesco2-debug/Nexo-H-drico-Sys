# Módulo: alarmTiming.js

O arquivo `src/alarmTiming.js` calcula o tempo entre o acionamento registrado de um alarme e o momento atual.

## Contrato

- `calcularTempoRespostaMs(chave, tempos, dataSelecionada, agora)` procura primeiro a chave composta `dataSelecionada_chave` e, como fallback, a chave simples do reservatório.
- Aceita timestamps numéricos ou strings no formato `dd/mm/aaaa hh:mm:ss`.
- Retorna a duração em milissegundos, limitada a zero para timestamps futuros.
- Retorna `null` quando o mapa, o timestamp ou o formato não forem válidos; não inventa uma duração para alarmes sem horário registrado.
- `agora` é opcional e permite fornecer um instante de referência, inclusive em testes.

O timestamp representa quando a interface detectou o alerta, não necessariamente quando a condição operacional começou. A função é exposta em `window.AlarmTiming` e carregada antes de `ui.js`.
