<template>
    <div class="admin-sidebar-root">
        <header v-if="!isOpen" class="admin-menu-trigger">
            <button class="admin-menu-button" type="button" aria-label="Open admin menu" @click="isOpen = true">
                <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24"
                    aria-hidden="true">
                    <path fill="currentColor"
                        d="M19.14 12.94c.04-.3.06-.61.06-.94s-.02-.64-.07-.94l2.03-1.58a.5.5 0 0 0 .12-.61l-1.92-3.32a.5.5 0 0 0-.59-.22l-2.39.96c-.5-.38-1.03-.7-1.62-.94L14.4 2.81a.49.49 0 0 0-.48-.41h-3.84a.49.49 0 0 0-.47.41L9.25 5.35c-.59.24-1.13.56-1.62.94l-2.39-.96a.5.5 0 0 0-.59.22L2.73 8.87a.5.5 0 0 0 .12.61l2.03 1.58c-.05.3-.08.63-.08.94s.03.64.08.94l-2.03 1.58a.5.5 0 0 0-.12.61l1.92 3.32c.12.22.37.3.59.22l2.39-.96c.5.38 1.03.7 1.62.94l.36 2.54c.04.24.23.41.47.41h3.84c.24 0 .44-.17.48-.41l.36-2.54c.59-.24 1.13-.56 1.62-.94l2.39.96c.22.08.47 0 .59-.22l1.92-3.32a.5.5 0 0 0-.12-.61zM12 15.6A3.6 3.6 0 1 1 12 8a3.6 3.6 0 0 1 0 7.6z" />
                </svg>
            </button>
        </header>

        <div v-if="isOpen" class="admin-sidebar-overlay" @click="close"></div>

        <transition name="admin-sidebar-slide">
            <aside v-if="isOpen" class="admin-sidebar" aria-label="Admin navigation">
                <div class="admin-sidebar-header">
                    <div class="admin-account">
                        <div class="admin-avatar-icon" aria-hidden="true">
                            <svg xmlns="http://www.w3.org/2000/svg" width="42" height="42" viewBox="0 0 24 24">
                                <path fill="currentColor"
                                    d="M12 2a10 10 0 1 0 0 20a10 10 0 0 0 0-20m0 4a3.5 3.5 0 1 1 0 7a3.5 3.5 0 0 1 0-7m0 14a7.9 7.9 0 0 1-5.7-2.4c.5-1.5 2.8-2.6 5.7-2.6s5.2 1.1 5.7 2.6A7.9 7.9 0 0 1 12 20" />
                            </svg>
                        </div>
                        <strong>{{ accountName }}</strong>
                    </div>
                    <button class="admin-sidebar-close" type="button" aria-label="Close admin menu" @click="close">
                        ×
                    </button>
                </div>

                <nav class="admin-sidebar-nav">
                    <button class="admin-menu-item" :class="{ active: route.path === '/admin-dashboard' }"
                        type="button" @click="navigate('/admin-dashboard')">
                        <span class="material-icons">dashboard</span>
                        <span>Dashboard</span>
                    </button>
                    <button class="admin-menu-item" :class="{ active: route.path === '/admin-calendar' }"
                        type="button" @click="navigate('/admin-calendar')">
                        <span class="material-icons">calendar_month</span>
                        <span>Calendar</span>
                    </button>
                    <button class="admin-menu-item" :class="{ active: route.path === '/admin-home' }" type="button"
                        @click="navigate('/admin-home')">
                        <span class="material-icons">format_list_numbered</span>
                        <span>Queue</span>
                    </button>
                    <button class="admin-menu-item" :class="{ active: route.path === '/admin-procedures' }"
                        type="button" @click="navigate('/admin-procedures')">
                        <span class="material-icons">medical_services</span>
                        <span>Surgery Types</span>
                    </button>
                </nav>
            </aside>
        </transition>
    </div>
</template>

<script setup>
import { ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'

const isOpen = ref(false)
const accountName = ref(localStorage.getItem('userLicense') || 'Admin')
const route = useRoute()
const router = useRouter()

const close = () => {
    isOpen.value = false
}

const navigate = (path) => {
    close()
    router.push(path)
}
</script>

<style scoped>
.admin-menu-trigger {
    position: fixed;
    top: 15px;
    left: 15px;
    z-index: 1100;
}

.admin-menu-button {
    width: 45px;
    height: 45px;
    display: flex;
    align-items: center;
    justify-content: center;
    border: 2px solid #fff;
    border-radius: 50%;
    background: #1a3a5f;
    color: #fff;
    cursor: pointer;
    box-shadow: 0 4px 10px rgba(0, 0, 0, 0.1);
}

.admin-menu-button:hover {
    background: #244b7a;
}

.admin-sidebar-overlay {
    position: fixed;
    inset: 0;
    z-index: 1200;
    background: rgba(0, 0, 0, 0.4);
}

.admin-sidebar {
    position: fixed;
    top: 0;
    left: 0;
    z-index: 1201;
    width: min(280px, 85vw);
    height: 100vh;
    overflow-y: auto;
    background: #f8faff;
    box-shadow: 5px 0 20px rgba(0, 0, 0, 0.15);
}

.admin-sidebar-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    min-height: 80px;
    padding: 20px;
    box-sizing: border-box;
    color: #fff;
    background: #1a3a5f;
}

.admin-account {
    display: flex;
    align-items: center;
    gap: 12px;
    min-width: 0;
}

.admin-account strong {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
}

.admin-avatar-icon {
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
}

.admin-sidebar-close {
    border: 0;
    background: transparent;
    color: #fff;
    font-size: 30px;
    line-height: 1;
    cursor: pointer;
}

.admin-sidebar-nav {
    display: flex;
    flex-direction: column;
}

.admin-menu-item {
    display: flex;
    align-items: center;
    gap: 15px;
    width: 100%;
    padding: 18px 25px;
    border: 0;
    border-bottom: 1px solid #edf2f7;
    background: transparent;
    color: #4a6fa5;
    font: inherit;
    font-weight: 700;
    text-align: left;
    cursor: pointer;
}

.admin-menu-item:hover,
.admin-menu-item.active {
    background: #e8f0fe;
    color: #1a3a5f;
}

.admin-sidebar-slide-enter-active,
.admin-sidebar-slide-leave-active {
    transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

.admin-sidebar-slide-enter-from,
.admin-sidebar-slide-leave-to {
    transform: translateX(-100%);
}
</style>
