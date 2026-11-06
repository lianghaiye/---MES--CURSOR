import { reactive, watch } from 'vue'
import dayjs from 'dayjs'
import { mockProducts } from '@/mock/productInfo'
import { buildPagedMockBoms } from '@/mock/productBomSeed'
import { mockMaterials } from '@/mock/materialInfo'
import { buildMockSalesOrders } from '@/mock/salesOrderSeed'
import { buildInitialProductionPlans } from '@/mock/productionPlanSeed'
import { getOwnActiveBomForItem, getProductBomById } from '@/store/productBomStore'
import { productInfoState } from '@/store/productInfoStore'
import { materialInfoState } from '@/store/materialInfoStore'
import { buildEbomSnapshotFromBom, createPlanMaterial } from '@/utils/ebomSnapshot'
import { enrichWorkItem, resolveSalesLineForWorkItem } from '@/utils/productionPlanWorkItem'
import { resolveWorkItemMaterials } from '@/utils/productionPlanMaterial'
import { applyCrossDemoStockToPlanMaterials } from '@/mock/crossModuleDemoSeed'
import { ensurePackageConvertDemoOnPlans } from '@/mock/packageConvertPurchaseDemoSeed'
import { ensureShipAccessoryProduceDemoPlans } from '@/mock/shipAccessoryProduceDemoSeed'
import { ensureKitMultiAllocDemoPlans } from '@/mock/kitMultiAllocDemoSeed'
import { ensureKitSupplyDemoEnrichment } from '@/mock/kitSupplyDemoEnrichSeed'
import { PLAN_SOURCE } from '@/utils/planSource'
import { MATERIAL_RELEASE_STATUS } from '@/constants/ecnPlanReschedule'
import { flattenMaterials } from '@/utils/material'
const STORAGE_KEY = 'i_doms_production_plans'
/** 与 ecnSeed.ECN_WHOLE_PLAN_DEMO_SO 保持一致（避免循环依赖不从 seed 引用） */
const ECN_WHOLE_PLAN_DEMO_SO = {
  WP01: '1-20261104-WP01',
  WP02: '1-20261104-WP02',
}
/** v17：ECN 待执行 / 已执行演示拆到不同销售订单，避免同 SO 工单互相污染 */
const DATA_VERSION = 17

/** 待执行细项处置演示 SO（ECN-DEMO-COVER） */
const ECN_COVER_DEMO_SO = '1-20260512-005'
/** 已执行全量处置演示 SO（ECN-DEMO-EXECUTED）——勿与 COVER 共用 */
const ECN_EXECUTED_DEMO_SO = '1-20261105-ECN-DONE'

/** 演示计划置顶，方便开发首屏查看 */
const ECN_DEMO_PIN_ORDER_NOS = [ECN_COVER_DEMO_SO, ECN_EXECUTED_DEMO_SO, '1-20261104-ECN-SKIP']

function pinEcnDemoPlansToFront(plans = []) {
  const list = Array.isArray(plans) ? [...plans] : []
  const pinned = []
  ECN_DEMO_PIN_ORDER_NOS.forEach((no) => {
    const idx = list.findIndex((p) => p.salesOrderNo === no || p.orderNo === no)
    if (idx >= 0) pinned.push(...list.splice(idx, 1))
  })
  return [...pinned, ...list]
}

function normalizePlanStatuses(orders) {
  const normalized = (orders || []).map((o) => {
    const plan = { ...o }
    if (!plan.planSource) {
      plan.planSource = plan.salesOrderNo ? 'sales-order' : 'manual'
    }
    // 库存补货：操作人为生成计划的人（兼容旧数据）
    if (plan.planSource === PLAN_SOURCE.STOCK_REPLENISH && !plan.operator) {
      plan.operator = plan.creator || plan.salesperson || 'admin1'
    }
    if (plan.orderStatus === '待排产') plan.orderStatus = '待下达'
    if (plan.orderStatus === '生产中') plan.orderStatus = '执行中'
    if (plan.deductInventory == null) plan.deductInventory = true
    if (Array.isArray(plan.tags)) {
      plan.tags = plan.tags.map((t) => {
        if (t === '待排产') return '待下达'
        if (t === '生产中') return '执行中'
        return t
      })
    }
    plan.workItems?.forEach((wi, idx) => {
      const salesLine = resolveSalesLineForWorkItem(plan, wi)
      Object.assign(wi, enrichWorkItem(wi, salesLine, idx, plan.deductInventory !== false))
      if (wi.expanded == null) wi.expanded = idx === 0
    })
    plan.workItems?.forEach((wi) => {
      if (!wi.planBatch) wi.planBatch = plan.planBatch || 1
      resolveWorkItemMaterials(wi)
      applyCrossDemoStockToPlanMaterials(wi.materials)
      const flat = []
      flattenMaterials(wi.materials, flat)
      flat.forEach((m) => {
        if (!m.releaseStatus) m.releaseStatus = MATERIAL_RELEASE_STATUS.RELEASABLE
      })
    })
    if (!plan.planBatch) plan.planBatch = 1
    return plan
  })

  return ensureKitSupplyDemoEnrichment(
    pinEcnDemoPlansToFront(
      ensureKitMultiAllocDemoPlans(
        ensureShipAccessoryProduceDemoPlans(
          ensurePackageConvertDemoOnPlans(
            ensureEcnWholePlanDemoPlans(
              ensureEcnSkipScheduleDemoPlan(
                ensureEcnExecutedDemoPlan(ensureEcnCoverPlanMaterials(normalized)),
              ),
            ),
          ),
        ),
      ),
    ),
  )
}

/**
 * ECN-DEMO-WHOLE-*：计划未下达，执行页走「整单换 BOM」
 * 刷新后 ensure 会把工作项状态拉回「待下达」
 */
