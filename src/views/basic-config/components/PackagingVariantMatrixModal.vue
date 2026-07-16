<template>
  <a-modal
    :open="open"
    :title="`变体矩阵 — ${spu?.name || ''}`"
    width="960px"
    :mask-closable="false"
    destroy-on-close
    @cancel="emit('update:open', false)"
  >
    <a-alert
      type="info"
      show-icon
      message="勾选变体组合后批量生成包装 SKU；已存在的组合会更新同步。"
      style="margin-bottom: 12px"
    />

    <PackagingVariantSkuMatrixPreview
      v-if="spu"
      :spu="spu"
      :variant-axes="spu.variantAxes"
      :sku-code-pattern="spu.skuCodePattern"
      @matrix-change="onMatrixChange"
    />

    <div class="custom-row" style="margin-top: 12px">
      <a-space wrap>
        <a-select
          v-model:value="customCombo.packagingForm"
          allow-clear
          placeholder="包装形式"
          style="width: 120px"
          :options="formOpts"
        />
        <a-input
          v-model:value="customCombo.outerSize"
          placeholder="尺寸 如 1200×800×600"
          style="width: 160px"
        />
        <a-input-number
          v-model:value="customCombo.capacityQty"
          :min="1"
          placeholder="包装量"
          style="width: 100px"
        />
        <a-select
          v-model:value="customCombo.unit"
          allow-clear
          placeholder="单位"
          style="width: 80px"
          :options="unitOpts"
        />
        <a-button size="small" @click="addCustomRow">添加组合</a-button>
      </a-space>
    </div>

    <template #footer>
      <a-button @click="emit('update:open', false)">关闭</a-button>
      <a-button type="primary" :loading="generating" @click="handleGenerate">
        生成选中 SKU（{{ selectedRows.length }}）
      </a-button>
    </template>
  </a-modal>
</template>

<script setup>
import { computed, reactive, ref, watch } from 'vue'
import { message } from 'ant-design-vue'
import PackagingVariantSkuMatrixPreview from './PackagingVariantSkuMatrixPreview.vue'
import { batchGeneratePackagingSkus } from '@/utils/packagingSkuSave'
import { matrixRowsToSkuCombos, previewMatrixRows } from '@/utils/spuMatrix'
import { PACKAGING_FORM_OPTIONS, PACKAGING_UNIT_OPTIONS } from '@/constants/packagingMaster'

const props = defineProps({
  open: Boolean,
  spu: { type: Object, default: null },
})
const emit = defineEmits(['update:open', 'saved'])

const generating = ref(false)
const matrixRows = ref([])
const extraCombos = ref([])

const customCombo = reactive({
  packagingForm: undefined,
  outerSize: '',
  capacityQty: 1,
  unit: undefined,
})

const formOpts = PACKAGING_FORM_OPTIONS.map((v) => ({ label: v, value: v }))
const unitOpts = PACKAGING_UNIT_OPTIONS.map((v) => ({ label: v, value: v }))

const selectedRows = computed(() => matrixRows.value.filter((r) => r.enabled !== false))

watch(
  () => props.open,
  (val) => {
    if (val) {
      extraCombos.value = []
      customCombo.packagingForm = undefined
      customCombo.outerSize = ''
      customCombo.capacityQty = 1
      customCombo.unit = undefined
    }
  },
)

function onMatrixChange(rows) {
  matrixRows.value = rows
}

function addCustomRow() {
  if (!customCombo.packagingForm) {
    message.warning('请选择包装形式')
    return
  }
  if (!customCombo.outerSize?.trim()) {
    message.warning('请输入外包装尺寸')
    return
  }
  if (!customCombo.unit) {
    message.warning('请选择单位')
    return
  }
  extraCombos.value.push({
    variantValues: {
      packagingForm: customCombo.packagingForm,
      outerSize: customCombo.outerSize.trim(),
      capacityQty: String(customCombo.capacityQty || 1),
      unit: customCombo.unit,
    },
  })
  const spu = props.spu
  if (spu) {
    const rows = previewMatrixRows(spu, {
      existingSkus: [],
      extraCombos: extraCombos.value,
    })
    matrixRows.value = rows.map((r) => ({ ...r, enabled: true }))
  }
  customCombo.packagingForm = undefined
  customCombo.outerSize = ''
  customCombo.capacityQty = 1
  customCombo.unit = undefined
}

function handleGenerate() {
  const spu = props.spu
  if (!spu?.id) return
  const picked = selectedRows.value
  if (!picked.length) {
    message.warning('请至少选择一行')
    return
  }
  generating.value = true
  try {
    const combos = matrixRowsToSkuCombos(picked)
    const results = batchGeneratePackagingSkus(spu.id, combos)
    const created = results.filter((r) => r.created).length
    const updated = results.filter((r) => r.sku && !r.created).length
    message.success(`已生成 ${created} 个新 SKU，更新 ${updated} 个`)
    emit('saved')
    emit('update:open', false)
  } finally {
    generating.value = false
  }
}
</script>
