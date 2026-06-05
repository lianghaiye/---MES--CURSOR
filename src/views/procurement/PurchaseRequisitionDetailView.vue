<template>
  <div class="purchase-req-detail-page">
    <a-spin :spinning="loading">
      <template v-if="record">
        <a-steps :current="timelineCurrent" class="detail-steps" size="small">
          <a-step v-for="step in timeline" :key="step.key" :status="step.status">
            <template #title>{{ step.title }}</template>
            <template v-if="step.description" #description>
              {{ step.description }}
            </template>
          </a-step>
        </a-steps>

        <div class="section-card">
          <div class="section-title">订单基础信息</div>
          <a-descriptions :column="3" size="small" bordered class="basic-desc">
            <a-descriptions-item label="申请单号">{{ record.reqNo }}</a-descriptions-item>
            <a-descriptions-item label="收货仓库">
              {{ record.receivingWarehouse || defaultWarehouse }}
            </a-descriptions-item>
            <a-descriptions-item label="来源">{{ record.source || '—' }}</a-descriptions-item>
            <a-descriptions-item label="期望到货日期">
              {{ record.estimatedArrivalDate || '—' }}
            </a-descriptions-item>
            <a-descriptions-item label="交货日期">{{
              record.deliveryDate || '—'
            }}</a-descriptions-item>
            <a-descriptions-item label="最近更新时间">{{
              record.updatedAt || '—'
            }}</a-descriptions-item>
            <a-descriptions-item label="操作人">{{ record.operator || '—' }}</a-descriptions-item>
            <a-descriptions-item label="创建时间">{{
              record.createdAt || '—'
            }}</a-descriptions-item>
            <a-descriptions-item label="创建人">{{ record.creator || '—' }}</a-descriptions-item>
          </a-descriptions>
        </div>

        <div class="section-card">
          <div class="section-title">明细</div>
          <a-table
            :columns="lineColumns"
            :data-source="record.lineItems"
            row-key="id"
            size="small"
            bordered
            :pagination="false"
            :scroll="{ x: 1600 }"
          >
            <template #bodyCell="{ column, record: line, index }">
              <template v-if="column.key === 'index'">{{ index + 1 }}</template>
              <template v-else-if="column.key === 'salesOrderNo'">
                {{ headerSalesOrderNo || '—' }}
              </template>
              <template v-else-if="column.key === 'purchaseOrderNo'">
                {{ headerPurchaseOrderNo || '—' }}
              </template>
              <template v-else-if="column.key === 'planPurchaseQty'">
                {{ formatQty(line.planPurchaseQty) }}
              </template>
              <template v-else-if="column.key === 'unitPrice'">
                {{ formatQty(line.unitPriceInTax ?? line.unitPriceExTax) }}
              </template>
              <template v-else-if="column.key === 'designatedSupplier'">
                {{ line.designatedSupplier ? '是' : '否' }}
              </template>
              <template v-else>
                {{ line[column.dataIndex] ?? '—' }}
              </template>
            </template>
          </a-table>

          <div class="summary-row">
            <span class="summary-label">总计</span>
            <span class="summary-item">数量：{{ summary.totalQty }}</span>
            <span class="summary-item">金额：{{ formatQty(summary.totalAmount) }}</span>
          </div>
        </div>

        <div v-if="showActions" class="footer-actions">
          <a-button class="btn-void" @click="handleInvalidate">
            <InfoCircleOutlined />
            作废
          </a-button>
          <a-button type="primary" @click="openGenerateModal">
            <CheckCircleOutlined />
            生成采购单
          </a-button>
        </div>
      </template>

      <a-empty v-else-if="!loading" description="未找到该采购申请单" />
    </a-spin>

    <GeneratePurchaseOrderModal
      v-model:open="generateModalOpen"
      :requisitions="generateTargets"
      @generated="onGenerated"
    />
  </div>
</template>

<script>
export default { name: 'PurchaseRequisitionDetailView' }
</script>

