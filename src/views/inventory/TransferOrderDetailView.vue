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
              确认出库
            </a-button>
            <a-button v-if="canVoidTransfer(record)" size="small" danger @click="openVoid">
              作废
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
            </template>
          </a-table>
        </DetailSectionCard>
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

defineOptions({ name: 'TransferOrderDetailView' })

const route = useRoute()
const router = useRouter()
const { openTab } = useTabs()
const voidModalOpen = ref(false)

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
    title: `确认出库 ${record.value.docNo}？`,
    content: '将软锁定调出仓库存并生成调拨出库；按配置决定是否需入库方签收。',
    onOk: () => {
      const { count, blocked } = confirmTransfer([record.value.id])
      if (blocked?.length) message.warning(blocked.map((b) => b.message).join('；'))
      if (count) message.success('已确认出库')
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
  padding: 0 0 24px;
}
.page-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 12px;
}
.header-left {
  display: flex;
  align-items: center;
  gap: 8px;
}
.page-title {
  font-size: 16px;
  font-weight: 600;
}
.sub {
  color: rgba(0, 0, 0, 0.45);
  font-size: 13px;
}
</style>
