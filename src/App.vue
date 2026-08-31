<template>
  <a-config-provider :theme="antdTheme">
    <router-view />
  </a-config-provider>
</template>

<script setup>
import { computed, onMounted } from 'vue'
import { theme as antdThemeToken } from 'ant-design-vue'
import { effectiveTheme, initUiAppearance } from '@/store/uiAppearanceStore'

onMounted(() => {
  initUiAppearance()
})

const antdTheme = computed(() => ({
  algorithm:
    effectiveTheme.value === 'dark'
      ? antdThemeToken.darkAlgorithm
      : antdThemeToken.defaultAlgorithm,
  token: {
    colorPrimary: effectiveTheme.value === 'dark' ? '#4096ff' : '#1677ff',
  },
}))
</script>
