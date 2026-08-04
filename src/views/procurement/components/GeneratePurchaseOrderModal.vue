<template>
  <a-modal
    :open="open"
    title="生成采购单"
    width="96%"
    :mask-closable="false"
    destroy-on-close
    class="generate-po-modal"
    @cancel="handleCancel"
  >
    <a-table
      :columns="columns"
      :data-source="rows"
      row-key="key"
      size="small"
      bordered
      :pagination="false"
      :scroll="{ x: tableScrollX, y: 420 }"
    >
      <template #headerCell="{ column }">
        <template v-if="editableKeys.includes(column.key)">
          <span>{{ column.title }}</span>
          <EditOutlined class="header-edit-icon" @click.stop="openBatchEdit(column.key)" />
        </template>
      </template>

      <template #bodyCell="{ column, record, index }">
        <template v-if="column.key === 'index'">{{ index + 1 }}</template>

        <template v-else-if="column.key === 'planPurchaseQty'">
          <a-input-number
            v-model:value="record.planPurchaseQty"
            size="small"
            :min="0"
            :precision="2"
            style="width: 100%"
            @change="onRowChange(record)"
          />
        </template>

        <template v-else-if="column.key === 'unit'">
          <a-select
            v-model:value="record.unit"
            size="small"
            show-search
            allow-clear
            style="width: 100%"
            :options="purchaseUnitOpts"
            :filter-option="filterUnitOption"
            @change="onUnitChange(record)"
          />
        </template>

        <template v-else-if="column.key === 'orderSizeText'">
          {{ record.orderSizeText || record.blankSizeText || '—' }}
        </template>

        <template v-else-if="column.key === 'designatedSupplier'">
          <a-select
            v-model:value="record.designatedSupplier"
            size="small"
            style="width: 100%"
            :options="designatedOpts"
          />
        </template>

        <template v-else-if="column.key === 'supplierName'">
          <a-select
            v-model:value="record.supplierName"
            size="small"
            allow-clear
            show-search
            style="width: 100%"
            :options="supplierOpts"
          />
        </template>

        <template v-else-if="column.key === 'settlementType'">
          <a-select
            v-model:value="record.settlementType"
            size="small"
            style="width: 100%"
            :options="settlementOpts"
          />
        </template>

        <template v-else-if="column.key === 'unitPriceExTax'">
          <a-input-number
            v-model:value="record.unitPriceExTax"
            size="small"
            :min="0"
            :precision="2"
            style="width: 100%"
            @change="onRowChange(record)"
          />
        </template>

        <template v-else-if="column.key === 'taxRate'">
          <a-input-number
            v-model:value="record.taxRate"
            size="small"
            :min="0"
            :max="100"
            :precision="2"
            style="width: 100%"
            @change="onRowChange(record)"
          />
        </template>

        <template v-else-if="column.key === 'unitPriceInTax'">
          {{ formatNum(record.unitPriceInTax) }}
        </template>

        <template v-else-if="column.key === 'totalPriceExTax'">
          {{ formatNum(record.totalPriceExTax) }}
        </template>

        <template v-else-if="column.key === 'totalPriceInTax'">
          {{ formatNum(record.totalPriceInTax) }}
        </template>

        <template v-else-if="column.key === 'receivingMode'">
          <a-select
            v-model:value="record.receivingMode"
            size="small"
            style="width: 100%"
            :options="receivingModeOpts"
          />
        </template>

        <template v-else-if="column.key === 'leadTimeDays'">
          <a-input-number
            v-model:value="record.leadTimeDays"
            size="small"
            :min="0"
            :precision="0"
            style="width: 100%"
          />
        </template>

        <template v-else-if="column.key === 'deliveryDate'">
          <a-date-picker
            :value="dateValue(record.deliveryDate)"
            size="small"
            style="width: 100%"
            @change="(d) => onDateChange(record, 'deliveryDate', d)"
          />
        </template>

        <template v-else-if="column.key === 'receivingWarehouse'">
          <a-select
            v-model:value="record.receivingWarehouse"
            size="small"
            allow-clear
            style="width: 100%"
            :options="warehouseOpts"
          />
        </template>

        <template v-else-if="column.key === 'remark'">
          <a-input v-model:value="record.remark" size="small" />
        </template>

        <template v-else-if="column.key === 'sourceReqNos'">
          {{ (record.sourceReqNos || []).join('、') }}
        </template>

        <template v-else-if="column.key === 'sourceSalesOrderNos'">
          {{ (record.sourceSalesOrderNos || []).join('、') || '-' }}
        </template>

        <template v-else-if="column.key === 'action'">
          <a-button type="link" size="small" danger @click="removeFromOrder(record)">
            移出本单
          </a-button>
        </template>

        <template v-else>
          {{ record[column.dataIndex] ?? '-' }}
        </template>
      </template>

      <template #summary>
        <a-table-summary fixed>
          <a-table-summary-row>
            <a-table-summary-cell :index="0" align="center">总计</a-table-summary-cell>
            <a-table-summary-cell
              v-for="(col, idx) in summaryCells"
              :key="col.key"
              :index="idx + 1"
              :align="col.align"
            >
              {{ col.value }}
            </a-table-summary-cell>
          </a-table-summary-row>
        </a-table-summary>
      </template>
    </a-table>

    <a-modal
      v-model:open="batchEditOpen"
      :title="`批量设置：${batchEditLabel}`"
      width="400px"
      @ok="applyBatchEdit"
    >
      <a-form layout="vertical">
        <a-form-item :label="batchEditLabel">
          <a-input-number
            v-if="batchEditType === 'number'"
            v-model:value="batchEditValue"
            style="width: 100%"
            :precision="batchEditPrecision"
          />
          <a-select
            v-else-if="batchEditType === 'select'"
            v-model:value="batchEditValue"
            style="width: 100%"
            :options="batchEditOptions"
            allow-clear
            show-search
          />
          <a-date-picker
            v-else-if="batchEditType === 'date'"
            :value="batchEditDateValue"
            style="width: 100%"
            @change="(d) => (batchEditValue = d ? d.format('YYYY-MM-DD') : '')"
          />
          <a-input v-else v-model:value="batchEditValue" />
        </a-form-item>
      </a-form>
    </a-modal>

    <template #footer>
      <a-button @click="handleCancel">
        <CloseOutlined />
        取消
      </a-button>
      <a-button type="primary" @click="handleConfirm">
        <PlusOutlined />
        确认并生成
      </a-button>
    </template>
  </a-modal>
