<template>
  <FormCreateShell
    :page-mode="pageMode"
    :open="open"
    :title="shellTitle"
    width="1400px"
    class="inbound-form-modal"
    @cancel="onShellCancel"
    @update:open="(val) => emit('update:open', val)"
  >
    <div class="form-layout">
      <div class="section-block">
        <div class="section-title">基本信息</div>
        <a-form :model="form" layout="inline" class="header-form horizontal-form">
          <a-row :gutter="[12, 12]" style="width: 100%">
            <a-col :span="8">
              <a-form-item label="入库单号">
                <a-input
                  v-model:value="form.docNo"
                  size="small"
                  placeholder="不填则系统自动生成"
                  :disabled="isEdit"
                />
              </a-form-item>
            </a-col>
            <a-col :span="8">
              <a-form-item label="入库类型" required>
                <a-select
                  v-model:value="form.inboundType"
                  size="small"
                  placeholder="请选择"
                  :options="inboundTypeOpts"
                />
              </a-form-item>
            </a-col>
            <a-col :span="8">
              <a-form-item label="入库日期">
                <a-date-picker
                  v-model:value="form.inboundDate"
                  size="small"
                  style="width: 100%"
                  placeholder="请选择入库日期"
                />
              </a-form-item>
            </a-col>
            <a-col :span="8">
              <a-form-item label="入库仓库">
                <a-select
                  v-model:value="form.warehouse"
                  allow-clear
                  size="small"
                  placeholder="请选择 入库仓库"
                  :options="warehouseOpts"
                  @change="onHeaderWarehouseChange"
                />
              </a-form-item>
            </a-col>
            <a-col :span="8">
              <a-form-item label="供应商">
                <a-select
                  v-model:value="form.supplier"
                  allow-clear
                  show-search
                  size="small"
                  placeholder="请选择 供应商"
                  :options="supplierOpts"
                />
              </a-form-item>
            </a-col>
            <a-col :span="8">
              <a-form-item label="送货日期">
                <a-date-picker
                  v-model:value="form.deliveryDate"
                  size="small"
                  style="width: 100%"
                  placeholder="请选择送货日期"
                />
              </a-form-item>
            </a-col>
            <a-col :span="8">
              <a-form-item label="经手人">
                <a-select
                  v-model:value="form.handler"
                  size="small"
                  show-search
                  :options="handlerOpts"
                />
              </a-form-item>
            </a-col>
            <a-col :span="8">
              <a-form-item label="发票号码">
                <a-input
                  v-model:value="form.invoiceNo"
                  size="small"
                  :maxlength="30"
                  show-count
                  placeholder="请输入发票号码"
                />
              </a-form-item>
            </a-col>
            <a-col :span="24">
              <a-form-item label="备注" class="remark-item">
                <a-textarea
                  v-model:value="form.remark"
                  :rows="2"
                  size="small"
                  :maxlength="200"
                  show-count
                  placeholder="请输入 备注"
                />
              </a-form-item>
            </a-col>
          </a-row>
        </a-form>
      </div>

      <div class="section-block section-block--lines">
        <div class="section-title">入库清单</div>
        <div class="line-toolbar">
          <a-space>
            <a-button type="primary" size="small" :loading="addingItems" @click="pickerOpen = true">
              <PlusOutlined />
              添加物品
            </a-button>
            <a-button size="small" @click="bomModalOpen = true">按BOM添加</a-button>
            <TableColumnSettingButton @click="columnDrawerOpen = true" />
          </a-space>
        </div>

        <div
          ref="lineTablePanelRef"
          class="line-table-panel"
          :class="{ 'panel-scrolling': isLineTableScrolling }"
          :style="lineTablePanelStyle"
        >
          <div class="line-table-body" :class="{ 'is-scrolling': isLineTableScrolling }">
            <a-table
              :columns="displayColumns"
              :data-source="form.lineItems"
              row-key="id"
              size="small"
              bordered
              :pagination="false"
              :scroll="lineTableScroll"
            >
              <template #bodyCell="{ column, record, index }">
                <template v-if="column.key === 'index'">{{ index + 1 }}</template>
                <template v-else-if="column.key === 'itemName'">
                  <span v-if="record.itemCode" class="item-name-text" :title="record.itemName">
                    [{{ record.itemCode }}] {{ record.itemName }}
                  </span>
                  <InventoryLineItemSelect
                    v-else
                    :value="record.itemCode"
                    :fallback-name="record.itemName"
                    @select="(item) => onLineItemSelect(record, item)"
                    @clear="onLineItemClear(record)"
                  />
                </template>
                <template v-else-if="column.key === 'stockQty'">
                  {{ formatQty(record.stockQty) }}
                </template>
                <template v-else-if="column.key === 'warehouseStockQty'">
                  {{ formatQty(record.warehouseStockQty) }}
                </template>
                <template v-else-if="column.key === 'warehouse'">
                  <InventoryLineEditableCell
                    :active="isLineCellEditing(record.id, 'warehouse')"
                    :display="lineWarehouseLabel(record.warehouse)"
                    :empty="!record.warehouse"
                    placeholder="请选择"
                    @activate="startLineCellEdit(record.id, 'warehouse', { select: true })"
                    @end="endLineCellEdit"
                  >
                    <template #edit="{ endEdit }">
                      <a-select
                        v-model:value="record.warehouse"
                        allow-clear
                        size="small"
                        placeholder="请选择"
                        style="width: 100%"
                        :open="lineCellSelectOpen"
                        :options="warehouseOpts"
                        @dropdownVisibleChange="onLineCellSelectOpenChange"
                        @change="
                          () => {
                            refreshLine(record)
                            endEdit()
                          }
                        "
                      />
                    </template>
                  </InventoryLineEditableCell>
                </template>
                <template v-else-if="column.key === 'locationNo'">
                  <InventoryLineEditableCell
                    :active="isLineCellEditing(record.id, 'locationNo')"
                    :display="record.locationNo || '—'"
                    :empty="!record.locationNo"
                    placeholder="请输入"
                    @activate="startLineCellEdit(record.id, 'locationNo')"
                    @end="endLineCellEdit"
                  >
                    <template #edit="{ endEdit }">
                      <a-input
                        v-model:value="record.locationNo"
                        size="small"
                        allow-clear
                        placeholder="请输入货位号"
                        autofocus
                        @blur="endEdit"
                        @pressEnter="endEdit"
                      />
                    </template>
                  </InventoryLineEditableCell>
                </template>
                <template v-else-if="column.key === 'qty'">
                  <InventoryLineEditableCell
                    :active="isLineCellEditing(record.id, 'qty')"
                    :display="formatQty(record.qty)"
                    :empty="record.qty == null || record.qty === ''"
                    numeric
                    @activate="startLineCellEdit(record.id, 'qty')"
                    @end="endLineCellEdit"
                  >
                    <template #edit="{ endEdit }">
                      <a-input-number
                        v-model:value="record.qty"
                        :min="0"
                        :precision="3"
                        size="small"
                        style="width: 100%"
                        autofocus
                        @blur="endEdit"
                        @pressEnter="endEdit"
                        @change="() => onLineQtyChange(record)"
                      />
                    </template>
                  </InventoryLineEditableCell>
                </template>
                <template v-else-if="column.key === 'weight'">
                  <InventoryLineEditableCell
                    :active="isLineCellEditing(record.id, 'weight')"
                    :display="formatQty(record.weight)"
                    :empty="record.weight == null || record.weight === ''"
                    placeholder="请输入"
                    numeric
                    @activate="startLineCellEdit(record.id, 'weight')"
                    @end="endLineCellEdit"
                  >
                    <template #edit="{ endEdit }">
                      <a-input-number
                        v-model:value="record.weight"
                        :min="0"
                        :precision="3"
                        size="small"
                        style="width: 100%"
                        autofocus
                        @blur="endEdit"
                        @pressEnter="endEdit"
                      />
                    </template>
                  </InventoryLineEditableCell>
                </template>
                <template v-else-if="column.key === 'unitPrice'">
                  <InventoryLineEditableCell
                    :active="isLineCellEditing(record.id, 'unitPrice')"
                    :display="formatMoney(record.unitPrice)"
                    :empty="record.unitPrice == null || record.unitPrice === ''"
                    numeric
                    @activate="startLineCellEdit(record.id, 'unitPrice')"
                    @end="endLineCellEdit"
                  >
                    <template #edit="{ endEdit }">
                      <a-input-number
                        v-model:value="record.unitPrice"
                        :min="0"
                        :precision="2"
                        size="small"
                        style="width: 100%"
                        autofocus
                        @blur="endEdit"
                        @pressEnter="endEdit"
                        @change="() => onLineUnitPriceChange(record)"
                      />
                    </template>
                  </InventoryLineEditableCell>
                </template>
                <template v-else-if="column.key === 'totalPrice'">
                  {{ formatMoney(record.totalPrice) }}
                </template>
                <template v-else-if="column.key === 'actions'">
                  <a-space :size="4">
                    <a @click="openLineEdit(record, 'edit')">编辑</a>
                    <a @click="openLineEdit(record, 'copy')">复制</a>
                    <a class="danger-link" @click="removeLine(record.id)">删除</a>
                  </a-space>
                </template>
              </template>
              <template #emptyText>
                <div class="line-empty-placeholder">暂无数据</div>
              </template>
            </a-table>
          </div>
          <InventoryLineTableFooter
            :columns="displayColumns"
            :scroll-x="lineScrollX"
            @add-line="addBlankLine"
          >
            <template #cell="{ column }">
              <template v-if="column.key === 'index'">合计</template>
              <template v-else-if="column.key === 'itemCode'"
                >项数 {{ lineSummary.lineCount }}</template
              >
              <template v-else-if="column.key === 'qty'">{{
                formatQty(lineSummary.qtyTotal)
              }}</template>
              <template v-else-if="column.key === 'weight'">{{
                formatQty(lineSummary.weightTotal)
              }}</template>
              <template v-else-if="column.key === 'totalPrice'">{{
                formatMoney(lineSummary.totalPrice)
              }}</template>
            </template>
          </InventoryLineTableFooter>
        </div>
      </div>
    </div>

    <template #footer>
      <a-button @click="onShellCancel">取消</a-button>
      <a-button type="primary" :loading="saving" @click="handleSave">
        <CheckOutlined />
        保存
      </a-button>
    </template>
  </FormCreateShell>

  <SelectBomMaterialModal
    v-if="isActive"
    v-model:open="pickerOpen"
    title="选择产品"
    hide-add-material
    ecn-new-material-mode
    @selected="onItemsPicked"
  />

  <AddByBomModal
    v-if="isActive"
    v-model:open="bomModalOpen"
    qty-label="入库数量"
    qty-hint="子项入库数量 = 入库数量 × 子件原单位用量"
    preview-tip="确定后将添加所选物品 BOM的 下级结构"
    modal-width="720px"
    @confirm="onBomAdded"
  />

  <InboundLineEditModal
    v-if="isActive"
    v-model:open="lineEditOpen"
    :line="lineEditTarget"
    :mode="lineEditMode"
    @confirm="onLineEditConfirm"
  />

  <TableColumnSettingDrawer
    v-model:open="columnDrawerOpen"
    v-model:settings="columnSettings"
    :default-settings="defaultColumnSettings"
    title="入库明细列设置"
  />
