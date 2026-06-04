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
                            class="input-field green-theme" rows="1" required></textarea>
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
                        <input type="date" v-model="form.date" :min="minDate" @change="checkValidDate"
                            class="input-field green-theme" required />
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
import { useRouter } from 'vue-router'


const router = useRouter()
const tomorrowCount = ref(0)
const hnStatus = ref('')
const showAlertModal = ref(false)
const alertMessage = ref('')
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


// รายชื่อวันหยุดราชการไทยประจำปี 2026 (พ.ศ. 2569) คีย์เป็น YYYY-MM-DD
const thaiHolidays2026 = {
    '2026-01-01': 'วันขึ้นปีใหม่',
    '2026-03-03': 'วันมาฆบูชา',
    '2026-04-06': 'วันพระบาทสมเด็จพระพุทธยอดฟ้าจุฬาโลกมหาราชและวันที่ระลึกมหาจักรีบรมราชวงศ์',
    '2026-04-13': 'วันสงกรานต์',
    '2026-04-14': 'วันสงกรานต์',
    '2026-04-15': 'วันสงกรานต์',
    '2026-05-01': 'วันแรงงานแห่งชาติ (หยุดบางหน่วยงาน)',
    '2026-05-04': 'วันฉัตรมงคล',
    '2026-05-31': 'วันวิสาขบูชา',
    '2026-06-01': 'วันชดเชยวันวิสาขบูชา',
    '2026-06-03': 'วันเฉลิมพระชนมพรรษาสมเด็จพระนางเจ้าฯ พระบรมราชินี',
    '2026-07-28': 'วันเฉลิมพระชนมพรรษาพระบาทสมเด็จพระเจ้าอยู่หัว',
    '2026-07-29': 'วันอาสาฬหบูชา',
    '2026-07-30': 'วันเข้าพรรษา',
    '2026-08-12': 'วันเฉลิมพระชนมพรรษาสมเด็จพระบรมราชชนนีพันปีหลวง และวันแม่แห่งชาติ',
    '2026-10-13': 'วันคล้ายวันสวรรคตพระบาทสมเด็จพระบรมชนกาธิเบศร มหาภูมิพลอดุลยเดชมหาราช บรมนาถบพิตร',
    '2026-10-23': 'วันปิยมหาราช',
    '2026-12-05': 'วันคล้ายวันพระบรมราชสมภพพระบาทสมเด็จพระบรมชนกาธิเบศร มหาภูมิพลอดุลยเดชมหาราช บรมนาถบพิตร วันชาติ และวันพ่อแห่งชาติ',
    '2026-12-07': 'วันชดเชยวันพ่อแห่งชาติ',
    '2026-12-10': 'วันรัฐธรรมนูญ',
    '2026-12-31': 'วันสิ้นปี'
}


const procedureGroups = ref([
    {
        label: "ศัลยกรรมทั่วไป (General Surgery)",
        options: [
            { name: "Appendectomy (ผ่าตัดไส้ติ่ง) - 60 min" },
            { name: "Laparoscopic Cholecystectomy / LC (ผ่าตัดนิ่วในถุงน้ำดี) - 120 min" },
            { name: "Herniorrhaphy (ผ่าตัดไส้เลื่อน) - 90 min" },
            { name: "Thyroidectomy (ผ่าตัดต่อมไทรอยด์) - 120 min" },
            { name: "Modified Radical Mastectomy / MRM (ผ่าตัดมะเร็งเต้านม) - 120 min" },
            { name: "Hemorrhoidectomy (ผ่าตัดริดสีดวง) - 45 min" },
            { name: "Exploratory Laparotomy (ผ่าตัดเปิดช่องท้อง) - 180 min" }
        ]
    },
    {
        label: "สูตินรีเวช (OB/GYN)",
        options: [
            { name: "Cesarean Section / C-Section (ผ่าคลอด) - 60 min" },
            { name: "Total Abdominal Hysterectomy / TAH (ผ่าตัดมดลูก) - 120 min" },
            { name: "Tubal Resection / TR (ทำหมันหญิง) - 30 min" }
        ]
    },
    {
        label: "กระดูกและข้อ (Orthopedics)",
        options: [
            { name: "Total Knee Arthroplasty / TKA (ผ่าตัดเปลี่ยนผิวข้อเข่า) - 180 min" },
            { name: "Total Hip Arthroplasty / THA (ผ่าตัดเปลี่ยนข้อสะโพก) - 180 min" },
            { name: "ORIF (ผ่าตัดใส่เหล็กดามกระดูกหัก) - 120 min" }
        ]
    },
    {
        label: "เฉพาะทางอื่นๆ (Others)",
        options: [
            { name: "Cataract Surgery (ผ่าตัดต้อกระจก) - 30 min" },
            { name: "TURP (ผ่าตัดส่องกล้องต่อมลูกหมาก) - 90 min" },
            { name: "Tonsillectomy (ผ่าตัดทอนซิล) - 45 min" }
        ]
    }
])


