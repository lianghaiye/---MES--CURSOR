import { reactive, watch } from 'vue'
import { createProcessDocSeed } from '@/mock/processDocSeed'

const STORAGE_KEY = 'i_doms_process_docs'

function loadFromStorage() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) {
      const parsed = JSON.parse(raw)
      if (Array.isArray(parsed.docs)) return parsed.docs
    }
  } catch {
    /* ignore */
  }
  return null
}

function persist() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify({ docs: processDocState.docs }))
}

export const processDocState = reactive({
  docs: loadFromStorage() || createProcessDocSeed(),
})

watch(
  () => processDocState.docs,
  () => persist(),
  { deep: true },
)

export function getProcessDocById(id) {
  return processDocState.docs.find((d) => d.id === id) || null
}

export function getEnabledProcessDocs() {
  return processDocState.docs.filter((d) => d.status === '启用')
}

export function filterProcessDocs(list, filters = {}) {
  return list.filter((d) => {
    if (filters.name && !d.name.includes(filters.name)) return false
    if (filters.code && !d.code.includes(filters.code)) return false
    return true
  })
}
