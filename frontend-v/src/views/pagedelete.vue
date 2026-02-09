<template>
    <div class="main-layout">
        <Transition name="fade">
            <div v-if="isDrawerOpen" class="drawer-overlay" @click="isDrawerOpen = false"></div>
        </Transition>

        <Transition name="slide">
            <div v-if="isDrawerOpen" class="side-drawer">
                <div class="drawer-header">
                    <div class="drawer-user-info">
                        <div class="user-avatar">
                            <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24">
                                <path fill="white"
                                    d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10s10-4.48 10-10S17.52 2 12 2m0 4c1.93 0 3.5 1.57 3.5 3.5S13.93 13 12 13s-3.5-1.57-3.5-3.5S10.07 6 12 6m0 14c-2.03 0-4.43-.82-6.14-2.88a9.947 9.947 0 0 1 12.28 0C16.43 19.18 14.03 20 12 20" />
                            </svg>
                        </div>
                        <div class="user-meta">
                            <span class="drawer-license">{{ userLicense }}</span>
                            <span class="drawer-day">Monday</span>
                        </div>
                    </div>
                </div>

                <div class="drawer-menu">
                    <div class="menu-item">
                        <span class="material-icons">sync_alt</span> Change days
                    </div>
                    <div class="menu-item">
                        <span class="material-icons">calendar_today</span> Calendar
                    </div>
                    <div class="menu-item delete-acc">
                        <span class="material-icons">delete</span> Delete Account
                    </div>
                </div>
            </div>
        </Transition>

        <div class="top-nav">
            <div class="user-group" @click="isDrawerOpen = true" style="cursor: pointer;">
                <div class="user-avatar">
                    <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24">
                        <path fill="white"
                            d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10s10-4.48 10-10S17.52 2 12 2m0 4c1.93 0 3.5 1.57 3.5 3.5S13.93 13 12 13s-3.5-1.57-3.5-3.5S10.07 6 12 6m0 14c-2.03 0-4.43-.82-6.14-2.88a9.947 9.947 0 0 1 12.28 0C16.43 19.18 14.03 20 12 20" />
                    </svg>
                </div>
                <span class="license-text">{{ userLicense }}</span>
            </div>

            <button class="logout-btn" @click="handleLogout">
                <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24">
                    <path fill="white"
                        d="M5 21q-.825 0-1.412-.587T3 19V5q0-.825.588-1.412T5 3h6q.425 0 .713.288T12 4t-.288.713T11 5H5v14h6q.425 0 .713.288T12 20t-.288.713T11 21zm12.175-8H10q-.425 0-.712-.288T9 12t.288-.712T10 11h7.175L15.3 9.125q-.275-.275-.275-.675t.275-.7.7-.313t.725.288L20.3 11.3q.3.3.3.7t-.3.7l-3.575 3.575q-.3.3-.712.288t-.713-.313q-.275-.3-.262-.712t.287-.688z" />
                </svg>
            </button>
        </div>

        <div class="dashboard-container">
            <h1 class="title">Deleted Queuest Manage</h1>
            <div class="content-wrapper">
                <div class="action-bar">
                    <button class="add-patient-btn" @click="goToBooking">Add Patient</button>
                </div>

                <div class="queue-section">
                    <div class="queue-header">
                        <span class="header-text">Surgery Queue</span>
                        <span class="delete-icon" @click="handleDeleteClick">
                            <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24">
                                <path fill="#c79393"
                                    d="M19 4h-3.5l-1-1h-5l-1 1H5v2h14M6 19a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2V7H6z" />
                            </svg>
                        </span>
                    </div>

                    <div class="table-container">
                        <table class="queue-table">
                            <thead>
                                <tr>
                                    <th class="col-patient">Patient</th>
                                    <th class="col-date">Date</th>
                                    <th class="col-status">Status</th>
                                </tr>
                            </thead>
                            <tbody>
                                <tr v-if="queueList.length === 0">
                                    <td colspan="3" class="empty-row">No patients in queue</td>
                                </tr>
                                <tr v-for="(item, index) in queueList" :key="index">
                                    <td class="col-patient">{{ item.name }}</td>
                                    <td class="col-date text-center">{{ item.date }}</td>
                                    <td class="col-status">
                                        <span class="status-text">{{ item.status }}</span>
                                    </td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                </div>

                <div class="footer-actions">
                    <button class="btn-cancel">Cancel</button>
                    <button class="btn-delete-text" @click="handleDeleteClick">Delete</button>
                </div>
            </div>
        </div>

        <Transition name="fade">
            <div v-if="showDeleteModal" class="modal-overlay" @click.self="showDeleteModal = false">
                <div class="modal-card">
                    <h3 class="modal-title">Are you sure you want to delete?</h3>
                    <div class="modal-actions">
                        <button class="modal-btn cancel" @click="showDeleteModal = false">Cancel</button>
                        <button class="modal-btn confirm" @click="executeDelete">Confirm</button>
                    </div>
                </div>
            </div>
        </Transition>
    </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'

