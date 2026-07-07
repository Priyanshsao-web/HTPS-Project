import { NextRequest } from "next/server"
import { getDprByDate } from "@/lib/data"

export const dynamic = "force-dynamic"

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl
  const date = searchParams.get("date") || new Date().toISOString().split("T")[0]
  const dpr = await getDprByDate(date)

  return Response.json({
    date,
    ...dpr,
  })
}
