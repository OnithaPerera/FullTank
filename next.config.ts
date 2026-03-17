import type { NextConfig } from "next";
import withPWAInit from "next-pwa";

const withPWA = withPWAInit({
  dest: "public", // Generates service worker files in the public folder
  disable: process.env.NODE_ENV === "development", // Disables in dev mode to prevent caching issues
  register: true,
  skipWaiting: true,
});

const nextConfig: NextConfig = {
  turbopack: {},
};

export default withPWA(nextConfig);