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
              <a-form-item label="申请人">
                <a-input v-model:value="form.applicant" size="small" />
              </a-form-item>
            </a-col>
            <a-col :span="16">
              <a-form-item label="备注">
                <a-input v-model:value="form.remark" size="small" />
              </a-form-item>
            </a-col>
          </a-row>
        </a-form>
      </div>

      <div class="section-block">
        <div class="line-toolbar">
          <a-space>
            <a-button type="primary" size="small" :disabled="!form.warehouse" @click="openPicker">
              <PlusOutlined />
              从库存添加
            </a-button>
            <span class="hint">带入账面后填写实盘数量；差异 = 实盘 − 账面</span>
          </a-space>
        </div>
        <a-table
          :columns="lineColumns"
          :data-source="form.lineItems"
          row-key="id"
          size="small"
          bordered
          :pagination="false"
          :scroll="{ x: 1000, y: 360 }"
        >
          <template #bodyCell="{ column, record, index }">
            <template v-if="column.key === 'index'">{{ index + 1 }}</template>
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
            <template v-else-if="column.key === 'batchNo'">
              {{ record.batchNo || (record.salesOrderNo ? `按单 ${record.salesOrderNo}` : '—') }}
            </template>
            <template v-else-if="column.key === 'action'">
              <a class="danger-link" @click="removeLine(record.id)">删除</a>
            </template>
            <template v-else>
              {{ record[column.dataIndex] ?? '—' }}
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

  <a-modal
    v-model:open="pickerOpen"
    title="选择盘点库存"
    width="860px"
    ok-text="添加"
    @ok="confirmPicker"
  >
    <a-space style="margin-bottom: 8px">
      <a-checkbox v-model:checked="includeDedicated">含按单在库批次</a-checkbox>
      <a-input
        v-model:value="pickerKeyword"
        size="small"
        allow-clear
        placeholder="编码/名称"
        style="width: 200px"
      />
    </a-space>
    <a-table
      :columns="pickerColumns"
      :data-source="pickerRows"
      row-key="rowKey"
      size="small"
      :pagination="{ pageSize: 8 }"
      :row-selection="pickerSelection"
      :scroll="{ y: 360 }"
    />
  </a-modal>
</template>

<script setup>
import { computed, reactive, ref, watch } from 'vue'
import { message } from 'ant-design-vue'
import dayjs from 'dayjs'
import { CheckOutlined, PlusOutlined } from '@ant-design/icons-vue'
import FormCreateShell from '@/components/FormCreateShell.vue'
import { useFormCreateModal } from '@/composables/useFormCreateModal'
import { getWarehouseSelectOptions } from '@/store/warehouseStore'
import { stockState } from '@/store/stockStore'
import { listBatches, listFreeBatches, sumFreeQty } from '@/store/stockBatchStore'
import { createStocktakeLine } from '@/mock/stocktakeOrders'
import { addStocktakeOrder, updateStocktakeOrder } from '@/store/stocktakeOrderStore'
import { getWarehouseStockQty } from '@/utils/inboundLineHelpers'

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
const includeDedicated = ref(false)
const pickerKeyword = ref('')
const selectedPickerKeys = ref([])

const form = reactive({
  docNo: '',
  warehouse: undefined,
  stocktakeDate: dayjs().format('YYYY-MM-DD'),
  applicant: 'admin1',
  remark: '',
  lineItems: [],
})

const warehouseOpts = computed(() => getWarehouseSelectOptions())

const lineColumns = [
  { title: '#', key: 'index', width: 48, align: 'center' },
  { title: '物品编码', dataIndex: 'itemCode', width: 120 },
  { title: '物品名称', dataIndex: 'itemName', width: 140 },
  { title: '单位', dataIndex: 'unit', width: 64 },
  { title: '账面', dataIndex: 'bookQty', width: 88, align: 'right' },
  { title: '实盘', key: 'actualQty', width: 110 },
  { title: '差异', key: 'diffQty', width: 88, align: 'right' },
  { title: '批次/归属', key: 'batchNo', width: 140 },
  { title: '操作', key: 'action', width: 72, fixed: 'right' },
]

