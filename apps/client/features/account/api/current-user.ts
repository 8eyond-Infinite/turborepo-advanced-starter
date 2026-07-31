import "server-only";
import { cache } from "react";
import type { User } from "@repo/types";
import { apiFetch } from "@/lib/api";

// React cache chỉ dedupe trong một server render request. Dữ liệu user không
// được cache xuyên request và không thể rò sang phiên của người khác.
export const getCurrentUser = cache(
  async (): Promise<User> => apiFetch<User>("/users/me"),
);
