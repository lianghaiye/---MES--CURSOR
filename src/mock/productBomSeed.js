import dayjs from 'dayjs'
import { importTemplateChildren } from '@/mock/bomTemplates'
import { createRootTreeNode, ROOT_ID } from '@/utils/bomTree'
import { formatBomVersion, getBomVersionYear } from '@/utils/bomVersion'

let cachedTemplate = null

function getBaseTemplate() {
  if (!cachedTemplate) {
    cachedTemplate = importTemplateChildren('isg50-standard')
  }
  return cachedTemplate
}

/** 为单个产品克隆模板结构（确定性 ID，避免 793 次随机） */
function cloneTemplateForProduct(template, product, index) {
  const pfx = String(index).padStart(5, '0')
  const root = createRootTreeNode({
    itemCode: product.code,
    itemName: product.name,
    specModel: product.specModel || '',
    bomName: `${product.name} BOM`,
  })
  const rootId = `root-${product.id}`
  root.id = rootId

  const idMap = new Map([
    ['__ROOT__', rootId],
    [ROOT_ID, rootId],
  ])
  template.treeNodes.forEach((n, i) => {
    idMap.set(n.id, `node-${pfx}-${i}`)
  })

  const childNodes = template.treeNodes.map((n) => ({
    ...n,
    id: idMap.get(n.id),
    parentId: n.parentId === '__ROOT__' ? rootId : idMap.get(n.parentId) || rootId,
    isRoot: false,
  }))

  const lineItems = template.lineItems.map((line, i) => {
    const lineId = `line-${pfx}-${i}`
    const parentTreeId =
      line.parentTreeId === '__ROOT__' ? rootId : idMap.get(line.parentTreeId) || rootId
    const treeNodeId = line.treeNodeId ? idMap.get(line.treeNodeId) || '' : ''
    return {
      ...line,
      id: lineId,
      parentTreeId,
      treeNodeId,
    }
  })

  childNodes.forEach((n) => {
    const line = lineItems.find((l) => l.treeNodeId === n.id)
    if (line) n.lineId = line.id
  })

  return {
    treeNodes: [root, ...childNodes],
    lineItems,
  }
}

export function isCatalogSeedBom(bom) {
  return bom?.seedSource === 'catalog' || String(bom?.id || '').startsWith('bom-catalog-')
}

/** 按需为目录种子 BOM 填充树结构（内存中，不写入 localStorage） */
export function hydrateCatalogBom(bom, products) {
  if (!bom || !isCatalogSeedBom(bom)) return bom
  if (bom.treeNodes?.length && bom.lineItems?.length) return bom

  const template = getBaseTemplate()
  if (!template) return bom

  const list = products || []
  const index = list.findIndex((p) => p.id === bom.itemId)
  const product =
    index >= 0
      ? list[index]
      : {
          id: bom.itemId,
          code: bom.itemCode,
          name: bom.itemName,
          specModel: bom.specModel || '',
        }

  const { treeNodes, lineItems } = cloneTemplateForProduct(
    template,
    product,
    index >= 0 ? index : 0,
  )
  bom.treeNodes = treeNodes
  bom.lineItems = lineItems
  return bom
}

/**
 * 为产品库中每个产品生成一条「使用中」的产品 BOM 元数据（树结构按需 hydrate）
 * @param {Array} products mockProducts / productInfoState.products
 */
export function buildCatalogProductBoms(products) {
  const year = getBomVersionYear()
  const version = formatBomVersion(year, 1)
  const ts = dayjs().format('YYYY-MM-DD HH:mm')

  return products.map((product, index) => {
    const created = dayjs('2026-01-01').add(index % 90, 'day')

    return {
      id: `bom-catalog-${product.id}`,
      versionGroupId: `bom-grp-${product.id}`,
      bomNo: `BOM${String(100000 + index).slice(-6)}`,
      bomName: `${product.name} BOM`,
      itemType: 'product',
      itemId: product.id,
      itemName: product.name,
      itemCode: product.code,
      version,
      versionYear: year,
      versionSub: 1,
      status: '使用中',
      isDefault: true,
      effectiveAt: created.add(1, 'day').format('YYYY-MM-DD HH:mm'),
      expiredAt: '',
      operator: 'admin',
      creator: 'admin',
      createdAt: created.format('YYYY-MM-DD HH:mm'),
      updatedAt: ts,
      remark: '',
      matchingRequirements: '',
      techParams: '',
      processRoute: product.production?.defaultProcessRoute || '',
      bomType: '基础BOM',
      specModel: product.specModel || '',
      material: product.material || '',
      drawingNo: product.drawingNo || '',
      seedSource: 'catalog',
      catalogTemplateKey: 'isg50-standard',
      treeNodes: [],
      lineItems: [],
      templateRef: {
        bomId: `bom-catalog-${product.id}`,
        bomNo: `BOM${String(100000 + index).slice(-6)}`,
        version,
        effectiveAt: ts,
      },
      columnSettings: [],
    }
  })
}

export function catalogBomIdForProduct(productId) {
  return `bom-catalog-${productId}`
}
