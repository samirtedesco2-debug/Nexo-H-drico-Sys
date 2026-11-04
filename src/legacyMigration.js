const MIGRATION_VERSION_KEY = "nexo_hidrico_migration_version";
const CURRENT_MIGRATION_VERSION = "1";

const LEGACY_DATABASES = [
  {
    legacyName: "SamaeAuthDB",
    currentName: "NexoAuthDB",
    version: 2,
    stores: {
      usuarios: { keyPath: "username", indexes: [{ name: "email", keyPath: "email" }] },
      auditoria: { keyPath: "id", autoIncrement: true }
    },
    prepareRecords(storeName, records) {
      if (storeName !== "usuarios") return records;
      const aliases = new Map([
        ["admin.samae", "admin.nexo"],
        ["agent.samae", "operador.nexo"]
      ]);
      const normalized = records.map(({ key, value }) => ({
        key,
        value: aliases.has(value.username)
          ? { ...value, username: aliases.get(value.username) }
          : value,
        legacyAlias: aliases.has(value.username)
      }));
      const explicitUsernames = new Set(
        normalized.filter((record) => !record.legacyAlias).map((record) => record.value.username)
      );
      return normalized.filter(
        (record) => !record.legacyAlias || !explicitUsernames.has(record.value.username)
      );
    }
  },
  {
    legacyName: "SamaeHandlesDB",
    currentName: "NexoHandlesDB",
    version: 1,
    stores: { handles: {} }
  },
  {
    legacyName: "SamaeCCOStorageDB",
    currentName: "NexoCCOStorageDB",
    version: 2,
    stores: {
      reconhecidos: { keyPath: "chave" },
      logs: { keyPath: "id", autoIncrement: true }
    }
  }
];

const LEGACY_LOCAL_STORAGE_KEYS = [
  ["samae_cco_session", "nexo_hidrico_session"],
  ["samae_cco_reconhecidos", "nexo_hidrico_reconhecidos"],
  ["samae_cco_ack_metadata", "nexo_hidrico_ack_metadata"],
  ["samae_cco_ack_tombstones", "nexo_hidrico_ack_tombstones"],
  ["samae_cco_incidents_log", "nexo_hidrico_incidents_log"],
  ["samae_cco_trigger_times", "nexo_hidrico_trigger_times"],
  ["samai_reservatorios_config", "nexo_hidrico_reservatorios_config"],
  ["samai_global_config", "nexo_hidrico_global_config"],
  ["samai_cco_external_notifications", "nexo_hidrico_external_notifications"],
  ["samai_cco_sound_enabled", "nexo_hidrico_sound_enabled"]
];

function abrirBancoExistente(nome) {
  const abrir = () => new Promise((resolve, reject) => {
    let criadoDuranteBusca = false;
    const request = indexedDB.open(nome);
    request.onupgradeneeded = (event) => {
      criadoDuranteBusca = event.oldVersion === 0;
    };
    request.onerror = () => reject(request.error || new Error(`Não foi possível abrir ${nome}.`));
    request.onblocked = () => reject(
      new Error(`A migração de ${nome} aguarda outras janelas; feche e reabra o aplicativo.`)
    );
    request.onsuccess = () => {
      const db = request.result;
      if (!criadoDuranteBusca) {
        resolve(db);
        return;
      }

      db.close();
      const deleteRequest = indexedDB.deleteDatabase(nome);
      deleteRequest.onsuccess = () => resolve(null);
      deleteRequest.onerror = () => reject(
        deleteRequest.error || new Error(`Não foi possível remover o banco vazio ${nome}.`)
      );
      deleteRequest.onblocked = () => reject(
        new Error(`A migração do banco ${nome} aguarda outras janelas.`)
      );
    };
  });

  if (typeof indexedDB.databases !== "function") return abrir();
  return indexedDB.databases().then((bancos) =>
    bancos.some((banco) => banco.name === nome) ? abrir() : null
  );
}

function lerRegistrosBanco(db, nomesStores) {
  const nomesExistentes = nomesStores.filter((nome) => db.objectStoreNames.contains(nome));
  if (nomesExistentes.length === 0) {
    db.close();
    return Promise.resolve({});
  }

  return new Promise((resolve, reject) => {
    const resultado = {};
    const transaction = db.transaction(nomesExistentes, "readonly");
    transaction.oncomplete = () => {
      db.close();
      resolve(resultado);
    };
    transaction.onerror = () => {
      db.close();
      reject(transaction.error || new Error("Não foi possível ler os dados legados."));
    };
    transaction.onabort = () => {
      db.close();
      reject(transaction.error || new Error("A leitura dos dados legados foi cancelada."));
    };

    nomesExistentes.forEach((nome) => {
      const store = transaction.objectStore(nome);
      const valuesRequest = store.getAll();
      const keysRequest = store.getAllKeys();
      valuesRequest.onsuccess = () => {
        resultado[nome] = resultado[nome] || {};
        resultado[nome].values = valuesRequest.result;
      };
      keysRequest.onsuccess = () => {
        resultado[nome] = resultado[nome] || {};
        resultado[nome].keys = keysRequest.result;
      };
      valuesRequest.onerror = () => transaction.abort();
      keysRequest.onerror = () => transaction.abort();
    });
  });
}

