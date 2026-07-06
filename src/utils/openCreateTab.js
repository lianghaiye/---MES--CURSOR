import { navigateTab } from '@/utils/navigateTab'

/** 在新标签页打开新增表单（路由驱动，Tab 由 router 守卫同步） */
export function openCreateTab(router, _openTab, { path }) {
  navigateTab(router, path)
}
