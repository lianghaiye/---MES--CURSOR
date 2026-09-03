<template>
  <a-modal
    :open="open"
    title="生成质检单"
    width="1100px"
    :mask-closable="false"
    destroy-on-close
    :confirm-loading="saving"
    ok-text="确认"
    cancel-text="取消"
    @cancel="handleCancel"
    @ok="handleOk"
  >
    <div class="section-block">
      <div class="section-title">基本信息</div>
      <a-form layout="inline" class="basic-form header-form horizontal-form">
        <a-row :gutter="[12, 12]" style="width: 100%">
          <a-col :span="8">
            <a-form-item label="质检类型">
              <a-input value="来料质检" disabled size="small" />
            </a-form-item>
          </a-col>
          <a-col :span="8">
            <a-form-item label="质检单号">
              <a-input
                v-model:value="form.qcNo"
                allow-clear
                size="small"
                placeholder="留空则自动生成"
                :maxlength="40"
              />
            </a-form-item>
          </a-col>
          <a-col :span="8">
            <a-form-item label="收货单号">
              <a-input :value="receiptNo" disabled size="small" />
            </a-form-item>
          </a-col>
          <a-col :span="24">
            <a-form-item label="备注" class="remark-item">
              <a-textarea
                v-model:value="form.remark"
                :rows="2"
                :maxlength="200"
                show-count
                placeholder="选填"
              />
            </a-form-item>
          </a-col>
        </a-row>
      </a-form>
    </div>

    <div class="section-block">
      <div class="section-title">质检清单（{{ lines.length }}）</div>
      <a-alert
        type="info"
        show-icon
        class="tpl-tip"
        message="确认后按各物料分别匹配质检模板并冻结；不同物料可使用不同模板。"
        style="margin-bottom: 10px"
      />
      <a-table
        :columns="columns"
        :data-source="lines"
        row-key="id"
        size="small"
        bordered
        :pagination="false"
        :scroll="{ x: 1100 }"
        :locale="{ emptyText: '暂无明细，请从收货单重新打开' }"
      >
        <template #bodyCell="{ column, record, index }">
          <template v-if="column.key === 'index'">{{ index + 1 }}</template>
          <template v-else-if="column.key === 'productName'">
            {{ record.productName || record.itemName || '—' }}
          </template>
          <template v-else-if="column.key === 'productCode'">
            {{ record.productCode || record.itemCode || '—' }}
          </template>
          <template v-else-if="column.key === 'purchaseQty'">
            {{ formatQtyWithUnit(record.purchaseQty, record.unit) }}
          </template>
          <template v-else-if="column.key === 'receiptQty'">
            {{ formatQtyWithUnit(record.receiptQty, record.unit) }}
          </template>
          <template v-else-if="column.key === 'warehouse'">
            {{ record.receivingWarehouse || record.warehouse || '—' }}
          </template>
          <template v-else-if="column.key === 'action'">
            <a-button
              type="link"
              size="small"
              danger
              :disabled="lines.length <= 1"
              @click="removeLine(record.id)"
            >
              移出本单
            </a-button>
          </template>
          <template v-else>
            {{ displayCell(record, column) }}
          </template>
        </template>
      </a-table>
    </div>
  </a-modal>
</template>

<script setup>
import { computed, reactive, ref, watch } from 'vue'
import { message } from 'ant-design-vue'
import { createIncomingQcFromReceipt } from '@/store/qcTaskStore'
import { attachReceiptQcSheet, hasReceiptQcSheet } from '@/store/purchaseReceiptStore'

const props = defineProps({
  open: { type: Boolean, default: false },
  receipt: { type: Object, default: null },
})

const emit = defineEmits(['update:open', 'saved'])

const saving = ref(false)
const lines = ref([])
const form = reactive({
  qcNo: '',
  remark: '',
})

const receiptNo = computed(() => props.receipt?.receiptNo || '—')

