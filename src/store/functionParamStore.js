import { reactive, watch } from 'vue'
import { persistJson } from '@/utils/safeStorage'

const STORAGE_KEY = 'i_doms_function_params'
/** 尺寸辅助默认从「全关」升级为「全开」的一次性迁移版本 */
const BLANK_SIZE_ASSIST_DEFAULTS_VERSION = 2

export const SALARY_PUSH_MODES = {
  ON_REPORT: 'on_report',
  ON_AUDIT: 'on_audit',
  MANUAL: 'manual',
}

export const SALARY_PUSH_OPTIONS = [
  { value: SALARY_PUSH_MODES.ON_REPORT, label: '报工即推送' },
  { value: SALARY_PUSH_MODES.ON_AUDIT, label: '审核后推送' },
  { value: SALARY_PUSH_MODES.MANUAL, label: '手动推送' },
]

export const SALARY_PUSH_DESCRIPTION =
  '报工即推送：报工即展示在工时工资列表中，工人可查看。审核后推送：审核通过后展示在工时工资列表中，工人可查看。手动推送：手动操作推送后，工人在工时工资列表中可查看。'

export const AUTO_GENERATE_DOC_TYPES = {
  PURCHASE_REQUISITION: 'purchaseRequisition',
  OUTSOURCING_ORDER: 'outsourcingOrder',
  PRODUCTION_WORK_ORDER: 'productionWorkOrder',
  ASSEMBLY_WORK_ORDER: 'assemblyWorkOrder',
}

export const AUTO_GENERATE_DOC_OPTIONS = [
  { value: AUTO_GENERATE_DOC_TYPES.PURCHASE_REQUISITION, label: '采购申请单' },
  { value: AUTO_GENERATE_DOC_TYPES.OUTSOURCING_ORDER, label: '外协订单' },
  { value: AUTO_GENERATE_DOC_TYPES.PRODUCTION_WORK_ORDER, label: '生产工单' },
  { value: AUTO_GENERATE_DOC_TYPES.ASSEMBLY_WORK_ORDER, label: '总装/部装工单' },
]

export const AUTO_GENERATE_DOC_DESCRIPTION =
  '勾选相应单据，销售订单审核后，系统将根据物料的供应型态自动生成相应单据。'

export const INVENTORY_DEDUCT_MODES = {
  NO_ISSUE: 'no_issue',
  POST_COMPLETE_BY_REPORT: 'post_complete_by_report',
  SELF_ISSUE_BY_ACTUAL: 'self_issue_by_actual',
}

export const INVENTORY_DEDUCT_OPTIONS = [
  { value: INVENTORY_DEDUCT_MODES.NO_ISSUE, label: '不领料' },
  {
    value: INVENTORY_DEDUCT_MODES.POST_COMPLETE_BY_REPORT,
    label: '完工后预扣+确认（按报工数量扣）',
  },
  {
    value: INVENTORY_DEDUCT_MODES.SELF_ISSUE_BY_ACTUAL,
    label: '自主领料+完工后预扣+确认（按领料数量扣）',
  },
]

export const INVENTORY_DEDUCT_DESCRIPTION =
  '不领料：生产过程不扣减库存。完工后预扣+确认（按报工数量扣）：完工时按报工数量预扣，确认后正式扣减。自主领料+完工后预扣+确认（按领料数量扣）：支持自主领料，完工后按领料数量预扣，确认后正式扣减。'

/** 出库规则：拣批顺序（普通料 / 需下料结算料语义不同，见 DESCRIPTION） */
export const OUTBOUND_ISSUE_RULES = {
  FIFO: 'fifo',
  LIFO: 'lifo',
  MANUAL: 'manual',
}

export const OUTBOUND_ISSUE_RULE_OPTIONS = [
  {
    value: OUTBOUND_ISSUE_RULES.FIFO,
    label: '先进先出（普通料）/ FIFO+优先整批+余料优先（需下料结算）',
    disabled: false,
  },
  {
    value: OUTBOUND_ISSUE_RULES.LIFO,
    label: '后进先出',
    disabled: true,
  },
  { value: OUTBOUND_ISSUE_RULES.MANUAL, label: '自主拣选', disabled: true },
]

export const OUTBOUND_ISSUE_RULE_DESCRIPTION =
  '本期仅开放先进先出，按物料类型自动区分拣批细节：' +
  '①普通物料（未勾「需要下料结算」）：按批次号先进先出，按出库数量扣减，余量留原批；' +
  '②需下料结算物料：FIFO + 优先找单批/单件能满足出库数量的批，候选中余料优先、其次最短够用，没有单批够用才跨批。' +
  '发料后余料是否还要走下料结算回库，见下方「是否需要下料结算」。「后进先出」「自主拣选」本期置灰未开放。领料、外协发料始终走本项；销售发货见下方「发货出库规则」。'

/**
 * 销售发货出库如何扣批（不影响领料 / 外协发料）
 * - by_order：按单发货，先扣本销售单打标批次，禁止 FIFO 抢走他单按单库存
 * - fifo：发货按仓库批次先进先出，不区分是否本单库存
 */
export const SALES_OUTBOUND_ISSUE_RULES = {
  BY_ORDER: 'by_order',
  FIFO: 'fifo',
}

export const SALES_OUTBOUND_ISSUE_RULE_OPTIONS = [
  { value: SALES_OUTBOUND_ISSUE_RULES.BY_ORDER, label: '按单发货' },
  { value: SALES_OUTBOUND_ISSUE_RULES.FIFO, label: '先进先出（FIFO）' },
]

