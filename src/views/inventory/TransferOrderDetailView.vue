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
          <a-space>
            <a-button
              v-if="canConfirmTransfer(record)"
              type="primary"
              size="small"
              @click="handleConfirm"
            >
              确认
            </a-button>
            <a-button v-if="canRefuseTransfer(record)" size="small" danger @click="openRefuse">
              拒绝
            </a-button>
            <a-button v-if="canEditTransfer(record)" size="small" @click="openEdit">编辑</a-button>
            <a-button size="small" @click="goBack">返回</a-button>
          </a-space>
        </div>

        <DetailSectionCard title="基本信息">
          <a-descriptions :column="3" size="small">
            <a-descriptions-item label="调出仓库">{{ record.fromWarehouse }}</a-descriptions-item>
            <a-descriptions-item label="调入仓库">{{ record.toWarehouse }}</a-descriptions-item>
            <a-descriptions-item label="调拨日期">{{ record.transferDate }}</a-descriptions-item>
            <a-descriptions-item label="申请人">{{ record.applicant || '—' }}</a-descriptions-item>
            <a-descriptions-item label="创建人">{{ record.creator || '—' }}</a-descriptions-item>
            <a-descriptions-item label="创建时间">{{
              record.createdAt || '—'
            }}</a-descriptions-item>
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

        <DetailSectionCard title="调拨明细">
          <a-table
            :columns="lineColumns"
            :data-source="record.lineItems || []"
            row-key="id"
            size="small"
            bordered
            :pagination="false"
          >
            <template #bodyCell="{ column, record: line, index }">
              <template v-if="column.key === 'index'">{{ index + 1 }}</template>
              <template v-else-if="column.key === 'lineStatus'">
                <a-tag :color="transferStatusColor(line.lineStatus)">
                  {{ line.lineStatus || '待确认' }}
                </a-tag>
              </template>
              <template v-else-if="column.key === 'batch'">
                {{ line.batchNo || line.salesOrderNo || '自由备货' }}
              </template>
              <template v-else-if="column.key === 'action'">
                <a-space :size="4">
                  <a
                    v-if="(line.lineStatus || '待确认') === '待确认'"
                    @click="handleConfirmLine(line)"
                  >
                    确认
                  </a>
                  <a
                    v-if="canRefuseTransferLine(record, line)"
                    class="danger"
                    @click="handleRefuseLine(line)"
                  >
                    拒绝
                  </a>
                </a-space>
              </template>
            </template>
          </a-table>
        </DetailSectionCard>
      </template>
      <a-empty v-else description="未找到调拨单" />
    </a-spin>

    <InventoryDocRefuseModal
      v-model:open="refuseModalOpen"
      doc-label="调拨"
      :doc-nos="[record?.docNo].filter(Boolean)"
      @confirm="onRefuseConfirm"
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
import { transferStatusColor, transferSourceLabel } from '@/mock/transferOptions'
import {
  transferOrderState,
  getTransferOrderById,
  canEditTransfer,
  canConfirmTransfer,
  canRefuseTransfer,
  canRefuseTransferLine,
  confirmTransfer,
  confirmTransferLine,
  refuseTransfer,
  refuseTransferLine,
} from '@/store/transferOrderStore'
import InventoryDocRefuseModal from './components/InventoryDocRefuseModal.vue'

defineOptions({ name: 'TransferOrderDetailView' })

const route = useRoute()
const router = useRouter()
const { openTab } = useTabs()
const refuseModalOpen = ref(false)

const record = computed(() => {
  void transferOrderState.orders
  return getTransferOrderById(route.params.id)
})

const lineColumns = [
  { title: '#', key: 'index', width: 48 },
  { title: '状态', key: 'lineStatus', width: 90 },
  { title: '物品编码', dataIndex: 'itemCode', width: 120 },
  { title: '物品名称', dataIndex: 'itemName', width: 140 },
  { title: '数量', dataIndex: 'qty', width: 90 },
  { title: '单位', dataIndex: 'unit', width: 64 },
  { title: '批次/归属', key: 'batch', width: 140 },
  { title: '操作', key: 'action', width: 120 },
]

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
    onOk: () => {
      const { count, blocked } = confirmTransfer([record.value.id])
      if (blocked?.length) message.warning(blocked.map((b) => b.message).join('；'))
      if (count) message.success('已确认')
    },
  })
}

function handleConfirmLine(line) {
  const res = confirmTransferLine(record.value.id, line.id)
  if (!res.ok) message.warning(res.message)
  else message.success('明细已确认')
}

function openRefuse() {
  refuseModalOpen.value = true
}

function onRefuseConfirm(reason) {
  const { count, blocked } = refuseTransfer([record.value.id], { reason })
  if (blocked?.length) message.warning(blocked.map((b) => b.message).join('；'))
  if (count) {
    message.success('已拒绝')
    refuseModalOpen.value = false
  }
}

function handleRefuseLine(line) {
  Modal.confirm({
    title: `拒绝明细 ${line.itemCode}？`,
    content: '请在下一框填写理由（演示：使用默认理由）',
    onOk: () => {
      const res = refuseTransferLine(record.value.id, line.id, { reason: '明细拒绝' })
      if (!res.ok) message.warning(res.message)
      else message.success('明细已拒绝')
    },
  })
}
</script>

<style lang="less" scoped>
.detail-page {
  padding: 12px 16px 24px;
}
.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
}
.page-title {
  font-size: 18px;
  font-weight: 600;
  margin-right: 8px;
}
.sub {
  margin-left: 8px;
  color: rgba(0, 0, 0, 0.45);
}
.danger {
  color: #ff4d4f;
}
</style>
