import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Allow large request bodies for file uploads
  serverExternalPackages: ["bcrypt", "multer"],

  // Disable body size limit for file uploads in API routes
  experimental: {
    serverActions: {
      bodySizeLimit: "5gb",
    },
  },
};

export default nextConfig;
