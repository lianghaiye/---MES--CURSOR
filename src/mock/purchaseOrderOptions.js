export const poStatusOptions = ['待审核', '进行中', '已拒绝', '已完成', '已作废']

export const poSourceOptions = ['新增', '采购申请', '外购销售']

export const inboundStatusOptions = ['待入库', '部分入库', '已入库']

/** 采购类型（原申请类型） */
export const applyTypeOptions = ['日常采购', '紧急采购']

export const settlementTypeOptions = ['先款后货', '预付款+货到付', '货到付款', '月结']

export const settlementCycleOptions = ['月结', '季结', '现结']

export const settlementMethodOptions = ['现金结算', '银行转账', '承兑汇票']

export const deliveryMethodOptions = ['定时交货', '随到随交', '分批交货']

export const approvalResultOptions = ['审核通过', '已拒绝', '待审核']

export const purchaserOptions = ['admin1', '张三', '李四']

export const supplierOptions = [
  { label: '多功能供应商01', value: '多功能供应商01' },
  { label: '多功能供应商02', value: '多功能供应商02' },
  { label: '采购供应商A', value: '采购供应商A' },
  { label: '采购供应商B', value: '采购供应商B' },
  { label: 'SKF代理商', value: 'SKF代理商' },
  { label: '标准件供应商', value: '标准件供应商' },
]

export const contactOptions = [
  { label: '张经理', value: '张经理', phone: '13800138001' },
  { label: '李主管', value: '李主管', phone: '13800138002' },
]

export const receivingModeOptions = ['正常收货', '免检收货', '抽检收货']

export const warehouseOptions = [
  { label: '原材料仓', value: '原材料仓' },
  { label: '半成品仓', value: '半成品仓' },
  { label: '成品仓', value: '成品仓' },
  { label: '报废仓', value: '报废仓' },
  { label: '辅料仓', value: '辅料仓' },
]
