import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { visualizer } from "rollup-plugin-visualizer";
import path from "path";

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    // ANALYZE=1 pnpm --filter=admin build → mở dist/stats.html để xem
    // thứ gì đang chiếm chỗ trước khi quyết định chia chunk.
    ...(process.env.ANALYZE
      ? [
          visualizer({
            filename: "dist/stats.html",
            gzipSize: true,
            brotliSize: true,
          }),
        ]
      : []),
  ],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  build: {
    rollupOptions: {
      output: {
        // Tách vendor theo nhịp thay đổi: React/router gần như không đổi giữa
        // các lần deploy nên trình duyệt giữ được cache lâu, trong khi code
        // ứng dụng đổi liên tục. Gộp chung thì mỗi lần deploy người dùng phải
        // tải lại toàn bộ.
        manualChunks(id: string) {
          if (!id.includes("node_modules")) return;
          if (/[\\/]node_modules[\\/](react|react-dom|react-router)/.test(id))
            return "react-vendor";
          if (/[\\/]node_modules[\\/](@tanstack|zustand)/.test(id))
            return "data-vendor";
          if (/[\\/]node_modules[\\/](i18next|react-i18next)/.test(id))
            return "i18n-vendor";
          if (/[\\/]node_modules[\\/](socket\.io|engine\.io)/.test(id))
            return "realtime-vendor";
        },
      },
    },
    // Cảnh báo ở mức thấp hơn mặc định (500) để chunk phình lên là biết ngay.
    chunkSizeWarningLimit: 350,
  },
  server: {
    port: 5173,
  },
});
