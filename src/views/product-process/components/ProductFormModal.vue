<template>
  <a-modal
    v-model:open="openModel"
    :title="modalTitle"
    width="92%"
    :mask-closable="false"
    class="product-form-modal"
    @cancel="handleCancel"
  >
    <a-collapse
      v-model:activeKey="collapseKeys"
      :bordered="false"
      class="form-sections"
      :class="{ 'is-view-only': viewOnly }"
    >
      <a-collapse-panel key="basic" header="基础信息">
        <a-form layout="inline" class="horizontal-form">
          <a-row :gutter="[12, 12]" style="width: 100%">
            <a-col :span="8">
              <a-form-item label="产品编码">
                <a-input v-model:value="form.code" size="small" placeholder="请输入" allow-clear />
              </a-form-item>
            </a-col>
            <a-col :span="8">
              <a-form-item label="产品名称" required>
                <a-input v-model:value="form.name" size="small" placeholder="请输入" />
              </a-form-item>
            </a-col>
            <a-col :span="8">
              <a-form-item label="条码类型" required>
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
              <a-form-item label="产品属性" required>
                <a-select
                  v-model:value="form.productAttribute"
                  size="small"
                  :options="productAttrOpts"
                  placeholder="请选择 产品属性"
                />
              </a-form-item>
            </a-col>
            <a-col :span="8">
              <a-form-item label="型号规格" required>
                <a-input
                  v-model:value="form.specModel"
                  size="small"
                  placeholder="请输入 型号规格"
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
            <a-col :span="8">
              <a-form-item label="单价">
                <a-input-number
                  v-model:value="form.unitPrice"
                  size="small"
                  :min="0"
                  :precision="2"
                  placeholder="请输入 单价"
                  style="width: 100%"
                />
              </a-form-item>
            </a-col>
            <a-col :span="8">
              <a-form-item label="标准规范">
                <a-select
                  v-model:value="form.standardSpec"
                  size="small"
                  allow-clear
                  :options="standardSpecOpts"
                  placeholder="请选择 标准规范"
                />
              </a-form-item>
            </a-col>
            <a-col :span="8">
              <a-form-item label="产品物料">
                <a-switch v-model:checked="form.isProductMaterial" />
              </a-form-item>
            </a-col>
            <template v-if="form.isProductMaterial">
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
                <a-form-item label="物料类别" required>
                  <a-select
                    v-model:value="form.materialCategoryKey"
                    size="small"
                    :options="materialCategoryOpts"
                    placeholder="请选择 物料类别"
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
            </template>
            <a-col :span="24">
              <a-form-item label="备注" class="remark-item">
                <a-textarea
                  v-model:value="form.remark"
                  :rows="2"
                  size="small"
                  placeholder="请输入"
                  :maxlength="200"
                  show-count
                />
              </a-form-item>
            </a-col>
          </a-row>
        </a-form>
      </a-collapse-panel>

      <a-collapse-panel key="labor" header="工时配置">
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
                    <template #label><span class="required-label">工序</span></template>
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
                  <a-form-item label="单件标准工时" required>
                    <a-input-number
                      v-model:value="row.standardMinutesPerPiece"
                      size="small"
                      :min="0"
                      style="width: 100%"
                      addon-after="分钟"
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
                  <a-form-item label="整批准备工时" required>
                    <a-input-number
                      v-model:value="row.setupMinutesPerBatch"
                      size="small"
                      :min="0"
                      style="width: 100%"
                      addon-after="分钟"
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
      </a-collapse-panel>

      <a-collapse-panel key="production" header="生产控制">
        <a-form layout="inline" class="horizontal-form">
          <a-row :gutter="[12, 12]" style="width: 100%">
            <a-col :span="8">
              <a-form-item label="默认工作中心" required>
                <a-select
                  v-model:value="form.production.defaultWorkCenter"
                  size="small"
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
              <a-form-item label="默认供应商">
                <a-select
                  v-model:value="form.production.defaultSupplier"
                  size="small"
                  allow-clear
                  show-search
                  :options="supplierOpts"
                  placeholder="请选择 供应商"
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
          </a-row>
        </a-form>
      </a-collapse-panel>

      <a-collapse-panel key="alert" header="预警信息">
        <a-form layout="inline" class="horizontal-form">
          <a-row :gutter="[12, 12]" style="width: 100%">
            <a-col :span="8">
              <a-form-item label="库存预警" required>
                <a-switch v-model:checked="form.alert.stockAlertEnabled" />
              </a-form-item>
            </a-col>
            <a-col :span="8">
              <a-form-item label="过期预警" required>
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
            <a-col :span="24">
              <a-form-item label="产品资料" class="remark-item">
                <a-upload
                  v-model:file-list="fileList"
                  list-type="picture-card"
                  :disabled="viewOnly"
                  :show-upload-list="{ showRemoveIcon: !viewOnly }"
                  :before-upload="beforeUpload"
                  @remove="onRemoveFile"
                >
                  <div v-if="!viewOnly && fileList.length < 8">
                    <PlusOutlined />
                    <div class="upload-text">上传</div>
                  </div>
                </a-upload>
                <div class="upload-hint">
                  可上传图片（jpg/png/jpeg）、视频（mp4/mov）、Excel、Word 文件
                </div>
              </a-form-item>
            </a-col>
          </a-row>
        </a-form>
      </a-collapse-panel>
    </a-collapse>

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
  </a-modal>
