<template>
  <FormCreateShell
    :page-mode="pageMode"
    :open="open"
    :title="shellTitle"
    width="92%"
    class="master-item-form-modal"
    @cancel="handleCancel"
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
        <a-checkbox v-model:checked="form.canSell" :disabled="viewOnly">可销售</a-checkbox>
        <a-checkbox v-model:checked="form.canProduce" :disabled="viewOnly">可生产</a-checkbox>
        <template v-if="form.canSell">
          <a-checkbox v-model:checked="form.isWholeMachine" :disabled="viewOnly">整机</a-checkbox>
          <a-checkbox v-model:checked="form.isPart" :disabled="viewOnly">零部件</a-checkbox>
        </template>
        <a-checkbox v-model:checked="form.canPurchase" :disabled="viewOnly">可采购</a-checkbox>
        <a-checkbox v-model:checked="form.canOutsource" :disabled="viewOnly">可外协</a-checkbox>
        <span v-if="derivedItemKindLabel" class="derived-type-tag">
          产品类型：{{ derivedItemKindLabel }}
        </span>
      </div>
      <div v-if="!viewOnly && !isEdit" class="master-data-mode-row">
        <span class="mode-label">创建模式：</span>
        <a-radio-group v-model:value="form.masterDataMode" size="small">
          <a-radio-button value="single">单规格物料</a-radio-button>
          <a-radio-button value="multiVariant">多规格变体</a-radio-button>
        </a-radio-group>
      </div>
    </div>

    <div v-if="form.spuId" class="spu-inherit-banner">
      <a-tag color="blue">产品族：{{ form.spuName || form.spuId }}</a-tag>
      <span class="spu-inherit-hint">变体 SKU — 规格/材质为族内区分维度</span>
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
                <a-form-item :label="isMultiVariantMode ? '族编码' : '编号'">
                  <a-input
                    v-model:value="form.code"
                    size="small"
                    :placeholder="isMultiVariantMode ? '留空则保存时自动生成，如 F0001' : '请输入'"
                    allow-clear
                    @change="onFamilyCodeChange"
                  />
                </a-form-item>
              </a-col>
              <a-col :span="8">
                <a-form-item label="条码类型">
                  <a-select v-model:value="form.barcodeType" size="small" :options="barcodeOpts" />
                </a-form-item>
              </a-col>
              <template v-if="showProductFields">
                <a-col :span="8">
                  <a-form-item label="产品类别" required>
                    <a-select
                      v-model:value="form.productCategoryKey"
                      size="small"
                      :options="productCategoryOpts"
                      placeholder="请选择 产品类别"
                    />
                  </a-form-item>
                </a-col>
                <a-col :span="8">
                  <a-form-item label="产品属性">
                    <a-select
                      v-model:value="form.productAttribute"
                      size="small"
                      allow-clear
                      :options="productAttrOpts"
                      placeholder="请选择 产品属性"
                    />
                  </a-form-item>
                </a-col>
                <a-col :span="8">
                  <a-form-item label="标准规范">
                    <a-input
                      v-model:value="form.standardSpec"
                      size="small"
                      placeholder="请输入标准规范"
                      allow-clear
                    />
                  </a-form-item>
                </a-col>
                <a-col v-if="showAssemblyPartSwitch" :span="8">
                  <a-form-item label="是否组装件">
                    <a-switch v-model:checked="form.isAssemblyPart" :disabled="viewOnly" />
                  </a-form-item>
                </a-col>
              </template>
              <template v-if="showMaterialFields">
                <a-col :span="8">
                  <a-form-item label="物料类别" required>
                    <a-select
                      v-model:value="form.categoryKey"
                      size="small"
                      :options="categoryOpts"
                      placeholder="请选择 物料类别"
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
              </template>
              <a-col v-if="!isMultiVariantMode" :span="8">
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
              <a-col v-if="!isMultiVariantMode" :span="8">
                <a-form-item label="材质">
                  <a-select
                    v-model:value="form.materialGradeId"
                    size="small"
                    allow-clear
                    show-search
                    :options="materialGradeIdOpts"
                    placeholder="请选择 材质"
                    :filter-option="filterMaterialGrade"
                    @change="onMaterialGradeChange"
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
                <a-form-item>
                  <template #label>
                    <span>启用双单位</span>
                    <a-tooltip
                      :overlay-style="{ maxWidth: '320px' }"
                      title="启用后，采购/入库按「采购单位」计数（如根），库存账存按「库存单位」计量（如米、kg）。适用于单件规格不固定、需按实际长度或重量入账的物料。"
                    >
                      <InfoCircleOutlined class="info-icon" />
                    </a-tooltip>
                  </template>
                  <a-switch
                    v-model:checked="form.isVariableLength"
                    :disabled="viewOnly"
                    @change="onVariableLengthChange"
                  />
                </a-form-item>
              </a-col>
              <a-col v-if="form.isVariableLength" :span="8">
                <a-form-item label="采购单位" required>
                  <a-select
                    v-model:value="form.purchaseUnit"
                    size="small"
                    :options="purchaseUnitOpts"
                    placeholder="如：根"
                    :disabled="viewOnly"
                    @change="onPurchaseUnitChange"
                  />
                </a-form-item>
              </a-col>
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

      <a-tab-pane v-if="isMultiVariantMode" key="variant" tab="变体配置">
        <div class="tab-pane-body">
          <VariantAttributeEditor
            v-model:variant-axes="form.variantAxes"
            v-model:sku-code-pattern="form.skuCodePattern"
            :spu-code="familyCodePreview"
            :disabled="viewOnly"
          >
            <template #after-sku>
              <a-form layout="inline" class="horizontal-form variant-bom-form">
                <a-row :gutter="[12, 8]" style="width: 100%">
                  <a-col :span="10">
                    <a-form-item label="BOM 策略">
                      <a-select
                        v-model:value="form.bomStrategy"
                        size="small"
                        :options="bomStrategyOpts"
                        :disabled="viewOnly"
                        style="width: 100%"
                      />
                    </a-form-item>
                  </a-col>
                  <a-col v-if="form.bomStrategy !== 'independent'" :span="14">
                    <a-form-item label="族模板 BOM">
                      <template v-if="hasSavedSpu">
                        <a-space wrap>
                          <span v-if="form.baseBomId" class="bom-id-text">{{
                            form.baseBomId
                          }}</span>
                          <span v-else class="bom-id-text is-empty">尚未关联模板 BOM</span>
                          <a-button
                            size="small"
                            type="link"
                            :disabled="viewOnly"
                            @click="openTemplateBom"
                          >
                            {{ form.baseBomId ? '编辑族模板 BOM' : '去维护族模板 BOM' }}
                          </a-button>
                        </a-space>
                      </template>
                      <span v-else class="bom-pending-hint"
                        >先保存产品族后，再在此维护族模板 BOM</span
                      >
                    </a-form-item>
                  </a-col>
                  <a-col :span="24">
                    <div class="bom-strategy-help">{{ bomStrategyHelp }}</div>
                  </a-col>
                </a-row>
              </a-form>
            </template>
          </VariantAttributeEditor>
          <VariantSkuMatrixPreview
            ref="matrixPreviewRef"
            :spu="spuPreviewContext"
            :variant-axes="form.variantAxes"
            :sku-code-pattern="form.skuCodePattern"
            :enabled-keys="form.enabledCombinationKeys"
            :disabled="viewOnly"
            @update:enabled-keys="(k) => (form.enabledCombinationKeys = k)"
          />
        </div>
      </a-tab-pane>

      <a-tab-pane key="sales" tab="销售">
        <div class="tab-pane-body">
          <a-form layout="inline" class="horizontal-form">
            <a-row :gutter="[12, 12]" style="width: 100%">
              <a-col :span="8">
                <a-form-item label="标准单价(不含税)" class="label-wide">
                  <a-input-number
                    v-model:value="form.unitPrice"
                    size="small"
                    :min="0"
                    :precision="2"
                    placeholder="请输入标准单价(不含税)"
                    style="width: 100%"
                  />
                </a-form-item>
              </a-col>
              <a-col :span="8">
                <a-form-item label="标准单价(含税)" class="label-wide">
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
                    placeholder="请输入进项税率"
                    style="width: 100%"
                    addon-after="%"
                  />
                </a-form-item>
              </a-col>
              <a-col :span="8">
                <a-form-item label="采购单价（不含税）" class="label-wide">
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
                <a-form-item label="采购单价（含税）" class="label-wide">
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
                <a-form-item>
                  <template #label>
                    <span>包装含量</span>
                    <a-tooltip
                      title="选填。1 个采购单位折合多少库存单位。例：采购单位=盒、库存单位=个、含量=100 → 1 盒=100 个；采购申请按需求 ÷ 含量向上取整。不填则不做包装换算，采购量按库存单位计。"
                    >
                      <InfoCircleOutlined class="info-icon" />
                    </a-tooltip>
                  </template>
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
                <a-form-item label="默认供应商">
                  <PlanSupplierSelect
                    v-model:value="form.production.defaultSupplier"
                    size="small"
                    :disabled="viewOnly"
                    placeholder="请搜索或选择供应商"
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
                    <a-tooltip
                      :overlay-style="{ maxWidth: '360px' }"
                      title="开=参与领料；关=不进领料单，发料方式=倒冲"
                    >
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
        <ItemBomInfoTab :item-type="bomItemType" :item-id="editRecord?.id || ''" />
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
  isPartProductAttribute,
  productAttributeOptions,
  wholeMachineProductAttributeOptions,
} from '@/mock/productInfoOptions'
import {
  barcodeTypeOptions,
  materialTypeOptions,
  supplyFormOptions,
  reportTypeOptions,
  salaryMethodOptions,
  inboundQcOptions,
  workCenterOpts,
  processOpts,
  createDefaultLaborRow,
  createDefaultProductionControl,
  createDefaultAlertConfig,
} from '@/mock/materialInfoOptions'
import {
  unitState,
  getInventoryUnitOptions,
  getPurchaseUnitOptions,
  getAllEnabledUnitOptions,
} from '@/store/unitStore'
import { generateProductCode } from '@/store/productInfoStore'
import { saveMasterItem, resolveMasterItemEditRecord } from '@/utils/masterItemSave'
import {
  ITEM_KIND,
  itemKindLabel,
  resolveBomItemTypeForKind,
  resolveItemKind,
} from '@/utils/masterItemKind'
import { materialGradeState, getMaterialGradeById } from '@/store/materialGradeStore'
import { resolveMaterialGradeIdByName } from '@/utils/materialGradeResolve'
import { getWarehouseSelectOptions, warehouseState } from '@/store/warehouseStore'
import { getProcessRouteSelectOptions } from '@/utils/productionPlanMaterial'
import PlanSupplierSelect from '@/views/planning/components/PlanSupplierSelect.vue'
import ItemBomInfoTab from '@/views/product-process/components/ItemBomInfoTab.vue'
import VariantAttributeEditor from '@/views/product-process/components/VariantAttributeEditor.vue'
import VariantSkuMatrixPreview from '@/views/product-process/components/VariantSkuMatrixPreview.vue'
import { addSpu, updateSpu, generateSpuCode } from '@/store/spuStore'
import { batchGenerateSkus, listSkusForSpu } from '@/utils/spuSkuSave'
import { matrixRowsToSkuCombos } from '@/utils/spuMatrix'
import { hydrateMaterialAxisFromSkus } from '@/utils/spuVariant'
import {
  PRODUCT_SKU_CODE_PATTERN,
  SPU_BOM_STRATEGY,
  SPU_BOM_STRATEGY_HELPS,
  SPU_BOM_STRATEGY_LABELS,
  ensureLockedVariantAxes,
} from '@/constants/spu'
import { getVariantAxesForCategory } from '@/utils/variantAxisTemplate'
import { useRouter } from 'vue-router'

