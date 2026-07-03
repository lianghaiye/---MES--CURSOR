import { useRoute, useRouter } from 'vue-router'
import { useTabs } from '@/composables/useTabs'

/** 表单新增页：取消/保存后关闭 Tab 并返回列表 */
export function useFormCreatePage(listPath) {
  const route = useRoute()
  const router = useRouter()
  const { closeTab } = useTabs()

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

  return { goBack, resolveListPath }
}
