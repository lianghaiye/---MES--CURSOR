import { useRoute, useRouter } from 'vue-router'
import { useTabs } from '@/composables/useTabs'

/** 表单新增页：取消/保存后关闭 Tab 并返回列表 */
export function useFormCreatePage(listPath) {
  const route = useRoute()
  const router = useRouter()
  const { closeTab, tabState, getTabNavigateTo } = useTabs()

  function resolveListPath() {
    if (typeof listPath === 'function') return listPath()
    if (listPath) return listPath
    return route.meta?.listPath || '/home/dashboard'
  }

  function goBack() {
    const target = resolveListPath()
    closeTab(route.path)
    router.push(target)
  }

  /** 只读详情：关标签后留在其余已打开的页（如从 BOM 点进来则回到 BOM） */
  function closeToActiveTab() {
    closeTab(route.path)
    router.push(getTabNavigateTo(tabState.activePath))
  }

  return { goBack, closeToActiveTab, resolveListPath }
}
