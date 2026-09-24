/**
 * 来料 / 外协回货检：处理方案与数量处置
 *
 * 两者均以「多数量桶」为主：合格/让步 + 次要/再次要处置；
 * treatmentPlan 由数量自动汇总，无需手选单一方案。
 */

export const QC_BIZ_INCOMING = '来料质检'
export const QC_BIZ_OUTSOURCING = '外协回货检'

export const TREATMENT_REWORK = '返工'
export const TREATMENT_SCRAP = '报废'
export const TREATMENT_REMAKE = '换料重做'
export const TREATMENT_SCRAP_CLAIM = '料废索赔'
export const TREATMENT_CONCESSION = '让步接收'
export const TREATMENT_RETURN = '退货'
export const TREATMENT_EXCHANGE = '换货'

export function isOutsourcingQcScope(bizScope) {
  return bizScope === QC_BIZ_OUTSOURCING
}

export function isIncomingQcScope(bizScope) {
  return bizScope === QC_BIZ_INCOMING
}

/** 来料 / 外协：数量拆分处置（无单选方案） */
export function isMultiBucketDisposition(bizScope) {
  return isIncomingQcScope(bizScope) || isOutsourcingQcScope(bizScope)
}

/** @deprecated 选项仅作兼容；多桶模式下录入不再展示 */
export function getQcTreatmentPlanOptions(bizScope) {
  if (isOutsourcingQcScope(bizScope)) {
    return [
      { label: TREATMENT_REWORK, value: TREATMENT_REWORK },
      { label: TREATMENT_SCRAP, value: TREATMENT_SCRAP },
      { label: TREATMENT_REMAKE, value: TREATMENT_REMAKE },
      { label: TREATMENT_SCRAP_CLAIM, value: TREATMENT_SCRAP_CLAIM },
      { label: TREATMENT_CONCESSION, value: TREATMENT_CONCESSION },
    ]
  }
  return [
    { label: TREATMENT_RETURN, value: TREATMENT_RETURN },
    { label: TREATMENT_EXCHANGE, value: TREATMENT_EXCHANGE },
    { label: TREATMENT_CONCESSION, value: TREATMENT_CONCESSION },
  ]
}

/** 不合格时数量默认落入次要桶（来料退货 / 外协返工） */
export function getDefaultFailTreatmentPlan(bizScope) {
  return isOutsourcingQcScope(bizScope) ? TREATMENT_REWORK : TREATMENT_RETURN
}

export function isConcessionTreatmentPlan(plan) {
  const p = String(plan || '').trim()
  return p === TREATMENT_CONCESSION || p.includes('让步')
}

/**
 * @deprecated 多桶模式下剩余数量不再按方案联动；保留供旧逻辑/测试
 */
export function remainGoesToScrapField(bizScope, plan) {
  const p = String(plan || '').trim()
  if (isOutsourcingQcScope(bizScope)) {
    return p === TREATMENT_SCRAP || p === TREATMENT_SCRAP_CLAIM
  }
  return p === TREATMENT_EXCHANGE
}

export function getDispositionFieldLabels(bizScope) {
  if (isOutsourcingQcScope(bizScope)) {
    return {
      accept: '合格入库',
      concession: '让步入库',
      secondary: '返工',
      tertiary: '报废',
      tip: '合格入库 + 让步入库 + 返工 + 报废 ≤ 收货数量（抽检时按整批收货拆分，非质检数量；料废计入报废）',
      columnReturnExchange: '返工/报废',
      treatmentTip: '按数量拆分处置；上限为收货数量；处理方案由数量自动汇总，无需单选',
      passOptionalTip: '合格可不填，默认全量合格入库；也可按需拆分',
      mode: 'multi_bucket',
    }
  }
  return {
    accept: '合格入库',
    concession: '让步入库',
    secondary: '退货',
    tertiary: '换货',
    tip: '合格入库 + 让步入库 + 退货 + 换货 ≤ 收货数量（抽检时按整批收货拆分，非质检数量）',
    columnReturnExchange: '退/换货',
    treatmentTip: '按数量拆分处置；上限为收货数量；处理方案由数量自动汇总，无需单选',
    passOptionalTip: '合格可不填，默认全量合格入库；也可按需拆分',
    mode: 'multi_bucket',
  }
}

