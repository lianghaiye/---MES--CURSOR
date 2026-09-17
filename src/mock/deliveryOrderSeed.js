import dayjs from 'dayjs'
import { mapApplicationToDeliveryOrder } from '@/utils/deliveryOrder'
import { createShipAttachmentLine } from '@/utils/shipBomAttachments'

/** 演示数据：按不含税金额推 13% 含税（与常见销项税率一致） */
function withInTaxAmount(line) {
  const ex = Number(line.deliveryAmountExTax) || 0
  if (!ex || line.deliveryAmountInTax != null) return line
  return {
    ...line,
    deliveryAmountInTax: Math.round(ex * 1.13 * 100) / 100,
  }
}

function demoPumpKitAttachments({ qty = 1, selectedSpare = false } = {}) {
  const product = {
    productId: 'prod-00001',
    productCode: 'CP2610001',
    productName: '清水离心泵 ISG50-160',
  }
  const defs = [
    {
      materialCode: 'DOC-MANUAL',
      materialName: '产品说明书',
      specModel: '中文版',
      unit: '册',
      unitQty: 1,
      selected: true,
    },
    {
      materialCode: 'DOC-CERT',
      materialName: '合格证',
      specModel: 'A4',
      unit: '份',
      unitQty: 1,
      selected: true,
    },
    {
      materialCode: 'TOOL-WRENCH',
      materialName: '专用扳手组',
      specModel: 'M8-M24',
      unit: '套',
      unitQty: 1,
      selected: true,
    },
    {
      materialCode: 'SPARE-ORING',
      materialName: 'O型密封圈',
      specModel: 'NBR-50',
      unit: '个',
      unitQty: 4,
      selected: selectedSpare,
    },
  ]
  return defs.map((d) =>
    createShipAttachmentLine({
      ...d,
      ...product,
      source: 'BOM',
      sourceBomId: 'bom-ship-shared-demo',
      sourceBomNo: 'BOM-SHIP-STD',
      kitSets: qty,
      shipQty: d.unitQty * qty,
      planQty: d.unitQty * qty,
    }),
  )
}

/** 散件 EBOM 勾选物料行（详情「散件发运」表用） */
function demoMaterialPick(partial = {}) {
  const demandQty = Number(partial.demandQty) || 0
  const shipQty =
    partial.shipQty != null ? Number(partial.shipQty) : partial.selected === false ? 0 : demandQty
  return {
    materialId: partial.materialId || `mat-${partial.code || 'x'}`,
    parentMaterialId: partial.parentMaterialId || null,
    name: partial.name || '',
    code: partial.code || '',
    spec: partial.spec || '',
    unit: partial.unit || '件',
    supplyType: partial.supplyType || '外购',
    materialType: partial.materialType || '物料',
    unitDemandQty: Number(partial.unitDemandQty) || demandQty,
    demandQty,
    orderDemandQty: Number(partial.orderDemandQty) || demandQty,
    availableStock: Number(partial.availableStock) || 0,
    gapQty: Math.max(0, demandQty - (Number(partial.availableStock) || 0)),
    depth: partial.depth || 0,
    hasChildren: false,
    canExpand: false,
    selectable: true,
    selected: partial.selected !== false,
    shipQty,
    shippedQty: Number(partial.shippedQty) || 0,
    appliedQty: Number(partial.appliedQty) || 0,
  }
}

/**
 * 散件发运头（按销售行 1 套展开 EBOM 勾选）
 * @param {object} opts
 */
