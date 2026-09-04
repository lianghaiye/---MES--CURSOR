<template>
  <div class="enterprise-reg">
    <div class="page-card">
      <div v-if="!submitted" class="banner">
        <div class="banner-content">
          <div class="banner-title-row">
            <span class="tenant-badge">【{{ form.enterpriseShortName || '租户名称' }}】</span>
            <span class="review-badge" :class="{ 'status-pending': submitted }"
              >【{{ submitted ? '待审核' : form.reviewStatus || '审核状态' }}】</span
            >
          </div>
          <p v-if="!submitted" class="banner-desc">
            企业注册是工业互联标识体系中的基础环节，请准确填写以下信息完成入驻申请。审核通过后您将获得唯一的工业互联标识节点编码。
          </p>
          <p v-else class="banner-desc">
            您的入驻申请已成功提交，请耐心等待平台审核。审核通过后将为您开通工业互联标识服务。
          </p>
        </div>
      </div>

      <!-- 编辑态表单 -->
      <div v-if="!submitted" class="form-body">
        <section class="form-section">
          <h3 class="section-title">企业基本信息</h3>
          <div class="form-grid">
            <div class="form-item required">
              <label>企业全称</label>
              <input
                v-model="form.enterpriseFullName"
                placeholder="默认认入用户名称"
                :disabled="submitted"
              />
            </div>
            <div class="form-item required">
              <label>统一信用代码</label>
              <input v-model="form.creditCode" placeholder="请输入" :disabled="submitted" />
            </div>
            <div class="form-item required">
              <label>企业简称</label>
              <input
                v-model="form.enterpriseShortName"
                placeholder="请输入"
                :disabled="submitted"
              />
            </div>
            <div class="form-item required">
              <label>所属行业</label>
              <select v-model="form.industry" :disabled="submitted">
                <option value="">请选择</option>
                <option value="制造业">制造业</option>
                <option value="能源">能源</option>
                <option value="交通">交通</option>
                <option value="医疗">医疗</option>
                <option value="农业">农业</option>
                <option value="信息技术">信息技术</option>
              </select>
            </div>
            <div class="form-item required full-width">
              <label>注册地址</label>
              <div class="address-row">
                <select
                  v-model="form.province"
                  class="addr-select"
                  :disabled="submitted"
                  @change="onProvinceChange"
                >
                  <option value="">请选择省</option>
                  <option value="北京市">北京市</option>
                  <option value="广东省">广东省</option>
                  <option value="浙江省">浙江省</option>
                </select>
                <select v-model="form.city" class="addr-select" :disabled="submitted">
                  <option value="">请选择市</option>
                  <option value="北京市">北京市</option>
                  <option value="广州市">广州市</option>
                  <option value="深圳市">深圳市</option>
                  <option value="杭州市">杭州市</option>
                </select>
                <select v-model="form.district" class="addr-select" :disabled="submitted">
                  <option value="">请选择区</option>
                  <option value="朝阳区">朝阳区</option>
                  <option value="海淀区">海淀区</option>
                  <option value="天河区">天河区</option>
                  <option value="南山区">南山区</option>
                  <option value="西湖区">西湖区</option>
                </select>
              </div>
            </div>
            <div class="form-item full-width">
              <label>详细地址</label>
              <input v-model="form.detailAddress" placeholder="请输入" :disabled="submitted" />
            </div>
          </div>
        </section>

        <section class="form-section">
          <h3 class="section-title">法人信息</h3>
          <div class="form-grid">
            <div class="form-item required">
              <label>法人姓名</label>
              <input v-model="form.legalPersonName" placeholder="请输入" :disabled="submitted" />
            </div>
            <div class="form-item required">
              <label>法人身份证号</label>
              <input v-model="form.legalPersonId" placeholder="请输入" :disabled="submitted" />
            </div>
            <div class="form-item required">
              <label>法人手机号</label>
              <input v-model="form.legalPersonPhone" placeholder="请输入" :disabled="submitted" />
            </div>
          </div>
        </section>

        <section class="form-section">
          <h3 class="section-title">联系人信息</h3>
          <div class="form-grid">
            <div class="form-item required">
              <label>联系人姓名</label>
              <input v-model="form.contactName" placeholder="请输入" :disabled="submitted" />
            </div>
            <div class="form-item required">
              <label>联系方式</label>
              <input v-model="form.contactPhone" placeholder="请输入" :disabled="submitted" />
            </div>
            <div class="form-item required">
              <label>邮箱</label>
              <input v-model="form.contactEmail" placeholder="请输入" :disabled="submitted" />
            </div>
          </div>
        </section>

        <section class="form-section">
          <h3 class="section-title">资质上传</h3>
          <div class="upload-grid">
            <div class="upload-item required">
              <label>营业执照</label>
              <div
                class="upload-area"
                :class="{ disabled: submitted }"
                @click="submitted ? null : triggerUpload('businessLicense')"
              >
                <div v-if="form.businessLicense" class="upload-preview">
                  <span class="file-name">{{ form.businessLicense }}</span>
                  <span
                    v-if="!submitted"
                    class="file-remove"
                    @click.stop="removeFile('businessLicense')"
                    >✕</span
                  >
                </div>
                <div v-else class="upload-placeholder">
                  <span class="upload-icon">+</span>
                  <span class="upload-text">点击上传</span>
                </div>
              </div>
            </div>
            <div class="upload-item required">
              <label>法人身份证正照</label>
              <div
                class="upload-area"
                :class="{ disabled: submitted }"
                @click="submitted ? null : triggerUpload('legalIdFront')"
              >
                <div v-if="form.legalIdFront" class="upload-preview">
                  <span class="file-name">{{ form.legalIdFront }}</span>
                  <span
                    v-if="!submitted"
                    class="file-remove"
                    @click.stop="removeFile('legalIdFront')"
                    >✕</span
                  >
                </div>
                <div v-else class="upload-placeholder">
                  <span class="upload-icon">+</span>
                  <span class="upload-text">点击上传</span>
                </div>
              </div>
            </div>
            <div class="upload-item required">
              <label>法人身份证反照</label>
              <div
                class="upload-area"
                :class="{ disabled: submitted }"
                @click="submitted ? null : triggerUpload('legalIdBack')"
              >
                <div v-if="form.legalIdBack" class="upload-preview">
                  <span class="file-name">{{ form.legalIdBack }}</span>
                  <span
                    v-if="!submitted"
                    class="file-remove"
                    @click.stop="removeFile('legalIdBack')"
                    >✕</span
                  >
                </div>
                <div v-else class="upload-placeholder">
                  <span class="upload-icon">+</span>
                  <span class="upload-text">点击上传</span>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section class="form-section">
          <h3 class="section-title">企业简介</h3>
          <textarea
            v-model="form.introduction"
            placeholder="可选，用于二级节点备案信息"
            class="intro-textarea"
            rows="4"
            :disabled="submitted"
          ></textarea>
        </section>

        <section class="notice-box">
          <div class="notice-header">📋 企业入驻须知</div>
          <div class="notice-content">
            <p>1. 申请企业必须为依法注册的独立法人实体，具备合法经营资质。</p>
            <p>2. 提交的资质文件需真实有效，如发现虚假信息将不予审核通过。</p>
            <p>3. 审核周期通常为3个工作日，期间请保持联系方式通畅。</p>
            <p>4. 审核通过后将获得唯一企业节点编码，即标识前缀授权。</p>
            <p>5. 入驻成功即表示同意遵守《工业互联标识服务协议》的全部条款。</p>
          </div>
        </section>

        <div v-if="!submitted" class="agreement-row">
          <label class="agreement-check">
            <input type="checkbox" v-model="form.agreed" />
            <span class="check-text">我已阅读并同意《工业互联标识服务协议》</span>
          </label>
        </div>

        <div class="form-actions">
          <template v-if="!submitted">
            <button class="btn-secondary" @click="saveDraft">保存草稿</button>
            <button class="btn-primary" :disabled="!form.agreed" @click="submitApplication">
              提交审核申请
            </button>
          </template>
          <div v-else class="submitted-info">
            <div class="submitted-icon">✅</div>
            <p class="submitted-text">您的企业信息已提交审核，暂不支持编辑</p>
            <p class="submitted-hint">如需修改请联系平台管理员</p>
          </div>
        </div>
      </div>

      <!-- 提交后只读展示 -->
      <div v-else class="submitted-view">
        <div class="review-header">
          <div class="review-title-row">
            <h3>{{ form.enterpriseFullName }}</h3>
            <span class="review-status-tag">待审核</span>
          </div>
          <p class="review-tip">
            您的入驻申请已提交，请耐心等待平台审核。审核通过后将为您开通工业互联标识服务。
          </p>
        </div>

        <div class="review-cols">
          <div class="review-col review-col-left">
            <section class="info-section">
              <h4 class="info-section-title">企业基本信息</h4>
              <div class="info-table">
                <div class="info-row">
                  <span class="info-label">企业全称</span>
                  <span class="info-value">{{ form.enterpriseFullName || '-' }}</span>
                </div>
                <div class="info-row">
                  <span class="info-label">统一信用代码</span>
                  <span class="info-value">{{ form.creditCode || '-' }}</span>
                </div>
                <div class="info-row">
                  <span class="info-label">企业简称</span>
                  <span class="info-value">{{ form.enterpriseShortName || '-' }}</span>
                </div>
                <div class="info-row">
                  <span class="info-label">所属行业</span>
                  <span class="info-value">{{ form.industry || '-' }}</span>
                </div>
                <div class="info-row">
                  <span class="info-label">注册地址</span>
                  <span class="info-value">{{ addressDisplay || '-' }}</span>
                </div>
                <div class="info-row">
                  <span class="info-label">详细地址</span>
                  <span class="info-value">{{ form.detailAddress || '-' }}</span>
                </div>
              </div>
            </section>

            <section class="info-section">
              <h4 class="info-section-title">法人信息</h4>
              <div class="info-table">
                <div class="info-row">
                  <span class="info-label">法人姓名</span>
                  <span class="info-value">{{ form.legalPersonName || '-' }}</span>
                </div>
                <div class="info-row">
                  <span class="info-label">法人身份证号</span>
                  <span class="info-value">{{ form.legalPersonId || '-' }}</span>
                </div>
                <div class="info-row">
                  <span class="info-label">法人手机号</span>
                  <span class="info-value">{{ form.legalPersonPhone || '-' }}</span>
                </div>
              </div>
            </section>

            <section class="info-section">
              <h4 class="info-section-title">资质认证</h4>
              <div class="cert-grid">
                <div class="cert-item">
                  <div class="cert-thumb">
                    <span v-if="form.businessLicense" class="cert-icon">📄</span>
                    <span v-else class="cert-empty">-</span>
                  </div>
                  <span class="cert-name">营业执照</span>
                </div>
                <div class="cert-item">
                  <div class="cert-thumb">
                    <span v-if="form.legalIdFront" class="cert-icon">🪪</span>
                    <span v-else class="cert-empty">-</span>
                  </div>
                  <span class="cert-name">法人身份证正照</span>
                </div>
                <div class="cert-item">
                  <div class="cert-thumb">
                    <span v-if="form.legalIdBack" class="cert-icon">🪪</span>
                    <span v-else class="cert-empty">-</span>
                  </div>
                  <span class="cert-name">法人身份证反照</span>
                </div>
              </div>
            </section>

            <section class="info-section">
              <h4 class="info-section-title">企业简介</h4>
              <p class="intro-text">{{ form.introduction || '暂无简介' }}</p>
            </section>
          </div>

          <div class="review-col review-col-right">
            <section class="info-section">
              <h4 class="info-section-title">联系信息</h4>
              <div class="info-table">
                <div class="info-row">
                  <span class="info-label">联系人</span>
                  <span class="info-value">{{ form.contactName || '-' }}</span>
                </div>
                <div class="info-row">
                  <span class="info-label">联系方式</span>
                  <span class="info-value">{{ form.contactPhone || '-' }}</span>
                </div>
                <div class="info-row">
                  <span class="info-label">邮箱</span>
                  <span class="info-value">{{ form.contactEmail || '-' }}</span>
                </div>
              </div>
            </section>
          </div>
        </div>
      </div>
    </div>

    <!-- 提交成功弹窗 -->
    <div v-if="showModal" class="modal-overlay" @click.self="closeModal">
      <div class="modal-card">
        <div class="modal-icon">✅</div>
        <h3 class="modal-title">提交注册申请成功！</h3>
        <p class="modal-body">请耐心等待平台审核，审核通过后我们将为您开通工业互联标识服务。</p>
        <button class="modal-btn" @click="closeModal">我知道了</button>
      </div>
    </div>
  </div>
