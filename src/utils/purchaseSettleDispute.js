/**
 * 采购对账行争议
 *
 * - 差额：只记对方主张与差额；挂起时确认额仍按账面，核销后再改
 * - 整笔：整行先不计入确认应付（挂起时行确认额=0），核销后再按结论计入
 *
 * 差额 = 对方主张 − 本行账面（可正可负）
 */
import { roundNumber } from '@/utils/numberFormat'
import {
  PURCHASE_SETTLE_LINE_DISPUTE_STATUS,
  PURCHASE_SETTLE_LINE_DISPUTE_RESULT,
  PURCHASE_SETTLE_LINE_DISPUTE_SCOPE,
} from '@/mock/purchaseSettles'

export function roundDispute(n) {
  return roundNumber(Number(n) || 0, 4)
}

export function getLineBookAmount(line) {
  return roundDispute(line?.amount)
}

export function getLineDisputeScope(line) {
  const s = line?.disputeScope
  if (s === PURCHASE_SETTLE_LINE_DISPUTE_SCOPE.FULL || s === 'full' || s === '整笔') {
    return PURCHASE_SETTLE_LINE_DISPUTE_SCOPE.FULL
  }
  return PURCHASE_SETTLE_LINE_DISPUTE_SCOPE.DIFF
}

/** 对方主张金额（未填时回退账面；兼容旧扣减种子） */
export function getLineClaimAmount(line) {
  if (line?.disputeClaimAmount != null && line.disputeClaimAmount !== '') {
    return roundDispute(line.disputeClaimAmount)
  }
  const book = getLineBookAmount(line)
  const legacyDeduction = Number(line?.disputeAmount)
  if (
    line?.disputeStatus &&
    Number.isFinite(legacyDeduction) &&
    legacyDeduction > 0 &&
    (line.disputeClaimAmount == null || line.disputeClaimAmount === '')
  ) {
    return roundDispute(book - Math.sign(book || 1) * Math.abs(legacyDeduction))
  }
  return book
}

/**
 * 行确认额（计入整单应付）
 * - 无争议：账面
 * - 挂起·差额：仍按账面（主张只挂账）
 * - 挂起·整笔：0（整行先不付）
 * - 采纳我方 / 取消：账面
 * - 采纳对方：对方主张（整笔若未填主张则回账面）
 * - 折中：谈妥金额
 */
export function getLineEffectiveAmount(line) {
  const book = getLineBookAmount(line)
  const status = line?.disputeStatus
  if (!status || status === PURCHASE_SETTLE_LINE_DISPUTE_STATUS.NONE) return book

  if (status === PURCHASE_SETTLE_LINE_DISPUTE_STATUS.OPEN) {
    if (getLineDisputeScope(line) === PURCHASE_SETTLE_LINE_DISPUTE_SCOPE.FULL) {
      return 0
    }
    return book
  }

  if (status === PURCHASE_SETTLE_LINE_DISPUTE_STATUS.RESOLVED) {
    const result = line.disputeResult
    if (
      result === PURCHASE_SETTLE_LINE_DISPUTE_RESULT.OURS ||
      result === PURCHASE_SETTLE_LINE_DISPUTE_RESULT.CANCELLED
    ) {
      return book
    }
    if (result === PURCHASE_SETTLE_LINE_DISPUTE_RESULT.THEIRS) {
      if (line.disputeClaimAmount != null && line.disputeClaimAmount !== '') {
        return getLineClaimAmount(line)
      }
      return book
    }
    if (result === PURCHASE_SETTLE_LINE_DISPUTE_RESULT.SPLIT) {
      if (line.disputeAgreedAmount != null && line.disputeAgreedAmount !== '') {
        return roundDispute(line.disputeAgreedAmount)
      }
      return getLineClaimAmount(line)
    }
  }
  return book
}

/** 相对账面的确认差额（effective − book） */
export function getLineDiffAmount(line) {
  if (!line?.disputeStatus) return 0
  return roundDispute(getLineEffectiveAmount(line) - getLineBookAmount(line))
}

/** 主张差额（主张 − 账面）；整笔且未填主张时为 0 */
export function getLineClaimDiffAmount(line) {
  if (!line?.disputeStatus) return 0
  if (line.disputeClaimAmount == null || line.disputeClaimAmount === '') return 0
  return roundDispute(getLineClaimAmount(line) - getLineBookAmount(line))
}

/** 挂出金额：差额=|主张−账面|；整笔=|账面| */
export function getLineHangAmount(line) {
  if (!line?.disputeStatus) return 0
  if (getLineDisputeScope(line) === PURCHASE_SETTLE_LINE_DISPUTE_SCOPE.FULL) {
    return roundDispute(Math.abs(getLineBookAmount(line)))
  }
  return roundDispute(Math.abs(getLineClaimDiffAmount(line)))
}

export function formatSignedMoney(n) {
  const v = Number(n) || 0
  if (!v) return '0.00'
  const abs = Math.abs(v).toFixed(2)
  return v > 0 ? `+${abs}` : `-${abs}`
}
