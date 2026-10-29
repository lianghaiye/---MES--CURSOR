import { reactive } from 'vue'
import dayjs from 'dayjs'
import {
  createDisputeAccrual,
  seedDisputeAccruals,
  DISPUTE_ACCRUAL_STATUS,
  DISPUTE_DIFF_TYPE_OPTIONS,
} from '@/mock/purchaseDisputeAccruals'
import { roundNumber } from '@/utils/numberFormat'
import {
  getLineBookAmount,
  getLineClaimAmount,
  getLineClaimDiffAmount,
  getLineDisputeScope,
  getLineEffectiveAmount,
  getLineHangAmount,
} from '@/utils/purchaseSettleDispute'
export const purchaseDisputeAccrualState = reactive({
  accruals: seedDisputeAccruals(),
})

function round4(n) {
  return roundNumber(Number(n) || 0, 4)
}

function nextAccrualNo() {
  const ym = dayjs().format('YYYYMM')
  const prefix = `GY-${ym}-`
  let max = 0
  purchaseDisputeAccrualState.accruals.forEach((a) => {
    const m = String(a.accrualNo || '').match(new RegExp(`^GY-${ym}-(\\d+)$`))
    if (m) max = Math.max(max, Number(m[1]) || 0)
  })
  return `${prefix}${String(max + 1).padStart(3, '0')}`
}

export function listDisputeAccruals(filters = {}) {
  const supplier = String(filters.supplier || '').trim()
  const status = filters.status
  const settleNo = String(filters.settleNo || '').trim()
  const accrualNo = String(filters.accrualNo || '').trim()
  return purchaseDisputeAccrualState.accruals.filter((row) => {
    if (supplier && !String(row.supplier || '').includes(supplier)) return false
    if (status && row.status !== status) return false
    if (settleNo && !String(row.settleNo || '').includes(settleNo)) return false
    if (accrualNo && !String(row.accrualNo || '').includes(accrualNo)) return false
    return true
  })
}

export function getDisputeAccrualById(id) {
  return purchaseDisputeAccrualState.accruals.find((a) => a.id === id) || null
}

export function findOpenAccrualBySettleLine(settleId, settleLineId) {
  return (
    purchaseDisputeAccrualState.accruals.find(
      (a) =>
        a.settleId === settleId &&
        a.settleLineId === settleLineId &&
        a.status !== DISPUTE_ACCRUAL_STATUS.CLOSED,
    ) || null
  )
}

/**
 * 对账单行登记/改争议时：同步创建或更新挂账单
 */
export function upsertAccrualFromSettleLine(settle, line, { diffType } = {}) {
  if (!settle || !line) return null
  if (line.disputeStatus !== 'open') return null
  const book = getLineBookAmount(line)
  const scope = getLineDisputeScope(line)
  const hang = getLineHangAmount(line)
  if (!(hang > 0)) return null

  const claim =
    line.disputeClaimAmount != null && line.disputeClaimAmount !== ''
      ? getLineClaimAmount(line)
      : null
  const diff = claim != null ? getLineClaimDiffAmount(line) : scope === 'full' ? -book : 0

  let row = findOpenAccrualBySettleLine(settle.id, line.id)
  if (row) {
    row.bookAmount = round4(book)
    row.claimAmount = claim != null ? round4(claim) : null
    row.diffAmount = round4(diff)
    row.amount = round4(hang)
    row.disputeScope = scope
    row.diffRemark = line.disputeRemark || row.diffRemark
    row.itemCode = line.itemCode || row.itemCode
    row.itemName = line.itemName || row.itemName
    row.purchaseOrderNo = line.purchaseOrderNo || row.purchaseOrderNo
    if (diffType) row.diffType = diffType
    row.status =
      Number(row.writtenOffAmount) > 0
        ? DISPUTE_ACCRUAL_STATUS.PARTIAL
        : DISPUTE_ACCRUAL_STATUS.PENDING
    return row
  }

  row = createDisputeAccrual({
    accrualNo: nextAccrualNo(),
    settleId: settle.id,
    settleNo: settle.settleNo,
    settleLineId: line.id,
    supplierId: settle.supplierId || '',
    supplier: settle.supplier || '',
    purchaseOrderNo: line.purchaseOrderNo || settle.purchaseOrderNo || '',
    itemCode: line.itemCode || '',
    itemName: line.itemName || '',
    diffType: diffType || '价差',
    diffRemark: line.disputeRemark || '',
    disputeScope: scope,
    bookAmount: round4(book),
    claimAmount: claim != null ? round4(claim) : null,
    diffAmount: round4(diff),
    amount: round4(hang),
    writtenOffAmount: 0,
    status: DISPUTE_ACCRUAL_STATUS.PENDING,
  })
  purchaseDisputeAccrualState.accruals.unshift(row)
  return row
}

