<template>
  <div class="inbound-detail-page">
    <a-spin :spinning="loading">
      <template v-if="record">
        <div class="page-header">
          <div class="header-left">
            <span class="page-title">{{ record.docNo }}</span>
            <a-tag :color="statusColor(record.status)">{{ record.status }}</a-tag>
            <span class="sub-type">{{ record.inboundType }}</span>
          </div>
          <a-space>
            <template v-if="record.status === '待审批'">
              <a-button type="primary" size="small" @click="handleApprovePass">通过</a-button>
              <a-button size="small" danger @click="handleApproveReject">拒绝</a-button>
              <a-button size="small" @click="goBack">返回列表</a-button>
            </template>
            <template v-else-if="record.status === '待处理'">
              <a-button type="primary" size="small" @click="handleConfirmInbound"
                >确认入库</a-button
              >
              <a-button size="small" @click="openEdit">编辑</a-button>
              <a-button size="small" danger @click="handleDelete">删除</a-button>
            </template>
            <template v-else>
              <a-button size="small" @click="goBack">返回列表</a-button>
            </template>
          </a-space>
        </div>

        <a-tabs v-model:active-key="activeTab" class="detail-tabs">
          <a-tab-pane key="basic" tab="基本信息" />
          <a-tab-pane key="batches" :tab="`批次详情 (${batchList.length})`" />
        </a-tabs>

        <div class="tab-body">
          <template v-if="activeTab === 'basic'">
            <div class="section-card">
              <div class="section-title">基本信息</div>
              <a-descriptions bordered size="small" :column="3">
                <a-descriptions-item label="入库单号">{{ record.docNo }}</a-descriptions-item>
                <a-descriptions-item label="入库类型">{{ record.inboundType }}</a-descriptions-item>
                <a-descriptions-item label="状态">{{ record.status }}</a-descriptions-item>
                <a-descriptions-item label="入库日期">{{
                  record.inboundDate || '—'
                }}</a-descriptions-item>
                <a-descriptions-item label="送货日期">{{
                  record.deliveryDate || '—'
                }}</a-descriptions-item>
                <a-descriptions-item label="入库仓库">{{
                  record.warehouse || '—'
                }}</a-descriptions-item>
                <a-descriptions-item label="仓管员">{{
                  record.warehouseKeeper || '—'
                }}</a-descriptions-item>
                <a-descriptions-item label="物品类型">{{
                  record.itemType || '—'
                }}</a-descriptions-item>
                <a-descriptions-item label="供应商">{{
                  record.supplier || '—'
                }}</a-descriptions-item>
                <a-descriptions-item label="源单号">
                  <a v-if="record.sourceOrderNo" class="link-code" @click="goSource">{{
                    record.sourceOrderNo
                  }}</a>
                  <span v-else>—</span>
                </a-descriptions-item>
                <a-descriptions-item label="来源车间">{{
                  record.sourceWorkshop || '—'
                }}</a-descriptions-item>
                <a-descriptions-item label="发票号码">{{
                  record.invoiceNo || '—'
                }}</a-descriptions-item>
                <a-descriptions-item label="经手人">{{
                  record.handler || '—'
                }}</a-descriptions-item>
                <a-descriptions-item label="创建人">{{
                  record.creator || '—'
                }}</a-descriptions-item>
                <a-descriptions-item label="创建时间">{{
                  record.createdAt || '—'
                }}</a-descriptions-item>
                <a-descriptions-item label="确认人">{{
                  record.confirmer || '—'
                }}</a-descriptions-item>
                <a-descriptions-item label="确认时间">{{
                  record.confirmedAt || '—'
                }}</a-descriptions-item>
                <a-descriptions-item label="审批人">{{
                  record.approver || '—'
                }}</a-descriptions-item>
                <a-descriptions-item label="审批时间">{{
                  record.approvedAt || '—'
                }}</a-descriptions-item>
                <a-descriptions-item label="备注" :span="3">{{
                  record.remark || '—'
                }}</a-descriptions-item>
              </a-descriptions>
            </div>

            <div class="section-card">
              <div class="section-title">入库明细</div>
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
                  <template v-if="column.key === 'stockUnitQty'">
                    <span class="col-title-with-tip">
                      库存单位量
                      <a-tooltip :title="STOCK_UNIT_QTY_TIP">
                        <InfoCircleOutlined class="col-tip-icon" />
                      </a-tooltip>
                    </span>
                  </template>
                  <template v-else>{{ column.title }}</template>
                </template>
                <template #bodyCell="{ column, record: line, index }">
                  <template v-if="column.key === 'index'">{{ index + 1 }}</template>
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
                    {{ formatQty(getInboundQtyValue(line)) }}
                  </template>
                  <template v-else-if="column.key === 'unit'">
                    {{ resolveInboundQtyUnit(line) || '—' }}
                  </template>
                  <template v-else-if="column.key === 'stockUnitQty'">
                    {{ formatQty(getStockUnitQtyValue(line)) }}
                  </template>
                  <template v-else-if="column.key === 'stockUnit'">
                    {{ resolveInboundStockUnit(line) || '—' }}
                  </template>
                  <template v-else-if="column.key === 'lineSource'">
                    {{ line.lineSource || '—' }}
                  </template>
                  <template v-else-if="column.key === 'locationNo'">
                    {{ line.locationNo || '—' }}
                  </template>
                  <template v-else-if="column.key === 'sourceDocNo'">
                    {{ line.sourceDocNo || '—' }}
                  </template>
                  <template v-else-if="column.key === 'unitPrice'">
                    {{ line.unitPrice != null && line.unitPrice !== '' ? line.unitPrice : '—' }}
                  </template>
                  <template v-else-if="column.key === 'totalPrice'">
                    {{ line.totalPrice != null && line.totalPrice !== '' ? line.totalPrice : '—' }}
                  </template>
                  <template v-else>
                    {{ (column.dataIndex && line[column.dataIndex]) || '—' }}
                  </template>
                </template>
              </a-table>
            </div>
          </template>

          <template v-else-if="activeTab === 'batches'">
            <div class="section-card">
              <div class="section-title">批次详情</div>
              <a-table
                :columns="batchColumns"
                :data-source="batchList"
                row-key="id"
                size="small"
                bordered
                :pagination="batchList.length > 10 ? { pageSize: 10 } : false"
                :scroll="{ x: 960 }"
                :expandable="batchExpandable"
              >
                <template #bodyCell="{ column, record: batch }">
                  <template v-if="column.key === 'currentLength'">
                    {{ formatQty(batch.currentLength) }}
                    <span class="unit-suffix">{{ batch.unit || '' }}</span>
                    <span v-if="batch.attrs?.manageByPiece" class="piece-hint">
                      （{{ piecesOfBatch(batch.id).length }} 件）
                    </span>
                  </template>
                  <template v-else-if="column.key === 'status'">
                    <a-tag :color="batch.status === '在库' ? 'success' : 'default'">{{
                      batch.status || '—'
                    }}</a-tag>
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
                  <span v-else class="empty-inline">非一物一码批次</span>
                </template>
                <template #emptyText>
                  <a-empty
                    :image="false"
                    :description="
                      record.status === '已完成'
                        ? '暂无批次记录'
                        : '确认入库后生成库存批次；一物一码为 1 父批 + N 件码'
                    "
                  />
                </template>
              </a-table>
            </div>
          </template>
        </div>
      </template>
      <a-empty v-else-if="!loading" description="未找到该入库单" />
    </a-spin>
  </div>
