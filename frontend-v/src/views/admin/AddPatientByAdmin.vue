<template>
    <div class="main-layout">

        <!-- OVERLAY -->
        <Transition name="fade">
            <div v-if="isDrawerOpen" class="drawer-overlay" @click="isDrawerOpen = false"></div>
        </Transition>

        <!-- SIDEBAR -->
        <Transition name="slide">
            <aside v-if="isDrawerOpen" class="side-drawer">
                <div class="drawer-header">
                    <div class="drawer-user-info">
                        <div class="avatar-circle">
                            <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24">
                                <path fill="white"
                                    d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10s10-4.48 10-10S17.52 2 12 2m0 4c1.93 0 3.5 1.57 3.5 3.5S13.93 13 12 13s-3.5-1.57-3.5-3.5S10.07 6 12 6m0 14c-2.03 0-4.43-.82-6.14-2.88a9.947 9.947 0 0 1 12.28 0C16.43 19.18 14.03 20 12 20" />
                            </svg>
                        </div>
                        <div class="user-meta">
                            <span class="drawer-license">{{ userLicense }}</span>
                            <span class="drawer-day">Admin</span>
                        </div>
                    </div>
                </div>
                <nav class="drawer-menu">
                    <div class="menu-item" @click="goHome">
                        <span class="material-icons">home</span>
                        <span class="menu-text">Home</span>
                    </div>
                    <div class="menu-item" @click="isDrawerOpen = false">
                        <span class="material-icons">person_add</span>
                        <span class="menu-text">Add Patient</span>
                    </div>
                </nav>
            </aside>
        </Transition>

        <!-- LOGOUT MODAL -->
        <Transition name="fade">
            <div v-if="isLogoutModalOpen" class="modal-overlay-center">
                <div class="white-modal-card">
                    <h2 class="modal-msg-title">Are you sure you want to log out?</h2>
                    <div class="modal-button-group">
                        <button class="btn-cancel-blue" @click="isLogoutModalOpen = false">Cancel</button>
                        <button class="btn-confirm-green" @click="handleLogout">Confirm</button>
                    </div>
                </div>
            </div>
        </Transition>

        <!-- TOP BAR -->
        <header class="top-nav">
            <div class="user-group" @click="isDrawerOpen = true">
                <div class="avatar-circle small">
                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24">
                        <path fill="white"
                            d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10s10-4.48 10-10S17.52 2 12 2m0 4c1.93 0 3.5 1.57 3.5 3.5S13.93 13 12 13s-3.5-1.57-3.5-3.5S10.07 6 12 6m0 14c-2.03 0-4.43-.82-6.14-2.88a9.947 9.947 0 0 1 12.28 0C16.43 19.18 14.03 20 12 20" />
                    </svg>
                </div>
                <span class="license-text">{{ userLicense }}</span>
            </div>
            <button class="nav-back-btn" @click="router.push('/admin-home')">
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24">
                    <path fill="white" d="M20 11H7.83l5.59-5.59L12 4l-8 8l8 8l1.41-1.41L7.83 13H20z"/>
                </svg>
                <span>Back</span>
            </button>
            <button class="logout-btn" @click="isLogoutModalOpen = true">
                <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24">
                    <path fill="white"
                        d="M5 21q-.825 0-1.412-.587T3 19V5q0-.825.588-1.412T5 3h6q.425 0 .713.288T12 4t-.288.713T11 5H5v14h6q.425 0 .713.288T12 20t-.288.713T11 21zm12.175-8H10q-.425 0-.712-.288T9 12t.288-.712T10 11h7.175L15.3 9.125q-.275-.275-.275-.675t.275-.7.7-.313t.725.288L20.3 11.3q.3.3.3.7t-.3.7l-3.575 3.575q-.3.3-.712.288t-.713-.313q-.275-.3-.262-.712t.287-.688z" />
                </svg>
            </button>
        </header>

        <!-- PAGE CONTENT -->
        <div class="dashboard-container">

            <h2 class="page-title">Add Surgery Queue</h2>

            <!-- Patient Information -->
            <h3 class="section-title">Patient Information</h3>

            <div class="grid-4">
                <input type="text" placeholder="Full Name" v-model="form.fullName" />

                <!-- HN + autofill -->
                <div style="position: relative;">
                    <input type="text" placeholder="HN Number" v-model="form.hn" @blur="lookupHN" />
                    <span v-if="hnStatus === 'loading'"
                        style="position:absolute;right:10px;top:14px;font-size:11px;color:#888">⏳</span>
                    <span v-if="hnStatus === 'found'"
                        style="position:absolute;right:10px;top:14px;font-size:11px;color:#2e7d32">✅ พบข้อมูล</span>
                    <span v-if="hnStatus === 'notfound'"
                        style="position:absolute;right:10px;top:14px;font-size:11px;color:#888">👤 ใหม่</span>
                </div>

                <input type="number" placeholder="Age" v-model="form.age" readonly class="age-read-only" :title="form.dob ? 'คำนวณจากวันเกิด' : 'กรอก DOB ก่อน'" />
                <input type="date" v-model="form.dob" :max="todayStr" placeholder="Date of Birth" @change="updateAge" />

                <select v-model="form.gender">
                    <option value="">Select Gender</option>
                    <option value="male">Male</option>
                    <option value="female">Female</option>
                </select>
            </div>

            <!-- Medical History -->
            <h3 class="section-title">Medical History</h3>

            <div class="grid-3">
                <input type="text" placeholder="Underlying Disease" v-model="form.disease" />
                <input type="text" placeholder="Drug Allergy" v-model="form.allergy" />
                <select v-model="form.bloodType">
                    <option value="">Select Blood Type</option>
                    <option>A</option>
                    <option>B</option>
                    <option>AB</option>
                    <option>O</option>
                </select>
            </div>

            <textarea rows="4" placeholder="Additional Notes" v-model="form.notes"></textarea>

            <!-- Surgery Detail -->
            <h3 class="section-title">Surgery Detail</h3>

            <div class="grid-4">
                <!-- Dropdown หมอดึงจาก Cloudflare -->
                <select v-model="form.doctorLicense">
                    <option value="">Select Doctor</option>
                    <option v-for="doc in doctors" :key="doc.license" :value="doc.license">
                        {{ doc.doctorName }} ({{ doc.license }})
                    </option>
                </select>

                <!-- OR Room -->
                <select v-model="form.room">
                    <option value="">Select Operating Room</option>
                    <option>OR-1</option>
                    <option>OR-2</option>
                    <option>OR-3</option>
                </select>

                <!-- Date -->
                <input type="date" v-model="form.date" @change="checkValidDate" />
            </div>

            <div class="form-row-single">
                <select class="input-field" v-model="form.procedure" @change="checkValidDate">
                    <option value="">Select Proposed Procedure</option>
                    <option value="Appendectomy (ผ่าตัดไส้ติ่ง) - 60 min">Appendectomy (ผ่าตัดไส้ติ่ง) - 60 min</option>
                    <option value="Laparoscopic Cholecystectomy / LC - 120 min">Laparoscopic Cholecystectomy / LC - 120 min</option>
                    <option value="Cesarean Section / C-Section - 60 min">Cesarean Section / C-Section - 60 min</option>
                    <option value="Herniorrhaphy (ผ่าตัดไส้เลื่อน) - 90 min">Herniorrhaphy (ผ่าตัดไส้เลื่อน) - 90 min</option>
                    <option value="Total Knee Arthroplasty / TKA - 180 min">Total Knee Arthroplasty / TKA - 180 min</option>
                    <option value="Thyroidectomy (ผ่าตัดต่อมไทรอยด์) - 120 min">Thyroidectomy (ผ่าตัดต่อมไทรอยด์) - 120 min</option>
                    <option value="Modified Radical Mastectomy / MRM - 120 min">Modified Radical Mastectomy / MRM - 120 min</option>
                    <option value="Cataract Surgery (ผ่าตัดต้อกระจก) - 30 min">Cataract Surgery (ผ่าตัดต้อกระจก) - 30 min</option>
                    <option value="Hemorrhoidectomy (ผ่าตัดริดสีดวง) - 45 min">Hemorrhoidectomy (ผ่าตัดริดสีดวง) - 45 min</option>
                    <option value="Exploratory Laparotomy (เปิดช่องท้อง) - 180 min">Exploratory Laparotomy (เปิดช่องท้อง) - 180 min</option>
                </select>
            </div>

            <div class="btn-container">
                <button class="primary-btn" @click="handleSubmit">
                    Add Queue
                </button>
            </div>

        </div>
    </div>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue'