</template>

<script>
import { updateEnterpriseForm } from '@/store/industrialIdStore'

export default {
  computed: {
    addressDisplay() {
      const parts = [this.form.province, this.form.city, this.form.district].filter(Boolean)
      return parts.join(' ')
    },
  },
  data() {
    return {
      submitted: false,
      showModal: false,
      form: {
        enterpriseFullName: '泵小智科技发展有限公司',
        creditCode: '',
        enterpriseShortName: '泵小智科技发展有限公司',
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
    }
  },
  methods: {
    updateEnterpriseForm,
    onProvinceChange() {
      this.form.city = ''
      this.form.district = ''
    },
    triggerUpload(field) {
      const fakeName = `${field}_${Date.now()}.pdf`
      this.form[field] = fakeName
    },
    removeFile(field) {
      this.form[field] = ''
    },
    saveDraft() {
      this.updateEnterpriseForm({ ...this.form, reviewStatus: '草稿' })
      alert('草稿已保存（示例）')
    },
    submitApplication() {
      this.form.reviewStatus = '待审核'
      this.showModal = true
    },
    closeModal() {
      this.showModal = false
      this.submitted = true
    },
  },
}
</script>

<style scoped>
.page-card {
  background: #fff;
  border-radius: 8px;
}
.banner {
  background: linear-gradient(135deg, #1890ff 0%, #096dd9 100%);
  margin: 0 24px;
  border-radius: 8px;
  margin-top: 20px;
  padding: 20px 24px;
}
.banner-content {
  color: #fff;
}
.banner-title-row {
  display: flex;
  gap: 12px;
  font-size: 16px;
  font-weight: 600;
  margin-bottom: 12px;
}
.banner-desc {
  font-size: 13px;
  opacity: 0.9;
  line-height: 1.6;
  margin: 0;
}

.form-body {
  padding: 24px;
}

.form-section {
  margin-bottom: 32px;
}

.section-title {
  font-size: 16px;
  font-weight: 600;
  color: #1f2937;
  margin-bottom: 16px;
  padding-left: 12px;
  border-left: 3px solid #1890ff;
}

.form-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 16px;
}
.full-width {
  grid-column: span 2;
}

.form-item label {
  display: block;
  font-size: 14px;
  color: #374151;
  margin-bottom: 6px;
}
.form-item.required label::before {
  content: '*';
  color: #dc2626;
  margin-right: 4px;
}

.form-item input,
.form-item select {
  width: 100%;
  padding: 9px 12px;
  border: 1px solid #d1d5db;
  border-radius: 4px;
  font-size: 14px;
  color: #1f2937;
  background: #fff;
  transition: border-color 0.2s;
}
.form-item input:focus,
.form-item select:focus {
  outline: none;
  border-color: #1890ff;
  box-shadow: 0 0 0 2px rgba(24, 144, 255, 0.1);
}
.form-item input::placeholder,
.form-item select {
  color: #9ca3af;
}

.address-row {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 12px;
}
.addr-select {
  width: 100%;
  padding: 9px 12px;
  border: 1px solid #d1d5db;
  border-radius: 4px;
  font-size: 14px;
  color: #9ca3af;
  background: #fff;
}

.upload-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 16px;
}
.upload-item label {
  display: block;
  font-size: 14px;
  color: #374151;
  margin-bottom: 6px;
}
.upload-item.required label::before {
  content: '*';
  color: #dc2626;
  margin-right: 4px;
}
.upload-area {
  border: 1px dashed #d1d5db;
  border-radius: 4px;
  padding: 24px;
  text-align: center;
  cursor: pointer;
  transition: border-color 0.2s;
  min-height: 100px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #fafafa;
}
.upload-area:hover {
  border-color: #1890ff;
  background: #f0f7ff;
}
.upload-placeholder {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
}
.upload-icon {
  font-size: 28px;
  color: #1890ff;
  line-height: 1;
}
.upload-text {
  font-size: 13px;
  color: #6b7280;
}
.upload-preview {
  display: flex;
  align-items: center;
  gap: 8px;
}
.file-name {
  font-size: 13px;
  color: #1890ff;
}
.file-remove {
  cursor: pointer;
  color: #dc2626;
  font-size: 14px;
  padding: 2px;
}

