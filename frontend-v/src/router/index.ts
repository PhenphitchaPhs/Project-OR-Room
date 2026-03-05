import { createRouter, createWebHistory } from 'vue-router'

// ===== User Pages (ดึงจากโฟลเดอร์ views ตามในรูป) =====
import HomeView from '../views/HomeView.vue'
import CalendarView from '../views/CalendarView.vue'
import BookingView from '../views/BookingView.vue'

// ===== Authentication Pages (ดึงจากโฟลเดอร์ pages) =====
// หมายเหตุ: เช็กชื่อไฟล์ LoginPage.vue อีกครั้งนะครับว่าตัวพิมพ์เล็ก/ใหญ่ตรงกันไหม (ผมยึดตาม git status ก่อนหน้านี้)
import LoginPages from '../pages/LoginPage.vue' 
import ForgotPassword from '../pages/email-ForgotPassword.vue'
import SignUp from '../pages/signup.vue'

// ===== Admin Pages (ดึงจากโฟลเดอร์ views/admin ตามในรูป) =====
import LoginAdmin from '../views/admin/loginAdmin.vue'
import AdminHome from '../views/admin/AdminHome.vue'
import ChooseDoctorAdmin from '../views/admin/ChooseDoctorAdmin.vue'
import AddPatientByAdmin from '../views/admin/AddPatientByAdmin.vue'

const routes = [
  {
    path: '/',
    redirect: '/login'
  },

  // ---------- USER ----------
  {
    path: '/login',
    name: 'login',
    component: LoginPages
  },
  {
    path: '/signup',
    name: 'signup',
    component: SignUp
  },
  {
    path: '/forgot-password',
    name: 'forgot-password',
    component: ForgotPassword
  },
  {
    path: '/home',
    name: 'home',
    component: HomeView,
    meta: { requiresAuth: true }
  },
  {
    path: '/booking',
    name: 'booking',
    component: BookingView,
    meta: { requiresAuth: true }
  },
  {
    path: '/calendar',
    name: 'calendar',
    component: CalendarView,
    meta: { requiresAuth: true }
  },

  // ---------- ADMIN ----------
  {
    path: '/admin-login',
    name: 'admin-login',
    component: LoginAdmin
  },
  {
    path: '/admin-home',
    name: 'admin-home',
    component: AdminHome
  },
  {
    path: '/choose-doctor',
    name: 'choose-doctor',
    component: ChooseDoctorAdmin
  },
  {
    path: '/admin-add-patient',
    name: 'admin-add-patient',
    component: AddPatientByAdmin
  }
]


const router = createRouter({
  history: createWebHistory(),
  routes
})

/* 🔐 Navigation Guard (เฉพาะ user) */
router.beforeEach((to, from, next) => {
  const isLoggedIn = localStorage.getItem('isLoggedIn') === 'true'

  if (to.meta.requiresAuth && !isLoggedIn) {
    next('/login')
  } else {
    next()
  }
})

export default router