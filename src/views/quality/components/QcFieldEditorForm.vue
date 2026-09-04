<template>
  <a-form layout="vertical" class="qc-field-editor-form">
    <div class="form-section-box">
      <div class="section-label">基本信息</div>
      <a-row :gutter="[12, 8]">
        <a-col v-if="showCode" :span="6">
          <a-form-item label="指标编码" :required="codeRequired">
            <a-input
              :value="model.code"
              allow-clear
              placeholder="空则自动生成"
              :disabled="codeDisabled"
              @update:value="(v) => update('code', v)"
            />
          </a-form-item>
        </a-col>
        <a-col :span="6">
          <a-form-item label="指标类型" required>
            <a-radio-group
              :value="indicatorKind"
              :disabled="typeDisabled"
              @update:value="onIndicatorKindChange"
            >
              <a-radio value="basic">基础</a-radio>
              <a-radio value="composite">复合</a-radio>
            </a-radio-group>
          </a-form-item>
        </a-col>
        <template v-if="indicatorKind === 'basic'">
          <a-col :span="6">
            <a-form-item label="字段名称" required>
              <a-input
                :value="model.name"
                allow-clear
                placeholder="请输入字段名称"
                @update:value="(v) => update('name', v)"
              />
            </a-form-item>
          </a-col>
          <a-col :span="6">
            <a-form-item label="字段类型" required>
              <a-select
                :value="model.type"
                placeholder="请选择"
                :options="basicTypeOpts"
                :disabled="typeDisabled"
                @change="onBasicTypeChange"
              />
            </a-form-item>
          </a-col>
        </template>
        <template v-else>
          <a-col :span="6">
            <a-form-item label="父项名称" required>
              <a-input
                :value="model.name"
                allow-clear
                placeholder="请输入父项名称"
                @update:value="(v) => update('name', v)"
              />
            </a-form-item>
          </a-col>
          <a-col :span="6">
            <a-form-item label="是否必填">
              <a-radio-group :value="model.required" @update:value="(v) => update('required', v)">
                <a-radio :value="true">是</a-radio>
                <a-radio :value="false">否</a-radio>
              </a-radio-group>
            </a-form-item>
          </a-col>
        </template>
      </a-row>

      <template v-if="indicatorKind === 'basic'">
        <a-row :gutter="[12, 8]">
          <a-col :span="6">
            <a-form-item label="是否必填">
              <a-radio-group :value="model.required" @update:value="(v) => update('required', v)">
                <a-radio :value="true">是</a-radio>
                <a-radio :value="false">否</a-radio>
              </a-radio-group>
            </a-form-item>
          </a-col>
          <a-col :span="model.withUnit ? 12 : 6">
            <a-form-item label="是否带单位">
              <div class="unit-inline-row">
                <a-checkbox :checked="model.withUnit" @update:checked="(v) => onWithUnitChange(v)">
                  带单位
                </a-checkbox>
                <template v-if="model.withUnit">
                  <a-select
                    :value="model.unitPosition"
                    class="unit-pos-select"
                    :options="unitPositionOpts"
                    @update:value="(v) => update('unitPosition', v)"
                  />
                  <a-input
                    :value="model.unit"
                    placeholder="如 mm、¥"
                    allow-clear
                    class="unit-value-input"
                    @update:value="(v) => update('unit', v)"
                  />
                </template>
              </div>
            </a-form-item>
          </a-col>
          <a-col v-if="model.type === 'number'" :span="6">
            <a-form-item label="数字设置">
              <a-checkbox
                :checked="model.allowDecimal"
                @update:checked="(v) => update('allowDecimal', v)"
              >
                允许小数
              </a-checkbox>
            </a-form-item>
          </a-col>
          <a-col v-if="showFormatField" :span="6">
            <a-form-item label="字段格式">
              <a-input
                :value="model.format"
                :placeholder="formatPlaceholder"
                allow-clear
                @update:value="(v) => update('format', v)"
              />
            </a-form-item>
          </a-col>
          <a-col :span="6">
            <a-form-item label="输入提示">
              <a-input
                :value="model.placeholder"
                placeholder="请输入提示文案"
                @update:value="(v) => update('placeholder', v)"
              />
            </a-form-item>
          </a-col>
          <a-col v-if="['text', 'textarea', 'number'].includes(model.type)" :span="6">
            <a-form-item label="默认值">
              <a-input
                :value="model.defaultValue"
                placeholder="请输入默认值"
                @update:value="(v) => update('defaultValue', v)"
              />
            </a-form-item>
          </a-col>
          <a-col v-if="model.type === 'text' || model.type === 'textarea'" :span="6">
            <a-form-item label="字符限制">
              <a-input-number
                :value="model.charLimit"
                :min="1"
                style="width: 100%"
                placeholder="最大字符数"
                @update:value="(v) => update('charLimit', v)"
              />
            </a-form-item>
          </a-col>
          <a-col :span="12">
            <a-form-item label="字段描述">
              <a-input
                :value="model.description"
                allow-clear
                placeholder="选填"
                @update:value="(v) => update('description', v)"
              />
            </a-form-item>
          </a-col>
        </a-row>
        <a-form-item v-if="isChoice" label="选项列表" required>
          <div v-for="(opt, i) in model.optionRows" :key="i" class="option-row conclusion-opt">
            <a-input
              :value="opt.value"
              placeholder="选项值"
              @update:value="(v) => updateOptionValue(i, v)"
            />
            <a-checkbox
              :checked="Boolean(opt.isDefault)"
              @change="(e) => setOptionDefault(i, e.target.checked)"
            >
              设为默认值
            </a-checkbox>
            <a-button type="text" danger @click="removeOption(i)">删除</a-button>
          </div>
          <a-button type="link" size="small" @click="addOption">+ 添加选项</a-button>
        </a-form-item>
      </template>
      <template v-else>
        <a-row :gutter="[12, 8]">
          <a-col :span="12">
            <a-form-item label="字段描述">
              <a-input
                :value="model.description"
                allow-clear
                placeholder="选填"
                @update:value="(v) => update('description', v)"
              />
            </a-form-item>
          </a-col>
        </a-row>
      </template>
    </div>

    <div v-if="indicatorKind === 'composite'" class="form-section-box">
      <div class="section-label">子项配置</div>
      <div v-for="(child, i) in model.children || []" :key="i" class="complex-child-card">
        <div class="child-card-head">
          <span class="child-idx">子项 {{ i + 1 }}</span>
          <a-button type="text" danger size="small" @click="removeChild(i)">删除</a-button>
        </div>
        <a-row :gutter="[12, 8]">
          <a-col :span="6">
            <a-form-item label="子项名称" required>
              <a-input
                :value="child.name"
                placeholder="子项名称"
                @update:value="(v) => updateChild(i, 'name', v)"
              />
            </a-form-item>
          </a-col>
          <a-col :span="6">
            <a-form-item label="子项类型" required>
              <a-select
                :value="child.type || 'number'"
                :options="childTypeOpts"
                @update:value="(v) => onChildTypeChange(i, v)"
              />
            </a-form-item>
          </a-col>
          <a-col :span="6">
            <a-form-item label="是否必填">
              <a-checkbox
                :checked="child.required !== false"
                @update:checked="(v) => updateChild(i, 'required', v)"
              >
                必填
              </a-checkbox>
            </a-form-item>
          </a-col>
          <a-col :span="6">
            <a-form-item label="单位">
              <div class="unit-inline-row">
                <a-select
                  :value="child.unitPosition || 'suffix'"
                  class="unit-pos-select"
                  :options="unitPositionOpts"
                  @update:value="(v) => updateChild(i, 'unitPosition', v)"
                />
                <a-input
                  :value="child.unit"
                  placeholder="可空"
                  allow-clear
                  class="unit-value-input"
                  @update:value="(v) => updateChild(i, 'unit', v)"
                />
              </div>
            </a-form-item>
          </a-col>
        </a-row>
        <a-row
          v-if="
            child.type === 'date' ||
            child.type === 'datetime' ||
            child.type === 'number' ||
            child.type === 'text' ||
            child.type === 'textarea'
          "
          :gutter="[12, 8]"
        >
          <a-col v-if="child.type === 'date' || child.type === 'datetime'" :span="6">
            <a-form-item label="字段格式">
              <a-input
                :value="child.format"
                :placeholder="child.type === 'datetime' ? 'yyyy-MM-dd HH:mm:ss' : 'yyyy-MM-dd'"
                @update:value="(v) => updateChild(i, 'format', v)"
              />
            </a-form-item>
          </a-col>
          <a-col v-if="child.type === 'number'" :span="6">
            <a-form-item label="数字设置">
              <a-checkbox
                :checked="child.allowDecimal !== false"
                @update:checked="(v) => updateChild(i, 'allowDecimal', v)"
              >
                允许小数
              </a-checkbox>
            </a-form-item>
          </a-col>
          <a-col v-if="child.type === 'text' || child.type === 'textarea'" :span="6">
            <a-form-item label="字符限制">
              <a-input-number
                :value="child.charLimit"
                :min="1"
                style="width: 100%"
                placeholder="最大字符数"
                @update:value="(v) => updateChild(i, 'charLimit', v)"
              />
            </a-form-item>
          </a-col>
        </a-row>
        <template v-if="child.type === 'radio' || child.type === 'checkbox'">
          <a-form-item label="选项列表" required>
            <div
              v-for="(opt, oi) in child.optionRows || []"
              :key="oi"
              class="option-row conclusion-opt"
            >
              <a-input
                :value="opt.value"
                placeholder="选项值"
                @update:value="(v) => updateChildOptionValue(i, oi, v)"
              />
              <a-checkbox
                :checked="Boolean(opt.isDefault)"
                @change="(e) => setChildOptionDefault(i, oi, e.target.checked)"
              >
                默认
              </a-checkbox>
              <a-button type="text" danger @click="removeChildOption(i, oi)">删除</a-button>
            </div>
            <a-button type="link" size="small" @click="addChildOption(i)">+ 添加选项</a-button>
          </a-form-item>
        </template>
        <a-row :gutter="[12, 8]" class="child-judge-block">
          <a-col :span="6">
            <a-form-item label="判定方式">
              <a-select
                :value="child.judgeRule || 'none'"
                :options="judgeRuleOpts"
                @update:value="(v) => onChildJudgeRuleChange(i, v)"
              />
            </a-form-item>
          </a-col>
          <template v-if="child.judgeRule === 'range'">
            <a-col :span="6">
              <a-form-item label="下限（含）">
                <a-input-number
                  :value="child.standardMin"
                  style="width: 100%"
                  placeholder="可空"
                  @update:value="(v) => updateChild(i, 'standardMin', v)"
                />
              </a-form-item>
            </a-col>
            <a-col :span="6">
              <a-form-item label="上限（含）">
                <a-input-number
                  :value="child.standardMax"
                  style="width: 100%"
                  placeholder="可空"
                  @update:value="(v) => updateChild(i, 'standardMax', v)"
                />
              </a-form-item>
            </a-col>
          </template>
          <a-col v-else-if="child.judgeRule === 'equals'" :span="6">
            <a-form-item label="标准值">
              <a-input
                :value="child.standardValue"
                placeholder="等于该值则合格"
                @update:value="(v) => updateChild(i, 'standardValue', v)"
              />
            </a-form-item>
          </a-col>
          <a-col v-else-if="child.judgeRule === 'optionPass'" :span="6">
            <a-form-item label="合格选项">
              <a-select
                :value="child.passOptions || []"
                mode="multiple"
                allow-clear
                placeholder="勾选合格值"
                style="width: 100%"
                :options="childPassOptionOpts(child)"
                @update:value="(v) => updateChild(i, 'passOptions', v)"
              />
            </a-form-item>
          </a-col>
          <a-col v-else-if="child.judgeRule === 'manual'" :span="24">
            <a-form-item label="结论选项（含结果映射）" required>
              <div class="manual-options-panel">
                <div
                  v-for="(item, oi) in ensureChildManualOptions(child, i)"
                  :key="oi"
                  class="option-row manual-opt"
                >
                  <a-input
                    :value="item.value"
                    placeholder="选项文案"
                    class="manual-opt-label"
                    @update:value="(v) => updateChildManualOption(i, oi, 'value', v)"
                  />
                  <a-select
                    :value="item.result"
                    placeholder="对应结果"
                    class="manual-opt-result"
                    :options="manualResultOpts"
                    @update:value="(v) => updateChildManualOption(i, oi, 'result', v)"
                  />
                  <a-checkbox
                    :checked="Boolean(item.isDefault)"
                    @change="(e) => setChildManualDefault(i, oi, e.target.checked)"
                  >
                    默认
                  </a-checkbox>
                  <a-button
                    type="text"
                    danger
                    size="small"
                    :disabled="isLockedManualOption(item)"
                    @click="removeChildManualOption(i, oi)"
                  >
                    删除
                  </a-button>
                </div>
                <a-button type="link" size="small" @click="addChildManualOption(i)">
                  + 添加选项
                </a-button>
                <div class="option-map-hint">
                  默认三项文案可改、不可删除；可追加选项。映射仅支持质检通过 / 质检不通过。
                </div>
              </div>
            </a-form-item>
          </a-col>
          <a-col :span="6">
            <a-form-item label="标准说明">
              <a-input
                :value="child.standardText"
                placeholder="选填"
                @update:value="(v) => updateChild(i, 'standardText', v)"
              />
            </a-form-item>
          </a-col>
        </a-row>
      </div>
      <a-button type="dashed" block size="small" class="add-child-btn" @click="addChild">
        + 添加子项
      </a-button>
    </div>

    <div class="form-section-box">
      <div class="section-label">合格标准</div>
      <a-row :gutter="[12, 8]">
        <a-col :span="6">
          <a-form-item label="判定方式">
            <a-select
              :value="model.judgeRule"
              :options="judgeRuleOpts"
              placeholder="请选择"
              @update:value="onJudgeRuleChange"
            />
          </a-form-item>
        </a-col>
        <a-col v-if="model.judgeRule === 'range'" :span="6">
          <a-form-item label="下限（含）">
            <a-input-number
              :value="model.standardMin"
              style="width: 100%"
              placeholder="可空"
              @update:value="(v) => update('standardMin', v)"
            />
          </a-form-item>
        </a-col>
        <a-col v-if="model.judgeRule === 'range'" :span="6">
          <a-form-item label="上限（含）">
            <a-input-number
              :value="model.standardMax"
              style="width: 100%"
              placeholder="可空"
              @update:value="(v) => update('standardMax', v)"
            />
          </a-form-item>
        </a-col>
        <a-col v-if="model.judgeRule === 'optionPass'" :span="6">
          <a-form-item label="合格选项">
            <a-select
              :value="model.passOptions"
              mode="multiple"
              allow-clear
              placeholder="勾选合格值"
              style="width: 100%"
              :options="passOptionOpts"
              @update:value="(v) => update('passOptions', v)"
            />
          </a-form-item>
        </a-col>
        <a-col v-if="model.judgeRule === 'manual'" :span="24">
          <a-form-item label="结论选项（含结果映射）" required>
            <div class="manual-options-panel">
              <div
                v-for="(item, oi) in ensureManualOptions()"
                :key="oi"
                class="option-row manual-opt"
              >
                <a-input
                  :value="item.value"
                  placeholder="选项文案"
                  class="manual-opt-label"
                  @update:value="(v) => updateManualOption(oi, 'value', v)"
                />
                <a-select
                  :value="item.result"
                  placeholder="对应结果"
                  class="manual-opt-result"
                  :options="manualResultOpts"
                  @update:value="(v) => updateManualOption(oi, 'result', v)"
                />
                <a-checkbox
                  :checked="Boolean(item.isDefault)"
                  @change="(e) => setManualDefault(oi, e.target.checked)"
                >
                  默认
                </a-checkbox>
                <a-button
                  type="text"
                  danger
                  size="small"
                  :disabled="isLockedManualOption(item)"
                  @click="removeManualOption(oi)"
                >
                  删除
                </a-button>
              </div>
              <a-button type="link" size="small" @click="addManualOption">+ 添加选项</a-button>
              <div class="option-map-hint">
                默认三项文案可改、不可删除；可追加选项。映射仅支持质检通过 /
                质检不通过。可勾选默认。
              </div>
            </div>
          </a-form-item>
        </a-col>
        <a-col v-if="model.judgeRule === 'equals'" :span="6">
          <a-form-item label="标准值">
            <a-input
              :value="model.standardValue"
              allow-clear
              placeholder="等于则合格"
              @update:value="(v) => update('standardValue', v)"
            />
          </a-form-item>
        </a-col>
        <a-col :span="6">
          <a-form-item label="标准说明">
            <a-input
              :value="model.standardText"
              allow-clear
              placeholder="选填，不填则自动生成"
              @update:value="(v) => update('standardText', v)"
            />
          </a-form-item>
        </a-col>
        <a-col v-if="showSyncToLibrary" :span="6">
          <a-form-item label="同步到库">
            <a-switch
              :checked="model.syncToLibrary"
              checked-children="是"
              un-checked-children="否"
              @update:checked="(v) => update('syncToLibrary', v)"
            />
          </a-form-item>
        </a-col>
      </a-row>
      <div class="option-map-hint standard-hint">
        {{
          indicatorKind === 'composite'
            ? '父项级标准；子项另有判定。人工判定项在录入时选择合格/不合格/让步合格。'
            : model.judgeRule === 'manual'
              ? '录入时除实测值外，须选择本项结论（可自定义选项文案，并映射质检通过/不通过）。'
              : '单项合格提示；可配合模板「整单合格规则」约束判定通过。'
        }}
      </div>
    </div>
  </a-form>
