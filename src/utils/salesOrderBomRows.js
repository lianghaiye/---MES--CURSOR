import { mockProducts } from '@/mock/productInfo'
import { ebomSnapshotStatusColor, resolveEbomSnapshotStatus } from '@/constants/ebom'
import {
  getActiveBomForItem,
  getProductBomById,
} from '@/store/productBomStore'
import { resolveMaterialsFromEbomSnapshot } from '@/utils/ebomSnapshot'
import { flattenMaterials } from '@/utils/material'
import {
  buildMasterLookup,
  calcBomLevelCount,
  calcBomMaterialCount,
  enrichProductBomForList,
} from '@/utils/productBomListEnrich'

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

function resolveSnapshotMetrics(line = {}) {
  const salesQty = Number(line.salesQty ?? line.orderQty) || 1
  const snapshot = line.ebomSnapshot
  if (!snapshot) return null

  const materials = resolveMaterialsFromEbomSnapshot(snapshot, salesQty)
  if (materials.length) {
    const flat = []
    flattenMaterials(materials, flat)
    const levelCount = snapshot.treeNodes?.length
      ? calcBomLevelCount(snapshot.treeNodes)
      : undefined
    return {
      materialCount: flat.length,
      levelCount,
    }
  }

  if (snapshot.lineItems?.length) {
    return {
      materialCount: calcBomMaterialCount(snapshot.lineItems),
      levelCount: snapshot.treeNodes?.length ? calcBomLevelCount(snapshot.treeNodes) : undefined,
    }
  }

  return null
}

/** 生产计划详情 — 工作项 EBOM（字段口径对齐销售订单明细） */
export function buildProductionPlanEbomRows(workItems = []) {
  const lineLikeItems = workItems.map((wi) => ({
    id: wi.id,
    productId: wi.productId,
    productName: wi.productName,
    productCode: wi.productCode,
    bomId: wi.bomId,
    bomName: wi.bomName,
    bomVersion: wi.bomVersion,
    ebomSnapshot: wi.ebomSnapshot,
    specModel: wi.specModel || wi.model,
    material: wi.material,
    drawingNo: wi.drawingNo,
    salesQty: wi.salesQty ?? wi.orderQty,
    ebomStatus: wi.ebomStatus,
  }))
  return buildSalesOrderEbomRows(lineLikeItems)
}

/** 销售订单详情 — 明细行 EBOM（现行版本取最新产品 BOM） */
export function buildSalesOrderEbomRows(lineItems = []) {
  return lineItems.map((line, index) => {
    const latestBom = resolveLineLatestBom(line)
    const enriched = latestBom ? enrichProductBomForList(latestBom, masterLookup) : null
    const ebomStatus = resolveEbomSnapshotStatus(line)
    const initialVersion = line.bomVersion || line.ebomSnapshot?.bomVersion || ''
    const snapshotAt = line.ebomSnapshot?.snapshotAt || ''
    const snapshotMetrics = resolveSnapshotMetrics(line)

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
      levelCount: enriched?.levelCount ?? snapshotMetrics?.levelCount ?? '—',
      materialCount:
        enriched?.materialCount ?? snapshotMetrics?.materialCount ?? line.ebomSnapshot?.materials?.length ?? '—',
      snapshotAt: displayValue(snapshotAt),
      bomId: enriched?.id || latestBom?.id || line.bomId || '',
      productId: line.productId || '',
    }
  })
}
