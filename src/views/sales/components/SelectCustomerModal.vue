<template>
  <a-modal
    :open="open"
    title="选择客户"
    width="min(1480px, 94vw)"
    wrap-class-name="select-customer-modal-wrap"
    :mask-closable="false"
    destroy-on-close
    class="select-customer-modal"
    @cancel="handleCancel"
  >
    <div class="filter-card">
      <a-form layout="inline" class="filter-form horizontal-form">
        <ListFilterBar
          :field-count="3"
          search-text="搜索"
          reset-text="清空"
          @search="handleSearch"
          @reset="handleClear"
        >
          <a-form-item label="客户类型">
            <a-select
              v-model:value="search.customerTypeId"
              allow-clear
              size="small"
              placeholder="全部"
              :options="customerTypeOpts"
              show-search
              option-filter-prop="label"
            />
          </a-form-item>
          <a-form-item label="客户编码">
            <a-input
              v-model:value="search.code"
              allow-clear
              size="small"
              placeholder="请输入"
              @press-enter="handleSearch"
            />
          </a-form-item>
          <a-form-item label="客户名称">
            <a-input
              v-model:value="search.name"
              allow-clear
              size="small"
              placeholder="请输入"
              @press-enter="handleSearch"
            />
          </a-form-item>
        </ListFilterBar>
      </a-form>
    </div>

    <div class="picker-body">
      <div class="table-panel">
        <div class="list-toolbar">
          <div class="list-toolbar-left">
            <a-button type="primary" size="small" @click="openCreateCustomer">
              <PlusOutlined />
              新增客户
            </a-button>
          </div>
        </div>
        <div class="table-wrap">
          <a-table
            :row-selection="rowSelection"
            :columns="columns"
            :data-source="pagedList"
            :custom-row="customRow"
            row-key="id"
            size="small"
            bordered
            :pagination="false"
            :scroll="{ x: 1100, y: '100%' }"
          >
            <template #bodyCell="{ column, record }">
              <template v-if="column.key === 'customerType'">
                {{ record.customerTypeName || '—' }}
              </template>
              <template v-else-if="column.key === 'shortName'">
                {{ record.shortName || '—' }}
              </template>
              <template v-else-if="column.key === 'customerGrade'">
                {{ record.customerGrade || '—' }}
              </template>
              <template v-else-if="column.key === 'priceLevel'">
                {{ record.priceLevel || '—' }}
              </template>
              <template v-else-if="column.key === 'salesperson'">
                {{ record.salesperson || '—' }}
              </template>
              <template v-else-if="column.key === 'updatedAt'">
                {{ record.updatedAt || '—' }}
              </template>
            </template>
          </a-table>
        </div>
        <div class="table-pager">
          <a-pagination
            v-model:current="page"
            v-model:page-size="pageSize"
            size="small"
            :total="filteredList.length"
            show-size-changer
            :page-size-options="['10', '20', '50']"
            :show-total="(total) => `共 ${total} 条`"
          />
        </div>
      </div>

      <div class="selected-panel">
        <div class="selected-head">
          <span class="selected-title">已选 {{ selectedRow ? 1 : 0 }} 项</span>
          <a-button
            v-if="selectedRow"
            type="link"
            size="small"
            class="clear-btn"
            @click="clearSelection"
          >
            清空
          </a-button>
        </div>
        <div v-if="selectedRow" class="selected-list">
          <div class="selected-item">
            <div class="selected-item-main">
              <span class="selected-code">{{ selectedRow.code || '—' }}</span>
              <span class="selected-name" :title="selectedRow.name">{{ selectedRow.name }}</span>
            </div>
            <a-button type="text" size="small" class="remove-btn" @click="clearSelection">
              <CloseOutlined />
            </a-button>
          </div>
        </div>
        <a-empty v-else :image="false" description="请从左侧选择" class="selected-empty" />
      </div>
    </div>

    <template #footer>
      <a-button @click="handleCancel">取消</a-button>
      <a-button type="primary" :disabled="!selectedRow" @click="handleConfirm">确定</a-button>
    </template>
  </a-modal>
</template>

