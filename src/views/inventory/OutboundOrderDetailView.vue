<template>
  <div class="outbound-detail-page">
    <a-spin :spinning="loading">
      <template v-if="record">
        <div class="page-header">
          <div class="header-left">
            <span class="page-title">{{ record.docNo }}</span>
            <a-tag :color="statusColor(record.status)">{{ record.status }}</a-tag>
            <span class="sub-type">{{ record.outboundType }}</span>
          </div>
          <a-space>
            <a-button
              v-if="canConfirm(record)"
              type="primary"
              size="small"
              @click="handleConfirmOutbound"
            >
              确认出库
            </a-button>
            <a-button v-if="canInitiateFactoryQc(record)" size="small" @click="handleInitiateQc">
              {{ initiateQcActionLabel(record) }}
            </a-button>
            <a-button size="small" @click="goBack">返回列表</a-button>
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
            <a-descriptions-item label="物品类型">{{ record.itemType || '—' }}</a-descriptions-item>
            <a-descriptions-item label="客户名称">{{
              record.customerName || '—'
            }}</a-descriptions-item>
            <a-descriptions-item label="项目编号">{{
              record.projectNo || '—'
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
            <a-descriptions-item label="创建日期">{{
              record.createdAt || '—'
            }}</a-descriptions-item>
            <a-descriptions-item label="完成日期">{{
              record.completedAt || '—'
            }}</a-descriptions-item>
            <a-descriptions-item label="审核日期">{{
              record.auditDate || '—'
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
            :scroll="{ x: 1100 }"
          >
            <template #bodyCell="{ column, record: line, index }">
              <template v-if="column.key === 'index'">{{ index + 1 }}</template>
              <template v-else-if="column.key === 'shipQty'">
                {{ formatQty(line.shipQty) }}
              </template>
            </template>
          </a-table>
        </div>
      </template>
      <a-empty v-else-if="!loading" description="未找到该出库单" />
    </a-spin>
  </div>
</template>

<script>
export default { name: 'OutboundOrderDetailView' }
</script>

<script setup>
import { computed, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { Modal, message } from 'ant-design-vue'
import {
  getOutboundOrderById,
  confirmOutbound,
  validateOutboundForConfirm,
  initiateFactoryQcFromOutbound,
  canInitiateFactoryQc,
} from '@/store/outboundStore'
import { getFactoryQcById, qcResultBlocksOutbound } from '@/store/factoryQcStore'
import { findSalesOrderByOrderNo } from '@/store/salesOrderStore'
import { tabStore, useTabs } from '@/composables/useTabs'

const route = useRoute()
const router = useRouter()
const { openTab } = useTabs()
const loading = ref(false)
const record = ref(null)

const lineColumns = [
  { title: '#', key: 'index', width: 48, align: 'center' },
  { title: '物品编码', dataIndex: 'itemCode', width: 120 },
  { title: '物品名称', dataIndex: 'itemName', width: 160, ellipsis: true },
  { title: '物品类型', dataIndex: 'itemType', width: 90 },
  { title: '规格型号', dataIndex: 'specModel', width: 100, ellipsis: true },
  { title: '出库数量', key: 'shipQty', width: 90, align: 'right' },
  { title: '出库仓库', dataIndex: 'shipWarehouse', width: 100 },
  { title: '单位', dataIndex: 'unit', width: 70, align: 'center' },
]

const linkedQc = computed(() => {
  if (!record.value?.factoryQcId) return null
  return getFactoryQcById(record.value.factoryQcId)
})

function formatQty(val) {
  return Number(val || 0).toFixed(2)
}

function statusColor(status) {
  if (status === '已出库') return 'success'
  if (status === '待处理') return 'default'
  return 'processing'
}

function canConfirm(order) {
  if (!order) return false
  const check = validateOutboundForConfirm(order)
  return check.ok
}

function initiateQcActionLabel(row) {
  const qc = getFactoryQcById(row?.factoryQcId)
  if (qc?.qcStatus === '已完成' && qcResultBlocksOutbound(qc.qcResult)) {
    return '重新发起出厂质检'
  }
  return '发起出厂质检'
}

function reload() {
  record.value = getOutboundOrderById(route.params.id)
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
}
</style>
