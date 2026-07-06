import { reactive, readonly } from 'vue'
import { routeTitles } from '@/config/menus'

const state = reactive({
  tabs: [{ path: '/home/dashboard', title: '首页', closable: false }],
  activePath: '/home/dashboard',
})

export function useTabs() {
  /** 预登记标签标题（详情页等），不切换 activePath，等路由成功后再高亮 */
  function openTab(path, title) {
    const tabTitle = title || routeTitles[path] || '未命名'
    const exists = state.tabs.find((t) => t.path === path)
    if (!exists) {
      state.tabs.push({
        path,
        title: tabTitle,
        closable: path !== '/home/dashboard',
      })
    } else if (title) {
      exists.title = tabTitle
    }
  }

  function closeTab(path) {
    const idx = state.tabs.findIndex((t) => t.path === path)
    if (idx === -1) return null
    const tab = state.tabs[idx]
    if (!tab.closable) return null

    state.tabs.splice(idx, 1)

    if (state.activePath === path) {
      const next = state.tabs[Math.min(idx, state.tabs.length - 1)]
      return next?.path || '/home/dashboard'
    }
    return null
  }

  function setActive(path) {
    state.activePath = path
  }

  return {
    tabState: readonly(state),
    openTab,
    closeTab,
    setActive,
  }
}

/** 供 router 等非 setup 上下文使用 */
export const tabStore = state
