import dayjs from 'dayjs'
import { createLineItem, createSalesOrder } from '@/mock/salesOrders'
import { SHIP_ACCESSORY_DEMO } from '@/mock/shipAccessoryDemoSeed'
import { PRICE_CHANGE_STATUS, normalizePriceChangeRecord } from '@/utils/salesPriceChange'

export const SALES_APPROVAL_DEMO = {
  passOrderId: 'so-seed-appr-pass',
  passOrderNo: 'XSDD20261022-AP01',
  rejectOrderId: 'so-seed-appr-reject',
  rejectOrderNo: 'XSDD20261022-AP02',
}

function pumpLine(id, extra = {}) {
  return createLineItem({
    id,
    productName: '清水离心泵 ISG50-160',
    productCode: 'CP2610001',
    specModel: 'ISG50-160',
    material: '铸铁',
    unit: '台',
    salesQty: 2,
    qty: 2,
    unitPriceExTax: 9800,
    unitPriceInTax: 11074,
    taxRate: 13,
    totalPriceExTax: 19600,
    totalPriceInTax: 22148,
    deliveryMode: '整机',
    businessType: '自产销售',
    ...extra,
  })
}

function rec(name, role, result, time, opinion = '') {
  return { name, role, result, time, opinion }
}

export function buildSalesApprovalDemoOrders() {
  const t = (offsetHour, minute = 0) =>
    dayjs('2026-10-20 09:00').add(offsetHour, 'hour').minute(minute).format('YYYY-MM-DD HH:mm')

  return [
    createSalesOrder({
      id: SALES_APPROVAL_DEMO.passOrderId,
      orderNo: SALES_APPROVAL_DEMO.passOrderNo,
      contractNo: 'HT-20261022-AP01',
      customerName: '华东机械制造有限公司',
      region: '华东',
      salesperson: '王芳',
      progressStatus: '进行中',
      deliveryStatus: '未发货',
      businessType: '自产销售',
      documentDate: '2026-10-20',
      createdAt: t(0),
      creator: '王芳',
      approver: 'admin1',
      approvedAt: t(28, 10),
      remark: '审批信息演示：订单先驳回再通过，并含通过/驳回的订单变更',
      contactPerson: '张工',
      contactPhone: '13800001111',
      deliveryAddress: '杭州市余杭区演示路 1 号',
      approvalRecords: [
        rec('admin1', '销售审核', '已通过', t(28, 10), '交期与价格已确认，准予通过'),
        rec('王芳', '重新提交', '已提交', t(26), '已按审核意见下调折扣并补充交期说明'),
        rec('admin1', '销售审核', '已驳回', t(8, 40), '折扣过高，请重新核算后提交'),
        rec('王芳', '提交审核', '已提交', t(0), '请审核本单价格与交期'),
      ],
      lineItems: [pumpLine('line-seed-appr-pass-1')],
    }),
    createSalesOrder({
      id: SALES_APPROVAL_DEMO.rejectOrderId,
      orderNo: SALES_APPROVAL_DEMO.rejectOrderNo,
      contractNo: 'HT-20261022-AP02',
      customerName: '测试人员',
      region: '华北',
      salesperson: '李明',
      progressStatus: '已拒绝',
      deliveryStatus: '未发货',
      businessType: '自产销售',
      documentDate: '2026-10-21',
      createdAt: '2026-10-21 10:20',
      creator: '李明',
      approver: 'admin1',
      approvedAt: '',
      remark: '审批信息演示：销售订单审核驳回',
      contactPerson: 'TEST',
      contactPhone: '16522033362',
      approvalRecords: [
        rec('admin1', '销售审核', '已驳回', '2026-10-21 15:05', '客户账期未确认，本单驳回'),
        rec('李明', '提交审核', '已提交', '2026-10-21 10:20', '请审核'),
      ],
      lineItems: [pumpLine('line-seed-appr-reject-1', { salesQty: 1, qty: 1 })],
    }),
  ]
}

