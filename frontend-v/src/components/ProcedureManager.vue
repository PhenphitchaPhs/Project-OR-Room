<template>
  <div class="procedure-manager">
    <button type="button" class="manage-procedures-btn" @click="openManager">
      Manage Surgery Types
    </button>

    <div v-if="isOpen" class="procedure-modal-overlay" @click.self="closeManager">
      <div class="procedure-modal">
        <div class="procedure-modal-header">
          <div>
            <h2>Manage Surgery Types</h2>
            <p>Additional types can be added, edited, or deleted.</p>
          </div>
          <button type="button" class="close-btn" aria-label="Close" @click="closeManager">×</button>
        </div>

        <form class="procedure-form" @submit.prevent="saveProcedure">
          <label>
            Surgery type
            <input v-model.trim="form.name" type="text" maxlength="200" placeholder="e.g. Minor surgery" required />
          </label>
          <label>
            Estimated duration (minutes)
            <input v-model.number="form.durationMinutes" type="number" min="1" max="1440" step="1" placeholder="50" required />
          </label>
          <div class="form-actions">
            <button v-if="editingId" type="button" class="secondary-btn" @click="resetForm">Cancel edit</button>
            <button type="submit" class="save-btn" :disabled="isSaving">
              {{ isSaving ? 'Saving...' : editingId ? 'Save changes' : 'Add surgery type' }}
            </button>
          </div>
          <p v-if="errorMessage" class="error-message">{{ errorMessage }}</p>
        </form>

        <div class="additional-list">
          <h3>Additional</h3>
          <p v-if="!procedures.length" class="empty-message">No additional surgery types yet.</p>
          <div v-for="procedure in procedures" :key="procedure.id" class="procedure-item">
            <div>
              <strong>{{ procedure.name }}</strong>
              <span>{{ procedure.durationMinutes }} minutes</span>
            </div>
            <div class="item-actions">
              <button type="button" class="edit-btn" @click="startEdit(procedure)">Edit</button>
              <button type="button" class="delete-btn" @click="deleteProcedure(procedure)">Delete</button>
            </div>
          </div>
        </div>

        <p class="built-in-note">Built-in surgery types are protected and cannot be edited or deleted.</p>
      </div>
    </div>
  </div>
</template>

<script setup>
import { onMounted, reactive, ref } from 'vue'
import { apiFetch } from '../api/client'

const emit = defineEmits(['updated'])
const isOpen = ref(false)
const isSaving = ref(false)
const editingId = ref(null)
const errorMessage = ref('')
const procedures = ref([])
const form = reactive({ name: '', durationMinutes: null })

const resetForm = () => {
  editingId.value = null
  form.name = ''
  form.durationMinutes = null
  errorMessage.value = ''
}

const loadProcedures = async () => {
  const response = await apiFetch('/api/procedures')
  const data = await response.json()
  if (!response.ok) throw new Error(data.error || 'Unable to load surgery types')
  procedures.value = Array.isArray(data) ? data : []
  emit('updated', procedures.value)
}

const openManager = async () => {
  isOpen.value = true
  errorMessage.value = ''
  try {
    await loadProcedures()
  } catch (error) {
    errorMessage.value = error.message || 'Unable to load surgery types'
  }
}

const closeManager = () => {
  isOpen.value = false
  resetForm()
}

const saveProcedure = async () => {
  isSaving.value = true
  errorMessage.value = ''
  try {
    const path = editingId.value ? `/api/procedures/${editingId.value}` : '/api/procedures'
    const response = await apiFetch(path, {
      method: editingId.value ? 'PUT' : 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    })
    const data = await response.json()
    if (!response.ok) throw new Error(data.error || 'Unable to save surgery type')
    await loadProcedures()
    resetForm()
  } catch (error) {
    errorMessage.value = error.message || 'Unable to save surgery type'
  } finally {
    isSaving.value = false
  }
}

