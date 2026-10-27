<template>
  <FormCreateShell
    :page-mode="pageMode"
    :open="open"
    :title="shellTitle"
    width="96%"
    :mask-closable="false"
    destroy-on-close
    class="create-contract-modal"
    @cancel="handleCancel"
    @update:open="(val) => emit('update:open', val)"
  >
    <div class="contract-form-shell">
      <a-alert
        v-if="sourceOrderHint"
        type="info"
        show-icon
        class="source-order-alert"
        :message="sourceOrderHint"
      />
      <div class="form-layout">
        <div class="section-block modal-basic-card" :class="{ 'is-collapsed': basicInfoCollapsed }">
          <div class="section-title-row">
            <span class="section-title">基本信息</span>
            <a-button type="link" size="small" class="collapse-btn" @click="toggleBasicInfo">
              {{ basicInfoCollapsed ? '展开' : '收起' }}
              <DownOutlined v-if="basicInfoCollapsed" />
              <UpOutlined v-else />
            </a-button>
          </div>
          <a-form v-show="!basicInfoCollapsed" layout="inline" class="header-form horizontal-form">
            <a-row :gutter="[12, 8]" style="width: 100%">
              <a-col :span="6">
                <a-form-item label="收支方向" required>
                  <a-select
                    v-model:value="form.cashDirection"
                    size="small"
                    :options="contractCashDirectionOptions"
                    :disabled="isEdit"
                    @change="onCashDirectionChange"
                  />
                </a-form-item>
              </a-col>
              <a-col :span="6">
                <a-form-item label="合同类别" required>
                  <a-select
                    v-model:value="form.contractCategory"
                    size="small"
                    :options="categoryOpts"
                    :disabled="isEdit"
                  />
                </a-form-item>
              </a-col>
              <a-col :span="6">
                <a-form-item label="合同类型" required>
                  <a-select
                    v-model:value="form.contractType"
                    size="small"
                    :options="contractTypeOptions"
                    :disabled="isEdit"
                  />
                </a-form-item>
              </a-col>
              <a-col :span="6">
                <a-form-item label="合同编号" required>
                  <a-input
                    v-model:value="form.contractNo"
                    size="small"
                    placeholder="请输入合同编号"
                    allow-clear
                  />
                </a-form-item>
              </a-col>
              <a-col :span="6">
                <a-form-item label="合同名称">
                  <a-input
                    v-model:value="form.contractName"
                    size="small"
                    placeholder="请输入合同名称"
                    allow-clear
                  />
                </a-form-item>
              </a-col>
              <a-col :span="6">
                <a-form-item :label="partyFieldLabel" required>
                  <CustomerSelect
                    v-if="!isExpense"
                    v-model="form.customerName"
                    size="small"
                    placeholder="请搜索或选择客户名称"
                    @change="onCustomerChange"
                  />
                  <PlanSupplierSelect
                    v-else
                    v-model:value="form.supplierName"
                    size="small"
                    placeholder="请搜索或选择供应商"
                    @change="onSupplierChange"
                  />
                </a-form-item>
              </a-col>
              <a-col :span="6">
                <a-form-item label="业务员" :required="!isExpense">
                  <a-select
                    v-model:value="form.salesperson"
                    size="small"
                    show-search
                    allow-clear
                    :options="salespersonOpts"
                    placeholder="请选择业务员"
                    style="width: 100%"
                  />
                </a-form-item>
              </a-col>
              <a-col :span="6">
                <a-form-item label="签署人">
                  <a-input
                    v-model:value="form.signer"
                    size="small"
                    allow-clear
                    placeholder="我方签署人"
                  />
                </a-form-item>
              </a-col>
              <a-col :span="6">
                <a-form-item label="签署日期">
                  <a-date-picker
                    v-model:value="form.signedAt"
                    size="small"
                    style="width: 100%"
                    placeholder="默认有效期开始日"
                  />
                </a-form-item>
              </a-col>
              <a-col :span="6">
                <a-form-item label="结算周期">
                  <a-select
                    v-model:value="form.settlementCycle"
                    size="small"
                    allow-clear
                    :options="settlementCycleOptions"
                    style="width: 100%"
                  />
                </a-form-item>
              </a-col>
              <a-col :span="6">
                <a-form-item>
                  <template #label>
                    <span class="label-with-tip">
                      账期天数
                      <a-tooltip :title="PAYMENT_TERM_DAYS_TIP">
                        <QuestionCircleOutlined class="label-tip-icon" />
                      </a-tooltip>
                    </span>
                  </template>
                  <a-input-number
                    v-model:value="form.paymentTermDays"
                    size="small"
                    :min="0"
                    :precision="0"
                    style="width: 100%"
                    placeholder="默认 30 天"
                  />
                </a-form-item>
              </a-col>
              <a-col :span="6">
                <a-form-item label="有效期">
                  <a-range-picker
                    v-model:value="form.validRange"
                    size="small"
                    style="width: 100%"
                    @change="onValidRangeChange"
                  />
                </a-form-item>
              </a-col>
              <a-col v-if="isFramework" :span="6">
                <a-form-item>
                  <template #label>
                    <span class="label-with-tip">
                      {{ paymentNoun }}计划基数
                      <a-tooltip :title="paymentPlanBaseTip">
                        <QuestionCircleOutlined class="label-tip-icon" />
                      </a-tooltip>
                    </span>
                  </template>
                  <a-select
                    v-model:value="form.paymentPlanBase"
                    size="small"
                    style="width: 100%"
                    :options="planBaseOpts"
                  />
                </a-form-item>
              </a-col>
              <a-col :span="6">
                <a-form-item>
                  <template #label>
                    <span class="label-with-tip">
                      额度金额
                      <a-tooltip
                        title="本合同可下单的金额上限。关联销售订单累计金额超过后仅预警，不自动拦单。回款计划基数选「额度金额」时必填。"
                      >
                        <QuestionCircleOutlined class="label-tip-icon" />
                      </a-tooltip>
                      <span
                        v-if="isFramework && form.paymentPlanBase === PAYMENT_PLAN_BASE.LIMIT"
                        class="required-mark"
                      >
                        *
                      </span>
                    </span>
                  </template>
                  <a-input-number
                    v-model:value="form.limitAmount"
                    size="small"
                    :min="0"
                    :precision="2"
                    style="width: 100%"
                    :placeholder="
                      isFramework && form.paymentPlanBase === PAYMENT_PLAN_BASE.LIMIT
                        ? '必填：合同金额上限'
                        : '合同金额上限'
                    "
                  />
                </a-form-item>
              </a-col>
              <a-col :span="6">
                <a-form-item>
                  <template #label>
                    <span class="label-with-tip">
                      额度数量
                      <a-tooltip
                        title="本合同可下单的数量上限（台/件等）。关联销售订单累计数量超过后仅预警。不填表示不按数量控额度。"
                      >
                        <QuestionCircleOutlined class="label-tip-icon" />
                      </a-tooltip>
                    </span>
                  </template>
                  <a-input-number
                    v-model:value="form.limitQty"
                    size="small"
                    :min="0"
                    :precision="3"
                    style="width: 100%"
                    placeholder="可选"
                  />
                </a-form-item>
              </a-col>
              <a-col :span="6">
                <a-form-item label="是否含税" required>
                  <a-radio-group v-model:value="form.taxInclusive" size="small">
                    <a-radio :value="true">含税</a-radio>
                    <a-radio :value="false">不含税</a-radio>
                  </a-radio-group>
                </a-form-item>
              </a-col>
              <a-col :span="6">
                <a-form-item>
                  <template #label>
                    <span class="label-with-tip">
                      超额度
                      <a-tooltip
                        title="勾选后允许订单累计超过额度（仍只预警）；不勾选也仅预警，当前不拦截下单。"
                      >
                        <QuestionCircleOutlined class="label-tip-icon" />
                      </a-tooltip>
                    </span>
                  </template>
                  <a-checkbox v-model:checked="form.allowExceedQuota">允许超额度</a-checkbox>
                </a-form-item>
              </a-col>
              <a-col v-if="isFramework" :span="6">
                <a-form-item label="默认折扣(%)">
                  <a-input-number
                    v-model:value="form.defaultDiscountPercent"
                    size="small"
                    :min="1"
                    :max="100"
                    :precision="2"
                    style="width: 100%"
                  />
                </a-form-item>
              </a-col>
              <a-col :span="24">
                <a-form-item label="备注" class="remark-item">
                  <a-textarea
                    v-model:value="form.remark"
                    :rows="2"
                    :maxlength="1000"
                    show-count
                    placeholder="请输入 备注"
                  />
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
            <span class="section-title">相对方法人与开票信息</span>
            <a-button type="link" size="small" class="collapse-btn" @click="togglePartyLegal">
              {{ partyLegalCollapsed ? '展开' : '收起' }}
              <DownOutlined v-if="partyLegalCollapsed" />
              <UpOutlined v-else />
            </a-button>
          </div>
          <a-form v-show="!partyLegalCollapsed" layout="inline" class="header-form horizontal-form">
            <a-row :gutter="[12, 8]" style="width: 100%">
              <a-col :span="6">
                <a-form-item label="法定代表人">
                  <a-input
                    v-model:value="form.partyLegal.legalRepresentative"
                    size="small"
                    allow-clear
                  />
                </a-form-item>
              </a-col>
              <a-col :span="6">
                <a-form-item label="统一社会信用代码">
                  <a-input
                    v-model:value="form.partyLegal.unifiedSocialCreditCode"
                    size="small"
                    allow-clear
                  />
                </a-form-item>
              </a-col>
              <a-col :span="6">
                <a-form-item label="开户银行">
                  <a-input v-model:value="form.partyLegal.openingBank" size="small" allow-clear />
                </a-form-item>
              </a-col>
              <a-col :span="6">
                <a-form-item label="银行账号">
                  <a-input v-model:value="form.partyLegal.bankAccount" size="small" allow-clear />
                </a-form-item>
              </a-col>
              <a-col :span="6">
                <a-form-item label="开票名称">
                  <a-input v-model:value="form.partyLegal.invoiceName" size="small" allow-clear />
                </a-form-item>
              </a-col>
              <a-col :span="6">
                <a-form-item label="纳税人识别号">
                  <a-input v-model:value="form.partyLegal.invoiceTaxNo" size="small" allow-clear />
                </a-form-item>
              </a-col>
              <a-col :span="12">
                <a-form-item label="地址">
                  <a-input
                    v-model:value="form.partyLegal.address"
                    size="small"
                    allow-clear
                    placeholder="注册/通讯地址"
                  />
                </a-form-item>
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
            :data-source="form.priceItems"
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
                <a-input v-model:value="record.specModel" size="small" placeholder="规格" />
              </template>
              <template v-else-if="column.key === 'material'">
                <a-input v-model:value="record.material" size="small" placeholder="材质" />
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
                <a-button type="link" size="small" danger @click="form.priceItems.splice(index, 1)">
                  删除
                </a-button>
              </template>
            </template>
          </a-table>
          <div class="service-content-field">
            <div class="service-content-label">服务内容</div>
            <a-textarea
              v-model:value="form.serviceContent"
              :rows="3"
              :maxlength="2000"
              show-count
              placeholder="请输入本合同服务内容（对整份合同生效，非明细行字段）"
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
            :data-source="form.lineItems"
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
                  v-if="form.taxInclusive"
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
                {{ formatMoney(form.taxInclusive ? record.amountInTax : record.amountExTax) }}
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
                <a-button type="link" size="small" danger @click="form.lineItems.splice(index, 1)">
                  删除
                </a-button>
              </template>
            </template>
            <template #summary>
              <a-table-summary v-if="form.lineItems.length">
                <a-table-summary-row class="line-summary-row">
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
                    <template v-else-if="col.key === 'unitPrice'">
                      <strong>{{ formatMoney(lineSummary.unitPrice) }}</strong>
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
              v-model:value="form.serviceContent"
              :rows="3"
              :maxlength="2000"
              show-count
              placeholder="请输入本合同服务内容（对整份合同生效，非明细行字段）"
            />
          </div>
        </div>

        <div class="section-block">
          <div class="section-title-row">
            <span class="section-title">{{ paymentNoun }}节点</span>
            <span class="section-extra-tip">
              合同金额
              {{ formatMoney(contractAmountForPayment) }}，金额按比例自动计算，可手工修改；计划{{
                paymentNoun
              }}时间可选填
            </span>
          </div>
          <div class="payment-term-hints">
            <div v-for="(tip, idx) in termStartHints" :key="idx">{{ tip }}</div>
          </div>
          <a-table
            :columns="nodeColumns"
            :data-source="form.paymentNodes"
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
                  :options="termStartOpts"
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
                  @click="form.paymentNodes.splice(index, 1)"
                >
                  删除
                </a-button>
              </template>
            </template>
          </a-table>
          <a-button type="dashed" block class="add-row-btn" size="small" @click="addPaymentNode">
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
      </div>
    </div>

    <template #footer>
      <a-button size="small" @click="handleCancel">取消</a-button>
      <a-button size="small" @click="handleSave(false)">保存草稿</a-button>
      <a-button type="primary" size="small" @click="handleSave(true)">保存并提交审核</a-button>
    </template>
  </FormCreateShell>

  <SelectBomMaterialModal
    v-if="isActive"
    v-model:open="productPickerOpen"
    title="添加产品"
    picker-default-item-type="产品"
    @selected="onProductsSelected"
  />

  <SelectBomMaterialModal
    v-if="isActive"
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
import { computed, reactive, ref, watch } from 'vue'
import dayjs from 'dayjs'
import { message } from 'ant-design-vue'
import {
  DownOutlined,
  PlusOutlined,
  QuestionCircleOutlined,
  UpOutlined,
} from '@ant-design/icons-vue'
import FormCreateShell from '@/components/FormCreateShell.vue'
import { useFormCreateModal } from '@/composables/useFormCreateModal'
import {
  getCustomerByName,
  resolveCustomerAddressText,
  writeBackEmptyCustomerPartyFields,
} from '@/store/customerStore'
import CustomerSelect from './CustomerSelect.vue'
import PlanSupplierSelect from '@/views/planning/components/PlanSupplierSelect.vue'
import { getSupplierByName } from '@/store/supplierStore'
import {
  CONTRACT_DEFAULT_TAX_RATE,
  addSalesContract,
  createDefaultPaymentNodes,
  createEmptyPartyLegal,
  submitSalesContract,
  updateSalesContract,
} from '@/store/salesContractStore'
import { updateSalesOrder } from '@/store/salesOrderStore'
import {
  CONTRACT_CASH_DIRECTION,
  CONTRACT_STATUS,
  CONTRACT_TYPE,
  PAYMENT_PLAN_BASE,
  paymentTermStartHintsFor,
  paymentTermStartOptionsFor,
  contractCashDirectionOptions,
  contractCategoryOptions,
  contractPartyFieldLabel,
  contractPaymentNoun,
  defaultContractCategory,
  paymentPlanBaseOptionsFor,
  contractTypeOptions,
} from '@/constants/salesContract'
import { settlementCycleOptions } from '@/constants/customerMaster'
import { salespersonOptions } from '@/mock/salesOrderOptions'
import { normalizeDiscountRate } from '@/utils/salesOrderPricing'
import SelectBomMaterialModal from '@/views/product-process/components/SelectBomMaterialModal.vue'
import SalesLineLongTextCell from './SalesLineLongTextCell.vue'

