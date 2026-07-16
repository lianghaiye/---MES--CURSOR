<template>
  <a-modal
    :open="open"
    title="编辑变更项"
    width="920px"
    :mask-closable="false"
    destroy-on-close
    @cancel="handleCancel"
  >
    <a-form layout="vertical" size="small">
      <a-row :gutter="12">
        <a-col :span="8">
          <a-form-item :label="ECN_CHANGE_ITEM_ACTION_LABEL">
            <a-select
              v-model:value="form.changeType"
              :options="changeTypeOpts"
              @change="onChangeTypeChange"
            />
          </a-form-item>
        </a-col>
      </a-row>

      <a-divider orientation="left" plain>原 BOM 物料</a-divider>
      <a-row v-if="isOrigActive" :gutter="12">
        <a-col :span="8">
          <a-form-item label="物料名称">
            <EcnEbomMaterialSelect
              :value="form.bomLineId"
              :bom-picker-lines="bomPickerLines"
              :flat-nodes="bomFlatNodes"
              :line-items="bomLineItems"
              :root-label="bomRootLabel"
              :fallback-name="form.origMaterialName"
              @select="(line) => onOrigLineSelect(line)"
              @clear="onOrigLineClear"
            />
          </a-form-item>
        </a-col>
        <a-col :span="16">
          <a-form-item label="物料编码/规格/材质/图号">
            <a-input
              :value="
                formatMaterialDetailLabel(
                  form.origMaterialCode,
                  form.origSpecModel,
                  form.origMaterial,
                  form.origDrawingNo,
                )
              "
              readonly
            />
          </a-form-item>
        </a-col>
        <a-col :span="4">
          <a-form-item label="单位用量">
            <a-input :value="form.origUnitQty ?? '—'" readonly />
          </a-form-item>
        </a-col>
        <a-col :span="4">
          <a-form-item label="关联工艺文件">
            <a-input :value="form.origProcessDoc || '—'" readonly />
          </a-form-item>
        </a-col>
      </a-row>
      <a-empty v-else description="新增行无需选择原 BOM 物料" :image="false" />

      <a-divider orientation="left" plain>变更后</a-divider>
      <template v-if="isNewActive">
        <a-row :gutter="12">
          <a-col :span="8">
            <a-form-item label="新物料名称">
              <EcnNewMaterialSelect
                :value="form.newMaterialCode"
                :fallback-name="form.newMaterialName"
                placeholder="搜索编码/名称"
                @select="onNewMaterialSelect"
                @clear="onNewMaterialClear"
              />
            </a-form-item>
          </a-col>
          <a-col :span="16">
            <a-form-item label="新物料编码/规格/材质/图号">
              <a-input
                :value="
                  formatMaterialDetailLabel(
                    form.newMaterialCode,
                    form.newSpecModel,
                    form.newMaterial,
                    form.newDrawingNo,
                  )
                "
                readonly
              />
            </a-form-item>
          </a-col>
        </a-row>
        <a-row :gutter="12">
          <a-col :span="8">
            <a-form-item label="新单位用量" required>
              <a-input-number
                v-model:value="form.newUnitQty"
                :min="0"
                :precision="4"
                style="width: 100%"
              />
            </a-form-item>
          </a-col>
          <a-col :span="8">
            <a-form-item label="供应型态">
              <a-select
                v-model:value="form.supplyForm"
                allow-clear
                placeholder="请选择"
                :options="supplyFormOpts"
              />
            </a-form-item>
          </a-col>
        </a-row>
      </template>
      <a-alert v-else type="warning" show-icon message="取消物料：新物料信息置空，单位用量为 0" />

      <a-divider orientation="left" plain>挂载与工序</a-divider>
      <a-row :gutter="12">
        <a-col :span="12">
          <a-form-item label="父级物料" required>
            <EcnBomParentSelect
              v-if="isParentEditable"
              v-model:value="form.parentPath"
              :flat-nodes="bomFlatNodes"
              :line-items="bomLineItems"
              :root-label="bomRootLabel"
              @change="onParentChange"
            />
            <a-input v-else :value="form.parentPath || '—'" readonly />
          </a-form-item>
        </a-col>
        <a-col v-if="form.changeType === ECN_CHANGE_ITEM_TYPE.REPLACE" :span="12">
          <a-form-item label="替换BOM">
            <a-input
              :value="form.replaceBomLabel || '—'"
              readonly
              placeholder="选择新物料后自动带出"
            />
          </a-form-item>
        </a-col>
        <a-col :span="12">
          <a-form-item label="关联工序">
            <a-select
              v-model:value="form.relatedProcesses"
              mode="multiple"
              allow-clear
              placeholder="不选则影响全部工序"
              :options="processOpts"
            />
          </a-form-item>
        </a-col>
      </a-row>

      <a-divider orientation="left" plain>补料与计划</a-divider>
      <a-row :gutter="12">
        <a-col :span="6">
          <a-form-item label="是否补料">
            <a-switch v-model:checked="form.needReplenish" :disabled="!isNewActive" />
          </a-form-item>
        </a-col>
        <a-col :span="6">
          <a-form-item label="关联生成单据">
            <a-switch v-model:checked="form.generateDocument" :disabled="!isNewActive" />
          </a-form-item>
        </a-col>
        <a-col :span="6">
          <a-form-item label="计划数量">
            <a-input-number
              v-model:value="form.planQty"
              :min="0"
              :precision="2"
              :disabled="!form.generateDocument"
              style="width: 100%"
            />
          </a-form-item>
        </a-col>
        <a-col :span="6">
          <a-form-item label="计划日期">
            <a-date-picker
              v-model:value="form.planDateValue"
              value-format="YYYY-MM-DD"
              :disabled="!form.generateDocument"
              style="width: 100%"
              @change="(val) => (form.planDate = val || '')"
            />
          </a-form-item>
        </a-col>
      </a-row>

      <a-form-item label="变更说明">
        <a-textarea v-model:value="form.changeNote" :rows="2" placeholder="可选" />
      </a-form-item>
    </a-form>

    <template #footer>
      <a-button @click="handleCancel">取消</a-button>
      <a-button type="primary" @click="handleConfirm">确定</a-button>
    </template>
  </a-modal>
