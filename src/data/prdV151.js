/**
 * 淄博泵产业互联网平台 — 1.5.1 迭代 PRD
 * 按业务模块组织；产品 BOM 为当前已录入需求，其余模块预留扩展
 */

import { PRD_V151_PRODUCT_BOM_REQUIREMENTS } from './prdV151ProductBom'

export const PRD_V151_META = {
  version: '1.5.1',
  title: '机泵1.5.1版本迭代',
  project: '淄博泵产业互联网平台（I-DOMS）',
  sprint: '淄博泵产业互联网平台-1.5.1',
  updatedAt: '2026-06-24',
  scope: 'Web 端增量需求',
  requirementOwner: '邓利佳',
  acceptanceOwner: '欧阳宏汉',
}

/** 1.5.1 固定模块树（与系统顶栏模块一致，便于跨版本对照） */
export const PRD_V151_MODULE_SKELETON = [
  { key: 'product-process', label: '产品工艺' },
  { key: 'sales', label: '销售管理' },
  { key: 'planning', label: '计划排产' },
  { key: 'production', label: '生产管理' },
  { key: 'report-management', label: '报工管理' },
  { key: 'labor-salary', label: '工时工资' },
  { key: 'inventory', label: '库存管理' },
  { key: 'quality', label: '质量管理' },
  { key: 'procurement', label: '采购管理' },
  { key: 'after-sales', label: '售后管理' },
  { key: 'basic-config', label: '基础配置' },
  { key: 'system', label: '系统管理' },
  { key: 'mobile', label: '小程序端' },
  { key: 'extension', label: '扩展模块' },
]

function bomFeatures() {
  return PRD_V151_PRODUCT_BOM_REQUIREMENTS.map((req) => ({
    id: req.id,
    name: req.title,
    status: req.status,
    priority: req.priority,
    requirementOwner: req.requirementOwner,
    acceptanceOwner: req.acceptanceOwner,
    background: req.background,
    description: req.description,
    rules: req.rules,
    acceptance: req.acceptance,
  }))
}

/** @type {{ key: string, label: string, features: object[] }[]} */
export const PRD_V151_MODULES = PRD_V151_MODULE_SKELETON.map((mod) => {
  if (mod.key === 'product-process') {
    return { ...mod, features: bomFeatures() }
  }
  return { ...mod, features: [] }
})

export { PRD_V151_PRODUCT_BOM_REQUIREMENTS }
