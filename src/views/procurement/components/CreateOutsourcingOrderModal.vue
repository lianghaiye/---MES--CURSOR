<template>
  <FormCreateShell
    :page-mode="pageMode"
    :open="open"
    :title="shellTitle"
    width="1400px"
    class="outsourcing-order-form-modal"
    :mask-closable="false"
    destroy-on-close
    @cancel="handleCancel"
    @update:open="(val) => emit('update:open', val)"
  >
    <div class="wx-form-shell">
      <div class="section-block">
        <div class="section-title">基本信息</div>
        <a-form layout="inline" class="header-form horizontal-form">
          <a-row :gutter="[12, 12]" style="width: 100%">
            <a-col :span="6">
              <a-form-item label="外协单号">
                <a-input
                  v-model:value="form.orderNo"
                  placeholder="留空则系统自动生成"
                  allow-clear
                  size="small"
                />
              </a-form-item>
            </a-col>
            <a-col :span="6">
              <a-form-item label="工单名称">
                <a-input
                  v-model:value="form.workOrderName"
                  allow-clear
                  size="small"
                  placeholder="请输入工单名称"
                />
              </a-form-item>
            </a-col>
            <a-col :span="6">
              <a-form-item label="关联销售订单">
                <SalesOrderSearchSelect
                  v-model:value="form.salesOrderNo"
                  :exclude-statuses="salesOrderExcludeStatuses"
                  @change="onSalesOrderChange"
                />
              </a-form-item>
            </a-col>
            <a-col :span="6">
              <a-form-item label="供应商" required>
                <PlanSupplierSelect
                  v-model:value="form.supplier"
                  placeholder="请搜索或选择供应商"
                />
              </a-form-item>
            </a-col>
            <a-col :span="6">
              <a-form-item label="计划日期" required>
                <a-range-picker
                  v-model:value="form.planDateRange"
                  size="small"
                  style="width: 100%"
                  :placeholder="['开始日期', '结束日期']"
                />
              </a-form-item>
            </a-col>
            <a-col :span="6">
              <a-form-item label="联系人">
                <a-input
                  v-model:value="form.contactPerson"
                  size="small"
                  allow-clear
                  placeholder="请输入联系人"
                />
              </a-form-item>
            </a-col>
            <a-col :span="6">
              <a-form-item label="联系电话">
                <a-input
                  v-model:value="form.contactPhone"
                  size="small"
                  allow-clear
                  placeholder="请输入联系电话"
                />
              </a-form-item>
            </a-col>
            <a-col :span="6">
              <a-form-item label="供货期(天)">
                <a-input-number
                  v-model:value="form.leadTimeDays"
                  size="small"
                  :min="0"
                  style="width: 100%"
                />
              </a-form-item>
            </a-col>
            <a-col :span="6">
              <a-form-item label="结算类型">
                <a-select
                  v-model:value="form.settlementType"
                  size="small"
                  :options="settlementTypeOpts"
                />
              </a-form-item>
            </a-col>
            <a-col :span="6">
              <a-form-item label="结算周期">
                <a-select
                  v-model:value="form.settlementCycle"
                  size="small"
                  :options="settlementCycleOpts"
                />
              </a-form-item>
            </a-col>
            <a-col :span="6">
              <a-form-item label="结算方式">
                <a-select
                  v-model:value="form.settlementMethod"
                  size="small"
                  :options="settlementMethodOpts"
                />
              </a-form-item>
            </a-col>
            <a-col :span="24">
              <a-form-item label="备注" class="remark-item">
                <a-textarea
                  v-model:value="form.remark"
                  :rows="2"
                  :maxlength="500"
                  show-count
                  placeholder="请输入备注"
                />
              </a-form-item>
            </a-col>
          </a-row>
        </a-form>
      </div>

      <div class="section-block section-block--lines">
        <div class="section-title">外协清单</div>
        <div class="line-toolbar">
          <a-space wrap>
            <a-button type="primary" size="small" :loading="addingItems" @click="openProductPicker">
              <PlusOutlined />
              添加
            </a-button>
            <a-button class="tax-toggle-btn" size="small" @click="toggleTaxMode">
              切换为：{{ taxModeExcluding ? '计算含税' : '计算不含税' }}
            </a-button>
            <span class="tax-hint">{{ taxModeHint }}</span>
            <TableColumnSettingButton @click="columnDrawerOpen = true" />
          </a-space>
        </div>

        <a-table
          :columns="displayColumns"
          :data-source="form.lineItems"
          row-key="id"
          size="small"
          bordered
          :pagination="false"
          :scroll="{ x: tableScrollX }"
        >
          <template #headerCell="{ column }">
            <template v-if="column.required">
              <span class="col-title-required">
                <span class="required-star">*</span>{{ column.title }}
              </span>
            </template>
            <template v-else>{{ column.title }}</template>
          </template>
          <template #bodyCell="{ column, record, index }">
            <template v-if="column.key === 'index'">{{ index + 1 }}</template>
            <template v-else-if="column.key === 'productName'">
              <span class="product-name-cell">
                <span class="line-idx">{{ index + 1 }}.</span>
                {{ record.productName || '—' }}
              </span>
            </template>
            <template v-else-if="column.key === 'stockQty'">
              {{ formatQty(record.stockQty) }}{{ record.inventoryUnit || record.unit || '' }}
            </template>
            <template v-else-if="column.key === 'planQty'">
              <a-input-number
                v-model:value="record.planQty"
                :min="0"
                :precision="4"
                size="small"
                style="width: 100%"
                @change="() => onLineChange(record)"
              />
            </template>
            <template v-else-if="column.key === 'unit'">
              <a-select
                v-model:value="record.unit"
                size="small"
                style="width: 100%"
                :options="unitOptsFor(record)"
                show-search
                allow-clear
              />
            </template>
            <template v-else-if="column.key === 'shipWarehouse'">
              <a-select
                v-model:value="record.shipWarehouse"
                size="small"
                style="width: 100%"
                placeholder="请选择"
                :options="warehouseOpts"
              />
            </template>
            <template v-else-if="column.key === 'billingMethod'">
              <a-select
                v-model:value="record.billingMethod"
                size="small"
                style="width: 100%"
                :options="billingOpts"
              />
            </template>
            <template v-else-if="column.key === 'unitPriceExTax'">
              <a-input-number
                v-if="taxModeExcluding"
                v-model:value="record.unitPriceExTax"
                :min="0"
                :precision="4"
                size="small"
                style="width: 100%"
                @change="() => onLineChange(record)"
              />
              <span v-else>{{ formatQty(record.unitPriceExTax) }}</span>
            </template>
            <template v-else-if="column.key === 'unitPriceInTax'">
              <a-input-number
                v-if="!taxModeExcluding"
                v-model:value="record.unitPriceInTax"
                :min="0"
                :precision="4"
                size="small"
                style="width: 100%"
                @change="() => onLineChange(record, true)"
              />
              <span v-else>{{ formatQty(record.unitPriceInTax) }}</span>
            </template>
            <template v-else-if="column.key === 'totalPriceExTax'">
              {{ formatMoney(record.totalPriceExTax) }}
            </template>
            <template v-else-if="column.key === 'totalPriceInTax'">
              {{ formatMoney(record.totalPriceInTax) }}
            </template>
            <template v-else-if="column.key === 'remark'">
              <a class="remark-link" @click.prevent="openRemark(record)">
                <span class="remark-text">{{ record.remark || '填写备注' }}</span>
                <EditOutlined />
              </a>
            </template>
            <template v-else-if="column.key === 'action'">
              <a-space :size="0">
                <a-button type="link" size="small" @click="openLineEdit(record)">编辑</a-button>
                <a-button type="link" size="small" @click="copyLine(record)">复制</a-button>
                <a-button type="link" size="small" danger @click="removeLine(record.id)">
                  移出
                </a-button>
              </a-space>
            </template>
            <template v-else>
              {{ record[column.dataIndex] || '—' }}
            </template>
          </template>
        </a-table>
      </div>
    </div>

    <SelectBomMaterialModal
      v-if="isActive"
      v-model:open="productPickerOpen"
      title="添加产品/物料"
      picker-default-item-type="产品"
      @selected="onProductsSelected"
    />

    <TableColumnSettingDrawer
      v-model:open="columnDrawerOpen"
      v-model:settings="columnSettings"
      :default-settings="defaultColumnSettings"
      title="外协清单列设置"
    />

    <a-modal
      v-model:open="remarkOpen"
      title="填写备注"
      :mask-closable="false"
      destroy-on-close
      @ok="saveRemark"
    >
      <a-textarea v-model:value="remarkDraft" :rows="4" placeholder="请输入备注" />
    </a-modal>

    <a-modal
      v-model:open="lineEditOpen"
      title="编辑明细"
      width="720px"
      destroy-on-close
      @ok="applyLineEdit"
    >
      <a-form v-if="lineEditDraft" layout="vertical">
        <a-row :gutter="16">
          <a-col :span="12">
            <a-form-item label="产品名称">
              <a-input :value="lineEditDraft.productName" disabled />
            </a-form-item>
          </a-col>
          <a-col :span="12">
            <a-form-item label="编号">
              <a-input :value="lineEditDraft.productCode" disabled />
            </a-form-item>
          </a-col>
          <a-col :span="8">
            <a-form-item label="计划数量" required>
              <a-input-number
                v-model:value="lineEditDraft.planQty"
                :min="0"
                :precision="4"
                style="width: 100%"
              />
            </a-form-item>
          </a-col>
          <a-col :span="8">
            <a-form-item label="单位" required>
              <a-select
                v-model:value="lineEditDraft.unit"
                style="width: 100%"
                :options="unitOptsFor(lineEditDraft)"
              />
            </a-form-item>
          </a-col>
          <a-col :span="8">
            <a-form-item label="预入仓库" required>
              <a-select
                v-model:value="lineEditDraft.shipWarehouse"
                style="width: 100%"
                :options="warehouseOpts"
                placeholder="请选择"
              />
            </a-form-item>
          </a-col>
          <a-col :span="8">
            <a-form-item label="计费方式">
              <a-select
                v-model:value="lineEditDraft.billingMethod"
                style="width: 100%"
                :options="billingOpts"
              />
            </a-form-item>
          </a-col>
          <a-col :span="8">
            <a-form-item :label="taxModeExcluding ? '加工单价(不含税)' : '加工单价(含税)'">
              <a-input-number
                v-if="taxModeExcluding"
                v-model:value="lineEditDraft.unitPriceExTax"
                :min="0"
                :precision="4"
                style="width: 100%"
              />
              <a-input-number
                v-else
                v-model:value="lineEditDraft.unitPriceInTax"
                :min="0"
                :precision="4"
                style="width: 100%"
              />
            </a-form-item>
          </a-col>
          <a-col :span="24">
            <a-form-item label="备注">
              <a-textarea v-model:value="lineEditDraft.remark" :rows="3" allow-clear />
            </a-form-item>
          </a-col>
        </a-row>
      </a-form>
    </a-modal>

    <template #footer>
      <a-button size="small" @click="handleCancel">
        <CloseOutlined />
        取消
      </a-button>
      <a-button type="primary" size="small" :loading="saving" @click="handleSave">
        <CheckOutlined />
        保存
      </a-button>
    </template>
  </FormCreateShell>