</template>

<script setup>
import { computed, reactive, ref, watch, nextTick } from 'vue'
import { Modal, message } from 'ant-design-vue'
import dayjs from 'dayjs'
import { PlusOutlined, CheckOutlined } from '@ant-design/icons-vue'
import FormCreateShell from '@/components/FormCreateShell.vue'
import TableColumnSettingDrawer from '@/components/TableColumnSettingDrawer.vue'
import TableColumnSettingButton from '@/components/TableColumnSettingButton.vue'
import { useFormCreateModal } from '@/composables/useFormCreateModal'
import { useInventoryLineTableScroll } from '@/composables/useInventoryLineTableScroll'
import { useInventoryLineCellEdit } from '@/composables/useInventoryLineCellEdit'
import { useTableColumnSettings } from '@/composables/useTableColumnSettings'
import SelectBomMaterialModal from '@/views/product-process/components/SelectBomMaterialModal.vue'
import AddByBomModal from '@/views/product-process/components/AddByBomModal.vue'
import InboundLineEditModal from './InboundLineEditModal.vue'
import InventoryLineItemSelect from './InventoryLineItemSelect.vue'
import InventoryLineEditableCell from './InventoryLineEditableCell.vue'
import InventoryLineTableFooter from './InventoryLineTableFooter.vue'
import { inboundTypeOptions, handlerOptions } from '@/mock/inboundOptions'
import { supplierOptions } from '@/mock/purchaseRequisitionOptions'
import { getWarehouseSelectOptions, warehouseState } from '@/store/warehouseStore'
import {
  addInboundOrder,
  updateInboundOrder,
  resolveWarehouseKeeper,
} from '@/store/inboundOrderStore'
import { inboundFormLineColumns } from '@/utils/inboundLineColumns'
import { normalizeInventoryPickerItem } from '@/utils/inventoryLineItemPicker'
import { warehouseOptionLabel } from '@/utils/inventoryFormLineDisplay'
import {
  applyPickerItemToInboundLine,
  buildInboundLineFromPickerItem,
  buildInboundLinesFromBom,
  cloneInboundLine,
  createBlankInboundLine,
  enrichInboundLine,
  mergeInboundLines,
  syncInboundLineTotalFromUnit,
} from '@/utils/inboundLineHelpers'