function ensureEcnWholePlanDemoPlans(plans) {
  const list = plans || []
  const specs = [
    {
      so: ECN_WHOLE_PLAN_DEMO_SO.WP01,
      keyword: 'ISW80-65-200',
      customer: '华北水务',
      planId: 'plan-ecn-whole-wp01',
    },
    {
      so: ECN_WHOLE_PLAN_DEMO_SO.WP02,
      keyword: 'CDL4-40',
      customer: '胜利油田',
      planId: 'plan-ecn-whole-wp02',
    },
  ]

  specs.forEach((spec) => {
    const product =
      mockProducts.find((p) => String(p.name || '').includes(spec.keyword)) || mockProducts[0]
    let plan = list.find(
      (p) => p.salesOrderNo === spec.so || p.orderNo === spec.so || p.id === spec.planId,
    )
    if (!plan) {
      const bom = getOwnActiveBomForItem('product', product.id)
      const qty = 2
      const snapshot = bom ? buildEbomSnapshotFromBom(bom, qty) : { materials: [] }
      plan = {
        id: spec.planId,
        orderNo: spec.so,
        salesOrderNo: spec.so,
        planSource: 'sales-order',
        customerName: spec.customer,
        orderStatus: '待下达',
        urgency: '正常',
        deliveryDate: dayjs().add(20, 'day').format('YYYY-MM-DD'),
        tags: ['待下达'],
        planBatch: 1,
        deductInventory: true,
        workItems: [
          {
            id: `${spec.planId}-wi`,
            productId: product.id,
            productCode: product.code,
            productName: product.name,
            status: '待下达',
            planQty: qty,
            orderQty: qty,
            salesQty: qty,
            bomId: bom?.id || '',
            bomName: bom?.bomName || bom?.name || '',
            bomVersion: bom?.version || '',
            materials: JSON.parse(JSON.stringify(snapshot.materials || [])),
            ebomSnapshot: snapshot,
            planBatch: 1,
            expanded: true,
          },
        ],
      }
      list.unshift(plan)
      return
    }
    plan.orderStatus = '待下达'
    plan.tags = Array.from(
      new Set([...(plan.tags || []).filter((t) => t !== '部分下达'), '待下达']),
    )
    const wi =
      plan.workItems?.find(
        (w) =>
          String(w.productId) === String(product.id) ||
          w.productCode === product.code ||
          String(w.productName || '').includes(spec.keyword),
      ) || plan.workItems?.[0]
    if (wi) {
      wi.status = '待下达'
      wi.productId = product.id
      wi.productCode = product.code
      wi.productName = product.name
    }
  })
  return list
}

/** 让 ECN-DEMO-COVER 的修改/替换/取消能对上这张订单的计划物料（待执行态，不含已执行痕迹） */
function ensureEcnCoverPlanMaterials(plans) {
  const plan = (plans || []).find(
    (p) => p.salesOrderNo === ECN_COVER_DEMO_SO || p.orderNo === ECN_COVER_DEMO_SO,
  )
  const wi = plan?.workItems?.find(
    (w) => String(w.productName || '').includes('ISG50-160') || w.productCode === 'CP2610001',
  )
  if (!wi) return plans
  if (!Array.isArray(wi.materials)) wi.materials = []
  const flat = []
  flattenMaterials(wi.materials, flat)
  const codes = new Set(flat.map((m) => m.code))
  const qty = Number(wi.planQty ?? wi.orderQty ?? wi.salesQty) || 1
  const extras = [
    { code: '010050001', name: '泵体（泵壳）', supplyType: '自制件', spec: 'ISG50-160' },
    { code: '010050003', name: '叶轮', supplyType: '自制件', spec: 'ISG50-160' },
    { code: '010050004', name: '机械密封组件', supplyType: '自制件', spec: 'φ25×180mm' },
    { code: '010050004-A', name: '动环', supplyType: '自制件', spec: '' },
    { code: '010050004-B', name: '静环', supplyType: '外购件', spec: '' },
    { code: '010050002', name: '泵盖', supplyType: '外协件', spec: 'ISG50-160' },
    { code: '010050005', name: '泵轴', supplyType: '自制件', spec: 'φ25×180mm' },
    { code: '010050006', name: '地脚螺栓组', supplyType: '外购件', spec: 'M16' },
  ]
  extras.forEach((row) => {
    if (codes.has(row.code)) return
    wi.materials.push(
      createPlanMaterial({
        name: row.name,
        code: row.code,
        spec: row.spec,
        supplyType: row.supplyType,
        unitUsage: 1,
        demandQty: qty,
        planQty: qty,
        joinPlan: '是',
        status: '待下达',
      }),
    )
  })
  // ECN-DEMO-COVER 走「物料处置」模式：计划已开工，不展示整单换 BOM
  if (wi.status === '待下达' || wi.status === '设计中' || wi.status === '待BOM') {
    wi.status = '进行中'
  }
  if (plan.orderStatus === '待下达') {
    plan.orderStatus = '部分下达'
    plan.tags = Array.from(new Set([...(plan.tags || []), '部分下达']))
  }
  return plans
}

/**
 * ECN-DEMO-EXECUTED：独立销售订单 + 计划，展示已执行后的物料痕迹（与 COVER 分离）
 */
