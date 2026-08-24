<template>
  <div class="unit-manage-tab" :class="{ 'is-view-only': disabled }">
    <section class="base-unit-card">
      <div class="section-head">
        <span class="section-title">主单位（基本单位）</span>
      </div>
      <div class="base-unit-body">
        <a-select
          :value="baseUnit"
          size="middle"
          :options="unitOptions"
          placeholder="请选择主单位"
          :disabled="disabled"
          style="width: 200px"
          @update:value="onBaseUnitChange"
        />
        <p class="base-unit-desc">库存记账与成本核算基准 · 所有辅助单位换算回此单位</p>
      </div>
    </section>

    <section class="aux-unit-section">
      <div class="section-head">
        <span class="section-title">辅助单位</span>
        <a-button v-if="!disabled" type="primary" size="small" ghost @click="openCreate">
          + 新增辅助单位
        </a-button>
      </div>

      <a-table
        :columns="columns"
        :data-source="auxUnits"
        row-key="id"
        size="small"
        bordered
        :pagination="false"
        :row-class-name="(record) => (record.enabled === false ? 'aux-row-disabled' : '')"
        :locale="{ emptyText: '暂无辅助单位：采购/结算与主单位相同时可不配置' }"
      >
        <template #bodyCell="{ column, record }">
          <template v-if="column.key === 'unit'">
            <span class="unit-name">{{ record.unit || '—' }}</span>
            <a-tag v-if="record.enabled === false" class="status-tag">已停用</a-tag>
          </template>
          <template v-else-if="column.key === 'convert'">
            {{ formatAuxConvertText(record, baseUnit) }}
          </template>
          <template v-else-if="column.key === 'rate'">
            {{ formatDefaultRate(record) }}
          </template>
          <template v-else-if="column.key === 'convertType'">
            <a-tag :color="record.convertType === 'fixed' ? 'green' : 'orange'">
              {{ record.convertType === 'fixed' ? '固定' : '按批次覆盖' }}
            </a-tag>
          </template>
          <template v-else-if="column.key === 'allowDecimal'">
            {{ record.allowDecimal ? '是' : '否' }}
          </template>
          <template v-else-if="column.key === 'roles'">
            <a-tag v-for="label in roleLabels(record.roles)" :key="label" color="blue">
              {{ label }}
            </a-tag>
            <span v-if="!roleLabels(record.roles).length">—</span>
          </template>
          <template v-else-if="column.key === 'status'">
            <a-tag :color="record.enabled === false ? 'default' : 'success'">
              {{ record.enabled === false ? '停用' : '启用' }}
            </a-tag>
          </template>
          <template v-else-if="column.key === 'actions'">
            <template v-if="!disabled">
              <a @click="openEdit(record)">编辑</a>
              <a-divider type="vertical" />
              <a
                v-if="record.enabled !== false"
                class="warn-link"
                @click="setRowEnabled(record, false)"
              >
                停用
              </a>
              <a v-else @click="setRowEnabled(record, true)">启用</a>
            </template>
            <span v-else>—</span>
          </template>
        </template>
      </a-table>

      <div class="batch-tip">
        换算类型为「按批次覆盖」时，默认换算率仅作预估；入库过磅/实填后按批次实际数量记账与结算。
        采购角色的默认换算率表示「1 采购单位 = N 主单位」，采购申请按库存需求 ÷
        该值向上取整；不填则不做包装换算。
      </div>
      <p v-if="caliberHint" class="caliber-hint">{{ caliberHint }}</p>
    </section>

    <a-modal
      v-model:open="modalOpen"
      :title="editingId ? '编辑辅助单位' : '新增辅助单位'"
      ok-text="确定"
      cancel-text="取消"
      destroy-on-close
      @ok="submitModal"
    >
      <a-form layout="vertical" class="aux-unit-form">
        <a-form-item label="单位" required>
          <a-select
            v-model:value="draft.unit"
            :options="auxUnitSelectOpts"
            placeholder="请选择单位"
            show-search
            :filter-option="filterUnitOption"
          />
        </a-form-item>
        <a-form-item label="默认换算率">
          <div class="rate-row">
            <template v-if="draft.roles?.includes('settle') && !draft.roles?.includes('purchase')">
              <span class="rate-prefix">1 {{ baseUnit || '主单位' }} ≈</span>
              <a-input-number
                v-model:value="draft.rate"
                :min="0"
                :precision="4"
                style="width: 140px"
                placeholder="选填"
              />
              <span class="rate-suffix">{{ draft.unit || '结算单位' }}（预估，如标准单重）</span>
            </template>
            <template v-else>
              <span class="rate-prefix">1 {{ draft.unit || '辅助单位' }} =</span>
              <a-input-number
                v-model:value="draft.rate"
                :min="0"
                :precision="4"
                style="width: 140px"
                placeholder="选填"
              />
              <span class="rate-suffix">{{ baseUnit || '主单位' }}（预估）</span>
            </template>
          </div>
        </a-form-item>
        <a-form-item label="换算类型" required>
          <a-radio-group v-model:value="draft.convertType">
            <a-radio v-for="opt in UNIT_CONVERT_OPTIONS" :key="opt.value" :value="opt.value">
              {{ opt.label }}
            </a-radio>
          </a-radio-group>
          <div v-if="draft.convertType === 'batch'" class="field-extra">
            入库过磅后按批次实际数量记账，默认换算率仅作预估
          </div>
        </a-form-item>
        <a-form-item label="允许小数" required>
          <a-radio-group v-model:value="draft.allowDecimal">
            <a-radio :value="true">是</a-radio>
            <a-radio :value="false">否</a-radio>
          </a-radio-group>
        </a-form-item>
        <a-form-item label="业务角色" required>
          <a-checkbox-group v-model:value="draft.roles">
            <a-checkbox
              v-for="opt in UNIT_ROLE_OPTIONS"
              :key="opt.value"
              :value="opt.value"
              :disabled="!opt.enabled"
            >
              {{ opt.label }}
              <span v-if="!opt.enabled" class="role-soon">（暂未开放）</span>
            </a-checkbox>
          </a-checkbox-group>
        </a-form-item>
      </a-form>
    </a-modal>
  </div>
