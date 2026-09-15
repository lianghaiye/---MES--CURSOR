import dayjs from 'dayjs'

function formatTime(value) {
  if (!value) return dayjs().format('YYYY-MM-DD HH:mm:ss')
  const d = dayjs(value)
  if (!d.isValid()) return String(value)
  return value.length <= 10 ? `${value} 00:00:00` : d.format('YYYY-MM-DD HH:mm:ss')
}

export function createOutboundOperationLog({
  action = '',
  remark = '',
  operator = 'admin1',
  operatedAt,
} = {}) {
  return {
    id: `ob-log-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    operatedAt: formatTime(operatedAt),
    operator: operator || 'admin1',
    action,
    remark: remark || '',
  }
}

export function appendOutboundOperationLog(order, payload) {
  if (!order) return
  if (!Array.isArray(order.operationLogs)) order.operationLogs = []
  order.operationLogs.unshift(createOutboundOperationLog(payload))
}

function lineLabel(line) {
  const name = line?.itemName || line?.itemCode || '明细'
  const code = line?.itemCode && line.itemCode !== name ? `（${line.itemCode}）` : ''
  const qty = line?.shipQty != null && line.shipQty !== '' ? ` ×${line.shipQty}` : ''
  return `${name}${code}${qty}`
}

export function summarizeOutboundLines(lines = []) {
  const list = lines.filter(Boolean)
  if (!list.length) return ''
  const text = list.slice(0, 3).map(lineLabel).join('；')
  return list.length > 3 ? `${text} 等 ${list.length} 行` : text
}

/** 无日志的历史单据按头字段补一条创建/确认/拒绝记录 */
export function backfillOutboundOperationLogs(order) {
  if (!order) return order
  if (Array.isArray(order.operationLogs) && order.operationLogs.length) return order

  const logs = []
  logs.push(
    createOutboundOperationLog({
      action: '创建',
      operator: order.creator || 'admin1',
      operatedAt: order.createdAt,
      remark: `创建出库单${order.docNo ? ` ${order.docNo}` : ''}，类型 ${order.outboundType || '—'}`,
    }),
  )

  const lines = order.lineItems || []
  const shipped = lines.filter((l) => (l.lineStatus || '待出库') === '已出库')
  const status = order.status

  if (status === '已拒绝') {
    logs.push(
      createOutboundOperationLog({
        action: '拒绝出库',
        operator: order.refusedBy || order.auditor || 'admin1',
        operatedAt: order.refusedAt || order.auditDate,
        remark: order.refuseReason ? `拒绝理由：${order.refuseReason}` : '拒绝出库',
      }),
    )
  } else if (status === '部分出库') {
    logs.push(
      createOutboundOperationLog({
        action: '部分确认出库',
        operator: order.auditor || order.warehouseKeeper || 'admin1',
        operatedAt: order.auditDate || order.outboundTime,
        remark: `部分确认 ${shipped.length}/${lines.length} 行${shipped.length ? `：${summarizeOutboundLines(shipped)}` : ''}`,
      }),
    )
  } else if (status === '已出库' || status === '待申领人确认') {
    logs.push(
      createOutboundOperationLog({
        action: '整单确认出库',
        operator: order.auditor || order.warehouseKeeper || 'admin1',
        operatedAt: order.auditDate || order.completedAt || order.outboundTime,
        remark: `整单确认出库，共 ${lines.length} 行`,
      }),
    )
  }

  order.operationLogs = logs.slice().reverse()
  return order
}
