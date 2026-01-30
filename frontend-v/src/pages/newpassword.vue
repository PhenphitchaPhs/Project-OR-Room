<template>
    <div class="page">
        <div class="card">
            <!-- logo -->
            <img src="../assets/logo.png" class="logo" />

            <h2 class="title">Hospital</h2>

            <!-- new password -->
            <div class="input-wrap">
                <input :type="showNew ? 'text' : 'password'" v-model="newPassword" placeholder="New Password"
                    class="input" />

                <span class="eye" :class="{ active: showNew }" @click="toggleNew">
                    <svg viewBox="0 0 24 24">
                        <path d="M12 5C5 5 1 12 1 12s4 7 11 7 11-7 11-7-4-7-11-7zm0 11a4 4 0 1 1 0-8 4 4 0 0 1 0 8z" />
                    </svg>
                </span>
            </div>

            <!-- confirm password -->
            <div class="input-wrap">
                <input :type="showConfirm ? 'text' : 'password'" v-model="confirmPassword"
                    placeholder="Confirm Password" class="input" :class="{ error: passwordMismatch }" />

                <span class="eye" :class="{ active: showConfirm }" @click="toggleConfirm">
                    <svg viewBox="0 0 24 24">
                        <path d="M12 5C5 5 1 12 1 12s4 7 11 7 11-7 11-7-4-7-11-7zm0 11a4 4 0 1 1 0-8 4 4 0 0 1 0 8z" />
                    </svg>
                </span>
            </div>

            <!-- error text -->
            <p v-if="passwordMismatch" class="error-text">
                รหัสผ่านไม่ตรงกัน
            </p>

            <!-- button -->
            <button class="btn" @click="confirm">
                confirm
            </button>
        </div>
    </div>
</template>

<script setup>
import { ref, computed } from "vue";

const newPassword = ref("");
const confirmPassword = ref("");

const showNew = ref(false);
const showConfirm = ref(false);

const toggleNew = () => (showNew.value = !showNew.value);
const toggleConfirm = () => (showConfirm.value = !showConfirm.value);

/* ✅ เช็กเฉพาะตอนเริ่มกรอกช่องที่สองแล้ว */
const passwordMismatch = computed(() => {
    return (
        confirmPassword.value !== "" &&
        newPassword.value !== confirmPassword.value
    );
});

const confirm = () => {
    if (!newPassword.value || !confirmPassword.value) {
        alert("กรุณากรอกรหัสผ่านให้ครบ");
        return;
    }

    if (passwordMismatch.value) {
        return; // ไม่ให้ผ่าน
    }

    alert("Reset password (demo)");
};
</script>

<style scoped>
* {
    box-sizing: border-box;
}

/* หน้าไม่เลื่อน */
.page {
    height: 100dvh;
    width: 100%;
    overflow: hidden;

    display: flex;
    justify-content: center;
    align-items: flex-start;
    padding-top: 90px;
}

/* card */
.card {
    width: 100%;
    max-width: 390px;
    padding: 16px;
    text-align: center;
}

/* logo */
.logo {
    width: 90px;
    margin-bottom: 6px;
}

/* title */
.title {
    color: #2a7de1;
    margin-bottom: 26px;
}

/* input */
.input-wrap {
    position: relative;
    margin-bottom: 14px;
}

.input {
    width: 100%;
    padding: 14px 46px 14px 14px;
    border-radius: 12px;
    border: 1px solid #b8f1c9;
    background: #eafff1;
    font-size: 14px;
}

/* ❌ error input */
.input.error {
    border-color: #ef4444;
    background: #fff1f2;
}

/* error text */
.error-text {
    font-size: 12px;
    color: #ef4444;
    text-align: left;
    margin: 4px 4px 12px;
}

/* eye icon */
.eye {
    position: absolute;
    right: 14px;
    top: 50%;
    transform: translateY(-50%) scale(1);
    cursor: pointer;
    transition: transform 0.2s ease, opacity 0.2s ease;
    opacity: 0.5;
}

.eye.active {
    transform: translateY(-50%) scale(1.15);
    opacity: 1;
}

.eye svg {
    width: 22px;
    height: 22px;
    fill: #2a7de1;
}

/* button */
.btn {
    width: 220px;
    padding: 14px;
    border-radius: 16px;
    border: none;
    background: #6c95d9;
    color: white;
    font-size: 16px;
    font-weight: 500;

    display: block;
    margin: 8px auto 0;
}
</style>
