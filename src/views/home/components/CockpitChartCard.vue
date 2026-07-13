<template>
  <div class="cockpit-chart-card">
    <div class="chart-title">{{ title }}</div>
    <VChart class="chart-body" :option="option" autoresize />
  </div>
</template>

<script setup>
import { use } from 'echarts/core'
import { CanvasRenderer } from 'echarts/renderers'
import { LineChart, BarChart, PieChart, FunnelChart, RadarChart } from 'echarts/charts'
import {
  GridComponent,
  TooltipComponent,
  LegendComponent,
  MarkLineComponent,
  RadarComponent,
} from 'echarts/components'
import VChart from 'vue-echarts'

use([
  CanvasRenderer,
  LineChart,
  BarChart,
  PieChart,
  FunnelChart,
  RadarChart,
  GridComponent,
  TooltipComponent,
  LegendComponent,
  MarkLineComponent,
  RadarComponent,
])

defineProps({
  title: { type: String, default: '' },
  option: { type: Object, required: true },
})
</script>

<script>
export default { name: 'CockpitChartCard' }
</script>

<style lang="less" scoped>
.cockpit-chart-card {
  background: #fff;
  border: 1px solid #f0f0f0;
  border-radius: 8px;
  padding: 12px 12px 4px;
  height: 100%;
  min-height: 280px;
}

.chart-title {
  font-weight: 600;
  font-size: 14px;
  margin-bottom: 4px;
  color: rgba(0, 0, 0, 0.88);
}

.chart-body {
  width: 100%;
  height: 240px;
}
</style>
