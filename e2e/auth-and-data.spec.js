const { test, expect } = require("@playwright/test");

test.beforeEach(async ({ page }) => {
  await page.route("https://cdn.jsdelivr.net/npm/chart.js", (route) =>
    route.fulfill({
      contentType: "application/javascript",
      body: "window.Chart = class Chart { static getChart() { return null; } };"
    })
  );
});

async function aguardarBancoDisponivel(page) {
  await expect
    .poll(() => page.locator("#seletor-data option").count(), { timeout: 20_000 })
    .toBeGreaterThan(0);
}

test("login acessível rejeita credenciais inválidas", async ({ page }) => {
  await page.goto("/");
  await expect(page.locator("#nexo-auth-overlay .auth-brand-logo")).toBeVisible();
  await expect(page.locator("#nexo-auth-overlay .auth-brand-logo")).toHaveAttribute(
    "src",
    "manual-imagens/nexo-hidrico-logo.jpg"
  );
  await expect.poll(() =>
    page.locator("#nexo-auth-overlay .auth-brand-logo").evaluate((image) => image.complete && image.naturalWidth > 0)
  ).toBe(true);
  await expect(page.locator(".auth-brand-tagline")).toHaveText("Inteligência Operacional");
  await expect(page.locator(".auth-brand-tagline")).toHaveCSS("color", "rgb(125, 211, 252)");
  const campoUsuario = page.getByLabel("Usuário");
  const campoSenha = page.locator("#login-password");
  await expect(campoUsuario).toBeVisible();
  await expect(campoSenha).toBeVisible();
  await campoUsuario.focus();
  await page.keyboard.press("Tab");
  await expect(campoSenha).toBeFocused();

  await campoUsuario.fill("admin.nexo");
  await campoSenha.fill("senha-incorreta");
  await page.getByRole("button", { name: "Entrar" }).click();

  await expect(page.getByRole("alert")).toContainText("Usuário ou senha inválidos");
  await expect(page.locator("#nexo-auth-overlay")).toBeVisible();
  expect(await page.evaluate(() => localStorage.getItem("nexo_hidrico_session"))).toBeNull();
});

test("login válido cria sessão e abre o painel", async ({ page }) => {
  test.setTimeout(60_000);
  await page.goto("/");
  await page.getByLabel("Usuário").fill("admin.nexo");
  const campoSenha = page.locator("#login-password");
  await campoSenha.fill("Admin@2026");
  const loginReload = page.waitForEvent("load");
  await expect(campoSenha).toHaveAttribute("type", "password");
  await expect(page.locator("#login-password-eye-icon")).toBeVisible();
  await expect(page.locator("#login-password-eye-off-icon")).toBeHidden();
  const botaoVisibilidadeSenha = page.getByRole("button", { name: "Mostrar senha" });
  await expect(botaoVisibilidadeSenha).toHaveAttribute("aria-pressed", "false");
  await campoSenha.focus();
  await page.keyboard.press("Tab");
  await expect(botaoVisibilidadeSenha).toBeFocused();
  await page.keyboard.press("Enter");
  await expect(campoSenha).toHaveAttribute("type", "text");
  await expect(page.locator("#login-password-eye-icon")).toBeHidden();
  await expect(page.locator("#login-password-eye-off-icon")).toBeVisible();
  await expect(page.getByRole("button", { name: "Ocultar senha" })).toHaveAttribute("aria-pressed", "true");
  await page.getByRole("button", { name: "Ocultar senha" }).click();
  await expect(campoSenha).toHaveAttribute("type", "password");
  await expect(page.locator("#login-password-eye-icon")).toBeVisible();
  await expect(page.locator("#login-password-eye-off-icon")).toBeHidden();
  expect(await campoSenha.inputValue()).toBe("Admin@2026");
  await page.getByRole("button", { name: "Entrar" }).click();

  await expect(page.locator("#nexo-auth-overlay")).toHaveCount(0, { timeout: 15_000 });
  await loginReload;
  await expect(page.locator(".view-launcher")).toBeVisible();
  await expect(page.locator("#tab-alarmes")).toBeVisible();
  await expect(page.getByRole("heading", { name: "Escolha uma visão" })).toBeVisible();
  await expect(page.locator(".header-brand-logo")).toBeVisible();
  await expect(page.locator(".header-brand-logo")).toHaveAttribute(
    "src",
    "manual-imagens/nexo-hidrico-logo.jpg"
  );
  await expect(page.locator('link[rel="icon"]')).toHaveAttribute(
    "href",
    "manual-imagens/nexo-hidrico-icon.png"
  );
  await expect(page.locator(".brand-tagline")).toHaveText("Inteligência Operacional");
  await expect(page.locator(".brand-tagline")).toHaveCSS("text-align", "center");
  await expect(page.locator("#logged-username-display")).toContainText("admin.nexo");
  await expect.poll(() =>
    page.evaluate(() => JSON.parse(localStorage.getItem("nexo_hidrico_session") || "null"))
  ).toEqual({ username: "admin.nexo", role: "ADMIN" });
});

test("visualizações abrem em janelas focadas reutilizáveis", async ({ page }) => {
  test.setTimeout(60_000);
  await page.goto("/");
  await page.getByLabel("Usuário").fill("admin.nexo");
  await page.locator("#login-password").fill("Admin@2026");
  const loginReload = page.waitForEvent("load");
  await page.getByRole("button", { name: "Entrar" }).click();
  await expect(page.locator("#nexo-auth-overlay")).toHaveCount(0, { timeout: 15_000 });
  await loginReload;
  await aguardarBancoDisponivel(page);
  await page.evaluate(() => {
    window.nexoViewWindows = {};
    window.ccoMuralWindow = null;
  });

  const visualizacoes = [
    { aba: "tab-operacional", view: "operacional", painel: "painel-operacional" },
    { aba: "tab-analitico", view: "analitico", painel: "painel-analitico" },
    { aba: "tab-engenharia", view: "engenharia", painel: "painel-engenharia" },
    { aba: "tab-alarmes", view: "alarmes", painel: "painel-alarmes" },
  ];

  for (const visualizacao of visualizacoes) {
    const popupPromise = page.waitForEvent("popup");
    await page.locator(`#${visualizacao.aba}`).click();
    const popup = await popupPromise;
    await expect(popup).toHaveURL(new RegExp(`[?&]view=${visualizacao.view}(?:&|$)`));
    await expect(popup.locator(`#${visualizacao.painel}`)).toBeVisible({ timeout: 15_000 });
    await expect(popup.locator("header")).toBeHidden();
    await expect(popup.locator(".view-tabs")).toBeHidden();
    if (visualizacao.view !== "alarmes") {
      await expect(popup.locator(`#${visualizacao.painel} .focused-view-actions`)).toBeVisible();
    }

    const quantidadePaginas = page.context().pages().length;
    await page.locator(`#${visualizacao.aba}`).click();
    await expect.poll(() => page.context().pages().length).toBe(quantidadePaginas);
    await popup.close();
  }
});

