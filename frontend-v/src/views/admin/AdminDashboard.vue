<template>
    <div class="main-layout">

        <!-- Logout Modal -->
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
            <div v-if="dialogOpen" class="modal-overlay-center">
                <div class="white-modal-card">
                    <h2 class="modal-msg-title">{{ dialogTitle }}</h2>

                    <p style="margin-bottom:20px">
                        {{ dialogMessage }}
                    </p>

                    <div class="modal-button-group">
                        <button class="btn-cancel-blue" @click="dialogOpen = false">
                            Cancel
                        </button>

                        <button class="btn-confirm-green" @click="
                            dialogCallback?.();
                        dialogOpen = false;
                        ">
                            Confirm
                        </button>
                    </div>
                </div>
            </div>
        </Transition>

        <!-- Top Nav -->
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
            <button class="nav-btn" @click="router.push('/admin-home')">
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24">
                    <path fill="white" d="M10 20v-6h4v6h5v-8h3L12 3L2 12h3v8z" />
                </svg>
                <span>Queue</span>
            </button>
            <button class="nav-btn" @click="router.push('/admin-calendar')">
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

        <!-- Content: sidebar เล็ก + page-container -->
        <div class="body-layout">
            <aside class="section-nav">
                <button class="section-nav-btn" :class="{ active: activeSection === 'dashboard' }"
                    @click="activeSection = 'dashboard'">
                    <span class="section-nav-emoji">📊</span>
                    <span>Admin Dashboard</span>
                </button>

                <button class="section-nav-btn" :class="{ active: activeSection === 'fiscal' }"
                    @click="activeSection = 'fiscal'">
                    <span class="section-nav-emoji">📅</span>
                    <span>Fiscal Year</span>
                </button>

                <button class="section-nav-btn" :class="{ active: activeSection === 'doctors' }"
                    @click="activeSection = 'doctors'">
                    <span class="section-nav-emoji">👨‍⚕️</span>
                    <span>Doctor Accounts</span>
                </button>
            </aside>

            <div class="page-container">

                <!-- ===== Section: Admin Dashboard ===== -->
                <div v-if="activeSection === 'dashboard'">
                    <h1 class="main-title">📊 Admin Dashboard</h1>

                    <!-- Stats Cards: เคสที่กำลังจะมาถึง / เคสที่ถูกยกเลิก (ดีไซน์ทางการ) -->
                    <div class="formal-stats-row">
                        <div class="formal-stat-card accent-blue">
                            <div class="formal-stat-top">
                                <span class="formal-stat-label">เคสที่กำลังจะมาถึง</span>
                                <span class="formal-stat-icon-badge blue">
                                    <span class="material-icons">event_upcoming</span>
                                </span>
                            </div>
                            <div class="formal-stat-number">{{ upcomingCount }}</div>
                            <div class="formal-stat-foot">รายการที่ยังไม่ถึงวันผ่าตัด</div>
                        </div>

                        <div class="formal-stat-card accent-red">
                            <div class="formal-stat-top">
                                <span class="formal-stat-label">เคสที่ถูกยกเลิก</span>
                                <span class="formal-stat-icon-badge red">
                                    <span class="material-icons">cancel</span>
                                </span>
                            </div>
                            <div class="formal-stat-number">{{ cancelledCount }}</div>
                            <div class="formal-stat-foot">รายการที่ถูกยกเลิกทั้งหมด</div>
                        </div>
                    </div>

                    <!-- Surgery Room Queues -->
                    <div class="doctor-section" style="margin-bottom: 20px;">
                        <div class="section-header">
                            <h2 class="section-title">🏥 คิวห้องผ่าตัดวันนี้</h2>
                        </div>

                        <div class="room-queue-wrap">
                            <div v-if="loading" class="empty-state" style="padding: 30px">
                                <p>กำลังโหลด...</p>
                            </div>
                            <div v-else-if="roomQueues.length === 0" class="empty-state" style="padding: 30px">
                                <p>ไม่มีคิวผ่าตัดในขณะนี้</p>
                            </div>

                            <div v-else class="room-list">
                                <div v-for="rq in roomQueues" :key="rq.room" class="room-card"
                                    @click="toggleRoom(rq.room)">
                                    <div class="room-summary">
                                        <div class="room-summary-left">
                                            <span class="room-status-dot" :class="rq.status.class"></span>
                                            <div>
                                                <div class="room-name-row">
                                                    <span class="room-name">{{ rq.room }}</span>
                                                    <span class="room-status-text" :class="rq.status.class">{{
                                                        rq.status.label }}</span>
                                                </div>
                                                <div class="room-current">
                                                    <span v-if="rq.current">
                                                        <span class="live-tag">🔴 กำลังผ่าตัด</span> {{
                                                            rq.current.procedureName }}
                                                    </span>
                                                    <span v-else>ไม่มีคิว</span>
                                                </div>
                                            </div>
                                        </div>

                                        <div class="room-summary-right">
                                            <span class="room-count-badge">{{ rq.queues.length }} คิว</span>
                                            <span class="room-min-badge">{{ rq.totalMinutes }} นาที</span>
                                            <span class="material-icons expand-icon">
                                                {{ expandedRoom === rq.room ? 'expand_less' : 'expand_more' }}
                                            </span>
                                        </div>
                                    </div>

                                    <transition name="expand">
                                        <div v-if="expandedRoom === rq.room" class="room-detail" @click.stop>
                                            <div v-for="(q, idx) in rq.queues" :key="idx" class="queue-row">
                                                <span class="queue-order">#{{ idx + 1 }}</span>
                                                <div class="queue-info">
                                                    <div class="queue-procedure-row">
                                                        <span class="queue-procedure">{{ q.procedureName }}</span>
                                                        <span class="queue-live-badge"
                                                            :class="{ 'is-active': idx === 0 }">
                                                            {{ idx === 0 ? '🔴 กำลังผ่าตัด' : '⏳ รอคิว' }}
                                                        </span>
                                                    </div>
                                                    <div class="queue-meta">HN {{ q.hn }} · {{ q.patientName }}</div>
                                                    <div class="queue-doctor-row">👨‍⚕️ {{ q.doctorName }}</div>
                                                </div>
                                                <span v-if="q.duration" class="queue-duration">{{ q.duration }}
                                                    น.</span>
                                            </div>
                                        </div>
                                    </transition>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- ===== Section: Fiscal Year ===== -->
                <div v-if="activeSection === 'fiscal'">
                    <h1 class="main-title">📅 สถิติปีงบประมาณ</h1>
                    <FiscalYearStats :bookings="bookings" />
                </div>

                <!-- ===== Section: Doctor Accounts ===== -->
                <div v-if="activeSection === 'doctors'">
                    <h1 class="main-title">👨‍⚕️ Doctor Accounts</h1>

                    <div class="doctor-section">
                        <div class="section-header">
                            <h2 class="section-title">👨‍⚕️ Doctor Accounts</h2>
                        </div>
                        <div class="doctor-table-wrap">
                            <div v-if="loading" class="empty-state" style="padding: 30px">
                                <p>กำลังโหลด...</p>
                            </div>
                            <div v-else-if="doctorList.length === 0" class="empty-state" style="padding: 30px">
                                <p>No doctor accounts found.</p>
                            </div>
                            <table v-else class="doctor-table">
                                <thead>
                                    <tr>
                                        <th>License</th>
                                        <th>Name</th>
                                        <th>Role</th>
                                        <th>Action</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    <tr v-for="doc in doctorList" :key="doc.license">
                                        <td>{{ doc.license }}</td>
                                        <td>{{ doc.doctorName }}</td>
                                        <td>
                                            <span class="role-badge" :class="getRoleClass(doc.role)">
                                                {{ getRoleLabel(doc.role) }}
                                            </span>
                                            <select class="role-select" :value="doc.role || 'user'"
                                                @change="changeRole(doc.license, $event.target.value)">
                                                <option value="user">User</option>
                                                <option value="admin">Admin</option>
                                            </select>
                                        </td>
                                        <td>
                                            <button v-if="doc.role !== 'admin'" class="btn-delete-doc"
                                                @click="deleteDoctor(doc.license, doc.doctorName)">Delete</button>
                                            <span v-else class="protected-text">Protected</span>
                                        </td>
                                    </tr>
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>

            </div>
        </div>

    </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted, computed } from 'vue'
