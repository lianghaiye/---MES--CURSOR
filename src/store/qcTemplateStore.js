import { reactive } from 'vue'
import dayjs from 'dayjs'
import {
  QC_TEMPLATE_SCOPE_TYPE,
  cloneQcTemplates,
  createQcTemplate,
  nextQcTemplateCode,
} from '@/mock/qcTemplates'
import { ensureFieldsWithSystemFixedItems } from '@/utils/qcConclusionField'
import {
  applyQcTemplateConflictReplace,
  filterObjectsSkippingConflicts,
  findQcTemplateConflicts,
} from '@/utils/qcTemplateConflictService'

function nowText() {
  return dayjs().format('YYYY-MM-DD HH:mm:ss')
}

export const qcTemplateState = reactive({
  templates: cloneQcTemplates(),
})

export function getQcTemplateById(id) {
  return qcTemplateState.templates.find((t) => t.id === id) || null
}

export function getQcTemplateByCode(code) {
  const c = String(code || '').trim()
  if (!c) return null
  return qcTemplateState.templates.find((t) => t.code === c) || null
}

export function previewQcTemplateConflicts(payload = {}) {
  return findQcTemplateConflicts(qcTemplateState.templates, payload)
}

/**
 * 启用模板。若有冲突需先传入 conflictResolution: { mode: 'replace'|'skip' }
 */
export function enableQcTemplate(id, { conflictResolution, operator = 'admin1' } = {}) {
  const row = getQcTemplateById(id)
  if (!row) return { ok: false, message: '模板不存在' }
  if (row.isSystem) return { ok: false, message: '系统模板不可启停' }
  if (row.status === '启用') return { ok: true, template: row }

  const conflict = findQcTemplateConflicts(qcTemplateState.templates, {
    id: row.id,
    bizScope: row.bizScope,
    scopeType: row.scopeType,
    objects: row.objects || [],
  })

  if (conflict.hasConflict && !conflictResolution) {
    return { ok: false, needConflict: true, conflict, template: row }
  }

  if (conflict.hasConflict && conflictResolution?.mode === 'replace') {
    applyQcTemplateConflictReplace(qcTemplateState.templates, conflict.conflicts, operator)
  } else if (conflict.hasConflict && conflictResolution?.mode === 'skip') {
    const nextObjects = filterObjectsSkippingConflicts(row.objects || [], conflict.conflicts)
    if (row.scopeType !== QC_TEMPLATE_SCOPE_TYPE.GLOBAL && !nextObjects.length) {
      return { ok: false, message: '跳过冲突后无剩余适用对象，无法启用' }
    }
    row.objects = nextObjects
  }

  row.status = '启用'
  row.updater = operator
  row.updatedAt = nowText()
  return { ok: true, template: row }
}

export function disableQcTemplate(id, { force = false, operator = 'admin1' } = {}) {
  const row = getQcTemplateById(id)
  if (!row) return { ok: false, message: '模板不存在' }
  if (row.isSystem) return { ok: false, message: '系统模板不可启停' }
  if (row.status !== '启用') return { ok: true, template: row }

  if (!force) {
    return { ok: false, needConfirm: true, template: row }
  }

  row.status = '停用'
  row.updater = operator
  row.updatedAt = nowText()
  return { ok: true, template: row }
}

/** @deprecated 使用 enableQcTemplate / disableQcTemplate */
export function toggleQcTemplateStatus(id, operator = 'admin1') {
  const row = getQcTemplateById(id)
  if (!row) return { ok: false, message: '模板不存在' }
  if (row.isSystem) return { ok: false, message: '系统模板不可启停' }
  if (row.status === '启用') return disableQcTemplate(id, { force: true, operator })
  return enableQcTemplate(id, { operator })
}

export function deleteQcTemplate(id) {
  const row = getQcTemplateById(id)
  if (!row) return { ok: false, message: '模板不存在' }
  if (row.isSystem) return { ok: false, message: '系统模板不可删除' }
  if (row.status === '启用') return { ok: false, message: '请先停用后再删除' }
  const idx = qcTemplateState.templates.findIndex((t) => t.id === id)
  if (idx < 0) return { ok: false, message: '模板不存在' }
  qcTemplateState.templates.splice(idx, 1)
  return { ok: true }
}