</template>

<script setup>
import { computed, ref, watch } from 'vue'
import { message } from 'ant-design-vue'
import dayjs from 'dayjs'
import { EditOutlined, PlusOutlined, CloseOutlined } from '@ant-design/icons-vue'
import { mergeRequisitionLines, recalcMergedLine } from '@/utils/purchaseMerge'
import { confirmGeneratePurchaseOrders } from '@/store/purchaseRequisitionStore'
import {
  supplierOptions,
  settlementTypeOptions,
  receivingModeOptions,
  designatedSupplierOptions,
} from '@/mock/purchaseRequisitionOptions'
import { getWarehouseSelectOptions, warehouseState } from '@/store/warehouseStore'
import { getPurchaseUnitOptions, unitState } from '@/store/unitStore'
import { resolveDefaultWarehouseByMaterialCode } from '@/utils/warehouseResolver'

const props = defineProps({
  open: { type: Boolean, default: false },
  requisitions: { type: Array, default: () => [] },
})

const emit = defineEmits(['update:open', 'generated'])

const rows = ref([])
const batchEditOpen = ref(false)
const batchEditKey = ref('')
const batchEditValue = ref(undefined)

const editableKeys = [
  'planPurchaseQty',
  'unit',
  'designatedSupplier',
  'supplierName',
  'settlementType',
  'unitPriceExTax',
  'taxRate',
  'receivingMode',
  'leadTimeDays',
  'deliveryDate',
  'receivingWarehouse',
  'remark',
]

const batchEditMeta = {
  planPurchaseQty: { label: '计划采购量', type: 'number', precision: 2 },
  designatedSupplier: { label: '指定供应商', type: 'select', options: designatedSupplierOptions },
  supplierName: { label: '供应商名称', type: 'select', options: supplierOptions },
  settlementType: {
    label: '结算类型',
    type: 'select',
    options: settlementTypeOptions.map((v) => ({ label: v, value: v })),
  },
  unit: { label: '采购单位', type: 'select', options: [] },
  unitPriceExTax: { label: '不含税单价', type: 'number', precision: 2 },
  taxRate: { label: '税率(%)', type: 'number', precision: 2 },
  receivingMode: {
    label: '收货模式',
    type: 'select',
    options: receivingModeOptions.map((v) => ({ label: v, value: v })),
  },
  leadTimeDays: { label: '供货期/天', type: 'number', precision: 0 },
  deliveryDate: { label: '交货日期', type: 'date' },
  receivingWarehouse: {
    label: '收货仓库',
    type: 'select',
    options: getWarehouseSelectOptions(),
  },
  remark: { label: '备注', type: 'text' },
}