</template>

<script setup>
import { computed, reactive, ref, watch, nextTick } from 'vue'
import { message } from 'ant-design-vue'
import dayjs from 'dayjs'
import { PlusOutlined, CheckOutlined, CloseOutlined, EditOutlined } from '@ant-design/icons-vue'
import FormCreateShell from '@/components/FormCreateShell.vue'
import TableColumnSettingDrawer from '@/components/TableColumnSettingDrawer.vue'
import TableColumnSettingButton from '@/components/TableColumnSettingButton.vue'
import { useFormCreateModal } from '@/composables/useFormCreateModal.js'
import { useTableColumnSettings } from '@/composables/useTableColumnSettings'
import { formatQty } from '@/utils/numberFormat'
import { resolveReturnUnitDefaults } from '@/utils/purchaseReturnLine'
import { mockInventory } from '@/mock/inventory'
import {
  createOutsourcingLine,
  recalcOutsourcingLine,
  outsourcingBillingMethodOptions,
} from '@/mock/outsourcingOrders'
import {
  settlementTypeOptions,
  settlementCycleOptions,
  settlementMethodOptions,
  warehouseOptions,
} from '@/mock/purchaseOrderOptions'
import {
  addOutsourcingOrder,
  updateOutsourcingOrder,
  canEditOutsourcingOrder,
} from '@/store/outsourcingOrderStore'
import PlanSupplierSelect from '@/views/planning/components/PlanSupplierSelect.vue'
import SalesOrderSearchSelect from './SalesOrderSearchSelect.vue'
import SelectBomMaterialModal from '@/views/product-process/components/SelectBomMaterialModal.vue'