/**
 * 对账单行争议核销时：同步挂账单闭环
 */
export function closeAccrualFromSettleLine(settle, line, payload = {}) {
  if (!settle || !line) return null
  const row = findOpenAccrualBySettleLine(settle.id, line.id)
  if (!row) return null
  const originAbs = Math.abs(Number(row.amount) || Number(row.diffAmount) || 0)
  const finalDiff = round4(getLineEffectiveAmount(line) - getLineBookAmount(line))
  row.bookAmount = round4(getLineBookAmount(line))
  row.claimAmount =
    line.disputeClaimAmount != null && line.disputeClaimAmount !== ''
      ? round4(getLineClaimAmount(line))
      : row.claimAmount
  row.diffAmount = finalDiff
  row.disputeScope = getLineDisputeScope(line)
  row.amount = round4(Math.abs(finalDiff) || originAbs)
  row.writtenOffAmount = round4(originAbs)
  row.status = DISPUTE_ACCRUAL_STATUS.CLOSED
  row.result = payload.result || line.disputeResult || ''
  row.resolutionRemark = payload.resolutionRemark || line.disputeResolutionRemark || ''
  row.resolvedAt = line.disputeResolvedAt || dayjs().format('YYYY-MM-DD HH:mm:ss')
  return row
}

/**
 * 挂账列表直接核销（可回写对账单行）
 */
export function writeOffDisputeAccrual(accrualId, payload = {}) {
  const row = getDisputeAccrualById(accrualId)
  if (!row) return { ok: false, message: '挂账单不存在' }
  if (row.status === DISPUTE_ACCRUAL_STATUS.CLOSED) {
    return { ok: false, message: '该挂账单已核销' }
  }
  const result = payload.result
  const remark = String(payload.resolutionRemark || '').trim()
  if (!remark) return { ok: false, message: '请填写核销说明' }
  if (!result) return { ok: false, message: '请选择处理结论' }

  if (row.settleId && row.settleLineId) {
    try {
      // eslint-disable-next-line global-require
      const { resolvePurchaseSettleLineDispute } = require('@/store/purchaseSettleStore')
      const res = resolvePurchaseSettleLineDispute(row.settleId, {
        lineId: row.settleLineId,
        result,
        agreedAmount: payload.agreedAmount ?? payload.finalDisputeAmount,
        resolutionRemark: remark,
      })
      if (!res.ok) return res
      const latest = getDisputeAccrualById(accrualId)
      if (latest && latest.status !== DISPUTE_ACCRUAL_STATUS.CLOSED) {
        latest.status = DISPUTE_ACCRUAL_STATUS.CLOSED
        latest.result = result
        latest.resolutionRemark = remark
        latest.resolvedAt = dayjs().format('YYYY-MM-DD HH:mm:ss')
      }
      return { ok: true, accrual: latest || row, message: '核销成功' }
    } catch (e) {
      return { ok: false, message: e?.message || '核销失败' }
    }
  }

  row.writtenOffAmount = round4(Math.abs(Number(row.amount) || Number(row.diffAmount) || 0))
  row.status = DISPUTE_ACCRUAL_STATUS.CLOSED
  row.result = result
  row.resolutionRemark = remark
  row.resolvedAt = dayjs().format('YYYY-MM-DD HH:mm:ss')
  return { ok: true, accrual: row, message: '核销成功' }
}

export { DISPUTE_ACCRUAL_STATUS, DISPUTE_DIFF_TYPE_OPTIONS }
