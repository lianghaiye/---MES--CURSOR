<template>
  <a-modal
    :open="open"
    title="变更交付方式"
    width="920px"
    :mask-closable="false"
    destroy-on-close
    @cancel="handleCancel"
  >
    <a-form layout="vertical" class="change-mode-form">
      <div v-for="(row, index) in formRows" :key="row.key" class="change-row">
        <a-row :gutter="12" align="middle">
          <a-col :span="7">
            <a-form-item label="选择产品" required>
              <a-select
                v-model:value="row.lineId"
                show-search
                placeholder="请选择产品"
                :options="productOptionsForRow(row)"
                :filter-option="filterProductOption"
                @change="(v) => onProductChange(row, v)"
              />
            </a-form-item>
          </a-col>
          <a-col :span="4">
            <a-form-item label="当前交付方式">
              <a-input :value="row.currentMode || '—'" disabled />
            </a-form-item>
          </a-col>
          <a-col :span="4">
            <a-form-item label="变更交付方式" required>
              <a-select
                v-model:value="row.newMode"
                placeholder="请选择"
                :options="deliveryModeOpts"
              />
            </a-form-item>
          </a-col>
          <a-col :span="3">
            <a-form-item label="已发货数量">
              <a-input :value="formatQty(row.shippedQty)" disabled />
            </a-form-item>
          </a-col>
          <a-col :span="4">
            <a-form-item label="变更数量" required>
              <a-input-number
                v-model:value="row.changeQty"
                :min="1"
                :max="row.availableQty || 1"
                :precision="0"
                style="width: 100%"
                placeholder="请输入"
              />
            </a-form-item>
          </a-col>
          <a-col :span="2" class="row-actions">
            <a-button
              type="link"
              danger
              size="small"
              :disabled="formRows.length <= 1"
              @click="removeRow(index)"
            >
              删除
            </a-button>
          </a-col>
        </a-row>
      </div>

      <a-button type="dashed" block :disabled="!canAddRow" @click="addRow">
        <PlusOutlined />
        添加变更行
      </a-button>
    </a-form>

    <template #footer>
      <a-button @click="handleCancel">取消</a-button>
      <a-button type="primary" @click="handleConfirm">确认</a-button>
    </template>
  </a-modal>
</template>

<script>
import { formatQty } from '@/utils/numberFormat'
export default { name: 'ChangeDeliveryModeModal' }
</script>

<script setup>
import { computed, ref, watch } from 'vue'
import { Modal, message } from 'ant-design-vue'
import { PlusOutlined } from '@ant-design/icons-vue'
import { deliveryModeOptions } from '@/utils/salesDeliveryMode'
import {
  buildEligibleDeliveryModeLines,
  collectDeliveryModeChangeWarnings,
  formatProductOptionLabel,
  validateChangeDeliveryRows,
} from '@/utils/changeDeliveryMode'
import { changeSalesOrderDeliveryMode } from '@/store/salesOrderStore'

const props = defineProps({
  open: Boolean,
  salesOrder: { type: Object, default: null },
})

const emit = defineEmits(['update:open', 'saved'])

const deliveryModeOpts = deliveryModeOptions.map((v) => ({ label: v, value: v }))
const formRows = ref([])

const eligibleLines = computed(() =>
  props.salesOrder ? buildEligibleDeliveryModeLines(props.salesOrder) : [],
)

const canAddRow = computed(() => {
  const used = new Set(formRows.value.map((r) => r.lineId).filter(Boolean))
  return eligibleLines.value.some((line) => !used.has(line.lineId))
})

function createEmptyRow() {
  return {
    key: `row-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    lineId: undefined,
    productName: '',
    currentMode: '',
    newMode: undefined,
    shippedQty: 0,
    availableQty: 0,
    changeQty: undefined,
  }
}

function productOptionsForRow(row) {
  const usedElsewhere = new Set(
    formRows.value.filter((r) => r.key !== row.key && r.lineId).map((r) => r.lineId),
  )
  return eligibleLines.value
    .filter((line) => !usedElsewhere.has(line.lineId) || line.lineId === row.lineId)
    .map((line) => ({
      label: formatProductOptionLabel(line),
      value: line.lineId,
    }))
}

function filterProductOption(input, option) {
  return String(option?.label || '')
    .toLowerCase()
    .includes(String(input || '').toLowerCase())
}

function onProductChange(row, lineId) {
  const meta = eligibleLines.value.find((l) => l.lineId === lineId)
  if (!meta) return
  row.productName = meta.productName
  row.currentMode = meta.currentMode
  row.shippedQty = meta.shippedQty
  row.availableQty = meta.availableQty
  row.changeQty = meta.availableQty
  row.newMode = undefined
}

function addRow() {
  if (!canAddRow.value) {
    message.warning('没有更多可变更的产品')
    return
  }
  formRows.value.push(createEmptyRow())
}

function removeRow(index) {
  formRows.value.splice(index, 1)
}

function resetForm() {
  formRows.value = [createEmptyRow()]
}

function handleCancel() {
  emit('update:open', false)
}

function handleConfirm() {
  if (!props.salesOrder) return

  const rows = formRows.value.map((row) => ({
    lineId: row.lineId,
    productName: row.productName,
    newMode: row.newMode,
    changeQty: row.changeQty,
  }))

  const check = validateChangeDeliveryRows(props.salesOrder, rows)
  if (!check.ok) {
    message.warning(check.message)
    return
  }

  const warnings = collectDeliveryModeChangeWarnings(props.salesOrder, rows)
  const submit = () => {
    const res = changeSalesOrderDeliveryMode(props.salesOrder.id, rows)
    if (!res.ok) {
      message.warning(res.message)
      return
    }
    message.success(res.message)
    emit('saved')
    emit('update:open', false)
  }

  if (!warnings.length) {
    submit()
    return
  }

  Modal.confirm({
    title: '变更确认',
    content: warnings.join('\n'),
    okText: '确认变更',
    cancelText: '取消',
    onOk: submit,
  })
}

watch(
  () => props.open,
  (v) => {
    if (!v) return
    resetForm()
  },
)
</script>

<style scoped>
.change-mode-form {
  margin-top: 4px;
}
.change-row {
  margin-bottom: 8px;
  padding-bottom: 8px;
  border-bottom: 1px dashed #f0f0f0;
}
.change-row:last-of-type {
  border-bottom: none;
}
.row-actions {
  padding-top: 30px;
}
</style>
