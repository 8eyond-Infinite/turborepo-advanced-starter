import { defineConfig } from 'tsup';
import ts from 'typescript';

const ignoreDeprecations = Number.parseInt(ts.versionMajorMinor, 10) >= 6 ? '6.0' : '5.0';

export default defineConfig((options) => ({
  entry: ['src/index.ts'],
  format: ['cjs', 'esm'],
  dts: {
    compilerOptions: {
      ignoreDeprecations,
    },
  },
  clean: !options.watch,
  minify: false,
  sourcemap: true,
  target: 'node20',
}));