</template>

<script>
import { formatQty } from '@/utils/numberFormat'
export default { name: 'InboundOrderDetailView' }
</script>

<script setup>
import { computed, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useTabs } from '@/composables/useTabs'
import { openCreateTab } from '@/utils/openCreateTab'
import { Modal, message } from 'ant-design-vue'
import {
  getInboundOrderById,
  approveInboundOrder,
  rejectInboundOrder,
  confirmInboundOrders,
  deleteInboundOrder,
} from '@/store/inboundOrderStore'
import { stockBatchState } from '@/store/stockBatchStore'
import { listStockPieces, stockPieceState } from '@/store/stockPieceStore'
import { resolveInboundSourceRoute } from '@/utils/inboundSourceLink'
import { inboundDetailLineColumns, STOCK_UNIT_QTY_TIP } from '@/utils/inboundLineColumns'
import {
  enrichInboundLine,
  getInboundQtyValue,
  getStockUnitQtyValue,
  resolveInboundQtyUnit,
  resolveInboundStockUnit,
} from '@/utils/inboundLineHelpers'
import { InfoCircleOutlined } from '@ant-design/icons-vue'

const route = useRoute()
const router = useRouter()
const { openTab } = useTabs()
const loading = ref(false)
const record = ref(null)
const activeTab = ref('basic')

const lineColumns = inboundDetailLineColumns
const lineScrollX = computed(() => lineColumns.reduce((s, c) => s + (c.width || 80), 0))