function demoScatterShipment({
  id,
  salesLineId,
  productName,
  productCode,
  specModel = '',
  material = '',
  drawingNo = '',
  unit = '台',
  orderQty = 1,
  shipSets = 1,
  unitPriceExTax = 0,
  unitPriceInTax = 0,
  deliveryAmountExTax = 0,
  shipWarehouse = '成品仓',
  packagingForm = '纸箱',
  itemWeightKg = 0,
  materialPicks = [],
} = {}) {
  const picks = materialPicks.map((p) =>
    demoMaterialPick({
      ...p,
      demandQty: (Number(p.unitDemandQty) || Number(p.demandQty) || 1) * shipSets,
      unitDemandQty: Number(p.unitDemandQty) || Number(p.demandQty) || 1,
      orderDemandQty:
        (Number(p.unitDemandQty) || Number(p.demandQty) || 1) * (Number(orderQty) || 1),
    }),
  )
  const amountEx =
    deliveryAmountExTax ||
    Math.round((Number(unitPriceExTax) || 0) * (Number(shipSets) || 0) * 100) / 100
  const priceIn = unitPriceInTax || Math.round((Number(unitPriceExTax) || 0) * 1.13 * 10000) / 10000
  return {
    id,
    salesLineId: salesLineId || id,
    productName,
    productCode,
    specModel,
    material,
    drawingNo,
    unit,
    orderQty,
    shipSets,
    maxShipSets: shipSets,
    deliveryMode: '散件',
    shipQty: shipSets,
    shipWarehouse,
    packagingForm,
    itemWeightKg,
    shipWeight: Math.round((Number(itemWeightKg) || 0) * (Number(shipSets) || 0) * 100) / 100,
    unitPriceExTax,
    unitPriceInTax: priceIn,
    deliveryUnitPriceExTax: unitPriceExTax,
    deliveryUnitPriceInTax: priceIn,
    deliveryAmountExTax: amountEx,
    deliveryAmountInTax: Math.round(amountEx * 1.13 * 100) / 100,
    materialPicks: picks,
    lineShipStatus: picks.some((p) => p.selected && Number(p.shipQty) > 0) ? '部分发货' : '未发货',
    remark: '',
  }
}

function app(partial, salesOrder) {
  return mapApplicationToDeliveryOrder(
    {
      id: partial.id,
      deliveryCode: partial.deliveryCode,
      createdAt: partial.createdAt || dayjs().format('YYYY-MM-DD HH:mm'),
      creator: partial.creator || salesOrder?.salesperson || 'admin1',
      operator: partial.operator || partial.creator || salesOrder?.salesperson || 'admin1',
      operatedAt: partial.operatedAt || partial.createdAt || dayjs().format('YYYY-MM-DD HH:mm'),
      deliveryDate: partial.deliveryDate,
      status: partial.deliveryStatus || partial.status || '待发货',
      shipmentMethod: partial.shipmentMethod || '送货',
      logisticsNo: partial.logisticsNo || '',
      contactPerson: partial.contactPerson || salesOrder?.contactPerson || '',
      contactPhone: partial.contactPhone || salesOrder?.contactPhone || '',
      deliveryAddress: partial.deliveryAddress || '',
      driverName: partial.driverName || '',
      driverPhone: partial.driverPhone || '',
      plateNo: partial.plateNo || '',
      applyOutbound: partial.applyOutbound !== false,
      outboundWarehouse: partial.outboundWarehouse || '成品仓',
      remark: partial.remark || '',
      lineItems: (partial.lineItems || []).map(withInTaxAmount),
      scatterShipments: partial.scatterShipments || [],
      shipWeight: partial.shipWeight,
      shipAttachments: partial.shipAttachments || [],
    },
    salesOrder,
  )
}

/**
 * 发货管理演示数据（覆盖：
 * - 未生成出库单 → 列表「待发货」，可点「生成出库单」
 * - 已生成待出库出库单 → 「待出库」
 * - 关联出库单已出库 → 「已发货」
 * - 发运方式：送货 / 自提 / 物流
 * - 发货形态：纯整机 / 纯散件 / 整机+散件混合
 */
