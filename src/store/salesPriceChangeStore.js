import { reactive, watch } from 'vue'
import { persistJson } from '@/utils/safeStorage'
import dayjs from 'dayjs'
import { getSalesOrderById, recalcOrderAmounts } from '@/store/salesOrderStore'
import { AUTO_APPROVE_TYPES, isAutoApproveEnabled } from '@/store/functionParamStore'
import { recalcSalesLinePricing } from '@/utils/salesOrderPricing'
import {
  ORDER_CHANGE_HEADER_KEYS,
  PRICE_CHANGE_STATUS,
  isCustomerChanged,
  isOrderChangeHeaderChanged,
  isPriceChangeLineChanged,
  normalizePriceChangeRecord,
  recalcPriceChangeLine,
  snapshotOrderChangeHeader,
  summarizePriceChangeLines,
} from '@/utils/salesPriceChange'
import { SALES_ORDER_STATUS, normalizeSalesOrderProgressStatus } from '@/utils/salesOrderStatus'

const STORAGE_KEY = 'i_doms_sales_price_changes'
const DATA_VERSION = 4

function loadFromStorage() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw)
    if (!parsed || !Array.isArray(parsed.orders)) return null
    const version = Number(parsed.version)
    if (!Number.isFinite(version) || version < 1 || version > DATA_VERSION) return null
    return parsed.orders.map((record) => normalizePriceChangeRecord(record))
  } catch {
    /* ignore */
  }
  return null
}

function persist() {
  persistJson(STORAGE_KEY, {
    version: DATA_VERSION,
    orders: salesPriceChangeState.orders,
  })
}

function buildSeed() {
  return [
    normalizePriceChangeRecord({
      id: 'spc-seed-1',
      changeNo: 'JGBG20260515001',
      salesOrderId: 'so-seed-1',
      salesOrderNo: '1-20260512-005',
      status: PRICE_CHANGE_STATUS.APPROVED,
      reasonType: '设计变更',
      reason: '客户确认叶轮材质升级，未发货部分按新单价执行。',
      oldCustomerName: '山东化工泵业集团',
      newCustomerName: '山东化工泵业集团',
      taxModeExcluding: true,
      lines: [
        {
          salesLineId: 'line-seed-1a',
          productCode: 'CP2610001',
          productName: '清水离心泵 ISG50-160',
          specModel: 'ISG50-160',
          material: '铸铁',
          unit: '台',
          qty: 3,
          taxRate: 13,
          listUnitPriceExTax: 9800,
          oldUnitPriceExTax: 9800,
          oldUnitPriceInTax: 11074,
          newUnitPriceExTax: 10800,
          newUnitPriceInTax: 12204,
          oldLineDiscountRate: 1,
          newLineDiscountRate: 1.102,
        },
      ],
      creator: '王芳',
      createdAt: '2026-05-15 11:20',
      submitter: '王芳',
      submittedAt: '2026-05-15 11:20',
      approver: 'admin1',
      approvedAt: '2026-05-15 14:05',
      opinion: '同意按材质升级调价',
    }),
  ]
}

const stored = loadFromStorage()

export const salesPriceChangeState = reactive({
  orders: stored || buildSeed(),
})

watch(() => salesPriceChangeState.orders, persist, { deep: true })

function nextChangeNo() {
  const prefix = `JGBG${dayjs().format('YYYYMMDD')}`
  const seq =
    salesPriceChangeState.orders.filter((o) => String(o.changeNo || '').startsWith(prefix)).length +
    1
  return `${prefix}${String(seq).padStart(3, '0')}`
}

export function listPriceChangesByOrderId(salesOrderId) {
  return (salesPriceChangeState.orders || [])
    .filter((o) => o.salesOrderId === salesOrderId)
    .slice()
    .sort((a, b) => String(b.createdAt || '').localeCompare(String(a.createdAt || '')))
}

export function getPendingPriceChange(salesOrderId) {
  return (
    (salesPriceChangeState.orders || []).find(
      (o) => o.salesOrderId === salesOrderId && o.status === PRICE_CHANGE_STATUS.PENDING,
    ) || null
  )
}

