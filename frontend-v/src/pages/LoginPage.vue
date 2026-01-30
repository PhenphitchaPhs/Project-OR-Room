<template>
  <div class="page">
    <div class="card">
      <img src="../assets/logo.png" class="logo" />

      <h2 class="title">Hospital</h2>

      <input v-model="license" placeholder="License" class="input" />
      <input v-model="password" type="password" placeholder="Password" class="input" />

      <div class="links">
        <span>Admin mode</span>
        <span class="divider">|</span>

        <span class="link" @click="$emit('go-forgot')">
          Forgot password
        </span>



        <span class="divider">|</span>
        <span>Sign up</span>
      </div>


      <button class="btn" @click="login">Log in</button>
    </div>
  </div>
</template>

<script setup>
import { ref } from "vue";

const license = ref("");
const password = ref("");

const login = () => {
  if (!license.value || !password.value) {
    alert("กรุณากรอก License และ Password");
    return;
  }
  alert("Login (demo)");
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

  padding-top: 100px;
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
  margin-bottom: 24px;
}

.input {
  width: 100%;
  padding: 14px;
  margin-bottom: 16px;
  border-radius: 10px;
  border: 1px solid #b8f1c9;
  background: #eafff1;
}

.link {
  color: #2a7de1;
  text-decoration: none;
  cursor: pointer;
}

.link:hover {
  text-decoration: none;
}

.links a {
  text-decoration: none;
  color: #2a7de1;
}

.links a:hover {
  text-decoration: none;
}




.links {
  font-size: 12px;
  color: #2a7de1;
  margin-bottom: 22px;
}

.divider {
  margin: 0 6px;
}

.btn {
  width: 200px;
  padding: 14px;
  border-radius: 14px;
  border: none;
  background: #6c95d9;
  color: white;
  font-size: 16px;
  font-weight: 500;

  display: block;
  margin: 0 auto;
}
</style>