function ensureEcnExecutedDemoPlan(plans = []) {
  let list = Array.isArray(plans) ? [...plans] : []
  const product =
    mockProducts.find(
      (p) => String(p.name || '').includes('立式管道泵') || p.code === 'CP2610001',
    ) || mockProducts[0]
  const so = ECN_EXECUTED_DEMO_SO
  let plan = list.find(
    (p) => p.salesOrderNo === so || p.orderNo === so || p.id === 'plan-ecn-executed-demo',
  )
  const qty = 1
  if (!plan) {
    plan = {
      id: 'plan-ecn-executed-demo',
      orderNo: so,
      salesOrderNo: so,
      planSource: PLAN_SOURCE.SALES_ORDER,
      customerName: 'ECN已执行演示客户',
      salesperson: '张工',
      productQty: qty,
      orderStatus: '部分下达',
      urgency: '紧急',
      orderDate: dayjs().format('YYYY-MM-DD'),
      deliveryDate: dayjs().add(20, 'day').format('YYYY-MM-DD'),
      tags: ['部分下达'],
      planBatch: 1,
      deductInventory: true,
      remark: '演示：ECN 已执行全量处置后的计划物料痕迹',
      workItems: [
        {
          id: 'plan-ecn-executed-demo-wi',
          productId: product.id,
          productCode: product.code,
          productName: product.name,
          status: '进行中',
          planQty: qty,
          orderQty: qty,
          salesQty: qty,
          materials: [],
          planBatch: 1,
          expanded: true,
        },
      ],
    }
    list.unshift(plan)
  }
  const wi = plan.workItems?.[0]
  if (!wi) return list
  if (!Array.isArray(wi.materials)) wi.materials = []
  const baseCodes = [
    { code: '010050001', name: '泵体（泵壳）', supplyType: '自制件', spec: 'ISG50-160' },
    { code: '010050003', name: '叶轮', supplyType: '自制件', spec: 'ISG50-160' },
    { code: '010050004', name: '机械密封组件', supplyType: '自制件', spec: 'φ25×180mm' },
    { code: '010050004-A', name: '动环', supplyType: '自制件', spec: '' },
    { code: '010050004-B', name: '静环', supplyType: '外购件', spec: '' },
    { code: '010050002', name: '泵盖', supplyType: '外协件', spec: 'ISG50-160' },
    { code: '010050005', name: '泵轴', supplyType: '自制件', spec: 'φ25×180mm' },
    { code: '010050006', name: '地脚螺栓组', supplyType: '外购件', spec: 'M16' },
  ]
  const flat = []
  flattenMaterials(wi.materials, flat)
  const existing = new Set(flat.map((m) => m.code))
  baseCodes.forEach((row) => {
    if (existing.has(row.code)) return
    wi.materials.push(
      createPlanMaterial({
        name: row.name,
        code: row.code,
        spec: row.spec,
        supplyType: row.supplyType,
        unitUsage: 1,
        demandQty: qty,
        planQty: qty,
        joinPlan: '是',
        status: '待下达',
      }),
    )
  })
  applyEcnExecutedFullTraceDemo(wi, qty)
  return list
}

const ECN_EXECUTED_DEMO_NO = 'ECN-DEMO-EXECUTED'

/** 演示：已执行 ECN 覆盖改用量/换料/替换含子树/取消/新增 */
function applyEcnExecutedFullTraceDemo(wi, parentQty) {
  if (!wi || wi._ecnTraceDemoV >= 4) return
  const ecnNo = ECN_EXECUTED_DEMO_NO
  const qty = Number(parentQty) || 1
  wi.lastRescheduleEcnNo = ecnNo
  wi.lastRescheduleAt = '2026-11-04 15:20'
  wi._ecnTraceDemoV = 4

  const ensureMat = (row) => {
    const flat = []
    flattenMaterials(wi.materials, flat)
    let hit = flat.find((m) => m.code === row.code)
    if (!hit) {
      hit = createPlanMaterial({
        name: row.name,
        code: row.code,
        spec: row.spec || '',
        supplyType: row.supplyType || '自制件',
        unitUsage: row.unitUsage ?? 1,
        demandQty: (row.unitUsage ?? 1) * qty,
        planQty: (row.unitUsage ?? 1) * qty,
        joinPlan: row.joinPlan || '是',
        status: row.status || '待下达',
      })
      wi.materials.push(hit)
    }
    return hit
  }

  const mark = (code, patch) => {
    const flat = []
    flattenMaterials(wi.materials, flat)
    const hit = flat.find((m) => m.code === code)
    if (!hit) return
    Object.assign(hit, patch)
    if (patch.unitUsage != null) {
      hit.demandQty = Number(patch.unitUsage) * qty
      hit.planQty = Number(patch.unitUsage) * qty
    }
  }

  // 改用量
  mark('010050003', { unitUsage: 2, updatedByEcnNo: ecnNo, ecnTrace: 'qty', ecnByEcnNo: ecnNo })
  mark('010050001', { unitUsage: 2, updatedByEcnNo: ecnNo, ecnTrace: 'qty', ecnByEcnNo: ecnNo })

  // 换料：旧泵轴 → 新泵轴
  mark('010050005', {
    joinPlan: '否',
    status: '不转产',
    ecnTrace: 'swapped_out',
    ecnByEcnNo: ecnNo,
    updatedByEcnNo: ecnNo,
    remark: `${ecnNo} 换料·旧料`,
  })
  const newShaft = ensureMat({
    code: '010050015',
    name: '泵轴',
    spec: 'φ28×200mm',
    supplyType: '自制件',
    unitUsage: 1,
  })
  Object.assign(newShaft, {
    addedByEcnNo: ecnNo,
    ecnTrace: 'added',
    ecnByEcnNo: ecnNo,
    remark: `ECN ${ecnNo} 新增`,
    joinPlan: '是',
    status: '进行中',
  })

  // 替换含子树：旧密封及下级取消，新密封及下级新增
  ;['010050004', '010050004-A', '010050004-B'].forEach((code) => {
    mark(code, {
      joinPlan: '否',
      status: '不转产',
      ecnTrace: 'replaced',
      ecnByEcnNo: ecnNo,
      remark: `${ecnNo} 已替换`,
    })
  })
  ;[
    { code: '010050024', name: '耐腐机械密封总成', spec: '58U-30', supplyType: '自制件' },
    { code: '010050024-A', name: 'SIC动环', spec: '', supplyType: '自制件' },
    { code: '010050024-B', name: 'SIC静环', spec: '', supplyType: '外购件' },
    { code: '010050024-C', name: '波形弹簧', spec: '', supplyType: '外购件' },
  ].forEach((row) => {
    const m = ensureMat(row)
    Object.assign(m, {
      addedByEcnNo: ecnNo,
      ecnTrace: 'added',
      ecnByEcnNo: ecnNo,
      remark: `ECN ${ecnNo} 新增`,
      joinPlan: '是',
      status: '进行中',
    })
  })

  // 取消
  mark('010050002', {
    joinPlan: '否',
    status: '不转产',
    ecnTrace: 'cancelled',
    ecnByEcnNo: ecnNo,
    remark: `${ecnNo} 取消`,
  })
  mark('010050006', {
    joinPlan: '否',
    status: '不转产',
    ecnTrace: 'cancelled',
    ecnByEcnNo: ecnNo,
    remark: `${ecnNo} 取消`,
  })

  // 纯新增
  const sensor = ensureMat({
    code: '010050099',
    name: '温度传感器',
    spec: 'PT100',
    supplyType: '自制件',
    unitUsage: 1,
  })
  Object.assign(sensor, {
    addedByEcnNo: ecnNo,
    ecnTrace: 'added',
    ecnByEcnNo: ecnNo,
    remark: `ECN ${ecnNo} 新增`,
    joinPlan: '是',
    status: '进行中',
  })

  // 改用量后仍有在制/待下发单据，物料状态跟单据
  mark('010050003', { status: '进行中' })
  mark('010050001', { status: '进行中' })
}

