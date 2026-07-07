<template>
  <div class="page">
    <div class="card">
      <img src="../assets/logo.png" class="logo" />

      <h2 class="title">ORchestrator</h2>

      <!-- 🟢 เปลี่ยนจาก License เป็น Email -->
      <input v-model="email" type="email" placeholder="Email Address" class="input" />

      <!-- อันนี้เป็นดวงตาเปิด/ปิดพาสเวิส -->
      <div class="input-wrapper">
        <input v-model="password" :type="showPassword ? 'text' : 'password'" placeholder="Password"
          class="input password-input" />
        <div class="eye-icon" @click="showPassword = !showPassword">
          <svg v-if="showPassword" xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24"
            fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
            <circle cx="12" cy="12" r="3"></circle>
          </svg>
          <svg v-else xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none"
            stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path
              d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24">
            </path>
            <line x1="1" y1="1" x2="23" y2="23"></line>
          </svg>
        </div>
      </div>

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
const email = ref(""); // 🟢 ใช้ email แทน license
const password = ref("");
const showPassword = ref(false);
const showDialog = ref(false);
const dialogMessage = ref("");

onMounted(() => {
  const isLoggedIn = localStorage.getItem("isLoggedIn") === "true";
  const userRole = localStorage.getItem("userRole");

  if (isLoggedIn) {
    if (userRole === 'admin') {
      router.push("/admin-home");
    } else {
      router.push("/home");
    }
  }
});

const goForgot = () => router.push("/forgot-password");
const goSignup = () => router.push("/signup");

const login = async () => {
  // 🟢 ตรวจสอบรูปแบบ Email
  if (!email.value || !email.value.includes('@')) {
    dialogMessage.value = "กรุณากรอกรูปแบบอีเมลให้ถูกต้อง";
    showDialog.value = true;
    return;
  }

  if (!password.value) {
    dialogMessage.value = "กรุณากรอก Password";
    showDialog.value = true;
    return;
  }

  try {
    const response = await fetch('https://or-room-backend.rockzee2018.workers.dev/api/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: email.value, // 🟢 ส่ง email ไปที่ Backend
        password: password.value
      })
    });

    const data = await response.json();

    if (response.ok && data.success) {
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
  background: #ffffff;
}

.card {
  width: 100%;
  max-width: 390px;
  padding: 0 24px;
  text-align: center;
  background: transparent;
  border-radius: 0;
  box-shadow: none;
}

.logo {
  width: 120px;
  margin-bottom: 0px;
}

.title {
  color: #001F5B;
  margin-bottom: 28px;
  margin-top: 0px;
  font-weight: 700;
}

.input-wrapper {
  position: relative;
  width: 100%;
  margin-bottom: 16px;
}

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

.input-wrapper .password-input {
  margin-bottom: 0;
  padding-right: 48px;
}

.eye-icon {
  position: absolute;
  right: 16px;
  top: 50%;
  transform: translateY(-50%);
  cursor: pointer;
  color: #999;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: color 0.2s ease;
}

.eye-icon:hover {
  color: #001F5B;
}

.input:focus {
  border: 1.5px solid #001F5B;
  box-shadow: 0 0 8px rgba(0, 31, 91, 0.1);
}

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
}

.link:hover {
  text-decoration: none;
  opacity: 0.7;
}

a {
  text-decoration: none;
  color: #001F5B;
}

.divider {
  margin: 0 8px;
  color: #bbb;
}

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