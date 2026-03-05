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
                    <button :class="{ active: filter === FILTERS.UPCOMING }" @click="filter = FILTERS.UPCOMING">
                        Upcoming
                    </button>

                    <button :class="{ active: filter === FILTERS.SUCCEED }" @click="filter = FILTERS.SUCCEED">
                        Succeed
                    </button>
                </div>

                <div class="tab-content-wrapper">

                    <div v-if="filter === FILTERS.UPCOMING">

                        <div v-if="upcomingCases.length === 0" class="empty-state">
                            <div class="icon-wrap">
                                <span class="material-icons">assignment</span>
                            </div>
                            <h3>No upcoming surgery cases</h3>
                            <p class="sub-text">Please ensure all patient records are updated.</p>
                        </div>
                        
                        <div v-else>
                            <div v-for="item in upcomingCases" :key="item.id" class="case-card"
                                @click="toggleDetail(item.id)">

                                <div class="case-grid">

                                    <div class="grid-row">
                                        <span><strong>Surgery Date:</strong> {{ item.date }}</span>
                                        <span><strong>Room:</strong> {{ item.room }}</span>
                                    </div>

                                    <div class="grid-row">
                                        <span><strong>Patient:</strong> {{ item.patientName }}</span>
                                        <span><strong>Procedure:</strong> {{ item.procedure }}</span>
                                    </div>

                                    <div class="grid-row single">
                                        <span><strong>Doctor:</strong> {{ item.doctor }}</span>
                                    </div>

                                </div>

                                <transition name="expand">
                                    <div v-if="expandedId === item.id" class="case-detail">

                                        <div class="detail-row"><strong>HN:</strong> {{ item.hn }}</div>
                                        <div class="detail-row"><strong>Full Name:</strong> {{ item.fullName }}</div>
                                        <div class="detail-row"><strong>Age:</strong> {{ item.age }}</div>
                                        <div>
                                            <strong>Gender:</strong>
                                            {{ item.gender === 'male' ? 'ชาย' : 'หญิง' }}
                                        </div>
                                        <div class="detail-row"><strong>Underlying Disease(s):</strong> {{
                                            item.underlying }}</div>
                                        <div class="detail-row"><strong>Proposed Procedure:</strong> {{ item.procedure
                                            }}</div>
                                        <div class="detail-row"><strong>Date:</strong> {{ item.date }}</div>
                                        <div class="detail-row"><strong>Notes:</strong> {{ item.notes }}</div>

                                    </div>
                                </transition>

                                <div class="case-actions">
                                    <button class="btn-success" @click.stop="markAsSucceed(item.id)">
                                        Succeed
                                    </button>

                                    <button class="btn-delete" @click.stop="deleteCase(item.id)">
                                        Delete
                                    </button>
                                </div>

                            </div>
                        </div>

                        <div class="add-btn-wrapper" :class="{ center: upcomingCases.length === 0 }">
                            <button class="add-btn" @click="goAddPatient">
                                + Add Patient
                            </button>
                        </div>

                    </div>


                    <div v-if="filter === FILTERS.SUCCEED">

                        <div v-if="succeedCases.length === 0" class="empty-state">
                            <div class="icon-wrap">
                                <span class="material-icons">check_circle</span>
                            </div>
                            <h3>No completed surgery cases</h3>
                        </div>

                        <div v-else>
                            <div v-for="item in succeedCases" :key="item.id" class="case-card"
                                @click="openCaseDetail(item)">

                                <div class="case-row top-row">
                                    <span><strong>Surgery Date:</strong> {{ item.date }}</span>
                                    <span><strong>Patient:</strong> {{ item.patientName }}</span>
                                    <span><strong>Room:</strong> {{ item.room }}</span>
                                </div>

                                <div class="case-row">
                                    <span><strong>Doctor:</strong> {{ item.doctor }}</span>
                                    <span><strong>Procedure:</strong> {{ item.procedure }}</span>
                                </div>
                            </div>
                        </div>
                        <div class="clear-wrapper">
                            <div class="clear-wrapper" v-if="succeedCases.length > 0">
                                <button class="clear-btn" @click="clearSucceedCases">
                                    Clear
                                </button>
                            </div>
                        </div>
                    </div>

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
    <button class="floating-add-btn" @click="goAddPatient">
        + Add Patient
    </button>
</template>

<script setup>
import { ref, onMounted, computed } from 'vue'
import { useRouter } from 'vue-router'