const todayStr = new Date().toISOString().split('T')[0]
const minDate = ref(todayStr)


onMounted(async () => {
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


// แตกฟังก์ชันเช็กวันหยุดเพื่อให้เรียกใช้ซ้ำได้สะดวก
const validateHolidayAndWeekend = (dateStr) => {
    if (!dateStr) return true


    // 1. ตรวจสอบปี ค.ศ. / พ.ศ. ก่อน
    const yearPart = parseInt(dateStr.split('-')[0])
    const currentYear = new Date().getFullYear()
    const normalizedYear = yearPart > 2400 ? yearPart - 543 : yearPart
    if (!normalizedYear || normalizedYear < currentYear - 1 || normalizedYear > currentYear + 5) return true


    // 2. เช็กวันหยุดราชการ
    if (thaiHolidays2026[dateStr]) {
        showAlert(
            `วันที่เลือกเป็นวันหยุดราชการ : ${thaiHolidays2026[dateStr]} ห้องผ่าตัดปิดให้บริการครับ`
        )
        form.date = ''
        return false
    }


    // 3. เช็กเสาร์-อาทิตย์
    const selected = new Date(dateStr)
    const dow = selected.getDay()
    if (dow === 0 || dow === 6) {
        showAlert('วันเสาร์-อาทิตย์ ห้องผ่าตัดปิดให้บริการครับ')
        form.date = ''
        return false
    }


    return true
}


const checkValidDate = async () => {
    if (!form.date) return


    // ตรวจสอบวันหยุด & เสาร์อาทิตย์
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
                showAlert(
                    `คุณสามารถจองคิวได้เฉพาะวัน ${workingDay} ซึ่งเป็นวันทำงานของคุณเท่านั้นครับ`
                )
                form.date = ''
                return
            }
        } catch (e) { console.error('เช็กวันทำงานไม่สำเร็จ', e) }
    }


    if (!form.procedure) return
    try {
        const res = await fetch('https://or-room-backend.rockzee2018.workers.dev/api/bookings')
        const allBookings = await res.json()

        const sameDayBookings = allBookings.filter(b => b.date === form.date && b.status !== 'Succeed')

        const usedMinutes = sameDayBookings.reduce((sum, b) => {
            const match = b.procedure?.match(/(\d+)\s*min/)
            return sum + (match ? parseInt(match[1]) : 0)
        }, 0)


        const matchProc = form.procedure?.match(/(\d+)\s*min/)
        const newProcMin = matchProc ? parseInt(matchProc[1]) : 0


        if (usedMinutes + newProcMin > 420) {
            const remaining = 420 - usedMinutes
            showAlert(
                `วันที่ ${form.date} คิวเต็มแล้วครับ\nเหลือเวลา ${remaining} นาที แต่หัตถการนี้ใช้ ${newProcMin} นาที\nกรุณาเลือกวันอื่นครับ`
            )
            form.date = ''
        }
    } catch (e) { console.error('เช็กความจุห้องผ่าตัดไม่สำเร็จ', e) }
}


const submitForm = async () => {
    if (!form.hn || !form.fullName || !form.age || !form.gender || !form.disease || !form.date || !form.procedure) {
        showAlert(
            'กรุณากรอกข้อมูล Patient Information และ Surgery Details ให้ครบถ้วนทุกช่องครับ'
        )
        return
    }


    // ✅ เช็กวันหยุดซ้ำก่อน submit ป้องกันหลุดโฟลว์
    if (!validateHolidayAndWeekend(form.date)) return

    const payload = {
        hn: form.hn,
        fullName: form.fullName,
        age: form.age,
        gender: form.gender || '',
        procedure: form.procedure,
        date: form.date,
        underlying: form.disease,
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
            showAlert(
                `บันทึกไม่สำเร็จ: ${errData.error || 'เซิร์ฟเวอร์ปฏิเสธการรับข้อมูล'}`
            )
        }
    } catch (e) {
        console.error(e)
        showAlert('ระบบขัดข้อง ไม่สามารถติดต่อเซิร์ฟเวอร์ได้')
    }
}


const goHome = () => router.push('/home')
</script>


<style scoped>
/* สไตล์เดิมคงเดิมไว้ทั้งหมด */
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