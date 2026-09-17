import dayjs from 'dayjs'
import isoWeek from 'dayjs/plugin/isoWeek'

dayjs.extend(isoWeek)

export const SCAN_WINDOW_TYPES = {
  LAST_MONTH: 'last_month',
  LAST_WEEK: 'last_week',
  LAST_N_DAYS: 'last_n_days',
  FIXED: 'fixed',
}

/**
 * @param {object} rule
 * @param {import('dayjs').Dayjs|string|Date} [now]
 * @returns {{ ok: boolean, message?: string, periodStart?: string, periodEnd?: string, periodKey?: string, label?: string }}
 */
export function resolveScanWindow(rule, now = dayjs()) {
  const base = dayjs(now)
  if (!base.isValid()) return { ok: false, message: '当前时间无效' }

  const type = rule.scanWindowType || SCAN_WINDOW_TYPES.LAST_MONTH

  if (type === SCAN_WINDOW_TYPES.LAST_MONTH) {
    const start = base.subtract(1, 'month').startOf('month')
    const end = base.subtract(1, 'month').endOf('month')
    const periodKey = start.format('YYYY-MM')
    return {
      ok: true,
      periodStart: start.format('YYYY-MM-DD'),
      periodEnd: end.format('YYYY-MM-DD'),
      periodKey: `rule-${periodKey}`,
      label: `上月 ${periodKey}`,
    }
  }

  if (type === SCAN_WINDOW_TYPES.LAST_WEEK) {
    const end = base.subtract(1, 'week').endOf('isoWeek')
    const start = end.startOf('isoWeek')
    const periodKey = `${start.isoWeekYear()}-W${String(start.isoWeek()).padStart(2, '0')}`
    return {
      ok: true,
      periodStart: start.format('YYYY-MM-DD'),
      periodEnd: end.format('YYYY-MM-DD'),
      periodKey: `rule-${periodKey}`,
      label: `上周 ${periodKey}`,
    }
  }

  if (type === SCAN_WINDOW_TYPES.LAST_N_DAYS) {
    const n = Math.max(1, Number(rule.scanLastNDays) || 7)
    const end = base.startOf('day')
    const start = end.subtract(n - 1, 'day')
    const periodKey = `${start.format('YYYYMMDD')}-${end.format('YYYYMMDD')}`
    return {
      ok: true,
      periodStart: start.format('YYYY-MM-DD'),
      periodEnd: end.format('YYYY-MM-DD'),
      periodKey: `rule-${periodKey}`,
      label: `近 ${n} 天`,
    }
  }

  if (type === SCAN_WINDOW_TYPES.FIXED) {
    const periodStart = rule.scanStart
    const periodEnd = rule.scanEnd
    if (!periodStart || !periodEnd) {
      return { ok: false, message: '固定时间段须填写起止日期' }
    }
    if (periodStart > periodEnd) {
      return { ok: false, message: '开始日期不能晚于结束日期' }
    }
    return {
      ok: true,
      periodStart,
      periodEnd,
      periodKey: `rule-${periodStart}_${periodEnd}`,
      label: `${periodStart} ~ ${periodEnd}`,
    }
  }

  return { ok: false, message: `未知扫描窗口类型：${type}` }
}

/**
 * 计算规则下次执行时刻（前端模拟用）
 * @returns {dayjs.Dayjs|null}
 */
export function calcNextRunAt(rule, now = dayjs()) {
  if (!rule?.enabled) return null
  const base = dayjs(now)
  const [hh, mm] = String(rule.executeTime || '02:00')
    .split(':')
    .map((x) => Number(x))
  const hour = Number.isFinite(hh) ? hh : 2
  const minute = Number.isFinite(mm) ? mm : 0

  const freq = rule.executeFreq || 'daily'

  if (freq === 'daily') {
    let next = base.hour(hour).minute(minute).second(0).millisecond(0)
    if (!next.isAfter(base)) next = next.add(1, 'day')
    return next
  }

  if (freq === 'weekly') {
    const weekday = Number(rule.executeWeekday)
    const target = Number.isFinite(weekday) && weekday >= 1 && weekday <= 7 ? weekday : 1 // 1=周一
    let next = base.hour(hour).minute(minute).second(0).millisecond(0)
    const currentIso = next.isoWeekday()
    let add = target - currentIso
    if (add < 0 || (add === 0 && !next.isAfter(base))) add += 7
    return next.add(add, 'day')
  }

  if (freq === 'monthly') {
    const day = Math.min(28, Math.max(1, Number(rule.executeMonthDay) || 1))
    let next = base.date(day).hour(hour).minute(minute).second(0).millisecond(0)
    if (!next.isAfter(base)) next = next.add(1, 'month').date(day)
    return next
  }

  return null
}
