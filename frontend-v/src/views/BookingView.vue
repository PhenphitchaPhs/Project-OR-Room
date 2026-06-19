<template>
    <div class="page-wrapper">
        <button type="button" class="back-btn" @click="goHome">
            <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none"
                stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">
                <polyline points="15 18 9 12 15 6" />
            </svg>
        </button>

        <div class="card">
            <div v-if="tomorrowCount > 0" class="reminder-banner">
                📢 Reminder: พรุ่งนี้มีนัดผ่าตัดทั้งหมด <strong>{{ tomorrowCount }}</strong> เคส
            </div>

            <h1 class="title">Scheduling a surgery</h1>

            <form @submit.prevent="submitForm">
                <div class="section-group">
                    <label class="group-label">Patient Information</label>
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
                    </div>
                </div>

                <div class="section-group">
                    <label class="group-label">Surgery Details</label>
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
                            <input type="date" v-model="form.date" :min="minDate" :max="maxDate" @change="checkValidDate"
                                class="input-field green-theme" :readonly="isDateLocked && !!form.date" :class="{ 'locked-field': isDateLocked && form.date }" required />
                            <span v-if="isDateLocked && form.date" style="color: #1a3a5f; font-size: 0.8rem; margin-top: 4px; font-weight: 600;">
                                🔒 ล็อควันที่จากปฏิทินแล้ว
                            </span>
                            <span v-if="remainingTimeMsg" style="color: #0288d1; font-size: 0.85rem; margin-top: 6px; font-weight: 500;">
                                ⏳ {{ remainingTimeMsg }}
                            </span>
                        </div>
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
                <div class="alert-icon">✔️</div>
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

const router = useRouter()
const route = useRoute()
const tomorrowCount = ref(0)
const hnStatus = ref('')
const showAlertModal = ref(false)
const alertMessage = ref('')
const remainingTimeMsg = ref('')
const isDateLocked = ref(false)

const apiHolidays = ref({})

const showAlert = (message) => {
    alertMessage.value = message
    showAlertModal.value = true
}

const form = reactive({
    hn: '', fullName: '', age: '', gender: '', disease: '',
    procedure: '', date: '', notes: '',
    cxrDate: '', cxrNote: '',
    ecgDate: '', ecgNote: '',
    labDate: '', labNote: '',
    admDate: '', admNote: ''
})

