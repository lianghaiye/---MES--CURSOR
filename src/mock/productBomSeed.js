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
    bomType: '产品BOM',
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
export function buildPagedMockBoms(products = mockProducts, materials = mockMaterials) {
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

/** Mock：为首个产品 BOM 注入 2 条父级引用，用于审核发布时父级同步提醒演示 */
export function injectBomParentReferenceMocks(boms) {
  if (!Array.isArray(boms) || boms.some((b) => b._mockParentRefsInjected)) return boms

  const childBom = boms.find(
    (b) =>
      b.itemType === 'product' &&
      b.itemId === 'prod-00001' &&
      b.status === BOM_STATUS.ACTIVE &&
      b.lineItems?.length,
  )
  if (!childBom) return boms

  const parentSpecs = [
    { itemId: 'prod-00002', label: '立式多级离心泵' },
    { itemId: 'prod-00003', label: '井用潜水泵' },
  ]

  parentSpecs.forEach((spec) => {
    const parent = boms.find(
      (b) =>
        b.itemType === 'product' &&
        b.itemId === spec.itemId &&
        b.status === BOM_STATUS.ACTIVE &&
        b.lineItems?.length,
    )
    if (!parent) return
    if (parent.lineItems.some((line) => line.childBomId === childBom.id)) return

    const rootId = parent.treeNodes?.[0]?.id
    if (!rootId) return

    const { refNode } = appendBomRefWithChildren(parent, rootId, childBom, {
      remark: 'Mock 父级引用（升版同步演示）',
      subordinateCount: 2,
    })
    if (!refNode) return
    parent.updatedAt = dayjs().format('YYYY-MM-DD HH:mm')
    parent._mockParentRefsInjected = true
  })

  childBom._mockParentRefsInjected = true
  return boms
}

/**
 * 在母件根下挂子件 BOM 引用，并可选展开若干下级物料行（便于验证「仅保留本级，移除下级」）
 */
function appendBomRefWithChildren(parent, rootId, childBom, options = {}) {
  const { remark = 'Mock 子件 BOM 引用', subordinateCount = 2 } = options
  if (!parent?.lineItems || !rootId || !childBom) return {}

  const refLine = createBomLineItem({
    parentTreeId: rootId,
    materialCode: childBom.itemCode,
    itemName: childBom.itemName,
    specModel: childBom.specModel || '',
    categoryName: '部件',
    materialType: '零部件',
    supplyForm: '自制件',
    unitQty: 1,
    unit: '件',
    childBom: childBom.bomName,
    childBomVersion: childBom.version,
    childBomId: childBom.id,
    referencedItemId: childBom.itemId,
    referencedItemType: childBom.itemType,
    remark,
  })

  const refNode = createBomTreeNode({
    parentId: rootId,
    title: `${childBom.itemCode} ${childBom.itemName}`,
    quantity: 1,
    nodeType: 'bom-ref',
    lineId: refLine.id,
    materialCode: childBom.itemCode,
  })
  refLine.treeNodeId = refNode.id

  parent.treeNodes.push(refNode)
  parent.lineItems.push(refLine)

  const childRootId = childBom.treeNodes?.find((n) => n.isRoot)?.id || childBom.treeNodes?.[0]?.id
  const childLines = (childBom.lineItems || []).filter((l) => l.parentTreeId === childRootId)
  const pick = childLines.slice(0, subordinateCount)
  if (!pick.length) {
    const mats = pickChildMaterials(mockMaterials, childBom.itemCode, 3, subordinateCount)
    mats.forEach((mat) => appendChildMaterial(parent.treeNodes, parent.lineItems, refNode.id, mat))
  } else {
    pick.forEach((src) => {
      appendChildMaterial(
        parent.treeNodes,
        parent.lineItems,
        refNode.id,
        {
          code: src.materialCode,
          name: src.itemName,
          specModel: src.specModel,
          categoryName: src.categoryName,
          materialType: src.materialType,
          supplyForm: src.supplyForm || '外购件',
          material: src.material,
          drawingNo: src.drawingNo,
          inventoryUnit: src.unit,
          unitPrice: src.unitPrice,
        },
        Number(src.unitQty) || 1,
      )
    })
  }

  return { refNode, refLine }
}

/**
 * 归档验证专用：独立子件 BOM + 两份母件 BOM（名称带「归档演示」）
 * 列表筛 BOM 名称「归档演示」即可找到；归档子件时会弹出母件处理窗。
 */
export function injectBomArchiveDemoMocks(boms) {
  if (!Array.isArray(boms)) return boms
  if (boms.some((b) => b.id === 'bom-demo-archive-child')) return boms

  const year = getBomVersionYear()
  const version = formatBomVersion(year, 1)
  const ts = dayjs().format('YYYY-MM-DD HH:mm')

  const childItem = {
    id: 'prod-archive-child',
    code: 'ZJ-ARCHIVE-001',
    name: '[归档演示]泵体组件',
    specModel: 'BT-DEMO-A',
    material: 'HT250',
    drawingNo: 'TZ-ARCHIVE-C',
  }
  const childMats = pickChildMaterials(mockMaterials, childItem.code, 10, 4)
  const childSubMap = {}
  if (childMats.length > 1) {
    childSubMap[0] = pickChildMaterials(mockMaterials, childMats[0].code, 20, 2)
  }
  const childStructure = buildBomStructureForItem(childItem, childMats, childSubMap)
  const childBom = {
    id: 'bom-demo-archive-child',
    versionGroupId: 'bom-grp-demo-archive-child',
    bomNo: 'BOM-ARCHIVE-C01',
    bomName: '[归档演示]泵体组件 BOM',
    itemType: 'product',
    itemId: childItem.id,
    itemName: childItem.name,
    itemCode: childItem.code,
    version,
    versionYear: year,
    versionSub: 1,
    status: BOM_STATUS.ACTIVE,
    isDefault: true,
    effectiveAt: ts,
    expiredAt: '',
    operator: 'admin',
    creator: 'admin',
    createdAt: ts,
    updatedAt: ts,
    remark: '用于验证：归档子件 BOM 时处理母件引用',
    matchingRequirements: '',
    techParams: '',
    processRoute: '',
    bomType: '产品BOM',
    specModel: childItem.specModel,
    material: childItem.material,
    drawingNo: childItem.drawingNo,
    seedSource: 'archive-demo',
    treeNodes: childStructure.treeNodes,
    lineItems: childStructure.lineItems,
    templateRef: null,
    columnSettings: [],
    _mockArchiveDemo: true,
  }

  const parentDefs = [
    {
      id: 'bom-demo-archive-parent-a',
      itemId: 'prod-archive-parent-a',
      code: 'ZJ-ARCHIVE-P01',
      name: '[归档演示]母件整机-甲',
      bomNo: 'BOM-ARCHIVE-P01',
      bomName: '[归档演示]母件整机-甲 BOM',
    },
    {
      id: 'bom-demo-archive-parent-b',
      itemId: 'prod-archive-parent-b',
      code: 'ZJ-ARCHIVE-P02',
      name: '[归档演示]母件整机-乙',
      bomNo: 'BOM-ARCHIVE-P02',
      bomName: '[归档演示]母件整机-乙 BOM',
    },
    {
      id: 'bom-demo-archive-parent-c',
      itemId: 'prod-archive-parent-c',
      code: 'ZJ-ARCHIVE-P03',
      name: '[归档演示]母件整机-丙',
      bomNo: 'BOM-ARCHIVE-P03',
      bomName: '[归档演示]母件整机-丙 BOM',
    },
  ]

  const parents = parentDefs.map((def, idx) => {
    const item = {
      id: def.itemId,
      code: def.code,
      name: def.name,
      specModel: `PJ-DEMO-${idx + 1}`,
      drawingNo: `TZ-ARCHIVE-P${idx + 1}`,
    }
    const ownMats = pickChildMaterials(mockMaterials, item.code, 30 + idx * 5, 2)
    const structure = buildBomStructureForItem(item, ownMats)
    const parent = {
      id: def.id,
      versionGroupId: `bom-grp-${def.id}`,
      bomNo: def.bomNo,
      bomName: def.bomName,
      itemType: 'product',
      itemId: item.id,
      itemName: item.name,
      itemCode: item.code,
      version,
      versionYear: year,
      versionSub: 1,
      status: BOM_STATUS.ACTIVE,
      isDefault: true,
      effectiveAt: ts,
      expiredAt: '',
      operator: 'admin',
      creator: 'admin',
      createdAt: ts,
      updatedAt: ts,
      remark: '引用 [归档演示]泵体组件 BOM，可验证归档弹窗两种处理',
      matchingRequirements: '',
      techParams: '',
      processRoute: '',
      bomType: '产品BOM',
      specModel: item.specModel,
      material: '',
      drawingNo: item.drawingNo,
      seedSource: 'archive-demo',
      treeNodes: structure.treeNodes,
      lineItems: structure.lineItems,
      templateRef: null,
      columnSettings: [],
      _mockArchiveDemo: true,
    }
    const rootId = parent.treeNodes?.[0]?.id
    appendBomRefWithChildren(parent, rootId, childBom, {
      remark: '归档演示：子件 BOM 引用（含展开下级）',
      subordinateCount: 2,
    })
    return parent
  })

  // 插到列表前部，方便在第一页看到
  boms.unshift(...parents, childBom)
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
