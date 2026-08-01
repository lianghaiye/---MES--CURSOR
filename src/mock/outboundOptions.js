export const outboundTypeOptions = [
  '销售出库',
  '领料出库',
  '盘点出库',
  '采购退货',
  '半成品出库',
  '投料出库',
  '发料出库',
  '总装领料出库',
  '部装领料出库',
  '调拨出库',
  '装箱出库',
  '报废出库',
  '退货出库',
  '其他出库',
]

export const itemTypeOptions = ['物料', '产品']

export const outboundStatusOptions = [
  '待处理',
  '待出库',
  '待申领人确认',
  '已拒绝',
  '已出库',
  '拒绝领料',
]

/** 需审批的出库类型（领料出库 / 发料出库本期直接「待出库」→确认出库，不再走审批） */
export const outboundApprovalTypes = []

export const outboundTimeUnitOptions = [
  { label: '日', value: 'day' },
  { label: '月', value: 'month' },
  { label: '年', value: 'year' },
]

export function outboundStatusColor(status) {
  const map = {
    待处理: 'default',
    待出库: 'processing',
    待申领人确认: 'warning',
    已拒绝: 'error',
    已出库: 'success',
    拒绝领料: 'error',
  }
  return map[status] || 'default'
}

export function needsOutboundApproval(outboundType) {
  return outboundApprovalTypes.includes(outboundType)
}

export const warehouseOptions = [
  { label: '库A仓', value: '库A仓' },
  { label: '库库仓', value: '库库仓' },
  { label: '成品仓', value: '成品仓' },
  { label: '半成品仓', value: '半成品仓' },
  { label: '原材料仓', value: '原材料仓' },
]

export const handlerOptions = ['admin1', '张三', '李四']

export const requisitionDeptOptions = ['默认工厂', '机加车间', '装配车间', '质检中心']

export const workshopOptions = ['默认工厂', '机加车间', '装配车间']

export const outboundLineSourceOptions = ['采购', '生产', '外协']
