/**
 * QueueReportPdf
 * ------------------------------------------------------------------
 * สร้างรายงานสรุปคิวผ่าตัดเป็น PDF (A4 แนวตั้ง) คืนค่าเป็น Blob
 * ใช้ได้ทั้งกับปุ่มดาวน์โหลด และ (ในอนาคต) ปุ่มส่งอีเมลที่ต้องการไฟล์เป็น binary
 *
 * ⚠️ ทำไมถึงใช้ PDFKit ไม่ใช่ jsPDF
 * ------------------------------------------------------------------
 * jsPDF ไม่ทำ OpenType shaping (GPOS/GSUB) ภาษาไทยที่มีสระบนซ้อนวรรณยุกต์
 * จะถูกวางทับกันจนวรรณยุกต์หายไป ทดสอบแล้วได้ผลดังนี้
 *     ที่ -> ที      ผู้ป่วย -> ผู้ปวย
 *     น้ำ -> น้า     เดี๋ยว  -> เดียว     เสื่อม -> เสือม
 * ซึ่งเป็นคำที่เจอทั่วไปในเวชระเบียน ใช้ไม่ได้จริง
 *
 * PDFKit ใช้ fontkit ข้างในซึ่งทำ shaping ให้ครบ ทดสอบแล้ววางวรรณยุกต์ถูกต้องทุกคำ
 *
 * ฟอนต์: Sarabun (Open Font License) subset เหลือเฉพาะ Latin + ไทย
 * วางไว้ที่ public/fonts/ โหลดตอนกดปุ่มเท่านั้น ไม่ถ่วงตอนเปิดเว็บ
 */

import type { Booking } from '../../composables/useCsvExport'
import { sortForExport, toDateKey, statusLabel, genderLabel } from '../../composables/useCsvExport'

export interface ReportMeta {
  /** ชื่อแพทย์เจ้าของรายงาน */
  doctorName: string
  /** เลขใบประกอบวิชาชีพ */
  license: string
  /** ห้องผ่าตัดประจำ */
  room?: string
  /** ข้อความบอกช่วงวันที่ของรายงาน เช่น "3 - 10 ส.ค. 2569" */
  rangeLabel: string
  /** 'single' = ใบสรุปรายเคส, 'range' = ตารางหลายเคส */
  mode: 'single' | 'range'
}

interface FontPair {
  regular: ArrayBuffer
  bold: ArrayBuffer
}

const SYSTEM_NAME = 'ORchestrator'
const REPORT_TITLE = 'รายงานสรุปคิวผ่าตัด'

const NAVY = '#1a3a5f'
const GREY = '#64748b'
const LINE = '#dbe3ec'

const MARGIN = 40

const dash = (value: unknown): string => {
  const text = value === null || value === undefined ? '' : String(value).trim()
  return text === '' ? '-' : text
}

/** 2026-08-03 -> 3 ส.ค. 2569 (พ.ศ.) */
const THAI_MONTHS = [
  'ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.',
  'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.',
]

export const formatThaiDate = (value: unknown): string => {
  const key = toDateKey(value)
  if (!key) return '-'
  const [year, month, day] = key.split('-').map(Number)
  return `${day} ${THAI_MONTHS[month - 1]} ${year + 543}`
}

