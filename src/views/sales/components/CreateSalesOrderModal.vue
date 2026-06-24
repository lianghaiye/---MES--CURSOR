<template>
  <a-modal
    :open="open"
    :title="isEdit ? '编辑销售订单' : '新增销售订单'"
    width="96%"
    :mask-closable="false"
    destroy-on-close
    class="create-sales-order-modal"
    @cancel="handleCancel"
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
              placeholder="请选择 客户名称"
              :options="customerOpts"
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
          <a-form-item label="送货方式" required>
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
          locale="{ emptyText: '暂无数据' }"
        >
          <template #bodyCell="{ column, record, index }">
            <template v-if="column.key === 'index'">{{ index + 1 }}</template>

            <template v-else-if="column.key === 'businessType'">
              <a-select
                v-model:value="record.businessType"
                size="small"
                style="width: 100%"
                :options="lineBusinessTypeOpts(record)"
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
              <span v-else>{{ record.specModel || '—' }}</span>
            </template>

            <template v-else-if="column.key === 'material'">
              <a-input v-if="record.isManualLine" v-model:value="record.material" size="small" />
              <span v-else>{{ record.material || '—' }}</span>
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

            <template v-else-if="column.key === 'unitPriceExTax'">
              <a-input-number
                v-model:value="record.unitPriceExTax"
                size="small"
                :min="0"
                :precision="2"
                style="width: 100%"
                :disabled="!taxModeExcluding"
                @change="onLineFieldChange(record)"
              />
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

            <template v-else-if="column.key === 'unitPriceInTax'">
              <a-input-number
                v-model:value="record.unitPriceInTax"
                size="small"
                :min="0"
                :precision="2"
                style="width: 100%"
                :disabled="taxModeExcluding"
                @change="onLineFieldChange(record)"
              />
            </template>

            <template v-else-if="column.key === 'totalPriceExTax'">
              {{ formatMoney(record.totalPriceExTax) }}
            </template>

            <template v-else-if="column.key === 'totalPriceInTax'">
              {{ formatMoney(record.totalPriceInTax) }}
            </template>

            <template v-else-if="column.key === 'techParams'">
              <a-input v-model:value="record.techParams" size="small" />
            </template>

            <template v-else-if="column.key === 'packagingForm'">
              <a-input v-model:value="record.packagingForm" size="small" />
            </template>

            <template v-else-if="column.key === 'supplementDesc'">
              <a-input v-model:value="record.supplementDesc" size="small" />
            </template>

            <template v-else-if="column.key === 'action'">
              <a-space :size="0">
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

    <a-modal
      v-model:open="productPickerOpen"
      title="选择产品"
      width="880px"
      :mask-closable="false"
      @ok="confirmProductPick"
    >
      <a-form layout="inline" class="product-picker-search">
        <a-form-item label="产品类别">
          <a-select
            v-model:value="productPickerFilters.categoryKey"
            allow-clear
            show-search
            option-filter-prop="label"
            placeholder="请选择"
            size="small"
            style="width: 200px"
            :options="productCategoryOpts"
          />
        </a-form-item>
        <a-form-item label="产品编号">
          <a-input
            v-model:value="productPickerFilters.code"
            allow-clear
            size="small"
            placeholder="请输入"
            style="width: 160px"
            @press-enter="applyProductPickerSearch"
          />
        </a-form-item>
        <a-form-item label="产品名称">
          <a-input
            v-model:value="productPickerFilters.name"
            allow-clear
            size="small"
            placeholder="请输入"
            style="width: 160px"
            @press-enter="applyProductPickerSearch"
          />
        </a-form-item>
        <a-form-item>
          <a-space>
            <a-button type="primary" size="small" @click="applyProductPickerSearch">查询</a-button>
            <a-button size="small" @click="resetProductPickerSearch">重置</a-button>
          </a-space>
        </a-form-item>
      </a-form>
      <a-table
        :columns="productPickerColumns"
        :data-source="pagedProductPickerRows"
        row-key="id"
        size="small"
        bordered
        :row-selection="productPickerRowSelection"
        :pagination="productPickerPagination"
        :scroll="{ y: 360 }"
      />
    </a-modal>

    <template #footer>
      <a-button @click="handleCancel">取消</a-button>
      <a-button type="primary" @click="handleSave">保存</a-button>
    </template>
  </a-modal>
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
  customerOptions,
  salespersonOptions,
} from '@/mock/salesOrderOptions'
import { createLineItem } from '@/mock/salesOrders'
import { filterProducts } from '@/mock/productInfo'
import { productCategoryTree, flattenCategoryNodes } from '@/mock/productCategories'
import { productInfoState } from '@/store/productInfoStore'
import { getActiveBomForItem } from '@/store/productBomStore'
import { generateSalesOrderNo } from '@/store/salesOrderStore'
import { deriveOrderBusinessType, normalizeSalesLineBusiness } from '@/utils/salesOrderBusiness'

