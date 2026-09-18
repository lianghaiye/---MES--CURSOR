/**
 * 采购结算规则前端模拟调度
 * 按 nextRunAt 设 setTimeout，到点调用 executePurchaseSettleRule
 */
import dayjs from 'dayjs'
import {
  listPurchaseSettleRules,
  executePurchaseSettleRule,
  getPurchaseSettleRuleById,
} from '@/store/purchaseSettleRuleStore'
import { calcNextRunAt } from '@/utils/purchaseSettleRuleWindow'

/** @type {Map<string, ReturnType<typeof setTimeout>>} */
const timers = new Map()

let started = false

function clearAll() {
  timers.forEach((t) => clearTimeout(t))
  timers.clear()
}

export function stopPurchaseSettleRuleScheduler() {
  clearAll()
  started = false
}

export function reschedulePurchaseSettleRules() {
  clearAll()

  listPurchaseSettleRules().forEach((rule) => {
    if (!rule.enabled) return
    const next = calcNextRunAt(rule)
    if (!next) return
    rule.nextRunAt = next.format('YYYY-MM-DD HH:mm:ss')
    const delay = next.valueOf() - Date.now()
    // 超过 24h 的等到小时级重算
    if (delay > 24 * 60 * 60 * 1000 || delay <= 0) return

    const timer = setTimeout(() => {
      executePurchaseSettleRule(rule.id, { trigger: 'schedule' })
      const latest = getPurchaseSettleRuleById(rule.id)
      if (latest) {
        const n2 = calcNextRunAt(latest)
        latest.nextRunAt = n2 ? n2.format('YYYY-MM-DD HH:mm:ss') : ''
      }
      reschedulePurchaseSettleRules()
    }, delay)
    timers.set(rule.id, timer)
  })
}

/** 应用启动时调用；每小时重算一次长周期任务 */
export function startPurchaseSettleRuleScheduler() {
  if (started) return
  started = true
  reschedulePurchaseSettleRules()
  setInterval(
    () => {
      reschedulePurchaseSettleRules()
    },
    60 * 60 * 1000,
  )
}

export function getSchedulerDebugInfo() {
  return {
    started,
    timerCount: timers.size,
    ruleIds: [...timers.keys()],
    now: dayjs().format('YYYY-MM-DD HH:mm:ss'),
  }
}