</template>

<script>
export default { name: 'QcFieldEditorForm' }
</script>

<script setup>
import { computed } from 'vue'
import { qcFieldLibraryBasicTypeOptions } from '@/mock/qcFieldLibrary'
import {
  QC_FIELD_JUDGE_RULE,
  QC_FIELD_JUDGE_RULE_OPTIONS,
  QC_UNIT_POSITION,
  QC_UNIT_POSITION_OPTIONS,
  isLockedManualOption,
  normalizeManualOptionItems,
} from '@/utils/qcFieldStandard'
import { QC_CONCLUSION_RESULT_OPTIONS } from '@/utils/qcConclusionField'
import {
  QC_CHILD_FIELD_TYPE_OPTIONS,
  createEmptyChildField,
  pickComplexFieldProps,
} from '@/utils/qcComplexField'

const props = defineProps({
  model: { type: Object, required: true },
  showCode: { type: Boolean, default: false },
  codeRequired: { type: Boolean, default: false },
  codeDisabled: { type: Boolean, default: false },
  typeDisabled: { type: Boolean, default: false },
  /** @deprecated 分类已取消，保留 prop 以免调用方报错 */
  showCategory: { type: Boolean, default: false },
  showSyncToLibrary: { type: Boolean, default: false },
})

const emit = defineEmits(['update:model'])

