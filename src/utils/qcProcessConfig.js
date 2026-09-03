import { qcTemplateBizScopeOptions } from '@/mock/qcTemplates'

const PROCESS_QC_BIZ_SCOPES = ['生产过程检', '成品检']

export function isProcessQcBizScope(bizScope) {
  return PROCESS_QC_BIZ_SCOPES.includes(bizScope)
}

export function createProcessQcConfig(partial = {}) {
  const bizScope = partial.bizScope || '生产过程检'
  return {
    id: partial.id || `pqc-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    // 列表有即生效；不用则删除。不再单独做启用开关
    enabled: true,
    bizScope: isProcessQcBizScope(bizScope) ? bizScope : '生产过程检',
    templateCode: '',
    remark: partial.remark || '',
  }
}

export function normalizeProcessQcConfigs(list) {
  if (!Array.isArray(list)) return []
  const seen = new Set()
  const result = []
  list.forEach((row) => {
    const item = createProcessQcConfig(row)
    if (seen.has(item.bizScope)) return
    seen.add(item.bizScope)
    result.push(item)
  })
  return result
}

export function processQcBizScopeOptions() {
  return qcTemplateBizScopeOptions
    .filter((v) => isProcessQcBizScope(v))
    .map((v) => ({ label: v, value: v }))
}

/** 从旧工序 opQc 迁移默认配置（种子数据兼容） */
export function defaultQcConfigsFromOperations(operations = {}) {
  if (!operations?.opQc) return []
  return [createProcessQcConfig({ bizScope: '生产过程检' })]
}
