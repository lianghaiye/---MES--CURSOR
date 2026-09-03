<template>
  <a-modal
    :open="open"
    :title="`新增${bizScope}任务`"
    width="640px"
    :mask-closable="false"
    destroy-on-close
    @cancel="handleCancel"
  >
    <a-form layout="vertical" class="qc-create-form">
      <a-row v-if="isInboundScope" :gutter="16">
        <a-col :span="12">
          <a-form-item :label="sourceDocLabel" required>
            <a-input v-model:value="form.sourceDocNo" placeholder="请输入来源单号" />
          </a-form-item>
        </a-col>
        <a-col v-if="receiptLineOpts.length" :span="12">
          <a-form-item label="收货明细">
            <a-select
              v-model:value="form.sourceLineId"
              allow-clear
              placeholder="选择明细行自动带出"
              :options="receiptLineOpts"
              @change="applyReceiptLine"
            />
          </a-form-item>
        </a-col>
      </a-row>

      <a-row v-if="isProductionScope" :gutter="16">
        <a-col :span="12">
          <a-form-item label="工单号">
            <a-input v-model:value="form.workOrderNo" placeholder="请输入工单号" />
          </a-form-item>
        </a-col>
        <a-col :span="12">
          <a-form-item label="工序名称">
            <a-input v-model:value="form.processName" placeholder="请输入工序名称" />
          </a-form-item>
        </a-col>
      </a-row>

      <a-row :gutter="16">
        <a-col :span="12">
          <a-form-item label="物料编码" required>
            <a-input v-model:value="form.itemCode" placeholder="请输入物料编码" />
          </a-form-item>
        </a-col>
        <a-col :span="12">
          <a-form-item label="物料名称">
            <a-input v-model:value="form.itemName" placeholder="请输入物料名称" />
          </a-form-item>
        </a-col>
        <a-col :span="12">
          <a-form-item label="规格型号">
            <a-input v-model:value="form.specModel" placeholder="请输入规格型号" />
          </a-form-item>
        </a-col>
        <a-col :span="12">
          <a-form-item label="单位">
            <a-input v-model:value="form.unit" placeholder="件" />
          </a-form-item>
        </a-col>
        <a-col :span="12">
          <a-form-item label="检验数量" required>
            <a-input-number
              v-model:value="form.inspectQty"
              :min="0.0001"
              :precision="4"
              style="width: 100%"
              placeholder="请输入"
            />
          </a-form-item>
        </a-col>
        <a-col :span="12">
          <a-form-item label="检验方式">
            <a-select
              v-model:value="form.inspectMethod"
              :options="inspectMethodOpts"
              placeholder="请选择"
            />
          </a-form-item>
        </a-col>
        <a-col :span="12">
          <a-form-item label="质检模板">
            <a-select
              v-model:value="form.templateCode"
              allow-clear
              show-search
              placeholder="留空自动匹配"
              :options="templateOpts"
            />
          </a-form-item>
        </a-col>
        <a-col :span="24">
          <a-form-item label="备注">
            <a-textarea v-model:value="form.remark" placeholder="选填" :rows="2" />
          </a-form-item>
        </a-col>
      </a-row>
    </a-form>

    <template #footer>
      <a-button @click="handleCancel">取消</a-button>
      <a-button type="primary" :loading="saving" @click="handleSave">创建</a-button>
    </template>
  </a-modal>
</template>

<script setup>
import { computed, reactive, ref, watch } from 'vue'
import { message } from 'ant-design-vue'
import { createManualQcTask } from '@/store/qcTaskStore'
import { attachReceiptQcSheet as attachPurchaseReceiptQc } from '@/store/purchaseReceiptStore'
import { attachReceiptQcSheet as attachOutsourcingReceiptQc } from '@/store/outsourcingReceiptStore'
import { qcTemplateState } from '@/store/qcTemplateStore'

const props = defineProps({
  open: { type: Boolean, default: false },
  bizScope: { type: String, required: true },
  sourceReceipt: { type: Object, default: null },
})

const emit = defineEmits(['update:open', 'saved'])

const INBOUND_SCOPES = new Set(['来料质检', '外协回货检'])
const isInboundScope = computed(() => INBOUND_SCOPES.has(props.bizScope))
const isProductionScope = computed(() => !isInboundScope.value)

