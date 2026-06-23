import { isCatalogSeedBom } from '@/mock/productBomSeed'
import { bomTemplateCatalog } from '@/mock/bomTemplates'

const catalogMetricsCache = new Map()

/** 计算 BOM 树最大层级（含根节点为第 1 层） */
export function calcBomLevelCount(treeNodes = []) {
  if (!treeNodes?.length) return 0

  const root = treeNodes.find((n) => n.isRoot)
  const startNodes = root
    ? [root]
    : treeNodes.filter((n) => n.parentId === '__ROOT__' || n.parentId === 'bom-root')

  if (!startNodes.length) return treeNodes.length ? 1 : 0

  function maxDepth(nodeId, currentDepth) {
    const children = treeNodes.filter(
      (n) => n.parentId === nodeId && n.id !== nodeId && !n.isRoot,
    )
    if (!children.length) return currentDepth
    return Math.max(...children.map((child) => maxDepth(child.id, currentDepth + 1)))
  }

  return Math.max(...startNodes.map((node) => maxDepth(node.id, 1)))
}

/** BOM 物料数：以物料明细行数为准 */
export function calcBomMaterialCount(lineItems = []) {
  return lineItems?.length || 0
}

function getCatalogTemplateMetrics(templateKey = 'isg50-standard') {
  if (catalogMetricsCache.has(templateKey)) {
    return catalogMetricsCache.get(templateKey)
  }
  const tpl = bomTemplateCatalog.find((t) => t.templateKey === templateKey)
  const raw = tpl?.buildChildren?.()
  if (!raw) {
    const empty = { levelCount: 0, materialCount: 0 }
    catalogMetricsCache.set(templateKey, empty)
    return empty
  }
  const metrics = {
    levelCount: calcBomLevelCount(raw.treeNodes) + 1,
    materialCount: calcBomMaterialCount(raw.lineItems),
  }
  catalogMetricsCache.set(templateKey, metrics)
  return metrics
}

export function buildMasterLookup(products = [], materials = []) {
  const map = new Map()
  products.forEach((p) => map.set(`product:${p.id}`, p))
  materials.forEach((m) => map.set(`material:${m.id}`, m))
  return map
}

function resolveMasterField(bom, master, bomField, masterField) {
  const fromBom = bom?.[bomField]
  if (fromBom !== undefined && fromBom !== null && String(fromBom).trim() !== '') {
    return fromBom
  }
  const fromMaster = master?.[masterField ?? bomField]
  if (fromMaster !== undefined && fromMaster !== null && String(fromMaster).trim() !== '') {
    return fromMaster
  }
  return ''
}

function resolveBomStructureMetrics(bom) {
  if (bom.treeNodes?.length || bom.lineItems?.length) {
    return {
      levelCount: calcBomLevelCount(bom.treeNodes),
      materialCount: calcBomMaterialCount(bom.lineItems),
    }
  }
  if (isCatalogSeedBom(bom)) {
    return getCatalogTemplateMetrics(bom.catalogTemplateKey || 'isg50-standard')
  }
  return {
    levelCount: bom.levelCount ?? 0,
    materialCount: bom.materialCount ?? 0,
  }
}

/** 列表展示字段补全：规格型号、材质、图号、层级数、物料数、备注 */
export function enrichProductBomForList(bom, masterLookup) {
  const master = masterLookup?.get(`${bom.itemType}:${bom.itemId}`)
  const { levelCount, materialCount } = resolveBomStructureMetrics(bom)

  return {
    ...bom,
    specModel: resolveMasterField(bom, master, 'specModel'),
    material: resolveMasterField(bom, master, 'material'),
    drawingNo: resolveMasterField(bom, master, 'drawingNo'),
    levelCount,
    materialCount,
    matchingRequirements: bom.matchingRequirements || bom.remark || '',
    remark: bom.matchingRequirements || bom.remark || '',
  }
}

export function enrichProductBomList(boms, masterLookup) {
  return boms.map((bom) => enrichProductBomForList(bom, masterLookup))
}
