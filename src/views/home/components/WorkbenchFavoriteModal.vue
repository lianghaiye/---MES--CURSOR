<template>
  <a-modal
    :open="open"
    title="添加收藏"
    :footer="null"
    width="720px"
    destroy-on-close
    class="fav-modal"
    @cancel="emit('update:open', false)"
  >
    <div class="toolbar">
      <a-input-search
        v-model:value="keyword"
        allow-clear
        placeholder="搜索菜单名称 / 所属模块"
        style="max-width: 280px"
      />
      <a-radio-group v-model:value="levelFilter" size="small" button-style="solid">
        <a-radio-button value="all">全部</a-radio-button>
        <a-radio-button value="2">二级菜单</a-radio-button>
        <a-radio-button value="3">三级菜单</a-radio-button>
      </a-radio-group>
    </div>

    <div class="fav-scroll">
      <div v-for="group in groupedRows" :key="group.module" class="fav-group">
        <div class="group-title">{{ group.module }}</div>
        <div class="fav-grid">
          <div
            v-for="item in group.items"
            :key="item.key"
            class="fav-pick"
            :class="{ favorited: item.favorited }"
          >
            <div class="pick-main">
              <div class="pick-title">{{ item.title }}</div>
              <div class="pick-meta">
                <a-tag v-if="item.level === 3" color="processing">三级</a-tag>
                <a-tag v-else color="default">二级</a-tag>
                <span v-if="item.parentLabel" class="parent">{{ item.parentLabel }}</span>
              </div>
            </div>
            <a-button v-if="!item.favorited" type="link" size="small" @click="onAdd(item)">
              收藏
            </a-button>
            <a-button v-else type="link" size="small" danger @click="onRemove(item)">
              取消
            </a-button>
          </div>
        </div>
      </div>
      <a-empty
        v-if="!groupedRows.length"
        description="没有匹配的菜单"
        :image="Empty.PRESENTED_IMAGE_SIMPLE"
      />
    </div>
  </a-modal>
</template>

<script setup>
import { computed, ref } from 'vue'
import { Empty, message } from 'ant-design-vue'
import {
  addFavorite,
  listFavoriteCatalog,
  listFavorites,
  removeFavorite,
  workbenchState,
} from '@/store/workbenchStore'

defineProps({
  open: { type: Boolean, default: false },
})

const emit = defineEmits(['update:open'])

const keyword = ref('')
const levelFilter = ref('all')

const rows = computed(() => {
  void workbenchState.favorites
  const favKeys = new Set(listFavorites().flatMap((f) => [f.key, f.path].filter(Boolean)))
  const kw = keyword.value.trim().toLowerCase()
  return listFavoriteCatalog()
    .filter((item) => {
      if (levelFilter.value === '2' && item.level !== 2) return false
      if (levelFilter.value === '3' && item.level !== 3) return false
      if (!kw) return true
      const hay = `${item.title} ${item.module} ${item.parentLabel || ''}`.toLowerCase()
      return hay.includes(kw)
    })
    .map((item) => ({
      ...item,
      favorited: favKeys.has(item.key) || favKeys.has(item.path),
    }))
})

const groupedRows = computed(() => {
  const map = new Map()
  rows.value.forEach((item) => {
    if (!map.has(item.module)) map.set(item.module, [])
    map.get(item.module).push(item)
  })
  return [...map.entries()].map(([module, items]) => ({ module, items }))
})

function onAdd(record) {
  const res = addFavorite(record)
  if (res.ok) message.success(res.message)
  else message.warning(res.message)
}

function onRemove(record) {
  const res = removeFavorite(record.key)
  if (res.ok) message.success(res.message)
  else message.warning(res.message)
}
</script>

<script>
export default { name: 'WorkbenchFavoriteModal' }
</script>

<style lang="less" scoped>
.toolbar {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  margin-bottom: 12px;
}

.fav-scroll {
  max-height: 460px;
  overflow: auto;
  padding-right: 4px;
}

.fav-group + .fav-group {
  margin-top: 14px;
}

.group-title {
  margin-bottom: 8px;
  font-size: 13px;
  font-weight: 600;
  color: rgba(0, 0, 0, 0.65);
}

.fav-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 8px;
}

.fav-pick {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  padding: 10px 12px;
  border: 1px solid #f0f0f0;
  border-radius: 8px;
  background: #fafcff;
  transition:
    border-color 0.15s,
    background 0.15s;

  &:hover {
    border-color: #91caff;
    background: #f0f7ff;
  }

  &.favorited {
    border-color: #b7eb8f;
    background: #f6ffed;
  }
}

.pick-title {
  font-size: 14px;
  font-weight: 500;
  color: rgba(0, 0, 0, 0.88);
}

.pick-meta {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-top: 4px;
  flex-wrap: wrap;
}

.parent {
  font-size: 12px;
  color: rgba(0, 0, 0, 0.45);
}

@media (max-width: 640px) {
  .fav-grid {
    grid-template-columns: 1fr;
  }
}
</style>