.intro-textarea {
  width: 100%;
  padding: 12px;
  border: 1px solid #d1d5db;
  border-radius: 4px;
  font-size: 14px;
  resize: vertical;
  font-family: inherit;
  line-height: 1.6;
}
.intro-textarea:focus {
  outline: none;
  border-color: #1890ff;
  box-shadow: 0 0 0 2px rgba(24, 144, 255, 0.1);
}

.notice-box {
  background: #e6f7ff;
  border: 1px solid #91d5ff;
  border-radius: 6px;
  padding: 16px 20px;
  margin-bottom: 20px;
}
.notice-header {
  font-size: 15px;
  font-weight: 600;
  color: #0050b3;
  margin-bottom: 10px;
}
.notice-content p {
  font-size: 13px;
  color: #003a8c;
  line-height: 1.8;
  margin: 0;
}

.agreement-row {
  margin-bottom: 24px;
}
.agreement-check {
  display: flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
  font-size: 14px;
}
.agreement-check input[type='checkbox'] {
  width: 16px;
  height: 16px;
  cursor: pointer;
  accent-color: #1890ff;
}
.check-text {
  color: #374151;
}

.form-actions {
  display: flex;
  justify-content: center;
  gap: 16px;
  padding-top: 8px;
}
.btn-secondary {
  padding: 10px 32px;
  border: 1px solid #d1d5db;
  background: #fff;
  color: #374151;
  border-radius: 4px;
  font-size: 14px;
  cursor: pointer;
  transition: all 0.2s;
}
.btn-secondary:hover {
  border-color: #1890ff;
  color: #1890ff;
}
.btn-primary {
  padding: 10px 32px;
  border: none;
  background: #1890ff;
  color: #fff;
  border-radius: 4px;
  font-size: 14px;
  cursor: pointer;
  transition: all 0.2s;
}
.btn-primary:hover {
  background: #096dd9;
}
.btn-primary:disabled {
  background: #d1d5db;
  cursor: not-allowed;
}

