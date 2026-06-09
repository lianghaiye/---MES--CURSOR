<template>
  <a-drawer
    :open="open"
    title="列显隐"
    width="520"
    destroy-on-close
    @close="emit('update:open', false)"
  >
    <a-table
      :columns="settingColumns"
      :data-source="localSettings"
      row-key="key"
      size="small"
      bordered
      :pagination="false"
    >
      <template #bodyCell="{ column, record, index }">
        <template v-if="column.key === 'hidden'">
          <a-checkbox v-model:checked="record.hidden" />
        </template>
        <template v-else-if="column.key === 'frozen'">
          <a-checkbox v-model:checked="record.frozen" />
        </template>
        <template v-else-if="column.key === 'sort'">
          <a-space :size="4">
            <a-button type="text" size="small" :disabled="index === 0" @click="moveUp(index)">
              <UpOutlined />
            </a-button>
            <a-button
              type="text"
              size="small"
              :disabled="index === localSettings.length - 1"
              @click="moveDown(index)"
            >
              <DownOutlined />
            </a-button>
          </a-space>
        </template>
      </template>
    </a-table>
    <template #footer>
      <a-space>
        <a-button @click="resetDefault">恢复默认</a-button>
        <a-button @click="emit('update:open', false)">取消</a-button>
        <a-button type="primary" @click="apply">确定</a-button>
      </a-space>
    </template>
  </a-drawer>
</template>

<script setup>
import { ref, watch } from 'vue'
import { UpOutlined, DownOutlined } from '@ant-design/icons-vue'

const props = defineProps({
  open: Boolean,
  settings: { type: Array, default: () => [] },
  defaultSettings: { type: Array, default: () => [] },
})

const emit = defineEmits(['update:open', 'update:settings'])

const localSettings = ref([])

const settingColumns = [
  { title: '列名', dataIndex: 'title', width: 140 },
  { title: '隐藏', key: 'hidden', width: 64, align: 'center' },
  { title: '冻结', key: 'frozen', width: 64, align: 'center' },
  { title: '排序', key: 'sort', width: 80, align: 'center' },
]

watch(
  () => props.open,
  (visible) => {
    if (visible) {
      localSettings.value = JSON.parse(JSON.stringify(props.settings)).sort(
        (a, b) => a.order - b.order,
      )
    }
  },
)

function moveUp(index) {
  if (index <= 0) return
  const arr = localSettings.value
  ;[arr[index - 1], arr[index]] = [arr[index], arr[index - 1]]
  arr.forEach((c, i) => {
    c.order = i
  })
}

function moveDown(index) {
  if (index >= localSettings.value.length - 1) return
  const arr = localSettings.value
  ;[arr[index], arr[index + 1]] = [arr[index + 1], arr[index]]
  arr.forEach((c, i) => {
    c.order = i
  })
}

function resetDefault() {
  localSettings.value = JSON.parse(JSON.stringify(props.defaultSettings))
}

function apply() {
  localSettings.value.forEach((c, i) => {
    c.order = i
  })
  emit('update:settings', JSON.parse(JSON.stringify(localSettings.value)))
  emit('update:open', false)
}
</script>
