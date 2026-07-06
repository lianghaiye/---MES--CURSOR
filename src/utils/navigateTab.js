/** 路由跳转（标签在 afterEach 同步，避免导航中途改 Tab 导致跳转被中止） */
export function navigateTab(router, path) {
  if (router.currentRoute.value.path === path) return Promise.resolve()
  return router.push(path)
}
