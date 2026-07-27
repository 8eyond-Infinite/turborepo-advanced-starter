const INTERNAL_ORIGIN = "https://internal.invalid";

export const safeRedirectPath = (
  candidate: string | null | undefined,
  fallback = "/me",
): string => {
  if (!candidate || !candidate.startsWith("/")) {
    return fallback;
  }

  try {
    const parsed = new URL(candidate, INTERNAL_ORIGIN);
    if (parsed.origin !== INTERNAL_ORIGIN) {
      return fallback;
    }
    return `${parsed.pathname}${parsed.search}${parsed.hash}`;
  } catch {
    return fallback;
  }
};
