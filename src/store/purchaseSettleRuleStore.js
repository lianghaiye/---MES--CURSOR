import { reactive, watch } from 'vue'
import dayjs from 'dayjs'
import {
  createPurchaseSettleRule,
  createSettleRuleLog,
  seedPurchaseSettleRules,
  mergeBuiltinSettleRules,
  isBuiltinSettleRule,
  generateSettleRuleCode,
  SETTLE_RULE_TARGET,
  SETTLE_RULE_RESULT,
  SETTLE_RULE_SCENE,
  SETTLE_RULE_SCOPE,
} from '@/mock/purchaseSettleRules'
import { resolveScanWindow, calcNextRunAt } from '@/utils/purchaseSettleRuleWindow'
import {
  findSettleRuleSupplierConflicts,
  applySettleRuleConflictResolution,
  disableSettleTargetMutexRules,
  findSettleTargetMutexRules,
} from '@/utils/purchaseSettleRuleGuard'
import {
  previewSettlesByFixedWindow,
  createSettlesFromPeriod,
  confirmPurchaseSettle,
  listSettleableInboundLines,
  createSettleFromPurchaseOrder,
  purchaseSettleState,
} from '@/store/purchaseSettleStore'
import { purchaseOrderState } from '@/store/purchaseOrderStore'
import { getSupplierByName } from '@/store/supplierStore'

const STORAGE_KEY = 'i_doms_purchase_settle_rules'
const LOG_STORAGE_KEY = 'i_doms_purchase_settle_rule_logs'
const SEED_VERSION_KEY = 'i_doms_purchase_settle_rules_seed_v'
/** v6：演示供应商规则 + 内置无创建人/时间 */
const CURRENT_SEED_VERSION = '6'

function withNextRun(rule) {
  const next = calcNextRunAt(rule)
  return { ...rule, nextRunAt: next ? next.format('YYYY-MM-DD HH:mm:ss') : '' }
}

function loadRules() {
  try {
    const ver = localStorage.getItem(SEED_VERSION_KEY)
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) {
      const parsed = JSON.parse(raw)
      if (Array.isArray(parsed?.rules) && parsed.rules.length) {
        let rules = parsed.rules.map((r) => createPurchaseSettleRule(r))
        rules = mergeBuiltinSettleRules(rules)
        // 补齐历史数据缺失的规则编码
        rules.forEach((r) => {
          if (!r.code) r.code = generateSettleRuleCode(rules)
        })
        // 升级：纠正「入库 + 采购单」同时启用
        if (ver !== CURRENT_SEED_VERSION) {
          normalizeSettleTargetMutex(rules)
          localStorage.setItem(SEED_VERSION_KEY, CURRENT_SEED_VERSION)
        }
        rules = rules.map(withNextRun)
        return rules
      }
    }
  } catch {
    /* ignore */
  }
  return mergeBuiltinSettleRules(seedPurchaseSettleRules()).map(withNextRun)
}

function loadLogs() {
  try {
    const raw = localStorage.getItem(LOG_STORAGE_KEY)
    if (raw) {
      const parsed = JSON.parse(raw)
      if (Array.isArray(parsed?.logs)) return parsed.logs
    }
  } catch {
    /* ignore */
  }
  return []
}

function persistRules() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify({ rules: purchaseSettleRuleState.rules }))
  localStorage.setItem(SEED_VERSION_KEY, CURRENT_SEED_VERSION)
}

function persistLogs() {
  localStorage.setItem(LOG_STORAGE_KEY, JSON.stringify({ logs: purchaseSettleRuleState.logs }))
}

export const purchaseSettleRuleState = reactive({
  rules: loadRules(),
  logs: loadLogs(),
})

// 启动时落盘，确保内置四条已写入本地
persistRules()

watch(
  () => purchaseSettleRuleState.rules,
  () => {
    persistRules()
  },
  { deep: true },
)

watch(
  () => purchaseSettleRuleState.logs,
  () => persistLogs(),
  { deep: true },
)

export function listPurchaseSettleRules() {
  return purchaseSettleRuleState.rules
}

export function getPurchaseSettleRuleById(id) {
  return purchaseSettleRuleState.rules.find((r) => r.id === id) || null
}

export function listSettleRuleLogs(ruleId) {
  const logs = purchaseSettleRuleState.logs
  if (!ruleId) return logs
  return logs.filter((l) => l.ruleId === ruleId)
}