const basicTypeOpts = qcFieldLibraryBasicTypeOptions
const unitPositionOpts = QC_UNIT_POSITION_OPTIONS
const judgeRuleOpts = QC_FIELD_JUDGE_RULE_OPTIONS
const manualResultOpts = QC_CONCLUSION_RESULT_OPTIONS
const childTypeOpts = QC_CHILD_FIELD_TYPE_OPTIONS

const indicatorKind = computed(() =>
  props.model.type === 'composite' || props.model.indicatorKind === 'composite'
    ? 'composite'
    : 'basic',
)

const isChoice = computed(() => props.model.type === 'radio' || props.model.type === 'checkbox')
const showFormatField = computed(
  () => props.model.type === 'date' || props.model.type === 'datetime',
)
const formatPlaceholder = computed(() =>
  props.model.type === 'datetime' ? '如：yyyy-MM-dd HH:mm:ss' : '如：yyyy-MM-dd',
)
const passOptionOpts = computed(() =>
  (props.model.optionRows || [])
    .map((o) => String(o.value || '').trim())
    .filter(Boolean)
    .map((v) => ({ label: v, value: v })),
)

function childPassOptionOpts(child) {
  const fromRows = (child.optionRows || []).map((o) => String(o.value || '').trim()).filter(Boolean)
  const fromOpts = Array.isArray(child.options) ? child.options.map((v) => String(v).trim()) : []
  const list = fromRows.length ? fromRows : fromOpts
  return list.filter(Boolean).map((v) => ({ label: v, value: v }))
}