export function patchOrderWithDemoApprovals(order) {
  if (!order) return order
  if (Array.isArray(order.approvalRecords) && order.approvalRecords.length) return order
  const created = order.createdAt || dayjs().format('YYYY-MM-DD HH:mm')
  const approvedAt = order.approvedAt || created
  const creator = order.creator || '王芳'
  if (order.progressStatus === '已拒绝') {
    return {
      ...order,
      approvalRecords: [
        rec('admin1', '销售审核', '已驳回', approvedAt || created, '演示：订单审核驳回'),
        rec(creator, '提交审核', '已提交', created, ''),
      ],
    }
  }
  if (order.progressStatus === '进行中' || order.approver) {
    return {
      ...order,
      approvalRecords: [
        rec('admin1', '销售审核', '已通过', approvedAt, '同意按提交内容执行'),
        rec(creator, '提交审核', '已提交', created, ''),
      ],
    }
  }
  return order
}

export function ensureSalesApprovalDemoSalesOrders(orders = []) {
  const list = Array.isArray(orders) ? [...orders] : []
  const demos = buildSalesApprovalDemoOrders()
  demos.forEach((demo) => {
    const idx = list.findIndex((o) => o.id === demo.id)
    if (idx === -1) list.unshift(demo)
  })
  const accIdx = list.findIndex((o) => o.id === SHIP_ACCESSORY_DEMO.salesOrderId)
  if (accIdx !== -1) {
    list[accIdx] = patchOrderWithDemoApprovals(list[accIdx])
  }
  const seed1 = list.findIndex((o) => o.id === 'so-seed-1')
  if (seed1 !== -1) {
    list[seed1] = patchOrderWithDemoApprovals(list[seed1])
  }
  return list
}

function changeLine(partial) {
  return {
    salesLineId: partial.salesLineId,
    productCode: partial.productCode || 'CP2610001',
    productName: partial.productName || '清水离心泵 ISG50-160',
    specModel: 'ISG50-160',
    material: '铸铁',
    unit: '台',
    qty: 2,
    taxRate: 13,
    listUnitPriceExTax: 9800,
    oldUnitPriceExTax: 9800,
    oldUnitPriceInTax: 11074,
    newUnitPriceExTax: partial.newUnitPriceExTax ?? 9800,
    newUnitPriceInTax: partial.newUnitPriceInTax ?? 11074,
    oldLineDiscountRate: 1,
    newLineDiscountRate: partial.newLineDiscountRate ?? 1,
    oldQty: 2,
    newQty: partial.newQty ?? 2,
  }
}

