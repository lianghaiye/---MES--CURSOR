import dayjs from 'dayjs'

const LOGISTICS_FIELDS = [
  { key: 'shipmentMethod', label: '交货方式' },
  { key: 'freightAmount', label: '运费' },
  { key: 'driverName', label: '司机姓名' },
  { key: 'driverPhone', label: '司机联系方式' },
  { key: 'plateNo', label: '车牌号' },
]

function formatLogisticsValue(key, value) {
  if (key === 'freightAmount') {
    const n = Number(value)
    if (value === '' || value == null || Number.isNaN(n)) return '—'
    return `${n.toFixed(2)}元`
  }
  const text = value == null ? '' : String(value).trim()
  return text || '—'
}

export function appendDeliveryOperationLog(order, entry = {}) {
  if (!order) return null
  if (!Array.isArray(order.operationLogs)) order.operationLogs = []
  const row = {
    id: `dol-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    action: entry.action || '操作',
    operator: entry.operator || '系统',
    operatedAt: entry.operatedAt || dayjs().format('YYYY-MM-DD HH:mm:ss'),
    remark: entry.remark || '',
  }
  order.operationLogs.unshift(row)
  return row
}

export function ensureDeliveryOperationLogs(order) {
  if (!order) return []
  if (!Array.isArray(order.operationLogs)) order.operationLogs = []
  return order.operationLogs
}

/** 对比物流字段变更，生成备注文案；无变更返回空串 */
export function buildLogisticsChangeRemark(prev = {}, next = {}) {
  const parts = []
  LOGISTICS_FIELDS.forEach(({ key, label }) => {
    const before = formatLogisticsValue(key, prev[key])
    const after = formatLogisticsValue(key, next[key])
    if (before === after) return
    parts.push(`${label}：${before} → ${after}`)
  })
  return parts.join('；')
}

export function pickLogisticsFields(source = {}) {
  return {
    shipmentMethod: source.shipmentMethod || '',
    freightAmount:
      source.freightAmount === '' || source.freightAmount == null
        ? null
        : Number(source.freightAmount),
    driverName: source.driverName || '',
    driverPhone: source.driverPhone || '',
    plateNo: source.plateNo || '',
  }
}

export { LOGISTICS_FIELDS }
