import { QC_TEMPLATE_SCOPE_TYPE } from '@/mock/qcTemplates'

function isEnabledCustom(row) {
  return row && !row.isSystem && row.status === '启用'
}

function objectKey(obj = {}) {
  const type = String(obj.type || '').trim()
  const value = String(obj.value || obj.code || '').trim()
  return `${type}:${value}`
}

function sameObject(a, b) {
  if (!a || !b) return false
  const av = String(a.value || a.code || '').trim()
  const bv = String(b.value || b.code || '').trim()
  if (!av || !bv) return false
  if (av === bv) return true
  const ac = String(a.code || '').trim()
  const bc = String(b.code || '').trim()
  return Boolean(ac && bc && ac === bc)
}

function formatNow() {
  const d = new Date()
  const p = (n) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`
}

export function formatObjectLabel(obj = {}, scopeType) {
  if (scopeType === QC_TEMPLATE_SCOPE_TYPE.SINGLE) {
    const name = obj.label || obj.name || obj.value || ''
    const spec = obj.specModel ? ` ${obj.specModel}` : ''
    return `${name}${spec}`.trim() || String(obj.value || '—')
  }
  return obj.label || obj.title || obj.value || '—'
}

/** 纯函数：传入模板列表做冲突检测 */
export function findQcTemplateConflicts(
  templates = [],
  { id, bizScope, scopeType, objects = [] } = {},
) {
  const scope = String(bizScope || '').trim()
  if (!scope || !scopeType) return { hasConflict: false, conflicts: [], kind: scopeType }

  const others = (templates || []).filter(
    (t) => isEnabledCustom(t) && t.bizScope === scope && t.scopeType === scopeType && t.id !== id,
  )

  if (scopeType === QC_TEMPLATE_SCOPE_TYPE.GLOBAL) {
    const hit = others[0] || null
    if (!hit) return { hasConflict: false, conflicts: [], kind: 'global' }
    return {
      hasConflict: true,
      kind: 'global',
      conflicts: [
        {
          key: `global:${hit.id}`,
          currentTemplateId: hit.id,
          currentTemplateName: hit.name,
          currentTemplateCode: hit.code,
        },
      ],
    }
  }

  const objs = Array.isArray(objects) ? objects : []
  if (!objs.length) return { hasConflict: false, conflicts: [], kind: scopeType }

  const conflicts = []
  objs.forEach((obj, index) => {
    const hit = others.find((t) => (t.objects || []).some((o) => sameObject(o, obj)))
    if (!hit) return
    conflicts.push({
      key: objectKey(obj) || `row-${index}`,
      index: index + 1,
      object: { ...obj },
      objectLabel: formatObjectLabel(obj, scopeType),
      currentTemplateId: hit.id,
      currentTemplateName: hit.name,
      currentTemplateCode: hit.code,
    })
  })

  return {
    hasConflict: conflicts.length > 0,
    kind: scopeType,
    conflicts,
  }
}

export function applyQcTemplateConflictReplace(
  templates = [],
  conflicts = [],
  operator = 'admin1',
) {
  const now = formatNow()
  const touched = new Set()
  ;(conflicts || []).forEach((c) => {
    const row = (templates || []).find((t) => t.id === c.currentTemplateId)
    if (!row || row.isSystem) return
    touched.add(row.id)

    if (row.scopeType === QC_TEMPLATE_SCOPE_TYPE.GLOBAL) {
      row.status = '停用'
      row.updater = operator
      row.updatedAt = now
      return
    }

    row.objects = (row.objects || []).filter((o) => !sameObject(o, c.object))
    if (!row.objects.length) row.status = '停用'
    row.updater = operator
    row.updatedAt = now
  })
  return { ok: true, touchedIds: [...touched] }
}

export function filterObjectsSkippingConflicts(objects = [], conflicts = []) {
  const conflictKeys = new Set((conflicts || []).map((c) => objectKey(c.object)))
  return (objects || []).filter((o) => !conflictKeys.has(objectKey(o)))
}