const props = defineProps({
  open: { type: Boolean, default: false },
  pageMode: { type: Boolean, default: false },
  listPath: { type: String, default: '/contracts' },
  record: { type: Object, default: null },
  /** 新建时预填（如由销售订单生成，无 id） */
  seedRecord: { type: Object, default: null },
  defaultType: { type: String, default: '' },
  defaultCashDirection: { type: String, default: '' },
})

const emit = defineEmits(['update:open', 'saved'])

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
const isEdit = computed(() => Boolean(props.record?.id))
const isFramework = computed(() => form.contractType === CONTRACT_TYPE.FRAMEWORK)

const { isActive, shellTitle, handleCancel, closeAfterSave } = useFormCreateModal(props, emit, {
  listPath: props.listPath,
  getTitle: () => {
    if (isEdit.value) return '编辑合同'
    return form.contractType === CONTRACT_TYPE.STANDARD ? '新增标准合同' : '新增框架合同'
  },
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
    title: form.taxInclusive ? '单价(含税)' : '单价(不含税)',
    key: 'unitPrice',
    width: 120,
  },
  {
    title: form.taxInclusive ? '金额(含税)' : '金额(不含税)',
    key: 'amount',
    width: 110,
  },
  { title: '交期', key: 'deliveryDate', width: 130 },
  { title: '包装方式', key: 'packagingForm', width: 100 },
  { title: '补充说明', key: 'supplementDesc', width: 100 },
  { title: '操作', key: 'action', width: 70, fixed: 'right' },
])