export const SALES_OUTBOUND_ISSUE_RULE_DESCRIPTION =
  '只作用于销售发货出库，领料、外协发料仍走上方「出库规则」。' +
  '按单发货：成品/半成品入库时挂了本销售单的批次，发货时优先（或必须）扣这些批次，不能用全仓先进先出把别人订单的货发出去。' +
  '支持分批发货，但发货量不可超过本单的已入库量。' +
  '销售行若是「强制按单生产」，不够的部分也不能拿自由备货或其他订单的货来凑。' +
  '先进先出（FIFO）：发货时不管批次是不是本单生产的，按仓库里批次先后扣减，适合不需要按订单锁货的场景。'

/**
 * 随货附件在哪一环节确定纳入清单
 * - apply：销售申请发货时勾选纳入、填写套数
 * - warehouse：申请发货不展示附件；仓管在发货环节（随货查询）确定
 * 无论哪种配置，「库存 → 随货查询」都可以维护本票附件
 */
export const SHIP_ATTACHMENT_DECIDE_STAGES = {
  APPLY: 'apply',
  WAREHOUSE: 'warehouse',
}

export const SHIP_ATTACHMENT_DECIDE_STAGE_OPTIONS = [
  { value: SHIP_ATTACHMENT_DECIDE_STAGES.APPLY, label: '申请发货时确定' },
  { value: SHIP_ATTACHMENT_DECIDE_STAGES.WAREHOUSE, label: '仓管发货时确定' },
]

export const SHIP_ATTACHMENT_DECIDE_STAGE_DESCRIPTION =
  '申请发货时确定：销售在申请发货页勾选纳入、填写套数。' +
  '仓管发货时确定：申请发货页不展示发货附件及相关提示。' +
  '无论哪种配置，仓管都可在「库存 → 随货查询」维护本票纳入清单；纳入后随同一张销售出库单出库。'

/**
 * 下料结算相关发料策略（仅作用于勾选「需要下料结算」能力的物料场景；普通料不受本项影响）
 * 业务口径：确认出库一律按出库单数量扣库存；本项只区分发料后余料是否还要走下料结算回库。
 * - partial：无需下料结算（余料留线边仓等，不再回库结算）
 * - whole_with_remnant：需下料结算（登记实耗，余料回库）
 */
export const DUAL_UNIT_ISSUE_STRATEGIES = {
  PARTIAL: 'partial',
  WHOLE_WITH_REMNANT: 'whole_with_remnant',
}

export const DUAL_UNIT_ISSUE_STRATEGY_OPTIONS = [
  {
    value: DUAL_UNIT_ISSUE_STRATEGIES.PARTIAL,
    label: '无需下料结算（余料留线边仓）',
    disabled: false,
  },
  {
    value: DUAL_UNIT_ISSUE_STRATEGIES.WHOLE_WITH_REMNANT,
    label: '需下料结算（余料回库）',
    disabled: false,
  },
]

export const DUAL_UNIT_ISSUE_STRATEGY_DESCRIPTION =
  '确认出库时，系统一律按出库单上的数量扣减库存（给多少就写多少、扣多少）。' +
  '本项不改变扣库数量，只区分发料后对余料的处理：' +
  '「无需下料结算」——余料留在线边仓/现场，不再做下料结算回库；' +
  '「需下料结算」——领出后登记实耗，余料通过下料结算回库。' +
  '仅对需要管余料的下料类物料有意义；普通物料不受本项影响。'

/** 下料/订货尺寸辅助（勾选即显示对应能力，默认开启） */
export const BLANK_SIZE_ASSIST_TYPES = {
  PLATE_AREA_MEASURE: 'plateAreaMeasure',
  BOM_WEIGHT_CALC: 'bomWeightCalc', // 存储键兼容；作用于 BOM 下料尺寸与采购订货尺寸
}

export const BLANK_SIZE_ASSIST_OPTIONS = [
  { value: BLANK_SIZE_ASSIST_TYPES.PLATE_AREA_MEASURE, label: '面积换算' },
  { value: BLANK_SIZE_ASSIST_TYPES.BOM_WEIGHT_CALC, label: '重量计算' },
]

export const BLANK_SIZE_ASSIST_DESCRIPTION =
  '作用于 BOM「下料尺寸」与采购「订货尺寸」弹窗，默认开启；勾选即显示，取消勾选则不显示。' +
  '「面积换算」：弹窗可选「面积计算」，库存单位为㎡时入库也可用「长 × 宽」换算面积。' +
  '「重量计算」：弹窗增加「重量计算」页签，可按型材/密度估算重量并回填尺寸（BOM 下料另回填单位用量）。' +
  '不需要面积或重量辅助的客户取消勾选即可。'

export const ENABLE_BOM_LEVEL_MTS_DESCRIPTION =
  '开启后，生产计划展开 BOM 时支持子件级按库存MTS：子件主数据为按库存MTS 且库存充足时，可不下推该层生产/采购需求；关闭则生产计划仍按订单展开，仅成品级计划策略生效。默认关闭。'

/** 质检门控：按业务类型配置（强管控阻断 / 弱管控仅预警） */
export const QC_GATE_POLICY_PARAM_OPTIONS = [
  { value: 'soft', label: '弱管控（仅预警）' },
  { value: 'hard', label: '强管控（阻断下游）', disabled: true },
]

export const QC_GATE_POLICY_BIZ_SCOPES = [
  '来料质检',
  '外协回货检',
  '生产过程检',
  '成品检',
  '出厂质检',
]

export const QC_GATE_POLICY_DESCRIPTION =
  '按质检业务类型配置下游门控强度。弱管控：未检/不合格等场景 Toast 预警，不拦截入库、报工、出库操作；强管控：直接阻断。当期仅开放弱管控，强管控后续开放。'

function normalizeQcGatePolicyParam(value) {
  const v = String(value || '').trim()
  if (v === 'strong') return 'hard'
  if (v === 'weak') return 'soft'
  const hit = QC_GATE_POLICY_PARAM_OPTIONS.find((o) => o.value === v)
  // 当期仅开放弱管控；历史 hard / 非法值一律回落 soft
  if (hit && !hit.disabled) return hit.value
  return 'soft'
}

