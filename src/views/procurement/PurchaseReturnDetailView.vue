<template>
  <div class="purchase-return-detail-page">
    <a-spin :spinning="loading">
      <template v-if="record">
        <div class="page-header">
          <div class="header-left">
            <span class="order-no">{{ record.returnNo }}</span>
            <a-tag :color="statusColor(record.status)">{{ record.status || '—' }}</a-tag>
            <a-tag :color="outboundStatusColor(record.outboundStatus)">
              {{ record.outboundStatus || '—' }}
            </a-tag>
          </div>
          <a-space :size="8" wrap>
            <a-button
              v-if="canEditPurchaseReturn(record)"
              type="primary"
              size="small"
              @click="handleEdit"
            >
              编辑
            </a-button>
            <a-button v-if="canVoidPurchaseReturn(record)" size="small" danger @click="handleVoid">
              作废
            </a-button>
            <a-button size="small" @click="openPrint">打印</a-button>
            <a-button size="small" @click="handleBack">返回列表</a-button>
          </a-space>
        </div>

        <div class="detail-tabs-wrap">
          <a-tabs
            v-model:active-key="activeTab"
            class="detail-tabs detail-tabs-pill detail-tabs-pill--nav-only"
          >
            <a-tab-pane key="basic" tab="基本信息" />
            <a-tab-pane key="outbound" :tab="`出库信息 (${outboundRows.length})`" />
          </a-tabs>
        </div>

        <div class="tab-body">
          <template v-if="activeTab === 'basic'">
            <div class="section-card">
              <div class="section-title">基本信息</div>
              <PurchaseReturnBasicInfoSection :record="record">
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
              </PurchaseReturnBasicInfoSection>
            </div>

            <div class="section-card">
              <div class="section-title">退货明细</div>
              <a-table
                :columns="lineColumns"
                :data-source="record.lineItems || []"
                row-key="id"
                size="small"
                bordered
                :pagination="false"
                :scroll="{ x: lineTableScrollX }"
                :locale="{ emptyText: '暂无退货明细' }"
              >
                <template #bodyCell="{ column, record: line, index }">
                  <template v-if="column.key === 'index'">{{ index + 1 }}</template>
                  <template v-else-if="column.key === 'purchaseQty'">
                    {{ formatQtyWithUnit(line.purchaseQty, line.purchaseUnit || line.unit) }}
                  </template>
                  <template v-else-if="column.key === 'receivedQty'">
                    {{ formatQtyWithUnit(line.receivedQty, line.purchaseUnit || line.unit) }}
                  </template>
                  <template v-else-if="column.key === 'returnQty'">
                    {{ formatQty(line.returnQty) }}
                  </template>
                  <template v-else>
                    {{ line[column.dataIndex] || '—' }}
                  </template>
                </template>
              </a-table>
              <div class="summary-row">
                <span class="summary-label">总计</span>
                <span class="summary-item">行数：{{ lineSummary.lineCount }}</span>
                <span class="summary-item">退货数量：{{ formatQty(lineSummary.totalQty) }}</span>
              </div>
            </div>
          </template>

          <template v-else-if="activeTab === 'outbound'">
            <div class="section-card">
              <div class="section-title">出库信息</div>
              <a-table
                :columns="outboundColumns"
                :data-source="outboundRows"
                row-key="id"
                size="small"
                bordered
                :pagination="false"
                :scroll="{ x: outboundTableScrollX }"
                :locale="{ emptyText: '暂无出库信息' }"
              >
                <template #bodyCell="{ column, record: row, index }">
                  <template v-if="column.key === 'index'">{{ index + 1 }}</template>
                  <template v-else-if="column.key === 'applyQty'">
                    {{ formatQty(row.applyQty) }}
                  </template>
                  <template v-else-if="column.key === 'actualQty'">
                    {{ formatQty(row.actualQty) }}
                  </template>
                  <template v-else-if="column.key === 'barcodeBatchNo'">
                    <span :title="row.barcodeBatchNo || ''">{{ row.barcodeBatchNo || '—' }}</span>
                  </template>
                  <template v-else>
                    {{ row[column.dataIndex] || '—' }}
                  </template>
                </template>
              </a-table>
            </div>
          </template>
        </div>

        <PurchaseReturnPrintModal v-model:open="printModalOpen" :purchase-return="record" />
      </template>
      <a-empty v-else-if="!loading" description="未找到该退货单" />
    </a-spin>
  </div>
