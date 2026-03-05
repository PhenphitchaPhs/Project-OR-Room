<template>
  <div class="app-container">
    
    <header class="main-header" v-if="showLayout && !isSidebarOpen">
      <div class="profile-trigger" @click="toggleSidebar">
        <div class="icon-circle">
          <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24"><path fill="currentColor" d="M12 2A10 10 0 0 0 2 12a10 10 0 0 0 10 10a10 10 0 0 0 10-10A10 10 0 0 0 12 2M7.07 18.28c.43-.9 3.05-1.78 4.93-1.78s4.5.88 4.93 1.78A7.9 7.9 0 0 1 12 20c-1.86 0-3.57-.64-4.93-1.72m11.29-1.45c-1.43-1.74-4.9-2.33-6.36-2.33s-4.93.59-6.36 2.33A7.93 7.93 0 0 1 4 12c0-4.41 3.59-8 8-8s8 3.59 8 8c0 1.82-.62 3.49-1.64 4.83M12 6c-1.94 0-3.5 1.56-3.5 3.5S10.06 13 12 13s3.5-1.56 3.5-3.5S13.94 6 12 6m0 5a1.5 1.5 0 0 1-1.5-1.5A1.5 1.5 0 0 1 12 8a1.5 1.5 0 0 1 1.5 1.5A1.5 1.5 0 0 1 12 11"/></svg>
        </div>
      </div>
    </header>

    <div v-if="showLayout && isSidebarOpen" class="overlay" @click="closeSidebar"></div>

    <transition name="slide">
      <aside v-if="showLayout && isSidebarOpen" class="sidebar">
        <div class="sidebar-header">
          <div class="user-info">
            <div class="avatar-icon" @click="toggleSidebar">
              <svg xmlns="http://www.w3.org/2000/svg" width="45" height="45" viewBox="0 0 24 24"><path fill="currentColor" d="M12 2A10 10 0 0 0 2 12a10 10 0 0 0 10 10a10 10 0 0 0 10-10A10 10 0 0 0 12 2M7.07 18.28c.43-.9 3.05-1.78 4.93-1.78s4.5.88 4.93 1.78A7.9 7.9 0 0 1 12 20c-1.86 0-3.57-.64-4.93-1.72m11.29-1.45c-1.43-1.74-4.9-2.33-6.36-2.33s-4.93.59-6.36 2.33A7.93 7.93 0 0 1 4 12c0-4.41 3.59-8 8-8s8 3.59 8 8c0 1.82-.62 3.5-1.64 4.83M12 6c-1.94 0-3.5 1.56-3.5 3.5S10.06 13 12 13s3.5-1.56 3.5-3.5S13.94 6 12 6m0 5a1.5 1.5 0 0 1-1.5-1.5A1.5 1.5 0 0 1 12 8a1.5 1.5 0 0 1 1.5 1.5A1.5 1.5 0 0 1 12 11"/></svg>
            </div>
            <div class="user-details">
              <span class="user-id">{{ userLicense }}</span>
              <span class="user-day">{{ selectedDay }}</span> </div>
          </div>
          <button class="logout-btn" @click="handleLogout">
            <svg xmlns="http://www.w3.org/2000/svg" width="30" height="30" viewBox="0 0 24 24"><path fill="currentColor" d="M5 21q-.825 0-1.412-.587T3 19V5q0-.825.588-1.412T5 3h6q.425 0 .713.288T12 4t-.288.713T11 5H5v14h6q.425 0 .713.288T12 20t-.288.713T11 21zm12.175-8H10q-.425 0-.712-.288T9 12t.288-.712T10 11h7.175L15.3 9.125q-.275-.275-.275-.675t.275-.7t.7-.313t.725.288L20.3 11.3q.3.3.3.7t-.3.7l-3.575 3.575q-.3.3-.712.288t-.713-.313q-.275-.3-.262-.712t.287-.688z"/></svg>
          </button>
        </div>

        <nav class="sidebar-nav">
          <ul>
            <li @click="goTo('/home')">
              <div class="menu-item">
                <span class="menu-icon">
                  <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24"><path fill="currentColor" d="M10 20v-6h4v6h5v-8h3L12 3L2 12h3v8z"/></svg>
                </span>
                <span class="menu-text">Home</span>
              </div>
            </li>

            <li @click="openDayModal">
              <div class="menu-item">
                <span class="menu-icon"><svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 48 48"><g fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="4"><path d="M18 31h20V5"/><path d="M30 21H10v22m34-32l-6-6l-6 6"/><path d="m16 37l-6 6l-6-6"/></g></svg></span>
                <span class="menu-text">Change days</span>
              </div>
            </li>
            
            <li @click="goTo('/calendar')">
              <div class="menu-item">
                <span class="menu-icon"><svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24"><g fill="currentColor"><path fill-rule="evenodd" d="M6 4h12a4 4 0 0 1 4 4v10a4 4 0 0 1-4 4H6a4 4 0 0 1-4-4V8a4 4 0 0 1 4-4m0 2a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2z" clip-rule="evenodd"/><path fill-rule="evenodd" d="M3 10a1 1 0 0 1 1-1h16a1 1 0 1 1 0 2H4a1 1 0 0 1-1-1m5-8a1 1 0 0 1 1 1v4a1 1 0 0 1-2 0V3a1 1 0 0 1 1-1m8 0a1 1 0 0 1 1 1v4a1 1 0 1 1-2 0V3a1 1 0 0 1 1-1" clip-rule="evenodd"/><path d="M8 13a1 1 0 1 1-2 0a1 1 0 0 1 2 0m0 4a1 1 0 1 1-2 0a1 1 0 0 1 2 0m5-4a1 1 0 1 1-2 0a1 1 0 0 1 2 0m0 4a1 1 0 1 1-2 0a1 1 0 0 1 2 0m5-4a1 1 0 1 1-2 0a1 1 0 0 1 2 0m0 4a1 1 0 1 1-2 0a1 1 0 0 1 2 0"/></g></svg></span>
                <span class="menu-text">Calendar</span>
              </div>
            </li>
            
            <li class="delete-acc" @click="openDeleteModal">
              <div class="menu-item">
                <span class="menu-icon"><svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24"><path fill="currentColor" d="M19 4h-3.5l-1-1h-5l-1 1H5v2h14M6 19a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2V7H6z"/></svg></span>
                <span class="menu-text">Delete Account</span>
              </div>
            </li>
          </ul>
        </nav>
      </aside>
    </transition>

    <Transition name="fade">
      <div v-if="isDayModalOpen" class="modal-overlay-center" @click.self="isDayModalOpen = false">
        <div class="day-modal-card">
          <h2 class="day-modal-title">Choose your day</h2>
          <div class="days-list">
            <div v-for="day in daysOfWeek" :key="day" class="day-option" @click="tempSelectedDay = day">
              <span :class="{ 'active-day-text': tempSelectedDay === day }">{{ day }}</span>
              <div class="checkbox-box">
                <span v-if="tempSelectedDay === day" class="material-icons check-icon">check</span>
              </div>
            </div>
          </div>
          <div class="day-modal-footer">
            <button class="btn-cancel-day" @click="isDayModalOpen = false">Cancel</button>
            <button class="btn-confirm-day" @click="confirmDayChange">Confirm</button>
          </div>
        </div>
      </div>
    </Transition>

    <Transition name="fade">
      <div v-if="isDeleteAccModalOpen" class="modal-overlay-center" @click.self="isDeleteAccModalOpen = false">
        <div class="white-modal-card">
          <div class="warning-icon">⚠️</div>
          <h2 class="modal-msg-title red-text">Delete Account?</h2>
          <p class="modal-desc">All your surgery data will be permanently removed.</p>
          <div class="modal-button-group">
            <button class="btn-cancel-gray" @click="isDeleteAccModalOpen = false">Cancel</button>
            <button class="btn-confirm-red" @click="handleDeleteAccount">Delete</button>
          </div>
        </div>
      </div>
    </Transition>

    <main class="content-area">
      <RouterView />
    </main>
  </div>