function patch(partial) {
  emit('update:model', { ...props.model, ...partial })
}

function update(key, value) {
  patch({ [key]: value })
}

function onJudgeRuleChange(v) {
  const next = { judgeRule: v }
  if (v === QC_FIELD_JUDGE_RULE.MANUAL) {
    next.manualOptionItems = normalizeManualOptionItems({
      manualOptionItems: props.model.manualOptionItems,
    })
  }
  patch(next)
}

function ensureManualOptions() {
  const items = normalizeManualOptionItems(props.model)
  if (
    props.model.judgeRule === QC_FIELD_JUDGE_RULE.MANUAL &&
    (!Array.isArray(props.model.manualOptionItems) || !props.model.manualOptionItems.length)
  ) {
    patch({ manualOptionItems: items })
  }
  return props.model.manualOptionItems?.length ? normalizeManualOptionItems(props.model) : items
}

function updateManualOption(index, key, value) {
  const list = normalizeManualOptionItems(props.model).map((o) => ({ ...o }))
  if (!list[index]) return
  list[index] = { ...list[index], [key]: value }
  patch({ manualOptionItems: list })
}

function setManualDefault(index, checked) {
  const list = normalizeManualOptionItems(props.model).map((o, i) => ({
    ...o,
    isDefault: checked && i === index,
  }))
  patch({ manualOptionItems: list })
}

