<template>
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
                <td colspan="3" class="empty-row">
                  <div class="empty-content">
                    <p>No pending surgeries for today.</p>
                  </div>
                </td>
              </tr>
              <tr v-else v-for="(item, index) in queueList" :key="index">
                <td class="cell-date">{{ item.date }}</td>
                <td class="cell-patient">{{ item.name }}</td>
                <td class="cell-status">
                  <span class="status-badge">{{ item.status }}</span>
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
import { ref } from 'vue'
import { useRouter } from 'vue-router'

const router = useRouter()
const queueList = ref([]) 

const goToBooking = () => {
  router.push('/booking')
}
</script>

<style scoped>
.dashboard-container {
  padding: 20px;
  min-height: 100vh;
}

.title {
  color: #4a6fa5;
  text-align: center;
  margin-top: 80px;
  margin-bottom: 40px;
  font-weight: 700;
}

.content-wrapper {
  max-width: 900px; /* ขยับความกว้างเพิ่มนิดหน่อยเพื่อให้ดูโปร่ง */
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
  cursor: pointer;
  font-weight: bold;
  box-shadow: 0 2px 8px rgba(0,0,0,0.1);
}

.queue-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 10px;
}

.header-text {
  color: #4a6fa5;
  font-weight: bold;
}

.table-container {
  border-top: 1px solid #e0e0e0;
}

.queue-table {
  width: 100%;
  border-collapse: collapse;
}

/* ปรับสัดส่วนใหม่ให้สมมาตรตามที่อ้ายต้องการ */
.col-date { 
  width: 25%; 
  text-align: left; 
  padding-left: 10px;
}

.col-patient { 
  width: 50%; 
  text-align: center; /* จัดชื่อคนไข้ไว้ตรงกลาง */
}

.col-status { 
  width: 25%; 
  text-align: right; /* ดัน Status ไปชิดขวาสุด */
  padding-right: 10px;
}

.queue-table th {
  padding: 15px 0;
  color: #2d6a4f;
  font-size: 1rem;
}

.queue-table td {
  padding: 20px 0;
}

/* ปรับตำแหน่งข้อมูลในแถวให้ตรงกับหัวข้อ */
.cell-date { text-align: left; padding-left: 10px; }
.cell-patient { text-align: center; }
.cell-status { text-align: right; padding-right: 10px; }

.empty-row {
  text-align: center;
  padding: 80px 0;
  color: #a0aec0;
}

.status-badge {
  background-color: #6a92d4;
  color: white;
  padding: 6px 18px;
  border-radius: 12px;
  font-size: 0.85rem;
}
</style>