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

export function createPurchaseSettleRule(partial = {}) {
  const now = dayjs().format('YYYY-MM-DD HH:mm:ss')
  return {
    id: '',
    name: '',
    enabled: true,
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
    /** 空=全部可账期供应商；存供应商 id */
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
      name: '上月入库自动结算（演示）',
      enabled: true,
      settleTarget: SETTLE_RULE_TARGET.INBOUND,
      resultMode: SETTLE_RULE_RESULT.DRAFT,
      executeFreq: SETTLE_RULE_FREQ.MONTHLY,
      executeTime: '02:00',
      executeMonthDay: 1,
      scanWindowType: SCAN_WINDOW_TYPES.LAST_MONTH,
      remark: '演示：每月 1 日 02:00 扫描上月已入库可结算行并生成草稿',
    }),
    createPurchaseSettleRule({
      id: 'psr-demo-po',
      name: '已完成采购单结算（演示）',
      enabled: false,
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
