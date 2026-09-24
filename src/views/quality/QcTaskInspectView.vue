<template>
  <div class="qc-inspect-page">
    <a-spin :spinning="loading">
      <template v-if="task">
        <div class="page-header">
          <div class="header-left">
            <span class="page-title">录入质检结果</span>
            <span class="page-sub">{{ task.qcNo }}</span>
            <a-tag :color="statusColor(task.qcStatus)">{{ task.qcStatus }}</a-tag>
          </div>
          <a-space>
            <a-button size="small" @click="handleCancel">取消</a-button>
            <a-button type="primary" size="small" :loading="saving" @click="handleOk">
              确认
            </a-button>
          </a-space>
        </div>

        <div class="section-card">
          <div class="section-title">基本信息</div>
          <a-form layout="inline" class="header-form horizontal-form">
            <a-row :gutter="[12, 12]" style="width: 100%">
              <a-col :span="6">
                <a-form-item label="质检单号">
                  <a-input :value="task.qcNo" disabled size="small" />
                </a-form-item>
              </a-col>
              <template v-if="isProductionScope">
                <a-col :span="6">
                  <a-form-item label="工单号">
                    <a-input :value="productionHeader.workOrderNo || '—'" disabled size="small" />
                  </a-form-item>
                </a-col>
                <a-col :span="6">
                  <a-form-item label="工序">
                    <a-input :value="productionHeader.processName || '—'" disabled size="small" />
                  </a-form-item>
                </a-col>
                <a-col :span="6">
                  <a-form-item label="工作中心">
                    <a-input :value="productionHeader.workCenter || '—'" disabled size="small" />
                  </a-form-item>
                </a-col>
                <a-col :span="6">
                  <a-form-item label="工艺路线">
                    <a-input :value="productionHeader.processRoute || '—'" disabled size="small" />
                  </a-form-item>
                </a-col>
                <a-col :span="6">
                  <a-form-item label="排产数量">
                    <a-input
                      :value="formatQty(productionHeader.scheduleQty)"
                      disabled
                      size="small"
                    />
                  </a-form-item>
                </a-col>
                <a-col :span="6">
                  <a-form-item label="排产批次">
                    <a-input :value="productionHeader.scheduleBatch || '—'" disabled size="small" />
                  </a-form-item>
                </a-col>
              </template>
              <template v-else>
                <a-col :span="6">
                  <a-form-item label="来源单号">
                    <a-input :value="task.sourceDocNo" disabled size="small" />
                  </a-form-item>
                </a-col>
                <a-col :span="6">
                  <a-form-item :label="isFactoryScope ? '客户名称' : '供应商'">
                    <a-input :value="task.supplier" disabled size="small" />
                  </a-form-item>
                </a-col>
              </template>
              <a-col :span="6">
                <a-form-item label="质检人">
                  <a-input v-model:value="form.inspector" size="small" placeholder="请输入质检人" />
                </a-form-item>
              </a-col>
              <a-col :span="isProductionScope ? 24 : 12">
                <a-form-item label="备注" class="remark-item">
                  <a-textarea
                    v-model:value="form.remark"
                    :rows="1"
                    :maxlength="200"
                    show-count
                    placeholder="选填"
                  />
                </a-form-item>
              </a-col>
            </a-row>
          </a-form>
        </div>

        <div class="section-card inspect-lines-card">
          <div class="section-title">质检明细（{{ form.lineItems.length }}）</div>
          <div v-if="form.lineItems.length" class="line-card-list">
            <div
              v-for="(record, index) in form.lineItems"
              :key="record.id"
              class="line-card"
              :class="{ 'is-collapsed': !isLineExpanded(record.id) }"
            >
              <div class="line-card-head" @click="toggleLine(record.id)">
                <div class="line-card-head-main">
                  <span class="line-card-index">{{ index + 1 }}</span>
                  <div class="line-card-identity">
                    <div class="line-card-name">
                      <span class="line-card-item-name">{{ record.itemName || '—' }}</span>
                      <span class="line-card-item-code">{{ record.itemCode || '—' }}</span>
                    </div>
                    <div class="line-card-meta">
                      <span>规格 {{ record.specModel || '—' }}</span>
                      <span class="meta-sep">·</span>
                      <span>材质 {{ record.material || '—' }}</span>
                      <span class="meta-sep">·</span>
                      <span>{{ record.templateName || record.templateCode || '—' }}</span>
                      <span class="meta-sep">·</span>
                      <span>{{ sheetPassRuleLabel(resolveLineSheetPassRule(record, task)) }}</span>
                      <span class="meta-sep">·</span>
                      <span
                        >{{ lineQtyLabel }}
                        {{ formatQty(record.receiptQty ?? record.shipQty) }}</span
                      >
                    </div>
                  </div>
                </div>
                <a-button type="link" size="small" @click.stop="toggleLine(record.id)">
                  {{ isLineExpanded(record.id) ? '收起' : '展开' }}
                </a-button>
              </div>

              <div v-show="isLineExpanded(record.id)" class="line-sheet-wrap">
                <!-- 行内基本信息：方式 / 数量 / 备注 -->
                <div v-if="headerFields(record).length" class="line-sheet-section">
                  <div class="line-sheet-title">基本信息</div>
                  <div class="line-header-grid">
                    <div
                      v-for="field in headerFields(record)"
                      :key="field.code"
                      class="line-header-item"
                    >
                      <label class="line-field-label">
                        <span v-if="field.required !== false" class="req">*</span>
                        {{ field.name }}
                      </label>
                      <a-select
                        v-if="isQcInspectMethodField(field) || isSelectLike(field)"
                        v-model:value="record.fieldMap[field.code]"
                        size="middle"
                        allow-clear
                        style="width: 100%"
                        :placeholder="field.placeholder || `请选择${field.name}`"
                        :options="
                          isQcInspectMethodField(field)
                            ? methodOptsFor(record)
                            : fieldOptions(field)
                        "
                        @change="() => onFieldChange(record, field)"
                      />
                      <a-input-number
                        v-else-if="field.type === 'number' || isQcInspectQtyField(field)"
                        v-model:value="record.fieldMap[field.code]"
                        size="middle"
                        :min="0"
                        style="width: 100%"
                        :formatter="qtyFormatter"
                        :parser="qtyParser"
                        :placeholder="field.placeholder || `请输入${field.name}`"
                        @change="() => onFieldChange(record, field)"
                      />
                      <a-input
                        v-else-if="field.type === 'textarea'"
                        v-model:value="record.fieldMap[field.code]"
                        size="middle"
                        allow-clear
                        style="width: 100%"
                        :placeholder="field.placeholder || `请输入${field.name}`"
                        @change="() => onFieldChange(record, field)"
                      />
                      <a-input
                        v-else
                        v-model:value="record.fieldMap[field.code]"
                        size="middle"
                        allow-clear
                        style="width: 100%"
                        :placeholder="field.placeholder || `请输入${field.name}`"
                        @change="() => onFieldChange(record, field)"
                      />
                    </div>
                  </div>
                </div>

                <!-- 检验项目 -->
                <div class="line-sheet-section">
                  <div class="line-sheet-title">检验项目</div>
                  <div v-if="inspectFields(record).length" class="inspect-fields-grid">
                    <template v-for="field in inspectFields(record)" :key="field.code">
                      <QcInspectComplexField
                        v-if="isComplexField(field)"
                        :field="field"
                        v-model="record.fieldMap[field.code]"
                        @change="onFieldChange(record, field)"
                      />
                      <div
                        v-else
                        class="inspect-field-card"
                        :class="{
                          'is-pass': judgeHint(record, field) === 'pass',
                          'is-fail': judgeHint(record, field) === 'fail',
                        }"
                      >
                        <div class="inspect-field-head">
                          <div class="inspect-field-title">
                            <span v-if="field.required !== false" class="req">*</span>
                            {{ field.name }}
                            <a-tag v-if="field.keyForSheetPass" color="warning" class="key-item-tag"
                              >关键项</a-tag
                            >
                          </div>
                          <a-tag
                            v-if="judgeHint(record, field) === 'pass'"
                            color="success"
                            class="judge-tag"
                          >
                            合格
                          </a-tag>
                          <a-tag
                            v-else-if="judgeHint(record, field) === 'fail'"
                            color="error"
                            class="judge-tag"
                          >
                            不合格
                          </a-tag>
                          <span v-else class="judge-placeholder">待判定</span>
                        </div>
                        <div class="inspect-field-standard">
                          <template v-if="standardHint(field)">
                            合格标准：{{ standardHint(field) }}
                          </template>
                          <template v-else>合格标准：未设置（仅记录实测值）</template>
                        </div>
                        <div v-if="isCountByQtyField(field)" class="count-by-qty-row">
                          <div class="count-by-qty-item">
                            <span class="count-by-qty-label"
                              ><span v-if="field.required !== false" class="req">*</span
                              >合格数</span
                            >
                            <a-input-number
                              :value="getCountByQtyPass(record, field)"
                              size="middle"
                              :min="0"
                              :precision="4"
                              :formatter="qtyFormatter"
                              :parser="qtyParser"
                              placeholder="数量"
                              style="width: 120px"
                              @update:value="(v) => setCountByQtyPass(record, field, v)"
                            />
                          </div>
                          <div class="count-by-qty-item">
                            <span class="count-by-qty-label"
                              ><span v-if="field.required !== false" class="req">*</span
                              >不合格数</span
                            >
                            <a-input-number
                              :value="getCountByQtyFail(record, field)"
                              size="middle"
                              :min="0"
                              :precision="4"
                              :formatter="qtyFormatter"
                              :parser="qtyParser"
                              placeholder="数量"
                              style="width: 120px"
                              @update:value="(v) => setCountByQtyFail(record, field, v)"
                            />
                          </div>
                          <span class="count-by-qty-cap"
                            >合计 ≤ 质检数量（{{ formatQty(lineInspectQty(record), 4) }}）</span
                          >
                        </div>
                        <template v-else>
                          <div class="field-input-wrap">
                            <span v-if="unitPrefix(field)" class="unit-affix">{{
                              unitPrefix(field)
                            }}</span>
                            <a-select
                              v-if="isSelectLike(field)"
                              :value="getMeasuredValue(record, field)"
                              size="middle"
                              allow-clear
                              :placeholder="field.placeholder || `请选择${field.name}`"
                              :options="fieldOptions(field)"
                              style="flex: 1; min-width: 0"
                              @update:value="(v) => setMeasuredValue(record, field, v)"
                            />
                            <a-input-number
                              v-else-if="field.type === 'number'"
                              :value="getMeasuredValue(record, field)"
                              size="middle"
                              :min="0"
                              style="flex: 1; min-width: 0"
                              :formatter="qtyFormatter"
                              :parser="qtyParser"
                              :placeholder="field.placeholder || `请输入${field.name}`"
                              @update:value="(v) => setMeasuredValue(record, field, v)"
                            />
                            <a-input
                              v-else
                              :value="getMeasuredValue(record, field)"
                              size="middle"
                              allow-clear
                              style="flex: 1; min-width: 0"
                              :placeholder="field.placeholder || `请输入${field.name}`"
                              @update:value="(v) => setMeasuredValue(record, field, v)"
                            />
                            <span v-if="unitSuffix(field)" class="unit-affix">{{
                              unitSuffix(field)
                            }}</span>
                          </div>
                          <div v-if="isManualJudgeField(field)" class="manual-judgment-row">
                            <span class="manual-label"><span class="req">*</span>本项结论</span>
                            <a-select
                              :value="getManualJudgment(record, field)"
                              size="middle"
                              allow-clear
                              placeholder="请选择本项结论"
                              :options="listManualJudgmentSelectOptions(field)"
                              style="flex: 1; min-width: 0"
                              @update:value="(v) => setManualJudgment(record, field, v)"
                            />
                          </div>
                        </template>
                      </div>
                    </template>
                  </div>
                  <div v-else class="muted">该模板未配置检验项目</div>
                </div>

                <!-- 整单结论 + 处理方案（业务处置，非模板指标） -->
                <div class="line-sheet-section line-conclusion-section">
                  <div class="line-conclusion-head">
                    <div class="line-conclusion-left">
                      <div class="line-sheet-title">整单结论</div>
                      <div class="line-conclusion-hint">{{ conclusionHintFor(record) }}</div>
                    </div>
                    <div class="line-conclusion-right">
                      <div
                        v-if="isAutoConclusionLine(record)"
                        class="auto-conclusion-box"
                        :class="{
                          'is-pass': autoConclusionStatus(record) === 'pass',
                          'is-fail': autoConclusionStatus(record) === 'fail',
                          'is-pending':
                            autoConclusionStatus(record) === 'pending' ||
                            autoConclusionStatus(record) === 'unavailable',
                        }"
                      >
                        <a-tag v-if="autoConclusionStatus(record) === 'pass'" color="success">{{
                          getConclusionValue(record) || '合格'
                        }}</a-tag>
                        <a-tag v-else-if="autoConclusionStatus(record) === 'fail'" color="error">{{
                          getConclusionValue(record) || '不合格'
                        }}</a-tag>
                        <a-tag v-else color="default">待判定</a-tag>
                        <span class="auto-conclusion-text">{{
                          autoConclusionReason(record) || '系统自动判定'
                        }}</span>
                      </div>
                      <a-select
                        v-else
                        v-model:value="record.fieldMap[conclusionCode(record)]"
                        size="middle"
                        placeholder="请选择整单结论"
                        style="width: 200px"
                        :options="conclusionOptsFor(record)"
                        @change="onConclusionChange(record)"
                      />
                    </div>
                  </div>
                  <template v-if="showDispositionForLine(record)">
                    <div class="line-treatment-row">
                      <div class="line-treatment-label">
                        <span v-if="requireDispositionQtyForLine(record)" class="req">*</span
                        >数量处置
                        <span class="line-treatment-tip">{{ dispositionLabels.treatmentTip }}</span>
                      </div>
                      <span
                        v-if="!requireDispositionQtyForLine(record)"
                        class="line-treatment-idle"
                        >{{ dispositionLabels.passOptionalTip }}</span
                      >
                    </div>
                    <div class="line-disposition-row">
                      <div class="line-treatment-label">
                        <span class="line-treatment-tip"
                          >{{ dispositionLabels.tip }}（收货
                          {{ formatQty(lineReceiptQty(record), 4) }}）</span
                        >
                      </div>
                      <div class="line-disposition-fields">
                        <div class="line-disposition-item">
                          <span class="line-disposition-item-label">{{
                            dispositionLabels.accept
                          }}</span>
                          <a-input-number
                            v-model:value="record.acceptInboundQty"
                            size="middle"
                            :min="0"
                            :precision="4"
                            :formatter="qtyFormatter"
                            :parser="qtyParser"
                            placeholder="数量"
                            style="width: 120px"
                            @change="() => onDispositionQtyChange(record, 'accept')"
                          />
                        </div>
                        <div class="line-disposition-item">
                          <span class="line-disposition-item-label">{{
                            dispositionLabels.concession
                          }}</span>
                          <a-input-number
                            v-model:value="record.concessionQty"
                            size="middle"
                            :min="0"
                            :precision="4"
                            :formatter="qtyFormatter"
                            :parser="qtyParser"
                            placeholder="数量"
                            style="width: 120px"
                            @change="() => onDispositionQtyChange(record, 'concession')"
                          />
                        </div>
                        <div class="line-disposition-item">
                          <span class="line-disposition-item-label">{{
                            dispositionLabels.secondary
                          }}</span>
                          <a-input-number
                            v-model:value="record.returnQty"
                            size="middle"
                            :min="0"
                            :precision="4"
                            :formatter="qtyFormatter"
                            :parser="qtyParser"
                            placeholder="数量"
                            style="width: 120px"
                            @change="() => onDispositionQtyChange(record, 'return')"
                          />
                        </div>
                        <div class="line-disposition-item">
                          <span class="line-disposition-item-label">{{
                            dispositionLabels.tertiary
                          }}</span>
                          <a-input-number
                            v-model:value="record.exchangeQty"
                            size="middle"
                            :min="0"
                            :precision="4"
                            :formatter="qtyFormatter"
                            :parser="qtyParser"
                            placeholder="数量"
                            style="width: 120px"
                            @change="() => onDispositionQtyChange(record, 'exchange')"
                          />
                        </div>
                      </div>
                      <div v-if="multiBucketDispositionHint(record)" class="line-disposition-hint">
                        {{ multiBucketDispositionHint(record) }}
                      </div>
                      <div v-if="record.treatmentPlan" class="line-disposition-summary">
                        方案汇总：{{ record.treatmentPlan }}
                      </div>
                    </div>
                  </template>
                </div>
              </div>
            </div>
          </div>
          <a-empty v-else description="暂无质检明细" />
        </div>
      </template>
      <a-empty v-else-if="!loading" description="未找到该质检单或不可录入" />
    </a-spin>
  </div>