</template>

<script>
export default { name: 'PurchaseReturnDetailView' }
</script>

<script setup>
import { computed, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { Modal, message } from 'ant-design-vue'
import { formatQty } from '@/utils/numberFormat'
import { calcReturnQtySummary, flattenReturnOutboundLines } from '@/mock/purchaseReturns'
import {
  createOutboundIssueLineColumns,
  getOutboundIssueLineScrollX,
} from '@/utils/outboundIssueLines'
import { formatQtyWithUnit } from '@/utils/purchaseReturnLine'
import {
  getPurchaseReturnById,
  canEditPurchaseReturn,
  canVoidPurchaseReturn,
  voidPurchaseReturn,
} from '@/store/purchaseReturnStore'
import { tabStore, useTabs } from '@/composables/useTabs'
import PurchaseReturnBasicInfoSection from './components/PurchaseReturnBasicInfoSection.vue'
import PurchaseReturnPrintModal from './components/PurchaseReturnPrintModal.vue'

const route = useRoute()
const router = useRouter()
const { openTab } = useTabs()

const loading = ref(false)
const record = ref(null)
const activeTab = ref('basic')
const printModalOpen = ref(false)

const lineColumns = [
  { title: '序号', key: 'index', width: 56, align: 'center' },
  { title: '产品名称', dataIndex: 'productName', width: 140, ellipsis: true },
  { title: '编号', dataIndex: 'productCode', width: 120, ellipsis: true },
  { title: '规格型号', dataIndex: 'specModel', width: 110, ellipsis: true },
  { title: '变体属性', dataIndex: 'variantSummary', width: 120, ellipsis: true },
  { title: '材质', dataIndex: 'material', width: 90, ellipsis: true },
  { title: '图号', dataIndex: 'drawingNo', width: 100, ellipsis: true },
  { title: '采购数量', key: 'purchaseQty', width: 110 },
  { title: '已入库数量', key: 'receivedQty', width: 110 },
  { title: '退货数量', key: 'returnQty', width: 100, align: 'right' },
  { title: '单位', dataIndex: 'unit', width: 80 },
  { title: '出货仓库', dataIndex: 'shipWarehouse', width: 110, ellipsis: true },
  { title: '退货类型', dataIndex: 'returnType', width: 90 },
  { title: '备注', dataIndex: 'remark', width: 120, ellipsis: true },
]

const outboundColumns = createOutboundIssueLineColumns()
const outboundTableScrollX = getOutboundIssueLineScrollX(outboundColumns)

const lineTableScrollX = lineColumns.reduce((sum, col) => sum + (col.width || 100), 0)

const lineSummary = computed(() => calcReturnQtySummary(record.value))

const outboundRows = computed(() => flattenReturnOutboundLines(record.value))

function loadRecord() {
  loading.value = true
  record.value = getPurchaseReturnById(route.params.id)
  loading.value = false
  if (record.value) {
    const tab = tabStore.tabs.find((t) => t.path === route.path)
    if (tab) tab.title = `采购退货 ${record.value.returnNo}`
  }
}

watch(() => route.params.id, loadRecord, { immediate: true })

function statusColor(status) {
  const map = {
    新建: 'default',
    进行中: 'processing',
    已完成: 'success',
    作废: 'default',
  }
  return map[status] || 'default'
}

function outboundStatusColor(status) {
  const map = {
    待出库: 'default',
    出库中: 'processing',
    部分出库: 'warning',
    已出库: 'success',
  }
  return map[status] || 'default'
}

function handleBack() {
  router.push('/procurement/purchase-returns')
}

function handleEdit() {
  if (!record.value?.id) return
  const path = `/procurement/purchase-returns/${record.value.id}/edit`
  openTab(path, `编辑退货单 ${record.value.returnNo || ''}`)
  router.push({ name: 'procurement-purchase-returns-edit', params: { id: record.value.id } })
}

function handleVoid() {
  if (!record.value) return
  Modal.confirm({
    title: '确认作废',
    content: `确定作废退货单「${record.value.returnNo}」吗？`,
    okType: 'danger',
    onOk: () => {
      const result = voidPurchaseReturn(record.value.id)
      if (result.ok) {
        message.success(result.message)
        loadRecord()
      } else {
        message.warning(result.message)
      }
    },
  })
}

function openPrint() {
  printModalOpen.value = true
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
.purchase-return-detail-page {
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
