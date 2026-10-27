<template>
  <a-modal
    :open="open"
    title="选择合同"
    width="min(1480px, 94vw)"
    wrap-class-name="select-contract-modal-wrap"
    :mask-closable="false"
    destroy-on-close
    class="select-contract-modal"
    @cancel="handleCancel"
  >
    <div class="filter-card">
      <a-form layout="inline" class="filter-form horizontal-form">
        <ListFilterBar
          :field-count="4"
          search-text="搜索"
          reset-text="清空"
          @search="handleSearch"
          @reset="handleClear"
        >
          <a-form-item label="合同类型">
            <a-select
              v-model:value="search.contractType"
              allow-clear
              size="small"
              placeholder="全部"
              :options="contractTypeOptions"
              :disabled="!!lockContractType"
            />
          </a-form-item>
          <a-form-item label="合同编号">
            <a-input
              v-model:value="search.contractNo"
              allow-clear
              size="small"
              placeholder="请输入"
              @press-enter="handleSearch"
            />
          </a-form-item>
          <a-form-item label="合同名称">
            <a-input
              v-model:value="search.contractName"
              allow-clear
              size="small"
              placeholder="请输入"
              @press-enter="handleSearch"
            />
          </a-form-item>
          <a-form-item :label="partyFilterLabel">
            <a-input
              v-model:value="search.partyName"
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
              <template v-if="column.key === 'status'">
                <a-tag :color="contractStatusColor(record.status)">{{ record.status }}</a-tag>
              </template>
              <template v-else-if="column.key === 'partyName'">
                {{ getContractPartyName(record) || '—' }}
              </template>
              <template v-else-if="column.key === 'validRange'">
                {{ record.validFrom || '—' }} ~ {{ record.validTo || '—' }}
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
              <span class="selected-code">{{ selectedRow.contractNo || '—' }}</span>
              <span class="selected-name" :title="selectedRow.contractName">
                {{ selectedRow.contractName || selectedRow.contractType || '—' }}
              </span>
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
import { computed, reactive, ref, watch } from 'vue'
import { CloseOutlined } from '@ant-design/icons-vue'
import ListFilterBar from '@/components/ListFilterBar.vue'
import {
  CONTRACT_CASH_DIRECTION,
  CONTRACT_STATUS,
  contractPartyFieldLabel,
  contractStatusColor,
  contractTypeOptions,
  getContractPartyName,
  resolveContractCashDirection,
  resolveContractCategory,
} from '@/constants/salesContract'
import { salesContractState } from '@/store/salesContractStore'

const props = defineProps({
  open: { type: Boolean, default: false },
  /** 已选合同编号 */
  selected: { type: String, default: '' },
  /** 锁定合同类型（如订单已选标准/框架） */
  lockContractType: { type: String, default: '' },
  /** 优先按客户过滤（可清空） */
  preferredCustomerName: { type: String, default: '' },
  preferredSupplierName: { type: String, default: '' },
  cashDirection: { type: String, default: CONTRACT_CASH_DIRECTION.INCOME },
  contractCategory: { type: String, default: '' },
})

const emit = defineEmits(['update:open', 'confirm'])

const partyFilterLabel = computed(() => contractPartyFieldLabel(props.cashDirection))

function preferredPartyName() {
  return props.cashDirection === CONTRACT_CASH_DIRECTION.EXPENSE
    ? props.preferredSupplierName || ''
    : props.preferredCustomerName || ''
}

const search = reactive({
  contractType: undefined,
  contractNo: '',
  contractName: '',
  partyName: '',
})
const applied = reactive({
  contractType: undefined,
  contractNo: '',
  contractName: '',
  partyName: '',
})
const selectedRow = ref(null)
const page = ref(1)
const pageSize = ref(10)

