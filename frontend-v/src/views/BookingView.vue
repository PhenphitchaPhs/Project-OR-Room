<template>
    <div class="page-wrapper">
        <button type="button" class="back-btn" @click="goHome">
            <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none"
                stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">
                <polyline points="15 18 9 12 15 6" />
            </svg>
        </button>
        <div class="card">
            <h1 class="title">Scheduling a surgery</h1>

            <form @submit.prevent="submitForm">

                <div class="section-group">
                    <label class="group-label">Patient Information</label>
                    <div class="grid-2-col">
                        <input type="text" v-model="form.hn" placeholder="HN" class="input-field green-theme" />
                        <input type="text" v-model="form.fullName" placeholder="Full Name"
                            class="input-field green-theme" />
                        <input type="number" v-model="form.age" placeholder="Age" class="input-field green-theme" />
                        <textarea v-model="form.disease" placeholder="Underlying Disease(s)"
                            class="input-field green-theme textarea-auto" rows="1" @input="autoResize"></textarea>
                    </div>
                </div>

                <div class="flex-row-desktop">
                    <div class="flex-item">
                        <label class="group-label">Gender</label>
                        <div class="gender-wrapper">
                            <label class="gender-box male" :class="{ active: form.gender === 'male' }">
                                <input type="radio" name="gender" value="male" v-model="form.gender" />
                                Male
                            </label>

                            <label class="gender-box female" :class="{ active: form.gender === 'female' }">
                                <input type="radio" name="gender" value="female" v-model="form.gender" />
                                Female
                            </label>
                        </div>
                    </div>

                    <div class="flex-item">
                        <label class="group-label">Proposed Procedure</label>
                        <div class="select-wrapper">
                            <select v-model="form.procedure" class="input-field green-theme">
                                <option value="" disabled>Surgery list</option>
                                <option v-for="proc in procedureList" :key="proc" :value="proc">
                                    {{ proc }}
                                </option>
                            </select>
                        </div>
                    </div>
                </div>

                <div class="section-group">
                    <label class="group-label">Date</label>
                    <input type="date" v-model="form.date" class="input-field green-theme" />
                </div>

                <div class="section-group">
                    <label class="group-label">Notes</label>
                    <textarea v-model="form.notes" placeholder="Remarks" class="input-field blue-theme note-box"
                        rows="3" @input="autoResize"></textarea>
                </div>

                <div class="btn-area">
                    <button type="submit" class="confirm-btn">Confirm</button>
                </div>

            </form>
        </div>
    </div>
</template>

<script setup>
import { reactive, computed, ref } from 'vue'
import { useRouter } from 'vue-router'

const router = useRouter()
const currentDoctor = {
    name: 'Dr. Smith',
    dutyDay: 1 // 1 = Monday
}

// 🏥 รายการประเภทการผ่าตัดยอดฮิตในไทย (ดึงมาทำเป็นตัวแปรแบบนี้ อนาคตเพิ่มลดง่าย)
const procedureList = ref([
    "Appendectomy (ผ่าตัดไส้ติ่ง) - 60 min",
    "Laparoscopic Cholecystectomy / LC (ผ่าตัดถุงน้ำดี) - 120 min",
    "Cesarean Section / C-Section (ผ่าคลอด) - 60 min",
    "Herniorrhaphy (ผ่าตัดไส้เลื่อน) - 90 min",
    "Total Knee Arthroplasty / TKA (เปลี่ยนข้อเข่า) - 180 min",
    "Thyroidectomy (ผ่าตัดต่อมไทรอยด์) - 120 min",
    "Modified Radical Mastectomy / MRM (ผ่าตัดเต้านม) - 120 min",
    "Cataract Surgery (ผ่าตัดต้อกระจก) - 30 min",
    "Hemorrhoidectomy (ผ่าตัดริดสีดวงทวาร) - 45 min",
    "Exploratory Laparotomy (ผ่าตัดเปิดช่องท้องฉุกเฉิน) - 180 min"
])

/* 🚫 วันหยุด */
const holidays = [
    '2026-01-01',
    '2026-04-13',
    '2026-04-14',
    '2026-04-15',
    '2026-12-31'
]

/* 🔁 แปลงเลขวันเป็นชื่อ */
const dutyDayName = computed(() => {
    const days = [
        'Sunday', 'Monday', 'Tuesday',
        'Wednesday', 'Thursday', 'Friday', 'Saturday'
    ]
    return days[currentDoctor.dutyDay]
})

/* 🔒 ตรวจสอบวัน */
const validateDate = () => {
    if (!form.date) return

    const selected = new Date(form.date)
    const day = selected.getDay()

    if (day !== currentDoctor.dutyDay) {
        form.date = ''
        return
    }

    if (holidays.includes(form.date)) {
        form.date = ''
        return
    }
}

const form = reactive({
    hn: '',
    fullName: '',
    age: '',
    disease: '',
    gender: '',
    procedure: '',
    date: '',
    notes: ''
})

const goHome = () => {
    router.push('/home')
}

