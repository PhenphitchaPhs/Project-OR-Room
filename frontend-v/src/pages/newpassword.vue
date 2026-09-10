<template>
    <div class="page">
        <div class="card">

            <img src="../assets/logo.png" class="logo" />

            <h2 class="title">ORchestrator</h2>

            <div class="input-wrap">
                <input :type="showNew ? 'text' : 'password'" v-model="newPassword" placeholder="New Password"
                    class="input" />

                <span class="eye" :class="{ active: showNew }" @click="toggleNew">
                    <svg viewBox="0 0 24 24">
                        <path d="M12 5C5 5 1 12 1 12s4 7 11 7 11-7 11-7-4-7-11-7zm0 11a4 4 0 1 1 0-8 4 4 0 0 1 0 8z" />
                    </svg>
                </span>
            </div>

            <div class="input-wrap">
                <input :type="showConfirm ? 'text' : 'password'" v-model="confirmPassword"
                    placeholder="Confirm Password" class="input" :class="{ error: passwordMismatch }" />

                <span class="eye" :class="{ active: showConfirm }" @click="toggleConfirm">
                    <svg viewBox="0 0 24 24">
                        <path d="M12 5C5 5 1 12 1 12s4 7 11 7 11-7 11-7-4-7-11-7zm0 11a4 4 0 1 1 0-8 4 4 0 0 1 0 8z" />
                    </svg>
                </span>
            </div>

            <p v-if="passwordMismatch" class="error-text">
                Passwords do not match
            </p>

            <button class="btn" @click="confirm" :disabled="isLoading">
                {{ isLoading ? 'Saving...' : 'Confirm' }}
            </button>

            <p v-if="message" class="status-msg" :class="{ success: isSuccess, error: !isSuccess }">
                {{ message }}
            </p>
        </div>
    </div>
</template>

<script setup>
import { ref, computed, onMounted } from "vue";
import { useRouter, useRoute } from "vue-router";
import { apiFetch } from '../api/client'

const router = useRouter();
const route = useRoute();

const newPassword = ref("");
const confirmPassword = ref("");

const showNew = ref(false);
const showConfirm = ref(false);

const isLoading = ref(false);
const message = ref("");
const isSuccess = ref(false);

const token = ref("");

onMounted(() => {
    token.value = route.query.token || "";
    if (!token.value) {
        message.value = "❌ Invalid link. Please use the link from your password reset email.";
        isSuccess.value = false;
    }
});

const toggleNew = () => (showNew.value = !showNew.value);
const toggleConfirm = () => (showConfirm.value = !showConfirm.value);

const passwordMismatch = computed(() => {
    return (
        confirmPassword.value !== "" &&
        newPassword.value !== confirmPassword.value
    );
});

const confirm = async () => {
    if (!token.value) {
        message.value = "❌ Invalid link. Please use the link from your password reset email.";
        isSuccess.value = false;
        return;
    }

    if (!newPassword.value || !confirmPassword.value) {
        message.value = "Please complete the password fields";
        isSuccess.value = false;
        return;
    }

    if (passwordMismatch.value) {
        return;
    }

    isLoading.value = true;
    message.value = "";

    try {
        const response = await apiFetch('/api/reset-password', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ token: token.value, newPassword: newPassword.value })
        });

        const data = await response.json();

        if (!response.ok) throw new Error(data.error || "Something went wrong");

        isSuccess.value = true;
        message.value = "✅ Password reset successfully. Redirecting to login...";

        setTimeout(() => { router.push('/login'); }, 1500);

    } catch (error) {
        isSuccess.value = false;
        message.value = "❌ " + (error.message || "Unable to reset the password");
    } finally {
        isLoading.value = false;
    }
};
</script>

<style scoped>
* {
    box-sizing: border-box;
}

.page {
    height: 100dvh;
    width: 100%;
    overflow: hidden;

    display: flex;
    justify-content: center;
    align-items: flex-start;
    padding-top: 90px;
}

.card {
    width: 100%;
    max-width: 390px;
    padding: 16px;
    text-align: center;
}

.logo {
    width: 90px;
    margin-bottom: 6px;
}

.title {
    color: #2a7de1;
    margin-bottom: 26px;
}

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

.input.error {
    border-color: #ef4444;
    background: #fff1f2;
}

.error-text {
    font-size: 12px;
    color: #ef4444;
    text-align: left;
    margin: 4px 4px 12px;
}

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

.btn:disabled {
    background: #9a9a9a;
    cursor: not-allowed;
}

.status-msg {
    margin-top: 15px;
    font-size: 14px;
    font-weight: 500;
}

.success {
    color: #03c172;
}

.error {
    color: #ef4444;
}
</style>
