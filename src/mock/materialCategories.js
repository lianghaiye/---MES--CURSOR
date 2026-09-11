/** 系统默认：物料类别「物料」（可改名、不可删除；新租户入驻即有） */
export const MATERIAL_CATEGORY_DEFAULT = {
  key: 'cat-material',
  code: '000',
  title: '物料',
  system: true,
  count: 0,
}

/** 演示业务类别（可删可改） */
const DEMO_MATERIAL_CATEGORIES = [
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

/** 新租户 / 空库种子：业务演示类别在前，系统默认「物料」靠后 */
export function createMaterialCategorySeed() {
  return [
    ...DEMO_MATERIAL_CATEGORIES.map((n) => structuredClone(n)),
    { ...MATERIAL_CATEGORY_DEFAULT },
  ]
}

function walkFind(nodes, key) {
  for (const node of nodes || []) {
    if (node.key === key) return node
    const hit = walkFind(node.children, key)
    if (hit) return hit
  }
  return null
}

/**
 * 补齐系统默认类别（旧租户升级、localStorage 缺项时调用）。
 * 已存在则只强制 system 标记，不覆盖用户改过的名称。
 */
export function ensureSystemMaterialCategories(tree) {
  const list = Array.isArray(tree) ? tree : []
  const existing = walkFind(list, MATERIAL_CATEGORY_DEFAULT.key)
  if (existing) {
    existing.system = true
    if (!existing.code) existing.code = MATERIAL_CATEGORY_DEFAULT.code
  } else {
    list.push({ ...MATERIAL_CATEGORY_DEFAULT })
  }
  return list
}

/** @deprecated 请优先用 store 的响应式树；保留给种子脚本一次性读取 */
export const materialCategoryTree = createMaterialCategorySeed()

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

export function isSystemCategory(node) {
  return Boolean(node?.system)
}
