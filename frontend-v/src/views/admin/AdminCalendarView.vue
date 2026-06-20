<template>
    <div class="calendar-page">

        <header class="calendar-navbar">
            <button class="back-btn" @click="router.push('/admin-home')">
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24">
                    <path fill="white" d="M20 11H7.83l5.59-5.59L12 4l-8 8l8 8l1.41-1.41L7.83 13H20z" />
                </svg>
            </button>
            <span class="nav-title">📅 Admin Calendar</span>
            <div class="nav-badge">All Doctors</div>
        </header>

        <div class="cal-controls">
            <button class="ctrl-btn" @click="changeMonth(-1)">‹</button>
            <div class="month-label">{{ monthNames[currentMonth] }} {{ currentYear }}</div>
            <button class="ctrl-btn" @click="changeMonth(1)">›</button>
            <button class="today-btn" @click="goToToday">Today</button>
        </div>

        <div class="weekday-row">
            <div v-for="d in ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']" :key="d" class="weekday-cell">{{ d }}
            </div>
        </div>

        <div class="calendar-grid">
            <div v-for="(date, i) in calendarDays" :key="i" class="day-cell" :class="{
                'empty-cell': !date.isCurrentMonth,
                'today-cell': date.fullDate === todayStr,
                'weekend-cell': date.isCurrentMonth && (date.dayOfWeek === 0 || date.dayOfWeek === 6),
                'holiday-cell': date.isCurrentMonth && isOfficialHoliday(date.fullDate),
                'has-booking': date.isCurrentMonth && hasBooking(date.fullDate),
                'disabled-day':

                    date.dayOfWeek === 0 ||
                    date.dayOfWeek === 6 ||
                    isOfficialHoliday(date.fullDate)
            }" @click="date.isCurrentMonth && handleDateClick(date)">
                <span class="day-number">{{ date.dayNumber }}</span>
                <span v-if="date.isCurrentMonth && isOfficialHoliday(date.fullDate)" class="holiday-tag">{{
                    getHolidayName(date.fullDate) }}</span>
                <div class="dot-row">
                    <span v-for="b in getBookingsForDate(date.fullDate).slice(0, 3)" :key="b.id" class="dot"></span>
                    <span v-if="getBookingsForDate(date.fullDate).length > 3" class="more-count">+{{
                        getBookingsForDate(date.fullDate).length - 3 }}</span>
                </div>
                <div v-if="date.isCurrentMonth && getUsedMinutes(date.fullDate) > 0" class="time-bar-wrap">
                    <div class="time-bar"
                        :style="{ width: Math.min(getUsedMinutes(date.fullDate) / 420 * 100, 100) + '%', background: getUsedMinutes(date.fullDate) >= 420 ? '#e53935' : '#43a047' }">
                    </div>
                </div>
            </div>
        </div>

        <Transition name="fade">
            <div v-if="isDetailPopupOpen" class="overlay-modal" @click.self="isDetailPopupOpen = false">
                <div class="card-modal">
                    <h3 class="modal-title">📅 {{ formatDateThai(selectedFullDate) }}</h3>

                    <div class="time-summary">
                        <span>
                            ⏱ Total used:
                            <strong>
                                {{ formatMinutes(getUsedMinutes(selectedFullDate)) }}
                                /
                                {{ formatMinutes(420) }}
                            </strong>
                        </span>
                        <span class="time-remain" :class="{ 'full': getUsedMinutes(selectedFullDate) >= 420 }">
                            {{ getUsedMinutes(selectedFullDate) >= 420 ? '🔴 Full' : `🟢 Remaining: ${formatMinutes(420
                                - getUsedMinutes(selectedFullDate))}` }}
                        </span>
                    </div>

                    <div v-for="b in selectedDateBookings" :key="b.id" class="booking-item">
                        <p><strong>Patient:</strong> {{ b.fullName }}</p>
                        <p><strong>HN:</strong> {{ b.hn }}</p>
                        <p><strong>Doctor:</strong> {{ doctorMap[b.doctorLicense] || b.doctorLicense || '-' }}</p>
                        <p><strong>Procedure:</strong> {{ b.procedure }}</p>
                        <p><strong>Room:</strong> {{ b.room }}</p>
                        <hr style="border-color:#eee; margin: 8px 0" />
                    </div>

                    <div class="actions">
                        <button @click="goAddPatient" class="btn-fill">+ Add Queue</button>
                        <button @click="isDetailPopupOpen = false" class="btn-clear">Close</button>
                    </div>
                </div>
            </div>
        </Transition>

        <button class="fab-btn" @click="goAddPatient">
            <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24">
                <path fill="currentColor" d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6z" />
            </svg>
        </button>

    </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'

