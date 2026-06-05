import { productBomState, getActiveBomForItem, getProductBomById } from '@/store/productBomStore'
import { buildEbomSnapshotFromBom } from '@/utils/ebomSnapshot'
import { materialToTreeNode, collectExpandableKeys } from '@/utils/ebomTreeView'

/** 按拆解工单解析当前物品的使用中 BOM */
export function resolveDisassemblyBom(workOrder) {
  if (!workOrder) return null

  if (workOrder.bomId) {
    const byId = getProductBomById(workOrder.bomId)
    if (byId) return byId
  }

  if (workOrder.itemId) {
    const active = getActiveBomForItem('product', workOrder.itemId)
    if (active) return active
  }

  const code = workOrder.itemCode
  const name = workOrder.itemName
  const activeList = productBomState.boms.filter((b) => b.status === '使用中')
  if (code) {
    const byCode = activeList.find((b) => b.itemCode === code)
    if (byCode) return getProductBomById(byCode.id)
  }
  if (name) {
    const byName = activeList.find((b) => b.itemName === name || b.bomName?.includes(name))
    if (byName) return getProductBomById(byName.id)
  }

  return null
}

/** 生成拆解工单 EBOM 树（含根节点与展开键） */
export function buildDisassemblyEbomTree(workOrder) {
  if (!workOrder) {
    return { treeData: [], expandedKeys: [], bomMeta: null, rootProduct: null }
  }

  const bom = resolveDisassemblyBom(workOrder)
  const qty = workOrder.disassemblyQty ?? 1
  const rootProduct = {
    name: workOrder.itemName || '—',
    code: workOrder.itemCode || '—',
    specModel: workOrder.specModel || '—',
    qty,
  }

  if (!bom) {
    return { treeData: [], expandedKeys: [], bomMeta: null, rootProduct }
  }

  const snapshot = buildEbomSnapshotFromBom(bom, qty)
  const childNodes = (snapshot.materials || []).map((m) => materialToTreeNode(m))
  const rootNode = materialToTreeNode(
    {
      id: 'ebom-root',
      name: rootProduct.name,
      code: rootProduct.code,
      spec: rootProduct.specModel,
      type: '成品',
      unitUsage: qty,
      unit: '台',
      demandQty: qty,
      supplyType: '自制件',
      children: [],
    },
    { isRoot: true },
  )
  rootNode.children = childNodes
  const treeData = [rootNode]

  return {
    treeData,
    expandedKeys: collectExpandableKeys(treeData),
    bomMeta: {
      bomName: snapshot.bomName || bom.bomName,
      bomVersion: snapshot.bomVersion || bom.version,
      bomNo: snapshot.bomNo || bom.bomNo,
    },
    rootProduct,
  }
}
