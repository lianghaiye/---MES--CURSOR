import { computed } from 'vue'
import { workOrderState } from '@/store/workOrderStore'
import { assemblyWorkOrderState } from '@/store/assemblyWorkOrderStore'
import { disassemblyWorkOrderState } from '@/store/disassemblyWorkOrderStore'
import { qcWorkOrderState } from '@/store/qcWorkOrderStore'
import { salesOrderState } from '@/store/salesOrderStore'
import { purchaseOrderState } from '@/store/purchaseOrderStore'
import { outsourcingOrderState } from '@/store/outsourcingOrderStore'
import { inboundOrderState } from '@/store/inboundOrderStore'
import { outboundState } from '@/store/outboundStore'
import { stocktakeOrderState } from '@/store/stocktakeOrderStore'
import { transferOrderState } from '@/store/transferOrderStore'
import { qcTaskState, QC_TASK_STATUS } from '@/store/qcTaskStore'
import { factoryQcState } from '@/store/factoryQcStore'
import { ecnState } from '@/store/ecnStore'
import { SALES_ORDER_STATUS, normalizeSalesOrderProgressStatus } from '@/utils/salesOrderStatus'
import { normalizeInboundStatus } from '@/mock/inboundOptions'
import { normalizeOutboundStatus } from '@/mock/outboundOptions'
import { PENDING_INBOUND_STATUSES } from '@/utils/pendingInboundLines'
import { PENDING_OUTBOUND_STATUSES } from '@/utils/pendingOutboundLines'
import { STOCKTAKE_STATUS, normalizeStocktakeStatus } from '@/mock/stocktakeOptions'
import { TRANSFER_STATUS } from '@/mock/transferOptions'
import { ECN_STATUS } from '@/constants/ecn'

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

const INVENTORY_BADGE_PATHS = [
  '/inventory/pending-inbound',
  '/inventory/pending-outbound',
  '/inventory/stocktake',
  '/inventory/transfer',
]

const QUALITY_BADGE_PATHS = [
  '/quality/incoming-qc',
  '/quality/outsourcing-qc',
  '/quality/process-qc',
  '/quality/finished-qc',
  '/quality/factory-qc',
]

const ECN_BADGE_PATHS = ['/engineering-change/ecn-list']

/** ECN「待审核」：待审批 / 审批中 */
const ECN_PENDING_REVIEW_STATUSES = [ECN_STATUS.PENDING, ECN_STATUS.APPROVING]

const QC_SCOPE_BY_PATH = {
  '/quality/incoming-qc': '来料质检',
  '/quality/outsourcing-qc': '外协回货检',
  '/quality/process-qc': '生产过程检',
  '/quality/finished-qc': '成品检',
}

export const BADGE_PATHS = [
  ...WORK_ORDER_BADGE_PATHS,
  ...ORDER_APPROVE_BADGE_PATHS,
  ...INVENTORY_BADGE_PATHS,
  ...QUALITY_BADGE_PATHS,
  ...ECN_BADGE_PATHS,
]

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

function countPendingInboundDocs() {
  return (inboundOrderState.orders || []).filter((o) =>
    PENDING_INBOUND_STATUSES.includes(normalizeInboundStatus(o.status)),
  ).length
}

function countPendingOutboundDocs() {
  return (outboundState.orders || []).filter((o) =>
    PENDING_OUTBOUND_STATUSES.includes(normalizeOutboundStatus(o.status)),
  ).length
}

function countStocktakePendingApprove() {
  return (stocktakeOrderState.orders || []).filter(
    (o) => normalizeStocktakeStatus(o.status) === STOCKTAKE_STATUS.PENDING_APPROVAL,
  ).length
}

function countTransferPendingConfirm() {
  return (transferOrderState.orders || []).filter((o) => o.status === TRANSFER_STATUS.PENDING)
    .length
}

function isPendingQcStatus(status) {
  return status === QC_TASK_STATUS.PENDING || status === '检验中' || status === '检测中'
}

function countPendingQcByScope(bizScope) {
  return (qcTaskState.tasks || []).filter((t) => {
    if (!isPendingQcStatus(t.qcStatus)) return false
    const scope = t.bizScope || '来料质检'
    return scope === bizScope
  }).length
}

function countFactoryPendingQc() {
  return (factoryQcState.records || []).filter((r) => r.qcStatus === '待质检').length
}

function countEcnPendingReview() {
  return (ecnState.items || []).filter((row) => ECN_PENDING_REVIEW_STATUSES.includes(row.status))
    .length
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
    case '/inventory/pending-inbound':
      return countPendingInboundDocs()
    case '/inventory/pending-outbound':
      return countPendingOutboundDocs()
    case '/inventory/stocktake':
      return countStocktakePendingApprove()
    case '/inventory/transfer':
      return countTransferPendingConfirm()
    case '/quality/incoming-qc':
    case '/quality/outsourcing-qc':
    case '/quality/process-qc':
    case '/quality/finished-qc':
      return countPendingQcByScope(QC_SCOPE_BY_PATH[path])
    case '/quality/factory-qc':
      return countFactoryPendingQc()
    case '/engineering-change/ecn-list':
      return countEcnPendingReview()
    default:
      return 0
  }
}

/** 侧栏待办数字：工单待下发、订单待审核、出入库/盘点/调拨/质检/ECN 待办 */
export function useWorkOrderMenuBadges() {
  const badges = computed(() => {
    // 显式触达 store，保证单据状态变更后角标刷新
    void inboundOrderState.orders
    void outboundState.orders
    void stocktakeOrderState.orders
    void transferOrderState.orders
    void qcTaskState.tasks
    void factoryQcState.records
    void ecnState.items
    void workOrderState.orders
    void assemblyWorkOrderState.orders
    void disassemblyWorkOrderState.orders
    void qcWorkOrderState.orders
    void salesOrderState.orders
    void purchaseOrderState.orders
    void outsourcingOrderState.orders

    const map = {}
    BADGE_PATHS.forEach((path) => {
      map[path] = countPendingByPath(path)
    })
    return map
  })
  return { badges, BADGE_PATHS }
}
