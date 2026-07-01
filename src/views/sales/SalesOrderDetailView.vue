<template>
  <div class="sales-order-detail-page">
    <a-spin :spinning="loading">
      <template v-if="order">
        <div class="page-header">
          <div class="header-left">
            <span class="order-no">{{ order.orderNo }}</span>
            <a-tag :color="progressColor(order.progressStatus)">{{ order.progressStatus }}</a-tag>
            <a-tag :color="order.deliveryStatus === '未发货' ? 'default' : 'processing'">
              {{ order.deliveryStatus || '未发货' }}
            </a-tag>
          </div>
          <a-button size="small" @click="handleBack">返回列表</a-button>
        </div>

        <a-tabs v-model:active-key="activeTab" class="detail-tabs">
          <a-tab-pane key="overview" tab="概览" />
          <a-tab-pane key="delivery" :tab="`发货申请 (${relations.deliveryApplications.length})`" />
          <a-tab-pane key="outbound" :tab="`出库单 (${relations.outboundOrders.length})`" />
          <a-tab-pane key="purchase" :tab="`采购 (${purchaseTabCount})`" />
          <a-tab-pane key="production" :tab="`生产 (${productionTabCount})`" />
          <a-tab-pane key="outsourcing" :tab="`外协 (${relations.outsourcingOrders.length})`" />
          <a-tab-pane key="attachments" :tab="`附件 (${relations.attachments.length})`" />
          <a-tab-pane key="ebom-info">
            <template #tab>
              <span>EBOM信息</span>
              <a-badge
                v-if="bomChangedCount"
                :count="bomChangedCount"
                :number-style="{ backgroundColor: '#fa8c16', marginLeft: '6px' }"
              />
            </template>
          </a-tab-pane>
        </a-tabs>

        <div class="tab-body">
          <template v-if="activeTab === 'overview'">
            <div class="section-card">
              <div class="section-title">基本信息</div>
              <SalesOrderBasicInfoSection :order="order" />
            </div>

            <div class="section-card">
              <div class="section-title">关联概览</div>
              <a-row :gutter="[12, 12]">
                <a-col :span="6">
                  <a-statistic title="发货申请" :value="relations.deliveryApplications.length" />
                </a-col>
                <a-col :span="6">
                  <a-statistic title="出库单" :value="relations.outboundOrders.length" />
                </a-col>
                <a-col :span="6">
                  <a-statistic title="采购单" :value="relations.purchaseOrders.length" />
                </a-col>
                <a-col :span="6">
                  <a-statistic title="生产工单" :value="relations.workOrders.length" />
                </a-col>
              </a-row>
            </div>

            <div class="section-card">
              <div class="section-title">销售明细</div>
              <a-table
                :columns="lineColumns"
                :data-source="order.lineItems || []"
                row-key="id"
                size="small"
                bordered
                :pagination="false"
                :scroll="{ x: lineTableScrollX }"
              >
                <template #bodyCell="{ column, record: line, index }">
                  <template v-if="column.key === 'index'">{{ index + 1 }}</template>
                  <template v-else-if="column.key === 'businessType'">
                    {{ resolveLineBusinessType(line, order) }}
                  </template>
                  <template v-else-if="column.key === 'deliveryMode'">
                    <a-tag :color="line.deliveryMode === '散件' ? 'orange' : 'blue'">
                      {{ line.deliveryMode || '整机' }}
                    </a-tag>
                  </template>
                  <template v-else-if="isMoneyColumn(column.key)">
                    {{ formatMoneyCell(line, column) }}
                  </template>
                  <template v-else>
                    {{ displayCell(line, column) }}
                  </template>
                </template>
              </a-table>
            </div>
          </template>

          <template v-else-if="activeTab === 'ebom-info'">
            <div class="section-card">
              <div class="section-title">EBOM 信息</div>
              <div class="section-hint">展示各明细行现行 EBOM（始终为最新版本）；「初始版本」为订单审核通过时生成的快照版本。</div>
              <a-table
                :columns="ebomColumns"
                :data-source="salesOrderEbomRows"
                row-key="id"
                size="small"
                bordered
                :pagination="false"
                :scroll="{ x: ebomTableScrollX }"
                :locale="{ emptyText: '暂无销售明细' }"
              >
                <template #bodyCell="{ column, record: row }">
                  <template v-if="column.key === 'index'">{{ row.index }}</template>
                  <template v-else-if="column.key === 'ebomStatus'">
                    <a-tag :color="row.ebomStatusColor">{{ row.ebomStatus }}</a-tag>
                  </template>
                  <template v-else-if="column.key === 'bomName'">
                    <a
                      v-if="row.bomId"
                      class="link-code"
                      @click.prevent="openBomDetail(row.bomId, row.bomName)"
                    >
                      {{ row.bomName }}
                    </a>
                    <span v-else>{{ row.bomName }}</span>
                  </template>
                  <template v-else-if="column.key === 'boundVersion'">
                    <span>{{ row.boundVersion }}</span>
                  </template>
                  <template v-else>
                    {{ row[column.dataIndex] ?? '—' }}
                  </template>
                </template>
              </a-table>
            </div>

            <div v-if="bomChangedLines.length" class="section-card">
              <div class="section-title">EBOM 版本变更</div>
              <div
                v-for="line in bomChangedLines"
                :key="line.id"
                class="bom-product-block"
              >
                <div class="bom-line-head">
                  <span class="bom-product-name">{{ line.productName }}</span>
                  <span class="bom-product-code">{{ line.productCode }}</span>
                  <a-tag color="orange">初始版本 {{ line.bomVersion || '—' }}</a-tag>
                  <a-tag v-if="lineActiveVersion(line)" color="blue">
                    现行版本 {{ lineActiveVersion(line) }}
                  </a-tag>
                </div>
                <BomVersionInfoSection
                  :product-id="line.productId"
                  :bom-id="line.bomId"
                  :bound-version="line.bomVersion"
                  :compare-quantity="Number(line.salesQty ?? line.qty) || 1"
                />
                <SalesOrderEbomDiffSection :line="line" />
              </div>
            </div>
          </template>

          <template v-else-if="activeTab === 'delivery'">
            <div class="section-card">
              <div class="section-title">发货申请</div>
              <a-table
                :columns="deliveryColumns"
                :data-source="relations.deliveryApplications"
                row-key="id"
                size="small"
                bordered
                :pagination="false"
                :scroll="{ x: deliveryTableScrollX }"
                :locale="{ emptyText: '暂无发货申请' }"
              >
                <template #bodyCell="{ column, record: row }">
                  <template v-if="column.key === 'deliveryStatus'">
                    <a-tag :color="deliveryStatusColor(row.deliveryStatus)">
                      {{ row.deliveryStatus || '—' }}
                    </a-tag>
                  </template>
                  <template v-else-if="column.key === 'deliveryCode'">
                    <a v-if="row.deliveryOrderId" class="link-code" @click="goDeliveryDetail(row)">
                      {{ row.deliveryCode }}
                    </a>
                    <span v-else>{{ row.deliveryCode || '—' }}</span>
                  </template>
                  <template v-else-if="column.key === 'applyShipQty'">
                    {{ formatOutboundQtyInt(row.applyShipQty) }}
                  </template>
                  <template v-else-if="column.key === 'actualOutboundQty'">
                    {{ formatOutboundQtyInt(row.actualOutboundQty) }}
                  </template>
                  <template v-else-if="column.key === 'shipWeight'">
                    {{ formatShipWeight(row.shipWeight) }}
                  </template>
                  <template v-else-if="column.key === 'totalAmountExTax'">
                    {{ formatAmountExTax(row.totalAmountExTax) }}
                  </template>
                  <template v-else>
                    {{ row[column.dataIndex] ?? '—' }}
                  </template>
                </template>
              </a-table>
            </div>
          </template>

          <template v-else-if="activeTab === 'outbound'">
            <div class="section-card">
              <div class="section-title">出库单</div>
              <a-table
                :columns="outboundColumns"
                :data-source="relations.outboundOrders"
                row-key="id"
                size="small"
                bordered
                :pagination="false"
                :scroll="{ x: outboundTableScrollX }"
                :locale="{ emptyText: '暂无关联出库单' }"
              >
                <template #bodyCell="{ column, record: row }">
                  <template v-if="column.key === 'status'">
                    <a-tag :color="outboundStatusColor(row.status)">{{ row.status || '—' }}</a-tag>
                  </template>
                  <template v-else-if="column.key === 'docNo'">
                    <a class="link-code" @click="goOutboundDetail(row)">{{ row.docNo || '—' }}</a>
                  </template>
                  <template v-else-if="column.key === 'shipQtyTotal'">
                    {{ formatOutboundQty(calcOutboundShipQty(row)) }}
                  </template>
                  <template v-else-if="column.key === 'operator'">
                    {{ row.creator || '—' }}
                  </template>
                  <template v-else>
                    {{ row[column.dataIndex] ?? '—' }}
                  </template>
                </template>
              </a-table>
            </div>
          </template>

          <template v-else-if="activeTab === 'purchase'">
            <div class="section-card">
              <div class="section-title">采购申请</div>
              <a-table
                :columns="purchaseReqColumns"
                :data-source="relations.purchaseRequisitions"
                row-key="id"
                size="small"
                bordered
                :pagination="false"
                :scroll="{ x: purchaseReqTableScrollX }"
                class="sub-table"
                :locale="{ emptyText: '暂无采购申请' }"
              >
                <template #bodyCell="{ column, record: row }">
                  <template v-if="column.key === 'docStatus'">
                    <a-tag :color="purchaseReqStatusColor(row.docStatus)">
                      {{ row.docStatus || row.status || '—' }}
                    </a-tag>
                  </template>
                  <template v-else-if="column.key === 'reqNo'">
                    <a class="link-code" @click.prevent="goPurchaseReq(row.id)">{{ row.reqNo || '—' }}</a>
                  </template>
                  <template v-else-if="column.key === 'planItemCount'">
                    {{ purchaseReqPlanItemCount(row) }}
                  </template>
                  <template v-else-if="column.key === 'plannedQty'">
                    {{ formatPurchaseQty(row.plannedQty) }}
                  </template>
                  <template v-else>
                    {{ row[column.dataIndex] ?? '—' }}
                  </template>
                </template>
              </a-table>
            </div>
            <div class="section-card">
              <div class="section-title">采购订单</div>
              <a-table
                :columns="purchaseOrderColumns"
                :data-source="relations.purchaseOrders"
                row-key="id"
                size="small"
                bordered
                :pagination="false"
                :scroll="{ x: purchaseOrderTableScrollX }"
                :locale="{ emptyText: '暂无采购订单' }"
              >
                <template #bodyCell="{ column, record: row }">
                  <template v-if="column.key === 'status'">
                    <a-tag :color="purchaseOrderStatusColor(row.status)">{{ row.status || '—' }}</a-tag>
                  </template>
                  <template v-else-if="column.key === 'inboundStatus'">
                    <a-tag :color="purchaseInboundStatusColor(row.inboundStatus)">
                      {{ row.inboundStatus || '—' }}
                    </a-tag>
                  </template>
                  <template v-else-if="column.key === 'orderNo'">
                    <span class="link-code">{{ row.orderNo || '—' }}</span>
                  </template>
                  <template v-else-if="column.key === 'supplier'">
                    {{ row.supplier || row.supplierName || '—' }}
                  </template>
                  <template v-else>
                    {{ row[column.dataIndex] ?? '—' }}
                  </template>
                </template>
              </a-table>
            </div>
          </template>

          <template v-else-if="activeTab === 'production'">
            <div class="section-card">
              <div class="section-title">生产计划</div>
              <a-table
                :columns="planColumns"
                :data-source="relations.productionPlans"
                row-key="id"
                size="small"
                bordered
                :pagination="false"
                :scroll="{ x: planTableScrollX }"
                class="sub-table"
                :locale="{ emptyText: '暂无生产计划（自产订单审核后生成）' }"
              >
                <template #bodyCell="{ column, record: row }">
                  <template v-if="column.key === 'orderStatus'">
                    <a-tag :color="productionPlanStatusColor(row.orderStatus)">
                      {{ row.orderStatus || '—' }}
                    </a-tag>
                  </template>
                  <template v-else-if="column.key === 'scheduleQty'">
                    {{ formatProductionQty(productionPlanScheduleQty(row)) }}
                  </template>
                  <template v-else-if="column.key === 'productQty'">
                    {{ formatProductionQty(row.productQty) }}
                  </template>
                  <template v-else>
                    {{ row[column.dataIndex] ?? '—' }}
                  </template>
                </template>
              </a-table>
            </div>
            <div class="section-card">
              <div class="section-title">生产工单</div>
              <a-table
                :columns="productionWorkOrderColumns"
                :data-source="relations.workOrders"
                row-key="id"
                size="small"
                bordered
                :pagination="false"
                :scroll="{ x: productionWorkOrderTableScrollX }"
                class="sub-table"
                :locale="{ emptyText: '暂无生产工单' }"
              >
                <template #bodyCell="{ column, record: row }">
                  <template v-if="column.key === 'status'">
                    <a-tag :color="workOrderStatusColor(row.status)">{{ row.status || '—' }}</a-tag>
                  </template>
                  <template v-else-if="column.key === 'progress'">
                    {{ row.progressLabel || row.status || '—' }}
                  </template>
                  <template v-else-if="column.key === 'orderType'">
                    {{ row.orderCategory || row.orderType || '—' }}
                  </template>
                  <template v-else-if="column.key === 'scheduleQty'">
                    {{ formatProductionQty(row.scheduleQty ?? row.planQty) }}
                  </template>
                  <template v-else-if="column.key === 'owner'">
                    {{ row.owner || row.personInCharge || '—' }}
                  </template>
                  <template v-else>
                    {{ productionWorkOrderCell(row, column) }}
                  </template>
                </template>
              </a-table>
            </div>
            <div class="section-card">
              <div class="section-title">总装工单</div>
              <a-table
                :columns="assemblyWorkOrderColumns"
                :data-source="relations.assemblyWorkOrders"
                row-key="id"
                size="small"
                bordered
                :pagination="false"
                :scroll="{ x: assemblyWorkOrderTableScrollX }"
                :locale="{ emptyText: '暂无总装工单' }"
              >
                <template #bodyCell="{ column, record: row }">
                  <template v-if="column.key === 'status'">
                    <a-tag :color="workOrderStatusColor(row.status)">{{ row.status || '—' }}</a-tag>
                  </template>
                  <template v-else-if="column.key === 'progress'">
                    {{ row.progressLabel || row.status || '—' }}
                  </template>
                  <template v-else-if="column.key === 'orderType'">
                    {{ row.orderCategory || row.orderType || '—' }}
                  </template>
                  <template v-else-if="column.key === 'scheduleQty'">
                    {{ formatProductionQty(row.scheduleQty ?? row.planQty) }}
                  </template>
                  <template v-else-if="column.key === 'owner'">
                    {{ row.owner || row.personInCharge || '—' }}
                  </template>
                  <template v-else>
                    {{ productionWorkOrderCell(row, column) }}
                  </template>
                </template>
              </a-table>
            </div>
          </template>

          <template v-else-if="activeTab === 'outsourcing'">
            <div class="section-card">
              <div class="section-title">外协订单</div>
              <a-table
                :columns="outsourcingColumns"
                :data-source="relations.outsourcingOrders"
                row-key="id"
                size="small"
                bordered
                :pagination="false"
                :scroll="{ x: outsourcingTableScrollX }"
                :locale="{ emptyText: '暂无外协订单' }"
              >
                <template #bodyCell="{ column, record: row }">
                  <template v-if="column.key === 'status'">
                    <a-tag :color="outsourcingStatusColor(row.status)">{{ row.status || '—' }}</a-tag>
                  </template>
                  <template v-else-if="column.key === 'inboundStatus'">
                    <a-tag :color="purchaseInboundStatusColor(row.inboundStatus)">
                      {{ row.inboundStatus || '—' }}
                    </a-tag>
                  </template>
                  <template v-else-if="column.key === 'outsourceQty'">
                    {{ formatProductionQty(row.outsourceQty ?? row.qty) }}
                  </template>
                  <template v-else-if="column.key === 'planTime'">
                    {{ row.planTime || row.planCompleteDate || '—' }}
                  </template>
                  <template v-else>
                    {{ row[column.dataIndex] ?? '—' }}
                  </template>
                </template>
              </a-table>
            </div>
          </template>

          <template v-else-if="activeTab === 'attachments'">
            <div class="section-card">
              <div class="section-title">附件信息</div>
              <a-table
                v-if="relations.attachments.length"
                :columns="attachmentColumns"
                :data-source="relations.attachments"
                row-key="uid"
                size="small"
                bordered
                :pagination="false"
              >
                <template #bodyCell="{ column, record: file }">
                  <template v-if="column.key === 'action'">
                    <a-button type="link" size="small" @click="previewFile(file)">预览</a-button>
                  </template>
                  <template v-else>
                    {{ file[column.dataIndex] ?? file.name ?? '—' }}
                  </template>
                </template>
              </a-table>
              <a-empty v-else description="暂无附件" />
            </div>
          </template>
        </div>
      </template>

      <a-empty v-else-if="!loading" description="未找到该销售订单" />
    </a-spin>
  </div>
