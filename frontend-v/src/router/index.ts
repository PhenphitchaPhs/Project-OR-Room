import { createRouter, createWebHistory } from 'vue-router'


// ===== User Pages =====
import HomeView from '../pages/HomeView.vue'
import CalendarView from '../pages/CalendarView.vue'
import LoginPages from '../pages/loginPages.vue'
import ForgotPassword from '../pages/email-ForgotPassword.vue'
import SignUp from '../pages/signup.vue'
import BookingView from '../pages/BookingView.vue'

// ===== Admin Pages =====
import LoginAdmin from '../pages/admin/loginAdmin.vue'
import AdminHome from '../pages/admin/AdminHome.vue'
import ChooseDoctorAdmin from '../pages/admin/ChooseDoctorAdmin.vue'
import AddPatientByAdmin from '../pages/admin/AddPatientByAdmin.vue'

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