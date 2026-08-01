<template>
  <a-modal
    :open="open"
    :title="`生成外协工单 (${rows.length}条)`"
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
              v-if="column.key !== 'index' && column.key !== 'action'"
              class="resize-handle"
              @mousedown.prevent="(e) => startResize(e, column.key)"
            />
          </div>
        </template>

        <template #bodyCell="{ column, record, text }">
          <template v-if="column.key === 'action'">
            <a-button type="link" size="small" danger @click="removeRow(record.key)">删除</a-button>
          </template>
          <template v-else-if="column.key === 'remark'">
            <LongTextEditCell :value="record.remark" @edit="openRemarkEdit(record)" />
          </template>
          <div
            v-else
            class="body-cell"
            :class="{
              editable: isEditable(column.key),
              editing: isEditing(record.key, column.key),
            }"
            @click="startEdit(record, column.key)"
          >
            <div v-if="isEditing(record.key, column.key)" class="edit-wrap" @click.stop>
              <a-date-picker
                v-if="column.key === 'expectedArrivalDate'"
                :value="expectedArrivalDayjs(record)"
                size="small"
                style="width: 100%"
                :open="datePickerOpen"
                @change="(date) => onExpectedArrivalChange(record, date)"
                @openChange="onDatePickerOpenChange"
              />
              <PlanSupplierSelect
                v-else-if="column.key === 'supplier'"
                v-model:value="record.supplier"
                size="small"
                :open="selectOpen"
                @dropdown-visible-change="onSelectOpenChange"
                @change="endEdit"
              />
              <a-select
                v-else-if="selectOptions[column.key]"
                v-model:value="record[column.key]"
                size="small"
                style="width: 100%"
                show-search
                allow-clear
                :open="selectOpen"
                :options="selectOptions[column.key]"
                :filter-option="filterSelectOption"
                option-filter-prop="label"
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

    <a-empty v-if="!rows.length" description="当前物料清单无供应型态为「外协件」的物料" />

    <template #footer>
      <a-button @click="handleCancel">取消</a-button>
      <a-button type="primary" :disabled="!rows.length" @click="handleSave">
        保存 ({{ rows.length }}条)
      </a-button>
    </template>
  </a-modal>

  <a-modal
    v-model:open="remarkEdit.open"
    title="编辑备注"
    width="640px"
    :mask-closable="false"
    destroy-on-close
    @ok="confirmRemarkEdit"
    @cancel="remarkEdit.open = false"
  >
    <a-textarea
      v-model:value="remarkEdit.draft"
      :rows="10"
      placeholder="请输入备注"
      show-count
      :maxlength="5000"
    />
  </a-modal>
</template>

<script setup>
import { computed, reactive, ref, watch, nextTick } from 'vue'
import { SettingOutlined } from '@ant-design/icons-vue'
import { message } from 'ant-design-vue'
import dayjs from 'dayjs'
import { urgencyOptions } from '@/mock/workOrderOptions'
import { unitState, getAllEnabledUnitOptions } from '@/store/unitStore'
import { getWarehouseSelectOptions, warehouseState } from '@/store/warehouseStore'
import { buildOutsourceWorkOrderRows } from '@/utils/material'
import { SUPPLIER_SELECT_PLACEHOLDER } from '@/utils/supplierSelect'
import PlanSupplierSelect from './PlanSupplierSelect.vue'
import LongTextEditCell from '@/components/LongTextEditCell.vue'

const props = defineProps({
  open: { type: Boolean, default: false },
  order: { type: Object, default: null },
  materials: { type: Array, default: () => [] },
})

const emit = defineEmits(['update:open', 'save'])

const columnDefs = [
  { key: 'index', title: '序号', width: 56, total: false },
  { key: 'productName', title: '物品名称', width: 130, total: false },
  { key: 'code', title: '物品编码', width: 120, total: false },
  { key: 'spec', title: '规格型号', width: 130, total: false },
  { key: 'material', title: '材质', width: 70, total: false },
  { key: 'drawingNo', title: '图号', width: 100, total: false },
  { key: 'specAttr', title: '规格属性', width: 90, total: false },
  { key: 'materialType', title: '物料类型', width: 90, total: false },
  { key: 'supplier', title: '供应商', width: 140, editable: true, total: false },
  { key: 'stockQty', title: '库存数量', width: 90, total: true, numeric: true },
  { key: 'availableStock', title: '可用库存', width: 90, total: true, numeric: true },
  { key: 'inTransitQty', title: '在途数量', width: 90, total: true, numeric: true },
  { key: 'demandQty', title: '需求数', width: 80, total: true, numeric: true },
  { key: 'gapQty', title: '缺口数', width: 80, total: true, numeric: true },
  { key: 'planQty', title: '计划数量', width: 90, editable: true, total: true, numeric: true },
  { key: 'unit', title: '计量单位', width: 90, editable: true, total: false },
  { key: 'expectedArrivalDate', title: '期望到货时间', width: 130, editable: true, total: false },
  { key: 'warehouse', title: '预入仓库', width: 100, editable: true, total: false },
  { key: 'urgency', title: '紧急度', width: 80, editable: true, total: false },
  { key: 'remark', title: '备注', width: 140, total: false },
  { key: 'action', title: '操作', width: 72, total: false },
]

