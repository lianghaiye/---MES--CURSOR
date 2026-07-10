<template>
  <div class="outbound-detail-page">
    <a-spin :spinning="loading">
      <template v-if="record">
        <div class="page-header">
          <div class="header-left">
            <span class="page-title">{{ record.docNo }}</span>
            <a-tag :color="outboundStatusColor(record.status)">{{ record.status }}</a-tag>
            <span class="sub-type">{{ record.outboundType }}</span>
          </div>
          <a-space>
            <template v-if="record.status === '待处理'">
              <a-button
                v-if="canApproveOutbound(record)"
                type="primary"
                size="small"
                @click="handleApprove"
              >
                审批
              </a-button>
              <a-button v-if="canEditOutbound(record)" size="small" @click="openEdit">
                编辑
              </a-button>
              <a-button v-if="canDeleteOutbound(record)" size="small" danger @click="handleDelete">
                删除
              </a-button>
              <a-button size="small" @click="goBack">返回列表</a-button>
            </template>
            <template v-else-if="record.status === '待出库'">
              <a-button
                v-if="canConfirm(record)"
                type="primary"
                size="small"
                @click="handleConfirmOutbound"
              >
                确认出库
              </a-button>
              <a-button v-if="canEditOutbound(record)" size="small" @click="openEdit">
                编辑
              </a-button>
              <a-button v-if="canDeleteOutbound(record)" size="small" danger @click="handleDelete">
                删除
              </a-button>
              <a-button v-if="canInitiateFactoryQc(record)" size="small" @click="handleInitiateQc">
                {{ initiateQcActionLabel(record) }}
              </a-button>
            </template>
            <template v-else>
              <a-button size="small" @click="goBack">返回列表</a-button>
            </template>
          </a-space>
        </div>

        <div class="section-card">
          <div class="section-title">基本信息</div>
          <a-descriptions bordered size="small" :column="3">
            <a-descriptions-item label="出库单号">{{ record.docNo }}</a-descriptions-item>
            <a-descriptions-item label="出库类型">{{ record.outboundType }}</a-descriptions-item>
            <a-descriptions-item label="状态">{{ record.status }}</a-descriptions-item>
            <a-descriptions-item label="出库仓库">{{
              record.warehouse || '—'
            }}</a-descriptions-item>
            <a-descriptions-item label="经手人">{{ record.handler || '—' }}</a-descriptions-item>
            <a-descriptions-item label="领用部门">{{
              record.requisitionDept || '—'
            }}</a-descriptions-item>
            <a-descriptions-item label="出库时间">{{
              record.outboundTime || '—'
            }}</a-descriptions-item>
            <a-descriptions-item label="源单编号">
              <a v-if="record.sourceOrderNo" class="link-code" @click="goSource">{{
                record.sourceOrderNo
              }}</a>
              <span v-else>—</span>
            </a-descriptions-item>
            <a-descriptions-item label="销售单号">
              <a v-if="record.salesOrderNo" class="link-code" @click="goSalesOrder">{{
                record.salesOrderNo
              }}</a>
              <span v-else>—</span>
            </a-descriptions-item>
            <a-descriptions-item label="出库总重量(kg)">
              {{ record.totalWeight != null ? record.totalWeight : '—' }}
            </a-descriptions-item>
            <a-descriptions-item label="仓管员">{{
              record.warehouseKeeper || '—'
            }}</a-descriptions-item>
            <a-descriptions-item label="所在车间">{{ record.workshop || '—' }}</a-descriptions-item>
            <a-descriptions-item label="创建人">{{ record.creator || '—' }}</a-descriptions-item>
            <a-descriptions-item label="创建时间">{{
              record.createdAt || '—'
            }}</a-descriptions-item>
            <a-descriptions-item label="审核时间">{{
              record.auditDate || '—'
            }}</a-descriptions-item>
            <a-descriptions-item label="审核人">{{ record.auditor || '—' }}</a-descriptions-item>
            <a-descriptions-item label="完成日期">{{
              record.completedAt || '—'
            }}</a-descriptions-item>
            <a-descriptions-item label="出厂质检">
              <a v-if="linkedQc" class="link-code" @click="goFactoryQc">{{ linkedQc.qcNo }}</a>
              <span v-else>—</span>
            </a-descriptions-item>
            <a-descriptions-item label="备注" :span="3">{{
              record.remark || '—'
            }}</a-descriptions-item>
          </a-descriptions>
        </div>

        <div class="section-card">
          <div class="section-title">出库明细</div>
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
              <template v-else-if="column.key === 'locationNo'">
                {{ line.locationNo || '—' }}
              </template>
              <template v-else-if="column.key === 'shipQty'">
                {{ formatQty(line.shipQty) }}
              </template>
              <template v-else-if="column.key === 'weight'">
                {{ line.weight != null ? line.weight : '—' }}
              </template>
              <template v-else-if="column.key === 'barcodeBatchNo'">
                {{ line.barcodeBatchNo || '—' }}
              </template>
              <template v-else-if="column.key === 'unitPrice'">
                {{ line.unitPrice != null ? line.unitPrice : '—' }}
              </template>
              <template v-else-if="column.key === 'totalPrice'">
                {{ line.totalPrice != null ? line.totalPrice : '—' }}
              </template>
              <template v-else-if="column.key === 'lineSource'">
                {{ line.lineSource || '—' }}
              </template>
              <template v-else-if="column.key === 'sourceDocNo'">
                {{ line.sourceDocNo || '—' }}
              </template>
            </template>
            <template #summary>
              <a-table-summary v-if="record.lineItems?.length">
                <a-table-summary-row class="line-summary-row">
                  <a-table-summary-cell
                    v-for="(col, colIndex) in lineColumns"
                    :key="col.key"
                    :index="colIndex"
                    :align="col.align"
                  >
                    <template v-if="col.key === 'index'">合计</template>
                    <template v-else-if="col.key === 'itemCode'">
                      项数 {{ lineSummary.lineCount }}
                    </template>
                    <template v-else-if="col.key === 'shipQty'">
                      {{ formatQty(lineSummary.shipQtyTotal) }}
                    </template>
                    <template v-else-if="col.key === 'totalPrice'">
                      {{ formatMoney(lineSummary.totalPrice) }}
                    </template>
                  </a-table-summary-cell>
                </a-table-summary-row>
              </a-table-summary>
            </template>
          </a-table>
        </div>
      </template>
      <a-empty v-else-if="!loading" description="未找到该出库单" />
    </a-spin>

    <OutboundOrderFormModal v-model:open="formOpen" :edit-record="record" @saved="onFormSaved" />
  </div>
