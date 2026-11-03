<template>
  <div class="message-center page-card">
    <div class="page-toolbar">
      <div>
        <div class="page-title">消息中心</div>
        <div class="page-desc">站内提醒列表；未读 {{ unread }} 条</div>
      </div>
      <a-space>
        <a-radio-group v-model:value="tab" button-style="solid" size="small">
          <a-radio-button value="unread">未读</a-radio-button>
          <a-radio-button value="all">全部</a-radio-button>
        </a-radio-group>
        <a-button :disabled="!unread" @click="onMarkAll">全部已读</a-button>
        <a-button @click="goConfig">通知配置</a-button>
      </a-space>
    </div>

    <a-list item-layout="horizontal" :data-source="list" :locale="{ emptyText: '暂无消息' }">
      <template #renderItem="{ item }">
        <a-list-item class="msg-item" :class="{ 'is-unread': !item.readAt }" @click="onOpen(item)">
          <a-list-item-meta>
            <template #avatar>
              <a-badge :dot="!item.readAt">
                <a-avatar style="background: #1677ff">{{ typeInitial(item) }}</a-avatar>
              </a-badge>
            </template>
            <template #title>
              <div class="msg-title-row">
                <span class="msg-title">{{ item.title }}</span>
                <span class="msg-time">{{ item.createdAt }}</span>
              </div>
            </template>
            <template #description>
              <div class="msg-body">{{ item.body }}</div>
              <div v-if="item.bizNo" class="msg-meta">单据：{{ item.bizNo }}</div>
            </template>
          </a-list-item-meta>
        </a-list-item>
      </template>
    </a-list>
  </div>
</template>

<script setup>
import { computed, ref } from 'vue'
import { useRouter } from 'vue-router'
import { message } from 'ant-design-vue'
import { getMessageTypeByCode } from '@/constants/messageNotifyCatalog'
import {
  listMyInbox,
  markAllMyMessagesRead,
  markMessageRead,
  messageNotifyState,
  unreadMessageCount,
} from '@/store/messageNotifyStore'
import { useTabs } from '@/composables/useTabs'

defineOptions({ name: 'MessageCenterView' })

const router = useRouter()
const { openTab } = useTabs()
const tab = ref('unread')

const unread = computed(() => unreadMessageCount.value)

const list = computed(() => {
  void messageNotifyState.inbox
  return listMyInbox({ unreadOnly: tab.value === 'unread' })
})

function typeInitial(item) {
  const t = getMessageTypeByCode(item.typeCode)
  return (t?.name || item.typeCode || '消息').slice(0, 1)
}

function onMarkAll() {
  const res = markAllMyMessagesRead()
  message.success(`已读 ${res.count} 条`)
}

function goConfig() {
  openTab('/system/message-notify')
  router.push('/system/message-notify')
}

function onOpen(item) {
  markMessageRead(item.id)
  if (item.linkPath) {
    openTab(item.linkPath)
    router.push(item.linkPath)
  }
}
</script>

<style lang="less" scoped>
.page-card {
  background: #fff;
  border-radius: 8px;
  padding: 16px 20px 8px;
}

.page-toolbar {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
  margin-bottom: 8px;
}

.page-title {
  font-size: 16px;
  font-weight: 600;
}

.page-desc {
  margin-top: 4px;
  font-size: 13px;
  color: rgba(0, 0, 0, 0.45);
}

.msg-item {
  cursor: pointer;
  padding: 12px 8px;
  border-radius: 8px;

  &:hover {
    background: #f5f7fa;
  }

  &.is-unread .msg-title {
    font-weight: 600;
  }
}

.msg-title-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.msg-title {
  flex: 1;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.msg-time {
  flex-shrink: 0;
  font-size: 12px;
  color: rgba(0, 0, 0, 0.45);
  font-weight: 400;
}

.msg-body {
  color: rgba(0, 0, 0, 0.65);
}

.msg-meta {
  margin-top: 4px;
  font-size: 12px;
  color: rgba(0, 0, 0, 0.45);
}
</style>
