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
          <a-space :size="8" wrap>
            <template v-if="record.status === '待提交'">
              <a-button type="primary" size="small" @click="handleEdit">编辑</a-button>
              <a-button size="small" @click="handleSubmit">提交审核</a-button>
              <a-button size="small" danger @click="handleVoid">作废</a-button>
            </template>
            <template v-else-if="record.status === '待审核'">
              <a-button type="primary" size="small" @click="openApprove">审核</a-button>
              <a-button size="small" @click="handleWithdraw">撤回</a-button>
            </template>
            <template v-else-if="record.status === '已拒绝'">
              <a-button type="primary" size="small" @click="handleEdit">编辑</a-button>
              <a-button size="small" @click="handleResubmit">重新提交</a-button>
            </template>
            <template v-else-if="record.status === '进行中'">
              <a-button
                v-if="canGenerateReceipt(record)"
                type="primary"
                size="small"
                @click="openReceiptModal"
              >
                生成收货
              </a-button>
              <a-button v-if="canGenerateInbound(record)" size="small" @click="openInboundModal">
                生成入库
              </a-button>
              <a-button size="small" @click="openPurchaseReturnCreate">采购退货</a-button>
              <a-button size="small" @click="handleComplete">完成</a-button>
            </template>
            <a-button size="small" @click="handleBack">返回列表</a-button>
          </a-space>
        </div>

        <div class="detail-tabs-wrap">
          <a-tabs
            v-model:active-key="activeTab"
            class="detail-tabs detail-tabs-pill detail-tabs-pill--nav-only"
          >
            <a-tab-pane key="basic" tab="基本信息" />
            <a-tab-pane key="inbound" :tab="`入库信息 (${relatedInboundLines.length})`" />
            <a-tab-pane key="qc" :tab="`质检信息 (${relatedQcRecords.length})`" />
            <a-tab-pane key="return" :tab="`退货信息 (${relatedReturnLines.length})`" />
            <a-tab-pane key="settle" :tab="`结算信息 (${relatedSettleLines.length})`" />
          </a-tabs>
        </div>

        <div class="tab-body">
          <template v-if="activeTab === 'basic'">
            <div class="section-card">
              <div class="section-title">基本信息</div>
              <PurchaseOrderBasicInfoSection :order="record">
                <template #reqNo>
                  <DocNoLinks
                    :value="record.reqNo"
                    :links="purchaseReqLinks"
                    @open="openPurchaseRequisition"
                  />
                </template>
                <template #salesOrderNo>
                  <DocNoLinks
                    :value="record.salesOrderNo"
                    :links="salesOrderLinks"
                    @open="openSalesOrder"
                  />
                </template>
                <template #workOrderNo>
                  <DocNoLinks
                    :value="record.workOrderNo"
                    :links="workOrderLinks"
                    @open="openWorkOrder"
                  />
                </template>
              </PurchaseOrderBasicInfoSection>
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
                <template #headerCell="{ column }">
                  <template v-if="column.key === 'inboundProgress'">
                    <span class="col-title-with-tip">
                      入库进度
                      <a-tooltip :title="INBOUND_PROGRESS_TOOLTIP">
                        <InfoCircleOutlined class="col-tip-icon" />
                      </a-tooltip>
                    </span>
                  </template>
                  <template v-else>{{ column.title }}</template>
                </template>
                <template #bodyCell="{ column, record: line, index }">
                  <template v-if="column.key === 'index'">{{ index + 1 }}</template>
                  <template v-else-if="column.key === 'inboundProgress'">
                    {{ lineInboundProgress(line) }}
                  </template>
                  <template v-else-if="column.key === 'lineInboundStatus'">
                    <a-tag
                      :color="
                        poLineInboundStatusColor(line.inboundStatus || lineInboundStatus(line))
                      "
                    >
                      {{ line.inboundStatus || lineInboundStatus(line) }}
                    </a-tag>
                  </template>
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
                  <template v-else-if="column.key === 'orderSizeText'">
                    {{ line.orderSizeText || line.blankSizeText || '—' }}
                  </template>
                  <template v-else-if="column.key === 'sourceReqNo'">
                    {{ line.sourceReqNo || (line.sourceReqNos || []).join(',') || '—' }}
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
                  <template v-else-if="column.key === 'inboundQcRequirement'">
                    {{ resolveLineInboundQcRequirement(line) }}
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

            <div class="section-card">
              <div class="section-title">审批记录</div>
              <a-divider style="margin: 12px 0" />
              <div v-if="approvalRecords.length" class="history-list">
                <div v-for="(item, idx) in approvalRecords" :key="idx" class="history-item">
                  <div class="history-head">
                    <span class="history-user">{{ item.name }}</span>
                    <span class="history-role">（{{ item.role }}）</span>
                    <a-tag :color="approvalResultColor(item.result)" size="small">
                      {{ item.result }}
                    </a-tag>
                    <span class="history-time">{{ item.time }}</span>
                  </div>
                  <div v-if="item.opinion" class="history-opinion">{{ item.opinion }}</div>
                </div>
              </div>
              <a-empty v-else description="暂无审批记录" />
            </div>
          </template>

          <template v-else-if="activeTab === 'qc'">
            <div class="section-card">
              <div class="section-title">质检信息</div>
              <a-table
                :columns="qcColumns"
                :data-source="relatedQcRecords"
                row-key="id"
                size="small"
                bordered
                :pagination="false"
                :locale="{ emptyText: '暂无质检单' }"
              >
                <template #bodyCell="{ column, record: row }">
                  <template v-if="column.key === 'qcNo'">
                    <a v-if="row.qcNo" class="link-code" @click.prevent="openQcDetail(row)">
                      {{ row.qcNo }}
                    </a>
                    <span v-else>—</span>
                  </template>
                  <template v-else-if="column.key === 'qcStatus'">
                    <a-tag :color="qcStatusColor(row.qcStatus)">{{ row.qcStatus || '—' }}</a-tag>
                  </template>
                  <template v-else-if="column.key === 'qcResult'">
                    {{ row.qcResult || '—' }}
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

          <template v-else-if="activeTab === 'return'">
            <div class="section-card">
              <div class="section-title">退货信息</div>
              <a-table
                :columns="returnColumns"
                :data-source="relatedReturnLines"
                row-key="id"
                size="small"
                bordered
                :pagination="false"
                :locale="{ emptyText: '暂无退货信息' }"
              >
                <template #bodyCell="{ column, record: row, index }">
                  <template v-if="column.key === 'index'">{{ index + 1 }}</template>
                  <template v-else-if="column.key === 'returnNo'">
                    <a v-if="row.returnId" class="link-code" @click.prevent="openReturnDetail(row)">
                      {{ row.returnNo || '—' }}
                    </a>
                    <span v-else>{{ row.returnNo || '—' }}</span>
                  </template>
                  <template v-else-if="column.key === 'purchaseQty'">
                    {{ formatQty(row.purchaseQty) }}
                  </template>
                  <template v-else-if="column.key === 'qty'">
                    {{ formatQty(row.qty) }}
                  </template>
                  <template v-else>
                    {{ row[column.dataIndex] || '—' }}
                  </template>
                </template>
              </a-table>
            </div>
          </template>

          <template v-else-if="activeTab === 'settle'">
            <div class="section-card">
              <div class="section-title">结算信息</div>
              <a-table
                :columns="settleColumns"
                :data-source="relatedSettleLines"
                row-key="id"
                size="small"
                bordered
                :pagination="false"
                :locale="{ emptyText: '暂无结算信息' }"
              />
            </div>
          </template>
        </div>
      </template>

      <a-empty v-else-if="!loading" description="未找到该采购订单" />
    </a-spin>

    <GenerateReceiptModal
      v-model:open="receiptModalOpen"
      :purchase-order="record"
      @confirmed="onReceiptConfirmed"
    />
    <GenerateInboundOrderModal
      v-model:open="inboundModalOpen"
      :purchase-order="record"
      @saved="onInboundSaved"
    />
  </div>
