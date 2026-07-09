import { nextTick, ref } from 'vue'

/** 出入库明细表：单击单元格才挂载输入控件（与生成加工工单 planQty 交互一致） */
export function useInventoryLineCellEdit() {
  const editingCell = ref(null)
  const selectOpen = ref(false)

  function isEditing(rowKey, field) {
    return editingCell.value?.rowKey === rowKey && editingCell.value?.field === field
  }

  function startEdit(rowKey, field, { select = false } = {}) {
    editingCell.value = { rowKey, field }
    if (select) {
      nextTick(() => {
        selectOpen.value = true
      })
    }
  }

  function endEdit() {
    editingCell.value = null
    selectOpen.value = false
  }

  function onSelectOpenChange(open) {
    selectOpen.value = open
    if (!open) endEdit()
  }

  return {
    editingCell,
    selectOpen,
    isEditing,
    startEdit,
    endEdit,
    onSelectOpenChange,
  }
}
