import dayjs from 'dayjs'
import { SCAN_WINDOW_TYPES } from '@/utils/purchaseSettleRuleWindow'

export const SETTLE_RULE_TARGET = {
  INBOUND: 'inbound',
  PURCHASE_ORDER: 'purchase_order',
}

export const SETTLE_RULE_RESULT = {
  DRAFT: 'draft',
  AUTO_CONFIRM: 'auto_confirm',
}

export const SETTLE_RULE_FREQ = {
  DAILY: 'daily',
  WEEKLY: 'weekly',
  MONTHLY: 'monthly',
}

/** 业务场景：采购 / 外协 */
export const SETTLE_RULE_SCENE = {
  PURCHASE: 'purchase',
  OUTSOURCING: 'outsourcing',
}

/** 规则层级：工厂默认（兜底） / 供应商规则（覆盖） */
export const SETTLE_RULE_SCOPE = {
  FACTORY: 'factory',
  SUPPLIER: 'supplier',
}

export const SETTLE_RULE_SCENE_LABEL = {
  [SETTLE_RULE_SCENE.PURCHASE]: '采购',
  [SETTLE_RULE_SCENE.OUTSOURCING]: '外协',
}

export const SETTLE_RULE_SCOPE_LABEL = {
  [SETTLE_RULE_SCOPE.FACTORY]: '工厂默认',
  [SETTLE_RULE_SCOPE.SUPPLIER]: '供应商规则',
}

/** 系统内置工厂默认规则 id（不可删除） */
export const BUILTIN_SETTLE_RULE_IDS = [
  'psr-builtin-month-inbound',
  'psr-builtin-month-po',
  'psr-builtin-week-inbound',
  'psr-builtin-week-po',
]

export function isBuiltinSettleRule(ruleOrId) {
  const id = typeof ruleOrId === 'string' ? ruleOrId : ruleOrId?.id
  return BUILTIN_SETTLE_RULE_IDS.includes(id) || Boolean(ruleOrId?.builtin)
}

/** 生成规则编码，如 SR20261029001 */
export function generateSettleRuleCode(existing = []) {
  const prefix = `SR${dayjs().format('YYYYMMDD')}`
  let maxSeq = 0
  ;(existing || []).forEach((r) => {
    const code = String(r?.code || '')
    if (!code.startsWith(prefix)) return
    const n = Number(code.slice(prefix.length))
    if (Number.isFinite(n)) maxSeq = Math.max(maxSeq, n)
  })
  return `${prefix}${String(maxSeq + 1).padStart(3, '0')}`
}

export function createPurchaseSettleRule(partial = {}) {
  const now = dayjs().format('YYYY-MM-DD HH:mm:ss')
  return {
    id: '',
    code: '',
    name: '',
    enabled: true,
    /** 系统内置：不可删除，可禁用；锁定场景/层级/生成维度/结算周期 */
    builtin: false,
    /** purchase | outsourcing */
    bizScene: SETTLE_RULE_SCENE.PURCHASE,
    /** factory | supplier */
    ruleScope: SETTLE_RULE_SCOPE.FACTORY,
    /** inbound | purchase_order */
    settleTarget: SETTLE_RULE_TARGET.INBOUND,
    /** draft | auto_confirm */
    resultMode: SETTLE_RULE_RESULT.DRAFT,
    /** daily | weekly | monthly */
    executeFreq: SETTLE_RULE_FREQ.DAILY,
    executeTime: '02:00',
    /** 1-7 ISO weekday，weekly 用 */
    executeWeekday: 1,
    /** 1-28，monthly 用 */
    executeMonthDay: 1,
    scanWindowType: SCAN_WINDOW_TYPES.LAST_MONTH,
    scanLastNDays: 7,
    scanStart: '',
    scanEnd: '',
    /**
     * 供应商范围：
     * - 工厂默认：应为空（兜底全部未覆盖供应商）
     * - 供应商规则：必填，覆盖这些供应商
     */
    supplierIds: [],
    /** 空=不限；如 ['月结'] */
    settlementCycles: [],
    remark: '',
    lastRunAt: '',
    /** 固定窗口：调度成功后写入，用于「自动只跑一次」 */
    lastScheduleRunAt: '',
    nextRunAt: '',
    creator: 'admin1',
    updater: 'admin1',
    createdAt: now,
    updatedAt: now,
    ...partial,
  }
}