</template>

<script setup>
import { ref, onMounted, computed } from 'vue'
import { RouterView, useRouter, useRoute } from 'vue-router'

const isSidebarOpen = ref(false)
const isDeleteAccModalOpen = ref(false)
const isDayModalOpen = ref(false) // สถานะเปิด/ปิด Pop-up เลือกวัน

const router = useRouter()
const route = useRoute() 
const userLicense = ref('------')

// สถานะการเลือกวัน
const daysOfWeek = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday']
const selectedDay = ref('Monday')
const tempSelectedDay = ref('Monday')

// คำนวณว่าควรแสดงเลย์เอาต์ไหม
const showLayout = computed(() => {
  const hiddenPages = [
    '/login', 
    '/signup', 
    '/forgot-password', 
    '/admin-login',
    '/booking'
  ]
  return !hiddenPages.includes(route.path)
})

onMounted(() => {
  const savedLicense = localStorage.getItem('userLicense')
  if (savedLicense) userLicense.value = savedLicense

  const savedDay = localStorage.getItem('selectedDay')
  if (savedDay) {
    selectedDay.value = savedDay
    tempSelectedDay.value = savedDay
  }
})

const toggleSidebar = () => { isSidebarOpen.value = !isSidebarOpen.value }
const closeSidebar = () => { isSidebarOpen.value = false }

