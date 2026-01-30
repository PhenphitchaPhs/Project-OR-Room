<template>
  <div class="main-layout">
    <div class="top-nav">
      <div class="user-info">
        <span class="license-text">{{ userLicense }}</span>
      </div>
      <button class="logout-btn" @click="handleLogout">
        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24"><path fill="white" d="M5 21q-.825 0-1.412-.587T3 19V5q0-.825.588-1.412T5 3h6q.425 0 .713.288T12 4t-.288.713T11 5H5v14h6q.425 0 .713.288T12 20t-.288.713T11 21zm12.175-8H10q-.425 0-.712-.288T9 12t.288-.712T10 11h7.175L15.3 9.125q-.275-.275-.275-.675t.275-.7t.7-.313t.725.288L20.3 11.3q.3.3.3.7t-.3.7l-3.575 3.575q-.3.3-.712.288t-.713-.313q-.275-.3-.262-.712t.287-.688z"/></svg>
      </button>
    </div>

    <div class="dashboard-container">
      <h1 class="title">Surgery Queue Management</h1>

      <div class="content-wrapper">
        <div class="action-bar">
          <button class="add-patient-btn" @click="goToBooking">Add Patient</button>
        </div>

        <div class="queue-section">
          <div class="queue-header">
            <span class="header-text">Surgery Queue</span>
            <span class="delete-icon">
              <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24"><path fill="#b18282" d="M19 4h-3.5l-1-1h-5l-1 1H5v2h14M6 19a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2V7H6z"/></svg>
            </span>
          </div>
          
          <div class="table-container">
            <table class="queue-table">
              <thead>
                <tr>
                  <th class="col-date">Date</th>
                  <th class="col-patient">Patient</th>
                  <th class="col-status">Status</th>
                </tr>
              </thead>
              <tbody>
                <tr v-if="queueList.length === 0">
                  <td colspan="3" class="empty-row">No patients in queue</td>
                </tr>
                <tr v-for="(item, index) in queueList" :key="index">
                  <td class="col-date">{{ item.date }}</td>
                  <td class="col-patient">{{ item.name }}</td>
                  <td class="col-status">
                    <span class="status-badge">{{ item.status }}</span>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'

const router = useRouter()
const queueList = ref([]) 
const userLicense = ref('------')

onMounted(() => {
  const savedLicense = localStorage.getItem('userLicense')
  if (savedLicense) userLicense.value = savedLicense
})

const goToBooking = () => router.push('/booking')
const handleLogout = () => {
  localStorage.removeItem('userLicense')
  router.push('/login')
}
</script>

<style scoped>
/* 1. จัดการ Layout หลัก */
.main-layout {
  min-height: 100vh;
  background-color: #ffffff;
  display: flex;
  flex-direction: column; /* เรียง Header กับ Content ต่อกันลงมา */
}

/* 2. สไตล์ของ Header (ขยับเลขให้เสมอไอคอน) */
.top-nav {
  background-color: #6a92d4;
  height: 90px;
  display: flex;
  justify-content: space-between;
  align-items: center; /* จัดกึ่งกลางแนวตั้ง */
  padding: 0 20px;
  flex-shrink: 0; /* ป้องกันแถบโดนเบียด */
}

.user-info {
  padding-left: 70px; /* เว้นที่ให้ไอคอนเดิม */
  display: flex;
  align-items: center;
}

.license-text {
  color: white;
  font-size: 1.1rem;
  font-weight: 500;
  /* ถ้าเลขยังไม่ตรงกึ่งกลางไอคอน ให้ลองปรับเลขนี้ (+ คือลง - คือขึ้น) */
  margin-top: -5px; 
}

.logout-btn {
  background: none;
  border: none;
  cursor: pointer;
  margin-top: -5px; /* ปรับให้ขนานกับตัวเลข */
}

/* 3. สไตล์ส่วนเนื้อหา (ใช้จากโค้ดเดิมของอ้าย ตำแหน่งจะได้ไม่เพี้ยน) */
.dashboard-container {
  padding: 20px;
}

.title {
  color: #4a6fa5;
  text-align: center;
  margin-top: 20px;
  margin-bottom: 30px;
  font-weight: 700;
  font-size: 1.5rem;
}

.content-wrapper {
  max-width: 600px;
  margin: 0 auto;
}

.action-bar {
  display: flex;
  justify-content: flex-end;
  margin-bottom: 15px;
}

.add-patient-btn {
  background-color: #81d4c3;
  border: none;
  padding: 10px 25px;
  border-radius: 20px;
  color: #2c3e50;
  font-weight: bold;
}

.queue-section {
  background: #f9fbfd;
  border-radius: 8px;
  padding: 10px;
}

.queue-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 10px;
}

.header-text { color: #4a6fa5; font-weight: bold; }

.table-container { border-top: 1px solid #e0e0e0; }

.queue-table { width: 100%; border-collapse: collapse; }

.col-date { width: 30%; text-align: left; padding: 12px 5px; color: #666; font-size: 0.9rem; }
.col-patient { width: 45%; text-align: left; padding: 12px 5px; color: #333; font-weight: 500; }
.col-status { width: 25%; text-align: right; padding: 12px 5px; }

.status-badge {
  background-color: #6a92d4;
  color: white;
  padding: 4px 12px;
  border-radius: 12px;
  font-size: 0.8rem;
}

.empty-row { text-align: center; padding: 30px; color: #999; }
</style>