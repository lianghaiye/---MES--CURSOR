import { reactive, watch } from 'vue'

const STORAGE_KEY = 'i_doms_company_profile'
const DATA_VERSION = 1

function createDefaultCompanyProfile(partial = {}) {
  return {
    /** 企业全称（付款方 / 收票方） */
    companyName: '智衣智造有限公司',
    shortName: '智衣智造',
    unifiedSocialCreditCode: '91310000MA1ZY0001X',
    registeredAddress: '上海市浦东新区张江路 88 号',
    detailAddress: '',
    /** 法人 */
    legalRepresentative: '王明',
    legalPhone: '021-58880001',
    /** 开票信息（供供应商开票给我方） */
    invoiceName: '智衣智造有限公司',
    invoiceTaxNo: '91310000MA1ZY0001X',
    invoiceAddressPhone: '上海市浦东新区张江路 88 号 021-58880001',
    openingBank: '中国工商银行上海张江支行',
    bankAccount: '1001234567890123456',
    defaultInvoiceType: '增值税专用发票',
    /** 对账联系人 */
    reconcileContactName: '李对账',
    reconcileContactPhone: '13800001111',
    reconcileContactEmail: 'duizhang@zhiyi.example.com',
    reconcileContactTitle: '财务对账',
    remark: '',
    updatedAt: '',
    ...partial,
  }
}

function loadFromStorage() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return createDefaultCompanyProfile()
    const parsed = JSON.parse(raw)
    if (!parsed || typeof parsed !== 'object') return createDefaultCompanyProfile()
    return createDefaultCompanyProfile({
      ...(parsed.profile || parsed),
      // 兼容旧结构
    })
  } catch {
    return createDefaultCompanyProfile()
  }
}

export const companyProfileState = reactive({
  profile: loadFromStorage(),
  version: DATA_VERSION,
})

function persist() {
  localStorage.setItem(
    STORAGE_KEY,
    JSON.stringify({
      version: DATA_VERSION,
      profile: { ...companyProfileState.profile },
    }),
  )
}

watch(
  () => companyProfileState.profile,
  () => persist(),
  { deep: true },
)

export function getCompanyProfile() {
  return companyProfileState.profile
}

export function updateCompanyProfile(patch = {}) {
  Object.assign(companyProfileState.profile, patch, {
    updatedAt: new Date().toISOString().slice(0, 19).replace('T', ' '),
  })
  return { ok: true, profile: companyProfileState.profile, message: '企业信息已保存' }
}

export function resetCompanyProfile() {
  Object.assign(companyProfileState.profile, createDefaultCompanyProfile())
  companyProfileState.profile.updatedAt = ''
  return { ok: true, profile: companyProfileState.profile, message: '已恢复默认企业信息' }
}
