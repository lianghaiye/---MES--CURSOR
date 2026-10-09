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
    path: '/quality/incoming-qc',
    query: { qcStatus: '待质检' },
    title: '来料质检',
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

function countPendingQcDocs() {
  return (qcTaskState.tasks || []).filter(
    (t) => t.qcStatus === QC_TASK_STATUS.PENDING && (!t.bizScope || t.bizScope === '来料质检'),
  ).length
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
      return countPendingQcDocs()
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
    ecnState.items?.length,
  ]
}

export function listWorkbenchTodoCards() {
  touchWorkbenchTodoSources()
  return WORKBENCH_TODO_ITEMS.map((item) => ({
    ...item,
    count: countWorkbenchTodo(item.key),
  }))
}

export function buildWorkbenchTodoFullPath(item) {
  const q = item?.query || {}
  const keys = Object.keys(q)
  if (!keys.length) return item.path
  const search = keys
    .map((k) => `${encodeURIComponent(k)}=${encodeURIComponent(String(q[k]))}`)
    .join('&')
  return `${item.path}?${search}`
}
