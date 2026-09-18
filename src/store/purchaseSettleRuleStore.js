import { reactive, watch } from 'vue'
import dayjs from 'dayjs'
import {
  createPurchaseSettleRule,
  createSettleRuleLog,
  seedPurchaseSettleRules,
  SETTLE_RULE_TARGET,
  SETTLE_RULE_RESULT,
} from '@/mock/purchaseSettleRules'
import { resolveScanWindow, calcNextRunAt } from '@/utils/purchaseSettleRuleWindow'
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

function loadRules() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) {
      const parsed = JSON.parse(raw)
      if (Array.isArray(parsed?.rules) && parsed.rules.length) {
        return parsed.rules.map((r) => createPurchaseSettleRule(r))
      }
    }
  } catch {
    /* ignore */
  }
  return seedPurchaseSettleRules().map((r) => {
    const next = calcNextRunAt(r)
    return { ...r, nextRunAt: next ? next.format('YYYY-MM-DD HH:mm:ss') : '' }
  })
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
}

function persistLogs() {
  localStorage.setItem(LOG_STORAGE_KEY, JSON.stringify({ logs: purchaseSettleRuleState.logs }))
}

export const purchaseSettleRuleState = reactive({
  rules: loadRules(),
  logs: loadLogs(),
})

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

export function savePurchaseSettleRule(payload = {}) {
  const name = String(payload.name || '').trim()
  if (!name) return { ok: false, message: '请填写规则名称' }
  if (!payload.executeTime) return { ok: false, message: '请填写执行时刻' }
  if (payload.scanWindowType === 'fixed' && (!payload.scanStart || !payload.scanEnd)) {
    return { ok: false, message: '固定时间段须填写起止日期' }
  }

  const now = dayjs().format('YYYY-MM-DD HH:mm:ss')
  let rule
  if (payload.id) {
    const idx = purchaseSettleRuleState.rules.findIndex((r) => r.id === payload.id)
    if (idx < 0) return { ok: false, message: '规则不存在' }
    rule = createPurchaseSettleRule({
      ...purchaseSettleRuleState.rules[idx],
      ...payload,
      name,
      updatedAt: now,
    })
    refreshNextRun(rule)
    purchaseSettleRuleState.rules.splice(idx, 1, rule)
    queueReschedule()
    return { ok: true, rule, message: '规则已保存' }
  }

  rule = createPurchaseSettleRule({
    ...payload,
    id: `psr-${Date.now()}`,
    name,
    createdAt: now,
    updatedAt: now,
  })
  refreshNextRun(rule)
  purchaseSettleRuleState.rules.unshift(rule)
  queueReschedule()
  return { ok: true, rule, message: '规则已创建' }
}

export function deletePurchaseSettleRule(id) {
  const idx = purchaseSettleRuleState.rules.findIndex((r) => r.id === id)
  if (idx < 0) return { ok: false, message: '规则不存在' }
  purchaseSettleRuleState.rules.splice(idx, 1)
  queueReschedule()
  return { ok: true, message: '规则已删除' }
}

export function setPurchaseSettleRuleEnabled(id, enabled) {
  const rule = getPurchaseSettleRuleById(id)
  if (!rule) return { ok: false, message: '规则不存在' }
  rule.enabled = !!enabled
  rule.updatedAt = dayjs().format('YYYY-MM-DD HH:mm:ss')
  refreshNextRun(rule)
  queueReschedule()
  return { ok: true, rule, message: enabled ? '规则已启用' : '规则已停用' }
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

function runInboundRule(rule, windowInfo) {
  const preview = previewSettlesByFixedWindow({
    periodStart: windowInfo.periodStart,
    periodEnd: windowInfo.periodEnd,
    periodKey: `${rule.id}:${windowInfo.periodKey}`,
    periodLabel: windowInfo.label,
    supplierIds: rule.supplierIds?.length ? rule.supplierIds : undefined,
    settlementCycles: rule.settlementCycles?.length ? rule.settlementCycles : undefined,
    allowAppend: false,
  })
  if (!preview.ok) {
    return { ok: false, message: preview.message, settles: [], skipped: [] }
  }
  const selectable = (preview.groups || []).filter((g) => g.selectable)
  if (!selectable.length) {
    const skipped = (preview.groups || [])
      .filter((g) => g.exists || !g.lineCount)
      .map((g) =>
        g.exists ? `${g.supplier} 已有结算「${g.existingSettleNo}」` : `${g.supplier} 无可结算明细`,
      )
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
    allowAppend: false,
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
    skipped: createdRes.skipped || [],
  }
}

function runPurchaseOrderRule(rule, windowInfo) {
  const created = []
  const skipped = []
  const supplierIdSet = rule.supplierIds?.length ? new Set(rule.supplierIds) : null
  const cycleSet = rule.settlementCycles?.length ? new Set(rule.settlementCycles) : null

  const candidates = purchaseOrderState.orders.filter((po) => {
    if (po.status !== '已完成') return false
    const completed = getPoCompletedAt(po)
    if (!completed) return false
    if (completed < windowInfo.periodStart || completed > windowInfo.periodEnd) return false
    if (supplierIdSet) {
      const supplier = getSupplierByName(po.supplier)
      if (!supplier || !supplierIdSet.has(supplier.id)) return false
    }
    if (cycleSet) {
      const cycle = getSupplierByName(po.supplier)?.settlementCycle || po.settlementCycle
      if (!cycleSet.has(cycle)) return false
    }
    return true
  })

  if (!candidates.length) {
    return { ok: true, message: '扫描窗口内无已完成且可结算的采购单', settles: [], skipped: [] }
  }

  for (const po of candidates) {
    const periodKey = `${rule.id}:${windowInfo.periodKey}:po:${po.id}`
    const existsByKey = findSettleByPeriodKey(periodKey)
    if (existsByKey) {
      skipped.push(`${po.orderNo} 本窗已结算过`)
      continue
    }
    const lines = listSettleableInboundLines(po.id)
    if (!lines.length) {
      skipped.push(`${po.orderNo} 无可结算入库`)
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
  if (rule.settleTarget === SETTLE_RULE_TARGET.PURCHASE_ORDER) {
    result = runPurchaseOrderRule(rule, windowInfo)
  } else {
    result = runInboundRule(rule, windowInfo)
  }

  rule.lastRunAt = dayjs().format('YYYY-MM-DD HH:mm:ss')
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
