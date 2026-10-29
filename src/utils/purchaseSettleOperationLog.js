import dayjs from 'dayjs'

function formatTime(value) {
  if (!value) return dayjs().format('YYYY-MM-DD HH:mm:ss')
  const d = dayjs(value)
  if (!d.isValid()) return String(value)
  return String(value).length <= 10 ? `${value} 00:00:00` : d.format('YYYY-MM-DD HH:mm:ss')
}

function createLog({ action = '', remark = '', operator = 'admin1', operatedAt } = {}) {
  return {
    id: `ps-log-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    operatedAt: formatTime(operatedAt),
    operator: operator || 'admin1',
    action,
    remark: remark || '',
  }
}

function sortLogsDesc(logs) {
  return [...logs].sort((a, b) => String(b.operatedAt).localeCompare(String(a.operatedAt)))
}

/** 对账单操作日志（合成） */
export function buildPurchaseSettleOperationLogs(settle) {
  if (!settle) return []
  if (Array.isArray(settle.operationLogs) && settle.operationLogs.length) {
    return sortLogsDesc(settle.operationLogs)
  }

  const logs = []
  logs.push(
    createLog({
      action: '生成对账单',
      operator: settle.creator || 'admin1',
      operatedAt: settle.createdAt,
      remark: `对账单 ${settle.settleNo || ''}`,
    }),
  )

  if (settle.status === '对账中' || settle.reconcilingAt) {
    logs.push(
      createLog({
        action: '标记对账中',
        operator: settle.reconciler || 'admin1',
        operatedAt: settle.reconcilingAt || settle.updatedAt || settle.createdAt,
        remark: '状态变更为对账中',
      }),
    )
  }

  if (settle.status === '已确认' || settle.confirmedAt) {
    logs.push(
      createLog({
        action: '确认对账',
        operator: settle.confirmer || 'admin1',
        operatedAt: settle.confirmedAt,
        remark: `确认金额 ¥ ${Number(settle.confirmedAmount ?? settle.bookAmount ?? settle.totalAmount) || 0}`,
      }),
    )
  }

  const invoiceRecords = Array.isArray(settle.invoiceRecords) ? settle.invoiceRecords : []
  if (invoiceRecords.length) {
    invoiceRecords.forEach((inv) => {
      logs.push(
        createLog({
          action: '收票登记',
          operator: inv.invoicer || settle.invoicer || 'admin1',
          operatedAt: inv.invoicedAt || inv.invoiceDate,
          remark: `发票 ${inv.invoiceNo || '—'}／开票日 ${inv.invoiceDate || '—'}／票面 ¥ ${
            Number(inv.invoiceAmount) || 0
          }`,
        }),
      )
    })
  } else if (settle.invoiceStatus === '已开票' || settle.invoiceStatus === '部分收票') {
    logs.push(
      createLog({
        action: '收票登记',
        operator: settle.invoicer || 'admin1',
        operatedAt: settle.invoicedAt || settle.invoiceDate,
        remark: `发票 ${settle.invoiceNo || '—'}／开票日 ${settle.invoiceDate || '—'}`,
      }),
    )
  }

  const paymentRecords = Array.isArray(settle.paymentRecords) ? settle.paymentRecords : []
  if (paymentRecords.length) {
    paymentRecords.forEach((pay) => {
      logs.push(
        createLog({
          action: '登记付款',
          operator: pay.paidBy || 'admin1',
          operatedAt: pay.paidAt || settle.lastPaidAt,
          remark: `${pay.targetType === 'opening' ? '期初' : '本期'} ¥ ${Number(pay.amount) || 0}${
            pay.remark ? `（${pay.remark}）` : ''
          }`,
        }),
      )
    })
  } else if ((Number(settle.paidAmount) || 0) > 0) {
    logs.push(
      createLog({
        action: '登记付款',
        operator: 'admin1',
        operatedAt: settle.lastPaidAt || settle.confirmedAt,
        remark: `实付合计 ¥ ${Number(settle.paidAmount) || 0}${
          settle.lastPaidRemark ? `（${settle.lastPaidRemark}）` : ''
        }`,
      }),
    )
  }

  return sortLogsDesc(logs)
}