import { useRouter } from 'vue-router'
import { apiFetch } from '../../api/client'
import FiscalYearStats from '../../components/report/FiscalYearStats.vue'

const router = useRouter()
const userLicense = ref('Admin')
const doctorList = ref([])
const doctorMap = ref({})
const bookings = ref([])
const loading = ref(true)
const isLogoutModalOpen = ref(false)
const activeSection = ref('dashboard') // 'dashboard' | 'fiscal' | 'doctors'


// 🐛 Fix: ปรับปรุงการดึงวันที่ปัจจุบันให้ตรงกับ Local Timezone (แก้ปัญหา UTC offset)
const tzOffset = new Date().getTimezoneOffset() * 60000
const todayStr = new Date(Date.now() - tzOffset).toISOString().split('T')[0]

// ✅ เปลี่ยน Succeed → Completed
const upcomingCount = computed(() => bookings.value.filter(b => b.status === 'Upcoming' || !b.status).length)
const succeedCount = computed(() => bookings.value.filter(b => b.status === 'Completed').length)
// ✅ เปลี่ยน Succeed → Completed
const todayCount = computed(() =>
    bookings.value.filter(
        b => b.date === todayStr &&
            b.status !== 'Completed'
    ).length
)
const cancelledCount = computed(() =>
    bookings.value.filter(
        b => b.status === 'Cancelled'
    ).length
)

