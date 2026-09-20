<template>
    <div class="page-wrapper">
        <div class="card">
            <div v-if="tomorrowCount > 0" class="reminder-banner">
                📢 Reminder: <strong>{{ tomorrowCount }}</strong> surgery case(s) scheduled for tomorrow
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
                            <input type="text" v-model="form.hn" placeholder="HN (7 digits)" class="input-field green-theme"
                                inputmode="numeric" pattern="[0-9]{7}" maxlength="7"
                                @input="form.hn = form.hn.replace(/\D/g, '').slice(0, 7)" @blur="lookupHN" required />
                            <span v-if="hnStatus === 'loading'" class="status-tag">⏳</span>
                            <span v-if="hnStatus === 'found'" class="status-tag" style="color:#2e7d32">✅ Found</span>
                        </div>
                        <input type="text" v-model="form.fullName" placeholder="Full Name"
                            class="input-field green-theme" required />

                        <div class="split-input-row">
                            <input type="number" v-model="form.age" placeholder="Age (years)" min="0" max="120"
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
                    <ProcedureManager @updated="setCustomProcedures" />
                    <div class="grid-2-col">
                        <div style="min-width: 0;">
                            <div class="date-label surgery-field-label">Surgery type <span class="required">*</span></div>
                            <ProcedureSelect v-model="form.procedure" :groups="procedureGroups"
                                :custom-procedures="customProcedures" @change="checkValidDate" />
                            <select v-model="form.room" class="input-field green-theme room-select" @change="checkValidDate" required>
                                <option value="" disabled>Select OR Room</option>
                                <option v-for="n in orRooms" :key="n" :value="`OR-${n}`">OR-{{ n }}</option>
                            </select>
                        </div>

                        <div style="display: flex; flex-direction: column;">

                            <label for="surgery-date" class="date-label surgery-field-label">
                                Surgery date (Gregorian calendar only)
                                <span class="required">*</span>
                            </label>
                            <input id="surgery-date" type="date" v-model="form.date" :min="minDate" :max="maxDate" @blur="checkValidDate"
                                class="input-field green-theme surgery-date-field" :readonly="isDateLocked && !!form.date"
                                :class="{ 'locked-field': isDateLocked && form.date }" required />

                            <span class="date-hint">
                                Example: 25-06-2026
                            </span>

                            <span v-if="isDateLocked && form.date"
                                style="color: #1a3a5f; font-size: 0.8rem; margin-top: 4px; font-weight: 600;">
                                🔒 Date locked by calendar
                            </span>

                            <span v-if="remainingTimeMsg"
                                :style="{ color: isOverCapacity ? '#dc2626' : '#0288d1', fontSize: '0.85rem', marginTop: '6px', fontWeight: '500' }">
                                {{ isOverCapacity ? '⚠️' : '⏳' }} {{ remainingTimeMsg }}
                            </span>
                        </div>

                    </div>
                    <label for="surgery-details" class="surgery-details-label">Additional Surgery Details</label>
                    <textarea id="surgery-details" v-model="form.surgeryDetails" class="input-field green-theme surgery-details-field"
                        placeholder="Enter additional surgery details..." rows="3"></textarea>
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
                    <label class="group-label">Note</label>
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
                    OK
                </button>
            </div>
        </div>
    </Transition>
</template>

<script setup>
import { reactive, ref, onMounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { apiFetch } from '../api/client'
import ProcedureManager from '../components/ProcedureManager.vue'
import ProcedureSelect from '../components/ProcedureSelect.vue'

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
const customProcedures = ref([])

const apiHolidays = ref({})

const showAlert = (message, isSuccess = false) => {
    alertMessage.value = message
    isAlertSuccess.value = isSuccess
    showAlertModal.value = true
}

const form = reactive({
    hn: '', fullName: '', age: '', gender: '', disease: '', diagnosis: '',
    procedure: '', date: '', room: '', surgeryDetails: '', notes: '',
    cxrDate: '', cxrNote: '',
    ecgDate: '', ecgNote: '',
    labDate: '', labNote: '',
    admDate: '', admNote: ''
})

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
    }
])


const setCustomProcedures = (procedures) => {
    customProcedures.value = procedures
}

