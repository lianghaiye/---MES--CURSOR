<template>
  <div class="sku-code-rule-panel">
    <div class="panel-line">
      <span class="panel-title">SKU 编码规则</span>
      <span class="panel-desc">{{
        readonly ? '固定：族编码-规格-材质' : '由族编码与各属性编码按序拼接'
      }}</span>
      <span class="preview-inline">预览 {{ previewCode }}</span>
    </div>
    <div class="composition-box">
      <template v-for="(seg, idx) in segments" :key="seg.key">
        <span v-if="idx > 0" class="sep-mark">-</span>
        <a-tag :color="seg.color" class="seg-tag">{{ seg.label }}（{{ seg.sample }}）</a-tag>
      </template>
      <span v-if="!segments.length" class="empty-hint">请先配置变体属性</span>
    </div>
  </div>
</template>

<script setup>
import { computed, watch } from 'vue'
import {
  buildSkuCodePattern,
  buildSkuCodePreview,
  getSkuCodeSegments,
} from '@/utils/skuCodePattern'
import { PRODUCT_SKU_CODE_PATTERN } from '@/constants/spu'

const props = defineProps({
  skuCodePattern: { type: String, default: '' },
  variantAxes: { type: Array, default: () => [] },
  spuCode: { type: String, default: '' },
  disabled: { type: Boolean, default: false },
  readonly: { type: Boolean, default: true },
})

const emit = defineEmits(['update:skuCodePattern'])

const effectivePattern = computed(() => {
  if (props.readonly) return PRODUCT_SKU_CODE_PATTERN
  return props.skuCodePattern || buildSkuCodePattern(props.variantAxes, '-')
})

const segments = computed(() =>
  getSkuCodeSegments(props.variantAxes, props.spuCode).map((seg) =>
    seg.key === 'SPU_CODE' ? { ...seg, label: '族编码' } : seg,
  ),
)

const previewCode = computed(() =>
  buildSkuCodePreview(effectivePattern.value, {
    spuCode: props.spuCode || 'F0001',
    variantAxes: props.variantAxes,
  }),
)

watch(
  effectivePattern,
  (val) => {
    if (props.readonly && props.skuCodePattern !== val) {
      emit('update:skuCodePattern', val)
    }
  },
  { immediate: true },
)
</script>

<style scoped>
.sku-code-rule-panel {
  margin-top: 8px;
  padding: 8px 10px;
  background: #fafafa;
  border: 1px solid #f0f0f0;
  border-radius: 6px;
}
.panel-line {
  display: flex;
  flex-wrap: wrap;
  align-items: baseline;
  gap: 8px 12px;
  margin-bottom: 6px;
}
.panel-title {
  font-weight: 600;
  font-size: 13px;
}
.panel-desc {
  font-size: 12px;
  color: rgba(0, 0, 0, 0.45);
}
.preview-inline {
  margin-left: auto;
  font-size: 12px;
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
  font-weight: 600;
  color: rgba(0, 0, 0, 0.75);
}
.composition-box {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 4px;
  min-height: 28px;
}
.sep-mark {
  color: rgba(0, 0, 0, 0.35);
}
.seg-tag {
  margin: 0;
}
.empty-hint {
  font-size: 12px;
  color: rgba(0, 0, 0, 0.35);
}
</style>
