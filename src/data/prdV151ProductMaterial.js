/**
 * 淄博泵产业互联网平台 — 1.5.1 迭代 · 产品信息 / 物料信息 需求拆分
 * 用于云效迭代建需求及系统内 PRD 展示
 */

export const PRD_V151_PM_META = {
  version: '1.5.1',
  title: '1.5.1 迭代 · 产品信息 / 物料信息',
  project: '淄博泵产业互联网平台（I-DOMS）',
  sprint: '淄博泵产业互联网平台-1.5.1',
  module: '产品工艺 / 产品信息 · 物料信息',
  updatedAt: '2026-06-25',
  requirementOwner: '邓利佳',
  acceptanceOwner: '梁海曳',
}

/** @type {import('./prdV151ProductBom').YunxiaoRequirement[]} */
export const PRD_V151_PRODUCT_MATERIAL_REQUIREMENTS = [
  {
    id: 'PM-151-01',
    title: '产品/物料新增编辑页 Tab 布局与页头结构',
    status: 'done',
    priority: 'P0',
    requirementOwner: '邓利佳',
    acceptanceOwner: '梁海曳',
    background:
      '原产品/物料表单字段过多、纵向堆叠，不利于按业务域维护；需对齐主数据分层录入习惯，将销售、采购、生产、工时、预警分 Tab 管理。',
    description: [
      '新增/编辑弹窗改为 Tab 布局：基本信息、销售、采购、生产控制、工时配置、预警信息。',
      '页头固定展示实体名称输入框（产品名称 / 物料名称），下方为业务能力勾选项区域。',
      '查看模式（点击列表编号进入）全表单只读，Tab 切换正常。',
    ],
    rules: [
      '新增默认打开「基本信息」Tab；编辑时保留上次 Tab 或默认基本信息。',
      '弹窗宽度约 92%，与 BOM 等大表单视觉一致。',
    ],
    acceptance: [
      '产品信息与物料信息新增/编辑页均为 Tab 结构，六个 Tab 均可访问。',
      '页头名称输入与 Tab 内容分区清晰，查看模式不可编辑。',
    ],
  },
  {
    id: 'PM-151-02',
    title: '业务能力勾选项（产品/物料差异）',
    status: 'done',
    priority: 'P0',
    requirementOwner: '邓利佳',
    acceptanceOwner: '梁海曳',
    background:
      '同一主数据可能具备多种业务用途（销售、生产、采购、外协等），需在页头以勾选项声明能力，供下游模块（销售、计划、采购、工单）识别。',
    description: [
      '产品页头：可销售（固定勾选、不可取消）、整机、零部件、可采购、可外协。',
      '物料页头：可销售、可生产、可采购、可外协。',
      '勾选状态持久化至主数据记录对应布尔字段。',
    ],
    rules: [
      '产品「可销售」默认 true 且 disabled，体现成品/可售属性。',
      '物料无「整机/零部件」，以「可生产」表示可纳入生产 BOM/工单。',
    ],
    acceptance: ['产品与物料页头勾选项与上述清单一致。', '保存后重新打开，勾选状态与保存前一致。'],
  },
  {
    id: 'PM-151-03',
    title: '产品整机/零部件互斥与产品物料联动',
    status: 'done',
    priority: 'P0',
    requirementOwner: '邓利佳',
    acceptanceOwner: '梁海曳',
    background:
      '泵业产品分整机与零部件，二者业务含义互斥；零部件常同时作为可销售的产品物料，需与物料主数据表联动。',
    description: [
      '整机与零部件互斥：勾选其一自动取消另一项。',
      '勾选零部件时，基本信息 Tab 内「产品物料」同步勾选。',
      '取消零部件时，若仅因零部件联动开启的产品物料可一并取消（按实现逻辑）。',
    ],
    rules: ['不可同时勾选整机与零部件。', 'isPart 与 isProductMaterial 保持联动一致。'],
    acceptance: [
      '勾选整机后零部件自动取消；勾选零部件后整机自动取消。',
      '零部件勾选时产品物料为勾选状态。',
    ],
  },
  {
    id: 'PM-151-04',
    title: '物料可销售与产品物料双向联动',
    status: 'done',
    priority: 'P0',
    requirementOwner: '邓利佳',
    acceptanceOwner: '梁海曳',
    background:
      '标记为产品物料的物料记录需在产品信息表中可见，供销售/BOM 统一引用；可销售与产品物料开关需同开同关，避免数据不一致。',
    description: [
      '物料勾选「产品物料」时，「可销售」同步勾选。',
      '取消「可销售」时，「产品物料」同步取消。',
      '保存时若 isProductMaterial 为 true，按映射规则同步产品信息表（buildProductFromMaterial）。',
    ],
    rules: [
      '产品物料 ↔ 可销售：开启产品物料必须可销售；不可销售则不可为产品物料。',
      '同步字段含编码、名称、规格、图号、材质、技术参数、配套要求、税率等（见 productMaterialMap）。',
    ],
    acceptance: [
      '物料开启产品物料后，产品信息列表出现同编码记录。',
      '取消可销售后产品物料自动取消，双表数据策略符合规则。',
    ],
  },
  {
    id: 'PM-151-05',
    title: '基本信息字段调整（配套要求、技术参数、图号材质）',
    status: 'done',
    priority: 'P0',
    requirementOwner: '邓利佳',
    acceptanceOwner: '梁海曳',
    background:
      '销售订单、生产计划、BOM 等下游均引用主数据的技术参数与配套要求；原「备注」语义不清，需统一命名与控件类型。',
    description: [
      '原「备注」改名为「配套要求」，多行文本输入（textarea）。',
      '「技术参数」改为多行文本输入，支持较长描述。',
      '基本信息增加/保留「图号」「材质」；材质下拉取自材质牌号主数据，可搜索。',
      '销售 Tab 增加「销项税」；采购 Tab 增加「进项税」。',
    ],
    rules: [
      'matchingRequirements 与历史 remark 字段兼容读取（优先配套要求）。',
      '税率单位为百分比数值，与现有销售/采购模块一致。',
    ],
    acceptance: [
      '表单中配套要求、技术参数均为多行输入；图号、材质可保存并在列表展示。',
      '销项税、进项税分别在销售/采购 Tab 可编辑并保存。',
    ],
  },
  {
    id: 'PM-151-06',
    title: '产品/物料列表操作列与编号详情',
    status: 'done',
    priority: 'P1',
    requirementOwner: '邓利佳',
    acceptanceOwner: '梁海曳',
    background: '列表需高频操作入口：维护 BOM、克隆主数据、快速查看详情。',
    description: [
      '操作列：编辑、BOM维护、操作 ▼（删除、克隆）。',
      '点击产品编号/物料编号打开表单弹窗只读详情（viewOnly）。',
      'BOM维护跳转至对应物品 BOM 页（无 BOM 时引导新建）。',
    ],
    rules: ['删除需二次确认；克隆生成新记录并提示成功。'],
    acceptance: ['操作列按钮与下拉菜单符合设计。', '编号链接进入只读详情；BOM维护跳转正确。'],
  },
  {
    id: 'PM-151-07',
    title: '产品/物料列表字段与列显隐',
    status: 'done',
    priority: 'P1',
    requirementOwner: '邓利佳',
    acceptanceOwner: '梁海曳',
    background: '列表需展示计划、销售、BOM 引用的关键主数据字段，并支持用户自定义列。',
    description: [
      '产品列表：编号、名称、条码类型、产品属性、类别、规格型号、图号、材质、技术参数、配套要求、重量、库存单位等。',
      '物料列表：编号、名称、条码类型、物料类型、供应型态、类别、规格型号、图号、材质、技术参数、配套要求等。',
      '列显隐配置持久化（localStorage）；工具栏列设置按钮。',
    ],
    rules: [
      '固定列：序号、编号、名称、操作列不参与显隐排序。',
      '技术参数、配套要求等长文本列 ellipsis 展示。',
    ],
    acceptance: ['列表含图号、材质、技术参数、配套要求列；列显隐保存后刷新仍生效。'],
  },
  {
    id: 'PM-151-08',
    title: '列表「业务类型」列（已勾选能力汇总）',
    status: 'done',
    priority: 'P1',
    requirementOwner: '邓利佳',
    acceptanceOwner: '梁海曳',
    background: '用户需在列表快速识别每条主数据的业务能力，无需逐条打开表单查看勾选项。',
    description: [
      '新增「业务类型」列，位于条码类型之后。',
      '仅展示已勾选的业务能力文案，多项以顿号「、」连接。',
      '产品：可销售、整机、零部件、可采购、可外协；物料：可销售、可生产、可采购、可外协。',
    ],
    rules: ['未勾选任何能力时显示「—」。', '列表展示与表单勾选项实时一致（保存后刷新可见）。'],
    acceptance: [
      '产品列表示例：「可销售、整机、可采购」。',
      '物料列表示例：「可销售、可生产、可外协」。',
      '全部未勾选显示「—」。',
    ],
  },
  {
    id: 'PM-151-09',
    title: '产品/物料详情 BOM 信息 Tab 与列表 BOM 信息列',
    status: 'done',
    priority: 'P1',
    requirementOwner: '邓利佳',
    acceptanceOwner: '梁海曳',
    background:
      '产品/物料主数据与产品 BOM 存在一对多版本关联，用户需在主数据详情中集中查看关联 BOM 版本及状态，并在列表快速识别当前生效或最新 BOM。',
    description: [
      '详情页（编辑/查看）新增「BOM信息」Tab，展示关联 BOM 全版本列表：状态、编码、名称、版本、创建人/时间、生效/失效日期；BOM 编码可跳转详情。',
      '产品列表、物料列表新增「BOM信息」列，展示「BOM名称+版本号」；无关联显示「—」。',
      '新增模式不展示 BOM 信息 Tab。',
    ],
    rules: [
      'Tab 排序：生效 → 待发布 → 已归档，同状态按版本降序。',
      '列表列取值：优先生效版，其次待发布，再取最新关联版本。',
      'Tab 只读，BOM 维护仍走列表「BOM维护」入口。',
    ],
    acceptance: [
      '编辑/查看详情可见 BOM 信息 Tab，新增无此 Tab。',
      'Tab 列出全部关联 BOM，编码可跳转；列表 BOM 信息列展示正确。',
      '有生效版时列表与 Tab 均优先展示生效版。',
    ],
  },
]
