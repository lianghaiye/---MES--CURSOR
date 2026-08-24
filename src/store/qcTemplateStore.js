import { reactive } from 'vue'
import dayjs from 'dayjs'
import { cloneQcTemplates, createQcTemplate, nextQcTemplateCode } from '@/mock/qcTemplates'

function nowText() {
  return dayjs().format('YYYY-MM-DD HH:mm:ss')
}

export const qcTemplateState = reactive({
  templates: cloneQcTemplates(),
})

export function getQcTemplateById(id) {
  return qcTemplateState.templates.find((t) => t.id === id) || null
}

export function toggleQcTemplateStatus(id, operator = 'admin1') {
  const row = getQcTemplateById(id)
  if (!row) return { ok: false, message: '模板不存在' }
  if (row.isSystem) return { ok: false, message: '系统模板不可启停' }
  row.status = row.status === '启用' ? '停用' : '启用'
  row.updater = operator
  row.updatedAt = nowText()
  return { ok: true, template: row }
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
  const fields = Array.isArray(payload.fields) ? payload.fields : []
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

export function updateQcTemplate(id, payload = {}, operator = 'admin1') {
  const row = getQcTemplateById(id)
  if (!row) return { ok: false, message: '模板不存在' }
  if (row.isSystem) return { ok: false, message: '系统模板不可编辑' }
  const fields = Array.isArray(payload.fields) ? payload.fields : row.fields
  Object.assign(row, {
    name: payload.name != null ? payload.name : row.name,
    scopeType: payload.scopeType != null ? payload.scopeType : row.scopeType,
    bizScope: payload.bizScope != null ? payload.bizScope : row.bizScope,
    objects: Array.isArray(payload.objects) ? [...payload.objects] : row.objects,
    fields: fields.map((f) => ({ ...f, options: f.options ? [...f.options] : [] })),
    fieldCount: payload.fieldCount != null ? payload.fieldCount : fields.length,
    updater: operator,
    updatedAt: nowText(),
  })
  return { ok: true, template: row }
}