export function buildDeliveryOrderSeed() {
  const soPump = {
    id: 'so-seed-1',
    orderNo: '1-20260512-005',
    customerName: '测试人员',
    salesperson: 'admin1',
    contactPerson: 'TEST',
    contactPhone: '16522033362',
  }
  const soSpare = {
    id: 'so-2',
    orderNo: '1-20260529-002',
    customerName: '测试人员',
    salesperson: 'admin1',
  }
  const soMold = {
    id: 'so-seed-mold',
    orderNo: '1-20260518-003',
    customerName: '深圳精密模具科技',
    salesperson: '李四',
    contactPerson: '王工',
    contactPhone: '13900001111',
  }
  const soParts = {
    id: 'so-seed-parts',
    orderNo: '1-20260528-001',
    customerName: '人纷纷',
    salesperson: 'admin1',
  }
  const soValve = {
    id: 'so-seed-valve',
    orderNo: '1-20260810-001',
    customerName: '华东流体设备',
    salesperson: '王五',
    contactPerson: '赵经理',
    contactPhone: '13700002222',
  }
  const soBiz = {
    id: 'so-biz-seed-1',
    orderNo: '1-20260916-001',
    customerName: '江南泵业',
    salesperson: 'admin1',
    contactPerson: '周工',
    contactPhone: '13611112222',
  }
  const soScatter = {
    id: 'so-seed-scatter',
    orderNo: '1-20260910-021',
    customerName: '齐鲁化工装备',
    salesperson: '赵六',
    contactPerson: '孙工',
    contactPhone: '13988886666',
  }
  const soMixed = {
    id: 'so-seed-1',
    orderNo: '1-20260512-005',
    customerName: '测试人员',
    salesperson: 'admin1',
    contactPerson: 'TEST',
    contactPhone: '16522033362',
  }

  const chemicalPumpScatterPicks = [
    {
      materialId: 'mat-pump-casing',
      name: '泵体',
      code: 'MAT-CASING-316L',
      spec: '316L φ50',
      unit: '件',
      unitDemandQty: 1,
      availableStock: 20,
    },
    {
      materialId: 'mat-pump-impeller',
      name: '叶轮',
      code: 'MAT-IMP-316L',
      spec: '316L',
      unit: '件',
      unitDemandQty: 1,
      availableStock: 15,
    },
    {
      materialId: 'mat-pump-seal',
      name: '机械密封组件',
      code: 'MAT-SEAL-KIT',
      spec: 'φ25',
      unit: '套',
      unitDemandQty: 1,
      availableStock: 8,
    },
    {
      materialId: 'mat-pump-manual',
      name: '安装说明书',
      code: 'DOC-INSTALL',
      spec: '中文',
      unit: '册',
      unitDemandQty: 1,
      availableStock: 100,
    },
  ]

  return [
    // —— 已生成出库单（待出库）· 送货 ——
    app(
      {
        id: 'do-seed-1',
        deliveryCode: 'SH20260513001',
        createdAt: '2026-05-13 14:30',
        deliveryDate: '2026-05-20',
        shipmentMethod: '送货',
        remark: '演示：已生成销售出库单（待出库）',
        deliveryAddress: '上海市浦东新区示范路 88 号',
        lineItems: [
          {
            id: 'dl-1',
            salesLineId: 'line-seed-1a',
            productName: '清水离心泵 ISG50-160',
            productCode: 'CP2610001',
            specModel: 'ISG50-160',
            unit: '台',
            shipQty: 3,
            orderQty: 3,
            deliveryAmountExTax: 86.31,
            itemWeightKg: 12.5,
            deliveryUnitPriceExTax: 28.77,
            packagingForm: '纸箱',
            deliveryMode: '整机',
          },
        ],
        shipAttachments: demoPumpKitAttachments({ qty: 3, selectedSpare: false }),
        shipWeight: 37.5,
      },
      soPump,
    ),

    // —— 已生成出库单（待出库）· 自提 ——
    app(
      {
        id: 'do-seed-2',
        deliveryCode: 'SH20260529111',
        createdAt: '2026-05-29 10:00',
        deliveryDate: '2026-05-29',
        shipmentMethod: '自提',
        remark: '演示：自提，已生成出库单（待出库）',
        contactPerson: '李自提',
        contactPhone: '13811112222',
        lineItems: [
          {
            id: 'dl-2',
            salesLineId: 'line-seed-2a',
            productName: '测试产品00002',
            productCode: 'SPARE-50*30-001',
            specModel: '50*30',
            unit: '件',
            shipQty: 2,
            orderQty: 10,
            deliveryAmountExTax: 24.66,
            itemWeightKg: 0.8,
          },
        ],
        shipWeight: 1.6,
      },
      soSpare,
    ),

    // —— 已生成出库单且已出库 → 已发货 · 送货 ——
    app(
      {
        id: 'do-seed-shipped-1',
        deliveryCode: 'SH20260801001',
        createdAt: '2026-08-01 09:20',
        deliveryDate: '2026-08-02',
        shipmentMethod: '送货',
        driverName: '周师傅',
        driverPhone: '13600003333',
        plateNo: '沪C88888',
        deliveryAddress: '苏州市工业园区星湖街 328 号',
        remark: '演示：关联出库单已出库，发货状态=已发货',
        lineItems: [
          {
            id: 'dl-ship-1',
            salesLineId: 'line-seed-valve-1',
            productName: '闸阀 DN50',
            productCode: 'VLV-GATE-50',
            specModel: 'DN50 PN16',
            unit: '台',
            shipQty: 5,
            orderQty: 5,
            deliveryAmountExTax: 2500,
            itemWeightKg: 8,
            packagingForm: '木箱',
          },
        ],
        shipWeight: 40,
      },
      soValve,
    ),

    // —— 未生成出库单 · 送货（待发货，可生成出库单）——
    app(
      {
        id: 'do-seed-3',
        deliveryCode: 'SH20260528002',
        createdAt: '2026-05-28 16:20',
        deliveryDate: '2026-05-28',
        shipmentMethod: '送货',
        remark: '演示：尚未生成出库单（待发货）',
        deliveryAddress: '杭州市余杭区文一西路 1000 号',
        lineItems: [
          {
            id: 'dl-3',
            productName: '离心泵配件包',
            productCode: 'CP-PART-KIT-01',
            specModel: '通用',
            unit: '套',
            shipQty: 46,
            orderQty: 50,
            deliveryAmountExTax: 1200,
            itemWeightKg: 2.3,
          },
        ],
        shipWeight: 105.8,
      },
      soParts,
    ),

    // —— 未生成出库单 · 物流 ——
    app(
      {
        id: 'do-seed-4',
        deliveryCode: 'SH20260603001',
        createdAt: '2026-06-03 09:15',
        deliveryDate: '2026-06-05',
        shipmentMethod: '物流',
        logisticsNo: 'SF1234567890',
        driverName: '张师傅',
        driverPhone: '13800138000',
        plateNo: '沪A12345',
        remark: '演示：物流发运，尚未生成出库单',
        deliveryAddress: '深圳市南山区科技园南路',
        lineItems: [
          {
            id: 'dl-4',
            productName: '清水离心泵 ISG50-160',
            productCode: 'CP2610001',
            specModel: 'ISG50-160',
            unit: '台',
            shipQty: 3,
            orderQty: 8,
            deliveryAmountExTax: 300,
            itemWeightKg: 15,
            packagingForm: '纸箱',
          },
        ],
        shipWeight: 45,
      },
      soMold,
    ),

    // —— 未生成出库单 · 自提 ——
    app(
      {
        id: 'do-seed-no-ob-pickup',
        deliveryCode: 'SH20260815002',
        createdAt: '2026-08-15 11:05',
        deliveryDate: '2026-08-16',
        shipmentMethod: '自提',
        contactPerson: '陈自提',
        contactPhone: '13566667777',
        remark: '演示：自提，尚未生成出库单（待发货）',
        lineItems: [
          {
            id: 'dl-pickup-1',
            productName: '机械密封件',
            productCode: 'SEAL-MECH-25',
            specModel: 'φ25',
            unit: '套',
            shipQty: 12,
            orderQty: 20,
            deliveryAmountExTax: 960,
            itemWeightKg: 0.5,
          },
          {
            id: 'dl-pickup-2',
            productName: '联轴器',
            productCode: 'CPL-45',
            specModel: '45#',
            unit: '件',
            shipQty: 4,
            orderQty: 4,
            deliveryAmountExTax: 480,
            itemWeightKg: 3.2,
          },
        ],
        shipWeight: 18.8,
      },
      soMold,
    ),

    // —— 未生成出库单 · 送货（多行）——
    app(
      {
        id: 'do-seed-no-ob-multi',
        deliveryCode: 'SH20260818003',
        createdAt: '2026-08-18 15:40',
        deliveryDate: '2026-08-20',
        shipmentMethod: '送货',
        deliveryAddress: '南京市江宁区将军大道 18 号',
        driverName: '刘师傅',
        driverPhone: '13400004444',
        plateNo: '苏A66666',
        remark: '演示：多产品行，尚未生成出库单',
        lineItems: [
          {
            id: 'dl-multi-1',
            productName: '多级泵 D、DG',
            productCode: 'PUMP-MULTI-80',
            specModel: '80-50',
            unit: '台',
            shipQty: 1,
            orderQty: 2,
            deliveryAmountExTax: 8800,
            itemWeightKg: 120,
            packagingForm: '托盘',
          },
          {
            id: 'dl-multi-2',
            productName: '底座组件',
            productCode: 'BASE-ASM-01',
            specModel: '标准',
            unit: '套',
            shipQty: 1,
            orderQty: 2,
            deliveryAmountExTax: 1200,
            itemWeightKg: 45,
          },
        ],
        shipWeight: 165,
      },
      soValve,
    ),

    // —— 纯整机 · 待发货（多台整机）——
    app(
      {
        id: 'do-seed-whole-only',
        deliveryCode: 'SH20260912001',
        createdAt: '2026-09-12 10:20',
        deliveryDate: '2026-09-15',
        shipmentMethod: '送货',
        deliveryAddress: '青岛市黄岛区黄河西路 66 号',
        driverName: '马师傅',
        driverPhone: '13300005555',
        plateNo: '鲁B12345',
        remark: '演示：纯整机发货（待发货，可生成出库单）',
        lineItems: [
          {
            id: 'dl-whole-1',
            salesLineId: 'line-seed-2a',
            productName: '清水离心泵 ISG80-160',
            productCode: 'CP2610080',
            specModel: 'ISG80-160',
            unit: '台',
            shipQty: 2,
            orderQty: 8,
            deliveryAmountExTax: 17600,
            itemWeightKg: 48,
            packagingForm: '木箱',
            deliveryMode: '整机',
          },
          {
            id: 'dl-whole-2',
            salesLineId: 'line-seed-2b',
            productName: '管道泵 ISG65-125',
            productCode: 'CP2610065',
            specModel: 'ISG65-125',
            unit: '台',
            shipQty: 1,
            orderQty: 4,
            deliveryAmountExTax: 6200,
            itemWeightKg: 32,
            packagingForm: '纸箱',
            deliveryMode: '整机',
          },
        ],
        shipAttachments: demoPumpKitAttachments({ qty: 2, selectedSpare: true }),
        shipWeight: 128,
      },
      soPump,
    ),

    // —— 纯散件 · 待发货 ——
    app(
      {
        id: 'do-seed-scatter-only',
        deliveryCode: 'SH20260910021',
        createdAt: '2026-09-10 14:05',
        deliveryDate: '2026-09-12',
        shipmentMethod: '物流',
        logisticsNo: 'YT9876543210',
        deliveryAddress: '淄博市张店区工业南路 128 号',
        remark: '演示：纯散件发货（按 EBOM 勾选物料）',
        lineItems: [],
        scatterShipments: [
          demoScatterShipment({
            id: 'sc-seed-1',
            salesLineId: 'line-seed-scatter-1',
            productName: '耐腐蚀化工泵',
            productCode: 'CP-CHEM-316L',
            specModel: 'IH50-32-160',
            material: '316L',
            drawingNo: 'DWG-CHEM-50',
            orderQty: 2,
            shipSets: 1,
            unitPriceExTax: 4800,
            itemWeightKg: 86,
            deliveryAmountExTax: 4800,
            materialPicks: chemicalPumpScatterPicks,
          }),
        ],
        shipWeight: 86,
      },
      soScatter,
    ),

    // —— 整机 + 散件混合 · 待出库（对齐业务出库单 ob-biz-so-pending-1）——
    app(
      {
        id: 'do-biz-seed-1',
        deliveryCode: 'SH20260916001',
        createdAt: '2026-09-16 15:30',
        deliveryDate: '2026-09-18',
        shipmentMethod: '送货',
        deliveryAddress: '无锡市新吴区硕放工业园',
        driverName: '钱师傅',
        driverPhone: '13200006666',
        plateNo: '苏B88888',
        remark: '演示：整机+散件混合；已生成销售出库单（待出库）',
        lineItems: [
          {
            id: 'dl-biz-whole-1',
            salesLineId: 'line-biz-whole-1',
            productName: '清水离心泵',
            productCode: 'CP2610001',
            specModel: 'ISG50-160',
            unit: '台',
            shipQty: 2,
            orderQty: 3,
            deliveryAmountExTax: 9600,
            itemWeightKg: 48,
            packagingForm: '木箱',
            deliveryMode: '整机',
          },
        ],
        scatterShipments: [
          demoScatterShipment({
            id: 'sc-biz-1',
            salesLineId: 'line-seed-1b',
            productName: '耐腐蚀化工泵',
            productCode: 'CP-CHEM-316L',
            specModel: 'IH50-32-160',
            material: '316L',
            drawingNo: 'DWG-CHEM-50',
            orderQty: 2,
            shipSets: 1,
            unitPriceExTax: 5200,
            itemWeightKg: 72,
            deliveryAmountExTax: 5200,
            materialPicks: [
              ...chemicalPumpScatterPicks.slice(0, 3),
              {
                materialId: 'mat-pump-bolt',
                name: '地脚螺栓组',
                code: 'FAST-ANCHOR-M16',
                spec: 'M16×200',
                unit: '套',
                unitDemandQty: 4,
                availableStock: 40,
              },
            ],
          }),
        ],
        shipAttachments: demoPumpKitAttachments({ qty: 2, selectedSpare: false }),
        shipWeight: 120,
      },
      soBiz,
    ),

    // —— 整机 + 散件混合 · 待发货（关联 so-seed-1）——
    app(
      {
        id: 'do-seed-mixed-pending',
        deliveryCode: 'SH20260914008',
        createdAt: '2026-09-14 09:40',
        deliveryDate: '2026-09-16',
        shipmentMethod: '送货',
        deliveryAddress: '上海市浦东新区示范路 88 号',
        remark: '演示：同单整机+散件；尚未生成出库单',
        lineItems: [
          {
            id: 'dl-mixed-whole-1',
            salesLineId: 'line-seed-1a',
            productName: '清水离心泵 ISG50-160',
            productCode: 'CP2610001',
            specModel: 'ISG50-160',
            unit: '台',
            shipQty: 1,
            orderQty: 3,
            deliveryAmountExTax: 3200,
            itemWeightKg: 12.5,
            packagingForm: '纸箱',
            deliveryMode: '整机',
          },
          {
            id: 'dl-mixed-whole-2',
            salesLineId: 'line-seed-1c',
            productName: '管道泵 ISG40-125',
            productCode: 'CP2610040',
            specModel: 'ISG40-125',
            unit: '台',
            shipQty: 1,
            orderQty: 1,
            deliveryAmountExTax: 2800,
            itemWeightKg: 18,
            packagingForm: '纸箱',
            deliveryMode: '整机',
          },
        ],
        scatterShipments: [
          demoScatterShipment({
            id: 'sc-mixed-1',
            salesLineId: 'line-seed-1b',
            productName: '耐腐蚀化工泵',
            productCode: 'CP-CHEM-316L',
            specModel: 'IH50-32-160',
            material: '316L',
            drawingNo: 'DWG-CHEM-50',
            orderQty: 2,
            shipSets: 1,
            unitPriceExTax: 5100,
            itemWeightKg: 65,
            deliveryAmountExTax: 5100,
            materialPicks: chemicalPumpScatterPicks,
          }),
        ],
        shipAttachments: demoPumpKitAttachments({ qty: 1, selectedSpare: true }),
        shipWeight: 95.5,
      },
      soMixed,
    ),

    // —— 纯散件 · 已发货 ——
    app(
      {
        id: 'do-seed-scatter-shipped',
        deliveryCode: 'SH20260908005',
        createdAt: '2026-09-08 11:10',
        deliveryDate: '2026-09-09',
        shipmentMethod: '自提',
        contactPerson: '孙自提',
        contactPhone: '13177778888',
        remark: '演示：纯散件已发货（客户自提密封件包）',
        deliveryStatus: '已发货',
        lineItems: [],
        scatterShipments: [
          demoScatterShipment({
            id: 'sc-shipped-1',
            salesLineId: 'line-seed-scatter-shipped',
            productName: '密封检修包',
            productCode: 'KIT-SEAL-50',
            specModel: 'DN50',
            material: '组合',
            orderQty: 5,
            shipSets: 5,
            unitPriceExTax: 700,
            itemWeightKg: 2.4,
            deliveryAmountExTax: 3500,
            packagingForm: '纸箱',
            materialPicks: [
              {
                materialId: 'mat-oring-a',
                name: 'O型圈',
                code: 'SEAL-ORING-50',
                spec: 'NBR',
                unit: '个',
                unitDemandQty: 4,
                availableStock: 200,
                shippedQty: 20,
                appliedQty: 20,
              },
              {
                materialId: 'mat-gasket-a',
                name: '密封垫',
                code: 'SEAL-GSK-50',
                spec: 'PTFE',
                unit: '片',
                unitDemandQty: 2,
                availableStock: 80,
                shippedQty: 10,
                appliedQty: 10,
              },
              {
                materialId: 'mat-grease-a',
                name: '润滑脂',
                code: 'LUBE-GRS-01',
                spec: '200g',
                unit: '支',
                unitDemandQty: 1,
                availableStock: 50,
                shippedQty: 5,
                appliedQty: 5,
              },
            ],
          }),
        ],
        shipWeight: 12,
      },
      soScatter,
    ),
  ]
}