import { useRouter } from 'vue-router'

const router = useRouter()
const isDrawerOpen = ref(false)
const isLogoutModalOpen = ref(false)
const userLicense = ref('Admin')
const doctors = ref([])
const hnStatus = ref('') // '', 'loading', 'found', 'notfound'

// ดึงรายชื่อหมอจาก Cloudflare
onMounted(async () => {
    userLicense.value = localStorage.getItem('userLicense') || 'Admin'
    try {
        const res = await fetch('https://or-room-backend.rockzee2018.workers.dev/api/users')
        const data = await res.json()
        doctors.value = Array.isArray(data) ? data.filter(u => u.role !== 'admin') : []
    } catch (e) {
        console.error('ดึงรายชื่อหมอไม่สำเร็จ', e)
    }
})

const today = new Date()
today.setHours(0, 0, 0, 0)
const offset = today.getTimezoneOffset() * 60000
const todayStr = new Date(today.getTime() - offset).toISOString().split('T')[0]

const form = reactive({
    fullName: '', hn: '', age: '', dob: '', gender: '',
    disease: '', allergy: '', bloodType: '',
    notes: '', doctorLicense: '', room: '',
    date: '', procedure: '', urgency: 'Normal',
    isNpoRisk: false, isInfected: false
})

const updateAge = () => {
    if (!form.dob) return
    const birth = new Date(form.dob)
    const ref = form.date ? new Date(form.date) : new Date()
    let age = ref.getFullYear() - birth.getFullYear()
    const m = ref.getMonth() - birth.getMonth()
    if (m < 0 || (m === 0 && ref.getDate() < birth.getDate())) age--
    form.age = age >= 0 ? age : 0
}