</template>

<script>
export default { name: 'OutboundOrderDetailView' }
</script>

<script setup>
import { computed, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { Modal, message } from 'ant-design-vue'
import { outboundStatusColor } from '@/mock/outboundOptions'
import {
  getOutboundOrderById,
  confirmOutbound,
  validateOutboundForConfirm,
  initiateFactoryQcFromOutbound,
  canInitiateFactoryQc,
  approveOutboundOrder,
  canApproveOutbound,
  canEditOutbound,
  canDeleteOutbound,
  deleteOutboundOrder,
} from '@/store/outboundStore'
import { getFactoryQcById, qcResultBlocksOutbound } from '@/store/factoryQcStore'
import { findSalesOrderByOrderNo } from '@/store/salesOrderStore'
import { tabStore, useTabs } from '@/composables/useTabs'
import { outboundDetailLineColumns } from '@/utils/outboundLineColumns'
import { enrichOutboundLine } from '@/utils/outboundLineHelpers'
import OutboundOrderFormModal from './components/OutboundOrderFormModal.vue'

const route = useRoute()
const router = useRouter()
const { openTab } = useTabs()
const loading = ref(false)
const record = ref(null)
const formOpen = ref(false)

const lineColumns = outboundDetailLineColumns
const lineScrollX = computed(() => lineColumns.reduce((s, c) => s + (c.width || 80), 0))

const linkedQc = computed(() => {
  if (!record.value?.factoryQcId) return null
  return getFactoryQcById(record.value.factoryQcId)
})

const lineSummary = computed(() => {
  const lines = record.value?.lineItems || []
  const shipQtyTotal = lines.reduce((sum, line) => sum + (Number(line.shipQty) || 0), 0)
  const totalPrice = lines.reduce((sum, line) => sum + (Number(line.totalPrice) || 0), 0)
  return {
    lineCount: lines.length,
    shipQtyTotal: Math.round(shipQtyTotal * 1000) / 1000,
    totalPrice: Math.round(totalPrice * 100) / 100,
  }
})

function formatQty(val) {
  if (val == null || val === '') return '—'
  return Number(val).toLocaleString(undefined, { maximumFractionDigits: 3 })
}

function formatMoney(val) {
  if (val == null || val === '') return '—'
  return Number(val).toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })
}

