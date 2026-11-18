import type { NextConfig } from "next";
import { networkInterfaces } from "node:os";

// Let phones/tablets on the same network use the dev server via this computer's LAN IP
// (Next.js blocks dev assets for any hostname other than localhost by default).
const lanAddresses = Object.values(networkInterfaces())
  .flat()
  .filter((i) => i && i.family === "IPv4" && !i.internal)
  .map((i) => i!.address);

const nextConfig: NextConfig = {
  cacheComponents: true,
  partialPrefetching: true,
  allowedDevOrigins: lanAddresses,
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