const router = useRouter()
const now = new Date()
const currentMonth = ref(now.getMonth())
const currentYear = ref(now.getFullYear())
const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`

const selectedFullDate = ref(todayStr)
const isDetailPopupOpen = ref(false)
const selectedDateBookings = ref([])
const bookings = ref([])
const doctorMap = ref({})

// 📍 1. สร้างตัวแปรว่างๆ ไว้รอรับข้อมูลวันหยุดจาก API
const officialHolidays = ref([])

onMounted(async () => {
    try {
        // admin ดึงคิวทั้งหมด ไม่กรอง license
        const res = await fetch('https://or-room-backend.rockzee2018.workers.dev/api/bookings')
        const data = await res.json()
        bookings.value = Array.isArray(data) ? data : []
    } catch (e) {
        console.error('ดึงคิวไม่สำเร็จ', e)
    }

    try {
        // ดึงชื่อหมอ map license -> doctorName
        const res2 = await fetch('https://or-room-backend.rockzee2018.workers.dev/api/users')
        const users = await res2.json()
        if (Array.isArray(users)) {
            users.forEach(u => { doctorMap.value[u.license] = u.doctorName })
        }
    } catch (e) {
        console.error('ดึงรายชื่อหมอไม่สำเร็จ', e)
    }

    // 📍 2. ดึงข้อมูลวันหยุดจาก API หลังบ้าน
    try {
        const resHoliday = await fetch(`https://or-room-backend.rockzee2018.workers.dev/api/holidays`)
        const dataHoliday = await resHoliday.json()

        if (dataHoliday.items) {
            officialHolidays.value = dataHoliday.items.map(item => ({
                date: item.start.date,
                name: item.summary
            }))
        }
    } catch (e) {
        console.error('ดึงวันหยุดไม่สำเร็จ', e)
    }
})

const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"]

// 📍 3. อัปเดตฟังก์ชันให้เช็กวันหยุดจากตัวแปร officialHolidays.value แทน
const isOfficialHoliday = (d) => officialHolidays.value.some(h => h.date === d)
const getHolidayName = (d) => officialHolidays.value.find(h => h.date === d)?.name || 'Holiday'

const getBookingsForDate = (d) => bookings.value.filter(b => b.date === d && b.status !== 'Succeed')
const hasBooking = (d) => getBookingsForDate(d).length > 0

// คำนวณเวลาใช้ไปทุกหมอรวมกัน
const getUsedMinutes = (d) => {
    return getBookingsForDate(d).reduce((sum, b) => {
        const match = b.procedure?.match(/(\d+)\s*min/)
        return sum + (match ? parseInt(match[1]) : 0)
    }, 0)
}
const formatMinutes = (mins) => {
    const h = Math.floor(mins / 60)
    const m = mins % 60

    return `${h}h ${m}m`
}

const calendarDays = computed(() => {
    const days = []
    const startDay = new Date(currentYear.value, currentMonth.value, 1).getDay()
    const lastDate = new Date(currentYear.value, currentMonth.value + 1, 0).getDate()
    for (let i = 0; i < startDay; i++) days.push({ dayNumber: '', isCurrentMonth: false })
    for (let d = 1; d <= lastDate; d++) {
        const dStr = `${currentYear.value}-${String(currentMonth.value + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`
        days.push({
            dayNumber: d, isCurrentMonth: true, fullDate: dStr,
            dayOfWeek: new Date(currentYear.value, currentMonth.value, d).getDay()
        })
    }
    return days
})

