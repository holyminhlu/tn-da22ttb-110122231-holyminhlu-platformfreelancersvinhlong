import type { NextConfig } from "next";
import { loadEnvConfig } from "@next/env";

loadEnvConfig(process.cwd());

const googleMapsApiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY?.trim() ?? "";

function apiImageRemotePattern(): { protocol: "http" | "https"; hostname: string; port?: string } | null {
  const raw = process.env.NEXT_PUBLIC_API_URL?.trim() || "http://localhost:5000";
  try {
    const url = new URL(raw);
    if (!url.hostname) return null;
    return {
      protocol: url.protocol === "https:" ? "https" : "http",
      hostname: url.hostname,
      ...(url.port ? { port: url.port } : {}),
    };
  } catch {
    return { protocol: "http", hostname: "localhost", port: "5000" };
  }
}

const apiRemote = apiImageRemotePattern();

const nextConfig: NextConfig = {
  env: {
    NEXT_PUBLIC_GOOGLE_MAPS_API_KEY: googleMapsApiKey,
  },
  async redirects() {
    return [
      {
        source: "/login",
        destination: "/dang-nhap",
        permanent: true,
      },
      {
        source: "/auth/google/callback",
        destination: "/dang-nhap",
        permanent: false,
      },
    ];
  },
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "images.unsplash.com",
      },
      {
        protocol: "https",
        hostname: "**.googleusercontent.com",
      },
      {
        protocol: "https",
        hostname: "lh3.googleusercontent.com",
      },
      {
        protocol: "https",
        hostname: "**.ggpht.com",
      },
      ...(apiRemote ? [apiRemote] : []),
    ],
  },
};

export default nextConfig;
