import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Package dùng chung được build thành JS + type; khai báo ở đây để Next.js
  // biên dịch chúng cùng ứng dụng thay vì coi là dependency ngoài.
  transpilePackages: ["@repo/types", "@repo/contracts"],
};

export default nextConfig;
