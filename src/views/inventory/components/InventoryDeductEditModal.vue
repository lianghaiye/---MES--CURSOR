<template>
  <a-modal
    :open="open"
    title="编辑待确认"
    :width="980"
    destroy-on-close
    ok-text="保存"
    cancel-text="取消"
    @cancel="emit('update:open', false)"
    @ok="handleOk"
  >
    <a-form layout="vertical" class="edit-form">
      <a-form-item label="仓库" required>
        <a-select
          v-model:value="form.warehouseKey"
          :options="warehouseOpts"
          show-search
          placeholder="请选择仓库"
          style="width: 100%"
        />
      </a-form-item>
    </a-form>

    <div class="section-head">
      <span>扣减物料</span>
      <a-button type="link" size="small" @click="pickerOpen = true">+ 添加物料</a-button>
    </div>
    <a-table
      :columns="columns"
      :data-source="form.lines"
      row-key="id"
      size="small"
      bordered
      :pagination="false"
    >
      <template #bodyCell="{ column, record, index }">
        <template v-if="column.key === 'blankSizeText'">
          {{ record.blankSizeText || '—' }}
        </template>
        <template v-else-if="column.key === 'planQty'">
          <a-input-number
            v-model:value="record.planQty"
            :min="0"
            :precision="3"
            size="small"
            style="width: 100%"
          />
        </template>
        <template v-else-if="column.key === 'action'">
          <a-button type="link" size="small" danger @click="form.lines.splice(index, 1)">
            删除
          </a-button>
        </template>
      </template>
    </a-table>

    <SelectBomMaterialModal
      v-model:open="pickerOpen"
      :multiple="true"
      :include-spu-templates="false"
      @selected="onMaterialsPicked"
    />
  </a-modal>
</template>

<script setup>
import { reactive, ref, watch } from 'vue'
import { message } from 'ant-design-vue'
import { getWarehouseSelectOptions, warehouseState } from '@/store/warehouseStore'
import { updatePendingMaterialDeduct } from '@/store/materialRequisitionStore'
import SelectBomMaterialModal from '@/views/product-process/components/SelectBomMaterialModal.vue'

const props = defineProps({
  open: { type: Boolean, default: false },
  record: { type: Object, default: null },
})

const emit = defineEmits(['update:open', 'saved'])

const pickerOpen = ref(false)
const form = reactive({
  warehouseKey: '',
  lines: [],
})

const warehouseOpts = ref([])

const columns = [
  { title: '物料编码', dataIndex: 'materialCode', key: 'materialCode', width: 110 },
  { title: '物料名称', dataIndex: 'materialName', key: 'materialName', width: 120 },
  { title: '规格型号', dataIndex: 'specModel', key: 'specModel', width: 100, ellipsis: true },
  { title: '材质', dataIndex: 'material', key: 'material', width: 80, ellipsis: true },
  { title: '图号', dataIndex: 'drawingNo', key: 'drawingNo', width: 100, ellipsis: true },
  {
    title: '变体属性',
    dataIndex: 'variantSummary',
    key: 'variantSummary',
    width: 120,
    ellipsis: true,
  },
  { title: '下料尺寸', key: 'blankSizeText', width: 150, ellipsis: true },
  { title: '扣减数量', key: 'planQty', width: 100 },
  { title: '操作', key: 'action', width: 70 },
]

watch(
  () => [props.open, props.record],
  () => {
    if (!props.open || !props.record) return
    warehouseOpts.value = warehouseState.warehouses
      .filter((w) => w.enabled !== false)
      .map((w) => ({
        label: `${w.name}${w.code ? ` (${w.code})` : ''}`,
        value: `${w.name}|${w.code || ''}`,
      }))
    if (!warehouseOpts.value.length) {
      warehouseOpts.value = getWarehouseSelectOptions().map((w) => ({
        label: w.label,
        value: `${w.value}|`,
      }))
    }
    form.warehouseKey = `${props.record.warehouseName}|${props.record.warehouseCode || ''}`
    form.lines = (props.record.lines || []).map((l) => ({ ...l }))
  },
)

function onMaterialsPicked(items) {
  const list = Array.isArray(items) ? items : [items]
  list.forEach((item) => {
    const code = item.code || item.itemCode || ''
    const exists = form.lines.find((l) => l.materialCode === code)
    if (exists) {
      exists.planQty = Number(exists.planQty || 0) + 1
      return
    }
    form.lines.push({
      id: `edit-line-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      materialCode: code,
      materialName: item.name || item.itemName || '',
      specModel: item.specModel || '',
      material: item.material || '',
      drawingNo: item.drawingNo || '',
      variantSummary: item.variantSummary || '',
      variantValues: item.variantValues ? { ...item.variantValues } : {},
      blankSize: item.blankSize || null,
      blankSizeText: item.blankSizeText || '',
      blankSizeMode: item.blankSizeMode || '',
      planQty: 1,
      actualQty: 0,
      status: '待确认',
      failReason: '',
      warehouseStockQty: null,
    })
  })
}

function handleOk() {
  if (!form.warehouseKey) {
    message.warning('请选择仓库')
    return Promise.reject()
  }
  if (!form.lines.length) {
    message.warning('请至少保留一条物料')
    return Promise.reject()
  }
  const [warehouseName, warehouseCode = ''] = form.warehouseKey.split('|')
  const res = updatePendingMaterialDeduct(props.record.id, {
    warehouseName,
    warehouseCode,
    lines: form.lines,
  })
  if (!res.ok) {
    message.warning(res.message)
    return Promise.reject()
  }
  message.success('已保存')
  emit('update:open', false)
  emit('saved')
}
</script>

<style lang="less" scoped>
.section-head {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
  font-weight: 600;
}
</style>