const formatPrintedAt = (now: Date = new Date()): string => {
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${now.getDate()} ${THAI_MONTHS[now.getMonth()]} ${now.getFullYear() + 543} เวลา ${pad(now.getHours())}:${pad(now.getMinutes())} น.`
}

/** โหลดฟอนต์จาก public/fonts (เบราว์เซอร์ cache ให้เอง ครั้งต่อไปไม่ต้องโหลดซ้ำ) */
const loadFonts = async (): Promise<FontPair> => {
  const [regular, bold] = await Promise.all([
    fetch('/fonts/Sarabun-Regular.ttf').then((r) => {
      if (!r.ok) throw new Error('โหลดฟอนต์ Sarabun-Regular ไม่สำเร็จ')
      return r.arrayBuffer()
    }),
    fetch('/fonts/Sarabun-Bold.ttf').then((r) => {
      if (!r.ok) throw new Error('โหลดฟอนต์ Sarabun-Bold ไม่สำเร็จ')
      return r.arrayBuffer()
    }),
  ])
  return { regular, bold }
}

/**
 * วาดรายงานลงเอกสาร แยกออกมาเป็นฟังก์ชันเดี่ยวเพื่อให้เทสต์ได้โดยไม่ต้องมี browser
 * PDFDocument ส่งเข้ามาจากภายนอก (browser ใช้ bundle standalone, เทสต์ใช้ pdfkit ของ node)
 */
export function renderReport(
  PDFDocument: any,
  fonts: FontPair,
  rows: Booking[],
  meta: ReportMeta,
): any {
  const doc = new PDFDocument({ size: 'A4', margin: MARGIN, bufferPages: true })

  // ใช้ Uint8Array ไม่ใช่ Buffer เพราะ Buffer เป็นของ Node ไม่มีในเบราว์เซอร์
  doc.registerFont('TH', new Uint8Array(fonts.regular))
  doc.registerFont('TH-Bold', new Uint8Array(fonts.bold))
  doc.font('TH')

  const prepared = sortForExport(rows)
  const contentWidth = doc.page.width - MARGIN * 2

  drawHeader(doc, meta, contentWidth)

  if (meta.mode === 'single' && prepared.length > 0) {
    drawSingleCase(doc, prepared[0], contentWidth)
  } else {
    drawSummary(doc, prepared, contentWidth)
    drawTable(doc, prepared)
  }

  drawPageNumbers(doc)
  doc.end()
  return doc
}

function drawHeader(doc: any, meta: ReportMeta, contentWidth: number) {
  doc.font('TH-Bold').fontSize(9).fillColor(GREY)
  doc.text(SYSTEM_NAME.toUpperCase(), MARGIN, MARGIN, { characterSpacing: 1.5 })

  doc.font('TH-Bold').fontSize(19).fillColor(NAVY)
  doc.text(REPORT_TITLE, MARGIN, MARGIN + 14)

  doc.font('TH').fontSize(10.5).fillColor('#333333')
  const infoTop = MARGIN + 42

  const lines = [
    `แพทย์: ${dash(meta.doctorName)}   เลขใบประกอบวิชาชีพ: ${dash(meta.license)}`,
    `ห้องผ่าตัด: ${dash(meta.room)}`,
    `ช่วงวันที่: ${dash(meta.rangeLabel)}`,
    `พิมพ์เอกสารเมื่อ: ${formatPrintedAt()}`,
  ]
  lines.forEach((line, index) => {
    doc.text(line, MARGIN, infoTop + index * 15, { width: contentWidth })
  })

  const ruleY = infoTop + lines.length * 15 + 6
  doc.moveTo(MARGIN, ruleY).lineTo(MARGIN + contentWidth, ruleY)
    .lineWidth(1).strokeColor(NAVY).stroke()

  doc.y = ruleY + 16
  doc.fillColor('#333333')
}

function drawSummary(doc: any, rows: Booking[], contentWidth: number) {
  const total = rows.length

  const byStatus = new Map<string, number>()
  const byDate = new Map<string, number>()
  rows.forEach((row) => {
    const status = statusLabel(row.status)
    byStatus.set(status, (byStatus.get(status) || 0) + 1)
    const date = toDateKey(row.date)
    byDate.set(date, (byDate.get(date) || 0) + 1)
  })

  doc.font('TH-Bold').fontSize(13).fillColor(NAVY)
  doc.text('สรุปภาพรวม', MARGIN, doc.y)
  doc.moveDown(0.4)

  doc.font('TH').fontSize(10.5).fillColor('#333333')
  doc.text(`จำนวนเคสทั้งหมด ${total} เคส`, MARGIN, doc.y, { width: contentWidth })
  doc.moveDown(0.2)

  const statusText = [...byStatus.entries()]
    .map(([label, count]) => `${label} ${count}`)
    .join('   ·   ')
  doc.text(`แยกตามสถานะ: ${statusText || '-'}`, MARGIN, doc.y, { width: contentWidth })
  doc.moveDown(0.2)

  const dateText = [...byDate.entries()]
    .sort((a, b) => (a[0] < b[0] ? -1 : 1))
    .map(([date, count]) => `${formatThaiDate(date)} (${count})`)
    .join('   ·   ')
  doc.text(`แยกตามวัน: ${dateText || '-'}`, MARGIN, doc.y, { width: contentWidth })

  doc.moveDown(1)
}

/** ความกว้างคอลัมน์ รวมได้ 515pt = ความกว้างเนื้อหาของ A4 เมื่อขอบข้างละ 40pt */
const TABLE_WIDTHS = [40, 58, 76, 40, 83, 84, 52, 34, 48]
const TABLE_FONT_SIZE = 8
const CELL_PADDING = 4

const TABLE_HEADER = [
  'ลำดับคิว', 'HN', 'ชื่อผู้ป่วย', 'อายุ/เพศ',
  'การวินิจฉัย', 'หัตถการ', 'วันผ่าตัด', 'ห้อง', 'สถานะ',
]

/**
 * วัดความสูงที่แถวหนึ่งต้องใช้ โดยดูจากช่องที่ข้อความยาวที่สุด
 * ต้องวัดเองเพราะต้องรู้ล่วงหน้าว่าแถวถัดไปจะล้นหน้าหรือยัง
 */
function measureRowHeight(doc: any, cells: string[], font: string): number {
  doc.font(font).fontSize(TABLE_FONT_SIZE)

  let tallest = 0
  cells.forEach((text, index) => {
    const height = doc.heightOfString(String(text), {
      width: TABLE_WIDTHS[index] - CELL_PADDING * 2,
    })
    if (height > tallest) tallest = height
  })

  return tallest + CELL_PADDING * 2
}

function drawTable(doc: any, rows: Booking[]) {
  doc.font('TH-Bold').fontSize(13).fillColor(NAVY)
  doc.text('รายละเอียดคิว', MARGIN, doc.y)
  doc.moveDown(0.5)
  doc.fillColor('#333333')

  const body = rows.map((row: any, index) => [
    String(row.__queueNo ?? index + 1),
    dash(row.hn),
    dash(row.fullName),
    `${dash(row.age)}/${genderLabel(row.gender)}`,
    dash(row.diagnosis),
    dash(row.procedure),
    formatThaiDate(row.date),
    dash(row.room),
    statusLabel(row.status),
  ])

  const headerHeight = measureRowHeight(doc, TABLE_HEADER, 'TH-Bold')
  // เว้นที่ด้านล่างไว้ให้เลขหน้า
  const bottomLimit = doc.page.height - MARGIN - 24

  const renderChunk = (chunk: string[][]) => {
    if (chunk.length === 0) return
    doc.table({
      columnStyles: TABLE_WIDTHS,
      data: [TABLE_HEADER, ...chunk],
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

  // PDFKit ไม่ซ้ำหัวตารางให้เองเมื่อขึ้นหน้าใหม่ จึงต้องแบ่งก้อนเองแล้ววาดหัวซ้ำทุกก้อน
  let chunk: string[][] = []
  let usedHeight = doc.y + headerHeight

  body.forEach((row) => {
    const rowHeight = measureRowHeight(doc, row, 'TH')

    if (usedHeight + rowHeight > bottomLimit && chunk.length > 0) {
      renderChunk(chunk)
      chunk = []
      doc.addPage()
      doc.y = MARGIN
      usedHeight = MARGIN + headerHeight
    }

    chunk.push(row)
    usedHeight += rowHeight
  })

  renderChunk(chunk)
}

function drawSingleCase(doc: any, row: any, contentWidth: number) {
  doc.font('TH-Bold').fontSize(13).fillColor(NAVY)
  doc.text('ใบสรุปคิวผ่าตัด', MARGIN, doc.y)
  doc.moveDown(0.6)

  const fields: [string, string][] = [
    ['ลำดับคิว', String(row.__queueNo ?? 1)],
    ['HN', dash(row.hn)],
    ['ชื่อ-นามสกุล', dash(row.fullName)],
    ['อายุ / เพศ', `${dash(row.age)} ปี / ${genderLabel(row.gender)}`],
    ['โรคประจำตัว', dash(row.underlying)],
    ['การวินิจฉัย', dash(row.diagnosis)],
    ['หัตถการ', dash(row.procedure)],
    ['วันผ่าตัด', formatThaiDate(row.date)],
    ['ห้องผ่าตัด', dash(row.room)],
    ['สถานะ', statusLabel(row.status)],
    ['CXR', pair(row.cxrDate, row.cxrNote)],
    ['ECG', pair(row.ecgDate, row.ecgNote)],
    ['Lab', pair(row.labDate, row.labNote)],
    ['Admission', pair(row.admDate, row.admNote)],
    ['หมายเหตุ', dash(row.notes)],
  ]

  const labelWidth = 110
  fields.forEach(([label, value]) => {
    const top = doc.y
    doc.font('TH-Bold').fontSize(10).fillColor(GREY)
    doc.text(label, MARGIN, top, { width: labelWidth })

    doc.font('TH').fontSize(10.5).fillColor('#333333')
    doc.text(value, MARGIN + labelWidth, top, { width: contentWidth - labelWidth })

    doc.moveDown(0.35)
    const lineY = doc.y - 3
    doc.moveTo(MARGIN, lineY).lineTo(MARGIN + contentWidth, lineY)
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

/**
 * ใส่เลขหน้า x / y ทุกหน้า
 * ต้องตั้ง margin ล่างเป็น 0 ชั่วคราว ไม่งั้น PDFKit จะมองว่าข้อความล้นขอบ
 * แล้วแทรกหน้าเปล่าเพิ่มให้เอง (เจอบั๊กนี้ตอนทดสอบ ได้หน้าเกินมา 2 หน้า)
 */
function drawPageNumbers(doc: any) {
  const range = doc.bufferedPageRange()

  for (let i = range.start; i < range.start + range.count; i += 1) {
    doc.switchToPage(i)

    const bottomMargin = doc.page.margins.bottom
    doc.page.margins.bottom = 0

    doc.font('TH').fontSize(8).fillColor(GREY)
    doc.text(
      `หน้า ${i - range.start + 1} / ${range.count}`,
      MARGIN,
      doc.page.height - 28,
      { width: doc.page.width - MARGIN * 2, align: 'center', lineBreak: false },
    )

    doc.page.margins.bottom = bottomMargin
  }

  doc.flushPages()
}

/** รวบ chunk ที่ PDFKit ทยอยส่งออกมาให้เป็น Blob ก้อนเดียว */
const streamToBlob = (doc: any): Promise<Blob> =>
  new Promise((resolve, reject) => {
    const chunks: Uint8Array[] = []
    doc.on('data', (chunk: Uint8Array) => chunks.push(chunk))
    doc.on('end', () => resolve(new Blob(chunks as BlobPart[], { type: 'application/pdf' })))
    doc.on('error', reject)
  })

/**
 * จุดเรียกใช้หลักจากฝั่ง UI
 * โหลด PDFKit และฟอนต์แบบ dynamic เพื่อไม่ให้ไปถ่วง bundle ตอนเปิดเว็บ
 */
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

/** report_{license}_{YYYYMMDD}-{YYYYMMDD}.pdf */
export const buildReportFileName = (
  meta: { license: unknown; hn?: unknown; from?: unknown; to?: unknown; mode: 'single' | 'range' },
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