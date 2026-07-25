import { defineConfig } from 'tsup';
import ts from 'typescript';

const ignoreDeprecations = Number.parseInt(ts.versionMajorMinor, 10) >= 6 ? '6.0' : '5.0';

export default defineConfig({
  entry: ['src/index.ts'],
  format: ['cjs', 'esm'],
  dts: {
    compilerOptions: {
      ignoreDeprecations,
    },
  },
  clean: true,
  minify: false,
  sourcemap: true,
  target: 'node20',
});