const router = useRouter()
const API_URL = 'http://localhost:8787/api/bookings'

// --- State ---
const bookings = ref([])
const userLicense = ref('123546')
const filter = ref('Upcoming')
const expandedId = ref(null)
const isLoading = ref(false)

const FILTERS = {
    UPCOMING: 'Upcoming',
    SUCCEED: 'Succeed'
}

// ================= 1. โหลดข้อมูลจาก Backend =================
const fetchBookings = async () => {
    isLoading.value = true
    try {
        const response = await fetch(API_URL)
        if (!response.ok) throw new Error('API Error')
        const data = await response.json()
        bookings.value = Array.isArray(data) ? data : []
    } catch (error) {
        console.error("❌ ดึงข้อมูลไม่สำเร็จ:", error)
        // Fallback: ถ้าติดต่อ Backend ไม่ได้ ให้ดึงจาก Local ไปก่อน
        const saved = JSON.parse(localStorage.getItem('bookings'))
        bookings.value = Array.isArray(saved) ? saved : []
    } finally {
        isLoading.value = false
    }
}

onMounted(() => {
    const savedLicense = localStorage.getItem('userLicense')
    if (savedLicense) userLicense.value = savedLicense
    fetchBookings() // เรียกดึงข้อมูลจาก Cloudflare ทันทีที่เปิดหน้า
})

// ================= 2. ระบบจัดเรียงคิว (Smart Priority Sorting) =================
const sortCases = (arr) => {
    const urgencyScore = { 'Emergency': 3, 'Urgent': 2, 'Normal': 1 }
    
    return [...arr].sort((a, b) => {
        // 1. เรียงตามวันที่ก่อน (ใกล้วันปัจจุบันที่สุดขึ้นก่อน)
        if (a.date !== b.date) return new Date(a.date) - new Date(b.date)
        
        // 2. กฎเคสติดเชื้อ (Infection): ถ้ามีเชื้อต้องไปคิวสุดท้ายของวัน (อบโอโซนห้อง)
        if (a.isInfected !== b.isInfected) return a.isInfected ? 1 : -1
        
        // 3. กฎความฉุกเฉิน (Urgency): Emergency แซงคิวคนอื่นในระดับเดียวกัน
        const scoreA = urgencyScore[a.urgency] || 0
        const scoreB = urgencyScore[b.urgency] || 0
        if (scoreA !== scoreB) return scoreB - scoreA
        
        // 4. กฎ NPO Risk: ใครต้องงดน้ำงดอาหาร (เด็ก/เบาหวาน) ให้ได้ทำก่อน
        if (a.isNpoRisk !== b.isNpoRisk) return a.isNpoRisk ? -1 : 1
        
        // 5. กฎตามอาจารย์สั่ง: อายุมากได้ก่อน
        if (a.age !== b.age) return b.age - a.age
        
        // 6. กฎตามอาจารย์สั่ง: เพศหญิงได้ก่อน
        if (a.gender !== b.gender) return a.gender === 'female' ? -1 : 1
        
        return 0
    })
}

const upcomingCases = computed(() => 
    sortCases(bookings.value.filter(item => item.status === FILTERS.UPCOMING || !item.status))
)

const succeedCases = computed(() => 
    sortCases(bookings.value.filter(item => item.status === FILTERS.SUCCEED))
)

// ================= 3. Actions (จัดการข้อมูล) =================

const toggleDetail = (id) => {
    expandedId.value = expandedId.value === id ? null : id
}

// ลบเคส (ลบจาก Backend)
const deleteCase = async (id) => {
    const confirmDelete = confirm('ยืนยันการลบเคสนี้จากฐานข้อมูล Cloudflare?')
    if (!confirmDelete) return

    try {
        // อัปเดต UI ทันทีเพื่อความรวดเร็ว
        bookings.value = bookings.value.filter(item => item.id !== id)
        
        // ยิงไปลบที่ Backend (ควรทำ API DELETE ที่ฝั่ง Hono รองรับด้วย)
        await fetch(`${API_URL}/${id}`, { method: 'DELETE' })
    } catch (error) {
        console.error("ลบไม่สำเร็จ:", error)
    }
}

// เปลี่ยนสถานะเป็น Succeed
const markAsSucceed = (id) => {
    const target = bookings.value.find(item => item.id === id)
    if (target) {
        target.status = FILTERS.SUCCEED
        filter.value = FILTERS.SUCCEED
        // หมายเหตุ: เพื่อให้สถานะใน DB เปลี่ยนถาวร ควรเพิ่ม API Update ใน Backend ครับ
    }
}

