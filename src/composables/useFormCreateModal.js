import { computed } from 'vue'
import { useFormCreatePage } from './useFormCreatePage'

/** 表单弹窗/新增页双模式：统一取消、保存后关闭逻辑 */
export function useFormCreateModal(props, emit, options = {}) {
  const { listPath, getTitle } = options
  const { goBack } = useFormCreatePage(() => props.listPath || listPath)

  const isActive = computed(() => props.pageMode || props.open)
  const shellTitle = computed(() => (typeof getTitle === 'function' ? getTitle() : getTitle || ''))

  function handleCancel() {
    if (props.pageMode) {
      goBack()
      return
    }
    emit('update:open', false)
  }

  function closeAfterSave() {
    if (props.pageMode) {
      goBack()
      return
    }
    emit('update:open', false)
  }

  return { isActive, shellTitle, handleCancel, closeAfterSave, goBack }
}
