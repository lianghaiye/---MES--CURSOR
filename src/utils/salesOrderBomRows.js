import { mockProducts } from '@/mock/productInfo'
import { ebomSnapshotStatusColor, resolveEbomSnapshotStatus } from '@/constants/ebom'
import {
  getActiveBomForItem,
  getProductBomById,
} from '@/store/productBomStore'
import { buildMasterLookup, enrichProductBomForList } from '@/utils/productBomListEnrich'

const masterLookup = buildMasterLookup(mockProducts, [])

function resolveLineLatestBom(line = {}) {
  if (line.productId) {
    return getActiveBomForItem('product', line.productId)
  }
  if (line.bomId) {
    return getProductBomById(line.bomId)
  }
  return null
}

function displayValue(value) {
  if (value === 0) return 0
  const text = String(value ?? '').trim()
  return text || '—'
}

/** 销售订单详情 — 明细行 EBOM（现行版本取最新产品 BOM） */
export function buildSalesOrderEbomRows(lineItems = []) {
  return lineItems.map((line, index) => {
    const latestBom = resolveLineLatestBom(line)
    const enriched = latestBom ? enrichProductBomForList(latestBom, masterLookup) : null
    const ebomStatus = resolveEbomSnapshotStatus(line)
    const initialVersion = line.bomVersion || line.ebomSnapshot?.bomVersion || ''
    const snapshotAt = line.ebomSnapshot?.snapshotAt || ''

    return {
      id: line.id || `sales-ebom-row-${index}`,
      lineId: line.id,
      index: index + 1,
      ebomStatus,
      ebomStatusColor: ebomSnapshotStatusColor(ebomStatus),
      bomName: displayValue(enriched?.bomName || line.bomName || line.ebomSnapshot?.bomName),
      bomNo: displayValue(enriched?.bomNo || line.ebomSnapshot?.bomNo),
      itemName: displayValue(enriched?.itemName || line.productName),
      specModel: displayValue(enriched?.specModel || line.specModel),
      material: displayValue(enriched?.material || line.material),
      drawingNo: displayValue(enriched?.drawingNo || line.drawingNo),
      initialVersion: displayValue(initialVersion),
      boundVersion: displayValue(enriched?.version || latestBom?.version),
      levelCount: enriched?.levelCount ?? '—',
      materialCount: enriched?.materialCount ?? line.ebomSnapshot?.materials?.length ?? '—',
      snapshotAt: displayValue(snapshotAt),
      bomId: enriched?.id || latestBom?.id || line.bomId || '',
      productId: line.productId || '',
    }
  })
}
