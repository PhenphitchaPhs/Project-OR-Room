/**
 * useCsvExport
 * ------------------------------------------------------------------
 * รวม logic การแปลงรายการจองห้องผ่าตัดเป็นไฟล์ CSV ไว้ที่เดียว
 * เพื่อให้หน้า user (HomeView) และหน้า admin (AdminHome) ใช้ซ้ำได้
 *
 * มาตรฐานที่ยึด:
 * - RFC 4180 สำหรับการ escape ค่าและการขึ้นบรรทัด (CRLF)
 * - UTF-8 BOM ที่หัวไฟล์ เพื่อให้ Microsoft Excel อ่านภาษาไทยได้ถูกต้อง
 */

export interface Booking {
  id?: number | string
  hn?: string
  fullName?: string
  /**
   * ⚠️ คอลัมน์ dob มีอยู่ใน DB แต่ไม่ได้ export
   * เพราะหน้าจอง (BookingView.vue) ไม่มีช่องให้กรอกวันเกิด และส่ง `dob: null` ตายตัว
   * ถ้าวันหน้าเพิ่มช่องวันเกิดในฟอร์ม ให้เพิ่มคอลัมน์กลับเข้า CSV_COLUMNS ด้วย
   */
  dob?: string | null
  age?: number | string
  gender?: string
  procedure?: string
  date?: string
  underlying?: string
  diagnosis?: string
  cxrDate?: string
  cxrNote?: string
  ecgDate?: string
  ecgNote?: string
  labDate?: string
  labNote?: string
  admDate?: string
  admNote?: string
  notes?: string
  status?: string
  room?: string
  queueOrder?: number
  doctorLicense?: string
  /** ไม่มีในตาราง bookings แต่บางหน้าผสมชื่อแพทย์เข้ามาก่อนส่งมา export */
  doctorName?: string
  [key: string]: unknown
}

/** แถวที่พร้อม export แล้ว (มีเลขลำดับคิวที่คำนวณไว้) */
type ExportRow = Booking & { __queueNo?: number }

const BOM = '\uFEFF'
const CRLF = '\r\n'

/** ค่าว่างให้แสดงเป็น "-" เพื่อไม่ให้ช่องในตารางดูเหมือนข้อมูลหาย */
const dash = (value: unknown): string => {
  const text = value === null || value === undefined ? '' : String(value).trim()
  return text === '' ? '-' : text
}

export const genderLabel = (value: unknown): string => {
  const key = String(value || '').toLowerCase()
  if (key === 'male' || key === 'ชาย') return 'ชาย'
  if (key === 'female' || key === 'หญิง') return 'หญิง'
  return '-'
}

/**
 * ⚠️ ค่า status ในระบบยังไม่ตรงกันทุกที่
 * - schema.sql        : Upcoming | Succeed | Cancelled
 * - HomeView.vue      : Upcoming | Complete | Cancelled
 * - AdminHome.vue     : Completed
 * ที่นี่จึงรองรับทุกสะกดไว้ก่อน เพื่อให้ CSV ไม่แสดงค่าดิบที่ผู้ใช้อ่านไม่รู้เรื่อง
 * เมื่อทีมสรุปค่ามาตรฐานได้แล้ว ให้ลดเหลือชุดเดียวและลบที่เหลือออก
 */
const STATUS_LABELS: Record<string, string> = {
  upcoming: 'รอผ่าตัด',
  complete: 'ผ่าตัดแล้ว',
  completed: 'ผ่าตัดแล้ว',
  succeed: 'ผ่าตัดแล้ว',
  cancelled: 'ยกเลิก',
  canceled: 'ยกเลิก',
}

export const statusLabel = (value: unknown): string => {
  const key = String(value || '').toLowerCase().trim()
  if (!key) return STATUS_LABELS.upcoming
  return STATUS_LABELS[key] || String(value)
}

/**
 * รวมช่อง "วันที่ / หมายเหตุ" ของ CXR, ECG, Lab, Admission ให้อยู่คอลัมน์เดียว
 * - มีครบทั้งคู่  → "2026-07-28 / normal"
 * - มีอย่างเดียว  → แสดงเฉพาะค่าที่มี
 * - ไม่มีเลย      → "-" (ไม่ใช่ "- / -" ที่รกตาเวลาเปิดในตาราง)
 */
