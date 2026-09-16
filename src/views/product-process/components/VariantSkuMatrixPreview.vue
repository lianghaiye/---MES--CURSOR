<template>
  <div class="variant-sku-matrix-preview">
    <div class="matrix-summary-row">
      <div class="matrix-summary">
        属性组合将生成 <strong>{{ matrixRows.length }}</strong> 个变体 SKU，已启用
        <strong>{{ enabledCount }}</strong> 个
      </div>
      <a-space v-if="!disabled" :size="8">
        <a-button
          size="small"
          :disabled="!matrixRows.length || allEnabled"
          @click="setAllEnabled(true)"
        >
          全部启用
        </a-button>
        <a-button
          size="small"
          :disabled="!matrixRows.length || noneEnabled"
          @click="setAllEnabled(false)"
        >
          全部停用
        </a-button>
      </a-space>
    </div>

    <a-table
      :columns="displayColumns"
      :data-source="matrixRows"
      :pagination="pagination"
      row-key="rowKey"
      size="small"
      :scroll="{ y: 320 }"
    >
      <template #bodyCell="{ column, record }">
        <template v-if="column.key === 'enabled'">
          <a-switch
            v-model:checked="record.enabled"
            size="small"
            :disabled="disabled"
            @change="onEnabledChange"
          />
        </template>
        <template v-else-if="column.key === 'status'">
          <a-tag v-if="record.existingSku" color="green">已有 SKU</a-tag>
          <a-tag v-else color="default">待生成</a-tag>
        </template>
        <template v-else-if="column.key === 'bomSource'">
          {{ record.bomSource || '—' }}
        </template>
        <template v-else-if="column.dynamic">
          {{ record.variantValues[column.key] || '—' }}
        </template>
      </template>
    </a-table>
  </div>
</template>

<script setup>
import { computed, reactive, ref, watch } from 'vue'
import { materialGradeState } from '@/store/materialGradeStore'
import { listSkusForSpu } from '@/utils/spuSkuSave'
import { previewMatrixRows } from '@/utils/spuMatrix'

const props = defineProps({
  spu: { type: Object, default: null },
  variantAxes: { type: Array, default: () => [] },
  skuCodePattern: { type: String, default: '' },
  enabledKeys: { type: Array, default: () => null },
  disabled: { type: Boolean, default: false },
})

const emit = defineEmits(['update:enabledKeys', 'matrix-change'])

const matrixRows = ref([])
const pagination = reactive({ pageSize: 10, current: 1 })

const enabledCount = computed(() => matrixRows.value.filter((r) => r.enabled).length)
const allEnabled = computed(
  () => matrixRows.value.length > 0 && enabledCount.value === matrixRows.value.length,
)
const noneEnabled = computed(() => enabledCount.value === 0)

const displayColumns = computed(() => {
  const cols = [{ title: '#', dataIndex: 'index', width: 48 }]
  ;(props.variantAxes || []).forEach((axis) => {
    cols.push({
      title: axis.label || axis.key,
      key: axis.key,
      dynamic: true,
      width: 100,
    })
  })
  cols.push(
    { title: 'SKU编码', dataIndex: 'previewCode', key: 'previewCode', width: 140 },
    { title: '预览名称', dataIndex: 'previewName', key: 'previewName', width: 160, ellipsis: true },
    { title: 'BOM来源', key: 'bomSource', width: 80 },
    { title: '状态', key: 'status', width: 88 },
    { title: '启用', key: 'enabled', width: 64, fixed: 'right' },
  )
  return cols
})

function rebuildMatrix() {
  const spu = {
    ...(props.spu || {}),
    name: props.spu?.name || '',
    code: props.spu?.code || '',
    variantAxes: props.variantAxes || [],
    skuCodePattern: props.skuCodePattern,
    bomStrategy: props.spu?.bomStrategy,
  }
  // null/undefined：未指定，默认全部启用；数组（含空）：显式启用集合，空数组=全部停用
  const isExplicit = Array.isArray(props.enabledKeys)
  const enabledSet = isExplicit ? new Set(props.enabledKeys) : null
  const existingSkus = props.spu?.id ? listSkusForSpu(props.spu.id) : []
  const rows = previewMatrixRows(spu, {
    materialGrades: materialGradeState.items,
    existingSkus,
    enabledKeys: enabledSet,
  })
  if (!isExplicit) {
    rows.forEach((r) => {
      r.enabled = true
    })
  }
  matrixRows.value = rows

  if (!isExplicit && rows.length) {
    const keys = rows.map((r) => r.rowKey)
    emit('update:enabledKeys', keys)
  }
  emitMatrixChange()
}

watch(
  () => [props.spu, props.variantAxes, props.skuCodePattern, props.enabledKeys],
  rebuildMatrix,
  { deep: true, immediate: true },
)

function onEnabledChange() {
  const keys = matrixRows.value.filter((r) => r.enabled).map((r) => r.rowKey)
  emit('update:enabledKeys', keys)
  emitMatrixChange()
}

function setAllEnabled(enabled) {
  if (props.disabled || !matrixRows.value.length) return
  matrixRows.value.forEach((r) => {
    r.enabled = enabled
  })
  onEnabledChange()
}

function emitMatrixChange() {
  emit('matrix-change', matrixRows.value)
}

function getEnabledRows() {
  return matrixRows.value.filter((r) => r.enabled)
}

defineExpose({ getEnabledRows, rebuildMatrix })
</script>

<style scoped>
.matrix-summary-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin: 12px 0 10px;
  flex-wrap: wrap;
}

.matrix-summary {
  font-size: 13px;
}
</style>
