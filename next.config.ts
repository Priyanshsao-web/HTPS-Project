import type { NextConfig } from "next"

const nextConfig: NextConfig = {
  serverExternalPackages: ["pdf-parse", "pg", "tesseract.js"],
  turbopack: {},
}

export default nextConfig
