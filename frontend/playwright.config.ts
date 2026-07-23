import { defineConfig, devices } from "@playwright/test";

const PORT = Number(process.env.E2E_PORT || 3012);
const MOCK_PORT = Number(process.env.MOCK_CORE_PORT || 3100);

/** bcrypt("changeme", 12) — overrides workspace .env hash */
const E2E_PASSWORD_HASH =
  "$2b$12$aPI.58saIoCKGqzhp/d.Ne8uuJIcxmU/36MAJk8oNOt7NKIPh5v.W";

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: 1,
  timeout: 60_000,
  expect: { timeout: 10_000 },
  reporter: [["list"]],
  use: {
    baseURL: `http://127.0.0.1:${PORT}`,
    trace: "on-first-retry",
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
  webServer: [
    {
      command: `node e2e/mock-core.mjs`,
      url: `http://127.0.0.1:${MOCK_PORT}/health`,
      reuseExistingServer: false,
      env: {
        ...process.env,
        MOCK_CORE_PORT: String(MOCK_PORT),
      },
      timeout: 30_000,
    },
    {
      // Build with production NODE_ENV; run server in Next prod mode (E2E_PROD_SERVER)
      // while keeping Auth.js on development cookies + password hash for http://
      command: `bash -c 'NODE_ENV=production npm run build && exec node server.mjs'`,
      url: `http://127.0.0.1:${PORT}/login`,
      reuseExistingServer: false,
      env: {
        ...process.env,
        PORT: String(PORT),
        HOST: "127.0.0.1",
        NODE_ENV: "development",
        E2E_PROD_SERVER: "1",
        COOKIE_SECURE: "false",
        AUTH_URL: `http://127.0.0.1:${PORT}`,
        CORE_URL: `http://127.0.0.1:${MOCK_PORT}`,
        SHORTLINK_BASE_URL: `http://127.0.0.1:${MOCK_PORT}`,
        AUTH_SECRET: "e2e-test-auth-secret-32chars-min",
        ADMIN_USERNAME: "admin",
        ADMIN_PASSWORD: "changeme",
        ADMIN_PASSWORD_HASH: E2E_PASSWORD_HASH,
        OPERATOR_USER_ID: "00000000-0000-4000-8000-000000000001",
      },
      timeout: 180_000,
    },
  ],
});
