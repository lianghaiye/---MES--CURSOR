/** 在新标签页打开新增/编辑表单（与 ECN / 新增 BOM 一致） */
export function openCreateTab(router, openTab, { path, title, query }) {
  const hasQuery = query && Object.keys(query).length > 0
  // tab.fullPath 必须带 query；openTab 内部会按 path 去重，同一新建路由只留一个标签
  const fullPath = hasQuery ? router.resolve({ path, query }).fullPath : path
  openTab(fullPath, title)
  return router.push(hasQuery ? { path, query } : path)
}