// 🏥 จัดกลุ่มคิวผ่าตัดตามห้อง (ไม่รวม Cancelled/Succeed) — อิงลำดับคิว (queueOrder) + นาทีจาก procedure
const roomQueues = computed(() => {
    const groups = {}

    bookings.value
        .filter(b =>
            b.date === todayStr &&
            b.status !== 'Cancelled' &&
            // ✅ เปลี่ยน Succeed → Completed
            b.status !== 'Completed'
        )
        .forEach(b => {
            const roomKey = String(b.room || '').match(/(\d+)/)?.[1]
            if (!roomKey) return

            const durationMatch = b.procedure?.match(/(\d+)\s*min/)
            const duration = durationMatch ? parseInt(durationMatch[1]) : null
            const procedureName = (b.procedure || '-').replace(/\s*-\s*\d+\s*min[s]?.*$/i, '')

            if (!groups[roomKey]) groups[roomKey] = []

            groups[roomKey].push({
                order: b.queueOrder || 999,
                duration,
                procedureName,
                hn: b.hn,
                patientName: b.fullName,
                doctorName: doctorMap.value[b.doctorLicense] || b.doctorLicense || '-',
            })
        })

    Object.values(groups).forEach(list => list.sort((a, b) => a.order - b.order))

    return Object.entries(groups)
        .map(([room, queues]) => {
            const totalMinutes = queues.reduce((sum, q) => sum + (q.duration || 0), 0)
            return {
                room: `OR-${room}`,
                queues,
                totalMinutes,
                status: getRoomStatus(totalMinutes),
                current: queues[0] || null, // คิวแรกในลำดับ = กำลังผ่าตัดอยู่
            }
        })
        .sort((a, b) => a.room.localeCompare(b.room, undefined, { numeric: true }))
})

// เก็บว่าห้องไหนถูกกางรายละเอียดอยู่ (คลิกซ้ำเพื่อพับ)
const expandedRoom = ref(null)
const toggleRoom = (room) => {
    expandedRoom.value = expandedRoom.value === room ? null : room
}

// สถานะห้องแบบย่อ ใช้สีบอกสถานะทำนองเดียวกับหน้า Home (ว่าง/บางส่วน/เต็ม)
const OR_MAX_MINUTES = 420 // 7 ชม. มาตรฐานต่อห้อง
const getRoomStatus = (totalMinutes) => {
    if (totalMinutes === 0) return { label: 'ว่าง', class: 'available' }
    if (totalMinutes < OR_MAX_MINUTES) return { label: 'กำลังใช้งาน', class: 'partial' }
    return { label: 'เต็ม', class: 'full' }
}