/* 提交后只读展示 */
.submitted-view {
  padding: 0 24px 24px;
}

.review-header {
  padding: 24px 0 20px;
  border-bottom: 1px solid #e5e7eb;
  margin-bottom: 24px;
}
.review-title-row {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 12px;
}
.review-title-row h3 {
  font-size: 18px;
  font-weight: 600;
  color: #1f2937;
  margin: 0;
}
.review-status-tag {
  display: inline-block;
  padding: 2px 10px;
  font-size: 12px;
  color: #d48806;
  background: #fffbe6;
  border: 1px solid #ffe58f;
  border-radius: 3px;
}
.review-tip {
  font-size: 13px;
  color: #6b7280;
  margin: 0;
  line-height: 1.6;
}

.review-cols {
  display: flex;
  gap: 24px;
}
.review-col-left {
  flex: 1;
  min-width: 0;
}
.review-col-right {
  width: 300px;
  flex-shrink: 0;
}

.info-section {
  background: #fafbfc;
  border: 1px solid #e5e7eb;
  border-radius: 6px;
  padding: 16px 20px;
  margin-bottom: 16px;
}
.info-section-title {
  font-size: 15px;
  font-weight: 600;
  color: #1f2937;
  margin: 0 0 12px;
  padding-left: 10px;
  border-left: 3px solid #1890ff;
}

