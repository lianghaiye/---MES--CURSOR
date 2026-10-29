<template>
  <div class="company-profile-page">
    <div class="page-card">
      <div class="page-head">
        <div>
          <div class="page-title">企业信息</div>
          <div class="page-desc">
            维护本企业（付款方）法人、开票及对账联系人信息，采购对账单打印「开票信息」取此处。
          </div>
        </div>
        <a-space>
          <a-button size="small" @click="onReset">恢复默认</a-button>
          <a-button type="primary" size="small" @click="onSave">保存</a-button>
        </a-space>
      </div>

      <a-form layout="vertical" class="profile-form">
        <div class="form-section">
          <div class="section-title">基本信息</div>
          <a-row :gutter="[16, 8]">
            <a-col :xs="24" :md="12">
              <a-form-item label="企业全称" required>
                <a-input v-model:value="form.companyName" allow-clear placeholder="企业全称" />
              </a-form-item>
            </a-col>
            <a-col :xs="24" :md="12">
              <a-form-item label="企业简称">
                <a-input v-model:value="form.shortName" allow-clear />
              </a-form-item>
            </a-col>
            <a-col :xs="24" :md="12">
              <a-form-item label="统一社会信用代码">
                <a-input v-model:value="form.unifiedSocialCreditCode" allow-clear />
              </a-form-item>
            </a-col>
            <a-col :xs="24" :md="12">
              <a-form-item label="注册地址">
                <a-input v-model:value="form.registeredAddress" allow-clear />
              </a-form-item>
            </a-col>
            <a-col :span="24">
              <a-form-item label="详细地址">
                <a-input v-model:value="form.detailAddress" allow-clear />
              </a-form-item>
            </a-col>
          </a-row>
        </div>

        <div class="form-section">
          <div class="section-title">法人信息</div>
          <a-row :gutter="[16, 8]">
            <a-col :xs="24" :md="12">
              <a-form-item label="法人姓名">
                <a-input v-model:value="form.legalRepresentative" allow-clear />
              </a-form-item>
            </a-col>
            <a-col :xs="24" :md="12">
              <a-form-item label="法人电话">
                <a-input v-model:value="form.legalPhone" allow-clear />
              </a-form-item>
            </a-col>
          </a-row>
        </div>

        <div class="form-section">
          <div class="section-title">开票信息</div>
          <a-row :gutter="[16, 8]">
            <a-col :xs="24" :md="12">
              <a-form-item label="开票名称">
                <a-input v-model:value="form.invoiceName" allow-clear />
              </a-form-item>
            </a-col>
            <a-col :xs="24" :md="12">
              <a-form-item label="纳税人识别号">
                <a-input v-model:value="form.invoiceTaxNo" allow-clear />
              </a-form-item>
            </a-col>
            <a-col :span="24">
              <a-form-item label="开票地址电话">
                <a-input v-model:value="form.invoiceAddressPhone" allow-clear />
              </a-form-item>
            </a-col>
            <a-col :xs="24" :md="12">
              <a-form-item label="开户银行">
                <a-input v-model:value="form.openingBank" allow-clear />
              </a-form-item>
            </a-col>
            <a-col :xs="24" :md="12">
              <a-form-item label="银行账号">
                <a-input v-model:value="form.bankAccount" allow-clear />
              </a-form-item>
            </a-col>
            <a-col :xs="24" :md="12">
              <a-form-item label="默认发票类型">
                <a-input v-model:value="form.defaultInvoiceType" allow-clear />
              </a-form-item>
            </a-col>
          </a-row>
        </div>

        <div class="form-section">
          <div class="section-title">对账联系人</div>
          <a-row :gutter="[16, 8]">
            <a-col :xs="24" :md="8">
              <a-form-item label="姓名">
                <a-input v-model:value="form.reconcileContactName" allow-clear />
              </a-form-item>
            </a-col>
            <a-col :xs="24" :md="8">
              <a-form-item label="电话">
                <a-input v-model:value="form.reconcileContactPhone" allow-clear />
              </a-form-item>
            </a-col>
            <a-col :xs="24" :md="8">
              <a-form-item label="职务">
                <a-input v-model:value="form.reconcileContactTitle" allow-clear />
              </a-form-item>
            </a-col>
            <a-col :xs="24" :md="12">
              <a-form-item label="邮箱">
                <a-input v-model:value="form.reconcileContactEmail" allow-clear />
              </a-form-item>
            </a-col>
            <a-col :span="24">
              <a-form-item label="备注">
                <a-textarea v-model:value="form.remark" :rows="2" allow-clear />
              </a-form-item>
            </a-col>
          </a-row>
        </div>
      </a-form>

      <div v-if="form.updatedAt" class="updated-tip">最近保存：{{ form.updatedAt }}</div>
    </div>
  </div>
</template>

<script>
export default { name: 'CompanyProfileView' }
</script>

<script setup>
import { reactive, watch } from 'vue'
import { message, Modal } from 'ant-design-vue'
import {
  companyProfileState,
  getCompanyProfile,
  updateCompanyProfile,
  resetCompanyProfile,
} from '@/store/companyProfileStore'

const form = reactive({ ...getCompanyProfile() })

watch(
  () => companyProfileState.profile,
  (val) => Object.assign(form, val),
  { deep: true },
)

function onSave() {
  if (!String(form.companyName || '').trim()) {
    message.warning('请填写企业全称')
    return
  }
  const res = updateCompanyProfile({ ...form })
  message.success(res.message)
}

function onReset() {
  Modal.confirm({
    title: '恢复默认企业信息？',
    content: '将覆盖当前已填写内容。',
    okText: '恢复',
    onOk() {
      const res = resetCompanyProfile()
      Object.assign(form, res.profile)
      message.success(res.message)
    },
  })
}
</script>

<style lang="less" scoped>
.company-profile-page {
  margin: -12px;
  padding: 12px;
  background: var(--page-bg, #f0f2f5);
  min-height: calc(100vh - 112px);
  box-sizing: border-box;
}

.page-card {
  background: #fff;
  border-radius: 8px;
  border: 1px solid #e5e6eb;
  padding: 16px 20px 24px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.04);
}

.page-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 16px;
  padding-bottom: 12px;
  border-bottom: 1px solid #f0f0f0;
}

.page-title {
  font-size: 16px;
  font-weight: 600;
  color: #1c2b3a;
}

.page-desc {
  margin-top: 4px;
  font-size: 12px;
  color: rgba(0, 0, 0, 0.45);
}

.form-section {
  margin-bottom: 8px;
  padding: 12px 14px 4px;
  background: #fafbfc;
  border: 1px solid #eef2f6;
  border-radius: 8px;
}

.section-title {
  font-size: 13px;
  font-weight: 600;
  color: #1c2b3a;
  margin-bottom: 8px;
  padding-left: 8px;
  border-left: 3px solid #1677ff;
}

.updated-tip {
  margin-top: 8px;
  font-size: 12px;
  color: rgba(0, 0, 0, 0.45);
}
</style>
