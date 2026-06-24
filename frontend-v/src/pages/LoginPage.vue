<template>
  <div class="page">
    <div class="card">
      <img src="../assets/logo.png" class="logo" />

      <h2 class="title">OR Chestrator</h2>

      <input v-model="license" type="text" inputmode="numeric" maxlength="5" placeholder="License" class="input"
        @input="handleLicenseInput" />

      <input v-model="password" type="password" placeholder="Password" class="input" />

      <div class="links">
        <router-link to="/admin-login">
          Admin mode
        </router-link>
        <span class="divider">|</span>

        <span class="link" @click="goForgot">
          Forgot password
        </span>

        <span class="divider">|</span>

        <span class="link" @click="goSignup">
          Sign up
        </span>
      </div>

      <button class="btn" @click="login">Log in</button>
    </div>
  </div>
  <!-- Dialog -->
  <div v-if="showDialog" class="dialog-overlay">
    <div class="dialog-box">
      <div class="dialog-icon">
        <svg xmlns="http://www.w3.org/2000/svg" width="30" height="30" viewBox="0 0 24 24" fill="none"
          stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <rect x="3" y="11" width="18" height="11" rx="2" />
          <path d="M7 11V7a5 5 0 0 1 10 0v4" />
        </svg>
      </div>

      <p class="dialog-message">
        {{ dialogMessage }}
      </p>


      <button class="dialog-btn" @click="showDialog = false">
        OK
      </button>
    </div>
  </div>
</template>


<script setup>
import { ref, onMounted } from "vue";
import { useRouter } from "vue-router";

const router = useRouter();
const license = ref("");
const password = ref("");
const showDialog = ref(false);
const dialogMessage = ref("");

// ถ้า login อยู่แล้ว ให้เด้งไปหน้าที่ถูกต้องตาม Role
onMounted(() => {
  const isLoggedIn = localStorage.getItem("isLoggedIn") === "true";
  const userRole = localStorage.getItem("userRole");

  if (isLoggedIn) {
    if (userRole === 'admin') {
      router.push("/admin-home"); // ถ้าเป็นแอดมิน ให้ไปหน้าแอดมิน
    } else {
      router.push("/home"); // ถ้าเป็นหมอ/พยาบาล ให้ไปหน้าโฮม
    }
  }
});

const goForgot = () => router.push("/forgot-password");
const goSignup = () => router.push("/signup");

const handleLicenseInput = () => {
  license.value = license.value.replace(/\D/g, "").slice(0, 5);
};

// เปลี่ยนเป็น async เพื่อต่อ API
const login = async () => {
  if (license.value.length !== 5) {
    dialogMessage.value = "License ต้องเป็นตัวเลข 5 หลัก";
    showDialog.value = true;
    return;
  }

  if (!password.value) {
    dialogMessage.value = "กรุณากรอก Password";
    showDialog.value = true;
    return;
  }

  try {
    // 🟢 ส่งข้อมูลไปให้ Backend (Cloudflare) ตรวจสอบ
    const response = await fetch('https://or-room-backend.rockzee2018.workers.dev/api/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        license: license.value,
        password: password.value
      })
    });

    const data = await response.json();

    if (response.ok && data.success) {
      // ✅ ถ้าฐานข้อมูลตอบกลับมาว่ารหัสถูก ค่อยเซฟสถานะลงเครื่องเพื่อให้เว็บจำได้
      localStorage.setItem("isLoggedIn", "true");
      localStorage.setItem("userLicense", data.user.license);
      localStorage.setItem("doctorName", data.user.doctorName);
      localStorage.setItem("userRole", data.user.role || 'user');
      localStorage.setItem("selectedDay", data.user.day || 'Monday');

      router.push("/home");
    } else {
      dialogMessage.value = "❌ " + (data.error || "ล็อกอินไม่สำเร็จ");
      showDialog.value = true;
    }
  } catch (error) {
    console.error(error);
    dialogMessage.value = "❌ ไม่สามารถเชื่อมต่อกับเซิร์ฟเวอร์ได้";
    showDialog.value = true;
  }
}
</script>

<style scoped>
* {
  box-sizing: border-box;
}

.page {
  height: 100dvh;
  width: 100%;

  display: flex;
  justify-content: center;
  align-items: center;
  /* กลางจริง ๆ */

  background: #ffffff;
  /* เทาอ่อนเรียบ */
}

.card {
  width: 100%;
  max-width: 390px;
  padding: 0 24px;
  /* เอา padding ใหญ่ ๆ ออก */
  text-align: center;

  background: transparent;
  /* ไม่มีพื้นขาว */
  border-radius: 0;
  /* ไม่ต้องโค้ง */
  box-shadow: none;
  /* ไม่มีเงา */
}

.logo {
  width: 90px;
  margin-bottom: 10px;
}

.title {
  color: #001F5B;
  margin-bottom: 28px;
  font-weight: 700;
}

/* กล่องกรอกข้อมูลให้เหมือนหน้า Sign up */
.input {
  width: 100%;
  height: 50px;
  padding: 0 16px;
  margin-bottom: 16px;
  border-radius: 12px;
  border: 1px solid #ddd;
  background: #ffffff;
  font-size: 15px;
  outline: none;
  transition: all 0.2s ease;
}

.input:focus {
  border: 1.5px solid #001F5B;
  box-shadow: 0 0 8px rgba(0, 31, 91, 0.1);
}

/* Links */
.links {
  font-size: 13px;
  color: #001F5B;
  margin-bottom: 24px;
}

.link {
  color: #001F5B;
  cursor: pointer;
  font-weight: 500;
  text-decoration: none;
  /* 🔥 เอาเส้นใต้ออก */
}

.link:hover {
  text-decoration: none;
  /* 🔥 ไม่ให้มีตอน hover */
  opacity: 0.7;
  /* เปลี่ยนเป็นจางแทน */
}

a {
  text-decoration: none;
  color: #001F5B;
}

.divider {
  margin: 0 8px;
  color: #bbb;
}

/* ปุ่ม */
.btn {
  width: 100%;
  padding: 14px;
  border-radius: 14px;
  border: none;
  background: #001F5B;
  color: white;
  font-size: 16px;
  font-weight: 600;
  cursor: pointer;
  transition: 0.2s ease;

  display: block;
  margin: 0 auto;
}

.btn:hover {
  background: #1A3A7C;
}

.dialog-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.45);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 999;
  padding: 20px;
}

.dialog-box {
  width: 100%;
  max-width: 340px;
  background: white;
  border-radius: 20px;
  padding: 28px 24px;
  text-align: center;
  animation: popup 0.2s ease;
}

.dialog-icon {
  width: 60px;
  height: 60px;
  margin: 0 auto 16px;
  border-radius: 50%;
  background: #ffe5e5;
  color: #e53935;
  font-size: 28px;
  font-weight: bold;
  display: flex;
  align-items: center;
  justify-content: center;
}

.dialog-message {
  font-size: 16px;
  color: #333;
  margin-bottom: 24px;
  line-height: 1.5;
  font-weight: 500;
}

.dialog-btn {
  width: 100%;
  height: 46px;
  border: none;
  border-radius: 12px;
  background: #001F5B;
  color: white;
  font-size: 15px;
  font-weight: 600;
  cursor: pointer;
}

.dialog-btn:hover {
  background: #173a82;
}

@keyframes popup {
  from {
    transform: scale(0.9);
    opacity: 0;
  }

  to {
    transform: scale(1);
    opacity: 1;
  }
}
</style>