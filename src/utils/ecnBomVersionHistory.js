import { getVersionsInGroup } from '@/mock/productBom'
import {
  productBomState,
  getActiveBomForItem,
  getBomsForItem,
  getProductBomById,
} from '@/store/productBomStore'
import { isBomActive } from '@/mock/productBomOptions'
import { summarizeChangeItems } from '@/utils/ecnBomExecution'
import { BOM_CHANGE_SOURCE_TYPE, BOM_MANUAL_CHANGE_SOURCE_LABEL } from '@/constants/bomChangeSource'
import { summarizeBomVersionChanges } from '@/utils/bomVersionChangeSummary'

function formatDate(value) {
  if (!value) return '—'
  return String(value).slice(0, 10)
}

function resolveManualChangeSummary(bom, prev) {
  if (!prev) return bom.changeSummary || bom.remark || ''
  const oldBom = getProductBomById(prev.id) || prev
  const newBom = getProductBomById(bom.id) || bom
  return summarizeBomVersionChanges(oldBom, newBom)
}

/** 从 BOM 版本组构建时间线（最新在前） */
export function buildBomVersionHistoryFromGroup(versionGroupId, boms = productBomState.boms) {
  if (!versionGroupId) return []
  const versions = getVersionsInGroup(boms, versionGroupId)
  if (!versions.length) return []

  const oldestId = versions[versions.length - 1]?.id
  return versions.map((bom, index) => {
    const prev = versions[index + 1]
    const isEcn = Boolean(bom.sourceEcnNo)
    const isManual =
      bom.changeSourceType === BOM_CHANGE_SOURCE_TYPE.MANUAL_EDIT || (!isEcn && Boolean(prev))
    const isInitial = bom.id === oldestId && !isEcn && !isManual
    const isCurrent = isBomActive(bom)
    return {
      version: bom.version,
      tag: isCurrent ? '当前版本' : isInitial ? '初始版本' : '',
      date: formatDate(bom.effectiveAt || bom.createdAt),
      ecnNo: bom.sourceEcnNo || '',
      changeSource: isEcn
        ? bom.sourceEcnNo
        : isInitial
          ? ''
          : bom.changeSourceLabel || BOM_MANUAL_CHANGE_SOURCE_LABEL,
      changeSourceIsEcn: isEcn,
      changeSummary: isEcn
        ? bom.changeSummary || bom.remark || ''
        : isInitial
          ? ''
          : resolveManualChangeSummary(bom, prev),
      executor: bom.upgradedBy || bom.operator || bom.creator || '—',
      isInitial,
      initialNote: isInitial ? '初始BOM · 产品发布时创建' : '',
      compareVersion: prev?.version || '',
      compareBomId: prev?.id || '',
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
    summarizeChangeItems(record.changeItems) || record.description || '工程变更已执行'
  return [
    {
      version: record.bomVersion || '—',
      tag: '当前版本',
      date: formatDate(record.executedAt || record.reviewTime),
      ecnNo: record.ecnNo || record.ecrNo || '',
      changeSource: record.ecnNo || record.ecrNo || '',
      changeSourceIsEcn: true,
      changeSummary,
      executor: record.executor || record.applicant || '—',
      isInitial: false,
      bomId: record.bomId || '',
    },
  ]
}
