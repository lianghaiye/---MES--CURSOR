import { reactive } from 'vue'
import dayjs from 'dayjs'
import {
  cloneQcLibraryFields,
  createQcLibraryField,
  filterQcLibraryFields,
  libraryFieldToTemplateField,
  nextQcLibraryFieldCode,
  templateFieldToLibraryPayload,
} from '@/mock/qcFieldLibrary'
import { isQcSystemFixedField } from '@/utils/qcConclusionField'
import { qcTemplateState } from '@/store/qcTemplateStore'

const LIBRARY_SEED_KEY = 'i_doms_qc_field_library_seed_v'
const LIBRARY_SEED_VERSION = '5'

function nowText() {
  return dayjs().format('YYYY-MM-DD HH:mm:ss')
}

function initLibraryFields() {
  try {
    if (localStorage.getItem(LIBRARY_SEED_KEY) !== LIBRARY_SEED_VERSION) {
      localStorage.setItem(LIBRARY_SEED_KEY, LIBRARY_SEED_VERSION)
      return cloneQcLibraryFields()
    }
  } catch {
    /* ignore */
  }
  return cloneQcLibraryFields()
}

export const qcFieldLibraryState = reactive({
  fields: initLibraryFields(),
})

/** 热更新/旧内存下补齐复合演示项，并强制刷新演示结构；移除多点演示 */
export function ensureQcLibraryDemoSeed() {
  const all = cloneQcLibraryFields()
  let changed = false

  // 下线多点演示
  const before = qcFieldLibraryState.fields.length
  qcFieldLibraryState.fields = qcFieldLibraryState.fields.filter((f) => f.type !== 'matrix')
  if (qcFieldLibraryState.fields.length !== before) changed = true

  const demos = all.filter((f) => f.code === 'QC_RUN_TEST')
  demos.forEach((d) => {
    const idx = qcFieldLibraryState.fields.findIndex((f) => f.code === d.code)
    if (idx < 0) {
      qcFieldLibraryState.fields.unshift(d)
      changed = true
      return
    }
    const prev = qcFieldLibraryState.fields[idx]
    const next = { ...d, id: prev.id || d.id }
    const sameChildren = JSON.stringify(prev.children || []) === JSON.stringify(next.children || [])
    if (!sameChildren || idx > 1) {
      qcFieldLibraryState.fields.splice(idx, 1)
      qcFieldLibraryState.fields.unshift(next)
      changed = true
    }
  })
  const hasRun = qcFieldLibraryState.fields.some((f) => f.code === 'QC_RUN_TEST')
  if (!hasRun) {
    qcFieldLibraryState.fields.splice(0, qcFieldLibraryState.fields.length, ...all)
    changed = true
  }
  if (changed) {
    try {
      localStorage.setItem(LIBRARY_SEED_KEY, LIBRARY_SEED_VERSION)
    } catch {
      /* ignore */
    }
  }
  return changed
}

export function listQcLibraryFields(filters = {}) {
  return filterQcLibraryFields(qcFieldLibraryState.fields, filters)
}

export function getQcLibraryFieldById(id) {
  return qcFieldLibraryState.fields.find((f) => f.id === id) || null
}

export function getQcLibraryFieldByCode(code) {
  const c = String(code || '')
    .trim()
    .toUpperCase()
  if (!c) return null
  return (
    qcFieldLibraryState.fields.find(
      (f) =>
        String(f.code || '')
          .trim()
          .toUpperCase() === c,
    ) || null
  )
}

export function isQcLibraryFieldReferenced(code) {
  const c = String(code || '')
    .trim()
    .toUpperCase()
  if (!c) return false
  return (qcTemplateState.templates || []).some((t) =>
    (t.fields || []).some(
      (f) =>
        String(f.code || '')
          .trim()
          .toUpperCase() === c,
    ),
  )
}

export function addQcLibraryField(payload = {}, operator = 'admin1') {
  const code =
    String(payload.code || '').trim() || nextQcLibraryFieldCode(qcFieldLibraryState.fields)
  if (isQcSystemFixedField({ code, name: payload.name })) {
    return { ok: false, message: '系统固定项不可写入检验项库' }
  }
  if (getQcLibraryFieldByCode(code)) {
    return { ok: false, message: `字段编码「${code}」已存在` }
  }
  if (!String(payload.name || '').trim()) {
    return { ok: false, message: '请输入字段名称' }
  }
  if (!payload.type) {
    return { ok: false, message: '请选择字段类型' }
  }
  const now = nowText()
  const row = createQcLibraryField({
    ...payload,
    id: `qcf-${Date.now()}`,
    code,
    status: payload.status || '启用',
    creator: operator,
    createdAt: now,
    updater: operator,
    updatedAt: now,
  })
  qcFieldLibraryState.fields.unshift(row)
  return { ok: true, field: row }
}

