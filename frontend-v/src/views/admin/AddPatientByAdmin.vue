<template>
    <div class="page-wrapper">
        <div class="card">
            <div class="header-row">
                <button type="button" class="back-btn" @click="goHome">
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none"
                        stroke="#0f2a47" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round">
                        <polyline points="15 18 9 12 15 6" />
                    </svg>
                </button>
                <h1 class="title">เพิ่มคิวผ่าตัด (Admin)</h1>
                <div class="header-spacer"></div>
            </div>

            <form @submit.prevent="submitForm">
                <!-- 1. Patient Information -->
                <div class="section-group">
                    <label class="group-label">
                        Patient Information
                        <span class="required">*</span>
                    </label>
                    <div class="grid-2-col">
                        <div style="position: relative;">
                            <input type="text" v-model="form.hn" placeholder="HN Number" class="input-field green-theme"
                                @blur="lookupHN" required />
                            <span v-if="hnStatus === 'loading'" class="status-tag">⏳</span>
                            <span v-if="hnStatus === 'found'" class="status-tag" style="color:#2e7d32">✅ Found</span>
                            <span v-if="hnStatus === 'notfound'" class="status-tag" style="color:#888">👤 New</span>
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

                <!-- 2. Surgery Details (Admin Specifics Included) -->
                <div class="section-group">
                    <label class="group-label">
                        Surgery Details
                        <span class="required">*</span>
                    </label>
                    
                    <!-- ส่วนเลือกแพทย์สำหรับแอดมิน -->
                    <div style="margin-bottom: 15px;">
                        <select v-model="form.doctorLicense" class="input-field green-theme" required>
                            <option value="" disabled>Select Doctor (แพทย์ผู้รับผิดชอบ)</option>
                            <option v-for="doc in doctors" :key="doc.license" :value="doc.license">
                                {{ doc.doctorName }} ({{ doc.license }})
                            </option>
                        </select>
                    </div>

                    <div class="grid-2-col">
                        <!-- Procedure Selection -->
                        <div style="display: flex; flex-direction: column;">
                            <select v-model="form.procedure" class="input-field green-theme" @change="checkValidDate" required>
                                <option value="" disabled>Select Procedure</option>
                                <optgroup v-for="group in procedureGroups" :key="group.label" :label="group.label">
                                    <option v-for="proc in group.options" :key="proc.value || proc.name" :value="proc.value || proc.name">
                                        {{ proc.name }}
                                    </option>
                                </optgroup>
                            </select>
                            
                            <!-- Custom Procedure Inputs (โผล่เมื่อเลือก OTHER_PROCEDURE) -->
                            <div v-if="form.procedure === 'OTHER_PROCEDURE'" class="custom-procedure-row">
                                <input type="text" v-model="form.customProcedure" placeholder="Procedure Name" class="input-field green-theme" required />
                                <input type="number" min="1" v-model="form.customProcedureMinutes" placeholder="Mins" class="input-field green-theme" @blur="checkValidDate" required />
                            </div>
                        </div>

                        <!-- Date Selection -->
                        <div style="display: flex; flex-direction: column;">
                            <label class="date-label">
                                📅 วันที่ผ่าตัด (ค.ศ. เท่านั้น)
                                <span class="required">*</span>
                            </label>
                            <input type="date" v-model="form.date" :min="minDate" :max="maxDate" @blur="checkValidDate"
                                class="input-field green-theme" :readonly="isDateLocked && !!form.date"
                                :class="{ 'locked-field': isDateLocked && form.date }" required />

                            <span class="date-hint">ตัวอย่าง: 25-06-2026</span>
                            <span v-if="isDateLocked && form.date" style="color: #1a3a5f; font-size: 0.8rem; margin-top: 4px; font-weight: 600;">
                                🔒 ล็อควันที่จากปฏิทินแล้ว
                            </span>
                            <span v-if="remainingTimeMsg"
                                :style="{ color: isOverCapacity ? '#dc2626' : '#0288d1', fontSize: '0.85rem', marginTop: '6px', fontWeight: '500' }">
                                {{ isOverCapacity ? '⚠️' : '⏳' }} {{ remainingTimeMsg }}
                            </span>
                        </div>

                        <!-- OR Room Selection (Fixed OR-201 to OR-220) -->
                        <select v-model="form.room" class="input-field green-theme" @change="checkValidDate" required>
                            <option value="" disabled>Select OR Room</option>
                            <option v-for="n in orRooms" :key="n" :value="`OR-${n}`">OR-{{ n }}</option>
                        </select>
                    </div>
                </div>

                <!-- 3. Pre-operative & Admission Notes -->
                <div class="section-group">
                    <label class="group-label">Pre-operative & Admission Notes</label>
                    <div class="notes-grid">
                        <div class="note-item">
                            <span class="mini-label">CXR (Date & Note)</span>
                            <div class="date-note-row">
                                <input type="date" v-model="form.cxrDate" class="input-field date-input" />
                                <input type="text" v-model="form.cxrNote" placeholder="CXR result / finding" class="input-field" />
                            </div>
                        </div>
                        <div class="note-item">
                            <span class="mini-label">ECG (Date & Note)</span>
                            <div class="date-note-row">
                                <input type="date" v-model="form.ecgDate" class="input-field date-input" />
                                <input type="text" v-model="form.ecgNote" placeholder="ECG result / rhythm" class="input-field" />
                            </div>
                        </div>
                        <div class="note-item">
                            <span class="mini-label">Lab (Date & Note)</span>
                            <div class="date-note-row">
                                <input type="date" v-model="form.labDate" class="input-field date-input" />
                                <input type="text" v-model="form.labNote" placeholder="Lab results (Hb, Plt, etc.)" class="input-field" />
                            </div>
                        </div>
                        <div class="note-item highlight-note">
                            <span class="mini-label">Admission (Date & Note)</span>
                            <div class="date-note-row">
                                <input type="date" v-model="form.admDate" class="input-field date-input" />
                                <input type="text" v-model="form.admNote" placeholder="Admission plan / ward" class="input-field" />
                            </div>
                        </div>
                    </div>
                </div>

                <!-- 4. Other Remarks -->
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
    
    <!-- Alert Modal แบบเดียวกับฝั่งผู้ใช้ -->
    <Transition name="fade">
        <div v-if="showAlertModal" class="modal-overlay" @click="showAlertModal = false">
            <div class="alert-modal" @click.stop>
                <div class="alert-icon">{{ isAlertSuccess ? '✅' : '❌' }}</div>
                <div class="alert-message">{{ alertMessage }}</div>
                <button class="alert-btn" @click="showAlertModal = false">ตกลง</button>
            </div>
        </div>
    </Transition>