const props = defineProps({
  open: { type: Boolean, default: false },
  pageMode: { type: Boolean, default: false },
  listPath: { type: String, default: '' },
  editRecord: { type: Object, default: null },
})

const emit = defineEmits(['update:open', 'saved'])

const isEdit = computed(() => Boolean(props.editRecord?.id))

const {
  isActive,
  shellTitle,
  handleCancel: onShellCancel,
  closeAfterSave,
} = useFormCreateModal(props, emit, {
  listPath: '/inventory/inbound',
  getTitle: () => (isEdit.value ? '编辑入库单' : '新增入库单'),
})

const saving = ref(false)
const addingItems = ref(false)
const pickerOpen = ref(false)
const bomModalOpen = ref(false)
const lineEditOpen = ref(false)
const lineEditTarget = ref(null)
const lineEditMode = ref('edit')
const lineEditSourceId = ref(null)
const prevHeaderWarehouse = ref(undefined)

const inboundTypeOpts = inboundTypeOptions.map((v) => ({ label: v, value: v }))
const handlerOpts = handlerOptions.map((v) => ({ label: v, value: v }))
const supplierOpts = supplierOptions

const warehouseOpts = computed(() => {
  void warehouseState.warehouses
  return getWarehouseSelectOptions()
})

function lineWarehouseLabel(value) {
  return warehouseOptionLabel(value, warehouseOpts.value)
}

