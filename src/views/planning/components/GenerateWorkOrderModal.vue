<template>
  <a-modal
    :open="open"
    :title="`生成加工工单 (${rows.length}条)`"
    width="90%"
    :mask-closable="false"
    destroy-on-close
    class="work-order-modal"
    @cancel="handleCancel"
  >
    <div class="modal-toolbar">
      <span class="hint">提示：拖动表头右侧边线可调整列宽，单击可编辑单元格进行编辑</span>
      <a-popover trigger="click" placement="bottomRight">
        <template #title>列设置</template>
        <template #content>
          <a-checkbox-group v-model:value="visibleKeys" class="column-settings">
            <a-row>
              <a-col v-for="col in columnDefs" :key="col.key" :span="12">
                <a-checkbox :value="col.key" :disabled="col.key === 'index'">
                  {{ col.title }}
                </a-checkbox>
              </a-col>
            </a-row>
          </a-checkbox-group>
        </template>
        <a-button type="text">
          <SettingOutlined />
          列设置
        </a-button>
      </a-popover>
    </div>

    <div ref="tableWrapRef" class="table-wrap">
      <a-table
        :columns="displayColumns"
        :data-source="rows"
        :pagination="false"
        row-key="key"
        size="small"
        bordered
        :scroll="{ x: tableScrollX, y: 420 }"
        class="work-order-table"
      >
        <template #headerCell="{ column }">
          <div class="header-cell">
            <span class="header-title">{{ column.title }}</span>
            <span
              v-if="column.key !== 'index'"
              class="resize-handle"
              @mousedown.prevent="(e) => startResize(e, column.key)"
            />
          </div>
        </template>

        <template #bodyCell="{ column, record, text }">
          <div
            class="body-cell"
            :class="{
              editable: isEditable(column.key),
              editing: isEditing(record.key, column.key),
            }"
            @click="startEdit(record, column.key)"
          >
            <div v-if="isEditing(record.key, column.key)" class="edit-wrap" @click.stop>
              <a-range-picker
                v-if="column.key === 'planDateRange'"
                :value="planDateDayjs(record)"
                size="small"
                style="width: 100%"
                :open="planDatePickerOpen"
                @change="(dates) => onPlanDateChange(record, dates)"
                @openChange="onPlanDateOpenChange"
              />
              <a-select
                v-else-if="selectOptions[column.key]"
                v-model:value="record[column.key]"
                size="small"
                style="width: 100%"
                :open="selectOpen"
                :options="selectOptions[column.key]"
                @dropdownVisibleChange="onSelectOpenChange"
                @change="endEdit"
              />
              <a-input-number
                v-else-if="column.key === 'planQty'"
                v-model:value="record.planQty"
                size="small"
                :min="0"
                style="width: 100%"
                autofocus
                @blur="endEdit"
                @pressEnter="endEdit"
              />
              <a-input
                v-else
                v-model:value="record.remark"
                size="small"
                autofocus
                @blur="endEdit"
                @pressEnter="endEdit"
              />
            </div>
            <template v-else>
              <span :class="{ placeholder: isEditable(column.key) && !text && text !== 0 }">
                {{ formatCell(record, column.key, text) }}
              </span>
            </template>
          </div>
        </template>

        <template #summary>
          <a-table-summary v-if="rows.length">
            <a-table-summary-row>
              <a-table-summary-cell
                v-for="col in displayColumns"
                :key="col.key"
                :index="col.key === 'index' ? 0 : undefined"
              >
                <template v-if="col.key === 'index'">总计</template>
                <template v-else-if="col.total">{{ summary[col.key] }}</template>
              </a-table-summary-cell>
            </a-table-summary-row>
          </a-table-summary>
        </template>
      </a-table>
    </div>

    <a-empty v-if="!rows.length" description="当前订单无供应型态为「自制件」的物料" />

    <template #footer>
      <a-button @click="handleCancel">取消</a-button>
      <a-button type="primary" :disabled="!rows.length" @click="handleSave">
        保存 ({{ rows.length }}条)
      </a-button>
    </template>
  </a-modal>
