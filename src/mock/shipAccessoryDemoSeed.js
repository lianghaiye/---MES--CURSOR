/**
 * 随货配件演示订单：已审核、未发货，申请发货时应带出配件快照。
 */
import dayjs from 'dayjs'
import { createLineItem, createSalesOrder } from '@/mock/salesOrders'
import { createShipAttachmentLine } from '@/utils/shipBomAttachments'

export const SHIP_ACCESSORY_DEMO = {
  salesOrderId: 'so-seed-ship-acc',
  salesOrderNo: 'XSDD20261016-ACC',
  linePump: 'line-seed-ship-acc-pump',
  linePipe: 'line-seed-ship-acc-pipe',
}

function accessoryRow(partial) {
  return {
    ...createShipAttachmentLine({
      selected: true,
      source: 'BOM',
      sourceBomId: 'bom-ship-shared-demo',
      sourceBomNo: 'BOM-SHIP-STD',
      ...partial,
    }),
    sourceBomName: partial.sourceBomName || '标准随货配件包',
    supplyForm: partial.supplyForm || '外购件',
    materialType: partial.materialType || '配件',
    stockFulfillmentMode: partial.stockFulfillmentMode || 'prefer_stock',
  }
}

export function buildShipAccessoryDemoSalesOrder() {
  const now = dayjs()
  const pump = {
    id: SHIP_ACCESSORY_DEMO.linePump,
    productName: '潜水电泵 QJ200-40/3',
    productCode: 'CP2610004',
    specModel: 'QJ200-40/3',
    material: '不锈钢316L',
    unit: '台',
    salesQty: 2,
  }
  const pipe = {
    id: SHIP_ACCESSORY_DEMO.linePipe,
    productName: '管道循环泵',
    productCode: 'CP2610008',
    specModel: 'ISG65-125',
    material: '铸铁',
    unit: '台',
    salesQty: 1,
  }
  const kitSets = pump.salesQty

  return createSalesOrder({
    id: SHIP_ACCESSORY_DEMO.salesOrderId,
    orderNo: SHIP_ACCESSORY_DEMO.salesOrderNo,
    contractNo: 'HT-20261016-ACC',
    customerName: '随货配件演示客户',
    region: '华北',
    salesperson: '王芳',
    progressStatus: '进行中',
    deliveryStatus: '未发货',
    businessType: '自产销售',
    documentDate: now.format('YYYY-MM-DD'),
    createdAt: now.format('YYYY-MM-DD HH:mm'),
    creator: '王芳',
    approver: 'admin1',
    approvedAt: now.format('YYYY-MM-DD HH:mm'),
    urgency: '正常',
    remark: '随货配件演示：潜水电泵挂标准配件包，另有一条未归属配件',
    inventoryStatus: '充足',
    contactPerson: '李收货',
    contactPhone: '13800002222',
    deliveryAddress: '淄博市高新区演示路 16 号',
    deliveryMethod: '送货',
    defaultWarehouse: '成品仓',
    lineItems: [
      createLineItem({
        ...pump,
        qty: pump.salesQty,
        shippedQty: 0,
        deliveryMode: '整件',
        deliveryDate: now.add(10, 'day').format('YYYY-MM-DD'),
        unitPriceExTax: 8500,
        totalPriceExTax: 17000,
        totalPriceInTax: 19210,
        stockFulfillmentMode: 'prefer_stock',
      }),
      createLineItem({
        ...pipe,
        qty: pipe.salesQty,
        shippedQty: 0,
        deliveryMode: '整件',
        deliveryDate: now.add(10, 'day').format('YYYY-MM-DD'),
        unitPriceExTax: 3200,
        totalPriceExTax: 3200,
        totalPriceInTax: 3616,
        stockFulfillmentMode: 'prefer_stock',
      }),
    ],
    shipAccessories: [
      accessoryRow({
        id: 'ship-acc-demo-manual',
        materialCode: 'DOC-MANUAL',
        materialName: '产品说明书',
        specModel: '中文版',
        unit: '册',
        unitQty: 1,
        kitSets,
        shipQty: kitSets,
        planQty: kitSets,
        productId: '',
        productCode: pump.productCode,
        productName: pump.productName,
        salesLineId: pump.id,
      }),
      accessoryRow({
        id: 'ship-acc-demo-cert',
        materialCode: 'DOC-CERT',
        materialName: '合格证',
        specModel: 'A4',
        unit: '份',
        unitQty: 1,
        kitSets,
        shipQty: kitSets,
        planQty: kitSets,
        productCode: pump.productCode,
        productName: pump.productName,
        salesLineId: pump.id,
      }),
      accessoryRow({
        id: 'ship-acc-demo-wrench',
        materialCode: 'TOOL-WRENCH',
        materialName: '专用扳手组',
        specModel: 'M8-M24',
        unit: '套',
        unitQty: 1,
        kitSets,
        shipQty: kitSets,
        planQty: kitSets,
        productCode: pump.productCode,
        productName: pump.productName,
        salesLineId: pump.id,
        supplyForm: '外购件',
      }),
      accessoryRow({
        id: 'ship-acc-demo-oring',
        materialCode: 'SPARE-ORING',
        materialName: 'O型密封圈',
        specModel: 'NBR-50',
        unit: '个',
        unitQty: 4,
        kitSets,
        shipQty: 4 * kitSets,
        planQty: 4 * kitSets,
        productCode: pump.productCode,
        productName: pump.productName,
        salesLineId: pump.id,
        supplyForm: '外购件',
        stockFulfillmentMode: 'force_mto',
      }),
      accessoryRow({
        id: 'ship-acc-demo-seal',
        materialCode: 'TOOL-SEAL',
        materialName: '密封脂',
        specModel: '500g',
        unit: '桶',
        unitQty: 1,
        kitSets: 1,
        shipQty: 1,
        planQty: 1,
        source: '主数据',
        sourceBomId: '',
        sourceBomNo: '',
        sourceBomName: '',
        productId: '',
        productCode: '',
        productName: '',
        salesLineId: '',
        supplyForm: '自制件',
        stockFulfillmentMode: 'prefer_stock',
      }),
    ],
  })
}

/** 本地已有订单时也补上这条演示单；已存在但配件被清空时补回快照 */
export function ensureShipAccessoryDemoSalesOrders(orders = []) {
  const list = Array.isArray(orders) ? [...orders] : []
  const demo = buildShipAccessoryDemoSalesOrder()
  const idx = list.findIndex((o) => o.id === SHIP_ACCESSORY_DEMO.salesOrderId)
  if (idx === -1) {
    list.unshift(demo)
    return list
  }
  const existing = list[idx]
  if (!existing.shipAccessories?.length) {
    list[idx] = {
      ...existing,
      shipAccessories: demo.shipAccessories,
      lineItems: existing.lineItems?.length ? existing.lineItems : demo.lineItems,
    }
  }
  return list
}
