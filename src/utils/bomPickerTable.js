import { productInfoState } from '@/store/productInfoStore'
import { materialInfoState } from '@/store/materialInfoStore'
import { findSpuById } from '@/store/spuStore'
import { formatBomInfoLabel } from '@/utils/itemBomInfo'
import { normalizeBomType } from '@/mock/bomMaterialColumns'
import { formatBomTypeLabel } from '@/utils/shipAttachmentNav'

/** 产品 BOM 选择 / 模板导入 共用列表列 */
export const BOM_PICKER_TABLE_COLUMNS = [
  { title: 'BOM类型', key: 'bomType', dataIndex: 'bomTypeLabel', width: 110, ellipsis: true },
  { title: 'BOM编号', dataIndex: 'bomNo', width: 120, ellipsis: true },
  { title: 'BOM名称', dataIndex: 'bomName', width: 140, ellipsis: true },
  { title: '产品名称', dataIndex: 'productName', width: 140, ellipsis: true },
  { title: '产品编号', dataIndex: 'productCode', width: 120, ellipsis: true },
  { title: '规格型号', dataIndex: 'specModel', width: 100, ellipsis: true },
  { title: '材质', dataIndex: 'material', width: 80, ellipsis: true },
  { title: '图号', dataIndex: 'drawingNo', width: 100, ellipsis: true },
  { title: 'BOM版本', dataIndex: 'version', width: 90 },
  { title: '生效日期', dataIndex: 'effectiveAt', width: 150 },
  { title: '创建人', dataIndex: 'creatorName', width: 88 },
]

export const BOM_PICKER_CATALOG_KIND_OPTIONS = [
  { label: '产品族', value: 'spu' },
  { label: 'SKU', value: 'sku' },
]

export function createEmptyBomPickerFilters() {
  return {
    bomType: undefined,
    bomNo: '',
    bomName: '',
    catalogKind: undefined,
    productName: '',
    productCode: '',
    specModel: '',
    drawingNo: '',
  }
}

function normalizeName(value) {
  return String(value || '')
    .trim()
    .toLowerCase()
}

/** 基准 BOM 挂产品族；产品 BOM 挂 SKU */
export function resolveBomCatalogKind(bom) {
  if (!bom) return ''
  if (bom.itemType === 'spu') return 'spu'
  if (bom.itemType === 'product') return 'sku'
  return ''
}

export function resolveBomLinkedMaster(bom) {
  if (!bom) return null
  if (bom.itemType === 'spu') {
    return findSpuById(bom.itemId)
  }
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
  const bomTypeLabel = bom.bomType ? formatBomTypeLabel(normalizeBomType(bom.bomType)) : ''
  return {
    ...bom,
    bomTypeLabel,
    productName: master?.name || bom.itemName || '',
    productCode: master?.code || bom.itemCode || '',
    specModel: bom.specModel || master?.specModel || '',
    material: bom.material || master?.material || '',
    drawingNo: bom.drawingNo || master?.drawingNo || '',
    creatorName: bom.creator || bom.operator || '—',
    catalogKind: resolveBomCatalogKind(bom),
    pickerLabel: formatBomInfoLabel(bom),
  }
}

export function filterBomPickerRows(rows, filters, options = {}) {
  const f = filters || {}
  const productId = options.productId
  return rows.filter((raw) => {
    const row = enrichBomPickerRow(raw)
    if (productId && String(raw.itemId) !== String(productId)) return false
    if (f.bomType && normalizeBomType(row.bomType) !== normalizeBomType(f.bomType)) return false
    if (f.bomNo && !String(row.bomNo || '').includes(f.bomNo.trim())) return false
    if (f.bomName && !String(row.bomName || '').includes(f.bomName.trim())) return false
    if (f.catalogKind && row.catalogKind !== f.catalogKind) return false
    if (f.productName && !String(row.productName || '').includes(f.productName.trim())) return false
    if (f.productCode && !String(row.productCode || '').includes(f.productCode.trim())) return false
    if (f.specModel && !String(row.specModel || '').includes(f.specModel.trim())) return false
    if (f.drawingNo && !String(row.drawingNo || '').includes(f.drawingNo.trim())) return false
    return true
  })
}
