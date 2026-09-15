<template>
  <div class="scheme-edit-page">
    <div class="page-card">
      <div class="page-head">
        <span class="page-title">{{ pageTitle }}</span>
        <a-space>
          <a-button @click="handleCancel">取消</a-button>
          <a-button type="primary" @click="handleSave">保存</a-button>
        </a-space>
      </div>

      <a-form layout="vertical" :model="form">
        <a-row :gutter="16">
          <a-col :span="12">
            <a-form-item label="方案名称" required>
              <a-input v-model:value="form.name" placeholder="如 车间大屏" allow-clear />
            </a-form-item>
          </a-col>
          <a-col :span="12">
            <a-form-item label="启用">
              <a-switch v-model:checked="form.enabled" />
            </a-form-item>
          </a-col>
          <a-col :span="8">
            <a-form-item label="默认停留(秒)" required>
              <a-input-number
                v-model:value="form.defaultDwellSeconds"
                :min="1"
                :max="3600"
                style="width: 100%"
              />
            </a-form-item>
          </a-col>
          <a-col :span="8">
            <a-form-item label="切屏效果">
              <a-select
                v-model:value="form.transition"
                :options="CAROUSEL_TRANSITION_OPTIONS"
                style="width: 100%"
              />
            </a-form-item>
          </a-col>
          <a-col :span="8">
            <a-form-item label="播完一轮">
              <a-select
                v-model:value="form.afterRound"
                :options="CAROUSEL_AFTER_ROUND_OPTIONS"
                style="width: 100%"
              />
            </a-form-item>
          </a-col>
        </a-row>

        <div class="items-head">
          <span class="items-title">播放条目</span>
          <a-button size="small" type="dashed" @click="addItem">
            <PlusOutlined />
            添加条目
          </a-button>
        </div>

        <div v-for="(item, index) in form.items" :key="item.id" class="item-card">
          <div class="item-card-head">
            <span>条目 {{ index + 1 }}</span>
            <a-space :size="4">
              <a-button
                size="small"
                type="text"
                :disabled="index === 0"
                @click="moveItem(index, -1)"
              >
                上移
              </a-button>
              <a-button
                size="small"
                type="text"
                :disabled="index === form.items.length - 1"
                @click="moveItem(index, 1)"
              >
                下移
              </a-button>
              <a-button size="small" type="text" danger @click="removeItem(index)">删除</a-button>
            </a-space>
          </div>
          <a-row :gutter="12">
            <a-col :span="8">
              <a-form-item label="来源">
                <a-select
                  v-model:value="item.source"
                  :options="sourceOptions"
                  style="width: 100%"
                  @change="onSourceChange(item)"
                />
              </a-form-item>
            </a-col>
            <a-col v-if="item.source === 'board'" :span="16">
              <a-form-item label="看板">
                <a-select
                  v-model:value="item.boardId"
                  :options="boardOptions"
                  allow-clear
                  placeholder="请选择启用中的看板"
                  style="width: 100%"
                />
              </a-form-item>
            </a-col>
            <a-col v-else :span="16">
              <a-form-item label="外部 URL">
                <a-input v-model:value="item.externalUrl" placeholder="https://..." allow-clear />
              </a-form-item>
            </a-col>
            <a-col :span="12">
              <a-form-item label="显示名称（可选）">
                <a-input v-model:value="item.displayName" placeholder="播放角标" allow-clear />
              </a-form-item>
            </a-col>
            <a-col :span="12">
              <a-form-item label="停留秒数（可选，空则用默认）">
                <a-input-number
                  v-model:value="item.dwellSeconds"
                  :min="1"
                  :max="3600"
                  placeholder="默认"
                  style="width: 100%"
                />
              </a-form-item>
            </a-col>
          </a-row>
        </div>
        <a-empty v-if="!form.items.length" description="暂无条目，请添加" />
      </a-form>
    </div>
  </div>
</template>

