import dayjs from 'dayjs'

export function createQcLineItem(partial = {}) {
  return {
    id: `qc-line-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    itemName: '',
    itemCode: '',
    specModel: '',
    shipQty: 0,
    shipWarehouse: '',
    unit: '件',
    inspectQty: 0,
    lineQcResult: undefined,
    treatmentPlan: undefined,
    ...partial,
  }
}

function createFactoryQc(partial) {
  return {
    qcStatus: '待质检',
    qcResult: '',
    qcNo: '',
    sourceOrderNo: '',
    salesOrderNo: '',
    customerName: '',
    source: '销售发货',
    inspector: '',
    inspectedAt: '',
    outboundDocNo: '',
    inspectMethod: '抽检',
    inspectDate: dayjs().format('YYYY-MM-DD'),
    remark: '',
    lineItems: [],
    ...partial,
  }
}

export const mockFactoryQcRecords = [
  createFactoryQc({
    id: 'fqc-1',
    qcStatus: '已终止',
    salesOrderNo: '1-20260520-099',
    sourceOrderNo: '1-20260520-099',
    customerName: '历史客户',
    outboundDocNo: 'CK20260520001',
    lineItems: [
      createQcLineItem({
        itemName: '测试产品00002',
        itemCode: 'SPARE-50*30-001',
        specModel: '50*30',
        shipQty: 10,
        shipWarehouse: '成品仓',
        unit: '件',
      }),
    ],
  }),
  createFactoryQc({
    id: 'fqc-2',
    qcNo: 'CCZJ202605280001',
    qcStatus: '已完成',
    qcResult: '质检通过',
    salesOrderNo: '1-20260528-001',
    sourceOrderNo: '1-20260528-001',
    customerName: '人纷纷',
    inspector: 'admin1',
    inspectedAt: '2026-05-28 14:30',
    inspectMethod: '全检',
    inspectDate: '2026-05-28',
    lineItems: [
      createQcLineItem({
        itemName: '潜水电机',
        itemCode: 'PRD-YQST250',
        specModel: '750kW',
        shipQty: 2,
        shipWarehouse: '成品仓',
        unit: '台',
        inspectQty: 2,
        lineQcResult: '合格',
      }),
    ],
  }),
  createFactoryQc({
    id: 'fqc-3',
    qcNo: 'CCZJ202606030001',
    qcStatus: '已完成',
    qcResult: '部分通过',
    salesOrderNo: '1-20260603-001',
    sourceOrderNo: '1-20260603-001',
    customerName: '复检客户',
    outboundDocNo: 'OUT202606030006',
    inspector: 'admin1',
    inspectedAt: '2026-06-03 10:00',
    inspectMethod: '抽检',
    inspectDate: '2026-06-03',
    lineItems: [
      createQcLineItem({
        itemName: '法兰盘',
        itemCode: 'PRD-FLANGE-01',
        shipQty: 8,
        shipWarehouse: '成品仓',
        unit: '件',
        inspectQty: 8,
        lineQcResult: '合格',
        outboundLineId: 'ob-6-line-a',
      }),
      createQcLineItem({
        itemName: '密封圈',
        itemCode: 'PRD-SEAL-02',
        shipQty: 20,
        shipWarehouse: '成品仓',
        unit: '件',
        inspectQty: 20,
        lineQcResult: '不合格',
        treatmentPlan: '返工后复检',
        outboundLineId: 'ob-6-line-b',
      }),
    ],
  }),
]

export function cloneFactoryQcRecords() {
  return JSON.parse(JSON.stringify(mockFactoryQcRecords))
}

export function filterFactoryQcRecords(list, filters) {
  return list.filter((item) => {
    if (filters.qcStatus && item.qcStatus !== filters.qcStatus) return false
    if (filters.qcResult && item.qcResult !== filters.qcResult) return false
    if (filters.salesOrderNo && !item.salesOrderNo?.includes(filters.salesOrderNo)) return false
    if (filters.customerName && !item.customerName?.includes(filters.customerName)) return false
    return true
  })
}

export function resolveHeaderQcResult(lineItems) {
  const results = (lineItems || []).map((l) => l.lineQcResult).filter(Boolean)
  if (!results.length) return ''
  const allPass = results.every((r) => r === '合格')
  const allFail = results.every((r) => r === '不合格')
  if (allPass) return '质检通过'
  if (allFail) return '质检不通过'
  return '部分通过'
}
