<template>
  <div v-if="workOrder" class="detail-panel">
    <div class="detail-header">
      <div class="detail-title" :class="{ 'title-bold': variant === 'qc' }">
        <span class="code">{{ workOrder.code }}</span>
        <span class="name">{{ workOrder.name }}</span>
      </div>
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
    </div>

    <a-tabs v-model:activeKey="detailTab" class="detail-tabs">
      <a-tab-pane v-if="showDispatchTab" key="dispatch" tab="工单下发">
        <a-form
          v-show="!detailCollapsed"
          layout="inline"
          class="basic-form horizontal-form dispatch-basic-form"
        >
          <a-row :gutter="[16, 12]" style="width: 100%">
            <a-col :xs="24" :sm="12" :md="8">
              <a-form-item label="产品名称">
                <a-input :value="workOrder.productName" disabled size="small" />
              </a-form-item>
            </a-col>
            <a-col :xs="24" :sm="12" :md="8">
              <a-form-item label="工作中心">
                <a-select
                  v-model:value="workOrder.workCenter"
                  size="small"
                  :options="workCenterOpts"
                  @change="emit('save-basic')"
                />
              </a-form-item>
            </a-col>
            <a-col :xs="24" :sm="12" :md="8">
              <a-form-item label="BOM">
                <a-select
                  v-model:value="workOrder.bom"
                  show-search
                  size="small"
                  :options="bomOpts"
                  @change="emit('save-basic')"
                />
              </a-form-item>
            </a-col>
            <a-col :xs="24" :sm="12" :md="8">
              <a-form-item label="预入仓库">
                <a-select
                  v-model:value="workOrder.warehouse"
                  size="small"
                  :options="warehouseOpts"
                  @change="emit('save-basic')"
                />
              </a-form-item>
            </a-col>
            <a-col :xs="24" :sm="12" :md="8">
              <a-form-item label="紧急度">
                <a-select
                  v-model:value="workOrder.urgency"
                  size="small"
                  :options="urgencyOpts"
                  @change="emit('save-basic')"
                />
              </a-form-item>
            </a-col>
            <a-col :xs="24" :sm="12" :md="8">
              <a-form-item label="计划日期">
                <a-range-picker
                  :value="planDateValue"
                  size="small"
                  @change="(dates) => emit('plan-date-change', dates)"
                />
              </a-form-item>
            </a-col>
            <a-col :span="24">
              <a-form-item label="备注" class="remark-item">
                <a-input
                  v-model:value="workOrder.remark"
                  size="small"
                  placeholder="请输入备注"
                  @blur="emit('save-basic')"
                />
              </a-form-item>
            </a-col>
          </a-row>
        </a-form>

        <WorkOrderDispatchTab
          class="dispatch-process-section"
          :work-order="workOrder"
          @dispatch="emit('dispatch', false)"
          @dispatch-and-start="emit('dispatch', true)"
          @cancel="emit('cancel-dispatch')"
        />
      </a-tab-pane>
      <a-tab-pane key="detail" tab="工单详情">
        <WorkOrderDetailTab :work-order="workOrder" @action="emit('detail-action', $event)" />
      </a-tab-pane>
      <template v-if="variant === 'production' || variant === 'assembly'">
        <a-tab-pane key="ebom" tab="EBOM">
          <a-empty description="该 Tab 为占位，后续扩展" class="tab-empty" />
        </a-tab-pane>
        <a-tab-pane key="current-bom" tab="当前BOM">
          <a-empty description="该 Tab 为占位，后续扩展" class="tab-empty" />
        </a-tab-pane>
        <a-tab-pane key="tasks" tab="任务列表">
          <a-empty description="该 Tab 为占位，后续扩展" class="tab-empty" />
        </a-tab-pane>
      </template>
    </a-tabs>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { DownOutlined, UpOutlined } from '@ant-design/icons-vue'
import { workOrderState } from '@/store/workOrderStore'
import { qcWorkOrderState } from '@/store/qcWorkOrderStore'
import { assemblyWorkOrderState } from '@/store/assemblyWorkOrderStore'
import WorkOrderDispatchTab from './WorkOrderDispatchTab.vue'
import WorkOrderDetailTab from './WorkOrderDetailTab.vue'

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

const detailTab = defineModel('detailTab', { type: String, default: 'dispatch' })
const detailCollapsed = defineModel('detailCollapsed', { type: Boolean, default: false })

const emit = defineEmits([
  'save-basic',
  'plan-date-change',
  'dispatch',
  'cancel-dispatch',
  'detail-action',
])
</script>

<style lang="less" scoped>
.detail-panel {
  .detail-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 0;

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

  .dispatch-basic-form {
    padding-bottom: 16px;
    border-bottom: 1px solid #f0f0f0;
  }

  .dispatch-process-section {
    margin-top: 20px;
  }

  .horizontal-form {
    width: 100%;

    :deep(.ant-form-item) {
      width: 100%;
      margin-bottom: 0;
    }

    :deep(.ant-form-item-row) {
      flex-wrap: nowrap;
      align-items: center;
    }

    :deep(.ant-form-item-label) {
      flex: 0 0 auto;
      padding-bottom: 0;

      > label {
        height: 24px;
        line-height: 24px;
        font-size: 13px;
        white-space: nowrap;
      }
    }

    :deep(.ant-form-item-control) {
      flex: 1;
      min-width: 0;
    }

    .remark-item {
      :deep(.ant-form-item-label) {
        flex: 0 0 68px;
      }
    }
  }

  .tab-empty {
    margin: 24px 0;
  }
}
</style>