const props = defineProps({
  open: { type: Boolean, default: false },
  pageMode: { type: Boolean, default: false },
  listPath: { type: String, default: '' },
  editRecord: { type: Object, default: null },
  editSpu: { type: Object, default: null },
  viewOnly: { type: Boolean, default: false },
})

const emit = defineEmits(['update:open', 'saved'])

const router = useRouter()
const matrixPreviewRef = ref(null)

const isEdit = computed(() => Boolean(props.editRecord?.id))
const isSpuEdit = computed(() => Boolean(props.editSpu?.id))

const bomStrategyOpts = Object.entries(SPU_BOM_STRATEGY_LABELS).map(([value, label]) => ({
  value,
  label,
}))

const bomStrategyHelp = computed(
  () =>
    SPU_BOM_STRATEGY_HELPS[form.bomStrategy] ||
    '同类变体共用结构 → 建族模板 +「继承」；特殊 SKU 再建独立 BOM。销售投产仅认 SKU 自有生效 BOM。',
)

const { isActive, shellTitle, handleCancel, closeAfterSave } = useFormCreateModal(props, emit, {
  listPath: '/product-process/products',
  getTitle: () => {
    if (props.viewOnly) return '主数据详情'
    return isEdit.value ? '编辑主数据' : '新增主数据'
  },
})