</template>

<script setup>
import { computed, reactive, ref, watch, nextTick } from 'vue'
import { SettingOutlined } from '@ant-design/icons-vue'
import { message } from 'ant-design-vue'
import dayjs from 'dayjs'
import {
  processRouteOptions,
  workCenterOptions,
  personInChargeOptions,
  unitOptions,
  warehouseOptions,
  urgencyOptions,
} from '@/mock/workOrderOptions'
import { buildWorkOrderRows } from '@/utils/material'

const props = defineProps({
  open: { type: Boolean, default: false },
  order: { type: Object, default: null },
  materials: { type: Array, default: () => [] },
})

const emit = defineEmits(['update:open', 'save'])

const columnDefs = [
  { key: 'index', title: '序号', width: 56, total: false },
  { key: 'productName', title: '生产品名', width: 130, total: false },
  { key: 'code', title: '编码', width: 120, total: false },
  { key: 'spec', title: '规格型号', width: 130, total: false },
  { key: 'specAttr', title: '规格属性', width: 90, total: false },
  { key: 'material', title: '材质', width: 70, total: false },
  { key: 'bom', title: 'BOM', width: 100, total: false },
  { key: 'processRoute', title: '工艺路线', width: 120, editable: true, total: false },
  { key: 'workCenter', title: '工作中心', width: 100, editable: true, total: false },
  { key: 'personInCharge', title: '负责人', width: 90, editable: true, total: false },
  { key: 'stockQty', title: '库存数量', width: 90, total: true, numeric: true },
  { key: 'availableStock', title: '可用库存', width: 90, total: true, numeric: true },
  { key: 'inTransitQty', title: '在途数量', width: 90, total: true, numeric: true },
  { key: 'demandQty', title: '需求数', width: 80, total: true, numeric: true },
  { key: 'gapQty', title: '缺口数', width: 80, total: true, numeric: true },
  { key: 'planQty', title: '计划数量', width: 90, editable: true, total: true, numeric: true },
  { key: 'planDateRange', title: '计划时间', width: 220, editable: true, total: false },
  { key: 'unit', title: '计量单位', width: 90, editable: true, total: false },
  { key: 'warehouse', title: '预入仓库', width: 100, editable: true, total: false },
  { key: 'urgency', title: '紧急度', width: 80, editable: true, total: false },
  { key: 'remark', title: '备注', width: 120, editable: true, total: false },
]

const editableKeys = columnDefs.filter((c) => c.editable).map((c) => c.key)
const defaultVisibleKeys = columnDefs.map((c) => c.key)

const visibleKeys = ref([...defaultVisibleKeys])
const columnWidths = reactive(Object.fromEntries(columnDefs.map((c) => [c.key, c.width])))
const rows = ref([])
const editingCell = ref(null)
const tableWrapRef = ref(null)
const selectOpen = ref(false)
const planDatePickerOpen = ref(false)

const selectOptions = {
  processRoute: processRouteOptions.map((v) => ({ label: v, value: v })),
  workCenter: workCenterOptions.map((v) => ({ label: v, value: v })),
  personInCharge: personInChargeOptions.map((v) => ({ label: v, value: v })),
  unit: unitOptions.map((v) => ({ label: v, value: v })),
  warehouse: warehouseOptions.map((v) => ({ label: v, value: v })),
  urgency: urgencyOptions.map((v) => ({ label: v, value: v })),
}

const displayColumns = computed(() =>
  columnDefs
    .filter((c) => visibleKeys.value.includes(c.key))
    .map((c) => ({
      title: c.title,
      dataIndex: c.key,
      key: c.key,
      width: columnWidths[c.key],
      ellipsis: !c.editable,
      total: c.total,
    })),
)

const tableScrollX = computed(() =>
  displayColumns.value.reduce((sum, c) => sum + (c.width || 100), 0),
)

