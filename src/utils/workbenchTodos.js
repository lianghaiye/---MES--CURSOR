/**
 * 工作台「待办事项」统计与跳转配置
 */
import { ECN_STATUS } from '@/constants/ecn'
import { salesOrderState } from '@/store/salesOrderStore'
import { purchaseOrderState } from '@/store/purchaseOrderStore'
import { outsourcingOrderState } from '@/store/outsourcingOrderStore'
import { workOrderState } from '@/store/workOrderStore'
import { inboundOrderState } from '@/store/inboundOrderStore'
import { outboundState } from '@/store/outboundStore'
import { qcTaskState, QC_TASK_STATUS } from '@/store/qcTaskStore'
import { factoryQcState } from '@/store/factoryQcStore'
import { ecnState } from '@/store/ecnStore'
import { SALES_ORDER_STATUS, normalizeSalesOrderProgressStatus } from '@/utils/salesOrderStatus'
import { normalizeInboundStatus } from '@/mock/inboundOptions'
import { normalizeOutboundStatus } from '@/mock/outboundOptions'
import { PENDING_INBOUND_STATUSES } from '@/utils/pendingInboundLines'
import { PENDING_OUTBOUND_STATUSES } from '@/utils/pendingOutboundLines'

export const ECN_TODO_STATUSES = [ECN_STATUS.PENDING, ECN_STATUS.APPROVING, ECN_STATUS.EXECUTING]

export const WORKBENCH_TODO_ITEMS = [
  {
    key: 'sales-approve',
    label: '销售待审核',
    tone: 'blue',
    path: '/sales/orders',
    query: { progressStatus: '待审核' },
    title: '销售订单',
  },
  {
    key: 'purchase-approve',
    label: '采购待审核',
    tone: 'orange',
    path: '/procurement/purchase-orders',
    query: { status: '待审核' },
    title: '采购订单',
  },
  {
    key: 'outsourcing-approve',
    label: '外协待审核',
    tone: 'purple',
    path: '/procurement/outsourcing-orders',
    query: { status: '待审核' },
    title: '外协订单',
  },
  {
    key: 'work-order-dispatch',
    label: '待下发工单',
    tone: 'cyan',
    path: '/production/work-orders',
    query: { status: '待下发' },
    title: '生产工单',
  },
  {
    key: 'pending-inbound',
    label: '待入库',
    tone: 'green',
    path: '/inventory/pending-inbound',
    query: {},
    title: '待入库列表',
  },
  {
    key: 'pending-outbound',
    label: '待出库',
    tone: 'magenta',
    path: '/inventory/pending-outbound',
    query: {},
    title: '待出库列表',
  },
  {
    key: 'pending-qc',
    label: '待质检',
    tone: 'gold',
    path: '',
    query: {},
    title: '待质检',
    /** 主卡不跳转，悬停展开分项 */
    hoverExpand: true,
  },
  {
    key: 'ecn-todo',
    label: 'ECN待办',
    tone: 'geekblue',
    path: '/engineering-change/ecn-list',
    query: { todo: '1' },
    title: 'ECN列表',
  },
]

/** 待质检悬停分项（顺序固定） */
export const WORKBENCH_QC_BREAKDOWN = [
  {
    key: 'qc-incoming',
    label: '来料质检',
    path: '/quality/incoming-qc',
    query: { qcStatus: '待质检' },
    title: '来料质检',
    bizScope: '来料质检',
  },
  {
    key: 'qc-outsourcing',
    label: '外协回货检',
    path: '/quality/outsourcing-qc',
    query: { qcStatus: '待质检' },
    title: '外协回货检',
    bizScope: '外协回货检',
  },
  {
    key: 'qc-process',
    label: '生产过程检',
    path: '/quality/process-qc',
    query: { qcStatus: '待质检' },
    title: '生产过程检',
    bizScope: '生产过程检',
  },
  {
    key: 'qc-finished',
    label: '成品检',
    path: '/quality/finished-qc',
    query: { qcStatus: '待质检' },
    title: '成品检',
    bizScope: '成品检',
  },
  {
    key: 'qc-factory',
    label: '出厂检',
    path: '/quality/factory-qc',
    query: { qcStatus: '待质检' },
    title: '出厂检',
    factory: true,
  },
]

