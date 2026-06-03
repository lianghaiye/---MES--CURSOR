/** 物料类别树 */
export const materialCategoryTree = [
  { key: 'cat-009', code: '009', title: '附件', count: 12 },
  { key: 'cat-008', code: '008', title: '标准件', count: 28 },
  { key: 'cat-007', code: '007', title: '毛坯件', count: 15 },
  { key: 'cat-006', code: '006', title: '半成品', count: 22 },
  { key: 'cat-005', code: '005', title: '零件', count: 35 },
  {
    key: 'cat-004',
    code: '004',
    title: '部件',
    count: 52,
    children: [
      { key: 'cat-004-001', code: '001', title: '叶轮', count: 18, parentKey: 'cat-004' },
      { key: 'cat-004-002', code: '002', title: '托架', count: 14, parentKey: 'cat-004' },
      { key: 'cat-004-003', code: '003', title: '电机', count: 20, parentKey: 'cat-004' },
    ],
  },
]

export function flattenCategoryNodes(nodes, list = []) {
  nodes.forEach((node) => {
    list.push(node)
    if (node.children?.length) flattenCategoryNodes(node.children, list)
  })
  return list
}

export function filterCategoryTree(nodes, keyword) {
  const kw = (keyword || '').trim().toLowerCase()
  if (!kw) return nodes

  const walk = (arr) =>
    arr
      .map((node) => {
        const titleMatch = node.title.toLowerCase().includes(kw) || node.code.includes(kw)
        const children = node.children ? walk(node.children) : []
        if (titleMatch || children.length) {
          return { ...node, children: children.length ? children : node.children }
        }
        return null
      })
      .filter(Boolean)

  return walk(nodes)
}

export function getCategoryKeysUnder(nodeKey, tree = materialCategoryTree) {
  const flat = flattenCategoryNodes(tree)
  const node = flat.find((n) => n.key === nodeKey)
  if (!node) return []
  if (!node.children?.length) return [nodeKey]
  return flat.filter((n) => n.parentKey === nodeKey || n.key === nodeKey).map((n) => n.key)
}
