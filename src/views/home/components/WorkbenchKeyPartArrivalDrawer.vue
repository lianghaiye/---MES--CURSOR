<template>
  <a-drawer
    :open="open"
    title="关键件到货"
    width="720"
    destroy-on-close
    @close="emit('update:open', false)"
    @update:open="(v) => emit('update:open', v)"
  >
    <div class="toolbar">
      <span class="hint">未读 {{ unreadCount }} 条 · 共 {{ rows.length }} 条</span>
      <a-space>
        <a-radio-group v-model:value="filter" size="small" button-style="solid">
          <a-radio-button value="unread">仅未读</a-radio-button>
          <a-radio-button value="all">全部</a-radio-button>
        </a-radio-group>
        <a-button size="small" :disabled="!unreadCount" @click="onMarkAll">全部已读</a-button>
      </a-space>
    </div>

    <a-table
      size="small"
      bordered
      row-key="id"
      :columns="columns"
      :data-source="displayRows"
      :pagination="{ pageSize: 8, hideOnSinglePage: true }"
      :scroll="{ x: 860 }"
      :locale="{ emptyText: filter === 'unread' ? '暂无未读关键件到货' : '暂无关键件到货记录' }"
      :row-class-name="(record) => (record.readAt ? '' : 'row-unread')"
    >
      <template #bodyCell="{ column, record }">
        <template v-if="column.key === 'item'">
          <div class="item-cell">
            <div class="item-name">
              <a-badge v-if="!record.readAt" status="processing" />
              {{ record.itemName || '—' }}
            </div>
            <div class="item-meta">{{ record.itemCode || '—' }}</div>
            <div v-if="record.specModel" class="item-meta">{{ record.specModel }}</div>
          </div>
        </template>
        <template v-else-if="column.key === 'qty'">
          {{ formatQty(record.qty) }}{{ record.unit ? ` ${record.unit}` : '' }}
        </template>
        <template v-else-if="column.key === 'doc'">
          <a v-if="record.inboundOrderId || record.inboundDocNo" @click.prevent="goInbound(record)">
            {{ record.inboundDocNo || '入库单' }}
          </a>
          <span v-else>—</span>
        </template>
        <template v-else-if="column.key === 'actions'">
          <a-space>
            <a-button v-if="!record.readAt" type="link" size="small" @click="onMarkRead(record)">
              已读
            </a-button>
            <a-button
              v-if="record.inboundOrderId || record.inboundDocNo"
              type="link"
              size="small"
              @click="goInbound(record)"
            >
              看单据
            </a-button>
          </a-space>
        </template>
      </template>
    </a-table>
  </a-drawer>
</template>

<script setup>
import { computed, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { message } from 'ant-design-vue'
import { useTabs } from '@/composables/useTabs'
import { formatQty } from '@/utils/numberFormat'
import {
  keyPartArrivalState,
  listKeyPartArrivals,
  markAllKeyPartArrivalsRead,
  markKeyPartArrivalRead,
} from '@/store/keyPartArrivalStore'

defineProps({
  open: { type: Boolean, default: false },
})

const emit = defineEmits(['update:open'])
const router = useRouter()
const { openTab } = useTabs()

const filter = ref('unread')

const rows = computed(() => {
  void keyPartArrivalState.messages
  return listKeyPartArrivals()
})

const unreadCount = computed(() => rows.value.filter((r) => !r.readAt).length)

const displayRows = computed(() =>
  filter.value === 'unread' ? rows.value.filter((r) => !r.readAt) : rows.value,
)

const columns = [
  { title: '关键件', key: 'item', width: 200 },
  { title: '数量', key: 'qty', width: 100, align: 'right' },
  { title: '仓库', dataIndex: 'warehouse', width: 100, ellipsis: true },
  { title: '入库单', key: 'doc', width: 150 },
  { title: '到货时间', dataIndex: 'confirmedAt', width: 160 },
  { title: '操作', key: 'actions', fixed: 'right', width: 140 },
]

watch(
  () => unreadCount.value,
  (n) => {
    if (n === 0 && filter.value === 'unread') {
      /* keep filter; empty state is fine */
    }
  },
)

function onMarkRead(record) {
  const res = markKeyPartArrivalRead(record.id)
  if (res.ok) message.success('已标为已读')
}

function onMarkAll() {
  const res = markAllKeyPartArrivalsRead()
  if (res.ok) message.success(res.count ? `已标记 ${res.count} 条已读` : '没有未读')
}

function goInbound(record) {
  if (record.inboundOrderId) {
    const path = `/inventory/inbound/${record.inboundOrderId}`
    openTab(path, `入库单 ${record.inboundDocNo || ''}`)
    router.push(path)
    return
  }
  if (record.inboundDocNo) {
    const path = `/inventory/inbound?docNo=${encodeURIComponent(record.inboundDocNo)}`
    openTab(path, '入库管理')
    router.push({ path: '/inventory/inbound', query: { docNo: record.inboundDocNo } })
  }
}
</script>

<style scoped lang="less">
.toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 12px;
}

.hint {
  color: rgba(0, 0, 0, 0.45);
  font-size: 13px;
}

.item-cell {
  line-height: 1.35;
}

.item-name {
  font-weight: 500;
}

.item-meta {
  color: rgba(0, 0, 0, 0.45);
  font-size: 12px;
}

:deep(.row-unread) td {
  background: #fff7e6;
}
</style>
