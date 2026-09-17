import dayjs from 'dayjs'
import { TRANSFER_SOURCE, TRANSFER_STATUS } from '@/mock/transferOptions'

export function createTransferLine(partial = {}) {
  return {
    id: `tf-line-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    itemCode: '',
    itemName: '',
    itemType: '物料',
    specModel: '',
    material: '',
    unit: '件',
    qty: 1,
    bookQty: null,
    batchId: '',
    batchNo: '',
    salesOrderId: '',
    salesOrderNo: '',
    salesLineId: '',
    locationNo: '',
    lineStatus: TRANSFER_STATUS.PENDING,
    refuseReason: '',
    linkedOutboundLineId: '',
    linkedInboundLineId: '',
    ...partial,
  }
}

export function createTransferOrder(partial = {}) {
  const now = dayjs().format('YYYY-MM-DD HH:mm:ss')
  return {
    id: '',
    docNo: '',
    status: TRANSFER_STATUS.PENDING,
    sourceChannel: TRANSFER_SOURCE.MANUAL,
    fromWarehouse: '',
    toWarehouse: '',
    transferDate: dayjs().format('YYYY-MM-DD'),
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

export function generateTransferNo() {
  return `DB${dayjs().format('YYYYMMDDHHmmss')}${String(Math.floor(Math.random() * 90) + 10)}`
}

export function cloneTransferSeedOrders() {
  return []
}
