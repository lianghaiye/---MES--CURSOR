/** 入库单源单号跳转 */
export function resolveInboundSourceRoute(order) {
  if (!order?.sourceOrderNo) return null
  const type = order.sourceType || ''
  const no = order.sourceOrderNo

  if (type === '采购订单' || type === '采购单') {
    return { path: '/procurement/purchase-orders', query: { docNo: no } }
  }
  if (type === '生产工单') {
    return { path: '/production/work-orders', query: { code: no } }
  }
  if (type === '报废单') {
    return { path: '/quality/scrap-orders', query: { scrapNo: no } }
  }
  if (type === '拆解工单') {
    return { path: '/production/disassembly-work-orders', query: { code: no } }
  }
  return null
}
