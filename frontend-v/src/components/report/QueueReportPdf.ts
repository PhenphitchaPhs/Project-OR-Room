/**
 * QueueReportPdf
 * ------------------------------------------------------------------
 * สร้างรายงานสรุปคิวผ่าตัดเป็น PDF (A4 แนวตั้ง) คืนค่าเป็น Blob
 * ใช้ได้ทั้งกับปุ่มดาวน์โหลด และ (ในอนาคต) ปุ่มส่งอีเมลที่ต้องการไฟล์เป็น binary
 *
 * 📄 รองรับ 3 โหมด ใช้ generator ตัวเดียวกัน ต่างกันแค่ config ที่ส่งเข้ามา
 *     single — ใบสรุปรายเคส (ฝั่งแพทย์)
 *     range  — ตารางคิวของแพทย์คนเดียว (ฝั่งแพทย์)
 *     admin  — รายงานระดับระบบ มีคอลัมน์ชื่อแพทย์ + จัดกลุ่มตามห้อง/แพทย์ได้
 *
 * ⚠️ ห้ามแตก logic การวาด PDF ไปเขียนใหม่ที่หน้า admin
 *    ถ้าต้องการอะไรเพิ่ม ให้เพิ่มเป็น field ใน ReportMeta หรือเพิ่ม column set ที่ไฟล์นี้
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
import {
  sortForExport,
  // ✅ ใช้ sortForExport เดียวกันหมด
  toDateKey,
  // ✅ ไม่ต้องใช้ statusLabel แล้ว (ใช้ dash แทน)
  genderLabel,
} from '../../composables/useCsvExport'

export type ReportMode = 'single' | 'range' | 'admin'

/** จัดกลุ่มตารางรายละเอียดของรายงานฝั่ง admin */
export type ReportGroupBy = 'room' | 'doctor'

export interface ReportMeta {
  /** 'single' = ใบสรุปรายเคส, 'range' = ตารางหลายเคส, 'admin' = รายงานระดับระบบ */
  mode: ReportMode
  /** ข้อความบอกช่วงวันที่ของรายงาน เช่น "3 - 10 ส.ค. 2569" */
  rangeLabel: string

  /* ---- ใช้เฉพาะโหมด single / range (รายงานของแพทย์เจ้าของคิว) ---- */
  /** ชื่อแพทย์เจ้าของรายงาน */
  doctorName?: string
  /** เลขใบประกอบวิชาชีพ */
  license?: string
  /** ห้องผ่าตัดประจำ */
  room?: string

  /* ---- ใช้เฉพาะโหมด admin ---- */
  /** เงื่อนไข filter ที่ใช้ เขียนเป็นข้อความอ่านได้ เช่น "ห้อง OR-201–OR-205 · เดือนกรกฎาคม 2569" */
  filterLabel?: string
  /** ผู้พิมพ์รายงาน (เลขใบประกอบวิชาชีพ / ชื่อผู้ใช้ของแอดมิน) */
  printedBy?: string
  /** จัดกลุ่มตารางรายละเอียดตามห้อง หรือ ตามแพทย์ */
  groupBy?: ReportGroupBy
  /** map license -> ชื่อแพทย์ ใช้เติมคอลัมน์ชื่อแพทย์และหัวกลุ่ม */
  doctorNames?: Record<string, string>
}

interface FontPair {
  regular: ArrayBuffer
  bold: ArrayBuffer
}

/** นิยามคอลัมน์ของตารางรายละเอียด — ความกว้างทุกชุดต้องรวมได้ CONTENT_WIDTH พอดี */
interface ColumnDef {
  header: string
  width: number
  value: (row: ExportedRow, meta: ReportMeta) => string
}

type ExportedRow = Booking & { __queueNo?: number }

const SYSTEM_NAME = 'ORchestrator'
const SYSTEM_TAGLINE = 'ระบบจัดการคิวห้องผ่าตัด'

const REPORT_TITLE = 'รายงานสรุปคิวผ่าตัด'
const ADMIN_REPORT_TITLE = 'รายงานสรุปคิวผ่าตัดทั้งระบบ'

const NAVY = '#1a3a5f'
const GREY = '#64748b'
const LINE = '#dbe3ec'
const INK = '#333333'