</template>

<script>
export default { name: 'QcTaskInspectView' }
</script>

<script setup>
import { computed, reactive, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { Modal, message } from 'ant-design-vue'
import {
  QC_CONCLUSION_CONCESSION_OPTION,
  QC_CONCLUSION_FIELD_CODE,
  QC_CONCLUSION_PARTIAL_OPTION,
  findQcConclusionField,
  isQcConclusionField,
  isQcInspectMethodField,
  isQcInspectQtyField,
  isQcInspectRemarkField,
  mapConclusionValueToQcResult,
  normalizeConclusionOptionItems,
} from '@/utils/qcConclusionField'
import {
  QC_TASK_STATUS,
  canInspectQcTask,
  getQcTaskById,
  startQcTaskInspection,
  submitQcTaskInspection,
} from '@/store/qcTaskStore'
import {
  FACTORY_QC_BIZ_SCOPE,
  canInspect as canInspectFactoryQc,
  getFactoryQcById,
  submitFactoryQcInspection,
  toFactoryQcInspectTask,
} from '@/store/factoryQcStore'
import { formatQty } from '@/utils/numberFormat'
import {
  getDispositionFieldLabels,
  isMultiBucketDisposition,
  buildTreatmentPlanSummary,
} from '@/utils/qcTreatmentPlan'
import { useTabs, tabStore } from '@/composables/useTabs'
import { getQcTaskRouteBundle } from '@/utils/qcTaskRoutes'
import {
  QC_UNIT_POSITION,
  buildStandardText,
  evaluateFieldAgainstStandard,
  isManualJudgeField,
  isManualJudgmentMissing,
  listManualJudgmentSelectOptions,
  normalizeUnitPosition,
  parseManualFieldValue,
  pickFieldStandardProps,
  wrapManualFieldValue,
} from '@/utils/qcFieldStandard'
import {
  isCountByQtyField,
  parseCountByQtyValue,
  wrapCountByQtyValue,
  validateCountByQtyValue,
} from '@/utils/qcFieldCountByQty'
import {
  collectAllFailingStandardHints,
  evaluateComplexOrSimpleField,
  isComplexField,
  isComplexValueEmpty,
  isMatrixField,
  normalizeComplexValue,
} from '@/utils/qcComplexField'
import {
  QC_TEMPLATE_SHEET_PASS_RULE,
  isAutoSheetConclusionRule,
  normalizeSheetPassRule,
  resolveAutoSheetConclusion,
  sheetPassRuleLabel,
  validateLineSheetPassRule,
} from '@/utils/qcTemplateSheetPass'
import { QC_TASK_RESULT } from '@/constants/qcTaskResult'
import { getQcLibraryFieldByCode, ensureQcLibraryDemoSeed } from '@/store/qcFieldLibraryStore'
import { isProductionQcScope, resolveProductionQcHeader } from '@/utils/qcProductionContext'
import { getQcTemplateByCode, ensureQcTemplateDemoSeed } from '@/store/qcTemplateStore'
import { cloneTemplateFieldsSnapshot } from '@/store/qcTaskStore'
import QcInspectComplexField from './components/QcInspectComplexField.vue'

const route = useRoute()
const router = useRouter()
const { closeTab } = useTabs()

const bizScope = computed(() => route.meta.bizScope || task.value?.bizScope || '来料质检')
const isFactoryScope = computed(() => bizScope.value === FACTORY_QC_BIZ_SCOPE)
const isProductionScope = computed(() => isProductionQcScope(bizScope.value))
const productionHeader = computed(() => resolveProductionQcHeader(task.value))
const lineQtyLabel = computed(() => {
  if (isProductionScope.value) return '排产'
  if (isFactoryScope.value) return '发货'
  return '收货'
})
const detailRouteName = computed(() => getQcTaskRouteBundle(bizScope.value).detailName)

const loading = ref(false)
const saving = ref(false)
const task = ref(null)
const expandedKeys = ref([])
const form = reactive({
  inspector: 'admin1',
  remark: '',
  lineItems: [],
})

/** 来料 / 外协：多数量桶（无单选方案） */
const dispositionLabels = computed(() => getDispositionFieldLabels(task.value?.bizScope))

function supportsDispositionBizScope(scope) {
  return isMultiBucketDisposition(scope)
}

function isLineExpanded(id) {
  return expandedKeys.value.includes(id)
}

function toggleLine(id) {
  const idx = expandedKeys.value.indexOf(id)
  if (idx >= 0) {
    expandedKeys.value = expandedKeys.value.filter((k) => k !== id)
  } else {
    expandedKeys.value = [...expandedKeys.value, id]
  }
}

function loadPage() {
  ensureQcLibraryDemoSeed()
  ensureQcTemplateDemoSeed()
  const id = route.params.id
  loading.value = true

  let row = null
  if (route.meta.bizScope === FACTORY_QC_BIZ_SCOPE) {
    const factoryRow = getFactoryQcById(id)
    row = toFactoryQcInspectTask(factoryRow)
    task.value = row
    loading.value = false
    if (!factoryRow) return
    if (!canInspectFactoryQc(factoryRow)) {
      message.warning('当前状态不可录入质检结果')
      return
    }
    if (!(row.lineItems || []).some((l) => (l.templateFields || []).length)) {
      message.warning('未匹配到出厂质检模板，请先在质检模板中配置「出厂质检」业务类型模板')
      return
    }
  } else {
    row = getQcTaskById(id)
    task.value = row
    loading.value = false
    if (!row) return
    if (!canInspectQcTask(row)) {
      message.warning('当前状态不可录入质检结果')
      return
    }
    startQcTaskInspection(row.id, { entryChannel: 'web' })
    task.value = getQcTaskById(id) || row
  }

  form.inspector = task.value.inspector || 'admin1'
  form.remark = task.value.remark || ''
  form.lineItems = JSON.parse(JSON.stringify(task.value.lineItems || [])).map((line) =>
    hydrateLineDraft(line, task.value),
  )
  // 默认全部展开，便于按模板分区录入
  expandedKeys.value = form.lineItems.map((l) => l.id)

  const tab = tabStore.tabs.find((t) => t.path === route.path)
  if (tab) tab.title = `质检 ${task.value.qcNo || ''}`.trim()
}

watch(() => route.params.id, loadPage, { immediate: true })

function resolveLineFields(line, t) {
  const frozen =
    Array.isArray(line.templateFields) && line.templateFields.length
      ? line.templateFields
      : t?.templateFields || []
  const hasComplex = (frozen || []).some(
    (f) => f.type === 'composite' || f.type === 'matrix' || f.code === 'QC_RUN_TEST',
  )
  if (hasComplex) {
    return cloneTemplateFieldsSnapshot(
      frozen,
      line.sheetConclusionOptionItems || t?.sheetConclusionOptionItems,
    )
  }
  const live = getQcTemplateByCode(line.templateCode || t?.templateCode)
  if (live?.fields?.length) {
    return cloneTemplateFieldsSnapshot(live.fields, live.sheetConclusionOptionItems)
  }
  return cloneTemplateFieldsSnapshot(
    frozen,
    line.sheetConclusionOptionItems || t?.sheetConclusionOptionItems,
  )
}

function resolveLineSheetPassRule(line, t) {
  if (line?.sheetPassRule) return normalizeSheetPassRule(line.sheetPassRule)
  const live = getQcTemplateByCode(line?.templateCode || t?.templateCode)
  if (live?.sheetPassRule) return normalizeSheetPassRule(live.sheetPassRule)
  return QC_TEMPLATE_SHEET_PASS_RULE.MANUAL
}

function hydrateLineDraft(line, t) {
  const fields = resolveLineFields(line, t)
  const fieldMap = {}
  ;(line.fieldValues || []).forEach((v) => {
    const code = v.fieldCode || v.code
    if (code) fieldMap[code] = v.value ?? v.fieldValue
  })

  fields.forEach((f) => {
    if (isComplexField(f)) {
      fieldMap[f.code] = normalizeComplexValue(f, fieldMap[f.code])
      return
    }
    if (isManualJudgeField(f)) {
      const existing = fieldMap[f.code]
      const defJudgment =
        listManualJudgmentSelectOptions(f).find((o) => {
          const items = f.manualOptionItems || []
          return items.some((it) => it.value === o.value && it.isDefault)
        })?.value ||
        (f.manualOptionItems || []).find((o) => o.isDefault)?.value ||
        ''
      if (existing !== undefined && existing !== null && existing !== '') {
        const parsed = parseManualFieldValue(existing)
        if (!parsed.judgment && defJudgment) {
          fieldMap[f.code] = wrapManualFieldValue(parsed.measured, defJudgment)
        }
        return
      }
      const measured = f.defaultValue !== '' && f.defaultValue != null ? f.defaultValue : ''
      fieldMap[f.code] = wrapManualFieldValue(measured, defJudgment)
      return
    }
    if (fieldMap[f.code] !== undefined && fieldMap[f.code] !== null && fieldMap[f.code] !== '') {
      return
    }
    if (f.code === 'QC_INSPECT_METHOD') {
      fieldMap[f.code] = line.inspectMethod || f.defaultValue || '抽检'
      return
    }
    if (f.code === 'QC_INSPECT_QTY') {
      const raw = line.inspectQty ?? line.receiptQty ?? f.defaultValue ?? 0
      fieldMap[f.code] = Number(raw)
      return
    }
    if (isQcConclusionField(f)) {
      const rule = normalizeSheetPassRule(
        line.sheetPassRule ||
          getQcTemplateByCode(line.templateCode || t?.templateCode)?.sheetPassRule,
      )
      // 自动结论规则：不预填默认「合格」，由 syncAutoConclusion 按实测回写
      if (isAutoSheetConclusionRule(rule)) {
        fieldMap[f.code] = fieldMap[f.code] || undefined
        return
      }
      const items = resolveConclusionOptionItems(line, t, fields)
      const def =
        items.find((o) => o.isDefault)?.value || f.defaultValue || items[0]?.value || undefined
      if (line.lineQcResult === '质检通过') {
        fieldMap[f.code] = items.find((o) => o.result === QC_TASK_RESULT.PASS)?.value || def
      } else if (line.lineQcResult === '质检不通过') {
        fieldMap[f.code] = items.find((o) => o.result === QC_TASK_RESULT.FAIL)?.value || def
      } else {
        fieldMap[f.code] = fieldMap[f.code] || def
      }
      return
    }
    fieldMap[f.code] = f.defaultValue !== '' ? f.defaultValue : undefined
  })

  const draft = {
    ...line,
    sheetPassRule: normalizeSheetPassRule(
      line.sheetPassRule ||
        getQcTemplateByCode(line.templateCode || t?.templateCode)?.sheetPassRule,
    ),
    templateFields: fields.map((f) => ({
      ...f,
      options: f.options ? [...f.options] : [],
      optionItems: f.optionItems ? f.optionItems.map((o) => ({ ...o })) : undefined,
      children: Array.isArray(f.children) ? f.children.map((c) => ({ ...c })) : [],
      matrixColumns: Array.isArray(f.matrixColumns) ? f.matrixColumns.map((c) => ({ ...c })) : [],
      matrixRows: Array.isArray(f.matrixRows) ? f.matrixRows.map((r) => ({ ...r })) : [],
    })),
    inspectMethod: fieldMap.QC_INSPECT_METHOD || line.inspectMethod || '抽检',
    inspectQty: Number(fieldMap.QC_INSPECT_QTY ?? line.inspectQty ?? line.receiptQty ?? 0),
    treatmentPlan: line.treatmentPlan || undefined,
    acceptInboundQty: line.acceptInboundQty != null ? Number(line.acceptInboundQty) : undefined,
    concessionQty: line.concessionQty != null ? Number(line.concessionQty) : undefined,
    returnQty: line.returnQty != null ? Number(line.returnQty) : undefined,
    exchangeQty: line.exchangeQty != null ? Number(line.exchangeQty) : undefined,
    fieldMap,
  }
  syncAutoConclusion(draft)
  return draft
}

function conclusionCode(line) {
  const fields = resolveLineFields(line, task.value)
  return findQcConclusionField(fields)?.code || QC_CONCLUSION_FIELD_CODE
}

function resolveConclusionOptionItems(line, t = task.value, fields = null) {
  const list = fields || resolveLineFields(line, t)
  const conclusion = findQcConclusionField(list)
  const sheetItems =
    line?.sheetConclusionOptionItems ||
    getQcTemplateByCode(line?.templateCode || t?.templateCode)?.sheetConclusionOptionItems
  let items =
    Array.isArray(sheetItems) && sheetItems.length
      ? normalizeConclusionOptionItems({ optionItems: sheetItems })
      : normalizeConclusionOptionItems(conclusion || {})
  // 来料/外协回货：录入侧兜底提供「部分合格」，避免旧模板快照缺选项
  if (
    supportsDispositionBizScope(t?.bizScope) &&
    !items.some(
      (o) =>
        o.result === QC_TASK_RESULT.PARTIAL ||
        o.value === QC_CONCLUSION_PARTIAL_OPTION ||
        String(o.value || '').includes('部分'),
    )
  ) {
    items = [
      ...items,
      { value: QC_CONCLUSION_PARTIAL_OPTION, result: QC_TASK_RESULT.PARTIAL, locked: false },
    ]
  }
  return items
}

/** 行内基本信息：质检方式 / 数量 / 检验备注（多点指标本期不上线，一并排除） */
function headerFields(line) {
  return resolveLineFields(line, task.value)
    .filter(
      (f) =>
        !isMatrixField(f) &&
        (isQcInspectMethodField(f) || isQcInspectQtyField(f) || isQcInspectRemarkField(f)),
    )
    .map((f) => enrichInspectField(f))
}

/** 检验项目（排除方式/数量/备注/整单结论/多点指标） */
function inspectFields(line) {
  return resolveLineFields(line, task.value)
    .filter(
      (f) =>
        !isMatrixField(f) &&
        !isQcInspectMethodField(f) &&
        !isQcInspectQtyField(f) &&
        !isQcInspectRemarkField(f) &&
        !isQcConclusionField(f) &&
        // 处理方案为来料业务处置字段，在整单结论区填写（不在明细列表展示）
        !isTreatmentPlanField(f),
    )
    .map((f) => enrichInspectField(f))
}

/** 模板内若配置了「处理方案」字段则识别（避免与业务处置列重复） */
function isTreatmentPlanField(field = {}) {
  const code = String(field.code || '')
    .trim()
    .toUpperCase()
  if (code === 'QC_TREATMENT_PLAN' || code === 'TREATMENT_PLAN') return true
  return String(field.name || '').trim() === '处理方案'
}

/** @deprecated 兼容旧调用，等同 inspectFields */
function extraFields(line) {
  return inspectFields(line)
}

/** 补齐单位/合格标准：优先用行内冻结模板，缺省时回落检验项库 */
function enrichInspectField(field = {}) {
  const hasStandard =
    Boolean(field.judgeRule && field.judgeRule !== 'none') ||
    Boolean(buildStandardText(field)) ||
    Boolean(field.withUnit || field.unit)
  if (hasStandard) {
    const standard = pickFieldStandardProps(field)
    return {
      ...field,
      ...standard,
      standardText: field.standardText || buildStandardText({ ...field, ...standard }),
    }
  }
  const lib = getQcLibraryFieldByCode(field.code)
  if (!lib) return { ...field, ...pickFieldStandardProps(field) }
  const standard = pickFieldStandardProps({ ...lib, ...field })
  return {
    ...field,
    ...standard,
    options: field.options?.length ? field.options : lib.options ? [...lib.options] : [],
    standardText:
      field.standardText ||
      lib.standardText ||
      buildStandardText({ ...lib, ...field, ...standard }),
  }
}

function methodOptsFor(line) {
  const fields = resolveLineFields(line, task.value)
  const methodField = fields.find((f) => isQcInspectMethodField(f))
  const opts = methodField?.options?.length ? methodField.options : ['抽检', '全检']
  return opts.map((v) => ({ label: v, value: v }))
}

function conclusionOptsFor(line) {
  return resolveConclusionOptionItems(line).map((o) => ({ label: o.value, value: o.value }))
}

function isAutoConclusionLine(line) {
  return isAutoSheetConclusionRule(resolveLineSheetPassRule(line, task.value))
}

function resolveLineAutoConclusion(line) {
  const fields = resolveLineFields(line, task.value)
  const rule = resolveLineSheetPassRule(line, task.value)
  return resolveAutoSheetConclusion(
    line,
    fields,
    rule,
    resolveConclusionOptionItems(line, task.value, fields),
  )
}

function autoConclusionStatus(line) {
  return resolveLineAutoConclusion(line).status
}

function autoConclusionReason(line) {
  return resolveLineAutoConclusion(line).reason
}

/** 将自动结论写回 fieldMap（提交与展示一致） */
function syncAutoConclusion(line) {
  if (!line?.fieldMap) return
  if (!isAutoConclusionLine(line)) return
  const code = conclusionCode(line)
  const resolved = resolveLineAutoConclusion(line)
  line.fieldMap[code] = resolved.value || undefined
  if (!showDispositionForLine(line)) {
    line.treatmentPlan = undefined
    clearDispositionQty(line)
    return
  }
  // 自动结论变化：空桶时按结论预填；已有填写则只刷新汇总
  if (
    line.acceptInboundQty == null &&
    line.concessionQty == null &&
    line.returnQty == null &&
    line.exchangeQty == null
  ) {
    suggestDispositionQty(line)
  } else {
    syncTreatmentPlanSummary(line)
  }
}

function conclusionHintFor(line) {
  const rule = resolveLineSheetPassRule(line, task.value)
  if (rule === QC_TEMPLATE_SHEET_PASS_RULE.MANUAL) {
    return '整单规则为「人工判定」：请从模板配置的结论选项中选择（可含特采等）；检验项未达标仅提示，不强制拦截。'
  }
  if (rule === QC_TEMPLATE_SHEET_PASS_RULE.ALL_PASS) {
    return `整单规则为「${sheetPassRuleLabel(rule)}」：无需手选，系统根据检验项达标情况自动给出合格/不合格。`
  }
  if (rule === QC_TEMPLATE_SHEET_PASS_RULE.KEY_FIELDS) {
    return `整单规则为「${sheetPassRuleLabel(rule)}」：无需手选，系统根据关键项达标情况自动给出合格/不合格。`
  }
  return ''
}

function isSelectLike(field) {
  if (isQcConclusionField(field)) return true
  if (field.type === 'radio' || field.type === 'select') return true
  return Array.isArray(field.options) && field.options.length > 0
}

function fieldOptions(field) {
  if (isQcConclusionField(field)) {
    return normalizeConclusionOptionItems(field).map((o) => ({ label: o.value, value: o.value }))
  }
  return (field.options || []).map((v) =>
    typeof v === 'string' ? { label: v, value: v } : { label: v.label || v.value, value: v.value },
  )
}

function getMeasuredValue(line, field) {
  if (isCountByQtyField(field)) return undefined
  if (isManualJudgeField(field)) {
    return parseManualFieldValue(line.fieldMap?.[field.code]).measured
  }
  return line.fieldMap?.[field.code]
}

function setMeasuredValue(line, field, v) {
  if (isCountByQtyField(field)) return
  if (isManualJudgeField(field)) {
    const prev = parseManualFieldValue(line.fieldMap?.[field.code])
    line.fieldMap[field.code] = wrapManualFieldValue(v, prev.judgment)
  } else {
    line.fieldMap[field.code] = v
  }
  onFieldChange(line, field)
}

function getCountByQtyPass(line, field) {
  return parseCountByQtyValue(line.fieldMap?.[field.code]).passQty
}

function getCountByQtyFail(line, field) {
  return parseCountByQtyValue(line.fieldMap?.[field.code]).failQty
}

function setCountByQtyPass(line, field, v) {
  const prev = parseCountByQtyValue(line.fieldMap?.[field.code])
  line.fieldMap[field.code] = wrapCountByQtyValue(v, prev.failQty)
  onFieldChange(line, field)
}

function setCountByQtyFail(line, field, v) {
  const prev = parseCountByQtyValue(line.fieldMap?.[field.code])
  line.fieldMap[field.code] = wrapCountByQtyValue(prev.passQty, v)
  onFieldChange(line, field)
}

function getManualJudgment(line, field) {
  return parseManualFieldValue(line.fieldMap?.[field.code]).judgment || undefined
}

function setManualJudgment(line, field, v) {
  const prev = parseManualFieldValue(line.fieldMap?.[field.code])
  line.fieldMap[field.code] = wrapManualFieldValue(prev.measured, v)
  onFieldChange(line, field)
}

function unitText(field) {
  if (!field?.withUnit && !field?.unit) return ''
  return String(field.unit || '').trim()
}

function unitPrefix(field) {
  const unit = unitText(field)
  if (!unit) return ''
  return normalizeUnitPosition(field.unitPosition) === QC_UNIT_POSITION.PREFIX ? unit : ''
}

function unitSuffix(field) {
  const unit = unitText(field)
  if (!unit) return ''
  return normalizeUnitPosition(field.unitPosition) === QC_UNIT_POSITION.SUFFIX ? unit : ''
}

function standardHint(field) {
  return buildStandardText(field)
}

function judgeHint(line, field) {
  if (isComplexField(field)) {
    return evaluateComplexOrSimpleField(field, line?.fieldMap?.[field.code])
  }
  return evaluateFieldAgainstStandard(field, line?.fieldMap?.[field.code])
}

function getConclusionValue(line) {
  return line.fieldMap?.[conclusionCode(line)]
}

function mappedConclusionResult(line) {
  const raw = String(getConclusionValue(line) || '').trim()
  if (!raw) return ''
  const items = resolveConclusionOptionItems(line)
  return mapConclusionValueToQcResult(raw, { optionItems: items })
}

/** 不合格 / 部分合格 / 让步类结论：数量处置必填 */
function needTreatmentForLine(line) {
  const raw = String(getConclusionValue(line) || '').trim()
  if (!raw) return false
  const mapped = mappedConclusionResult(line)
  if (mapped === QC_TASK_RESULT.FAIL || mapped === QC_TASK_RESULT.PARTIAL) return true
  if (raw === QC_CONCLUSION_CONCESSION_OPTION || raw.includes('让步')) return true
  return false
}

/** 来料/外协：始终展示数量处置（合格也可填） */
function showDispositionForLine() {
  return supportsDispositionBizScope(task.value?.bizScope)
}

/** 不合格/部分/让步：处置必填；合格可选 */
function requireDispositionQtyForLine(line) {
  if (!showDispositionForLine(line)) return false
  return needTreatmentForLine(line)
}

function lineInspectQty(line) {
  return Number(line?.fieldMap?.QC_INSPECT_QTY ?? line?.inspectQty ?? line?.receiptQty ?? 0) || 0
}

/** 处置上限：收货/到货数量（抽检时不等于质检数量） */
function lineReceiptQty(line) {
  const raw =
    line?.receiptQty ??
    line?.shipQty ??
    line?.fieldMap?.QC_RECEIPT_QTY ??
    line?.inspectQty ??
    line?.fieldMap?.QC_INSPECT_QTY ??
    0
  return Number(raw) || 0
}

function hasAnyDispositionQty(line) {
  return [line?.acceptInboundQty, line?.concessionQty, line?.returnQty, line?.exchangeQty].some(
    (v) => v != null && v !== '' && Number(v) > 0,
  )
}

function clearDispositionQty(line) {
  if (!line) return
  line.acceptInboundQty = undefined
  line.concessionQty = undefined
  line.returnQty = undefined
  line.exchangeQty = undefined
}

function clampQty(n) {
  const v = Number(n)
  if (!Number.isFinite(v) || v < 0) return 0
  return v
}

function syncTreatmentPlanSummary(line) {
  if (!isMultiBucketDisposition(task.value?.bizScope)) return
  line.treatmentPlan = buildTreatmentPlanSummary(task.value?.bizScope, line, (n) => formatQty(n, 4))
}

function multiBucketDispositionHint(line) {
  if (!showDispositionForLine(line)) return ''
  const mapped = mappedConclusionResult(line)
  const a = clampQty(line.acceptInboundQty)
  const c = clampQty(line.concessionQty)
  const r = clampQty(line.returnQty)
  const s = clampQty(line.exchangeQty)
  const inbound = a + c
  const reject = r + s
  const buckets = [a > 0, c > 0, r > 0, s > 0].filter(Boolean).length
  if (buckets >= 2 && inbound > 0 && reject > 0) {
    return '当前为混合处置（部分可入库、部分退换/返工报废）。整单结论由检验项规则判定；数量按收货实物拆分，二者含义不同。'
  }
  if (mapped === QC_TASK_RESULT.FAIL && inbound > 0) {
    return '检验项未全达标故整单为不合格，仍可将部分数量记为让步入库，其余退货/换货或返工/报废。'
  }
  if (mapped === QC_TASK_RESULT.PARTIAL) {
    return '部分通过：请按收货实物拆分合格入库、让步入库及次要处置数量。'
  }
  if (mapped === QC_TASK_RESULT.PASS && !hasAnyDispositionQty(line)) {
    return '抽检合格时可不填；提交默认按收货数量全量合格入库。若需部分退换/让步，请在此拆分。'
  }
  return ''
}

/**
 * 默认数量（多桶，按收货数量）：
 * - 合格默认全进合格入库
 * - 不合格默认全进退货（来料）或返工（外协）
 * - 让步结论默认全进让步入库
 * - 部分通过不预填
 */
function suggestDispositionQty(line) {
  if (!showDispositionForLine(line)) {
    clearDispositionQty(line)
    return
  }
  const base = lineReceiptQty(line)
  const mapped = mappedConclusionResult(line)
  const raw = String(getConclusionValue(line) || '').trim()

  line.acceptInboundQty = 0
  line.concessionQty = 0
  line.returnQty = 0
  line.exchangeQty = 0
  if (raw.includes('让步')) {
    line.concessionQty = base
  } else if (mapped === QC_TASK_RESULT.PARTIAL) {
    // 部分通过：不预填，由用户拆分
  } else if (mapped === QC_TASK_RESULT.PASS) {
    line.acceptInboundQty = base
  } else if (mapped === QC_TASK_RESULT.FAIL) {
    line.returnQty = base
  }
  // 待判定：不预填
  syncTreatmentPlanSummary(line)
}

/** 多桶：改任一数量 */
function onDispositionQtyChange(line, which) {
  if (!showDispositionForLine(line)) return
  if (!isMultiBucketDisposition(task.value?.bizScope)) return
  const base = lineReceiptQty(line)
  line.acceptInboundQty = clampQty(line.acceptInboundQty)
  line.concessionQty = clampQty(line.concessionQty)
  line.returnQty = clampQty(line.returnQty)
  line.exchangeQty = clampQty(line.exchangeQty)
  const sum = line.acceptInboundQty + line.concessionQty + line.returnQty + line.exchangeQty
  if (sum > base + 1e-9) {
    const others =
      sum -
      (which === 'accept'
        ? line.acceptInboundQty
        : which === 'concession'
          ? line.concessionQty
          : which === 'return'
            ? line.returnQty
            : line.exchangeQty)
    const maxCur = Math.max(0, base - others)
    if (which === 'accept') line.acceptInboundQty = maxCur
    else if (which === 'concession') line.concessionQty = maxCur
    else if (which === 'return') line.returnQty = maxCur
    else line.exchangeQty = maxCur
  }
  syncTreatmentPlanSummary(line)
}

function validateDispositionQty(line) {
  if (!showDispositionForLine(line)) return { ok: true }
  const labels = dispositionLabels.value
  const base = lineReceiptQty(line)
  const parseOne = (raw, label) => {
    if (raw == null || raw === '') return { ok: true, n: 0, empty: true }
    const n = Number(raw)
    if (!Number.isFinite(n) || n < 0) {
      return { ok: false, message: `${label}须为不小于 0 的数字` }
    }
    return { ok: true, n, empty: false }
  }
  const aRes = parseOne(line.acceptInboundQty, `${labels.accept}数量`)
  if (!aRes.ok) return aRes
  const cRes = parseOne(line.concessionQty, `${labels.concession}数量`)
  if (!cRes.ok) return cRes
  const rRes = parseOne(line.returnQty, `${labels.secondary}数量`)
  if (!rRes.ok) return rRes
  const eRes = parseOne(line.exchangeQty, `${labels.tertiary}数量`)
  if (!eRes.ok) return eRes
  const sum = aRes.n + cRes.n + rRes.n + eRes.n
  if (sum > base + 1e-9) {
    return {
      ok: false,
      message: `${labels.accept}+${labels.concession}+${labels.secondary}+${labels.tertiary}（${formatQty(sum, 4)}）不可超过收货数量（${formatQty(base, 4)}）`,
    }
  }
  if (requireDispositionQtyForLine(line) && sum <= 0) {
    return {
      ok: false,
      message: `请至少填写一项处置数量（${labels.accept}/${labels.concession}/${labels.secondary}/${labels.tertiary}）`,
    }
  }
  return { ok: true }
}

/** 合格未填处置：提交前默认全量合格入库 */
function ensurePassDispositionDefault(line) {
  if (!showDispositionForLine(line)) return
  if (requireDispositionQtyForLine(line)) return
  if (hasAnyDispositionQty(line)) {
    syncTreatmentPlanSummary(line)
    return
  }
  const base = lineReceiptQty(line)
  line.acceptInboundQty = base
  line.concessionQty = 0
  line.returnQty = 0
  line.exchangeQty = 0
  syncTreatmentPlanSummary(line)
}

function qtyFormatter(value) {
  if (value === '' || value == null) return ''
  return formatQty(value, 4)
}

function qtyParser(value) {
  const s = String(value ?? '').replace(/[^\d.-]/g, '')
  if (s === '' || s === '-' || s === '.') return ''
  const n = Number(s)
  return Number.isFinite(n) ? n : ''
}

function onConclusionChange(line) {
  if (!showDispositionForLine(line)) {
    line.treatmentPlan = undefined
    clearDispositionQty(line)
    return
  }
  // 多桶：结论变化时按结论预填（合格→全量合格入库；不合格→全量退/返工等）
  line.treatmentPlan = undefined
  clearDispositionQty(line)
  suggestDispositionQty(line)
}

function onFieldChange(line, field) {
  if (isQcInspectMethodField(field) || field.code === 'QC_INSPECT_METHOD') {
    line.inspectMethod = line.fieldMap[field.code]
  }
  if (isQcInspectQtyField(field) || field.code === 'QC_INSPECT_QTY') {
    line.inspectQty = line.fieldMap[field.code]
  }
  syncAutoConclusion(line)
}

function statusColor(status) {
  if (status === QC_TASK_STATUS.COMPLETED) return 'success'
  if (status === QC_TASK_STATUS.PENDING || status === '检验中' || status === '检测中')
    return 'warning'
  if (status === QC_TASK_STATUS.CANCELLED) return 'default'
  return 'warning'
}

function buildFieldValues(line) {
  const fields = resolveLineFields(line, task.value)
  return fields
    .map((f) => ({
      fieldCode: f.code,
      fieldName: f.name,
      value: line.fieldMap?.[f.code],
    }))
    .filter((v) => {
      if (v.value === undefined || v.value === null) return false
      if (typeof v.value === 'object') return true
      return String(v.value).trim() !== ''
    })
}

function handleCancel() {
  const path = route.path
  closeTab(path)
  router.push({ name: detailRouteName.value, params: { id: route.params.id } })
}

async function handleOk() {
  if (!task.value?.id) {
    message.warning('未找到质检单')
    return
  }
  if (!form.lineItems.length) {
    message.warning('质检明细为空')
    return
  }

  for (const line of form.lineItems) {
    const fields = resolveLineFields(line, task.value)
    if (!fields.length) {
      message.warning(`「${line.itemName || line.itemCode}」未绑定质检模板`)
      return
    }
    for (const field of fields) {
      // 多点指标本期不做，跳过必填校验
      if (isMatrixField(field)) continue
      if (isTreatmentPlanField(field)) continue
      if (field.required === false && !isManualJudgeField(field)) continue
      const val = line.fieldMap?.[field.code]
      if (isComplexField(field)) {
        if (field.required === false) continue
        if (isComplexValueEmpty(field, val)) {
          message.warning(
            `请填写「${line.itemName || line.itemCode}」的${field.name || field.code}`,
          )
          return
        }
        continue
      }
      if (isCountByQtyField(field)) {
        const checked = validateCountByQtyValue(val, {
          inspectQty: lineInspectQty(line),
          required: field.required !== false,
        })
        if (!checked.ok) {
          message.warning(
            `「${line.itemName || line.itemCode}」的${field.name || field.code}：${checked.message}`,
          )
          return
        }
        continue
      }
      if (isManualJudgeField(field)) {
        const { measured } = parseManualFieldValue(val)
        if (
          field.required !== false &&
          (measured === undefined || measured === null || String(measured).trim() === '')
        ) {
          message.warning(
            `请填写「${line.itemName || line.itemCode}」的${field.name || field.code}`,
          )
          return
        }
        if (isManualJudgmentMissing(val)) {
          message.warning(
            `请为「${line.itemName || line.itemCode}」的${field.name || field.code}选择本项结论`,
          )
          return
        }
        continue
      }
      if (field.required === false) continue
      if (val === undefined || val === null || String(val).trim() === '') {
        message.warning(`请填写「${line.itemName || line.itemCode}」的${field.name || field.code}`)
        return
      }
    }
    const conclusion = getConclusionValue(line)
    const sheetRule = resolveLineSheetPassRule(line, task.value)
    if (isAutoSheetConclusionRule(sheetRule)) {
      syncAutoConclusion(line)
      const auto = resolveLineAutoConclusion(line)
      if (auto.status === 'unavailable') {
        message.warning(`「${line.itemName || line.itemCode}」：${auto.reason}`)
        return
      }
      if (auto.status === 'pending' || !getConclusionValue(line)) {
        message.warning(
          `请先完整填写「${line.itemName || line.itemCode}」的检验项目，系统将自动给出整单结论`,
        )
        return
      }
    } else if (!conclusion) {
      message.warning(`请为「${line.itemName || line.itemCode}」选择整单结论`)
      return
    }
    if (showDispositionForLine(line)) {
      ensurePassDispositionDefault(line)
      syncTreatmentPlanSummary(line)
      if (requireDispositionQtyForLine(line) && !String(line.treatmentPlan || '').trim()) {
        message.warning(`请为「${line.itemName || line.itemCode}」填写数量处置`)
        return
      }
    }
    const qtyCheck = validateDispositionQty(line)
    if (!qtyCheck.ok) {
      message.warning(`「${line.itemName || line.itemCode}」：${qtyCheck.message}`)
      return
    }

    const check = validateLineSheetPassRule(line, fields, sheetRule)
    if (!check.ok) {
      message.warning(check.message || '未满足模板整单合格规则')
      return
    }
  }

  const failHints = collectAllFailingStandardHints(form.lineItems, (line) => extraFields(line))
  if (failHints.length) {
    const hasHardRule = form.lineItems.some((line) => {
      const rule = resolveLineSheetPassRule(line, task.value)
      return rule !== QC_TEMPLATE_SHEET_PASS_RULE.MANUAL
    })
    // 强制规则已在上方拦截「通过」；此处仅对「人工判定」做软提示
    if (!hasHardRule) {
      const preview = failHints.slice(0, 5).join('；')
      const more = failHints.length > 5 ? `等共 ${failHints.length} 项` : ''
      Modal.confirm({
        title: '存在未达标检验项',
        content: `以下检验项未达标准：${preview}${more}。模板规则为「${sheetPassRuleLabel(QC_TEMPLATE_SHEET_PASS_RULE.MANUAL)}」，整单结论仍以模板配置的结论选项为准，是否继续提交？`,
        okText: '继续提交',
        cancelText: '返回修改',
        onOk: () => doSubmit(),
      })
      return
    }
  }

  await doSubmit()
}

async function doSubmit() {
  saving.value = true
  try {
    const lineItems = form.lineItems.map((line) => {
      if (showDispositionForLine(line)) ensurePassDispositionDefault(line)
      const saveDisposition = showDispositionForLine(line)
      return {
        ...line,
        inspectMethod: line.fieldMap?.QC_INSPECT_METHOD || line.inspectMethod,
        inspectQty: line.fieldMap?.QC_INSPECT_QTY ?? line.inspectQty,
        fieldValues: buildFieldValues(line),
        treatmentPlan: line.treatmentPlan || '',
        acceptInboundQty: saveDisposition ? Number(line.acceptInboundQty) || 0 : undefined,
        concessionQty: saveDisposition ? Number(line.concessionQty) || 0 : undefined,
        returnQty: saveDisposition ? Number(line.returnQty) || 0 : undefined,
        exchangeQty: saveDisposition ? Number(line.exchangeQty) || 0 : undefined,
        sheetPassRule: resolveLineSheetPassRule(line, task.value),
        fieldMap: undefined,
      }
    })
    const res = isFactoryScope.value
      ? submitFactoryQcInspection(task.value.id, {
          lineItems,
          inspector: form.inspector || 'admin1',
          remark: form.remark,
        })
      : submitQcTaskInspection(task.value.id, {
          lineItems,
          inspector: form.inspector || 'admin1',
          entryChannel: 'web',
          remark: form.remark,
        })
    if (!res.ok) {
      message.warning(res.message || '提交失败')
      return
    }
    message.success(`质检完成：${res.qcResult}`)
    const path = route.path
    closeTab(path)
    router.push({ name: detailRouteName.value, params: { id: task.value.id } })
  } catch (err) {
    console.error(err)
    message.error(err?.message || '提交失败')
  } finally {
    saving.value = false
  }
}
</script>

<style lang="less" scoped>
.qc-inspect-page {
  margin: -12px;
  padding: 12px;
  background: var(--page-bg, #f0f2f5);
  min-height: calc(100vh - 112px);
}

.page-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 8px;
  padding: 12px 16px;
  background: #fff;
  border-radius: 6px;
}

.header-left {
  display: flex;
  align-items: center;
  gap: 8px;
}

.page-title {
  font-size: 16px;
  font-weight: 600;
}

.page-sub {
  color: #8c8c8c;
}

.section-card {
  margin-bottom: 8px;
  padding: 12px 16px 16px;
  background: #fff;
  border-radius: 6px;
}

.section-title {
  margin-bottom: 10px;
  font-size: 14px;
  font-weight: 600;
}

.header-form {
  :deep(.remark-item) {
    width: 100%;

    .ant-form-item-control {
      flex: 1;
      max-width: none;
    }

    .ant-form-item-control-input,
    .ant-form-item-control-input-content {
      width: 100%;
    }

    textarea {
      width: 100%;
    }
  }
}

.expand-form-wrap {
  padding: 10px 12px;
  background: #f7f8fa;
}

.line-card-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.line-card {
  border: 1px solid #e5e6eb;
  border-radius: 8px;
  background: #fff;
}

.line-card-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  padding: 12px 16px;
  background: #fafbfc;
  border-bottom: 1px solid #f0f0f0;
  border-radius: 8px 8px 0 0;
  cursor: pointer;
  user-select: none;
}

