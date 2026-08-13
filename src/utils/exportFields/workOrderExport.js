import {
  formatWorkOrderFieldValue,
  formatWorkOrderPlanDateRange,
  resolveWorkOrderSalesMeta,
  resolveWorkOrderVariantSummary,
} from '@/utils/workOrderBasicFields'
import { cell } from './exportFieldHelpers'

function urgencyExportLabel(urgency) {
  if (urgency === '紧急' || urgency === '加急') return '紧急'
  return '不紧急'
}

export const workOrderExportFields = [
  { key: 'code', title: '工单编号', getValue: (row) => cell(row, 'code') },
  { key: 'name', title: '工单名称', getValue: (row) => cell(row, 'name') },
  {
    key: 'progress',
    title: '状态',
    getValue: (row) => formatWorkOrderFieldValue(row.status),
  },
  { key: 'sourceOrderNo', title: '销售订单号', getValue: (row) => cell(row, 'sourceOrderNo') },
  {
    key: 'customerName',
    title: '客户名称',
    getValue: (row) => formatWorkOrderFieldValue(resolveWorkOrderSalesMeta(row).customerName),
  },
  { key: 'productName', title: '产品名称', getValue: (row) => cell(row, 'productName') },
  { key: 'specModel', title: '规格型号', getValue: (row) => cell(row, 'specModel') },
  { key: 'material', title: '材质', getValue: (row) => cell(row, 'material') },
  {
    key: 'variantAttr',
    title: '变体属性',
    getValue: (row) => formatWorkOrderFieldValue(resolveWorkOrderVariantSummary(row)),
  },
  { key: 'drawingNo', title: '图号', getValue: (row) => cell(row, 'drawingNo') },
  { key: 'techParams', title: '技术参数', getValue: (row) => cell(row, 'techParams') },
  { key: 'processRouteName', title: '工艺路线', getValue: (row) => cell(row, 'processRouteName') },
  { key: 'planQty', title: '计划数量', getValue: (row) => formatWorkOrderFieldValue(row.planQty) },
  {
    key: 'scheduleQty',
    title: '排产数量',
    getValue: (row) => formatWorkOrderFieldValue(row.scheduleQty),
  },
  { key: 'workCenter', title: '工作中心', getValue: (row) => cell(row, 'workCenter') },
  {
    key: 'owner',
    title: '创建人',
    getValue: (row) => cell(row, 'creator') || cell(row, 'owner'),
  },
  {
    key: 'updatedAt',
    title: '更新时间',
    getValue: (row) => cell(row, 'updatedAt') || cell(row, 'createdAt'),
  },
  {
    key: 'updater',
    title: '更新人',
    getValue: (row) => cell(row, 'updater') || cell(row, 'creator') || cell(row, 'owner'),
  },
  { key: 'warehouse', title: '预入仓库', getValue: (row) => cell(row, 'warehouse') },
  {
    key: 'urgency',
    title: '紧急度',
    getValue: (row) => urgencyExportLabel(row.urgency),
  },
  {
    key: 'planDateRange',
    title: '计划日期',
    getValue: (row) => formatWorkOrderPlanDateRange(row.planDateRange),
  },
  { key: 'remark', title: '工单备注', getValue: (row) => cell(row, 'remark') },
  { key: 'orderCategory', title: '工单类别', getValue: (row) => cell(row, 'orderCategory') },
  { key: 'createdAt', title: '创建时间', getValue: (row) => cell(row, 'createdAt') },
]
