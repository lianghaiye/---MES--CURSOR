import dayjs from 'dayjs'
import { TRANSFER_STATUS } from '@/mock/transferOptions'

function formatTime(value) {
  if (!value) return dayjs().format('YYYY-MM-DD HH:mm:ss')
  const d = dayjs(value)
  if (!d.isValid()) return String(value)
  return value.length <= 10 ? `${value} 00:00:00` : d.format('YYYY-MM-DD HH:mm:ss')
}

export function createTransferOperationLog({
  action = '',
  remark = '',
  operator = 'admin1',
  operatedAt,
} = {}) {
  return {
    id: `tf-log-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    operatedAt: formatTime(operatedAt),
    operator: operator || 'admin1',
    action,
    remark: remark || '',
  }
}

export function appendTransferOperationLog(order, payload) {
  if (!order) return
  if (!Array.isArray(order.operationLogs)) order.operationLogs = []
  order.operationLogs.unshift(createTransferOperationLog(payload))
}

/** 无日志的历史单据按头字段补创建/确认/作废记录 */
export function backfillTransferOperationLogs(order) {
  if (!order) return order
  if (Array.isArray(order.operationLogs) && order.operationLogs.length) return order

  const logs = []
  logs.push(
    createTransferOperationLog({
      action: '创建',
      operator: order.creator || order.applicant || 'admin1',
      operatedAt: order.createdAt,
      remark: `创建调拨单${order.docNo ? ` ${order.docNo}` : ''}，${order.fromWarehouse || '—'} → ${order.toWarehouse || '—'}`,
    }),
  )

  if (order.confirmedAt || order.confirmer) {
    logs.push(
      createTransferOperationLog({
        action: '确认调拨',
        operator: order.confirmer || 'admin1',
        operatedAt: order.confirmedAt,
        remark: '出库方确认调拨，生成调拨出库/入库',
      }),
    )
  }

  if (order.status === TRANSFER_STATUS.VOIDED || order.voidedAt) {
    logs.push(
      createTransferOperationLog({
        action: '作废',
        operator: order.voidedBy || 'admin1',
        operatedAt: order.voidedAt,
        remark: order.voidReason ? `作废理由：${order.voidReason}` : '作废调拨单',
      }),
    )
  } else if (order.status === TRANSFER_STATUS.REFUSED || order.refusedAt) {
    logs.push(
      createTransferOperationLog({
        action: '拒绝',
        operator: order.refusedBy || 'admin1',
        operatedAt: order.refusedAt,
        remark: order.refuseReason ? `拒绝理由：${order.refuseReason}` : '拒绝调拨',
      }),
    )
  }

  order.operationLogs = logs.slice().reverse()
  return order
}
