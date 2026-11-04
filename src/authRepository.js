// authRepository.js - Repositório desacoplado de Autenticação e Autorização (IndexedDB / RBAC / Auditoria)

const DB_NAME = "NexoAuthDB";
const DB_VERSION = 2;

class AuthRepository {
  async abrirDB() {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);
      request.onerror = () => reject(request.error);
      request.onsuccess = (event) => resolve(event.target.result);
      request.onupgradeneeded = (event) => {
        const db = event.target.result;
        if (!db.objectStoreNames.contains("usuarios")) {
          const storeUsuarios = db.createObjectStore("usuarios", { keyPath: "username" });
          storeUsuarios.createIndex("email", "email", { unique: false });
        }
        if (!db.objectStoreNames.contains("auditoria")) {
          db.createObjectStore("auditoria", { keyPath: "id", autoIncrement: true });
        }
      };
    });
  }

  async inicializarDB() {
    const db = await this.abrirDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction("usuarios", "readwrite");
      const store = transaction.objectStore("usuarios");
      
      const countReq = store.count();
      countReq.onsuccess = async () => {
        if (countReq.result === 0) {
          const usuariosIniciais = [
            {
              username: "admin.nexo",
              senha: "Admin@2026",
              email: "samirtedesco2@gmail.com",
              role: "ADMIN",
              primeiroAcesso: false,
              bloqueado: false,
              tentativasFalhas: 0,
              requerRedefinicao: false
            },
            {
              username: "operador.nexo",
              senha: "Agent@2026",
              email: "samirtedesco2@gmail.com",
              role: "Agent",
              primeiroAcesso: false,
              bloqueado: false,
              tentativasFalhas: 0,
              requerRedefinicao: false
            }
          ];

          for (const u of usuariosIniciais) {
            store.put(u);
          }
        }
        resolve(true);
      };
      countReq.onerror = () => reject(countReq.error);
    });
  }

  async obterUsuario(username) {
    const db = await this.abrirDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction("usuarios", "readonly");
      const store = transaction.objectStore("usuarios");
      const req = store.get(username);
      req.onsuccess = () => resolve(req.result || null);
      req.onerror = () => reject(req.error);
    });
  }

  async salvarUsuario(usuario) {
    const db = await this.abrirDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction("usuarios", "readwrite");
      const store = transaction.objectStore("usuarios");
      const req = store.put(usuario);
      req.onsuccess = () => resolve(true);
      req.onerror = () => reject(req.error);
    });
  }

  async obterLogsAuditoria() {
    try {
      const db = await this.abrirDB();
      return new Promise((resolve, reject) => {
        const transaction = db.transaction("auditoria", "readonly");
        const store = transaction.objectStore("auditoria");
        const req = store.getAll();
        req.onsuccess = () => resolve(req.result || []);
        req.onerror = () => reject(req.error);
      });
    } catch (e) {
      console.warn("Erro ao carregar auditoria do IndexedDB:", e);
      return window.nexoSecurityLog || [];
    }
  }

  async registrarAuditoria(acao, usuario, detalhes) {
    const logEntry = {
      timestamp: new Date().toISOString(),
      usuario: usuario || "sistema",
      acao,
      detalhes
    };

    window.nexoSecurityLog = window.nexoSecurityLog || [];
    window.nexoSecurityLog.push(logEntry);

    try {
      const db = await this.abrirDB();
      return new Promise((resolve, reject) => {
        const transaction = db.transaction("auditoria", "readwrite");
        const store = transaction.objectStore("auditoria");
        const req = store.add(logEntry);
        req.onsuccess = () => resolve(true);
        req.onerror = () => reject(req.error);
      });
    } catch (e) {
      console.warn("Erro ao gravar auditoria no IndexedDB:", e);
    }
  }

  async autenticar(username, senha) {
    const user = await this.obterUsuario(username);
    if (!user) {
      await this.registrarAuditoria("LOGIN_FALHOU", username, "Usuário não encontrado");
      throw new Error("Usuário ou senha inválidos.");
    }

    if (user.bloqueado) {
      await this.registrarAuditoria("LOGIN_BLOQUEADO", username, "Tentativa de login em conta bloqueada");
      throw new Error("Conta bloqueada por segurança. Procure o responsável técnico do sistema por um canal institucional.");
    }

    if (user.senha !== senha) {
      user.tentativasFalhas = (user.tentativasFalhas || 0) + 1;
      if (user.tentativasFalhas >= 3) {
        user.bloqueado = true;
        await this.salvarUsuario(user);
        await this.registrarAuditoria("CONTA_BLOQUEADA_FORCA_BRUTA", username, "Bloqueio automático após 3 falhas");
        throw new Error("Conta bloqueada por segurança após 3 tentativas incorretas. Procure o responsável técnico do sistema por um canal institucional.");
      }
      await this.salvarUsuario(user);
      await this.registrarAuditoria("LOGIN_FALHOU", username, `Senha incorreta (tentativa ${user.tentativasFalhas}/3)`);
      throw new Error(`Usuário ou senha inválidos. Tentativa ${user.tentativasFalhas}/3.`);
    }

    // Sucesso na autenticação
    user.tentativasFalhas = 0;
    await this.salvarUsuario(user);
    await this.registrarAuditoria("LOGIN_SUCESSO", username, `Autenticação bem-sucedida (${user.role})`);
    return user;
  }

  async cadastrarUsuario(adminUsername, novoUsername, role = "Agent", email = "") {
    if (!email || !email.trim()) {
      throw new Error("O e-mail corporativo é obrigatório para cadastrar um novo usuário.");
    }
    const adminUser = await this.obterUsuario(adminUsername);
    if (!adminUser || adminUser.role !== "ADMIN") {
      throw new Error("Apenas administradores podem cadastrar novos usuários.");
    }

    const usuarioExistente = await this.obterUsuario(novoUsername);
    if (usuarioExistente) {
      throw new Error("Já existe um usuário cadastrado com este nome.");
    }

    const primeiroNome = novoUsername.trim().split(".")[0].toLowerCase();
    const novoUsuario = {
      username: novoUsername.trim(),
      senha: primeiroNome,
      email: email.trim(),
      role,
      primeiroAcesso: true,
      bloqueado: false,
      tentativasFalhas: 0,
      requerRedefinicao: false
    };

    await this.salvarUsuario(novoUsuario);
    await this.registrarAuditoria("CADASTRAR_USUARIO", adminUsername, `Criado usuário ${novoUsername.trim()} (${role}, e-mail: ${email.trim()})`);
    return novoUsuario;
  }

  async atualizarSenha(username, novaSenha) {
    // Validação de complexidade: mín 8 caracteres, 1 letra, 1 número, 1 caractere especial (@$!%*#?&)
    const regexComplexidade = /^(?=.*[A-Za-z])(?=.*\d)(?=.*[@$!%*#?&])[A-Za-z\d@$!%*#?&]{8,}$/;
    if (!regexComplexidade.test(novaSenha)) {
      throw new Error("A senha deve conter no mínimo 8 caracteres, incluindo pelo menos: 1 letra, 1 número e 1 caractere especial (@$!%*#?&).");
    }

    const user = await this.obterUsuario(username);
    if (!user) throw new Error("Usuário não encontrado.");

    user.senha = novaSenha;
    user.primeiroAcesso = false;
    user.requerRedefinicao = false;
    user.bloqueado = false;
    user.tentativasFalhas = 0;

    await this.salvarUsuario(user);
    await this.registrarAuditoria("ATUALIZAR_SENHA", username, "Senha alterada com sucesso");
    return true;
  }

}

window.AuthRepository = new AuthRepository();
