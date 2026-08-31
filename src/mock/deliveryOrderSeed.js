import dayjs from 'dayjs'
import { mapApplicationToDeliveryOrder } from '@/utils/deliveryOrder'

/** 演示数据：按不含税金额推 13% 含税（与常见销项税率一致） */
function withInTaxAmount(line) {
  const ex = Number(line.deliveryAmountExTax) || 0
  if (!ex || line.deliveryAmountInTax != null) return line
  return {
    ...line,
    deliveryAmountInTax: Math.round(ex * 1.13 * 100) / 100,
  }
}

function app(partial, salesOrder) {
  return mapApplicationToDeliveryOrder(
    {
      id: partial.id,
      deliveryCode: partial.deliveryCode,
      createdAt: partial.createdAt || dayjs().format('YYYY-MM-DD HH:mm'),
      deliveryDate: partial.deliveryDate,
      status: partial.status || '待发货',
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
    },
    salesOrder,
  )
}

/**
 * 发货管理演示数据（覆盖：
 * - 未生成出库单 → 列表「待发货」，可点「生成出库单」
 * - 已生成待出库出库单 → 「待出库」
 * - 关联出库单已出库 → 「已发货」
 * 发运方式含：送货 / 自提 / 物流
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
  ]
}
