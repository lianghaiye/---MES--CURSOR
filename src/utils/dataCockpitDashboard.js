import dayjs from 'dayjs'
import { COCKPIT_PERIOD, COCKPIT_ROLE } from '@/constants/dataCockpit'
import { getCockpitMockData } from '@/mock/dataCockpitCharts'

/** @returns {[string, string]} */
export function getCockpitPeriodRange(period, ref = dayjs()) {
  const d = ref
  if (period === COCKPIT_PERIOD.TODAY) {
    const day = d.format('YYYY-MM-DD')
    return [day, day]
  }
  if (period === COCKPIT_PERIOD.WEEK) {
    return [d.startOf('week').format('YYYY-MM-DD'), d.endOf('week').format('YYYY-MM-DD')]
  }
  if (period === COCKPIT_PERIOD.MONTH) {
    return [d.startOf('month').format('YYYY-MM-DD'), d.endOf('month').format('YYYY-MM-DD')]
  }
  const month = d.month()
  const qStart = Math.floor(month / 3) * 3
  const start = d.month(qStart).startOf('month')
  const end = start.add(2, 'month').endOf('month')
  return [start.format('YYYY-MM-DD'), end.format('YYYY-MM-DD')]
}

function buildPieChart(title, dataList, { donut = true, span = 8 } = {}) {
  return {
    title,
    span,
    option: {
      tooltip: { trigger: 'item', formatter: '{b}: {c} ({d}%)' },
      legend: { bottom: 0, type: 'scroll' },
      series: [
        {
          type: 'pie',
          radius: donut ? ['42%', '68%'] : '62%',
          center: ['50%', '45%'],
          data: dataList,
          itemStyle: { borderRadius: 4 },
        },
      ],
    },
  }
}

function buildOutputMaterialChart(mock) {
  const { labels, output, material } = mock.outputMaterialTrend
  return {
    title: '近7日产量与领料消耗对比',
    span: 12,
    option: {
      tooltip: { trigger: 'axis' },
      legend: { data: ['报工产出', '领料消耗'], top: 0 },
      grid: { left: 48, right: 48, top: 36, bottom: 28 },
      xAxis: { type: 'category', data: labels },
      yAxis: [
        { type: 'value', name: '产出(件)', minInterval: 1 },
        { type: 'value', name: '领料(件)', minInterval: 1 },
      ],
      series: [
        {
          name: '报工产出',
          type: 'bar',
          data: output,
          itemStyle: { color: '#1677ff' },
          barMaxWidth: 28,
        },
        {
          name: '领料消耗',
          type: 'line',
          yAxisIndex: 1,
          smooth: true,
          data: material,
          itemStyle: { color: '#fa8c16' },
        },
      ],
    },
  }
}

function buildTopMaterialConsumptionChart(mock) {
  const sorted = [...mock.topMaterials].sort((a, b) => a.qty - b.qty)
  return {
    title: `${mock.periodLabel}物料消耗 TOP8`,
    span: 12,
    option: {
      tooltip: { trigger: 'axis' },
      grid: { left: 88, right: 16, top: 16, bottom: 28 },
      xAxis: { type: 'value', minInterval: 1 },
      yAxis: {
        type: 'category',
        data: sorted.map((m) => m.name),
        axisLabel: { width: 72, overflow: 'truncate' },
      },
      series: [
        {
          type: 'bar',
          data: sorted.map((m) => m.qty),
          itemStyle: { color: '#722ed1' },
          barMaxWidth: 20,
        },
      ],
    },
  }
}

function buildInventoryCharts(mock) {
  return [
    buildPieChart(
      '库存数量 · 按仓库分布',
      Object.entries(mock.inventoryByWarehouse).map(([name, value]) => ({ name, value })),
    ),
    buildPieChart(
      '库存数量 · 按物料类型',
      Object.entries(mock.inventoryByType).map(([name, value]) => ({ name, value })),
    ),
    buildPieChart(
      '库存状态 · SKU 分布',
      Object.entries(mock.stockHealth).map(([name, value]) => ({ name, value })),
      { donut: false },
    ),
  ]
}