</template>

<script setup>
import { computed, reactive, ref, watch } from 'vue'
import { message } from 'ant-design-vue'
import { CloseOutlined, InfoCircleOutlined, PlusOutlined } from '@ant-design/icons-vue'
import { flattenCategoryNodes, productCategoryTree } from '@/mock/productCategories'
import {
  flattenCategoryNodes as flattenMatCats,
  materialCategoryTree,
} from '@/mock/materialCategories'
import {
  barcodeTypeOptions,
  materialTypeOptions,
  supplyFormOptions,
  inventoryUnitOptions,
  reportTypeOptions,
  salaryMethodOptions,
  workCenterOpts,
  processRouteOpts,
  supplierOpts,
  processOpts,
  createDefaultLaborRow,
  productAttributeOptions,
  standardSpecOptions,
  createDefaultProductProduction,
  createDefaultProductAlert,
} from '@/mock/productInfoOptions'
import { getMaterialGradeOptions, materialGradeState } from '@/store/materialGradeStore'
import { generateProductCode } from '@/store/productInfoStore'
import { getWarehouseSelectOptions, warehouseState } from '@/store/warehouseStore'

const props = defineProps({
  open: { type: Boolean, default: false },
  editRecord: { type: Object, default: null },
  viewOnly: { type: Boolean, default: false },
})

const emit = defineEmits(['update:open', 'saved'])

const openModel = computed({
  get: () => props.open,
  set: (val) => emit('update:open', val),
})

const flatCats = flattenCategoryNodes(productCategoryTree).filter((c) => !c.children?.length)
const flatMatCats = flattenMatCats(materialCategoryTree).filter((c) => !c.children?.length)

const barcodeOpts = barcodeTypeOptions.map((v) => ({ label: v, value: v }))
const materialTypeOpts = materialTypeOptions.map((v) => ({ label: v, value: v }))
const supplyFormOpts = supplyFormOptions.map((v) => ({ label: v, value: v }))
const materialCategoryOpts = flatMatCats.map((c) => ({
  label: `(${c.code}) ${c.title}`,
  value: c.key,
}))
const unitOpts = inventoryUnitOptions.map((v) => ({ label: v, value: v }))
const productAttrOpts = productAttributeOptions.map((v) => ({ label: v, value: v }))
const standardSpecOpts = standardSpecOptions.map((v) => ({ label: v, value: v }))
const materialGradeOpts = computed(() => {
  void materialGradeState.items
  return getMaterialGradeOptions()
})
const reportTypeOpts = reportTypeOptions.map((v) => ({ label: v, value: v }))
const salaryMethodOpts = salaryMethodOptions.map((v) => ({ label: v, value: v }))
const categoryOpts = flatCats.map((c) => ({
  label: `(${c.code}) ${c.title}`,
  value: c.key,
}))
const warehouseOpts = computed(() => {
  void warehouseState.warehouses
  return getWarehouseSelectOptions()
})

