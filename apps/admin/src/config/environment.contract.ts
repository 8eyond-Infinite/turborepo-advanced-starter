export interface AdminEnvironment {
  apiUrl: string;
}

interface ResolveAdminEnvironmentInput {
  apiUrl?: string;
  mode: string;
}

const LOCAL_API_URL = "http://localhost:3001";

const isLocalHostname = (hostname: string): boolean =>
  hostname === "localhost" || hostname === "127.0.0.1" || hostname === "::1";

export const resolveAdminEnvironment = ({
  apiUrl,
  mode,
}: ResolveAdminEnvironmentInput): AdminEnvironment => {
  const normalizedApiUrl = apiUrl?.trim() || undefined;

  if (!normalizedApiUrl && (mode === "development" || mode === "test")) {
    return { apiUrl: LOCAL_API_URL };
  }
  if (!normalizedApiUrl) {
    throw new Error(`VITE_API_URL is required when mode="${mode}".`);
  }

  let parsedUrl: URL;
  try {
    parsedUrl = new URL(normalizedApiUrl);
  } catch {
    throw new Error("VITE_API_URL must be an absolute HTTP(S) URL.");
  }

  if (!["http:", "https:"].includes(parsedUrl.protocol)) {
    throw new Error("VITE_API_URL must use the http or https protocol.");
  }
  if (mode === "production" && isLocalHostname(parsedUrl.hostname)) {
    throw new Error("VITE_API_URL must not target localhost in production.");
  }

  parsedUrl.pathname = parsedUrl.pathname.replace(/\/+$/, "");
  return { apiUrl: parsedUrl.toString().replace(/\/$/, "") };
};

export const createContentSecurityPolicy = (
  environment: AdminEnvironment,
): string => {
  const apiOrigin = new URL(environment.apiUrl).origin;
  const realtimeOrigin = apiOrigin.replace(/^http/, "ws");

  return [
    "default-src 'self'",
    "base-uri 'self'",
    "form-action 'self'",
    "object-src 'none'",
    "script-src 'self'",
    "style-src 'self' 'unsafe-inline'",
    `img-src 'self' data: blob: ${apiOrigin}`,
    "font-src 'self' data:",
    `connect-src 'self' ${apiOrigin} ${realtimeOrigin}`,
    "manifest-src 'self'",
    "worker-src 'self' blob:",
  ].join("; ");
};
