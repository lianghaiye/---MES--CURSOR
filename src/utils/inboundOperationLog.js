import dayjs from 'dayjs'

function formatTime(value) {
  if (!value) return dayjs().format('YYYY-MM-DD HH:mm:ss')
  const d = dayjs(value)
  if (!d.isValid()) return String(value)
  return String(value).length <= 10 ? `${value} 00:00:00` : d.format('YYYY-MM-DD HH:mm:ss')
}

export function createInboundOperationLog({
  action = '',
  remark = '',
  operator = 'admin1',
  operatedAt,
} = {}) {
  return {
    id: `ib-log-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    operatedAt: formatTime(operatedAt),
    operator: operator || 'admin1',
    action,
    remark: remark || '',
  }
}

export function appendInboundOperationLog(order, payload) {
  if (!order) return
  if (!Array.isArray(order.operationLogs)) order.operationLogs = []
  order.operationLogs.unshift(createInboundOperationLog(payload))
}

function lineLabel(line) {
  const name = line?.itemName || line?.itemCode || '明细'
  const code = line?.itemCode && line.itemCode !== name ? `（${line.itemCode}）` : ''
  const qty = line?.qty != null && line.qty !== '' ? ` ×${line.qty}` : ''
  return `${name}${code}${qty}`
}

export function summarizeInboundLines(lines = []) {
  const list = lines.filter(Boolean)
  if (!list.length) return ''
  const text = list.slice(0, 3).map(lineLabel).join('；')
  return list.length > 3 ? `${text} 等 ${list.length} 行` : text
}

/** 无日志的历史单据按头字段补创建及后续状态记录 */
export function backfillInboundOperationLogs(order) {
  if (!order) return order
  if (Array.isArray(order.operationLogs) && order.operationLogs.length) return order

  const logs = []
  logs.push(
    createInboundOperationLog({
      action: '创建',
      operator: order.creator || 'admin1',
      operatedAt: order.createdAt,
      remark: `创建入库单${order.docNo ? ` ${order.docNo}` : ''}，类型 ${order.inboundType || '—'}`,
    }),
  )

  if (order.approver && order.status !== '已拒绝') {
    logs.push(
      createInboundOperationLog({
        action: '审批通过',
        operator: order.approver,
        operatedAt: order.approvedAt,
        remark: '审批通过，状态变为待入库',
      }),
    )
  }

  const lines = order.lineItems || []
  const received = lines.filter((line) => (line.lineStatus || '待入库') === '已入库')
  const status = order.status

  if (status === '已拒绝') {
    const isApproveReject = order.approver && !order.refuseReason
    logs.push(
      createInboundOperationLog({
        action: isApproveReject ? '审批拒绝' : '拒绝入库',
        operator: order.refusedBy || order.approver || 'admin1',
        operatedAt: order.refusedAt || order.approvedAt,
        remark: isApproveReject
          ? '审批拒绝'
          : order.refuseReason
            ? `拒绝理由：${order.refuseReason}`
            : '拒绝入库',
      }),
    )
  } else if (status === '部分入库') {
    logs.push(
      createInboundOperationLog({
        action: '部分确认入库',
        operator: order.confirmer || order.handler || 'admin1',
        operatedAt: order.confirmedAt,
        remark: `部分确认 ${received.length}/${lines.length} 行${received.length ? `：${summarizeInboundLines(received)}` : ''}`,
      }),
    )
  } else if (status === '已入库') {
    logs.push(
      createInboundOperationLog({
        action: '整单确认入库',
        operator: order.confirmer || order.handler || 'admin1',
        operatedAt: order.confirmedAt,
        remark: `整单确认入库，共 ${lines.length} 行`,
      }),
    )
  }

  order.operationLogs = logs.slice().reverse()
  return order
}