</template>

<script setup>
import { computed, reactive, watch } from 'vue'
import { message } from 'ant-design-vue'
import dayjs from 'dayjs'
import {
  ECN_CHANGE_ITEM_TYPE,
  ECN_CHANGE_ITEM_ACTION_LABEL,
  ecnChangeItemTypeOptions,
} from '@/constants/ecn'
import {
  applyChangeTypeDefaults,
  applyMaterialToChangeItem,
  createChangeItemFromBomLine,
  formatMaterialDetailLabel,
  isChangeItemNewFieldsActive,
  isChangeItemOrigFieldsActive,
  isChangeItemParentEditable,
  syncChangeItemLegacyFields,
} from '@/utils/ecnProductSource'
import EcnEbomMaterialSelect from './EcnEbomMaterialSelect.vue'
import EcnBomParentSelect from './EcnBomParentSelect.vue'
import EcnNewMaterialSelect from './EcnNewMaterialSelect.vue'

const props = defineProps({
  open: { type: Boolean, default: false },
  record: { type: Object, default: null },
  bomPickerLines: { type: Array, default: () => [] },
  bomFlatNodes: { type: Array, default: () => [] },
  bomLineItems: { type: Array, default: () => [] },
  bomRootLabel: { type: String, default: '' },
  processOpts: { type: Array, default: () => [] },
})

const emit = defineEmits(['update:open', 'save'])

const supplyFormOpts = ['自制件', '外购件'].map((v) => ({
  label: v,
  value: v,
}))

const form = reactive(createFormState())

const changeTypeOpts = ecnChangeItemTypeOptions

const isOrigActive = computed(() => isChangeItemOrigFieldsActive(form))
const isNewActive = computed(() => isChangeItemNewFieldsActive(form))
const isParentEditable = computed(() => isChangeItemParentEditable(form))

