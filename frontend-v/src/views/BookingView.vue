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
                        <input type="text" v-model="form.fullName" placeholder="Full Name" class="input-field green-theme" />
                        
                        <div class="split-input-row">
                            <input type="date" v-model="form.dob" :max="maxDobDate" class="input-field green-theme date-box" title="Date of Birth" />
                            <input type="text" :value="calculatedAge !== '' ? calculatedAge + ' ปี' : 'อายุ'" readonly class="input-field age-read-only" title="อายุคำนวณอัตโนมัติ" />
                        </div>

                        <textarea v-model="form.disease" placeholder="Underlying Disease(s)" class="input-field green-theme textarea-auto" rows="1"></textarea>
                    </div>
                </div>

                <div class="flex-row-desktop">
                    <div class="flex-item">
                        <label class="group-label">Gender</label>
                        <div class="gender-wrapper">
                            <label class="gender-box male" :class="{ active: form.gender === 'male' }">
                                <input type="radio" name="gender" value="male" v-model="form.gender" /> Male
                            </label>
                            <label class="gender-box female" :class="{ active: form.gender === 'female' }">
                                <input type="radio" name="gender" value="female" v-model="form.gender" /> Female
                            </label>
                        </div>
                    </div>

                    <div class="flex-item">
                        <label class="group-label">Proposed Procedure</label>
                        <div class="select-wrapper">
                            <select v-model="form.procedure" class="input-field green-theme">
                                <option value="" disabled>Surgery list</option>
                                <option v-for="proc in procedureList" :key="proc.name" :value="proc.name">
                                    {{ proc.name }}
                                </option>
                            </select>
                        </div>
                    </div>
                </div>

                <div class="section-group extra-options">
                    <label class="group-label">Triage & Special Requirements</label>
                    <div class="grid-2-col">
                        <div class="select-wrapper">
                            <select v-model="form.urgency" class="input-field orange-theme">
                                <option value="Normal">🟢 Normal</option>
                                <option value="Urgent">🟡 Urgent</option>
                                <option value="Emergency">🔴 Emergency</option>
                            </select>
                        </div>
                        <div class="checkbox-group">
                            <label class="check-label">
                                <input type="checkbox" v-model="form.isNpoRisk" />
                                🍼 NPO Risk
                            </label>
                            <label class="check-label red-text">
                                <input type="checkbox" v-model="form.isInfected" />
                                🦠 Infection
                            </label>
                        </div>
                    </div>
                </div>

                <div class="section-group">
                    <label class="group-label">Surgery Date</label>
                    <input type="date" v-model="form.date" :min="minDate" @change="checkValidDate" class="input-field green-theme" />
                </div>

                <div class="section-group">
                    <label class="group-label">Notes</label>
                    <textarea v-model="form.notes" placeholder="Remarks" class="input-field blue-theme note-box" rows="2"></textarea>
                </div>

                <div class="btn-area">
                    <button type="submit" class="confirm-btn">Confirm</button>
                </div>

            </form>
        </div>
    </div>
</template>

<script setup>
import { reactive, ref, computed } from 'vue'
import { useRouter } from 'vue-router'

const router = useRouter()

const procedureList = ref([
    { name: "Appendectomy (ผ่าตัดไส้ติ่ง) - 60 min", min: 60 },
    { name: "Laparoscopic Cholecystectomy / LC - 120 min", min: 120 },
    { name: "Cesarean Section / C-Section - 60 min", min: 60 },
    { name: "Herniorrhaphy (ผ่าตัดไส้เลื่อน) - 90 min", min: 90 },
    { name: "Total Knee Arthroplasty / TKA - 180 min", min: 180 },
    { name: "Thyroidectomy (ผ่าตัดต่อมไทรอยด์) - 120 min", min: 120 },
    { name: "Modified Radical Mastectomy / MRM - 120 min", min: 120 },
    { name: "Cataract Surgery (ผ่าตัดต้อกระจก) - 30 min", min: 30 },
    { name: "Hemorrhoidectomy (ผ่าตัดริดสีดวง) - 45 min", min: 45 },
    { name: "Exploratory Laparotomy (เปิดช่องท้อง) - 180 min", min: 180 }
])

const officialHolidays = [
    "01-01", "04-06", "04-13", "04-14", "04-15", "05-01", 
    "05-04", "06-03", "07-28", "08-12", "10-13", "10-23", 
    "12-05", "12-10", "12-31"
]

const form = reactive({
    hn: '', fullName: '', dob: '', disease: '', gender: '', procedure: '', date: '', notes: '',
    urgency: 'Normal', isNpoRisk: false, isInfected: false
})

const goHome = () => router.push('/home')

const today = new Date();
today.setHours(0, 0, 0, 0);
const offset = today.getTimezoneOffset() * 60000;
const todayStr = new Date(today.getTime() - offset).toISOString().split('T')[0];

