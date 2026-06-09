<template>
  <div class="warehouse-detail-page">
    <a-spin :spinning="loading">
      <template v-if="record">
        <div class="page-header">
          <div class="header-left">
            <span class="page-title">{{ record.name }}</span>
            <span class="sub-code">{{ record.code }}</span>
          </div>
          <a-space>
            <a-button type="primary" size="small" @click="openStorage">存放管理</a-button>
            <a-button size="small" @click="openEdit">编辑</a-button>
            <a-button size="small" @click="goBack">返回列表</a-button>
          </a-space>
        </div>

        <div class="section-card">
          <div class="section-title">基本信息</div>
          <a-descriptions bordered size="small" :column="3">
            <a-descriptions-item label="仓库编号">{{ record.code }}</a-descriptions-item>
            <a-descriptions-item label="仓库名称">{{ record.name }}</a-descriptions-item>
            <a-descriptions-item label="仓库类型">{{
              record.categoryName || '—'
            }}</a-descriptions-item>
            <a-descriptions-item label="管理员">{{
              record.managerName || '—'
            }}</a-descriptions-item>
            <a-descriptions-item label="所属工作中心">{{
              record.workCenter || '—'
            }}</a-descriptions-item>
            <a-descriptions-item label="允许负库存">
              {{ record.allowNegativeInventory ? '是' : '否' }}
            </a-descriptions-item>
            <a-descriptions-item label="仓库地址" :span="2">{{
              record.address || '—'
            }}</a-descriptions-item>
            <a-descriptions-item label="排序">{{ record.sortOrder ?? '—' }}</a-descriptions-item>
            <a-descriptions-item label="备注" :span="3">{{
              record.remark || '—'
            }}</a-descriptions-item>
            <a-descriptions-item label="创建日期">{{
              record.createdAt || '—'
            }}</a-descriptions-item>
          </a-descriptions>
        </div>

        <div class="section-card">
          <div class="section-title">
            默认存放物品
            <span class="item-count">（{{ storedItems.length }} 项）</span>
          </div>
          <a-table
            :columns="itemColumns"
            :data-source="storedItems"
            row-key="rowKey"
            size="small"
            bordered
            :pagination="{ pageSize: 10, size: 'small', showTotal: (t) => `共 ${t} 条` }"
            :scroll="{ x: 1000 }"
          >
            <template #bodyCell="{ column, record, index }">
              <template v-if="column.key === 'index'">{{ index + 1 }}</template>
              <template v-else-if="column.key === 'itemType'">
                <a-tag :color="record.itemType === '产品' ? 'blue' : 'green'">{{
                  record.itemType
                }}</a-tag>
              </template>
            </template>
            <template #emptyText>
              <a-empty :image="false" description="暂未配置存放物品" />
            </template>
          </a-table>
        </div>
      </template>
      <a-empty v-else-if="!loading" description="未找到该仓库" />
    </a-spin>

    <WarehouseFormModal v-model:open="editOpen" :record="record" @saved="reload" />
    <WarehouseStorageModal v-model:open="storageOpen" :warehouse="record" @saved="reload" />
  </div>
</template>

<script>
export default { name: 'WarehouseDetailView' }
</script>

<script setup>
import { computed, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { getWarehouseById } from '@/store/warehouseStore'
import WarehouseFormModal from './components/WarehouseFormModal.vue'
import WarehouseStorageModal from './components/WarehouseStorageModal.vue'

const route = useRoute()
const router = useRouter()
const loading = ref(false)
const record = ref(null)
const editOpen = ref(false)
const storageOpen = ref(false)

const itemColumns = [
  { title: '#', key: 'index', width: 48, align: 'center' },
  { title: '类型', key: 'itemType', width: 72 },
  { title: '物品编码', dataIndex: 'code', width: 120 },
  { title: '物品名称', dataIndex: 'name', width: 140, ellipsis: true },
  { title: '规格型号', dataIndex: 'specModel', width: 100, ellipsis: true },
  { title: '类别', dataIndex: 'categoryName', width: 90 },
  { title: '材质', dataIndex: 'material', width: 80 },
  { title: '库存单位', dataIndex: 'inventoryUnit', width: 80 },
  { title: '单价', dataIndex: 'unitPrice', width: 80 },
]

const storedItems = computed(() =>
  (record.value?.storedItems || []).map((it) => ({
    ...it,
    rowKey: `${it.itemType}-${it.itemId}`,
  })),
)

function reload() {
  record.value = getWarehouseById(route.params.id)
}

watch(
  () => route.params.id,
  () => {
    loading.value = true
    reload()
    loading.value = false
  },
  { immediate: true },
)

function goBack() {
  router.push('/basic-config/warehouses')
}

function openEdit() {
  editOpen.value = true
}

function openStorage() {
  storageOpen.value = true
}
</script>

<style lang="less" scoped>
.warehouse-detail-page {
  .page-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 16px;
  }

  .header-left {
    display: flex;
    align-items: center;
    gap: 12px;
  }

  .page-title {
    font-size: 18px;
    font-weight: 600;
  }

  .sub-code {
    color: #8c8c8c;
    font-size: 13px;
  }

  .section-card {
    background: #fff;
    border-radius: 4px;
    padding: 16px;
    margin-bottom: 16px;
  }

  .section-title {
    font-weight: 600;
    margin-bottom: 12px;
  }

  .item-count {
    font-weight: normal;
    color: #8c8c8c;
    font-size: 13px;
  }
}
</style>