const editableKeys = columnDefs.filter((c) => c.editable).map((c) => c.key)
const defaultVisibleKeys = columnDefs.map((c) => c.key)

const visibleKeys = ref([...defaultVisibleKeys])
const columnWidths = reactive(Object.fromEntries(columnDefs.map((c) => [c.key, c.width])))
const rows = ref([])
const editingCell = ref(null)
const remarkEdit = reactive({ open: false, record: null, draft: '' })
const tableWrapRef = ref(null)
const selectOpen = ref(false)
const datePickerOpen = ref(false)

const selectOptions = computed(() => {
  void warehouseState.warehouses
  return {
    unit: (() => {
      void unitState.units
      return getAllEnabledUnitOptions()
    })(),
    warehouse: getWarehouseSelectOptions(),
    urgency: urgencyOptions.map((v) => ({ label: v, value: v })),
  }
})

const displayColumns = computed(() =>
  columnDefs
    .filter((c) => visibleKeys.value.includes(c.key))
    .map((c) => ({
      title: c.title,
      dataIndex: c.key,
      key: c.key,
      width: columnWidths[c.key],
      ellipsis: !c.editable && c.key !== 'action' && c.key !== 'remark',
      total: c.total,
      fixed:
        c.key === 'action'
          ? 'right'
          : ['index', 'productName', 'code'].includes(c.key)
            ? 'left'
            : undefined,
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
      rows.value = buildOutsourceWorkOrderRows(props.materials, props.order)
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

function filterSelectOption(input, option) {
  const kw = String(input || '').toLowerCase()
  const label = String(option?.label ?? option?.value ?? '').toLowerCase()
  return label.includes(kw)
}

function openRemarkEdit(record) {
  remarkEdit.record = record
  remarkEdit.draft = record.remark || ''
  remarkEdit.open = true
}

function confirmRemarkEdit() {
  if (remarkEdit.record) {
    remarkEdit.record.remark = remarkEdit.draft || ''
  }
  remarkEdit.open = false
}

function startEdit(record, field) {
  if (!isEditable(field) || field === 'remark') return
  editingCell.value = { rowKey: record.key, field }
  nextTick(() => {
    if (field === 'expectedArrivalDate') {
      datePickerOpen.value = true
    } else if (field === 'supplier' || selectOptions.value[field]) {
      selectOpen.value = true
    }
  })
}

function endEdit() {
  editingCell.value = null
  selectOpen.value = false
  datePickerOpen.value = false
}

function onSelectOpenChange(open) {
  selectOpen.value = open
  if (!open) endEdit()
}

function expectedArrivalDayjs(record) {
  return record.expectedArrivalDate ? dayjs(record.expectedArrivalDate) : null
}

function onExpectedArrivalChange(record, date) {
  record.expectedArrivalDate = date ? date.format('YYYY-MM-DD') : ''
}

function onDatePickerOpenChange(open) {
  datePickerOpen.value = open
  if (!open) endEdit()
}

function formatCell(record, key, text) {
  if (key === 'expectedArrivalDate') {
    return record.expectedArrivalDate || '请选择'
  }
  if (key === 'supplier' && !text) return SUPPLIER_SELECT_PLACEHOLDER
  if (isEditable(key) && (text === '' || text == null)) {
    return '-'
  }
  return text ?? '-'
}

function reindexRows() {
  rows.value.forEach((row, idx) => {
    row.index = idx + 1
  })
}

function removeRow(key) {
  rows.value = rows.value.filter((row) => row.key !== key)
  reindexRows()
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
  if (!rows.value.length) {
    message.warning('请至少保留一条外协明细')
    return
  }
  const invalidQty = rows.value.some((r) => !r.planQty || r.planQty <= 0)
  if (invalidQty) {
    message.warning('计划数量须大于 0')
    return
  }
  const missingArrival = rows.value.find((r) => !r.expectedArrivalDate)
  if (missingArrival) {
    message.warning(`请为「${missingArrival.productName}」选择期望到货时间`)
    return
  }
  emit(
    'save',
    rows.value.map((r) => ({ ...r })),
  )
  message.success(`已成功生成 ${rows.value.length} 条外协工单`)
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
