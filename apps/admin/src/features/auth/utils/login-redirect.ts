interface LoginRedirectLocation {
  pathname?: unknown;
  search?: unknown;
  hash?: unknown;
}

export function resolveLoginRedirect(state: unknown): string {
  if (!state || typeof state !== "object" || !("from" in state)) {
    return "/";
  }

  const from = state.from as LoginRedirectLocation | null;
  if (
    !from ||
    typeof from !== "object" ||
    typeof from.pathname !== "string" ||
    !from.pathname.startsWith("/") ||
    from.pathname.startsWith("//")
  ) {
    return "/";
  }

  const search = typeof from.search === "string" ? from.search : "";
  const hash = typeof from.hash === "string" ? from.hash : "";
  return `${from.pathname}${search}${hash}`;
}
