<template>
  <FormCreateShell
    :page-mode="pageMode"
    :open="open"
    :title="shellTitle"
    width="1100px"
    class="transfer-form-modal"
    @cancel="onShellCancel"
    @update:open="(val) => emit('update:open', val)"
  >
    <div class="form-layout">
      <div class="section-block">
        <div class="section-title">基本信息</div>
        <a-form :model="form" layout="inline" class="header-form">
          <a-row :gutter="[12, 12]" style="width: 100%">
            <a-col :span="8">
              <a-form-item label="调拨单号">
                <a-input
                  v-model:value="form.docNo"
                  size="small"
                  placeholder="不填则自动生成"
                  :disabled="isEdit"
                />
              </a-form-item>
            </a-col>
            <a-col :span="8">
              <a-form-item label="调出仓库" required>
                <a-select
                  v-model:value="form.fromWarehouse"
                  size="small"
                  allow-clear
                  show-search
                  placeholder="请选择"
                  :options="warehouseOpts"
                  @change="onFromWarehouseChange"
                />
              </a-form-item>
            </a-col>
            <a-col :span="8">
              <a-form-item label="调入仓库" required>
                <a-select
                  v-model:value="form.toWarehouse"
                  size="small"
                  allow-clear
                  show-search
                  placeholder="请选择"
                  :options="warehouseOpts"
                />
              </a-form-item>
            </a-col>
            <a-col :span="8">
              <a-form-item label="调拨日期">
                <a-date-picker
                  v-model:value="form.transferDate"
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
            <a-col :span="8">
              <a-form-item label="备注">
                <a-input v-model:value="form.remark" size="small" />
              </a-form-item>
            </a-col>
          </a-row>
        </a-form>
      </div>

      <div class="section-block section-block--lines">
        <div class="line-toolbar">
          <a-space>
            <a-button
              type="primary"
              size="small"
              :disabled="!form.fromWarehouse"
              @click="openPicker"
            >
              <PlusOutlined />
              从库存添加
            </a-button>
            <span class="hint">默认自由备货；按单在库请在弹窗 TAB 中切换选择</span>
          </a-space>
        </div>
        <a-table
          :columns="lineColumns"
          :data-source="form.lineItems"
          row-key="id"
          size="small"
          bordered
          :pagination="false"
          :scroll="{ x: 960, y: 360 }"
        >
          <template #bodyCell="{ column, record, index }">
            <template v-if="column.key === 'index'">{{ index + 1 }}</template>
            <template v-else-if="column.key === 'qty'">
              <a-input-number
                v-model:value="record.qty"
                :min="0.001"
                :precision="4"
                size="small"
                style="width: 100%"
              />
            </template>
            <template v-else-if="column.key === 'batchNo'">
              {{
                record.batchNo || (record.salesOrderNo ? `按单 ${record.salesOrderNo}` : '自由备货')
              }}
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
      <a-button :loading="saving" @click="handleSave">保存</a-button>
      <a-button type="primary" :loading="saving" @click="handleSaveAndConfirm">
        <CheckOutlined />
        保存并确认
      </a-button>
    </template>
  </FormCreateShell>

  <TransferStockPickModal
    v-model:open="pickerOpen"
    :warehouse="form.fromWarehouse"
    @confirm="onPickerConfirm"
  />
</template>

<script setup>
import { computed, reactive, ref, watch } from 'vue'
import { message } from 'ant-design-vue'
import dayjs from 'dayjs'
import { CheckOutlined, PlusOutlined } from '@ant-design/icons-vue'
import FormCreateShell from '@/components/FormCreateShell.vue'
import TransferStockPickModal from '@/views/inventory/components/TransferStockPickModal.vue'
import { useFormCreateModal } from '@/composables/useFormCreateModal'
import { getWarehouseSelectOptions } from '@/store/warehouseStore'
import { createTransferLine } from '@/mock/transferOrders'
import {
  addTransferOrder,
  updateTransferOrder,
  saveAndConfirmTransfer,
} from '@/store/transferOrderStore'

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
  listPath: '/inventory/transfer',
  getTitle: () => (isEdit.value ? '编辑调拨单' : '新增调拨单'),
})

const saving = ref(false)
const pickerOpen = ref(false)

