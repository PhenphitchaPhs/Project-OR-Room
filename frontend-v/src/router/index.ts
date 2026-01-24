import { createRouter, createWebHistory } from 'vue-router'
import HomeView from '../views/HomeView.vue'
import BookingView from '../views/BookingView.vue'

// แก้ไขบรรทัดนี้ครับอ้าย
import LoginPage from '../pages/LoginPage.vue' 

const router = createRouter({
  history: createWebHistory(),
  routes: [
    { path: '/login', name: 'login', component: LoginPage },
    { path: '/', name: 'home', component: HomeView },
    { path: '/booking', name: 'booking', component: BookingView }
  ]
})

export default router