/**
 * 淄博泵产业互联网平台 — 1.5.1 迭代 · 产品 BOM 需求拆分
 * 用于云效迭代建需求及系统内 PRD 展示
 */

export const PRD_V151_META = {
  version: '1.5.1',
  title: '1.5.1 迭代 · 产品 BOM',
  project: '淄博泵产业互联网平台（I-DOMS）',
  sprint: '淄博泵产业互联网平台-1.5.1',
  module: '产品工艺 / 产品 BOM',
  updatedAt: '2026-06-24',
  requirementOwner: '邓利佳',
  acceptanceOwner: '欧阳宏汉',
}

/**
 * @typedef {Object} YunxiaoRequirement
 * @property {string} id 需求编号（建议云效工作项标题前缀）
 * @property {string} title 需求标题
 * @property {'done'|'partial'|'planned'} status
 * @property {string} priority 优先级 P0/P1/P2
 * @property {string} requirementOwner
 * @property {string} acceptanceOwner
 * @property {string} background
 * @property {string[]} description
 * @property {string[]} rules
 * @property {string[]} acceptance
 */

/** @type {YunxiaoRequirement[]} */
export const PRD_V151_PRODUCT_BOM_REQUIREMENTS = [
  {
    id: 'BOM-151-01',
    title: 'BOM 版本管理与状态流转',
    status: 'done',
    priority: 'P0',
    requirementOwner: '邓利佳',
    acceptanceOwner: '欧阳宏汉',
    background:
      '泵类产品 BOM 需版本化管理，支撑生产计划、工单投料与 EBOM 快照；同一物品仅允许一个生效版本。',
    description: [
      '版本号格式 V{年}.{次版本}，如 V2026.1；保存升版时自动归档旧生效版。',
      '状态：待发布 → 审核发布 → 生效 → 已归档；列表与详情展示状态标签。',
      '同物品仅一条生效 BOM；审核发布时自动归档原生效版本。',
      '历史版本 Tab、版本抽屉、操作记录。',
    ],
    rules: [
      '待发布可编辑、删除、审核发布；生效可编辑升版、归档；已归档可克隆。',
      '仅生效 BOM 可用于生产领料/工单引用。',
    ],
    acceptance: [
      '新建 BOM 保存后为待发布；编辑生效 BOM 保存产生新待发布版本并归档旧版。',
      '审核发布后状态变为生效，同物品其他生效版自动归档。',
      '版本号按年度次版本递增展示正确。',
    ],
  },
  {
    id: 'BOM-151-02',
    title: 'BOM 列表筛选、展示与列显隐',
    status: 'done',
    priority: 'P0',
    requirementOwner: '邓利佳',
    acceptanceOwner: '欧阳宏汉',
    background: 'BOM 数量多，需高效检索与自定义列表字段。',
    description: [
      '筛选：BOM 编号、名称、物品、状态、规格型号、材质、图号。',
      '列表字段：状态、名称、编号、物品、规格、材质、图号、版本、层级数、物料数、是否默认、生效/失效日期、配套要求。',
      '列显隐配置持久化；批量审核发布、归档、导出占位。',
    ],
    rules: ['名称、版本可点击跳转详情/版本抽屉。', '列设置与 localStorage 绑定。'],
    acceptance: ['筛选与分页正常；列显隐保存后刷新仍生效。'],
  },
  {
    id: 'BOM-151-03',
    title: 'BOM 列表操作列（按状态）',
    status: 'done',
    priority: 'P0',
    requirementOwner: '邓利佳',
    acceptanceOwner: '欧阳宏汉',
    background: '不同生命周期状态的 BOM 需差异化操作，避免误删误归档。',
    description: [
      '生效：编辑、查看关联 BOM、操作 ▼（归档、克隆）。',
      '已归档：克隆。',
      '待发布：启用、编辑、操作 ▼（删除、克隆）。',
    ],
    rules: ['启用即审核发布；删除仅待发布可用。'],
    acceptance: ['三种状态下按钮组合与交互符合设计；操作下拉可正常触发。'],
  },
  {
    id: 'BOM-151-04',
    title: 'BOM 新增/编辑页布局与基础信息',
    status: 'done',
    priority: 'P0',
    requirementOwner: '邓利佳',
    acceptanceOwner: '欧阳宏汉',
    background: '编辑页需同时维护树结构、父项信息与物料清单，布局需清晰可扩展。',
    description: [
      '左侧 BOM 树可拖拽调宽；支持收起/展开基础信息区。',
      '右上：收起信息、概览、查看关联 BOM、保存、取消。',
      'BOM 编码/名称/类型（默认基准 BOM）；父项产品信息含规格、材质、图号、工艺路线、技术参数（多行）、配套要求。',
      '技术参数位于工艺路线之后，多行输入。',
    ],
    rules: ['未选物品时不可保存；根节点选中时可编辑工艺路线与技术参数。'],
    acceptance: ['布局与按钮位置符合设计；技术参数为多行 textarea。'],
  },
  {
    id: 'BOM-151-05',
    title: 'BOM 树与物料清单维护',
    status: 'done',
    priority: 'P0',
    requirementOwner: '邓利佳',
    acceptanceOwner: '欧阳宏汉',
    background: '多级 BOM 结构是核心数据，需树节点与明细行一致。',
    description: [
      '树：选节点展示其下级物料清单；添加子项、按 BOM 添加、导入模板、切换物品。',
      '物料清单列显隐；拖拽排序；批量编辑；空明细行类别/类型/供应型态为空。',
      '无下级时展示缺省图（暂无子项）。',
    ],
    rules: ['树节点与 lineItems parentTreeId 一致；删除节点同步删除子树。'],
    acceptance: ['选树节点仅展示直接下级；空态与 MOCK 数据树行一致。'],
  },
  {
    id: 'BOM-151-06',
    title: '子项名称搜索选择器',
    status: 'done',
    priority: 'P0',
    requirementOwner: '邓利佳',
    acceptanceOwner: '欧阳宏汉',
    background: '添加明细行时需快速检索物料/产品，并支持打开完整选择弹窗。',
    description: [
      '子项名称列使用搜索选择器：边输边搜，选项格式 [编码] 名称。',
      '下拉底部「搜索更多…」打开添加子项弹窗（SelectBomMaterialModal）。',
      '选中后回填当前明细行物料信息。',
    ],
    rules: ['filter-option=false + 本地/主数据过滤；与添加子项弹窗数据一致。'],
    acceptance: ['输入关键字实时过滤；搜索更多可选中并回填行。'],
  },
  {
    id: 'BOM-151-07',
    title: '按 BOM 添加子项与引用标记',
    status: 'done',
    priority: 'P0',
    requirementOwner: '邓利佳',
    acceptanceOwner: '欧阳宏汉',
    background: '子件若已有 BOM，应引用其结构并记录 childBomId/版本，供关联查询与升版同步。',
    description: [
      '按 BOM 添加：添加本级物品并展开所选 BOM 下级结构。',
      '明细行写入 childBom、childBomVersion、childBomId、referencedItemId/Type。',
    ],
    rules: ['引用 BOM 时去掉其根节点，仅挂下级到当前树节点。'],
    acceptance: ['按 BOM 添加后树与明细正确；关联抽屉可查到子件 BOM。'],
  },
  {
    id: 'BOM-151-08',
    title: 'BOM 详情页',
    status: 'done',
    priority: 'P1',
    requirementOwner: '邓利佳',
    acceptanceOwner: '欧阳宏汉',
    background: '只读查看 BOM 结构与版本历史，操作集中在页头。',
    description: [
      'Tab：BOM 明细、历史版本、操作记录。',
      '右上：概览、查看关联 BOM、打印、编辑、归档、返回列表。',
      '左侧树只读可拖拽调宽；基础信息 descriptions；物料清单只读。',
    ],
    rules: ['已归档不可编辑；编辑跳转编辑页。'],
    acceptance: ['详情页布局与按钮符合设计；历史版本可跳转其他版本详情。'],
  },
  {
    id: 'BOM-151-09',
    title: 'BOM 概览弹窗',
    status: 'done',
    priority: 'P1',
    requirementOwner: '邓利佳',
    acceptanceOwner: '欧阳宏汉',
    background: '需整体查看 BOM 层级与用量，支持数量缩放与打印入口。',
    description: [
      '标题 BOM 概览；顶部物品名、数量缩放、打印、展开/收起、列设置。',
      '基础信息单行：BOM 编码、规格、版本、材质、图号、技术参数、配置要求。',
      '组件树表：序号不换行；列显隐；备注列。',
    ],
    rules: ['数量缩放仅影响单位用量展示；序号 1、1.1、1.2 层级格式。'],
    acceptance: ['概览树展开收起正常；序号列不换行；列设置生效。'],
  },
  {
    id: 'BOM-151-10',
    title: '概览供应单位列',
    status: 'done',
    priority: 'P1',
    requirementOwner: '邓利佳',
    acceptanceOwner: '欧阳宏汉',
    background: '供应型态不同，供方信息来源不同，需在概览与打印中展示。',
    description: [
      '新增列「供应单位」：外协→外协：【默认供应商】；外购→采购：【默认供应商】；自制→自制：【默认加工中心】。',
      '数据取自产品/物料主数据 production 字段；纳入列显隐与打印。',
    ],
    rules: ['优先明细行供应型态，回退主数据；无值显示 —。'],
    acceptance: ['三种供应型态展示格式正确；隐藏列不打印。'],
  },
  {
    id: 'BOM-151-11',
    title: 'BOM 打印与预览',
    status: 'done',
    priority: 'P1',
    requirementOwner: '邓利佳',
    acceptanceOwner: '欧阳宏汉',
    background: '车间与计划需纸质或 PDF 化 BOM 清单，字段需与列设置一致。',
    description: [
      '打印弹窗：预览 / 下载 PDF（预留）/ 直接打印；纸张 A4/A3、方向、数量。',
      '预览新标签页打开；样式适配纸宽、长文本换行。',
      '仅输出列显隐中已显示字段。',
    ],
    rules: ['预览页可再次打印；直接打印打开预览并调起浏览器打印。'],
    acceptance: ['预览不超出纸宽；隐藏列不出现在预览/打印中。'],
  },
  {
    id: 'BOM-151-12',
    title: '查看关联 BOM 抽屉',
    status: 'done',
    priority: 'P1',
    requirementOwner: '邓利佳',
    acceptanceOwner: '欧阳宏汉',
    background: '需追溯 BOM 间引用关系，便于升版影响分析。',
    description: [
      '列表/详情/编辑页「查看关联 BOM」；右侧抽屉。',
      'Tab：子件 BOM（本 BOM 引用的子件）、父级 BOM（引用本 BOM 的上级）。',
      '列表：BOM 名称、编码、物品名称、规格、材质、图号、单位用量、子件项数；名称可进详情。',
    ],
    rules: ['子件 BOM 来自 childBomId 等引用字段；父级来自全库反查。'],
    acceptance: ['两 Tab 数据正确；抽屉从右侧弹出。'],
  },
  {
    id: 'BOM-151-13',
    title: '审核发布与父级引用同步升级',
    status: 'done',
    priority: 'P0',
    requirementOwner: '邓利佳',
    acceptanceOwner: '欧阳宏汉',
    background: '子 BOM 升版生效后，引用它的父级 BOM 需可选同步升级引用版本。',
    description: [
      '审核发布（启用）时检测父级 BOM 引用。',
      '弹窗：检测到【产品名称】BOM 版本存在【N】个父级 BOM 引用关联，是否同步升级引用版本？',
      '按钮：是 / 否；选是则更新父级明细行 childBomId/版本等。',
    ],
    rules: ['仅待发布可审核发布；父级引用匹配 childBomId 或物品+版本。'],
    acceptance: ['有父级引用时弹窗出现；选是后父级行版本更新为新 BOM。'],
  },
  {
    id: 'BOM-151-14',
    title: 'BOM 演示数据与存储一致性',
    status: 'done',
    priority: 'P2',
    requirementOwner: '邓利佳',
    acceptanceOwner: '欧阳宏汉',
    background: '本地 MOCK 需支撑分页演示且树与明细一致，避免旧模板数据错乱。',
    description: [
      'productBomSeed 分页 MOCK；DATA_VERSION 迁移。',
      'catalog 种子 hydrate；列表 enrich 层级数/物料数。',
    ],
    rules: ['升级 DATA_VERSION 后 localStorage 重建种子。'],
    acceptance: ['列表约 40 条 MOCK；详情树与物料行 parentTreeId 一致。'],
  },
]