function abrirBancoAtual(migracao) {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(migracao.currentName, migracao.version);
    request.onupgradeneeded = () => {
      const db = request.result;
      Object.entries(migracao.stores).forEach(([nome, definicao]) => {
        if (db.objectStoreNames.contains(nome)) return;
        const store = db.createObjectStore(nome, {
          ...(definicao.keyPath ? { keyPath: definicao.keyPath } : {}),
          ...(definicao.autoIncrement ? { autoIncrement: true } : {})
        });
        (definicao.indexes || []).forEach((index) => {
          store.createIndex(index.name, index.keyPath, { unique: false });
        });
      });
    };
    request.onerror = () => reject(
      request.error || new Error(`Não foi possível abrir ${migracao.currentName}.`)
    );
    request.onblocked = () => reject(
      new Error(`A migração de ${migracao.currentName} aguarda outras janelas.`)
    );
    request.onsuccess = () => resolve(request.result);
  });
}

async function migrarBancoLegado(migracao) {
  const bancoLegado = await abrirBancoExistente(migracao.legacyName);
  if (!bancoLegado) return;

  const registrosLegados = await lerRegistrosBanco(bancoLegado, Object.keys(migracao.stores));
  const bancoAtual = await abrirBancoAtual(migracao);
  const nomesStores = Object.keys(migracao.stores).filter(
    (nome) => registrosLegados[nome]?.values?.length
  );
  if (nomesStores.length === 0) {
    bancoAtual.close();
    return;
  }

  await new Promise((resolve, reject) => {
    const transaction = bancoAtual.transaction(nomesStores, "readwrite");
    transaction.oncomplete = () => {
      bancoAtual.close();
      resolve();
    };
    transaction.onerror = () => {
      bancoAtual.close();
      reject(transaction.error || new Error(`Não foi possível copiar ${migracao.legacyName}.`));
    };
    transaction.onabort = () => {
      bancoAtual.close();
      reject(transaction.error || new Error(`A cópia de ${migracao.legacyName} foi cancelada.`));
    };

    nomesStores.forEach((nome) => {
      const definicao = migracao.stores[nome];
      const registros = registrosLegados[nome].values.map((value, index) => ({
        value,
        key: registrosLegados[nome].keys[index]
      }));
      const preparados = migracao.prepareRecords
        ? migracao.prepareRecords(nome, registros)
        : registros;
      const storeAtual = transaction.objectStore(nome);
      const porChave = new Map();
      preparados.forEach(({ value, key }) => {
        const chaveAtual = definicao.keyPath ? value[definicao.keyPath] : key;
        if (!porChave.has(chaveAtual)) porChave.set(chaveAtual, { value, key });
      });
      porChave.forEach(({ value, key }) => {
        const chaveAtual = definicao.keyPath ? value[definicao.keyPath] : key;
        const getRequest = storeAtual.get(chaveAtual);
        getRequest.onsuccess = () => {
          if (getRequest.result !== undefined) return;
          if (definicao.keyPath) storeAtual.put(value);
          else storeAtual.put(value, key);
        };
        getRequest.onerror = () => transaction.abort();
      });
    });
  });
}

function normalizarSessao(sessaoStr) {
  try {
    const sessao = JSON.parse(sessaoStr);
    const aliases = {
      "admin.samae": "admin.nexo",
      "agent.samae": "operador.nexo"
    };
    if (aliases[sessao.username]) sessao.username = aliases[sessao.username];
    return JSON.stringify(sessao);
  } catch {
    return sessaoStr;
  }
}

function migrarLocalStorage() {
  LEGACY_LOCAL_STORAGE_KEYS.forEach(([chaveAntiga, chaveAtual]) => {
    const valorLegado = localStorage.getItem(chaveAntiga);
    if (valorLegado !== null && localStorage.getItem(chaveAtual) === null) {
      localStorage.setItem(
        chaveAtual,
        chaveAtual === "nexo_hidrico_session" ? normalizarSessao(valorLegado) : valorLegado
      );
    }
  });

  const sessaoAtual = localStorage.getItem("nexo_hidrico_session");
  if (sessaoAtual !== null) {
    localStorage.setItem("nexo_hidrico_session", normalizarSessao(sessaoAtual));
  }
}

window.NexoMigration = {
  async executar() {
    if (localStorage.getItem(MIGRATION_VERSION_KEY) === CURRENT_MIGRATION_VERSION) return;
    await Promise.all(LEGACY_DATABASES.map(migrarBancoLegado));
    migrarLocalStorage();
    localStorage.setItem(MIGRATION_VERSION_KEY, CURRENT_MIGRATION_VERSION);
  }
};
