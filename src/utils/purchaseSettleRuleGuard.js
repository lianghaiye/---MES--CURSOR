import {
  SETTLE_RULE_TARGET,
  SETTLE_RULE_RESULT,
  SETTLE_RULE_FREQ,
  SETTLE_RULE_SCENE,
  SETTLE_RULE_SCOPE,
} from '@/mock/purchaseSettleRules'
import { SCAN_WINDOW_TYPES } from '@/utils/purchaseSettleRuleWindow'

/** 推荐模板：工厂兜底 / 供应商覆盖 */
export const SETTLE_RULE_TEMPLATES = [
  {
    key: 'purchase_factory_monthly',
    label: '采购·工厂默认·月结扫上月',
    partial: {
      name: '采购·工厂默认·按月结算（月结）',
      enabled: true,
      bizScene: SETTLE_RULE_SCENE.PURCHASE,
      ruleScope: SETTLE_RULE_SCOPE.FACTORY,
      settleTarget: SETTLE_RULE_TARGET.INBOUND,
      resultMode: SETTLE_RULE_RESULT.DRAFT,
      executeFreq: SETTLE_RULE_FREQ.MONTHLY,
      executeTime: '02:00',
      executeMonthDay: 1,
      scanWindowType: SCAN_WINDOW_TYPES.LAST_MONTH,
      supplierIds: [],
      settlementCycles: ['月结'],
      remark: '工厂兜底：未被供应商规则覆盖的月结供应商',
    },
  },
  {
    key: 'purchase_factory_weekly',
    label: '采购·工厂默认·周结扫上周',
    partial: {
      name: '采购·工厂默认·按周结算（周结）',
      enabled: true,
      bizScene: SETTLE_RULE_SCENE.PURCHASE,
      ruleScope: SETTLE_RULE_SCOPE.FACTORY,
      settleTarget: SETTLE_RULE_TARGET.INBOUND,
      resultMode: SETTLE_RULE_RESULT.DRAFT,
      executeFreq: SETTLE_RULE_FREQ.WEEKLY,
      executeTime: '02:00',
      executeWeekday: 1,
      scanWindowType: SCAN_WINDOW_TYPES.LAST_WEEK,
      supplierIds: [],
      settlementCycles: ['周结'],
      remark: '工厂兜底：未被供应商规则覆盖的周结供应商',
    },
  },
  {
    key: 'purchase_supplier_override',
    label: '采购·供应商覆盖·自定义',
    partial: {
      name: '采购·供应商覆盖·特殊对账节奏',
      enabled: true,
      bizScene: SETTLE_RULE_SCENE.PURCHASE,
      ruleScope: SETTLE_RULE_SCOPE.SUPPLIER,
      settleTarget: SETTLE_RULE_TARGET.INBOUND,
      resultMode: SETTLE_RULE_RESULT.DRAFT,
      executeFreq: SETTLE_RULE_FREQ.WEEKLY,
      executeTime: '02:00',
      executeWeekday: 1,
      scanWindowType: SCAN_WINDOW_TYPES.LAST_WEEK,
      supplierIds: [],
      settlementCycles: [],
      remark: '覆盖工厂默认：请指定供应商；同场景同结算对象下工厂规则将跳过这些供应商',
    },
  },
  {
    key: 'outsourcing_factory_monthly',
    label: '外协·工厂默认·月结扫上月',
    partial: {
      name: '外协·工厂默认·按月结算（月结）',
      enabled: true,
      bizScene: SETTLE_RULE_SCENE.OUTSOURCING,
      ruleScope: SETTLE_RULE_SCOPE.FACTORY,
      settleTarget: SETTLE_RULE_TARGET.INBOUND,
      resultMode: SETTLE_RULE_RESULT.DRAFT,
      executeFreq: SETTLE_RULE_FREQ.MONTHLY,
      executeTime: '02:30',
      executeMonthDay: 1,
      scanWindowType: SCAN_WINDOW_TYPES.LAST_MONTH,
      supplierIds: [],
      settlementCycles: ['月结'],
      remark: '外协场景工厂兜底',
    },
  },
]

function asIdSet(ids) {
  return new Set((ids || []).filter(Boolean))
}

function asCycleSet(cycles) {
  return new Set((cycles || []).filter(Boolean))
}

/** 空=全部，视为与任意范围有交集 */
export function supplierScopesOverlap(aIds, bIds) {
  const a = asIdSet(aIds)
  const b = asIdSet(bIds)
  if (!a.size || !b.size) return true
  for (const id of a) {
    if (b.has(id)) return true
  }
  return false
}

export function cycleScopesOverlap(aCycles, bCycles) {
  const a = asCycleSet(aCycles)
  const b = asCycleSet(bCycles)
  if (!a.size || !b.size) return true
  for (const c of a) {
    if (b.has(c)) return true
  }
  return false
}

