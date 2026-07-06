/** 路由跳转（标签在 afterEach 同步） */
export function navigateTab(router, path) {
  if (!path) return Promise.resolve()

  const target = router.resolve(path)
  if (router.currentRoute.value.path === target.path) return Promise.resolve()

  return router.push(target).catch((err) => {
    console.error('[navigateTab] push failed, fallback:', path, err)
    window.location.assign(target.href)
  })
}
