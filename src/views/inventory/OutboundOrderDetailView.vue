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
            <template v-if="record.status === '待处理'">
              <a-button
                v-if="canApproveOutbound(record)"
                type="primary"
                size="small"
                @click="handleApprove"
              >
                审批
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
              <a-button size="small" @click="goBack">返回列表</a-button>
            </template>
            <template v-else-if="record.status === '待出库'">
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
            </template>
            <template v-else>
              <a-button size="small" @click="goBack">返回列表</a-button>
            </template>
          </a-space>
        </div>

        <div v-if="isMaterialReqOutbound" class="detail-tabs-wrap">
          <a-tabs
            v-model:active-key="infoTab"
            class="detail-tabs detail-tabs-pill detail-tabs-pill--nav-only"
          >
            <a-tab-pane key="basic" tab="基本信息" />
            <a-tab-pane key="cutSettle" :tab="`下料结算 (${relatedCutSettles.length})`" />
          </a-tabs>
        </div>

        <div class="tab-body">
          <template v-if="!isMaterialReqOutbound || infoTab === 'basic'">
            <div class="section-card">
              <div v-if="!isMaterialReqOutbound" class="section-title">基本信息</div>
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
                      <a-tooltip :title="batchPickTip">
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
                  <template v-else-if="column.key === 'stockQty'">
                    {{ formatQty(line.stockQty) }}
                    <span class="unit-suffix">{{ resolveOutboundStockUnit(line) }}</span>
                  </template>
                  <template v-else-if="column.key === 'warehouseStockQty'">
                    {{ formatQty(line.warehouseStockQty) }}
                    <span class="unit-suffix">{{ resolveOutboundStockUnit(line) }}</span>
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
                    <template v-if="canOutboundBatchPick(line)">
                      <div v-if="line.manualBatchPick" class="manual-pick-tag">自主拣选</div>
                      <span v-if="line.issuedBatchNo || line.batchAllocations?.length">
                        {{
                          line.issuedBatchNo ||
                          (line.batchAllocations || [])
                            .map((a) => `${a.batchNo}×${a.qty}`)
                            .join('；')
                        }}
                      </span>
                      <template v-else>
                        {{
                          line.pickedBatchNo ||
                          (line.manualBatchPick ? '待选批次' : '确认时自动扣批/库存')
                        }}
                        <span v-if="line.pickedLength != null" class="unit-suffix">
                          / {{ formatQty(line.pickedLength) }}{{ resolveOutboundStockUnit(line) }}
                        </span>
                      </template>
                      <div v-if="line.issuedPieceSerialNos?.length" class="piece-serials">
                        件码：{{ line.issuedPieceSerialNos.join('、') }}
                      </div>
                    </template>
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
                        <template v-else-if="col.key === 'totalPrice'">
                          {{ formatMoney(lineSummary.totalPrice) }}
                        </template>
                      </a-table-summary-cell>
                    </a-table-summary-row>
                  </a-table-summary>
                </template>
              </a-table>
            </div>
          </template>

          <template v-else>
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
                    <a-tag :color="settle.status === '已确认' ? 'green' : 'orange'">{{
                      settle.status || '—'
                    }}</a-tag>
                  </template>
                  <template v-else-if="column.key === 'docNo'">
                    <a class="link-code" @click.prevent="goCutSettle(settle)">{{
                      settle.docNo || '—'
                    }}</a>
                  </template>
                  <template v-else-if="column.key === 'lineCount'">
                    {{ (settle.lines || []).length }}
                  </template>
                  <template v-else-if="column.key === 'action'">
                    <a @click.prevent="goCutSettle(settle)">查看</a>
                  </template>
                </template>
              </a-table>
            </div>
          </template>
        </div>
      </template>
      <a-empty v-else-if="!loading" description="未找到该出库单" />
    </a-spin>
  </div>
</template>

<script>
import { formatQty, formatQtyWithUnit } from '@/utils/numberFormat'
export default { name: 'OutboundOrderDetailView' }
</script>

