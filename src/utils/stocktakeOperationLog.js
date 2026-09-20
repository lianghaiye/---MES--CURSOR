import dayjs from 'dayjs'
import { STOCKTAKE_STATUS, STOCKTAKE_POSTING } from '@/mock/stocktakeOptions'

function formatTime(value) {
  if (!value) return dayjs().format('YYYY-MM-DD HH:mm:ss')
  const d = dayjs(value)
  if (!d.isValid()) return String(value)
  return value.length <= 10 ? `${value} 00:00:00` : d.format('YYYY-MM-DD HH:mm:ss')
}

export function createStocktakeOperationLog({
  action = '',
  remark = '',
  operator = 'admin1',
  operatedAt,
} = {}) {
  return {
    id: `st-log-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    operatedAt: formatTime(operatedAt),
    operator: operator || 'admin1',
    action,
    remark: remark || '',
  }
}

export function appendStocktakeOperationLog(order, payload) {
  if (!order) return
  if (!Array.isArray(order.operationLogs)) order.operationLogs = []
  order.operationLogs.unshift(createStocktakeOperationLog(payload))
}

/** 无日志的历史单据按头字段补创建/审核/过账/拒绝记录 */
export function backfillStocktakeOperationLogs(order) {
  if (!order) return order
  if (Array.isArray(order.operationLogs) && order.operationLogs.length) return order

  const logs = []
  logs.push(
    createStocktakeOperationLog({
      action: '创建',
      operator: order.creator || order.applicant || 'admin1',
      operatedAt: order.createdAt,
      remark: `创建盘点单${order.docNo ? ` ${order.docNo}` : ''}，仓库 ${order.warehouse || '—'}，类型 ${order.stocktakeType || '—'}`,
    }),
  )

  if (
    order.submittedAt ||
    order.status === STOCKTAKE_STATUS.PENDING_APPROVAL ||
    order.status === STOCKTAKE_STATUS.APPROVED ||
    order.status === STOCKTAKE_STATUS.REFUSED
  ) {
    logs.push(
      createStocktakeOperationLog({
        action: '提交',
        operator: order.submittedBy || order.creator || order.applicant || 'admin1',
        operatedAt: order.submittedAt || order.createdAt,
        remark: '提交审核',
      }),
    )
  }

  if (order.approvedAt || order.approver) {
    logs.push(
      createStocktakeOperationLog({
        action: '审核通过',
        operator: order.approver || 'admin1',
        operatedAt: order.approvedAt,
        remark: '审核通过',
      }),
    )
  }

  if (order.postedAt || order.postingStatus === STOCKTAKE_POSTING.SUCCESS) {
    logs.push(
      createStocktakeOperationLog({
        action: '过账',
        operator: order.confirmer || order.approver || 'admin1',
        operatedAt: order.postedAt || order.confirmedAt,
        remark: '生成盘盈盘亏并入账',
      }),
    )
  } else if (order.postingStatus === STOCKTAKE_POSTING.FAILED && order.postingError) {
    logs.push(
      createStocktakeOperationLog({
        action: '过账失败',
        operator: order.confirmer || order.approver || 'admin1',
        operatedAt: order.updatedAt || order.approvedAt,
        remark: order.postingError,
      }),
    )
  }

  if (order.status === STOCKTAKE_STATUS.REFUSED || order.refusedAt) {
    logs.push(
      createStocktakeOperationLog({
        action: '拒绝',
        operator: order.refusedBy || 'admin1',
        operatedAt: order.refusedAt,
        remark: order.refuseReason ? `拒绝理由：${order.refuseReason}` : '审核拒绝',
      }),
    )
  }

  order.operationLogs = logs.slice().reverse()
  return order
}
