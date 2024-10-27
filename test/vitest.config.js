import { defineConfig } from "npm:vitest/config";

export default defineConfig({
  test: {
    browser: {
      provider: "playwright",
      enabled: true,
      headless: true,
      name: "chromium",
    },
  },
});