function refreshNextRun(rule) {
  const next = calcNextRunAt(rule)
  rule.nextRunAt = next ? next.format('YYYY-MM-DD HH:mm:ss') : ''
}

/** 加载/升级时：同场景不同生成维度若同时启用，保留「按入库」，停用互斥的「按采购单」等 */
function normalizeSettleTargetMutex(rules = []) {
  const enabled = rules.filter((r) => r?.enabled)
  // 优先保留按入库
  const ordered = [
    ...enabled.filter(
      (r) => (r.settleTarget || SETTLE_RULE_TARGET.INBOUND) === SETTLE_RULE_TARGET.INBOUND,
    ),
    ...enabled.filter(
      (r) => (r.settleTarget || SETTLE_RULE_TARGET.INBOUND) !== SETTLE_RULE_TARGET.INBOUND,
    ),
  ]
  const kept = []
  ordered.forEach((r) => {
    const hit = findSettleTargetMutexRules({ ...r, enabled: true }, kept)
    if (hit.length) {
      r.enabled = false
      return
    }
    kept.push(r)
  })
}

function applyMutexAfterEnable(rule) {
  const { disabled, message } = disableSettleTargetMutexRules(
    { ...rule, enabled: true },
    purchaseSettleRuleState.rules,
  )
  disabled.forEach((other) => refreshNextRun(other))
  return message
}

function normalizeRulePayload(payload = {}) {
  const ruleScope = payload.ruleScope || SETTLE_RULE_SCOPE.FACTORY
  const bizScene = payload.bizScene || SETTLE_RULE_SCENE.PURCHASE
  let supplierIds = Array.isArray(payload.supplierIds) ? [...payload.supplierIds] : []
  if (ruleScope === SETTLE_RULE_SCOPE.FACTORY) {
    supplierIds = []
  }
  return { ...payload, ruleScope, bizScene, supplierIds }
}

/**
 * 已被「同场景 + 同结算对象」的供应商覆盖规则命中的供应商 id
 * （工厂兜底规则执行时应排除）
 */
export function listSupplierIdsCoveredByOverrides(bizScene, settleTarget, excludeRuleId = '') {
  const scene = bizScene || SETTLE_RULE_SCENE.PURCHASE
  const target = settleTarget || SETTLE_RULE_TARGET.INBOUND
  const ids = new Set()
  purchaseSettleRuleState.rules.forEach((r) => {
    if (!r?.enabled) return
    if (excludeRuleId && r.id === excludeRuleId) return
    if ((r.ruleScope || SETTLE_RULE_SCOPE.FACTORY) !== SETTLE_RULE_SCOPE.SUPPLIER) return
    if ((r.bizScene || SETTLE_RULE_SCENE.PURCHASE) !== scene) return
    if ((r.settleTarget || SETTLE_RULE_TARGET.INBOUND) !== target) return
    ;(r.supplierIds || []).forEach((id) => {
      if (id) ids.add(id)
    })
  })
  return ids
}

/** 内置规则允许用户改的字段 */
const BUILTIN_EDITABLE_KEYS = [
  'enabled',
  'resultMode',
  'allowAppend',
  'executeFreq',
  'executeTime',
  'executeWeekday',
  'executeMonthDay',
  'scanWindowType',
  'scanLastNDays',
  'scanStart',
  'scanEnd',
  'remark',
]

/**
 * @param {object} payload
 * @param {{ conflictResolution?: object }} [options]
 */
