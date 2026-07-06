import { tabStore } from '@/composables/useTabs'
import { routeTitles } from '@/config/menus'

/** 路由跳转成功后同步标签栏（须在 afterEach 调用） */
export function syncRouteTab(to) {
  if (to.meta.public || to.meta.standalone) return

  const fullPath = to.path
  const title = routeTitles[fullPath] || to.meta?.title || '页面'
  const existing = tabStore.tabs.find((t) => t.path === fullPath)

  if (existing) {
    if (!existing.title || existing.title === '未命名') {
      existing.title = title
    }
  } else {
    tabStore.tabs.push({
      path: fullPath,
      title,
      closable: fullPath !== '/home/dashboard',
    })
  }

  tabStore.activePath = fullPath
}