onMounted(async () => {
    const savedLicense = localStorage.getItem('userLicense')
    if (savedLicense) userLicense.value = savedLicense

    try {
        const [resBookings, resUsers] = await Promise.all([
            apiFetch('/api/bookings'),
            apiFetch('/api/users')
        ])
        const bData = await resBookings.json()
        const uData = await resUsers.json()

        bookings.value = Array.isArray(bData) ? bData : (bData?.bookings ?? bData?.data ?? [])

        let userArray = []
        if (Array.isArray(uData)) {
            userArray = uData
        } else if (Array.isArray(uData?.users)) {
            userArray = uData.users
        } else if (Array.isArray(uData?.data)) {
            userArray = uData.data
        } else if (Array.isArray(uData?.results)) {
            userArray = uData.results
        }

        doctorList.value = userArray
        userArray.forEach(u => { doctorMap.value[u.license] = u.doctorName })
    } catch (e) {
        console.error('โหลดข้อมูลไม่สำเร็จ', e)
    } finally {
        loading.value = false
    }
})

const dialogOpen = ref(false)
const dialogTitle = ref('')
const dialogMessage = ref('')
const dialogType = ref('info')
const dialogCallback = ref(null)
const showDialog = (title, message, callback = null) => {
    dialogTitle.value = title
    dialogMessage.value = message
    dialogCallback.value = callback
    dialogOpen.value = true
}


const deleteDoctor = (license, name) => {
    showDialog(
        'Delete Doctor',
        `ลบบัญชี "${name}" ออกจากระบบ?`,
        async () => {
            try {
                const res = await apiFetch(
                    `/api/users/${license}`,
                    {
                        method: 'DELETE',
                    }
                )

                const data = await res.json()

                if (res.ok) {
                    doctorList.value = doctorList.value.filter(
                        d => d.license !== license
                    )

                    showDialog(
                        'Success',
                        'ลบบัญชีสำเร็จ'
                    )
                } else {
                    showDialog(
                        'Error',
                        data.error || 'ลบไม่สำเร็จ'
                    )
                }
            } catch {
                showDialog(
                    'Error',
                    'เกิดข้อผิดพลาด'
                )
            }
        }
    )
}


const handleLogout = () => { localStorage.clear(); router.push('/login') }
const getRoleLabel = (role) => {
    if (!role) return '👤 User'

    const roleText = role.toLowerCase()

    if (roleText.includes('admin') && roleText.includes('user')) {
        return '🛡️👤 Admin + User'
    }

    if (roleText.includes('admin')) {
        return '🛡️ Admin'
    }

    return '👤 User'
}

const getRoleClass = (role) => {
    if (!role) return 'user'

    const roleText = role.toLowerCase()

    if (roleText.includes('admin') && roleText.includes('user')) {
        return 'multi-role'
    }

    if (roleText.includes('admin')) {
        return 'admin'
    }

    return 'user'
}

// 📍 เปลี่ยน Role ของบัญชี (user / admin) — เรียก endpoint ที่เพิ่มใหม่ฝั่ง backend
const changeRole = async (license, newRole) => {
    try {
        const res = await apiFetch(
            `/api/users/${license}/role`,
            {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ newRole })
            }
        )
        const data = await res.json()
        if (!res.ok) throw new Error(data.error || 'เปลี่ยน Role ไม่สำเร็จ')

        // อัปเดตค่าใน UI ทันทีโดยไม่ต้องโหลดหน้าใหม่
        const target = doctorList.value.find(d => d.license === license)
        if (target) target.role = newRole

        showDialog('สำเร็จ', `เปลี่ยน Role ของ ${license} เป็น "${newRole}" เรียบร้อยแล้ว`)
    } catch (e) {
        showDialog('ผิดพลาด', e.message || 'เปลี่ยน Role ไม่สำเร็จ')
    }
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

/* ===== Top Nav ===== */
.top-nav {
    background-color: #1a3a5f !important;
    height: 80px;
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 0 20px;
    flex-shrink: 0;
}

.user-group {
    display: flex;
    align-items: center;
    gap: 10px;
    margin-right: auto;
}

.avatar-circle.small {
    width: 36px;
    height: 36px;
    border-radius: 50%;
    background: rgba(255, 255, 255, 0.2);
    display: flex;
    align-items: center;
    justify-content: center;
}

