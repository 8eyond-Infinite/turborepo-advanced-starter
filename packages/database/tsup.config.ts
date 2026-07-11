import { defineConfig } from "tsup";

export default defineConfig((options) => ({
    entry: ["src/index.ts"],
    format: ["esm", "cjs"],
    dts: true,
    clean: !options.watch,
    sourcemap: true,
    splitting: false,
    treeshake: true,
    platform: "node",
    target: "node20",
    external: ["@prisma/client"],
}));