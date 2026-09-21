<template>
  <div v-if="record" class="detail-panel">
    <div class="detail-header">
      <div class="header-main">
        <div class="detail-title">
          <a class="code link-code" @click="emit('open-full')">{{ record.docNo }}</a>
          <span class="name">{{ record.inboundType }}</span>
          <a-space :size="6" class="header-tags">
            <a-tag :color="statusColor(record.status)">{{ record.status }}</a-tag>
          </a-space>
        </div>
      </div>
      <a-space :size="4" class="header-actions">
        <a-button type="link" size="small" class="header-action-btn" @click="emit('print')">
          <PrinterOutlined />
          打印
        </a-button>
      </a-space>
    </div>

    <div v-if="hasActions" class="detail-action-bar">
      <a-space :size="8">
        <a-button v-if="canConfirmInbound(record)" type="primary" @click="emit('confirm')">
          确认入库
        </a-button>
        <a-button v-if="canRefuseInbound(record)" danger @click="emit('refuse')">
          拒绝入库
        </a-button>
        <template v-if="canApproveInbound(record)">
          <a-button type="primary" @click="emit('approve-pass')">通过</a-button>
          <a-button danger @click="emit('approve-reject')">拒绝</a-button>
        </template>
        <a-button v-if="canDeleteInbound(record)" danger @click="emit('delete')"> 删除 </a-button>
      </a-space>
    </div>

    <a-tabs v-model:activeKey="activeTab" class="detail-tabs detail-tabs-pill">
      <a-tab-pane v-if="showEditTab" key="edit" tab="编辑入库">
        <div class="edit-tab-body">
          <InboundOrderFormModal
            :key="`edit-tab-${record.id}`"
            page-mode
            embedded
            content-only
            :open="true"
            :edit-record="record"
            @saved="emit('saved')"
          />
        </div>
      </a-tab-pane>

      <a-tab-pane key="basic" tab="基本信息">
        <div class="tab-scroll-body">
          <DetailSectionCard title="基本信息">
            <InboundOrderBasicInfoSection :record="record">
              <template #sourceOrderNo>
                <span>{{ record.sourceOrderNo || '—' }}</span>
              </template>
            </InboundOrderBasicInfoSection>
          </DetailSectionCard>

          <DetailSectionCard title="入库明细">
            <a-table
              :columns="lineColumns"
              :data-source="lineItems"
              row-key="id"
              size="small"
              bordered
              :pagination="false"
              :scroll="{ x: lineScrollX }"
            >
              <template #bodyCell="{ column, record: line, index }">
                <template v-if="column.key === 'index'">{{ index + 1 }}</template>
                <template v-else-if="column.key === 'lineStatus'">
                  <a-tag :color="lineStatusColor(line.lineStatus)">
                    {{ line.lineStatus || '待入库' }}
                  </a-tag>
                </template>
                <template v-else-if="column.key === 'barcodeType'">
                  {{ line.barcodeType || '—' }}
                </template>
                <template v-else-if="column.key === 'stockQty'">
                  {{ formatQty(line.stockQty) }}
                  <span class="unit-suffix">{{ resolveInboundStockUnit(line) }}</span>
                </template>
                <template v-else-if="column.key === 'warehouseStockQty'">
                  {{ formatQty(line.warehouseStockQty) }}
                  <span class="unit-suffix">{{ resolveInboundStockUnit(line) }}</span>
                </template>
                <template v-else-if="column.key === 'qty'">
                  {{ formatQtyWithUnit(getInboundQtyValue(line), resolveInboundQtyUnit(line)) }}
                </template>
                <template v-else-if="column.key === 'stockUnitQty'">
                  {{ formatQtyWithUnit(getStockUnitQtyValue(line), resolveInboundStockUnit(line)) }}
                </template>
                <template v-else-if="column.key === 'settleQty'">
                  {{
                    hasSettleUnit(line) ? formatQtyWithUnit(line.settleQty, line.settleUnit) : '—'
                  }}
                </template>
                <template v-else-if="column.key === 'locationNo'">
                  {{ line.locationNo || '—' }}
                </template>
                <template v-else-if="column.key === 'warehouse'">
                  {{ line.warehouse || record.warehouse || '—' }}
                </template>
                <template v-else-if="column.key === 'unitPrice'">
                  {{ line.unitPrice != null && line.unitPrice !== '' ? line.unitPrice : '—' }}
                </template>
                <template v-else-if="column.key === 'totalPrice'">
                  {{ line.totalPrice != null && line.totalPrice !== '' ? line.totalPrice : '—' }}
                </template>
                <template v-else-if="column.key === 'variantAttr'">
                  {{ line.variantSummary || '—' }}
                </template>
                <template v-else>
                  {{ (column.dataIndex && line[column.dataIndex]) || '—' }}
                </template>
              </template>
            </a-table>
          </DetailSectionCard>
        </div>
      </a-tab-pane>

      <a-tab-pane v-if="showRelatedTab" key="related" :tab="`关联单据 (${relatedTabCount})`">
        <div class="tab-scroll-body">
          <DetailSectionCard v-if="isMaterialReqType" title="关联单据">
            <a-table
              :columns="relatedOutboundColumns"
              :data-source="relatedOutbounds"
              row-key="id"
              size="small"
              bordered
              :pagination="false"
              :scroll="{ x: 1200 }"
              :locale="{ emptyText: '暂无关联领料出库单' }"
            >
              <template #bodyCell="{ column, record: row, index }">
                <template v-if="column.key === 'index'">{{ index + 1 }}</template>
                <template v-else-if="column.key === 'status'">
                  <a-tag :color="outboundStatusColor(row.status)">{{ row.status || '—' }}</a-tag>
                </template>
                <template v-else-if="column.key === 'docNo'">
                  <a class="link-code" @click.prevent="goOutbound(row)">{{ row.docNo || '—' }}</a>
                </template>
                <template v-else-if="column.key === 'outboundQty'">
                  {{ formatQty(calcOutboundQty(row)) }}
                </template>
                <template v-else-if="column.key === 'outboundTime'">
                  {{ formatDateTimeMinute(row.outboundTime || row.auditDate) || '—' }}
                </template>
                <template v-else-if="column.key === 'createdAt'">
                  {{ formatDateTimeMinute(row.createdAt) || '—' }}
                </template>
                <template v-else-if="column.key === 'operatedAt'">
                  {{
                    formatDateTimeMinute(row.auditDate || row.updatedAt || row.completedAt) || '—'
                  }}
                </template>
                <template v-else-if="column.key === 'operator'">
                  {{ row.auditor || row.warehouseKeeper || row.updater || '—' }}
                </template>
                <template v-else>
                  {{ (column.dataIndex && row[column.dataIndex]) || '—' }}
                </template>
              </template>
            </a-table>
          </DetailSectionCard>

          <template v-else-if="isPurchaseType">
            <DetailSectionCard title="采购单信息">
              <a-table
                :columns="relatedPurchaseOrderColumns"
                :data-source="relatedPurchaseOrders"
                row-key="id"
                size="small"
                bordered
                :pagination="false"
                :scroll="{ x: 1280 }"
                :locale="{ emptyText: '暂无关联采购单' }"
              >
                <template #bodyCell="{ column, record: row, index }">
                  <template v-if="column.key === 'index'">{{ index + 1 }}</template>
                  <template v-else-if="column.key === 'status'">
                    <a-tag>{{ row.status || '—' }}</a-tag>
                  </template>
                  <template v-else-if="column.key === 'orderNo'">
                    <a class="link-code" @click.prevent="goPurchaseOrder(row)">{{
                      row.orderNo || '—'
                    }}</a>
                  </template>
                  <template v-else-if="column.key === 'purchaseQty'">
                    {{ formatQty(row.purchaseQty) }}
                  </template>
                  <template v-else-if="column.key === 'applyInboundQty'">
                    {{ formatQty(row.applyInboundQty) }}
                  </template>
                  <template v-else-if="column.key === 'receiptDate'">
                    {{ formatDateTimeMinute(row.receiptDate) || row.receiptDate || '—' }}
                  </template>
                  <template v-else-if="column.key === 'createdAt'">
                    {{ formatDateTimeMinute(row.createdAt) || '—' }}
                  </template>
                  <template v-else>
                    {{ (column.dataIndex && row[column.dataIndex]) || '—' }}
                  </template>
                </template>
              </a-table>
            </DetailSectionCard>
            <DetailSectionCard title="采购收货单信息">
              <a-table
                :columns="relatedPurchaseReceiptColumns"
                :data-source="relatedPurchaseReceipts"
                row-key="id"
                size="small"
                bordered
                :pagination="false"
                :scroll="{ x: 1280 }"
                :locale="{ emptyText: '暂无关联采购收货单' }"
              >
                <template #bodyCell="{ column, record: row, index }">
                  <template v-if="column.key === 'index'">{{ index + 1 }}</template>
                  <template v-else-if="column.key === 'status'">
                    <a-tag>{{ row.receiptStatus || row.status || '—' }}</a-tag>
                  </template>
                  <template v-else-if="column.key === 'receiptNo'">
                    <a class="link-code" @click.prevent="goPurchaseReceipt(row)">{{
                      row.receiptNo || '—'
                    }}</a>
                  </template>
                  <template v-else-if="column.key === 'receiptQty'">
                    {{ formatQty(row.receiptQty) }}
                  </template>
                  <template v-else-if="column.key === 'applyInboundQty'">
                    {{ formatQty(row.applyInboundQty) }}
                  </template>
                  <template v-else-if="column.key === 'receiptDate'">
                    {{ formatDateTimeMinute(row.receiptDate) || row.receiptDate || '—' }}
                  </template>
                  <template v-else-if="column.key === 'createdAt'">
                    {{ formatDateTimeMinute(row.createdAt) || '—' }}
                  </template>
                  <template v-else>
                    {{ (column.dataIndex && row[column.dataIndex]) || '—' }}
                  </template>
                </template>
              </a-table>
            </DetailSectionCard>
          </template>

          <DetailSectionCard v-else-if="isStocktakeType" title="关联单据">
            <a-table
              :columns="relatedStocktakeColumns"
              :data-source="relatedStocktakes"
              row-key="id"
              size="small"
              bordered
              :pagination="false"
              :scroll="{ x: 1400 }"
              :locale="{ emptyText: '暂无关联盘点单' }"
            >
              <template #bodyCell="{ column, record: row, index }">
                <template v-if="column.key === 'index'">{{ index + 1 }}</template>
                <template v-else-if="column.key === 'status'">
                  <a-tag :color="stocktakeStatusColor(row.status)">{{ row.status || '—' }}</a-tag>
                </template>
                <template v-else-if="column.key === 'docNo'">
                  <a class="link-code" @click.prevent="goStocktake(row)">{{ row.docNo || '—' }}</a>
                </template>
                <template v-else-if="column.key === 'stocktakeQty'">
                  {{ formatQty(row.stocktakeQty) }}
                </template>
                <template v-else-if="column.key === 'stocktakeDate'">
                  {{ row.stocktakeDate || '—' }}
                </template>
                <template v-else-if="column.key === 'createdAt'">
                  {{ formatDateTimeMinute(row.createdAt) || '—' }}
                </template>
                <template v-else-if="column.key === 'approvedAt'">
                  {{ formatDateTimeMinute(row.approvedAt) || '—' }}
                </template>
                <template v-else-if="column.key === 'postedAt'">
                  {{ formatDateTimeMinute(row.postedAt || row.confirmedAt) || '—' }}
                </template>
                <template v-else>
                  {{ (column.dataIndex && row[column.dataIndex]) || '—' }}
                </template>
              </template>
            </a-table>
          </DetailSectionCard>

          <DetailSectionCard v-else-if="isTransferType" title="关联单据">
            <a-table
              :columns="relatedTransferColumns"
              :data-source="relatedTransfers"
              row-key="id"
              size="small"
              bordered
              :pagination="false"
              :scroll="{ x: 1400 }"
              :locale="{ emptyText: '暂无关联调拨单' }"
            >
              <template #bodyCell="{ column, record: row, index }">
                <template v-if="column.key === 'index'">{{ index + 1 }}</template>
                <template v-else-if="column.key === 'status'">
                  <a-tag :color="transferStatusColor(row.status)">{{ row.status || '—' }}</a-tag>
                </template>
                <template v-else-if="column.key === 'docNo'">
                  <a class="link-code" @click.prevent="goTransfer(row)">{{ row.docNo || '—' }}</a>
                </template>
                <template v-else-if="column.key === 'transferQty'">
                  {{ formatQty(row.transferQty) }}
                </template>
                <template v-else-if="column.key === 'transferDate'">
                  {{ row.transferDate || '—' }}
                </template>
                <template v-else-if="column.key === 'createdAt'">
                  {{ formatDateTimeMinute(row.createdAt) || '—' }}
                </template>
                <template v-else-if="column.key === 'confirmedAt'">
                  {{ formatDateTimeMinute(row.confirmedAt) || '—' }}
                </template>
                <template v-else-if="column.key === 'inboundConfirmedAt'">
                  {{ formatDateTimeMinute(row.inboundConfirmedAt) || '—' }}
                </template>
                <template v-else>
                  {{ (column.dataIndex && row[column.dataIndex]) || '—' }}
                </template>
              </template>
            </a-table>
          </DetailSectionCard>
        </div>
      </a-tab-pane>

      <a-tab-pane v-if="showQcTab" key="qc" :tab="`质检信息 (${qcLines.length})`">
        <div class="tab-scroll-body">
          <DetailSectionCard title="质检信息">
            <a-table
              :columns="qcColumns"
              :data-source="qcLines"
              row-key="id"
              size="small"
              bordered
              :pagination="false"
              :scroll="{ x: qcScrollX }"
              :locale="{ emptyText: '暂无质检信息' }"
            >
              <template #bodyCell="{ column, record: row, index }">
                <template v-if="column.key === 'index'">{{ index + 1 }}</template>
                <template v-else-if="column.key === 'qcNo'">
                  <a class="link-code" @click.prevent="goQcDetail(row)">{{ row.qcNo || '—' }}</a>
                </template>
                <template v-else-if="column.key === 'qcStatus'">
                  <a-tag :color="qcStatusColor(row.qcStatus)">{{ row.qcStatus || '—' }}</a-tag>
                </template>
                <template v-else-if="column.key === 'qcResult'">
                  <a-tag v-if="row.qcResult" :color="qcResultColor(row.qcResult)">{{
                    row.qcResult
                  }}</a-tag>
                  <span v-else>—</span>
                </template>
                <template v-else-if="column.key === 'inspectQty'">
                  {{
                    row.inspectQty === '' || row.inspectQty == null
                      ? '—'
                      : formatQty(row.inspectQty)
                  }}
                </template>
                <template v-else-if="column.key === 'acceptInboundQty'">
                  {{
                    row.acceptInboundQty === '' ||
                    row.acceptInboundQty == null ||
                    row.acceptInboundQty === '—'
                      ? '—'
                      : formatQty(row.acceptInboundQty)
                  }}
                </template>
                <template v-else-if="column.key === 'inspectedAt'">
                  {{ formatDateTimeMinute(row.inspectedAt) || '—' }}
                </template>
                <template v-else-if="column.key === 'createdAt'">
                  {{ formatDateTimeMinute(row.createdAt) || '—' }}
                </template>
                <template v-else>
                  {{ row[column.dataIndex] ?? row[column.key] ?? '—' }}
                </template>
              </template>
            </a-table>
          </DetailSectionCard>
        </div>
      </a-tab-pane>

      <a-tab-pane
        v-if="showCutSettleTab"
        key="cutSettle"
        :tab="`下料结算 (${cutSettleLines.length})`"
      >
        <div class="tab-scroll-body">
          <DetailSectionCard title="下料结算">
            <a-table
              :columns="cutSettleColumns"
              :data-source="cutSettleLines"
              row-key="rowKey"
              size="small"
              bordered
              :pagination="false"
              :scroll="{ x: cutSettleScrollX }"
              :locale="{ emptyText: '暂无下料结算单' }"
            >
              <template #bodyCell="{ column, record: row, index }">
                <template v-if="column.key === 'index'">{{ index + 1 }}</template>
                <template v-else-if="column.key === 'status'">
                  <a-tag>{{ row.status || '—' }}</a-tag>
                </template>
                <template v-else-if="column.key === 'docNo'">
                  {{ row.docNo || '—' }}
                </template>
                <template v-else-if="column.key === 'demandMeters'">
                  {{ formatQtyWithUnit(row.demandMeters, row.unit) }}
                </template>
                <template v-else-if="column.key === 'actualConsumeMeters'">
                  {{ formatQtyWithUnit(row.actualConsumeMeters, row.unit) }}
                </template>
                <template v-else-if="column.key === 'remnantLength'">
                  {{ formatQtyWithUnit(row.remnantLength, row.unit) }}
                </template>
                <template v-else-if="column.key === 'confirmedAt'">
                  {{ formatDateTimeMinute(row.confirmedAt) || '—' }}
                </template>
                <template v-else>
                  {{ (column.dataIndex && row[column.dataIndex]) || row[column.key] || '—' }}
                </template>
              </template>
            </a-table>
          </DetailSectionCard>
        </div>
      </a-tab-pane>

      <a-tab-pane key="batches" :tab="`批次详情 (${batchList.length})`">
        <div class="tab-scroll-body">
          <DetailSectionCard title="批次详情">
            <a-empty v-if="!batchGroups.length" :image="false" description="暂无入库明细" />
            <div v-for="group in batchGroups" :key="group.key" class="batch-item-block">
              <div class="batch-item-head">
                <span class="batch-item-code">{{ group.itemCode || '—' }}</span>
                <span class="batch-item-name">{{ group.itemName || '—' }}</span>
                <span v-if="group.material" class="batch-item-material">{{ group.material }}</span>
                <a-tag v-if="group.batches.length" color="blue"
                  >{{ group.batches.length }} 批</a-tag
                >
              </div>
              <a-table
                :columns="batchColumns"
                :data-source="group.batches"
                row-key="id"
                size="small"
                bordered
                :pagination="group.batches.length > 10 ? { pageSize: 10 } : false"
                :scroll="{ x: 780 }"
                :expandable="batchExpandableFor(group.batches)"
              >
                <template #bodyCell="{ column, record: batch }">
                  <template v-if="column.key === 'currentLength'">
                    {{ formatQtyWithUnit(batch.currentLength, batch.unit || group.unit) }}
                    <span v-if="batch.attrs?.manageByPiece" class="piece-hint">
                      （{{ piecesOfBatch(batch.id).length }} 件）
                    </span>
                  </template>
                  <template v-else-if="column.key === 'salesOrderNo'">
                    {{ batch.salesOrderNo || '—' }}
                  </template>
                  <template v-else-if="column.key === 'ownership'">
                    <a-tag :color="batch.salesOrderNo ? 'blue' : 'default'">
                      {{ batch.salesOrderNo ? '按单' : '自由备货' }}
                    </a-tag>
                  </template>
                  <template v-else-if="column.key === 'status'">
                    <a-tag :color="batch.status === '在库' ? 'success' : 'default'">{{
                      batch.status || '—'
                    }}</a-tag>
                  </template>
                  <template v-else>
                    {{ (column.dataIndex && batch[column.dataIndex]) || '—' }}
                  </template>
                </template>
                <template #expandedRowRender="{ record: batch }">
                  <a-table
                    v-if="batch.attrs?.manageByPiece"
                    size="small"
                    bordered
                    :pagination="false"
                    :columns="pieceColumns"
                    :data-source="piecesOfBatch(batch.id)"
                    row-key="id"
                  >
                    <template #bodyCell="{ column, record: piece }">
                      <template v-if="column.key === 'pieceQty'">
                        {{ formatQty(piece.pieceQty) }}
                        <span class="unit-suffix">{{ piece.unit || '' }}</span>
                      </template>
                      <template v-else-if="column.key === 'status'">
                        <a-tag :color="piece.status === '在库' ? 'success' : 'default'">{{
                          piece.status || '—'
                        }}</a-tag>
                      </template>
                    </template>
                    <template #emptyText>
                      <span class="empty-inline">暂无件码</span>
                    </template>
                  </a-table>
                  <span v-else class="empty-inline">合计入库，无件码</span>
                </template>
                <template #emptyText>
                  <a-empty
                    :image="false"
                    :description="
                      record.status === '已入库' ? '该物品暂无批次记录' : '确认入库后生成库存批次'
                    "
                  />
                </template>
              </a-table>
            </div>
          </DetailSectionCard>
        </div>
      </a-tab-pane>

      <a-tab-pane key="logs" :tab="`操作日志 (${operationLogs.length})`">
        <div class="tab-scroll-body">
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
        </div>
      </a-tab-pane>
    </a-tabs>
  </div>
  <div v-else class="detail-empty-inner">
    <a-empty description="请选择左侧入库单" />
  </div>
