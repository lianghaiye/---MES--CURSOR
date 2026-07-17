import dayjs from 'dayjs'
import { customerOptions, salespersonOptions } from '@/mock/salesOrderOptions'
import { createLineItem, createSalesOrder } from '@/mock/salesOrders'
import { catalogBomIdForProduct } from '@/mock/productBomSeed'
import { formatBomVersion, getBomVersionYear } from '@/utils/bomVersion'
import { MAINTENANCE_SERVICE_BUSINESS_TYPE } from '@/utils/salesOrderBusiness'
import {
  buildEcnBoundLine,
  buildEcnDemoSalesOrder,
  findEcnDemoProduct,
} from '@/mock/ecnDemoBootstrap'

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
  const now = dayjs()

  const orders = [
    createSalesOrder({
      id: 'so-seed-1',
      orderNo: '1-20260512-005',
      contractNo: 'HT-20260512-005',
      customerName: '山东化工泵业集团',
      region: '华北',
      salesperson: '王芳',
      progressStatus: '已审',
      businessType: '自产销售',
      documentDate: '2026-05-12',
      createdAt: '2026-05-12 09:30',
      creator: '王芳',
      approver: 'admin1',
      approvedAt: '2026-05-12 10:15',
      urgency: '正常',
      remark: '多明细自产订单（已审，已联动生产计划）',
      contactPerson: 'TEST',
      contactPhone: '16522033362',
      attachments: [
        {
          uid: 'att-seed-1',
          name: '合同-HT-20260512-005.pdf',
          type: '合同',
          uploadedAt: '2026-05-12 10:00',
        },
      ],
      deliveryApplications: [
        {
          id: 'da-seed-1',
          deliveryCode: 'SH20260513001',
          createdAt: '2026-05-13 14:30',
          deliveryDate: '2026-05-20',
          shipmentMethod: '物流',
          outboundWarehouse: '成品仓',
          status: '已提交',
          remark: '首批整机+散件发运',
          lineItems: [],
          scatterShipments: [],
          totalShipQty: 0,
        },
      ],
      lineItems: [
        (() => {
          const isgProduct = findEcnDemoProduct('ISG50-160') || p(0)
          return buildEcnBoundLine(isgProduct, {
            id: 'line-seed-1a',
            salesQty: 3,
            deliveryMode: '整机',
            techParams: 'Q=50m³/h H=32m，介质：清水',
            matchingRequirements: '含联轴器护罩及地脚螺栓',
            supplementDesc: '首批试制，需附出厂检验报告（绑定 ECN 升版前 BOM）',
            attachment: '明细附件-清水泵选型表.pdf',
          })
        })(),
        lineFromProduct(p(1), {
          id: 'line-seed-1b',
          salesQty: 2,
          deliveryMode: '散件',
          techParams: '介质：盐酸 30%，温度 65℃，需耐腐蚀材质',
          matchingRequirements: '散件交付，含密封组件及安装说明书',
          supplementDesc: '316L 材质，客户现场自行组装',
          attachment: '明细附件-化工泵工况说明.pdf',
        }),
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
      attachments: [
        {
          uid: 'att-seed-2',
          name: '华东机械-紧急订单合同.pdf',
          type: '合同',
          uploadedAt: '2026-05-20 08:30',
        },
      ],
      lineItems: [
        lineFromProduct(p(5), {
          id: 'line-seed-2a',
          salesQty: 8,
          techParams: 'Q=100m³/h H=50m，变频调速',
          matchingRequirements: '配套变频控制柜',
          supplementDesc: '交期紧急，优先排产',
          deliveryMode: '整机',
        }),
        lineFromProduct(p(6), { id: 'line-seed-2b', salesQty: 4 }),
      ],
    }),
    createSalesOrder({
      id: 'so-seed-custom-qj',
      orderNo: '1-20260601-018',
      contractNo: 'HT-20260601-018',
      customerName: '西北油田设备公司',
      region: '西北',
      salesperson: '陈磊',
      progressStatus: '已审',
      businessType: '自产销售',
      documentDate: '2026-06-01',
      urgency: '普通',
      remark: '定制潜水电泵项目（已生成设计任务）',
      contactPerson: '刘工',
      contactPhone: '13900001234',
      attachments: [
        {
          uid: 'att-qj-1',
          name: '西北油田-潜水电泵技术协议.pdf',
          type: '技术协议',
          uploadedAt: '2026-06-01 09:30',
        },
        {
          uid: 'att-qj-2',
          name: '现场井位照片.zip',
          type: '图片',
          uploadedAt: '2026-06-01 10:00',
        },
      ],
      lineItems: [
        lineFromProduct(p(3), {
          id: 'line-seed-custom-qj',
          productCode: 'CP2610004',
          productName: '潜水电泵 QJ200-40/3',
          productAttr: '定制-成品零部件',
          specModel: 'QJ200-40/3',
          material: '不锈钢316L',
          techParams: '井径 200mm，扬程 120m，流量 40m³/h',
          matchingRequirements: '配套控制柜、电缆及排水软管，含现场安装指导',
          supplementDesc: '叶轮材质要求不锈钢316L，客户指定品牌电机',
          deliveryMode: '整机',
          deliveryDate: now.add(60, 'day').format('YYYY-MM-DD'),
          salesQty: 2,
          unitPriceExTax: 8500,
          attachment: '明细附件-井位参数表.pdf',
        }),
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
      contractNo: 'HT-20260501-001',
      attachments: [
        {
          uid: 'att-seed-7',
          name: '武汉重工-采购合同.pdf',
          type: '合同',
          uploadedAt: '2026-05-01 11:00',
        },
      ],
      lineItems: [
        lineFromProduct(p(50), {
          id: 'line-seed-7a',
          salesQty: 3,
          techParams: '通过颗粒 25mm，自吸高度 5m',
          matchingRequirements: '整机交付，含进出口法兰及密封垫',
          supplementDesc: '已审核通过，EBOM 已定稿',
          deliveryMode: '整机',
          attachment: '明细附件-污水泵工况表.pdf',
        }),
      ],
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
    createSalesOrder({
      id: 'so-seed-9',
      orderNo: '1-20260602-001',
      customerName: '华东机械制造有限公司',
      region: '华东',
      salesperson: '王芳',
      progressStatus: '未审',
      businessType: MAINTENANCE_SERVICE_BUSINESS_TYPE,
      documentDate: '2026-06-02',
      createdAt: '2026-06-02 09:00',
      creator: '王芳',
      remark: '维修服务演示订单（审核通过后自动生成维修工单）',
      lineItems: [
        lineFromProduct(p(2), {
          id: 'line-seed-9a',
          businessType: MAINTENANCE_SERVICE_BUSINESS_TYPE,
          salesQty: 1,
          bomId: '',
          bomName: '',
          bomVersion: '',
          techParams: '叶轮磨损，需返厂维修',
          matchingRequirements: '维修后需附出厂检验报告',
          supplementDesc: '客户现场拆检后发回',
        }),
      ],
    }),
  ]

  const ecnDemoOrder = buildEcnDemoSalesOrder()
  if (ecnDemoOrder) {
    orders.unshift(createSalesOrder(ecnDemoOrder))
  }

  return orders
}
