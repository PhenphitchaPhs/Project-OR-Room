import { createRouter, createWebHistory } from 'vue-router'
import { useAuthStore } from '@/stores/auth'

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
import ChooseDoctorAdmin from '../views/admin/ChooseDoctorAdmin.vue'
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
  { path: '/booking', name: 'booking', component: BookingView, meta: { requiresAuth: true } },
  { path: '/calendar', name: 'calendar', component: CalendarView, meta: { requiresAuth: true } },

  // ---------- ADMIN ----------
  { path: '/admin-login', name: 'admin-login', component: LoginAdmin },
  { path: '/admin-home', name: 'admin-home', component: AdminHome, meta: { requiresAuth: true, role: 'admin' } },
  { path: '/admin-dashboard', name: 'admin-dashboard', component: AdminDashboard, meta: { requiresAuth: true, role: 'admin' } },
  { path: '/choose-doctor', name: 'choose-doctor', component: ChooseDoctorAdmin, meta: { requiresAuth: true, role: 'admin' } },
  { path: '/admin-add-patient', name: 'admin-add-patient', component: AddPatientByAdmin, meta: { requiresAuth: true, role: 'admin' } },
  { path: '/admin-calendar', name: 'admin-calendar', component: AdminCalendarView, meta: { requiresAuth: true, role: 'admin' } }
]

const router = createRouter({
  history: createWebHistory(),
  routes
})

/* 🔐 Navigation Guard */
// Security Fix: Replaced insecure localStorage checks with a secure auth store 
// that fetches session state from the backend to prevent client-side manipulation 
// and authentication/authorization bypass.
router.beforeEach(async (to, from, next) => {
  const authStore = useAuthStore()
  
  // Fetch real session state from backend if not initialized
  if (!authStore.isInitialized) {
    await authStore.fetchSession()
  }

  const publicAuthPages = ['/login', '/signup', '/admin-login', '/newpassword']
  if (publicAuthPages.includes(to.path) && authStore.isLoggedIn) {
    return next(authStore.userRole === 'admin' ? '/admin-home' : '/home')
  }

  if (to.meta.requiresAuth && !authStore.isLoggedIn) {
    return next('/login')
  } 
  
  if (to.meta.role === 'admin' && authStore.userRole !== 'admin') {
    alert('❌ คุณไม่มีสิทธิ์เข้าถึงหน้า Admin!')
    return next('/home')
  } 
  
  next()
})

export default router
