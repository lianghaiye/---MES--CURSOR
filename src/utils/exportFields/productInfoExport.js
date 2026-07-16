import { formatBusinessTypeLabels } from '@/utils/businessTypeLabel'
import { getBomInfoLabelForItem } from '@/store/productBomStore'
import { cell, numCell } from './exportFieldHelpers'

function formatDate(val) {
  if (!val) return ''
  return String(val).slice(0, 10)
}

function yesNo(val) {
  return val ? '是' : '否'
}

export const productInfoExportFields = [
  { key: 'code', title: '产品编号', getValue: (row) => cell(row, 'code') },
  { key: 'name', title: '产品名称', getValue: (row) => cell(row, 'name') },
  { key: 'specModel', title: '规格型号', getValue: (row) => cell(row, 'specModel') },
  { key: 'material', title: '材质', getValue: (row) => cell(row, 'material') },
  { key: 'drawingNo', title: '图号', getValue: (row) => cell(row, 'drawingNo') },
  {
    key: 'businessType',
    title: '业务类型',
    getValue: (row) => formatBusinessTypeLabels(row) || '',
  },
  { key: 'categoryName', title: '类别', getValue: (row) => cell(row, 'categoryName') },
  { key: 'productAttribute', title: '产品属性', getValue: (row) => cell(row, 'productAttribute') },
  { key: 'techParams', title: '技术参数', getValue: (row) => cell(row, 'techParams') },
  {
    key: 'matchingRequirements',
    title: '配套要求',
    getValue: (row) => cell(row, 'matchingRequirements') || cell(row, 'remark'),
  },
  { key: 'weight', title: '重量', getValue: (row) => numCell(row.weight) },
  { key: 'inventoryUnit', title: '库存单位', getValue: (row) => cell(row, 'inventoryUnit') },
  { key: 'unitPrice', title: '标准单价(不含税)', getValue: (row) => numCell(row.unitPrice) },
  {
    key: 'bomInfo',
    title: 'BOM信息',
    getValue: (row) => getBomInfoLabelForItem('product', row.id) || '',
  },
  {
    key: 'defaultWorkCenter',
    title: '默认工作中心',
    getValue: (row) => row.production?.defaultWorkCenter || '',
  },
  {
    key: 'defaultSupplier',
    title: '默认供应商',
    getValue: (row) => row.production?.defaultSupplier || '',
  },
  {
    key: 'isProductMaterial',
    title: '产品物料',
    getValue: (row) => yesNo(row.isProductMaterial),
  },
  { key: 'createdAt', title: '创建日期', getValue: (row) => formatDate(row.createdAt) },
  { key: 'updatedAt', title: '更新日期', getValue: (row) => formatDate(row.updatedAt) },
  { key: 'creator', title: '创建人', getValue: (row) => cell(row, 'creator') },
]
