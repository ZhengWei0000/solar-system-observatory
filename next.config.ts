import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  allowedDevOrigins: [
    "localhost",
    "localhost:3000",
    "127.0.0.1",
    "127.0.0.1:3000",
    "0.0.0.0",
    "[::1]",
    "*.loca.lt",
    "*.trycloudflare.com",
    "*.loca.run",
    "*.localtunnel.me",
  ],
  experimental: {
    viewTransition: true,
  },
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "science.nasa.gov",
      },
      {
        protocol: "https",
        hostname: "ssd.jpl.nasa.gov",
      },
    ],
  },
};

export default nextConfig;
