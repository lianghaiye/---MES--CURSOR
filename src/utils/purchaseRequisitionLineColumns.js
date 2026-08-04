/** 采购申请明细列定义（新增/编辑表单） */

export const purchaseRequisitionFormLineColumns = [
  { title: '序号', key: 'index', width: 56, align: 'center' },
  { title: '产品名称', dataIndex: 'productName', key: 'productName', width: 140, ellipsis: true },
  { title: '产品编码', dataIndex: 'productCode', key: 'productCode', width: 120, ellipsis: true },
  { title: '规格型号', dataIndex: 'specModel', key: 'specModel', width: 110, ellipsis: true },
  { title: '材质', dataIndex: 'material', key: 'material', width: 90, ellipsis: true },
  {
    title: '变体属性',
    dataIndex: 'variantSummary',
    key: 'variantAttr',
    width: 140,
    ellipsis: true,
  },
  { title: '图号', dataIndex: 'drawingNo', key: 'drawingNo', width: 100, ellipsis: true },
  { title: '采购单位', dataIndex: 'unit', key: 'unit', width: 80 },
  {
    title: '订货尺寸',
    dataIndex: 'orderSizeText',
    key: 'orderSizeText',
    width: 160,
    ellipsis: true,
  },
  { title: '库存需求', dataIndex: 'demandQty', key: 'demandQty', width: 90, align: 'right' },
  { title: '换算', dataIndex: 'convertHint', key: 'convertHint', width: 110, ellipsis: true },
  { title: '库存数', dataIndex: 'stockQty', key: 'stockQty', width: 90, align: 'right' },
  { title: '计划采购数', key: 'planPurchaseQty', width: 110 },
  { title: '供应商', key: 'supplierName', width: 160 },
  { title: '销售单号', dataIndex: 'salesOrderNo', key: 'salesOrderNo', width: 140, ellipsis: true },
  { title: '备注', key: 'remark', width: 140, ellipsis: true },
  { title: '操作', key: 'actions', width: 80 },
]

/** 采购申请详情页明细列（与表单一致，只读，不含操作列） */
export const purchaseRequisitionDetailLineColumns = purchaseRequisitionFormLineColumns.filter(
  (col) => col.key !== 'actions',
)