const props = defineProps({
  open: { type: Boolean, default: false },
  pageMode: { type: Boolean, default: false },
  listPath: { type: String, default: '/procurement/outsourcing-orders' },
  editRecord: { type: Object, default: null },
})

const emit = defineEmits(['update:open', 'saved'])

const salesOrderExcludeStatuses = ['待审核', '待提交', '已作废', '已拒绝']
const isEdit = computed(() => Boolean(props.editRecord?.id))
const { isActive, shellTitle, handleCancel, closeAfterSave } = useFormCreateModal(props, emit, {
  listPath: props.listPath,
  getTitle: () => (isEdit.value ? '编辑外协订单' : '新增外协订单'),
})

const taxModeExcluding = ref(true)
const addingItems = ref(false)
const productPickerOpen = ref(false)
const saving = ref(false)
const remarkOpen = ref(false)
const remarkDraft = ref('')
const remarkTargetId = ref('')
const lineEditOpen = ref(false)
const lineEditDraft = ref(null)
const lineEditSourceId = ref('')

const form = reactive({
  orderNo: '',
  workOrderName: '',
  salesOrderNo: '',
  salesOrderId: '',
  supplier: '',
  planDateRange: null,
  contactPerson: '',
  contactPhone: '',
  leadTimeDays: undefined,
  settlementType: '先款后货',
  settlementCycle: '月结',
  settlementMethod: '现金结算',
  remark: '',
  lineItems: [],
})