const pairLabel = (dateValue: unknown, noteValue: unknown): string => {
  const dateText = dash(dateValue)
  const noteText = dash(noteValue)

  if (dateText === '-' && noteText === '-') return '-'
  if (dateText === '-') return noteText
  if (noteText === '-') return dateText
  return `${dateText} / ${noteText}`
}

/**
 * แปลงค่าวันที่เป็นคีย์ YYYY-MM-DD
 * รับได้ทั้ง string จาก DB ('2026-06-19') และ Date object จาก VueDatePicker
 * ใช้ getFullYear/getMonth/getDate (เวลาท้องถิ่น) เพื่อไม่ให้วันเคลื่อนจาก timezone
 */
export const toDateKey = (value: unknown): string => {
  if (!value) return ''

  if (typeof value === 'string') {
    const matched = value.match(/^(\d{4})-(\d{2})-(\d{2})/)
    if (matched) return `${matched[1]}-${matched[2]}-${matched[3]}`
  }

  const parsed = value instanceof Date ? value : new Date(value as string)
  if (Number.isNaN(parsed.getTime())) return ''

  const pad = (n: number) => String(n).padStart(2, '0')
  return `${parsed.getFullYear()}-${pad(parsed.getMonth() + 1)}-${pad(parsed.getDate())}`
}

/** YYYY-MM-DD → YYYYMMDD สำหรับใช้ในชื่อไฟล์ */
export const toCompactDate = (value: unknown): string => toDateKey(value).replace(/-/g, '')

/**
 * วันที่ดาวน์โหลด (ตามเวลาเครื่องผู้ใช้) สำหรับต่อท้ายชื่อไฟล์
 * ทำให้รู้ว่าไฟล์นี้ดึงออกมาเมื่อไร และโหลดคนละวันแล้วไฟล์ไม่ทับกัน
 *
 * อยากได้เวลาด้วย (กันไฟล์ชนกันเมื่อโหลดหลายรอบในวันเดียว) ให้เพิ่มบรรทัดนี้ต่อท้าย:
 *   + `-${pad(now.getHours())}${pad(now.getMinutes())}`
 */