const MARGIN = 40
/** A4 กว้าง 595pt หักขอบข้างละ 40pt เหลือเนื้อหา 515pt */
const CONTENT_WIDTH = 515

const dash = (value: unknown): string => {
  const text = value === null || value === undefined ? '' : String(value).trim()
  return text === '' ? '-' : text
}

/** 2026-08-03 -> 3 ส.ค. 2569 (พ.ศ.) */
const THAI_MONTHS = [
  'ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.',
  'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.',
]

export const THAI_MONTHS_FULL = [
  'มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน',
  'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม',
]

export const formatThaiDate = (value: unknown): string => {
  const key = toDateKey(value)
  if (!key) return '-'
  const [year = 0, month = 1, day = 0] = key.split('-').map(Number)
  return `${day} ${THAI_MONTHS[month - 1]} ${year + 543}`
}

/** '2026-07' -> 'เดือนกรกฎาคม 2569' ใช้เขียนเงื่อนไข filter ให้อ่านออก */
export const formatThaiMonth = (value: unknown): string => {
  const matched = String(value || '').match(/^(\d{4})-(\d{2})/)
  if (!matched) return '-'
  const year = Number(matched[1])
  const month = Number(matched[2])
  return `เดือน${THAI_MONTHS_FULL[month - 1]} ${year + 543}`
}

