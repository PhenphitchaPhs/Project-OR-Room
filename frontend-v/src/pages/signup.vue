<template>
  <div class="page">
    <div class="card">
      <button class="back" @click="$router.push('/login')">←</button>

      <div class="logo">
        <img src="../assets/logo.png" alt="Hospital" />
        <h3>Sign up</h3>
      </div>

      <input type="text" placeholder="License" v-model="license" />
      <input type="password" placeholder="Password" v-model="password" />
      <input type="password" placeholder="Confirm password" v-model="confirmPassword" />

      <select v-model="day">
        <option value="" disabled>Choose your day</option>
        <option v-for="d in days" :key="d" :value="d">
          {{ d }}
        </option>
      </select>

      <button class="submit" @click="submitForm">
        Sign up
      </button>
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

const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday']

const submitForm = () => {
  if (password.value !== confirmPassword.value) {
    alert('รหัสผ่านไม่ตรงกัน!')
    return
  }

  console.log({
    license: license.value,
    password: password.value,
    day: day.value
  })

  alert('สมัครสมาชิกสำเร็จ!')
  router.push('/login')
}
</script>

<style scoped>
.page {
  width: 100vw;
  height: 100vh;
  background: #ffffff;
  display: flex;
  justify-content: center;
  align-items: center; /* ยัง center เหมือนเดิม */
}

.card {
  width: 320px;
  background: #ffffff;
  border-radius: 16px;
  padding: 20px;
  box-shadow: none;
  position: relative;

  transform: translateY(-60px); /* ⭐ ขยับขึ้น */
}


.back {
  background: none;
  border: none;
  font-size: 24px;
  cursor: pointer;
  color: #2a7de1;

  position: absolute; /* ✅ เพิ่ม */
  top: 12px;           /* ✅ เพิ่ม */
  left: 12px;          /* ✅ เพิ่ม */
}

.logo {
  text-align: center;
  margin-bottom: 20px;
  margin-top: -10px; /* ✅ เพิ่ม เพื่อขยับขึ้น */
}

.logo img {
  width: 60px;
}

.logo h3 {
  color: #2a7de1;
  margin-top: 10px;
}

input,
select {
  width: 100%;
  padding: 12px;
  margin-bottom: 12px;
  border-radius: 10px;
  border: 1px solid #c7e7d6;
  background: #e9fff3;
  box-sizing: border-box;
}

.submit {
  width: 100%;
  padding: 12px;
  background: #6c95d9;
  color: #fff;
  border: none;
  border-radius: 12px;
  font-size: 16px;
  cursor: pointer;
  margin-top: 10px;
}

.submit:hover {
  background: #5a84c5;
}
</style>