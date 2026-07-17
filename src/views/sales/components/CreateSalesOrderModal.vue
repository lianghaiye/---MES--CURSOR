<template>
  <FormCreateShell
    :page-mode="pageMode"
    :open="open"
    :title="shellTitle"
    width="96%"
    :mask-closable="false"
    destroy-on-close
    class="create-sales-order-modal"
    @cancel="handleCancel"
    @update:open="(val) => emit('update:open', val)"
  >
    <a-form layout="inline" class="header-form horizontal-form">
      <a-row :gutter="[12, 8]" style="width: 100%">
        <a-col :span="8">
          <a-form-item label="销售单号">
            <a-input
              v-model:value="form.orderNo"
              placeholder="留空则系统自动生成"
              allow-clear
              size="small"
            />
          </a-form-item>
        </a-col>
        <a-col :span="8">
          <a-form-item label="紧急度" required>
            <a-select v-model:value="form.urgency" size="small" :options="urgencyOpts" />
          </a-form-item>
        </a-col>
        <a-col :span="8">
          <a-form-item label="合同类型" required>
            <a-select v-model:value="form.contractType" size="small" :options="contractTypeOpts" />
          </a-form-item>
        </a-col>
        <a-col :span="8">
          <a-form-item label="合同编号">
            <a-input v-model:value="form.contractNo" size="small" placeholder="请输入 合同编号" />
          </a-form-item>
        </a-col>
        <a-col :span="8">
          <a-form-item label="结算币种" required>
            <a-select
              v-model:value="form.settlementCurrency"
              size="small"
              :options="currencyOpts"
            />
          </a-form-item>
        </a-col>
        <a-col :span="8">
          <a-form-item label="订单类型" required>
            <a-select v-model:value="form.orderType" size="small" :options="orderTypeOpts" />
          </a-form-item>
        </a-col>
        <a-col :span="8">
          <a-form-item label="客户名称" required>
            <a-select
              v-model:value="form.customerName"
              size="small"
              show-search
              allow-clear
              placeholder="请搜索或选择客户名称"
              :options="customerOpts"
              :filter-option="filterCustomerOption"
              option-filter-prop="label"
              @change="onCustomerChange"
            />
          </a-form-item>
        </a-col>
        <a-col :span="8">
          <a-form-item label="联系人">
            <a-select
              v-model:value="form.contactPerson"
              size="small"
              placeholder="请选择 联系人"
              allow-clear
              :options="contactOpts"
              @change="onContactChange"
            />
          </a-form-item>
        </a-col>
        <a-col :span="8">
          <a-form-item label="联系人电话">
            <a-input
              v-model:value="form.contactPhone"
              size="small"
              placeholder="请输入 联系人电话"
            />
          </a-form-item>
        </a-col>
        <a-col :span="8">
          <a-form-item label="交货地址">
            <a-input
              v-model:value="form.deliveryAddress"
              size="small"
              placeholder="请输入 交货地址"
            />
          </a-form-item>
        </a-col>
        <a-col :span="8">
          <a-form-item label="交货方式" required>
            <a-select
              v-model:value="form.deliveryMethod"
              size="small"
              :options="deliveryMethodOpts"
            />
          </a-form-item>
        </a-col>
        <a-col :span="8">
          <a-form-item label="订单金额">
            <a-input-number
              :value="orderAmount"
              :precision="2"
              disabled
              size="small"
              style="width: 100%"
            />
          </a-form-item>
        </a-col>
        <a-col :span="8">
          <a-form-item label="技术规范编码">
            <a-input
              v-model:value="form.techSpecCode"
              size="small"
              placeholder="请输入 技术规范编码"
            />
          </a-form-item>
        </a-col>
        <a-col :span="8">
          <a-form-item label="提醒日期">
            <a-date-picker
              v-model:value="form.reminderDate"
              size="small"
              style="width: 100%"
              placeholder="请选择 提醒日期"
            />
          </a-form-item>
        </a-col>
        <a-col :span="8">
          <a-form-item label="业务员">
            <a-select
              v-model:value="form.salesperson"
              size="small"
              :options="salespersonOpts"
              show-search
            />
          </a-form-item>
        </a-col>
        <a-col :span="8">
          <a-form-item label="结算类型">
            <a-select
              v-model:value="form.settlementType"
              size="small"
              allow-clear
              placeholder="请选择 结算类型"
              :options="settlementTypeOpts"
            />
          </a-form-item>
        </a-col>
        <a-col :span="8">
          <a-form-item label="付款比例">
            <a-select
              v-model:value="form.paymentRatio"
              size="small"
              allow-clear
              placeholder="请选择 付款比例"
              :options="paymentRatioOpts"
            />
          </a-form-item>
        </a-col>
        <a-col :span="8">
          <a-form-item label="首付/定金金额">
            <a-input-number
              v-model:value="form.downPaymentAmount"
              size="small"
              :min="0"
              :precision="2"
              style="width: 100%"
              placeholder="请输入 首付/定金金额"
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

    <div v-if="customerDiscountHint" class="discount-hint">{{ customerDiscountHint }}</div>

    <div class="price-summary-card">
      <div class="price-summary-header" @click="priceSummaryCollapsed = !priceSummaryCollapsed">
        <span class="section-title">价格汇总</span>
        <span class="header-amounts">
          <span class="header-amount-item">
            含税
            <strong>￥{{ formatMoney(orderAmount) }}</strong>
          </span>
          <span class="header-amount-item">
            不含税
            <strong>￥{{ formatMoney(orderPricing.amountExTax) }}</strong>
          </span>
        </span>
        <DownOutlined :class="{ rotated: priceSummaryCollapsed }" class="collapse-icon" />
      </div>
      <div v-show="!priceSummaryCollapsed" class="price-summary-body">
        <div class="summary-amounts-strip">
          <span class="amount-chip">
            销售总额
            <strong>￥{{ formatMoney(orderPricing.lineListAmountExTax) }}</strong>
          </span>
          <span class="amount-chip discount">
            行优惠
            <strong>-￥{{ formatMoney(orderPricing.lineDiscountTotal) }}</strong>
          </span>
          <span class="amount-chip discount">
            整单优惠
            <strong>-￥{{ formatMoney(orderPricing.orderDiscountTotal) }}</strong>
          </span>
        </div>
        <a-form layout="inline" size="small" class="discount-inline-form">
          <a-form-item label="折扣策略">
            <a-radio-group
              v-model:value="form.discountStrategy"
              size="small"
              @change="syncOrderDiscountRate"
            >
              <a-radio :value="DISCOUNT_STRATEGIES.LINE">
                {{ DISCOUNT_STRATEGY_LABELS[DISCOUNT_STRATEGIES.LINE] }}
              </a-radio>
              <a-radio :value="DISCOUNT_STRATEGIES.ORDER">
                {{ DISCOUNT_STRATEGY_LABELS[DISCOUNT_STRATEGIES.ORDER] }}
              </a-radio>
              <a-radio :value="DISCOUNT_STRATEGIES.STACK">
                {{ DISCOUNT_STRATEGY_LABELS[DISCOUNT_STRATEGIES.STACK] }}
              </a-radio>
            </a-radio-group>
          </a-form-item>
          <a-form-item label="整单折扣(%)">
            <a-input-number
              v-model:value="form.orderDiscountPercent"
              size="small"
              :min="1"
              :max="100"
              :precision="2"
              :disabled="form.discountStrategy === DISCOUNT_STRATEGIES.LINE"
              style="width: 88px"
              @change="syncOrderDiscountRate"
            />
          </a-form-item>
          <a-form-item label="整单减免(元)">
            <a-input-number
              v-model:value="form.orderDiscountAmount"
              size="small"
              :min="0"
              :precision="2"
              :disabled="form.discountStrategy === DISCOUNT_STRATEGIES.LINE"
              style="width: 100px"
              @change="syncOrderDiscountRate"
            />
          </a-form-item>
          <a-form-item label="优惠原因" class="discount-reason-item">
            <a-input
              v-model:value="form.orderDiscountReason"
              size="small"
              placeholder="如：老客户合作、批量采购"
              style="width: 200px"
            />
          </a-form-item>
        </a-form>
      </div>
    </div>

    <div class="detail-section">
      <div class="detail-section-header" @click="detailCollapsed = !detailCollapsed">
        <span class="section-title">销售明细</span>
        <DownOutlined :class="{ rotated: detailCollapsed }" class="collapse-icon" />
      </div>

      <div v-show="!detailCollapsed">
        <div class="detail-toolbar">
          <a-space wrap>
            <a-button type="primary" @click="openProductPicker">
              <PlusOutlined />
              选择产品
            </a-button>
            <a-button @click="addManualProductLine">
              <PlusOutlined />
              添加产品
            </a-button>
            <a-button class="tax-toggle-btn" @click="toggleTaxMode">
              切换为：{{ taxModeExcluding ? '计算含税' : '计算不含税' }}
            </a-button>
            <span class="tax-hint">{{ taxModeHint }}</span>
          </a-space>
          <a-popover trigger="click" placement="bottomRight">
            <template #title>列设置</template>
            <template #content>
              <a-checkbox-group v-model:value="visibleColumnKeys" class="column-settings">
                <a-row>
                  <a-col v-for="col in columnDefs" :key="col.key" :span="12">
                    <a-checkbox :value="col.key" :disabled="fixedColumnKeys.includes(col.key)">
                      {{ col.title }}
                    </a-checkbox>
                  </a-col>
                </a-row>
              </a-checkbox-group>
            </template>
            <a-button type="text" class="column-setting-btn">
              <AppstoreOutlined />
            </a-button>
          </a-popover>
        </div>

        <a-table
          :columns="displayColumns"
          :data-source="form.lineItems"
          row-key="id"
          size="small"
          bordered
          :pagination="false"
          :scroll="{ x: tableScrollX }"
          class="sales-line-table"
          locale="{ emptyText: '暂无数据' }"
        >
          <template #headerCell="{ column }">
            <div class="header-cell">
              <span class="header-title">{{ column.title }}</span>
              <span
                v-if="column.key !== 'index'"
                class="resize-handle"
                @mousedown.prevent="(e) => startColumnResize(e, column.key)"
              />
            </div>
          </template>

          <template #bodyCell="{ column, record, index }">
            <template v-if="column.key === 'index'">{{ index + 1 }}</template>

            <template v-else-if="column.key === 'businessType'">
              <a-select
                v-model:value="record.businessType"
                size="small"
                style="width: 100%"
                :options="lineBusinessTypeOpts(record)"
                @change="(val) => onBusinessTypeChange(record, val)"
              />
            </template>

            <template v-else-if="column.key === 'productName'">
              <a-input
                v-if="record.isManualLine"
                v-model:value="record.productName"
                size="small"
                placeholder="请输入产品名称"
              />
              <span v-else class="readonly-cell">{{ record.productName || '—' }}</span>
            </template>

            <template v-else-if="column.key === 'productCode'">
              <a-input
                v-if="record.isManualLine"
                v-model:value="record.productCode"
                size="small"
                placeholder="请输入产品编码"
              />
              <span v-else class="readonly-cell">{{ record.productCode || '—' }}</span>
            </template>

            <template v-else-if="column.key === 'productAttr'">
              <span>{{ record.productAttr || '—' }}</span>
            </template>

            <template v-else-if="column.key === 'specModel'">
              <a-input v-if="record.isManualLine" v-model:value="record.specModel" size="small" />
              <a
                v-else-if="isSpuLine(record)"
                class="variant-field-link"
                @click.prevent="openVariantConfig(record)"
              >
                {{ record.specModel || '点击配置' }}
              </a>
              <span v-else>{{ record.specModel || '—' }}</span>
            </template>

            <template v-else-if="column.key === 'material'">
              <a-input v-if="record.isManualLine" v-model:value="record.material" size="small" />
              <a
                v-else-if="isSpuLine(record)"
                class="variant-field-link"
                @click.prevent="openVariantConfig(record)"
              >
                {{ record.material || '点击配置' }}
              </a>
              <span v-else>{{ record.material || '—' }}</span>
            </template>

            <template v-else-if="column.key === 'variantAttr'">
              <a
                v-if="isSpuLine(record)"
                class="variant-field-link"
                @click.prevent="openVariantConfig(record)"
              >
                {{ lineVariantDisplay(record) || '—' }}
              </a>
              <template v-else>
                <a-tooltip v-if="lineVariantDisplay(record)" :title="lineVariantDisplay(record)">
                  <span>{{ lineVariantDisplay(record) }}</span>
                </a-tooltip>
                <span v-else>—</span>
              </template>
            </template>

            <template v-else-if="column.key === 'drawingNo'">
              <span v-if="!record.isManualLine" class="readonly-cell">{{
                record.drawingNo || '—'
              }}</span>
              <a-input v-else v-model:value="record.drawingNo" size="small" placeholder="图号" />
            </template>

            <template v-else-if="column.key === 'techParams'">
              <SalesLineLongTextCell
                :value="record.techParams"
                @edit="openLongTextEdit(record, 'techParams')"
              />
            </template>

            <template v-else-if="column.key === 'matchingRequirements'">
              <SalesLineLongTextCell
                :value="record.matchingRequirements"
                @edit="openLongTextEdit(record, 'matchingRequirements')"
              />
            </template>

            <template v-else-if="column.key === 'salesQty'">
              <a-input-number
                v-model:value="record.salesQty"
                size="small"
                :min="0"
                style="width: 100%"
                @change="onLineFieldChange(record)"
              />
            </template>

            <template v-else-if="column.key === 'deliveryMode'">
              <a-select
                v-model:value="record.deliveryMode"
                size="small"
                style="width: 100%"
                :options="deliveryModeOpts"
              />
            </template>

            <template v-else-if="column.key === 'deliveryDate'">
              <a-date-picker
                :value="lineDateValue(record.deliveryDate)"
                size="small"
                style="width: 100%"
                @change="(d) => onLineDateChange(record, d)"
              />
            </template>

            <template v-else-if="column.key === 'bomName'">
              <span class="readonly-cell">{{ record.bomName || '—' }}</span>
            </template>

            <template v-else-if="column.key === 'bomVersion'">
              <span class="readonly-cell">{{ record.bomVersion || '—' }}</span>
            </template>

            <template v-else-if="column.key === 'unit'">
              <a-input v-model:value="record.unit" size="small" />
            </template>

            <template v-else-if="column.key === 'lineDiscountPercent'">
              <a-input-number
                v-if="showLineDiscount"
                :value="getLineDiscountPercent(record)"
                size="small"
                :min="1"
                :max="100"
                :precision="2"
                style="width: 100%"
                @update:value="(v) => setLineDiscountPercent(record, v)"
              />
              <span v-else>—</span>
            </template>

            <template v-else-if="column.key === 'lineDiscountAmount'">
              {{ formatMoney(record.lineDiscountAmount) }}
            </template>

            <template v-else-if="column.key === 'taxRate'">
              <a-input-number
                v-model:value="record.taxRate"
                size="small"
                :min="0"
                :max="100"
                :precision="2"
                style="width: 100%"
                @change="onLineFieldChange(record)"
              />
            </template>

            <template v-else-if="column.key === 'unitPriceExTax'">
              <a-input-number
                v-model:value="record.unitPriceExTax"
                size="small"
                :min="0"
                :precision="2"
                style="width: 100%"
                @change="onUnitPriceExTaxChange(record)"
              />
            </template>

            <template v-else-if="column.key === 'unitPriceInTax'">
              <a-input-number
                v-model:value="record.unitPriceInTax"
                size="small"
                :min="0"
                :precision="2"
                style="width: 100%"
                @change="onUnitPriceInTaxChange(record)"
              />
            </template>

            <template v-else-if="column.key === 'totalPriceExTax'">
              {{ formatMoney(record.totalPriceExTax) }}
            </template>

            <template v-else-if="column.key === 'totalPriceInTax'">
              {{ formatMoney(record.totalPriceInTax) }}
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

            <template v-else-if="column.key === 'lineAttachment'">
              <a-upload
                class="line-attachment-upload"
                :file-list="lineUploadFileList(record)"
                :before-upload="(file) => beforeLineUpload(record, file)"
                multiple
                @remove="(file) => onLineFileRemove(record, file)"
              >
                <a-button type="link" size="small" class="line-upload-btn">
                  <UploadOutlined />
                  上传附件
                </a-button>
              </a-upload>
            </template>

            <template v-else-if="column.key === 'action'">
              <a-space :size="0">
                <a-button type="link" size="small" @click="openLineEdit(record)">编辑</a-button>
                <a-button type="link" size="small" danger @click="removeLine(index)">删除</a-button>
                <a-button type="link" size="small" @click="cloneLine(index)">克隆</a-button>
              </a-space>
            </template>

            <template v-else>
              {{ record[column.dataIndex] ?? '-' }}
            </template>
          </template>
        </a-table>
      </div>
    </div>

    <div class="attachment-section">
      <div class="attachment-section-header">
        <span class="section-title">图片文档信息</span>
      </div>
      <a-divider class="section-divider" />
      <a-form layout="inline" class="attachment-form horizontal-form">
        <a-form-item label="文件上传">
          <div class="upload-field">
            <a-upload v-model:file-list="fileList" :before-upload="beforeUpload" multiple>
              <a-button type="primary" size="small">
                <UploadOutlined />
                点击上传
              </a-button>
            </a-upload>
            <div class="upload-hint">支持上传各类型文件，大小不超过 200MB</div>
          </div>
        </a-form-item>
      </a-form>
    </div>

    <SelectBomMaterialModal
      v-model:open="productPickerOpen"
      title="添加产品/物料"
      picker-default-item-type="产品"
      :include-spu-templates="true"
      @selected="onSalesProductsSelected"
    />

    <ConfigureSalesSpuVariantModal
      v-model:open="variantConfigOpen"
      :spu-id="variantConfigSpuId"
      :initial-variant-values="variantConfigInitialValues"
      :allow-back="false"
      confirm-text="确定"
      @confirm="onVariantConfigConfirm"
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
        :rows="10"
        :placeholder="`请输入${longTextEdit.title}`"
        show-count
        :maxlength="5000"
      />
    </a-modal>

    <SalesOrderLineEditModal
      v-model:open="lineEditOpen"
      :line="lineEditTarget"
      :tax-mode-excluding="taxModeExcluding"
      :discount-strategy="form.discountStrategy"
      :customer-name="form.customerName"
      :contract-no="form.contractNo"
      @saved="onLineEditSaved"
    />

    <template #footer>
      <a-button size="small" @click="handleCancel">取消</a-button>
      <a-button type="primary" size="small" @click="handleSave">保存</a-button>
    </template>
  </FormCreateShell>
