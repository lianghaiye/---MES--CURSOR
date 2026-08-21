/**
 * 质检模板 mock / 筛选项
 */
import dayjs from 'dayjs'

export const qcTemplateStatusOptions = ['启用', '停用']

export const qcTemplateTypeOptions = ['系统模板', '自定义模板']

/** 业务范围 */
export const qcTemplateBizScopeOptions = [
  '成品检',
  '来料质检',
  '生产过程检',
  '外协回货检',
  '出厂质检',
]

export function createQcTemplate(partial = {}) {
  const fields = Array.isArray(partial.fields) ? partial.fields : []
  return {
    id: partial.id || `qct-${Date.now()}`,
    code: partial.code || '',
    name: partial.name || '',
    status: partial.status || '停用',
    type: partial.type || '自定义模板',
    isSystem: Boolean(partial.isSystem),
    bizScope: partial.bizScope || '成品检',
    objects: Array.isArray(partial.objects) ? partial.objects : [],
    fieldCount: partial.fieldCount != null ? partial.fieldCount : fields.length,
    fields,
    creator: partial.creator || 'admin1',
    createdAt: partial.createdAt || dayjs().format('YYYY-MM-DD HH:mm:ss'),
    updater: partial.updater || partial.creator || 'admin1',
    updatedAt: partial.updatedAt || partial.createdAt || dayjs().format('YYYY-MM-DD HH:mm:ss'),
    ...partial,
  }
}

export const mockQcTemplates = [
  createQcTemplate({
    id: 'qct-sys-1',
    code: 'QCT-SYS-001',
    name: '来料质检标准模板',
    status: '启用',
    type: '系统模板',
    isSystem: true,
    bizScope: '来料质检',
    objects: ['全部物料'],
    fieldCount: 4,
    creator: '系统管理员',
    createdAt: '2026-01-15 10:30:00',
    updater: '系统管理员',
    updatedAt: '2026-03-20 14:22:00',
  }),
  createQcTemplate({
    id: 'qct-sys-2',
    code: 'QCT-SYS-002',
    name: '出厂质检标准模板',
    status: '启用',
    type: '系统模板',
    isSystem: true,
    bizScope: '出厂质检',
    objects: ['全部产品'],
    fieldCount: 5,
    creator: '系统管理员',
    createdAt: '2026-01-15 10:35:00',
    updater: '系统管理员',
    updatedAt: '2026-04-01 09:10:00',
  }),
  createQcTemplate({
    id: 'qct-usr-1',
    code: 'QCT-USR-001',
    name: '泵类成品检模板',
    status: '启用',
    type: '自定义模板',
    isSystem: false,
    bizScope: '成品检',
    objects: ['清水离心泵', '多级泵'],
    fieldCount: 6,
    creator: '张三',
    createdAt: '2026-05-08 16:20:00',
    updater: '李四',
    updatedAt: '2026-06-10 11:30:00',
  }),
  createQcTemplate({
    id: 'qct-usr-2',
    code: 'QCT-USR-002',
    name: '机加过程检模板',
    status: '启用',
    type: '自定义模板',
    isSystem: false,
    bizScope: '生产过程检',
    objects: ['机加车间', '轴承套'],
    fieldCount: 3,
    creator: '王五',
    createdAt: '2026-06-12 09:00:00',
    updater: '王五',
    updatedAt: '2026-06-12 09:00:00',
  }),
  createQcTemplate({
    id: 'qct-usr-3',
    code: 'QCT-USR-003',
    name: '外协回货检模板',
    status: '停用',
    type: '自定义模板',
    isSystem: false,
    bizScope: '外协回货检',
    objects: ['外协件-法兰', '外协件-轴套'],
    fieldCount: 4,
    creator: '赵六',
    createdAt: '2026-07-01 14:18:00',
    updater: '赵六',
    updatedAt: '2026-07-20 16:40:00',
  }),
]

export function cloneQcTemplates() {
  return mockQcTemplates.map((t) => ({
    ...t,
    objects: [...(t.objects || [])],
    fields: Array.isArray(t.fields) ? t.fields.map((f) => ({ ...f })) : [],
  }))
}

export function filterQcTemplates(list = [], filters = {}) {
  return (list || []).filter((row) => {
    if (filters.status && row.status !== filters.status) return false
    if (filters.type && row.type !== filters.type) return false
    if (filters.code && !(row.code || '').includes(String(filters.code).trim())) return false
    if (filters.name && !(row.name || '').includes(String(filters.name).trim())) return false
    if (filters.creator && !(row.creator || '').includes(String(filters.creator).trim())) {
      return false
    }
    if (filters.dateRange?.length === 2) {
      const [start, end] = filters.dateRange
      const t = dayjs(row.createdAt)
      if (!t.isValid()) return false
      if (t.isBefore(dayjs(start).startOf('day')) || t.isAfter(dayjs(end).endOf('day'))) {
        return false
      }
    }
    return true
  })
}

export function nextQcTemplateCode(list = []) {
  const nums = (list || [])
    .map((t) => {
      const m = String(t.code || '').match(/QCT-USR-(\d+)/i)
      return m ? Number(m[1]) : 0
    })
    .filter((n) => n > 0)
  const next = (nums.length ? Math.max(...nums) : 0) + 1
  return `QCT-USR-${String(next).padStart(3, '0')}`
}
