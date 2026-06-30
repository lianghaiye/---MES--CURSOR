import dayjs from 'dayjs'
import {
  ECN_CHANGE_ITEM_TYPE,
  formatEcnOriginDoc,
  resolveEcnChangeReason,
  resolveExecConfigLabel,
} from '@/constants/ecn'
import { buildBomVersionHistory } from '@/utils/ecnBomVersionHistory'

const STORAGE_PREFIX = 'ecn-print-preview:'

function resolveChangeDescription(record = {}) {
  if (record.description) return record.description
  return resolveEcnChangeReason(record)
}

function resolveVersionBefore(record = {}, history = []) {
  if (record.previousBomVersion) return record.previousBomVersion
  const prev = history.find((h) => h.compareVersion && h.tag === '当前版本')
  if (prev?.compareVersion) return prev.compareVersion
  const nonCurrent = history.find((h) => h.tag !== '当前版本' && !h.isInitial)
  return nonCurrent?.version || history[history.length - 1]?.version || '—'
}

function resolveVersionAfter(record = {}, history = []) {
  if (record.bomVersion) return record.bomVersion
  const current = history.find((h) => h.tag === '当前版本')
  return current?.version || history[0]?.version || '—'
}

function formatPrintValue(value) {
  if (value === 0) return '0'
  const text = String(value ?? '').trim()
  return text || '—'
}

function isChangeFieldVisible(item, beforeKey, afterKey) {
  const before = formatPrintValue(item[beforeKey])
  const after = formatPrintValue(item[afterKey])
  if (item.changeType === ECN_CHANGE_ITEM_TYPE.ADD) return after !== '—'
  if (item.changeType === ECN_CHANGE_ITEM_TYPE.REMOVE) return before !== '—'
  return before !== '—' || after !== '—'
}

const PRINT_CHANGE_FIELD_DEFS = [
  { label: '物料编码', beforeKey: 'origMaterialCode', afterKey: 'newMaterialCode' },
  { label: '物料名称', beforeKey: 'origMaterialName', afterKey: 'newMaterialName' },
  { label: '规格型号', beforeKey: 'origSpecModel', afterKey: 'newSpecModel' },
  { label: '材质', beforeKey: 'origMaterial', afterKey: 'newMaterial' },
  { label: '图号', beforeKey: 'origDrawingNo', afterKey: 'newDrawingNo' },
  { label: '单位用量', beforeKey: 'origUnitQty', afterKey: 'newUnitQty' },
  { label: '工艺文件', beforeKey: 'origProcessDoc', afterKey: 'newProcessDoc' },
]

function buildPrintFieldRows(item) {
  const rows = []

  PRINT_CHANGE_FIELD_DEFS.forEach(({ label, beforeKey, afterKey }) => {
    if (!isChangeFieldVisible(item, beforeKey, afterKey)) return
    const before = formatPrintValue(item[beforeKey])
    const after = formatPrintValue(item[afterKey])
    rows.push({
      label,
      before,
      after,
      changed: before !== after,
    })
  })

  return rows
}

function buildPrintChangeRows(items = []) {
  return items.map((item, index) => ({
    index: index + 1,
    changeType: item.changeType || '—',
    fieldRows: buildPrintFieldRows(item),
    changeNote: item.changeNote || '—',
  }))
}

function buildApprovalRows(records = []) {
  return records.map((row, index) => ({
    index: index + 1,
    role: row.role || '—',
    name: row.name || '—',
    result: row.result || '—',
    time: row.time || '—',
    opinion: row.opinion || '—',
  }))
}

function resolveApproverNames(records = []) {
  const names = records
    .filter((r) => r.result === '已通过')
    .map((r) => r.name)
    .filter(Boolean)
  return [...new Set(names)].join(' / ') || '—'
}

