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

        <a-tabs v-model:active-key="activeTab" class="detail-tabs">
          <a-tab-pane key="basic" tab="基本信息" />
          <a-tab-pane key="inbound" :tab="`入库信息 (${relatedInboundOrders.length})`" />
        </a-tabs>

        <div class="tab-body">
          <template v-if="activeTab === 'basic'">
            <div class="section-card">
              <div class="section-title">基本信息</div>
              <a-descriptions :column="3" size="small" bordered>
                <a-descriptions-item label="采购单号">{{ record.orderNo }}</a-descriptions-item>
                <a-descriptions-item label="状态">{{ record.status || '—' }}</a-descriptions-item>
                <a-descriptions-item label="入库状态">{{
                  record.inboundStatus || '—'
                }}</a-descriptions-item>
                <a-descriptions-item label="供应商">{{
                  record.supplier || '—'
                }}</a-descriptions-item>
                <a-descriptions-item label="采购申请单号">
                  <DocNoLinks
                    :value="record.reqNo"
                    :links="purchaseReqLinks"
                    @open="openPurchaseRequisition"
                  />
                </a-descriptions-item>
                <a-descriptions-item label="销售单号">
                  <DocNoLinks
                    :value="record.salesOrderNo"
                    :links="salesOrderLinks"
                    @open="openSalesOrder"
                  />
                </a-descriptions-item>
                <a-descriptions-item label="生产工单号">
                  <DocNoLinks
                    :value="record.workOrderNo"
                    :links="workOrderLinks"
                    @open="openWorkOrder"
                  />
                </a-descriptions-item>
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
                <a-descriptions-item label="创建人">{{
                  record.creator || '—'
                }}</a-descriptions-item>
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
                <span class="summary-item"
                  >不含税：{{ formatMoney(summary.totalAmountExTax) }}</span
                >
                <span class="summary-item">含税：{{ formatMoney(summary.totalAmountInTax) }}</span>
              </div>
            </div>
          </template>

          <template v-else-if="activeTab === 'inbound'">
            <div class="section-card">
              <div class="section-title">入库信息</div>
              <a-table
                :columns="inboundColumns"
                :data-source="relatedInboundOrders"
                row-key="id"
                size="small"
                bordered
                :pagination="false"
                :scroll="{ x: inboundTableScrollX }"
                :locale="{ emptyText: '暂无入库单' }"
              >
                <template #bodyCell="{ column, record: row }">
                  <template v-if="column.key === 'status'">
                    <a-tag :color="inboundOrderStatusColor(row.status)">
                      {{ row.status || '—' }}
                    </a-tag>
                  </template>
                  <template v-else-if="column.key === 'docNo'">
                    <a class="link-code" @click.prevent="goInboundDetail(row)">
                      {{ row.docNo || '—' }}
                    </a>
                  </template>
                  <template v-else>
                    {{ row[column.dataIndex] ?? '—' }}
                  </template>
                </template>
              </a-table>
            </div>
          </template>
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
import { computed, defineComponent, h, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { Modal, message } from 'ant-design-vue'
import { CheckCircleOutlined } from '@ant-design/icons-vue'
import { calcPurchaseOrderDetailSummary } from '@/mock/purchaseOrderDetail'
import {
  getPurchaseOrderById,
  approvePurchaseOrder,
  canApprovePurchaseOrder,
} from '@/store/purchaseOrderStore'
import { findPurchaseRequisitionByReqNo } from '@/store/purchaseRequisitionStore'
import { findSalesOrderByOrderNo } from '@/store/salesOrderStore'
import { workOrderState } from '@/store/workOrderStore'
import { assemblyWorkOrderState } from '@/store/assemblyWorkOrderStore'
import { getInboundOrdersByPurchaseOrder } from '@/store/inboundOrderStore'
import { tabStore, useTabs } from '@/composables/useTabs'

const DocNoLinks = defineComponent({
  name: 'DocNoLinks',
  props: {
    value: { type: String, default: '' },
    links: { type: Object, default: () => ({}) },
  },
  emits: ['open'],
  setup(props, { emit }) {
    return () => {
      const items = splitDocNos(props.value)
      if (!items.length) return h('span', '—')
      return h(
        'span',
        items.map((no, index) => [
          index > 0 ? '，' : null,
          props.links[no]
            ? h(
                'a',
                {
                  class: 'link-code',
                  onClick: (e) => {
                    e.preventDefault()
                    emit('open', no)
                  },
                },
                no,
              )
            : h('span', no),
        ]),
      )
    }
  },
})

const route = useRoute()
const router = useRouter()
const { openTab } = useTabs()

const loading = ref(false)
const record = ref(null)
const activeTab = ref('basic')

const lineColumns = [
  { title: '#', key: 'index', width: 48, align: 'center' },
  { title: '产品名称', key: 'productName', width: 140, ellipsis: true },
  { title: '产品编号', key: 'productCode', width: 120, ellipsis: true },
  { title: '规格型号', dataIndex: 'specModel', width: 110, ellipsis: true },
  { title: '规格属性', dataIndex: 'specAttr', width: 90, ellipsis: true },
  { title: '材质', dataIndex: 'material', width: 80, ellipsis: true },
  {
    title: '变体属性',
    dataIndex: 'variantSummary',
    key: 'variantAttr',
    width: 140,
    ellipsis: true,
  },
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

const inboundColumns = [
  { title: '状态', key: 'status', width: 90, fixed: 'left' },
  { title: '入库单号', key: 'docNo', dataIndex: 'docNo', width: 150, fixed: 'left' },
  { title: '入库日期', dataIndex: 'inboundDate', width: 110 },
  { title: '仓库', dataIndex: 'warehouse', width: 100 },
  { title: '发票号码', dataIndex: 'invoiceNo', width: 120, ellipsis: true },
  { title: '创建人', dataIndex: 'creator', width: 88 },
  { title: '创建时间', dataIndex: 'createdAt', width: 160 },
  { title: '确认人', dataIndex: 'confirmer', width: 88 },
  { title: '确认时间', dataIndex: 'confirmedAt', width: 160 },
]

const lineTableScrollX = lineColumns.reduce((sum, col) => sum + (col.width || 100), 0)
const inboundTableScrollX = inboundColumns.reduce((sum, col) => sum + (col.width || 100), 0)

function splitDocNos(value) {
  if (!value) return []
  return String(value)
    .split(/[,，]/)
    .map((s) => s.trim())
    .filter(Boolean)
}

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
const relatedInboundOrders = computed(() => getInboundOrdersByPurchaseOrder(record.value))

const purchaseReqLinks = computed(() => {
  const map = {}
  splitDocNos(record.value?.reqNo).forEach((no) => {
    if (findPurchaseRequisitionByReqNo(no)) map[no] = true
  })
  return map
})

const salesOrderLinks = computed(() => {
  const map = {}
  splitDocNos(record.value?.salesOrderNo).forEach((no) => {
    if (findSalesOrderByOrderNo(no)) map[no] = true
  })
  return map
})

const workOrderLinks = computed(() => {
  const map = {}
  splitDocNos(record.value?.workOrderNo).forEach((no) => {
    if (findWorkOrderByCode(no)) map[no] = true
  })
  return map
})

function findWorkOrderByCode(code) {
  return (
    workOrderState.orders.find((o) => o.code === code) ||
    assemblyWorkOrderState.orders.find((o) => o.code === code) ||
    null
  )
}

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

function inboundOrderStatusColor(status) {
  const map = {
    待处理: 'default',
    待审批: 'processing',
    已完成: 'success',
  }
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

function openPurchaseRequisition(reqNo) {
  const req = findPurchaseRequisitionByReqNo(reqNo)
  if (!req) {
    message.info('未找到关联采购申请单')
    return
  }
  const path = `/procurement/purchase-req/${req.id}`
  openTab(path, `采购申请 ${reqNo}`)
  router.push({ name: 'procurement-purchase-req-detail', params: { id: req.id } })
}

function openSalesOrder(orderNo) {
  const order = findSalesOrderByOrderNo(orderNo)
  if (!order) {
    message.info('未找到关联销售订单')
    return
  }
  const path = `/sales/orders/${order.id}`
  openTab(path, `销售订单 ${orderNo}`)
  router.push({ name: 'sales-orders-detail', params: { id: order.id } })
}

function openWorkOrder(code) {
  const wo = findWorkOrderByCode(code)
  if (!wo) {
    message.info('未找到关联生产工单')
    return
  }
  const isAssembly = assemblyWorkOrderState.orders.some((o) => o.id === wo.id)
  const basePath = isAssembly ? '/production/assembly-work-orders' : '/production/work-orders'
  const path = `${basePath}?code=${encodeURIComponent(code)}`
  openTab(path, `生产工单 ${code}`)
  router.push({ path: basePath, query: { code } })
}

function goInboundDetail(row) {
  if (!row?.id) return
  const path = `/inventory/inbound/${row.id}`
  openTab(path, `入库单 ${row.docNo || ''}`)
  router.push({ name: 'inventory-inbound-detail', params: { id: row.id } })
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
  border-bottom: 1px solid #f0f0f0;
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
