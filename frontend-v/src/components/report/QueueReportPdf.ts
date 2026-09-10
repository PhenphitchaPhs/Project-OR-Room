

import type { Booking } from '../../composables/useCsvExport'
import {
  sortForExport,

  toDateKey,

  genderLabel,
} from '../../composables/useCsvExport'

export type ReportMode = 'single' | 'range' | 'admin'

export type ReportGroupBy = 'room' | 'doctor'

export interface ReportMeta {

  mode: ReportMode

  rangeLabel: string

  doctorName?: string

  license?: string

  room?: string

  filterLabel?: string

  printedBy?: string

  groupBy?: ReportGroupBy

  doctorNames?: Record<string, string>
}

interface FontPair {
  regular: ArrayBuffer
  bold: ArrayBuffer
}

interface ColumnDef {
  header: string
  width: number
  value: (row: ExportedRow, meta: ReportMeta) => string
}

type ExportedRow = Booking & { __queueNo?: number }

const SYSTEM_NAME = 'ORchestrator'
const SYSTEM_TAGLINE = 'Surgery Queue Management System'

const REPORT_TITLE = 'Surgery Queue Summary'
const ADMIN_REPORT_TITLE = 'System-wide Surgery Queue Summary'

const NAVY = '#1a3a5f'
const GREY = '#64748b'
const LINE = '#dbe3ec'
const INK = '#333333'

const MARGIN = 40

const CONTENT_WIDTH = 515

const dash = (value: unknown): string => {
  const text = value === null || value === undefined ? '' : String(value).trim()
  return text === '' ? '-' : text
}

const THAI_MONTHS = [
  'Jan.', 'Feb.', 'Mar.', 'Apr.', 'May', 'Jun.',
  'Jul.', 'Aug.', 'Sep.', 'Oct.', 'Nov.', 'Dec.',
]

export const THAI_MONTHS_FULL = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
]

export const formatThaiDate = (value: unknown): string => {
  const key = toDateKey(value)
  if (!key) return '-'
  const [year = 0, month = 1, day = 0] = key.split('-').map(Number)
  return `${day} ${THAI_MONTHS[month - 1]} ${year + 543}`
}

export const formatThaiMonth = (value: unknown): string => {
  const matched = String(value || '').match(/^(\d{4})-(\d{2})/)
  if (!matched) return '-'
  const year = Number(matched[1])
  const month = Number(matched[2])
  return `${THAI_MONTHS_FULL[month - 1]} ${year}`
}

