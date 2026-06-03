import { reactive, watch } from 'vue'
import dayjs from 'dayjs'
import { mockProductBoms } from '@/mock/productBom'
import { isBomProductionReady } from '@/mock/productBomOptions'
import {
  formatBomVersion,
  getBomVersionYear,
  nextSubVersionForYear,
} from '@/utils/bomVersion'

const STORAGE_KEY = 'i_doms_product_bom'
const DATA_VERSION = 2
let bomNoSeq = 31000

function loadFromStorage() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) {
      const parsed = JSON.parse(raw)
      if (parsed.version === DATA_VERSION && Array.isArray(parsed.boms)) {
        return parsed.boms
      }
    }
  } catch {
    /* ignore */
  }
  return null
}

function persist() {
  localStorage.setItem(
    STORAGE_KEY,
    JSON.stringify({ version: DATA_VERSION, boms: productBomState.boms }),
  )
}

export const productBomState = reactive({
  boms: loadFromStorage() || JSON.parse(JSON.stringify(mockProductBoms)),
})

watch(
  () => productBomState.boms,
  () => persist(),
  { deep: true },
)

export { isBomProductionReady }

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

export function getActiveBomForItem(itemType, itemId) {
  return productBomState.boms.find(
    (b) =>
      b.itemType === itemType &&
      b.itemId === itemId &&
      b.status === '使用中',
  )
}

function archiveActiveForItem(itemType, itemId, exceptId) {
  const ts = nowStr()
  productBomState.boms.forEach((b) => {
    if (
      b.itemType === itemType &&
      b.itemId === itemId &&
      b.id !== exceptId &&
      b.status === '使用中'
    ) {
      b.status = '已归档'
      b.isDefault = false
      b.expiredAt = ts
      b.updatedAt = ts
      b.operator = 'admin'
    }
  })
}

function buildVersion(itemType, itemId, versionGroupId) {
  const year = getBomVersionYear()
  const allVersions = [
    ...versionsForItem(itemType, itemId),
    ...versionsInGroup(versionGroupId),
  ]
  const sub = nextSubVersionForYear(allVersions, year)
  return {
    version: formatBomVersion(year, sub),
    versionYear: year,
    versionSub: sub,
  }
}

export function addProductBom(payload) {
  const ts = nowStr()
  const versionGroupId = payload.versionGroupId || `bom-grp-${Date.now()}`
  const ver = buildVersion(payload.itemType, payload.itemId, versionGroupId)
  const record = {
    id: `bom-${Date.now()}`,
    versionGroupId,
    bomNo: payload.bomNo || generateBomNo(),
    bomName: payload.bomName,
    itemType: payload.itemType,
    itemId: payload.itemId,
    itemName: payload.itemName,
    itemCode: payload.itemCode,
    ...ver,
    status: '待发布',
    isDefault: false,
    effectiveAt: '',
    expiredAt: '',
    operator: 'admin',
    creator: 'admin',
    createdAt: ts,
    updatedAt: ts,
    remark: payload.remark || '',
  }
  productBomState.boms.unshift(record)
  return record
}

export function updateProductBom(id, patch) {
  const idx = productBomState.boms.findIndex((b) => b.id === id)
  if (idx === -1) return null
  const row = productBomState.boms[idx]
  if (row.status !== '待发布') {
    return { error: '仅待发布状态的 BOM 可直接编辑，已生效版本请使用「新版本」升版' }
  }
  Object.assign(row, patch, { updatedAt: nowStr(), operator: 'admin' })
  return row
}

/** 基于当前记录生成次版本+1 的待发布新版本 */
export function createBomNewVersion(sourceId) {
  const source = productBomState.boms.find((b) => b.id === sourceId)
  if (!source) return null
  const ver = buildVersion(source.itemType, source.itemId, source.versionGroupId)
  const ts = nowStr()
  const record = {
    ...JSON.parse(JSON.stringify(source)),
    id: `bom-${Date.now()}`,
    bomNo: generateBomNo(),
    ...ver,
    status: '待发布',
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

/** 审核发布：通过后变为使用中，并保证同物品仅一条生效 */
export function auditPublishBom(id, { approved, asPendingEnable = false } = {}) {
  const row = productBomState.boms.find((b) => b.id === id)
  if (!row) return { error: '记录不存在' }
  if (row.status !== '待发布') return { error: '仅待发布状态可审核发布' }
  if (!approved) {
    row.updatedAt = nowStr()
    return row
  }

  const ts = nowStr()
  if (asPendingEnable) {
    row.status = '待启用'
    row.updatedAt = ts
    row.operator = 'admin'
    return row
  }

  archiveActiveForItem(row.itemType, row.itemId, row.id)
  productBomState.boms.forEach((b) => {
    if (b.itemType === row.itemType && b.itemId === row.itemId) {
      b.isDefault = false
    }
  })
  row.status = '使用中'
  row.isDefault = true
  row.effectiveAt = ts
  row.expiredAt = ''
  row.updatedAt = ts
  row.operator = 'admin'
  return row
}

export function enableProductBom(id) {
  const row = productBomState.boms.find((b) => b.id === id)
  if (!row) return { error: '记录不存在' }
  if (row.status !== '待启用') return { error: '仅待启用状态可启用' }

  const active = getActiveBomForItem(row.itemType, row.itemId)
  if (active && active.id !== row.id) {
    return {
      error: `该物品已有生效 BOM（${active.bomNo}），请先归档后再启用`,
    }
  }

  const ts = nowStr()
  archiveActiveForItem(row.itemType, row.itemId, row.id)
  productBomState.boms.forEach((b) => {
    if (b.itemType === row.itemType && b.itemId === row.itemId) {
      b.isDefault = b.id === row.id
    }
  })
  row.status = '使用中'
  row.isDefault = true
  row.effectiveAt = row.effectiveAt || ts
  row.expiredAt = ''
  row.updatedAt = ts
  return row
}

export function archiveProductBom(id) {
  const row = productBomState.boms.find((b) => b.id === id)
  if (!row) return false
  if (row.status === '已归档') return true
  const ts = nowStr()
  row.status = '已归档'
  row.isDefault = false
  row.expiredAt = ts
  row.updatedAt = ts
  return true
}

export function deleteProductBom(id) {
  const idx = productBomState.boms.findIndex((b) => b.id === id)
  if (idx === -1) return false
  const row = productBomState.boms[idx]
  if (row.status === '使用中') {
    return { error: '使用中的 BOM 不可删除，请先归档' }
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
    ...JSON.parse(JSON.stringify(source)),
    id: `bom-${Date.now()}`,
    versionGroupId: `bom-grp-${Date.now()}`,
    bomNo: generateBomNo(),
    bomName: `${source.bomName}-克隆`,
    ...ver,
    status: '待发布',
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
  ids.forEach((id) => archiveProductBom(id))
}
