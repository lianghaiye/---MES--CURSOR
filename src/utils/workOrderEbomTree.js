import { productBomState, getActiveBomForItem, getProductBomById } from '@/store/productBomStore'
import { isBomActive } from '@/mock/productBomOptions'
import { productInfoState } from '@/store/productInfoStore'
import { buildEbomSnapshotFromBom } from '@/utils/ebomSnapshot'
import { materialToTreeNode, collectExpandableKeys } from '@/utils/ebomTreeView'

function normalizeName(value) {
  return String(value || '')
    .trim()
    .toLowerCase()
}

function resolveAliasProductName(name) {
  if (!name) return name
  const n = normalizeName(name)
  if (n === '潜水电机' || n.includes('潜水电机')) {
    const dive = productInfoState.products.find((p) => normalizeName(p.name).includes('潜水'))
    if (dive) return dive.name
  }
  if (n === '立式多级泵') {
    const multi = productInfoState.products.find((p) => normalizeName(p.name).includes('立式多级'))
    if (multi) return multi.name
  }
  return name
}

function findProductByName(name) {
  if (!name) return null
  const resolved = resolveAliasProductName(name)
  const n = normalizeName(resolved)
  return (
    productInfoState.products.find(
      (p) =>
        normalizeName(p.name) === n ||
        normalizeName(p.name).includes(n) ||
        n.includes(normalizeName(p.name)),
    ) || null
  )
}

function resolveBomByName(name) {
  if (!name) return null
  const resolved = resolveAliasProductName(name)
  const n = normalizeName(resolved)
  const activeList = productBomState.boms.filter((b) => isBomActive(b))
  const row =
    activeList.find(
      (b) =>
        normalizeName(b.itemName) === n ||
        normalizeName(b.bomName) === n ||
        normalizeName(b.bomName).includes(n) ||
        n.includes(normalizeName(b.itemName)),
    ) || null
  return row ? getProductBomById(row.id) : null
}

function resolveBomByProductId(itemId) {
  if (!itemId) return null
  return getActiveBomForItem('product', itemId)
}

/** 工单保存时绑定的 BOM（优先 bomId，避免重新匹配到其它 BOM） */
export function resolveWorkOrderLinkedBom(workOrder, variant = 'production') {
  if (!workOrder) return null
  if (workOrder.bomId) {
    const saved = getProductBomById(workOrder.bomId)
    if (saved) return saved
  }
  return resolveWorkOrderParentBom(workOrder, variant)
}

/** 在已展开物料树中查找与工单制品匹配的节点 */
export function findMaterialNodeInTree(materials, workOrder) {
  const productName = normalizeName(workOrder?.productName)
  const materialCode = normalizeName(workOrder?.materialCode)

  function walk(list) {
    for (const mat of list || []) {
      const name = normalizeName(mat.name)
      const code = normalizeName(mat.code)
      const nameHit =
        productName &&
        (name === productName || name.includes(productName) || productName.includes(name))
      const codeHit = materialCode && code && (code === materialCode || code.includes(materialCode))
      if (nameHit || codeHit) return mat
      const childHit = walk(mat.children)
      if (childHit) return childHit
    }
    return null
  }

  return walk(materials)
}

/** 从所有生效 BOM 中反查包含该子件的父级 EBOM */
function resolveParentBomByChildProduct(workOrder) {
  const activeList = productBomState.boms.filter((b) => isBomActive(b))
  for (const bom of activeList) {
    const hydrated = getProductBomById(bom.id)
    if (!hydrated) continue
    const snapshot = buildEbomSnapshotFromBom(hydrated, 1)
    if (findMaterialNodeInTree(snapshot.materials, workOrder)) {
      return hydrated
    }
  }
  return null
}

/**
 * 解析工单关联的父级 EBOM（成品 BOM）
 * - 总装：成品即 productName
 * - 生产：优先 bom 字段指向的成品 BOM
 */
