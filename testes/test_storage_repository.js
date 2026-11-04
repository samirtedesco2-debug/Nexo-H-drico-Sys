const assert = require("assert");
const fs = require("fs");
const path = require("path");
const vm = require("vm");

class FakeIndexedDB {
  constructor() {
    this.databases = new Map();
    this.deleteCount = 0;
  }

  criarBancoLegado(nome, versao, stores) {
    const database = {
      version: versao,
      stores: new Map(),
      objectStoreNames: {
        contains(storeName) {
          return database.stores.has(storeName);
        }
      },
      createObjectStore(storeName, options = {}) {
        database.stores.set(storeName, {
          options,
          records: new Map(),
          nextId: 1
        });
      },
      transaction: (storeName) => {
        const transaction = {};
        transaction.objectStore = () => this.criarStore(database, storeName, transaction);
        return transaction;
      },
      close() {}
    };

    stores.forEach(({ name, options, records }) => {
      database.createObjectStore(name, options);
      const store = database.stores.get(name);
      records.forEach((record) => {
        const key = record[options.keyPath];
        store.records.set(key, record);
      });
    });
    this.databases.set(nome, database);
  }

  criarStore(database, nome, transaction) {
    const storeData = database.stores.get(nome);
    return {
      getAll: () => this.request(transaction, () => [...storeData.records.values()]),
      put: (record) => this.request(transaction, () => {
        const row = { ...record };
        if (storeData.options.autoIncrement && row[storeData.options.keyPath] === undefined) {
          row[storeData.options.keyPath] = storeData.nextId++;
        }
        storeData.records.set(row[storeData.options.keyPath], row);
        return row[storeData.options.keyPath];
      }),
      add: (record) => this.request(transaction, () => {
        const row = { ...record };
        if (storeData.options.autoIncrement && row[storeData.options.keyPath] === undefined) {
          row[storeData.options.keyPath] = storeData.nextId++;
        }
        storeData.records.set(row[storeData.options.keyPath], row);
        return row[storeData.options.keyPath];
      }),
      delete: (key) => this.request(transaction, () => storeData.records.delete(key))
    };
  }

  request(transaction, operation) {
    const request = {};
    setImmediate(() => {
      request.result = operation();
      if (request.onsuccess) request.onsuccess({ target: request });
      setImmediate(() => {
        if (transaction.oncomplete) transaction.oncomplete({ target: transaction });
      });
    });
    return request;
  }

  open(nome, versao) {
    const request = {};
    setImmediate(() => {
      let database = this.databases.get(nome);
      if (!database) {
        this.criarBancoLegado(nome, 0, []);
        database = this.databases.get(nome);
      }
      const versaoAnterior = database.version;
      if (versao > database.version) {
        database.version = versao;
        if (request.onupgradeneeded) {
          request.onupgradeneeded({
            oldVersion: versaoAnterior,
            newVersion: versao,
            target: { result: database }
          });
        }
      }
      if (request.onsuccess) request.onsuccess({ target: { result: database } });
    });
    return request;
  }

  deleteDatabase() {
    this.deleteCount += 1;
    throw new Error("O banco não deve ser excluído durante uma migração.");
  }
}