const formatPrintedAt = (now: Date = new Date()): string => {
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${now.getDate()} ${THAI_MONTHS[now.getMonth()]} ${now.getFullYear()} at ${pad(now.getHours())}:${pad(now.getMinutes())}`
}

const doctorNameOf = (row: Booking, meta: ReportMeta): string => {
  const license = String(row.doctorLicense || '')
  return dash(meta.doctorNames?.[license] || row.doctorName || license)
}

const loadFonts = async (): Promise<FontPair> => {
  const [regular, bold] = await Promise.all([
    fetch('/fonts/Sarabun-Regular.ttf').then((r) => {
      if (!r.ok) throw new Error('Failed to load Sarabun-Regular font')
      return r.arrayBuffer()
    }),
    fetch('/fonts/Sarabun-Bold.ttf').then((r) => {
      if (!r.ok) throw new Error('Failed to load Sarabun-Bold font')
      return r.arrayBuffer()
    }),
  ])
  return { regular, bold }
}

const COLUMN_QUEUE_NO: ColumnDef = {
  header: 'Queue order',
  width: 40,
  value: (row) => String(row.__queueNo ?? '-'),
}

const USER_COLUMNS: ColumnDef[] = [
  COLUMN_QUEUE_NO,
  { header: 'HN', width: 58, value: (row) => dash(row.hn) },
  { header: 'Patient name', width: 76, value: (row) => dash(row.fullName) },
  { header: 'Age/Gender', width: 40, value: (row) => `${dash(row.age)}/${genderLabel(row.gender)}` },
  { header: 'Diagnosis', width: 83, value: (row) => dash(row.diagnosis) },
  { header: 'Procedure', width: 84, value: (row) => dash(row.procedure) },
  { header: 'Surgery date', width: 52, value: (row) => formatThaiDate(row.date) },
  { header: 'Room', width: 34, value: (row) => dash(row.room) },

  { header: 'Status', width: 48, value: (row) => dash(row.status) },
]

const ADMIN_COLUMNS: ColumnDef[] = [
  { header: 'Queue', width: 24, value: (row) => String(row.__queueNo ?? '-') },
  { header: 'HN', width: 40, value: (row) => dash(row.hn) },
  { header: 'Patient name', width: 72, value: (row) => dash(row.fullName) },
  { header: 'Age/Gender', width: 41, value: (row) => `${dash(row.age)}/${genderLabel(row.gender)}` },
  { header: 'Diagnosis', width: 68, value: (row) => dash(row.diagnosis) },
  { header: 'Procedure', width: 72, value: (row) => dash(row.procedure) },
  { header: 'Surgery date', width: 54, value: (row) => formatThaiDate(row.date) },
  { header: 'Room', width: 36, value: (row) => dash(row.room) },
  { header: 'Doctor name', width: 66, value: (row, meta) => doctorNameOf(row, meta) },

  { header: 'Status', width: 42, value: (row) => dash(row.status) },
]

const columnsFor = (mode: ReportMode): ColumnDef[] =>
  mode === 'admin' ? ADMIN_COLUMNS : USER_COLUMNS

export function renderReport(
  PDFDocument: any,
  fonts: FontPair,
  rows: Booking[],
  meta: ReportMeta,
): any {
  const doc = new PDFDocument({ size: 'A4', margin: MARGIN, bufferPages: true })

  doc.registerFont('TH', new Uint8Array(fonts.regular))
  doc.registerFont('TH-Bold', new Uint8Array(fonts.bold))
  doc.font('TH')

  const prepared: ExportedRow[] = sortForExport(rows)

  drawHeader(doc, meta)

  const firstRow = prepared[0]

  if (meta.mode === 'single' && firstRow) {
    drawSingleCase(doc, firstRow)
  } else {
    drawSummary(doc, prepared, meta)
    drawDetailTable(doc, prepared, meta)
  }

  drawPageNumbers(doc)
  doc.end()
  return doc
}

function drawHeader(doc: any, meta: ReportMeta) {
  const isAdmin = meta.mode === 'admin'

  doc.font('TH-Bold').fontSize(9).fillColor(GREY)
  doc.text(SYSTEM_NAME.toUpperCase(), MARGIN, MARGIN, {
    characterSpacing: 1.2,
    continued: true,
  })
  doc.text(`  ${SYSTEM_TAGLINE}`, { characterSpacing: 0 })

  doc.font('TH-Bold').fontSize(19).fillColor(NAVY)
  doc.text(isAdmin ? ADMIN_REPORT_TITLE : REPORT_TITLE, MARGIN, MARGIN + 14)

  doc.font('TH').fontSize(10.5).fillColor(INK)
  const infoTop = MARGIN + 42

  const lines = isAdmin
    ? [
        `Filters: ${dash(meta.filterLabel)}`,
        `Grouped by: ${meta.groupBy === 'doctor' ? 'Doctor' : 'Operating room'}`,
        `Printed at: ${formatPrintedAt()}`,
        `Printed by: ${dash(meta.printedBy)}`,
      ]
    : [
        `Doctor: ${dash(meta.doctorName)}   Medical license: ${dash(meta.license)}`,
        `Operating room: ${dash(meta.room)}`,
        `Date range: ${dash(meta.rangeLabel)}`,
        `Printed at: ${formatPrintedAt()}`,
      ]

  let cursorY = infoTop
  lines.forEach((line) => {
    doc.text(line, MARGIN, cursorY, { width: CONTENT_WIDTH })
    cursorY = doc.y + 2
  })

  const ruleY = cursorY + 4
  doc.moveTo(MARGIN, ruleY).lineTo(MARGIN + CONTENT_WIDTH, ruleY)
    .lineWidth(1).strokeColor(NAVY).stroke()

  doc.y = ruleY + 16
  doc.fillColor(INK)
}

const countBy = (rows: Booking[], keyOf: (row: Booking) => string): Map<string, number> => {
  const result = new Map<string, number>()
  rows.forEach((row) => {
    const key = keyOf(row)
    result.set(key, (result.get(key) || 0) + 1)
  })
  return result
}

const joinCounts = (
  entries: [string, number][],
  format: (key: string) => string = (key) => key,
): string =>
  entries.length === 0
    ? '-'
    : entries.map(([key, count]) => `${format(key)} (${count})`).join('   ·   ')

const byRoomName = (a: [string, number], b: [string, number]) =>
  a[0].localeCompare(b[0], 'en', { numeric: true })

const byCountDesc = (a: [string, number], b: [string, number]) =>
  b[1] - a[1] || a[0].localeCompare(b[0], 'th')

function drawSummary(doc: any, rows: ExportedRow[], meta: ReportMeta) {
  const isAdmin = meta.mode === 'admin'

  doc.font('TH-Bold').fontSize(13).fillColor(NAVY)
  doc.text('Overview', MARGIN, doc.y)
  doc.moveDown(0.4)

  doc.font('TH').fontSize(10.5).fillColor(INK)
  doc.text(`Total cases: ${rows.length}`, MARGIN, doc.y, { width: CONTENT_WIDTH })
  doc.moveDown(0.2)

  const write = (label: string, text: string) => {
    doc.font('TH').fontSize(10.5).fillColor(INK)
    doc.text(`${label}: ${text}`, MARGIN, doc.y, { width: CONTENT_WIDTH })
    doc.moveDown(0.2)
  }

  const byStatus = [...countBy(rows, (row) => dash(row.status)).entries()].sort(byCountDesc)
  write('By status', joinCounts(byStatus))

  if (isAdmin) {
    const byRoom = [...countBy(rows, (row) => dash(row.room)).entries()].sort(byRoomName)
    write('By room', joinCounts(byRoom))

    const byDoctor = [...countBy(rows, (row) => doctorNameOf(row, meta)).entries()].sort(byCountDesc)
    write('By doctor', joinCounts(byDoctor))
  }

  const byDate = [...countBy(rows, (row) => toDateKey(row.date)).entries()]
    .sort((a, b) => (a[0] < b[0] ? -1 : 1))
  write('By date', joinCounts(byDate, formatThaiDate))

  doc.moveDown(1)
}

const TABLE_FONT_SIZE = 8
const CELL_PADDING = 4

const FOOTER_SPACE = 24

function measureRowHeight(doc: any, cells: string[], widths: number[], font: string): number {
  doc.font(font).fontSize(TABLE_FONT_SIZE)

  let tallest = 0
  cells.forEach((text, index) => {
    const height = doc.heightOfString(String(text), {
      width: (widths[index] ?? 0) - CELL_PADDING * 2,
    })
    if (height > tallest) tallest = height
  })

  return tallest + CELL_PADDING * 2
}

function groupRows(
  rows: ExportedRow[],
  meta: ReportMeta,
): { title: string; rows: ExportedRow[] }[] {
  if (meta.mode !== 'admin') return [{ title: '', rows }]

  const keyOf = (row: ExportedRow) =>
    meta.groupBy === 'doctor' ? doctorNameOf(row, meta) : dash(row.room)

  const buckets = new Map<string, ExportedRow[]>()
  rows.forEach((row) => {
    const key = keyOf(row)
    if (!buckets.has(key)) buckets.set(key, [])
    buckets.get(key)!.push(row)
  })

  const prefix = meta.groupBy === 'doctor' ? 'Doctor' : 'Room'
  const entries = [...buckets.entries()].sort((a, b) =>
    meta.groupBy === 'doctor'
      ? a[0].localeCompare(b[0], 'th')
      : a[0].localeCompare(b[0], 'en', { numeric: true }),
  )

  return entries.map(([key, groupRowList]) => ({
    title: `${prefix} ${key}  ·  ${groupRowList.length} case(s)`,
    rows: groupRowList,
  }))
}

function drawDetailTable(doc: any, rows: ExportedRow[], meta: ReportMeta) {
  const columns = columnsFor(meta.mode)
  const widths = columns.map((column) => column.width)
  const headerCells = columns.map((column) => column.header)

  doc.font('TH-Bold').fontSize(13).fillColor(NAVY)
  doc.text('Queue details', MARGIN, doc.y)
  doc.moveDown(0.5)
  doc.fillColor(INK)

  const headerHeight = measureRowHeight(doc, headerCells, widths, 'TH-Bold')
  const bottomLimit = doc.page.height - MARGIN - FOOTER_SPACE

  const renderChunk = (chunk: string[][]) => {
    if (chunk.length === 0) return
    doc.table({
      columnStyles: widths,
      data: [headerCells, ...chunk],
      defaultStyle: { font: 'TH', fontSize: TABLE_FONT_SIZE, padding: CELL_PADDING },
      rowStyles: (index: number) =>
        index === 0
          ? {
              font: 'TH-Bold',
              fontSize: TABLE_FONT_SIZE,
              backgroundColor: NAVY,
              textColor: '#ffffff',
            }
          : { border: { bottom: 0.5 }, borderColor: LINE },
    })
  }

  const newPage = () => {
    doc.addPage()
    doc.y = MARGIN
  }

  groupRows(rows, meta).forEach((group, groupIndex) => {
    const body = group.rows.map((row) => columns.map((column) => column.value(row, meta)))
    const firstBodyRow = body[0]
    if (!firstBodyRow) return

    if (group.title) {
      const titleHeight = 18
      const firstRowHeight = measureRowHeight(doc, firstBodyRow, widths, 'TH')

      if (doc.y + titleHeight + headerHeight + firstRowHeight > bottomLimit) {
        newPage()
      } else if (groupIndex > 0) {
        doc.moveDown(0.8)
      }

      doc.font('TH-Bold').fontSize(11).fillColor(NAVY)
      doc.text(group.title, MARGIN, doc.y, { width: CONTENT_WIDTH })
      doc.moveDown(0.3)
      doc.fillColor(INK)
    }

    let chunk: string[][] = []
    let usedHeight = doc.y + headerHeight

    body.forEach((row) => {
      const rowHeight = measureRowHeight(doc, row, widths, 'TH')

      if (usedHeight + rowHeight > bottomLimit && chunk.length > 0) {
        renderChunk(chunk)
        chunk = []
        newPage()
        usedHeight = MARGIN + headerHeight
      }

      chunk.push(row)
      usedHeight += rowHeight
    })

    renderChunk(chunk)
  })
}

function drawSingleCase(doc: any, row: ExportedRow) {
  doc.font('TH-Bold').fontSize(13).fillColor(NAVY)
  doc.text('Surgery Queue Summary', MARGIN, doc.y)
  doc.moveDown(0.6)

  const fields: [string, string][] = [
    ['Queue order', String(row.__queueNo ?? 1)],
    ['HN', dash(row.hn)],
    ['Full name', dash(row.fullName)],
    ['Age / Gender', `${dash(row.age)} years / ${genderLabel(row.gender)}`],
    ['Underlying condition', dash(row.underlying)],
    ['Diagnosis', dash(row.diagnosis)],
    ['Procedure', dash(row.procedure)],
    ['Surgery date', formatThaiDate(row.date)],
    ['Operating room', dash(row.room)],

    ['Status', dash(row.status)],
    ['CXR', pair(row.cxrDate, row.cxrNote)],
    ['ECG', pair(row.ecgDate, row.ecgNote)],
    ['Lab', pair(row.labDate, row.labNote)],
    ['Admission', pair(row.admDate, row.admNote)],
    ['Notes', dash(row.notes)],
  ]

  const labelWidth = 110
  fields.forEach(([label, value]) => {
    const top = doc.y
    doc.font('TH-Bold').fontSize(10).fillColor(GREY)
    doc.text(label, MARGIN, top, { width: labelWidth })

    doc.font('TH').fontSize(10.5).fillColor(INK)
    doc.text(value, MARGIN + labelWidth, top, { width: CONTENT_WIDTH - labelWidth })

    doc.moveDown(0.35)
    const lineY = doc.y - 3
    doc.moveTo(MARGIN, lineY).lineTo(MARGIN + CONTENT_WIDTH, lineY)
      .lineWidth(0.5).strokeColor(LINE).stroke()
    doc.moveDown(0.25)
  })
}

const pair = (dateValue: unknown, noteValue: unknown): string => {
  const d = dash(dateValue)
  const n = dash(noteValue)
  if (d === '-' && n === '-') return '-'
  if (d === '-') return n
  if (n === '-') return d
  return `${d} / ${n}`
}

function drawPageNumbers(doc: any) {
  const range = doc.bufferedPageRange()

  for (let i = range.start; i < range.start + range.count; i += 1) {
    doc.switchToPage(i)

    const bottomMargin = doc.page.margins.bottom
    doc.page.margins.bottom = 0

    doc.font('TH').fontSize(8).fillColor(GREY)
    doc.text(
      `Page ${i - range.start + 1} / ${range.count}`,
      MARGIN,
      doc.page.height - 28,
      { width: doc.page.width - MARGIN * 2, align: 'center', lineBreak: false },
    )

    doc.page.margins.bottom = bottomMargin
  }

  doc.flushPages()
}

const streamToBlob = (doc: any): Promise<Blob> =>
  new Promise((resolve, reject) => {
    const chunks: Uint8Array[] = []
    doc.on('data', (chunk: Uint8Array) => chunks.push(chunk))
    doc.on('end', () => resolve(new Blob(chunks as BlobPart[], { type: 'application/pdf' })))
    doc.on('error', reject)
  })

export async function buildQueueReportPdf(
  rows: Booking[],
  meta: ReportMeta,
): Promise<Blob> {
  const [pdfkitModule, fonts] = await Promise.all([
    import('pdfkit/js/pdfkit.standalone.js'),
    loadFonts(),
  ])

  const PDFDocument = (pdfkitModule as any).default || pdfkitModule
  const doc = renderReport(PDFDocument, fonts, rows, meta)
  return streamToBlob(doc)
}

export const buildReportFileName = (
  meta: { license: unknown; hn?: unknown; from?: unknown; to?: unknown; mode: ReportMode },
  downloadStampValue: string,
): string => {
  const safe = (value: unknown) =>
    String(value ?? '').trim().replace(/[\\/:*?"<>|\s]+/g, '-').replace(/-+/g, '-') || 'unknown'

  if (meta.mode === 'single') {
    return `report_${safe(meta.hn)}_${String(meta.from || '').replace(/-/g, '')}_exported${downloadStampValue}.pdf`
  }

  const start = String(meta.from || '').replace(/-/g, '')
  const end = String(meta.to || '').replace(/-/g, '')
  const range = start && end ? (start === end ? start : `${start}-${end}`) : start || end || 'all'
  return `report_${safe(meta.license)}_${range}_exported${downloadStampValue}.pdf`
}
