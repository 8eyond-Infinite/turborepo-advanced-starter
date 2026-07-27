import { readFile, readdir } from "node:fs/promises";
import path from "node:path";
import process from "node:process";

const appRoot = process.cwd();
const distRoot = path.join(appRoot, "dist");
const indexHtml = await readFile(path.join(distRoot, "index.html"), "utf8");
const vercelConfig = JSON.parse(
  await readFile(path.join(appRoot, "vercel.json"), "utf8"),
);
const assetNames = await readdir(path.join(distRoot, "assets"));
const configuredHeaderKeys = new Set(
  vercelConfig.headers
    .flatMap((rule) => rule.headers)
    .map((header) => header.key.toLowerCase()),
);
const requiredHeaderKeys = [
  "x-content-type-options",
  "x-frame-options",
  "referrer-policy",
  "permissions-policy",
  "cross-origin-opener-policy",
];

const assertions = [
  {
    passes:
      indexHtml.includes('http-equiv="Content-Security-Policy"') &&
      indexHtml.includes("connect-src"),
    message: "dist/index.html must contain the generated CSP meta policy.",
  },
  {
    passes: !indexHtml.includes("localhost"),
    message: "Production HTML must not contain a localhost endpoint.",
  },
  {
    passes: assetNames.every((name) => !name.endsWith(".map")),
    message: "Production assets must not publish source maps.",
  },
  {
    passes: vercelConfig.outputDirectory === "dist",
    message: "Vercel outputDirectory must remain dist.",
  },
  {
    passes: requiredHeaderKeys.every((key) => configuredHeaderKeys.has(key)),
    message: "Vercel must keep every required browser security header.",
  },
  {
    passes: vercelConfig.rewrites?.some(
      (rewrite) =>
        rewrite.source === "/(.*)" && rewrite.destination === "/index.html",
    ),
    message: "Vercel must rewrite direct SPA routes to index.html.",
  },
  {
    passes: ["/users", "/roles"].every((route) =>
      vercelConfig.rewrites.some(
        (rewrite) =>
          rewrite.source === "/(.*)" &&
          rewrite.destination === "/index.html" &&
          route.startsWith("/"),
      ),
    ),
    message: "Protected direct routes must be covered by the SPA rewrite.",
  },
];

const failures = assertions.filter((assertion) => !assertion.passes);
if (failures.length > 0) {
  for (const failure of failures) {
    console.error(`Production verification failed: ${failure.message}`);
  }
  process.exit(1);
}

console.log(
  `Production verification passed (${assetNames.length} assets, CSP, SPA rewrite, headers contract, no source maps).`,
);