</template>

<script setup>
import { computed, reactive, ref, watch } from 'vue'
import { message, Modal } from 'ant-design-vue'
import { buildUnitCaliberHint } from '@/utils/unitCaliber'
import {
  UNIT_CONVERT,
  UNIT_CONVERT_OPTIONS,
  UNIT_ROLE,
  UNIT_ROLE_OPTIONS,
  applyUnitManageToFlat,
  createEmptyAuxUnit,
  formatAuxConvertText,
  roleLabels,
  validateUnitManage,
} from '@/utils/unitManageTab'

const props = defineProps({
  baseUnit: { type: String, default: undefined },
  auxUnits: { type: Array, default: () => [] },
  unitOptions: { type: Array, default: () => [] },
  disabled: { type: Boolean, default: false },
})

const emit = defineEmits(['update:baseUnit', 'update:auxUnits', 'flat-change'])

const columns = [
  { title: '单位', key: 'unit', width: 120 },
  { title: '与主单位换算', key: 'convert', ellipsis: true },
  { title: '默认换算率', key: 'rate', width: 110, align: 'right' },
  { title: '换算类型', key: 'convertType', width: 120 },
  { title: '允许小数', key: 'allowDecimal', width: 88, align: 'center' },
  { title: '业务角色', key: 'roles', width: 140 },
  { title: '状态', key: 'status', width: 72, align: 'center' },
  { title: '操作', key: 'actions', width: 120 },
]

const modalOpen = ref(false)
const editingId = ref(null)
const draft = reactive(createEmptyAuxUnit())

const caliberHint = computed(() => {
  const flat = applyUnitManageToFlat(props.baseUnit, props.auxUnits)
  return buildUnitCaliberHint({
    inventoryUnit: flat.inventoryUnit,
    purchaseUnit: flat.purchaseUnit,
    settleUnit: flat.settleUnit,
  })
})

const auxUnitSelectOpts = computed(() => {
  const base = String(props.baseUnit || '').trim()
  const used = new Set(
    (props.auxUnits || [])
      .filter((r) => r.id !== editingId.value)
      .map((r) => String(r.unit || '').trim())
      .filter(Boolean),
  )
  return (props.unitOptions || []).filter((o) => {
    const v = String(o.value ?? o.label ?? '').trim()
    if (!v || v === base) return false
    if (used.has(v) && v !== draft.unit) return false
    return true
  })
})

function filterUnitOption(input, option) {
  const q = String(input || '').toLowerCase()
  const label = String(option?.label ?? option?.value ?? '').toLowerCase()
  return label.includes(q)
}

function formatDefaultRate(record) {
  const rate = Number(record?.rate)
  if (!Number.isFinite(rate) || rate <= 0) return '—'
  return String(rate)
}

function emitFlat() {
  emit('flat-change', applyUnitManageToFlat(props.baseUnit, props.auxUnits))
}

watch(
  () => [props.baseUnit, props.auxUnits],
  () => emitFlat(),
  { deep: true, flush: 'post' },
)

function onBaseUnitChange(val) {
  const next = val || undefined
  if (props.baseUnit && next && props.baseUnit !== next && (props.auxUnits || []).length) {
    Modal.confirm({
      title: '更换主单位',
      content: '主单位影响库存记账口径。已配置的辅助单位将保留，请确认换算关系仍正确。',
      onOk: () => {
        emit('update:baseUnit', next)
        // 去掉与新主单位同名的辅助行
        const filtered = (props.auxUnits || []).filter(
          (r) => String(r.unit).trim() !== String(next).trim(),
        )
        if (filtered.length !== (props.auxUnits || []).length) {
          emit('update:auxUnits', filtered)
        }
      },
    })
    return
  }
  emit('update:baseUnit', next)
}