</template>

<script setup>
import { computed, reactive, ref, watch } from 'vue'
import { message, Upload } from 'ant-design-vue'
import dayjs from 'dayjs'
import { PlusOutlined, DownOutlined, AppstoreOutlined, UploadOutlined } from '@ant-design/icons-vue'
import {
  urgencyOptions,
  contractTypeOptions,
  settlementCurrencyOptions,
  orderTypeOptions,
  deliveryMethodOptions,
  deliveryModeOptions,
  settlementTypeOptions,
  paymentRatioOptions,
  salespersonOptions,
} from '@/mock/salesOrderOptions'
import { createLineItem } from '@/mock/salesOrders'
import { productInfoState } from '@/store/productInfoStore'
import { materialInfoState } from '@/store/materialInfoStore'
import { getOwnActiveBomForItem } from '@/store/productBomStore'
import { BOM_FULFILLMENT_PATH } from '@/constants/salesOrderFulfillment'
import {
  addSalesOrder,
  generateSalesOrderNo,
  recalcOrderAmounts,
  salesOrderState,
  updateSalesOrder,
} from '@/store/salesOrderStore'
import { getCustomerOptions, getCustomerByName } from '@/store/customerStore'
import { getFrameworkContractByNo } from '@/store/frameworkContractStore'
import { resolveSalesLinePrice } from '@/utils/customerPrice'
import {
  DISCOUNT_STRATEGIES,
  DISCOUNT_STRATEGY_LABELS,
  ensureLinePricingFields,
  normalizeDiscountRate,
  recalcSalesLinePricing,
  applyOrderAmounts,
  calcOrderAmounts,
  formatDiscountRatePercent,
} from '@/utils/salesOrderPricing'
import SelectBomMaterialModal from '@/views/product-process/components/SelectBomMaterialModal.vue'
import SalesLineLongTextCell from './SalesLineLongTextCell.vue'
import SalesOrderLineEditModal from './SalesOrderLineEditModal.vue'
import ConfigureSalesSpuVariantModal from './ConfigureSalesSpuVariantModal.vue'
import FormCreateShell from '@/components/FormCreateShell.vue'
import { useFormCreateModal } from '@/composables/useFormCreateModal.js'
import {
  deriveOrderBusinessType,
  normalizeSalesLineBusiness,
  CUSTOM_SALES_BUSINESS_TYPE,
  MAINTENANCE_SERVICE_BUSINESS_TYPE,
} from '@/utils/salesOrderBusiness'
import {
  isSpuLine,
  lineVariantSummary,
  createSpuLineDraft,
  applySalesLineResolvedConfig,
  validateSalesLinesSkuResolved,
} from '@/utils/spuLineResolve'