export function buildSalesApprovalDemoPriceChanges() {
  return [
    normalizePriceChangeRecord({
      id: 'spc-appr-acc-pass',
      changeNo: 'JGBG20261022001',
      salesOrderId: SHIP_ACCESSORY_DEMO.salesOrderId,
      salesOrderNo: SHIP_ACCESSORY_DEMO.salesOrderNo,
      status: PRICE_CHANGE_STATUS.APPROVED,
      reasonType: '设计变更',
      reason: '潜水电泵配件包按最新图纸调整数量。',
      oldCustomerName: '随货配件演示客户',
      newCustomerName: '随货配件演示客户',
      taxModeExcluding: true,
      lines: [
        changeLine({
          salesLineId: SHIP_ACCESSORY_DEMO.linePump,
          productCode: 'CP2610004',
          productName: '潜水电泵 QJ200-40/3',
          newQty: 2,
        }),
      ],
      creator: '王芳',
      createdAt: '2026-10-21 09:10',
      submitter: '王芳',
      submittedAt: '2026-10-21 09:10',
      approver: 'admin1',
      approvedAt: '2026-10-21 11:20',
      opinion: '配件数量合理，变更通过',
    }),
    normalizePriceChangeRecord({
      id: 'spc-appr-acc-reject',
      changeNo: 'JGBG20261022002',
      salesOrderId: SHIP_ACCESSORY_DEMO.salesOrderId,
      salesOrderNo: SHIP_ACCESSORY_DEMO.salesOrderNo,
      status: PRICE_CHANGE_STATUS.REJECTED,
      reasonType: '客户取消订货',
      reason: '客户口头要求取消管道循环泵，申请整行取消。',
      oldCustomerName: '随货配件演示客户',
      newCustomerName: '随货配件演示客户',
      taxModeExcluding: true,
      lines: [
        changeLine({
          salesLineId: SHIP_ACCESSORY_DEMO.linePipe,
          productCode: 'CP2610008',
          productName: '管道循环泵',
          newQty: 0,
        }),
      ],
      creator: '王芳',
      createdAt: '2026-10-22 14:00',
      submitter: '王芳',
      submittedAt: '2026-10-22 14:00',
      approver: 'admin1',
      approvedAt: '2026-10-22 16:40',
      opinion: '该行已纳入发货计划，不可取消，驳回',
    }),
    normalizePriceChangeRecord({
      id: 'spc-appr-pass-ok',
      changeNo: 'JGBG20261020011',
      salesOrderId: SALES_APPROVAL_DEMO.passOrderId,
      salesOrderNo: SALES_APPROVAL_DEMO.passOrderNo,
      status: PRICE_CHANGE_STATUS.APPROVED,
      reasonType: '交期调整',
      reason: '客户要求提前一周交货。',
      oldCustomerName: '华东机械制造有限公司',
      newCustomerName: '华东机械制造有限公司',
      taxModeExcluding: true,
      lines: [changeLine({ salesLineId: 'line-seed-appr-pass-1' })],
      creator: '王芳',
      createdAt: '2026-10-21 16:00',
      submitter: '王芳',
      submittedAt: '2026-10-21 16:00',
      approver: 'admin1',
      approvedAt: '2026-10-21 17:30',
      opinion: '产能可满足，交期变更通过',
    }),
    normalizePriceChangeRecord({
      id: 'spc-appr-pass-ng',
      changeNo: 'JGBG20261020012',
      salesOrderId: SALES_APPROVAL_DEMO.passOrderId,
      salesOrderNo: SALES_APPROVAL_DEMO.passOrderNo,
      status: PRICE_CHANGE_STATUS.REJECTED,
      reasonType: '工艺加价',
      reason: '申请将不含税单价上调至 12000。',
      oldCustomerName: '华东机械制造有限公司',
      newCustomerName: '华东机械制造有限公司',
      taxModeExcluding: true,
      lines: [
        changeLine({
          salesLineId: 'line-seed-appr-pass-1',
          newUnitPriceExTax: 12000,
          newUnitPriceInTax: 13560,
        }),
      ],
      creator: '王芳',
      createdAt: '2026-10-22 09:40',
      submitter: '王芳',
      submittedAt: '2026-10-22 09:40',
      approver: 'admin1',
      approvedAt: '2026-10-22 10:15',
      opinion: '加价幅度超出授权，驳回',
    }),
    normalizePriceChangeRecord({
      id: 'spc-seed-1-reject',
      changeNo: 'JGBG20260516002',
      salesOrderId: 'so-seed-1',
      salesOrderNo: '1-20260512-005',
      status: PRICE_CHANGE_STATUS.REJECTED,
      reasonType: '客户取消订货',
      reason: '申请取消未发货的第二台。',
      oldCustomerName: '山东化工泵业集团',
      newCustomerName: '山东化工泵业集团',
      taxModeExcluding: true,
      lines: [
        changeLine({
          salesLineId: 'line-seed-1a',
          newQty: 1,
        }),
      ],
      creator: '王芳',
      createdAt: '2026-05-16 09:00',
      submitter: '王芳',
      submittedAt: '2026-05-16 09:00',
      approver: 'admin1',
      approvedAt: '2026-05-16 11:20',
      opinion: '该行已占用现货，数量不可再减，驳回',
    }),
  ]
}

export function ensureSalesApprovalDemoPriceChanges(list = []) {
  const next = Array.isArray(list) ? [...list] : []
  buildSalesApprovalDemoPriceChanges().forEach((row) => {
    if (!next.some((o) => o.id === row.id)) next.unshift(row)
  })
  return next
}
