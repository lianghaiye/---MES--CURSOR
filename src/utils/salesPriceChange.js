import {
  formatDiscountRatePercent,
  normalizeDiscountRate,
  round2,
  round4,
} from '@/utils/salesOrderPricing'

export const PRICE_CHANGE_STATUS = {
  PENDING: '待审核',
  APPROVED: '已通过',
  REJECTED: '已驳回',
}

export const PRICE_CHANGE_REASON_OPTIONS = [
  { value: '客户增配', label: '客户增配' },
  { value: '设计变更', label: '设计变更' },
  { value: '材质升级', label: '材质升级' },
  { value: '工艺加价', label: '工艺加价' },
  { value: '材料涨价', label: '材料涨价' },
  { value: '其他', label: '其他' },
]

export function priceChangeStatusColor(status) {
  if (status === PRICE_CHANGE_STATUS.APPROVED) return 'success'
  if (status === PRICE_CHANGE_STATUS.REJECTED) return 'error'
  if (status === PRICE_CHANGE_STATUS.PENDING) return 'warning'
  return 'default'
}

export function lineChangeAmount(qty, unitPrice) {
  return round2((Number(qty) || 0) * (Number(unitPrice) || 0))
}

function lineDiscountAmount(listPrice, qty, discountRate) {
  const rate = normalizeDiscountRate(discountRate, 1)
  return round2(
    Math.max(0, (Number(listPrice) || 0) * (Number(qty) || 0) * (1 - Math.min(rate, 1))),
  )
}

function deriveInTax(ex, taxRate) {
  return round2((Number(ex) || 0) * (1 + (Number(taxRate) || 0) / 100))
}

function deriveExTax(inc, taxRate) {
  const rate = Number(taxRate) || 0
  const inTax = Number(inc) || 0
  return rate >= 0 ? round2(inTax / (1 + rate / 100)) : round2(inTax)
}

export function isPriceChangeLineChanged(row) {
  if (!row) return false
  const checks = [
    [row.newUnitPriceExTax, row.oldUnitPriceExTax],
    [row.newUnitPriceInTax, row.oldUnitPriceInTax],
    [row.newLineDiscountRate, row.oldLineDiscountRate],
  ]
  return checks.some(([a, b]) => Math.abs((Number(a) || 0) - (Number(b) || 0)) > 1e-9)
}

export function buildPriceChangeDraftLines(order) {
  return (order?.lineItems || [])
    .filter((line) => line.productName || line.productCode)
    .map((line) => {
      const qty = Number(line.salesQty ?? line.qty) || 0
      const taxRate = Number(line.taxRate) || 0
      const oldUnitPriceExTax = round2(Number(line.unitPriceExTax) || 0)
      const oldUnitPriceInTax = round2(
        Number(line.unitPriceInTax) || deriveInTax(oldUnitPriceExTax, taxRate),
      )
      const listUnitPriceExTax = round2(Number(line.listUnitPriceExTax) || oldUnitPriceExTax)
      const oldLineDiscountRate = normalizeDiscountRate(line.lineDiscountRate, 1)
      const row = {
        salesLineId: line.id,
        productCode: line.productCode || '',
        productName: line.productName || '',
        specModel: line.specModel || '',
        material: line.material || '',
        unit: line.unit || '',
        qty,
        taxRate,
        listUnitPriceExTax,
        oldUnitPriceExTax,
        oldUnitPriceInTax,
        newUnitPriceExTax: oldUnitPriceExTax,
        newUnitPriceInTax: oldUnitPriceInTax,
        oldLineDiscountRate,
        newLineDiscountRate: oldLineDiscountRate,
        oldLineDiscountAmount: round2(Number(line.lineDiscountAmount) || 0),
        newLineDiscountAmount: round2(Number(line.lineDiscountAmount) || 0),
      }
      return recalcPriceChangeLine(row, { taxModeExcluding: true, editMode: 'unitPrice' })
    })
}

