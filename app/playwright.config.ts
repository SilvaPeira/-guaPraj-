import { defineConfig, devices } from "@playwright/test";
import webpush from "web-push";

// Chaves de notificação (VAPID) descartáveis, novas a cada execução.
const vapid = webpush.generateVAPIDKeys();

/**
 * Testes ponta a ponta (navegador de verdade) do ÁguaPrajá.
 *
 * Rodar:  npm run test:e2e        (gera o build e roda tudo)
 *         npm run test:e2e:rapido (usa o último build)
 *
 * Sobe o build de produção na porta 3230 com um banco PGlite descartável
 * (.data/pglite-e2e, apagado a cada execução). Não mexe no banco do dev nem no de produção.
 * Usa o Chrome instalado no computador (channel "chrome"): não precisa baixar navegador.
 */
const PORTA = 3230;
export const URL_BASE = `http://localhost:${PORTA}`;

export default defineConfig({
  testDir: "./e2e",
  // Os arquivos compartilham o mesmo banco: um de cada vez, na ordem dos nomes.
  workers: 1,
  fullyParallel: false,
  timeout: 90_000,
  expect: { timeout: 15_000 },
  retries: 0,
  reporter: [["list"], ["html", { open: "never", outputFolder: "e2e-relatorio" }]],
  outputDir: "e2e-resultados",
  use: {
    baseURL: URL_BASE,
    channel: "chrome",
    ...devices["Pixel 7"],
    // Pixel 7 já é Chromium; o canal "chrome" usa o Chrome do computador.
    locale: "pt-BR",
    timezoneId: "America/Belem",
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    video: "off",
  },
  webServer: {
    command: `node -e "require('fs').rmSync('.data/pglite-e2e',{recursive:true,force:true})" && npx next start -p ${PORTA}`,
    url: URL_BASE,
    timeout: 120_000,
    reuseExistingServer: false,
    stdout: "pipe",
    stderr: "pipe",
    env: {
      PGLITE_DIR: ".data/pglite-e2e",
      DATABASE_URL: "",
      APP_URL: URL_BASE,
      SESSION_SECRET: "segredo-so-para-testes-e2e-0123456789abcdef",
      CRON_SECRET: "cron-e2e",
      ADMIN_TELEFONES: "94911110000",
      OTP_MODO_TESTE: "1",
      E2E_PAGAMENTO_SIMULADO: "1",
      MP_CLIENT_ID: "",
      MP_CLIENT_SECRET: "",
      WHATSAPP_PROVEDOR: "",
      VAPID_PUBLIC_KEY: vapid.publicKey,
      VAPID_PRIVATE_KEY: vapid.privateKey,
    },
  },
});