const purchaseUnitOpts = computed(() => {
  void unitState.units
  return getPurchaseUnitOptions()
})

// 批量编辑下拉随单位字典刷新
watch(
  purchaseUnitOpts,
  (opts) => {
    batchEditMeta.unit.options = opts
  },
  { immediate: true },
)

function filterUnitOption(input, option) {
  return (option?.label || '').toLowerCase().includes(String(input || '').toLowerCase())
}

function onUnitChange(record) {
  record.purchaseUnit = record.unit || record.purchaseUnit || ''
  onRowChange(record)
}

const columns = [
  { title: '序号', key: 'index', width: 52, align: 'center', fixed: 'left' },
  {
    title: '物料名称',
    key: 'materialName',
    dataIndex: 'materialName',
    width: 110,
    ellipsis: true,
    fixed: 'left',
  },
  { title: '物料类型', key: 'materialType', dataIndex: 'materialType', width: 90 },
  { title: '物料编码', key: 'materialCode', dataIndex: 'materialCode', width: 120 },
  { title: '型号规格', key: 'specModel', dataIndex: 'specModel', width: 100 },
  { title: '材质', key: 'material', dataIndex: 'material', width: 80 },
  { title: '需求量', key: 'demandQty', dataIndex: 'demandQty', width: 80, align: 'right' },
  { title: '采购单位', key: 'unit', dataIndex: 'unit', width: 80 },
  {
    title: '订货尺寸',
    key: 'orderSizeText',
    dataIndex: 'orderSizeText',
    width: 160,
    ellipsis: true,
  },
  { title: '计划采购量', key: 'planPurchaseQty', width: 100 },
  { title: '指定供应商', key: 'designatedSupplier', width: 100 },
  { title: '供应商名称', key: 'supplierName', width: 120 },
  { title: '收货仓库', key: 'receivingWarehouse', width: 100 },
  { title: '结算类型', key: 'settlementType', width: 120 },
  { title: '不含税单价', key: 'unitPriceExTax', width: 100 },
  { title: '税率(%)', key: 'taxRate', width: 80 },
  { title: '单价（含税）', key: 'unitPriceInTax', width: 100, align: 'right' },
  { title: '总价（不含税）', key: 'totalPriceExTax', width: 110, align: 'right' },
  { title: '总价（含税）', key: 'totalPriceInTax', width: 100, align: 'right' },
  { title: '收货模式', key: 'receivingMode', width: 100 },
  { title: '供货期/天', key: 'leadTimeDays', width: 90 },
  {
    title: '期望到货日期',
    key: 'expectedArrivalDate',
    dataIndex: 'expectedArrivalDate',
    width: 120,
  },
  { title: '交货日期', key: 'deliveryDate', width: 120 },
  { title: '采购申请单号', key: 'sourceReqNos', width: 140, ellipsis: true },
  { title: '销售单号', key: 'sourceSalesOrderNos', width: 130, ellipsis: true },
  { title: '备注', key: 'remark', width: 100 },
  { title: '操作', key: 'action', width: 96, align: 'center', fixed: 'right' },
]

const supplierOpts = supplierOptions
const settlementOpts = settlementTypeOptions.map((v) => ({ label: v, value: v }))
const receivingModeOpts = receivingModeOptions.map((v) => ({ label: v, value: v }))
const warehouseOpts = computed(() => {
  void warehouseState.warehouses
  return getWarehouseSelectOptions()
})
const designatedOpts = designatedSupplierOptions

const tableScrollX = computed(() => columns.reduce((s, c) => s + (c.width || 100), 0))

