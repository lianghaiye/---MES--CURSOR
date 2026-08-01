import { cell } from './exportFieldHelpers'
import { lineVariantSummary } from '@/utils/spuLineResolve'

function resolveVariantAttr(line = {}) {
  return lineVariantSummary(line) || line.variantSummary || ''
}

/** 领料申请导出（含申请领取的物料明细与数量，一行一物料） */
export const materialRequisitionExportFields = [
  { key: 'reqNo', title: '申请单号', getValue: (row) => cell(row, 'reqNo') },
  { key: 'auditStatus', title: '申请状态', getValue: (row) => cell(row, 'auditStatus') },
  { key: 'modeLabel', title: '领料方式', getValue: (row) => cell(row, 'modeLabel') },
  { key: 'workOrderText', title: '关联工单', getValue: (row) => cell(row, 'workOrderText') },
  { key: 'productText', title: '产品/摘要', getValue: (row) => cell(row, 'productText') },
  { key: 'workshop', title: '领用车间', getValue: (row) => cell(row, 'workshop') },
  { key: 'receiveWarehouse', title: '领入仓库', getValue: (row) => cell(row, 'receiveWarehouse') },
  { key: 'outboundDocNo', title: '出库单号', getValue: (row) => cell(row, 'outboundDocNo') },
  { key: 'outboundStatus', title: '出库状态', getValue: (row) => cell(row, 'outboundStatus') },
  { key: 'applicant', title: '申请人', getValue: (row) => cell(row, 'applicant') },
  { key: 'createdAt', title: '申请时间', getValue: (row) => cell(row, 'createdAt') },
  { key: 'itemCode', title: '物料编码', getValue: (row) => cell(row, 'itemCode') },
  { key: 'itemName', title: '物料名称', getValue: (row) => cell(row, 'itemName') },
  { key: 'specModel', title: '规格型号', getValue: (row) => cell(row, 'specModel') },
  { key: 'material', title: '材质', getValue: (row) => cell(row, 'material') },
  { key: 'variantAttr', title: '变体属性', getValue: (row) => cell(row, 'variantAttr') },
  { key: 'drawingNo', title: '图号', getValue: (row) => cell(row, 'drawingNo') },
  { key: 'blankSizeText', title: '下料尺寸', getValue: (row) => cell(row, 'blankSizeText') },
  { key: 'shipQty', title: '领料数量', getValue: (row) => cell(row, 'shipQty') },
  { key: 'shipWarehouse', title: '领料仓库', getValue: (row) => cell(row, 'shipWarehouse') },
  { key: 'sourceWorkOrders', title: '来源工单', getValue: (row) => cell(row, 'sourceWorkOrders') },
]

export function flattenMaterialRequisitionRows(records = [], helpers = {}) {
  const { relatedWorkOrderText, relatedProductText } = helpers
  const rows = []
  records.forEach((r) => {
    const workOrderText = relatedWorkOrderText ? relatedWorkOrderText(r) : r.workOrderCode || ''
    const productText = relatedProductText ? relatedProductText(r) : r.productName || ''
    const lines = r.lines || []
    if (!lines.length) {
      rows.push({
        reqNo: r.reqNo,
        auditStatus: r.auditStatus,
        modeLabel: r.modeLabel,
        workOrderText,
        productText,
        workshop: r.workshop,
        receiveWarehouse: r.receiveWarehouse || '',
        outboundDocNo: r.outboundDocNo || '',
        outboundStatus: r.outboundStatus || '',
        applicant: r.applicant,
        createdAt: r.createdAt,
        itemCode: '',
        itemName: '',
        specModel: '',
        material: '',
        variantAttr: '',
        drawingNo: '',
        blankSizeText: '',
        shipQty: '',
        shipWarehouse: '',
        sourceWorkOrders: '',
      })
      return
    }
    lines.forEach((l) => {
      const source =
        (l.sourceWorkOrders || [])
          .map((s) => `${s.workOrderCode || ''}×${s.qty || ''}`)
          .filter(Boolean)
          .join('；') || (l.lineSource === 'EBOM' ? '工单 EBOM' : l.lineSource || '')
      rows.push({
        reqNo: r.reqNo,
        auditStatus: r.auditStatus,
        modeLabel: r.modeLabel,
        workOrderText,
        productText,
        workshop: r.workshop,
        receiveWarehouse: r.receiveWarehouse || '',
        outboundDocNo: r.outboundDocNo || '',
        outboundStatus: r.outboundStatus || '',
        applicant: r.applicant,
        createdAt: r.createdAt,
        itemCode: l.itemCode || '',
        itemName: l.itemName || '',
        specModel: l.specModel || '',
        material: l.material || '',
        variantAttr: resolveVariantAttr(l),
        drawingNo: l.drawingNo || '',
        blankSizeText: l.blankSizeText || '',
        shipQty: l.shipQty ?? '',
        shipWarehouse: l.shipWarehouse || '',
        sourceWorkOrders: source,
      })
    })
  })
  return rows
}
