<template>
  <a-modal
    :open="open"
    title="审核发布确认"
    :width="720"
    :mask-closable="false"
    :footer="null"
    destroy-on-close
    @update:open="emit('update:open', $event)"
  >
    <a-alert type="warning" show-icon class="ref-alert" message="检测到父级 BOM 引用" />

    <p class="ref-tip">
      【{{ displayProductName }}】待发布新版本
      <strong>{{ newVersion || '—' }}</strong>
      ，当前仍有
      <strong>{{ refs.length }}</strong>
      个父级 BOM 引用其生效版本
      <strong>{{ currentVersion || '—' }}</strong>
      。请勾选需要同步升级的父级 BOM，并选择审核处理方式。
    </p>

    <a-table
      :columns="refColumns"
      :data-source="refs"
      row-key="parentBomId"
      size="small"
      bordered
      :pagination="false"
      :row-selection="rowSelection"
      class="ref-table"
    />

    <div class="action-hint">处理方式说明：「通过并升级」仅更新已勾选的父级引用；「通过但不升级」仅发布当前 BOM；「不通过」取消本次审核发布。</div>

    <div class="modal-footer">
      <a-button @click="handleAction('reject')">不通过</a-button>
      <a-space>
        <a-button @click="handleAction('approve-only')">通过但不升级</a-button>
        <a-button type="primary" @click="handleAction('upgrade')">通过并升级</a-button>
      </a-space>
    </div>
  </a-modal>
</template>

<script setup>
import { computed, ref, watch } from 'vue'
import { message } from 'ant-design-vue'

const props = defineProps({
  open: { type: Boolean, default: false },
  bomName: { type: String, default: '' },
  productName: { type: String, default: '' },
  newVersion: { type: String, default: '' },
  currentVersion: { type: String, default: '' },
  refs: { type: Array, default: () => [] },
})

const emit = defineEmits(['update:open', 'confirm'])

const selectedRowKeys = ref([])

const displayProductName = computed(() => props.productName || props.bomName || '—')

const refColumns = [
  { title: '父级产品', dataIndex: 'parentItemName', width: 150, ellipsis: true },
  { title: '父级 BOM', dataIndex: 'parentBomName', width: 180, ellipsis: true },
  { title: '父级版本', dataIndex: 'parentVersion', width: 96 },
  { title: '引用行数', dataIndex: 'count', width: 88, align: 'center' },
]

const rowSelection = computed(() => ({
  selectedRowKeys: selectedRowKeys.value,
  onChange: (keys) => {
    selectedRowKeys.value = keys
  },
}))

watch(
  () => props.open,
  (open) => {
    if (!open) return
    selectedRowKeys.value = props.refs.map((ref) => ref.parentBomId)
  },
)

function getSelectedRefs() {
  const keySet = new Set(selectedRowKeys.value)
  return props.refs.filter((ref) => keySet.has(ref.parentBomId))
}

function handleAction(action) {
  if (action === 'reject') {
    emit('update:open', false)
    emit('confirm', { action: 'reject', selectedRefs: [] })
    return
  }

  if (action === 'upgrade') {
    const selectedRefs = getSelectedRefs()
    if (!selectedRefs.length) {
      message.warning('请至少勾选一个需要升级的父级 BOM')
      return
    }
    emit('update:open', false)
    emit('confirm', { action: 'upgrade', selectedRefs })
    return
  }

  emit('update:open', false)
  emit('confirm', { action: 'approve-only', selectedRefs: [] })
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
  line-height: 1.6;
  margin-bottom: 16px;
}

.modal-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding-top: 4px;
}
</style>
