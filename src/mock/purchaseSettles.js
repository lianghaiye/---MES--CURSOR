import dayjs from 'dayjs'

export const PURCHASE_SETTLE_STATUS = {
  DRAFT: '草稿',
  CONFIRMED: '已确认',
}

export function createPurchaseSettleLine(partial = {}) {
  const settleQty = Number(partial.settleQty) || 0
  const unitPrice = Number(partial.unitPrice) || 0
  return {
    id: `ps-line-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    inboundOrderId: '',
    inboundDocNo: '',
    inboundLineId: '',
    poLineId: '',
    itemCode: '',
    itemName: '',
    settleUnit: '',
    settleQty,
    unitPrice,
    amount: Math.round(settleQty * unitPrice * 100) / 100,
    ...partial,
  }
}

export function createPurchaseSettle(partial = {}) {
  const now = dayjs().format('YYYY-MM-DD HH:mm:ss')
  return {
    id: '',
    settleNo: '',
    status: PURCHASE_SETTLE_STATUS.DRAFT,
    purchaseOrderId: '',
    purchaseOrderNo: '',
    supplier: '',
    settleDate: dayjs().format('YYYY-MM-DD'),
    totalAmount: 0,
    remark: '',
    creator: 'admin1',
    createdAt: now,
    confirmer: '',
    confirmedAt: '',
    lineItems: [],
    ...partial,
  }
}

export function seedPurchaseSettles() {
  return []
}
