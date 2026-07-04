<template>
    <div class="main-layout">
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
                    <h2 class="modal-msg-title">Confirm Logout?</h2>
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
                        <button class="btn-confirm-red" @click="handleDeleteAccount">Cancel</button>
                    </div>
                </div>
            </div>
        </Transition>
        <Transition name="fade">
            <div v-if="isCancelModalOpen" class="modal-overlay-center">
                <div class="white-modal-card">
                    <div class="warning-icon">⚠️</div>
                    <h2 class="modal-msg-title red-text">Cancel Case?</h2>
                    <p class="modal-desc">Are you sure you want to cancel this surgery case?</p>
                    <div class="modal-button-group">
                        <button class="btn-cancel-gray" @click="isCancelModalOpen = false">No</button>
                        <button class="btn-confirm-red" @click="confirmCancelCase">Yes</button>
                    </div>
                </div>
            </div>
        </Transition>


        <header class="top-nav">
            <div class="user-group">
                <div class="avatar-circle small">
                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24">
                        <path fill="white"
                            d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10s10-4.48 10-10S17.52 2 12 2m0 4c1.93 0 3.5 1.57 3.5 3.5S13.93 13 12 13s-3.5-1.57-3.5-3.5S10.07 6 12 6m0 14c-2.03 0-4.43-.82-6.14-2.88a9.947 9.947 0 0 1 12.28 0C16.43 19.18 14.03 20 12 20" />
                    </svg>
                </div>
                <span class="license-text">{{ userLicense }}</span>
            </div>
            <button class="nav-calendar-btn" @click="router.push('/admin-dashboard')">
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24">
                    <path fill="white" d="M3 13h8V3H3zm0 8h8v-6H3zm10 0h8V11h-8zm0-18v6h8V3z" />
                </svg>
                <span>Dashboard</span>
            </button>
            <button class="nav-calendar-btn" @click="router.push('/admin-calendar')">
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24">
                    <path fill="white"
                        d="M19 4h-1V2h-2v2H8V2H6v2H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2m0 16H5V10h14zm0-12H5V6h14z" />
                </svg>
                <span>Calendar</span>
            </button>
            <button class="logout-btn" @click="isLogoutModalOpen = true">
                <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24">
                    <path fill="white"
                        d="M5 21q-.825 0-1.412-.587T3 19V5q0-.825.588-1.412T5 3h6q.425 0 .713.288T12 4t-.288.713T11 5H5v14h6q.425 0 .713.288T12 20t-.288.713T11 21zm12.175-8H10q-.425 0-.712-.288T9 12t.288-.712T10 11h7.175L15.3 9.125q-.275-.275-.275-.675t.275-.7.7-.313t.725.288L20.3 11.3q.3.3.3.7t-.3.7l-3.575 3.575q-.3.3-.712.288t-.713-.313q-.275-.3-.262-.712t.287-.688z" />
                </svg>
            </button>
        </header>

        <div class="dashboard-container">
            <div class="top-toolbar">
                <div class="search-box">
                    <span class="material-icons">search</span>
                    <input v-model="searchQuery" type="text" placeholder="Search HN, Patient, Doctor..." />
                </div>
            </div>

            <h1 class="main-title">Surgery Queue Management</h1>

            <div class="queue-card">
                <div class="queue-filter">
                    <button :class="{ active: filter === FILTERS.TODAY }" @click="filter = FILTERS.TODAY">
                        Today
                    </button>
                    <button :class="{ active: filter === FILTERS.UPCOMING }" @click="filter = FILTERS.UPCOMING">
                        Upcoming
                    </button>

                    <button :class="{ active: filter === FILTERS.PASS }" @click="filter = FILTERS.PASS">
                        Pass
                    </button>
                </div>
                <div v-if="filter === FILTERS.PASS" class="sub-filter">
                    <button :class="{ active: passFilter === 'Completed' }" @click="passFilter = 'Completed'">
                        Completed
                    </button>

                    <button :class="{ active: passFilter === 'Cancelled' }" @click="passFilter = 'Cancelled'">
                        Cancelled
                    </button>
                </div>

                <div class="tab-content-wrapper">
                    <div v-if="filter === FILTERS.TODAY">

                        <div v-if="todayCases.length === 0" class="empty-state">
                            <div class="icon-wrap">
                                <span class="material-icons">today</span>
                            </div>

                            <h3>No surgery cases today</h3>
                        </div>

                        <div v-else>


                            <div v-for="(item, index) in todayCases" :key="item.id" class="case-card drag-item"
                                draggable="true" @dragstart="onDragStart(index, item.id)" @dragover.prevent
                                @drop="onDrop(index)" @click="toggleDetail(item.id)">
                                <div class="case-grid">
                                    <div class="grid-row">

                                        <span><strong>Date:</strong> {{ item.date }}</span>
                                        <span v-if="item.room"
                                            style="color: #1e3a8a; font-weight: bold; display: inline-flex; align-items: center; gap: 4px; justify-self: end;">
                                            <span class="material-icons" style="font-size: 16px;">meeting_room</span>
                                            {{ item.room }}
                                        </span>

                                    </div>
                                    <div class="grid-row">
                                        <span><strong>HN:</strong> {{ item.hn }}</span>

                                    </div>

                                    <div class="grid-row">
                                        <span><strong>Patient:</strong> {{ item.fullName }}</span>
                                        <span><strong>Age:</strong> {{ item.age }}</span>

                                    </div>

                                    <div class="grid-row single">
                                        <span><strong>Procedure:</strong> {{ item.procedure }}</span>
                                    </div>
                                    <div class="grid-row single">
                                        <span>
                                            <strong>Doctor:</strong>
                                            {{ doctorMap[item.doctorLicense] || item.doctorLicense || '-' }}
                                        </span>
                                    </div>


                                </div>
                                <transition name="expand">
                                    <div v-if="expandedId === item.id" class="case-detail">
                                        <div class="detail-row"><strong>HN:</strong> {{ item.hn }}</div>
                                        <div class="detail-row"><strong>Full Name:</strong> {{ item.fullName }}</div>
                                        <div class="detail-row"><strong>Age:</strong> {{ item.age }}</div>
                                        <div><strong>Gender:</strong> {{ item.gender === 'male' ? 'ชาย' : 'หญิง' }}
                                        </div>
                                        <div class="detail-row"><strong>Underlying Disease(s):</strong> {{
                                            item.underlying || '-' }}</div>
                                        <div class="detail-row"><strong>Proposed Procedure:</strong> {{ item.procedure
                                        }}</div>
                                        <div class="detail-row"><strong>Date:</strong> {{ item.date }}</div>
                                        <div class="detail-row"><strong>CXR:</strong> {{ item.cxrDate || '-' }} | {{
                                            item.cxrNote || '-' }}</div>
                                        <div class="detail-row"><strong>ECG:</strong> {{ item.ecgDate || '-' }} | {{
                                            item.ecgNote || '-' }}</div>
                                        <div class="detail-row"><strong>Lab:</strong> {{ item.labDate || '-' }} | {{
                                            item.labNote || '-' }}</div>
                                        <div class="detail-row"><strong>Admission:</strong> {{ item.admDate || '-' }} |
                                            {{ item.admNote || '-' }}</div>
                                        <div class="detail-row"><strong>Notes:</strong> {{ item.notes || '-' }}</div>
                                    </div>
                                </transition>
                                <div class="case-actions">
                                    <!-- อย่าลืมแก้ต้องนี้ให้มันออโต้ฟิลไปหน้าจองเด้อ มันไม่มีสิทธิเข้าถึง #เอไอมึงบอกเพื่อนกุด้วย#  -->
                                    <button class="btn-success"
                                        @click.stop="router.push(`/admin-add-queue/${item.id}`)">
                                        Edit
                                    </button>
                                    <button class="btn-delete" @click.stop="openCancelModal(item.id)">
                                        Cancel
                                    </button>

                                </div>
                                <div class="see-more-toggle">
                                    <span class="see-more-text">
                                        {{ expandedId === item.id ? 'See less' : 'See more' }}
                                    </span>
                                    <span class="material-icons see-more-icon">
                                        {{ expandedId === item.id ? 'expand_less' : 'expand_more' }}
                                    </span>
                                </div>

                            </div>


                        </div>

                    </div>
                    <div v-if="filter === FILTERS.UPCOMING">
                        <div v-if="upcomingCases.length === 0" class="empty-state">
                            <div class="icon-wrap"><span class="material-icons">assignment</span></div>
                            <h3>No upcoming surgery cases</h3>
                            <p class="sub-text">Please ensure all patient records are updated.</p>
                        </div>
                        <div v-else>
                            <div class="reset-wrapper">
                                <button class="btn-reset" @click="resetQueue">
                                    <span class="material-icons">refresh</span> รีเซ็ตลำดับคิว
                                </button>
                            </div>
                            <div v-for="(item, index) in upcomingCases" :key="item.id" class="case-card drag-item"
                                draggable="true" @dragstart="onDragStart(index, item.id)" @dragover.prevent
                                @drop="onDrop(index)" @click="toggleDetail(item.id)">
                                <div class="case-grid">
                                    <div class="grid-row">

                                        <span><strong>Date:</strong> {{ item.date }}</span>
                                        <span v-if="item.room"
                                            style="color: #1e3a8a; font-weight: bold; display: inline-flex; align-items: center; gap: 4px;">
                                            <span class="material-icons" style="font-size: 16px;">meeting_room</span>
                                            {{ item.room }}
                                        </span>

                                    </div>
                                    <div class="grid-row">
                                        <span><strong>HN:</strong> {{ item.hn }}</span>

                                    </div>

                                    <div class="grid-row">
                                        <span><strong>Patient:</strong> {{ item.fullName }}</span>
                                        <span><strong>Age:</strong> {{ item.age }}</span>

                                    </div>

                                    <div class="grid-row single">
                                        <span><strong>Procedure:</strong> {{ item.procedure }}</span>
                                    </div>
                                    <div class="grid-row single">
                                        <span>
                                            <strong>Doctor:</strong>
                                            {{ doctorMap[item.doctorLicense] || item.doctorLicense || '-' }}
                                        </span>
                                    </div>


                                </div>
                                <transition name="expand">
                                    <div v-if="expandedId === item.id" class="case-detail">
                                        <div class="detail-row"><strong>HN:</strong> {{ item.hn }}</div>
                                        <div class="detail-row"><strong>Full Name:</strong> {{ item.fullName }}</div>
                                        <div class="detail-row"><strong>Age:</strong> {{ item.age }}</div>
                                        <div><strong>Gender:</strong> {{ item.gender === 'male' ? 'ชาย' : 'หญิง' }}
                                        </div>
                                        <div class="detail-row"><strong>Underlying Disease(s):</strong> {{
                                            item.underlying || '-' }}</div>
                                        <div class="detail-row"><strong>Proposed Procedure:</strong> {{ item.procedure
                                        }}</div>
                                        <div class="detail-row"><strong>Date:</strong> {{ item.date }}</div>
                                        <div class="detail-row"><strong>CXR:</strong> {{ item.cxrDate || '-' }} | {{
                                            item.cxrNote || '-' }}</div>
                                        <div class="detail-row"><strong>ECG:</strong> {{ item.ecgDate || '-' }} | {{
                                            item.ecgNote || '-' }}</div>
                                        <div class="detail-row"><strong>Lab:</strong> {{ item.labDate || '-' }} | {{
                                            item.labNote || '-' }}</div>
                                        <div class="detail-row"><strong>Admission:</strong> {{ item.admDate || '-' }} |
                                            {{ item.admNote || '-' }}</div>
                                        <div class="detail-row"><strong>Notes:</strong> {{ item.notes || '-' }}</div>
                                    </div>

                                </transition>

                                <div class="case-actions">
                                    <!-- อย่าลืมแก้ต้องนี้ให้มันออโต้ฟิลไปหน้าจองเด้อ มันไม่มีสิทธิเข้าถึง #เอไอมึงบอกเพื่อนกุด้วย#  -->
                                    <button class="btn-edit" @click.stop="router.push(`/admin-add-queue/${item.id}`)">
                                        Edit
                                    </button>
                                    <button class="btn-delete" @click.stop="openCancelModal(item.id)">
                                        Cancel
                                    </button>
                                </div>
                                <div class="see-more-toggle">
                                    <span class="see-more-text">
                                        {{ expandedId === item.id ? 'See less' : 'See more' }}
                                    </span>
                                    <span class="material-icons see-more-icon">
                                        {{ expandedId === item.id ? 'expand_less' : 'expand_more' }}
                                    </span>
                                </div>

                            </div>


                        </div>

                    </div>

                    <div v-if="filter === FILTERS.PASS && passFilter === 'Completed'">
                        <div v-if="completedCases.length === 0" class="empty-state">
                            <div class="icon-wrap"><span class="material-icons">check_circle</span></div>
                            <h3>No completed surgery cases</h3>
                        </div>
                        <div v-else>
                            <div v-for="item in completedCases" :key="item.id" class="case-card succeed-item"
                                @click="toggleDetail(item.id)">
                                <div class="case-grid">
                                    <div class="grid-row">

                                        <span><strong>Date:</strong> {{ item.date }}</span>
                                        <span v-if="item.room"
                                            style="color: #1e3a8a; font-weight: bold; display: inline-flex; align-items: center; gap: 4px;">
                                            <span class="material-icons" style="font-size: 16px;">meeting_room</span>
                                            {{ item.room }}
                                        </span>

                                    </div>
                                    <div class="grid-row">
                                        <span><strong>HN:</strong> {{ item.hn }}</span>

                                    </div>

                                    <div class="grid-row">
                                        <span><strong>Patient:</strong> {{ item.fullName }}</span>
                                        <span><strong>Age:</strong> {{ item.age }}</span>

                                    </div>

                                    <div class="grid-row single">
                                        <span><strong>Procedure:</strong> {{ item.procedure }}</span>
                                    </div>
                                    <div class="grid-row single">
                                        <span>
                                            <strong>Doctor:</strong>
                                            {{ doctorMap[item.doctorLicense] || item.doctorLicense || '-' }}
                                        </span>
                                    </div>


                                </div>
                                <transition name="expand">
                                    <div v-if="expandedId === item.id" class="case-detail">
                                        <div class="detail-row"><strong>HN:</strong> {{ item.hn }}</div>
                                        <div class="detail-row"><strong>Full Name:</strong> {{ item.fullName }}</div>
                                        <div class="detail-row"><strong>Age:</strong> {{ item.age }}</div>
                                        <div><strong>Gender:</strong> {{ item.gender === 'male' ? 'ชาย' : 'หญิง' }}
                                        </div>
                                        <div class="detail-row"><strong>Underlying Disease(s):</strong> {{
                                            item.underlying || '-' }}</div>
                                        <div class="detail-row"><strong>Proposed Procedure:</strong> {{ item.procedure
                                        }}</div>
                                        <div class="detail-row"><strong>Date:</strong> {{ item.date }}</div>
                                        <div class="detail-row"><strong>CXR:</strong> {{ item.cxrDate || '-' }} | {{
                                            item.cxrNote || '-' }}</div>
                                        <div class="detail-row"><strong>ECG:</strong> {{ item.ecgDate || '-' }} | {{
                                            item.ecgNote || '-' }}</div>
                                        <div class="detail-row"><strong>Lab:</strong> {{ item.labDate || '-' }} | {{
                                            item.labNote || '-' }}</div>
                                        <div class="detail-row"><strong>Admission:</strong> {{ item.admDate || '-' }} |
                                            {{ item.admNote || '-' }}</div>
                                        <div class="detail-row"><strong>Notes:</strong> {{ item.notes || '-' }}</div>
                                    </div>

                                </transition>

                                <div class="see-more-toggle">
                                    <span class="see-more-text">
                                        {{ expandedId === item.id ? 'See less' : 'See more' }}
                                    </span>
                                    <span class="material-icons see-more-icon">
                                        {{ expandedId === item.id ? 'expand_less' : 'expand_more' }}
                                    </span>
                                </div>

                            </div>
                        </div>
                    </div>

                    <div v-if="filter === FILTERS.PASS && passFilter === 'Cancelled'">
                        <div v-if="cancelledCases.length === 0" class="empty-state">
                            <div class="icon-wrap">
                                <span class="material-icons">cancel</span>
                            </div>
                            <h3>No cancelled surgery cases</h3>
                        </div>

                        <div v-else>

                            <div v-for="(item, index) in cancelledCases" :key="item.id" class="case-card cancelled-item"
                                draggable="true" @dragstart="onDragStart(index, item.id)" @dragover.prevent
                                @drop="onDrop(index)" @click="toggleDetail(item.id)">
                                <div class="case-grid">
                                    <div class="grid-row">

                                        <span><strong>Date:</strong> {{ item.date }}</span>
                                        <span v-if="item.room"
                                            style="color: #1e3a8a; font-weight: bold; display: inline-flex; align-items: center; gap: 4px;">
                                            <span class="material-icons" style="font-size: 16px;">meeting_room</span>
                                            {{ item.room }}
                                        </span>

                                    </div>
                                    <div class="grid-row">
                                        <span><strong>HN:</strong> {{ item.hn }}</span>

                                    </div>

                                    <div class="grid-row">
                                        <span><strong>Patient:</strong> {{ item.fullName }}</span>
                                        <span><strong>Age:</strong> {{ item.age }}</span>

                                    </div>

                                    <div class="grid-row single">
                                        <span><strong>Procedure:</strong> {{ item.procedure }}</span>
                                    </div>
                                    <div class="grid-row single">
                                        <span>
                                            <strong>Doctor:</strong>
                                            {{ doctorMap[item.doctorLicense] || item.doctorLicense || '-' }}
                                        </span>
                                    </div>


                                </div>
                                <transition name="expand">
                                    <div v-if="expandedId === item.id" class="case-detail">
                                        <div class="detail-row"><strong>HN:</strong> {{ item.hn }}</div>
                                        <div class="detail-row"><strong>Full Name:</strong> {{ item.fullName }}</div>
                                        <div class="detail-row"><strong>Age:</strong> {{ item.age }}</div>
                                        <div><strong>Gender:</strong> {{ item.gender === 'male' ? 'ชาย' : 'หญิง' }}
                                        </div>
                                        <div class="detail-row"><strong>Underlying Disease(s):</strong> {{
                                            item.underlying || '-' }}</div>
                                        <div class="detail-row"><strong>Proposed Procedure:</strong> {{ item.procedure
                                            }}</div>
                                        <div class="detail-row"><strong>Date:</strong> {{ item.date }}</div>
                                        <div class="detail-row"><strong>CXR:</strong> {{ item.cxrDate || '-' }} | {{
                                            item.cxrNote || '-' }}</div>
                                        <div class="detail-row"><strong>ECG:</strong> {{ item.ecgDate || '-' }} | {{
                                            item.ecgNote || '-' }}</div>
                                        <div class="detail-row"><strong>Lab:</strong> {{ item.labDate || '-' }} | {{
                                            item.labNote || '-' }}</div>
                                        <div class="detail-row"><strong>Admission:</strong> {{ item.admDate || '-' }} |
                                            {{ item.admNote || '-' }}</div>
                                        <div class="detail-row"><strong>Notes:</strong> {{ item.notes || '-' }}</div>
                                    </div>

                                </transition>

                                <div class="case-actions">

                                    <button class="btn-back" @click.stop="moveBackToUpcoming(item.id)">
                                        Back to Upcoming
                                    </button>


                                </div>

                                <div class="see-more-toggle">
                                    <span class="see-more-text">
                                        {{ expandedId === item.id ? 'See less' : 'See more' }}
                                    </span>
                                    <span class="material-icons see-more-icon">
                                        {{ expandedId === item.id ? 'expand_less' : 'expand_more' }}
                                    </span>
                                </div>

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
                    <li><span class="material-icons check-bullet">check</span> Cases can be canceled before surgery
                        date.</li>
                    <li><span class="material-icons check-bullet">check</span> Please arrive on time for the convenience
                        of everyone.</li>
                    <li><span class="material-icons check-bullet">check</span> If there is a problem, please contact
                        staff.</li>
                </ul>
            </div>
        </div>
    </div>
    <button class="floating-add-btn" @click="goAddPatient">+ Add Queue</button>


    <Transition name="fade">
        <div v-if="isMessageModalOpen" class="modal-overlay-center">
            <div class="white-modal-card">
                <h2 class="modal-msg-title" :class="{ 'red-text': messageType === 'error' }">
                    {{ messageTitle }}
                </h2>

                <div class="modal-button-group">
                    <button class="btn-confirm-green" @click="isMessageModalOpen = false">
                        OK
                    </button>
                </div>
            </div>
        </div>
    </Transition>

