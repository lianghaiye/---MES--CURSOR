import { planSupplierOptions } from '@/utils/productionPlanMaterial'
import { mergeSupplierMasterOptions } from '@/mock/supplierMaster'

export const SUPPLIER_DROPDOWN_QUICK_LIMIT = 8
export const SUPPLIER_DROPDOWN_SEARCH_LIMIT = 50
export const SUPPLIER_SELECT_PLACEHOLDER = '请搜索或选择'

let cachedOptions = null

export function getAllSupplierOptions() {
  if (!cachedOptions) {
    cachedOptions = mergeSupplierMasterOptions(planSupplierOptions)
  }
  return cachedOptions
}

export function filterSupplierOptions(options, keyword) {
  const kw = (keyword || '').trim().toLowerCase()
  if (!kw) return options
  return options.filter((opt) => matchSupplierKeyword(opt, kw))
}

export function filterSupplierOptionsByFields(
  options,
  { code = '', name = '', type = '' } = {},
) {
  const codeKw = code.trim().toLowerCase()
  const nameKw = name.trim().toLowerCase()
  const typeKw = type.trim().toLowerCase()
  return options.filter((opt) => {
    if (codeKw && !String(opt.code || '').toLowerCase().includes(codeKw)) return false
    if (nameKw && !String(opt.label || opt.value || '').toLowerCase().includes(nameKw)) {
      return false
    }
    if (typeKw && !String(opt.type || '').toLowerCase().includes(typeKw)) return false
    return true
  })
}

function matchSupplierKeyword(opt, kw) {
  return (
    String(opt.label || '')
      .toLowerCase()
      .includes(kw) ||
    String(opt.value || '')
      .toLowerCase()
      .includes(kw) ||
    String(opt.code || '')
      .toLowerCase()
      .includes(kw) ||
    String(opt.type || '')
      .toLowerCase()
      .includes(kw)
  )
}

export function buildSupplierDisplayOptions({ options, keyword, selectedValue, quickLimit }) {
  const filtered = filterSupplierOptions(options, keyword)
  const limit = keyword.trim() ? SUPPLIER_DROPDOWN_SEARCH_LIMIT : quickLimit
  const sliced = filtered.slice(0, limit)
  const display = sliced.map((opt) => ({
    label: formatSupplierOptionLabel(opt),
    value: opt.value,
  }))
  if (selectedValue && !display.some((opt) => opt.value === selectedValue)) {
    const hit = options.find((opt) => opt.value === selectedValue)
    display.unshift({
      label: hit ? formatSupplierOptionLabel(hit) : selectedValue,
      value: selectedValue,
    })
  }
  return display
}

export function formatSupplierOptionLabel(opt) {
  if (!opt) return ''
  if (opt.code) return `[${opt.code}] ${opt.label || opt.value}`
  return opt.label || opt.value || ''
}

export function formatSupplierCellText(value) {
  if (!value) return SUPPLIER_SELECT_PLACEHOLDER
  const hit = getAllSupplierOptions().find((opt) => opt.value === value)
  return hit ? formatSupplierOptionLabel(hit) : value
}
