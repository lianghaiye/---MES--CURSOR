/** 采购申请 / 外协订单 · 单据来源 */
export const PROCUREMENT_DOC_SOURCE = {
  MANUAL: '新增',
  SALES_ORDER: '销售订单',
  PRODUCTION_PLAN: '生产计划',
  PRODUCTION_WO: '生产工单',
  ASSEMBLY_WO: '组装工单',
}

export const PROCUREMENT_DOC_SOURCE_OPTIONS = [
  { label: PROCUREMENT_DOC_SOURCE.MANUAL, value: PROCUREMENT_DOC_SOURCE.MANUAL },
  { label: PROCUREMENT_DOC_SOURCE.SALES_ORDER, value: PROCUREMENT_DOC_SOURCE.SALES_ORDER },
  { label: PROCUREMENT_DOC_SOURCE.PRODUCTION_PLAN, value: PROCUREMENT_DOC_SOURCE.PRODUCTION_PLAN },
  { label: PROCUREMENT_DOC_SOURCE.PRODUCTION_WO, value: PROCUREMENT_DOC_SOURCE.PRODUCTION_WO },
  { label: PROCUREMENT_DOC_SOURCE.ASSEMBLY_WO, value: PROCUREMENT_DOC_SOURCE.ASSEMBLY_WO },
]

/** 历史口径归一到新枚举 */
export function normalizeProcurementDocSource(source) {
  const s = String(source || '').trim()
  if (!s) return PROCUREMENT_DOC_SOURCE.MANUAL
  if (s === '外购销售') return PROCUREMENT_DOC_SOURCE.SALES_ORDER
  if (s === '工单转采购' || s === '工单转外协') return PROCUREMENT_DOC_SOURCE.PRODUCTION_WO
  if (Object.values(PROCUREMENT_DOC_SOURCE).includes(s)) return s
  return s
}

/** 按工单类别判定来源：生产工单 / 组装工单 */
export function resolveWorkOrderProcurementSource(wo) {
  const cat = String(wo?.orderCategory || '')
  if (cat.includes('总装') || cat.includes('组装') || cat.includes('部装')) {
    return PROCUREMENT_DOC_SOURCE.ASSEMBLY_WO
  }
  return PROCUREMENT_DOC_SOURCE.PRODUCTION_WO
}
