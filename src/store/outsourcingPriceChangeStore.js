/**
 * 外协订单价格变更：申请 / 审核 / 回写订单有效价
 */
import { reactive, watch } from 'vue'
import dayjs from 'dayjs'
import { getOutsourcingOrderById } from '@/store/outsourcingOrderStore'
import { recalcOutsourcingLine, recalcOutsourcingTotals } from '@/mock/outsourcingOrders'
import { AUTO_APPROVE_TYPES, isAutoApproveEnabled } from '@/store/functionParamStore'
import {
  OUTSOURCING_PRICE_CHANGE_NO_PREFIX,
  OUTSOURCING_PRICE_CHANGE_STATUS,
  normalizeOutsourcingPriceChangeRecord,
  recalcOutsourcingPriceChangeLine,
  summarizeOutsourcingPriceChangeLines,
} from '@/utils/outsourcingPriceChange'

const STORAGE_KEY = 'i_doms_outsourcing_price_changes'
const DATA_VERSION = 1

function loadFromStorage() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw)
    if (!parsed || !Array.isArray(parsed.orders)) return null
    if (parsed.version !== DATA_VERSION) return null
    return parsed.orders.map((record) => normalizeOutsourcingPriceChangeRecord(record))
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
      orders: outsourcingPriceChangeState.orders,
    }),
  )
}

function buildSeed() {
  return [
    normalizeOutsourcingPriceChangeRecord({
      id: 'opc-seed-1',
      changeNo: 'WXJGBG20260810001',
      outsourcingOrderId: 'wx-2',
      outsourcingOrderNo: 'WX-260807001',
      status: OUTSOURCING_PRICE_CHANGE_STATUS.APPROVED,
      reasonType: '供应商调价',
      reason: '外协加工费上调，未回货部分按新单价执行。',
      taxModeExcluding: true,
      lines: [
        {
          ooLineId: 'wx-2-line-1',
          productCode: 'MAT-BRG-SLEEVE',
          productName: '轴承套',
          specModel: 'φ50',
          material: '45#',
          unit: '件',
          qty: 30,
          taxRate: 13,
          oldBillingMethod: '按件数',
          billingMethod: '按件数',
          oldUnitPriceExTax: 22,
          oldUnitPriceInTax: 24.86,
          newUnitPriceExTax: 24,
          newUnitPriceInTax: 27.12,
        },
      ],
      creator: '采购员A',
      createdAt: '2026-08-10 11:20',
      submitter: '采购员A',
      submittedAt: '2026-08-10 11:20',
      approver: 'admin1',
      approvedAt: '2026-08-10 16:05',
      opinion: '同意按供应商调价',
    }),
  ]
}

const stored = loadFromStorage()

export const outsourcingPriceChangeState = reactive({
  orders: stored || buildSeed(),
})

watch(() => outsourcingPriceChangeState.orders, persist, { deep: true })

function nextChangeNo() {
  const prefix = `${OUTSOURCING_PRICE_CHANGE_NO_PREFIX}${dayjs().format('YYYYMMDD')}`
  const seq =
    outsourcingPriceChangeState.orders.filter((o) => String(o.changeNo || '').startsWith(prefix))
      .length + 1
  return `${prefix}${String(seq).padStart(3, '0')}`
}

export function listOutsourcingPriceChangesByOrderId(outsourcingOrderId) {
  return (outsourcingPriceChangeState.orders || [])
    .filter((o) => o.outsourcingOrderId === outsourcingOrderId)
    .slice()
    .sort((a, b) => String(b.createdAt || '').localeCompare(String(a.createdAt || '')))
}

export function getPendingOutsourcingPriceChange(outsourcingOrderId) {
  return (
    (outsourcingPriceChangeState.orders || []).find(
      (o) =>
        o.outsourcingOrderId === outsourcingOrderId &&
        o.status === OUTSOURCING_PRICE_CHANGE_STATUS.PENDING,
    ) || null
  )
}

/** 待审价格变更时阻断收货 / 入库 / 结算 */
export function getPendingOutsourcingPriceChangeBlock(
  outsourcingOrderId,
  actionLabel = '继续操作',
) {
  const pending = getPendingOutsourcingPriceChange(outsourcingOrderId)
  if (!pending) return ''
  return `存在待审核的价格变更「${pending.changeNo}」，请先完成审核后再${actionLabel}`
}

export function canApplyOutsourcingPriceChange(order) {
  const status = String(order?.status || '').trim()
  return status === '进行中' || status === '已完成'
}

