<template>
  <div v-if="record" class="detail-panel">
    <div class="detail-header">
      <div class="header-main">
        <div class="detail-title">
          <a class="code link-code" @click="emit('open-full')">{{ record.docNo }}</a>
          <span class="name">{{ record.outboundType }}</span>
          <a-space :size="6" class="header-tags">
            <a-tag :color="outboundStatusColor(record.status)">{{ record.status }}</a-tag>
            <a-tag>{{ outboundSourceLabel(record.sourceChannel) }}</a-tag>
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
        <a-button v-if="canApproveOutbound(record)" type="primary" @click="emit('approve')">
          审批
        </a-button>
        <a-button v-if="canConfirm" type="primary" @click="emit('confirm')"> 确认出库 </a-button>
        <a-button v-if="canRefuseOutbound(record)" danger @click="emit('refuse')">
          拒绝出库
        </a-button>
        <a-button v-if="canDeleteOutbound(record)" danger @click="emit('delete')"> 删除 </a-button>
        <a-button v-if="canInitiateFactoryQc(record)" @click="emit('initiate-qc')">
          {{ initiateQcLabel }}
        </a-button>
      </a-space>
    </div>

    <a-tabs v-model:activeKey="activeTab" class="detail-tabs detail-tabs-pill">
      <a-tab-pane v-if="showEditTab" key="edit" tab="编辑出库">
        <div class="edit-tab-body">
          <OutboundOrderFormModal
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
            <OutboundOrderBasicInfoSection
              :record="record"
              :is-material-req-outbound="isMaterialReqOutbound"
            >
              <template #sourceOrderNo>
                <span>{{ record.sourceOrderNo || '—' }}</span>
              </template>
              <template #salesOrderNo>
                <span>{{ record.salesOrderNo || '—' }}</span>
              </template>
              <template #factoryQc>
                <span>{{ linkedQcNo || '—' }}</span>
              </template>
            </OutboundOrderBasicInfoSection>
          </DetailSectionCard>

          <DetailSectionCard v-if="workOrderList.length" title="工单清单">
            <OutboundWorkOrderList hide-title :work-orders="workOrderList" />
          </DetailSectionCard>

          <DetailSectionCard v-if="outsourcingOrderList.length" title="外协订单清单">
            <OutboundOutsourcingOrderList hide-title :outsourcing-orders="outsourcingOrderList" />
          </DetailSectionCard>

          <DetailSectionCard title="出库明细">
            <a-table
              :columns="lineColumns"
              :data-source="lineItems"
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
                <template v-else-if="column.key === 'variantAttr'">
                  {{ line.variantSummary || '—' }}
                </template>
              </template>
            </a-table>
          </DetailSectionCard>
        </div>
      </a-tab-pane>

      <a-tab-pane
        v-if="isSalesOutbound"
        key="relatedDelivery"
        :tab="`关联单据 (${relatedDeliveries.length})`"
      >
        <div class="tab-scroll-body">
          <DetailSectionCard title="关联单据">
            <a-table
              :columns="relatedDeliveryColumns"
              :data-source="relatedDeliveries"
              row-key="id"
              size="small"
              bordered
              :pagination="false"
              :scroll="{ x: 1280 }"
              :locale="{ emptyText: '暂无关联销售发货单' }"
            >
              <template #bodyCell="{ column, record: row, index }">
                <template v-if="column.key === 'index'">{{ index + 1 }}</template>
                <template v-else-if="column.key === 'deliveryStatus'">
                  <a-tag :color="deliveryStatusColor(row.deliveryStatus)">{{
                    row.deliveryStatus || '—'
                  }}</a-tag>
                </template>
                <template v-else-if="column.key === 'deliveryCode'">
                  <a v-if="row.deliveryCode" class="link-code" @click.prevent="goDelivery(row)">
                    {{ row.deliveryCode }}
                  </a>
                  <span v-else>—</span>
                </template>
                <template v-else-if="column.key === 'applyShipQty'">
                  {{ formatOutboundQtyInt(row.applyShipQty) }}
                </template>
                <template v-else-if="column.key === 'actualOutboundQty'">
                  {{ formatOutboundQtyInt(row.actualOutboundQty) }}
                </template>
                <template v-else-if="column.key === 'createdAt'">
                  {{ formatDateTimeMinute(row.createdAt) || '—' }}
                </template>
                <template v-else>
                  {{ row[column.dataIndex] || '—' }}
                </template>
              </template>
            </a-table>
          </DetailSectionCard>
        </div>
      </a-tab-pane>

      <a-tab-pane
        v-if="isSalesOutbound"
        key="relatedQc"
        :tab="`关联质检 (${relatedFactoryQcList.length})`"
      >
        <div class="tab-scroll-body">
          <DetailSectionCard title="关联质检">
            <a-table
              :columns="relatedQcColumns"
              :data-source="relatedFactoryQcList"
              row-key="id"
              size="small"
              bordered
              :pagination="false"
              :scroll="{ x: 1280 }"
              :locale="{ emptyText: '暂无关联出厂质检单' }"
            >
              <template #bodyCell="{ column, record: row, index }">
                <template v-if="column.key === 'index'">{{ index + 1 }}</template>
                <template v-else-if="column.key === 'qcNo'">
                  <a v-if="row.qcNo" class="link-code" @click.prevent="openFactoryQcDetail(row)">
                    {{ row.qcNo }}
                  </a>
                  <span v-else>—</span>
                </template>
                <template v-else-if="column.key === 'qcStatus'">
                  <a-tag :color="factoryQcStatusColor(row.qcStatus)">{{
                    row.qcStatus || '—'
                  }}</a-tag>
                </template>
                <template v-else-if="column.key === 'qcResult'">
                  <a-tag v-if="row.qcResult" :color="factoryQcResultColor(row.qcResult)">{{
                    row.qcResult
                  }}</a-tag>
                  <span v-else>—</span>
                </template>
                <template v-else-if="column.key === 'qcQty'">
                  {{ formatFactoryQcQty(row) }}
                </template>
                <template v-else-if="column.key === 'inspectedAt'">
                  {{ formatDateTimeMinute(row.inspectedAt) || '—' }}
                </template>
                <template v-else-if="column.key === 'createdAt'">
                  {{ formatDateTimeMinute(row.createdAt) || '—' }}
                </template>
                <template v-else>
                  {{ row[column.dataIndex] || '—' }}
                </template>
              </template>
            </a-table>
          </DetailSectionCard>
        </div>
      </a-tab-pane>

      <a-tab-pane
        v-if="isMaterialReqOutbound"
        key="related"
        :tab="`关联单据 (${relatedInbounds.length})`"
      >
        <div class="tab-scroll-body">
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
                <template v-else-if="column.key === 'inboundAt'">
                  {{
                    formatDateTimeMinute(row.confirmedAt || row.inboundTime || row.createdAt) || '—'
                  }}
                </template>
                <template v-else>
                  {{ row[column.dataIndex] || '—' }}
                </template>
              </template>
            </a-table>
          </DetailSectionCard>
        </div>
      </a-tab-pane>

      <a-tab-pane
        v-if="isTransferOutbound"
        key="relatedTransfer"
        :tab="`关联单据 (${relatedTransfers.length})`"
      >
        <div class="tab-scroll-body">
          <DetailSectionCard title="关联单据">
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
                  {{ formatDateTimeMinute(row.transferDate) || '—' }}
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
                  {{ row[column.dataIndex] || '—' }}
                </template>
              </template>
            </a-table>
          </DetailSectionCard>
        </div>
      </a-tab-pane>

      <a-tab-pane
        v-if="isStocktakeOutbound"
        key="relatedStocktake"
        :tab="`关联单据 (${relatedStocktakes.length})`"
      >
        <div class="tab-scroll-body">
          <DetailSectionCard title="关联单据">
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
                  {{ formatDateTimeMinute(row.stocktakeDate) || '—' }}
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
                  {{ row[column.dataIndex] || '—' }}
                </template>
              </template>
            </a-table>
          </DetailSectionCard>
        </div>
      </a-tab-pane>

      <a-tab-pane
        v-if="isPurchaseReturnOutbound"
        key="relatedPurchaseReturn"
        :tab="`关联单据 (${relatedPurchaseReturns.length})`"
      >
        <div class="tab-scroll-body">
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
                  <a-tag :color="purchaseReturnOutboundStatusColor(row.outboundStatus)">{{
                    row.outboundStatus || '—'
                  }}</a-tag>
                </template>
                <template v-else-if="column.key === 'returnNo'">
                  <a class="link-code" @click.prevent="goPurchaseReturn(row)">{{
                    row.returnNo || '—'
                  }}</a>
                </template>
                <template v-else-if="column.key === 'returnQty'">
                  {{ row.returnQtyText || '—' }}
                </template>
                <template v-else-if="column.key === 'createdAt'">
                  {{ formatDateTimeMinute(row.createdAt) || '—' }}
                </template>
                <template v-else-if="column.key === 'updatedAt'">
                  {{ formatDateTimeMinute(row.updatedAt) || '—' }}
                </template>
                <template v-else>
                  {{ row[column.dataIndex] || '—' }}
                </template>
              </template>
            </a-table>
          </DetailSectionCard>
        </div>
      </a-tab-pane>

      <a-tab-pane
        v-if="isMaterialReqOutbound"
        key="cutSettle"
        :tab="`下料结算 (${relatedCutSettleLines.length})`"
      >
        <div class="tab-scroll-body">
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
                  <a-tag :color="row.status === '已确认' ? 'green' : 'orange'">
                    {{ row.status || '—' }}
                  </a-tag>
                </template>
                <template v-else-if="column.key === 'docNo'">
                  <a class="link-code" @click.prevent="goCutSettle(row)">{{ row.docNo || '—' }}</a>
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
        </div>
      </a-tab-pane>

      <a-tab-pane key="logs" tab="操作日志">
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
    <a-empty description="请选择左侧出库单" />
  </div>
