<template>
  <div class="packaging-page">
    <a-tabs v-model:activeKey="activeTab" size="small" class="page-tabs">
      <a-tab-pane key="spu" tab="包装族" />
      <a-tab-pane key="sku" tab="包装 SKU" />
    </a-tabs>

    <!-- 包装族 -->
    <template v-if="activeTab === 'spu'">
      <div class="filter-card">
        <a-form layout="inline" class="filter-form horizontal-form">
          <a-row :gutter="[12, 8]" style="width: 100%">
            <a-col :xs="24" :sm="12" :md="8">
              <a-form-item label="族名称/编码">
                <a-input
                  v-model:value="spuFilters.keyword"
                  allow-clear
                  size="small"
                  placeholder="搜索包装族"
                />
              </a-form-item>
            </a-col>
            <a-col :xs="24" :sm="12" :md="8">
              <a-form-item class="filter-actions-item">
                <a-space>
                  <a-button type="primary" size="small" @click="handleSpuSearch">
                    <SearchOutlined />
                    查询
                  </a-button>
                  <a-button size="small" @click="handleSpuReset">
                    <DeleteOutlined />
                    清空
                  </a-button>
                </a-space>
              </a-form-item>
            </a-col>
          </a-row>
        </a-form>
      </div>

      <div class="toolbar-row">
        <a-space wrap :size="8">
          <a-button type="primary" size="small" @click="openCreateSpu">
            <PlusOutlined />
            新建包装族
          </a-button>
        </a-space>
        <a-space :size="4" class="toolbar-icons">
          <a-tooltip title="刷新">
            <a-button type="text" size="small" @click="handleSpuSearch">
              <ReloadOutlined />
            </a-button>
          </a-tooltip>
        </a-space>
      </div>

      <div class="table-card">
        <a-table
          :columns="spuColumns"
          :data-source="spuList"
          row-key="id"
          size="small"
          bordered
          :pagination="{ pageSize: 10, size: 'small', showSizeChanger: true }"
          :scroll="{ x: 1100 }"
        >
          <template #bodyCell="{ column, record, index }">
            <template v-if="column.key === 'index'">{{ index + 1 }}</template>
            <template v-else-if="column.key === 'businessType'">
              {{ formatBusinessTypeLabels(record, PACKAGING_BUSINESS_TYPE_OPTIONS) }}
            </template>
            <template v-else-if="column.key === 'variantAxes'">
              {{ (record.variantAxes || []).map((a) => a.label).join(' × ') || '—' }}
            </template>
            <template v-else-if="column.key === 'skuCount'">
              {{ countSkusForPackagingSpu(record.id) }}
            </template>
            <template v-else-if="column.key === 'actions'">
              <a-space :size="8">
                <a @click="openEditSpu(record)">编辑</a>
                <a @click="openMatrix(record)">变体矩阵</a>
                <a class="danger-link" @click="handleDeleteSpu(record)">删除</a>
              </a-space>
            </template>
          </template>
        </a-table>
      </div>
    </template>

    <!-- 包装 SKU -->
    <template v-else>
      <div class="filter-card">
        <a-form layout="inline" class="filter-form horizontal-form">
          <a-row :gutter="[12, 8]" style="width: 100%">
            <a-col :xs="24" :sm="12" :md="6">
              <a-form-item label="SKU编码">
                <a-input
                  v-model:value="skuFilters.code"
                  allow-clear
                  size="small"
                  placeholder="编码"
                />
              </a-form-item>
            </a-col>
            <a-col :xs="24" :sm="12" :md="6">
              <a-form-item label="名称">
                <a-input
                  v-model:value="skuFilters.name"
                  allow-clear
                  size="small"
                  placeholder="SKU/族名称"
                />
              </a-form-item>
            </a-col>
            <a-col :xs="24" :sm="12" :md="6">
              <a-form-item label="包装形式">
                <a-select
                  v-model:value="skuFilters.packagingForm"
                  allow-clear
                  size="small"
                  placeholder="全部"
                  :options="packagingFormFilterOpts"
                />
              </a-form-item>
            </a-col>
            <a-col :xs="24" :sm="12" :md="6">
              <a-form-item label="业务类型">
                <a-select
                  v-model:value="skuFilters.businessType"
                  allow-clear
                  size="small"
                  placeholder="全部"
                  :options="businessTypeFilterOpts"
                />
              </a-form-item>
            </a-col>
            <a-col :xs="24" :sm="12" :md="8">
              <a-form-item class="filter-actions-item">
                <a-space>
                  <a-button type="primary" size="small" @click="handleSkuSearch">
                    <SearchOutlined />
                    查询
                  </a-button>
                  <a-button size="small" @click="handleSkuReset">
                    <DeleteOutlined />
                    清空
                  </a-button>
                </a-space>
              </a-form-item>
            </a-col>
          </a-row>
        </a-form>
      </div>

      <div class="toolbar-row">
        <a-space wrap :size="8">
          <a-button size="small" @click="activeTab = 'spu'"> 前往包装族生成 SKU </a-button>
        </a-space>
        <a-space :size="4" class="toolbar-icons">
          <a-tooltip title="刷新">
            <a-button type="text" size="small" @click="handleSkuSearch">
              <ReloadOutlined />
            </a-button>
          </a-tooltip>
        </a-space>
      </div>

      <div class="table-card">
        <a-table
          :columns="skuColumns"
          :data-source="skuList"
          row-key="id"
          size="small"
          bordered
          :pagination="{ pageSize: 10, size: 'small', showSizeChanger: true }"
          :scroll="{ x: 1400 }"
        >
          <template #bodyCell="{ column, record, index }">
            <template v-if="column.key === 'index'">{{ index + 1 }}</template>
            <template v-else-if="column.key === 'businessType'">
              {{ formatBusinessTypeLabels(record, PACKAGING_BUSINESS_TYPE_OPTIONS) }}
            </template>
            <template v-else-if="column.key === 'unit'">
              <a-tag v-if="record.unit" color="blue" class="unit-tag">{{ record.unit }}</a-tag>
              <span v-else>—</span>
            </template>
            <template v-else-if="column.key === 'actions'">
              <a-space :size="8">
                <a @click="openEditSku(record)">编辑</a>
                <a class="danger-link" @click="handleDeleteSku(record)">删除</a>
              </a-space>
            </template>
            <template v-else-if="column.dataIndex">
              {{ formatCell(record, column.dataIndex) }}
            </template>
          </template>
        </a-table>
      </div>
    </template>

    <PackagingSpuFormModal
      v-model:open="spuModalOpen"
      :record="editSpuRecord"
      @saved="handleSpuSearch"
    />
    <PackagingVariantMatrixModal
      v-model:open="matrixOpen"
      :spu="matrixSpu"
      @saved="handleSkuSearch"
    />
    <PackagingSkuFormModal
      v-model:open="skuModalOpen"
      :record="editSkuRecord"
      @saved="handleSkuSearch"
    />
  </div>