function addManualOption() {
  const list = normalizeManualOptionItems(props.model).map((o) => ({ ...o }))
  list.push({
    value: '',
    result: QC_CONCLUSION_RESULT_OPTIONS[0]?.value || '质检通过',
    locked: false,
    isDefault: false,
  })
  patch({ manualOptionItems: list })
}

function removeManualOption(index) {
  const list = normalizeManualOptionItems(props.model)
  if (isLockedManualOption(list[index])) return
  patch({
    manualOptionItems: list.filter((_, i) => i !== index).map((o) => ({ ...o })),
  })
}

function onChildJudgeRuleChange(childIndex, v) {
  const children = [...(props.model.children || [])]
  const child = { ...children[childIndex], judgeRule: v }
  if (v === QC_FIELD_JUDGE_RULE.MANUAL) {
    child.manualOptionItems = normalizeManualOptionItems({
      manualOptionItems: child.manualOptionItems,
    })
  }
  children[childIndex] = child
  patch({ children })
}

function ensureChildManualOptions(child, childIndex) {
  const items = normalizeManualOptionItems(child)
  if (
    child.judgeRule === QC_FIELD_JUDGE_RULE.MANUAL &&
    (!Array.isArray(child.manualOptionItems) || !child.manualOptionItems.length)
  ) {
    const children = [...(props.model.children || [])]
    children[childIndex] = { ...child, manualOptionItems: items }
    patch({ children })
  }
  return child.manualOptionItems?.length ? normalizeManualOptionItems(child) : items
}

