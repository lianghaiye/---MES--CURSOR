<template>
  <FormCreateShell
    :page-mode="pageMode"
    :open="open"
    :title="shellTitle"
    width="92%"
    class="product-form-modal"
    @cancel="onShellCancel"
    @update:open="(val) => emit('update:open', val)"
  >
    <div class="entity-name-header">
      <div class="entity-name-label">产品名称</div>
      <a-input
        v-model:value="form.name"
        class="entity-name-input"
        placeholder="请输入产品名称"
        allow-clear
      />
      <div class="entity-capability-row">
        <a-checkbox v-model:checked="form.canSell" disabled>可销售</a-checkbox>
        <a-checkbox v-model:checked="form.isWholeMachine" :disabled="viewOnly">整机</a-checkbox>
        <a-checkbox v-model:checked="form.isPart" :disabled="viewOnly">零部件</a-checkbox>
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
                <a-form-item label="产品编码">
                  <a-input
                    v-model:value="form.code"
                    size="small"
                    placeholder="请输入"
                    allow-clear
                  />
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
                    :disabled="viewOnly"
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
              <a-col :span="24">
                <div class="form-option-row">
                  <div v-if="showAssemblyPartSwitch" class="form-option-item">
                    <span class="form-option-label">是否组装件</span>
                    <a-switch v-model:checked="form.isAssemblyPart" :disabled="viewOnly" />
                  </div>
                  <div v-if="!form.isPart" class="form-option-item">
                    <span class="form-option-label">产品物料</span>
                    <a-switch v-model:checked="form.isProductMaterial" :disabled="viewOnly" />
                  </div>
                </div>
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
                <a-form-item label="标准单价(不含税)">
                  <a-input-number
                    v-model:value="form.unitPrice"
                    size="small"
                    :min="0"
                    :precision="2"
                    :disabled="viewOnly"
                    placeholder="请输入标准单价(不含税)"
                    style="width: 100%"
                  />
                </a-form-item>
              </a-col>
              <a-col :span="8">
                <a-form-item label="标准单价(含税)">
                  <a-input-number
                    :value="unitPriceInclTax"
                    size="small"
                    :precision="2"
                    disabled
                    placeholder="自动计算"
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
                    :disabled="viewOnly"
                    placeholder="请输入销项税率"
                    style="width: 100%"
                    addon-after="%"
                  />
                </a-form-item>
              </a-col>
              <a-col :span="8">
                <a-form-item label="标准包装量">
                  <a-input-group compact class="qty-with-unit">
                    <a-input-number
                      v-model:value="form.standardPackQty"
                      size="small"
                      :min="0"
                      :precision="4"
                      :disabled="viewOnly"
                      placeholder="选填"
                      class="qty-with-unit-input"
                    />
                    <a-select
                      v-model:value="form.standardPackUnit"
                      size="small"
                      :options="unitOpts"
                      :disabled="viewOnly"
                      class="qty-with-unit-select"
                      placeholder="单位"
                      :get-popup-container="popupContainer"
                    />
                  </a-input-group>
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
                    :disabled="viewOnly"
                    placeholder="请输入进项税率"
                    style="width: 100%"
                    addon-after="%"
                  />
                </a-form-item>
              </a-col>
              <a-col :span="8">
                <a-form-item label="采购单价（不含税）">
                  <a-input-number
                    v-model:value="form.purchaseUnitPrice"
                    size="small"
                    :min="0"
                    :precision="2"
                    :disabled="viewOnly"
                    placeholder="请输入采购单价（不含税）"
                    style="width: 100%"
                  />
                </a-form-item>
              </a-col>
              <a-col :span="8">
                <a-form-item label="采购单价（含税）">
                  <a-input-number
                    :value="purchaseUnitPriceInclTax"
                    size="small"
                    :precision="2"
                    disabled
                    placeholder="自动计算"
                    style="width: 100%"
                  />
                </a-form-item>
              </a-col>
              <a-col :span="8">
                <a-form-item label="包装含量">
                  <a-input-group compact class="qty-with-unit">
                    <a-input-number
                      v-model:value="form.packContentQty"
                      size="small"
                      :min="0"
                      :precision="4"
                      :disabled="viewOnly"
                      placeholder="选填，不填则不换算"
                      class="qty-with-unit-input"
                    />
                    <a-select
                      v-model:value="form.packContentUnit"
                      size="small"
                      :options="packContentUnitOpts"
                      :disabled="viewOnly"
                      class="qty-with-unit-select"
                      placeholder="单位"
                      :get-popup-container="popupContainer"
                    />
                  </a-input-group>
                </a-form-item>
              </a-col>
              <a-col :span="8">
                <a-form-item label="默认采购供应商">
                  <PlanSupplierSelect
                    v-model:value="form.production.defaultSupplier"
                    size="small"
                    :disabled="viewOnly"
                    placeholder="请搜索或选择采购供应商"
                  />
                </a-form-item>
              </a-col>
              <a-col :span="8">
                <a-form-item label="默认外协供应商">
                  <PlanSupplierSelect
                    v-model:value="form.production.defaultOutsourceSupplier"
                    size="small"
                    :disabled="viewOnly"
                    placeholder="请搜索或选择外协供应商"
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
                <a-form-item label="计划策略">
                  <a-select
                    v-model:value="form.production.planStrategy"
                    size="small"
                    allow-clear
                    :options="planStrategyOpts"
                    :disabled="viewOnly"
                    placeholder="选填"
                  />
                </a-form-item>
              </a-col>
              <a-col v-if="isPlanStrategyMts(form.production.planStrategy)" :span="8">
                <a-form-item label="补货批量">
                  <a-input-number
                    v-model:value="form.production.replenishQty"
                    size="small"
                    :min="0"
                    :precision="2"
                    :disabled="viewOnly"
                    placeholder="选填"
                    style="width: 100%"
                  />
                </a-form-item>
              </a-col>
              <a-col :span="8">
                <a-form-item label="默认工作中心">
                  <a-select
                    v-model:value="form.production.defaultWorkCenter"
                    allow-clear
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
                    :options="processRouteSelectOpts"
                    :filter-option="filterSelectOption"
                    option-filter-prop="label"
                    placeholder="请搜索或选择工艺路线"
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
        </div>
      </a-tab-pane>

      <a-tab-pane key="alert" tab="预警信息">
        <div class="tab-pane-body">
          <a-form layout="inline" class="horizontal-form">
            <a-row :gutter="[12, 12]" style="width: 100%">
              <a-col :span="8">
                <a-form-item label="库存预警">
                  <a-switch v-model:checked="form.alert.stockAlertEnabled" :disabled="viewOnly" />
                </a-form-item>
              </a-col>
              <a-col v-if="form.alert.stockAlertEnabled" :span="8">
                <a-form-item label="最高库存">
                  <a-input-number
                    v-model:value="form.alert.maxStockQty"
                    size="small"
                    :min="0"
                    :precision="2"
                    :disabled="viewOnly"
                    placeholder="请输入最高库存"
                    style="width: 100%"
                  />
                </a-form-item>
              </a-col>
              <a-col v-if="form.alert.stockAlertEnabled" :span="8">
                <a-form-item label="最低库存">
                  <a-input-number
                    v-model:value="form.alert.minStockQty"
                    size="small"
                    :min="0"
                    :precision="2"
                    :disabled="viewOnly"
                    placeholder="请输入最低库存"
                    style="width: 100%"
                  />
                </a-form-item>
              </a-col>
              <a-col :span="8">
                <a-form-item label="过期预警">
                  <a-switch v-model:checked="form.alert.expiryAlertEnabled" :disabled="viewOnly" />
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
                    :disabled="viewOnly"
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
        </div>
      </a-tab-pane>

      <a-tab-pane v-if="isEdit" key="bom" tab="BOM信息">
        <ItemBomInfoTab item-type="product" :item-id="editRecord?.id || ''" />
      </a-tab-pane>
    </a-tabs>

    <div v-if="activeTabHelpItems.length" class="field-help-panel">
      <ul class="field-help-list">
        <li v-for="item in activeTabHelpItems" :key="item.name">
          <span class="field-help-name">{{ item.name }}</span>
          ：{{ item.desc }}
        </li>
      </ul>
    </div>

    <template #footer>
      <template v-if="viewOnly">
        <a-button type="primary" @click="onShellCancel">关闭</a-button>
      </template>
      <template v-else>
        <a-button @click="onShellCancel">
          <CloseOutlined />
          取消
        </a-button>
        <a-button @click="handleSaveAndMaintainBom">保存并维护BOM</a-button>
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
import { useRouter } from 'vue-router'
import { message } from 'ant-design-vue'
import { CloseOutlined, InfoCircleOutlined, PlusOutlined } from '@ant-design/icons-vue'
import FormCreateShell from '@/components/FormCreateShell.vue'
import { useFormCreateModal } from '@/composables/useFormCreateModal'
import { useTabs } from '@/composables/useTabs'
import { resolveItemBomNavigation } from '@/utils/itemBomNavigation'
import { flattenCategoryNodes, productCategoryTree } from '@/mock/productCategories'
import {
  flattenCategoryNodes as flattenMatCats,
  materialCategoryTree,
} from '@/mock/materialCategories'
import {
  barcodeTypeOptions,
  materialTypeOptions,
  supplyFormOptions,
  reportTypeOptions,
  salaryMethodOptions,
  workCenterOpts,
  processOpts,
  createDefaultLaborRow,
  productAttributeOptions,
  standardSpecOptions,
  createDefaultProductProduction,
  createDefaultProductAlert,
  isPartProductAttribute,
  partProductAttributeOptions,
  PART_PRODUCT_ATTRIBUTES,
  normalizePartProductAttribute,
  PLAN_STRATEGY_OPTIONS,
  isPlanStrategyMts,
} from '@/mock/productInfoOptions'
import { unitState, getInventoryUnitOptions, getAllEnabledUnitOptions } from '@/store/unitStore'
import { getMaterialGradeOptions, materialGradeState } from '@/store/materialGradeStore'
import { generateProductCode, addProduct, updateProduct } from '@/store/productInfoStore'
import { getWarehouseSelectOptions, warehouseState } from '@/store/warehouseStore'
import { getProcessRouteSelectOptions } from '@/utils/productionPlanMaterial'
import PlanSupplierSelect from '@/views/planning/components/PlanSupplierSelect.vue'
import ItemBomInfoTab from '@/views/product-process/components/ItemBomInfoTab.vue'

