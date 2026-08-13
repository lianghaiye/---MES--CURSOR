<template>
  <div class="outsourcing-order-detail-page">
    <a-spin :spinning="loading">
      <template v-if="record">
        <div class="page-header">
          <div class="header-left">
            <span class="order-no">{{ record.orderNo }}</span>
            <a-tag :color="statusColor(record.status)">{{ record.status }}</a-tag>
            <a-tag :color="issueColor(record.issueStatus)">{{ record.issueStatus || '—' }}</a-tag>
            <a-tag :color="returnColor(record.returnStatus)">{{
              record.returnStatus || '—'
            }}</a-tag>
            <a-tag :color="record.overdueStatus === '已逾期' ? 'error' : 'default'">
              {{ record.overdueStatus || '未逾期' }}
            </a-tag>
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
              <a-button type="primary" size="small" @click="openIssueModal">
                生成发料出库
              </a-button>
              <a-button
                v-if="canGenerateOutsourcingReceipt(record)"
                size="small"
                @click="openReceiptModal"
              >
                生成收货
              </a-button>
              <a-button
                v-if="canGenerateOutsourcingInbound(record)"
                size="small"
                @click="openInboundModal"
              >
                生成入库
              </a-button>
              <a-button size="small" @click="openExceptionCreate">异常处理</a-button>
              <a-button size="small" @click="handleComplete">完成</a-button>
            </template>
            <a-dropdown>
              <a-button size="small">
                打印
                <DownOutlined />
              </a-button>
              <template #overlay>
                <a-menu @click="onPrintMenuClick">
                  <a-menu-item key="派单工">打印派单工</a-menu-item>
                  <a-menu-item key="发料出库单">打印发料出库单</a-menu-item>
                </a-menu>
              </template>
            </a-dropdown>
            <a-button size="small" @click="handleBack">返回列表</a-button>
          </a-space>
        </div>

        <div class="detail-tabs-wrap">
          <a-tabs
            v-model:active-key="activeTab"
            class="detail-tabs detail-tabs-pill detail-tabs-pill--nav-only"
          >
            <a-tab-pane key="basic" tab="基本信息" />
            <a-tab-pane key="issue" :tab="`发料信息 (${issueRows.length})`" />
            <a-tab-pane key="return" :tab="`回货信息 (${relatedInboundLines.length})`" />
            <a-tab-pane key="qc" :tab="`质检信息 (${relatedQcRecords.length})`" />
            <a-tab-pane key="goodsReturn" :tab="`外协异常处理 (${relatedReturnLines.length})`" />
            <a-tab-pane key="settle" :tab="`结算信息 (${relatedSettleLines.length})`" />
          </a-tabs>
        </div>

        <div class="tab-body">
          <template v-if="activeTab === 'basic'">
            <div class="section-card">
              <div class="section-title">基本信息</div>
              <OutsourcingOrderBasicInfoSection :order="record">
                <template #salesOrderNo>
                  <span>{{ record.salesOrderNo || '—' }}</span>
                </template>
              </OutsourcingOrderBasicInfoSection>
            </div>

            <div class="section-card">
              <div class="section-title">外协明细</div>
              <a-table
                :columns="lineColumns"
                :data-source="record.lineItems || []"
                row-key="id"
                size="small"
                bordered
                :pagination="false"
                :scroll="{ x: lineTableScrollX }"
                :locale="{ emptyText: '暂无外协明细' }"
              >
                <template #bodyCell="{ column, record: line, index }">
                  <template v-if="column.key === 'index'">{{ index + 1 }}</template>
                  <template v-else-if="column.key === 'stockQty'">
                    {{ formatQty(line.stockQty) }}
                  </template>
                  <template v-else-if="column.key === 'planQty'">
                    {{ formatQty(line.planQty) }}
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
                <span class="summary-item">不含税：{{ formatMoney(summary.amountExTax) }}</span>
                <span class="summary-item">含税：{{ formatMoney(summary.amountInTax) }}</span>
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

          <template v-else-if="activeTab === 'issue'">
            <div class="section-card">
              <div class="section-title">发料信息</div>
              <a-table
                :columns="issueColumns"
                :data-source="issueRows"
                row-key="id"
                size="small"
                bordered
                :pagination="false"
                :scroll="{ x: issueTableScrollX }"
                :locale="{ emptyText: '暂无发料信息' }"
              >
                <template #bodyCell="{ column, record: row, index }">
                  <template v-if="column.key === 'index'">{{ index + 1 }}</template>
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
              <div class="section-title">回货信息</div>
              <a-table
                :columns="returnColumns"
                :data-source="relatedInboundLines"
                row-key="id"
                size="small"
                bordered
                :pagination="false"
                :scroll="{ x: returnTableScrollX }"
                :locale="{ emptyText: '暂无回货信息' }"
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

          <template v-else-if="activeTab === 'goodsReturn'">
            <div class="section-card">
              <div class="section-title">外协异常处理</div>
              <a-table
                :columns="goodsReturnColumns"
                :data-source="relatedReturnLines"
                row-key="id"
                size="small"
                bordered
                :pagination="false"
                :locale="{ emptyText: '暂无异常处理信息' }"
              >
                <template #bodyCell="{ column, record: row, index }">
                  <template v-if="column.key === 'index'">{{ index + 1 }}</template>
                  <template v-else-if="column.key === 'returnNo'">
                    <a v-if="row.returnId" class="link-code" @click.prevent="openReturnDetail(row)">
                      {{ row.returnNo || '—' }}
                    </a>
                    <span v-else>{{ row.returnNo || '—' }}</span>
                  </template>
                  <template v-else-if="column.key === 'planQty'">
                    {{ formatQty(row.planQty) }}
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

        <OutsourcingGenerateIssueModal
          v-model:open="issueModalOpen"
          :outsourcing-order="record"
          @confirmed="loadRecord"
        />
        <OutsourcingGenerateReceiptModal
          v-model:open="receiptModalOpen"
          :outsourcing-order="record"
          @confirmed="loadRecord"
        />
        <OutsourcingGenerateInboundModal
          v-model:open="inboundModalOpen"
          :outsourcing-order="record"
          @saved="loadRecord"
        />
        <OutsourcingOrderPrintModal
          v-model:open="printModalOpen"
          :template-type="printTemplateType"
          :outsourcing-order="record"
        />
      </template>
      <a-empty v-else-if="!loading" description="未找到该外协订单" />
    </a-spin>
  </div>
