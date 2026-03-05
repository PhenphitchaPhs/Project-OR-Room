<template>
  <div class="page">
    <div class="card">
      <button class="back-btn" @click="goBack">
        ←
      </button>

      <div class="content-wrapper">
        <div class="logo-section">
          <img src="../assets/logo.png" alt="Hospital Logo" class="main-logo" />
          <h1 class="title">Hospital Management</h1>
        </div>

        <div class="form-group">
          <input type="text" placeholder="License Number" v-model="license" class="form-input" />
          <input type="password" placeholder="Password" v-model="password" class="form-input" />
          <input type="password" placeholder="Confirm Password" v-model="confirmPassword" class="form-input" />

          <div class="select-wrapper">
            <select v-model="day" class="form-select" required>
              <option disabled value="">Select Your Day</option>
              <option v-for="d in days" :key="d" :value="d">
                {{ d }}
              </option>
            </select>
          </div>
        </div>

        <button class="submit-btn" @click="submitForm">
          Sign Up
        </button>

        <p v-if="message" :style="{
          color: isSuccess ? 'green' : 'red',
          marginTop: '12px',
          textAlign: 'center',
          fontWeight: '500'
        }">
          {{ message }}
        </p>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'

const router = useRouter()

const license = ref('')
const password = ref('')
const confirmPassword = ref('')
const day = ref('')
const message = ref('')
const isSuccess = ref(false)

const submitForm = () => {

  if (!license.value || !password.value || !confirmPassword.value || !day.value) {
    message.value = "กรุณากรอกข้อมูลให้ครบ"
    isSuccess.value = false
    return
  }

  if (password.value !== confirmPassword.value) {
    message.value = "รหัสผ่านไม่ตรงกัน"
    isSuccess.value = false
    return
  }

  // ✅ จำลองว่าสมัครสำเร็จ (ยังไม่ใช้ backend)
  message.value = "สมัครสมาชิกสำเร็จ!"
  isSuccess.value = true

  // เด้งกลับ login หลัง 1.5 วิ
  setTimeout(() => {
    router.push('/login')
  }, 1500)
}

const goBack = () => {
  router.back()
}

const days = [
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday'
]
</script>

<style scoped>
* {
  box-sizing: border-box;
}

.page {
  min-height: 100vh;
  background: #f0f7ff;
  display: flex;
  justify-content: center;
  align-items: center;
  font-family: 'Inter', sans-serif;
}

.card {
  width: 400px;
  background: #ffffff;
  border-radius: 24px;
  padding: 30px;
  box-shadow: 0 10px 25px rgba(0, 0, 0, 0.05);
  position: relative;
}

.back-btn {
  background: none;
  border: none;
  font-size: 24px;
  cursor: pointer;
  color: #333;
  position: absolute;
  top: 20px;
  left: 20px;
}

.content-wrapper {
  padding-top: 30px;
  display: flex;
  flex-direction: column;
  align-items: center;
}

.logo-section {
  text-align: center;
  margin-bottom: 30px;
}

.main-logo {
  width: 80px;
  height: auto;
  margin-bottom: 10px;
}

.title {
  margin: 0;
  font-size: 22px;
  /* ลดขนาดเล็กน้อยเพื่อให้ไม่เบียด */
  color: #001F5B;
  font-weight: 700;
}

.form-group {
  width: 100%;
}

/* รวม Style ของ Input และ Select ให้กว้างเท่ากัน */
.form-select {
  color: #333;
}


.form-input,
.form-select {
  width: 100%;
  height: 50px;
  padding: 0 16px;
  margin-bottom: 16px;
  border-radius: 12px;
  border: 1px solid #ddd;
  background: #fff;
  font-size: 15px;
  outline: none;
  transition: all 0.2s ease;
}

.form-input:focus,
.form-select:focus {
  border: 1.5px solid #001F5B;
  box-shadow: 0 0 8px rgba(0, 31, 91, 0.1);
}

/* แก้ไขจุดที่เป็นปัญหา: ปรับแต่ง Select ให้แสดงตัวหนังสือตรงกลาง */
.form-select {
  cursor: pointer;
  color: #333;
  /* ลบ appearance แบบเจาะจง */
  -webkit-appearance: none;
  -moz-appearance: none;
  appearance: none;

  /* ใส่ลูกศรใหม่ผ่าน background */
  background-image: url("data:image/svg+xml;charset=UTF-8,%3csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%23001F5B' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3e%3cpolyline points='6 9 12 15 18 9'%3e%3c/polyline%3e%3c/svg%3e");
  background-repeat: no-repeat;
  background-position: right 16px center;
  background-size: 16px;

  /* ลบ line-height ที่เป็นปัญหาออก แล้วใช้การจัดการ padding ภายในแทน */
  line-height: normal;
}

/* สีปุ่ม Sign In */
.submit-btn {
  width: 100%;
  height: 50px;
  margin-top: 10px;
  background: #001F5B;
  color: white;
  border: none;
  border-radius: 12px;
  font-size: 16px;
  font-weight: 600;
  cursor: pointer;
}

.submit-btn:hover {
  background: #1A3A7C;
}
</style>