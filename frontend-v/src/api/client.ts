/**
 * API client
 * ------------------------------------------------------------------
 * จุดเดียวที่ยิง API ของระบบ ทุกหน้าต้องเรียกผ่านที่นี่เท่านั้น
 *
 * เหตุผลที่ต้องรวมไว้ที่เดียว: ก่อนหน้านี้ URL ของ worker ถูก hardcode กระจาย 47 จุด
 * ใน 13 ไฟล์ ถ้าปล่อยไว้แบบนั้นแล้วมาแนบ token ทีละจุด จะมีจุดที่ลืมแน่นอน
 * และจุดที่ลืมคือช่องโหว่ที่หาไม่เจอจนกว่าจะมีคนใช้แล้วพัง
 *
 * 🔑 การยืนยันตัวตน
 * ------------------------------------------------------------------
 * backend ตรวจตัวตนจาก JWT ที่เซ็นด้วย secret ของ server เท่านั้น
 * ไม่มีการอ่าน header ที่ client ตั้งเองได้อีกแล้ว (เดิมใช้ x-user-license ซึ่งปลอมได้)
 *
 * ⚠️ token เก็บใน localStorage — เลือกแบบนี้เพราะตอนนี้โปรเจกต์ไม่มีช่องทาง XSS
 *    (ไม่มี v-html, innerHTML, eval หรือไลบรารีที่ render HTML ดิบ)
 *    ถ้าวันหน้าจะเพิ่ม v-html ที่ไหน ต้อง sanitize ก่อนเสมอ ไม่งั้น token ตัวนี้หลุดทันที
 *    ทางที่ปลอดภัยกว่าคือ httpOnly cookie ซึ่งทำได้ตอนที่ frontend กับ backend
 *    อยู่โดเมนเดียวกันแล้ว (ดู rewrite /api ใน vercel.json)
 */

/*
 * หมายเหตุเรื่อง lint: ค่า default ของ generic เป็น any โดยตั้งใจ
 * เพราะหน้าส่วนใหญ่ในโปรเจกต์เป็น <script setup> ที่ไม่ได้ใส่ lang="ts"
 * ถ้าใช้ unknown จะต้องไป cast ที่ทุก call site โดยไม่ได้ความปลอดภัยเพิ่มขึ้นจริง
 * เมื่อไหร่ที่ย้ายหน้าเหล่านั้นไปเป็น TypeScript แล้ว ค่อยเปลี่ยนเป็น unknown
 */
/* eslint-disable @typescript-eslint/no-explicit-any */

/**
 * base URL ของ API
 * ค่าว่าง = ยิงแบบ same-origin ผ่าน rewrite /api ที่ตั้งไว้ใน vercel.json
 * ถ้า rewrite มีปัญหา ให้ตั้ง VITE_API_BASE_URL เป็น URL ของ worker เพื่อยิงตรง
 */
const BASE_URL = (import.meta.env.VITE_API_BASE_URL || '').replace(/\/$/, '')

const TOKEN_KEY = 'authToken'

export const getToken = (): string => localStorage.getItem(TOKEN_KEY) || ''

export const setToken = (token: string): void => {
  localStorage.setItem(TOKEN_KEY, token)
}

/**
 * ล้างข้อมูลเซสชันทั้งหมด
 *
 * ⚠️ userRole และ userLicense ที่เก็บไว้เป็นแค่ข้อมูลสำหรับแสดงผล UI
 *    ห้ามใช้ตัดสินสิทธิ์ เพราะผู้ใช้แก้ค่าใน DevTools ได้
 *    สิทธิ์จริงตัดสินที่ backend จาก payload ใน token เท่านั้น
 */
export const clearSession = (): void => {
  localStorage.removeItem(TOKEN_KEY)
  localStorage.removeItem('isLoggedIn')
  localStorage.removeItem('userRole')
  localStorage.removeItem('userLicense')
  localStorage.removeItem('orNumber')
}

/** ข้อความที่หน้า login อ่านไปแสดงหลังถูกเด้งออกมาเพราะ token หมดอายุ */
export const SESSION_EXPIRED_KEY = 'sessionExpiredMessage'

/**
 * เจอ 401 = token หมดอายุหรือไม่ถูกต้อง ล้าง state แล้วเด้งไปหน้า login
 * ใช้ location.replace เพื่อไม่ให้กด back กลับมาหน้าที่ยิง API ไม่ได้แล้ววนซ้ำ
 */