</template>

<script setup>
import DetailSectionCard from '@/components/DetailSectionCard.vue'
import { computed, ref, watch } from 'vue'
import { InfoCircleOutlined, PrinterOutlined } from '@ant-design/icons-vue'
import { formatQty, formatQtyWithUnit } from '@/utils/numberFormat'
import { formatDateTimeMinute } from '@/utils/dateTimeDisplay'
import { outboundStatusColor, outboundSourceLabel } from '@/mock/outboundOptions'
import {
  outboundState,
  getOutboundOrderById,
  canApproveOutbound,
  canEditOutbound,
  canDeleteOutbound,
  canRefuseOutbound,
  canInitiateFactoryQc,
  validateOutboundForConfirm,
} from '@/store/outboundStore'
import {
  getFactoryQcById,
  factoryQcState,
  qcResultBlocksOutbound,
  listFactoryQcByOutbound,
} from '@/store/factoryQcStore'
import { cutSettleState } from '@/store/cutSettleStore'
import { mobileMaterialReqState } from '@/store/mobileMaterialReqStore'
import { outsourcingOrderState } from '@/store/outsourcingOrderStore'
import { outboundDetailLineColumns, filterOutboundLineColumns } from '@/utils/outboundLineColumns'
import {
  enrichOutboundLine,
  formatOutboundIssuedBatchText,
  normalizePieceSerialNos,
  resolveOutboundStockUnit,
} from '@/utils/outboundLineHelpers'
import { resolveOutboundWorkOrders } from '@/utils/outboundWorkOrders'
import { resolveOutboundOutsourcingOrders } from '@/utils/outboundOutsourcingOrders'
import { inboundOrderState } from '@/store/inboundOrderStore'
import { inboundStatusColor } from '@/mock/inboundOptions'
import { purchaseReturnState } from '@/store/purchaseReturnStore'
import { deliveryOrderState } from '@/store/deliveryOrderStore'
import { transferOrderState } from '@/store/transferOrderStore'
import { stocktakeOrderState } from '@/store/stocktakeOrderStore'
import { transferStatusColor } from '@/mock/transferOptions'
import { stocktakeStatusColor } from '@/mock/stocktakeOptions'
import { deliveryStatusColor, formatOutboundQtyInt } from '@/utils/deliveryOrder'
import {
  listRelatedInboundsForOutbound,
  listRelatedPurchaseReturnsForOutbound,
  listRelatedDeliveriesForOutbound,
  listRelatedTransfersForOutbound,
  listRelatedStocktakesForOutbound,
} from '@/utils/outboundRelatedDocs'
import { flattenCutSettleLines } from '@/utils/cutSettleLines'
import { message } from 'ant-design-vue'
import { useRouter } from 'vue-router'
import { useTabs } from '@/composables/useTabs'
import OutboundOrderBasicInfoSection from './OutboundOrderBasicInfoSection.vue'
import OutboundOrderFormModal from './OutboundOrderFormModal.vue'
import OutboundWorkOrderList from './OutboundWorkOrderList.vue'
import OutboundOutsourcingOrderList from './OutboundOutsourcingOrderList.vue'