const today = new Date()
const todayStr = today.toISOString().split('T')[0]
const minDate = ref(todayStr)

const max = new Date()
max.setDate(max.getDate() + 90)
const maxDate = ref(max.toISOString().split('T')[0])

onMounted(async () => {
    const myLicense = localStorage.getItem('userLicense')

    if (bookingId) {
        try {

            const res = await apiFetch(`/api/bookings/${bookingId}`)

            if (res.ok) {
                const booking = await res.json()
                form.hn = booking.hn || ''
                form.fullName = booking.fullName || ''
                form.age = booking.age || ''
                form.gender = booking.gender || ''
                form.disease = booking.underlying || ''
                form.diagnosis = booking.diagnosis || ''
                form.procedure = booking.procedure || ''
                form.date = booking.date || ''
                form.room = booking.room || ''
                form.surgeryDetails = booking.surgeryDetails || ''
                form.notes = booking.notes || ''

                form.cxrDate = booking.cxrDate || ''
                form.cxrNote = booking.cxrNote || ''

                form.ecgDate = booking.ecgDate || ''
                form.ecgNote = booking.ecgNote || ''

                form.labDate = booking.labDate || ''
                form.labNote = booking.labNote || ''

                form.admDate = booking.admDate || ''
                form.admNote = booking.admNote || ''
            } else if (res.status === 403) {
            showAlert('You do not have permission to edit this booking')
                const isAdminReject = localStorage.getItem('userRole') === 'admin'
                setTimeout(() => { router.push(isAdminReject ? '/admin-home' : '/home') }, 1500)
                return
            }
        } catch (err) {
            console.error('โหลดข้อมูลสำหรับแก้ไขไม่สำเร็จ:', err)
        }
    } else if (myLicense) {
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

    if (route.query.date) {
        form.date = route.query.date
        isDateLocked.value = true
    }

    try {
        const tomorrow = new Date()
        tomorrow.setDate(tomorrow.getDate() + 1)
        const tomStr = tomorrow.toISOString().split('T')[0]

        const res = await apiFetch(`/api/schedule?from=${tomStr}&to=${tomStr}`)
        if (res.ok) {
            const data = await res.json()
            tomorrowCount.value = data.length
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
        showAlert(`The selected date is a public holiday: ${apiHolidays.value[dateStr]}. The operating rooms are closed.`)
        form.date = ''
        return false
    }

    const selected = new Date(dateStr)
    const dow = selected.getDay()
    if (dow === 0 || dow === 6) {
        showAlert('The operating rooms are closed on weekends')
        form.date = ''
        return false
    }

    const selectedDateObj = new Date(dateStr)
    const maxDateObj = new Date(maxDate.value)
    if (selectedDateObj > maxDateObj) {
        showAlert(`Bookings cannot be made more than 90 days in advance (available until ${maxDate.value})`)
        form.date = ''
        return false
    }

    return true
}

const checkValidDate = async () => {
    remainingTimeMsg.value = ''
    isOverCapacity.value = false

    if (!form.date) return
    if (form.date.length !== 10) return

    const testDate = new Date(form.date)
    if (isNaN(testDate.getTime())) return

    if (!validateHolidayAndWeekend(form.date)) return

    if (!form.room) {
        remainingTimeMsg.value = ''
        isOverCapacity.value = false
        return
    }

    try {

        const res = await apiFetch(`/api/schedule?from=${form.date}&to=${form.date}`)

        if (res.ok) {
            const dailySchedule = await res.json()

            const sameDayBookings = dailySchedule.filter(
                b =>
                    b.room === form.room &&
                    b.status !== 'Completed' &&
                    b.status !== 'Cancelled' &&
                    String(b.id) !== String(bookingId)
            )

            const usedMinutes = sameDayBookings.reduce((sum, b) => sum + (b.durationMinutes || 0), 0)

            const MAX_MINUTES = 420
            const remainingMinutes = MAX_MINUTES - usedMinutes

            if (remainingMinutes <= 0) {
                const exceededMin = Math.abs(remainingMinutes)
                const exHrs = Math.floor(exceededMin / 60)
                const exMins = exceededMin % 60
                isOverCapacity.value = true
                remainingTimeMsg.value =
                    `Room ${form.room} has exceeded its capacity by ${exHrs}h ` +
                    (exMins > 0 ? `${exMins}m ` : '') +
                    '(you can still continue booking)'
            } else {
                const hrs = Math.floor(remainingMinutes / 60)
                const mins = remainingMinutes % 60

                isOverCapacity.value = false
                remainingTimeMsg.value =
                    `Room ${form.room} has ${hrs}h ` +
                    (mins > 0 ? `${mins}m` : '') + ' remaining'
            }

            if (form.procedure) {
                const matchProc = form.procedure.match(/(\d+)\s*min/)
                const newProcMin = matchProc ? parseInt(matchProc[1]) : 0

                const totalAfterAdd = usedMinutes + newProcMin

                if (totalAfterAdd > MAX_MINUTES) {
                    const overBy = totalAfterAdd - MAX_MINUTES
                    const overHrs = Math.floor(overBy / 60)
                    const overMins = overBy % 60

                    isOverCapacity.value = true
                    remainingTimeMsg.value =
                        `Room ${form.room} on ${form.date} will exceed the ${MAX_MINUTES / 60}-hour limit by ${overHrs}h ` +
                        (overMins > 0 ? `${overMins}m ` : '') +
                        '(you can still continue booking)'
                }
            }
        }
    } catch (e) {
        console.error('เช็กความจุห้องผ่าตัดไม่สำเร็จ', e)
    }
}

const submitForm = async () => {
    if (!/^\d{7}$/.test(form.hn)) {
        showAlert('HN must contain exactly 7 digits')
        return
    }

    if (!form.hn || !form.fullName || !form.age || !form.gender || !form.date || !form.procedure || !form.room) {
        showAlert('Please complete all Patient Information and Surgery Details fields')
        return
    }

    if (!validateHolidayAndWeekend(form.date)) return

    const matchProc = form.procedure.match(/(\d+)\s*min/)
    const durationMinutes = matchProc ? parseInt(matchProc[1]) : 0

    const payload = {
        hn: form.hn,
        fullName: form.fullName,
        age: form.age,
        gender: form.gender || '',
        procedure: form.procedure,
        durationMinutes: durationMinutes,
        date: form.date,
        room: form.room,
        surgeryDetails: form.surgeryDetails || '',
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
            showAlert(bookingId ? 'Booking updated successfully!' : 'Booking created successfully!', true)
            setTimeout(() => {
                const isAdmin = localStorage.getItem('userRole') === 'admin'
                const today = new Date().toISOString().split('T')[0]
                const targetTab = form.date > today ? '?tab=upcoming' : ''
                if (isAdmin) {
                    router.push(`/admin-home${targetTab}`)
                } else {
                    router.push(route.query.restore === 'true' || targetTab ? '/home?tab=upcoming' : '/home')
                }
            }, 1500)
        } else {
            const errData = await res.json().catch(() => ({}))
            showAlert(`Save failed: ${errData.error || 'The server rejected the request'}`)
        }
    } catch (e) {
        console.error(e)
        showAlert('System error. Unable to contact the server')
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

.header-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 25px;
}

.header-spacer {
    width: 40px;
    flex-shrink: 0;
}

.title {
    color: #0f2a47;
    text-align: center;
    font-size: 24px;
    font-family: 'Times New Roman', Times, serif;
    font-weight: bold;
    margin-bottom: 0;
    flex: 1;
    line-height: 1;
}

.back-btn {
    width: 40px;
    height: 40px;
    border-radius: 12px;
    border: none;
    background: #f0f4f8;
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

.room-select {
    margin-top: 10px;
    height: 46px;
    box-sizing: border-box;
}

.surgery-date-field {
    height: 46px;
    min-width: 0;
    padding: 10px 14px;
}

.surgery-field-label {
    display: flex;
    align-items: flex-end;
    gap: 4px;
    min-height: 38px;
    line-height: 19px;
}

.surgery-details-label {
    display: block;
    margin-top: 14px;
    margin-bottom: 6px;
    color: #173b62;
    font-size: 16px;
    font-weight: 700;
}

.surgery-details-field {
    width: 100%;
    min-height: 84px;
    margin-top: 0;
    box-sizing: border-box;
    resize: vertical;
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
