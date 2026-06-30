<template>
  <div class="ecn-create-page">
    <div class="page-header">
      <div class="header-left">
        <a-button type="text" size="small" class="back-btn" @click="goBack">
          <ArrowLeftOutlined />
        </a-button>
        <span class="page-title">{{ moduleConfig.createPageTitle }}</span>
      </div>
      <a-space>
        <a-button size="small" @click="goBack">取消</a-button>
        <a-button size="small" @click="saveDraft">存草稿</a-button>
        <a-button type="primary" size="small" @click="submit">{{ moduleConfig.submitButtonLabel }}</a-button>
      </a-space>
    </div>

    <div class="form-body">
      <div class="section-card">
        <div class="section-title">基本信息</div>
        <a-form layout="vertical" size="small" class="compact-form">
          <a-row :gutter="12">
            <a-col :span="6">
              <a-form-item label="变更类型" required>
                <a-select v-model:value="form.type" :options="typeOpts" disabled />
              </a-form-item>
            </a-col>
            <a-col :span="6">
              <a-form-item label="变更原因" required>
                <a-select
                  v-model:value="form.changeReason"
                  :options="changeReasonOpts"
                  placeholder="请选择"
                />
              </a-form-item>
            </a-col>
            <a-col :span="6">
              <a-form-item label="紧急程度" required>
                <a-select v-model:value="form.urgency" :options="urgencyOpts" placeholder="请选择" />
              </a-form-item>
            </a-col>
          </a-row>
        </a-form>
      </div>

      <div class="section-card">
        <div class="section-title">关联单据</div>
        <a-radio-group v-model:value="form.originType" class="origin-radio" @change="onOriginTypeChange">
          <a-radio
            v-for="opt in ecnOriginOptions"
            :key="opt.value"
            :value="opt.value"
            :disabled="opt.disabled"
          >
            {{ opt.label }}
          </a-radio>
        </a-radio-group>

        <a-form layout="vertical" size="small" class="origin-form">
          <a-row v-if="form.originType === ECN_ORIGIN_TYPE.SALES_ORDER" :gutter="12">
            <a-col :span="8">
              <a-form-item label="销售订单" required>
                <a-input-group compact class="search-picker">
                  <a-select
                    v-model:value="form.salesOrderNo"
                    show-search
                    allow-clear
                    placeholder="请输入销售订单号"
                    :filter-option="false"
                    :options="salesOrderSelectOpts"
                    style="width: calc(100% - 32px)"
                    @search="onSalesOrderSearch"
                    @change="onSalesOrderSelectChange"
                  />
                  <a-tooltip title="选择销售订单">
                    <a-button size="small" @click="salesOrderModalOpen = true">
                      <SearchOutlined />
                    </a-button>
                  </a-tooltip>
                </a-input-group>
              </a-form-item>
            </a-col>
            <a-col :span="8">
              <a-form-item label="关联产品" required>
                <a-select
                  v-model:value="form.relatedLineId"
                  placeholder="请选择关联产品"
                  :options="productLineOpts"
                  :disabled="!productLineOpts.length"
                  @change="onRelatedLineChange"
                />
              </a-form-item>
            </a-col>
            <a-col v-if="form.productName" :span="8">
              <a-form-item label="EBOM" class="ebom-form-item">
                <div class="ebom-inline">
                  <a-input
                    :value="form.ebomLabel"
                    readonly
                    placeholder="选择关联产品后自动带出"
                    class="ebom-input"
                  />
                  <a-button size="small" :disabled="!bomFlatNodes.length" @click="bomOverviewOpen = true">
                    查看BOM
                  </a-button>
                </div>
              </a-form-item>
            </a-col>
          </a-row>

          <a-row v-if="form.originType === ECN_ORIGIN_TYPE.WORK_ORDER" :gutter="12">
            <a-col :span="8">
              <a-form-item label="工单编号" required>
                <a-input-group compact class="search-picker">
                  <a-select
                    v-model:value="form.workOrderCode"
                    show-search
                    allow-clear
                    placeholder="请输入工单编号"
                    :filter-option="false"
                    :options="workOrderSelectOpts"
                    style="width: calc(100% - 32px)"
                    @search="onWorkOrderSearch"
                    @change="onWorkOrderSelectChange"
                  />
                  <a-tooltip title="选择工单">
                    <a-button size="small" @click="workOrderModalOpen = true">
                      <SearchOutlined />
                    </a-button>
                  </a-tooltip>
                </a-input-group>
              </a-form-item>
            </a-col>
            <a-col :span="8">
              <a-form-item label="关联产品" required>
                <a-input :value="form.productName" readonly placeholder="选择工单后自动带出" />
              </a-form-item>
            </a-col>
            <a-col v-if="form.productName" :span="8">
              <a-form-item label="EBOM" class="ebom-form-item">
                <div class="ebom-inline">
                  <a-input
                    :value="form.ebomLabel"
                    readonly
                    placeholder="选择关联产品后自动带出"
                    class="ebom-input"
                  />
                  <a-button size="small" :disabled="!bomFlatNodes.length" @click="bomOverviewOpen = true">
                    查看BOM
                  </a-button>
                </div>
              </a-form-item>
            </a-col>
          </a-row>
        </a-form>
      </div>

      <div class="section-card">
        <div class="section-title-row">
          <span class="section-title">变更技术内容</span>
          <span class="section-sub">仅维护需要变更的 BOM 行，便于审批与执行</span>
        </div>
        <div class="tech-toolbar">
          <a-space>
            <a-button type="primary" size="small" :disabled="!bomPickerLines.length" @click="openBomPick">
              从 BOM 添加变更项
            </a-button>
            <a-button size="small" :disabled="!form.productName" @click="addEmptyChangeRow">
              新增行
            </a-button>
          </a-space>
          <span v-if="!form.productName" class="tech-hint">请先选择关联产品</span>
          <span v-else-if="!bomPickerLines.length" class="tech-hint">当前产品未关联可选取的 BOM 物料</span>
        </div>
        <EcnChangeItemsTable
          :items="changeItems"
          :bom-picker-lines="bomPickerLines"
          :bom-flat-nodes="bomFlatNodes"
          :bom-line-items="bomLineItems"
          :bom-root-label="form.productName"
          :process-opts="processOpts"
          @remove="removeChangeItem"
          @edit="openChangeEdit"
        />
      </div>

      <div class="section-card">
        <div class="section-title">变更说明</div>
        <a-form layout="vertical" size="small">
          <a-form-item label="变更说明">
            <a-textarea
              v-model:value="form.description"
              :rows="3"
              placeholder="简述变更原由"
            />
          </a-form-item>
        </a-form>
      </div>

      <div class="section-card">
        <div class="section-title-row">
          <span class="section-title">影响分析</span>
          <a-tag color="default">系统自动计算</a-tag>
        </div>
        <a-row :gutter="12" class="impact-row">
          <a-col :span="6">
            <div class="impact-card">
              <div class="impact-value">{{ form.impact.products }}</div>
              <div class="impact-label">影响产品</div>
            </div>
          </a-col>
          <a-col :span="6">
            <div class="impact-card">
              <div class="impact-value">{{ form.impact.bomLines }}</div>
              <div class="impact-label">影响BOM行</div>
            </div>
          </a-col>
          <a-col :span="6">
            <div class="impact-card">
              <div class="impact-value">{{ form.impact.wipOrders }}</div>
              <div class="impact-label">在制工单</div>
            </div>
          </a-col>
          <a-col :span="6">
            <div class="impact-card warn">
              <div class="impact-value">{{ form.impact.inventoryWarnings }}</div>
              <div class="impact-label">库存预警</div>
            </div>
          </a-col>
        </a-row>
      </div>

      <div class="section-card">
        <div class="section-title">附件上传</div>
        <a-upload-dragger
          v-model:file-list="fileList"
          :before-upload="beforeUpload"
          :show-upload-list="false"
          multiple
        >
          <p class="ant-upload-drag-icon">
            <PaperClipOutlined />
          </p>
          <p class="upload-text">点击上传或拖拽文件到此处</p>
          <p class="upload-hint">支持图纸、BOM表、工艺文件，单个文件≤50MB</p>
        </a-upload-dragger>
        <div v-if="form.attachments.length" class="file-list">
          <div v-for="(file, idx) in form.attachments" :key="idx" class="file-item">
            <PaperClipOutlined />
            <span class="file-name">{{ file.name }}</span>
            <span class="file-size">{{ file.size }}</span>
            <a-button type="text" size="small" @click="removeFile(idx)">
              <CloseOutlined />
            </a-button>
          </div>
        </div>
      </div>

      <div class="section-card">
        <div class="section-title-row">
          <span class="section-title">执行配置</span>
          <span class="section-sub">审批通过后生效</span>
        </div>
        <div class="exec-label">BOM 执行方式：</div>
        <a-radio-group v-model:value="form.wipHandling" class="exec-radio-group">
          <a-radio
            v-for="opt in ecnExecConfigOptions"
            :key="opt.value"
            :value="opt.value"
            class="exec-radio-item"
          >
            <div class="radio-row">
              <span class="radio-main">{{ opt.label }}</span>
              <a-tag v-if="opt.recommended" color="blue" class="rec-tag">常用</a-tag>
            </div>
            <div class="radio-sub">{{ opt.sub }}</div>
          </a-radio>
        </a-radio-group>
        <a-checkbox v-if="false" v-model:checked="form.notifyDepartments" class="notify-check">
          自动通知相关部门（采购、生产、质量）
        </a-checkbox>
      </div>
    </div>

    <SalesOrderSelectModal v-model:open="salesOrderModalOpen" @confirm="onSalesOrderPicked" />
    <WorkOrderSelectModal v-model:open="workOrderModalOpen" @confirm="onWorkOrderPicked" />
    <EcnBomParentPickModal
      v-model:open="bomPickOpen"
      title="从 BOM 添加变更项"
      pick-mode="material"
      multiple
      :flat-nodes="bomFlatNodes"
      :line-items="bomLineItems"
      :root-label="form.productName"
      :bom-picker-lines="bomPickerLines"
      :exclude-line-ids="addedBomLineIds"
      @confirm="onBomLinesPicked"
    />
    <EcnChangeItemEditModal
      v-model:open="changeEditOpen"
      :record="editingChangeItem"
      :bom-picker-lines="bomPickerLines"
      :bom-flat-nodes="bomFlatNodes"
      :bom-line-items="bomLineItems"
      :bom-root-label="form.productName"
      :process-opts="processOpts"
      @save="onChangeItemSaved"
    />
    <BomOverviewModal
      v-model:open="bomOverviewOpen"
      simple-toolbar
      :flat-nodes="bomFlatNodes"
      :line-items="bomLineItems"
      :root-item-name="form.productName"
      :overview-info="bomOverviewInfo"
    />
  </div>
