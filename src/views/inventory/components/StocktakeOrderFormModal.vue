<template>
  <FormCreateShell
    :page-mode="pageMode"
    :open="open"
    :title="shellTitle"
    width="1100px"
    class="stocktake-form-modal"
    @cancel="onShellCancel"
    @update:open="(val) => emit('update:open', val)"
  >
    <div class="form-layout">
      <div class="section-block">
        <div class="section-title">基本信息</div>
        <a-form :model="form" layout="inline" class="header-form">
          <a-row :gutter="[12, 12]" style="width: 100%">
            <a-col :span="8">
              <a-form-item label="盘点单号">
                <a-input
                  v-model:value="form.docNo"
                  size="small"
                  placeholder="不填则自动生成"
                  :disabled="isEdit"
                />
              </a-form-item>
            </a-col>
            <a-col :span="8">
              <a-form-item label="盘点仓库" required>
                <a-select
                  v-model:value="form.warehouse"
                  size="small"
                  allow-clear
                  show-search
                  placeholder="请选择"
                  :options="warehouseOpts"
                  @change="onWarehouseChange"
                />
              </a-form-item>
            </a-col>
            <a-col :span="8">
              <a-form-item label="盘点日期">
                <a-date-picker
                  v-model:value="form.stocktakeDate"
                  size="small"
                  value-format="YYYY-MM-DD"
                  style="width: 100%"
                />
              </a-form-item>
            </a-col>
            <a-col :span="8">
              <a-form-item label="盘点类型" required>
                <a-select
                  v-model:value="form.stocktakeType"
                  size="small"
                  placeholder="请选择"
                  :options="typeOpts"
                />
              </a-form-item>
            </a-col>
            <a-col :span="8">
              <a-form-item label="创建人">
                <a-input v-model:value="form.creator" size="small" />
              </a-form-item>
            </a-col>
            <a-col :span="8">
              <a-form-item label="备注">
                <a-input v-model:value="form.remark" size="small" />
              </a-form-item>
            </a-col>
          </a-row>
        </a-form>
      </div>

      <div class="section-block section-block--lines">
        <div class="section-title">盘点清单</div>
        <div class="line-toolbar">
          <a-space wrap>
            <a-button type="primary" size="small" :disabled="!form.warehouse" @click="openPicker">
              <PlusOutlined />
              添加盘点物品
            </a-button>
            <a-button size="small" :disabled="!form.warehouse" @click="loadWarehouseStock">
              加载本仓库存
            </a-button>
            <span class="hint">默认自由+按单分行；实盘默认同账面，差异 = 实盘 − 账面</span>
          </a-space>
        </div>
        <a-table
          :columns="displayColumns"
          :data-source="displayLines"
          row-key="id"
          size="small"
          bordered
          :pagination="false"
          :scroll="{ x: 1400 }"
        >
          <template #bodyCell="{ column, record, index }">
            <template v-if="column.key === 'index'">{{ index + 1 }}</template>
            <template v-else-if="column.key === 'ownership'">
              <a-tag :color="isDedicated(record) ? 'orange' : 'blue'">
                {{ isDedicated(record) ? '按单' : '自由' }}
              </a-tag>
            </template>
            <template v-else-if="column.key === 'bookQty'">
              {{ formatBookQty(record) }}
            </template>
            <template v-else-if="column.key === 'actualQty'">
              <a-input-number
                v-model:value="record.actualQty"
                :min="0"
                :precision="4"
                size="small"
                style="width: 100%"
                @change="() => syncDiff(record)"
              />
            </template>
            <template v-else-if="column.key === 'diffQty'">
              <span :class="{ 'diff-pos': record.diffQty > 0, 'diff-neg': record.diffQty < 0 }">
                {{ record.diffQty }}
              </span>
            </template>
            <template v-else-if="column.key === 'salesOrderNo'">
              {{ isDedicated(record) ? record.salesOrderNo || '—' : '—' }}
            </template>
            <template v-else-if="column.key === 'action'">
              <a class="danger-link" @click="removeLine(record.id)">删除</a>
            </template>
            <template v-else>
              {{ displayCell(record[column.dataIndex]) }}
            </template>
          </template>
        </a-table>
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

  <TransferStockPickModal
    v-model:open="pickerOpen"
    title="选择盘点库存"
    :warehouse="form.warehouse"
    ignore-soft-lock
    @confirm="onPickerConfirm"
  />
