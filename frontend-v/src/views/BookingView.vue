<template>
  <div class="page-wrapper">
    <div class="card">
      <h1 class="title">Scheduling a surgery</h1>

      <form @submit.prevent="submitForm">
        
        <div class="section-group">
          <label class="group-label">Patient Information</label>
          <div class="grid-2-col">
            <input type="text" v-model="form.hn" placeholder="HN" class="input-field green-theme" />
            <input type="text" v-model="form.fullName" placeholder="Full Name" class="input-field green-theme" />
            <input type="number" v-model="form.age" placeholder="Age" class="input-field green-theme" />
            <input type="text" v-model="form.disease" placeholder="Underlying Disease(s)" class="input-field green-theme" />
          </div>
        </div>

        <div class="flex-row-desktop">
          <div class="flex-item">
            <label class="group-label">Gender</label>
            <div class="gender-wrapper">
              <label class="gender-box male" :class="{ active: form.gender === 'male' }">
                <input type="radio" value="male" v-model="form.gender" /> Male
              </label>
              <label class="gender-box female" :class="{ active: form.gender === 'female' }">
                <input type="radio" value="female" v-model="form.gender" /> Female
              </label>
            </div>
          </div>

          <div class="flex-item">
            <label class="group-label">Proposed Procedure</label>
            <div class="select-wrapper">
              <select v-model="form.procedure" class="input-field green-theme">
                <option value="" disabled selected>Surgery list</option>
                <option value="surgery1">Appendectomy</option>
                <option value="surgery2">Cataract Surgery</option>
                <option value="surgery3">Hernia Repair</option>
              </select>
            </div>
          </div>
        </div>

        <div class="section-group">
          <label class="group-label">Date</label>
          <input type="date" v-model="form.date" class="input-field green-theme" />
        </div>

        <div class="section-group">
          <label class="group-label">Notes</label>
          <textarea v-model="form.notes" placeholder="Remarks" class="input-field blue-theme textarea-field"></textarea>
        </div>

        <div class="btn-area">
          <button type="submit" class="confirm-btn">Confirm</button>
        </div>

      </form>
    </div>
  </div>
</template>

<script setup>
import { reactive } from 'vue';
import { useRouter } from 'vue-router'; // 1. เพิ่มการ Import useRouter

const router = useRouter(); // 2. สร้างตัวแปรสำหรับใช้งาน router

const form = reactive({
  hn: '', fullName: '', age: '', disease: '',
  gender: 'male', procedure: '', date: '', notes: ''
});

const submitForm = () => {
  // 3. แจ้งเตือน และสั่งให้เปลี่ยนหน้า
  alert('Booking Confirmed!');
  router.push('/'); // เด้งไปหน้า Home (ใช้ path '/')
};
</script>

<style scoped>
/* ส่วน CSS คงเดิมตามที่คุณส่งมาครับ */
.page-wrapper {
  display: flex; justify-content: center; padding: 20px; width: 100%; box-sizing: border-box;
}

.card {
  background: white; width: 100%; max-width: 500px;
  padding: 25px; border-radius: 12px; box-shadow: 0 4px 15px rgba(0,0,0,0.05);
  transition: max-width 0.3s ease;
}

.title { color: #2c4a85; text-align: center; font-size: 24px; margin-bottom: 25px; }
.group-label { display: block; color: #586b8f; margin-bottom: 8px; font-weight: 600; }
.section-group { margin-bottom: 20px; }

.input-field {
  width: 100%; padding: 12px; border-radius: 8px; border: 1px solid transparent;
  margin-bottom: 12px; box-sizing: border-box; font-size: 14px;
}
.green-theme { background: #e0fce9; color: #4a9174; }
.blue-theme { background: #eef6ff; color: #5a8ab3; }
.textarea-field { height: 100px; resize: vertical; }

.gender-wrapper { display: flex; gap: 10px; margin-bottom: 15px; }
.gender-box {
  flex: 1; padding: 10px; text-align: center; border-radius: 8px;
  cursor: pointer; background: #eee; display: flex; align-items: center; justify-content: center; gap: 5px;
}
.gender-box.male { background: #dbeafe; color: #3b5d92; }
.gender-box.female { background: #fce7f3; color: #db4c7e; }

.confirm-btn {
  width: 100%; padding: 14px; background: #6a93cb; color: white;
  border: none; border-radius: 10px; font-size: 16px; cursor: pointer; font-weight: bold;
}

@media (min-width: 1024px) {
  .card { max-width: 1000px; padding: 40px; }
  .grid-2-col { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; }
  .input-field { margin-bottom: 0; }
  .flex-row-desktop { display: flex; gap: 30px; align-items: flex-start; margin-bottom: 20px; }
  .flex-item { flex: 1; }
  .confirm-btn { width: 200px; margin: 0 auto; display: block; }
}
</style>