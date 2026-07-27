import { resolveAdminEnvironment } from "./environment.contract";

export const adminEnvironment = resolveAdminEnvironment({
  apiUrl: import.meta.env.VITE_API_URL,
  mode: import.meta.env.MODE,
});
