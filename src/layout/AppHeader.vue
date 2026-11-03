<template>
  <a-layout-header class="app-header">
    <div class="header-left">
      <div class="logo">I-DOMS</div>
      <a-menu
        v-model:selectedKeys="selectedTopKeys"
        mode="horizontal"
        class="top-menu"
        :items="topMenuItems"
        @click="onTopMenuClick"
      />
      <a-dropdown>
        <a class="more-btn" @click.prevent>
          <EllipsisOutlined />
        </a>
        <template #overlay>
          <a-menu :items="moreMenuItems" @click="onMoreMenuClick" />
        </template>
      </a-dropdown>
    </div>
    <div class="header-right">
      <AppearanceSettingsDropdown />
      <a-popover
        v-model:open="bellOpen"
        trigger="click"
        placement="bottomRight"
        overlay-class-name="header-msg-popover"
        :overlay-inner-style="{ padding: 0 }"
      >
        <template #content>
          <div class="msg-pop">
            <div class="msg-pop__head">
              <span class="msg-pop__title">未读消息</span>
              <a v-if="recentUnread.length" @click="onMarkAll">全部已读</a>
            </div>
            <div v-if="!recentUnread.length" class="msg-pop__empty">暂无未读消息</div>
            <div v-else class="msg-pop__list">
              <button
                v-for="item in recentUnread"
                :key="item.id"
                type="button"
                class="msg-pop__item"
                @click="onOpenMsg(item)"
              >
                <div class="msg-pop__item-title">{{ item.title }}</div>
                <div class="msg-pop__item-body">{{ item.body }}</div>
                <div class="msg-pop__item-time">{{ item.createdAt }}</div>
              </button>
            </div>
            <div class="msg-pop__foot">
              <a-button type="link" size="small" block @click="openMessageCenter">
                查看消息中心
              </a-button>
            </div>
          </div>
        </template>
        <a-badge :count="unreadCount" :overflow-count="99" :offset="[-2, 2]">
          <BellOutlined class="header-icon" title="消息" />
        </a-badge>
      </a-popover>
      <a-dropdown>
        <div class="user-info">
          <a-avatar size="small" :style="{ backgroundColor: '#1677ff' }">
            {{ avatarText }}
          </a-avatar>
          <span class="username">{{ displayName }}</span>
        </div>
        <template #overlay>
          <a-menu>
            <a-menu-item key="logout" @click="handleLogout">退出登录</a-menu-item>
          </a-menu>
        </template>
      </a-dropdown>
    </div>
  </a-layout-header>
</template>