<script setup>
import { computed, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import { Modal, message } from 'ant-design-vue'
import { CheckCircleOutlined, InfoCircleOutlined } from '@ant-design/icons-vue'
import {
  buildPurchaseRequisitionTimeline,
  calcRequisitionDetailSummary,
} from '@/mock/purchaseRequisitionDetail'
import {
  getPurchaseRequisitionById,
  invalidatePurchaseRequisition,
  canGeneratePO,
} from '@/store/purchaseRequisitionStore'
import { tabStore } from '@/composables/useTabs'
import GeneratePurchaseOrderModal from './components/GeneratePurchaseOrderModal.vue'

const route = useRoute()

const loading = ref(false)
const record = ref(null)
const generateModalOpen = ref(false)
const generateTargets = ref([])

const lineColumns = [
  { title: '#', key: 'index', width: 48, align: 'center', fixed: 'left' },
  { title: '物料名称', dataIndex: 'inventoryName', width: 120, ellipsis: true },
  { title: '物料编码', dataIndex: 'inventoryCode', width: 110 },
  { title: '型号规格', dataIndex: 'specModel', width: 100 },
  { title: '材质', dataIndex: 'material', width: 90 },
  { title: '销售订单号', key: 'salesOrderNo', width: 130 },
  { title: '采购单号', key: 'purchaseOrderNo', width: 130 },
  { title: '物料类型', dataIndex: 'materialType', width: 90 },
  { title: '计量单位', dataIndex: 'unit', width: 80 },
  { title: '供方类型', dataIndex: 'supplierType', width: 90 },
  { title: '计划数量', key: 'planPurchaseQty', width: 100, align: 'right' },
  { title: '单价', key: 'unitPrice', width: 90, align: 'right' },
  { title: '指定供应商', key: 'designatedSupplier', width: 100 },
  { title: '供应商', dataIndex: 'supplierName', width: 120, ellipsis: true },
]

function loadRecord() {
  const id = route.params.id
  loading.value = true
  record.value = getPurchaseRequisitionById(id)
  loading.value = false

  if (record.value) {
    const tab = tabStore.tabs.find((t) => t.path === route.path)
    if (tab) tab.title = record.value.reqNo
  }
}

watch(() => route.params.id, loadRecord, { immediate: true })

const timeline = computed(() => buildPurchaseRequisitionTimeline(record.value))

const timelineCurrent = computed(() => {
  const steps = timeline.value
  const idx = steps.findIndex((s) => s.status === 'process')
  if (idx >= 0) return idx
  const lastFinish = [...steps].reverse().findIndex((s) => s.status === 'finish')
  if (lastFinish >= 0) return steps.length - 1 - lastFinish
  return 0
})

const summary = computed(() => calcRequisitionDetailSummary(record.value))

const defaultWarehouse = computed(() => {
  const line = record.value?.lineItems?.[0]
  return line?.receivingWarehouse || '—'
})

const headerSalesOrderNo = computed(() => record.value?.salesOrderNo || '')
const headerPurchaseOrderNo = computed(() => record.value?.purchaseOrderNo || '')

const showActions = computed(() => record.value && canGeneratePO(record.value))

function formatQty(val) {
  return Number(val || 0).toFixed(2)
}

function handleInvalidate() {
  if (!record.value) return
  Modal.confirm({
    title: '确认作废',
    content: `确定作废采购申请「${record.value.reqNo}」吗？`,
    onOk: () => {
      invalidatePurchaseRequisition(record.value.id)
      loadRecord()
      message.success('申请单已作废')
    },
  })
}

function openGenerateModal() {
  if (!record.value || !canGeneratePO(record.value)) return
  generateTargets.value = [record.value]
  generateModalOpen.value = true
}

function onGenerated() {
  loadRecord()
  message.success('采购单已生成')
}
</script>

<style lang="less" scoped>
.purchase-req-detail-page {
  margin: -12px;
  padding: 12px 16px 24px;
  background: #f5f6f8;
  min-height: calc(100vh - 112px);
}

.detail-steps {
  margin-bottom: 16px;
  padding: 12px 16px;
  background: #fff;
  border-radius: 6px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
}

.section-card {
  background: #fff;
  border-radius: 6px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
  padding: 12px 16px 16px;
  margin-bottom: 12px;

  .section-title {
    font-weight: 600;
    font-size: 14px;
    margin-bottom: 12px;
    color: rgba(0, 0, 0, 0.88);
  }
}

.basic-desc {
  :deep(.ant-descriptions-item-label) {
    color: rgba(0, 0, 0, 0.45);
    width: 110px;
  }
}

.summary-row {
  display: flex;
  justify-content: flex-end;
  align-items: center;
  gap: 24px;
  margin-top: 12px;
  padding-top: 8px;
  font-size: 13px;

  .summary-label {
    font-weight: 600;
    color: rgba(0, 0, 0, 0.88);
  }

  .summary-item {
    color: rgba(0, 0, 0, 0.65);
  }
}

.footer-actions {
  display: flex;
  justify-content: center;
  gap: 16px;
  padding: 16px 0 8px;

  .btn-void {
    color: #1677ff;
    border-color: #1677ff;
  }
}
</style>