const goToToday = () => { currentMonth.value = now.getMonth(); currentYear.value = now.getFullYear() }
const changeMonth = (v) => {
    currentMonth.value += v
    if (currentMonth.value > 11) { currentMonth.value = 0; currentYear.value++ }
    else if (currentMonth.value < 0) { currentMonth.value = 11; currentYear.value-- }
}

const handleDateClick = (date) => {

    // วันว่างนอกเดือน
    if (!date.isCurrentMonth) return
    // วันย้อนหลัง
    if (date.fullDate < todayStr) return

    // เสาร์ = 6, อาทิตย์ = 0
    if (date.dayOfWeek === 0 || date.dayOfWeek === 6) return

    // วันหยุดราชการ
    if (isOfficialHoliday(date.fullDate)) return

    selectedFullDate.value = date.fullDate
    selectedDateBookings.value = getBookingsForDate(date.fullDate)

    isDetailPopupOpen.value = true
}


const goAddPatient = () => {
    router.push(`/admin-add-patient?date=${selectedFullDate.value}`)
}

const formatDateThai = (d) => {
    if (!d) return ''
    const dt = new Date(d + 'T00:00:00')
    return `${monthNames[dt.getMonth()]} ${dt.getDate()}, ${dt.getFullYear() + 543}`
}
</script>

<style scoped>
* {
    box-sizing: border-box;
    margin: 0;
    padding: 0;
}

.calendar-page {
    min-height: 100vh;
    display: flex;
    flex-direction: column;
    background: #f4f7f9;
    font-family: 'Segoe UI', sans-serif;
}