function updateChildManualOption(childIndex, optIndex, key, value) {
  const children = [...(props.model.children || [])]
  const child = { ...children[childIndex] }
  const list = normalizeManualOptionItems(child).map((o) => ({ ...o }))
  if (!list[optIndex]) return
  list[optIndex] = { ...list[optIndex], [key]: value }
  child.manualOptionItems = list
  children[childIndex] = child
  patch({ children })
}

function setChildManualDefault(childIndex, optIndex, checked) {
  const children = [...(props.model.children || [])]
  const child = { ...children[childIndex] }
  child.manualOptionItems = normalizeManualOptionItems(child).map((o, i) => ({
    ...o,
    isDefault: checked && i === optIndex,
  }))
  children[childIndex] = child
  patch({ children })
}

function addChildManualOption(childIndex) {
  const children = [...(props.model.children || [])]
  const child = { ...children[childIndex] }
  const list = normalizeManualOptionItems(child).map((o) => ({ ...o }))
  list.push({
    value: '',
    result: QC_CONCLUSION_RESULT_OPTIONS[0]?.value || '质检通过',
    locked: false,
    isDefault: false,
  })
  child.manualOptionItems = list
  children[childIndex] = child
  patch({ children })
}

function removeChildManualOption(childIndex, optIndex) {
  const children = [...(props.model.children || [])]
  const child = { ...children[childIndex] }
  const list = normalizeManualOptionItems(child)
  if (isLockedManualOption(list[optIndex])) return
  child.manualOptionItems = list.filter((_, i) => i !== optIndex).map((o) => ({ ...o }))
  children[childIndex] = child
  patch({ children })
}

