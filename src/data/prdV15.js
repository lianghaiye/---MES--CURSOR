/**
 * I-DOMS 机泵产业互联网平台 — 1.5 版本迭代 PRD
 * 描述风格对齐飞书 PRD：https://iipcloud.feishu.cn/wiki/VNJCwfZBMivZoxkOPygcRxqRn8d
 */

import { PRD_V15_MODULES } from './prdV15Modules'

export { PRD_V15_MODULES }

export const PRD_V15_META = {
  version: '1.5',
  title: '机泵1.5版本迭代',
  project: '淄博泵产业互联网平台（I-DOMS）',
  sprint: '机泵1.5',
  updatedAt: '2026-05-28',
  scope: 'Web 端 MES 主系统 + 小程序现场作业端',
  feishuReference: 'https://iipcloud.feishu.cn/wiki/VNJCwfZBMivZoxkOPygcRxqRn8d',
}

/** 工资核算公式附录 */
export const PRD_V15_WAGE_FORMULAS = [
  {
    title: '批量计件 + 计件工资（不良品折扣率）',
    formula:
      '计薪 = 良品数 × 单件计件单价 + Σ(某原因不良品数 × 单件计件单价 × 该原因折扣率) + 补贴工资 − 质量扣款',
  },
  {
    title: '批量计件 + 计件工资（不良品固定扣款）',
    formula:
      '计薪 = 良品数 × 单件计件单价 + Σ(某原因不良品数 × 单件计件单价 − 某原因不良品数 × 固定扣款金额) + 补贴工资 − 质量扣款',
  },
  {
    title: '批量计件 + 计时工资（不良品折扣率）',
    formula:
      '计薪 = (整批准备工时 ÷ 60 + 补贴工数 × 补贴单价 + (良品数 + Σ(不良品数 × 折扣率)) × 单件标准工时 ÷ 60) × 标准工时单价 + 补贴固定金额 − 质量扣款',
  },
  {
    title: '时长报工 + 计时工资',
    formula: '计薪 = (整批准备工时 ÷ 60 + 工作时长) × 标准工时单价 + 补贴工资 − 质量扣款',
  },
]