export function recalcPriceChangeLine(row, options = {}) {
  const taxModeExcluding = options.taxModeExcluding !== false
  const editMode = options.editMode || 'unitPrice'
  const qty = Number(row.qty) || 0
  const taxRate = Number(row.taxRate) || 0
  const listPrice = Number(row.listUnitPriceExTax) || Number(row.oldUnitPriceExTax) || 0
  row.taxRate = taxRate
  row.listUnitPriceExTax = round2(listPrice)
  row.qty = qty

  row.oldUnitPriceExTax = round2(Number(row.oldUnitPriceExTax) || 0)
  row.oldUnitPriceInTax = round2(
    Number(row.oldUnitPriceInTax) || deriveInTax(row.oldUnitPriceExTax, taxRate),
  )
  row.oldAmountExTax = lineChangeAmount(qty, row.oldUnitPriceExTax)
  row.oldAmountInTax = lineChangeAmount(qty, row.oldUnitPriceInTax)
  row.oldLineDiscountRate = normalizeDiscountRate(row.oldLineDiscountRate, 1)
  row.oldLineDiscountAmount = lineDiscountAmount(listPrice, qty, row.oldLineDiscountRate)

  if (editMode === 'discount') {
    const rate = normalizeDiscountRate(row.newLineDiscountRate, 1)
    row.newLineDiscountRate = rate
    row.newUnitPriceExTax = round2(listPrice * rate)
    row.newUnitPriceInTax = deriveInTax(row.newUnitPriceExTax, taxRate)
  } else if (taxModeExcluding) {
    row.newUnitPriceExTax = round2(Number(row.newUnitPriceExTax) || 0)
    row.newUnitPriceInTax = deriveInTax(row.newUnitPriceExTax, taxRate)
    row.newLineDiscountRate = listPrice > 0 ? round4(row.newUnitPriceExTax / listPrice) : 1
  } else {
    row.newUnitPriceInTax = round2(Number(row.newUnitPriceInTax) || 0)
    row.newUnitPriceExTax = deriveExTax(row.newUnitPriceInTax, taxRate)
    row.newLineDiscountRate = listPrice > 0 ? round4(row.newUnitPriceExTax / listPrice) : 1
  }

  row.newAmountExTax = lineChangeAmount(qty, row.newUnitPriceExTax)
  row.newAmountInTax = lineChangeAmount(qty, row.newUnitPriceInTax)
  row.newLineDiscountAmount = lineDiscountAmount(listPrice, qty, row.newLineDiscountRate)
  row.deltaAmountExTax = round2(row.newAmountExTax - row.oldAmountExTax)
  row.deltaAmountInTax = round2(row.newAmountInTax - row.oldAmountInTax)
  return row
}

export function summarizePriceChangeLines(lines = []) {
  const changed = (lines || []).filter(isPriceChangeLineChanged)
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

export function normalizePriceChangeLine(row, taxModeExcluding = true) {
  const next = { ...row }
  if (next.taxRate == null || next.taxRate === '') next.taxRate = 13
  if (next.listUnitPriceExTax == null || next.listUnitPriceExTax === '') {
    next.listUnitPriceExTax = next.oldUnitPriceExTax
  }
  if (next.oldLineDiscountRate == null || next.oldLineDiscountRate === '') {
    next.oldLineDiscountRate = 1
  }
  if (next.newLineDiscountRate == null || next.newLineDiscountRate === '') {
    next.newLineDiscountRate = next.oldLineDiscountRate
  }
  return recalcPriceChangeLine(next, { taxModeExcluding, editMode: 'unitPrice' })
}

export function normalizePriceChangeRecord(record) {
  if (!record) return record
  const taxModeExcluding = record.taxModeExcluding !== false
  const lines = (record.lines || []).map((row) => normalizePriceChangeLine(row, taxModeExcluding))
  const summary = summarizePriceChangeLines(lines)
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

export function formatPriceChangeDiscount(rate) {
  return formatDiscountRatePercent(rate)
}

export function buildPriceChangeApprovalGroups(changes = []) {
  return (changes || []).map((change) => {
    const items = [
      {
        name: change.submitter || change.creator || '—',
        role: '价格变更申请',
        result: '已提交',
        time: change.submittedAt || change.createdAt || '—',
        opinion: [change.reasonType, change.reason].filter(Boolean).join('：'),
      },
    ]
    if (
      change.status === PRICE_CHANGE_STATUS.APPROVED ||
      change.status === PRICE_CHANGE_STATUS.REJECTED
    ) {
      items.push({
        name: change.approver || '—',
        role: change.autoApproved ? '系统自动审批' : '价格变更审核',
        result: change.status === PRICE_CHANGE_STATUS.APPROVED ? '已通过' : '已驳回',
        time: change.approvedAt || '—',
        opinion: change.opinion || '',
      })
    } else {
      items.push({
        name: '—',
        role: '价格变更审核',
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

export function formatPriceChangeMoney(val) {
  const n = Number(val)
  if (!Number.isFinite(n)) return '—'
  const prefix = n > 0 ? '+' : ''
  return `${prefix}￥${n.toLocaleString('zh-CN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`
}

export function formatPriceChangeAbsMoney(val) {
  const n = Number(val)
  if (!Number.isFinite(n)) return '—'
  return `￥${n.toLocaleString('zh-CN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`
}
