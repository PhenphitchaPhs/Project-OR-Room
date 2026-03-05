<template>
    <div class="calendar-page">
        <header class="calendar-navbar">
            <div class="nav-left">
                <button @click="goHome" class="nav-icon-btn" title="Back to Home">
                    <Icon icon="lucide:home" width="24" height="24" />
                </button>
            </div>

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
                <div v-for="day in weekDaysFull" :key="day" class="weekday-item" :class="{ 'sun': day === 'Sunday' }">
                    {{ day }}
                </div>
            </div>

            <div class="days-grid">
                <div v-for="(date, index) in calendarDays" :key="index" class="date-box"
                    :class="{ 'dimmed': !date.isCurrentMonth }" @click="handleDateClick(date)">
                    <div class="box-top">
                        <span class="box-number" :class="{
                            'holiday': isOfficialHoliday(date.fullDate) || date.dayOfWeek === 0,
                            'today-circle-large': date.fullDate === todayStr
                        }">
                            {{ date.dayNumber }}
                        </span>
                    </div>
                    <div class="box-content">
                        <div v-if="isOfficialHoliday(date.fullDate) && date.dayNumber" class="strip holiday-bg">Holiday
                        </div>
                        <div v-if="hasNote(date.fullDate)" class="strip note-bg"
                            @click.stop="openDetailPopup(date.fullDate)">
                            {{ getSavedNote(date.fullDate).patientName }}
                        </div>
                    </div>
                </div>
            </div>

            <button class="fab-btn" @click="isAddPopupOpen = true">
                <Icon icon="lucide:plus" width="32" height="32" color="#1a3a5f" />
            </button>
        </div>

        <Transition name="fade">
            <div v-if="isAddPopupOpen" class="overlay-modal" @click.self="isAddPopupOpen = false">
                <div class="card-modal">
                    <h3 class="modal-title">Add Patient</h3>
                    <p class="modal-date">{{ formatDateThai(selectedFullDate) }}</p>
                    <input v-model="tempNote.patientName" placeholder="Patient Name" class="inp" />
                    <textarea v-model="tempNote.procedure" placeholder="Details" class="inp" rows="3"></textarea>
                    <div class="actions">
                        <button @click="isAddPopupOpen = false" class="btn-clear">Cancel</button>
                        <button @click="saveNote" class="btn-fill">Save</button>
                    </div>
                </div>
            </div>
        </Transition>

        <Transition name="fade">
            <div v-if="isDetailPopupOpen" class="overlay-modal" @click.self="isDetailPopupOpen = false">
                <div class="card-modal">
                    <h3 class="modal-title">Patient Details</h3>
                    <div v-if="getSavedNote(selectedFullDate)" class="detail-info">
                        <p><strong>Name:</strong> {{ getSavedNote(selectedFullDate).patientName }}</p>
                        <p><strong>Procedure:</strong> {{ getSavedNote(selectedFullDate).procedure || '-' }}</p>
                    </div>
                    <div class="actions">
                        <button @click="deleteNote" class="btn-del">Delete</button>
                        <button @click="isDetailPopupOpen = false" class="btn-fill">Close</button>
                    </div>
                </div>
            </div>
        </Transition>
    </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { useRouter } from 'vue-router' // ✅ สำหรับเชื่อมหน้า Home
import { Icon } from '@iconify/vue'

const router = useRouter()
const now = new Date()
const currentMonth = ref(now.getMonth())
const currentYear = ref(now.getFullYear())
const todayStr = ref(`${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`)

const selectedFullDate = ref(todayStr.value)
const isAddPopupOpen = ref(false)
const isDetailPopupOpen = ref(false)
const userNotes = ref([])
const tempNote = ref({ patientName: '', procedure: '' })

const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"]
const weekDaysFull = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
const officialHolidays = ["2026-01-01", "2026-03-03", "2026-04-13", "2026-04-14", "2026-04-15", "2026-05-01", "2026-08-12", "2026-12-05"]

