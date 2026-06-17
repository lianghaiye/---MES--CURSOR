<template>
  <a-modal
    :open="open"
    :title="modalTitle"
    width="760px"
    :mask-closable="false"
    destroy-on-close
    class="process-report-adjust-modal"
    @cancel="handleCancel"
  >
    <a-descriptions bordered size="small" :column="3" class="info-desc">
      <a-descriptions-item v-if="variant === 'task'" label="任务编号">{{
        line?.taskNo || '—'
      }}</a-descriptions-item>
      <a-descriptions-item label="执行人">{{ line?.reporter || '—' }}</a-descriptions-item>
      <a-descriptions-item label="工序名称">{{ line?.processName || '—' }}</a-descriptions-item>
      <a-descriptions-item v-if="variant === 'quick'" label="报工类型">{{
        line?.reportType || '—'
      }}</a-descriptions-item>
      <a-descriptions-item label="报工良品数">{{ line?.goodQty ?? '—' }}</a-descriptions-item>
      <a-descriptions-item label="报工不良品数">{{ line?.defectQty ?? '—' }}</a-descriptions-item>
      <a-descriptions-item v-if="line?.defectReason && line.defectReason !== '—'" label="报工不良原因" :span="3">
        {{ line.defectReason }}
      </a-descriptions-item>
      <a-descriptions-item v-if="showDuration" label="报工时长">
        {{ displayReportDuration }} 小时
      </a-descriptions-item>
    </a-descriptions>

    <a-form layout="vertical" class="adjust-form">
      <div class="form-section">
        <div class="section-label">数量调整</div>
        <a-row :gutter="12">
          <a-col :span="showAdjustDuration ? 8 : 12">
            <a-form-item label="调整良品数" required class="compact-item">
              <a-input-number
                v-model:value="form.adjustedGoodQty"
                :min="0"
                :precision="0"
                size="small"
                style="width: 100%"
                addon-after="件"
                @change="onAdjustedGoodQtyChange"
              />
            </a-form-item>
          </a-col>
          <a-col :span="showAdjustDuration ? 8 : 12">
            <a-form-item label="调整不良品数" required class="compact-item">
              <a-input-number
                v-model:value="form.adjustedDefectQty"
                :min="0"
                :precision="0"
                size="small"
                style="width: 100%"
                addon-after="件"
                @focus="onAdjustedDefectFocus"
                @change="onAdjustedDefectQtyChange"
              />
            </a-form-item>
          </a-col>
          <a-col v-if="showAdjustDuration" :span="8">
            <a-form-item label="调整报工时长" :required="!isBatchPieceHourly" class="compact-item">
              <div v-if="isBatchPieceHourly" class="readonly-duration">
                {{ displayAdjustedDuration }} 小时
              </div>
              <a-input-number
                v-else
                v-model:value="form.adjustedWorkHours"
                :min="0"
                :precision="2"
                size="small"
                style="width: 100%"
                addon-after="小时"
              />
            </a-form-item>
          </a-col>
        </a-row>
        <a-form-item
          v-if="form.adjustedDefectQty > 0 && defectItems.length"
          label="调整不良原因"
          required
          class="compact-item defect-breakdown-item"
        >
          <DefectBreakdownField
            v-model="form.adjustedDefectBreakdown"
            :defect-qty="form.adjustedDefectQty"
            :items="defectItems"
          />
        </a-form-item>
      </div>

      <a-row :gutter="16" class="extra-section-row">
        <a-col :span="14">
          <div class="form-section subsidy-section">
            <div class="section-label-row">
              <span class="section-label">补贴调整</span>
              <span class="section-hint">不填则不计入补贴</span>
            </div>
            <a-segmented
              v-model:value="form.subsidyMethod"
              size="small"
              :options="subsidyMethodOptions"
              class="subsidy-segmented"
            />
            <div v-if="form.subsidyMethod === 'qty'" class="subsidy-inline">
              <span class="subsidy-formula">
                补贴工数 × ¥{{ formatMoney(subsidyUnitPrice) }}/件
              </span>
              <a-input-number
                v-model:value="form.subsidyReportQty"
                :min="0"
                :precision="0"
                size="small"
                addon-after="件"
                class="subsidy-input"
              />
            </div>
            <div v-else class="subsidy-inline">
              <span class="subsidy-formula">固定金额</span>
              <a-input-number
                v-model:value="form.subsidyFixedAmount"
                :min="0"
                :precision="2"
                size="small"
                prefix="¥"
                placeholder="补贴金额"
                class="subsidy-input"
              />
            </div>
            <div class="subsidy-amount">补贴金额：¥{{ formatMoney(previewSubsidyAmount) }}</div>
          </div>
        </a-col>
        <a-col :span="10">
          <div class="form-section quality-section">
            <div class="section-label">质量扣款</div>
            <a-form-item label="扣款金额" class="compact-item quality-item">
              <a-input-number
                v-model:value="form.manualQualityDeduction"
                :min="0"
                :precision="2"
                size="small"
                style="width: 100%"
                prefix="¥"
                placeholder="请输入扣款金额"
              />
            </a-form-item>
          </div>
        </a-col>
      </a-row>

      <a-form-item label="调整原因" class="compact-item reason-item">
        <a-textarea
          v-model:value="form.adjustReason"
          :rows="2"
          :maxlength="100"
          show-count
          placeholder="请输入调整原因（选填）"
        />
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
import { calcAutoDurationHours } from '@/utils/laborHourCalc'
import {
  ensureDefectBreakdown,
  resolveProcessDefectItems,
  syncDefectBreakdownOnQtyChange,
  validateDefectBreakdown,
} from '@/utils/defectBreakdown'
import { applyLinkedSingleQtyFromDefect } from '@/utils/processReportQuantities'
import { getSubsidyUnitPrice, resolveSubsidyMethod } from '@/utils/processReportWageCalc'
import DefectBreakdownField from './DefectBreakdownField.vue'