const props = defineProps({
  open: { type: Boolean, default: false },
  pageMode: { type: Boolean, default: false },
  listPath: { type: String, default: '' },
  editRecord: { type: Object, default: null },
})

const emit = defineEmits(['update:open', 'saved'])

const isEdit = computed(() => Boolean(props.editRecord?.id))
const { isActive, shellTitle, handleCancel, closeAfterSave } = useFormCreateModal(props, emit, {
  listPath: '/sales/orders',
  getTitle: () => (isEdit.value ? '编辑销售订单' : '新增销售订单'),
})
/** 默认按含税单价录入（明细列「单价（含税）」） */
const taxModeExcluding = ref(false)
const detailCollapsed = ref(false)
const priceSummaryCollapsed = ref(false)
const productPickerOpen = ref(false)
const variantConfigOpen = ref(false)
const variantConfigSpuId = ref('')
const variantConfigInitialValues = ref(null)
const variantConfigTargetLine = ref(null)
const lineEditOpen = ref(false)
const lineEditTarget = ref(null)
const fileList = ref([])

const LONG_TEXT_FIELD_LABELS = {
  techParams: '技术参数',
  matchingRequirements: '配套要求',
  packagingForm: '包装形式',
  supplementDesc: '补充说明',
}

const longTextEdit = reactive({
  open: false,
  title: '',
  fieldKey: '',
  record: null,
  draft: '',
})