const handleUnauthorized = (): void => {
  const role = localStorage.getItem('userRole')
  clearSession()

  sessionStorage.setItem(SESSION_EXPIRED_KEY, 'เซสชันหมดอายุ กรุณาเข้าสู่ระบบใหม่')

  const loginPath = role === 'admin' ? '/admin-login' : '/login'
  if (window.location.pathname !== loginPath) {
    window.location.replace(loginPath)
  }
}

/**
 * ยิง API แล้วคืน Response ดิบ ๆ เหมือน fetch ทุกอย่าง ต่างกันแค่
 *   - เติม base URL ให้ (ส่ง path สั้น ๆ เช่น '/api/bookings')
 *   - แนบ Authorization ให้อัตโนมัติ
 *   - เจอ 401 แล้วล้าง state เด้งไปหน้า login ให้
 *
 * มีไว้สำหรับโค้ดเดิมที่เขียนเป็น `const res = await fetch(...); res.ok ? ... : ...`
 * จะได้ย้ายมาใช้ token ได้โดยไม่ต้องรื้อการจัดการ error ของทุกหน้าพร้อมกัน
 * โค้ดที่เขียนใหม่แนะนำให้ใช้ apiGet / apiPost ซึ่งอ่านง่ายกว่า
 */
export async function apiFetch(path: string, options: RequestInit & { skipAuth?: boolean } = {}) {
  const { skipAuth, headers, ...rest } = options
  const finalHeaders = new Headers(headers)

  if (!skipAuth) {
    const token = getToken()
    if (token) finalHeaders.set('Authorization', `Bearer ${token}`)
  }

  const response = await fetch(`${BASE_URL}${path}`, { ...rest, headers: finalHeaders })

  if (response.status === 401 && !skipAuth) handleUnauthorized()

  return response
}

export class ApiError extends Error {
  status: number
  payload: unknown

  constructor(status: number, message: string, payload: unknown) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.payload = payload
  }
}

type ApiOptions = Omit<RequestInit, 'body'> & {
  /** ส่งเป็น object ได้เลย ตัว client แปลงเป็น JSON และใส่ Content-Type ให้ */
  body?: unknown
  /** route สาธารณะ (login, register, otp) ไม่ต้องแนบ token */
  skipAuth?: boolean
}

/**
 * ยิง API พร้อมแนบ token ให้อัตโนมัติ และคืนค่า JSON ที่ parse แล้ว
 * โยน ApiError เมื่อ status ไม่ใช่ 2xx เพื่อให้หน้าที่เรียกใช้ try/catch ได้ที่เดียว
 */
export async function api<T = any>(path: string, options: ApiOptions = {}): Promise<T> {
  const { body, skipAuth, headers, ...rest } = options

  const finalHeaders = new Headers(headers)

  if (body !== undefined && !finalHeaders.has('Content-Type')) {
    finalHeaders.set('Content-Type', 'application/json')
  }

  if (!skipAuth) {
    const token = getToken()
    if (token) finalHeaders.set('Authorization', `Bearer ${token}`)
  }

  const response = await fetch(`${BASE_URL}${path}`, {
    ...rest,
    headers: finalHeaders,
    body: body === undefined ? undefined : JSON.stringify(body),
  })

  // อ่าน body ครั้งเดียวแล้วค่อยตัดสินใจ เพราะ response body อ่านซ้ำไม่ได้
  const text = await response.text()
  let payload: unknown = null
  try {
    payload = text ? JSON.parse(text) : null
  } catch {
    payload = text
  }

  if (response.status === 401 && !skipAuth) {
    handleUnauthorized()
    throw new ApiError(401, 'เซสชันหมดอายุ กรุณาเข้าสู่ระบบใหม่', payload)
  }

  if (!response.ok) {
    const errorBody = payload as { error?: string; message?: string } | null
    const message =
      errorBody?.error || errorBody?.message || `เรียก API ไม่สำเร็จ (${response.status})`
    throw new ApiError(response.status, message, payload)
  }

  return payload as T
}

export const apiGet = <T = any>(path: string, options: ApiOptions = {}) =>
  api<T>(path, { ...options, method: 'GET' })

export const apiPost = <T = any>(path: string, body?: unknown, options: ApiOptions = {}) =>
  api<T>(path, { ...options, method: 'POST', body })

export const apiPut = <T = any>(path: string, body?: unknown, options: ApiOptions = {}) =>
  api<T>(path, { ...options, method: 'PUT', body })

export const apiPatch = <T = any>(path: string, body?: unknown, options: ApiOptions = {}) =>
  api<T>(path, { ...options, method: 'PATCH', body })

export const apiDelete = <T = any>(path: string, options: ApiOptions = {}) =>
  api<T>(path, { ...options, method: 'DELETE' })
