import { reactive, watch } from 'vue'
import dayjs from 'dayjs'
import { getUser } from '@/utils/auth'

const STORAGE_KEY = 'i_doms_import_export_history'
const MAX_RECORDS = 200

function load() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) {
      const parsed = JSON.parse(raw)
      if (Array.isArray(parsed.records)) return parsed.records
    }
  } catch {
    /* ignore */
  }
  return []
}

function persist() {
  localStorage.setItem(
    STORAGE_KEY,
    JSON.stringify({ records: importExportHistoryState.records.slice(0, MAX_RECORDS) }),
  )
}

export const importExportHistoryState = reactive({
  records: load(),
})

watch(
  () => importExportHistoryState.records,
  () => persist(),
  { deep: true },
)

function resolveOperator() {
  const user = getUser()
  return user?.displayName || user?.username || 'admin'
}

/**
 * @param {object} params
 * @param {'导入'|'导出'} params.taskType
 * @param {string} params.module
 * @param {'成功'|'失败'|'部分成功'} params.result
 * @param {number} [params.durationSec]
 * @param {string} [params.remark]
 * @param {Array} [params.errorRows] 失败行（含 __error），供下载
 * @param {string[]} [params.errorHeaders]
 * @param {Array} [params.previewRows]
 * @param {number} [params.successCount]
 * @param {number} [params.failCount]
 */
export function addImportExportHistory(params) {
  const successCount = Number(params.successCount) || 0
  const failCount = Number(params.failCount) || 0
  let result = params.result
  if (!result) {
    if (successCount > 0 && failCount > 0) result = '部分成功'
    else if (successCount > 0 && failCount === 0) result = '成功'
    else result = '失败'
  }

  const record = {
    id: `ieh-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    taskType: params.taskType || '导入',
    module: params.module || '',
    operator: resolveOperator(),
    operatedAt: dayjs().format('YYYY-MM-DD HH:mm:ss'),
    progress: result === '失败' && successCount === 0 ? 0 : 100,
    result,
    durationSec: params.durationSec ?? 0,
    remark: params.remark || '',
    successCount,
    failCount,
    errorRows: params.errorRows || [],
    errorHeaders: params.errorHeaders || [],
    previewRows: params.previewRows || [],
  }
  importExportHistoryState.records.unshift(record)
  if (importExportHistoryState.records.length > MAX_RECORDS) {
    importExportHistoryState.records.length = MAX_RECORDS
  }
  return record
}

export function getImportExportHistory() {
  return importExportHistoryState.records
}

export function getImportExportHistoryById(id) {
  return importExportHistoryState.records.find((r) => r.id === id) || null
}
