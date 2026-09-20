<template>
  <div class="outbound-detail-page">
    <a-spin :spinning="loading">
      <template v-if="record">
        <div class="page-header">
          <div class="header-left">
            <span class="page-title">{{ record.docNo }}</span>
            <a-tag :color="outboundStatusColor(record.status)">{{ record.status }}</a-tag>
            <span class="sub-type">{{ record.outboundType }}</span>
          </div>
          <a-space>
            <a-button type="link" size="small" @click="openPrint">
              <PrinterOutlined />
              打印
            </a-button>
            <a-button
              v-if="canApproveOutbound(record)"
              type="primary"
              size="small"
              @click="handleApprove"
            >
              审批
            </a-button>
            <a-button
              v-if="canConfirm(record)"
              type="primary"
              size="small"
              @click="handleConfirmOutbound"
            >
              确认出库
            </a-button>
            <a-button
              v-if="canRefuseOutbound(record)"
              size="small"
              danger
              @click="handleRefuseOutbound"
            >
              拒绝出库
            </a-button>
            <a-button v-if="canEditOutbound(record)" size="small" @click="openEdit">
              编辑
            </a-button>
            <a-button v-if="canDeleteOutbound(record)" size="small" danger @click="handleDelete">
              删除
            </a-button>
            <a-button v-if="canInitiateFactoryQc(record)" size="small" @click="handleInitiateQc">
              {{ initiateQcActionLabel(record) }}
            </a-button>
            <a-button size="small" @click="goBack">返回列表</a-button>
          </a-space>
        </div>

        <div class="detail-tabs-wrap">
          <a-tabs
            v-model:active-key="infoTab"
            class="detail-tabs detail-tabs-pill detail-tabs-pill--nav-only"
          >
            <a-tab-pane key="basic" tab="基本信息" />
            <a-tab-pane
              v-if="isMaterialReqOutbound"
              key="related"
              :tab="`关联单据 (${relatedInbounds.length})`"
            />
            <a-tab-pane
              v-if="isPurchaseReturnOutbound"
              key="related"
              :tab="`关联单据 (${relatedPurchaseReturns.length})`"
            />
            <a-tab-pane
              v-if="isMaterialReqOutbound"
              key="cutSettle"
              :tab="`下料结算 (${relatedCutSettleLines.length})`"
            />
            <a-tab-pane key="logs" tab="操作日志" />
          </a-tabs>
        </div>

        <div class="tab-body">
          <template v-if="infoTab === 'basic'">
            <DetailSectionCard title="基本信息">
              <OutboundOrderBasicInfoSection
                :record="record"
                :is-material-req-outbound="isMaterialReqOutbound"
              >
                <template #sourceOrderNo>
                  <a v-if="record.sourceOrderNo" class="link-code" @click="goSource">{{
                    record.sourceOrderNo
                  }}</a>
                  <span v-else>—</span>
                </template>
                <template #salesOrderNo>
                  <a v-if="record.salesOrderNo" class="link-code" @click="goSalesOrder">{{
                    record.salesOrderNo
                  }}</a>
                  <span v-else>—</span>
                </template>
                <template #factoryQc>
                  <a v-if="linkedQc" class="link-code" @click="goFactoryQc">{{ linkedQc.qcNo }}</a>
                  <span v-else>—</span>
                </template>
              </OutboundOrderBasicInfoSection>
            </DetailSectionCard>

            <div v-if="workOrderList.length" class="section-card">
              <OutboundWorkOrderList :work-orders="workOrderList" />
            </div>

            <div v-if="outsourcingOrderList.length" class="section-card">
              <OutboundOutsourcingOrderList :outsourcing-orders="outsourcingOrderList" />
            </div>

            <DetailSectionCard title="出库明细">
              <a-table
                :columns="lineColumns"
                :data-source="record.lineItems || []"
                row-key="id"
                size="small"
                bordered
                :pagination="false"
                :scroll="{ x: lineScrollX }"
              >
                <template #headerCell="{ column }">
                  <template v-if="column.key === 'batchPick'">
                    <span class="col-title-with-tip">
                      拣选批次
                      <a-tooltip title="出库确认时实际扣减的批次">
                        <InfoCircleOutlined class="col-tip-icon" />
                      </a-tooltip>
                    </span>
                  </template>
                  <template v-else>{{ column.title }}</template>
                </template>
                <template #bodyCell="{ column, record: line, index }">
                  <template v-if="column.key === 'index'">{{ index + 1 }}</template>
                  <template v-else-if="column.key === 'lineStatus'">
                    <a-tag
                      :color="(line.lineStatus || '待出库') === '已出库' ? 'success' : 'processing'"
                    >
                      {{ line.lineStatus || '待出库' }}
                    </a-tag>
                  </template>
                  <template v-else-if="column.key === 'locationNo'">
                    {{ line.locationNo || '—' }}
                  </template>
                  <template v-else-if="column.key === 'shipQty'">
                    {{ formatQtyWithUnit(line.shipQty, resolveOutboundStockUnit(line)) }}
                  </template>
                  <template v-else-if="column.key === 'weight'">
                    {{ line.weight != null && line.weight !== '' ? formatQty(line.weight) : '—' }}
                  </template>
                  <template v-else-if="column.key === 'blankSizeText'">
                    <template v-if="line.blankSizeText">
                      {{ line.blankSizeText }}
                      <div v-if="line.blankArea > 0" class="blank-size-hint">
                        ≈ {{ formatQty(line.blankArea) }}㎡/件
                      </div>
                      <div v-else-if="line.blankLength > 0" class="blank-size-hint">
                        ≈ {{ formatQty(line.blankLength) }}米/件
                      </div>
                    </template>
                    <span v-else>—</span>
                  </template>
                  <template v-else-if="column.key === 'batchPick'">
                    <template v-if="formatOutboundIssuedBatchText(line)">
                      <div v-if="line.manualBatchPick" class="manual-pick-tag">自主拣选</div>
                      <span>{{ formatOutboundIssuedBatchText(line) }}</span>
                      <div
                        v-if="normalizePieceSerialNos(line.issuedPieceSerialNos).length"
                        class="piece-serials"
                      >
                        件码：{{ normalizePieceSerialNos(line.issuedPieceSerialNos).join('、') }}
                      </div>
                    </template>
                    <span v-else-if="(line.lineStatus || '待出库') !== '已出库'">
                      {{ line.manualBatchPick ? '待选批次' : '确认出库时扣减批次' }}
                    </span>
                    <span v-else>—</span>
                  </template>
                  <template v-else-if="column.key === 'barcodeType'">
                    {{ line.barcodeType || '—' }}
                  </template>
                  <template v-else-if="column.key === 'packagingForm'">
                    {{ line.packagingForm || '—' }}
                  </template>
                  <template v-else-if="column.key === 'deliveryRemark'">
                    <a-tooltip v-if="line.deliveryRemark" :title="line.deliveryRemark">
                      <span class="delivery-remark-cell">{{ line.deliveryRemark }}</span>
                    </a-tooltip>
                    <span v-else>—</span>
                  </template>
                  <template v-else-if="column.key === 'unitPrice'">
                    {{ line.unitPrice != null ? line.unitPrice : '—' }}
                  </template>
                  <template v-else-if="column.key === 'totalPrice'">
                    {{ line.totalPrice != null ? line.totalPrice : '—' }}
                  </template>
                  <template v-else-if="column.key === 'lineSource'">
                    {{ line.lineSource || '—' }}
                  </template>
                  <template v-else-if="column.key === 'sourceDocNo'">
                    {{ line.sourceDocNo || '—' }}
                  </template>
                </template>
                <template #summary>
                  <a-table-summary v-if="record.lineItems?.length">
                    <a-table-summary-row class="line-summary-row">
                      <a-table-summary-cell
                        v-for="(col, colIndex) in lineColumns"
                        :key="col.key"
                        :index="colIndex"
                        :align="col.align"
                      >
                        <template v-if="col.key === 'index'">合计</template>
                        <template v-else-if="col.key === 'itemCode'">
                          项数 {{ lineSummary.lineCount }}
                        </template>
                        <template v-else-if="col.key === 'shipQty'">
                          {{ formatQty(lineSummary.shipQtyTotal) }}
                        </template>
                        <template v-else-if="col.key === 'weight'">
                          {{ formatQty(lineSummary.weightTotal) }}
                        </template>
                        <template v-else-if="col.key === 'totalPrice'">
                          {{ formatMoney(lineSummary.totalPrice) }}
                        </template>
                      </a-table-summary-cell>
                    </a-table-summary-row>
                  </a-table-summary>
                </template>
              </a-table>
            </DetailSectionCard>
          </template>

          <template v-else-if="infoTab === 'related' && isMaterialReqOutbound">
            <DetailSectionCard title="关联单据">
              <a-table
                :columns="relatedInboundColumns"
                :data-source="relatedInbounds"
                row-key="id"
                size="small"
                bordered
                :pagination="false"
                :locale="{ emptyText: '暂无领入仓入库单（确认出库后生成）' }"
              >
                <template #bodyCell="{ column, record: row, index }">
                  <template v-if="column.key === 'index'">{{ index + 1 }}</template>
                  <template v-else-if="column.key === 'status'">
                    <a-tag :color="inboundStatusColor(row.status)">{{ row.status || '—' }}</a-tag>
                  </template>
                  <template v-else-if="column.key === 'docNo'">
                    <a class="link-code" @click.prevent="goInbound(row)">{{ row.docNo || '—' }}</a>
                  </template>
                  <template v-else>
                    {{ row[column.dataIndex] || '—' }}
                  </template>
                </template>
              </a-table>
            </DetailSectionCard>
          </template>

          <template v-else-if="infoTab === 'related' && isPurchaseReturnOutbound">
            <DetailSectionCard title="关联单据">
              <a-table
                :columns="relatedPurchaseReturnColumns"
                :data-source="relatedPurchaseReturns"
                row-key="id"
                size="small"
                bordered
                :pagination="false"
                :locale="{ emptyText: '暂无关联的采购退货单' }"
                :scroll="{ x: 1280 }"
              >
                <template #bodyCell="{ column, record: row, index }">
                  <template v-if="column.key === 'index'">{{ index + 1 }}</template>
                  <template v-else-if="column.key === 'status'">
                    <a-tag :color="purchaseReturnStatusColor(row.status)">{{
                      row.status || '—'
                    }}</a-tag>
                  </template>
                  <template v-else-if="column.key === 'outboundStatus'">
                    {{ row.outboundStatus || '—' }}
                  </template>
                  <template v-else-if="column.key === 'returnNo'">
                    <a class="link-code" @click.prevent="goPurchaseReturn(row)">{{
                      row.returnNo || '—'
                    }}</a>
                  </template>
                  <template v-else-if="column.key === 'returnQty'">
                    {{ row.returnQtyText || '—' }}
                  </template>
                  <template v-else>
                    {{ row[column.dataIndex] || '—' }}
                  </template>
                </template>
              </a-table>
            </DetailSectionCard>
          </template>

          <template v-else-if="infoTab === 'cutSettle'">
            <DetailSectionCard title="下料结算">
              <a-table
                :columns="cutSettleColumns"
                :data-source="relatedCutSettleLines"
                row-key="rowKey"
                size="small"
                bordered
                :pagination="false"
                :scroll="{ x: cutSettleScrollX }"
                :locale="{ emptyText: '暂无关联的下料结算单' }"
              >
                <template #bodyCell="{ column, record: row, index }">
                  <template v-if="column.key === 'index'">{{ index + 1 }}</template>
                  <template v-else-if="column.key === 'status'">
                    <a-tag :color="row.status === '已确认' ? 'green' : 'orange'">{{
                      row.status || '—'
                    }}</a-tag>
                  </template>
                  <template v-else-if="column.key === 'docNo'">
                    <a class="link-code" @click.prevent="goCutSettle(row)">{{
                      row.docNo || '—'
                    }}</a>
                  </template>
                  <template v-else-if="column.key === 'demandMeters'">
                    {{ formatQtyWithUnit(row.demandMeters, cutSettleLineUnit(row)) }}
                  </template>
                  <template v-else-if="column.key === 'actualConsumeMeters'">
                    {{ formatQtyWithUnit(row.actualConsumeMeters, cutSettleLineUnit(row)) }}
                  </template>
                  <template v-else-if="column.key === 'remnantLength'">
                    {{ formatQtyWithUnit(row.remnantLength, cutSettleLineUnit(row)) }}
                  </template>
                  <template v-else-if="column.key === 'remnantInboundDocNo'">
                    <a
                      v-if="row.remnantInboundDocNo"
                      class="link-code"
                      @click.prevent="goRemnantInbound(row)"
                    >
                      {{ row.remnantInboundDocNo }}
                    </a>
                    <span v-else>—</span>
                  </template>
                  <template v-else>
                    {{ (column.dataIndex ? row[column.dataIndex] : row[column.key]) || '—' }}
                  </template>
                </template>
              </a-table>
            </DetailSectionCard>
          </template>

          <template v-else-if="infoTab === 'logs'">
            <DetailSectionCard title="操作日志">
              <a-table
                :columns="logColumns"
                :data-source="operationLogs"
                row-key="id"
                size="small"
                bordered
                :pagination="false"
                :locale="{ emptyText: '暂无操作日志' }"
              />
            </DetailSectionCard>
          </template>
        </div>
      </template>
      <a-empty v-else-if="!loading" description="未找到该出库单" />
    </a-spin>

    <OutboundRefuseModal
      v-model:open="refuseModalOpen"
      :doc-nos="record ? [record.docNo] : []"
      @confirm="submitRefuse"
    />

    <OutboundOrderPrintModal v-model:open="printModalOpen" :order="record" />
  </div>
