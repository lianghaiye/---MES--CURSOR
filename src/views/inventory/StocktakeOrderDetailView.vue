<template>
  <div class="detail-page">
    <a-spin :spinning="!record">
      <template v-if="record">
        <div class="page-header">
          <div class="header-left">
            <span class="page-title">{{ record.docNo }}</span>
            <a-tag :color="stocktakeStatusColor(record.status)">{{ record.status }}</a-tag>
            <span class="sub">{{ stocktakeSourceLabel(record.sourceChannel) }}</span>
          </div>
          <a-space>
            <a-button
              v-if="canConfirmStocktake(record)"
              type="primary"
              size="small"
              @click="handleConfirm"
            >
              确认
            </a-button>
            <a-button v-if="canRefuseStocktake(record)" size="small" danger @click="openRefuse">
              拒绝
            </a-button>
            <a-button v-if="canEditStocktake(record)" size="small" @click="openEdit">编辑</a-button>
            <a-button size="small" @click="goBack">返回</a-button>
          </a-space>
        </div>

        <DetailSectionCard title="基本信息">
          <a-descriptions :column="3" size="small">
            <a-descriptions-item label="盘点仓库">{{ record.warehouse }}</a-descriptions-item>
            <a-descriptions-item label="盘点日期">{{ record.stocktakeDate }}</a-descriptions-item>
            <a-descriptions-item label="申请人">{{ record.applicant || '—' }}</a-descriptions-item>
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

        <DetailSectionCard title="盘点明细">
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
                <a-tag :color="stocktakeStatusColor(line.lineStatus)">
                  {{ line.lineStatus || '待确认' }}
                </a-tag>
              </template>
              <template v-else-if="column.key === 'diffQty'">
                <span :class="{ pos: line.diffQty > 0, neg: line.diffQty < 0 }">{{
                  line.diffQty
                }}</span>
              </template>
              <template v-else-if="column.key === 'action'">
                <a
                  v-if="(line.lineStatus || '待确认') === '待确认'"
                  @click="handleConfirmLine(line)"
                >
                  确认
                </a>
              </template>
            </template>
          </a-table>
        </DetailSectionCard>
      </template>
      <a-empty v-else description="未找到盘点单" />
    </a-spin>

    <InventoryDocRefuseModal
      v-model:open="refuseModalOpen"
      doc-label="盘点"
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
import { stocktakeStatusColor, stocktakeSourceLabel } from '@/mock/stocktakeOptions'
import {
  stocktakeOrderState,
  getStocktakeOrderById,
  canEditStocktake,
  canConfirmStocktake,
  canRefuseStocktake,
  confirmStocktake,
  confirmStocktakeLine,
  refuseStocktake,
} from '@/store/stocktakeOrderStore'
import InventoryDocRefuseModal from './components/InventoryDocRefuseModal.vue'

defineOptions({ name: 'StocktakeOrderDetailView' })

const route = useRoute()
const router = useRouter()
const { openTab } = useTabs()
const refuseModalOpen = ref(false)

const record = computed(() => {
  void stocktakeOrderState.orders
  return getStocktakeOrderById(route.params.id)
})

const lineColumns = [
  { title: '#', key: 'index', width: 48 },
  { title: '状态', key: 'lineStatus', width: 90 },
  { title: '物品编码', dataIndex: 'itemCode', width: 120 },
  { title: '物品名称', dataIndex: 'itemName', width: 140 },
  { title: '账面', dataIndex: 'bookQty', width: 88 },
  { title: '实盘', dataIndex: 'actualQty', width: 88 },
  { title: '差异', key: 'diffQty', width: 88 },
  { title: '单位', dataIndex: 'unit', width: 64 },
  { title: '操作', key: 'action', width: 80 },
]

function goBack() {
  router.push('/inventory/stocktake')
}

function openEdit() {
  if (!record.value) return
  openCreateTab(router, openTab, {
    path: `/inventory/stocktake/${record.value.id}/edit`,
    title: `编辑盘点单 ${record.value.docNo || ''}`.trim(),
  })
}

function handleConfirm() {
  Modal.confirm({
    title: `确认盘点 ${record.value.docNo}？`,
    onOk: () => {
      const { count, blocked } = confirmStocktake([record.value.id])
      if (blocked?.length) message.warning(blocked.map((b) => b.message).join('；'))
      if (count) message.success('已确认')
    },
  })
}

function handleConfirmLine(line) {
  const res = confirmStocktakeLine(record.value.id, line.id)
  if (!res.ok) message.warning(res.message)
  else message.success('明细已确认')
}

function openRefuse() {
  refuseModalOpen.value = true
}

function onRefuseConfirm(reason) {
  const { count, blocked } = refuseStocktake([record.value.id], { reason })
  if (blocked?.length) message.warning(blocked.map((b) => b.message).join('；'))
  if (count) {
    message.success('已拒绝')
    refuseModalOpen.value = false
  }
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
.pos {
  color: #52c41a;
}
.neg {
  color: #ff4d4f;
}
</style>
