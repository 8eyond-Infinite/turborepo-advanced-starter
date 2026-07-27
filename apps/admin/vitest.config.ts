import path from "node:path";
import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  test: {
    environment: "jsdom",
    restoreMocks: true,
    setupFiles: ["./src/test/setup.ts"],
    coverage: {
      provider: "v8",
      include: ["src/**/*.{ts,tsx}"],
      exclude: ["src/components/ui/**", "src/**/*.test.*", "src/test/**"],
      // Sàn hiện tại (thực đo ~13%) — chỉ nâng dần khi phủ thêm test,
      // không bao giờ hạ xuống.
      thresholds: {
        statements: 27,
        branches: 24,
        functions: 21,
        lines: 27,
      },
    },
  },
});