export function addQcTemplate(payload = {}, operator = 'admin1') {
  const now = nowText()
  const fields = ensureFieldsWithSystemFixedItems(
    Array.isArray(payload.fields) ? payload.fields : [],
  )
  const row = createQcTemplate({
    ...payload,
    id: `qct-${Date.now()}`,
    code: payload.code || nextQcTemplateCode(qcTemplateState.templates),
    type: '自定义模板',
    isSystem: false,
    status: payload.status || '停用',
    fields,
    fieldCount: payload.fieldCount != null ? payload.fieldCount : fields.length,
    creator: operator,
    createdAt: now,
    updater: operator,
    updatedAt: now,
  })
  qcTemplateState.templates.unshift(row)
  return { ok: true, template: row }
}

/**
 * 更新模板。启用态保存时做冲突校验。
 */
export function updateQcTemplate(
  id,
  payload = {},
  { conflictResolution, operator = 'admin1' } = {},
) {
  const row = getQcTemplateById(id)
  if (!row) return { ok: false, message: '模板不存在' }
  if (row.isSystem) return { ok: false, message: '系统模板不可编辑' }

  const nextScopeType = payload.scopeType != null ? payload.scopeType : row.scopeType
  const nextBizScope = payload.bizScope != null ? payload.bizScope : row.bizScope
  const nextObjects = Array.isArray(payload.objects)
    ? [...payload.objects]
    : [...(row.objects || [])]
  const nextStatus = payload.status != null ? payload.status : row.status
  const willEnable = nextStatus === '启用'

  const fields = ensureFieldsWithSystemFixedItems(
    Array.isArray(payload.fields) ? payload.fields : row.fields,
  )

  if (willEnable) {
    const conflict = findQcTemplateConflicts(qcTemplateState.templates, {
      id: row.id,
      bizScope: nextBizScope,
      scopeType: nextScopeType,
      objects: nextObjects,
    })
    if (conflict.hasConflict && !conflictResolution) {
      return { ok: false, needConflict: true, conflict, template: row }
    }

    let objectsToSave = nextObjects
    if (conflict.hasConflict && conflictResolution?.mode === 'replace') {
      applyQcTemplateConflictReplace(qcTemplateState.templates, conflict.conflicts, operator)
    } else if (conflict.hasConflict && conflictResolution?.mode === 'skip') {
      objectsToSave = filterObjectsSkippingConflicts(nextObjects, conflict.conflicts)
      if (nextScopeType !== QC_TEMPLATE_SCOPE_TYPE.GLOBAL && !objectsToSave.length) {
        return { ok: false, message: '跳过冲突后无剩余适用对象，无法保存启用' }
      }
    }

    Object.assign(row, {
      name: payload.name != null ? payload.name : row.name,
      scopeType: nextScopeType,
      bizScope: nextBizScope,
      objects: objectsToSave,
      status: '启用',
      fields: fields.map((f) => ({ ...f, options: f.options ? [...f.options] : [] })),
      fieldCount: payload.fieldCount != null ? payload.fieldCount : fields.length,
      updater: operator,
      updatedAt: nowText(),
    })
    return { ok: true, template: row }
  }

  Object.assign(row, {
    name: payload.name != null ? payload.name : row.name,
    scopeType: nextScopeType,
    bizScope: nextBizScope,
    objects: nextObjects,
    status: nextStatus,
    fields: fields.map((f) => ({ ...f, options: f.options ? [...f.options] : [] })),
    fieldCount: payload.fieldCount != null ? payload.fieldCount : fields.length,
    updater: operator,
    updatedAt: nowText(),
  })
  return { ok: true, template: row }
}

/** 复制模板（系统/自定义均可），生成新的自定义模板（默认停用） */
export function copyQcTemplate(id, operator = 'admin1') {
  const source = getQcTemplateById(id)
  if (!source) return { ok: false, message: '模板不存在' }

  const fields = ensureFieldsWithSystemFixedItems(source.fields || [])

  const baseName = String(source.name || '未命名模板').trim()
  const copyName = baseName.endsWith('（复制）') ? `${baseName}2` : `${baseName}（复制）`

  return addQcTemplate(
    {
      name: copyName,
      bizScope: source.bizScope,
      scopeType: source.scopeType,
      objects: Array.isArray(source.objects) ? [...source.objects] : [],
      fields,
      fieldCount: fields.length,
      gatePolicy: source.gatePolicy,
      inspectMethodDefault: source.inspectMethodDefault,
      status: '停用',
    },
    operator,
  )
}
