<template>
  <div class="delivery-order-detail-page">
    <a-spin :spinning="loading">
      <template v-if="record">
        <div class="detail-sticky-bar">
          <div class="page-header">
            <div class="header-left">
              <span class="order-no">{{ record.deliveryCode }}</span>
              <a-tag :color="deliveryStatusColor(record.deliveryStatus)">{{
                record.deliveryStatus
              }}</a-tag>
            </div>
            <a-space :size="8">
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
              <a-tab-pane key="outbound" :tab="`出库信息 (${outboundList.length})`" />
            </a-tabs>
          </div>
        </div>

        <div class="tab-body">
          <template v-if="activeTab === 'basic'">
            <div class="section-card">
              <div class="section-title">基本信息</div>
              <DeliveryOrderBasicInfoSection :order="record" @go-sales="goSalesOrder" />
            </div>

            <div v-if="record.lineItems?.length" class="section-card">
              <div class="section-title">整机发货明细</div>
              <a-table
                :columns="wholeColumns"
                :data-source="wholeLineRows"
                row-key="id"
                size="small"
                bordered
                :pagination="false"
                :scroll="{ x: wholeTableScrollX }"
              >
                <template #bodyCell="{ column, record: line, index }">
                  <template v-if="column.key === 'index'">{{ index + 1 }}</template>
                  <template v-else-if="column.key === 'lineShipStatus'">
                    <a-tag :color="lineShipStatusColor(line.lineShipStatus)">
                      {{ line.lineShipStatus || '—' }}
                    </a-tag>
                  </template>
                  <template v-else-if="column.key === 'shipProgress'">
                    {{
                      formatShipProgress(
                        line.confirmedOutboundQty ?? line.shippedQty,
                        line.appliedShipQty ?? line.shippedQty,
                        line.orderQty,
                      )
                    }}
                  </template>
                  <template v-else-if="column.key === 'orderQty'">
                    {{ formatDeliveryQty(line.orderQty) }}
                  </template>
                  <template v-else-if="column.key === 'unitPriceExTax'">
                    {{ formatDeliveryPrice(line.unitPriceExTax) }}
                  </template>
                  <template v-else-if="column.key === 'unitPriceInTax'">
                    {{ formatDeliveryPrice(line.unitPriceInTax) }}
                  </template>
                  <template v-else-if="column.key === 'shipQty'">
                    {{ formatDeliveryQty(line.shipQty) }}
                  </template>
                  <template v-else-if="column.key === 'shipWeight'">
                    {{ formatDeliveryWeight(line.shipWeight ?? line.itemWeightKg) }}
                  </template>
                  <template v-else-if="column.key === 'deliveryUnitPriceExTax'">
                    {{ formatDeliveryPrice(line.deliveryUnitPriceExTax) }}
                  </template>
                  <template v-else-if="column.key === 'deliveryAmountExTax'">
                    {{ formatDeliveryPrice(line.deliveryAmountExTax) }}
                  </template>
                  <template v-else-if="column.key === 'deliveryMode'">
                    {{ line.deliveryMode || '—' }}
                  </template>
                  <template v-else>
                    {{ displayLineCell(line, column) }}
                  </template>
                </template>
              </a-table>
            </div>
            <div v-if="record.scatterShipments?.length" class="section-card">
              <div class="section-title">散件发运</div>
              <div v-for="ship in record.scatterShipments" :key="ship.id" class="scatter-block">
                <div class="scatter-head">{{ ship.productName }}（{{ ship.productCode }}）</div>
                <a-table
                  :columns="scatterPickColumns"
                  :data-source="scatterPicks(ship)"
                  row-key="materialId"
                  size="small"
                  bordered
                  :pagination="false"
                  :scroll="{ x: 720 }"
                />
              </div>
            </div>
            <div v-if="record.shipAttachments?.length" class="section-card">
              <div class="section-title">发货附件</div>
              <a-table
                :columns="shipAttachmentColumns"
                :data-source="record.shipAttachments"
                row-key="id"
                size="small"
                bordered
                :pagination="false"
              >
                <template #bodyCell="{ column, record: line, index }">
                  <template v-if="column.key === 'index'">{{ index + 1 }}</template>
                  <template v-else-if="column.key === 'source'">
                    <a-tag :color="line.source === 'BOM' ? 'blue' : 'default'">
                      {{ line.source || '手工' }}
                    </a-tag>
                  </template>
                  <template v-else-if="column.key === 'shipStatus'">
                    <a-tag :color="attachmentShipStatusColor(line.shipStatus)">
                      {{ line.shipStatus || '未发货' }}
                    </a-tag>
                  </template>
                  <template v-else-if="column.key === 'shipProgress'">
                    {{
                      formatAttachmentShipProgress(line.shippedQty, line.appliedQty, line.planQty)
                    }}
                  </template>
                  <template v-else-if="column.key === 'selected'">
                    {{ line.selected === false ? '否' : '是' }}
                  </template>
                  <template v-else>
                    {{ line[column.dataIndex] ?? '—' }}
                  </template>
                </template>
              </a-table>
            </div>
            <a-empty
              v-if="
                !record.lineItems?.length &&
                !record.scatterShipments?.length &&
                !record.shipAttachments?.length
              "
              description="无发货明细"
            />
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
                  <template v-else-if="column.key === 'outboundOrderNo'">
                    <a
                      v-if="row.outboundId || row.outboundOrderNo"
                      class="link-code"
                      @click="goOutboundDetail(row)"
                    >
                      {{ row.outboundOrderNo || '—' }}
                    </a>
                    <span v-else>—</span>
                  </template>
                  <template v-else-if="column.key === 'applyQty'">
                    {{ formatOutboundQtyInt(row.applyQty) }}
                  </template>
                  <template v-else-if="column.key === 'actualQty'">
                    {{ formatOutboundQtyInt(row.actualQty) }}
                  </template>
                  <template v-else>
                    {{ row[column.dataIndex] || '—' }}
                  </template>
                </template>
              </a-table>
            </div>
          </template>
        </div>
      </template>
      <a-empty v-else-if="!loading" description="未找到该发货单" />
    </a-spin>

    <DeliveryOrderPrintModal v-model:open="printModalOpen" :delivery-order="record" />
  </div>
