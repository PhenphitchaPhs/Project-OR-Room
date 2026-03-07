<template>
    <div class="calendar-page">
        <header class="calendar-navbar">
            <div class="nav-left"></div>
            <div class="nav-center">
                <div class="header-info">
                    <h2 class="month-label">{{ monthNames[currentMonth] }}</h2>
                    <span class="year-label">{{ currentYear + 543 }}</span>
                </div>
            </div>
            <div class="nav-right">
                <button @click="goToToday" class="today-btn">Today</button>
                <div class="nav-arrows">
                    <button @click="changeMonth(-1)" class="arrow-btn">
                        <Icon icon="lucide:chevron-left" />
                    </button>
                    <button @click="changeMonth(1)" class="arrow-btn">
                        <Icon icon="lucide:chevron-right" />
                    </button>
                </div>
            </div>
        </header>

        <div class="month-container">
            <div class="weekday-grid">
                <div v-for="day in weekDaysFull" :key="day" class="weekday-item"
                    :class="{ 'sun': day === 'Sunday' || day === 'Saturday' }">
                    {{ day }}
                </div>
            </div>

            <div class="days-grid">
                <div v-for="(date, index) in calendarDays" :key="index" class="date-box"
                    :class="{ 'dimmed': !date.isCurrentMonth }"
                    @click="handleDateClick(date)">
                    <div class="box-top">
                        <span class="box-number" :class="{
                            'holiday': isOfficialHoliday(date.fullDate) || date.dayOfWeek === 0 || date.dayOfWeek === 6,
                            'today-circle-large': date.fullDate === todayStr
                        }">
                            {{ date.dayNumber }}
                        </span>
                    </div>
                    <div class="box-content">
                        <div v-if="isOfficialHoliday(date.fullDate) && date.dayNumber" class="strip holiday-bg">
                            {{ getHolidayName(date.fullDate) }}
                        </div>
                        <div v-for="b in getBookingsForDate(date.fullDate)" :key="b.id"
                            class="strip"
                            :style="{ background: urgencyColor(b.urgency) }"
                            @click.stop="handleDateClick(date)">
                            {{ b.fullName }}
                        </div>
                    </div>
                </div>
            </div>

            <button class="fab-btn" @click="goToBooking">
                <Icon icon="lucide:plus" width="32" height="32" color="#1a3a5f" />
            </button>
        </div>

        <Transition name="fade">
            <div v-if="isDetailPopupOpen" class="overlay-modal" @click.self="isDetailPopupOpen = false">
                <div class="card-modal">
                    <h3 class="modal-title">📅 {{ formatDateThai(selectedFullDate) }}</h3>
                    <div v-for="b in selectedDateBookings" :key="b.id" class="booking-item">
                        <div class="booking-badge" :style="{ background: urgencyColor(b.urgency) }">
                            {{ b.urgency }}
                        </div>
                        <p><strong>Patient:</strong> {{ b.fullName }}</p>
                        <p><strong>HN:</strong> {{ b.hn }}</p>
                        <p><strong>Procedure:</strong> {{ b.procedure }}</p>
                        <p v-if="b.isNpoRisk"><strong>🍼 NPO Risk</strong></p>
                        <p v-if="b.isInfected"><strong>🦠 Infection</strong></p>
                        <hr style="border-color:#eee; margin: 8px 0" />
                    </div>
                    <div class="actions">
                        <button @click="goToBooking" class="btn-fill">+ Add Patient</button>
                        <button @click="isDetailPopupOpen = false" class="btn-clear">Close</button>
                    </div>
                </div>
            </div>
        </Transition>
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

// ดึงคิวจาก Cloudflare แทน localStorage
const bookings = ref([])

onMounted(async () => {
    const license = localStorage.getItem('userLicense')
    try {
        const res = await fetch(`https://or-room-backend.rockzee2018.workers.dev/api/bookings?license=${license}`)
        const data = await res.json()
        bookings.value = Array.isArray(data) ? data : []
    } catch (e) {
        console.error('ดึงคิวไม่สำเร็จ', e)
    }
})

const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"]
const weekDaysFull = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']

const officialHolidays = [
    { date: "2026-01-01", name: "วันขึ้นปีใหม่" },
    { date: "2026-03-03", name: "วันมาฆบูชา" },
    { date: "2026-04-06", name: "วันจักรี" },
    { date: "2026-04-13", name: "วันสงกรานต์" },
    { date: "2026-04-14", name: "วันสงกรานต์" },
    { date: "2026-04-15", name: "วันสงกรานต์" },
    { date: "2026-05-01", name: "วันแรงงาน" },
    { date: "2026-05-04", name: "วันฉัตรมงคล" },
    { date: "2026-05-31", name: "วันวิสาขบูชา" },
    { date: "2026-06-03", name: "วันเฉลิมฯ พระราชินี" },
    { date: "2026-07-28", name: "วันเฉลิมฯ ร.10" },
    { date: "2026-08-12", name: "วันแม่แห่งชาติ" },
    { date: "2026-10-13", name: "วันนวมินทรมหาราช" },
    { date: "2026-10-23", name: "วันปิยมหาราช" },
    { date: "2026-12-05", name: "วันพ่อแห่งชาติ" },
    { date: "2026-12-10", name: "วันรัฐธรรมนูญ" },
    { date: "2026-12-31", name: "วันสิ้นปี" }
]