</template>

<script setup>
import { reactive, ref, onMounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'

const router = useRouter()
const route = useRoute()

// State Management
const hnStatus = ref('')
const showAlertModal = ref(false)
const alertMessage = ref('')
const isAlertSuccess = ref(false)
const remainingTimeMsg = ref('')
const isOverCapacity = ref(false)
const isDateLocked = ref(false)
const apiHolidays = ref({})
const doctors = ref([]) // เก็บรายชื่อแพทย์สำหรับแอดมิน

// ฟอร์มข้อมูล
const form = reactive({
    hn: '', fullName: '', age: '', gender: '', disease: '',
    procedure: '', customProcedure: '', customProcedureMinutes: '',
    date: '', room: '', notes: '', doctorLicense: '',
    cxrDate: '', cxrNote: '',
    ecgDate: '', ecgNote: '',
    labDate: '', labNote: '',
    admDate: '', admNote: ''
})

// ตัวเลือกห้องผ่าตัด OR-201 ถึง OR-220
const orRooms = Array.from({ length: 20 }, (_, i) => 201 + i)

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
            { name: "Tonsillectomy (ผ่าตัดทอนซิล) - 45 mins" },
            { name: "Other Procedure (ระบุเอง)", value: "OTHER_PROCEDURE" }
        ]
    }
])

const today = new Date()
const todayStr = today.toISOString().split('T')[0]
const minDate = ref(todayStr)

const max = new Date()
max.setDate(max.getDate() + 90)
const maxDate = ref(max.toISOString().split('T')[0])

