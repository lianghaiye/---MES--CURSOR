/** 系统默认：产品类别「产成品」（可改名、不可删除；新租户入驻即有） */
export const PRODUCT_CATEGORY_FINISHED = {
  key: 'pcat-finished',
  code: '001',
  title: '产成品',
  system: true,
}

/** 系统预置：BOM 快捷创建等产品默认兜底类别（可改名、不可删除） */
export const PRODUCT_CATEGORY_UNCLASSIFIED = {
  key: 'pcat-unclassified',
  code: '000',
  title: '待归类',
  system: true,
}

/** 演示业务类别（可删可改） */
const DEMO_PRODUCT_CATEGORIES = [
  { key: 'pcat-008', code: '008', title: '清水泵' },
  { key: 'pcat-pc', code: 'pc', title: '电脑' },
  {
    key: 'pcat-004',
    code: '004',
    title: '离心泵',
    children: [
      { key: 'pcat-004-001', code: '001', title: '泵体', parentKey: 'pcat-004' },
      { key: 'pcat-004-002', code: '002', title: '壳体', parentKey: 'pcat-004' },
      { key: 'pcat-004-003', code: '003', title: '电机泵', parentKey: 'pcat-004' },
    ],
  },
]

/** 新租户 / 空库种子：系统默认 + 演示数据 */
export function createProductCategorySeed() {
  return [
    { ...PRODUCT_CATEGORY_FINISHED },
    { ...PRODUCT_CATEGORY_UNCLASSIFIED },
    ...DEMO_PRODUCT_CATEGORIES.map((n) => structuredClone(n)),
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
export function ensureSystemProductCategories(tree) {
  const list = Array.isArray(tree) ? tree : []
  const ensureOne = (preset, unshift = false) => {
    const existing = walkFind(list, preset.key)
    if (existing) {
      existing.system = true
      if (!existing.code) existing.code = preset.code
      return
    }
    const row = { ...preset }
    if (unshift) list.unshift(row)
    else list.push(row)
  }
  ensureOne(PRODUCT_CATEGORY_FINISHED, true)
  ensureOne(PRODUCT_CATEGORY_UNCLASSIFIED, false)
  return list
}

/** @deprecated 请优先用 store 的响应式树；保留给种子脚本一次性读取 */
export const productCategoryTree = createProductCategorySeed()

export { filterCategoryTree, flattenCategoryNodes } from '@/mock/materialCategories'
