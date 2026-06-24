import dayjs from 'dayjs'
import { mockProducts } from '@/mock/productInfo'
import { mockMaterials } from '@/mock/materialInfo'
import { createBomLineItem, createBomTreeNode } from '@/mock/bomTemplates'
import { createRootTreeNode } from '@/utils/bomTree'
import { formatBomVersion, getBomVersionYear } from '@/utils/bomVersion'
import { BOM_STATUS } from '@/mock/productBomOptions'

const PAGE_SIZE = 10
const PAGE_COUNT = 2

/** 旧版目录种子（lazy hydrate），新版 paged-mock 已内嵌完整树 */
export function isCatalogSeedBom(bom) {
  return bom?.seedSource === 'catalog' || String(bom?.id || '').startsWith('bom-catalog-')
}

function isPagedMockBom(bom) {
  return bom?.seedSource === 'paged-mock' || String(bom?.id || '').startsWith('bom-seed-')
}

function pickPagedItems(list) {
  return list.slice(0, PAGE_SIZE * PAGE_COUNT)
}

function pickChildMaterials(allMaterials, parentCode, startIndex, count) {
  const picked = []
  let i = startIndex
  const max = allMaterials.length
  while (picked.length < count && i < startIndex + max * 2) {
    const mat = allMaterials[i % max]
    i += 1
    if (!mat || mat.code === parentCode) continue
    if (picked.some((p) => p.code === mat.code)) continue
    picked.push(mat)
  }
  return picked
}

/** 在 parentTreeId 下添加子项：树节点 + 物料行一一对应 */
function appendChildMaterial(flatNodes, lineItems, parentTreeId, material, unitQty = 1) {
  const line = createBomLineItem({
    parentTreeId,
    treeNodeId: '',
    materialCode: material.code,
    itemName: material.name,
    specModel: material.specModel || '',
    categoryName: material.categoryName || '零件',
    materialType: material.materialType || '零部件',
    supplyForm: material.supplyForm || '外购件',
    material: material.material || '',
    drawingNo: material.drawingNo || '',
    unit: material.inventoryUnit || '件',
    unitQty,
    unitPrice: material.unitPrice || 0,
  })

  const node = createBomTreeNode({
    parentId: parentTreeId,
    title: `${material.code} ${material.name}`,
    quantity: unitQty,
    nodeType: 'material',
    lineId: line.id,
    materialCode: material.code,
  })
  line.treeNodeId = node.id

  flatNodes.push(node)
  lineItems.push(line)
  return { node, line }
}

/**
 * 构建与树层级一致的 BOM 结构：
 * - 选中父节点时，物料清单仅展示 parentTreeId 对应该节点的直属行
 * - 每个树子节点均有对应物料行（treeNodeId 关联）
 */
export function buildBomStructureForItem(item, childMaterials, subMap = {}) {
  const root = createRootTreeNode({
    itemCode: item.code,
    itemName: item.name,
    specModel: item.specModel || '',
    bomName: `${item.name} BOM`,
  })
  const rootId = root.id
  const flatNodes = [root]
  const lineItems = []

  childMaterials.forEach((mat, idx) => {
    const { node } = appendChildMaterial(flatNodes, lineItems, rootId, mat)
    const subs = subMap[idx] || []
    subs.forEach((sub) => appendChildMaterial(flatNodes, lineItems, node.id, sub))
  })

  return { treeNodes: flatNodes, lineItems }
}

function createBomMeta(item, itemType, index, structure) {
  const year = getBomVersionYear()
  const version = formatBomVersion(year, 1)
  const created = dayjs('2026-01-01').add(index % 60, 'day')
  const ts = dayjs().format('YYYY-MM-DD HH:mm')
  const idPrefix = itemType === 'product' ? 'prod' : 'mat'

  return {
    id: `bom-seed-${idPrefix}-${item.id}`,
    versionGroupId: `bom-grp-seed-${itemType}-${item.id}`,
    bomNo: `BOM${String(200000 + index).slice(-6)}`,
    bomName: `${item.name} BOM`,
    itemType,
    itemId: item.id,
    itemName: item.name,
    itemCode: item.code,
    version,
    versionYear: year,
    versionSub: 1,
    status: BOM_STATUS.ACTIVE,
    isDefault: true,
    effectiveAt: created.add(1, 'day').format('YYYY-MM-DD HH:mm'),
    expiredAt: '',
    operator: 'admin',
    creator: 'admin',
    createdAt: created.format('YYYY-MM-DD HH:mm'),
    updatedAt: ts,
    remark: '',
    matchingRequirements: '',
    techParams: item.techParams || '',
    processRoute: item.production?.defaultProcessRoute || '',
    bomType: '基准BOM',
    specModel: item.specModel || '',
    material: item.material || '',
    drawingNo: item.drawingNo || '',
    seedSource: 'paged-mock',
    treeNodes: structure.treeNodes,
    lineItems: structure.lineItems,
    templateRef: null,
    columnSettings: [],
  }
}

/**
 * 为产品/物料列表前两页（各 20 条）生成结构一致的生效 BOM
 */
export function buildPagedMockBoms(
  products = mockProducts,
  materials = mockMaterials,
) {
  const pagedProducts = pickPagedItems(products)
  const pagedMaterials = pickPagedItems(materials)
  const allMaterials = materials
  const boms = []
  let seq = 0

  pagedProducts.forEach((product, pIdx) => {
    const childCount = 3 + (pIdx % 3)
    const children = pickChildMaterials(allMaterials, product.code, pIdx * 4, childCount)
    const subMap = {}
    if (children.length > 0) {
      const subs = pickChildMaterials(allMaterials, children[0].code, pIdx * 4 + childCount, 2)
      if (subs.length) subMap[0] = subs
    }
    if (children.length > 1 && pIdx % 2 === 0) {
      const subs = pickChildMaterials(allMaterials, children[1].code, pIdx * 4 + childCount + 2, 1)
      if (subs.length) subMap[1] = subs
    }

    const structure = buildBomStructureForItem(product, children, subMap)
    boms.push(createBomMeta(product, 'product', seq, structure))
    seq += 1
  })

  pagedMaterials.forEach((material, mIdx) => {
    const childCount = 2 + (mIdx % 2)
    const children = pickChildMaterials(allMaterials, material.code, 80 + mIdx * 3, childCount)
    const structure = buildBomStructureForItem(material, children)
    boms.push(createBomMeta(material, 'material', seq, structure))
    seq += 1
  })

  return boms
}

/** @deprecated 使用 buildPagedMockBoms */
export function buildCatalogProductBoms(products) {
  return buildPagedMockBoms(products, mockMaterials)
}

/** 按需为旧 catalog 种子填充树（兼容历史数据） */
export function hydrateCatalogBom(bom, products) {
  if (!bom) return bom
  if (isPagedMockBom(bom)) return bom
  if (!isCatalogSeedBom(bom)) return bom
  if (bom.treeNodes?.length && bom.lineItems?.length) return bom

  const list = products || mockProducts
  const product = list.find((p) => p.id === bom.itemId) || {
    id: bom.itemId,
    code: bom.itemCode,
    name: bom.itemName,
    specModel: bom.specModel || '',
  }
  const children = pickChildMaterials(mockMaterials, product.code, 0, 4)
  const structure = buildBomStructureForItem(product, children)
  bom.treeNodes = structure.treeNodes
  bom.lineItems = structure.lineItems
  return bom
}

export function catalogBomIdForProduct(productId) {
  return `bom-seed-prod-${productId}`
}
