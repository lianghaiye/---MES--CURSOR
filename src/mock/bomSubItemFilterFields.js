import { productAttributeOptions } from '@/mock/productInfoOptions'
import { materialTypeOptions, supplyFormOptions, inventoryUnitOptions } from '@/mock/materialInfoOptions'

export const bomSubItemFilterLogicOptions = [
  { label: '且', value: 'and' },
  { label: '或', value: 'or' },
]

export const bomSubItemFilterOperatorOptions = {
  text: [
    { label: '包含', value: 'contains' },
    { label: '等于', value: 'eq' },
    { label: '不等于', value: 'ne' },
    { label: '为空', value: 'empty' },
    { label: '不为空', value: 'notEmpty' },
  ],
  select: [
    { label: '等于', value: 'eq' },
    { label: '不等于', value: 'ne' },
    { label: '为空', value: 'empty' },
    { label: '不为空', value: 'notEmpty' },
  ],
  number: [
    { label: '等于', value: 'eq' },
    { label: '大于', value: 'gt' },
    { label: '小于', value: 'lt' },
    { label: '不等于', value: 'ne' },
    { label: '为空', value: 'empty' },
    { label: '不为空', value: 'notEmpty' },
  ],
}

export const bomSubItemFilterFields = [
  { key: 'name', label: '产品名称', type: 'text' },
  { key: 'code', label: '产品编号', type: 'text' },
  { key: 'specModel', label: '规格型号', type: 'text' },
  { key: 'itemType', label: '类型', type: 'select', options: ['产品', '物料'] },
  { key: 'categoryName', label: '类别', type: 'text' },
  { key: 'material', label: '材质', type: 'text' },
  { key: 'drawingNo', label: '图号', type: 'text' },
  { key: 'inventoryUnit', label: '单位', type: 'select', options: inventoryUnitOptions },
  { key: 'subItemCount', label: '子件项数', type: 'number' },
  { key: 'productAttribute', label: '产品属性', type: 'select', options: productAttributeOptions },
  { key: 'supplyForm', label: '供应型态', type: 'select', options: supplyFormOptions },
  { key: 'materialType', label: '物料类型', type: 'select', options: materialTypeOptions },
  { key: 'weight', label: '重量', type: 'number' },
  { key: 'processRoute', label: '工艺路线', type: 'text' },
  { key: 'defaultWarehouse', label: '默认仓库', type: 'text' },
  { key: 'defaultSupplier', label: '默认供应商', type: 'text' },
  { key: 'defaultWorkCenter', label: '默认加工中心', type: 'text' },
  { key: 'createdAt', label: '创建时间', type: 'text' },
  { key: 'creator', label: '创建人', type: 'text' },
]

export function createEmptyFilterCondition() {
  return {
    id: `cond-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    logic: 'and',
    field: 'name',
    operator: 'contains',
    value: '',
  }
}