const props = defineProps({
  open: { type: Boolean, default: false },
  editRecord: { type: Object, default: null },
})

const emit = defineEmits(['update:open', 'saved'])

const isEdit = computed(() => Boolean(props.editRecord?.id))
const taxModeExcluding = ref(true)
const detailCollapsed = ref(false)
const productPickerOpen = ref(false)
const pickedProductKeys = ref([])
const fileList = ref([])

const productPickerFilters = reactive({
  categoryKey: undefined,
  code: '',
  name: '',
})
const appliedProductPickerFilters = ref({
  categoryKey: undefined,
  code: '',
  name: '',
})
const productPickerPage = reactive({
  current: 1,
  pageSize: 10,
})

const flatProductCats = flattenCategoryNodes(productCategoryTree)
const leafProductCats = flatProductCats.filter((c) => !c.children?.length)
const productCategoryOpts = leafProductCats.map((c) => ({
  label: `(${c.code}) ${c.title}`,
  value: c.key,
}))

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
  { key: 'businessType', title: '业务类型', width: 100 },
  { key: 'productAttr', title: '产品属性', dataIndex: 'productAttr', width: 90 },
  { key: 'specAttr', title: '规格属性', dataIndex: 'specAttr', width: 90 },
  { key: 'specModel', title: '规格型号', dataIndex: 'specModel', width: 100 },
  { key: 'material', title: '材质', dataIndex: 'material', width: 80 },
  { key: 'salesQty', title: '销售数量', width: 90 },
  { key: 'deliveryMode', title: '交付方式', width: 100 },
  { key: 'deliveryDate', title: '交货日期', width: 120 },
  { key: 'unit', title: '单位', width: 70 },
  { key: 'bomName', title: 'Bom名称', dataIndex: 'bomName', width: 100, ellipsis: true },
  { key: 'bomVersion', title: 'Bom版本', dataIndex: 'bomVersion', width: 90 },
  { key: 'unitPriceExTax', title: '不含税单价', width: 100 },
  { key: 'taxRate', title: '税率(%)', width: 80 },
  { key: 'unitPriceInTax', title: '含税单价', width: 100 },
  { key: 'totalPriceExTax', title: '总价（不含税）', width: 110 },
  { key: 'totalPriceInTax', title: '总价（含税）', width: 100 },
  { key: 'techParams', title: '技术参数', width: 100 },
  { key: 'packagingForm', title: '包装形式', width: 90 },
  { key: 'supplementDesc', title: '补充说明', width: 90 },
  { key: 'action', title: '操作', width: 110, fixed: 'right' },
]

const visibleColumnKeys = ref(columnDefs.map((c) => c.key))

const allProductPickerRows = computed(() =>
  productInfoState.products.map((p) => ({
    id: p.id,
    code: p.code,
    name: p.name,
    productAttr: p.productAttribute,
    specModel: p.specModel,
    material: p.material,
    unit: p.inventoryUnit,
    unitPrice: p.unitPrice,
    categoryName: p.categoryName,
    categoryKey: p.categoryKey,
  })),
)