const {
  selectOpen: lineCellSelectOpen,
  isEditing: isLineCellEditing,
  startEdit: startLineCellEdit,
  endEdit: endLineCellEdit,
  onSelectOpenChange: onLineCellSelectOpenChange,
} = useInventoryLineCellEdit()

const form = reactive({
  docNo: '',
  inboundType: '其他入库',
  warehouse: undefined,
  inboundDate: dayjs(),
  supplier: undefined,
  deliveryDate: undefined,
  handler: 'admin1',
  invoiceNo: '',
  remark: '',
  lineItems: [],
})

const { columnSettings, columnDrawerOpen, displayColumns, tableScrollX, defaultColumnSettings } =
  useTableColumnSettings('inbound-form-lines-v2', inboundFormLineColumns, {
    minScrollX: 1850,
    pinEdgeColumns: false,
    pinActionColumn: true,
  })

const lineScrollX = tableScrollX

const lineSummary = computed(() => {
  const lines = form.lineItems.filter((l) => l.itemCode)
  const qtyTotal = lines.reduce((sum, line) => sum + (Number(line.qty) || 0), 0)
  const weightTotal = lines.reduce((sum, line) => sum + (Number(line.weight) || 0), 0)
  const totalPrice = lines.reduce((sum, line) => sum + (Number(line.totalPrice) || 0), 0)
  return {
    lineCount: lines.length,
    qtyTotal: Math.round(qtyTotal * 1000) / 1000,
    weightTotal: Math.round(weightTotal * 1000) / 1000,
    totalPrice: Math.round(totalPrice * 100) / 100,
  }
})

const {
  panelRef: lineTablePanelRef,
  panelStyle: lineTablePanelStyle,
  tableScroll: lineTableScroll,
  isScrolling: isLineTableScrolling,
  updateScrollY,
} = useInventoryLineTableScroll({
  scrollX: lineScrollX,
  getRowCount: () => form.lineItems.length,
})

watch(
  () => isActive.value,
  (visible) => {
    if (visible) nextTick(updateScrollY)
  },
)