const ECN_SKIP_SCHEDULE_DEMO_NO = 'ECN-DEMO-SKIP-SCHEDULE'
const ECN_SKIP_SCHEDULE_SO = '1-20261104-ECN-SKIP'

/**
 * 演示：ECN 已执行，新料处置为「暂不处理（稍后生产计划排）」——计划有 ECN 新增料，但未生成工单
 */
function ensureEcnSkipScheduleDemoPlan(plans = []) {
  let list = Array.isArray(plans) ? [...plans] : []
  const product =
    mockProducts.find(
      (p) => String(p.name || '').includes('立式管道泵') || p.code === 'CP2610001',
    ) || mockProducts[0]
  const so = ECN_SKIP_SCHEDULE_SO
  let plan = list.find(
    (p) => p.salesOrderNo === so || p.orderNo === so || p.id === 'plan-ecn-skip-schedule',
  )
  const qty = 1
  if (!plan) {
    plan = {
      id: 'plan-ecn-skip-schedule',
      orderNo: so,
      salesOrderNo: so,
      planSource: PLAN_SOURCE.SALES_ORDER,
      customerName: 'ECN稍后排产演示客户',
      salesperson: '张工',
      productQty: qty,
      orderStatus: '部分下达',
      urgency: '紧急',
      orderDate: dayjs().format('YYYY-MM-DD'),
      deliveryDate: dayjs().add(18, 'day').format('YYYY-MM-DD'),
      tags: ['部分下达'],
      planBatch: 1,
      deductInventory: true,
      remark: '演示：ECN 已执行，新料暂不处理，稍后在生产计划排产',
      workItems: [
        {
          id: 'plan-ecn-skip-schedule-wi',
          productId: product.id,
          productCode: product.code,
          productName: product.name,
          status: '进行中',
          planQty: qty,
          orderQty: qty,
          salesQty: qty,
          materials: [],
          planBatch: 1,
          expanded: true,
        },
      ],
    }
    list.unshift(plan)
  }

  const wi = plan.workItems?.[0]
  if (!wi) return list
  if (!Array.isArray(wi.materials)) wi.materials = []

  const seedMats = [
    { code: '010050001', name: '泵体（泵壳）', supplyType: '自制件', spec: 'ISG50-160' },
    { code: '010050003', name: '叶轮', supplyType: '自制件', spec: 'ISG50-160' },
    { code: '010050005', name: '泵轴', supplyType: '自制件', spec: 'φ25×180mm' },
    { code: '010050004', name: '机械密封组件', supplyType: '自制件', spec: 'φ25×180mm' },
  ]
  const flat0 = []
  flattenMaterials(wi.materials, flat0)
  const codes = new Set(flat0.map((m) => m.code))
  seedMats.forEach((row) => {
    if (codes.has(row.code)) return
    wi.materials.push(
      createPlanMaterial({
        name: row.name,
        code: row.code,
        spec: row.spec,
        supplyType: row.supplyType,
        unitUsage: 1,
        demandQty: qty,
        planQty: qty,
        joinPlan: '是',
        status: '待下达',
      }),
    )
  })

  if (wi._ecnSkipDemoV >= 1) return list
  wi._ecnSkipDemoV = 1
  wi.lastRescheduleEcnNo = ECN_SKIP_SCHEDULE_DEMO_NO
  wi.lastRescheduleAt = '2026-11-04 16:00'
  wi.status = '进行中'
  plan.orderStatus = '部分下达'
  plan.tags = Array.from(new Set([...(plan.tags || []), '部分下达']))

  const mark = (code, patch) => {
    const flat = []
    flattenMaterials(wi.materials, flat)
    const hit = flat.find((m) => m.code === code)
    if (hit) Object.assign(hit, patch)
  }
  const ensure = (row) => {
    const flat = []
    flattenMaterials(wi.materials, flat)
    let hit = flat.find((m) => m.code === row.code)
    if (!hit) {
      hit = createPlanMaterial({
        name: row.name,
        code: row.code,
        spec: row.spec || '',
        supplyType: row.supplyType || '自制件',
        unitUsage: row.unitUsage ?? 1,
        demandQty: qty,
        planQty: qty,
        joinPlan: '是',
        status: '待下达',
      })
      wi.materials.push(hit)
    }
    return hit
  }

  // 旧料取消/替换（划线），新料 ECN新增 且仍为待下达——未生成工单，稍后排
  mark('010050005', {
    joinPlan: '否',
    status: '不转产',
    ecnTrace: 'swapped_out',
    ecnByEcnNo: ECN_SKIP_SCHEDULE_DEMO_NO,
    remark: `${ECN_SKIP_SCHEDULE_DEMO_NO} 换料·旧料`,
  })
  Object.assign(
    ensure({ code: '010050015', name: '泵轴', spec: 'φ28×200mm', supplyType: '自制件' }),
    {
      addedByEcnNo: ECN_SKIP_SCHEDULE_DEMO_NO,
      ecnTrace: 'added',
      ecnByEcnNo: ECN_SKIP_SCHEDULE_DEMO_NO,
      remark: `ECN ${ECN_SKIP_SCHEDULE_DEMO_NO} 新增·暂不处理稍后排`,
      joinPlan: '是',
      status: '待下达',
    },
  )

  mark('010050004', {
    joinPlan: '否',
    status: '不转产',
    ecnTrace: 'replaced',
    ecnByEcnNo: ECN_SKIP_SCHEDULE_DEMO_NO,
    remark: `${ECN_SKIP_SCHEDULE_DEMO_NO} 已替换`,
  })
  Object.assign(
    ensure({ code: '010050024', name: '耐腐机械密封总成', spec: '58U-30', supplyType: '自制件' }),
    {
      addedByEcnNo: ECN_SKIP_SCHEDULE_DEMO_NO,
      ecnTrace: 'added',
      ecnByEcnNo: ECN_SKIP_SCHEDULE_DEMO_NO,
      remark: `ECN ${ECN_SKIP_SCHEDULE_DEMO_NO} 新增·暂不处理稍后排`,
      joinPlan: '是',
      status: '待下达',
    },
  )

  Object.assign(
    ensure({ code: '010050099', name: '温度传感器', spec: 'PT100', supplyType: '自制件' }),
    {
      addedByEcnNo: ECN_SKIP_SCHEDULE_DEMO_NO,
      ecnTrace: 'added',
      ecnByEcnNo: ECN_SKIP_SCHEDULE_DEMO_NO,
      remark: `ECN ${ECN_SKIP_SCHEDULE_DEMO_NO} 新增·暂不处理稍后排`,
      joinPlan: '是',
      status: '待下达',
    },
  )

  mark('010050003', {
    unitUsage: 2,
    demandQty: 2 * qty,
    planQty: 2 * qty,
    updatedByEcnNo: ECN_SKIP_SCHEDULE_DEMO_NO,
    ecnTrace: 'qty',
    ecnByEcnNo: ECN_SKIP_SCHEDULE_DEMO_NO,
    status: '待下达',
  })
  // 旧料已有下达（部分下达），对比新料仍待下达、无新工单
  mark('010050001', { status: '进行中', joinPlan: '是' })

  return list
}