export function getPendingPriceChangeDeliveryBlock(salesOrderId) {
  const pending = getPendingPriceChange(salesOrderId)
  if (!pending) return ''
  return `存在待审核的订单变更「${pending.changeNo}」，请先完成审核后再申请发货`
}

export function canApplySalesPriceChange(order) {
  return normalizeSalesOrderProgressStatus(order?.progressStatus) === SALES_ORDER_STATUS.IN_PROGRESS
}

export function submitSalesPriceChange({
  salesOrder,
  lines,
  reasonType,
  reason,
  taxModeExcluding = true,
  oldCustomerName = '',
  newCustomerName = '',
  headerOld = null,
  headerNew = null,
  operator = 'admin1',
}) {
  if (!canApplySalesPriceChange(salesOrder)) {
    return { ok: false, message: '仅「进行中」的销售订单可申请订单变更' }
  }
  if (getPendingPriceChange(salesOrder.id)) {
    return { ok: false, message: '已有待审核的订单变更，请先完成审核' }
  }
  const prepared = (lines || []).map((row) => {
    const next = { ...row }
    delete next._newDiscountPercent
    return recalcPriceChangeLine(next, {
      taxModeExcluding: taxModeExcluding !== false,
      editMode: 'unitPrice',
    })
  })
  const overOccupied = prepared.find(
    (row) => Number(row.newQty) + 1e-9 < (Number(row.appliedShipQty) || 0),
  )
  if (overOccupied) {
    return {
      ok: false,
      message: `「${overOccupied.productName || overOccupied.productCode}」销售数量不能小于已占用发货数量 ${overOccupied.appliedShipQty}`,
    }
  }
  const summary = summarizePriceChangeLines(prepared)
  const originHeader = snapshotOrderChangeHeader(headerOld || salesOrder)
  const nextHeader = snapshotOrderChangeHeader({
    ...(headerNew || salesOrder),
    customerName: newCustomerName || headerNew?.customerName || salesOrder?.customerName,
  })
  const originCustomer = String(
    oldCustomerName || originHeader.customerName || salesOrder?.customerName || '',
  ).trim()
  const nextCustomer = String(newCustomerName || nextHeader.customerName || originCustomer).trim()
  nextHeader.customerName = nextCustomer
  const customerChanged = isCustomerChanged({
    oldCustomerName: originCustomer,
    newCustomerName: nextCustomer,
  })
  const headerChanged = isOrderChangeHeaderChanged(originHeader, nextHeader)
  if (!summary.changedCount && !customerChanged && !headerChanged) {
    return { ok: false, message: '请至少修改一项基本信息或一行明细' }
  }
  if (!reasonType) {
    return { ok: false, message: '请选择变更原因' }
  }
  if (!nextCustomer) {
    return { ok: false, message: '请选择客户名称' }
  }

  const now = dayjs().format('YYYY-MM-DD HH:mm')
  const record = {
    id: `spc-${Date.now()}`,
    changeNo: nextChangeNo(),
    salesOrderId: salesOrder.id,
    salesOrderNo: salesOrder.orderNo,
    status: PRICE_CHANGE_STATUS.PENDING,
    reasonType,
    reason: String(reason || '').trim(),
    taxModeExcluding: taxModeExcluding !== false,
    oldCustomerName: originCustomer,
    newCustomerName: nextCustomer,
    headerOld: originHeader,
    headerNew: nextHeader,
    lines: prepared,
    oldAmountExTax: summary.oldAmountExTax,
    newAmountExTax: summary.newAmountExTax,
    deltaAmountExTax: summary.deltaAmountExTax,
    oldAmountInTax: summary.oldAmountInTax,
    newAmountInTax: summary.newAmountInTax,
    deltaAmountInTax: summary.deltaAmountInTax,
    creator: operator,
    createdAt: now,
    submitter: operator,
    submittedAt: now,
    approver: '',
    approvedAt: '',
    opinion: '',
    autoApproved: false,
  }
  salesPriceChangeState.orders.unshift(record)
  persist()

  if (isAutoApproveEnabled(AUTO_APPROVE_TYPES.SALES_ORDER_PRICE_CHANGE)) {
    const approved = approveSalesPriceChange(record.id, operator, '系统自动审批通过', {
      autoApproved: true,
    })
    if (!approved.ok) return approved
    return {
      ok: true,
      record: approved.change,
      autoApproved: true,
      message: '订单变更已自动审批通过，订单信息已更新',
    }
  }

  return { ok: true, record, message: '订单变更已提交审核' }
}

