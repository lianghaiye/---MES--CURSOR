<template>
  <FormCreateShell
    :page-mode="pageMode"
    :open="open"
    :title="shellTitle"
    width="96%"
    :mask-closable="false"
    destroy-on-close
    class="contract-change-form-shell"
    @cancel="handleCancel"
    @update:open="(val) => emit('update:open', val)"
  >
    <div class="contract-change-body">
      <div v-if="needPickContract" class="section-block pick-contract-block">
        <div class="section-title-row">
          <span class="section-title">选择合同</span>
        </div>
        <a-form layout="vertical">
          <a-form-item label="生效中合同" required>
            <a-select
              v-model:value="pickedContractId"
              show-search
              allow-clear
              placeholder="请选择合同"
              :options="contractSelectOptions"
              option-filter-prop="label"
              style="width: 100%"
              @change="onPickContract"
            />
          </a-form-item>
          <div class="field-tip">
            仅可对「生效中」且无未完成变更单的合同发起变更。已有变更单的合同不可选，选项中展示变更状态。
          </div>
        </a-form>
      </div>

      <template v-if="form.id">
        <a-alert
          v-if="reviewMode"
          type="warning"
          show-icon
          class="pending-alert"
          message="待审核：通过后将把本次变更应用到合同台账（基本信息、明细/协议折扣、回款节点等）。"
        />

        <fieldset :disabled="reviewMode" class="change-fieldset">
          <div class="section-block reason-block">
            <div class="section-title-row">
              <span class="section-title">变更原因</span>
            </div>
            <a-form layout="vertical" class="change-reason-form">
              <a-form-item v-if="reviewMode" class="reason-display-item">
                <div class="reason-display">{{ form.reason || '—' }}</div>
              </a-form-item>
              <a-form-item v-else label="变更原因" required>
                <a-textarea v-model:value="form.reason" :rows="2" placeholder="说明本次变更原因" />
              </a-form-item>
            </a-form>
          </div>

          <div
            class="section-block modal-basic-card"
            :class="{ 'is-collapsed': basicInfoCollapsed }"
          >
            <div class="section-title-row">
              <span class="section-title">基本信息</span>
              <a-button type="link" size="small" class="collapse-btn" @click="toggleBasicInfo">
                {{ basicInfoCollapsed ? '展开' : '收起' }}
              </a-button>
            </div>
            <a-form v-show="!basicInfoCollapsed" layout="inline" class="header-form">
              <a-row :gutter="[12, 8]" style="width: 100%">
                <a-col :span="6">
                  <div class="readonly-field">
                    <span class="readonly-label">合同编号：</span>
                    <span class="readonly-value">{{ form.contractNo || '—' }}</span>
                  </div>
                </a-col>
                <a-col :span="6">
                  <div class="readonly-field">
                    <span class="readonly-label">合同类型：</span>
                    <span class="readonly-value">{{ form.contractType || '—' }}</span>
                  </div>
                </a-col>
                <a-col :span="6">
                  <a-form-item
                    label="客户名称"
                    :class="{ 'is-changed': !!headerDiffs.customerName }"
                  >
                    <CustomerSelect
                      v-model="form.after.customerName"
                      size="small"
                      placeholder="请选择客户"
                      @change="onCustomerChange"
                    />
                    <FieldChangeHint :diff="headerDiffs.customerName" />
                  </a-form-item>
                </a-col>
                <a-col :span="6">
                  <a-form-item
                    label="合同名称"
                    :class="{ 'is-changed': !!headerDiffs.contractName }"
                  >
                    <a-input v-model:value="form.after.contractName" size="small" allow-clear />
                    <FieldChangeHint :diff="headerDiffs.contractName" />
                  </a-form-item>
                </a-col>
                <a-col :span="6">
                  <a-form-item label="业务员" :class="{ 'is-changed': !!headerDiffs.salesperson }">
                    <a-select
                      v-model:value="form.after.salesperson"
                      size="small"
                      show-search
                      allow-clear
                      :options="salespersonOpts"
                      placeholder="请选择业务员"
                      style="width: 100%"
                    />
                    <FieldChangeHint :diff="headerDiffs.salesperson" />
                  </a-form-item>
                </a-col>
                <a-col :span="6">
                  <a-form-item label="签署人" :class="{ 'is-changed': !!headerDiffs.signer }">
                    <a-input
                      v-model:value="form.after.signer"
                      size="small"
                      allow-clear
                      placeholder="我方签署人"
                    />
                    <FieldChangeHint :diff="headerDiffs.signer" />
                  </a-form-item>
                </a-col>
                <a-col :span="6">
                  <a-form-item label="签署日期" :class="{ 'is-changed': !!headerDiffs.signedAt }">
                    <a-date-picker
                      v-model:value="form.signedAtDate"
                      size="small"
                      style="width: 100%"
                      placeholder="默认有效期开始日"
                      @change="onSignedAtChange"
                    />
                    <FieldChangeHint :diff="headerDiffs.signedAt" />
                  </a-form-item>
                </a-col>
                <a-col :span="6">
                  <a-form-item
                    label="结算周期"
                    :class="{ 'is-changed': !!headerDiffs.settlementCycle }"
                  >
                    <a-select
                      v-model:value="form.after.settlementCycle"
                      size="small"
                      allow-clear
                      :options="settlementCycleOptions"
                      style="width: 100%"
                    />
                    <FieldChangeHint :diff="headerDiffs.settlementCycle" />
                  </a-form-item>
                </a-col>
                <a-col :span="6">
                  <a-form-item
                    label="账期天数"
                    :class="{ 'is-changed': !!headerDiffs.paymentTermDays }"
                  >
                    <a-input-number
                      v-model:value="form.after.paymentTermDays"
                      size="small"
                      :min="0"
                      :precision="0"
                      style="width: 100%"
                      placeholder="默认 30"
                    />
                    <FieldChangeHint :diff="headerDiffs.paymentTermDays" />
                  </a-form-item>
                </a-col>
                <a-col :span="6">
                  <a-form-item label="有效期" :class="{ 'is-changed': !!headerDiffs.validRange }">
                    <a-range-picker
                      v-model:value="form.validRange"
                      size="small"
                      style="width: 100%"
                      @change="onChangeValidRange"
                    />
                    <FieldChangeHint :diff="headerDiffs.validRange" />
                  </a-form-item>
                </a-col>
                <a-col v-if="isFramework" :span="6">
                  <a-form-item
                    label="回款计划基数"
                    :class="{ 'is-changed': !!headerDiffs.paymentPlanBase }"
                  >
                    <a-select
                      v-model:value="form.after.paymentPlanBase"
                      size="small"
                      style="width: 100%"
                      :options="paymentPlanBaseOptions"
                    />
                    <FieldChangeHint :diff="headerDiffs.paymentPlanBase" />
                  </a-form-item>
                </a-col>
                <a-col :span="6">
                  <a-form-item
                    label="额度金额"
                    :class="{ 'is-changed': !!headerDiffs.limitAmount }"
                  >
                    <a-input-number
                      v-model:value="form.after.limitAmount"
                      size="small"
                      :min="0"
                      :precision="2"
                      style="width: 100%"
                      :placeholder="
                        isFramework && form.after.paymentPlanBase === PAYMENT_PLAN_BASE.LIMIT
                          ? '必填'
                          : undefined
                      "
                    />
                    <FieldChangeHint :diff="headerDiffs.limitAmount" />
                  </a-form-item>
                </a-col>
                <a-col :span="6">
                  <a-form-item label="额度数量" :class="{ 'is-changed': !!headerDiffs.limitQty }">
                    <a-input-number
                      v-model:value="form.after.limitQty"
                      size="small"
                      :min="0"
                      :precision="3"
                      style="width: 100%"
                    />
                    <FieldChangeHint :diff="headerDiffs.limitQty" />
                  </a-form-item>
                </a-col>
                <a-col :span="6">
                  <a-form-item
                    label="是否含税"
                    :class="{ 'is-changed': !!headerDiffs.taxInclusive }"
                  >
                    <a-radio-group
                      v-model:value="form.after.taxInclusive"
                      size="small"
                      @change="onTaxInclusiveChange"
                    >
                      <a-radio :value="true">含税</a-radio>
                      <a-radio :value="false">不含税</a-radio>
                    </a-radio-group>
                    <FieldChangeHint :diff="headerDiffs.taxInclusive" />
                  </a-form-item>
                </a-col>
                <a-col :span="6">
                  <a-form-item
                    label="超额度"
                    :class="{ 'is-changed': !!headerDiffs.allowExceedQuota }"
                  >
                    <a-checkbox v-model:checked="form.after.allowExceedQuota"
                      >允许超额度</a-checkbox
                    >
                    <FieldChangeHint :diff="headerDiffs.allowExceedQuota" />
                  </a-form-item>
                </a-col>
                <a-col v-if="isFramework" :span="6">
                  <a-form-item
                    label="默认折扣(%)"
                    :class="{ 'is-changed': !!headerDiffs.defaultDiscountRate }"
                  >
                    <a-input-number
                      v-model:value="form.defaultDiscountPercent"
                      size="small"
                      :min="1"
                      :max="100"
                      :precision="2"
                      style="width: 100%"
                    />
                    <FieldChangeHint :diff="headerDiffs.defaultDiscountRate" />
                  </a-form-item>
                </a-col>
                <a-col :span="24">
                  <a-form-item label="备注" :class="{ 'is-changed': !!headerDiffs.remark }">
                    <a-textarea
                      v-model:value="form.after.remark"
                      :rows="2"
                      :maxlength="1000"
                      show-count
                    />
                    <FieldChangeHint :diff="headerDiffs.remark" />
                  </a-form-item>
                </a-col>
              </a-row>
            </a-form>
          </div>

          <div
            class="section-block modal-basic-card"
            :class="{ 'is-collapsed': partyLegalCollapsed }"
          >
            <div class="section-title-row">
              <span class="section-title">客户资质与开票信息</span>
              <a-button type="link" size="small" class="collapse-btn" @click="togglePartyLegal">
                {{ partyLegalCollapsed ? '展开' : '收起' }}
              </a-button>
            </div>
            <a-form
              v-show="!partyLegalCollapsed"
              layout="inline"
              class="header-form"
              :class="{ 'is-section-changed': !!headerDiffs.partyLegal }"
            >
              <a-row :gutter="[12, 8]" style="width: 100%">
                <a-col :span="6">
                  <a-form-item label="法定代表人">
                    <a-input
                      v-model:value="form.after.partyLegal.legalRepresentative"
                      size="small"
                      allow-clear
                    />
                  </a-form-item>
                </a-col>
                <a-col :span="6">
                  <a-form-item label="统一社会信用代码">
                    <a-input
                      v-model:value="form.after.partyLegal.unifiedSocialCreditCode"
                      size="small"
                      allow-clear
                    />
                  </a-form-item>
                </a-col>
                <a-col :span="6">
                  <a-form-item label="开户银行">
                    <a-input
                      v-model:value="form.after.partyLegal.openingBank"
                      size="small"
                      allow-clear
                    />
                  </a-form-item>
                </a-col>
                <a-col :span="6">
                  <a-form-item label="银行账号">
                    <a-input
                      v-model:value="form.after.partyLegal.bankAccount"
                      size="small"
                      allow-clear
                    />
                  </a-form-item>
                </a-col>
                <a-col :span="6">
                  <a-form-item label="开票名称">
                    <a-input
                      v-model:value="form.after.partyLegal.invoiceName"
                      size="small"
                      allow-clear
                    />
                  </a-form-item>
                </a-col>
                <a-col :span="6">
                  <a-form-item label="纳税人识别号">
                    <a-input
                      v-model:value="form.after.partyLegal.invoiceTaxNo"
                      size="small"
                      allow-clear
                    />
                  </a-form-item>
                </a-col>
                <a-col :span="12">
                  <a-form-item label="地址">
                    <a-input
                      v-model:value="form.after.partyLegal.address"
                      size="small"
                      allow-clear
                      placeholder="注册/通讯地址"
                    />
                  </a-form-item>
                </a-col>
                <a-col v-if="headerDiffs.partyLegal" :span="24">
                  <FieldChangeHint :diff="headerDiffs.partyLegal" />
                </a-col>
              </a-row>
            </a-form>
          </div>

          <div v-if="isFramework" class="section-block">
            <div class="section-title-row">
              <span class="section-title">产品协议折扣</span>
              <a-space :size="8">
                <a-button type="primary" size="small" @click="openPriceProductPicker">
                  <PlusOutlined />
                  从主数据添加
                </a-button>
                <a-button size="small" @click="addPriceRow">+ 手工行</a-button>
              </a-space>
            </div>
            <a-table
              :columns="priceColumns"
              :data-source="form.after.priceItems"
              row-key="id"
              size="small"
              bordered
              :pagination="false"
              :scroll="{ x: 1200 }"
            >
              <template #bodyCell="{ column, record, index }">
                <template v-if="column.key === 'index'">
                  {{ index + 1 }}
                </template>
                <template v-else-if="column.key === 'productCode'">
                  <a-input v-model:value="record.productCode" size="small" />
                </template>
                <template v-else-if="column.key === 'productName'">
                  <a-input v-model:value="record.productName" size="small" />
                </template>
                <template v-else-if="column.key === 'specModel'">
                  <a-input v-model:value="record.specModel" size="small" />
                </template>
                <template v-else-if="column.key === 'material'">
                  <a-input v-model:value="record.material" size="small" />
                </template>
                <template v-else-if="column.key === 'unit'">
                  <a-input v-model:value="record.unit" size="small" />
                </template>
                <template v-else-if="column.key === 'taxRate'">
                  <a-input-number
                    v-model:value="record.taxRate"
                    size="small"
                    :min="0"
                    :max="100"
                    :precision="2"
                    style="width: 100%"
                  />
                </template>
                <template v-else-if="column.key === 'agreementDiscountPercent'">
                  <a-input-number
                    v-model:value="record.agreementDiscountPercent"
                    size="small"
                    :min="1"
                    :max="100"
                    :precision="2"
                    style="width: 100%"
                  />
                </template>
                <template v-else-if="column.key === 'action'">
                  <a-button
                    type="link"
                    size="small"
                    danger
                    @click="form.after.priceItems.splice(index, 1)"
                  >
                    删除
                  </a-button>
                </template>
              </template>
            </a-table>
            <div class="service-content-field">
              <div class="service-content-label">服务内容</div>
              <a-textarea
                v-model:value="form.after.serviceContent"
                :rows="3"
                :maxlength="2000"
                show-count
                placeholder="请输入本合同服务内容"
              />
            </div>
          </div>

          <div v-else class="section-block">
            <div class="section-title-row">
              <span class="section-title">合同明细</span>
              <a-space :size="8">
                <a-button type="primary" size="small" @click="openProductPicker">
                  <PlusOutlined />
                  从主数据添加
                </a-button>
                <a-button size="small" @click="addLineRow">+ 手工行</a-button>
              </a-space>
            </div>
            <a-table
              :columns="lineColumns"
              :data-source="form.after.lineItems"
              row-key="id"
              size="small"
              bordered
              :pagination="false"
              :scroll="{ x: 1680 }"
            >
              <template #bodyCell="{ column, record, index }">
                <template v-if="column.key === 'index'">
                  {{ index + 1 }}
                </template>
                <template v-else-if="column.key === 'productCode'">
                  <a-input v-model:value="record.productCode" size="small" />
                </template>
                <template v-else-if="column.key === 'productName'">
                  <a-input v-model:value="record.productName" size="small" />
                </template>
                <template v-else-if="column.key === 'specModel'">
                  <a-input v-model:value="record.specModel" size="small" placeholder="规格型号" />
                </template>
                <template v-else-if="column.key === 'material'">
                  <a-input v-model:value="record.material" size="small" placeholder="材质" />
                </template>
                <template v-else-if="column.key === 'qty'">
                  <a-input-number
                    v-model:value="record.qty"
                    size="small"
                    :min="0"
                    :precision="3"
                    style="width: 100%"
                    @change="() => syncLineAmount(record)"
                  />
                </template>
                <template v-else-if="column.key === 'unit'">
                  <a-input v-model:value="record.unit" size="small" />
                </template>
                <template v-else-if="column.key === 'taxRate'">
                  <a-input-number
                    v-model:value="record.taxRate"
                    size="small"
                    :min="0"
                    :max="100"
                    :precision="2"
                    style="width: 100%"
                    @change="() => syncLineAmount(record)"
                  />
                </template>
                <template v-else-if="column.key === 'unitPrice'">
                  <a-input-number
                    v-if="form.after.taxInclusive"
                    v-model:value="record.unitPriceInTax"
                    size="small"
                    :min="0"
                    :precision="2"
                    style="width: 100%"
                    @change="() => syncLineAmount(record)"
                  />
                  <a-input-number
                    v-else
                    v-model:value="record.unitPriceExTax"
                    size="small"
                    :min="0"
                    :precision="2"
                    style="width: 100%"
                    @change="() => syncLineAmount(record)"
                  />
                </template>
                <template v-else-if="column.key === 'amount'">
                  {{
                    formatMoney(form.after.taxInclusive ? record.amountInTax : record.amountExTax)
                  }}
                </template>
                <template v-else-if="column.key === 'deliveryDate'">
                  <a-date-picker
                    :value="record.deliveryDate ? dayjs(record.deliveryDate) : null"
                    size="small"
                    style="width: 100%"
                    @change="(d) => (record.deliveryDate = d ? d.format('YYYY-MM-DD') : '')"
                  />
                </template>
                <template v-else-if="column.key === 'packagingForm'">
                  <SalesLineLongTextCell
                    :value="record.packagingForm"
                    @edit="openLongTextEdit(record, 'packagingForm')"
                  />
                </template>
                <template v-else-if="column.key === 'supplementDesc'">
                  <SalesLineLongTextCell
                    :value="record.supplementDesc"
                    @edit="openLongTextEdit(record, 'supplementDesc')"
                  />
                </template>
                <template v-else-if="column.key === 'action'">
                  <a-button
                    type="link"
                    size="small"
                    danger
                    @click="form.after.lineItems.splice(index, 1)"
                  >
                    删除
                  </a-button>
                </template>
              </template>
              <template #summary>
                <a-table-summary v-if="form.after.lineItems.length">
                  <a-table-summary-row>
                    <a-table-summary-cell
                      v-for="(col, colIndex) in lineColumns"
                      :key="col.key"
                      :index="colIndex"
                    >
                      <template v-if="col.key === 'index'">
                        <strong>合计</strong>
                      </template>
                      <template v-else-if="col.key === 'qty'">
                        <strong>{{ formatQty(lineSummary.qty) }}</strong>
                      </template>
                      <template v-else-if="col.key === 'amount'">
                        <strong>{{ formatMoney(lineSummary.amount) }}</strong>
                      </template>
                    </a-table-summary-cell>
                  </a-table-summary-row>
                </a-table-summary>
              </template>
            </a-table>
            <div class="service-content-field">
              <div class="service-content-label">服务内容</div>
              <a-textarea
                v-model:value="form.after.serviceContent"
                :rows="3"
                :maxlength="2000"
                show-count
                placeholder="请输入本合同服务内容"
              />
            </div>
          </div>

          <div class="section-block">
            <div class="section-title-row">
              <span class="section-title">回款节点</span>
              <span class="section-extra-tip">
                合同金额
                {{ formatMoney(contractAmountForPayment) }}，金额按比例自动计算；计划回款时间可选填
              </span>
            </div>
            <div class="payment-term-hints">
              <div v-for="(tip, idx) in PAYMENT_TERM_START_HINTS" :key="idx">{{ tip }}</div>
            </div>
            <a-table
              :columns="nodeColumns"
              :data-source="form.after.paymentNodes"
              row-key="id"
              size="small"
              bordered
              :pagination="false"
              :scroll="{ x: 780 }"
            >
              <template #bodyCell="{ column, record, index }">
                <template v-if="column.key === 'name'">
                  <a-input v-model:value="record.name" size="small" />
                </template>
                <template v-else-if="column.key === 'ratioPercent'">
                  <a-input-number
                    :value="record.ratio != null ? Number((record.ratio * 100).toFixed(2)) : null"
                    size="small"
                    :min="0"
                    :max="100"
                    :precision="2"
                    style="width: 100%"
                    @update:value="(v) => onNodeRatioChange(record, v)"
                  />
                </template>
                <template v-else-if="column.key === 'amount'">
                  <a-input-number
                    :value="record.amount"
                    size="small"
                    :min="0"
                    :precision="2"
                    style="width: 100%"
                    placeholder="自动计算"
                    @update:value="(v) => onNodeAmountChange(record, v)"
                  />
                </template>
                <template v-else-if="column.key === 'termStartType'">
                  <a-select
                    v-model:value="record.termStartType"
                    size="small"
                    allow-clear
                    placeholder="请选择起算类型"
                    :options="paymentTermStartOptions"
                    style="width: 100%"
                  />
                </template>
                <template v-else-if="column.key === 'planDate'">
                  <a-date-picker
                    :value="record.planDate ? dayjs(record.planDate) : null"
                    size="small"
                    style="width: 100%"
                    placeholder="可选"
                    @update:value="(v) => (record.planDate = v ? v.format('YYYY-MM-DD') : '')"
                  />
                </template>
                <template v-else-if="column.key === 'action'">
                  <a-button
                    type="link"
                    size="small"
                    danger
                    @click="form.after.paymentNodes.splice(index, 1)"
                  >
                    删除
                  </a-button>
                </template>
              </template>
            </a-table>
            <a-button type="dashed" block class="add-row-btn" size="small" @click="addNodeRow">
              + 添加节点
            </a-button>
          </div>

          <div class="section-block">
            <div class="section-title-row">
              <span class="section-title">上传附件</span>
            </div>
            <a-upload :file-list="fileList" :before-upload="beforeUpload" @remove="onRemoveFile">
              <a-button size="small">上传附件</a-button>
            </a-upload>
            <div class="field-tip">演示环境仅记录文件名，不上传服务器</div>
          </div>

          <div class="section-block">
            <div class="section-title-row">
              <span class="section-title">变更对比</span>
            </div>
            <a-table
              :columns="diffColumns"
              :data-source="diffRows"
              row-key="field"
              size="small"
              bordered
              :pagination="false"
            >
              <template #emptyText>
                <a-empty :image="false" description="暂无字段变更" />
              </template>
            </a-table>
          </div>
        </fieldset>
      </template>
    </div>

    <template #footer>
      <a-button size="small" @click="handleCancel">取消</a-button>
      <template v-if="reviewMode">
        <a-button size="small" danger :disabled="!form.id" @click="handleReject">驳回</a-button>
        <a-button type="primary" size="small" :disabled="!form.id" @click="handleApprove">
          通过
        </a-button>
      </template>
      <template v-else>
        <a-button size="small" :disabled="!form.id" @click="handleSave(false)">保存草稿</a-button>
        <a-button type="primary" size="small" :disabled="!form.id" @click="handleSave(true)">
          保存并提交审核
        </a-button>
      </template>
    </template>
  </FormCreateShell>

  <SelectBomMaterialModal
    v-model:open="productPickerOpen"
    title="添加产品"
    picker-default-item-type="产品"
    @selected="onProductsSelected"
  />

  <SelectBomMaterialModal
    v-model:open="priceProductPickerOpen"
    title="添加协议折扣产品"
    picker-default-item-type="产品"
    @selected="onPriceProductsSelected"
  />

  <a-modal
    v-model:open="longTextEdit.open"
    :title="`编辑${longTextEdit.title}`"
    width="640px"
    :mask-closable="false"
    destroy-on-close
    @ok="confirmLongTextEdit"
    @cancel="longTextEdit.open = false"
  >
    <a-textarea
      v-model:value="longTextEdit.draft"
      :rows="8"
      :placeholder="`请输入${longTextEdit.title}`"
      show-count
      :maxlength="2000"
    />
  </a-modal>
