import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

const KIBIBYTE = 1024;
const routeBudgets = new Map([
  ["/", 560 * KIBIBYTE],
  ["/login", 560 * KIBIBYTE],
  ["/me", 560 * KIBIBYTE],
]);

const diagnosticsPath = resolve(
  process.cwd(),
  ".next/diagnostics/route-bundle-stats.json",
);

const formatKibibytes = (bytes) => `${(bytes / KIBIBYTE).toFixed(1)} KiB`;

let routeStats;

try {
  routeStats = JSON.parse(await readFile(diagnosticsPath, "utf8"));
} catch (error) {
  console.error(
    "Client performance budget could not read the Next.js production build diagnostics.",
  );
  console.error("Run `pnpm --filter=client build` before this command.");
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
}

const statsByRoute = new Map(
  routeStats.map((entry) => [entry.route, entry.firstLoadUncompressedJsBytes]),
);
const failures = [];

for (const [route, budget] of routeBudgets) {
  const actual = statsByRoute.get(route);

  if (typeof actual !== "number") {
    failures.push(`${route}: route is missing from Next.js bundle diagnostics`);
    continue;
  }

  const result = `${route}: ${formatKibibytes(actual)} / ${formatKibibytes(budget)}`;
  console.log(result);

  if (actual > budget) {
    failures.push(result);
  }
}

if (failures.length > 0) {
  console.error("\nClient JavaScript performance budget failed:");
  for (const failure of failures) {
    console.error(`- ${failure}`);
  }
  console.error(
    "Reduce client-side JavaScript or review the budget deliberately with evidence.",
  );
  process.exit(1);
}

console.log("Client JavaScript performance budget passed.");
