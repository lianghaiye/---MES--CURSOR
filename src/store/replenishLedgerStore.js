/**
 * 补货台账：纯流水。库存预警或手工补货执行成功后追加一条记录，不做结案/合并。
 */
import { reactive, watch } from 'vue'
import dayjs from 'dayjs'

const STORAGE_KEY = 'i_doms_replenish_ledger'
/** v3：台账改为纯流水，去掉关闭/活跃合并 */
const DATA_VERSION = 3

/** @typedef {'producing'|'purchasing'|'outsourcing'} ReplenishLedgerStatus */

export const REPLENISH_LEDGER_STATUS = {
  PRODUCING: 'producing',
  PURCHASING: 'purchasing',
  OUTSOURCING: 'outsourcing',
}

export const REPLENISH_LEDGER_STATUS_OPTIONS = [
  { value: '', label: '全部状态' },
  { value: 'producing', label: '已下生产' },
  { value: 'purchasing', label: '已下采购' },
  { value: 'outsourcing', label: '已下外协' },
]

export const REPLENISH_LEDGER_SOURCE_OPTIONS = [
  { value: '', label: '全部来源' },
  { value: 'alert', label: '预警触发' },
  { value: 'manual', label: '手工' },
]

export function replenishLedgerSourceLabel(source) {
  const hit = REPLENISH_LEDGER_SOURCE_OPTIONS.find((o) => o.value === source)
  return hit?.label || '—'
}

export function replenishLedgerStatusLabel(status) {
  const hit = REPLENISH_LEDGER_STATUS_OPTIONS.find((o) => o.value === status)
  if (hit) return hit.label
  if (status === 'closed') return '已关闭'
  if (status === 'pending') return '待处理'
  return status || '—'
}

export function replenishLedgerStatusColor(status) {
  if (status === 'producing') return 'processing'
  if (status === 'purchasing') return 'blue'
  if (status === 'outsourcing') return 'purple'
  return 'default'
}

function loadFromStorage() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw)
    if (parsed.version === DATA_VERSION && Array.isArray(parsed.records)) {
      return parsed.records
    }
  } catch {
    /* ignore */
  }
  return null
}

function persist() {
  localStorage.setItem(
    STORAGE_KEY,
    JSON.stringify({ version: DATA_VERSION, records: replenishLedgerState.records }),
  )
}

let seq = 1

function nextLedgerNo() {
  const no = `BHZ${dayjs().format('YYYYMMDD')}${String(seq).padStart(4, '0')}`
  seq += 1
  return no
}

function buildDemoRecords() {
  const now = dayjs()
  return [
    {
      id: 'rl-demo-1',
      ledgerNo: `BHZ${now.format('YYYYMMDD')}0001`,
      itemKind: 'product',
      itemId: 'prod-00001',
      itemCode: 'CP2610001',
      itemName: '清水离心泵 ISG50-160',
      specModel: '50*30',
      unit: '台',
      triggerStockQty: 8,
      minStockQty: 10,
      maxStockQty: 50,
      suggestQty: 42,
      handleQty: 42,
      action: 'produce',
      status: 'producing',
      source: 'alert',
      planOrderNo: 'BH202608120001',
      planId: '',
      purchaseReqNo: '',
      purchaseReqId: '',
      workOrderNo: '',
      workOrderId: '',
      triggeredAt: now.subtract(2, 'day').format('YYYY-MM-DD HH:mm'),
      handledAt: now.subtract(2, 'day').format('YYYY-MM-DD HH:mm'),
      handledBy: 'admin1',
      remark: '演示：已下生产',
      updatedAt: now.subtract(2, 'day').format('YYYY-MM-DD HH:mm'),
    },
    {
      id: 'rl-demo-2',
      ledgerNo: `BHZ${now.format('YYYYMMDD')}0002`,
      itemKind: 'material',
      itemId: '',
      itemCode: 'M-ALERT-001',
      itemName: '标准轴承演示件',
      specModel: '6205',
      unit: '个',
      triggerStockQty: 5,
      minStockQty: 20,
      maxStockQty: 100,
      suggestQty: 95,
      handleQty: 95,
      action: 'purchase',
      status: 'purchasing',
      source: 'alert',
      planOrderNo: '',
      planId: '',
      purchaseReqNo: 'PR-DEMO-BH-001',
      purchaseReqId: '',
      workOrderNo: '',
      workOrderId: '',
      triggeredAt: now.subtract(1, 'day').format('YYYY-MM-DD HH:mm'),
      handledAt: now.subtract(1, 'day').format('YYYY-MM-DD HH:mm'),
      handledBy: 'admin1',
      remark: '演示：已下采购',
      updatedAt: now.subtract(1, 'day').format('YYYY-MM-DD HH:mm'),
    },
    {
      id: 'rl-demo-3',
      ledgerNo: `BHZ${now.format('YYYYMMDD')}0003`,
      itemKind: 'material',
      itemId: '',
      itemCode: 'M-MANUAL-001',
      itemName: '手工补货演示件',
      specModel: '—',
      unit: '个',
      triggerStockQty: 120,
      minStockQty: 50,
      maxStockQty: 200,
      suggestQty: 30,
      handleQty: 30,
      action: 'work_order',
      status: 'producing',
      source: 'manual',
      planOrderNo: '',
      planId: '',
      purchaseReqNo: '',
      purchaseReqId: '',
      workOrderNo: 'WO-DEMO-BH-001',
      workOrderId: '',
      triggeredAt: now.subtract(3, 'hour').format('YYYY-MM-DD HH:mm'),
      handledAt: now.subtract(3, 'hour').format('YYYY-MM-DD HH:mm'),
      handledBy: 'admin1',
      remark: '演示：手工补货已下生产',
      updatedAt: now.subtract(3, 'hour').format('YYYY-MM-DD HH:mm'),
    },
  ]
}

