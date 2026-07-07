// eslint-disable-next-line @typescript-eslint/no-require-imports
const { PDFParse } = require('pdf-parse')
import { createWorker } from 'tesseract.js'

const MIN_TEXT_LENGTH = 30 // below this, treat PDF as scanned (no text layer) and fall back to OCR
const LOW_CONFIDENCE_THRESHOLD = 60 // OCR line confidence (0-100) below this is flagged, not trusted silently

interface OcrLine {
  text: string
  confidence: number
}

interface FieldSpec {
  key: string
  patterns: RegExp[]
  min: number
  max: number
}

// GAP is deliberately tight (colon/whitespace only): on noisy multi-column scans, a wider gap
// happily "matches" but grabs the wrong number from an adjacent table cell (verified empirically —
// a 25-char gap pulled in unrelated column values that still passed range validation, e.g. reading
// a specific-coal-consumption figure into total_generation). A tight gap fails to match more often,
// but every match it does produce is the number that was actually adjacent to its label — failing
// to detect a field is recoverable (flagged as "not detected"); silently storing a wrong number
// that looks plausible is not.
const GAP = '[:\\s]+'
const NUM = '([\\d,.]+)'
function labelPattern(label: string): RegExp {
  return new RegExp(label + GAP + NUM, 'i')
}

// Patterns match against one OCR line (or the raw text line-by-line for real text layers).
// min/max are physically plausible ranges for a single-unit/station DPR; values outside are
// rejected rather than silently inserted, since a matched digit string from noisy OCR can be
// garbage even when the regex "hits".
const FIELD_SPECS: FieldSpec[] = [
  { key: 'total_generation', min: 0, max: 3000, patterns: [
    labelPattern('total\\s+generation'),
    labelPattern('daily\\s+generation'),
    labelPattern('24\\s*hr\\.?\\s+generation'),
  ] },
  { key: 'plf', min: 0, max: 100, patterns: [
    labelPattern('plf'),
    labelPattern('plant\\s+load\\s+factor'),
  ] },
  { key: 'average_load', min: 0, max: 3000, patterns: [
    labelPattern('average\\s+load'),
    labelPattern('avg\\.?\\s+load'),
  ] },
  { key: 'coal_consumption', min: 0, max: 20000, patterns: [
    labelPattern('coal\\s+consumption'),
    labelPattern('coal\\s+consumed'),
  ] },
  { key: 'coal_gcv', min: 1000, max: 7000, patterns: [
    labelPattern('coal\\s+gcv'),
    labelPattern('gcv'),
  ] },
  { key: 'specific_coal_consumption', min: 0.3, max: 2, patterns: [
    labelPattern('specific\\s+coal\\s+consumption'),
    labelPattern('sp\\.?\\s*coal\\s+cons'),
    labelPattern('scc'),
  ] },
  { key: 'coal_stock', min: 0, max: 2000000, patterns: [
    labelPattern('coal\\s+stock'),
  ] },
  { key: 'hsd_consumption', min: 0, max: 100, patterns: [
    labelPattern('hsd\\s+consumption'),
    labelPattern('h\\.?s\\.?d\\.?'),
  ] },
  { key: 'hfo_consumption', min: 0, max: 100, patterns: [
    labelPattern('hfo\\s+consumption'),
    labelPattern('h\\.?f\\.?o\\.?'),
  ] },
  { key: 'ldo_consumption', min: 0, max: 100, patterns: [
    labelPattern('ldo\\s+consumption'),
    labelPattern('l\\.?d\\.?o\\.?'),
  ] },
  { key: 'total_oil_consumption', min: 0, max: 100, patterns: [
    labelPattern('oil\\s+consumption'),
    labelPattern('total\\s+oil'),
    labelPattern('sp\\.?\\s*oil\\s+cons'),
  ] },
  { key: 'dm_water_consumption', min: 0, max: 5000, patterns: [
    labelPattern('dm\\s+water\\s+consumption'),
    labelPattern('dm\\s+water'),
    labelPattern('demineralised\\s+water'),
  ] },
  { key: 'dm_water_makeup_pct', min: 0, max: 20, patterns: [
    labelPattern('dm\\s+water\\s+makeup'),
    labelPattern('makeup\\s*%'),
  ] },
  { key: 'raw_water_consumption', min: 0, max: 100000, patterns: [
    labelPattern('raw\\s+water'),
  ] },
  { key: 'gross_heat_rate', min: 1800, max: 4000, patterns: [
    labelPattern('gross\\s+heat\\s*r[ae]te'),
    labelPattern('ghr'),
  ] },
  { key: 'net_heat_rate', min: 1800, max: 4000, patterns: [
    labelPattern('net\\s+heat\\s*rate'),
    labelPattern('nhr'),
  ] },
  { key: 'station_heat_rate', min: 1800, max: 4000, patterns: [
    labelPattern('station\\s+heat\\s+rate'),
  ] },
  { key: 'auxiliary_power_pct', min: 0, max: 20, patterns: [
    labelPattern('au[sx]?[il]*iary\\s+power\\s*%'),
    labelPattern('aux(?:iliary)?\\s+consumption'),
  ] },
  { key: 'auxiliary_consumption', min: 0, max: 200, patterns: [
    labelPattern('au[sx]?[il]*iary\\s+power'),
    labelPattern('aux\\.?\\s+power\\s+consumed'),
  ] },
  { key: 'boiler_efficiency', min: 0, max: 100, patterns: [labelPattern('boiler\\s+efficiency')] },
  { key: 'turbine_efficiency', min: 0, max: 100, patterns: [labelPattern('turbine\\s+efficiency')] },
  { key: 'plant_efficiency', min: 0, max: 100, patterns: [labelPattern('plant\\s+efficiency')] },
]

