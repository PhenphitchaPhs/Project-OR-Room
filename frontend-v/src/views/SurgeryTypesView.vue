<template>
  <div class="surgery-types-page">
    <AdminSidebar v-if="isAdmin" />
    <div class="surgery-types-card">
      <header class="page-header">
        <div>
          <p class="eyebrow">ORchestrator</p>
          <h1>Surgery Types</h1>
          <p>Manage shared surgery types and their estimated durations.</p>
        </div>
        <button type="button" class="back-btn" @click="goBack">Back</button>
      </header>
      <ProcedureManager @updated="loadAuditLogs" />
      <div class="usage-note">
        New surgery types are shared with all doctors and administrators. Built-in types are protected.
      </div>
      <section v-if="isAdmin" class="audit-section">
        <div class="audit-heading">
          <div>
            <h2>Change History</h2>
            <p>Recent surgery type changes</p>
          </div>
          <button type="button" class="back-btn" @click="loadAuditLogs">Refresh</button>
        </div>
        <p v-if="auditError" class="audit-error">{{ auditError }}</p>
        <p v-else-if="!auditLogs.length" class="audit-empty">No changes recorded yet.</p>
        <div v-else class="audit-list">
          <div v-for="log in auditLogs" :key="log.id" class="audit-row">
            <div>
              <strong>{{ log.procedureName }}</strong>
              <span>{{ log.action }} by {{ log.actorName || log.actorLicense }}</span>
            </div>
            <time>{{ log.createdAt }}</time>
          </div>
        </div>
      </section>
    </div>
  </div>
</template>

<script setup>
import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { apiFetch } from '../api/client'
import AdminSidebar from '../components/AdminSidebar.vue'
import ProcedureManager from '../components/ProcedureManager.vue'

const router = useRouter()
const isAdmin = computed(() => (localStorage.getItem('userRole') || '').toLowerCase() === 'admin')
const auditLogs = ref([])
const auditError = ref('')

const loadAuditLogs = async () => {
  if (!isAdmin.value) return
  try {
    const response = await apiFetch('/api/procedures/audit-logs?limit=100')
    const data = await response.json()
    if (!response.ok) throw new Error(data.error || 'Unable to load change history')
    auditLogs.value = Array.isArray(data) ? data : []
    auditError.value = ''
  } catch (error) {
    auditError.value = error.message || 'Unable to load change history'
  }
}

const goBack = () => router.push(isAdmin.value ? '/admin-home' : '/home')

onMounted(loadAuditLogs)
</script>

<style scoped>
.surgery-types-page { min-height: 100vh; padding: 35px 20px; box-sizing: border-box; background: linear-gradient(135deg, #0f2a47, #1e3a5f); }
.surgery-types-card { width: min(760px, 100%); margin: 0 auto; padding: 28px; box-sizing: border-box; border-radius: 18px; background: #fff; box-shadow: 0 12px 35px rgba(0, 0, 0, .18); color: #173b62; }
.page-header { display: flex; align-items: flex-start; justify-content: space-between; gap: 18px; margin-bottom: 22px; padding-bottom: 18px; border-bottom: 1px solid #e1eaf4; }
.eyebrow { margin: 0 0 5px; color: #4a6fa5; font-size: 12px; font-weight: 800; letter-spacing: 1.2px; text-transform: uppercase; }
h1 { margin: 0; color: #0f2a47; font-size: 28px; }
.page-header p:last-child { margin: 7px 0 0; color: #66809d; font-size: 14px; }
.back-btn { border: 1px solid #cbd9e8; border-radius: 8px; padding: 8px 13px; background: #f4f8fd; color: #1a3a7c; font-weight: 700; cursor: pointer; }
.back-btn:hover { background: #e7f0ff; }
.usage-note { margin-top: 18px; padding: 12px 14px; border-radius: 9px; background: #f0f7ff; color: #47617d; font-size: 13px; line-height: 1.5; }
.audit-section { margin-top: 24px; padding-top: 20px; border-top: 1px solid #e1eaf4; }
.audit-heading { display: flex; align-items: center; justify-content: space-between; gap: 12px; }
.audit-heading h2 { margin: 0; color: #0f2a47; font-size: 19px; }
.audit-heading p { margin: 4px 0 0; color: #66809d; font-size: 13px; }
.audit-list { margin-top: 12px; }
.audit-row { display: flex; align-items: center; justify-content: space-between; gap: 16px; padding: 10px 0; border-bottom: 1px solid #edf2f7; font-size: 13px; }
.audit-row strong, .audit-row span { display: block; }
.audit-row span, .audit-row time, .audit-empty { margin-top: 3px; color: #66809d; font-size: 12px; }
.audit-error { color: #b91c1c; font-size: 13px; }
@media (max-width: 560px) { .surgery-types-card { padding: 20px; } .page-header { flex-direction: column; } }
</style>