const collapseKeys = ref(['basic', 'labor', 'production', 'alert'])
const fileList = ref([])
const isEdit = computed(() => Boolean(props.editRecord?.id))
const modalTitle = computed(() => {
  if (props.viewOnly) return '产品详情'
  return isEdit.value ? '编辑产品' : '新增产品'
})

const form = reactive({
  code: '',
  name: '',
  barcodeType: '一物一码',
  productAttribute: '标准产品',
  categoryKey: undefined,
  specModel: '',
  material: '',
  weight: '',
  inventoryUnit: undefined,
  unitPrice: undefined,
  standardSpec: undefined,
  isProductMaterial: true,
  materialType: '零部件',
  materialCategoryKey: undefined,
  supplyForm: '自制件',
  remark: '',
  laborEnabled: true,
  laborRows: [createDefaultLaborRow()],
  production: createDefaultProductProduction(),
  alert: createDefaultProductAlert(),
})

function resetForm() {
  form.code = ''
  form.name = ''
  form.barcodeType = '一物一码'
  form.productAttribute = '标准产品'
  form.categoryKey = undefined
  form.specModel = ''
  form.material = ''
  form.weight = ''
  form.inventoryUnit = undefined
  form.unitPrice = undefined
  form.standardSpec = undefined
  form.isProductMaterial = true
  form.materialType = '零部件'
  form.materialCategoryKey = undefined
  form.supplyForm = '自制件'
  form.remark = ''
  form.laborEnabled = true
  form.laborRows = [createDefaultLaborRow()]
  form.production = createDefaultProductProduction()
  form.alert = createDefaultProductAlert()
  fileList.value = []
  collapseKeys.value = ['basic', 'labor', 'production', 'alert']
}

function cloneRecord(record) {
  try {
    return JSON.parse(JSON.stringify(record))
  } catch {
    return { ...record }
  }
}

function loadEditRecord(record) {
  if (!record) return
  const source = cloneRecord(record)
  resetForm()
  Object.assign(form, {
    code: source.code,
    name: source.name,
    barcodeType: source.barcodeType,
    productAttribute: source.productAttribute,
    categoryKey: source.categoryKey,
    specModel: source.specModel || '',
    material: source.material || '',
    weight: source.weight ?? '',
    inventoryUnit: source.inventoryUnit,
    unitPrice: source.unitPrice,
    standardSpec: source.standardSpec,
    isProductMaterial: source.isProductMaterial !== false,
    materialType: source.materialType || '零部件',
    materialCategoryKey: source.materialCategoryKey,
    supplyForm: source.supplyForm || '自制件',
    remark: source.remark || '',
    laborEnabled: source.laborEnabled ?? false,
  })
  form.laborRows =
    source.laborRows?.length > 0
      ? JSON.parse(JSON.stringify(source.laborRows))
      : [createDefaultLaborRow()]
  form.production = { ...createDefaultProductProduction(), ...(source.production || {}) }
  form.alert = { ...createDefaultProductAlert(), ...(source.alert || {}) }
  fileList.value = (source.alert?.attachments || []).map((f, i) => ({
    uid: f.uid || String(i),
    name: f.name,
    status: 'done',
  }))
}

function syncFormOnOpen() {
  if (!props.open) return
  if (props.editRecord) loadEditRecord(props.editRecord)
  else resetForm()
}

watch(
  () => [props.open, props.editRecord?.id, props.editRecord?.code],
  () => syncFormOnOpen(),
  { immediate: true },
)

watch(
  () => form.laborEnabled,
  (enabled) => {
    if (enabled && !collapseKeys.value.includes('labor')) {
      collapseKeys.value = [...collapseKeys.value, 'labor']
    }
  },
)

function addLaborRow() {
  form.laborRows.push(createDefaultLaborRow())
}

function removeLaborRow(index) {
  form.laborRows.splice(index, 1)
}

function beforeUpload(file) {
  fileList.value = [
    ...fileList.value,
    { uid: file.uid, name: file.name, status: 'done', originFileObj: file },
  ]
  return false
}

function onRemoveFile(file) {
  fileList.value = fileList.value.filter((f) => f.uid !== file.uid)
}

