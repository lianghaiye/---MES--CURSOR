<template>
  <div class="wo-info-tab">
    <div class="tab-title">领料信息</div>
    <a-table
      size="small"
      bordered
      row-key="id"
      :columns="columns"
      :data-source="rows"
      :pagination="false"
      :scroll="{ x: 1200 }"
      :locale="{ emptyText: '暂无领料信息' }"
    >
      <template #bodyCell="{ column, record }">
        <template v-if="column.key === 'reqNo'">
          <a v-if="record.reqId" class="link" @click="openReq(record)">{{ record.reqNo }}</a>
          <span v-else>{{ record.reqNo }}</span>
        </template>
        <template v-else-if="column.key === 'outboundNo'">
          <a v-if="record.outboundId" class="link" @click="openOutbound(record)">{{
            record.outboundNo
          }}</a>
          <span v-else>{{ record.outboundNo }}</span>
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
import { buildWorkOrderMaterialReqRows } from '@/utils/workOrderRelatedInfo'

const props = defineProps({
  workOrder: { type: Object, required: true },
})

const router = useRouter()
const { openTab } = useTabs()

const rows = computed(() => buildWorkOrderMaterialReqRows(props.workOrder))

const columns = [
  { title: '序号', dataIndex: 'index', width: 64 },
  { title: '状态', dataIndex: 'status', width: 90 },
  { title: '申请单号', key: 'reqNo', width: 150 },
  { title: '产品/摘要', dataIndex: 'summary', ellipsis: true },
  { title: '数量', dataIndex: 'qty', width: 80, align: 'right' },
  { title: '领用车间', dataIndex: 'workshop', width: 110 },
  { title: '出库单号', key: 'outboundNo', width: 150 },
  { title: '出库状态', dataIndex: 'outboundStatus', width: 90 },
  { title: '申请人', dataIndex: 'applicant', width: 90 },
  { title: '申请时间', dataIndex: 'appliedAt', width: 150 },
]

function openReq(record) {
  if (!record.reqId) {
    message.info('演示数据暂无领料单详情')
    return
  }
  const path = `/production/material-requisition/${record.reqId}`
  openTab({ path, title: '领料申请详情' })
  router.push(path)
}

function openOutbound(record) {
  if (!record.outboundId) {
    message.info('暂无关联出库单')
    return
  }
  const path = `/inventory/outbound/${record.outboundId}`
  openTab({ path, title: '出库单详情' })
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