const props = defineProps({
  orderId: { type: String, default: '' },
  detailTab: { type: String, default: '' },
})

const emit = defineEmits([
  'update:detailTab',
  'approve',
  'confirm',
  'refuse',
  'delete',
  'initiate-qc',
  'print',
  'open-full',
  'saved',
])

const router = useRouter()
const { openTab } = useTabs()

const internalTab = ref('basic')

const record = computed(() => {
  void outboundState.orders
  if (!props.orderId) return null
  return getOutboundOrderById(props.orderId)
})

const showEditTab = computed(() => canEditOutbound(record.value))

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
  (record.value?.lineItems || []).map((l) => enrichOutboundLine({ ...l })),
)

const lineColumns = computed(() =>
  filterOutboundLineColumns(outboundDetailLineColumns, record.value?.outboundType),
)

const lineScrollX = computed(() => lineColumns.value.reduce((s, c) => s + (c.width || 80), 0))

const isMaterialReqOutbound = computed(() => record.value?.outboundType === '领料出库')
const isPurchaseReturnOutbound = computed(() => record.value?.outboundType === '采购退货')
const isSalesOutbound = computed(() => record.value?.outboundType === '销售出库')
const isTransferOutbound = computed(() => record.value?.outboundType === '调拨出库')
const isStocktakeOutbound = computed(() => record.value?.outboundType === '盘点出库')