function onIndicatorKindChange(kind) {
  if (kind === 'composite') {
    const children =
      props.model.children?.length > 0
        ? props.model.children
        : [
            createEmptyChildField({
              name: '子项1',
              type: 'number',
              judgeRule: QC_FIELD_JUDGE_RULE.NONE,
              required: true,
            }),
          ]
    patch({
      indicatorKind: 'composite',
      type: 'composite',
      optionRows: [],
      withUnit: false,
      unit: '',
      children,
      matrixColumns: [],
      matrixRows: [],
      ...pickComplexFieldProps({ type: 'composite', children, ...props.model }),
      judgeRule: props.model.judgeRule || QC_FIELD_JUDGE_RULE.NONE,
      standardMin: props.model.standardMin,
      standardMax: props.model.standardMax,
      standardValue: props.model.standardValue,
      passOptions: props.model.passOptions || [],
      standardText: props.model.standardText || '',
    })
    return
  }
  patch({
    indicatorKind: 'basic',
    type: undefined,
    children: [],
    matrixColumns: [],
    matrixRows: [],
    optionRows: [],
    defaultValue: '',
    charLimit: null,
    allowDecimal: true,
    format: '',
    withUnit: false,
    unit: '',
    judgeRule: QC_FIELD_JUDGE_RULE.NONE,
    standardMin: '',
    standardMax: '',
    standardValue: '',
    passOptions: [],
    standardText: '',
  })
}

function onBasicTypeChange(type) {
  const next = {
    indicatorKind: 'basic',
    type,
    optionRows: [],
    defaultValue: '',
    charLimit: null,
    allowDecimal: type === 'number' ? Boolean(props.model.allowDecimal !== false) : false,
    format: type === 'date' ? 'yyyy-MM-dd' : type === 'datetime' ? 'yyyy-MM-dd HH:mm:ss' : '',
    children: [],
    matrixColumns: [],
    matrixRows: [],
    passOptions: [],
  }
  if (type === 'number' && props.model.judgeRule === 'optionPass') {
    next.judgeRule = 'range'
  } else if ((type === 'radio' || type === 'checkbox') && props.model.judgeRule === 'range') {
    next.judgeRule = 'optionPass'
  }
  patch(next)
}

function onWithUnitChange(checked) {
  patch({
    withUnit: Boolean(checked),
    unit: checked ? props.model.unit : '',
    unitPosition: props.model.unitPosition || QC_UNIT_POSITION.SUFFIX,
  })
}

function addOption() {
  patch({ optionRows: [...(props.model.optionRows || []), { value: '', isDefault: false }] })
}

function removeOption(index) {
  const rows = [...(props.model.optionRows || [])]
  rows.splice(index, 1)
  patch({ optionRows: rows })
}

function updateOptionValue(index, value) {
  const rows = (props.model.optionRows || []).map((o, i) =>
    i === index ? { ...o, value } : { ...o },
  )
  patch({ optionRows: rows })
}

function setOptionDefault(index, checked) {
  const rows = (props.model.optionRows || []).map((o, i) => ({
    ...o,
    isDefault: checked ? i === index : false,
  }))
  const def = checked ? String(rows[index]?.value || '').trim() : ''
  patch({ optionRows: rows, defaultValue: def })
}

function addChild() {
  const n = (props.model.children || []).length + 1
  patch({
    children: [
      ...(props.model.children || []),
      createEmptyChildField({
        name: `子项${n}`,
        type: 'number',
        judgeRule: QC_FIELD_JUDGE_RULE.NONE,
        required: true,
      }),
    ],
  })
}

function removeChild(index) {
  const children = [...(props.model.children || [])]
  children.splice(index, 1)
  patch({ children })
}

function updateChild(index, key, value) {
  const children = (props.model.children || []).map((c, i) => {
    if (i !== index) return { ...c }
    const next = { ...c, [key]: value }
    if (key === 'unit') next.withUnit = Boolean(String(value || '').trim())
    return next
  })
  patch({ children })
}

function onChildTypeChange(index, type) {
  const children = (props.model.children || []).map((c, i) => {
    if (i !== index) return { ...c }
    const next = {
      ...c,
      type,
      options: type === 'radio' || type === 'checkbox' ? c.options || [] : [],
      optionRows:
        type === 'radio' || type === 'checkbox'
          ? c.optionRows?.length
            ? c.optionRows
            : (c.options || []).map((v) => ({ value: String(v), isDefault: false }))
          : [],
      passOptions: type === 'radio' || type === 'checkbox' ? c.passOptions || [] : [],
      allowDecimal: type === 'number',
      format: type === 'date' ? 'yyyy-MM-dd' : type === 'datetime' ? 'yyyy-MM-dd HH:mm:ss' : '',
      charLimit: type === 'text' || type === 'textarea' ? c.charLimit : null,
    }
    if (type !== 'number' && c.judgeRule === 'range') next.judgeRule = QC_FIELD_JUDGE_RULE.NONE
    if (type !== 'radio' && type !== 'checkbox' && c.judgeRule === 'optionPass') {
      next.judgeRule = QC_FIELD_JUDGE_RULE.NONE
    }
    return next
  })
  patch({ children })
}

