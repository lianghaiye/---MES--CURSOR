<template>
  <a-modal
    :open="open"
    :title="`存放管理 - ${warehouse?.name || ''}`"
    width="960px"
    :mask-closable="false"
    destroy-on-close
    @cancel="handleCancel"
  >
    <div class="toolbar">
      <a-button type="primary" size="small" @click="pickerOpen = true">
        <PlusOutlined />
        添加物品
      </a-button>
      <span class="hint">同一物品不可存放于多个仓库，保存时将校验冲突</span>
    </div>

    <a-table
      :columns="columns"
      :data-source="items"
      row-key="rowKey"
      size="small"
      bordered
      :pagination="false"
      :scroll="{ x: 900, y: 360 }"
    >
      <template #bodyCell="{ column, record, index }">
        <template v-if="column.key === 'index'">{{ index + 1 }}</template>
        <template v-else-if="column.key === 'itemType'">
          <a-tag :color="record.itemType === '产品' ? 'blue' : 'green'">{{
            record.itemType
          }}</a-tag>
        </template>
        <template v-else-if="column.key === 'actions'">
          <a class="danger-link" @click="removeItem(record)">移除</a>
        </template>
      </template>
      <template #emptyText>
        <a-empty :image="false" description="暂未配置存放物品，点击「添加物品」" />
      </template>
    </a-table>

    <template #footer>
      <a-button @click="handleCancel">取消</a-button>
      <a-button type="primary" :loading="saving" @click="handleSave">保存</a-button>
    </template>

    <SelectWarehouseItemModal
      v-model:open="pickerOpen"
      :selected-items="items"
      @confirm="onItemsPicked"
    />
  </a-modal>
</template>

<script setup>
import { ref, watch } from 'vue'
import { message } from 'ant-design-vue'
import { PlusOutlined } from '@ant-design/icons-vue'
import SelectWarehouseItemModal from './SelectWarehouseItemModal.vue'
import { updateWarehouseStoredItems } from '@/store/warehouseStore'

const props = defineProps({
  open: { type: Boolean, default: false },
  warehouse: { type: Object, default: null },
})

const emit = defineEmits(['update:open', 'saved'])

const items = ref([])
const pickerOpen = ref(false)
const saving = ref(false)

const columns = [
  { title: '#', key: 'index', width: 48, align: 'center' },
  { title: '类型', key: 'itemType', width: 72 },
  { title: '物品编码', dataIndex: 'code', width: 120 },
  { title: '物品名称', dataIndex: 'name', width: 140, ellipsis: true },
  { title: '规格型号', dataIndex: 'specModel', width: 100, ellipsis: true },
  { title: '类别', dataIndex: 'categoryName', width: 90 },
  { title: '库存单位', dataIndex: 'inventoryUnit', width: 80 },
  { title: '操作', key: 'actions', width: 72, fixed: 'right' },
]

watch(
  () => props.open,
  (v) => {
    if (!v) return
    const list = props.warehouse?.storedItems || []
    items.value = list.map((it) => ({
      ...it,
      rowKey: `${it.itemType}-${it.itemId}`,
    }))
  },
)

function onItemsPicked(picked) {
  const map = new Map(items.value.map((it) => [it.rowKey, it]))
  picked.forEach((it) => {
    const rowKey = `${it.itemType}-${it.itemId}`
    map.set(rowKey, { ...it, rowKey })
  })
  items.value = [...map.values()]
}

function removeItem(record) {
  items.value = items.value.filter((it) => it.rowKey !== record.rowKey)
}

function handleCancel() {
  emit('update:open', false)
}

function handleSave() {
  if (!props.warehouse?.id) return
  saving.value = true
  const payload = items.value.map((it) => {
    const copy = { ...it }
    delete copy.rowKey
    return copy
  })
  const res = updateWarehouseStoredItems(props.warehouse.id, payload)
  saving.value = false
  if (!res.ok) {
    message.warning(res.message)
    return
  }
  message.success('存放物品已保存')
  emit('saved', res.warehouse)
  emit('update:open', false)
}
</script>

<style lang="less" scoped>
.toolbar {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 12px;
}

.hint {
  font-size: 12px;
  color: #8c8c8c;
}

.danger-link {
  color: #ff4d4f;
}
</style>
