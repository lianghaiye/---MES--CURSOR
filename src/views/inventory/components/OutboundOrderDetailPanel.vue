<template>
  <div v-if="record" class="detail-panel">
    <div class="detail-header">
      <div class="header-main">
        <div class="detail-title">
          <a class="code link-code" @click="emit('open-full')">{{ record.docNo }}</a>
          <span class="name">{{ record.outboundType }}</span>
        </div>
        <a-space :size="6" class="header-tags">
          <a-tag :color="outboundStatusColor(record.status)">{{ record.status }}</a-tag>
          <a-tag>{{ outboundSourceLabel(record.sourceChannel) }}</a-tag>
        </a-space>
      </div>
      <a-space :size="4" class="header-actions">
        <a-button type="link" size="small" class="header-action-btn" @click="emit('print')">
          <PrinterOutlined />
          打印
        </a-button>
      </a-space>
    </div>

    <div v-if="hasActions" class="detail-action-bar">
      <a-space :size="8" wrap>
        <a-button
          v-if="canApproveOutbound(record)"
          type="primary"
          size="small"
          @click="emit('approve')"
        >
          审批
        </a-button>
        <a-button v-if="canConfirm" type="primary" size="small" @click="emit('confirm')">
          确认出库
        </a-button>
        <a-button v-if="canRefuseOutbound(record)" size="small" danger @click="emit('refuse')">
          拒绝出库
        </a-button>
        <a-button v-if="canDeleteOutbound(record)" size="small" danger @click="emit('delete')">
          删除
        </a-button>
        <a-button v-if="canInitiateFactoryQc(record)" size="small" @click="emit('initiate-qc')">
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
          <div class="section-card">
            <div class="section-title">基本信息</div>
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
          </div>

          <div v-if="workOrderList.length" class="section-card">
            <OutboundWorkOrderList :work-orders="workOrderList" />
          </div>

          <div v-if="outsourcingOrderList.length" class="section-card">
            <OutboundOutsourcingOrderList :outsourcing-orders="outsourcingOrderList" />
          </div>

          <div class="section-card">
            <div class="section-title">出库明细</div>
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
          </div>
        </div>
      </a-tab-pane>

      <a-tab-pane
        v-if="isMaterialReqOutbound"
        key="cutSettle"
        :tab="`下料结算 (${relatedCutSettles.length})`"
      >
        <div class="tab-scroll-body">
          <div class="section-card">
            <a-table
              :columns="cutSettleColumns"
              :data-source="relatedCutSettles"
              row-key="id"
              size="small"
              bordered
              :pagination="false"
              :locale="{ emptyText: '暂无关联的下料结算单' }"
            >
              <template #bodyCell="{ column, record: settle }">
                <template v-if="column.key === 'status'">
                  <a-tag :color="settle.status === '已确认' ? 'green' : 'orange'">
                    {{ settle.status || '—' }}
                  </a-tag>
                </template>
                <template v-else-if="column.key === 'docNo'">
                  {{ settle.docNo || '—' }}
                </template>
                <template v-else-if="column.key === 'lineCount'">
                  {{ (settle.lines || []).length }}
                </template>
              </template>
            </a-table>
          </div>
        </div>
      </a-tab-pane>

      <a-tab-pane key="logs" tab="操作日志">
        <div class="tab-scroll-body">
          <div class="section-card">
            <a-table
              :columns="logColumns"
              :data-source="operationLogs"
              row-key="id"
              size="small"
              bordered
              :pagination="false"
              :locale="{ emptyText: '暂无操作日志' }"
            />
          </div>
        </div>
      </a-tab-pane>
    </a-tabs>
  </div>
  <div v-else class="detail-empty-inner">
    <a-empty description="请选择左侧出库单" />
  </div>
</template>

<script setup>
import { computed, ref, watch } from 'vue'
import { InfoCircleOutlined, PrinterOutlined } from '@ant-design/icons-vue'
import { formatQty, formatQtyWithUnit } from '@/utils/numberFormat'
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
import { getFactoryQcById, qcResultBlocksOutbound } from '@/store/factoryQcStore'
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

const relatedCutSettles = computed(() => {
  void cutSettleState.records
  const id = record.value?.id
  const docNo = record.value?.docNo
  if (!id && !docNo) return []
  return cutSettleState.records.filter(
    (r) => (id && r.outboundId === id) || (docNo && r.outboundDocNo === docNo),
  )
})

const operationLogs = computed(() => record.value?.operationLogs || [])

const logColumns = [
  { title: '操作时间', dataIndex: 'operatedAt', width: 180 },
  { title: '操作人', dataIndex: 'operator', width: 120 },
  { title: '操作', dataIndex: 'action', width: 140 },
  { title: '说明', dataIndex: 'remark', ellipsis: true },
]

const cutSettleColumns = [
  { title: '状态', key: 'status', width: 90 },
  { title: '结算单号', key: 'docNo', width: 140 },
  { title: '源单编号', dataIndex: 'sourceOrderNo', width: 140 },
  { title: '出库仓库', dataIndex: 'shipWarehouse', width: 100 },
  { title: '领入仓库', dataIndex: 'receiveWarehouse', width: 100 },
  { title: '明细行数', key: 'lineCount', width: 90, align: 'right' },
  { title: '出库时间', dataIndex: 'outboundTime', width: 160 },
  { title: '创建人', dataIndex: 'creator', width: 100 },
  { title: '创建时间', dataIndex: 'createdAt', width: 160 },
]
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
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 10px;
  padding: 0;
  border-bottom: none;
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

.header-tags {
  margin-top: 6px;
}

.detail-title {
  display: flex;
  align-items: baseline;
  gap: 10px;
  min-width: 0;

  .code {
    font-size: 16px;
    font-weight: 600;
  }

  .name {
    font-size: 13px;
    color: rgba(0, 0, 0, 0.65);
  }
}

.detail-action-bar {
  margin-bottom: 12px;
  padding: 8px 0;
  border-bottom: 1px solid #f0f0f0;
}

.detail-tabs {
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
  margin-top: 4px;
  padding: 0;

  :deep(> .ant-tabs-nav) {
    margin: 0 0 8px !important;
    flex-shrink: 0;
  }

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
  margin-bottom: 12px;
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