function buildWipChart(mock) {
  return {
    title: '在制品 WIP 分布',
    span: 12,
    option: {
      tooltip: { trigger: 'axis' },
      grid: { left: 40, right: 16, top: 24, bottom: 28 },
      xAxis: { type: 'category', data: mock.wipByStage.stages },
      yAxis: { type: 'value', name: '件' },
      series: [
        {
          type: 'bar',
          data: mock.wipByStage.values,
          itemStyle: {
            color: {
              type: 'linear',
              x: 0,
              y: 0,
              x2: 0,
              y2: 1,
              colorStops: [
                { offset: 0, color: '#597ef7' },
                { offset: 1, color: '#1677ff' },
              ],
            },
          },
          barMaxWidth: 36,
        },
      ],
    },
  }
}

function buildWoStatusChart(mock) {
  return {
    title: '工单状态分布',
    span: 12,
    option: {
      tooltip: { trigger: 'item' },
      legend: { bottom: 0, type: 'scroll' },
      series: [
        {
          type: 'pie',
          radius: ['42%', '68%'],
          center: ['50%', '45%'],
          data: mock.woStatus,
          itemStyle: { borderRadius: 4 },
        },
      ],
    },
  }
}

function buildDefectParetoChart(mock) {
  const { defects, counts, cumulative } = mock.defectPareto
  return {
    title: '不良品帕累托分析',
    span: 12,
    option: {
      tooltip: { trigger: 'axis' },
      legend: { data: ['不良数量', '累计占比'], top: 0 },
      grid: { left: 40, right: 48, top: 36, bottom: 48 },
      xAxis: { type: 'category', data: defects, axisLabel: { rotate: 20 } },
      yAxis: [
        { type: 'value', name: '件' },
        { type: 'value', name: '累计%', max: 100, axisLabel: { formatter: '{value}%' } },
      ],
      series: [
        {
          name: '不良数量',
          type: 'bar',
          data: counts,
          itemStyle: { color: '#ff4d4f' },
          barMaxWidth: 32,
        },
        {
          name: '累计占比',
          type: 'line',
          yAxisIndex: 1,
          data: cumulative,
          itemStyle: { color: '#fa8c16' },
        },
      ],
    },
  }
}

function buildQcTrendChart(mock) {
  return {
    title: '近7日质检合格率',
    span: 12,
    option: {
      tooltip: { trigger: 'axis', valueFormatter: (v) => `${v}%` },
      grid: { left: 40, right: 16, top: 24, bottom: 28 },
      xAxis: { type: 'category', data: mock.qcTrend.labels, boundaryGap: false },
      yAxis: { type: 'value', min: 95, max: 100, axisLabel: { formatter: '{value}%' } },
      series: [
        {
          type: 'line',
          smooth: true,
          data: mock.qcTrend.rates,
          itemStyle: { color: '#52c41a' },
        },
      ],
    },
  }
}

function buildScrapTrendChart(mock) {
  return {
    title: '近7日报废数量趋势',
    span: 12,
    option: {
      tooltip: { trigger: 'axis' },
      grid: { left: 40, right: 16, top: 24, bottom: 28 },
      xAxis: { type: 'category', data: mock.scrapTrend.labels, boundaryGap: false },
      yAxis: { type: 'value', minInterval: 1 },
      series: [
        {
          type: 'line',
          smooth: true,
          data: mock.scrapTrend.values,
          areaStyle: { opacity: 0.1 },
          itemStyle: { color: '#ff4d4f' },
        },
      ],
    },
  }
}

