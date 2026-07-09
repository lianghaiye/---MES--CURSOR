<template>
  <a-modal
    :open="open"
    :title="`生成采购申请 (${rows.length}条)`"
    width="90%"
    :mask-closable="false"
    destroy-on-close
    class="work-order-modal"
    @cancel="handleCancel"
  >
    <div class="modal-toolbar">
      <span class="hint"
        >提示：拖动表头右侧边线可调整列宽，单击可编辑单元格进行编辑；多明细合并生成一张采购申请单</span
      >
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

    <a-form layout="inline" class="header-form">
      <a-row :gutter="[12, 8]" style="width: 100%">
        <a-col :span="6">
          <a-form-item label="预入仓库" required>
            <a-select
              v-model:value="headerForm.receivingWarehouse"
              size="small"
              show-search
              allow-clear
              placeholder="请选择"
              style="width: 100%"
              :options="warehouseOpts"
              :filter-option="filterSelectOption"
            />
          </a-form-item>
        </a-col>
        <a-col :span="6">
          <a-form-item label="期望到货时间" required>
            <a-date-picker
              v-model:value="headerForm.expectedArrivalDate"
              size="small"
              style="width: 100%"
              placeholder="请选择"
            />
          </a-form-item>
        </a-col>
        <a-col :span="6">
          <a-form-item label="紧急度" required>
            <a-select
              v-model:value="headerForm.urgency"
              size="small"
              style="width: 100%"
              :options="urgencyOpts"
            />
          </a-form-item>
        </a-col>
        <a-col :span="24">
          <a-form-item label="备注" class="remark-item">
            <a-textarea
              v-model:value="headerForm.remark"
              :rows="2"
              :maxlength="500"
              show-count
              placeholder="请输入备注"
            />
          </a-form-item>
        </a-col>
      </a-row>
    </a-form>

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
          <template v-else-if="column.key === 'designatedSupplier'">
            <a-switch
              v-model:checked="record.designatedSupplier"
              size="small"
              @change="(checked) => onDesignatedSupplierChange(record, checked)"
            />
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
              <a-select
                v-if="column.key === 'supplier'"
                v-model:value="record.supplier"
                size="small"
                show-search
                allow-clear
                placeholder="请选择"
                style="width: 100%"
                :open="selectOpen"
                :options="supplierOpts"
                :filter-option="filterSelectOption"
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

    <a-empty v-if="!rows.length" description="当前物料清单无供应型态为「外购件」的物料" />

    <template #footer>
      <a-button @click="handleCancel">取消</a-button>
      <a-button type="primary" :disabled="!rows.length" @click="handleSave">
        保存 ({{ rows.length }}条)
      </a-button>
    </template>
  </a-modal>
</template>

<script>
export default { name: 'GeneratePurchaseRequisitionModal' }
</script>

<script setup>
import { computed, reactive, ref, watch, nextTick } from 'vue'
import { SettingOutlined } from '@ant-design/icons-vue'
import { message } from 'ant-design-vue'
import dayjs from 'dayjs'
import { urgencyOptions } from '@/mock/workOrderOptions'
import { getWarehouseSelectOptions, warehouseState } from '@/store/warehouseStore'
import { planSupplierOptions } from '@/utils/productionPlanMaterial'
import { buildPurchaseRequisitionRows, resolveAssemblyDate } from '@/utils/material'
import { buildRequisitionFromPlanRows } from '@/store/purchaseRequisitionStore'

const props = defineProps({
  open: { type: Boolean, default: false },
  order: { type: Object, default: null },
  materials: { type: Array, default: () => [] },
})

const emit = defineEmits(['update:open', 'saved'])

const columnDefs = [
  { key: 'index', title: '序号', width: 56, total: false },
  { key: 'productName', title: '物品名称', width: 130, total: false },
  { key: 'code', title: '物品编码', width: 120, total: false },
  { key: 'spec', title: '规格型号', width: 130, total: false },
  { key: 'material', title: '材质', width: 70, total: false },
  { key: 'drawingNo', title: '图号', width: 100, total: false },
  { key: 'specAttr', title: '规格属性', width: 90, total: false },
  { key: 'materialType', title: '物料类型', width: 90, total: false },
  { key: 'designatedSupplier', title: '指定供应商', width: 96, total: false },
  { key: 'supplier', title: '供应商', width: 140, editable: true, total: false },
  { key: 'stockQty', title: '库存数量', width: 90, total: true, numeric: true },
  { key: 'availableStock', title: '可用库存', width: 90, total: true, numeric: true },
  { key: 'inTransitQty', title: '在途数量', width: 90, total: true, numeric: true },
  { key: 'demandQty', title: '需求数', width: 80, total: true, numeric: true },
  { key: 'gapQty', title: '缺口数', width: 80, total: true, numeric: true },
  { key: 'planQty', title: '计划数量', width: 90, editable: true, total: true, numeric: true },
  { key: 'unit', title: '计量单位', width: 90, total: false },
  { key: 'action', title: '操作', width: 72, total: false },
]