</template>

<script setup>
import { computed, defineComponent, h, reactive, ref, watch } from 'vue'
import dayjs from 'dayjs'
import { message } from 'ant-design-vue'
import { PlusOutlined } from '@ant-design/icons-vue'
import FormCreateShell from '@/components/FormCreateShell.vue'
import { useFormCreateModal } from '@/composables/useFormCreateModal'
import {
  CONTRACT_TYPE,
  CONTRACT_CHANGE_FIELD_LABELS,
  CONTRACT_STATUS,
  PAYMENT_PLAN_BASE,
  PAYMENT_TERM_START_HINTS,
  paymentPlanBaseOptions,
} from '@/constants/salesContract'
import { paymentTermStartOptions, settlementCycleOptions } from '@/constants/customerMaster'
import { salespersonOptions } from '@/mock/salesOrderOptions'
import {
  CONTRACT_DEFAULT_TAX_RATE,
  createEmptyPartyLegal,
  salesContractState,
} from '@/store/salesContractStore'
import { getCustomerByName, resolveCustomerAddressText } from '@/store/customerStore'
import {
  approveContractChange,
  createContractChangeFromContract,
  diffContractSnapshots,
  formatContractChangeDiffRows,
  getPendingContractChange,
  rejectContractChange,
  resolveSalesContractChangeStatus,
  submitContractChange,
  updateContractChange,
} from '@/store/salesContractChangeStore'
import { normalizeDiscountRate } from '@/utils/salesOrderPricing'
import SelectBomMaterialModal from '@/views/product-process/components/SelectBomMaterialModal.vue'
import SalesLineLongTextCell from './SalesLineLongTextCell.vue'
import CustomerSelect from './CustomerSelect.vue'

