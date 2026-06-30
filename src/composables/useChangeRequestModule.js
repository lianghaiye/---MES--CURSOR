import { computed } from 'vue'
import { useRoute } from 'vue-router'
import {
  CHANGE_MODULE,
  CHANGE_REQUEST_MODULES,
} from '@/constants/changeRequestModule'

export function useChangeRequestModule() {
  const route = useRoute()
  const kind = computed(() => route.meta?.changeModule || CHANGE_MODULE.ECN)
  const mod = computed(() => CHANGE_REQUEST_MODULES[kind.value] || CHANGE_REQUEST_MODULES[CHANGE_MODULE.ECN])
  return mod
}

export function getDocNo(record, mod) {
  if (!record) return '—'
  return record[mod.docNoField] || '—'
}
