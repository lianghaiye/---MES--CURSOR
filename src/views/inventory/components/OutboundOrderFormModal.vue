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
            />
          </a-form-item>
        </a-col>
        <a-col :span="8">
          <a-form-item label="出库时间">
            <a-date-picker
              v-model:value="outboundTimeValue"
              show-time
              size="small"
              format="YYYY-MM-DD HH:mm:ss"
              value-format="YYYY-MM-DD HH:mm:ss"
              style="width: 100%"
              placeholder="请选择出库时间"
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
        <template v-else-if="column.key === 'shipWarehouse'">
          <a-select
            v-model:value="record.shipWarehouse"
            allow-clear
            size="small"
            placeholder="请选择"
            :options="warehouseOpts"
            style="width: 100%"
            @change="() => refreshLine(record)"
          />
        </template>
        <template v-else-if="column.key === 'shipQty'">
          <a-input-number
            v-model:value="record.shipQty"
            :min="0"
            :precision="3"
            size="small"
            style="width: 100%"
            @change="() => onLineShipQtyChange(record)"
          />
        </template>
        <template v-else-if="column.key === 'weight'">
          <a-input-number
            v-model:value="record.weight"
            :min="0"
            :precision="3"
            size="small"
            style="width: 100%"
            placeholder="请输入"
            @change="syncTotalWeight"
          />
        </template>
        <template v-else-if="column.key === 'barcodeBatchNo'">
          <span>{{ record.barcodeBatchNo || '—' }}</span>
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
          <span>{{ record.lineSource || '—' }}</span>
        </template>
        <template v-else-if="column.key === 'sourceDocNo'">
          <span>{{ record.sourceDocNo || '—' }}</span>
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
      <a-button @click="handleCancel">取消</a-button>
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
    qty-label="出库数量"
    qty-hint="子项出库数量 = 出库数量 × 子件原单位用量"
    preview-tip="确定后将添加所选物品 BOM的 下级结构"
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
</template>

<script setup>
import { computed, reactive, ref, watch } from 'vue'
import { Modal, message } from 'ant-design-vue'
import dayjs from 'dayjs'
import { CheckOutlined, PlusOutlined } from '@ant-design/icons-vue'
import FormCreateShell from '@/components/FormCreateShell.vue'
import TableColumnSettingDrawer from '@/components/TableColumnSettingDrawer.vue'
import TableColumnSettingButton from '@/components/TableColumnSettingButton.vue'
import { useFormCreateModal } from '@/composables/useFormCreateModal'
import { useTableColumnSettings } from '@/composables/useTableColumnSettings'
import SelectWarehouseItemModal from '@/views/basic-config/components/SelectWarehouseItemModal.vue'
import AddByBomModal from '@/views/product-process/components/AddByBomModal.vue'
import OutboundLineEditModal from './OutboundLineEditModal.vue'
import { outboundTypeOptions, handlerOptions, requisitionDeptOptions } from '@/mock/outboundOptions'
import { getWarehouseSelectOptions, warehouseState } from '@/store/warehouseStore'
import { addOutboundOrder, generateOutboundNo, updateOutboundOrder } from '@/store/outboundStore'
import { buildWarehousePickableItems } from '@/utils/warehouseItemPicker'
import { outboundFormLineColumns } from '@/utils/outboundLineColumns'
import {
  buildOutboundLineFromPickerItem,
  buildOutboundLinesFromBom,
  cloneOutboundLine,
  enrichOutboundLine,
  mergeOutboundLines,
  syncLineTotalFromUnit,
  syncLineUnitFromTotal,
} from '@/utils/outboundLineHelpers'

const props = defineProps({
  open: { type: Boolean, default: false },
  pageMode: { type: Boolean, default: false },
  listPath: { type: String, default: '' },
  editRecord: { type: Object, default: null },
})

const emit = defineEmits(['update:open', 'saved'])

const isEdit = computed(() => Boolean(props.editRecord?.id))

const { isActive, shellTitle, handleCancel, closeAfterSave } = useFormCreateModal(props, emit, {
  listPath: '/inventory/outbound',
  getTitle: () => (isEdit.value ? '编辑出库单' : '新增出库单'),
})