.license-text {
    color: white;
    font-size: 14px;
    font-weight: 600;
}

.nav-btn {
    display: flex;
    align-items: center;
    gap: 6px;
    background: rgba(255, 255, 255, 0.18);
    border: 1.5px solid rgba(255, 255, 255, 0.35);
    color: white;
    padding: 7px 14px;
    border-radius: 20px;
    font-size: 13px;
    font-weight: 600;
    cursor: pointer;
    margin-right: 10px;
    transition: background 0.2s;
}

.nav-btn:hover {
    background: rgba(255, 255, 255, 0.28);
}

.logout-btn {
    background: none;
    border: none;
    cursor: pointer;
    display: flex;
    align-items: center;
    padding: 4px;
}

/* ===== body layout: sidebar เล็ก + content ===== */
.body-layout {
    display: flex;
    flex: 1;
}

.section-nav {
    width: 200px;
    flex-shrink: 0;
    background: white;
    border-right: 1px solid #e2e8f0;
    padding: 20px 12px;
    display: flex;
    flex-direction: column;
    gap: 8px;
}

.section-nav-btn {
    display: flex;
    align-items: center;
    gap: 10px;
    width: 100%;
    background: transparent;
    border: none;
    color: #4a5e75;
    padding: 12px 14px;
    border-radius: 12px;
    font-size: 14px;
    font-weight: 600;
    cursor: pointer;
    text-align: left;
    transition: background 0.2s, color 0.2s;
}

.section-nav-btn:hover {
    background: #eef2f7;
}

.section-nav-btn.active {
    background: #1a3a5f;
    color: white;
}

.section-nav-emoji {
    font-size: 16px;
    width: 20px;
    text-align: center;
    flex-shrink: 0;
}

.page-container {
    padding: 16px 24px;
    max-width: 900px;
    margin: 0 auto;
    width: 100%;
    flex: 1;
}

@media (max-width: 768px) {
    .body-layout {
        flex-direction: column;
    }

    .section-nav {
        width: 100%;
        flex-direction: row;
        border-right: none;
        border-bottom: 1px solid #e2e8f0;
        padding: 10px 12px;
    }

    .section-nav-btn {
        flex: 1;
        justify-content: center;
    }
}

.main-title {
    color: #1a3a5f;
    font-size: 1.6rem;
    font-weight: bold;
    margin-bottom: 24px;
}

/* Stats */
.stats-row {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 14px;
    margin-bottom: 28px;
}

@media (min-width: 900px) {
    .stats-row {
        grid-template-columns: repeat(3, 1fr);
    }
}

.stat-card {
    background: white;
    border-radius: 16px;
    padding: 18px 16px;
    display: flex;
    align-items: center;
    gap: 14px;
    box-shadow: 0 4px 14px rgba(0, 0, 0, 0.06);
    border-left: 5px solid #ccc;
}

.stat-card.blue {
    border-left-color: #4a6fa5;
}

.stat-card.green {
    border-left-color: #28a745;
}

.stat-card.purple {
    border-left-color: #7b5ea7;
}

.stat-card.red {
    border-left-color: #dc3545;
}

.stat-icon {
    font-size: 28px;
}

.stat-number {
    font-size: 1.6rem;
    font-weight: 800;
    color: #1a3a5f;
    line-height: 1;
}

.stat-label {
    font-size: 12px;
    color: #888;
    margin-top: 4px;
}

/* ===== Formal Stat Cards (Upcoming / Cancelled) ===== */
.formal-stats-row {
    display: grid;
    grid-template-columns: 1fr;
    gap: 16px;
    margin-bottom: 24px;
}

@media (min-width: 640px) {
    .formal-stats-row {
        grid-template-columns: repeat(2, 1fr);
    }
}

.formal-stat-card {
    background: white;
    border: 1px solid #e2e8f0;
    border-radius: 14px;
    padding: 20px 22px;
    box-shadow: 0 2px 8px rgba(15, 42, 71, 0.04);
    border-top: 3px solid #cbd5e1;
}

.formal-stat-card.accent-blue {
    border-top-color: #1a3a5f;
}

