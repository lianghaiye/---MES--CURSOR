import { reactive, watch } from 'vue'
import { createProductCategorySeed, ensureSystemProductCategories } from '@/mock/productCategories'
import { flattenCategoryNodes, isSystemCategory } from '@/mock/materialCategories'
import { moveCategoryInList } from '@/utils/categoryTreeSort'

const STORAGE_KEY = 'i_doms_product_categories'
const SEED_VERSION_KEY = 'i_doms_product_categories_seed_v'
/** bump 时仅触发 ensure，不整库重种，保留租户已改名称/自建类别 */
const CURRENT_SEED_VERSION = '1'

function loadFromStorage() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) {
      const parsed = JSON.parse(raw)
      if (Array.isArray(parsed.tree)) return parsed.tree
    }
  } catch {
    /* ignore */
  }
  return null
}

function persist() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify({ tree: productCategoryState.tree }))
  localStorage.setItem(SEED_VERSION_KEY, CURRENT_SEED_VERSION)
}

function cloneTree(tree) {
  return structuredClone(tree || [])
}

/** 新租户入驻 / 空库：写入系统默认产品类别 */
export function bootstrapProductCategoriesForTenant() {
  const tree = ensureSystemProductCategories(createProductCategorySeed())
  productCategoryState.tree.splice(0, productCategoryState.tree.length, ...tree)
  return productCategoryState.tree
}

export const productCategoryState = reactive({
  tree: ensureSystemProductCategories(cloneTree(loadFromStorage() || createProductCategorySeed())),
})

watch(
  () => productCategoryState.tree,
  () => persist(),
  { deep: true },
)

export function getProductCategoryTree() {
  return productCategoryState.tree
}

export function findProductCategory(key) {
  return flattenCategoryNodes(productCategoryState.tree).find((n) => n.key === key) || null
}

export function getProductCategoryLeafOptions() {
  return flattenCategoryNodes(productCategoryState.tree)
    .filter((c) => !c.children?.length)
    .map((c) => ({
      label: `(${c.code}) ${c.title}`,
      value: c.key,
      system: Boolean(c.system),
    }))
}

function findParentList(key, nodes = productCategoryState.tree) {
  for (let i = 0; i < nodes.length; i += 1) {
    if (nodes[i].key === key) return { list: nodes, index: i, node: nodes[i] }
    if (nodes[i].children?.length) {
      const hit = findParentList(key, nodes[i].children)
      if (hit) return hit
    }
  }
  return null
}

function titleExists(title, excludeKey) {
  const t = String(title || '').trim()
  return flattenCategoryNodes(productCategoryState.tree).some(
    (n) => n.title === t && n.key !== excludeKey,
  )
}

function codeExists(code, excludeKey) {
  const c = String(code || '').trim()
  return flattenCategoryNodes(productCategoryState.tree).some(
    (n) => n.code === c && n.key !== excludeKey,
  )
}

export function addProductCategory(payload) {
  const code = payload.code?.trim()
  const title = payload.title?.trim()
  if (!code) return { ok: false, message: '请输入类别编码' }
  if (!title) return { ok: false, message: '请输入类别名称' }
  if (codeExists(code)) return { ok: false, message: '类别编码已存在' }
  if (titleExists(title)) return { ok: false, message: '类别名称已存在' }

  const parentKey = payload.parentKey || undefined
  const row = {
    key: `pcat-${Date.now()}`,
    code,
    title,
    system: false,
    ...(parentKey ? { parentKey } : {}),
  }

  if (parentKey) {
    const parent = findProductCategory(parentKey)
    if (!parent) return { ok: false, message: '父类别不存在' }
    if (!parent.children) parent.children = []
    parent.children.push(row)
  } else {
    productCategoryState.tree.push(row)
  }
  return { ok: true, category: row }
}

/** 支持修改名称；系统默认类别允许改名，编码锁定 */
export function updateProductCategory(key, payload) {
  const node = findProductCategory(key)
  if (!node) return { ok: false, message: '产品类别不存在' }

  const title = payload.title?.trim()
  if (!title) return { ok: false, message: '请输入类别名称' }
  if (titleExists(title, key)) return { ok: false, message: '类别名称已存在' }

  const oldTitle = node.title
  node.title = title

  if (!isSystemCategory(node)) {
    const code = payload.code?.trim()
    if (!code) return { ok: false, message: '请输入类别编码' }
    if (codeExists(code, key)) return { ok: false, message: '类别编码已存在' }
    node.code = code
  }

  return { ok: true, category: node, renamedFrom: oldTitle !== title ? oldTitle : null }
}

export function deleteProductCategory(key) {
  const hit = findParentList(key)
  if (!hit) return { ok: false, message: '产品类别不存在' }
  if (isSystemCategory(hit.node)) {
    return { ok: false, message: '系统默认类别不可删除' }
  }
  if (hit.node.children?.length) {
    return { ok: false, message: '请先删除子类别' }
  }
  hit.list.splice(hit.index, 1)
  return { ok: true }
}

/** direction: -1 上移 / 1 下移；写入 sortOrder 供展示排序 */
export function moveProductCategory(key, direction) {
  const hit = findParentList(key)
  if (!hit) return { ok: false, message: '产品类别不存在' }
  return moveCategoryInList(hit.list, key, direction)
}