</template>

<script setup>
import { ref, onMounted, computed } from 'vue'
import { useRouter } from 'vue-router'


const doctorMap = ref({})
const doctorList = ref([])
const expandedId = ref(null)
const isMessageModalOpen = ref(false)
// --- เพิ่มตัวแปรคุมข้อความและประเภทของ Dialog ---
const messageTitle = ref('')
const messageType = ref('info') // เอาไว้เช็คว่าเป็น error หรือ info (เพื่อเปลี่ยนสีข้อความ)

// ฟังก์ชันสำหรับเรียกเปิด Dialog แทน alert()
const showMessage = (msg, type = 'info') => {
    messageTitle.value = msg
    messageType.value = type
    isMessageModalOpen.value = true
}
const searchQuery = ref('')

const toggleDetail = (id) => { expandedId.value = expandedId.value === id ? null : id }

const router = useRouter()
const userLicense = ref('Admin')

const FILTERS = {
    TODAY: 'Today',
    UPCOMING: 'Upcoming',
    PASS: 'Pass'
}
const filter = ref(FILTERS.TODAY)
const passFilter = ref('Completed')
const bookings = ref([])
const matchSearch = (item) => {


    if (!searchQuery.value.trim()) return true

    const q = searchQuery.value.toLowerCase().trim()



    const doctorName =
        doctorMap.value[item.doctorLicense] || ''

    const dateFormats = []

    if (item.date) {
        const d = new Date(item.date)

        const yyyy = d.getFullYear()
        const mm = String(d.getMonth() + 1).padStart(2, '0')
        const dd = String(d.getDate()).padStart(2, '0')

        dateFormats.push(
            `${yyyy}-${mm}-${dd}`,
            `${dd}/${mm}/${yyyy}`,
            `${dd}-${mm}-${yyyy}`
        )
    }

    const searchableText = [
        item.hn,
        item.fullName,
        item.procedure,
        item.age,
        item.gender === 'male'
            ? 'male ชาย เพศชาย'
            : 'female หญิง เพศหญิง',
        doctorName,
        item.doctorLicense,
        ...dateFormats
    ]
        .join(' ')
        .toLowerCase()

    return searchableText.includes(q)
}

