/**
 * 外协订单价格变更：状态、重算、汇总、审批展示
 * 逻辑与样式对齐采购订单价格变更；计价数量取计划数量 planQty；支持「取消行」。
 */
import { formatNumber, roundNumber } from '@/utils/numberFormat'
import { wxLineHasReceiptOrInboundDoc } from '@/utils/outsourcingInbound'

export const OUTSOURCING_PRICE_CHANGE_STATUS = {
  PENDING: '待审核',
  APPROVED: '已通过',
  REJECTED: '已驳回',
}

export const OUTSOURCING_PRICE_CHANGE_REASON_OPTIONS = [
  { value: '供应商调价', label: '供应商调价' },
  { value: '材质变更', label: '材质变更' },
  { value: '汇率调整', label: '汇率调整' },
  { value: '合同议价', label: '合同议价' },
  { value: '其他', label: '其他' },
]

/** 变更单号前缀：外协价格变更 */
export const OUTSOURCING_PRICE_CHANGE_NO_PREFIX = 'WXJGBG'

export function outsourcingPriceChangeStatusColor(status) {
  if (status === OUTSOURCING_PRICE_CHANGE_STATUS.APPROVED) return 'success'
  if (status === OUTSOURCING_PRICE_CHANGE_STATUS.REJECTED) return 'error'
  if (status === OUTSOURCING_PRICE_CHANGE_STATUS.PENDING) return 'warning'
  return 'default'
}

export function round2(n) {
  const r = roundNumber(Number(n) || 0, 4)
  return Number.isFinite(r) ? r : 0
}

export function lineChangeAmount(qty, unitPrice) {
  return round2((Number(qty) || 0) * (Number(unitPrice) || 0))
}

function deriveInTax(ex, taxRate) {
  return round2((Number(ex) || 0) * (1 + (Number(taxRate) || 0) / 100))
}

function deriveExTax(inc, taxRate) {
  const rate = Number(taxRate) || 0
  const inTax = Number(inc) || 0
  return rate >= 0 ? round2(inTax / (1 + rate / 100)) : round2(inTax)
}

/** 未生成收货/入库单时才可「取消行」 */
export function canCancelOutsourcingPriceChangeLine(row) {
  if (!row || row.cancelled || row.oldCancelled) return false
  return !row.hasReceiptOrInbound
}

export function isOutsourcingPriceChangeLineChanged(row) {
  if (!row) return false
  if (Boolean(row.cancelled) !== Boolean(row.oldCancelled)) return true
  const priceChanged = [
    [row.newUnitPriceExTax, row.oldUnitPriceExTax],
    [row.newUnitPriceInTax, row.oldUnitPriceInTax],
    [row.newQty, row.oldQty],
  ].some(([a, b]) => Math.abs((Number(a) || 0) - (Number(b) || 0)) > 1e-9)
  if (priceChanged) return true
  const oldBilling = String(row.oldBillingMethod || '').trim()
  const newBilling = String(row.billingMethod || '').trim()
  return Boolean(newBilling) && newBilling !== oldBilling
}

export function buildOutsourcingPriceChangeDraftLines(order) {
  return (order?.lineItems || [])
    .filter((line) => line.productName || line.itemName || line.productCode || line.itemCode)
    .map((line) => {
      const qty = Number(line.planQty) || 0
      const taxRate = Number(line.taxRate) || 13
      const oldUnitPriceExTax = round2(Number(line.unitPriceExTax) || 0)
      const oldUnitPriceInTax = round2(
        Number(line.unitPriceInTax) || deriveInTax(oldUnitPriceExTax, taxRate),
      )
      const billingMethod = String(line.billingMethod || '').trim() || '按件数'
      const alreadyCancelled = Boolean(line.cancelled)
      const row = {
        ooLineId: line.id,
        productCode: line.productCode || line.itemCode || '',
        productName: line.productName || line.itemName || '',
        specModel: line.specModel || '',
        material: line.material || '',
        unit: line.unit || '',
        qty,
        oldQty: qty,
        newQty: qty,
        planQty: qty,
        oldPlanQty: qty,
        newPlanQty: qty,
        taxRate,
        oldBillingMethod: billingMethod,
        billingMethod,
        oldCancelled: alreadyCancelled,
        cancelled: alreadyCancelled,
        hasReceiptOrInbound: wxLineHasReceiptOrInboundDoc(order, line),
        oldUnitPriceExTax,
        oldUnitPriceInTax,
        newUnitPriceExTax: oldUnitPriceExTax,
        newUnitPriceInTax: oldUnitPriceInTax,
      }
      return recalcOutsourcingPriceChangeLine(row, { taxModeExcluding: true })
    })
}

