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
      // Sàn thấp hơn kết quả thực đo khoảng một điểm để tránh dao động nhỏ;
      // chỉ nâng dần khi phủ thêm test,
      // không bao giờ hạ xuống.
      thresholds: {
        statements: 35,
        branches: 34,
        functions: 26,
        lines: 35,
      },
    },
  },
});