function normalizeQcGatePolicyMap(map = {}) {
  const result = {}
  QC_GATE_POLICY_BIZ_SCOPES.forEach((scope) => {
    result[scope] = normalizeQcGatePolicyParam(map?.[scope])
  })
  return result
}

export const AUTO_APPROVE_TYPES = {
  PURCHASE_ORDER: 'purchaseOrder',
  SALES_ORDER: 'salesOrder',
  SALES_ORDER_PRICE_CHANGE: 'salesOrderPriceChange',
  PURCHASE_ORDER_PRICE_CHANGE: 'purchaseOrderPriceChange',
  OUTSOURCING_ORDER: 'outsourcingOrder',
  FINISHED_INBOUND: 'finishedInbound',
  MATERIAL_REQUISITION: 'materialRequisition',
  INVENTORY_DEDUCT: 'inventoryDeduct',
  SCRAP_ORDER: 'scrapOrder',
}

export const AUTO_APPROVE_OPTIONS = [
  { value: AUTO_APPROVE_TYPES.PURCHASE_ORDER, label: '采购订单' },
  { value: AUTO_APPROVE_TYPES.SALES_ORDER, label: '销售订单' },
  { value: AUTO_APPROVE_TYPES.SALES_ORDER_PRICE_CHANGE, label: '销售订单变更' },
  { value: AUTO_APPROVE_TYPES.PURCHASE_ORDER_PRICE_CHANGE, label: '采购订单价格变更' },
  { value: AUTO_APPROVE_TYPES.OUTSOURCING_ORDER, label: '外协订单' },
  { value: AUTO_APPROVE_TYPES.FINISHED_INBOUND, label: '成品入库' },
  { value: AUTO_APPROVE_TYPES.MATERIAL_REQUISITION, label: '领料申请' },
  { value: AUTO_APPROVE_TYPES.INVENTORY_DEDUCT, label: '库存扣减' },
  { value: AUTO_APPROVE_TYPES.SCRAP_ORDER, label: '报废单审批' },
]

export const AUTO_APPROVE_DESCRIPTION =
  '勾选后对应单据提交即自动审批通过。勾选「销售订单变更」后，订单变更单提交即回写基本信息与销售明细（数量、交期、税率、单价、折扣、取消行及客户等）；勾选「采购订单价格变更」后，价格变更单提交即回写采购订单有效价。未勾选「领料申请」时，领料申请单需人工审核（待审核 → 审核通过 / 审核驳回）。未勾选「库存扣减」时，待确认扣减需人工确认（编辑 / 确认 / 作废）；勾选后提交即自动确认扣减。勾选「报废单审批」表示报废单走自动审批（配置项已展示，报废业务侧暂未接入读取）。'

function createDefaultAutoGenerateDocs() {
  return {
    [AUTO_GENERATE_DOC_TYPES.PURCHASE_REQUISITION]: false,
    [AUTO_GENERATE_DOC_TYPES.OUTSOURCING_ORDER]: false,
    [AUTO_GENERATE_DOC_TYPES.PRODUCTION_WORK_ORDER]: false,
    [AUTO_GENERATE_DOC_TYPES.ASSEMBLY_WORK_ORDER]: false,
  }
}

function normalizeAutoGenerateDocs(value) {
  const defaults = createDefaultAutoGenerateDocs()
  if (!value || typeof value !== 'object') return defaults
  return {
    ...defaults,
    ...Object.fromEntries(
      AUTO_GENERATE_DOC_OPTIONS.map((item) => [item.value, Boolean(value[item.value])]),
    ),
  }
}

function createDefaultAutoApproveDocs() {
  return {
    [AUTO_APPROVE_TYPES.PURCHASE_ORDER]: false,
    [AUTO_APPROVE_TYPES.SALES_ORDER]: false,
    [AUTO_APPROVE_TYPES.SALES_ORDER_PRICE_CHANGE]: false,
    [AUTO_APPROVE_TYPES.PURCHASE_ORDER_PRICE_CHANGE]: false,
    [AUTO_APPROVE_TYPES.OUTSOURCING_ORDER]: false,
    [AUTO_APPROVE_TYPES.FINISHED_INBOUND]: false,
    [AUTO_APPROVE_TYPES.MATERIAL_REQUISITION]: false,
    [AUTO_APPROVE_TYPES.INVENTORY_DEDUCT]: false,
    [AUTO_APPROVE_TYPES.SCRAP_ORDER]: false,
  }
}

function normalizeAutoApproveDocs(value) {
  const defaults = createDefaultAutoApproveDocs()
  if (!value || typeof value !== 'object') return defaults
  return {
    ...defaults,
    ...Object.fromEntries(
      AUTO_APPROVE_OPTIONS.map((item) => [item.value, Boolean(value[item.value])]),
    ),
  }
}

function createDefaultBlankSizeAssistTools() {
  return {
    [BLANK_SIZE_ASSIST_TYPES.PLATE_AREA_MEASURE]: true,
    [BLANK_SIZE_ASSIST_TYPES.BOM_WEIGHT_CALC]: true,
  }
}