test("controles operacionais ficam na visão operacional", async ({ page }) => {
  await page.goto("/");
  await page.getByLabel("Usuário").fill("admin.nexo");
  await page.locator("#login-password").fill("Admin@2026");
  const loginReload = page.waitForEvent("load");
  await page.getByRole("button", { name: "Entrar" }).click();
  await expect(page.locator("#nexo-auth-overlay")).toHaveCount(0, { timeout: 15_000 });
  await loginReload;
  await aguardarBancoDisponivel(page);
  await page.evaluate(() => {
    window.nexoViewWindows = {};
    window.ccoMuralWindow = null;
  });

  const popupPromise = page.waitForEvent("popup");
  await page.locator("#tab-operacional").click();
  const popup = await popupPromise;
  await expect(popup.locator(".operational-global-controls")).toBeVisible();
  await expect(popup.locator("header #seletor-filtro")).toHaveCount(0);
  await expect(popup.locator("header #seletor-data")).toHaveCount(0);
  await expect(popup.locator("#seletor-filtro")).toBeVisible();
  await expect(popup.locator("#seletor-data")).toBeVisible();
  await expect(popup.locator("#painel-operacional .btn-view-mode-cco")).toBeVisible();

  await popup.locator("#painel-operacional .btn-view-mode-cco").click();
  await expect(popup.locator("body")).toHaveClass(/modo-cco-ativo/);
  await popup.close();
});

test("clique no mural abre o reservatório direto na investigação", async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem("nexo_hidrico_reservatorios_config", JSON.stringify({
      "R01-A": { nivelAtencao: 101, nivelCritico: 100, alertaNivelAtivo: true }
    }));
  });
  await page.goto("/?view=alarmes");
  await page.getByLabel("Usuário").fill("admin.nexo");
  await page.locator("#login-password").fill("Admin@2026");
  const loginReload = page.waitForEvent("load");
  await page.getByRole("button", { name: "Entrar" }).click();
  await expect(page.locator("#nexo-auth-overlay")).toHaveCount(0, { timeout: 15_000 });
  await loginReload;

  await expect(page.locator("#painel-alarmes")).toBeVisible({ timeout: 15_000 });
  const alarme = page.locator("#grid-alarmes .mural-alarm-card").filter({ hasText: "R01-A" }).first();
  await expect(alarme).toBeVisible({ timeout: 15_000 });
  const investigacaoPromise = page.waitForEvent("popup");
  await alarme.click();
  const investigacao = await investigacaoPromise;

  await expect(investigacao).toHaveURL(/[?&]view=investigacao(?:&|$)/);
  await expect(investigacao).toHaveURL(/[?&]reservatorio=R01-A(?:&|$)/);
  await expect(investigacao.locator("#painel-investigacao-alarme")).toBeVisible({ timeout: 15_000 });
  await expect(investigacao.locator("#cco-lean-investigation-header")).toBeVisible({ timeout: 15_000 });
  await expect(investigacao.locator("#cco-investigation-title")).toHaveText("R01-A");
  await expect(investigacao.locator("body")).toHaveClass(/is-cco-investigation-active/);
  await expect(investigacao.locator("header")).toBeHidden();
  await expect(investigacao.locator(".view-tabs")).toBeHidden();
  const dadosInvestigados = await investigacao.evaluate(() => {
    const data = document.getElementById("seletor-data").value;
    return {
      data,
      acionadoEm: window.ccoAlarmTriggerTimes?.get(`${data}_R01-A`) || "Não registrado",
      ultimaAtualizacao: window.bancoDeDados.historico[data]?.ultimaAtualizacao || "Não informada"
    };
  });
  await expect(investigacao.locator("#cco-investigation-date")).toHaveText(dadosInvestigados.acionadoEm);
  await expect(investigacao.locator("#cco-investigation-updated-at")).toHaveText(dadosInvestigados.ultimaAtualizacao);
  await investigacao.close();
});

