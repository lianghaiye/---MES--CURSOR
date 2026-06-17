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
          <a-tab-pane key="lines" tab="订单明细" />
          <a-tab-pane key="delivery" :tab="`发货申请 (${relations.deliveryApplications.length})`" />
          <a-tab-pane key="outbound" :tab="`出库单 (${relations.outboundOrders.length})`" />
          <a-tab-pane key="purchase" :tab="`采购 (${purchaseTabCount})`" />
          <a-tab-pane key="production" :tab="`生产 (${productionTabCount})`" />
          <a-tab-pane key="outsourcing" :tab="`外协 (${relations.outsourcingOrders.length})`" />
          <a-tab-pane key="attachments" :tab="`附件 (${relations.attachments.length})`" />
        </a-tabs>

        <div class="tab-body">
          <template v-if="activeTab === 'overview'">
            <div class="section-card">
              <div class="section-title">基本信息</div>
              <a-descriptions :column="3" size="small" bordered>
                <a-descriptions-item label="销售单号">{{ order.orderNo }}</a-descriptions-item>
                <a-descriptions-item label="合同编号">{{
                  order.contractNo || '—'
                }}</a-descriptions-item>
                <a-descriptions-item label="客户名称">{{ order.customerName }}</a-descriptions-item>
                <a-descriptions-item label="订单来源">{{
                  order.orderSource || '—'
                }}</a-descriptions-item>
                <a-descriptions-item label="所属区域">{{
                  order.region || '—'
                }}</a-descriptions-item>
                <a-descriptions-item label="业务员">{{
                  order.salesperson || '—'
                }}</a-descriptions-item>
                <a-descriptions-item label="业务类型">{{
                  order.businessType || '—'
                }}</a-descriptions-item>
                <a-descriptions-item label="履约方式">{{
                  order.fulfillmentMethod || '—'
                }}</a-descriptions-item>
                <a-descriptions-item label="发货状态">{{
                  order.deliveryStatus || '—'
                }}</a-descriptions-item>
                <a-descriptions-item label="进度状态">{{
                  order.progressStatus
                }}</a-descriptions-item>
                <a-descriptions-item label="库存状态">{{
                  order.inventoryStatus || '—'
                }}</a-descriptions-item>
                <a-descriptions-item label="紧急度">{{ order.urgency || '—' }}</a-descriptions-item>
                <a-descriptions-item label="单据日期">{{
                  order.documentDate || '—'
                }}</a-descriptions-item>
                <a-descriptions-item label="提醒日期">{{
                  order.reminderDate || '—'
                }}</a-descriptions-item>
                <a-descriptions-item label="结算币种">{{
                  order.settlementCurrency || '—'
                }}</a-descriptions-item>
                <a-descriptions-item label="结算类型">{{
                  order.settlementType || '—'
                }}</a-descriptions-item>
                <a-descriptions-item label="付款比例">{{
                  order.paymentRatio || '—'
                }}</a-descriptions-item>
                <a-descriptions-item label="销售渠道">{{
                  order.salesChannel || '—'
                }}</a-descriptions-item>
                <a-descriptions-item label="交货方式">{{
                  order.deliveryMethod || '—'
                }}</a-descriptions-item>
                <a-descriptions-item label="联系人">{{
                  order.contactPerson || '—'
                }}</a-descriptions-item>
                <a-descriptions-item label="联系电话">{{
                  order.contactPhone || '—'
                }}</a-descriptions-item>
                <a-descriptions-item label="采购申请单号">
                  <a
                    v-if="order.purchaseRequisitionId"
                    @click="goPurchaseReq(order.purchaseRequisitionId)"
                  >
                    {{ order.purchaseRequisitionNo }}
                  </a>
                  <span v-else>{{ order.purchaseRequisitionNo || '—' }}</span>
                </a-descriptions-item>
                <a-descriptions-item label="销售数量合计">{{
                  order.totalQty ?? '—'
                }}</a-descriptions-item>
                <a-descriptions-item label="含税金额"
                  >￥{{ formatMoney(order.amountInTax) }}</a-descriptions-item
                >
                <a-descriptions-item label="不含税金额"
                  >￥{{ formatMoney(order.amountExTax) }}</a-descriptions-item
                >
                <a-descriptions-item label="已发数量">{{
                  order.totalIssuedQty ?? 0
                }}</a-descriptions-item>
                <a-descriptions-item label="备注" :span="3">{{
                  order.remark || '—'
                }}</a-descriptions-item>
              </a-descriptions>
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
          </template>

          <template v-else-if="activeTab === 'lines'">
            <div class="section-card">
              <div class="section-title">订单明细</div>
              <a-table
                :columns="lineColumns"
                :data-source="order.lineItems || []"
                row-key="id"
                size="small"
                bordered
                :pagination="false"
                :scroll="{ x: 2000 }"
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
                  <template v-else-if="column.key === 'amount'">
                    ￥{{ formatMoney(line.totalPriceInTax) }}
                  </template>
                  <template v-else>
                    {{ displayCell(line, column) }}
                  </template>
                </template>
              </a-table>
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
                :locale="{ emptyText: '暂无发货申请' }"
              >
                <template #bodyCell="{ column, record: row }">
                  <template v-if="column.key === 'deliveryCode'">
                    <a v-if="row.deliveryOrderId" class="link-code" @click="goDeliveryDetail(row)">
                      {{ row.deliveryCode }}
                    </a>
                    <span v-else>{{ row.deliveryCode || '—' }}</span>
                  </template>
                  <template v-else-if="column.key === 'wholeSummary'">
                    {{ (row.lineItems || []).length }} 行 / {{ sumWholeShipQty(row) }} 件
                  </template>
                  <template v-else-if="column.key === 'scatterSummary'">
                    {{ (row.scatterShipments || []).length }} 行
                  </template>
                  <template v-else-if="column.key === 'status'">
                    <a-tag color="blue">{{ row.status || '已提交' }}</a-tag>
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
              <div class="section-title">关联出库单</div>
              <a-table
                :columns="outboundColumns"
                :data-source="relations.outboundOrders"
                row-key="id"
                size="small"
                bordered
                :pagination="false"
                :locale="{ emptyText: '暂无关联出库单' }"
              >
                <template #bodyCell="{ column, record: row }">
                  <template v-if="column.key === 'status'">
                    <a-tag>{{ row.status }}</a-tag>
                  </template>
                  <template v-else-if="column.key === 'action'">
                    <a-button type="link" size="small" @click="goOutbound">查看出库管理</a-button>
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
                class="sub-table"
                :locale="{ emptyText: '暂无采购申请' }"
              >
                <template #bodyCell="{ column, record: row }">
                  <template v-if="column.key === 'action'">
                    <a-button type="link" size="small" @click="goPurchaseReq(row.id)"
                      >详情</a-button
                    >
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
                :locale="{ emptyText: '暂无采购订单' }"
              >
                <template #bodyCell="{ column, record: row }">
                  <template v-if="column.key === 'amount'">
                    ￥{{ formatMoney(row.totalAmountInTax ?? row.totalAmount) }}
                  </template>
                  <template v-else-if="column.key === 'action'">
                    <a-button type="link" size="small" @click="goPurchaseOrders"
                      >查看采购订单</a-button
                    >
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
                class="sub-table"
                :locale="{ emptyText: '暂无生产计划（自产订单审核后生成）' }"
              >
                <template #bodyCell="{ column, record: row }">
                  <template v-if="column.key === 'action'">
                    <a-button type="link" size="small" @click="goProductionPlan"
                      >查看生产计划</a-button
                    >
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
                :columns="workOrderColumns"
                :data-source="relations.workOrders"
                row-key="id"
                size="small"
                bordered
                :pagination="false"
                class="sub-table"
                :locale="{ emptyText: '暂无生产工单' }"
              >
                <template #bodyCell="{ column, record: row }">
                  <template v-if="column.key === 'action'">
                    <a-button type="link" size="small" @click="goWorkOrders">查看工单</a-button>
                  </template>
                  <template v-else>
                    {{ row[column.dataIndex] ?? '—' }}
                  </template>
                </template>
              </a-table>
            </div>
            <div class="section-card">
              <div class="section-title">总装工单</div>
              <a-table
                :columns="assemblyColumns"
                :data-source="relations.assemblyWorkOrders"
                row-key="id"
                size="small"
                bordered
                :pagination="false"
                :locale="{ emptyText: '暂无总装工单' }"
              >
                <template #bodyCell="{ column, record: row }">
                  <template v-if="column.key === 'action'">
                    <a-button type="link" size="small" @click="goAssemblyWorkOrders"
                      >查看总装工单</a-button
                    >
                  </template>
                  <template v-else>
                    {{ row[column.dataIndex] ?? '—' }}
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
                :locale="{ emptyText: '暂无外协订单' }"
              >
                <template #bodyCell="{ column, record: row }">
                  <template v-if="column.key === 'status'">
                    <a-tag>{{ row.status }}</a-tag>
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
import { computed, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { message } from 'ant-design-vue'
import { tabStore, useTabs } from '@/composables/useTabs'
import { getSalesOrderById, resolveSalesOrderRelations } from '@/utils/salesOrderDetail'
import { resolveLineBusinessType } from '@/utils/salesOrderBusiness'
const route = useRoute()
const router = useRouter()
const { openTab } = useTabs()

const loading = ref(false)
const order = ref(null)
const activeTab = ref('overview')

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

const lineColumns = [
  { title: '#', key: 'index', width: 48, align: 'center', fixed: 'left' },
  { title: '产品名称', dataIndex: 'productName', width: 160, ellipsis: true },
  { title: '产品编码', dataIndex: 'productCode', width: 120 },
  { title: '业务类型', key: 'businessType', width: 96 },
  { title: '交付方式', key: 'deliveryMode', width: 88, align: 'center' },
  { title: '规格型号', dataIndex: 'specModel', width: 100 },
  { title: '销售数量', dataIndex: 'salesQty', width: 80, align: 'right' },
  { title: '已发数量', dataIndex: 'shippedQty', width: 80, align: 'right' },
  { title: '单位', dataIndex: 'unit', width: 56 },
  { title: '交货日期', dataIndex: 'deliveryDate', width: 110 },
  { title: 'BOM', dataIndex: 'bomName', width: 140, ellipsis: true },
  { title: 'BOM版本', dataIndex: 'bomVersion', width: 90 },
  { title: '含税单价', dataIndex: 'unitPriceInTax', width: 90, align: 'right' },
  { title: '含税总额', key: 'amount', width: 100, align: 'right' },
  { title: '行备注', dataIndex: 'lineRemark', width: 120, ellipsis: true },
]

const deliveryColumns = [
  { title: '发货单号', key: 'deliveryCode', width: 130 },
  { title: '申请时间', dataIndex: 'createdAt', width: 150 },
  { title: '发货日期', dataIndex: 'deliveryDate', width: 110 },
  { title: '发货方式', dataIndex: 'shipmentMethod', width: 90 },
  { title: '出库仓库', dataIndex: 'outboundWarehouse', width: 100 },
  { title: '整机发运', key: 'wholeSummary', width: 120 },
  { title: '散件发运', key: 'scatterSummary', width: 100 },
  { title: '状态', key: 'status', width: 88 },
  { title: '备注', dataIndex: 'remark', ellipsis: true },
]

const outboundColumns = [
  { title: '出库单号', dataIndex: 'docNo', width: 140 },
  { title: '出库类型', dataIndex: 'outboundType', width: 100 },
  { title: '仓库', dataIndex: 'warehouse', width: 100 },
  { title: '状态', key: 'status', width: 90 },
  { title: '创建日期', dataIndex: 'createdAt', width: 110 },
  { title: '操作', key: 'action', width: 120 },
]

const purchaseReqColumns = [
  { title: '申请单号', dataIndex: 'reqNo', width: 140 },
  { title: '状态', dataIndex: 'status', width: 90 },
  { title: '来源', dataIndex: 'source', width: 100 },
  { title: '期望到货', dataIndex: 'estimatedArrivalDate', width: 110 },
  { title: '操作', key: 'action', width: 80 },
]

const purchaseOrderColumns = [
  { title: '采购单号', dataIndex: 'orderNo', width: 130 },
  { title: '供应商', dataIndex: 'supplierName', width: 140, ellipsis: true },
  { title: '状态', dataIndex: 'status', width: 90 },
  { title: '含税总额', key: 'amount', width: 110, align: 'right' },
  { title: '操作', key: 'action', width: 120 },
]

const planColumns = [
  { title: '计划单号', dataIndex: 'orderNo', width: 140 },
  { title: '状态', dataIndex: 'orderStatus', width: 90 },
  { title: '产品数量', dataIndex: 'productQty', width: 90, align: 'right' },
  { title: '交货日期', dataIndex: 'deliveryDate', width: 110 },
  { title: '操作', key: 'action', width: 120 },
]

const workOrderColumns = [
  { title: '工单号', dataIndex: 'code', width: 160 },
  { title: '工单名称', dataIndex: 'name', width: 180, ellipsis: true },
  { title: '状态', dataIndex: 'status', width: 90 },
  { title: '计划数量', dataIndex: 'planQty', width: 90, align: 'right' },
  { title: '操作', key: 'action', width: 100 },
]

const assemblyColumns = [
  { title: '工单号', dataIndex: 'code', width: 160 },
  { title: '产品', dataIndex: 'productName', width: 140 },
  { title: '状态', dataIndex: 'status', width: 90 },
  { title: '操作', key: 'action', width: 120 },
]

const outsourcingColumns = [
  { title: '外协单号', dataIndex: 'orderNo', width: 130 },
  { title: '供应商', dataIndex: 'supplierName', width: 140, ellipsis: true },
  { title: '物料', dataIndex: 'itemName', width: 140, ellipsis: true },
  { title: '编码', dataIndex: 'itemCode', width: 110 },
  { title: '数量', dataIndex: 'qty', width: 72, align: 'right' },
  { title: '单位', dataIndex: 'unit', width: 56 },
  { title: '状态', key: 'status', width: 90 },
  { title: '计划完成', dataIndex: 'planCompleteDate', width: 110 },
]

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

function sumWholeShipQty(row) {
  return (row.lineItems || []).reduce((s, l) => s + (Number(l.shipQty) || 0), 0)
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

function goOutbound() {
  openTab('/inventory/outbound', '出库管理')
  router.push('/inventory/outbound')
}

function goPurchaseOrders() {
  openTab('/procurement/purchase-orders', '采购订单')
  router.push('/procurement/purchase-orders')
}

function goProductionPlan() {
  openTab('/planning/production-plan', '生产计划')
  router.push('/planning/production-plan')
}

function goWorkOrders() {
  openTab('/production/work-orders', '生产工单')
  router.push('/production/work-orders')
}

function goAssemblyWorkOrders() {
  openTab('/production/assembly-work-orders', '总装工单')
  router.push('/production/assembly-work-orders')
}

function goDeliveryDetail(row) {
  if (!row.deliveryOrderId) return
  const path = `/sales/delivery/${row.deliveryOrderId}`
  openTab(path, `发货单 ${row.deliveryCode}`)
  router.push({ name: 'sales-delivery-detail', params: { id: row.deliveryOrderId } })
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

.sub-table {
  margin-bottom: 12px;
}
</style>
