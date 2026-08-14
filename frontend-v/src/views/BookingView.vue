<template>
    <div class="page-wrapper">
        <div class="card">
            <div v-if="tomorrowCount > 0" class="reminder-banner">
                📢 Reminder: พรุ่งนี้มีนัดผ่าตัดทั้งหมด <strong>{{ tomorrowCount }}</strong> เคส
            </div>

            <div class="header-row">
                <button type="button" class="back-btn" @click="goHome">
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none"
                        stroke="#0f2a47" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round">
                        <polyline points="15 18 9 12 15 6" />
                    </svg>
                </button>
                <h1 class="title">ORchestrator</h1>
                <div class="header-spacer"></div>
            </div>

            <form @submit.prevent="submitForm">
                <div class="section-group">
                    <label class="group-label">
                        Patient Information
                        <span class="required">*</span>
                    </label>
                    <div class="grid-2-col">
                        <div style="position: relative;">
                            <input type="text" v-model="form.hn" placeholder="HN" class="input-field green-theme"
                                @blur="lookupHN" required />
                            <span v-if="hnStatus === 'loading'" class="status-tag">⏳</span>
                            <span v-if="hnStatus === 'found'" class="status-tag" style="color:#2e7d32">✅ Found</span>
                        </div>
                        <input type="text" v-model="form.fullName" placeholder="Full Name"
                            class="input-field green-theme" required />

                        <div class="split-input-row">
                            <input type="number" v-model="form.age" placeholder="Age (ปี)" min="0" max="120"
                                class="input-field green-theme" required />
                            <select v-model="form.gender" class="input-field green-theme" required>
                                <option value="" disabled>Gender</option>
                                <option value="male">Male</option>
                                <option value="female">Female</option>
                            </select>
                        </div>
                        <textarea v-model="form.disease" placeholder="Underlying Disease(s)"
                            class="input-field green-theme" rows="1"></textarea>
                        <textarea v-model="form.diagnosis" placeholder="Diagnosis"
                            class="input-field green-theme" rows="1"></textarea>
                    </div>
                </div>

                <div class="section-group">
                    <label class="group-label">
                        Surgery Details
                        <span class="required">*</span>
                    </label>
                    <div class="grid-2-col">
                        <select v-model="form.procedure" class="input-field green-theme" @change="checkValidDate"
                            required>
                            <option value="" disabled>Select Procedure</option>
                            <optgroup v-for="group in procedureGroups" :key="group.label" :label="group.label">
                                <option v-for="proc in group.options" :key="proc.name" :value="proc.name">
                                    {{ proc.name }}
                                </option>
                            </optgroup>
                        </select>

                        <div style="display: flex; flex-direction: column;">
                            <label class="date-label">
                                📅 วันที่ผ่าตัด (กรุณากรอกเป็น ค.ศ. เท่านั้น)
                                <span class="required">*</span>
                            </label>

                            <input type="date" v-model="form.date" :min="minDate" :max="maxDate" @blur="checkValidDate"
                                class="input-field green-theme" :readonly="isDateLocked && !!form.date"
                                :class="{ 'locked-field': isDateLocked && form.date }" required />

                            <span class="date-hint">
                                ตัวอย่าง: 25-06-2026
                            </span>

                            <span v-if="isDateLocked && form.date"
                                style="color: #1a3a5f; font-size: 0.8rem; margin-top: 4px; font-weight: 600;">
                                🔒 ล็อควันที่จากปฏิทินแล้ว
                            </span>

                            <span v-if="remainingTimeMsg"
                                :style="{ color: isOverCapacity ? '#dc2626' : '#0288d1', fontSize: '0.85rem', marginTop: '6px', fontWeight: '500' }">
                                {{ isOverCapacity ? '⚠️' : '⏳' }} {{ remainingTimeMsg }}
                            </span>
                        </div>

                        <select v-model="form.room" class="input-field green-theme" @change="checkValidDate" required>
                            <option value="" disabled>Select OR Room</option>
                            <option v-for="n in orRooms" :key="n" :value="`OR-${n}`">OR-{{ n }}</option>
                        </select>
                    </div>
                </div>

                <div class="section-group">
                    <label class="group-label">Pre-operative & Admission Notes</label>
                    <div class="notes-grid">
                        <div class="note-item">
                            <span class="mini-label">CXR (Date & Note)</span>
                            <div class="date-note-row">
                                <input type="date" v-model="form.cxrDate" class="input-field date-input" />
                                <input type="text" v-model="form.cxrNote" placeholder="CXR result / finding"
                                    class="input-field" />
                            </div>
                        </div>
                        <div class="note-item">
                            <span class="mini-label">ECG (Date & Note)</span>
                            <div class="date-note-row">
                                <input type="date" v-model="form.ecgDate" class="input-field date-input" />
                                <input type="text" v-model="form.ecgNote" placeholder="ECG result / rhythm"
                                    class="input-field" />
                            </div>
                        </div>
                        <div class="note-item">
                            <span class="mini-label">Lab (Date & Note)</span>
                            <div class="date-note-row">
                                <input type="date" v-model="form.labDate" class="input-field date-input" />
                                <input type="text" v-model="form.labNote" placeholder="Lab results (Hb, Plt, etc.)"
                                    class="input-field" />
                            </div>
                        </div>
                        <div class="note-item highlight-note">
                            <span class="mini-label">Admission (Date & Note)</span>
                            <div class="date-note-row">
                                <input type="date" v-model="form.admDate" class="input-field date-input" />
                                <input type="text" v-model="form.admNote" placeholder="Admission plan / ward"
                                    class="input-field" />
                            </div>
                        </div>
                    </div>
                </div>

                <div class="section-group">
                    <label class="group-label">Other Remarks</label>
                    <textarea v-model="form.notes" placeholder="Additional details..."
                        class="input-field blue-theme note-box" rows="2"></textarea>
                </div>

                <div class="btn-area">
                    <button type="submit" class="confirm-btn">Confirm Booking</button>
                </div>
            </form>
        </div>
    </div>
    <Transition name="fade">
        <div v-if="showAlertModal" class="modal-overlay" @click="showAlertModal = false">
            <div class="alert-modal" @click.stop>
                <div class="alert-icon">{{ isAlertSuccess ? '✅' : '❌' }}</div>
                <div class="alert-message">
                    {{ alertMessage }}
                </div>
                <button class="alert-btn" @click="showAlertModal = false">
                    ตกลง
                </button>
            </div>
        </div>
    </Transition>