const derivedItemKind = computed(() =>
  resolveItemKind({ canSell: form.canSell, canProduce: form.canProduce }),
)
const derivedItemKindLabel = computed(() =>
  derivedItemKind.value ? itemKindLabel(derivedItemKind.value) : '',
)
const showProductFields = computed(
  () =>
    derivedItemKind.value === ITEM_KIND.PRODUCT ||
    derivedItemKind.value === ITEM_KIND.PRODUCT_MATERIAL,
)
const showMaterialFields = computed(
  () =>
    derivedItemKind.value === ITEM_KIND.MATERIAL ||
    derivedItemKind.value === ITEM_KIND.PRODUCT_MATERIAL,
)
const showAssemblyPartSwitch = computed(
  () => form.isPart || isPartProductAttribute(form.productAttribute),
)
const bomItemType = computed(() =>
  resolveBomItemTypeForKind(derivedItemKind.value || ITEM_KIND.PRODUCT),
)

const isMultiVariantMode = computed(() => form.masterDataMode === 'multiVariant' || isSpuEdit.value)

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
    if (!form.isVariableLength) {
      form.purchaseUnit = unit
      if (!form.packContentUnit) form.packContentUnit = unit
    }
  },
)

watch(
  () => form.purchaseUnit,
  (unit) => {
    if (!unit) return
    if (!form.packContentUnit) form.packContentUnit = unit
  },
)

/** 产品族已落库后，才允许维护族模板 BOM（需关联 spuId） */
const hasSavedSpu = computed(() => Boolean(form.spuId || props.editSpu?.id))

const flatCats = flattenCategoryNodes(materialCategoryTree).filter((c) => !c.children?.length)
const flatProductCats = flattenCategoryNodes(productCategoryTree).filter((c) => !c.children?.length)

/** 族编码：手填优先；未填时按保存规则预览自动生成码 */
const familyCodePreview = computed(() => {
  const typed = (form.spuCode || form.code || '').trim()
  if (typed) return typed
  return generateSpuCode()
})

const spuPreviewContext = computed(() => ({
  id: props.editSpu?.id || form.spuId || '',
  name: form.name,
  code: familyCodePreview.value,
  baseBomId: form.baseBomId,
  bomStrategy: form.bomStrategy,
  variantAxes: form.variantAxes,
  skuCodePattern: form.skuCodePattern,
}))

function onFamilyCodeChange() {
  form.spuCode = form.code
}

const barcodeOpts = barcodeTypeOptions.map((v) => ({ label: v, value: v }))
const materialTypeOpts = materialTypeOptions.map((v) => ({ label: v, value: v }))
const supplyFormOpts = supplyFormOptions.map((v) => ({ label: v, value: v }))
const unitOpts = computed(() => {
  void unitState.units
  return getInventoryUnitOptions()
})
const purchaseUnitOpts = computed(() => {
  void unitState.units
  return getPurchaseUnitOptions()
})
/** 包装含量单位可选全部启用单位，默认值为采购单位 */
const packContentUnitOpts = computed(() => {
  void unitState.units
  return getAllEnabledUnitOptions()
})