.info-table {
  display: table;
  width: 100%;
}
.info-row {
  display: table-row;
}
.info-label {
  display: table-cell;
  padding: 6px 16px 6px 0;
  font-size: 13px;
  color: #6b7280;
  white-space: nowrap;
  width: 1%;
  vertical-align: top;
}
.info-value {
  display: table-cell;
  padding: 6px 0;
  font-size: 13px;
  color: #1f2937;
  word-break: break-all;
}

.cert-grid {
  display: flex;
  gap: 16px;
}
.cert-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
}
.cert-thumb {
  width: 72px;
  height: 72px;
  background: #fff;
  border: 1px solid #e5e7eb;
  border-radius: 4px;
  display: flex;
  align-items: center;
  justify-content: center;
}
.cert-icon {
  font-size: 28px;
}
.cert-empty {
  font-size: 20px;
  color: #d1d5db;
}
.cert-name {
  font-size: 12px;
  color: #6b7280;
}

.intro-text {
  font-size: 13px;
  color: #1f2937;
  line-height: 1.8;
  margin: 0;
}

input:disabled,
select:disabled,
textarea:disabled {
  background: #f5f5f5;
  color: #6b7280;
  cursor: not-allowed;
}

.upload-area.disabled {
  cursor: not-allowed;
  background: #f5f5f5;
}

/* 弹窗 */
.modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.45);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  animation: fadeIn 0.2s ease;
}
.modal-card {
  background: #fff;
  border-radius: 12px;
  padding: 40px 48px 32px;
  text-align: center;
  max-width: 420px;
  width: 90%;
  box-shadow: 0 12px 48px rgba(0, 0, 0, 0.15);
  animation: slideUp 0.3s ease;
}
.modal-icon {
  font-size: 48px;
  margin-bottom: 16px;
}
.modal-title {
  font-size: 18px;
  font-weight: 600;
  color: #1f2937;
  margin: 0 0 12px;
}
.modal-body {
  font-size: 14px;
  color: #6b7280;
  line-height: 1.8;
  margin: 0 0 24px;
}
.modal-btn {
  padding: 10px 40px;
  background: #1890ff;
  color: #fff;
  border: none;
  border-radius: 6px;
  font-size: 14px;
  cursor: pointer;
  transition: background 0.2s;
}
.modal-btn:hover {
  background: #096dd9;
}

@keyframes fadeIn {
  from {
    opacity: 0;
  }
  to {
    opacity: 1;
  }
}
@keyframes slideUp {
  from {
    transform: translateY(20px);
    opacity: 0;
  }
  to {
    transform: translateY(0);
    opacity: 1;
  }
}
</style>
