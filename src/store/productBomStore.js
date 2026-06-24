import { reactive, watch } from 'vue'
import dayjs from 'dayjs'
import { mockProducts } from '@/mock/productInfo'
import { buildPagedMockBoms, hydrateCatalogBom, isCatalogSeedBom } from '@/mock/productBomSeed'
import { mockMaterials } from '@/mock/materialInfo'
import { safeRemoveItem, safeSetItem } from '@/utils/safeStorage'
import {
  BOM_STATUS,
  isBomActive,
  isBomArchived,
  isBomEditable,
  isBomPending,
  isBomProductionReady,
  normalizeBomStatusValue,
} from '@/mock/productBomOptions'
import {
  formatBomVersion,
  getBomVersionYear,
  nextSubVersionForYear,
  normalizeVersionDisplay,
} from '@/utils/bomVersion'
import { upgradeParentBomReferences } from '@/utils/bomVersionReference'

const STORAGE_KEY = 'i_doms_product_bom'
const DATA_VERSION = 7
let bomNoSeq = 31000

function normalizeBoms(boms) {
  return boms.map((b) => ({
    ...b,
    status: normalizeBomStatusValue(b.status),
    version: normalizeVersionDisplay(b.version),
  }))
}

function loadFromStorage() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) {
      const parsed = JSON.parse(raw)
      if (parsed.version === DATA_VERSION && Array.isArray(parsed.boms)) {
        return normalizeBoms(parsed.boms)
      }
    }
  } catch {
    safeRemoveItem(STORAGE_KEY)
  }
  return null
}

/** 种子 BOM：旧 catalog 不落库树结构；paged-mock 仅 40 条可全量落库 */
function serializeBomForStorage(bom) {
  if (bom?.seedSource === 'paged-mock') return bom
  if (!isCatalogSeedBom(bom)) return bom
  return {
    ...bom,
    seedSource: 'catalog',
    treeNodes: [],
    lineItems: [],
    columnSettings: [],
  }
}

function serializeBomsForStorage(boms) {
  return boms.map(serializeBomForStorage)
}

function persist() {
  const payload = JSON.stringify({
    version: DATA_VERSION,
    boms: serializeBomsForStorage(productBomState.boms),
  })
  if (safeSetItem(STORAGE_KEY, payload)) return

  safeRemoveItem(STORAGE_KEY)
  safeSetItem(STORAGE_KEY, payload)
}

function ensureBomStructure(bom) {
  if (!bom) return bom
  if (bom.treeNodes?.length && bom.lineItems?.length) return bom
  if (isCatalogSeedBom(bom)) return hydrateCatalogBom(bom, mockProducts)
  return bom
}

function loadInitialBoms() {
  const stored = loadFromStorage()
  if (stored) return stored
  return normalizeBoms(buildPagedMockBoms(mockProducts, mockMaterials))
}

export const productBomState = reactive({
  boms: loadInitialBoms(),
})

watch(
  () => productBomState.boms,
  () => persist(),
  { deep: true },
)

export { isBomProductionReady, isBomActive, isBomPending, isBomArchived, isBomEditable, BOM_STATUS }

function nowStr() {
  return dayjs().format('YYYY-MM-DD HH:mm')
}

export function generateBomNo() {
  bomNoSeq += 1
  return `BOM${dayjs().format('YYYYMMDD')}${String(bomNoSeq).slice(-3)}`
}

function versionsForItem(itemType, itemId) {
  return productBomState.boms
    .filter((b) => b.itemType === itemType && b.itemId === itemId)
    .map((b) => b.version)
}

function versionsInGroup(versionGroupId) {
  return productBomState.boms
    .filter((b) => b.versionGroupId === versionGroupId)
    .map((b) => b.version)
}

export function getProductBomById(id) {
  const row = productBomState.boms.find((b) => b.id === id)
  return row ? ensureBomStructure(row) : null
}

export function getActiveBomForItem(itemType, itemId) {
  const row = productBomState.boms.find(
    (b) => b.itemType === itemType && b.itemId === itemId && isBomActive(b),
  )
  return row ? ensureBomStructure(row) : null
}