const settlementTypeOpts = settlementTypeOptions.map((v) => ({ label: v, value: v }))
const settlementCycleOpts = settlementCycleOptions.map((v) => ({ label: v, value: v }))
const settlementMethodOpts = settlementMethodOptions.map((v) => ({ label: v, value: v }))
const warehouseOpts = warehouseOptions
const billingOpts = outsourcingBillingMethodOptions.map((v) => ({ label: v, value: v }))

const taxModeHint = computed(() =>
  taxModeExcluding.value
    ? '当前：按不含税单价算含税（请填不含税单价）'
    : '当前：按含税单价算不含税（请填含税单价）',
)

const lineColumns = [
  { title: '序号', key: 'index', width: 52, align: 'center', fixed: 'left' },
  {
    title: '产品名称',
    key: 'productName',
    dataIndex: 'productName',
    width: 160,
    ellipsis: true,
    fixed: 'left',
  },
  { title: '编号', dataIndex: 'productCode', width: 120, ellipsis: true },
  { title: '规格型号', dataIndex: 'specModel', width: 110, ellipsis: true },
  { title: '变体属性', dataIndex: 'variantSummary', width: 120, ellipsis: true },
  { title: '材质', dataIndex: 'material', width: 80, ellipsis: true },
  { title: '图号', dataIndex: 'drawingNo', width: 100, ellipsis: true },
  { title: '当前库存数', key: 'stockQty', width: 110, align: 'right' },
  { title: '计划数量', key: 'planQty', width: 110, required: true },
  { title: '单位', key: 'unit', width: 90, required: true },
  { title: '预入仓库', key: 'shipWarehouse', width: 120, required: true },
  { title: '计费方式', key: 'billingMethod', width: 100 },
  { title: '加工单价(不含税)', key: 'unitPriceExTax', width: 120 },
  { title: '加工单价(含税)', key: 'unitPriceInTax', width: 120 },
  { title: '加工总价(不含税)', key: 'totalPriceExTax', width: 120, align: 'right' },
  { title: '加工总价(含税)', key: 'totalPriceInTax', width: 120, align: 'right' },
  { title: '备注', key: 'remark', width: 120 },
  { title: '操作', key: 'action', width: 160, fixed: 'right' },
]

