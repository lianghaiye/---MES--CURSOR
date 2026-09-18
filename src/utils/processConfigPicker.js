/** 工序配置下拉 / 搜索更多：仅「使用中」工序 */
export const PROCESS_CONFIG_DROPDOWN_QUICK_LIMIT = 8
export const PROCESS_CONFIG_DROPDOWN_SEARCH_LIMIT = 50
export const PROCESS_CONFIG_SELECT_PLACEHOLDER = '请搜索或选择工序'

export function listEnabledProcessConfigs(processes = []) {
  return (processes || []).filter((p) => p && p.status === '使用中')
}

export function getAllProcessConfigOptions(processes = []) {
  return listEnabledProcessConfigs(processes).map((p) => ({
    label: `${p.code || '—'} / ${p.name || '—'}`,
    value: p.id,
    process: p,
  }))
}

export function filterProcessConfigOptions(options, keyword) {
  const kw = (keyword || '').trim().toLowerCase()
  if (!kw) return options
  return options.filter((opt) => {
    const p = opt.process || {}
    return (
      String(opt.label || '')
        .toLowerCase()
        .includes(kw) ||
      String(p.name || '')
        .toLowerCase()
        .includes(kw) ||
      String(p.code || '')
        .toLowerCase()
        .includes(kw) ||
      String(p.category || '')
        .toLowerCase()
        .includes(kw)
    )
  })
}

export function buildProcessConfigDisplayOptions({
  options,
  keyword,
  selectedValue,
  quickLimit = PROCESS_CONFIG_DROPDOWN_QUICK_LIMIT,
}) {
  const filtered = filterProcessConfigOptions(options, keyword)
  const limit = String(keyword || '').trim() ? PROCESS_CONFIG_DROPDOWN_SEARCH_LIMIT : quickLimit
  const sliced = filtered.slice(0, limit)
  const display = sliced.map((opt) => ({
    label: opt.label,
    value: opt.value,
  }))
  if (selectedValue && !display.some((opt) => opt.value === selectedValue)) {
    const hit = options.find((opt) => opt.value === selectedValue)
    if (hit) {
      display.unshift({
        label: hit.label,
        value: hit.value,
      })
    }
  }
  return display
}