export function resolveWorkOrderParentBom(workOrder, variant = 'production') {
  if (!workOrder) return null

  if (workOrder.bomId) {
    const byId = getProductBomById(workOrder.bomId)
    if (byId) return byId
  }

  if (variant === 'assembly') {
    const product = findProductByName(workOrder.productName)
    if (product) {
      const active = resolveBomByProductId(product.id)
      if (active) return active
    }
    return resolveBomByName(workOrder.productName) || resolveBomByName(workOrder.bom)
  }

  if (workOrder.bom) {
    const product = findProductByName(workOrder.bom)
    if (product) {
      const active = resolveBomByProductId(product.id)
      if (active) return active
    }
    const byBom = resolveBomByName(workOrder.bom)
    if (byBom) return byBom
  }

  const selfProduct = findProductByName(workOrder.productName)
  if (selfProduct) {
    const active = resolveBomByProductId(selfProduct.id)
    if (active) return active
  }

  return resolveParentBomByChildProduct(workOrder) || resolveBomByName(workOrder.productName)
}

/** 工单生产的产品是否为 BOM 顶级父项 */
export function isWorkOrderProductBomRoot(workOrder, bom) {
  if (!workOrder || !bom) return false
  const product = findProductByName(workOrder.productName)
  if (product && bom.itemType === 'product' && String(bom.itemId) === String(product.id)) {
    return true
  }
  const code = workOrder.materialCode || product?.code || ''
  if (code && bom.itemCode && code === bom.itemCode) return true
  return normalizeName(bom.itemName) === normalizeName(workOrder.productName)
}

function buildRootProduct(workOrder, bom, variant) {
  const qty = workOrder.scheduleQty ?? workOrder.planQty ?? 1
  if (variant === 'assembly' || isWorkOrderProductBomRoot(workOrder, bom)) {
    return {
      name: workOrder.productName || bom?.itemName || '—',
      code: workOrder.materialCode || bom?.itemCode || '—',
      qty,
      spec: workOrder.specModel || bom?.specModel || '',
    }
  }
  return {
    name: bom?.itemName || workOrder.bom || workOrder.productName || '—',
    code: bom?.itemCode || '—',
    qty: 1,
    spec: bom?.specModel || '',
  }
}

function packTreeBundle(treeData, bom, bomMetaExtra = {}) {
  return {
    treeData,
    expandedKeys: collectExpandableKeys(treeData),
    bomMeta: bom
      ? {
          bomName: bom.bomName,
          bomVersion: bom.version,
          bomNo: bom.bomNo,
          ...bomMetaExtra,
        }
      : null,
  }
}

const EMPTY = {
  treeData: [],
  expandedKeys: [],
  bomMeta: null,
  rootProduct: null,
  matchedNode: null,
}

function buildFullTreeFromSnapshot(snapshot, workOrder) {
  const bom = snapshot
    ? {
        bomName: snapshot.bomName,
        version: snapshot.bomVersion,
        bomNo: snapshot.bomNo,
        specModel: workOrder?.specModel || '',
      }
    : null
  const rootProduct = {
    name: workOrder?.productName || snapshot?.bomName || '—',
    code: workOrder?.materialCode || '—',
    qty: workOrder?.scheduleQty ?? workOrder?.planQty ?? 1,
    spec: workOrder?.specModel || '',
  }
  const childNodes = (snapshot?.materials || []).map((m) => materialToTreeNode(m))
  const rootNode = materialToTreeNode(
    {
      id: 'ebom-root',
      name: rootProduct.name,
      code: rootProduct.code,
      spec: rootProduct.spec,
      type: '成品',
      unitUsage: rootProduct.qty,
      unit: '台',
      demandQty: rootProduct.qty,
      supplyType: '自制件',
      children: [],
    },
    { isRoot: true },
  )
  rootNode.children = childNodes
  const treeData = [rootNode]
  return {
    ...packTreeBundle(treeData, bom, {
      bomName: snapshot?.bomName,
      bomVersion: snapshot?.bomVersion,
      bomNo: snapshot?.bomNo,
      snapshotAt: snapshot?.snapshotAt,
    }),
    rootProduct,
  }
}

