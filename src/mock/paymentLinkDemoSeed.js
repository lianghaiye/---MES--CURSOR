/**
 * 回款登记联动演示：
 * - 选合同 → 自动带出关联销售订单
 * - 选销售订单 → 自动带出发货单
 */
import dayjs from 'dayjs'
import { createLineItem, createSalesOrder } from '@/mock/salesOrders'
import { SALES_APPROVAL_DEMO } from '@/mock/salesApprovalDemoSeed'

export const PAYMENT_LINK_DEMO = {
  /** 框架合同（回款列表常见） */
  frameworkContractNo: 'HT-20260528-001',
  /** 标准合同（回款列表常见） */
  standardContractNo: 'HT-20261001-STD',
  orderIds: {
    fw1: 'so-pay-link-fw-1',
    fw2: 'so-pay-link-fw-2',
    std1: 'so-pay-link-std-1',
  },
  orderNos: {
    fw1: 'XSDD20261028-PAY01',
    fw2: 'XSDD20261028-PAY02',
    std1: 'XSDD20261001-PAY01',
  },
}

function moneyLine(id, partial = {}) {
  const qty = partial.salesQty ?? partial.qty ?? 2
  const unitEx = partial.unitPriceExTax ?? 9800
  const taxRate = partial.taxRate ?? 13
  const totalEx = unitEx * qty
  const totalIn = Math.round(totalEx * (1 + taxRate / 100) * 100) / 100
  return createLineItem({
    id,
    productName: '清水离心泵 ISG50-160',
    productCode: 'CP2610001',
    specModel: 'ISG50-160',
    material: '铸铁',
    unit: '台',
    salesQty: qty,
    qty,
    shippedQty: partial.shippedQty ?? qty,
    unitPriceExTax: unitEx,
    unitPriceInTax: Math.round(unitEx * (1 + taxRate / 100) * 100) / 100,
    taxRate,
    totalPriceExTax: totalEx,
    totalPriceInTax: totalIn,
    deliveryMode: '整件',
    businessType: '自产销售',
    ...partial,
  })
}

function deliveryApp({
  id,
  deliveryCode,
  salesLineId,
  qty,
  amountExTax,
  status = '已发货',
  deliveryDate,
  createdAt,
  address,
  contactPerson = '张收货',
  contactPhone = '13800001111',
}) {
  const amountIn = Math.round(amountExTax * 1.13 * 100) / 100
  return {
    id,
    deliveryCode,
    createdAt,
    deliveryDate,
    shipmentMethod: '物流',
    logisticsNo: `YT${String(deliveryCode).replace(/\D/g, '').slice(-12) || '8866001100'}`,
    deliveryAddress: address,
    outboundWarehouse: '成品仓',
    contactPerson,
    contactPhone,
    status,
    actualShipQty: qty,
    totalShipQty: qty,
    applyShipQty: qty,
    totalAmountExTax: amountExTax,
    totalAmountInTax: amountIn,
    remark: '回款登记联动演示发货单',
    lineItems: [
      {
        id: `${id}-li`,
        salesLineId,
        productName: '清水离心泵 ISG50-160',
        productCode: 'CP2610001',
        specModel: 'ISG50-160',
        unit: '台',
        shipQty: qty,
        orderQty: qty,
        deliveryAmountExTax: amountExTax,
        deliveryAmountInTax: amountIn,
        deliveryUnitPriceExTax: Math.round((amountExTax / qty) * 100) / 100,
        packagingForm: '铁架+木箱',
        deliveryMode: '整件',
      },
    ],
    scatterShipments: [],
    shipAttachments: [],
  }
}