function buildBomKittingChart(mock) {
  return {
    title: 'BOM 齐套率',
    span: 12,
    option: {
      tooltip: { trigger: 'axis', valueFormatter: (v) => `${v}%` },
      grid: { left: 40, right: 16, top: 24, bottom: 28 },
      xAxis: { type: 'category', data: mock.bomKitting.lines },
      yAxis: { type: 'value', min: 80, max: 100, axisLabel: { formatter: '{value}%' } },
      series: [
        {
          type: 'bar',
          data: mock.bomKitting.rates,
          itemStyle: { color: '#eb2f96' },
          barMaxWidth: 36,
          markLine: {
            silent: true,
            data: [{ yAxis: 90, label: { formatter: '目标 90%' } }],
            lineStyle: { color: '#fa8c16', type: 'dashed' },
          },
        },
      ],
    },
  }
}

function buildOrderFunnelChart(mock) {
  return {
    title: '订单漏斗',
    span: 12,
    option: {
      tooltip: { trigger: 'item', formatter: '{b}: {c}' },
      series: [
        {
          type: 'funnel',
          left: '10%',
          width: '80%',
          top: 16,
          bottom: 16,
          sort: 'descending',
          gap: 4,
          label: { show: true, position: 'inside', formatter: '{b}\n{c}' },
          data: mock.orderFunnel,
          itemStyle: { borderColor: '#fff', borderWidth: 1 },
        },
      ],
    },
  }
}

function buildOnTimeDeliveryChart(mock) {
  return {
    title: '交期达成率趋势',
    span: 12,
    option: {
      tooltip: { trigger: 'axis', valueFormatter: (v) => `${v}%` },
      grid: { left: 40, right: 16, top: 24, bottom: 28 },
      xAxis: { type: 'category', data: mock.onTimeDelivery.labels },
      yAxis: { type: 'value', min: 80, max: 100, axisLabel: { formatter: '{value}%' } },
      series: [
        {
          type: 'line',
          smooth: true,
          data: mock.onTimeDelivery.rates,
          itemStyle: { color: '#fa8c16' },
          areaStyle: { opacity: 0.1 },
          markLine: {
            silent: true,
            data: [{ yAxis: 90, label: { formatter: '目标 90%' } }],
            lineStyle: { color: '#52c41a', type: 'dashed' },
          },
        },
      ],
    },
  }
}

function buildSalesDeliveryChart(mock) {
  const { salesAmount, deliveryAmount } = mock.salesDelivery
  const pendingAmount = Math.max(salesAmount - deliveryAmount, 0)
  const rate = salesAmount > 0 ? Math.round((deliveryAmount / salesAmount) * 100) : 0
  const fmtWan = (v) => `￥${(v / 10000).toFixed(1)}万`

  return {
    title: '销售与发货对比',
    span: 12,
    option: {
      tooltip: {
        trigger: 'item',
        formatter: (p) => `${p.name}: ${fmtWan(p.value)} (${p.percent}%)`,
      },
      legend: { bottom: 0 },
      graphic: [
        {
          type: 'text',
          left: 'center',
          top: '40%',
          style: {
            text: `${rate}%`,
            textAlign: 'center',
            fill: '#1677ff',
            fontSize: 22,
            fontWeight: 700,
          },
        },
        {
          type: 'text',
          left: 'center',
          top: '50%',
          style: {
            text: '发货完成率',
            textAlign: 'center',
            fill: 'rgba(0,0,0,0.45)',
            fontSize: 12,
          },
        },
      ],
      series: [
        {
          type: 'pie',
          radius: ['48%', '68%'],
          center: ['50%', '45%'],
          avoidLabelOverlap: true,
          label: {
            show: true,
            formatter: (p) => `${p.name}\n${fmtWan(p.value)}`,
            fontSize: 11,
          },
          data: [
            { name: '已发货金额', value: deliveryAmount, itemStyle: { color: '#13c2c2' } },
            { name: '待发货金额', value: pendingAmount, itemStyle: { color: '#91caff' } },
          ],
        },
      ],
    },
  }
}

