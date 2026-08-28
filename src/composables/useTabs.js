import { reactive, readonly } from 'vue'
import { routeTitles } from '@/config/menus'
import { clearCreatePageDraft } from '@/utils/createPageDraft'

const state = reactive({
  tabs: [{ path: '/home/dashboard', fullPath: '/home/dashboard', title: '首页', closable: false }],
  activePath: '/home/dashboard',
})

function tabBasePath(p) {
  return String(p || '').split('?')[0]
}

function normalizeTabInput(pathOrFull) {
  const raw = String(pathOrFull || '')
  const path = tabBasePath(raw)
  return {
    path,
    // 无 query 时 fullPath === path
    fullPath: raw || path,
  }
}

/** 按 path（去 query）找标签；新建页同一 path 只保留一个标签 */
function findTabByPath(pathOrFull) {
  const base = tabBasePath(pathOrFull)
  return state.tabs.find((t) => tabBasePath(t.path) === base || tabBasePath(t.fullPath) === base)
}

export function useTabs() {
  function openTab(pathOrFull, title) {
    const { path, fullPath } = normalizeTabInput(pathOrFull)
    let exists = findTabByPath(path)
    if (!exists) {
      state.tabs.push({
        path,
        fullPath,
        title: title || routeTitles[path] || '未命名',
        closable: path !== '/home/dashboard',
      })
    } else {
      // 升级/刷新 fullPath，保证切回标签时带上 query
      exists.fullPath = fullPath
      exists.path = path
      if (title) exists.title = title
    }
    state.activePath = path
  }

  function closeTab(pathOrFull) {
    const base = tabBasePath(pathOrFull)
    const idx = state.tabs.findIndex(
      (t) => tabBasePath(t.path) === base || tabBasePath(t.fullPath) === base,
    )
    if (idx === -1) return
    const tab = state.tabs[idx]
    if (!tab.closable) return

    // 关闭新建页标签时清草稿，下次点「新增」重新开始
    if (base.endsWith('/new')) clearCreatePageDraft(base)

    state.tabs.splice(idx, 1)

    if (tabBasePath(state.activePath) === base) {
      const next = state.tabs[Math.min(idx, state.tabs.length - 1)]
      state.activePath = next?.path || '/home/dashboard'
    }
  }

  function setActive(pathOrFull) {
    const tab = findTabByPath(pathOrFull)
    state.activePath = tab?.path || tabBasePath(pathOrFull)
  }

  /** 当前路由变化时，把新建页标签的 fullPath 写成真实地址（含 query） */
  function syncTabWithRoute(fullPath, path) {
    const p = String(path || '')
    const fp = String(fullPath || p)
    const tab = findTabByPath(p)
    if (!tab) return
    tab.path = p
    if (fp && fp !== tab.fullPath) tab.fullPath = fp
    if (tabBasePath(state.activePath) === p) state.activePath = p
  }

  function getTabNavigateTo(pathOrFull) {
    const tab = findTabByPath(pathOrFull)
    return tab?.fullPath || tab?.path || String(pathOrFull || '')
  }

  return {
    tabState: readonly(state),
    openTab,
    closeTab,
    setActive,
    syncTabWithRoute,
    getTabNavigateTo,
    findTabByPath,
  }
}

/** 供 router 等非 setup 上下文使用 */
export const tabStore = state
