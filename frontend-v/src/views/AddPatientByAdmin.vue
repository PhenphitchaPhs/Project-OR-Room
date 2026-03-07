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

                    <div class="menu-item" @click="goToAddPatient">
                        <span class="material-icons">person_add</span>
                        <span class="menu-text">Add Patient</span>
                    </div>
                </nav>
            </aside>
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
                <span class="license-text">Admin</span>
            </div>
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
                <input type="text" placeholder="HN Number" v-model="form.hn" />
                <input type="number" placeholder="Age" v-model="form.age" />

                <select v-model="form.gender">
                    <option value="">Select Gender</option>
                    <option>Male</option>
                    <option>Female</option>
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

            <div class="grid-4"> <input type="text" placeholder="Doctor License (5 digits)" v-model="form.license" />
                <input type="text" placeholder="Doctor Name" v-model="form.doctor" />
                <select v-model="form.room">
                    <option value="">Select Operating Room</option>
                    <option>OR-1</option>
                    <option>OR-2</option>
                    <option>OR-3</option>
                </select>
                <input type="date" v-model="form.date" />
            </div>

            <div class="form-row-single">
                <select class="input-field" v-model="form.procedure">
                    <option value="">Select Proposed Procedure</option>
                    <option value="LC">LC (120 min)</option>
                    <option value="MRM">MRM (90 min)</option>
                    <option value="Thyroidectomy">Thyroidectomy (90 min)</option>
                    <option value="Herniorrhaphy">Herniorrhaphy (40 min)</option>
                    <option value="LAR">LAR (180 min)</option>
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

import { ref, reactive } from 'vue'
import { useRouter } from 'vue-router'

const router = useRouter()

const isDrawerOpen = ref(false)

const goHome = () => {
    router.push('/admin-home')
}

const form = reactive({
    fullName: '',
    hn: '',
    age: '',
    gender: '',
    disease: '',
    allergy: '',
    bloodType: '',
    notes: '',
    license: '',
    doctor: '',
    room: '',
    date: '',
    procedure: ''
})

const handleSubmit = () => {

    if (!form.fullName || !form.hn) {
        alert("Please fill patient information")
        return
    }

    const newCase = {
        id: Date.now(),
        date: form.date,
        room: form.room,
        patientName: form.fullName,
        doctor: form.doctor,
        procedure: form.procedure,
        hn: form.hn,
        fullName: form.fullName,
        age: form.age,
        gender: form.gender,
        underlying: form.disease,
        notes: form.notes,
        status: 'Upcoming'
    }

    const existingCases = JSON.parse(localStorage.getItem('bookings')) || []

    existingCases.push(newCase)

    localStorage.setItem('bookings', JSON.stringify(existingCases))

    alert("Queue added successfully")

    router.push('/admin-home')
}
</script>











<style scoped>
/* ===== Layout ===== */
.form-section {
    margin-bottom: 28px;
}

textarea {
    margin-top: 20px;
    margin-bottom: 10px;
}

.main-layout {
    display: flex;
    flex-direction: column;
    min-height: 100vh;
    background: #eef2f7;
}

/* ===== TOP NAVBAR ===== */

.main-layout {
    min-height: 100vh;
    display: flex;
    flex-direction: column;
    background-color: #f5f7fa;
    /* พื้นหลังเทาอ่อนเพื่อให้การ์ดเด่น */
}

/* --- สี Navy Blue สำหรับ Top Nav & Drawer --- */
.top-nav,
.drawer-header {
    background-color: #1a3a5f !important;
    /* Navy Blue */
    height: 80px;
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 0 20px;
}

.drawer-user-info {
    display: flex;
    align-items: center;
    gap: 16px;
    color: white;
}

.user-group {
    display: flex;
    align-items: center;
    gap: 10px;
    cursor: pointer;
    color: white;
    flex-wrap: nowrap;
    /* บังคับไม่ให้ขึ้นบรรทัดใหม่ */
}