const headerForm = reactive({
  receivingWarehouse: undefined,
  expectedArrivalDate: null,
  urgency: '普通',
  remark: '',
})

const editableKeys = columnDefs.filter((c) => c.editable).map((c) => c.key)
const defaultVisibleKeys = columnDefs.map((c) => c.key)

const visibleKeys = ref([...defaultVisibleKeys])
const columnWidths = reactive(Object.fromEntries(columnDefs.map((c) => [c.key, c.width])))
const rows = ref([])
const editingCell = ref(null)
const tableWrapRef = ref(null)
const selectOpen = ref(false)

const supplierOpts = planSupplierOptions

const warehouseOpts = computed(() => {
  void warehouseState.warehouses
  return getWarehouseSelectOptions()
})

const urgencyOpts = urgencyOptions.map((v) => ({ label: v, value: v }))

const displayColumns = computed(() =>
  columnDefs
    .filter((c) => visibleKeys.value.includes(c.key))
    .map((c) => ({
      title: c.title,
      dataIndex: c.key,
      key: c.key,
      width: columnWidths[c.key],
      ellipsis: !c.editable && c.key !== 'action' && c.key !== 'designatedSupplier',
      total: c.total,
      fixed:
        c.key === 'action'
          ? 'right'
          : ['index', 'productName', 'code'].includes(c.key)
            ? 'left'
            : undefined,
      align: c.key === 'designatedSupplier' ? 'center' : undefined,
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

function resetHeaderForm(order, materials) {
  const defaultArrival = resolveAssemblyDate(order) || dayjs().add(14, 'day').format('YYYY-MM-DD')
  const defaultWarehouse =
    materials.map((m) => m.warehouse).find(Boolean) ||
    warehouseOpts.value[0]?.value ||
    undefined
  headerForm.receivingWarehouse = defaultWarehouse
  headerForm.expectedArrivalDate = dayjs(defaultArrival)
  headerForm.urgency = order?.urgency || '普通'
  headerForm.remark = order?.remark || ''
}

watch(
  () => props.open,
  (val) => {
    if (val && props.order) {
      rows.value = buildPurchaseRequisitionRows(props.materials, props.order)
      resetHeaderForm(props.order, props.materials)
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
    if (field === 'supplier') {
      selectOpen.value = true
    }
  })
}

function endEdit() {
  editingCell.value = null
  selectOpen.value = false
}

function onSelectOpenChange(open) {
  selectOpen.value = open
  if (!open) endEdit()
}

function filterSelectOption(input, option) {
  return (option?.label || '').toLowerCase().includes(input.toLowerCase())
}

function onDesignatedSupplierChange(record, checked) {
  if (!checked) return
  if (!record.supplier && supplierOpts.length) {
    record.supplier = supplierOpts[0].value
  }
}

function formatCell(record, key, text) {
  if (key === 'supplier' && !text) return '请选择'
  if (isEditable(key) && (text === '' || text == null)) return '-'
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
    message.warning('请至少保留一条采购明细')
    return
  }
  const invalidQty = rows.value.some((r) => !r.planQty || r.planQty <= 0)
  if (invalidQty) {
    message.warning('计划数量须大于 0')
    return
  }
  const missingSupplier = rows.value.find(
    (r) => r.designatedSupplier && !String(r.supplier || '').trim(),
  )
  if (missingSupplier) {
    message.warning(`「${missingSupplier.productName}」已指定供应商，请填写供应商`)
    return
  }
  if (!headerForm.receivingWarehouse) {
    message.warning('请选择预入仓库')
    return
  }
  if (!headerForm.expectedArrivalDate) {
    message.warning('请选择期望到货时间')
    return
  }
  if (!headerForm.urgency) {
    message.warning('请选择紧急度')
    return
  }

  const requisition = buildRequisitionFromPlanRows(rows.value, props.order, {
    receivingWarehouse: headerForm.receivingWarehouse,
    estimatedArrivalDate: headerForm.expectedArrivalDate.format('YYYY-MM-DD'),
    urgency: headerForm.urgency,
    remark: headerForm.remark,
  })
  emit('saved', requisition)
  message.success(
    `已成功生成采购申请 ${requisition.reqNo}，共 ${requisition.lineItems.length} 条明细`,
  )
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

.header-form {
  margin-bottom: 12px;
  padding: 12px 12px 4px;
  background: #fafafa;
  border-radius: 6px;

  :deep(.ant-form-item) {
    margin-bottom: 8px;
    width: 100%;
  }

  :deep(.ant-form-item-label > label) {
    font-size: 13px;
  }

  .remark-item :deep(.ant-form-item-control) {
    flex: 1;
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
