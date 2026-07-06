<template>
  <FormCreateShell
    :page-mode="pageMode"
    :open="open"
    :title="shellTitle"
    width="92%"
    class="material-form-modal"
    @cancel="handleCancel"
    @update:open="(val) => emit('update:open', val)"
  >
    <div class="entity-name-header">
      <div class="entity-name-label">物料名称</div>
      <a-input
        v-model:value="form.name"
        class="entity-name-input"
        placeholder="请输入物料名称"
        allow-clear
      />
      <div class="entity-capability-row">
        <a-checkbox v-model:checked="form.canSell" :disabled="viewOnly">可销售</a-checkbox>
        <a-checkbox v-model:checked="form.canProduce" disabled>可生产</a-checkbox>
        <a-checkbox v-model:checked="form.canPurchase" :disabled="viewOnly">可采购</a-checkbox>
        <a-checkbox v-model:checked="form.canOutsource" :disabled="viewOnly">可外协</a-checkbox>
      </div>
    </div>

    <a-tabs
      v-model:activeKey="activeTabKey"
      type="card"
      class="form-tabs"
      :class="{ 'is-view-only': viewOnly }"
    >
      <a-tab-pane key="basic" tab="基本信息">
        <div class="tab-pane-body">
          <a-form layout="inline" class="horizontal-form">
            <a-row :gutter="[12, 12]" style="width: 100%">
              <a-col :span="8">
                <a-form-item label="物料编号">
                  <a-input
                    v-model:value="form.code"
                    size="small"
                    placeholder="请输入"
                    allow-clear
                  />
                </a-form-item>
              </a-col>
              <a-col :span="8">
                <a-form-item label="条码类型">
                  <a-select v-model:value="form.barcodeType" size="small" :options="barcodeOpts" />
                </a-form-item>
              </a-col>
              <a-col :span="8">
                <a-form-item label="类别" required>
                  <a-select
                    v-model:value="form.categoryKey"
                    size="small"
                    :options="categoryOpts"
                    placeholder="请选择 类别"
                  />
                </a-form-item>
              </a-col>
              <a-col :span="8">
                <a-form-item label="物料类型" required>
                  <a-select
                    v-model:value="form.materialType"
                    size="small"
                    :options="materialTypeOpts"
                    placeholder="请选择 物料类型"
                  />
                </a-form-item>
              </a-col>
              <a-col :span="8">
                <a-form-item label="供应型态" required>
                  <a-select
                    v-model:value="form.supplyForm"
                    size="small"
                    :options="supplyFormOpts"
                    placeholder="请选择 供应型态"
                  />
                </a-form-item>
              </a-col>
              <a-col :span="8">
                <a-form-item label="规格型号" required>
                  <a-input
                    v-model:value="form.specModel"
                    size="small"
                    placeholder="请输入 规格型号"
                  />
                </a-form-item>
              </a-col>
              <a-col :span="8">
                <a-form-item label="图号">
                  <a-input
                    v-model:value="form.drawingNo"
                    size="small"
                    placeholder="请输入 图号"
                    allow-clear
                  />
                </a-form-item>
              </a-col>
              <a-col :span="8">
                <a-form-item label="材质">
                  <a-select
                    v-model:value="form.material"
                    size="small"
                    allow-clear
                    show-search
                    :options="materialGradeOpts"
                    placeholder="请选择 材质"
                    :filter-option="filterMaterialGrade"
                  />
                </a-form-item>
              </a-col>
              <a-col :span="8">
                <a-form-item label="重量">
                  <a-input v-model:value="form.weight" size="small" placeholder="请输入 重量" />
                </a-form-item>
              </a-col>
              <a-col :span="8">
                <a-form-item label="库存单位" required>
                  <a-select
                    v-model:value="form.inventoryUnit"
                    size="small"
                    :options="unitOpts"
                    placeholder="请选择 库存单位"
                  />
                </a-form-item>
              </a-col>
              <a-col :span="24">
                <div class="form-option-row">
                  <div class="form-option-item">
                    <span class="form-option-label">产品物料</span>
                    <a-switch v-model:checked="form.isProductMaterial" :disabled="viewOnly" />
                  </div>
                </div>
              </a-col>
              <template v-if="form.isProductMaterial">
                <a-col :span="24">
                  <div class="form-product-material-section">
                    <div class="section-label">产品物料信息</div>
                    <a-row :gutter="[12, 12]">
                      <a-col :span="8">
                        <a-form-item label="产品属性" required>
                          <a-select
                            v-model:value="form.productAttribute"
                            size="small"
                            :options="productAttrOpts"
                            :disabled="viewOnly"
                            placeholder="请选择 产品属性"
                          />
                        </a-form-item>
                      </a-col>
                      <a-col :span="8">
                        <a-form-item label="产品类别" required>
                          <a-select
                            v-model:value="form.productCategoryKey"
                            size="small"
                            :options="productCategoryOpts"
                            :disabled="viewOnly"
                            placeholder="请选择 产品类别"
                          />
                        </a-form-item>
                      </a-col>
                      <a-col :span="8">
                        <a-form-item label="是否组装件">
                          <a-switch v-model:checked="form.isAssemblyPart" :disabled="viewOnly" />
                        </a-form-item>
                      </a-col>
                    </a-row>
                  </div>
                </a-col>
              </template>
              <a-col :span="24">
                <a-form-item label="技术参数" class="remark-item">
                  <a-textarea
                    v-model:value="form.techParams"
                    :rows="3"
                    size="small"
                    placeholder="请输入技术参数"
                    allow-clear
                  />
                </a-form-item>
              </a-col>
              <a-col :span="24">
                <a-form-item label="配套要求" class="remark-item">
                  <a-textarea
                    v-model:value="form.matchingRequirements"
                    :rows="2"
                    size="small"
                    placeholder="请输入配套要求"
                    :maxlength="200"
                    show-count
                  />
                </a-form-item>
              </a-col>
            </a-row>
          </a-form>
        </div>
      </a-tab-pane>

      <a-tab-pane key="sales" tab="销售">
        <div class="tab-pane-body">
          <a-form layout="inline" class="horizontal-form">
            <a-row :gutter="[12, 12]" style="width: 100%">
              <a-col :span="8">
                <a-form-item label="单价">
                  <a-input-number
                    v-model:value="form.unitPrice"
                    size="small"
                    :min="0"
                    :precision="2"
                    placeholder="请输入单价"
                    style="width: 100%"
                  />
                </a-form-item>
              </a-col>
              <a-col :span="8">
                <a-form-item label="销项税">
                  <a-input-number
                    v-model:value="form.outputTaxRate"
                    size="small"
                    :min="0"
                    :max="100"
                    :precision="2"
                    placeholder="请输入销项税率"
                    style="width: 100%"
                    addon-after="%"
                  />
                </a-form-item>
              </a-col>
            </a-row>
          </a-form>
        </div>
      </a-tab-pane>

      <a-tab-pane key="purchase" tab="采购">
        <div class="tab-pane-body">
          <a-form layout="inline" class="horizontal-form">
            <a-row :gutter="[12, 12]" style="width: 100%">
              <a-col :span="8">
                <a-form-item label="进项税">
                  <a-input-number
                    v-model:value="form.inputTaxRate"
                    size="small"
                    :min="0"
                    :max="100"
                    :precision="2"
                    placeholder="请输入进项税率"
                    style="width: 100%"
                    addon-after="%"
                  />
                </a-form-item>
              </a-col>
              <a-col :span="8">
                <a-form-item label="默认供应商">
                  <a-select
                    v-model:value="form.production.defaultSupplier"
                    size="small"
                    allow-clear
                    show-search
                    :options="supplierOpts"
                    placeholder="请选择供应商"
                  />
                </a-form-item>
              </a-col>
            </a-row>
          </a-form>
        </div>
      </a-tab-pane>

      <a-tab-pane key="production" tab="生产控制">
        <div class="tab-pane-body">
          <a-form layout="inline" class="horizontal-form">
            <a-row :gutter="[12, 12]" style="width: 100%">
              <a-col :span="8">
                <a-form-item label="默认工作中心">
                  <a-select
                    v-model:value="form.production.defaultWorkCenter"
                    size="small"
                    allow-clear
                    :options="workCenterOpts"
                    placeholder="请选择 默认工作中心"
                  />
                </a-form-item>
              </a-col>
              <a-col :span="8">
                <a-form-item label="标准制造周期">
                  <a-input-number
                    v-model:value="form.production.standardCycleDays"
                    size="small"
                    :min="0"
                    placeholder="请输入"
                    style="width: 100%"
                    addon-after="天"
                  />
                </a-form-item>
              </a-col>
              <a-col :span="8">
                <a-form-item>
                  <template #label>
                    <span>领料属性</span>
                    <a-tooltip title="启用后参与领料计划">
                      <InfoCircleOutlined class="info-icon" />
                    </a-tooltip>
                  </template>
                  <a-switch v-model:checked="form.production.requisitionEnabled" />
                </a-form-item>
              </a-col>
              <a-col :span="8">
                <a-form-item label="默认工艺路线">
                  <a-select
                    v-model:value="form.production.defaultProcessRoute"
                    size="small"
                    allow-clear
                    show-search
                    :options="processRouteOpts"
                    placeholder="请选择 工艺路线"
                  />
                </a-form-item>
              </a-col>
              <a-col :span="8">
                <a-form-item label="默认存放仓库">
                  <a-select
                    v-model:value="form.production.defaultWarehouse"
                    size="small"
                    allow-clear
                    :options="warehouseOpts"
                    placeholder="请选择 默认存放仓库"
                  />
                </a-form-item>
              </a-col>
              <a-col :span="8">
                <a-form-item label="关键件标识">
                  <a-switch v-model:checked="form.production.isKeyPart" />
                </a-form-item>
              </a-col>
              <a-col :span="8">
                <a-form-item label="辅料标识">
                  <a-switch v-model:checked="form.production.isAuxiliary" />
                </a-form-item>
              </a-col>
              <a-col :span="8">
                <a-form-item label="危险品标识">
                  <a-switch v-model:checked="form.production.isHazardous" />
                </a-form-item>
              </a-col>
              <a-col :span="8">
                <a-form-item>
                  <template #label>
                    <span>入库质检要求</span>
                    <a-tooltip title="入库时的质检策略">
                      <InfoCircleOutlined class="info-icon" />
                    </a-tooltip>
                  </template>
                  <a-select
                    v-model:value="form.production.inboundQcRequirement"
                    size="small"
                    allow-clear
                    :options="inboundQcOpts"
                    placeholder="请选择"
                  />
                </a-form-item>
              </a-col>
            </a-row>
          </a-form>
        </div>
      </a-tab-pane>

      <a-tab-pane key="labor" tab="工时配置">
        <div class="tab-pane-body">
          <div class="labor-enable-row" :class="{ 'is-only': !form.laborEnabled }">
            <span class="labor-enable-label">启用工时配置</span>
            <a-switch v-model:checked="form.laborEnabled" size="small" :disabled="viewOnly" />
          </div>
          <div v-if="form.laborEnabled" class="labor-block">
            <div v-for="(row, index) in form.laborRows" :key="row.id" class="labor-row-card">
              <a-form layout="inline" class="horizontal-form">
                <a-row :gutter="[12, 12]" style="width: 100%">
                  <a-col :span="8">
                    <a-form-item required>
                      <template #label>
                        <span class="required-label">工序</span>
                      </template>
                      <a-select
                        v-model:value="row.processName"
                        size="small"
                        show-search
                        :options="processOpts"
                        placeholder="请选择工序"
                        style="width: 100%"
                      />
                    </a-form-item>
                  </a-col>
                  <a-col :span="8">
                    <a-form-item required>
                      <template #label>
                        <span>报工类型</span>
                        <a-tooltip
                          title="批量计件：工时=整批准备工时+合格报工数量×单件标准工时；时长报工：工时=准备工时+员工填报总时长（审核后）"
                        >
                          <InfoCircleOutlined class="info-icon" />
                        </a-tooltip>
                      </template>
                      <a-select
                        v-model:value="row.reportType"
                        size="small"
                        :options="reportTypeOpts"
                        placeholder="请选择报工类型"
                        style="width: 100%"
                      />
                    </a-form-item>
                  </a-col>
                  <a-col :span="8">
                    <a-form-item label="单件标准工时" required>
                      <a-input-number
                        v-model:value="row.standardMinutesPerPiece"
                        size="small"
                        :min="0"
                        :precision="0"
                        style="width: 100%"
                        addon-after="分钟"
                      />
                    </a-form-item>
                  </a-col>
                  <a-col :span="8">
                    <a-form-item label="整批准备工时" required>
                      <a-input-number
                        v-model:value="row.setupMinutesPerBatch"
                        size="small"
                        :min="0"
                        :precision="0"
                        style="width: 100%"
                        addon-after="分钟"
                      />
                    </a-form-item>
                  </a-col>
                  <a-col :span="8">
                    <a-form-item required>
                      <template #label>
                        <span>计薪方式</span>
                        <a-tooltip
                          title="计件工资=合格数量×单件计件单价+补贴报工数量；计时工资按标准工时单价核算（详见工时管理）"
                        >
                          <InfoCircleOutlined class="info-icon" />
                        </a-tooltip>
                      </template>
                      <a-select
                        v-model:value="row.salaryMethod"
                        size="small"
                        :options="salaryMethodOpts"
                        placeholder="请选择计薪方式"
                        style="width: 100%"
                      />
                    </a-form-item>
                  </a-col>
                  <a-col :span="8">
                    <a-form-item label="标准工时单价" required>
                      <a-input-number
                        v-model:value="row.standardHourlyRate"
                        size="small"
                        :min="0"
                        :precision="2"
                        style="width: 100%"
                        addon-after="元/小时"
                      />
                    </a-form-item>
                  </a-col>
                  <a-col :span="8">
                    <a-form-item label="单件计件单价" required>
                      <a-input-number
                        v-model:value="row.pieceRate"
                        size="small"
                        :min="0"
                        :precision="2"
                        style="width: 100%"
                        addon-after="元/件"
                      />
                    </a-form-item>
                  </a-col>
                  <a-col
                    v-if="!viewOnly && form.laborRows.length > 1"
                    :span="24"
                    class="row-remove-col"
                  >
                    <a-button type="link" danger size="small" @click="removeLaborRow(index)">
                      删除本行
                    </a-button>
                  </a-col>
                </a-row>
              </a-form>
            </div>
            <a-button
              v-if="!viewOnly"
              type="dashed"
              block
              class="add-labor-row-btn"
              @click="addLaborRow"
            >
              新增一行
            </a-button>
          </div>
        </div>
      </a-tab-pane>

      <a-tab-pane key="alert" tab="预警信息">
        <div class="tab-pane-body">
          <a-form layout="inline" class="horizontal-form">
            <a-row :gutter="[12, 12]" style="width: 100%">
              <a-col :span="8">
                <a-form-item label="库存预警">
                  <a-switch v-model:checked="form.alert.stockAlertEnabled" />
                </a-form-item>
              </a-col>
              <a-col :span="8">
                <a-form-item label="过期预警">
                  <a-switch v-model:checked="form.alert.expiryAlertEnabled" />
                </a-form-item>
              </a-col>
              <a-col :span="8">
                <a-form-item label="不良率预警阈值">
                  <a-input-number
                    v-model:value="form.alert.defectRateThreshold"
                    size="small"
                    :min="0"
                    :max="100"
                    :precision="2"
                    placeholder="请输入"
                    style="width: 100%"
                    addon-after="%"
                  />
                </a-form-item>
              </a-col>
            </a-row>
          </a-form>
        </div>
      </a-tab-pane>

      <a-tab-pane v-if="isEdit" key="bom" tab="BOM信息">
        <ItemBomInfoTab item-type="material" :item-id="editRecord?.id || ''" />
      </a-tab-pane>
    </a-tabs>

    <template #footer>
      <template v-if="viewOnly">
        <a-button type="primary" @click="handleCancel">关闭</a-button>
      </template>
      <template v-else>
        <a-button @click="handleCancel">
          <CloseOutlined />
          取消
        </a-button>
        <a-button type="primary" @click="handleOk">
          <PlusOutlined />
          保存
        </a-button>
      </template>
    </template>
  </FormCreateShell>
