<template>
  <div class="wo-info-tab">
    <div class="tab-title">入库信息</div>
    <a-table
      size="small"
      bordered
      row-key="id"
      :columns="columns"
      :data-source="rows"
      :pagination="false"
      :scroll="{ x: 1200 }"
      :locale="{ emptyText: '暂无入库信息' }"
    >
      <template #bodyCell="{ column, record }">
        <template v-if="column.key === 'docNo'">
          <a v-if="record.docId" class="link" @click="openInbound(record)">{{ record.docNo }}</a>
          <span v-else>{{ record.docNo }}</span>
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
import { buildWorkOrderInboundRows } from '@/utils/workOrderRelatedInfo'

const props = defineProps({
  workOrder: { type: Object, required: true },
})

const router = useRouter()
const { openTab } = useTabs()

const rows = computed(() => buildWorkOrderInboundRows(props.workOrder))

const columns = [
  { title: '序号', dataIndex: 'index', width: 64 },
  { title: '状态', dataIndex: 'status', width: 90 },
  { title: '入库单号', key: 'docNo', width: 160 },
  { title: '产品/摘要', dataIndex: 'summary', ellipsis: true },
  { title: '数量', dataIndex: 'qty', width: 80, align: 'right' },
  { title: '入库仓库', dataIndex: 'warehouse', width: 110 },
  { title: '创建人', dataIndex: 'creator', width: 90 },
  { title: '创建时间', dataIndex: 'createdAt', width: 150 },
  { title: '确认人', dataIndex: 'confirmer', width: 90 },
  { title: '确认时间', dataIndex: 'confirmedAt', width: 150 },
]

function openInbound(record) {
  if (!record.docId) {
    message.info('演示数据暂无入库单详情')
    return
  }
  const path = `/inventory/inbound/${record.docId}`
  openTab({ path, title: '入库单详情' })
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
