/**
 * 新建页草稿：即使 keep-alive 未命中/组件被重挂载，切回标签也能恢复，避免「刷新 + 再弹选品窗」。
 * key = route.path（新建页同一 path 一份草稿）
 */
const drafts = new Map()
/** 已初始化过的新建页 path（跨组件重挂载保留，关标签时清除） */
const bootstrappedPaths = new Set()

function normPath(path) {
  return String(path || '').split('?')[0]
}

export function saveCreatePageDraft(path, snapshot) {
  const key = normPath(path)
  if (!key.endsWith('/new')) return
  drafts.set(key, snapshot)
  bootstrappedPaths.add(key)
}

export function loadCreatePageDraft(path) {
  const key = normPath(path)
  if (!key.endsWith('/new')) return null
  return drafts.get(key) || null
}

export function isCreatePageBootstrapped(path) {
  return bootstrappedPaths.has(normPath(path))
}

export function clearCreatePageDraft(path) {
  const key = normPath(path)
  drafts.delete(key)
  bootstrappedPaths.delete(key)
}