</template>

<script setup>
import { computed, reactive, ref, watch } from 'vue'
import { message } from 'ant-design-vue'
import { CloseOutlined, InfoCircleOutlined, PlusOutlined } from '@ant-design/icons-vue'
import FormCreateShell from '@/components/FormCreateShell.vue'
import { useFormCreateModal } from '@/composables/useFormCreateModal'
import { flattenCategoryNodes, materialCategoryTree } from '@/mock/materialCategories'
import { productCategoryTree } from '@/mock/productCategories'
import {
  partProductAttributeOptions,
  normalizePartProductAttribute,
  STANDARD_PART_ATTRIBUTE,
} from '@/mock/productInfoOptions'
import {
  barcodeTypeOptions,
  materialTypeOptions,
  supplyFormOptions,
  inventoryUnitOptions,
  reportTypeOptions,
  salaryMethodOptions,
  inboundQcOptions,
  workCenterOpts,
  processRouteOpts,
  supplierOpts,
  processOpts,
  createDefaultLaborRow,
  createDefaultProductionControl,
  createDefaultAlertConfig,
} from '@/mock/materialInfoOptions'
import { generateMaterialCode, addMaterial, updateMaterial } from '@/store/materialInfoStore'
import { getMaterialGradeOptions, materialGradeState } from '@/store/materialGradeStore'
import { getWarehouseSelectOptions, warehouseState } from '@/store/warehouseStore'
import ItemBomInfoTab from '@/views/product-process/components/ItemBomInfoTab.vue'

