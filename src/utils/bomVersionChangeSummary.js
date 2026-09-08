import { buildEbomSnapshotFromBom } from '@/utils/ebomSnapshot'
import { buildEbomSnapshotDiff, EBOM_DIFF_CHANGE_TYPE } from '@/utils/ebomSnapshotDiff'

const MAX_SUMMARY_ITEMS = 10

function pickName(row, side) {
  const src = side === 'before' ? row.before : side === 'after' ? row.after : row
  const name = String(src?.name || row.name || '').trim()
  if (name) return name
  const code = String(src?.code || row.code || '').trim()
  return code || '未命名物料'
}

function formatModify(row) {
  const name = pickName(row, 'after')
  const fields = (row.fieldChanges || []).map(
    (field) => `${field.label} ${field.before}→${field.after}`,
  )
  if (!fields.length) return `修改${name}`
  return `${name}${fields.join('、')}`
}

function formatDiffRow(row) {
  if (row.changeType === EBOM_DIFF_CHANGE_TYPE.ADD) return `新增${pickName(row, 'after')}`
  if (row.changeType === EBOM_DIFF_CHANGE_TYPE.REMOVE) return `删除${pickName(row, 'before')}`
  if (row.changeType === EBOM_DIFF_CHANGE_TYPE.REPLACE) {
    return `${pickName(row, 'before')} → ${pickName(row, 'after')}`
  }
  if (row.changeType === EBOM_DIFF_CHANGE_TYPE.MODIFY) return formatModify(row)
  return ''
}

/** 对比两个 BOM 版本，生成带物料名的变更内容（用于历史版本卡片） */
export function summarizeBomVersionChanges(oldBom, newBom) {
  if (!oldBom || !newBom) return ''
  const diff = buildEbomSnapshotDiff(
    buildEbomSnapshotFromBom(oldBom, 1),
    buildEbomSnapshotFromBom(newBom, 1),
  )
  const parts = (diff.rows || []).map(formatDiffRow).filter(Boolean)
  if (!parts.length) return '无物料明细变更'
  if (parts.length <= MAX_SUMMARY_ITEMS) return parts.join('；')
  return `${parts.slice(0, MAX_SUMMARY_ITEMS).join('；')} 等共 ${parts.length} 项`
}
