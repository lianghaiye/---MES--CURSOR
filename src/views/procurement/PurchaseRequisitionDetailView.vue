<template>
  <div class="purchase-req-detail-page">
    <a-spin :spinning="loading">
      <template v-if="record">
        <div class="page-header">
          <div class="header-left">
            <span class="order-no">{{ record.reqNo }}</span>
            <a-tag :color="docStatusColor(record.docStatus)">{{ record.docStatus }}</a-tag>
            <a-tag v-if="activeDraft" color="purple"> 关联草稿 {{ activeDraft.orderNo }} </a-tag>
            <a-tag :color="urgencyColor(record.urgency)">{{ record.urgency }}</a-tag>
            <a-tag v-if="record.overdueStatus" :color="overdueStatusColor(record.overdueStatus)">
              {{ record.overdueStatus }}
            </a-tag>
          </div>
          <a-space>
            <template v-if="isDraftLocked">
              <a-button type="primary" @click="continuePoDraft">继续生成草稿</a-button>
              <a-button danger @click="handleDeleteDraft">删除草稿</a-button>
            </template>
            <template v-else>
              <a-button v-if="canEdit" type="default" @click="openEdit"> 编辑 </a-button>
              <a-button v-if="showActions" class="btn-void" @click="handleInvalidate">
                <InfoCircleOutlined />
                作废
              </a-button>
              <a-button v-if="showActions" type="primary" @click="openGenerateModal">
                <CheckCircleOutlined />
                生成采购单
              </a-button>
            </template>
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
            <a-tab-pane key="purchase" :tab="`采购信息 (${relatedPurchaseOrders.length})`" />
          </a-tabs>
        </div>

        <div class="tab-body">
          <template v-if="activeTab === 'basic'">
            <div class="section-card">
              <div class="section-title">基本信息</div>
              <PurchaseRequisitionBasicInfoSection
                :record="record"
                :active-draft="activeDraft"
                :draft-source-req-nos="draftSourceReqNos"
                :default-warehouse="defaultWarehouse"
              />
            </div>

            <div class="section-card">
              <div class="section-title">采购清单</div>
              <a-table
                :columns="lineColumns"
                :data-source="record.lineItems"
                row-key="id"
                size="small"
                bordered
                :pagination="false"
                :scroll="{ x: lineTableScrollX }"
                :locale="{ emptyText: '暂无数据' }"
              >
                <template #bodyCell="{ column, record: line, index }">
                  <template v-if="column.key === 'index'">{{ index + 1 }}</template>
                  <template v-else-if="column.key === 'productName'">
                    {{ lineProductName(line) }}
                  </template>
                  <template v-else-if="column.key === 'productCode'">
                    {{ lineProductCode(line) }}
                  </template>
                  <template v-else-if="column.key === 'demandQty'">
                    {{ formatQty(line.demandQty)
                    }}{{ line.inventoryUnit ? ` ${line.inventoryUnit}` : '' }}
                  </template>
                  <template v-else-if="column.key === 'convertHint'">
                    {{ line.convertHint || '—' }}
                  </template>
                  <template v-else-if="column.key === 'stockQty'">
                    {{ formatQty(line.stockQty) }}
                  </template>
                  <template v-else-if="column.key === 'planPurchaseQty'">
                    {{ formatQty(line.planPurchaseQty) }}{{ line.unit ? ` ${line.unit}` : '' }}
                  </template>
                  <template v-else-if="column.key === 'settleQty'">
                    {{
                      line.settleUnit
                        ? line.settleQty != null && line.settleQty !== ''
                          ? `${formatQty(line.settleQty)} ${line.settleUnit}`
                          : '—'
                        : '—'
                    }}
                  </template>
                  <template v-else-if="column.key === 'poGenStatus'">
                    <a-tag :color="line.poGenStatus === '已生成采购' ? 'success' : 'default'">
                      {{ line.poGenStatus || '未生成采购' }}
                    </a-tag>
                  </template>
                  <template v-else-if="column.key === 'orderSizeText'">
                    {{ line.orderSizeText || line.blankSizeText || '—' }}
                  </template>
                  <template v-else-if="column.key === 'supplierName'">
                    {{ line.supplierName || '—' }}
                  </template>
                  <template v-else-if="column.key === 'receivingWarehouse'">
                    {{ lineReceivingWarehouse(line) }}
                  </template>
                  <template v-else-if="column.key === 'salesOrderNo'">
                    {{ line.salesOrderNo || '—' }}
                  </template>
                  <template v-else-if="column.key === 'remark'">
                    {{ line.remark || '—' }}
                  </template>
                  <template v-else>
                    {{ line[column.dataIndex] ?? '—' }}
                  </template>
                </template>
              </a-table>

              <div class="summary-row">
                <span class="summary-label">合计</span>
                <span class="summary-item">项数 {{ summary.lineCount }}</span>
                <span class="summary-item">数量 {{ formatQty(summary.totalQty) }}</span>
              </div>
            </div>
          </template>

          <template v-else-if="activeTab === 'purchase'">
            <div class="section-card">
              <div class="section-title">采购信息</div>
              <a-table
                :columns="purchaseOrderColumns"
                :data-source="relatedPurchaseOrders"
                row-key="id"
                size="small"
                bordered
                :pagination="false"
                :scroll="{ x: purchaseOrderTableScrollX }"
                :locale="{ emptyText: '暂无采购订单' }"
              >
                <template #bodyCell="{ column, record: row }">
                  <template v-if="column.key === 'status'">
                    <a-tag :color="purchaseOrderStatusColor(row.status)">
                      {{ row.status || '—' }}
                    </a-tag>
                  </template>
                  <template v-else-if="column.key === 'inboundStatus'">
                    <a-tag :color="purchaseInboundStatusColor(row.inboundStatus)">
                      {{ row.inboundStatus || '—' }}
                    </a-tag>
                  </template>
                  <template v-else-if="column.key === 'orderNo'">
                    <a class="link-code" @click.prevent="goPurchaseOrder(row)">
                      {{ row.orderNo || '—' }}
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

      <a-empty v-else-if="!loading" description="未找到该采购申请单" />
    </a-spin>

    <PurchaseRequisitionPrintModal v-model:open="printModalOpen" :requisition="record" />
  </div>