const procedureGroups = ref([
    {
        label: "ศัลยกรรมทั่วไป (General Surgery)",
        options: [
            { name: "Appendectomy (ผ่าตัดไส้ติ่ง) - 60 mins" },
            { name: "Laparoscopic Cholecystectomy / LC (ผ่าตัดนิ่วในถุงน้ำดี) - 120 mins" },
            { name: "Herniorrhaphy (ผ่าตัดไส้เลื่อน) - 90 mins" },
            { name: "Thyroidectomy (ผ่าตัดต่อมไทรอยด์) - 120 mins" },
            { name: "Modified Radical Mastectomy / MRM (ผ่าตัดมะเร็งเต้านม) - 120 mins" },
            { name: "Hemorrhoidectomy (ผ่าตัดริดสีดวง) - 45 mins" },
            { name: "Exploratory Laparotomy (ผ่าตัดเปิดช่องท้อง) - 180 mins" }
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
    // 📍 ถ้ามาจากการกดวันที่ในหน้าปฏิทิน ให้ล็อควันที่นั้นไว้ ห้ามแก้
    if (route.query.date) {
        form.date = route.query.date
        isDateLocked.value = true
    }

    try {
        const tomorrow = new Date()
        tomorrow.setDate(tomorrow.getDate() + 1)
        const tomStr = tomorrow.toISOString().split('T')[0]
        const res = await fetch('https://or-room-backend.rockzee2018.workers.dev/api/bookings')
        if (res.ok) {
            const data = await res.json()
            tomorrowCount.value = data.filter(b => b.date === tomStr).length
        }
    } catch (e) { console.error("Reminder failed", e) }

    try {
        const holidayRes = await fetch('https://or-room-backend.rockzee2018.workers.dev/api/holidays')
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

    // 📍 เช็คความจุห้องผ่าตัด/แสดงเวลาที่เหลือของวันที่ถูกล็อคมาจากปฏิทิน
    if (isDateLocked.value) {
        await checkValidDate()
    }
})

const lookupHN = async () => {
    if (form.hn.length < 3) return
    hnStatus.value = 'loading'
    try {
        const res = await fetch(`https://or-room-backend.rockzee2018.workers.dev/api/patients/${form.hn}`)
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
    if (!form.date) return

    if (!validateHolidayAndWeekend(form.date)) return

    const selected = new Date(form.date)
    const dow = selected.getDay()

    const license = localStorage.getItem('userLicense')
    if (license) {
        const dayMap = { 'Monday': 1, 'Tuesday': 2, 'Wednesday': 3, 'Thursday': 4, 'Friday': 5 }
        try {
            const res = await fetch(`https://or-room-backend.rockzee2018.workers.dev/api/users/${license}`)
            const userData = await res.json()
            const workingDay = userData.day

            if (workingDay && dayMap[workingDay] !== dow) {
                showAlert(`คุณสามารถจองคิวได้เฉพาะวัน ${workingDay} ซึ่งเป็นวันทำงานของคุณเท่านั้นครับ`)
                form.date = ''
                return
            }
        } catch (e) { console.error('เช็กวันทำงานไม่สำเร็จ', e) }
    }

    try {
        const res = await fetch('https://or-room-backend.rockzee2018.workers.dev/api/bookings')
        const allBookings = await res.json()

        const sameDayBookings = allBookings.filter(b => b.date === form.date && b.status !== 'Succeed' && b.status !== 'Cancelled')

        const usedMinutes = sameDayBookings.reduce((sum, b) => {
            const match = b.procedure?.match(/(\d+)\s*min/)
            return sum + (match ? parseInt(match[1]) : 0)
        }, 0)

        const MAX_MINUTES = 360 
        const remainingMinutes = MAX_MINUTES - usedMinutes

        if (remainingMinutes <= 0) {
            remainingTimeMsg.value = 'คิวเต็มแล้วครับ (0 ชม.)'
        } else {
            const hrs = Math.floor(remainingMinutes / 60)
            const mins = remainingMinutes % 60
            remainingTimeMsg.value = `เหลือเวลาว่างอีก ${hrs} ชม. ${mins > 0 ? mins + ' นาที' : ''}`
        }

        if (form.procedure) {
            const matchProc = form.procedure.match(/(\d+)\s*min/)
            const newProcMin = matchProc ? parseInt(matchProc[1]) : 0

            if (usedMinutes + newProcMin > MAX_MINUTES) {
                showAlert(`วันที่ ${form.date} คิวเต็มแล้วครับ\nเหลือเวลา ${remainingMinutes} นาที แต่หัตถการนี้ใช้ ${newProcMin} นาที\nกรุณาเลือกวันอื่นครับ`)
                form.date = ''
                remainingTimeMsg.value = ''
            }
        }
    } catch (e) { console.error('เช็กความจุห้องผ่าตัดไม่สำเร็จ', e) }
}

const submitForm = async () => {
    // 🛠️ เอา !form.disease ออกจากเงื่อนไขเพื่อให้ข้ามการตรวจความว่างไปได้
    if (!form.hn || !form.fullName || !form.age || !form.gender || !form.date || !form.procedure) {
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
        underlying: form.disease || '', // ส่งเป็น String ว่างถ้าไม่ได้กรอก
        notes: form.notes,
        cxrDate: form.cxrDate, cxrNote: form.cxrNote,
        ecgDate: form.ecgDate, ecgNote: form.ecgNote,
        labDate: form.labDate, labNote: form.labNote,
        admDate: form.admDate, admNote: form.admNote,
        dob: null,
        urgency: 'Normal',
        isNpoRisk: false,
        isInfected: false,
        doctorLicense: localStorage.getItem('userLicense')
    }

    try {
        const res = await fetch('https://or-room-backend.rockzee2018.workers.dev/api/bookings', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        })

        if (res.ok) {
            showAlert('จองคิวสำเร็จ!')
            setTimeout(() => {
                router.push('/home')
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

const goHome = () => router.push('/home')
</script>

<style scoped>
/* ส่วนของ CSS สไตล์คงเดิมเหมือนต้นฉบับทั้งหมด */
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
    position: relative;
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

.title {
    color: #0f2a47;
    text-align: center;
    font-size: 22px;
    margin-bottom: 25px;
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

.back-btn {
    position: absolute;
    top: 20px;
    left: 20px;
    width: 35px;
    height: 35px;
    border-radius: 50%;
    border: none;
    background: #f0f4f8;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
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
</style>