const MAX_FILE_SIZE = 200 * 1024 * 1024

/** 销售明细固定列：不可隐藏、左侧冻结 */
const fixedColumnKeys = ['index', 'productName', 'productCode', 'action']

const columnDefs = [
  { key: 'index', title: '序号', width: 56, fixed: 'left' },
  {
    key: 'productName',
    title: '产品名称',
    dataIndex: 'productName',
    width: 140,
    ellipsis: true,
    fixed: 'left',
  },
  {
    key: 'productCode',
    title: '产品编码',
    dataIndex: 'productCode',
    width: 130,
    ellipsis: true,
    fixed: 'left',
  },
  { key: 'businessType', title: '业务类型', width: 130 },
  { key: 'productAttr', title: '产品属性', dataIndex: 'productAttr', width: 90 },
  { key: 'specModel', title: '规格型号', dataIndex: 'specModel', width: 120 },
  { key: 'material', title: '材质', dataIndex: 'material', width: 100 },
  {
    key: 'variantAttr',
    title: '变体属性',
    dataIndex: 'variantSummary',
    width: 160,
    ellipsis: true,
  },
  { key: 'drawingNo', title: '图号', dataIndex: 'drawingNo', width: 100, ellipsis: true },
  { key: 'techParams', title: '技术参数', width: 120, ellipsis: true },
  { key: 'matchingRequirements', title: '配套要求', width: 120, ellipsis: true },
  { key: 'salesQty', title: '销售数量', width: 90 },
  { key: 'deliveryMode', title: '交付方式', width: 100 },
  { key: 'deliveryDate', title: '交货日期', width: 120 },
  { key: 'unit', title: '单位', width: 70 },
  { key: 'bomName', title: 'Bom名称', dataIndex: 'bomName', width: 100, ellipsis: true },
  { key: 'bomVersion', title: 'Bom版本', dataIndex: 'bomVersion', width: 90 },
  { key: 'unitPriceExTax', title: '单价（不含税）', width: 120 },
  { key: 'unitPriceInTax', title: '单价（含税）', width: 110 },
  { key: 'taxRate', title: '税率(%)', width: 80 },
  { key: 'totalPriceExTax', title: '总价（不含税）', width: 110 },
  { key: 'totalPriceInTax', title: '总价（含税）', width: 100 },
  { key: 'lineDiscountPercent', title: '行折扣(%)', width: 90 },
  { key: 'lineDiscountAmount', title: '行优惠金额', width: 100 },
  { key: 'packagingForm', title: '包装形式', width: 90 },
  { key: 'supplementDesc', title: '补充说明', width: 90 },
  { key: 'lineAttachment', title: '上传附件', width: 120 },
  { key: 'action', title: '操作', width: 150, fixed: 'right' },
]

const visibleColumnKeys = ref(columnDefs.map((c) => c.key))
const columnWidths = reactive(Object.fromEntries(columnDefs.map((c) => [c.key, c.width])))

watch(visibleColumnKeys, (keys) => {
  const required = fixedColumnKeys.filter((k) => k !== 'action')
  const missing = required.filter((k) => !keys.includes(k))
  if (missing.length) {
    visibleColumnKeys.value = [...new Set([...keys, ...required])]
  }
})

const taxModeHint = computed(() =>
  taxModeExcluding.value
    ? '当前：按不含税口径反算（切换后请用计价逻辑；明细默认展示单价含税）'
    : '当前：按单价（含税）录入，系统自动反算不含税金额',
)

const form = reactive({
  orderNo: '',
  urgency: '正常',
  contractType: '标准合同',
  contractNo: '',
  settlementCurrency: '人民币',
  orderType: '国内订单',
  customerName: undefined,
  contactPerson: undefined,
  contactPhone: '',
  deliveryAddress: '',
  deliveryMethod: '送货',
  techSpecCode: '',
  reminderDate: null,
  salesperson: 'admin1',
  settlementType: undefined,
  paymentRatio: undefined,
  downPaymentAmount: null,
  remark: '',
  discountStrategy: DISCOUNT_STRATEGIES.LINE,
  orderDiscountType: 'none',
  orderDiscountPercent: 100,
  orderDiscountRate: 1,
  orderDiscountAmount: 0,
  orderDiscountReason: '',
  lineItems: [],
})

const displayColumns = computed(() =>
  columnDefs
    .filter((c) => visibleColumnKeys.value.includes(c.key))
    .map((c) => ({
      title: c.title,
      key: c.key,
      dataIndex: c.dataIndex,
      width: columnWidths[c.key] ?? c.width,
      ellipsis: c.ellipsis,
      align: c.key === 'index' ? 'center' : undefined,
      fixed: c.fixed,
    })),
)

const tableScrollX = computed(() =>
  displayColumns.value.reduce((sum, c) => sum + (c.width || 100), 0),
)

const catalogBusinessTypeOpts = ['自产销售', '外购销售', CUSTOM_SALES_BUSINESS_TYPE].map((v) => ({
  label: v,
  value: v,
}))
const manualBusinessTypeOpts = [
  '外协销售',
  '质检服务',
  MAINTENANCE_SERVICE_BUSINESS_TYPE,
  CUSTOM_SALES_BUSINESS_TYPE,
].map((v) => ({ label: v, value: v }))

function onBusinessTypeChange(record, businessType) {
  record.businessType = businessType
  if (businessType === MAINTENANCE_SERVICE_BUSINESS_TYPE) {
    record.isManualLine = true
    record.productId = ''
    record.bomId = ''
    record.bomName = ''
    record.bomVersion = ''
    record.productAttr = ''
    return
  }
  if (businessType === CUSTOM_SALES_BUSINESS_TYPE) {
    record.productAttr = '定制产品'
    record.bomId = ''
    record.bomName = ''
    record.bomVersion = ''
    return
  }
  if (record.isManualLine) {
    record.productAttr = ''
    return
  }
  const product = productInfoState.products.find((p) => p.id === record.productId)
  if (product) {
    record.productAttr = product.productAttribute || ''
  }
  if (businessType === '自产销售' || businessType === '外购销售') {
    const bom = getOwnActiveBomForItem('product', record.productId)
    record.bomId = bom?.id || ''
    record.bomName = bom?.bomName || ''
    record.bomVersion = bom?.version || ''
  }
}

