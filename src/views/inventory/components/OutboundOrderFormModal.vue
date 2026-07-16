<template>
  <FormCreateShell
    :page-mode="pageMode"
    :open="open"
    :title="shellTitle"
    width="1400px"
    class="outbound-form-modal"
    @cancel="handleCancel"
    @update:open="(val) => emit('update:open', val)"
  >
    <div class="form-layout">
      <div class="section-block">
        <div class="section-title">基本信息</div>
        <a-form :model="form" layout="inline" class="header-form horizontal-form">
          <a-row :gutter="[12, 12]" style="width: 100%">
            <a-col :span="8">
              <a-form-item label="出库单号" required>
                <a-input
                  v-model:value="form.docNo"
                  size="small"
                  placeholder="请输入出库单号"
                  :disabled="isEdit"
                />
              </a-form-item>
            </a-col>
            <a-col :span="8">
              <a-form-item label="出库类型" required>
                <a-select
                  v-model:value="form.outboundType"
                  size="small"
                  placeholder="请选择 出库类型"
                  :options="outboundTypeOpts"
                  :disabled="lockOutboundType"
                />
              </a-form-item>
            </a-col>
            <a-col :span="8">
              <a-form-item label="出库时间">
                <a-date-picker
                  v-model:value="form.outboundTime"
                  show-time
                  size="small"
                  format="YYYY-MM-DD HH:mm:ss"
                  value-format="YYYY-MM-DD HH:mm:ss"
                  style="width: 100%"
                  placeholder="请选择出库时间"
                  allow-clear
                />
              </a-form-item>
            </a-col>
            <a-col :span="8">
              <a-form-item label="出库仓库">
                <a-select
                  v-model:value="form.warehouse"
                  allow-clear
                  size="small"
                  placeholder="请选择 出库仓库"
                  :options="warehouseOpts"
                  @change="onHeaderWarehouseChange"
                />
              </a-form-item>
            </a-col>
            <a-col v-if="!isSalesOutbound" :span="8">
              <a-form-item label="领用部门">
                <a-select
                  v-model:value="form.requisitionDept"
                  allow-clear
                  size="small"
                  placeholder="请选择 领用部门"
                  :options="requisitionDeptOpts"
                />
              </a-form-item>
            </a-col>
            <a-col :span="8">
              <a-form-item label="出库总重量(kg)">
                <a-input-number
                  v-model:value="form.totalWeight"
                  :min="0"
                  :precision="3"
                  size="small"
                  style="width: 100%"
                />
              </a-form-item>
            </a-col>
            <a-col :span="8">
              <a-form-item label="销售订单">
                <a-input-group compact>
                  <a-input
                    :value="form.salesOrderNo"
                    readonly
                    size="small"
                    :style="{ width: lockSalesOrder ? '100%' : 'calc(100% - 72px)' }"
                    placeholder="请选择销售订单"
                  />
                  <a-button
                    v-if="!lockSalesOrder"
                    size="small"
                    @click="salesOrderPickerOpen = true"
                  >
                    选择
                  </a-button>
                </a-input-group>
              </a-form-item>
            </a-col>
            <a-col v-if="!isSalesOutbound" :span="8">
              <a-form-item label="合同编号">
                <a-input
                  v-model:value="form.contractNo"
                  allow-clear
                  size="small"
                  placeholder="请输入合同编号"
                />
              </a-form-item>
            </a-col>
            <a-col v-if="isSalesOutbound && form.salesOrderNo" :span="24">
              <div class="sales-order-summary">
                <span>客户名称：{{ form.customerName || '—' }}</span>
                <span class="summary-sep">/</span>
                <span>合同编号：{{ form.contractNo || '—' }}</span>
                <span class="summary-sep">/</span>
                <span>交货方式：{{ form.deliveryMethod || '—' }}</span>
                <span class="summary-sep">/</span>
                <span>业务员：{{ form.salesperson || '—' }}</span>
              </div>
            </a-col>
            <a-col v-else-if="form.salesOrderNo" :span="24">
              <div class="sales-order-summary">
                <span>客户名称：{{ form.customerName || '—' }}</span>
                <span class="summary-sep">/</span>
                <span>业务员：{{ form.salesperson || '—' }}</span>
              </div>
            </a-col>
            <a-col v-if="isFromDelivery" :span="24">
              <a-form-item label="发货备注" class="remark-item">
                <a-textarea
                  :value="form.deliveryRemark"
                  :rows="2"
                  size="small"
                  disabled
                  placeholder="—"
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
        <div class="section-title">出库清单</div>
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
                <template v-else-if="column.key === 'shipWarehouse'">
                  <InventoryLineEditableCell
                    :active="isLineCellEditing(record.id, 'shipWarehouse')"
                    :display="lineWarehouseLabel(record.shipWarehouse)"
                    :empty="!record.shipWarehouse"
                    placeholder="请选择"
                    @activate="startLineCellEdit(record.id, 'shipWarehouse', { select: true })"
                    @end="endLineCellEdit"
                  >
                    <template #edit="{ endEdit }">
                      <a-select
                        v-model:value="record.shipWarehouse"
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
                  {{ record.locationNo || '—' }}
                </template>
                <template v-else-if="column.key === 'shipQty'">
                  <InventoryLineEditableCell
                    :active="isLineCellEditing(record.id, 'shipQty')"
                    :display="formatQty(record.shipQty)"
                    :empty="record.shipQty == null || record.shipQty === ''"
                    numeric
                    @activate="startLineCellEdit(record.id, 'shipQty')"
                    @end="endLineCellEdit"
                  >
                    <template #edit="{ endEdit }">
                      <a-input-number
                        v-model:value="record.shipQty"
                        :min="0"
                        :precision="3"
                        size="small"
                        style="width: 100%"
                        autofocus
                        @blur="endEdit"
                        @pressEnter="endEdit"
                        @change="() => onLineShipQtyChange(record)"
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
                        placeholder="请输入"
                        autofocus
                        @blur="endEdit"
                        @pressEnter="endEdit"
                        @change="syncTotalWeight"
                      />
                    </template>
                  </InventoryLineEditableCell>
                </template>
                <template v-else-if="column.key === 'barcodeBatchNo'">
                  <span>{{ record.barcodeBatchNo || '—' }}</span>
                </template>
                <template v-else-if="column.key === 'packagingForm'">
                  <span :title="record.packagingForm || ''">{{ record.packagingForm || '—' }}</span>
                </template>
                <template v-else-if="column.key === 'deliveryRemark'">
                  <a-tooltip v-if="record.deliveryRemark" :title="record.deliveryRemark">
                    <span class="delivery-remark-cell">{{ record.deliveryRemark }}</span>
                  </a-tooltip>
                  <span v-else>—</span>
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
              <template v-else-if="column.key === 'shipQty'">
                {{ formatQty(lineSummary.shipQtyTotal) }}
              </template>
              <template v-else-if="column.key === 'weight'">
                {{ formatQty(lineSummary.weightTotal) }}
              </template>
              <template v-else-if="column.key === 'totalPrice'">
                {{ formatMoney(lineSummary.totalPrice) }}
              </template>
            </template>
          </InventoryLineTableFooter>
        </div>
      </div>
    </div>

    <template #footer>
      <a-button @click="handleCancel">取消</a-button>
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
    own-active-only
    qty-label="出库数量"
    qty-hint="子项出库数量 = 出库数量 × 子件原单位用量"
    preview-tip="确定后将添加所选物品自有生效 BOM 的下级结构"
    modal-width="720px"
    @confirm="onBomAdded"
  />

  <OutboundLineEditModal
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
    title="出库明细列设置"
  />

  <SalesOrderSelectModal v-model:open="salesOrderPickerOpen" @confirm="onSalesOrderPicked" />
