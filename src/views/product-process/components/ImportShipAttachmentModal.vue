<template>
  <a-modal
    :open="open"
    title="从其他附件导入"
    width="960px"
    :mask-closable="false"
    destroy-on-close
    class="import-ship-attachment-modal"
    @cancel="emit('update:open', false)"
  >
    <div class="filter-card">
      <a-form
        :model="filters"
        class="filter-form"
        :label-col="{ flex: '72px' }"
        :wrapper-col="{ flex: '1' }"
      >
        <a-row :gutter="[12, 8]">
          <a-col :span="8">
            <a-form-item label="编号">
              <a-input
                v-model:value="filters.bomNo"
                allow-clear
                size="small"
                placeholder="请输入编号"
              />
            </a-form-item>
          </a-col>
          <a-col :span="8">
            <a-form-item label="名称">
              <a-input
                v-model:value="filters.bomName"
                allow-clear
                size="small"
                placeholder="请输入名称"
              />
            </a-form-item>
          </a-col>
          <a-col :span="8">
            <a-form-item label=" " :colon="false" class="filter-actions">
              <a-space>
                <a-button type="primary" size="small" @click="handleSearch">
                  <SearchOutlined />
                  搜索
                </a-button>
                <a-button size="small" @click="handleReset">清空</a-button>
              </a-space>
            </a-form-item>
          </a-col>
        </a-row>
      </a-form>
    </div>

    <div v-if="selectedRow" class="selected-tag">
      <a-tag color="blue" closable @close="selectedRowKeys = []">
        {{ selectedRow.bomNo }}-{{ selectedRow.bomName }}
      </a-tag>
    </div>

    <a-table
      :columns="columns"
      :data-source="pagedList"
      row-key="id"
      size="small"
      bordered
      :pagination="false"
      :row-selection="rowSelection"
      :scroll="{ x: 860, y: 360 }"
      :custom-row="customRow"
    >
      <template #bodyCell="{ column, record }">
        <template v-if="column.key === 'status'">
          <a-tag :color="isShipAttachmentEnabled(record) ? 'success' : 'default'">
            {{ displayShipAttachmentStatus(record) }}
          </a-tag>
        </template>
        <template v-else-if="column.key === 'scopeType'">
          {{
            shipAttachmentScopeTypeLabel(
              record.scopeType || normalizeShipAttachmentScope(record).scopeType,
            )
          }}
        </template>
        <template v-else-if="column.key === 'scopeObjects'">
          {{ formatShipAttachmentObjects(record) }}
        </template>
      </template>
    </a-table>

    <div class="table-pagination">
      <a-pagination
        v-model:current="pagination.current"
        v-model:page-size="pagination.pageSize"
        :total="filteredList.length"
        size="small"
        show-size-changer
        :page-size-options="['10', '20', '50']"
        :show-total="(t) => `共 ${t} 条`"
        show-quick-jumper
      />
    </div>

    <template #footer>
      <a-button @click="emit('update:open', false)">取消</a-button>
      <a-button type="primary" :disabled="!selectedRow" @click="confirm">确定</a-button>
    </template>
  </a-modal>
</template>

<script setup>
import { computed, reactive, ref, watch } from 'vue'
import { message } from 'ant-design-vue'
import { SearchOutlined } from '@ant-design/icons-vue'
import { isShipBomType } from '@/mock/bomMaterialColumns'
import { productBomState } from '@/store/productBomStore'
import { calcBomMaterialCount } from '@/utils/productBomListEnrich'
import {
  displayShipAttachmentStatus,
  formatShipAttachmentObjects,
  isShipAttachmentEnabled,
  normalizeShipAttachmentScope,
  shipAttachmentScopeTypeLabel,
} from '@/utils/shipAttachmentScope'

const props = defineProps({
  open: Boolean,
  /** 当前正在编辑的附件，列表中排除自身 */
  excludeId: { type: String, default: '' },
})

const emit = defineEmits(['update:open', 'confirm'])

const columns = [
  { title: '状态', key: 'status', width: 80 },
  { title: '编号', dataIndex: 'bomNo', width: 130, ellipsis: true },
  { title: '名称', dataIndex: 'bomName', width: 180, ellipsis: true },
  { title: '适用范围', key: 'scopeType', width: 90 },
  { title: '适用对象', key: 'scopeObjects', width: 180, ellipsis: true },
  { title: '物料数', dataIndex: 'materialCount', width: 80, align: 'center' },
]

const filters = reactive({ bomNo: '', bomName: '' })
const appliedFilters = ref({ bomNo: '', bomName: '' })
const selectedRowKeys = ref([])
const pagination = reactive({ current: 1, pageSize: 10 })

const sourceList = computed(() => {
  const exclude = String(props.excludeId || '')
  return productBomState.boms
    .filter((b) => {
      if (!isShipBomType(b.bomType)) return false
      if (exclude && String(b.id) === exclude) return false
      return true
    })
    .map((b) => ({
      ...b,
      materialCount: calcBomMaterialCount(b.lineItems),
    }))
})

const filteredList = computed(() => {
  const f = appliedFilters.value
  return sourceList.value.filter((row) => {
    if (f.bomNo && !String(row.bomNo || '').includes(f.bomNo.trim())) return false
    if (f.bomName && !String(row.bomName || '').includes(f.bomName.trim())) return false
    return true
  })
})

const pagedList = computed(() => {
  const start = (pagination.current - 1) * pagination.pageSize
  return filteredList.value.slice(start, start + pagination.pageSize)
})

const selectedRow = computed(() =>
  filteredList.value.find((b) => b.id === selectedRowKeys.value[0]),
)

const rowSelection = computed(() => ({
  type: 'radio',
  selectedRowKeys: selectedRowKeys.value,
  onChange: (keys) => {
    selectedRowKeys.value = keys
  },
}))

function customRow(record) {
  return {
    onClick: () => {
      selectedRowKeys.value = [record.id]
    },
  }
}

function handleSearch() {
  appliedFilters.value = { ...filters }
  pagination.current = 1
}

function handleReset() {
  filters.bomNo = ''
  filters.bomName = ''
  handleSearch()
}

watch(
  () => props.open,
  (v) => {
    if (!v) return
    selectedRowKeys.value = []
    handleReset()
  },
)

function confirm() {
  if (!selectedRow.value) {
    message.warning('请选择要导入的随货附件')
    return
  }
  emit('confirm', selectedRow.value)
  emit('update:open', false)
}
</script>

<script>
export default { name: 'ImportShipAttachmentModal' }
</script>

<style lang="less" scoped>
.filter-card {
  margin-bottom: 12px;
}

.filter-form {
  :deep(.ant-form-item) {
    margin-bottom: 0;
  }

  :deep(.filter-actions) {
    .ant-form-item-label > label {
      visibility: hidden;
    }
  }
}

.selected-tag {
  margin-bottom: 8px;
}

.table-pagination {
  display: flex;
  justify-content: flex-end;
  margin-top: 12px;
}

:deep(.ant-table-tbody > tr) {
  cursor: pointer;
}
</style>