</template>

<script setup>
import DetailSectionCard from '@/components/DetailSectionCard.vue'
import { computed, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { PrinterOutlined } from '@ant-design/icons-vue'
import { formatQty, formatQtyWithUnit } from '@/utils/numberFormat'
import { formatDateTimeMinute } from '@/utils/dateTimeDisplay'
import { useTabs } from '@/composables/useTabs'
import {
  inboundOrderState,
  getInboundOrderById,
  canConfirmInbound,
  canEditInbound,
  canDeleteInbound,
  canApproveInbound,
  canRefuseInbound,
} from '@/store/inboundOrderStore'
import { inboundStatusColor } from '@/mock/inboundOptions'
import { outboundStatusColor } from '@/mock/outboundOptions'
import { stocktakeStatusColor } from '@/mock/stocktakeOptions'
import { transferStatusColor } from '@/mock/transferOptions'
import { stockBatchState } from '@/store/stockBatchStore'
import { listStockPieces, stockPieceState } from '@/store/stockPieceStore'
import { inboundDetailLineColumns } from '@/utils/inboundLineColumns'
import {
  enrichInboundLine,
  getInboundQtyValue,
  getStockUnitQtyValue,
  resolveInboundQtyUnit,
  resolveInboundStockUnit,
} from '@/utils/inboundLineHelpers'
import { hasSettleUnit } from '@/utils/settleUnit'
import { QC_TASK_RESULT } from '@/constants/qcTaskResult'
import { getQcTaskRouteBundle } from '@/utils/qcTaskRoutes'
import {
  isMaterialReqInbound,
  isPurchaseInbound,
  isFinishedOrSemiInbound,
  isStocktakeInbound,
  isTransferInbound,
  isRemnantInbound,
  listRelatedOutboundsForInbound,
  listRelatedPurchaseOrdersForInbound,
  listRelatedPurchaseReceiptsForInbound,
  listPurchaseQcLinesForInbound,
  listFinishedQcLinesForInbound,
  listRelatedStocktakesForInbound,
  listRelatedTransfersForInbound,
  listRelatedCutSettleLinesForInbound,
} from '@/utils/inboundRelatedDocs'
import InboundOrderBasicInfoSection from './InboundOrderBasicInfoSection.vue'
import InboundOrderFormModal from './InboundOrderFormModal.vue'

const props = defineProps({
  orderId: { type: String, default: '' },
  detailTab: { type: String, default: '' },
})

const emit = defineEmits([
  'update:detailTab',
  'confirm',
  'refuse',
  'edit',
  'delete',
  'approve-pass',
  'approve-reject',
  'open-full',
  'print',
  'saved',
])

const router = useRouter()
const { openTab } = useTabs()
const internalTab = ref('basic')

const record = computed(() => {
  void inboundOrderState.orders
  if (!props.orderId) return null
  return getInboundOrderById(props.orderId)
})

const showEditTab = computed(() => canEditInbound(record.value))

const activeTab = computed({
  get() {
    return props.detailTab || internalTab.value
  },
  set(val) {
    internalTab.value = val
    emit('update:detailTab', val)
  },
})

watch(
  () => [record.value?.id, showEditTab.value],
  () => {
    if (!record.value) return
    if (showEditTab.value) {
      activeTab.value = 'edit'
    } else if (activeTab.value === 'edit') {
      activeTab.value = 'basic'
    }
  },
  { immediate: true },
)

const lineItems = computed(() =>
  (record.value?.lineItems || []).map((l) => enrichInboundLine({ ...l })),
)

const lineColumns = inboundDetailLineColumns
const lineScrollX = computed(() => lineColumns.reduce((s, c) => s + (c.width || 80), 0))

const isMaterialReqType = computed(() => isMaterialReqInbound(record.value))
const isPurchaseType = computed(() => isPurchaseInbound(record.value))
const isFinishedType = computed(() => isFinishedOrSemiInbound(record.value))
const isStocktakeType = computed(() => isStocktakeInbound(record.value))
const isTransferType = computed(() => isTransferInbound(record.value))
const isRemnantType = computed(() => isRemnantInbound(record.value))

const relatedOutbounds = computed(() => listRelatedOutboundsForInbound(record.value))
const relatedPurchaseOrders = computed(() => listRelatedPurchaseOrdersForInbound(record.value))
const relatedPurchaseReceipts = computed(() => listRelatedPurchaseReceiptsForInbound(record.value))
const relatedStocktakes = computed(() => listRelatedStocktakesForInbound(record.value))
const relatedTransfers = computed(() => listRelatedTransfersForInbound(record.value))
const cutSettleLines = computed(() => listRelatedCutSettleLinesForInbound(record.value))
const purchaseQcLines = computed(() => listPurchaseQcLinesForInbound(record.value))
const finishedQcLines = computed(() => listFinishedQcLinesForInbound(record.value))
const qcLines = computed(() =>
  isPurchaseType.value ? purchaseQcLines.value : isFinishedType.value ? finishedQcLines.value : [],
)

const showRelatedTab = computed(
  () =>
    isMaterialReqType.value ||
    isPurchaseType.value ||
    isStocktakeType.value ||
    isTransferType.value,
)
const showQcTab = computed(() => isPurchaseType.value || isFinishedType.value)
const showCutSettleTab = computed(() => isRemnantType.value)

const relatedTabCount = computed(() => {
  if (isMaterialReqType.value) return relatedOutbounds.value.length
  if (isPurchaseType.value)
    return relatedPurchaseOrders.value.length + relatedPurchaseReceipts.value.length
  if (isStocktakeType.value) return relatedStocktakes.value.length
  if (isTransferType.value) return relatedTransfers.value.length
  return 0
})

watch(
  () => [showRelatedTab.value, showQcTab.value, showCutSettleTab.value, activeTab.value],
  () => {
    if (activeTab.value === 'related' && !showRelatedTab.value) activeTab.value = 'basic'
    if (activeTab.value === 'qc' && !showQcTab.value) activeTab.value = 'basic'
    if (activeTab.value === 'cutSettle' && !showCutSettleTab.value) activeTab.value = 'basic'
  },
)

const relatedOutboundColumns = [
  { title: '序号', key: 'index', width: 56, align: 'center' },
  { title: '状态', key: 'status', width: 90 },
  { title: '出库单号', key: 'docNo', width: 150 },
  { title: '出库仓库', dataIndex: 'warehouse', width: 120, ellipsis: true },
  { title: '出库数量', key: 'outboundQty', width: 100, align: 'right' },
  { title: '出库时间', key: 'outboundTime', width: 150 },
  { title: '创建人', dataIndex: 'creator', width: 90 },
  { title: '创建时间', key: 'createdAt', width: 150 },
  { title: '操作人', key: 'operator', width: 90 },
  { title: '操作时间', key: 'operatedAt', width: 150 },
]

const relatedPurchaseOrderColumns = [
  { title: '序号', key: 'index', width: 56, align: 'center' },
  { title: '状态', key: 'status', width: 90 },
  { title: '采购单号', key: 'orderNo', width: 150 },
  { title: '供应商', dataIndex: 'supplier', width: 140, ellipsis: true },
  { title: '采购数量', key: 'purchaseQty', width: 100, align: 'right' },
  { title: '申请入库数量', key: 'applyInboundQty', width: 120, align: 'right' },
  { title: '入库仓库', dataIndex: 'inboundWarehouse', width: 120 },
  { title: '收货日期', key: 'receiptDate', width: 140 },
  { title: '创建人', dataIndex: 'creator', width: 90 },
  { title: '创建时间', key: 'createdAt', width: 150 },
]

const relatedPurchaseReceiptColumns = [
  { title: '序号', key: 'index', width: 56, align: 'center' },
  { title: '状态', key: 'status', width: 90 },
  { title: '采购收货单号', key: 'receiptNo', width: 160 },
  { title: '供应商', dataIndex: 'supplier', width: 140, ellipsis: true },
  { title: '收货数量', key: 'receiptQty', width: 100, align: 'right' },
  { title: '申请入库数量', key: 'applyInboundQty', width: 120, align: 'right' },
  { title: '入库仓库', dataIndex: 'inboundWarehouse', width: 120 },
  { title: '收货日期', key: 'receiptDate', width: 140 },
  { title: '创建人', dataIndex: 'creator', width: 90 },
  { title: '创建时间', key: 'createdAt', width: 150 },
]

const relatedStocktakeColumns = [
  { title: '序号', key: 'index', width: 56, align: 'center' },
  { title: '状态', key: 'status', width: 90 },
  { title: '盘点单号', key: 'docNo', width: 150 },
  { title: '盘点仓库', dataIndex: 'warehouse', width: 120 },
  { title: '盘点类型', dataIndex: 'stocktakeType', width: 100 },
  { title: '盘点数量', key: 'stocktakeQty', width: 100, align: 'right' },
  { title: '盘点日期', key: 'stocktakeDate', width: 120 },
  { title: '创建人', dataIndex: 'creator', width: 90 },
  { title: '创建时间', key: 'createdAt', width: 150 },
  { title: '审核人', dataIndex: 'approver', width: 90 },
  { title: '审核时间', key: 'approvedAt', width: 150 },
  { title: '过账人', dataIndex: 'poster', width: 90 },
  { title: '过账时间', key: 'postedAt', width: 150 },
]

const relatedTransferColumns = [
  { title: '序号', key: 'index', width: 56, align: 'center' },
  { title: '状态', key: 'status', width: 90 },
  { title: '调拨单号', key: 'docNo', width: 150 },
  { title: '调出仓库', dataIndex: 'fromWarehouse', width: 120 },
  { title: '调入仓库', dataIndex: 'toWarehouse', width: 120 },
  { title: '调拨数量', key: 'transferQty', width: 100, align: 'right' },
  { title: '调拨日期', key: 'transferDate', width: 120 },
  { title: '创建人', dataIndex: 'creator', width: 90 },
  { title: '创建时间', key: 'createdAt', width: 150 },
  { title: '确认人', dataIndex: 'confirmer', width: 90 },
  { title: '确认时间', key: 'confirmedAt', width: 150 },
  { title: '入库方确认人', dataIndex: 'inboundConfirmer', width: 110 },
  { title: '入库方确认时间', key: 'inboundConfirmedAt', width: 150 },
]

const purchaseQcColumns = [
  { title: '序号', key: 'index', width: 56, align: 'center' },
  { title: '质检单号', key: 'qcNo', width: 150 },
  { title: '质检状态', key: 'qcStatus', width: 90 },
  { title: '质检结果', key: 'qcResult', width: 100 },
  { title: '质检数量', key: 'inspectQty', width: 100, align: 'right' },
  { title: '处理方案', dataIndex: 'treatmentPlan', width: 100 },
  { title: '合格入库数', key: 'acceptInboundQty', width: 100, align: 'right' },
  { title: '退/换货', dataIndex: 'returnExchange', width: 120, ellipsis: true },
  { title: '质检人', dataIndex: 'inspector', width: 90 },
  { title: '质检时间', key: 'inspectedAt', width: 150 },
  { title: '创建人', dataIndex: 'creator', width: 90 },
  { title: '创建时间', key: 'createdAt', width: 150 },
]

const finishedQcColumns = [
  { title: '序号', key: 'index', width: 56, align: 'center' },
  { title: '质检单号', key: 'qcNo', width: 150 },
  { title: '质检状态', key: 'qcStatus', width: 90 },
  { title: '质检结果', key: 'qcResult', width: 100 },
  { title: '质检数量', key: 'inspectQty', width: 100, align: 'right' },
  { title: '质检人', dataIndex: 'inspector', width: 90 },
  { title: '质检时间', key: 'inspectedAt', width: 150 },
]

const qcColumns = computed(() => (isPurchaseType.value ? purchaseQcColumns : finishedQcColumns))
const qcScrollX = computed(() => qcColumns.value.reduce((s, c) => s + (c.width || 100), 0))

const cutSettleColumns = [
  { title: '序号', key: 'index', width: 56, align: 'center' },
  { title: '状态', key: 'status', width: 90 },
  { title: '结算单号', key: 'docNo', width: 140 },
  { title: '物料名称', dataIndex: 'itemName', width: 140, ellipsis: true },
  { title: '编码', dataIndex: 'itemCode', width: 120 },
  { title: '规格型号', dataIndex: 'specModel', width: 110, ellipsis: true },
  { title: '材质', dataIndex: 'material', width: 90 },
  { title: '变体属性', dataIndex: 'variantSummary', width: 120, ellipsis: true },
  { title: '图号', dataIndex: 'drawingNo', width: 110, ellipsis: true },
  { title: '下料尺寸', dataIndex: 'blankSizeText', width: 140, ellipsis: true },
  { title: '需求数', key: 'demandMeters', width: 100, align: 'right' },
  { title: '实耗', key: 'actualConsumeMeters', width: 100, align: 'right' },
  { title: '余料', key: 'remnantLength', width: 100, align: 'right' },
  { title: '工单编号', dataIndex: 'workOrderNo', width: 140 },
  { title: '确认人', dataIndex: 'confirmer', width: 90 },
  { title: '确认时间', key: 'confirmedAt', width: 150 },
  { title: '拣选批次', dataIndex: 'pickedBatchNo', width: 140 },
  { title: '余料新批次', dataIndex: 'remnantBatchNo', width: 140 },
]
const cutSettleScrollX = cutSettleColumns.reduce((s, c) => s + (c.width || 100), 0)

const batchColumns = [
  { title: '批次号', dataIndex: 'batchNo', key: 'batchNo', width: 130 },
  { title: '销售订单号', key: 'salesOrderNo', dataIndex: 'salesOrderNo', width: 130 },
  { title: '归属', key: 'ownership', width: 88 },
  { title: '仓库', dataIndex: 'warehouse', key: 'warehouse', width: 100 },
  { title: '数量', key: 'currentLength', width: 140 },
  { title: '状态', key: 'status', width: 88 },
  { title: '来源类型', dataIndex: 'sourceType', key: 'sourceType', width: 100 },
]

const pieceColumns = [
  { title: '件码', dataIndex: 'serialNo', key: 'serialNo', width: 160 },
  { title: '单件数量', key: 'pieceQty', width: 120 },
  { title: '状态', key: 'status', width: 88 },
]

const batchList = computed(() => {
  const docNo = record.value?.docNo
  if (!docNo) return []
  const fromLines = new Set()
  ;(record.value?.lineItems || []).forEach((line) => {
    ;(line.batchNos || []).forEach((no) => {
      if (no) fromLines.add(String(no))
    })
  })
  return stockBatchState.batches.filter((b) => {
    if (b.sourceDocNo === docNo) return true
    if (fromLines.size && fromLines.has(String(b.batchNo))) return true
    return false
  })
})

const batchGroups = computed(() => {
  const lines = record.value?.lineItems || []
  const allBatches = batchList.value
  const usedBatchIds = new Set()

  const groups = lines.map((line, index) => {
    const code = line.itemCode || ''
    const lineBatchNos = new Set((line.batchNos || []).map((no) => String(no)))
    const batches = allBatches.filter((b) => {
      if (usedBatchIds.has(b.id)) return false
      const matchByNo = lineBatchNos.size && lineBatchNos.has(String(b.batchNo))
      const matchByCode = code && b.itemCode === code
      if (matchByNo || matchByCode) {
        usedBatchIds.add(b.id)
        return true
      }
      return false
    })
    return {
      key: line.id || `${code || 'line'}-${index}`,
      itemCode: code,
      itemName: line.itemName || '',
      material: line.material || '',
      unit: line.stockUnit || line.unit || '',
      batches,
    }
  })

  const orphanBatches = allBatches.filter((b) => !usedBatchIds.has(b.id))
  if (orphanBatches.length) {
    groups.push({
      key: 'orphan-batches',
      itemCode: '',
      itemName: '其他批次',
      material: '',
      unit: '',
      batches: orphanBatches,
    })
  }

  return groups
})

function batchExpandableFor(batches) {
  return {
    defaultExpandAllRows: (batches || []).some((b) => b.attrs?.manageByPiece),
    rowExpandable: (batch) => Boolean(batch.attrs?.manageByPiece),
  }
}

function piecesOfBatch(batchId) {
  void stockPieceState.pieces.length
  return listStockPieces({ batchId })
}

function calcOutboundQty(row) {
  return (row?.lineItems || []).reduce((s, l) => s + (Number(l.shipQty ?? l.qty) || 0), 0)
}

function qcStatusColor(status) {
  const map = {
    待质检: 'warning',
    检验中: 'processing',
    已完成: 'success',
    已终止: 'default',
  }
  return map[status] || 'default'
}

function qcResultColor(result) {
  if (result === QC_TASK_RESULT.PASS || result === '合格') return 'success'
  if (result === QC_TASK_RESULT.PARTIAL || result === '部分合格') return 'processing'
  if (result === QC_TASK_RESULT.FAIL || result === '不合格') return 'error'
  return 'default'
}

function goOutbound(row) {
  if (!row?.id) return
  const path = `/inventory/outbound/${row.id}`
  openTab(path, `出库单 ${row.docNo || ''}`.trim())
  router.push({ name: 'inventory-outbound-detail', params: { id: row.id } })
}

function goPurchaseOrder(row) {
  if (!row?.id) return
  const path = `/procurement/purchase-orders/${row.id}`
  openTab(path, `采购单 ${row.orderNo || ''}`.trim())
  router.push({ name: 'procurement-purchase-orders-detail', params: { id: row.id } })
}

function goPurchaseReceipt(row) {
  if (!row?.id) return
  const path = `/procurement/purchase-receipts/${row.id}`
  openTab(path, `收货单 ${row.receiptNo || ''}`.trim())
  router.push({ name: 'procurement-purchase-receipts-detail', params: { id: row.id } })
}

function goStocktake(row) {
  if (!row?.id) return
  const path = `/inventory/stocktake/${row.id}`
  openTab(path, `盘点单 ${row.docNo || ''}`.trim())
  router.push({ name: 'inventory-stocktake-detail', params: { id: row.id } })
}

function goTransfer(row) {
  if (!row?.id) return
  const path = `/inventory/transfer/${row.id}`
  openTab(path, `调拨单 ${row.docNo || ''}`.trim())
  router.push({ name: 'inventory-transfer-detail', params: { id: row.id } })
}

function goQcDetail(row) {
  if (!row?.taskId && !row?.id) return
  const taskId = row.taskId || row.id
  const scope = row.bizScope || (isFinishedType.value ? '成品检' : '来料质检')
  const bundle = getQcTaskRouteBundle(scope)
  const path = `${bundle.listPath}/${taskId}`
  openTab(path, row.qcNo || bundle.detailTitle)
  router.push({ name: bundle.detailName, params: { id: taskId } })
}

const operationLogs = computed(() => record.value?.operationLogs || [])

const logColumns = [
  { title: '操作时间', dataIndex: 'operatedAt', width: 180 },
  { title: '操作人', dataIndex: 'operator', width: 120 },
  { title: '操作', dataIndex: 'action', width: 140 },
  { title: '说明', dataIndex: 'remark', ellipsis: true },
]

const hasActions = computed(() => {
  const r = record.value
  if (!r) return false
  return canConfirmInbound(r) || canRefuseInbound(r) || canDeleteInbound(r) || canApproveInbound(r)
})

function statusColor(status) {
  return inboundStatusColor(status)
}

function lineStatusColor(status) {
  const st = status || '待入库'
  if (st === '已入库') return 'success'
  if (st === '已拒绝') return 'error'
  return 'processing'
}
</script>

<script>
export default { name: 'InboundOrderDetailPanel' }
</script>

<style lang="less" scoped>
.detail-panel {
  display: flex;
  flex-direction: column;
  height: 100%;
  min-height: 0;
  background: #fff;
}

.detail-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  margin-bottom: 12px;
  padding: 12px 16px;
  border: 1px solid #e8eef8;
  border-radius: 8px;
  background: linear-gradient(180deg, #f0f5ff 0%, #ffffff 100%);
  box-sizing: border-box;
}

.header-main {
  min-width: 0;
  flex: 1;
}

.header-actions {
  flex-shrink: 0;
}

.header-action-btn {
  padding-inline: 4px;
  color: rgba(0, 0, 0, 0.65);

  &:hover {
    color: #1677ff;
  }
}

.detail-title {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 8px 10px;
  min-width: 0;

  .code {
    font-size: 14px;
    font-weight: 600;
    color: rgba(0, 0, 0, 0.88);
  }

  .name {
    font-size: 13px;
    color: rgba(0, 0, 0, 0.65);
  }

  .header-tags {
    display: inline-flex;
    align-items: center;
  }
}

.detail-action-bar {
  margin-bottom: 8px;
  padding: 8px 12px;
  background: #fff;
  border: 1px solid #e5e6eb;
  border-radius: 8px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.04);
  box-sizing: border-box;
  display: flex;
  align-items: center;
  justify-content: flex-start;

  :deep(.ant-space) {
    display: inline-flex;
    align-items: center;
  }

  :deep(.ant-space-item) {
    margin-bottom: 0 !important;
  }

  :deep(.ant-btn) {
    height: 32px;
    padding: 0 15px;
    font-size: 14px;
    border-radius: 6px;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    line-height: 1;
  }
}

