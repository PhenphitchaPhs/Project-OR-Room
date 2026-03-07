<template>
    <div class="login-wrapper">
        <button class="back-button" @click="goBack">
            <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none"
                stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">
                <polyline points="15 18 9 12 15 6" />
            </svg>
        </button>

        <div class="login-card">
            <div class="logo-section">
                <img :src="logo" alt="Hospital Logo" class="logo-img" />
                <h1 class="logo-text">Hospital</h1>
            </div>

            <form @submit.prevent="handleLogin" class="login-form">
                <input type="text" v-model="name" placeholder="Name" class="custom-input" />

                <input type="password" v-model="password" placeholder="Password" class="custom-input" />

                <!-- แสดง error -->
                <p v-if="errorMessage" class="error-text">
                    {{ errorMessage }}
                </p>

                <button type="submit" class="login-button">
                    Log in
                </button>
            </form>
        </div>
    </div>
</template>

<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import logo from '../../assets/logo.png'

const router = useRouter()

const name = ref('')
const password = ref('')
const errorMessage = ref('')

const handleLogin = () => {
    errorMessage.value = ''

    if (!name.value || !password.value) {
        errorMessage.value = 'กรุณากรอกข้อมูลให้ครบ'
        return
    }

    // 🔥 ตอนนี้ยังไม่ต่อ backend
    // ผ่าน validation แล้วให้เข้าได้เลย
    router.push({ name: 'admin-home' })
}

const goBack = () => {
    router.back()
}
</script>

<style scoped>
.error-text {
    color: red;
    font-size: 14px;
    margin: 8px 0;
}
</style>

















<style scoped>
/* จัดให้อยู่กึ่งกลางหน้าจอ */
.login-wrapper {
    position: relative;
    display: flex;
    justify-content: center;
    align-items: center;
    min-height: 100vh;
    background-color: #ffffff;
}

.login-card {
    display: flex;
    flex-direction: column;
    align-items: center;
    width: 100%;
    max-width: 340px;
    padding: 20px;
}

/* สไตล์ของโลโก้ */
.logo-section {
    display: flex;
    flex-direction: column;
    align-items: center;
    margin-bottom: 30px;
}

.logo-img {
    width: 90px;
    height: auto;
    margin-bottom: 5px;
}

.logo-text {
    color: #001F5B;
    /* สีฟ้าให้ใกล้เคียงกับคำว่า Hospital */
    font-size: 22px;
    font-weight: 700;
    margin: 0;
}

/* สไตล์ของฟอร์ม */
.login-form {
    display: flex;
    flex-direction: column;
    width: 100%;
    gap: 16px;
    /* ระยะห่างระหว่างช่องกรอกข้อมูล */
}

/* สไตล์ของช่อง Input (สีเขียวอ่อน) */
.custom-input {
    width: 100%;
    padding: 16px;
    border-radius: 8px;
    border: 1px solid #c0c0c0;
    /* กรอบสีเขียวอ่อน */
    background-color: hsl(0, 0%, 100%);
    /* พื้นหลังสีเขียวพาสเทล */
    color: #000000;
    /* สีตัวอักษรด้านใน */
    font-size: 16px;
    box-sizing: border-box;
    outline: none;
    transition: border-color 0.2s ease-in-out;
}

.custom-input::placeholder {
    color: #9a9a9a;
}

.custom-input:focus {
    border-color: #9a9a9a;
}

/* สไตล์ของปุ่ม Log in */
.login-button {
    width: 100%;
    padding: 16px;
    margin-top: 20px;
    border-radius: 12px;
    border: none;
    background-color: #001F5B;
    /* สีฟ้าอมม่วงแบบในรูป */
    color: #ffffff;
    font-size: 18px;
    font-weight: 600;
    cursor: pointer;
    transition: background-color 0.2s ease;
}

.login-button:hover {
    background-color: #5b7dc2;
}

.back-button {
    position: absolute;
    top: 20px;
    left: 20px;
    background: none;
    border: none;
    cursor: pointer;
    color: #333;
    padding: 8px;
}

.back-button:hover {
    opacity: 0.7;
}
</style>