const relatedFactoryQcList = computed(() => {
  void factoryQcState.records
  if (!isSalesOutbound.value || !record.value) return []
  return listFactoryQcByOutbound(record.value)
})

const relatedDeliveries = computed(() => {
  void deliveryOrderState.orders
  return listRelatedDeliveriesForOutbound(record.value)
})

const relatedTransfers = computed(() => {
  void transferOrderState.orders
  return listRelatedTransfersForOutbound(record.value)
})

const relatedStocktakes = computed(() => {
  void stocktakeOrderState.orders
  return listRelatedStocktakesForOutbound(record.value)
})

const canConfirm = computed(() => record.value && validateOutboundForConfirm(record.value).ok)

const hasActions = computed(() => {
  const r = record.value
  if (!r) return false
  return (
    canApproveOutbound(r) ||
    canConfirm.value ||
    canRefuseOutbound(r) ||
    canDeleteOutbound(r) ||
    canInitiateFactoryQc(r)
  )
})

const linkedQcNo = computed(() => {
  const qc = getFactoryQcById(record.value?.factoryQcId)
  return qc?.qcNo || ''
})

const initiateQcLabel = computed(() => {
  const qc = getFactoryQcById(record.value?.factoryQcId)
  if (qc?.qcStatus === '已完成' && qcResultBlocksOutbound(qc.qcResult)) {
    return '重新发起出厂质检'
  }
  return '发起出厂质检'
})

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
  { title: '入库时间', key: 'inboundAt', width: 160 },
]

const relatedDeliveryColumns = [
  { title: '序号', key: 'index', width: 56, align: 'center' },
  { title: '发货状态', key: 'deliveryStatus', width: 96 },
  { title: '发货单号', key: 'deliveryCode', width: 150 },
  { title: '客户名称', dataIndex: 'customerName', width: 140, ellipsis: true },
  { title: '销售单号', dataIndex: 'salesOrderNo', width: 140 },
  { title: '申请发货数量', key: 'applyShipQty', width: 110, align: 'right' },
  { title: '实际出库数量', key: 'actualOutboundQty', width: 110, align: 'right' },
  { title: '交货方式', dataIndex: 'shipmentMethod', width: 100 },
  { title: '创建人', dataIndex: 'creator', width: 90 },
  { title: '创建时间', key: 'createdAt', width: 150 },
]

