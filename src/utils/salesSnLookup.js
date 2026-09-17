import { industrialLabelState, LABEL_STATUS } from '@/store/industrialLabelStore'

export function normalizeSnCode(input) {
  return String(input || '').trim()
}

export function isLabelQueryable(label) {
  if (!label) return false
  if (label.status === LABEL_STATUS.VOID) return false
  return Boolean(String(label.salesLineId || '').trim())
}

export function formatSnSummaryText({ total = 0, mounted = 0 } = {}) {
  const n = Number(total) || 0
  if (n <= 0) return '—'
  const a = Number(mounted) || 0
  if (a > 0) return `已刻录 ${a}/${n}`
  return `已申请 ${n}`
}

export function matchLabelsBySn(code, { fuzzy = false } = {}) {
  const raw = normalizeSnCode(code)
  if (!raw) return []
  const needle = raw.toLowerCase()
  return (industrialLabelState.labels || []).filter((l) => {
    if (!isLabelQueryable(l)) return false
    const hay = String(l.labelCode || '').toLowerCase()
    return fuzzy ? hay.includes(needle) : hay === needle
  })
}

export function summarizeLineLabels(salesLineId, labels) {
  const list = (labels || industrialLabelState.labels || []).filter(
    (l) => isLabelQueryable(l) && l.salesLineId === salesLineId,
  )
  const mounted = list.filter((l) => l.nameplateMountedAt || l.engraveStatus === '已刻录').length
  const total = list.length
  return { total, mounted, summaryText: formatSnSummaryText({ total, mounted }) }
}

export function lookupSalesBySn(code, { fuzzy = false } = {}) {
  const raw = normalizeSnCode(code)
  if (!raw) return { ok: false, message: '请输入 SN 码', matchedLabels: [], salesLineIds: [] }
  if (fuzzy && raw.replace(/\s/g, '').length < 4) {
    return { ok: false, message: '至少输入 4 位', matchedLabels: [], salesLineIds: [] }
  }
  const matchedLabels = matchLabelsBySn(raw, { fuzzy })
  if (!matchedLabels.length) {
    // 精确时区分作废
    if (!fuzzy) {
      const any = (industrialLabelState.labels || []).find(
        (l) => String(l.labelCode || '').toLowerCase() === raw.toLowerCase(),
      )
      if (any?.status === LABEL_STATUS.VOID) {
        return { ok: false, message: '标识已作废', matchedLabels: [], salesLineIds: [] }
      }
    }
    return { ok: false, message: '未找到匹配 SN', matchedLabels: [], salesLineIds: [] }
  }
  const salesLineIds = [...new Set(matchedLabels.map((l) => l.salesLineId).filter(Boolean))]
  return { ok: true, message: '', matchedLabels, salesLineIds }
}