.line-card.is-collapsed .line-card-head {
  border-bottom: none;
  border-radius: 8px;
}

.line-card-head-main {
  display: flex;
  align-items: flex-start;
  gap: 8px;
  min-width: 0;
  flex: 1;
}

.line-card-index {
  flex-shrink: 0;
  width: 24px;
  height: 24px;
  margin-top: 2px;
  border-radius: 50%;
  background: #e6f4ff;
  color: #1677ff;
  font-size: 12px;
  font-weight: 600;
  line-height: 24px;
  text-align: center;
}

.line-card-identity {
  min-width: 0;
}

.line-card-name {
  display: flex;
  align-items: baseline;
  flex-wrap: wrap;
  gap: 8px;
  margin-bottom: 4px;
}

.line-card-item-name {
  font-size: 15px;
  font-weight: 600;
  color: rgba(0, 0, 0, 0.88);
  line-height: 22px;
}

.line-card-item-code {
  font-size: 13px;
  color: rgba(0, 0, 0, 0.45);
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
}

.line-card-meta {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 4px 0;
  font-size: 12px;
  color: rgba(0, 0, 0, 0.45);
  line-height: 1.5;
}

.meta-sep {
  margin: 0 6px;
  color: rgba(0, 0, 0, 0.25);
}

.line-sheet-wrap {
  padding: 12px 14px;
  background: #fafbfc;
}