// Alert Helper
const showAlert = (message, isSuccess = false) => {
    alertMessage.value = message
    isAlertSuccess.value = isSuccess
    showAlertModal.value = true
}

onMounted(async () => {
    // 1. ดึงรายชื่อแพทย์ทั้งหมดเพื่อใส่ใน Dropdown ให้แอดมินเลือก
    try {
        const res = await fetch('https://or-room-backend.rockzee2018.workers.dev/api/users', {
            headers: { 'x-user-license': localStorage.getItem('userLicense') || '' }
        })
        if (res.ok) {
            const data = await res.json()
            // กรองเอาเฉพาะบัญชีที่มีสิทธิ์แพทย์ (user และ user_admin) ไม่เอา admin ล้วน
            doctors.value = Array.isArray(data) ? data.filter(u => u.role !== 'admin') : []
        }
    } catch (e) {
        console.error('ดึงรายชื่อแพทย์ไม่สำเร็จ', e)
    }

    // 2. ล็อควันที่หากมาจากการกดผ่านปฏิทิน (Route Query)
    if (route.query.date) {
        form.date = route.query.date
        isDateLocked.value = true
    }

    // 3. ดึงข้อมูลวันหยุดราชการ
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

    if (isDateLocked.value) {
        await checkValidDate()
    }
})

// ค้นหาประวัติผู้ป่วยจาก HN
const lookupHN = async () => {
    if (form.hn.length < 3) return
    hnStatus.value = 'loading'
    try {
        const res = await fetch(`https://or-room-backend.rockzee2018.workers.dev/api/patients/${form.hn}`)
        if (res.ok) {
            const p = await res.json()
            form.fullName = p.fullName
            form.gender = p.gender
            form.disease = p.underlying || ''
            if (p.age) form.age = p.age
            hnStatus.value = 'found'
        } else {
            hnStatus.value = 'notfound'
        }
    } catch (e) { 
        hnStatus.value = 'notfound' 
    }
}

// ตรวจสอบวันหยุด
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

// ตรวจสอบความจุห้องผ่าตัด
const checkValidDate = async () => {
    remainingTimeMsg.value = ''
    isOverCapacity.value = false

    if (!form.date || form.date.length !== 10) return
    if (isNaN(new Date(form.date).getTime())) return
    if (!validateHolidayAndWeekend(form.date)) return
    if (!form.room) return

    try {
        const res = await fetch('https://or-room-backend.rockzee2018.workers.dev/api/bookings')
        const allBookings = await res.json()

        const sameDayBookings = allBookings.filter(
            b => b.date === form.date && b.room === form.room && b.status !== 'Succeed' && b.status !== 'Cancelled'
        )

        const usedMinutes = sameDayBookings.reduce((sum, b) => {
            const match = b.procedure?.match(/(\d+)\s*min/)
            return sum + (match ? parseInt(match[1]) : 0)
        }, 0)

        const MAX_MINUTES = 420 // มาตรฐาน 7 ชั่วโมง
        const remainingMinutes = MAX_MINUTES - usedMinutes

        if (remainingMinutes <= 0) {
            const exceededMin = Math.abs(remainingMinutes)
            const exHrs = Math.floor(exceededMin / 60)
            const exMins = exceededMin % 60
            isOverCapacity.value = true
            remainingTimeMsg.value = `ห้อง ${form.room} เกินเวลาที่กำหนดแล้ว ${exHrs} ชม. ` +
                (exMins > 0 ? `${exMins} นาที ` : '') + '(ยังสามารถจองต่อได้)'
        } else {
            const hrs = Math.floor(remainingMinutes / 60)
            const mins = remainingMinutes % 60
            isOverCapacity.value = false
            remainingTimeMsg.value = `ห้อง ${form.room} เหลือเวลาว่างอีก ${hrs} ชม. ` +
                (mins > 0 ? `${mins} นาที` : '')
        }

        // เช็คเวลาของหัตถการที่จะเพิ่มใหม่
        if (form.procedure) {
            let newProcMin = 0
            if (form.procedure === 'OTHER_PROCEDURE') {
                newProcMin = parseInt(form.customProcedureMinutes || 0)
            } else {
                const matchProc = form.procedure.match(/(\d+)\s*min/)
                newProcMin = matchProc ? parseInt(matchProc[1]) : 0
            }

            const totalAfterAdd = usedMinutes + newProcMin
            if (totalAfterAdd > MAX_MINUTES) {
                const overBy = totalAfterAdd - MAX_MINUTES
                const overHrs = Math.floor(overBy / 60)
                const overMins = overBy % 60
                isOverCapacity.value = true
                remainingTimeMsg.value = `ห้อง ${form.room} วันที่ ${form.date} เวลารวมจะเกินกำหนดไป ${overHrs} ชม. ` +
                    (overMins > 0 ? `${overMins} นาที ` : '') + '(ยังสามารถจองต่อได้)'
            }
        }
    } catch (e) {
        console.error('เช็กความจุห้องผ่าตัดไม่สำเร็จ', e)
    }
}