</template>

<script setup>
import { computed, reactive, ref, watch } from 'vue'
import { message } from 'ant-design-vue'
import dayjs from 'dayjs'
import { CheckOutlined, PlusOutlined } from '@ant-design/icons-vue'
import FormCreateShell from '@/components/FormCreateShell.vue'
import { useFormCreateModal } from '@/composables/useFormCreateModal'
import TransferStockPickModal from '@/views/inventory/components/TransferStockPickModal.vue'
import { getWarehouseSelectOptions } from '@/store/warehouseStore'
import { stockState } from '@/store/stockStore'
import { listBatches, listFreeBatches, sumFreeQty } from '@/store/stockBatchStore'
import { createStocktakeLine } from '@/mock/stocktakeOrders'
import { STOCKTAKE_TYPE, stocktakeTypeOptions } from '@/mock/stocktakeOptions'
import { addStocktakeOrder, updateStocktakeOrder } from '@/store/stocktakeOrderStore'
import { getWarehouseStockQty } from '@/utils/inboundLineHelpers'
import { findMasterItemByCode } from '@/utils/stockAlertDisplay'
import { lineVariantSummary } from '@/utils/spuLineResolve'
import {
  isDedicatedInventoryLine,
  sortInventoryLinesByItemCode,
  buildItemCodeRowSpans,
  withProductMergeColumns,
} from '@/utils/inventoryLineMerge'

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
  listPath: '/inventory/stocktake',
  getTitle: () => (isEdit.value ? '编辑盘点单' : '新增盘点单'),
})

const saving = ref(false)
const pickerOpen = ref(false)

const form = reactive({
  docNo: '',
  warehouse: undefined,
  stocktakeDate: dayjs().format('YYYY-MM-DD'),
  stocktakeType: STOCKTAKE_TYPE.OTHER,
  creator: 'admin1',
  remark: '',
  lineItems: [],
})

const warehouseOpts = computed(() => getWarehouseSelectOptions())
const typeOpts = stocktakeTypeOptions.map((v) => ({ label: v, value: v }))

const lineColumns = [
  { title: '序号', key: 'index', width: 56, align: 'center', fixed: 'left' },
  { title: '归属', key: 'ownership', width: 72, align: 'center' },
  { title: '产品名称', key: 'itemName', dataIndex: 'itemName', width: 140, ellipsis: true },
  { title: '编码', key: 'itemCode', dataIndex: 'itemCode', width: 130, ellipsis: true },
  { title: '规格型号', key: 'specModel', dataIndex: 'specModel', width: 110, ellipsis: true },
  { title: '材质', key: 'material', dataIndex: 'material', width: 80, ellipsis: true },
  {
    title: '变体属性',
    key: 'variantSummary',
    dataIndex: 'variantSummary',
    width: 120,
    ellipsis: true,
  },
  { title: '当前账面数量', key: 'bookQty', width: 120, align: 'right' },
  { title: '实盘', key: 'actualQty', width: 120 },
  { title: '差异', key: 'diffQty', width: 88, align: 'right' },
  { title: '销售单号', key: 'salesOrderNo', width: 140, ellipsis: true },
  { title: '操作', key: 'action', width: 72, fixed: 'right' },
]

const displayLines = computed(() => sortInventoryLinesByItemCode(form.lineItems))
const lineRowSpans = computed(() => buildItemCodeRowSpans(displayLines.value))
const displayColumns = computed(() => withProductMergeColumns(lineColumns, lineRowSpans.value))

function isDedicated(record) {
  return isDedicatedInventoryLine(record)
}

function displayCell(val) {
  const t = String(val ?? '').trim()
  return t || '—'
}

function formatBookQty(record) {
  const qty = record?.bookQty
  if (qty == null || qty === '') return '—'
  const n = Number(qty)
  const q = Number.isFinite(n) ? n : qty
  const unit = String(record?.unit || '').trim()
  return unit ? `${q} ${unit}` : String(q)
}

