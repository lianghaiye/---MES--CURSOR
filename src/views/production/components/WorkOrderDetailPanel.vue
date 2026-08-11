<template>
  <div v-if="workOrder" class="detail-panel">
    <div class="detail-header">
      <div class="header-main">
        <div class="detail-title" :class="{ 'title-bold': variant === 'qc' }">
          <span class="code">{{ workOrder.code }}</span>
          <span class="name">{{ workOrder.name }}</span>
        </div>
        <a-space :size="6" class="header-tags">
          <a-tag :color="statusTagColor(workOrder.status)">
            {{ workOrder.orderCategory || '生产工单' }}
          </a-tag>
          <a-tag :color="statusTagColor(workOrder.status)">{{ workOrder.status }}</a-tag>
          <a-tag v-if="workOrder.taskStatus && workOrder.taskStatus !== '正常'">
            {{ workOrder.taskStatus }}
          </a-tag>
          <a-tag v-if="workOrder.urgency && workOrder.urgency !== '普通'" color="orange">
            {{ workOrder.urgency }}
          </a-tag>
        </a-space>
      </div>
      <a-space :size="4" class="header-actions">
        <a-button type="link" size="small" class="header-action-btn" @click="printModalOpen = true">
          <PrinterOutlined />
          打印
        </a-button>
        <a-button
          v-if="detailTab === 'dispatch' && showDispatchTab"
          type="link"
          class="collapse-btn"
          @click="detailCollapsed = !detailCollapsed"
        >
          {{ detailCollapsed ? '展开详情' : '收起详情' }}
          <UpOutlined v-if="!detailCollapsed" />
          <DownOutlined v-else />
        </a-button>
      </a-space>
    </div>

    <WorkOrderPrintModal v-model:open="printModalOpen" :work-order="workOrder" />

    <a-tabs v-model:activeKey="detailTab" class="detail-tabs">
      <a-tab-pane v-if="showDispatchTab" key="dispatch" tab="工单下发">
        <WorkOrderProductionSections
          v-show="!detailCollapsed"
          editable
          dispatch-mode
          :work-order="workOrder"
          :plan-date-value="planDateValue"
          :work-center-opts="workCenterOpts"
          :warehouse-opts="warehouseOpts"
          :urgency-opts="urgencyOpts"
          :process-route-opts="processRouteOpts"
          @update-field="onWorkOrderFieldUpdate"
          @change="emit('save-basic')"
          @plan-date-change="(dates) => emit('plan-date-change', dates)"
          @process-route-change="onProcessRouteChange"
        />

        <WorkOrderDispatchTab
          class="dispatch-process-section"
          :work-order="workOrder"
          @save="emit('save-dispatch')"
          @dispatch-and-start="emit('dispatch-and-start')"
          @cancel="emit('cancel-dispatch')"
        />
      </a-tab-pane>
      <a-tab-pane key="detail" tab="工单详情">
        <WorkOrderDetailTab :work-order="workOrder" @action="emit('detail-action', $event)" />
      </a-tab-pane>
      <template v-if="variant === 'production' || variant === 'assembly'">
        <a-tab-pane key="schedule" tab="排产信息">
          <WorkOrderScheduleInfoTab
            :work-order="workOrder"
            @action="emit('detail-action', $event)"
          />
        </a-tab-pane>
        <a-tab-pane key="material-req" tab="领料信息">
          <WorkOrderMaterialReqTab :work-order="workOrder" />
        </a-tab-pane>
        <a-tab-pane key="inbound" tab="入库信息">
          <WorkOrderInboundInfoTab :work-order="workOrder" />
        </a-tab-pane>
        <a-tab-pane key="qc-info" tab="质检信息">
          <WorkOrderQcInfoTab :work-order="workOrder" />
        </a-tab-pane>
        <a-tab-pane v-if="!hideBomRelatedTabs" key="ebom" tab="EBOM">
          <WorkOrderEbomTreeTab :work-order="workOrder" :variant="variant" />
        </a-tab-pane>
        <a-tab-pane
          v-if="variant === 'production' && !hideBomRelatedTabs"
          key="current-bom"
          tab="当前BOM"
        >
          <WorkOrderCurrentBomTab :work-order="workOrder" />
        </a-tab-pane>
        <a-tab-pane v-if="!hideBomRelatedTabs" key="bom-versions" tab="BOM版本">
          <WorkOrderBomVersionTab :work-order="workOrder" :variant="variant" />
        </a-tab-pane>
      </template>
    </a-tabs>
  </div>
</template>

<script setup>
import { computed, ref, watch } from 'vue'
import { DownOutlined, PrinterOutlined, UpOutlined } from '@ant-design/icons-vue'
import { workOrderState } from '@/store/workOrderStore'
import { qcWorkOrderState } from '@/store/qcWorkOrderStore'
import { assemblyWorkOrderState } from '@/store/assemblyWorkOrderStore'
import { productInfoState } from '@/store/productInfoStore'
import { materialInfoState } from '@/store/materialInfoStore'
import { processRouteState } from '@/store/processRouteStore'
import { buildProcessesFromRoute } from '@/mock/processRoutes'
import {
  ensureWorkOrderProcessRoute,
  getWorkOrderRouteSelectOptions,
} from '@/utils/workOrderProcessRoute'
import WorkOrderDispatchTab from './WorkOrderDispatchTab.vue'
import WorkOrderDetailTab from './WorkOrderDetailTab.vue'
import WorkOrderScheduleInfoTab from './WorkOrderScheduleInfoTab.vue'
import WorkOrderMaterialReqTab from './WorkOrderMaterialReqTab.vue'
import WorkOrderInboundInfoTab from './WorkOrderInboundInfoTab.vue'
import WorkOrderQcInfoTab from './WorkOrderQcInfoTab.vue'
import WorkOrderEbomTreeTab from './WorkOrderEbomTreeTab.vue'
import WorkOrderCurrentBomTab from './WorkOrderCurrentBomTab.vue'
import WorkOrderBomVersionTab from './WorkOrderBomVersionTab.vue'
import WorkOrderProductionSections from './WorkOrderProductionSections.vue'
import WorkOrderPrintModal from './WorkOrderPrintModal.vue'
import {
  getBatchesScheduledQty,
  getWorkOrderPlanQty,
  normalizeWorkOrderScheduleFields,
} from '@/utils/workOrderScheduleBatch'