test("migra contas e dados locais legados sem removê-los", async ({ page }) => {
  await page.goto("/manual-imagens/nexo-hidrico-icon.svg");
  await page.evaluate(async () => {
    const abrirBanco = (nome, stores) => new Promise((resolve, reject) => {
      const request = indexedDB.open(nome, nome === "SamaeCCOStorageDB" ? 2 : 1);
      request.onupgradeneeded = () => {
        const db = request.result;
        stores.forEach(({ name, options, indexes = [] }) => {
          const store = db.createObjectStore(name, options);
          indexes.forEach((index) => store.createIndex(index.name, index.keyPath, { unique: false }));
        });
      };
      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve(request.result);
    });
    const gravar = (db, nomeStore, operation) => new Promise((resolve, reject) => {
      const transaction = db.transaction(nomeStore, "readwrite");
      operation(transaction);
      transaction.oncomplete = resolve;
      transaction.onerror = () => reject(transaction.error);
    });

    const authDb = await abrirBanco("SamaeAuthDB", [
      { name: "usuarios", options: { keyPath: "username" }, indexes: [{ name: "email", keyPath: "email" }] },
      { name: "auditoria", options: { keyPath: "id", autoIncrement: true } }
    ]);
    await gravar(authDb, ["usuarios", "auditoria"], (transaction) => {
      transaction.objectStore("usuarios").put({
        username: "admin.samae",
        senha: "SenhaCustom@2026",
        email: "admin@exemplo.com",
        role: "ADMIN",
        primeiroAcesso: false,
        bloqueado: false,
        tentativasFalhas: 1,
        requerRedefinicao: false
      });
      transaction.objectStore("usuarios").put({
        username: "agent.samae",
        senha: "SenhaOperador@2026",
        email: "operador@exemplo.com",
        role: "Agent",
        primeiroAcesso: false,
        bloqueado: false,
        tentativasFalhas: 2,
        requerRedefinicao: false
      });
      transaction.objectStore("auditoria").add({ usuario: "admin.samae", acao: "LOGIN_SUCESSO" });
    });
    authDb.close();

    const storageDb = await abrirBanco("SamaeCCOStorageDB", [
      { name: "reconhecidos", options: { keyPath: "chave" } },
      { name: "logs", options: { keyPath: "id", autoIncrement: true } }
    ]);
    await gravar(storageDb, ["reconhecidos", "logs"], (transaction) => {
      transaction.objectStore("reconhecidos").put({ chave: "R-LEGADO", severidade: "Atenção", timestamp: 100 });
      transaction.objectStore("logs").add({ chave: "R-LEGADO", acao: "Reconhecido" });
    });
    storageDb.close();

    const handlesDb = await abrirBanco("SamaeHandlesDB", [
      { name: "handles", options: {} }
    ]);
    await gravar(handlesDb, "handles", (transaction) =>
      transaction.objectStore("handles").put("handle-legado", "configFile")
    );
    handlesDb.close();

    localStorage.setItem("samae_cco_session", JSON.stringify({ username: "admin.samae", role: "ADMIN" }));
    localStorage.setItem("samai_reservatorios_config", JSON.stringify({ "R-LEGADO": { nivelAtencao: 70 } }));
    localStorage.setItem("samai_global_config", JSON.stringify({ caminhoLocal: "C:/Samae/Relatorios" }));
    localStorage.setItem("samae_cco_reconhecidos", JSON.stringify({ "R-LOCAL": "Crítico" }));
    localStorage.setItem("samae_cco_ack_metadata", JSON.stringify({ "R-LOCAL": { operador: "admin.samae" } }));
    localStorage.setItem("samae_cco_ack_tombstones", JSON.stringify({ "R-REMOVIDO": 200 }));
    localStorage.setItem("samae_cco_incidents_log", JSON.stringify([{ chave: "R-HIST", acao: "Revogado" }]));
    localStorage.setItem("samae_cco_trigger_times", JSON.stringify({ "R-LOCAL": "03/11/2026 07:00:00" }));
    localStorage.setItem("samai_cco_external_notifications", JSON.stringify([{ id: "n1", lida: false }]));
    localStorage.setItem("samai_cco_sound_enabled", "false");
  });

  await page.goto("/");
  await expect(page.locator("#nexo-auth-overlay")).toHaveCount(0, { timeout: 15_000 });
  await expect(page.locator("#logged-username-display")).toContainText("admin.nexo");

  const dadosMigrados = await page.evaluate(async () => {
    const usuario = await window.AuthRepository.obterUsuario("admin.nexo");
    const operador = await window.AuthRepository.obterUsuario("operador.nexo");
    const auditoria = await window.AuthRepository.obterLogsAuditoria();
    const bancoLegado = await new Promise((resolve, reject) => {
      const request = indexedDB.open("SamaeAuthDB");
      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve(request.result);
    });
    const usuarioLegado = await new Promise((resolve, reject) => {
      const request = bancoLegado.transaction("usuarios", "readonly")
        .objectStore("usuarios").get("admin.samae");
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
    bancoLegado.close();
    const reconhecidos = await window.StorageRepository.executarTransacao(
      "reconhecidos",
      "readonly",
      (store) => store.getAll()
    );
    const logs = await window.StorageRepository.carregarLogs();
    const handlesDb = await new Promise((resolve, reject) => {
      const request = indexedDB.open("NexoHandlesDB", 1);
      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve(request.result);
    });
    const handle = await new Promise((resolve, reject) => {
      const request = handlesDb.transaction("handles", "readonly").objectStore("handles").get("configFile");
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
    handlesDb.close();
    return {
      usuario,
      operador,
      usuarioLegado,
      auditoriaUsuario: auditoria[0]?.usuario,
      reconhecido: reconhecidos.find((item) => item.chave === "R-LEGADO"),
      log: logs.find((item) => item.chave === "R-LEGADO"),
      handle,
      sessao: JSON.parse(localStorage.getItem("nexo_hidrico_session")),
      config: JSON.parse(localStorage.getItem("nexo_hidrico_reservatorios_config")),
      configGlobal: JSON.parse(localStorage.getItem("nexo_hidrico_global_config")),
      reconhecidosLocal: JSON.parse(localStorage.getItem("nexo_hidrico_reconhecidos")),
      metadadosLocal: JSON.parse(localStorage.getItem("nexo_hidrico_ack_metadata")),
      tombstonesLocal: JSON.parse(localStorage.getItem("nexo_hidrico_ack_tombstones")),
      historicoLocal: JSON.parse(localStorage.getItem("nexo_hidrico_incidents_log")),
      temposLocal: JSON.parse(localStorage.getItem("nexo_hidrico_trigger_times")),
      notificacoes: JSON.parse(localStorage.getItem("nexo_hidrico_external_notifications")),
      som: localStorage.getItem("nexo_hidrico_sound_enabled"),
      sessaoLegada: localStorage.getItem("samae_cco_session"),
      migracao: localStorage.getItem("nexo_hidrico_migration_version")
    };
  });
  expect(dadosMigrados.usuario).toMatchObject({
    username: "admin.nexo",
    senha: "SenhaCustom@2026",
    role: "ADMIN",
    tentativasFalhas: 1
  });
  expect(dadosMigrados.usuarioLegado.senha).toBe("SenhaCustom@2026");
  expect(dadosMigrados.operador).toMatchObject({
    username: "operador.nexo",
    senha: "SenhaOperador@2026",
    role: "Agent",
    tentativasFalhas: 2
  });
  expect(dadosMigrados.auditoriaUsuario).toBe("admin.samae");
  expect(dadosMigrados.reconhecido.severidade).toBe("Atenção");
  expect(dadosMigrados.log.acao).toBe("Reconhecido");
  expect(dadosMigrados.handle).toBe("handle-legado");
  expect(dadosMigrados.sessao).toEqual({ username: "admin.nexo", role: "ADMIN" });
  expect(dadosMigrados.config["R-LEGADO"].nivelAtencao).toBe(70);
  expect(dadosMigrados.configGlobal.caminhoLocal).toBe("C:/Samae/Relatorios");
  expect(dadosMigrados.reconhecidosLocal["R-LOCAL"]).toBe("Crítico");
  expect(dadosMigrados.metadadosLocal["R-LOCAL"].operador).toBe("admin.samae");
  expect(dadosMigrados.tombstonesLocal["R-REMOVIDO"]).toBe(200);
  expect(dadosMigrados.historicoLocal[0].acao).toBe("Revogado");
  expect(dadosMigrados.temposLocal["R-LOCAL"]).toBe("03/11/2026 07:00:00");
  expect(dadosMigrados.notificacoes).toEqual([{ id: "n1", lida: false }]);
  expect(dadosMigrados.som).toBe("false");
  expect(JSON.parse(dadosMigrados.sessaoLegada).username).toBe("admin.samae");
  expect(dadosMigrados.migracao).toBe("1");
});

test("logout permite entrar novamente com a mesma conta", async ({ page }) => {
  await page.goto("/");
  await page.getByLabel("Usuário").fill("admin.nexo");
  await page.locator("#login-password").fill("Admin@2026");
  const loginReload = page.waitForEvent("load");
  await page.getByRole("button", { name: "Entrar" }).click();
  await expect(page.locator("#nexo-auth-overlay")).toHaveCount(0, { timeout: 15_000 });
  await loginReload;

  // Cancelar na janela de logout mantém a sessão.
  await page.locator("#btn-global-logout").click();
  await expect(page.locator("#dialogo-cco")).toContainText("Deseja realmente encerrar a sessão atual?");
  await page.locator("#dialogo-cco").getByRole("button", { name: "Cancelar" }).click();
  await expect(page.locator("#dialogo-cco")).toHaveCount(0);
  expect(await page.evaluate(() => localStorage.getItem("nexo_hidrico_session"))).not.toBeNull();

  const logoutReload = page.waitForEvent("load");
  await page.locator("#btn-global-logout").click();
  await page.locator("#dialogo-cco").getByRole("button", { name: "Sair" }).click();
  await logoutReload;
  await expect(page.locator("#nexo-auth-overlay")).toBeVisible({ timeout: 15_000 });
  expect(await page.evaluate(() => localStorage.getItem("nexo_hidrico_session"))).toBeNull();

  await page.getByLabel("Usuário").fill("admin.nexo");
  await page.locator("#login-password").fill("Admin@2026");
  const reloginReload = page.waitForEvent("load");
  await page.getByRole("button", { name: "Entrar" }).click();
  await expect(page.locator("#nexo-auth-overlay")).toHaveCount(0, { timeout: 15_000 });
  await reloginReload;
  await expect(page.locator("#logged-username-display")).toContainText("admin.nexo");
});

test("bloqueio de uma conta não impede o login de outro usuário", async ({ page }) => {
  test.setTimeout(60_000);
  await page.goto("/");

  await page.getByLabel("Usuário").fill("operador.nexo");
  await page.locator("#login-password").fill("Agent@2026");
  const operatorLoginReload = page.waitForEvent("load");
  await page.getByRole("button", { name: "Entrar" }).click();
  await expect(page.locator("#nexo-auth-overlay")).toHaveCount(0, { timeout: 15_000 });
  await operatorLoginReload;
  const operatorLogoutReload = page.waitForEvent("load");
  await page.locator("#btn-global-logout").click();
  await page.locator("#dialogo-cco").getByRole("button", { name: "Sair" }).click();
  await operatorLogoutReload;
  await expect(page.locator("#nexo-auth-overlay")).toBeVisible({ timeout: 15_000 });

  for (let tentativa = 1; tentativa <= 3; tentativa += 1) {
    await page.getByLabel("Usuário").fill("admin.nexo");
    await page.locator("#login-password").fill("senha-incorreta");
    await page.getByRole("button", { name: "Entrar" }).click();
  }
  await expect(page.getByRole("alert")).toContainText("Conta bloqueada por segurança");

  await page.getByLabel("Usuário").fill("operador.nexo");
  await page.locator("#login-password").fill("Agent@2026");
  const operatorReloginReload = page.waitForEvent("load");
  await page.getByRole("button", { name: "Entrar" }).click();
  await expect(page.locator("#nexo-auth-overlay")).toHaveCount(0, { timeout: 15_000 });
  await operatorReloginReload;
  await expect(page.locator("#logged-username-display")).toContainText("operador.nexo");
});

test("painel alerta quando um arquivo mensal não carrega", async ({ page }) => {
  await page.route("**/dados_historicos/2026_10.json", (route) => route.abort());
  await page.goto("/");

  const aviso = page.locator("#data-load-status");
  await expect(aviso).toBeVisible({ timeout: 15_000 });
  await expect(aviso).toContainText("dados_historicos/2026_10.json");
  await expect(aviso).toContainText("dados podem estar incompletos");
});

test("reconhecimento do alarme persiste e sincroniza entre janelas", async ({ page, context }) => {
  test.setTimeout(60_000);
  await context.addInitScript(() => {
    localStorage.setItem("nexo_hidrico_reservatorios_config", JSON.stringify({
      // Nível do R01-A (~83%) entre 50 e 101: alarme de nível em "Atenção". A configuração por
      // reservatório agora vale em avaliarStatusNivel; com nivelCritico: 100 o nível seria "Crítico".
      "R01-A": { nivelAtencao: 101, nivelCritico: 50, alertaNivelAtivo: true }
    }));
  });

  await page.goto("/");
  await page.getByLabel("Usuário").fill("admin.nexo");
  await page.locator("#login-password").fill("Admin@2026");
  const loginReload = page.waitForEvent("load");
  await page.getByRole("button", { name: "Entrar" }).click();
  await expect(page.locator("#nexo-auth-overlay")).toHaveCount(0, { timeout: 15_000 });
  await loginReload;

  await page.goto("/?view=alarmes");
  await expect(page.locator("#painel-alarmes")).toBeVisible({ timeout: 15_000 });

  const alarme = page.locator("#grid-alarmes .mural-alarm-card").filter({ hasText: "R01-A" }).first();
  await expect(alarme).toBeVisible({ timeout: 15_000 });
  await alarme.getByRole("button", { name: /Reconhecer/ }).click();
  await page.locator("#dialogo-cco").getByRole("button", { name: "Reconhecer" }).click();
  await expect(alarme.locator("button").filter({ hasText: "✓" })).toBeVisible();
  await expect.poll(() =>
    page.evaluate(() => JSON.parse(localStorage.getItem("nexo_hidrico_reconhecidos") || "{}")["R01-A"])
  ).toBe("Atenção");

  const segundaJanela = await context.newPage();
  await segundaJanela.goto("/?view=alarmes");
  await expect(segundaJanela.locator("#nexo-auth-overlay")).toHaveCount(0, { timeout: 15_000 });
  await expect(segundaJanela.locator("#painel-alarmes")).toBeVisible({ timeout: 15_000 });
  const alarmeSegundaJanela = segundaJanela
    .locator("#grid-alarmes .mural-alarm-card")
    .filter({ hasText: "R01-A" })
    .first();
  await expect(alarmeSegundaJanela.locator("button").filter({ hasText: "✓" })).toBeVisible({ timeout: 15_000 });
  await expect.poll(() =>
    segundaJanela.evaluate(() => window.ccoAckMetadata.get("R01-A")?.operador)
  ).toBe("admin.nexo");

  await page.reload();
  await expect(page.locator("#nexo-auth-overlay")).toHaveCount(0, { timeout: 15_000 });
  await expect(page.locator("#painel-alarmes")).toBeVisible({ timeout: 15_000 });
  const alarmePersistido = page.locator("#grid-alarmes .mural-alarm-card").filter({ hasText: "R01-A" }).first();
  await expect(alarmePersistido.locator("button").filter({ hasText: "✓" })).toBeVisible({ timeout: 15_000 });
  await expect.poll(() =>
    page.evaluate(async () => {
      const registros = await window.StorageRepository.executarTransacao(
        "reconhecidos",
        "readonly",
        (store) => store.getAll()
      );
      return registros.find((registro) => registro.chave === "R01-A")?.metadados?.operador;
    })
  ).toBe("admin.nexo");
});

test("configuração por reservatório valida os limites e preserva o arquivo vinculado", async ({ page }) => {
  test.setTimeout(90_000);
  await page.goto("/?view=configuracoes");
  await page.getByLabel("Usuário").fill("admin.nexo");
  await page.locator("#login-password").fill("Admin@2026");
  const loginReload = page.waitForEvent("load");
  await page.getByRole("button", { name: "Entrar" }).click();
  await expect(page.locator("#nexo-auth-overlay")).toHaveCount(0, { timeout: 15_000 });
  await loginReload;
  await aguardarBancoDisponivel(page);

  // Arquivo vinculado falso: guarda o conteúdo em memória, como o arquivo real faria.
  const original = JSON.stringify({
    "R01-A": { nivelAtencao: 70, nivelCritico: 55 },
    "R02": { nivelAtencao: 65, nivelCritico: 45 },
    "_estado_plantao": { reconhecidos: [["R09", "Crítico"]] }
  });
  await page.evaluate((conteudoInicial) => {
    window.__arquivoFalso = { conteudo: conteudoInicial };
    configFileHandle = {
      getFile: async () => ({ text: async () => window.__arquivoFalso.conteudo }),
      createWritable: async () => {
        let texto = "";
        return {
          write: async (valor) => { texto = valor; },
          close: async () => { window.__arquivoFalso.conteudo = texto; }
        };
      }
    };
    localStorage.removeItem("nexo_hidrico_reservatorios_config");
    document.getElementById("painel-configuracoes").hidden = false;
    renderizarPainelConfiguracoes();
    const banco = window.bancoDeDados;
    const dia = banco.datasDisponiveis[banco.datasDisponiveis.length - 1];
    renderizarFormularioConfiguracao("R01-A", banco.historico[dia].reservatorios["R01-A"]);
  }, original);

  const guardar = () => page.locator("#form-config-reservatorio button[type=submit]").click();
  const mensagem = page.locator("#configuracao-mensagem");
  const lerArquivo = () => page.evaluate(() => window.__arquivoFalso.conteudo);
  const lerSalvoNoNavegador = () =>
    page.evaluate(() => localStorage.getItem("nexo_hidrico_reservatorios_config"));

  // 1) Crítico maior que atenção: não guarda nem no navegador nem no arquivo.
  await page.locator("#cfg-nivel-atencao").fill("40");
  await page.locator("#cfg-nivel-critico").fill("50");
  await guardar();
  await expect(mensagem).toContainText("NÃO guardada");
  await expect(mensagem).toContainText("deve ser menor que o de atenção");
  expect(await lerArquivo()).toBe(original);
  expect(await lerSalvoNoNavegador()).toBeNull();

  // 2) Valores válidos: atualiza só o R01-A e preserva o R02 e o estado de plantão do arquivo.
  await page.locator("#cfg-nivel-atencao").fill("65");
  await page.locator("#cfg-nivel-critico").fill("40");
  await guardar();
  await expect(mensagem).toContainText("guardada e salva no arquivo");
  const gravado = JSON.parse(await lerArquivo());
  expect(gravado["R01-A"].nivelAtencao).toBe(65);
  expect(gravado["R01-A"].nivelCritico).toBe(40);
  expect(gravado["R02"]).toEqual({ nivelAtencao: 65, nivelCritico: 45 });
  expect(gravado["_estado_plantao"]).toEqual({ reconhecidos: [["R09", "Crítico"]] });

  // 3) Arquivo ilegível: a configuração fica no navegador, o arquivo não é sobrescrito e há aviso.
  await page.evaluate(() => { window.__arquivoFalso.conteudo = "{conteudo quebrado"; });
  await page.locator("#cfg-nivel-atencao").fill("62");
  await guardar();
  await expect(mensagem).toContainText("NÃO foi gravada no arquivo vinculado");
  expect(await lerArquivo()).toBe("{conteudo quebrado");
  expect(JSON.parse(await lerSalvoNoNavegador())["R01-A"].nivelAtencao).toBe(62);

  // 4) Sem arquivo vinculado: avisa que vale só neste navegador; campo vazio usa o padrão e é informado.
  await page.evaluate(() => { configFileHandle = null; });
  await page.locator("#cfg-vazao-media-atencao").fill("");
  await guardar();
  await expect(mensagem).toContainText("apenas neste navegador");
  await expect(mensagem).toContainText("vazão média – atenção");
});

async function entrar(page, usuario, senha) {
  await page.getByLabel("Usuário").fill(usuario);
  await page.locator("#login-password").fill(senha);
  const loginReload = page.waitForEvent("load");
  await page.getByRole("button", { name: "Entrar" }).click();
  await expect(page.locator("#nexo-auth-overlay")).toHaveCount(0, { timeout: 15_000 });
  await loginReload;
}

test("base dos alarmes: só ADMIN altera em Parâmetros Globais e a troca é auditada", async ({ page }) => {
  await page.goto("/?view=configuracoes");
  await entrar(page, "admin.nexo", "Admin@2026");

  await page.getByRole("button", { name: /Parâmetros Globais/ }).click();
  const seletor = page.locator("#cfg-base-comparacao-alarme");
  await expect(seletor).toHaveValue("same-weekday-4");
  await seletor.selectOption("7d-calendar");
  await page.getByRole("button", { name: "Salvar Parâmetros Globais" }).click();
  await expect(page.locator("#global-config-msg")).toContainText("salvos com sucesso");

  const resultado = await page.evaluate(async () => ({
    base: JSON.parse(localStorage.getItem("nexo_hidrico_global_config")).baseComparacaoAlarme,
    auditoria: (await window.AuthRepository.obterLogsAuditoria())
      .filter((log) => log.acao === "BASE_ALARME_ALTERADA")
      .map((log) => ({ usuario: log.usuario, detalhes: log.detalhes })),
  }));
  expect(resultado.base).toBe("7d-calendar");
  expect(resultado.auditoria).toEqual([
    {
      usuario: "admin.nexo",
      detalhes: "Base de comparação dos alarmes: mesmo dia da semana: 4 últimos com dado válido (até 8 semanas) → últimos 7 dias corridos",
    },
  ]);
});

test("Agent não acessa a base dos alarmes em Parâmetros Globais", async ({ page }) => {
  await page.goto("/?view=configuracoes");
  await entrar(page, "operador.nexo", "Agent@2026");
  await expect(page.locator("#painel-configuracoes")).toBeVisible({ timeout: 15_000 });
  await expect(page.getByRole("button", { name: /Parâmetros Globais/ })).toHaveCount(0);
  await expect(page.locator("#cfg-base-comparacao-alarme")).toHaveCount(0);
});

test("investigação mostra a base dos alarmes, avisa valor inválido e acompanha a troca em outra janela", async ({ page, context }) => {
  await page.addInitScript(() => {
    if (sessionStorage.getItem("e2e-semeado")) return;
    sessionStorage.setItem("e2e-semeado", "1");
    localStorage.setItem("nexo_hidrico_global_config", JSON.stringify({ baseComparacaoAlarme: "dia_anterior" }));
  });
  await page.goto("/");
  await entrar(page, "admin.nexo", "Admin@2026");
  await aguardarBancoDisponivel(page);

  // Seletor de análise segue livre; o indicador diz qual base os alarmes usam e avisa o valor inválido.
  await expect(page.locator("#indicador-base-alarme")).toContainText("inválida");
  await expect(page.locator("#indicador-base-alarme")).toContainText("mesmo dia da semana: 4 últimos com dado válido");

  const investigacao = await context.newPage();
  await investigacao.goto("/?view=investigacao&reservatorio=R01-A");
  const base = investigacao.locator("#cco-investigation-base");
  await expect(base).toContainText("mesmo dia da semana: 4 últimos com dado válido", { timeout: 15_000 });
  await expect(base).toContainText("inválida");

  // Mudança salva em outra janela chega pelo evento storage e redesenha a investigação.
  await page.evaluate(() => {
    localStorage.setItem("nexo_hidrico_global_config", JSON.stringify({ baseComparacaoAlarme: "30d-calendar" }));
  });
  await expect(base).toHaveText("últimos 30 dias corridos");

  // E no sentido inverso: a janela principal atualiza o indicador (o evento não dispara na janela que gravou).
  await investigacao.evaluate(() => {
    localStorage.setItem("nexo_hidrico_global_config", JSON.stringify({ baseComparacaoAlarme: "global" }));
  });
  await expect(page.locator("#indicador-base-alarme")).toHaveText(
    "Alarmes usam: histórico global (Parâmetros Globais).",
  );
  await investigacao.close();
});

test("base mesmo dia da semana: busca a semana anterior quando falta vazão e avisa no Mural sem base", async ({ page }) => {
  await page.goto("/?view=alarmes");
  await entrar(page, "admin.nexo", "Admin@2026");
  await expect(page.locator("#painel-alarmes")).toBeVisible({ timeout: 15_000 });
  await aguardarBancoDisponivel(page);

  const resultado = await page.evaluate(() => {
    const banco = window.bancoDeDados;
    const data = banco.datasDisponiveis[banco.datasDisponiveis.length - 1];
    const horarios = banco.historico[data].horarios;
    const referencia = () => obterReferenciaVazao(banco, "R01-A", data, "same-weekday-4", horarios);
    const curta = (r) => ({ datas: r.datas, semVazao: r.datasSemVazaoValida });

    const completa = curta(referencia());
    // Falta a vazão da terça mais recente: entra a 5ª (mais antiga) no lugar dela.
    const maisRecente = completa.datas[0];
    banco.historico[maisRecente].reservatorios["R01-A"].leituras.vazao = [null, null, null, null, null, null];
    const comFalta = curta(referencia());
    return { completa, comFalta, maisRecente };
  });
  expect(resultado.completa.datas).toHaveLength(4);
  expect(resultado.completa.semVazao).toEqual([]);
  expect(resultado.comFalta.datas).toHaveLength(4);
  expect(resultado.comFalta.datas).not.toContain(resultado.maisRecente);
  // Exatamente uma data nova (a 5ª semana) entrou no lugar da que ficou sem vazão.
  expect(resultado.comFalta.datas.filter((d) => !resultado.completa.datas.includes(d))).toHaveLength(1);
  expect(resultado.comFalta.semVazao).toEqual([resultado.maisRecente]);

  // Sem nenhum dia válido na janela de 8 semanas: aviso informativo no Mural (não vira alarme).
  await page.evaluate(() => {
    const banco = window.bancoDeDados;
    const data = banco.datasDisponiveis[banco.datasDisponiveis.length - 1];
    obterDatasBaseComparacao(banco, data, "same-weekday-4").forEach((dia) => {
      const res = banco.historico[dia]?.reservatorios?.["R01-A"];
      if (res) res.leituras.vazao = res.leituras.vazao.map(() => null);
    });
    renderizarDashboardExceccoes();
  });
  const aviso = page.locator("#aviso-base-vazao-mural");
  await expect(aviso).toBeVisible();
  await expect(aviso).toContainText("alarme de vazão inativo");
  await expect(aviso).toContainText("R01-A (0 dia(s) com vazão válida)");
});

test("investigação aberta acompanha o reconhecimento feito no Mural e mostra N/A sem vazão válida", async ({ page, context }) => {
  await page.addInitScript(() => {
    localStorage.setItem("nexo_hidrico_reservatorios_config", JSON.stringify({
      "R01-A": { nivelAtencao: 101, nivelCritico: 100, alertaNivelAtivo: true }
    }));
  });
  await page.goto("/?view=alarmes");
  await entrar(page, "admin.nexo", "Admin@2026");
  await expect(page.locator("#grid-alarmes .mural-alarm-card").filter({ hasText: "R01-A" }).first())
    .toBeVisible({ timeout: 15_000 });

  const investigacao = await context.newPage();
  await investigacao.goto("/?view=investigacao&reservatorio=R01-A");
  const botaoAck = investigacao.locator("#btn-ack-dedicated-R01_A");
  await expect(botaoAck).toHaveText("🚨 Reconhecer", { timeout: 15_000 });

  // Reconhece no Mural (outra janela): a investigação recebe pelo BroadcastChannel e redesenha.
  await page.evaluate(() => { toggleAckMural("R01-A", "Crítico", "R01-A"); });
  await page.locator("#dialogo-cco-nota").fill("teste e2e");
  await page.locator("#dialogo-cco").getByRole("button", { name: "Reconhecer" }).click();
  await expect(botaoAck).toHaveText(/^✓ /);
  await expect(botaoAck).toHaveClass(/inv-btn--ack-done/);

  // Revoga no Mural (ADMIN confirma): volta a "Reconhecer" na investigação.
  await page.evaluate(() => { toggleAckMural("R01-A", "Crítico", "R01-A"); });
  await page.locator("#dialogo-cco").getByRole("button", { name: "Revogar" }).click();
  await expect(botaoAck).toHaveText("🚨 Reconhecer");

  // Vazão sem leitura válida (zerada): N/A, nunca "0 L/s".
  await investigacao.evaluate(() => {
    const atual = window.nexoInvestigacaoAtual;
    atual.banco.historico[atual.dataSelecionada].reservatorios["R01-A"].leituras.vazao = [0, 0, 0, 0, 0, 0];
    window.renderizarPainelInvestigacaoDedicado(atual.chave, atual.dataSelecionada, atual.banco);
  });
  const vazaoSaida = investigacao.locator(".inv-param").filter({ hasText: "Vazão de Saída:" });
  await expect(vazaoSaida).toContainText("N/A (sem leitura válida)");
  await expect(vazaoSaida).not.toContainText("0 L/s");
  await investigacao.close();
});

test("investigação: tendência sob o medidor e vazão líquida com origem", async ({ page }) => {
  await page.addInitScript(() => {
    if (sessionStorage.getItem("e2e-config")) return;
    sessionStorage.setItem("e2e-config", "1");
    localStorage.setItem("nexo_hidrico_reservatorios_config", JSON.stringify({
      "R01-A": { nivelAtencao: 101, nivelCritico: 100, alertaNivelAtivo: true, capacidadeUtil: 500, possuiMedicaoVazao: true }
    }));
  });
  await page.goto("/");
  await entrar(page, "admin.nexo", "Admin@2026");
  await page.goto("/?view=investigacao&reservatorio=R01-A");

  const medidor = page.locator("#container-investigacao-alarme .inv-cards > div").nth(0);
  const parametros = page.locator("#container-investigacao-alarme .inv-cards > div").nth(1);
  await expect(medidor.locator(".inv-gauge-trend")).toContainText(/Tendência: (Subindo ↑|Descendo ↓|Estável →)/, { timeout: 15_000 });
  await expect(parametros).not.toContainText("Tendência:");
  await expect(parametros.locator(".inv-card-title")).toHaveText("Parâmetros Operacionais");
  // Limpeza: título curto e o nível só no medidor (a linha "Nível: X%" segue apenas na OS).
  await expect(page.locator("#container-investigacao-alarme .inv-panel-title")).toHaveText("Diagnóstico do Alarme");
  await expect(page.locator("#container-investigacao-alarme .inv-taxonomia")).not.toContainText(/Nível: \d/);
  await expect(page.locator("#container-investigacao-alarme .inv-taxonomia")).toContainText("Projeção:");

  const liquida = parametros.locator(".inv-param").filter({ hasText: "Vazão Líquida:" });
  // Com medição de vazão: a entrada não é medida, então a líquida é a própria saída e diz isso.
  await expect(liquida).toContainText(/\d+\.\d L\/s = saída \(entrada não medida\)/);
  await expect(liquida).not.toContainText(/enchendo|esvaziando/);

  const redesenhar = (config) => page.evaluate((cfg) => {
    localStorage.setItem("nexo_hidrico_reservatorios_config", JSON.stringify({ "R01-A": cfg }));
    const atual = window.nexoInvestigacaoAtual;
    window.renderizarPainelInvestigacaoDedicado(atual.chave, atual.dataSelecionada, atual.banco);
  }, config);

  // Sem medição de vazão: estimada pela variação do nível.
  await redesenhar({ nivelAtencao: 101, nivelCritico: 100, alertaNivelAtivo: true, capacidadeUtil: 500, possuiMedicaoVazao: false });
  await expect(liquida).toContainText(/\d+\.\d L\/s (enchendo|esvaziando|estável) \(pela variação do nível\)/);

  // Sem capacidade útil: N/A, sem número.
  await redesenhar({ nivelAtencao: 101, nivelCritico: 100, alertaNivelAtivo: true, possuiMedicaoVazao: false });
  await expect(liquida).toContainText("N/A (capacidade útil não configurada)");
});

const TEXTO_MALICIOSO = `<img src=x onerror="window.__xss=1">vazão < 10 & "ok"`;

test("janela do painel: Cancelar não reconhece, nota é gravada como texto, revogação pede confirmação e erros não somem", async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem("nexo_hidrico_reservatorios_config", JSON.stringify({
      "R01-A": { nivelAtencao: 101, nivelCritico: 100, alertaNivelAtivo: true }
    }));
  });
  page.on("dialog", (dialogo) => { throw new Error(`diálogo nativo inesperado: ${dialogo.message()}`); });
  await page.goto("/?view=alarmes");
  await entrar(page, "admin.nexo", "Admin@2026");
  const card = page.locator("#grid-alarmes .mural-alarm-card").filter({ hasText: "R01-A" }).first();
  await expect(card).toBeVisible({ timeout: 15_000 });
  const dialogo = page.locator("#dialogo-cco");
  const reconhecidoR01A = () => page.evaluate(() => window.ccoReconhecidos.has("R01-A"));

  // Cancelar (e Esc) fecham sem reconhecer; o foco começa no campo da nota.
  await card.getByRole("button", { name: /Reconhecer/ }).click();
  await expect(dialogo.getByRole("dialog")).toBeVisible();
  await expect(dialogo).toContainText("R01-A");
  await expect(page.locator("#dialogo-cco-nota")).toBeFocused();
  await dialogo.getByRole("button", { name: "Cancelar" }).click();
  await expect(dialogo).toHaveCount(0);
  expect(await reconhecidoR01A()).toBe(false);

  await card.getByRole("button", { name: /Reconhecer/ }).click();
  await page.keyboard.press("Escape");
  await expect(dialogo).toHaveCount(0);
  expect(await reconhecidoR01A()).toBe(false);

  // Reconhecido em outra janela enquanto esta estava aberta: nada é gravado por cima.
  await card.getByRole("button", { name: /Reconhecer/ }).click();
  await page.evaluate(() => window.ccoReconhecidos.set("R01-A", "Atenção"));
  await dialogo.getByRole("button", { name: "Reconhecer" }).click();
  await expect(page.getByText("foi alterado em outra janela; nada foi gravado")).toBeVisible();
  expect(await page.evaluate(() => window.ccoAckMetadata.has("R01-A"))).toBe(false);
  await page.evaluate(() => { window.ccoReconhecidos.delete("R01-A"); renderizarDashboardExceccoes(); });

  // Ctrl+Enter confirma; a nota com HTML é gravada e exibida como texto.
  await card.getByRole("button", { name: /Reconhecer/ }).click();
  await page.locator("#dialogo-cco-nota").fill(TEXTO_MALICIOSO);
  await page.keyboard.press("Control+Enter");
  await expect(dialogo).toHaveCount(0);
  await expect(card.locator("button").filter({ hasText: "✓" })).toBeVisible();
  expect(await page.evaluate(() => window.ccoAckMetadata.get("R01-A")?.nota)).toBe(TEXTO_MALICIOSO);
  await expect(page.locator("#grid-alarmes .mural-ack-nota").first()).toContainText(TEXTO_MALICIOSO);
  expect(await page.evaluate(() => window.__xss)).toBeUndefined();

  // Revogação: foco em Cancelar (Enter acidental não revoga); Cancelar mantém o reconhecimento.
  await card.locator("button").filter({ hasText: "✓" }).click();
  await expect(dialogo).toContainText("Revogar reconhecimento");
  await expect(dialogo.getByRole("button", { name: "Cancelar" })).toBeFocused();
  await page.keyboard.press("Enter");
  await expect(dialogo).toHaveCount(0);
  expect(await reconhecidoR01A()).toBe(true);

  // Falha ao gravar: aviso na janela (não some sozinho) e o estado volta ao anterior.
  await page.evaluate(() => {
    window.__removerOriginal = window.StorageRepository.removerReconhecido;
    window.StorageRepository.removerReconhecido = async () => { throw new Error("falha simulada"); };
  });
  await card.locator("button").filter({ hasText: "✓" }).click();
  await dialogo.getByRole("button", { name: "Revogar" }).click();
  await expect(dialogo.getByRole("alertdialog")).toContainText("Não foi possível salvar");
  expect(await reconhecidoR01A()).toBe(true);
  await dialogo.getByRole("button", { name: "Entendi" }).click();
  await expect(dialogo).toHaveCount(0);
  await page.evaluate(() => { window.StorageRepository.removerReconhecido = window.__removerOriginal; });

  // Aviso simples de "sem dados" vira toast, sem janela.
  await page.evaluate(() => window.baixarLogsFiltradosCSV([]));
  await expect(page.locator(".nexo-toast").filter({ hasText: "Nenhum dado para exportar" })).toBeVisible();
  await expect(dialogo).toHaveCount(0);

  // Perfil sem ADMIN: aviso de acesso negado na janela, sem revogar.
  await page.evaluate(() => localStorage.setItem("nexo_hidrico_session", JSON.stringify({ username: "operador.nexo", role: "Agent" })));
  await page.evaluate(() => { toggleAckMural("R01-A", "Crítico", "R01-A"); });
  await expect(dialogo.getByRole("alertdialog")).toContainText("Apenas administradores");
  await dialogo.getByRole("button", { name: "Entendi" }).click();
  await expect(dialogo).toHaveCount(0);
  expect(await reconhecidoR01A()).toBe(true);
});

test("nota do ACK com HTML aparece como texto nos 3 modos do Mural e no relatório exportado", async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem("nexo_hidrico_reservatorios_config", JSON.stringify({
      "R01-A": { nivelAtencao: 101, nivelCritico: 100, alertaNivelAtivo: true }
    }));
  });
  await page.goto("/?view=alarmes");
  await entrar(page, "admin.nexo", "Admin@2026");
  await expect(page.locator("#grid-alarmes .mural-alarm-card").filter({ hasText: "R01-A" }).first())
    .toBeVisible({ timeout: 15_000 });

  for (const modo of ["grade", "tabela", "kanban"]) {
    await page.evaluate(({ nota, modo }) => {
      window.ccoReconhecidos.set("R01-A", "Crítico");
      window.ccoAckMetadata.set("R01-A", { timestamp: "01/01/2026 00:00:00", operador: "admin.nexo", nota });
      salvarReconhecidosLocalStorage();
      window.ccoMuralModoVisualizacao = modo === "grade" ? "grid" : modo;
      renderizarDashboardExceccoes();
    }, { nota: TEXTO_MALICIOSO, modo });
    const nota = page.locator("#grid-alarmes .mural-ack-nota").first();
    await expect(nota, `modo ${modo}`).toContainText(TEXTO_MALICIOSO);
    await expect(page.locator("#grid-alarmes img")).toHaveCount(0);
  }

  const download = page.waitForEvent("download");
  await page.evaluate(() => document.getElementById("btn-exportar-html").click());
  const arquivo = await (await download).path();
  const html = require("fs").readFileSync(arquivo, "utf8");
  expect(html).toContain("&lt;img src=x onerror=&quot;window.__xss=1&quot;&gt;vazão &lt; 10 &amp; &quot;ok&quot;");
  expect(html).not.toContain("<img src=x");

  expect(await page.evaluate(() => window.__xss)).toBeUndefined();
});

