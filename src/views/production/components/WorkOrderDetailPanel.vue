<template>
  <div v-if="workOrder" class="detail-panel">
    <div class="detail-header">
      <div class="header-main">
        <div class="detail-title" :class="{ 'title-bold': variant === 'qc' }">
          <span class="code">{{ workOrder.code }}</span>
          <span class="name">{{ workOrder.name }}</span>
          <a-space :size="6" class="header-tags">
            <a-tag>{{ workOrder.orderCategory || '生产工单' }}</a-tag>
            <a-tag :color="statusTagColor(workOrder.status)">{{ workOrder.status }}</a-tag>
            <a-tag v-if="isScheduleIncomplete(workOrder)" color="processing">未排完</a-tag>
            <a-tag
              v-if="convertSideLabel"
              :color="getWorkOrderConvertSideTagColor(convertSideLabel)"
            >
              {{ convertSideLabel }}
            </a-tag>
            <a-tag
              v-if="
                workOrder.urgency && workOrder.urgency !== '普通' && workOrder.urgency !== '正常'
              "
              color="orange"
            >
              {{ workOrder.urgency }}
            </a-tag>
          </a-space>
        </div>
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

    <div
      v-if="(variant === 'production' || variant === 'assembly') && showDetailActionBar"
      class="detail-action-bar"
    >
      <a-space :size="8">
        <a-button
          v-if="canEditScheduleQty"
          type="primary"
          ghost
          @click="emitAction('schedule-qty')"
        >
          修改排产数量
        </a-button>
        <a-button v-if="canAdjustUrgency" type="primary" @click="emitAction('urgency')">
          调整紧急度
        </a-button>
        <a-button v-if="canPause" class="btn-pause" @click="emitAction('pause')">暂停</a-button>
        <a-button v-if="canResume" type="primary" @click="emitAction('resume')">恢复</a-button>
        <a-button v-if="canTerminate" danger @click="emitAction('terminate')">终止</a-button>
        <a-button v-if="canConvertPurchaseOrOutsource" @click="emitAction('to-purchase')">
          转采购
        </a-button>
        <a-button v-if="canConvertPurchaseOrOutsource" @click="emitAction('to-outsource')">
          转外协
        </a-button>
        <a-button v-if="canComplete" class="btn-complete" @click="emitAction('complete')">
          完成
        </a-button>
      </a-space>
    </div>

    <WorkOrderPrintModal v-model:open="printModalOpen" :work-order="workOrder" />

    <a-tabs v-model:activeKey="detailTab" class="detail-tabs detail-tabs-pill">
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
        <a-tab-pane key="purchase" tab="采购">
          <WorkOrderPurchaseInfoTab :work-order="workOrder" />
        </a-tab-pane>
        <a-tab-pane key="outsourcing" tab="外协">
          <WorkOrderOutsourcingInfoTab :work-order="workOrder" />
        </a-tab-pane>
        <a-tab-pane key="outbound" tab="出库信息">
          <WorkOrderOutboundInfoTab v-if="workOrder" :work-order="workOrder" />
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
import { computed, defineAsyncComponent, ref, watch } from 'vue'
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
import WorkOrderPurchaseInfoTab from './WorkOrderPurchaseInfoTab.vue'
import WorkOrderOutsourcingInfoTab from './WorkOrderOutsourcingInfoTab.vue'
import WorkOrderInboundInfoTab from './WorkOrderInboundInfoTab.vue'
import WorkOrderQcInfoTab from './WorkOrderQcInfoTab.vue'
import WorkOrderEbomTreeTab from './WorkOrderEbomTreeTab.vue'
import WorkOrderCurrentBomTab from './WorkOrderCurrentBomTab.vue'
import WorkOrderBomVersionTab from './WorkOrderBomVersionTab.vue'
import WorkOrderProductionSections from './WorkOrderProductionSections.vue'
import WorkOrderPrintModal from './WorkOrderPrintModal.vue'
import {
  getRemainScheduleQty,
  getWorkOrderPlanQty,
  normalizeWorkOrderScheduleFields,
  isScheduleIncomplete,
} from '@/utils/workOrderScheduleBatch'
import { canShowEditScheduleQty } from '@/utils/workOrderStatus'
import { canConvertWorkOrderToPurchaseOrOutsource } from '@/utils/workOrderConvert'
import {
  getWorkOrderConvertSideLabel,
  getWorkOrderConvertSideTagColor,
} from '@/utils/workOrderConvertOccupy'