function buildOutputPerCapitaChart(mock) {
  const { workshops, values } = mock.outputPerCapita
  const maxVal = Math.max(...values, 1)
  const radarMax = Math.ceil(maxVal / 10) * 10

  return {
    title: '人均产出',
    span: 12,
    option: {
      tooltip: { valueFormatter: (v) => `${v} 件/人` },
      legend: { bottom: 0, data: ['人均产出'] },
      radar: {
        indicator: workshops.map((name) => ({ name, max: radarMax })),
        radius: '58%',
        center: ['50%', '48%'],
        splitNumber: 4,
      },
      series: [
        {
          type: 'radar',
          data: [
            {
              name: '人均产出',
              value: values,
              areaStyle: { opacity: 0.18 },
              lineStyle: { width: 2 },
            },
          ],
          itemStyle: { color: '#2f54eb' },
        },
      ],
    },
  }
}

function buildPieceRateEfficiencyChart(mock) {
  return {
    title: '计件效率',
    span: 12,
    option: {
      tooltip: { trigger: 'axis', valueFormatter: (v) => `${v}%` },
      legend: { data: ['实际效率', '标准效率'], top: 0 },
      grid: { left: 40, right: 16, top: 36, bottom: 28 },
      xAxis: { type: 'category', data: mock.pieceRateEfficiency.labels, boundaryGap: false },
      yAxis: { type: 'value', min: 85, max: 100, axisLabel: { formatter: '{value}%' } },
      series: [
        {
          name: '实际效率',
          type: 'line',
          smooth: true,
          data: mock.pieceRateEfficiency.actual,
          itemStyle: { color: '#722ed1' },
        },
        {
          name: '标准效率',
          type: 'line',
          data: mock.pieceRateEfficiency.standard,
          lineStyle: { type: 'dashed' },
          itemStyle: { color: '#bfbfbf' },
        },
      ],
    },
  }
}

function buildChartSections(role, mock) {
  const productionSection = {
    key: 'production',
    title: '产量与物料消耗',
    charts: [buildOutputMaterialChart(mock), buildTopMaterialConsumptionChart(mock)],
  }

  const inventorySection = {
    key: 'inventory',
    title: '库存分析',
    charts: buildInventoryCharts(mock),
  }

  const executionSection = {
    key: 'execution',
    title: '生产执行',
    charts: [buildWipChart(mock), buildWoStatusChart(mock)],
  }

  const qualitySection = {
    key: 'quality',
    title: '质量分析',
    charts: [
      buildDefectParetoChart(mock),
      buildQcTrendChart(mock),
      ...(role === COCKPIT_ROLE.OPS ? [buildScrapTrendChart(mock)] : []),
    ],
  }

  const supplySection = {
    key: 'supply',
    title: '供需与交付',
    charts: [
      buildBomKittingChart(mock),
      buildOrderFunnelChart(mock),
      buildOnTimeDeliveryChart(mock),
      ...(role === COCKPIT_ROLE.EXECUTIVE ? [buildSalesDeliveryChart(mock)] : []),
    ],
  }

  const laborSection = {
    key: 'labor',
    title: '人力效能',
    charts: [buildOutputPerCapitaChart(mock), buildPieceRateEfficiencyChart(mock)],
  }

  return [
    productionSection,
    inventorySection,
    executionSection,
    qualitySection,
    supplySection,
    laborSection,
  ]
}

/** 聚合数据驾驶舱（演示 MOCK 数据，与业务 store 无关） */
export function buildDataCockpitDashboard({
  role = COCKPIT_ROLE.EXECUTIVE,
  period = COCKPIT_PERIOD.WEEK,
} = {}) {
  const mock = getCockpitMockData(period)
  const kpis = role === COCKPIT_ROLE.EXECUTIVE ? mock.kpis.executive : mock.kpis.ops
  const chartSections = buildChartSections(role, mock)

  return {
    role,
    period,
    kpis,
    chartSections,
    updatedAt: dayjs().format('YYYY-MM-DD HH:mm:ss'),
  }
}