function resolveItemMeta(itemCode, batch) {
  const hit = findMasterItemByCode(itemCode)
  const master = hit?.item || {}
  const attrs = batch?.attrs || {}
  return {
    itemName: batch?.itemName || master.name || itemCode,
    unit: batch?.unit || master.inventoryUnit || master.stockUnit || '件',
    specModel: attrs.specModel || attrs.spec || master.specModel || master.spec || '',
    material: attrs.material || master.material || '',
    variantSummary:
      attrs.variantSummary ||
      lineVariantSummary({
        spuId: master.spuId || batch?.spuId,
        variantValues: master.variantValues || attrs.variantValues || batch?.variantValues || {},
      }) ||
      master.variantSummary ||
      '',
    itemType: hit?.kind === 'product' ? '产品' : master.itemType || '物料',
    locationNo: batch?.locationNo || attrs.locationNo || '',
  }
}

/** 加载本仓：自由+按单分行（账面不扣软锁） */
function buildStockRows(wh) {
  const rows = []
  const codes = new Set()
  listFreeBatches({ warehouse: wh }).forEach((b) => {
    if (!(b.salesOrderId || b.salesOrderNo)) codes.add(b.itemCode)
  })
  ;(stockState.records || []).forEach((r) => {
    if (r.warehouse === wh && r.itemCode) codes.add(r.itemCode)
  })
  codes.forEach((code) => {
    const free = sumFreeQty({ warehouse: wh, itemCode: code })
    const whQty = getWarehouseStockQty(wh, code)
    const qty = free > 0 ? free : whQty
    if (!(qty > 0)) return
    const sample = listFreeBatches({ warehouse: wh, itemCode: code }).find(
      (b) => !(b.salesOrderId || b.salesOrderNo),
    )
    const meta = resolveItemMeta(code, sample)
    rows.push({
      rowKey: `f-${code}`,
      itemCode: code,
      itemName: meta.itemName,
      qty,
      unit: meta.unit,
      batchId: '',
      batchNo: '',
      salesOrderId: '',
      salesOrderNo: '',
      salesLineId: '',
      dedicated: false,
      specModel: meta.specModel,
      material: meta.material,
      variantSummary: meta.variantSummary,
      itemType: meta.itemType,
      locationNo: meta.locationNo,
    })
  })

  listBatches({ warehouse: wh, inStockOnly: true }).forEach((b) => {
    if (!(b.salesOrderId || b.salesOrderNo)) return
    const qty = Number(b.currentLength) || 0
    if (!(qty > 0)) return
    const meta = resolveItemMeta(b.itemCode, b)
    rows.push({
      rowKey: `b-${b.id}`,
      itemCode: b.itemCode,
      itemName: meta.itemName,
      qty,
      unit: meta.unit,
      batchId: b.id,
      batchNo: b.batchNo || '',
      salesOrderId: b.salesOrderId || '',
      salesOrderNo: b.salesOrderNo || '',
      salesLineId: b.salesLineId || '',
      dedicated: true,
      specModel: meta.specModel,
      material: meta.material,
      variantSummary: meta.variantSummary,
      itemType: meta.itemType,
      locationNo: meta.locationNo,
    })
  })
  return rows
}

function syncDiff(record) {
  const book = Number(record.bookQty) || 0
  const actual = Number(record.actualQty) || 0
  record.diffQty = Math.round((actual - book) * 10000) / 10000
}

function resetForm() {
  Object.assign(form, {
    docNo: '',
    warehouse: undefined,
    stocktakeDate: dayjs().format('YYYY-MM-DD'),
    stocktakeType: STOCKTAKE_TYPE.OTHER,
    creator: 'admin1',
    remark: '',
    lineItems: [],
  })
}

function loadEdit(record) {
  Object.assign(form, {
    docNo: record.docNo || '',
    warehouse: record.warehouse,
    stocktakeDate: record.stocktakeDate || dayjs().format('YYYY-MM-DD'),
    stocktakeType: record.stocktakeType || STOCKTAKE_TYPE.OTHER,
    creator: record.creator || record.applicant || 'admin1',
    remark: record.remark || '',
    lineItems: (record.lineItems || []).map((l) => createStocktakeLine({ ...l })),
  })
}

