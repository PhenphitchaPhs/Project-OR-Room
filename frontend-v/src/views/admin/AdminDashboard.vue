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

        <!-- Top Nav -->
        <header class="top-nav">
            <div class="user-group">
                <div class="avatar-circle small">
                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24">
                        <path fill="white" d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10s10-4.48 10-10S17.52 2 12 2m0 4c1.93 0 3.5 1.57 3.5 3.5S13.93 13 12 13s-3.5-1.57-3.5-3.5S10.07 6 12 6m0 14c-2.03 0-4.43-.82-6.14-2.88a9.947 9.947 0 0 1 12.28 0C16.43 19.18 14.03 20 12 20" />
                    </svg>
                </div>
                <span class="license-text">{{ userLicense }}</span>
            </div>
            <button class="nav-btn" @click="router.push('/admin-home')">
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24">
                    <path fill="white" d="M10 20v-6h4v6h5v-8h3L12 3L2 12h3v8z"/>
                </svg>
                <span>Queue</span>
            </button>
            <button class="nav-btn" @click="router.push('/admin-calendar')">
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24">
                    <path fill="white" d="M19 4h-1V2h-2v2H8V2H6v2H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2m0 16H5V10h14zm0-12H5V6h14z"/>
                </svg>
                <span>Calendar</span>
            </button>
            <button class="logout-btn" @click="isLogoutModalOpen = true">
                <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24">
                    <path fill="white" d="M5 21q-.825 0-1.412-.587T3 19V5q0-.825.588-1.412T5 3h6q.425 0 .713.288T12 4t-.288.713T11 5H5v14h6q.425 0 .713.288T12 20t-.288.713T11 21zm12.175-8H10q-.425 0-.712-.288T9 12t.288-.712T10 11h7.175L15.3 9.125q-.275-.275-.275-.675t.275-.7.7-.313t.725.288L20.3 11.3q.3.3.3.7t-.3.7l-3.575 3.575q-.3.3-.712.288t-.713-.313q-.275-.3-.262-.712t.287-.688z" />
                </svg>
            </button>
        </header>

        <!-- Content -->
        <div class="page-container">
            <h1 class="main-title">📊 Admin Dashboard</h1>

            <!-- Stats Cards -->
            <div class="stats-row">
                <div class="stat-card blue">
                    <div class="stat-icon">📋</div>
                    <div class="stat-info">
                        <div class="stat-number">{{ upcomingCount }}</div>
                        <div class="stat-label">Upcoming Queues</div>
                    </div>
                </div>
                <div class="stat-card green">
                    <div class="stat-icon">✅</div>
                    <div class="stat-info">
                        <div class="stat-number">{{ succeedCount }}</div>
                        <div class="stat-label">Completed</div>
                    </div>
                </div>
                <div class="stat-card purple">
                    <div class="stat-icon">👨‍⚕️</div>
                    <div class="stat-info">
                        <div class="stat-number">{{ doctorList.length }}</div>
                        <div class="stat-label">Doctors</div>
                    </div>
                </div>
                <div class="stat-card orange">
                    <div class="stat-icon">📅</div>
                    <div class="stat-info">
                        <div class="stat-number">{{ todayCount }}</div>
                        <div class="stat-label">Today's Queues</div>
                    </div>
                </div>
            </div>

            <!-- Doctor Management Table -->
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
                                <th>Working Day</th>
                                <th>Role</th>
                                <th>Action</th>
                            </tr>
                        </thead>
                        <tbody>
                            <tr v-for="doc in doctorList" :key="doc.license">
                                <td>{{ doc.license }}</td>
                                <td>{{ doc.doctorName }}</td>
                                <td>{{ doc.day }}</td>
                                <td>
                                    <span class="role-badge" :class="doc.role === 'admin' ? 'admin' : 'user'">
                                        {{ doc.role === 'admin' ? '🛡️ Admin' : '👤 User' }}
                                    </span>
                                </td>
                                <td>
                                    <button v-if="doc.role !== 'admin'" class="btn-delete-doc" @click="deleteDoctor(doc.license, doc.doctorName)">Delete</button>
                                    <span v-else class="protected-text">Protected</span>
                                </td>
                            </tr>
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    </div>
</template>

<script setup>
import { ref, onMounted, computed } from 'vue'
import { useRouter } from 'vue-router'

const router = useRouter()
const userLicense = ref('Admin')
const doctorList = ref([])
const bookings = ref([])
const loading = ref(true)
const isLogoutModalOpen = ref(false)

const todayStr = new Date().toISOString().split('T')[0]

const upcomingCount = computed(() => bookings.value.filter(b => b.status === 'Upcoming' || !b.status).length)
const succeedCount = computed(() => bookings.value.filter(b => b.status === 'Succeed').length)
const todayCount = computed(() => bookings.value.filter(b => b.date === todayStr && b.status !== 'Succeed').length)

onMounted(async () => {
    const savedLicense = localStorage.getItem('userLicense')
    if (savedLicense) userLicense.value = savedLicense

    try {
        const [resBookings, resUsers] = await Promise.all([
            fetch('https://or-room-backend.rockzee2018.workers.dev/api/bookings'),
            fetch('https://or-room-backend.rockzee2018.workers.dev/api/users')
        ])
        const bData = await resBookings.json()
        const uData = await resUsers.json()
        bookings.value = Array.isArray(bData) ? bData : []
        doctorList.value = Array.isArray(uData) ? uData : []
    } catch (e) {
        console.error('โหลดข้อมูลไม่สำเร็จ', e)
    } finally {
        loading.value = false
    }
})

