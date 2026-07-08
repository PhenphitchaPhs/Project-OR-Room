import { createRouter, createWebHistory } from 'vue-router'

// ===== User Pages =====
import HomeView from '../views/HomeView.vue'
import CalendarView from '../views/CalendarView.vue'
import BookingView from '../views/BookingView.vue'

// ===== Authentication Pages =====
import LoginPages from '../pages/LoginPage.vue' 
import ForgotPassword from '../pages/email-ForgotPassword.vue'
import SignUp from '../pages/signup.vue'
import NewPassword from '../pages/newpassword.vue'

// ===== Admin Pages =====
import LoginAdmin from '../views/admin/loginAdmin.vue'
import AdminHome from '../views/admin/AdminHome.vue'
import AdminDashboard from '../views/admin/AdminDashboard.vue'

import AddPatientByAdmin from '../views/admin/AddPatientByAdmin.vue'
import AdminCalendarView from '../views/admin/AdminCalendarView.vue'

const routes = [
  { path: '/', redirect: '/login' },

  // ---------- USER ----------
  { path: '/login', name: 'login', component: LoginPages },
  { path: '/signup', name: 'signup', component: SignUp },
  { path: '/forgot-password', name: 'forgot-password', component: ForgotPassword },
  { path: '/newpassword', name: 'newpassword', component: NewPassword },
  { path: '/home', name: 'home', component: HomeView, meta: { requiresAuth: true } },
  { path: '/booking/:id?', name: 'booking', component: BookingView, meta: { requiresAuth: true } },
  { path: '/calendar', name: 'calendar', component: CalendarView, meta: { requiresAuth: true } },

  // ---------- ADMIN ----------
  { path: '/admin-login', name: 'admin-login', component: LoginAdmin },
  { path: '/admin-home', name: 'admin-home', component: AdminHome, meta: { requiresAuth: true, role: 'admin' } },
  { path: '/admin-dashboard', name: 'admin-dashboard', component: AdminDashboard, meta: { requiresAuth: true, role: 'admin' } },
  { path: '/admin-add-patient', name: 'admin-add-patient', component: AddPatientByAdmin, meta: { requiresAuth: true, role: 'admin' } },
  { path: '/admin-calendar', name: 'admin-calendar', component: AdminCalendarView, meta: { requiresAuth: true, role: 'admin' } }
]

const router = createRouter({
  history: createWebHistory(),
  routes
})

// 📍 Navigation Guard — รองรับ 2 role: 'user', 'admin'
// - 'user': เข้าได้เฉพาะหน้า user เท่านั้น
// - 'admin': เข้าได้เฉพาะหน้า admin เท่านั้น (redirect ไป /admin-home ถ้าพยายามเข้าหน้า user)
const hasAdminAccess = (role) => role === 'admin'

router.beforeEach((to, from, next) => {
  const isLoggedIn = localStorage.getItem('isLoggedIn') === 'true'
  const userRole = localStorage.getItem('userRole')

  const publicAuthPages = ['/login', '/signup', '/admin-login', '/newpassword', '/forgot-password']

  // ถ้า login แล้วแต่พยายามเข้าหน้า auth (เช่น /login) → redirect ไปหน้าที่เหมาะสม
  if (publicAuthPages.includes(to.path) && isLoggedIn) {
    if (userRole === 'admin') {
      return next('/admin-home')
    } else {
      // 'user' ให้ไปหน้า /home
      return next('/home')
    }
  }

  // ถ้าต้อง login แต่ยังไม่ได้ login → ไปหน้า login
  if (to.meta.requiresAuth && !isLoggedIn) {
    return next('/login')
  }

  // ถ้าหน้าต้องการสิทธิ์ admin แต่ role ไม่มีสิทธิ์ admin
  if (to.meta.role === 'admin' && !hasAdminAccess(userRole)) {
    alert('❌ คุณไม่มีสิทธิ์เข้าถึงหน้า Admin!')
    return next('/home')
  }

  next()
})

export default router