</template>

<script>
export default { name: 'EcnCreateView' }
</script>

<script setup>
import { computed, reactive, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { message } from 'ant-design-vue'
import {
  ArrowLeftOutlined,
  PaperClipOutlined,
  CloseOutlined,
  SearchOutlined,
} from '@ant-design/icons-vue'
import {
  ECN_TYPE,
  ECN_URGENCY,
  ECN_STATUS,
  ECN_ORIGIN_TYPE,
  ECN_CHANGE_REASON,
  ECN_WIP_HANDLING,
  ecnOriginOptions,
  ecnCreateTypeOptions,
  ecnChangeReasonOptions,
  ecnExecConfigOptions,
  ECN_CHANGE_ITEM_TYPE,
} from '@/constants/ecn'
import { resolveChangeRequestModule } from '@/constants/changeRequestModule'
import { salesOrderState, getSalesOrderById, findSalesOrderByOrderNo } from '@/store/salesOrderStore'
import { workOrderState } from '@/store/workOrderStore'
import { filterSalesOrdersForPicker } from '@/utils/salesOrderPicker'
import { filterWorkOrdersForPicker } from '@/utils/workOrderPicker'
import { buildProcessesFromRoute, getDefaultProductRoute } from '@/mock/processRoutes'
import {
  resolveProductEbomRef,
  flattenBomLinesForPicker,
  createChangeItemFromBomLine,
  createEmptyChangeItem,
  syncChangeItemLegacyFields,
  isChangeItemParentEditable,
} from '@/utils/ecnProductSource'
import SalesOrderSelectModal from '@/views/production/components/SalesOrderSelectModal.vue'
import WorkOrderSelectModal from './components/WorkOrderSelectModal.vue'
import EcnBomParentPickModal from './components/EcnBomParentPickModal.vue'
import EcnChangeItemsTable from './components/EcnChangeItemsTable.vue'
import EcnChangeItemEditModal from './components/EcnChangeItemEditModal.vue'
import BomOverviewModal from '@/views/product-process/components/BomOverviewModal.vue'

const route = useRoute()
const router = useRouter()
const moduleConfig = resolveChangeRequestModule(route)
const fileList = ref([])
const salesOrderModalOpen = ref(false)
const workOrderModalOpen = ref(false)
const salesOrderKeyword = ref('')
const workOrderKeyword = ref('')
const selectedSalesOrder = ref(null)
const selectedWorkOrder = ref(null)
const selectedProductLine = ref(null)
const bomPickOpen = ref(false)
const changeEditOpen = ref(false)
const bomOverviewOpen = ref(false)
const editingChangeItem = ref(null)
const changeItems = ref([])
const bomPickerLines = ref([])
const bomFlatNodes = ref([])
const bomLineItems = ref([])

const bomOverviewInfo = computed(() => ({
  bomNo: form.productCode || form.bomId || '—',
  specModel: selectedProductLine.value?.specModel || '—',
  version: form.ebomLabel || '—',
  material: '—',
  drawingNo: '—',
  techParams: '—',
  matchingRequirements: '—',
}))

const addedBomLineIds = computed(() =>
  changeItems.value.map((item) => item.bomLineId).filter(Boolean),
)

const typeOpts = ecnCreateTypeOptions
const changeReasonOpts = ecnChangeReasonOptions
const urgencyOpts = Object.values(ECN_URGENCY).map((v) => ({ label: v, value: v }))

const form = reactive({
  originType: ECN_ORIGIN_TYPE.SALES_ORDER,
  salesOrderId: '',
  salesOrderNo: '',
  workOrderId: '',
  workOrderCode: '',
  relatedLineId: undefined,
  productName: '',
  productCode: '',
  productId: '',
  bomId: '',
  ebomLabel: '',
  ebomSourceKind: '',
  ebomSourceId: '',
  processRouteName: '',
  type: ECN_TYPE.BOM,
  changeReason: ECN_CHANGE_REASON.DESIGN,
  urgency: ECN_URGENCY.NORMAL,
  relatedProcesses: [],
  description: '',
  beforeChange: '',
  afterChange: '',
  wipHandling: ECN_WIP_HANDLING.ARCHIVE_UPGRADE,
  notifyDepartments: false,
  impact: { products: 1, bomLines: 3, wipOrders: 12, inventoryWarnings: 2 },
  attachments: [],
})

const salesOrderSelectOpts = computed(() =>
  filterSalesOrdersForPicker(salesOrderState.orders, { orderNo: salesOrderKeyword.value }).map(
    (order) => ({
      label: `${order.orderNo} / ${order.customerName || '—'}`,
      value: order.orderNo,
    }),
  ),
)

const workOrderSelectOpts = computed(() =>
  filterWorkOrdersForPicker(workOrderState.orders, { code: workOrderKeyword.value }).map((wo) => ({
    label: `${wo.code} / ${wo.productName || '—'}`,
    value: wo.code,
  })),
)

const productLineOpts = computed(() => {
  const lines = selectedSalesOrder.value?.lineItems || []
  return lines.map((line) => ({
    label: [line.productName, line.specModel].filter(Boolean).join(' · ') || line.productCode || '—',
    value: line.id,
  }))
})

const processOpts = computed(() => {
  const routeName = form.processRouteName || getDefaultProductRoute(form.productName)
  if (!form.productName) return []
  return buildProcessesFromRoute(routeName).map((p) => ({
    label: p.name,
    value: p.name,
  }))
})

watch(
  () => form.productName,
  () => {
    changeItems.value.forEach((item) => {
      if (!item.relatedProcesses) item.relatedProcesses = []
    })
  },
)

watch(
  () => changeItems.value.length,
  (len) => {
    form.impact.bomLines = len || 0
  },
)

function syncProductSource(extra = {}) {
  const ref = resolveProductEbomRef({
    productName: form.productName,
    productId: form.productId || extra.productId,
    bomId: form.bomId || extra.bomId,
    bomName: extra.bomName,
    bomVersion: extra.bomVersion,
  })
  form.ebomLabel = ref.label
  form.ebomSourceKind = ref.sourceKind
  form.ebomSourceId = ref.sourceId
  bomFlatNodes.value = ref.flatNodes || []
  bomLineItems.value = ref.lineItems || []
  bomPickerLines.value = flattenBomLinesForPicker(ref.flatNodes, ref.lineItems, {
    rootLabel: form.productName || form.ebomLabel,
    productName: form.productName,
  })
  changeItems.value = []
}

function clearOriginFields() {
  form.salesOrderId = ''
  form.salesOrderNo = ''
  form.workOrderId = ''
  form.workOrderCode = ''
  form.relatedLineId = undefined
  form.productName = ''
  form.productCode = ''
  form.productId = ''
  form.bomId = ''
  form.ebomLabel = ''
  form.ebomSourceKind = ''
  form.ebomSourceId = ''
  form.processRouteName = ''
  selectedSalesOrder.value = null
  selectedWorkOrder.value = null
  selectedProductLine.value = null
  salesOrderKeyword.value = ''
  workOrderKeyword.value = ''
  bomFlatNodes.value = []
  bomLineItems.value = []
  bomPickerLines.value = []
  changeItems.value = []
}

function onOriginTypeChange() {
  clearOriginFields()
}

function onSalesOrderSearch(keyword) {
  salesOrderKeyword.value = keyword
}

function applySalesOrder(order) {
  if (!order) return
  selectedSalesOrder.value = order
  form.salesOrderId = order.id
  form.salesOrderNo = order.orderNo
  const firstLine = order.lineItems?.[0]
  form.relatedLineId = firstLine?.id
  applyProductFromLine(firstLine)
}

function onSalesOrderSelectChange(orderNo) {
  if (!orderNo) {
    selectedSalesOrder.value = null
    form.salesOrderId = ''
    form.relatedLineId = undefined
    applyProductFromLine(null)
    return
  }
  const order =
    findSalesOrderByOrderNo(orderNo) ||
    salesOrderState.orders.find((o) => o.orderNo === orderNo) ||
    null
  if (order) applySalesOrder(order)
}

function onSalesOrderPicked(order) {
  applySalesOrder(order)
}

function onRelatedLineChange(lineId) {
  const line = selectedSalesOrder.value?.lineItems?.find((l) => l.id === lineId)
  applyProductFromLine(line)
}

function applyProductFromLine(line) {
  selectedProductLine.value = line || null
  if (!line) {
    form.productName = ''
    form.productCode = ''
    form.productId = ''
    form.bomId = ''
    form.processRouteName = ''
    form.ebomLabel = ''
    bomFlatNodes.value = []
    bomLineItems.value = []
    bomPickerLines.value = []
    changeItems.value = []
    return
  }
  form.productName = line.productName || ''
  form.productCode = line.productCode || line.productName || ''
  form.productId = line.productId || ''
  form.bomId = line.bomId || ''
  form.processRouteName = getDefaultProductRoute(line.productName)
  syncProductSource({
    productId: line.productId,
    bomId: line.bomId,
    bomName: line.bomName,
    bomVersion: line.bomVersion,
  })
}

function onWorkOrderSearch(keyword) {
  workOrderKeyword.value = keyword
}

function applyWorkOrder(wo) {
  if (!wo) return
  selectedWorkOrder.value = wo
  selectedProductLine.value = null
  form.workOrderId = wo.id
  form.workOrderCode = wo.code
  form.productName = wo.productName || ''
  form.productCode = wo.materialCode || wo.productName || ''
  form.productId = wo.itemId || wo.productId || ''
  form.bomId = wo.bomId || ''
  form.processRouteName = wo.processRouteName || getDefaultProductRoute(wo.productName)
  form.salesOrderNo = wo.sourceOrderNo || ''
  syncProductSource({ bomId: wo.bomId, bomName: wo.bom })
}

function onWorkOrderSelectChange(code) {
  if (!code) {
    selectedWorkOrder.value = null
    form.workOrderId = ''
    applyProductFromLine(null)
    return
  }
  const wo = workOrderState.orders.find((o) => o.code === code) || null
  if (wo) applyWorkOrder(wo)
}

function onWorkOrderPicked(wo) {
  applyWorkOrder(wo)
}

function openBomPick() {
  if (!bomPickerLines.value.length) {
    message.warning('当前产品无可选取的 BOM 物料')
    return
  }
  bomPickOpen.value = true
}

function onBomLinesPicked(lines) {
  const existing = new Set(addedBomLineIds.value)
  lines.forEach((line) => {
    if (existing.has(line.id)) return
    changeItems.value.push(createChangeItemFromBomLine(line))
  })
}

function addEmptyChangeRow() {
  changeItems.value.push(createEmptyChangeItem())
}

function openChangeEdit(record) {
  editingChangeItem.value = record
  changeEditOpen.value = true
}

function onChangeItemSaved(payload) {
  if (!editingChangeItem.value) return
  Object.assign(editingChangeItem.value, payload)
  syncChangeItemLegacyFields(editingChangeItem.value)
}

function removeChangeItem(id) {
  changeItems.value = changeItems.value.filter((item) => item.id !== id)
}

function goBack() {
  router.push(moduleConfig.listPath)
}

function beforeUpload(file) {
  form.attachments.push({
    name: file.name,
    size: `${Math.round(file.size / 1024)}KB`,
  })
  return false
}

function removeFile(idx) {
  form.attachments.splice(idx, 1)
}

function validateForm() {
  if (form.originType === ECN_ORIGIN_TYPE.SALES_ORDER) {
    if (!form.salesOrderNo) {
      message.warning('请选择销售订单')
      return false
    }
    if (!form.relatedLineId || !form.productName) {
      message.warning('请选择关联产品')
      return false
    }
  }
  if (form.originType === ECN_ORIGIN_TYPE.WORK_ORDER) {
    if (!form.workOrderCode) {
      message.warning('请选择工单编号')
      return false
    }
    if (!form.productName) {
      message.warning('关联产品未带出，请重新选择工单')
      return false
    }
  }
  if (!form.changeReason) {
    message.warning('请选择变更原因')
    return false
  }
  if (!changeItems.value.length) {
    message.warning('请至少添加一条 BOM 变更项')
    return false
  }
  for (const item of changeItems.value) {
    syncChangeItemLegacyFields(item)
    if (item.changeType === ECN_CHANGE_ITEM_TYPE.ADD) {
      if (!item.newMaterialCode || !item.newMaterialName) {
        message.warning('新增变更项请填写新物料')
        return false
      }
      if (!item.parentPath) {
        message.warning('新增变更项请选择父级物料')
        return false
      }
    }
    if (isChangeItemParentEditable(item) && !item.parentPath) {
      message.warning('请填写父级物料')
      return false
    }
    if (item.changeType !== ECN_CHANGE_ITEM_TYPE.REMOVE && (item.newUnitQty == null || item.newUnitQty === '')) {
      message.warning('请填写新单位用量')
      return false
    }
    if (item.generateDocument) {
      if (item.planQty == null || item.planQty === '') {
        message.warning('已开启关联生成单据，请填写计划数量')
        return false
      }
      if (!item.planDate) {
        message.warning('已开启关联生成单据，请选择计划日期')
        return false
      }
    }
  }
  return true
}

function buildPayload(status) {
  const order =
    selectedSalesOrder.value ||
    (form.salesOrderId ? getSalesOrderById(form.salesOrderId) : findSalesOrderByOrderNo(form.salesOrderNo))
  const allProcesses = [
    ...new Set(changeItems.value.flatMap((item) => item.relatedProcesses || [])),
  ]
  return {
    ...form,
    applicant: '张工',
    status,
    reason: form.changeReason,
    changeReason: form.changeReason,
    productName: form.productName,
    salesOrderNo: form.salesOrderNo || order?.orderNo || selectedWorkOrder.value?.sourceOrderNo || '',
    customerName: order?.customerName || '',
    workOrderNo: form.workOrderCode || '',
    ebomLabel: form.ebomLabel,
    relatedProcess: allProcesses.join('、'),
    relatedProcesses: allProcesses,
    changeItems: changeItems.value.map((item) => {
      syncChangeItemLegacyFields(item)
      return { ...item }
    }),
  }
}

function saveDraft() {
  moduleConfig.store.saveDraft(buildPayload(ECN_STATUS.DRAFT))
  message.success('草稿已保存')
  goBack()
}

function submit() {
  if (!validateForm()) return
  moduleConfig.store.add(buildPayload(ECN_STATUS.APPROVING))
  message.success(moduleConfig.submitSuccessMessage)
  goBack()
}
</script>

<style lang="less" scoped>
.ecn-create-page {
  margin: -12px;
  padding: 0 0 24px;
  background: #f5f6f8;
  min-height: calc(100vh - 112px);
}

.page-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 16px;
  background: #fff;
  border-bottom: 1px solid #f0f0f0;
}