.detail-tabs {
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
  margin-top: 0;
  padding: 0;

  :deep(.ant-tabs-content-holder) {
    flex: 1;
    min-height: 0;
    overflow: hidden;
  }

  :deep(.ant-tabs-content),
  :deep(.ant-tabs-tabpane) {
    height: 100%;
  }
}

.edit-tab-body,
.tab-scroll-body {
  height: 100%;
  min-height: 0;
  overflow: auto;
}

.tab-scroll-body {
  padding-bottom: 8px;
}

.edit-tab-body {
  overflow: hidden;
  display: flex;
  flex-direction: column;

  :deep(.inbound-form-modal),
  :deep(.form-embedded-content-only) {
    flex: 1;
    min-height: 0;
  }
}

.link-code {
  color: #1677ff;
  cursor: pointer;
}

.detail-empty-inner {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 320px;
}

.unit-suffix {
  margin-left: 2px;
  color: rgba(0, 0, 0, 0.45);
  font-size: 12px;
}

.piece-hint {
  margin-left: 4px;
  color: rgba(0, 0, 0, 0.45);
  font-size: 12px;
}

.empty-inline {
  color: rgba(0, 0, 0, 0.45);
  font-size: 12px;
}

.batch-item-block {
  margin-bottom: 16px;

  &:last-child {
    margin-bottom: 0;
  }
}

.batch-item-head {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 8px;
  margin-bottom: 8px;
}

.batch-item-code {
  font-weight: 600;
  color: rgba(0, 0, 0, 0.88);
}

.batch-item-name {
  color: rgba(0, 0, 0, 0.65);
}

.batch-item-material {
  color: rgba(0, 0, 0, 0.45);
  font-size: 12px;
}
</style>