/** 兼容旧版独立开关 enablePlateAreaMeasure / enableBomWeightCalc */
function normalizeBlankSizeAssistTools(value, legacy = {}) {
  const defaults = createDefaultBlankSizeAssistTools()
  if (value && typeof value === 'object') {
    return {
      ...defaults,
      ...Object.fromEntries(
        BLANK_SIZE_ASSIST_OPTIONS.map((item) => [item.value, Boolean(value[item.value])]),
      ),
    }
  }
  const hasLegacyPlate = Object.prototype.hasOwnProperty.call(legacy, 'enablePlateAreaMeasure')
  const hasLegacyWeight = Object.prototype.hasOwnProperty.call(legacy, 'enableBomWeightCalc')
  return {
    ...defaults,
    [BLANK_SIZE_ASSIST_TYPES.PLATE_AREA_MEASURE]: hasLegacyPlate
      ? legacy.enablePlateAreaMeasure === true
      : defaults[BLANK_SIZE_ASSIST_TYPES.PLATE_AREA_MEASURE],
    [BLANK_SIZE_ASSIST_TYPES.BOM_WEIGHT_CALC]: hasLegacyWeight
      ? legacy.enableBomWeightCalc === true
      : defaults[BLANK_SIZE_ASSIST_TYPES.BOM_WEIGHT_CALC],
  }
}

/** 功能参数分类（左侧锚点 / 右侧分组） */
export const FUNCTION_PARAM_CATEGORIES = [
  {
    key: 'automation',
    label: '流程自动化',
    description: '控制单据自动生成与自动审批，减少人工确认。',
  },
  {
    key: 'bom',
    label: 'BOM与工艺文件',
    description: 'BOM 生效策略、自构成与工艺文件管理方式。',
  },
  {
    key: 'inventory',
    label: '库存与出库',
    description: '库存扣减时机、出库拣选与发货相关规则。',
  },
  {
    key: 'production',
    label: '生产与计划',
    description: '生产计划、工单物料、报工与工资推送相关配置。',
  },
  {
    key: 'quality',
    label: '质量',
    description: '质检下游门控强度（入库 / 报工 / 出库）。',
  },
  {
    key: 'assist',
    label: '辅助工具',
    description: '录入辅助能力开关，不影响核心业务规则。',
  },
  {
    key: 'message',
    label: '消息通知',
    description: '消息推送相关开关。',
  },
]

export const WORK_ORDER_MATERIAL_SETTING_OPTIONS = [
  { value: 'enableMaterialReqCalc', label: '启用工单物料需求计算' },
  { value: 'enableLastProcessConsume', label: '启用最后工序报工物料消耗计算' },
  { value: 'enableSubWoViaBom', label: '启用通过BOM创建子工单' },
]

function createDefaultWorkOrderMaterialSettings() {
  return {
    enableMaterialReqCalc: true,
    enableLastProcessConsume: false,
    enableSubWoViaBom: true,
  }
}

function normalizeWorkOrderMaterialSettings(value = {}) {
  const defaults = createDefaultWorkOrderMaterialSettings()
  if (!value || typeof value !== 'object') return defaults
  return {
    enableMaterialReqCalc: Boolean(value.enableMaterialReqCalc),
    enableLastProcessConsume: Boolean(value.enableLastProcessConsume),
    enableSubWoViaBom: Boolean(value.enableSubWoViaBom),
  }
}

/** 仅页面展示的配置默认值（不驱动业务逻辑） */
function createDefaultDisplayParams() {
  return {
    wechatMessagePush: true,
    enableBomSelectSelf: true,
    enableBomApprove: true,
    reportAllowOverReport: true,
    workOrderMaterialSettings: createDefaultWorkOrderMaterialSettings(),
    processFileSelectByCategory: false,
    processFileSelectMode: 'item',
  }
}

function normalizeDisplayParams(value = {}) {
  const defaults = createDefaultDisplayParams()
  const merged = {
    ...defaults,
    ...(value && typeof value === 'object' ? value : {}),
  }
  merged.workOrderMaterialSettings = normalizeWorkOrderMaterialSettings(
    value?.workOrderMaterialSettings ?? defaults.workOrderMaterialSettings,
  )
  // 兼容旧布尔开关 processFileSelectByCategory
  const rawMode =
    value &&
    typeof value === 'object' &&
    Object.prototype.hasOwnProperty.call(value, 'processFileSelectMode')
      ? value.processFileSelectMode
      : value &&
          typeof value === 'object' &&
          Object.prototype.hasOwnProperty.call(value, 'processFileSelectByCategory')
        ? value.processFileSelectByCategory
        : defaults.processFileSelectMode
  merged.processFileSelectMode = normalizeProcessFileSelectMode(rawMode)
  merged.processFileSelectByCategory = merged.processFileSelectMode === 'category'
  return merged
}

export const WECHAT_MESSAGE_PUSH_DESCRIPTION =
  '开启后支持微信消息推送。（展示项，本期仅页面配置展示，未接入业务逻辑）'

export const ENABLE_BOM_SELECT_SELF_DESCRIPTION =
  '开启后，物料可在 BOM 中选择自身作为子级（自构成：自己构成自己）。关闭则不允许选择自身为子件。（展示项，本期仅页面配置展示，未接入业务逻辑）'

export const ENABLE_BOM_APPROVE_DESCRIPTION =
  '开启后：同一产品/物料同一时间仅允许一个「生效」BOM，新版本生效时上版本自动归档。' +
  '关闭后：同一产品/物料可同时生效多个 BOM，并可指定其中一个为默认 BOM。' +
  '（本项不是 BOM 单据自动审批。展示项，本期仅页面配置展示，未接入业务逻辑）'

export const PROCESS_FILE_SELECT_OPTIONS = [
  { value: 'item', label: '一物一图' },
  { value: 'category', label: '按类别' },
]

export const PROCESS_FILE_SELECT_DESCRIPTION =
  '「一物一图」：按产品/物料管理工艺文件，同一产品/物料在同一文件类型下同一时间仅可生效一张图。' +
  '「按类别」：按产品/物料类别上传与管理工艺文件。' +
  '（展示项，本期仅页面配置展示，未接入业务逻辑）'

function normalizeProcessFileSelectMode(value) {
  if (value === true || value === 'category') return 'category'
  if (value === false || value === 'item') return 'item'
  return 'item'
}