function validate() {
  if (!form.name?.trim()) {
    message.warning('请填写产品名称')
    return false
  }
  if (!form.categoryKey) {
    message.warning('请选择类别')
    return false
  }
  if (!form.productAttribute) {
    message.warning('请选择产品属性')
    return false
  }
  if (!form.specModel?.trim()) {
    message.warning('请填写型号规格')
    return false
  }
  if (!form.inventoryUnit) {
    message.warning('请选择库存单位')
    return false
  }
  if (form.isProductMaterial) {
    if (!form.materialType) {
      message.warning('请选择物料类型')
      return false
    }
    if (!form.materialCategoryKey) {
      message.warning('请选择物料类别')
      return false
    }
    if (!form.supplyForm) {
      message.warning('请选择供应型态')
      return false
    }
  }
  if (!form.production.defaultWorkCenter) {
    message.warning('请选择默认工作中心')
    return false
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
    ? flattenCategoryNodes(productCategoryTree).find((c) => c.key === cat.parentKey)
    : null

  return {
    code: form.code?.trim() || generateProductCode(),
    name: form.name.trim(),
    barcodeType: form.barcodeType,
    productAttribute: form.productAttribute,
    categoryKey: form.categoryKey,
    categoryCode: cat?.code || '',
    categoryName: parent ? parent.title : cat?.title || '',
    parentCategoryKey: cat?.parentKey || cat?.key || '',
    specModel: form.specModel,
    material: form.material,
    weight: Number(form.weight) || 0,
    inventoryUnit: form.inventoryUnit,
    standardSpec: form.standardSpec || '',
    unitPrice: form.unitPrice ?? 0,
    isProductMaterial: form.isProductMaterial,
    materialType: form.isProductMaterial ? form.materialType : undefined,
    materialCategoryKey: form.isProductMaterial ? form.materialCategoryKey : undefined,
    supplyForm: form.isProductMaterial ? form.supplyForm : undefined,
    remark: form.remark,
    expiryAlertEnabled: form.alert.expiryAlertEnabled,
    laborEnabled: form.laborEnabled,
    laborRows: form.laborEnabled ? JSON.parse(JSON.stringify(form.laborRows)) : [],
    production: JSON.parse(JSON.stringify(form.production)),
    alert: {
      ...JSON.parse(JSON.stringify(form.alert)),
      attachments: fileList.value.map((f) => ({ uid: f.uid, name: f.name })),
    },
  }
}

function handleCancel() {
  openModel.value = false
}

function handleOk() {
  if (!validate()) return
  emit('saved', {
    isEdit: isEdit.value,
    id: props.editRecord?.id,
    data: buildPayload(),
  })
  message.success(isEdit.value ? '产品已更新' : '产品已保存')
  openModel.value = false
}
</script>

<style lang="less" scoped>
.product-form-modal {
  :deep(.ant-modal-body) {
    max-height: calc(100vh - 200px);
    overflow-y: auto;
    padding-top: 8px;
  }
}

.form-sections.is-view-only {
  :deep(.ant-input),
  :deep(.ant-input-number),
  :deep(.ant-select),
  :deep(.ant-switch),
  :deep(.ant-upload),
  :deep(.ant-btn) {
    pointer-events: none;
  }
}

.form-sections {
  :deep(.ant-collapse-item) {
    margin-bottom: 8px;
    border: 1px solid #f0f0f0 !important;
    border-radius: 6px;
    overflow: hidden;
    background: #fff;
  }

  :deep(.ant-collapse-header) {
    font-weight: 600;
    padding: 10px 16px !important;
    background: #fafafa;
  }

  :deep(.ant-collapse-content-box) {
    padding: 12px 16px 16px !important;
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

  :deep(.ant-form-item-label > label) {
    height: 24px;
    line-height: 24px;
    font-size: 13px;
    white-space: nowrap;
  }

  :deep(.ant-form-item-control) {
    flex: 1;
    min-width: 0;
  }

  .remark-item {
    :deep(.ant-form-item-label) {
      flex: 0 0 96px;
    }
  }
}

.required-label::before {
  display: inline-block;
  margin-inline-end: 4px;
  color: #ff4d4f;
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

.upload-hint {
  font-size: 12px;
  color: rgba(0, 0, 0, 0.45);
  margin-top: 4px;
}

.upload-text {
  margin-top: 4px;
  font-size: 12px;
}
</style>
