import { reactive, watch } from 'vue'
import dayjs from 'dayjs'
import { normalizeDiscountRate } from '@/utils/salesOrderPricing'
import {
  CONTRACT_CATEGORY,
  CONTRACT_CASH_DIRECTION,
  CONTRACT_SIGN_STATUS,
  CONTRACT_SOURCE,
  CONTRACT_STATUS,
  CONTRACT_TYPE,
  PAYMENT_PLAN_BASE,
  defaultPaymentNodesFor,
  defaultContractCategory,
  resolveContractCashDirection,
  resolveContractCategory,
  resolveContractSource,
} from '@/constants/salesContract'
import { normalizeSalesOrderProgressStatus, SALES_ORDER_STATUS } from '@/utils/salesOrderStatus'
import { AUTO_APPROVE_TYPES, isAutoApproveEnabled } from '@/store/functionParamStore'
import { getPresetPaymentNodes } from '@/store/contractPaymentNodePresetStore'

const SYSTEM_AUTO_APPROVER = '系统自动审批'

const STORAGE_KEY = 'i_doms_sales_contracts'
const LEGACY_FRAMEWORK_KEY = 'i_doms_framework_contracts'
const DATA_VERSION = 7

/** 合同明细默认税率（%） */
export const CONTRACT_DEFAULT_TAX_RATE = 13

export function createEmptyPartyLegal(partial = {}) {
  return {
    name: partial.name || '',
    legalRepresentative: partial.legalRepresentative || '',
    unifiedSocialCreditCode: partial.unifiedSocialCreditCode || '',
    openingBank: partial.openingBank || '',
    bankAccount: partial.bankAccount || '',
    invoiceName: partial.invoiceName || '',
    invoiceTaxNo: partial.invoiceTaxNo || '',
    address: partial.address || '',
  }
}

