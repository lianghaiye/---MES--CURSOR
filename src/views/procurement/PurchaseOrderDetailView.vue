<template>
  <div class="purchase-order-detail-page">
    <a-spin :spinning="loading">
      <template v-if="record">
        <div class="page-header">
          <div class="header-left">
            <span class="order-no">{{ record.orderNo }}</span>
            <a-tag :color="statusColor(record.status)">{{ record.status }}</a-tag>
            <a-tag :color="inboundColor(record.inboundStatus)">{{ record.inboundStatus }}</a-tag>
          </div>
          <a-space>
            <a-button v-if="canApprove" type="primary" @click="handleApprove">
              <CheckCircleOutlined />
              审批
            </a-button>
            <a-button size="small" @click="handleBack">返回列表</a-button>
          </a-space>
        </div>

        <div class="page-body">
          <div class="section-card">
            <div class="section-title">基本信息</div>
            <a-descriptions :column="3" size="small" bordered>
              <a-descriptions-item label="采购单号">{{ record.orderNo }}</a-descriptions-item>
              <a-descriptions-item label="状态">{{ record.status || '—' }}</a-descriptions-item>
              <a-descriptions-item label="入库状态">{{
                record.inboundStatus || '—'
              }}</a-descriptions-item>
              <a-descriptions-item label="供应商">{{ record.supplier || '—' }}</a-descriptions-item>
              <a-descriptions-item label="采购申请单号">{{
                record.reqNo || '—'
              }}</a-descriptions-item>
              <a-descriptions-item label="销售单号">{{
                record.salesOrderNo || '—'
              }}</a-descriptions-item>
              <a-descriptions-item label="生产工单号">{{
                record.workOrderNo || '—'
              }}</a-descriptions-item>
              <a-descriptions-item label="合同编号">{{
                record.contractNo || '—'
              }}</a-descriptions-item>
              <a-descriptions-item label="订单来源">{{
                record.orderSource || '—'
              }}</a-descriptions-item>
              <a-descriptions-item label="申请类型">{{
                record.applyType || '—'
              }}</a-descriptions-item>
              <a-descriptions-item label="结算类型">{{
                record.settlementType || '—'
              }}</a-descriptions-item>
              <a-descriptions-item label="结算周期">{{
                record.settlementCycle || '—'
              }}</a-descriptions-item>
              <a-descriptions-item label="结算方式">{{
                record.settlementMethod || '—'
              }}</a-descriptions-item>
              <a-descriptions-item label="交货方式">{{
                record.deliveryMethod || '—'
              }}</a-descriptions-item>
              <a-descriptions-item label="供货期/天">{{
                record.leadTimeDays ?? '—'
              }}</a-descriptions-item>
              <a-descriptions-item label="交货日期">{{
                record.deliveryDate || '—'
              }}</a-descriptions-item>
              <a-descriptions-item label="提醒日期">{{
                record.reminderDate || '—'
              }}</a-descriptions-item>
              <a-descriptions-item label="送货日期">{{
                record.shippingDate || '—'
              }}</a-descriptions-item>
              <a-descriptions-item label="收货仓库">{{
                record.receivingWarehouse || '—'
              }}</a-descriptions-item>
              <a-descriptions-item label="收货地址">{{
                record.shippingAddress || '—'
              }}</a-descriptions-item>
              <a-descriptions-item label="物流单号">{{
                record.logisticsNo || '—'
              }}</a-descriptions-item>
              <a-descriptions-item label="联系人">{{
                record.contactPerson || '—'
              }}</a-descriptions-item>
              <a-descriptions-item label="联系方式">{{
                record.contactPhone || '—'
              }}</a-descriptions-item>
              <a-descriptions-item label="采购员">{{
                record.purchaser || '—'
              }}</a-descriptions-item>
              <a-descriptions-item label="审批结果">{{
                record.approvalResult || '—'
              }}</a-descriptions-item>
              <a-descriptions-item label="审批人">{{
                record.approverName || '—'
              }}</a-descriptions-item>
              <a-descriptions-item label="创建人">{{ record.creator || '—' }}</a-descriptions-item>
              <a-descriptions-item label="创建日期">{{
                record.documentDate || '—'
              }}</a-descriptions-item>
              <a-descriptions-item label="创建时间">{{
                record.createdAt || '—'
              }}</a-descriptions-item>
              <a-descriptions-item label="备注" :span="3">{{
                record.remark || '—'
              }}</a-descriptions-item>
            </a-descriptions>
          </div>

          <div class="section-card">
            <div class="section-title">采购明细</div>
            <a-table
              :columns="lineColumns"
              :data-source="record.lineItems"
              row-key="id"
              size="small"
              bordered
              :pagination="false"
              :scroll="{ x: lineTableScrollX }"
              :locale="{ emptyText: '暂无采购明细' }"
            >
              <template #bodyCell="{ column, record: line, index }">
                <template v-if="column.key === 'index'">{{ index + 1 }}</template>
                <template v-else-if="column.key === 'productName'">
                  {{ lineProductName(line) }}
                </template>
                <template v-else-if="column.key === 'productCode'">
                  {{ lineProductCode(line) }}
                </template>
                <template v-else-if="column.key === 'purchaseQty'">
                  {{ formatQty(line.purchaseQty) }}
                </template>
                <template v-else-if="column.key === 'stockQty'">
                  {{ formatQty(line.stockQty) }}
                </template>
                <template v-else-if="column.key === 'unitPriceExTax'">
                  {{ formatMoney(line.unitPriceExTax) }}
                </template>
                <template v-else-if="column.key === 'unitPriceInTax'">
                  {{ formatMoney(line.unitPriceInTax) }}
                </template>
                <template v-else-if="column.key === 'totalPriceExTax'">
                  {{ formatMoney(line.totalPriceExTax) }}
                </template>
                <template v-else-if="column.key === 'totalPriceInTax'">
                  {{ formatMoney(line.totalPriceInTax) }}
                </template>
                <template v-else>
                  {{ line[column.dataIndex] ?? '—' }}
                </template>
              </template>
            </a-table>

            <div class="summary-row">
              <span class="summary-label">总计</span>
              <span class="summary-item">数量：{{ formatQty(summary.totalQty) }}</span>
              <span class="summary-item">不含税：{{ formatMoney(summary.totalAmountExTax) }}</span>
              <span class="summary-item">含税：{{ formatMoney(summary.totalAmountInTax) }}</span>
            </div>
          </div>
        </div>
      </template>

      <a-empty v-else-if="!loading" description="未找到该采购订单" />
    </a-spin>
  </div>
