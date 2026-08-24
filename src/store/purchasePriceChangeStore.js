/**
 * 采购订单价格变更：申请 / 审核 / 回写订单有效价
 */
import { reactive, watch } from 'vue'
import dayjs from 'dayjs'
import { getPurchaseOrderById, recalcPoLine } from '@/store/purchaseOrderStore'
import { recalcPurchaseOrderTotals } from '@/mock/purchaseOrders'
import { AUTO_APPROVE_TYPES, isAutoApproveEnabled } from '@/store/functionParamStore'
import {
  PURCHASE_PRICE_CHANGE_NO_PREFIX,
  PURCHASE_PRICE_CHANGE_STATUS,
  normalizePurchasePriceChangeRecord,
  recalcPurchasePriceChangeLine,
  summarizePurchasePriceChangeLines,
} from '@/utils/purchasePriceChange'

const STORAGE_KEY = 'i_doms_purchase_price_changes'
const DATA_VERSION = 1

function loadFromStorage() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw)
    if (!parsed || !Array.isArray(parsed.orders)) return null
    if (parsed.version !== DATA_VERSION) return null
    return parsed.orders.map((record) => normalizePurchasePriceChangeRecord(record))
  } catch {
    /* ignore */
  }
  return null
}

function persist() {
  localStorage.setItem(
    STORAGE_KEY,
    JSON.stringify({
      version: DATA_VERSION,
      orders: purchasePriceChangeState.orders,
    }),
  )
}

function buildSeed() {
  return [
    normalizePurchasePriceChangeRecord({
      id: 'ppc-seed-1',
      changeNo: 'CGJGBG20260810001',
      purchaseOrderId: 'po-3',
      purchaseOrderNo: 'CG20260803001',
      status: PURCHASE_PRICE_CHANGE_STATUS.APPROVED,
      reasonType: '供应商调价',
      reason: '钢管原料涨价，未入库部分按新单价执行。',
      taxModeExcluding: true,
      lines: [
        {
          poLineId: 'po-line-seed-pipe50',
          productCode: 'MAT-PIPE-50',
          productName: '无缝钢管',
          specModel: 'φ50×5',
          material: '20#',
          unit: '根',
          qty: 80,
          taxRate: 13,
          oldUnitPriceExTax: 120,
          oldUnitPriceInTax: 135.6,
          newUnitPriceExTax: 128,
          newUnitPriceInTax: 144.64,
        },
      ],
      creator: '采购员A',
      createdAt: '2026-08-10 10:20',
      submitter: '采购员A',
      submittedAt: '2026-08-10 10:20',
      approver: 'admin1',
      approvedAt: '2026-08-10 15:05',
      opinion: '同意按供应商调价',
    }),
  ]
}

const stored = loadFromStorage()

export const purchasePriceChangeState = reactive({
  orders: stored || buildSeed(),
})

watch(() => purchasePriceChangeState.orders, persist, { deep: true })

function nextChangeNo() {
  const prefix = `${PURCHASE_PRICE_CHANGE_NO_PREFIX}${dayjs().format('YYYYMMDD')}`
  const seq =
    purchasePriceChangeState.orders.filter((o) => String(o.changeNo || '').startsWith(prefix))
      .length + 1
  return `${prefix}${String(seq).padStart(3, '0')}`
}

export function listPurchasePriceChangesByOrderId(purchaseOrderId) {
  return (purchasePriceChangeState.orders || [])
    .filter((o) => o.purchaseOrderId === purchaseOrderId)
    .slice()
    .sort((a, b) => String(b.createdAt || '').localeCompare(String(a.createdAt || '')))
}

export function getPendingPurchasePriceChange(purchaseOrderId) {
  return (
    (purchasePriceChangeState.orders || []).find(
      (o) =>
        o.purchaseOrderId === purchaseOrderId && o.status === PURCHASE_PRICE_CHANGE_STATUS.PENDING,
    ) || null
  )
}

/** 待审价格变更时阻断收货 / 入库 / 结算 */
export function getPendingPurchasePriceChangeBlock(purchaseOrderId, actionLabel = '继续操作') {
  const pending = getPendingPurchasePriceChange(purchaseOrderId)
  if (!pending) return ''
  return `存在待审核的价格变更「${pending.changeNo}」，请先完成审核后再${actionLabel}`
}

export function canApplyPurchasePriceChange(order) {
  const status = String(order?.status || '').trim()
  return status === '进行中' || status === '已完成'
}