const {
  columnSettings,
  columnDrawerOpen,
  displayColumns: baseDisplayColumns,
  tableScrollX,
  defaultColumnSettings,
} = useTableColumnSettings('outsourcing-order-form-lines-v2', lineColumns)

/** 按含税模式调整单价/总价列顺序：编辑列靠前 */
const displayColumns = computed(() => {
  const cols = [...baseDisplayColumns.value]
  const exKeys = new Set(['unitPriceExTax', 'totalPriceExTax'])
  const inKeys = new Set(['unitPriceInTax', 'totalPriceInTax'])
  const priceKeys = new Set([...exKeys, ...inKeys])
  const before = []
  const price = []
  const after = []
  cols.forEach((c) => {
    const key = c.key || c.dataIndex
    if (priceKeys.has(key)) price.push(c)
    else if (price.length || after.length) after.push(c)
    else before.push(c)
  })
  const orderedPrice = taxModeExcluding.value
    ? [
        ...price.filter((c) => exKeys.has(c.key || c.dataIndex)),
        ...price.filter((c) => inKeys.has(c.key || c.dataIndex)),
      ]
    : [
        ...price.filter((c) => inKeys.has(c.key || c.dataIndex)),
        ...price.filter((c) => exKeys.has(c.key || c.dataIndex)),
      ]
  return [...before, ...orderedPrice, ...after]
})

function formatMoney(val) {
  if (val == null || val === '') return '—'
  return Number(val).toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })
}

function unitOptsFor(record) {
  const opts = record?.unitOptions?.length
    ? record.unitOptions
    : [record?.unit, record?.purchaseUnit, record?.inventoryUnit].filter(Boolean)
  return [...new Set(opts)].map((u) => ({ label: u, value: u }))
}

function resolveStockQty(code) {
  const inv = mockInventory.find((m) => m.code === code)
  return inv?.stockQty ?? 0
}

function resetForm() {
  form.orderNo = ''
  form.workOrderName = ''
  form.salesOrderNo = ''
  form.salesOrderId = ''
  form.supplier = ''
  form.planDateRange = null
  form.contactPerson = ''
  form.contactPhone = ''
  form.leadTimeDays = undefined
  form.settlementType = '先款后货'
  form.settlementCycle = '月结'
  form.settlementMethod = '现金结算'
  form.remark = ''
  form.lineItems = []
  taxModeExcluding.value = true
}

function loadEditForm(record) {
  form.orderNo = record.orderNo || ''
  form.workOrderName = record.workOrderName || ''
  form.salesOrderNo = record.salesOrderNo || ''
  form.salesOrderId = record.salesOrderId || ''
  form.supplier = record.supplier || ''
  {
    const start = record.planStartDate || record.planDate
    const end = record.planEndDate || record.planDate
    form.planDateRange = start && end ? [dayjs(start), dayjs(end)] : null
  }
  form.contactPerson = record.contactPerson || ''
  form.contactPhone = record.contactPhone || ''
  form.leadTimeDays = record.leadTimeDays
  form.settlementType = record.settlementType || '先款后货'
  form.settlementCycle = record.settlementCycle || '月结'
  form.settlementMethod = record.settlementMethod || '现金结算'
  form.remark = record.remark || ''
  form.lineItems = (record.lineItems || []).map((l) => ({ ...l }))
  taxModeExcluding.value = true
}