function buildDemoOrders() {
  const t = dayjs('2026-10-28')
  return [
    createSalesOrder({
      id: PAYMENT_LINK_DEMO.orderIds.fw1,
      orderNo: PAYMENT_LINK_DEMO.orderNos.fw1,
      contractNo: PAYMENT_LINK_DEMO.frameworkContractNo,
      customerName: '华东机械制造有限公司',
      region: '华东',
      salesperson: '王五',
      progressStatus: '进行中',
      deliveryStatus: '部分发货',
      businessType: '自产销售',
      documentDate: t.subtract(10, 'day').format('YYYY-MM-DD'),
      createdAt: t.subtract(10, 'day').format('YYYY-MM-DD HH:mm'),
      creator: '王五',
      approver: 'admin1',
      approvedAt: t.subtract(9, 'day').format('YYYY-MM-DD HH:mm'),
      remark: '回款演示：框架合同关联订单 1（含发货）',
      contactPerson: '张工',
      contactPhone: '13800001111',
      deliveryAddress: '上海市浦东新区示范路 88 号',
      lineItems: [moneyLine('line-pay-fw-1a', { salesQty: 3, qty: 3, shippedQty: 2 })],
      deliveryApplications: [
        deliveryApp({
          id: 'da-pay-fw-1-a',
          deliveryCode: 'SH20261020001',
          salesLineId: 'line-pay-fw-1a',
          qty: 1,
          amountExTax: 9800,
          status: '已发货',
          deliveryDate: t.subtract(6, 'day').format('YYYY-MM-DD'),
          createdAt: t.subtract(7, 'day').format('YYYY-MM-DD HH:mm'),
          address: '上海市浦东新区示范路 88 号',
        }),
        deliveryApp({
          id: 'da-pay-fw-1-b',
          deliveryCode: 'SH20261025001',
          salesLineId: 'line-pay-fw-1a',
          qty: 1,
          amountExTax: 9800,
          status: '已发货',
          deliveryDate: t.subtract(2, 'day').format('YYYY-MM-DD'),
          createdAt: t.subtract(3, 'day').format('YYYY-MM-DD HH:mm'),
          address: '上海市浦东新区示范路 88 号',
        }),
      ],
    }),
    createSalesOrder({
      id: PAYMENT_LINK_DEMO.orderIds.fw2,
      orderNo: PAYMENT_LINK_DEMO.orderNos.fw2,
      contractNo: PAYMENT_LINK_DEMO.frameworkContractNo,
      customerName: '华东机械制造有限公司',
      region: '华东',
      salesperson: '王五',
      progressStatus: '进行中',
      deliveryStatus: '已发货',
      businessType: '自产销售',
      documentDate: t.subtract(8, 'day').format('YYYY-MM-DD'),
      createdAt: t.subtract(8, 'day').format('YYYY-MM-DD HH:mm'),
      creator: '王五',
      approver: 'admin1',
      approvedAt: t.subtract(7, 'day').format('YYYY-MM-DD HH:mm'),
      remark: '回款演示：框架合同关联订单 2（含发货）',
      contactPerson: '张工',
      contactPhone: '13800001111',
      deliveryAddress: '上海市浦东新区示范路 88 号',
      lineItems: [moneyLine('line-pay-fw-2a', { salesQty: 2, qty: 2, shippedQty: 2 })],
      deliveryApplications: [
        deliveryApp({
          id: 'da-pay-fw-2-a',
          deliveryCode: 'SH20261022001',
          salesLineId: 'line-pay-fw-2a',
          qty: 2,
          amountExTax: 19600,
          status: '已发货',
          deliveryDate: t.subtract(4, 'day').format('YYYY-MM-DD'),
          createdAt: t.subtract(5, 'day').format('YYYY-MM-DD HH:mm'),
          address: '上海市浦东新区示范路 88 号',
        }),
      ],
    }),
    createSalesOrder({
      id: PAYMENT_LINK_DEMO.orderIds.std1,
      orderNo: PAYMENT_LINK_DEMO.orderNos.std1,
      contractNo: PAYMENT_LINK_DEMO.standardContractNo,
      customerName: '华东机械制造有限公司',
      region: '华东',
      salesperson: '王五',
      progressStatus: '进行中',
      deliveryStatus: '部分发货',
      businessType: '自产销售',
      documentDate: '2026-10-05',
      createdAt: '2026-10-05 10:00',
      creator: '王五',
      approver: 'admin1',
      approvedAt: '2026-10-05 11:20',
      remark: '回款演示：标准合同关联订单（含发货）',
      contactPerson: '李仓管',
      contactPhone: '13900002222',
      deliveryAddress: '杭州市余杭区演示路 1 号',
      lineItems: [moneyLine('line-pay-std-1a', { salesQty: 4, qty: 4, shippedQty: 2 })],
      deliveryApplications: [
        deliveryApp({
          id: 'da-pay-std-1-a',
          deliveryCode: 'SH20261008001',
          salesLineId: 'line-pay-std-1a',
          qty: 2,
          amountExTax: 19600,
          status: '已发货',
          deliveryDate: '2026-10-12',
          createdAt: '2026-10-10 15:00',
          address: '杭州市余杭区演示路 1 号',
          contactPerson: '李仓管',
          contactPhone: '13900002222',
        }),
      ],
    }),
  ]
}

