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
    </div>

    <div class="detail-action-bar">
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
        <a-button v-if="canEditOutbound(record)" size="small" @click="emit('edit')">
          编辑
        </a-button>
        <a-button v-if="canDeleteOutbound(record)" size="small" danger @click="emit('delete')">
          删除
        </a-button>
        <a-button v-if="canInitiateFactoryQc(record)" size="small" @click="emit('initiate-qc')">
          {{ initiateQcLabel }}
        </a-button>
      </a-space>
    </div>

    <div class="detail-body">
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

      <div class="section-card">
        <div class="section-title">出库明细</div>
        <a-table
          :columns="lineColumns"
          :data-source="record.lineItems || []"
          row-key="id"
          size="small"
          bordered
          :pagination="false"
          :scroll="{ x: 720 }"
        >
          <template #bodyCell="{ column, record: line, index }">
            <template v-if="column.key === 'index'">{{ index + 1 }}</template>
            <template v-else-if="column.key === 'lineStatus'">
              <a-tag :color="(line.lineStatus || '待出库') === '已出库' ? 'success' : 'processing'">
                {{ line.lineStatus || '待出库' }}
              </a-tag>
            </template>
            <template v-else-if="column.key === 'shipQty'">
              {{ formatQty(line.shipQty) }}
            </template>
          </template>
        </a-table>
      </div>
    </div>
  </div>
  <div v-else class="detail-empty-inner">
    <a-empty description="请选择左侧出库单" />
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { formatQty } from '@/utils/numberFormat'
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
import OutboundOrderBasicInfoSection from './OutboundOrderBasicInfoSection.vue'

const props = defineProps({
  orderId: { type: String, default: '' },
})

const emit = defineEmits([
  'approve',
  'confirm',
  'refuse',
  'edit',
  'delete',
  'initiate-qc',
  'open-full',
])

const record = computed(() => {
  void outboundState.orders
  if (!props.orderId) return null
  return getOutboundOrderById(props.orderId)
})

const isMaterialReqOutbound = computed(() => record.value?.outboundType === '领料出库')

const canConfirm = computed(() => record.value && validateOutboundForConfirm(record.value).ok)

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

const lineColumns = [
  { title: '#', key: 'index', width: 48, align: 'center' },
  { title: '状态', key: 'lineStatus', width: 88 },
  { title: '编号', dataIndex: 'itemCode', width: 120, ellipsis: true },
  { title: '名称', dataIndex: 'itemName', width: 140, ellipsis: true },
  { title: '出库数量', key: 'shipQty', width: 100, align: 'right' },
  { title: '出库仓库', dataIndex: 'shipWarehouse', width: 100 },
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
}

.detail-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  padding: 10px 14px 6px;
  border-bottom: 1px solid #f0f0f0;
}

.header-main {
  min-width: 0;
}

.detail-title {
  display: flex;
  align-items: baseline;
  gap: 10px;
  margin-bottom: 6px;

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
  padding: 8px 14px;
  border-bottom: 1px solid #f0f0f0;
}

.detail-body {
  flex: 1;
  overflow: auto;
  padding: 10px 12px 16px;
}

.section-card {
  margin-bottom: 12px;
}

.section-title {
  font-size: 13px;
  font-weight: 600;
  margin-bottom: 8px;
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
</style>
