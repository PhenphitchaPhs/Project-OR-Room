<template>
    <div class="main-layout">
        <Transition name="fade">
            <div v-if="isDrawerOpen || isDayModalOpen || isLogoutModalOpen || isDeleteAccModalOpen"
                class="drawer-overlay" @click="closeAllOverlays"></div>
        </Transition>

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
                            <span class="drawer-day">{{ selectedDay }}</span>
                        </div>
                    </div>
                </div>
                <nav class="drawer-menu">
                    <div class="menu-item" @click="openDayModal">
                        <span class="material-icons">sync_alt</span>
                        <span class="menu-text">Change days</span>
                    </div>
                    <div class="menu-item" @click="goToCalendar">
                        <span class="material-icons">calendar_today</span>
                        <span class="menu-text">Calendar</span>
                    </div>
                    <div class="menu-item delete-acc-btn" @click="isDeleteAccModalOpen = true">
                        <span class="material-icons">delete</span>
                        <span class="menu-text">Delete Account</span>
                    </div>
                </nav>
            </aside>
        </Transition>

        <Transition name="fade">
            <div v-if="isDayModalOpen" class="modal-overlay-center">
                <div class="day-modal-card">
                    <h2 class="day-modal-title">Choose your day</h2>
                    <div class="days-list">
                        <div v-for="day in daysOfWeek" :key="day" class="day-option" @click="tempSelectedDay = day">
                            <span :class="{ 'active-day-text': tempSelectedDay === day }">{{ day }}</span>
                            <div class="checkbox-box">
                                <span v-if="tempSelectedDay === day" class="material-icons check-icon">check</span>
                            </div>
                        </div>
                    </div>
                    <div class="day-modal-footer">
                        <button class="btn-confirm-day" @click="confirmDayChange">Confirm</button>
                    </div>
                </div>
            </div>
        </Transition>

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

        <Transition name="fade">
            <div v-if="isDeleteAccModalOpen" class="modal-overlay-center">
                <div class="white-modal-card">
                    <div class="warning-icon">⚠️</div>
                    <h2 class="modal-msg-title red-text">Delete Account?</h2>
                    <p class="modal-desc">All your surgery data will be permanently removed.</p>
                    <div class="modal-button-group">
                        <button class="btn-cancel-gray" @click="isDeleteAccModalOpen = false">Cancel</button>
                        <button class="btn-confirm-red" @click="handleDeleteAccount">Delete</button>
                    </div>
                </div>
            </div>
        </Transition>

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
            <button class="logout-btn" @click="isLogoutModalOpen = true">
                <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24">
                    <path fill="white"
                        d="M5 21q-.825 0-1.412-.587T3 19V5q0-.825.588-1.412T5 3h6q.425 0 .713.288T12 4t-.288.713T11 5H5v14h6q.425 0 .713.288T12 20t-.288.713T11 21zm12.175-8H10q-.425 0-.712-.288T9 12t.288-.712T10 11h7.175L15.3 9.125q-.275-.275-.275-.675t.275-.7.7-.313t.725.288L20.3 11.3q.3.3.3.7t-.3.7l-3.575 3.575q-.3.3-.712.288t-.713-.313q-.275-.3-.262-.712t.287-.688z" />
                </svg>
            </button>
        </header>

        <div class="dashboard-container">
            <h1 class="main-title">Surgery Queue Management</h1>

            <div class="queue-card">
                <div class="queue-filter">
                    <button :class="{ active: filter === 'upcoming' }" @click="filter = 'upcoming'">Upcoming</button>
                    <button :class="{ active: filter === 'past' }" @click="filter = 'past'">Past</button>
                    <button :class="{ active: filter === 'all' }" @click="filter = 'all'">All</button>
                </div>

                <div class="tab-content-wrapper">
                    <Transition name="tab-fade" mode="out-in">
                        <div :key="filter" class="empty-state">
                            <div class="icon-wrap">
                                <span class="material-icons">
                                    {{ filter === 'upcoming' ? 'assignment' : (filter === 'past' ? 'history' :
                                        'view_list') }}
                                </span>
                            </div>

                            <h3>
                                {{ filter === 'upcoming' ? 'No upcoming surgery cases' :
                                    (filter === 'past' ? 'No past surgery history' : 'No records found') }}
                            </h3>

                            <p class="sub-text">Please ensure all patient records are updated.</p>

                            <button class="add-btn" @click="goAddPatient">
                                <span class="material-icons">add</span> Add Patient
                            </button>
                        </div>
                    </Transition>
                </div>
            </div>

            <div class="info-section">
                <div class="info-header">
                    <span class="material-icons info-icon">info</span>
                    <h3>Additional Information</h3>
                </div>
                <ul class="info-list">
                    <li>
                        <span class="material-icons check-bullet">check</span>
                        Cases can be canceled before surgery date.
                    </li>
                    <li>
                        <span class="material-icons check-bullet">check</span>
                        Please arrive on time for the convenience of everyone.
                    </li>
                    <li>
                        <span class="material-icons check-bullet">check</span>
                        If there is a problem, please contact staff.
                    </li>
                </ul>
            </div>
        </div>
    </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'