const form = reactive({
  docNo: '',
  fromWarehouse: undefined,
  toWarehouse: undefined,
  transferDate: dayjs().format('YYYY-MM-DD'),
  applicant: 'admin1',
  remark: '',
  lineItems: [],
})

const warehouseOpts = computed(() => getWarehouseSelectOptions())

const lineColumns = [
  { title: '#', key: 'index', width: 48, align: 'center' },
  { title: '物品编码', dataIndex: 'itemCode', width: 120 },
  { title: '物品名称', dataIndex: 'itemName', width: 140 },
  { title: '规格', dataIndex: 'specModel', width: 100 },
  { title: '单位', dataIndex: 'unit', width: 64 },
  { title: '账面', dataIndex: 'bookQty', width: 88, align: 'right' },
  { title: '调拨数量', key: 'qty', width: 110 },
  { title: '批次/归属', key: 'batchNo', width: 140 },
  { title: '操作', key: 'action', width: 72, fixed: 'right' },
]

function resetForm() {
  Object.assign(form, {
    docNo: '',
    fromWarehouse: undefined,
    toWarehouse: undefined,
    transferDate: dayjs().format('YYYY-MM-DD'),
    applicant: 'admin1',
    remark: '',
    lineItems: [],
  })
}

function loadEdit(record) {
  Object.assign(form, {
    docNo: record.docNo || '',
    fromWarehouse: record.fromWarehouse,
    toWarehouse: record.toWarehouse,
    transferDate: record.transferDate || dayjs().format('YYYY-MM-DD'),
    applicant: record.applicant || 'admin1',
    remark: record.remark || '',
    lineItems: (record.lineItems || []).map((l) => createTransferLine({ ...l })),
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

function onFromWarehouseChange() {
  form.lineItems = []
}

function openPicker() {
  if (!form.fromWarehouse) {
    message.warning('请先选择调出仓库')
    return
  }
  pickerOpen.value = true
}

function onPickerConfirm(rows) {
  ;(rows || []).forEach((row) => {
    const exists = form.lineItems.some(
      (l) =>
        l.itemCode === row.itemCode &&
        (l.batchId || '') === (row.batchId || '') &&
        (l.salesOrderNo || '') === (row.salesOrderNo || ''),
    )
    if (exists) return
    form.lineItems.push(
      createTransferLine({
        itemCode: row.itemCode,
        itemName: row.itemName,
        itemType: row.itemType || '物料',
        specModel: row.specModel || '',
        material: row.material || '',
        unit: row.unit,
        bookQty: row.qty,
        qty: row.qty,
        batchId: row.batchId || '',
        batchNo: row.batchNo || '',
        salesOrderId: row.salesOrderId || '',
        salesOrderNo: row.salesOrderNo || '',
        salesLineId: row.salesLineId || '',
        locationNo: row.locationNo || '',
      }),
    )
  })
}

function removeLine(id) {
  form.lineItems = form.lineItems.filter((l) => l.id !== id)
}

function handleSave() {
  saving.value = true
  const payload = {
    docNo: form.docNo,
    fromWarehouse: form.fromWarehouse,
    toWarehouse: form.toWarehouse,
    transferDate: form.transferDate,
    applicant: form.applicant,
    remark: form.remark,
    lineItems: form.lineItems,
  }
  const res = isEdit.value
    ? updateTransferOrder(props.editRecord.id, { ...payload, id: props.editRecord.id })
    : addTransferOrder(payload)
  saving.value = false
  if (!res.ok) {
    message.warning(res.message || '保存失败')
    return
  }
  message.success(isEdit.value ? '调拨单已更新' : '调拨单已创建')
  emit('saved')
  closeAfterSave()
}

function handleSaveAndConfirm() {
  saving.value = true
  const payload = {
    id: isEdit.value ? props.editRecord.id : undefined,
    docNo: form.docNo,
    fromWarehouse: form.fromWarehouse,
    toWarehouse: form.toWarehouse,
    transferDate: form.transferDate,
    applicant: form.applicant,
    remark: form.remark,
    lineItems: form.lineItems,
  }
  const res = saveAndConfirmTransfer(payload)
  saving.value = false
  if (!res.ok) {
    message.warning(res.message || '保存并确认失败')
    return
  }
  message.success('已保存并确认出库')
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
.header-form :deep(.ant-form-item) {
  margin-bottom: 0;
  width: 100%;
}
</style>
