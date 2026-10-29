import dayjs from 'dayjs'
import {
  SETTLE_RULE_TARGET,
  SETTLE_RULE_RESULT,
  SETTLE_RULE_FREQ,
  SETTLE_RULE_SCENE,
  SETTLE_RULE_SCOPE,
} from '@/mock/purchaseSettleRules'
import { SCAN_WINDOW_TYPES } from '@/utils/purchaseSettleRuleWindow'
import { getSupplierById } from '@/store/supplierStore'
import { resolveConflictBuckets } from '@/utils/qcTemplateConflictService'

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
 * 同场景、不同生成维度（入库 ↔ 采购单）且供应商/周期有交集 → 互斥，不可同时启用
 * （含工厂↔工厂、供应商↔供应商、工厂↔供应商）
 */
export function findSettleTargetMutexRules(rule = {}, allRules = []) {
  if (!rule?.enabled) return []
  const scene = rule.bizScene || SETTLE_RULE_SCENE.PURCHASE
  const target = rule.settleTarget || SETTLE_RULE_TARGET.INBOUND
  const list = []
  for (const other of allRules) {
    if (!other?.enabled) continue
    if (rule.id && other.id && rule.id === other.id) continue
    if ((other.bizScene || SETTLE_RULE_SCENE.PURCHASE) !== scene) continue
    if ((other.settleTarget || SETTLE_RULE_TARGET.INBOUND) === target) continue
    if (!supplierScopesOverlap(rule.supplierIds, other.supplierIds)) continue
    if (!cycleScopesOverlap(rule.settlementCycles, other.settlementCycles)) continue
    list.push(other)
  }
  return list
}

/**
 * 启用当前规则时，停用互斥的其他已启用规则
 * @returns {{ disabled: object[], message: string }}
 */
export function disableSettleTargetMutexRules(rule = {}, allRules = {}, now = '') {
  const mutex = findSettleTargetMutexRules(rule, allRules)
  const stamp = now || dayjs().format('YYYY-MM-DD HH:mm:ss')
  const disabled = []
  mutex.forEach((other) => {
    other.enabled = false
    other.updatedAt = stamp
    disabled.push(other)
  })
  const names = disabled.map((r) => r.name || r.code || r.id).filter(Boolean)
  return {
    disabled,
    message: names.length
      ? `已自动停用互斥规则：${names.join('、')}（同场景不同生成维度不可并行）`
      : '',
  }
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

/**
 * 供应商规则：同场景、同生成维度下，供应商已被其他「已启用」供应商规则绑定 → 冲突（对齐质检模板）
 * @returns {{ hasConflict: boolean, kind: 'supplier', conflicts: Array }}
 */
export function findSettleRuleSupplierConflicts(rule = {}, allRules = []) {
  const empty = { hasConflict: false, kind: 'supplier', conflicts: [] }
  if (!rule?.enabled) return empty
  if ((rule.ruleScope || SETTLE_RULE_SCOPE.FACTORY) !== SETTLE_RULE_SCOPE.SUPPLIER) {
    return empty
  }
  const supplierIds = (rule.supplierIds || []).filter(Boolean)
  if (!supplierIds.length) return empty

  const scene = rule.bizScene || SETTLE_RULE_SCENE.PURCHASE
  const target = rule.settleTarget || SETTLE_RULE_TARGET.INBOUND
  const conflicts = []
  let index = 1

  for (const sid of supplierIds) {
    for (const other of allRules) {
      if (!other?.enabled) continue
      if (rule.id && other.id && rule.id === other.id) continue
      if ((other.ruleScope || SETTLE_RULE_SCOPE.FACTORY) !== SETTLE_RULE_SCOPE.SUPPLIER) continue
      if ((other.bizScene || SETTLE_RULE_SCENE.PURCHASE) !== scene) continue
      if ((other.settleTarget || SETTLE_RULE_TARGET.INBOUND) !== target) continue
      if (!(other.supplierIds || []).includes(sid)) continue

      const supplier = getSupplierById(sid)
      conflicts.push({
        key: `${sid}@@${other.id}`,
        index: index++,
        object: { id: sid },
        objectLabel: supplier
          ? `${supplier.name}${supplier.code ? `（${supplier.code}）` : ''}`
          : sid,
        currentRuleId: other.id,
        currentTemplateName: other.name,
        currentTemplateCode: other.id,
      })
    }
  }

  return { hasConflict: conflicts.length > 0, kind: 'supplier', conflicts }
}

/**
 * 按决议处理供应商冲突：替换=从原规则解绑；跳过=当前规则不绑定该供应商
 */
export function applySettleRuleConflictResolution(
  allRules = [],
  supplierIds = [],
  conflicts = [],
  resolution = {},
) {
  const { replaceConflicts, skipConflicts } = resolveConflictBuckets(conflicts, resolution)
  const now = dayjs().format('YYYY-MM-DD HH:mm:ss')

  replaceConflicts.forEach((c) => {
    const sid = c.object?.id
    if (!sid) return
    const other = (allRules || []).find((r) => r.id === c.currentRuleId)
    if (!other) return
    other.supplierIds = (other.supplierIds || []).filter((id) => id !== sid)
    if (!other.supplierIds.length) {
      other.enabled = false
    }
    other.updatedAt = now
  })

  let supplierIdsToSave = [...(supplierIds || [])]
  if (skipConflicts.length) {
    const skipIds = new Set(skipConflicts.map((c) => c.object?.id).filter(Boolean))
    supplierIdsToSave = supplierIdsToSave.filter((id) => !skipIds.has(id))
  }

  return { supplierIdsToSave, replaceConflicts, skipConflicts }
}