<script setup>
import { computed, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { Modal, message } from 'ant-design-vue'
import { outboundStatusColor } from '@/mock/outboundOptions'
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
import {
  outboundDetailLineColumns,
  OUTBOUND_BATCH_PICK_TIP_AUTO,
  filterOutboundLineColumns,
} from '@/utils/outboundLineColumns'
import {
  canOutboundBatchPick,
  enrichOutboundLine,
  resolveOutboundStockUnit,
} from '@/utils/outboundLineHelpers'
import { InfoCircleOutlined } from '@ant-design/icons-vue'
import OutboundOrderBasicInfoSection from './components/OutboundOrderBasicInfoSection.vue'
import OutboundWorkOrderList from './components/OutboundWorkOrderList.vue'
import OutboundOutsourcingOrderList from './components/OutboundOutsourcingOrderList.vue'
import {
  mobileMaterialReqState,
  syncMaterialReqOnOutboundRefuse,
} from '@/store/mobileMaterialReqStore'
import { resolveOutboundWorkOrders } from '@/utils/outboundWorkOrders'
import { resolveOutboundOutsourcingOrders } from '@/utils/outboundOutsourcingOrders'
import { outsourcingOrderState } from '@/store/outsourcingOrderStore'

const route = useRoute()
const router = useRouter()
const { openTab } = useTabs()
const loading = ref(false)
const record = ref(null)
const infoTab = ref('basic')

const isMaterialReqOutbound = computed(() => record.value?.outboundType === '领料出库')

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

const cutSettleColumns = [
  { title: '状态', key: 'status', width: 90 },
  { title: '结算单号', key: 'docNo', width: 140 },
  { title: '源单编号', dataIndex: 'sourceOrderNo', key: 'sourceOrderNo', width: 140 },
  { title: '出库仓库', dataIndex: 'shipWarehouse', key: 'shipWarehouse', width: 100 },
  { title: '领入仓库', dataIndex: 'receiveWarehouse', key: 'receiveWarehouse', width: 100 },
  { title: '明细行数', key: 'lineCount', width: 90, align: 'right' },
  { title: '出库时间', dataIndex: 'outboundTime', key: 'outboundTime', width: 160 },
  { title: '创建人', dataIndex: 'creator', key: 'creator', width: 100 },
  { title: '创建时间', dataIndex: 'createdAt', key: 'createdAt', width: 160 },
  { title: '确认人', dataIndex: 'confirmer', key: 'confirmer', width: 100 },
  { title: '确认时间', dataIndex: 'confirmedAt', key: 'confirmedAt', width: 160 },
  { title: '备注', dataIndex: 'remark', key: 'remark', ellipsis: true },
  { title: '操作', key: 'action', width: 80, fixed: 'right' },
]

const lineColumns = computed(() =>
  filterOutboundLineColumns(outboundDetailLineColumns, record.value?.outboundType),
)
const lineScrollX = computed(() => lineColumns.value.reduce((s, c) => s + (c.width || 80), 0))

const batchPickTip = computed(() => OUTBOUND_BATCH_PICK_TIP_AUTO)

const linkedQc = computed(() => {
  if (!record.value?.factoryQcId) return null
  return getFactoryQcById(record.value.factoryQcId)
})

const lineSummary = computed(() => {
  const lines = record.value?.lineItems || []
  const shipQtyTotal = lines.reduce((sum, line) => sum + (Number(line.shipQty) || 0), 0)
  const totalPrice = lines.reduce((sum, line) => sum + (Number(line.totalPrice) || 0), 0)
  return {
    lineCount: lines.length,
    shipQtyTotal: Math.round(shipQtyTotal * 1000) / 1000,
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

function goCutSettle(settle) {
  if (!settle?.id) return
  const path = `/inventory/cut-settle/${settle.id}`
  openTab(path, settle.docNo || '下料结算详情')
  router.push(path)
}

function openEdit() {
  if (!record.value?.id) return
  openCreateTab(router, openTab, {
    path: `/inventory/outbound/${record.value.id}/edit`,
    title: `编辑出库单 ${record.value.docNo || ''}`.trim(),
  })
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
      const { count, blocked } = confirmOutbound([record.value.id])
      if (blocked.length) {
        message.warning(blocked.map((b) => b.message).join('；'))
        return
      }
      if (count > 0) {
        message.success('已确认出库')
        reload()
      }
    },
  })
}

function applyRefuseOutbound(orderId) {
  const result = refuseOutbound([orderId])
  ;(result.refused || []).forEach((order) => syncMaterialReqOnOutboundRefuse(order))
  return result
}

function handleRefuseOutbound() {
  if (!record.value) return
  Modal.confirm({
    title: `拒绝出库 ${record.value.docNo}？`,
    content:
      record.value.outboundType === '领料出库'
        ? '拒绝后出库单将标记为「拒绝领料」，并回写关联领料申请的出库状态。'
        : '拒绝后出库单将标记为「已拒绝」。',
    okText: '拒绝出库',
    okType: 'danger',
    onOk: () => {
      const { count, blocked } = applyRefuseOutbound(record.value.id)
      if (blocked.length) {
        message.warning(blocked.map((b) => b.message).join('；'))
        return
      }
      if (count > 0) {
        message.success('已拒绝出库')
        reload()
      }
    },
  })
}

function handleDelete() {
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

  .tab-body {
    margin-top: 0;
  }

  .section-card {
    background: #fff;
    border-radius: 4px;
    padding: 16px;
    margin-bottom: 16px;
  }

  .section-title {
    font-weight: 600;
    margin-bottom: 12px;
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
