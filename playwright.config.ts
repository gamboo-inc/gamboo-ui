import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./tests",
  timeout: 30000,
  use: {
    baseURL: "http://localhost:3333",
    headless: true,
  },
  webServer: {
    command: "npx http-server . -p 3333 -s",
    port: 3333,
    reuseExistingServer: true,
  },
});
