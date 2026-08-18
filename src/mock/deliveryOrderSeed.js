import dayjs from 'dayjs'
import { mapApplicationToDeliveryOrder } from '@/utils/deliveryOrder'

function app(partial, salesOrder) {
  return mapApplicationToDeliveryOrder(
    {
      id: partial.id,
      deliveryCode: partial.deliveryCode,
      createdAt: partial.createdAt || dayjs().format('YYYY-MM-DD HH:mm'),
      deliveryDate: partial.deliveryDate,
      status: partial.status || '已提交',
      shipmentMethod: partial.shipmentMethod || '送货',
      logisticsNo: partial.logisticsNo || '',
      contactPerson: partial.contactPerson || '',
      contactPhone: partial.contactPhone || '',
      deliveryAddress: partial.deliveryAddress || '',
      driverName: partial.driverName || '',
      driverPhone: partial.driverPhone || '',
      plateNo: partial.plateNo || '',
      applyOutbound: partial.applyOutbound !== false,
      outboundWarehouse: partial.outboundWarehouse || '成品仓',
      remark: partial.remark || '',
      lineItems: partial.lineItems || [],
      scatterShipments: partial.scatterShipments || [],
      shipWeight: partial.shipWeight,
    },
    salesOrder,
  )
}

/** 发货管理列表演示数据 */
export function buildDeliveryOrderSeed() {
  const so1 = {
    id: 'so-seed-1',
    orderNo: '1-20260512-005',
    customerName: '测试人员',
    salesperson: 'admin1',
    contactPerson: 'TEST',
    contactPhone: '16522033362',
  }
  const so2 = {
    id: 'so-2',
    orderNo: '1-20260529-002',
    customerName: '测试人员',
    salesperson: 'admin1',
  }

  return [
    app(
      {
        id: 'do-seed-1',
        deliveryCode: 'SH20260513001',
        createdAt: '2026-05-13 14:30',
        deliveryDate: '2026-05-20',
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
      so1,
    ),
    app(
      {
        id: 'do-seed-2',
        deliveryCode: 'SH20260529111',
        createdAt: '2026-05-29 10:00',
        deliveryDate: '2026-05-29',
        lineItems: [
          {
            id: 'dl-2',
            productName: '测试产品00002',
            shipQty: 2,
            deliveryAmountExTax: 24.66,
            itemWeightKg: 0,
          },
        ],
        shipWeight: 0,
      },
      so2,
    ),
    app(
      {
        id: 'do-seed-3',
        deliveryCode: 'SH20260528002',
        createdAt: '2026-05-28 16:20',
        deliveryDate: '2026-05-28',
        shipmentMethod: '自提',
        lineItems: [
          {
            id: 'dl-3',
            productName: '离心泵配件',
            shipQty: 46,
            deliveryAmountExTax: 1200,
            itemWeightKg: 2.3,
          },
        ],
        shipWeight: 105.8,
      },
      {
        orderNo: '1-20260528-001',
        customerName: '人纷纷',
        salesperson: 'admin1',
      },
    ),
    app(
      {
        id: 'do-seed-4',
        deliveryCode: 'SH20260603001',
        createdAt: '2026-06-03 09:15',
        deliveryDate: '2026-06-05',
        logisticsNo: 'SF1234567890',
        driverName: '张师傅',
        driverPhone: '13800138000',
        plateNo: '沪A12345',
        lineItems: [
          {
            id: 'dl-4',
            productName: 'ISG50-160',
            shipQty: 3,
            deliveryAmountExTax: 300,
            itemWeightKg: 15,
          },
        ],
        shipWeight: 45,
      },
      {
        orderNo: '1-20260518-003',
        customerName: '深圳精密模具科技',
        salesperson: '李四',
      },
    ),
  ]
}
