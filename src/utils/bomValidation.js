import { getRootTreeId, isRootNode } from '@/utils/bomTree'
import { resolveBomNodeItemInfo } from '@/utils/bomTreeDisplay'

function normalizeCode(code) {
  return String(code || '').trim()
}

/** 解析父节点的物品编码 */
export function resolveParentItemCode(parentTreeId, flatNodes, lineItems, rootForm = {}) {
  const rootId = getRootTreeId(flatNodes)
  const pid = !parentTreeId || isRootNode(parentTreeId, flatNodes) ? rootId : parentTreeId
  const node = flatNodes.find((n) => n.id === pid)
  if (!node) return ''
  if (node.isRoot) return normalizeCode(rootForm.itemCode)
  const info = resolveBomNodeItemInfo(node, lineItems, rootForm)
  return normalizeCode(info?.itemCode)
}

export function isSameBomItem(parentCode, childCode) {
  const parent = normalizeCode(parentCode)
  const child = normalizeCode(childCode)
  return Boolean(parent && child && parent === child)
}

/** 校验：父项与子项不能为同一物品 */
export function validateParentChildNotSame(
  parentTreeId,
  childCode,
  flatNodes,
  lineItems,
  rootForm = {},
) {
  const parentCode = resolveParentItemCode(parentTreeId, flatNodes, lineItems, rootForm)
  if (isSameBomItem(parentCode, childCode)) {
    return { ok: false, message: '父项产品与子项产品不能相同' }
  }
  return { ok: true }
}

/** 保存前批量校验所有明细行 */
export function validateAllBomParentChildLines(lineItems, flatNodes, rootForm = {}) {
  for (const line of lineItems) {
    if (!line.materialCode) continue
    const result = validateParentChildNotSame(
      line.parentTreeId,
      line.materialCode,
      flatNodes,
      lineItems,
      rootForm,
    )
    if (!result.ok) return result
  }
  return { ok: true }
}
