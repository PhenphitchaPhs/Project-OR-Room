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
                <button class="today-btn" @click="goToToday">วันนี้</button>
            </div>
        </header>

        <div class="weekday-row">
            <div v-for="d in ['อา.', 'จ.', 'อ.', 'พ.', 'พฤ.', 'ศ.', 'ส.']" :key="d" class="weekday-cell"
                :class="{ 'weekend-label': d === 'อา.' || d === 'ส.' }">{{ d }}</div>
        </div>

        <div class="calendar-grid">
            <div v-for="(date, i) in calendarDays" :key="i" class="day-cell" :class="{
                'empty-cell': !date.isCurrentMonth,
                'today-cell': date.fullDate === todayStr,
                'weekend-cell': date.isCurrentMonth && (date.dayOfWeek === 0 || date.dayOfWeek === 6),
                'holiday-cell': date.isCurrentMonth && isOfficialHoliday(date.fullDate),
                'has-booking': date.isCurrentMonth && hasBooking(date.fullDate),
            }" @click="date.isCurrentMonth && handleDateClick(date)">
                <span class="day-number" :class="{ 'today-circle': date.fullDate === todayStr }">{{ date.dayNumber
                    }}</span>
                <span v-if="date.isCurrentMonth && isOfficialHoliday(date.fullDate)" class="holiday-tag">{{
                    getHolidayName(date.fullDate) }}</span>
                <span v-if="date.isCurrentMonth && !isClosedDay(date.fullDate)" class="capacity-badge"
                    :class="{ 'badge-full': availableRoomsCount(date.fullDate) === 0, 'badge-available': availableRoomsCount(date.fullDate) > 0 }">{{
                        availableRoomsCount(date.fullDate) }}/20 ห้องว่าง</span>
                <div class="dot-row">
                    <span v-for="b in getBookingsForDate(date.fullDate).slice(0, 3)" :key="b.id" class="dot"
                        :style="{ background: b.doctorLicense === myLicense ? urgencyColor(b.urgency) : '#b0b8c1' }"></span>
                    <span v-if="getBookingsForDate(date.fullDate).length > 3" class="more-count">+{{
                        getBookingsForDate(date.fullDate).length - 3 }}</span>
                </div>
            </div>
        </div>

        <Transition name="fade">
            <div v-if="isDetailPopupOpen" class="overlay-modal" @click.self="isDetailPopupOpen = false">
                <div class="card-modal">
                    <h3 class="modal-title">📅 {{ formatDateThai(selectedFullDate) }}</h3>
                    <p v-if="!isClosedDay(selectedFullDate)" class="capacity-line">
                        🏥 ห้องว่าง {{ availableRoomsCount(selectedFullDate) }}/20 ห้อง
                    </p>
                    <p v-else class="capacity-line capacity-closed-text">
                        🔒 ห้องผ่าตัดปิดทำการ
                    </p>


                    <!-- 📍 แสดงสถานะของห้องผ่าตัดทุกห้อง (OR-201 ถึง OR-220) พร้อมเวลาที่เหลือและสีบอกสถานะ -->
                    <div v-if="!isClosedDay(selectedFullDate)" class="room-grid">
                        <div v-for="r in orRooms" :key="r" class="room-chip"
                            :class="{
                                'room-full': isRoomFull(selectedFullDate, r),
                                'room-partial': isRoomPartial(selectedFullDate, r),
                                'room-available': isRoomEmpty(selectedFullDate, r)
                            }">
                            <span class="room-num">OR-{{ r }}</span>
                            <span class="room-time">{{ roomRemainingLabel(selectedFullDate, r) }}</span>
                        </div>
                    </div>

                    <div v-if="selectedDateBookings.length === 0" class="empty-state">
                        ยังไม่มีคิวที่จองในวันนี้
                    </div>

                    <div v-for="b in selectedDateBookings" :key="b.id" class="booking-item">
                        <template v-if="b.doctorLicense === myLicense">
                            <p><strong>Room:</strong> {{ b.room || '-' }}</p>
                            <p><strong>Patient:</strong> {{ b.fullName }}</p>
                            <p><strong>HN:</strong> {{ b.hn }}</p>
                            <p><strong>Age / Gender:</strong> {{ b.age || '-' }} ปี · {{ b.gender === 'female' ? 'หญิง'
                                : 'ชาย' }}</p>
                            <p><strong>Procedure:</strong> {{ b.procedure }}</p>
                            <p v-if="b.isNpoRisk">🍼 <strong>NPO Risk</strong></p>
                            <p v-if="b.isInfected">🦠 <strong>Infection Risk</strong></p>
                            <button class="btn-edit-booking" @click="goToEditBooking(b.id)">✏️ Edit
                                (เพิ่ม/เปลี่ยนวันที่และห้อง)</button>
                        </template>
                        <template v-else>
                            <p class="other-booking-line">🔒 ห้อง {{ b.room || '-' }} ถูกจองแล้ว (คิวของแพทย์ท่านอื่น)
                            </p>
                        </template>
                        <hr style="border-color:#eee; margin: 8px 0" />
                    </div>
                    <div class="actions">
                        <button v-if="canBookOnDate(selectedFullDate)" @click="goToBooking(selectedFullDate)"
                            class="btn-fill">+ Add
                            Queue</button>
                        <button @click="isDetailPopupOpen = false" class="btn-clear">Close</button>
                    </div>
                </div>
            </div>
        </Transition>

        <button class="fab-btn" @click="goToBooking()">
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
const todayStr = ref(`${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`)