const props = defineProps({
  open: { type: Boolean, default: false },
  pageMode: { type: Boolean, default: false },
  listPath: { type: String, default: '' },
  editRecord: { type: Object, default: null },
  viewOnly: { type: Boolean, default: false },
})

const emit = defineEmits(['update:open', 'saved'])

const isEdit = computed(() => Boolean(props.editRecord?.id))

const { isActive, shellTitle, handleCancel, closeAfterSave } = useFormCreateModal(props, emit, {
  listPath: '/product-process/materials',
  getTitle: () => {
    if (props.viewOnly) return '物料详情'
    return isEdit.value ? '编辑物料' : '新增物料'
  },
})

const flatCats = flattenCategoryNodes(materialCategoryTree).filter((c) => !c.children?.length)
const flatProductCats = flattenCategoryNodes(productCategoryTree).filter((c) => !c.children?.length)

const barcodeOpts = barcodeTypeOptions.map((v) => ({ label: v, value: v }))
const materialTypeOpts = materialTypeOptions.map((v) => ({ label: v, value: v }))
const supplyFormOpts = supplyFormOptions.map((v) => ({ label: v, value: v }))
const unitOpts = inventoryUnitOptions.map((v) => ({ label: v, value: v }))
const materialGradeOpts = computed(() => {
  void materialGradeState.items
  return getMaterialGradeOptions()
})
const reportTypeOpts = reportTypeOptions.map((v) => ({ label: v, value: v }))
const salaryMethodOpts = salaryMethodOptions.map((v) => ({ label: v, value: v }))
const inboundQcOpts = inboundQcOptions.map((v) => ({ label: v, value: v }))
const categoryOpts = flatCats.map((c) => ({
  label: `(${c.code}) ${c.title}`,
  value: c.key,
}))
const productAttrOpts = computed(() =>
  partProductAttributeOptions.map((v) => ({ label: v, value: v })),
)
const productCategoryOpts = flatProductCats.map((c) => ({
  label: `(${c.code}) ${c.title}`,
  value: c.key,
}))
const warehouseOpts = computed(() => {
  void warehouseState.warehouses
  return getWarehouseSelectOptions()
})

