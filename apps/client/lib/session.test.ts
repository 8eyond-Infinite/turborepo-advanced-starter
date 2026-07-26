import { beforeEach, describe, expect, it, vi } from "vitest";
import { EncryptJWT } from "jose";

// Giả lập cookie store của Next.js: một Map trong bộ nhớ là đủ để kiểm tra
// session.ts đọc/ghi/xóa đúng cookie, không cần dựng cả request thật.
const store = new Map<string, string>();
vi.mock("next/headers", () => ({
  cookies: () =>
    Promise.resolve({
      get: (name: string) =>
        store.has(name) ? { name, value: store.get(name)! } : undefined,
      set: (name: string, value: string) => {
        store.set(name, value);
      },
      delete: (name: string) => {
        store.delete(name);
      },
    }),
}));

import {
  SESSION_COOKIE,
  clearSession,
  decryptSession,
  encryptSession,
  getSession,
  setSession,
  type Session,
} from "./session";

const session: Session = {
  accessToken: "access-token",
  refreshToken: "refresh-token",
};

beforeEach(() => {
  store.clear();
});

describe("encryptSession / decryptSession", () => {
  it("giải mã lại đúng thứ đã mã hóa", async () => {
    expect(await decryptSession(await encryptSession(session))).toEqual(
      session,
    );
  });

  it("nội dung cookie không còn đọc được bằng mắt (đã mã hóa thật)", async () => {
    const encrypted = await encryptSession(session);
    // JWE 5 phần phân cách bằng dấu chấm, và token không xuất hiện dạng thô
    // hay dạng base64 đơn thuần trong chuỗi.
    expect(encrypted.split(".")).toHaveLength(5);
    expect(encrypted).not.toContain("access-token");
    expect(
      Buffer.from(encrypted, "base64url").toString().includes("access-token"),
    ).toBe(false);
  });

  it("sửa một ký tự của cookie là giải mã thất bại", async () => {
    const encrypted = await encryptSession(session);
    const tampered =
      encrypted.slice(0, -2) + (encrypted.endsWith("A") ? "B" : "A");
    expect(await decryptSession(tampered)).toBeNull();
  });

  it("trả về null với chuỗi rác bất kỳ", async () => {
    expect(await decryptSession("khong-phai-jwe")).toBeNull();
    expect(await decryptSession("")).toBeNull();
  });

  it("cookie kiểu cũ (base64 chưa mã hóa) bị coi như chưa đăng nhập", async () => {
    const legacy = Buffer.from(JSON.stringify(session)).toString("base64url");
    expect(await decryptSession(legacy)).toBeNull();
  });

  it("cookie mã hóa bằng secret khác không giải mã được", async () => {
    const otherKey = new Uint8Array(
      await crypto.subtle.digest(
        "SHA-256",
        new TextEncoder().encode("một-secret-hoàn-toàn-khác-dài-đủ-32-ký-tự"),
      ),
    );
    const foreign = await new EncryptJWT({ ...session })
      .setProtectedHeader({ alg: "dir", enc: "A256GCM" })
      .encrypt(otherKey);
    expect(await decryptSession(foreign)).toBeNull();
  });

  it("payload hợp lệ nhưng thiếu trường bắt buộc thì trả về null", async () => {
    const key = new Uint8Array(
      await crypto.subtle.digest(
        "SHA-256",
        new TextEncoder().encode("vitest-session-secret-vitest-session-secret"),
      ),
    );
    const halfSession = await new EncryptJWT({ accessToken: "chỉ-một-nửa" })
      .setProtectedHeader({ alg: "dir", enc: "A256GCM" })
      .encrypt(key);
    expect(await decryptSession(halfSession)).toBeNull();
  });
});

describe("getSession / setSession / clearSession", () => {
  it("setSession ghi cookie mà getSession đọc lại được", async () => {
    await setSession(session);
    expect(store.has(SESSION_COOKIE)).toBe(true);
    expect(await getSession()).toEqual(session);
  });

  it("getSession trả về null khi chưa có cookie", async () => {
    expect(await getSession()).toBeNull();
  });

  it("getSession trả về null khi cookie bị sửa thành rác", async () => {
    store.set(SESSION_COOKIE, "rac-ai-do-tu-dat");
    expect(await getSession()).toBeNull();
  });

  it("clearSession xóa cookie", async () => {
    await setSession(session);
    await clearSession();
    expect(await getSession()).toBeNull();
  });
});
