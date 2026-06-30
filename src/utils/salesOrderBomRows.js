import { mockProducts } from '@/mock/productInfo'
import {
  getActiveBomForItem,
  getBomsForItem,
  getProductBomById,
} from '@/store/productBomStore'
import { buildMasterLookup, enrichProductBomForList } from '@/utils/productBomListEnrich'

const masterLookup = buildMasterLookup(mockProducts, [])

function resolveLineBoundBom(line = {}) {
  if (line.bomId) {
    const byId = getProductBomById(line.bomId)
    if (byId) return byId
  }

  if (!line.productId) return null

  const boms = getBomsForItem('product', line.productId)
  if (line.bomVersion) {
    const byVersion = boms.find((b) => b.version === line.bomVersion)
    if (byVersion) return byVersion
  }

  return getActiveBomForItem('product', line.productId)
}

function displayValue(value) {
  if (value === 0) return 0
  const text = String(value ?? '').trim()
  return text || '—'
}

/** 销售订单详情 — 明细行关联 BOM 列表 */
export function buildSalesOrderBomRows(lineItems = []) {
  return lineItems.map((line, index) => {
    const bom = resolveLineBoundBom(line)
    const enriched = bom ? enrichProductBomForList(bom, masterLookup) : null

    return {
      id: line.id || `sales-bom-row-${index}`,
      lineId: line.id,
      index: index + 1,
      status: displayValue(enriched?.status),
      bomName: displayValue(enriched?.bomName || line.bomName),
      bomNo: displayValue(enriched?.bomNo),
      itemName: displayValue(enriched?.itemName || line.productName),
      specModel: displayValue(enriched?.specModel || line.specModel),
      material: displayValue(enriched?.material || line.material),
      drawingNo: displayValue(enriched?.drawingNo || line.drawingNo),
      version: displayValue(enriched?.version || line.bomVersion),
      levelCount: enriched?.levelCount ?? '—',
      materialCount: enriched?.materialCount ?? '—',
      effectiveAt: displayValue(enriched?.effectiveAt),
      expiredAt: displayValue(enriched?.expiredAt),
      creator: displayValue(enriched?.creator || enriched?.creatorName),
      bomId: enriched?.id || line.bomId || '',
    }
  })
}