// --- ฟังก์ชันของ Pop-up เลือกวัน ---
const openDayModal = () => {
  isSidebarOpen.value = false // ปิดเมนูข้างก่อน
  tempSelectedDay.value = selectedDay.value // เซ็ตค่าเริ่มให้ตรงกับวันปัจจุบัน
  isDayModalOpen.value = true // เปิดหน้าต่าง Pop-up
}

const confirmDayChange = () => {
  selectedDay.value = tempSelectedDay.value
  localStorage.setItem('selectedDay', selectedDay.value)
  isDayModalOpen.value = false
  // ถ้ากดมาจากหน้าอื่น ให้พากลับไปหน้า Home เพื่อรีเฟรชคิวผ่าตัด (ถ้าต้องการ)
  if (route.path !== '/home') {
    router.push('/home')
  }
}

// --- ฟังก์ชันลบบัญชี ---
const openDeleteModal = () => {
  isSidebarOpen.value = false
  isDeleteAccModalOpen.value = true
}

const handleDeleteAccount = () => {
  localStorage.clear()
  isDeleteAccModalOpen.value = false
  router.push('/login')
}

// เปลี่ยนหน้าทั่วไป
const goTo = (path) => {
  isSidebarOpen.value = false
  router.push(path)
}

const handleLogout = () => {
  if (confirm("คุณต้องการออกจากระบบใช่หรือไม่?")) {
    localStorage.removeItem('userLicense')
    isSidebarOpen.value = false
    router.push('/login')
  }
}
</script>

<style scoped>
@import url('https://fonts.googleapis.com/icon?family=Material+Icons');