const router = useRouter()
const userLicense = ref('123546')
const filter = ref('upcoming') // เพิ่มตัวแปร filter สำหรับ UI

// State สำหรับเปิด-ปิด Modal ต่างๆ
const isDrawerOpen = ref(false)
const isDayModalOpen = ref(false)
const isLogoutModalOpen = ref(false)
const isDeleteAccModalOpen = ref(false)

const selectedDay = ref('Monday')
const tempSelectedDay = ref('Monday')
const daysOfWeek = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday']

onMounted(() => {
    const saved = localStorage.getItem('userLicense')
    if (saved) userLicense.value = saved
})

const openDayModal = () => {
    isDrawerOpen.value = false
    tempSelectedDay.value = selectedDay.value
    isDayModalOpen.value = true
}

const confirmDayChange = () => {
    selectedDay.value = tempSelectedDay.value
    isDayModalOpen.value = false
}

const closeAllOverlays = () => {
    isDrawerOpen.value = false
    isDayModalOpen.value = false
    isLogoutModalOpen.value = false
    isDeleteAccModalOpen.value = false
}

const goToCalendar = () => {
    isDrawerOpen.value = false
    router.push('/calendar')
}

const goAddPatient = () => {
    // router.push('/add-patient')
    console.log("Navigating to Add Patient page...");
}

const handleLogout = () => {
    localStorage.removeItem('userLicense')
    router.push('/login')
}

const handleDeleteAccount = () => {
    localStorage.clear()
    router.push('/login')
}
</script>

<style scoped>
@import url('https://fonts.googleapis.com/icon?family=Material+Icons');

/* --- Layout & Basic --- */
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


/* --- Side Drawer (คงของเดิมแต่เปลี่ยนสี) --- */
.side-drawer {
    position: fixed;
    top: 0;
    left: 0;
    width: 280px;
    height: 100vh;
    background-color: #f0f7ff;
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
    font-size: 1.2rem;
    font-weight: 600;
}

