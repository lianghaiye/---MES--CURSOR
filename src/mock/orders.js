import dayjs from 'dayjs'

/** 创建完整物料节点 */
function createMaterial(partial) {
  const unitUsage = partial.unitUsage ?? 1
  const stockQty = partial.stockQty ?? 0
  const availableStock = partial.availableStock ?? 0
  const inTransitQty = partial.inTransitQty ?? 0
  const demandQty = partial.demandQty ?? 0
  const gapQty = Math.max(0, demandQty - availableStock)

  return {
    status: '待下达',
    name: '',
    code: '',
    spec: '',
    specAttr: '',
    material: '',
    type: '',
    unitUsage,
    unit: '件',
    supplyType: '其他',
    stockQty,
    availableStock,
    inTransitQty,
    demandQty,
    planQty: partial.planQty ?? gapQty,
    joinPlan: '否',
    designateSupplier: false,
    supplier: '',
    processRoute: '',
    processFile: '',
    standardCycle: '',
    latestProcessTime: '',
    remark: '',
    bom: '',
    workCenter: '',
    personInCharge: '',
    warehouse: '',
    urgency: '',
    workOrderRemark: '',
    children: [],
    ...partial,
    gapQty: Math.max(
      0,
      (partial.demandQty ?? demandQty) - (partial.availableStock ?? availableStock),
    ),
  }
}

export const mockOrders = [
  {
    id: '1',
    orderNo: 'SO202505001',
    customerName: '华东机械制造有限公司',
    productQty: 12,
    salesperson: '张三',
    urgency: '紧急',
    orderStatus: '部分下达',
    orderDate: '2025-05-10',
    deliveryDate: '2025-05-20',
    region: '华东',
    settlementType: '月结',
    deliveryMethod: '送货',
    remark: '优先排产',
    tags: ['部分下达', '已逾期'],
    daysToDelivery: 0,
    planAssemblyDate: '2025-05-18',
    planCompleteDate: '2025-05-20',
    workItems: [
      {
        id: 'w1',
        status: '进行中',
        productName: '潜水电机',
        productCode: 'PRD-YQST250',
        productAttr: '自制',
        productType: '整机',
        model: 'YQST250-750/4',
        spec: '750kW',
        deliveryDate: '2025-05-20',
        materials: [
          createMaterial({
            id: 'm1',
            status: '待下达',
            name: '下导轴承座毛坯',
            code: '31.1.031.0023',
            spec: 'YQST250-750/4-01',
            specAttr: '标准',
            material: '钢',
            type: '零部件',
            unitUsage: 1,
            unit: '件',
            supplyType: '自制件',
            stockQty: 12,
            availableStock: 8,
            inTransitQty: 4,
            bom: '潜水电机',
            processRoute: '机加标准路线',
            workCenter: '默认工厂',
            personInCharge: '孙琴丽',
            warehouse: '半成品仓',
            standardCycle: '5天',
            latestProcessTime: '2025-05-18',
          }),
          createMaterial({
            id: 'm2',
            status: '待下达',
            name: '上导轴承座',
            code: '31.1.031.0024',
            spec: 'YQST250-750/4-02',
            specAttr: '左件',
            material: '钢',
            type: '零部件',
            unitUsage: 2,
            unit: '件',
            supplyType: '自制件',
            stockQty: 50,
            availableStock: 30,
            inTransitQty: 10,
            bom: '潜水电机',
            processRoute: '',
            workCenter: '',
            personInCharge: '',
            warehouse: '半成品仓',
          }),
          createMaterial({
            id: 'm3',
            status: '待下达',
            name: '定子铁芯组件',
            code: '31.1.031.0025',
            spec: 'YQST250-750/4-03',
            specAttr: '标准',
            material: '硅钢',
            type: '零部件',
            unitUsage: 1,
            unit: '套',
            supplyType: '自制件',
            stockQty: 8,
            availableStock: 5,
            inTransitQty: 3,
            bom: '潜水电机',
          }),
          createMaterial({
            id: 'm4',
            status: '待下达',
            name: '进口轴承',
            code: 'MAT-EXT-001',
            spec: '6312-2RS',
            specAttr: '-',
            material: '轴承钢',
            type: '外购件',
            unitUsage: 2,
            unit: '套',
            supplyType: '外购件',
            stockQty: 20,
            availableStock: 15,
            inTransitQty: 5,
            supplier: 'SKF代理商',
          }),
          createMaterial({
            id: 'm5',
            status: '不转产',
            name: '标准螺栓组',
            code: 'MAT-STD-100',
            spec: 'M12×40',
            specAttr: '8.8级',
            material: '钢',
            type: '标准件',
            unitUsage: 24,
            unit: '件',
            supplyType: '外购件',
            stockQty: 500,
            availableStock: 480,
            inTransitQty: 0,
            joinPlan: '否',
          }),
        ],
      },
    ],
  },
  {
    id: '2',
    orderNo: 'SO202505002',
    customerName: '深圳精密模具科技',
    productQty: 6,
    salesperson: '李四',
    urgency: '普通',
    orderStatus: '已完成',
    orderDate: '2025-04-28',
    deliveryDate: '2025-05-15',
    region: '华南',
    settlementType: '预付',
    deliveryMethod: '自提',
    remark: '',
    tags: ['已完成'],
    daysToDelivery: -13,
    workItems: [
      {
        id: 'w2',
        status: '已完成',
        productName: '精密模芯',
        productCode: 'PRD-MOLD-01',
        productAttr: '自制',
        productType: '模具',
        model: 'MD-200',
        spec: '200mm',
        deliveryDate: '2025-05-15',
        materials: [
          createMaterial({
            id: 'm6',
            name: '模芯毛坯',
            code: 'MD-200-BLK',
            spec: '200mm',
            specAttr: 'H13',
            material: '模具钢',
            type: '零部件',
            unitUsage: 1,
            supplyType: '自制件',
            stockQty: 2,
            availableStock: 1,
            inTransitQty: 0,
            status: '已完成',
          }),
        ],
      },
    ],
  },
  {
    id: '3',
    orderNo: 'SO202505003',
    customerName: '苏州汽车零部件厂',
    productQty: 24,
    salesperson: '王五',
    urgency: '加急',
    orderStatus: '待下达',
    orderDate: '2025-05-18',
    deliveryDate: '2025-06-10',
    region: '华东',
    settlementType: '月结',
    deliveryMethod: '物料',
    remark: '分批交付',
    tags: ['待下达'],
    daysToDelivery: 13,
    workItems: [],
  },
  {
    id: '4',
    orderNo: 'SO202505004',
    customerName: '武汉重工装备',
    productQty: 3,
    salesperson: '赵六',
    urgency: '普通',
    orderStatus: '部分下达',
    orderDate: '2025-05-05',
    deliveryDate: '2025-05-25',
    region: '华中',
    settlementType: '货到付款',
    deliveryMethod: '送货',
    remark: '',
    tags: ['部分下达'],
    daysToDelivery: 5,
    workItems: [],
  },
  {
    id: '5',
    orderNo: 'SO202505005',
    customerName: '成都电子科技',
    productQty: 18,
    salesperson: '张三',
    urgency: '紧急',
    orderStatus: '执行中',
    orderDate: '2025-05-12',
    deliveryDate: '2025-05-28',
    region: '西南',
    settlementType: '月结',
    deliveryMethod: '物料',
    remark: '需质检报告',
    tags: ['执行中', '已逾期'],
    daysToDelivery: 0,
    workItems: [],
  },
]

