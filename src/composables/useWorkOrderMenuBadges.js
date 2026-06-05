import { computed } from 'vue'
import { workOrderState } from '@/store/workOrderStore'
import { assemblyWorkOrderState } from '@/store/assemblyWorkOrderStore'
import { disassemblyWorkOrderState } from '@/store/disassemblyWorkOrderStore'
import { qcWorkOrderState } from '@/store/qcWorkOrderStore'

const PENDING_STATUS = '待下发'

const BADGE_PATHS = [
  '/production/work-orders',
  '/production/assembly-work-orders',
  '/production/disassembly-work-orders',
  '/production/qc-work-orders',
]

export function countPendingByPath(path) {
  switch (path) {
    case '/production/work-orders':
      return workOrderState.orders.filter((o) => o.status === PENDING_STATUS).length
    case '/production/assembly-work-orders':
      return assemblyWorkOrderState.orders.filter((o) => o.status === PENDING_STATUS).length
    case '/production/disassembly-work-orders':
      return disassemblyWorkOrderState.orders.filter((o) => o.status === PENDING_STATUS).length
    case '/production/qc-work-orders':
      return qcWorkOrderState.orders.filter((o) => o.status === PENDING_STATUS).length
    default:
      return 0
  }
}

export function useWorkOrderMenuBadges() {
  const badges = computed(() => {
    const map = {}
    BADGE_PATHS.forEach((path) => {
      map[path] = countPendingByPath(path)
    })
    return map
  })
  return { badges, BADGE_PATHS }
}
