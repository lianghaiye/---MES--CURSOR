import { bomSubItemFilterFields } from '@/mock/bomSubItemFilterFields'

function getFieldMeta(fieldKey) {
  return bomSubItemFilterFields.find((f) => f.key === fieldKey)
}

function normalizeValue(value) {
  if (value === undefined || value === null) return ''
  return String(value).trim()
}

function compareText(raw, operator, expected) {
  const val = normalizeValue(raw)
  const exp = normalizeValue(expected)
  switch (operator) {
    case 'contains':
      return val.toLowerCase().includes(exp.toLowerCase())
    case 'eq':
      return val === exp
    case 'ne':
      return val !== exp
    case 'empty':
      return val === ''
    case 'notEmpty':
      return val !== ''
    default:
      return true
  }
}

function compareNumber(raw, operator, expected) {
  const val = normalizeValue(raw)
  if (operator === 'empty') return val === ''
  if (operator === 'notEmpty') return val !== ''
  const num = Number(val)
  const exp = Number(expected)
  if (Number.isNaN(num) || Number.isNaN(exp)) return false
  switch (operator) {
    case 'eq':
      return num === exp
    case 'ne':
      return num !== exp
    case 'gt':
      return num > exp
    case 'lt':
      return num < exp
    default:
      return true
  }
}

function matchCondition(row, condition) {
  const { field, operator, value } = condition
  if (!field || !operator) return true
  const meta = getFieldMeta(field)
  const raw = row[field]
  if (!meta) return true
  if (meta.type === 'number') return compareNumber(raw, operator, value)
  return compareText(raw, operator, value)
}

/** 按动态筛选条件过滤行（支持且/或） */
export function applyBomSubItemFilterConditions(rows, conditions = []) {
  const active = (conditions || []).filter(
    (c) =>
      c.field &&
      c.operator &&
      (c.operator === 'empty' || c.operator === 'notEmpty' || normalizeValue(c.value) !== ''),
  )
  if (!active.length) return rows

  return rows.filter((row) => {
    let result = matchCondition(row, active[0])
    for (let i = 1; i < active.length; i += 1) {
      const cond = active[i]
      const hit = matchCondition(row, cond)
      result = cond.logic === 'or' ? result || hit : result && hit
    }
    return result
  })
}