test("usuário de login com HTML aparece como texto na trilha de auditoria", async ({ page }) => {
  await page.goto("/?view=configuracoes");
  await page.getByLabel("Usuário").fill(TEXTO_MALICIOSO);
  await page.locator("#login-password").fill("qualquer");
  await page.getByRole("button", { name: "Entrar" }).click();
  await expect(page.getByRole("alert")).toContainText("Usuário ou senha inválidos");

  await entrar(page, "admin.nexo", "Admin@2026");
  await page.getByRole("button", { name: /Logs de Auditoria/ }).click();
  const linha = page.locator("tr").filter({ hasText: "LOGIN_FALHOU" }).filter({ hasText: "vazão < 10" }).first();
  await expect(linha).toContainText(TEXTO_MALICIOSO, { timeout: 15_000 });
  await expect(page.locator("#config-detalhe-container img")).toHaveCount(0);
  expect(await page.evaluate(() => window.__xss)).toBeUndefined();
});

test("Parâmetros Globais com aspas e tags no valor salvo não quebram o formulário", async ({ page }) => {
  await page.addInitScript((valor) => {
    if (sessionStorage.getItem("e2e-global")) return;
    sessionStorage.setItem("e2e-global", "1");
    localStorage.setItem("nexo_hidrico_global_config", JSON.stringify({ emailsPlantao: valor, caminhoLocal: valor }));
  }, `"><img src=x onerror="window.__xss=1">`);
  await page.goto("/?view=configuracoes");
  await entrar(page, "admin.nexo", "Admin@2026");
  await page.getByRole("button", { name: /Parâmetros Globais/ }).click();
  await expect(page.locator("#cfg-emails-plantao")).toHaveValue(`"><img src=x onerror="window.__xss=1">`);
  await expect(page.locator("#cfg-caminho-local")).toHaveValue(`"><img src=x onerror="window.__xss=1">`);
  await expect(page.locator("#cfg-timer-1")).toHaveValue("05:00");
  await expect(page.locator("#form-parametros-globais img")).toHaveCount(0);
  expect(await page.evaluate(() => window.__xss)).toBeUndefined();
});