const columns = [
  { title: '序号', key: 'index', width: 56, align: 'center', fixed: 'left' },
  { title: '产品名称', key: 'productName', width: 140, ellipsis: true },
  { title: '产品编号', key: 'productCode', width: 120, ellipsis: true },
  { title: '规格型号', dataIndex: 'specModel', width: 110, ellipsis: true },
  { title: '材质', dataIndex: 'material', width: 80, ellipsis: true },
  { title: '变体属性', dataIndex: 'variantSummary', width: 140, ellipsis: true },
  { title: '采购数量', key: 'purchaseQty', width: 110, align: 'right' },
  { title: '收货数量', key: 'receiptQty', width: 110, align: 'right' },
  { title: '收货仓库', key: 'warehouse', width: 110, ellipsis: true },
  { title: '操作', key: 'action', width: 96, fixed: 'right', align: 'center' },
]

function cloneLines(receipt) {
  return (receipt?.lineItems || [])
    .filter((l) => (Number(l.receiptQty) || Number(l.qty) || 0) > 0)
    .map((l) => ({
      ...l,
      id: l.id,
      productName: l.productName || l.itemName || '',
      productCode: l.productCode || l.itemCode || '',
      itemName: l.itemName || l.productName || '',
      itemCode: l.itemCode || l.productCode || '',
      specModel: l.specModel || '',
      material: l.material || l.materialGrade || '',
      variantSummary: l.variantSummary || '',
      unit: l.unit || '件',
      purchaseQty: l.purchaseQty,
      receiptQty: l.receiptQty ?? l.qty,
      receivingWarehouse: l.receivingWarehouse || l.warehouse || '',
    }))
}

function formatQty(val) {
  if (val == null || val === '') return '—'
  const n = Number(val)
  if (!Number.isFinite(n)) return String(val)
  return String(Number(n.toFixed(4)))
}

function formatQtyWithUnit(qty, unit) {
  const q = formatQty(qty)
  if (q === '—') return '—'
  return unit ? `${q} ${unit}` : q
}

function displayCell(record, column) {
  const key = column.dataIndex || column.key
  const val = record[key]
  return val !== undefined && val !== null && String(val).trim() !== '' ? val : '—'
}

function removeLine(id) {
  if (lines.value.length <= 1) {
    message.warning('质检清单至少保留一行')
    return
  }
  lines.value = lines.value.filter((l) => l.id !== id)
}

function resetForm() {
  form.qcNo = ''
  form.remark = ''
  lines.value = cloneLines(props.receipt)
}

watch(
  () => [props.open, props.receipt?.id],
  ([visible]) => {
    if (!visible) return
    resetForm()
  },
)

function handleCancel() {
  emit('update:open', false)
}

async function handleOk() {
  if (!props.receipt) {
    message.warning('未找到收货单')
    return Promise.reject()
  }
  if (hasReceiptQcSheet(props.receipt)) {
    message.warning('该收货单已生成质检单')
    return Promise.reject()
  }
  if (!lines.value.length) {
    message.warning('请至少保留一行质检清单')
    return Promise.reject()
  }

  saving.value = true
  try {
    const res = createIncomingQcFromReceipt({
      receipt: {
        ...props.receipt,
        lineItems: lines.value,
      },
      lineIds: lines.value.map((l) => l.id),
      qcNo: form.qcNo,
      remark: form.remark,
    })

    if (!res.ok) {
      message.warning(res.message || '生成失败')
      return Promise.reject()
    }

    attachReceiptQcSheet(props.receipt.id, {
      qcNo: res.task.qcNo,
      qcStatus: '质检中',
    })
    message.success(`已生成质检单 ${res.task.qcNo}`)
    emit('saved', res.task)
    emit('update:open', false)
  } catch (err) {
    console.error(err)
    message.error(err?.message || '生成质检单失败，请重试')
    return Promise.reject(err)
  } finally {
    saving.value = false
  }
}
</script>

<style lang="less" scoped>
.section-block {
  margin-bottom: 16px;

  &:last-child {
    margin-bottom: 0;
  }
}

.section-title {
  margin-bottom: 10px;
  font-size: 13px;
  font-weight: 600;
  color: rgba(0, 0, 0, 0.88);
}

.basic-form {
  padding: 12px 14px;
  background: #fff;
  border: 1px solid #f0f0f0;
  border-radius: 6px;

  :deep(.remark-item) {
    width: 100%;

    .ant-form-item-control {
      flex: 1;
      max-width: none;
    }

    .ant-form-item-control-input,
    .ant-form-item-control-input-content {
      width: 100%;
    }

    textarea {
      width: 100%;
    }
  }
}
</style>