function onPurchaseUnitChange() {
  /* 包装含量单位默认跟采购单位 */
  if (!form.packContentUnit) {
    form.packContentUnit = form.purchaseUnit
  }
}

function onVariableLengthChange(checked) {
  if (checked) {
    const inv = form.inventoryUnit || '米'
    form.inventoryUnit = inv
    form.stockUnit = inv
    if (!form.standardPackUnit) form.standardPackUnit = inv
    if (inv === '㎡' || inv === 'm²' || inv === '平方米') {
      form.purchaseUnit = form.purchaseUnit || '张'
      form.uomRelation = 'per_piece_area'
    } else if (String(inv).toLowerCase() === 'kg' || inv === '公斤' || inv === '千克') {
      form.purchaseUnit = form.purchaseUnit || '件'
      form.uomRelation = 'per_piece_weight'
    } else {
      form.purchaseUnit = form.purchaseUnit || '根'
      form.uomRelation = 'per_piece_length'
    }
    if (!form.packContentUnit) form.packContentUnit = form.purchaseUnit
  } else {
    // 关闭双单位：采购单位与库存单位保持一致，界面不再展示采购单位
    form.purchaseUnit = form.inventoryUnit
    form.stockUnit = form.inventoryUnit
    form.uomRelation = ''
    if (!form.packContentUnit) form.packContentUnit = form.purchaseUnit
  }
}
const materialGradeIdOpts = computed(() => {
  void materialGradeState.items
  return materialGradeState.items.map((i) => ({ label: i.name, value: i.id }))
})

function onMaterialGradeChange(gradeId) {
  const grade = getMaterialGradeById(gradeId)
  form.material = grade?.name || ''
}
const reportTypeOpts = reportTypeOptions.map((v) => ({ label: v, value: v }))
const salaryMethodOpts = salaryMethodOptions.map((v) => ({ label: v, value: v }))
const inboundQcOpts = inboundQcOptions.map((v) => ({ label: v, value: v }))
const categoryOpts = flatCats.map((c) => ({
  label: `(${c.code}) ${c.title}`,
  value: c.key,
}))
const productAttrOpts = computed(() => {
  let options = partProductAttributeOptions
  if (showProductFields.value && form.canSell && !form.isPart) {
    options = form.isWholeMachine ? wholeMachineProductAttributeOptions : productAttributeOptions
  }
  return options.map((v) => ({ label: v, value: v }))
})
const productCategoryOpts = flatProductCats.map((c) => ({
  label: `(${c.code}) ${c.title}`,
  value: c.key,
}))
const warehouseOpts = computed(() => {
  void warehouseState.warehouses
  return getWarehouseSelectOptions()
})

const activeTabKey = ref('basic')

const FIELD_HELP_BY_TAB = {
  basic: [
    {
      name: '供应型态',
      desc: '标识物料来源方式（外购件、自制件、外协件、组装等），影响销售订单审核后是否自动生成采购申请、生产工单或外协订单。',
    },
    {
      name: '启用双单位',
      desc: '开启后，采购/入库按「采购单位」计数（如根、张、盒），库存账存按「库存单位」计量（如米、㎡、个）。钢管填单件长度；板材填长×宽自动换算面积；适用于规格不固定或包装采购的物料。',
    },
    {
      name: '库存单位',
      desc: '库存账存、领料发料所使用的计量单位。板材建议用㎡。',
    },
    {
      name: '采购单位',
      desc: '仅启用双单位时展示。采购下单与到货清点所使用的单位（如根、张）；未启用双单位时与库存单位相同，界面不展示。',
    },
  ],
  sales: [
    {
      name: '标准包装量',
      desc: '选填。销售发货或报价常用的标准包装数量，单位为库存单位（如每捆长度、每箱件数）。',
    },
  ],
  purchase: [
    {
      name: '包装含量',
      desc: '选填。每个采购包装内含的库存单位数量；填写后采购申请可按需求 ÷ 含量向上取整。不填则不做包装换算，采购量按库存单位计。',
    },
  ],
  production: [
    {
      name: '领料属性',
      desc: '开=参与领料；关=不进领料单，发料方式=倒冲。',
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
  materialGradeId: '',
  spuId: '',
  spuName: '',
  isVariantSku: false,
  variantValues: {},
  bomOverrides: [],
  masterDataMode: 'single',
  spuCode: '',
  variantAxes: [],
  skuCodePattern: PRODUCT_SKU_CODE_PATTERN,
  enabledCombinationKeys: [],
  bomStrategy: SPU_BOM_STRATEGY.INHERIT,
  baseBomId: '',
  techParams: '',
  weight: '',
  inventoryUnit: undefined,
  isVariableLength: false,
  purchaseUnit: undefined,
  stockUnit: undefined,
  uomRelation: '',
  unitPrice: undefined,
  purchaseUnitPrice: undefined,
  packContentQty: undefined,
  packContentUnit: undefined,
  standardPackQty: undefined,
  standardPackUnit: undefined,
  canSell: false,
  canProduce: false,
  isWholeMachine: false,
  isPart: false,
  canPurchase: false,
  canOutsource: false,
  productAttribute: undefined,
  productCategoryKey: undefined,
  standardSpec: '',
  isAssemblyPart: false,
  matchingRequirements: '',
  outputTaxRate: undefined,
  inputTaxRate: undefined,
  laborEnabled: false,
  laborRows: [],
  production: createDefaultProductionControl(),
  alert: createDefaultAlertConfig(),
})

const processRouteSelectOpts = computed(() => getProcessRouteSelectOptions())

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
  form.materialGradeId = ''
  form.spuId = ''
  form.spuName = ''
  form.isVariantSku = false
  form.variantValues = {}
  form.bomOverrides = []
  form.masterDataMode = 'single'
  form.spuCode = ''
  form.variantAxes = []
  form.skuCodePattern = PRODUCT_SKU_CODE_PATTERN
  form.enabledCombinationKeys = []
  form.bomStrategy = SPU_BOM_STRATEGY.INHERIT
  form.baseBomId = ''
  form.techParams = ''
  form.weight = ''
  form.inventoryUnit = undefined
  form.isVariableLength = false
  form.purchaseUnit = undefined
  form.stockUnit = undefined
  form.uomRelation = ''
  form.unitPrice = undefined
  form.purchaseUnitPrice = undefined
  form.packContentQty = undefined
  form.packContentUnit = undefined
  form.standardPackQty = undefined
  form.standardPackUnit = undefined
  form.canSell = false
  form.canProduce = false
  form.isWholeMachine = false
  form.isPart = false
  form.canPurchase = false
  form.canOutsource = false
  form.productAttribute = undefined
  form.productCategoryKey = undefined
  form.standardSpec = ''
  form.isAssemblyPart = false
  form.matchingRequirements = ''
  form.outputTaxRate = undefined
  form.inputTaxRate = undefined
  form.laborEnabled = false
  form.laborRows = []
  form.production = createDefaultProductionControl()
  form.alert = createDefaultAlertConfig()
  activeTabKey.value = 'basic'
}