.formal-stat-card.accent-red {
    border-top-color: #b91c1c;
}

.formal-stat-top {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 14px;
}

.formal-stat-label {
    font-size: 13px;
    font-weight: 700;
    color: #4a5e75;
    text-transform: uppercase;
    letter-spacing: 0.03em;
}

.formal-stat-icon-badge {
    width: 34px;
    height: 34px;
    border-radius: 10px;
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
}

.formal-stat-icon-badge .material-icons {
    font-size: 18px;
}

.formal-stat-icon-badge.blue {
    background: #e8f0fe;
    color: #1a3a5f;
}

.formal-stat-icon-badge.red {
    background: #fee2e2;
    color: #b91c1c;
}

.formal-stat-icon-badge.green {
    background: #dcfce7;
    color: #15803d;
}

.formal-stat-number {
    font-size: 2.1rem;
    font-weight: 800;
    color: #1a3a5f;
    line-height: 1;
}

.formal-stat-foot {
    margin-top: 8px;
    font-size: 12px;
    color: #94a3b8;
}

/* Doctor Section */
.doctor-section {
    background: white;
    border-radius: 20px;
    box-shadow: 0 10px 25px rgba(0, 0, 0, 0.05);
    overflow: hidden;
}

.section-header {
    background: #1a3a5f;
    padding: 16px 20px;
}

.section-title {
    color: white;
    font-size: 1rem;
    font-weight: 700;
    margin: 0;
}

.doctor-table-wrap {
    overflow-x: auto;
}

.doctor-table {
    width: 100%;
    border-collapse: collapse;
    font-size: 14px;
}

.doctor-table th {
    background: #eef2f7;
    color: #1a3a5f;
    font-weight: 700;
    padding: 12px 16px;
    text-align: left;
}

.doctor-table td {
    padding: 12px 16px;
    border-bottom: 1px solid #f0f0f0;
    color: #333;
}

.doctor-table tbody tr:hover {
    background: #f9fbff;
}

.role-badge {
    padding: 4px 10px;
    border-radius: 12px;
    font-size: 12px;
    font-weight: 600;
}

.role-badge.admin {
    background: #fff3cd;
    color: #856404;
}

.role-badge.user {
    background: #e8f4fd;
    color: #1a6fa5;
}

.role-select {
    display: block;
    margin-top: 6px;
    font-size: 11px;
    padding: 3px 6px;
    border-radius: 6px;
    border: 1px solid #d1d5db;
    color: #374151;
    background: white;
    cursor: pointer;
}

.btn-delete-doc {
    background: #fff0f0;
    color: #dc3545;
    border: 1px solid #f5c6cb;
    border-radius: 8px;
    padding: 5px 12px;
    font-size: 12px;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.2s;
}

.btn-delete-doc:hover {
    background: #dc3545;
    color: white;
}

.protected-text {
    color: #aaa;
    font-size: 12px;
    font-style: italic;
}

.empty-state {
    text-align: center;
    color: #999;
}

/* Modal */
.modal-overlay-center {
    position: fixed;
    inset: 0;
    background: rgba(0, 0, 0, 0.45);
    display: flex;
    justify-content: center;
    align-items: center;
    z-index: 999;
}

.white-modal-card {
    background: white;
    border-radius: 20px;
    padding: 32px 28px;
    width: 320px;
    text-align: center;
    box-shadow: 0 20px 60px rgba(0, 0, 0, 0.15);
}

.modal-msg-title {
    font-size: 1.1rem;
    font-weight: 700;
    color: #1a3a5f;
    margin-bottom: 24px;
}

.modal-button-group {
    display: flex;
    gap: 12px;
    justify-content: center;
}

.btn-cancel-blue {
    flex: 1;
    padding: 10px;
    border-radius: 10px;
    border: 2px solid #4a6fa5;
    color: #4a6fa5;
    background: white;
    font-weight: 600;
    cursor: pointer;
}

.btn-confirm-green {
    flex: 1;
    padding: 10px;
    border-radius: 10px;
    border: none;
    background: #28a745;
    color: white;
    font-weight: 600;
    cursor: pointer;
}

.fade-enter-active,
.fade-leave-active {
    transition: opacity 0.2s;
}