/* --- Side Drawer (คงของเดิมแต่เปลี่ยนสี) --- */
.side-drawer {
    position: fixed;
    top: 0;
    left: 0;
    width: 280px;
    height: 100vh;
    background-color: #ffffff;
    /* เปลี่ยนเป็นสีขาวให้ดูสะอาดตา หรือตามชอบ */
    z-index: 3000;
    box-shadow: 4px 0 20px rgba(0, 0, 0, 0.1);
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


.license-text {
    font-size: 14px;
    font-weight: 500;
}

/* ===== PAGE CONTENT ===== */

.dashboard-container {
    padding: 40px 60px;
    max-width: 1400px;
    margin: auto;
    width: 100%;
}

/* ===== TITLE ===== */

.page-title {
    font-size: 26px;
    font-weight: 600;
    margin-bottom: 30px;
    color: #1f3a66;
}

.section-title {
    font-size: 18px;
    font-weight: 600;
    margin-top: 30px;
    margin-bottom: 14px;
    color: #1f3a66;
}

/* ===== GRID LAYOUT ===== */

/* ===== GRID LAYOUT (ปรับระยะห่างให้กว้างขึ้นอีก) ===== */

.grid-4 {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 40px;
    /* เพิ่มเป็น 40px เพื่อให้กล่องห่างกันชัดเจน */
}

.grid-3 {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 40px;
    /* เพิ่มเป็น 40px */
}

.grid-5 {
    display: grid;
    grid-template-columns: repeat(5, 1fr);
    gap: 30px;
    /* เพิ่มเป็น 30px (เนื่องจากช่องเยอะ ถ้าห่างเกินไปกล่องจะแคบมากครับ) */
}

/* ปรับระยะห่างระหว่าง Section ให้โดดเด่นขึ้น */
.section-title {
    font-size: 18px;
    font-weight: 600;
    margin-top: 50px;
    /* เว้นที่ว่างด้านบนหัวข้อเพิ่มขึ้น */
    margin-bottom: 25px;
    /* เว้นระยะก่อนเริ่มกล่อง input */
    color: #1f3a66;
}

/* เพิ่มระยะห่างให้กล่องหมายเหตุ (Additional Notes) */
textarea {
    margin-top: 30px;
    /* ให้ห่างจากแถว Underlying Disease/Drug Allergy */
    width: 100%;
    box-sizing: border-box;
}

/* เพิ่มระยะห่างให้หัวข้อ Section จะได้ไม่ติดกับกล่องข้างบน */
.section-title {
    font-size: 18px;
    font-weight: 600;
    margin-top: 40px;
    /* เพิ่มระยะห่างด้านบนหัวข้อ */
    margin-bottom: 20px;
    /* ระยะห่างก่อนถึงกล่อง input */
    color: #1f3a66;
}

/* ทำให้ textarea มีระยะห่างจากกล่องด้านบนชัดเจน */
textarea {
    margin-top: 25px;
    resize: none;
}

/* ===== INPUT ===== */

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
}

input[type="date"] {
    box-sizing: border-box;
    width: 100%;
    max-width: 100%;
}

.input-field {
    margin-top: 10px;
}

input:focus,
select:focus,
textarea:focus {
    outline: none;
    border-color: #1f3a66;
    box-shadow: 0 0 0 2px rgba(31, 58, 102, 0.1);
}

textarea {
    margin-top: 30px;
    resize: none;
}

/* ===== BUTTON ===== */

.btn-container {
    display: flex;
    justify-content: flex-end;
    margin-top: 30px;
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

/* ===== RESPONSIVE ===== */

@media (max-width:1200px) {
    .grid-5 {
        grid-template-columns: repeat(3, 1fr);
    }
}

@media (max-width:900px) {

    .grid-4,
    .grid-3,
    .grid-5 {
        grid-template-columns: repeat(2, 1fr);
    }
}

@media (max-width:600px) {

    .dashboard-container {
        padding: 25px 18px;
    }

    .grid-4,
    .grid-3,
    .grid-5 {
        grid-template-columns: 1fr;
    }

    .btn-container {
        justify-content: center;
    }

}

/* SIDEBAR */

.sidebar {
    position: fixed;
    top: 0;
    left: 0;
    width: 250px;
    height: 100%;
    background: #1f3a5f;
    z-index: 1000;
}

.overlay {
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: rgba(0, 0, 0, 0.3);
    z-index: 900;
}

/* header */

.sidebar-header {
    background: #1f3a66;
    color: white;
    padding: 22px;
    display: flex;
    align-items: center;
    gap: 14px;
}

.avatar {
    width: 50px;
    height: 50px;
    border-radius: 50%;
    border: 2px solid white;
    display: flex;
    align-items: center;
    justify-content: center;
}

.user-info .license {
    font-size: 18px;
    font-weight: 600;
}

.user-info .role {
    font-size: 14px;
    opacity: .8;
}

/* menu */

.menu {
    margin-top: 10px;
}

.menu-item {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 16px 22px;
    color: #3f5e8c;
    cursor: pointer;
    font-size: 16px;
}

.menu-item:hover {
    background: #cdd3db;
}

.dashboard-container {
    padding: 40px 60px;
    max-width: 1200px;
    /* ปรับให้พอดีสายตา */
    margin: 0 auto;
    /* จัดกึ่งกลางหน้าจอเสมอ */
    width: 100%;
    box-sizing: border-box;
    /* ป้องกันกล่องขยายเกินหน้าจอ */
}

.drawer-overlay {
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: rgba(0, 0, 0, 0.3);
    z-index: 5;
}

/* slide animation */

.slide-enter-active,
.slide-leave-active {
    transition: transform .3s ease;
}

.slide-enter-from {
    transform: translateX(-100%);
}

.slide-leave-to {
    transform: translateX(-100%);
}

/* fade overlay */

.fade-enter-active,
.fade-leave-active {
    transition: opacity .2s;
}

.fade-enter-from,
.fade-leave-to {
    opacity: 0;
}

.logout-btn {
    background: transparent;
    border: none;
    cursor: pointer;
    display: flex;
    align-items: center;
}

.surgery-form {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 16px;
}

.surgery-form input,
.surgery-form select {
    width: 100%;
    padding: 12px 14px;
    border-radius: 10px;
    border: 1px solid #d1d5db;
    font-size: 14px;
}

.procedure-field {
    grid-column: span 3;
}

.form-actions {
    display: flex;
    justify-content: flex-end;
    margin-top: 20px;
}

.add-btn {
    background: #243f66;
    color: white;
    padding: 10px 24px;
    border-radius: 10px;
    border: none;
    font-size: 14px;
    cursor: pointer;
}

.add-btn:hover {
    background: #1b3152;
}
</style>