<script setup>
import { computed, onMounted, reactive, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { message } from 'ant-design-vue'
import { PlusOutlined } from '@ant-design/icons-vue'
import { useTabs } from '@/composables/useTabs'
import { getEnabledBoardOptions } from '@/store/boardCatalogStore'
import {
  CAROUSEL_AFTER_ROUND_OPTIONS,
  CAROUSEL_TRANSITION_OPTIONS,
  getCarouselSchemeById,
  saveCarouselScheme,
} from '@/store/boardCarouselStore'

defineOptions({ name: 'BoardCarouselSchemeEditView' })

const route = useRoute()
const router = useRouter()
const { openTab, closeTab } = useTabs()

const listPath = '/board/carousel'
const boardOptions = computed(() => getEnabledBoardOptions())
const sourceOptions = [
  { label: '台账看板', value: 'board' },
  { label: '外部 URL', value: 'url' },
]

const form = reactive({
  id: '',
  name: '',
  enabled: true,
  defaultDwellSeconds: 15,
  transition: 'fade',
  afterRound: 'loop',
  items: [],
})

const isEdit = computed(() => Boolean(form.id))
const pageTitle = computed(() => (isEdit.value ? '编辑轮播方案' : '新建轮播方案'))

function newItem() {
  return {
    id: `item-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    source: 'board',
    boardId: undefined,
    externalUrl: '',
    displayName: '',
    dwellSeconds: null,
    sort: 0,
  }
}

function resetCreate() {
  form.id = ''
  form.name = ''
  form.enabled = true
  form.defaultDwellSeconds = 15
  form.transition = 'fade'
  form.afterRound = 'loop'
  form.items = [newItem()]
}

function loadFromQuery() {
  const id = String(route.query.id || '').trim()
  if (!id) {
    resetCreate()
    return
  }
  const record = getCarouselSchemeById(id)
  if (!record) {
    message.warning('方案不存在或已删除')
    resetCreate()
    return
  }
  form.id = record.id
  form.name = record.name || ''
  form.enabled = record.enabled !== false
  form.defaultDwellSeconds = record.defaultDwellSeconds ?? 15
  form.transition = record.transition || 'fade'
  form.afterRound = record.afterRound || 'loop'
  form.items = (record.items || []).map((it) => ({
    ...it,
    boardId: it.boardId || undefined,
    dwellSeconds: it.dwellSeconds ?? null,
  }))
}

watch(
  () => route.query.id,
  () => loadFromQuery(),
)

onMounted(() => loadFromQuery())

function onSourceChange(item) {
  if (item.source === 'board') item.externalUrl = ''
  else item.boardId = undefined
}

function addItem() {
  form.items.push(newItem())
}

function removeItem(index) {
  form.items.splice(index, 1)
}

function moveItem(index, delta) {
  const target = index + delta
  if (target < 0 || target >= form.items.length) return
  const arr = form.items
  const tmp = arr[index]
  arr[index] = arr[target]
  arr[target] = tmp
}

function handleCancel() {
  closeTab(route.fullPath)
  openTab(listPath, '轮播管理')
  router.push(listPath)
}

function handleSave() {
  const res = saveCarouselScheme({
    id: form.id || undefined,
    name: form.name,
    enabled: form.enabled,
    defaultDwellSeconds: form.defaultDwellSeconds,
    transition: form.transition,
    afterRound: form.afterRound,
    items: form.items,
  })
  if (!res.ok) {
    message.error(res.message)
    return
  }
  message.success('已保存')
  closeTab(route.fullPath)
  openTab(listPath, '轮播管理')
  router.push(listPath)
}
</script>

<style scoped lang="less">
.scheme-edit-page {
  min-height: 100%;
}

.page-card {
  background: #fff;
  border-radius: 8px;
  padding: 16px 20px 24px;
}

.page-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 16px;
  padding-bottom: 12px;
  border-bottom: 1px solid #f0f0f0;
}

.page-title {
  font-size: 16px;
  font-weight: 600;
}

.items-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin: 8px 0 12px;
}

.items-title {
  font-weight: 600;
}

.item-card {
  margin-bottom: 12px;
  padding: 12px;
  background: #fafafa;
  border: 1px solid #f0f0f0;
  border-radius: 8px;
}

.item-card-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 8px;
  font-weight: 500;
}
</style>