/** 定制产品设计用：取产品关联的基准 BOM 骨架（优先生效版） */
export function getBaselineBomForProduct(productId) {
  const candidates = productBomState.boms
    .filter(
      (b) =>
        b.itemType === 'product' &&
        String(b.itemId) === String(productId) &&
        (b.bomType === '基准BOM' || b.bomType === '基础BOM'),
    )
    .map(ensureBomStructure)
  return candidates.find(isBomActive) || candidates.find(isBomPending) || candidates[0] || null
}

function archiveActiveForItem(itemType, itemId, exceptId) {
  const ts = nowStr()
  productBomState.boms.forEach((b) => {
    if (b.itemType === itemType && b.itemId === itemId && b.id !== exceptId && isBomActive(b)) {
      b.status = BOM_STATUS.ARCHIVED
      b.isDefault = false
      b.expiredAt = ts
      b.updatedAt = ts
      b.operator = 'admin'
    }
  })
}

function buildVersion(itemType, itemId, versionGroupId) {
  const year = getBomVersionYear()
  const allVersions = [...versionsForItem(itemType, itemId), ...versionsInGroup(versionGroupId)]
  const sub = nextSubVersionForYear(allVersions, year)
  return {
    version: formatBomVersion(year, sub),
    versionYear: year,
    versionSub: sub,
  }
}