const clearSucceedCases = () => {
    if (confirm("ต้องการล้างประวัติที่สำเร็จแล้วทั้งหมดหรือไม่?")) {
        bookings.value = bookings.value.filter(item => item.status !== FILTERS.SUCCEED)
    }
}

// ================= 4. Modal / Navigation (เหมือนเดิม) =================
const isDrawerOpen = ref(false)
const isDayModalOpen = ref(false)
const isLogoutModalOpen = ref(false)
const isDeleteAccModalOpen = ref(false)

const selectedDay = ref('Monday')
const tempSelectedDay = ref('Monday')
const daysOfWeek = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday']

const openDayModal = () => { isDrawerOpen.value = false; tempSelectedDay.value = selectedDay.value; isDayModalOpen.value = true }
const confirmDayChange = () => { selectedDay.value = tempSelectedDay.value; isDayModalOpen.value = false }
const closeAllOverlays = () => { isDrawerOpen.value = isDayModalOpen.value = isLogoutModalOpen.value = isDeleteAccModalOpen.value = false }
const goToCalendar = () => { isDrawerOpen.value = false; router.push('/calendar') }
const goAddPatient = () => { isDrawerOpen.value = false; router.push('/booking') }
const handleLogout = () => { localStorage.removeItem('isLoggedIn'); router.push('/login') }
const handleDeleteAccount = () => { localStorage.clear(); router.push('/login') }

// Case Detail Modal
const isDetailModalOpen = ref(false)
const selectedCase = ref(null)
const openCaseDetail = (item) => { selectedCase.value = item; isDetailModalOpen.value = true }
const closeDetailModal = () => { isDetailModalOpen.value = false }
</script>

<style scoped>
@import url('https://fonts.googleapis.com/icon?family=Material+Icons');

/* --- Layout & Basic --- */
.main-layout {
    min-height: 100vh;
    display: flex;
    flex-direction: column;
    background-color: #f5f7fa;
}

/* --- สี Navy Blue สำหรับ Top Nav & Drawer --- */
.top-nav,
.drawer-header {
    background-color: #1a3a5f !important;
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

.case-card {
    background: white;
    padding: 16px;
    border-radius: 12px;
    margin-bottom: 12px;
    margin-block: 10px;
    margin-left: 10px;
    margin-right: 10px;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05);
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
    transition: transform 0.3s ease;
}

.slide-enter-from,
.slide-leave-to {
    transform: translateX(-100%);
}

.slide-enter-to,
.slide-leave-from {
    transform: translateX(0);
}

.fade-enter-active,
.fade-leave-active {
    transition: opacity 0.3s ease;
}

.fade-enter-from,
.fade-leave-to {
    opacity: 0;
}

.top-action {
    margin-bottom: 16px;
    text-align: right;
}

.case-actions {
    margin-top: 12px;
    display: flex;
    gap: 10px;
}

.btn-success {
    background: #2e7d32;
    color: white;
    border: none;
    padding: 6px 12px;
    border-radius: 8px;
    cursor: pointer;
}

.btn-delete {
    background: #c62828;
    color: white;
    border: none;
    padding: 6px 12px;
    border-radius: 8px;
    cursor: pointer;
}

/* ---------- Case Card Professional Style ---------- */

.case-card {
    background: #ffffff;
    padding: 20px;
    border-radius: 16px;
    margin-bottom: 16px;
    border: 1px solid #e4e9f0;
    transition: 0.25s ease;
    cursor: pointer;
}

.case-card:hover {
    box-shadow: 0 8px 24px rgba(0, 0, 0, 0.08);
    transform: translateY(-2px);
}

.case-grid {
    display: flex;
    flex-direction: column;
    gap: 10px;
    font-size: 14px;
    color: #2c3e50;
}

.grid-row {
    display: grid;
    grid-template-columns: 1fr 1fr;
    align-items: center;
}

.grid-row span {
    display: block;
}

.grid-row.single {
    grid-template-columns: 1fr;
}

/* ทำ label ดูบาลานซ์ */
.case-grid strong {
    font-weight: 600;
    margin-right: 4px;
}

.top-row {
    font-weight: 600;
    margin-bottom: 12px;
}

.case-actions {
    display: flex;
    justify-content: flex-end;
    gap: 12px;
    margin-top: 12px;
}