const saving = ref(false)
const pickerOpen = ref(false)
const bomModalOpen = ref(false)
const lineEditOpen = ref(false)
const lineEditTarget = ref(null)
const lineEditMode = ref('edit')
const lineEditSourceId = ref(null)
const totalWeightManual = ref(false)
const prevHeaderWarehouse = ref(undefined)

const outboundTypeOpts = outboundTypeOptions.map((v) => ({ label: v, value: v }))
const handlerOpts = handlerOptions.map((v) => ({ label: v, value: v }))
const requisitionDeptOpts = requisitionDeptOptions.map((v) => ({ label: v, value: v }))

const warehouseOpts = computed(() => {
  void warehouseState.warehouses
  return getWarehouseSelectOptions()
})

const form = reactive({
  docNo: '',
  outboundType: '其他出库',
  outboundTime: dayjs().format('YYYY-MM-DD HH:mm:ss'),
  warehouse: undefined,
  handler: 'admin1',
  requisitionDept: '默认工厂',
  totalWeight: 0,
  remark: '',
  lineItems: [],
})

const outboundTimeValue = computed({
  get: () => form.outboundTime,
  set: (val) => {
    form.outboundTime = val || dayjs().format('YYYY-MM-DD HH:mm:ss')
  },
})

const baseLineColumns = outboundFormLineColumns

const { columnSettings, columnDrawerOpen, displayColumns, tableScrollX, defaultColumnSettings } =
  useTableColumnSettings('outbound-form-lines', baseLineColumns, { minScrollX: 1800 })

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

function loadEditForm(record) {
  totalWeightManual.value = true
  prevHeaderWarehouse.value = record.warehouse || undefined
  Object.assign(form, {
    docNo: record.docNo,
    outboundType: record.outboundType,
    outboundTime: record.outboundTime || record.createdAt || dayjs().format('YYYY-MM-DD HH:mm:ss'),
    warehouse: record.warehouse || undefined,
    handler: record.handler || 'admin1',
    requisitionDept: record.requisitionDept || '默认工厂',
    totalWeight: record.totalWeight ?? 0,
    remark: record.remark || '',
    lineItems: (record.lineItems || []).map((l) => enrichOutboundLine({ ...l })),
  })
}

function resetForm() {
  totalWeightManual.value = false
  Object.assign(form, {
    docNo: generateOutboundNo(),
    outboundType: '其他出库',
    outboundTime: dayjs().format('YYYY-MM-DD HH:mm:ss'),
    warehouse: undefined,
    handler: 'admin1',
    requisitionDept: '默认工厂',
    totalWeight: 0,
    remark: '',
    lineItems: [],
  })
  prevHeaderWarehouse.value = undefined
}

function formatQty(val) {
  if (val == null || val === '') return '—'
  return Number(val).toLocaleString(undefined, { maximumFractionDigits: 3 })
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

function onLineTotalPriceChange(line) {
  syncLineUnitFromTotal(line)
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
  if (!items?.length) {
    message.warning('未选择物品')
    return
  }
  const before = form.lineItems.length
  const incoming = items
    .filter((it) => it?.code)
    .map((it) => buildOutboundLineFromPickerItem(it, form.warehouse || ''))
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
}

function onBomAdded({ pickerRow, usageCoefficient }) {
  const incoming = buildOutboundLinesFromBom(
    pickerRow,
    usageCoefficient,
    form.warehouse || '',
    false,
  )
  if (!incoming.length) {
    message.warning('未找到可添加的 BOM 明细')
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
    outboundTime: form.outboundTime,
    warehouse: form.warehouse || '',
    handler: form.handler,
    requisitionDept: form.requisitionDept || '',
    totalWeight: form.totalWeight,
    remark: form.remark?.trim(),
    lineItems: form.lineItems.map((l) => enrichOutboundLine({ ...l })),
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
  if (!form.lineItems.length) {
    message.warning('请至少添加一条明细')
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

<style lang="less" scoped>
.header-form {
  margin-bottom: 12px;

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
  margin-bottom: 8px;
}

.danger-link {
  color: #ff4d4f;
}
</style>