export const REPORT_SETTING_OPTIONS = [{ value: 'allowOverReport', label: '允许超报' }]

export const WORK_ORDER_MATERIAL_SETTINGS_DESCRIPTION =
  '工单生成与物料计算相关开关。（展示项，本期仅页面配置展示，未接入业务逻辑）'

export const REPORT_SETTINGS_DESCRIPTION =
  '报工相关约束。勾选「允许超报」后允许报工数量超过计划数量。（展示项，本期仅页面配置展示，未接入业务逻辑）'

export const FUNCTION_PARAM_ROWS = [
  {
    key: 'autoGenerateDocs',
    category: 'automation',
    scenario: '自动生成单据',
    description: AUTO_GENERATE_DOC_DESCRIPTION,
  },
  {
    key: 'autoApproveDocs',
    category: 'automation',
    scenario: '自动审批配置',
    description: AUTO_APPROVE_DESCRIPTION,
  },
  {
    key: 'enableBomSelectSelf',
    category: 'bom',
    scenario: '允许物料自构成',
    description: ENABLE_BOM_SELECT_SELF_DESCRIPTION,
    displayOnly: true,
    controlType: 'switch',
  },
  {
    key: 'enableBomApprove',
    category: 'bom',
    scenario: 'BOM 生效唯一性',
    description: ENABLE_BOM_APPROVE_DESCRIPTION,
    displayOnly: true,
    controlType: 'switch',
  },
  {
    key: 'processFileSelectMode',
    category: 'bom',
    scenario: '工艺文件管理方式',
    description: PROCESS_FILE_SELECT_DESCRIPTION,
    displayOnly: true,
    controlType: 'radio',
    options: PROCESS_FILE_SELECT_OPTIONS,
  },
  {
    key: 'inventoryDeductMode',
    category: 'inventory',
    scenario: '库存扣减',
    description: INVENTORY_DEDUCT_DESCRIPTION,
  },
  {
    key: 'outboundIssueRule',
    category: 'inventory',
    scenario: '出库规则',
    description: OUTBOUND_ISSUE_RULE_DESCRIPTION,
  },
  {
    key: 'salesOutboundIssueRule',
    category: 'inventory',
    scenario: '发货出库规则',
    description: SALES_OUTBOUND_ISSUE_RULE_DESCRIPTION,
  },
  {
    key: 'shipAttachmentDecideStage',
    category: 'inventory',
    scenario: '随货附件确定环节',
    description: SHIP_ATTACHMENT_DECIDE_STAGE_DESCRIPTION,
  },
  {
    key: 'dualUnitIssueStrategy',
    category: 'inventory',
    scenario: '是否需要下料结算',
    description: DUAL_UNIT_ISSUE_STRATEGY_DESCRIPTION,
  },
  {
    key: 'enableBomLevelMts',
    category: 'production',
    scenario: '生产计划启用 BOM 级 MTS',
    description: ENABLE_BOM_LEVEL_MTS_DESCRIPTION,
  },
  {
    key: 'workOrderMaterialSettings',
    category: 'production',
    scenario: '工单生成及物料设置',
    description: WORK_ORDER_MATERIAL_SETTINGS_DESCRIPTION,
    displayOnly: true,
    controlType: 'checkboxGroup',
    options: WORK_ORDER_MATERIAL_SETTING_OPTIONS,
  },
  {
    key: 'reportSettings',
    category: 'production',
    scenario: '报工设置',
    description: REPORT_SETTINGS_DESCRIPTION,
    displayOnly: true,
    controlType: 'checkboxGroup',
    options: REPORT_SETTING_OPTIONS,
  },
  {
    key: 'salaryPushMode',
    category: 'production',
    scenario: '工资推送',
    description: SALARY_PUSH_DESCRIPTION,
  },
  {
    key: 'qcGatePolicy',
    category: 'quality',
    scenario: '质检门控',
    description: QC_GATE_POLICY_DESCRIPTION,
  },
  {
    key: 'blankSizeAssistTools',
    category: 'assist',
    scenario: '下料/订货尺寸辅助',
    description: BLANK_SIZE_ASSIST_DESCRIPTION,
  },
  {
    key: 'wechatMessagePush',
    category: 'message',
    scenario: '微信消息推送',
    description: WECHAT_MESSAGE_PUSH_DESCRIPTION,
    displayOnly: true,
    controlType: 'switch',
  },
]

/** 按分类组装：导航 + 分组列表 */
export function getFunctionParamCategoryGroups() {
  return FUNCTION_PARAM_CATEGORIES.map((cat) => ({
    ...cat,
    rows: FUNCTION_PARAM_ROWS.filter((row) => row.category === cat.key),
  })).filter((cat) => cat.rows.length > 0)
}

function normalizeSalaryPushMode(mode) {
  if (mode === 'auto') return SALARY_PUSH_MODES.ON_REPORT
  if (SALARY_PUSH_OPTIONS.some((item) => item.value === mode)) return mode
  return SALARY_PUSH_MODES.MANUAL
}

function normalizeInventoryDeductMode(mode) {
  // 兼容旧值「按计划数量扣」
  if (mode === 'post_complete_by_plan') return INVENTORY_DEDUCT_MODES.POST_COMPLETE_BY_REPORT
  if (INVENTORY_DEDUCT_OPTIONS.some((item) => item.value === mode)) return mode
  return INVENTORY_DEDUCT_MODES.NO_ISSUE
}

function normalizeOutboundIssueRule(mode) {
  const hit = OUTBOUND_ISSUE_RULE_OPTIONS.find((item) => item.value === mode)
  // 本期仅开放 FIFO；历史 LIFO/自主拣选回落为先进先出
  if (hit && !hit.disabled) return hit.value
  return OUTBOUND_ISSUE_RULES.FIFO
}