const moveBackToUpcoming = async (id) => {
    try {
        await fetch(`https://or-room-backend.rockzee2018.workers.dev/api/bookings/${id}/status`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ status: 'Upcoming' })
        })

        const target = bookings.value.find(item => item.id === id)

        if (target) {
            target.status = 'Upcoming'
        }

        filter.value = FILTERS.UPCOMING

    } catch (e) {
        showMessage('❌ ย้ายกลับไม่สำเร็จ', 'error')
    }
}





const isCancelModalOpen = ref(false)
const selectedCancelId = ref(null)

const openCancelModal = (id) => {
    selectedCancelId.value = id
    isCancelModalOpen.value = true
}

const confirmCancelCase = async () => {
    try {
        await fetch(
            `https://or-room-backend.rockzee2018.workers.dev/api/bookings/${selectedCancelId.value}/status`,
            {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ status: 'Cancelled' })
            }
        )

        const target = bookings.value.find(
            item => item.id === selectedCancelId.value
        )

        if (target) {
            target.status = 'Cancelled'
        }

        filter.value = FILTERS.PASS
        passFilter.value = 'Cancelled'

        isCancelModalOpen.value = false
        selectedCancelId.value = null

    } catch (e) {
        showMessage('❌ Cancel ไม่สำเร็จ')
    }
}