const minDate = ref(todayStr); 
const maxDobDate = ref(todayStr); 

const calculatedAge = computed(() => {
    if (!form.dob) return '';
    
    const birthDate = new Date(form.dob);
    const referenceDate = form.date ? new Date(form.date) : new Date();
    
    let age = referenceDate.getFullYear() - birthDate.getFullYear();
    const monthDiff = referenceDate.getMonth() - birthDate.getMonth();
    
    if (monthDiff < 0 || (monthDiff === 0 && referenceDate.getDate() < birthDate.getDate())) {
        age--;
    }
    
    return age >= 0 ? age : 0;
})

const isHolidayOrWeekend = (dateString) => {
    const selected = new Date(dateString)
    const day = selected.getDay()
    const monthDay = dateString.substring(5)
    return day === 0 || day === 6 || officialHolidays.includes(monthDay)
}

const checkValidDate = async () => {
    if (!form.date) return

    // เช็ควันหยุด
    if (isHolidayOrWeekend(form.date)) {
        alert('❌ วันหยุดราชการ หรือ วันเสาร์-อาทิตย์ ห้องผ่าตัดปิดให้บริการ')
        form.date = ''; return
    }

    // เช็คเฉพาะวันทำงานของหมอ
    const dayMap = { 'Monday':1, 'Tuesday':2, 'Wednesday':3, 'Thursday':4, 'Friday':5 }
    const workingDay = localStorage.getItem('selectedDay')
    const selectedDow = new Date(form.date + 'T00:00:00').getDay()
    if (workingDay && dayMap[workingDay] !== selectedDow) {
        alert(`❌ คุณทำงานเฉพาะวัน ${workingDay} เท่านั้น กรุณาเลือกวัน${workingDay}`)
        form.date = ''; return
    }

    // เช็ค 7 ชั่วโมง (420 นาที)
    try {
        const res = await fetch('https://or-room-backend.rockzee2018.workers.dev/api/bookings')
        const allBookings = await res.json()
        const sameDayBookings = allBookings.filter(b => b.date === form.date && b.status !== 'Succeed')
        
        const usedMinutes = sameDayBookings.reduce((sum, b) => {
            const match = b.procedure?.match(/(\d+)\s*min/)
            return sum + (match ? parseInt(match[1]) : 0)
        }, 0)

        const selectedProc = procedureList.value.find(p => p.name === form.procedure)
        const newProcMin = selectedProc ? selectedProc.min : 0
        
        if (usedMinutes + newProcMin > 420) {
            const remaining = 420 - usedMinutes
            alert(`❌ วันที่ ${form.date} มีเวลาเหลือแค่ ${remaining} นาที แต่ procedure นี้ใช้ ${newProcMin} นาที\nกรุณาเลือกวันอื่น`)
            form.date = ''; return
        }
    } catch(e) {
        console.error('เช็คความจุไม่สำเร็จ', e)
    }
}

// เปลี่ยนเป็น async function เพื่อให้ใช้ await fetch ได้
const submitForm = async () => {
    // 1. เช็กข้อมูลพื้นฐาน
    if (!form.hn || !form.fullName || !form.dob || !form.gender || !form.procedure || !form.date) {
        alert('กรุณากรอกข้อมูลให้ครบ')
        return
    }

    if (isHolidayOrWeekend(form.date)) {
        alert('❌ ไม่สามารถจองคิวในวันหยุดราชการหรือเสาร์-อาทิตย์ได้ครับ')
        return
    }
    
    const dayMap = { 'Monday':1, 'Tuesday':2, 'Wednesday':3, 'Thursday':4, 'Friday':5 }
    const workingDay = localStorage.getItem('selectedDay')
    const selectedDow = new Date(form.date + 'T00:00:00').getDay()
    if (workingDay && dayMap[workingDay] !== selectedDow) {
        alert(`❌ คุณทำงานเฉพาะวัน ${workingDay} เท่านั้น`)
        return
    }

    const payload = {
        hn: form.hn,
        fullName: form.fullName, 
        dob: form.dob,
        age: calculatedAge.value, 
        gender: form.gender,
        procedure: form.procedure,
        date: form.date,
        urgency: form.urgency,
        isNpoRisk: form.isNpoRisk,
        isInfected: form.isInfected,
        underlying: form.disease, // 👈 ส่งโรคประจำตัวแยก
        notes: form.notes,         // 👈 ส่งหมายเหตุแยก
        doctorLicense: localStorage.getItem('userLicense')  // 👈 เพิ่มบรรทัดนี้
    }

    try {
        // 3. ยิงข้อมูลไปหา Hono API ของเรา
        const response = await fetch('https://or-room-backend.rockzee2018.workers.dev/api/bookings', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        })

        if (!response.ok) throw new Error('Network response was not ok')

        alert("✅ จองคิวสำเร็จ! ข้อมูลถูกบันทึกลง Cloudflare D1 เรียบร้อยแล้ว")
        
        // ล้างค่าในฟอร์ม
        Object.keys(form).forEach(key => form[key] = (typeof form[key] === 'boolean' ? false : (key === 'urgency' ? 'Normal' : '')))
        
        // เด้งกลับหน้า Home
        router.push('/home')

    } catch (error) {
        console.error("Error saving booking:", error)
        alert("❌ เกิดข้อผิดพลาดในการบันทึกข้อมูลลงฐานข้อมูล")
    }
}
</script>