/** 给审批演示单补发货申请，便于选「销售订单」回款时带出发货 */
function patchApprovalDemoDeliveries(order) {
  if (!order) return order
  if (order.id === SALES_APPROVAL_DEMO.passOrderId) {
    const apps = order.deliveryApplications || []
    if (apps.some((a) => a.id === 'da-appr-pass-1')) return order
    return {
      ...order,
      deliveryStatus: order.deliveryStatus === '未发货' ? '部分发货' : order.deliveryStatus,
      deliveryApplications: [
        deliveryApp({
          id: 'da-appr-pass-1',
          deliveryCode: 'SH20261021001',
          salesLineId: 'line-seed-appr-pass-1',
          qty: 1,
          amountExTax: 9800,
          status: '已发货',
          deliveryDate: '2026-10-25',
          createdAt: '2026-10-23 11:00',
          address: order.deliveryAddress || '杭州市余杭区演示路 1 号',
          contactPerson: order.contactPerson || '张工',
          contactPhone: order.contactPhone || '13800001111',
        }),
        deliveryApp({
          id: 'da-appr-pass-2',
          deliveryCode: 'SH20261028001',
          salesLineId: 'line-seed-appr-pass-1',
          qty: 1,
          amountExTax: 9800,
          status: '待发货',
          deliveryDate: '2026-11-05',
          createdAt: '2026-10-28 09:30',
          address: order.deliveryAddress || '杭州市余杭区演示路 1 号',
          contactPerson: order.contactPerson || '张工',
          contactPhone: order.contactPhone || '13800001111',
        }),
        ...(apps || []),
      ],
    }
  }
  if (order.id === SALES_APPROVAL_DEMO.rejectOrderId) {
    const apps = order.deliveryApplications || []
    if (apps.some((a) => a.id === 'da-appr-reject-1')) return order
    return {
      ...order,
      // 驳回单也挂演示发货，方便登记回款联调（业务上可先看数据）
      progressStatus: order.progressStatus || '已拒绝',
      deliveryStatus: '部分发货',
      deliveryApplications: [
        deliveryApp({
          id: 'da-appr-reject-1',
          deliveryCode: 'SH20261022002',
          salesLineId: 'line-seed-appr-reject-1',
          qty: 1,
          amountExTax: 9800,
          status: '已发货',
          deliveryDate: '2026-10-26',
          createdAt: '2026-10-24 14:20',
          address: order.deliveryAddress || '济南市历下区工业南路 100 号',
          contactPerson: order.contactPerson || 'TEST',
          contactPhone: order.contactPhone || '16522033362',
        }),
        ...(apps || []),
      ],
    }
  }
  return order
}

/**
 * 写入/补齐回款联动演示销售订单（幂等）
 */
export function ensurePaymentLinkDemoSalesOrders(orders = []) {
  let list = Array.isArray(orders) ? [...orders] : []
  buildDemoOrders().forEach((demo) => {
    const idx = list.findIndex((o) => o.id === demo.id || o.orderNo === demo.orderNo)
    if (idx === -1) {
      list.unshift(demo)
      return
    }
    const existing = list[idx]
    const apps = existing.deliveryApplications || []
    const needApps =
      !apps.length ||
      !demo.deliveryApplications.every((d) =>
        apps.some((a) => a.id === d.id || a.deliveryCode === d.deliveryCode),
      )
    list[idx] = {
      ...existing,
      contractNo: existing.contractNo || demo.contractNo,
      customerName: existing.customerName || demo.customerName,
      progressStatus:
        existing.progressStatus === '待提交' || existing.progressStatus === '待审核'
          ? '进行中'
          : existing.progressStatus || demo.progressStatus,
      deliveryApplications: needApps ? demo.deliveryApplications : existing.deliveryApplications,
      lineItems: existing.lineItems?.length ? existing.lineItems : demo.lineItems,
      remark: existing.remark || demo.remark,
    }
  })

  // 既有「人纷纷」订单挂到框架合同，保证选合同至少能看到一单
  const legacyIdx = list.findIndex((o) => o.id === 'so-2')
  if (legacyIdx !== -1) {
    const legacy = list[legacyIdx]
    list[legacyIdx] = {
      ...legacy,
      contractNo: legacy.contractNo || PAYMENT_LINK_DEMO.frameworkContractNo,
      progressStatus:
        legacy.progressStatus === '待提交' ? '进行中' : legacy.progressStatus || '进行中',
      approver: legacy.approver || 'admin1',
      approvedAt: legacy.approvedAt || '2026-05-28 16:00',
      deliveryApplications:
        Array.isArray(legacy.deliveryApplications) && legacy.deliveryApplications.length
          ? legacy.deliveryApplications
          : [
              deliveryApp({
                id: 'da-pay-legacy-so2',
                deliveryCode: 'SH20260530001',
                salesLineId: 'line-2',
                qty: 1,
                amountExTax: 60000,
                status: '已发货',
                deliveryDate: '2026-06-05',
                createdAt: '2026-05-30 10:00',
                address: '上海市浦东新区示范路 88 号',
              }),
            ],
    }
  }

  list = list.map(patchApprovalDemoDeliveries)
  return list
}
