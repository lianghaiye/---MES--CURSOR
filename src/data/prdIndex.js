/**
 * IDOMS PRD 迭代索引 — 全量展示各版本迭代需求入口
 */

export const PRD_INDEX_META = {
  title: 'IDOMS PRD',
  subtitle: '淄博泵产业互联网平台（I-DOMS）产品需求文档总览',
  updatedAt: '2026-05-28',
  feishuReference: 'https://iipcloud.feishu.cn/wiki/VNJCwfZBMivZoxkOPygcRxqRn8d',
}

/** @type {{ version: string, title: string, sprint: string, path: string, updatedAt: string, scope: string, moduleCount: number, featureCount: number, status: 'released'|'active'|'planned', summary: string }[]} */
export const PRD_ITERATIONS = [
  {
    version: '1.5',
    title: '机泵1.5版本迭代',
    sprint: '机泵1.5',
    path: '/home/prd/v15',
    updatedAt: '2026-05-28',
    scope: 'Web 端 MES 主系统 + 小程序现场作业端',
    moduleCount: 14,
    featureCount: 42,
    status: 'released',
    summary:
      '首版 MES 核心能力：主数据、销售、计划、工单、报工工资、库存质检采购及小程序端；各模块含背景、功能描述、业务规则与流程说明。',
  },
  {
    version: '1.5.1',
    title: '机泵1.5.1版本迭代',
    sprint: '淄博泵产业互联网平台-1.5.1',
    path: '/home/prd/v151',
    updatedAt: '2026-06-25',
    scope: 'Web 端增量需求（含产品 BOM、产品/物料信息等）',
    moduleCount: 14,
    featureCount: 22,
    status: 'active',
    summary:
      '在 1.5 基础上的增量迭代。已录入产品 BOM 14 条、产品/物料信息 8 条需求；销售、计划等模块需求将随迭代推进补充。',
  },
]

export const PRD_DOC_SECTIONS = [
  {
    key: 'structure',
    title: '文档结构说明',
    items: [
      '每个迭代版本独立成页，左侧为固定模块导航树，右侧为需求详情（背景、功能描述、业务规则、业务流程、验收标准）。',
      '模块树不随右侧内容滚动而消失；搜索时侧栏仍展示完整模块结构，右侧过滤匹配条目。',
      '需求状态：已实现 / 部分实现 / 规划中；1.5.1 增量需求标注优先级 P0/P1/P2。',
    ],
  },
  {
    key: 'owners',
    title: '角色与责任',
    items: [
      '需求负责人：邓利佳 — 需求定义、方案确认。',
      '验收负责人：梁海曳 — 功能验收、业务规则确认。',
      '云效迭代与系统 PRD 文档保持同步，工作项描述可复制 PRD 对应章节。',
    ],
  },
  {
    key: 'reference',
    title: '参考文档',
    items: [
      '飞书 PRD 原文：https://iipcloud.feishu.cn/wiki/VNJCwfZBMivZoxkOPygcRxqRn8d',
      '1.5.1 产品 BOM 云效 Markdown：docs/yunxiao/淄博泵产业互联网平台-1.5.1-产品BOM需求.md',
      '1.5.1 产品/物料信息 云效 Markdown：docs/yunxiao/淄博泵产业互联网平台-1.5.1-产品物料需求.md',
      '1.5.1 生产计划 云效 Markdown：docs/yunxiao/淄博泵产业互联网平台-1.5.1-生产计划需求.md',
      '1.5.1 设计任务 云效 Markdown：docs/yunxiao/淄博泵产业互联网平台-1.5.1-设计任务需求.md',
      '1.5.1 产品/物料需求清单页：/home/prd/v151/product-material',
    ],
  },
]
