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
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import logo from '../../assets/logo.png'
import { apiPost, setToken, clearSession, SESSION_EXPIRED_KEY } from '../../api/client'

const router = useRouter()
const name = ref('')
const password = ref('')
const showPassword = ref(false)
const errorMessage = ref('')

onMounted(() => {
    const expired = sessionStorage.getItem(SESSION_EXPIRED_KEY)
    if (expired) {
        sessionStorage.removeItem(SESSION_EXPIRED_KEY)
        errorMessage.value = expired
    }
})

const handleLogin = async () => {
    errorMessage.value = ''
    if (!name.value || !password.value) {
        errorMessage.value = 'Please complete all fields'
        return
    }
    try {
        const data = await apiPost('/api/login', {
            license: name.value,
            password: password.value
        }, { skipAuth: true })

        if (data.user?.role !== 'admin') {
            errorMessage.value = '❌ Invalid username/password or insufficient Admin privileges'
            return
        }

        clearSession()
        setToken(data.token)

        localStorage.setItem('isLoggedIn', 'true')
        localStorage.setItem('userLicense', data.user.license)
        localStorage.setItem('userRole', data.user.role)
        router.push({ name: 'admin-home' })
    } catch (e) {

        errorMessage.value = '❌ Invalid username/password or insufficient Admin privileges'
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

    font-size: 22px;
    font-weight: 700;
    margin: 0;
}

.login-form {
    display: flex;
    flex-direction: column;
    width: 100%;
    gap: 16px;

}

.custom-input {
    width: 100%;
    padding: 16px;
    border-radius: 8px;
    border: 1px solid #c0c0c0;

    background-color: hsl(0, 0%, 100%);

    color: #000000;

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

.login-button {
    width: 100%;
    padding: 16px;
    margin-top: 20px;
    border-radius: 12px;
    border: none;
    background-color: #001F5B;

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

.input-wrapper {
    position: relative;
    width: 100%;
}

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

}
</style>