</template>

<script setup>
import { computed, reactive, ref, watch, nextTick } from 'vue'
import { Modal, message } from 'ant-design-vue'
import dayjs from 'dayjs'
import { CheckOutlined, PlusOutlined } from '@ant-design/icons-vue'
import FormCreateShell from '@/components/FormCreateShell.vue'
import TableColumnSettingDrawer from '@/components/TableColumnSettingDrawer.vue'
import TableColumnSettingButton from '@/components/TableColumnSettingButton.vue'
import { useFormCreateModal } from '@/composables/useFormCreateModal'
import { useInventoryLineTableScroll } from '@/composables/useInventoryLineTableScroll'
import { useInventoryLineCellEdit } from '@/composables/useInventoryLineCellEdit'
import { useTableColumnSettings } from '@/composables/useTableColumnSettings'
import SelectBomMaterialModal from '@/views/product-process/components/SelectBomMaterialModal.vue'
import AddByBomModal from '@/views/product-process/components/AddByBomModal.vue'
import OutboundLineEditModal from './OutboundLineEditModal.vue'
import InventoryLineItemSelect from './InventoryLineItemSelect.vue'
import InventoryLineEditableCell from './InventoryLineEditableCell.vue'
import InventoryLineTableFooter from './InventoryLineTableFooter.vue'
import { outboundTypeOptions, requisitionDeptOptions } from '@/mock/outboundOptions'
import { getWarehouseSelectOptions, warehouseState } from '@/store/warehouseStore'
import { addOutboundOrder, generateOutboundNo, updateOutboundOrder } from '@/store/outboundStore'
import { outboundFormLineColumns } from '@/utils/outboundLineColumns'
import { normalizeInventoryPickerItem } from '@/utils/inventoryLineItemPicker'
import { warehouseOptionLabel } from '@/utils/inventoryFormLineDisplay'
import {
  applyPickerItemToOutboundLine,
  buildOutboundLineFromPickerItem,
  buildOutboundLinesFromBom,
  cloneOutboundLine,
  createBlankOutboundLine,
  enrichOutboundLine,
  mergeOutboundLines,
  syncLineTotalFromUnit,
} from '@/utils/outboundLineHelpers'
import SalesOrderSelectModal from '@/views/production/components/SalesOrderSelectModal.vue'
import { findSalesOrderByOrderNo, getSalesOrderById } from '@/store/salesOrderStore'
import { getDeliveryOrderById, getDeliveryOrderByCode } from '@/store/deliveryOrderStore'