watch(
  () => [isActive.value, props.editRecord?.id],
  () => {
    if (!isActive.value) return
    if (props.editRecord) loadEdit(props.editRecord)
    else resetForm()
  },
  { immediate: true },
)

function onWarehouseChange() {
  form.lineItems = []
}

function openPicker() {
  if (!form.warehouse) {
    message.warning('请先选择盘点仓库')
    return
  }
  pickerOpen.value = true
}

function pushStockRow(row) {
  const exists = form.lineItems.some(
    (l) =>
      l.itemCode === row.itemCode &&
      (l.batchId || '') === (row.batchId || '') &&
      (l.salesOrderNo || '') === (row.salesOrderNo || ''),
  )
  if (exists) return false
  form.lineItems.push(
    createStocktakeLine({
      itemCode: row.itemCode,
      itemName: row.itemName,
      itemType: row.itemType || '物料',
      specModel: row.specModel || '',
      material: row.material || '',
      variantSummary: row.variantSummary || '',
      unit: row.unit,
      bookQty: row.qty,
      actualQty: row.qty,
      diffQty: 0,
      batchId: row.batchId || '',
      batchNo: row.batchNo || '',
      salesOrderId: row.salesOrderId || '',
      salesOrderNo: row.salesOrderNo || '',
      salesLineId: row.salesLineId || '',
      locationNo: row.locationNo || '',
      dedicated: Boolean(row.dedicated),
    }),
  )
  return true
}

function onPickerConfirm(rows) {
  let n = 0
  ;(rows || []).forEach((row) => {
    if (pushStockRow(row)) n += 1
  })
  if (n) message.success(`已添加 ${n} 行`)
}

function loadWarehouseStock() {
  if (!form.warehouse) {
    message.warning('请先选择盘点仓库')
    return
  }
  const rows = buildStockRows(form.warehouse)
  let n = 0
  rows.forEach((row) => {
    if (pushStockRow(row)) n += 1
  })
  message.success(n ? `已加载 ${n} 行本仓库存` : '无可加载库存或均已在清单中')
}

function removeLine(id) {
  form.lineItems = form.lineItems.filter((l) => l.id !== id)
}

function handleSave() {
  if (!form.stocktakeType) {
    message.warning('请选择盘点类型')
    return
  }
  saving.value = true
  form.lineItems.forEach(syncDiff)
  const payload = {
    docNo: form.docNo,
    warehouse: form.warehouse,
    stocktakeDate: form.stocktakeDate,
    stocktakeType: form.stocktakeType,
    creator: form.creator,
    applicant: form.creator,
    remark: form.remark,
    lineItems: form.lineItems,
  }
  const res = isEdit.value
    ? updateStocktakeOrder(props.editRecord.id, payload)
    : addStocktakeOrder(payload)
  saving.value = false
  if (!res.ok) {
    message.warning(res.message || '保存失败')
    return
  }
  message.success(isEdit.value ? '盘点单已更新' : '盘点单已创建')
  emit('saved')
  closeAfterSave()
}
</script>

<style lang="less" scoped>
.form-layout {
  display: flex;
  flex-direction: column;
  gap: 12px;
}
.section-block {
  background: #fff;
  border-radius: 6px;
  padding: 12px;
  margin-bottom: 0;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
  flex: none;
}
.section-block--lines {
  flex: none;
}
.section-title {
  font-size: 14px;
  font-weight: 600;
  margin-bottom: 12px;
}
.line-toolbar {
  margin-bottom: 12px;
}
.hint {
  font-size: 12px;
  color: rgba(0, 0, 0, 0.45);
}
.danger-link {
  color: #ff4d4f;
}
.diff-pos {
  color: #52c41a;
}
.diff-neg {
  color: #ff4d4f;
}
.header-form :deep(.ant-form-item) {
  margin-bottom: 0;
  width: 100%;
}
</style>
