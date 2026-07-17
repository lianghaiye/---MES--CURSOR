import { ref } from 'vue'
import { isSpuLine, lineVariantSummary } from '@/utils/spuLineResolve'

/**
 * 产品族变体配置弹层状态（与销售订单选品一致）
 */
export function useSpuVariantConfig() {
  const variantConfigOpen = ref(false)
  const variantConfigSpuId = ref('')
  const variantConfigInitialValues = ref({})
  const variantConfigTargetLine = ref(null)

  function openVariantConfig(record) {
    if (!isSpuLine(record) || !record.spuId) return
    variantConfigTargetLine.value = record
    variantConfigSpuId.value = record.spuId
    variantConfigInitialValues.value = { ...(record.variantValues || {}) }
    variantConfigOpen.value = true
  }

  function lineVariantDisplay(record) {
    return lineVariantSummary(record) || record.variantSummary || ''
  }

  function clearVariantConfigTarget() {
    variantConfigTargetLine.value = null
  }

  return {
    variantConfigOpen,
    variantConfigSpuId,
    variantConfigInitialValues,
    variantConfigTargetLine,
    openVariantConfig,
    lineVariantDisplay,
    clearVariantConfigTarget,
  }
}
