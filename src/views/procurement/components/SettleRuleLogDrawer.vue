<template>
  <a-drawer :open="open" :title="title" width="720" destroy-on-close @close="handleClose">
    <a-table
      :columns="columns"
      :data-source="logs"
      row-key="id"
      size="small"
      :pagination="{ pageSize: 10 }"
      :scroll="{ x: 680 }"
    >
      <template #bodyCell="{ column, record }">
        <template v-if="column.key === 'status'">
          <a-tag :color="statusColor(record.status)">{{ statusText(record.status) }}</a-tag>
        </template>
        <template v-else-if="column.key === 'trigger'">
          {{ record.trigger === 'schedule' ? '定时' : '试跑' }}
        </template>
        <template v-else-if="column.key === 'window'">
          <span v-if="record.periodStart">{{ record.periodStart }} ~ {{ record.periodEnd }}</span>
          <span v-else>—</span>
        </template>
        <template v-else-if="column.key === 'settleNos'">
          {{ (record.settleNos || []).join('、') || '—' }}
        </template>
        <template v-else>
          {{ record[column.dataIndex] || '—' }}
        </template>
      </template>
    </a-table>
  </a-drawer>
</template>

<script setup>
import { computed } from 'vue'
import { purchaseSettleRuleState, listSettleRuleLogs } from '@/store/purchaseSettleRuleStore'

const props = defineProps({
  open: { type: Boolean, default: false },
  ruleId: { type: String, default: '' },
})
const emit = defineEmits(['update:open'])

const title = computed(() => (props.ruleId ? '规则执行日志' : '全部执行日志'))

const logs = computed(() => {
  void purchaseSettleRuleState.logs
  return listSettleRuleLogs(props.ruleId || '')
})

const columns = [
  { title: '时间', dataIndex: 'createdAt', key: 'createdAt', width: 160 },
  { title: '规则', dataIndex: 'ruleName', key: 'ruleName', width: 140, ellipsis: true },
  { title: '触发', key: 'trigger', width: 70 },
  { title: '状态', key: 'status', width: 80 },
  { title: '扫描窗', key: 'window', width: 180 },
  { title: '结算单', key: 'settleNos', width: 160, ellipsis: true },
  { title: '说明', dataIndex: 'message', key: 'message', ellipsis: true },
]

function statusColor(s) {
  if (s === 'success') return 'green'
  if (s === 'partial') return 'orange'
  if (s === 'skipped') return 'default'
  return 'red'
}

function statusText(s) {
  const map = { success: '成功', partial: '部分', skipped: '跳过', failed: '失败' }
  return map[s] || s
}

function handleClose() {
  emit('update:open', false)
}
</script>