const filteredProductPickerRows = computed(() => {
  const f = appliedProductPickerFilters.value
  const ids = new Set(filterProducts(productInfoState.products, f, null).map((p) => p.id))
  return allProductPickerRows.value.filter((row) => ids.has(row.id))
})

const pagedProductPickerRows = computed(() => {
  const list = filteredProductPickerRows.value
  const start = (productPickerPage.current - 1) * productPickerPage.pageSize
  return list.slice(start, start + productPickerPage.pageSize)
})

const productPickerPagination = computed(() => ({
  current: productPickerPage.current,
  pageSize: productPickerPage.pageSize,
  total: filteredProductPickerRows.value.length,
  showSizeChanger: true,
  showTotal: (total) => `共 ${total} 条`,
  pageSizeOptions: ['10', '20', '50'],
  onChange: (page, pageSize) => {
    productPickerPage.current = page
    productPickerPage.pageSize = pageSize
  },
}))

watch(filteredProductPickerRows, (list) => {
  const maxPage = Math.max(1, Math.ceil(list.length / productPickerPage.pageSize) || 1)
  if (productPickerPage.current > maxPage) productPickerPage.current = 1
})

const productPickerRowSelection = computed(() => ({
  type: 'checkbox',
  selectedRowKeys: pickedProductKeys.value,
  preserveSelectedRowKeys: true,
  onChange: (keys) => {
    pickedProductKeys.value = keys
  },
}))

const productPickerColumns = [
  { title: '产品编码', dataIndex: 'code', width: 130, ellipsis: true },
  { title: '产品名称', dataIndex: 'name', width: 180, ellipsis: true },
  { title: '产品类别', dataIndex: 'categoryName', width: 100, ellipsis: true },
  { title: '产品属性', dataIndex: 'productAttr', width: 96 },
  { title: '规格型号', dataIndex: 'specModel', width: 100, ellipsis: true },
]

const displayColumns = computed(() =>
  columnDefs
    .filter((c) => visibleColumnKeys.value.includes(c.key))
    .map((c) => ({
      title: c.title,
      key: c.key,
      dataIndex: c.dataIndex,
      width: c.width,
      ellipsis: c.ellipsis,
      align: c.key === 'index' ? 'center' : undefined,
      fixed: c.fixed,
    })),
)

watch(visibleColumnKeys, (keys) => {
  const required = fixedColumnKeys.filter((k) => k !== 'action')
  const missing = required.filter((k) => !keys.includes(k))
  if (missing.length) {
    visibleColumnKeys.value = [...new Set([...keys, ...required])]
  }
})

const tableScrollX = computed(() =>
  displayColumns.value.reduce((sum, c) => sum + (c.width || 100), 0),
)

const taxModeHint = computed(() =>
  taxModeExcluding.value
    ? '当前：按不含税单价算含税（请填不含税单价，含税单价自动计算且不可编辑）'
    : '当前：按含税单价算不含税（请填含税单价，不含税单价自动计算且不可编辑）',
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
  deliveryMethod: '物流',
  techSpecCode: '',
  reminderDate: null,
  salesperson: 'admin1',
  settlementType: undefined,
  paymentRatio: undefined,
  downPaymentAmount: null,
  remark: '',
  lineItems: [],
})

const catalogBusinessTypeOpts = ['自产销售', '外购销售'].map((v) => ({ label: v, value: v }))
const manualBusinessTypeOpts = ['外协销售', '质检服务'].map((v) => ({ label: v, value: v }))

function lineBusinessTypeOpts(record) {
  return record.isManualLine ? manualBusinessTypeOpts : catalogBusinessTypeOpts
}

