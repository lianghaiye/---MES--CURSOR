<template>
  <a-modal
    :open="open"
    title="撤销库存扣减"
    :width="900"
    destroy-on-close
    :confirm-loading="submitting"
    ok-text="提交撤销申请"
    cancel-text="取消"
    @cancel="emit('update:open', false)"
    @ok="handleSubmit"
  >
    <a-form layout="vertical" class="revoke-form">
      <a-form-item label="工单/领料单号">
        <a-input :value="resolveInventoryDeductDocNo(record) || '—'" disabled />
      </a-form-item>

      <a-form-item label="撤销类型">
        <a-radio-group v-model:value="form.revokeType">
          <a-radio value="full">全额撤销</a-radio>
          <a-radio value="diff">差额撤销</a-radio>
        </a-radio-group>
      </a-form-item>

      <template v-if="form.revokeType === 'diff'">
        <div class="diff-label">差额明细（输入实际应扣数量，系统自动计算退回数量）</div>
        <a-table
          :columns="diffColumns"
          :data-source="form.lines"
          row-key="id"
          size="small"
          bordered
          :pagination="false"
        >
          <template #bodyCell="{ column, record: line }">
            <template v-if="column.key === 'blankSizeText'">
              {{ line.blankSizeText || '—' }}
            </template>
            <template v-else-if="column.key === 'original'">
              {{ originalQty(line) }}
            </template>
            <template v-else-if="column.key === 'actualDeductQty'">
              <a-input-number
                v-model:value="line.actualDeductQty"
                :min="0"
                :max="originalQty(line)"
                :precision="0"
                size="small"
                style="width: 100%"
              />
            </template>
            <template v-else-if="column.key === 'returnQty'">
              <span class="return-qty">{{ returnQty(line) }}</span>
            </template>
          </template>
          <template #summary>
            <a-table-summary fixed>
              <a-table-summary-row>
                <a-table-summary-cell>合计</a-table-summary-cell>
                <a-table-summary-cell />
                <a-table-summary-cell />
                <a-table-summary-cell>{{ totalOriginal }}</a-table-summary-cell>
                <a-table-summary-cell>{{ totalActual }}</a-table-summary-cell>
                <a-table-summary-cell>
                  <span class="return-qty">{{ totalReturn }}</span>
                </a-table-summary-cell>
              </a-table-summary-row>
            </a-table-summary>
          </template>
        </a-table>
        <div class="diff-hint">
          说明：“实际应扣”是指修正后的正确数量。系统退回数量 = 原扣减 − 实际应扣。
        </div>
      </template>

      <a-form-item label="撤销原因" required class="reason-item">
        <a-select
          v-model:value="form.reason"
          :options="reasonOptions"
          placeholder="请选择撤销原因"
          style="width: 100%"
          allow-clear
        />
      </a-form-item>
      <a-form-item label="详细说明">
        <a-textarea
          v-model:value="form.remark"
          :rows="3"
          placeholder="请描述撤销原因"
          allow-clear
        />
      </a-form-item>
    </a-form>
  </a-modal>
</template>

<script setup>
import { computed, reactive, ref, watch } from 'vue'
import { message } from 'ant-design-vue'
import { resolveInventoryDeductDocNo } from '@/mock/materialRequisitionRecords'
import {
  DEDUCT_REVOKE_REASON_OPTIONS,
  revokeMaterialDeductWithForm,
} from '@/store/materialRequisitionStore'

const props = defineProps({
  open: { type: Boolean, default: false },
  record: { type: Object, default: null },
})

const emit = defineEmits(['update:open', 'done'])

const submitting = ref(false)
const reasonOptions = DEDUCT_REVOKE_REASON_OPTIONS

const form = reactive({
  revokeType: 'diff',
  reason: undefined,
  remark: '',
  lines: [],
})

const diffColumns = [
  { title: '物料编码', dataIndex: 'materialCode', key: 'materialCode', width: 120 },
  { title: '物料名称', dataIndex: 'materialName', key: 'materialName', width: 120 },
  { title: '下料尺寸', key: 'blankSizeText', width: 140, ellipsis: true },
  { title: '原扣减', key: 'original', width: 90, align: 'right' },
  { title: '实际应扣', key: 'actualDeductQty', width: 110 },
  { title: '退回数量', key: 'returnQty', width: 90, align: 'right' },
]

watch(
  () => [props.open, props.record],
  () => {
    if (!props.open || !props.record) return
    form.revokeType = 'diff'
    form.reason = undefined
    form.remark = ''
    form.lines = (props.record.lines || []).map((l) => {
      const original = Number(l.actualQty) || Number(l.planQty) || 0
      return {
        ...l,
        actualDeductQty: original,
      }
    })
  },
)

function originalQty(line) {
  return Number(line.actualQty) || Number(line.planQty) || 0
}

function returnQty(line) {
  return Math.max(0, originalQty(line) - (Number(line.actualDeductQty) || 0))
}

const totalOriginal = computed(() => form.lines.reduce((s, l) => s + originalQty(l), 0))
const totalActual = computed(() =>
  form.lines.reduce((s, l) => s + (Number(l.actualDeductQty) || 0), 0),
)
const totalReturn = computed(() => form.lines.reduce((s, l) => s + returnQty(l), 0))

function handleSubmit() {
  if (!form.reason) {
    message.warning('请选择撤销原因')
    return Promise.reject()
  }
  if (form.reason === '其他（请在说明中描述）' && !String(form.remark || '').trim()) {
    message.warning('请填写详细说明')
    return Promise.reject()
  }
  submitting.value = true
  const res = revokeMaterialDeductWithForm(props.record.id, {
    revokeType: form.revokeType,
    reason: form.reason,
    remark: form.remark,
    lineDiffs: form.lines.map((l) => ({
      id: l.id,
      actualDeductQty: Number(l.actualDeductQty) || 0,
    })),
  })
  submitting.value = false
  if (!res.ok) {
    message.warning(res.message)
    return Promise.reject()
  }
  message.success('撤销申请已提交')
  emit('update:open', false)
  emit('done')
}
</script>

<style lang="less" scoped>
.diff-label {
  margin-bottom: 8px;
  color: rgba(0, 0, 0, 0.65);
  font-size: 13px;
}

.diff-hint {
  margin: 8px 0 16px;
  color: #d46b08;
  font-size: 12px;
}

.return-qty {
  color: #52c41a;
  font-weight: 600;
}

.reason-item {
  margin-top: 12px;
}
</style>