</template>

<script>
import { formatQty, formatQtyWithUnit } from '@/utils/numberFormat'
export default { name: 'OutboundOrderDetailView' }
</script>

<script setup>
import DetailSectionCard from '@/components/DetailSectionCard.vue'
import { computed, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { Modal, message } from 'ant-design-vue'
import { outboundStatusColor, isOutboundBusinessSource } from '@/mock/outboundOptions'
import {
  getOutboundOrderById,
  confirmOutbound,
  refuseOutbound,
  canRefuseOutbound,
  validateOutboundForConfirm,
  initiateFactoryQcFromOutbound,
  canInitiateFactoryQc,
  approveOutboundOrder,
  canApproveOutbound,
  canEditOutbound,
  canDeleteOutbound,
  deleteOutboundOrder,
} from '@/store/outboundStore'
import { cutSettleState } from '@/store/cutSettleStore'
import { getFactoryQcById, qcResultBlocksOutbound } from '@/store/factoryQcStore'
import { findSalesOrderByOrderNo } from '@/store/salesOrderStore'
import { tabStore, useTabs } from '@/composables/useTabs'
import { openCreateTab } from '@/utils/openCreateTab'
import { outboundDetailLineColumns, filterOutboundLineColumns } from '@/utils/outboundLineColumns'
import {
  enrichOutboundLine,
  formatOutboundIssuedBatchText,
  normalizePieceSerialNos,
  resolveOutboundStockUnit,
} from '@/utils/outboundLineHelpers'
import { InfoCircleOutlined, PrinterOutlined } from '@ant-design/icons-vue'
import OutboundOrderBasicInfoSection from './components/OutboundOrderBasicInfoSection.vue'
import OutboundRefuseModal from './components/OutboundRefuseModal.vue'
import OutboundOrderPrintModal from './components/OutboundOrderPrintModal.vue'
import OutboundWorkOrderList from './components/OutboundWorkOrderList.vue'
import OutboundOutsourcingOrderList from './components/OutboundOutsourcingOrderList.vue'
import {
  mobileMaterialReqState,
  syncMaterialReqOnOutboundRefuse,
} from '@/store/mobileMaterialReqStore'
import { resolveOutboundWorkOrders } from '@/utils/outboundWorkOrders'
import { resolveOutboundOutsourcingOrders } from '@/utils/outboundOutsourcingOrders'
import { outsourcingOrderState } from '@/store/outsourcingOrderStore'
import { flattenCutSettleLines } from '@/utils/cutSettleLines'
import { inboundOrderState } from '@/store/inboundOrderStore'
import { inboundStatusColor } from '@/mock/inboundOptions'
import { purchaseReturnState } from '@/store/purchaseReturnStore'
import {
  listRelatedInboundsForOutbound,
  listRelatedPurchaseReturnsForOutbound,
} from '@/utils/outboundRelatedDocs'

const route = useRoute()
const router = useRouter()
const { openTab } = useTabs()
const loading = ref(false)
const record = ref(null)
const infoTab = ref('basic')
const refuseModalOpen = ref(false)
const printModalOpen = ref(false)

const isMaterialReqOutbound = computed(() => record.value?.outboundType === '领料出库')
const isPurchaseReturnOutbound = computed(() => record.value?.outboundType === '采购退货')

const operationLogs = computed(() => record.value?.operationLogs || [])

const logColumns = [
  { title: '操作时间', dataIndex: 'operatedAt', width: 180 },
  { title: '操作人', dataIndex: 'operator', width: 120 },
  { title: '操作', dataIndex: 'action', width: 140 },
  { title: '说明', dataIndex: 'remark', ellipsis: true },
]

const workOrderList = computed(() => {
  void mobileMaterialReqState.items
  return resolveOutboundWorkOrders(record.value, mobileMaterialReqState.items)
})

const outsourcingOrderList = computed(() => {
  void outsourcingOrderState.orders
  return resolveOutboundOutsourcingOrders(record.value)
})

const relatedInbounds = computed(() => {
  void inboundOrderState.orders
  return listRelatedInboundsForOutbound(record.value)
})

const relatedPurchaseReturns = computed(() => {
  void purchaseReturnState.returns
  return listRelatedPurchaseReturnsForOutbound(record.value)
})

const relatedInboundColumns = [
  { title: '序号', key: 'index', width: 56, align: 'center' },
  { title: '状态', key: 'status', width: 90 },
  { title: '入库单号', key: 'docNo', width: 160 },
  { title: '入库类型', dataIndex: 'inboundType', width: 110 },
  { title: '入库仓库', dataIndex: 'warehouse', width: 110 },
  { title: '源单号', dataIndex: 'sourceOrderNo', width: 140 },
  { title: '创建人', dataIndex: 'creator', width: 90 },
  { title: '创建时间', dataIndex: 'createdAt', width: 160 },
]

const relatedPurchaseReturnColumns = [
  { title: '序号', key: 'index', width: 56, align: 'center' },
  { title: '状态', key: 'status', width: 90 },
  { title: '出库状态', key: 'outboundStatus', width: 100 },
  { title: '退货单号', key: 'returnNo', width: 150 },
  { title: '采购单号', dataIndex: 'purchaseOrderNo', width: 140 },
  { title: '供应商', dataIndex: 'supplier', width: 120, ellipsis: true },
  { title: '退货数量', key: 'returnQty', width: 110, align: 'right' },
  { title: '创建人', dataIndex: 'creator', width: 90 },
  { title: '创建时间', dataIndex: 'createdAt', width: 160 },
  { title: '更新人', dataIndex: 'updater', width: 90 },
  { title: '更新时间', dataIndex: 'updatedAt', width: 160 },
]

const relatedCutSettles = computed(() => {
  void cutSettleState.records
  const id = record.value?.id
  const docNo = record.value?.docNo
  if (!id && !docNo) return []
  return cutSettleState.records.filter(
    (r) => (id && r.outboundId === id) || (docNo && r.outboundDocNo === docNo),
  )
})

const relatedCutSettleLines = computed(() => flattenCutSettleLines(relatedCutSettles.value))

const cutSettleColumns = [
  { title: '序号', key: 'index', width: 56, align: 'center' },
  { title: '状态', key: 'status', width: 90 },
  { title: '结算单号', key: 'docNo', width: 140 },
  { title: '物料名称', dataIndex: 'itemName', width: 150, ellipsis: true },
  { title: '编码', dataIndex: 'itemCode', width: 130 },
  { title: '规格型号', dataIndex: 'specModel', width: 110, ellipsis: true },
  { title: '材质', dataIndex: 'material', width: 90 },
  { title: '图号', dataIndex: 'drawingNo', width: 110, ellipsis: true },
  { title: '下料尺寸', dataIndex: 'blankSizeText', width: 150, ellipsis: true },
  { title: '需求数', key: 'demandMeters', width: 100, align: 'right' },
  { title: '实耗', key: 'actualConsumeMeters', width: 100, align: 'right' },
  { title: '余料', key: 'remnantLength', width: 100, align: 'right' },
  { title: '工单编号', dataIndex: 'workOrderNo', width: 140 },
  { title: '余料入库单号', key: 'remnantInboundDocNo', width: 150 },
  { title: '确认人', dataIndex: 'confirmer', width: 90 },
  { title: '确认时间', dataIndex: 'confirmedAt', width: 160 },
  { title: '拣选批次', dataIndex: 'pickedBatchNo', width: 140 },
  { title: '余料新批次', dataIndex: 'remnantBatchNo', width: 140 },
]

const cutSettleScrollX = cutSettleColumns.reduce((s, c) => s + (c.width || 100), 0)

const lineColumns = computed(() =>
  filterOutboundLineColumns(outboundDetailLineColumns, record.value?.outboundType),
)
const lineScrollX = computed(() => lineColumns.value.reduce((s, c) => s + (c.width || 80), 0))

const linkedQc = computed(() => {
  if (!record.value?.factoryQcId) return null
  return getFactoryQcById(record.value.factoryQcId)
})

const lineSummary = computed(() => {
  const lines = record.value?.lineItems || []
  const shipQtyTotal = lines.reduce((sum, line) => sum + (Number(line.shipQty) || 0), 0)
  const weightTotal = lines.reduce((sum, line) => sum + (Number(line.weight) || 0), 0)
  const totalPrice = lines.reduce((sum, line) => sum + (Number(line.totalPrice) || 0), 0)
  return {
    lineCount: lines.length,
    shipQtyTotal: Math.round(shipQtyTotal * 1000) / 1000,
    weightTotal: Math.round(weightTotal * 1000) / 1000,
    totalPrice: Math.round(totalPrice * 100) / 100,
  }
})

function formatMoney(val) {
  if (val == null || val === '') return '—'
  return Number(val).toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })
}