.header-left {
  display: flex;
  align-items: center;
  gap: 4px;
}

.back-btn {
  padding: 0 4px;
}

.page-title {
  font-size: 16px;
  font-weight: 600;
}

.form-body {
  padding: 12px;
}

.section-card {
  background: #fff;
  border-radius: 6px;
  padding: 16px;
  margin-bottom: 12px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
}

.section-title {
  font-size: 14px;
  font-weight: 600;
  margin-bottom: 12px;
  color: #1f1f1f;
}

.section-title-row {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 12px;

  .section-title {
    margin-bottom: 0;
  }
}

.section-sub {
  font-size: 12px;
  color: #8c8c8c;
}

.origin-radio {
  display: flex;
  flex-wrap: wrap;
  gap: 16px;
  margin-bottom: 16px;
}

.origin-form {
  margin-top: 4px;
}

.search-picker {
  display: flex;
  width: 100%;

  :deep(.ant-select) {
    flex: 1;
  }
}

.ebom-form-item {
  :deep(.ant-form-item-control-input-content) {
    min-width: 0;
  }
}

.ebom-inline {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: nowrap;
  width: 100%;
  min-width: 0;
}

.ebom-input {
  flex: 1;
  min-width: 0;

  :deep(input) {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
}

.impact-row {
  margin-top: 4px;
}

.impact-card {
  background: #fafafa;
  border-radius: 6px;
  padding: 16px;
  text-align: center;

  &.warn .impact-value {
    color: #fa8c16;
  }
}

.impact-value {
  font-size: 24px;
  font-weight: 600;
  color: #1f1f1f;
  line-height: 1.2;
}

.impact-label {
  font-size: 12px;
  color: #8c8c8c;
  margin-top: 4px;
}

.upload-text {
  margin: 0;
  font-size: 14px;
  color: #595959;
}

.upload-hint {
  margin: 4px 0 0;
  font-size: 12px;
  color: #bfbfbf;
}

.file-list {
  margin-top: 12px;
}

.file-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
  background: #fafafa;
  border-radius: 4px;
  margin-bottom: 6px;
  font-size: 13px;

  .file-name {
    flex: 1;
    color: #1677ff;
  }

  .file-size {
    color: #8c8c8c;
  }
}

