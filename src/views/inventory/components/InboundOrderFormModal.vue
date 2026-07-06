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

    <div class="line-toolbar">
      <a-space>
        <a-button type="primary" size="small" @click="pickerOpen = true">
          <PlusOutlined />
          添加物品
        </a-button>
        <a-button size="small" @click="bomModalOpen = true">按BOM添加</a-button>
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
      :scroll="{ x: lineScrollX, y: 320 }"
    >
      <template #bodyCell="{ column, record, index }">
        <template v-if="column.key === 'index'">{{ index + 1 }}</template>
        <template v-else-if="column.key === 'stockQty'">
          {{ formatQty(record.stockQty) }}
        </template>
        <template v-else-if="column.key === 'warehouseStockQty'">
          {{ formatQty(record.warehouseStockQty) }}
        </template>
        <template v-else-if="column.key === 'warehouse'">
          <a-select
            v-model:value="record.warehouse"
            allow-clear
            size="small"
            placeholder="请选择"
            :options="warehouseOpts"
            style="width: 100%"
            @change="() => refreshLine(record)"
          />
        </template>
        <template v-else-if="column.key === 'locationNo'">
          <a-input
            v-model:value="record.locationNo"
            size="small"
            allow-clear
            placeholder="请输入货位号"
          />
        </template>
        <template v-else-if="column.key === 'qty'">
          <a-input-number
            v-model:value="record.qty"
            :min="0"
            :precision="3"
            size="small"
            style="width: 100%"
            @change="() => onLineQtyChange(record)"
          />
        </template>
        <template v-else-if="column.key === 'weight'">
          <a-input-number
            v-model:value="record.weight"
            :min="0"
            :precision="3"
            size="small"
            style="width: 100%"
          />
        </template>
        <template v-else-if="column.key === 'unitPrice'">
          <a-input-number
            v-model:value="record.unitPrice"
            :min="0"
            :precision="2"
            size="small"
            style="width: 100%"
            @change="() => onLineUnitPriceChange(record)"
          />
        </template>
        <template v-else-if="column.key === 'totalPrice'">
          <a-input-number
            v-model:value="record.totalPrice"
            :min="0"
            :precision="2"
            size="small"
            style="width: 100%"
            @change="() => onLineTotalPriceChange(record)"
          />
        </template>
        <template v-else-if="column.key === 'lineSource'">
          <a-select
            v-model:value="record.lineSource"
            allow-clear
            size="small"
            placeholder="请选择"
            :options="lineSourceOpts"
            style="width: 100%"
          />
        </template>
        <template v-else-if="column.key === 'sourceDocNo'">
          <a-input
            v-model:value="record.sourceDocNo"
            size="small"
            allow-clear
            placeholder="请输入"
          />
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
        <a-empty :image="false" description="暂无数据" />
      </template>
    </a-table>

    <template #footer>
      <a-button @click="onShellCancel">取消</a-button>
      <a-button type="primary" :loading="saving" @click="handleSave">
        <CheckOutlined />
        保存
      </a-button>
    </template>
  </FormCreateShell>

  <SelectWarehouseItemModal
    v-if="isActive"
    v-model:open="pickerOpen"
    :selected-items="pickerPreset"
    @confirm="onItemsPicked"
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
import { computed, reactive, ref, watch } from 'vue'
import { Modal, message } from 'ant-design-vue'
import dayjs from 'dayjs'
import { PlusOutlined, CheckOutlined } from '@ant-design/icons-vue'
import FormCreateShell from '@/components/FormCreateShell.vue'
import TableColumnSettingDrawer from '@/components/TableColumnSettingDrawer.vue'
import TableColumnSettingButton from '@/components/TableColumnSettingButton.vue'
import { useFormCreateModal } from '@/composables/useFormCreateModal'
import { useTableColumnSettings } from '@/composables/useTableColumnSettings'
import SelectWarehouseItemModal from '@/views/basic-config/components/SelectWarehouseItemModal.vue'
import AddByBomModal from '@/views/product-process/components/AddByBomModal.vue'
import InboundLineEditModal from './InboundLineEditModal.vue'
import { inboundTypeOptions, inboundLineSourceOptions, handlerOptions } from '@/mock/inboundOptions'
import { supplierOptions } from '@/mock/purchaseRequisitionOptions'
import { getWarehouseSelectOptions, warehouseState } from '@/store/warehouseStore'
import {
  addInboundOrder,
  updateInboundOrder,
  resolveWarehouseKeeper,
} from '@/store/inboundOrderStore'
import { buildWarehousePickableItems } from '@/utils/warehouseItemPicker'
import { inboundFormLineColumns } from '@/utils/inboundLineColumns'
import {
  buildInboundLineFromPickerItem,
  buildInboundLinesFromBom,
  cloneInboundLine,
  enrichInboundLine,
  mergeInboundLines,
  syncInboundLineTotalFromUnit,
  syncInboundLineUnitFromTotal,
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
const pickerOpen = ref(false)
const bomModalOpen = ref(false)
const lineEditOpen = ref(false)
const lineEditTarget = ref(null)
const lineEditMode = ref('edit')
const lineEditSourceId = ref(null)
const prevHeaderWarehouse = ref(undefined)

const inboundTypeOpts = inboundTypeOptions.map((v) => ({ label: v, value: v }))
const lineSourceOpts = inboundLineSourceOptions.map((v) => ({ label: v, value: v }))
const handlerOpts = handlerOptions.map((v) => ({ label: v, value: v }))
const supplierOpts = supplierOptions

const warehouseOpts = computed(() => {
  void warehouseState.warehouses
  return getWarehouseSelectOptions()
})

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
  useTableColumnSettings('inbound-form-lines', inboundFormLineColumns, { minScrollX: 2100 })

const lineScrollX = tableScrollX

const pickerPreset = computed(() => {
  const lookup = new Map(
    buildWarehousePickableItems().map((it) => [`${it.itemType}-${it.code}`, it]),
  )
  return form.lineItems.map((l) => {
    const hit = lookup.get(`${l.itemType || '物料'}-${l.itemCode}`)
    return {
      itemType: hit?.itemType || l.itemType || '物料',
      itemId: hit?.itemId ?? l.itemId,
      code: l.itemCode,
      name: l.itemName,
    }
  })
})

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

function refreshLine(line) {
  Object.assign(line, enrichInboundLine(line))
}

function onLineQtyChange(line) {
  syncInboundLineTotalFromUnit(line)
}

function onLineUnitPriceChange(line) {
  syncInboundLineTotalFromUnit(line)
}

function onLineTotalPriceChange(line) {
  syncInboundLineUnitFromTotal(line)
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
  if (!items?.length) {
    message.warning('未选择物品')
    return
  }
  const before = form.lineItems.length
  const incoming = items
    .filter((it) => it?.code)
    .map((it) => buildInboundLineFromPickerItem(it, form.warehouse || ''))
  if (!incoming.length) {
    message.warning('所选物品无效，请重新选择')
    return
  }
  form.lineItems = mergeInboundLines(form.lineItems, incoming)
  const added = form.lineItems.length - before
  if (added > 0) message.success(`已添加 ${added} 条明细`)
  else message.info('所选物品已在明细中')
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
    lineItems: form.lineItems.map((l) => enrichInboundLine({ ...l })),
  }
}

function handleSave() {
  if (!form.inboundType) {
    message.warning('请选择入库类型')
    return
  }
  if (!form.lineItems.length) {
    message.warning('请至少添加一条明细')
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

<style lang="less" scoped>
.header-form {
  margin-bottom: 12px;

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
  margin-bottom: 8px;
}

.danger-link {
  color: #ff4d4f;
}
</style>