/* NAVBAR */
.calendar-navbar {
    background: linear-gradient(135deg, #174983, #1a3a5f);
    height: 70px;
    padding: 0 20px;
    display: flex;
    align-items: center;
    gap: 12px;
}

.back-btn {
    background: none;
    border: none;
    cursor: pointer;
    display: flex;
    align-items: center;
    padding: 6px;
    border-radius: 50%;
    transition: background 0.2s;
}

.back-btn:hover {
    background: rgba(255, 255, 255, 0.15);
}

.nav-title {
    color: white;
    font-size: 1.1rem;
    font-weight: 700;
    flex: 1;
}

.nav-badge {
    background: rgba(255, 255, 255, 0.2);
    color: white;
    font-size: 11px;
    padding: 4px 10px;
    border-radius: 20px;
    font-weight: 600;
}

/* CONTROLS */
.cal-controls {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 14px 20px;
    background: white;
    border-bottom: 1px solid #e8edf2;
}

.ctrl-btn {
    background: #f0f4f8;
    border: none;
    width: 34px;
    height: 34px;
    border-radius: 8px;
    font-size: 20px;
    cursor: pointer;
    color: #1a3a5f;
    display: flex;
    align-items: center;
    justify-content: center;
}

.ctrl-btn:hover {
    background: #dde6f0;
}

.month-label {
    font-weight: 700;
    font-size: 1rem;
    color: #1a3a5f;
    flex: 1;
    text-align: center;
}

.today-btn {
    background: #1a3a5f;
    color: white;
    border: none;
    padding: 6px 14px;
    border-radius: 8px;
    font-size: 13px;
    cursor: pointer;
    font-weight: 600;
}

/* WEEKDAY */
.weekday-row {
    display: grid;
    grid-template-columns: repeat(7, 1fr);
    background: #e8edf5;
    padding: 6px 0;
}

.weekday-cell {
    text-align: center;
    font-size: 11px;
    font-weight: 700;
    color: #4a6fa5;
    text-transform: uppercase;
}

/* GRID */
.calendar-grid {
    display: grid;
    grid-template-columns: repeat(7, 1fr);
    flex: 1;
    gap: 1px;
    background: #dde3ea;
}

.day-cell {
    background: white;
    min-height: 80px;
    padding: 6px;
    cursor: pointer;
    position: relative;
    transition: background 0.15s;
}

.day-cell:hover {
    background: #f0f5fb;
}

.empty-cell {
    background: #f8f9fb;
    cursor: default;
}

.today-cell {
    background: #e8f0fe;
}

.weekend-cell {
    background: #fdf8f0;
}

.holiday-cell {
    background: #fff3e0;
}

.has-booking {
    border-top: 3px solid #4a6fa5;
}

.day-number {
    font-size: 13px;
    font-weight: 600;
    color: #333;
    display: block;
}

.today-cell .day-number {
    background: #1a3a5f;
    color: white;
    width: 22px;
    height: 22px;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 11px;
}

.holiday-tag {
    display: block;
    font-size: 9px;
    color: #e65100;
    margin-top: 2px;
    line-height: 1.2;
}

.dot-row {
    display: flex;
    gap: 3px;
    margin-top: 4px;
    flex-wrap: wrap;
    align-items: center;
}

.dot {
    width: 7px;
    height: 7px;
    border-radius: 50%;
    background: #4a6fa5;
}

.more-count {
    font-size: 9px;
    color: #666;
    font-weight: 600;
}

.time-bar-wrap {
    position: absolute;
    bottom: 4px;
    left: 4px;
    right: 4px;
    height: 3px;
    background: #e0e0e0;
    border-radius: 2px;
    overflow: hidden;
}

.time-bar {
    height: 100%;
    border-radius: 2px;
    transition: width 0.3s;
}

/* POPUP */
.overlay-modal {
    position: fixed;
    inset: 0;
    background: rgba(0, 0, 0, 0.45);
    display: flex;
    justify-content: center;
    align-items: flex-end;
    z-index: 2000;
    padding: 0 0 20px 0;
}

.card-modal {
    background: white;
    width: 100%;
    max-width: 480px;
    border-radius: 20px 20px 0 0;
    padding: 24px 20px;
    max-height: 75vh;
    overflow-y: auto;
}

.modal-title {
    font-size: 1rem;
    font-weight: 700;
    color: #1a3a5f;
    margin-bottom: 12px;
}

.time-summary {
    background: #f0f4f8;
    border-radius: 10px;
    padding: 10px 14px;
    margin-bottom: 14px;
    display: flex;
    justify-content: space-between;
    font-size: 13px;
    color: #444;
}

.time-remain {
    font-weight: 600;
}

.time-remain.full {
    color: #e53935;
}

.booking-item {
    margin-bottom: 10px;
}

.booking-item p {
    font-size: 13px;
    color: #333;
    margin: 3px 0;
}

.booking-badge {
    display: inline-block;
    color: white;
    font-size: 11px;
    padding: 3px 10px;
    border-radius: 20px;
    font-weight: 600;
    margin-bottom: 6px;
}

.actions {
    display: flex;
    gap: 10px;
    margin-top: 16px;
}

.btn-fill {
    flex: 1;
    background: #1a3a5f;
    color: white;
    border: none;
    padding: 12px;
    border-radius: 10px;
    font-weight: 600;
    cursor: pointer;
    font-size: 14px;
}

.btn-clear {
    flex: 1;
    background: #f0f4f8;
    color: #555;
    border: none;
    padding: 12px;
    border-radius: 10px;
    font-weight: 600;
    cursor: pointer;
    font-size: 14px;
}

/* FAB */
.fab-btn {
    position: fixed;
    bottom: 30px;
    right: 30px;
    width: 56px;
    height: 56px;
    background: #1a3a5f;
    color: white;
    border: none;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    box-shadow: 0 6px 20px rgba(0, 0, 0, 0.25);
    z-index: 100;
    transition: 0.2s;
}

.fab-btn:hover {
    background: #244b7a;
    transform: scale(1.08);
}

.fade-enter-active,
.fade-leave-active {
    transition: opacity 0.25s;
}

.fade-enter-from,
.fade-leave-to {
    opacity: 0;
}

.disabled-day {
    opacity: 0.45;
    cursor: not-allowed;
}
</style>