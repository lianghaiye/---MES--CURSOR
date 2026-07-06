<template>
  <div class="ecn-change-items-table">
    <a-table
      :columns="columns"
      :data-source="items"
      row-key="id"
      size="small"
      bordered
      :pagination="false"
      :locale="{ emptyText: emptyText }"
      :scroll="{ x: 2800 }"
    >
      <template #headerCell="{ column }">
        <template v-if="column.required">
          <span class="required-col">{{ column.title }}</span>
        </template>
      </template>

      <template #bodyCell="{ column, record, index }">
        <template v-if="column.key === 'index'">{{ index + 1 }}</template>

        <template v-else-if="column.key === 'changeType'">
          <a-select
            v-model:value="record.changeType"
            size="small"
            :options="changeTypeOpts"
            style="width: 88px"
            @change="() => onChangeTypeChange(record)"
          />
        </template>

        <template v-else-if="column.key === 'origMaterialName'">
          <EcnEbomMaterialSelect
            v-if="isOrigActive(record)"
            :value="record.bomLineId"
            :bom-picker-lines="bomPickerLines"
            :flat-nodes="bomFlatNodes"
            :line-items="bomLineItems"
            :root-label="bomRootLabel"
            :fallback-name="record.origMaterialName"
            placeholder="搜索编码/名称"
            @select="(line) => onOrigLineChange(record, line)"
            @clear="onOrigLineClear(record)"
          />
          <span v-else class="cell-muted">—</span>
        </template>

        <template v-else-if="column.key === 'origCodeSpec'">
          <span
            v-if="isOrigActive(record)"
            class="cell-readonly"
            :title="formatOrigDetailRow(record)"
          >
            {{ formatOrigDetailRow(record) }}
          </span>
          <span v-else class="cell-muted">—</span>
        </template>

        <template v-else-if="column.key === 'origUnitQty'">
          <span v-if="isOrigActive(record)" class="cell-readonly">{{
            record.origUnitQty ?? '—'
          }}</span>
          <span v-else class="cell-muted">—</span>
        </template>

        <template v-else-if="column.key === 'origProcessDoc'">
          <span v-if="isOrigActive(record)" class="cell-readonly">{{
            record.origProcessDoc || '—'
          }}</span>
          <span v-else class="cell-muted">—</span>
        </template>

        <template v-else-if="column.key === 'newMaterialName'">
          <EcnNewMaterialSelect
            v-if="isNewActive(record)"
            :value="record.newMaterialCode"
            :fallback-name="record.newMaterialName"
            placeholder="搜索编码/名称"
            @select="(material) => onNewMaterialSelect(record, material)"
            @clear="onNewMaterialClear(record)"
          />
          <span v-else class="cell-muted">—</span>
        </template>

        <template v-else-if="column.key === 'newMaterialDetail'">
          <span
            v-if="isNewActive(record)"
            class="cell-readonly"
            :title="formatNewDetailRow(record)"
          >
            {{ formatNewDetailRow(record) }}
          </span>
          <span v-else class="cell-muted">—</span>
        </template>

        <template v-else-if="column.key === 'newUnitQty'">
          <a-input-number
            v-if="isNewActive(record)"
            v-model:value="record.newUnitQty"
            size="small"
            :min="0"
            :precision="4"
            placeholder="请输入"
            style="width: 100%"
            @change="() => syncLegacy(record)"
          />
          <span v-else class="cell-muted">—</span>
        </template>

        <template v-else-if="column.key === 'parentMaterial'">
          <EcnBomParentSelect
            v-if="isParentEditable(record)"
            v-model:value="record.parentPath"
            :flat-nodes="bomFlatNodes"
            :line-items="bomLineItems"
            :root-label="bomRootLabel"
            @change="() => onParentChange(record)"
          />
          <span v-else class="cell-readonly" :title="record.parentPath">{{
            record.parentPath || '—'
          }}</span>
        </template>

        <template v-else-if="column.key === 'relatedProcesses'">
          <a-select
            v-model:value="record.relatedProcesses"
            mode="multiple"
            size="small"
            allow-clear
            placeholder="全部工序"
            style="width: 100%"
            :options="processOpts"
            :max-tag-count="1"
          />
        </template>

        <template v-else-if="column.key === 'currentStock'">
          <span class="cell-readonly">{{ formatStock(record) }}</span>
        </template>

        <template v-else-if="column.key === 'needReplenish'">
          <a-switch
            v-model:checked="record.needReplenish"
            size="small"
            :disabled="!isNewActive(record)"
          />
        </template>

        <template v-else-if="column.key === 'supplyForm'">
          <a-select
            v-if="isNewActive(record)"
            v-model:value="record.supplyForm"
            size="small"
            allow-clear
            placeholder="请选择"
            style="width: 88px"
            :options="supplyFormOpts"
          />
          <span v-else class="cell-muted">—</span>
        </template>

        <template v-else-if="column.key === 'generateDocument'">
          <a-switch
            v-model:checked="record.generateDocument"
            size="small"
            :disabled="!isNewActive(record)"
            @change="() => onGenerateDocumentChange(record)"
          />
        </template>

        <template v-else-if="column.key === 'planQty'">
          <a-input-number
            v-if="record.generateDocument"
            v-model:value="record.planQty"
            size="small"
            :min="0"
            :precision="2"
            placeholder="请输入"
            style="width: 100%"
          />
          <span v-else class="cell-muted">—</span>
        </template>

        <template v-else-if="column.key === 'planDate'">
          <a-date-picker
            v-if="record.generateDocument"
            v-model:value="record.planDateValue"
            size="small"
            value-format="YYYY-MM-DD"
            placeholder="请选择"
            style="width: 100%"
            @change="(val) => onPlanDateChange(record, val)"
          />
          <span v-else class="cell-muted">—</span>
        </template>

        <template v-else-if="column.key === 'changeNote'">
          <a-input
            v-model:value="record.changeNote"
            size="small"
            allow-clear
            placeholder="请输入"
          />
        </template>

        <template v-else-if="column.key === 'action'">
          <a-space :size="0">
            <a-button type="link" size="small" @click="emit('edit', record)">编辑</a-button>
            <a-button type="link" size="small" danger @click="emit('remove', record.id)"
              >删除</a-button
            >
          </a-space>
        </template>
      </template>
    </a-table>
  </div>