</template>

<script>
import { formatQty } from '@/utils/numberFormat'
export default { name: 'PurchaseOrderDetailView' }
</script>

<script setup>
import { computed, defineComponent, h, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { Modal, message } from 'ant-design-vue'
import { InfoCircleOutlined } from '@ant-design/icons-vue'
import { calcPurchaseOrderDetailSummary } from '@/mock/purchaseOrderDetail'
import {
  getPurchaseOrderById,
  canGenerateReceipt,
  canGenerateInbound,
  submitPurchaseOrderForApprove,
  withdrawPurchaseOrder,
  resubmitPurchaseOrder,
  voidPurchaseOrder,
  completePurchaseOrder,
} from '@/store/purchaseOrderStore'
import { findPurchaseRequisitionByReqNo } from '@/store/purchaseRequisitionStore'
import { findSalesOrderByOrderNo } from '@/store/salesOrderStore'
import { workOrderState } from '@/store/workOrderStore'
import { assemblyWorkOrderState } from '@/store/assemblyWorkOrderStore'
import { getInboundOrdersByPurchaseOrder } from '@/store/inboundOrderStore'
import {
  calcPoLineAppliedOccupyQty,
  calcPoLineInboundStatus,
  calcPoLineReceivedQty,
  formatInboundProgress,
  INBOUND_PROGRESS_TOOLTIP,
  poLineInboundStatusColor,
} from '@/utils/purchaseLineInbound'
import { flattenPurchaseOrderInboundLines } from '@/utils/purchaseOrderInboundLines'
import { resolveLineInboundQcRequirement } from '@/utils/inboundQcRequirement'
import { listInboundQcForPurchaseOrder } from '@/utils/purchaseOrderQc'
import { listReturnLinesForPurchaseOrder } from '@/utils/orderReturnLines'
import { purchaseReceiptState } from '@/store/purchaseReceiptStore'
import { purchaseReturnState } from '@/store/purchaseReturnStore'
import { tabStore, useTabs } from '@/composables/useTabs'
import { openCreateTab } from '@/utils/openCreateTab'
import PurchaseOrderBasicInfoSection from './components/PurchaseOrderBasicInfoSection.vue'
import GenerateReceiptModal from './components/GenerateReceiptModal.vue'
import GenerateInboundOrderModal from './components/GenerateInboundOrderModal.vue'

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
const receiptModalOpen = ref(false)
const inboundModalOpen = ref(false)

const lineColumns = [
  { title: '#', key: 'index', width: 48, align: 'center' },
  { title: '入库状态', key: 'lineInboundStatus', width: 90 },
  { title: '入库进度', key: 'inboundProgress', width: 180, ellipsis: true },
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
  { title: '采购单位', dataIndex: 'unit', width: 80 },
  {
    title: '订货尺寸',
    key: 'orderSizeText',
    dataIndex: 'orderSizeText',
    width: 160,
    ellipsis: true,
  },
  { title: '不含税单价', key: 'unitPriceExTax', width: 100, align: 'right' },
  { title: '税率(%)', dataIndex: 'taxRate', width: 80, align: 'right' },
  { title: '含税单价', key: 'unitPriceInTax', width: 100, align: 'right' },
  { title: '总价（不含税）', key: 'totalPriceExTax', width: 110, align: 'right' },
  { title: '总价（含税）', key: 'totalPriceInTax', width: 100, align: 'right' },
  { title: '交货日期', dataIndex: 'deliveryDate', width: 110 },
  { title: '收货仓库', dataIndex: 'receivingWarehouse', width: 110, ellipsis: true },
  { title: '入库质检要求', key: 'inboundQcRequirement', width: 110 },
  {
    title: '来源申请单号',
    key: 'sourceReqNo',
    dataIndex: 'sourceReqNo',
    width: 160,
    ellipsis: true,
  },
  { title: '备注', dataIndex: 'remark', width: 120, ellipsis: true },
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

const qcColumns = [
  { title: '质检单号', key: 'qcNo', width: 160 },
  { title: '质检状态', key: 'qcStatus', width: 110 },
  { title: '质检结果', key: 'qcResult', dataIndex: 'qcResult', width: 110 },
  { title: '质检人', dataIndex: 'inspector', width: 100 },
  { title: '质检时间', dataIndex: 'inspectedAt', width: 160 },
]

const returnColumns = [
  { title: '序号', key: 'index', width: 56, align: 'center' },
  { title: '退货单号', key: 'returnNo', dataIndex: 'returnNo', width: 150 },
  { title: '物料名称', dataIndex: 'itemName', width: 140 },
  { title: '采购数量', key: 'purchaseQty', dataIndex: 'purchaseQty', width: 100, align: 'right' },
  { title: '退货数量', key: 'qty', dataIndex: 'qty', width: 100, align: 'right' },
  { title: '退货类型', dataIndex: 'returnType', width: 100 },
  { title: '出库仓库', dataIndex: 'shipWarehouse', width: 110 },
  { title: '创建人', dataIndex: 'creator', width: 90 },
  { title: '创建时间', dataIndex: 'createdAt', width: 150 },
]

const settleColumns = [
  { title: '序号', key: 'index', width: 56, align: 'center' },
  { title: '结算单号', dataIndex: 'settleNo', width: 150 },
  { title: '结算金额', dataIndex: 'amount', width: 120, align: 'right' },
  { title: '结算时间', dataIndex: 'settledAt', width: 160 },
  { title: '状态', dataIndex: 'status', width: 100 },
]

const lineTableScrollX = lineColumns.reduce((sum, col) => sum + (col.width || 100), 0)
const inboundLineScrollX = inboundLineColumns.reduce((sum, col) => sum + (col.width || 100), 0)

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
const relatedInboundOrders = computed(() => getInboundOrdersByPurchaseOrder(record.value))
const relatedInboundLines = computed(() =>
  flattenPurchaseOrderInboundLines(relatedInboundOrders.value),
)
const relatedReturnLines = computed(() => {
  void purchaseReturnState.returns
  return listReturnLinesForPurchaseOrder(record.value)
})
const relatedSettleLines = computed(() => [])
const approvalRecords = computed(() => record.value?.approvalRecords || [])
const relatedQcRecords = computed(() => {
  void purchaseReceiptState.receipts
  return listInboundQcForPurchaseOrder(record.value)
})

function openReturnDetail(row) {
  if (!row?.returnId) return
  const path = `/procurement/purchase-returns/${row.returnId}`
  openTab(path, `采购退货 ${row.returnNo || ''}`.trim())
  router.push(path)
}

function approvalResultColor(result) {
  if (result === '已通过') return 'success'
  if (result === '已驳回' || result === '已拒绝') return 'error'
  return 'default'
}

function qcStatusColor(status) {
  const map = {
    未质检: 'default',
    质检中: 'processing',
    质检通过: 'success',
    质检不通过: 'error',
  }
  return map[status] || 'default'
}

function openQcDetail(row) {
  if (!row?.qcNo) {
    message.info('暂无质检单号')
    return
  }
  message.info(`入库质检详情「${row.qcNo}」开发中`)
}

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

function lineInboundStatus(line) {
  return calcPoLineInboundStatus(record.value, line)
}

function lineInboundProgress(line) {
  return formatInboundProgress(
    calcPoLineReceivedQty(record.value, line),
    calcPoLineAppliedOccupyQty(record.value, line),
    Number(line.purchaseQty) || 0,
  )
}

function statusColor(status) {
  const map = {
    待提交: 'default',
    待审核: 'default',
    进行中: 'processing',
    已拒绝: 'error',
    已完成: 'success',
    已作废: 'default',
  }
  return map[status] || 'default'
}

function inboundColor(status) {
  const map = { 待入库: 'default', 部分入库: 'warning', 已入库: 'success' }
  return map[status] || 'default'
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

function handleEdit() {
  if (!record.value) return
  openCreateTab(router, openTab, {
    path: `/procurement/purchase-orders/${record.value.id}/edit`,
    title: `编辑采购单 ${record.value.orderNo || ''}`.trim(),
  })
}

function handleSubmit() {
  if (!record.value) return
  Modal.confirm({
    title: '确认提交审核',
    content: `确定提交采购单「${record.value.orderNo}」审核吗？`,
    onOk: () => {
      const result = submitPurchaseOrderForApprove(record.value.id)
      if (result.ok) {
        message.success(result.message)
        loadRecord()
      } else {
        message.warning(result.message)
      }
    },
  })
}

function handleWithdraw() {
  if (!record.value) return
  Modal.confirm({
    title: '确认撤回',
    content: `确定撤回采购单「${record.value.orderNo}」吗？撤回后可继续编辑。`,
    onOk: () => {
      const result = withdrawPurchaseOrder(record.value.id)
      if (result.ok) {
        message.success(result.message)
        loadRecord()
      } else {
        message.warning(result.message)
      }
    },
  })
}

function handleResubmit() {
  if (!record.value) return
  Modal.confirm({
    title: '确认重新提交',
    content: `确定重新提交采购单「${record.value.orderNo}」审核吗？`,
    onOk: () => {
      const result = resubmitPurchaseOrder(record.value.id)
      if (result.ok) {
        message.success(result.message)
        loadRecord()
      } else {
        message.warning(result.message)
      }
    },
  })
}

function handleVoid() {
  if (!record.value) return
  Modal.confirm({
    title: '确认作废',
    content: `确定作废采购单「${record.value.orderNo}」吗？作废后不可再编辑。`,
    okType: 'danger',
    onOk: () => {
      const result = voidPurchaseOrder(record.value.id)
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
  const result = completePurchaseOrder(record.value.id)
  if (result.ok) {
    message.success(result.message)
    loadRecord()
  } else {
    message.warning(result.message)
  }
}

function openReceiptModal() {
  if (!record.value || !canGenerateReceipt(record.value)) {
    message.warning('当前采购单不可生成收货单')
    return
  }
  receiptModalOpen.value = true
}

function openInboundModal() {
  if (!record.value || !canGenerateInbound(record.value)) {
    message.warning('当前采购单不可生成入库单')
    return
  }
  inboundModalOpen.value = true
}

function openPurchaseReturnCreate() {
  if (!record.value?.orderNo) return
  openCreateTab(router, openTab, {
    path: '/procurement/purchase-returns/new',
    title: '新增采购退货单',
    query: { purchaseOrderNo: record.value.orderNo },
  })
}

function onReceiptConfirmed() {
  loadRecord()
}

function onInboundSaved() {
  loadRecord()
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

function goInboundDetailById(orderId) {
  if (!orderId) return
  const order = relatedInboundOrders.value.find((o) => o.id === orderId)
  const path = `/inventory/inbound/${orderId}`
  openTab(path, `入库单 ${order?.docNo || ''}`)
  router.push({ name: 'inventory-inbound-detail', params: { id: orderId } })
}

function openApprove() {
  if (!record.value) return
  const path = `/procurement/purchase-orders/${record.value.id}/approve`
  openTab(path, `审核采购单 ${record.value.orderNo || ''}`.trim())
  router.push({ name: 'procurement-purchase-orders-approve', params: { id: record.value.id } })
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
  /* 底部分隔线上方留白 6px */
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

.col-title-with-tip {
  display: inline-flex;
  align-items: center;
  gap: 4px;
}

.col-tip-icon {
  color: rgba(0, 0, 0, 0.45);
  font-size: 12px;
}

.history-item {
  padding: 8px 0;
  border-bottom: 1px solid #f0f0f0;

  &:last-child {
    border-bottom: none;
  }
}

.history-head {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}

.history-user {
  font-weight: 500;
}

.history-role {
  font-size: 12px;
  color: #8c8c8c;
}

.history-time {
  margin-left: auto;
  font-size: 12px;
  color: #8c8c8c;
}

.history-opinion {
  margin-top: 6px;
  color: rgba(0, 0, 0, 0.65);
  font-size: 13px;
}
</style>