export function savePurchaseSettleRule(payload = {}, options = {}) {
  const { conflictResolution } = options
  const name = String(payload.name || '').trim()
  if (!name) return { ok: false, message: '请填写规则名称' }
  if (!payload.executeTime) return { ok: false, message: '请填写执行时刻' }
  if (payload.scanWindowType === 'fixed' && (!payload.scanStart || !payload.scanEnd)) {
    return { ok: false, message: '固定时间段须填写起止日期' }
  }

  const now = dayjs().format('YYYY-MM-DD HH:mm:ss')
  let rule

  if (payload.id && isBuiltinSettleRule(payload)) {
    const idx = purchaseSettleRuleState.rules.findIndex((r) => r.id === payload.id)
    if (idx < 0) return { ok: false, message: '规则不存在' }
    const prev = purchaseSettleRuleState.rules[idx]
    const patch = {}
    BUILTIN_EDITABLE_KEYS.forEach((k) => {
      if (payload[k] !== undefined) patch[k] = payload[k]
    })
    if (patch.scanWindowType === 'fixed' && prev.scanWindowType !== 'fixed') {
      patch.lastScheduleRunAt = ''
    }
    rule = createPurchaseSettleRule({
      ...prev,
      ...patch,
      builtin: true,
      name: prev.name,
      bizScene: prev.bizScene,
      ruleScope: SETTLE_RULE_SCOPE.FACTORY,
      settleTarget: prev.settleTarget,
      settlementCycles: [...(prev.settlementCycles || [])],
      supplierIds: [],
      creator: '',
      createdAt: '',
      updater: 'admin1',
      updatedAt: now,
    })
    refreshNextRun(rule)
    purchaseSettleRuleState.rules.splice(idx, 1, rule)
    let message = '内置规则已保存'
    if (rule.enabled) {
      const mutexMsg = applyMutexAfterEnable(rule)
      if (mutexMsg) message = `${message}；${mutexMsg}`
    }
    queueReschedule()
    return { ok: true, rule, message }
  }

  const normalized = normalizeRulePayload({
    ...payload,
    ruleScope: payload.id
      ? payload.ruleScope || SETTLE_RULE_SCOPE.SUPPLIER
      : SETTLE_RULE_SCOPE.SUPPLIER,
    builtin: false,
  })
  if (normalized.ruleScope !== SETTLE_RULE_SCOPE.SUPPLIER) {
    return { ok: false, message: '仅支持新建/维护供应商自定义规则；工厂默认请用内置规则' }
  }
  if (!(normalized.supplierIds || []).length) {
    return { ok: false, message: '供应商规则须指定至少一个供应商（用于覆盖工厂默认）' }
  }

  if (normalized.enabled) {
    const probe = {
      ...normalized,
      id: normalized.id || '',
      name,
      ruleScope: SETTLE_RULE_SCOPE.SUPPLIER,
    }
    const conflict = findSettleRuleSupplierConflicts(probe, purchaseSettleRuleState.rules)
    if (conflict.hasConflict && !conflictResolution) {
      return { ok: false, needConflict: true, conflict }
    }
    if (conflict.hasConflict && conflictResolution) {
      const { supplierIdsToSave } = applySettleRuleConflictResolution(
        purchaseSettleRuleState.rules,
        normalized.supplierIds,
        conflict.conflicts,
        conflictResolution,
      )
      if (!supplierIdsToSave.length) {
        return { ok: false, message: '跳过冲突后无剩余供应商，无法保存并启用' }
      }
      normalized.supplierIds = supplierIdsToSave
    }
  }

  if (normalized.id) {
    const idx = purchaseSettleRuleState.rules.findIndex((r) => r.id === normalized.id)
    if (idx < 0) return { ok: false, message: '规则不存在' }
    if (isBuiltinSettleRule(purchaseSettleRuleState.rules[idx])) {
      return { ok: false, message: '内置规则不可按供应商规则保存' }
    }
    const prev = purchaseSettleRuleState.rules[idx]
    const clearOneShot =
      normalized.scanWindowType === 'fixed' &&
      (prev.scanWindowType !== 'fixed' ||
        prev.scanStart !== normalized.scanStart ||
        prev.scanEnd !== normalized.scanEnd)
    rule = createPurchaseSettleRule({
      ...prev,
      ...normalized,
      name,
      code: prev.code || generateSettleRuleCode(purchaseSettleRuleState.rules),
      builtin: false,
      ruleScope: SETTLE_RULE_SCOPE.SUPPLIER,
      lastScheduleRunAt: clearOneShot ? '' : prev.lastScheduleRunAt,
      updater: 'admin1',
      updatedAt: now,
    })
    refreshNextRun(rule)
    purchaseSettleRuleState.rules.splice(idx, 1, rule)
    let message = '规则已保存'
    if (rule.enabled) {
      const mutexMsg = applyMutexAfterEnable(rule)
      if (mutexMsg) message = `${message}；${mutexMsg}`
    }
    queueReschedule()
    return { ok: true, rule, message }
  }

  rule = createPurchaseSettleRule({
    ...normalized,
    id: `psr-${Date.now()}`,
    code: generateSettleRuleCode(purchaseSettleRuleState.rules),
    name,
    builtin: false,
    ruleScope: SETTLE_RULE_SCOPE.SUPPLIER,
    creator: 'admin1',
    updater: 'admin1',
    createdAt: now,
    updatedAt: now,
  })
  refreshNextRun(rule)
  purchaseSettleRuleState.rules.unshift(rule)
  let createMessage = '规则已创建'
  if (rule.enabled) {
    const mutexMsg = applyMutexAfterEnable(rule)
    if (mutexMsg) createMessage = `${createMessage}；${mutexMsg}`
  }
  queueReschedule()
  return { ok: true, rule, message: createMessage }
}

