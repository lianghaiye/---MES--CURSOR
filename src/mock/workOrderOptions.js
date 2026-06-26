/** 加工工单弹窗下拉选项 Mock */
export const processRouteOptions = ['机加标准路线', '装配标准路线', '热处理路线', '焊接标准路线']
export const workCenterOptions = ['默认工厂', '机加车间', '装配车间', '总装车间', '热处理车间']
export const personInChargeOptions = ['孙琴丽', '张三', '李四', '王五']

/** 工作中心默认负责人 */
export const workCenterManagers = {
  默认工厂: 'admin1',
  机加车间: '张三',
  装配车间: '李四',
  总装车间: '孙琴丽',
  热处理车间: '王五',
}

export function resolveWorkCenterOwner(workCenter) {
  return workCenterManagers[workCenter] || personInChargeOptions[0] || ''
}

export const unitOptions = ['件', '套', 'kg', 'm', '台']
export const warehouseOptions = ['原料仓', '半成品仓', '成品仓', '外协仓']
export const urgencyOptions = ['紧急', '加急', '普通']
