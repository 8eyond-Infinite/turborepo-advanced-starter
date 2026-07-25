import { describe, expect, it } from "vitest";
import { userKeys } from "./user.keys";

describe("userKeys", () => {
  it("keeps list filters in cache identity", () => {
    const firstPage = userKeys.list({ page: 1, limit: 10, search: "" });
    const secondPage = userKeys.list({ page: 2, limit: 10, search: "" });
    const filtered = userKeys.list({ page: 1, limit: 10, search: "admin" });

    expect(firstPage).not.toEqual(secondPage);
    expect(firstPage).not.toEqual(filtered);
  });

  it("allows invalidating every user query through the root key", () => {
    expect(
      userKeys.list({ page: 1, limit: 10, search: "" }).slice(0, 1),
    ).toEqual(userKeys.all);
    expect(userKeys.detail("user-1").slice(0, 1)).toEqual(userKeys.all);
  });
});
