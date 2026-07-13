<template>
  <div class="data-cockpit page-shell">
    <section class="toolbar-card">
      <div class="toolbar-left">
        <h2 class="page-title">数据驾驶舱</h2>
        <span class="updated-at">更新于 {{ dashboard.updatedAt }}</span>
      </div>
      <div class="toolbar-right">
        <a-segmented v-model:value="role" :options="cockpitRoleOptions" />
        <span class="filter-label">统计周期</span>
        <a-segmented v-model:value="period" :options="cockpitPeriodOptions" />
      </div>
    </section>

    <section class="kpi-section">
      <a-row :gutter="12">
        <a-col v-for="kpi in dashboard.kpis" :key="kpi.key" :xs="24" :sm="12" :md="8" :xl="6">
          <div class="kpi-card" :class="`tone-${kpi.tone}`">
            <div class="kpi-title">{{ kpi.title }}</div>
            <div class="kpi-value">
              {{ kpi.value }}<span class="kpi-unit">{{ kpi.unit }}</span>
            </div>
            <div class="kpi-sub">{{ kpi.sub }}</div>
          </div>
        </a-col>
      </a-row>
    </section>

    <section v-for="section in dashboard.chartSections" :key="section.key" class="chart-section">
      <div class="section-header">
        <h3 class="section-title">{{ section.title }}</h3>
      </div>
      <a-row :gutter="[16, 16]">
        <a-col
          v-for="(chart, idx) in section.charts"
          :key="`${section.key}-${idx}`"
          :xs="24"
          :lg="chart.span || 12"
        >
          <CockpitChartCard :title="chart.title" :option="chart.option" />
        </a-col>
      </a-row>
    </section>
  </div>
</template>

<script setup>
import { computed, ref } from 'vue'
import {
  COCKPIT_ROLE,
  COCKPIT_PERIOD,
  cockpitRoleOptions,
  cockpitPeriodOptions,
} from '@/constants/dataCockpit'
import { buildDataCockpitDashboard } from '@/utils/dataCockpitDashboard'
import CockpitChartCard from '@/views/home/components/CockpitChartCard.vue'

const role = ref(COCKPIT_ROLE.EXECUTIVE)
const period = ref(COCKPIT_PERIOD.WEEK)

const dashboard = computed(() =>
  buildDataCockpitDashboard({ role: role.value, period: period.value }),
)
</script>

<script>
export default { name: 'DataCockpitView' }
</script>

<style lang="less" scoped>
.data-cockpit {
  padding: 0 4px 16px;
}

.toolbar-card {
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 12px;
  padding: 12px 14px;
  margin-bottom: 12px;
  background: #fff;
  border: 1px solid #f0f0f0;
  border-radius: 8px;
}

.toolbar-left {
  display: flex;
  align-items: baseline;
  gap: 12px;
  min-width: 0;
}

.page-title {
  margin: 0;
  font-size: 18px;
  font-weight: 600;
}

.updated-at {
  font-size: 12px;
  color: rgba(0, 0, 0, 0.45);
}

.toolbar-right {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 10px;
}

.filter-label {
  font-size: 13px;
  color: rgba(0, 0, 0, 0.45);
}

.kpi-section {
  margin-bottom: 12px;
}

.kpi-card {
  background: #fff;
  border: 1px solid #f0f0f0;
  border-radius: 8px;
  padding: 12px 14px;
  margin-bottom: 12px;
  border-top: 3px solid #d9d9d9;

  &.tone-blue {
    border-top-color: #1677ff;
  }
  &.tone-purple {
    border-top-color: #722ed1;
  }
  &.tone-orange {
    border-top-color: #fa8c16;
  }
  &.tone-green {
    border-top-color: #52c41a;
  }
  &.tone-cyan {
    border-top-color: #13c2c2;
  }
  &.tone-red {
    border-top-color: #ff4d4f;
  }
  &.tone-magenta {
    border-top-color: #eb2f96;
  }
  &.tone-geekblue {
    border-top-color: #2f54eb;
  }
}

.kpi-title {
  font-size: 12px;
  color: rgba(0, 0, 0, 0.45);
}

.kpi-value {
  margin-top: 4px;
  font-size: 24px;
  font-weight: 600;
  line-height: 1.2;
}

.kpi-unit {
  margin-left: 2px;
  font-size: 13px;
  font-weight: 400;
  color: rgba(0, 0, 0, 0.45);
}

.kpi-sub {
  margin-top: 4px;
  font-size: 12px;
  color: rgba(0, 0, 0, 0.45);
}

.chart-section {
  margin-bottom: 16px;
}

.section-header {
  margin-bottom: 10px;
}

.section-title {
  margin: 0;
  font-size: 15px;
  font-weight: 600;
  color: rgba(0, 0, 0, 0.85);
  padding-left: 10px;
  border-left: 3px solid #1677ff;
}
</style>