.inspect-lines-card {
  overflow: visible;
}

.line-sheet-section {
  margin-bottom: 14px;
  padding: 14px 16px;
  background: #fff;
  border: 1px solid #e5e6eb;
  border-radius: 8px;
}

.line-sheet-section:last-child {
  margin-bottom: 0;
}

.line-sheet-title {
  margin-bottom: 12px;
  padding-left: 8px;
  border-left: 3px solid #1677ff;
  font-size: 14px;
  font-weight: 600;
  color: rgba(0, 0, 0, 0.88);
  line-height: 1.2;
}

.line-header-grid {
  display: grid;
  grid-template-columns: minmax(140px, 1fr) minmax(140px, 1fr) minmax(220px, 2fr);
  gap: 12px 16px;
  align-items: end;
}

@media (max-width: 900px) {
  .line-header-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

.line-header-item {
  display: flex;
  flex-direction: column;
  gap: 6px;
  min-width: 0;
}

.line-field-label {
  font-size: 13px;
  color: rgba(0, 0, 0, 0.65);
  line-height: 22px;
}

.line-conclusion-section {
  padding-top: 12px;
  padding-bottom: 12px;
}

.line-conclusion-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px 24px;
}

.line-conclusion-left {
  flex: 1;
  min-width: 0;
}

