<template>
  <a-drawer
    :open="open"
    :title="isEdit ? '编辑轮播方案' : '新建轮播方案'"
    width="720"
    destroy-on-close
    :body-style="{ paddingBottom: '80px' }"
    @close="emit('update:open', false)"
  >
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
            <a-button size="small" type="text" :disabled="index === 0" @click="moveItem(index, -1)">
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

    <div class="drawer-footer">
      <a-space>
        <a-button @click="emit('update:open', false)">取消</a-button>
        <a-button type="primary" @click="handleSave">保存</a-button>
      </a-space>
    </div>
  </a-drawer>
</template>

<script setup>
import { computed, reactive, watch } from 'vue'
import { message } from 'ant-design-vue'
import { PlusOutlined } from '@ant-design/icons-vue'
import { getEnabledBoardOptions } from '@/store/boardCatalogStore'
import {
  CAROUSEL_AFTER_ROUND_OPTIONS,
  CAROUSEL_TRANSITION_OPTIONS,
  saveCarouselScheme,
} from '@/store/boardCarouselStore'

const props = defineProps({
  open: { type: Boolean, default: false },
  record: { type: Object, default: null },
})

const emit = defineEmits(['update:open', 'saved'])

const isEdit = computed(() => Boolean(props.record?.id))
const boardOptions = computed(() => getEnabledBoardOptions())
const sourceOptions = [
  { label: '台账看板', value: 'board' },
  { label: '外部 URL', value: 'url' },
]

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

const form = reactive({
  id: '',
  name: '',
  enabled: true,
  defaultDwellSeconds: 15,
  transition: 'fade',
  afterRound: 'loop',
  items: [],
})

watch(
  () => [props.open, props.record],
  () => {
    if (!props.open) return
    if (props.record?.id) {
      form.id = props.record.id
      form.name = props.record.name || ''
      form.enabled = props.record.enabled !== false
      form.defaultDwellSeconds = props.record.defaultDwellSeconds ?? 15
      form.transition = props.record.transition || 'fade'
      form.afterRound = props.record.afterRound || 'loop'
      form.items = (props.record.items || []).map((it) => ({
        ...it,
        boardId: it.boardId || undefined,
        dwellSeconds: it.dwellSeconds ?? null,
      }))
    } else {
      form.id = ''
      form.name = ''
      form.enabled = true
      form.defaultDwellSeconds = 15
      form.transition = 'fade'
      form.afterRound = 'loop'
      form.items = [newItem()]
    }
  },
  { immediate: true },
)

function onSourceChange(item) {
  if (item.source === 'board') {
    item.externalUrl = ''
  } else {
    item.boardId = undefined
  }
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
  emit('update:open', false)
  emit('saved')
}
</script>

<style scoped lang="less">
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

.drawer-footer {
  position: absolute;
  right: 0;
  bottom: 0;
  left: 0;
  padding: 12px 24px;
  background: #fff;
  border-top: 1px solid #f0f0f0;
  text-align: right;
}
</style>
