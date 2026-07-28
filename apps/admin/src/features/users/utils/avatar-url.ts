import { adminEnvironment } from "@/config/environment";

export const resolveAvatarUrl = (
  avatarPath?: string | null,
): string | undefined => {
  const value = avatarPath?.trim();
  if (!value) return undefined;

  try {
    const url = value.startsWith("/")
      ? new URL(value, `${adminEnvironment.apiUrl}/`)
      : new URL(value);

    return url.protocol === "http:" || url.protocol === "https:"
      ? url.toString()
      : undefined;
  } catch {
    return undefined;
  }
};
