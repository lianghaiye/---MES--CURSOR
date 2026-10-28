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

export function createPurchaseSettleRule(partial = {}) {
  const now = dayjs().format('YYYY-MM-DD HH:mm:ss')
  return {
    id: '',
    name: '',
    enabled: true,
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
    nextRunAt: '',
    creator: 'admin1',
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

export function seedPurchaseSettleRules() {
  return [
    createPurchaseSettleRule({
      id: 'psr-demo-inbound',
      name: '采购·工厂默认·上月入库（月结）',
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
      remark: '工厂兜底：每月 1 日扫上月入库；已被供应商规则覆盖的供应商不会进本规则',
    }),
    createPurchaseSettleRule({
      id: 'psr-demo-weekly-supplier',
      name: '采购·供应商覆盖·周结（演示）',
      enabled: false,
      bizScene: SETTLE_RULE_SCENE.PURCHASE,
      ruleScope: SETTLE_RULE_SCOPE.SUPPLIER,
      settleTarget: SETTLE_RULE_TARGET.INBOUND,
      resultMode: SETTLE_RULE_RESULT.DRAFT,
      executeFreq: SETTLE_RULE_FREQ.WEEKLY,
      executeTime: '02:00',
      executeWeekday: 1,
      scanWindowType: SCAN_WINDOW_TYPES.LAST_WEEK,
      settlementCycles: ['周结'],
      supplierIds: [],
      remark: '供应商覆盖示例：启用前请勾选具体周结供应商；覆盖后工厂月结规则不再扫这些供应商',
    }),
    createPurchaseSettleRule({
      id: 'psr-demo-outsourcing-factory',
      name: '外协·工厂默认·上月回货入库（月结）',
      enabled: false,
      bizScene: SETTLE_RULE_SCENE.OUTSOURCING,
      ruleScope: SETTLE_RULE_SCOPE.FACTORY,
      settleTarget: SETTLE_RULE_TARGET.INBOUND,
      resultMode: SETTLE_RULE_RESULT.DRAFT,
      executeFreq: SETTLE_RULE_FREQ.MONTHLY,
      executeTime: '02:30',
      executeMonthDay: 1,
      scanWindowType: SCAN_WINDOW_TYPES.LAST_MONTH,
      settlementCycles: ['月结'],
      remark: '外协场景工厂兜底（演示默认停用）',
    }),
    createPurchaseSettleRule({
      id: 'psr-demo-po',
      name: '采购·工厂默认·已完成采购单（演示）',
      enabled: false,
      bizScene: SETTLE_RULE_SCENE.PURCHASE,
      ruleScope: SETTLE_RULE_SCOPE.FACTORY,
      settleTarget: SETTLE_RULE_TARGET.PURCHASE_ORDER,
      resultMode: SETTLE_RULE_RESULT.DRAFT,
      executeFreq: SETTLE_RULE_FREQ.DAILY,
      executeTime: '03:00',
      scanWindowType: SCAN_WINDOW_TYPES.FIXED,
      scanStart: '2026-08-01',
      scanEnd: '2026-08-31',
      remark: '演示：按采购单完成日落在 2026-08 的单据结算（默认停用，可手动试跑）',
    }),
  ]
}