const FieldChangeHint = defineComponent({
  name: 'FieldChangeHint',
  props: {
    diff: { type: Object, default: null },
  },
  setup(props) {
    return () => {
      if (!props.diff) return null
      return h('div', { class: 'field-change-hint' }, [
        h('span', `原${props.diff.label}：${props.diff.oldValue}`),
        h('span', { class: 'hint-arrow', 'aria-hidden': 'true' }, '→'),
        h('span', `新${props.diff.label}：${props.diff.newValue}`),
      ])
    }
  },
})

const props = defineProps({
  open: { type: Boolean, default: false },
  pageMode: { type: Boolean, default: false },
  listPath: { type: String, default: '/sales/contract-changes' },
  record: { type: Object, default: null },
  /** 新建页预选合同 id（从合同列表/详情发起时带入） */
  initialContractId: { type: String, default: '' },
  /** 审核模式：只读 + 通过/驳回（对齐订单变更审核） */
  reviewMode: { type: Boolean, default: false },
})

const emit = defineEmits(['update:open', 'saved'])

const pickedContractId = ref(undefined)
const basicInfoCollapsed = ref(false)
const partyLegalCollapsed = ref(false)
const productPickerOpen = ref(false)
const priceProductPickerOpen = ref(false)
const salespersonOpts = salespersonOptions.map((v) => ({ label: v, value: v }))
const longTextEdit = reactive({
  open: false,
  title: '',
  fieldKey: '',
  draft: '',
  target: null,
})
const LONG_TEXT_LABELS = {
  packagingForm: '包装方式',
  supplementDesc: '补充说明',
}