function normalizeSalesOutboundIssueRule(mode) {
  if (SALES_OUTBOUND_ISSUE_RULE_OPTIONS.some((item) => item.value === mode)) return mode
  return SALES_OUTBOUND_ISSUE_RULES.BY_ORDER
}

function normalizeShipAttachmentDecideStage(mode) {
  if (SHIP_ATTACHMENT_DECIDE_STAGE_OPTIONS.some((item) => item.value === mode)) return mode
  return SHIP_ATTACHMENT_DECIDE_STAGES.APPLY
}

function normalizeDualUnitIssueStrategy(mode) {
  if (
    mode === DUAL_UNIT_ISSUE_STRATEGIES.PARTIAL ||
    mode === DUAL_UNIT_ISSUE_STRATEGIES.WHOLE_WITH_REMNANT
  ) {
    return mode
  }
  return DUAL_UNIT_ISSUE_STRATEGIES.PARTIAL
}

function loadFromStorage() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) {
      const parsed = JSON.parse(raw)
      if (parsed && typeof parsed === 'object') {
        const assistVersion = Number(parsed.blankSizeAssistToolsVersion) || 0
        let blankSizeAssistTools = normalizeBlankSizeAssistTools(
          parsed.blankSizeAssistTools,
          parsed,
        )
        // 旧默认「全关」→ 新默认「全开」：仅升级一次，之后尊重用户勾选
        if (assistVersion < BLANK_SIZE_ASSIST_DEFAULTS_VERSION) {
          blankSizeAssistTools = createDefaultBlankSizeAssistTools()
        }
        return {
          ...parsed,
          salaryPushMode: normalizeSalaryPushMode(parsed.salaryPushMode),
          autoGenerateDocs: normalizeAutoGenerateDocs(parsed.autoGenerateDocs),
          autoApproveDocs: normalizeAutoApproveDocs(parsed.autoApproveDocs),
          inventoryDeductMode: normalizeInventoryDeductMode(parsed.inventoryDeductMode),
          outboundIssueRule: normalizeOutboundIssueRule(parsed.outboundIssueRule),
          salesOutboundIssueRule: normalizeSalesOutboundIssueRule(parsed.salesOutboundIssueRule),
          shipAttachmentDecideStage: normalizeShipAttachmentDecideStage(
            parsed.shipAttachmentDecideStage,
          ),
          dualUnitIssueStrategy: normalizeDualUnitIssueStrategy(parsed.dualUnitIssueStrategy),
          blankSizeAssistTools,
          blankSizeAssistToolsVersion: BLANK_SIZE_ASSIST_DEFAULTS_VERSION,
          enableBomLevelMts: parsed.enableBomLevelMts === true,
          qcDefaultGatePolicy: normalizeQcGatePolicyParam(parsed.qcDefaultGatePolicy),
          qcGatePolicyByBizScope: normalizeQcGatePolicyMap(parsed.qcGatePolicyByBizScope),
          displayParams: normalizeDisplayParams(parsed.displayParams),
        }
      }
    }
  } catch {
    /* ignore */
  }
  return null
}

function persist() {
  persistJson(STORAGE_KEY, functionParamState.params)
}

export const functionParamState = reactive({
  params: loadFromStorage() || {
    salaryPushMode: SALARY_PUSH_MODES.MANUAL,
    autoGenerateDocs: createDefaultAutoGenerateDocs(),
    autoApproveDocs: createDefaultAutoApproveDocs(),
    inventoryDeductMode: INVENTORY_DEDUCT_MODES.NO_ISSUE,
    outboundIssueRule: OUTBOUND_ISSUE_RULES.FIFO,
    salesOutboundIssueRule: SALES_OUTBOUND_ISSUE_RULES.BY_ORDER,
    shipAttachmentDecideStage: SHIP_ATTACHMENT_DECIDE_STAGES.APPLY,
    dualUnitIssueStrategy: DUAL_UNIT_ISSUE_STRATEGIES.PARTIAL,
    blankSizeAssistTools: createDefaultBlankSizeAssistTools(),
    blankSizeAssistToolsVersion: BLANK_SIZE_ASSIST_DEFAULTS_VERSION,
    enableBomLevelMts: false,
    qcDefaultGatePolicy: 'soft',
    qcGatePolicyByBizScope: normalizeQcGatePolicyMap(),
    displayParams: createDefaultDisplayParams(),
  },
})

watch(
  () => functionParamState.params,
  () => persist(),
  { deep: true },
)

export function getSalaryPushMode() {
  return normalizeSalaryPushMode(functionParamState.params.salaryPushMode)
}

export function setSalaryPushMode(mode) {
  const normalized = normalizeSalaryPushMode(mode)
  const hit = SALARY_PUSH_OPTIONS.find((item) => item.value === normalized)
  if (!hit) return { ok: false, message: '无效的推送方式' }
  functionParamState.params.salaryPushMode = normalized
  return { ok: true }
}

export function isReportSalaryPush() {
  return getSalaryPushMode() === SALARY_PUSH_MODES.ON_REPORT
}

export function isAuditSalaryPush() {
  return getSalaryPushMode() === SALARY_PUSH_MODES.ON_AUDIT
}

export function isManualSalaryPush() {
  return getSalaryPushMode() === SALARY_PUSH_MODES.MANUAL
}

export function getAutoGenerateDocs() {
  return normalizeAutoGenerateDocs(functionParamState.params.autoGenerateDocs)
}

export function setAutoGenerateDocs(enabledKeys = []) {
  const keys = Array.isArray(enabledKeys) ? enabledKeys : []
  functionParamState.params.autoGenerateDocs = normalizeAutoGenerateDocs(
    Object.fromEntries(
      AUTO_GENERATE_DOC_OPTIONS.map((item) => [item.value, keys.includes(item.value)]),
    ),
  )
  return { ok: true }
}