</template>

<script>
import { formatQty } from '@/utils/numberFormat'
export default { name: 'PurchaseRequisitionDetailView' }
</script>

<script setup>
import { computed, ref, watch, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { Modal, message } from 'ant-design-vue'
import { CheckCircleOutlined, InfoCircleOutlined } from '@ant-design/icons-vue'
import { calcRequisitionDetailSummary } from '@/mock/purchaseRequisitionDetail'
import {
  getPurchaseRequisitionById,
  invalidatePurchaseRequisition,
  canGeneratePO,
  isPurchaseRequisitionDraftLocked,
} from '@/store/purchaseRequisitionStore'
import {
  getPurchaseOrdersByRequisition,
  getActiveDraftForRequisition,
  discardGeneratePurchaseOrderDraft,
  reconcilePurchaseRequisitionDraftStatuses,
} from '@/store/purchaseOrderStore'
import { purchaseRequisitionDetailLineColumns } from '@/utils/purchaseRequisitionLineColumns'
import { tabStore, useTabs } from '@/composables/useTabs'
import { openCreateTab } from '@/utils/openCreateTab'
import PurchaseRequisitionBasicInfoSection from './components/PurchaseRequisitionBasicInfoSection.vue'
import PurchaseRequisitionPrintModal from './components/PurchaseRequisitionPrintModal.vue'

const route = useRoute()
const router = useRouter()
const { openTab } = useTabs()

const loading = ref(false)
const record = ref(null)
const activeTab = ref('basic')
const printModalOpen = ref(false)

const lineColumns = purchaseRequisitionDetailLineColumns

const lineTableScrollX = computed(() =>
  lineColumns.reduce((sum, col) => sum + (col.width || 100), 0),
)

const purchaseOrderColumns = [
  { title: '采购单状态', key: 'status', width: 100, fixed: 'left' },
  { title: '入库状态', key: 'inboundStatus', width: 96, fixed: 'left' },
  { title: '采购单号', key: 'orderNo', width: 140 },
  { title: '供应商', dataIndex: 'supplier', width: 140, ellipsis: true },
  { title: '交货日期', dataIndex: 'deliveryDate', width: 110 },
  { title: '采购员', dataIndex: 'purchaser', width: 88 },
  { title: '创建人', dataIndex: 'creator', width: 88 },
  { title: '创建日期', dataIndex: 'documentDate', width: 110 },
]

const purchaseOrderTableScrollX = computed(() =>
  purchaseOrderColumns.reduce((sum, col) => sum + (col.width || 100), 0),
)

function loadRecord() {
  const id = route.params.id
  loading.value = true
  record.value = getPurchaseRequisitionById(id)
  loading.value = false

  if (record.value) {
    const tab = tabStore.tabs.find((t) => t.path === route.path)
    if (tab) tab.title = `采购申请 ${record.value.reqNo}`
  }
}

watch(() => route.params.id, loadRecord, { immediate: true })

const summary = computed(() => {
  const base = calcRequisitionDetailSummary(record.value)
  return {
    ...base,
    lineCount: record.value?.lineItems?.length || 0,
  }
})

const relatedPurchaseOrders = computed(() => getPurchaseOrdersByRequisition(record.value))

const activeDraft = computed(() => getActiveDraftForRequisition(record.value))
const draftSourceReqNos = computed(() => {
  if (!activeDraft.value) return ''
  return String(activeDraft.value.reqNo || '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean)
    .join('、')
})
const isDraftLocked = computed(
  () => isPurchaseRequisitionDraftLocked(record.value) || Boolean(activeDraft.value),
)

onMounted(() => {
  reconcilePurchaseRequisitionDraftStatuses()
  if (record.value) loadRecord()
})

const defaultWarehouse = computed(() => {
  const line = record.value?.lineItems?.[0]
  return line?.receivingWarehouse || record.value?.receivingWarehouse || '—'
})

function lineReceivingWarehouse(line) {
  return line?.receivingWarehouse || record.value?.receivingWarehouse || '—'
}

const showActions = computed(
  () => record.value && canGeneratePO(record.value) && !isDraftLocked.value,
)
const canEdit = computed(() => record.value?.docStatus === '待处理' && !isDraftLocked.value)

function openEdit() {
  if (!record.value || !canEdit.value) return
  openCreateTab(router, openTab, {
    path: `/procurement/purchase-req/${record.value.id}/edit`,
    title: `编辑采购申请 ${record.value.reqNo || ''}`.trim(),
  })
}

function continuePoDraft() {
  if (!activeDraft.value) {
    message.warning('未找到关联草稿')
    return
  }
  const path = `/procurement/purchase-req/generate-po?draftId=${activeDraft.value.id}`
  openTab(path, '生成采购订单')
  router.push(path)
}

function handleDeleteDraft() {
  if (!record.value || !activeDraft.value) {
    message.warning('未找到关联草稿')
    return
  }
  Modal.confirm({
    title: '删除草稿',
    content: `确定删除申请单「${record.value.reqNo}」的生成草稿吗？删除后可重新编辑、生成采购单、作废或完成。`,
    okText: '删除',
    okType: 'danger',
    onOk: () => {
      discardGeneratePurchaseOrderDraft(activeDraft.value.id)
      loadRecord()
      message.success('草稿已删除')
    },
  })
}

function lineProductName(line) {
  return line.productName || line.inventoryName || '—'
}

function lineProductCode(line) {
  return line.productCode || line.inventoryCode || '—'
}

function docStatusColor(status) {
  const map = {
    草稿: 'purple',
    待处理: 'processing',
    处理中: 'warning',
    处理完成: 'success',
    已作废: 'default',
  }
  return map[status] || 'default'
}

function urgencyColor(urgency) {
  const map = {
    紧急: 'error',
    加急: 'warning',
    正常: 'default',
  }
  return map[urgency] || 'default'
}

function overdueStatusColor(status) {
  const map = {
    未逾期: 'default',
    已逾期: 'error',
  }
  return map[status] || 'default'
}

function purchaseOrderStatusColor(status) {
  const map = {
    待审核: 'default',
    进行中: 'processing',
    已拒绝: 'error',
    已完成: 'success',
    已作废: 'default',
  }
  return map[status] || 'default'
}

function purchaseInboundStatusColor(status) {
  const map = { 待入库: 'default', 部分入库: 'warning', 已入库: 'success' }
  return map[status] || 'default'
}

function openPrint() {
  if (!record.value) return
  if (record.value.isGeneratePoDraft) {
    message.warning('草稿行不可打印')
    return
  }
  printModalOpen.value = true
}

function handleBack() {
  router.push('/procurement/purchase-req')
}

function goPurchaseOrder(row) {
  if (!row?.id) return
  const path = `/procurement/purchase-orders/${row.id}`
  openTab(path, `采购订单 ${row.orderNo}`)
  router.push({ name: 'procurement-purchase-orders-detail', params: { id: row.id } })
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
  const path = `/procurement/purchase-req/generate-po?ids=${record.value.id}`
  openTab(path, '生成采购订单')
  router.push(path)
}
</script>

<style lang="less" scoped>
.purchase-req-detail-page {
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
  border-bottom: 1px solid #e8e8e8;
}

.tab-body {
  flex: 1;
  padding: 8px 12px 16px;
  overflow: auto;
  background: #f5f6f8;
}

.section-card {
  background: #fff;
  border-radius: 6px;
  padding: 12px;
  margin-bottom: 8px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
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

.btn-void {
  color: #1677ff;
  border-color: #1677ff;
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
