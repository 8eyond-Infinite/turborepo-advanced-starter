import type { NextConfig } from "next";

export const createContentSecurityPolicy = (
  nodeEnv = process.env.NODE_ENV,
): string =>
  [
    "default-src 'self'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
    "object-src 'none'",
    `script-src 'self' 'unsafe-inline'${nodeEnv === "development" ? " 'unsafe-eval'" : ""}`,
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: blob:",
    "font-src 'self' data:",
    "connect-src 'self'",
  ].join("; ");

export const clientSecurityHeaders = [
  { key: "Content-Security-Policy", value: createContentSecurityPolicy() },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=(), payment=(), usb=()",
  },
  { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
  {
    key: "Strict-Transport-Security",
    value: "max-age=31536000; includeSubDomains",
  },
];

const nextConfig: NextConfig = {
  output: "standalone",
  // Package dùng chung được build thành JS + type; khai báo ở đây để Next.js
  // biên dịch chúng cùng ứng dụng thay vì coi là dependency ngoài.
  transpilePackages: ["@repo/types", "@repo/contracts"],
  async headers() {
    return [{ source: "/(.*)", headers: clientSecurityHeaders }];
  },
};

export default nextConfig;