onMounted(async () => {
    const savedLicense = localStorage.getItem('userLicense')
    if (savedLicense) userLicense.value = savedLicense

    try {
        const res = await fetch('https://or-room-backend.rockzee2018.workers.dev/api/bookings')
        const data = await res.json()

        bookings.value = Array.isArray(data) ? data : []

        // ย้ายเคสที่เลยวันและยังไม่ Cancel ไป Completed อัตโนมัติ
        for (const item of bookings.value) {
            if (
                item.date < todayStr &&
                item.status !== 'Cancelled' &&
                item.status !== 'Completed'
            ) {
                item.status = 'Completed'

                await fetch(
                    `https://or-room-backend.rockzee2018.workers.dev/api/bookings/${item.id}/status`,
                    {
                        method: 'PATCH',
                        headers: {
                            'Content-Type': 'application/json'
                        },
                        body: JSON.stringify({
                            status: 'Completed'
                        })
                    }
                )
            }
        }

    } catch (e) {
        console.error('ดึงคิวไม่สำเร็จ', e)
    }

    try {
        const res2 = await fetch('https://or-room-backend.rockzee2018.workers.dev/api/users')
        const users = await res2.json()
        if (Array.isArray(users)) {
            doctorList.value = users
            users.forEach(u => { doctorMap.value[u.license] = u.doctorName })
        }
    } catch (e) { console.error('ดึงรายชื่อหมอไม่สำเร็จ', e) }
})