<script setup>
import { computed, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { message } from 'ant-design-vue'
import { BellOutlined, EllipsisOutlined } from '@ant-design/icons-vue'
import {
  topModules,
  moreModules,
  resolveModuleKey,
  resolveModuleDefaultPath,
  findSideMenuItemByPath,
} from '@/config/menus'
import { getUser, clearAuth } from '@/utils/auth'
import { logout } from '@/api/auth'
import { useTabs } from '@/composables/useTabs'
import {
  listMyInbox,
  markAllMyMessagesRead,
  markMessageRead,
  messageNotifyState,
  unreadMessageCount,
} from '@/store/messageNotifyStore'
import AppearanceSettingsDropdown from './AppearanceSettingsDropdown.vue'

const route = useRoute()
const router = useRouter()
const { openTab, setActive } = useTabs()
const bellOpen = ref(false)

const user = computed(() => getUser())
const displayName = computed(() => user.value?.displayName || 'admin--admin')
const avatarText = computed(() => (user.value?.username || 'A').charAt(0).toUpperCase())
const unreadCount = computed(() => unreadMessageCount.value)
const recentUnread = computed(() => {
  void messageNotifyState.inbox
  return listMyInbox({ unreadOnly: true }).slice(0, 8)
})

function openMessageCenter() {
  bellOpen.value = false
  openTab('/home/message-center')
  if (route.path === '/home/message-center') {
    setActive('/home/message-center')
    return
  }
  router.push('/home/message-center')
}

function onMarkAll() {
  const res = markAllMyMessagesRead()
  message.success(res.count ? `已读 ${res.count} 条` : '暂无未读')
}

function onOpenMsg(item) {
  markMessageRead(item.id)
  bellOpen.value = false
  const path = item.linkPath || '/home/message-center'
  openTab(path)
  router.push(path)
}

const moduleKey = computed(() => resolveModuleKey(route.path))

const selectedTopKeys = computed({
  get: () => {
    const key = moduleKey.value
    if (moreModules.some((m) => m.key === key)) return []
    return [key]
  },
  set: () => {},
})

const topMenuItems = computed(() =>
  topModules.map((m) => ({
    key: m.key,
    label: m.label,
  })),
)

const moreMenuItems = computed(() =>
  moreModules.map((m) => ({
    key: m.key,
    label: m.label,
  })),
)

function navigateToModule(mod) {
  const path = resolveModuleDefaultPath(mod)
  if (!path) return
  const menuItem = findSideMenuItemByPath(path)
  if (menuItem?.openInBrowserTab) {
    const tabPath = menuItem.browserTabPath || menuItem.path
    window.open(router.resolve(tabPath).href, '_blank')
    return
  }
  openTab(path)
  if (route.path === path) {
    setActive(path)
    return
  }
  router.push(path)
}

function onTopMenuClick({ key }) {
  const mod = topModules.find((m) => m.key === key)
  if (mod) navigateToModule(mod)
}

function onMoreMenuClick({ key }) {
  const mod = moreModules.find((m) => m.key === key)
  if (mod) navigateToModule(mod)
}

async function handleLogout() {
  await logout()
  clearAuth()
  router.push({ name: 'login' })
}
</script>

<style lang="less" scoped>
.app-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-shrink: 0;
  height: 56px;
  line-height: 56px;
  padding: 0 16px;
  background: var(--header-bg, #fff);
  border-bottom: 1px solid var(--divider, #f0f0f0);
  z-index: 100;
  gap: 12px;
}

.header-left {
  display: flex;
  align-items: center;
  flex: 1;
  min-width: 0;
  overflow: hidden;
}

.logo {
  font-size: 20px;
  font-weight: 700;
  color: var(--primary, #1677ff);
  margin-right: 16px;
  white-space: nowrap;
  flex-shrink: 0;
}

.top-menu {
  flex: 0 1 auto;
  min-width: 0;
  border-bottom: none;
  line-height: 54px;
  overflow: hidden;
}

.more-btn {
  font-size: 20px;
  color: var(--text-2, rgba(0, 0, 0, 0.65));
  padding: 0 8px;
  margin-left: 0;
  flex-shrink: 0;
  line-height: 56px;
}

.header-right {
  display: flex;
  align-items: center;
  gap: 20px;
  flex-shrink: 0;
}

.header-icon {
  font-size: 18px;
  color: var(--primary, #1677ff);
  cursor: pointer;
}

.user-info {
  display: flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
}

.username {
  font-size: 13px;
  color: var(--text-1, rgba(0, 0, 0, 0.85));
  max-width: 120px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

@media (max-width: 1200px) {
  .top-menu {
    :deep(.ant-menu-item) {
      padding-inline: 10px;
    }
  }
}
</style>

<style lang="less">
.header-msg-popover {
  .msg-pop {
    width: 360px;
  }

  .msg-pop__head {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 12px 14px 8px;
    border-bottom: 1px solid #f0f0f0;
  }

  .msg-pop__title {
    font-weight: 600;
    font-size: 14px;
    color: rgba(0, 0, 0, 0.88);
  }

  .msg-pop__empty {
    padding: 28px 16px;
    text-align: center;
    color: rgba(0, 0, 0, 0.45);
    font-size: 13px;
  }

  .msg-pop__list {
    max-height: 360px;
    overflow: auto;
  }

  .msg-pop__item {
    display: block;
    width: 100%;
    text-align: left;
    border: none;
    background: transparent;
    padding: 10px 14px;
    cursor: pointer;
    border-bottom: 1px solid #f5f5f5;

    &:hover {
      background: #f5f9ff;
    }
  }

  .msg-pop__item-title {
    font-size: 13px;
    font-weight: 600;
    color: rgba(0, 0, 0, 0.88);
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .msg-pop__item-body {
    margin-top: 4px;
    font-size: 12px;
    color: rgba(0, 0, 0, 0.55);
    display: -webkit-box;
    -webkit-line-clamp: 2;
    -webkit-box-orient: vertical;
    overflow: hidden;
  }

  .msg-pop__item-time {
    margin-top: 4px;
    font-size: 12px;
    color: rgba(0, 0, 0, 0.35);
  }

  .msg-pop__foot {
    border-top: 1px solid #f0f0f0;
    padding: 4px 0;
  }
}
</style>