</template>

<script>
export default { name: 'PurchaseOrderDetailView' }
</script>

<script setup>
import { computed, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { Modal, message } from 'ant-design-vue'
import { CheckCircleOutlined } from '@ant-design/icons-vue'
import { calcPurchaseOrderDetailSummary } from '@/mock/purchaseOrderDetail'
import {
  getPurchaseOrderById,
  approvePurchaseOrder,
  canApprovePurchaseOrder,
} from '@/store/purchaseOrderStore'
import { tabStore } from '@/composables/useTabs'

const route = useRoute()
const router = useRouter()

const loading = ref(false)
const record = ref(null)

const lineColumns = [
  { title: '#', key: 'index', width: 48, align: 'center' },
  { title: '产品名称', key: 'productName', width: 140, ellipsis: true },
  { title: '产品编号', key: 'productCode', width: 120, ellipsis: true },
  { title: '规格型号', dataIndex: 'specModel', width: 110, ellipsis: true },
  { title: '规格属性', dataIndex: 'specAttr', width: 90, ellipsis: true },
  { title: '材质', dataIndex: 'material', width: 80, ellipsis: true },
  { title: '图号', dataIndex: 'drawingNo', width: 100, ellipsis: true },
  { title: '库存数量', key: 'stockQty', width: 90, align: 'right' },
  { title: '采购数量', key: 'purchaseQty', width: 100, align: 'right' },
  { title: '单位', dataIndex: 'unit', width: 70 },
  { title: '不含税单价', key: 'unitPriceExTax', width: 100, align: 'right' },
  { title: '税率(%)', dataIndex: 'taxRate', width: 80, align: 'right' },
  { title: '含税单价', key: 'unitPriceInTax', width: 100, align: 'right' },
  { title: '总价（不含税）', key: 'totalPriceExTax', width: 110, align: 'right' },
  { title: '总价（含税）', key: 'totalPriceInTax', width: 100, align: 'right' },
  { title: '交货日期', dataIndex: 'deliveryDate', width: 110 },
  { title: '收货仓库', dataIndex: 'receivingWarehouse', width: 110, ellipsis: true },
  { title: '备注', dataIndex: 'remark', width: 120, ellipsis: true },
]

const lineTableScrollX = lineColumns.reduce((sum, col) => sum + (col.width || 100), 0)

function loadRecord() {
  loading.value = true
  record.value = getPurchaseOrderById(route.params.id)
  loading.value = false

  if (record.value) {
    const tab = tabStore.tabs.find((t) => t.path === route.path)
    if (tab) tab.title = `采购订单 ${record.value.orderNo}`
  }
}

watch(() => route.params.id, loadRecord, { immediate: true })

const summary = computed(() => calcPurchaseOrderDetailSummary(record.value))
const canApprove = computed(() => record.value && canApprovePurchaseOrder(record.value))

function lineProductName(line) {
  return line.productName || line.itemName || '—'
}

function lineProductCode(line) {
  return line.productCode || line.itemCode || '—'
}

function statusColor(status) {
  const map = { 待审批: 'default', 进行中: 'processing', 已完成: 'success' }
  return map[status] || 'default'
}

function inboundColor(status) {
  const map = { 未入库: 'default', 部分入库: 'warning', 已入库: 'success' }
  return map[status] || 'default'
}

function formatQty(val) {
  if (val == null || val === '') return '—'
  return Number(val).toLocaleString(undefined, { maximumFractionDigits: 4 })
}

function formatMoney(val) {
  if (val == null || val === '') return '—'
  return Number(val).toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })
}

function handleBack() {
  router.push('/procurement/purchase-orders')
}

function handleApprove() {
  if (!record.value) return
  Modal.confirm({
    title: '确认审批',
    content: `确定审批采购单「${record.value.orderNo}」吗？`,
    onOk: () => {
      const result = approvePurchaseOrder(record.value.id)
      if (result.ok) {
        loadRecord()
        message.success(result.message)
      } else {
        message.warning(result.message)
      }
    },
  })
}
</script>

<style lang="less" scoped>
.purchase-order-detail-page {
  margin: -12px;
  min-height: calc(100vh - 112px);
  background: #f5f6f8;
  display: flex;
  flex-direction: column;
}

.page-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px 12px;
  background: #fff;
  border-bottom: 1px solid #f0f0f0;
}

.header-left {
  display: flex;
  align-items: center;
  gap: 8px;
  min-width: 0;
}

.order-no {
  font-size: 16px;
  font-weight: 600;
  color: rgba(0, 0, 0, 0.88);
}

.page-body {
  flex: 1;
  padding: 8px 12px 16px;
  overflow: auto;
}

.section-card {
  background: #fff;
  border-radius: 6px;
  padding: 12px;
  margin-bottom: 8px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
}

.section-title {
  font-weight: 600;
  font-size: 14px;
  margin-bottom: 10px;
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
</style>
