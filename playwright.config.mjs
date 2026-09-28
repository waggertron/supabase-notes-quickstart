import { defineConfig } from '@playwright/test';
import { localConfig } from './scripts/local-config.mjs';

const local = localConfig();
export default defineConfig({
  testDir: './tests',
  testMatch: '**/*.spec.mjs',
  workers: 1,
  fullyParallel: false,
  retries: 0,
  reporter: 'list',
  globalSetup: './tests/http-check.mjs',
  use: { baseURL: 'http://127.0.0.1:5174', browserName: 'chromium', headless: true },
  webServer: {
    command: 'node node_modules/vite/bin/vite.js --host 127.0.0.1 --port 5174 --strictPort',
    url: 'http://127.0.0.1:5174',
    reuseExistingServer: false,
    env: { VITE_SUPABASE_URL: local.API_URL, VITE_SUPABASE_PUBLISHABLE_KEY: local.PUBLISHABLE_KEY },
  },
});
