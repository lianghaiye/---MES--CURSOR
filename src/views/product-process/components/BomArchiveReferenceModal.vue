<template>
  <a-modal
    :open="open"
    title="归档后如何处理母件中的该子件？"
    :width="880"
    :mask-closable="false"
    :footer="null"
    destroy-on-close
    @update:open="emit('update:open', $event)"
  >
    <a-alert type="info" show-icon class="ref-alert">
      <template #message>
        已下达工单使用的是 EBOM 快照，本次调整
        <strong>不会影响在制</strong>
        。
      </template>
    </a-alert>

    <p class="ref-tip">
      即将归档「{{ displayBomName }}」
      <template v-if="version">（版本 {{ version }}）</template>
      ，当前有
      <strong>{{ refs.length }}</strong>
      个母件 BOM 引用了该子件。请
      <strong>逐行</strong>
      选择每个母件的处理方式后确认归档。
    </p>

    <a-table
      :columns="refColumns"
      :data-source="refs"
      row-key="parentBomId"
      size="small"
      bordered
      :pagination="false"
      class="ref-table"
    >
      <template #bodyCell="{ column, record }">
        <template v-if="column.key === 'action'">
          <a-select
            v-model:value="rowModes[record.parentBomId]"
            size="small"
            style="width: 100%"
            :options="actionOptions"
          />
        </template>
      </template>
    </a-table>

    <div class="action-hint">
      <div>
        <strong>从母件中移除该子件（含本级）</strong>
        ：母件明细中删除该子件整行（本级及通过它带出的下级）。
      </div>
      <div>
        <strong>仅保留该子件本级，移除其下级</strong>
        ：母件仍保留该子件一行，但解除子件 BOM 引用，不再展开下级结构。
      </div>
      <div>
        <strong>不改变母件</strong>
        ：仅归档子件，该母件结构保持原样（仍指向已归档版本）。
      </div>
    </div>

    <div class="modal-footer">
      <a-button @click="handleCancel">取消</a-button>
      <a-button type="primary" @click="handleConfirm">确认归档</a-button>
    </div>
  </a-modal>
</template>

<script>
export default { name: 'BomArchiveReferenceModal' }
</script>

<script setup>
import { computed, reactive, watch } from 'vue'

const props = defineProps({
  open: { type: Boolean, default: false },
  bomName: { type: String, default: '' },
  itemName: { type: String, default: '' },
  version: { type: String, default: '' },
  refs: { type: Array, default: () => [] },
})

const emit = defineEmits(['update:open', 'confirm', 'cancel'])

/** @type {Record<string, 'removeLine'|'keepSelfClearChildren'|'none'>} */
const rowModes = reactive({})

const displayBomName = computed(() => props.itemName || props.bomName || '—')

const actionOptions = [
  { value: 'none', label: '不改变母件' },
  { value: 'keepSelfClearChildren', label: '仅保留该子件本级，移除其下级' },
  { value: 'removeLine', label: '从母件中移除该子件（含本级）' },
]

const refColumns = [
  { title: '母件产品', dataIndex: 'parentItemName', width: 140, ellipsis: true },
  { title: '母件 BOM', dataIndex: 'parentBomName', width: 160, ellipsis: true },
  { title: '母件版本', dataIndex: 'parentVersion', width: 88 },
  { title: '引用行数', dataIndex: 'count', width: 80, align: 'center' },
  { title: '处理方式', key: 'action', width: 260 },
]

watch(
  () => props.open,
  (open) => {
    if (!open) return
    Object.keys(rowModes).forEach((k) => delete rowModes[k])
    props.refs.forEach((ref) => {
      rowModes[ref.parentBomId] = 'none'
    })
  },
)

function handleCancel() {
  emit('update:open', false)
  emit('cancel')
}

function handleConfirm() {
  const removeRefs = []
  const keepSelfRefs = []
  props.refs.forEach((ref) => {
    const mode = rowModes[ref.parentBomId] || 'none'
    if (mode === 'removeLine') removeRefs.push(ref)
    else if (mode === 'keepSelfClearChildren') keepSelfRefs.push(ref)
  })
  emit('update:open', false)
  emit('confirm', { removeRefs, keepSelfRefs })
}
</script>

<style lang="less" scoped>
.ref-alert {
  margin-bottom: 12px;
}

.ref-tip {
  margin: 0 0 12px;
  line-height: 1.7;
  color: rgba(0, 0, 0, 0.75);
}

.ref-table {
  margin-bottom: 12px;
}

.action-hint {
  font-size: 12px;
  color: rgba(0, 0, 0, 0.45);
  line-height: 1.7;
  margin-bottom: 16px;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.modal-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: 8px;
  padding-top: 4px;
}
</style>