interface ParsedPDFDPR {
  report_date: string
  rawText: string
  ocrUsed: boolean
  ocrConfidence?: number
  fieldConfidence: Record<string, number>
  validationWarnings: string[]
  [key: string]: unknown
}

function stripPageMarkers(text: string): string {
  return text.replace(/--\s*\d+\s*of\s*\d+\s*--/g, '').trim()
}

async function ocrPDF(buffer: Buffer): Promise<{ text: string; lines: OcrLine[]; pageConfidence: number }> {
  console.log('[PDF-OCR] no text layer found, rendering pages to images for OCR')
  const parser = new PDFParse({ data: buffer })
  let pages
  try {
    const shots = await parser.getScreenshot({ imageBuffer: true, imageDataUrl: false, scale: 3 })
    pages = shots.pages
  } finally {
    await parser.destroy()
  }
  console.log(`[PDF-OCR] rendered ${pages.length} page(s), running tesseract`)

  const worker = await createWorker('eng', 1, {
    langPath: process.cwd(),
    cachePath: '/tmp',
    gzip: false,
  })
  let text = ''
  const lines: OcrLine[] = []
  let confSum = 0
  try {
    for (const page of pages) {
      const { data } = await worker.recognize(Buffer.from(page.data), {}, { blocks: true, text: true })
      console.log(`[PDF-OCR] page ${page.pageNumber}/${pages.length}: ${data.text.length} chars, confidence=${data.confidence.toFixed(0)}%`)
      text += data.text + '\n'
      confSum += data.confidence
      for (const block of data.blocks || []) {
        for (const para of block.paragraphs) {
          for (const line of para.lines) {
            lines.push({ text: line.text, confidence: line.confidence })
          }
        }
      }
    }
  } finally {
    await worker.terminate()
  }
  return { text, lines, pageConfidence: pages.length ? confSum / pages.length : 0 }
}

function extractField(spec: FieldSpec, lines: OcrLine[]): { value?: number; confidence: number } {
  for (const pattern of spec.patterns) {
    for (const line of lines) {
      const m = line.text.match(pattern)
      if (m) {
        const n = parseFloat(m[1].replace(/,/g, ''))
        if (!isNaN(n)) return { value: n, confidence: Math.round(line.confidence) }
      }
    }
  }
  return { confidence: 0 }
}

export async function parsePDF(buffer: Buffer): Promise<ParsedPDFDPR> {
  const parser = new PDFParse({ data: buffer })
  let text = ''

  try {
    const pdfData = await parser.getText()
    text = pdfData.text || ''
  } finally {
    await parser.destroy()
  }

  const meaningfulLength = stripPageMarkers(text).length
  console.log(`[PDF-EXTRACT] text layer: ${text.length} raw chars, ${meaningfulLength} meaningful chars`)

  let ocrUsed = false
  let ocrConfidence: number | undefined
  // For a real embedded text layer, treat each line as full-confidence (deterministic extraction,
  // no OCR guesswork). For a scanned/image PDF, lines carry tesseract's real per-line confidence.
  let lines: OcrLine[] = text.split('\n').map(l => ({ text: l, confidence: 100 }))

  if (meaningfulLength < MIN_TEXT_LENGTH) {
    const ocr = await ocrPDF(buffer)
    text = ocr.text
    lines = ocr.lines
    ocrUsed = true
    ocrConfidence = +ocr.pageConfidence.toFixed(1)
    console.log(`[PDF-EXTRACT] OCR fallback produced ${text.length} chars, page confidence=${ocrConfidence}%`)
  }

  const result: ParsedPDFDPR = {
    report_date: new Date().toISOString().split('T')[0],
    rawText: text,
    ocrUsed,
    ocrConfidence,
    fieldConfidence: {},
    validationWarnings: [],
  }

  const datePatterns = [
    /date[:\s]+(\d{1,2}[\/\-.]\d{1,2}[\/\-.]\d{2,4})/i,
    /(\d{4}-\d{2}-\d{2})/,
    /(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{4})/,
  ]
  for (const p of datePatterns) {
    const m = text.match(p)
    if (m) {
      const parts = m[1].split(/[\/\-.]/)
      if (parts[0].length === 4) {
        result.report_date = m[1]
      } else if (parts.length === 3) {
        result.report_date = `${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`
      }
      break
    }
  }

  // Stage: extract + validate each field. A field that matches but fails its physical
  // range check is dropped (not inserted) rather than silently trusted — noisy OCR digits
  // can match a label and still be garbage.
  for (const spec of FIELD_SPECS) {
    const { value, confidence } = extractField(spec, lines)
    if (value === undefined) {
      result.validationWarnings.push(`${spec.key}: not detected`)
      continue
    }
    if (value < spec.min || value > spec.max) {
      result.validationWarnings.push(`${spec.key}: rejected, ${value} outside plausible range [${spec.min}-${spec.max}]`)
      continue
    }
    result[spec.key] = value
    result.fieldConfidence[spec.key] = confidence
    if (ocrUsed && confidence < LOW_CONFIDENCE_THRESHOLD) {
      result.validationWarnings.push(`${spec.key}: low OCR confidence (${confidence}%), verify manually`)
    }
  }

  const extracted = Object.keys(result.fieldConfidence)
  console.log(`[PDF-VALIDATE] ${extracted.length}/${FIELD_SPECS.length} field(s) extracted and passed validation: ${extracted.join(', ') || 'none'}`)
  if (result.validationWarnings.length) {
    console.log(`[PDF-VALIDATE] ${result.validationWarnings.length} warning(s): ${result.validationWarnings.join('; ')}`)
  }

  return result
}
