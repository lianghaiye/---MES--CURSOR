/** 在新标签页打开新增/编辑表单（与 ECN / 新增 BOM 一致） */
export function openCreateTab(router, openTab, { path, title, query }) {
  const hasQuery = query && Object.keys(query).length > 0
  // 带 query 的页签必须保留 fullPath，切回标签时才能还原参数，避免表单被清空
  const tabPath = hasQuery ? router.resolve({ path, query }).fullPath : path
  openTab(tabPath, title)
  router.push(hasQuery ? { path, query } : path)
}