// ================= ระบบจัดเรียงคิวอัจฉริยะ =================
const sortCases = (arr) => {
    return [...arr].sort((a, b) => {
        // 1. เรียงตามวันผ่าตัดก่อน (วันใกล้สุดได้ก่อน)
        if (a.date !== b.date) return new Date(a.date) - new Date(b.date)

        // 2. ถ้า manual drag ไว้ ให้ queueOrder มีผล
        const qA = a.queueOrder || 999
        const qB = b.queueOrder || 999
        if (qA !== qB) return qA - qB

        // 3. อายุมากสุดได้ก่อน
        const ageA = parseInt(a.age) || 0
        const ageB = parseInt(b.age) || 0
        if (ageA !== ageB) return ageB - ageA

        // 4. เพศหญิงก่อน ถ้าอายุเท่ากัน
        if (a.gender !== b.gender) return a.gender === 'female' ? -1 : 1

        return 0
    })
}
const todayStr = new Date().toISOString().split('T')[0]

const todayCases = computed(() =>
    sortCases(
        bookings.value.filter(
            item =>
                item.date === todayStr &&
                (item.status === FILTERS.UPCOMING || !item.status) &&
                matchSearch(item)
        )
    )
)
const upcomingCases = computed(() =>
    sortCases(
        bookings.value.filter(
            item =>
                item.date > todayStr &&
                (item.status === FILTERS.UPCOMING || !item.status) &&
                matchSearch(item)
        )
    )
)