</template>

<script setup>
import { reactive, ref, onMounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { createRouter, createWebHistory } from 'vue-router'
import { apiFetch } from '../api/client'

const router = useRouter()
const route = useRoute()
const bookingId = route.params.id
const tomorrowCount = ref(0)
const hnStatus = ref('')
const showAlertModal = ref(false)
const alertMessage = ref('')
const isAlertSuccess = ref(false)
const remainingTimeMsg = ref('')
const isOverCapacity = ref(false)
const isDateLocked = ref(false)


const apiHolidays = ref({})

// 📍 ใส่ isSuccess = true เวลาแจ้งความสำเร็จ จะได้โชว์ไอคอน ✅ แทน ❌
const showAlert = (message, isSuccess = false) => {
    alertMessage.value = message
    isAlertSuccess.value = isSuccess
    showAlertModal.value = true
}

const form = reactive({
    hn: '', fullName: '', age: '', gender: '', disease: '', diagnosis: '',
    procedure: '', date: '', room: '', notes: '',
    cxrDate: '', cxrNote: '',
    ecgDate: '', ecgNote: '',
    labDate: '', labNote: '',
    admDate: '', admNote: ''
})

// 📍 เลขห้องผ่าตัด OR-201 ถึง OR-220 ให้เลือกตอนจอง/แก้คิว
const orRooms = Array.from({ length: 20 }, (_, i) => 201 + i)

const procedureGroups = ref([
    {
        label: "ศัลยกรรมทั่วไป (General Surgery)",
        options: [
            { name: "Laparoscopic Cholecystectomy / LC (ผ่าตัดนิ่วในถุงน้ำดี) - 120 mins" },
            { name: "Herniorrhaphy (ผ่าตัดไส้เลื่อน) - 90 mins" }
        ]
    },
    {
        label: "ศัลยกรรมต่อมไร้ท่อ (Endocrine Surgery)",
        options: [
            { name: "Thyroid Lobectomy (ผ่าตัดต่อมไทรอยด์ออกหนึ่งข้าง) - 60 mins" },
            { name: "Total Thyroidectomy (ผ่าตัดต่อมไทรอยด์ออกทั้งหมด) - 120 mins" },
            { name: "Parathyroidectomy (ผ่าตัดต่อมพาราไทรอยด์) - 90 mins" }
        ]
    },
    {
        label: "ศัลยกรรมเต้านม (Breast Surgery)",
        options: [
            { name: "Modified Radical Mastectomy / MRM (ผ่าตัดมะเร็งเต้านม) - 120 mins" },
            { name: "WE SLNB (ผ่าตัดก้อนเต้านมแบบสงวนเต้า ร่วมกับเลาะต่อมน้ำเหลืองเซนติเนล) - 120 mins" },
            { name: "SM SLNB (ผ่าตัดเต้านมออกทั้งเต้า ร่วมกับเลาะต่อมน้ำเหลืองเซนติเนล) - 120 mins" }
        ]
    },
    {
        label: "ศัลยกรรมลำไส้ใหญ่และทวารหนัก (Colorectal Surgery)",
        options: [
            { name: "Colectomy (ผ่าตัดลำไส้ใหญ่) - 120 mins" },
            { name: "LAR APR (ผ่าตัดมะเร็งลำไส้ตรง) - 180 mins" },
            { name: "Hemorrhoidectomy (ผ่าตัดริดสีดวง) - 45 mins" },
            { name: "Fistulotomy (ผ่าตัดเปิดฝีคัณฑสูตร) - 30 mins" }
        ]
    },
    {
        label: "ศัลยกรรมตับ ทางเดินน้ำดี และตับอ่อน (HPB Surgery)",
        options: [
            { name: "Hepatectomy (ผ่าตัดตับ) - 180 mins" },
            { name: "PPPD (ผ่าตัดตับอ่อนและลำไส้เล็กส่วนต้นแบบสงวนกระเพาะอาหาร) - 300 mins" },
            { name: "Hilar Resection (ผ่าตัดมะเร็งท่อน้ำดีบริเวณขั้วตับ) - 300 mins" }
        ]
    },
    {
        label: "ศัลยกรรมหลอดเลือด (Vascular Surgery)",
        options: [
            { name: "AVF (ผ่าตัดสร้างหลอดเลือดสำหรับฟอกไต) - 90 mins" },
            { name: "Venous Ligation (ผ่าตัดผูกหลอดเลือดดำ) - 90 mins" }
        ]
    },
    {
        label: "ส่องกล้อง (Endoscopy)",
        options: [
            { name: "Colonoscopy (ส่องกล้องตรวจลำไส้ใหญ่) - 60 mins" },
            { name: "ERCP (ส่องกล้องตรวจรักษาท่อทางเดินน้ำดีและตับอ่อน) - 60 mins" }
        ]
    },
    {
        label: "สูตินรีเวช (OB/GYN)",
        options: [
            { name: "Cesarean Section / C-Section (ผ่าคลอด) - 60 mins" },
            { name: "Total Abdominal Hysterectomy / TAH (ผ่าตัดมดลูก) - 120 mins" },
            { name: "Tubal Resection / TR (ทำหมันหญิง) - 30 mins" }
        ]
    },
    {
        label: "กระดูกและข้อ (Orthopedics)",
        options: [
            { name: "Total Knee Arthroplasty / TKA (ผ่าตัดเปลี่ยนผิวข้อเข่า) - 180 mins" },
            { name: "Total Hip Arthroplasty / THA (ผ่าตัดเปลี่ยนข้อสะโพก) - 180 mins" },
            { name: "ORIF (ผ่าตัดใส่เหล็กดามกระดูกหัก) - 120 mins" }
        ]
    },
    {
        label: "เฉพาะทางอื่นๆ (Others)",
        options: [
            { name: "Cataract Surgery (ผ่าตัดต้อกระจก) - 30 mins" },
            { name: "TURP (ผ่าตัดส่องกล้องต่อมลูกหมาก) - 90 mins" },
            { name: "Tonsillectomy (ผ่าตัดทอนซิล) - 45 mins" }
        ]
    }
])

const today = new Date()
const todayStr = today.toISOString().split('T')[0]
const minDate = ref(todayStr)

const max = new Date()
max.setDate(max.getDate() + 90)
const maxDate = ref(max.toISOString().split('T')[0])

onMounted(async () => {
    const myLicense = localStorage.getItem('userLicense')
    // 📍 เช็ค role จาก localStorage — ถ้าเป็น admin ให้ข้ามการตรวจสอบสิทธิ์เจ้าของคิว
    const myRole = localStorage.getItem('userRole')

    // 🌟 ดึงข้อมูลเก่ามาใส่ฟอร์มถ้าเป็นการ Edit (มี bookingId)
    if (bookingId) {
        try {
            const res = await apiFetch('/api/bookings')

            if (res.ok) {
                const allBookings = await res.json()
                const booking = allBookings.find(b => String(b.id) === String(bookingId))

                if (booking) {
                    // 📍 เช็คสิทธิ์: แอดมินแก้ได้ทุกคิว, แพทย์ทั่วไปแก้ได้เฉพาะคิวตัวเอง
                    const isAdmin = myRole === 'admin'
                    if (!isAdmin && booking.doctorLicense !== myLicense) {
                        showAlert('คุณไม่มีสิทธิ์แก้ไขคิวนี้ เพราะไม่ใช่คิวของคุณครับ')
                        const isAdminReject = localStorage.getItem('userRole') === 'admin'
                        setTimeout(() => { router.push(isAdminReject ? '/admin-home' : '/home') }, 1500)
                        return
                    }

                    form.hn = booking.hn || ''
                    form.fullName = booking.fullName || ''
                    form.age = booking.age || ''
                    form.gender = booking.gender || ''
                    form.disease = booking.underlying || ''
                    form.diagnosis = booking.diagnosis || ''
                    form.procedure = booking.procedure || ''
                    form.date = booking.date || ''
                    form.room = booking.room || ''
                    form.notes = booking.notes || ''

                    form.cxrDate = booking.cxrDate || ''
                    form.cxrNote = booking.cxrNote || ''

                    form.ecgDate = booking.ecgDate || ''
                    form.ecgNote = booking.ecgNote || ''

                    form.labDate = booking.labDate || ''
                    form.labNote = booking.labNote || ''

                    form.admDate = booking.admDate || ''
                    form.admNote = booking.admNote || ''
                }
            }
        } catch (err) {
            console.error('โหลดข้อมูลสำหรับแก้ไขไม่สำเร็จ:', err)
        }
    } else if (myLicense) {
        // 📍 ถ้าเป็นการจองใหม่ (ไม่ใช่ edit) ตั้งค่าห้องเริ่มต้นเป็นห้องประจำของแพทย์คนนี้
        try {
            const res = await apiFetch(`/api/users/${myLicense}`)
            if (res.ok) {
                const userData = await res.json()
                if (userData.orNumber) form.room = `OR-${userData.orNumber}`
            }
        } catch (e) {
            console.error('ดึงห้อง OR ประจำไม่สำเร็จ', e)
        }
    }

    // ... (โค้ดดึง route.query.date, tomorrowCount และ apiHolidays คงไว้เหมือนเดิม) ...
    if (route.query.date) {
        form.date = route.query.date
        isDateLocked.value = true
    }

    try {
        const tomorrow = new Date()
        tomorrow.setDate(tomorrow.getDate() + 1)
        const tomStr = tomorrow.toISOString().split('T')[0]
        const res = await apiFetch('/api/bookings')
        if (res.ok) {
            const data = await res.json()
            tomorrowCount.value = data.filter(b => b.date === tomStr).length
        }
    } catch (e) { console.error("Reminder failed", e) }

    try {
        const holidayRes = await apiFetch('/api/holidays')
        if (holidayRes.ok) {
            const holidayData = await holidayRes.json()
            if (holidayData.items) {
                holidayData.items.forEach(item => {
                    if (item.start && item.start.date) {
                        apiHolidays.value[item.start.date] = item.summary
                    }
                })
            }
        }
    } catch (e) { console.error("ดึงวันหยุดล้มเหลว", e) }

    if (isDateLocked.value) {
        await checkValidDate()
    }
})

const lookupHN = async () => {
    if (form.hn.length < 3) return
    hnStatus.value = 'loading'
    try {
        const res = await apiFetch(`/api/patients/${form.hn}`)
        if (res.ok) {
            const p = await res.json()
            form.fullName = p.fullName; form.gender = p.gender; form.disease = p.underlying || ''
            hnStatus.value = 'found'
        } else { hnStatus.value = 'notfound' }
    } catch (e) { hnStatus.value = 'notfound' }
}

const validateHolidayAndWeekend = (dateStr) => {
    if (!dateStr) return true

    const yearPart = parseInt(dateStr.split('-')[0])
    const currentYear = new Date().getFullYear()
    const normalizedYear = yearPart > 2400 ? yearPart - 543 : yearPart
    if (!normalizedYear || normalizedYear < currentYear - 1 || normalizedYear > currentYear + 5) return true

    if (apiHolidays.value[dateStr]) {
        showAlert(`วันที่เลือกเป็นวันหยุดราชการ : ${apiHolidays.value[dateStr]} ห้องผ่าตัดปิดให้บริการครับ`)
        form.date = ''
        return false
    }

    const selected = new Date(dateStr)
    const dow = selected.getDay()
    if (dow === 0 || dow === 6) {
        showAlert('วันเสาร์-อาทิตย์ ห้องผ่าตัดปิดให้บริการครับ')
        form.date = ''
        return false
    }

    const selectedDateObj = new Date(dateStr)
    const maxDateObj = new Date(maxDate.value)
    if (selectedDateObj > maxDateObj) {
        showAlert(`ไม่สามารถจองคิวล่วงหน้าเกิน 90 วันได้ครับ (จองได้ถึง ${maxDate.value})`)
        form.date = ''
        return false
    }

    return true
}

const checkValidDate = async () => {
    remainingTimeMsg.value = ''
    isOverCapacity.value = false

    if (!form.date) return

    // รอให้กรอกวันที่ให้ครบก่อน
    if (form.date.length !== 10) return

    const testDate = new Date(form.date)

    // ป้องกันวันที่ไม่สมบูรณ์
    if (isNaN(testDate.getTime())) return

    if (!validateHolidayAndWeekend(form.date)) return

    // 📍 ไม่ต้องเช็ค "วันทำงาน" ของแพทย์อีกแล้ว เพราะระบบเปลี่ยนจากเลือกวันทำงานเป็นเลือกห้อง OR ประจำแทน

    // ยังไม่ได้เลือกห้อง รอให้เลือกก่อนค่อยเช็คความจุ
    if (!form.room) {
        remainingTimeMsg.value = ''
        isOverCapacity.value = false
        return
    }

    try {
        const res = await apiFetch(
            '/api/bookings'
        )

        const allBookings = await res.json()

        // 📍 เช็คความจุของ "ห้องที่เลือก" เท่านั้น ไม่รวมห้องอื่น และไม่นับคิวตัวเองตอนแก้ไข (กันนับซ้ำ)
        const sameDayBookings = allBookings.filter(
            b =>
                b.date === form.date &&
                b.room === form.room &&
                b.status !== 'Succeed' &&
                b.status !== 'Cancelled' &&
                String(b.id) !== String(bookingId)
        )

        const usedMinutes = sameDayBookings.reduce((sum, b) => {
            const match = b.procedure?.match(/(\d+)\s*min/)
            return sum + (match ? parseInt(match[1]) : 0)
        }, 0)

        // 📍 เปลี่ยนเป็น 420 นาที (7 ชม.) ให้ตรงกับมาตรฐานเดียวกับหน้า Home
        const MAX_MINUTES = 420
        const remainingMinutes = MAX_MINUTES - usedMinutes

        if (remainingMinutes <= 0) {
            const exceededMin = Math.abs(remainingMinutes)
            const exHrs = Math.floor(exceededMin / 60)
            const exMins = exceededMin % 60
            isOverCapacity.value = true
            remainingTimeMsg.value =
                `ห้อง ${form.room} เกินเวลาที่กำหนดแล้ว ${exHrs} ชม. ` +
                (exMins > 0 ? `${exMins} นาที ` : '') +
                '(ยังสามารถจองต่อได้)'
        } else {
            const hrs = Math.floor(remainingMinutes / 60)
            const mins = remainingMinutes % 60

            isOverCapacity.value = false
            remainingTimeMsg.value =
                `ห้อง ${form.room} เหลือเวลาว่างอีก ${hrs} ชม. ` +
                (mins > 0 ? `${mins} นาที` : '')
        }

        // 📍 ไม่บล็อกการจองอีกต่อไป แม้เวลารวมจะเกิน MAX_MINUTES ก็ยังจองได้
        // แค่อัปเดตข้อความให้รู้ว่าจะเกินไปเท่าไหร่ (เหมือนพฤติกรรมบาร์เวลาในหน้า Home)
        if (form.procedure) {
            const matchProc = form.procedure.match(/(\d+)\s*min/)
            const newProcMin = matchProc
                ? parseInt(matchProc[1])
                : 0

            const totalAfterAdd = usedMinutes + newProcMin

            if (totalAfterAdd > MAX_MINUTES) {
                const overBy = totalAfterAdd - MAX_MINUTES
                const overHrs = Math.floor(overBy / 60)
                const overMins = overBy % 60

                isOverCapacity.value = true
                remainingTimeMsg.value =
                    `ห้อง ${form.room} วันที่ ${form.date} เวลารวมจะเกิน ${MAX_MINUTES / 60} ชม. ไป ${overHrs} ชม. ` +
                    (overMins > 0 ? `${overMins} นาที ` : '') +
                    '(ยังสามารถจองต่อได้)'
            }
        }
    } catch (e) {
        console.error('เช็กความจุห้องผ่าตัดไม่สำเร็จ', e)
    }
}

const submitForm = async () => {
    if (!form.hn || !form.fullName || !form.age || !form.gender || !form.date || !form.procedure || !form.room) {
        showAlert('กรุณากรอกข้อมูล Patient Information และ Surgery Details ให้ครบถ้วนทุกช่องครับ')
        return
    }

    if (!validateHolidayAndWeekend(form.date)) return

    const payload = {
        hn: form.hn,
        fullName: form.fullName,
        age: form.age,
        gender: form.gender || '',
        procedure: form.procedure,
        date: form.date,
        room: form.room,
        underlying: form.disease || '',
        diagnosis: form.diagnosis || '',
        notes: form.notes,
        cxrDate: form.cxrDate, cxrNote: form.cxrNote,
        ecgDate: form.ecgDate, ecgNote: form.ecgNote,
        labDate: form.labDate, labNote: form.labNote,
        admDate: form.admDate, admNote: form.admNote,
        dob: null,
        doctorLicense: localStorage.getItem('userLicense')
    }

    try {
        // 🌟 แยก URL และ Method ให้ถูกต้อง
        const url = bookingId
            ? `/api/bookings/${bookingId}`
            : '/api/bookings'

        const method = bookingId ? 'PUT' : 'POST'

        const res = await apiFetch(url, {
            method: method,
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(payload)
        })

        if (res.ok) {
            showAlert(bookingId ? 'อัปเดตคิวสำเร็จ!' : 'จองคิวสำเร็จ!', true)
            setTimeout(() => {
                // 📍 แอดมินกลับหน้า Admin Home, แพทย์ทั่วไปกลับหน้า Home
                const isAdmin = localStorage.getItem('userRole') === 'admin'
                if (isAdmin) {
                    router.push('/admin-home')
                } else {
                    router.push(route.query.restore === 'true' ? '/home?tab=upcoming' : '/home')
                }
            }, 1500)
        } else {
            const errData = await res.json().catch(() => ({}))
            showAlert(`บันทึกไม่สำเร็จ: ${errData.error || 'เซิร์ฟเวอร์ปฏิเสธการรับข้อมูล'}`)
        }
    } catch (e) {
        console.error(e)
        showAlert('ระบบขัดข้อง ไม่สามารถติดต่อเซิร์ฟเวอร์ได้')
    }
}

const goHome = () => {
    const isAdmin = localStorage.getItem('userRole') === 'admin'
    router.push(isAdmin ? '/admin-home' : '/home')
}
</script>

<style scoped>
.page-wrapper {
    display: flex;
    justify-content: center;
    padding: 20px;
    min-height: 100vh;
    background: linear-gradient(135deg, #0f2a47, #1e3a5f);
}

.card {
    background: #fff;
    width: 100%;
    max-width: 700px;
    padding: 30px;
    border-radius: 16px;
    box-shadow: 0 10px 30px rgba(0, 0, 0, 0.2);
}

.reminder-banner {
    background: #fff3cd;
    color: #856404;
    padding: 12px;
    border-radius: 10px;
    margin-bottom: 20px;
    border-left: 5px solid #ffc107;
    font-size: 14px;
}

/* ---------------------------------
   ส่วน Header และ Back Button ฉบับแก้ให้ตรงรูป
   --------------------------------- */
.header-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 25px;
}

.header-spacer {
    width: 40px;
    /* ขยายความกว้างให้สมดุลกับปุ่ม */
    flex-shrink: 0;
}

.title {
    color: #0f2a47;
    text-align: center;
    font-size: 24px;
    font-family: 'Times New Roman', Times, serif;
    /* เพิ่มฟอนต์มีหัวให้เหมือนในรูปเป๊ะ */
    font-weight: bold;
    margin-bottom: 0;
    flex: 1;
    line-height: 1;
}

.back-btn {
    width: 40px;
    /* ปรับขนาดความกว้างปุ่ม */
    height: 40px;
    /* ปรับขนาดความสูงปุ่มให้รับกับตัวอักษร */
    border-radius: 12px;
    /* เปลี่ยนจากวงกลม 50% เป็นสี่เหลี่ยมขอบมนแบบในรูป */
    border: none;
    background: #f0f4f8;
    /* สีพื้นหลังเทาอมฟ้า */
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
    transition: background-color 0.2s;
}

.back-btn:hover {
    background-color: #e2e8f0;
}

/* --------------------------------- */

.notes-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 16px;
}