watch(
  () => [props.open, props.pageMode, props.editRecord?.id],
  () => {
    if (!isActive.value) return
    if (props.editRecord) loadEditForm(props.editRecord)
    else resetForm()
  },
  { immediate: true },
)

function onSalesOrderChange(val) {
  form.salesOrderNo = val || ''
  form.salesOrderId = ''
}

function openProductPicker() {
  productPickerOpen.value = true
}

function mapPickerToLine(payload) {
  const code = payload.code || payload.productCode || ''
  const name = payload.name || payload.productName || ''
  const units = resolveReturnUnitDefaults(code, payload)
  const line = createOutsourcingLine({
    productName: name,
    productCode: code,
    itemName: name,
    itemCode: code,
    specModel: payload.specModel || '',
    variantSummary: payload.variantSummary || '',
    material: payload.material || '',
    drawingNo: payload.drawingNo || '',
    stockQty: resolveStockQty(code) || Number(payload.stockQty) || 0,
    planQty: 1,
    unit: units.defaultUnit,
    purchaseUnit: units.purchaseUnit,
    inventoryUnit: units.inventoryUnit,
    unitOptions: units.unitOptions,
    shipWarehouse: '',
    billingMethod: '按件数',
    unitPriceExTax: Number(payload.unitPrice) || 0,
    taxRate: Number(payload.inputTaxRate ?? 13),
    remark: '',
  })
  recalcOutsourcingLine(line, { fromInTax: !taxModeExcluding.value })
  return line
}

function onProductsSelected(rows) {
  const list = (Array.isArray(rows) ? rows : [rows]).filter((r) => r.pickType !== 'spu')
  if (!list.length) {
    message.warning('未选择物品')
    return
  }
  addingItems.value = true
  productPickerOpen.value = false
  nextTick(() => {
    try {
      let added = 0
      list.forEach((payload) => {
        const code = payload.code || ''
        if (!code) return
        if (form.lineItems.some((l) => (l.productCode || l.itemCode) === code)) return
        form.lineItems.push(mapPickerToLine(payload))
        added += 1
      })
      if (added > 0) message.success(`已添加 ${added} 条明细`)
      else message.info('所选物品已在明细中')
    } finally {
      addingItems.value = false
    }
  })
}

function onLineChange(record, fromInTax = false) {
  recalcOutsourcingLine(record, { fromInTax: fromInTax || !taxModeExcluding.value })
}

function toggleTaxMode() {
  taxModeExcluding.value = !taxModeExcluding.value
  form.lineItems.forEach((line) =>
    recalcOutsourcingLine(line, { fromInTax: !taxModeExcluding.value }),
  )
}

function removeLine(id) {
  const idx = form.lineItems.findIndex((l) => l.id === id)
  if (idx >= 0) form.lineItems.splice(idx, 1)
}

function copyLine(record) {
  const copy = createOutsourcingLine({
    ...record,
    id: undefined,
    receivedQty: 0,
    appliedReceiptQty: 0,
    issuedQty: 0,
  })
  form.lineItems.push(copy)
  message.success('已复制一行明细')
}

function openRemark(record) {
  remarkTargetId.value = record.id
  remarkDraft.value = record.remark || ''
  remarkOpen.value = true
}

function saveRemark() {
  const target = form.lineItems.find((l) => l.id === remarkTargetId.value)
  if (target) target.remark = remarkDraft.value || ''
  remarkOpen.value = false
}

function openLineEdit(record) {
  lineEditSourceId.value = record.id
  lineEditDraft.value = { ...record }
  lineEditOpen.value = true
}

function applyLineEdit() {
  const draft = lineEditDraft.value
  if (!draft) {
    lineEditOpen.value = false
    return
  }
  if (!(Number(draft.planQty) > 0)) {
    message.warning('请填写计划数量')
    return
  }
  if (!draft.unit) {
    message.warning('请选择单位')
    return
  }
  if (!draft.shipWarehouse) {
    message.warning('请选择预入仓库')
    return
  }
  recalcOutsourcingLine(draft, { fromInTax: !taxModeExcluding.value })
  const target = form.lineItems.find((l) => l.id === lineEditSourceId.value)
  if (target) Object.assign(target, draft)
  lineEditOpen.value = false
}