const props = defineProps({
  open: { type: Boolean, default: false },
  pageMode: { type: Boolean, default: false },
  listPath: { type: String, default: '' },
  editRecord: { type: Object, default: null },
  viewOnly: { type: Boolean, default: false },
})

const emit = defineEmits(['update:open', 'saved'])

const router = useRouter()
const { openTab } = useTabs()
const isEdit = computed(() => Boolean(props.editRecord?.id))

/** 含税单价 = 不含税 × (1 + 销项税率%) */
const unitPriceInclTax = computed(() => {
  const ex = Number(form.unitPrice)
  if (!Number.isFinite(ex)) return undefined
  const rate = Number(form.outputTaxRate)
  const r = Number.isFinite(rate) ? rate : 0
  return Number((ex * (1 + r / 100)).toFixed(2))
})

/** 采购含税单价 = 不含税 × (1 + 进项税率%) */
const purchaseUnitPriceInclTax = computed(() => {
  const ex = Number(form.purchaseUnitPrice)
  if (!Number.isFinite(ex)) return undefined
  const rate = Number(form.inputTaxRate)
  const r = Number.isFinite(rate) ? rate : 0
  return Number((ex * (1 + r / 100)).toFixed(2))
})

function popupContainer(trigger) {
  return trigger?.parentNode || document.body
}