watch(
  () => [isActive.value, props.editRecord?.id],
  ([visible]) => {
    if (!visible) return
    if (props.editRecord) loadEditForm(props.editRecord)
    else resetForm()
  },
  { immediate: true },
)

function resetForm() {
  endLineCellEdit()
  Object.assign(form, {
    docNo: '',
    inboundType: '其他入库',
    warehouse: undefined,
    inboundDate: dayjs(),
    supplier: undefined,
    deliveryDate: undefined,
    handler: 'admin1',
    invoiceNo: '',
    remark: '',
    lineItems: [],
  })
  prevHeaderWarehouse.value = undefined
}

function loadEditForm(record) {
  endLineCellEdit()
  prevHeaderWarehouse.value = record.warehouse || undefined
  Object.assign(form, {
    docNo: record.docNo,
    inboundType: record.inboundType,
    warehouse: record.warehouse || undefined,
    inboundDate: record.inboundDate ? dayjs(record.inboundDate) : dayjs(),
    supplier: record.supplier,
    deliveryDate: record.deliveryDate ? dayjs(record.deliveryDate) : undefined,
    handler: record.handler || 'admin1',
    invoiceNo: record.invoiceNo || '',
    remark: record.remark || '',
    lineItems: (record.lineItems || []).map((l) => enrichInboundLine({ ...l })),
  })
}

function formatQty(val) {
  if (val == null || val === '') return '—'
  return Number(val).toLocaleString(undefined, { maximumFractionDigits: 3 })
}

function formatMoney(val) {
  if (val == null || val === '') return '—'
  return Number(val).toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })
}

function refreshLine(line) {
  Object.assign(line, enrichInboundLine(line))
}

function onLineQtyChange(line) {
  syncInboundLineTotalFromUnit(line)
}

function onLineUnitPriceChange(line) {
  syncInboundLineTotalFromUnit(line)
}

function onHeaderWarehouseChange(newVal) {
  const oldVal = prevHeaderWarehouse.value
  const changed = newVal !== oldVal
  prevHeaderWarehouse.value = newVal

  if (!changed || !newVal || !form.lineItems.length) return

  Modal.confirm({
    title: '入库仓库已修改，是否同步修改明细仓库？',
    okText: '是',
    cancelText: '否',
    onOk: () => {
      form.lineItems.forEach((line) => {
        line.warehouse = newVal
        refreshLine(line)
      })
    },
  })
}

function onItemsPicked(items) {
  const list = Array.isArray(items) ? items : [items]
  if (!list.length) {
    message.warning('未选择物品')
    return
  }
  addingItems.value = true
  pickerOpen.value = false
  nextTick(() => {
    try {
      const before = form.lineItems.length
      const incoming = list
        .filter((it) => it?.code)
        .map((it) =>
          buildInboundLineFromPickerItem(normalizeInventoryPickerItem(it), form.warehouse || ''),
        )
      if (!incoming.length) {
        message.warning('所选物品无效，请重新选择')
        return
      }
      form.lineItems = mergeInboundLines(form.lineItems, incoming)
      const added = form.lineItems.length - before
      if (added > 0) message.success(`已添加 ${added} 条明细`)
      else message.info('所选物品已在明细中')
    } finally {
      addingItems.value = false
    }
  })
}

function addBlankLine() {
  form.lineItems.push(createBlankInboundLine(form.warehouse || ''))
}

function onLineItemSelect(record, item) {
  if (!item?.code) return
  const duplicate = form.lineItems.find((l) => l.id !== record.id && l.itemCode === item.code)
  if (duplicate) {
    message.warning('该物品已在明细中')
    return
  }
  Object.assign(record, applyPickerItemToInboundLine(record, item, form.warehouse || ''))
}

function onLineItemClear(record) {
  record.itemCode = ''
  record.itemName = ''
  record.itemId = ''
  record.itemType = ''
  record.specAttr = ''
  record.specModel = ''
  record.material = ''
  record.drawingNo = ''
  record.stockQty = null
  record.warehouseStockQty = null
}

function onBomAdded({ pickerRow, usageCoefficient }) {
  const incoming = buildInboundLinesFromBom(
    pickerRow,
    usageCoefficient,
    form.warehouse || '',
    false,
  )
  if (!incoming.length) {
    message.warning('未找到可添加的 BOM 明细')
    return
  }
  form.lineItems = mergeInboundLines(form.lineItems, incoming)
  message.success(`已添加 ${incoming.length} 条明细`)
}

