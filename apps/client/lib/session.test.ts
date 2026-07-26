import { beforeEach, describe, expect, it, vi } from "vitest";

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
  decodeSession,
  encodeSession,
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

describe("encodeSession / decodeSession", () => {
  it("giải mã lại đúng thứ đã mã hóa", () => {
    expect(decodeSession(encodeSession(session))).toEqual(session);
  });

  it("trả về null với chuỗi không phải base64url của JSON", () => {
    expect(decodeSession("không-phải-base64")).toBeNull();
  });

  it("trả về null khi JSON hợp lệ nhưng thiếu trường bắt buộc", () => {
    const encoded = Buffer.from(
      JSON.stringify({ accessToken: "chỉ-có-một-nửa" }),
    ).toString("base64url");
    expect(decodeSession(encoded)).toBeNull();
  });

  it("trả về null khi trường đúng tên nhưng sai kiểu", () => {
    const encoded = Buffer.from(
      JSON.stringify({ accessToken: 123, refreshToken: true }),
    ).toString("base64url");
    expect(decodeSession(encoded)).toBeNull();
  });

  it("trả về null với JSON không phải object (số, mảng)", () => {
    for (const value of [42, [1, 2], null, "chuỗi"]) {
      const encoded = Buffer.from(JSON.stringify(value)).toString("base64url");
      expect(decodeSession(encoded)).toBeNull();
    }
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
    store.set(SESSION_COOKIE, "rác-ai-đó-tự-đặt");
    expect(await getSession()).toBeNull();
  });

  it("clearSession xóa cookie", async () => {
    await setSession(session);
    await clearSession();
    expect(await getSession()).toBeNull();
  });
});