function loadFromStorage() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) {
      const parsed = JSON.parse(raw)
      if (parsed.version === DATA_VERSION && Array.isArray(parsed.plans)) {
        return normalizePlanStatuses(parsed.plans)
      }
    }
  } catch {
    /* ignore */
  }
  return null
}

function persist() {
  localStorage.setItem(
    STORAGE_KEY,
    JSON.stringify({ version: DATA_VERSION, plans: productionPlanState.plans }),
  )
}

function loadInitialPlans() {
  const stored = loadFromStorage()
  if (stored) return stored
  const boms = buildPagedMockBoms(mockProducts, mockMaterials)
  const salesOrders = buildMockSalesOrders(mockProducts)
  return normalizePlanStatuses(buildInitialProductionPlans(boms, salesOrders))
}

export const productionPlanState = reactive({
  plans: loadInitialPlans(),
})

watch(
  () => productionPlanState.plans,
  () => persist(),
  { deep: true },
)

export function findPlanBySalesOrderNo(salesOrderNo) {
  return productionPlanState.plans.find((p) => p.salesOrderNo === salesOrderNo) || null
}

export function addProductionPlan(plan) {
  productionPlanState.plans.unshift(plan)
  return plan
}

export function updateProductionPlan(id, patch) {
  const idx = productionPlanState.plans.findIndex((p) => p.id === id)
  if (idx === -1) return null
  Object.assign(productionPlanState.plans[idx], patch)
  return productionPlanState.plans[idx]
}

function resolveDeliveryDate(lineItems, fallback) {
  const dates = (lineItems || []).map((l) => l.deliveryDate).filter(Boolean)
  if (!dates.length) return fallback || dayjs().format('YYYY-MM-DD')
  return dates.sort()[0]
}

function mapUrgencyToPlan(urgency) {
  const { normalizeUrgency } = require('@/constants/urgency')
  return normalizeUrgency(urgency)
}

/**
 * 自产销售订单审核通过后生成生产计划任务
 * @param {object} salesOrder
 * @param {{ lineItemsOverride?: object[], designingLineIds?: Set<string>, designTasksByLineId?: Map<string, object> }} [options]
 */