function resetDraft(partial = {}) {
  const empty = createEmptyAuxUnit(partial)
  Object.assign(draft, empty)
  draft.roles = [...(empty.roles || [])]
}

function openCreate() {
  if (!props.baseUnit) {
    message.warning('请先选择主单位')
    return
  }
  editingId.value = null
  resetDraft({ convertType: UNIT_CONVERT.BATCH, allowDecimal: true, roles: [] })
  modalOpen.value = true
}

function openEdit(record) {
  editingId.value = record.id
  resetDraft(record)
  modalOpen.value = true
}

function setRowEnabled(record, enabled) {
  const nextList = (props.auxUnits || []).map((r) =>
    r.id === record.id ? { ...r, enabled: Boolean(enabled) } : r,
  )
  const check = validateUnitManage(props.baseUnit, nextList)
  if (!check.ok) {
    message.warning(check.message)
    return
  }
  const action = enabled ? '启用' : '停用'
  Modal.confirm({
    title: `${action}辅助单位`,
    content: enabled
      ? `启用「${record.unit}」后，将重新参与采购/结算口径推导。`
      : `停用「${record.unit}」后保留配置，但新单据不再使用该辅助单位。`,
    onOk: () => {
      emit('update:auxUnits', nextList)
    },
  })
}

function submitModal() {
  const roles = (draft.roles || []).filter((r) =>
    UNIT_ROLE_OPTIONS.some((o) => o.value === r && o.enabled),
  )
  const prev = editingId.value ? (props.auxUnits || []).find((r) => r.id === editingId.value) : null
  const row = createEmptyAuxUnit({
    id: editingId.value || undefined,
    unit: draft.unit,
    convertType: draft.convertType,
    rate: draft.rate,
    allowDecimal: draft.allowDecimal,
    roles,
    enabled: prev ? prev.enabled !== false : true,
  })

  const nextList = editingId.value
    ? (props.auxUnits || []).map((r) => (r.id === editingId.value ? row : r))
    : [...(props.auxUnits || []), row]

  const check = validateUnitManage(props.baseUnit, nextList)
  if (!check.ok) {
    message.warning(check.message)
    return Promise.reject()
  }

  // 角色唯一：仅从其他「启用中」行剥离采购/结算
  const stripped = nextList.map((r) => {
    if (r.id === row.id) return r
    if (r.enabled === false) return r
    if (row.enabled === false) return r
    const nextRoles = (r.roles || []).filter((role) => {
      if (role === UNIT_ROLE.PURCHASE && roles.includes(UNIT_ROLE.PURCHASE)) return false
      if (role === UNIT_ROLE.SETTLE && roles.includes(UNIT_ROLE.SETTLE)) return false
      return true
    })
    return { ...r, roles: nextRoles }
  })

  emit('update:auxUnits', stripped)
  modalOpen.value = false
}

defineExpose({
  validate: () => validateUnitManage(props.baseUnit, props.auxUnits),
})
</script>

<style lang="less" scoped>
.unit-manage-tab {
  padding: 4px 0 12px;
}

.section-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 10px;
}

.section-title {
  font-weight: 600;
  font-size: 14px;
  color: rgba(0, 0, 0, 0.88);
}

.base-unit-card {
  background: #e8f3ff;
  border: 1px solid #91caff;
  border-radius: 8px;
  padding: 12px 16px;
  margin-bottom: 16px;
}

.base-unit-body {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.base-unit-desc {
  margin: 0;
  color: rgba(0, 0, 0, 0.45);
  font-size: 12px;
}

.aux-unit-section {
  margin-bottom: 8px;
}

.unit-name {
  font-weight: 500;
}

.batch-tip {
  margin-top: 12px;
  padding: 10px 12px;
  background: #fffbe6;
  border: 1px solid #ffe58f;
  border-radius: 6px;
  color: rgba(0, 0, 0, 0.65);
  font-size: 12px;
  line-height: 1.6;
}

.caliber-hint {
  margin: 10px 0 0;
  color: rgba(0, 0, 0, 0.45);
  font-size: 12px;
}

.danger-link {
  color: #ff4d4f;
}

.warn-link {
  color: #d48806;
}

.status-tag {
  margin-left: 6px;
}

:deep(.aux-row-disabled) {
  color: rgba(0, 0, 0, 0.35);
  background: #fafafa;
}

.rate-row {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 8px;
}

.rate-prefix,
.rate-suffix {
  color: rgba(0, 0, 0, 0.65);
  font-size: 13px;
}

.field-extra {
  margin-top: 6px;
  color: rgba(0, 0, 0, 0.45);
  font-size: 12px;
}

.role-soon {
  color: rgba(0, 0, 0, 0.35);
  font-size: 12px;
}

.is-view-only {
  opacity: 0.95;
}
</style>