.note-item {
    display: flex;
    flex-direction: column;
    gap: 6px;
}

.mini-label {
    font-size: 11px;
    font-weight: 700;
    color: #666;
    margin-left: 5px;
}

.highlight-note {
    grid-column: span 2;
    background: #f0f7ff;
    padding: 12px;
    border-radius: 8px;
}

.date-note-row {
    display: flex;
    gap: 8px;
}

.date-input {
    max-width: 130px;
}

.input-field {
    width: 100%;
    padding: 10px;
    border-radius: 10px;
    border: 1px solid #d6e2f1;
    background: #f4f8fd;
    font-size: 14px;
    box-sizing: border-box;
}

.locked-field {
    background: #e8f0fe;
    border-color: #1a3a5f;
    color: #1a3a5f;
    font-weight: 600;
    cursor: not-allowed;
}

.grid-2-col {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 15px;
}

.split-input-row {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 12px;
    margin-top: 15px;
}

.confirm-btn {
    width: 100%;
    padding: 15px;
    background: #1e3a5f;
    color: white;
    border: none;
    border-radius: 12px;
    font-weight: 700;
    cursor: pointer;
    margin-top: 20px;
}

@media (max-width: 600px) {
    .notes-grid {
        grid-template-columns: 1fr;
    }

    .highlight-note {
        grid-column: span 1;
    }

    .grid-2-col {
        grid-template-columns: 1fr;
    }

    .date-note-row {
        flex-direction: column;
    }

    .date-input {
        max-width: 100%;
    }
}