const activeTabKey = ref('basic')

const form = reactive({
  code: '',
  name: '',
  barcodeType: '一物一码',
  materialType: undefined,
  supplyForm: undefined,
  categoryKey: undefined,
  specModel: '',
  drawingNo: '',
  material: '',
  techParams: '',
  weight: '',
  inventoryUnit: undefined,
  unitPrice: undefined,
  canSell: false,
  canProduce: true,
  canPurchase: false,
  canOutsource: false,
  isProductMaterial: false,
  productAttribute: STANDARD_PART_ATTRIBUTE,
  productCategoryKey: undefined,
  isAssemblyPart: false,
  matchingRequirements: '',
  outputTaxRate: undefined,
  inputTaxRate: undefined,
  laborEnabled: true,
  laborRows: [createDefaultLaborRow()],
  production: createDefaultProductionControl(),
  alert: createDefaultAlertConfig(),
})

function resetForm() {
  form.code = ''
  form.name = ''
  form.barcodeType = '一物一码'
  form.materialType = undefined
  form.supplyForm = undefined
  form.categoryKey = undefined
  form.specModel = ''
  form.drawingNo = ''
  form.material = ''
  form.techParams = ''
  form.weight = ''
  form.inventoryUnit = undefined
  form.unitPrice = undefined
  form.canSell = false
  form.canProduce = true
  form.canPurchase = false
  form.canOutsource = false
  form.isProductMaterial = false
  form.productAttribute = STANDARD_PART_ATTRIBUTE
  form.productCategoryKey = undefined
  form.isAssemblyPart = false
  form.matchingRequirements = ''
  form.outputTaxRate = undefined
  form.inputTaxRate = undefined
  form.laborEnabled = true
  form.laborRows = [createDefaultLaborRow()]
  form.production = createDefaultProductionControl()
  form.alert = createDefaultAlertConfig()
  activeTabKey.value = 'basic'
}

