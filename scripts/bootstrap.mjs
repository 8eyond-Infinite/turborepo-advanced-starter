#!/usr/bin/env node
/**
 * Dựng môi trường local từ con số không bằng một lệnh: `pnpm bootstrap`.
 *
 * Chạy lại bao nhiêu lần cũng an toàn: file .env đã có thì giữ nguyên,
 * container đang chạy thì thôi, migration đã áp thì bỏ qua, seed không bao
 * giờ reset tài khoản admin có sẵn.
 *
 * (Tên lệnh là `bootstrap` vì `pnpm setup` là lệnh có sẵn của pnpm —
 * script trùng tên sẽ bị lệnh built-in che mất.)
 */
import { spawnSync } from "node:child_process";
import { randomBytes } from "node:crypto";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
// Trùng với POSTGRES_PASSWORD trong docker-compose.yml — chỉ dành cho DB
// local trong container, không phải secret thật.
const LOCAL_DB_PASSWORD = "password";

let stepCounter = 0;
const step = (title) => console.log(`\n[${++stepCounter}] ${title}`);
const info = (message) => console.log(`    ${message}`);
const fail = (message) => {
  console.error(`\n❌ ${message}`);
  process.exit(1);
};

const run = (command, { allowFailure = false, quiet = false } = {}) => {
  const result = spawnSync(command, {
    cwd: root,
    shell: true,
    stdio: quiet ? "pipe" : "inherit",
    encoding: "utf8",
  });
  if (result.status !== 0 && !allowFailure) {
    fail(`Lệnh thất bại: ${command}`);
  }
  return result;
};

const secret = () => randomBytes(32).toString("base64url");

/**
 * Tạo file env từ file .example nếu chưa có; đã có thì không đụng vào.
 * `fill` là map { TÊN_BIẾN: giá_trị } cho những dòng đang bỏ trống,
 * `replace` là map chuỗi placeholder → giá trị thật.
 */
const ensureEnvFile = (targetRelative, exampleRelative, { fill = {}, replace = {} }) => {
  const target = path.join(root, targetRelative);
  if (existsSync(target)) {
    info(`${targetRelative} đã có — giữ nguyên.`);
    return false;
  }
  let content = readFileSync(path.join(root, exampleRelative), "utf8");
  for (const [placeholder, value] of Object.entries(replace)) {
    content = content.replaceAll(placeholder, value);
  }
  for (const [key, value] of Object.entries(fill)) {
    content = content.replace(
      new RegExp(`^${key}=.*$`, "m"),
      `${key}=${value}`,
    );
  }
  writeFileSync(target, content);
  info(`${targetRelative} tạo mới từ ${exampleRelative}.`);
  return true;
};

const readEnvValue = (fileRelative, key) => {
  const file = path.join(root, fileRelative);
  if (!existsSync(file)) return undefined;
  const match = readFileSync(file, "utf8").match(
    new RegExp(`^${key}=(.*)$`, "m"),
  );
  return match?.[1]?.trim() || undefined;
};

const waitForHealthy = (container, timeoutSeconds = 90) => {
  const deadline = Date.now() + timeoutSeconds * 1000;
  for (;;) {
    const result = run(
      `docker inspect --format "{{.State.Health.Status}}" ${container}`,
      { allowFailure: true, quiet: true },
    );
    if (result.stdout?.trim() === "healthy") return;
    if (Date.now() > deadline) {
      fail(`${container} không healthy sau ${timeoutSeconds} giây — xem log bằng: docker logs ${container}`);
    }
    spawnSync(
      process.execPath,
      ["-e", "setTimeout(() => {}, 2000)"],
      { stdio: "ignore" },
    );
  }
};

console.log("Dựng môi trường local cho turborepo-advanced-starter");

step("Kiểm tra Docker");
const docker = run("docker info", { allowFailure: true, quiet: true });
if (docker.status !== 0) {
  fail(
    "Docker chưa chạy. Mở Docker Desktop (hoặc start docker daemon) rồi chạy lại `pnpm bootstrap`.",
  );
}
info("Docker đang chạy.");

step("Tạo file môi trường (file đã có sẽ được giữ nguyên)");
const adminPassword = `Admin-${secret().slice(0, 16)}`;
const createdRootEnv = ensureEnvFile(".env", ".env.example", {
  replace: { "<db-password>": LOCAL_DB_PASSWORD },
  fill: { SEED_ADMIN_PASSWORD: adminPassword },
});
ensureEnvFile("apps/server/.env", "apps/server/.env.example", {
  replace: { "<db-password>": LOCAL_DB_PASSWORD },
  fill: { JWT_ACCESS_SECRET: secret(), JWT_REFRESH_SECRET: secret() },
});
ensureEnvFile("apps/client/.env.local", "apps/client/.env.example", {
  fill: { SESSION_SECRET: secret() },
});

step("Khởi động hạ tầng (Postgres, Redis, Maildev)");
run("docker compose up -d postgres redis maildev");

step("Cài dependency");
run("pnpm install");

step("Chờ database sẵn sàng");
waitForHealthy("starter-postgres");
waitForHealthy("starter-redis");
waitForHealthy("starter-maildev");
info("Postgres, Redis và Maildev đều healthy.");

step("Sinh Prisma client và áp migration");
run("pnpm db:generate");
run("pnpm db:deploy");

step("Seed dữ liệu ban đầu (idempotent — không reset admin có sẵn)");
// Thiếu SEED_ADMIN_PASSWORD thì seed tự cảnh báo và bỏ qua việc tạo admin,
// các phần khác (permission, role, menu) vẫn chạy — nên cứ chạy, không chặn.
run("pnpm db:seed");

const seedEmail = readEnvValue(".env", "SEED_ADMIN_EMAIL") ?? "admin@example.com";
const passwordNote = createdRootEnv
  ? `Mật khẩu:        ${adminPassword}\n  (đã lưu trong .env — dòng SEED_ADMIN_PASSWORD)`
  : readEnvValue(".env", "SEED_ADMIN_PASSWORD")
    ? "Mật khẩu:        xem dòng SEED_ADMIN_PASSWORD trong .env"
    : "Mật khẩu:        .env chưa có SEED_ADMIN_PASSWORD — nếu tài khoản admin\n  chưa từng được tạo, thêm biến đó (>= 12 ký tự) rồi chạy lại pnpm db:seed";
console.log(`
✅ Xong. Môi trường đã sẵn sàng.

  Chạy tất cả:   pnpm dev
  Từng app:      pnpm dev:server (3001) · pnpm dev:admin (5173) · pnpm dev:client (3005)
  Hộp thư local: http://localhost:1083 (Maildev)

  Đăng nhập admin: ${seedEmail}
  ${passwordNote}
`);
