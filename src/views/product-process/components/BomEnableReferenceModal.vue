<template>
  <a-modal
    :open="open"
    title="审核发布确认"
    :width="880"
    :mask-closable="false"
    :footer="null"
    destroy-on-close
    @update:open="emit('update:open', $event)"
  >
    <a-alert type="warning" show-icon class="ref-alert" message="检测到母件 BOM 引用" />

    <p class="ref-tip">
      【{{ displayProductName }}】待发布新版本
      <strong>{{ newVersion || '—' }}</strong>
      ，当前仍有
      <strong>{{ refs.length }}</strong>
      个母件 BOM 引用其生效版本
      <strong>{{ currentVersion || '—' }}</strong>
      。请
      <strong>逐行</strong>
      选择每个母件的处理方式后确认发布。
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
        <strong>同步升级引用版本</strong>
        ：将该母件中对本子件的引用改到新版本
        {{ newVersion || '—' }}。
      </div>
      <div>
        <strong>不升级（保持引用旧版）</strong>
        ：仅发布当前 BOM，该母件仍指向生效旧版
        {{ currentVersion || '—' }}（发布后旧版将归档）。
      </div>
    </div>

    <div class="modal-footer">
      <a-button @click="handleReject">不通过</a-button>
      <a-button type="primary" @click="handleConfirm">确认发布</a-button>
    </div>
  </a-modal>
</template>

<script>
export default { name: 'BomEnableReferenceModal' }
</script>

<script setup>
import { computed, reactive, watch } from 'vue'

const props = defineProps({
  open: { type: Boolean, default: false },
  bomName: { type: String, default: '' },
  productName: { type: String, default: '' },
  newVersion: { type: String, default: '' },
  currentVersion: { type: String, default: '' },
  refs: { type: Array, default: () => [] },
})

const emit = defineEmits(['update:open', 'confirm'])

/** @type {Record<string, 'upgrade'|'keep'>} */
const rowModes = reactive({})

const displayProductName = computed(() => props.productName || props.bomName || '—')

const actionOptions = [
  { value: 'upgrade', label: '同步升级引用版本' },
  { value: 'keep', label: '不升级（保持引用旧版）' },
]

const refColumns = [
  {
    title: '母件产品',
    dataIndex: 'parentItemLabel',
    key: 'parentItemLabel',
    width: 220,
    ellipsis: true,
  },
  { title: '母件 BOM', dataIndex: 'parentBomName', width: 160, ellipsis: true },
  { title: '母件版本', dataIndex: 'parentVersion', width: 88 },
  { title: '引用行数', dataIndex: 'count', width: 80, align: 'center' },
  { title: '处理方式', key: 'action', width: 220 },
]

watch(
  () => props.open,
  (open) => {
    if (!open) return
    Object.keys(rowModes).forEach((k) => delete rowModes[k])
    props.refs.forEach((ref) => {
      rowModes[ref.parentBomId] = 'upgrade'
    })
  },
)

function handleReject() {
  emit('update:open', false)
  emit('confirm', { action: 'reject', upgradeRefs: [], keepRefs: [] })
}

function handleConfirm() {
  const upgradeRefs = []
  const keepRefs = []
  props.refs.forEach((ref) => {
    const mode = rowModes[ref.parentBomId] || 'upgrade'
    if (mode === 'keep') keepRefs.push(ref)
    else upgradeRefs.push(ref)
  })
  emit('update:open', false)
  emit('confirm', { action: 'approve', upgradeRefs, keepRefs })
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