/* --- Style ส่วน Sidebar เดิม --- */
.main-header { padding: 15px; position: fixed; top: 0; left: 0; z-index: 50; }
.icon-circle { 
  width: 45px; height: 45px; background-color: #1a3a5f; color: white; 
  border-radius: 50%; display: flex; align-items: center; justify-content: center; 
  cursor: pointer; border: 2px solid white; box-shadow: 0 4px 10px rgba(0,0,0,0.1);
}
.overlay { position: fixed; top: 0; left: 0; width: 100vw; height: 100vh; background-color: rgba(0, 0, 0, 0.4); z-index: 999; }
.sidebar { width: 280px; background-color: #f8faff; height: 100vh; position: fixed; left: 0; top: 0; z-index: 1000; box-shadow: 5px 0px 20px rgba(0, 0, 0, 0.15); }
.sidebar-header { background-color: #1a3a5f; color: white; padding: 25px 20px; display: flex; justify-content: space-between; align-items: center; box-sizing: border-box; }
.user-info { display: flex; align-items: center; gap: 15px; }
.avatar-icon { cursor: pointer; display: flex; align-items: center; color: white; }
.user-details { display: flex; flex-direction: column; line-height: 1.2; }
.user-id { font-weight: bold; font-size: 1.1rem; }
.user-day { font-size: 0.8rem; opacity: 0.85; }
.logout-btn { background: none; border: none; color: white; cursor: pointer; display: flex; align-items: center; }
.sidebar-nav ul { list-style: none; padding: 0; margin: 0; }
.sidebar-nav li { padding: 18px 25px; border-bottom: 1px solid #edf2f7; cursor: pointer; }
.sidebar-nav li:hover { background-color: #f0f4f8; }
.menu-item { display: flex; align-items: center; color: #4a6fa5; font-weight: bold; gap: 15px; }
.slide-enter-active, .slide-leave-active { transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1); }
.slide-enter-from, .slide-leave-to { transform: translateX(-100%); }
.content-area { min-height: 100vh; background-color: #fff; width: 100%; }

/* --- Style สำหรับ Pop-up พื้นฐาน --- */
.modal-overlay-center {
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    display: flex;
    justify-content: center;
    align-items: center;
    z-index: 4000;
    background: rgba(0, 0, 0, 0.4);
}

.fade-enter-active, .fade-leave-active { transition: opacity 0.3s ease; }
.fade-enter-from, .fade-leave-to { opacity: 0; }

/* --- Pop-up: เลือกวัน --- */
.day-modal-card {
    background-color: #e3f2fd;
    width: 90%;
    max-width: 340px;
    padding: 30px;
    border-radius: 24px;
    box-shadow: 0 10px 25px rgba(0, 0, 0, 0.2);
}
.day-modal-title { color: #2c4c87; text-align: center; margin-bottom: 20px; }
.days-list { display: flex; flex-direction: column; gap: 5px; }
.day-option { display: flex; justify-content: space-between; padding: 12px; color: #6a92d4; cursor: pointer; transition: 0.2s; }
.day-option:hover { background-color: rgba(255, 255, 255, 0.5); border-radius: 8px; }
.active-day-text { color: #2c4c87; font-weight: bold; }
.checkbox-box { width: 22px; height: 22px; border: 2px solid #2c4c87; border-radius: 4px; background: white; display: flex; justify-content: center; align-items: center; }
.check-icon { color: #2c4c87; font-size: 18px; }
.day-modal-footer { display: flex; justify-content: flex-end; gap: 10px; margin-top: 25px; }
.btn-confirm-day { background: #2c4c87; color: white; border: none; padding: 10px 25px; border-radius: 12px; cursor: pointer; font-weight: bold; }
.btn-cancel-day { background: #fff; color: #666; border: 1px solid #ccc; padding: 10px 25px; border-radius: 12px; cursor: pointer; font-weight: bold; }

/* --- Pop-up: ลบบัญชี --- */
.white-modal-card {
    background: white;
    width: 90%;
    max-width: 320px;
    padding: 30px 20px;
    border-radius: 24px;
    text-align: center;
    box-shadow: 0 10px 25px rgba(0, 0, 0, 0.2);
}
.modal-msg-title { color: #2c4c87; font-size: 1.1rem; margin-bottom: 25px; }
.red-text { color: #d50000; font-weight: bold; }
.modal-desc { font-size: 0.85rem; color: #666; margin-top: -15px; margin-bottom: 25px; }
.warning-icon { font-size: 2.5rem; margin-bottom: 10px; }
.modal-button-group { display: flex; justify-content: center; gap: 15px; }
.btn-confirm-red { background-color: #d50000; color: white; border: none; padding: 10px 25px; border-radius: 12px; font-weight: bold; cursor: pointer; }
.btn-cancel-gray { background-color: #eee; color: #666; border: none; padding: 10px 25px; border-radius: 12px; font-weight: bold; cursor: pointer; }
</style>

<style>
html, body { margin: 0 !important; padding: 0 !important; width: 100% !important; height: 100% !important; overflow-x: hidden; }
#app { width: 100% !important; max-width: none !important; display: block !important; padding: 0 !important; margin: 0 !important; }
</style>