function openLineEdit(record, mode) {
  lineEditSourceId.value = record.id
  lineEditTarget.value = { ...record }
  lineEditMode.value = mode
  lineEditOpen.value = true
}

function onLineEditConfirm(updated) {
  const enriched = enrichInboundLine(updated)
  if (lineEditMode.value === 'copy') {
    form.lineItems.push(cloneInboundLine(enriched))
    return
  }
  const idx = form.lineItems.findIndex((l) => l.id === lineEditSourceId.value)
  if (idx !== -1) form.lineItems[idx] = { ...form.lineItems[idx], ...enriched }
}

function removeLine(id) {
  form.lineItems = form.lineItems.filter((l) => l.id !== id)
}

function buildPayload() {
  return {
    docNo: form.docNo?.trim(),
    inboundType: form.inboundType,
    warehouse: form.warehouse || '',
    warehouseKeeper: resolveWarehouseKeeper(form.warehouse),
    inboundDate: form.inboundDate?.format?.('YYYY-MM-DD') || dayjs().format('YYYY-MM-DD'),
    deliveryDate: form.deliveryDate?.format?.('YYYY-MM-DD') || '',
    supplier: form.supplier,
    handler: form.handler,
    invoiceNo: form.invoiceNo?.trim(),
    remark: form.remark?.trim(),
    lineItems: form.lineItems.filter((l) => l.itemCode).map((l) => enrichInboundLine({ ...l })),
  }
}

function handleSave() {
  if (!form.inboundType) {
    message.warning('请选择入库类型')
    return
  }
  const validLines = form.lineItems.filter((l) => l.itemCode)
  if (!validLines.length) {
    message.warning('请至少添加一条有效明细')
    return
  }

  saving.value = true
  const payload = buildPayload()

  if (isEdit.value) {
    const res = updateInboundOrder(props.editRecord.id, payload)
    saving.value = false
    if (!res.ok) {
      message.warning(res.message)
      return
    }
    message.success('入库单已更新')
  } else {
    addInboundOrder(payload)
    saving.value = false
    message.success('入库单已创建')
  }

  emit('saved')
  closeAfterSave()
}
</script>

<style lang="less">
@import '@/views/inventory/components/inventoryLineTablePanel.less';
</style>

<style lang="less" scoped>
:deep(.form-create-page.inbound-form-modal) {
  display: flex;
  flex-direction: column;
  height: calc(100vh - 112px);
  max-height: calc(100vh - 112px);
  min-height: 0;
  overflow: hidden;
  padding-bottom: 0;

  .form-body {
    flex: 1;
    min-height: 0;
    min-width: 0;
    overflow: hidden;
    display: flex;
    flex-direction: column;
    padding-bottom: 12px;
  }
}

:deep(.ant-modal.inbound-form-modal) {
  .ant-modal-body {
    max-height: calc(100vh - 160px);
    overflow: hidden;
    display: flex;
    flex-direction: column;
    min-height: 0;
    padding-bottom: 12px;
  }

  .form-layout {
    flex: 1;
    min-height: 0;
    min-width: 0;
    overflow: hidden;
  }
}

.form-layout {
  flex: 1;
  min-height: 0;
  min-width: 0;
  display: flex;
  flex-direction: column;
}

.section-block {
  background: #fff;
  border-radius: 6px;
  padding: 16px;
  margin-bottom: 12px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
  flex-shrink: 0;

  .section-title {
    font-size: 14px;
    font-weight: 600;
    margin-bottom: 12px;
    color: #1f1f1f;
  }

  &.section-block--lines {
    flex: 1;
    min-height: 0;
    min-width: 0;
    display: flex;
    flex-direction: column;
    margin-bottom: 0;
  }
}

.header-form {
  flex-shrink: 0;

  :deep(.ant-form-item) {
    margin-bottom: 0;
    width: 100%;
  }

  :deep(.remark-item .ant-form-item-label) {
    flex: 0 0 72px;
    align-self: flex-start;
  }
}

.line-toolbar {
  flex-shrink: 0;
  margin-bottom: 8px;
}

.item-name-text {
  display: block;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-size: 13px;
  color: rgba(0, 0, 0, 0.88);
}

:deep(.ant-table-tbody > tr > td) {
  padding: 4px 8px !important;
}
</style>
