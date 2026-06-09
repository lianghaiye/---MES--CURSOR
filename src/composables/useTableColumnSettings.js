import { ref, computed, watch } from 'vue'
import {
  createDefaultColumnSettings,
  mergeColumnSettings,
  buildTableColumns,
  calcTableScrollX,
} from '@/utils/tableColumnSettings'

const STORAGE_PREFIX = 'i_doms_table_col_'

export function useTableColumnSettings(storageKey, baseColumns, options = {}) {
  const defaultColumnSettings = createDefaultColumnSettings(baseColumns, options.excludeKeys)

  function loadSettings() {
    try {
      const raw = localStorage.getItem(STORAGE_PREFIX + storageKey)
      if (raw) {
        return mergeColumnSettings(defaultColumnSettings, JSON.parse(raw))
      }
    } catch {
      /* ignore */
    }
    return JSON.parse(JSON.stringify(defaultColumnSettings))
  }

  const columnSettings = ref(loadSettings())
  const columnDrawerOpen = ref(false)

  const displayColumns = computed(() =>
    buildTableColumns(baseColumns, columnSettings.value, options),
  )

  const tableScrollX = computed(() =>
    calcTableScrollX(displayColumns.value, options.minScrollX || 1200),
  )

  watch(
    columnSettings,
    (value) => {
      localStorage.setItem(STORAGE_PREFIX + storageKey, JSON.stringify(value))
    },
    { deep: true },
  )

  return {
    columnSettings,
    columnDrawerOpen,
    displayColumns,
    tableScrollX,
    defaultColumnSettings,
  }
}
