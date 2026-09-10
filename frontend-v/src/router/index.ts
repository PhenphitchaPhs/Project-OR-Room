import { createRouter, createWebHistory } from 'vue-router'

import HomeView from '../views/HomeView.vue'
import CalendarView from '../views/CalendarView.vue'
import BookingView from '../views/BookingView.vue'

import LoginPages from '../pages/LoginPage.vue'
import ForgotPassword from '../pages/email-ForgotPassword.vue'
import SignUp from '../pages/signup.vue'
import NewPassword from '../pages/newpassword.vue'

import LoginAdmin from '../views/admin/loginAdmin.vue'
import AdminHome from '../views/admin/AdminHome.vue'
import AdminDashboard from '../views/admin/AdminDashboard.vue'

import AddPatientByAdmin from '../views/admin/AddPatientByAdmin.vue'
import AdminCalendarView from '../views/admin/AdminCalendarView.vue'

const routes = [
  { path: '/', redirect: '/login' },

  { path: '/login', name: 'login', component: LoginPages },
  { path: '/signup', name: 'signup', component: SignUp },
  { path: '/forgot-password', name: 'forgot-password', component: ForgotPassword },
  { path: '/newpassword', name: 'newpassword', component: NewPassword },
  { path: '/home', name: 'home', component: HomeView, meta: { requiresAuth: true } },
  { path: '/booking/:id?', name: 'booking', component: BookingView, meta: { requiresAuth: true } },
  { path: '/calendar', name: 'calendar', component: CalendarView, meta: { requiresAuth: true } },

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

const hasAdminAccess = (role) => role === 'admin'

router.beforeEach((to, from, next) => {
  const isLoggedIn = localStorage.getItem('isLoggedIn') === 'true'
  const userRole = localStorage.getItem('userRole')

  const publicAuthPages = ['/login', '/signup', '/admin-login', '/newpassword', '/forgot-password']

  if (publicAuthPages.includes(to.path) && isLoggedIn) {
    if (userRole === 'admin') {
      return next('/admin-home')
    } else {

      return next('/home')
    }
  }

  if (to.meta.requiresAuth && !isLoggedIn) {
    return next('/login')
  }

  if (to.meta.role === 'admin' && !hasAdminAccess(userRole)) {
    alert('❌ You do not have permission to access the Admin page!')
    return next('/home')
  }

  next()
})

export default router
