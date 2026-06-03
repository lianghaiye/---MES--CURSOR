/** 采购申请详情页：进度与汇总 */
export function buildPurchaseRequisitionTimeline(record) {
  if (!record) return []

  const createdAt = record.createdAt || ''
  const isDone = record.docStatus === '处理完成'
  const isVoid = record.docStatus === '已作废'
  const poActive = record.docStatus === '待处理' || record.docStatus === '处理中'

  if (isVoid) {
    return [
      { key: 'created', title: '已创建', status: 'finish', description: createdAt },
      { key: 'po', title: '生成采购单', status: 'error' },
      { key: 'done', title: '已完成', status: 'wait' },
    ]
  }

  return [
    {
      key: 'created',
      title: '已创建',
      status: 'finish',
      description: createdAt,
    },
    {
      key: 'po',
      title: '生成采购单',
      status: isDone ? 'finish' : poActive ? 'process' : 'wait',
    },
    {
      key: 'done',
      title: '已完成',
      status: isDone ? 'finish' : 'wait',
    },
  ]
}

export function calcRequisitionDetailSummary(record) {
  const lines = record?.lineItems || []
  const totalQty = lines.reduce((s, l) => s + (Number(l.planPurchaseQty) || 0), 0)
  const totalAmount = lines.reduce((s, l) => s + (Number(l.totalPriceInTax) || 0), 0)
  return { totalQty, totalAmount }
}