// autofill ข้อมูลผู้ป่วยเก่าจาก HN
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
            if (p.dob) { form.dob = p.dob; updateAge() }
            else if (p.age) form.age = p.age
            hnStatus.value = 'found'
        } else {
            hnStatus.value = 'notfound'
        }
    } catch (e) {
        hnStatus.value = 'notfound'
    }
}

// เช็ค 7 ชั่วโมง (420 นาที) รวมทุกหมอ
const checkValidDate = async () => {
    if (!form.date || !form.procedure) return
    try {
        const res = await fetch('https://or-room-backend.rockzee2018.workers.dev/api/bookings')
        const allBookings = await res.json()
        const sameDayBookings = allBookings.filter(b => b.date === form.date && b.status !== 'Succeed')
        const usedMinutes = sameDayBookings.reduce((sum, b) => {
            const match = b.procedure?.match(/(\d+)\s*min/)
            return sum + (match ? parseInt(match[1]) : 0)
        }, 0)
        const match = form.procedure?.match(/(\d+)\s*min/)
        const newProcMin = match ? parseInt(match[1]) : 0
        if (usedMinutes + newProcMin > 420) {
            const remaining = 420 - usedMinutes
            alert(`❌ วันที่ ${form.date} มีเวลาเหลือแค่ ${remaining} นาที\nแต่ procedure นี้ใช้ ${newProcMin} นาที\nกรุณาเลือกวันอื่น`)
            form.date = ''
        }
    } catch(e) {
        console.error('เช็คความจุไม่สำเร็จ', e)
    }
}

