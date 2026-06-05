<template>
  <div v-if="workOrder" class="detail-panel">
    <div class="detail-header">
      <div class="detail-title">
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
              <a-form-item label="物品名称">
                <a-input :value="workOrder.itemName" disabled size="small" />
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
              <a-form-item label="负责人">
                <a-select
                  v-model:value="workOrder.personInCharge"
                  size="small"
                  :options="personOpts"
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
        <WorkOrderDetailTab :work-order="detailWorkOrder" @action="emit('detail-action', $event)" />
      </a-tab-pane>
      <a-tab-pane key="ebom" tab="EBOM">
        <DisassemblyEbomTreeTab :work-order="workOrder" />
      </a-tab-pane>
    </a-tabs>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { DownOutlined, UpOutlined } from '@ant-design/icons-vue'
import { disassemblyWorkOrderState } from '@/store/disassemblyWorkOrderStore'
import { mapDisassemblyForDetailTab } from '@/utils/disassemblyWorkOrder'
import WorkOrderDispatchTab from './WorkOrderDispatchTab.vue'
import WorkOrderDetailTab from './WorkOrderDetailTab.vue'
import DisassemblyEbomTreeTab from './DisassemblyEbomTreeTab.vue'

const props = defineProps({
  workOrderId: { type: String, default: null },
  showDispatchTab: { type: Boolean, default: false },
  planDateValue: { type: Object, default: null },
  workCenterOpts: { type: Array, default: () => [] },
  warehouseOpts: { type: Array, default: () => [] },
  urgencyOpts: { type: Array, default: () => [] },
  bomOpts: { type: Array, default: () => [] },
  personOpts: { type: Array, default: () => [] },
})

const workOrder = computed(() => {
  if (!props.workOrderId) return null
  return disassemblyWorkOrderState.orders.find((o) => o.id === props.workOrderId)
})

const detailWorkOrder = computed(() => mapDisassemblyForDetailTab(workOrder.value))

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

      .code {
        font-weight: 600;
        font-size: 14px;
        margin-right: 8px;
      }

      .name {
        font-size: 13px;
        color: rgba(0, 0, 0, 0.65);
      }
    }

    .collapse-btn {
      padding: 0;
      height: auto;
      font-size: 12px;
    }
  }

  .detail-tabs {
    :deep(.ant-tabs-nav) {
      margin-bottom: 8px;
    }
  }

  .dispatch-basic-form {
    margin-bottom: 12px;
    padding-bottom: 8px;
    border-bottom: 1px dashed #f0f0f0;
  }

  .dispatch-process-section {
    margin-top: 4px;
  }
}
</style>