function buildPayload() {
  const start =
    form.planDateRange?.[0] && dayjs.isDayjs(form.planDateRange[0])
      ? form.planDateRange[0].format('YYYY-MM-DD')
      : ''
  const end =
    form.planDateRange?.[1] && dayjs.isDayjs(form.planDateRange[1])
      ? form.planDateRange[1].format('YYYY-MM-DD')
      : ''
  return {
    orderNo: String(form.orderNo || '').trim(),
    workOrderName: form.workOrderName || '',
    salesOrderNo: form.salesOrderNo || '',
    salesOrderId: form.salesOrderId || '',
    supplier: form.supplier || '',
    planStartDate: start,
    planEndDate: end,
    planDate: end || start,
    contactPerson: form.contactPerson || '',
    contactPhone: form.contactPhone || '',
    leadTimeDays: form.leadTimeDays,
    settlementType: form.settlementType,
    settlementCycle: form.settlementCycle,
    settlementMethod: form.settlementMethod,
    remark: form.remark || '',
    lineItems: form.lineItems.map((l) => ({ ...l })),
  }
}

function handleSave() {
  if (!String(form.supplier || '').trim()) {
    message.warning('请选择供应商')
    return
  }
  if (!form.planDateRange?.[0] || !form.planDateRange?.[1]) {
    message.warning('请选择计划开始与结束日期')
    return
  }
  if (!form.lineItems.length) {
    message.warning('请至少添加一条外协明细')
    return
  }
  const bad = form.lineItems.find(
    (l) => !(Number(l.planQty) > 0) || !l.unit || !String(l.shipWarehouse || '').trim(),
  )
  if (bad) {
    message.warning('请完善明细的计划数量、单位、预入仓库')
    return
  }
  if (isEdit.value && !canEditOutsourcingOrder(props.editRecord)) {
    message.warning('当前外协订单不可编辑')
    return
  }

  saving.value = true
  try {
    const payload = buildPayload()
    form.lineItems.forEach((l) => recalcOutsourcingLine(l, { fromInTax: !taxModeExcluding.value }))
    payload.lineItems = form.lineItems.map((l) => ({ ...l }))
    if (isEdit.value) {
      updateOutsourcingOrder(props.editRecord.id, payload)
      message.success('外协订单已更新')
    } else {
      addOutsourcingOrder(payload)
      message.success('外协订单已保存')
    }
    emit('saved')
    closeAfterSave()
  } finally {
    saving.value = false
  }
}
</script>

<script>
export default { name: 'CreateOutsourcingOrderModal' }
</script>

<style lang="less" scoped>
.wx-form-shell {
  padding: 0 4px 8px;
}

.section-block {
  background: #fff;
  border-radius: 6px;
  padding: 12px;
  margin-bottom: 12px;
  border: 1px solid #f0f0f0;
}

.section-title {
  font-size: 14px;
  font-weight: 600;
  margin-bottom: 12px;
}

.horizontal-form {
  width: 100%;

  :deep(.ant-form-item) {
    width: 100%;
    margin-bottom: 0;
  }

  :deep(.ant-form-item-label > label) {
    font-size: 13px;
  }
}

.remark-item {
  width: 100%;
}

.line-toolbar {
  margin-bottom: 8px;
}

.tax-hint {
  font-size: 12px;
  color: rgba(0, 0, 0, 0.45);
}

.product-name-cell {
  display: inline-flex;
  gap: 4px;
  min-width: 0;
}

.line-idx {
  color: rgba(0, 0, 0, 0.45);
}

.remark-link {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  max-width: 100%;
  color: #1677ff;
}

.remark-text {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.col-title-required .required-star {
  color: #ff4d4f;
  margin-right: 2px;
}
</style>