const form = reactive({
  cashDirection: CONTRACT_CASH_DIRECTION.INCOME,
  contractCategory: defaultContractCategory(CONTRACT_CASH_DIRECTION.INCOME),
  contractType: CONTRACT_TYPE.STANDARD,
  contractNo: '',
  contractName: '',
  customerName: undefined,
  supplierName: undefined,
  salesperson: undefined,
  signer: '',
  signedAt: null,
  taxInclusive: true,
  partyLegal: createEmptyPartyLegal(),
  defaultDiscountPercent: 100,
  settlementCycle: undefined,
  paymentTermDays: 30,
  validRange: null,
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
  sourceSalesOrderId: '',
  sourceSalesOrderNo: '',
})

const isExpense = computed(() => form.cashDirection === CONTRACT_CASH_DIRECTION.EXPENSE)
const partyFieldLabel = computed(() => contractPartyFieldLabel(form.cashDirection))
const paymentNoun = computed(() => contractPaymentNoun(form.cashDirection))
const categoryOpts = computed(() => contractCategoryOptions(form.cashDirection))
const planBaseOpts = computed(() => paymentPlanBaseOptionsFor(form.cashDirection))
const termStartOpts = computed(() => paymentTermStartOptionsFor(form.cashDirection))
const termStartHints = computed(() => paymentTermStartHintsFor(form.cashDirection))
const PAYMENT_TERM_DAYS_TIP = computed(
  () =>
    `账期起算日后的宽限天数。例如起算=开票日、天数=30，表示开票后 30 天内应付清对应${paymentNoun.value}。默认 30 天，可修改。`,
)
const paymentPlanBaseTip = computed(() =>
  isExpense.value
    ? '框架合同生成付款计划时按哪笔金额拆节点：默认按关联采购/外协订单金额；选「额度金额」时须填写额度金额。'
    : '框架合同生成回款计划时按哪笔金额拆节点：默认按关联销售订单含税合计；选「额度金额」时须填写额度金额。',
)
const nodeColumns = computed(() => [
  { title: '节点名称', key: 'name', width: 110 },
  { title: '比例(%)', key: 'ratioPercent', width: 90 },
  { title: '金额', key: 'amount', width: 100 },
  { title: '账期起算', key: 'termStartType', width: 120 },
  { title: `计划${paymentNoun.value}时间`, key: 'planDate', width: 130 },
  { title: '操作', key: 'action', width: 70 },
])