</template>

<script setup>
import { computed, reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import { Modal, message } from 'ant-design-vue'
import { DeleteOutlined, PlusOutlined, ReloadOutlined, SearchOutlined } from '@ant-design/icons-vue'
import PackagingSpuFormModal from './components/PackagingSpuFormModal.vue'
import PackagingVariantMatrixModal from './components/PackagingVariantMatrixModal.vue'
import PackagingSkuFormModal from './components/PackagingSkuFormModal.vue'
import { deletePackagingSpu, listPackagingSpus, packagingSpuState } from '@/store/packagingSpuStore'
import {
  deletePackaging,
  filterPackaging,
  packagingState,
  deleteSkusBySpuId,
} from '@/store/packagingStore'
import { countSkusForPackagingSpu } from '@/utils/packagingSkuSave'
import { useTabs } from '@/composables/useTabs'
import { openCreateTab } from '@/utils/openCreateTab'
import { findCreatePageByListPath } from '@/config/createPages'
import { formatBusinessTypeLabels } from '@/utils/businessTypeLabel'
import {
  PACKAGING_BUSINESS_TYPE_OPTIONS,
  PACKAGING_FORM_OPTIONS,
} from '@/constants/packagingMaster'

const router = useRouter()
const { openTab } = useTabs()

const activeTab = ref('spu')
const listVersion = ref(0)

const spuFilters = reactive({ keyword: '' })
const spuApplied = reactive({ keyword: '' })
const skuFilters = reactive({
  code: '',
  name: '',
  businessType: undefined,
  packagingForm: undefined,
})
const skuApplied = reactive({
  code: '',
  name: '',
  businessType: undefined,
  packagingForm: undefined,
})

const spuModalOpen = ref(false)
const editSpuRecord = ref(null)
const matrixOpen = ref(false)
const matrixSpu = ref(null)
const skuModalOpen = ref(false)
const editSkuRecord = ref(null)

const businessTypeFilterOpts = PACKAGING_BUSINESS_TYPE_OPTIONS.map((o) => ({
  label: o.label,
  value: o.key,
}))
const packagingFormFilterOpts = PACKAGING_FORM_OPTIONS.map((v) => ({ label: v, value: v }))

const spuColumns = [
  { title: '序号', key: 'index', width: 56, fixed: 'left' },
  { title: '族编码', dataIndex: 'code', width: 120, fixed: 'left' },
  { title: '族名称', dataIndex: 'name', width: 140 },
  { title: '变体维度', key: 'variantAxes', width: 180, ellipsis: true },
  { title: '业务类型', key: 'businessType', width: 120 },
  { title: 'SKU数', key: 'skuCount', width: 72, align: 'center' },
  { title: '创建人', dataIndex: 'creator', width: 90 },
  { title: '创建时间', dataIndex: 'createdAt', width: 160 },
  { title: '操作', key: 'actions', width: 180, fixed: 'right' },
]

const skuColumns = [
  { title: '序号', key: 'index', width: 56, fixed: 'left' },
  { title: 'SKU编码', dataIndex: 'code', width: 150, fixed: 'left' },
  { title: 'SKU名称', dataIndex: 'name', width: 180, ellipsis: true },
  { title: '包装族', dataIndex: 'spuName', width: 120 },
  { title: '业务类型', key: 'businessType', width: 120 },
  { title: '包装形式', dataIndex: 'packagingForm', width: 90 },
  { title: '外包装尺寸', dataIndex: 'outerSize', width: 130 },
  { title: '标准包装量', dataIndex: 'capacityQty', width: 100, align: 'right' },
  { title: '单位', key: 'unit', width: 72, align: 'center' },
  { title: '创建人', dataIndex: 'creator', width: 90 },
  { title: '创建时间', dataIndex: 'createdAt', width: 160 },
  { title: '操作', key: 'actions', width: 120, fixed: 'right' },
]

const spuList = computed(() => {
  void listVersion.value
  void packagingSpuState.items
  return listPackagingSpus(spuApplied)
})

const skuList = computed(() => {
  void listVersion.value
  void packagingState.items
  return filterPackaging(packagingState.items, skuApplied)
})

function formatCell(record, key) {
  const val = record[key]
  return val != null && val !== '' ? val : '—'
}

function handleSpuSearch() {
  spuApplied.keyword = spuFilters.keyword.trim()
  listVersion.value += 1
}

function handleSpuReset() {
  spuFilters.keyword = ''
  spuApplied.keyword = ''
  listVersion.value += 1
}

function handleSkuSearch() {
  skuApplied.code = skuFilters.code.trim()
  skuApplied.name = skuFilters.name.trim()
  skuApplied.businessType = skuFilters.businessType
  skuApplied.packagingForm = skuFilters.packagingForm
  listVersion.value += 1
}

function handleSkuReset() {
  skuFilters.code = ''
  skuFilters.name = ''
  skuFilters.businessType = undefined
  skuFilters.packagingForm = undefined
  skuApplied.code = ''
  skuApplied.name = ''
  skuApplied.businessType = undefined
  skuApplied.packagingForm = undefined
  listVersion.value += 1
}

function openCreateSpu() {
  const page = findCreatePageByListPath('/basic-config/packaging')
  if (!page) return
  openCreateTab(router, openTab, { path: page.newPath, title: page.title })
}

function openEditSpu(record) {
  editSpuRecord.value = record
  spuModalOpen.value = true
}

function openMatrix(record) {
  matrixSpu.value = { ...record }
  matrixOpen.value = true
}

function handleDeleteSpu(record) {
  const skuCount = countSkusForPackagingSpu(record.id)
  Modal.confirm({
    title: '确认删除',
    content:
      skuCount > 0
        ? `该包装族下仍有 ${skuCount} 个 SKU，删除后 SKU 将一并移除。确定删除「${record.name}」吗？`
        : `确定删除包装族「${record.name}」吗？`,
    okType: 'danger',
    onOk: () => {
      deleteSkusBySpuId(record.id)
      const res = deletePackagingSpu(record.id)
      if (!res.ok) {
        message.warning(res.message)
        return
      }
      message.success('已删除')
      listVersion.value += 1
    },
  })
}

function openEditSku(record) {
  editSkuRecord.value = record
  skuModalOpen.value = true
}

function handleDeleteSku(record) {
  Modal.confirm({
    title: '确认删除',
    content: `确定删除包装 SKU「${record.name}」吗？`,
    okType: 'danger',
    onOk: () => {
      const res = deletePackaging(record.id)
      if (!res.ok) {
        message.warning(res.message)
        return
      }
      message.success('已删除')
      listVersion.value += 1
    },
  })
}
</script>

<style lang="less" scoped>
.packaging-page {
  .page-tabs {
    margin-bottom: 12px;
  }

  .filter-card,
  .table-card {
    background: #fff;
    border-radius: 4px;
    padding: 12px;
    margin-bottom: 12px;
  }

  .toolbar-row {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 12px;
  }

  .danger-link {
    color: #ff4d4f;
  }

  .unit-tag {
    margin: 0;
  }
}
</style>
