// 1. ลบ RouteRecordRaw ออกจากการนำเข้า
import { createRouter, createWebHistory } from 'vue-router'
import HomeView from '../views/HomeView.vue'
import BookingView from '../views/BookingView.vue'
import LoginPage from '../pages/LoginPage.vue'
import Signup from '../pages/signup.vue' 
//import PageDelete from '../pages/PageDelete.vue' 

const routes = [
  { 
    path: '/', 
    name: 'home', 
    component: HomeView 
  },
  { 
    path: '/login', 
    name: 'login', 
    component: LoginPage 
  },
  { 
    path: '/booking', 
    name: 'booking', 
    component: BookingView 
  },
  { 
    path: '/signup', 
    name: 'signup', 
    component: Signup 
  },
  // {
  //   path: "/delete-manage",
  //   name: "delete-manage",
  //   component: PageDelete,
  // },
]

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes
})

export default router