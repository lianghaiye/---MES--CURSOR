<template>
  <div class="purchase-receipt-detail-page">
    <a-spin :spinning="loading">
      <template v-if="record">
        <div class="page-header">
          <div class="header-left">
            <span class="order-no">{{ record.receiptNo }}</span>
            <a-tag :color="docStatusColor(record.receiptStatus)">{{
              record.receiptStatus || '—'
            }}</a-tag>
            <a-tag :color="qcStatusColor(record.qcStatus)">{{ record.qcStatus || '—' }}</a-tag>
            <a-tag :color="inboundStatusColor(record.inboundStatus)">{{
              record.inboundStatus || '—'
            }}</a-tag>
          </div>
          <a-space :size="8" wrap>
            <a-button
              v-if="canEditPurchaseReceipt(record)"
              type="primary"
              size="small"
              @click="handleEdit"
            >
              编辑
            </a-button>
            <a-button v-if="canVoidPurchaseReceipt(record)" size="small" danger @click="handleVoid">
              作废
            </a-button>
            <a-button
              v-if="canOpenInboundFromReceipt(record)"
              size="small"
              @click="openInboundModal"
            >
              生成入库
            </a-button>
            <a-button
              v-if="canCompletePurchaseReceipt(record)"
              size="small"
              @click="handleComplete"
            >
              完成
            </a-button>
            <a-button size="small" @click="handleBack">返回列表</a-button>
          </a-space>
        </div>

        <div class="detail-tabs-wrap">
          <a-tabs
            v-model:active-key="activeTab"
            class="detail-tabs detail-tabs-pill detail-tabs-pill--nav-only"
          >
            <a-tab-pane key="basic" tab="基本信息" />
            <a-tab-pane key="qc" :tab="`质检信息 (${qcRows.length})`" />
            <a-tab-pane key="inbound" :tab="`入库信息 (${relatedInboundLines.length})`" />
          </a-tabs>
        </div>

        <div class="tab-body">
          <template v-if="activeTab === 'basic'">
            <div class="section-card">
              <div class="section-title">基本信息</div>
              <PurchaseReceiptBasicInfoSection :record="record">
                <template #purchaseOrderNo>
                  <a
                    v-if="record.purchaseOrderId"
                    class="link-code"
                    @click.prevent="openPurchaseOrder"
                  >
                    {{ record.purchaseOrderNo || '—' }}
                  </a>
                  <span v-else>{{ record.purchaseOrderNo || '—' }}</span>
                </template>
              </PurchaseReceiptBasicInfoSection>
            </div>

            <div class="section-card">
              <div class="section-title">收货明细</div>
              <a-table
                :columns="lineColumns"
                :data-source="record.lineItems || []"
                row-key="id"
                size="small"
                bordered
                :pagination="false"
                :scroll="{ x: lineTableScrollX }"
                :locale="{ emptyText: '暂无收货明细' }"
              >
                <template #bodyCell="{ column, record: line, index }">
                  <template v-if="column.key === 'index'">{{ index + 1 }}</template>
                  <template v-else-if="column.key === 'productName'">
                    {{ line.itemName || line.productName || '—' }}
                  </template>
                  <template v-else-if="column.key === 'productCode'">
                    {{ line.itemCode || line.productCode || '—' }}
                  </template>
                  <template v-else-if="column.key === 'purchaseQty'">
                    {{ formatQty(line.purchaseQty) }}
                  </template>
                  <template v-else-if="column.key === 'receiptQty'">
                    {{ formatQty(line.receiptQty) }}
                  </template>
                  <template v-else>
                    {{ line[column.dataIndex] || '—' }}
                  </template>
                </template>
              </a-table>
              <div class="summary-row">
                <span class="summary-label">总计</span>
                <span class="summary-item">行数：{{ lineSummary.lineCount }}</span>
                <span class="summary-item">收货数量：{{ formatQty(lineSummary.totalQty) }}</span>
              </div>
            </div>
          </template>

          <template v-else-if="activeTab === 'qc'">
            <div class="section-card">
              <div class="section-title">质检信息</div>
              <a-table
                :columns="qcColumns"
                :data-source="qcRows"
                row-key="id"
                size="small"
                bordered
                :pagination="false"
                :locale="{ emptyText: '暂无质检信息' }"
              >
                <template #bodyCell="{ column, record: row }">
                  <template v-if="column.key === 'qcStatus'">
                    <a-tag :color="qcStatusColor(row.qcStatus)">{{ row.qcStatus || '—' }}</a-tag>
                  </template>
                  <template v-else>
                    {{ row[column.dataIndex] || '—' }}
                  </template>
                </template>
              </a-table>
            </div>
          </template>

          <template v-else-if="activeTab === 'inbound'">
            <div class="section-card">
              <div class="section-title">入库信息</div>
              <a-table
                :columns="inboundLineColumns"
                :data-source="relatedInboundLines"
                row-key="id"
                size="small"
                bordered
                :pagination="false"
                :scroll="{ x: inboundLineScrollX }"
                :locale="{ emptyText: '暂无入库明细' }"
              >
                <template #bodyCell="{ column, record: row, index }">
                  <template v-if="column.key === 'index'">{{ index + 1 }}</template>
                  <template v-else-if="column.key === 'docNo'">
                    <a class="link-code" @click.prevent="goInboundDetailById(row.orderId)">
                      {{ row.docNo || '—' }}
                    </a>
                  </template>
                  <template v-else-if="column.key === 'applyQty'">
                    {{ formatQty(row.applyQty) }}
                  </template>
                  <template v-else-if="column.key === 'actualQty'">
                    {{ formatQty(row.actualQty) }}
                  </template>
                  <template v-else>
                    {{ row[column.dataIndex] || '—' }}
                  </template>
                </template>
              </a-table>
            </div>
          </template>
        </div>

        <GenerateInboundOrderModal
          v-model:open="inboundModalOpen"
          :purchase-order="inboundOrder"
          :purchase-receipt="record"
          @saved="onInboundSaved"
        />
      </template>
      <a-empty v-else-if="!loading" description="未找到该收货单" />
    </a-spin>
  </div>