export function createProductionPlanFromSalesOrder(salesOrder, options = {}) {
  const lineItems = options.lineItemsOverride || salesOrder.lineItems || []
  const designingLineIds = options.designingLineIds || new Set()
  const designTasksByLineId = options.designTasksByLineId || new Map()

  const totalQty = lineItems.reduce((s, i) => s + (Number(i.planProduceQty ?? i.salesQty) || 0), 0)
  const deliveryDate = resolveDeliveryDate(lineItems, salesOrder.documentDate)
  const daysToDelivery = Math.max(0, dayjs(deliveryDate).diff(dayjs(), 'day'))

  const workItems = lineItems.map((line, index) => {
    const isDesigning = designingLineIds.has(line.id)
    const designTask = designTasksByLineId.get?.(line.id)
    const planQty = Math.max(0, Number(line.planProduceQty ?? line.salesQty) || 0)

    if (isDesigning) {
      return enrichWorkItem(
        {
          id: `wi-${line.id}`,
          salesLineId: line.id,
          designTaskId: designTask?.id || '',
          status: '设计中',
          expanded: index === 0,
          salesQty: planQty || Number(line.salesQty) || 1,
          productName: line.productName,
          productCode: line.productCode,
          productId: line.productId || '',
          productAttr: line.productAttr,
          productType: line.category || line.productAttr || '',
          model: line.specModel,
          spec: line.specAttr,
          techParams: line.techParams || '',
          deliveryDate: line.deliveryDate || deliveryDate,
          bomId: '',
          bomName: '',
          bomVersion: '',
          ebomSnapshot: { materials: [] },
          materials: [],
        },
        line,
        index,
      )
    }

    // 投产口径：仅 SKU 自有生效 BOM；禁止族模板解析 fallback
    const bom =
      (line.bomId ? getProductBomById(line.bomId) : null) ||
      getOwnActiveBomForItem('product', line.productId)

    const salesQty = planQty || Number(line.salesQty) || 1
    const snapshot =
      line.ebomSnapshot || (bom ? buildEbomSnapshotFromBom(bom, salesQty) : { materials: [] })

    return enrichWorkItem(
      {
        id: `wi-${line.id}`,
        salesLineId: line.id,
        status: '待下达',
        expanded: index === 0,
        salesQty,
        productName: line.productName,
        productCode: line.productCode,
        productId: line.productId,
        productAttr: line.productAttr,
        productType: line.category || line.productAttr || '',
        model: line.specModel,
        spec: line.specAttr,
        deliveryDate: line.deliveryDate || deliveryDate,
        bomId: line.bomId || bom?.id || '',
        bomName: line.bomName || bom?.bomName || '',
        bomVersion: line.bomVersion || bom?.version || '',
        ebomSnapshot: snapshot,
        materials: snapshot.materials || [],
      },
      line,
      index,
    )
  })

  const plan = {
    id: `pp-${Date.now()}`,
    planSource: PLAN_SOURCE.SALES_ORDER,
    salesOrderNo: salesOrder.orderNo,
    orderNo: salesOrder.orderNo,
    customerName: salesOrder.customerName,
    productQty: totalQty,
    salesperson: salesOrder.salesperson || '',
    urgency: mapUrgencyToPlan(salesOrder.urgency),
    orderStatus: '待下达',
    orderDate: salesOrder.documentDate || dayjs().format('YYYY-MM-DD'),
    deliveryDate,
    region: salesOrder.region || '',
    settlementType: salesOrder.settlementType || '',
    deliveryMethod: salesOrder.deliveryMethod || '',
    remark: salesOrder.remark || '',
    tags: ['待下达'],
    daysToDelivery,
    planAssemblyDate: '',
    planCompleteDate: deliveryDate,
    deductInventory: true,
    workItems,
  }

  addProductionPlan(plan)
  return plan
}

/** 按配件编码解析主数据与自有生效产品 BOM（非发运 BOM） */
function resolveShipAccessoryProduceBom(row = {}) {
  const code = String(row.materialCode || row.itemCode || '').trim()
  const products = productInfoState.products || []
  const materials = materialInfoState.materials || []
  const product =
    (row.masterProductId && products.find((p) => String(p.id) === String(row.masterProductId))) ||
    (code && products.find((p) => String(p.code || '').trim() === code)) ||
    null
  const material =
    (row.masterMaterialId &&
      materials.find((m) => String(m.id) === String(row.masterMaterialId))) ||
    (code && materials.find((m) => String(m.code || '').trim() === code)) ||
    null

  if (product) {
    const bom = getOwnActiveBomForItem('product', product.id)
    return {
      itemType: 'product',
      productId: product.id,
      productCode: product.code || code,
      productName: product.name || row.materialName || code,
      bom,
    }
  }
  if (material) {
    const bom = getOwnActiveBomForItem('material', material.id)
    return {
      itemType: 'material',
      productId: material.id,
      productCode: material.code || code,
      productName: material.name || row.materialName || code,
      bom,
    }
  }
  return {
    itemType: '',
    productId: '',
    productCode: code,
    productName: row.materialName || code,
    bom: null,
  }
}

/**
 * 随货配件自制/组装缺口 → 生产计划工作项
 * 有自有生效 BOM → 待下达 + EBOM 快照；无 BOM → 待 BOM + 补 BOM 轻类型设计任务
 * @returns {{ plan, workItems, created, appended, designTasks }}
 */
