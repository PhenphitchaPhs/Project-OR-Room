<template>
  <div class="page">
    <div class="card">
      <button class="back-btn" @click="goBack">←</button>

      <div class="content-wrapper">
        <div class="logo-section">
          <img src="../assets/logo.png" alt="Hospital Logo" class="main-logo" />
          <h1 class="title">ORchestrator</h1>
        </div>

        <div class="form-group">
          <input type="text" placeholder="Full Name" v-model="doctorName" class="form-input" />
          <input type="text" placeholder="License Number" v-model="license" class="form-input" />
          
          <!-- 🟢 ช่อง Email และปุ่มกดส่ง OTP -->
          <div class="email-group">
            <input type="email" placeholder="Email Address" v-model="email" class="form-input" style="margin-bottom: 0;" />
            <button @click="sendOtp" :disabled="isSendingOtp || countdown > 0" class="otp-btn" type="button">
              {{ countdown > 0 ? `รอ ${countdown}s` : 'Send OTP' }}
            </button>
          </div>

          <input type="password" placeholder="Password" v-model="password" class="form-input" />
          <input type="password" placeholder="Confirm Password" v-model="confirmPassword" class="form-input" />
          
          <!-- 🟢 เปลี่ยนจาก Secret Key เป็นกรอก OTP -->
          <input type="text" placeholder="Enter 6-digit OTP from Email" v-model="otp" class="form-input" maxlength="6" />

          <div class="select-wrapper">
            <select v-model="orNumber" class="form-select" required>
              <option disabled value="">Select Your OR Number</option>
              <option v-for="n in orNumbers" :key="n" :value="n">OR-{{ n }}</option>
            </select>
          </div>
        </div>

        <button class="submit-btn" @click="submitForm">Sign Up</button>

        <p v-if="message"
          :style="{ color: isSuccess ? 'green' : 'red', marginTop: '12px', textAlign: 'center', fontWeight: '500' }">
          {{ message }}
        </p>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { apiFetch } from '../api/client'

const router = useRouter()

const doctorName = ref('')
const license = ref('')
const email = ref('')
const password = ref('')
const confirmPassword = ref('')
const otp = ref('') // 🟢 ตัวแปร OTP
const orNumber = ref('')
const message = ref('')
const isSuccess = ref(false)

// 🟢 ตัวจัดการสถานะปุ่ม OTP
const isSendingOtp = ref(false)
const countdown = ref(0)

const sendOtp = async () => {
  if (!email.value || !email.value.includes('@')) {
    message.value = "กรุณากรอกรูปแบบอีเมลให้ถูกต้องก่อน"
    isSuccess.value = false
    return
  }

  isSendingOtp.value = true
  message.value = "กำลังส่งรหัส OTP..."
  isSuccess.value = true 

  try {
    const response = await apiFetch('/api/send-otp', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: email.value })
    })
    
    const data = await response.json()

    if (!response.ok) throw new Error(data.error || 'ส่งอีเมลไม่สำเร็จ')

    message.value = "ส่งรหัส OTP ไปยังอีเมลแล้ว (หมดอายุใน 5 นาที)"
    isSuccess.value = true
    
    countdown.value = 60
    const timer = setInterval(() => {
      countdown.value--
      if (countdown.value <= 0) clearInterval(timer)
    }, 1000)

  } catch (error) {
    message.value = "❌ " + error.message
    isSuccess.value = false
  } finally {
    isSendingOtp.value = false
  }
}

const submitForm = async () => {
  if (!doctorName.value || !license.value || !email.value || !password.value || !confirmPassword.value || !orNumber.value || !otp.value) {
    message.value = "กรุณากรอกข้อมูลและรหัส OTP ให้ครบ"
    isSuccess.value = false
    return
  }

  if (password.value !== confirmPassword.value) {
    message.value = "รหัสผ่านไม่ตรงกัน"
    isSuccess.value = false
    return
  }

  try {
    const response = await apiFetch('/api/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        license: license.value,
        doctorName: doctorName.value,
        email: email.value,
        password: password.value,
        orNumber: orNumber.value,
        otp: otp.value // 🟢 ส่ง OTP ไปเช็ค
      })
    })

    const data = await response.json()

    if (!response.ok) throw new Error(data.error || 'สมัครไม่สำเร็จ')

    message.value = "สมัครสมาชิกสำเร็จ!"
    isSuccess.value = true

    setTimeout(() => { router.push('/login') }, 1500)

  } catch (error) {
    message.value = "❌ " + error.message
    isSuccess.value = false
  }
}

const goBack = () => { router.back() }

const orNumbers = Array.from({ length: 20 }, (_, i) => 201 + i)
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
  color: #001F5B;
  font-weight: 700;
}

.form-group {
  width: 100%;
}

.form-select {
  color: #333;
  cursor: pointer;
  -webkit-appearance: none;
  appearance: none;
  background-image: url("data:image/svg+xml;charset=UTF-8,%3csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%23001F5B' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3e%3cpolyline points='6 9 12 15 18 9'%3e%3c/polyline%3e%3c/svg%3e");
  background-repeat: no-repeat;
  background-position: right 16px center;
  background-size: 16px;
  line-height: normal;
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

/* 🟢 สไตล์ใหม่สำหรับปุ่มกดรับ OTP */
.email-group {
  display: flex;
  gap: 10px;
  width: 100%;
  margin-bottom: 16px;
}

.otp-btn {
  white-space: nowrap;
  padding: 0 16px;
  background: #e8f0fe;
  color: #001F5B;
  border: 1px solid #cce0ff;
  border-radius: 12px;
  font-weight: 600;
  cursor: pointer;
  transition: 0.2s;
}

.otp-btn:hover:not(:disabled) {
  background: #cce0ff;
}

.otp-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

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