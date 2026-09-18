<template>
  <div ref="root" class="procedure-select" @keydown.esc.stop.prevent="close(true)" @focusout="onFocusOut">
    <button ref="trigger" type="button" class="select-trigger" aria-label="Select Procedure"
      aria-haspopup="listbox" :aria-expanded="isOpen" :aria-controls="`${id}-list`" @click="toggle"
      @keydown.down.prevent="open">
      <span :class="{ placeholder: !modelValue }">{{ selectedLabel }}</span>
      <span aria-hidden="true">▾</span>
    </button>
    <select class="validation-select" :value="modelValue" required tabindex="-1" aria-label="Procedure"
      @invalid.prevent="open">
      <option value=""></option>
      <option v-if="modelValue" :value="modelValue">{{ selectedLabel }}</option>
    </select>
    <div v-if="isOpen" class="dropdown">
      <input ref="searchInput" v-model="query" type="search" class="search-input"
        placeholder="Search surgery types..." aria-label="Search surgery types" role="combobox"
        aria-autocomplete="list" :aria-expanded="isOpen" :aria-controls="`${id}-list`"
        :aria-activedescendant="activeIndex >= 0 ? `${id}-option-${activeIndex}` : undefined"
        @keydown.down.prevent="move(1)" @keydown.up.prevent="move(-1)"
        @keydown.enter.prevent="selectActive" />
      <div :id="`${id}-list`" class="options" role="listbox" aria-label="Surgery types">
        <template v-for="group in filteredGroups" :key="group.label">
          <div class="group-label" role="presentation">{{ group.label }}</div>
          <div v-for="option in group.options" :id="`${id}-option-${options.indexOf(option)}`"
            :key="option.value" role="option" :aria-selected="modelValue === option.value"
            class="option" :class="{ active: options.indexOf(option) === activeIndex, selected: modelValue === option.value }"
            @mousedown.prevent @click="select(option)">{{ option.label }}</div>
        </template>
        <p v-if="!options.length" class="empty" role="status">No matching surgery types.</p>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed, nextTick, onBeforeUnmount, onMounted, ref, useId, watch } from 'vue'

const props = defineProps({
  modelValue: { type: String, default: '' },
  groups: { type: Array, default: () => [] },
  customProcedures: { type: Array, default: () => [] },
})
const emit = defineEmits(['update:modelValue', 'change'])
const id = useId()
const root = ref(null)
const trigger = ref(null)
const searchInput = ref(null)
const isOpen = ref(false)
const query = ref('')
const activeIndex = ref(-1)
const allGroups = computed(() => [
  ...props.groups.map(group => ({
    label: group.label,
    options: group.options.map(option => ({ label: option.name, value: option.value || option.name })),
  })),
  { label: 'Additional', options: props.customProcedures.map(procedure => ({
    label: `${procedure.name} - ${procedure.durationMinutes} mins`,
    value: procedure.value || `${procedure.name} - ${procedure.durationMinutes} mins`,
  })) },
])
const selectedLabel = computed(() => allGroups.value.flatMap(group => group.options)
  .find(option => option.value === props.modelValue)?.label || props.modelValue || 'Select Procedure')
const filteredGroups = computed(() => {
  const term = query.value.trim().toLowerCase()
  return allGroups.value.map(group => ({ ...group, options: group.options.filter(option =>
    `${group.label} ${option.label}`.toLowerCase().includes(term)),
  })).filter(group => group.options.length)
})
const options = computed(() => filteredGroups.value.flatMap(group => group.options))
watch(options, () => { activeIndex.value = -1 })
async function open() {
  query.value = ''
  isOpen.value = true
  await nextTick()
  searchInput.value?.focus()
}
function close(restoreFocus = false) {
  isOpen.value = false
  if (restoreFocus) trigger.value?.focus()
}
function toggle() { if (isOpen.value) close(); else open() }
async function move(direction) {
  if (!options.value.length) return
  activeIndex.value = (activeIndex.value + direction + options.value.length) % options.value.length
  await nextTick()
  document.getElementById(`${id}-option-${activeIndex.value}`)?.scrollIntoView({ block: 'nearest' })
}
function select(option) {
  emit('update:modelValue', option.value)
  emit('change', option.value)
  close(true)
}
function selectActive() {
  const option = options.value[activeIndex.value] || options.value[0]
  if (option) select(option)
}
function onOutsideClick(event) { if (!root.value?.contains(event.target)) close() }
function onFocusOut(event) { if (!root.value?.contains(event.relatedTarget)) close() }
onMounted(() => document.addEventListener('pointerdown', onOutsideClick))
onBeforeUnmount(() => document.removeEventListener('pointerdown', onOutsideClick))
</script>

<style scoped>
.procedure-select { position: relative; min-width: 0; width: 100%; align-self: start; }
.select-trigger { display: flex; align-items: center; justify-content: space-between; gap: 10px; box-sizing: border-box; width: 100%; height: 46px; padding: 10px 14px; border: 1px solid #d6e2f1; border-radius: 10px; background: #f4f8fd; color: #173b62; font: inherit; font-size: 14px; text-align: left; cursor: pointer; }
.select-trigger > span:first-child { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.placeholder { color: #64748b; }
.select-trigger:focus-visible, .search-input:focus { outline: 2px solid #1a3a7c; outline-offset: 2px; }
.dropdown { position: absolute; top: calc(100% + 6px); left: 0; right: 0; z-index: 50; padding: 10px; border: 1px solid #cbd9e8; border-radius: 10px; background: white; box-shadow: 0 10px 28px #0f2a4726; }
.search-input { box-sizing: border-box; width: 100%; padding: 10px; margin-bottom: 8px; border: 1px solid #cbd9e8; border-radius: 6px; font: inherit; color: #173b62; }
.options { max-height: 260px; overflow-y: auto; overscroll-behavior: contain; }
.group-label { padding: 8px; color: #64748b; font-size: 12px; font-weight: 700; background: #f4f7fa; }
.option { padding: 10px 8px; font-size: 14px; color: #173b62; cursor: pointer; overflow-wrap: anywhere; }
.option:hover, .option.active { background: #e7f0ff; }
.option.selected { color: #1a3a7c; font-weight: 700; background: #e8f0fe; }
.empty { padding: 8px; color: #64748b; font-size: 14px; }
.validation-select { position: absolute; width: 1px; height: 1px; opacity: 0; pointer-events: none; }
</style>
