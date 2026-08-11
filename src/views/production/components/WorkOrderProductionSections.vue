<template>
  <div class="wo-production-sections">
    <div v-if="showMetaBar" class="meta-bar">
      <a-space :size="8" wrap>
        <span class="meta-item">
          <span class="meta-label">进度</span>
          {{ formatWorkOrderFieldValue(workOrder.progressLabel || workOrder.status) }}
        </span>
        <span class="meta-item">
          <span class="meta-label">状态</span>
          {{ formatWorkOrderFieldValue(workOrder.taskStatus || '正常') }}
        </span>
        <span class="meta-item">
          <span class="meta-label">创建日期</span>
          {{ formatWorkOrderFieldValue(workOrder.createdAt) }}
        </span>
        <span class="meta-item">
          <span class="meta-label">负责人</span>
          {{ formatWorkOrderFieldValue(workOrder.owner) }}
        </span>
        <span v-if="workOrder.scrapQty != null && workOrder.scrapQty !== ''" class="meta-item">
          <span class="meta-label">报废数量</span>
          {{ formatWorkOrderFieldValue(workOrder.scrapQty) }}
        </span>
      </a-space>
    </div>

    <a-form layout="inline" class="horizontal-form">
      <a-row :gutter="[8, 4]" style="width: 100%">
        <a-col v-for="field in allFields" :key="field.key" :span="field.span || 6">
          <a-form-item
            :label="field.label"
            :required="field.required"
            :class="{
              'remark-item': field.type === 'textarea',
              'multiline-item': field.multiline,
            }"
          >
            <a-select
              v-if="field.type === 'route-select'"
              :value="workOrder.processRouteName"
              show-search
              allow-clear
              size="small"
              :options="processRouteOpts"
              placeholder="请选择工艺路线"
              :filter-option="filterProcessRoute"
              @change="onProcessRouteChange"
            />
            <a-input-number
              v-else-if="field.type === 'number'"
              :value="workOrder[field.key]"
              :min="0"
              size="small"
              style="width: 100%"
              :disabled="field.readonly"
              @change="(v) => !field.readonly && updateField(field.key, v)"
            />
            <a-select
              v-else-if="field.type === 'select'"
              :value="workOrder[field.key]"
              size="small"
              :options="field.options"
              @change="(v) => updateField(field.key, v)"
            />
            <WorkOrderOwnerSelect
              v-else-if="field.type === 'owner-select'"
              :model-value="workOrder[field.key]"
              placeholder="请选择负责人"
              @update:model-value="(v) => updateField(field.key, v)"
            />
            <a-range-picker
              v-else-if="field.type === 'date-range'"
              :value="planDateValue"
              size="small"
              style="width: 100%"
              @change="(dates) => emit('plan-date-change', dates)"
            />
            <a-textarea
              v-else-if="field.type === 'textarea'"
              :value="workOrder.remark"
              :rows="3"
              size="small"
              placeholder="请输入工单备注"
              @update:value="(v) => updateField('remark', v)"
              @blur="emitChange"
            />
            <span
              v-else
              class="field-text"
              :class="{ 'field-text-multiline': field.multiline }"
              :title="fieldText(field)"
              >{{ fieldText(field) }}</span
            >
          </a-form-item>
        </a-col>
      </a-row>
    </a-form>
  </div>
</template>

<script setup>
import { computed, watch } from 'vue'
import {
  formatWorkOrderFieldValue,
  formatWorkOrderPlanDateRange,
  resolveWorkOrderSalesMeta,
  resolveWorkOrderVariantSummary,
} from '@/utils/workOrderBasicFields'
import { resolveWorkCenterOwner } from '@/mock/workOrderOptions'
import WorkOrderOwnerSelect from './WorkOrderOwnerSelect.vue'
import { getBatchesScheduledQty, getWorkOrderPlanQty } from '@/utils/workOrderScheduleBatch'

const props = defineProps({
  workOrder: { type: Object, required: true },
  editable: { type: Boolean, default: false },
  /** 工单下发：计划只读、展示已排产、排产数量=本批 */
  dispatchMode: { type: Boolean, default: false },
  showMetaBar: { type: Boolean, default: false },
  planDateValue: { type: Object, default: null },
  workCenterOpts: { type: Array, default: () => [] },
  warehouseOpts: { type: Array, default: () => [] },
  urgencyOpts: { type: Array, default: () => [] },
  processRouteOpts: { type: Array, default: () => [] },
})

const emit = defineEmits(['change', 'plan-date-change', 'process-route-change', 'update-field'])

const salesMeta = computed(() => resolveWorkOrderSalesMeta(props.workOrder))

function displayValue(value) {
  return formatWorkOrderFieldValue(value)
}

function fieldText(field) {
  if (field.getValue) return field.getValue()
  return displayValue(field.value)
}

