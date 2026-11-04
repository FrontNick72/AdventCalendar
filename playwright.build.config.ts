import { defineConfig } from '@playwright/test';
import base from './playwright.config';

// Use the same scenarios against the bundled files a phone or hosting will serve.
// Only the dev-only JSON-module interception needs Vite's development server.
export default defineConfig(base, {
  testIgnore: [],
  grepInvert: /@dev-content/,
  use: { baseURL: 'http://127.0.0.1:4183' },
  webServer: {
    command: 'npm run preview -- --port 4183 --strictPort',
    url: 'http://127.0.0.1:4183',
    reuseExistingServer: false,
  },
});