function startColumnResize(e, key) {
  const startX = e.clientX
  const startWidth = columnWidths[key] ?? 100

  const onMove = (ev) => {
    columnWidths[key] = Math.max(60, startWidth + ev.clientX - startX)
  }
  const onUp = () => {
    document.removeEventListener('mousemove', onMove)
    document.removeEventListener('mouseup', onUp)
    document.body.style.cursor = ''
    document.body.style.userSelect = ''
  }
  document.body.style.cursor = 'col-resize'
  document.body.style.userSelect = 'none'
  document.addEventListener('mousemove', onMove)
  document.addEventListener('mouseup', onUp)
}

function lineBusinessTypeOpts(record) {
  const base = record.isManualLine ? manualBusinessTypeOpts : catalogBusinessTypeOpts
  if (record.businessType && !base.some((opt) => opt.value === record.businessType)) {
    return [{ label: record.businessType, value: record.businessType }, ...base]
  }
  return base
}

const urgencyOpts = urgencyOptions.map((v) => ({ label: v, value: v }))
const contractTypeOpts = contractTypeOptions.map((v) => ({ label: v, value: v }))
const currencyOpts = settlementCurrencyOptions.map((v) => ({ label: v, value: v }))
const orderTypeOpts = orderTypeOptions.map((v) => ({ label: v, value: v }))
const deliveryMethodOpts = deliveryMethodOptions.map((v) => ({ label: v, value: v }))
const deliveryModeOpts = deliveryModeOptions.map((v) => ({ label: v, value: v }))
const settlementTypeOpts = settlementTypeOptions.map((v) => ({ label: v, value: v }))
const paymentRatioOpts = paymentRatioOptions.map((v) => ({ label: v, value: v }))
const customerOpts = computed(() =>
  getCustomerOptions().map((c) => ({ label: c.label, value: c.value })),
)
const salespersonOpts = salespersonOptions.map((v) => ({ label: v, value: v }))

const orderPricing = computed(() =>
  calcOrderAmounts(
    {
      lineItems: form.lineItems,
      orderDiscountRate: normalizeDiscountRate(form.orderDiscountRate, 1),
      orderDiscountAmount: form.orderDiscountAmount,
      orderDiscountType: form.orderDiscountType,
      orderDiscountReason: form.orderDiscountReason,
      discountStrategy: form.discountStrategy,
    },
    { taxModeExcluding: taxModeExcluding.value },
  ),
)

const orderAmount = computed(() => orderPricing.value.orderAmount)

const customerDiscountHint = computed(() => {
  const customer = getCustomerByName(form.customerName)
  if (!customer?.defaultDiscountRate || customer.defaultDiscountRate >= 1) return ''
  return `已应用客户默认折扣 ${formatDiscountRatePercent(customer.defaultDiscountRate)}（新加行自动带出，可改）`
})

const showLineDiscount = computed(() => form.discountStrategy !== DISCOUNT_STRATEGIES.ORDER)

const contactOpts = computed(() => {
  const customer = getCustomerOptions().find((c) => c.value === form.customerName)
  return (customer?.contacts || []).map((c) => ({ label: c.name, value: c.name, phone: c.phone }))
})

watch(
  () => form.contractNo,
  () => {
    if (!isActive.value || !form.customerName) return
    repriceLinesForCustomer()
  },
)

watch(
  () => [isActive.value, props.editRecord?.id],
  ([val]) => {
    if (!val) return
    detailCollapsed.value = false
    if (props.editRecord) {
      // 保活切回：同一订单不重复覆盖用户未保存改动
      if (form.orderNo && form.orderNo === props.editRecord.orderNo && form.lineItems.length) {
        return
      }
      const r = props.editRecord
      Object.assign(form, {
        orderNo: r.orderNo,
        urgency: r.urgency,
        contractType: r.contractType,
        contractNo: r.contractNo || '',
        settlementCurrency: r.settlementCurrency,
        orderType: r.orderType,
        customerName: r.customerName,
        contactPerson: r.contactPerson,
        contactPhone: r.contactPhone || '',
        deliveryAddress: r.deliveryAddress || '',
        deliveryMethod: r.deliveryMethod,
        techSpecCode: r.techSpecCode || '',
        reminderDate: r.reminderDate ? dayjs(r.reminderDate) : null,
        salesperson: r.salesperson,
        settlementType: r.settlementType || undefined,
        paymentRatio: r.paymentRatio || undefined,
        downPaymentAmount: r.downPaymentAmount,
        remark: r.remark || '',
        discountStrategy: r.discountStrategy || DISCOUNT_STRATEGIES.LINE,
        orderDiscountType: r.orderDiscountType || 'none',
        orderDiscountRate: normalizeDiscountRate(r.orderDiscountRate, 1),
        orderDiscountPercent: round2(normalizeDiscountRate(r.orderDiscountRate, 1) * 100),
        orderDiscountAmount: r.orderDiscountAmount ?? 0,
        orderDiscountReason: r.orderDiscountReason || '',
        lineItems: JSON.parse(JSON.stringify(r.lineItems || [])).map((line) =>
          normalizeLineItem(line, r.businessType),
        ),
      })
      recalcAll()
      fileList.value = (r.attachments || []).map((file) => ({
        uid: file.uid || file.name,
        name: file.name,
        size: file.size,
        status: 'done',
      }))
      return
    }
    if (form.orderNo || form.lineItems.length) return
    resetForm()
  },
  { immediate: true },
)

function normalizeLineItem(item, orderBusinessType = '自产销售') {
  const line = normalizeSalesLineBusiness(
    {
      ...item,
      salesQty: item.salesQty ?? item.qty ?? 1,
      qty: item.qty ?? item.salesQty ?? 1,
      taxRate: item.taxRate ?? 13,
      issueQty: item.issueQty ?? 0,
      unit: item.unit || '件',
      productAttr: item.productAttr || '',
      deliveryMode: item.deliveryMode || '整机',
      businessType: item.businessType || orderBusinessType || '自产销售',
      lineAttachments: Array.isArray(item.lineAttachments) ? [...item.lineAttachments] : [],
    },
    { businessType: orderBusinessType },
  )
  if (!line.lineAttachments.length && line.attachment) {
    line.lineAttachments = [
      {
        uid: `legacy-${line.id}`,
        name: line.attachment,
        type: '明细附件',
        uploadedAt: '',
      },
    ]
  }
  syncLineAttachmentSummary(line)
  ensureLinePricingFields(line)
  return line
}

function syncLineAttachmentSummary(line) {
  line.attachment = (line.lineAttachments || [])
    .map((file) => file.name)
    .filter(Boolean)
    .join('、')
}