</template>

<script>
export default { name: 'DeliveryOrderDetailView' }
</script>

<script setup>
import { computed, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { tabStore, useTabs } from '@/composables/useTabs'
import { findLinkedSalesOutbound } from '@/utils/deliveryOutbound'
import {
  flattenOutboundOrdersToIssueLines,
  createOutboundIssueLineColumns,
  getOutboundIssueLineScrollX,
} from '@/utils/outboundIssueLines'
import { getDeliveryOrderById, refreshOutboundQtyAll } from '@/store/deliveryOrderStore'
import { getSalesOrderById, salesOrderState } from '@/store/salesOrderStore'
import { productInfoState } from '@/store/productInfoStore'
import { outboundState } from '@/store/outboundStore'
import { getSelectedMaterialPicks } from '@/utils/shipEbom'
import { deliveryStatusColor, formatOutboundQtyInt } from '@/utils/deliveryOrder'
import {
  enrichDeliveryLineForDisplay,
  formatDeliveryQty,
  formatDeliveryPrice,
  formatDeliveryWeight,
  formatShipProgress,
  lineShipStatusColor,
} from '@/utils/deliveryLine'
import { attachmentShipStatusColor, formatAttachmentShipProgress } from '@/utils/shipBomAttachments'
import DeliveryOrderPrintModal from './components/DeliveryOrderPrintModal.vue'
import DeliveryOrderBasicInfoSection from './components/DeliveryOrderBasicInfoSection.vue'

const route = useRoute()
const router = useRouter()
const { openTab } = useTabs()

const loading = ref(false)
const record = ref(null)
const activeTab = ref('basic')
const printModalOpen = ref(false)

const wholeColumns = [
  { title: '序号', key: 'index', width: 56, align: 'center', fixed: 'left' },
  {
    title: '产品名称',
    dataIndex: 'productName',
    width: 140,
    ellipsis: true,
    fixed: 'left',
  },
  { title: '发货状态', key: 'lineShipStatus', width: 88, align: 'center' },
  { title: '发货进度', key: 'shipProgress', width: 160, align: 'right' },
  { title: '产品编码', dataIndex: 'productCode', width: 120, ellipsis: true },
  { title: '规格型号', dataIndex: 'specModel', width: 100, ellipsis: true },
  { title: '材质', dataIndex: 'material', width: 72 },
  { title: '变体属性', dataIndex: 'variantAttr', width: 140, ellipsis: true },
  { title: '图号', dataIndex: 'drawingNo', width: 100, ellipsis: true },
  { title: '订单数量', key: 'orderQty', width: 96, align: 'right' },
  { title: '单价（不含税）', key: 'unitPriceExTax', width: 120, align: 'right' },
  { title: '单价（含税）', key: 'unitPriceInTax', width: 110, align: 'right' },
  { title: '单位', dataIndex: 'unit', width: 56, align: 'center' },
  { title: '出库仓库', dataIndex: 'shipWarehouse', width: 120 },
  { title: '本次发货数量', key: 'shipQty', width: 120, align: 'right' },
  { title: '发货重量', key: 'shipWeight', width: 110, align: 'right' },
  { title: '发货单价（不含税）', key: 'deliveryUnitPriceExTax', width: 168, align: 'right' },
  { title: '发货总额', key: 'deliveryAmountExTax', width: 110, align: 'right' },
  { title: '包装形式', dataIndex: 'packagingForm', width: 88, ellipsis: true },
  { title: '交付方式', key: 'deliveryMode', width: 88, align: 'center' },
  { title: '备注', dataIndex: 'lineRemark', width: 120, ellipsis: true },
]

const wholeTableScrollX = wholeColumns.reduce((sum, col) => sum + (col.width || 100), 0)

const scatterPickColumns = [
  { title: '物料名称', dataIndex: 'name', width: 160, ellipsis: true },
  { title: '编码', dataIndex: 'code', width: 120, ellipsis: true },
  { title: '规格', dataIndex: 'spec', width: 100, ellipsis: true },
  { title: '需求数量', dataIndex: 'demandQty', width: 88, align: 'right' },
  { title: '本次发运', dataIndex: 'shipQty', width: 88, align: 'right' },
  { title: '单位', dataIndex: 'unit', width: 56 },
]

const shipAttachmentColumns = [
  { title: '#', key: 'index', width: 48 },
  { title: '发货状态', key: 'shipStatus', width: 88 },
  { title: '发货进度', key: 'shipProgress', width: 140, align: 'right' },
  { title: '来源', key: 'source', width: 72 },
  { title: '物料编码', dataIndex: 'materialCode', width: 120 },
  { title: '物料名称', dataIndex: 'materialName', ellipsis: true },
  { title: '规格型号', dataIndex: 'specModel', width: 110, ellipsis: true },
  { title: '关联产品', dataIndex: 'productName', width: 120, ellipsis: true },
  { title: '发运数量', dataIndex: 'shipQty', width: 90, align: 'right' },
  { title: '单位', dataIndex: 'unit', width: 56 },
  { title: '纳入本单', key: 'selected', width: 80 },
]

const outboundColumns = createOutboundIssueLineColumns()
const outboundTableScrollX = getOutboundIssueLineScrollX(outboundColumns)

const outboundRows = computed(() => {
  void outboundState.orders
  if (!record.value) return []
  const ob = findLinkedSalesOutbound(record.value)
  return ob ? flattenOutboundOrdersToIssueLines([ob]) : []
})

const outboundList = outboundRows

const sourceSalesOrder = computed(() => {
  if (!record.value?.salesOrderId) return null
  return getSalesOrderById(record.value.salesOrderId)
})

const wholeLineRows = computed(() => {
  void salesOrderState.orders
  void productInfoState.products
  const order = record.value
  if (!order?.lineItems?.length) return []
  const so = sourceSalesOrder.value
  return order.lineItems.map((line) =>
    enrichDeliveryLineForDisplay(line, so, { outboundWarehouse: order.outboundWarehouse }),
  )
})

function displayLineCell(line, column) {
  const val = column.dataIndex ? line[column.dataIndex] : line[column.key]
  return val !== undefined && val !== null && String(val).trim() !== '' ? val : '—'
}

function goOutboundDetail(row) {
  const id = row?.outboundId
  if (!id) return
  const path = `/inventory/outbound/${id}`
  openTab(path, '出库单详情')
  router.push(path)
}

function scatterPicks(ship) {
  return getSelectedMaterialPicks(ship).map((p) => ({
    materialId: p.materialId,
    name: p.name,
    code: p.code,
    spec: p.spec || '—',
    demandQty: formatDeliveryQty(p.demandQty),
    shipQty: formatDeliveryQty(p.shipQty),
    unit: p.unit || '件',
  }))
}

function loadRecord() {
  loading.value = true
  refreshOutboundQtyAll()
  record.value = getDeliveryOrderById(route.params.id)
  loading.value = false
  if (record.value) {
    const tab = tabStore.tabs.find((t) => t.path === route.path)
    if (tab) tab.title = `发货单 ${record.value.deliveryCode}`
  }
}

watch(() => route.params.id, loadRecord, { immediate: true })

function openPrint() {
  printModalOpen.value = true
}

function handleBack() {
  router.push('/sales/delivery')
}

function goSalesOrder() {
  if (!record.value?.salesOrderId) return
  const path = `/sales/orders/${record.value.salesOrderId}`
  openTab(path, `销售订单 ${record.value.sourceOrderNo}`)
  router.push({ name: 'sales-orders-detail', params: { id: record.value.salesOrderId } })
}
</script>

<style lang="less" scoped>
.link-code {
  color: #1677ff;
  cursor: pointer;
}

.delivery-order-detail-page {
  margin: -12px;
  height: calc(100vh - 112px);
  max-height: calc(100vh - 112px);
  min-height: 0;
  background: #f5f6f8;
  display: flex;
  flex-direction: column;
  overflow: hidden;

  :deep(.ant-spin-nested-loading),
  :deep(.ant-spin-container) {
    flex: 1;
    min-height: 0;
    height: 100%;
    display: flex;
    flex-direction: column;
  }
}

.detail-sticky-bar {
  flex-shrink: 0;
  position: sticky;
  top: 0;
  z-index: 30;
  background: #f5f6f8;
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

.detail-sticky-bar .detail-tabs-wrap {
  flex-shrink: 0;
}

.tab-body {
  flex: 1;
  min-height: 0;
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
  margin-bottom: 12px;
}

.scatter-block {
  margin-bottom: 12px;

  &:last-child {
    margin-bottom: 0;
  }
}

.scatter-head {
  font-size: 13px;
  font-weight: 600;
  color: #262626;
  margin-bottom: 10px;
}
</style>
