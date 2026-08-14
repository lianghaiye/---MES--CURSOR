<template>
  <div class="wo-info-tab">
    <div class="tab-title">出库信息</div>
    <a-table
      size="small"
      bordered
      row-key="id"
      :columns="columns"
      :data-source="rows"
      :pagination="false"
      :scroll="{ x: scrollX }"
      :locale="{ emptyText: '暂无出库信息' }"
    >
      <template #bodyCell="{ column, record, index }">
        <template v-if="column.key === 'index'">{{ index + 1 }}</template>
        <template v-else-if="column.key === 'outboundOrderNo'">
          <a
            v-if="record.outboundId || record.outboundOrderNo"
            class="link"
            @click="openOutbound(record)"
          >
            {{ record.outboundOrderNo || '—' }}
          </a>
          <span v-else>—</span>
        </template>
        <template v-else-if="column.key === 'applyQty'">
          {{ formatQty(record.applyQty) }}
        </template>
        <template v-else-if="column.key === 'actualQty'">
          {{ formatQty(record.actualQty) }}
        </template>
        <template v-else>
          {{ record[column.dataIndex] || '—' }}
        </template>
      </template>
    </a-table>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { message } from 'ant-design-vue'
import { useRouter } from 'vue-router'
import { useTabs } from '@/composables/useTabs'
import { buildWorkOrderOutboundIssueLines } from '@/utils/workOrderRelatedInfo'
import {
  createOutboundIssueLineColumns,
  getOutboundIssueLineScrollX,
} from '@/utils/outboundIssueLines'
import { formatQty } from '@/utils/numberFormat'
import { outboundState } from '@/store/outboundStore'

const props = defineProps({
  workOrder: { type: Object, required: true },
})

const router = useRouter()
const { openTab } = useTabs()

const columns = createOutboundIssueLineColumns()
const scrollX = getOutboundIssueLineScrollX(columns)

const rows = computed(() => {
  void outboundState.orders
  return buildWorkOrderOutboundIssueLines(props.workOrder)
})

function openOutbound(record) {
  const id = record?.outboundId
  if (!id) {
    message.info('暂无关联出库单')
    return
  }
  const path = `/inventory/outbound/${id}`
  openTab(path, '出库单详情')
  router.push(path)
}
</script>

<style lang="less" scoped>
.wo-info-tab {
  .tab-title {
    font-weight: 600;
    margin-bottom: 10px;
  }
  .link {
    color: #1677ff;
    cursor: pointer;
  }
}
</style>