const router = useRouter()
const userLicense = ref('123546')
const queueList = ref([])
const showDeleteModal = ref(false)
const isDrawerOpen = ref(false) // ✅ เพิ่ม State สำหรับ Drawer

onMounted(() => {
    const savedLicense = localStorage.getItem('userLicense')
    if (savedLicense) userLicense.value = savedLicense
})

const goToBooking = () => router.push('/booking')
const handleLogout = () => {
    localStorage.removeItem('userLicense')
    router.push('/login')
}

const handleDeleteClick = () => {
    if (queueList.value.length === 0) {
        alert("There are no patients in the queue to delete.")
        return
    }
    showDeleteModal.value = true
}

const executeDelete = () => {
    queueList.value = []
    showDeleteModal.value = false
}
</script>

<style scoped>
@import url('https://fonts.googleapis.com/icon?family=Material+Icons');


.side-drawer {
    position: fixed;
    top: 0;
    left: 0;
    width: 280px;
    height: 100%;
    background: #f0f7ff;

    z-index: 3000;
    box-shadow: 4px 0 15px rgba(0, 0, 0, 0.1);
    display: flex;
    flex-direction: column;
}

.drawer-header {
    background-color: #6a92d4;
    height: 80px;

    display: flex;
    align-items: center;

    padding: 0 25px;

    flex-shrink: 0;
}

.drawer-user-info {
    display: flex;
    align-items: center;
    gap: 15px;

}

.user-meta {
    display: flex;
    flex-direction: column;
    color: white;
    justify-content: center;
}

.drawer-license {
    font-size: 1.4rem;

    line-height: 1.2;
}

.drawer-day {
    font-size: 0.75rem;
    opacity: 0.9;
    margin-top: -2px;

}

.drawer-menu {
    padding: 20px 0;
}

.menu-item {
    display: flex;
    align-items: center;
    gap: 15px;
    padding: 15px 25px;
    color: #4a6fa5;
    font-weight: 500;
    cursor: pointer;
    transition: background 0.2s;
}

.menu-item:hover {
    background: #e6effa;
}

.menu-item .material-icons {
    font-size: 22px;
}

.drawer-overlay {
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: rgba(0, 0, 0, 0.3);
    z-index: 2500;
}

/* Animations */
.slide-enter-active,
.slide-leave-active {
    transition: transform 0.3s ease;
}

.slide-enter-from,
.slide-leave-to {
    transform: translateX(-100%);
}

.fade-enter-active,
.fade-leave-active {
    transition: opacity 0.3s;
}

.fade-enter-from,
.fade-leave-to {
    opacity: 0;
}

/* --- CSS เดิมของคุณทั้งหมด --- */
.main-layout {
    min-height: 100vh;
    background-color: #ffffff;
    display: flex;
    flex-direction: column;
}