</template>

<script setup>
import dayjs from 'dayjs'
import {
  ECN_CHANGE_ITEM_ACTION_LABEL,
  ecnChangeItemTypeOptions,
  ECN_CHANGE_ITEM_TYPE,
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

defineProps({
  items: { type: Array, default: () => [] },
  bomPickerLines: { type: Array, default: () => [] },
  bomFlatNodes: { type: Array, default: () => [] },
  bomLineItems: { type: Array, default: () => [] },
  bomRootLabel: { type: String, default: '' },
  processOpts: { type: Array, default: () => [] },
  emptyText: {
    type: String,
    default: '暂无变更项，请点击「从 BOM 添加变更项」或「新增行」',
  },
})

const emit = defineEmits(['remove', 'edit'])

const changeTypeOpts = ecnChangeItemTypeOptions

const supplyFormOpts = ['自制件', '外购件', '外协件', '虚拟件'].map((v) => ({
  label: v,
  value: v,
}))

const columns = [
  { title: '#', key: 'index', width: 48, align: 'center', fixed: 'left' },
  { title: ECN_CHANGE_ITEM_ACTION_LABEL, key: 'changeType', width: 100, fixed: 'left' },
  { title: '物料名称', key: 'origMaterialName', width: 160, fixed: 'left' },
  { title: '物料编码/规格/材质/图号', key: 'origCodeSpec', width: 200, ellipsis: true },
  { title: '单位用量', key: 'origUnitQty', width: 96, align: 'right' },
  { title: '关联工艺文件', key: 'origProcessDoc', width: 110, ellipsis: true },
  { title: '新物料名称', key: 'newMaterialName', width: 160 },
  { title: '新物料编码/规格/材质/图号', key: 'newMaterialDetail', width: 200, ellipsis: true },
  { title: '新单位用量', key: 'newUnitQty', width: 110, required: true },
  { title: '父级物料', key: 'parentMaterial', width: 150, required: true },
  { title: '关联工序', key: 'relatedProcesses', width: 140 },
  { title: '当前库存', key: 'currentStock', width: 88, align: 'right' },
  { title: '是否补料', key: 'needReplenish', width: 88, align: 'center' },
  { title: '供应型态', key: 'supplyForm', width: 100 },
  { title: '关联生成单据', key: 'generateDocument', width: 110, align: 'center' },
  { title: '计划数量', key: 'planQty', width: 100, required: true },
  { title: '计划日期', key: 'planDate', width: 130, required: true },
  { title: '变更说明', key: 'changeNote', width: 140 },
  { title: '操作', key: 'action', fixed: 'right', width: 100 },
]

function isOrigActive(record) {
  return isChangeItemOrigFieldsActive(record)
}

function isNewActive(record) {
  return isChangeItemNewFieldsActive(record)
}

function isParentEditable(record) {
  return isChangeItemParentEditable(record)
}

function formatOrigDetailRow(record) {
  return formatMaterialDetailLabel(
    record.origMaterialCode,
    record.origSpecModel,
    record.origMaterial,
    record.origDrawingNo,
  )
}

function formatNewDetailRow(record) {
  return formatMaterialDetailLabel(
    record.newMaterialCode,
    record.newSpecModel,
    record.newMaterial,
    record.newDrawingNo,
  )
}

function formatStock(record) {
  if (record.currentStock != null && record.currentStock !== '') return record.currentStock
  return '—'
}

function syncLegacy(record) {
  syncChangeItemLegacyFields(record)
}

function onChangeTypeChange(record) {
  applyChangeTypeDefaults(record)
  ensurePlanDateValue(record)
  if (!record.relatedProcesses) record.relatedProcesses = []
}

function onOrigLineChange(record, line) {
  if (!line) return
  const patched = createChangeItemFromBomLine(line, record.changeType)
  Object.assign(record, {
    ...patched,
    id: record.id,
    changeNote: record.changeNote,
    needReplenish: record.needReplenish,
    generateDocument: record.generateDocument,
    planQty: record.planQty,
    planDate: record.planDate,
    relatedProcesses: record.relatedProcesses || [],
  })
  ensurePlanDateValue(record)
}

function onOrigLineClear(record) {
  record.bomLineId = ''
  record.origMaterialCode = ''
  record.origMaterialName = ''
  record.origSpecModel = ''
  record.origMaterial = ''
  record.origDrawingNo = ''
  record.origUnitQty = null
  record.origProcessDoc = ''
}

function onNewMaterialSelect(record, material) {
  applyMaterialToChangeItem(record, material)
  if (record.changeType === ECN_CHANGE_ITEM_TYPE.REPLACE && record.newUnitQty == null) {
    record.newUnitQty = record.origUnitQty
  }
}

function onNewMaterialClear(record) {
  record.newMaterialCode = ''
  record.newMaterialName = ''
  record.newSpecModel = ''
  record.newMaterial = ''
  record.newDrawingNo = ''
  record.currentStock = null
  syncLegacy(record)
}

function onParentChange(record) {
  record.parentMaterial = record.parentPath || ''
  syncLegacy(record)
}

function onGenerateDocumentChange(record) {
  if (record.generateDocument) {
    if (!record.planDate) record.planDate = dayjs().format('YYYY-MM-DD')
    ensurePlanDateValue(record)
  } else {
    record.planQty = null
  }
}

function onPlanDateChange(record, val) {
  record.planDate = val || ''
  record.planDateValue = val || null
}

function ensurePlanDateValue(record) {
  if (!record.planDate) {
    record.planDate = dayjs().format('YYYY-MM-DD')
  }
  record.planDateValue = record.planDate
  if (!record.relatedProcesses) record.relatedProcesses = []
}
</script>

<script>
export default { name: 'EcnChangeItemsTable' }
</script>

<style scoped>
.required-col::before {
  content: '*';
  color: #ff4d4f;
  margin-right: 2px;
}

.cell-readonly {
  font-size: 12px;
  color: #595959;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  display: block;
}

.cell-muted {
  font-size: 12px;
  color: #bfbfbf;
}

.ecn-change-items-table :deep(.ant-table-cell) {
  vertical-align: middle;
}
</style>