function fmtQty(n, formatNumber) {
  if (typeof formatNumber === 'function') return formatNumber(n)
  const t = Math.round(n * 1e4) / 1e4
  return String(t)
}

/**
 * 由数量桶汇总处理方案文案（存 treatmentPlan）
 * 外协例：合格2/让步2/返工2/报废4
 * 来料例：合格2/让步2/退货2/换货2
 */
export function buildTreatmentPlanSummary(bizScope, line = {}, formatNumber) {
  const labels = getDispositionFieldLabels(bizScope)
  const parts = []
  const a = Number(line.acceptInboundQty) || 0
  const c = Number(line.concessionQty) || 0
  const r = Number(line.returnQty) || 0
  const s = Number(line.exchangeQty) || 0
  if (a > 0) parts.push(`合格${fmtQty(a, formatNumber)}`)
  if (c > 0) parts.push(`让步${fmtQty(c, formatNumber)}`)
  if (r > 0) parts.push(`${labels.secondary}${fmtQty(r, formatNumber)}`)
  if (s > 0) parts.push(`${labels.tertiary}${fmtQty(s, formatNumber)}`)
  return parts.length ? parts.join('/') : ''
}

/**
 * 详情/列表展示用处理方案（完整标签；有数量桶则优先重算，否则回退已存文案）
 * 来料：合格入库：n/让步接收：n/退货：n/换货：n
 * 外协：合格入库：n/让步接收：n/返工：n/报废：n
 */
export function formatTreatmentPlanDisplay(bizScope, line = {}, formatNumber) {
  const a = Number(line.acceptInboundQty) || 0
  const c = Number(line.concessionQty) || 0
  const r = Number(line.returnQty) || 0
  const s = Number(line.exchangeQty) || 0
  const hasQty = a > 1e-9 || c > 1e-9 || r > 1e-9 || s > 1e-9
  if (hasQty && (isIncomingQcScope(bizScope) || isOutsourcingQcScope(bizScope))) {
    const fmt = (n) => fmtQty(n, formatNumber)
    const secondary = isOutsourcingQcScope(bizScope) ? '返工' : '退货'
    const tertiary = isOutsourcingQcScope(bizScope) ? '报废' : '换货'
    return [
      `合格入库：${fmt(a)}`,
      `让步接收：${fmt(c)}`,
      `${secondary}：${fmt(r)}`,
      `${tertiary}：${fmt(s)}`,
    ].join('/')
  }
  const stored = String(line.treatmentPlan || '').trim()
  if (stored) return stored
  return buildTreatmentPlanSummary(bizScope, line, formatNumber)
}

/** @deprecated 使用 buildTreatmentPlanSummary(bizScope, line) */
export function buildOutsourcingTreatmentPlanSummary(line = {}, formatNumber) {
  return buildTreatmentPlanSummary(QC_BIZ_OUTSOURCING, line, formatNumber)
}

/** 可入库数量（合格 + 让步） */
export function resolveInboundableQty(line = {}) {
  const a = Number(line.acceptInboundQty)
  const c = Number(line.concessionQty)
  let sum = 0
  if (Number.isFinite(a) && a > 0) sum += a
  if (Number.isFinite(c) && c > 0) sum += c
  return sum
}

/** 详情/列表：退货换货或返工报废数量展示 */
export function formatDispositionSecondaryQty(bizScope, record = {}, formatNumber) {
  const labels = getDispositionFieldLabels(bizScope)
  const parts = []
  const r = Number(record.returnQty)
  const e = Number(record.exchangeQty)
  if (Number.isFinite(r) && r > 0) parts.push(`${labels.secondary} ${fmtQty(r, formatNumber)}`)
  if (Number.isFinite(e) && e > 0) parts.push(`${labels.tertiary} ${fmtQty(e, formatNumber)}`)
  return parts.length ? parts.join(' / ') : '—'
}
