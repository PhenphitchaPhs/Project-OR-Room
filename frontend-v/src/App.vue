<template>
  <div class="app-container">
    <header class="main-header" v-if="!isSidebarOpen">
      <div class="profile-trigger" @click="toggleSidebar">
        <div class="icon-circle">
          <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24"><path fill="currentColor" d="M12 2A10 10 0 0 0 2 12a10 10 0 0 0 10 10a10 10 0 0 0 10-10A10 10 0 0 0 12 2M7.07 18.28c.43-.9 3.05-1.78 4.93-1.78s4.5.88 4.93 1.78A7.9 7.9 0 0 1 12 20c-1.86 0-3.57-.64-4.93-1.72m11.29-1.45c-1.43-1.74-4.9-2.33-6.36-2.33s-4.93.59-6.36 2.33A7.93 7.93 0 0 1 4 12c0-4.41 3.59-8 8-8s8 3.59 8 8c0 1.82-.62 3.5-1.64 4.83M12 6c-1.94 0-3.5 1.56-3.5 3.5S10.06 13 12 13s3.5-1.56 3.5-3.5S13.94 6 12 6m0 5a1.5 1.5 0 0 1-1.5-1.5A1.5 1.5 0 0 1 12 8a1.5 1.5 0 0 1 1.5 1.5A1.5 1.5 0 0 1 12 11"/></svg>
        </div>
      </div>
    </header>

    <div v-if="isSidebarOpen" class="overlay" @click="closeSidebar"></div>

    <transition name="slide">
      <aside v-if="isSidebarOpen" class="sidebar">
        <div class="sidebar-header">
          <div class="user-info">
            <div class="avatar-icon" @click="toggleSidebar">
              <svg xmlns="http://www.w3.org/2000/svg" width="45" height="45" viewBox="0 0 24 24"><path fill="currentColor" d="M12 2A10 10 0 0 0 2 12a10 10 0 0 0 10 10a10 10 0 0 0 10-10A10 10 0 0 0 12 2M7.07 18.28c.43-.9 3.05-1.78 4.93-1.78s4.5.88 4.93 1.78A7.9 7.9 0 0 1 12 20c-1.86 0-3.57-.64-4.93-1.72m11.29-1.45c-1.43-1.74-4.9-2.33-6.36-2.33s-4.93.59-6.36 2.33A7.93 7.93 0 0 1 4 12c0-4.41 3.59-8 8-8s8 3.59 8 8c0 1.82-.62 3.5-1.64 4.83M12 6c-1.94 0-3.5 1.56-3.5 3.5S10.06 13 12 13s3.5-1.56 3.5-3.5S13.94 6 12 6m0 5a1.5 1.5 0 0 1-1.5-1.5A1.5 1.5 0 0 1 12 8a1.5 1.5 0 0 1 1.5 1.5A1.5 1.5 0 0 1 12 11"/></svg>
            </div>
            <div class="user-details">
              <span class="user-id">123546</span>
              <span class="user-day">Monday</span>
            </div>
          </div>
          <button class="logout-btn" @click="handleLogout">
            <svg xmlns="http://www.w3.org/2000/svg" width="30" height="30" viewBox="0 0 24 24"><path fill="currentColor" d="M5 21q-.825 0-1.412-.587T3 19V5q0-.825.588-1.412T5 3h6q.425 0 .713.288T12 4t-.288.713T11 5H5v14h6q.425 0 .713.288T12 20t-.288.713T11 21zm12.175-8H10q-.425 0-.712-.288T9 12t.288-.712T10 11h7.175L15.3 9.125q-.275-.275-.275-.675t.275-.7t.7-.313t.725.288L20.3 11.3q.3.3.3.7t-.3.7l-3.575 3.575q-.3.3-.712.288t-.713-.313q-.275-.3-.262-.712t.287-.688z"/></svg>
          </button>
        </div>

        <nav class="sidebar-nav">
          <ul>
            <li>
              <div class="menu-item">
                <span class="menu-icon"><svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 48 48"><g fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="4"><path d="M18 31h20V5"/><path d="M30 21H10v22m34-32l-6-6l-6 6"/><path d="m16 37l-6 6l-6-6"/></g></svg></span>
                <span class="menu-text">Change days</span>
              </div>
            </li>
            <li>
              <div class="menu-item">
                <span class="menu-icon"><svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24"><g fill="currentColor"><path fill-rule="evenodd" d="M6 4h12a4 4 0 0 1 4 4v10a4 4 0 0 1-4 4H6a4 4 0 0 1-4-4V8a4 4 0 0 1 4-4m0 2a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2z" clip-rule="evenodd"/><path fill-rule="evenodd" d="M3 10a1 1 0 0 1 1-1h16a1 1 0 1 1 0 2H4a1 1 0 0 1-1-1m5-8a1 1 0 0 1 1 1v4a1 1 0 0 1-2 0V3a1 1 0 0 1 1-1m8 0a1 1 0 0 1 1 1v4a1 1 0 1 1-2 0V3a1 1 0 0 1 1-1" clip-rule="evenodd"/><path d="M8 13a1 1 0 1 1-2 0a1 1 0 0 1 2 0m0 4a1 1 0 1 1-2 0a1 1 0 0 1 2 0m5-4a1 1 0 1 1-2 0a1 1 0 0 1 2 0m0 4a1 1 0 1 1-2 0a1 1 0 0 1 2 0m5-4a1 1 0 1 1-2 0a1 1 0 0 1 2 0m0 4a1 1 0 1 1-2 0a1 1 0 0 1 2 0"/></g></svg></span>
                <span class="menu-text">Calendar</span>
              </div>
            </li>
            <li class="delete-acc">
              <div class="menu-item">
                <span class="menu-icon"><svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24"><path fill="currentColor" d="M19 4h-3.5l-1-1h-5l-1 1H5v2h14M6 19a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2V7H6z"/></svg></span>
                <span class="menu-text">Delete Account</span>
              </div>
            </li>
          </ul>
        </nav>
      </aside>
    </transition>

    <main class="content-area">
      <RouterView />
    </main>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { RouterView, useRouter } from 'vue-router' // 1. นำเข้า useRouter เพิ่มเติม