function addChildOption(childIndex) {
  const children = (props.model.children || []).map((c, i) => {
    if (i !== childIndex) return { ...c }
    return {
      ...c,
      optionRows: [...(c.optionRows || []), { value: '', isDefault: false }],
    }
  })
  patch({ children })
}

function removeChildOption(childIndex, optIndex) {
  const children = (props.model.children || []).map((c, i) => {
    if (i !== childIndex) return { ...c }
    const optionRows = [...(c.optionRows || [])]
    optionRows.splice(optIndex, 1)
    return { ...c, optionRows }
  })
  patch({ children })
}

function updateChildOptionValue(childIndex, optIndex, value) {
  const children = (props.model.children || []).map((c, i) => {
    if (i !== childIndex) return { ...c }
    const optionRows = (c.optionRows || []).map((o, oi) =>
      oi === optIndex ? { ...o, value } : { ...o },
    )
    return { ...c, optionRows }
  })
  patch({ children })
}

function setChildOptionDefault(childIndex, optIndex, checked) {
  const children = (props.model.children || []).map((c, i) => {
    if (i !== childIndex) return { ...c }
    const optionRows = (c.optionRows || []).map((o, oi) => ({
      ...o,
      isDefault: checked ? oi === optIndex : false,
    }))
    const def = checked ? String(optionRows[optIndex]?.value || '').trim() : ''
    return { ...c, optionRows, defaultValue: def }
  })
  patch({ children })
}
</script>

<style lang="less" scoped>
.qc-field-editor-form {
  width: 100%;

  .form-section-box {
    width: 100%;
    margin-bottom: 12px;
    padding: 12px 14px;
    background: #fff;
    border: 1px solid #f0f0f0;
    border-radius: 6px;
  }

  .section-label {
    margin-bottom: 10px;
    font-size: 13px;
    font-weight: 600;
    color: rgba(0, 0, 0, 0.88);
  }

  /* 与新增工序一致：沿用 Ant Design 表单项默认行距（约 24px） */
  :deep(.ant-form-item-label) {
    padding-bottom: 4px;
  }
}

.unit-inline-row {
  display: flex;
  align-items: center;
  gap: 8px;
  min-height: 32px;
  flex-wrap: wrap;
}

.option-row {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 8px;
}

.option-row.conclusion-opt > :deep(.ant-input) {
  flex: 1;
  min-width: 0;
}

.manual-options-panel {
  max-width: 560px;
}

.option-row.manual-opt {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 8px;
  flex-wrap: nowrap;
}

.manual-opt-label {
  width: 140px;
  flex: 0 0 140px;
}

.manual-opt-result {
  width: 128px;
  flex: 0 0 128px;
}

.complex-child-card {
  margin-bottom: 12px;
  padding: 12px 14px 4px;
  background: #fafafa;
  border: 1px solid #f0f0f0;
  border-radius: 6px;
}

.child-card-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 4px;
}

.child-idx {
  font-size: 12px;
  font-weight: 600;
  color: rgba(0, 0, 0, 0.65);
}

.complex-child-card :deep(.ant-form-item) {
  margin-bottom: 8px;
}

.child-judge-block {
  margin-top: 2px;
  padding-top: 8px;
  border-top: 1px dashed #e8e8e8;
}

.unit-pos-select {
  width: 168px;
  flex-shrink: 0;
}

.unit-value-input {
  flex: 1;
  min-width: 0;
}

.add-child-btn {
  margin-top: 4px;
  margin-bottom: 4px;
}

.option-map-hint {
  margin-top: 6px;
  font-size: 12px;
  color: rgba(0, 0, 0, 0.45);
  line-height: 1.4;
}

.standard-hint {
  margin-top: 4px;
  margin-bottom: 0;
}
</style>