const sourceOrderHint = computed(() => {
  if (!form.sourceSalesOrderNo) return ''
  return `来源销售订单：${form.sourceSalesOrderNo}（保存后将回写合同编号到该订单）`
})

const fileList = computed(() =>
  (form.attachments || []).map((f, i) => ({
    uid: f.id || `att-${i}`,
    name: f.name,
    status: 'done',
  })),
)

function round2(n) {
  return Math.round((Number(n) || 0) * 100) / 100
}

const lineSummary = computed(() => {
  let qty = 0
  let unitPrice = 0
  let amount = 0
  form.lineItems.forEach((line) => {
    qty += Number(line.qty) || 0
    if (form.taxInclusive) {
      unitPrice += Number(line.unitPriceInTax) || 0
      amount += Number(line.amountInTax) || 0
    } else {
      unitPrice += Number(line.unitPriceExTax) || 0
      amount += Number(line.amountExTax) || 0
    }
  })
  return {
    qty: Math.round(qty * 1000) / 1000,
    unitPrice: round2(unitPrice),
    amount: round2(amount),
  }
})

/** 回款计算基数：明细金额合计；无明细时用额度金额 */
const contractAmountForPayment = computed(() => {
  if (lineSummary.value.amount > 0) return lineSummary.value.amount
  if (form.limitAmount != null && form.limitAmount !== '') {
    return Number(form.limitAmount) || 0
  }
  return 0
})