const detailFields = computed(() => {
  const wo = props.workOrder
  const fields = []

  if (!props.editable) {
    fields.push(
      { key: 'sourceOrderNo', label: '销售单号', value: wo.sourceOrderNo },
      { key: 'customerName', label: '客户名称', value: salesMeta.value.customerName },
      { key: 'salesperson', label: '业务员', value: salesMeta.value.salesperson },
    )
  }

  fields.push(
    { key: 'productName', label: '产品名称', value: wo.productName },
    { key: 'specModel', label: '规格型号', value: wo.specModel },
    { key: 'material', label: '材质', value: wo.material },
    {
      key: 'variantAttr',
      label: '变体属性',
      value: resolveWorkOrderVariantSummary(wo),
    },
    { key: 'drawingNo', label: '图号', value: wo.drawingNo },
    {
      key: 'techParams',
      label: '技术参数',
      value: wo.techParams,
      span: 24,
      multiline: true,
    },
    {
      key: 'matchingRequirements',
      label: '配套要求',
      value: wo.matchingRequirements,
      span: 24,
      multiline: true,
    },
    { key: 'bom', label: '物料清单', value: wo.bomLabel || wo.bom },
  )

  const routeLabel =
    wo.orderCategory === '外协工单' && props.editable ? '工艺路线（必填）' : '工艺路线'

  if (props.editable) {
    fields.push(
      { key: 'processRouteName', label: routeLabel, type: 'route-select', required: true },
      {
        key: 'planQty',
        label: '计划数量',
        type: 'number',
        readonly: props.dispatchMode,
      },
    )
    if (props.dispatchMode) {
      fields.push(
        {
          key: 'dispatchBatchQty',
          label: '排产数量',
          type: 'number',
          required: true,
        },
        {
          key: 'alreadyScheduledQty',
          label: '已排产数量',
          getValue: () => displayValue(getBatchesScheduledQty(wo)),
        },
      )
    } else {
      fields.push({ key: 'scheduleQty', label: '排产数量', type: 'number', required: true })
    }
  } else {
    fields.push(
      { key: 'processRouteName', label: '工艺路线', value: wo.processRouteName },
      { key: 'planQty', label: '计划数量', value: getWorkOrderPlanQty(wo) },
      { key: 'scheduleQty', label: '已排产数量', value: getBatchesScheduledQty(wo) },
    )
  }

  return fields
})

const allFields = computed(() => [...detailFields.value, ...arrangementFields.value])

const arrangementFields = computed(() => {
  const wo = props.workOrder

  if (props.editable) {
    return [
      {
        key: 'workCenter',
        label: '工作中心',
        type: 'select',
        required: true,
        options: props.workCenterOpts,
      },
      {
        key: 'owner',
        label: '负责人',
        type: 'owner-select',
        required: true,
      },
      { key: 'warehouse', label: '预入仓库', type: 'select', options: props.warehouseOpts },
      { key: 'urgency', label: '紧急度', type: 'select', options: props.urgencyOpts },
      { key: 'planDateRange', label: '计划日期', type: 'date-range', required: true },
      { key: 'remark', label: '工单备注', type: 'textarea', span: 24 },
    ]
  }

  return [
    { key: 'workCenter', label: '工作中心', value: wo.workCenter },
    { key: 'owner', label: '负责人', value: wo.owner },
    { key: 'warehouse', label: '预入仓库', value: wo.warehouse },
    { key: 'urgency', label: '紧急度', value: wo.urgency },
    {
      key: 'planDateRange',
      label: '计划日期',
      getValue: () => displayValue(formatWorkOrderPlanDateRange(wo.planDateRange)),
    },
    { key: 'remark', label: '工单备注', value: wo.remark, span: 24, multiline: true },
  ]
})

function emitChange() {
  emit('change')
}

function updateField(key, value) {
  emit('update-field', { key, value })
  if (key === 'workCenter' && props.editable) {
    emit('update-field', { key: 'owner', value: resolveWorkCenterOwner(value) })
  }
  emitChange()
}

watch(
  () => [props.workOrder?.id, props.workOrder?.workCenter, props.workOrder?.owner, props.editable],
  () => {
    if (!props.editable || !props.workOrder?.workCenter) return
    if (!props.workOrder.owner) {
      emit('update-field', {
        key: 'owner',
        value: resolveWorkCenterOwner(props.workOrder.workCenter),
      })
    }
  },
  { immediate: true },
)

function onProcessRouteChange(value) {
  emit('update-field', { key: 'processRouteName', value })
  emit('process-route-change', value)
}

function filterProcessRoute(input, option) {
  return (option?.label ?? '').toLowerCase().includes(input.toLowerCase())
}
</script>

<style lang="less" scoped>
.wo-production-sections {
  padding: 8px 10px;
  background: #fff;
  border: 1px solid #f0f0f0;
  border-radius: 8px;
}

.meta-bar {
  margin-bottom: 8px;
  padding-bottom: 8px;
  border-bottom: 1px dashed #e8e8e8;

  .meta-item {
    font-size: 13px;
    color: rgba(0, 0, 0, 0.65);
  }

  .meta-label {
    color: rgba(0, 0, 0, 0.45);
    margin-right: 6px;
  }
}

.horizontal-form {
  width: 100%;

  :deep(.ant-form-item) {
    width: 100%;
    margin-bottom: 0;
    margin-inline-end: 0;
  }

  :deep(.ant-form-item-row) {
    flex-wrap: nowrap;
    align-items: center;
  }

  :deep(.ant-form-item-label) {
    flex: 0 0 72px;
    padding-bottom: 0;

    > label {
      height: 24px;
      line-height: 24px;
      font-size: 13px;
      white-space: nowrap;
      justify-content: flex-end;
    }
  }

  :deep(.ant-form-item-control) {
    flex: 1;
    min-width: 0;
  }

  .field-text {
    display: block;
    min-height: 24px;
    line-height: 24px;
    font-size: 13px;
    color: rgba(0, 0, 0, 0.88);
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .field-text-multiline {
    white-space: pre-wrap;
    word-break: break-word;
    line-height: 22px;
    min-height: 24px;
    max-height: 66px;
    overflow-x: hidden;
    overflow-y: auto;
    text-overflow: unset;
  }

  .multiline-item,
  .remark-item {
    :deep(.ant-form-item-row) {
      align-items: flex-start;
    }

    :deep(.ant-form-item-label) {
      align-self: flex-start;

      > label {
        height: auto;
        line-height: 22px;
        padding-top: 4px;
      }
    }
  }

  .remark-item .field-text {
    white-space: pre-wrap;
    line-height: 22px;
    min-height: auto;
  }
}
</style>