const form = reactive({
  id: '',
  changeNo: '',
  contractNo: '',
  contractType: '',
  customerName: '',
  reason: '',
  validRange: null,
  signedAtDate: null,
  defaultDiscountPercent: 100,
  after: {
    customerName: undefined,
    contractName: '',
    salesperson: undefined,
    signer: '',
    signedAt: '',
    taxInclusive: true,
    partyLegal: createEmptyPartyLegal(),
    settlementCycle: undefined,
    paymentTermDays: 30,
    limitAmount: null,
    limitQty: null,
    allowExceedQuota: true,
    paymentPlanBase: PAYMENT_PLAN_BASE.ORDERS,
    remark: '',
    serviceContent: '',
    priceItems: [],
    lineItems: [],
    paymentNodes: [],
    attachments: [],
  },
  before: {},
})

const isFramework = computed(() => form.contractType === CONTRACT_TYPE.FRAMEWORK)
const needPickContract = computed(() => !form.id)

const {
  shellTitle,
  handleCancel: shellCancel,
  closeAfterSave,
} = useFormCreateModal(props, emit, {
  listPath: props.listPath,
  getTitle: () => {
    if (props.reviewMode && form.changeNo) return `审核合同变更 · ${form.changeNo}`
    if (form.changeNo) return `合同变更 · ${form.changeNo}`
    return '发起合同变更'
  },
})

const contractSelectOptions = computed(() => {
  void salesContractState.contracts
  return salesContractState.contracts
    .filter((c) => c.status === CONTRACT_STATUS.ACTIVE)
    .map((c) => {
      const changeStatus = resolveSalesContractChangeStatus(c.id)
      const blocked = Boolean(getPendingContractChange(c.id))
      const statusText = changeStatus === '-' ? '无变更' : changeStatus
      return {
        label: `${c.contractNo} · ${c.contractName || c.contractType} · ${c.customerName || ''} · ${statusText}`,
        value: c.id,
        disabled: blocked,
      }
    })
})

const priceColumns = [
  { title: '序号', key: 'index', width: 56, align: 'center' },
  { title: '产品编码', key: 'productCode', width: 120 },
  { title: '产品名称', key: 'productName', width: 140 },
  { title: '规格', key: 'specModel', width: 120 },
  { title: '材质', key: 'material', width: 90 },
  { title: '单位', key: 'unit', width: 70 },
  { title: '税率(%)', key: 'taxRate', width: 90 },
  { title: '协议折扣(%)', key: 'agreementDiscountPercent', width: 120 },
  { title: '操作', key: 'action', width: 70, fixed: 'right' },
]