watch(
  () => form.inventoryUnit,
  (unit) => {
    if (!unit) return
    if (!form.standardPackUnit) form.standardPackUnit = unit
    // 产品表单无独立采购单位时，采购单位默认=库存单位
    if (!form.purchaseUnit) form.purchaseUnit = unit
    if (!form.packContentUnit) form.packContentUnit = form.purchaseUnit || unit
  },
)

watch(
  () => form.purchaseUnit,
  (unit) => {
    if (!unit) return
    if (!form.packContentUnit) form.packContentUnit = unit
  },
)

const {
  isActive,
  shellTitle,
  handleCancel: onShellCancel,
  closeAfterSave,
} = useFormCreateModal(props, emit, {
  listPath: '/product-process/products',
  getTitle: () => {
    if (props.viewOnly) return '产品详情'
    return isEdit.value ? '编辑产品' : '新增产品'
  },
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
const unitOpts = computed(() => {
  void unitState.units
  return getInventoryUnitOptions()
})
/** 包装含量单位可选全部启用单位，默认值为采购单位 */
const packContentUnitOpts = computed(() => {
  void unitState.units
  return getAllEnabledUnitOptions()
})
const productAttrOpts = computed(() => {
  const options = form.isPart
    ? partProductAttributeOptions
    : productAttributeOptions.filter((v) => !PART_PRODUCT_ATTRIBUTES.includes(v))
  return options.map((v) => ({ label: v, value: v }))
})
const standardSpecOpts = standardSpecOptions.map((v) => ({ label: v, value: v }))
const materialGradeOpts = computed(() => {
  void materialGradeState.items
  return getMaterialGradeOptions()
})
const reportTypeOpts = reportTypeOptions.map((v) => ({ label: v, value: v }))
const salaryMethodOpts = salaryMethodOptions.map((v) => ({ label: v, value: v }))
const planStrategyOpts = PLAN_STRATEGY_OPTIONS
const categoryOpts = flatCats.map((c) => ({
  label: `(${c.code}) ${c.title}`,
  value: c.key,
}))
const warehouseOpts = computed(() => {
  void warehouseState.warehouses
  return getWarehouseSelectOptions()
})

const activeTabKey = ref('basic')
const fileList = ref([])

const FIELD_HELP_BY_TAB = {
  basic: [
    {
      name: '供应型态',
      desc: '标识物料来源方式（外购件、自制件、外协件、组装等），影响销售订单审核后是否自动生成采购申请、生产工单或外协订单。',
    },
    {
      name: '启用双单位',
      desc: '开启后，采购/入库按「采购单位」计数（如根、盒），库存账存按「库存单位」计量（如米、个）。适用于单件规格不固定，或按包装采购、按件领用的物料。',
    },
    {
      name: '库存单位',
      desc: '库存账存、领料发料所使用的计量单位。',
    },
    {
      name: '采购单位',
      desc: '启用双单位后，采购下单与到货清点所使用的单位；未启用时与库存单位相同。',
    },
  ],
  sales: [
    {
      name: '标准包装量',
      desc: '销售发货或报价常用的标准包装数量，单位为库存单位（如每捆长度、每箱件数）。',
    },
  ],
  purchase: [
    {
      name: '包装含量',
      desc: '每个采购包装（盒/箱等）内含的库存单位数量。生成采购申请时，可按需求量 ÷ 包装含量向上取整，换算为采购包装数。',
    },
  ],
  production: [
    {
      name: '计划策略',
      desc: '选填。按订单MTO：按销售订单排产；按库存MTS：靠库存补货维持水位；按订单MTO+按库存MTS：二者兼有。与库存预警无强制关联。',
    },
    {
      name: '补货批量',
      desc: '选填。一次建议最少补多少（库存单位）。库存预警算建议量时：取「补到最高库存还差多少」与「补货批量」的较大值，避免补得太碎。',
    },
  ],
  alert: [
    {
      name: '库存预警',
      desc: '开启后可维护最高/最低库存；与计划策略无强制关联。',
    },
  ],
  labor: [
    {
      name: '报工类型',
      desc: '批量计件：工时=整批准备工时+合格报工数量×单件标准工时；时长报工：工时=准备工时+员工填报总时长（审核后）。',
    },
    {
      name: '计薪方式',
      desc: '计件工资=合格数量×单件计件单价+补贴报工数量；计时工资按标准工时单价核算（详见工时管理）。',
    },
  ],
}

const activeTabHelpItems = computed(() => FIELD_HELP_BY_TAB[activeTabKey.value] || [])

const showAssemblyPartSwitch = computed(
  () => form.isPart || isPartProductAttribute(form.productAttribute),
)

const form = reactive({
  code: '',
  name: '',
  barcodeType: '一物一码',
  productAttribute: '标准产品',
  categoryKey: undefined,
  specModel: '',
  drawingNo: '',
  material: '',
  weight: '',
  inventoryUnit: undefined,
  purchaseUnit: undefined,
  unitPrice: undefined,
  purchaseUnitPrice: undefined,
  packContentQty: undefined,
  packContentUnit: undefined,
  standardPackQty: undefined,
  standardPackUnit: undefined,
  standardSpec: undefined,
  techParams: '',
  canSell: true,
  isWholeMachine: false,
  isPart: false,
  canPurchase: false,
  canOutsource: false,
  isAssemblyPart: false,
  isProductMaterial: false,
  materialType: '零部件',
  materialCategoryKey: undefined,
  supplyForm: '自制件',
  matchingRequirements: '',
  outputTaxRate: undefined,
  inputTaxRate: undefined,
  laborEnabled: false,
  laborRows: [],
  production: createDefaultProductProduction(),
  alert: createDefaultProductAlert(),
})

const processRouteSelectOpts = computed(() => getProcessRouteSelectOptions())

function resetForm() {
  form.code = ''
  form.name = ''
  form.barcodeType = '一物一码'
  form.productAttribute = '标准产品'
  form.categoryKey = undefined
  form.specModel = ''
  form.drawingNo = ''
  form.material = ''
  form.weight = ''
  form.inventoryUnit = undefined
  form.purchaseUnit = undefined
  form.unitPrice = undefined
  form.purchaseUnitPrice = undefined
  form.packContentQty = undefined
  form.packContentUnit = undefined
  form.standardPackQty = undefined
  form.standardPackUnit = undefined
  form.standardSpec = undefined
  form.techParams = ''
  form.canSell = true
  form.isWholeMachine = false
  form.isPart = false
  form.canPurchase = false
  form.canOutsource = false
  form.isAssemblyPart = false
  form.isProductMaterial = false
  form.materialType = '零部件'
  form.materialCategoryKey = undefined
  form.supplyForm = '自制件'
  form.matchingRequirements = ''
  form.outputTaxRate = undefined
  form.inputTaxRate = undefined
  form.laborEnabled = false
  form.laborRows = []
  form.production = createDefaultProductProduction()
  form.alert = createDefaultProductAlert()
  fileList.value = []
  activeTabKey.value = 'basic'
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
    productAttribute: normalizePartProductAttribute(source.productAttribute),
    categoryKey: source.categoryKey,
    specModel: source.specModel || '',
    drawingNo: source.drawingNo || '',
    material: source.material || '',
    weight: source.weight ?? '',
    inventoryUnit: source.inventoryUnit,
    purchaseUnit: source.purchaseUnit || source.inventoryUnit,
    unitPrice: source.unitPrice,
    purchaseUnitPrice: source.purchaseUnitPrice,
    packContentQty: source.packContentQty ?? source.minOrderQty,
    packContentUnit:
      source.packContentUnit || source.purchaseUnit || source.inventoryUnit || undefined,
    standardPackQty: source.standardPackQty,
    standardPackUnit: source.standardPackUnit || source.inventoryUnit || undefined,
    standardSpec: source.standardSpec,
    techParams: source.techParams || '',
    canSell: source.canSell !== false,
    isWholeMachine: Boolean(source.isWholeMachine),
    isPart: Boolean(source.isPart || source.isProductMaterial),
    canPurchase: Boolean(source.canPurchase),
    canOutsource: Boolean(source.canOutsource),
    isAssemblyPart: Boolean(source.isAssemblyPart),
    materialType: source.materialType || '零部件',
    materialCategoryKey: source.materialCategoryKey,
    supplyForm: source.supplyForm || '自制件',
    matchingRequirements: source.matchingRequirements || source.remark || '',
    outputTaxRate: source.outputTaxRate,
    inputTaxRate: source.inputTaxRate,
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
  form.isProductMaterial = form.isPart
  if (form.isPart) form.isWholeMachine = false
  else if (form.isWholeMachine) form.isPart = false
}

function syncFormOnOpen() {
  if (!isActive.value) return
  if (props.editRecord) loadEditRecord(props.editRecord)
  else resetForm()
}

watch(
  () => [isActive.value, props.editRecord?.id, props.editRecord?.code],
  () => syncFormOnOpen(),
  { immediate: true },
)

watch(
  () => form.laborEnabled,
  (enabled) => {
    if (!enabled) return
    if (!form.laborRows.length) form.laborRows = [createDefaultLaborRow()]
    activeTabKey.value = 'labor'
  },
)

let syncingProductPartPair = false
let syncingProductTypePair = false

watch(
  () => form.isWholeMachine,
  (val) => {
    if (syncingProductTypePair || !val || !form.isPart) return
    syncingProductTypePair = true
    form.isPart = false
    syncingProductTypePair = false
  },
)

watch(
  () => form.isPart,
  (val) => {
    if (!syncingProductTypePair && val && form.isWholeMachine) {
      syncingProductTypePair = true
      form.isWholeMachine = false
      syncingProductTypePair = false
    }
    if (syncingProductPartPair || form.isProductMaterial === val) return
    syncingProductPartPair = true
    form.isProductMaterial = val
    syncingProductPartPair = false
    if (val) {
      form.productAttribute = normalizePartProductAttribute(form.productAttribute)
    } else if (isPartProductAttribute(form.productAttribute)) {
      form.productAttribute = '标准产品'
      form.isAssemblyPart = false
    }
  },
)

watch(
  () => form.isProductMaterial,
  (val) => {
    if (syncingProductPartPair || form.isPart === val) return
    syncingProductPartPair = true
    form.isPart = val
    syncingProductPartPair = false
  },
)

watch(
  () => form.canSell,
  (val) => {
    if (!val) form.canSell = true
  },
)

watch(
  () => form.productAttribute,
  (val) => {
    if (!isPartProductAttribute(val)) form.isAssemblyPart = false
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

function filterSelectOption(input, option) {
  const kw = String(input || '').toLowerCase()
  const label = String(option?.label ?? option?.value ?? '').toLowerCase()
  return label.includes(kw)
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
    drawingNo: form.drawingNo?.trim() || '',
    material: form.material,
    weight: Number(form.weight) || 0,
    inventoryUnit: form.inventoryUnit,
    purchaseUnit: form.purchaseUnit || form.inventoryUnit,
    standardSpec: form.standardSpec || '',
    techParams: form.techParams?.trim() || '',
    unitPrice: form.unitPrice ?? 0,
    purchaseUnitPrice: form.purchaseUnitPrice ?? 0,
    packContentQty: form.packContentQty ?? null,
    packContentUnit: form.packContentUnit || form.purchaseUnit || form.inventoryUnit || null,
    standardPackQty: form.standardPackQty ?? null,
    standardPackUnit: form.standardPackUnit || form.inventoryUnit || null,
    canSell: true,
    isWholeMachine: form.isWholeMachine,
    isPart: form.isPart,
    canPurchase: form.canPurchase,
    canOutsource: form.canOutsource,
    isAssemblyPart: showAssemblyPartSwitch.value ? form.isAssemblyPart : false,
    isProductMaterial: form.isProductMaterial,
    materialType: form.isProductMaterial ? form.materialType : undefined,
    materialCategoryKey: form.isProductMaterial ? form.materialCategoryKey : undefined,
    supplyForm: form.isProductMaterial ? form.supplyForm : undefined,
    matchingRequirements: form.matchingRequirements?.trim() || '',
    remark: form.matchingRequirements?.trim() || '',
    outputTaxRate: form.outputTaxRate,
    inputTaxRate: form.inputTaxRate,
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

function handleOk() {
  if (!validate()) return
  const data = buildPayload()
  if (props.pageMode) {
    if (isEdit.value) updateProduct(props.editRecord.id, data)
    else addProduct(data)
  } else {
    emit('saved', { isEdit: isEdit.value, id: props.editRecord?.id, data })
  }
  message.success(isEdit.value ? '产品已更新' : '产品已保存')
  closeAfterSave()
}

function handleSaveAndMaintainBom() {
  if (!validate()) return
  const data = buildPayload()
  let savedId = props.editRecord?.id || ''
  if (isEdit.value && savedId) {
    updateProduct(savedId, data)
  } else {
    const row = addProduct(data)
    savedId = row?.id || ''
  }
  emit('saved', { isEdit: isEdit.value, id: savedId, data, alreadySaved: true })
  if (!savedId) {
    message.warning('保存成功，但无法定位产品，请稍后从列表维护 BOM')
    closeAfterSave()
    return
  }
  message.success(isEdit.value ? '产品已更新，正在打开 BOM' : '产品已保存，正在打开 BOM')
  closeAfterSave()
  navigateToMaintainBom(savedId, data.name || form.name)
}

function navigateToMaintainBom(productId, productName) {
  const nav = resolveItemBomNavigation('product', productId)
  const resolved = router.resolve({
    path: nav.path,
    query: {
      ...(nav.query || {}),
      itemName: productName || '',
    },
  })
  openTab(resolved.fullPath || resolved.path, nav.title || '维护BOM')
  router.push(resolved)
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

.mts-hint {
  width: 100%;
  margin-top: 8px;
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

.qty-with-unit {
  display: flex;
  width: 100%;
}

.qty-with-unit :deep(.qty-with-unit-input),
.qty-with-unit :deep(.ant-input-number) {
  flex: 1;
  min-width: 0;
  width: calc(100% - 88px);
}

.qty-with-unit-select {
  width: 88px;
  flex-shrink: 0;
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

.field-help-panel {
  margin-top: 16px;
  padding: 14px 16px;
  background: #fafafa;
  border: 1px solid #f0f0f0;
  border-radius: 6px;
}

.field-help-list {
  margin: 0;
  padding-left: 18px;
  font-size: 12px;
  line-height: 1.7;
  color: rgba(0, 0, 0, 0.55);
}

.field-help-name {
  color: rgba(0, 0, 0, 0.75);
  font-weight: 500;
}
</style>