export function updateQcLibraryField(id, payload = {}, operator = 'admin1') {
  const row = getQcLibraryFieldById(id)
  if (!row) return { ok: false, message: '检验项不存在' }
  const nextCode = payload.code != null ? String(payload.code).trim() : row.code
  if (isQcSystemFixedField({ code: nextCode, name: payload.name || row.name })) {
    return { ok: false, message: '系统固定项不可写入检验项库' }
  }
  const dup = getQcLibraryFieldByCode(nextCode)
  if (dup && dup.id !== id) {
    return { ok: false, message: `字段编码「${nextCode}」已存在` }
  }
  Object.assign(row, {
    code: nextCode,
    name: payload.name != null ? String(payload.name).trim() : row.name,
    type: payload.type != null ? payload.type : row.type,
    category: payload.category != null ? payload.category : row.category,
    required: payload.required != null ? Boolean(payload.required) : row.required,
    withUnit: payload.withUnit != null ? Boolean(payload.withUnit) : row.withUnit,
    unit: payload.unit != null ? payload.unit : row.unit,
    unitPosition:
      payload.unitPosition != null
        ? payload.unitPosition === 'prefix'
          ? 'prefix'
          : 'suffix'
        : row.unitPosition || 'suffix',
    allowDecimal: payload.allowDecimal != null ? Boolean(payload.allowDecimal) : row.allowDecimal,
    description: payload.description != null ? payload.description : row.description,
    placeholder: payload.placeholder != null ? payload.placeholder : row.placeholder,
    options: Array.isArray(payload.options) ? [...payload.options] : row.options,
    defaultValue: payload.defaultValue != null ? payload.defaultValue : row.defaultValue,
    format: payload.format != null ? payload.format : row.format,
    charLimit: payload.charLimit !== undefined ? payload.charLimit : row.charLimit,
    judgeRule: payload.judgeRule != null ? payload.judgeRule : row.judgeRule || 'none',
    standardMin: payload.standardMin !== undefined ? payload.standardMin : row.standardMin,
    standardMax: payload.standardMax !== undefined ? payload.standardMax : row.standardMax,
    standardValue: payload.standardValue !== undefined ? payload.standardValue : row.standardValue,
    passOptions: Array.isArray(payload.passOptions)
      ? [...payload.passOptions]
      : row.passOptions || [],
    standardText:
      payload.standardText !== undefined ? payload.standardText : row.standardText || '',
    children: Array.isArray(payload.children)
      ? payload.children.map((c) => ({ ...c }))
      : row.children || [],
    matrixColumns: Array.isArray(payload.matrixColumns)
      ? payload.matrixColumns.map((c) => ({ ...c }))
      : row.matrixColumns || [],
    matrixRows: Array.isArray(payload.matrixRows)
      ? payload.matrixRows.map((r) => ({ ...r }))
      : row.matrixRows || [],
    matrixAllowAddRow:
      payload.matrixAllowAddRow != null
        ? Boolean(payload.matrixAllowAddRow)
        : row.matrixAllowAddRow !== false,
    updater: operator,
    updatedAt: nowText(),
  })
  return { ok: true, field: row }
}

export function toggleQcLibraryFieldStatus(id, operator = 'admin1') {
  const row = getQcLibraryFieldById(id)
  if (!row) return { ok: false, message: '检验项不存在' }
  row.status = row.status === '启用' ? '停用' : '启用'
  row.updater = operator
  row.updatedAt = nowText()
  return { ok: true, field: row }
}

export function deleteQcLibraryField(id) {
  const row = getQcLibraryFieldById(id)
  if (!row) return { ok: false, message: '检验项不存在' }
  if (row.status === '启用') return { ok: false, message: '请先停用后再删除' }
  if (isQcLibraryFieldReferenced(row.code)) {
    return { ok: false, message: '该检验项已被质检模板引用，不可删除，请保持停用' }
  }
  const idx = qcFieldLibraryState.fields.findIndex((f) => f.id === id)
  if (idx < 0) return { ok: false, message: '检验项不存在' }
  qcFieldLibraryState.fields.splice(idx, 1)
  return { ok: true }
}

/**
 * 模板新建字段时同步入库；编码已存在则跳过（不覆盖）。
 */
export function syncTemplateFieldToLibrary(field = {}, operator = 'admin1') {
  const payload = templateFieldToLibraryPayload(field)
  if (!payload) return { ok: false, skipped: true, message: '系统字段不同步' }
  const exist = getQcLibraryFieldByCode(payload.code)
  if (exist) {
    return { ok: true, skipped: true, field: exist, message: '库中已存在同编码检验项' }
  }
  return addQcLibraryField({ ...payload, status: '启用' }, operator)
}

/**
 * 将库中多项加入模板字段列表（默认布局后插在结论前，去重编码）。
 */
export function pickLibraryFieldsForTemplate(libraryIds = [], currentFields = []) {
  const ids = Array.isArray(libraryIds) ? libraryIds : []
  const existingCodes = new Set(
    (currentFields || [])
      .map((f) =>
        String(f.code || '')
          .trim()
          .toUpperCase(),
      )
      .filter(Boolean),
  )
  const added = []
  const skipped = []
  ids.forEach((id) => {
    const lib = getQcLibraryFieldById(id)
    if (!lib) {
      skipped.push({ id, reason: '不存在' })
      return
    }
    if (lib.status !== '启用') {
      skipped.push({ id, code: lib.code, reason: '已停用' })
      return
    }
    const code = String(lib.code || '')
      .trim()
      .toUpperCase()
    if (existingCodes.has(code)) {
      skipped.push({ id, code: lib.code, reason: '模板中已存在' })
      return
    }
    existingCodes.add(code)
    added.push(libraryFieldToTemplateField(lib))
  })
  return { ok: true, added, skipped }
}

export { libraryFieldToTemplateField, filterQcLibraryFields }