export function recalcOutsourcingPriceChangeLine(row, options = {}) {
  const taxModeExcluding = options.taxModeExcluding !== false
  const oldQty = Number(row.oldQty ?? row.qty) || 0
  let newQty = Number(row.newQty ?? row.qty) || 0
  if (row.cancelled) newQty = 0
  const oldPlanQty = Number(row.oldPlanQty ?? row.planQty) || 0
  let newPlanQty = Number(row.newPlanQty ?? row.planQty) || 0
  if (row.cancelled) newPlanQty = 0
  const taxRate = Number(row.taxRate) || 0
  row.taxRate = taxRate
  row.oldQty = oldQty
  row.newQty = newQty
  row.qty = newQty
  row.oldPlanQty = oldPlanQty
  row.newPlanQty = newPlanQty
  row.planQty = newPlanQty

  row.oldUnitPriceExTax = round2(Number(row.oldUnitPriceExTax) || 0)
  row.oldUnitPriceInTax = round2(
    Number(row.oldUnitPriceInTax) || deriveInTax(row.oldUnitPriceExTax, taxRate),
  )
  row.oldAmountExTax = lineChangeAmount(oldQty, row.oldUnitPriceExTax)
  row.oldAmountInTax = lineChangeAmount(oldQty, row.oldUnitPriceInTax)

  if (taxModeExcluding) {
    row.newUnitPriceExTax = round2(Number(row.newUnitPriceExTax) || 0)
    row.newUnitPriceInTax = deriveInTax(row.newUnitPriceExTax, taxRate)
  } else {
    row.newUnitPriceInTax = round2(Number(row.newUnitPriceInTax) || 0)
    row.newUnitPriceExTax = deriveExTax(row.newUnitPriceInTax, taxRate)
  }

  row.newAmountExTax = lineChangeAmount(newQty, row.newUnitPriceExTax)
  row.newAmountInTax = lineChangeAmount(newQty, row.newUnitPriceInTax)
  row.deltaAmountExTax = round2(row.newAmountExTax - row.oldAmountExTax)
  row.deltaAmountInTax = round2(row.newAmountInTax - row.oldAmountInTax)
  return row
}

export function summarizeOutsourcingPriceChangeLines(lines = []) {
  const changed = (lines || []).filter(isOutsourcingPriceChangeLineChanged)
  const oldAmountExTax = round2(
    (lines || []).reduce((s, row) => s + (Number(row.oldAmountExTax) || 0), 0),
  )
  const newAmountExTax = round2(
    (lines || []).reduce((s, row) => s + (Number(row.newAmountExTax) || 0), 0),
  )
  const oldAmountInTax = round2(
    (lines || []).reduce((s, row) => s + (Number(row.oldAmountInTax) || 0), 0),
  )
  const newAmountInTax = round2(
    (lines || []).reduce((s, row) => s + (Number(row.newAmountInTax) || 0), 0),
  )
  return {
    changedCount: changed.length,
    oldAmountExTax,
    newAmountExTax,
    deltaAmountExTax: round2(newAmountExTax - oldAmountExTax),
    oldAmountInTax,
    newAmountInTax,
    deltaAmountInTax: round2(newAmountInTax - oldAmountInTax),
    changedLines: changed,
  }
}