function canConfirm(order) {
  if (!order) return false
  return validateOutboundForConfirm(order).ok
}

function initiateQcActionLabel(row) {
  const qc = getFactoryQcById(row?.factoryQcId)
  if (qc?.qcStatus === '已完成' && qcResultBlocksOutbound(qc.qcResult)) {
    return '重新发起出厂质检'
  }
  return '发起出厂质检'
}

function reload() {
  const row = getOutboundOrderById(route.params.id)
  record.value = row
    ? {
        ...row,
        lineItems: (row.lineItems || []).map((l) => enrichOutboundLine({ ...l })),
      }
    : null
  if (record.value?.docNo) {
    const tab = tabStore.tabs.find((t) => t.path === route.path)
    if (tab) tab.title = record.value.docNo
  }
}

watch(
  () => route.params.id,
  () => {
    loading.value = true
    infoTab.value = 'basic'
    reload()
    loading.value = false
  },
  { immediate: true },
)

function goBack() {
  router.push('/inventory/outbound')
}

function goCutSettle(row) {
  const id = row?.settleId || row?.id
  if (!id) return
  const path = `/inventory/cut-settle/${id}`
  openTab(path, row.docNo || '下料结算详情')
  router.push(path)
}

function cutSettleLineUnit(row) {
  return String(row?.unit || '').trim() || '米'
}