function fixedRangesOverlap(a, b) {
  if (!a.scanStart || !a.scanEnd || !b.scanStart || !b.scanEnd) return true
  return !(a.scanEnd < b.scanStart || b.scanEnd < a.scanStart)
}

/**
 * 扫描窗口是否可能扫到同一批入库日（保守判断）
 */
export function scanWindowsMayOverlap(a, b) {
  const ta = a.scanWindowType || SCAN_WINDOW_TYPES.LAST_MONTH
  const tb = b.scanWindowType || SCAN_WINDOW_TYPES.LAST_MONTH
  if (ta === SCAN_WINDOW_TYPES.FIXED && tb === SCAN_WINDOW_TYPES.FIXED) {
    return fixedRangesOverlap(a, b)
  }
  return true
}

/**
 * 保存前配置风险提示（不阻断，由 UI 二次确认）
 */
export function collectSettleRuleSaveWarnings(rule = {}) {
  const warnings = []
  const cycles = rule.settlementCycles || []
  const freq = rule.executeFreq
  const scan = rule.scanWindowType || SCAN_WINDOW_TYPES.LAST_MONTH
  const monthlyLike = freq === SETTLE_RULE_FREQ.MONTHLY || scan === SCAN_WINDOW_TYPES.LAST_MONTH
  const weeklyLike = freq === SETTLE_RULE_FREQ.WEEKLY || scan === SCAN_WINDOW_TYPES.LAST_WEEK
  const scope = rule.ruleScope || SETTLE_RULE_SCOPE.FACTORY

  if (scope === SETTLE_RULE_SCOPE.SUPPLIER && !(rule.supplierIds || []).length) {
    warnings.push('供应商规则尚未选择供应商，保存时将校验必填。')
  }

  if (scope === SETTLE_RULE_SCOPE.FACTORY && !cycles.length) {
    if (monthlyLike) {
      warnings.push(
        '工厂默认且「适用结算周期」为空：月度扫描会把多种周期供应商一并扫入。建议勾选周期，或为特殊供应商建覆盖规则。',
      )
    } else if (weeklyLike) {
      warnings.push(
        '工厂默认且「适用结算周期」为空：周度扫描不区分周期。建议勾选「周结」，特殊供应商用覆盖规则。',
      )
    } else {
      warnings.push(
        '工厂默认且适用结算周期为空：窗内有可结算数据的都会尝试出单（已被覆盖的供应商除外）。',
      )
    }
  }

  if (rule.resultMode === SETTLE_RULE_RESULT.AUTO_CONFIRM && !cycles.length) {
    warnings.push('执行结果为「自动确认」且不限结算周期：误扫后会直接确认占量，请确认范围无误。')
  }

  return warnings
}

/**
 * 与其它已启用规则的潜在冲突
 * 工厂默认 vs 供应商覆盖：设计上为覆盖关系，不判冲突
 */
export function findConflictingSettleRules(rule, allRules = []) {
  if (!rule?.enabled) return []
  const scope = rule.ruleScope || SETTLE_RULE_SCOPE.FACTORY
  const scene = rule.bizScene || SETTLE_RULE_SCENE.PURCHASE
  const conflicts = []
  for (const other of allRules) {
    if (!other?.enabled) continue
    if (rule.id && other.id && rule.id === other.id) continue
    if ((other.bizScene || SETTLE_RULE_SCENE.PURCHASE) !== scene) continue
    if (
      (rule.settleTarget || SETTLE_RULE_TARGET.INBOUND) !==
      (other.settleTarget || SETTLE_RULE_TARGET.INBOUND)
    ) {
      continue
    }
    const otherScope = other.ruleScope || SETTLE_RULE_SCOPE.FACTORY
    // 工厂 ↔ 供应商：覆盖关系，不算冲突
    if (scope !== otherScope) continue
    if (!supplierScopesOverlap(rule.supplierIds, other.supplierIds)) continue
    if (!cycleScopesOverlap(rule.settlementCycles, other.settlementCycles)) continue
    if (!scanWindowsMayOverlap(rule, other)) continue

    const reasons = []
    if (!(rule.settlementCycles || []).length || !(other.settlementCycles || []).length) {
      reasons.push('适用周期有一侧为空（不限）')
    } else {
      reasons.push('适用周期有交集')
    }
    if (scope === SETTLE_RULE_SCOPE.SUPPLIER) {
      reasons.push('覆盖了相同供应商')
    } else {
      reasons.push('同为工厂默认且扫描窗口可能重叠')
    }

    conflicts.push({
      rule: other,
      message: `与已启用规则「${other.name}」可能冲突：${reasons.join('；')}`,
    })
  }
  return conflicts
}

export function formatSettleRuleGuardMessages(warnings = [], conflicts = []) {
  const lines = [...warnings]
  conflicts.forEach((c) => lines.push(c.message))
  return lines
}
