import { productInfoState } from '@/store/productInfoStore'
import { materialInfoState } from '@/store/materialInfoStore'
import { formatBomInfoLabel } from '@/utils/itemBomInfo'

/** 产品 BOM 选择 / 模板导入 共用列表列 */
export const BOM_PICKER_TABLE_COLUMNS = [
  { title: 'BOM状态', key: 'status', width: 88 },
  { title: 'BOM编号', dataIndex: 'bomNo', width: 120, ellipsis: true },
  { title: 'BOM名称', dataIndex: 'bomName', width: 140, ellipsis: true },
  { title: '产品名称', dataIndex: 'productName', width: 140, ellipsis: true },
  { title: '规格型号', dataIndex: 'specModel', width: 100, ellipsis: true },
  { title: '材质', dataIndex: 'material', width: 80, ellipsis: true },
  { title: '图号', dataIndex: 'drawingNo', width: 100, ellipsis: true },
  { title: 'BOM版本', dataIndex: 'version', width: 90 },
  { title: '生效日期', dataIndex: 'effectiveAt', width: 150 },
  { title: '创建人', dataIndex: 'creatorName', width: 88 },
]

export function createEmptyBomPickerFilters() {
  return {
    bomNo: '',
    bomName: '',
    productName: '',
    specModel: '',
    drawingNo: '',
  }
}

function normalizeName(value) {
  return String(value || '')
    .trim()
    .toLowerCase()
}

export function resolveBomLinkedMaster(bom) {
  if (!bom) return null
  if (bom.itemType === 'product') {
    return (
      productInfoState.products.find((p) => String(p.id) === String(bom.itemId)) ||
      productInfoState.products.find((p) => normalizeName(p.name) === normalizeName(bom.itemName))
    )
  }
  if (bom.itemType === 'material') {
    return (
      materialInfoState.materials.find((m) => String(m.id) === String(bom.itemId)) ||
      materialInfoState.materials.find((m) => normalizeName(m.name) === normalizeName(bom.itemName))
    )
  }
  return null
}

export function enrichBomPickerRow(bom) {
  const master = resolveBomLinkedMaster(bom)
  return {
    ...bom,
    productName: master?.name || bom.itemName || '',
    specModel: bom.specModel || master?.specModel || '',
    material: bom.material || master?.material || '',
    drawingNo: bom.drawingNo || master?.drawingNo || '',
    creatorName: bom.creator || bom.operator || '—',
    pickerLabel: formatBomInfoLabel(bom),
  }
}

export function filterBomPickerRows(rows, filters, options = {}) {
  const f = filters || {}
  const productId = options.productId
  return rows.filter((raw) => {
    const row = enrichBomPickerRow(raw)
    if (productId && String(raw.itemId) !== String(productId)) return false
    if (f.bomNo && !String(row.bomNo || '').includes(f.bomNo.trim())) return false
    if (f.bomName && !String(row.bomName || '').includes(f.bomName.trim())) return false
    if (f.productName && !String(row.productName || '').includes(f.productName.trim())) return false
    if (f.specModel && !String(row.specModel || '').includes(f.specModel.trim())) return false
    if (f.drawingNo && !String(row.drawingNo || '').includes(f.drawingNo.trim())) return false
    return true
  })
}
