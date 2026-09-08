import { reactive } from 'vue'
import dayjs from 'dayjs'
import {
  QC_TEMPLATE_SCOPE_TYPE,
  cloneQcTemplates,
  createQcTemplate,
  nextQcTemplateCode,
} from '@/mock/qcTemplates'
import {
  ensureFieldsWithSystemFixedItems,
  upsertSheetConclusionField,
} from '@/utils/qcConclusionField'
import {
  applyQcTemplateConflictReplace,
  filterObjectsSkippingConflicts,
  findQcTemplateConflicts,
} from '@/utils/qcTemplateConflictService'

const TEMPLATE_SEED_KEY = 'i_doms_qc_templates_seed_v'
const TEMPLATE_SEED_VERSION = '11'

function nowText() {
  return dayjs().format('YYYY-MM-DD HH:mm:ss')
}

function initTemplates() {
  try {
    if (localStorage.getItem(TEMPLATE_SEED_KEY) !== TEMPLATE_SEED_VERSION) {
      localStorage.setItem(TEMPLATE_SEED_KEY, TEMPLATE_SEED_VERSION)
    }
  } catch {
    /* ignore */
  }
  return cloneQcTemplates()
}

export const qcTemplateState = reactive({
  templates: initTemplates(),
})

/** 按种子版本重载演示模板；热更新时同步密封件复合结构 */
export function ensureQcTemplateDemoSeed() {
  let changed = false
  try {
    if (localStorage.getItem(TEMPLATE_SEED_KEY) !== TEMPLATE_SEED_VERSION) {
      localStorage.setItem(TEMPLATE_SEED_KEY, TEMPLATE_SEED_VERSION)
      const fresh = cloneQcTemplates()
      qcTemplateState.templates.splice(0, qcTemplateState.templates.length, ...fresh)
      return true
    }
  } catch {
    /* ignore */
  }

  const row = qcTemplateState.templates.find((t) => t.code === 'QCT-USR-LL-001')
  if (!row) return false
  const fresh = cloneQcTemplates().find((t) => t.code === 'QCT-USR-LL-001')
  if (!fresh) return false

  if (row.sheetPassRule !== fresh.sheetPassRule) {
    row.sheetPassRule = fresh.sheetPassRule
    changed = true
  }
  if (
    JSON.stringify(row.sheetConclusionOptionItems || []) !==
    JSON.stringify(fresh.sheetConclusionOptionItems || [])
  ) {
    row.sheetConclusionOptionItems = (fresh.sheetConclusionOptionItems || []).map((o) => ({
      ...o,
    }))
    changed = true
  }
  if (row.name !== fresh.name) {
    row.name = fresh.name
    changed = true
  }

  const fields = (row.fields || []).filter((f) => f.type !== 'matrix' && f.code !== 'QC_PERF_CURVE')
  if (fields.length !== (row.fields || []).length) changed = true

  const freshComplex = (fresh.fields || []).filter((f) => f.code === 'QC_RUN_TEST')
  freshComplex.forEach((demo) => {
    const idx = fields.findIndex((f) => f.code === demo.code)
    if (idx < 0) {
      fields.push({ ...demo })
      changed = true
      return
    }
    const prev = fields[idx]
    const sameChildren = JSON.stringify(prev.children || []) === JSON.stringify(demo.children || [])
    if (!sameChildren || prev.type !== demo.type) {
      fields[idx] = { ...prev, ...demo, sortOrder: prev.sortOrder ?? demo.sortOrder }
      changed = true
    }
  })
  if (changed) {
    row.fields = fields
    row.fieldCount = fields.length
  }
  return changed
}

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
  const fields = upsertSheetConclusionField(
    ensureFieldsWithSystemFixedItems(Array.isArray(payload.fields) ? payload.fields : []),
    payload.sheetConclusionOptionItems,
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

  const fields = upsertSheetConclusionField(
    ensureFieldsWithSystemFixedItems(Array.isArray(payload.fields) ? payload.fields : row.fields),
    payload.sheetConclusionOptionItems != null
      ? payload.sheetConclusionOptionItems
      : row.sheetConclusionOptionItems,
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
      sheetPassRule:
        payload.sheetPassRule != null ? payload.sheetPassRule : row.sheetPassRule || 'manual',
      sheetConclusionOptionItems:
        payload.sheetConclusionOptionItems != null
          ? payload.sheetConclusionOptionItems
          : row.sheetConclusionOptionItems,
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
    sheetPassRule:
      payload.sheetPassRule != null ? payload.sheetPassRule : row.sheetPassRule || 'manual',
    sheetConclusionOptionItems:
      payload.sheetConclusionOptionItems != null
        ? payload.sheetConclusionOptionItems
        : row.sheetConclusionOptionItems,
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
      sheetPassRule: source.sheetPassRule,
      sheetConclusionOptionItems: source.sheetConclusionOptionItems,
      fields,
      fieldCount: fields.length,
      gatePolicy: source.gatePolicy,
      inspectMethodDefault: source.inspectMethodDefault,
      status: '停用',
    },
    operator,
  )
}