export function isAutoGenerateDocEnabled(type) {
  return Boolean(getAutoGenerateDocs()[type])
}

export function getAutoApproveDocs() {
  return normalizeAutoApproveDocs(functionParamState.params.autoApproveDocs)
}

export function setAutoApproveDocs(enabledKeys = []) {
  const keys = Array.isArray(enabledKeys) ? enabledKeys : []
  functionParamState.params.autoApproveDocs = normalizeAutoApproveDocs(
    Object.fromEntries(AUTO_APPROVE_OPTIONS.map((item) => [item.value, keys.includes(item.value)])),
  )
  return { ok: true }
}

export function isAutoApproveEnabled(type) {
  return Boolean(getAutoApproveDocs()[type])
}

export function getInventoryDeductMode() {
  return normalizeInventoryDeductMode(functionParamState.params.inventoryDeductMode)
}

export function setInventoryDeductMode(mode) {
  const normalized = normalizeInventoryDeductMode(mode)
  const hit = INVENTORY_DEDUCT_OPTIONS.find((item) => item.value === normalized)
  if (!hit) return { ok: false, message: '无效的库存扣减方式' }
  functionParamState.params.inventoryDeductMode = normalized
  return { ok: true }
}

export function isInventoryNoIssue() {
  return getInventoryDeductMode() === INVENTORY_DEDUCT_MODES.NO_ISSUE
}

export function isInventoryDeductByPlan() {
  return getInventoryDeductMode() === INVENTORY_DEDUCT_MODES.POST_COMPLETE_BY_REPORT
}

export function isInventoryDeductByReport() {
  return getInventoryDeductMode() === INVENTORY_DEDUCT_MODES.POST_COMPLETE_BY_REPORT
}

export function isInventoryDeductByActual() {
  return getInventoryDeductMode() === INVENTORY_DEDUCT_MODES.SELF_ISSUE_BY_ACTUAL
}

export function getOutboundIssueRule() {
  return normalizeOutboundIssueRule(functionParamState.params.outboundIssueRule)
}

export function setOutboundIssueRule(mode) {
  const normalized = normalizeOutboundIssueRule(mode)
  const hit = OUTBOUND_ISSUE_RULE_OPTIONS.find((item) => item.value === normalized)
  if (!hit || hit.disabled) {
    return { ok: false, message: '本期仅开放「先进先出+优先整批+余料优先」' }
  }
  functionParamState.params.outboundIssueRule = normalized
  return { ok: true }
}

export function isManualOutboundIssue() {
  return getOutboundIssueRule() === OUTBOUND_ISSUE_RULES.MANUAL
}

export function isAutoOutboundIssue() {
  const rule = getOutboundIssueRule()
  return rule === OUTBOUND_ISSUE_RULES.FIFO || rule === OUTBOUND_ISSUE_RULES.LIFO
}

export function getSalesOutboundIssueRule() {
  return normalizeSalesOutboundIssueRule(functionParamState.params.salesOutboundIssueRule)
}

export function setSalesOutboundIssueRule(mode) {
  const normalized = normalizeSalesOutboundIssueRule(mode)
  if (!SALES_OUTBOUND_ISSUE_RULE_OPTIONS.some((item) => item.value === normalized)) {
    return { ok: false, message: '无效的发货出库规则' }
  }
  functionParamState.params.salesOutboundIssueRule = normalized
  return { ok: true }
}

/** 销售发货是否按单扣批（禁止全仓 FIFO 抢他单按单库存） */
export function isSalesOutboundByOrder() {
  return getSalesOutboundIssueRule() === SALES_OUTBOUND_ISSUE_RULES.BY_ORDER
}

export function getShipAttachmentDecideStage() {
  return normalizeShipAttachmentDecideStage(functionParamState.params.shipAttachmentDecideStage)
}

export function setShipAttachmentDecideStage(mode) {
  const normalized = normalizeShipAttachmentDecideStage(mode)
  if (!SHIP_ATTACHMENT_DECIDE_STAGE_OPTIONS.some((item) => item.value === normalized)) {
    return { ok: false, message: '无效的随货附件确定环节' }
  }
  functionParamState.params.shipAttachmentDecideStage = normalized
  return { ok: true }
}

/** 销售申请发货时确定附件（展示申请页附件能力） */
export function isShipAttachmentDecidedAtApply() {
  return getShipAttachmentDecideStage() === SHIP_ATTACHMENT_DECIDE_STAGES.APPLY
}

/** 仓管发货时才确定附件（申请页隐藏，随货查询可维护） */
export function isShipAttachmentDecidedAtWarehouse() {
  return getShipAttachmentDecideStage() === SHIP_ATTACHMENT_DECIDE_STAGES.WAREHOUSE
}

export function getDualUnitIssueStrategy() {
  return normalizeDualUnitIssueStrategy(functionParamState.params.dualUnitIssueStrategy)
}

export function setDualUnitIssueStrategy(mode) {
  const normalized = normalizeDualUnitIssueStrategy(mode)
  const hit = DUAL_UNIT_ISSUE_STRATEGY_OPTIONS.find((item) => item.value === normalized)
  if (!hit || hit.disabled) return { ok: false, message: '无效的下料结算策略' }
  functionParamState.params.dualUnitIssueStrategy = normalized
  return { ok: true }
}

/** 全局「是否需要下料结算」是否为无需结算（仅作用于需下料结算能力物料） */
export function isPartialDualUnitIssue() {
  return getDualUnitIssueStrategy() === DUAL_UNIT_ISSUE_STRATEGIES.PARTIAL
}

/** 全局「是否需要下料结算」是否为需结算回库（仅作用于需下料结算能力物料） */
export function isWholeWithRemnantIssue() {
  return getDualUnitIssueStrategy() === DUAL_UNIT_ISSUE_STRATEGIES.WHOLE_WITH_REMNANT
}

