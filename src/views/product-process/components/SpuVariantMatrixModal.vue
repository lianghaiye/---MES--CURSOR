<template>
  <a-modal
    :open="open"
    :title="`变体矩阵 — ${spu?.name || ''}`"
    width="900px"
    :mask-closable="false"
    destroy-on-close
    @cancel="emit('update:open', false)"
  >
    <a-alert
      type="info"
      show-icon
      message="勾选规格×材质组合后批量生成 SKU；已存在的组合会跳过或更新。"
      style="margin-bottom: 12px"
    />

    <a-table
      :columns="columns"
      :data-source="matrixRows"
      :pagination="false"
      row-key="rowKey"
      size="small"
      :row-selection="rowSelection"
      :scroll="{ y: 360 }"
    >
      <template #bodyCell="{ column, record }">
        <template v-if="column.key === 'exists'">
          <a-tag v-if="record.existingSku" color="green">已有 SKU</a-tag>
          <a-tag v-else>待生成</a-tag>
        </template>
        <template v-else-if="column.key === 'previewName'">
          {{ record.previewName }}
        </template>
      </template>
    </a-table>

    <div class="custom-row" style="margin-top: 12px">
      <a-space wrap>
        <a-input v-model:value="customSpec" placeholder="规格" style="width: 120px" />
        <a-select
          v-model:value="customMaterialGradeId"
          allow-clear
          show-search
          placeholder="材质"
          style="width: 140px"
          :options="materialGradeOpts"
        />
        <a-button size="small" @click="addCustomRow">添加组合</a-button>
      </a-space>
    </div>

    <template #footer>
      <a-button @click="emit('update:open', false)">关闭</a-button>
      <a-button type="primary" :loading="generating" @click="handleGenerate">
        生成选中 SKU（{{ selectedKeys.length }}）
      </a-button>
    </template>
  </a-modal>
</template>

<script setup>
import { computed, ref, watch } from 'vue'
import { message } from 'ant-design-vue'
import { batchGenerateSkus, listSkusForSpu } from '@/utils/spuSkuSave'
import { buildSkuDisplayName } from '@/utils/spuVariant'
import { getMaterialGradeOptions, materialGradeState } from '@/store/materialGradeStore'
import { resolveMaterialNameFromGradeId } from '@/utils/materialGradeResolve'

const props = defineProps({
  open: Boolean,
  spu: { type: Object, default: null },
})
const emit = defineEmits(['update:open', 'saved'])

const selectedKeys = ref([])
const generating = ref(false)
const customSpec = ref('')
const customMaterialGradeId = ref(undefined)
const extraCombos = ref([])

const materialGradeOpts = computed(() => {
  void materialGradeState.items
  return getMaterialGradeOptions()
})

const columns = [
  { title: '规格型号', dataIndex: 'specModel', key: 'specModel', width: 120 },
  { title: '材质', dataIndex: 'material', key: 'material', width: 100 },
  { title: '预览名称', key: 'previewName', width: 200 },
  { title: '状态', key: 'exists', width: 100 },
]

const defaultCombos = computed(() => {
  const spu = props.spu
  if (!spu) return []
  const specs = ['HT250', '304', '316L', 'DN80']
  const grades = materialGradeState.items.slice(0, 4)
  const combos = []
  specs.forEach((spec) => {
    grades.forEach((g) => {
      combos.push({
        specModel: spec,
        material: g.name,
        materialGradeId: g.id,
      })
    })
  })
  return combos
})

const matrixRows = computed(() => {
  const spu = props.spu
  if (!spu) return []
  const existing = listSkusForSpu(spu.id)
  const allCombos = [...defaultCombos.value, ...extraCombos.value]
  const seen = new Set()
  return allCombos
    .filter((c) => {
      const k = `${c.specModel}::${c.material}`
      if (seen.has(k)) return false
      seen.add(k)
      return true
    })
    .map((combo) => {
      const variantValues = { specModel: combo.specModel, material: combo.material }
      const existingSku = existing.find(
        (s) =>
          s.variantValues?.specModel === combo.specModel &&
          s.variantValues?.material === combo.material,
      )
      return {
        rowKey: `${combo.specModel}::${combo.material}`,
        ...combo,
        previewName: buildSkuDisplayName(spu.name, variantValues, spu.variantAxes),
        existingSku,
      }
    })
})

const rowSelection = computed(() => ({
  selectedRowKeys: selectedKeys.value,
  onChange: (keys) => {
    selectedKeys.value = keys
  },
}))

watch(
  () => props.open,
  (val) => {
    if (val) {
      selectedKeys.value = matrixRows.value.filter((r) => !r.existingSku).map((r) => r.rowKey)
      extraCombos.value = []
    }
  },
)

function addCustomRow() {
  if (!customSpec.value?.trim()) {
    message.warning('请输入规格')
    return
  }
  const material = resolveMaterialNameFromGradeId(customMaterialGradeId.value, '')
  extraCombos.value.push({
    specModel: customSpec.value.trim(),
    material,
    materialGradeId: customMaterialGradeId.value || '',
  })
  customSpec.value = ''
  customMaterialGradeId.value = undefined
}

function handleGenerate() {
  const spu = props.spu
  if (!spu?.id) return
  const picked = matrixRows.value.filter((r) => selectedKeys.value.includes(r.rowKey))
  if (!picked.length) {
    message.warning('请至少选择一行')
    return
  }
  generating.value = true
  try {
    const results = batchGenerateSkus(
      spu.id,
      picked.map((r) => ({
        specModel: r.specModel,
        material: r.material,
        materialGradeId: r.materialGradeId,
      })),
    )
    const created = results.filter((r) => r.created).length
    const updated = results.filter((r) => r.sku && !r.created).length
    message.success(`已生成 ${created} 个新 SKU，更新 ${updated} 个`)
    emit('saved')
    emit('update:open', false)
  } finally {
    generating.value = false
  }
}
</script>
