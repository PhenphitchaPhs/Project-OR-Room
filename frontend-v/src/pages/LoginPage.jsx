<template>
  <div class="page-bg">
    <div class="container">
      <div class="card">
        <h1 class="title">Scheduling a surgery</h1>

        <form @submit.prevent="submitForm">
          
          <div class="section-group">
            <h3 class="section-label">Patient Information</h3>
            <div class="grid-2-col">
              <input type="text" v-model="form.hn" placeholder="HN" class="input-field green-theme" />
              <input type="text" v-model="form.fullName" placeholder="Full Name" class="input-field green-theme" />
              <input type="number" v-model="form.age" placeholder="Age" class="input-field green-theme" />
              <input type="text" v-model="form.disease" placeholder="Underlying Disease(s)" class="input-field green-theme" />
            </div>
          </div>

          <div class="flex-row-desktop">
            
            <div class="flex-item">
              <h3 class="section-label">Gender</h3>
              <div class="gender-group">
                <label class="gender-box male" :class="{ active: form.gender === 'male' }">
                  <input type="radio" value="male" v-model="form.gender" />
                  <span>Male</span>
                </label>
                <label class="gender-box female" :class="{ active: form.gender === 'female' }">
                  <input type="radio" value="female" v-model="form.gender" />
                  <span>Female</span>
                </label>
              </div>
            </div>

            <div class="flex-item">
              <h3 class="section-label">Proposed Procedure</h3>
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
            <h3 class="section-label">Date</h3>
            <input type="date" v-model="form.date" class="input-field green-theme date-input" />
          </div>

          <div class="section-group">
            <h3 class="section-label">Notes</h3>
            <textarea v-model="form.notes" placeholder="Remarks" class="input-field blue-theme textarea-field"></textarea>
          </div>

          <div class="action-bar">
            <button type="submit" class="confirm-btn">Confirm</button>
          </div>

        </form>
      </div>
    </div>
  </div>
</template>

<script setup>
import { reactive } from 'vue';

const form = reactive({
  hn: '',
  fullName: '',
  age: '',
  disease: '',
  gender: 'male',
  procedure: '',
  date: '',
  notes: ''
});

const submitForm = () => {
  console.log('Form Submitted:', form);
  alert('Booking Confirmed!');
};
</script>

<style scoped>
/* --- 1. โครงสร้างพื้นฐาน (Mobile First) --- */
.page-bg {
  background-color: #f4f4f4;
  min-height: 100vh;
  display: flex;
  justify-content: center;
  padding: 20px;
  box-sizing: border-box;
}

.container {
  width: 100%;
  display: flex;
  justify-content: center;
}

/* Card: เริ่มต้นแบบมือถือ (เต็มจอ) แต่ขยายได้เมื่อจอใหญ่ */
.card {
  background: white;
  width: 100%;
  max-width: 900px; /* จุดสำคัญ: จำกัดความกว้างสูงสุดเมื่ออยู่บนจอคอม */
  padding: 30px;
  border-radius: 12px;
  box-shadow: 0 4px 15px rgba(0,0,0,0.05);
  box-sizing: border-box;
}

/* Typography */
.title {
  color: #2c4a85;
  text-align: center;
  font-size: 24px;
  font-weight: 700;
  margin-bottom: 30px;
}

.section-label {
  color: #586b8f;
  font-size: 16px;
  font-weight: 600;
  margin: 0 0 10px 0;
}

.section-group {
  margin-bottom: 25px;
}

/* Input Styles */
.input-field {
  width: 100%;
  padding: 12px 15px;
  border-radius: 8px;
  outline: none;
  font-size: 15px;
  box-sizing: border-box; /* สำคัญ: ให้ padding รวมอยู่ใน width */
  margin-bottom: 15px;
  transition: all 0.2s;
}

.input-field:focus {
  transform: translateY(-2px);
  box-shadow: 0 4px 8px rgba(0,0,0,0.05);
}