const summary = computed(() => {
  const totals = {}
  columnDefs
    .filter((c) => c.total)
    .forEach((col) => {
      totals[col.key] = rows.value.reduce((sum, row) => sum + (Number(row[col.key]) || 0), 0)
    })
  return totals
})

watch(
  () => props.open,
  (val) => {
    if (val && props.order) {
      rows.value = buildWorkOrderRows(props.materials, props.order)
      editingCell.value = null
    }
  },
)

function isEditable(key) {
  return editableKeys.includes(key)
}

function isEditing(rowKey, field) {
  return editingCell.value?.rowKey === rowKey && editingCell.value?.field === field
}

function startEdit(record, field) {
  if (!isEditable(field)) return
  editingCell.value = { rowKey: record.key, field }
  nextTick(() => {
    if (field === 'planDateRange') {
      planDatePickerOpen.value = true
    } else if (selectOptions[field]) {
      selectOpen.value = true
    }
  })
}

function endEdit() {
  editingCell.value = null
  selectOpen.value = false
  planDatePickerOpen.value = false
}

function onSelectOpenChange(open) {
  selectOpen.value = open
  if (!open) endEdit()
}

function planDateDayjs(record) {
  const range = record.planDateRange
  if (range?.length === 2) return [dayjs(range[0]), dayjs(range[1])]
  return null
}

function onPlanDateChange(record, dates) {
  if (dates?.length === 2) {
    record.planDateRange = [dates[0].format('YYYY-MM-DD'), dates[1].format('YYYY-MM-DD')]
  } else {
    record.planDateRange = []
  }
}

function onPlanDateOpenChange(open) {
  planDatePickerOpen.value = open
  if (!open) endEdit()
}

function formatCell(record, key, text) {
  if (key === 'planDateRange') {
    const range = record.planDateRange
    if (range?.length === 2) return `${range[0]} ~ ${range[1]}`
    return '请选择'
  }
  if (isEditable(key) && (text === '' || text == null)) {
    if (['processRoute', 'workCenter', 'personInCharge'].includes(key)) return '请选择'
    return '-'
  }
  return text ?? '-'
}

function startResize(e, key) {
  const startX = e.clientX
  const startWidth = columnWidths[key]

  const onMove = (ev) => {
    columnWidths[key] = Math.max(60, startWidth + ev.clientX - startX)
  }
  const onUp = () => {
    document.removeEventListener('mousemove', onMove)
    document.removeEventListener('mouseup', onUp)
  }
  document.addEventListener('mousemove', onMove)
  document.addEventListener('mouseup', onUp)
}

function handleCancel() {
  emit('update:open', false)
}

function handleSave() {
  emit(
    'save',
    rows.value.map((r) => ({ ...r })),
  )
  message.success(`已成功生成 ${rows.value.length} 条加工工单`)
  emit('update:open', false)
}
</script>

<style lang="less" scoped>
.modal-toolbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;

  .hint {
    color: rgba(0, 0, 0, 0.45);
    font-size: 12px;
  }
}

.column-settings {
  width: 280px;
  max-height: 320px;
  overflow-y: auto;
}

.table-wrap {
  :deep(.ant-table-thead > tr > th) {
    padding: 8px !important;
    position: relative;
  }

  :deep(.ant-table-tbody > tr > td) {
    padding: 4px 8px !important;
  }
}

.header-cell {
  display: flex;
  align-items: center;
  justify-content: space-between;
  user-select: none;

  .resize-handle {
    position: absolute;
    right: 0;
    top: 0;
    bottom: 0;
    width: 6px;
    cursor: col-resize;

    &:hover {
      background: rgba(22, 119, 255, 0.25);
    }
  }
}

.body-cell {
  min-height: 28px;
  line-height: 28px;

  &.editable {
    cursor: pointer;

    &:hover {
      background: #fafafa;
    }
  }

  &.editing {
    padding: 0;
  }

  .edit-wrap {
    width: 100%;
  }

  .placeholder {
    color: rgba(0, 0, 0, 0.35);
  }
}
</style>
