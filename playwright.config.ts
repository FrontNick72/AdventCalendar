import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests/browser',
  timeout: 90_000,
  fullyParallel: false,
  workers: 1,
  reporter: 'list',
  use: { baseURL: 'http://127.0.0.1:5173', trace: 'retain-on-failure' },
  projects: [
    { name: 'iphone-15-pro', use: { ...devices['iPhone 15 Pro'] } },
    { name: 'iphone-15-pro-reduced-motion', use: { ...devices['iPhone 15 Pro'], reducedMotion: 'reduce' } },
  ],
  webServer: { command: 'npm run dev', url: 'http://127.0.0.1:5173', reuseExistingServer: true },
});
