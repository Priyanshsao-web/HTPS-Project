import type { NextConfig } from "next"

const nextConfig: NextConfig = {
  serverExternalPackages: ["pdf-parse", "pg", "tesseract.js"],
  outputFileTracingIncludes: {
    "/api/upload": [
      "./eng.traineddata",
      "./node_modules/@napi-rs/canvas/**/*",
      "./node_modules/@napi-rs/canvas-linux-x64-gnu/**/*",
      "./node_modules/@napi-rs/canvas-linux-arm64-gnu/**/*",
    ],
  },
  turbopack: {},
}

export default nextConfig