const isOfficialHoliday = (d) => officialHolidays.some(h => h.date === d)
const getHolidayName = (d) => officialHolidays.find(h => h.date === d)?.name || 'Holiday'

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
.calendar-page {
    height: 100vh;
    display: flex;
    flex-direction: column;
    background: #f4f7f9;
}

.calendar-navbar {
    background: linear-gradient(135deg, #174983, #1a3a5f);
    height: 85px;
    padding: 0 30px;
    display: flex;
    align-items: center;
    justify-content: space-between;
    
    /* 🔴 อัปเดต: เพิ่ม 2 บรรทัดนี้เข้าไป เพื่อให้ Navbar ถอยลงไปอยู่ใต้ไอคอน App.vue */
    position: relative;
    z-index: 10; 
}

.arrow-btn {
    width: 42px;
    height: 42px;
    border-radius: 50%;
    border: none;
    background: rgb(255, 255, 255);
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    transition: all 0.2s ease;
}

.nav-arrows { display: flex; flex-direction: row; gap: 8px; align-items: center; }
.nav-left, .nav-right { display: flex; align-items: center; justify-content: flex-end; gap: 12px; }
.nav-center { flex: 2; display: flex; justify-content: center; }

/* 🔥 ดันเลเยอร์ปุ่มและข้อความขึ้นมาให้ลอยเหนือ App.vue จะได้กดได้ */
.nav-center, 
.nav-right {
    position: relative;
    z-index: 100; 
}

.nav-right { justify-content: flex-end; gap: 12px; }
.month-label { font-size: 1.4rem; margin: 0; color: white; }
.year-label { color: white; }

.today-btn {
    background: rgba(255, 255, 255, 0.2);
    color: white;
    border: 1px solid rgba(255, 255, 255, 0.4);
    padding: 5px 15px;
    border-radius: 6px;
    cursor: pointer;
}

.month-container {
    margin: 15px;
    flex-grow: 1;
    display: flex;
    flex-direction: column;
    background: white;
    border-radius: 12px;
    overflow: hidden;
    box-shadow: 0 4px 15px rgba(0, 0, 0, 0.05);
    border: 1px solid #5284af;
}

.weekday-grid {
    display: grid;
    grid-template-columns: repeat(7, 1fr);
    background: #ffffff;
    border-bottom: 1px solid #eee;
}

.weekday-item {
    padding: 12px;
    text-align: center;
    font-size: 0.75rem;
    font-weight: bold;
    color: #777;
    text-transform: uppercase;
}

.sun { color: #d9534f; }
.days-grid { display: grid; grid-template-columns: repeat(7, 1fr); flex-grow: 1; color: #000000; }

.date-box {
    border-right: 1px solid #eee;
    border-bottom: 1px solid #eee;
    min-height: 90px;
    padding: 5px;
    cursor: pointer;
    display: flex;
    flex-direction: column;
}

.box-number {
    font-size: 0.95rem;
    width: 34px;
    height: 34px;
    display: flex;
    align-items: center;
    justify-content: center;
}

.today-circle-large { background: #1a73e8; color: white !important; border-radius: 50%; font-weight: bold; }
.holiday { color: #d9534f; font-weight: bold; }

.strip {
    font-size: 0.7rem; 
    padding: 4px 6px;
    border-radius: 4px;
    color: white;
    margin-top: 3px;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
}

.holiday-bg { background: #e57373; }
.note-bg { background: #56a394; }

.fab-btn {
    position: fixed;
    bottom: 35px;
    right: 35px;
    background: white;
    border: 3px solid #1a3a5f;
    width: 62px;
    height: 62px;
    border-radius: 50%;
    display: flex;
    justify-content: center;
    align-items: center;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
    cursor: pointer;
    z-index: 100; /* ดันปุ่มบวกให้ลอยขึ้นมาด้วยเผื่อกดไม่ได้ */
}

.overlay-modal {
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: rgba(0, 0, 0, 0.5);
    display: flex;
    justify-content: center;
    align-items: center;
    z-index: 999;
}

.card-modal {
    background: white;
    padding: 25px;
    border-radius: 20px;
    width: 320px;
}

.inp {
    width: 100%;
    margin-bottom: 10px;
    padding: 10px;
    border: 1px solid #eee;
    border-radius: 10px;
    box-sizing: border-box;
}

.btn-fill { background: #2c4c87; color: white; border: none; padding: 8px 20px; border-radius: 10px; cursor: pointer; margin-left: 5%; }
.btn-del { background: #c2185b; color: white; border: none; padding: 8px 20px; border-radius: 10px; cursor: pointer; }
.btn-clear { background: none; border: none; color: #999; cursor: pointer; }

.booking-item { margin-bottom: 8px; font-size: 13px; color: #333; }
.booking-badge { display: inline-block; color: white; font-size: 11px; padding: 2px 8px; border-radius: 10px; margin-bottom: 4px; font-weight: bold; }
</style>