.top-nav {
    background-color: #6a92d4;
    height: 80px;
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 0 25px;
}

.user-group {
    display: flex;
    align-items: center;
    gap: 15px;
}

.user-avatar {
    display: flex;
    align-items: center;
    justify-content: center;
    border: 2px solid white;
    border-radius: 50%;
    padding: 4px;
}

.license-text {
    color: white;
    font-size: 1.4rem;
    font-weight: 400;
}

.logout-btn {
    background: none;
    border: none;
    cursor: pointer;
    display: flex;
    align-items: center;
}

.dashboard-container {
    padding: 20px;
    flex-grow: 1;
    display: flex;
    flex-direction: column;
}

.title {
    color: #2c4c87;
    text-align: center;
    margin: 30px 0;
    font-weight: 600;
    font-size: 1.6rem;
}

.content-wrapper {
    max-width: 500px;
    width: 100%;
    margin: 0 auto;
    display: flex;
    flex-direction: column;
    flex-grow: 1;
}

.action-bar {
    display: flex;
    justify-content: flex-end;
    margin-bottom: 20px;
}

.add-patient-btn {
    background-color: #78d1bc;
    border: none;
    padding: 8px 20px;
    border-radius: 12px;
    color: #1a4d43;
    font-weight: 600;
    cursor: pointer;
}

.queue-section {
    background: #ffffff;
}

.queue-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 10px 0;
}

.header-text {
    color: #2c4c87;
    font-weight: 600;
    font-size: 1.1rem;
}

.delete-icon {
    cursor: pointer;
    opacity: 0.7;
}

.queue-table {
    width: 100%;
    border-collapse: collapse;
    border-top: 1px solid #eee;
}

.queue-table th {
    padding: 12px 0;
    font-size: 0.9rem;
    color: #386b62;
    font-weight: 600;
    text-align: left;
}

.queue-table td {
    padding: 12px 0;
    color: #444;
}

.empty-row {
    text-align: center;
    padding: 80px 0;
    color: #d1d5db;
    font-size: 1rem;
}

.text-center {
    text-align: center;
}

.col-patient {
    width: 45%;
}

.col-date {
    width: 35%;
    text-align: center;
}

.col-status {
    width: 20%;
    text-align: right;
}

.status-text {
    color: #386b62;
    font-weight: 600;
}

.footer-actions {
    margin-top: auto;
    display: flex;
    justify-content: flex-end;
    gap: 30px;
    padding: 40px 0 20px 0;
}

.btn-cancel {
    background: none;
    border: none;
    color: #6a92d4;
    font-size: 1.1rem;
    font-weight: 500;
    cursor: pointer;
}

.btn-delete-text {
    background: none;
    border: none;
    color: #a33b3b;
    font-size: 1.1rem;
    font-weight: 500;
    cursor: pointer;
}

@media (min-width: 1024px) {
    .footer-actions {
        position: fixed;
        bottom: 30px;
        right: 40px;
        padding: 10px 20px;
        z-index: 100;
        background: white;
        border-radius: 8px;
    }
}

.modal-overlay {
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: rgba(0, 0, 0, 0.4);
    display: flex;
    justify-content: center;
    align-items: center;
    z-index: 2000;
}

.modal-card {
    background: white;
    padding: 30px;
    border-radius: 24px;
    width: 90%;
    max-width: 350px;
    text-align: center;
    box-shadow: 0 10px 25px rgba(0, 0, 0, 0.1);
}

.modal-title {
    font-size: 1.2rem;
    margin-bottom: 25px;
    color: #000;
    font-weight: 500;
}

.modal-actions {
    display: flex;
    gap: 15px;
}

.modal-btn {
    flex: 1;
    border: none;
    padding: 12px 0;
    border-radius: 12px;
    font-weight: 600;
    cursor: pointer;
}

.modal-btn.cancel {
    background: #16a085;
    color: white;
}

.modal-btn.confirm {
    background: #f80000;
    color: white;
}
</style>