<template>
  <div class="function-param-page">
    <div class="section-head">
      <span class="section-title">参数配置</span>
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
              :value="salaryPushMode"
              @change="(e) => onSalaryPushChange(e.target.value)"
            >
              <a-radio
                v-for="option in SALARY_PUSH_OPTIONS"
                :key="option.value"
                :value="option.value"
              >
                {{ option.label }}
              </a-radio>
            </a-radio-group>
          </template>
          <template v-else-if="column.key === 'description'">
            <span v-if="record.description" class="desc-text">{{ record.description }}</span>
          </template>
        </template>
      </a-table>
    </div>
  </div>
</template>

<script>
export default { name: 'FunctionParamView' }
</script>

<script setup>
import { computed } from 'vue'
import { message } from 'ant-design-vue'
import {
  FUNCTION_PARAM_ROWS,
  SALARY_PUSH_OPTIONS,
  functionParamState,
  setSalaryPushMode,
} from '@/store/functionParamStore'

const columns = [
  { title: '业务场景', dataIndex: 'scenario', key: 'scenario', width: 160 },
  { title: '配置项', key: 'config', width: 420 },
  { title: '说明', key: 'description' },
]

const tableData = FUNCTION_PARAM_ROWS

const salaryPushMode = computed(() => functionParamState.params.salaryPushMode)

function onSalaryPushChange(mode) {
  const res = setSalaryPushMode(mode)
  if (!res.ok) {
    message.warning(res.message)
    return
  }
  message.success('已保存')
}
</script>

<style scoped>
.function-param-page {
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
