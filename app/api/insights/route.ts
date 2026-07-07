import { NextRequest } from "next/server"

export const dynamic = "force-dynamic"

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl
  const period = searchParams.get("period") || "daily"
  void period

  return Response.json({ insights: [] })
}