function loadEditRecord(record) {
  const source = JSON.parse(JSON.stringify(record))
  resetForm()
  form.code = source.code
  form.name = source.name
  form.barcodeType = source.barcodeType
  form.materialType = source.materialType
  form.supplyForm = source.supplyForm
  form.categoryKey = source.categoryKey
  form.specModel = source.specModel || ''
  form.drawingNo = source.drawingNo || ''
  form.material = source.material || ''
  form.techParams = source.techParams || ''
  form.weight = source.weight || ''
  form.inventoryUnit = source.inventoryUnit
  form.unitPrice = source.unitPrice
  form.canSell = Boolean(source.canSell || source.isProductMaterial)
  form.canProduce = true
  form.canPurchase = Boolean(source.canPurchase)
  form.canOutsource = Boolean(source.canOutsource)
  form.isProductMaterial = form.canSell
  form.productAttribute = normalizePartProductAttribute(source.productAttribute)
  form.productCategoryKey = source.productCategoryKey
  form.isAssemblyPart = Boolean(source.isAssemblyPart)
  form.matchingRequirements = source.matchingRequirements || source.remark || ''
  form.outputTaxRate = source.outputTaxRate
  form.inputTaxRate = source.inputTaxRate
  form.laborEnabled = source.laborEnabled ?? false
  form.laborRows =
    source.laborRows?.length > 0
      ? JSON.parse(JSON.stringify(source.laborRows))
      : [createDefaultLaborRow()]
  form.production = {
    ...createDefaultProductionControl(),
    ...(source.production || {}),
  }
  form.alert = {
    ...createDefaultAlertConfig(),
    ...(source.alert || {}),
  }
  if (source.requisitionAttr !== undefined && source.requisitionAttr !== '') {
    form.production.requisitionEnabled = Boolean(Number(source.requisitionAttr))
  }
}

