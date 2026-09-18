<template>
  <div class="detail-page">
    <a-spin :spinning="!record">
      <template v-if="record">
        <div class="page-header">
          <div class="header-left">
            <span class="page-title">{{ record.docNo }}</span>
            <a-tag :color="transferStatusColor(record.status)">{{ record.status }}</a-tag>
            <span class="sub">{{ transferSourceLabel(record.sourceChannel) }}</span>
          </div>
          <a-space :size="12">
            <a-button
              v-if="canConfirmTransfer(record)"
              type="primary"
              size="small"
              @click="handleConfirm"
            >
              确认调拨
            </a-button>
            <a-button v-if="canVoidTransfer(record)" size="small" danger @click="openVoid">
              作废
            </a-button>
            <a-button v-if="canEditTransfer(record)" size="small" @click="openEdit">编辑</a-button>
            <a-button size="small" @click="goBack">返回</a-button>
          </a-space>
        </div>

        <div class="detail-body">
          <DetailSectionCard title="基本信息">
            <a-descriptions :column="3" size="small">
              <a-descriptions-item label="调出仓库">{{ record.fromWarehouse }}</a-descriptions-item>
              <a-descriptions-item label="调入仓库">{{ record.toWarehouse }}</a-descriptions-item>
              <a-descriptions-item label="调拨日期">{{ record.transferDate }}</a-descriptions-item>
              <a-descriptions-item label="申请人">{{
                record.applicant || '—'
              }}</a-descriptions-item>
              <a-descriptions-item label="创建人">{{ record.creator || '—' }}</a-descriptions-item>
              <a-descriptions-item label="创建时间">{{
                record.createdAt || '—'
              }}</a-descriptions-item>
              <a-descriptions-item label="调拨数量">
                {{ formatTransferQtyRatio(record) }}
              </a-descriptions-item>
              <a-descriptions-item label="联动出库">
                {{ (record.linkedOutboundDocNos || []).join('、') || '—' }}
              </a-descriptions-item>
              <a-descriptions-item label="联动入库">
                {{ (record.linkedInboundDocNos || []).join('、') || '—' }}
              </a-descriptions-item>
              <a-descriptions-item label="备注" :span="3">{{
                record.remark || '—'
              }}</a-descriptions-item>
            </a-descriptions>
          </DetailSectionCard>

          <DetailSectionCard title="调拨清单">
            <a-table
              :columns="displayColumns"
              :data-source="displayLines"
              row-key="id"
              size="small"
              bordered
              :pagination="false"
              :scroll="{ x: 1280 }"
            >
              <template #bodyCell="{ column, record: line, index }">
                <template v-if="column.key === 'index'">{{ index + 1 }}</template>
                <template v-else-if="column.key === 'ownership'">
                  <a-tag :color="isDedicatedLine(line) ? 'orange' : 'blue'">
                    {{ isDedicatedLine(line) ? '按单' : '自由' }}
                  </a-tag>
                </template>
                <template v-else-if="column.key === 'stockQty'">
                  {{ formatStockQty(line) }}
                </template>
                <template v-else-if="column.key === 'qty'">
                  {{ formatQtyWithUnit(line.qty, line.unit) }}
                </template>
                <template v-else-if="column.key === 'salesOrderNo'">
                  {{ isDedicatedLine(line) ? line.salesOrderNo || '—' : '—' }}
                </template>
                <template v-else>
                  {{ displayCell(line[column.dataIndex]) }}
                </template>
              </template>
            </a-table>
          </DetailSectionCard>
        </div>
      </template>
      <a-empty v-else description="未找到调拨单" />
    </a-spin>

    <InventoryDocRefuseModal
      v-model:open="voidModalOpen"
      action-type="void"
      doc-label="调拨"
      :doc-nos="[record?.docNo].filter(Boolean)"
      @confirm="onVoidConfirm"
    />
  </div>
</template>