function goRemnantInbound(row) {
  const id = row?.remnantInboundId
  if (id) {
    const path = `/inventory/inbound/${id}`
    openTab(path, row.remnantInboundDocNo || '入库单详情')
    router.push(path)
    return
  }
  const docNo = row?.remnantInboundDocNo
  if (!docNo) return
  const found = inboundOrderState.orders.find((o) => o.docNo === docNo)
  if (found) {
    const path = `/inventory/inbound/${found.id}`
    openTab(path, docNo)
    router.push(path)
    return
  }
  message.info(`未找到余料入库单 ${docNo}`)
}

function openEdit() {
  if (!record.value?.id) return
  openCreateTab(router, openTab, {
    path: `/inventory/outbound/${record.value.id}/edit`,
    title: `编辑出库单 ${record.value.docNo || ''}`.trim(),
  })
}

function openPrint() {
  if (!record.value) return
  printModalOpen.value = true
}

function goSource() {
  if (record.value?.outboundType === '销售出库' && record.value?.linkedDeliveryId) {
    const path = `/sales/delivery/${record.value.linkedDeliveryId}`
    openTab(path, `发货单 ${record.value.linkedDeliveryCode || ''}`)
    router.push(path)
    return
  }
  message.info('暂无源单跳转')
}

function goSalesOrder() {
  const no = record.value?.salesOrderNo
  if (!no) return
  const order = findSalesOrderByOrderNo(no)
  if (!order) {
    message.info('未找到关联销售订单')
    return
  }
  const path = `/sales/orders/${order.id}`
  openTab(path, `销售订单 ${no}`)
  router.push(path)
}