/* ---------- Buttons ---------- */

.btn-success {
    background: #0d47a1;
    color: white;
    border: none;
    padding: 6px 14px;
    border-radius: 8px;
    font-size: 13px;
    cursor: pointer;
}

.btn-success:hover {
    background: #1565c0;
}

.btn-delete {
    background: #b71c1c;
    color: white;
    border: none;
    padding: 6px 14px;
    border-radius: 8px;
    font-size: 13px;
    cursor: pointer;
}

.btn-delete:hover {
    background: #d32f2f;
}

/* ---------- Floating Add Button ---------- */

.floating-add-btn {
    position: fixed;
    bottom: 30px;
    right: 30px;
    background: #1a3a5f;
    color: white;
    border: none;
    padding: 15px 25px;
    border-radius: 30px;
    font-size: 16px;
    font-weight: bold;
    box-shadow: 0 4px 15px rgba(0, 0, 0, 0.2);
    cursor: pointer;
    transition: 0.3s ease;
    z-index: 1000;
}

.floating-add-btn:hover {
    background: #244b7a;
    transform: translateY(-3px);
}

/* ---------- Detail Modal ---------- */

.detail-overlay {
    position: fixed;
    inset: 0;
    background: rgba(0, 0, 0, 0.45);
    display: flex;
    justify-content: center;
    align-items: center;
    z-index: 5000;
}

.detail-card {
    background: white;
    width: 90%;
    max-width: 450px;
    padding: 28px;
    border-radius: 18px;
    box-shadow: 0 12px 30px rgba(0, 0, 0, 0.2);
}

.detail-card h2 {
    margin-bottom: 20px;
    color: #1a3a5f;
}

.detail-grid p {
    margin-bottom: 10px;
    font-size: 14px;
    color: #333;
}

.close-detail-btn {
    margin-top: 20px;
    width: 100%;
    background: #1a3a5f;
    color: white;
    border: none;
    padding: 10px;
    border-radius: 10px;
    cursor: pointer;
}

.add-btn-wrapper {
    display: flex;
    justify-content: center;
    margin-top: 28px;
}

.add-btn {
    background: #1a3a5f;
    color: white;
    border: none;
    padding: 14px 20px;
    border-radius: 40px;
    font-weight: 600;
    font-size: 15px;
    cursor: pointer;
    transition: 0.25s ease;
    box-shadow: 0 8px 20px rgba(0, 0, 0, 0.12);
    margin-block: 10px;
}

.add-btn:hover {
    background: #244b7a;
    transform: translateY(-2px);
}

.case-detail {
    margin-top: 14px;
    padding: 14px;
    background: #f8fafc;
    border-radius: 10px;
    border: 1px solid #e3e8ef;
    font-size: 13px;
    line-height: 1.6;
}

.detail-row {
    margin-bottom: 6px;
}

/* animation */
.expand-enter-active,
.expand-leave-active {
    transition: all 0.25s ease;
}

.expand-enter-from,
.expand-leave-to {
    opacity: 0;
    transform: translateY(-6px);
}

.detail-box {
    margin-top: 15px;
    padding: 15px;
    background: #f5f7fa;
    border-radius: 10px;
    font-size: 14px;
    line-height: 1.6;
    border: 1px solid #e0e6ed;
}

.clear-wrapper {
    display: flex;
    justify-content: flex-end;
    margin: 10px 0;
}

.clear-btn {
    background-color: #ffe500;
    color: white;
    border: none;
    padding: 6px 14px;
    border-radius: 6px;
    cursor: pointer;
    font-weight: 500;
}

.clear-btn:hover {
    background-color: #ffd500;
}
/* 🔥 แก้ไข Checkbox ให้เกาะกลุ่มกันสวยๆ */
.checkbox-group {
    display: flex;
    flex-direction: column;
    gap: 12px;
    padding-left: 10px;
}

.check-label {
    display: flex !important;
    align-items: center !important;
    justify-content: flex-start !important; /* บังคับชิดซ้าย */
    gap: 10px !important; /* ระยะห่างระหว่างกล่องกับข้อความ */
    width: fit-content !important; /* 👈 สำคัญ: ไม่ให้กล่องยาวเต็มบรรทัด */
    cursor: pointer;
}

input[type="checkbox"] {
    width: 20px !important;
    height: 20px !important;
    margin: 0 !important;
    flex-shrink: 0;
}
</style>