const batchColumns = [
  { title: '批次号', dataIndex: 'batchNo', key: 'batchNo', width: 130 },
  { title: '物品编码', dataIndex: 'itemCode', key: 'itemCode', width: 120, ellipsis: true },
  { title: '物品名称', dataIndex: 'itemName', key: 'itemName', width: 140, ellipsis: true },
  { title: '仓库', dataIndex: 'warehouse', key: 'warehouse', width: 100 },
  { title: '数量', key: 'currentLength', width: 140 },
  { title: '状态', key: 'status', width: 88 },
  { title: '来源类型', dataIndex: 'sourceType', key: 'sourceType', width: 100 },
  { title: '来源单号', dataIndex: 'sourceDocNo', key: 'sourceDocNo', width: 140 },
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

const batchExpandable = computed(() => ({
  defaultExpandAllRows: batchList.value.some((b) => b.attrs?.manageByPiece),
  rowExpandable: (batch) => Boolean(batch.attrs?.manageByPiece),
}))

function piecesOfBatch(batchId) {
  // 依赖 stockPieceState 以触发响应式刷新
  void stockPieceState.pieces.length
  return listStockPieces({ batchId })
}

function reload() {
  const row = getInboundOrderById(route.params.id)
  record.value = row
    ? {
        ...row,
        lineItems: (row.lineItems || []).map((l) => enrichInboundLine({ ...l })),
      }
    : null
}

function statusColor(status) {
  if (status === '已完成') return 'success'
  if (status === '已拒绝') return 'error'
  if (status === '待审批') return 'warning'
  return 'processing'
}

watch(
  () => route.params.id,
  () => {
    loading.value = true
    activeTab.value = 'basic'
    reload()
    loading.value = false
  },
  { immediate: true },
)

function goBack() {
  router.push('/inventory/inbound')
}

function goSource() {
  const r = resolveInboundSourceRoute(record.value)
  if (r?.path) router.push(r.path)
}

function openEdit() {
  if (!record.value?.id) return
  openCreateTab(router, openTab, {
    path: `/inventory/inbound/${record.value.id}/edit`,
    title: `编辑入库单 ${record.value.docNo || ''}`.trim(),
  })
}

function handleApprovePass() {
  Modal.confirm({
    title: `通过审批 ${record.value.docNo}？`,
    content: '通过后状态变为「待处理」，可进行确认入库。',
    onOk: () => {
      const res = approveInboundOrder(record.value.id)
      if (res.ok) {
        message.success('审批已通过')
        reload()
      } else message.warning(res.message)
    },
  })
}

function handleApproveReject() {
  Modal.confirm({
    title: `拒绝入库单 ${record.value.docNo}？`,
    okType: 'danger',
    onOk: () => {
      const res = rejectInboundOrder(record.value.id)
      if (res.ok) {
        message.success('已拒绝')
        reload()
      } else message.warning(res.message)
    },
  })
}

function handleConfirmInbound() {
  Modal.confirm({
    title: `确认入库 ${record.value.docNo}？`,
    onOk: () => {
      const { count, blocked } = confirmInboundOrders([record.value.id])
      if (blocked.length) {
        message.warning(blocked.map((b) => b.message).join('；'))
        return
      }
      if (count > 0) {
        message.success('已确认入库')
        reload()
        activeTab.value = 'batches'
      } else {
        message.warning('确认入库失败')
      }
    },
  })
}

function handleDelete() {
  Modal.confirm({
    title: `确认删除入库单 ${record.value.docNo}？`,
    okType: 'danger',
    onOk: () => {
      if (deleteInboundOrder(record.value.id)) {
        message.success('已删除')
        goBack()
      } else {
        message.warning('当前状态不可删除')
      }
    },
  })
}
</script>

<style lang="less" scoped>
.inbound-detail-page {
  .page-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 10px 12px;
    background: #fff;
  }

  .header-left {
    display: flex;
    align-items: center;
    gap: 12px;
    min-width: 0;
  }

  .page-title {
    font-size: 16px;
    font-weight: 600;
    color: rgba(0, 0, 0, 0.88);
  }

  .sub-type {
    color: #8c8c8c;
  }

  .detail-tabs {
    background: #fff;
    padding: 0 12px;
    margin: 0;
  }

  .tab-body {
    padding: 8px 12px 16px;
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
    margin-bottom: 12px;
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
    cursor: help;
  }

  .unit-suffix {
    margin-left: 4px;
    color: rgba(0, 0, 0, 0.45);
    font-size: 12px;
  }

  .piece-hint {
    margin-left: 4px;
    color: #1677ff;
    font-size: 12px;
  }

  .empty-inline {
    color: rgba(0, 0, 0, 0.45);
    font-size: 12px;
  }
}
</style>
