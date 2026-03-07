<template>
    <div class="page-wrapper">
        <div class="logo-section">
            <img src="https://via.placeholder.com/100x100.png?text=Logo" alt="Hospital Logo" class="logo-img" />
            <h1 class="logo-text">Hospital</h1>
        </div>

        <div class="doctor-card">
            <h2 class="card-title">Choose a doctor</h2>

            <div class="doctor-list">
                <div v-for="doctor in doctors" :key="doctor.id" class="doctor-item">
                    <label class="doctor-label">
                        <span class="doctor-name">{{ doctor.name }}</span>
                        <input type="checkbox" v-model="selectedDoctors" :value="doctor.id" class="custom-checkbox" />
                    </label>
                </div>
            </div>

            <div class="button-container">
                <button class="confirm-button" @click="handleConfirm">Confirm</button>
            </div>
        </div>
    </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'

const router = useRouter()

// ข้อมูลรายชื่อหมอ (สามารถเพิ่มหรือแก้ไขตรงนี้ได้)
const doctors = ref([
    { id: 1, name: 'Dr. Piriya Srisuwan' },
    { id: 2, name: 'Dr. Somsak Pitak' },
    { id: 3, name: 'Dr. Siriporn Techawong' },
    { id: 4, name: 'Dr. Narongdej Ruangrit' },
    { id: 5, name: 'Dr. Malee Jaroensuk' },
])

// ตัวแปรเก็บ id ของหมอที่เราเลือก (เป็น Array เพราะเลือกได้หลายคน)
const selectedDoctors = ref([])

const handleConfirm = () => {
    if (selectedDoctors.value.length === 0) {
        alert('Please choose at least one doctor.')
        return
    }
    console.log('Selected Doctors ID:', selectedDoctors.value)
    // เมื่อกด Confirm ให้ไปหน้าต่อไป (ตัวอย่างเช่นกลับไปหน้า Dashboard)
    router.push('/dashboard')
}
</script>

<style scoped>
.page-wrapper {
    display: flex;
    flex-direction: column;
    align-items: center;
    min-height: 100vh;
    background-color: #ffffff;
    padding-top: 40px;
    font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
}

/* ส่วนโลโก้ */
.logo-section {
    display: flex;
    flex-direction: column;
    align-items: center;
    margin-bottom: 30px;
}

.logo-img {
    width: 80px;
    height: auto;
}

.logo-text {
    color: #0088cc;
    font-size: 20px;
    font-weight: 700;
    margin-top: 5px;
}

/* การ์ดสีฟ้า */
.doctor-card {
    background-color: #e0f2ff;
    /* สีฟ้าอ่อนตามแบบ */
    width: 90%;
    max-width: 360px;
    border-radius: 20px;
    padding: 30px 25px;
    box-shadow: 0 4px 10px rgba(0, 0, 0, 0.05);
}

.card-title {
    color: #2e5088;
    /* สีน้ำเงินเข้ม */
    text-align: center;
    font-size: 24px;
    margin-bottom: 30px;
}

/* รายชื่อหมอ */
.doctor-list {
    display: flex;
    flex-direction: column;
    gap: 20px;
    margin-bottom: 40px;
}

.doctor-label {
    display: flex;
    justify-content: space-between;
    align-items: center;
    cursor: pointer;
    width: 100%;
}

.doctor-name {
    color: #5c7fb8;
    /* สีน้ำเงินสว่าง */
    font-size: 18px;
}

/* ช่องติ๊กถูก (Checkbox) */
.custom-checkbox {
    width: 20px;
    height: 20px;
    border: 2px solid #2e5088;
    border-radius: 4px;
    cursor: pointer;
}

/* ปุ่ม Confirm */
.button-container {
    display: flex;
    justify-content: flex-end;
    /* จัดปุ่มไปทางขวาตามแบบ */
}

.confirm-button {
    background-color: #2e5088;
    color: white;
    border: none;
    padding: 10px 25px;
    border-radius: 12px;
    font-size: 16px;
    cursor: pointer;
    transition: background-color 0.2s;
}

.confirm-button:hover {
    background-color: #1e3a63;
}
</style>