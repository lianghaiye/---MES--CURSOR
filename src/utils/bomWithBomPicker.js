import { buildBomSubItemPickerRows } from '@/utils/bomSubItemPicker'
import { getActiveBomForItem } from '@/store/productBomStore'

function resolveStoreItemType(itemType) {
  return itemType === '产品' ? 'product' : 'material'
}

/** 已关联使用中 BOM 的产品/物料（附带 BOM 名称等信息） */
export function buildBomLinkedPickerRows() {
  return buildBomSubItemPickerRows()
    .map((row) => {
      const bom = getActiveBomForItem(resolveStoreItemType(row.itemType), row.itemId)
      if (!bom) return null
      return {
        ...row,
        bomName: bom.bomName || '',
        bomNo: bom.bomNo || '',
        bomVersion: bom.version || '',
      }
    })
    .filter(Boolean)
}

export function findBomLinkedPickerRow(rowKey) {
  return buildBomLinkedPickerRows().find((r) => r.rowKey === rowKey)
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