async function executarTestesStorageRepository() {
  console.log("-> Executando testes de persistência e migração do IndexedDB...");

  const nomeBanco = "NexoCCOStorageDB";
  const indexedDB = new FakeIndexedDB();
  indexedDB.criarBancoLegado(nomeBanco, 1, [{
    name: "reconhecidos",
    options: { keyPath: "chave" },
    records: [{
      chave: "R-IDB",
      severidade: "Crítico",
      metadados: { timestamp: "30/10/2026 08:00:00", operador: "operador" }
    }]
  }]);

  const dadosLocalStorage = {
    nexo_hidrico_reconhecidos: JSON.stringify({ "R-LOCAL": "Atenção" }),
    nexo_hidrico_ack_metadata: JSON.stringify({ "R-LOCAL": { timestamp: "30/10/2026 09:00:00", operador: "local" } })
  };
  const localStorage = {
    getItem: (key) => dadosLocalStorage[key] || null,
    setItem: (key, value) => { dadosLocalStorage[key] = String(value); }
  };
  const window = {
    ccoReconhecidos: new Map(),
    ccoAckMetadata: new Map(),
    nexoIncidentsLog: []
  };
  const context = { window, indexedDB, localStorage, console, Map, Object, Date, Promise, setImmediate };
  const source = fs.readFileSync(path.join(__dirname, "../src/storageRepository.js"), "utf8");
  vm.runInNewContext(source, context);

  const repository = window.StorageRepository;
  const acknowledgements = await repository.carregarReconhecidos();
  const metadata = await repository.carregarMetadadosReconhecidos();
  assert.strictEqual(acknowledgements.get("R-IDB"), "Crítico");
  assert.strictEqual(acknowledgements.get("R-LOCAL"), "Atenção");
  assert.strictEqual(metadata.get("R-IDB").operador, "operador");
  assert.strictEqual(metadata.get("R-LOCAL").operador, "local");

  window.ccoReconhecidos = acknowledgements;
  window.ccoAckMetadata = metadata;
  window.nexoIncidentsLog = [{
    timestamp: "2026-10-30T12:00:00.000Z",
    chave: "R-IDB",
    severidade: "Crítico",
    acao: "Reconhecido"
  }];
  await repository.salvarReconhecido("R-IDB", "Crítico", metadata.get("R-IDB"));
  await repository.salvarLog(window.nexoIncidentsLog[0]);
  const logs = await repository.carregarLogs();
  assert.strictEqual(logs.length, 1);
  assert.strictEqual(logs[0].acao, "Reconhecido");

  window.ccoReconhecidos.delete("R-IDB");
  window.ccoAckMetadata.delete("R-IDB");
  await repository.removerReconhecido("R-IDB");
  dadosLocalStorage.nexo_hidrico_reconhecidos = JSON.stringify({ "R-IDB": "Crítico", "R-LOCAL": "Atenção" });
  dadosLocalStorage.nexo_hidrico_ack_metadata = JSON.stringify({
    "R-IDB": { timestamp: "30/10/2026 08:00:00", operador: "operador" },
    "R-LOCAL": { timestamp: "30/10/2026 09:00:00", operador: "local" }
  });
  const restantes = await repository.carregarReconhecidos();
  assert.strictEqual(restantes.has("R-IDB"), false);
  assert.strictEqual(restantes.has("R-LOCAL"), true);
  const metadadosRestantes = await repository.carregarMetadadosReconhecidos();
  assert.strictEqual(metadadosRestantes.has("R-IDB"), false);

  const tombstones = JSON.parse(dadosLocalStorage.nexo_hidrico_ack_tombstones);
  delete tombstones["R-IDB"];
  dadosLocalStorage.nexo_hidrico_ack_tombstones = JSON.stringify(tombstones);
  const fallbackReconhecidos = await repository.carregarReconhecidos();
  const fallbackMetadados = await repository.carregarMetadadosReconhecidos();
  assert.strictEqual(fallbackReconhecidos.has("R-IDB"), true);
  assert.strictEqual(fallbackMetadados.has("R-IDB"), true);
  window.ccoReconhecidos = fallbackReconhecidos;
  window.ccoAckMetadata = fallbackMetadados;
  await repository.salvarReconhecido("R-IDB", "Crítico", window.ccoAckMetadata.get("R-IDB"));
  const reativados = await repository.carregarReconhecidos();
  assert.strictEqual(reativados.get("R-IDB"), "Crítico");

  const database = indexedDB.databases.get(nomeBanco);
  assert.strictEqual(indexedDB.deleteCount, 0);
  assert.strictEqual(database.stores.has("logs"), true);
  assert.strictEqual(database.stores.get("logs").records.size, 1);
  console.log("✓ Migração preserva dados; ACK, metadados e logs persistem corretamente.");
}

module.exports = executarTestesStorageRepository;