/** 构建 ECN/ECR 打印数据 */
export function buildEcnPrintPayload(record, moduleConfig = {}, options = {}) {
  if (!record) return null
  const history = record.bomVersionHistory?.length
    ? record.bomVersionHistory
    : buildBomVersionHistory(record)
  const docNoField = moduleConfig.docNoField || 'ecnNo'
  const docNo = record[docNoField] || '—'
  const productCode = record.productCode || '—'

  return {
    docNo,
    docLabel: moduleConfig.docNoLabel || 'ECN单号',
    moduleKind: moduleConfig.kind || 'ecn',
    status: record.status || '—',
    basicInfo: {
      type: record.type || '—',
      changeReason: resolveEcnChangeReason(record),
      urgency: record.urgency || '—',
      applicant: record.applicant || '—',
      department: record.applicantDept || '—',
      createdAt: record.createdAt || '—',
      executedAt: record.executedAt || '—',
      executor: record.executor || '—',
      relatedDoc: formatEcnOriginDoc(record),
      execConfig: resolveExecConfigLabel(record.wipHandling),
    },
    description: resolveChangeDescription(record),
    affectedProduct: {
      productCode,
      productName: record.productName || '—',
      specModel: record.specModel || record.model || '—',
      versionBefore: resolveVersionBefore(record, history),
      versionAfter: resolveVersionAfter(record, history),
    },
    changeRows: buildPrintChangeRows(record.changeItems || []),
    impact: {
      bomVersionAction:
        resolveVersionBefore(record, history) !== '—' && resolveVersionAfter(record, history) !== '—'
          ? `生成新版本 ${resolveVersionAfter(record, history)}`
          : '—',
      execConfig: resolveExecConfigLabel(record.wipHandling),
      execConfigNote:
        record.wipHandling === 'switch_now'
          ? '在制工单将在下一工序切换新版'
          : '已下发计划/工单保持原绑定版本',
    },
    paper: options.paper || 'A4',
    orientation: options.orientation || 'portrait',
    approvalRows: buildApprovalRows(record.approvalRecords || []),
    signatures: {
      applicant: record.applicant || '—',
      approvers: resolveApproverNames(record.approvalRecords || []),
      executor: record.executor || record.applicant || '—',
    },
    printedAt: dayjs().format('YYYY-MM-DD HH:mm'),
  }
}

export function saveEcnPrintPayload(payload) {
  const key = `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
  sessionStorage.setItem(STORAGE_PREFIX + key, JSON.stringify(payload))
  return key
}

export function loadEcnPrintPayload(key) {
  if (!key) return null
  const raw = sessionStorage.getItem(STORAGE_PREFIX + key)
  if (!raw) return null
  try {
    return normalizeEcnPrintPayload(JSON.parse(raw))
  } catch {
    return null
  }
}

/** 补齐打印数据结构，避免预览/打印后渲染异常 */
export function normalizeEcnPrintPayload(raw) {
  if (!raw) return null
  return {
    ...raw,
    basicInfo: {
      type: '—',
      changeReason: '—',
      urgency: '—',
      applicant: '—',
      department: '—',
      createdAt: '—',
      executedAt: '—',
      executor: '—',
      relatedDoc: '—',
      ...(raw.basicInfo || {}),
    },
    affectedProduct: {
      productCode: '—',
      productName: '—',
      specModel: '—',
      versionBefore: '—',
      versionAfter: '—',
      ...(raw.affectedProduct || {}),
    },
    impact: {
      bomVersionAction: '—',
      execConfig: '—',
      execConfigNote: '—',
      ...(raw.impact || {}),
    },
    changeRows: (raw.changeRows || []).map((row, index) => ({
      ...row,
      index: row.index ?? index + 1,
      changeType: row.changeType || '—',
      changeNote: row.changeNote || '—',
      fieldRows: Array.isArray(row.fieldRows) ? row.fieldRows : [],
    })),
    approvalRows: Array.isArray(raw.approvalRows) ? raw.approvalRows : [],
    paper: raw.paper || 'A4',
    orientation: raw.orientation || 'portrait',
  }
}

export function openEcnPrintPreview(router, payload, { autoPrint = false } = {}) {
  const key = saveEcnPrintPayload(payload)
  const query = { key }
  if (autoPrint) query.autoPrint = '1'
  const { href } = router.resolve({ name: 'engineering-change-ecn-print', query })
  window.open(href, '_blank')
}
