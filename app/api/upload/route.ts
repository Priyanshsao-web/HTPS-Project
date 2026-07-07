import { NextRequest } from "next/server"
import { parseCSV } from "@/lib/parsers/csv-parser"
import { parseExcel } from "@/lib/parsers/excel-parser"
import { parsePDF } from "@/lib/parsers/pdf-parser"
import { getUploadHistory, saveDprUpload } from "@/lib/data"

export const dynamic = "force-dynamic"

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData()
    const file = formData.get("file") as File | null

    if (!file) {
      console.log("[API-UPLOAD] rejected: no file in request")
      return Response.json({ error: "No file provided" }, { status: 400 })
    }
    console.log(`[API-UPLOAD] received file: ${file.name} (${file.size} bytes)`)

    const ext = file.name.split(".").pop()?.toLowerCase()

    if (!["pdf", "xlsx", "xls", "csv"].includes(ext || "")) {
      console.log(`[API-UPLOAD] rejected: unsupported extension .${ext}`)
      return Response.json({ error: "Unsupported file format. Use PDF, Excel, or CSV." }, { status: 400 })
    }

    if (file.size > 50 * 1024 * 1024) {
      console.log(`[API-UPLOAD] rejected: file too large (${file.size} bytes)`)
      return Response.json({ error: "File size exceeds 50MB limit" }, { status: 400 })
    }

    const buffer = Buffer.from(await file.arrayBuffer())
    let parsed: Record<string, unknown> = {}

    if (ext === "csv") {
      const text = buffer.toString("utf-8")
      const result = parseCSV(text)
      parsed = result as unknown as Record<string, unknown>
      console.log(`[API-UPLOAD] parsed as CSV: ${result.rawData.length} row(s)`)
    } else if (ext === "xlsx" || ext === "xls") {
      parsed = parseExcel(buffer) as unknown as Record<string, unknown>
      console.log(`[API-UPLOAD] parsed as Excel`)
    } else if (ext === "pdf") {
      if (!buffer.subarray(0, 5).toString("utf-8").startsWith("%PDF-")) {
        console.log("[API-UPLOAD] rejected: not a valid PDF header")
        return Response.json({ error: "The selected file is not a valid PDF." }, { status: 400 })
      }
      console.log("[API-UPLOAD] parsing PDF...")
      parsed = await parsePDF(buffer) as unknown as Record<string, unknown>
      const p = parsed as { ocrUsed?: boolean; ocrConfidence?: number; validationWarnings?: string[] }
      console.log(`[API-UPLOAD] PDF parsed, ocrUsed=${p.ocrUsed ?? false}, ${p.validationWarnings?.length ?? 0} warning(s)`)
    }

    const fileType = ext === "csv" ? "csv" : ext === "pdf" ? "pdf" : "excel"
    const uploadRecord = await saveDprUpload(file.name, fileType, parsed)
    console.log(`[API-UPLOAD] done: upload id=${uploadRecord?.id}`)

    const p = parsed as { ocrUsed?: boolean; ocrConfidence?: number; fieldConfidence?: Record<string, number>; validationWarnings?: string[] }

    return Response.json({
      success: true,
      upload: uploadRecord,
      ocrUsed: p.ocrUsed,
      ocrConfidence: p.ocrConfidence,
      fieldConfidence: p.fieldConfidence,
      validationWarnings: p.validationWarnings,
      message: `DPR uploaded and parsed successfully from ${file.name}`,
    })
  } catch (err) {
    console.error("[API-UPLOAD] error:", err)
    return Response.json({ error: "Failed to process file. Please check format." }, { status: 500 })
  }
}

export async function GET(_req: NextRequest) {
  try {
    const uploads = await getUploadHistory()
    return Response.json({ uploads })
  } catch (err) {
    console.error("Upload history error:", err)
    return Response.json({ error: "Failed to load upload history" }, { status: 500 })
  }
}