const props = defineProps({
  open: { type: Boolean, default: false },
  pageMode: { type: Boolean, default: false },
  listPath: { type: String, default: '' },
  editRecord: { type: Object, default: null },
})

const emit = defineEmits(['update:open', 'saved'])

const isEdit = computed(() => Boolean(props.editRecord?.id))
const isFromDelivery = computed(() =>
  Boolean(props.editRecord?.linkedDeliveryId || props.editRecord?.linkedDeliveryCode),
)
const isSalesOutbound = computed(() => form.outboundType === '销售出库')
const lockOutboundType = computed(() => isFromDelivery.value)
const lockSalesOrder = computed(() => isFromDelivery.value)

const { isActive, shellTitle, handleCancel, closeAfterSave } = useFormCreateModal(props, emit, {
  listPath: '/inventory/outbound',
  getTitle: () => (isEdit.value ? '编辑出库单' : '新增出库单'),
})

const saving = ref(false)
const addingItems = ref(false)
const pickerOpen = ref(false)
const bomModalOpen = ref(false)
const lineEditOpen = ref(false)
const lineEditTarget = ref(null)
const lineEditMode = ref('edit')
const lineEditSourceId = ref(null)
const totalWeightManual = ref(false)
const prevHeaderWarehouse = ref(undefined)
const salesOrderPickerOpen = ref(false)

const outboundTypeOpts = outboundTypeOptions.map((v) => ({ label: v, value: v }))
const requisitionDeptOpts = requisitionDeptOptions.map((v) => ({ label: v, value: v }))

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
  outboundType: '其他出库',
  outboundTime: dayjs().format('YYYY-MM-DD HH:mm:ss'),
  warehouse: undefined,
  handler: 'admin1',
  requisitionDept: '默认工厂',
  totalWeight: 0,
  salesOrderId: '',
  salesOrderNo: '',
  customerName: '',
  salesperson: '',
  contractNo: '',
  deliveryMethod: '',
  deliveryRemark: '',
  remark: '',
  lineItems: [],
})

const baseLineColumns = outboundFormLineColumns

const { columnSettings, columnDrawerOpen, displayColumns, tableScrollX, defaultColumnSettings } =
  useTableColumnSettings('outbound-form-lines-v2', baseLineColumns, {
    minScrollX: 1806,
    pinEdgeColumns: false,
    pinActionColumn: true,
  })

const lineScrollX = tableScrollX

