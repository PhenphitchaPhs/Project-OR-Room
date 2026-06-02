<template>
    <div class="calendar-page">

        <header class="calendar-navbar">
            <div class="nav-left"></div>
            <div class="nav-center">
                <button class="ctrl-btn" @click="changeMonth(-1)">‹</button>
                <div class="month-label">{{ monthNames[currentMonth] }} {{ currentYear + 543 }}</div>
                <button class="ctrl-btn" @click="changeMonth(1)">›</button>
            </div>
            <div class="nav-right">
                <button class="today-btn" @click="goToToday">Today</button>
            </div>
        </header>

        <div class="weekday-row">
            <div v-for="d in ['Sun','Mon','Tue','Wed','Thu','Fri','Sat']" :key="d" class="weekday-cell"
                :class="{ 'weekend-label': d === 'Sun' || d === 'Sat' }">{{ d }}</div>
        </div>

        <div class="calendar-grid">
            <div
                v-for="(date, i) in calendarDays"
                :key="i"
                class="day-cell"
                :class="{
                    'empty-cell': !date.isCurrentMonth,
                    'today-cell': date.fullDate === todayStr,
                    'weekend-cell': date.isCurrentMonth && (date.dayOfWeek === 0 || date.dayOfWeek === 6),
                    'holiday-cell': date.isCurrentMonth && isOfficialHoliday(date.fullDate),
                    'has-booking': date.isCurrentMonth && hasBooking(date.fullDate)
                }"
                @click="date.isCurrentMonth && handleDateClick(date)"
            >
                <span class="day-number" :class="{ 'today-circle': date.fullDate === todayStr }">{{ date.dayNumber }}</span>
                <span v-if="date.isCurrentMonth && isOfficialHoliday(date.fullDate)" class="holiday-tag">{{ getHolidayName(date.fullDate) }}</span>
                <div class="dot-row">
                    <span
                        v-for="b in getBookingsForDate(date.fullDate).slice(0,3)"
                        :key="b.id"
                        class="dot"
                        :style="{ background: urgencyColor(b.urgency) }"
                    ></span>
                    <span v-if="getBookingsForDate(date.fullDate).length > 3" class="more-count">+{{ getBookingsForDate(date.fullDate).length - 3 }}</span>
                </div>
            </div>
        </div>

        <Transition name="fade">
            <div v-if="isDetailPopupOpen" class="overlay-modal" @click.self="isDetailPopupOpen = false">
                <div class="card-modal">
                    <h3 class="modal-title">📅 {{ formatDateThai(selectedFullDate) }}</h3>
                    <div v-for="b in selectedDateBookings" :key="b.id" class="booking-item">
                        <div class="booking-badge" :style="{ background: urgencyColor(b.urgency) }">{{ b.urgency }}</div>
                        <p><strong>Patient:</strong> {{ b.fullName }}</p>
                        <p><strong>HN:</strong> {{ b.hn }}</p>
                        <p><strong>Procedure:</strong> {{ b.procedure }}</p>
                        <p v-if="b.isNpoRisk">🍼 <strong>NPO Risk</strong></p>
                        <p v-if="b.isInfected">🦠 <strong>Infection Risk</strong></p>
                        <hr style="border-color:#eee; margin: 8px 0" />
                    </div>
                    <div class="actions">
                        <button @click="goToBooking" class="btn-fill">+ Add Queue</button>
                        <button @click="isDetailPopupOpen = false" class="btn-clear">Close</button>
                    </div>
                </div>
            </div>
        </Transition>

        <button class="fab-btn" @click="goToBooking">
            <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24">
                <path fill="currentColor" d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6z"/>
            </svg>
        </button>

    </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { Icon } from '@iconify/vue'

const router = useRouter()
const now = new Date()
const currentMonth = ref(now.getMonth())
const currentYear = ref(now.getFullYear())
const todayStr = ref(`${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`)

const selectedFullDate = ref(todayStr.value)
const isDetailPopupOpen = ref(false)
const selectedDateBookings = ref([])

const bookings = ref([])
// 📍 1. เปลี่ยนจากพิมพ์มือ เป็นตัวแปรว่างๆ ไว้รอรับข้อมูลจาก API
const officialHolidays = ref([])