const deleteDoctor = async (license, name) => {
    if (!confirm(`ลบบัญชี "${name}" ออกจากระบบ?\n(ข้อมูลคิวผ่าตัดของหมอยังคงอยู่)`)) return
    try {
        const res = await fetch(`https://or-room-backend.rockzee2018.workers.dev/api/users/${license}`, { method: 'DELETE' })
        const data = await res.json()
        if (res.ok) {
            doctorList.value = doctorList.value.filter(d => d.license !== license)
            alert('✅ ลบบัญชีสำเร็จ')
        } else {
            alert('❌ ' + (data.error || 'ลบไม่สำเร็จ'))
        }
    } catch (e) { alert('❌ เกิดข้อผิดพลาด') }
}

const handleLogout = () => { localStorage.clear(); router.push('/login') }
</script>

<style scoped>
@import url('https://fonts.googleapis.com/icon?family=Material+Icons');

.main-layout { min-height: 100vh; display: flex; flex-direction: column; background-color: #f5f7fa; }

.top-nav { background-color: #1a3a5f !important; height: 80px; display: flex; justify-content: space-between; align-items: center; padding: 0 20px; }

.user-group { display: flex; align-items: center; gap: 10px; margin-right: auto; }
.avatar-circle.small { width: 36px; height: 36px; border-radius: 50%; background: rgba(255,255,255,0.2); display: flex; align-items: center; justify-content: center; }
.license-text { color: white; font-size: 14px; font-weight: 600; }

.nav-btn { display: flex; align-items: center; gap: 6px; background: rgba(255,255,255,0.18); border: 1.5px solid rgba(255,255,255,0.35); color: white; padding: 7px 14px; border-radius: 20px; font-size: 13px; font-weight: 600; cursor: pointer; margin-right: 10px; transition: background 0.2s; }
.nav-btn:hover { background: rgba(255,255,255,0.28); }

.logout-btn { background: none; border: none; cursor: pointer; display: flex; align-items: center; padding: 4px; }

.page-container { padding: 24px; max-width: 900px; margin: 0 auto; width: 100%; }

.main-title { color: #1a3a5f; font-size: 1.6rem; font-weight: bold; margin-bottom: 24px; }

/* Stats */
.stats-row { display: grid; grid-template-columns: repeat(2, 1fr); gap: 14px; margin-bottom: 28px; }
@media (min-width: 600px) { .stats-row { grid-template-columns: repeat(4, 1fr); } }

.stat-card { background: white; border-radius: 16px; padding: 18px 16px; display: flex; align-items: center; gap: 14px; box-shadow: 0 4px 14px rgba(0,0,0,0.06); border-left: 5px solid #ccc; }
.stat-card.blue { border-left-color: #4a6fa5; }
.stat-card.green { border-left-color: #28a745; }
.stat-card.purple { border-left-color: #7b5ea7; }
.stat-card.orange { border-left-color: #f0a500; }
.stat-icon { font-size: 28px; }
.stat-number { font-size: 1.6rem; font-weight: 800; color: #1a3a5f; line-height: 1; }
.stat-label { font-size: 12px; color: #888; margin-top: 4px; }

/* Doctor Section */
.doctor-section { background: white; border-radius: 20px; box-shadow: 0 10px 25px rgba(0,0,0,0.05); overflow: hidden; }
.section-header { background: #1a3a5f; padding: 16px 20px; }
.section-title { color: white; font-size: 1rem; font-weight: 700; margin: 0; }

.doctor-table-wrap { overflow-x: auto; }
.doctor-table { width: 100%; border-collapse: collapse; font-size: 14px; }
.doctor-table th { background: #eef2f7; color: #1a3a5f; font-weight: 700; padding: 12px 16px; text-align: left; }
.doctor-table td { padding: 12px 16px; border-bottom: 1px solid #f0f0f0; color: #333; }
.doctor-table tbody tr:hover { background: #f9fbff; }

.role-badge { padding: 4px 10px; border-radius: 12px; font-size: 12px; font-weight: 600; }
.role-badge.admin { background: #fff3cd; color: #856404; }
.role-badge.user { background: #e8f4fd; color: #1a6fa5; }

.btn-delete-doc { background: #fff0f0; color: #dc3545; border: 1px solid #f5c6cb; border-radius: 8px; padding: 5px 12px; font-size: 12px; font-weight: 600; cursor: pointer; transition: all 0.2s; }
.btn-delete-doc:hover { background: #dc3545; color: white; }
.protected-text { color: #aaa; font-size: 12px; font-style: italic; }

.empty-state { text-align: center; color: #999; }

/* Modal */
.modal-overlay-center { position: fixed; inset: 0; background: rgba(0,0,0,0.45); display: flex; justify-content: center; align-items: center; z-index: 999; }
.white-modal-card { background: white; border-radius: 20px; padding: 32px 28px; width: 320px; text-align: center; box-shadow: 0 20px 60px rgba(0,0,0,0.15); }
.modal-msg-title { font-size: 1.1rem; font-weight: 700; color: #1a3a5f; margin-bottom: 24px; }
.modal-button-group { display: flex; gap: 12px; justify-content: center; }
.btn-cancel-blue { flex: 1; padding: 10px; border-radius: 10px; border: 2px solid #4a6fa5; color: #4a6fa5; background: white; font-weight: 600; cursor: pointer; }
.btn-confirm-green { flex: 1; padding: 10px; border-radius: 10px; border: none; background: #28a745; color: white; font-weight: 600; cursor: pointer; }

.fade-enter-active, .fade-leave-active { transition: opacity 0.2s; }
.fade-enter-from, .fade-leave-to { opacity: 0; }
</style>