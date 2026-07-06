/** 在新标签页打开新增表单（与 ECN / 新增 BOM 一致） */
export function openCreateTab(router, openTab, { path, title }) {
  openTab(path, title)
  router.push(path)
}
