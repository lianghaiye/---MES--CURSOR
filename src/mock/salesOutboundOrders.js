import dayjs from 'dayjs'

export function createOutboundLine(partial = {}) {
  return {
    id: `ob-line-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    itemName: '',
    itemCode: '',
    specModel: '',
    shipQty: 0,
    shipWarehouse: '成品仓',
    unit: '件',
    ...partial,
  }
}

function createOutboundOrder(partial) {
  return {
    docType: '销售出库',
    docNo: '',
    salesOrderNo: '',
    customerName: '',
    status: '已出库',
    outboundDate: dayjs().format('YYYY-MM-DD'),
    remark: '',
    lineItems: [],
    factoryQcId: '',
    ...partial,
  }
}

export const mockSalesOutboundOrders = [
  createOutboundOrder({
    id: 'ob-1',
    docNo: 'CK20260529001',
    salesOrderNo: '1-20260529-002',
    customerName: '测试人员',
    lineItems: [
      createOutboundLine({
        itemName: '测试产品00002',
        itemCode: 'SPARE-50*30-001',
        specModel: '50*30',
        shipQty: 10,
        shipWarehouse: '成品仓',
        unit: '件',
      }),
    ],
  }),
  createOutboundOrder({
    id: 'ob-2',
    docNo: 'CK20260528002',
    salesOrderNo: 'XSDD2026050001',
    customerName: '华东机械制造有限公司',
    lineItems: [
      createOutboundLine({
        itemName: '潜水电机',
        itemCode: 'PRD-YQST250',
        specModel: '750kW',
        shipQty: 5,
        shipWarehouse: '成品仓',
        unit: '台',
      }),
    ],
  }),
]

export function cloneSalesOutboundOrders() {
  return JSON.parse(JSON.stringify(mockSalesOutboundOrders))
}
