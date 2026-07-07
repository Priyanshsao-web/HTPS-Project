import type { NextConfig } from "next"

const nextConfig: NextConfig = {
  serverExternalPackages: ["pdf-parse", "pg", "tesseract.js"],
  outputFileTracingIncludes: {
    "/api/upload": ["./eng.traineddata"],
  },
  turbopack: {},
}

export default nextConfig