function resetForm() {
  form.orderNo = ''
  form.urgency = '正常'
  form.contractType = '标准合同'
  form.contractNo = ''
  form.settlementCurrency = '人民币'
  form.orderType = '国内订单'
  form.customerName = undefined
  form.contactPerson = undefined
  form.contactPhone = ''
  form.deliveryAddress = ''
  form.deliveryMethod = '送货'
  form.techSpecCode = ''
  form.reminderDate = null
  form.salesperson = 'admin1'
  form.settlementType = undefined
  form.paymentRatio = undefined
  form.downPaymentAmount = null
  form.remark = ''
  form.discountStrategy = DISCOUNT_STRATEGIES.LINE
  form.orderDiscountType = 'none'
  form.orderDiscountPercent = 100
  form.orderDiscountRate = 1
  form.orderDiscountAmount = 0
  form.orderDiscountReason = ''
  form.lineItems = []
  form.orderAmount = 0
  form.totalDiscountAmount = 0
  form.lineDiscountTotal = 0
  form.orderDiscountTotal = 0
  fileList.value = []
  taxModeExcluding.value = false
}

function beforeUpload(file) {
  if (file.size > MAX_FILE_SIZE) {
    message.error('文件大小不能超过 200MB')
    return Upload.LIST_IGNORE
  }
  return false
}

function lineUploadFileList(record) {
  return (record.lineAttachments || []).map((file) => ({
    uid: file.uid,
    name: file.name,
    status: 'done',
  }))
}

function beforeLineUpload(record, file) {
  if (file.size > MAX_FILE_SIZE) {
    message.error('文件大小不能超过 200MB')
    return Upload.LIST_IGNORE
  }
  if (!record.lineAttachments) record.lineAttachments = []
  record.lineAttachments.push({
    uid: file.uid || `line-${Date.now()}-${file.name}`,
    name: file.name,
    size: file.size,
    type: file.type || '',
    uploadedAt: dayjs().format('YYYY-MM-DD HH:mm'),
  })
  syncLineAttachmentSummary(record)
  return false
}

function onLineFileRemove(record, file) {
  record.lineAttachments = (record.lineAttachments || []).filter((item) => item.uid !== file.uid)
  syncLineAttachmentSummary(record)
}

function round2(n) {
  return Math.round((Number(n) || 0) * 100) / 100
}

function recalcLine(record, editMode = 'discount', taxModeOverride) {
  let excluding = taxModeOverride != null ? taxModeOverride : taxModeExcluding.value
  if (taxModeOverride == null && editMode === 'unitPrice') {
    // 仅改含税单价时：按含税口径反算不含税
    excluding = false
  } else if (
    taxModeOverride == null &&
    !(Number(record.unitPriceInTax) > 0) &&
    Number(record.listUnitPriceExTax) > 0
  ) {
    // 从产品价目初始化时，用不含税价生成含税单价
    excluding = true
  }
  recalcSalesLinePricing(record, { taxModeExcluding: excluding, editMode })
}

function recalcAll() {
  syncOrderDiscountRate()
  applyOrderAmounts(form, { taxModeExcluding: taxModeExcluding.value })
}

function syncOrderDiscountRate() {
  form.orderDiscountRate = normalizeDiscountRate(
    (Number(form.orderDiscountPercent) || 100) / 100,
    1,
  )
  form.orderDiscountType =
    form.orderDiscountRate < 1 || form.orderDiscountAmount > 0 ? 'rate' : 'none'
  applyOrderAmounts(form, { taxModeExcluding: taxModeExcluding.value })
}

function getLineDiscountPercent(record) {
  return round2(normalizeDiscountRate(record.lineDiscountRate, 1) * 100)
}

function setLineDiscountPercent(record, percent) {
  record.lineDiscountRate = normalizeDiscountRate((Number(percent) || 100) / 100, 1)
  recalcLine(record)
  recalcAll()
}

function onLineFieldChange(record) {
  recalcLine(record)
  recalcAll()
}

function onUnitPriceExTaxChange(record) {
  recalcLine(record, 'unitPrice', true)
  recalcAll()
}

function onUnitPriceInTaxChange(record) {
  recalcLine(record, 'unitPrice', false)
  recalcAll()
}

function lineDateValue(val) {
  return val ? dayjs(val) : null
}

function onLineDateChange(record, date) {
  record.deliveryDate = date ? date.format('YYYY-MM-DD') : ''
}

function toggleTaxMode() {
  taxModeExcluding.value = !taxModeExcluding.value
  recalcAll()
}

function repriceLinesForCustomer() {
  const customer = getCustomerByName(form.customerName)
  const contract = form.contractNo ? getFrameworkContractByNo(form.contractNo) : null
  form.lineItems.forEach((line) => {
    if (line.isManualLine) return
    const master = line.productId
      ? productInfoState.products.find((p) => p.id === line.productId)
      : null
    const listPrice =
      Number(master?.unitPrice ?? line.listUnitPriceExTax ?? line.unitPriceExTax) || 0
    const pricing = resolveSalesLinePrice({
      customer,
      contract,
      productId: line.productId,
      productCode: line.productCode,
      listPriceFromProduct: listPrice,
    })
    line.listUnitPriceExTax = pricing.listUnitPriceExTax
    line.lineDiscountRate = pricing.lineDiscountRate
    line.priceSource = pricing.priceSource
    recalcLine(line)
  })
  recalcAll()
}

function filterCustomerOption(input, option) {
  const kw = String(input || '')
    .trim()
    .toLowerCase()
  if (!kw) return true
  const label = String(option?.label ?? '').toLowerCase()
  const value = String(option?.value ?? '').toLowerCase()
  return label.includes(kw) || value.includes(kw)
}

function onCustomerChange() {
  form.contactPerson = undefined
  form.contactPhone = ''
  repriceLinesForCustomer()
}

function onContactChange(name) {
  const contact = contactOpts.value.find((c) => c.value === name)
  if (contact?.phone) form.contactPhone = contact.phone
}

function openProductPicker() {
  productPickerOpen.value = true
}

function openVariantConfig(record) {
  if (!isSpuLine(record) || !record.spuId) return
  variantConfigTargetLine.value = record
  variantConfigSpuId.value = record.spuId
  variantConfigInitialValues.value = { ...(record.variantValues || {}) }
  variantConfigOpen.value = true
}

function lineVariantDisplay(record) {
  return lineVariantSummary(record) || record.variantSummary || ''
}

function priceContext() {
  return {
    customerName: form.customerName,
    contractNo: form.contractNo,
  }
}

function onVariantConfigConfirm(payload) {
  const { resolved, variantValues } = payload || {}
  if (!resolved?.sku) {
    message.warning('未匹配到 SKU')
    return
  }

  const target = variantConfigTargetLine.value
  if (!target) {
    message.warning('未找到待配置的明细行')
    return
  }

  const dupSku = form.lineItems.some(
    (line) =>
      line.id !== target.id && line.productCode === resolved.productCode && !line.isManualLine,
  )
  if (dupSku) {
    message.warning(`产品编码「${resolved.productCode}」已在明细中`)
    return
  }

  const result = applySalesLineResolvedConfig(target, resolved, priceContext())
  if (!result.ok) {
    message.warning(result.message || '更新变体失败')
    return
  }
  target.variantValues = { ...(variantValues || resolved.variantValues || {}) }
  target.variantSummary = lineVariantSummary(target)
  recalcLine(target)
  recalcAll()
  message.success('变体已配置')
}