function goFactoryQc() {
  if (!linkedQc.value) return
  const path = `/quality/factory-qc/${linkedQc.value.id}`
  openTab(path, linkedQc.value.qcNo || '出厂质检详情')
  router.push(path)
}

function goInbound(row) {
  if (!row?.id) return
  const path = `/inventory/inbound/${row.id}`
  openTab(path, row.docNo || '入库单详情')
  router.push(path)
}

function goPurchaseReturn(row) {
  if (!row?.id) return
  const path = `/procurement/purchase-returns/${row.id}`
  openTab(path, `采购退货 ${row.returnNo || ''}`.trim())
  router.push(path)
}

function purchaseReturnStatusColor(status) {
  if (status === '已完成') return 'success'
  if (status === '进行中') return 'processing'
  if (status === '作废') return 'default'
  return 'warning'
}

function handleApprove() {
  Modal.confirm({
    title: `审批通过出库单 ${record.value.docNo}？`,
    okText: '审批',
    onOk: () => {
      const res = approveOutboundOrder(record.value.id)
      if (!res.ok) {
        message.warning(res.message)
        return
      }
      message.success('审批已通过')
      reload()
    },
  })
}

function handleConfirmOutbound() {
  Modal.confirm({
    title: `确认出库 ${record.value.docNo}？`,
    onOk: () => {
      const { count, blocked, warnings } = confirmOutbound([record.value.id])
      if (blocked.length) {
        message.warning(blocked.map((b) => b.message).join('；'))
        return
      }
      if (warnings?.length) {
        message.warning(warnings.join('；'))
      }
      if (count > 0) {
        message.success('已确认出库')
        reload()
      }
    },
  })
}