const formatPrintedAt = (now: Date = new Date()): string => {
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${now.getDate()} ${THAI_MONTHS[now.getMonth()]} ${now.getFullYear() + 543} เวลา ${pad(now.getHours())}:${pad(now.getMinutes())} น.`
}

/** ชื่อแพทย์จาก map ที่ส่งมา ถ้าไม่มีค่อยถอยไปใช้ค่าที่ติดมากับแถว แล้วค่อยเป็นเลขใบประกอบฯ */
const doctorNameOf = (row: Booking, meta: ReportMeta): string => {
  const license = String(row.doctorLicense || '')
  return dash(meta.doctorNames?.[license] || row.doctorName || license)
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

/* ==================================================================
 * ชุดคอลัมน์ของตารางรายละเอียด
 * ================================================================== */

const COLUMN_QUEUE_NO: ColumnDef = {
  header: 'ลำดับคิว',
  width: 40,
  value: (row) => String(row.__queueNo ?? '-'),
}

/** ชุดคอลัมน์ฝั่งแพทย์ (โหมด range) รวม 515pt */
const USER_COLUMNS: ColumnDef[] = [
  COLUMN_QUEUE_NO,
  { header: 'HN', width: 58, value: (row) => dash(row.hn) },
  { header: 'ชื่อผู้ป่วย', width: 76, value: (row) => dash(row.fullName) },
  { header: 'อายุ/เพศ', width: 40, value: (row) => `${dash(row.age)}/${genderLabel(row.gender)}` },
  { header: 'การวินิจฉัย', width: 83, value: (row) => dash(row.diagnosis) },
  { header: 'หัตถการ', width: 84, value: (row) => dash(row.procedure) },
  { header: 'วันผ่าตัด', width: 52, value: (row) => formatThaiDate(row.date) },
  { header: 'ห้อง', width: 34, value: (row) => dash(row.room) },
  // ✅ เปลี่ยนเป็น raw status (ภาษาอังกฤษ)
  { header: 'สถานะ', width: 48, value: (row) => dash(row.status) },
]

/**
 * ชุดคอลัมน์ฝั่ง admin — เพิ่มคอลัมน์ชื่อแพทย์ รวม 515pt เท่าเดิม
 * หัวคอลัมน์แรกย่อเหลือ "คิว" เพราะต้องเบียดที่ให้คอลัมน์แพทย์ในกระดาษแนวตั้ง
 *
 * 📐 ความกว้างวัดจากค่าจริงที่ยาวที่สุดของแต่ละคอลัมน์ (Sarabun 8pt + padding ข้างละ 4)
 *    เช่น "13 ก.ค. 2569" ต้องการ 52pt, "OR-201" ต้องการ 34pt
 *    คอลัมน์ที่ตั้งใจให้ตัดบรรทัดคือ ชื่อผู้ป่วย / การวินิจฉัย / หัตถการ / ชื่อแพทย์ เท่านั้น
 *    ถ้าจะปรับความกว้าง ให้รักษาผลรวม 515pt ไว้เสมอ ไม่งั้นตารางจะล้นขอบกระดาษ
 */
const ADMIN_COLUMNS: ColumnDef[] = [
  { header: 'คิว', width: 24, value: (row) => String(row.__queueNo ?? '-') },
  { header: 'HN', width: 40, value: (row) => dash(row.hn) },
  { header: 'ชื่อผู้ป่วย', width: 72, value: (row) => dash(row.fullName) },
  { header: 'อายุ/เพศ', width: 41, value: (row) => `${dash(row.age)}/${genderLabel(row.gender)}` },
  { header: 'การวินิจฉัย', width: 68, value: (row) => dash(row.diagnosis) },
  { header: 'หัตถการ', width: 72, value: (row) => dash(row.procedure) },
  { header: 'วันผ่าตัด', width: 54, value: (row) => formatThaiDate(row.date) },
  { header: 'ห้อง', width: 36, value: (row) => dash(row.room) },
  { header: 'ชื่อแพทย์', width: 66, value: (row, meta) => doctorNameOf(row, meta) },
  // ✅ เปลี่ยนเป็น raw status (ภาษาอังกฤษ)
  { header: 'สถานะ', width: 42, value: (row) => dash(row.status) },
]

const columnsFor = (mode: ReportMode): ColumnDef[] =>
  mode === 'admin' ? ADMIN_COLUMNS : USER_COLUMNS

/* ==================================================================
 * จุดวาดหลัก
 * ================================================================== */

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

  // ✅ ใช้ sortForExport เดียวกันทุกกรณี (ทั้ง admin และ user)
  //    เลขลำดับคิวจะเรียง 1 ถึง n ต่อเนื่องทั้งไฟล์ ไม่เริ่มใหม่ตามวันหรือห้อง
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

  // ⚠️ characterSpacing ใส่ได้เฉพาะข้อความละติน
  //    ถ้าใส่กับข้อความไทย ระยะจะไปแทรกระหว่างพยัญชนะกับสระ/วรรณยุกต์ที่ควรซ้อนกัน
  //    ผลคือ "ระบบจัดการ" กลายเป็น "ร ะัดบกบาจร" — จึงต้องแยกเป็นสอง run
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
        `เงื่อนไขที่ใช้: ${dash(meta.filterLabel)}`,
        `จัดกลุ่ม: ${meta.groupBy === 'doctor' ? 'ตามแพทย์' : 'ตามห้องผ่าตัด'}`,
        `พิมพ์เอกสารเมื่อ: ${formatPrintedAt()}`,
        `ผู้พิมพ์รายงาน: ${dash(meta.printedBy)}`,
      ]
    : [
        `แพทย์: ${dash(meta.doctorName)}   เลขใบประกอบวิชาชีพ: ${dash(meta.license)}`,
        `ห้องผ่าตัด: ${dash(meta.room)}`,
        `ช่วงวันที่: ${dash(meta.rangeLabel)}`,
        `พิมพ์เอกสารเมื่อ: ${formatPrintedAt()}`,
      ]

  // filter label อาจยาวจนขึ้นบรรทัดใหม่ จึงต้องไล่ y เองทีละบรรทัดแทนการคูณระยะคงที่
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

/* ==================================================================
 * ส่วนสรุปภาพรวม
 * ================================================================== */

/** นับจำนวนตาม key ที่ดึงจากแต่ละแถว */
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

/** เรียงชื่อห้องแบบ numeric เพื่อให้ OR-2 มาก่อน OR-10 */
const byRoomName = (a: [string, number], b: [string, number]) =>
  a[0].localeCompare(b[0], 'en', { numeric: true })

/** เรียงจำนวนมากไปน้อย จำนวนเท่ากันเรียงตามชื่อ */
const byCountDesc = (a: [string, number], b: [string, number]) =>
  b[1] - a[1] || a[0].localeCompare(b[0], 'th')

/**
 * 🔢 ตัวเลขทุกตัวคำนวณจาก rows ที่ผ่าน filter แล้วเท่านั้น
 *    ห้ามรับตัวเลขที่นับจากหน้าจอมาใส่ เพราะหน้าจอมี pagination ตัวเลขจะไม่ตรง
 */
function drawSummary(doc: any, rows: ExportedRow[], meta: ReportMeta) {
  const isAdmin = meta.mode === 'admin'

  doc.font('TH-Bold').fontSize(13).fillColor(NAVY)
  doc.text('สรุปภาพรวม', MARGIN, doc.y)
  doc.moveDown(0.4)

  doc.font('TH').fontSize(10.5).fillColor(INK)
  doc.text(`จำนวนเคสทั้งหมด ${rows.length} เคส`, MARGIN, doc.y, { width: CONTENT_WIDTH })
  doc.moveDown(0.2)

  const write = (label: string, text: string) => {
    doc.font('TH').fontSize(10.5).fillColor(INK)
    doc.text(`${label}: ${text}`, MARGIN, doc.y, { width: CONTENT_WIDTH })
    doc.moveDown(0.2)
  }

  // ✅ เปลี่ยนเป็นใช้ raw status (ภาษาอังกฤษ) เพื่อให้สอดคล้องกับข้อมูลในตาราง
  const byStatus = [...countBy(rows, (row) => dash(row.status)).entries()].sort(byCountDesc)
  write('แยกตามสถานะ', joinCounts(byStatus))

  if (isAdmin) {
    const byRoom = [...countBy(rows, (row) => dash(row.room)).entries()].sort(byRoomName)
    write('แยกตามห้อง', joinCounts(byRoom))

    const byDoctor = [...countBy(rows, (row) => doctorNameOf(row, meta)).entries()].sort(byCountDesc)
    write('แยกตามแพทย์', joinCounts(byDoctor))
  }

  const byDate = [...countBy(rows, (row) => toDateKey(row.date)).entries()]
    .sort((a, b) => (a[0] < b[0] ? -1 : 1))
  write('แยกตามวัน', joinCounts(byDate, formatThaiDate))

  doc.moveDown(1)
}

/* ==================================================================
 * ตารางรายละเอียด
 * ================================================================== */

const TABLE_FONT_SIZE = 8
const CELL_PADDING = 4
/** เว้นที่ด้านล่างไว้ให้เลขหน้า */
const FOOTER_SPACE = 24

/**
 * วัดความสูงที่แถวหนึ่งต้องใช้ โดยดูจากช่องที่ข้อความยาวที่สุด
 * ต้องวัดเองเพราะต้องรู้ล่วงหน้าว่าแถวถัดไปจะล้นหน้าหรือยัง
 */
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

/** จัดกลุ่มแถวตาม config โดยรักษาลำดับที่เรียงมาแล้วไว้ */
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

  const prefix = meta.groupBy === 'doctor' ? 'แพทย์' : 'ห้อง'
  const entries = [...buckets.entries()].sort((a, b) =>
    meta.groupBy === 'doctor'
      ? a[0].localeCompare(b[0], 'th')
      : a[0].localeCompare(b[0], 'en', { numeric: true }),
  )

  return entries.map(([key, groupRowList]) => ({
    title: `${prefix} ${key}  ·  ${groupRowList.length} เคส`,
    rows: groupRowList,
  }))
}

function drawDetailTable(doc: any, rows: ExportedRow[], meta: ReportMeta) {
  const columns = columnsFor(meta.mode)
  const widths = columns.map((column) => column.width)
  const headerCells = columns.map((column) => column.header)

  doc.font('TH-Bold').fontSize(13).fillColor(NAVY)
  doc.text('รายละเอียดคิว', MARGIN, doc.y)
  doc.moveDown(0.5)
  doc.fillColor(INK)

  const headerHeight = measureRowHeight(doc, headerCells, widths, 'TH-Bold')
  const bottomLimit = doc.page.height - MARGIN - FOOTER_SPACE

  // PDFKit ไม่ซ้ำหัวตารางให้เองเมื่อขึ้นหน้าใหม่ จึงต้องแบ่งก้อนเองแล้ววาดหัวซ้ำทุกก้อน
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

      // กันหัวกลุ่มค้างอยู่ท้ายหน้าโดยไม่มีตารางตามมา ต้องมีที่พอสำหรับหัวกลุ่ม + หัวตาราง + แถวแรก
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

/* ==================================================================
 * ใบสรุปรายเคส (โหมด single)
 * ================================================================== */

function drawSingleCase(doc: any, row: ExportedRow) {
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
    // ✅ เปลี่ยนเป็น raw status (ภาษาอังกฤษ)
    ['สถานะ', dash(row.status)],
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