</template>

<script>
export default { name: 'SalesOrderDetailView' }
</script>

<script setup>
import { computed, onActivated, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { message } from 'ant-design-vue'
import { tabStore, useTabs } from '@/composables/useTabs'
import { getSalesOrderById, resolveSalesOrderRelations } from '@/utils/salesOrderDetail'
import {
  deliveryStatusColor,
  formatAmountExTax,
  formatOutboundQtyInt,
  formatShipWeight,
} from '@/utils/deliveryOrder'
import { calcOutboundShipQty } from '@/mock/outboundOrders'
import { outboundStatusColor } from '@/mock/outboundOptions'
import { resolveLineBusinessType } from '@/utils/salesOrderBusiness'
import { getActiveBomForItem } from '@/store/productBomStore'
import BomVersionInfoSection from '@/components/BomVersionInfoSection.vue'
import SalesOrderBasicInfoSection from './components/SalesOrderBasicInfoSection.vue'
import SalesOrderEbomDiffSection from './components/SalesOrderEbomDiffSection.vue'
import { salesOrderDetailLineColumns } from '@/utils/salesOrderLineColumns'
import { buildSalesOrderEbomRows } from '@/utils/salesOrderBomRows'
import {
  normalizeSalesOrderDetailTab,
  persistSalesOrderDetailTab,
  readSalesOrderDetailTab,
} from '@/utils/salesOrderDetailTab'

const route = useRoute()
const router = useRouter()
const { openTab } = useTabs()

const loading = ref(false)
const order = ref(null)

function initActiveTab() {
  return readSalesOrderDetailTab(route.params.id, route.query.tab)
}

const activeTab = ref(initActiveTab())

const relations = computed(() => resolveSalesOrderRelations(order.value))

const purchaseTabCount = computed(
  () => relations.value.purchaseRequisitions.length + relations.value.purchaseOrders.length,
)

const productionTabCount = computed(
  () =>
    relations.value.productionPlans.length +
    relations.value.workOrders.length +
    relations.value.assemblyWorkOrders.length,
)

const bomChangedLines = computed(() =>
  (order.value?.lineItems || []).filter(
    (line) => line.productId && lineBomVersionHint(line),
  ),
)

const bomChangedCount = computed(() => bomChangedLines.value.length)

const salesOrderEbomRows = computed(() => buildSalesOrderEbomRows(order.value?.lineItems || []))

const ebomColumns = [
  { key: 'index', title: '序号', width: 56, align: 'center', fixed: 'left' },
  { key: 'ebomStatus', title: 'EBOM状态', width: 100, fixed: 'left' },
  { key: 'bomName', title: 'EBOM名称', dataIndex: 'bomName', width: 160, ellipsis: true, fixed: 'left' },
  { key: 'bomNo', title: 'EBOM编码', dataIndex: 'bomNo', width: 130, ellipsis: true },
  { key: 'itemName', title: '产品名称', dataIndex: 'itemName', width: 140, ellipsis: true },
  { key: 'initialVersion', title: '初始版本', dataIndex: 'initialVersion', width: 96 },
  { key: 'boundVersion', title: '订单绑定版本', dataIndex: 'boundVersion', width: 120 },
  { key: 'specModel', title: '规格型号', dataIndex: 'specModel', width: 110, ellipsis: true },
  { key: 'material', title: '材质', dataIndex: 'material', width: 88, ellipsis: true },
  { key: 'drawingNo', title: '图号', dataIndex: 'drawingNo', width: 100, ellipsis: true },
  { key: 'levelCount', title: '层级数', dataIndex: 'levelCount', width: 72, align: 'center' },
  { key: 'materialCount', title: '物料数', dataIndex: 'materialCount', width: 72, align: 'center' },
  { key: 'snapshotAt', title: '快照时间', dataIndex: 'snapshotAt', width: 150 },
]

const ebomTableScrollX = computed(() =>
  ebomColumns.reduce((sum, col) => sum + (col.width || 100), 0),
)

const lineColumns = salesOrderDetailLineColumns

const lineTableScrollX = computed(() =>
  lineColumns.reduce((sum, col) => sum + (col.width || 100), 0),
)

function lineBomVersionHint(line) {
  const active = getActiveBomForItem('product', line.productId)
  return Boolean(active?.version && line.bomVersion && active.version !== line.bomVersion)
}

function lineActiveVersion(line) {
  return getActiveBomForItem('product', line.productId)?.version || ''
}

const moneyColumnKeys = new Set([
  'unitPriceExTax',
  'unitPriceInTax',
  'totalPriceExTax',
  'totalPriceInTax',
])

function isMoneyColumn(key) {
  return moneyColumnKeys.has(key)
}

function formatMoneyCell(line, column) {
  const val = line[column.dataIndex]
  if (val === undefined || val === null || val === '') return '—'
  return `￥${formatMoney(val)}`
}

const deliveryColumns = [
  { title: '发货状态', key: 'deliveryStatus', width: 96, fixed: 'left' },
  { title: '发货单号', key: 'deliveryCode', width: 140, fixed: 'left' },
  { title: '申请发货数量', key: 'applyShipQty', width: 110, align: 'right' },
  { title: '实际出库数量', key: 'actualOutboundQty', width: 110, align: 'right' },
  { title: '发货重量', key: 'shipWeight', width: 96, align: 'right' },
  { title: '发货总金额（不含税）', key: 'totalAmountExTax', width: 140, align: 'right' },
  { title: '发货方式', dataIndex: 'shipmentMethod', width: 88 },
  { title: '物流单号', dataIndex: 'logisticsNo', width: 130, ellipsis: true },
  { title: '客户联系人', dataIndex: 'contactPerson', width: 100 },
  { title: '联系方式', dataIndex: 'contactPhone', width: 120 },
  { title: '交货地址', dataIndex: 'deliveryAddress', width: 180, ellipsis: true },
  { title: '司机姓名', dataIndex: 'driverName', width: 90 },
  { title: '司机联系方式', dataIndex: 'driverPhone', width: 120 },
  { title: '车牌号', dataIndex: 'plateNo', width: 100 },
]

const deliveryTableScrollX = computed(() =>
  deliveryColumns.reduce((sum, col) => sum + (col.width || 100), 0),
)

const outboundColumns = [
  { title: '出库状态', key: 'status', width: 96, fixed: 'left' },
  { title: '出库单号', key: 'docNo', width: 150, fixed: 'left' },
  { title: '出库类型', dataIndex: 'outboundType', width: 100 },
  { title: '仓库', dataIndex: 'warehouse', width: 90 },
  { title: '出库数量', key: 'shipQtyTotal', width: 96, align: 'right' },
  { title: '出库时间', dataIndex: 'outboundTime', width: 160 },
  { title: '经手人', dataIndex: 'handler', width: 88 },
  { title: '操作人', key: 'operator', width: 88 },
]

const outboundTableScrollX = computed(() =>
  outboundColumns.reduce((sum, col) => sum + (col.width || 100), 0),
)

function formatOutboundQty(val) {
  if (val == null || val === '') return '—'
  return Number(val).toLocaleString(undefined, { maximumFractionDigits: 3 })
}

const purchaseReqColumns = [
  { title: '状态', key: 'docStatus', width: 90, fixed: 'left' },
  { title: '申请单号', key: 'reqNo', width: 160, fixed: 'left' },
  { title: '计划项数', key: 'planItemCount', width: 88, align: 'right' },
  { title: '计划数量', key: 'plannedQty', width: 100, align: 'right' },
  { title: '期望到货时间', dataIndex: 'estimatedArrivalDate', width: 120 },
  { title: '预入仓库', dataIndex: 'receivingWarehouse', width: 100, ellipsis: true },
  { title: '创建人', dataIndex: 'creator', width: 88 },
  { title: '创建时间', dataIndex: 'createdAt', width: 150 },
]

const purchaseReqTableScrollX = computed(() =>
  purchaseReqColumns.reduce((sum, col) => sum + (col.width || 100), 0),
)

const purchaseOrderColumns = [
  { title: '状态', key: 'status', width: 90, fixed: 'left' },
  { title: '入库状态', key: 'inboundStatus', width: 96, fixed: 'left' },
  { title: '采购单号', key: 'orderNo', width: 140 },
  { title: '供应商', key: 'supplier', width: 140, ellipsis: true },
  { title: '交货日期', dataIndex: 'deliveryDate', width: 110 },
  { title: '采购员', dataIndex: 'purchaser', width: 88 },
  { title: '送货日期', dataIndex: 'shippingDate', width: 110 },
  { title: '创建人', dataIndex: 'creator', width: 88 },
  { title: '创建日期', dataIndex: 'documentDate', width: 110 },
]

const purchaseOrderTableScrollX = computed(() =>
  purchaseOrderColumns.reduce((sum, col) => sum + (col.width || 100), 0),
)

function purchaseReqPlanItemCount(row) {
  return (row.lineItems || []).length
}

function formatPurchaseQty(val) {
  if (val == null || val === '') return '—'
  return Number(val).toFixed(4)
}

function purchaseReqStatusColor(status) {
  const map = {
    待处理: 'processing',
    处理中: 'warning',
    处理完成: 'success',
    已作废: 'default',
  }
  return map[status] || 'default'
}

function purchaseOrderStatusColor(status) {
  const map = { 待审批: 'default', 进行中: 'processing', 已完成: 'success' }
  return map[status] || 'default'
}

function purchaseInboundStatusColor(status) {
  const map = { 未入库: 'default', 部分入库: 'warning', 已入库: 'success' }
  return map[status] || 'default'
}

const planColumns = [
  { title: '状态', key: 'orderStatus', width: 96, fixed: 'left' },
  { title: '计划单号', dataIndex: 'orderNo', width: 140, fixed: 'left' },
  { title: '产品数量', key: 'productQty', width: 96, align: 'right' },
  { title: '排产数量', key: 'scheduleQty', width: 96, align: 'right' },
]

const planTableScrollX = computed(() =>
  planColumns.reduce((sum, col) => sum + (col.width || 100), 0),
)

const productionWorkOrderSharedColumns = [
  { title: '状态', key: 'status', width: 88, fixed: 'left' },
  { title: '进度', key: 'progress', width: 88 },
  { title: '工单编号', dataIndex: 'code', width: 150, ellipsis: true, fixed: 'left' },
  { title: '工单名称', dataIndex: 'name', width: 160, ellipsis: true },
  { title: '工单类型', key: 'orderType', width: 96 },
  { title: '产品名称', dataIndex: 'productName', width: 130, ellipsis: true },
  { title: '规格型号', dataIndex: 'specModel', width: 110, ellipsis: true },
  { title: '材质', dataIndex: 'material', width: 88, ellipsis: true },
  { title: '图号', dataIndex: 'drawingNo', width: 100, ellipsis: true },
  { title: '排产数量', key: 'scheduleQty', width: 96, align: 'right' },
  { title: '工作中心', dataIndex: 'workCenter', width: 100, ellipsis: true },
  { title: '负责人', key: 'owner', width: 88 },
  { title: '工艺路线', dataIndex: 'processRouteName', width: 120, ellipsis: true },
]

const productionWorkOrderColumns = [
  ...productionWorkOrderSharedColumns,
  { title: '创建日期', dataIndex: 'createdAt', width: 110 },
]

const assemblyWorkOrderColumns = [...productionWorkOrderSharedColumns]

const productionWorkOrderTableScrollX = computed(() =>
  productionWorkOrderColumns.reduce((sum, col) => sum + (col.width || 100), 0),
)

const assemblyWorkOrderTableScrollX = computed(() =>
  assemblyWorkOrderColumns.reduce((sum, col) => sum + (col.width || 100), 0),
)

function productionPlanScheduleQty(plan) {
  const items = plan?.workItems || []
  if (!items.length) return plan?.scheduleQty
  return items.reduce((sum, item) => sum + (Number(item.planQty) || 0), 0)
}

function formatProductionQty(val) {
  if (val == null || val === '') return '—'
  return Number(val).toLocaleString(undefined, { maximumFractionDigits: 3 })
}

function productionPlanStatusColor(status) {
  const text = String(status || '')
  if (text.includes('完成')) return 'success'
  if (text.includes('执行') || text.includes('生产')) return 'processing'
  if (text.includes('部分')) return 'warning'
  return 'default'
}

function workOrderStatusColor(status) {
  const map = {
    待下发: 'warning',
    已下发: 'processing',
    执行中: 'blue',
    完成: 'success',
    暂停: 'default',
    终止: 'error',
  }
  return map[status] || 'default'
}

function productionWorkOrderCell(row, column) {
  if (column.dataIndex === 'specModel') {
    return row.specModel || row.model || '—'
  }
  const val = row[column.dataIndex]
  return val !== undefined && val !== null && val !== '' ? val : '—'
}

const outsourcingColumns = [
  { title: '状态', key: 'status', width: 88, fixed: 'left' },
  { title: '入库状态', key: 'inboundStatus', width: 96 },
  { title: '外协单号', dataIndex: 'orderNo', width: 130, fixed: 'left' },
  { title: '供应商', dataIndex: 'supplierName', width: 140, ellipsis: true },
  { title: '外协数量', key: 'outsourceQty', width: 96, align: 'right' },
  { title: '计划时间', key: 'planTime', width: 110 },
  { title: '创建人', dataIndex: 'creator', width: 88 },
  { title: '创建时间', dataIndex: 'createdAt', width: 150 },
]

const outsourcingTableScrollX = computed(() =>
  outsourcingColumns.reduce((sum, col) => sum + (col.width || 100), 0),
)

function outsourcingStatusColor(status) {
  const map = {
    待下达: 'default',
    进行中: 'processing',
    已完成: 'success',
    已关闭: 'default',
  }
  return map[status] || 'default'
}

const attachmentColumns = [
  { title: '文件名', dataIndex: 'name', ellipsis: true },
  { title: '类型', dataIndex: 'type', width: 100 },
  { title: '上传时间', dataIndex: 'uploadedAt', width: 150 },
  { title: '操作', key: 'action', width: 80 },
]

function loadOrder() {
  const id = route.params.id
  loading.value = true
  order.value = getSalesOrderById(id)
  loading.value = false
  if (order.value) {
    const tab = tabStore.tabs.find((t) => t.path === route.path)
    if (tab) tab.title = `销售订单 ${order.value.orderNo}`
  }
}

function syncTabToRoute(tab) {
  const normalized = normalizeSalesOrderDetailTab(tab)
  persistSalesOrderDetailTab(route.params.id, normalized)
  const current = route.query.tab
  const queryTab = normalized === 'overview' ? undefined : normalized
  if ((current || undefined) === queryTab) return
  const query = { ...route.query }
  if (queryTab) query.tab = queryTab
  else delete query.tab
  router.replace({ path: route.path, query })
}

function restoreActiveTab() {
  if (route.query.tab) {
    const next = normalizeSalesOrderDetailTab(route.query.tab)
    if (activeTab.value !== next) activeTab.value = next
    return
  }
  const stored = readSalesOrderDetailTab(route.params.id)
  if (stored !== 'overview') {
    if (activeTab.value !== stored) activeTab.value = stored
    return
  }
  if (activeTab.value !== 'overview') {
    persistSalesOrderDetailTab(route.params.id, activeTab.value)
  }
}

watch(
  () => route.query.tab,
  (tab) => {
    if (tab) {
      const next = normalizeSalesOrderDetailTab(tab)
      if (activeTab.value !== next) activeTab.value = next
      return
    }
    restoreActiveTab()
  },
)

watch(
  () => route.params.id,
  () => {
    restoreActiveTab()
  },
)

watch(activeTab, (tab) => {
  syncTabToRoute(tab)
})

onActivated(() => {
  restoreActiveTab()
})

watch(() => route.params.id, loadOrder, { immediate: true })

function formatMoney(val) {
  return Number(val || 0).toFixed(2)
}

function progressColor(status) {
  if (status === '已审') return 'success'
  if (status === '未审') return 'warning'
  return 'default'
}

function displayCell(line, column) {
  const val = line[column.dataIndex]
  return val !== undefined && val !== null && val !== '' ? val : '—'
}

function previewFile(file) {
  message.info(`预览：${file.name || '附件'}`)
}

function handleBack() {
  router.push('/sales/orders')
}

function goPurchaseReq(id) {
  const path = `/procurement/purchase-req/${id}`
  openTab(path, '采购申请详情')
  router.push(path)
}

function goOutboundDetail(row) {
  if (!row?.id) return
  const path = `/inventory/outbound/${row.id}`
  openTab(path, row.docNo || '出库单详情')
  router.push({ name: 'inventory-outbound-detail', params: { id: row.id } })
}

function goDeliveryDetail(row) {
  if (!row.deliveryOrderId) return
  const path = `/sales/delivery/${row.deliveryOrderId}`
  openTab(path, `发货单 ${row.deliveryCode}`)
  router.push({ name: 'sales-delivery-detail', params: { id: row.deliveryOrderId } })
}

function openBomDetail(bomId, bomName) {
  if (!bomId) return
  const path = `/product-process/bom/${bomId}`
  openTab(path, bomName || 'BOM详情')
  router.push(path)
}
</script>

<style lang="less" scoped>
.link-code {
  color: #1677ff;
  cursor: pointer;
}

.sales-order-detail-page {
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

.detail-tabs {
  background: #fff;
  padding: 0 12px;
  margin: 0;
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

.section-hint {
  margin: -4px 0 10px;
  font-size: 12px;
  color: rgba(0, 0, 0, 0.45);
  line-height: 1.5;
}

.bom-line-head {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
  margin-bottom: 10px;
}

.bom-product-block {
  margin-bottom: 20px;
  padding-bottom: 16px;
  border-bottom: 1px dashed #f0f0f0;

  &:last-child {
    margin-bottom: 0;
    padding-bottom: 0;
    border-bottom: none;
  }
}

.bom-product-name {
  font-size: 13px;
  font-weight: 600;
  color: #262626;
}

.bom-product-code {
  font-size: 12px;
  color: rgba(0, 0, 0, 0.45);
}

.sub-table {
  margin-bottom: 12px;
}
</style>
