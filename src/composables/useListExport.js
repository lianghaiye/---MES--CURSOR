import { ref, watch } from 'vue'
import { message } from 'ant-design-vue'
import { buildExportFileName, exportRowsToExcel } from '@/utils/excelExport'
import {
  createDefaultExportFieldSettings,
  loadExportFieldSettings,
  saveExportFieldSettings,
  resolveExportFields,
} from '@/utils/exportFieldSettings'

/**
 * @param {object} options
 * @param {string} options.storageKey
 * @param {Array<{ key: string, title: string, getValue: Function }>} options.fieldDefinitions
 * @param {() => Array<object>} options.getFilteredRows
 * @param {() => Array<object>} [options.getSelectedRows]
 * @param {string} options.fileNamePrefix
 * @param {string} [options.sheetName]
 */
export function useListExport({
  storageKey,
  fieldDefinitions,
  getFilteredRows,
  getSelectedRows = () => [],
  fileNamePrefix,
  sheetName,
}) {
  const defaultExportFieldSettings = createDefaultExportFieldSettings(fieldDefinitions)
  const exportFieldSettings = ref(loadExportFieldSettings(storageKey, defaultExportFieldSettings))
  const exportModalOpen = ref(false)

  watch(
    exportFieldSettings,
    (value) => {
      saveExportFieldSettings(storageKey, value)
    },
    { deep: true },
  )

  function openExportModal() {
    exportModalOpen.value = true
  }

  function doExport({ scope, settings }) {
    const rows = scope === 'selected' ? getSelectedRows() : getFilteredRows()

    if (!rows.length) {
      message.warning(scope === 'selected' ? '请先勾选要导出的数据' : '无数据可导出')
      return false
    }

    const fields = resolveExportFields(fieldDefinitions, settings)
    if (!fields.length) {
      message.warning('请至少选择一个导出字段')
      return false
    }

    exportRowsToExcel({
      rows,
      fields,
      fileName: buildExportFileName(fileNamePrefix),
      sheetName: sheetName || fileNamePrefix,
    })
    message.success(`已导出 ${rows.length} 条数据`)
    exportModalOpen.value = false
    return true
  }

  return {
    exportModalOpen,
    openExportModal,
    exportFieldSettings,
    defaultExportFieldSettings,
    doExport,
  }
}
