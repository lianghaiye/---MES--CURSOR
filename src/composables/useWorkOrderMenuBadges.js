import { computed } from 'vue'
import { workOrderState } from '@/store/workOrderStore'
import { assemblyWorkOrderState } from '@/store/assemblyWorkOrderStore'
import { disassemblyWorkOrderState } from '@/store/disassemblyWorkOrderStore'
import { qcWorkOrderState } from '@/store/qcWorkOrderStore'
import { salesOrderState } from '@/store/salesOrderStore'
import { purchaseOrderState } from '@/store/purchaseOrderStore'
import { outsourcingOrderState } from '@/store/outsourcingOrderStore'
import { SALES_ORDER_STATUS, normalizeSalesOrderProgressStatus } from '@/utils/salesOrderStatus'

const PENDING_DISPATCH = '待下发'
const PENDING_APPROVE = '待审核'

const WORK_ORDER_BADGE_PATHS = [
  '/production/work-orders',
  '/production/assembly-work-orders',
  '/production/disassembly-work-orders',
  '/production/qc-work-orders',
]

const ORDER_APPROVE_BADGE_PATHS = [
  '/sales/orders',
  '/procurement/purchase-orders',
  '/procurement/outsourcing-orders',
]

export const BADGE_PATHS = [...WORK_ORDER_BADGE_PATHS, ...ORDER_APPROVE_BADGE_PATHS]

function countSalesPendingApprove() {
  return (salesOrderState.orders || []).filter(
    (o) => normalizeSalesOrderProgressStatus(o.progressStatus) === SALES_ORDER_STATUS.PENDING,
  ).length
}

function countPurchasePendingApprove() {
  return (purchaseOrderState.orders || []).filter((o) => o.status === PENDING_APPROVE).length
}

function countOutsourcingPendingApprove() {
  return (outsourcingOrderState.orders || []).filter((o) => o.status === PENDING_APPROVE).length
}

export function countPendingByPath(path) {
  switch (path) {
    case '/production/work-orders':
      return workOrderState.orders.filter((o) => o.status === PENDING_DISPATCH).length
    case '/production/assembly-work-orders':
      return assemblyWorkOrderState.orders.filter((o) => o.status === PENDING_DISPATCH).length
    case '/production/disassembly-work-orders':
      return disassemblyWorkOrderState.orders.filter((o) => o.status === PENDING_DISPATCH).length
    case '/production/qc-work-orders':
      return qcWorkOrderState.orders.filter((o) => o.status === PENDING_DISPATCH).length
    case '/sales/orders':
      return countSalesPendingApprove()
    case '/procurement/purchase-orders':
      return countPurchasePendingApprove()
    case '/procurement/outsourcing-orders':
      return countOutsourcingPendingApprove()
    default:
      return 0
  }
}

/** 侧栏待办数字：工单待下发 + 销售/采购/外协待审核 */
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
