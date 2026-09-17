<template>
  <a-drawer :open="open" :title="drawerTitle" width="780" destroy-on-close @close="handleClose">
    <div v-if="lineRow" class="sn-drawer-body">
      <div class="subtitle">
        <span>销售单号：{{ lineRow.orderNo || '—' }}</span>
        <span class="sep">·</span>
        <span>客户：{{ lineRow.customerName || '—' }}</span>
      </div>

      <a-table
        :columns="columns"
        :data-source="displayLabels"
        row-key="id"
        size="small"
        bordered
        :pagination="false"
        :scroll="{ x: 720, y: 420 }"
        :row-class-name="rowClassName"
        :locale="{ emptyText: '本行暂无工业标识 SN' }"
      >
        <template #bodyCell="{ column, record }">
          <template v-if="column.key === 'labelCode'">
            <a-space :size="4">
              <span>{{ record.labelCode || '—' }}</span>
              <a-tag v-if="isHighlighted(record.labelCode)" color="processing" size="small"
                >命中</a-tag
              >
            </a-space>
          </template>
          <template v-else-if="column.key === 'status'">
            <a-tag :color="record.status === '有效' ? 'success' : 'default'">
              {{ record.status || '—' }}
            </a-tag>
          </template>
          <template v-else-if="column.key === 'engraveStatus'">
            <a-tag :color="isEngraved(record) ? 'success' : 'orange'">
              {{ isEngraved(record) ? '已刻录' : record.engraveStatus || '待刻录' }}
            </a-tag>
          </template>
          <template v-else-if="column.key === 'action'">
            <a class="link-code" @click.prevent="goLabelManagement(record)">标识管理</a>
          </template>
          <template v-else>
            {{ record[column.dataIndex] ?? '—' }}
          </template>
        </template>
      </a-table>
    </div>
    <a-empty v-else description="未选择销售明细行" />

    <template #footer>
      <div class="drawer-footer">
        <a-button @click="handleClose">关闭</a-button>
        <a-button type="primary" :disabled="!lineRow?.orderId" @click="openSalesOrder">
          打开销售订单
        </a-button>
      </div>
    </template>
  </a-drawer>
</template>

<script setup>
import { computed } from 'vue'
import { useRouter } from 'vue-router'
import { useTabs } from '@/composables/useTabs'
import { industrialLabelState } from '@/store/industrialLabelStore'
import { isLabelQueryable } from '@/utils/salesSnLookup'

const props = defineProps({
  open: Boolean,
  lineRow: { type: Object, default: null },
  highlightLabelCodes: { type: Array, default: () => [] },
})

const emit = defineEmits(['update:open'])

const router = useRouter()
const { openTab } = useTabs()

const columns = [
  { key: 'labelCode', title: 'SN 码', width: 200, fixed: 'left' },
  { key: 'status', title: '标识状态', width: 88 },
  { key: 'engraveStatus', title: '刻录/装牌', width: 100 },
  { key: 'requestOrderNo', title: '申请单号', dataIndex: 'requestOrderNo', width: 150 },
  { key: 'regTime', title: '注册时间', dataIndex: 'regTime', width: 160 },
  { key: 'action', title: '操作', width: 100, fixed: 'right' },
]

const highlightSet = computed(() => {
  const set = new Set()
  for (const code of props.highlightLabelCodes || []) {
    const n = String(code || '')
      .trim()
      .toLowerCase()
    if (n) set.add(n)
  }
  return set
})

const drawerTitle = computed(() => {
  const name = props.lineRow?.productName || '—'
  return `SN 明细 · ${name}`
})

const displayLabels = computed(() => {
  void industrialLabelState.labels
  const lineId = props.lineRow?.lineId
  if (!lineId) return []
  const list = (industrialLabelState.labels || []).filter(
    (l) => isLabelQueryable(l) && l.salesLineId === lineId,
  )
  const highlighted = []
  const rest = []
  for (const lbl of list) {
    if (isHighlighted(lbl.labelCode)) highlighted.push(lbl)
    else rest.push(lbl)
  }
  return [...highlighted, ...rest]
})

function isHighlighted(labelCode) {
  const n = String(labelCode || '')
    .trim()
    .toLowerCase()
  return n ? highlightSet.value.has(n) : false
}

function isEngraved(record) {
  return Boolean(record?.nameplateMountedAt || record?.engraveStatus === '已刻录')
}

function rowClassName(record) {
  return isHighlighted(record?.labelCode) ? 'sn-hit-row' : ''
}

function handleClose() {
  emit('update:open', false)
}

function goLabelManagement(lbl) {
  const path = '/industrial-id/label-management'
  openTab(path, '标识管理')
  router.push({
    path,
    query: { labelCode: lbl.labelCode, batchNo: lbl.batchNo || '' },
  })
}

function openSalesOrder() {
  const row = props.lineRow
  if (!row?.orderId) return
  const path = `/sales/orders/${row.orderId}?tab=industrial-label`
  openTab(path, `销售订单 ${row.orderNo || ''}`)
  router.push({
    name: 'sales-orders-detail',
    params: { id: row.orderId },
    query: { tab: 'industrial-label' },
  })
  handleClose()
}
</script>

<style lang="less" scoped>
.sn-drawer-body {
  .subtitle {
    margin-bottom: 12px;
    color: rgba(0, 0, 0, 0.65);
    font-size: 13px;

    .sep {
      margin: 0 6px;
      color: rgba(0, 0, 0, 0.25);
    }
  }
}

.drawer-footer {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
}

.link-code {
  color: #1677ff;
  cursor: pointer;

  &:hover {
    color: #4096ff;
  }
}

:deep(.sn-hit-row) > td {
  background: #e6f4ff !important;
}
</style>
