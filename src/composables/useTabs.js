import { reactive, readonly } from 'vue'
import { routeTitles } from '@/config/menus'

const state = reactive({
  tabs: [{ path: '/home/dashboard', title: '首页', closable: false }],
  activePath: '/home/dashboard',
})

export function useTabs() {
  function openTab(path, title) {
    const exists = state.tabs.find((t) => t.path === path)
    if (!exists) {
      state.tabs.push({
        path,
        title: title || routeTitles[path] || '未命名',
        closable: path !== '/home/dashboard',
      })
    } else if (title) {
      exists.title = title
    }
    state.activePath = path
  }

  function closeTab(path) {
    const idx = state.tabs.findIndex((t) => t.path === path)
    if (idx === -1) return
    const tab = state.tabs[idx]
    if (!tab.closable) return

    state.tabs.splice(idx, 1)

    if (state.activePath === path) {
      const next = state.tabs[Math.min(idx, state.tabs.length - 1)]
      state.activePath = next?.path || '/home/dashboard'
    }
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