const lineSummary = computed(() => {
  const lines = form.lineItems.filter((l) => l.itemCode)
  const shipQtyTotal = lines.reduce((sum, line) => sum + (Number(line.shipQty) || 0), 0)
  const weightTotal = lines.reduce((sum, line) => sum + (Number(line.weight) || 0), 0)
  const totalPrice = lines.reduce((sum, line) => sum + (Number(line.totalPrice) || 0), 0)
  return {
    lineCount: lines.length,
    shipQtyTotal: Math.round(shipQtyTotal * 1000) / 1000,
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

function normalizeOutboundTime(value) {
  if (!value) return dayjs().format('YYYY-MM-DD HH:mm:ss')
  const parsed = dayjs(value)
  if (!parsed.isValid()) return dayjs().format('YYYY-MM-DD HH:mm:ss')
  return parsed.format('YYYY-MM-DD HH:mm:ss')
}

function syncSalesOrderMeta(orderNo, orderId) {
  const order = (orderId && getSalesOrderById(orderId)) || findSalesOrderByOrderNo(orderNo) || null
  form.customerName = order?.customerName || ''
  form.salesperson = order?.salesperson || ''
  form.deliveryMethod = order?.deliveryMethod || ''
  form.contractNo = order?.contractNo || ''
  if (order?.id) form.salesOrderId = order.id
}

function resolveLinkedDelivery(record) {
  if (!record) return null
  return (
    (record.linkedDeliveryId && getDeliveryOrderById(record.linkedDeliveryId)) ||
    (record.linkedDeliveryCode && getDeliveryOrderByCode(record.linkedDeliveryCode)) ||
    (record.sourceOrderNo && getDeliveryOrderByCode(record.sourceOrderNo)) ||
    null
  )
}

function onSalesOrderPicked(order) {
  form.salesOrderId = order.id
  form.salesOrderNo = order.orderNo
  form.customerName = order.customerName || ''
  form.salesperson = order.salesperson || ''
  form.deliveryMethod = order.deliveryMethod || ''
  form.contractNo = order.contractNo || ''
}

function loadEditForm(record) {
  endLineCellEdit()
  totalWeightManual.value = true
  prevHeaderWarehouse.value = record.warehouse || undefined
  const delivery = resolveLinkedDelivery(record)
  Object.assign(form, {
    docNo: record.docNo,
    outboundType: record.outboundType,
    outboundTime: normalizeOutboundTime(record.outboundTime || record.createdAt),
    warehouse: record.warehouse || undefined,
    handler: record.handler || 'admin1',
    requisitionDept: record.requisitionDept || '默认工厂',
    totalWeight: record.totalWeight ?? 0,
    salesOrderId: record.salesOrderId || '',
    salesOrderNo: record.salesOrderNo || '',
    customerName: record.customerName || '',
    salesperson: record.salesperson || '',
    contractNo: record.contractNo || '',
    deliveryMethod: '',
    deliveryRemark: delivery?.remark || '',
    remark: record.remark || '',
    lineItems: (record.lineItems || []).map((l) => enrichOutboundLine({ ...l })),
  })
  if (form.salesOrderNo) {
    syncSalesOrderMeta(form.salesOrderNo, form.salesOrderId)
  }
}

function resetForm() {
  endLineCellEdit()
  totalWeightManual.value = false
  Object.assign(form, {
    docNo: generateOutboundNo(),
    outboundType: '其他出库',
    outboundTime: dayjs().format('YYYY-MM-DD HH:mm:ss'),
    warehouse: undefined,
    handler: 'admin1',
    requisitionDept: '默认工厂',
    totalWeight: 0,
    salesOrderId: '',
    salesOrderNo: '',
    customerName: '',
    salesperson: '',
    contractNo: '',
    deliveryMethod: '',
    deliveryRemark: '',
    remark: '',
    lineItems: [],
  })
  prevHeaderWarehouse.value = undefined
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
  Object.assign(line, enrichOutboundLine(line))
}

function onLineShipQtyChange(line) {
  syncLineTotalFromUnit(line)
  syncTotalWeight()
}

function onLineUnitPriceChange(line) {
  syncLineTotalFromUnit(line)
}

function onHeaderWarehouseChange(newVal) {
  const oldVal = prevHeaderWarehouse.value
  const changed = newVal !== oldVal

  prevHeaderWarehouse.value = newVal

  if (!changed || !newVal || !form.lineItems.length) {
    return
  }

  Modal.confirm({
    title: '出库仓库已修改，是否同步修改明细仓库？',
    okText: '是',
    cancelText: '否',
    onOk: () => {
      form.lineItems.forEach((line) => {
        line.shipWarehouse = newVal
        refreshLine(line)
      })
    },
  })
}

function calcLineWeightTotal() {
  return form.lineItems.reduce((sum, line) => sum + (Number(line.weight) || 0), 0)
}

function syncTotalWeight() {
  if (totalWeightManual.value) return
  form.totalWeight = Math.round(calcLineWeightTotal() * 1000) / 1000
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
          buildOutboundLineFromPickerItem(normalizeInventoryPickerItem(it), form.warehouse || ''),
        )
      if (!incoming.length) {
        message.warning('所选物品无效，请重新选择')
        return
      }
      form.lineItems = mergeOutboundLines(form.lineItems, incoming)
      syncTotalWeight()
      const added = form.lineItems.length - before
      if (added > 0) {
        message.success(`已添加 ${added} 条明细`)
      } else {
        message.info('所选物品已在明细中')
      }
    } finally {
      addingItems.value = false
    }
  })
}

