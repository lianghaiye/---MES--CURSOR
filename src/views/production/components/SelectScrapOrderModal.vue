<template>
  <a-modal
    :open="open"
    title="选择报废单"
    width="900px"
    destroy-on-close
    @cancel="emit('update:open', false)"
    @ok="handleOk"
  >
    <a-form layout="inline" class="search-form">
      <a-form-item label="报废单号">
        <a-input
          v-model:value="search.scrapNo"
          allow-clear
          placeholder="请输入报废单号"
          size="small"
        />
      </a-form-item>
      <a-form-item label="物品名称">
        <a-input
          v-model:value="search.itemName"
          allow-clear
          placeholder="请输入物品名称"
          size="small"
        />
      </a-form-item>
      <a-form-item label="处理方式">
        <a-select
          v-model:value="search.processMethod"
          allow-clear
          placeholder="请选择"
          size="small"
          style="width: 120px"
          :options="processMethodOpts"
        />
      </a-form-item>
      <a-form-item>
        <a-space>
          <a-button type="primary" size="small" @click="handleSearch">
            <SearchOutlined />
            搜索
          </a-button>
          <a-button size="small" @click="handleClear">
            <DeleteOutlined />
            清空
          </a-button>
        </a-space>
      </a-form-item>
    </a-form>

    <a-table
      :row-selection="rowSelection"
      :columns="columns"
      :data-source="filteredList"
      row-key="id"
      size="small"
      bordered
      :pagination="{ pageSize: 6, size: 'small' }"
    />
  </a-modal>
</template>

<script setup>
import { computed, reactive, ref, watch } from 'vue'
import { message } from 'ant-design-vue'
import { SearchOutlined, DeleteOutlined } from '@ant-design/icons-vue'
import { mockScrapOrders } from '@/mock/disassemblyScrapOrders'

const props = defineProps({
  open: Boolean,
  selectedId: { type: String, default: '' },
})

const emit = defineEmits(['update:open', 'confirm'])

const search = reactive({ scrapNo: '', itemName: '', processMethod: undefined })
const applied = reactive({ scrapNo: '', itemName: '', processMethod: undefined })
const selectedRowKeys = ref([])
const selectedRow = ref(null)

const processMethodOpts = ['拆解', '返修', '报废'].map((v) => ({ label: v, value: v }))

const columns = [
  { title: '报废单号', dataIndex: 'scrapNo', width: 140 },
  { title: '物品名称', dataIndex: 'itemName', width: 120 },
  { title: '物品编码', dataIndex: 'itemCode', width: 120 },
  { title: '规格型号', dataIndex: 'specModel', width: 130 },
  { title: '材质', dataIndex: 'material', width: 90 },
  { title: '处理方式', dataIndex: 'processMethod', width: 90 },
  { title: '创建日期', dataIndex: 'createdAt', width: 110 },
]

const filteredList = computed(() =>
  mockScrapOrders.filter((row) => {
    if (applied.scrapNo && !row.scrapNo.includes(applied.scrapNo)) return false
    if (applied.itemName && !row.itemName.includes(applied.itemName)) return false
    if (applied.processMethod && row.processMethod !== applied.processMethod) return false
    return true
  }),
)

const rowSelection = computed(() => ({
  type: 'radio',
  selectedRowKeys: selectedRowKeys.value,
  onChange: (keys, rows) => {
    selectedRowKeys.value = keys
    selectedRow.value = rows[0] || null
  },
}))

watch(
  () => props.open,
  (v) => {
    if (!v) return
    selectedRowKeys.value = props.selectedId ? [props.selectedId] : []
    selectedRow.value = mockScrapOrders.find((r) => r.id === props.selectedId) || null
    handleClear()
  },
)

function handleSearch() {
  applied.scrapNo = search.scrapNo
  applied.itemName = search.itemName
  applied.processMethod = search.processMethod
}

function handleClear() {
  search.scrapNo = ''
  search.itemName = ''
  search.processMethod = undefined
  applied.scrapNo = ''
  applied.itemName = ''
  applied.processMethod = undefined
}

function handleOk() {
  if (!selectedRow.value) {
    message.warning('请选择报废单')
    return
  }
  emit('confirm', selectedRow.value)
  emit('update:open', false)
}
</script>

<script>
export default { name: 'SelectScrapOrderModal' }
</script>

<style scoped>
.search-form {
  margin-bottom: 12px;
}
</style>
