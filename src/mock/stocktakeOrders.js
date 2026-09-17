import dayjs from 'dayjs'
import { STOCKTAKE_SOURCE, STOCKTAKE_STATUS } from '@/mock/stocktakeOptions'

export function createStocktakeLine(partial = {}) {
  return {
    id: `st-line-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    itemCode: '',
    itemName: '',
    itemType: '物料',
    specModel: '',
    material: '',
    unit: '件',
    batchId: '',
    batchNo: '',
    salesOrderId: '',
    salesOrderNo: '',
    salesLineId: '',
    locationNo: '',
    bookQty: 0,
    actualQty: 0,
    diffQty: 0,
    lineStatus: STOCKTAKE_STATUS.PENDING,
    refuseReason: '',
    linkedOutboundId: '',
    linkedInboundId: '',
    linkedOutboundDocNo: '',
    linkedInboundDocNo: '',
    ...partial,
  }
}

export function createStocktakeOrder(partial = {}) {
  const now = dayjs().format('YYYY-MM-DD HH:mm:ss')
  return {
    id: '',
    docNo: '',
    status: STOCKTAKE_STATUS.PENDING,
    sourceChannel: STOCKTAKE_SOURCE.MANUAL,
    warehouse: '',
    stocktakeDate: dayjs().format('YYYY-MM-DD'),
    applicant: 'admin1',
    creator: 'admin1',
    createdAt: now,
    confirmer: '',
    confirmedAt: '',
    refuseReason: '',
    refusedBy: '',
    refusedAt: '',
    remark: '',
    linkedOutboundIds: [],
    linkedInboundIds: [],
    linkedOutboundDocNos: [],
    linkedInboundDocNos: [],
    lineItems: [],
    ...partial,
  }
}

export function generateStocktakeNo() {
  return `PD${dayjs().format('YYYYMMDDHHmmss')}${String(Math.floor(Math.random() * 90) + 10)}`
}

export function cloneStocktakeSeedOrders() {
  return []
}
