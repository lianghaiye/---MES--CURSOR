<template>
  <div v-if="line" class="wage-summary-section">
    <div class="wage-summary-head">
      <span class="section-title">工资计算汇总</span>
      <a-popover placement="bottomLeft" trigger="click" overlay-class-name="wage-formula-popover">
        <template #content>
          <div class="wage-formula-popover-content">
            <div v-for="item in activeWageFormulas" :key="item.key" class="wage-formula-item">
              <div class="wage-formula-item-title">{{ item.title }}</div>
              <div class="wage-formula-item-body">{{ item.formula }}</div>
              <div v-if="item.note" class="wage-formula-item-note">{{ item.note }}</div>
            </div>
          </div>
        </template>
        <ExclamationCircleOutlined class="formula-help-icon" title="查看计算公式" />
      </a-popover>
    </div>
    <a-descriptions bordered size="small" :column="4" class="wage-desc">
      <a-descriptions-item label="任务编号">{{ line.taskNo || '—' }}</a-descriptions-item>
      <a-descriptions-item label="报工类型">{{ line.reportType || '—' }}</a-descriptions-item>
      <a-descriptions-item label="计薪方式">{{ line.salaryMethod || '—' }}</a-descriptions-item>
      <a-descriptions-item label="计薪(元)">{{ formatMoney(line.salaryAmount) }}</a-descriptions-item>
      <a-descriptions-item label="调整良品数">{{ formatQty(line.adjustedGoodQty) }}</a-descriptions-item>
      <a-descriptions-item label="调整不良品数">{{ formatQty(line.adjustedDefectQty) }}</a-descriptions-item>
      <a-descriptions-item label="调整工时">{{ formatHours(line.adjustedWorkHours) }}</a-descriptions-item>
      <a-descriptions-item label="补贴报工数">{{ formatQty(line.subsidyReportQty) }}</a-descriptions-item>
      <a-descriptions-item label="补贴工时">{{ formatHours(line.subsidyHours) }}</a-descriptions-item>
      <a-descriptions-item label="最终计件数">{{ formatQty(line.finalPieceQty) }}</a-descriptions-item>
      <a-descriptions-item label="初步核算工时(时)">{{ formatHours(line.accountHours) }}</a-descriptions-item>
      <a-descriptions-item label="不良品折算工资">{{
        formatMoney(line.defectConvertedWage)
      }}</a-descriptions-item>
      <a-descriptions-item v-if="line.qualityDeduction > 0" label="质量扣款">
        -{{ formatMoney(line.qualityDeduction) }}
      </a-descriptions-item>
      <a-descriptions-item label="调整原因" :span="2">{{ line.adjustReason || '—' }}</a-descriptions-item>
      <a-descriptions-item label="补贴原因" :span="2">{{ line.subsidyReason || '—' }}</a-descriptions-item>
    </a-descriptions>

    <div v-if="line.defectWageDetails?.length" class="defect-wage-details">
      <div class="defect-wage-details-title">不良原因工资折算</div>
      <div v-for="detail in line.defectWageDetails" :key="detail.id" class="defect-wage-detail-row">
        <span class="defect-wage-detail-name">{{ detail.name }}</span>
        <span class="defect-wage-detail-meta">（{{ detail.methodLabel }}）</span>
        <span v-if="detail.applied && detail.formula !== '—'" class="defect-wage-detail-calc">
          <template v-if="detail.rowType === 'hourly-deduction'">
            {{ detail.formula }}=-{{ formatMoney(Math.abs(detail.amount)) }}
          </template>
          <template v-else> 折算工资：{{ detail.formula }}={{ formatMoney(detail.amount) }} </template>
        </span>
        <span v-else class="defect-wage-detail-calc muted">不折算</span>
      </div>
    </div>

    <div class="wage-cards" :style="{ gridTemplateColumns: `repeat(${wageSummaryCards.length}, 1fr)` }">
      <div
        v-for="card in wageSummaryCards"
        :key="card.key"
        class="wage-card"
        :class="{ 'wage-card-total': card.isTotal }"
      >
        <div class="wage-card-label">{{ card.label }}</div>
        <div
          class="wage-card-value"
          :class="{ 'wage-card-value-deduction': card.isDeduction && card.rawValue > 0 }"
        >
          {{ card.value }}
        </div>
        <div v-if="card.formula" class="wage-card-sub">{{ card.formula }}</div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { ExclamationCircleOutlined } from '@ant-design/icons-vue'
import { PROCESS_REPORT_WAGE_FORMULAS } from '@/constants/processReportWageFormulas'

