<template>
  <div class="board-catalog-page">
    <div class="table-card">
      <div class="toolbar-row">
        <a-space wrap :size="8">
          <a-button type="primary" size="small" @click="openCreate">
            <PlusOutlined />
            新建看板
          </a-button>
        </a-space>
        <a-button type="text" size="small" @click="refresh">
          <ReloadOutlined />
        </a-button>
      </div>

      <a-table
        :columns="columns"
        :data-source="list"
        row-key="id"
        size="small"
        bordered
        :pagination="{ pageSize: 10, size: 'small', showSizeChanger: true }"
      >
        <template #bodyCell="{ column, record }">
          <template v-if="column.key === 'name'">
            <a @click="openEdit(record)">{{ record.name }}</a>
          </template>
          <template v-else-if="column.key === 'enabled'">
            <a-tag :color="record.enabled ? 'success' : 'default'">
              {{ record.enabled ? '启用' : '停用' }}
            </a-tag>
          </template>
          <template v-else-if="column.key === 'actions'">
            <a-space :size="8">
              <a @click="openEdit(record)">编辑</a>
              <a @click="toggleEnabled(record)">{{ record.enabled ? '停用' : '启用' }}</a>
            </a-space>
          </template>
        </template>
      </a-table>
    </div>

    <BoardCatalogModal v-model:open="modalOpen" :record="editRecord" @saved="refresh" />
  </div>
</template>

<script setup>
import { computed, ref } from 'vue'
import { message } from 'ant-design-vue'
import { PlusOutlined, ReloadOutlined } from '@ant-design/icons-vue'
import {
  boardCatalogState,
  listBoardCatalog,
  setBoardCatalogEnabled,
} from '@/store/boardCatalogStore'
import BoardCatalogModal from './components/BoardCatalogModal.vue'

const modalOpen = ref(false)
const editRecord = ref(null)

const list = computed(() => {
  void boardCatalogState.items
  return listBoardCatalog()
})

const columns = [
  { title: '名称', dataIndex: 'name', key: 'name', width: 180 },
  { title: '编码', dataIndex: 'code', key: 'code', width: 160 },
  { title: '播放地址', dataIndex: 'playPath', key: 'playPath', ellipsis: true },
  { title: '状态', dataIndex: 'enabled', key: 'enabled', width: 90 },
  { title: '更新时间', dataIndex: 'updatedAt', key: 'updatedAt', width: 170 },
  { title: '操作', key: 'actions', width: 140, fixed: 'right' },
]

function refresh() {
  /* reactive */
}

function openCreate() {
  editRecord.value = null
  modalOpen.value = true
}

function openEdit(record) {
  editRecord.value = { ...record }
  modalOpen.value = true
}

function toggleEnabled(record) {
  const res = setBoardCatalogEnabled(record.id, !record.enabled)
  if (!res.ok) {
    message.error(res.message)
    return
  }
  message.success(record.enabled ? '已停用' : '已启用')
}
</script>

<style scoped lang="less">
.board-catalog-page {
  padding: 0;
}

.table-card {
  background: #fff;
  border-radius: 8px;
  padding: 12px 16px 16px;
}

.toolbar-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 12px;
}
</style>