test("CSV da auditoria e de alarmes não deixa texto digitado virar fórmula", async ({ page }) => {
  const formula = `=HYPERLINK("http://exemplo.invalid";"clique")`;
  await page.goto("/?view=configuracoes");
  await page.getByLabel("Usuário").fill(formula);
  await page.locator("#login-password").fill("qualquer");
  await page.getByRole("button", { name: "Entrar" }).click();
  await expect(page.getByRole("alert")).toContainText("Usuário ou senha inválidos");
  await entrar(page, "admin.nexo", "Admin@2026");

  const lerDownload = async (acao) => {
    const download = page.waitForEvent("download");
    await page.evaluate(acao);
    return require("fs").readFileSync(await (await download).path(), "utf8");
  };

  const auditoria = await lerDownload(() => window.baixarLogsAuditoriaAdmin());
  const linhaFalha = auditoria.split("\n").find((linha) => linha.includes("HYPERLINK"));
  // Apóstrofo antes do "=", aspas dobradas, célula inteira entre aspas: o Excel mostra texto, não executa.
  expect(linhaFalha).toContain(`"'=HYPERLINK(""http://exemplo.invalid"";""clique"")"`);
  expect(auditoria.split("\n").some((linha) => /(^|;)=/.test(linha))).toBe(false);

  await page.goto("/?view=alarmes");
  await aguardarBancoDisponivel(page);
  const alarmes = await lerDownload(() => document.getElementById("btn-exportar-csv").click());
  const [cabecalho, primeira] = alarmes.replace(/^﻿/, "").split("\n");
  expect(cabecalho).toBe("Data;Chave;Reservatório;Severidade;Diagnóstico;Tendência");
  expect(primeira).toMatch(/^"\d{2}\/\d{2}\/\d{4}";"[^"]+";/);
});