const subsidyMethodOptions = [
  { label: '补贴工数', value: 'qty' },
  { label: '固定金额', value: 'fixed' },
]

const props = defineProps({
  open: Boolean,
  line: { type: Object, default: null },
  config: { type: Object, default: null },
  /** task=任务报工详情；quick=快速报工详情（仅记录调整结果） */
  variant: { type: String, default: 'task' },
})

const emit = defineEmits(['update:open', 'confirm'])

const form = reactive({
  adjustedGoodQty: null,
  adjustedDefectQty: null,
  adjustedWorkHours: null,
  adjustedDefectBreakdown: [],
  adjustReason: '',
  subsidyMethod: 'fixed',
  subsidyReportQty: 0,
  subsidyFixedAmount: 0,
  manualQualityDeduction: 0,
})

const qtySnapshot = reactive({ goodQty: 0, defectQty: 0 })

const modalTitle = computed(() => {
  const c = props.config
  if (!c) return '调整'
  return `调整-${c.reportType}+${c.salaryMethod}`
})

const defectItems = computed(() => {
  if (!props.line?.processName) return []
  return resolveProcessDefectItems(props.line.processName, form.adjustedDefectBreakdown)
})

const showDuration = computed(
  () => props.config?.reportType === '时长报工' || props.config?.salaryMethod === '计时工资',
)

const isBatchPieceHourly = computed(
  () => props.config?.reportType === '批量计件' && props.config?.salaryMethod === '计时工资',
)

const showAdjustDuration = computed(
  () =>
    (props.config?.reportType === '时长报工' && props.config?.salaryMethod === '计时工资') ||
    isBatchPieceHourly.value,
)

const displayReportDuration = computed(() => {
  if (isBatchPieceHourly.value && props.config) {
    return calcAutoDurationHours(props.config, props.line?.goodQty ?? 0)
  }
  return props.line?.workHours ?? 0
})

const displayAdjustedDuration = computed(() => {
  if (isBatchPieceHourly.value && props.config) {
    return calcAutoDurationHours(props.config, form.adjustedGoodQty ?? 0)
  }
  return form.adjustedWorkHours ?? 0
})

const subsidyUnitPrice = computed(() => getSubsidyUnitPrice(props.config))

const previewSubsidyAmount = computed(() => {
  if (form.subsidyMethod === 'fixed') {
    return Number(form.subsidyFixedAmount) || 0
  }
  return (Number(form.subsidyReportQty) || 0) * subsidyUnitPrice.value
})

function formatMoney(val) {
  return (Number(val) || 0).toFixed(2)
}

function initBreakdown(line) {
  const source = line.adjustedDefectBreakdown?.length
    ? line.adjustedDefectBreakdown
    : line.defectBreakdown
  const qty = line.adjustedDefectQty ?? line.defectQty ?? 0
  const items = resolveProcessDefectItems(line.processName, source || [])
  const base = ensureDefectBreakdown({ defectQty: qty, defectBreakdown: source }, items)
  return syncDefectBreakdownOnQtyChange({ defectQty: qty, defectBreakdown: base }, items)
}

watch(
  () => props.open,
  (val) => {
    if (!val || !props.line) return
    form.adjustedGoodQty = props.line.adjustedGoodQty ?? props.line.goodQty ?? 0
    form.adjustedDefectQty = props.line.adjustedDefectQty ?? props.line.defectQty ?? 0
    form.adjustedWorkHours = props.line.adjustedWorkHours ?? props.line.workHours ?? 0
    form.adjustReason = props.line.adjustReason || ''
    form.adjustedDefectBreakdown = initBreakdown(props.line)
    form.subsidyMethod = resolveSubsidyMethod(props.line)
    form.subsidyReportQty = props.line.subsidyReportQty ?? 0
    form.subsidyFixedAmount = props.line.subsidyFixedAmount ?? 0
    form.manualQualityDeduction = props.line.manualQualityDeduction ?? 0
    qtySnapshot.goodQty = Math.max(0, Number(form.adjustedGoodQty) || 0)
    qtySnapshot.defectQty = Math.max(0, Number(form.adjustedDefectQty) || 0)
    if (isBatchPieceHourly.value) {
      form.adjustedWorkHours = calcAutoDurationHours(props.config, form.adjustedGoodQty)
    }
  },
)

