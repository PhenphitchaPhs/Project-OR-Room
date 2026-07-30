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

const genderLabel = (value: unknown): string => {
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

const statusLabel = (value: unknown): string => {
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

/** คอลัมน์ใน CSV — ยึดตามช่องที่กรอกได้จริงในหน้าจอง (BookingView.vue) */
const CSV_COLUMNS: { header: string; value: (row: ExportRow, index: number) => string }[] = [
  { header: 'ลำดับคิว', value: (row, index) => String(row.__queueNo ?? index + 1) },
  { header: 'HN', value: (row) => dash(row.hn) },
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
 * escape ค่าตาม RFC 4180
 * ครอบด้วย " เมื่อค่ามี , หรือ " หรือขึ้นบรรทัดใหม่ และแปลง " ข้างในเป็น ""
 */
export const escapeCsvValue = (value: unknown): string => {
  const text = value === null || value === undefined ? '' : String(value)
  if (/[",\r\n]/.test(text)) return `"${text.replace(/"/g, '""')}"`
  return text
}

/** แปลงรายการจองเป็นข้อความ CSV (ยังไม่ใส่ BOM — ใส่ตอนสร้างไฟล์) */
export const buildBookingsCsv = (rows: Booking[]): string => {
  const prepared = sortForExport(rows)

  const headerLine = CSV_COLUMNS.map((column) => escapeCsvValue(column.header)).join(',')

  const bodyLines = prepared.map((row, index) =>
    CSV_COLUMNS.map((column) => escapeCsvValue(column.value(row, index))).join(','),
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

/** bookings_{license}_{YYYYMMDD}-{YYYYMMDD}.csv */
export const buildRangeFileName = (license: unknown, from: unknown, to: unknown): string => {
  let start = toCompactDate(from)
  let end = toCompactDate(to)
  if (start && end && start > end) [start, end] = [end, start]

  const range = start && end ? `${start}-${end}` : start || end || 'all'
  return `bookings_${safeFileToken(license)}_${range}.csv`
}

/** booking_{HN}_{YYYYMMDD}.csv */
export const buildSingleFileName = (hn: unknown, date: unknown): string =>
  `booking_${safeFileToken(hn)}_${toCompactDate(date) || 'nodate'}.csv`

/**
 * สั่งดาวน์โหลดไฟล์ CSV
 * ใส่ UTF-8 BOM ไว้หน้าสุด ไม่ใส่แล้ว Excel บน Windows จะอ่านภาษาไทยเป็นตัวยึกยือ
 *
 * หมายเหตุ: Excel จะตัดเลข 0 หน้าของ HN (เช่น 00123 → 123) ซึ่งเป็นพฤติกรรมของ Excel เอง
 * แก้ไม่ได้ด้วยการครอบ " แต่ผู้ใช้เลี่ยงได้โดยใช้เมนู Data > From Text/CSV แล้วตั้งคอลัมน์เป็น Text
 */
export const downloadCsv = (fileName: string, csvText: string): void => {
  const blob = new Blob([BOM + csvText], { type: 'text/csv;charset=utf-8;' })
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

export function useCsvExport() {
  return {
    buildBookingsCsv,
    downloadCsv,
    filterOwnBookings,
    filterByDateRange,
    sortForExport,
    buildRangeFileName,
    buildSingleFileName,
    toDateKey,
    toCompactDate,
    escapeCsvValue,
  }
}