function canConfirm(order) {
  if (!order) return false
  return validateOutboundForConfirm(order).ok
}

function initiateQcActionLabel(row) {
  const qc = getFactoryQcById(row?.factoryQcId)
  if (qc?.qcStatus === '已完成' && qcResultBlocksOutbound(qc.qcResult)) {
    return '重新发起出厂质检'
  }
  return '发起出厂质检'
}

function reload() {
  const row = getOutboundOrderById(route.params.id)
  record.value = row
    ? {
        ...row,
        lineItems: (row.lineItems || []).map((l) => enrichOutboundLine({ ...l })),
      }
    : null
  if (record.value?.docNo) {
    const tab = tabStore.tabs.find((t) => t.path === route.path)
    if (tab) tab.title = record.value.docNo
  }
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
  router.push('/inventory/outbound')
}

function openEdit() {
  formOpen.value = true
}

function onFormSaved() {
  reload()
}

function goSource() {
  if (record.value?.outboundType === '销售出库' && record.value?.linkedDeliveryId) {
    const path = `/sales/delivery/${record.value.linkedDeliveryId}`
    openTab(path, `发货单 ${record.value.linkedDeliveryCode || ''}`)
    router.push(path)
    return
  }
  message.info('暂无源单跳转')
}

function goSalesOrder() {
  const no = record.value?.salesOrderNo
  if (!no) return
  const order = findSalesOrderByOrderNo(no)
  if (!order) {
    message.info('未找到关联销售订单')
    return
  }
  const path = `/sales/orders/${order.id}`
  openTab(path, `销售订单 ${no}`)
  router.push(path)
}

function goFactoryQc() {
  if (!linkedQc.value) return
  const path = `/quality/factory-qc/${linkedQc.value.id}`
  openTab(path, linkedQc.value.qcNo || '出厂质检详情')
  router.push(path)
}

function handleApprove() {
  Modal.confirm({
    title: `审批通过出库单 ${record.value.docNo}？`,
    okText: '审批',
    onOk: () => {
      const res = approveOutboundOrder(record.value.id)
      if (!res.ok) {
        message.warning(res.message)
        return
      }
      message.success('审批已通过')
      reload()
    },
  })
}

function handleConfirmOutbound() {
  Modal.confirm({
    title: `确认出库 ${record.value.docNo}？`,
    onOk: () => {
      const { count, blocked } = confirmOutbound([record.value.id])
      if (blocked.length) {
        message.warning(blocked.map((b) => b.message).join('；'))
        return
      }
      if (count > 0) {
        message.success('已确认出库')
        reload()
      }
    },
  })
}

function handleDelete() {
  Modal.confirm({
    title: `确认删除出库单 ${record.value.docNo}？`,
    onOk: () => {
      if (deleteOutboundOrder(record.value.id)) {
        message.success('已删除')
        goBack()
      }
    },
  })
}

function handleInitiateQc() {
  const res = initiateFactoryQcFromOutbound(record.value.id)
  if (res.ok) {
    message.success('已发起出厂质检')
    reload()
    if (res.record?.id) {
      const path = `/quality/factory-qc/${res.record.id}`
      openTab(path, res.record.qcNo || '出厂质检详情')
      router.push(path)
    }
  } else {
    message.warning(res.message || '发起失败')
  }
}
</script>

<style lang="less" scoped>
.outbound-detail-page {
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
    cursor: pointer;
  }

  :deep(.line-summary-row .ant-table-cell) {
    background: #fafafa;
    font-weight: 600;
  }
}
</style>
