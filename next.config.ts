import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // better-sqlite3 is a native Node module — keep it external to the bundler
  serverExternalPackages: ["better-sqlite3"],
  // Allow phones on the local network to load dev-mode assets
  allowedDevOrigins: ["192.168.1.174", "192.168.1.*"],
};

export default nextConfig;