const handleSubmit = async () => {
    if (!form.fullName || !form.hn || !form.doctorLicense || !form.date || !form.procedure) {
        alert('กรุณากรอกข้อมูลให้ครบ (ชื่อ, HN, หมอ, วันที่, และหัตถการ)')
        return
    }
    try {
        const res = await fetch('https://or-room-backend.rockzee2018.workers.dev/api/bookings', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                hn: form.hn,
                fullName: form.fullName,
                dob: form.dob,
                age: form.age,
                gender: form.gender,
                procedure: form.procedure,
                date: form.date,
                urgency: 'Normal',
                isNpoRisk: 0,
                isInfected: 0,
                underlying: form.disease,
                notes: form.notes,
                doctorLicense: form.doctorLicense
            })
        })
        if (!res.ok) throw new Error()
        alert('✅ เพิ่มคิวสำเร็จ')
        router.push('/admin-home')
    } catch (e) {
        alert('❌ เพิ่มคิวไม่สำเร็จ')
    }
}

const goHome = () => {
    isDrawerOpen.value = false
    router.push('/admin-home')
}

const handleLogout = () => {
    localStorage.clear()
    router.push('/login')
}
</script>

<style scoped>
@import url('https://fonts.googleapis.com/icon?family=Material+Icons');

.main-layout {
    min-height: 100vh;
    display: flex;
    flex-direction: column;
    background-color: #f5f7fa;
}

.top-nav,
.drawer-header {
    background-color: #1a3a5f;
    height: 80px;
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 0 20px;
}

.side-drawer {
    position: fixed;
    top: 0;
    left: 0;
    width: 280px;
    height: 100vh;
    background-color: #ffffff;
    z-index: 3000;
    box-shadow: 4px 0 20px rgba(0, 0, 0, 0.1);
}

.drawer-overlay {
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: rgba(0, 0, 0, 0.3);
    z-index: 2500;
}

.drawer-user-info {
    display: flex;
    align-items: center;
    gap: 16px;
    color: white;
}

.user-meta {
    display: flex;
    flex-direction: column;
}

.drawer-license {
    font-size: 1.1rem;
    font-weight: 600;
}

.drawer-day {
    font-size: 0.8rem;
    opacity: 0.8;
}

.drawer-menu {
    padding: 15px 0;
}

.menu-item {
    display: flex;
    align-items: center;
    gap: 20px;
    padding: 15px 25px;
    color: #4a6fa5;
    cursor: pointer;
}

.menu-item:hover {
    background-color: #e6effa;
}

.menu-text {
    font-size: 15px;
    font-weight: 500;
}

.avatar-circle {
    width: 48px;
    height: 48px;
    border: 2px solid white;
    border-radius: 50%;
    display: flex;
    justify-content: center;
    align-items: center;
}

.avatar-circle.small {
    width: 32px;
    height: 32px;
    border-width: 1px;
}

.user-group {
    display: flex;
    align-items: center;
    gap: 10px;
    cursor: pointer;
    color: white;
}

.license-text {
    font-size: 15px;
    font-weight: 500;
    color: white;
}

.nav-back-btn { display: flex; align-items: center; gap: 6px; background: rgba(255,255,255,0.18); border: 1.5px solid rgba(255,255,255,0.35); color: white; padding: 7px 14px; border-radius: 20px; font-size: 13px; font-weight: 600; cursor: pointer; margin-left: auto; margin-right: 10px; transition: background 0.2s; }
.nav-back-btn:hover { background: rgba(255,255,255,0.28); }
.logout-btn {
    background: transparent;
    border: none;
    cursor: pointer;
    display: flex;
    align-items: center;
}

/* PAGE CONTENT */
.dashboard-container {
    padding: 40px 60px;
    max-width: 1200px;
    margin: 0 auto;
    width: 100%;
    box-sizing: border-box;
}

.page-title {
    font-size: 26px;
    font-weight: 600;
    margin-bottom: 10px;
    color: #1f3a66;
}

