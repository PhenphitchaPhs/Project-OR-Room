

export interface Booking {
  id?: number | string
  hn?: string
  fullName?: string

  dob?: string | null
  age?: number | string
  gender?: string
  procedure?: string
  date?: string
  underlying?: string
  diagnosis?: string
  surgeryDetails?: string
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

  doctorName?: string
  [key: string]: unknown
}

type ExportRow = Booking & { __queueNo?: number }

const BOM = '\uFEFF'
const CRLF = '\r\n'

const dash = (value: unknown): string => {
  const text = value === null || value === undefined ? '' : String(value).trim()
  return text === '' ? '-' : text
}

export const genderLabel = (value: unknown): string => {
  const key = String(value || '').toLowerCase()
  if (key === 'male' || key === 'ชาย') return 'Male'
  if (key === 'female' || key === 'หญิง') return 'Female'
  return '-'
}

const STATUS_LABELS: Record<string, string> = {
  upcoming: 'Upcoming',
  complete: 'Completed',
  completed: 'Completed',
  succeed: 'Completed',
  cancelled: 'Cancelled',
  canceled: 'Cancelled',
}

export const statusLabel = (value: unknown): string => {
  const key = String(value || '').toLowerCase().trim()
  if (!key) return STATUS_LABELS.upcoming
  return STATUS_LABELS[key] || String(value)
}

const pairLabel = (dateValue: unknown, noteValue: unknown): string => {
  const dateText = dash(dateValue)
  const noteText = dash(noteValue)

  if (dateText === '-' && noteText === '-') return '-'
  if (dateText === '-') return noteText
  if (noteText === '-') return dateText
  return `${dateText} / ${noteText}`
}

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

export const toCompactDate = (value: unknown): string => toDateKey(value).replace(/-/g, '')

export const downloadStamp = (now: Date = new Date()): string => {
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}`
}

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

  return sorted.map((row, index) => ({ ...row, __queueNo: index + 1 }))
}

export const filterOwnBookings = (rows: Booking[], license: string): Booking[] => {
  if (!license) return []
  return rows.filter((row) => String(row.doctorLicense || '') === String(license))
}

export const filterByDateRange = (
  rows: Booking[],
  from: unknown,
  to: unknown,
): Booking[] => {
  let start = toDateKey(from)
  let end = toDateKey(to)
  if (!start && !end) return rows

  if (start && end && start > end) [start, end] = [end, start]

  return rows.filter((row) => {
    const dateKey = toDateKey(row.date)
    if (!dateKey) return false
    if (start && dateKey < start) return false
    if (end && dateKey > end) return false
    return true
  })
}

const EXCEL_TEXT_HN = true

const excelSafeText = (value: unknown): string => {
  const text = dash(value)
  if (!EXCEL_TEXT_HN || text === '-') return text

  if (!/^\d+$/.test(text)) return text

  return `="${text}"`
}

export interface CsvOptions {

  includeDoctor?: boolean

  doctorNames?: Record<string, string>
}

type ColumnDef = {
  header: string
  value: (row: ExportRow, index: number, options: CsvOptions) => string
}

const CSV_COLUMNS: ColumnDef[] = [
  { header: 'Queue order', value: (row, index) => String(row.__queueNo ?? index + 1) },
  { header: 'HN', value: (row) => excelSafeText(row.hn) },
  { header: 'Full name', value: (row) => dash(row.fullName) },
  { header: 'Age', value: (row) => dash(row.age) },
  { header: 'Gender', value: (row) => genderLabel(row.gender) },
  { header: 'Underlying condition', value: (row) => dash(row.underlying) },
  { header: 'Diagnosis', value: (row) => dash(row.diagnosis) },
  { header: 'Procedure', value: (row) => dash(row.procedure) },
  { header: 'Additional Surgery Details', value: (row) => dash(row.surgeryDetails) },
  { header: 'Room', value: (row) => dash(row.room) },
  { header: 'Surgery date', value: (row) => dash(toDateKey(row.date)) },

  { header: 'Status', value: (row) => dash(row.status) },
  { header: 'CXR (Date/Notes)', value: (row) => pairLabel(row.cxrDate, row.cxrNote) },
  { header: 'ECG (Date/Notes)', value: (row) => pairLabel(row.ecgDate, row.ecgNote) },
  { header: 'Lab (Date/Notes)', value: (row) => pairLabel(row.labDate, row.labNote) },
  { header: 'Admission (Date/Notes)', value: (row) => pairLabel(row.admDate, row.admNote) },
  { header: 'Notes', value: (row) => dash(row.notes) },
]

const ADMIN_COLUMNS: ColumnDef[] = [
  {
    header: 'Doctor',
    value: (row, _index, options) =>
      dash(options.doctorNames?.[String(row.doctorLicense || '')] || row.doctorName),
  },
  { header: 'Medical license', value: (row) => dash(row.doctorLicense) },
]

export const escapeCsvValue = (value: unknown): string => {
  const text = value === null || value === undefined ? '' : String(value)
  if (/[",\r\n]/.test(text)) return `"${text.replace(/"/g, '""')}"`
  return text
}

export const buildBookingsCsv = (rows: Booking[], options: CsvOptions = {}): string => {
  const prepared = sortForExport(rows)
  const columns = options.includeDoctor ? [...CSV_COLUMNS, ...ADMIN_COLUMNS] : CSV_COLUMNS

  const headerLine = columns.map((column) => escapeCsvValue(column.header)).join(',')

  const bodyLines = prepared.map((row, index) =>
    columns.map((column) => escapeCsvValue(column.value(row, index, options))).join(','),
  )

  return [headerLine, ...bodyLines].join(CRLF)
}

const safeFileToken = (value: unknown): string =>
  String(value ?? '')
    .trim()
    .replace(/[\\/:*?"<>|\s]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '') || 'unknown'

export const buildRangeFileName = (license: unknown, from: unknown, to: unknown): string => {
  let start = toCompactDate(from)
  let end = toCompactDate(to)
  if (start && end && start > end) [start, end] = [end, start]

  const range = start && end
    ? (start === end ? start : `${start}-${end}`)
    : start || end || 'all'

  return `bookings_${safeFileToken(license)}_${range}_exported${downloadStamp()}.csv`
}

export const buildSingleFileName = (hn: unknown, date: unknown): string =>
  `booking_${safeFileToken(hn)}_${toCompactDate(date) || 'nodate'}_exported${downloadStamp()}.csv`

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

  return `${prefix}_${scope}_${stamp}.${ext}`
}

export const downloadBlob = (fileName: string, blob: Blob): void => {
  const url = URL.createObjectURL(blob)

  const link = document.createElement('a')
  link.href = url
  link.download = fileName
  link.style.display = 'none'

  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)

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

    buildRangeFileName,
    buildSingleFileName,
    buildAdminFileName,
    toDateKey,
    toCompactDate,
    downloadStamp,
    escapeCsvValue,
  }
}
