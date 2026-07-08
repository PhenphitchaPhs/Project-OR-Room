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
                <h1 class="logo-text">ORchestrator</h1>
            </div>

            <form @submit.prevent="handleLogin" class="login-form">
                <input type="text" v-model="name" placeholder="Name" class="custom-input" />

                <div class="input-wrapper">
                    <input :type="showPassword ? 'text' : 'password'" v-model="password" placeholder="Password"
                        class="custom-input password-input" />
                    <div class="eye-icon" @click="showPassword = !showPassword">
                        <svg v-if="showPassword" xmlns="http://www.w3.org/2000/svg" width="20" height="20"
                            viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"
                            stroke-linecap="round" stroke-linejoin="round">
                            <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                            <circle cx="12" cy="12" r="3"></circle>
                        </svg>
                        <svg v-else xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24"
                            fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"
                            stroke-linejoin="round">
                            <path
                                d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24">
                            </path>
                            <line x1="1" y1="1" x2="23" y2="23"></line>
                        </svg>
                    </div>
                </div>

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
const showPassword = ref(false)
const errorMessage = ref('')

const handleLogin = async () => {
    errorMessage.value = ''
    if (!name.value || !password.value) {
        errorMessage.value = 'กรุณากรอกข้อมูลให้ครบ'
        return
    }
    try {
        const res = await fetch('https://or-room-backend.rockzee2018.workers.dev/api/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ license: name.value, password: password.value })
        })
        const data = await res.json()
        // 📍 อนุญาตเฉพาะ role 'admin' ให้ล็อกอินเข้าฝั่งแอดมินได้
        if (res.ok && data.user?.role === 'admin') {
            localStorage.setItem('isLoggedIn', 'true')
            localStorage.setItem('userLicense', data.user.license)
            localStorage.setItem('userRole', data.user.role)
            router.push({ name: 'admin-home' })
        } else {
            errorMessage.value = '❌ ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง หรือไม่มีสิทธิ์ Admin'
        }
    } catch (e) {
        errorMessage.value = '❌ เชื่อมต่อ server ไม่ได้'
    }
}

const goBack = () => router.back()
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

/* ------------------------------------- 
   ส่วนเพิ่มเติมสำหรับไอคอนตารหัสผ่านของแอดมิน 
-------------------------------------- */
.input-wrapper {
    position: relative;
    width: 100%;
}

/* เว้นพื้นที่ฝั่งขวาของช่องกรอกรหัสผ่านเพื่อไม่ให้ตัวหนังสือบังไอคอน */
.input-wrapper .password-input {
    padding-right: 48px;
}

.eye-icon {
    position: absolute;
    right: 16px;
    top: 50%;
    transform: translateY(-50%);
    cursor: pointer;
    color: #9a9a9a;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: color 0.2s ease;
}

.eye-icon:hover {
    color: #001F5B;
    /* เปลี่ยนเป็นสีเดียวกับปุ่มเมื่อ Hover */
}
</style>