const lineColumns = computed(() => [
  { title: '序号', key: 'index', width: 56, align: 'center' },
  { title: '产品编码', key: 'productCode', width: 120 },
  { title: '产品名称', key: 'productName', width: 140 },
  { title: '规格型号', key: 'specModel', width: 120 },
  { title: '材质', key: 'material', width: 90 },
  { title: '数量', key: 'qty', width: 90 },
  { title: '单位', key: 'unit', width: 70 },
  { title: '税率(%)', key: 'taxRate', width: 90 },
  {
    title: form.after.taxInclusive ? '单价(含税)' : '单价(不含税)',
    key: 'unitPrice',
    width: 120,
  },
  {
    title: form.after.taxInclusive ? '金额(含税)' : '金额(不含税)',
    key: 'amount',
    width: 110,
  },
  { title: '交期', key: 'deliveryDate', width: 130 },
  { title: '包装方式', key: 'packagingForm', width: 100 },
  { title: '补充说明', key: 'supplementDesc', width: 100 },
  { title: '操作', key: 'action', width: 70, fixed: 'right' },
])

const nodeColumns = [
  { title: '节点名称', key: 'name', width: 110 },
  { title: '比例(%)', key: 'ratioPercent', width: 90 },
  { title: '金额', key: 'amount', width: 100 },
  { title: '账期起算', key: 'termStartType', width: 120 },
  { title: '计划回款时间', key: 'planDate', width: 130 },
  { title: '操作', key: 'action', width: 70 },
]

const diffColumns = [
  { title: '字段', dataIndex: 'label', width: 140 },
  { title: '变更前', dataIndex: 'beforeText' },
  { title: '变更后', dataIndex: 'afterText' },
]

const fileList = computed(() =>
  (form.after.attachments || []).map((f, i) => ({
    uid: f.id || `att-${i}`,
    name: f.name,
    status: 'done',
  })),
)

function round2(n) {
  return Math.round((Number(n) || 0) * 100) / 100
}

function formatMoney(val) {
  if (val == null || val === '') return '—'
  return Number(val).toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })
}

function formatQty(val) {
  if (val == null || val === '') return '—'
  return Number(val).toLocaleString(undefined, {
    minimumFractionDigits: 0,
    maximumFractionDigits: 3,
  })
}

const lineSummary = computed(() => {
  let qty = 0
  let amount = 0
  form.after.lineItems.forEach((line) => {
    qty += Number(line.qty) || 0
    if (form.after.taxInclusive) {
      amount += Number(line.amountInTax) || 0
    } else {
      amount += Number(line.amountExTax) || 0
    }
  })
  return {
    qty: Math.round(qty * 1000) / 1000,
    amount: round2(amount),
  }
})

const contractAmountForPayment = computed(() => {
  if (lineSummary.value.amount > 0) return lineSummary.value.amount
  if (form.after.limitAmount != null && form.after.limitAmount !== '') {
    return Number(form.after.limitAmount) || 0
  }
  return 0
})

function formatHintValue(field, value) {
  if (value == null || value === '') return '—'
  if (field === 'allowExceedQuota') return value ? '允许' : '不允许'
  if (field === 'taxInclusive') return value ? '含税' : '不含税'
  if (field === 'defaultDiscountRate') {
    const n = Number(value)
    if (!Number.isFinite(n)) return '—'
    return `${Number((n * 100).toFixed(2))}%`
  }
  if (field === 'partyLegal') {
    const p = value || {}
    const parts = [
      p.legalRepresentative,
      p.unifiedSocialCreditCode,
      p.invoiceName,
      p.invoiceTaxNo,
    ].filter(Boolean)
    return parts.length ? parts.join(' / ') : '—'
  }
  return String(value)
}

function makeFieldDiff(field, beforeVal, afterVal) {
  const beforeText = JSON.stringify(beforeVal ?? null)
  const afterText = JSON.stringify(afterVal ?? null)
  if (beforeText === afterText) return null
  return {
    label: CONTRACT_CHANGE_FIELD_LABELS[field] || field,
    oldValue: formatHintValue(field, beforeVal),
    newValue: formatHintValue(field, afterVal),
  }
}

const currentAfterSnapshot = computed(() => buildAfterSnapshot())

const headerDiffs = computed(() => {
  const before = form.before || {}
  const after = currentAfterSnapshot.value
  return {
    customerName: makeFieldDiff('customerName', before.customerName, after.customerName),
    contractName: makeFieldDiff('contractName', before.contractName, after.contractName),
    salesperson: makeFieldDiff('salesperson', before.salesperson, after.salesperson),
    signer: makeFieldDiff('signer', before.signer, after.signer),
    signedAt: makeFieldDiff(
      'signedAt',
      before.signedAt ? String(before.signedAt).slice(0, 10) : '',
      after.signedAt ? String(after.signedAt).slice(0, 10) : '',
    ),
    settlementCycle: makeFieldDiff(
      'settlementCycle',
      before.settlementCycle,
      after.settlementCycle,
    ),
    paymentTermDays: makeFieldDiff(
      'paymentTermDays',
      before.paymentTermDays,
      after.paymentTermDays,
    ),
    validRange: (() => {
      const oldValue = `${before.validFrom || '—'} ~ ${before.validTo || '—'}`
      const newValue = `${after.validFrom || '—'} ~ ${after.validTo || '—'}`
      if (oldValue === newValue) return null
      return { label: '有效期', oldValue, newValue }
    })(),
    limitAmount: makeFieldDiff('limitAmount', before.limitAmount, after.limitAmount),
    limitQty: makeFieldDiff('limitQty', before.limitQty, after.limitQty),
    taxInclusive: makeFieldDiff('taxInclusive', before.taxInclusive, after.taxInclusive),
    paymentPlanBase: makeFieldDiff(
      'paymentPlanBase',
      before.paymentPlanBase,
      after.paymentPlanBase,
    ),
    allowExceedQuota: makeFieldDiff(
      'allowExceedQuota',
      before.allowExceedQuota,
      after.allowExceedQuota,
    ),
    defaultDiscountRate: makeFieldDiff(
      'defaultDiscountRate',
      before.defaultDiscountRate,
      after.defaultDiscountRate,
    ),
    remark: makeFieldDiff('remark', before.remark, after.remark),
    partyLegal: makeFieldDiff('partyLegal', before.partyLegal, after.partyLegal),
  }
})

const diffRows = computed(() =>
  formatContractChangeDiffRows(diffContractSnapshots(form.before, currentAfterSnapshot.value)),
)

function toggleBasicInfo() {
  basicInfoCollapsed.value = !basicInfoCollapsed.value
}

function togglePartyLegal() {
  partyLegalCollapsed.value = !partyLegalCollapsed.value
}

function syncLineAmount(line) {
  const qty = Number(line.qty) || 0
  const taxRate = Number(line.taxRate) || CONTRACT_DEFAULT_TAX_RATE
  const factor = 1 + taxRate / 100
  if (form.after.taxInclusive) {
    const unitIn = Number(line.unitPriceInTax) || 0
    line.unitPriceInTax = unitIn
    line.amountInTax = round2(qty * unitIn)
    line.unitPriceExTax = factor > 0 ? round2(unitIn / factor) : unitIn
    line.amountExTax = round2(qty * (Number(line.unitPriceExTax) || 0))
  } else {
    const unitEx = Number(line.unitPriceExTax) || 0
    line.unitPriceExTax = unitEx
    line.amountExTax = round2(qty * unitEx)
    line.unitPriceInTax = round2(unitEx * factor)
    line.amountInTax = round2(qty * (Number(line.unitPriceInTax) || 0))
  }
}

function onTaxInclusiveChange() {
  form.after.lineItems.forEach((line) => syncLineAmount(line))
  syncAllPaymentNodeAmounts()
}