function onAdjustedDefectFocus() {
  qtySnapshot.goodQty = Math.max(0, Number(form.adjustedGoodQty) || 0)
  qtySnapshot.defectQty = Math.max(0, Number(form.adjustedDefectQty) || 0)
}

function onAdjustedGoodQtyChange() {
  form.adjustedGoodQty = Math.max(0, Number(form.adjustedGoodQty) || 0)
}

function onAdjustedDefectQtyChange() {
  const wrapper = {
    goodQty: form.adjustedGoodQty,
    defectQty: form.adjustedDefectQty,
  }
  applyLinkedSingleQtyFromDefect(wrapper, qtySnapshot)
  form.adjustedGoodQty = wrapper.goodQty
  form.adjustedDefectQty = wrapper.defectQty

  const qty = Number(form.adjustedDefectQty) || 0
  if (qty <= 0) {
    form.adjustedDefectBreakdown = []
    return
  }
  form.adjustedDefectBreakdown = syncDefectBreakdownOnQtyChange(
    { defectQty: qty, defectBreakdown: form.adjustedDefectBreakdown },
    defectItems.value,
  )
}

watch(
  () => form.adjustedGoodQty,
  (qty) => {
    if (!isBatchPieceHourly.value || !props.config) return
    form.adjustedWorkHours = calcAutoDurationHours(props.config, qty)
  },
)

function handleCancel() {
  emit('update:open', false)
}

function handleOk() {
  const defectQty = Number(form.adjustedDefectQty) || 0
  if (defectQty > 0 && defectItems.value.length) {
    const err = validateDefectBreakdown(
      defectQty,
      form.adjustedDefectBreakdown,
      defectItems.value,
    )
    if (err) {
      message.warning(err)
      return
    }
  }

  emit('confirm', {
    adjustedGoodQty: form.adjustedGoodQty,
    adjustedDefectQty: form.adjustedDefectQty,
    adjustedWorkHours: form.adjustedWorkHours,
    adjustedDefectBreakdown: defectQty > 0 ? [...form.adjustedDefectBreakdown] : [],
    adjustReason: form.adjustReason,
    subsidyMethod: form.subsidyMethod,
    subsidyReportQty: form.subsidyMethod === 'qty' ? Number(form.subsidyReportQty) || 0 : 0,
    subsidyFixedAmount: form.subsidyMethod === 'fixed' ? Number(form.subsidyFixedAmount) || 0 : 0,
    manualQualityDeduction: Number(form.manualQualityDeduction) || 0,
  })
  emit('update:open', false)
}
</script>

<style scoped>
.info-desc {
  margin-bottom: 12px;
}

.adjust-form {
  :deep(.ant-form-item) {
    margin-bottom: 0;
  }

  :deep(.compact-item .ant-form-item-label) {
    padding-bottom: 4px;

    > label {
      font-size: 13px;
      height: 22px;
    }
  }
}

.form-section {
  padding: 12px;
  background: #fafafa;
  border: 1px solid #f0f0f0;
  border-radius: 6px;
}

.section-label {
  margin-bottom: 10px;
  font-size: 13px;
  font-weight: 600;
  color: rgba(0, 0, 0, 0.88);
}

.section-label-row {
  display: flex;
  align-items: baseline;
  gap: 8px;
  margin-bottom: 10px;
}

.section-hint {
  font-size: 12px;
  font-weight: 400;
  color: rgba(0, 0, 0, 0.45);
}

.defect-breakdown-item {
  margin-top: 10px;
}

.extra-section-row {
  margin-top: 12px;
}

.subsidy-section,
.quality-section {
  height: 100%;
}

.subsidy-segmented {
  margin-bottom: 10px;
  max-width: 240px;
}

.subsidy-inline {
  display: flex;
  align-items: center;
  gap: 12px;
}

.subsidy-formula {
  flex-shrink: 0;
  font-size: 12px;
  color: rgba(0, 0, 0, 0.45);
  white-space: nowrap;
}

.subsidy-input {
  flex: 1;
  min-width: 0;
  max-width: 160px;
}

.subsidy-amount {
  margin-top: 10px;
  font-size: 13px;
  font-weight: 600;
  color: #7c3aed;
}

.quality-item {
  margin-top: 4px;
}

.reason-item {
  margin-top: 12px;
  margin-bottom: 0;
}

.readonly-duration {
  line-height: 24px;
  font-size: 13px;
  color: rgba(0, 0, 0, 0.88);
}
</style>