/** 打开页面时为物料计算需求数/缺口数 */
export function enrichOrderMaterials(order) {
  order.workItems?.forEach((wi) => {
    const walk = (nodes) => {
      nodes?.forEach((m) => {
        m.demandQty = calcDemandQty(m.unitUsage, order.productQty)
        m.gapQty = calcGapQty(m.demandQty, m.availableStock)
        if (m.planQty == null) m.planQty = m.gapQty
        if (m.children?.length) walk(m.children)
      })
    }
    walk(wi.materials)
  })
  return order
}

function calcDemandQty(unitUsage, productQty) {
  return (unitUsage || 0) * (productQty || 0)
}

function calcGapQty(demandQty, availableStock) {
  return Math.max(0, (demandQty || 0) - (availableStock || 0))
}

mockOrders.forEach(enrichOrderMaterials)

export function filterOrders(list, filters) {
  return list.filter((order) => {
    if (filters.orderNo && !order.orderNo.includes(filters.orderNo)) return false
    if (filters.customerName && !order.customerName.includes(filters.customerName)) return false
    if (filters.urgency && order.urgency !== filters.urgency) return false
    if (filters.orderStatus && order.orderStatus !== filters.orderStatus) return false
    if (filters.orderDateRange?.length === 2) {
      const [start, end] = filters.orderDateRange
      if (
        dayjs(order.orderDate).isBefore(start, 'day') ||
        dayjs(order.orderDate).isAfter(end, 'day')
      )
        return false
    }
    if (filters.deliveryDateRange?.length === 2) {
      const [start, end] = filters.deliveryDateRange
      if (
        dayjs(order.deliveryDate).isBefore(start, 'day') ||
        dayjs(order.deliveryDate).isAfter(end, 'day')
      )
        return false
    }
    return true
  })
}

export function cloneOrders() {
  return JSON.parse(JSON.stringify(mockOrders))
}
