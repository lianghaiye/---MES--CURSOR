<template>
  <div class="inbound-detail-page">
    <a-spin :spinning="loading">
      <template v-if="record">
        <div class="page-header">
          <div class="header-left">
            <span class="page-title">{{ record.docNo }}</span>
            <a-tag :color="statusColor(record.status)">{{ record.status }}</a-tag>
            <span class="sub-type">{{ record.inboundType }}</span>
          </div>
          <a-space>
            <template v-if="record.status === '待审批'">
              <a-button type="primary" size="small" @click="handleApprovePass">通过</a-button>
              <a-button size="small" danger @click="handleApproveReject">拒绝</a-button>
              <a-button size="small" @click="goBack">返回列表</a-button>
            </template>
            <template v-else-if="record.status === '待处理'">
              <a-button type="primary" size="small" @click="handleConfirmInbound"
                >确认入库</a-button
              >
              <a-button size="small" @click="openEdit">编辑</a-button>
              <a-button size="small" danger @click="handleDelete">删除</a-button>
            </template>
            <template v-else>
              <a-button size="small" @click="goBack">返回列表</a-button>
            </template>
          </a-space>
        </div>

        <div class="section-card">
          <div class="section-title">基本信息</div>
          <a-descriptions bordered size="small" :column="3">
            <a-descriptions-item label="入库单号">{{ record.docNo }}</a-descriptions-item>
            <a-descriptions-item label="入库类型">{{ record.inboundType }}</a-descriptions-item>
            <a-descriptions-item label="状态">{{ record.status }}</a-descriptions-item>
            <a-descriptions-item label="入库日期">{{
              record.inboundDate || '—'
            }}</a-descriptions-item>
            <a-descriptions-item label="送货日期">{{
              record.deliveryDate || '—'
            }}</a-descriptions-item>
            <a-descriptions-item label="入库仓库">{{
              record.warehouse || '—'
            }}</a-descriptions-item>
            <a-descriptions-item label="仓管员">{{
              record.warehouseKeeper || '—'
            }}</a-descriptions-item>
            <a-descriptions-item label="物品类型">{{ record.itemType || '—' }}</a-descriptions-item>
            <a-descriptions-item label="供应商">{{ record.supplier || '—' }}</a-descriptions-item>
            <a-descriptions-item label="源单号">
              <a v-if="record.sourceOrderNo" class="link-code" @click="goSource">{{
                record.sourceOrderNo
              }}</a>
              <span v-else>—</span>
            </a-descriptions-item>
            <a-descriptions-item label="来源车间">{{
              record.sourceWorkshop || '—'
            }}</a-descriptions-item>
            <a-descriptions-item label="发票号码">{{
              record.invoiceNo || '—'
            }}</a-descriptions-item>
            <a-descriptions-item label="经手人">{{ record.handler || '—' }}</a-descriptions-item>
            <a-descriptions-item label="创建人">{{ record.creator || '—' }}</a-descriptions-item>
            <a-descriptions-item label="创建时间">{{
              record.createdAt || '—'
            }}</a-descriptions-item>
            <a-descriptions-item label="确认人">{{ record.confirmer || '—' }}</a-descriptions-item>
            <a-descriptions-item label="确认时间">{{
              record.confirmedAt || '—'
            }}</a-descriptions-item>
            <a-descriptions-item label="审批人">{{ record.approver || '—' }}</a-descriptions-item>
            <a-descriptions-item label="审批时间">{{
              record.approvedAt || '—'
            }}</a-descriptions-item>
            <a-descriptions-item label="备注" :span="3">{{
              record.remark || '—'
            }}</a-descriptions-item>
          </a-descriptions>
        </div>

        <div class="section-card">
          <div class="section-title">入库明细</div>
          <a-table
            :columns="lineColumns"
            :data-source="record.lineItems || []"
            row-key="id"
            size="small"
            bordered
            :pagination="false"
            :scroll="{ x: lineScrollX }"
          >
            <template #bodyCell="{ column, record: line, index }">
              <template v-if="column.key === 'index'">{{ index + 1 }}</template>
              <template v-else-if="column.key === 'stockQty'">
                {{ formatQty(line.stockQty) }}
              </template>
              <template v-else-if="column.key === 'warehouseStockQty'">
                {{ formatQty(line.warehouseStockQty) }}
              </template>
              <template v-else-if="column.key === 'qty'">
                {{ formatQty(line.qty) }}
              </template>
              <template v-else-if="column.key === 'lineSource'">
                {{ line.lineSource || '—' }}
              </template>
              <template v-else-if="column.key === 'locationNo'">
                {{ line.locationNo || '—' }}
              </template>
              <template v-else-if="column.key === 'sourceDocNo'">
                {{ line.sourceDocNo || '—' }}
              </template>
            </template>
          </a-table>
        </div>
      </template>
      <a-empty v-else-if="!loading" description="未找到该入库单" />
    </a-spin>
  </div>