function createPaymentNode(partial = {}) {
  return {
    id: partial.id || `cpn-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    name: partial.name || '',
    /** 0~1；与 amount 二选一为主，也可都填（金额优先） */
    ratio: partial.ratio != null && partial.ratio !== '' ? Number(partial.ratio) : null,
    amount: partial.amount != null && partial.amount !== '' ? Number(partial.amount) : null,
    /** 本节点账期起算类型（可不同于合同默认；如预付款=签订日、发货款=发货日） */
    termStartType: partial.termStartType || '',
    /** 计划回款时间（可选，生成计划时优先作为到期日） */
    planDate: partial.planDate ? String(partial.planDate).slice(0, 10) : '',
    remark: partial.remark || '',
  }
}

/** 取公司级预设收付款节点；未配置时回退系统默认（收入/支出各一套） */
export function createDefaultPaymentNodes(contractType, cashDirection) {
  const preset = getPresetPaymentNodes(contractType, cashDirection)
  if (preset.length) return preset.map((item) => createPaymentNode({ ...item }))
  return defaultPaymentNodesFor(cashDirection).map((item) => createPaymentNode({ ...item }))
}

function seedContracts() {
  const nodes = () =>
    createDefaultPaymentNodes(CONTRACT_TYPE.STANDARD, CONTRACT_CASH_DIRECTION.INCOME)
  const expenseNodes = (type) => createDefaultPaymentNodes(type, CONTRACT_CASH_DIRECTION.EXPENSE)
  return [
    {
      id: 'sc-fc-1',
      contractNo: 'HT-20260528-001',
      contractName: '华东机械年度框架合同',
      customerName: '华东机械制造有限公司',
      contractType: CONTRACT_TYPE.FRAMEWORK,
      defaultDiscountRate: 0.95,
      settlementCycle: '月结',
      paymentTermStart: '开票日',
      paymentTermDays: 30,
      validFrom: '2026-01-01',
      validTo: '2026-12-31',
      limitAmount: 5000000,
      limitQty: null,
      allowExceedQuota: true,
      priceItems: [
        {
          id: 'fci-1',
          productCode: 'MD-200-BLK',
          productId: '',
          productName: '迷你电机黑',
          specModel: 'MD-200',
          material: '铝合金',
          unit: '台',
          agreementDiscountRate: 0.9,
        },
        {
          id: 'fci-2',
          productCode: 'CP2610004',
          productId: '',
          productName: '控制面板',
          specModel: 'CP26',
          material: 'ABS',
          unit: '台',
          agreementDiscountRate: 0.92,
        },
      ],
      lineItems: [],
      paymentNodes: nodes(),
      attachments: [{ id: 'att-fc-1', name: '华东框架合同扫描件.pdf' }],
      salesperson: '王五',
      signer: '李法务',
      taxInclusive: true,
      partyLegal: {
        name: '华东机械制造有限公司',
        legalRepresentative: '张三',
        unifiedSocialCreditCode: '91310000MA1FL3XX',
        openingBank: '中国银行上海支行',
        bankAccount: '4512345678901234',
        invoiceName: '华东机械制造有限公司',
        invoiceTaxNo: '91310000MA1FL3XX',
      },
      remark: '战略合作客户框架价，季度复盘协议折扣。',
      status: CONTRACT_STATUS.ACTIVE,
      signStatus: CONTRACT_SIGN_STATUS.SIGNED,
      signedAt: '2026-01-08 15:20',
      signedBy: '李法务',
      createdAt: '2026-01-05 10:00',
      updatedAt: '2026-01-08 15:20',
      approvedAt: '2026-01-05 11:00',
      approvedBy: 'admin',
    },
    {
      id: 'sc-fc-2',
      contractNo: 'HT-20260301-FW',
      contractName: '山东化工泵业框架协议',
      customerName: '山东化工泵业集团',
      contractType: CONTRACT_TYPE.FRAMEWORK,
      salesperson: '李四',
      signer: '',
      taxInclusive: true,
      defaultDiscountRate: 0.97,
      settlementCycle: '月结',
      paymentTermStart: '发货日',
      paymentTermDays: 45,
      validFrom: '2026-03-01',
      validTo: '2027-02-28',
      limitAmount: 8000000,
      limitQty: 50,
      allowExceedQuota: true,
      priceItems: [
        {
          id: 'fci-3',
          productCode: 'SP-QH-100',
          productId: '',
          productName: '气动夹具',
          specModel: 'QH-100',
          material: '钢',
          unit: '台',
          agreementDiscountRate: 0.95,
        },
      ],
      lineItems: [],
      paymentNodes: nodes(),
      attachments: [],
      remark: '华北区域重点客户，额度含数量上限。',
      status: CONTRACT_STATUS.ACTIVE,
      signStatus: CONTRACT_SIGN_STATUS.UNSIGNED,
      createdAt: '2026-02-28 14:00',
      updatedAt: '2026-03-01 09:30',
      approvedAt: '2026-03-01 09:30',
      approvedBy: 'admin',
    },
    {
      id: 'sc-st-1',
      contractNo: 'HT-20261001-STD',
      contractName: '华东机械潜水电泵供货合同',
      customerName: '华东机械制造有限公司',
      contractType: CONTRACT_TYPE.STANDARD,
      defaultDiscountRate: 1,
      settlementCycle: '月结',
      paymentTermStart: '开票日',
      paymentTermDays: 30,
      validFrom: '2026-10-01',
      validTo: '2027-03-31',
      limitAmount: 320000,
      limitQty: 2,
      allowExceedQuota: false,
      priceItems: [],
      lineItems: [
        {
          id: 'sci-1',
          productCode: 'CP2610004',
          productName: '潜水电泵 QJ200-40/3',
          specModel: 'QJ200-40/3',
          material: '不锈钢',
          qty: 2,
          unit: '台',
          unitPriceExTax: 160000,
          amountExTax: 320000,
          deliveryDate: '2026-11-30',
          packagingForm: '木箱',
          supplementDesc: '',
        },
      ],
      paymentNodes: nodes(),
      attachments: [],
      salesperson: '王五',
      signer: '王五',
      taxInclusive: false,
      remark: '标准合同示例，已生效未签署。',
      status: CONTRACT_STATUS.ACTIVE,
      signStatus: CONTRACT_SIGN_STATUS.UNSIGNED,
      createdAt: '2026-10-01 09:00',
      updatedAt: '2026-10-01 09:30',
      approvedAt: '2026-10-01 10:00',
      approvedBy: 'admin',
    },
    {
      id: 'sc-st-2',
      contractNo: 'HT-20260915-STD',
      contractName: '齐鲁石化多级泵采购合同',
      customerName: '齐鲁石化装备分公司',
      contractType: CONTRACT_TYPE.STANDARD,
      salesperson: '赵六',
      signer: '赵六',
      taxInclusive: true,
      settlementCycle: '月结',
      paymentTermStart: '验收日',
      paymentTermDays: 60,
      validFrom: '2026-09-15',
      validTo: '2026-12-31',
      limitAmount: 580000,
      limitQty: 4,
      allowExceedQuota: false,
      priceItems: [],
      lineItems: [
        {
          id: 'sci-2',
          productCode: 'DG-85-80',
          productName: '多级离心泵 DG85-80',
          specModel: 'DG85-80',
          material: '铸铁',
          qty: 4,
          unit: '台',
          unitPriceExTax: 145000,
          amountExTax: 580000,
          deliveryDate: '2026-11-15',
          packagingForm: '铁架+木箱',
          supplementDesc: '现场指导安装',
        },
      ],
      paymentNodes: nodes(),
      attachments: [{ id: 'att-st-2', name: '齐鲁石化合同盖章件.pdf' }],
      remark: '履约完毕，已正常完成。',
      status: CONTRACT_STATUS.COMPLETED,
      signStatus: CONTRACT_SIGN_STATUS.SIGNED,
      signedAt: '2026-09-20 11:00',
      signedBy: '赵六',
      completedAt: '2026-10-15 16:00',
      createdAt: '2026-09-15 10:20',
      updatedAt: '2026-10-15 16:00',
      approvedAt: '2026-09-16 09:00',
      approvedBy: 'admin',
    },
    {
      id: 'sc-st-3',
      contractNo: 'HT-20261018-DFT',
      contractName: '滨州港务清水泵供货合同（草稿）',
      customerName: '滨州港务集团',
      contractType: CONTRACT_TYPE.STANDARD,
      salesperson: '李四',
      taxInclusive: true,
      settlementCycle: '月结',
      paymentTermStart: '开票日',
      paymentTermDays: 15,
      validFrom: '2026-10-20',
      validTo: '2027-01-31',
      limitAmount: 96000,
      limitQty: 3,
      allowExceedQuota: true,
      priceItems: [],
      lineItems: [
        {
          id: 'sci-3',
          productCode: 'IS-100-65',
          productName: '清水离心泵 IS100-65',
          specModel: 'IS100-65-200',
          material: '铸铁',
          qty: 3,
          unit: '台',
          unitPriceExTax: 32000,
          amountExTax: 96000,
          deliveryDate: '2026-12-10',
          packagingForm: '纸箱',
          supplementDesc: '',
        },
      ],
      paymentNodes: nodes(),
      attachments: [],
      remark: '商务条款待客户确认。',
      status: CONTRACT_STATUS.DRAFT,
      signStatus: CONTRACT_SIGN_STATUS.UNSIGNED,
      createdAt: '2026-10-18 16:40',
      updatedAt: '2026-10-18 16:40',
    },
    {
      id: 'sc-st-4',
      contractNo: 'HT-20261012-PEN',
      contractName: '烟台造船厂消防泵合同',
      customerName: '烟台造船厂有限公司',
      contractType: CONTRACT_TYPE.STANDARD,
      settlementCycle: '月结',
      paymentTermStart: '合同签订日',
      paymentTermDays: 30,
      validFrom: '2026-10-12',
      validTo: '2027-04-30',
      limitAmount: 210000,
      limitQty: 2,
      allowExceedQuota: false,
      priceItems: [],
      lineItems: [
        {
          id: 'sci-4',
          productCode: 'XBD-5.0',
          productName: '消防泵组 XBD5.0/30-100',
          specModel: 'XBD5.0/30-100',
          material: '球墨铸铁',
          qty: 2,
          unit: '套',
          unitPriceExTax: 105000,
          amountExTax: 210000,
          deliveryDate: '2027-01-20',
          packagingForm: '木箱',
          supplementDesc: '含控制柜',
        },
      ],
      paymentNodes: nodes(),
      attachments: [],
      remark: '已提交审核，待法务复核。',
      status: CONTRACT_STATUS.PENDING,
      signStatus: CONTRACT_SIGN_STATUS.UNSIGNED,
      submittedAt: '2026-10-13 09:10',
      createdAt: '2026-10-12 11:00',
      updatedAt: '2026-10-13 09:10',
    },
    {
      id: 'sc-st-5',
      contractNo: 'HT-20260928-REJ',
      contractName: '潍坊水务污水泵合同',
      customerName: '潍坊水务集团',
      contractType: CONTRACT_TYPE.STANDARD,
      settlementCycle: '月结',
      paymentTermStart: '对账日',
      paymentTermDays: 45,
      validFrom: '2026-10-01',
      validTo: '2027-03-31',
      limitAmount: 175000,
      limitQty: 5,
      allowExceedQuota: false,
      priceItems: [],
      lineItems: [
        {
          id: 'sci-5',
          productCode: 'WQ-100',
          productName: '潜水排污泵 WQ100-10-7.5',
          specModel: 'WQ100-10-7.5',
          material: '铸铁',
          qty: 5,
          unit: '台',
          unitPriceExTax: 35000,
          amountExTax: 175000,
          deliveryDate: '2026-12-01',
          packagingForm: '木箱',
          supplementDesc: '',
        },
      ],
      paymentNodes: nodes(),
      attachments: [],
      remark: '价格条款需重新谈判。',
      status: CONTRACT_STATUS.REJECTED,
      signStatus: CONTRACT_SIGN_STATUS.UNSIGNED,
      rejectReason: '单价高于近期同类成交价，请商务重新议价后再提交。',
      submittedAt: '2026-09-29 10:00',
      approvalRecords: [
        {
          name: 'admin',
          role: '审核人',
          result: '已驳回',
          opinion: '单价高于近期同类成交价，请商务重新议价后再提交。',
          time: '2026-09-29 15:30',
        },
      ],
      createdAt: '2026-09-28 14:20',
      updatedAt: '2026-09-29 15:30',
    },
    {
      id: 'sc-fc-3',
      contractNo: 'HT-20260110-FW',
      contractName: '青岛港务年度框架（已终止）',
      customerName: '青岛港国际股份有限公司',
      contractType: CONTRACT_TYPE.FRAMEWORK,
      defaultDiscountRate: 0.96,
      settlementCycle: '季结',
      paymentTermStart: '开票日',
      paymentTermDays: 30,
      validFrom: '2025-01-01',
      validTo: '2025-12-31',
      limitAmount: 3000000,
      limitQty: null,
      allowExceedQuota: false,
      priceItems: [
        {
          id: 'fci-4',
          productCode: 'MD-200-BLK',
          productId: '',
          productName: '迷你电机黑',
          specModel: 'MD-200',
          material: '铝合金',
          unit: '台',
          agreementDiscountRate: 0.93,
        },
      ],
      lineItems: [],
      paymentNodes: nodes(),
      attachments: [],
      remark: '年度到期终止，续签另立新约。',
      status: CONTRACT_STATUS.TERMINATED,
      signStatus: CONTRACT_SIGN_STATUS.SIGNED,
      signedAt: '2025-01-15 10:00',
      signedBy: 'admin',
      terminatedAt: '2026-01-10 09:00',
      terminateReason: '合同到期终止',
      createdAt: '2025-01-08 09:00',
      updatedAt: '2026-01-10 09:00',
      approvedAt: '2025-01-10 11:00',
      approvedBy: 'admin',
    },
    {
      id: 'sc-po-1',
      contractNo: 'HT-CG-20261001-001',
      contractName: '铸件年度采购框架',
      cashDirection: CONTRACT_CASH_DIRECTION.EXPENSE,
      contractCategory: CONTRACT_CATEGORY.PURCHASE,
      supplierName: '多功能供应商01',
      customerName: '',
      contractType: CONTRACT_TYPE.FRAMEWORK,
      defaultDiscountRate: 0.97,
      settlementCycle: '月结',
      paymentTermStart: '到货日',
      paymentTermDays: 30,
      validFrom: '2026-01-01',
      validTo: '2026-12-31',
      limitAmount: 2000000,
      limitQty: null,
      allowExceedQuota: true,
      paymentPlanBase: PAYMENT_PLAN_BASE.PURCHASE_ORDERS,
      priceItems: [],
      lineItems: [],
      paymentNodes: expenseNodes(CONTRACT_TYPE.FRAMEWORK),
      attachments: [],
      salesperson: '赵采购',
      signer: '李法务',
      taxInclusive: true,
      partyLegal: {
        name: '多功能供应商01',
      },
      remark: '铸件、机加毛坯年度协议价。',
      status: CONTRACT_STATUS.ACTIVE,
      signStatus: CONTRACT_SIGN_STATUS.SIGNED,
      signedAt: '2026-01-06 10:00',
      signedBy: '李法务',
      createdAt: '2026-01-04 09:00',
      updatedAt: '2026-01-06 10:00',
      approvedAt: '2026-01-05 11:00',
      approvedBy: 'admin',
    },
    {
      id: 'sc-wx-1',
      contractNo: 'HT-WX-20261008-001',
      contractName: '热处理外协加工合同',
      cashDirection: CONTRACT_CASH_DIRECTION.EXPENSE,
      contractCategory: CONTRACT_CATEGORY.OUTSOURCE,
      supplierName: '多功能供应商01',
      customerName: '',
      contractType: CONTRACT_TYPE.STANDARD,
      defaultDiscountRate: 1,
      settlementCycle: '月结',
      paymentTermDays: 15,
      validFrom: '2026-10-01',
      validTo: '2027-03-31',
      limitAmount: 180000,
      paymentPlanBase: PAYMENT_PLAN_BASE.PURCHASE_ORDERS,
      priceItems: [],
      lineItems: [],
      paymentNodes: expenseNodes(CONTRACT_TYPE.STANDARD),
      attachments: [],
      salesperson: '赵采购',
      signer: '',
      taxInclusive: true,
      partyLegal: { name: '多功能供应商01' },
      remark: '叶轮、轴热处理工序外协。',
      status: CONTRACT_STATUS.ACTIVE,
      signStatus: CONTRACT_SIGN_STATUS.UNSIGNED,
      createdAt: '2026-10-02 14:00',
      updatedAt: '2026-10-02 14:00',
      approvedAt: '2026-10-03 09:00',
      approvedBy: 'admin',
    },
  ]
}

function migrateFromFramework(list = []) {
  return list.map((item) =>
    normalizeContractRecord({
      ...item,
      contractType: item.contractType || CONTRACT_TYPE.FRAMEWORK,
      allowExceedQuota: item.allowExceedQuota !== false,
      limitAmount: item.limitAmount ?? null,
      limitQty: item.limitQty ?? null,
      lineItems: item.lineItems || [],
      paymentNodes: Array.isArray(item.paymentNodes)
        ? item.paymentNodes.map(createPaymentNode)
        : createDefaultPaymentNodes(item.contractType, resolveContractCashDirection(item)),
      attachments: item.attachments || [],
    }),
  )
}

function loadFromStorage() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) {
      const parsed = JSON.parse(raw)
      // 仅接受当前版本；升版本时重新灌入 seed，避免旧 mock 卡住演示数据
      if (parsed.version === DATA_VERSION && Array.isArray(parsed.contracts)) {
        return parsed.contracts.map(normalizeContractRecord)
      }
    }
    const legacy = localStorage.getItem(LEGACY_FRAMEWORK_KEY)
    if (legacy && DATA_VERSION === 1) {
      const parsed = JSON.parse(legacy)
      if (Array.isArray(parsed.contracts) && parsed.contracts.length) {
        return migrateFromFramework(parsed.contracts)
      }
    }
  } catch {
    /* ignore */
  }
  return seedContracts().map(normalizeContractRecord)
}

function persist() {
  localStorage.setItem(
    STORAGE_KEY,
    JSON.stringify({ version: DATA_VERSION, contracts: salesContractState.contracts }),
  )
}

/**
 * 签署状态：已填写签署日期且当前日期 ≥ 签署日期时，视为已签署
 */
export function resolveContractSignStatus(contract = {}) {
  if (contract.signStatus === CONTRACT_SIGN_STATUS.SIGNED) {
    return CONTRACT_SIGN_STATUS.SIGNED
  }
  const raw = contract.signedAt || ''
  if (!raw) return contract.signStatus || CONTRACT_SIGN_STATUS.UNSIGNED
  const d = dayjs(String(raw).slice(0, 10))
  if (!d.isValid()) return contract.signStatus || CONTRACT_SIGN_STATUS.UNSIGNED
  if (dayjs().format('YYYY-MM-DD') >= d.format('YYYY-MM-DD')) {
    return CONTRACT_SIGN_STATUS.SIGNED
  }
  return contract.signStatus || CONTRACT_SIGN_STATUS.UNSIGNED
}

function resolvePaymentPlanBase(row = {}) {
  if (row.paymentPlanBase === PAYMENT_PLAN_BASE.LIMIT) return PAYMENT_PLAN_BASE.LIMIT
  if (resolveContractCashDirection(row) === CONTRACT_CASH_DIRECTION.EXPENSE) {
    return PAYMENT_PLAN_BASE.PURCHASE_ORDERS
  }
  return PAYMENT_PLAN_BASE.ORDERS
}

export function normalizeContractRecord(row = {}) {
  const signedAt = row.signedAt || ''
  return {
    id: row.id || `sc-${Date.now()}`,
    contractNo: row.contractNo || '',
    contractName: row.contractName || '',
    cashDirection: resolveContractCashDirection(row),
    contractCategory:
      resolveContractCategory(row) || defaultContractCategory(resolveContractCashDirection(row)),
    customerName: row.customerName || '',
    supplierName: row.supplierName || '',
    contractType: row.contractType || CONTRACT_TYPE.FRAMEWORK,
    salesperson: row.salesperson || '',
    signer: row.signer || '',
    taxInclusive: row.taxInclusive !== false,
    partyLegal: createEmptyPartyLegal(row.partyLegal || {}),
    defaultDiscountRate: normalizeDiscountRate(row.defaultDiscountRate, 1),
    settlementCycle: row.settlementCycle || '',
    /** 兼容旧数据；新合同以节点 termStartType 为准 */
    paymentTermStart: row.paymentTermStart || '',
    paymentTermDays:
      row.paymentTermDays != null && row.paymentTermDays !== '' ? Number(row.paymentTermDays) : 30,
    validFrom: row.validFrom || '',
    validTo: row.validTo || '',
    limitAmount: row.limitAmount != null && row.limitAmount !== '' ? Number(row.limitAmount) : null,
    limitQty: row.limitQty != null && row.limitQty !== '' ? Number(row.limitQty) : null,
    allowExceedQuota: row.allowExceedQuota !== false,
    /** 框架合同：收付款计划按额度还是按关联订单金额 */
    paymentPlanBase: resolvePaymentPlanBase(row),
    priceItems: Array.isArray(row.priceItems) ? row.priceItems : [],
    lineItems: Array.isArray(row.lineItems) ? row.lineItems : [],
    paymentNodes: Array.isArray(row.paymentNodes)
      ? row.paymentNodes.map(createPaymentNode)
      : createDefaultPaymentNodes(row.contractType, resolveContractCashDirection(row)),
    attachments: Array.isArray(row.attachments) ? row.attachments : [],
    remark: row.remark || '',
    serviceContent: row.serviceContent || '',
    status: row.status || CONTRACT_STATUS.DRAFT,
    signedAt,
    signStatus: resolveContractSignStatus({
      signStatus: row.signStatus || CONTRACT_SIGN_STATUS.UNSIGNED,
      signedAt,
    }),
    signedBy: row.signedBy || '',
    sourceSalesOrderId: row.sourceSalesOrderId || '',
    sourceSalesOrderNo: row.sourceSalesOrderNo || '',
    sourceType: resolveContractSource(row),
    creator: row.creator || 'admin',
    createdAt: row.createdAt || dayjs().format('YYYY-MM-DD HH:mm'),
    updatedAt: row.updatedAt || dayjs().format('YYYY-MM-DD HH:mm'),
    submittedAt: row.submittedAt || '',
    approvedAt: row.approvedAt || '',
    approvedBy: row.approvedBy || '',
    rejectReason: row.rejectReason || '',
    approvalRecords: Array.isArray(row.approvalRecords) ? row.approvalRecords : [],
    terminatedAt: row.terminatedAt || '',
    terminateReason: row.terminateReason || '',
    completedAt: row.completedAt || '',
  }
}

function pushApprovalRecord(contract, { result, opinion = '', operator = 'admin' }) {
  if (!contract.approvalRecords) contract.approvalRecords = []
  contract.approvalRecords.unshift({
    name: operator,
    role: '审核人',
    result,
    opinion: opinion || '',
    time: dayjs().format('YYYY-MM-DD HH:mm'),
  })
}

export function canEditSalesContract(contract) {
  const status = contract?.status
  return status === CONTRACT_STATUS.DRAFT || status === CONTRACT_STATUS.REJECTED
}

export function canSubmitSalesContract(contract) {
  return contract?.status === CONTRACT_STATUS.DRAFT
}

export function canResubmitSalesContract(contract) {
  return contract?.status === CONTRACT_STATUS.REJECTED
}

export function canWithdrawSalesContract(contract) {
  return contract?.status === CONTRACT_STATUS.PENDING
}

export function canApproveSalesContract(contract) {
  return contract?.status === CONTRACT_STATUS.PENDING
}

export function canDeleteSalesContract(contract) {
  const status = contract?.status
  // 已完成不可删；已终止/草稿/已驳回可删
  return (
    status === CONTRACT_STATUS.DRAFT ||
    status === CONTRACT_STATUS.REJECTED ||
    status === CONTRACT_STATUS.TERMINATED
  )
}

export function canCompleteSalesContract(contract) {
  return contract?.status === CONTRACT_STATUS.ACTIVE
}

export const salesContractState = reactive({
  contracts: loadFromStorage(),
})

watch(
  () => salesContractState.contracts,
  () => persist(),
  { deep: true },
)

// 版本升级后首次加载 seed 时立即写入，避免旧版 localStorage 卡住演示数据
try {
  const raw = localStorage.getItem(STORAGE_KEY)
  const parsed = raw ? JSON.parse(raw) : null
  if (!parsed || parsed.version !== DATA_VERSION) {
    persist()
  }
} catch {
  persist()
}

export function listSalesContracts({
  contractType,
  customerName,
  supplierName,
  status,
  cashDirection,
  contractCategory,
} = {}) {
  return salesContractState.contracts.filter((item) => {
    if (contractType && item.contractType !== contractType) return false
    if (customerName && item.customerName !== customerName) return false
    if (supplierName && item.supplierName !== supplierName) return false
    if (cashDirection && resolveContractCashDirection(item) !== cashDirection) return false
    if (contractCategory && resolveContractCategory(item) !== contractCategory) return false
    if (status && item.status !== status) return false
    return true
  })
}

export function getSalesContractById(id) {
  if (!id) return null
  return salesContractState.contracts.find((item) => item.id === id) || null
}

export function getSalesContractByNo(contractNo) {
  if (!contractNo) return null
  return salesContractState.contracts.find((item) => item.contractNo === contractNo) || null
}

/** 生效中且在有效期内的合同选项（下单用） */
export function getActiveSalesContractOptions(customerName = '', contractType = '', extra = {}) {
  const today = dayjs().format('YYYY-MM-DD')
  const cashDirection = extra.cashDirection || CONTRACT_CASH_DIRECTION.INCOME
  const supplierName = extra.supplierName || ''
  return salesContractState.contracts
    .filter((item) => item.status === CONTRACT_STATUS.ACTIVE)
    .filter((item) => resolveContractCashDirection(item) === cashDirection)
    .filter((item) => {
      if (cashDirection === CONTRACT_CASH_DIRECTION.EXPENSE) {
        return !supplierName || item.supplierName === supplierName
      }
      return !customerName || item.customerName === customerName
    })
    .filter((item) => !contractType || item.contractType === contractType)
    .filter((item) => {
      const cat = extra.contractCategory || ''
      return !cat || resolveContractCategory(item) === cat
    })
    .filter((item) => {
      if (item.validFrom && today < item.validFrom) return false
      if (item.validTo && today > item.validTo) return false
      return true
    })
    .map((item) => ({
      label: `${item.contractNo} · ${item.contractName || item.contractType}`,
      value: item.contractNo,
      contract: item,
    }))
}

/** 框架合同价解析（兼容原 resolveFrameworkContractPrice） */
export function resolveContractPrice(contract, productId, productCode, baseListPrice = 0) {
  if (!contract) {
    return {
      listUnitPriceExTax: baseListPrice,
      lineDiscountRate: 1,
      priceSource: 'product',
    }
  }

  const defaultRate = normalizeDiscountRate(contract.defaultDiscountRate, 1)
  const items = [
    ...(contract.priceItems || []),
    ...(contract.lineItems || []).map((line) => ({
      productId: line.productId,
      productCode: line.productCode,
      agreementUnitPriceExTax: line.unitPriceExTax,
      agreementDiscountRate: line.agreementDiscountRate,
    })),
  ]
  const hit =
    items.find((item) => item.productId && item.productId === productId) ||
    items.find((item) => item.productCode && item.productCode === productCode)

  if (hit?.agreementUnitPriceExTax != null && hit.agreementUnitPriceExTax !== '') {
    const agreementPrice = Number(hit.agreementUnitPriceExTax) || 0
    const baseList = baseListPrice > 0 ? baseListPrice : agreementPrice
    const rate = baseList > 0 ? agreementPrice / baseList : 1
    return {
      listUnitPriceExTax: baseList,
      lineDiscountRate: normalizeDiscountRate(rate, 1),
      priceSource: 'contract',
    }
  }

  if (hit?.agreementDiscountRate != null && hit.agreementDiscountRate !== '') {
    return {
      listUnitPriceExTax: baseListPrice,
      lineDiscountRate: normalizeDiscountRate(hit.agreementDiscountRate, defaultRate),
      priceSource: 'contract',
    }
  }

  if (contract.contractType === CONTRACT_TYPE.FRAMEWORK) {
    return {
      listUnitPriceExTax: baseListPrice,
      lineDiscountRate: defaultRate,
      priceSource: defaultRate < 1 ? 'contract' : 'product',
    }
  }

  return {
    listUnitPriceExTax: baseListPrice,
    lineDiscountRate: 1,
    priceSource: 'product',
  }
}

function isOrderCountedInContractQuota(order) {
  const status = normalizeSalesOrderProgressStatus(order?.progressStatus)
  return status !== SALES_ORDER_STATUS.VOIDED
}

export function getOrdersLinkedToContract(contractNo) {
  if (!contractNo) return []
  // 延迟加载，避免 frameworkContractStore → salesContractStore → salesOrderStore → productionPlanStore 循环依赖
  // eslint-disable-next-line global-require
  const { salesOrderState } = require('@/store/salesOrderStore')
  void salesOrderState.orders
  return (salesOrderState.orders || []).filter((o) => o.contractNo === contractNo)
}

/** 参与额度占用的关联订单（排除已作废） */
export function getOrdersCountedInContractQuota(contractNo) {
  return getOrdersLinkedToContract(contractNo).filter(isOrderCountedInContractQuota)
}

function isExpenseDocCounted(status) {
  return String(status || '') !== '已作废'
}

export function getPurchaseOrdersLinkedToContract(contractNo) {
  if (!contractNo) return []
  // eslint-disable-next-line global-require
  const { purchaseOrderState } = require('@/store/purchaseOrderStore')
  void purchaseOrderState.orders
  return (purchaseOrderState.orders || []).filter((o) => o.contractNo === contractNo)
}

export function getOutsourcingOrdersLinkedToContract(contractNo) {
  if (!contractNo) return []
  // eslint-disable-next-line global-require
  const { outsourcingOrderState } = require('@/store/outsourcingOrderStore')
  void outsourcingOrderState.orders
  return (outsourcingOrderState.orders || []).filter((o) => o.contractNo === contractNo)
}

/** 已执行金额：收入合同按销售订单；支出合同按采购/外协含税金额 */
export function calcContractExecutedAmount(contract) {
  if (!contract?.contractNo) return 0
  if (resolveContractCashDirection(contract) === CONTRACT_CASH_DIRECTION.EXPENSE) {
    const pos = getPurchaseOrdersLinkedToContract(contract.contractNo).filter((o) =>
      isExpenseDocCounted(o.status),
    )
    const wxs = getOutsourcingOrdersLinkedToContract(contract.contractNo).filter((o) =>
      isExpenseDocCounted(o.status),
    )
    const sum =
      pos.reduce((s, o) => s + (Number(o.amountInTax) || 0), 0) +
      wxs.reduce((s, o) => s + (Number(o.amountInTax) || 0), 0)
    return Math.round(sum * 100) / 100
  }
  const orders = getOrdersCountedInContractQuota(contract.contractNo)
  return (
    Math.round(
      orders.reduce((sum, o) => sum + (Number(o.totalAmountInTax ?? o.amountInTax) || 0), 0) * 100,
    ) / 100
  )
}

export function calcContractExecutedQty(contract) {
  if (!contract?.contractNo) return 0
  if (resolveContractCashDirection(contract) === CONTRACT_CASH_DIRECTION.EXPENSE) {
    const pos = getPurchaseOrdersLinkedToContract(contract.contractNo).filter((o) =>
      isExpenseDocCounted(o.status),
    )
    const wxs = getOutsourcingOrdersLinkedToContract(contract.contractNo).filter((o) =>
      isExpenseDocCounted(o.status),
    )
    const poQty = pos.reduce(
      (s, o) =>
        s + (o.lineItems || []).reduce((n, l) => n + (Number(l.purchaseQty ?? l.qty) || 0), 0),
      0,
    )
    const wxQty = wxs.reduce(
      (s, o) => s + (o.lineItems || []).reduce((n, l) => n + (Number(l.planQty ?? l.qty) || 0), 0),
      0,
    )
    return Math.round((poQty + wxQty) * 1000) / 1000
  }
  const orders = getOrdersCountedInContractQuota(contract.contractNo)
  return orders.reduce((sum, o) => {
    const lines = o.lineItems || []
    return sum + lines.reduce((s, l) => s + (Number(l.salesQty ?? l.qty) || 0), 0)
  }, 0)
}

export function getContractQuotaSummary(contract) {
  const executedAmount = calcContractExecutedAmount(contract)
  const executedQty = calcContractExecutedQty(contract)
  const limitAmount =
    contract?.limitAmount != null && contract.limitAmount !== ''
      ? Number(contract.limitAmount)
      : null
  const limitQty =
    contract?.limitQty != null && contract.limitQty !== '' ? Number(contract.limitQty) : null
  const remainAmount =
    limitAmount != null ? Math.round((limitAmount - executedAmount) * 100) / 100 : null
  const remainQty = limitQty != null ? Math.round((limitQty - executedQty) * 1000) / 1000 : null
  return {
    limitAmount,
    limitQty,
    executedAmount,
    executedQty,
    remainAmount,
    remainQty,
    allowExceedQuota: contract?.allowExceedQuota !== false,
  }
}

export function listContractsBySourceSalesOrder(orderId) {
  if (!orderId) return []
  return salesContractState.contracts.filter(
    (c) => c.sourceSalesOrderId === orderId && c.status !== CONTRACT_STATUS.TERMINATED,
  )
}

/** 是否可从销售订单生成标准合同 */
export function canGenerateContractFromSalesOrder(order) {
  if (!order?.id) return { ok: false, message: '订单不存在' }
  const status = order.progressStatus || ''
  if (status === '已作废') return { ok: false, message: '已作废订单不可生成合同' }
  if (!order.customerName?.trim()) return { ok: false, message: '订单缺少客户' }
  if (!order.lineItems?.length) return { ok: false, message: '订单无明细，无法生成合同' }
  return { ok: true }
}

/**
 * 由销售订单预填标准合同草稿（不落库）
 * @returns {{ ok: boolean, message?: string, data?: object, existing?: object[] }}
 */
export function buildContractDraftFromSalesOrder(order) {
  const guard = canGenerateContractFromSalesOrder(order)
  if (!guard.ok) return guard

  const existing = listContractsBySourceSalesOrder(order.id)
  const lineItems = (order.lineItems || []).map((line, idx) => {
    const qty = Number(line.salesQty ?? line.qty) || 0
    const unitPriceExTax =
      line.unitPriceExTax != null && line.unitPriceExTax !== '' ? Number(line.unitPriceExTax) : null
    let amountExTax =
      line.totalPriceExTax != null && line.totalPriceExTax !== ''
        ? Number(line.totalPriceExTax)
        : line.amountExTax != null && line.amountExTax !== ''
          ? Number(line.amountExTax)
          : null
    if (amountExTax == null && unitPriceExTax != null) {
      amountExTax = Math.round(qty * unitPriceExTax * 100) / 100
    }
    return {
      id: `sci-from-so-${order.id}-${line.id || idx}`,
      productId: line.productId || '',
      productCode: line.productCode || '',
      productName: line.productName || '',
      specModel: line.specModel || '',
      material: line.material || '',
      qty,
      unit: line.unit || '台',
      unitPriceExTax,
      amountExTax,
      deliveryDate: line.deliveryDate || '',
      packagingForm: line.packagingForm || '',
      supplementDesc: line.supplementDesc || '',
    }
  })

  const limitAmount =
    order.amountExTax != null && order.amountExTax !== ''
      ? Number(order.amountExTax)
      : Math.round(lineItems.reduce((s, l) => s + (Number(l.amountExTax) || 0), 0) * 100) / 100
  const limitQty = Math.round(lineItems.reduce((s, l) => s + (Number(l.qty) || 0), 0) * 1000) / 1000

  return {
    ok: true,
    existing,
    data: {
      contractType: CONTRACT_TYPE.STANDARD,
      contractNo: '',
      contractName: `${order.customerName}销售合同`,
      customerName: order.customerName,
      settlementCycle: order.settlementCycle || '',
      paymentTermDays:
        order.paymentTermDays != null && order.paymentTermDays !== ''
          ? Number(order.paymentTermDays)
          : 30,
      validFrom: '',
      validTo: '',
      limitAmount: Number.isFinite(limitAmount) ? limitAmount : null,
      limitQty: Number.isFinite(limitQty) && limitQty > 0 ? limitQty : null,
      allowExceedQuota: true,
      remark: `由销售订单 ${order.orderNo || ''} 生成`.trim(),
      lineItems,
      priceItems: [],
      paymentNodes: createDefaultPaymentNodes(
        CONTRACT_TYPE.STANDARD,
        CONTRACT_CASH_DIRECTION.INCOME,
      ),
      attachments: [],
      status: CONTRACT_STATUS.DRAFT,
      sourceType: CONTRACT_SOURCE.FROM_ORDER,
      sourceSalesOrderId: order.id,
      sourceSalesOrderNo: order.orderNo || '',
      creator: 'admin',
    },
  }
}

/**
 * 下单前额度预警（不拦单）
 * @returns {{ warn: boolean, message: string }}
 */
export function checkContractQuotaWarning(contract, nextOrderAmount = 0, nextOrderQty = 0) {
  if (!contract) return { warn: false, message: '' }
  const quota = getContractQuotaSummary(contract)
  const messages = []
  if (quota.limitAmount != null) {
    const after = Math.round((quota.executedAmount + Number(nextOrderAmount || 0)) * 100) / 100
    if (after > quota.limitAmount) {
      messages.push(
        `订单后累计金额 ${after} 将超过合同额度 ${quota.limitAmount}${
          quota.allowExceedQuota
            ? '（合同允许超额度，仅预警）'
            : '（合同不允许超额度，仅预警不拦截）'
        }`,
      )
    }
  }
  if (quota.limitQty != null) {
    const after = Math.round((quota.executedQty + Number(nextOrderQty || 0)) * 1000) / 1000
    if (after > quota.limitQty) {
      messages.push(
        `订单后累计数量 ${after} 将超过合同数量上限 ${quota.limitQty}${
          quota.allowExceedQuota
            ? '（合同允许超额度，仅预警）'
            : '（合同不允许超额度，仅预警不拦截）'
        }`,
      )
    }
  }
  return { warn: messages.length > 0, message: messages.join('；') }
}

export function addSalesContract(payload) {
  const row = normalizeContractRecord({
    ...payload,
    id: payload.id || `sc-${Date.now()}`,
    status: payload.status || CONTRACT_STATUS.DRAFT,
    sourceType:
      payload.sourceType ||
      (payload.sourceSalesOrderId ? CONTRACT_SOURCE.FROM_ORDER : CONTRACT_SOURCE.MANUAL),
    creator: payload.creator || 'admin',
    createdAt: dayjs().format('YYYY-MM-DD HH:mm'),
    updatedAt: dayjs().format('YYYY-MM-DD HH:mm'),
  })
  if (!row.contractNo?.trim()) return { ok: false, message: '请输入合同编号' }
  if (!row.customerName?.trim()) return { ok: false, message: '请选择客户' }
  if (salesContractState.contracts.some((c) => c.contractNo === row.contractNo)) {
    return { ok: false, message: '合同编号已存在' }
  }
  salesContractState.contracts.unshift(row)
  return { ok: true, data: row }
}

export function updateSalesContract(id, patch) {
  const idx = salesContractState.contracts.findIndex((c) => c.id === id)
  if (idx < 0) return { ok: false, message: '合同不存在' }
  const nextNo = patch.contractNo != null ? String(patch.contractNo).trim() : null
  if (nextNo) {
    const dup = salesContractState.contracts.some((c) => c.id !== id && c.contractNo === nextNo)
    if (dup) return { ok: false, message: '合同编号已存在' }
  }
  salesContractState.contracts[idx] = normalizeContractRecord({
    ...salesContractState.contracts[idx],
    ...patch,
    id,
    updatedAt: dayjs().format('YYYY-MM-DD HH:mm'),
  })
  return { ok: true, data: salesContractState.contracts[idx] }
}

export function deleteSalesContract(id) {
  const idx = salesContractState.contracts.findIndex((c) => c.id === id)
  if (idx < 0) return { ok: false, message: '合同不存在' }
  const row = salesContractState.contracts[idx]
  if (row.status === CONTRACT_STATUS.ACTIVE) {
    return { ok: false, message: '生效中的合同不可删除，请先终止' }
  }
  salesContractState.contracts.splice(idx, 1)
  return { ok: true }
}

export function submitSalesContract(id) {
  const row = getSalesContractById(id)
  if (!row) return { ok: false, message: '合同不存在' }
  if (!canSubmitSalesContract(row) && !canResubmitSalesContract(row)) {
    return { ok: false, message: '仅草稿或已驳回可提交审核' }
  }
  const res = updateSalesContract(id, {
    status: CONTRACT_STATUS.PENDING,
    submittedAt: dayjs().format('YYYY-MM-DD HH:mm'),
    rejectReason: '',
  })
  if (!res.ok) return res
  if (isAutoApproveEnabled(AUTO_APPROVE_TYPES.SALES_CONTRACT)) {
    const approved = approveSalesContract(id, '系统自动审批通过', SYSTEM_AUTO_APPROVER)
    if (!approved.ok) return approved
    return {
      ok: true,
      autoApproved: true,
      message: `合同「${row.contractNo}」已自动审批通过并生效`,
      data: approved.data,
    }
  }
  return { ok: true, message: `合同「${row.contractNo}」已提交审核`, data: res.data }
}

export function withdrawSalesContract(id) {
  const row = getSalesContractById(id)
  if (!row) return { ok: false, message: '合同不存在' }
  if (!canWithdrawSalesContract(row)) {
    return { ok: false, message: '仅待审合同可撤回' }
  }
  const res = updateSalesContract(id, {
    status: CONTRACT_STATUS.DRAFT,
    submittedAt: '',
  })
  if (!res.ok) return res
  return { ok: true, message: `合同「${row.contractNo}」已撤回`, data: res.data }
}

export function approveSalesContract(id, opinion = '', operator = 'admin') {
  const row = getSalesContractById(id)
  if (!row) return { ok: false, message: '合同不存在' }
  if (!canApproveSalesContract(row)) {
    return { ok: false, message: '仅待审合同可审核通过' }
  }
  const res = updateSalesContract(id, {
    status: CONTRACT_STATUS.ACTIVE,
    approvedAt: dayjs().format('YYYY-MM-DD HH:mm'),
    approvedBy: operator,
    rejectReason: '',
  })
  if (!res.ok) return res
  pushApprovalRecord(res.data, { result: '已通过', opinion, operator })
  persist()
  // 生效后按付款条款落库生成回款计划（动态导入避免循环依赖）
  import('@/store/salesPaymentStore')
    .then((m) => m.ensurePaymentPlansForContract(res.data))
    .catch(() => {})
  return { ok: true, message: `合同「${row.contractNo}」已生效`, data: res.data }
}

export function rejectSalesContract(id, opinion = '', operator = 'admin') {
  const row = getSalesContractById(id)
  if (!row) return { ok: false, message: '合同不存在' }
  if (!canApproveSalesContract(row)) {
    return { ok: false, message: '仅待审合同可驳回' }
  }
  if (!String(opinion || '').trim()) {
    return { ok: false, message: '驳回时请填写审批意见' }
  }
  const res = updateSalesContract(id, {
    status: CONTRACT_STATUS.REJECTED,
    rejectReason: String(opinion).trim(),
    approvedAt: '',
    approvedBy: '',
  })
  if (!res.ok) return res
  pushApprovalRecord(res.data, { result: '已驳回', opinion: String(opinion).trim(), operator })
  persist()
  return { ok: true, message: `合同「${row.contractNo}」已驳回`, data: res.data }
}

export function terminateSalesContract(id, reason = '') {
  const row = getSalesContractById(id)
  if (!row) return { ok: false, message: '合同不存在' }
  if (row.status !== CONTRACT_STATUS.ACTIVE) {
    return { ok: false, message: '仅生效中的合同可终止' }
  }
  return updateSalesContract(id, {
    status: CONTRACT_STATUS.TERMINATED,
    terminatedAt: dayjs().format('YYYY-MM-DD HH:mm'),
    terminateReason: reason || '',
  })
}

export function canMarkContractSigned(contract) {
  if (!contract) return false
  if (
    contract.status === CONTRACT_STATUS.TERMINATED ||
    contract.status === CONTRACT_STATUS.COMPLETED
  ) {
    return false
  }
  return resolveContractSignStatus(contract) !== CONTRACT_SIGN_STATUS.SIGNED
}

export function canUnmarkContractSigned(contract) {
  if (!contract || contract.signStatus !== CONTRACT_SIGN_STATUS.SIGNED) return false
  return (
    contract.status !== CONTRACT_STATUS.TERMINATED && contract.status !== CONTRACT_STATUS.COMPLETED
  )
}

/** 确认合同已签署（与审批状态独立）；需填写签署时间，签署人选填 */
export function markContractSigned(id, { signedAt, signedBy } = {}) {
  const row = getSalesContractById(id)
  if (!row) return { ok: false, message: '合同不存在' }
  if (row.status === CONTRACT_STATUS.TERMINATED || row.status === CONTRACT_STATUS.COMPLETED) {
    return { ok: false, message: '已完成/已终止合同不可标记签署' }
  }
  if (row.signStatus === CONTRACT_SIGN_STATUS.SIGNED) {
    return { ok: false, message: '合同已是已签署状态' }
  }
  if (!signedAt) return { ok: false, message: '请填写签署时间' }
  const at = dayjs(signedAt)
  if (!at.isValid()) return { ok: false, message: '签署时间格式不正确' }
  return updateSalesContract(id, {
    signStatus: CONTRACT_SIGN_STATUS.SIGNED,
    signedAt: at.format('YYYY-MM-DD HH:mm'),
    signedBy: String(signedBy || '').trim(),
  })
}

export function completeSalesContract(id) {
  const row = getSalesContractById(id)
  if (!row) return { ok: false, message: '合同不存在' }
  if (row.status !== CONTRACT_STATUS.ACTIVE) {
    return { ok: false, message: '仅生效中的合同可标记完成' }
  }
  return updateSalesContract(id, {
    status: CONTRACT_STATUS.COMPLETED,
    completedAt: dayjs().format('YYYY-MM-DD HH:mm'),
  })
}

export function unmarkContractSigned(id) {
  const row = getSalesContractById(id)
  if (!row) return { ok: false, message: '合同不存在' }
  if (row.signStatus !== CONTRACT_SIGN_STATUS.SIGNED) {
    return { ok: false, message: '合同尚未签署' }
  }
  return updateSalesContract(id, {
    signStatus: CONTRACT_SIGN_STATUS.UNSIGNED,
    signedAt: '',
    signedBy: '',
  })
}
