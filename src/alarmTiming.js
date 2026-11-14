window.AlarmTiming = {
  calcularTempoRespostaMs(chave, tempos, dataSelecionada, agora = Date.now()) {
    if (!(tempos instanceof Map)) return null;

    // Só vale o registro da data + reservatório. A chave antiga (só o reservatório) não é usada: poderia
    // trazer o horário de outro dia e produzir um tempo de resposta errado.
    const valor = dataSelecionada ? tempos.get(`${dataSelecionada}_${chave}`) : undefined;
    let timestamp;
    if (typeof valor === "number") {
      timestamp = valor;
    } else if (typeof valor === "string") {
      const partes = valor.match(/^(\d{2})\/(\d{2})\/(\d{4})\s+(\d{2}):(\d{2}):(\d{2})$/);
      if (partes) {
        timestamp = new Date(
          Number(partes[3]),
          Number(partes[2]) - 1,
          Number(partes[1]),
          Number(partes[4]),
          Number(partes[5]),
          Number(partes[6])
        ).getTime();
      }
    }

    return Number.isFinite(timestamp) ? Math.max(0, agora - timestamp) : null;
  }
};