const urgencyOpts = urgencyOptions.map((v) => ({ label: v, value: v }))
const contractTypeOpts = contractTypeOptions.map((v) => ({ label: v, value: v }))
const currencyOpts = settlementCurrencyOptions.map((v) => ({ label: v, value: v }))
const orderTypeOpts = orderTypeOptions.map((v) => ({ label: v, value: v }))
const deliveryMethodOpts = deliveryMethodOptions.map((v) => ({ label: v, value: v }))
const deliveryModeOpts = deliveryModeOptions.map((v) => ({ label: v, value: v }))
const settlementTypeOpts = settlementTypeOptions.map((v) => ({ label: v, value: v }))
const paymentRatioOpts = paymentRatioOptions.map((v) => ({ label: v, value: v }))
const customerOpts = customerOptions.map((c) => ({ label: c.label, value: c.value }))
const salespersonOpts = salespersonOptions.map((v) => ({ label: v, value: v }))

const contactOpts = computed(() => {
  const customer = customerOptions.find((c) => c.value === form.customerName)
  return (customer?.contacts || []).map((c) => ({ label: c.name, value: c.name, phone: c.phone }))
})

const orderAmount = computed(() =>
  form.lineItems.reduce((s, i) => s + (Number(i.totalPriceInTax) || 0), 0),
)

watch(
  () => props.open,
  (val) => {
    if (!val) return
    detailCollapsed.value = false
    if (props.editRecord) {
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
        lineItems: JSON.parse(JSON.stringify(r.lineItems || [])).map((line) =>
          normalizeLineItem(line, r.businessType),
        ),
      })
      form.lineItems.forEach(recalcLine)
      fileList.value = (r.attachments || []).map((file) => ({
        uid: file.uid || file.name,
        name: file.name,
        size: file.size,
        status: 'done',
      }))
      return
    }
    resetForm()
  },
)

function normalizeLineItem(item, orderBusinessType = '自产销售') {
  return normalizeSalesLineBusiness(
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
    },
    { businessType: orderBusinessType },
  )
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
  form.deliveryMethod = '物流'
  form.techSpecCode = ''
  form.reminderDate = null
  form.salesperson = 'admin1'
  form.settlementType = undefined
  form.paymentRatio = undefined
  form.downPaymentAmount = null
  form.remark = ''
  form.lineItems = []
  fileList.value = []
  taxModeExcluding.value = true
}

function beforeUpload(file) {
  if (file.size > MAX_FILE_SIZE) {
    message.error('文件大小不能超过 200MB')
    return Upload.LIST_IGNORE
  }
  return false
}

function round2(n) {
  return Math.round((Number(n) || 0) * 100) / 100
}

function recalcLine(record) {
  const qty = Number(record.salesQty) || 0
  const rate = Number(record.taxRate) || 0
  record.qty = qty

  if (taxModeExcluding.value) {
    const ex = Number(record.unitPriceExTax) || 0
    record.unitPriceInTax = round2(ex * (1 + rate / 100))
  } else {
    const inc = Number(record.unitPriceInTax) || 0
    record.unitPriceExTax = round2(inc / (1 + rate / 100))
  }

  record.totalPriceExTax = round2(qty * (Number(record.unitPriceExTax) || 0))
  record.totalPriceInTax = round2(qty * (Number(record.unitPriceInTax) || 0))
}

function onLineFieldChange(record) {
  recalcLine(record)
}

function lineDateValue(val) {
  return val ? dayjs(val) : null
}

function onLineDateChange(record, date) {
  record.deliveryDate = date ? date.format('YYYY-MM-DD') : ''
}

function toggleTaxMode() {
  taxModeExcluding.value = !taxModeExcluding.value
  form.lineItems.forEach(recalcLine)
}

function onCustomerChange() {
  form.contactPerson = undefined
  form.contactPhone = ''
}

function onContactChange(name) {
  const contact = contactOpts.value.find((c) => c.value === name)
  if (contact?.phone) form.contactPhone = contact.phone
}

function resetProductPickerSearch() {
  productPickerFilters.categoryKey = undefined
  productPickerFilters.code = ''
  productPickerFilters.name = ''
  appliedProductPickerFilters.value = {
    categoryKey: undefined,
    code: '',
    name: '',
  }
  productPickerPage.current = 1
}

