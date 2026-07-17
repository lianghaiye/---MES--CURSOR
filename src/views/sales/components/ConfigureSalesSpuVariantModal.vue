<template>
  <a-modal
    :open="open"
    title="选择产品 / 配置变体"
    width="720px"
    :mask-closable="false"
    destroy-on-close
    class="configure-sales-spu-variant-modal"
    @cancel="handleCancel"
  >
    <div v-if="spu" class="config-body">
      <div class="spu-banner">
        <div class="spu-banner-main">
          <span class="spu-code">{{ spu.code }}</span>
          <span class="spu-name">{{ spu.name }}</span>
        </div>
        <a-button v-if="allowBack" type="link" size="small" class="back-link" @click="emitBack">
          ← 返回搜索
        </a-button>
      </div>

      <div v-if="!(spu.variantAxes || []).length" class="empty-axes">
        <a-alert type="info" show-icon message="该产品族无变体维度，将直接匹配默认 SKU" />
      </div>

      <div v-for="axis in spu.variantAxes || []" :key="axis.key" class="axis-block">
        <div class="axis-label">
          {{ axis.label || axis.key }}
          <span v-if="axis.code" class="axis-code">[{{ axis.code }}]</span>
        </div>
        <div class="axis-tags">
          <button
            v-for="opt in axisSelectOptions(axis.key)"
            :key="`${axis.key}-${opt.value}`"
            type="button"
            class="axis-tag"
            :class="{ active: variantDraft[axis.key] === opt.value }"
            @click="selectAxisValue(axis.key, opt.value)"
          >
            {{ opt.label }}
            <span v-if="opt.code && opt.code !== opt.label" class="tag-code">{{ opt.code }}</span>
          </button>
          <span v-if="!axisSelectOptions(axis.key).length" class="axis-empty">
            暂无选项，请先在产品族主数据维护
          </span>
        </div>
      </div>

      <div v-if="matchState.ok" class="match-box match-ok">
        <div class="match-top">
          <div class="match-status">
            <span class="match-check">✓</span>
            匹配到已有 SKU
          </div>
          <span class="match-sku-code">{{ matchState.skuCode }}</span>
        </div>
        <div class="match-desc">
          {{ matchState.displayName }} | 单价: ¥{{ matchState.priceText }}
        </div>
      </div>
      <div v-else-if="matchState.waiting" class="match-box match-wait">
        <div class="match-status">请选择完整变体属性</div>
      </div>
      <div v-else-if="matchState.message" class="match-box match-fail">
        <div class="match-status">{{ matchState.message }}</div>
      </div>
    </div>

    <template #footer>
      <a-button @click="handleCancel">取消</a-button>
      <a-button type="primary" :disabled="!matchState.ok" @click="handleConfirm">
        {{ confirmText }}
      </a-button>
    </template>
  </a-modal>
</template>

<script setup>
import { computed, reactive, watch } from 'vue'
import { message } from 'ant-design-vue'
import { findSpuById } from '@/store/spuStore'
import { listAxisOptions, areRequiredAxesFilled, resolveSkuFromSpu } from '@/utils/spuLineResolve'
import { buildSkuDisplayName } from '@/utils/spuVariant'
import { productInfoState } from '@/store/productInfoStore'
import { materialInfoState } from '@/store/materialInfoStore'

const props = defineProps({
  open: { type: Boolean, default: false },
  spuId: { type: String, default: '' },
  /** 编辑已有行时预填变体 */
  initialVariantValues: { type: Object, default: null },
  allowBack: { type: Boolean, default: false },
  confirmText: { type: String, default: '添加到订单' },
})

const emit = defineEmits(['update:open', 'confirm', 'back'])

const variantDraft = reactive({})

const spu = computed(() => findSpuById(props.spuId) || null)

function axisSelectOptions(axisKey) {
  if (!props.spuId) return []
  return listAxisOptions(props.spuId, axisKey)
}

function resetDraft(fromValues) {
  Object.keys(variantDraft).forEach((k) => delete variantDraft[k])
  const axes = spu.value?.variantAxes || []
  axes.forEach((axis) => {
    variantDraft[axis.key] = fromValues?.[axis.key] || ''
  })
}

watch(
  () => [props.open, props.spuId],
  ([open]) => {
    if (!open || !props.spuId) return
    resetDraft(props.initialVariantValues)
  },
)

function selectAxisValue(axisKey, value) {
  if (variantDraft[axisKey] === value) {
    variantDraft[axisKey] = ''
  } else {
    variantDraft[axisKey] = value
  }
}

