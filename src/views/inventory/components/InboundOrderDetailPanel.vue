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
    </div>

    <div v-if="hasActions" class="detail-action-bar">
      <a-space :size="8" wrap>
        <a-button
          v-if="canConfirmInbound(record)"
          type="primary"
          size="small"
          @click="emit('confirm')"
        >
          确认入库
        </a-button>
        <a-button v-if="canEditInbound(record)" size="small" @click="emit('edit')">编辑</a-button>
        <template v-if="canApproveInbound(record)">
          <a-button type="primary" size="small" @click="emit('approve-pass')">通过</a-button>
          <a-button size="small" danger @click="emit('approve-reject')">拒绝</a-button>
        </template>
        <a-button v-if="canDeleteInbound(record)" size="small" danger @click="emit('delete')">
          删除
        </a-button>
      </a-space>
    </div>

    <a-tabs v-model:activeKey="activeTab" class="detail-tabs detail-tabs-pill">
      <a-tab-pane key="basic" tab="基本信息">
        <div class="tab-scroll-body">
          <div class="section-card">
            <div class="section-title">基本信息</div>
            <InboundOrderBasicInfoSection :record="record">
              <template #sourceOrderNo>
                <span>{{ record.sourceOrderNo || '—' }}</span>
              </template>
            </InboundOrderBasicInfoSection>
          </div>

          <div class="section-card">
            <div class="section-title">入库明细</div>
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
                  <a-tag
                    :color="(line.lineStatus || '待入库') === '已入库' ? 'success' : 'processing'"
                  >
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
          </div>
        </div>
      </a-tab-pane>
    </a-tabs>
  </div>
  <div v-else class="detail-empty-inner">
    <a-empty description="请选择左侧入库单" />
  </div>
</template>

<script setup>
import { computed, ref, watch } from 'vue'
import { formatQty, formatQtyWithUnit } from '@/utils/numberFormat'
import {
  inboundOrderState,
  getInboundOrderById,
  canConfirmInbound,
  canEditInbound,
  canDeleteInbound,
  canApproveInbound,
} from '@/store/inboundOrderStore'
import { inboundDetailLineColumns } from '@/utils/inboundLineColumns'
import {
  enrichInboundLine,
  getInboundQtyValue,
  getStockUnitQtyValue,
  resolveInboundQtyUnit,
  resolveInboundStockUnit,
} from '@/utils/inboundLineHelpers'
import { hasSettleUnit } from '@/utils/settleUnit'
import InboundOrderBasicInfoSection from './InboundOrderBasicInfoSection.vue'

const props = defineProps({
  orderId: { type: String, default: '' },
  detailTab: { type: String, default: '' },
})

const emit = defineEmits([
  'update:detailTab',
  'confirm',
  'edit',
  'delete',
  'approve-pass',
  'approve-reject',
  'open-full',
])

const internalTab = ref('basic')

const record = computed(() => {
  void inboundOrderState.orders
  if (!props.orderId) return null
  return getInboundOrderById(props.orderId)
})

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
  () => record.value?.id,
  () => {
    if (!record.value) return
    activeTab.value = 'basic'
  },
)

const lineItems = computed(() =>
  (record.value?.lineItems || []).map((l) => enrichInboundLine({ ...l })),
)

const lineColumns = inboundDetailLineColumns
const lineScrollX = computed(() => lineColumns.reduce((s, c) => s + (c.width || 80), 0))

const hasActions = computed(() => {
  const r = record.value
  if (!r) return false
  return canConfirmInbound(r) || canEditInbound(r) || canDeleteInbound(r) || canApproveInbound(r)
})

function statusColor(status) {
  if (status === '已完成') return 'success'
  if (status === '已拒绝') return 'error'
  if (status === '待审批') return 'warning'
  if (status === '部分入库') return 'warning'
  if (status === '待处理') return 'processing'
  return 'default'
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
  gap: 12px;
  margin-bottom: 10px;
  padding: 0;
  border-bottom: none;
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
    font-size: 16px;
    font-weight: 600;
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

.tab-scroll-body {
  height: 100%;
  min-height: 0;
  overflow: auto;
  padding-bottom: 8px;
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

.unit-suffix {
  margin-left: 2px;
  color: rgba(0, 0, 0, 0.45);
  font-size: 12px;
}
</style>