const submitForm = () => {

    if (!form.hn || !form.fullName || !form.gender || !form.procedure || !form.date) {
        alert('กรุณากรอกข้อมูลให้ครบ')
        return
    }

    // 🔹 ดึงข้อมูลเดิม
    const existing = JSON.parse(localStorage.getItem('bookings')) || []

    // 🔹 สร้างเคสใหม่ตาม format ที่ Home ต้องใช้
    const newCase = {
        id: Date.now(),
        status: 'Upcoming',

        // 🔹 ข้อมูลการ์ดย่อ
        date: form.date,
        patientName: form.fullName,
        procedure: form.procedure,
        doctor: 'Dr. Smith',
        room: 'OR-01',

        // 🔥 ข้อมูล detail เต็ม
        hn: form.hn,
        fullName: form.fullName,
        age: form.age,
        gender: form.gender,
        underlying: form.disease,
        notes: form.notes
    }

    existing.push(newCase)

    localStorage.setItem('bookings', JSON.stringify(existing))

    // 🔹 reset form
    Object.keys(form).forEach(key => form[key] = '')

    // 🔹 กลับหน้า Home
    router.push('/home')
}
</script>

<style scoped>
/* ===== GLOBAL FIX ===== */
* {
    box-sizing: border-box;
}

.page-wrapper {
    display: flex;
    justify-content: center;
    padding: 20px;
    width: 100%;
    min-height: 100vh;
    overflow-x: hidden;
    background: linear-gradient(135deg, #0f2a47, #1e3a5f);
}

/* ===== CARD ===== */
.card {
    position: relative;
    background: #ffffff;
    width: 100%;
    max-width: 500px;
    padding: 25px;
    border-radius: 14px;
    box-shadow: 0 15px 40px rgba(0, 0, 0, 0.15);
}

/* ===== TITLE ===== */
.title {
    color: #0f2a47;
    text-align: center;
    font-size: 24px;
    font-weight: 700;
    margin-bottom: 25px;
}

/* ===== LABEL ===== */
.group-label {
    display: block;
    color: #1e3a5f;
    margin-bottom: 8px;
    font-weight: 600;
}

.section-group {
    margin-bottom: 20px;
}

/* ===== INPUT / SELECT / TEXTAREA ===== */
input,
textarea,
select {
    width: 100%;
    max-width: 100%;
    box-sizing: border-box;
}

.input-field {
    padding: 12px;
    border-radius: 10px;
    border: 1px solid #d6e2f1;
    background: #f4f8fd;
    font-size: 14px;
    margin-bottom: 12px;
    transition: 0.25s;
}

.input-field:focus {
    outline: none;
    border: 1px solid #0f2a47;
    box-shadow: 0 0 0 3px rgba(15, 42, 71, 0.15);
    background: #ffffff;
}

/* ===== TEXTAREA FIX ===== */
textarea {
    resize: none;
    overflow-wrap: break-word;
}

.textarea-auto {
    resize: none;
    overflow: hidden;
    min-height: 40px;
}

.note-box {
    background: #eef4fb;
}

/* ===== GENDER ===== */
.gender-wrapper {
    display: flex;
    gap: 10px;
    margin-bottom: 15px;
}

.gender-box {
    flex: 1;
    padding: 10px;
    text-align: center;
    border-radius: 10px;
    cursor: pointer;
    font-weight: 600;
    border: 2px solid transparent;
    transition: 0.3s ease;
}

/* Male */
.gender-box.male {
    background: #e0f2fe;
    color: #1d4ed8;
}

.gender-box.male.active {
    background: #1d4ed8;
    color: white;
    border: 2px solid #1e40af;
    box-shadow: 0 6px 18px rgba(29, 78, 216, 0.35);
}

/* Female */
.gender-box.female {
    background: #fce7f3;
    color: #db2777;
}

.gender-box.female.active {
    background: #db2777;
    color: white;
    border: 2px solid #be185d;
    box-shadow: 0 6px 18px rgba(219, 39, 119, 0.35);
}

/* ===== CONFIRM BUTTON ===== */
.confirm-btn {
    width: 100%;
    padding: 14px;
    background: linear-gradient(135deg, #0f2a47, #1e3a5f);
    color: white;
    border: none;
    border-radius: 12px;
    font-size: 16px;
    cursor: pointer;
    font-weight: bold;
    transition: 0.3s;
}

.confirm-btn:hover {
    transform: translateY(-2px);
    box-shadow: 0 10px 25px rgba(15, 42, 71, 0.4);
}

/* ===== BACK BUTTON ===== */
/* 🔴 อัปเดต: เปลี่ยนเป็น fixed และขยับลงให้หลบ App.vue จะได้กดติด */
.back-btn {
    position: absolute;
    top: 20px;
    left: 20px;
    z-index: 100;
    width: 40px;
    height: 40px;
    border-radius: 50%;
    border: none;
    background: #eef3fb;
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    color: #0f2a47;
    transition: 0.3s;
}

.back-btn:hover {
    background: #0f2a47;
    color: white;
}

/* ===== MOBILE GRID FIX ===== */
@media (max-width: 768px) {
    .grid-2-col {
        display: block;
    }
}

/* ===== DESKTOP ===== */
@media (min-width: 1024px) {

    .card {
        max-width: 1000px;
        padding: 40px;
    }

    .grid-2-col {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 20px;
    }

    .input-field {
        margin-bottom: 0;
    }

    .flex-row-desktop {
        display: flex;
        gap: 30px;
        align-items: flex-start;
        margin-bottom: 20px;
    }

    .flex-item {
        flex: 1;
    }

    .confirm-btn {
        width: 200px;
        margin: 0 auto;
        display: block;
    }
}
</style>