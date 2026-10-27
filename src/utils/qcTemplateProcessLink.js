/** 过程检模板「关联工序」：有关联则只命中这些工序，无关联则所有过程检工序可按产品范围匹配 */

export const QC_PROCESS_INSPECT_BIZ_SCOPE = '生产过程检'

export function isProcessInspectBizScope(bizScope) {
  return String(bizScope || '').trim() === QC_PROCESS_INSPECT_BIZ_SCOPE
}

export function normalizeTemplateProcessLinks(source = {}) {
  const fromLinks = Array.isArray(source.processLinks) ? source.processLinks : null
  if (fromLinks && fromLinks.length) {
    return dedupeLinks(
      fromLinks.map((row) => ({
        code: String(row?.code || '').trim(),
        name: String(row?.name || '').trim(),
      })),
    )
  }
  const codes = Array.isArray(source.processCodes) ? source.processCodes : []
  const names = Array.isArray(source.processNames) ? source.processNames : []
  const max = Math.max(codes.length, names.length)
  const list = []
  for (let i = 0; i < max; i += 1) {
    list.push({
      code: String(codes[i] || '').trim(),
      name: String(names[i] || '').trim(),
    })
  }
  return dedupeLinks(list)
}

function dedupeLinks(list) {
  const seen = new Set()
  const result = []
  list.forEach((row) => {
    if (!row.code && !row.name) return
    const key = `${row.code}::${row.name}`
    if (seen.has(key)) return
    seen.add(key)
    result.push(row)
  })
  return result
}

export function isProcessLinkedTemplate(template) {
  return normalizeTemplateProcessLinks(template).length > 0
}

export function templateAppliesToProcess(template, process = {}) {
  const links = normalizeTemplateProcessLinks(template)
  if (!links.length) return true
  const code = String(process.processCode || process.code || '').trim()
  const name = String(process.processName || process.name || '').trim()
  if (!code && !name) return false
  return links.some(
    (row) => (row.code && code && row.code === code) || (row.name && name && row.name === name),
  )
}

function linksMatch(a, b) {
  return Boolean((a.code && b.code && a.code === b.code) || (a.name && b.name && a.name === b.name))
}

/** 未关联视为覆盖全部工序，与「关联某工序」在冲突检测上相交 */
export function processLinksOverlap(a = {}, b = {}) {
  return resolveProcessLinkOverlap(a, b).overlap
}

/** 两份模板在工序上的交集；任一方未关联则视为覆盖对方已关联工序（或全部） */
export function resolveProcessLinkOverlap(a = {}, b = {}) {
  const left = normalizeTemplateProcessLinks(a)
  const right = normalizeTemplateProcessLinks(b)
  if (!left.length && !right.length) {
    return { overlap: true, unrestricted: true, links: [] }
  }
  if (!left.length) {
    return { overlap: true, unrestricted: true, links: right }
  }
  if (!right.length) {
    return { overlap: true, unrestricted: true, links: left }
  }
  const links = left.filter((x) => right.some((y) => linksMatch(x, y)))
  return { overlap: links.length > 0, unrestricted: false, links }
}

export function formatProcessOverlapLabel(overlap = {}) {
  if (!overlap?.overlap) return ''
  if (overlap.unrestricted && !(overlap.links || []).length) return '全部工序'
  if (overlap.unrestricted) {
    const named = formatProcessLinkNames(overlap.links)
    return named ? `全部工序（含 ${named}）` : '全部工序'
  }
  return formatProcessLinkNames(overlap.links) || '部分工序'
}

export function formatProcessLinkNames(links = []) {
  const labels = (links || []).map((row) => row.name || row.code).filter(Boolean)
  return labels.join('、')
}

export function stripOverlappingProcessLinks(row, overlapLinks = []) {
  const current = normalizeTemplateProcessLinks(row)
  if (!current.length) return { stripped: false, emptied: false }
  const next = current.filter((x) => !(overlapLinks || []).some((y) => linksMatch(x, y)))
  row.processLinks = next
  return { stripped: true, emptied: next.length === 0 }
}

export function formatQcTemplateProcessLinks(template = {}) {
  if (!isProcessInspectBizScope(template.bizScope)) return '—'
  const links = normalizeTemplateProcessLinks(template)
  if (!links.length) return '全部工序'
  const labels = links.map((row) => row.name || row.code).filter(Boolean)
  if (!labels.length) return '全部工序'
  if (labels.length <= 2) return labels.join('、')
  return `${labels.slice(0, 2).join('、')} 等${labels.length}道`
}