const stored = loadFromStorage()

export const replenishLedgerState = reactive({
  records: stored?.length ? stored : buildDemoRecords(),
})

watch(
  () => replenishLedgerState.records,
  () => persist(),
  { deep: true },
)

function nowStr() {
  return dayjs().format('YYYY-MM-DD HH:mm')
}

function normalizeAction(action) {
  if (action === 'purchase') return 'purchase'
  if (action === 'outsource') return 'outsource'
  if (action === 'work_order') return 'work_order'
  return 'produce'
}

function statusForAction(action) {
  if (action === 'purchase') return REPLENISH_LEDGER_STATUS.PURCHASING
  if (action === 'outsource') return REPLENISH_LEDGER_STATUS.OUTSOURCING
  return REPLENISH_LEDGER_STATUS.PRODUCING
}

/**
 * 执行补货后追加流水（每次执行一条，不合并历史）
 * @param {object[]} handledRows 执行成功的补货行
 * @param {{ plan?: object, purchaseReq?: object, outsourceOrders?: object[], workOrders?: object[] }} docs
 */
export function applyReplenishExecuteToLedger(handledRows = [], docs = {}) {
  const now = nowStr()
  const plan = docs.plan
  const purchaseReq = docs.purchaseReq
  const outsourceOrders = Array.isArray(docs.outsourceOrders) ? docs.outsourceOrders : []
  const workOrders = Array.isArray(docs.workOrders) ? docs.workOrders : []
  const created = []

  handledRows.forEach((row) => {
    const code = String(row.productCode || '').trim()
    if (!code) return
    const action = normalizeAction(row.action)
    const status = statusForAction(action)
    const handleQty = Number(row.planQty) || Number(row.suggestQty) || 0
    const outsourceWo =
      action === 'outsource' ? outsourceOrders.find((o) => o.materialCode === code) || null : null
    const processWo =
      action === 'work_order' ? workOrders.find((o) => o.materialCode === code) || null : null

    const remarks = []
    if (action === 'produce' && plan) remarks.push(`关联生产计划 ${plan.orderNo}`)
    if (action === 'work_order' && processWo) remarks.push(`关联加工工单 ${processWo.code}`)
    if (action === 'purchase' && purchaseReq) remarks.push(`关联采购申请 ${purchaseReq.reqNo}`)
    if (action === 'outsource' && outsourceWo) remarks.push(`关联外协工单 ${outsourceWo.code}`)

    const record = {
      id: `rl-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      ledgerNo: nextLedgerNo(),
      itemKind: row.itemKind || 'product',
      itemId: row.productId || '',
      itemCode: code,
      itemName: row.productName || '',
      specModel: row.specModel || '',
      unit: row.unit || '件',
      triggerStockQty: Number(row.availableStock) || 0,
      minStockQty: Number(row.minStockQty) || 0,
      maxStockQty: Number(row.maxStockQty) || 0,
      suggestQty: Number(row.suggestQty) || handleQty,
      handleQty,
      action,
      status,
      source: row.manual ? 'manual' : 'alert',
      planOrderNo: action === 'produce' && plan ? plan.orderNo || '' : '',
      planId: action === 'produce' && plan ? plan.id || '' : '',
      purchaseReqNo: action === 'purchase' && purchaseReq ? purchaseReq.reqNo || '' : '',
      purchaseReqId: action === 'purchase' && purchaseReq ? purchaseReq.id || '' : '',
      workOrderNo:
        (action === 'outsource' && outsourceWo?.code) ||
        (action === 'work_order' && processWo?.code) ||
        '',
      workOrderId:
        (action === 'outsource' && outsourceWo?.id) ||
        (action === 'work_order' && processWo?.id) ||
        '',
      triggeredAt: now,
      handledAt: now,
      handledBy: 'admin1',
      remark: remarks.join('；'),
      updatedAt: now,
    }
    replenishLedgerState.records.unshift(record)
    created.push(record)
  })

  return created
}

export function filterReplenishLedgers(list, filters = {}) {
  return (list || []).filter((row) => {
    if (filters.status && row.status !== filters.status) return false
    if (filters.itemCode && !(row.itemCode || '').includes(String(filters.itemCode).trim())) {
      return false
    }
    if (filters.itemName && !(row.itemName || '').includes(String(filters.itemName).trim())) {
      return false
    }
    if (filters.ledgerNo && !(row.ledgerNo || '').includes(String(filters.ledgerNo).trim())) {
      return false
    }
    if (filters.action && row.action !== filters.action) return false
    if (filters.source && row.source !== filters.source) return false
    if (filters.dateRange?.length === 2) {
      const [start, end] = filters.dateRange
      const t = dayjs(row.triggeredAt || row.handledAt)
      if (t.isBefore(start, 'day') || t.isAfter(end, 'day')) return false
    }
    return true
  })
}