const selectedFullDate = ref(todayStr.value)
const isDetailPopupOpen = ref(false)
const selectedDateBookings = ref([])

const bookings = ref([])
const officialHolidays = ref([])
const MAX_MINUTES = 420
// 📍 license ของแพทย์ที่ login อยู่ ใช้เทียบว่าคิวนี้เป็นของตัวเองไหม
const myLicense = localStorage.getItem('userLicense')
// 📍 เลขห้องผ่าตัด OR-201 ถึง OR-220
const orRooms = Array.from({ length: 20 }, (_, i) => 201 + i)

onMounted(async () => {
    const license = localStorage.getItem('userLicense')

    // 📍 ดึงคิวทั้งหมดของทุกแพทย์ (ไม่กรอง license) เพื่อใช้แสดงว่าห้องไหนถูกจองแล้วบ้าง
    // ส่วนข้อมูลผู้ป่วยของคนอื่นจะถูกซ่อนตอนแสดงผล (เห็นแค่ว่าห้องถูกจองแล้ว)
    try {
        const res = await fetch(`https://or-room-backend.rockzee2018.workers.dev/api/bookings`)
        const data = await res.json()
        bookings.value = Array.isArray(data) ? data : []
    } catch (e) {
        console.error('ดึงคิวไม่สำเร็จ', e)
    }


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

// เปลี่ยนชื่อเดือนเป็นภาษาไทย
const monthNames = ["มกราคม", "กุมภาพันธ์", "มีนาคม", "เมษายน", "พฤษภาคม", "มิถุนายน", "กรกฎาคม", "สิงหาคม", "กันยายน", "ตุลาคม", "พฤศจิกายน", "ธันวาคม"]

const isOfficialHoliday = (d) => officialHolidays.value.some(h => h.date === d)
const getHolidayName = (d) => officialHolidays.value.find(h => h.date === d)?.name || 'วันหยุด'

const isWeekend = (d) => {
    const dow = new Date(d + 'T00:00:00').getDay()
    return dow === 0 || dow === 6
}
const isClosedDay = (d) => isWeekend(d) || isOfficialHoliday(d)


const canBookOnDate = (d) =>
    !isClosedDay(d)

const sortByAgeThenFemaleFirst = (arr) => {
    return [...arr].sort((a, b) => {
        const ageA = Number(a.age) || 0
        const ageB = Number(b.age) || 0
        if (ageB !== ageA) return ageB - ageA
        const femaleA = a.gender === 'female' ? 0 : 1
        const femaleB = b.gender === 'female' ? 0 : 1
        return femaleA - femaleB
    })
}

const getBookingsForDate = (d) => sortByAgeThenFemaleFirst(bookings.value.filter(b => b.date === d && b.status !== 'Succeed'))
const hasBooking = (d) => getBookingsForDate(d).length > 0

// 📍 ดึงเฉพาะตัวเลขห้องออกมาเทียบ กันกรณีข้อมูลเก่า/รูปแบบไม่ตรงเป๊ะ เช่น "OR-201", "OR201", "201"
const getRoomNumber = (roomStr) => {
    const match = String(roomStr || '').match(/(\d+)/)
    return match ? parseInt(match[1]) : null
}

const getUsedMinutesForRoom = (d, roomNum) => {
    return bookings.value
        .filter(b => b.date === d && getRoomNumber(b.room) === roomNum && b.status !== 'Succeed' && b.status !== 'Cancelled')
        .reduce((sum, b) => {
            const match = b.procedure?.match(/(\d+)\s*min/)
            return sum + (match ? parseInt(match[1]) : 0)
        }, 0)
}
const isRoomFull = (d, roomNum) => getUsedMinutesForRoom(d, roomNum) >= MAX_MINUTES
// 📍 3 ระดับสี: ว่าง (0 นาที) / บางส่วน (> 0 และ < MAX) / เต็ม (≥ MAX)
const isRoomEmpty = (d, roomNum) => getUsedMinutesForRoom(d, roomNum) === 0
const isRoomPartial = (d, roomNum) => {
    const used = getUsedMinutesForRoom(d, roomNum)
    return used > 0 && used < MAX_MINUTES
}
const roomRemainingLabel = (d, roomNum) => {
    const remain = Math.max(MAX_MINUTES - getUsedMinutesForRoom(d, roomNum), 0)
    if (remain <= 0) return 'เต็ม'
    const hrs = Math.floor(remain / 60)
    const mins = remain % 60
    return `${hrs}ชม${mins > 0 ? ' ' + mins + 'น' : ''}`
}
// 📍 จำนวนห้องที่ยังว่างอยู่ในวันนั้น (จาก 20 ห้อง) ใช้แสดง badge สรุปในตารางปฏิทิน
const availableRoomsCount = (d) => orRooms.filter(r => !isRoomFull(d, r)).length

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
    isDetailPopupOpen.value = true
}

const goToBooking = (lockDate = null) => {
    if (lockDate) {
        router.push({ path: '/booking', query: { date: lockDate } })
    } else {
        router.push('/booking')
    }
}

// 📍 ไปหน้าแก้ไขคิว (เฉพาะคิวของตัวเอง เปลี่ยนวันที่/ห้อง/ข้อมูลผู้ป่วยได้)
const goToEditBooking = (bookingId) => {
    router.push(`/booking/${bookingId}`)
}

// อัปเดตฟังก์ชันเพื่อแสดงผล วัน เดือน ปี (พ.ศ.) ในภาษาไทย
const formatDateThai = (d) => {
    if (!d) return ''
    const dt = new Date(d + 'T00:00:00')
    return `${dt.getDate()} ${monthNames[dt.getMonth()]} ${dt.getFullYear() + 543}`
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
    justify-content: space-between;
}

.nav-left {
    width: 40px;
}

.nav-center {
    display: flex;
    align-items: center;
    gap: 12px;
    flex: 1;
    justify-content: center;
}

.nav-right {
    width: 80px;
    display: flex;
    justify-content: flex-end;
}

.ctrl-btn {
    background: rgba(255, 255, 255, 0.2);
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

.ctrl-btn:hover {
    background: rgba(255, 255, 255, 0.3);
}

.month-label {
    font-weight: 700;
    font-size: 1rem;
    color: white;
}

.today-btn {
    background: rgba(255, 255, 255, 0.2);
    color: white;
    border: 1.5px solid rgba(255, 255, 255, 0.4);
    padding: 6px 14px;
    border-radius: 8px;
    font-size: 13px;
    cursor: pointer;
    font-weight: 600;
}

.today-btn:hover {
    background: rgba(255, 255, 255, 0.3);
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
}

.weekend-label {
    color: #c0392b;
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

.capacity-badge {
    display: inline-block;
    font-size: 8.5px;
    font-weight: 700;
    padding: 1px 5px;
    border-radius: 6px;
    margin-top: 3px;
    color: white;
}

.badge-available {
    background: #43a047;
}

.badge-full {
    background: #e53935;
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
    background: rgba(0, 0, 0, 0.45);
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

.capacity-line {
    font-size: 12.5px;
    font-weight: 600;
    color: #2e7d32;
    margin-bottom: 14px;
}

.capacity-closed-text {
    color: #757575;
}

.empty-state {
    text-align: center;
    color: #888;
    font-size: 13px;
    padding: 20px 0;
}

.room-grid {
    display: grid;
    grid-template-columns: repeat(5, 1fr);
    gap: 6px;
    margin-bottom: 16px;
}

.room-chip {
    border-radius: 8px;
    padding: 6px 4px;
    text-align: center;
    color: white;
}

.room-chip.room-available {
    background: #43a047;
}

.room-chip.room-partial {
    background: #f59e0b;
}

.room-chip.room-full {
    background: #e53935;
}

.room-num {
    display: block;
    font-size: 10px;
    font-weight: 700;
}

.room-time {
    display: block;
    font-size: 9px;
    opacity: 0.9;
    margin-top: 1px;
}

.other-booking-line {
    font-size: 13px;
    color: #888;
    font-style: italic;
}

.btn-edit-booking {
    margin-top: 6px;
    background: #e8f0fe;
    color: #1a3a5f;
    border: none;
    padding: 6px 12px;
    border-radius: 8px;
    font-size: 12.5px;
    font-weight: 600;
    cursor: pointer;
}

.btn-edit-booking:hover {
    background: #d6e4fb;
}

.booking-item {
    margin-bottom: 10px;
}

.booking-item p {
    font-size: 13px;
    color: #333;
    margin: 3px 0;
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
</style>