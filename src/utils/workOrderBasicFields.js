import { findSalesOrderByOrderNo, getSalesOrderById } from '@/store/salesOrderStore'

export function formatWorkOrderFieldValue(value) {
  if (value === 0) return '0'
  const text = String(value ?? '').trim()
  return text || '—'
}

export function formatWorkOrderPlanDateRange(range) {
  if (!range?.length) return '—'
  const start = range[0]
  const end = range[1]
  if (!start || !end) return '—'
  return `${start} ~ ${end}`
}

export function resolveWorkOrderSalesMeta(workOrder) {
  if (!workOrder) return { customerName: '', salesperson: '' }
  if (workOrder.customerName || workOrder.salesperson) {
    return {
      customerName: workOrder.customerName || '',
      salesperson: workOrder.salesperson || '',
    }
  }
  const order =
    (workOrder.salesOrderId && getSalesOrderById(workOrder.salesOrderId)) ||
    findSalesOrderByOrderNo(workOrder.sourceOrderNo)
  return {
    customerName: order?.customerName || '',
    salesperson: order?.salesperson || '',
  }
}

function resolveWorkOrderSalesOrder(workOrder) {
  if (!workOrder) return null
  return (
    (workOrder.salesOrderId && getSalesOrderById(workOrder.salesOrderId)) ||
    findSalesOrderByOrderNo(workOrder.sourceOrderNo) ||
    null
  )
}

function findWorkOrderSalesLine(workOrder, order) {
  const lines = order?.lineItems || []
  if (!lines.length) return null
  if (workOrder.salesLineId) {
    const byId = lines.find((line) => line.id === workOrder.salesLineId)
    if (byId) return byId
  }
  const productName = String(workOrder.productName || '').trim()
  const materialCode = String(workOrder.materialCode || '').trim()
  if (productName || materialCode) {
    const byProduct = lines.find((line) => {
      if (productName && line.productName === productName) return true
      if (materialCode && line.productCode === materialCode) return true
      return false
    })
    if (byProduct) return byProduct
  }
  return lines.length === 1 ? lines[0] : null
}

/** 从关联销售订单明细取交付日期 */
export function resolveWorkOrderDeliveryDate(workOrder) {
  const order = resolveWorkOrderSalesOrder(workOrder)
  const line = findWorkOrderSalesLine(workOrder, order)
  return line?.deliveryDate || ''
}

export function hasWorkOrderSalesInfo(workOrder) {
  return Boolean(String(workOrder?.sourceOrderNo || '').trim())
}

export function buildWorkOrderSalesSummaryText(workOrder) {
  if (!hasWorkOrderSalesInfo(workOrder)) return ''
  const salesMeta = resolveWorkOrderSalesMeta(workOrder)
  return `${workOrder.sourceOrderNo} / ${formatWorkOrderFieldValue(salesMeta.customerName)} / ${formatWorkOrderFieldValue(salesMeta.salesperson)}`
}

/** @deprecated 保留兼容，新 UI 直接使用表单字段 */
export function buildWorkOrderProductionFieldGroups(workOrder) {
  if (!workOrder) return { detail: [], arrangement: [] }
  const salesMeta = resolveWorkOrderSalesMeta(workOrder)
  return {
    detail: [
      { label: '销售单号', value: workOrder.sourceOrderNo },
      { label: '客户名称', value: salesMeta.customerName },
      { label: '业务员', value: salesMeta.salesperson },
      { label: '产品名称', value: workOrder.productName },
      { label: '规格型号', value: workOrder.specModel },
      { label: '材质', value: workOrder.material },
      { label: '图号', value: workOrder.drawingNo },
      { label: '技术参数', value: workOrder.techParams },
      { label: '配套要求', value: workOrder.matchingRequirements },
      { label: '物料清单', value: workOrder.bomLabel || workOrder.bom },
      { label: '工艺路线', value: workOrder.processRouteName },
      { label: '计划数量', value: workOrder.planQty },
      { label: '排产数量', value: workOrder.scheduleQty },
    ],
    arrangement: [
      { label: '工作中心', value: workOrder.workCenter },
      { label: '预入仓库', value: workOrder.warehouse },
      { label: '紧急度', value: workOrder.urgency },
      { label: '计划日期', value: formatWorkOrderPlanDateRange(workOrder.planDateRange) },
      { label: '工单备注', value: workOrder.remark, span: 3 },
    ],
  }
}

export function buildWorkOrderCreateExtras(form, componentLines = []) {
  return {
    productId: form.productId || '',
    materialCode: form.materialCode || '',
    specModel: form.specModel || '',
    material: form.material || '',
    drawingNo: form.drawingNo || '',
    techParams: form.techParams || '',
    matchingRequirements: form.matchingRequirements || '',
    bomLabel: form.bomLabel || '',
    bomId: form.bomId || '',
    customerName: form.customerName || '',
    salesperson: form.salesperson || '',
    owner: form.owner || '',
    componentLines: JSON.parse(JSON.stringify(componentLines || [])),
  }
}
