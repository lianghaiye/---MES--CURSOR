import { isNavigationFailure, NavigationFailureType } from 'vue-router'

/** SPA 内路由跳转，标签由 afterEach 同步 */
export function navigateTab(router, path) {
  if (!path) return Promise.resolve()
  if (router.currentRoute.value.path === path) return Promise.resolve()
  return router.push(path).catch((err) => {
    if (isNavigationFailure(err, NavigationFailureType.duplicated)) return
    if (isNavigationFailure(err, NavigationFailureType.cancelled)) return
    if (isNavigationFailure(err, NavigationFailureType.aborted)) return
    console.error('[navigateTab]', path, err)
  })
}