const WorkOrderOutboundInfoTab = defineAsyncComponent(
  () => import('./WorkOrderOutboundInfoTab.vue'),
)

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
    const suggest = getRemainScheduleQty(workOrder.value)
    const current = Number(workOrder.value.dispatchBatchQty)
    if (
      workOrder.value.dispatchBatchQty == null ||
      workOrder.value.dispatchBatchQty === '' ||
      !Number.isFinite(current) ||
      current <= 0 ||
      current > suggest
    ) {
      workOrder.value.dispatchBatchQty = suggest > 0 ? suggest : 0
    }
    if (ensureWorkOrderProcessRoute(workOrder.value)) {
      emit('save-basic')
    }
  },
  { immediate: true },
)

const canEditScheduleQty = computed(() => canShowEditScheduleQty(workOrder.value))

const canAdjustUrgency = computed(() => {
  const wo = workOrder.value
  if (!wo) return false
  return !['终止', '已完成', '完成'].includes(wo.status)
})

const canPause = computed(() => ['待下发', '已下发', '执行中'].includes(workOrder.value?.status))

const canResume = computed(() => workOrder.value?.status === '暂停')

const canTerminate = computed(() =>
  ['待下发', '已下发', '执行中', '暂停'].includes(workOrder.value?.status),
)

const canConvertPurchaseOrOutsource = computed(() =>
  canConvertWorkOrderToPurchaseOrOutsource(workOrder.value),
)

const convertSideLabel = computed(() => getWorkOrderConvertSideLabel(workOrder.value))

const canComplete = computed(() => ['已下发', '执行中'].includes(workOrder.value?.status))

const showDetailActionBar = computed(
  () =>
    canEditScheduleQty.value ||
    canAdjustUrgency.value ||
    canPause.value ||
    canResume.value ||
    canTerminate.value ||
    canConvertPurchaseOrOutsource.value ||
    canComplete.value,
)

function emitAction(key) {
  if (!workOrder.value) return
  emit('detail-action', { key, workOrder: workOrder.value })
}

function onWorkOrderFieldUpdate({ key, value }) {
  if (!workOrder.value) return
  if (key === 'dispatchBatchQty') {
    const max = getRemainScheduleQty(workOrder.value)
    const n = Number(value)
    workOrder.value[key] = Number.isFinite(n)
      ? Math.min(Math.max(0, n), max || getWorkOrderPlanQty(workOrder.value))
      : value
    return
  }
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
    已完成: 'success',
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
    align-items: center;
    margin-bottom: 12px;
    gap: 8px;
    padding: 12px 16px;
    border: 1px solid #e8eef8;
    border-radius: 8px;
    background: linear-gradient(180deg, #f0f5ff 0%, #ffffff 100%);
    box-sizing: border-box;

    .header-main {
      min-width: 0;
      flex: 1;
    }

    .header-actions {
      flex-shrink: 0;
    }

    .header-action-btn,
    .collapse-btn {
      padding-inline: 4px;
    }

    .detail-title {
      display: flex;
      align-items: center;
      flex-wrap: wrap;
      gap: 8px 10px;
      min-width: 0;

      &.title-bold {
        .code,
        .name {
          font-weight: 600;
          font-size: 14px;
          color: rgba(0, 0, 0, 0.88);
        }
      }

      .code {
        font-size: 14px;
        font-weight: 600;
        color: rgba(0, 0, 0, 0.88);
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

    .collapse-btn {
      flex-shrink: 0;
      padding-right: 0;
      font-size: 12px;
      height: auto;
      color: rgba(0, 0, 0, 0.45);
    }
  }

  .detail-action-bar {
    margin-bottom: 12px;
    padding: 8px 12px;
    background: #fff;
    border: 1px solid #e5e6eb;
    border-radius: 8px;
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.04);
    box-sizing: border-box;
    display: flex;
    align-items: center;
    justify-content: flex-start;

    :deep(.ant-space) {
      display: inline-flex;
      align-items: center;
    }

    :deep(.ant-space-item) {
      margin-bottom: 0 !important;
    }

    :deep(.ant-btn) {
      height: 32px;
      padding: 0 15px;
      font-size: 14px;
      border-radius: 6px;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      line-height: 1;
    }

    .btn-pause {
      color: #d46b08;
      border-color: #ffd591;
      background: #fff7e6;
    }

    .btn-complete {
      color: #389e0d;
      border-color: #b7eb8f;
      background: #f6ffed;
    }
  }

  .detail-tabs {
    margin-top: 0;

    :deep(.ant-tabs-nav) {
      margin-bottom: 8px !important;
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
