import dayjs from 'dayjs'
import { productionPlanState } from '@/store/productionPlanStore'
import { flattenMaterials } from '@/utils/material'
import { buildProcessesFromRoute } from '@/mock/processRoutes'
import { createLineItem } from '@/mock/purchaseRequisitions'

export const PRODUCTION_PLAN_ORDER_TREE_DEMO_PLAN_NO = '1-20260512-005'

export const PRODUCTION_PLAN_ORDER_TREE_DEMO_WORK_ORDER_IDS = [
  'wo-pp-tree-demo-1',
  'wo-pp-tree-demo-2',
]

export const PRODUCTION_PLAN_ORDER_TREE_DEMO_ASSEMBLY_IDS = ['asm-pp-tree-demo-1']

export const PRODUCTION_PLAN_ORDER_TREE_DEMO_REQ_IDS = ['pr-pp-tree-demo-1']

function findDemoPlan() {
  return productionPlanState.plans.find(
    (p) => p.orderNo === PRODUCTION_PLAN_ORDER_TREE_DEMO_PLAN_NO,
  )
}

function collectMaterialsBySupply(plan) {
  const selfMade = []
  const outsourced = []
  const purchased = []

  plan?.workItems?.forEach((wi) => {
    const all = []
    flattenMaterials(wi.materials || [], all)
    all.forEach((m) => {
      if (!m.code) return
      if (m.supplyType === '自制件' || m.supplyType === '自制') {
        selfMade.push({ wi, m })
      } else if (m.supplyType === '外协件') {
        outsourced.push({ wi, m })
      } else if (m.supplyType === '外购件') {
        purchased.push({ wi, m })
      }
    })
  })

  return { selfMade, outsourced, purchased }
}

export function createProductionPlanOrderTreeDemoWorkOrders() {
  const plan = findDemoPlan()
  if (!plan) return []

  const { selfMade, outsourced } = collectMaterialsBySupply(plan)
  const routeName = '机加标准路线'
  const orders = []

  if (selfMade[0]) {
    const { m } = selfMade[0]
    orders.push({
      id: 'wo-pp-tree-demo-1',
      code: 'WO202605280-001',
      name: `${m.name}生产工单`,
      productName: m.name,
      materialCode: m.code,
      orderCategory: '生产工单',
      status: '待下发',
      progressLabel: '待下发',
      scheduleQty: m.planQty || m.demandQty || 1,
      planQty: m.planQty || m.demandQty || 1,
      workCenter: '默认工厂',
      bom: plan.workItems?.[0]?.bomName || '',
      warehouse: '半成品仓',
      urgency: plan.urgency || '普通',
      planDateRange: [
        dayjs().format('YYYY-MM-DD'),
        plan.deliveryDate || dayjs().add(14, 'day').format('YYYY-MM-DD'),
      ],
      remark: '生产计划演示工单',
      processRouteName: routeName,
      source: 'production-plan',
      sourceOrderNo: plan.orderNo,
      processes: buildProcessesFromRoute(routeName),
      createdAt: dayjs().format('YYYY-MM-DD'),
    })
  }

  if (outsourced[0]) {
    const { m } = outsourced[0]
    orders.push({
      id: 'wo-pp-tree-demo-2',
      code: 'WO202606010-003',
      name: `${m.name}外协工单`,
      productName: m.name,
      materialCode: m.code,
      orderCategory: '外协工单',
      status: '执行中',
      progressLabel: '进行中',
      scheduleQty: m.planQty || m.demandQty || 1,
      planQty: m.planQty || m.demandQty || 1,
      workCenter: '外协车间',
      bom: '',
      warehouse: '半成品仓',
      urgency: plan.urgency || '普通',
      planDateRange: [
        dayjs().format('YYYY-MM-DD'),
        plan.deliveryDate || dayjs().add(14, 'day').format('YYYY-MM-DD'),
      ],
      remark: '生产计划演示外协工单',
      source: 'production-plan',
      sourceOrderNo: plan.orderNo,
      supplier: '淄博机加工外协厂',
      skipEbom: true,
      processes: [],
      createdAt: dayjs().format('YYYY-MM-DD'),
    })
  }

  return orders
}

