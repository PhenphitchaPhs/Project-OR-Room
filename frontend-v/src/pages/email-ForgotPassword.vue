<template>
    <div class="page">
        <div class="card">
            <img src="../assets/logo.png" class="logo" />
            <h2 class="title">Hospital</h2>

            <p class="subtitle">
                Enter your email to receive a password reset link.
            </p>

            <input v-model="email" type="email" placeholder="Email" class="input" />
            <button class="back-btn" @click="goBack">
                <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none"
                    stroke="currentColor" stroke-width="4" stroke-linecap="round" stroke-linejoin="round">
                    <polyline points="15 18 9 12 15 6" />
                </svg>
            </button>

            <button class="btn" @click="handleSubmit">
                Confirm
            </button>

        </div>
    </div>
</template>

<script setup>
import { ref } from "vue";
import { useRouter } from "vue-router";

const router = useRouter();
const email = ref("");
const goBack = () => {
    router.replace("/");   // หรือ "/" แล้วแต่ route ของเธอ
};

const handleSubmit = () => {
    if (!email.value) {
        alert("กรุณากรอก Email");
        return;
    }

    alert("ส่งลิงก์รีเซ็ตรหัสผ่านแล้ว");
    router.push("/");
};
</script>

<style scoped>
* {
    box-sizing: border-box;
}

.page {
    height: 100dvh;
    display: flex;
    justify-content: center;
    align-items: flex-start;
    padding-top: 120px;
    background: #f4f7fb;
}

.card {
    width: 100%;
    max-width: 390px;
    text-align: center;
    padding: 24px;

    background: #ffffff;
    border-radius: 24px;
    box-shadow: 0 10px 25px rgba(0, 0, 0, 0.05);
}

.logo {
    width: 90px;
    margin-bottom: 8px;
}

.title {
    color: #001F5B;
    margin-bottom: 18px;
    font-weight: 700;
}

.subtitle {
    font-size: 13px;
    color: #001F5B;
    margin-bottom: 18px;
}

/* Navy Input Style */
.input {
    width: 100%;
    height: 50px;
    padding: 0 16px;
    border-radius: 12px;
    border: 1px solid #ddd;
    background: #ffffff;
    font-size: 15px;
    outline: none;
    margin-bottom: 24px;
    transition: 0.2s ease;
}

.input:focus {
    border: 1.5px solid #001F5B;
    box-shadow: 0 0 8px rgba(0, 31, 91, 0.1);
}

/* Navy Button */
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
}

.back-btn {
    position: absolute;
    top: 20px;
    left: 20px;
    background: none;
    border: none;
    cursor: pointer;
    color: #001F5B;
    padding: 4px;
}

.btn:hover {
    background: #1A3A7C;
}
</style>