</template>

<script>
export default { name: 'OutsourcingOrderDetailView' }
</script>

<script setup>
import { computed, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { Modal, message } from 'ant-design-vue'
import { DownOutlined } from '@ant-design/icons-vue'
import { formatQty } from '@/utils/numberFormat'
import { OUTSOURCING_PRINT_TEMPLATE } from '@/utils/outsourcingOrderPrintPreview'
import {
  getOutsourcingOrderById,
  canGenerateOutsourcingReceipt,
  canGenerateOutsourcingInbound,
  submitOutsourcingOrderForApprove,
  withdrawOutsourcingOrder,
  resubmitOutsourcingOrder,
  voidOutsourcingOrder,
  completeOutsourcingOrder,
} from '@/store/outsourcingOrderStore'
import { flattenOutsourcingIssueOutboundLines } from '@/mock/outsourcingOrders'
import { getInboundOrdersByOutsourcingOrder } from '@/store/inboundOrderStore'
import { flattenPurchaseOrderInboundLines } from '@/utils/purchaseOrderInboundLines'
import { listInboundQcForOutsourcingOrder } from '@/utils/purchaseOrderQc'
import { listReturnLinesForOutsourcingOrder } from '@/utils/orderReturnLines'
import { outsourcingReceiptState } from '@/store/outsourcingReceiptStore'
import { outsourcingReturnState } from '@/store/outsourcingReturnStore'
import { tabStore, useTabs } from '@/composables/useTabs'
import { openCreateTab } from '@/utils/openCreateTab'
import OutsourcingOrderBasicInfoSection from './components/OutsourcingOrderBasicInfoSection.vue'
import OutsourcingOrderPrintModal from './components/OutsourcingOrderPrintModal.vue'
import OutsourcingGenerateIssueModal from './components/OutsourcingGenerateIssueModal.vue'
import OutsourcingGenerateReceiptModal from './components/OutsourcingGenerateReceiptModal.vue'
import OutsourcingGenerateInboundModal from './components/OutsourcingGenerateInboundModal.vue'

const route = useRoute()
const router = useRouter()
const { openTab } = useTabs()

const loading = ref(false)
const record = ref(null)
const activeTab = ref('basic')
const issueModalOpen = ref(false)
const receiptModalOpen = ref(false)
const inboundModalOpen = ref(false)
const printModalOpen = ref(false)
const printTemplateType = ref(OUTSOURCING_PRINT_TEMPLATE.DISPATCH)
const listPath = '/procurement/outsourcing-orders'

const lineColumns = [
  { title: '序号', key: 'index', width: 56, align: 'center' },
  { title: '产品名称', dataIndex: 'productName', width: 140, ellipsis: true },
  { title: '编号', dataIndex: 'productCode', width: 120, ellipsis: true },
  { title: '规格型号', dataIndex: 'specModel', width: 110, ellipsis: true },
  { title: '变体属性', dataIndex: 'variantSummary', width: 120, ellipsis: true },
  { title: '材质', dataIndex: 'material', width: 90, ellipsis: true },
  { title: '图号', dataIndex: 'drawingNo', width: 100, ellipsis: true },
  { title: '库存数量', key: 'stockQty', width: 90, align: 'right' },
  { title: '计划数量', key: 'planQty', width: 100, align: 'right' },
  { title: '单位', dataIndex: 'unit', width: 80 },
  { title: '出货仓库', dataIndex: 'shipWarehouse', width: 110, ellipsis: true },
  { title: '计费方式', dataIndex: 'billingMethod', width: 90 },
  { title: '加工单价(不含税)', key: 'unitPriceExTax', width: 120, align: 'right' },
  { title: '加工单价(含税)', key: 'unitPriceInTax', width: 110, align: 'right' },
  { title: '加工总价(不含税)', key: 'totalPriceExTax', width: 120, align: 'right' },
  { title: '加工总价(含税)', key: 'totalPriceInTax', width: 110, align: 'right' },
  { title: '备注', dataIndex: 'remark', width: 120, ellipsis: true },
]

const issueColumns = [
  { title: '序号', key: 'index', width: 56, align: 'center' },
  { title: '出库状态', dataIndex: 'outboundStatus', width: 90 },
  { title: '出库单号', dataIndex: 'outboundOrderNo', width: 150 },
  { title: '物料名称', dataIndex: 'productName', width: 140, ellipsis: true },
  { title: '编号', dataIndex: 'productCode', width: 120, ellipsis: true },
  { title: '规格型号', dataIndex: 'specModel', width: 110, ellipsis: true },
  { title: '材质', dataIndex: 'material', width: 90, ellipsis: true },
  { title: '申请出库数量', key: 'applyQty', width: 110, align: 'right' },
  { title: '实际出库数量', key: 'actualQty', width: 110, align: 'right' },
  { title: '出库时间', dataIndex: 'confirmedAt', width: 160 },
  { title: '确认人', dataIndex: 'confirmer', width: 90 },
  { title: '创建时间', dataIndex: 'createdAt', width: 160 },
  { title: '创建人', dataIndex: 'creator', width: 90 },
]

const returnColumns = [
  { title: '序号', key: 'index', width: 56, align: 'center', fixed: 'left' },
  { title: '入库状态', dataIndex: 'inboundStatus', width: 90 },
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

const goodsReturnColumns = [
  { title: '序号', key: 'index', width: 56, align: 'center' },
  { title: '单据状态', dataIndex: 'status', width: 90 },
  { title: '异常处理单号', key: 'returnNo', dataIndex: 'returnNo', width: 150 },
  { title: '物料名称', dataIndex: 'itemName', width: 140 },
  { title: '外协数量', key: 'planQty', dataIndex: 'planQty', width: 100, align: 'right' },
  { title: '处理数量', key: 'qty', dataIndex: 'qty', width: 100, align: 'right' },
  { title: '出库仓库', dataIndex: 'shipWarehouse', width: 110 },
  { title: '异常类型', dataIndex: 'returnType', width: 100 },
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
const issueTableScrollX = issueColumns.reduce((sum, col) => sum + (col.width || 100), 0)
const returnTableScrollX = returnColumns.reduce((sum, col) => sum + (col.width || 100), 0)

const summary = computed(() => {
  const lines = record.value?.lineItems || []
  return {
    totalQty: lines.reduce((s, l) => s + (Number(l.planQty) || 0), 0),
    amountExTax:
      record.value?.amountExTax ?? lines.reduce((s, l) => s + (Number(l.totalPriceExTax) || 0), 0),
    amountInTax:
      record.value?.amountInTax ?? lines.reduce((s, l) => s + (Number(l.totalPriceInTax) || 0), 0),
  }
})

const approvalRecords = computed(() => record.value?.approvalRecords || [])

const issueRows = computed(() => flattenOutsourcingIssueOutboundLines(record.value))

const relatedInboundOrders = computed(() => getInboundOrdersByOutsourcingOrder(record.value))
const relatedInboundLines = computed(() =>
  flattenPurchaseOrderInboundLines(relatedInboundOrders.value),
)
const relatedQcRecords = computed(() => {
  void outsourcingReceiptState.receipts
  return listInboundQcForOutsourcingOrder(record.value)
})
const relatedReturnLines = computed(() => {
  void outsourcingReturnState.returns
  return listReturnLinesForOutsourcingOrder(record.value)
})
const relatedSettleLines = computed(() => [])

function loadRecord() {
  loading.value = true
  record.value = getOutsourcingOrderById(route.params.id)
  loading.value = false
  if (record.value) {
    const tab = tabStore.tabs.find((t) => t.path === route.path)
    if (tab) tab.title = `外协订单 ${record.value.orderNo}`
  }
}

watch(() => route.params.id, loadRecord, { immediate: true })

function formatMoney(val) {
  if (val == null || val === '') return '—'
  return Number(val).toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })
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

function issueColor(status) {
  const map = { 待出库: 'default', 部分出库: 'warning', 已出库: 'success' }
  return map[status] || 'default'
}

function returnColor(status) {
  const map = { 待入库: 'default', 部分入库: 'warning', 已入库: 'success' }
  return map[status] || 'default'
}

function approvalResultColor(result) {
  if (result === '已通过') return 'success'
  if (result === '已驳回') return 'error'
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

function goInboundDetailById(orderId) {
  if (!orderId) return
  const order = relatedInboundOrders.value.find((o) => o.id === orderId)
  const path = `/inventory/inbound/${orderId}`
  openTab(path, `入库单 ${order?.docNo || ''}`)
  router.push({ name: 'inventory-inbound-detail', params: { id: orderId } })
}

function openReturnDetail(row) {
  if (!row?.returnId) return
  const path = `/procurement/outsourcing-returns/${row.returnId}`
  openTab(path, `外协异常处理 ${row.returnNo || ''}`.trim())
  router.push(path)
}

function onPrintMenuClick({ key }) {
  printTemplateType.value =
    key === OUTSOURCING_PRINT_TEMPLATE.ISSUE
      ? OUTSOURCING_PRINT_TEMPLATE.ISSUE
      : OUTSOURCING_PRINT_TEMPLATE.DISPATCH
  printModalOpen.value = true
}

function handleBack() {
  router.push(listPath)
}

function handleEdit() {
  if (!record.value?.id) return
  openCreateTab(router, openTab, {
    path: `/procurement/outsourcing-orders/${record.value.id}/edit`,
    title: `编辑外协订单 ${record.value.orderNo || ''}`.trim(),
  })
}

function openApprove() {
  const path = `/procurement/outsourcing-orders/${record.value.id}/approve`
  openTab(path, `审核外协订单 ${record.value.orderNo || ''}`.trim())
  router.push({ name: 'procurement-outsourcing-orders-approve', params: { id: record.value.id } })
}

function handleSubmit() {
  Modal.confirm({
    title: '确认提交审核',
    content: `确定提交外协订单「${record.value.orderNo}」审核吗？`,
    onOk: () => {
      const result = submitOutsourcingOrderForApprove(record.value.id)
      result.ok ? message.success(result.message) : message.warning(result.message)
      loadRecord()
    },
  })
}

function handleWithdraw() {
  Modal.confirm({
    title: '确认撤回',
    content: `确定撤回外协订单「${record.value.orderNo}」吗？`,
    onOk: () => {
      const result = withdrawOutsourcingOrder(record.value.id)
      result.ok ? message.success(result.message) : message.warning(result.message)
      loadRecord()
    },
  })
}

function handleResubmit() {
  Modal.confirm({
    title: '确认重新提交',
    content: `确定重新提交外协订单「${record.value.orderNo}」审核吗？`,
    onOk: () => {
      const result = resubmitOutsourcingOrder(record.value.id)
      result.ok ? message.success(result.message) : message.warning(result.message)
      loadRecord()
    },
  })
}

function handleVoid() {
  Modal.confirm({
    title: '确认作废',
    content: `确定作废外协订单「${record.value.orderNo}」吗？`,
    okType: 'danger',
    onOk: () => {
      const result = voidOutsourcingOrder(record.value.id)
      result.ok ? message.success(result.message) : message.warning(result.message)
      loadRecord()
    },
  })
}

function handleComplete() {
  const result = completeOutsourcingOrder(record.value.id)
  result.ok ? message.success(result.message) : message.warning(result.message)
  loadRecord()
}

function openIssueModal() {
  issueModalOpen.value = true
}

function openReceiptModal() {
  receiptModalOpen.value = true
}

function openInboundModal() {
  inboundModalOpen.value = true
}

function openExceptionCreate() {
  if (!record.value?.orderNo) return
  openCreateTab(router, openTab, {
    path: '/procurement/outsourcing-returns/new',
    title: '新增外协异常处理单',
    query: { outsourcingOrderNo: record.value.orderNo },
  })
}
</script>

<style lang="less" scoped>
.outsourcing-order-detail-page {
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
  flex-wrap: wrap;
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

.link-code {
  color: #1677ff;
  cursor: pointer;
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
  }

  .summary-item {
    color: rgba(0, 0, 0, 0.65);
  }
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
  font-size: 13px;
  color: #595959;
}
</style>
