<template>
  <div class="packaging-variant-matrix-preview">
    <div class="matrix-summary">
      属性组合将生成 <strong>{{ matrixRows.length }}</strong> 个包装 SKU，已启用
      <strong>{{ enabledCount }}</strong> 个
    </div>

    <a-table
      :columns="displayColumns"
      :data-source="matrixRows"
      :pagination="pagination"
      row-key="rowKey"
      size="small"
      :scroll="{ y: 320, x: 900 }"
    >
      <template #bodyCell="{ column, record }">
        <template v-if="column.key === 'enabled'">
          <a-switch v-model:checked="record.enabled" size="small" @change="emitMatrixChange" />
        </template>
        <template v-else-if="column.key === 'status'">
          <a-tag v-if="record.existingSku" color="green">已有 SKU</a-tag>
          <a-tag v-else color="default">待生成</a-tag>
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
import { listSkusForPackagingSpu } from '@/utils/packagingSkuSave'
import { previewMatrixRows } from '@/utils/spuMatrix'

const props = defineProps({
  spu: { type: Object, default: null },
  variantAxes: { type: Array, default: () => [] },
  skuCodePattern: { type: String, default: '' },
})

const emit = defineEmits(['matrix-change'])

const matrixRows = ref([])
const pagination = reactive({ pageSize: 10, current: 1 })

const enabledCount = computed(() => matrixRows.value.filter((r) => r.enabled).length)

const displayColumns = computed(() => {
  const cols = [{ title: '#', dataIndex: 'index', width: 48 }]
  ;(props.variantAxes || []).forEach((axis) => {
    cols.push({
      title: axis.label || axis.key,
      key: axis.key,
      dynamic: true,
      width: 110,
    })
  })
  cols.push(
    { title: 'SKU编码', dataIndex: 'previewCode', key: 'previewCode', width: 160 },
    { title: '预览名称', dataIndex: 'previewName', key: 'previewName', width: 180, ellipsis: true },
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
  }
  const existingSkus = props.spu?.id ? listSkusForPackagingSpu(props.spu.id) : []
  const rows = previewMatrixRows(spu, { existingSkus })
  rows.forEach((r) => {
    r.enabled = r.enabled !== false
  })
  matrixRows.value = rows
  emitMatrixChange()
}

watch(() => [props.spu, props.variantAxes, props.skuCodePattern], rebuildMatrix, {
  deep: true,
  immediate: true,
})

function emitMatrixChange() {
  emit('matrix-change', matrixRows.value)
}
</script>

<style scoped>
.matrix-summary {
  margin-bottom: 10px;
  font-size: 13px;
  color: rgba(0, 0, 0, 0.65);
}
</style>