.line-conclusion-left .line-sheet-title {
  margin-bottom: 6px;
}

.line-conclusion-right {
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: flex-end;
  max-width: 48%;
}

.line-conclusion-hint {
  margin-bottom: 0;
  font-size: 12px;
  color: rgba(0, 0, 0, 0.45);
  line-height: 1.5;
}

.line-treatment-row {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 8px 12px;
  margin-top: 12px;
  padding-top: 12px;
  border-top: 1px dashed #f0f0f0;
}

.line-treatment-label {
  font-size: 13px;
  color: rgba(0, 0, 0, 0.65);
  line-height: 22px;
  white-space: nowrap;
}

.line-treatment-label .req {
  margin-right: 2px;
  color: #ff4d4f;
}

.line-treatment-tip {
  margin-left: 8px;
  font-size: 12px;
  color: rgba(0, 0, 0, 0.35);
  font-weight: 400;
}

.line-treatment-idle {
  font-size: 12px;
  color: rgba(0, 0, 0, 0.35);
}

.line-disposition-row {
  display: flex;
  flex-direction: column;
  gap: 10px;
  margin-top: 12px;
  padding-top: 12px;
  border-top: 1px dashed #f0f0f0;
}

.line-disposition-fields {
  display: flex;
  flex-wrap: wrap;
  gap: 16px 24px;
  align-items: center;
}

