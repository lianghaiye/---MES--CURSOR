/**
 * 销售明细「发货信息」列演示：一行多发货单 / 一行单发货单，字段齐全便于点开抽屉验收。
 */
import dayjs from 'dayjs'
import { createLineItem, createSalesOrder } from '@/mock/salesOrders'

export const SALES_LINE_SHIP_INFO_DEMO = {
  salesOrderId: 'so-seed-ship-info-demo',
  salesOrderNo: '1-20260918-SHIP',
  lineA: 'line-seed-ship-info-a',
  lineB: 'line-seed-ship-info-b',
  lineC: 'line-seed-ship-info-c',
}

function buildDeliveryApp(partial) {
  return {
    status: '已提交',
    outboundWarehouse: '成品仓',
    contactPerson: '张收货',
    contactPhone: '13900001111',
    lineItems: [],
    scatterShipments: [],
    shipAttachments: [],
    totalShipQty: 0,
    ...partial,
  }
}

export function buildSalesLineShipInfoDemoSalesOrder() {
  const now = dayjs()
  const pNameA = '清水离心泵 ISG50-160'
  const pCodeA = 'CP2610001'
  const pNameB = '管道泵演示件'
  const pCodeB = 'CP-SHIP-DEMO-02'

  return createSalesOrder({
    id: SALES_LINE_SHIP_INFO_DEMO.salesOrderId,
    orderNo: SALES_LINE_SHIP_INFO_DEMO.salesOrderNo,
    contractNo: 'HT-20260918-SHIP',
    customerName: '发货信息演示客户',
    region: '华南',
    salesperson: '王芳',
    progressStatus: '进行中',
    businessType: '自产销售',
    documentDate: now.subtract(5, 'day').format('YYYY-MM-DD'),
    createdAt: now.subtract(5, 'day').format('YYYY-MM-DD HH:mm'),
    creator: '王芳',
    approver: 'admin1',
    approvedAt: now.subtract(4, 'day').format('YYYY-MM-DD HH:mm'),
    urgency: '正常',
    remark: '销售明细「发货信息」演示：行 A 两张发货单，行 B 一张，行 C 无发货',
    inventoryStatus: '充足',
    contactPerson: '张收货',
    contactPhone: '13900001111',
    deliveryAddress: '广州市黄埔区演示大道 168 号',
    deliveryMethod: '物流',
    lineItems: [
      createLineItem({
        id: SALES_LINE_SHIP_INFO_DEMO.lineA,
        productName: pNameA,
        productCode: pCodeA,
        specModel: 'ISG50-160',
        unit: '台',
        salesQty: 5,
        qty: 5,
        shippedQty: 3,
        deliveryMode: '整机',
        deliveryDate: now.add(3, 'day').format('YYYY-MM-DD'),
        unitPriceExTax: 2800,
        totalPriceExTax: 14000,
        totalPriceInTax: 15820,
      }),
      createLineItem({
        id: SALES_LINE_SHIP_INFO_DEMO.lineB,
        productName: pNameB,
        productCode: pCodeB,
        specModel: 'DEMO-B',
        unit: '台',
        salesQty: 2,
        qty: 2,
        shippedQty: 2,
        deliveryMode: '整机',
        deliveryDate: now.add(5, 'day').format('YYYY-MM-DD'),
        unitPriceExTax: 1500,
        totalPriceExTax: 3000,
        totalPriceInTax: 3390,
      }),
      createLineItem({
        id: SALES_LINE_SHIP_INFO_DEMO.lineC,
        productName: '未发货演示备件',
        productCode: 'CP-SHIP-DEMO-03',
        specModel: 'DEMO-C',
        unit: '件',
        salesQty: 10,
        qty: 10,
        shippedQty: 0,
        deliveryMode: '散件',
        deliveryDate: now.add(10, 'day').format('YYYY-MM-DD'),
        unitPriceExTax: 80,
        totalPriceExTax: 800,
        totalPriceInTax: 904,
      }),
    ],
    deliveryApplications: [
      buildDeliveryApp({
        id: 'da-ship-info-a1',
        deliveryCode: 'SH20260915001',
        createdAt: now.subtract(3, 'day').format('YYYY-MM-DD HH:mm'),
        deliveryDate: now.subtract(2, 'day').format('YYYY-MM-DD'),
        shipmentMethod: '送货',
        logisticsNo: '',
        deliveryAddress: '广州市黄埔区演示大道 168 号',
        outboundWarehouse: '成品仓',
        driverName: '陈师傅',
        driverPhone: '13700001234',
        plateNo: '粤A12B34',
        status: '已发货',
        actualShipQty: 2,
        totalShipQty: 2,
        remark: '首批发运（行 A）',
        lineItems: [
          {
            id: SALES_LINE_SHIP_INFO_DEMO.lineA,
            salesLineId: SALES_LINE_SHIP_INFO_DEMO.lineA,
            productName: pNameA,
            productCode: pCodeA,
            unit: '台',
            shipQty: 2,
            orderQty: 5,
            actualShipQty: 2,
            deliveryMode: '整机',
          },
        ],
      }),
      buildDeliveryApp({
        id: 'da-ship-info-a2',
        deliveryCode: 'SH20260917002',
        createdAt: now.subtract(1, 'day').format('YYYY-MM-DD HH:mm'),
        deliveryDate: now.format('YYYY-MM-DD'),
        shipmentMethod: '物流',
        logisticsNo: 'SF13800138000',
        deliveryAddress: '广州市黄埔区演示大道 168 号货台 B',
        outboundWarehouse: '成品仓',
        driverName: '',
        driverPhone: '',
        plateNo: '',
        status: '已提交',
        totalShipQty: 1,
        remark: '第二批物流（行 A）',
        lineItems: [
          {
            id: SALES_LINE_SHIP_INFO_DEMO.lineA,
            salesLineId: SALES_LINE_SHIP_INFO_DEMO.lineA,
            productName: pNameA,
            productCode: pCodeA,
            unit: '台',
            shipQty: 1,
            orderQty: 5,
            deliveryMode: '整机',
          },
        ],
      }),
      buildDeliveryApp({
        id: 'da-ship-info-b1',
        deliveryCode: 'SH20260916003',
        createdAt: now.subtract(2, 'day').format('YYYY-MM-DD HH:mm'),
        deliveryDate: now.subtract(1, 'day').format('YYYY-MM-DD'),
        shipmentMethod: '自提',
        logisticsNo: '',
        deliveryAddress: '客户自提 · 厂区东门',
        outboundWarehouse: '线边仓',
        driverName: '李自提',
        driverPhone: '13811112222',
        plateNo: '粤B98C76',
        status: '已发货',
        actualShipQty: 2,
        totalShipQty: 2,
        remark: '整单自提（行 B）',
        lineItems: [
          {
            id: SALES_LINE_SHIP_INFO_DEMO.lineB,
            salesLineId: SALES_LINE_SHIP_INFO_DEMO.lineB,
            productName: pNameB,
            productCode: pCodeB,
            unit: '台',
            shipQty: 2,
            orderQty: 2,
            actualShipQty: 2,
            deliveryMode: '整机',
          },
        ],
      }),
    ],
  })
}

/** 若本地已有该演示单但发货申请被清空，补回发货信息 */
export function ensureSalesLineShipInfoDemoSalesOrders(orders = []) {
  const list = Array.isArray(orders) ? [...orders] : []
  const idx = list.findIndex((o) => o.id === SALES_LINE_SHIP_INFO_DEMO.salesOrderId)
  const demo = buildSalesLineShipInfoDemoSalesOrder()
  if (idx === -1) {
    list.unshift(demo)
    return list
  }
  const existing = list[idx]
  const apps = existing.deliveryApplications || []
  const needRefresh =
    apps.length < 3 ||
    !apps.some((a) => a.id === 'da-ship-info-a1') ||
    !apps.some((a) =>
      (a.lineItems || []).some((li) => li.salesLineId === SALES_LINE_SHIP_INFO_DEMO.lineA),
    )
  if (needRefresh) {
    list[idx] = {
      ...existing,
      region: existing.region || demo.region,
      contractNo: existing.contractNo || demo.contractNo,
      deliveryApplications: demo.deliveryApplications,
      lineItems: existing.lineItems?.length ? existing.lineItems : demo.lineItems,
    }
  }
  return list
}