function applyProductPickerSearch() {
  appliedProductPickerFilters.value = {
    categoryKey: productPickerFilters.categoryKey,
    code: (productPickerFilters.code || '').trim(),
    name: (productPickerFilters.name || '').trim(),
  }
  productPickerPage.current = 1
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
}

function openProductPicker() {
  pickedProductKeys.value = []
  resetProductPickerSearch()
  productPickerOpen.value = true
}

function confirmProductPick() {
  const noBomProducts = []
  pickedProductKeys.value.forEach((productId) => {
    const p = productInfoState.products.find((m) => m.id === productId)
    if (!p) return
    const bom = getActiveBomForItem('product', p.id)
    if (!bom) {
      noBomProducts.push(p.name)
    }
    const line = createLineItem({
      productId: p.id,
      bomId: bom?.id || '',
      businessType: '自产销售',
      isManualLine: false,
      deliveryMode: '整机',
      productAttr: p.productAttribute,
      productName: p.name,
      productCode: p.code,
      specAttr: p.standardSpec || '',
      specModel: p.specModel,
      material: p.material,
      category: p.categoryName,
      unit: p.inventoryUnit || '件',
      bomName: bom?.bomName || '',
      bomVersion: bom?.version || '',
      salesQty: 1,
      taxRate: 13,
      unitPriceExTax: Number(p.unitPrice) || 0,
      unitPriceInTax: 0,
    })
    recalcLine(line)
    form.lineItems.push(line)
  })
  if (noBomProducts.length) {
    message.warning(
      `以下产品无使用中的 BOM，已添加至明细：${noBomProducts.join('、')}。请尽快在产品 BOM 中维护并启用，审核前需完成 BOM 配置。`,
    )
  }
  productPickerOpen.value = false
}

function removeLine(index) {
  form.lineItems.splice(index, 1)
}

function cloneLine(index) {
  const src = form.lineItems[index]
  const cloned = createLineItem({ ...JSON.parse(JSON.stringify(src)), id: undefined })
  recalcLine(cloned)
  form.lineItems.push(cloned)
}

function formatMoney(val) {
  return Number(val || 0).toFixed(2)
}

function handleCancel() {
  emit('update:open', false)
}

function handleSave() {
  if (!form.customerName) {
    message.warning('请选择客户名称')
    return
  }
  form.lineItems.forEach(recalcLine)

  const orderNo = form.orderNo?.trim() || generateSalesOrderNo()

  if (!form.lineItems.length) {
    message.warning('请至少添加一条销售明细')
    return
  }

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
    orderAmount: orderAmount.value,
    amountExTax: form.lineItems.reduce((s, i) => s + (Number(i.totalPriceExTax) || 0), 0),
    amountInTax: orderAmount.value,
    totalQty: form.lineItems.reduce((s, i) => s + (Number(i.salesQty) || 0), 0),
    purchaseRequisitionNo: props.editRecord?.purchaseRequisitionNo || '',
    purchaseRequisitionId: props.editRecord?.purchaseRequisitionId || '',
    attachments: fileList.value.map((file) => ({
      uid: file.uid,
      name: file.name,
      size: file.size,
      type: file.type,
    })),
  }

  emit('saved', { isEdit: isEdit.value, id: props.editRecord?.id, data: payload })
  message.success(isEdit.value ? '销售订单已更新' : '销售订单已保存')
  emit('update:open', false)
}
</script>

<style lang="less" scoped>
.product-picker-search {
  margin-bottom: 12px;
  padding-bottom: 12px;
  border-bottom: 1px solid #f0f0f0;

  :deep(.ant-form-item) {
    margin-bottom: 8px;
    margin-inline-end: 12px;
  }

  :deep(.ant-form-item-label > label) {
    font-size: 13px;
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
    :deep(.ant-form-item-label) {
      flex: 0 0 68px;
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
}

.column-settings {
  width: 280px;
  max-height: 320px;
  overflow-y: auto;
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
}
</style>
