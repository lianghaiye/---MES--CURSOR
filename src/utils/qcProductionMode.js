import { getProductionMode } from '@/store/businessRuleStore'

/** 极简生产模式下启用过程检/成品检自动化（下发预生成、工序 qcConfigs） */
export function isMinimalProductionQcEnabled() {
  const mode = getProductionMode()
  return mode === 'minimal' || mode === 'minimal_salary'
}
