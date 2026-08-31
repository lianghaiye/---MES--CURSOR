import { computed } from 'vue'
import { TABLE_DENSITY_LEVELS, TABLE_DENSITY_TOKENS, normalizeDensity } from '@/utils/tableDensity'
import { setTableDensity, tableDensityClass, uiAppearanceState } from '@/store/uiAppearanceStore'

/**
 * 列表表格字号三档：大 / 中 / 小（系统全局）
 * 偏好由顶栏「外观设置」统一控制，持久化到 localStorage。
 * 旧签名 useTableDensity(pageKey) 仍可调用，参数已忽略。
 */
export function useTableDensity() {
  const density = computed({
    get: () => normalizeDensity(uiAppearanceState.tableDensity, 'large'),
    set: (value) => setTableDensity(value),
  })

  const densityClass = tableDensityClass

  const tokens = computed(() => TABLE_DENSITY_TOKENS[density.value] || TABLE_DENSITY_TOKENS.large)

  /** 供 a-table 外层包裹：class="table-density-wrap table-density--medium" */
  const wrapClass = computed(() => ['table-density-wrap', densityClass.value])

  function setDensity(next) {
    setTableDensity(next)
  }

  return {
    density,
    densityClass,
    wrapClass,
    tokens,
    setDensity,
    densityLevels: TABLE_DENSITY_LEVELS,
    storageKey: 'global',
  }
}