export function deletePurchaseSettleRule(id) {
  const idx = purchaseSettleRuleState.rules.findIndex((r) => r.id === id)
  if (idx < 0) return { ok: false, message: '规则不存在' }
  if (isBuiltinSettleRule(purchaseSettleRuleState.rules[idx])) {
    return { ok: false, message: '内置规则不可删除，可停用' }
  }
  purchaseSettleRuleState.rules.splice(idx, 1)
  queueReschedule()
  return { ok: true, message: '规则已删除' }
}

/**
 * @param {string} id
 * @param {boolean} enabled
 * @param {{ conflictResolution?: object }} [options]
 */
export function setPurchaseSettleRuleEnabled(id, enabled, options = {}) {
  const rule = getPurchaseSettleRuleById(id)
  if (!rule) return { ok: false, message: '规则不存在' }

  if (!enabled) {
    rule.enabled = false
    rule.updatedAt = dayjs().format('YYYY-MM-DD HH:mm:ss')
    refreshNextRun(rule)
    queueReschedule()
    return { ok: true, rule, message: '规则已停用' }
  }

  if (
    (rule.ruleScope || SETTLE_RULE_SCOPE.FACTORY) === SETTLE_RULE_SCOPE.SUPPLIER &&
    (rule.supplierIds || []).length
  ) {
    const probe = { ...rule, enabled: true }
    const conflict = findSettleRuleSupplierConflicts(probe, purchaseSettleRuleState.rules)
    if (conflict.hasConflict && !options.conflictResolution) {
      return { ok: false, needConflict: true, conflict, rule }
    }
    if (conflict.hasConflict && options.conflictResolution) {
      const { supplierIdsToSave } = applySettleRuleConflictResolution(
        purchaseSettleRuleState.rules,
        rule.supplierIds,
        conflict.conflicts,
        options.conflictResolution,
      )
      if (!supplierIdsToSave.length) {
        return { ok: false, message: '跳过冲突后无剩余供应商，无法启用' }
      }
      rule.supplierIds = supplierIdsToSave
    }
  }

  rule.enabled = true
  rule.updater = 'admin1'
  rule.updatedAt = dayjs().format('YYYY-MM-DD HH:mm:ss')
  refreshNextRun(rule)
  const mutexMsg = applyMutexAfterEnable(rule)
  queueReschedule()
  return {
    ok: true,
    rule,
    message: mutexMsg ? `规则已启用；${mutexMsg}` : '规则已启用',
  }
}

function queueReschedule() {
  Promise.resolve().then(() => {
    import('@/utils/purchaseSettleRuleScheduler').then((m) => {
      m.reschedulePurchaseSettleRules()
    })
  })
}

function getPoCompletedAt(po) {
  if (!po) return ''
  if (po.completedAt) return String(po.completedAt).slice(0, 10)
  if (po.status === '已完成' && po.updatedAt) return String(po.updatedAt).slice(0, 10)
  return ''
}

function isFactoryScope(rule) {
  return (rule.ruleScope || SETTLE_RULE_SCOPE.FACTORY) !== SETTLE_RULE_SCOPE.SUPPLIER
}

function filterGroupsByFactoryOverride(rule, groups = []) {
  if (!isFactoryScope(rule)) return { groups, skippedCovered: [] }
  const covered = listSupplierIdsCoveredByOverrides(rule.bizScene, rule.settleTarget, rule.id)
  if (!covered.size) return { groups, skippedCovered: [] }
  const kept = []
  const skippedCovered = []
  groups.forEach((g) => {
    const sid = g.supplierId || getSupplierByName(g.supplier)?.id || ''
    if (sid && covered.has(sid)) {
      skippedCovered.push(`${g.supplier} 已由供应商规则覆盖，跳过工厂默认`)
      return
    }
    kept.push(g)
  })
  return { groups: kept, skippedCovered }
}

