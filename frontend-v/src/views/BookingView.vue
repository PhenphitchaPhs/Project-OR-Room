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
                            <input type="text" v-model="form.hn" placeholder="HN" class="input-field green-theme" @blur="lookupHN" />
                            <span v-if="hnStatus === 'loading'" class="status-tag">⏳</span>
                            <span v-if="hnStatus === 'found'" class="status-tag" style="color:#2e7d32">✅ Found</span>
                        </div>
                        <input type="text" v-model="form.fullName" placeholder="Full Name" class="input-field green-theme" />
                        
                        <div class="split-input-row">
                            <input type="number" v-model="form.age" placeholder="Age (ปี)" min="0" max="120" class="input-field green-theme" />
                            <select v-model="form.gender" class="input-field green-theme">
                                <option value="" disabled>Gender</option>
                                <option value="male">Male</option>
                                <option value="female">Female</option>
                            </select>
                        </div>
                        <textarea v-model="form.disease" placeholder="Underlying Disease(s)" class="input-field green-theme" rows="1"></textarea>
                    </div>
                </div>

                <div class="section-group">
                    <label class="group-label">Surgery Details</label>
                    <div class="grid-2-col">
                        <select v-model="form.procedure" class="input-field green-theme">
                            <option value="" disabled>Select Procedure</option>
                            <option v-for="proc in procedureList" :key="proc.name" :value="proc.name">{{ proc.name }}</option>
                        </select>
                        <input type="date" v-model="form.date" :min="minDate" @change="checkValidDate" class="input-field green-theme" />
                    </div>
                </div>

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

                <div class="section-group">
                    <label class="group-label">Other Remarks</label>
                    <textarea v-model="form.notes" placeholder="Additional details..." class="input-field blue-theme note-box" rows="2"></textarea>
                </div>

                <div class="btn-area">
                    <button type="submit" class="confirm-btn">Confirm Booking</button>
                </div>
            </form>
        </div>
    </div>
</template>

<script setup>
import { reactive, ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'

const router = useRouter()
const tomorrowCount = ref(0)
const hnStatus = ref('')

// เพิ่มตัวแปรเก็บวันที่สำหรับ CXR, ECG, Lab, Adm
const form = reactive({
    hn: '', fullName: '', age: '', gender: '', disease: '', 
    procedure: '', date: '', notes: '',
    cxrDate: '', cxrNote: '', 
    ecgDate: '', ecgNote: '', 
    labDate: '', labNote: '', 
    admDate: '', admNote: ''
})

const procedureList = ref([
    { name: "Appendectomy (ผ่าตัดไส้ติ่ง) - 60 min", min: 60 },
    { name: "Laparoscopic Cholecystectomy / LC - 120 min", min: 120 },
    { name: "Cesarean Section / C-Section - 60 min", min: 60 },
    { name: "Total Knee Arthroplasty / TKA - 180 min", min: 180 },
    { name: "Cataract Surgery (ผ่าตัดต้อกระจก) - 30 min", min: 30 }
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

const checkValidDate = () => {
    if (!form.date) return
    const day = new Date(form.date).getDay()
    if (day === 0 || day === 6) {
        alert('❌ วันหยุดเสาร์-อาทิตย์')
        form.date = ''
    }
}

const submitForm = async () => {
    if (!form.hn || !form.fullName || !form.age || !form.date) {
        alert('กรุณากรอกข้อมูลสำคัญให้ครบถ้วน')
        return
    }
    const payload = { ...form, doctorLicense: localStorage.getItem('userLicense'), status: 'Pending' }
    try {
        const res = await fetch('https://or-room-backend.rockzee2018.workers.dev/api/bookings', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        })
        if (res.ok) {
            alert("✅ จองคิวสำเร็จ!"); router.push('/home')
        }
    } catch (e) { alert("❌ เกิดข้อผิดพลาด") }
}

const goHome = () => router.push('/home')
</script>

<style scoped>
.page-wrapper { display: flex; justify-content: center; padding: 20px; min-height: 100vh; background: linear-gradient(135deg, #0f2a47, #1e3a5f); }
.card { background: #fff; width: 100%; max-width: 700px; padding: 30px; border-radius: 16px; box-shadow: 0 10px 30px rgba(0,0,0,0.2); position: relative; }

.reminder-banner { background: #fff3cd; color: #856404; padding: 12px; border-radius: 10px; margin-bottom: 20px; border-left: 5px solid #ffc107; font-size: 14px; }
.title { color: #0f2a47; text-align: center; font-size: 22px; margin-bottom: 25px; }

.notes-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
.note-item { display: flex; flex-direction: column; gap: 6px; }
.mini-label { font-size: 11px; font-weight: 700; color: #666; margin-left: 5px; }
.highlight-note { grid-column: span 2; background: #f0f7ff; padding: 12px; border-radius: 8px; }

/* จัดเรียงวันที่และ Note ให้อยู่บรรทัดเดียวกัน */
.date-note-row { display: flex; gap: 8px; }
.date-input { max-width: 130px; }

.input-field { width: 100%; padding: 10px; border-radius: 10px; border: 1px solid #d6e2f1; background: #f4f8fd; font-size: 14px; box-sizing: border-box; }
.grid-2-col { display: grid; grid-template-columns: 1fr 1fr; gap: 15px; }
.split-input-row { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-top: 15px; }

.confirm-btn { width: 100%; padding: 15px; background: #1e3a5f; color: white; border: none; border-radius: 12px; font-weight: 700; cursor: pointer; margin-top: 20px; }
.back-btn { position: absolute; top: 20px; left: 20px; width: 35px; height: 35px; border-radius: 50%; border: none; background: #f0f4f8; cursor: pointer; display: flex; align-items: center; justify-content: center; }

@media (max-width: 600px) {
    .notes-grid { grid-template-columns: 1fr; }
    .highlight-note { grid-column: span 1; }
    .grid-2-col { grid-template-columns: 1fr; }
    
    /* ถ้าย่อจอให้ช่อง Date กับ Note เรียงลงมาแทน */
    .date-note-row { flex-direction: column; }
    .date-input { max-width: 100%; }
}

/* เพิ่มระยะห่างด้านบนของแต่ละหมวดหมู่ (ดันให้ห่างจากส่วนก่อนหน้า) */
.section-group {
    margin-top: 32px; 
}

/* ยกเว้นหมวดหมู่แรกสุด ไม่ต้องให้มีระยะห่างด้านบน */
.section-group:first-child {
    margin-top: 0;
}

/* จัดทรงข้อความหัวข้อ (Label) ให้สวยงามและเว้นระยะจากช่องกรอกข้อมูล */
.group-label {
    display: block;
    font-size: 16px;
    font-weight: 700;
    color: #1e3a5f;
    margin-bottom: 12px; /* เว้นระยะด้านล่าง ไม่ให้ชิดช่องกรอกข้อมูลเกินไป */
    border-bottom: 2px solid #f0f4f8; /* (เสริม) เพิ่มเส้นใต้บางๆ ให้แบ่งโซนดูง่ายขึ้น */
    padding-bottom: 6px;
}
</style>