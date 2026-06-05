import dayjs from 'dayjs'

/** 外协订单演示数据（按销售单号关联） */
export const mockOutsourcingOrders = [
  {
    id: 'oso-1',
    orderNo: 'WX20260512001',
    salesOrderNo: '1-20260512-005',
    supplierName: '华东机加工外协厂',
    itemName: '泵体（泵壳）',
    itemCode: '010050001',
    qty: 3,
    unit: '件',
    status: '进行中',
    planCompleteDate: '2026-06-15',
    createdAt: '2026-05-13',
    remark: '自产订单散件外协加工',
  },
  {
    id: 'oso-2',
    orderNo: 'WX20260512002',
    salesOrderNo: '1-20260512-005',
    supplierName: '精工表面处理厂',
    itemName: '叶轮',
    itemCode: '010050003',
    qty: 2,
    unit: '件',
    status: '待下达',
    planCompleteDate: '2026-06-18',
    createdAt: '2026-05-14',
    remark: '',
  },
  {
    id: 'oso-3',
    orderNo: 'WX20260520001',
    salesOrderNo: '1-20260520-008',
    supplierName: '南方外协联盟',
    itemName: '清水离心泵 ISG50-160',
    itemCode: 'CP2610001',
    qty: 8,
    unit: '台',
    status: '已完成',
    planCompleteDate: '2026-06-01',
    createdAt: '2026-05-21',
    remark: '紧急订单外协装配',
  },
]

export function createOutsourcingOrder(partial = {}) {
  return {
    id: `oso-${Date.now()}`,
    orderNo: `WX${dayjs().format('YYYYMMDD')}${String(Math.floor(Math.random() * 900) + 100)}`,
    salesOrderNo: '',
    supplierName: '',
    itemName: '',
    itemCode: '',
    qty: 0,
    unit: '件',
    status: '待下达',
    planCompleteDate: '',
    createdAt: dayjs().format('YYYY-MM-DD'),
    remark: '',
    ...partial,
  }
}