export function createSettleRuleLog(partial = {}) {
  return {
    id: `srl-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    ruleId: '',
    ruleName: '',
    trigger: 'manual', // manual | schedule
    status: 'success', // success | partial | failed | skipped
    message: '',
    periodStart: '',
    periodEnd: '',
    periodKey: '',
    settleNos: [],
    skipped: [],
    createdAt: dayjs().format('YYYY-MM-DD HH:mm:ss'),
    ...partial,
  }
}

/**
 * 工厂内置默认规则（4 条）：
 * 月结按入库 / 月结按采购 / 周结按入库 / 周结按采购
 * 执行时跳过已有供应商自定义规则覆盖的供应商
 */
export function getBuiltinSettleRuleDefs() {
  return [
    createPurchaseSettleRule({
      id: 'psr-builtin-month-inbound',
      code: 'SR-BUILTIN-MI',
      name: '月结·按入库（工厂默认）',
      builtin: true,
      creator: '',
      updater: '',
      createdAt: '',
      updatedAt: '',
      enabled: true,
      bizScene: SETTLE_RULE_SCENE.PURCHASE,
      ruleScope: SETTLE_RULE_SCOPE.FACTORY,
      settleTarget: SETTLE_RULE_TARGET.INBOUND,
      resultMode: SETTLE_RULE_RESULT.DRAFT,
      executeFreq: SETTLE_RULE_FREQ.MONTHLY,
      executeTime: '02:00',
      executeMonthDay: 1,
      scanWindowType: SCAN_WINDOW_TYPES.LAST_MONTH,
      settlementCycles: ['月结'],
      remark: '内置：每月 1 日扫上月入库；与「按采购单」互斥；已配置供应商规则的供应商自动跳过',
    }),
    createPurchaseSettleRule({
      id: 'psr-builtin-month-po',
      code: 'SR-BUILTIN-MP',
      name: '月结·按采购单（工厂默认）',
      builtin: true,
      creator: '',
      updater: '',
      createdAt: '',
      updatedAt: '',
      // 与「月结·按入库」互斥：默认停用，按需启用（启用时自动停入库）
      enabled: false,
      bizScene: SETTLE_RULE_SCENE.PURCHASE,
      ruleScope: SETTLE_RULE_SCOPE.FACTORY,
      settleTarget: SETTLE_RULE_TARGET.PURCHASE_ORDER,
      resultMode: SETTLE_RULE_RESULT.DRAFT,
      executeFreq: SETTLE_RULE_FREQ.MONTHLY,
      executeTime: '02:30',
      executeMonthDay: 1,
      scanWindowType: SCAN_WINDOW_TYPES.LAST_MONTH,
      settlementCycles: ['月结'],
      remark: '内置：每月 1 日扫上月完成的采购单；与「按入库」互斥，不可同时启用',
    }),
    createPurchaseSettleRule({
      id: 'psr-builtin-week-inbound',
      code: 'SR-BUILTIN-WI',
      name: '周结·按入库（工厂默认）',
      builtin: true,
      creator: '',
      updater: '',
      createdAt: '',
      updatedAt: '',
      enabled: true,
      bizScene: SETTLE_RULE_SCENE.PURCHASE,
      ruleScope: SETTLE_RULE_SCOPE.FACTORY,
      settleTarget: SETTLE_RULE_TARGET.INBOUND,
      resultMode: SETTLE_RULE_RESULT.DRAFT,
      executeFreq: SETTLE_RULE_FREQ.WEEKLY,
      executeTime: '02:00',
      executeWeekday: 1,
      scanWindowType: SCAN_WINDOW_TYPES.LAST_WEEK,
      settlementCycles: ['周结'],
      remark: '内置：每周一扫上周入库；与「按采购单」互斥；已配置供应商规则的供应商自动跳过',
    }),
    createPurchaseSettleRule({
      id: 'psr-builtin-week-po',
      code: 'SR-BUILTIN-WP',
      name: '周结·按采购单（工厂默认）',
      builtin: true,
      creator: '',
      updater: '',
      createdAt: '',
      updatedAt: '',
      // 与「周结·按入库」互斥：默认停用
      enabled: false,
      bizScene: SETTLE_RULE_SCENE.PURCHASE,
      ruleScope: SETTLE_RULE_SCOPE.FACTORY,
      settleTarget: SETTLE_RULE_TARGET.PURCHASE_ORDER,
      resultMode: SETTLE_RULE_RESULT.DRAFT,
      executeFreq: SETTLE_RULE_FREQ.WEEKLY,
      executeTime: '02:30',
      executeWeekday: 1,
      scanWindowType: SCAN_WINDOW_TYPES.LAST_WEEK,
      settlementCycles: ['周结'],
      remark: '内置：每周一扫上周完成的采购单；与「按入库」互斥，不可同时启用',
    }),
  ]
}

/** 演示用供应商自定义规则（含重叠供应商，便于验证冲突弹窗） */
export function getDemoSupplierSettleRules() {
  return [
    createPurchaseSettleRule({
      id: 'psr-demo-supplier-a',
      code: 'SR-DEMO-A',
      name: '演示·供应商覆盖A（多功能02+采购B）',
      enabled: true,
      builtin: false,
      bizScene: SETTLE_RULE_SCENE.PURCHASE,
      ruleScope: SETTLE_RULE_SCOPE.SUPPLIER,
      settleTarget: SETTLE_RULE_TARGET.INBOUND,
      resultMode: SETTLE_RULE_RESULT.DRAFT,
      executeFreq: SETTLE_RULE_FREQ.WEEKLY,
      executeTime: '03:00',
      executeWeekday: 1,
      scanWindowType: SCAN_WINDOW_TYPES.LAST_WEEK,
      supplierIds: ['sup-2', 'sup-4'],
      settlementCycles: [],
      remark: '演示冲突：与规则B共用「多功能供应商02」；保存/启用时会提示',
      creator: '张三',
      updater: '张三',
      createdAt: '2026-10-20 10:00:00',
      updatedAt: '2026-10-28 15:20:00',
    }),
    createPurchaseSettleRule({
      id: 'psr-demo-supplier-b',
      code: 'SR-DEMO-B',
      name: '演示·供应商覆盖B（多功能02+SKF）',
      enabled: true,
      builtin: false,
      bizScene: SETTLE_RULE_SCENE.PURCHASE,
      ruleScope: SETTLE_RULE_SCOPE.SUPPLIER,
      settleTarget: SETTLE_RULE_TARGET.INBOUND,
      resultMode: SETTLE_RULE_RESULT.DRAFT,
      executeFreq: SETTLE_RULE_FREQ.WEEKLY,
      executeTime: '03:30',
      executeWeekday: 1,
      scanWindowType: SCAN_WINDOW_TYPES.LAST_WEEK,
      supplierIds: ['sup-2', 'sup-5'],
      settlementCycles: [],
      remark: '演示冲突：与规则A共用「多功能供应商02」',
      creator: '李四',
      updater: '李四',
      createdAt: '2026-10-21 11:00:00',
      updatedAt: '2026-10-28 16:10:00',
    }),
    createPurchaseSettleRule({
      id: 'psr-demo-supplier-c',
      code: 'SR-DEMO-C',
      name: '演示·供应商覆盖C（采购B，停用）',
      enabled: false,
      builtin: false,
      bizScene: SETTLE_RULE_SCENE.PURCHASE,
      ruleScope: SETTLE_RULE_SCOPE.SUPPLIER,
      settleTarget: SETTLE_RULE_TARGET.INBOUND,
      resultMode: SETTLE_RULE_RESULT.DRAFT,
      executeFreq: SETTLE_RULE_FREQ.WEEKLY,
      executeTime: '04:00',
      executeWeekday: 2,
      scanWindowType: SCAN_WINDOW_TYPES.LAST_WEEK,
      supplierIds: ['sup-4'],
      settlementCycles: [],
      remark: '停用态；启用时会与规则A在「采购供应商B」上冲突，可验证冲突弹窗',
      creator: '王五',
      updater: '王五',
      createdAt: '2026-10-22 09:30:00',
      updatedAt: '2026-10-27 09:30:00',
    }),
  ]
}

export function seedPurchaseSettleRules() {
  return [...getBuiltinSettleRuleDefs(), ...getDemoSupplierSettleRules()]
}

/**
 * 合并/补齐内置规则：保留用户对调度、结果、备注的修改；锁定身份字段
 */
export function mergeBuiltinSettleRules(existing = []) {
  const list = Array.isArray(existing) ? [...existing] : []
  const byId = new Map(list.map((r) => [r.id, r]))
  getBuiltinSettleRuleDefs().forEach((def) => {
    const cur = byId.get(def.id)
    if (!cur) {
      list.unshift(def)
      byId.set(def.id, def)
      return
    }
    Object.assign(cur, {
      builtin: true,
      code: def.code || cur.code,
      name: def.name,
      bizScene: def.bizScene,
      ruleScope: SETTLE_RULE_SCOPE.FACTORY,
      settleTarget: def.settleTarget,
      settlementCycles: [...(def.settlementCycles || [])],
      supplierIds: [],
      creator: '',
      createdAt: '',
    })
  })
  // 补齐演示供应商规则（仅当本地还没有时插入，不覆盖用户已改内容）
  getDemoSupplierSettleRules().forEach((def) => {
    if (byId.has(def.id)) return
    list.push(def)
    byId.set(def.id, def)
  })
  return list
}