const isSidebarOpen = ref(false)
const router = useRouter() // 2. ประกาศตัวแปร router เพื่อใช้ในการเปลี่ยนหน้า

const toggleSidebar = () => { isSidebarOpen.value = !isSidebarOpen.value }
const closeSidebar = () => { isSidebarOpen.value = false }

const handleLogout = () => {
  if (confirm("คุณต้องการออกจากระบบใช่หรือไม่?")) {
    isSidebarOpen.value = false // 3. ปิด Sidebar ก่อนย้ายหน้า
    router.push('/login')       // 4. สั่งให้เด้งไปที่หน้า Login จริงๆ
    console.log("Logged out successfully");
  }
}
</script>

<style scoped>
/* Style เดิมของคุณ (ผมเก็บไว้ทั้งหมดเพราะสวยอยู่แล้ว) */
.main-header { padding: 15px; position: fixed; top: 0; left: 0; z-index: 50; }
.icon-circle { 
  width: 45px; height: 45px; background-color: #6a92d4; color: white; 
  border-radius: 50%; display: flex; align-items: center; justify-content: center; 
  cursor: pointer; border: 2px solid white; box-shadow: 0 4px 10px rgba(0,0,0,0.1);
}

.overlay {
  position: fixed; top: 0; left: 0; width: 100vw; height: 100vh;
  background-color: rgba(0, 0, 0, 0.4); z-index: 999;
}

.sidebar { 
  width: 280px; background-color: #f8faff; height: 100vh; 
  position: fixed; left: 0; top: 0; z-index: 1000; 
  box-shadow: 5px 0px 20px rgba(0, 0, 0, 0.15);
}

.sidebar-header {
  background-color: #6a92d4; color: white; padding: 25px 20px;
  display: flex; justify-content: space-between; align-items: center;
  box-sizing: border-box;
}

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

.content-area { 
  min-height: 100vh; 
  background-color: #fff; 
  width: 100%; /* สำคัญ: ต้องกำหนดให้กว้าง 100% ของพื้นที่ที่เหลือ */
}
</style>

<style>
html, body {
  margin: 0 !important;
  padding: 0 !important;
  width: 100% !important;
  height: 100% !important;
  overflow-x: hidden; /* ป้องกันการเลื่อนซ้ายขวาเกินจำเป็น */
}

#app {
  width: 100% !important;
  max-width: none !important; /* ปลดล็อก Max Width */
  display: block !important;
  padding: 0 !important;
  margin: 0 !important;
}
</style>