<style scoped>
/* ===== GLOBAL FIX ===== */
* { box-sizing: border-box; }
.page-wrapper { display: flex; justify-content: center; padding: 20px; width: 100%; min-height: 100vh; background: linear-gradient(135deg, #0f2a47, #1e3a5f); }
.card { position: relative; background: #ffffff; width: 100%; max-width: 500px; padding: 25px; border-radius: 14px; box-shadow: 0 15px 40px rgba(0, 0, 0, 0.15); }
.title { color: #0f2a47; text-align: center; font-size: 24px; font-weight: 700; margin-bottom: 25px; }
.group-label { display: block; color: #1e3a5f; margin-bottom: 8px; font-weight: 600; }
.section-group { margin-bottom: 20px; }
input, textarea, select { width: 100%; box-sizing: border-box; }

.input-field { padding: 12px; border-radius: 10px; border: 1px solid #d6e2f1; background: #f4f8fd; font-size: 14px; margin-bottom: 12px; transition: 0.25s; }
.input-field:focus { outline: none; border: 1px solid #0f2a47; background: #ffffff; }

/* 🔴 โซนใหม่: ตกแต่งกล่อง DOB และ Age ให้อยู่คู่กัน */
.split-input-row { 
    display: flex; 
    gap: 12px; 
    width: 100%; 
}
.date-box { 
    flex: 2; /* ให้กล่องปฏิทินกว้างกว่านิดนึง */
}
.age-read-only { 
    flex: 1; /* ให้กล่องอายุกะทัดรัดลง */
    background: #e9ecef !important; /* สีเทาอ่อนให้รู้ว่าพิมพ์ไม่ได้ */
    color: #495057; 
    text-align: center; 
    font-weight: 600;
    cursor: not-allowed; /* เปลี่ยนเมาส์เป็นเครื่องหมายห้าม */
    border: 1px solid #ced4da;
}

/* โซนใหม่: ตกแต่ง Extra Options */
.extra-options { background: #fffcf0; padding: 15px; border-radius: 12px; border: 1px dashed #f5b041; }
.orange-theme { background: #fff8e1; border: 1px solid #f5b041; }
.checkbox-group { display: flex; flex-direction: column; justify-content: center; gap: 15px; padding-left: 10px; }
.check-label { display: flex !important; align-items: center !important; justify-content: flex-start !important; gap: 12px !important; font-size: 14.5px; font-weight: 600; color: #444; cursor: pointer; margin: 0 !important; width: 100% !important; }

input[type="checkbox"] { width: 22px !important; height: 22px !important; margin: 0 !important; cursor: pointer; flex-shrink: 0 !important; accent-color: #d32f2f; -webkit-appearance: auto !important; appearance: auto !important; }

textarea { resize: none; overflow-wrap: break-word; }
.textarea-auto { overflow: hidden; min-height: 40px; }
.gender-wrapper { display: flex; gap: 10px; margin-bottom: 15px; }
.gender-box { flex: 1; padding: 10px; text-align: center; border-radius: 10px; cursor: pointer; font-weight: 600; border: 2px solid transparent; transition: 0.3s ease; }
.gender-box.male { background: #e0f2fe; color: #1d4ed8; }
.gender-box.male.active { background: #1d4ed8; color: white; border: 2px solid #1e40af; }
.gender-box.female { background: #fce7f3; color: #db2777; }
.gender-box.female.active { background: #db2777; color: white; border: 2px solid #be185d; }

.confirm-btn { width: 100%; padding: 14px; background: linear-gradient(135deg, #0f2a47, #1e3a5f); color: white; border: none; border-radius: 12px; font-size: 16px; font-weight: bold; cursor: pointer; }
.back-btn { position: absolute; top: 20px; left: 20px; z-index: 100; width: 40px; height: 40px; border-radius: 50%; border: none; background: #eef3fb; display: flex; justify-content: center; align-items: center; cursor: pointer; color: #0f2a47; }

@media (min-width: 1024px) {
    .card { max-width: 1000px; padding: 40px; }
    .grid-2-col { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; }
    .input-field { margin-bottom: 0; }
    .flex-row-desktop { display: flex; gap: 30px; margin-bottom: 20px; }
    .flex-item { flex: 1; }
    .confirm-btn { width: 200px; margin: 0 auto; display: block; }
}
</style>