const sourceDocLabel = computed(() =>
  props.bizScope === '外协回货检' ? '外协收货单号' : '采购收货单号',
)

const saving = ref(false)
const receiptLines = ref([])

const form = reactive(emptyForm())

const inspectMethodOpts = [
  { label: '抽检', value: '抽检' },
  { label: '全检', value: '全检' },
]

const templateOpts = computed(() =>
  qcTemplateState.templates
    .filter((t) => t.bizScope === props.bizScope && t.status === '启用')
    .map((t) => ({ label: `${t.code} ${t.name}`, value: t.code })),
)

const receiptLineOpts = computed(() =>
  receiptLines.value.map((line) => ({
    label: `${line.itemCode || line.itemName || line.id} / ${line.receiptQty ?? line.qty ?? 0}`,
    value: line.id,
    line,
  })),
)

function emptyForm() {
  return {
    sourceDocNo: '',
    sourceDocId: '',
    sourceLineId: undefined,
    workOrderNo: '',
    processName: '',
    itemCode: '',
    itemName: '',
    specModel: '',
    unit: '件',
    inspectQty: undefined,
    inspectMethod: '抽检',
    templateCode: undefined,
    remark: '',
  }
}

function resetForm() {
  Object.assign(form, emptyForm())
  receiptLines.value = []
}

function loadSourceReceipt(receipt) {
  if (!receipt) return
  form.sourceDocNo = receipt.receiptNo || ''
  form.sourceDocId = receipt.id || ''
  receiptLines.value = receipt.lineItems || receipt.lines || []
  if (receiptLines.value.length === 1) {
    form.sourceLineId = receiptLines.value[0].id
    applyReceiptLine(form.sourceLineId)
  }
}

function applyReceiptLine(lineId) {
  const hit = receiptLineOpts.value.find((o) => o.value === lineId)
  if (!hit?.line) return
  const line = hit.line
  form.itemCode = line.itemCode || line.productCode || line.materialCode || ''
  form.itemName = line.itemName || line.productName || line.materialName || ''
  form.specModel = line.specModel || line.spec || ''
  form.unit = line.unit || '件'
  form.inspectQty = Number(line.receiptQty ?? line.qty ?? line.receivedQty) || undefined
}

watch(
  () => [props.open, props.sourceReceipt?.id],
  ([visible]) => {
    if (!visible) return
    resetForm()
    loadSourceReceipt(props.sourceReceipt)
  },
)

function handleCancel() {
  emit('update:open', false)
}

function handleSave() {
  if (isInboundScope.value && !String(form.sourceDocNo || '').trim()) {
    message.warning(`请输入${sourceDocLabel.value}`)
    return
  }
  saving.value = true
  try {
    const sourceType =
      props.bizScope === '外协回货检'
        ? 'outsourcing_receipt'
        : props.bizScope === '来料质检'
          ? 'purchase_receipt'
          : 'manual'

    const res = createManualQcTask({
      bizScope: props.bizScope,
      templateCode: form.templateCode,
      itemCode: form.itemCode,
      itemName: form.itemName,
      specModel: form.specModel,
      unit: form.unit,
      inspectQty: form.inspectQty,
      inspectMethod: form.inspectMethod,
      sourceType: form.sourceDocId ? sourceType : 'manual',
      sourceDocId: form.sourceDocId,
      sourceDocNo: form.sourceDocNo,
      sourceLineId: form.sourceLineId,
      workOrderNo: form.workOrderNo,
      processName: form.processName,
      remark: form.remark,
    })
    if (!res.ok) {
      message.warning(res.message || '创建失败')
      return
    }

    if (form.sourceDocId && isInboundScope.value) {
      const attach =
        props.bizScope === '外协回货检' ? attachOutsourcingReceiptQc : attachPurchaseReceiptQc
      attach(form.sourceDocId, { qcNo: res.task.qcNo, qcStatus: '质检中' })
    }

    message.success(`已创建质检任务 ${res.task.qcNo}`)
    emit('saved', res.task)
    emit('update:open', false)
  } finally {
    saving.value = false
  }
}
</script>

<style lang="less" scoped>
.qc-create-form {
  padding-top: 4px;
}
</style>