function calcNodeAmountByRatio(node, total = contractAmountForPayment.value) {
  if (node.ratio == null || node.ratio === '') return null
  return round2(total * Number(node.ratio))
}

function syncPaymentNodeAmount(node, { force = false, total } = {}) {
  if (!force && node.amountManual) return
  const base = total != null ? total : contractAmountForPayment.value
  node.amount = calcNodeAmountByRatio(node, base)
}

function syncAllPaymentNodeAmounts({ force = false } = {}) {
  const total = contractAmountForPayment.value
  form.after.paymentNodes.forEach((node) => syncPaymentNodeAmount(node, { force, total }))
}

function onNodeRatioChange(node, percent) {
  node.ratio = percent != null && percent !== '' ? Number(percent) / 100 : null
  node.amountManual = false
  syncPaymentNodeAmount(node, { force: true })
}

function onNodeAmountChange(node, value) {
  node.amount = value != null && value !== '' ? Number(value) : null
  node.amountManual = true
}

function createEmptyPriceItem(partial = {}) {
  return {
    id: partial.id || `fci-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    productId: partial.productId || '',
    productCode: partial.productCode || '',
    productName: partial.productName || '',
    specModel: partial.specModel || '',
    material: partial.material || '',
    unit: partial.unit || '台',
    taxRate: partial.taxRate != null ? Number(partial.taxRate) : CONTRACT_DEFAULT_TAX_RATE,
    agreementDiscountPercent:
      partial.agreementDiscountPercent != null
        ? Number(partial.agreementDiscountPercent)
        : form.defaultDiscountPercent != null
          ? Number(form.defaultDiscountPercent)
          : 100,
  }
}

function addPriceRow() {
  form.after.priceItems.push(createEmptyPriceItem())
}

function openPriceProductPicker() {
  priceProductPickerOpen.value = true
}

function onPriceProductsSelected(rows) {
  const list = (Array.isArray(rows) ? rows : [rows]).filter((r) => r && r.pickType !== 'spu')
  if (!list.length) {
    message.warning('请选择产品 SKU')
    return
  }
  let added = 0
  list.forEach((payload) => {
    const code = payload.code || ''
    if (!code) return
    if (form.after.priceItems.some((item) => item.productCode === code)) return
    form.after.priceItems.push(
      createEmptyPriceItem({
        productId: payload.id || '',
        productCode: payload.code || '',
        productName: payload.name || '',
        specModel: payload.specModel || '',
        material: payload.material || '',
        unit: payload.inventoryUnit || '台',
        taxRate:
          payload.outputTaxRate != null && payload.outputTaxRate !== ''
            ? Number(payload.outputTaxRate)
            : CONTRACT_DEFAULT_TAX_RATE,
      }),
    )
    added += 1
  })
  priceProductPickerOpen.value = false
  if (added) message.success(`已添加 ${added} 条协议折扣`)
  else message.info('所选产品已在协议折扣中')
}

function createEmptyLine(partial = {}) {
  const line = {
    id: partial.id || `sci-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    productId: partial.productId || '',
    productCode: partial.productCode || '',
    productName: partial.productName || '',
    specModel: partial.specModel || '',
    material: partial.material || '',
    qty: partial.qty != null ? Number(partial.qty) : 1,
    unit: partial.unit || '台',
    taxRate: partial.taxRate != null ? Number(partial.taxRate) : CONTRACT_DEFAULT_TAX_RATE,
    unitPriceExTax: partial.unitPriceExTax ?? null,
    unitPriceInTax: partial.unitPriceInTax ?? null,
    amountExTax: partial.amountExTax ?? null,
    amountInTax: partial.amountInTax ?? null,
    deliveryDate: partial.deliveryDate || '',
    packagingForm: partial.packagingForm || '',
    supplementDesc: partial.supplementDesc || '',
  }
  syncLineAmount(line)
  return line
}

function addLineRow() {
  form.after.lineItems.push(createEmptyLine())
}

function openProductPicker() {
  productPickerOpen.value = true
}

function mapPickerToContractLine(payload) {
  const unitPrice =
    payload.unitPrice != null && payload.unitPrice !== '' ? Number(payload.unitPrice) : null
  return createEmptyLine({
    productId: payload.id || '',
    productCode: payload.code || '',
    productName: payload.name || '',
    specModel: payload.specModel || '',
    material: payload.material || '',
    unit: payload.inventoryUnit || '台',
    unitPriceExTax: Number.isFinite(unitPrice) ? unitPrice : null,
    qty: 1,
  })
}

function onProductsSelected(rows) {
  const list = (Array.isArray(rows) ? rows : [rows]).filter((r) => r && r.pickType !== 'spu')
  if (!list.length) {
    message.warning('请选择产品 SKU（合同明细暂不支持直接加产品族）')
    return
  }
  let added = 0
  list.forEach((payload) => {
    const code = payload.code || ''
    if (!code) return
    if (form.after.lineItems.some((line) => line.productCode === code)) return
    form.after.lineItems.push(mapPickerToContractLine(payload))
    added += 1
  })
  productPickerOpen.value = false
  if (added) message.success(`已添加 ${added} 条明细`)
  else message.info('所选产品已在明细中')
}

function openLongTextEdit(record, fieldKey) {
  longTextEdit.target = record
  longTextEdit.fieldKey = fieldKey
  longTextEdit.title = LONG_TEXT_LABELS[fieldKey] || fieldKey
  longTextEdit.draft = record?.[fieldKey] || ''
  longTextEdit.open = true
}

function confirmLongTextEdit() {
  if (longTextEdit.target && longTextEdit.fieldKey) {
    longTextEdit.target[longTextEdit.fieldKey] = longTextEdit.draft || ''
  }
  longTextEdit.open = false
}

function addNodeRow() {
  form.after.paymentNodes.push({
    id: `cpn-${Date.now()}`,
    name: '',
    ratio: null,
    amount: null,
    termStartType: undefined,
    planDate: '',
    amountManual: false,
  })
}

function onSignedAtChange(v) {
  form.after.signedAt = v ? v.format('YYYY-MM-DD') : ''
}

function onChangeValidRange() {
  const start = form.validRange?.[0]
  if (start && !form.signedAtDate) {
    form.signedAtDate = start
    form.after.signedAt = start.format('YYYY-MM-DD')
  }
}

function beforeUpload(file) {
  form.after.attachments.push({
    id: `att-${Date.now()}`,
    name: file.name,
    size: file.size,
  })
  return false
}

function onRemoveFile(file) {
  form.after.attachments = form.after.attachments.filter((f) => f.name !== file.name)
}