const isOfficialHoliday = (d) => officialHolidays.includes(d)
const hasNote = (d) => userNotes.value.some(n => n.date === d)
const getSavedNote = (d) => userNotes.value.find(n => n.date === d)

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

const goHome = () => router.push('/') // ✅ พาไปหน้าแรกจริง
const goToToday = () => { currentMonth.value = now.getMonth(); currentYear.value = now.getFullYear(); selectedFullDate.value = todayStr.value; }
const changeMonth = (v) => {
    currentMonth.value += v
    if (currentMonth.value > 11) { currentMonth.value = 0; currentYear.value++; }
    else if (currentMonth.value < 0) { currentMonth.value = 11; currentYear.value--; }
}
const handleDateClick = (date) => { if (date.isCurrentMonth) { selectedFullDate.value = date.fullDate; if (!hasNote(date.fullDate)) isAddPopupOpen.value = true; } }
const openDetailPopup = (d) => { selectedFullDate.value = d; isDetailPopupOpen.value = true; }
const saveNote = () => { if (tempNote.value.patientName) { userNotes.value.push({ date: selectedFullDate.value, ...tempNote.value }); isAddPopupOpen.value = false; tempNote.value = { patientName: '', procedure: '' }; } }
const deleteNote = () => { userNotes.value = userNotes.value.filter(n => n.date !== selectedFullDate.value); isDetailPopupOpen.value = false; }
const formatDateThai = (d) => `${monthNames[new Date(d).getMonth()]} ${new Date(d).getDate()}, ${new Date(d).getFullYear() + 543}`
</script>

<style scoped>
.calendar-page {
    height: 100vh;
    display: flex;
    flex-direction: column;
    background: #f4f7f9;
}

/* พื้นหลังเทาจาง */
.calendar-navbar {
    background: linear-gradient(135deg, #174983, #1a3a5f);
    height: 85px;
    /* เดิม 70-75 → เพิ่มเป็น 85 */
    padding: 0 30px;
    display: flex;
    align-items: center;
    /* สำคัญมาก */
    justify-content: space-between;
}


/* ปุ่มไอคอน */
.nav-icon-btn,
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

.nav-icon-btn:hover,
.nav-arrows {
    display: flex;
    flex-direction: row;
    /* 🔥 บังคับให้อยู่แนวนอน */
    gap: 8px;
    align-items: center;
}



.nav-left,
.nav-right {
    display: flex;
    align-items: center;
    justify-content: flex-end;
    gap: 12px;
}


.nav-center {
    flex: 2;
    display: flex;
    justify-content: center;
}

.nav-right {
    justify-content: flex-end;
    gap: 12px;
}

.month-label {
    font-size: 1.4rem;
    margin: 0;
    color: white;
}

.year-label {
    color: white;
}

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

.sun {
    color: #d9534f;
}

.days-grid {
    display: grid;
    grid-template-columns: repeat(7, 1fr);
    flex-grow: 1;
    color: #000000;
}

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

.today-circle-large {
    background: #1a73e8;
    color: white !important;
    border-radius: 50%;
    font-weight: bold;
}

.holiday {
    color: #d9534f;
    font-weight: bold;
}

.strip {
    font-size: 0.65rem;
    padding: 3px 6px;
    border-radius: 4px;
    color: white;
    margin-top: 3px;
}

.holiday-bg {
    background: #d9534f;
}

.note-bg {
    background: #56a394;
}

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

.btn-fill {
    background: #2c4c87;
    color: white;
    border: none;
    padding: 8px 20px;
    border-radius: 10px;
    cursor: pointer;
    margin-left: 5%;
}

.btn-del {
    background: #c2185b;
    color: white;
    border: none;
    padding: 8px 20px;
    border-radius: 10px;
    cursor: pointer;
}

.btn-clear {
    background: none;
    border: none;
    color: #999;
    cursor: pointer;
}
</style>