function buildBomRecord(payload, { versionGroupId, ver, status, source }) {
  const ts = nowStr()
  return {
    id: `bom-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    versionGroupId,
    bomNo: payload.bomNo || generateBomNo(),
    bomName: payload.bomName,
    itemType: payload.itemType,
    itemId: payload.itemId,
    itemName: payload.itemName,
    itemCode: payload.itemCode,
    ...ver,
    status,
    isDefault: status === BOM_STATUS.ACTIVE,
    effectiveAt: status === BOM_STATUS.ACTIVE ? ts : '',
    expiredAt: '',
    operator: 'admin',
    creator: source?.creator || 'admin',
    createdAt: source?.createdAt || ts,
    updatedAt: ts,
    remark: payload.matchingRequirements || payload.remark || '',
    matchingRequirements: payload.matchingRequirements || payload.remark || '',
    bomType: payload.bomType || '基准BOM',
    specModel: payload.specModel || '',
    material: payload.material || '',
    drawingNo: payload.drawingNo || '',
    techParams: payload.techParams || '',
    processRoute: payload.processRoute || '',
    treeNodes: payload.treeNodes || [],
    lineItems: payload.lineItems || [],
    templateRef: payload.templateRef || null,
    columnSettings: payload.columnSettings || [],
  }
}

export function addProductBom(payload) {
  const active = getActiveBomForItem(payload.itemType, payload.itemId)
  const versionGroupId = active?.versionGroupId || `bom-grp-${Date.now()}`
  if (active) {
    archiveProductBom(active.id)
  }
  const ver = buildVersion(payload.itemType, payload.itemId, versionGroupId)
  const record = buildBomRecord(payload, {
    versionGroupId,
    ver,
    status: BOM_STATUS.PENDING,
  })
  productBomState.boms.unshift(record)
  return record
}

export function updateProductBom(id, patch) {
  const idx = productBomState.boms.findIndex((b) => b.id === id)
  if (idx === -1) return null
  const row = productBomState.boms[idx]
  if (!isBomEditable(row)) {
    return { error: '当前状态的 BOM 不可编辑' }
  }
  Object.assign(row, patch, { updatedAt: nowStr(), operator: 'admin' })
  return row
}

/**
 * 保存 BOM：待发布原地更新；生效中保存则归档旧版并生成待发布新版本
 */
export function saveProductBom(id, payload) {
  if (!id) {
    const hadActive = Boolean(getActiveBomForItem(payload.itemType, payload.itemId))
    const record = addProductBom(payload)
    return { record, created: true, versionUpgraded: hadActive }
  }

  const row = productBomState.boms.find((b) => b.id === id)
  if (!row) return { error: '记录不存在' }
  if (isBomArchived(row)) return { error: '已归档的 BOM 不可编辑' }

  if (isBomPending(row)) {
    const updated = updateProductBom(id, payload)
    if (updated?.error) return updated
    return { record: updated, created: false, versionUpgraded: false }
  }

  if (isBomActive(row)) {
    const ts = nowStr()
    row.status = BOM_STATUS.ARCHIVED
    row.isDefault = false
    row.expiredAt = ts
    row.updatedAt = ts

    const ver = buildVersion(row.itemType, row.itemId, row.versionGroupId)
    const record = buildBomRecord(payload, {
      versionGroupId: row.versionGroupId,
      ver,
      status: BOM_STATUS.PENDING,
      source: row,
    })
    productBomState.boms.unshift(record)
    return { record, created: true, versionUpgraded: true, archivedId: row.id }
  }

  return { error: '当前状态的 BOM 不可保存' }
}

/** 基于当前记录生成次版本+1 的待发布新版本 */
export function createBomNewVersion(sourceId) {
  const source = productBomState.boms.find((b) => b.id === sourceId)
  if (!source) return null
  const ver = buildVersion(source.itemType, source.itemId, source.versionGroupId)
  const ts = nowStr()
  const record = {
    ...JSON.parse(JSON.stringify(ensureBomStructure(source))),
    id: `bom-${Date.now()}`,
    bomNo: generateBomNo(),
    ...ver,
    status: BOM_STATUS.PENDING,
    isDefault: false,
    effectiveAt: '',
    expiredAt: '',
    createdAt: ts,
    updatedAt: ts,
    operator: 'admin',
    creator: 'admin',
  }
  productBomState.boms.unshift(record)
  return record
}

export function enableProductBom(id, { upgradeParentRefs = false, parentRefs = [] } = {}) {
  const row = productBomState.boms.find((b) => b.id === id)
  if (!row) return { error: '记录不存在' }
  if (!isBomPending(row)) return { error: '仅待发布状态可审核发布' }

  const ts = nowStr()
  archiveActiveForItem(row.itemType, row.itemId, row.id)
  productBomState.boms.forEach((b) => {
    if (b.itemType === row.itemType && b.itemId === row.itemId) {
      b.isDefault = b.id === row.id
    }
  })
  row.status = BOM_STATUS.ACTIVE
  row.isDefault = true
  row.effectiveAt = row.effectiveAt || ts
  row.expiredAt = ''
  row.updatedAt = ts

  if (upgradeParentRefs && parentRefs.length) {
    upgradeParentBomReferences(row, parentRefs)
  }

  return row
}

export function archiveProductBom(id) {
  const row = productBomState.boms.find((b) => b.id === id)
  if (!row) return false
  if (isBomArchived(row)) return true
  const ts = nowStr()
  row.status = BOM_STATUS.ARCHIVED
  row.isDefault = false
  row.expiredAt = ts
  row.updatedAt = ts
  return true
}

export function deleteProductBom(id) {
  const idx = productBomState.boms.findIndex((b) => b.id === id)
  if (idx === -1) return false
  const row = productBomState.boms[idx]
  if (isBomActive(row)) {
    return { error: '生效中的 BOM 不可删除，请先归档' }
  }
  productBomState.boms.splice(idx, 1)
  return true
}

export function cloneProductBom(id) {
  const source = productBomState.boms.find((b) => b.id === id)
  if (!source) return null
  const ver = buildVersion(source.itemType, source.itemId, `bom-grp-${Date.now()}`)
  const ts = nowStr()
  const cloned = {
    ...JSON.parse(JSON.stringify(ensureBomStructure(source))),
    id: `bom-${Date.now()}`,
    versionGroupId: `bom-grp-${Date.now()}`,
    bomNo: generateBomNo(),
    bomName: `${source.bomName}-克隆`,
    ...ver,
    status: BOM_STATUS.PENDING,
    isDefault: false,
    effectiveAt: '',
    expiredAt: '',
    createdAt: ts,
    updatedAt: ts,
    operator: 'admin',
    creator: 'admin',
  }
  productBomState.boms.unshift(cloned)
  return cloned
}

export function batchArchiveProductBom(ids) {
  let count = 0
  ids.forEach((id) => {
    const row = productBomState.boms.find((b) => b.id === id)
    if (!row || isBomArchived(row)) return
    if (archiveProductBom(id)) count += 1
  })
  return count
}

export function batchEnableProductBom(ids) {
  let ok = 0
  const errors = []
  ids.forEach((id) => {
    const row = productBomState.boms.find((b) => b.id === id)
    if (!row || !isBomPending(row)) return
    const res = enableProductBom(id)
    if (res?.error) errors.push(`${row.bomNo}: ${res.error}`)
    else ok += 1
  })
  return { ok, errors }
}