const startEdit = (procedure) => {
  editingId.value = procedure.id
  form.name = procedure.name
  form.durationMinutes = procedure.durationMinutes
  errorMessage.value = ''
}

const deleteProcedure = async (procedure) => {
  if (!window.confirm(`Delete "${procedure.name}"?`)) return
  errorMessage.value = ''
  try {
    const response = await apiFetch(`/api/procedures/${procedure.id}`, { method: 'DELETE' })
    const data = await response.json()
    if (!response.ok) throw new Error(data.error || 'Unable to delete surgery type')
    if (editingId.value === procedure.id) resetForm()
    await loadProcedures()
  } catch (error) {
    errorMessage.value = error.message || 'Unable to delete surgery type'
  }
}

onMounted(async () => {
  try {
    await loadProcedures()
  } catch {
    // The manager shows the API error when opened.
  }
})
</script>

<style scoped>
.procedure-manager { margin: 0 0 12px; }
.manage-procedures-btn { border: 1px solid #1a3a7c; background: #eef5ff; color: #1a3a7c; border-radius: 8px; padding: 8px 12px; font-weight: 700; cursor: pointer; }
.manage-procedures-btn:hover { background: #dceaff; }
.procedure-modal-overlay { position: fixed; inset: 0; z-index: 1000; display: flex; align-items: center; justify-content: center; padding: 20px; background: rgba(15, 42, 71, .45); }
.procedure-modal { width: min(620px, 100%); max-height: 90vh; overflow-y: auto; background: #fff; border-radius: 16px; padding: 22px; box-shadow: 0 18px 50px rgba(15, 42, 71, .25); color: #173b62; }
.procedure-modal-header { display: flex; justify-content: space-between; gap: 15px; border-bottom: 1px solid #e1eaf4; padding-bottom: 14px; }
.procedure-modal h2, .procedure-modal h3 { margin: 0; color: #0f2a47; }
.procedure-modal-header p { margin: 5px 0 0; color: #66809d; font-size: 13px; }
.close-btn { border: 0; background: transparent; font-size: 28px; color: #66809d; cursor: pointer; line-height: 1; }
.procedure-form { display: grid; grid-template-columns: 1fr 180px; gap: 12px; padding: 18px 0; border-bottom: 1px solid #e1eaf4; }
.procedure-form label { display: flex; flex-direction: column; gap: 6px; font-size: 13px; font-weight: 700; }
.procedure-form input { width: 100%; box-sizing: border-box; border: 1px solid #cbd9e8; border-radius: 8px; padding: 10px; color: #173b62; }
.form-actions { grid-column: 1 / -1; display: flex; gap: 8px; justify-content: flex-end; }
.save-btn, .secondary-btn, .edit-btn, .delete-btn { border: 0; border-radius: 7px; padding: 8px 12px; font-weight: 700; cursor: pointer; }
.save-btn { background: #1a3a7c; color: #fff; }
.save-btn:disabled { opacity: .6; cursor: wait; }
.secondary-btn { background: #edf2f7; color: #47617d; }
.additional-list { padding: 18px 0 8px; }
.additional-list h3 { margin-bottom: 10px; }
.procedure-item { display: flex; align-items: center; justify-content: space-between; gap: 12px; padding: 11px 0; border-bottom: 1px solid #edf2f7; }
.procedure-item strong, .procedure-item span { display: block; }
.procedure-item span { margin-top: 3px; color: #66809d; font-size: 13px; }
.item-actions { display: flex; gap: 6px; flex-shrink: 0; }
.edit-btn { background: #e7f0ff; color: #1a3a7c; }
.delete-btn { background: #fee2e2; color: #b91c1c; }
.empty-message, .built-in-note { color: #66809d; font-size: 13px; }
.built-in-note { margin: 10px 0 0; padding-top: 12px; border-top: 1px solid #e1eaf4; }
.error-message { grid-column: 1 / -1; margin: 0; color: #b91c1c; font-size: 13px; }
@media (max-width: 560px) { .procedure-form { grid-template-columns: 1fr; } }
</style>