const relatedQcColumns = [
  { title: '序号', key: 'index', width: 56, align: 'center' },
  { title: '质检单号', key: 'qcNo', width: 150 },
  { title: '质检状态', key: 'qcStatus', width: 96 },
  { title: '质检结果', key: 'qcResult', width: 100 },
  { title: '客户名称', dataIndex: 'customerName', width: 140, ellipsis: true },
  { title: '销售单号', dataIndex: 'salesOrderNo', width: 140 },
  { title: '质检数量', key: 'qcQty', width: 90, align: 'right' },
  { title: '质检人', dataIndex: 'inspector', width: 90 },
  { title: '质检时间', key: 'inspectedAt', width: 150 },
  { title: '创建人', dataIndex: 'creator', width: 90 },
  { title: '创建时间', key: 'createdAt', width: 150 },
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

const relatedPurchaseReturnColumns = [
  { title: '序号', key: 'index', width: 56, align: 'center' },
  { title: '状态', key: 'status', width: 90 },
  { title: '出库状态', key: 'outboundStatus', width: 100 },
  { title: '退货单号', key: 'returnNo', width: 150 },
  { title: '采购单号', dataIndex: 'purchaseOrderNo', key: 'purchaseOrderNo', width: 140 },
  { title: '供应商', dataIndex: 'supplier', key: 'supplier', width: 140, ellipsis: true },
  { title: '退货数量', key: 'returnQty', width: 110, align: 'right' },
  { title: '创建人', dataIndex: 'creator', key: 'creator', width: 90 },
  { title: '创建时间', key: 'createdAt', dataIndex: 'createdAt', width: 150 },
  { title: '更新人', dataIndex: 'updater', key: 'updater', width: 90 },
  { title: '更新时间', key: 'updatedAt', dataIndex: 'updatedAt', width: 150 },
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

const operationLogs = computed(() => record.value?.operationLogs || [])

const logColumns = [
  { title: '操作时间', dataIndex: 'operatedAt', width: 180 },
  { title: '操作人', dataIndex: 'operator', width: 120 },
  { title: '操作', dataIndex: 'action', width: 140 },
  { title: '说明', dataIndex: 'remark', ellipsis: true },
]

function goInbound(row) {
  if (!row?.id) return
  const path = `/inventory/inbound/${row.id}`
  openTab(path, row.docNo || '入库单详情')
  router.push(path)
}

function goDelivery(row) {
  if (!row?.id) return
  const path = `/sales/delivery/${row.id}`
  openTab(path, `发货单 ${row.deliveryCode || ''}`.trim())
  router.push(path)
}

function goTransfer(row) {
  if (!row?.id) return
  const path = `/inventory/transfer/${row.id}`
  openTab(path, `调拨单 ${row.docNo || ''}`.trim())
  router.push({ name: 'inventory-transfer-detail', params: { id: row.id } })
}

function goStocktake(row) {
  if (!row?.id) return
  const path = `/inventory/stocktake/${row.id}`
  openTab(path, `盘点单 ${row.docNo || ''}`.trim())
  router.push({ name: 'inventory-stocktake-detail', params: { id: row.id } })
}

function openFactoryQcDetail(row) {
  if (!row?.id) return
  const path = `/quality/factory-qc/${row.id}`
  openTab(path, row.qcNo || '出厂质检详情')
  router.push(path)
}

function factoryQcStatusColor(status) {
  const map = { 待质检: 'processing', 已完成: 'success', 已终止: 'default' }
  return map[status] || 'default'
}

function factoryQcResultColor(result) {
  const map = { 质检通过: 'success', 质检不通过: 'error', 部分通过: 'warning' }
  return map[result] || 'default'
}

function formatFactoryQcQty(row) {
  const lines = row?.lineItems || []
  if (!lines.length) return '—'
  const total = lines.reduce(
    (sum, line) => sum + (Number(line.inspectQty) || Number(line.shipQty) || 0),
    0,
  )
  if (!(total > 0)) return '—'
  const units = [...new Set(lines.map((l) => l.unit).filter(Boolean))]
  const unit = units.length === 1 ? units[0] : ''
  return unit ? `${total} ${unit}` : String(total)
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

function purchaseReturnOutboundStatusColor(status) {
  const map = {
    待出库: 'default',
    出库中: 'processing',
    部分出库: 'warning',
    已出库: 'success',
  }
  return map[status] || 'default'
}

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
</script>

<script>
export default { name: 'OutboundOrderDetailPanel' }
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

.header-main {
  min-width: 0;
  flex: 1;
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

  :deep(.outbound-form-modal),
  :deep(.form-embedded-content-only) {
    flex: 1;
    min-height: 0;
  }
}

.section-card {
  background: #fff;
  border: 1px solid #f0f0f0;
  border-radius: 6px;
  padding: 14px 16px;
  margin-bottom: 8px;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.04);

  &:last-child {
    margin-bottom: 0;
  }
}

.section-title {
  font-size: 13px;
  font-weight: 600;
  margin-bottom: 12px;
  color: rgba(0, 0, 0, 0.85);
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

.col-title-with-tip {
  display: inline-flex;
  align-items: center;
  gap: 4px;
}

.col-tip-icon {
  color: rgba(0, 0, 0, 0.45);
  font-size: 12px;
}

.blank-size-hint {
  font-size: 12px;
  color: rgba(0, 0, 0, 0.45);
  line-height: 1.3;
}

.manual-pick-tag {
  font-size: 12px;
  color: #1677ff;
  margin-bottom: 2px;
}

.piece-serials {
  font-size: 12px;
  color: rgba(0, 0, 0, 0.45);
  margin-top: 2px;
}

.delivery-remark-cell {
  display: inline-block;
  max-width: 100%;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
</style>
