import { cell } from './exportFieldHelpers'
import { lineVariantSummary } from '@/utils/spuLineResolve'
import {
  resolveInventoryDeductDocNo,
  resolveDeductSourceLabel,
} from '@/mock/materialRequisitionRecords'

function lineVariantText(line = {}) {
  return lineVariantSummary(line) || line.variantSummary || ''
}

/** 库存扣减记录导出（含物料明细，一行一物料） */
export const inventoryDeductExportFields = [
  {
    key: 'workOrderNo',
    title: '工单/领料单号',
    getValue: (row) => cell(row, 'docNo') || cell(row, 'workOrderNo'),
  },
  { key: 'deductNo', title: '扣减单号', getValue: (row) => cell(row, 'deductNo') },
  { key: 'deductSource', title: '扣减来源', getValue: (row) => cell(row, 'deductSource') },
  { key: 'productName', title: '产品名称', getValue: (row) => cell(row, 'productName') },
  { key: 'productSpec', title: '规格型号', getValue: (row) => cell(row, 'productSpec') },
  { key: 'material', title: '材质', getValue: (row) => cell(row, 'material') },
  { key: 'drawingNo', title: '图号', getValue: (row) => cell(row, 'drawingNo') },
  { key: 'reportQty', title: '报工数量', getValue: (row) => cell(row, 'reportQty') },
  { key: 'deductTime', title: '扣减时间', getValue: (row) => cell(row, 'deductTime') },
  { key: 'warehouseName', title: '仓库', getValue: (row) => cell(row, 'warehouseName') },
  { key: 'warehouseCode', title: '仓库编码', getValue: (row) => cell(row, 'warehouseCode') },
  { key: 'status', title: '扣减状态', getValue: (row) => cell(row, 'status') },
  { key: 'materialCode', title: '物料编码', getValue: (row) => cell(row, 'materialCode') },
  { key: 'materialName', title: '物料名称', getValue: (row) => cell(row, 'materialName') },
  { key: 'lineSpecModel', title: '规格型号', getValue: (row) => cell(row, 'lineSpecModel') },
  { key: 'lineMaterial', title: '材质', getValue: (row) => cell(row, 'lineMaterial') },
  { key: 'lineDrawingNo', title: '图号', getValue: (row) => cell(row, 'lineDrawingNo') },
  {
    key: 'lineVariantSummary',
    title: '变体属性',
    getValue: (row) => cell(row, 'lineVariantSummary'),
  },
  {
    key: 'blankSizeText',
    title: '下料尺寸',
    getValue: (row) => cell(row, 'blankSizeText'),
  },
  { key: 'planQty', title: '应扣数量', getValue: (row) => cell(row, 'planQty') },
  { key: 'actualQty', title: '实扣数量', getValue: (row) => cell(row, 'actualQty') },
  { key: 'lineStatus', title: '物料状态', getValue: (row) => cell(row, 'lineStatus') },
  { key: 'failReason', title: '失败原因', getValue: (row) => cell(row, 'failReason') },
]

/** 将扣减记录展开为物料明细行 */
export function flattenInventoryDeductRows(records = []) {
  const rows = []
  records.forEach((r) => {
    const docNo = resolveInventoryDeductDocNo(r)
    const lines = r.lines || []
    if (!lines.length) {
      rows.push({
        docNo,
        workOrderNo: docNo,
        deductNo: r.deductNo,
        deductSource: resolveDeductSourceLabel(r),
        productName: r.productName,
        productSpec: r.productSpec,
        material: r.material || '',
        drawingNo: r.drawingNo || '',
        reportQty: r.reportQty,
        deductTime: r.deductTime || '',
        warehouseName: r.warehouseName,
        warehouseCode: r.warehouseCode,
        status: r.status,
        materialCode: '',
        materialName: '',
        lineSpecModel: '',
        lineMaterial: '',
        lineDrawingNo: '',
        lineVariantSummary: '',
        blankSizeText: '',
        planQty: '',
        actualQty: '',
        lineStatus: '',
        failReason: '',
      })
      return
    }
    lines.forEach((l) => {
      rows.push({
        docNo,
        workOrderNo: docNo,
        deductNo: r.deductNo,
        deductSource: resolveDeductSourceLabel(r),
        productName: r.productName,
        productSpec: r.productSpec,
        material: r.material || '',
        drawingNo: r.drawingNo || '',
        reportQty: r.reportQty,
        deductTime: r.deductTime || '',
        warehouseName: r.warehouseName,
        warehouseCode: r.warehouseCode,
        status: r.status,
        materialCode: l.materialCode,
        materialName: l.materialName,
        lineSpecModel: l.specModel || '',
        lineMaterial: l.material || '',
        lineDrawingNo: l.drawingNo || '',
        lineVariantSummary: lineVariantText(l),
        blankSizeText: l.blankSizeText || '',
        planQty: l.planQty,
        actualQty: l.actualQty,
        lineStatus: l.status,
        failReason: l.failReason || '',
      })
    })
  })
  return rows
}