<script setup>
import { computed, nextTick, reactive, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { message } from 'ant-design-vue'
import { CloseOutlined, PlusOutlined } from '@ant-design/icons-vue'
import ListFilterBar from '@/components/ListFilterBar.vue'
import { customerState } from '@/store/customerStore'
import { beginCustomerCreateFromPicker } from '@/store/customerPickerBridge'
import { getCustomerTypeById, getCustomerTypeOptions } from '@/store/customerTypeStore'
import { findCreatePageByListPath } from '@/config/createPages'
import { openCreateTab } from '@/utils/openCreateTab'
import { useTabs } from '@/composables/useTabs'

const props = defineProps({
  open: { type: Boolean, default: false },
  /** 已选客户名称 */
  selected: { type: String, default: '' },
})

const emit = defineEmits(['update:open', 'confirm'])

const route = useRoute()
const router = useRouter()
const { openTab } = useTabs()

const search = reactive({ customerTypeId: undefined, code: '', name: '' })
const applied = reactive({ customerTypeId: undefined, code: '', name: '' })
const selectedRow = ref(null)
const page = ref(1)
const pageSize = ref(10)

const customerTypeOpts = computed(() => getCustomerTypeOptions())

const columns = [
  { title: '客户编码', dataIndex: 'code', key: 'code', width: 120, ellipsis: true },
  { title: '客户名称', dataIndex: 'name', key: 'name', width: 160, ellipsis: true },
  { title: '客户简称', key: 'shortName', width: 120, ellipsis: true },
  { title: '客户类型', key: 'customerType', width: 110, ellipsis: true },
  { title: '客户分级', key: 'customerGrade', width: 90 },
  { title: '价目等级', key: 'priceLevel', width: 90 },
  { title: '业务员', key: 'salesperson', width: 90 },
  { title: '更新时间', key: 'updatedAt', width: 150 },
]

const pickableCustomers = computed(() => {
  void customerState.customers
  return (customerState.customers || [])
    .filter((c) => c.status !== '停用' && c.dataStatus !== '作废')
    .map((c) => ({
      ...c,
      customerTypeName: getCustomerTypeById(c.customerTypeId)?.name || '',
    }))
})

const filteredList = computed(() => {
  const typeId = applied.customerTypeId
  const codeKw = String(applied.code || '')
    .trim()
    .toLowerCase()
  const nameKw = String(applied.name || '')
    .trim()
    .toLowerCase()
  return pickableCustomers.value.filter((c) => {
    if (typeId && c.customerTypeId !== typeId) return false
    if (
      codeKw &&
      !String(c.code || '')
        .toLowerCase()
        .includes(codeKw)
    )
      return false
    if (
      nameKw &&
      !String(c.name || '')
        .toLowerCase()
        .includes(nameKw)
    )
      return false
    return true
  })
})

const pagedList = computed(() => {
  const start = (page.value - 1) * pageSize.value
  return filteredList.value.slice(start, start + pageSize.value)
})

const rowSelection = computed(() => ({
  type: 'radio',
  selectedRowKeys: selectedRow.value ? [selectedRow.value.id] : [],
  onChange: (_keys, rows) => {
    selectedRow.value = rows[0] || null
  },
}))

watch(
  () => props.open,
  (visible) => {
    if (!visible) return
    search.customerTypeId = undefined
    search.code = ''
    search.name = ''
    applied.customerTypeId = undefined
    applied.code = ''
    applied.name = ''
    page.value = 1
    const hit = pickableCustomers.value.find((c) => c.name === props.selected)
    selectedRow.value = hit || null
  },
)

function customRow(record) {
  return {
    style: { cursor: 'pointer' },
    onClick: (e) => {
      const target = e.target
      if (
        target?.closest?.('.ant-table-selection-column') ||
        target?.closest?.('.ant-radio-wrapper') ||
        target?.closest?.('.ant-radio') ||
        target?.closest?.('input')
      ) {
        return
      }
      selectedRow.value = record
    },
  }
}

function handleSearch() {
  applied.customerTypeId = search.customerTypeId
  applied.code = search.code
  applied.name = search.name
  page.value = 1
}

function handleClear() {
  search.customerTypeId = undefined
  search.code = ''
  search.name = ''
  handleSearch()
}

function clearSelection() {
  selectedRow.value = null
}

function handleCancel() {
  emit('update:open', false)
}

function handleConfirm() {
  if (!selectedRow.value) return
  emit('confirm', selectedRow.value)
  emit('update:open', false)
}

/** 新标签打开新增客户；须先关选客弹窗，否则遮罩挡住新标签 */
function openCreateCustomer() {
  const pageCfg = findCreatePageByListPath('/basic-config/customers')
  if (!pageCfg?.newPath) {
    message.warning('未找到新增客户页面配置')
    return
  }
  const returnPath = route.fullPath
  beginCustomerCreateFromPicker({
    returnPath,
  })
  emit('update:open', false)
  nextTick(() => {
    openCreateTab(router, openTab, {
      path: pageCfg.newPath,
      title: pageCfg.title || '新增客户',
      query: {
        fromCustomerPicker: '1',
        returnTo: returnPath,
      },
    }).catch(() => {
      /* 重复导航等忽略 */
    })
  })
}
</script>

<script>
export default { name: 'SelectCustomerModal' }
</script>

<style lang="less" scoped>
.select-customer-modal {
  .filter-card {
    flex-shrink: 0;
    margin-bottom: 12px;
  }

  .picker-body {
    display: flex;
    gap: 12px;
    align-items: stretch;
    flex: 1;
    min-height: 480px;
    height: 560px;
    max-height: calc(90vh - 200px);
  }

  .table-panel {
    flex: 1;
    min-width: 0;
    min-height: 0;
    display: flex;
    flex-direction: column;
  }

  .list-toolbar {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 8px;
    margin-bottom: 12px;
    flex-shrink: 0;
  }

  .list-toolbar-left {
    display: flex;
    align-items: center;
    gap: 8px;
  }

  .table-wrap {
    flex: 1;
    min-height: 0;
    overflow: hidden;

    :deep(.ant-table-wrapper),
    :deep(.ant-spin-nested-loading),
    :deep(.ant-spin-container),
    :deep(.ant-table),
    :deep(.ant-table-container) {
      height: 100%;
    }
  }

  .table-pager {
    display: flex;
    justify-content: flex-end;
    flex-shrink: 0;
    margin-top: 12px;
    padding-top: 4px;
  }

  .selected-panel {
    width: 260px;
    flex-shrink: 0;
    align-self: stretch;
    min-height: 0;
    overflow: hidden;
    border: 1px solid #f0f0f0;
    border-radius: 4px;
    display: flex;
    flex-direction: column;
    background: #fafafa;
  }

  .selected-head {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 10px 12px;
    border-bottom: 1px solid #f0f0f0;
    background: #fff;
    flex-shrink: 0;
  }

  .selected-title {
    font-weight: 600;
    font-size: 13px;
    color: #333;
  }

  .clear-btn {
    padding: 0;
    height: auto;
  }

  .selected-list {
    flex: 1;
    min-height: 0;
    overflow-x: hidden;
    overflow-y: auto;
    padding: 8px;
  }

  .selected-item {
    display: flex;
    align-items: flex-start;
    gap: 4px;
    padding: 6px 8px;
    margin-bottom: 6px;
    background: #fff;
    border: 1px solid #f0f0f0;
    border-radius: 4px;
  }

  .selected-item-main {
    flex: 1;
    min-width: 0;
    display: flex;
    flex-direction: column;
    gap: 2px;
  }

  .selected-code {
    font-size: 12px;
    color: #1677ff;
    font-weight: 500;
  }

  .selected-name {
    font-size: 12px;
    color: rgba(0, 0, 0, 0.65);
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .remove-btn {
    flex-shrink: 0;
    color: rgba(0, 0, 0, 0.45);

    &:hover {
      color: #ff4d4f;
    }
  }

  .selected-empty {
    flex: 1;
    min-height: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 24px 0;
  }
}
</style>

<style lang="less">
.select-customer-modal-wrap {
  .ant-modal {
    max-width: min(1480px, 94vw);
    top: 24px;
    padding-bottom: 0;
  }

  .ant-modal-content {
    display: flex;
    flex-direction: column;
    max-height: 92vh;
  }

  .ant-modal-body {
    flex: 1;
    min-height: 0;
    overflow: hidden;
    display: flex;
    flex-direction: column;
  }
}
</style>