const batchEditLabel = computed(() => batchEditMeta[batchEditKey.value]?.label || '')
const batchEditType = computed(() => batchEditMeta[batchEditKey.value]?.type || 'text')
const batchEditOptions = computed(() => {
  const key = batchEditKey.value
  if (key === 'receivingWarehouse') return warehouseOpts.value
  return batchEditMeta[key]?.options || []
})
const batchEditPrecision = computed(() => batchEditMeta[batchEditKey.value]?.precision ?? 2)
const batchEditDateValue = computed(() =>
  batchEditValue.value ? dayjs(batchEditValue.value) : null,
)

const summaryCells = computed(() => {
  const dataCols = columns.slice(1)
  return dataCols.map((col) => {
    if (col.key === 'demandQty') {
      return { key: col.key, value: formatNum(totals.value.demandQty), align: 'right' }
    }
    if (col.key === 'planPurchaseQty') {
      return { key: col.key, value: formatNum(totals.value.planPurchaseQty), align: 'right' }
    }
    if (col.key === 'totalPriceExTax') {
      return { key: col.key, value: formatNum(totals.value.totalPriceExTax), align: 'right' }
    }
    if (col.key === 'totalPriceInTax') {
      return { key: col.key, value: formatNum(totals.value.totalPriceInTax), align: 'right' }
    }
    return { key: col.key, value: '', align: undefined }
  })
})

const totals = computed(() =>
  rows.value.reduce(
    (acc, row) => {
      acc.demandQty += Number(row.demandQty) || 0
      acc.planPurchaseQty += Number(row.planPurchaseQty) || 0
      acc.totalPriceExTax += Number(row.totalPriceExTax) || 0
      acc.totalPriceInTax += Number(row.totalPriceInTax) || 0
      return acc
    },
    { demandQty: 0, planPurchaseQty: 0, totalPriceExTax: 0, totalPriceInTax: 0 },
  ),
)

watch(
  () => props.open,
  (val) => {
    if (!val) return
    rows.value = mergeRequisitionLines(props.requisitions).map((r) => {
      const row = { ...r }
      recalcMergedLine(row)
      if (!row.receivingWarehouse) {
        row.receivingWarehouse =
          resolveDefaultWarehouseByMaterialCode(row.materialCode) || undefined
      }
      return row
    })
  },
)

function formatNum(val) {
  const n = Number(val) || 0
  return Number.isInteger(n) ? String(n) : n.toFixed(2)
}

function dateValue(val) {
  return val ? dayjs(val) : null
}

function onDateChange(record, field, date) {
  record[field] = date ? date.format('YYYY-MM-DD') : ''
}

function onRowChange(record) {
  recalcMergedLine(record)
}

function openBatchEdit(key) {
  batchEditKey.value = key
  const meta = batchEditMeta[key]
  if (meta?.type === 'number') batchEditValue.value = 0
  else if (meta?.type === 'select' && key === 'designatedSupplier') batchEditValue.value = false
  else batchEditValue.value = undefined
  batchEditOpen.value = true
}

function applyBatchEdit() {
  const key = batchEditKey.value
  rows.value.forEach((row) => {
    row[key] = batchEditValue.value
    if (['planPurchaseQty', 'unitPriceExTax', 'taxRate'].includes(key)) {
      recalcMergedLine(row)
    }
  })
  batchEditOpen.value = false
}

function removeFromOrder(record) {
  rows.value = rows.value.filter((r) => r.key !== record.key)
  if (!rows.value.length) {
    message.info('明细已全部移出，请重新选择申请单后再生成')
  }
}

function handleCancel() {
  emit('update:open', false)
}

function handleConfirm() {
  if (!rows.value.length) {
    message.warning('没有可生成的明细，请先保留至少一行')
    return
  }
  const missingSupplier = rows.value.filter((r) => !r.supplierName)
  if (missingSupplier.length) {
    message.warning('请为所有行指定供应商名称后再生成')
    return
  }

  rows.value.forEach(recalcMergedLine)
  const result = confirmGeneratePurchaseOrders(rows.value)
  message.success(`已按供应商生成 ${result.poCount} 张采购单：${result.poNos.join('、')}`)
  emit('generated', result)
  emit('update:open', false)
}
</script>

<style lang="less" scoped>
.header-edit-icon {
  margin-left: 4px;
  font-size: 12px;
  color: #1677ff;
  cursor: pointer;
}

:deep(.ant-table-summary) {
  background: #fafafa;
  font-weight: 600;
}
</style>
