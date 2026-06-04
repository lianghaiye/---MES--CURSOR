import dayjs from 'dayjs'
import { customerOptions, salespersonOptions } from '@/mock/salesOrderOptions'
import { createLineItem, createSalesOrder } from '@/mock/salesOrders'
import { catalogBomIdForProduct } from '@/mock/productBomSeed'
import { formatBomVersion, getBomVersionYear } from '@/utils/bomVersion'

function bomMetaForProduct(product) {
  const year = getBomVersionYear()
  return {
    bomId: catalogBomIdForProduct(product.id),
    bomName: `${product.name} BOM`,
    bomVersion: formatBomVersion(year, 1),
  }
}

function lineFromProduct(product, partial = {}) {
  const qty = partial.salesQty ?? partial.qty ?? 1
  const unitPrice = Number(product.unitPrice) || 100
  const taxRate = partial.taxRate ?? 13
  const ex = partial.unitPriceExTax ?? unitPrice
  const totalEx = ex * qty
  const totalIn = totalEx * (1 + taxRate / 100)

  return createLineItem({
    productId: product.id,
    productAttr: product.productAttribute,
    productName: product.name,
    productCode: product.code,
    specAttr: product.standardSpec || '标准',
    specModel: product.specModel,
    material: product.material || '',
    category: product.categoryName || '',
    unit: product.inventoryUnit || '件',
    deliveryDate: partial.deliveryDate || dayjs().add(14, 'day').format('YYYY-MM-DD'),
    salesQty: qty,
    taxRate,
    unitPriceExTax: ex,
    unitPriceInTax: Number((ex * (1 + taxRate / 100)).toFixed(2)),
    totalPriceExTax: Number(totalEx.toFixed(2)),
    totalPriceInTax: Number(totalIn.toFixed(2)),
    ...bomMetaForProduct(product),
    ...partial,
  })
}

/**
 * 生成与销售订单 store 配套的演示订单（含自产/外购、已审/未审）
 */
export function buildMockSalesOrders(products) {
  if (!products?.length) return []

  const p = (i) => products[i % products.length]
  const customers = customerOptions.map((c) => c.value)
  const salespeople = salespersonOptions

  const orders = [
    createSalesOrder({
      id: 'so-seed-1',
      orderNo: '1-20260512-005',
      contractNo: 'HT-20260512-005',
      customerName: customers[0] || '测试人员',
      region: '华北',
      salesperson: salespeople[0],
      progressStatus: '已审',
      businessType: '自产销售',
      documentDate: '2026-05-12',
      urgency: '正常',
      remark: '多明细自产订单（已审，已联动生产计划）',
      contactPerson: 'TEST',
      contactPhone: '16522033362',
      lineItems: [
        lineFromProduct(p(0), { id: 'line-seed-1a', salesQty: 3, deliveryMode: '整机' }),
        lineFromProduct(p(1), { id: 'line-seed-1b', salesQty: 2, deliveryMode: '散件' }),
        lineFromProduct(p(2), { id: 'line-seed-1c', salesQty: 1, deliveryMode: '整机' }),
      ],
    }),
    createSalesOrder({
      id: 'so-seed-2',
      orderNo: '1-20260520-008',
      contractNo: 'HT-20260520-008',
      customerName: customers[1] || '华东机械制造有限公司',
      region: '华东',
      salesperson: salespeople[1] || '张三',
      progressStatus: '已审',
      businessType: '自产销售',
      documentDate: '2026-05-20',
      urgency: '紧急',
      remark: '双产品紧急自产',
      lineItems: [
        lineFromProduct(p(5), { id: 'line-seed-2a', salesQty: 8 }),
        lineFromProduct(p(6), { id: 'line-seed-2b', salesQty: 4 }),
      ],
    }),
    createSalesOrder({
      id: 'so-seed-3',
      orderNo: '1-20260525-011',
      customerName: customers[0] || '测试人员',
      region: '华北',
      salesperson: salespeople[0],
      progressStatus: '未审',
      businessType: '自产销售',
      documentDate: '2026-05-25',
      urgency: '正常',
      lineItems: [lineFromProduct(p(10), { id: 'line-seed-3a', salesQty: 5 })],
    }),
    createSalesOrder({
      id: 'so-seed-4',
      orderNo: '1-20260518-003',
      customerName: '深圳精密模具科技',
      region: '华南',
      salesperson: '李四',
      progressStatus: '已审',
      businessType: '自产销售',
      documentDate: '2026-05-18',
      urgency: '加急',
      lineItems: [
        lineFromProduct(p(20), { id: 'line-seed-4a', salesQty: 6 }),
        lineFromProduct(p(21), { id: 'line-seed-4b', salesQty: 2 }),
      ],
    }),
    createSalesOrder({
      id: 'so-seed-5',
      orderNo: 'XSDD202605001',
      customerName: '苏州汽车零部件厂',
      region: '华东',
      salesperson: '王五',
      progressStatus: '已审',
      businessType: '外购销售',
      documentDate: '2026-05-10',
      urgency: '普通',
      remark: '外购销售（审核生成采购申请，不生成计划）',
      lineItems: [
        lineFromProduct(p(30), {
          id: 'line-seed-5a',
          salesQty: 10,
          productAttr: '外购',
        }),
      ],
    }),
    createSalesOrder({
      id: 'so-seed-6',
      orderNo: '1-20260528-015',
      customerName: customers[2] || '人纷纷',
      region: '华东',
      salesperson: salespeople[0],
      progressStatus: '未审',
      businessType: '自产销售',
      documentDate: '2026-05-28',
      lineItems: [
        lineFromProduct(p(3), { id: 'line-seed-6a', salesQty: 12 }),
        lineFromProduct(p(4), { id: 'line-seed-6b', salesQty: 6 }),
      ],
    }),
    createSalesOrder({
      id: 'so-seed-7',
      orderNo: '1-20260501-001',
      customerName: '武汉重工装备',
      region: '华中',
      salesperson: '赵六',
      progressStatus: '已审',
      businessType: '自产销售',
      documentDate: '2026-05-01',
      urgency: '正常',
      lineItems: [lineFromProduct(p(50), { id: 'line-seed-7a', salesQty: 3 })],
    }),
    createSalesOrder({
      id: 'so-seed-8',
      orderNo: '1-20260415-002',
      customerName: '成都电子科技',
      region: '西南',
      salesperson: '张三',
      progressStatus: '已审',
      businessType: '质检服务',
      documentDate: '2026-04-15',
      lineItems: [lineFromProduct(p(60), { id: 'line-seed-8a', salesQty: 1 })],
    }),
  ]

  return orders
}
