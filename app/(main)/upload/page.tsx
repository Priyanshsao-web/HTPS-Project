"use client"

import { useState, useRef } from "react"
import { PageHeader } from "@/components/shared/page-header"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { toast } from "sonner"
import { Upload, FileSpreadsheet, FileText, File, X, CheckCircle, AlertCircle, Clock, Loader2 } from "lucide-react"
import { cn } from "@/lib/utils"
import { useEffect } from "react"

interface UploadHistory {
  id: string
  filename: string
  file_type: string
  upload_date: string
  report_date: string
  status: string
}

const FileIcon = ({ type }: { type: string }) => {
  if (type === "pdf") return <FileText className="w-5 h-5 text-red-400" />
  if (["xlsx", "xls", "excel"].includes(type)) return <FileSpreadsheet className="w-5 h-5 text-emerald-400" />
  return <File className="w-5 h-5 text-blue-400" />
}

const STATUS_STYLES = {
  completed: "text-emerald-400 bg-emerald-400/10 border-emerald-500/20",
  failed: "text-red-400 bg-red-400/10 border-red-500/20",
  processing: "text-amber-400 bg-amber-400/10 border-amber-500/20",
  pending: "text-blue-400 bg-blue-400/10 border-blue-500/20",
}

const STATUS_ICONS = {
  completed: CheckCircle,
  failed: AlertCircle,
  processing: Loader2,
  pending: Clock,
}