</template>

<script>
export default { name: 'InboundOrderDetailView' }
</script>

<script setup>
import { computed, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useTabs } from '@/composables/useTabs'
import { openCreateTab } from '@/utils/openCreateTab'
import { Modal, message } from 'ant-design-vue'
import {
  getInboundOrderById,
  approveInboundOrder,
  rejectInboundOrder,
  confirmInboundOrders,
  deleteInboundOrder,
} from '@/store/inboundOrderStore'
import { resolveInboundSourceRoute } from '@/utils/inboundSourceLink'
import { inboundDetailLineColumns } from '@/utils/inboundLineColumns'
import { enrichInboundLine } from '@/utils/inboundLineHelpers'

const route = useRoute()
const router = useRouter()
const { openTab } = useTabs()
const loading = ref(false)
const record = ref(null)

const lineColumns = inboundDetailLineColumns
const lineScrollX = computed(() => lineColumns.reduce((s, c) => s + (c.width || 80), 0))

function formatQty(val) {
  if (val == null || val === '') return '—'
  return Number(val).toLocaleString(undefined, { maximumFractionDigits: 3 })
}

function reload() {
  const row = getInboundOrderById(route.params.id)
  record.value = row
    ? {
        ...row,
        lineItems: (row.lineItems || []).map((l) => enrichInboundLine({ ...l })),
      }
    : null
}

function statusColor(status) {
  if (status === '已完成') return 'success'
  if (status === '已拒绝') return 'error'
  if (status === '待审批') return 'warning'
  return 'processing'
}

watch(
  () => route.params.id,
  () => {
    loading.value = true
    reload()
    loading.value = false
  },
  { immediate: true },
)

function goBack() {
  router.push('/inventory/inbound')
}

function goSource() {
  const r = resolveInboundSourceRoute(record.value)
  if (r?.path) router.push(r.path)
}

function openEdit() {
  if (!record.value?.id) return
  openCreateTab(router, openTab, {
    path: `/inventory/inbound/${record.value.id}/edit`,
    title: `编辑入库单 ${record.value.docNo || ''}`.trim(),
  })
}

function handleApprovePass() {
  Modal.confirm({
    title: `通过审批 ${record.value.docNo}？`,
    content: '通过后状态变为「待处理」，可进行确认入库。',
    onOk: () => {
      const res = approveInboundOrder(record.value.id)
      if (res.ok) {
        message.success('审批已通过')
        reload()
      } else message.warning(res.message)
    },
  })
}

function handleApproveReject() {
  Modal.confirm({
    title: `拒绝入库单 ${record.value.docNo}？`,
    okType: 'danger',
    onOk: () => {
      const res = rejectInboundOrder(record.value.id)
      if (res.ok) {
        message.success('已拒绝')
        reload()
      } else message.warning(res.message)
    },
  })
}

function handleConfirmInbound() {
  Modal.confirm({
    title: `确认入库 ${record.value.docNo}？`,
    onOk: () => {
      const { count, blocked } = confirmInboundOrders([record.value.id])
      if (blocked.length) {
        message.warning(blocked.map((b) => b.message).join('；'))
        return
      }
      if (count > 0) {
        message.success('已确认入库')
        reload()
      } else {
        message.warning('确认入库失败')
      }
    },
  })
}

function handleDelete() {
  Modal.confirm({
    title: `确认删除入库单 ${record.value.docNo}？`,
    okType: 'danger',
    onOk: () => {
      if (deleteInboundOrder(record.value.id)) {
        message.success('已删除')
        goBack()
      } else {
        message.warning('当前状态不可删除')
      }
    },
  })
}
</script>

<style lang="less" scoped>
.inbound-detail-page {
  .page-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 16px;
  }

  .header-left {
    display: flex;
    align-items: center;
    gap: 12px;
  }

  .page-title {
    font-size: 18px;
    font-weight: 600;
  }

  .sub-type {
    color: #8c8c8c;
  }

  .section-card {
    background: #fff;
    border-radius: 4px;
    padding: 16px;
    margin-bottom: 16px;
  }

  .section-title {
    font-weight: 600;
    margin-bottom: 12px;
  }

  .link-code {
    color: #1677ff;
  }
}
</style>