export function submitPurchasePriceChange({
  purchaseOrder,
  lines,
  reasonType,
  reason,
  taxModeExcluding = true,
  operator = 'admin1',
}) {
  if (!canApplyPurchasePriceChange(purchaseOrder)) {
    return { ok: false, message: '仅「进行中 / 已完成」的采购订单可申请价格变更' }
  }
  if (getPendingPurchasePriceChange(purchaseOrder.id)) {
    return { ok: false, message: '已有待审核的价格变更，请先完成审核' }
  }
  const prepared = (lines || []).map((row) =>
    recalcPurchasePriceChangeLine({ ...row }, { taxModeExcluding: taxModeExcluding !== false }),
  )
  const summary = summarizePurchasePriceChangeLines(prepared)
  if (!summary.changedCount) {
    return { ok: false, message: '请至少修改一行单价' }
  }
  if (!reasonType) {
    return { ok: false, message: '请选择变更原因' }
  }

  const now = dayjs().format('YYYY-MM-DD HH:mm')
  const record = {
    id: `ppc-${Date.now()}`,
    changeNo: nextChangeNo(),
    purchaseOrderId: purchaseOrder.id,
    purchaseOrderNo: purchaseOrder.orderNo,
    status: PURCHASE_PRICE_CHANGE_STATUS.PENDING,
    reasonType,
    reason: String(reason || '').trim(),
    taxModeExcluding: taxModeExcluding !== false,
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
  purchasePriceChangeState.orders.unshift(record)
  persist()

  if (isAutoApproveEnabled(AUTO_APPROVE_TYPES.PURCHASE_ORDER_PRICE_CHANGE)) {
    const approved = approvePurchasePriceChange(record.id, operator, '系统自动审批通过', {
      autoApproved: true,
    })
    if (!approved.ok) return approved
    return {
      ok: true,
      record: approved.change,
      autoApproved: true,
      message: '价格变更已自动审批通过，订单有效价已更新',
    }
  }

  return { ok: true, record, message: '价格变更已提交审核' }
}

function findPoLineForPriceChange(order, row) {
  const lines = order?.lineItems || []
  if (row?.poLineId) {
    const byId = lines.find((l) => l.id === row.poLineId)
    if (byId) return byId
  }
  const code = String(row?.productCode || '').trim()
  if (!code) return null
  const hits = lines.filter((l) => String(l.productCode || l.itemCode || '').trim() === code)
  return hits.length === 1 ? hits[0] : null
}

function applyApprovedPrices(change) {
  const order = getPurchaseOrderById(change.purchaseOrderId)
  if (!order) return { ok: false, message: '采购订单不存在' }
  const taxModeExcluding = change.taxModeExcluding !== false
  let appliedCount = 0
  for (const row of change.lines || []) {
    const line = findPoLineForPriceChange(order, row)
    if (!line) continue
    const newEx = Number(row.newUnitPriceExTax)
    const oldEx = Number(row.oldUnitPriceExTax)
    const newIn = Number(row.newUnitPriceInTax)
    const oldIn = Number(row.oldUnitPriceInTax)
    const priceChanged =
      (Number.isFinite(newEx) && Math.abs(newEx - oldEx) > 1e-9) ||
      (Number.isFinite(newIn) && Math.abs(newIn - oldIn) > 1e-9)
    if (!priceChanged) continue
    if (taxModeExcluding) {
      line.unitPriceExTax = newEx
    } else {
      const rate = Number(line.taxRate) || 0
      const inTax = Number.isFinite(newIn) ? newIn : Number(line.unitPriceInTax) || 0
      line.unitPriceInTax = inTax
      line.unitPriceExTax = rate >= 0 ? Math.round((inTax / (1 + rate / 100)) * 100) / 100 : inTax
    }
    recalcPoLine(line)
    // 同步变更单上的行 id，避免后续再审/履历对不上
    row.poLineId = line.id
    appliedCount += 1
  }
  if (!appliedCount) {
    return { ok: false, message: '未能回写订单单价（未匹配到采购明细行），请重新发起价格变更' }
  }
  recalcPurchaseOrderTotals(order)
  order.updater = change.approver || change.submitter || order.updater || 'admin1'
  order.updatedAt = dayjs().format('YYYY-MM-DD HH:mm:ss')
  // 触发明细表与汇总刷新
  order.lineItems = [...(order.lineItems || [])]
  return { ok: true, order, appliedCount }
}

export function approvePurchasePriceChange(id, operator = 'admin1', opinion = '', extra = {}) {
  const change = purchasePriceChangeState.orders.find((o) => o.id === id)
  if (!change) return { ok: false, message: '价格变更单不存在' }
  if (change.status !== PURCHASE_PRICE_CHANGE_STATUS.PENDING) {
    return { ok: false, message: '仅待审核单据可通过' }
  }
  const applied = applyApprovedPrices(change)
  if (!applied.ok) return applied
  change.status = PURCHASE_PRICE_CHANGE_STATUS.APPROVED
  change.approver = operator
  change.approvedAt = dayjs().format('YYYY-MM-DD HH:mm')
  change.opinion = opinion || '同意'
  change.autoApproved = Boolean(extra.autoApproved)
  persist()
  return { ok: true, change, message: '价格变更已通过，订单有效价已更新' }
}

export function rejectPurchasePriceChange(id, operator = 'admin1', opinion = '') {
  const change = purchasePriceChangeState.orders.find((o) => o.id === id)
  if (!change) return { ok: false, message: '价格变更单不存在' }
  if (change.status !== PURCHASE_PRICE_CHANGE_STATUS.PENDING) {
    return { ok: false, message: '仅待审核单据可驳回' }
  }
  change.status = PURCHASE_PRICE_CHANGE_STATUS.REJECTED
  change.approver = operator
  change.approvedAt = dayjs().format('YYYY-MM-DD HH:mm')
  change.opinion = opinion || '驳回'
  persist()
  return { ok: true, change, message: '价格变更已驳回' }
}
