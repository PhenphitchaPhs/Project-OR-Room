<template>
  <div class="page">
    <div class="card">
      <img src="../assets/logo.png" class="logo" />

      <h2 class="title">Hospital</h2>

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
</template>


<script setup>
import { ref, onMounted } from "vue";
import { useRouter } from "vue-router";

const router = useRouter();
const license = ref("");
const password = ref("");

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
    alert("License ต้องเป็นตัวเลข 5 หลัก");
    return;
  }

  if (!password.value) {
    alert("กรุณากรอก Password");
    return;
  }

  try {
    // 🟢 ส่งข้อมูลไปให้ Backend (Cloudflare) ตรวจสอบ
    const response = await fetch('http://localhost:8787/api/login', {
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
      localStorage.setItem("userRole", data.user.role || 'user'); // ป้องกันกรณีไม่มี Role ส่งมา

      alert("ล็อกอินสำเร็จ ยินดีต้อนรับเข้าสู่ระบบ!");
      router.push("/home");
    } else {
      alert("❌ " + (data.error || "ล็อกอินไม่สำเร็จ"));
    }
  } catch (error) {
    console.error(error);
    alert("❌ ไม่สามารถเชื่อมต่อกับเซิร์ฟเวอร์ได้ กรุณาตรวจสอบว่ารัน Backend อยู่หรือไม่");
  }
};
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
</style>
