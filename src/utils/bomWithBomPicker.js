import { buildBomSubItemPickerRows } from '@/utils/bomSubItemPicker'
import { getOwnActiveBomForItem } from '@/store/productBomStore'

function resolveStoreItemType(itemType) {
  return itemType === '产品' ? 'product' : 'material'
}

/** 已关联自有生效 BOM 的产品/物料（附带 BOM 名称等信息） */
export function buildBomLinkedPickerRows(options = {}) {
  return buildBomSubItemPickerRows(options)
    .map((row) => {
      const ownBom = getOwnActiveBomForItem(resolveStoreItemType(row.itemType), row.itemId)
      if (!ownBom) return null
      return {
        ...row,
        bomName: ownBom.bomName || '',
        bomNo: ownBom.bomNo || '',
        bomVersion: ownBom.version || '',
      }
    })
    .filter(Boolean)
}

export function findBomLinkedPickerRow(rowKey) {
  return buildBomLinkedPickerRows().find((r) => r.rowKey === rowKey)
}

export function findBomLinkedPickerRowByBom(bom) {
  if (!bom?.itemId) return null
  const itemType = bom.itemType === 'material' ? '物料' : '产品'
  return findBomLinkedPickerRow(`${itemType}-${bom.itemId}`)
}

export function filterBomLinkedPickerRows(rows, keyword) {
  const kw = (keyword || '').trim().toLowerCase()
  if (!kw) return rows
  return rows.filter(
    (r) =>
      String(r.bomName || '')
        .toLowerCase()
        .includes(kw) ||
      String(r.bomNo || '')
        .toLowerCase()
        .includes(kw) ||
      String(r.code || '')
        .toLowerCase()
        .includes(kw) ||
      String(r.name || '')
        .toLowerCase()
        .includes(kw) ||
      String(r.specModel || '')
        .toLowerCase()
        .includes(kw),
  )
}
