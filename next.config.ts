import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Handle external packages that don't work well with bundlers
  serverExternalPackages: ["bcryptjs", "@prisma/client", "nodemailer"],
};

export default nextConfig;