export default function UploadPage() {
  const [dragging, setDragging] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [progress, setProgress] = useState(0)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [history, setHistory] = useState<UploadHistory[]>([])
  const [result, setResult] = useState<Record<string, unknown> | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    fetch("/api/upload").then(r => r.json()).then(d => setHistory(d.uploads || []))
  }, [])

  const handleFile = (file: File) => {
    const allowed = ["pdf", "xlsx", "xls", "csv"]
    const ext = file.name.split(".").pop()?.toLowerCase()
    if (!allowed.includes(ext || "")) {
      toast.error("Invalid file type. Use PDF, Excel (.xlsx/.xls), or CSV.")
      return
    }
    if (file.size > 50 * 1024 * 1024) {
      toast.error("File too large. Max 50MB.")
      return
    }
    setSelectedFile(file)
    setResult(null)
  }

  const handleUpload = async () => {
    if (!selectedFile) return
    setUploading(true)
    setProgress(0)

    const interval = setInterval(() => setProgress(p => Math.min(p + 15, 85)), 300)

    try {
      const fd = new FormData()
      fd.append("file", selectedFile)
      const res = await fetch("/api/upload", { method: "POST", body: fd })
      const data = await res.json()
      clearInterval(interval)
      setProgress(100)

      if (data.success) {
        toast.success(data.message)
        setResult(data)
        setHistory(prev => [{
          id: data.upload.id,
          filename: selectedFile.name,
          file_type: data.upload.file_type,
          upload_date: new Date().toISOString(),
          report_date: data.upload.report_date,
          status: "completed",
        }, ...prev])
        setSelectedFile(null)
      } else {
        toast.error(data.error || "Upload failed")
      }
    } catch {
      clearInterval(interval)
      toast.error("Upload failed. Please try again.")
    } finally {
      setUploading(false)
      setTimeout(() => setProgress(0), 1000)
    }
  }



  return (
    <div className="flex flex-col h-full overflow-hidden">
      <PageHeader title="DPR Upload" subtitle="Upload Daily Progress Reports for automated data extraction" />
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
          {/* Upload Zone */}
          <Card className="p-6 border-border">
            <h3 className="text-sm font-semibold text-foreground mb-4">Upload DPR File</h3>
            <div
              className={cn(
                "border-2 border-dashed rounded-xl p-8 text-center transition-all cursor-pointer",
                dragging ? "border-primary bg-primary/10" : "border-border hover:border-primary/50 hover:bg-muted/30"
              )}
              onDragOver={e => { e.preventDefault(); setDragging(true) }}
              onDragLeave={() => setDragging(false)}
              onDrop={e => {
                e.preventDefault()
                setDragging(false)
                const file = e.dataTransfer.files[0]
                if (file) handleFile(file)
              }}
              onClick={() => fileRef.current?.click()}
            >
              <input
                ref={fileRef}
                type="file"
                accept=".pdf,.xlsx,.xls,.csv"
                className="hidden"
                onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f) }}
              />
              <Upload className="w-10 h-10 mx-auto mb-3 text-muted-foreground" />
              <p className="text-sm font-medium text-foreground mb-1">Drop file here or click to browse</p>
              <p className="text-xs text-muted-foreground">Supports PDF, Excel (.xlsx, .xls), CSV — Max 50MB</p>
            </div>

            {selectedFile && (
              <div className="mt-4 flex items-center gap-3 p-3 rounded-lg bg-muted/50 border border-border">
                <FileIcon type={selectedFile.name.split(".").pop() || ""} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">{selectedFile.name}</p>
                  <p className="text-xs text-muted-foreground">{(selectedFile.size / 1024).toFixed(1)} KB</p>
                </div>
                <button onClick={() => setSelectedFile(null)} className="text-muted-foreground hover:text-foreground">
                  <X className="w-4 h-4" />
                </button>
              </div>
            )}

            {uploading && (
              <div className="mt-4 space-y-2">
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>Processing DPR...</span>
                  <span>{progress}%</span>
                </div>
                <Progress value={progress} className="h-1.5" />
              </div>
            )}

            <Button
              className="w-full mt-4"
              disabled={!selectedFile || uploading}
              onClick={handleUpload}
            >
              {uploading ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Processing...</> : <><Upload className="w-4 h-4 mr-2" /> Upload & Extract Data</>}
            </Button>

            {/* Format info */}
            <div className="mt-4 grid grid-cols-3 gap-2">
              {[
                { icon: FileText, label: "PDF", desc: "DPR Reports", color: "text-red-400" },
                { icon: FileSpreadsheet, label: "Excel", desc: ".xlsx / .xls", color: "text-emerald-400" },
                { icon: File, label: "CSV", desc: "Data exports", color: "text-blue-400" },
              ].map(({ icon: Icon, label, desc, color }) => (
                <div key={label} className="flex flex-col items-center p-2 rounded-lg bg-muted/30 text-center">
                  <Icon className={cn("w-5 h-5 mb-1", color)} />
                  <span className="text-xs font-medium text-foreground">{label}</span>
                  <span className="text-[10px] text-muted-foreground">{desc}</span>
                </div>
              ))}
            </div>
          </Card>

          {/* Extracted Data Preview */}
          <Card className="p-6 border-border">
            <h3 className="text-sm font-semibold text-foreground mb-4">Extracted Data Preview</h3>
            {result ? (
              <div className="space-y-3">
                <div className="flex items-center gap-2 p-2 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
                  <CheckCircle className="w-4 h-4 text-emerald-400" />
                  <span className="text-xs text-emerald-400 font-medium">Data extracted successfully</span>
                </div>
                <div className="space-y-2 text-xs">
                  {[
                    ["Report Date", (result.upload as Record<string, string>)?.report_date],
                    ["File Name", (result.upload as Record<string, string>)?.filename],
                    ["File Type", (result.upload as Record<string, string>)?.file_type?.toUpperCase()],
                    ["Status", "Completed"],
                    ...(result.ocrUsed ? [["OCR Confidence", `${result.ocrConfidence}%`]] : []),
                  ].map(([k, v]) => (
                    <div key={k} className="flex justify-between py-1.5 border-b border-border">
                      <span className="text-muted-foreground">{k}</span>
                      <span className="font-medium text-foreground">{v}</span>
                    </div>
                  ))}
                </div>
                {Array.isArray(result.validationWarnings) && result.validationWarnings.length > 0 && (
                  <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/20">
                    <p className="text-xs font-medium text-amber-400 mb-2">
                      {(result.validationWarnings as string[]).length} field(s) need review
                    </p>
                    <ul className="space-y-1 max-h-32 overflow-y-auto">
                      {(result.validationWarnings as string[]).map((w, i) => (
                        <li key={i} className="text-[11px] text-amber-400/90">{w}</li>
                      ))}
                    </ul>
                  </div>
                )}
                <div className="p-3 rounded-lg bg-muted/30 text-xs text-muted-foreground">
                  Data has been stored in the database. Visit the Dashboard to see updated metrics.
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center h-48 text-center">
                <FileText className="w-10 h-10 text-muted-foreground/30 mb-3" />
                <p className="text-sm text-muted-foreground">Upload a DPR to see extracted data preview</p>
              </div>
            )}
          </Card>
        </div>

        {/* Upload History */}
        <Card className="p-4 border-border">
          <h3 className="text-sm font-semibold text-foreground mb-4">Upload History</h3>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="border-border hover:bg-transparent">
                  <TableHead className="text-xs text-muted-foreground">File Name</TableHead>
                  <TableHead className="text-xs text-muted-foreground">Type</TableHead>
                  <TableHead className="text-xs text-muted-foreground">Report Date</TableHead>
                  <TableHead className="text-xs text-muted-foreground">Uploaded</TableHead>
                  <TableHead className="text-xs text-muted-foreground">Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {history.map(row => {
                  const StatusIcon = STATUS_ICONS[row.status as keyof typeof STATUS_ICONS] || Clock
                  return (
                    <TableRow key={row.id} className="border-border hover:bg-muted/20">
                      <TableCell className="text-xs font-medium">
                        <div className="flex items-center gap-2">
                          <FileIcon type={row.file_type} />
                          {row.filename}
                        </div>
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground uppercase">{row.file_type}</TableCell>
                      <TableCell className="text-xs text-muted-foreground">{row.report_date}</TableCell>
                      <TableCell className="text-xs text-muted-foreground">{new Date(row.upload_date).toLocaleString("en-IN")}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className={cn("text-[10px] gap-1", STATUS_STYLES[row.status as keyof typeof STATUS_STYLES])}>
                          <StatusIcon className={cn("w-3 h-3", row.status === "processing" && "animate-spin")} />
                          {row.status}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          </div>
        </Card>
      </div>
    </div>
  )
}