export function appendOrCreateProductionPlanForShipAccessories(salesOrder, accessoryRows = []) {
  const rows = (accessoryRows || []).filter((r) => (Number(r.planQty) || Number(r.qty) || 0) > 0)
  if (!rows.length || !salesOrder?.orderNo) {
    return { plan: null, workItems: [], created: false, appended: false, designTasks: [] }
  }

  const deliveryDate = resolveDeliveryDate(salesOrder.lineItems, salesOrder.documentDate)
  const designTasks = []
  const newWorkItems = rows.map((row, index) => {
    const planQty = Math.max(0, Number(row.planQty ?? row.qty) || 0)
    const supplyForm = String(row.supplyForm || '自制件')
    const topLevelSupplyType = /组装/.test(supplyForm) ? '组装' : '自制件'
    const stockQty = Math.max(0, Number(row.availableStock) || 0)
    const master = resolveShipAccessoryProduceBom(row)
    const bom = master.bom
    let status = '待下达'
    let designTaskId = ''
    let snapshot = { materials: [] }
    let bomId = ''
    let bomName = ''
    let bomVersion = ''

    if (bom) {
      snapshot = buildEbomSnapshotFromBom(bom, planQty)
      bomId = bom.id || ''
      bomName = bom.bomName || ''
      bomVersion = bom.version || ''
    } else {
      status = '待BOM'
      // 运行时再取，避免 productionPlanStore ↔ designTaskStore 循环依赖
      // eslint-disable-next-line global-require
      const { createBomOnlyDesignTaskFromShipAccessory } = require('@/store/designTaskStore')
      const task = createBomOnlyDesignTaskFromShipAccessory(salesOrder, row, {
        productId: master.productId,
        productCode: master.productCode,
        productName: master.productName,
        itemType: master.itemType,
      })
      designTaskId = task?.id || ''
      if (task) designTasks.push(task)
    }

    return enrichWorkItem(
      {
        id: `wi-acc-${row.id || row.materialCode || index}-${Date.now()}-${index}`,
        salesLineId: row.salesLineId || '',
        shipAccessoryLineId: row.id || '',
        fromShipAccessory: true,
        designTaskId,
        status,
        expanded: index === 0,
        salesQty: planQty,
        orderQty: planQty,
        planQty,
        stockQty,
        productName: master.productName || row.materialName || row.materialCode || '',
        productCode: master.productCode || row.materialCode || row.itemCode || '',
        productId: master.productId || '',
        productAttr: '随货配件',
        productType: '随货配件',
        model: row.specModel || '',
        spec: row.specModel || '',
        unit: row.unit || '件',
        deliveryDate: row.deliveryDate || deliveryDate,
        topLevelSupplyType,
        bomId,
        bomName,
        bomVersion,
        ebomSnapshot: snapshot,
        materials: snapshot.materials || [],
        matchingRequirements: bom
          ? `随货配件缺口转生产（供应型态：${supplyForm}）`
          : `随货配件待BOM，请完成补BOM设计任务（供应型态：${supplyForm}）`,
        remark: bom
          ? `随货配件缺口转生产（供应型态：${supplyForm}）`
          : `随货配件待BOM（供应型态：${supplyForm}）`,
      },
      null,
      index,
      true,
    )
  })

  const existing = findPlanBySalesOrderNo(salesOrder.orderNo)
  if (existing) {
    const known = new Set(
      (existing.workItems || []).map((w) => String(w.shipAccessoryLineId || '')).filter(Boolean),
    )
    const toAdd = newWorkItems.filter((w) => {
      const key = String(w.shipAccessoryLineId || '')
      return !key || !known.has(key)
    })
    if (!toAdd.length) {
      return { plan: existing, workItems: [], created: false, appended: false, designTasks: [] }
    }
    existing.workItems = [...(existing.workItems || []), ...toAdd]
    const addQty = toAdd.reduce((s, w) => s + (Number(w.planQty) || 0), 0)
    existing.productQty = (Number(existing.productQty) || 0) + addQty
    if (!String(existing.remark || '').includes('随货配件')) {
      existing.remark = existing.remark
        ? `${existing.remark}；含随货配件自制/组装`
        : '含随货配件自制/组装'
    }
    if (!Array.isArray(existing.tags)) existing.tags = []
    if (toAdd.some((w) => w.status === '待BOM') && !existing.tags.includes('待BOM')) {
      existing.tags.push('待BOM')
    }
    if (toAdd.some((w) => w.status === '待下达') && !existing.tags.includes('待下达')) {
      existing.tags.push('待下达')
    }
    designTasks.forEach((t) => {
      t.productionPlanId = existing.id
    })
    return { plan: existing, workItems: toAdd, created: false, appended: true, designTasks }
  }

  const totalQty = newWorkItems.reduce((s, w) => s + (Number(w.planQty) || 0), 0)
  const daysToDelivery = Math.max(0, dayjs(deliveryDate).diff(dayjs(), 'day'))
  const hasPendingBom = newWorkItems.some((w) => w.status === '待BOM')
  const plan = {
    id: `pp-${Date.now()}`,
    planSource: PLAN_SOURCE.SALES_ORDER,
    salesOrderNo: salesOrder.orderNo,
    orderNo: salesOrder.orderNo,
    customerName: salesOrder.customerName,
    productQty: totalQty,
    salesperson: salesOrder.salesperson || '',
    urgency: mapUrgencyToPlan(salesOrder.urgency),
    orderStatus: hasPendingBom ? '待BOM' : '待下达',
    orderDate: salesOrder.documentDate || dayjs().format('YYYY-MM-DD'),
    deliveryDate,
    region: salesOrder.region || '',
    settlementType: salesOrder.settlementType || '',
    deliveryMethod: salesOrder.deliveryMethod || '',
    remark: `由销售订单 ${salesOrder.orderNo} 随货配件自制/组装缺口生成`,
    tags: hasPendingBom ? ['待BOM'] : ['待下达'],
    daysToDelivery,
    planAssemblyDate: '',
    planCompleteDate: deliveryDate,
    deductInventory: true,
    workItems: newWorkItems,
  }
  addProductionPlan(plan)
  designTasks.forEach((t) => {
    t.productionPlanId = plan.id
  })
  return { plan, workItems: newWorkItems, created: true, appended: false, designTasks }
}

let replenishPlanSeq = 1

function nextReplenishPlanNo() {
  const no = `BH${dayjs().format('YYYYMMDD')}${String(replenishPlanSeq).padStart(4, '0')}`
  replenishPlanSeq += 1
  return no
}

