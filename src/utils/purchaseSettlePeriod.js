import dayjs from 'dayjs'
import isoWeek from 'dayjs/plugin/isoWeek'

dayjs.extend(isoWeek)

/** 参与账期批量生成的结算周期 */
export const PERIOD_SETTLE_CYCLES = ['月结', '半月结', '周结', '季结']

/** 不参与账期批量（仍可用按采购单生成） */
export const EXCLUDED_SETTLE_CYCLES = ['现结', '无']

export function isPeriodSettleCycle(cycle) {
  return PERIOD_SETTLE_CYCLES.includes(String(cycle || ''))
}

/**
 * @param {string} yearMonth YYYY-MM
 * @returns {{ ok: boolean, message?: string, year?: number, month?: number, monthStart?: string, monthEnd?: string }}
 */
export function parseYearMonth(yearMonth) {
  const m = String(yearMonth || '').match(/^(\d{4})-(\d{2})$/)
  if (!m) return { ok: false, message: '会计期间格式须为 YYYY-MM' }
  const year = Number(m[1])
  const month = Number(m[2])
  if (!(month >= 1 && month <= 12)) return { ok: false, message: '会计月份无效' }
  const start = dayjs(`${yearMonth}-01`)
  return {
    ok: true,
    year,
    month,
    monthStart: start.format('YYYY-MM-DD'),
    monthEnd: start.endOf('month').format('YYYY-MM-DD'),
  }
}

/**
 * 按结算周期，将所选会计月切分为子窗口。
 * @param {string} cycle 月结|半月结|周结|季结
 * @param {string} yearMonth YYYY-MM
 * @param {{ halfParts?: ('H1'|'H2')[] }} [options] 半月结可选上/下半月，默认全部
 * @returns {{ ok: boolean, message?: string, windows?: Array<{ periodKey: string, periodStart: string, periodEnd: string, label: string, settlementCycle: string }> }}
 */
export function resolvePeriodWindows(cycle, yearMonth, options = {}) {
  const parsed = parseYearMonth(yearMonth)
  if (!parsed.ok) return { ok: false, message: parsed.message }

  const c = String(cycle || '')
  if (!isPeriodSettleCycle(c)) {
    return { ok: false, message: `结算周期「${c || '空'}」不参与账期批量生成` }
  }

  const { year, month, monthStart, monthEnd } = parsed

  if (c === '月结') {
    return {
      ok: true,
      windows: [
        {
          periodKey: yearMonth,
          periodStart: monthStart,
          periodEnd: monthEnd,
          label: `${yearMonth}（月结）`,
          settlementCycle: c,
        },
      ],
    }
  }

  if (c === '半月结') {
    const parts = options.halfParts?.length ? options.halfParts : ['H1', 'H2']
    const windows = []
    if (parts.includes('H1')) {
      windows.push({
        periodKey: `${yearMonth}-H1`,
        periodStart: monthStart,
        periodEnd: dayjs(`${yearMonth}-15`).format('YYYY-MM-DD'),
        label: `${yearMonth} 上半月`,
        settlementCycle: c,
      })
    }
    if (parts.includes('H2')) {
      windows.push({
        periodKey: `${yearMonth}-H2`,
        periodStart: dayjs(`${yearMonth}-16`).format('YYYY-MM-DD'),
        periodEnd: monthEnd,
        label: `${yearMonth} 下半月`,
        settlementCycle: c,
      })
    }
    if (!windows.length) return { ok: false, message: '请至少选择一个半月窗口' }
    return { ok: true, windows }
  }

  if (c === '周结') {
    const windows = []
    let cursor = dayjs(monthStart).startOf('isoWeek')
    const monthEndD = dayjs(monthEnd)
    const seen = new Set()
    while (cursor.isBefore(monthEndD) || cursor.isSame(monthEndD, 'day')) {
      const weekStart = cursor.startOf('isoWeek')
      const weekEnd = cursor.endOf('isoWeek')
      const overlapStart = weekStart.isBefore(dayjs(monthStart)) ? dayjs(monthStart) : weekStart
      const overlapEnd = weekEnd.isAfter(monthEndD) ? monthEndD : weekEnd
      if (!overlapStart.isAfter(overlapEnd)) {
        const weekNum = weekStart.isoWeek()
        const weekYear = weekStart.isoWeekYear()
        const periodKey = `${weekYear}-W${String(weekNum).padStart(2, '0')}`
        if (!seen.has(periodKey)) {
          seen.add(periodKey)
          windows.push({
            periodKey,
            periodStart: overlapStart.format('YYYY-MM-DD'),
            periodEnd: overlapEnd.format('YYYY-MM-DD'),
            label: `${periodKey}（${overlapStart.format('MM-DD')}~${overlapEnd.format('MM-DD')}）`,
            settlementCycle: c,
          })
        }
      }
      cursor = cursor.add(1, 'week')
      if (windows.length > 8) break
    }
    return { ok: true, windows }
  }

  if (c === '季结') {
    if (![3, 6, 9, 12].includes(month)) {
      return { ok: false, message: '季结仅可在季末月（3/6/9/12）生成，请到季末月操作' }
    }
    const quarter = Math.ceil(month / 3)
    const qStartMonth = (quarter - 1) * 3 + 1
    const periodStart = dayjs(`${year}-${String(qStartMonth).padStart(2, '0')}-01`).format(
      'YYYY-MM-DD',
    )
    const periodEnd = dayjs(monthEnd).format('YYYY-MM-DD')
    const periodKey = `${year}-Q${quarter}`
    return {
      ok: true,
      windows: [
        {
          periodKey,
          periodStart,
          periodEnd,
          label: `${periodKey}（季结）`,
          settlementCycle: c,
        },
      ],
    }
  }

  return { ok: false, message: `未知结算周期：${c}` }
}

/**
 * 入库业务日：优先 inboundDate，其次完成/创建日。
 * @param {object} inbound
 * @returns {string} YYYY-MM-DD 或 ''
 */
export function getInboundBizDate(inbound) {
  if (!inbound) return ''
  const raw =
    inbound.inboundDate ||
    (inbound.completedAt && String(inbound.completedAt).slice(0, 10)) ||
    (inbound.createdAt && String(inbound.createdAt).slice(0, 10)) ||
    ''
  if (!raw) return ''
  const d = dayjs(raw)
  return d.isValid() ? d.format('YYYY-MM-DD') : ''
}

export function inboundDateInWindow(inbound, periodStart, periodEnd) {
  const d = getInboundBizDate(inbound)
  if (!d) return false
  return d >= periodStart && d <= periodEnd
}

export function buildPeriodKey(cycle, yearMonth, part) {
  if (cycle === '半月结' && part) return `${yearMonth}-${part}`
  if (cycle === '月结') return yearMonth
  return part || yearMonth
}