function runInboundRule(rule, windowInfo) {
  const supplierIds = isFactoryScope(rule)
    ? undefined
    : rule.supplierIds?.length
      ? rule.supplierIds
      : undefined
  if (!isFactoryScope(rule) && !supplierIds?.length) {
    return { ok: false, message: '供应商规则未指定供应商', settles: [], skipped: [] }
  }
  const allowAppend = !!rule.allowAppend
  const preview = previewSettlesByFixedWindow({
    periodStart: windowInfo.periodStart,
    periodEnd: windowInfo.periodEnd,
    periodKey: `${rule.id}:${windowInfo.periodKey}`,
    periodLabel: windowInfo.label,
    supplierIds,
    settlementCycles: rule.settlementCycles?.length ? rule.settlementCycles : undefined,
    allowAppend,
  })
  if (!preview.ok) {
    return { ok: false, message: preview.message, settles: [], skipped: [] }
  }
  const { groups: scopedGroups, skippedCovered } = filterGroupsByFactoryOverride(
    rule,
    preview.groups || [],
  )
  const selectable = scopedGroups.filter((g) => g.selectable)
  if (!selectable.length) {
    const skipped = [
      ...skippedCovered,
      ...scopedGroups
        .filter((g) => g.exists || !g.lineCount)
        .map((g) => {
          if (g.exists && g.lineCount) {
            return `${g.supplier} 已有结算「${g.existingSettleNo}」（未开启追加）`
          }
          if (g.exists) {
            return `${g.supplier} 已有结算「${g.existingSettleNo}」且无可追加明细`
          }
          return `${g.supplier} 无可结算明细`
        }),
    ]
    return {
      ok: true,
      message: skipped.length ? `无可新建结算；${skipped.join('；')}` : '扫描窗口内无可结算入库',
      settles: [],
      skipped,
    }
  }

  const createdRes = createSettlesFromPeriod(selectable, {
    settleDate: dayjs().format('YYYY-MM-DD'),
    remark: `规则「${rule.name}」自动生成 ${windowInfo.label}`,
    allowAppend,
  })
  if (!createdRes.ok && !createdRes.settles?.length) {
    return {
      ok: false,
      message: createdRes.message,
      settles: [],
      skipped: createdRes.skipped || [],
    }
  }

  const settles = createdRes.settles || []
  if (rule.resultMode === SETTLE_RULE_RESULT.AUTO_CONFIRM) {
    for (const s of settles) {
      confirmPurchaseSettle(s.id)
    }
  }

  return {
    ok: true,
    message: createdRes.message,
    settles,
    skipped: [...skippedCovered, ...(createdRes.skipped || [])],
  }
}

function runPurchaseOrderRule(rule, windowInfo) {
  const created = []
  const skipped = []
  const isFactory = isFactoryScope(rule)
  const supplierIdSet = isFactory
    ? null
    : rule.supplierIds?.length
      ? new Set(rule.supplierIds)
      : null
  if (!isFactory && !supplierIdSet?.size) {
    return { ok: false, message: '供应商规则未指定供应商', settles: [], skipped: [] }
  }
  const covered = isFactory
    ? listSupplierIdsCoveredByOverrides(rule.bizScene, rule.settleTarget, rule.id)
    : new Set()
  const cycleSet = rule.settlementCycles?.length ? new Set(rule.settlementCycles) : null

  const candidates = purchaseOrderState.orders.filter((po) => {
    if (po.status !== '已完成') return false
    const completed = getPoCompletedAt(po)
    if (!completed) return false
    if (completed < windowInfo.periodStart || completed > windowInfo.periodEnd) return false
    const supplier = getSupplierByName(po.supplier)
    if (supplierIdSet) {
      if (!supplier || !supplierIdSet.has(supplier.id)) return false
    }
    if (covered.size && supplier?.id && covered.has(supplier.id)) {
      skipped.push(`${po.orderNo}（${po.supplier}）已由供应商规则覆盖，跳过工厂默认`)
      return false
    }
    if (cycleSet) {
      const cycle = supplier?.settlementCycle || po.settlementCycle
      if (!cycleSet.has(cycle)) return false
    }
    return true
  })

  if (!candidates.length) {
    return { ok: true, message: '扫描窗口内无已完成且可结算的采购单', settles: [], skipped: [] }
  }

  const allowAppend = !!rule.allowAppend
  for (const po of candidates) {
    const periodKey = `${rule.id}:${windowInfo.periodKey}:po:${po.id}`
    const existsByKey = findSettleByPeriodKey(periodKey)
    const lines = listSettleableInboundLines(po.id)
    if (existsByKey && !allowAppend) {
      skipped.push(`${po.orderNo} 本窗已结算过`)
      continue
    }
    if (!lines.length) {
      skipped.push(
        existsByKey ? `${po.orderNo} 已有结算且无可追加入库` : `${po.orderNo} 无可结算入库`,
      )
      continue
    }
    const res = createSettleFromPurchaseOrder(po.id, {
      settleDate: dayjs().format('YYYY-MM-DD'),
      remark: `规则「${rule.name}」按采购单生成 ${windowInfo.label}`,
      lineItems: lines,
    })
    if (!res.ok) {
      skipped.push(`${po.orderNo}：${res.message}`)
      continue
    }
    // stamp periodKey for idempotency
    res.settle.periodKey = periodKey
    res.settle.periodStart = windowInfo.periodStart
    res.settle.periodEnd = windowInfo.periodEnd
    res.settle.generateMode = 'period'
    if (rule.resultMode === SETTLE_RULE_RESULT.AUTO_CONFIRM) {
      confirmPurchaseSettle(res.settle.id)
    }
    created.push(res.settle)
  }

  if (!created.length) {
    return {
      ok: true,
      message: skipped.length ? skipped.join('；') : '未生成结算单',
      settles: [],
      skipped,
    }
  }

  return {
    ok: true,
    message: `已生成 ${created.length} 张结算单${skipped.length ? `；跳过：${skipped.join('；')}` : ''}`,
    settles: created,
    skipped,
  }
}