.section-title {
    font-size: 18px;
    font-weight: 600;
    margin-top: 40px;
    margin-bottom: 20px;
    color: #1f3a66;
}

.age-read-only { background: #f0f4f8; color: #555; cursor: not-allowed; }
.grid-4 {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 20px;
}

.grid-3 {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 20px;
}

input,
select,
textarea {
    width: 100%;
    padding: 13px 14px;
    border-radius: 10px;
    border: 1px solid #d7dde7;
    font-size: 14px;
    background: white;
    transition: 0.2s;
    box-sizing: border-box;
}

input:focus,
select:focus,
textarea:focus {
    outline: none;
    border-color: #1f3a66;
    box-shadow: 0 0 0 2px rgba(31, 58, 102, 0.1);
}

textarea {
    margin-top: 25px;
    resize: none;
    width: 100%;
}

.input-field {
    margin-top: 10px;
}

.checkbox-group {
    display: flex;
    gap: 20px;
    margin-top: 20px;
}

.checkbox-item {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 10px 20px;
    border-radius: 10px;
    border: 2px solid #d7dde7;
    cursor: pointer;
    font-size: 14px;
    font-weight: 500;
    color: #555;
    background: white;
    transition: 0.2s;
    user-select: none;
}

.checkbox-item input[type="checkbox"] {
    width: 16px;
    height: 16px;
    cursor: pointer;
    padding: 0;
    margin: 0;
    border: none;
    box-shadow: none;
}

.checkbox-item:hover {
    border-color: #1f3a66;
}

.checked-npo {
    border-color: #f9a825;
    background: #fffde7;
    color: #f57f17;
}

.checked-inf {
    border-color: #e53935;
    background: #fce4ec;
    color: #c62828;
}

.btn-container {
    display: flex;
    justify-content: flex-end;
    margin-top: 30px;
    margin-bottom: 40px;
}

.primary-btn {
    background: #1f3a66;
    color: white;
    padding: 12px 30px;
    border: none;
    border-radius: 8px;
    font-size: 14px;
    font-weight: 500;
    cursor: pointer;
    transition: 0.2s;
}

.primary-btn:hover {
    background: #162c4d;
}

/* MODAL */
.modal-overlay-center {
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    display: flex;
    justify-content: center;
    align-items: center;
    z-index: 4000;
    background: rgba(0, 0, 0, 0.4);
}

.white-modal-card {
    background: white;
    width: 90%;
    max-width: 320px;
    padding: 30px 20px;
    border-radius: 24px;
    text-align: center;
    box-shadow: 0 10px 25px rgba(0, 0, 0, 0.2);
}

.modal-msg-title {
    color: #2c4c87;
    font-size: 1.1rem;
    margin-bottom: 25px;
}

.modal-button-group {
    display: flex;
    justify-content: center;
    gap: 15px;
}

.btn-confirm-green {
    background-color: #03c172;
    color: white;
    border: none;
    padding: 10px 25px;
    border-radius: 12px;
    font-weight: bold;
    cursor: pointer;
}

.btn-cancel-blue {
    background-color: #6a92d4;
    color: white;
    border: none;
    padding: 10px 25px;
    border-radius: 12px;
    font-weight: bold;
    cursor: pointer;
}

/* TRANSITIONS */
.slide-enter-active,
.slide-leave-active {
    transition: transform 0.3s ease;
}

.slide-enter-from,
.slide-leave-to {
    transform: translateX(-100%);
}

.fade-enter-active,
.fade-leave-active {
    transition: opacity 0.2s;
}

.fade-enter-from,
.fade-leave-to {
    opacity: 0;
}

/* RESPONSIVE */
@media (max-width: 900px) {
    .grid-4,
    .grid-3 {
        grid-template-columns: repeat(2, 1fr);
    }
}

@media (max-width: 600px) {
    .dashboard-container {
        padding: 25px 18px;
    }

    .grid-4,
    .grid-3 {
        grid-template-columns: 1fr;
    }

    .btn-container {
        justify-content: center;
    }
}
</style>