function addBlankLine() {
  form.lineItems.push(createBlankOutboundLine(form.warehouse || ''))
}

function onLineItemSelect(record, item) {
  if (!item?.code) return
  const duplicate = form.lineItems.find((l) => l.id !== record.id && l.itemCode === item.code)
  if (duplicate) {
    message.warning('该物品已在明细中')
    return
  }
  Object.assign(record, applyPickerItemToOutboundLine(record, item, form.warehouse || ''))
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
  const incoming = buildOutboundLinesFromBom(
    pickerRow,
    usageCoefficient,
    form.warehouse || '',
    false,
  )
  if (!incoming.length) {
    message.warning('该物品无自有生效 BOM 明细，请先维护 SKU 产品 BOM')
    return
  }
  form.lineItems = mergeOutboundLines(form.lineItems, incoming)
  syncTotalWeight()
  message.success(`已添加 ${incoming.length} 条明细`)
}

function openLineEdit(record, mode) {
  lineEditSourceId.value = record.id
  lineEditTarget.value = { ...record }
  lineEditMode.value = mode
  lineEditOpen.value = true
}

function onLineEditConfirm(updated) {
  const enriched = enrichOutboundLine(updated)
  if (lineEditMode.value === 'copy') {
    form.lineItems.push(cloneOutboundLine(enriched))
    syncTotalWeight()
    return
  }
  const idx = form.lineItems.findIndex((l) => l.id === lineEditSourceId.value)
  if (idx !== -1) {
    form.lineItems[idx] = { ...form.lineItems[idx], ...enriched }
  }
  syncTotalWeight()
}

function removeLine(id) {
  form.lineItems = form.lineItems.filter((l) => l.id !== id)
  syncTotalWeight()
}

function buildPayload() {
  return {
    docNo: form.docNo?.trim(),
    outboundType: form.outboundType,
    outboundTime: normalizeOutboundTime(form.outboundTime),
    warehouse: form.warehouse || '',
    handler: form.handler,
    requisitionDept: isSalesOutbound.value ? '' : form.requisitionDept || '',
    totalWeight: form.totalWeight,
    salesOrderNo: form.salesOrderNo?.trim() || '',
    salesOrderId: form.salesOrderId || '',
    contractNo: form.contractNo?.trim() || '',
    customerName: form.customerName || '',
    remark: form.remark?.trim(),
    lineItems: form.lineItems.filter((l) => l.itemCode).map((l) => enrichOutboundLine({ ...l })),
  }
}

function handleSave() {
  if (!form.outboundType) {
    message.warning('请选择出库类型')
    return
  }
  if (!form.docNo?.trim()) {
    message.warning('请输入出库单号')
    return
  }
  if (!form.lineItems.filter((l) => l.itemCode).length) {
    message.warning('请至少添加一条有效明细')
    return
  }

  saving.value = true
  const res = isEdit.value
    ? updateOutboundOrder(props.editRecord.id, buildPayload())
    : addOutboundOrder(buildPayload())
  saving.value = false
  if (!res.ok) {
    message.warning(res.message)
    return
  }
  message.success(isEdit.value ? '出库单已更新' : '出库单已创建')
  emit('saved', res.order)
  closeAfterSave()
}
</script>

<style lang="less">
@import '@/views/inventory/components/inventoryLineTablePanel.less';
</style>

<style lang="less" scoped>
:deep(.form-create-page.outbound-form-modal) {
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

:deep(.ant-modal.outbound-form-modal) {
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

  :deep(.ant-form-item-row) {
    flex-wrap: nowrap;
    align-items: center;
  }

  :deep(.remark-item .ant-form-item-label) {
    flex: 0 0 88px;
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

.delivery-remark-cell {
  display: inline-block;
  max-width: 100%;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  vertical-align: bottom;
}

:deep(.ant-table-tbody > tr > td) {
  padding: 4px 8px !important;
}

.sales-order-summary {
  margin: -4px 0 8px;
  padding: 6px 10px;
  font-size: 12px;
  color: rgba(0, 0, 0, 0.65);
  background: #fafafa;
  border-radius: 4px;

  .summary-sep {
    margin: 0 8px;
    color: rgba(0, 0, 0, 0.25);
  }
}
</style>
