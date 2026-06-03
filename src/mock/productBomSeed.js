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

  const idMap = new Map([['__ROOT__', rootId], [ROOT_ID, rootId]])
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
      line.parentTreeId === '__ROOT__'
        ? rootId
        : idMap.get(line.parentTreeId) || rootId
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

/**
 * 为产品库中每个产品生成一条「使用中」的产品 BOM（唯一对应）
 * @param {Array} products mockProducts / productInfoState.products
 */
export function buildCatalogProductBoms(products) {
  const template = getBaseTemplate()
  if (!template) return []

  const year = getBomVersionYear()
  const version = formatBomVersion(year, 1)
  const ts = dayjs().format('YYYY-MM-DD HH:mm')

  return products.map((product, index) => {
    const { treeNodes, lineItems } = cloneTemplateForProduct(template, product, index)
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
      bomType: '基础BOM',
      specModel: product.specModel || '',
      treeNodes,
      lineItems,
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
