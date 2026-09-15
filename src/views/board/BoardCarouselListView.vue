<template>
  <div class="board-carousel-page">
    <div class="toolbar-row">
      <a-space wrap :size="8">
        <a-button type="primary" size="small" @click="openCreate">
          <PlusOutlined />
          新建方案
        </a-button>
      </a-space>
      <a-button type="text" size="small" @click="tick++">
        <ReloadOutlined />
      </a-button>
    </div>

    <div class="table-card">
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
          <template v-else-if="column.key === 'itemCount'">
            {{ (record.items || []).length }}
          </template>
          <template v-else-if="column.key === 'transition'">
            {{ transitionLabel(record.transition) }}
          </template>
          <template v-else-if="column.key === 'afterRound'">
            {{ afterRoundLabel(record.afterRound) }}
          </template>
          <template v-else-if="column.key === 'enabled'">
            <a-tag :color="record.enabled ? 'success' : 'default'">
              {{ record.enabled ? '启用' : '停用' }}
            </a-tag>
          </template>
          <template v-else-if="column.key === 'actions'">
            <a-space :size="8" wrap>
              <a @click="openEdit(record)">编辑</a>
              <a @click="handleDuplicate(record)">复制</a>
              <a @click="toggleEnabled(record)">{{ record.enabled ? '停用' : '启用' }}</a>
              <a @click="preview(record)">预览</a>
              <a @click="copyLink(record)">复制链接</a>
              <a @click="playFullscreen(record)">全屏播放</a>
            </a-space>
          </template>
        </template>
      </a-table>
    </div>

    <BoardCarouselSchemeDrawer v-model:open="drawerOpen" :record="editRecord" @saved="tick++" />
  </div>
</template>

<script setup>
import { computed, ref } from 'vue'
import { useRouter } from 'vue-router'
import { message } from 'ant-design-vue'
import { PlusOutlined, ReloadOutlined } from '@ant-design/icons-vue'
import {
  afterRoundLabel,
  boardCarouselState,
  buildCarouselPlayUrl,
  duplicateCarouselScheme,
  listCarouselSchemes,
  setCarouselSchemeEnabled,
  transitionLabel,
} from '@/store/boardCarouselStore'
import BoardCarouselSchemeDrawer from './components/BoardCarouselSchemeDrawer.vue'

const router = useRouter()
const tick = ref(0)
const drawerOpen = ref(false)
const editRecord = ref(null)

const list = computed(() => {
  void boardCarouselState.schemes
  void tick.value
  return listCarouselSchemes()
})

const columns = [
  { title: '方案名称', dataIndex: 'name', key: 'name', width: 180 },
  { title: '条目数', key: 'itemCount', width: 80 },
  {
    title: '默认停留(秒)',
    dataIndex: 'defaultDwellSeconds',
    key: 'defaultDwellSeconds',
    width: 120,
  },
  { title: '切屏效果', key: 'transition', width: 110 },
  { title: '一轮后', key: 'afterRound', width: 120 },
  { title: '状态', key: 'enabled', width: 90 },
  { title: '更新时间', dataIndex: 'updatedAt', key: 'updatedAt', width: 170 },
  { title: '操作', key: 'actions', width: 360, fixed: 'right' },
]

function openCreate() {
  editRecord.value = null
  drawerOpen.value = true
}

function openEdit(record) {
  editRecord.value = JSON.parse(JSON.stringify(record))
  drawerOpen.value = true
}

function handleDuplicate(record) {
  const res = duplicateCarouselScheme(record.id)
  if (!res.ok) {
    message.error(res.message)
    return
  }
  message.success('已复制方案')
  tick.value++
}

function toggleEnabled(record) {
  const res = setCarouselSchemeEnabled(record.id, !record.enabled)
  if (!res.ok) {
    message.error(res.message)
    return
  }
  message.success(record.enabled ? '已停用' : '已启用')
}

function preview(record) {
  const { href } = router.resolve({
    name: 'board-carousel-play',
    params: { schemeId: record.id },
  })
  window.open(href, '_blank')
}

async function copyLink(record) {
  const url = buildCarouselPlayUrl(record.id)
  try {
    await navigator.clipboard.writeText(url)
    message.success('播放链接已复制')
  } catch {
    message.info(url)
  }
}

function playFullscreen(record) {
  const { href } = router.resolve({
    name: 'board-carousel-play',
    params: { schemeId: record.id },
    query: { fullscreen: '1' },
  })
  window.open(href, '_blank')
}
</script>

<style scoped lang="less">
.toolbar-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 12px;
}

.table-card {
  background: #fff;
  border-radius: 8px;
  padding: 12px;
}
</style>