/**
 * 由库存补货建议生成生产计划（无销售单号）
 * @param {Array<object>} suggestionRows listStockReplenishSuggestions 行，可含 planQty 覆盖
 * @param {{ operator?: string }} [options]
 */
export function createProductionPlanFromStockReplenish(suggestionRows = [], options = {}) {
  const rows = (suggestionRows || []).filter(
    (r) => (Number(r.planQty) || Number(r.suggestQty) || 0) > 0,
  )
  if (!rows.length) return null

  const operator = String(options.operator || '').trim() || 'admin1'
  const deliveryDate = dayjs().add(7, 'day').format('YYYY-MM-DD')
  const orderNo = nextReplenishPlanNo()
  const totalQty = rows.reduce((s, r) => s + (Number(r.planQty) || Number(r.suggestQty) || 0), 0)

  const workItems = rows.map((row, index) => {
    const planQty = Number(row.planQty) || Number(row.suggestQty) || 0
    const bom =
      (row.bomId ? getProductBomById(row.bomId) : null) ||
      getOwnActiveBomForItem('product', row.productId)
    const snapshot = bom ? buildEbomSnapshotFromBom(bom, planQty) : { materials: [] }

    return enrichWorkItem(
      {
        id: `wi-bh-${row.productId}-${Date.now()}-${index}`,
        salesLineId: '',
        status: '待下达',
        expanded: index === 0,
        salesQty: planQty,
        orderQty: planQty,
        stockQty: Number(row.availableStock) || 0,
        planQty,
        productName: row.productName,
        productCode: row.productCode,
        productId: row.productId,
        productAttr: '标准产品',
        productType: '标准产品',
        model: row.specModel,
        spec: row.specModel,
        deliveryDate,
        bomId: row.bomId || bom?.id || '',
        bomName: row.bomName || bom?.bomName || '',
        bomVersion: row.bomVersion || bom?.version || '',
        ebomSnapshot: snapshot,
        materials: snapshot.materials || [],
        unit: row.unit || '件',
      },
      null,
      index,
    )
  })

  const plan = {
    id: `pp-bh-${Date.now()}`,
    planSource: PLAN_SOURCE.STOCK_REPLENISH,
    salesOrderNo: '',
    orderNo,
    customerName: '库存补货',
    productQty: totalQty,
    salesperson: '',
    operator,
    creator: operator,
    urgency: '正常',
    orderStatus: '待下达',
    orderDate: dayjs().format('YYYY-MM-DD'),
    deliveryDate,
    region: '',
    settlementType: '',
    deliveryMethod: '',
    remark: '按库存MTS · 库存补货',
    tags: ['待下达', '库存补货'],
    daysToDelivery: Math.max(0, dayjs(deliveryDate).diff(dayjs(), 'day')),
    planAssemblyDate: '',
    planCompleteDate: deliveryDate,
    deductInventory: true,
    workItems,
  }

  addProductionPlan(plan)
  return plan
}

function cloneWorkItem(wi) {
  return JSON.parse(JSON.stringify(wi))
}

/** 同步生产计划工作项交付方式（支持拆行） */
export function syncProductionPlanDeliveryMode(salesOrderNo, planOps) {
  const plan = findPlanBySalesOrderNo(salesOrderNo)
  if (!plan?.workItems?.length || !planOps?.length) return

  planOps.forEach((op) => {
    if (op.type === 'update') {
      const wi = plan.workItems.find((w) => w.salesLineId === op.lineId)
      if (!wi) return
      wi.deliveryMode = op.deliveryMode
      wi.salesQty = op.qty
      wi.orderQty = op.qty
      enrichWorkItem(wi)
      return
    }

    if (op.type === 'create') {
      const sourceWi = plan.workItems.find((w) => w.salesLineId === op.sourceLineId)
      const newWi = sourceWi
        ? cloneWorkItem(sourceWi)
        : enrichWorkItem(
            {
              id: `wi-${op.lineId}`,
              salesLineId: op.lineId,
              status: '待下达',
              productName: op.line?.productName,
              productCode: op.line?.productCode,
              model: op.line?.specModel,
              materials: op.line?.ebomSnapshot?.materials || [],
              ebomSnapshot: op.line?.ebomSnapshot,
            },
            op.line,
          )
      newWi.id = `wi-${op.lineId}`
      newWi.salesLineId = op.lineId
      newWi.deliveryMode = op.deliveryMode
      newWi.salesQty = op.qty
      newWi.orderQty = op.qty
      newWi.shippedQty = 0
      enrichWorkItem(newWi, op.line)
      plan.workItems.push(newWi)
    }
  })
}

export function filterProductionPlans(list, filters) {
  return list.filter((order) => {
    if (filters.orderNo && !(order.orderNo || '').includes(filters.orderNo)) return false
    if (filters.customerName && !(order.customerName || '').includes(filters.customerName))
      return false
    if (filters.urgency && order.urgency !== filters.urgency) return false
    if (filters.orderStatus && order.orderStatus !== filters.orderStatus) return false
    if (filters.planSource) {
      const source = order.planSource || (order.salesOrderNo ? 'sales-order' : 'manual')
      if (source !== filters.planSource) return false
    }
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

/** 终止生产计划；关联的未完成设计任务由调用方作废 */
export function terminateProductionPlan(id) {
  const plan = productionPlanState.orders.find((o) => o.id === id)
  if (!plan) return { ok: false, message: '生产计划不存在' }
  if (plan.orderStatus === '已终止') return { ok: false, message: '生产计划已终止' }
  plan.orderStatus = '已终止'
  plan.terminatedAt = dayjs().format('YYYY-MM-DD HH:mm')
  ;(plan.workItems || []).forEach((wi) => {
    if (wi.status !== '已完成') wi.status = '已终止'
  })
  return { ok: true, plan, message: `生产计划「${plan.orderNo || ''}」已终止` }
}