function loadEditRecord(record) {
  const source = resolveMasterItemEditRecord(record)
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
  form.materialGradeId = source.materialGradeId || resolveMaterialGradeIdByName(source.material)
  form.spuId = source.spuId || ''
  form.spuName = source.spuName || ''
  form.isVariantSku = Boolean(source.isVariantSku)
  form.variantValues = source.variantValues ? { ...source.variantValues } : {}
  form.bomOverrides = source.bomOverrides ? [...source.bomOverrides] : []
  form.techParams = source.techParams || ''
  form.weight = source.weight || ''
  form.inventoryUnit = source.inventoryUnit
  form.isVariableLength = Boolean(source.isVariableLength)
  form.purchaseUnit = source.purchaseUnit || source.inventoryUnit
  form.stockUnit = source.stockUnit || source.inventoryUnit
  form.uomRelation = source.uomRelation || ''
  form.unitPrice = source.unitPrice
  form.purchaseUnitPrice = source.purchaseUnitPrice
  form.packContentQty = source.packContentQty ?? source.packageContent ?? source.minOrderQty
  form.packContentUnit =
    source.packContentUnit ||
    source.purchaseUnit ||
    source.inventoryUnit ||
    source.stockUnit ||
    undefined
  form.standardPackQty = source.standardPackQty
  form.standardPackUnit =
    source.standardPackUnit || source.inventoryUnit || source.stockUnit || undefined
  form.canSell = Boolean(source.canSell)
  form.canProduce = Boolean(source.canProduce)
  form.isWholeMachine = Boolean(source.isWholeMachine)
  form.isPart = Boolean(source.isPart)
  form.canPurchase = Boolean(source.canPurchase)
  form.canOutsource = Boolean(source.canOutsource)
  if (form.isPart) {
    form.productAttribute = normalizePartProductAttribute(source.productAttribute)
  } else if (form.isWholeMachine) {
    form.productAttribute = wholeMachineProductAttributeOptions.includes(source.productAttribute)
      ? source.productAttribute
      : undefined
  } else {
    form.productAttribute = source.productAttribute || undefined
  }
  form.productCategoryKey = source.productCategoryKey
  form.standardSpec = source.standardSpec || ''
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
  if (form.isPart) form.isWholeMachine = false
  else if (form.isWholeMachine) form.isPart = false
}

function loadEditSpu(spu) {
  resetForm()
  form.masterDataMode = 'multiVariant'
  form.spuId = spu.id
  form.spuName = spu.name
  form.name = spu.name
  form.spuCode = spu.code
  form.code = spu.code
  form.categoryKey = spu.categoryKey
  form.productCategoryKey = spu.categoryKey
  form.canSell = spu.canSell
  form.canProduce = spu.canProduce
  form.canPurchase = spu.canPurchase
  form.canOutsource = spu.canOutsource
  form.variantAxes = hydrateMaterialAxisFromSkus(
    ensureLockedVariantAxes(spu.variantAxes || []),
    listSkusForSpu(spu.id),
    getMaterialGradeById,
  )
  form.skuCodePattern = PRODUCT_SKU_CODE_PATTERN
  form.enabledCombinationKeys = [...(spu.enabledCombinations || [])]
  form.bomStrategy = spu.bomStrategy || SPU_BOM_STRATEGY.INHERIT
  form.baseBomId = spu.baseBomId || ''
  const shared = spu.sharedFields || {}
  form.techParams = shared.techParams || ''
  form.materialType = shared.materialType
  form.supplyForm = shared.supplyForm
  form.inventoryUnit = shared.inventoryUnit
  activeTabKey.value = 'variant'
}

