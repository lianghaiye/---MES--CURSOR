import dayjs from 'dayjs'
import { roundNumber } from '@/utils/numberFormat'

export const DISPUTE_ACCRUAL_STATUS = {
  PENDING: '待处理',
  PARTIAL: '部分核销',
  CLOSED: '已核销',
}

export const DISPUTE_DIFF_TYPE_OPTIONS = [
  '磅差',
  '价差',
  '量差',
  '退货红冲',
  '代垫费用',
  '质量索赔',
  '外协损耗',
  '其他',
]

export function createDisputeAccrual(partial = {}) {
  const record = {
    id: partial.id || `pda-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    accrualNo: '',
    settleId: '',
    settleNo: '',
    settleLineId: '',
    supplierId: '',
    supplier: '',
    purchaseOrderNo: '',
    itemCode: '',
    itemName: '',
    diffType: '其他',
    diffRemark: '',
    /** diff | full */
    disputeScope: 'diff',
    /** 本行账面 */
    bookAmount: 0,
    /** 对方主张 */
    claimAmount: null,
    /** 差额 = 主张 − 账面（可正可负） */
    diffAmount: 0,
    /** 挂出金额：差额=|差|，整笔=|账面| */
    amount: 0,
    writtenOffAmount: 0,
    status: DISPUTE_ACCRUAL_STATUS.PENDING,
    result: '',
    resolutionRemark: '',
    resolvedAt: '',
    creator: 'admin1',
    createdAt: dayjs().format('YYYY-MM-DD HH:mm:ss'),
    ...partial,
  }
  record.disputeScope = record.disputeScope === 'full' ? 'full' : 'diff'
  record.bookAmount = roundNumber(Number(record.bookAmount) || 0, 4)
  if (record.claimAmount != null && record.claimAmount !== '') {
    record.claimAmount = roundNumber(Number(record.claimAmount) || 0, 4)
  } else {
    record.claimAmount = null
  }
  record.diffAmount = roundNumber(
    record.diffAmount != null && record.diffAmount !== ''
      ? Number(record.diffAmount)
      : record.claimAmount != null
        ? record.claimAmount - record.bookAmount
        : 0,
    4,
  )
  record.amount = roundNumber(
    Math.abs(
      Number(record.amount) ||
        (record.disputeScope === 'full' ? record.bookAmount : Number(record.diffAmount) || 0),
    ),
    4,
  )
  record.writtenOffAmount = roundNumber(Math.max(0, Number(record.writtenOffAmount) || 0), 4)
  return record
}

export function seedDisputeAccruals() {
  return [
    createDisputeAccrual({
      id: 'pda-demo-1',
      accrualNo: 'GY-202610-001',
      settleId: 'ps-demo-month-draft',
      settleNo: 'PS20261001001',
      settleLineId: 'ps-demo-1-l2',
      supplierId: 'sup-1',
      supplier: '多功能供应商01',
      purchaseOrderNo: 'CG20260715001',
      itemCode: '010050003',
      itemName: '叶轮',
      diffType: '价差',
      diffRemark: '供应商主张本行应按 12600 结算',
      disputeScope: 'diff',
      bookAmount: 12800,
      claimAmount: 12600,
      diffAmount: -200,
      amount: 200,
      writtenOffAmount: 0,
      status: DISPUTE_ACCRUAL_STATUS.PENDING,
      createdAt: '2026-10-01 10:20:00',
    }),
  ]
}
