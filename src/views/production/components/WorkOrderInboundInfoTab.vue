<template>
  <div class="wo-inbound-tab">
    <DetailSectionCard title="入库申请">
      <a-table
        size="small"
        bordered
        row-key="id"
        :columns="appColumns"
        :data-source="appRows"
        :pagination="false"
        :scroll="{ x: appScrollX }"
        :locale="{ emptyText: '暂无入库申请' }"
      >
        <template #bodyCell="{ column, record, index }">
          <template v-if="column.key === 'index'">{{ index + 1 }}</template>
          <template v-else-if="column.key === 'status'">
            <a-tag :color="auditColor(record.status)">{{ record.status || '—' }}</a-tag>
          </template>
          <template v-else-if="column.key === 'reqNo'">
            <a v-if="record.reqId" class="link" @click="openReq(record)">{{ record.reqNo }}</a>
            <span v-else>{{ record.reqNo || '—' }}</span>
          </template>
          <template v-else-if="column.key === 'applyQty'">
            {{ record.applyQty ?? '—' }}
          </template>
          <template v-else-if="column.key === 'inboundDocNo'">
            <template v-if="(record.inboundOrders || []).length">
              <a
                v-for="(o, idx) in record.inboundOrders"
                :key="o.id || o.docNo"
                class="link"
                @click="openInbound(o)"
              >
                {{ o.docNo }}<template v-if="idx < record.inboundOrders.length - 1">、</template>
              </a>
            </template>
            <template v-else-if="record.inboundId">
              <a class="link" @click="openInbound(record)">{{ record.inboundDocNo }}</a>
            </template>
            <span v-else>{{ record.inboundDocNo || '—' }}</span>
          </template>
          <template v-else>
            {{ record[column.dataIndex] ?? '—' }}
          </template>
        </template>
      </a-table>
    </DetailSectionCard>

    <DetailSectionCard title="入库信息" class="inbound-section">
      <a-table
        size="small"
        bordered
        row-key="id"
        :columns="inboundColumns"
        :data-source="inboundRows"
        :pagination="false"
        :scroll="{ x: inboundScrollX }"
        :locale="{ emptyText: '暂无入库信息' }"
      >
        <template #bodyCell="{ column, record, index }">
          <template v-if="column.key === 'index'">{{ index + 1 }}</template>
          <template v-else-if="column.key === 'status'">
            <a-tag :color="inboundStatusColor(record.status)">{{ record.status || '—' }}</a-tag>
          </template>
          <template v-else-if="column.key === 'docNo'">
            <a v-if="record.docId" class="link" @click="openInbound(record)">{{ record.docNo }}</a>
            <span v-else>{{ record.docNo || '—' }}</span>
          </template>
          <template v-else-if="column.key === 'applyQty' || column.key === 'actualQty'">
            {{ record[column.key] ?? '—' }}
          </template>
          <template v-else>
            {{ record[column.dataIndex] ?? '—' }}
          </template>
        </template>
      </a-table>
    </DetailSectionCard>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { message } from 'ant-design-vue'
import { useRouter } from 'vue-router'
import DetailSectionCard from '@/components/DetailSectionCard.vue'
import { useTabs } from '@/composables/useTabs'
import {
  buildWorkOrderFinishedInboundAppRows,
  buildWorkOrderInboundRows,
} from '@/utils/workOrderRelatedInfo'
import {
  FINISHED_INBOUND_AUDIT,
  mobileFinishedInboundState,
} from '@/store/mobileFinishedInboundStore'
import { inboundOrderState } from '@/store/inboundOrderStore'

const props = defineProps({
  workOrder: { type: Object, required: true },
})

const router = useRouter()
const { openTab } = useTabs()

const appRows = computed(() => {
  void mobileFinishedInboundState.items
  return buildWorkOrderFinishedInboundAppRows(props.workOrder)
})

const inboundRows = computed(() => {
  void mobileFinishedInboundState.items
  void inboundOrderState.orders
  return buildWorkOrderInboundRows(props.workOrder)
})

const appColumns = [
  { title: '序号', key: 'index', width: 56, align: 'center' },
  { title: '状态', key: 'status', width: 96 },
  { title: '申请单号', key: 'reqNo', width: 150 },
  { title: '入库方式', dataIndex: 'modeLabel', width: 120 },
  { title: '产品摘要', dataIndex: 'summary', width: 160, ellipsis: true },
  { title: '申请入库数量', key: 'applyQty', width: 110, align: 'right' },
  { title: '车间', dataIndex: 'workshop', width: 100, ellipsis: true },
  { title: '入库仓库', dataIndex: 'warehouse', width: 110, ellipsis: true },
  { title: '入库单号', key: 'inboundDocNo', width: 160 },
  { title: '入库状态', dataIndex: 'inboundStatus', width: 100 },
  { title: '申请人', dataIndex: 'applicant', width: 90 },
  { title: '申请时间', dataIndex: 'createdAt', width: 160 },
]

const inboundColumns = [
  { title: '序号', key: 'index', width: 56, align: 'center' },
  { title: '状态', key: 'status', width: 90 },
  { title: '入库单号', key: 'docNo', width: 150 },
  { title: '产品名称', dataIndex: 'itemName', width: 150, ellipsis: true },
  { title: '编号', dataIndex: 'itemCode', width: 120, ellipsis: true },
  { title: '规格型号', dataIndex: 'specModel', width: 120, ellipsis: true },
  { title: '材质', dataIndex: 'material', width: 90, ellipsis: true },
  { title: '申请入库数量', key: 'applyQty', width: 110, align: 'right' },
  { title: '实际入库数量', key: 'actualQty', width: 110, align: 'right' },
  { title: '入库仓库', dataIndex: 'warehouse', width: 110, ellipsis: true },
  { title: '入库时间', dataIndex: 'inboundAt', width: 160 },
  { title: '确认人', dataIndex: 'confirmer', width: 90 },
  { title: '确认时间', dataIndex: 'confirmedAt', width: 160 },
]

const appScrollX = computed(() => appColumns.reduce((sum, col) => sum + (col.width || 100), 0))
const inboundScrollX = computed(() =>
  inboundColumns.reduce((sum, col) => sum + (col.width || 100), 0),
)

function auditColor(status) {
  if (status === FINISHED_INBOUND_AUDIT.APPROVED) return 'success'
  if (status === FINISHED_INBOUND_AUDIT.REJECTED) return 'error'
  if (status === FINISHED_INBOUND_AUDIT.PENDING) return 'warning'
  return 'default'
}

function inboundStatusColor(status) {
  if (status === '已入库' || status === '已完成' || status === '已确认') return 'success'
  if (status === '已拒绝' || status === '拒绝入库') return 'error'
  if (status === '部分入库') return 'warning'
  if (status === '待入库') return 'processing'
  return 'default'
}

function openReq(record) {
  if (!record.reqId) {
    message.info('暂无申请单详情')
    return
  }
  const path = `/production/finished-inbound/${record.reqId}`
  openTab({ path, title: '成品入库申请详情' })
  router.push(path)
}

function openInbound(record) {
  const id = record?.id || record?.docId || record?.inboundId
  if (!id) {
    message.info('暂无关联入库单')
    return
  }
  const path = `/inventory/inbound/${id}`
  openTab({ path, title: '入库单详情' })
  router.push(path)
}
</script>

<style lang="less" scoped>
.wo-inbound-tab {
  .inbound-section {
    margin-top: 8px;
  }

  .link {
    color: #1677ff;
    cursor: pointer;
  }
}
</style>
