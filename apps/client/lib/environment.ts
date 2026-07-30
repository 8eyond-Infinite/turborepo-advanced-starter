import "server-only";

export interface ClientEnvironment {
  apiUrl: string;
  sessionSecret: string;
}
interface EnvironmentInput {
  apiUrl?: string;
  sessionSecret?: string;
  nodeEnv?: string;
}

const LOCAL_API_URL = "http://localhost:3001";
const DEVELOPMENT_SESSION_SECRET = "dev-only-session-secret-do-not-use-in-prod";
const isLocalHostname = (hostname: string): boolean =>
  hostname === "localhost" || hostname === "127.0.0.1" || hostname === "::1";

export const resolveClientEnvironment = ({
  apiUrl,
  sessionSecret,
  nodeEnv = "development",
}: EnvironmentInput): ClientEnvironment => {
  const isProduction = nodeEnv === "production";
  const normalizedApiUrl =
    apiUrl?.trim() || (isProduction ? undefined : LOCAL_API_URL);
  if (!normalizedApiUrl) throw new Error("API_URL is required in production.");
  let parsedApiUrl: URL;
  try {
    parsedApiUrl = new URL(normalizedApiUrl);
  } catch {
    throw new Error("API_URL must be an absolute HTTP(S) URL.");
  }
  if (!["http:", "https:"].includes(parsedApiUrl.protocol))
    throw new Error("API_URL must use the http or https protocol.");
  if (isProduction && isLocalHostname(parsedApiUrl.hostname))
    throw new Error("API_URL must not target localhost in production.");

  const normalizedSecret = sessionSecret?.trim();
  if (isProduction && (!normalizedSecret || normalizedSecret.length < 32))
    throw new Error(
      "SESSION_SECRET must contain at least 32 characters in production.",
    );
  parsedApiUrl.pathname = parsedApiUrl.pathname.replace(/\/+$/, "");
  return {
    apiUrl: parsedApiUrl.toString().replace(/\/$/, ""),
    sessionSecret: normalizedSecret || DEVELOPMENT_SESSION_SECRET,
  };
};

export const clientEnvironment = resolveClientEnvironment({
  apiUrl: process.env.API_URL,
  sessionSecret: process.env.SESSION_SECRET,
  nodeEnv: process.env.NODE_ENV,
});
