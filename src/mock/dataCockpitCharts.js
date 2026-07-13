import dayjs from 'dayjs'
import { COCKPIT_PERIOD } from '@/constants/dataCockpit'

const PERIOD_SCALE = {
  [COCKPIT_PERIOD.TODAY]: 0.18,
  [COCKPIT_PERIOD.WEEK]: 1,
  [COCKPIT_PERIOD.MONTH]: 3.8,
  [COCKPIT_PERIOD.QUARTER]: 11,
}

const PERIOD_LABEL = {
  [COCKPIT_PERIOD.TODAY]: '今日',
  [COCKPIT_PERIOD.WEEK]: '本周',
  [COCKPIT_PERIOD.MONTH]: '本月',
  [COCKPIT_PERIOD.QUARTER]: '本季',
}

function scale(period, value) {
  const factor = PERIOD_SCALE[period] ?? 1
  return Math.round(value * factor)
}

function last7DayLabels() {
  const labels = []
  for (let i = 6; i >= 0; i -= 1) {
    labels.push(dayjs().subtract(i, 'day').format('MM-DD'))
  }
  return labels
}

/** 驾驶舱演示用 MOCK 数据（与业务 store 无关） */
export function getCockpitMockData(period = COCKPIT_PERIOD.WEEK) {
  const label = PERIOD_LABEL[period]
  const s = (v) => scale(period, v)

  return {
    period,
    periodLabel: label,
    kpis: {
      executive: [
        {
          key: 'sales-amount',
          title: `${label}销售订单额`,
          value: s(1286000),
          unit: '元',
          sub: `订单 ${s(46)} 笔 · 数量 ${s(1820)}`,
          tone: 'blue',
        },
        {
          key: 'delivery-rate',
          title: '发货完成率',
          value: 87,
          unit: '%',
          sub: `已发 ${s(1580)} / 待发 ${s(240)}`,
          tone: 'cyan',
        },
        {
          key: 'output',
          title: `${label}报工产出`,
          value: s(3456),
          unit: '件',
          sub: '较上期 +12.4%',
          tone: 'purple',
        },
        {
          key: 'material-issue',
          title: `${label}领料消耗`,
          value: s(2890),
          unit: '件',
          sub: '领料/发料/投料出库',
          tone: 'geekblue',
        },
        {
          key: 'otd-rate',
          title: '交期达成率',
          value: 94,
          unit: '%',
          sub: '准时交付 43 / 46 单',
          tone: 'orange',
        },
        {
          key: 'qc-rate',
          title: '质检合格率',
          value: 98.2,
          unit: '%',
          sub: '抽检 312 批 · 不良 6 批',
          tone: 'green',
        },
        {
          key: 'bom-kit',
          title: 'BOM 齐套率',
          value: 91,
          unit: '%',
          sub: '缺料工单 8 张',
          tone: 'magenta',
        },
        {
          key: 'stock-alert',
          title: '库存预警',
          value: 12,
          unit: '项',
          sub: '低于安全库存',
          tone: 'red',
        },
      ],
      ops: [
        {
          key: 'output',
          title: `${label}报工产出`,
          value: s(3456),
          unit: '件',
          sub: '较上期 +12.4%',
          tone: 'green',
        },
        {
          key: 'material-issue',
          title: `${label}领料消耗`,
          value: s(2890),
          unit: '件',
          sub: '领料/发料/投料出库',
          tone: 'geekblue',
        },
        {
          key: 'wo-progress',
          title: '工单完成率',
          value: 78,
          unit: '%',
          sub: '在制 36 / 完成 128',
          tone: 'purple',
        },
        {
          key: 'wip',
          title: '在制品 WIP',
          value: s(486),
          unit: '件',
          sub: '5 个工序节点',
          tone: 'cyan',
        },
        {
          key: 'qc-rate',
          title: '质检合格率',
          value: 98.2,
          unit: '%',
          sub: '抽检 312 批',
          tone: 'orange',
        },
        {
          key: 'bom-kit',
          title: 'BOM 齐套率',
          value: 91,
          unit: '%',
          sub: '缺料工单 8 张',
          tone: 'magenta',
        },
        {
          key: 'per-capita',
          title: '人均产出',
          value: s(86),
          unit: '件/人',
          sub: '在岗 40 人',
          tone: 'blue',
        },
        {
          key: 'stock-alert',
          title: '库存预警',
          value: 12,
          unit: '项',
          sub: '低于安全库存',
          tone: 'red',
        },
      ],
    },
    outputMaterialTrend: {
      labels: last7DayLabels(),
      output: [420, 380, 510, 465, 530, 490, 560],
      material: [360, 340, 445, 410, 480, 455, 498],
    },
    topMaterials: [
      { name: '轴承座', qty: s(820) },
      { name: '螺栓组', qty: s(760) },
      { name: '钢锭', qty: s(640) },
      { name: '密封圈', qty: s(520) },
      { name: '电机壳体', qty: s(480) },
      { name: '叶轮', qty: s(410) },
      { name: '联轴器', qty: s(360) },
      { name: '润滑油', qty: s(290) },
    ],
    inventoryByWarehouse: {
      原材料仓: 4280,
      半成品仓: 3160,
      成品仓: 2540,
      辅料仓: 980,
    },
    inventoryByType: {
      产品: 3820,
      物料: 7140,
    },
    stockHealth: {
      正常库存: 186,
      低库存: 24,
      零库存: 8,
    },
    wipByStage: {
      stages: ['下料', '机加', '热处理', '装配', '终检'],
      values: [s(86), s(142), s(68), s(124), s(66)],
    },
    woStatus: [
      { name: '生产中', value: 36 },
      { name: '待下发', value: 12 },
      { name: '已完工', value: 128 },
      { name: '已暂停', value: 4 },
      { name: '已关闭', value: 18 },
    ],
    defectPareto: {
      defects: ['尺寸超差', '表面划伤', '漏焊', '毛刺', '色差', '其他'],
      counts: [42, 28, 18, 14, 9, 6],
      cumulative: [38, 63, 79, 92, 97, 100],
    },
    qcTrend: {
      labels: last7DayLabels(),
      rates: [97.8, 98.5, 98.1, 99.0, 98.6, 97.9, 98.2],
    },
    scrapTrend: {
      labels: last7DayLabels(),
      values: [3, 5, 2, 4, 6, 3, 2],
    },
    bomKitting: {
      lines: ['离心泵系列', '阀门系列', '电机系列', '配件系列'],
      rates: [94, 88, 92, 86],
    },
    orderFunnel: [
      { name: '询价', value: 120 },
      { name: '下单', value: 86 },
      { name: '排产', value: 72 },
      { name: '生产中', value: 58 },
      { name: '已发货', value: 46 },
      { name: '已回款', value: 38 },
    ],
    onTimeDelivery: {
      labels: ['W1', 'W2', 'W3', 'W4', 'W5', 'W6'],
      rates: [88, 90, 92, 91, 94, 93],
    },
    salesDelivery: {
      salesAmount: s(1286000),
      deliveryAmount: s(1120000),
    },
    outputPerCapita: {
      workshops: ['机加车间', '装配车间', '热处理', '质检组', '包装组'],
      values: [s(96), s(82), s(68), s(54), s(78)],
    },
    pieceRateEfficiency: {
      labels: last7DayLabels(),
      actual: [92, 94, 91, 95, 93, 96, 94],
      standard: [90, 90, 90, 90, 90, 90, 90],
    },
  }
}
