// testes/run_tests.js - Test Runner principal do Nexo Hídrico
const executarTestesNotificacoes = require('./test_notificacoes');
const executarTestesMural = require('./test_mural');
const executarTestesRegras = require('./test_regras');
const executarTestesMultiwindowSync = require('./test_multiwindow_sync');
const executarTestesStorageRepository = require('./test_storage_repository');
const executarTestesTempoAlarme = require('./test_alarm_timing');
const executarTestesApiClientConfig = require('./test_api_client_config');
const executarTestesRecuperacaoDesativada = require('./test_auth_recovery_disabled');
const executarTestesFluxoLogin = require('./test_auth_login_flow');
const {
  executarTestesAvisoCarregamento,
  executarTesteEstadoInicialNavegacao,
} = require('./test_data_load_status_ui');

async function executarSuíte() {
  console.log("==========================================================");
  console.log("       SUÍTE DE TESTES AUTOMATIZADOS - NEXO HÍDRICO       ");
  console.log("==========================================================");

  executarTestesNotificacoes();
  executarTestesMural();
  executarTestesRegras();
  executarTestesMultiwindowSync();
  executarTestesRecuperacaoDesativada();
  await executarTestesFluxoLogin();
  executarTesteEstadoInicialNavegacao();
  executarTestesAvisoCarregamento();
  executarTestesTempoAlarme();
  await executarTestesApiClientConfig();
  await executarTestesStorageRepository();
  console.log("\n==========================================================");
  console.log("✓ Todos os testes passaram.");
  console.log("==========================================================");
}

executarSuíte().then(() => process.exit(0)).catch((error) => {
  console.error("\n❌ ERRO NOS TESTES:", error.message);
  process.exit(1);
});