function resolveMasterPrice(productId) {
  if (!productId) return 0
  const master =
    productInfoState.products.find((p) => p.id === productId) ||
    materialInfoState.materials.find((m) => m.id === productId)
  return Number(master?.unitPrice) || 0
}

const matchState = computed(() => {
  if (!props.spuId || !spu.value) {
    return { ok: false, waiting: true, message: '' }
  }
  const axes = spu.value.variantAxes || []
  if (!axes.length) {
    const resolved = resolveSkuFromSpu(props.spuId, {})
    if (resolved.error) {
      return { ok: false, waiting: false, message: resolved.error }
    }
    const price = resolveMasterPrice(resolved.productId)
    return {
      ok: true,
      waiting: false,
      message: '',
      resolved,
      skuCode: resolved.productCode,
      displayName: buildSkuDisplayName(spu.value.name, {}, axes),
      priceText: price.toFixed(2),
    }
  }
  if (!areRequiredAxesFilled(props.spuId, variantDraft)) {
    return { ok: false, waiting: true, message: '' }
  }
  const resolved = resolveSkuFromSpu(props.spuId, { ...variantDraft })
  if (resolved.error) {
    return { ok: false, waiting: false, message: resolved.error }
  }
  const price = resolveMasterPrice(resolved.productId)
  return {
    ok: true,
    waiting: false,
    message: '',
    resolved,
    skuCode: resolved.productCode,
    displayName: buildSkuDisplayName(spu.value.name, variantDraft, axes),
    priceText: price.toFixed(2),
  }
})

function handleCancel() {
  emit('update:open', false)
}

function emitBack() {
  emit('back')
}

function handleConfirm() {
  if (!matchState.value.ok || !matchState.value.resolved) {
    message.warning(matchState.value.message || '请先选择完整变体并匹配 SKU')
    return
  }
  emit('confirm', {
    spuId: props.spuId,
    spu: spu.value,
    variantValues: { ...variantDraft },
    resolved: matchState.value.resolved,
  })
  emit('update:open', false)
}
</script>

<style scoped lang="less">
.config-body {
  min-height: 280px;
}

.spu-banner {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 10px 14px;
  margin-bottom: 16px;
  background: #e8f3ff;
  border: 1px solid #bedaff;
  border-radius: 6px;
}

.spu-banner-main {
  display: flex;
  align-items: baseline;
  gap: 10px;
  min-width: 0;
}

.spu-code {
  font-weight: 600;
  color: #1677ff;
  flex-shrink: 0;
}

.spu-name {
  color: #1f1f1f;
  font-weight: 500;
}

.back-link {
  flex-shrink: 0;
  padding-inline: 0;
}

.axis-block {
  margin-bottom: 16px;
}

.axis-label {
  margin-bottom: 8px;
  font-weight: 500;
  color: #262626;
}

.axis-code {
  margin-left: 4px;
  color: #8c8c8c;
  font-size: 12px;
  font-weight: 400;
}

.axis-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.axis-tag {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 4px 12px;
  border: 1px solid #d9d9d9;
  border-radius: 4px;
  background: #fff;
  color: #595959;
  cursor: pointer;
  font-size: 13px;
  line-height: 22px;
  transition: all 0.15s;

  &:hover {
    border-color: #1677ff;
    color: #1677ff;
  }

  &.active {
    border-color: #1677ff;
    background: #1677ff;
    color: #fff;

    .tag-code {
      color: rgba(255, 255, 255, 0.85);
    }
  }
}

.tag-code {
  color: #8c8c8c;
  font-size: 12px;
}

.axis-empty {
  color: #bfbfbf;
  font-size: 13px;
}

.empty-axes {
  margin-bottom: 12px;
}

.match-box {
  margin-top: 8px;
  padding: 12px 14px;
  border-radius: 6px;
}

.match-ok {
  background: #f6ffed;
  border: 1px solid #b7eb8f;
}

.match-wait {
  background: #fafafa;
  border: 1px solid #f0f0f0;
  color: #8c8c8c;
}

.match-fail {
  background: #fff2f0;
  border: 1px solid #ffccc7;
  color: #cf1322;
}

.match-top {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.match-status {
  display: flex;
  align-items: center;
  gap: 6px;
  font-weight: 500;
}

.match-check {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 18px;
  height: 18px;
  border-radius: 50%;
  background: #52c41a;
  color: #fff;
  font-size: 12px;
  line-height: 1;
}

.match-sku-code {
  font-weight: 600;
  color: #389e0d;
  flex-shrink: 0;
}

.match-desc {
  margin-top: 6px;
  color: #595959;
  font-size: 13px;
}
</style>