export const downloadStamp = (now: Date = new Date()): string => {
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}`
}

/**
 * เรียงลำดับให้ตรงกับที่ผู้ใช้เห็นบนหน้าจอ (ตรรกะเดียวกับ sortCases ใน HomeView)
 * วันผ่าตัด → ลำดับที่ผู้ใช้ลากจัดเอง → อายุมากก่อน → เพศหญิงก่อน
 * แล้วใส่เลขลำดับคิวโดยเริ่มนับใหม่ทุกวัน
 */
export const sortForExport = (rows: Booking[]): ExportRow[] => {
  const sorted = [...rows].sort((a, b) => {
    const dateA = toDateKey(a.date)
    const dateB = toDateKey(b.date)
    if (dateA !== dateB) return dateA < dateB ? -1 : 1

    const orderA = Number(a.queueOrder) || 999
    const orderB = Number(b.queueOrder) || 999
    if (orderA !== orderB) return orderA - orderB

    const ageA = parseInt(String(a.age)) || 0
    const ageB = parseInt(String(b.age)) || 0
    if (ageA !== ageB) return ageB - ageA

    if (a.gender !== b.gender) return a.gender === 'female' ? -1 : 1
    return 0
  })

  const counterByDate: Record<string, number> = {}
  return sorted.map((row) => {
    const dateKey = toDateKey(row.date)
    counterByDate[dateKey] = (counterByDate[dateKey] || 0) + 1
    return { ...row, __queueNo: counterByDate[dateKey] }
  })
}

/**
 * เรียงสำหรับรายงานระดับระบบ (Admin): วัน → ห้อง → ลำดับคิว → อายุมากก่อน → หญิงก่อน
 *
 * ต่างจาก sortForExport ตรงที่แทรก "ห้อง" เป็นลำดับที่สอง และนับเลขคิวใหม่ทุก (วัน + ห้อง)
 * เพราะรายงานฝั่ง admin รวมทุกห้องไว้ในไฟล์เดียว ถ้านับต่อวันอย่างเดียว
 * เลขคิวจะไหลข้ามห้องจนอ่านไม่รู้เรื่องว่าเป็นคิวที่เท่าไรของห้องนั้น
 *
 * เรียงห้องด้วย localeCompare + numeric เพื่อให้ OR-2 มาก่อน OR-10 (ไม่ใช่เรียงแบบ string ล้วน)
 */
export const sortForAdminExport = (rows: Booking[]): ExportRow[] => {
  const sorted = [...rows].sort((a, b) => {
    const dateA = toDateKey(a.date)
    const dateB = toDateKey(b.date)
    if (dateA !== dateB) return dateA < dateB ? -1 : 1

    const roomA = String(a.room || '')
    const roomB = String(b.room || '')
    if (roomA !== roomB) return roomA.localeCompare(roomB, 'en', { numeric: true })

    const orderA = Number(a.queueOrder) || 999
    const orderB = Number(b.queueOrder) || 999
    if (orderA !== orderB) return orderA - orderB

    const ageA = parseInt(String(a.age)) || 0
    const ageB = parseInt(String(b.age)) || 0
    if (ageA !== ageB) return ageB - ageA

    if (a.gender !== b.gender) return a.gender === 'female' ? -1 : 1
    return 0
  })

  const counterByDateRoom: Record<string, number> = {}
  return sorted.map((row) => {
    const key = `${toDateKey(row.date)}|${String(row.room || '')}`
    counterByDateRoom[key] = (counterByDateRoom[key] || 0) + 1
    return { ...row, __queueNo: counterByDateRoom[key] }
  })
}

/** เก็บเฉพาะรายการของแพทย์เจ้าของ license ที่ระบุ (defense in depth ฝั่ง frontend) */
export const filterOwnBookings = (rows: Booking[], license: string): Booking[] => {
  if (!license) return []
  return rows.filter((row) => String(row.doctorLicense || '') === String(license))
}

/** กรองตามช่วงวันผ่าตัด แบบรวมวันเริ่มต้นและวันสิ้นสุด (inclusive) */
export const filterByDateRange = (
  rows: Booking[],
  from: unknown,
  to: unknown,
): Booking[] => {
  let start = toDateKey(from)
  let end = toDateKey(to)
  if (!start && !end) return rows

  // เผื่อผู้ใช้เลือกวันสิ้นสุดก่อนวันเริ่มต้น
  if (start && end && start > end) [start, end] = [end, start]

  return rows.filter((row) => {
    const dateKey = toDateKey(row.date)
    if (!dateKey) return false
    if (start && dateKey < start) return false
    if (end && dateKey > end) return false
    return true
  })
}

/**
 * 🔢 บังคับให้ Excel อ่าน HN เป็นข้อความ ไม่ตัดเลข 0 นำหน้าทิ้ง
 *
 * ปัญหา: HN ของโรงพยาบาลเป็นเลข 7 หลักและหลายเลขขึ้นต้นด้วย 0 (เช่น 0433557)
 *        CSV เป็นไฟล์ข้อความล้วน ไม่มีที่เก็บว่าคอลัมน์นี้เป็นชนิดอะไร
 *        Excel เลยเดาเองว่าเป็นตัวเลข แล้วตัด 0 ทิ้งเหลือ 433557 ซึ่งเป็น HN ที่ผิด
 *        การครอบด้วย " เฉย ๆ ไม่ช่วย เพราะ Excel ยังเดาชนิดข้อมูลอยู่ดี
 *
 * วิธีแก้: เขียนค่าเป็น ="0433557" ซึ่ง Excel ตีความเป็นสูตรที่คืนค่าข้อความ
 *
 * ⚠️ ข้อแลกเปลี่ยน: เครื่องมืออื่น (pandas, Google Sheets, สคริปต์ทั่วไป)
 *    จะเห็นค่าเป็น ="0433557" ตรง ๆ ต้องตัดส่วนครอบออกเอง
 *    ถ้าไฟล์นี้ถูกเอาไปเข้าระบบอื่นมากกว่าเปิดด้วย Excel ให้ตั้งค่านี้เป็น false
 *    ทางแก้ที่จบกว่านี้คือ export เป็น .xlsx ซึ่งกำหนดชนิด cell ได้จริง
 */
const EXCEL_TEXT_HN = true

const excelSafeText = (value: unknown): string => {
  const text = dash(value)
  if (!EXCEL_TEXT_HN || text === '-') return text

  // ครอบเฉพาะค่าที่เป็นตัวเลขล้วน เพื่อไม่ให้กลายเป็นช่องทางสร้างสูตรจากข้อมูลที่ผู้ใช้พิมพ์เอง
  if (!/^\d+$/.test(text)) return text

  return `="${text}"`
}

/** ตัวเลือกตอนสร้าง CSV — ฝั่ง admin ต้องการคอลัมน์แพทย์เพิ่ม */
export interface CsvOptions {
  /** เพิ่มคอลัมน์ ชื่อแพทย์ + เลขใบประกอบวิชาชีพ ต่อท้าย (ใช้ในหน้า admin) */
  includeDoctor?: boolean
  /** map license -> ชื่อแพทย์ สำหรับเติมคอลัมน์ชื่อแพทย์ */
  doctorNames?: Record<string, string>
}

type ColumnDef = {
  header: string
  value: (row: ExportRow, index: number, options: CsvOptions) => string
}

/**
 * คอลัมน์พื้นฐาน — ยึดตามช่องที่กรอกได้จริงในหน้าจอง (BookingView.vue)
 * ฝั่ง user และ admin ใช้ชุดนี้เหมือนกัน 16 คอลัมน์แรก ไฟล์จึงเทียบกันได้ตรง ๆ
 */
const CSV_COLUMNS: ColumnDef[] = [
  { header: 'ลำดับคิว', value: (row, index) => String(row.__queueNo ?? index + 1) },
  { header: 'HN', value: (row) => excelSafeText(row.hn) },
  { header: 'ชื่อ-นามสกุล', value: (row) => dash(row.fullName) },
  { header: 'อายุ', value: (row) => dash(row.age) },
  { header: 'เพศ', value: (row) => genderLabel(row.gender) },
  { header: 'โรคประจำตัว', value: (row) => dash(row.underlying) },
  { header: 'การวินิจฉัย', value: (row) => dash(row.diagnosis) },
  { header: 'หัตถการ', value: (row) => dash(row.procedure) },
  { header: 'ห้อง', value: (row) => dash(row.room) },
  { header: 'วันผ่าตัด', value: (row) => dash(toDateKey(row.date)) },
  { header: 'สถานะ', value: (row) => statusLabel(row.status) },
  { header: 'CXR (วันที่/หมายเหตุ)', value: (row) => pairLabel(row.cxrDate, row.cxrNote) },
  { header: 'ECG (วันที่/หมายเหตุ)', value: (row) => pairLabel(row.ecgDate, row.ecgNote) },
  { header: 'Lab (วันที่/หมายเหตุ)', value: (row) => pairLabel(row.labDate, row.labNote) },
  { header: 'Admission (วันที่/หมายเหตุ)', value: (row) => pairLabel(row.admDate, row.admNote) },
  { header: 'หมายเหตุ', value: (row) => dash(row.notes) },
]

/**
 * คอลัมน์เพิ่มสำหรับหน้า admin — ต่อท้ายคอลัมน์พื้นฐาน
 * วางไว้ท้ายสุดเพื่อให้ 16 คอลัมน์แรกตรงกับไฟล์ฝั่ง user เป๊ะ ๆ เอาไปเทียบกันได้
 */
const ADMIN_COLUMNS: ColumnDef[] = [
  {
    header: 'ชื่อแพทย์',
    value: (row, _index, options) =>
      dash(options.doctorNames?.[String(row.doctorLicense || '')] || row.doctorName),
  },
  { header: 'เลขใบประกอบวิชาชีพ', value: (row) => dash(row.doctorLicense) },
]

/**
 * escape ค่าตาม RFC 4180
 * ครอบด้วย " เมื่อค่ามี , หรือ " หรือขึ้นบรรทัดใหม่ และแปลง " ข้างในเป็น ""
 */
export const escapeCsvValue = (value: unknown): string => {
  const text = value === null || value === undefined ? '' : String(value)
  if (/[",\r\n]/.test(text)) return `"${text.replace(/"/g, '""')}"`
  return text
}