function applyRefuseOutbound(orderId, reason) {
  const result = refuseOutbound([orderId], { reason })
  ;(result.refused || []).forEach((order) => syncMaterialReqOnOutboundRefuse(order))
  return result
}

function handleRefuseOutbound() {
  if (!record.value) return
  refuseModalOpen.value = true
}

function submitRefuse(reason) {
  if (!record.value) return
  const { count, blocked } = applyRefuseOutbound(record.value.id, reason)
  if (blocked.length) {
    message.warning(blocked.map((b) => b.message).join('；'))
    return
  }
  if (count > 0) {
    message.success('已拒绝出库')
    refuseModalOpen.value = false
    reload()
  }
}

function handleDelete() {
  if (!canDeleteOutbound(record.value)) {
    message.warning(
      isOutboundBusinessSource(record.value) ? '业务来源出库单不支持删除' : '当前状态不可删除',
    )
    return
  }
  Modal.confirm({
    title: `确认删除出库单 ${record.value.docNo}？`,
    onOk: () => {
      if (deleteOutboundOrder(record.value.id)) {
        message.success('已删除')
        goBack()
      }
    },
  })
}

function handleInitiateQc() {
  const res = initiateFactoryQcFromOutbound(record.value.id)
  if (res.ok) {
    message.success('已发起出厂质检')
    reload()
    if (res.record?.id) {
      const path = `/quality/factory-qc/${res.record.id}`
      openTab(path, res.record.qcNo || '出厂质检详情')
      router.push(path)
    }
  } else {
    message.warning(res.message || '发起失败')
  }
}
</script>

