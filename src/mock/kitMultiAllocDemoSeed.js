/**
 * 齐套：同一物料被多张单据争用演示
 *
 * 物料 KIT-SHARE-CAST-01 实物 7：
 * - B 特急 需求5 → 占用5 已齐套
 * - C 紧急 需求4 → 占用2、在途1 → 部分缺口
 * - D 正常 需求5 → 占用0、在途6 → 待到货
 * - E 正常 需求7 → 占用0、在途3 → 部分缺口
 */
import dayjs from 'dayjs'
import { stockState } from '@/store/stockStore'
import { URGENCY } from '@/constants/urgency'

export const KIT_MULTI_ALLOC = {
  itemCode: 'KIT-SHARE-CAST-01',
  itemName: '共用阀体铸件（多单占用演示）',
  warehouse: '原料仓',
  physicalQty: 7,
  unit: '件',
}

const DEMO_PLAN_IDS = new Set([
  'pp-kit-multi-b',
  'pp-kit-multi-c',
  'pp-kit-multi-d',
  'pp-kit-multi-e',
])

function buildShareMaterial({ demand, inTransit }) {
  return {
    id: `mat-kit-share-${demand}-${inTransit}`,
    code: KIT_MULTI_ALLOC.itemCode,
    name: KIT_MULTI_ALLOC.itemName,
    supplyType: '外购件',
    demandQty: demand,
    unitUsage: demand,
    planQty: demand,
    stockQty: KIT_MULTI_ALLOC.physicalQty,
    availableStock: KIT_MULTI_ALLOC.physicalQty,
    /** 不被采购在途 enrich 覆盖，专供齐套演示 */
    kitDemoInTransit: inTransit,
    inTransitQty: inTransit,
    unit: KIT_MULTI_ALLOC.unit,
    spec: 'HT250',
    material: '铸铁',
    drawingNo: 'TZ-CAST-01',
  }
}

function buildDemoPlan({
  id,
  orderNo,
  urgency,
  demand,
  inTransit,
  planDate,
  createdAt,
  productName,
}) {
  return {
    id,
    orderNo,
    salesOrderNo: orderNo,
    customerName: '多单占用演示客户',
    productName,
    urgency,
    createdAt,
    createTime: createdAt,
    planAssemblyDate: planDate,
    remark: '齐套多单占用演示（KIT-SHARE-CAST-01）',
    workItems: [
      {
        id: `wi-${id}`,
        productName,
        productCode: `CP-${id}`,
        specModel: 'DEMO',
        material: '钢',
        planQty: 1,
        orderQty: 1,
        salesQty: 1,
        unit: '台',
        materials: [buildShareMaterial({ demand, inTransit })],
      },
    ],
  }
}

function ensureDemoStock() {
  const key = `${KIT_MULTI_ALLOC.warehouse}::${KIT_MULTI_ALLOC.itemCode}`
  const list = stockState.records || []
  const hit = list.find((r) => r.key === key || r.itemCode === KIT_MULTI_ALLOC.itemCode)
  if (hit) {
    hit.qty = KIT_MULTI_ALLOC.physicalQty
    hit.itemName = KIT_MULTI_ALLOC.itemName
    hit.unit = KIT_MULTI_ALLOC.unit
    return
  }
  list.push({
    id: 'stk-kit-multi-share-01',
    key,
    warehouse: KIT_MULTI_ALLOC.warehouse,
    itemCode: KIT_MULTI_ALLOC.itemCode,
    itemName: KIT_MULTI_ALLOC.itemName,
    itemType: '物料',
    unit: KIT_MULTI_ALLOC.unit,
    qty: KIT_MULTI_ALLOC.physicalQty,
  })
}

function buildDemoPlans() {
  const d0 = dayjs()
  return [
    buildDemoPlan({
      id: 'pp-kit-multi-b',
      orderNo: 'KIT-DEMO-B-特急',
      urgency: URGENCY.CRITICAL,
      demand: 5,
      inTransit: 0,
      planDate: d0.add(10, 'day').format('YYYY-MM-DD'),
      createdAt: d0.subtract(5, 'day').format('YYYY-MM-DD HH:mm'),
      productName: '演示泵 B（特急·已齐套）',
    }),
    buildDemoPlan({
      id: 'pp-kit-multi-c',
      orderNo: 'KIT-DEMO-C-紧急',
      urgency: URGENCY.URGENT,
      demand: 4,
      inTransit: 1,
      planDate: d0.add(12, 'day').format('YYYY-MM-DD'),
      createdAt: d0.subtract(4, 'day').format('YYYY-MM-DD HH:mm'),
      productName: '演示泵 C（紧急·部分缺口）',
    }),
    buildDemoPlan({
      id: 'pp-kit-multi-d',
      orderNo: 'KIT-DEMO-D-待到货',
      urgency: URGENCY.NORMAL,
      demand: 5,
      inTransit: 6,
      planDate: d0.add(14, 'day').format('YYYY-MM-DD'),
      createdAt: d0.subtract(3, 'day').format('YYYY-MM-DD HH:mm'),
      productName: '演示泵 D（正常·待到货）',
    }),
    buildDemoPlan({
      id: 'pp-kit-multi-e',
      orderNo: 'KIT-DEMO-E-部分缺口',
      urgency: URGENCY.NORMAL,
      demand: 7,
      inTransit: 3,
      planDate: d0.add(20, 'day').format('YYYY-MM-DD'),
      createdAt: d0.subtract(2, 'day').format('YYYY-MM-DD HH:mm'),
      productName: '演示泵 E（正常·部分缺口）',
    }),
  ]
}

/** 合并/刷新演示计划，并保证台账实物为 7 */
export function ensureKitMultiAllocDemoPlans(plans = []) {
  ensureDemoStock()
  const rest = (plans || []).filter((p) => !DEMO_PLAN_IDS.has(p.id))
  return [...buildDemoPlans(), ...rest]
}
