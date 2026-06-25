<template>
  <div class="business-rule-page">
    <div class="section-head">
      <span class="section-title">规则配置</span>
    </div>

    <div class="table-card">
      <a-table
        :columns="columns"
        :data-source="tableData"
        row-key="key"
        size="small"
        bordered
        :pagination="false"
      >
        <template #bodyCell="{ column }">
          <template v-if="column.key === 'config'">
            <a-radio-group :value="productionMode" @change="(e) => onModeChange(e.target.value)">
              <a-radio
                v-for="option in PRODUCTION_MODE_OPTIONS"
                :key="option.value"
                :value="option.value"
              >
                {{ option.label }}
              </a-radio>
            </a-radio-group>
            <div v-if="productionMode === 'minimal'" class="sub-config">
              <a-radio-group
                :value="minimalReportType"
                @change="(e) => onMinimalReportTypeChange(e.target.value)"
              >
                <a-radio
                  v-for="option in MINIMAL_REPORT_TYPE_OPTIONS"
                  :key="option.value"
                  :value="option.value"
                >
                  {{ option.label }}
                </a-radio>
              </a-radio-group>
            </div>
          </template>
          <template v-else-if="column.key === 'description'">
            <span v-if="activeDescription" class="desc-text">{{ activeDescription }}</span>
          </template>
        </template>
      </a-table>
    </div>
  </div>
</template>

<script>
export default { name: 'BusinessRuleView' }
</script>

<script setup>
import { computed } from 'vue'
import { message } from 'ant-design-vue'
import {
  BUSINESS_RULE_ROWS,
  PRODUCTION_MODE_OPTIONS,
  MINIMAL_REPORT_TYPE_OPTIONS,
  PRODUCTION_MODE_DESCRIPTIONS,
  MINIMAL_REPORT_TYPE_DESCRIPTIONS,
  businessRuleState,
  setProductionMode,
  setMinimalReportType,
} from '@/store/businessRuleStore'

const columns = [
  { title: '业务场景', dataIndex: 'scenario', key: 'scenario', width: 160 },
  { title: '配置项', key: 'config', width: 420 },
  { title: '说明', key: 'description' },
]

const tableData = BUSINESS_RULE_ROWS

const productionMode = computed(() => businessRuleState.rules.productionMode)
const minimalReportType = computed(() => businessRuleState.rules.minimalReportType || 'task')

const activeDescription = computed(() => {
  const mode = productionMode.value
  if (mode === 'minimal') {
    return MINIMAL_REPORT_TYPE_DESCRIPTIONS[minimalReportType.value] || ''
  }
  return PRODUCTION_MODE_DESCRIPTIONS[mode] || ''
})

function onModeChange(mode) {
  const res = setProductionMode(mode)
  if (!res.ok) {
    message.warning(res.message)
    return
  }
  message.success('已保存')
}

function onMinimalReportTypeChange(type) {
  const res = setMinimalReportType(type)
  if (!res.ok) {
    message.warning(res.message)
    return
  }
  message.success('已保存')
}
</script>

<style scoped>
.business-rule-page {
  padding: 0;
}

.section-head {
  margin-bottom: 12px;
}

.section-title {
  font-size: 16px;
  font-weight: 600;
  color: rgba(0, 0, 0, 0.88);
}

.table-card {
  background: #fff;
  border-radius: 4px;
}

.sub-config {
  margin-top: 10px;
  padding-top: 10px;
  border-top: 1px dashed #f0f0f0;
}

.desc-text {
  color: rgba(0, 0, 0, 0.65);
  line-height: 1.6;
}
</style>