function onSalesProductsSelected(rows) {
  const list = Array.isArray(rows) ? rows : [rows]
  const skuRows = list.filter((r) => r.pickType !== 'spu')
  const spuRows = list.filter((r) => r.pickType === 'spu')

  if (skuRows.length) {
    onProductsSelected(skuRows)
  }
  if (spuRows.length) {
    onSpuDraftSelected(spuRows)
  }
}

function onSpuDraftSelected(rows) {
  let added = 0
  rows.forEach((payload) => {
    const spuId = payload.spuId || payload.id
    if (!spuId) return
    const dup = form.lineItems.some(
      (line) => isSpuLine(line) && line.spuId === spuId && !line.productId,
    )
    if (dup) return

    const draft = createSpuLineDraft(payload)
    const line = createLineItem({
      ...draft,
      businessType: '自产销售',
      deliveryMode: '整机',
      salesQty: 1,
      taxRate: 13,
      bomFulfillmentPath: BOM_FULFILLMENT_PATH.DESIGN_REQUIRED,
    })
    recalcLine(line)
    form.lineItems.push(line)
    added += 1
  })
  recalcAll()
  if (!added) {
    message.info('所选产品族已在明细中（待配置变体），未重复添加')
    return
  }
  message.success(`已添加 ${added} 个产品族，请点击规格型号 / 材质 / 变体属性完成配置`)
}

function resolveMasterRecord(payload) {
  if (payload.itemType === '产品') {
    return productInfoState.products.find((p) => p.id === payload.id) || null
  }
  return materialInfoState.materials.find((m) => m.id === payload.id) || null
}

function mapPickerToSalesLine(payload) {
  const bomItemType = payload.itemType === '产品' ? 'product' : 'material'
  const bom = getOwnActiveBomForItem(bomItemType, payload.id)
  const master = resolveMasterRecord(payload)
  const listPrice = master?.unitPrice ?? payload.unitPrice ?? 0
  const taxRate = master?.outputTaxRate ?? 13
  const customer = getCustomerByName(form.customerName)
  const contract = form.contractNo ? getFrameworkContractByNo(form.contractNo) : null
  const pricing = resolveSalesLinePrice({
    customer,
    contract,
    productId: payload.id,
    productCode: payload.code,
    listPriceFromProduct: listPrice,
  })

  return createLineItem({
    productId: payload.id,
    bomId: bom?.id || '',
    businessType: '自产销售',
    isManualLine: false,
    isSpuLine: false,
    spuId: master?.spuId || payload.spuId || '',
    spuName: master?.spuName || '',
    variantValues: master?.variantValues ? { ...master.variantValues } : {},
    variantSummary: master?.variantSummary || '',
    deliveryMode: '整机',
    productAttr: master?.productAttribute || payload.materialType || '',
    productName: payload.name,
    productCode: payload.code,
    specModel: payload.specModel,
    material: payload.material,
    drawingNo: payload.drawingNo || '',
    techParams: master?.techParams || '',
    matchingRequirements: master?.matchingRequirements || master?.remark || '',
    category: payload.categoryName || master?.categoryName || '',
    unit: payload.inventoryUnit || master?.inventoryUnit || '件',
    bomName: bom?.bomName || '',
    bomVersion: bom?.version || '',
    bomFulfillmentPath: bom
      ? BOM_FULFILLMENT_PATH.USE_CATALOG_BOM
      : BOM_FULFILLMENT_PATH.DESIGN_REQUIRED,
    salesQty: 1,
    taxRate,
    listUnitPriceExTax: pricing.listUnitPriceExTax,
    lineDiscountRate: pricing.lineDiscountRate,
    priceSource: pricing.priceSource,
    unitPriceExTax: 0,
    unitPriceInTax: 0,
  })
}

function onProductsSelected(rows) {
  const noBomProducts = []
  rows.forEach((payload) => {
    const code = payload.code || ''
    if (!code) return
    if (form.lineItems.some((line) => line.productCode === code && !line.isManualLine)) return

    const bomItemType = payload.itemType === '产品' ? 'product' : 'material'
    const bom = getOwnActiveBomForItem(bomItemType, payload.id)
    if (!bom) {
      noBomProducts.push(payload.name)
    }

    const line = mapPickerToSalesLine(payload)
    recalcLine(line)
    form.lineItems.push(line)
  })

  recalcAll()

  if (noBomProducts.length) {
    message.warning(
      `以下产品无自有生效 BOM，已默认「需设计任务」：${noBomProducts.join('、')}。审核后将进入设计；或先为该 SKU 维护并启用产品 BOM。`,
    )
  }
}

function addManualProductLine() {
  const line = createLineItem({
    businessType: '外协销售',
    isManualLine: true,
    deliveryMode: '整机',
    salesQty: 1,
    taxRate: 13,
    unit: '件',
  })
  recalcLine(line)
  form.lineItems.push(line)
  recalcAll()
}

function removeLine(index) {
  form.lineItems.splice(index, 1)
  recalcAll()
}

function cloneLine(index) {
  const src = form.lineItems[index]
  const cloned = createLineItem({ ...JSON.parse(JSON.stringify(src)), id: undefined })
  recalcLine(cloned)
  form.lineItems.push(cloned)
  recalcAll()
}

function openLineEdit(record) {
  lineEditTarget.value = record
  lineEditOpen.value = true
}

function openLongTextEdit(record, fieldKey) {
  longTextEdit.record = record
  longTextEdit.fieldKey = fieldKey
  longTextEdit.title = LONG_TEXT_FIELD_LABELS[fieldKey] || '内容'
  longTextEdit.draft = record[fieldKey] || ''
  longTextEdit.open = true
}

function confirmLongTextEdit() {
  if (longTextEdit.record && longTextEdit.fieldKey) {
    longTextEdit.record[longTextEdit.fieldKey] = longTextEdit.draft || ''
  }
  longTextEdit.open = false
}

function onLineEditSaved(updated) {
  const idx = form.lineItems.findIndex((line) => line.id === updated.id)
  if (idx === -1) return
  Object.assign(form.lineItems[idx], updated)
  recalcAll()
}

function formatMoney(val) {
  return Number(val || 0).toFixed(2)
}

