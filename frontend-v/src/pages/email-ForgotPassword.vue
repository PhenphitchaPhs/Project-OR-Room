<template>
    <div class="page">
        <div class="card">
            <img src="../assets/logo.png" class="logo" />
            <h2 class="title">Hospital</h2>

            <p class="subtitle">
                Enter your email to receive a password reset link.
            </p>

            <input v-model="email" type="email" placeholder="Email Address" class="input" />
            <button class="back-btn" @click="goBack">
                <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none"
                    stroke="currentColor" stroke-width="4" stroke-linecap="round" stroke-linejoin="round">
                    <polyline points="15 18 9 12 15 6" />
                </svg>
            </button>

            <button class="btn" @click="handleSubmit" :disabled="isLoading">
                {{ isLoading ? 'Checking...' : 'Confirm' }}
            </button>
            
            <p v-if="message" class="status-msg" :class="{ success: isSuccess, error: !isSuccess }">
                {{ message }}
            </p>
        </div>
    </div>
</template>

<script setup>
import { ref } from "vue";
import { useRouter } from "vue-router";

const router = useRouter();
const email = ref("");
const isLoading = ref(false);
const message = ref("");
const isSuccess = ref(false);

const goBack = () => { router.replace("/"); };

const handleSubmit = async () => {
    if (!email.value) {
        message.value = "กรุณากรอก Email";
        isSuccess.value = false;
        return;
    }

    isLoading.value = true;
    message.value = "";

    try {
        const response = await fetch('https://or-room-backend.rockzee2018.workers.dev/api/forgot-password', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: email.value })
        });

        const data = await response.json();

        if (response.ok) {
            isSuccess.value = true;
            message.value = "✅ พบอีเมลในระบบ (Demo Mode)";
            
            // 💡 เด้ง Alert แจ้งอาจารย์ พร้อมลิงก์ไปตั้งรหัสใหม่
            setTimeout(() => {
                if (confirm("🚨 [Demo Mode] \nเนื่องจากข้อจำกัดของระบบส่งอีเมลฟรี ในระบบจริงลิงก์จะถูกส่งไปยัง " + email.value + " \n\nคลิก OK เพื่อจำลองการกดลิงก์จากในอีเมลครับ")) {
                    // พาอาจารย์วาร์ปไปหน้าตั้งรหัสใหม่
                    window.location.href = data.demoLink;
                }
            }, 500);

        } else {
            throw new Error(data.error || "เกิดข้อผิดพลาด");
        }
    } catch (error) {
        isSuccess.value = false;
        message.value = "❌ " + error.message;
    } finally {
        isLoading.value = false;
    }
};
</script>

<style scoped>
* { box-sizing: border-box; }
.page { height: 100dvh; display: flex; justify-content: center; align-items: flex-start; padding-top: 120px; background: #f4f7fb; }
.card { width: 100%; max-width: 390px; text-align: center; padding: 24px; background: #ffffff; border-radius: 24px; box-shadow: 0 10px 25px rgba(0, 0, 0, 0.05); }
.logo { width: 90px; margin-bottom: 8px; }
.title { color: #001F5B; margin-bottom: 18px; font-weight: 700; }
.subtitle { font-size: 13px; color: #001F5B; margin-bottom: 18px; }
.input { width: 100%; height: 50px; padding: 0 16px; border-radius: 12px; border: 1px solid #ddd; background: #ffffff; font-size: 15px; outline: none; margin-bottom: 24px; transition: 0.2s ease; }
.input:focus { border: 1.5px solid #001F5B; box-shadow: 0 0 8px rgba(0, 31, 91, 0.1); }
.btn { width: 100%; padding: 14px; border-radius: 14px; border: none; background: #001F5B; color: white; font-size: 16px; font-weight: 600; cursor: pointer; transition: 0.2s ease; }
.btn:disabled { background: #9a9a9a; cursor: not-allowed; }
.back-btn { position: absolute; top: 20px; left: 20px; background: none; border: none; cursor: pointer; color: #001F5B; padding: 4px; }
.btn:hover:not(:disabled) { background: #1A3A7C; }
.status-msg { margin-top: 15px; font-size: 14px; font-weight: 500; }
.success { color: #03c172; }
.error { color: #d50000; }
</style>