/** 下料/订货尺寸辅助勾选项 */
export function getBlankSizeAssistTools() {
  return normalizeBlankSizeAssistTools(functionParamState.params.blankSizeAssistTools, {
    enablePlateAreaMeasure: functionParamState.params.enablePlateAreaMeasure,
    enableBomWeightCalc: functionParamState.params.enableBomWeightCalc,
  })
}

export function setBlankSizeAssistTools(enabledKeys = []) {
  const keys = Array.isArray(enabledKeys) ? enabledKeys : []
  functionParamState.params.blankSizeAssistTools = normalizeBlankSizeAssistTools(
    Object.fromEntries(
      BLANK_SIZE_ASSIST_OPTIONS.map((item) => [item.value, keys.includes(item.value)]),
    ),
  )
  functionParamState.params.blankSizeAssistToolsVersion = BLANK_SIZE_ASSIST_DEFAULTS_VERSION
  // 清理旧字段，避免下次加载被旧值覆盖
  delete functionParamState.params.enablePlateAreaMeasure
  delete functionParamState.params.enableBomWeightCalc
  return { ok: true }
}

/** 是否开放面积换算（下料尺寸 / 订货尺寸 / 入库长×宽；默认开） */
export function isPlateAreaMeasureEnabled() {
  return Boolean(getBlankSizeAssistTools()[BLANK_SIZE_ASSIST_TYPES.PLATE_AREA_MEASURE])
}

export function setEnablePlateAreaMeasure(enabled) {
  const current = getBlankSizeAssistTools()
  const next = {
    ...current,
    [BLANK_SIZE_ASSIST_TYPES.PLATE_AREA_MEASURE]: Boolean(enabled),
  }
  return setBlankSizeAssistTools(
    BLANK_SIZE_ASSIST_OPTIONS.filter((item) => next[item.value]).map((item) => item.value),
  )
}

/** 是否开放「重量计算」页签（BOM 下料尺寸 / 采购订货尺寸；默认开） */
export function isBomWeightCalcEnabled() {
  return Boolean(getBlankSizeAssistTools()[BLANK_SIZE_ASSIST_TYPES.BOM_WEIGHT_CALC])
}

export function setEnableBomWeightCalc(enabled) {
  const current = getBlankSizeAssistTools()
  const next = {
    ...current,
    [BLANK_SIZE_ASSIST_TYPES.BOM_WEIGHT_CALC]: Boolean(enabled),
  }
  return setBlankSizeAssistTools(
    BLANK_SIZE_ASSIST_OPTIONS.filter((item) => next[item.value]).map((item) => item.value),
  )
}

/** 生产计划是否启用 BOM 级 MTS（子件可按库存跳过排产） */
export function isBomLevelMtsEnabled() {
  return functionParamState.params.enableBomLevelMts === true
}

export function setEnableBomLevelMts(enabled) {
  functionParamState.params.enableBomLevelMts = Boolean(enabled)
  return { ok: true }
}

export function getQcDefaultGatePolicy() {
  return normalizeQcGatePolicyParam(functionParamState.params.qcDefaultGatePolicy)
}

export function setQcDefaultGatePolicy(value) {
  const v = normalizeQcGatePolicyParam(value)
  functionParamState.params.qcDefaultGatePolicy = v
  return { ok: true }
}

export function getQcGatePolicyByBizScope(bizScope) {
  const scope = String(bizScope || '').trim()
  const map = functionParamState.params.qcGatePolicyByBizScope || {}
  if (scope && map[scope]) return normalizeQcGatePolicyParam(map[scope])
  return getQcDefaultGatePolicy()
}

export function setQcGatePolicyByBizScope(bizScope, policy) {
  const scope = String(bizScope || '').trim()
  if (!scope) return { ok: false, message: 'bizScope 不能为空' }
  const normalized = normalizeQcGatePolicyParam(policy)
  const hit = QC_GATE_POLICY_PARAM_OPTIONS.find((o) => o.value === String(policy || '').trim())
  if (hit?.disabled || (String(policy || '').trim() === 'hard' && normalized === 'soft')) {
    return { ok: false, message: '当期仅开放弱管控，强管控后续开放' }
  }
  if (!functionParamState.params.qcGatePolicyByBizScope) {
    functionParamState.params.qcGatePolicyByBizScope = normalizeQcGatePolicyMap()
  }
  functionParamState.params.qcGatePolicyByBizScope[scope] = normalized
  functionParamState.params.qcDefaultGatePolicy = 'soft'
  return { ok: true }
}

export function getQcGatePolicyMap() {
  return normalizeQcGatePolicyMap(functionParamState.params.qcGatePolicyByBizScope)
}

export function setQcGatePolicyMap(map = {}) {
  functionParamState.params.qcGatePolicyByBizScope = normalizeQcGatePolicyMap(map)
  functionParamState.params.qcDefaultGatePolicy = 'soft'
  return { ok: true }
}

/** 展示项参数（不驱动业务逻辑，仅功能参数页可改） */
export function getDisplayParams() {
  return normalizeDisplayParams(functionParamState.params.displayParams)
}

export function getDisplayParam(key, fallback) {
  const map = getDisplayParams()
  if (Object.prototype.hasOwnProperty.call(map, key)) return map[key]
  return fallback
}

export function setDisplayParam(key, value) {
  const k = String(key || '').trim()
  if (!k) return { ok: false, message: '参数 key 不能为空' }
  functionParamState.params.displayParams = {
    ...getDisplayParams(),
    [k]: value,
  }
  return { ok: true }
}

/** @deprecated 使用 isReportSalaryPush */
export function isAutoSalaryPush() {
  return isReportSalaryPush()
}