function syncFormOnOpen() {
  if (!isActive.value) return
  if (props.editRecord) loadEditRecord(props.editRecord)
  else resetForm()
}

watch(
  () => (isActive.value ? props.editRecord?.id || props.editRecord?.code || '__new__' : ''),
  () => syncFormOnOpen(),
  { immediate: true },
)

watch(
  () => form.laborEnabled,
  (enabled) => {
    if (enabled) activeTabKey.value = 'labor'
  },
)

watch(
  () => form.canProduce,
  (val) => {
    if (!val) form.canProduce = true
  },
)

let syncingMaterialSellPair = false

watch(
  () => form.canSell,
  (val) => {
    if (syncingMaterialSellPair || form.isProductMaterial === val) return
    syncingMaterialSellPair = true
    form.isProductMaterial = val
    syncingMaterialSellPair = false
  },
)

watch(
  () => form.isProductMaterial,
  (val) => {
    if (syncingMaterialSellPair || form.canSell === val) return
    syncingMaterialSellPair = true
    form.canSell = val
    syncingMaterialSellPair = false
    if (val) {
      form.productAttribute = normalizePartProductAttribute(form.productAttribute)
    } else {
      form.isAssemblyPart = false
    }
  },
)

function addLaborRow() {
  form.laborRows.push(createDefaultLaborRow())
}

