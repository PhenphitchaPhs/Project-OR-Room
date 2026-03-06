import { createRouter, createWebHistory } from 'vue-router'

// ===== User Pages =====
import HomeView from '../views/HomeView.vue'
import CalendarView from '../views/CalendarView.vue'
import BookingView from '../views/BookingView.vue'

// ===== Authentication Pages =====
import LoginPages from '../pages/LoginPage.vue' 
import ForgotPassword from '../pages/email-ForgotPassword.vue'
import SignUp from '../pages/signup.vue'

// ===== Admin Pages =====
import LoginAdmin from '../views/admin/loginAdmin.vue'
import AdminHome from '../views/admin/AdminHome.vue'
import ChooseDoctorAdmin from '../views/admin/ChooseDoctorAdmin.vue'
import AddPatientByAdmin from '../views/admin/AddPatientByAdmin.vue'

const routes = [
  { path: '/', redirect: '/login' },

  // ---------- USER (ไม่ต้องใช้ Role Admin) ----------
  { path: '/login', name: 'login', component: LoginPages },
  { path: '/signup', name: 'signup', component: SignUp },
  { path: '/forgot-password', name: 'forgot-password', component: ForgotPassword },
  { path: '/home', name: 'home', component: HomeView, meta: { requiresAuth: true } },
  { path: '/booking', name: 'booking', component: BookingView, meta: { requiresAuth: true } },
  { path: '/calendar', name: 'calendar', component: CalendarView, meta: { requiresAuth: true } },

  // ---------- ADMIN (ต้องล็อกอิน และต้องเป็น Admin เท่านั้น) ----------
  { path: '/admin-login', name: 'admin-login', component: LoginAdmin }, // หน้าล็อกอินแอดมินไม่ต้องล็อก
  { 
    path: '/admin-home', 
    name: 'admin-home', 
    component: AdminHome,
    meta: { requiresAuth: true, role: 'admin' } 
  },
  { 
    path: '/choose-doctor', 
    name: 'choose-doctor', 
    component: ChooseDoctorAdmin,
    meta: { requiresAuth: true, role: 'admin' } 
  },
  { 
    path: '/admin-add-patient', 
    name: 'admin-add-patient', 
    component: AddPatientByAdmin,
    meta: { requiresAuth: true, role: 'admin' } 
  }
]

const router = createRouter({
  history: createWebHistory(),
  routes
})

/* 🔐 ยามรักษาความปลอดภัย (Navigation Guard) */
router.beforeEach((to, from, next) => {
  const isLoggedIn = localStorage.getItem('isLoggedIn') === 'true'
  const userRole = localStorage.getItem('userRole') // ดึง Role ในเครื่องมาเช็ก

  // 🛑 กฎข้อ 0: ถ้าล็อกอินอยู่แล้ว แต่พยายามจะเปิดหน้า Login/Signup ให้เด้งไปหน้า Home เลย
  const publicAuthPages = ['/login', '/signup', '/admin-login']
  if (publicAuthPages.includes(to.path) && isLoggedIn) {
    if (userRole === 'admin') {
      return next('/admin-home')
    } else {
      return next('/home')
    }
  }

  // 🛑 กฎข้อ 1: ถ้าหน้าไหนต้องล็อกอิน แต่ยังไม่ได้ล็อกอิน -> เตะไปหน้า Login
  if (to.meta.requiresAuth && !isLoggedIn) {
    return next('/login')
  } 
  
  // 🛑 กฎข้อ 2: ถ้าหน้าไหนต้องการสิทธิ์ 'admin' แต่คนล็อกอินเข้ามาไม่ใช่ admin -> เตะกลับหน้า Home
  if (to.meta.role === 'admin' && userRole !== 'admin') {
    alert('❌ คุณไม่มีสิทธิ์เข้าถึงหน้า Admin!')
    return next('/home')
  } 
  
  // 🟢 กฎข้อ 3: ถ้าถูกต้องหมด -> ปล่อยผ่าน
  next()
})

export default router