.drawer-day {
    font-size: 0.85rem;
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

.delete-acc-btn {
    color: #b80000;
    margin-top: 0px;
}

.user-group {
    display: flex;
    align-items: center;
    gap: 10px;
    cursor: pointer;
    color: white;
}

.logout-btn {
    background: none;
    border: none;
    cursor: pointer;
}

/* --- Main Dashboard Content (UI อัปเดตใหม่) --- */
.dashboard-container {
    padding: 20px;
    flex-grow: 1;
}

.main-title {
    text-align: center;
    color: #1a3a5f;
    font-size: 1.6rem;
    font-weight: bold;
    margin: 30px 0;
}

.queue-card {
    width: 90%;
    max-width: 500px;
    margin: 0 auto 30px auto;
    background: white;
    border-radius: 20px;
    box-shadow: 0 10px 25px rgba(0, 0, 0, 0.05);
    overflow: hidden;
}

.queue-filter {
    display: flex;
    padding: 15px;
    gap: 10px;
    background: #f8f9fa;
}

.queue-filter button {
    flex: 1;
    padding: 10px 0;
    border-radius: 10px;
    border: 1px solid #eee;
    background: white;
    color: #444;
    font-weight: 600;
    cursor: pointer;
    transition: 0.3s;
}

.queue-filter button.active {
    background: #1a3a5f;
    color: white;
    border-color: #1a3a5f;
}

.empty-state {
    text-align: center;
    padding: 60px 20px;
}

.icon-wrap {
    width: 70px;
    height: 70px;
    background: #f0f2f5;
    border-radius: 50%;
    display: flex;
    justify-content: center;
    align-items: center;
    margin: 0 auto 20px auto;
}

.icon-wrap .material-icons {
    font-size: 35px;
    color: #90a4ae;
}

.empty-state h3 {
    color: #333;
    font-size: 1.2rem;
    margin-bottom: 8px;
}

.sub-text {
    color: #888;
    font-size: 0.9rem;
    margin-bottom: 30px;
}

.add-btn {
    background: #1a3a5f;
    color: white;
    border: none;
    padding: 12px 35px;
    border-radius: 12px;
    font-weight: bold;
    display: inline-flex;
    align-items: center;
    gap: 8px;
    cursor: pointer;
    box-shadow: 0 4px 12px rgba(26, 58, 95, 0.3);
    transition: transform 0.2s;
}

.add-btn:hover {
    transform: translateY(-2px);
}

/* --- Info Section อัปเดตใหม่ตามวาด --- */
.info-section {
    max-width: 500px;
    margin: 0 auto 50px auto;
    background: #eef2f7;
    padding: 20px;
    border-radius: 16px;
}

.info-header {
    display: flex;
    align-items: center;
    gap: 8px;
    margin-bottom: 15px;
    color: #1a3a5f;
}



.info-header h3 {
    font-size: 1.1rem;
    font-weight: bold;
    margin: 0;
}



.info-list {
    list-style: none;
    padding: 0;
    margin: 0;
}

.info-list li {
    display: flex;
    align-items: flex-start;
    gap: 10px;
    margin-bottom: 12px;
    color: #4a5e75;
    font-size: 0.95rem;
}

.check-bullet {
    font-size: 18px;
    color: #1a3a5f;
    margin-top: 2px;
}

/* --- Modals & Transitions (ของเดิมทั้งหมด) --- */
.drawer-overlay {
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: rgba(0, 0, 0, 0.3);
    z-index: 2500;
}

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

.day-modal-card {
    background-color: #e3f2fd;
    width: 90%;
    max-width: 340px;
    padding: 30px;
    border-radius: 24px;
}

.day-modal-title {
    color: #2c4c87;
    text-align: center;
    margin-bottom: 20px;
}

.day-option {
    display: flex;
    justify-content: space-between;
    padding: 12px;
    color: #6a92d4;
    cursor: pointer;
}

.active-day-text {
    color: #2c4c87;
    font-weight: bold;
}

.checkbox-box {
    width: 22px;
    height: 22px;
    border: 2px solid #2c4c87;
    border-radius: 4px;
    background: white;
    display: flex;
    justify-content: center;
    align-items: center;
}

.check-icon {
    color: #2c4c87;
    font-size: 18px;
}

.btn-confirm-day {
    background: #2c4c87;
    color: white;
    border: none;
    padding: 10px 25px;
    border-radius: 12px;
    cursor: pointer;
    float: right;
    margin-top: 15px;
}

.modal-msg-title {
    color: #2c4c87;
    font-size: 1.1rem;
    margin-bottom: 25px;
}

.red-text {
    color: #d50000;
    font-weight: bold;
}

.modal-desc {
    font-size: 0.85rem;
    color: #666;
    margin-top: -15px;
    margin-bottom: 25px;
}

.warning-icon {
    font-size: 2.5rem;
    margin-bottom: 10px;
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

.btn-confirm-red {
    background-color: #d50000;
    color: white;
    border: none;
    padding: 10px 25px;
    border-radius: 12px;
    font-weight: bold;
    cursor: pointer;
}

.btn-cancel-gray {
    background-color: #eee;
    color: #666;
    border: none;
    padding: 10px 25px;
    border-radius: 12px;
    font-weight: bold;
    cursor: pointer;
}

/* Transitions */
.slide-enter-active,
.slide-leave-active {
    transition: 0.3s;
}

.slide-enter-from,
.slide-leave-to {
    transform: translateX(-100%);
}

.fade-enter-active,
.fade-leave-active {
    transition: 0.3s;
}

.fade-enter-from,
.fade-leave-to {
    opacity: 0;
}
</style>