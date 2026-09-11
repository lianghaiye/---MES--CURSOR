import { flattenCategoryNodes } from '@/mock/materialCategories'

/**
 * 统计各类别下主数据条数（含子节点汇总到父级）。
 * @param {Array} tree
 * @param {string[]} categoryKeys 主数据上的类别 key 列表
 */
export function buildCategoryItemCountMap(tree, categoryKeys = []) {
  const direct = Object.create(null)
  for (const key of categoryKeys) {
    if (!key) continue
    direct[key] = (direct[key] || 0) + 1
  }

  const flat = flattenCategoryNodes(tree || [])
  const byKey = new Map(flat.map((n) => [n.key, n]))
  const total = Object.create(null)

  function subtreeCount(key) {
    if (total[key] != null) return total[key]
    const node = byKey.get(key)
    let sum = direct[key] || 0
    if (node?.children?.length) {
      for (const child of node.children) {
        sum += subtreeCount(child.key)
      }
    }
    total[key] = sum
    return sum
  }

  for (const node of flat) subtreeCount(node.key)
  return total
}

/**
 * 展示排序：优先 sortOrder；否则有主数据的靠前；同量再按编码。
 * 不修改原树引用节点上的业务字段。
 */
export function sortCategoryTreeForDisplay(nodes, countMap = {}) {
  if (!Array.isArray(nodes) || !nodes.length) return []
  const sorted = [...nodes].sort((a, b) => {
    const ao = a.sortOrder
    const bo = b.sortOrder
    if (ao != null && bo != null && ao !== bo) return ao - bo
    if (ao != null && bo == null) return -1
    if (ao == null && bo != null) return 1
    const ca = countMap[a.key] || 0
    const cb = countMap[b.key] || 0
    if (cb !== ca) return cb - ca
    return String(a.code || '').localeCompare(String(b.code || ''), 'zh')
  })
  return sorted.map((node) => ({
    ...node,
    children: node.children?.length
      ? sortCategoryTreeForDisplay(node.children, countMap)
      : node.children,
  }))
}

/** 在同级列表中上移/下移，并重写 sortOrder */
export function moveCategoryInList(list, key, direction) {
  if (!Array.isArray(list)) return { ok: false, message: '类别列表无效' }
  const index = list.findIndex((n) => n.key === key)
  if (index < 0) return { ok: false, message: '类别不存在' }
  const next = index + direction
  if (next < 0 || next >= list.length) {
    return { ok: false, message: direction < 0 ? '已在最前' : '已在最后' }
  }
  const [row] = list.splice(index, 1)
  list.splice(next, 0, row)
  list.forEach((n, i) => {
    n.sortOrder = i
  })
  return { ok: true }
}