function removeLaborRow(index) {
  form.laborRows.splice(index, 1)
}

function validate() {
  if (!form.name?.trim()) {
    message.warning('请填写物料名称')
    return false
  }
  if (!form.categoryKey) {
    message.warning('请选择类别')
    return false
  }
  if (!form.materialType) {
    message.warning('请选择物料类型')
    return false
  }
  if (!form.supplyForm) {
    message.warning('请选择供应型态')
    return false
  }
  if (!form.specModel?.trim()) {
    message.warning('请填写规格型号')
    return false
  }
  if (!form.inventoryUnit) {
    message.warning('请选择库存单位')
    return false
  }
  if (form.isProductMaterial) {
    if (!form.productAttribute) {
      message.warning('请选择产品属性')
      return false
    }
    if (!form.productCategoryKey) {
      message.warning('请选择产品类别')
      return false
    }
  }
  if (form.laborEnabled) {
    for (let i = 0; i < form.laborRows.length; i += 1) {
      const row = form.laborRows[i]
      if (!row.processName) {
        message.warning(`请为第 ${i + 1} 行选择工序`)
        return false
      }
      if (!row.reportType) {
        message.warning(`请为第 ${i + 1} 行选择报工类型`)
        return false
      }
      if (!row.salaryMethod) {
        message.warning(`请为第 ${i + 1} 行选择计薪方式`)
        return false
      }
    }
  }
  return true
}

function filterMaterialGrade(input, option) {
  return (option?.label ?? '').toLowerCase().includes(input.toLowerCase())
}

function buildPayload() {
  const cat = flatCats.find((c) => c.key === form.categoryKey)
  const parent = cat?.parentKey
    ? flattenCategoryNodes(materialCategoryTree).find((c) => c.key === cat.parentKey)
    : null

  const code = form.code?.trim() || generateMaterialCode()
  const laborRows = form.laborEnabled ? JSON.parse(JSON.stringify(form.laborRows)) : []

  return {
    code,
    name: form.name.trim(),
    barcodeType: form.barcodeType,
    materialType: form.materialType,
    supplyForm: form.supplyForm,
    categoryKey: form.categoryKey,
    categoryCode: cat?.code || '',
    categoryName: parent ? parent.title : cat?.title || '',
    parentCategoryKey: cat?.parentKey || cat?.key || '',
    specModel: form.specModel,
    drawingNo: form.drawingNo?.trim() || '',
    material: form.material,
    techParams: form.techParams?.trim() || '',
    weight: form.weight,
    inventoryUnit: form.inventoryUnit,
    unitPrice: form.unitPrice ?? 0,
    canSell: form.canSell,
    canProduce: true,
    canPurchase: form.canPurchase,
    canOutsource: form.canOutsource,
    isProductMaterial: form.isProductMaterial,
    productAttribute: form.isProductMaterial ? form.productAttribute : undefined,
    productCategoryKey: form.isProductMaterial ? form.productCategoryKey : undefined,
    isAssemblyPart: form.isProductMaterial ? form.isAssemblyPart : false,
    matchingRequirements: form.matchingRequirements?.trim() || '',
    remark: form.matchingRequirements?.trim() || '',
    outputTaxRate: form.outputTaxRate,
    inputTaxRate: form.inputTaxRate,
    requisitionAttr: form.production.requisitionEnabled ? 1 : 0,
    laborEnabled: form.laborEnabled,
    laborRows,
    production: JSON.parse(JSON.stringify(form.production)),
    alert: JSON.parse(JSON.stringify(form.alert)),
  }
}

function handleOk() {
  if (!validate()) return
  const payload = {
    isEdit: isEdit.value,
    id: props.editRecord?.id,
    data: buildPayload(),
  }
  if (props.pageMode) {
    if (isEdit.value) updateMaterial(payload.id, payload.data)
    else addMaterial(payload.data)
  } else {
    emit('saved', payload)
  }
  message.success(isEdit.value ? '物料已更新' : '物料已保存')
  closeAfterSave()
}
</script>

<style lang="less" scoped>
.material-form-modal {
  :deep(.ant-modal-body) {
    max-height: calc(100vh - 200px);
    overflow-y: auto;
    padding-top: 8px;
  }
}

