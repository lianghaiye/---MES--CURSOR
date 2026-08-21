<template>
  <a-modal
    :open="open"
    :title="title"
    width="720px"
    :mask-closable="false"
    destroy-on-close
    @cancel="handleCancel"
  >
    <a-form v-if="draft" layout="vertical" class="edit-form">
      <a-form-item label="发货进度">
        <a-input :value="progressDisplay" disabled />
      </a-form-item>
      <a-form-item label="物品信息">
        <a-input :value="productLabel" disabled />
      </a-form-item>
      <a-form-item label="出库仓库" required>
        <a-select
          v-model:value="draft.shipWarehouse"
          allow-clear
          placeholder="请选择出库仓库"
          :options="warehouseOpts"
          @change="refreshStock"
        />
      </a-form-item>
      <a-form-item label="出库数量" required>
        <a-input-number
          v-model:value="draft.issueQty"
          :min="0"
          :max="draft.remainingQty"
          :precision="4"
          :formatter="inputNumberFormatter"
          :parser="inputNumberParser"
          style="width: 100%"
        />
        <div class="hint">
          剩余可出库：{{ formatQty(draft.remainingQty) }} {{ draft.unit || '' }}
        </div>
      </a-form-item>
      <a-form-item label="下料尺寸">
        <a-input v-model:value="draft.blankSizeText" allow-clear placeholder="请输入下料尺寸" />
      </a-form-item>
      <a-form-item label="条码类型">
        <a-input v-model:value="draft.barcodeType" allow-clear placeholder="请输入条码类型" />
      </a-form-item>
      <a-form-item label="备注">
        <a-textarea v-model:value="draft.remark" :rows="2" placeholder="请输入备注" />
      </a-form-item>
    </a-form>
    <template #footer>
      <a-button @click="handleCancel">取消</a-button>
      <a-button type="primary" @click="handleOk">确定</a-button>
    </template>
  </a-modal>
</template>

<script setup>
import { computed, reactive, watch } from 'vue'
import { message } from 'ant-design-vue'
import { warehouseOptions } from '@/mock/purchaseOrderOptions'
import { enrichOutboundLineStock } from '@/utils/outboundLineHelpers'
import { formatWxIssueProgress } from '@/utils/outsourcingInbound'
import { formatNumber, inputNumberFormatter, inputNumberParser } from '@/utils/numberFormat'

const props = defineProps({
  open: { type: Boolean, default: false },
  line: { type: Object, default: null },
  title: { type: String, default: '编辑发料明细' },
})

const emit = defineEmits(['update:open', 'confirm'])

const warehouseOpts = warehouseOptions
const draft = reactive({})

const progressDisplay = computed(() =>
  formatWxIssueProgress(draft.issuedQty, draft.appliedIssueQty, draft.planQty),
)

const productLabel = computed(() => {
  const name = draft.productName || '—'
  const code = draft.productCode || ''
  return code ? `${name}（${code}）` : name
})

function formatQty(val) {
  return formatNumber(val, 4, { empty: '—' })
}

function refreshStock() {
  const stock = enrichOutboundLineStock({
    itemCode: draft.productCode || '',
    shipWarehouse: draft.shipWarehouse || '',
  })
  draft.stockQty = stock.stockQty
  draft.warehouseStockQty = stock.warehouseStockQty
}

watch(
  () => props.open,
  (val) => {
    if (!val || !props.line) return
    Object.assign(draft, JSON.parse(JSON.stringify(props.line)))
    refreshStock()
  },
)

function handleCancel() {
  emit('update:open', false)
}

function handleOk() {
  if (!String(draft.shipWarehouse || '').trim()) {
    message.warning('请选择出库仓库')
    return
  }
  if (!(Number(draft.issueQty) > 0)) {
    message.warning('请填写出库数量')
    return
  }
  if (
    draft.remainingQty != null &&
    Number.isFinite(Number(draft.remainingQty)) &&
    Number(draft.issueQty) > Number(draft.remainingQty) + 1e-9
  ) {
    message.warning('出库数量不能超过剩余可出库数量')
    return
  }
  emit('confirm', { ...draft })
  emit('update:open', false)
}
</script>

<script>
export default { name: 'OutsourcingIssueLineEditModal' }
</script>

<style lang="less" scoped>
.hint {
  margin-top: 4px;
  font-size: 12px;
  color: rgba(0, 0, 0, 0.45);
}
</style>
