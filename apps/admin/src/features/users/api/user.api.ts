import type { PaginatedResult, User } from "@repo/types";
import { ApiClient } from "@/lib/api-client";
import type { UserListParams } from "./user.keys";

export interface CreateUserInput {
  email: string;
  username: string;
  password?: string;
  avatar?: string | null;
  roles: string[];
}

export interface UpdateUserInput {
  id: string;
  email: string;
  username: string;
  avatar?: string | null;
  roles: string[];
}

const getUsers = ({ page, limit, search }: UserListParams) => {
  const params = new URLSearchParams({
    page: String(page),
    limit: String(limit),
  });
  if (search) params.set("search", search);
  return ApiClient.get<PaginatedResult<User>>(`/users?${params.toString()}`);
};

export const userApi = {
  getUsers,
  create: (input: CreateUserInput) => ApiClient.post<User>("/users", input),
  update: ({ id, ...input }: UpdateUserInput) =>
    ApiClient.put<User>(`/users/${id}`, input),
  activate: (id: string) => ApiClient.patch<User>(`/users/${id}/activate`),
  deactivate: (id: string) => ApiClient.patch<User>(`/users/${id}/deactivate`),
  remove: (id: string) => ApiClient.delete<void>(`/users/${id}`),
};