function toggleBasicInfo() {
  basicInfoCollapsed.value = !basicInfoCollapsed.value
}

function togglePartyLegal() {
  partyLegalCollapsed.value = !partyLegalCollapsed.value
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

function syncLineAmount(line) {
  const qty = Number(line.qty) || 0
  const taxRate = Number(line.taxRate) || CONTRACT_DEFAULT_TAX_RATE
  const factor = 1 + taxRate / 100
  if (form.taxInclusive) {
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
  form.paymentNodes.forEach((node) => syncPaymentNodeAmount(node, { force, total }))
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

function applyCustomerTerms(name, { force = false } = {}) {
  const customer = getCustomerByName(name)
  if (!customer) return
  if (force || !form.settlementCycle) form.settlementCycle = customer.settlementCycle || undefined
  if (force || form.paymentTermDays == null || form.paymentTermDays === '') {
    form.paymentTermDays =
      customer.paymentTermDays != null && customer.paymentTermDays !== ''
        ? Number(customer.paymentTermDays)
        : 30
  }
  if (force || !form.salesperson) {
    form.salesperson = customer.salesperson || form.salesperson || undefined
  }
  applyPartyLegalFromCustomer(customer, { force })
}

function onValidRangeChange() {
  const start = form.validRange?.[0]
  if (start && !form.signedAt) {
    form.signedAt = start
  }
}

function applyPartyLegalFromCustomer(customer, { force = false } = {}) {
  if (!customer) {
    if (force) form.partyLegal = createEmptyPartyLegal({ name: form.customerName || '' })
    return
  }
  const p = form.partyLegal
  p.name = customer.name || form.customerName || ''
  if (force || !p.legalRepresentative) p.legalRepresentative = customer.legalRepresentative || ''
  if (force || !p.unifiedSocialCreditCode)
    p.unifiedSocialCreditCode = customer.unifiedSocialCreditCode || ''
  if (force || !p.openingBank) p.openingBank = customer.openingBank || ''
  if (force || !p.bankAccount) p.bankAccount = customer.bankAccount || ''
  if (force || !p.invoiceName) p.invoiceName = customer.invoiceName || customer.name || ''
  if (force || !p.invoiceTaxNo) {
    p.invoiceTaxNo = customer.invoiceTaxNo || customer.unifiedSocialCreditCode || ''
  }
  if (force || !p.address) {
    p.address = resolveCustomerAddressText(customer)
  }
}

function applyDefaultPaymentNodes() {
  form.paymentNodes = createDefaultPaymentNodes(form.contractType, form.cashDirection).map(
    (item) => ({
      ...item,
      termStartType: item.termStartType || undefined,
      planDate: item.planDate || '',
      amountManual: false,
    }),
  )
  syncAllPaymentNodeAmounts({ force: true })
}

function onCashDirectionChange() {
  form.contractCategory = defaultContractCategory(form.cashDirection)
  form.paymentPlanBase = isExpense.value
    ? PAYMENT_PLAN_BASE.PURCHASE_ORDERS
    : PAYMENT_PLAN_BASE.ORDERS
  if (isExpense.value) {
    form.customerName = undefined
    form.sourceSalesOrderId = ''
    form.sourceSalesOrderNo = ''
  } else {
    form.supplierName = undefined
  }
  if (!isEdit.value) applyDefaultPaymentNodes()
}

function onSupplierChange(name) {
  const supplier = getSupplierByName(name)
  form.partyLegal = createEmptyPartyLegal({
    name: name || supplier?.name || '',
  })
}

function onCustomerChange(name) {
  if (!name) {
    form.partyLegal = createEmptyPartyLegal()
    return
  }
  applyCustomerTerms(name, { force: true })
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
  form.priceItems.push(createEmptyPriceItem())
}

function openPriceProductPicker() {
  priceProductPickerOpen.value = true
}

function mapPickerToPriceItem(payload) {
  return createEmptyPriceItem({
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
    agreementDiscountPercent: form.defaultDiscountPercent ?? 100,
  })
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
    if (form.priceItems.some((item) => item.productCode === code)) return
    form.priceItems.push(mapPickerToPriceItem(payload))
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
  form.lineItems.push(createEmptyLine())
}

function openProductPicker() {
  productPickerOpen.value = true
}

function mapPickerToContractLine(payload) {
  const unitPrice =
    payload.unitPrice != null && payload.unitPrice !== '' ? Number(payload.unitPrice) : null
  const line = createEmptyLine({
    productId: payload.id || '',
    productCode: payload.code || '',
    productName: payload.name || '',
    specModel: payload.specModel || '',
    material: payload.material || '',
    unit: payload.inventoryUnit || '台',
    unitPriceExTax: Number.isFinite(unitPrice) ? unitPrice : null,
    qty: 1,
  })
  syncLineAmount(line)
  return line
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
    if (form.lineItems.some((line) => line.productCode === code)) return
    form.lineItems.push(mapPickerToContractLine(payload))
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

function addPaymentNode() {
  form.paymentNodes.push({
    id: `cpn-${Date.now()}`,
    name: '',
    ratio: null,
    amount: null,
    termStartType: undefined,
    planDate: '',
    amountManual: false,
  })
}

function beforeUpload(file) {
  form.attachments.push({
    id: `att-${Date.now()}`,
    name: file.name,
    size: file.size,
  })
  return false
}

function onRemoveFile(file) {
  form.attachments = form.attachments.filter((f) => f.name !== file.name)
}

function loadForm() {
  const r = props.record?.id ? props.record : props.seedRecord || props.record
  form.contractType = r?.contractType || props.defaultType || CONTRACT_TYPE.STANDARD
  form.cashDirection =
    r?.cashDirection || props.defaultCashDirection || CONTRACT_CASH_DIRECTION.INCOME
  form.contractCategory = r?.contractCategory || defaultContractCategory(form.cashDirection)
  form.contractNo = r?.contractNo || ''
  form.contractName = r?.contractName || ''
  form.customerName = r?.customerName
  form.supplierName = r?.supplierName || undefined
  form.salesperson = r?.salesperson || undefined
  form.signer = r?.signer || ''
  form.signedAt = r?.signedAt ? dayjs(r.signedAt) : r?.validFrom ? dayjs(r.validFrom) : null
  form.taxInclusive = r?.taxInclusive !== false
  form.partyLegal = createEmptyPartyLegal(r?.partyLegal || {})
  form.defaultDiscountPercent = r?.defaultDiscountRate
    ? Number((r.defaultDiscountRate * 100).toFixed(2))
    : 100
  form.settlementCycle = r?.settlementCycle || undefined
  form.paymentTermDays =
    r?.paymentTermDays != null && r?.paymentTermDays !== '' ? Number(r.paymentTermDays) : 30
  form.validRange =
    r?.validFrom || r?.validTo
      ? [r?.validFrom ? dayjs(r.validFrom) : null, r?.validTo ? dayjs(r.validTo) : null]
      : null
  form.limitAmount = r?.limitAmount ?? null
  form.limitQty = r?.limitQty ?? null
  form.allowExceedQuota = r?.allowExceedQuota !== false
  form.paymentPlanBase =
    r?.paymentPlanBase === PAYMENT_PLAN_BASE.LIMIT
      ? PAYMENT_PLAN_BASE.LIMIT
      : form.cashDirection === CONTRACT_CASH_DIRECTION.EXPENSE
        ? PAYMENT_PLAN_BASE.PURCHASE_ORDERS
        : PAYMENT_PLAN_BASE.ORDERS
  form.remark = r?.remark || ''
  form.serviceContent = r?.serviceContent || ''
  form.attachments = [...(r?.attachments || [])]
  form.sourceSalesOrderId = r?.sourceSalesOrderId || ''
  form.sourceSalesOrderNo = r?.sourceSalesOrderNo || ''
  form.priceItems = (r?.priceItems || []).map((item) =>
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
  form.lineItems = (r?.lineItems || []).map((item) => createEmptyLine(item))
  const contractType = form.contractType
  form.paymentNodes = (
    r?.paymentNodes?.length
      ? r.paymentNodes
      : createDefaultPaymentNodes(contractType, form.cashDirection)
  ).map((item) => ({
    ...item,
    termStartType: item.termStartType || undefined,
    planDate: item.planDate || '',
    amountManual: false,
  }))
  if (!isEdit.value && form.customerName && !props.seedRecord) applyCustomerTerms(form.customerName)
  if (!form.signedAt && form.validRange?.[0]) form.signedAt = form.validRange[0]
  syncAllPaymentNodeAmounts({ force: true })
}

watch(
  () => form.taxInclusive,
  () => {
    form.lineItems.forEach((line) => syncLineAmount(line))
  },
)

watch(contractAmountForPayment, () => {
  syncAllPaymentNodeAmounts({ force: false })
})

watch(
  () => form.limitAmount,
  () => {
    if (lineSummary.value.amount <= 0) syncAllPaymentNodeAmounts({ force: false })
  },
)

watch(
  () => [isActive.value, props.defaultType, props.record?.id, props.seedRecord?.sourceSalesOrderId],
  ([active]) => {
    if (!active) return
    loadForm()
  },
  { immediate: true },
)

/** 新建时用户切换合同类型：按公司预设重载回款节点（跳过首次赋初值） */
watch(
  () => form.contractType,
  (type, prev) => {
    if (isEdit.value || !type || !prev || type === prev) return
    applyDefaultPaymentNodes()
  },
)

function buildPayload() {
  const lineItems = form.lineItems
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
        taxRate: Number(item.taxRate) || CONTRACT_DEFAULT_TAX_RATE,
        unitPriceExTax: item.unitPriceExTax,
        unitPriceInTax: item.unitPriceInTax,
        amountExTax: item.amountExTax,
        amountInTax: item.amountInTax,
        deliveryDate: item.deliveryDate || '',
        packagingForm: item.packagingForm || '',
        supplementDesc: item.supplementDesc || '',
      }
    })
  let limitAmount = form.limitAmount
  if (
    form.contractType === CONTRACT_TYPE.STANDARD &&
    (limitAmount == null || limitAmount === '') &&
    lineItems.length
  ) {
    limitAmount = lineItems.reduce(
      (s, l) => s + (Number(form.taxInclusive ? l.amountInTax : l.amountExTax) || 0),
      0,
    )
  }
  const partyName = isExpense.value ? form.supplierName : form.customerName
  return {
    contractNo: form.contractNo,
    contractName: form.contractName,
    cashDirection: form.cashDirection,
    contractCategory: form.contractCategory,
    customerName: isExpense.value ? '' : form.customerName,
    supplierName: isExpense.value ? form.supplierName : '',
    contractType: form.contractType,
    salesperson: form.salesperson || '',
    signer: form.signer || '',
    signedAt: form.signedAt ? form.signedAt.format('YYYY-MM-DD') : '',
    taxInclusive: form.taxInclusive !== false,
    partyLegal: createEmptyPartyLegal({
      ...form.partyLegal,
      name: partyName || form.partyLegal.name || '',
    }),
    defaultDiscountRate: normalizeDiscountRate(form.defaultDiscountPercent / 100, 1),
    settlementCycle: form.settlementCycle || '',
    paymentTermDays:
      form.paymentTermDays != null && form.paymentTermDays !== ''
        ? Number(form.paymentTermDays)
        : 30,
    validFrom: form.validRange?.[0] ? form.validRange[0].format('YYYY-MM-DD') : '',
    validTo: form.validRange?.[1] ? form.validRange[1].format('YYYY-MM-DD') : '',
    limitAmount: limitAmount != null && limitAmount !== '' ? Number(limitAmount) : null,
    limitQty: form.limitQty != null && form.limitQty !== '' ? Number(form.limitQty) : null,
    allowExceedQuota: form.allowExceedQuota !== false,
    remark: form.remark,
    serviceContent: form.serviceContent || '',
    attachments: form.attachments,
    priceItems: form.priceItems
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
    lineItems,
    paymentPlanBase: isFramework.value
      ? form.paymentPlanBase
      : isExpense.value
        ? PAYMENT_PLAN_BASE.PURCHASE_ORDERS
        : PAYMENT_PLAN_BASE.ORDERS,
    paymentNodes: form.paymentNodes
      .filter((item) => item.name?.trim())
      .map((item) => ({
        id: item.id,
        name: item.name.trim(),
        ratio: item.ratio,
        amount: item.amount,
        termStartType: item.termStartType || '',
        planDate: item.planDate || '',
      })),
    sourceSalesOrderId: form.sourceSalesOrderId || '',
    sourceSalesOrderNo: form.sourceSalesOrderNo || '',
    status: isEdit.value ? props.record.status : CONTRACT_STATUS.DRAFT,
  }
}

function linkSourceSalesOrder(contract) {
  if (!contract?.sourceSalesOrderId || !contract.contractNo) return
  updateSalesOrder(contract.sourceSalesOrderId, {
    contractNo: contract.contractNo,
    contractType: contract.contractType || CONTRACT_TYPE.STANDARD,
  })
}

function handleSave(submit) {
  if (!form.contractNo?.trim()) {
    message.warning('请输入合同编号')
    return
  }
  if (isExpense.value) {
    if (!form.supplierName) {
      message.warning('请选择供应商')
      return
    }
  } else if (!form.customerName) {
    message.warning('请选择客户')
    return
  }
  if (!isExpense.value && !form.salesperson) {
    message.warning('请选择业务员')
    return
  }
  if (
    isFramework.value &&
    form.paymentPlanBase === PAYMENT_PLAN_BASE.LIMIT &&
    !(Number(form.limitAmount) > 0)
  ) {
    message.warning(`${paymentNoun.value}计划基数为「额度金额」时，请填写额度金额`)
    return
  }
  const payload = buildPayload()
  const res = isEdit.value
    ? updateSalesContract(props.record.id, payload)
    : addSalesContract(payload)
  if (!res.ok) {
    message.warning(res.message)
    return
  }
  linkSourceSalesOrder(res.data)
  let writeBackTip = ''
  if (!isExpense.value) {
    const writeBack = writeBackEmptyCustomerPartyFields({
      ...form.partyLegal,
      name: form.customerName || form.partyLegal.name || '',
    })
    writeBackTip =
      writeBack.ok && writeBack.count > 0 ? `；已回写客户主数据 ${writeBack.count} 项空字段` : ''
  }
  if (submit) {
    const sub = submitSalesContract(res.data.id)
    if (!sub.ok) {
      message.warning(sub.message)
      return
    }
    message.success(`${sub.message || '已保存并提交审核'}${writeBackTip}`)
  } else {
    message.success(`${isEdit.value ? '已保存' : '草稿已创建'}${writeBackTip}`)
  }
  emit('saved', res.data)
  closeAfterSave()
}
</script>

<style lang="less" scoped>
.contract-form-shell {
  min-width: 0;
}

.source-order-alert {
  margin-bottom: 8px;
}

.form-layout {
  min-width: 0;
}

.section-block {
  flex-shrink: 0;

  .section-title-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 8px;
    margin-bottom: 12px;
  }

  .section-title-row .section-title {
    margin-bottom: 0;
  }

  .collapse-btn {
    padding-inline: 4px;
    height: auto;
    flex-shrink: 0;
  }

  &.is-collapsed {
    padding-top: 10px;
    padding-bottom: 10px;

    .section-title-row {
      margin-bottom: 0;
    }
  }
}

.header-form {
  :deep(.ant-form-item) {
    width: 100%;
    margin-bottom: 0;
    margin-inline-end: 0;
  }

  :deep(.ant-form-item-row) {
    flex-wrap: nowrap;
    align-items: center;
  }

  :deep(.ant-form-item-label) {
    flex: 0 0 auto;
    padding-bottom: 0;

    > label {
      height: 24px;
      line-height: 24px;
      font-size: 13px;
      white-space: nowrap;

      &::after {
        margin-inline: 2px 6px;
      }
    }
  }

  :deep(.ant-form-item-control) {
    flex: 1;
    min-width: 0;
  }

  :deep(.ant-input),
  :deep(.ant-select),
  :deep(.ant-picker),
  :deep(.ant-input-number),
  :deep(.ant-input-affix-wrapper) {
    width: 100%;
  }

  .remark-item {
    :deep(.ant-form-item-row) {
      align-items: flex-start;
    }

    :deep(.ant-form-item-label) {
      flex: 0 0 68px;
      padding-top: 4px;
    }

    :deep(textarea.ant-input) {
      min-height: 54px;
    }
  }
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

.section-extra-tip {
  font-size: 12px;
  font-weight: 400;
  color: rgba(0, 0, 0, 0.45);
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

.line-summary-row {
  background: #fafafa;

  :deep(td) {
    font-size: 13px;
  }
}

.field-tip {
  margin-top: 8px;
  font-size: 12px;
  color: rgba(0, 0, 0, 0.45);
}

.label-with-tip {
  display: inline-flex;
  align-items: center;
  gap: 4px;
}

.label-tip-icon {
  color: rgba(0, 0, 0, 0.45);
  font-size: 12px;
  cursor: help;
}

.required-mark {
  color: #ff4d4f;
  margin-left: 2px;
}
</style>
