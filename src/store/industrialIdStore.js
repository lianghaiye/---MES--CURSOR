import { reactive } from 'vue'

export const industrialIdState = reactive({
  enterpriseForm: {
    enterpriseFullName: '',
    creditCode: '',
    enterpriseShortName: '',
    industry: '',
    province: '',
    city: '',
    district: '',
    detailAddress: '',
    legalPersonName: '',
    legalPersonId: '',
    legalPersonPhone: '',
    contactName: '',
    contactPhone: '',
    contactEmail: '',
    businessLicense: '',
    legalIdFront: '',
    legalIdBack: '',
    introduction: '',
    reviewStatus: '待审核',
    agreed: false,
  },
})

export function updateEnterpriseForm(payload) {
  Object.assign(industrialIdState.enterpriseForm, payload)
}