<style lang="less" scoped>
.outbound-detail-page {
  .page-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 10px 12px;
    background: #fff;
    border-bottom: 1px solid #e8e8e8;
  }

  .header-left {
    display: flex;
    align-items: center;
    gap: 12px;
  }

  .page-title {
    font-size: 18px;
    font-weight: 600;
  }

  .sub-type {
    color: #8c8c8c;
  }

  .detail-tabs-wrap {
    padding-bottom: 8px;
  }

  .tab-body {
    margin-top: 0;
    padding: 0 12px 16px;
    background: var(--page-bg, #f0f2f5);
  }

  .section-card {
    background: #fff;
    border: 1px solid #f0f0f0;
    border-radius: 6px;
    padding: 14px 16px;
    margin-bottom: 8px;
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
  }

  .section-title {
    font-weight: 600;
    font-size: 14px;
    margin-bottom: 8px;
    color: rgba(0, 0, 0, 0.85);
  }

  .link-code {
    color: #1677ff;
    cursor: pointer;
  }

  .delivery-remark-cell {
    display: inline-block;
    max-width: 100%;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    vertical-align: bottom;
  }

  .col-title-with-tip {
    display: inline-flex;
    align-items: center;
    gap: 4px;
  }

  .col-tip-icon {
    color: rgba(0, 0, 0, 0.45);
    font-size: 12px;
    cursor: help;
  }

  .unit-suffix {
    margin-left: 4px;
    color: rgba(0, 0, 0, 0.45);
    font-size: 12px;
  }

  .blank-size-hint {
    margin-top: 2px;
    font-size: 11px;
    color: #d46b08;
    line-height: 1.25;
    word-break: break-all;
  }

  .manual-pick-tag {
    margin-bottom: 2px;
    font-size: 11px;
    color: #1677ff;
  }

  .piece-serials {
    margin-top: 4px;
    font-size: 12px;
    color: rgba(0, 0, 0, 0.45);
    line-height: 1.4;
    word-break: break-all;
  }

  :deep(.line-summary-row .ant-table-cell) {
    background: #fafafa;
    font-weight: 600;
  }
}
</style>
