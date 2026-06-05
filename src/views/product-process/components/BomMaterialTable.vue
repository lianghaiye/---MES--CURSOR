<template>
  <div class="bom-material-table">
    <div class="table-toolbar">
      <span class="toolbar-title">物料清单</span>
      <a-space v-if="!readonly" :size="4">
        <a-tooltip title="刷新">
          <a-button type="text" size="small" @click="emit('refresh')">
            <ReloadOutlined />
          </a-button>
        </a-tooltip>
        <a-tooltip title="列显隐">
          <a-button type="text" size="small" @click="emit('open-column-setting')">
            <SettingOutlined />
          </a-button>
        </a-tooltip>
      </a-space>
    </div>
    <a-table
      :columns="tableColumns"
      :data-source="lines"
      row-key="id"
      size="small"
      bordered
      :pagination="false"
      :scroll="lines.length ? { x: scrollX } : undefined"
    >
      <template #bodyCell="{ column, record, index }">
        <template v-if="column.key === 'index'">{{ index + 1 }}</template>
        <template v-else-if="readonly">
          <template v-if="column.key === 'unitQty'">{{ formatQty(record.unitQty) }}</template>
          <template v-else-if="column.key === 'unitPrice'">{{
            formatPrice(record.unitPrice)
          }}</template>
          <template v-else>{{ record[column.dataIndex] ?? record[column.key] ?? '—' }}</template>
        </template>
        <template v-else-if="column.key === 'unitQty'">
          <a-input-number
            v-model:value="record.unitQty"
            size="small"
            :min="0"
            :precision="2"
            style="width: 100%"
          />
        </template>
        <template v-else-if="column.key === 'unit'">
          <a-select
            v-model:value="record.unit"
            size="small"
            style="width: 100%"
            :options="unitOpts"
          />
        </template>
        <template v-else-if="column.key === 'processDocName'">
          <a-select
            v-model:value="record.processDocName"
            allow-clear
            size="small"
            placeholder="请选择"
            style="width: 100%"
            :options="processDocOpts"
          />
        </template>
        <template v-else-if="column.key === 'processRoute'">
          <a-select
            v-model:value="record.processRoute"
            allow-clear
            size="small"
            placeholder="请选择"
            style="width: 100%"
            :options="processRouteOpts"
          />
        </template>
        <template v-else-if="column.key === 'lossRate'">
          <a-input-number
            v-model:value="record.lossRate"
            size="small"
            :min="0"
            :max="100"
            placeholder="请输入"
            style="width: 100%"
          />
        </template>
        <template v-else-if="column.key === 'unitPrice'">
          <a-input-number
            v-model:value="record.unitPrice"
            size="small"
            :min="0"
            :precision="4"
            style="width: 100%"
          />
        </template>
        <template v-else-if="column.key === 'effectiveStart'">
          <a-date-picker
            v-model:value="record._effectiveStart"
            size="small"
            style="width: 100%"
            value-format="YYYY-MM-DD"
            @change="(v) => (record.effectiveStart = v || '')"
          />
        </template>
        <template v-else-if="column.key === 'effectiveEnd'">
          <a-date-picker
            v-model:value="record._effectiveEnd"
            size="small"
            style="width: 100%"
            value-format="YYYY-MM-DD"
            @change="(v) => (record.effectiveEnd = v || '')"
          />
        </template>
        <template v-else-if="column.key === 'remark'">
          <a-input v-model:value="record.remark" size="small" placeholder="请输入备注" />
        </template>
        <template v-else-if="column.key === 'childBom'">
          <a-input v-model:value="record.childBom" size="small" placeholder="" />
        </template>
        <template v-else-if="column.key === 'childBomVersion'">
          <a-input v-model:value="record.childBomVersion" size="small" placeholder="" />
        </template>
        <template v-else-if="column.key === 'action'">
          <a-space :size="0">
            <a-button type="link" size="small" @click="emit('change-line', record)">
              <SwapOutlined />
              变更
            </a-button>
            <a-button type="link" size="small" danger @click="emit('delete-line', record.id)">
              <DeleteOutlined />
              删除
            </a-button>
          </a-space>
        </template>
        <template v-else>
          {{ record[column.dataIndex] ?? '—' }}
        </template>
      </template>
    </a-table>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import {
  ReloadOutlined,
  SettingOutlined,
  DeleteOutlined,
  SwapOutlined,
} from '@ant-design/icons-vue'
import { unitOptions, processDocOptions, processRouteOptions } from '@/mock/bomMaterialColumns'

const props = defineProps({
  lines: { type: Array, default: () => [] },
  columnSettings: { type: Array, default: () => [] },
  readonly: { type: Boolean, default: false },
})

function formatQty(val) {
  if (val == null || val === '') return '—'
  return Number(val).toFixed(2)
}

function formatPrice(val) {
  if (val == null || val === '') return '—'
  return Number(val).toFixed(4)
}

const emit = defineEmits(['refresh', 'open-column-setting', 'delete-line', 'change-line'])

const unitOpts = unitOptions.map((v) => ({ label: v, value: v }))
const processDocOpts = processDocOptions
const processRouteOpts = processRouteOptions

const widthMap = {
  materialCode: 120,
  itemName: 130,
  specModel: 100,
  categoryName: 90,
  materialType: 90,
  supplyForm: 90,
  material: 100,
  unitQty: 100,
  unit: 80,
  childBom: 100,
  childBomVersion: 110,
  processDocName: 120,
  lossRate: 120,
  processRoute: 110,
  unitPrice: 110,
  effectiveStart: 130,
  effectiveEnd: 130,
  remark: 120,
}

const tableColumns = computed(() => {
  const sorted = [...props.columnSettings]
    .filter((c) => !c.hidden)
    .sort((a, b) => a.order - b.order)

  const cols = [
    { title: '#', key: 'index', width: 48, align: 'center', fixed: 'left' },
    ...sorted.map((c) => ({
      title: c.title,
      key: c.key,
      dataIndex: c.key,
      width: widthMap[c.key] || 100,
      fixed: c.frozen ? 'left' : undefined,
      ellipsis: ['itemName', 'remark', 'material'].includes(c.key),
    })),
    ...(props.readonly ? [] : [{ title: '操作', key: 'action', width: 140, fixed: 'right' }]),
  ]
  return cols
})

const scrollX = computed(() => {
  const sum = tableColumns.value.reduce((s, c) => s + (c.width || 100), 0)
  return Math.max(sum, 1400)
})
</script>

<style lang="less" scoped>
.bom-material-table {
  .table-toolbar {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 8px;

    .toolbar-title {
      font-weight: 600;
      font-size: 14px;
    }
  }
}
</style>