export function submitOutsourcingPriceChange({
  outsourcingOrder,
  lines,
  reasonType,
  reason,
  taxModeExcluding = true,
  operator = 'admin1',
}) {
  if (!canApplyOutsourcingPriceChange(outsourcingOrder)) {
    return { ok: false, message: '仅「进行中 / 已完成」的外协订单可申请价格变更' }
  }
  if (getPendingOutsourcingPriceChange(outsourcingOrder.id)) {
    return { ok: false, message: '已有待审核的价格变更，请先完成审核' }
  }
  const prepared = (lines || []).map((row) =>
    recalcOutsourcingPriceChangeLine({ ...row }, { taxModeExcluding: taxModeExcluding !== false }),
  )
  const summary = summarizeOutsourcingPriceChangeLines(prepared)
  if (!summary.changedCount) {
    return { ok: false, message: '请至少修改一行单价或计费方式' }
  }
  if (!reasonType) {
    return { ok: false, message: '请选择变更原因' }
  }

  const now = dayjs().format('YYYY-MM-DD HH:mm')
  const record = {
    id: `opc-${Date.now()}`,
    changeNo: nextChangeNo(),
    outsourcingOrderId: outsourcingOrder.id,
    outsourcingOrderNo: outsourcingOrder.orderNo,
    status: OUTSOURCING_PRICE_CHANGE_STATUS.PENDING,
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
  outsourcingPriceChangeState.orders.unshift(record)
  persist()

  if (isAutoApproveEnabled(AUTO_APPROVE_TYPES.OUTSOURCING_ORDER_PRICE_CHANGE)) {
    const approved = approveOutsourcingPriceChange(record.id, operator, '系统自动审批通过', {
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

function findOoLineForPriceChange(order, row) {
  const lines = order?.lineItems || []
  if (row?.ooLineId) {
    const byId = lines.find((l) => l.id === row.ooLineId)
    if (byId) return byId
  }
  const code = String(row?.productCode || '').trim()
  if (!code) return null
  const hits = lines.filter((l) => String(l.productCode || l.itemCode || '').trim() === code)
  return hits.length === 1 ? hits[0] : null
}

function applyApprovedPrices(change) {
  const order = getOutsourcingOrderById(change.outsourcingOrderId)
  if (!order) return { ok: false, message: '外协订单不存在' }
  const taxModeExcluding = change.taxModeExcluding !== false
  let appliedCount = 0
  for (const row of change.lines || []) {
    const line = findOoLineForPriceChange(order, row)
    if (!line) continue
    const newEx = Number(row.newUnitPriceExTax)
    const oldEx = Number(row.oldUnitPriceExTax)
    const newIn = Number(row.newUnitPriceInTax)
    const oldIn = Number(row.oldUnitPriceInTax)
    const priceChanged =
      (Number.isFinite(newEx) && Math.abs(newEx - oldEx) > 1e-9) ||
      (Number.isFinite(newIn) && Math.abs(newIn - oldIn) > 1e-9)
    const newBilling = String(row.billingMethod || '').trim()
    const oldBilling = String(row.oldBillingMethod || line.billingMethod || '').trim()
    const billingChanged = Boolean(newBilling) && newBilling !== oldBilling
    if (!priceChanged && !billingChanged) continue
    if (priceChanged) {
      if (taxModeExcluding) {
        line.unitPriceExTax = newEx
        recalcOutsourcingLine(line, { fromInTax: false })
      } else {
        const inTax = Number.isFinite(newIn) ? newIn : Number(line.unitPriceInTax) || 0
        line.unitPriceInTax = inTax
        recalcOutsourcingLine(line, { fromInTax: true })
      }
    }
    if (billingChanged) {
      line.billingMethod = newBilling
    }
    row.ooLineId = line.id
    appliedCount += 1
  }
  if (!appliedCount) {
    return {
      ok: false,
      message: '未能回写订单（未匹配到外协明细行），请重新发起价格变更',
    }
  }
  recalcOutsourcingTotals(order)
  order.updater = change.approver || change.submitter || order.updater || 'admin1'
  order.updatedAt = dayjs().format('YYYY-MM-DD HH:mm:ss')
  order.lineItems = [...(order.lineItems || [])]
  return { ok: true, order, appliedCount }
}

export function approveOutsourcingPriceChange(id, operator = 'admin1', opinion = '', extra = {}) {
  const change = outsourcingPriceChangeState.orders.find((o) => o.id === id)
  if (!change) return { ok: false, message: '价格变更单不存在' }
  if (change.status !== OUTSOURCING_PRICE_CHANGE_STATUS.PENDING) {
    return { ok: false, message: '仅待审核单据可通过' }
  }
  const applied = applyApprovedPrices(change)
  if (!applied.ok) return applied
  change.status = OUTSOURCING_PRICE_CHANGE_STATUS.APPROVED
  change.approver = operator
  change.approvedAt = dayjs().format('YYYY-MM-DD HH:mm')
  change.opinion = opinion || '同意'
  change.autoApproved = Boolean(extra.autoApproved)
  persist()
  return { ok: true, change, message: '价格变更已通过，订单有效价已更新' }
}

export function rejectOutsourcingPriceChange(id, operator = 'admin1', opinion = '') {
  const change = outsourcingPriceChangeState.orders.find((o) => o.id === id)
  if (!change) return { ok: false, message: '价格变更单不存在' }
  if (change.status !== OUTSOURCING_PRICE_CHANGE_STATUS.PENDING) {
    return { ok: false, message: '仅待审核单据可驳回' }
  }
  change.status = OUTSOURCING_PRICE_CHANGE_STATUS.REJECTED
  change.approver = operator
  change.approvedAt = dayjs().format('YYYY-MM-DD HH:mm')
  change.opinion = opinion || '驳回'
  persist()
  return { ok: true, change, message: '价格变更已驳回' }
}