export function normalizeOutsourcingPriceChangeLine(row, taxModeExcluding = true) {
  const next = { ...row }
  if (next.taxRate == null || next.taxRate === '') next.taxRate = 13
  const billing = String(next.billingMethod || next.oldBillingMethod || '').trim() || '按件数'
  if (!String(next.oldBillingMethod || '').trim()) next.oldBillingMethod = billing
  if (!String(next.billingMethod || '').trim()) next.billingMethod = billing
  if (next.oldQty == null) next.oldQty = Number(next.qty) || 0
  if (next.newQty == null) next.newQty = Number(next.qty) || 0
  if (next.oldPlanQty == null) next.oldPlanQty = Number(next.planQty ?? next.qty) || 0
  if (next.newPlanQty == null) next.newPlanQty = Number(next.planQty ?? next.qty) || 0
  if (next.oldCancelled == null) next.oldCancelled = false
  if (next.cancelled == null) next.cancelled = Boolean(next.oldCancelled)
  if (next.hasReceiptOrInbound == null) next.hasReceiptOrInbound = false
  return recalcOutsourcingPriceChangeLine(next, { taxModeExcluding })
}

export function normalizeOutsourcingPriceChangeRecord(record) {
  if (!record) return record
  const taxModeExcluding = record.taxModeExcluding !== false
  const lines = (record.lines || []).map((row) =>
    normalizeOutsourcingPriceChangeLine(row, taxModeExcluding),
  )
  const summary = summarizeOutsourcingPriceChangeLines(lines)
  return {
    ...record,
    taxModeExcluding,
    lines,
    oldAmountExTax: summary.oldAmountExTax,
    newAmountExTax: summary.newAmountExTax,
    deltaAmountExTax: summary.deltaAmountExTax,
    oldAmountInTax: summary.oldAmountInTax,
    newAmountInTax: summary.newAmountInTax,
    deltaAmountInTax: summary.deltaAmountInTax,
  }
}

function formatGroupedSmartMoney(absVal, maxDecimals = 4) {
  const text = formatNumber(absVal, maxDecimals, { empty: '' })
  if (!text) return '—'
  const neg = text.startsWith('-')
  const raw = neg ? text.slice(1) : text
  const [intPart, dec] = raw.split('.')
  const withSep = Number(intPart).toLocaleString('zh-CN')
  return `${neg ? '-' : ''}${withSep}${dec != null ? `.${dec}` : ''}`
}

export function formatOutsourcingPriceChangeMoney(val) {
  const n = Number(val)
  if (!Number.isFinite(n)) return '—'
  const prefix = n > 0 ? '+' : n < 0 ? '-' : ''
  return `${prefix}￥${formatGroupedSmartMoney(Math.abs(n))}`
}

export function formatOutsourcingPriceChangeAbsMoney(val) {
  const n = Number(val)
  if (!Number.isFinite(n)) return '—'
  const sign = n < 0 ? '-' : ''
  return `${sign}￥${formatGroupedSmartMoney(Math.abs(n))}`
}

export function buildOutsourcingPriceChangeApprovalGroups(changes = []) {
  return (changes || []).map((change) => {
    const items = [
      {
        name: change.submitter || change.creator || '—',
        role: '订单变更申请',
        result: '已提交',
        time: change.submittedAt || change.createdAt || '—',
        opinion: [change.reasonType, change.reason].filter(Boolean).join('：'),
      },
    ]
    if (
      change.status === OUTSOURCING_PRICE_CHANGE_STATUS.APPROVED ||
      change.status === OUTSOURCING_PRICE_CHANGE_STATUS.REJECTED
    ) {
      items.push({
        name: change.approver || '—',
        role: change.autoApproved ? '系统自动审批' : '订单变更审核',
        result: change.status === OUTSOURCING_PRICE_CHANGE_STATUS.APPROVED ? '已通过' : '已驳回',
        time: change.approvedAt || '—',
        opinion: change.opinion || '',
      })
    } else {
      items.push({
        name: '—',
        role: '订单变更审核',
        result: '待审核',
        time: '',
        opinion: '',
      })
    }
    return {
      id: change.id,
      changeNo: change.changeNo,
      status: change.status,
      reasonType: change.reasonType,
      items,
    }
  })
}
