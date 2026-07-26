import { defineConfig } from "vitest/config";
import path from "path";

export default defineConfig({
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "."),
      // "server-only" ném lỗi khi được import ngoài môi trường React Server
      // Component. Trong test (Node thuần) thay nó bằng module rỗng — điều
      // cần kiểm tra là logic, còn ranh giới server/client đã có build của
      // Next.js canh giữ.
      "server-only": path.resolve(__dirname, "test/stubs/server-only.ts"),
    },
  },
  test: {
    environment: "node",
    include: ["**/*.test.ts"],
    env: {
      SESSION_SECRET: "vitest-session-secret-vitest-session-secret",
    },
  },
});