.exec-label {
  font-size: 13px;
  color: #595959;
  margin-bottom: 8px;
}

.exec-type-hint {
  display: flex;
  align-items: flex-start;
  gap: 6px;
  padding: 8px 12px;
  margin-bottom: 12px;
  background: #e6f4ff;
  border: 1px solid #91caff;
  border-radius: 6px;
  font-size: 12px;
  color: #0958d9;
  line-height: 1.6;
}

.exec-scope-group {
  margin-bottom: 16px;

  &:last-child {
    margin-bottom: 0;
  }
}

.exec-group-head {
  display: flex;
  align-items: baseline;
  gap: 8px;
  margin-bottom: 10px;
}

.exec-group-title {
  font-size: 13px;
  font-weight: 600;
  color: #262626;
}

.exec-group-hint {
  font-size: 12px;
  color: #8c8c8c;
}

.exec-group-options {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.exec-radio-group {
  display: flex;
  flex-direction: column;
  width: 100%;

  :deep(.ant-radio-wrapper) {
    align-items: flex-start;
    margin-inline-end: 0;
    width: 100%;
    padding: 10px 12px;
    border: 1px solid #f0f0f0;
    border-radius: 6px;
    transition: border-color 0.2s, background 0.2s;
  }

  :deep(.ant-radio-wrapper-checked) {
    border-color: #91caff;
    background: #f0f7ff;
  }
}

.radio-row {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}

.rec-tag {
  margin: 0;
  line-height: 18px;
  font-size: 11px;
}

.radio-main {
  font-size: 13px;
  color: #1f1f1f;
}

.radio-sub {
  font-size: 12px;
  color: #8c8c8c;
  margin-top: 2px;
}

.notify-check {
  margin-top: 16px;
}

.tech-toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 8px;
  flex-wrap: wrap;
  gap: 8px;
}

.tech-hint {
  font-size: 12px;
  color: #8c8c8c;
}
</style>