export function getDefaultWorkbenchTodoKeys() {
  return WORKBENCH_TODO_ITEMS.map((item) => item.key)
}

function isPendingQcStatus(status) {
  return status === QC_TASK_STATUS.PENDING || status === '检验中' || status === '检测中'
}

function countSalesPendingApprove() {
  return (salesOrderState.orders || []).filter(
    (o) => normalizeSalesOrderProgressStatus(o.progressStatus) === SALES_ORDER_STATUS.PENDING,
  ).length
}

function countPurchasePendingApprove() {
  return (purchaseOrderState.orders || []).filter((o) => o.status === '待审核').length
}

function countOutsourcingPendingApprove() {
  return (outsourcingOrderState.orders || []).filter((o) => o.status === '待审核').length
}

function countPendingDispatchWorkOrders() {
  return (workOrderState.orders || []).filter((o) => o.status === '待下发').length
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

function countPendingQcByScope(bizScope) {
  return (qcTaskState.tasks || []).filter((t) => {
    if (!isPendingQcStatus(t.qcStatus)) return false
    const scope = t.bizScope || '来料质检'
    return scope === bizScope
  }).length
}

function countFactoryPendingQc() {
  return (factoryQcState.records || []).filter(
    (r) => r.qcStatus === '待质检' || r.qcStatus === '检验中' || r.qcStatus === '检测中',
  ).length
}

function countQcBreakdownItem(item) {
  if (item.factory) return countFactoryPendingQc()
  return countPendingQcByScope(item.bizScope)
}

function countPendingQcTotal() {
  return WORKBENCH_QC_BREAKDOWN.reduce((sum, item) => sum + countQcBreakdownItem(item), 0)
}

function countEcnTodos() {
  return (ecnState.items || []).filter((row) => ECN_TODO_STATUSES.includes(row.status)).length
}

export function countWorkbenchTodo(key) {
  switch (key) {
    case 'sales-approve':
      return countSalesPendingApprove()
    case 'purchase-approve':
      return countPurchasePendingApprove()
    case 'outsourcing-approve':
      return countOutsourcingPendingApprove()
    case 'work-order-dispatch':
      return countPendingDispatchWorkOrders()
    case 'pending-inbound':
      return countPendingInboundDocs()
    case 'pending-outbound':
      return countPendingOutboundDocs()
    case 'pending-qc':
      return countPendingQcTotal()
    case 'ecn-todo':
      return countEcnTodos()
    default:
      return 0
  }
}

/** 读取各 store 引用以驱动 computed 响应式更新 */
export function touchWorkbenchTodoSources() {
  return [
    salesOrderState.orders?.length,
    purchaseOrderState.orders?.length,
    outsourcingOrderState.orders?.length,
    workOrderState.orders?.length,
    inboundOrderState.orders?.length,
    outboundState.orders?.length,
    qcTaskState.tasks?.length,
    factoryQcState.records?.length,
    ecnState.items?.length,
  ]
}

export function listWorkbenchQcBreakdown() {
  touchWorkbenchTodoSources()
  return WORKBENCH_QC_BREAKDOWN.map((item) => ({
    ...item,
    count: countQcBreakdownItem(item),
  }))
}

/**
 * @param {string[]} [visibleKeys] 有序可见 key；缺省为全部默认顺序
 */
export function listWorkbenchTodoCards(visibleKeys) {
  touchWorkbenchTodoSources()
  const defaults = getDefaultWorkbenchTodoKeys()
  const keys =
    Array.isArray(visibleKeys) && visibleKeys.length
      ? visibleKeys.filter((k) => defaults.includes(k))
      : defaults
  const byKey = new Map(WORKBENCH_TODO_ITEMS.map((item) => [item.key, item]))
  return keys
    .map((key) => byKey.get(key))
    .filter(Boolean)
    .map((item) => ({
      ...item,
      count: countWorkbenchTodo(item.key),
    }))
}

export function buildWorkbenchTodoFullPath(item) {
  const q = item?.query || {}
  const keys = Object.keys(q)
  if (!item?.path) return ''
  if (!keys.length) return item.path
  const search = keys
    .map((k) => `${encodeURIComponent(k)}=${encodeURIComponent(String(q[k]))}`)
    .join('&')
  return `${item.path}?${search}`
}
