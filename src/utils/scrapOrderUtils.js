/** 仓库负责人映射 */
export const WAREHOUSE_KEEPER_MAP = {
  原料仓: '张三',
  半成品仓: '李四',
  成品仓: '王五',
  外协仓: '孙琴丽',
}

/** 物料单价 Mock（BOM/物料单价） */
const UNIT_PRICE_MAP = {
  CP2610001: 520,
  CP2610002: 640,
  CP2610003: 880,
  CP2610004: 1200,
  CP2610005: 360,
}

export function resolveWarehouseKeeper(warehouse) {
  return WAREHOUSE_KEEPER_MAP[warehouse] || '张三'
}

export function resolveUnitPrice(itemCode, fallback = 500) {
  if (itemCode && UNIT_PRICE_MAP[itemCode] != null) return UNIT_PRICE_MAP[itemCode]
  return fallback
}

export function calcScrapCost(qty, unitPrice) {
  const q = Number(qty) || 0
  const p = Number(unitPrice) || 0
  return Math.round(q * p * 100) / 100
}

export function isAuditedStatus(status) {
  return status === '审核通过' || status === '驳回'
}

/** 列表展示：待审核 / 已审核 */
export function displayAuditStatus(status) {
  if (status === '待审核') return '待审核'
  if (isAuditedStatus(status)) return '已审核'
  return status || '—'
}

export function auditStatusColor(status) {
  if (status === '待审核') return 'processing'
  if (status === '审核通过') return 'success'
  if (status === '驳回') return 'error'
  return 'default'
}

/** 列表展示用审核状态颜色 */
export function displayAuditStatusColor(status) {
  if (status === '待审核') return 'processing'
  if (isAuditedStatus(status)) return 'success'
  return 'default'
}

/** 报废单号：报废申请取报废单号，拆解报废取拆解工单号 */
export function displayScrapNo(record) {
  if (!record) return '—'
  if (record.scrapSource === '拆解报废') {
    return record.disassemblyWorkOrderCode || record.scrapNo || '—'
  }
  return record.scrapNo || '—'
}

/** 申请人：拆解报废取拆解单执行人 */
export function displayApplicant(record) {
  if (!record) return '—'
  if (record.scrapSource === '拆解报废') {
    return record.disassemblyExecutor || record.applicant || '—'
  }
  return record.applicant || record.reportedBy || '—'
}

export function displayAppliedAt(record) {
  return record?.appliedAt || record?.reportedAt || '—'
}

export function formatScrapCell(value) {
  if (value == null || value === '') return '—'
  return value
}

export function replenishStatusColor(status) {
  if (status === '未补料') return 'warning'
  if (status === '已补料') return 'success'
  if (status === '不需补料') return 'default'
  return 'default'
}