.line-disposition-item {
  display: flex;
  align-items: center;
  gap: 8px;
}

.line-disposition-item-label {
  font-size: 13px;
  color: rgba(0, 0, 0, 0.65);
  min-width: 56px;
}

.line-disposition-hint {
  font-size: 12px;
  color: #d48806;
  line-height: 1.5;
  max-width: 720px;
}

.line-disposition-summary {
  font-size: 12px;
  color: rgba(0, 0, 0, 0.45);
}

.auto-conclusion-box {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 8px;
  min-height: 32px;
  padding: 6px 12px;
  border-radius: 8px;
  border: 1px solid #f0f0f0;
  background: #fafbfc;
}

.auto-conclusion-box.is-pass {
  border-color: #b7eb8f;
  background: #f6ffed;
}

.auto-conclusion-box.is-fail {
  border-color: #ffa39e;
  background: #fff2f0;
}

.auto-conclusion-box.is-pending {
  border-color: #e5e6eb;
  background: #fafbfc;
}

.auto-conclusion-text {
  font-size: 12px;
  color: rgba(0, 0, 0, 0.45);
  line-height: 1.4;
}

@media (max-width: 900px) {
  .line-conclusion-head {
    flex-direction: column;
  }

  .line-conclusion-right {
    max-width: 100%;
    justify-content: flex-start;
  }
}

