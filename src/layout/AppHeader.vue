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
      <a-badge dot>
        <BellOutlined class="header-icon" />
      </a-badge>
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
import { computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { BellOutlined, EllipsisOutlined } from '@ant-design/icons-vue'
import { topModules, moreModules, resolveModuleKey, resolveModuleDefaultPath } from '@/config/menus'
import { getUser, clearAuth } from '@/utils/auth'
import { logout } from '@/api/auth'
import { navigateTab } from '@/utils/navigateTab'

const route = useRoute()
const router = useRouter()

const user = computed(() => getUser())
const displayName = computed(() => user.value?.displayName || 'admin--admin')
const avatarText = computed(() => (user.value?.username || 'A').charAt(0).toUpperCase())

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
  navigateTab(router, path)
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
  height: 56px;
  line-height: 56px;
  padding: 0 16px;
  background: #fff;
  border-bottom: 1px solid #f0f0f0;
  position: sticky;
  top: 0;
  z-index: 100;
}

.header-left {
  display: flex;
  align-items: center;
  flex: 1;
  min-width: 0;
}

.logo {
  font-size: 20px;
  font-weight: 700;
  color: #1677ff;
  margin-right: 24px;
  white-space: nowrap;
  flex-shrink: 0;
}

.top-menu {
  flex: 1;
  min-width: 0;
  border-bottom: none;
  line-height: 54px;
}

.more-btn {
  font-size: 20px;
  color: rgba(0, 0, 0, 0.65);
  padding: 0 12px;
  margin-left: 4px;
}

.header-right {
  display: flex;
  align-items: center;
  gap: 20px;
  flex-shrink: 0;
}

.header-icon {
  font-size: 18px;
  color: #1677ff;
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
  color: rgba(0, 0, 0, 0.85);
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
