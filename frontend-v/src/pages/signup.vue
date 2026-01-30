<template>
  <div class="page">
    <div class="card">
      <!-- back -->
      <button class="back">←</button>

      <!-- logo -->
      <div class="logo">
        <img src="/logo.png" alt="Hospital" />
        <h3>Hospital</h3>
      </div>

      <!-- form -->
      <input type="text" placeholder="License" v-model="license" />

      <input type="password" placeholder="Password" v-model="password" />

      <input
        type="password"
        placeholder="Confirm password"
        v-model="confirmPassword"
      />

      <select v-model="day">
        <option value="" disabled>Choose your day</option>
        <option v-for="d in days" :key="d" :value="d">
          {{ d }}
        </option>
      </select>

      <button class="submit" @click="submitForm">
        Sign in
      </button>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'

const license = ref('')
const password = ref('')
const confirmPassword = ref('')
const day = ref('')

const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday']

const submitForm = () => {
  console.log({
    license: license.value,
    password: password.value,
    confirmPassword: confirmPassword.value,
    day: day.value
  })
}
</script>

<style scoped>
.page {
  min-height: 100vh;
  background: #eaf4ff;
  display: flex;
  justify-content: center;
  align-items: center;
}

.card {
  width: 320px;
  background: #fff;
  border-radius: 16px;
  padding: 20px;
}

.back {
  background: none;
  border: none;
  font-size: 20px;
  cursor: pointer;
}

.logo {
  text-align: center;
  margin: 20px 0;
}

.logo img {
  width: 60px;
}

input,
select {
  width: 100%;
  padding: 12px;
  margin-bottom: 12px;
  border-radius: 10px;
  border: 1px solid #c7e7d6;
  background: #e9fff3;
}

.submit {
  width: 100%;
  padding: 12px;
  background: #fafbfd;
  color: #fff;
  border: none;
  border-radius: 12px;
  font-size: 16px;
  cursor: pointer;
}
</style>
