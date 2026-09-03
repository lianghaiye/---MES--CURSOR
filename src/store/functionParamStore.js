import { reactive, watch } from 'vue'

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
  '扣批是「整出」还是「部分出」见下方「下料结算发料方式」。「后进先出」「自主拣选」本期置灰未开放。'

/**
 * 下料结算物料的发料方式（仅作用于勾选「需要下料结算」的物料；普通料固定按出库数量扣）
 * - partial：部分出+余料留原批（按出库数量扣，不因整批多扣；无人填下料结算时常用）
 * - whole_with_remnant：整批出+下料结算回库（实发可大于出库数量；有人填实耗时用）
 */
export const DUAL_UNIT_ISSUE_STRATEGIES = {
  PARTIAL: 'partial',
  WHOLE_WITH_REMNANT: 'whole_with_remnant',
}

export const DUAL_UNIT_ISSUE_STRATEGY_OPTIONS = [
  {
    value: DUAL_UNIT_ISSUE_STRATEGIES.PARTIAL,
    label: '部分出+余料留原批',
    disabled: false,
  },
  {
    value: DUAL_UNIT_ISSUE_STRATEGIES.WHOLE_WITH_REMNANT,
    label: '整批出+下料结算回库',
    disabled: false,
  },
]

export const DUAL_UNIT_ISSUE_STRATEGY_DESCRIPTION =
  '仅对主数据勾选「需要下料结算」的物料生效；普通物料始终按出库数量扣、余量留原批，不受本项影响。' +
  '部分出+余料留原批：确认出库按「出库数量」扣减（出库数量可改，可大于 BOM 建议量），扣批合计等于出库数量，不因整根/整批而多扣，余量留原批（适合无人填下料结算）。' +
  '整批出+下料结算回库：整批/整段离开发料仓，实发可大于出库数量；领出后由下料结算填实耗并余料回库（适合有人管实耗）。'

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
  { value: 'hard', label: '强管控（阻断下游）' },
  { value: 'soft', label: '弱管控（仅预警）' },
]

export const QC_GATE_POLICY_BIZ_SCOPES = [
  '来料质检',
  '外协回货检',
  '生产过程检',
  '成品检',
  '出厂质检',
]

export const QC_GATE_POLICY_DESCRIPTION =
  '按质检业务类型配置下游门控：强管控在未检/不合格等场景阻断入库、报工、出库；弱管控仅 Toast 预警不拦按钮。默认强管控。'

function normalizeQcGatePolicyParam(value) {
  const v = String(value || '').trim()
  if (v === 'strong') return 'hard'
  if (v === 'weak') return 'soft'
  return QC_GATE_POLICY_PARAM_OPTIONS.some((o) => o.value === v) ? v : 'hard'
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
}

export const AUTO_APPROVE_OPTIONS = [
  { value: AUTO_APPROVE_TYPES.PURCHASE_ORDER, label: '采购订单' },
  { value: AUTO_APPROVE_TYPES.SALES_ORDER, label: '销售订单' },
  { value: AUTO_APPROVE_TYPES.SALES_ORDER_PRICE_CHANGE, label: '销售订单价格变更' },
  { value: AUTO_APPROVE_TYPES.PURCHASE_ORDER_PRICE_CHANGE, label: '采购订单价格变更' },
  { value: AUTO_APPROVE_TYPES.OUTSOURCING_ORDER, label: '外协订单' },
  { value: AUTO_APPROVE_TYPES.FINISHED_INBOUND, label: '成品入库' },
  { value: AUTO_APPROVE_TYPES.MATERIAL_REQUISITION, label: '领料申请' },
  { value: AUTO_APPROVE_TYPES.INVENTORY_DEDUCT, label: '库存扣减' },
]

export const AUTO_APPROVE_DESCRIPTION =
  '勾选后对应单据提交即自动审批通过。勾选「销售订单价格变更 / 采购订单价格变更」后，价格变更单提交即回写订单有效价。未勾选「领料申请」时，领料申请单需人工审核（待审核 → 审核通过 / 审核驳回）。未勾选「库存扣减」时，待确认扣减需人工确认（编辑 / 确认 / 作废）；勾选后提交即自动确认扣减。'

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