function handleSave() {
  if (!form.customerName) {
    message.warning('请选择客户名称')
    return
  }
  recalcAll()

  const orderNo = form.orderNo?.trim() || generateSalesOrderNo()

  if (!form.lineItems.length) {
    message.warning('请至少添加一条销售明细')
    return
  }

  const skuGuard = validateSalesLinesSkuResolved(form.lineItems)
  if (!skuGuard.ok) {
    message.warning(skuGuard.message)
    return
  }

  const pricing = orderPricing.value
  const payload = {
    ...JSON.parse(JSON.stringify(form)),
    businessType: deriveOrderBusinessType(form.lineItems),
    orderNo,
    reminderDate: form.reminderDate ? form.reminderDate.format('YYYY-MM-DD') : '',
    documentDate: dayjs().format('YYYY-MM-DD'),
    orderSource: '内部新增',
    region: '华北',
    salesChannel: '直销',
    progressStatus: '未审',
    deliveryStatus: '未发货',
    inventoryStatus: '充足',
    totalIssuedQty: 0,
    creator: props.editRecord?.creator || 'admin1',
    createdAt: props.editRecord?.createdAt || dayjs().format('YYYY-MM-DD HH:mm'),
    approver: props.editRecord?.approver || '',
    approvedAt: props.editRecord?.approvedAt || '',
    lineItems: pricing.lineItems,
    lineListAmountExTax: pricing.lineListAmountExTax,
    lineAmountExTax: pricing.lineAmountExTax,
    lineAmountInTax: pricing.lineAmountInTax,
    lineDiscountTotal: pricing.lineDiscountTotal,
    orderDiscountByRate: pricing.orderDiscountByRate,
    orderDiscountTotal: pricing.orderDiscountTotal,
    totalDiscountAmount: pricing.totalDiscountAmount,
    orderAmount: pricing.orderAmount,
    amountExTax: pricing.amountExTax,
    amountInTax: pricing.amountInTax,
    totalQty: pricing.totalQty,
    orderDiscountRate: normalizeDiscountRate(form.orderDiscountRate, 1),
    purchaseRequisitionNo: props.editRecord?.purchaseRequisitionNo || '',
    purchaseRequisitionId: props.editRecord?.purchaseRequisitionId || '',
    attachments: fileList.value.map((file) => ({
      uid: file.uid,
      name: file.name,
      size: file.size,
      type: file.type,
    })),
  }
  delete payload.orderDiscountPercent

  if (props.pageMode) {
    if (isEdit.value) {
      updateSalesOrder(props.editRecord.id, payload)
    } else {
      addSalesOrder({ ...payload, id: `so-${Date.now()}` })
      recalcOrderAmounts(salesOrderState.orders[0])
    }
  } else {
    emit('saved', { isEdit: isEdit.value, id: props.editRecord?.id, data: payload })
  }
  message.success(isEdit.value ? '销售订单已更新' : '销售订单已保存')
  closeAfterSave()
}
</script>

<style lang="less" scoped>
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
    :deep(.ant-form-item-label) {
      flex: 0 0 68px;
    }
  }
}

.discount-hint {
  margin: 4px 0 8px;
  padding: 6px 10px;
  font-size: 12px;
  color: #1677ff;
  background: #e6f4ff;
  border-radius: 4px;
}

.price-summary-card {
  margin-bottom: 8px;
  border: 1px solid #f0f0f0;
  border-radius: 6px;
  overflow: hidden;
  background: #fafafa;

  .price-summary-header {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 8px 12px;
    cursor: pointer;
    user-select: none;

    .section-title {
      font-weight: 600;
      font-size: 14px;
      flex-shrink: 0;
    }

    .header-amounts {
      flex: 1;
      display: flex;
      align-items: center;
      gap: 16px;
      min-width: 0;
      font-size: 12px;
      color: rgba(0, 0, 0, 0.65);

      strong {
        margin-left: 4px;
        font-size: 14px;
        color: rgba(0, 0, 0, 0.88);
      }
    }

    .collapse-icon {
      flex-shrink: 0;
      font-size: 12px;
      color: rgba(0, 0, 0, 0.45);
      transition: transform 0.2s;

      &.rotated {
        transform: rotate(-90deg);
      }
    }
  }

  .price-summary-body {
    padding: 0 12px 8px;
    border-top: 1px solid #f0f0f0;
  }

  .summary-amounts-strip {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 8px 16px;
    padding: 8px 0 6px;
    font-size: 12px;
    color: rgba(0, 0, 0, 0.65);

    .amount-chip {
      white-space: nowrap;

      strong {
        margin-left: 4px;
        font-size: 13px;
        font-weight: 500;
        color: rgba(0, 0, 0, 0.88);
      }

      &.discount strong {
        color: #cf1322;
      }
    }
  }

  .discount-inline-form {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 4px 0;
    margin-bottom: 0;

    :deep(.ant-form-item) {
      margin-bottom: 0;
      margin-right: 12px;
    }

    :deep(.ant-form-item-label > label) {
      font-size: 12px;
      height: 24px;
    }

    :deep(.ant-radio-wrapper) {
      font-size: 12px;
    }

    .discount-reason-item {
      flex: 1;
      min-width: 220px;
    }
  }
}

.detail-section {
  margin-top: 8px;
  border: 1px solid #f0f0f0;
  border-radius: 6px;
  overflow: hidden;

  .detail-section-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 10px 12px;
    background: #fafafa;
    border-bottom: 1px solid #f0f0f0;
    cursor: pointer;
    user-select: none;

    .section-title {
      font-weight: 600;
      font-size: 14px;
    }

    .collapse-icon {
      color: rgba(0, 0, 0, 0.45);
      transition: transform 0.2s;

      &.rotated {
        transform: rotate(-90deg);
      }
    }
  }

  .detail-toolbar {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 10px 12px 8px;
    gap: 8px;

    .tax-toggle-btn {
      color: #1677ff;
      border-color: #91caff;
      background: #e6f4ff;
    }

    .tax-hint {
      font-size: 12px;
      color: rgba(0, 0, 0, 0.45);
    }

    .column-setting-btn {
      color: rgba(0, 0, 0, 0.45);
    }
  }

  :deep(.ant-table-wrapper) {
    padding: 0 12px 12px;
  }

  :deep(.sales-line-table .ant-table-thead > tr > th) {
    padding: 8px !important;
    position: relative;
  }
}

.header-cell {
  display: flex;
  align-items: center;
  justify-content: space-between;
  user-select: none;

  .resize-handle {
    position: absolute;
    right: 0;
    top: 0;
    bottom: 0;
    width: 6px;
    cursor: col-resize;

    &:hover {
      background: rgba(22, 119, 255, 0.25);
    }
  }
}

.column-settings {
  width: 280px;
  max-height: 320px;
  overflow-y: auto;
}

.line-attachment-upload {
  :deep(.ant-upload-list) {
    max-width: 100%;
  }

  :deep(.ant-upload-list-item) {
    margin-top: 4px;
    font-size: 12px;
  }

  .line-upload-btn {
    padding-inline: 0;
    height: auto;
  }
}

.attachment-section {
  margin-top: 8px;
  border: 1px solid #f0f0f0;
  border-radius: 6px;
  overflow: hidden;

  .attachment-section-header {
    padding: 10px 12px 0;

    .section-title {
      font-weight: 600;
      font-size: 14px;
    }
  }

  .section-divider {
    margin: 10px 0 0;
  }
}

.attachment-form {
  padding: 12px;

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

  .upload-field {
    width: 100%;
  }

  .upload-hint {
    margin-top: 6px;
    font-size: 12px;
    color: rgba(0, 0, 0, 0.45);
    line-height: 1.5;
  }

  .readonly-cell {
    font-size: 13px;
    color: rgba(0, 0, 0, 0.65);
  }

  .variant-field-link {
    display: inline-block;
    max-width: 100%;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    color: #1677ff;
    cursor: pointer;

    &:hover {
      color: #4096ff;
    }
  }
}
</style>