const columns = [
  { title: '合同编号', dataIndex: 'contractNo', key: 'contractNo', width: 140, ellipsis: true },
  { title: '合同名称', dataIndex: 'contractName', key: 'contractName', width: 180, ellipsis: true },
  { title: '合同类型', dataIndex: 'contractType', key: 'contractType', width: 100 },
  { title: '相对方', key: 'partyName', width: 160, ellipsis: true },
  { title: '状态', key: 'status', width: 90 },
  { title: '业务员', dataIndex: 'salesperson', key: 'salesperson', width: 90 },
  { title: '有效期', key: 'validRange', width: 200 },
]

const pickableContracts = computed(() => {
  void salesContractState.contracts
  const dir = props.cashDirection || CONTRACT_CASH_DIRECTION.INCOME
  const cat = String(props.contractCategory || '').trim()
  return (salesContractState.contracts || []).filter((c) => {
    if (c.status !== CONTRACT_STATUS.ACTIVE) return false
    if (resolveContractCashDirection(c) !== dir) return false
    if (cat && resolveContractCategory(c) !== cat) return false
    return true
  })
})

const filteredList = computed(() => {
  const type = applied.contractType
  const noKw = String(applied.contractNo || '')
    .trim()
    .toLowerCase()
  const nameKw = String(applied.contractName || '')
    .trim()
    .toLowerCase()
  const partyKw = String(applied.partyName || '')
    .trim()
    .toLowerCase()
  return pickableContracts.value.filter((c) => {
    if (type && c.contractType !== type) return false
    if (
      noKw &&
      !String(c.contractNo || '')
        .toLowerCase()
        .includes(noKw)
    )
      return false
    if (
      nameKw &&
      !String(c.contractName || '')
        .toLowerCase()
        .includes(nameKw)
    )
      return false
    if (
      partyKw &&
      !String(getContractPartyName(c) || '')
        .toLowerCase()
        .includes(partyKw)
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
    search.contractType = props.lockContractType || undefined
    search.contractNo = ''
    search.contractName = ''
    search.partyName = preferredPartyName()
    applied.contractType = props.lockContractType || undefined
    applied.contractNo = ''
    applied.contractName = ''
    applied.partyName = preferredPartyName()
    page.value = 1
    const hit = pickableContracts.value.find((c) => c.contractNo === props.selected)
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
  applied.contractType = search.contractType
  applied.contractNo = search.contractNo
  applied.contractName = search.contractName
  applied.partyName = search.partyName
  page.value = 1
}

function handleClear() {
  search.contractType = props.lockContractType || undefined
  search.contractNo = ''
  search.contractName = ''
  search.partyName = ''
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
</script>

<script>
export default { name: 'SelectContractModal' }
</script>

<style lang="less" scoped>
.select-contract-modal {
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

    :deep(.ant-table-body) {
      overflow: auto !important;
    }
  }

  .table-pager {
    margin-top: 8px;
    display: flex;
    justify-content: flex-end;
    flex-shrink: 0;
  }

  .selected-panel {
    width: 280px;
    flex-shrink: 0;
    border: 1px solid #f0f0f0;
    border-radius: 6px;
    padding: 12px;
    background: #fafafa;
    display: flex;
    flex-direction: column;
    min-height: 0;
  }

  .selected-head {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 8px;
  }

  .selected-title {
    font-size: 13px;
    font-weight: 500;
  }

  .clear-btn {
    padding: 0;
  }

  .selected-list {
    flex: 1;
    overflow: auto;
  }

  .selected-item {
    display: flex;
    align-items: flex-start;
    gap: 8px;
    padding: 8px;
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
    color: rgba(0, 0, 0, 0.45);
  }

  .selected-name {
    font-size: 13px;
    color: rgba(0, 0, 0, 0.88);
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .selected-empty {
    margin-top: 48px;
  }

  .horizontal-form {
    width: 100%;

    :deep(.ant-form-item) {
      margin-bottom: 0;
    }
  }
}
</style>

<style lang="less">
.select-contract-modal-wrap {
  .ant-modal {
    top: 24px;
    padding-bottom: 0;
  }

  .ant-modal-content {
    display: flex;
    flex-direction: column;
    max-height: calc(100vh - 48px);
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