export const FUNCTION_PARAM_ROWS = [
  {
    key: 'salaryPushMode',
    scenario: '工资推送',
    description: SALARY_PUSH_DESCRIPTION,
  },
  {
    key: 'autoGenerateDocs',
    scenario: '自动生成单据',
    description: AUTO_GENERATE_DOC_DESCRIPTION,
  },
  {
    key: 'autoApproveDocs',
    scenario: '自动审批配置',
    description: AUTO_APPROVE_DESCRIPTION,
  },
  {
    key: 'inventoryDeductMode',
    scenario: '库存扣减',
    description: INVENTORY_DEDUCT_DESCRIPTION,
  },
  {
    key: 'outboundIssueRule',
    scenario: '出库规则',
    description: OUTBOUND_ISSUE_RULE_DESCRIPTION,
  },
  {
    key: 'dualUnitIssueStrategy',
    scenario: '下料结算发料方式',
    description: DUAL_UNIT_ISSUE_STRATEGY_DESCRIPTION,
  },
  {
    key: 'blankSizeAssistTools',
    scenario: '下料/订货尺寸辅助',
    description: BLANK_SIZE_ASSIST_DESCRIPTION,
  },
  {
    key: 'enableBomLevelMts',
    scenario: '生产计划启用 BOM 级 MTS',
    description: ENABLE_BOM_LEVEL_MTS_DESCRIPTION,
  },
]

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
          dualUnitIssueStrategy: normalizeDualUnitIssueStrategy(parsed.dualUnitIssueStrategy),
          blankSizeAssistTools,
          blankSizeAssistToolsVersion: BLANK_SIZE_ASSIST_DEFAULTS_VERSION,
          enableBomLevelMts: parsed.enableBomLevelMts === true,
          qcDefaultGatePolicy: normalizeQcGatePolicyParam(parsed.qcDefaultGatePolicy),
          qcGatePolicyByBizScope: normalizeQcGatePolicyMap(parsed.qcGatePolicyByBizScope),
        }
      }
    }
  } catch {
    /* ignore */
  }
  return null
}

function persist() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(functionParamState.params))
}

export const functionParamState = reactive({
  params: loadFromStorage() || {
    salaryPushMode: SALARY_PUSH_MODES.MANUAL,
    autoGenerateDocs: createDefaultAutoGenerateDocs(),
    autoApproveDocs: createDefaultAutoApproveDocs(),
    inventoryDeductMode: INVENTORY_DEDUCT_MODES.NO_ISSUE,
    outboundIssueRule: OUTBOUND_ISSUE_RULES.FIFO,
    dualUnitIssueStrategy: DUAL_UNIT_ISSUE_STRATEGIES.PARTIAL,
    blankSizeAssistTools: createDefaultBlankSizeAssistTools(),
    blankSizeAssistToolsVersion: BLANK_SIZE_ASSIST_DEFAULTS_VERSION,
    enableBomLevelMts: false,
    qcDefaultGatePolicy: 'hard',
    qcGatePolicyByBizScope: normalizeQcGatePolicyMap(),
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

export function getDualUnitIssueStrategy() {
  return normalizeDualUnitIssueStrategy(functionParamState.params.dualUnitIssueStrategy)
}

export function setDualUnitIssueStrategy(mode) {
  const normalized = normalizeDualUnitIssueStrategy(mode)
  const hit = DUAL_UNIT_ISSUE_STRATEGY_OPTIONS.find((item) => item.value === normalized)
  if (!hit || hit.disabled) return { ok: false, message: '无效的下料结算发料方式' }
  functionParamState.params.dualUnitIssueStrategy = normalized
  return { ok: true }
}

/** 全局「下料结算发料方式」是否为部分出（仅作用于需下料结算物料） */
export function isPartialDualUnitIssue() {
  return getDualUnitIssueStrategy() === DUAL_UNIT_ISSUE_STRATEGIES.PARTIAL
}

/** 全局「下料结算发料方式」是否为整出+余料回（仅作用于需下料结算物料） */
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
  if (!functionParamState.params.qcGatePolicyByBizScope) {
    functionParamState.params.qcGatePolicyByBizScope = normalizeQcGatePolicyMap()
  }
  functionParamState.params.qcGatePolicyByBizScope[scope] = normalizeQcGatePolicyParam(policy)
  return { ok: true }
}

export function getQcGatePolicyMap() {
  return normalizeQcGatePolicyMap(functionParamState.params.qcGatePolicyByBizScope)
}

/** @deprecated 使用 isReportSalaryPush */
export function isAutoSalaryPush() {
  return isReportSalaryPush()
}