/** แปลงรายการจองเป็นข้อความ CSV (ยังไม่ใส่ BOM — ใส่ตอนสร้างไฟล์) */
export const buildBookingsCsv = (rows: Booking[], options: CsvOptions = {}): string => {
  const prepared = sortForExport(rows)
  const columns = options.includeDoctor ? [...CSV_COLUMNS, ...ADMIN_COLUMNS] : CSV_COLUMNS

  const headerLine = columns.map((column) => escapeCsvValue(column.header)).join(',')

  const bodyLines = prepared.map((row, index) =>
    columns.map((column) => escapeCsvValue(column.value(row, index, options))).join(','),
  )

  return [headerLine, ...bodyLines].join(CRLF)
}

/** ตัดอักขระที่ใช้ในชื่อไฟล์ไม่ได้ออก */
const safeFileToken = (value: unknown): string =>
  String(value ?? '')
    .trim()
    .replace(/[\\/:*?"<>|\s]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '') || 'unknown'

/** bookings_{license}_{ช่วงวันผ่าตัด}_exported{วันที่โหลด}.csv */
export const buildRangeFileName = (license: unknown, from: unknown, to: unknown): string => {
  let start = toCompactDate(from)
  let end = toCompactDate(to)
  if (start && end && start > end) [start, end] = [end, start]

  const range = start && end
    ? (start === end ? start : `${start}-${end}`)
    : start || end || 'all'

  return `bookings_${safeFileToken(license)}_${range}_exported${downloadStamp()}.csv`
}

/** booking_{HN}_{วันผ่าตัด}_exported{วันที่โหลด}.csv */
export const buildSingleFileName = (hn: unknown, date: unknown): string =>
  `booking_${safeFileToken(hn)}_${toCompactDate(date) || 'nodate'}_exported${downloadStamp()}.csv`

/**
 * ชื่อไฟล์ฝั่ง admin ที่สื่อความหมายตาม filter ที่เลือก
 * เช่น bookings_OR-201_2026-07_exported20260731.csv
 *      bookings_all_20260701-20260731_exported20260731.csv
 *      bookings_all_exported20260731.csv  (ไม่ได้ระบุช่วงวันที่)
 *
 * PDF ใช้ตัวเดียวกัน แค่ส่ง prefix/extension ต่างกัน จะได้ไม่มีกติกาตั้งชื่อไฟล์สองชุด
 * เช่น report_OR-201_2026-07_exported20260731.pdf
 */
export const buildAdminFileName = (parts: {
  scope?: string
  from?: unknown
  to?: unknown
  month?: string
  prefix?: string
  extension?: string
}): string => {
  const scope = parts.scope ? safeFileToken(parts.scope) : 'all'
  const stamp = `exported${downloadStamp()}`
  const prefix = parts.prefix || 'bookings'
  const ext = parts.extension || 'csv'

  if (parts.month) return `${prefix}_${scope}_${parts.month}_${stamp}.${ext}`

  let start = toCompactDate(parts.from)
  let end = toCompactDate(parts.to)
  if (start && end && start > end) [start, end] = [end, start]

  if (start && end) {
    const range = start === end ? start : `${start}-${end}`
    return `${prefix}_${scope}_${range}_${stamp}.${ext}`
  }
  if (start || end) return `${prefix}_${scope}_${start || end}_${stamp}.${ext}`

  // ไม่ได้กรองวันที่ ไม่ต้องมีคำว่า all ซ้ำสองรอบให้รก
  return `${prefix}_${scope}_${stamp}.${ext}`
}

/**
 * สั่งดาวน์โหลดไฟล์ CSV
 * ใส่ UTF-8 BOM ไว้หน้าสุด ไม่ใส่แล้ว Excel บน Windows จะอ่านภาษาไทยเป็นตัวยึกยือ
 *
 * หมายเหตุ: Excel จะตัดเลข 0 หน้าของ HN (เช่น 00123 → 123) ซึ่งเป็นพฤติกรรมของ Excel เอง
 * แก้ไม่ได้ด้วยการครอบ " แต่ผู้ใช้เลี่ยงได้โดยใช้เมนู Data > From Text/CSV แล้วตั้งคอลัมน์เป็น Text
 */
/** สั่งดาวน์โหลด Blob ใด ๆ (ใช้ร่วมกันทั้ง CSV และ PDF) */
export const downloadBlob = (fileName: string, blob: Blob): void => {
  const url = URL.createObjectURL(blob)

  const link = document.createElement('a')
  link.href = url
  link.download = fileName
  link.style.display = 'none'

  // ต้อง append ลง DOM ก่อน click เพื่อให้ Firefox ยอมดาวน์โหลด
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)

  // ปล่อย memory หลัง browser เริ่มดาวน์โหลดแล้ว
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

export const downloadCsv = (fileName: string, csvText: string): void => {
  downloadBlob(fileName, new Blob([BOM + csvText], { type: 'text/csv;charset=utf-8;' }))
}

export function useCsvExport() {
  return {
    buildBookingsCsv,
    downloadCsv,
    downloadBlob,
    filterOwnBookings,
    filterByDateRange,
    sortForExport,
    sortForAdminExport,
    buildRangeFileName,
    buildSingleFileName,
    buildAdminFileName,
    toDateKey,
    toCompactDate,
    downloadStamp,
    escapeCsvValue,
  }
}