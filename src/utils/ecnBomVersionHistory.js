import { getVersionsInGroup } from '@/mock/productBom'
import { productBomState, getActiveBomForItem, getBomsForItem } from '@/store/productBomStore'
import { isBomActive } from '@/mock/productBomOptions'
import { summarizeChangeItems } from '@/utils/ecnBomExecution'

function formatDate(value) {
  if (!value) return '—'
  return String(value).slice(0, 10)
}

/** 从 BOM 版本组构建时间线（最新在前） */
export function buildBomVersionHistoryFromGroup(versionGroupId, boms = productBomState.boms) {
  if (!versionGroupId) return []
  const versions = getVersionsInGroup(boms, versionGroupId)
  if (!versions.length) return []

  const oldestId = versions[versions.length - 1]?.id
  return versions.map((bom, index) => {
    const prev = versions[index + 1]
    const isInitial = bom.id === oldestId && !bom.sourceEcnNo
    const isCurrent = isBomActive(bom)
    return {
      version: bom.version,
      tag: isCurrent ? '当前版本' : isInitial ? '初始版本' : '',
      date: formatDate(bom.effectiveAt || bom.createdAt),
      ecnNo: bom.sourceEcnNo || '',
      changeSummary: bom.changeSummary || bom.remark || '',
      executor: bom.upgradedBy || bom.operator || bom.creator || '—',
      isInitial,
      initialNote: isInitial ? '初始BOM · 产品发布时创建' : '',
      compareVersion: prev?.version || '',
      bomId: bom.id,
    }
  })
}

/** 按产品解析版本组并构建时间线 */
export function buildBomVersionHistoryForProduct(productId, boms = productBomState.boms) {
  const active = getActiveBomForItem('product', productId)
  if (active?.versionGroupId) {
    return buildBomVersionHistoryFromGroup(active.versionGroupId, boms)
  }
  const all = getBomsForItem('product', productId)
  if (all[0]?.versionGroupId) {
    return buildBomVersionHistoryFromGroup(all[0].versionGroupId, boms)
  }
  return []
}

/** ECN 详情页：优先版本组，其次变更项摘要 */
export function buildBomVersionHistory(record = {}) {
  if (record.bomVersionHistory?.length) return record.bomVersionHistory
  if (record.versionGroupId) {
    return buildBomVersionHistoryFromGroup(record.versionGroupId)
  }
  if (record.productId) {
    const history = buildBomVersionHistoryForProduct(record.productId)
    if (history.length) return history
  }
  const changeSummary =
    summarizeChangeItems(record.changeItems) ||
    record.description ||
    '工程变更已执行'
  return [
    {
      version: record.bomVersion || '—',
      tag: '当前版本',
      date: formatDate(record.executedAt || record.reviewTime),
      ecnNo: record.ecnNo || record.ecrNo || '',
      changeSummary,
      executor: record.executor || record.applicant || '—',
      isInitial: false,
      bomId: record.bomId || '',
    },
  ]
}