.entity-name-header {
  margin-bottom: 0;
  padding: 12px 16px 8px;
  background: #fff;
}

.entity-name-label {
  font-size: 12px;
  color: rgba(0, 0, 0, 0.45);
  margin-bottom: 4px;
}

.entity-name-input {
  font-size: 18px;
  font-weight: 600;
  padding: 4px 0;
  border: none;
  box-shadow: none;

  &:focus {
    box-shadow: none;
  }
}

.entity-capability-row {
  display: flex;
  flex-wrap: wrap;
  gap: 8px 24px;
  margin-top: 8px;
  padding-top: 4px;
}

.form-tabs {
  :deep(.ant-tabs-nav) {
    margin-bottom: 0;
    padding: 0 8px;
    background: #f5f5f5;
  }

  :deep(.ant-tabs-tab) {
    padding: 8px 20px;
    background: transparent;
    border: 1px solid transparent;
    border-bottom: none;
  }

  :deep(.ant-tabs-tab-active) {
    background: #fff;
    border-color: #f0f0f0;
  }

  :deep(.ant-tabs-content-holder) {
    background: #fff;
    border: 1px solid #f0f0f0;
    border-top: none;
  }
}

.tab-pane-body {
  padding: 16px;
  min-height: 200px;
}

.form-tabs.is-view-only {
  :deep(.ant-input),
  :deep(.ant-input-number),
  :deep(.ant-select),
  :deep(.ant-switch),
  :deep(.ant-upload),
  :deep(.ant-btn) {
    pointer-events: none;
  }
}

.labor-enable-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 12px;
  padding: 8px 12px;
  background: #fafafa;
  border-radius: 4px;
}

.labor-enable-label {
  font-size: 13px;
  color: rgba(0, 0, 0, 0.88);
}

.labor-enable-row.is-only {
  margin-bottom: 0;
}

.horizontal-form {
  width: 100%;

  :deep(.ant-form-item) {
    width: 100%;
    margin-bottom: 0;
  }

  :deep(.ant-form-item-row) {
    flex-wrap: nowrap;
    align-items: center;
  }

  :deep(.ant-form-item-label) {
    flex: 0 0 84px;
    max-width: 84px;
  }

  :deep(.ant-form-item-label > label) {
    height: 24px;
    line-height: 24px;
    font-size: 13px;
    white-space: nowrap;
  }

  :deep(
    .ant-form-item-label
      > label.ant-form-item-required:not(.ant-form-item-required-mark-optional)::before
  ) {
    margin-inline-end: 4px;
  }

  :deep(.ant-form-item-control) {
    flex: 1;
    min-width: 0;
  }

  .remark-item {
    :deep(.ant-form-item-label) {
      flex: 0 0 96px;
      max-width: 96px;
    }
  }
}

.form-option-row {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 12px 48px;
  min-height: 32px;
  margin-top: 4px;
  padding: 10px 12px;
  background: #fafafa;
  border-radius: 6px;
}

.form-option-item {
  display: inline-flex;
  align-items: center;
  gap: 8px;
}

.form-option-label {
  font-size: 13px;
  color: rgba(0, 0, 0, 0.88);
  white-space: nowrap;
}

.form-product-material-section {
  padding: 12px;
  background: #fafafa;
  border: 1px solid #f0f0f0;
  border-radius: 6px;
}

.section-label {
  margin-bottom: 10px;
  font-size: 13px;
  font-weight: 600;
  color: rgba(0, 0, 0, 0.88);
}

.required-label::before {
  display: inline-block;
  margin-inline-end: 4px;
  color: #ff4d4f;
  font-size: 14px;
  line-height: 1;
  content: '*';
}

.info-icon {
  margin-left: 4px;
  color: #fa8c16;
  font-size: 12px;
}

.labor-row-card {
  border: 1px solid #f0f0f0;
  border-radius: 6px;
  padding: 12px 12px 4px;
  margin-bottom: 12px;
  background: #fafafa;
}

.add-labor-row-btn {
  margin-top: 4px;
  color: #1677ff;
  border-color: #91caff;
}

.row-remove-col {
  text-align: right;
}
</style>
