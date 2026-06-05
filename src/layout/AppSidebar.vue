<template>
  <a-layout-sider
    class="app-sidebar"
    :width="160"
    :collapsed-width="0"
    breakpoint="lg"
    collapsible
    v-model:collapsed="collapsed"
  >
    <a-menu
      v-model:selectedKeys="selectedKeys"
      mode="inline"
      :items="menuItems"
      @click="onMenuClick"
    />
  </a-layout-sider>
</template>

<script setup>
import { computed, h, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { Badge } from 'ant-design-vue'
import { sideMenus, resolveModuleKey } from '@/config/menus'
import { useTabs } from '@/composables/useTabs'
import { useWorkOrderMenuBadges } from '@/composables/useWorkOrderMenuBadges'

const route = useRoute()
const router = useRouter()
const { openTab } = useTabs()
const collapsed = ref(false)
const { badges } = useWorkOrderMenuBadges()

const moduleKey = computed(() => resolveModuleKey(route.path))

const menuItems = computed(() =>
  (sideMenus[moduleKey.value] || []).map((item) => {
    const count = badges.value[item.path] || 0
    return {
      key: item.path,
      label:
        count > 0
          ? h('span', { class: 'menu-label-with-badge' }, [
              item.label,
              h(Badge, {
                count,
                size: 'small',
                overflowCount: 99,
                class: 'menu-badge',
              }),
            ])
          : item.label,
    }
  }),
)

function resolveActiveMenuPath(path) {
  const menus = sideMenus[moduleKey.value] || []
  if (menus.some((m) => m.path === path)) return path
  const matched = menus.find((m) => path.startsWith(`${m.path}/`))
  return matched?.path || path
}

const selectedKeys = computed({
  get: () => [resolveActiveMenuPath(route.path)],
  set: () => {},
})

function onMenuClick({ key }) {
  openTab(key)
  router.push(key)
}
</script>

<style lang="less" scoped>
.app-sidebar {
  background: #fff;
  border-right: 1px solid #f0f0f0;

  :deep(.ant-layout-sider-children) {
    display: flex;
    flex-direction: column;
  }

  :deep(.ant-menu) {
    border-inline-end: none;
    flex: 1;
  }

  :deep(.menu-label-with-badge) {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    width: 100%;
    justify-content: space-between;
    padding-right: 4px;
  }

  :deep(.menu-badge) {
    .ant-badge-count {
      min-width: 16px;
      height: 16px;
      line-height: 16px;
      font-size: 10px;
      padding: 0 4px;
      box-shadow: none;
    }
  }
}
</style>