.inspect-fields-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 8px;
}

@media (max-width: 1280px) {
  .inspect-fields-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (max-width: 720px) {
  .inspect-fields-grid {
    grid-template-columns: 1fr;
  }
}

.inspect-field-card {
  padding: 12px 14px;
  background: #fafbfc;
  border: 1px solid #f0f0f0;
  border-radius: 8px;
  transition:
    border-color 0.2s,
    background 0.2s;
}

.inspect-field-card.is-pass {
  border-color: #b7eb8f;
  background: #f6ffed;
}

.inspect-field-card.is-fail {
  border-color: #ffa39e;
  background: #fff2f0;
}

.inspect-field-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  margin-bottom: 4px;
}

.inspect-field-title {
  font-size: 13px;
  font-weight: 600;
  color: rgba(0, 0, 0, 0.88);
  line-height: 22px;
  display: inline-flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 4px;
}

.inspect-field-title .req {
  margin-right: 2px;
  color: #ff4d4f;
}

.key-item-tag {
  margin: 0;
  font-weight: 500;
}

.inspect-field-standard {
  margin-bottom: 8px;
  font-size: 12px;
  color: rgba(0, 0, 0, 0.45);
  line-height: 1.4;
}

.field-input-wrap {
  display: flex;
  align-items: center;
  gap: 8px;
  width: 100%;
  max-width: 100%;
}

.manual-judgment-row {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-top: 8px;
}

.count-by-qty-row {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 12px 16px;
}

.count-by-qty-item {
  display: flex;
  align-items: center;
  gap: 8px;
}

.count-by-qty-label {
  font-size: 13px;
  color: rgba(0, 0, 0, 0.65);
  white-space: nowrap;
}

.count-by-qty-cap {
  font-size: 12px;
  color: rgba(0, 0, 0, 0.45);
}

.manual-label {
  flex-shrink: 0;
  font-size: 13px;
  color: rgba(0, 0, 0, 0.65);
  white-space: nowrap;
}

.manual-label .req {
  margin-right: 2px;
  color: #ff4d4f;
}

.unit-affix {
  flex-shrink: 0;
  color: rgba(0, 0, 0, 0.45);
  font-size: 13px;
  white-space: nowrap;
  min-width: 28px;
}

.judge-tag {
  margin: 0;
}

.judge-placeholder {
  font-size: 12px;
  color: rgba(0, 0, 0, 0.25);
}

.muted {
  color: rgba(0, 0, 0, 0.25);
}
</style>