function buildFullTreeFromBom(bom, workOrder, variant = 'production') {
  const rootProduct = buildRootProduct(workOrder, bom, variant)
  const qty =
    variant === 'assembly' || isWorkOrderProductBomRoot(workOrder, bom) ? rootProduct.qty : 1
  const snapshot = buildEbomSnapshotFromBom(bom, qty)
  const childNodes = (snapshot.materials || []).map((m) => materialToTreeNode(m))
  const rootNode = materialToTreeNode(
    {
      id: 'ebom-root',
      name: rootProduct.name,
      code: rootProduct.code,
      spec: rootProduct.spec,
      type: '成品',
      unitUsage: rootProduct.qty,
      unit: '台',
      demandQty: rootProduct.qty,
      supplyType: '自制件',
      children: [],
    },
    { isRoot: true },
  )
  rootNode.children = childNodes
  const treeData = [rootNode]
  return {
    ...packTreeBundle(treeData, bom, {
      bomName: snapshot.bomName || bom.bomName,
      bomVersion: snapshot.bomVersion || bom.version,
      bomNo: snapshot.bomNo || bom.bomNo,
    }),
    rootProduct,
  }
}

/** 完整 EBOM 树（成品根 + 全部子件） */
export function buildWorkOrderEbomTree(workOrder, variant = 'production') {
  if (!workOrder || workOrder.orderCategory === '外协工单' || workOrder.skipEbom) {
    return { ...EMPTY }
  }

  if (workOrder.ebomSnapshot?.materials?.length) {
    return buildFullTreeFromSnapshot(workOrder.ebomSnapshot, workOrder)
  }

  const bom = resolveWorkOrderLinkedBom(workOrder, variant)
  if (!bom) {
    return { ...EMPTY, rootProduct: buildRootProduct(workOrder, null, variant) }
  }

  return buildFullTreeFromBom(bom, workOrder, variant)
}

/** 当前 BOM：顶级物料显示完整 BOM，否则显示制品在父级 EBOM 中的子树 */
export function buildWorkOrderCurrentBomTree(workOrder) {
  if (!workOrder) return { ...EMPTY, hint: '' }

  const bom = resolveWorkOrderLinkedBom(workOrder, 'production')
  if (!bom) {
    return {
      ...EMPTY,
      hint: '未找到关联的产品 BOM',
    }
  }

  if (isWorkOrderProductBomRoot(workOrder, bom)) {
    if (workOrder.ebomSnapshot?.materials?.length) {
      return {
        ...buildFullTreeFromSnapshot(workOrder.ebomSnapshot, workOrder),
        hint: '',
      }
    }
    return {
      ...buildFullTreeFromBom(bom, workOrder, 'production'),
      hint: '',
    }
  }

  const snapshot = buildEbomSnapshotFromBom(bom, 1)
  const matched = findMaterialNodeInTree(snapshot.materials, workOrder)

  if (!matched) {
    return {
      ...EMPTY,
      bomMeta: {
        bomName: snapshot.bomName || bom.bomName,
        bomVersion: snapshot.bomVersion || bom.version,
        bomNo: snapshot.bomNo || bom.bomNo,
        parentProductName: bom.itemName,
      },
      hint: `在「${bom.itemName || bom.bomName}」EBOM 中未定位到制品「${workOrder.productName}」`,
    }
  }

  const treeData = [
    materialToTreeNode(matched, {
      isRoot: true,
      isCurrent: true,
    }),
  ]

  return {
    ...packTreeBundle(treeData, bom, {
      bomName: matched.bom || matched.childBom || `${matched.name} 子件BOM`,
      bomVersion: '',
      bomNo: bom.bomNo,
      parentProductName: bom.itemName,
      currentProductName: workOrder.productName,
    }),
    matchedNode: matched,
    hint: '',
  }
}

/** 下发时冻结 EBOM 快照 */
export function buildWorkOrderDispatchEbomSnapshot(workOrder) {
  if (!workOrder || workOrder.skipEbom || workOrder.orderCategory === '外协工单') return null
  const bom = resolveWorkOrderLinkedBom(workOrder, 'production')
  if (!bom) return null
  const qty = workOrder.scheduleQty ?? workOrder.planQty ?? 1
  return buildEbomSnapshotFromBom(bom, qty)
}
