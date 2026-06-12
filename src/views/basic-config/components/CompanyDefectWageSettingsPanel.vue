<template>
  <div class="company-wage-settings-panel">
    <div class="panel-head">
      <div class="panel-title">公司级默认设置</div>
      <a-tag :color="settings.enabled ? 'blue' : 'default'">
        {{ settings.enabled ? '已启用' : '未启用' }}
      </a-tag>
    </div>
    <div class="panel-hint">
      {{
        settings.enabled
          ? '不良品项未开启「不良原因影响折扣」时，按责任归属匹配以下默认规则'
          : '当前未启用公司级默认折扣率，不良品项将不按公司级规则核算'
      }}
    </div>
    <a-table
      v-if="settings.enabled"
      :columns="columns"
      :data-source="settings.rules"
      row-key="id"
      size="small"
      bordered
      :pagination="false"
      class="rules-table"
    >
      <template #bodyCell="{ column, record }">
        <template v-if="column.key === 'defaultDiscountRate'">
          {{
            record.wageCalculationMethod === '打折计工资' && record.defaultDiscountRate != null
              ? `${record.defaultDiscountRate}%`
              : '—'
          }}
        </template>
      </template>
    </a-table>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { defectItemState } from '@/store/defectItemStore'

const settings = computed(() => defectItemState.companyWageSettings)

const columns = [
  { title: '责任归属', dataIndex: 'responsibility', width: 140 },
  { title: '不良品工资计算方式', dataIndex: 'wageCalculationMethod', width: 160 },
  { title: '默认折扣率', key: 'defaultDiscountRate', width: 120, align: 'right' },
]
</script>

<style lang="less" scoped>
.company-wage-settings-panel {
  background: #fff;
  border-radius: 8px;
  padding: 14px 16px;
  margin-bottom: 12px;
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.06);
}

.panel-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 6px;
}

.panel-title {
  font-weight: 600;
  font-size: 14px;
  color: rgba(0, 0, 0, 0.88);
}

.panel-hint {
  font-size: 12px;
  line-height: 1.6;
  color: rgba(0, 0, 0, 0.45);
  margin-bottom: 12px;
}

.rules-table {
  margin-top: 4px;
}
</style>