onMounted(async () => {
    const license = localStorage.getItem('userLicense')
    
    // 📍 2. ดึงข้อมูลคิวจอง
    try {
        const res = await fetch(`https://or-room-backend.rockzee2018.workers.dev/api/bookings?license=${license}`)
        const data = await res.json()
        bookings.value = Array.isArray(data) ? data : []
    } catch (e) {
        console.error('ดึงคิวไม่สำเร็จ', e)
    }

    // 📍 3. ดึงข้อมูลวันหยุดจาก API หลังบ้านของเรา
    try {
        const resHoliday = await fetch(`https://or-room-backend.rockzee2018.workers.dev/api/holidays`)
        const dataHoliday = await resHoliday.json()
        
        // แปลงข้อมูลจาก Google Calendar ให้อยู่ในรูปแบบที่หน้าเว็บใช้ได้
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
const weekDaysFull = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']

// 📍 4. อัปเดตฟังก์ชันให้ใช้ตัวแปร .value (เพราะเป็นตัวแปรแบบ ref)
const isOfficialHoliday = (d) => officialHolidays.value.some(h => h.date === d)
const getHolidayName = (d) => officialHolidays.value.find(h => h.date === d)?.name || 'Holiday'

// ดึงคิวของวันนั้นๆ
const getBookingsForDate = (d) => bookings.value.filter(b => b.date === d && b.status !== 'Succeed')
const hasBooking = (d) => getBookingsForDate(d).length > 0

const urgencyColor = (urgency) => {
    if (urgency === 'Emergency') return '#e53935'
    if (urgency === 'Urgent') return '#f9a825'
    return '#43a047'
}

const calendarDays = computed(() => {
    const days = []
    const startDay = new Date(currentYear.value, currentMonth.value, 1).getDay()
    const lastDate = new Date(currentYear.value, currentMonth.value + 1, 0).getDate()
    for (let i = 0; i < startDay; i++) days.push({ dayNumber: '', isCurrentMonth: false })
    for (let d = 1; d <= lastDate; d++) {
        const dStr = `${currentYear.value}-${String(currentMonth.value + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`
        days.push({ dayNumber: d, isCurrentMonth: true, fullDate: dStr, dayOfWeek: new Date(currentYear.value, currentMonth.value, d).getDay() })
    }
    return days
})

const goToToday = () => { currentMonth.value = now.getMonth(); currentYear.value = now.getFullYear(); selectedFullDate.value = todayStr.value }
const changeMonth = (v) => {
    currentMonth.value += v
    if (currentMonth.value > 11) { currentMonth.value = 0; currentYear.value++ }
    else if (currentMonth.value < 0) { currentMonth.value = 11; currentYear.value-- }
}

const handleDateClick = (date) => {
    if (!date.isCurrentMonth) return
    selectedFullDate.value = date.fullDate
    selectedDateBookings.value = getBookingsForDate(date.fullDate)
    if (selectedDateBookings.value.length > 0) {
        isDetailPopupOpen.value = true
    }
}

// ปุ่ม + พาไปหน้า Booking
const goToBooking = () => router.push('/booking')

const formatDateThai = (d) => {
    if (!d) return ''
    const dt = new Date(d + 'T00:00:00')
    return `${monthNames[dt.getMonth()]} ${dt.getDate()}, ${dt.getFullYear() + 543}`
}
</script>

<style scoped>
/* สไตล์ยังคงเหมือนเดิมเป๊ะๆ ครับ */
* { box-sizing: border-box; margin: 0; padding: 0; }

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
    justify-content: space-between;
}
.nav-left { width: 40px; }
.nav-center { display: flex; align-items: center; gap: 12px; flex: 1; justify-content: center; }
.nav-right { width: 80px; display: flex; justify-content: flex-end; }

.ctrl-btn {
    background: rgba(255,255,255,0.2);
    border: none;
    width: 34px;
    height: 34px;
    border-radius: 8px;
    font-size: 22px;
    cursor: pointer;
    color: white;
    display: flex;
    align-items: center;
    justify-content: center;
    line-height: 1;
}
.ctrl-btn:hover { background: rgba(255,255,255,0.3); }
.month-label { font-weight: 700; font-size: 1rem; color: white; }
.today-btn {
    background: rgba(255,255,255,0.2);
    color: white;
    border: 1.5px solid rgba(255,255,255,0.4);
    padding: 6px 14px;
    border-radius: 8px;
    font-size: 13px;
    cursor: pointer;
    font-weight: 600;
}
.today-btn:hover { background: rgba(255,255,255,0.3); }

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
.weekend-label { color: #c0392b; }

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
.day-cell:hover { background: #f0f5fb; }
.empty-cell { background: #f8f9fb; cursor: default; }
.today-cell { background: #e8f0fe; }
.weekend-cell { background: #fdf8f0; }
.holiday-cell { background: #fff3e0; }
.has-booking { border-top: 3px solid #4a6fa5; }

.day-number {
    font-size: 13px;
    font-weight: 600;
    color: #333;
    display: block;
}
.today-circle {
    background: #1a3a5f;
    color: white;
    width: 24px;
    height: 24px;
    border-radius: 50%;
    display: inline-flex;
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
}
.more-count {
    font-size: 9px;
    color: #666;
    font-weight: 600;
}

/* POPUP */
.overlay-modal {
    position: fixed;
    inset: 0;
    background: rgba(0,0,0,0.45);
    display: flex;
    justify-content: center;
    align-items: flex-end;
    z-index: 2000;
    padding-bottom: 20px;
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
.booking-item { margin-bottom: 10px; }
.booking-item p { font-size: 13px; color: #333; margin: 3px 0; }
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
    box-shadow: 0 6px 20px rgba(0,0,0,0.25);
    z-index: 100;
    transition: 0.2s;
}
.fab-btn:hover { background: #244b7a; transform: scale(1.08); }

.fade-enter-active, .fade-leave-active { transition: opacity 0.25s; }
.fade-enter-from, .fade-leave-to { opacity: 0; }
</style>