export function createProductionPlanOrderTreeDemoAssemblyOrders() {
  const plan = findDemoPlan()
  const wi = plan?.workItems?.[0]
  if (!plan || !wi) return []

  const routeName = '装配标准路线'
  return [
    {
      id: 'asm-pp-tree-demo-1',
      code: 'ZZGD20260528001',
      name: `${wi.productName}总装工单`,
      productName: wi.productName,
      productCode: wi.productCode,
      orderCategory: '总装工单',
      status: '待下发',
      scheduleQty: Number(wi.planQty ?? wi.salesQty) || 1,
      planQty: Number(wi.planQty ?? wi.salesQty) || 1,
      workCenter: '总装车间',
      bom: wi.bomName || wi.productName,
      warehouse: '成品仓',
      urgency: plan.urgency || '普通',
      planDateRange: [
        dayjs().format('YYYY-MM-DD'),
        plan.deliveryDate || dayjs().add(14, 'day').format('YYYY-MM-DD'),
      ],
      remark: '生产计划演示总装工单',
      processRouteName: routeName,
      source: 'production-plan',
      sourceOrderNo: plan.orderNo,
      processes: buildProcessesFromRoute(routeName),
      createdAt: dayjs().format('YYYY-MM-DD'),
    },
  ]
}

export function createProductionPlanOrderTreeDemoRequisitions() {
  const plan = findDemoPlan()
  if (!plan) return []

  const { purchased } = collectMaterialsBySupply(plan)
  if (!purchased[0]) return []

  const { m } = purchased[0]
  return [
    {
      id: 'pr-pp-tree-demo-1',
      reqNo: 'CGSQ2026060001',
      salesOrderNo: plan.orderNo,
      docStatus: '待处理',
      overdueStatus: '未逾期',
      purchaseOrderNo: '',
      urgency: plan.urgency === '紧急' ? '紧急' : '正常',
      plannedQty: m.planQty || m.demandQty || 1,
      amountWan: 0,
      deliveryDate: plan.deliveryDate || '',
      estimatedArrivalDate: plan.deliveryDate || '',
      orderDate: dayjs().format('YYYY-MM-DD'),
      source: '生产计划',
      receivingWarehouse: '原材料仓',
      operator: 'admin1',
      creator: 'admin1',
      createdAt: dayjs().format('YYYY-MM-DD HH:mm:ss'),
      updatedAt: dayjs().format('YYYY-MM-DD HH:mm:ss'),
      lineItems: [
        createLineItem({
          id: 'pr-pp-tree-demo-line-1',
          inventoryName: m.name,
          inventoryCode: m.code,
          specModel: m.spec || m.specModel || '',
          material: m.material || '',
          supplyType: m.supplyType,
          demandQty: m.demandQty || 1,
          planPurchaseQty: m.planQty || m.demandQty || 1,
          deliveryDate: plan.deliveryDate || '',
        }),
      ],
    },
  ]
}

export function ensureProductionPlanOrderTreeDemoWorkOrders(orders) {
  const demos = createProductionPlanOrderTreeDemoWorkOrders()
  const rest = orders.filter((o) => !PRODUCTION_PLAN_ORDER_TREE_DEMO_WORK_ORDER_IDS.includes(o.id))
  return [...demos, ...rest]
}

export function ensureProductionPlanOrderTreeDemoAssemblyOrders(orders) {
  const demos = createProductionPlanOrderTreeDemoAssemblyOrders()
  const rest = orders.filter((o) => !PRODUCTION_PLAN_ORDER_TREE_DEMO_ASSEMBLY_IDS.includes(o.id))
  return [...demos, ...rest]
}

export function ensureProductionPlanOrderTreeDemoRequisitions(requisitions) {
  const demos = createProductionPlanOrderTreeDemoRequisitions()
  const rest = requisitions.filter((r) => !PRODUCTION_PLAN_ORDER_TREE_DEMO_REQ_IDS.includes(r.id))
  return [...demos, ...rest]
}
