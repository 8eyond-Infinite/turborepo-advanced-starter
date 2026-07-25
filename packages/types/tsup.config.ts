import { defineConfig } from "tsup";
import ts from "typescript";

const ignoreDeprecations = Number.parseInt(ts.versionMajorMinor, 10) >= 6 ? "6.0" : "5.0";

export default defineConfig((options) => ({
    entry: ["src/index.ts"],
    format: ["esm", "cjs"],
    dts: {
        compilerOptions: {
            ignoreDeprecations,
        },
    },
    clean: !options.watch,
    sourcemap: true,
    splitting: false,
    treeshake: true,
    platform: "node",
    target: "node20",
}));