function syncFormOnOpen() {
  if (!isActive.value) return
  if (props.editSpu) loadEditSpu(props.editSpu)
  else if (props.editRecord) loadEditRecord(props.editRecord)
  else resetForm()
}

watch(
  () =>
    isActive.value
      ? props.editSpu?.id || props.editRecord?.id || props.editRecord?.code || '__new__'
      : '',
  () => syncFormOnOpen(),
  { immediate: true },
)

watch(
  () => form.masterDataMode,
  (mode) => {
    if (mode === 'single' && activeTabKey.value === 'variant') {
      activeTabKey.value = 'basic'
    }
    if (mode !== 'multiVariant' || form.variantAxes.length) return
    const catKey = form.categoryKey || form.productCategoryKey
    form.variantAxes = getVariantAxesForCategory(
      catKey,
      showProductFields.value ? 'product' : 'material',
    )
  },
)

watch(
  () => form.laborEnabled,
  (enabled) => {
    if (!enabled) return
    if (!form.laborRows.length) form.laborRows = [createDefaultLaborRow()]
    activeTabKey.value = 'labor'
  },
)

let syncingProductTypePair = false

watch(
  () => form.isWholeMachine,
  (val) => {
    if (syncingProductTypePair) return
    if (val && form.isPart) {
      syncingProductTypePair = true
      form.isPart = false
      syncingProductTypePair = false
    }
    if (
      val &&
      !form.isPart &&
      !wholeMachineProductAttributeOptions.includes(form.productAttribute)
    ) {
      form.productAttribute = undefined
    }
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
    if (val) {
      form.productAttribute = normalizePartProductAttribute(form.productAttribute)
    } else if (isPartProductAttribute(form.productAttribute)) {
      form.productAttribute = undefined
      form.isAssemblyPart = false
    }
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

function validate() {
  if (!form.canSell && !form.canProduce) {
    message.warning('请至少勾选「可销售」或「可生产」之一')
    return false
  }
  if (!form.name?.trim()) {
    message.warning('请填写产品名称')
    return false
  }
  if (showProductFields.value) {
    if (!form.productCategoryKey) {
      message.warning('请选择产品类别')
      return false
    }
  }
  if (showMaterialFields.value) {
    if (!form.categoryKey) {
      message.warning('请选择物料类别')
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
  }
  if (!isMultiVariantMode.value && !form.specModel?.trim()) {
    message.warning('请填写规格型号')
    return false
  }
  if (isMultiVariantMode.value) {
    if (!form.variantAxes?.length) {
      message.warning('请至少配置一个变体属性')
      return false
    }
    const missingDomain = form.variantAxes.find((a) => !a.enumValues?.length)
    if (missingDomain) {
      message.warning(`请为「${missingDomain.label || '变体属性'}」配置值域`)
      return false
    }
  }
  if (!form.inventoryUnit) {
    message.warning('请选择库存单位')
    return false
  }
  if (form.isVariableLength && !form.purchaseUnit) {
    message.warning('启用双单位请选择采购单位（如：根）')
    return false
  }
  if (!form.isVariableLength) {
    form.purchaseUnit = form.inventoryUnit
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

function buildProductPayload() {
  const cat = flatProductCats.find((c) => c.key === form.productCategoryKey)
  const parent = cat?.parentKey
    ? flattenCategoryNodes(productCategoryTree).find((c) => c.key === cat.parentKey)
    : null
  const code = form.code?.trim() || generateProductCode()
  const isPm = derivedItemKind.value === ITEM_KIND.PRODUCT_MATERIAL

  return {
    code,
    name: form.name.trim(),
    barcodeType: form.barcodeType,
    productAttribute: form.productAttribute,
    categoryKey: form.productCategoryKey,
    categoryCode: cat?.code || '',
    categoryName: parent ? parent.title : cat?.title || '',
    parentCategoryKey: cat?.parentKey || cat?.key || '',
    specModel: form.specModel,
    drawingNo: form.drawingNo?.trim() || '',
    material: form.material,
    materialGradeId: form.materialGradeId || '',
    spuId: form.spuId || '',
    spuName: form.spuName || '',
    isVariantSku: form.isVariantSku,
    variantValues: form.isVariantSku
      ? { specModel: form.specModel, material: form.material, ...form.variantValues }
      : form.variantValues,
    bomOverrides: form.bomOverrides || [],
    weight: Number(form.weight) || 0,
    inventoryUnit: form.inventoryUnit,
    isVariableLength: form.isVariableLength,
    purchaseUnit: form.isVariableLength
      ? form.purchaseUnit
      : form.purchaseUnit || form.inventoryUnit,
    packageContent:
      !form.isVariableLength && Number(form.packContentQty) > 0
        ? Number(form.packContentQty)
        : undefined,
    stockUnit: form.isVariableLength ? form.inventoryUnit || '米' : form.inventoryUnit,
    uomRelation: form.isVariableLength
      ? form.uomRelation ||
        (form.inventoryUnit === '㎡' ||
        form.inventoryUnit === 'm²' ||
        form.inventoryUnit === '平方米'
          ? 'per_piece_area'
          : String(form.inventoryUnit).toLowerCase() === 'kg' ||
              form.inventoryUnit === '公斤' ||
              form.inventoryUnit === '千克'
            ? 'per_piece_weight'
            : 'per_piece_length')
      : '',
    standardSpec: form.standardSpec || '',
    techParams: form.techParams?.trim() || '',
    unitPrice: form.unitPrice ?? 0,
    purchaseUnitPrice: form.purchaseUnitPrice ?? 0,
    packContentQty: form.packContentQty ?? null,
    packContentUnit: form.packContentUnit || form.purchaseUnit || form.inventoryUnit || null,
    standardPackQty: form.standardPackQty ?? null,
    standardPackUnit: form.standardPackUnit || form.inventoryUnit || null,
    canSell: form.canSell,
    canProduce: form.canProduce,
    isWholeMachine: form.isWholeMachine,
    isPart: form.isPart,
    canPurchase: form.canPurchase,
    canOutsource: form.canOutsource,
    isAssemblyPart: showAssemblyPartSwitch.value ? form.isAssemblyPart : false,
    isProductMaterial: isPm,
    materialType: isPm ? form.materialType : undefined,
    materialCategoryKey: isPm ? form.categoryKey : undefined,
    supplyForm: isPm ? form.supplyForm : undefined,
    matchingRequirements: form.matchingRequirements?.trim() || '',
    remark: form.matchingRequirements?.trim() || '',
    outputTaxRate: form.outputTaxRate,
    inputTaxRate: form.inputTaxRate,
    laborEnabled: form.laborEnabled,
    laborRows: form.laborEnabled ? JSON.parse(JSON.stringify(form.laborRows)) : [],
    production: JSON.parse(JSON.stringify(form.production)),
    alert: JSON.parse(JSON.stringify(form.alert)),
  }
}

function buildMaterialPayload() {
  const cat = flatCats.find((c) => c.key === form.categoryKey)
  const parent = cat?.parentKey
    ? flattenCategoryNodes(materialCategoryTree).find((c) => c.key === cat.parentKey)
    : null
  const code = form.code?.trim() || generateProductCode()
  const isPm = derivedItemKind.value === ITEM_KIND.PRODUCT_MATERIAL
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
    materialGradeId: form.materialGradeId || '',
    spuId: form.spuId || '',
    spuName: form.spuName || '',
    isVariantSku: form.isVariantSku,
    variantValues: form.isVariantSku
      ? { specModel: form.specModel, material: form.material, ...form.variantValues }
      : form.variantValues,
    bomOverrides: form.bomOverrides || [],
    techParams: form.techParams?.trim() || '',
    weight: form.weight,
    inventoryUnit: form.inventoryUnit,
    isVariableLength: form.isVariableLength,
    purchaseUnit: form.isVariableLength
      ? form.purchaseUnit
      : form.purchaseUnit || form.inventoryUnit,
    packageContent:
      !form.isVariableLength && Number(form.packContentQty) > 0
        ? Number(form.packContentQty)
        : undefined,
    stockUnit: form.isVariableLength ? form.inventoryUnit || '米' : form.inventoryUnit,
    uomRelation: form.isVariableLength
      ? form.uomRelation ||
        (form.inventoryUnit === '㎡' ||
        form.inventoryUnit === 'm²' ||
        form.inventoryUnit === '平方米'
          ? 'per_piece_area'
          : String(form.inventoryUnit).toLowerCase() === 'kg' ||
              form.inventoryUnit === '公斤' ||
              form.inventoryUnit === '千克'
            ? 'per_piece_weight'
            : 'per_piece_length')
      : '',
    unitPrice: form.unitPrice ?? 0,
    purchaseUnitPrice: form.purchaseUnitPrice ?? 0,
    packContentQty: form.packContentQty ?? null,
    packContentUnit: form.packContentUnit || form.purchaseUnit || form.inventoryUnit || null,
    standardPackQty: form.standardPackQty ?? null,
    standardPackUnit: form.standardPackUnit || form.inventoryUnit || null,
    canSell: form.canSell,
    canProduce: form.canProduce,
    canPurchase: form.canPurchase,
    canOutsource: form.canOutsource,
    isProductMaterial: isPm,
    productAttribute: isPm ? form.productAttribute : undefined,
    productCategoryKey: isPm ? form.productCategoryKey : undefined,
    materialCategoryKey: form.categoryKey,
    isAssemblyPart: isPm ? form.isAssemblyPart : false,
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

function buildSpuPayloadFromForm() {
  const catKey = form.categoryKey || form.productCategoryKey
  const cat =
    flatCats.find((c) => c.key === catKey) || flatProductCats.find((c) => c.key === catKey)
  const parentKey = cat?.parentKey || catKey
  const kind = resolveItemKind({ canSell: form.canSell, canProduce: form.canProduce })
  return {
    id: form.spuId || undefined,
    code: form.spuCode?.trim() || form.code?.trim() || generateSpuCode(),
    name: form.name.trim(),
    categoryKey: catKey,
    parentCategoryKey: parentKey,
    categoryName: cat?.title || '',
    categoryTreeMode: showProductFields.value ? 'product' : 'material',
    itemKind:
      kind === ITEM_KIND.PRODUCT_MATERIAL
        ? 'productMaterial'
        : kind === ITEM_KIND.PRODUCT
          ? 'product'
          : 'material',
    canSell: form.canSell,
    canProduce: form.canProduce,
    canPurchase: form.canPurchase,
    canOutsource: form.canOutsource,
    variantAxes: JSON.parse(JSON.stringify(form.variantAxes || [])),
    skuCodePattern: form.skuCodePattern,
    enabledCombinations: [...(form.enabledCombinationKeys || [])],
    bomStrategy: form.bomStrategy,
    baseBomId: form.baseBomId,
    mixedBomRules: null,
    sharedFields: {
      techParams: form.techParams?.trim() || '',
      materialType: form.materialType,
      supplyForm: form.supplyForm,
      inventoryUnit: form.inventoryUnit,
      categoryKey: catKey,
      parentCategoryKey: parentKey,
      categoryName: cat?.title || '',
      production: JSON.parse(JSON.stringify(form.production)),
    },
  }
}

function saveMultiVariantMaster() {
  const spuPayload = buildSpuPayloadFromForm()
  const spu = form.spuId ? updateSpu(form.spuId, spuPayload) : addSpu(spuPayload)
  const enabledRows = matrixPreviewRef.value?.getEnabledRows?.() || []
  const combos = matrixRowsToSkuCombos(enabledRows)
  if (combos.length) {
    const results = batchGenerateSkus(spu.id, combos)
    const created = results.filter((r) => r.created).length
    message.success(`模板已保存，生成/更新 ${results.length} 个 SKU（新建 ${created}）`)
  } else {
    message.success('模板已保存')
  }
  emit('saved', { spu, mode: 'multiVariant' })
  closeAfterSave()
}

function openTemplateBom() {
  const spuId = form.spuId || props.editSpu?.id
  if (!spuId) {
    message.info('请先保存产品族后再维护族模板 BOM')
    return
  }
  router.push({
    path: '/product-process/bom/new',
    query: { itemType: 'spu', itemId: spuId, itemName: form.name, bomType: '基准BOM' },
  })
}

function handleOk() {
  if (!validate()) return
  if (isMultiVariantMode.value && !isEdit.value) {
    saveMultiVariantMaster()
    return
  }
  if (isSpuEdit.value || (isMultiVariantMode.value && form.spuId)) {
    saveMultiVariantMaster()
    return
  }
  const productPayload = showProductFields.value ? buildProductPayload() : null
  const materialPayload = showMaterialFields.value ? buildMaterialPayload() : null
  const payload = {
    isEdit: isEdit.value,
    id: props.editRecord?.id,
    productPayload,
    materialPayload,
  }
  if (props.pageMode) {
    saveMasterItem(payload)
  } else {
    emit('saved', payload)
  }
  message.success(isEdit.value ? '已更新' : '已保存')
  closeAfterSave()
}
</script>

<style lang="less" scoped>
.material-form-modal,
.master-item-form-modal {
  :deep(.ant-modal-body) {
    max-height: calc(100vh - 200px);
    overflow-y: auto;
    padding-top: 8px;
  }
}

.master-data-mode-row {
  margin-top: 8px;
  display: flex;
  align-items: center;
  gap: 8px;
}
.mode-label {
  font-size: 12px;
  color: rgba(0, 0, 0, 0.65);
}
.spu-code-row {
  margin-top: 6px;
}

.spu-inherit-banner {
  margin: 0 16px 8px;
  padding: 8px 12px;
  background: #e6f4ff;
  border-radius: 4px;
  display: flex;
  align-items: center;
  gap: 8px;
}

.spu-inherit-hint {
  font-size: 12px;
  color: rgba(0, 0, 0, 0.45);
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
  padding: 4px 0 6px;
  border: none;
  border-bottom: 1px solid #d9d9d9;
  border-radius: 0;
  box-shadow: none;

  &:hover,
  &:focus {
    border-bottom-color: #1677ff;
    box-shadow: none;
  }

  :deep(.ant-input) {
    border: none;
    box-shadow: none;
    padding-left: 0;
    padding-right: 0;
  }
}

.entity-capability-row {
  display: flex;
  flex-wrap: wrap;
  gap: 8px 24px;
  margin-top: 8px;
  padding-top: 4px;
  align-items: center;
}

.derived-type-tag {
  font-size: 12px;
  color: rgba(0, 0, 0, 0.65);
  margin-left: 8px;
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
    flex: 0 0 96px;
    max-width: 96px;
  }

  :deep(.ant-form-item-label > label) {
    height: auto;
    min-height: 24px;
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

  .label-wide {
    :deep(.ant-form-item-label) {
      flex: 0 0 128px;
      max-width: 128px;
    }
  }

  .remark-item {
    :deep(.ant-form-item-label) {
      flex: 0 0 96px;
      max-width: 96px;
    }
  }
}

.variant-bom-form {
  margin-top: 8px;
  margin-bottom: 8px;
  padding: 8px 10px;
  background: #fafafa;
  border: 1px solid #f0f0f0;
  border-radius: 6px;

  :deep(.ant-form-item-label) {
    flex: 0 0 88px;
    max-width: 88px;
  }
}

.bom-pending-hint,
.bom-id-text.is-empty {
  font-size: 12px;
  color: rgba(0, 0, 0, 0.45);
}

.bom-id-text {
  font-size: 12px;
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
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

.bom-strategy-help {
  margin: -4px 0 8px;
  padding: 0 4px;
  font-size: 12px;
  color: rgba(0, 0, 0, 0.45);
  line-height: 1.5;
}
</style>