const completedCases = computed(() =>
    sortCases(
        bookings.value.filter(
            item =>
                item.status === 'Completed' &&
                matchSearch(item)
        )
    )
)

const cancelledCases = computed(() =>
    sortCases(
        bookings.value.filter(
            item =>
                item.status === 'Cancelled' &&
                matchSearch(item)
        )
    )
)


const deleteDoctor = async (license, name) => {
    if (!confirm(`ลบบัญชี "${name}" ออกจากระบบ?\n(ข้อมูลคิวผ่าตัดของหมอยังคงอยู่)`)) return
    try {
        const res = await fetch(`https://or-room-backend.rockzee2018.workers.dev/api/users/${license}`, { method: 'DELETE' })
        const data = await res.json()
        if (res.ok) {
            doctorList.value = doctorList.value.filter(d => d.license !== license)
            showMessage('✅ ลบบัญชีสำเร็จ')
        } else {
            showMessage('❌ ' + (data.error || 'ลบไม่สำเร็จ'))
        }
    } catch (e) { showMessage('❌ เกิดข้อผิดพลาด') }
}


// ================= ระบบ Drag & Drop เลื่อนคิว =================
const draggedIndex = ref(null)

const onDragStart = (index, id) => { draggedIndex.value = index }

const onDrop = async (dropIndex) => {
    if (draggedIndex.value === null || draggedIndex.value === dropIndex) return

    const list = [...upcomingCases.value]
    const draggedItem = list.splice(draggedIndex.value, 1)[0]
    list.splice(dropIndex, 0, draggedItem)

    const updates = list.map((item, idx) => {
        item.queueOrder = idx + 1
        return { id: item.id, queueOrder: item.queueOrder }
    })

    list.forEach(item => {
        const target = bookings.value.find(b => b.id === item.id)
        if (target) target.queueOrder = item.queueOrder
    })

    draggedIndex.value = null

    try {
        await fetch('https://or-room-backend.rockzee2018.workers.dev/api/bookings/reorder', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ updates })
        })
    } catch (e) { console.error("❌ อัปเดตคิวไม่สำเร็จ", e) }
}




// API Functions
// const markAsSucceed = async (id) => {
//     try {
//         await fetch(`https://or-room-backend.rockzee2018.workers.dev/api/bookings/${id}/status`, {
//             method: 'PATCH',
//             headers: { 'Content-Type': 'application/json' },
//             body: JSON.stringify({ status: 'Completed' })
//         })
//         const target = bookings.value.find(item => item.id === id)
//         if (target) {
//             target.status = 'Completed'; filter.value = FILTERS.PASS
//             passFilter.value = 'Completed'
//         }
//     } catch (e) { showMessage('❌ อัปเดต status ไม่สำเร็จ') }
// }

// const deleteCase = async (id) => {
//     if (!confirm('ยืนยันการยกเลิกเคสนี้?')) return

//     try {
//         await fetch(
//             `https://or-room-backend.rockzee2018.workers.dev/api/bookings/${id}/status`,
//             {
//                 method: 'PATCH',
//                 headers: { 'Content-Type': 'application/json' },
//                 body: JSON.stringify({ status: 'Cancelled' })
//             }
//         )

//         const target = bookings.value.find(item => item.id === id)

//         if (target) {
//             target.status = 'Cancelled'
//             filter.value = FILTERS.PASS
//             passFilter.value = 'Cancelled'
//         }

//     } catch (e) {
//         showMessage('❌ ยกเลิกเคสไม่สำเร็จ')
//     }
// }

// Modal logic
const isDayModalOpen = ref(false)
const isLogoutModalOpen = ref(false)
const isDeleteAccModalOpen = ref(false)
const selectedDay = ref('Monday')
const tempSelectedDay = ref('Monday')
const daysOfWeek = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday']
const confirmDayChange = () => { selectedDay.value = tempSelectedDay.value; isDayModalOpen.value = false }
const goAddPatient = () => { router.push({ name: 'admin-add-patient' }) }
const handleLogout = () => { localStorage.clear(); router.push('/login') }
const handleDeleteAccount = () => { localStorage.clear(); router.push('/login') }
const isDetailModalOpen = ref(false)
const selectedCase = ref(null)
const openCaseDetail = (item) => { selectedCase.value = item; isDetailModalOpen.value = true }
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

