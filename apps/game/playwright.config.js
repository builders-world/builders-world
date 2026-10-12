import { defineConfig } from '@playwright/test';
export default defineConfig({
  testDir: './tests', testMatch: '**/*.spec.js', workers: 1,
  // GitHub's runners draw 3D in software, several times slower than a laptop: more time there, and one retry
  timeout: process.env.CI ? 480000 : 60000, retries: process.env.CI ? 1 : 0, expect: { timeout: process.env.CI ? 20000 : 5000 },
  reporter: 'list', outputDir: 'artifacts/test-results',
  use: { baseURL: 'http://127.0.0.1:5173', channel: 'chromium', screenshot: 'only-on-failure', trace: 'retain-on-failure' },
  projects: [
    { name: 'desktop', use: { viewport: { width: 1440, height: 900 } } },
    { name: 'mobile', use: { viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, deviceScaleFactor: 1 } },
  ],
  webServer: { command: 'npm run dev -- --host 127.0.0.1', url: 'http://127.0.0.1:5173', reuseExistingServer: true },
});