const printModalOpen = ref(false)

const props = defineProps({
  workOrderId: { type: String, default: null },
  variant: { type: String, default: 'production' },
  showDispatchTab: { type: Boolean, default: false },
  planDateValue: { type: Object, default: null },
  workCenterOpts: { type: Array, default: () => [] },
  warehouseOpts: { type: Array, default: () => [] },
  urgencyOpts: { type: Array, default: () => [] },
  bomOpts: { type: Array, default: () => [] },
})

const workOrder = computed(() => {
  if (!props.workOrderId) return null
  const list =
    props.variant === 'qc'
      ? qcWorkOrderState.orders
      : props.variant === 'assembly'
        ? assemblyWorkOrderState.orders
        : workOrderState.orders
  return list.find((o) => o.id === props.workOrderId)
})

const hideBomRelatedTabs = computed(() => {
  const category = workOrder.value?.orderCategory
  return category === '外协工单' || category === '维修工单'
})

const detailTab = defineModel('detailTab', { type: String, default: 'dispatch' })
const detailCollapsed = defineModel('detailCollapsed', { type: Boolean, default: false })

const emit = defineEmits([
  'save-basic',
  'plan-date-change',
  'save-dispatch',
  'dispatch-and-start',
  'cancel-dispatch',
  'detail-action',
])

const processRouteOpts = computed(() => {
  if (!workOrder.value) return []
  void productInfoState.products
  void materialInfoState.materials
  void processRouteState.routes
  return getWorkOrderRouteSelectOptions(workOrder.value)
})

watch(
  [() => workOrder.value?.id, () => props.showDispatchTab],
  () => {
    if (!workOrder.value || !props.showDispatchTab) return
    normalizeWorkOrderScheduleFields(workOrder.value)
    const plan = getWorkOrderPlanQty(workOrder.value)
    const scheduled = getBatchesScheduledQty(workOrder.value)
    const suggest = Math.max(0, plan - scheduled)
    if (
      workOrder.value.dispatchBatchQty == null ||
      workOrder.value.dispatchBatchQty === '' ||
      Number(workOrder.value.dispatchBatchQty) === Number(workOrder.value.scheduleQty)
    ) {
      workOrder.value.dispatchBatchQty = suggest > 0 ? suggest : plan || 1
    }
    if (ensureWorkOrderProcessRoute(workOrder.value)) {
      emit('save-basic')
    }
  },
  { immediate: true },
)

function onWorkOrderFieldUpdate({ key, value }) {
  if (!workOrder.value) return
  workOrder.value[key] = value
}

function onProcessRouteChange(routeName) {
  if (!workOrder.value || !routeName) return
  workOrder.value.processes = buildProcessesFromRoute(routeName)
  emit('save-basic')
}

function statusTagColor(status) {
  const map = {
    待下发: 'warning',
    已下发: 'processing',
    执行中: 'processing',
    完成: 'success',
    暂停: 'default',
    终止: 'error',
  }
  return map[status] || 'default'
}
</script>

<style lang="less" scoped>
.detail-panel {
  .detail-header {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    margin-bottom: 10px;
    gap: 12px;

    .header-main {
      min-width: 0;
      flex: 1;
    }

    .header-tags {
      margin-top: 6px;
    }

    .header-actions {
      flex-shrink: 0;
    }

    .header-action-btn,
    .collapse-btn {
      padding-inline: 4px;
    }

    .detail-title {
      min-width: 0;

      &.title-bold {
        .code,
        .name {
          font-weight: 600;
          font-size: 14px;
          color: rgba(0, 0, 0, 0.88);
        }

        .name {
          margin-left: 8px;
        }
      }

      .code {
        font-size: 14px;
        font-weight: 600;
        color: rgba(0, 0, 0, 0.88);
        margin-right: 8px;
      }

      .name {
        font-size: 13px;
        color: rgba(0, 0, 0, 0.65);
      }
    }

    .collapse-btn {
      flex-shrink: 0;
      padding-right: 0;
      font-size: 12px;
      height: auto;
      color: rgba(0, 0, 0, 0.45);
    }
  }

  .detail-tabs {
    :deep(.ant-tabs-nav) {
      margin-bottom: 8px;
    }

    :deep(.ant-tabs-tab) {
      padding: 6px 0;
      font-size: 13px;
    }
  }

  .dispatch-process-section {
    margin-top: 16px;
    padding-top: 16px;
    border-top: 1px solid #f0f0f0;
  }

  .tab-empty {
    margin: 24px 0;
  }
}
</style>