.section-group {
    margin-top: 32px;
}

.section-group:first-child {
    margin-top: 0;
}

.group-label {
    display: block;
    font-size: 16px;
    font-weight: 700;
    color: #1e3a5f;
    margin-bottom: 12px;
    border-bottom: 2px solid #f0f4f8;
    padding-bottom: 6px;
}

.status-tag {
    position: absolute;
    right: 10px;
    top: 10px;
    font-size: 12px;
}

.modal-overlay {
    position: fixed;
    inset: 0;
    background: rgba(0, 0, 0, .45);
    display: flex;
    justify-content: center;
    align-items: center;
    z-index: 9999;
    padding: 20px;
}

.alert-modal {
    width: 100%;
    max-width: 350px;
    background: white;
    border-radius: 16px;
    padding: 24px;
    text-align: center;
    animation: pop .2s ease;
}

.alert-icon {
    font-size: 40px;
    margin-bottom: 12px;
}

.alert-message {
    font-size: 15px;
    line-height: 1.6;
    color: #333;
    margin-bottom: 20px;
}

.alert-btn {
    width: 100%;
    border: none;
    border-radius: 12px;
    padding: 12px;
    background: #1e3a5f;
    color: white;
    font-weight: 600;
    cursor: pointer;
}

@keyframes pop {
    from {
        transform: scale(.9);
        opacity: 0;
    }

    to {
        transform: scale(1);
        opacity: 1;
    }
}

.date-label {
    font-size: 13px;
    font-weight: 700;
    color: #1e3a5f;
    margin-bottom: 6px;
}

.date-hint {
    margin-top: 5px;
    padding: 6px 10px;
    background: #fff3cd;
    color: #856404;
    border-radius: 8px;
    font-size: 12px;
    font-weight: 600;
}

.required {
    color: #dc2626;
    font-weight: 700;
    margin-left: 4px;
}

</style>