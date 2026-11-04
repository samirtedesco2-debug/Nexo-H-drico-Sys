// storageRepository.js - Repositório Durável em IndexedDB para ACKs e Logs CCO

const CCO_DB_NAME = "NexoCCOStorageDB";
const CCO_DB_VERSION = 2;

class StorageRepository {
  async abrirDB() {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(CCO_DB_NAME, CCO_DB_VERSION);
      request.onerror = () => reject(request.error);
      request.onblocked = () => reject(
        new Error("A migração do armazenamento aguarda outras janelas; feche e reabra o aplicativo.")
      );
      request.onsuccess = (event) => resolve(event.target.result);
      request.onupgradeneeded = (event) => {
        const db = event.target.result;
        if (!db.objectStoreNames.contains("reconhecidos")) {
          db.createObjectStore("reconhecidos", { keyPath: "chave" });
        }
        if (!db.objectStoreNames.contains("logs")) {
          db.createObjectStore("logs", { keyPath: "id", autoIncrement: true });
        }
      };
    });
  }

  async executarTransacao(nomeStore, modo, executar) {
    const db = await this.abrirDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(nomeStore, modo);
      let resultado;
      transaction.oncomplete = () => {
        db.close();
        resolve(resultado);
      };
      transaction.onerror = () => {
        db.close();
        reject(transaction.error || new Error("Falha na transação do IndexedDB."));
      };
      transaction.onabort = () => {
        db.close();
        reject(transaction.error || new Error("Transação do IndexedDB cancelada."));
      };

      try {
        const request = executar(transaction.objectStore(nomeStore));
        if (request) {
          request.onsuccess = () => {
            resultado = request.result;
          };
          request.onerror = () => reject(request.error || new Error("Falha na operação do IndexedDB."));
        }
      } catch (error) {
        db.close();
        reject(error);
      }
    });
  }

  lerReconhecidosLocalStorage() {
    const salvos = localStorage.getItem("nexo_hidrico_reconhecidos");
    return salvos ? new Map(Object.entries(JSON.parse(salvos))) : new Map();
  }

  lerMetadadosLocalStorage() {
    const salvos = localStorage.getItem("nexo_hidrico_ack_metadata");
    return salvos ? new Map(Object.entries(JSON.parse(salvos))) : new Map();
  }

  lerTombstonesLocalStorage() {
    const salvos = localStorage.getItem("nexo_hidrico_ack_tombstones");
    const obj = salvos ? JSON.parse(salvos) : {};
    return new Map(Object.entries(obj));
  }

  salvarTombstonesLocalStorage(tombstones) {
    localStorage.setItem("nexo_hidrico_ack_tombstones", JSON.stringify(Object.fromEntries(tombstones)));
  }

  salvarSnapshotLocalStorage() {
    if (window.ccoReconhecidos) {
      localStorage.setItem(
        "nexo_hidrico_reconhecidos",
        JSON.stringify(Object.fromEntries(window.ccoReconhecidos.entries()))
      );
    }
    if (window.ccoAckMetadata) {
      localStorage.setItem(
        "nexo_hidrico_ack_metadata",
        JSON.stringify(Object.fromEntries(window.ccoAckMetadata.entries()))
      );
    }
  }

  async carregarReconhecidos() {
    let registros = [];
    try {
      registros = await this.executarTransacao(
        "reconhecidos",
        "readonly",
        (store) => store.getAll()
      );
    } catch (error) {
      console.warn("Erro ao carregar reconhecidos do IndexedDB; usando localStorage.", error);
    }

    const porChave = new Map(registros.map((registro) => [registro.chave, registro]));
    const tombstones = new Map(
      registros
        .filter((registro) => registro.revogado)
        .map((registro) => [registro.chave, Number(registro.timestamp) || 0])
    );
    let tombstonesLocais = new Map();
    try {
      tombstonesLocais = this.lerTombstonesLocalStorage();
      tombstonesLocais.forEach((timestamp, chave) => {
        tombstones.set(chave, Math.max(Number(timestamp) || 0, tombstones.get(chave) || 0));
      });
    } catch (error) {
      console.error("Não foi possível carregar revogações locais de alarmes.", error);
    }
    const reconhecidos = new Map();
    registros.forEach((registro) => {
      if (!registro.revogado && (Number(registro.timestamp) || 0) >= (tombstones.get(registro.chave) || 0)) {
        reconhecidos.set(registro.chave, registro.severidade);
      }
    });

    try {
      const locais = this.lerReconhecidosLocalStorage();
      locais.forEach((severidade, chave) => {
        const registro = porChave.get(chave);
        const registroAindaValido = registro && !registro.revogado &&
          (Number(registro.timestamp) || 0) >= (tombstones.get(chave) || 0);
        if (!tombstones.has(chave) || registroAindaValido || !tombstonesLocais.has(chave)) {
          if (!reconhecidos.has(chave)) reconhecidos.set(chave, severidade);
        }
      });
    } catch (error) {
      console.error("Não foi possível complementar os reconhecimentos pelo localStorage.", error);
    }
    return reconhecidos;
  }

  async carregarMetadadosReconhecidos() {
    let registros = [];
    try {
      registros = await this.executarTransacao(
        "reconhecidos",
        "readonly",
        (store) => store.getAll()
      );
    } catch (error) {
      console.warn("Erro ao carregar metadados de reconhecimento do IndexedDB; usando localStorage.", error);
    }
    const porChave = new Map(registros.map((registro) => [registro.chave, registro]));
    const tombstones = new Map(
      registros
        .filter((registro) => registro.revogado)
        .map((registro) => [registro.chave, Number(registro.timestamp) || 0])
    );
    let tombstonesLocais = new Map();
    try {
      tombstonesLocais = this.lerTombstonesLocalStorage();
      tombstonesLocais.forEach((timestamp, chave) => {
        tombstones.set(chave, Math.max(Number(timestamp) || 0, tombstones.get(chave) || 0));
      });
    } catch (error) {
      console.error("Não foi possível carregar revogações locais de metadados.", error);
    }
    const metadados = new Map(
      registros
        .filter((registro) =>
          !registro.revogado &&
          registro.metadados &&
          (Number(registro.timestamp) || 0) >= (tombstones.get(registro.chave) || 0)
        )
        .map((registro) => [registro.chave, registro.metadados])
    );
    try {
      const locais = this.lerMetadadosLocalStorage();
      locais.forEach((metadata, chave) => {
        const registro = porChave.get(chave);
        const registroAindaValido = registro && !registro.revogado &&
          (Number(registro.timestamp) || 0) >= (tombstones.get(chave) || 0);
        if ((!tombstones.has(chave) || registroAindaValido || !tombstonesLocais.has(chave)) && !metadados.has(chave)) {
          metadados.set(chave, metadata);
        }
      });
    } catch (error) {
      console.error("Não foi possível complementar os metadados pelo localStorage.", error);
    }
    return metadados;
  }

  async salvarReconhecido(chave, severidade, metadados) {
    let timestamp = Date.now() + 1;
    try {
      timestamp = Math.max(
        timestamp,
        (Number(this.lerTombstonesLocalStorage().get(chave)) || 0) + 1
      );
    } catch (error) {
      console.warn("Não foi possível consultar a revogação anterior do reconhecimento.", error);
    }

    let salvoNoIndexedDB = false;
    try {
      await this.executarTransacao("reconhecidos", "readwrite", (store) =>
        store.put({ chave, severidade, metadados, timestamp })
      );
      salvoNoIndexedDB = true;
    } catch (error) {
      console.warn("Erro ao salvar reconhecido no IndexedDB; usando localStorage.", error);
    }
    try {
      const tombstones = this.lerTombstonesLocalStorage();
      tombstones.delete(chave);
      this.salvarTombstonesLocalStorage(tombstones);
      this.salvarSnapshotLocalStorage();
    } catch (error) {
      console.error("Não foi possível persistir o reconhecimento.", error);
      if (!salvoNoIndexedDB) throw error;
    }
  }

  async removerReconhecido(chave) {
    const timestamp = Date.now();
    let removidoNoIndexedDB = false;
    try {
      await this.executarTransacao("reconhecidos", "readwrite", (store) =>
        store.put({ chave, revogado: true, timestamp })
      );
      removidoNoIndexedDB = true;
    } catch (error) {
      console.warn("Erro ao remover reconhecido do IndexedDB; atualizando localStorage.", error);
    }
    try {
      const tombstones = this.lerTombstonesLocalStorage();
      tombstones.set(chave, timestamp);
      this.salvarTombstonesLocalStorage(tombstones);
      this.salvarSnapshotLocalStorage();
    } catch (error) {
      console.error("Não foi possível persistir a revogação do reconhecimento.", error);
      if (!removidoNoIndexedDB) throw error;
    }
  }

  async carregarLogs() {
    let logs = [];
    try {
      logs = await this.executarTransacao("logs", "readonly", (store) => store.getAll());
    } catch (error) {
      console.warn("Erro ao carregar logs do IndexedDB; usando localStorage.", error);
    }
    try {
      const logsSalvos = localStorage.getItem("nexo_hidrico_incidents_log");
      if (logsSalvos) logs = logs.concat(JSON.parse(logsSalvos));
    } catch (error) {
      console.error("Não foi possível complementar o histórico pelo localStorage.", error);
    }
    const vistos = new Set();
    return logs.filter((log) => {
      const identidade = JSON.stringify([
        log.timestamp,
        log.chave,
        log.nome,
        log.severidade,
        log.acao,
        log.tempoRespostaMs
      ]);
      if (vistos.has(identidade)) return false;
      vistos.add(identidade);
      return true;
    });
  }

  async salvarLog(logItem) {
    let salvoNoIndexedDB = false;
    try {
      await this.executarTransacao("logs", "readwrite", (store) => store.add(logItem));
      salvoNoIndexedDB = true;
    } catch (error) {
      console.warn("Erro ao salvar log no IndexedDB; usando localStorage.", error);
    }
    try {
      if (window.nexoIncidentsLog) {
        localStorage.setItem("nexo_hidrico_incidents_log", JSON.stringify(window.nexoIncidentsLog));
      }
    } catch (error) {
      console.error("Não foi possível persistir o evento do alarme.", error);
      if (!salvoNoIndexedDB) throw error;
    }
  }
}

window.StorageRepository = new StorageRepository();