function buildAfterSnapshot() {
  const [from, to] = form.validRange || []
  return {
    customerName: form.after.customerName || '',
    contractName: form.after.contractName || '',
    salesperson: form.after.salesperson || '',
    signer: form.after.signer || '',
    signedAt: form.after.signedAt
      ? String(form.after.signedAt).slice(0, 10)
      : form.signedAtDate
        ? form.signedAtDate.format('YYYY-MM-DD')
        : '',
    taxInclusive: form.after.taxInclusive !== false,
    partyLegal: createEmptyPartyLegal(form.after.partyLegal || {}),
    validFrom: from ? from.format('YYYY-MM-DD') : '',
    validTo: to ? to.format('YYYY-MM-DD') : '',
    settlementCycle: form.after.settlementCycle || '',
    paymentTermDays:
      form.after.paymentTermDays != null && form.after.paymentTermDays !== ''
        ? Number(form.after.paymentTermDays)
        : 30,
    limitAmount:
      form.after.limitAmount != null && form.after.limitAmount !== ''
        ? Number(form.after.limitAmount)
        : null,
    limitQty:
      form.after.limitQty != null && form.after.limitQty !== ''
        ? Number(form.after.limitQty)
        : null,
    allowExceedQuota: form.after.allowExceedQuota !== false,
    paymentPlanBase:
      form.contractType === CONTRACT_TYPE.FRAMEWORK
        ? form.after.paymentPlanBase || PAYMENT_PLAN_BASE.ORDERS
        : PAYMENT_PLAN_BASE.ORDERS,
    defaultDiscountRate: normalizeDiscountRate(form.defaultDiscountPercent / 100, 1),
    remark: form.after.remark || '',
    serviceContent: form.after.serviceContent || '',
    attachments: form.after.attachments || [],
    priceItems: (form.after.priceItems || [])
      .filter((item) => item.productCode?.trim())
      .map((item) => ({
        id: item.id,
        productId: item.productId || '',
        productCode: item.productCode.trim(),
        productName: item.productName?.trim() || '',
        specModel: item.specModel || '',
        material: item.material || '',
        unit: item.unit || '',
        taxRate: item.taxRate != null ? Number(item.taxRate) : CONTRACT_DEFAULT_TAX_RATE,
        agreementDiscountRate:
          item.agreementDiscountPercent != null
            ? normalizeDiscountRate(item.agreementDiscountPercent / 100, 1)
            : undefined,
      })),
    lineItems: (form.after.lineItems || [])
      .filter((item) => item.productCode?.trim() || item.productName?.trim())
      .map((item) => {
        syncLineAmount(item)
        return {
          id: item.id,
          productId: item.productId || '',
          productCode: item.productCode?.trim() || '',
          productName: item.productName?.trim() || '',
          specModel: item.specModel || '',
          material: item.material || '',
          qty: Number(item.qty) || 0,
          unit: item.unit || '',
          taxRate: item.taxRate != null ? Number(item.taxRate) : CONTRACT_DEFAULT_TAX_RATE,
          unitPriceExTax: item.unitPriceExTax,
          unitPriceInTax: item.unitPriceInTax,
          amountExTax: item.amountExTax,
          amountInTax: item.amountInTax,
          deliveryDate: item.deliveryDate || '',
          packagingForm: item.packagingForm || '',
          supplementDesc: item.supplementDesc || '',
        }
      }),
    paymentNodes: (form.after.paymentNodes || [])
      .filter((item) => item.name?.trim())
      .map((item) => ({
        id: item.id,
        name: item.name.trim(),
        ratio: item.ratio,
        amount: item.amount,
        termStartType: item.termStartType || '',
        planDate: item.planDate || '',
        amountManual: !!item.amountManual,
      })),
  }
}

function resetForm() {
  form.id = ''
  form.changeNo = ''
  form.contractNo = ''
  form.contractType = ''
  form.customerName = ''
  form.reason = ''
  form.validRange = null
  form.signedAtDate = null
  form.defaultDiscountPercent = 100
  form.before = {}
  form.after.customerName = undefined
  form.after.contractName = ''
  form.after.salesperson = undefined
  form.after.signer = ''
  form.after.signedAt = ''
  form.after.taxInclusive = true
  form.after.partyLegal = createEmptyPartyLegal()
  form.after.settlementCycle = undefined
  form.after.paymentTermDays = 30
  form.after.limitAmount = null
  form.after.limitQty = null
  form.after.allowExceedQuota = true
  form.after.paymentPlanBase = PAYMENT_PLAN_BASE.ORDERS
  form.after.remark = ''
  form.after.serviceContent = ''
  form.after.priceItems = []
  form.after.lineItems = []
  form.after.paymentNodes = []
  form.after.attachments = []
  pickedContractId.value = undefined
}

function loadFormFromRecord(r) {
  if (!r) {
    resetForm()
    return
  }
  const after = JSON.parse(JSON.stringify(r.afterSnapshot || {}))
  form.id = r.id
  form.changeNo = r.changeNo
  form.contractNo = r.contractNo
  form.contractType = r.contractType
  form.customerName = r.customerName
  form.reason = r.reason || ''
  form.before = JSON.parse(JSON.stringify(r.beforeSnapshot || {}))
  form.validRange =
    after.validFrom || after.validTo
      ? [
          after.validFrom ? dayjs(after.validFrom) : null,
          after.validTo ? dayjs(after.validTo) : null,
        ]
      : null
  form.defaultDiscountPercent = after.defaultDiscountRate
    ? Number((after.defaultDiscountRate * 100).toFixed(2))
    : 100
  form.after.customerName = after.customerName || r.customerName || undefined
  form.after.contractName = after.contractName || ''
  form.after.salesperson = after.salesperson || undefined
  form.after.signer = after.signer || ''
  form.after.signedAt = after.signedAt
    ? String(after.signedAt).slice(0, 10)
    : after.validFrom
      ? String(after.validFrom).slice(0, 10)
      : ''
  form.signedAtDate = form.after.signedAt ? dayjs(form.after.signedAt) : null
  form.after.taxInclusive = after.taxInclusive !== false
  form.after.partyLegal = createEmptyPartyLegal(after.partyLegal || {})
  form.after.settlementCycle = after.settlementCycle || undefined
  form.after.paymentTermDays =
    after.paymentTermDays != null && after.paymentTermDays !== ''
      ? Number(after.paymentTermDays)
      : 30
  form.after.limitAmount = after.limitAmount ?? null
  form.after.limitQty = after.limitQty ?? null
  form.after.allowExceedQuota = after.allowExceedQuota !== false
  form.after.paymentPlanBase =
    after.paymentPlanBase === PAYMENT_PLAN_BASE.LIMIT
      ? PAYMENT_PLAN_BASE.LIMIT
      : PAYMENT_PLAN_BASE.ORDERS
  form.after.remark = after.remark || ''
  form.after.serviceContent = after.serviceContent || ''
  form.after.attachments = after.attachments || []
  form.after.priceItems = (after.priceItems || []).map((item) =>
    createEmptyPriceItem({
      ...item,
      agreementDiscountPercent:
        item.agreementDiscountPercent != null
          ? Number(item.agreementDiscountPercent)
          : item.agreementDiscountRate != null
            ? Number((normalizeDiscountRate(item.agreementDiscountRate) * 100).toFixed(2))
            : (form.defaultDiscountPercent ?? 100),
    }),
  )
  form.after.lineItems = (after.lineItems || []).map((item) => createEmptyLine(item))
  form.after.paymentNodes = (after.paymentNodes || []).map((item) => ({
    ...item,
    termStartType: item.termStartType || undefined,
    planDate: item.planDate || '',
    amountManual: !!item.amountManual,
  }))
  pickedContractId.value = r.contractId
  basicInfoCollapsed.value = false
  partyLegalCollapsed.value = false
}

function onPickContract(contractId) {
  if (!contractId) return
  if (getPendingContractChange(contractId)) {
    message.warning('该合同已有未完成的变更单')
    pickedContractId.value = undefined
    return
  }
  const res = createContractChangeFromContract(contractId)
  if (!res.ok) {
    message.warning(res.message)
    pickedContractId.value = undefined
    return
  }
  loadFormFromRecord(res.data)
  emit('saved', res.data)
}

