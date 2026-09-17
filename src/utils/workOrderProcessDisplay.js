/** 工序投料摘要（列表/打印展示） */
import {
  getProcessById,
  getProcessByName,
  getOperationLabels,
  PROCESS_OPERATION_DEFS,
} from '@/store/processConfigStore'
import { getProductionMode, isMinimalReportMode } from '@/store/businessRuleStore'
import { resolveProcessIsBlanking } from '@/utils/workOrderBlanking'
import { getTaskExecutionModeLabel, resolveProcessExecutionMode } from '@/utils/taskExecutionMode'
import { normalizeReportMode } from '@/utils/reportMode'

/** 极简模式工序配置仅展示这些操作 */
export const MINIMAL_PROCESS_OPERATION_KEYS = [
  'opQc',
  'opOutsource',
  'opDisassembly',
  'opDisassemblyQc',
]

export function formatProcessFeedingSummary(process) {
  if (!process?.hasFeeding) return '—'
  const items = (process.feedingMaterials || [])
    .filter((m) => m.materialName || m.materialId)
    .map((m) => {
      const name = m.materialName || m.materialId || '物料'
      if (m.qty == null || m.qty === '') return name
      return `${name}×${m.qty}`
    })
  return items.length ? items.join('；') : '—'
}

export function formatProcessExecutors(process) {
  const list = process?.executors || []
  return list.length ? list.join('、') : '—'
}

export function createEmptyWorkOrderProcessExtras() {
  return {
    processContent: '',
    finishDate: '',
    inspection: '',
    remark: '',
    opOutsource: false,
    outsourceStatus: '',
    outsourceQty: 0,
    outsourcingOrderIds: [],
  }
}

function isMinimalProcessConfigMode() {
  const mode = getProductionMode()
  return mode === 'minimal' || mode === 'minimal_salary' || isMinimalReportMode()
}

function resolveProcessMaster(process) {
  if (!process) return null
  if (process.processId) {
    const byId = getProcessById(process.processId)
    if (byId) return byId
  }
  return getProcessByName(process.name) || null
}

/**
 * 工单工序「工序配置」标签：下料 + 工序操作（极简模式收敛展示）
 * @returns {{ label: string, color: string }[]}
 */
export function resolveWorkOrderProcessConfigTags(process) {
  if (!process) return []
  const master = resolveProcessMaster(process)
  const tags = []
  if (resolveProcessIsBlanking(process) || master?.isBlanking) {
    tags.push({ label: '下料', color: 'orange' })
  }

  const operations = {
    ...(master?.operations || {}),
    ...(process.operations || {}),
  }
  if (process.opOutsource || master?.operations?.opOutsource) {
    operations.opOutsource = true
  }
  let labels = getOperationLabels({ operations })
  if (isMinimalProcessConfigMode()) {
    const allow = new Set(
      PROCESS_OPERATION_DEFS.filter((d) => MINIMAL_PROCESS_OPERATION_KEYS.includes(d.key)).map(
        (d) => d.label,
      ),
    )
    labels = labels.filter((label) => allow.has(label))
  }
  labels.forEach((label) => {
    if (tags.some((t) => t.label === label)) return
    tags.push({ label, color: 'blue' })
  })
  return tags
}

/** 工序配置纯文本（打印用），空则 — */
export function formatWorkOrderProcessConfigText(process) {
  const tags = resolveWorkOrderProcessConfigTags(process)
  return tags.length ? tags.map((t) => t.label).join('、') : '—'
}

/** 工单工序任务模式展示 */
export function formatWorkOrderProcessExecutionMode(process) {
  const master = resolveProcessMaster(process)
  const reportMode = normalizeReportMode(process?.reportMode || master?.reportMode)
  const resourceType = process?.resourceType || master?.resourceType || '工人'
  if (reportMode !== '时长报工' || resourceType !== '工人') return '—'
  return getTaskExecutionModeLabel(
    resolveProcessExecutionMode({
      taskExecutionMode: process?.taskExecutionMode ?? master?.taskExecutionMode,
    }),
  )
}
