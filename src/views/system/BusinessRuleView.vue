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
        <template #bodyCell="{ column, record }">
          <template v-if="column.key === 'config'">
            <a-radio-group
              :value="productionMode"
              @change="(e) => onModeChange(e.target.value)"
            >
              <a-radio
                v-for="option in PRODUCTION_MODE_OPTIONS"
                :key="option.value"
                :value="option.value"
              >
                {{ option.label }}
              </a-radio>
            </a-radio-group>
          </template>
          <template v-else-if="column.key === 'description'">
            <span class="desc-text">{{ record.description }}</span>
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
  businessRuleState,
  setProductionMode,
} from '@/store/businessRuleStore'

const columns = [
  { title: '业务场景', dataIndex: 'scenario', key: 'scenario', width: 160 },
  { title: '配置项', key: 'config', width: 420 },
  { title: '说明', key: 'description' },
]

const tableData = BUSINESS_RULE_ROWS

const productionMode = computed(() => businessRuleState.rules.productionMode)

function onModeChange(mode) {
  const res = setProductionMode(mode)
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

.desc-text {
  color: rgba(0, 0, 0, 0.65);
  line-height: 1.6;
}
</style>