function applyPartyLegalFromCustomer(customer, { force = false } = {}) {
  if (!customer) {
    if (force)
      form.after.partyLegal = createEmptyPartyLegal({ name: form.after.customerName || '' })
    return
  }
  const p = form.after.partyLegal
  p.name = customer.name || form.after.customerName || ''
  if (force || !p.legalRepresentative) p.legalRepresentative = customer.legalRepresentative || ''
  if (force || !p.unifiedSocialCreditCode)
    p.unifiedSocialCreditCode = customer.unifiedSocialCreditCode || ''
  if (force || !p.openingBank) p.openingBank = customer.openingBank || ''
  if (force || !p.bankAccount) p.bankAccount = customer.bankAccount || ''
  if (force || !p.invoiceName) p.invoiceName = customer.invoiceName || customer.name || ''
  if (force || !p.invoiceTaxNo) {
    p.invoiceTaxNo = customer.invoiceTaxNo || customer.unifiedSocialCreditCode || ''
  }
  if (force || !p.address) p.address = resolveCustomerAddressText(customer)
}

function onCustomerChange(name) {
  form.after.customerName = name || undefined
  form.customerName = name || ''
  if (!name) {
    form.after.partyLegal = createEmptyPartyLegal()
    return
  }
  const customer = getCustomerByName(name)
  if (!customer) return
  if (!form.after.settlementCycle)
    form.after.settlementCycle = customer.settlementCycle || undefined
  if (form.after.paymentTermDays == null || form.after.paymentTermDays === '') {
    form.after.paymentTermDays =
      customer.paymentTermDays != null && customer.paymentTermDays !== ''
        ? Number(customer.paymentTermDays)
        : 30
  }
  if (!form.after.salesperson) {
    form.after.salesperson = customer.salesperson || form.after.salesperson || undefined
  }
  applyPartyLegalFromCustomer(customer, { force: true })
}

watch(
  () => [props.open, props.pageMode, props.record?.id, props.initialContractId],
  () => {
    if (!props.pageMode && !props.open) return
    if (props.record?.id) {
      loadFormFromRecord(props.record)
      return
    }
    // 新建页已选合同并生成草稿后不再重置，避免重复建单
    if (form.id) return
    resetForm()
    if (props.initialContractId) {
      pickedContractId.value = props.initialContractId
      onPickContract(props.initialContractId)
    }
  },
  { immediate: true },
)

watch(contractAmountForPayment, () => {
  syncAllPaymentNodeAmounts()
})

function handleCancel() {
  shellCancel()
}

function handleApprove() {
  if (!form.id) return
  const res = approveContractChange(form.id)
  if (!res.ok) {
    message.warning(res.message)
    return
  }
  message.success(res.message || '变更已通过并生效')
  emit('saved', res.data)
  closeAfterSave()
}

function handleReject() {
  if (!form.id) return
  const res = rejectContractChange(form.id, '审核驳回')
  if (!res.ok) {
    message.warning(res.message)
    return
  }
  message.success('已驳回')
  emit('saved', res.data)
  closeAfterSave()
}

function handleSave(submit) {
  if (props.reviewMode) return
  if (!form.id) {
    message.warning('请先选择合同')
    return
  }
  if (!form.reason?.trim()) {
    message.warning('请填写变更原因')
    return
  }
  if (!form.after.customerName?.trim()) {
    message.warning('请选择客户名称')
    return
  }
  if (
    isFramework.value &&
    form.after.paymentPlanBase === PAYMENT_PLAN_BASE.LIMIT &&
    !(Number(form.after.limitAmount) > 0)
  ) {
    message.warning('回款计划基数为「额度金额」时，请填写额度金额')
    return
  }
  const afterSnapshot = buildAfterSnapshot()
  const diffs = diffContractSnapshots(form.before, afterSnapshot)
  if (!diffs.length) {
    message.warning('未发生任何变更')
    return
  }
  const res = updateContractChange(form.id, {
    reason: form.reason.trim(),
    afterSnapshot,
    customerName: afterSnapshot.customerName,
  })
  if (!res.ok) {
    message.warning(res.message)
    return
  }
  if (submit) {
    const sub = submitContractChange(form.id)
    if (!sub.ok) {
      message.warning(sub.message)
      return
    }
    message.success(sub.message || '变更单已提交审核')
  } else {
    message.success('变更草稿已保存')
  }
  emit('saved', res.data)
  closeAfterSave()
}
</script>

<style lang="less" scoped>
.contract-change-body {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.pending-alert {
  margin-bottom: 0;
}

.change-fieldset {
  display: flex;
  flex-direction: column;
  gap: 8px;
  border: none;
  margin: 0;
  padding: 0;
  min-width: 0;
}

.change-reason-form {
  margin-bottom: 0;

  :deep(.ant-form-item) {
    margin-bottom: 0;
  }
}

.reason-block {
  margin-bottom: 0;
}

.reason-display {
  font-size: 13px;
  line-height: 1.6;
  color: rgba(0, 0, 0, 0.88);
  white-space: pre-wrap;
  word-break: break-word;
}

.reason-display-item {
  margin-bottom: 0;
}

.pick-contract-block {
  margin-bottom: 0;
}

.field-tip {
  margin-top: 4px;
  font-size: 12px;
  color: rgba(0, 0, 0, 0.45);
  line-height: 1.5;
}

.readonly-field {
  display: flex;
  align-items: center;
  min-height: 32px;
  padding: 4px 0;
  font-size: 13px;
}

.readonly-label {
  color: rgba(0, 0, 0, 0.45);
  flex-shrink: 0;
}

.readonly-value {
  color: rgba(0, 0, 0, 0.88);
  word-break: break-all;
}

.section-block {
  margin-bottom: 0;
  padding: 8px 12px 12px;
  border: 1px solid #f0f0f0;
  border-radius: 6px;
  background: #fafafa;
}

.section-title-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 8px;
}

.section-title {
  font-weight: 600;
  font-size: 14px;
}

.payment-term-hints {
  margin: 0 0 10px;
  padding: 8px 12px;
  font-size: 12px;
  line-height: 1.7;
  color: #1677ff;
  background: #e6f4ff;
  border-radius: 4px;
}

.section-extra-tip {
  font-size: 12px;
  color: rgba(0, 0, 0, 0.45);
}

.collapse-btn {
  padding: 0;
}

.add-row-btn {
  margin-top: 8px;
}

.service-content-field {
  margin-top: 12px;

  .service-content-label {
    margin-bottom: 6px;
    font-size: 13px;
    color: rgba(0, 0, 0, 0.88);
  }
}

.field-tip {
  margin-top: 6px;
  font-size: 12px;
  color: rgba(0, 0, 0, 0.45);
}

.header-form {
  :deep(.ant-form-item) {
    width: 100%;
    margin-bottom: 0;
    margin-inline-end: 0;
  }

  :deep(.ant-form-item-row) {
    flex-wrap: nowrap;
    align-items: flex-start;
  }

  :deep(.ant-form-item-label) {
    flex: 0 0 auto;
    padding-bottom: 0;
    padding-top: 4px;

    > label {
      height: 24px;
      line-height: 24px;
      font-size: 13px;
      white-space: nowrap;
    }
  }

  :deep(.ant-form-item-control) {
    flex: 1;
    min-width: 0;
  }

  :deep(.ant-form-item.is-changed .ant-select-selector),
  :deep(.ant-form-item.is-changed .ant-input),
  :deep(.ant-form-item.is-changed .ant-input-number),
  :deep(.ant-form-item.is-changed .ant-picker),
  :deep(.ant-form-item.is-changed textarea) {
    background: #fff7e6;
    border-color: #ffd591;
  }

  &.is-section-changed {
    background: #fffbe6;
    border-radius: 4px;
    padding: 4px;
  }
}

:deep(.field-change-hint) {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  margin-top: 6px;
  font-size: 12px;
  line-height: 1.5;
  color: #d46b08;
}

:deep(.hint-arrow) {
  margin: 0 8px;
  font-size: 14px;
  font-weight: 600;
  color: #fa8c16;
}
</style>