function findSettleByPeriodKey(periodKey) {
  return purchaseSettleState.settles.find((s) => s.periodKey === periodKey) || null
}

/**
 * 执行规则（立即试跑或调度触发）
 * @param {string} ruleId
 * @param {{ trigger?: 'manual'|'schedule', now?: any }} options
 */
export function executePurchaseSettleRule(ruleId, options = {}) {
  const rule = getPurchaseSettleRuleById(ruleId)
  if (!rule) return { ok: false, message: '规则不存在' }

  const trigger = options.trigger || 'manual'
  if (trigger === 'schedule' && !rule.enabled) {
    return { ok: false, message: '规则未启用' }
  }

  const windowInfo = resolveScanWindow(rule, options.now || dayjs())
  if (!windowInfo.ok) {
    pushLog(
      createSettleRuleLog({
        ruleId: rule.id,
        ruleName: rule.name,
        trigger,
        status: 'failed',
        message: windowInfo.message,
      }),
    )
    return { ok: false, message: windowInfo.message }
  }

  let result
  const scene = rule.bizScene || SETTLE_RULE_SCENE.PURCHASE
  if (
    scene === SETTLE_RULE_SCENE.OUTSOURCING &&
    rule.settleTarget === SETTLE_RULE_TARGET.PURCHASE_ORDER
  ) {
    result = {
      ok: true,
      message: '外协「按外协订单」结算执行待对接外协结算单，本次未生成单据',
      settles: [],
      skipped: ['外协按订单结算待对接'],
    }
  } else if (rule.settleTarget === SETTLE_RULE_TARGET.PURCHASE_ORDER) {
    result = runPurchaseOrderRule(rule, windowInfo)
  } else {
    result = runInboundRule(rule, windowInfo)
  }

  rule.lastRunAt = dayjs().format('YYYY-MM-DD HH:mm:ss')
  // 固定窗口：仅调度触发计为「自动已跑一次」
  if ((rule.scanWindowType || '') === 'fixed' && trigger === 'schedule') {
    rule.lastScheduleRunAt = rule.lastRunAt
  }
  refreshNextRun(rule)

  const settleNos = (result.settles || []).map((s) => s.settleNo)
  let status = 'success'
  if (!result.ok) status = 'failed'
  else if (!settleNos.length && result.skipped?.length) status = 'skipped'
  else if (settleNos.length && result.skipped?.length) status = 'partial'

  pushLog(
    createSettleRuleLog({
      ruleId: rule.id,
      ruleName: rule.name,
      trigger,
      status,
      message: result.message || '',
      periodStart: windowInfo.periodStart,
      periodEnd: windowInfo.periodEnd,
      periodKey: windowInfo.periodKey,
      settleNos,
      skipped: result.skipped || [],
    }),
  )

  return {
    ok: result.ok,
    message: result.message,
    settles: result.settles || [],
    skipped: result.skipped || [],
    window: windowInfo,
  }
}

function pushLog(log) {
  purchaseSettleRuleState.logs.unshift(log)
  if (purchaseSettleRuleState.logs.length > 200) {
    purchaseSettleRuleState.logs.length = 200
  }
}

export { SETTLE_RULE_TARGET, SETTLE_RULE_RESULT }
