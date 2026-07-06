import { isNavigationFailure, NavigationFailureType } from 'vue-router'
import { tabStore } from '@/composables/useTabs'
import { routeTitles } from '@/config/menus'

/** 路由跳转（标签由 router beforeEach 同步，避免先改 Tab 后路由不同步） */
export function navigateTab(router, path) {
  return router.push(path).catch((err) => {
    if (
      isNavigationFailure(err, NavigationFailureType.duplicated) ||
      isNavigationFailure(err, NavigationFailureType.cancelled) ||
      isNavigationFailure(err, NavigationFailureType.aborted)
    ) {
      return
    }
    console.error('[navigateTab]', err)
  })
}

/** 详情等需自定义标题时：先登记 Tab 标题再跳转 */
export function navigateTabWithTitle(router, path, title) {
  const exists = tabStore.tabs.find((t) => t.path === path)
  if (!exists) {
    tabStore.tabs.push({
      path,
      title: title || routeTitles[path] || '未命名',
      closable: path !== '/home/dashboard',
    })
  }
  return navigateTab(router, path)
}