function applyApprovedPrices(change) {
  const order = getSalesOrderById(change.salesOrderId)
  if (!order) return { ok: false, message: '销售订单不存在' }
  const lineMap = new Map((order.lineItems || []).map((l) => [l.id, l]))
  const taxModeExcluding = change.taxModeExcluding !== false
  const headerNew = change.headerNew
  if (headerNew) {
    ORDER_CHANGE_HEADER_KEYS.forEach((key) => {
      if (headerNew[key] === undefined) return
      order[key] = headerNew[key]
    })
  } else if (isCustomerChanged(change)) {
    order.customerName = String(change.newCustomerName || '').trim()
  }
  for (const row of change.lines || []) {
    const line = lineMap.get(row.salesLineId)
    if (!line || !isPriceChangeLineChanged(row)) continue
    const nextQty = Number(row.newQty)
    if (Number.isFinite(nextQty)) {
      line.salesQty = nextQty
      line.qty = nextQty
    }
    if (row.newDeliveryDate != null) {
      line.deliveryDate = String(row.newDeliveryDate || '').slice(0, 10)
    }
    if (row.newTaxRate != null && row.newTaxRate !== '') {
      line.taxRate = Number(row.newTaxRate) || 0
    }
    line.cancelled = Boolean(row.cancelled)
    if (taxModeExcluding) {
      const newEx = Number(row.newUnitPriceExTax)
      if (Number.isFinite(newEx)) line.unitPriceExTax = newEx
      recalcSalesLinePricing(line, { taxModeExcluding: true, editMode: 'unitPrice' })
    } else {
      const newIn = Number(row.newUnitPriceInTax)
      line.unitPriceInTax = Number.isFinite(newIn) ? newIn : Number(line.unitPriceInTax) || 0
      recalcSalesLinePricing(line, { taxModeExcluding: false, editMode: 'unitPrice' })
    }
  }
  recalcOrderAmounts(order)
  return { ok: true, order }
}

export function approveSalesPriceChange(id, operator = 'admin1', opinion = '', extra = {}) {
  const change = salesPriceChangeState.orders.find((o) => o.id === id)
  if (!change) return { ok: false, message: '订单变更单不存在' }
  if (change.status !== PRICE_CHANGE_STATUS.PENDING) {
    return { ok: false, message: '仅待审核单据可通过' }
  }
  const applied = applyApprovedPrices(change)
  if (!applied.ok) return applied
  change.status = PRICE_CHANGE_STATUS.APPROVED
  change.approver = operator
  change.approvedAt = dayjs().format('YYYY-MM-DD HH:mm')
  change.opinion = opinion || '同意'
  change.autoApproved = Boolean(extra.autoApproved)
  persist()
  return { ok: true, change, message: '订单变更已通过，订单信息已更新' }
}

export function rejectSalesPriceChange(id, operator = 'admin1', opinion = '') {
  const change = salesPriceChangeState.orders.find((o) => o.id === id)
  if (!change) return { ok: false, message: '订单变更单不存在' }
  if (change.status !== PRICE_CHANGE_STATUS.PENDING) {
    return { ok: false, message: '仅待审核单据可驳回' }
  }
  change.status = PRICE_CHANGE_STATUS.REJECTED
  change.approver = operator
  change.approvedAt = dayjs().format('YYYY-MM-DD HH:mm')
  change.opinion = opinion || '驳回'
  persist()
  return { ok: true, change, message: '订单变更已驳回' }
}