// ยืนยันการจองคิว
const submitForm = async () => {
    if (!form.hn || !form.fullName || !form.age || !form.gender || !form.date || !form.procedure || !form.room || !form.doctorLicense) {
        showAlert('กรุณากรอกข้อมูล Patient Information, เลือกแพทย์ และ Surgery Details ให้ครบถ้วนทุกช่องครับ')
        return
    }

    if (form.procedure === 'OTHER_PROCEDURE' && (!form.customProcedure || !form.customProcedureMinutes)) {
        showAlert('กรุณาระบุชื่อการผ่าตัดและเวลา (นาที) ให้ครบถ้วนครับ')
        return
    }

    if (!validateHolidayAndWeekend(form.date)) return

    // จัดการข้อความ Procedure กรณี Custom
    const finalProcedure = form.procedure === 'OTHER_PROCEDURE' 
        ? `${form.customProcedure} - ${form.customProcedureMinutes} mins`
        : form.procedure

    const payload = {
        hn: form.hn,
        fullName: form.fullName,
        age: form.age,
        gender: form.gender || '',
        procedure: finalProcedure,
        date: form.date,
        room: form.room,
        underlying: form.disease || '',
        notes: form.notes,
        cxrDate: form.cxrDate, cxrNote: form.cxrNote,
        ecgDate: form.ecgDate, ecgNote: form.ecgNote,
        labDate: form.labDate, labNote: form.labNote,
        admDate: form.admDate, admNote: form.admNote,
        dob: null,
        urgency: 'Normal',
        isNpoRisk: false,
        isInfected: false,
        doctorLicense: form.doctorLicense // ใช้แพทย์ที่แอดมินเลือกจากฟอร์ม
    }

    try {
        const url = 'https://or-room-backend.rockzee2018.workers.dev/api/bookings'
        const res = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-user-license': localStorage.getItem('userLicense') || ''
            },
            body: JSON.stringify(payload)
        })

        if (res.ok) {
            showAlert('เพิ่มคิวโดยแอดมินสำเร็จ!', true)
            setTimeout(() => {
                router.push('/admin-home')
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

// กลับหน้า Home (Admin)
const goHome = () => {
    router.push('/admin-home')
}
</script>

<style scoped>
/* สไตล์ทั้งหมดอิงจาก BookingView.vue เพื่อให้ UI/UX สอดคล้องกัน 100% */
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

.custom-procedure-row {
    display: flex;
    gap: 12px;
    margin-top: 10px;
}

.custom-procedure-row input:first-child {
    flex: 2;
}

.custom-procedure-row input:last-child {
    flex: 1;
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

.status-tag {
    position: absolute;
    right: 10px;
    top: 10px;
    font-size: 12px;
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

/* Notes Grid */
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

.btn-area {
    margin-top: 20px;
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
}

.confirm-btn:hover {
    background: #162c4d;
}

/* Modal Alert */
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
    from { transform: scale(.9); opacity: 0; }
    to { transform: scale(1); opacity: 1; }
}

@media (max-width: 600px) {
    .notes-grid { grid-template-columns: 1fr; }
    .highlight-note { grid-column: span 1; }
    .grid-2-col { grid-template-columns: 1fr; }
    .date-note-row { flex-direction: column; }
    .date-input { max-width: 100%; }
}
</style>