.top-nav,
.drawer-header {
    background-color: #1a3a5f !important;
    height: 80px;
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 0 10px;
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

.logout-btn {
    background: none;
    border: none;
    cursor: pointer;
    margin-left: -5px;
}

.nav-calendar-btn {
    display: flex;
    align-items: center;
    gap: 6px;
    background: rgba(255, 255, 255, 0.18);
    border: 1.5px solid rgba(255, 255, 255, 0.35);
    color: white;
    padding: 7px 14px;
    border-radius: 20px;
    font-size: 11px;
    font-weight: 600;
    cursor: pointer;
    margin-left: auto;
    margin-right: 10px;
    transition: background 0.2s;
}

.nav-calendar-btn:hover {
    background: rgba(255, 255, 255, 0.28);
}

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
    max-width: 600px;
    margin: 0 auto 30px auto;
    background: white;
    border-radius: 20px;
    box-shadow: 0 10px 25px rgba(0, 0, 0, 0.05);
    overflow: hidden;
    padding-bottom: 10px;
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

/* ---------- Case Card & Drag ---------- */
.case-card {
    background: #ffffff;
    padding: 20px;
    border-radius: 16px;
    margin-bottom: 16px;
    border: 1px solid #e4e9f0;
    cursor: pointer;
    box-shadow: 0 3px 10px rgba(0, 0, 0, 0.04);

}

.drag-item {
    cursor: grab;
    user-select: none;
    -webkit-user-select: none;
    transition: transform 0.2s ease, box-shadow 0.2s ease;
}

.drag-item:active {
    cursor: grabbing;
    transform: scale(1.02);
    box-shadow: 0 15px 30px rgba(0, 0, 0, 0.15);
    opacity: 0.9;
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

.case-grid strong {
    font-weight: 600;
    margin-right: 4px;
}

.case-actions {
    display: flex;
    justify-content: flex-end;
    gap: 12px;
    margin-top: 12px;
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

/* --- Succeed Style --- */
.succeed-item {
    border-left: 5px solid #03c172;
    background: #fdfdfd;
}

.succeed-item:hover {
    background: #f0fff4;
}

/* --- Reset Button --- */
.reset-wrapper {
    display: flex;
    justify-content: flex-end;
    margin-bottom: 10px;
    padding-right: 10px;
}

.btn-reset {
    display: flex;
    align-items: center;
    gap: 5px;
    background: #f0f2f5;
    color: #555;
    border: 1px solid #ddd;
    padding: 6px 12px;
    border-radius: 8px;
    cursor: pointer;
    font-size: 13px;
    font-weight: 600;
    transition: 0.2s;
}

.btn-reset:hover {
    background: #e4e6e9;
    color: #1a3a5f;
}

.btn-reset .material-icons {
    font-size: 16px;
}

/* --- Modals & Other UI --- */
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

.modal-button-group {
    display: flex;
    justify-content: center;
    gap: 15px;
}

.floating-add-btn {
    position: fixed;
    bottom: 35px;
    right: 35px;
    background: #1a3a5f;
    color: white;
    border: none;
    padding: 14px 24px;
    border-radius: 50px;
    font-size: 15px;
    font-weight: 600;
    cursor: pointer;
    box-shadow: 0 6px 20px rgba(0, 0, 0, 0.25);
    z-index: 100;
    transition: 0.2s ease;
}

.floating-add-btn:hover {
    background: #244b7a;
    transform: translateY(-3px);
}

.info-section {
    width: 100%;
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

.case-detail {
    margin-top: 14px;
    padding: 14px;
    background: #f8fafc;
    border-radius: 10px;
    border: 1px solid #e3e8ef;
    font-size: 13px;
    line-height: 1.6;
}

.expand-enter-active,
.expand-leave-active {
    transition: all 0.25s ease;
}

.expand-enter-from,
.expand-leave-to {
    opacity: 0;
    transform: translateY(-6px);
}

/* --- Two Column Layout --- */
.two-col-layout {
    display: flex;
    flex-direction: column;
    gap: 24px;
}

.col-left {
    width: 100%;
}

.col-right {
    width: 100%;
}

@media (min-width: 1024px) {
    .two-col-layout {
        flex-direction: row;
        align-items: flex-start;
    }

    .col-left {
        flex: 1;
        min-width: 0;
    }

    .col-right {
        width: 420px;
        flex-shrink: 0;
    }
}

/* --- Stats Dashboard --- */
.stats-row {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 12px;
    margin-bottom: 20px;
}

.stat-card {
    background: white;
    border-radius: 16px;
    padding: 16px;
    display: flex;
    align-items: center;
    gap: 14px;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.06);
    border-left: 4px solid;
}

.stat-card.blue {
    border-color: #1a3a5f;
}

.stat-card.green {
    border-color: #2e7d32;
}

.stat-card.purple {
    border-color: #6a1b9a;
}

.stat-card.orange {
    border-color: #e65100;
}

.stat-icon {
    font-size: 24px;
}

.stat-number {
    font-size: 1.6rem;
    font-weight: 700;
    color: #1a3a5f;
    line-height: 1;
}

.stat-label {
    font-size: 11px;
    color: #888;
    margin-top: 3px;
}

/* --- Doctor Management --- */
.doctor-section {
    width: 100%;
    margin: 0 0 30px 0;
    background: white;
    border-radius: 20px;
    box-shadow: 0 10px 25px rgba(0, 0, 0, 0.05);
    overflow: hidden;
}

.section-header {
    padding: 16px 20px;
    background: #f8f9fa;
    border-bottom: 1px solid #eee;
}

.section-title {
    margin: 0;
    font-size: 1rem;
    color: #1a3a5f;
    font-weight: 700;
}

.doctor-table-wrap {
    overflow-x: auto;
}

.doctor-table {
    width: 100%;
    border-collapse: collapse;
    font-size: 13px;
}

.doctor-table th {
    background: #f0f4f8;
    color: #1a3a5f;
    padding: 10px 14px;
    text-align: left;
    font-weight: 600;
}

.doctor-table td {
    padding: 10px 14px;
    border-bottom: 1px solid #f0f0f0;
    color: #333;
}

.doctor-table tr:last-child td {
    border-bottom: none;
}

.doctor-table tr:hover td {
    background: #fafbfc;
}

.role-badge {
    padding: 3px 10px;
    border-radius: 20px;
    font-size: 11px;
    font-weight: 600;
}

.role-badge.admin {
    background: #e8f0fe;
    color: #1a3a5f;
}

.role-badge.user {
    background: #f0f4f8;
    color: #555;
}

.btn-delete-doc {
    background: #b71c1c;
    color: white;
    border: none;
    padding: 4px 12px;
    border-radius: 6px;
    font-size: 12px;
    cursor: pointer;
}

.btn-delete-doc:hover {
    background: #8b0000;
}

.protected-text {
    font-size: 11px;
    color: #aaa;
    font-style: italic;
}

.cancelled-item {
    border-left: 5px solid #d32f2f;
    background: #fff5f5;
    margin-block: 20px;

}

.cancelled-item:hover {
    background: #ffecec;
}

.sub-filter {
    display: flex;
    gap: 10px;
    padding: 0 15px 15px;
    background: #f8f9fa;
}

.sub-filter button {
    flex: 1;
    padding: 8px 0;
    border-radius: 10px;
    border: 1px solid #ddd;
    background: white;
    color: #444;
    font-weight: 600;
    cursor: pointer;
    transition: 0.2s;
}

.sub-filter button.active {
    color: white;
}

.sub-filter button:first-child.active {
    background: #03c168;
    border-color: #03c168;
}

.sub-filter button:last-child.active {
    background: #ae1414;
    border-color: #ae1414;
}

.btn-back {
    background: #fcd823;
    color: rgb(0, 0, 0);
    border: none;
    padding: 6px 14px;
    border-radius: 8px;
    font-size: 13px;
    cursor: pointer;
}

.btn-back:hover {
    background: #244b7a;
}

.btn-confirm-red {
    background: #c62828;
    color: white;
    border: none;
    padding: 10px 25px;
    border-radius: 12px;
    font-weight: bold;
    cursor: pointer;
}

.btn-cancel-gray {
    background: #eef2f7;
    color: #4a5e75;
    border: none;
    border: none;
    padding: 10px 25px;
    border-radius: 12px;
    font-weight: bold;
    cursor: pointer;
}

.red-text {
    color: #c62828;
}

.tab-content-wrapper {
    padding: 16px;
}

.top-toolbar {
    display: flex;
    justify-content: flex-end;
    margin-bottom: 12px;
}

.search-box {
    display: flex;
    align-items: center;
    gap: 8px;
    background: white;
    border: 1px solid #dbe3ec;
    border-radius: 12px;
    padding: 0 12px;
    width: 350px;
    height: 46px;
    box-shadow: 0 2px 8px rgba(0, 0, 0, .05);
}

.search-box .material-icons {
    color: #90a4ae;
}

.search-box input {
    flex: 1;
    border: none;
    outline: none;
    background: transparent;
    font-size: 14px;
}

.search-box:focus-within {
    border-color: #1a3a5f;
    box-shadow: 0 0 0 3px rgba(26, 58, 95, .12);
}

.main-title {
    text-align: center;
    color: #1a3a5f;
    font-size: 1.6rem;
    font-weight: bold;
    margin: 0 0 30px;
}

/* ---------- See More Toggle ---------- */
.see-more-toggle {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    margin-top: 12px;
    margin-bottom: -25px;
    /* 🟢 ใช้ค่าติดลบเพื่อดึงให้ชิดขอบล่างสุดของการ์ด */
    color: #cfd5dd;
    transition: all 0.25s ease;
}

/* ตอนเอาเมาส์ชี้ให้สีเข้มขึ้นนิดนึง */
.case-card:hover .see-more-toggle {
    color: #475569;
}

.see-more-text {
    font-size: 13px;
    font-weight: 500;
}

.see-more-icon {
    font-size: 24px;
    margin-top: -2px;
    /* ดึงลูกศรให้ชิดตัวหนังสือมากขึ้น */
}

.icon-wrap .material-icons {
    font-size: 35px;
    color: #90a4ae;

}

.btn-edit {
    background: #facc15;
    color: #000;
    border: none;
    padding: 6px 14px;
    border-radius: 8px;
    font-size: 13px;
    cursor: pointer;
    font-weight: 600;
    transition: 0.2s;
}

.btn-edit:hover {
    background: #eab308;
}
</style>