</template>

<script>
export default { name: 'PurchaseReceiptDetailView' }
</script>

<script setup>
import { computed, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { Modal, message } from 'ant-design-vue'
import { formatQty } from '@/utils/numberFormat'
import { calcReceiptQtySummary } from '@/mock/purchaseReceipts'
import {
  getPurchaseReceiptById,
  canEditPurchaseReceipt,
  canVoidPurchaseReceipt,
  canCompletePurchaseReceipt,
  voidPurchaseReceipt,
  completePurchaseReceipt,
} from '@/store/purchaseReceiptStore'
import { getPurchaseOrderById, canGenerateInbound } from '@/store/purchaseOrderStore'
import { getInboundOrdersByReceipt } from '@/store/inboundOrderStore'
import { flattenPurchaseOrderInboundLines } from '@/utils/purchaseOrderInboundLines'
import { tabStore, useTabs } from '@/composables/useTabs'
import PurchaseReceiptBasicInfoSection from './components/PurchaseReceiptBasicInfoSection.vue'
import GenerateInboundOrderModal from './components/GenerateInboundOrderModal.vue'

const route = useRoute()
const router = useRouter()
const { openTab } = useTabs()

const loading = ref(false)
const record = ref(null)
const inboundModalOpen = ref(false)
const inboundOrder = ref(null)
const activeTab = ref('basic')

const lineColumns = [
  { title: '序号', key: 'index', width: 56, align: 'center' },
  { title: '产品名称', key: 'productName', width: 140, ellipsis: true },
  { title: '产品编号', key: 'productCode', width: 120, ellipsis: true },
  { title: '规格型号', dataIndex: 'specModel', width: 110, ellipsis: true },
  { title: '材质', dataIndex: 'material', width: 80, ellipsis: true },
  { title: '变体属性', dataIndex: 'variantSummary', width: 140, ellipsis: true },
  { title: '图号', dataIndex: 'drawingNo', width: 100, ellipsis: true },
  { title: '采购数量', key: 'purchaseQty', width: 100, align: 'right' },
  { title: '收货数量', key: 'receiptQty', width: 100, align: 'right' },
  { title: '单位', dataIndex: 'unit', width: 70 },
  { title: '收货仓库', dataIndex: 'receivingWarehouse', width: 110, ellipsis: true },
  { title: '收货模式', dataIndex: 'receivingMode', width: 100 },
  { title: '备注', dataIndex: 'remark', width: 120, ellipsis: true },
]

const qcColumns = [
  { title: '质检单号', dataIndex: 'qcNo', width: 160 },
  { title: '质检状态', key: 'qcStatus', width: 110 },
  { title: '质检结果', dataIndex: 'qcResult', width: 110 },
  { title: '质检人', dataIndex: 'inspector', width: 100 },
  { title: '质检时间', dataIndex: 'inspectedAt', width: 160 },
]

const inboundLineColumns = [
  { title: '序号', key: 'index', width: 56, align: 'center', fixed: 'left' },
  { title: '入库单号', key: 'docNo', dataIndex: 'docNo', width: 150, fixed: 'left' },
  { title: '物料名称', dataIndex: 'itemName', width: 140, ellipsis: true },
  { title: '编码', dataIndex: 'itemCode', width: 120, ellipsis: true },
  { title: '规格型号', dataIndex: 'specModel', width: 110, ellipsis: true },
  { title: '材质', dataIndex: 'material', width: 80, ellipsis: true },
  { title: '申请入库数量', key: 'applyQty', width: 110, align: 'right' },
  { title: '实际入库数量', key: 'actualQty', width: 110, align: 'right' },
  { title: '入库时间', dataIndex: 'inboundAt', width: 160 },
  { title: '确认人', dataIndex: 'confirmer', width: 88 },
  { title: '创建时间', dataIndex: 'createdAt', width: 160 },
  { title: '创建人', dataIndex: 'creator', width: 88 },
]

const lineTableScrollX = lineColumns.reduce((sum, col) => sum + (col.width || 100), 0)
const inboundLineScrollX = inboundLineColumns.reduce((sum, col) => sum + (col.width || 100), 0)

const lineSummary = computed(() => calcReceiptQtySummary(record.value))

const qcRows = computed(() => {
  const r = record.value
  if (!r?.qcNo) return []
  return [
    {
      id: `qc-${r.id}`,
      qcNo: r.qcNo,
      qcStatus: r.qcStatus,
      qcResult: r.qcResult,
      inspector: r.inspector,
      inspectedAt: r.inspectedAt,
    },
  ]
})

const relatedInboundLines = computed(() =>
  flattenPurchaseOrderInboundLines(getInboundOrdersByReceipt(record.value)),
)

function loadRecord() {
  loading.value = true
  record.value = getPurchaseReceiptById(route.params.id)
  loading.value = false
  if (record.value) {
    const tab = tabStore.tabs.find((t) => t.path === route.path)
    if (tab) tab.title = `采购收货 ${record.value.receiptNo}`
  }
}

watch(() => route.params.id, loadRecord, { immediate: true })

function docStatusColor(status) {
  const map = { 新建: 'default', 进行中: 'processing', 已完成: 'success', 作废: 'default' }
  return map[status] || 'default'
}

function qcStatusColor(status) {
  const map = {
    未质检: 'default',
    质检中: 'processing',
    质检通过: 'success',
    部分通过: 'warning',
    质检不通过: 'error',
    已终止: 'default',
  }
  return map[status] || 'default'
}

function inboundStatusColor(status) {
  const map = {
    待入库: 'default',
    入库中: 'processing',
    部分入库: 'warning',
    已入库: 'success',
  }
  return map[status] || 'default'
}

function goInboundDetailById(orderId) {
  if (!orderId) return
  const order = getInboundOrdersByReceipt(record.value).find((o) => o.id === orderId)
  const path = `/inventory/inbound/${orderId}`
  openTab(path, `入库单 ${order?.docNo || ''}`)
  router.push({ name: 'inventory-inbound-detail', params: { id: orderId } })
}

function canOpenInboundFromReceipt(receipt) {
  if (!receipt || receipt.receiptStatus === '作废' || receipt.receiptStatus === '已完成') {
    return false
  }
  const po = getPurchaseOrderById(receipt.purchaseOrderId)
  return Boolean(po && canGenerateInbound(po))
}

function openInboundModal() {
  if (!canOpenInboundFromReceipt(record.value)) {
    message.warning('当前收货单不可生成入库单')
    return
  }
  inboundOrder.value = getPurchaseOrderById(record.value.purchaseOrderId)
  inboundModalOpen.value = true
}

function onInboundSaved() {
  loadRecord()
}

function handleBack() {
  router.push('/procurement/purchase-receipts')
}

function handleEdit() {
  message.info(`编辑收货单「${record.value?.receiptNo}」功能开发中`)
}

function handleVoid() {
  if (!record.value) return
  Modal.confirm({
    title: '确认作废',
    content: `确定作废收货单「${record.value.receiptNo}」吗？`,
    okType: 'danger',
    onOk: () => {
      const result = voidPurchaseReceipt(record.value.id)
      if (result.ok) {
        message.success(result.message)
        loadRecord()
      } else {
        message.warning(result.message)
      }
    },
  })
}

function handleComplete() {
  if (!record.value) return
  Modal.confirm({
    title: '确认完成',
    content: `确定完成收货单「${record.value.receiptNo}」吗？`,
    onOk: () => {
      const result = completePurchaseReceipt(record.value.id)
      if (result.ok) {
        message.success(result.message)
        loadRecord()
      } else {
        message.warning(result.message)
      }
    },
  })
}

function openPurchaseOrder() {
  if (!record.value?.purchaseOrderId) return
  const path = `/procurement/purchase-orders/${record.value.purchaseOrderId}`
  openTab(path, `采购订单 ${record.value.purchaseOrderNo || ''}`)
  router.push({
    name: 'procurement-purchase-orders-detail',
    params: { id: record.value.purchaseOrderId },
  })
}
</script>

<style lang="less" scoped>
.purchase-receipt-detail-page {
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
  padding: 10px 12px 6px;
  background: #fff;
  border-bottom: 1px solid #e8e8e8;
  position: relative;
  z-index: 2;
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

.tab-body {
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

.link-code {
  color: #1677ff;
  cursor: pointer;
}
</style>