.green-theme {
  background-color: #e0fce9;
  color: #4a9174;
  border: 1px solid #c8ebd6;
}
.green-theme::placeholder { color: #8bcfa8; }

.blue-theme {
  background-color: #eef6ff;
  color: #5a8ab3;
  border: 1px solid #dae9f7;
}
.textarea-field {
  height: 100px;
  resize: vertical;
}

/* Gender Styles */
.gender-group {
  display: flex;
  gap: 15px;
}
.gender-box {
  flex: 1; /* ยืดเต็ม */
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 10px;
  border-radius: 8px;
  cursor: pointer;
  font-weight: 500;
  transition: opacity 0.2s;
}
.gender-box input { margin-right: 8px; }
.male { background-color: #dbeafe; color: #3b5d92; }
.female { background-color: #fce7f3; color: #db4c7e; }

/* Button */
.action-bar {
  display: flex;
  justify-content: center;
  margin-top: 20px;
}
.confirm-btn {
  background-color: #6a93cb;
  color: white;
  border: none;
  padding: 14px 0;
  width: 100%; /* มือถือปุ่มเต็มจอ */
  border-radius: 10px;
  font-size: 18px;
  font-weight: 600;
  cursor: pointer;
  transition: background 0.2s;
}
.confirm-btn:hover { background-color: #567bb0; }

/* Custom Select Arrow */
select.input-field {
  appearance: none;
  background-image: url("data:image/svg+xml;charset=US-ASCII,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%22292.4%22%20height%3D%22292.4%22%3E%3Cpath%20fill%3D%22%234a9174%22%20d%3D%22M287%2069.4a17.6%2017.6%200%200%200-13-5.4H18.4c-5%200-9.3%201.8-12.9%205.4A17.6%2017.6%200%200%200%200%2082.2c0%205%201.8%209.3%205.4%2012.9l128%20127.9c3.6%203.6%207.8%205.4%2012.8%205.4s9.2-1.8%2012.8-5.4L287%2095c3.5-3.5%205.4-7.8%205.4-12.8%200-5-1.9-9.2-5.5-12.8z%22%2F%3E%3C%2Fsvg%3E");
  background-repeat: no-repeat;
  background-position: right 15px top 50%;
  background-size: 12px auto;
}

/* ==============================================
   MEDIA QUERIES (ส่วนสำคัญที่ทำให้ปรับตามจอ)
   ============================================== */

/* เมื่อหน้าจอกว้างกว่า 768px (Tablet & Desktop) */
@media (min-width: 768px) {
  
  .card {
    padding: 50px; /* เพิ่ม Padding ให้ดูโปร่งขึ้นบนจอใหญ่ */
  }

  .title {
    font-size: 32px;
    margin-bottom: 40px;
  }

  /* 1. เปลี่ยน Input ให้เป็น Grid 2 คอลัมน์ */
  .grid-2-col {
    display: grid;
    grid-template-columns: 1fr 1fr; /* แบ่งครึ่ง 50/50 */
    gap: 20px; /* ช่องว่างระหว่าง Input */
  }
  
  .input-field {
    margin-bottom: 0; /* ลบ margin เพราะ Grid มี gap แล้ว */
  }

  /* 2. เปลี่ยน Gender และ Procedure ให้เรียงแนวนอน */
  .flex-row-desktop {
    display: flex;
    gap: 30px; /* ระยะห่างระหว่าง 2 กล่อง */
    margin-bottom: 25px;
  }

  .flex-item {
    flex: 1; /* ยืดให้เต็ม 50% ของพื้นที่ */
  }

  /* ปุ่มกด */
  .confirm-btn {
    width: auto; /* ไม่ต้องเต็มจอ */
    padding: 14px 80px; /* กำหนดความกว้างปุ่มเอง */
  }
}
</style>  background-color: #f4f4f4;
  min-height: 100vh;
  display: flex;
  justify-content: center;
  padding: 20px;
  box-sizing: border-box;
}

.container {
  width: 100%;
  display: flex;
  justify-content: center;
}

/* Card: เริ่มต้นแบบมือถือ (เต็มจอ) แต่ขยายได้เมื่อจอใหญ่ */
.card {
  background: white;
  width: 100%;
  max-width: 900px; /* จุดสำคัญ: จำกัดความกว้างสูงสุดเมื่ออยู่บนจอคอม */
  padding: 30px;
  border-radius: 12px;
  box-shadow: 0 4px 15px rgba(0,0,0,0.05);
  box-sizing: border-box;
}

/* Typography */
.title {
  color: #2c4a85;
  text-align: center;
  font-size: 24px;
  font-weight: 700;
  margin-bottom: 30px;
}

.section-label {
  color: #586b8f;
  font-size: 16px;
  font-weight: 600;
  margin: 0 0 10px 0;
}

.section-group {
  margin-bottom: 25px;
}

/* Input Styles */
.input-field {
  width: 100%;
  padding: 12px 15px;
  border-radius: 8px;
  outline: none;
  font-size: 15px;
  box-sizing: border-box; /* สำคัญ: ให้ padding รวมอยู่ใน width */
  margin-bottom: 15px;
  transition: all 0.2s;
}

.input-field:focus {
  transform: translateY(-2px);
  box-shadow: 0 4px 8px rgba(0,0,0,0.05);
}

.green-theme {
  background-color: #e0fce9;
  color: #4a9174;
  border: 1px solid #c8ebd6;
}
.green-theme::placeholder { color: #8bcfa8; }

.blue-theme {
  background-color: #eef6ff;
  color: #5a8ab3;
  border: 1px solid #dae9f7;
}
.textarea-field {
  height: 100px;
  resize: vertical;
}

/* Gender Styles */
.gender-group {
  display: flex;
  gap: 15px;
}
.gender-box {
  flex: 1; /* ยืดเต็ม */
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 10px;
  border-radius: 8px;
  cursor: pointer;
  font-weight: 500;
  transition: opacity 0.2s;
}
.gender-box input { margin-right: 8px; }
.male { background-color: #dbeafe; color: #3b5d92; }
.female { background-color: #fce7f3; color: #db4c7e; }

/* Button */
.action-bar {
  display: flex;
  justify-content: center;
  margin-top: 20px;
}
.confirm-btn {
  background-color: #6a93cb;
  color: white;
  border: none;
  padding: 14px 0;
  width: 100%; /* มือถือปุ่มเต็มจอ */
  border-radius: 10px;
  font-size: 18px;
  font-weight: 600;
  cursor: pointer;
  transition: background 0.2s;
}
.confirm-btn:hover { background-color: #567bb0; }

/* Custom Select Arrow */
select.input-field {
  appearance: none;
  background-image: url("data:image/svg+xml;charset=US-ASCII,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%22292.4%22%20height%3D%22292.4%22%3E%3Cpath%20fill%3D%22%234a9174%22%20d%3D%22M287%2069.4a17.6%2017.6%200%200%200-13-5.4H18.4c-5%200-9.3%201.8-12.9%205.4A17.6%2017.6%200%200%200%200%2082.2c0%205%201.8%209.3%205.4%2012.9l128%20127.9c3.6%203.6%207.8%205.4%2012.8%205.4s9.2-1.8%2012.8-5.4L287%2095c3.5-3.5%205.4-7.8%205.4-12.8%200-5-1.9-9.2-5.5-12.8z%22%2F%3E%3C%2Fsvg%3E");
  background-repeat: no-repeat;
  background-position: right 15px top 50%;
  background-size: 12px auto;
}

/* ==============================================
   MEDIA QUERIES (ส่วนสำคัญที่ทำให้ปรับตามจอ)
   ============================================== */

/* เมื่อหน้าจอกว้างกว่า 768px (Tablet & Desktop) */
@media (min-width: 768px) {
  
  .card {
    padding: 50px; /* เพิ่ม Padding ให้ดูโปร่งขึ้นบนจอใหญ่ */
  }

  .title {
    font-size: 32px;
    margin-bottom: 40px;
  }

  /* 1. เปลี่ยน Input ให้เป็น Grid 2 คอลัมน์ */
  .grid-2-col {
    display: grid;
    grid-template-columns: 1fr 1fr; /* แบ่งครึ่ง 50/50 */
    gap: 20px; /* ช่องว่างระหว่าง Input */
  }
  
  .input-field {
    margin-bottom: 0; /* ลบ margin เพราะ Grid มี gap แล้ว */
  }

  /* 2. เปลี่ยน Gender และ Procedure ให้เรียงแนวนอน */
  .flex-row-desktop {
    display: flex;
    gap: 30px; /* ระยะห่างระหว่าง 2 กล่อง */
    margin-bottom: 25px;
  }

  .flex-item {
    flex: 1; /* ยืดให้เต็ม 50% ของพื้นที่ */
  }

  /* ปุ่มกด */
  .confirm-btn {
    width: auto; /* ไม่ต้องเต็มจอ */
    padding: 14px 80px; /* กำหนดความกว้างปุ่มเอง */
  }
}
</style>