const props = defineProps({
  line: { type: Object, default: null },
})

const activeWageFormulas = computed(() => {
  const keys = props.line?.formulaKeys || []
  if (!keys.length) return PROCESS_REPORT_WAGE_FORMULAS
  return PROCESS_REPORT_WAGE_FORMULAS.filter((item) => keys.includes(item.key))
})

const wageSummaryCards = computed(() => {
  const line = props.line
  if (!line) return []

  const cards = []
  if (Number(line.prepWage) > 0) {
    cards.push({
      key: 'prep',
      label: '准备工时工资',
      value: formatMoney(line.prepWage),
      formula: line.prepWageFormula ? `${line.prepWageFormula}=${formatMoney(line.prepWage)}` : '',
    })
  }
  if (Number(line.subsidyWage) > 0) {
    cards.push({ key: 'subsidy', label: '补贴工资', value: formatMoney(line.subsidyWage) })
  }
  cards.push({
    key: 'good',
    label: '良品工资',
    value: formatMoney(line.goodWage),
    formula: line.goodWageFormula ? `${line.goodWageFormula}=${formatMoney(line.goodWage)}` : '',
  })
  cards.push({
    key: 'defect',
    label: '不良品工资 (折扣后)',
    value: formatMoney(line.defectWage),
  })
  if (Number(line.fixedDefectWage) > 0) {
    cards.push({
      key: 'fixed-defect',
      label: '固定扣款工时折算',
      value: formatMoney(line.fixedDefectWage),
    })
  }
  cards.push({
    key: 'deduction',
    label: '质量扣款',
    value: formatDeduction(line.qualityDeduction),
    rawValue: Number(line.qualityDeduction) || 0,
    isDeduction: true,
  })
  cards.push({
    key: 'total',
    label: '合计工资',
    value: formatMoney(line.salaryAmount),
    isTotal: true,
  })
  return cards
})

function formatMoney(val) {
  const num = Number(val)
  if (!Number.isFinite(num)) return '—'
  return `¥${num.toFixed(2)}`
}

function formatDeduction(val) {
  const num = Number(val)
  if (!Number.isFinite(num) || num <= 0) return '¥0.00'
  return `-¥${num.toFixed(2)}`
}

function formatQty(val) {
  if (val === 0) return '0'
  return val ?? '—'
}

function formatHours(val) {
  if (val === 0) return '0'
  if (val == null || val === '' || val === '—') return '—'
  return `${val}`
}
</script>

<style lang="less" scoped>
.wage-summary-section {
  margin-top: 16px;
  padding-top: 12px;
  border-top: 1px solid #f0f0f0;
}

.wage-summary-head {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 10px;
}

.section-title {
  font-weight: 600;
  margin-bottom: 0;
}

.formula-help-icon {
  color: #faad14;
  font-size: 16px;
  cursor: pointer;
  transition: color 0.2s;

  &:hover {
    color: #d48806;
  }
}

.wage-desc {
  margin-bottom: 16px;
}

.defect-wage-details {
  margin-bottom: 16px;
  padding: 12px 14px;
  background: #fafafa;
  border: 1px solid #f0f0f0;
  border-radius: 8px;
}

.defect-wage-details-title {
  font-size: 13px;
  font-weight: 600;
  color: rgba(0, 0, 0, 0.65);
  margin-bottom: 10px;
}

.defect-wage-detail-row {
  font-size: 13px;
  line-height: 1.8;
  color: rgba(0, 0, 0, 0.88);

  & + & {
    margin-top: 4px;
  }
}

.defect-wage-detail-name {
  font-weight: 500;
}

.defect-wage-detail-meta {
  color: rgba(0, 0, 0, 0.45);
}

.defect-wage-detail-calc {
  margin-left: 4px;

  &.muted {
    color: rgba(0, 0, 0, 0.45);
  }
}

.wage-cards {
  display: grid;
  gap: 12px;
}

.wage-card {
  background: #f5f5f5;
  border-radius: 8px;
  padding: 16px 20px;
  min-height: 88px;
}

.wage-card-total {
  background: #fff;
  border: 1px solid #f0f0f0;
}

.wage-card-label {
  font-size: 13px;
  color: rgba(0, 0, 0, 0.45);
  margin-bottom: 8px;
}

.wage-card-value {
  font-size: 24px;
  font-weight: 600;
  color: rgba(0, 0, 0, 0.88);
  line-height: 1.2;
}

.wage-card-value-deduction {
  color: #cf1322;
}

.wage-card-sub {
  margin-top: 6px;
  font-size: 12px;
  color: rgba(0, 0, 0, 0.45);
}
</style>