.fade-enter-from,
.fade-leave-to {
    opacity: 0;
}

.role-badge.multi-role {
    background: #ede9fe;
    color: #6b21a8;
}

.room-queue-wrap {
    padding: 12px 20px 20px;
}

.room-list {
    display: flex;
    flex-direction: column;
    gap: 10px;
}

.room-card {
    background: #f9fbff;
    border: 1px solid #e2e8f0;
    border-radius: 14px;
    padding: 14px 16px;
    cursor: pointer;
    transition: border-color 0.2s;
}

.room-card:hover {
    border-color: #4a6fa5;
}

.room-summary {
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 12px;
}

.room-summary-left {
    display: flex;
    align-items: center;
    gap: 10px;
    min-width: 0;
}

.room-status-dot {
    width: 10px;
    height: 10px;
    border-radius: 50%;
    flex-shrink: 0;
}

.room-status-dot.available {
    background: #22c55e;
}

.room-status-dot.partial {
    background: #f59e0b;
}

.room-status-dot.full {
    background: #dc2626;
}

.room-name-row {
    display: flex;
    align-items: center;
    gap: 8px;
}

.room-name {
    font-weight: 700;
    color: #1a3a5f;
    font-size: 15px;
}

.room-status-text {
    font-size: 11px;
    font-weight: 600;
    padding: 1px 8px;
    border-radius: 10px;
}

.room-status-text.available {
    background: #dcfce7;
    color: #15803d;
}

.room-status-text.partial {
    background: #fef3c7;
    color: #92400e;
}

.room-status-text.full {
    background: #fee2e2;
    color: #b91c1c;
}

.room-current {
    font-size: 13px;
    color: #555;
    margin-top: 2px;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    max-width: 260px;
}

.room-summary-right {
    display: flex;
    align-items: center;
    gap: 8px;
    flex-shrink: 0;
}

.room-count-badge {
    background: #4a6fa5;
    color: white;
    font-size: 11px;
    font-weight: 700;
    padding: 3px 10px;
    border-radius: 12px;
    white-space: nowrap;
}

.room-min-badge {
    background: #eef2f7;
    color: #4a6fa5;
    font-size: 11px;
    font-weight: 700;
    padding: 3px 10px;
    border-radius: 12px;
    white-space: nowrap;
}

.expand-icon {
    color: #94a3b8;
    font-size: 20px;
}

.room-detail {
    margin-top: 12px;
    padding-top: 12px;
    border-top: 1px solid #e2e8f0;
    display: flex;
    flex-direction: column;
    gap: 8px;
}

.queue-row {
    display: flex;
    align-items: flex-start;
    gap: 10px;
    background: white;
    border-radius: 10px;
    padding: 8px 10px;
}

.queue-order {
    font-weight: 700;
    color: #4a6fa5;
    font-size: 12px;
    flex-shrink: 0;
    margin-top: 1px;
}

.queue-info {
    flex: 1;
    min-width: 0;
}

.queue-procedure {
    font-size: 13px;
    font-weight: 600;
    color: #1a3a5f;
}

.queue-meta {
    font-size: 12px;
    color: #888;
    margin-top: 2px;
}

.queue-doctor-row {
    font-size: 12px;
    color: #4a6fa5;
    margin-top: 2px;
}

.queue-duration {
    font-size: 12px;
    color: #555;
    font-weight: 600;
    flex-shrink: 0;
    white-space: nowrap;
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

.queue-procedure-row {
    display: flex;
    align-items: center;
    gap: 8px;
    flex-wrap: wrap;
}

.queue-live-badge {
    font-size: 10px;
    font-weight: 700;
    padding: 2px 8px;
    border-radius: 10px;
    background: #eef2f7;
    color: #94a3b8;
}

.queue-live-badge.is-active {
    background: #fee2e2;
    color: #b91c1c;
    animation: pulse-badge 1.5s infinite;
}

@keyframes pulse-badge {

    0%,
    100% {
        opacity: 1;
    }

    50% {
        opacity: 0.5;
    }
}

.live-tag {
    display: inline-block;
    color: #dc2626;
    font-weight: 700;
    font-size: 12px;
    margin-right: 4px;
}
</style>