test("investigação abre a Visão Operacional no mesmo reservatório e data", async ({ page }) => {
  await page.goto("/");
  await entrar(page, "admin.nexo", "Admin@2026");
  await page.goto("/?view=investigacao&reservatorio=R01-A&origem=mural&data=28/10/2026");

  const botao = page.locator("#container-investigacao-alarme .inv-panel-head #btn-investigacao-abrir-operacional");
  await expect(botao).toHaveText("📊 Ver na Visão Operacional", { timeout: 15_000 });
  const popupPromise = page.waitForEvent("popup");
  await botao.click();
  const operacional = await popupPromise;

  await expect(operacional).toHaveURL(/[?&]view=operacional(?:&|$)/);
  await expect(operacional.locator("#painel-operacional")).toBeVisible({ timeout: 15_000 });
  await expect(operacional.locator("#seletor-data")).toHaveValue("28/10/2026");
  await expect(operacional.locator("#seletor-filtro")).toHaveValue("reservatorio:R01-A");
  await operacional.close();

  // Data inexistente: abre na última data e avisa, sem trocar o dia em silêncio.
  await page.goto("/?view=operacional&reservatorio=R01-A&data=01/01/1999");
  await expect(page.locator("#nexo-toast-container")).toContainText("Data 01/01/1999 não encontrada nos dados", { timeout: 15_000 });
  const ultimaData = await page.evaluate(() => window.bancoDeDados.datasDisponiveis.at(-1));
  await expect(page.locator("#seletor-data")).toHaveValue(ultimaData);
});