function createFormState(source = {}) {
  return {
    changeType: source.changeType || ECN_CHANGE_ITEM_TYPE.MODIFY,
    bomLineId: source.bomLineId || '',
    origMaterialCode: source.origMaterialCode || '',
    origMaterialName: source.origMaterialName || '',
    origSpecModel: source.origSpecModel || '',
    origUnitQty: source.origUnitQty ?? null,
    origProcessDoc: source.origProcessDoc || '',
    origMaterial: source.origMaterial || '',
    origDrawingNo: source.origDrawingNo || '',
    newMaterialCode: source.newMaterialCode || '',
    newMaterialName: source.newMaterialName || '',
    newSpecModel: source.newSpecModel || '',
    newMaterial: source.newMaterial || '',
    newDrawingNo: source.newDrawingNo || '',
    newUnitQty: source.newUnitQty ?? null,
    parentPath: source.parentPath || '',
    parentMaterial: source.parentMaterial || '',
    relatedProcesses: [...(source.relatedProcesses || [])],
    needReplenish: !!source.needReplenish,
    supplyForm: source.supplyForm || '',
    generateDocument: !!source.generateDocument,
    planQty: source.planQty ?? null,
    planDate: source.planDate || dayjs().format('YYYY-MM-DD'),
    planDateValue: source.planDate || dayjs().format('YYYY-MM-DD'),
    changeNote: source.changeNote || '',
  }
}

watch(
  () => props.open,
  (visible) => {
    if (!visible || !props.record) return
    Object.assign(form, createFormState(props.record))
  },
)

function onChangeTypeChange() {
  const draft = { ...props.record, ...form }
  applyChangeTypeDefaults(draft)
  Object.assign(form, createFormState(draft))
}

function onOrigLineSelect(line) {
  const patched = createChangeItemFromBomLine(line, form.changeType)
  Object.assign(form, createFormState({ ...patched, changeNote: form.changeNote }))
}

function onOrigLineClear() {
  form.bomLineId = ''
  form.origMaterialCode = ''
  form.origMaterialName = ''
  form.origSpecModel = ''
  form.origUnitQty = null
  form.origProcessDoc = ''
}

function onNewMaterialSelect(material) {
  const draft = { ...props.record, ...form }
  applyMaterialToChangeItem(draft, material)
  form.newMaterialCode = draft.newMaterialCode
  form.newMaterialName = draft.newMaterialName
  form.newSpecModel = draft.newSpecModel
  form.newMaterial = draft.newMaterial
  form.newDrawingNo = draft.newDrawingNo
  form.supplyForm = draft.supplyForm
  form.relatedProcesses = [...(draft.relatedProcesses || [])]
}

function onNewMaterialClear() {
  form.newMaterialCode = ''
  form.newMaterialName = ''
  form.newSpecModel = ''
  form.newMaterial = ''
  form.newDrawingNo = ''
}

function onParentChange(val) {
  form.parentMaterial = val || ''
}

function handleCancel() {
  emit('update:open', false)
}

function handleConfirm() {
  if (isOrigActive.value && !form.bomLineId && form.changeType !== ECN_CHANGE_ITEM_TYPE.ADD) {
    if (form.changeType !== ECN_CHANGE_ITEM_TYPE.ADD && !form.origMaterialCode) {
      message.warning('请选择物料名称')
      return
    }
  }
  if (form.changeType === ECN_CHANGE_ITEM_TYPE.ADD) {
    if (!form.newMaterialCode) {
      message.warning('请选择新物料')
      return
    }
    if (!form.parentPath) {
      message.warning('请选择父级物料')
      return
    }
  }
  if (isNewActive.value && (form.newUnitQty == null || form.newUnitQty === '')) {
    message.warning('请填写新单位用量')
    return
  }
  if (isParentEditable.value && !form.parentPath) {
    message.warning('请选择父级物料')
    return
  }
  if (form.generateDocument) {
    if (form.planQty == null || form.planQty === '') {
      message.warning('请填写计划数量')
      return
    }
    if (!form.planDate) {
      message.warning('请选择计划日期')
      return
    }
  }

  const payload = { ...form, parentMaterial: form.parentPath || form.parentMaterial }
  syncChangeItemLegacyFields(payload)
  emit('save', payload)
  emit('update:open', false)
}
</script>

<script>
export default { name: 'EcnChangeItemEditModal' }
</script>
