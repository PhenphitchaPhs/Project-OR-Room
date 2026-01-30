<template>
    <div class="page">
        <div class="card">
            <!-- logo -->
            <img src="../assets/logo.png" class="logo" />


            <!-- title -->
            <h2 class="title">Hospital</h2>

            <!-- description -->
            <p class="desc">
                *Enter your email to receive a password reset link.
            </p>

            <!-- email -->
            <input v-model="email" type="email" placeholder="Email" class="input" />

            <!-- button -->
            <button class="btn" @click="submit">Confirm</button>

            <!-- back -->
            <router-link to="/" class="back">
                Back to Login
            </router-link>
        </div>
    </div>
</template>

<script setup>
import { ref } from "vue";

const emit = defineEmits(["next"]);
const email = ref("");

const submit = () => {
    if (!email.value) {
        alert("กรุณากรอก Email");
        return;
    }

    emit("next"); // เด้งหน้าได้ แต่ยังไม่ได้เชื่อแบ้กเอน
};
</script>


<style scoped>
* {
    box-sizing: border-box;
}

/* ทั้งหน้าจอ ไม่เลื่อน */
.page {
    height: 100dvh;
    width: 100%;
    overflow: hidden;

    display: flex;
    justify-content: center;
    align-items: flex-start;

    padding-top: 90px;
    /* ขยับขึ้นเล็กน้อย */
}

/* การ์ดกลางจอ */
.card {
    width: 100%;
    max-width: 390px;
    /* iPhone 14 Pro Max */
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
    margin-bottom: 16px;
}

/* description */
.desc {
    font-size: 13px;
    color: #2a7de1;
    margin-bottom: 16px;
}

/* input */
.input {
    width: 100%;
    padding: 14px;
    margin-bottom: 24px;
    border-radius: 12px;
    border: 1px solid #b8f1c9;
    background: #eafff1;
    font-size: 14px;
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
    margin: 0 auto 16px;
}

/* back link */
.back {
    font-size: 13px;
    color: #2a7de1;
    text-decoration: none;
}

.back:hover {
    text-decoration: underline;
}
</style>