const pickerColumns = [
  { title: '编码', dataIndex: 'itemCode', width: 120 },
  { title: '名称', dataIndex: 'itemName', width: 140 },
  { title: '账面', dataIndex: 'qty', width: 90, align: 'right' },
  { title: '单位', dataIndex: 'unit', width: 64 },
  { title: '批次', dataIndex: 'batchNo', width: 120 },
  { title: '销售单', dataIndex: 'salesOrderNo', width: 120 },
]

const pickerRows = computed(() => {
  const wh = form.warehouse
  if (!wh) return []
  const kw = String(pickerKeyword.value || '')
    .trim()
    .toLowerCase()
  const rows = []

  if (includeDedicated.value) {
    listBatches({ warehouse: wh, inStockOnly: true }).forEach((b) => {
      const qty = Number(b.currentLength) || 0
      if (!(qty > 0)) return
      rows.push({
        rowKey: `b-${b.id}`,
        itemCode: b.itemCode,
        itemName: b.itemName,
        qty,
        unit: b.unit || '件',
        batchId: b.id,
        batchNo: b.batchNo,
        salesOrderId: b.salesOrderId || '',
        salesOrderNo: b.salesOrderNo || '',
        salesLineId: b.salesLineId || '',
      })
    })
  } else {
    const codes = new Set()
    listFreeBatches({ warehouse: wh }).forEach((b) => codes.add(b.itemCode))
    ;(stockState.records || []).forEach((r) => {
      if (r.warehouse === wh && r.itemCode) codes.add(r.itemCode)
    })
    codes.forEach((code) => {
      const free = sumFreeQty({ warehouse: wh, itemCode: code })
      const whQty = getWarehouseStockQty(wh, code)
      const qty = free > 0 ? free : whQty
      if (!(qty > 0)) return
      const sample = listFreeBatches({ warehouse: wh, itemCode: code })[0]
      const name =
        sample?.itemName ||
        stockState.records.find((r) => r.warehouse === wh && r.itemCode === code)?.itemName ||
        code
      rows.push({
        rowKey: `f-${code}`,
        itemCode: code,
        itemName: name,
        qty,
        unit: sample?.unit || '件',
        batchId: '',
        batchNo: '',
        salesOrderId: '',
        salesOrderNo: '',
        salesLineId: '',
      })
    })
  }

  return rows.filter((r) => {
    if (!kw) return true
    return (
      String(r.itemCode).toLowerCase().includes(kw) || String(r.itemName).toLowerCase().includes(kw)
    )
  })
})

const pickerSelection = computed(() => ({
  selectedRowKeys: selectedPickerKeys.value,
  onChange: (keys) => {
    selectedPickerKeys.value = keys
  },
}))

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
    applicant: 'admin1',
    remark: '',
    lineItems: [],
  })
}

function loadEdit(record) {
  Object.assign(form, {
    docNo: record.docNo || '',
    warehouse: record.warehouse,
    stocktakeDate: record.stocktakeDate || dayjs().format('YYYY-MM-DD'),
    applicant: record.applicant || 'admin1',
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
  selectedPickerKeys.value = []
  pickerOpen.value = true
}

function confirmPicker() {
  const map = new Map(pickerRows.value.map((r) => [r.rowKey, r]))
  selectedPickerKeys.value.forEach((key) => {
    const row = map.get(key)
    if (!row) return
    const exists = form.lineItems.some(
      (l) => l.itemCode === row.itemCode && (l.batchId || '') === (row.batchId || ''),
    )
    if (exists) return
    form.lineItems.push(
      createStocktakeLine({
        itemCode: row.itemCode,
        itemName: row.itemName,
        unit: row.unit,
        bookQty: row.qty,
        actualQty: row.qty,
        diffQty: 0,
        batchId: row.batchId || '',
        batchNo: row.batchNo || '',
        salesOrderId: row.salesOrderId || '',
        salesOrderNo: row.salesOrderNo || '',
        salesLineId: row.salesLineId || '',
      }),
    )
  })
  pickerOpen.value = false
}

function removeLine(id) {
  form.lineItems = form.lineItems.filter((l) => l.id !== id)
}

function handleSave() {
  saving.value = true
  form.lineItems.forEach(syncDiff)
  const payload = {
    docNo: form.docNo,
    warehouse: form.warehouse,
    stocktakeDate: form.stocktakeDate,
    applicant: form.applicant,
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
  padding: 16px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
}
.section-title {
  font-size: 14px;
  font-weight: 600;
  margin-bottom: 12px;
}
.line-toolbar {
  margin-bottom: 8px;
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