<script setup>
import { computed, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { Modal, message } from 'ant-design-vue'
import DetailSectionCard from '@/components/DetailSectionCard.vue'
import { useTabs } from '@/composables/useTabs'
import { openCreateTab } from '@/utils/openCreateTab'
import {
  transferStatusColor,
  transferSourceLabel,
  formatTransferQtyRatio,
} from '@/mock/transferOptions'
import {
  transferOrderState,
  getTransferOrderById,
  canEditTransfer,
  canConfirmTransfer,
  canVoidTransfer,
  confirmTransfer,
  voidTransfer,
} from '@/store/transferOrderStore'
import InventoryDocRefuseModal from './components/InventoryDocRefuseModal.vue'
import {
  isDedicatedInventoryLine,
  sortInventoryLinesByItemCode,
  buildItemCodeRowSpans,
  withProductMergeColumns,
} from '@/utils/inventoryLineMerge'

defineOptions({ name: 'TransferOrderDetailView' })

const route = useRoute()
const router = useRouter()
const { openTab } = useTabs()
const voidModalOpen = ref(false)

const record = computed(() => {
  void transferOrderState.orders
  return getTransferOrderById(route.params.id)
})

/** 与新增调拨单「调拨清单」字段对齐 */
const lineColumns = [
  { title: '序号', key: 'index', width: 56, align: 'center', fixed: 'left' },
  { title: '归属', key: 'ownership', width: 72, align: 'center' },
  { title: '产品名称', key: 'itemName', dataIndex: 'itemName', width: 140, ellipsis: true },
  { title: '编码', key: 'itemCode', dataIndex: 'itemCode', width: 130, ellipsis: true },
  { title: '规格型号', key: 'specModel', dataIndex: 'specModel', width: 110, ellipsis: true },
  { title: '材质', key: 'material', dataIndex: 'material', width: 80, ellipsis: true },
  {
    title: '变体属性',
    key: 'variantSummary',
    dataIndex: 'variantSummary',
    width: 120,
    ellipsis: true,
  },
  { title: '当前库存数量', key: 'stockQty', width: 120, align: 'right' },
  { title: '调拨数量', key: 'qty', width: 120, align: 'right' },
  { title: '销售单号', key: 'salesOrderNo', width: 140, ellipsis: true },
]

const displayLines = computed(() => sortInventoryLinesByItemCode(record.value?.lineItems || []))
const lineRowSpans = computed(() => buildItemCodeRowSpans(displayLines.value))
const displayColumns = computed(() => withProductMergeColumns(lineColumns, lineRowSpans.value))

function isDedicatedLine(line) {
  return isDedicatedInventoryLine(line)
}

function displayCell(val) {
  const t = String(val ?? '').trim()
  return t || '—'
}

function formatQtyWithUnit(qty, unit) {
  if (qty == null || qty === '') return '—'
  const n = Number(qty)
  const q = Number.isFinite(n) ? n : qty
  const u = String(unit || '').trim()
  return u ? `${q} ${u}` : String(q)
}

function formatStockQty(line) {
  const qty = line?.bookQty
  if (qty == null || qty === '') return formatQtyWithUnit(line?.qty, line?.unit)
  return formatQtyWithUnit(qty, line?.unit)
}

function goBack() {
  router.push('/inventory/transfer')
}

function openEdit() {
  if (!record.value) return
  openCreateTab(router, openTab, {
    path: `/inventory/transfer/${record.value.id}/edit`,
    title: `编辑调拨单 ${record.value.docNo || ''}`.trim(),
  })
}

function handleConfirm() {
  Modal.confirm({
    title: `确认调拨 ${record.value.docNo}？`,
    content: '将软锁定调出仓库存并生成调拨出库；按配置决定是否需入库方签收。',
    okText: '确认',
    cancelText: '取消',
    onOk: () => {
      const { count, blocked } = confirmTransfer([record.value.id])
      if (blocked?.length) message.warning(blocked.map((b) => b.message).join('；'))
      if (count) message.success('已确认调拨')
    },
  })
}

function openVoid() {
  voidModalOpen.value = true
}

function onVoidConfirm(reason) {
  const { count, blocked } = voidTransfer([record.value.id], { reason })
  if (blocked?.length) message.warning(blocked.map((b) => b.message).join('；'))
  if (count) {
    message.success('已作废')
    voidModalOpen.value = false
  }
}
</script>

<style lang="less" scoped>
.detail-page {
  margin: -12px;
  padding: 12px 0 24px;
  background: #f5f6f8;
  min-height: calc(100vh - 112px);
  box-sizing: border-box;
}

.page-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 16px;
  background: #fff;
  border: 1px solid #f0f0f0;
  border-top: none;
  border-radius: 0;
  margin-bottom: 12px;
  position: sticky;
  top: 0;
  z-index: 30;
}

.header-left {
  display: flex;
  align-items: center;
  gap: 8px;
  min-width: 0;
}

.page-title {
  font-size: 16px;
  font-weight: 600;
  color: rgba(0, 0, 0, 0.88);
}

.sub {
  color: rgba(0, 0, 0, 0.45);
  font-size: 13px;
}

.detail-body {
  padding: 0 12px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}
</style>
